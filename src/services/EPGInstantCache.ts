/**
 * ⚡ EPG Instant Cache - Cache LRU ultra-rapide pour EPG
 * Fournit l'EPG instantanément pour éviter les blocages UI
 */

// Implémentation simple EventEmitter pour React Native
class SimpleEventEmitter {
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  off(event: string, listener: Function): void {
    if (!this.listeners.has(event)) return;
    const eventListeners = this.listeners.get(event)!;
    const index = eventListeners.indexOf(listener);
    if (index > -1) {
      eventListeners.splice(index, 1);
    }
  }

  emit(event: string, ...args: any[]): void {
    if (!this.listeners.has(event)) return;
    const eventListeners = this.listeners.get(event)!;
    eventListeners.forEach(listener => listener(...args));
  }
}
import {EPGData} from './EPGHelper';

interface CachedEPGData extends EPGData {
  lastUpdate: number;
  hitCount: number;
  isExpired: boolean;
}

interface CacheEntry {
  channelId: string;
  data: CachedEPGData;
  accessTime: number;
  size: number; // Estimation taille en bytes
}

interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  avgAccessTime: number;
  oldestEntry: number;
  newestEntry: number;
  expiredEntries: number;
}

class EPGInstantCache extends SimpleEventEmitter {
  private static instance: EPGInstantCache;
  private cache: Map<string, CacheEntry> = new Map();

  // Configuration cache
  private config = {
    maxEntries: 500, // Maximum 500 chaînes en cache
    maxSize: 50 * 1024 * 1024, // 50MB max
    ttl: 5 * 60 * 1000, // TTL 5 minutes
    cleanupInterval: 2 * 60 * 1000, // Nettoyage toutes les 2 minutes
    preloadSize: 50, // Nombre de chaînes populaires à pré-charger
  };

  // Statistiques
  private stats = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
    totalSize: 0,
    lastCleanup: 0,
  };

  private constructor() {
    super();
    console.log('⚡ [EPGInstantCache] Cache EPG instantané initialisé', {
      maxEntries: this.config.maxEntries,
      maxSize: `${Math.round(this.config.maxSize / (1024 * 1024))}MB`,
      ttl: `${Math.round(this.config.ttl / 1000)}s`,
    });

    // Démarrer le nettoyage automatique
    this.startCleanupScheduler();
  }

  public static getInstance(): EPGInstantCache {
    if (!EPGInstantCache.instance) {
      EPGInstantCache.instance = new EPGInstantCache();
    }
    return EPGInstantCache.instance;
  }

  /**
   * ⚡ Récupération EPG ultra-rapide (principale méthode)
   */
  public get(channelId: string): CachedEPGData | null {
    const startTime = performance.now();
    this.stats.totalRequests++;

    const entry = this.cache.get(channelId);

    if (entry) {
      const now = Date.now();

      // Vérifier expiration
      if (now - entry.data.lastUpdate > this.config.ttl) {
        console.log('⏰ [EPGInstantCache] Données expirées pour', channelId, {
          age: `${Math.round((now - entry.data.lastUpdate) / 1000)}s`,
          ttl: `${Math.round(this.config.ttl / 1000)}s`,
        });
        entry.data.isExpired = true;
      }

      // Mise à jour statistiques d'accès
      entry.accessTime = now;
      entry.data.hitCount++;
      this.stats.hits++;

      const accessTime = performance.now() - startTime;
      console.log('✅ [EPGInstantCache] HIT pour', channelId, {
        hitCount: entry.data.hitCount,
        age: `${Math.round((now - entry.data.lastUpdate) / 1000)}s`,
        accessTime: `${accessTime.toFixed(2)}ms`,
        isExpired: entry.data.isExpired,
      });

      return entry.data;
    }

    // Cache miss
    this.stats.misses++;
    const accessTime = performance.now() - startTime;

    console.log('❌ [EPGInstantCache] MISS pour', channelId, {
      accessTime: `${accessTime.toFixed(2)}ms`,
      cacheSize: this.cache.size,
    });

    return null;
  }

  /**
   * 💾 Mise en cache EPG avec optimisations LRU
   */
  public set(channelId: string, epgData: EPGData): void {
    console.log('💾 [EPGInstantCache] Mise en cache pour', channelId, {
      hasCurrentProgram: !!epgData.currentProgram,
      hasNextProgram: !!epgData.nextProgram,
      progress: `${epgData.progressPercentage}%`,
    });

    const now = Date.now();
    const estimatedSize = this.estimateSize(epgData);

    // Vérifier limites du cache avant ajout
    this.ensureCacheSpace(estimatedSize);

    const cacheData: CachedEPGData = {
      ...epgData,
      lastUpdate: now,
      hitCount: 0,
      isExpired: false,
    };

    const entry: CacheEntry = {
      channelId,
      data: cacheData,
      accessTime: now,
      size: estimatedSize,
    };

    // Ajouter au cache
    this.cache.set(channelId, entry);
    this.stats.totalSize += estimatedSize;

    console.log('✅ [EPGInstantCache] Données mises en cache', {
      channelId,
      size: `${Math.round(estimatedSize / 1024)}KB`,
      totalEntries: this.cache.size,
      totalSize: `${Math.round(this.stats.totalSize / (1024 * 1024))}MB`,
    });

    // Émettre événement pour monitoring
    this.emit('cache-updated', {
      channelId,
      size: estimatedSize,
      totalEntries: this.cache.size,
    });
  }

  /**
   * 🔄 Pré-chargement intelligent des chaînes populaires
   */
  public async preloadPopularChannels(channelIds: string[]): Promise<void> {
    const startTime = Date.now();
    const preloadChannels = channelIds.slice(0, this.config.preloadSize);

    console.log('🔄 [EPGInstantCache] Démarrage pré-chargement chaînes populaires', {
      requestedChannels: channelIds.length,
      preloadingChannels: preloadChannels.length,
      maxPreload: this.config.preloadSize,
    });

    let successful = 0;
    let errors = 0;

    for (const channelId of preloadChannels) {
      try {
        // Si pas déjà en cache, on va le chercher
        if (!this.cache.has(channelId)) {
          // Import dynamique pour éviter dépendance circulaire
          const {EPGHelper} = await import('./EPGHelper');
          const epgData = await EPGHelper.getChannelEPG(channelId);

          if (epgData) {
            this.set(channelId, epgData);
            successful++;
          }
        } else {
          console.log('⚡ [EPGInstantCache] Déjà en cache:', channelId);
        }
      } catch (error) {
        console.warn('⚠️ [EPGInstantCache] Erreur pré-chargement', channelId, error);
        errors++;
      }

      // Petit délai pour éviter surcharge
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const duration = Date.now() - startTime;
    console.log('✅ [EPGInstantCache] Pré-chargement terminé', {
      successful,
      errors,
      duration: `${duration}ms`,
      cacheSize: this.cache.size,
    });

    this.emit('preload-completed', {successful, errors, duration});
  }

  /**
   * 🧹 Nettoyage intelligent du cache
   */
  public cleanup(force = false): {removed: number; sizeFreed: number} {
    const startTime = Date.now();
    const initialSize = this.cache.size;
    const initialTotalSize = this.stats.totalSize;

    console.log('🧹 [EPGInstantCache] Début nettoyage', {
      force,
      entries: this.cache.size,
      totalSize: `${Math.round(this.stats.totalSize / (1024 * 1024))}MB`,
    });

    const now = Date.now();
    let removed = 0;
    let sizeFreed = 0;

    // Collecter les entrées à supprimer
    const toRemove: string[] = [];

    this.cache.forEach((entry, channelId) => {
      const age = now - entry.data.lastUpdate;
      const shouldRemove = force ||
        age > this.config.ttl || // TTL expiré
        (entry.data.hitCount === 0 && age > 30000); // Jamais utilisé depuis 30s

      if (shouldRemove) {
        toRemove.push(channelId);
        sizeFreed += entry.size;
      }
    });

    // Supprimer les entrées
    toRemove.forEach(channelId => {
      const entry = this.cache.get(channelId);
      if (entry) {
        this.cache.delete(channelId);
        this.stats.totalSize -= entry.size;
        removed++;
      }
    });

    const duration = Date.now() - startTime;
    this.stats.lastCleanup = now;

    console.log('✅ [EPGInstantCache] Nettoyage terminé', {
      removed,
      sizeFreed: `${Math.round(sizeFreed / 1024)}KB`,
      remainingEntries: this.cache.size,
      remainingSize: `${Math.round(this.stats.totalSize / (1024 * 1024))}MB`,
      duration: `${duration}ms`,
    });

    this.emit('cleanup-completed', {removed, sizeFreed, duration});

    return {removed, sizeFreed};
  }

  /**
   * 📊 Statistiques détaillées du cache
   */
  public getStats(): CacheStats {
    const now = Date.now();
    let oldestEntry = now;
    let newestEntry = 0;
    let expiredEntries = 0;

    this.cache.forEach(entry => {
      oldestEntry = Math.min(oldestEntry, entry.data.lastUpdate);
      newestEntry = Math.max(newestEntry, entry.data.lastUpdate);

      if (now - entry.data.lastUpdate > this.config.ttl) {
        expiredEntries++;
      }
    });

    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
    const avgAccessTime = 0.5; // Estimation basée sur les perfs observées

    const stats: CacheStats = {
      totalEntries: this.cache.size,
      totalSize: this.stats.totalSize,
      hitRate,
      avgAccessTime,
      oldestEntry: oldestEntry === now ? 0 : oldestEntry,
      newestEntry,
      expiredEntries,
    };

    console.log('📊 [EPGInstantCache] Statistiques cache', {
      ...stats,
      totalSize: `${Math.round(stats.totalSize / (1024 * 1024))}MB`,
      hitRate: `${hitRate.toFixed(1)}%`,
      hits: this.stats.hits,
      misses: this.stats.misses,
    });

    return stats;
  }

  /**
   * 🗑️ Vider complètement le cache
   */
  public clear(): void {
    const entriesRemoved = this.cache.size;
    const sizeFreed = this.stats.totalSize;

    console.log('🗑️ [EPGInstantCache] Vider le cache', {
      entriesRemoved,
      sizeFreed: `${Math.round(sizeFreed / (1024 * 1024))}MB`,
    });

    this.cache.clear();
    this.stats.totalSize = 0;
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.totalRequests = 0;

    this.emit('cache-cleared', {entriesRemoved, sizeFreed});
  }

  // Méthodes privées

  private estimateSize(epgData: EPGData): number {
    // Estimation approximative de la taille en mémoire
    const currentProgramSize = epgData.currentProgram ?
      JSON.stringify(epgData.currentProgram).length : 0;
    const nextProgramSize = epgData.nextProgram ?
      JSON.stringify(epgData.nextProgram).length : 0;

    return (currentProgramSize + nextProgramSize + 200) * 2; // x2 pour overhead
  }

  private ensureCacheSpace(requiredSize: number): void {
    // Si on dépasse la taille max, faire du nettoyage LRU
    while (
      (this.stats.totalSize + requiredSize > this.config.maxSize ||
       this.cache.size >= this.config.maxEntries) &&
      this.cache.size > 0
    ) {
      // Trouver l'entrée la moins récemment utilisée
      let oldestChannelId = '';
      let oldestAccessTime = Date.now();

      this.cache.forEach((entry, channelId) => {
        if (entry.accessTime < oldestAccessTime) {
          oldestAccessTime = entry.accessTime;
          oldestChannelId = channelId;
        }
      });

      if (oldestChannelId) {
        const entry = this.cache.get(oldestChannelId);
        if (entry) {
          this.cache.delete(oldestChannelId);
          this.stats.totalSize -= entry.size;

          console.log('🗑️ [EPGInstantCache] Éviction LRU', {
            channelId: oldestChannelId,
            age: `${Math.round((Date.now() - entry.accessTime) / 1000)}s`,
            sizeFreed: `${Math.round(entry.size / 1024)}KB`,
          });
        }
      } else {
        break; // Sécurité contre boucle infinie
      }
    }
  }

  private startCleanupScheduler(): void {
    setInterval(() => {
      const stats = this.getStats();

      // Déclencher nettoyage si nécessaire
      if (stats.expiredEntries > 10 || stats.totalEntries > this.config.maxEntries * 0.8) {
        this.cleanup();
      }
    }, this.config.cleanupInterval);

    console.log('⏰ [EPGInstantCache] Planificateur de nettoyage démarré', {
      interval: `${Math.round(this.config.cleanupInterval / 1000)}s`,
    });
  }
}

export default EPGInstantCache.getInstance();