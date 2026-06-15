package com.aletheia.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.drawable.Icon;
import android.media.session.MediaSession;
import android.os.Binder;
import android.os.IBinder;

/**
 * Foreground service that owns the media-style notification shown in the
 * notification shade, lock screen, and system media controls.
 *
 * The notification displays the app logo, the title of the current reading,
 * and play/pause + stop action buttons that route back to ManagedAudioPlugin
 * via AudioActionCallback.
 */
public class AudioPlaybackService extends Service {

    static final String CHANNEL_ID = "aletheia_audio_playback";
    static final int NOTIFICATION_ID = 1001;

    // Intent actions sent by notification buttons.
    static final String ACTION_PAUSE  = "com.aletheia.app.ACTION_PAUSE";
    static final String ACTION_RESUME = "com.aletheia.app.ACTION_RESUME";
    static final String ACTION_STOP   = "com.aletheia.app.ACTION_STOP";

    // ---- Public API ----

    public interface AudioActionCallback {
        void onPause();
        void onResume();
        void onStop();
    }

    public class LocalBinder extends Binder {
        AudioPlaybackService getService() { return AudioPlaybackService.this; }
    }

    // ---- Internals ----

    private final IBinder binder = new LocalBinder();
    private NotificationManager notificationManager;
    private AudioActionCallback callback;

    // Last-known state so we can rebuild the notification in onStartCommand.
    private String lastTitle = "Aletheia";
    private Bitmap lastArtwork;
    private MediaSession.Token lastToken;
    private boolean lastIsPlaying = false;

    @Override
    public void onCreate() {
        super.onCreate();
        notificationManager = getSystemService(NotificationManager.class);
        createNotificationChannel();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return binder;
    }

    /**
     * Called by startForegroundService() and by notification button intents.
     * Must call startForeground() promptly here to satisfy Android's 5-second rule.
     */
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Always call startForeground immediately using whatever state we have.
        startForeground(NOTIFICATION_ID,
            buildNotification(lastTitle, lastArtwork, lastToken, lastIsPlaying));

        // Dispatch notification button presses to the plugin.
        if (intent != null && callback != null) {
            String action = intent.getAction();
            if (ACTION_PAUSE.equals(action))       callback.onPause();
            else if (ACTION_RESUME.equals(action)) callback.onResume();
            else if (ACTION_STOP.equals(action))   callback.onStop();
        }
        return START_NOT_STICKY;
    }

    public void setCallback(AudioActionCallback cb) {
        this.callback = cb;
    }

    /** Show the "now playing" notification (ongoing, play→pause button). */
    public void showPlayingNotification(String title, Bitmap artwork, MediaSession.Token token) {
        lastTitle = title; lastArtwork = artwork; lastToken = token; lastIsPlaying = true;
        notificationManager.notify(NOTIFICATION_ID,
            buildNotification(title, artwork, token, true));
    }

    /** Show the "paused" notification (dismissible, pause→play button). */
    public void showPausedNotification(String title, Bitmap artwork, MediaSession.Token token) {
        lastTitle = title; lastArtwork = artwork; lastToken = token; lastIsPlaying = false;
        notificationManager.notify(NOTIFICATION_ID,
            buildNotification(title, artwork, token, false));
    }

    /** Remove the notification and stop this service. */
    public void stopNotification() {
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    // ---- Notification building ----

    private void createNotificationChannel() {
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Audio Playback",
            NotificationManager.IMPORTANCE_LOW  // silent — no sound/vibration for media
        );
        channel.setDescription("Shows what Aletheia is currently reading");
        notificationManager.createNotificationChannel(channel);
    }

    private Notification buildNotification(
            String title, Bitmap artwork, MediaSession.Token token, boolean isPlaying) {

        // Tapping the notification opens the app.
        Intent openApp = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent contentIntent = PendingIntent.getActivity(
            this, 0, openApp,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Play/Pause toggle button.
        boolean playing = isPlaying;
        PendingIntent toggleIntent = buildServicePendingIntent(
            1, playing ? ACTION_PAUSE : ACTION_RESUME);
        int toggleIcon = playing
            ? android.R.drawable.ic_media_pause
            : android.R.drawable.ic_media_play;
        String toggleLabel = playing ? "Pause" : "Play";

        // Stop button.
        PendingIntent stopIntent = buildServicePendingIntent(2, ACTION_STOP);

        // MediaStyle ties the notification to our MediaSession so the system
        // media controller, lock screen, and Wear OS all reflect playback state.
        Notification.MediaStyle style = new Notification.MediaStyle()
            .setShowActionsInCompactView(0, 1); // show toggle + stop in compact view
        if (token != null) style.setMediaSession(token);

        Notification.Builder builder = new Notification.Builder(this, CHANNEL_ID)
            .setContentTitle(title != null ? title : "Aletheia")
            .setContentText("Aletheia")
            .setSmallIcon(R.mipmap.ic_launcher_foreground)
            .setContentIntent(contentIntent)
            .setVisibility(Notification.VISIBILITY_PUBLIC) // show on lock screen
            .setOngoing(playing)                           // can't swipe away while playing
            .setStyle(style)
            .addAction(new Notification.Action.Builder(
                Icon.createWithResource(this, toggleIcon),
                toggleLabel, toggleIntent).build())
            .addAction(new Notification.Action.Builder(
                Icon.createWithResource(this, android.R.drawable.ic_menu_close_clear_cancel),
                "Stop", stopIntent).build());

        if (artwork != null) builder.setLargeIcon(artwork);

        return builder.build();
    }

    private PendingIntent buildServicePendingIntent(int requestCode, String action) {
        Intent intent = new Intent(this, AudioPlaybackService.class).setAction(action);
        return PendingIntent.getService(
            this, requestCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
