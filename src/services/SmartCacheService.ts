/**
 * 🧠 Smart Caching Service L1/L2/L3 - Architecture 3-niveaux intelligent
 * Optimisé pour gestion 100K+ chaînes avec prédiction usage
 * Inspiré IPTV Smarters Pro avec adaptabilité mobile
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {XtreamChannel, XtreamCategory} from './StreamingXtreamService';
import CompressionService from './CompressionService';

// ================================
// INTERFACES ET TYPES
// ================================

export interface CacheItem<T = any> {
  id: string;
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccess: number;
  size: number; // Taille estimée en bytes
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  expiry?: number; // TTL optionnel
}

export interface CacheStats {
  l1: {
    size: number;
    maxSize: number;
    hitRate: number;
    items: number;
    memoryUsage: number;
  };
  l2: {
    size: number;
    maxSize: number;
    hitRate: number;
    items: number;
    storageUsage: number;
  };
  l3: {
    hitRate: number;
    items: number;
    databaseSize: number;
  };
  overall: {
    hitRate: number;
    totalItems: number;
    totalSize: number;
    avgAccessTime: number;
  };
}

export interface CacheConfig {
  l1MaxSize: number; // Memory cache max size (MB)
  l2MaxSize: number; // AsyncStorage cache max size (MB)
  l1MaxItems: number;
  l2MaxItems: number;
  defaultTTL: number; // Default TTL en ms
  evictionPolicy: 'LRU' | 'LFU' | 'ADAPTIVE';
  compressionEnabled: boolean;
  predictiveLoading: boolean;
}

// ================================
// L1 CACHE - MEMORY (LRU/LFU)
// ================================

class MemoryCache {
  private cache = new Map<string, CacheItem>();
  private accessHistory: string[] = [];
  private readonly maxSize: number;
  private readonly maxItems: number;
  private currentSize = 0;

  // Statistiques
  private hits = 0;
  private misses = 0;

  constructor(maxSize: number, maxItems: number) {
    this.maxSize = maxSize * 1024 * 1024; // Convert MB to bytes
    this.maxItems = maxItems;
  }

  get(key: string): CacheItem | null {
    const item = this.cache.get(key);

    if (!item) {
      this.misses++;
      return null;
    }

    // Check expiry
    if (item.expiry && Date.now() > item.expiry) {
      this.delete(key);
      this.misses++;
      return null;
    }

    // Update access stats
    item.accessCount++;
    item.lastAccess = Date.now();
    this.updateAccessHistory(key);
    this.hits++;

    return item;
  }

  set(
    key: string,
    data: any,
    priority: CacheItem['priority'] = 'NORMAL',
    ttl?: number,
  ): boolean {
    const itemSize = this.estimateSize(data);
    const expiry = ttl ? Date.now() + ttl : undefined;

    // Check if we need to evict
    while (
      (this.currentSize + itemSize > this.maxSize ||
        this.cache.size >= this.maxItems) &&
      this.cache.size > 0
    ) {
      const evicted = this.evictItem();
      if (!evicted) {break;} // Could not evict anything
    }

    // Don't cache if item is too large
    if (itemSize > this.maxSize * 0.1) {
      // Max 10% of cache size
      console.warn(`🧠 Item ${key} too large for L1 cache: ${itemSize} bytes`);
      return false;
    }

    const item: CacheItem = {
      id: key,
      data,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccess: Date.now(),
      size: itemSize,
      priority,
      expiry,
    };

    // Remove existing item if updating
    if (this.cache.has(key)) {
      const existing = this.cache.get(key)!;
      this.currentSize -= existing.size;
    }

    this.cache.set(key, item);
    this.currentSize += itemSize;
    this.updateAccessHistory(key);

    console.log(
      `🧠 L1 Cache SET: ${key} (${itemSize} bytes, priority: ${priority})`,
    );
    return true;
  }

  delete(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) {return false;}

    this.cache.delete(key);
    this.currentSize -= item.size;
    this.removeFromAccessHistory(key);

    console.log(`🧠 L1 Cache DELETE: ${key}`);
    return true;
  }

  clear(): void {
    this.cache.clear();
    this.accessHistory = [];
    this.currentSize = 0;
    this.hits = 0;
    this.misses = 0;
    console.log('🧠 L1 Cache CLEARED');
  }

  // Éviction intelligente
  private evictItem(): boolean {
    if (this.cache.size === 0) {return false;}

    // Stratégie adaptive : priorité basse d'abord, puis LRU
    let targetKey: string | null = null;
    let lowestPriority = Infinity;
    let oldestAccess = Infinity;

    const priorityValues = {LOW: 1, NORMAL: 2, HIGH: 3, CRITICAL: 4};

    for (const [key, item] of this.cache) {
      const priorityValue = priorityValues[item.priority];

      // Évite d'évincer les items critiques
      if (item.priority === 'CRITICAL') {continue;}

      if (
        priorityValue < lowestPriority ||
        (priorityValue === lowestPriority && item.lastAccess < oldestAccess)
      ) {
        targetKey = key;
        lowestPriority = priorityValue;
        oldestAccess = item.lastAccess;
      }
    }

    if (targetKey) {
      this.delete(targetKey);
      return true;
    }

    // En dernier recours, évincer le plus ancien (même critique)
    let oldestKey = this.accessHistory[0];
    if (oldestKey) {
      this.delete(oldestKey);
      return true;
    }

    return false;
  }

  private updateAccessHistory(key: string): void {
    // Remove existing entry
    this.removeFromAccessHistory(key);
    // Add to end (most recent)
    this.accessHistory.push(key);

    // Limit history size
    if (this.accessHistory.length > this.maxItems * 2) {
      this.accessHistory = this.accessHistory.slice(-this.maxItems);
    }
  }

  private removeFromAccessHistory(key: string): void {
    const index = this.accessHistory.indexOf(key);
    if (index > -1) {
      this.accessHistory.splice(index, 1);
    }
  }

  private estimateSize(data: any): number {
    if (data === null || data === undefined) {return 4;}
    if (typeof data === 'string') {return data.length * 2;} // UTF-16
    if (typeof data === 'number') {return 8;}
    if (typeof data === 'boolean') {return 4;}
    if (Array.isArray(data)) {
      return data.reduce((size, item) => size + this.estimateSize(item), 24); // Array overhead
    }
    if (typeof data === 'object') {
      return Object.entries(data).reduce((size, [key, value]) => {
        return size + this.estimateSize(key) + this.estimateSize(value);
      }, 24); // Object overhead
    }
    return 100; // Fallback estimation
  }

  getStats() {
    const hitRate =
      this.hits + this.misses > 0 ? this.hits / (this.hits + this.misses) : 0;

    return {
      size: this.currentSize,
      maxSize: this.maxSize,
      hitRate,
      items: this.cache.size,
      memoryUsage: this.currentSize,
    };
  }
}

// ================================
// L2 CACHE - ASYNC STORAGE
// ================================

class AsyncStorageCache {
  private readonly maxSize: number;
  private readonly maxItems: number;
  private readonly keyPrefix = 'smart_cache_l2_';
  private metaKey = 'smart_cache_l2_meta';

  // Statistiques en mémoire
  private hits = 0;
  private misses = 0;
  private metadata = new Map<
    string,
    {size: number; timestamp: number; priority: string}
  >();

  constructor(maxSize: number, maxItems: number) {
    this.maxSize = maxSize * 1024 * 1024; // Convert MB to bytes
    this.maxItems = maxItems;
    this.loadMetadata();
  }

  async get(key: string): Promise<CacheItem | null> {
    try {
      const storageKey = this.keyPrefix + key;
      const stored = await AsyncStorage.getItem(storageKey);

      if (!stored) {
        this.misses++;
        return null;
      }

      // Décompresser si nécessaire
      const item: CacheItem | null = await CompressionService.decompress(stored);

      if (!item) {
        this.misses++;
        return null;
      }

      // Check expiry
      if (item.expiry && Date.now() > item.expiry) {
        await this.delete(key);
        this.misses++;
        return null;
      }

      // Update access stats
      item.accessCount++;
      item.lastAccess = Date.now();

      // Recomprimer et sauvegarder les stats mises à jour
      const compressed = await CompressionService.compress(item);
      await AsyncStorage.setItem(storageKey, compressed);

      this.hits++;
      console.log(`🧠 L2 Cache HIT: ${key}`);
      return item;
    } catch (error) {
      console.error('🧠 L2 Cache GET error:', error);
      this.misses++;
      return null;
    }
  }

  async set(
    key: string,
    data: any,
    priority: CacheItem['priority'] = 'NORMAL',
    ttl?: number,
  ): Promise<boolean> {
    try {
      const itemSize = this.estimateSize(data);
      const expiry = ttl ? Date.now() + ttl : undefined;

      // Check space and evict if needed
      await this.ensureSpace(itemSize);

      const item: CacheItem = {
        id: key,
        data,
        timestamp: Date.now(),
        accessCount: 1,
        lastAccess: Date.now(),
        size: itemSize,
        priority,
        expiry,
      };

      const storageKey = this.keyPrefix + key;

      // Compresser avant de stocker
      const compressed = await CompressionService.compress(item);
      await AsyncStorage.setItem(storageKey, compressed);

      // Update metadata (utiliser la taille compressée)
      const compressedSize = compressed.length * 2; // UTF-16
      this.metadata.set(key, {
        size: compressedSize,
        timestamp: Date.now(),
        priority,
      });
      await this.saveMetadata();

      console.log(`🧠 L2 Cache SET: ${key} (${itemSize} → ${compressedSize} bytes, compression: ${((1 - compressedSize/itemSize) * 100).toFixed(1)}%)`);
      return true;
    } catch (error) {
      console.error('🧠 L2 Cache SET error:', error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const storageKey = this.keyPrefix + key;
      await AsyncStorage.removeItem(storageKey);
      this.metadata.delete(key);
      await this.saveMetadata();

      console.log(`🧠 L2 Cache DELETE: ${key}`);
      return true;

    } catch (error) {
      console.error('🧠 L2 Cache DELETE error:', error);
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      // Get all keys with our prefix
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(this.keyPrefix));

      await AsyncStorage.multiRemove([...cacheKeys, this.metaKey]);
      this.metadata.clear();
      this.hits = 0;
      this.misses = 0;

      console.log('🧠 L2 Cache CLEARED');
    } catch (error) {
      console.error('🧠 L2 Cache CLEAR error:', error);
    }
  }

  private async ensureSpace(newItemSize: number): Promise<void> {
    const currentSize = Array.from(this.metadata.values()).reduce(
      (total, meta) => total + meta.size,
      0,
    );

    if (
      currentSize + newItemSize <= this.maxSize &&
      this.metadata.size < this.maxItems
    ) {
      return; // Space available
    }

    // Need to evict items
    const itemsToEvict: string[] = [];
    let sizeToFree = Math.max(newItemSize, this.maxSize * 0.1); // At least 10% of cache

    // Sort by priority and timestamp for eviction
    const sortedItems = Array.from(this.metadata.entries()).sort(
      ([, a], [, b]) => {
        const priorityOrder = {LOW: 1, NORMAL: 2, HIGH: 3, CRITICAL: 4};
        const aPriority =
          priorityOrder[a.priority as keyof typeof priorityOrder];
        const bPriority =
          priorityOrder[b.priority as keyof typeof priorityOrder];

        if (aPriority !== bPriority) {
          return aPriority - bPriority; // Lower priority first
        }
        return a.timestamp - b.timestamp; // Older first
      },
    );

    let freedSize = 0;
    for (const [key, meta] of sortedItems) {
      if (meta.priority === 'CRITICAL') {continue;} // Never evict critical

      itemsToEvict.push(key);
      freedSize += meta.size;

      if (freedSize >= sizeToFree) {break;}
    }

    // Evict items
    for (const key of itemsToEvict) {
      await this.delete(key);
    }

    console.log(
      `🧠 L2 Cache evicted ${itemsToEvict.length} items (${freedSize} bytes)`,
    );
  }

  private async loadMetadata(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.metaKey);
      if (stored) {
        const meta = JSON.parse(stored);
        this.metadata = new Map(meta);
      }
    } catch (error) {
      console.error('🧠 L2 Cache metadata load error:', error);
    }
  }

  private async saveMetadata(): Promise<void> {
    try {
      const meta = Array.from(this.metadata.entries());
      await AsyncStorage.setItem(this.metaKey, JSON.stringify(meta));
    } catch (error) {
      console.error('🧠 L2 Cache metadata save error:', error);
    }
  }

  private estimateSize(data: any): number {
    return JSON.stringify(data).length * 2; // UTF-16 estimation
  }

  getStats() {
    const hitRate =
      this.hits + this.misses > 0 ? this.hits / (this.hits + this.misses) : 0;
    const storageUsage = Array.from(this.metadata.values()).reduce(
      (total, meta) => total + meta.size,
      0,
    );

    return {
      size: storageUsage,
      maxSize: this.maxSize,
      hitRate,
      items: this.metadata.size,
      storageUsage,
    };
  }
}

// ================================
// L3 CACHE - DATABASE (SQLite/WatermelonDB)
// ================================

class DatabaseCache {
  private hits = 0;
  private misses = 0;

  async get(key: string): Promise<any | null> {
    // Cette méthode sera implémentée avec WatermelonDB
    // Pour l'instant, simulation
    this.misses++;
    return null;
  }

  async set(key: string, data: any): Promise<boolean> {
    // Cette méthode sera implémentée avec WatermelonDB
    // Pour l'instant, simulation
    return true;
  }

  async delete(key: string): Promise<boolean> {
    // Cette méthode sera implémentée avec WatermelonDB
    return true;
  }

  async clear(): Promise<void> {
    // Cette méthode sera implémentée avec WatermelonDB
    this.hits = 0;
    this.misses = 0;
  }

  getStats() {
    const hitRate =
      this.hits + this.misses > 0 ? this.hits / (this.hits + this.misses) : 0;

    return {
      hitRate,
      items: 0, // À implémenter
      databaseSize: 0, // À implémenter
    };
  }
}

// ================================
// MAIN SMART CACHE SERVICE
// ================================

class SmartCacheService {
  private l1Cache: MemoryCache;
  private l2Cache: AsyncStorageCache;
  private l3Cache: DatabaseCache;

  private config: CacheConfig = {
    l1MaxSize: 50, // 50MB memory cache
    l2MaxSize: 200, // 200MB AsyncStorage cache
    l1MaxItems: 1000,
    l2MaxItems: 5000,
    defaultTTL: 30 * 60 * 1000, // 30 minutes
    evictionPolicy: 'ADAPTIVE',
    compressionEnabled: false,
    predictiveLoading: true,
  };

  // Performance tracking
  private accessTimes: number[] = [];
  private readonly MAX_ACCESS_TIME_SAMPLES = 100;

  constructor(config?: Partial<CacheConfig>) {
    if (config) {
      this.config = {...this.config, ...config};
    }

    this.l1Cache = new MemoryCache(
      this.config.l1MaxSize,
      this.config.l1MaxItems,
    );
    this.l2Cache = new AsyncStorageCache(
      this.config.l2MaxSize,
      this.config.l2MaxItems,
    );
    this.l3Cache = new DatabaseCache();

    console.log('🧠 Smart Cache Service initialized with 3-tier architecture');
  }

  /**
   * 📖 Get item from cache (L1 → L2 → L3)
   */
  async get<T = any>(key: string): Promise<T | null> {
    const startTime = performance.now();

    try {
      // L1 Cache (Memory) - Fastest
      let item = this.l1Cache.get(key);
      if (item) {
        this.recordAccessTime(performance.now() - startTime);
        console.log(`🧠 Cache HIT L1: ${key}`);
        return item.data as T;
      }

      // L2 Cache (AsyncStorage) - Medium speed
      item = await this.l2Cache.get(key);
      if (item) {
        // Promote to L1
        this.l1Cache.set(key, item.data, item.priority);
        this.recordAccessTime(performance.now() - startTime);
        console.log(`🧠 Cache HIT L2: ${key} (promoted to L1)`);
        return item.data as T;
      }

      // L3 Cache (Database) - Slowest but persistent
      const data = await this.l3Cache.get(key);
      if (data) {
        // Promote to L1 and L2
        this.l1Cache.set(key, data, 'NORMAL');
        await this.l2Cache.set(key, data, 'NORMAL');
        this.recordAccessTime(performance.now() - startTime);
        console.log(`🧠 Cache HIT L3: ${key} (promoted to L1+L2)`);
        return data as T;
      }

      this.recordAccessTime(performance.now() - startTime);
      console.log(`🧠 Cache MISS: ${key}`);
      return null;
    } catch (error) {
      console.error(`🧠 Cache GET error for ${key}:`, error);
      this.recordAccessTime(performance.now() - startTime);
      return null;
    }
  }

  /**
   * 💾 Set item in cache (all levels)
   */
  async set(
    key: string,
    data: any,
    options?: {
      priority?: CacheItem['priority'];
      ttl?: number;
      l1Only?: boolean;
      l2Only?: boolean;
    },
  ): Promise<boolean> {
    const priority = options?.priority || 'NORMAL';
    const ttl = options?.ttl || this.config.defaultTTL;

    try {
      let success = true;

      // Set in L1 (unless l2Only specified)
      if (!options?.l2Only) {
        const l1Success = this.l1Cache.set(key, data, priority, ttl);
        success = success && l1Success;
      }

      // Set in L2 (unless l1Only specified)
      if (!options?.l1Only) {
        const l2Success = await this.l2Cache.set(key, data, priority, ttl);
        success = success && l2Success;
      }

      // Set in L3 for persistent data
      if (priority === 'HIGH' || priority === 'CRITICAL') {
        await this.l3Cache.set(key, data);
      }

      console.log(
        `🧠 Cache SET: ${key} (priority: ${priority}, success: ${success})`,
      );
      return success;
    } catch (error) {
      console.error(`🧠 Cache SET error for ${key}:`, error);
      return false;
    }
  }

  /**
   * 🗑️ Delete item from all cache levels
   */
  async delete(key: string): Promise<boolean> {
    try {
      const l1Success = this.l1Cache.delete(key);
      const l2Success = await this.l2Cache.delete(key);
      const l3Success = await this.l3Cache.delete(key);

      console.log(`🧠 Cache DELETE: ${key}`);
      return l1Success || l2Success || l3Success;
    } catch (error) {
      console.error(`🧠 Cache DELETE error for ${key}:`, error);
      return false;
    }
  }

  /**
   * 🧹 Clear all cache levels
   */
  async clear(): Promise<void> {
    try {
      this.l1Cache.clear();
      await this.l2Cache.clear();
      await this.l3Cache.clear();
      this.accessTimes = [];

      console.log('🧠 Smart Cache completely cleared');
    } catch (error) {
      console.error('🧠 Cache CLEAR error:', error);
    }
  }

  /**
   * 📊 Get comprehensive cache statistics
   */
  getStats(): CacheStats {
    const l1Stats = this.l1Cache.getStats();
    const l2Stats = this.l2Cache.getStats();
    const l3Stats = this.l3Cache.getStats();

    const totalHits = l1Stats.hitRate + l2Stats.hitRate + l3Stats.hitRate;
    const overallHitRate = totalHits / 3; // Average of all levels
    const avgAccessTime =
      this.accessTimes.length > 0
        ? this.accessTimes.reduce((a, b) => a + b, 0) / this.accessTimes.length
        : 0;

    return {
      l1: l1Stats,
      l2: l2Stats,
      l3: l3Stats,
      overall: {
        hitRate: overallHitRate,
        totalItems: l1Stats.items + l2Stats.items + l3Stats.items,
        totalSize: l1Stats.size + l2Stats.size + l3Stats.databaseSize,
        avgAccessTime,
      }
    };
  }

  /**
   * ⚙️ Update cache configuration
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = {...this.config, ...newConfig};
    console.log('🧠 Cache configuration updated:', newConfig);
  }

  /**
   * 🔍 Predictive loading based on usage patterns
   */
  async preloadRelatedData(
    baseKey: string,
    relatedKeys: string[],
  ): Promise<void> {
    if (!this.config.predictiveLoading) {return;}

    console.log(
      `🧠 Predictive loading for ${baseKey}: ${relatedKeys.length} related items`,
    );

    // Load related data in background with low priority
    for (const key of relatedKeys) {
      // Don't block - fire and forget
      this.get(key).catch(error => {
        console.warn(`🧠 Predictive load failed for ${key}:`, error);
      });
    }
  }

  private recordAccessTime(time: number): void {
    this.accessTimes.push(time);

    if (this.accessTimes.length > this.MAX_ACCESS_TIME_SAMPLES) {
      this.accessTimes.shift(); // Remove oldest
    }
  }
}

export default new SmartCacheService();
