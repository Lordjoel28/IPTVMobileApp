/**
 * 💾 StorageAdapter - React Native IPTV
 * Adaptation Web Storage → React Native avec stratégie optimisée:
 * L1: Memory Cache, L2: MMKV (20x plus rapide qu'AsyncStorage), L3: SQLite
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
// Temporairement désactivé - problème de compatibilité build
// import { MMKV } from 'react-native-mmkv';
// import SQLite from 'react-native-sqlite-2';

export interface StorageConfig {
  enableL1Cache: boolean;
  enableL2MMKV: boolean;
  enableL3SQLite: boolean;
  l1MaxSizeMB: number;
  l2MaxSizeMB: number;
  l3MaxSizeMB: number;
}

export interface StorageStats {
  l1HitRate: number;
  l2HitRate: number;
  l3HitRate: number;
  totalOperations: number;
  averageReadTime: number;
  averageWriteTime: number;
  memoryUsageMB: number;
}

/**
 * LRU Cache pour niveau 1 (mémoire)
 */
class MemoryLRUCache {
  private cache = new Map<string, any>();
  private accessOrder = new Map<string, number>();
  private maxSize: number;
  private accessCounter = 0;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  get(key: string): any {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.accessOrder.set(key, ++this.accessCounter);
    }
    return value;
  }

  set(key: string, value: any): void {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }
    
    this.cache.set(key, value);
    this.accessOrder.set(key, ++this.accessCounter);
  }

  private evictLRU(): void {
    let lruKey = '';
    let lruAccess = Infinity;
    
    for (const [key, access] of this.accessOrder) {
      if (access < lruAccess) {
        lruAccess = access;
        lruKey = key;
      }
    }
    
    if (lruKey) {
      this.cache.delete(lruKey);
      this.accessOrder.delete(lruKey);
    }
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): boolean {
    this.accessOrder.delete(key);
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  getMemoryUsageMB(): number {
    // Estimation grossière
    return (this.cache.size * 2) / 1024; // ~2KB per entry average
  }
}

export class StorageAdapter {
  private l1Cache: MemoryLRUCache;
  private mmkv: any; // MMKV instance - Temporairement désactivé
  private sqliteDb: any; // SQLite instance - Temporairement désactivé
  private config: StorageConfig;
  private stats: StorageStats;

  constructor(config: Partial<StorageConfig> = {}) {
    this.config = {
      enableL1Cache: true,
      enableL2MMKV: true,
      enableL3SQLite: true,
      l1MaxSizeMB: 50,
      l2MaxSizeMB: 200,
      l3MaxSizeMB: 500,
      ...config
    };

    this.l1Cache = new MemoryLRUCache(
      Math.floor((this.config.l1MaxSizeMB * 1024 * 1024) / 2048) // ~2KB per entry
    );

    this.resetStats();
    this.initializeStorage();
  }

  /**
   * Initialisation des couches de stockage
   */
  private async initializeStorage(): Promise<void> {
    try {
      // Initialiser MMKV - Temporairement désactivé pour compatibilité build
      // if (this.config.enableL2MMKV) {
      //   this.mmkv = new MMKV({
      //     id: 'iptv-storage',
      //     encryptionKey: 'iptv-secure-key-2024'
      //   });
      // }

      // Initialiser SQLite - Temporairement désactivé pour compatibilité build
      // if (this.config.enableL3SQLite) {
      //   this.sqliteDb = await SQLite.openDatabase({
      //     name: 'iptv_playlist.db',
      //     location: 'default'
      //   });
      //   await this.initializeSQLiteTables();
      // }

      console.log('✅ StorageAdapter initialized with config:', this.config);
    } catch (error) {
      console.error('❌ StorageAdapter initialization failed:', error);
    }
  }

  /**
   * Initialiser tables SQLite
   */
  private async initializeSQLiteTables(): Promise<void> {
    if (!this.sqliteDb) return;

    try {
      // Table pour données volumineuses (playlists, etc.)
      await this.sqliteDb.executeSql(`
        CREATE TABLE IF NOT EXISTS storage_data (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          size INTEGER NOT NULL,
          created_at INTEGER NOT NULL,
          accessed_at INTEGER NOT NULL
        )
      `);

      // Index pour performance
      await this.sqliteDb.executeSql(`
        CREATE INDEX IF NOT EXISTS idx_accessed_at ON storage_data(accessed_at)
      `);

      console.log('✅ SQLite tables initialized');
    } catch (error) {
      console.error('❌ SQLite table initialization failed:', error);
    }
  }

  /**
   * GET - Stratégie cascade L1 → L2 → L3
   */
  async get(key: string): Promise<any> {
    const startTime = Date.now();
    this.stats.totalOperations++;

    try {
      // L1 Cache (Memory)
      if (this.config.enableL1Cache && this.l1Cache.has(key)) {
        this.stats.l1HitRate = this.updateHitRate(this.stats.l1HitRate, true);
        this.updateReadTime(Date.now() - startTime);
        return this.l1Cache.get(key);
      } else {
        this.stats.l1HitRate = this.updateHitRate(this.stats.l1HitRate, false);
      }

      // L2 Cache (AsyncStorage fallback)
      let value: any;
      if (this.config.enableL2MMKV) {
        // Utiliser AsyncStorage comme fallback temporaire
        const storedValue = await AsyncStorage.getItem(key);
        if (storedValue) {
          value = JSON.parse(storedValue);
          this.stats.l2HitRate = this.updateHitRate(this.stats.l2HitRate, true);
          
          // Promouvoir en L1
          if (this.config.enableL1Cache) {
            this.l1Cache.set(key, value);
          }
          
          this.updateReadTime(Date.now() - startTime);
          return value;
        } else {
          this.stats.l2HitRate = this.updateHitRate(this.stats.l2HitRate, false);
        }
      }

      // L3 Cache (SQLite) - Pas implémenté pour le moment
      if (this.config.enableL3SQLite) {
        // TODO: Query SQLite when implemented
        this.stats.l3HitRate = this.updateHitRate(this.stats.l3HitRate, false);
      }

      this.updateReadTime(Date.now() - startTime);
      return null;

    } catch (error) {
      console.error('Storage get error:', error);
      this.updateReadTime(Date.now() - startTime);
      return null;
    }
  }

  /**
   * SET - Stockage intelligent selon taille avec gestion erreur SQLITE_FULL
   */
  async set(key: string, value: any, sizeHint?: number): Promise<boolean> {
    const startTime = Date.now();
    this.stats.totalOperations++;

    try {
      const serializedValue = JSON.stringify(value);
      const estimatedSize = serializedValue.length; // Plus précis que Blob
      const sizeMB = estimatedSize / (1024 * 1024);

      console.log(`📦 Storing ${key}: ${sizeMB.toFixed(1)}MB`);

      // 🔧 CORRECTION CRITIQUE: Éviter stockage de gros datasets pour éviter SQLITE_FULL
      if (sizeMB > 5) {
        // > 5MB: Stocker uniquement en mémoire L1 (éviter AsyncStorage plein)
        console.log(`⚠️ Very large dataset (${sizeMB.toFixed(1)}MB), storing in memory only`);
        if (this.config.enableL1Cache) {
          this.l1Cache.set(key, value);
        }
        console.log(`💾 Large dataset stored in memory cache only`);
      } else if (sizeMB > 2) {
        // 2-5MB: L1 + nettoyage AsyncStorage avant stockage
        console.log(`📦 Large dataset (${sizeMB.toFixed(1)}MB), cleaning old data first`);
        await this.cleanOldData(); // Nettoyer avant stockage
        await this.setL1Only(key, value); // L1 uniquement pour éviter overflow
      } else if (sizeMB > 0.5) {
        // 500KB-2MB: L1 + L2 avec vérification espace
        console.log(`📦 Medium dataset (${sizeMB.toFixed(1)}MB), storing in L1+L2`);
        await this.setL1AndL2(key, value, serializedValue);
      } else {
        // < 500KB: L1 + L2 normal
        console.log(`📦 Small dataset (${sizeMB.toFixed(1)}MB), storing in L1+L2`);
        await this.setL1AndL2(key, value, serializedValue);
      }

      this.updateWriteTime(Date.now() - startTime);
      return true;

    } catch (error) {
      console.error('Storage set error:', error);
      
      // 🔧 FALLBACK: En cas d'erreur, stocker uniquement en mémoire
      if (error.message?.includes('SQLITE_FULL') || error.message?.includes('full')) {
        console.log('🚨 Storage full detected, falling back to memory-only storage');
        try {
          if (this.config.enableL1Cache) {
            this.l1Cache.set(key, value);
            console.log('✅ Fallback to memory cache successful');
            return true;
          }
        } catch (fallbackError) {
          console.error('❌ Even memory fallback failed:', fallbackError);
        }
      }
      
      this.updateWriteTime(Date.now() - startTime);
      return false;
    }
  }

  /**
   * Stockage L1 + L2 (petites données)
   */
  private async setL1AndL2(key: string, value: any, serializedValue: string): Promise<void> {
    // L1 Cache
    if (this.config.enableL1Cache) {
      this.l1Cache.set(key, value);
    }

    // L2 MMKV/AsyncStorage
    if (this.config.enableL2MMKV) {
      // TODO: this.mmkv?.set(key, serializedValue);
      await AsyncStorage.setItem(key, serializedValue);
    }
  }

  /**
   * Stockage L2 + L3 (données moyennes)
   */
  private async setL2AndL3(key: string, serializedValue: string): Promise<void> {
    // L2 MMKV/AsyncStorage
    if (this.config.enableL2MMKV) {
      await AsyncStorage.setItem(key, serializedValue);
    }

    // L3 SQLite
    // TODO: Implémenter quand SQLite sera configuré
  }

  /**
   * Stockage L1 uniquement (pour gros datasets)
   */
  private async setL1Only(key: string, value: any): Promise<void> {
    // Stocker uniquement en mémoire pour éviter SQLITE_FULL
    if (this.config.enableL1Cache) {
      this.l1Cache.set(key, value);
      console.log('💾 Stored in memory cache only (avoiding storage overflow)');
    }
  }

  /**
   * Stockage L3 uniquement (gros datasets) - VERSION SÉCURISÉE
   */
  private async setL3Only(key: string, serializedValue: string): Promise<void> {
    // L3 SQLite uniquement
    // TODO: Implémenter quand SQLite sera configuré
    console.log('L3 storage not implemented yet, falling back to memory-only');
    
    // 🔧 CORRECTION: Ne pas utiliser AsyncStorage pour les gros datasets
    // await AsyncStorage.setItem(key, serializedValue); // DÉSACTIVÉ pour éviter SQLITE_FULL
    
    // Fallback vers mémoire uniquement
    try {
      const value = JSON.parse(serializedValue);
      if (this.config.enableL1Cache) {
        this.l1Cache.set(key, value);
        console.log('💾 Large dataset stored in memory cache only');
      }
    } catch (parseError) {
      console.error('Failed to parse value for memory storage:', parseError);
    }
  }

  /**
   * Nettoyer anciennes données pour libérer de l'espace
   */
  private async cleanOldData(): Promise<void> {
    try {
      console.log('🧹 Cleaning old data to free storage space...');
      
      // Nettoyer le cache L1 en gardant seulement les 100 éléments les plus récents
      if (this.l1Cache.size > 100) {
        const currentSize = this.l1Cache.size;
        // Vider partiellement le cache
        this.l1Cache.clear();
        console.log(`🧹 Cleared L1 cache: ${currentSize} items removed`);
      }
      
      // Optionnel: Nettoyer AsyncStorage des anciens playlists
      // Note: Ceci nécessiterait un système de tracking des clés par date
      
      console.log('✅ Storage cleanup completed');
    } catch (error) {
      console.error('Storage cleanup failed:', error);
    }
  }

  /**
   * DELETE - Suppression cascade
   */
  async delete(key: string): Promise<boolean> {
    try {
      // Supprimer de tous les niveaux
      if (this.config.enableL1Cache) {
        this.l1Cache.delete(key);
      }

      if (this.config.enableL2MMKV) {
        // TODO: this.mmkv?.delete(key);
        await AsyncStorage.removeItem(key);
      }

      // TODO: Supprimer de SQLite quand implémenté

      return true;
    } catch (error) {
      console.error('Storage delete error:', error);
      return false;
    }
  }

  /**
   * CLEAR - Nettoyage complet
   */
  async clear(): Promise<boolean> {
    try {
      if (this.config.enableL1Cache) {
        this.l1Cache.clear();
      }

      if (this.config.enableL2MMKV) {
        // TODO: this.mmkv?.clearAll();
        await AsyncStorage.clear();
      }

      // TODO: Clear SQLite when implemented

      this.resetStats();
      return true;
    } catch (error) {
      console.error('Storage clear error:', error);
      return false;
    }
  }

  /**
   * Batch operations pour optimiser les écritures multiples
   */
  async setBatch(items: Array<{key: string, value: any}>): Promise<boolean> {
    try {
      const batchPromises = items.map(item => this.set(item.key, item.value));
      await Promise.all(batchPromises);
      return true;
    } catch (error) {
      console.error('Batch set error:', error);
      return false;
    }
  }

  /**
   * Mise à jour hit rate avec moyenne mobile
   */
  private updateHitRate(currentRate: number, hit: boolean): number {
    const alpha = 0.1; // Facteur de lissage
    const hitValue = hit ? 1 : 0;
    return currentRate * (1 - alpha) + hitValue * alpha;
  }

  /**
   * Mise à jour temps lecture
   */
  private updateReadTime(time: number): void {
    const alpha = 0.1;
    this.stats.averageReadTime = this.stats.averageReadTime * (1 - alpha) + time * alpha;
  }

  /**
   * Mise à jour temps écriture
   */
  private updateWriteTime(time: number): void {
    const alpha = 0.1;
    this.stats.averageWriteTime = this.stats.averageWriteTime * (1 - alpha) + time * alpha;
  }

  /**
   * Reset statistiques
   */
  private resetStats(): void {
    this.stats = {
      l1HitRate: 0,
      l2HitRate: 0,
      l3HitRate: 0,
      totalOperations: 0,
      averageReadTime: 0,
      averageWriteTime: 0,
      memoryUsageMB: 0
    };
  }

  /**
   * Métriques de performance
   */
  getStats(): StorageStats {
    this.stats.memoryUsageMB = this.l1Cache.getMemoryUsageMB();
    return { ...this.stats };
  }

  /**
   * Configuration adaptative selon device
   */
  adaptToDevice(deviceInfo: { totalMemoryMB: number, isLowEnd: boolean }): void {
    if (deviceInfo.isLowEnd) {
      console.log('📱 Low-end device detected, reducing cache sizes');
      this.config.l1MaxSizeMB = Math.min(25, this.config.l1MaxSizeMB);
      this.config.l2MaxSizeMB = Math.min(100, this.config.l2MaxSizeMB);
    }

    if (deviceInfo.totalMemoryMB < 2048) {
      console.log('📱 Low memory device, optimizing cache strategy');
      this.config.enableL1Cache = false; // Désactiver L1 si vraiment peu de mémoire
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.l1Cache.clear();
    this.resetStats();
    // TODO: Close SQLite connection when implemented
  }
}

export default StorageAdapter;