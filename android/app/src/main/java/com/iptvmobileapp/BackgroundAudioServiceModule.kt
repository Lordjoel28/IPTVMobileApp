package com.iptvmobileapp

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = "BackgroundAudioServiceModule")
class BackgroundAudioServiceModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val CHANNEL_ID = "background_audio_channel"
        private const val NOTIFICATION_ID = 1234
    }

    override fun getName(): String {
        return "BackgroundAudioServiceModule"
    }

    @ReactMethod
    fun startForegroundService(promise: com.facebook.react.bridge.Promise) {
        try {
            val context = reactApplicationContext

            // Créer le canal de notification si nécessaire
            createNotificationChannel(context)

            // Créer l'intent pour démarrer le service
            val serviceIntent = Intent(context, BackgroundAudioService::class.java)

            // Utiliser startForegroundService pour Android 8+ et startService pour les versions antérieures
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SERVICE_START_ERROR", "Erreur démarrage service: ${e.message}")
        }
    }

    @ReactMethod
    fun stopForegroundService(promise: com.facebook.react.bridge.Promise) {
        try {
            val context = reactApplicationContext
            val serviceIntent = Intent(context, BackgroundAudioService::class.java)

            val wasRunning = context.stopService(serviceIntent)
            promise.resolve(wasRunning)
        } catch (e: Exception) {
            promise.reject("SERVICE_STOP_ERROR", "Erreur arrêt service: ${e.message}")
        }
    }

    private fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager?

            if (notificationManager != null && notificationManager.getNotificationChannel(CHANNEL_ID) == null) {
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    "Lecture Audio IPTV",
                    NotificationManager.IMPORTANCE_LOW
                )
                channel.description = "Maintient la lecture audio en arrière-plan"
                channel.setShowBadge(false)
                channel.setSound(null, null)
                channel.enableVibration(false)

                notificationManager.createNotificationChannel(channel)
            }
        }
    }
}