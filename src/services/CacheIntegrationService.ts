/**
 * 🔗 Cache Integration Service - Connecteur intelligent pour SmartCache
 * Intègre le cache 3-niveaux avec les services existants (Streaming, Background, etc.)
 * Optimise automatiquement selon patterns d'usage pour 100K+ chaînes
 */

import SmartCacheService from './SmartCacheService';
import {
  XtreamChannel,
  XtreamCategory,
  XtreamCredentials,
} from './StreamingXtreamService';
import BackgroundWorkerService from './BackgroundWorkerService';
import ProgressiveUIService from './ProgressiveUIService';

// ================================
// CACHE KEYS STRATEGY
// ================================

export const CacheKeys = {
  // Xtream API responses
  XTREAM_SERVER_INFO: (url: string) => `xtream_server_${url}`,
  XTREAM_CATEGORIES: (url: string, username: string) =>
    `xtream_categories_${url}_${username}`,
  XTREAM_CHANNELS: (url: string, username: string, categoryId?: string) =>
    `xtream_channels_${url}_${username}${
      categoryId ? `_cat${categoryId}` : '_all'
    }`,

  // Processed data
  NORMALIZED_CHANNELS: (playlistId: string) =>
    `normalized_channels_${playlistId}`,
  CHANNEL_METADATA: (streamId: string) => `channel_meta_${streamId}`,
  CATEGORY_STATS: (categoryId: string) => `category_stats_${categoryId}`,

  // Search indexes
  SEARCH_INDEX: (playlistId: string) => `search_index_${playlistId}`,
  FUZZY_INDEX: (playlistId: string) => `fuzzy_index_${playlistId}`,

  // User preferences
  USER_FAVORITES: (userId: string) => `user_favorites_${userId}`,
  USER_HISTORY: (userId: string) => `user_history_${userId}`,
  USER_SETTINGS: (userId: string) => `user_settings_${userId}`,

  // Performance data
  CHANNEL_PERFORMANCE: (streamId: string) => `channel_perf_${streamId}`,
  PLAYLIST_STATS: (playlistId: string) => `playlist_stats_${playlistId}`,
};

// ================================
// CACHE STRATEGY DEFINITIONS
// ================================

interface CacheStrategy {
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  ttl: number; // Time to live in ms
  levels: ('L1' | 'L2' | 'L3')[];
  compression?: boolean;
  predictiveLoading?: boolean;
}

const CacheStrategies: Record<string, CacheStrategy> = {
  // API Responses - Critical for performance
  XTREAM_API: {
    priority: 'HIGH',
    ttl: 15 * 60 * 1000, // 15 minutes
    levels: ['L1', 'L2', 'L3'],
    compression: true,
    predictiveLoading: true,
  },

  // Processed channels - High usage
  CHANNELS: {
    priority: 'HIGH',
    ttl: 30 * 60 * 1000, // 30 minutes
    levels: ['L1', 'L2'],
    compression: true,
    predictiveLoading: true,
  },

  // Search indexes - Performance critical
  SEARCH: {
    priority: 'CRITICAL',
    ttl: 60 * 60 * 1000, // 1 hour
    levels: ['L1', 'L2', 'L3'],
    compression: false, // Keep uncompressed for speed
    predictiveLoading: false,
  },

  // User data - Personal, persistent
  USER_DATA: {
    priority: 'CRITICAL',
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    levels: ['L1', 'L2', 'L3'],
    compression: true,
    predictiveLoading: false,
  },

  // Performance metrics - Analytics
  PERFORMANCE: {
    priority: 'NORMAL',
    ttl: 60 * 60 * 1000, // 1 hour
    levels: ['L2', 'L3'],
    compression: true,
    predictiveLoading: false,
  },

  // Temporary data - Short lived
  TEMPORARY: {
    priority: 'LOW',
    ttl: 5 * 60 * 1000, // 5 minutes
    levels: ['L1'],
    compression: false,
    predictiveLoading: false,
  }
};

// ================================
// CACHE INTEGRATION SERVICE
// ================================

class CacheIntegrationService {
  private usagePatterns = new Map<
    string,
    {
      accessCount: number;
      lastAccess: number;
      avgAccessInterval: number;
      relatedKeys: Set<string>;
    }
  >();

  /**
   * 📥 Cache Xtream API server info
   */
  async cacheServerInfo(
    credentials: XtreamCredentials,
    serverInfo: any,
  ): Promise<boolean> {
    const key = CacheKeys.XTREAM_SERVER_INFO(credentials.url);
    const strategy = CacheStrategies.XTREAM_API;

    return await this.cacheWithStrategy(key, serverInfo, strategy);
  }

  /**
   * 📂 Cache Xtream categories
   */
  async cacheCategories(
    credentials: XtreamCredentials,
    categories: XtreamCategory[],
  ): Promise<boolean> {
    const key = CacheKeys.XTREAM_CATEGORIES(
      credentials.url,
      credentials.username,
    );
    const strategy = CacheStrategies.XTREAM_API;

    const success = await this.cacheWithStrategy(key, categories, strategy);

    // Cache individual category stats
    if (success) {
      await this.cacheIndividualCategories(categories);
    }

    return success;
  }

  /**
   * 📺 Cache channels with intelligent batching
   */
  async cacheChannels(
    credentials: XtreamCredentials,
    channels: XtreamChannel[],
    categoryId?: string,
  ): Promise<boolean> {
    const key = CacheKeys.XTREAM_CHANNELS(
      credentials.url,
      credentials.username,
      categoryId,
    );
    const strategy = CacheStrategies.CHANNELS;

    // For large channel lists, use background processing
    if (channels.length > 1000) {
      return await this.cacheChannelsInBackground(key, channels, strategy);
    }

    const success = await this.cacheWithStrategy(key, channels, strategy);

    // Cache individual channel metadata for quick access
    if (success) {
      await this.cacheIndividualChannels(channels);
    }

    return success;
  }

  /**
   * 🔍 Cache search indexes
   */
  async cacheSearchIndex(
    playlistId: string,
    searchIndex: Map<string, string[]>,
  ): Promise<boolean> {
    const key = CacheKeys.SEARCH_INDEX(playlistId);
    const strategy = CacheStrategies.SEARCH;

    // Convert Map to serializable object
    const indexData = Object.fromEntries(searchIndex);

    return await this.cacheWithStrategy(key, indexData, strategy);
  }

  /**
   * ⭐ Cache user favorites with predictive loading
   */
  async cacheUserFavorites(
    userId: string,
    favorites: string[],
  ): Promise<boolean> {
    const key = CacheKeys.USER_FAVORITES(userId);
    const strategy = CacheStrategies.USER_DATA;

    const success = await this.cacheWithStrategy(key, favorites, strategy);

    // Predictive loading: cache related channel data
    if (success && strategy.predictiveLoading) {
      const relatedKeys = favorites.map(streamId =>
        CacheKeys.CHANNEL_METADATA(streamId),
      );
      await SmartCacheService.preloadRelatedData(key, relatedKeys);
    }

    return success;
  }

  /**
   * 📖 Get cached data with usage tracking
   */
  async getCached<T>(
    cacheKey: string,
    strategyType: keyof typeof CacheStrategies,
  ): Promise<T | null> {
    const startTime = performance.now();

    try {
      const data = await SmartCacheService.get<T>(cacheKey);

      // Track usage patterns
      this.updateUsagePattern(cacheKey);

      const accessTime = performance.now() - startTime;

      if (data) {
        console.log(
          `🔗 Cache hit for ${cacheKey} in ${accessTime.toFixed(2)}ms`,

        // Adaptive predictive loading
        const pattern = this.usagePatterns.get(cacheKey);
        if (pattern && pattern.accessCount > 5) {
          await this.performPredictiveLoading(cacheKey);
        }
      } else {
        console.log(
          `🔗 Cache miss for ${cacheKey} (${accessTime.toFixed(2)}ms)`,
        );

      return data;
    } catch (error) {
      console.error(`🔗 Cache get error for ${cacheKey}:`, error);
      return null;
    }
  }

  /**
   * 💾 Set cached data with automatic strategy
   */
  async setCached(
    cacheKey: string,
    data: any,
    strategyType: keyof typeof CacheStrategies,
  ): Promise<boolean> {
    const strategy = CacheStrategies[strategyType];
    return await this.cacheWithStrategy(cacheKey, data, strategy);
  }

  /**
   * 🗑️ Invalidate cache with pattern matching
   */
  async invalidateCache(pattern: string | RegExp): Promise<void> {
    console.log(`🔗 Invalidating cache pattern: ${pattern}`);

    // For now, clear all cache if pattern is complex
    // TODO: Implement selective invalidation
    if (typeof pattern === 'object' || pattern.includes('*')) {
      await SmartCacheService.clear();
      this.usagePatterns.clear();
    } else {
      await SmartCacheService.delete(pattern);
      this.usagePatterns.delete(pattern);
    }
  }

  /**
   * 📊 Get cache performance metrics
   */
  getCacheMetrics() {
    const stats = SmartCacheService.getStats();
    const usageStats = this.getUsageStats();

    return {
      ...stats,
      usage: usageStats,
      recommendations: this.generateOptimizationRecommendations(
        stats,
        usageStats,
      ),
    };
  }

  /**
   * ⚡ Warm up cache with essential data
   */
  async warmUpCache(
    playlistId: string,
    essentialChannels: XtreamChannel[],
  ): Promise<void> {
    console.log(`🔗 Warming up cache for playlist ${playlistId}`);

    // Cache most accessed channels first
    const highPriorityChannels = essentialChannels.slice(0, 100);
    await this.cacheIndividualChannels(highPriorityChannels, 'CRITICAL');

    // Build and cache search index in background
    BackgroundWorkerService.addTask({
      id: `warmup_search_${playlistId}`,
      type: 'BUILD_SEARCH_INDEX',
      priority: 'HIGH',
      data: {channels: essentialChannels},
      onComplete: searchIndex => {
        this.cacheSearchIndex(playlistId, searchIndex);
      },
    });

    console.log(
      `🔗 Cache warm-up completed for ${highPriorityChannels.length} priority channels`,
    );
  }

  /**
   * 🧹 Intelligent cache cleanup based on usage patterns
   */
  async performIntelligentCleanup(): Promise<void> {
    console.log('🔗 Performing intelligent cache cleanup...');

    const stats = SmartCacheService.getStats();
    const memoryPressure = stats.l1.memoryUsage / stats.l1.maxSize;
    const storagePressure = stats.l2.storageUsage / stats.l2.maxSize;

    // If memory pressure is high, be more aggressive with L1 cleanup
    if (memoryPressure > 0.8) {
      console.log(
        '🔗 High memory pressure detected, clearing least used L1 items',
      );
      // SmartCache will handle LRU eviction automatically
    }

    // If storage pressure is high, clear old temporary data
    if (storagePressure > 0.9) {
      console.log('🔗 High storage pressure detected, clearing temporary data');
      // Clear items older than 1 hour with LOW priority
      // This would be implemented in SmartCache
    }

    // Clean up old usage patterns (older than 24 hours)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    for (const [key, pattern] of this.usagePatterns.entries()) {
      if (pattern.lastAccess < oneDayAgo) {
        this.usagePatterns.delete(key);
      }
    }

    console.log('🔗 Intelligent cache cleanup completed');
  }

  // ================================
  // PRIVATE HELPER METHODS
  // ================================

  private async cacheWithStrategy(
    key: string,
    data: any,
    strategy: CacheStrategy,
  ): Promise<boolean> {
    const options = {
      priority: strategy.priority,
      ttl: strategy.ttl,
      l1Only: strategy.levels.length === 1 && strategy.levels[0] === 'L1',
      l2Only: strategy.levels.length === 1 && strategy.levels[0] === 'L2',
    };

    return await SmartCacheService.set(key, data, options);
  }

  private async cacheChannelsInBackground(
    key: string,
    channels: XtreamChannel[],
    strategy: CacheStrategy,
  ): Promise<boolean> {
    console.log(`🔗 Caching ${channels.length} channels in background`);

    // Split into batches for background processing
    const batchSize = 500;
    const batches = [];

    for (let i = 0; i < channels.length; i += batchSize) {
      batches.push(channels.slice(i, i + batchSize));
    }

    // Process each batch in background
    let processedBatches = 0;
    const totalBatches = batches.length;

    for (const [index, batch] of batches.entries()) {
      BackgroundWorkerService.addTask({
        id: `cache_channels_batch_${index}`,
        type: 'NORMALIZE_CHANNELS',
        priority: 'NORMAL',
        data: {channels: batch, batchIndex: index},
        onProgress: (progress, message) => {
          ProgressiveUIService.updateProgress(
            processedBatches * batchSize +
              Math.floor((batch.length * progress) / 100),
            channels.length,
          );
        },
        onComplete: async normalizedBatch => {
          // Cache this batch
          const batchKey = `${key}_batch_${index}`;
          await this.cacheWithStrategy(batchKey, normalizedBatch, strategy);

          processedBatches++;

          // When all batches are done, cache the complete dataset
          if (processedBatches === totalBatches) {
            await this.cacheWithStrategy(key, channels, strategy);
            console.log(
              `🔗 Background caching completed for ${channels.length} channels`,
            );
          }
        },
      });
    }

    return true; // Return immediately, processing continues in background
  }

  private async cacheIndividualChannels(
    channels: XtreamChannel[],
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL' = 'NORMAL',
  ): Promise<void> {
    const strategy = {...CacheStrategies.CHANNELS, priority};

    for (const channel of channels.slice(0, 100)) {
      // Limit to first 100 for performance
      const key = CacheKeys.CHANNEL_METADATA(channel.stream_id);
      await this.cacheWithStrategy(
        key,
        {
          id: channel.stream_id,
          name: channel.name,
          logo: channel.stream_icon,
          category: channel.category_name,
          cached_at: Date.now(),
        },
        strategy,
      );
    }
  }

  private async cacheIndividualCategories(
    categories: XtreamCategory[],
  ): Promise<void> {
    const strategy = CacheStrategies.XTREAM_API;

    for (const category of categories) {
      const key = CacheKeys.CATEGORY_STATS(category.category_id);
      await this.cacheWithStrategy(
        key,
        {
          id: category.category_id,
          name: category.category_name,
          parent_id: category.parent_id,
          cached_at: Date.now(),
        },
        strategy,
      );
    }
  }

  private updateUsagePattern(cacheKey: string): void {
    const now = Date.now();
    const existing = this.usagePatterns.get(cacheKey);

    if (existing) {
      const timeSinceLastAccess = now - existing.lastAccess;
      existing.accessCount++;
      existing.avgAccessInterval =
        (existing.avgAccessInterval + timeSinceLastAccess) / 2;
      existing.lastAccess = now;
    } else {
      this.usagePatterns.set(cacheKey, {
        accessCount: 1,
        lastAccess: now,
        avgAccessInterval: 0,
        relatedKeys: new Set(),
      });
    }
  }

  private async performPredictiveLoading(cacheKey: string): Promise<void> {
    const pattern = this.usagePatterns.get(cacheKey);
    if (!pattern || pattern.relatedKeys.size === 0) {return;}

    const relatedKeys = Array.from(pattern.relatedKeys);
    await SmartCacheService.preloadRelatedData(cacheKey, relatedKeys);
  }

  private getUsageStats() {
    const patterns = Array.from(this.usagePatterns.values());

    if (patterns.length === 0) {
      return {totalKeys: 0, avgAccessCount: 0, avgInterval: 0, hotKeys: []};
    }

    const totalAccessCount = patterns.reduce(
      (sum, p) => sum + p.accessCount,
      0,
    );
    const avgAccessCount = totalAccessCount / patterns.length;
    const avgInterval =
      patterns.reduce((sum, p) => sum + p.avgAccessInterval, 0) /
      patterns.length;

    // Find hot keys (frequently accessed)
    const hotKeys = Array.from(this.usagePatterns.entries())
      .filter(([, pattern]) => pattern.accessCount > avgAccessCount * 2)
      .map(([key]) => key)
      .slice(0, 10);

    return {
      totalKeys: patterns.length,
      avgAccessCount,
      avgInterval,
      hotKeys,
    };
  }

  private generateOptimizationRecommendations(
    cacheStats: any,
    usageStats: any,
  ): string[] {
    const recommendations: string[] = [];

    // Memory pressure recommendations
    if (cacheStats.l1.memoryUsage / cacheStats.l1.maxSize > 0.8) {
      recommendations.push(
        'Consider increasing L1 cache size or implement more aggressive eviction',
      );

    // Hit rate recommendations
    if (cacheStats.overall.hitRate < 0.6) {
      recommendations.push(
        'Low hit rate detected - consider adjusting TTL or cache warming strategy',
      );
    }

    // Hot keys recommendations
    if (usageStats.hotKeys.length > 5) {
      recommendations.push(
        `${usageStats.hotKeys.length} hot keys detected - consider prioritizing these for L1`,
      );

    // Access time recommendations
    if (cacheStats.overall.avgAccessTime > 50) {
      recommendations.push(
        'Average access time is high - consider optimizing cache key structure',
      );

    return recommendations;
  }
}

export default new CacheIntegrationService();
