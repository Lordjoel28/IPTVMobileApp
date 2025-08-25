/**
 * 💾 CacheService - Migration du CacheManager web
 * Système de cache 3-niveaux: L1(Mémoire) → L2(AsyncStorage) → L3(SQLite)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type CacheLevel = 'L1' | 'L2' | 'L3' | 'all';

export interface CacheEntry<T = any> {
  key: string;
  data: T;
  timestamp: number;
  ttl?: number;
  size?: number;
  accessCount?: number;
  lastAccess?: number;
}

export class CacheService {
  // L1 Cache - Mémoire (LRU Map)
  private L1Cache: Map<string, CacheEntry> = new Map();
  private readonly L1_MAX_SIZE = 100; // 100 entrées max
  private readonly L1_MAX_MEMORY = 50 * 1024 * 1024; // 50MB max
  
  // L2 Cache - AsyncStorage 
  private readonly L2_MAX_SIZE = 20; // 20 entrées max
  private readonly L2_MAX_MEMORY = 10 * 1024 * 1024; // 10MB max
  
  // L3 Cache - SQLite (TODO: implémenter)
  private readonly L3_MAX_SIZE = 100; // 100 entrées max
  private readonly L3_MAX_MEMORY = 100 * 1024 * 1024; // 100MB max

  // Stats et monitoring
  private stats = {
    L1: { hits: 0, misses: 0, sets: 0, evictions: 0 },
    L2: { hits: 0, misses: 0, sets: 0, evictions: 0 },
    L3: { hits: 0, misses: 0, sets: 0, evictions: 0 }
  };

  // 🆕 Singleton pattern instance
  private static instance: CacheService;

  constructor() {
    console.log('💾 CacheService initialized - 3-level cache system');
  }

  // 🆕 Support pour injection de dépendances (DI)
  // Cette méthode permet d'utiliser le service via DI ou singleton legacy
  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  // 🆕 Méthode statique pour compatibilité DI
  // Sera utilisée par le ServiceRegistry
  public static async createFromDI(): Promise<CacheService> {
    try {
      // Pour le moment, retourne une nouvelle instance
      // Plus tard, on pourra injecter des dépendances si nécessaire
      return new CacheService();
    } catch (error) {
      console.error('❌ Failed to create CacheService from DI:', error);
      // Fallback sur l'ancienne méthode
      return CacheService.getInstance();
    }
  }

  /**
   * Récupérer données depuis cache avec cascade L1 → L2 → L3
   */
  async get<T>(key: string, level: CacheLevel = 'all'): Promise<T | null> {
    console.log(`📦 Cache GET: ${key} from ${level}`);

    // L1 - Mémoire
    if (level === 'all' || level === 'L1') {
      const entry = this.getFromL1<T>(key);
      if (entry) {
        this.stats.L1.hits++;
        console.log(`✅ L1 HIT: ${key}`);
        return entry;
      }
      this.stats.L1.misses++;
    }

    // L2 - AsyncStorage
    if (level === 'all' || level === 'L2') {
      const entry = await this.getFromL2<T>(key);
      if (entry) {
        this.stats.L2.hits++;
        console.log(`✅ L2 HIT: ${key}`);
        
        // Promotion vers L1 si petit
        if (this.estimateSize(entry) <= 1024 * 1024) { // 1MB
          await this.setToL1(key, entry);
        }
        
        return entry;
      }
      this.stats.L2.misses++;
    }

    // L3 - SQLite (TODO)
    if (level === 'all' || level === 'L3') {
      const entry = await this.getFromL3<T>(key);
      if (entry) {
        this.stats.L3.hits++;
        console.log(`✅ L3 HIT: ${key}`);
        
        // Promotion vers niveaux supérieurs
        await this.promoteFromL3(key, entry);
        
        return entry;
      }
      this.stats.L3.misses++;
    }

    console.log(`❌ CACHE MISS: ${key}`);
    return null;
  }

  /**
   * Stocker données dans cache selon niveau
   */
  async set<T>(key: string, data: T, level: CacheLevel = 'all', ttl?: number): Promise<void> {
    const dataSize = this.estimateSize(data);
    console.log(`💾 Cache SET: ${key} (${dataSize}KB) to ${level}`);

    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: Date.now(),
      ttl,
      size: dataSize,
      accessCount: 1,
      lastAccess: Date.now()
    };

    if (level === 'all' || level === 'L1') {
      await this.setToL1(key, data, entry);
      this.stats.L1.sets++;
    }

    if (level === 'all' || level === 'L2') {
      await this.setToL2(key, data, entry);
      this.stats.L2.sets++;
    }

    if (level === 'all' || level === 'L3') {
      await this.setToL3(key, data, entry);
      this.stats.L3.sets++;
    }
  }

  /**
   * Supprimer du cache
   */
  async remove(key: string, level: CacheLevel = 'all'): Promise<void> {
    console.log(`🗑️ Cache REMOVE: ${key} from ${level}`);

    if (level === 'all' || level === 'L1') {
      this.L1Cache.delete(key);
    }

    if (level === 'all' || level === 'L2') {
      await AsyncStorage.removeItem(`cache_L2_${key}`);
    }

    if (level === 'all' || level === 'L3') {
      // TODO: SQLite remove
    }
  }

  /**
   * L1 Cache - Mémoire avec LRU
   */
  private getFromL1<T>(key: string): T | null {
    const entry = this.L1Cache.get(key);
    if (!entry) return null;

    // Vérifier TTL
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.L1Cache.delete(key);
      return null;
    }

    // Mettre à jour accès pour LRU
    entry.lastAccess = Date.now();
    entry.accessCount = (entry.accessCount || 0) + 1;
    
    // Réorganiser pour LRU (delete + set = move to end)
    this.L1Cache.delete(key);
    this.L1Cache.set(key, entry);

    return entry.data;
  }

  private async setToL1<T>(key: string, data: T, entry?: CacheEntry<T>): Promise<void> {
    const cacheEntry = entry || {
      key,
      data,
      timestamp: Date.now(),
      size: this.estimateSize(data),
      accessCount: 1,
      lastAccess: Date.now()
    };

    // Éviction LRU si nécessaire
    await this.evictL1IfNeeded();

    this.L1Cache.set(key, cacheEntry);
  }

  private async evictL1IfNeeded(): Promise<void> {
    // Éviction par nombre d'entrées
    if (this.L1Cache.size >= this.L1_MAX_SIZE) {
      const oldestKey = this.L1Cache.keys().next().value;
      if (oldestKey) {
        this.L1Cache.delete(oldestKey);
        this.stats.L1.evictions++;
        console.log(`🔄 L1 EVICT: ${oldestKey} (size limit)`);
      }
    }

    // Éviction par mémoire (estimation)
    const totalSize = Array.from(this.L1Cache.values())
      .reduce((sum, entry) => sum + (entry.size || 0), 0);
    
    if (totalSize > this.L1_MAX_MEMORY) {
      // Supprimer les entrées les moins récemment utilisées
      const entries = Array.from(this.L1Cache.entries())
        .sort(([,a], [,b]) => (a.lastAccess || 0) - (b.lastAccess || 0));
      
      const toRemove = Math.ceil(entries.length * 0.2); // Supprimer 20%
      for (let i = 0; i < toRemove; i++) {
        this.L1Cache.delete(entries[i][0]);
        this.stats.L1.evictions++;
      }
      console.log(`🔄 L1 EVICT: ${toRemove} entries (memory limit)`);
    }
  }

  /**
   * L2 Cache - AsyncStorage
   */
  private async getFromL2<T>(key: string): Promise<T | null> {
    try {
      const stored = await AsyncStorage.getItem(`cache_L2_${key}`);
      if (!stored) return null;

      const entry: CacheEntry<T> = JSON.parse(stored);

      // Vérifier TTL
      if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
        await AsyncStorage.removeItem(`cache_L2_${key}`);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.warn(`⚠️ L2 Cache error for ${key}:`, error);
      return null;
    }
  }

  private async setToL2<T>(key: string, data: T, entry?: CacheEntry<T>): Promise<void> {
    try {
      const cacheEntry = entry || {
        key,
        data,
        timestamp: Date.now(),
        size: this.estimateSize(data)
      };

      await AsyncStorage.setItem(`cache_L2_${key}`, JSON.stringify(cacheEntry));
    } catch (error) {
      console.warn(`⚠️ L2 Cache set error for ${key}:`, error);
    }
  }

  /**
   * L3 Cache - SQLite (placeholder)
   */
  private async getFromL3<T>(key: string): Promise<T | null> {
    // TODO: Implémenter SQLite
    return null;
  }

  private async setToL3<T>(key: string, data: T, entry?: CacheEntry<T>): Promise<void> {
    // TODO: Implémenter SQLite
  }

  /**
   * Promotion L3 → L2/L1
   */
  private async promoteFromL3<T>(key: string, data: T): Promise<void> {
    const dataSize = this.estimateSize(data);
    
    // Promouvoir vers L2 si assez petit
    if (dataSize <= this.L2_MAX_MEMORY / 10) {
      await this.setToL2(key, data);
    }
    
    // Promouvoir vers L1 si très petit
    if (dataSize <= this.L1_MAX_MEMORY / 20) {
      await this.setToL1(key, data);
    }
  }

  /**
   * Estimer taille données en bytes
   */
  private estimateSize(data: any): number {
    const jsonStr = JSON.stringify(data);
    return jsonStr.length;
  }

  /**
   * Obtenir statistiques cache
   */
  getStats() {
    const L1Size = this.L1Cache.size;
    const L1Memory = Array.from(this.L1Cache.values())
      .reduce((sum, entry) => sum + (entry.size || 0), 0);

    return {
      L1: {
        ...this.stats.L1,
        entries: L1Size,
        memory: L1Memory,
        hitRate: this.calculateHitRate(this.stats.L1)
      },
      L2: {
        ...this.stats.L2,
        hitRate: this.calculateHitRate(this.stats.L2)
      },
      L3: {
        ...this.stats.L3,
        hitRate: this.calculateHitRate(this.stats.L3)
      }
    };
  }

  private calculateHitRate(stats: { hits: number; misses: number }): number {
    const total = stats.hits + stats.misses;
    return total > 0 ? Math.round((stats.hits / total) * 100) : 0;
  }

  /**
   * Nettoyer tout le cache
   */
  async clearAll(): Promise<void> {
    console.log('🧹 Clearing all cache levels');
    
    // L1
    this.L1Cache.clear();
    
    // L2 - AsyncStorage
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith('cache_L2_'));
    await AsyncStorage.multiRemove(cacheKeys);
    
    // L3 - SQLite (TODO)
    
    // Reset stats
    this.stats = {
      L1: { hits: 0, misses: 0, sets: 0, evictions: 0 },
      L2: { hits: 0, misses: 0, sets: 0, evictions: 0 },
      L3: { hits: 0, misses: 0, sets: 0, evictions: 0 }
    };
  }

  /**
   * Cleanup automatique des données expirées
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cache cleanup - removing expired entries');
    
    // L1 cleanup
    const now = Date.now();
    for (const [key, entry] of this.L1Cache.entries()) {
      if (entry.ttl && now - entry.timestamp > entry.ttl) {
        this.L1Cache.delete(key);
      }
    }
    
    // L2 cleanup (TODO: parcourir AsyncStorage)
    // L3 cleanup (TODO: SQLite)
  }
}

// Export singleton instance
export const cacheService = new CacheService();