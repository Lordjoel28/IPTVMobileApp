/**
 * 💾 CacheManager - Service de gestion du cache et des optimisations
 * Gère les paramètres de cache vidéo, compression, et optimisations réseau
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_SETTINGS_KEY = '@cache_settings';

export interface CacheSettings {
  cacheLimit: 500 | 1000 | 2000; // En MB
  autoClearDays: 3 | 7 | 14 | 30;
  compressionEnabled: boolean;
  hlsCacheEnabled: boolean;
  dnsCacheEnabled: boolean;
}

const DEFAULT_SETTINGS: CacheSettings = {
  cacheLimit: 1000, // 1 GB par défaut
  autoClearDays: 7,
  compressionEnabled: true,
  hlsCacheEnabled: true,
  dnsCacheEnabled: true,
};

export class CacheManager {
  /**
   * Récupère les paramètres de cache sauvegardés
   */
  static async getSettings(): Promise<CacheSettings> {
    try {
      const settingsJson = await AsyncStorage.getItem(CACHE_SETTINGS_KEY);
      if (settingsJson) {
        const settings = JSON.parse(settingsJson);
        return { ...DEFAULT_SETTINGS, ...settings };
      }
      return DEFAULT_SETTINGS;
    } catch (error) {
      console.error('[CacheManager] Erreur chargement settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Sauvegarde les paramètres de cache
   */
  static async saveSettings(settings: Partial<CacheSettings>): Promise<void> {
    try {
      const currentSettings = await this.getSettings();
      const newSettings = { ...currentSettings, ...settings };
      await AsyncStorage.setItem(CACHE_SETTINGS_KEY, JSON.stringify(newSettings));
      console.log('[CacheManager] Settings sauvegardés:', newSettings);
    } catch (error) {
      console.error('[CacheManager] Erreur sauvegarde settings:', error);
    }
  }

  /**
   * Définit la limite de cache vidéo
   */
  static async setCacheLimit(limitMB: 500 | 1000 | 2000): Promise<void> {
    await this.saveSettings({ cacheLimit: limitMB });
    console.log(`[CacheManager] Limite cache définie: ${limitMB} MB`);
  }

  /**
   * Définit la fréquence de nettoyage automatique
   */
  static async setAutoClearDays(days: 3 | 7 | 14 | 30): Promise<void> {
    await this.saveSettings({ autoClearDays: days });
    console.log(`[CacheManager] Auto-clear défini: ${days} jours`);
  }

  /**
   * Active/désactive la compression des segments
   */
  static async enableCompression(enabled: boolean): Promise<void> {
    await this.saveSettings({ compressionEnabled: enabled });
    console.log(`[CacheManager] Compression: ${enabled ? 'activée' : 'désactivée'}`);
  }

  /**
   * Active/désactive le cache HLS segments
   */
  static async enableHLSCache(enabled: boolean): Promise<void> {
    await this.saveSettings({ hlsCacheEnabled: enabled });
    console.log(`[CacheManager] Cache HLS: ${enabled ? 'activé' : 'désactivé'}`);
  }

  /**
   * Active/désactive le cache DNS
   */
  static async enableDNSCache(enabled: boolean): Promise<void> {
    await this.saveSettings({ dnsCacheEnabled: enabled });
    console.log(`[CacheManager] Cache DNS: ${enabled ? 'activé' : 'désactivé'}`);
  }

  /**
   * Réinitialise tous les paramètres aux valeurs par défaut
   */
  static async resetToDefaults(): Promise<void> {
    try {
      await AsyncStorage.setItem(CACHE_SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
      console.log('[CacheManager] Paramètres réinitialisés');
    } catch (error) {
      console.error('[CacheManager] Erreur réinitialisation:', error);
    }
  }

  /**
   * Récupère la limite de cache actuelle
   */
  static async getCacheLimit(): Promise<number> {
    const settings = await this.getSettings();
    return settings.cacheLimit;
  }

  /**
   * Vérifie si la compression est activée
   */
  static async isCompressionEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.compressionEnabled;
  }

  /**
   * Vérifie si le cache HLS est activé
   */
  static async isHLSCacheEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.hlsCacheEnabled;
  }

  /**
   * Vérifie si le cache DNS est activé
   */
  static async isDNSCacheEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.dnsCacheEnabled;
  }
}
