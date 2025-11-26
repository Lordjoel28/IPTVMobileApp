/**
 * 📺 HLSCacheService - Gestion du cache HLS pour react-native-video
 * Configure le cache des segments HLS pour une lecture plus fluide
 */

import { CacheManager } from './CacheManager';
import RNFS from 'react-native-fs';

export interface HLSCacheConfig {
  enabled: boolean;
  maxCacheSizeMB: number;
  maxCacheAgeDays: number;
  cacheDirectory: string;
}

export interface VideoPlayerConfig {
  bufferConfig: {
    minBufferMs: number;
    maxBufferMs: number;
    bufferForPlaybackMs: number;
    bufferForPlaybackAfterRebufferMs: number;
  };
  cache?: {
    enabled: boolean;
    maxSize: number;
  };
}

class HLSCacheService {
  private cacheDirectory: string;
  private readonly DEFAULT_CACHE_SIZE_MB = 100; // 100 MB par défaut
  private readonly DEFAULT_CACHE_AGE_DAYS = 7;

  // ⚡ Cache en mémoire pour éviter lectures filesystem répétées
  private cachedStats: {
    sizeMB: number;
    fileCount: number;
    timestamp: number;
  } | null = null;
  private readonly STATS_CACHE_DURATION_MS = 30000; // 30 secondes

  constructor() {
    // Définir le répertoire de cache HLS
    this.cacheDirectory = `${RNFS.CachesDirectoryPath}/hls_cache`;
    this.initializeCacheDirectory();
  }

  /**
   * Initialise le répertoire de cache HLS
   */
  private async initializeCacheDirectory(): Promise<void> {
    try {
      const exists = await RNFS.exists(this.cacheDirectory);
      if (!exists) {
        await RNFS.mkdir(this.cacheDirectory);
        console.log('📺 [HLSCache] Répertoire de cache créé:', this.cacheDirectory);
      }
    } catch (error) {
      console.error('📺 [HLSCache] Erreur création répertoire cache:', error);
    }
  }

  /**
   * Obtient la configuration HLS selon les paramètres utilisateur
   */
  async getConfig(): Promise<HLSCacheConfig> {
    const settings = await CacheManager.getSettings();

    return {
      enabled: settings.hlsCacheEnabled,
      maxCacheSizeMB: this.DEFAULT_CACHE_SIZE_MB,
      maxCacheAgeDays: this.DEFAULT_CACHE_AGE_DAYS,
      cacheDirectory: this.cacheDirectory,
    };
  }

  /**
   * Obtient la configuration pour le lecteur vidéo react-native-video
   */
  async getVideoPlayerConfig(): Promise<VideoPlayerConfig> {
    const config = await this.getConfig();

    const baseBufferConfig = {
      minBufferMs: 15000,        // Buffer minimum: 15s
      maxBufferMs: 50000,        // Buffer maximum: 50s
      bufferForPlaybackMs: 2500, // Démarrage lecture: 2.5s
      bufferForPlaybackAfterRebufferMs: 5000, // Après rebuffering: 5s
    };

    if (config.enabled) {
      // Configuration optimisée avec cache HLS activé
      return {
        bufferConfig: {
          minBufferMs: 20000,        // Buffer minimum augmenté: 20s
          maxBufferMs: 100000,       // Buffer maximum augmenté: 100s
          bufferForPlaybackMs: 2500,
          bufferForPlaybackAfterRebufferMs: 5000,
        },
        cache: {
          enabled: true,
          maxSize: config.maxCacheSizeMB * 1024 * 1024, // En bytes
        },
      };
    } else {
      // Configuration basique sans cache
      return {
        bufferConfig: baseBufferConfig,
        cache: {
          enabled: false,
          maxSize: 0,
        },
      };
    }
  }

  /**
   * Nettoie le cache HLS manuellement
   */
  async clearCache(): Promise<{success: boolean; freedMB: number}> {
    try {
      const exists = await RNFS.exists(this.cacheDirectory);
      if (!exists) {
        console.log('📺 [HLSCache] Répertoire de cache inexistant');
        return { success: true, freedMB: 0 };
      }

      // Calculer la taille avant suppression
      const sizeBeforeMB = await this.getCacheSizeMB();

      // Supprimer tous les fichiers du cache
      const files = await RNFS.readDir(this.cacheDirectory);
      for (const file of files) {
        try {
          await RNFS.unlink(file.path);
        } catch (error) {
          console.error(`📺 [HLSCache] Erreur suppression fichier ${file.name}:`, error);
        }
      }

      // ⚡ Invalider le cache des stats
      this.cachedStats = null;

      console.log(`📺 [HLSCache] Cache HLS vidé: ${sizeBeforeMB.toFixed(2)} MB libérés`);

      return {
        success: true,
        freedMB: sizeBeforeMB,
      };
    } catch (error) {
      console.error('📺 [HLSCache] Erreur vidage cache:', error);
      return {
        success: false,
        freedMB: 0,
      };
    }
  }

  /**
   * Nettoie les fichiers de cache plus anciens que maxCacheAgeDays
   */
  async cleanOldCacheFiles(): Promise<{deleted: number; freedMB: number}> {
    try {
      const config = await this.getConfig();
      if (!config.enabled) {
        return { deleted: 0, freedMB: 0 };
      }

      const exists = await RNFS.exists(this.cacheDirectory);
      if (!exists) {
        return { deleted: 0, freedMB: 0 };
      }

      const files = await RNFS.readDir(this.cacheDirectory);
      const cutoffTime = Date.now() - (config.maxCacheAgeDays * 24 * 60 * 60 * 1000);

      let deletedCount = 0;
      let freedBytes = 0;

      for (const file of files) {
        try {
          const stat = await RNFS.stat(file.path);
          const fileModifiedTime = new Date(stat.mtime).getTime();

          if (fileModifiedTime < cutoffTime) {
            freedBytes += stat.size;
            await RNFS.unlink(file.path);
            deletedCount++;
          }
        } catch (error) {
          console.error(`📺 [HLSCache] Erreur traitement fichier ${file.name}:`, error);
        }
      }

      const freedMB = freedBytes / (1024 * 1024);

      if (deletedCount > 0) {
        console.log(`📺 [HLSCache] Nettoyage ancien cache: ${deletedCount} fichiers, ${freedMB.toFixed(2)} MB libérés`);
      }

      return { deleted: deletedCount, freedMB };
    } catch (error) {
      console.error('📺 [HLSCache] Erreur nettoyage ancien cache:', error);
      return { deleted: 0, freedMB: 0 };
    }
  }

  /**
   * Obtient la taille actuelle du cache HLS
   * ⚡ OPTIMISÉ: Utilise le cache en mémoire si disponible
   */
  async getCacheSizeMB(forceRefresh = false): Promise<number> {
    try {
      // ⚡ Utiliser le cache si disponible et valide
      if (!forceRefresh && this.cachedStats) {
        const now = Date.now();
        if (now - this.cachedStats.timestamp < this.STATS_CACHE_DURATION_MS) {
          return this.cachedStats.sizeMB;
        }
      }

      // Calculer la taille réelle
      const exists = await RNFS.exists(this.cacheDirectory);
      if (!exists) {
        return 0;
      }

      const files = await RNFS.readDir(this.cacheDirectory);
      let totalSize = 0;

      for (const file of files) {
        try {
          const stat = await RNFS.stat(file.path);
          totalSize += stat.size;
        } catch (error) {
          // Ignorer les erreurs de fichiers individuels
        }
      }

      const sizeMB = totalSize / (1024 * 1024);

      // ⚡ Mettre à jour le cache
      this.cachedStats = {
        sizeMB,
        fileCount: files.length,
        timestamp: Date.now(),
      };

      return sizeMB;
    } catch (error) {
      console.error('📺 [HLSCache] Erreur calcul taille cache:', error);
      return 0;
    }
  }

  /**
   * Obtient des statistiques sur le cache HLS
   * ⚡ OPTIMISÉ: Utilise le cache en mémoire
   */
  async getStats(): Promise<{
    enabled: boolean;
    sizeMB: number;
    fileCount: number;
    maxSizeMB: number;
    usagePercent: number;
  }> {
    const config = await this.getConfig();

    // ⚡ Utiliser le cache si disponible
    let sizeMB: number;
    let fileCount: number;

    if (this.cachedStats && Date.now() - this.cachedStats.timestamp < this.STATS_CACHE_DURATION_MS) {
      sizeMB = this.cachedStats.sizeMB;
      fileCount = this.cachedStats.fileCount;
    } else {
      // Rafraîchir les stats
      sizeMB = await this.getCacheSizeMB(true);
      fileCount = this.cachedStats?.fileCount || 0;
    }

    const usagePercent = config.maxCacheSizeMB > 0
      ? (sizeMB / config.maxCacheSizeMB) * 100
      : 0;

    return {
      enabled: config.enabled,
      sizeMB,
      fileCount,
      maxSizeMB: config.maxCacheSizeMB,
      usagePercent,
    };
  }

  /**
   * Vérifie et nettoie si nécessaire
   */
  async maintainCache(): Promise<void> {
    const config = await this.getConfig();
    if (!config.enabled) {
      return;
    }

    const stats = await this.getStats();

    // Si le cache dépasse 90% de la limite, nettoyer les vieux fichiers
    if (stats.usagePercent > 90) {
      console.log(`📺 [HLSCache] Cache plein (${stats.usagePercent.toFixed(1)}%), nettoyage...`);
      await this.cleanOldCacheFiles();
    }
  }
}

export default new HLSCacheService();
