/**
 * 🎬 VideoSettingsService - Service pour gérer les préférences vidéo
 * Remplace les TODO dans VideoPlayerSettingsScreen
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface VideoSettings {
  // Options de comportement
  autoplay: boolean;
  rememberPosition: boolean;
  backgroundPlay: boolean;

  // Vitesse de lecture (VOD/Catch-up uniquement)
  playbackSpeed: number;

  // Performance & Décodage
  hardwareAcceleration: boolean; // Utilise GPU au lieu CPU pour décoder
  decoderType: 'auto' | 'hardware' | 'software'; // Type de décodeur vidéo
  bufferMode?: 'low' | 'normal' | 'high' | 'auto'; // Mode de buffer

  // Réseau
  networkTimeout: number; // Timeout en secondes (5-30s)

  // Interface Utilisateur
  timeFormat: '12h' | '24h'; // Format heure
  appLanguage: 'fr' | 'en' | 'es' | 'ar'; // Langue interface
}

class VideoSettingsService {
  private static readonly STORAGE_KEY = 'video_player_settings';

  /**
   * Charge les paramètres vidéo depuis AsyncStorage
   */
  async loadSettings(): Promise<VideoSettings> {
    try {
      const data = await AsyncStorage.getItem(VideoSettingsService.STORAGE_KEY);

      if (!data) {
        // Retourner les paramètres par défaut
        return this.getDefaultSettings();
      }

      const settings = JSON.parse(data);

      // Fusionner avec les paramètres par défaut pour les nouvelles options
      return {
        ...this.getDefaultSettings(),
        ...settings,
      };
    } catch (error) {
      console.error('❌ [VideoSettingsService] Erreur chargement paramètres:', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * Sauvegarde les paramètres vidéo dans AsyncStorage
   */
  async saveSettings(settings: VideoSettings): Promise<boolean> {
    try {
      await AsyncStorage.setItem(
        VideoSettingsService.STORAGE_KEY,
        JSON.stringify(settings)
      );
      console.log('✅ [VideoSettingsService] Paramètres sauvegardés');
      return true;
    } catch (error) {
      console.error('❌ [VideoSettingsService] Erreur sauvegarde paramètres:', error);
      return false;
    }
  }

  /**
   * Retourne les paramètres par défaut
   */
  private getDefaultSettings(): VideoSettings {
    return {
      autoplay: false,
      rememberPosition: true,
      backgroundPlay: false,
      playbackSpeed: 1.0,
      hardwareAcceleration: true, // GPU par défaut (meilleure perf)
      decoderType: 'auto', // Choix automatique selon device
      bufferMode: 'auto', // Mode auto par défaut
      networkTimeout: 10, // 10 secondes par défaut
      timeFormat: '24h', // Format 24h par défaut
      appLanguage: 'fr', // Français par défaut
    };
  }

  /**
   * Met à jour une option spécifique
   */
  async updateSetting<K extends keyof VideoSettings>(
    key: K,
    value: VideoSettings[K]
  ): Promise<boolean> {
    try {
      const currentSettings = await this.loadSettings();
      const updatedSettings = { ...currentSettings, [key]: value };
      return await this.saveSettings(updatedSettings);
    } catch (error) {
      console.error(`❌ [VideoSettingsService] Erreur mise à jour ${key}:`, error);
      return false;
    }
  }

  /**
   * Obtient une option spécifique
   */
  async getSetting<K extends keyof VideoSettings>(
    key: K
  ): Promise<VideoSettings[K] | null> {
    try {
      const settings = await this.loadSettings();
      return settings[key];
    } catch (error) {
      console.error(`❌ [VideoSettingsService] Erreur lecture ${key}:`, error);
      return null;
    }
  }

  /**
   * Réinitialise tous les paramètres
   */
  async resetSettings(): Promise<boolean> {
    try {
      const defaultSettings = this.getDefaultSettings();
      return await this.saveSettings(defaultSettings);
    } catch (error) {
      console.error('❌ [VideoSettingsService] Erreur réinitialisation:', error);
      return false;
    }
  }

  /**
   * Exporte les paramètres (pour backup)
   */
  async exportSettings(): Promise<string | null> {
    try {
      const settings = await this.loadSettings();
      return JSON.stringify(settings, null, 2);
    } catch (error) {
      console.error('❌ [VideoSettingsService] Erreur export:', error);
      return null;
    }
  }

  /**
   * Importe les paramètres (pour restauration)
   */
  async importSettings(jsonData: string): Promise<boolean> {
    try {
      const settings = JSON.parse(jsonData);

      // Validation basique
      if (!this.validateSettings(settings)) {
        throw new Error('Paramètres invalides');
      }

      return await this.saveSettings(settings);
    } catch (error) {
      console.error('❌ [VideoSettingsService] Erreur import:', error);
      return false;
    }
  }

  /**
   * Valide la structure des paramètres
   */
  private validateSettings(settings: any): boolean {
    if (!settings || typeof settings !== 'object') {
      return false;
    }

    const requiredKeys: (keyof VideoSettings)[] = [
      'autoplay', 'rememberPosition', 'backgroundPlay', 'playbackSpeed',
      'hardwareAcceleration', 'decoderType', 'networkTimeout', 'timeFormat', 'appLanguage'
    ];

    return requiredKeys.every(key => key in settings);
  }
}

// Export singleton
export const videoSettingsService = new VideoSettingsService();
export default videoSettingsService;