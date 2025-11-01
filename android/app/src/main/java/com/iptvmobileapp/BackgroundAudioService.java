package com.iptvmobileapp;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;

/**
 * Background Audio Service pour React Native Video
 * Maintient l'audio en arrière-plan avec notification système
 */
public class BackgroundAudioService extends Service {
    private static final String CHANNEL_ID = "background_audio_channel";
    private static final int NOTIFICATION_ID = 1234;
    private NotificationManager notificationManager;

    @Override
    public void onCreate() {
        super.onCreate();
        notificationManager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Créer la notification pour le service foreground
        Notification notification = createNotification();
        startForeground(NOTIFICATION_ID, notification);

        // Le service doit continuer jusqu'à ce qu'il soit explicitement arrêté
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        // Nettoyer les ressources
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Lecture Audio IPTV",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Maintient la lecture audio en arrière-plan");
            notificationManager.createNotificationChannel(channel);
        }
    }

    private Notification createNotification() {
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("IPTV Mobile")
                .setContentText("Lecture audio en cours...")
                .setSmallIcon(android.R.drawable.ic_media_play)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setCategory(NotificationCompat.CATEGORY_SERVICE);

        return builder.build();
    }
}