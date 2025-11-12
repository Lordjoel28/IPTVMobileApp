/**
 * 🎵 BackgroundAudioService - Service React Native pour lecture audio en arrière-plan
 * Gère le démarrage/arrêt du service foreground Android
 */

import { NativeModules, Platform, PermissionsAndroid, Alert } from 'react-native';

interface BackgroundAudioServiceInterface {
  startForegroundService: () => Promise<boolean>;
  stopForegroundService: () => Promise<boolean>;
  checkPermissions: () => Promise<boolean>;
}

const { BackgroundAudioServiceModule } = NativeModules;

class BackgroundAudioServiceManager {
  /**
   * Démarre le service foreground pour l'audio en arrière-plan
   */
  async startForegroundService(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      console.log('🎵 [BackgroundAudioService] Platform non-Android, service non nécessaire');
      return true;
    }

    try {
      const hasPermissions = await this.checkPermissions();
      if (!hasPermissions) {
        console.warn('⚠️ [BackgroundAudioService] Permissions manquantes');
        return false;
      }

      if (BackgroundAudioServiceModule?.startForegroundService) {
        const success = await BackgroundAudioServiceModule.startForegroundService();
        console.log(`🎵 [BackgroundAudioService] Service démarré: ${success}`);
        return success;
      } else {
        console.warn('⚠️ [BackgroundAudioService] Module natif non disponible');
        return false;
      }
    } catch (error) {
      console.error('❌ [BackgroundAudioService] Erreur démarrage service:', error);
      return false;
    }
  }

  /**
   * Arrête le service foreground
   */
  async stopForegroundService(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      if (BackgroundAudioServiceModule?.stopForegroundService) {
        const success = await BackgroundAudioServiceModule.stopForegroundService();
        console.log(`🔇 [BackgroundAudioService] Service arrêté: ${success}`);
        return success;
      } else {
        console.warn('⚠️ [BackgroundAudioService] Module natif non disponible');
        return false;
      }
    } catch (error) {
      console.error('❌ [BackgroundAudioService] Erreur arrêt service:', error);
      return false;
    }
  }

  /**
   * Vérifie les permissions nécessaires
   */
  async checkPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const permissions = [
        'android.permission.FOREGROUND_SERVICE',
        'android.permission.POST_NOTIFICATIONS',
        'android.permission.WAKE_LOCK',
      ];

      for (const permission of permissions) {
        const granted = await PermissionsAndroid.check(permission);
        if (!granted) {
          const result = await PermissionsAndroid.request(permission);
          if (result !== PermissionsAndroid.RESULTS.GRANTED) {
            console.warn(`⚠️ [BackgroundAudioService] Permission refusée: ${permission}`);
            // Pour POST_NOTIFICATIONS, on continue quand même car le service peut fonctionner sans
            if (permission === 'android.permission.POST_NOTIFICATIONS') {
              console.warn(`⚠️ [BackgroundAudioService] Continuation sans notification`);
              continue;
            }
            return false;
          }
        }
      }

      console.log('✅ [BackgroundAudioService] Toutes les permissions accordées');
      return true;
    } catch (error) {
      console.error('❌ [BackgroundAudioService] Erreur vérification permissions:', error);
      return false;
    }
  }

  /**
   * Demande les permissions à l'utilisateur avec dialogue
   */
  async requestPermissionsWithDialog(): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        '🎵 Permission Audio Arrière-Plan',
        'Pour continuer l\'audio lorsque l\'application est en arrière-plan, nous avons besoin des permissions nécessaires.',
        [
          {
            text: 'Annuler',
            onPress: () => resolve(false),
            style: 'cancel',
          },
          {
            text: 'Autoriser',
            onPress: async () => {
              const granted = await this.checkPermissions();
              resolve(granted);
            },
          },
        ],
      );
    });
  }
}

// Export singleton
export const backgroundAudioService = new BackgroundAudioServiceManager();
export default backgroundAudioService;