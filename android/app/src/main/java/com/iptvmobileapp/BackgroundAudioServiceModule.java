package com.iptvmobileapp;

import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.module.annotations.ReactModule;

/**
 * Module React Native pour gérer le service audio en arrière-plan
 */
@ReactModule(name = "BackgroundAudioServiceModule")
public class BackgroundAudioServiceModule extends ReactContextBaseJavaModule {

    private static final String CHANNEL_ID = "background_audio_channel";
    private static final int NOTIFICATION_ID = 1234;
    private static final String SERVICE_CLASS = "com.iptvmobileapp.BackgroundAudioService";

    public BackgroundAudioServiceModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "BackgroundAudioServiceModule";
    }

    @ReactMethod
    public void startForegroundService(com.facebook.react.bridge.Promise promise) {
        try {
            ReactApplicationContext context = getReactApplicationContext();

            // Créer le canal de notification si nécessaire
            createNotificationChannel(context);

            // Créer l'intent pour démarrer le service
            Intent serviceIntent = new Intent(context, BackgroundAudioService.class);

            // Utiliser startForegroundService pour Android 8+ et startService pour les versions antérieures
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }

            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SERVICE_START_ERROR", "Erreur démarrage service: " + e.getMessage());
        }
    }

    @ReactMethod
    public void stopForegroundService(com.facebook.react.bridge.Promise promise) {
        try {
            ReactApplicationContext context = getReactApplicationContext();
            Intent serviceIntent = new Intent(context, BackgroundAudioService.class);

            boolean wasRunning = context.stopService(serviceIntent);
            promise.resolve(wasRunning);
        } catch (Exception e) {
            promise.reject("SERVICE_STOP_ERROR", "Erreur arrêt service: " + e.getMessage());
        }
    }

    private void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

            if (notificationManager != null && notificationManager.getNotificationChannel(CHANNEL_ID) == null) {
                NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Lecture Audio IPTV",
                    NotificationManager.IMPORTANCE_LOW
                );
                channel.setDescription("Maintient la lecture audio en arrière-plan");
                channel.setShowBadge(false);
                channel.setSound(null, null);
                channel.setVibrationEnabled(false);

                notificationManager.createNotificationChannel(channel);
            }
        }
    }
}