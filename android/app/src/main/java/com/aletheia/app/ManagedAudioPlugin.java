package com.aletheia.app;

import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.os.Handler;
import android.os.Looper;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.PluginMethod;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

@CapacitorPlugin(name = "ManagedAudio")
public class ManagedAudioPlugin extends Plugin implements MediaPlayer.OnCompletionListener, MediaPlayer.OnErrorListener {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final AtomicInteger playbackGeneration = new AtomicInteger(0);

    private MediaPlayer mediaPlayer;
    private Runnable progressRunnable;
    private File currentAudioFile;

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
        if (player == null) {
            return;
        }
        int duration = player.getDuration();
        if (duration <= 0) {
            return;
        }
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

    private void deleteCurrentAudioFile() {
        if (currentAudioFile != null && currentAudioFile.exists()) {
            // Best-effort cleanup; failures are non-fatal.
            //noinspection ResultOfMethodCallIgnored
            currentAudioFile.delete();
        }
        currentAudioFile = null;
    }

    private void releasePlayer(boolean bumpGeneration) {
        stopProgressUpdates();
        if (mediaPlayer != null) {
            try {
                mediaPlayer.stop();
            } catch (Exception ignored) {
                // Ignore stop errors during teardown.
            }
            mediaPlayer.release();
            mediaPlayer = null;
        }
        deleteCurrentAudioFile();
        if (bumpGeneration) {
            playbackGeneration.incrementAndGet();
        }
    }

    @Override
    public void handleOnDestroy() {
        releasePlayer(false);
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
        final int generation = playbackGeneration.incrementAndGet();

        mainHandler.post(() -> {
            releasePlayer(false);
            emitState("loading");
        });
        call.resolve();

        executor.submit(() -> {
            HttpURLConnection connection = null;
            File tempFile = null;
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

                try (OutputStream output = connection.getOutputStream()) {
                    output.write(body.toString().getBytes(StandardCharsets.UTF_8));
                }

                int status = connection.getResponseCode();
                if (status < 200 || status >= 300) {
                    InputStream errorStream = connection.getErrorStream();
                    String message = "Audio generation failed";
                    if (errorStream != null) {
                        try (InputStream stream = errorStream) {
                            byte[] buffer = new byte[8192];
                            StringBuilder builder = new StringBuilder();
                            int read;
                            while ((read = stream.read(buffer)) != -1) {
                                builder.append(new String(buffer, 0, read, StandardCharsets.UTF_8));
                            }
                            if (builder.length() > 0) {
                                message = builder.toString();
                            }
                        }
                    }
                    mainHandler.post(() -> {
                        if (playbackGeneration.get() == generation) {
                            emitState("error");
                        }
                    });
                    return;
                }

                tempFile = File.createTempFile("aletheia-audio-", ".mp3", getContext().getCacheDir());
                try (InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(tempFile)) {
                    byte[] buffer = new byte[8192];
                    int read;
                    while ((read = input.read(buffer)) != -1) {
                        output.write(buffer, 0, read);
                    }
                }

                File audioFile = tempFile;
                mainHandler.post(() -> {
                    if (playbackGeneration.get() != generation) {
                        // Playback was superseded or stopped while the audio was downloading.
                        //noinspection ResultOfMethodCallIgnored
                        audioFile.delete();
                        return;
                    }
                    try {
                        MediaPlayer player = new MediaPlayer();
                        player.setAudioAttributes(
                            new AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_MEDIA)
                                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                                .build()
                        );
                        player.setDataSource(audioFile.getAbsolutePath());
                        player.setOnCompletionListener(this);
                        player.setOnErrorListener(this);
                        player.setOnPreparedListener(preparedPlayer -> {
                            if (playbackGeneration.get() != generation) {
                                preparedPlayer.release();
                                //noinspection ResultOfMethodCallIgnored
                                audioFile.delete();
                                return;
                            }
                            releasePlayer(false);
                            mediaPlayer = preparedPlayer;
                            currentAudioFile = audioFile;
                            mediaPlayer.start();
                            startProgressUpdates();
                            emitState("playing");
                        });
                        player.prepareAsync();
                    } catch (Exception ex) {
                        //noinspection ResultOfMethodCallIgnored
                        audioFile.delete();
                        emitState("error");
                    }
                });
            } catch (Exception ex) {
                if (tempFile != null) {
                    //noinspection ResultOfMethodCallIgnored
                    tempFile.delete();
                }
                mainHandler.post(() -> {
                    if (playbackGeneration.get() == generation) {
                        emitState("error");
                    }
                });
            } finally {
                if (connection != null) {
                    connection.disconnect();
                }
            }
        });
    }

    @PluginMethod
    public void pause(PluginCall call) {
        mainHandler.post(() -> {
            if (mediaPlayer != null && mediaPlayer.isPlaying()) {
                mediaPlayer.pause();
                stopProgressUpdates();
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
            emitState("stopped");
            call.resolve();
        });
    }

    @Override
    public void onCompletion(MediaPlayer mp) {
        mainHandler.post(() -> {
            releasePlayer(true);
            emitState("ended");
        });
    }

    @Override
    public boolean onError(MediaPlayer mp, int what, int extra) {
        mainHandler.post(() -> {
            releasePlayer(true);
            emitState("error");
        });
        return true;
    }
}
