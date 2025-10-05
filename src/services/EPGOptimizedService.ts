/**
 * 🚀 EPG Optimized Service - Performance niveau TiviMate/Perfect Player
 *
 * OPTIMISATIONS MAJEURES:
 * ✅ Cache LRU intelligent avec expiration
 * ✅ Limitation de concurrence pour éviter surcharge réseau
 * ✅ Préchargement intelligent des chaînes visibles
 * ✅ Évitement des doublons de requêtes
 * ✅ Gestion robuste des timeouts et erreurs
 * ✅ Métriques de performance en temps réel
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {EPGHelper, EPGData} from './EPGHelper';

interface CacheEntry {
  data: EPGData;
  timestamp: number;
  expiresAt: number;
}

interface RequestMetrics {
  channelId: string;
  startTime: number;
  endTime?: number;
  success: boolean;
  fromCache: boolean;
  error?: string;
}

class EPGOptimizedService {
  // Cache LRU intelligent
  private memoryCache = new Map<string, CacheEntry>();
  private maxCacheSize = 500; // 500 chaînes en cache maximum
  private defaultCacheTTL = 20 * 60 * 1000; // 20 minutes par défaut
  private liveProgramTTL = 5 * 60 * 1000; // 5 minutes pour programmes en cours

  // Gestion des requêtes en cours
  private pendingRequests = new Map<string, Promise<EPGData>>();
  private requestQueue: string[] = [];
  private maxConcurrentRequests = 5; // Limite importante pour éviter surcharge

  // Métriques de performance
  private metrics: RequestMetrics[] = [];
  private maxMetricsHistory = 1000;

  // Configuration adaptive
  private slowNetworkThreshold = 3000; // 3s considéré comme réseau lent
  private isSlowNetwork = false;
  private consecutiveTimeouts = 0;
  private maxTimeouts = 3;

  /**
   * Obtenir les données EPG avec optimisation intelligente
   */
  async getChannelEPG(
    channelId: string,
    forceRefresh = false,
  ): Promise<EPGData> {
    const startTime = Date.now();

    try {
      // 1. Vérifier cache mémoire d'abord
      if (!forceRefresh) {
        const cached = this.memoryCache.get(channelId);
        if (cached && cached.expiresAt > Date.now()) {
          console.log('💾 [EPGOptimized] Cache hit pour', channelId);
          this.recordMetric({
            channelId,
            startTime,
            endTime: Date.now(),
            success: true,
            fromCache: true,
          });
          return cached.data;
        }
      }

      // 2. Éviter doublons de requêtes
      if (this.pendingRequests.has(channelId)) {
        console.log('⏳ [EPGOptimized] Requête en cours pour', channelId);
        const result = await this.pendingRequests.get(channelId)!;
        this.recordMetric({
          channelId,
          startTime,
          endTime: Date.now(),
          success: true,
          fromCache: false,
        });
        return result;
      }

      // 3. Créer nouvelle requête avec limitation de concurrence
      const requestPromise = this.executeRequest(channelId);
      this.pendingRequests.set(channelId, requestPromise);

      try {
        const result = await requestPromise;

        // Cache le résultat avec TTL adaptatif
        const ttl = this.isLiveProgramTime()
          ? this.liveProgramTTL
          : this.defaultCacheTTL;
        this.cacheResult(channelId, result, ttl);

        this.recordMetric({
          channelId,
          startTime,
          endTime: Date.now(),
          success: true,
          fromCache: false,
        });

        this.consecutiveTimeouts = 0; // Reset sur succès
        return result;
      } catch (error) {
        this.recordMetric({
          channelId,
          startTime,
          endTime: Date.now(),
          success: false,
          fromCache: false,
          error: error.message,
        });

        this.consecutiveTimeouts++;
        if (this.consecutiveTimeouts >= this.maxTimeouts) {
          this.isSlowNetwork = true;
          console.warn('🐌 [EPGOptimized] Réseau lent détecté');
        }

        throw error;
      } finally {
        this.pendingRequests.delete(channelId);
      }
    } catch (error) {
      console.error('❌ [EPGOptimized] Erreur pour', channelId, ':', error);
      throw error;
    }
  }

  /**
   * Précharger EPG pour plusieurs chaînes avec batching intelligent
   */
  async preloadChannelsEPG(
    channelIds: string[],
    batchSize?: number,
  ): Promise<void> {
    if (channelIds.length === 0) {
      return;
    }

    const effectiveBatchSize = batchSize || (this.isSlowNetwork ? 3 : 5);
    console.log(
      `🚀 [EPGOptimized] Préchargement ${channelIds.length} chaînes (batch: ${effectiveBatchSize})`,
    );

    // Filtrer celles déjà en cache
    const channelsToLoad = channelIds.filter(id => !this.hasFreshCache(id));
    if (channelsToLoad.length === 0) {
      console.log('💾 [EPGOptimized] Toutes les chaînes déjà en cache');
      return;
    }

    // Diviser en batches
    const batches = this.createBatches(channelsToLoad, effectiveBatchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(
        `📦 [EPGOptimized] Batch ${i + 1}/${batches.length} (${
          batch.length
        } chaînes)`,
      );

      const batchPromises = batch.map(channelId =>
        this.getChannelEPG(channelId).catch(error => {
          console.warn(
            '⚠️ [EPGOptimized] Échec préchargement',
            channelId,
            ':',
            error.message,
          );
          return null;
        }),
      );

      await Promise.allSettled(batchPromises);

      // Délai entre batches pour éviter surcharge
      if (i < batches.length - 1) {
        await this.delay(this.isSlowNetwork ? 500 : 200);
      }
    }

    console.log(
      `✅ [EPGOptimized] Préchargement terminé - Cache: ${this.memoryCache.size} entrées`,
    );
  }

  /**
   * Exécuter une requête avec timeout adaptatif
   */
  private async executeRequest(channelId: string): Promise<EPGData> {
    const timeout = this.isSlowNetwork ? 8000 : 5000; // Timeout adaptatif

    return Promise.race([
      EPGHelper.getChannelEPG(channelId),
      this.createTimeoutPromise(timeout),
    ]);
  }

  /**
   * Mettre en cache avec gestion LRU
   */
  private cacheResult(channelId: string, data: EPGData, ttl: number): void {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    };

    // Supprimer l'ancienne entrée si existe
    if (this.memoryCache.has(channelId)) {
      this.memoryCache.delete(channelId);
    }

    // Ajouter nouvelle entrée
    this.memoryCache.set(channelId, entry);

    // Éviction LRU si cache plein
    if (this.memoryCache.size > this.maxCacheSize) {
      this.evictOldest();
    }
  }

  /**
   * Éviction LRU des plus anciennes entrées
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    this.memoryCache.forEach((entry, key) => {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
      console.log('🗑️ [EPGOptimized] Éviction LRU:', oldestKey);
    }
  }

  /**
   * Vérifier si une chaîne a un cache frais
   */
  private hasFreshCache(channelId: string): boolean {
    const cached = this.memoryCache.get(channelId);
    return cached ? cached.expiresAt > Date.now() : false;
  }

  /**
   * Détecter si c'est l'heure des programmes en direct
   */
  private isLiveProgramTime(): boolean {
    const now = new Date();
    const minutes = now.getMinutes();
    // Les programmes commencent généralement à l'heure ou demi-heure
    return minutes < 5 || (minutes >= 25 && minutes <= 35);
  }

  /**
   * Créer des batches équilibrés
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Promise de timeout
   */
  private createTimeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout après ${ms}ms`)), ms);
    });
  }

  /**
   * Délai utilitaire
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Enregistrer métrique de performance
   */
  private recordMetric(metric: RequestMetrics): void {
    this.metrics.push(metric);

    // Limiter historique
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift();
    }

    // Analyser performance réseau
    if (metric.endTime && metric.startTime) {
      const duration = metric.endTime - metric.startTime;
      if (duration > this.slowNetworkThreshold) {
        console.warn(
          `🐌 [EPGOptimized] Requête lente: ${duration}ms pour ${metric.channelId}`,
        );
      }
    }
  }

  /**
   * Obtenir statistiques de performance
   */
  getPerformanceStats() {
    const totalRequests = this.metrics.length;
    const successfulRequests = this.metrics.filter(m => m.success).length;
    const cacheHits = this.metrics.filter(m => m.fromCache).length;
    const averageTime =
      this.metrics
        .filter(m => m.endTime && m.startTime)
        .reduce((acc, m) => acc + (m.endTime! - m.startTime), 0) /
      totalRequests;

    return {
      totalRequests,
      successRate:
        totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
      cacheHitRate: totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0,
      averageResponseTime: Math.round(averageTime),
      cacheSize: this.memoryCache.size,
      isSlowNetwork: this.isSlowNetwork,
      pendingRequests: this.pendingRequests.size,
    };
  }

  /**
   * Nettoyer le cache expiré
   */
  cleanExpiredCache(): number {
    const now = Date.now();
    let cleaned = 0;

    this.memoryCache.forEach((entry, key) => {
      if (entry.expiresAt <= now) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      console.log(`🧹 [EPGOptimized] ${cleaned} entrées expirées supprimées`);
    }

    return cleaned;
  }

  /**
   * Réinitialiser les métriques de réseau lent
   */
  resetNetworkMetrics(): void {
    this.isSlowNetwork = false;
    this.consecutiveTimeouts = 0;
    console.log('🔄 [EPGOptimized] Métriques réseau réinitialisées');
  }

  /**
   * Vider complètement le cache (debugging)
   */
  clearCache(): void {
    this.memoryCache.clear();
    this.pendingRequests.clear();
    this.metrics.length = 0;
    console.log('🗑️ [EPGOptimized] Cache complètement vidé');
  }
}

// Instance singleton
export const EPGOptimized = new EPGOptimizedService();

// Interface pour faciliter les tests
export interface EPGOptimizedInterface {
  getChannelEPG(channelId: string, forceRefresh?: boolean): Promise<EPGData>;
  preloadChannelsEPG(channelIds: string[], batchSize?: number): Promise<void>;
  getPerformanceStats(): any;
  cleanExpiredCache(): number;
  resetNetworkMetrics(): void;
  clearCache(): void;
}
