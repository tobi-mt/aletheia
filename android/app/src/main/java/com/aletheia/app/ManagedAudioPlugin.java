package com.aletheia.app;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.AudioAttributes;
import android.media.MediaDataSource;
import android.media.MediaMetadata;
import android.media.MediaPlayer;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Handler;
import android.os.Looper;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.PluginMethod;

import org.json.JSONObject;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;

/**
 * StreamingMediaDataSource buffers audio bytes as they arrive from the network.
 *
 * MediaPlayer calls readAt(position, ...) from a decoder thread. If the requested
 * position hasn't arrived yet, readAt blocks until it has (or until the stream ends
 * or is cancelled). Because all received bytes are kept in memory, MediaPlayer can
 * freely seek back into already-downloaded data (which it routinely does for MP3
 * header parsing and duration detection).
 */
class StreamingMediaDataSource extends MediaDataSource {
    private final List<byte[]> chunks = new ArrayList<>();
    private long totalBytes = 0;
    private boolean done = false;
    private boolean cancelled = false;

    // ---- Producer side (network thread) ----

    synchronized void append(byte[] data, int offset, int length) {
        if (cancelled) return;
        byte[] copy = new byte[length];
        System.arraycopy(data, offset, copy, 0, length);
        chunks.add(copy);
        totalBytes += length;
        notifyAll();
    }

    synchronized void finish() {
        done = true;
        notifyAll();
    }

    synchronized void cancel() {
        cancelled = true;
        done = true;
        notifyAll();
    }

    // ---- Consumer side (MediaPlayer decoder thread) ----

    @Override
    public synchronized int readAt(long position, byte[] buffer, int offset, int size) throws IOException {
        // Block until the requested position is available or the stream ends.
        while (!done && totalBytes <= position) {
            try {
                wait(500);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return -1;
            }
        }

        if (cancelled) return -1;

        // EOF
        if (position >= totalBytes) return -1;

        // Copy bytes from our chunk list starting at `position`.
        int bytesRead = 0;
        long remaining = position;

        for (byte[] chunk : chunks) {
            if (remaining >= chunk.length) {
                remaining -= chunk.length;
                continue;
            }
            int chunkOffset = (int) remaining;
            int available = chunk.length - chunkOffset;
            int toCopy = Math.min(available, size - bytesRead);
            System.arraycopy(chunk, chunkOffset, buffer, offset + bytesRead, toCopy);
            bytesRead += toCopy;
            remaining = 0;
            if (bytesRead >= size) break;
        }

        return bytesRead > 0 ? bytesRead : -1;
    }

    @Override
    public synchronized long getSize() {
        // Return -1 (unknown) while streaming; MediaPlayer handles this gracefully.
        return done ? totalBytes : -1;
    }

    @Override
    public void close() {
        cancel();
    }
}

@CapacitorPlugin(name = "ManagedAudio")
public class ManagedAudioPlugin extends Plugin implements MediaPlayer.OnCompletionListener, MediaPlayer.OnErrorListener {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final AtomicInteger playbackGeneration = new AtomicInteger(0);

    private MediaPlayer mediaPlayer;
    private StreamingMediaDataSource activeDataSource;
    private Runnable progressRunnable;
    private MediaSession mediaSession;

    // Foreground service + notification
    private AudioPlaybackService audioService;
    private boolean serviceBound = false;
    private String currentTitle = "Aletheia";
    private Bitmap cachedArtwork;

    private final ServiceConnection serviceConnection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName name, IBinder service) {
            AudioPlaybackService.LocalBinder localBinder =
                (AudioPlaybackService.LocalBinder) service;
            audioService = localBinder.getService();
            serviceBound = true;
            audioService.setCallback(audioActionCallback);
        }
        @Override
        public void onServiceDisconnected(ComponentName name) {
            audioService = null;
            serviceBound = false;
        }
    };

    private final AudioPlaybackService.AudioActionCallback audioActionCallback =
        new AudioPlaybackService.AudioActionCallback() {
        @Override
        public void onPause() {
            mainHandler.post(() -> {
                if (mediaPlayer != null && mediaPlayer.isPlaying()) {
                    mediaPlayer.pause();
                    stopProgressUpdates();
                    updatePlaybackState(PlaybackState.STATE_PAUSED, 1.0f);
                    showNotification(false);
                    emitState("paused");
                }
            });
        }
        @Override
        public void onResume() {
            mainHandler.post(() -> {
                if (mediaPlayer != null && !mediaPlayer.isPlaying()) {
                    try {
                        mediaPlayer.start();
                        startProgressUpdates();
                        updatePlaybackState(PlaybackState.STATE_PLAYING, 1.0f);
                        showNotification(true);
                        emitState("playing");
                    } catch (IllegalStateException ignored) {}
                }
            });
        }
        @Override
        public void onStop() {
            mainHandler.post(() -> {
                releasePlayer(true);
                updatePlaybackState(PlaybackState.STATE_STOPPED, 1.0f);
                dismissNotification();
                emitState("stopped");
            });
        }
    };

    private String speechUrl() {
        String serverUrl = getBridge().getConfig().getServerUrl();
        if (serverUrl == null || serverUrl.isEmpty()) {
            return null;
        }
        if (serverUrl.endsWith("/")) {
            return serverUrl + "api/audio/speech";
        }
        return serverUrl + "/api/audio/speech";
    }

    private void emitState(String state) {
        JSObject data = new JSObject();
        data.put("state", state);
        notifyListeners("state", data);
    }

    private void emitProgress() {
        MediaPlayer player = mediaPlayer;
        if (player == null) return;
        int duration = player.getDuration();
        if (duration <= 0) return;
        int progress = Math.max(0, Math.min(100, Math.round((player.getCurrentPosition() * 100f) / duration)));
        JSObject data = new JSObject();
        data.put("progress", progress);
        notifyListeners("progress", data);
    }

    private void startProgressUpdates() {
        stopProgressUpdates();
        progressRunnable = new Runnable() {
            @Override
            public void run() {
                if (mediaPlayer != null) {
                    emitProgress();
                    mainHandler.postDelayed(this, 250);
                }
            }
        };
        mainHandler.post(progressRunnable);
    }

    private void stopProgressUpdates() {
        if (progressRunnable != null) {
            mainHandler.removeCallbacks(progressRunnable);
            progressRunnable = null;
        }
    }

    private void ensureMediaSession() {
        if (mediaSession == null) {
            mediaSession = new MediaSession(getContext(), "AletheiaAudio");
            mediaSession.setActive(true);
        }
    }

    private void updateMediaMetadata(String label) {
        currentTitle = (label != null && !label.isEmpty()) ? label : "Aletheia";
        ensureMediaSession();
        Bitmap artwork = getArtwork();
        MediaMetadata metadata = new MediaMetadata.Builder()
            .putString(MediaMetadata.METADATA_KEY_TITLE, currentTitle)
            .putString(MediaMetadata.METADATA_KEY_ARTIST, "Aletheia")
            .putBitmap(MediaMetadata.METADATA_KEY_ART, artwork)
            .putBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART, artwork)
            .build();
        mediaSession.setMetadata(metadata);
    }

    private void updatePlaybackState(int state, float speed) {
        if (mediaSession == null) return;
        long position = mediaPlayer != null ? mediaPlayer.getCurrentPosition() : PlaybackState.PLAYBACK_POSITION_UNKNOWN;
        mediaSession.setPlaybackState(new PlaybackState.Builder()
            .setActions(PlaybackState.ACTION_PLAY | PlaybackState.ACTION_PAUSE | PlaybackState.ACTION_STOP)
            .setState(state, position, speed)
            .build());
    }

    private void releaseMediaSession() {
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
            mediaSession = null;
        }
    }

    private Bitmap getArtwork() {
        if (cachedArtwork == null) {
            cachedArtwork = BitmapFactory.decodeResource(
                getContext().getResources(), R.mipmap.ic_launcher);
        }
        return cachedArtwork;
    }

    private void bindAudioService() {
        if (!serviceBound) {
            Intent intent = new Intent(getContext(), AudioPlaybackService.class);
            getContext().startForegroundService(intent);
            getContext().bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE);
        }
    }

    private void unbindAudioService() {
        if (serviceBound) {
            getContext().unbindService(serviceConnection);
            serviceBound = false;
            audioService = null;
        }
    }

    private void showNotification(boolean isPlaying) {
        if (!serviceBound || audioService == null || mediaSession == null) return;
        if (isPlaying) {
            audioService.showPlayingNotification(
                currentTitle, getArtwork(), mediaSession.getSessionToken());
        } else {
            audioService.showPausedNotification(
                currentTitle, getArtwork(), mediaSession.getSessionToken());
        }
    }

    private void dismissNotification() {
        if (serviceBound && audioService != null) {
            audioService.stopNotification();
        }
        unbindAudioService();
    }

    private void releasePlayer(boolean bumpGeneration) {
        stopProgressUpdates();
        if (activeDataSource != null) {
            activeDataSource.cancel();
            activeDataSource = null;
        }
        if (mediaPlayer != null) {
            try { mediaPlayer.stop(); } catch (Exception ignored) {}
            mediaPlayer.release();
            mediaPlayer = null;
        }
        if (bumpGeneration) {
            playbackGeneration.incrementAndGet();
        }
    }

    @Override
    public void handleOnDestroy() {
        releasePlayer(false);
        releaseMediaSession();
        dismissNotification();
        executor.shutdownNow();
        super.handleOnDestroy();
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text", "").trim();
        if (text.isEmpty()) {
            call.reject("Text is required");
            return;
        }

        String url = speechUrl();
        if (url == null) {
            call.reject("Audio playback is unavailable");
            return;
        }

        final String voice = call.getString("voice", "alloy");
        final String language = call.getString("language", "en");
        final double speed = call.getDouble("speed", 1.0);
        final String label = call.getString("label", "");
        final int generation = playbackGeneration.incrementAndGet();

        // Create the data source before emitting "loading" so MediaPlayer can be
        // handed to prepareAsync() immediately — no wait for any download to finish.
        final StreamingMediaDataSource dataSource = new StreamingMediaDataSource();

        mainHandler.post(() -> {
            releasePlayer(false);
            bindAudioService();
            activeDataSource = dataSource;
            emitState("loading");

            try {
                updateMediaMetadata(label);
                MediaPlayer player = new MediaPlayer();
                player.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build());
                player.setDataSource(dataSource);
                player.setOnCompletionListener(this);
                player.setOnErrorListener(this);
                player.setOnPreparedListener(preparedPlayer -> {
                    if (playbackGeneration.get() != generation) {
                        preparedPlayer.release();
                        return;
                    }
                    // Swap in the newly prepared player without bumping the generation.
                    stopProgressUpdates();
                    if (mediaPlayer != null && mediaPlayer != preparedPlayer) {
                        try { mediaPlayer.stop(); } catch (Exception ignored) {}
                        mediaPlayer.release();
                    }
                    mediaPlayer = preparedPlayer;
                    mediaPlayer.start();
                    startProgressUpdates();
                    updatePlaybackState(PlaybackState.STATE_PLAYING, (float) speed);
                    showNotification(true);
                    emitState("playing");
                });
                player.prepareAsync();
            } catch (Exception ex) {
                dataSource.cancel();
                if (playbackGeneration.get() == generation) {
                    emitState("error");
                }
            }
        });
        call.resolve();

        // Download the audio in the background, feeding bytes into the data source as
        // they arrive. MediaPlayer's decoder thread is already waiting on readAt().
        executor.submit(() -> {
            HttpURLConnection connection = null;
            try {
                URL target = new URL(url);
                connection = (HttpURLConnection) target.openConnection();
                connection.setRequestMethod("POST");
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "application/json");
                connection.setRequestProperty("Accept", "audio/mpeg");
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(60000);

                JSONObject body = new JSONObject();
                body.put("text", text);
                body.put("voice", voice);
                body.put("language", language);
                body.put("speed", speed);

                try (OutputStream out = connection.getOutputStream()) {
                    out.write(body.toString().getBytes(StandardCharsets.UTF_8));
                }

                int status = connection.getResponseCode();
                if (status < 200 || status >= 300) {
                    dataSource.cancel();
                    mainHandler.post(() -> {
                        if (playbackGeneration.get() == generation) emitState("error");
                    });
                    return;
                }

                try (InputStream input = connection.getInputStream()) {
                    byte[] buffer = new byte[8192];
                    int read;
                    while ((read = input.read(buffer)) != -1) {
                        if (playbackGeneration.get() != generation) {
                            dataSource.cancel();
                            return;
                        }
                        dataSource.append(buffer, 0, read);
                    }
                }
                dataSource.finish();

            } catch (Exception ex) {
                dataSource.cancel();
                mainHandler.post(() -> {
                    if (playbackGeneration.get() == generation) emitState("error");
                });
            } finally {
                if (connection != null) connection.disconnect();
            }
        });
    }

    @PluginMethod
    public void pause(PluginCall call) {
        mainHandler.post(() -> {
            if (mediaPlayer != null && mediaPlayer.isPlaying()) {
                mediaPlayer.pause();
                stopProgressUpdates();
                updatePlaybackState(PlaybackState.STATE_PAUSED, 1.0f);
                showNotification(false);
                emitState("paused");
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void resume(PluginCall call) {
        mainHandler.post(() -> {
            if (mediaPlayer != null && !mediaPlayer.isPlaying()) {
                try {
                    mediaPlayer.start();
                    startProgressUpdates();
                    updatePlaybackState(PlaybackState.STATE_PLAYING, 1.0f);
                    showNotification(true);
                    emitState("playing");
                } catch (IllegalStateException ex) {
                    emitState("error");
                    call.reject("Unable to resume audio playback");
                    return;
                }
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        mainHandler.post(() -> {
            releasePlayer(true);
            updatePlaybackState(PlaybackState.STATE_STOPPED, 1.0f);
            dismissNotification();
            emitState("stopped");
            call.resolve();
        });
    }

    @Override
    public void onCompletion(MediaPlayer mp) {
        mainHandler.post(() -> {
            releasePlayer(true);
            updatePlaybackState(PlaybackState.STATE_STOPPED, 1.0f);
            dismissNotification();
            emitState("ended");
        });
    }

    @Override
    public boolean onError(MediaPlayer mp, int what, int extra) {
        mainHandler.post(() -> {
            releasePlayer(true);
            updatePlaybackState(PlaybackState.STATE_ERROR, 1.0f);
            dismissNotification();
            emitState("error");
        });
        return true;
    }
}
