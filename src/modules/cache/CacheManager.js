/**
 * 🚀 CACHE MANAGER MULTI-NIVEAUX - REACT NATIVE
 * Système de cache L1 (mémoire) + L2 (AsyncStorage) + L3 (SQLite)
 * Optimisé pour les gros catalogues IPTV (25k+ chaînes)
 * 
 * Adaptation de votre CacheManager original pour React Native
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';

export class CacheManager {
    constructor(options = {}) {
        this.options = {
            // Configuration L1 (mémoire)
            l1MaxSize: options.l1MaxSize || 100, // 100 entrées max
            l1MaxMemory: options.l1MaxMemory || 50 * 1024 * 1024, // 50MB max
            
            // Configuration L2 (AsyncStorage)
            l2MaxSize: options.l2MaxSize || 20, // 20 entrées max  
            l2MaxMemory: options.l2MaxMemory || 10 * 1024 * 1024, // 10MB max
            
            // Configuration L3 (Fichiers)
            l3MaxSize: options.l3MaxSize || 100, // 100 entrées max
            l3MaxMemory: options.l3MaxMemory || 100 * 1024 * 1024, // 100MB max
            
            // TTL par type de données (IDENTIQUE à votre version)
            ttl: {
                playlist: options.ttl?.playlist || 24 * 60 * 60 * 1000, // 24h
                channels: options.ttl?.channels || 6 * 60 * 60 * 1000, // 6h
                logos: options.ttl?.logos || 7 * 24 * 60 * 60 * 1000, // 7j
                search: options.ttl?.search || 30 * 60 * 1000, // 30min
                metadata: options.ttl?.metadata || 60 * 60 * 1000 // 1h
            },
            
            // Préchargement (IDENTIQUE)
            preloadEnabled: options.preloadEnabled !== false,
            preloadBatchSize: options.preloadBatchSize || 1000,
            preloadDelay: options.preloadDelay || 100,
            
            // Compression (IDENTIQUE)
            compressionEnabled: options.compressionEnabled !== false,
            compressionThreshold: options.compressionThreshold || 1024 // 1KB
        };
        
        // Cache L1 (mémoire) - IDENTIQUE à votre version
        this.l1Cache = new Map();
        this.l1Usage = new Map(); // Suivi d'utilisation pour LRU
        this.l1Size = 0; // Taille approximative en bytes
        
        // Statistiques (IDENTIQUES)
        this.stats = {
            l1Hits: 0,
            l1Misses: 0,
            l2Hits: 0,
            l2Misses: 0,
            l3Hits: 0,
            l3Misses: 0,
            totalGets: 0,
            totalSets: 0,
            memoryUsage: 0,
            compressionRatio: 0
        };
        
        // Cache path pour React Native
        this.cachePath = `${RNFS.CachesDirectoryPath}/iptv-cache/`;
        this._ensureCacheDirectory();
        
        console.log('🚀 CacheManager React Native initialisé');
        console.log('📊 Configuration:', this.options);
    }
    
    async _ensureCacheDirectory() {
        try {
            const exists = await RNFS.exists(this.cachePath);
            if (!exists) {
                await RNFS.mkdir(this.cachePath);
                console.log('📁 Répertoire cache créé:', this.cachePath);
            }
        } catch (error) {
            console.error('❌ Erreur création répertoire cache:', error);
        }
    }
    
    // ========================================
    // MÉTHODES PRINCIPALES (LOGIQUE IDENTIQUE)
    // ========================================
    
    /**
     * Récupérer une valeur du cache (L1 → L2 → L3)
     * LOGIQUE IDENTIQUE à votre version originale
     */
    async get(key, type = 'default') {
        this.stats.totalGets++;
        
        try {
            // L1 Cache (mémoire) - IDENTIQUE
            const l1Result = this._getFromL1(key, type);
            if (l1Result !== null) {
                this.stats.l1Hits++;
                console.log(`🟢 L1 HIT: ${key}`);
                return l1Result;
            }
            this.stats.l1Misses++;
            
            // L2 Cache (AsyncStorage) - Adapté pour React Native
            const l2Result = await this._getFromL2(key, type);
            if (l2Result !== null) {
                this.stats.l2Hits++;
                console.log(`🟡 L2 HIT: ${key}`);
                // Promouvoir vers L1
                this._setToL1(key, l2Result, type);
                return l2Result;
            }
            this.stats.l2Misses++;
            
            // L3 Cache (Fichiers) - Adapté pour React Native
            const l3Result = await this._getFromL3(key, type);
            if (l3Result !== null) {
                this.stats.l3Hits++;
                console.log(`🔵 L3 HIT: ${key}`);
                // Promouvoir vers L2 et L1
                await this._setToL2(key, l3Result, type);
                this._setToL1(key, l3Result, type);
                return l3Result;
            }
            this.stats.l3Misses++;
            
            console.log(`❌ CACHE MISS: ${key}`);
            return null;
            
        } catch (error) {
            console.error(`❌ Erreur cache get(${key}):`, error);
            return null;
        }
    }
    
    /**
     * Stocker une valeur dans le cache
     * LOGIQUE IDENTIQUE à votre version originale
     */
    async set(key, value, type = 'default', options = {}) {
        this.stats.totalSets++;
        
        try {
            const now = Date.now();
            const ttl = options.ttl || this.options.ttl[type] || this.options.ttl.default;
            
            const cacheEntry = {
                value,
                timestamp: now,
                expiry: now + ttl,
                type,
                size: this._calculateSize(value)
            };
            
            // Stocker dans tous les niveaux
            this._setToL1(key, cacheEntry, type);
            await this._setToL2(key, cacheEntry, type);
            await this._setToL3(key, cacheEntry, type);
            
            console.log(`✅ Cache SET: ${key} (${cacheEntry.size} bytes)`);
            
        } catch (error) {
            console.error(`❌ Erreur cache set(${key}):`, error);
        }
    }
    
    // ========================================
    // CACHE L1 (MÉMOIRE) - IDENTIQUE
    // ========================================
    
    _getFromL1(key, type) {
        const entry = this.l1Cache.get(key);
        if (!entry) return null;
        
        // Vérifier expiration
        if (Date.now() > entry.expiry) {
            this.l1Cache.delete(key);
            this.l1Usage.delete(key);
            return null;
        }
        
        // Mettre à jour LRU
        this.l1Usage.set(key, Date.now());
        return entry.value;
    }
    
    _setToL1(key, entry, type) {
        // Vérifier limites
        if (this.l1Cache.size >= this.options.l1MaxSize || 
            this.l1Size + entry.size > this.options.l1MaxMemory) {
            this._evictFromL1();
        }
        
        this.l1Cache.set(key, entry);
        this.l1Usage.set(key, Date.now());
        this.l1Size += entry.size;
    }
    
    _evictFromL1() {
        // LRU eviction - IDENTIQUE à votre version
        let oldestKey = null;
        let oldestTime = Date.now();
        
        for (const [key, time] of this.l1Usage) {
            if (time < oldestTime) {
                oldestTime = time;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            const entry = this.l1Cache.get(oldestKey);
            this.l1Cache.delete(oldestKey);
            this.l1Usage.delete(oldestKey);
            if (entry) this.l1Size -= entry.size;
            console.log(`🗑️ L1 éviction: ${oldestKey}`);
        }
    }
    
    // ========================================
    // CACHE L2 (ASYNCSTORAGE) - ADAPTÉ REACT NATIVE
    // ========================================
    
    async _getFromL2(key, type) {
        try {
            const stored = await AsyncStorage.getItem(`iptv-cache:${key}`);
            if (!stored) return null;
            
            const entry = JSON.parse(stored);
            
            // Vérifier expiration
            if (Date.now() > entry.expiry) {
                await AsyncStorage.removeItem(`iptv-cache:${key}`);
                return null;
            }
            
            return entry;
            
        } catch (error) {
            console.error(`❌ Erreur L2 get(${key}):`, error);
            return null;
        }
    }
    
    async _setToL2(key, entry, type) {
        try {
            // Compression si nécessaire (LOGIQUE IDENTIQUE)
            let dataToStore = entry;
            if (this.options.compressionEnabled && 
                entry.size > this.options.compressionThreshold) {
                // Ici vous pourriez ajouter une compression
                // Pour l'instant, on stocke tel quel
            }
            
            await AsyncStorage.setItem(`iptv-cache:${key}`, JSON.stringify(dataToStore));
            
        } catch (error) {
            console.error(`❌ Erreur L2 set(${key}):`, error);
        }
    }
    
    // ========================================
    // CACHE L3 (FICHIERS) - ADAPTÉ REACT NATIVE
    // ========================================
    
    async _getFromL3(key, type) {
        try {
            const filePath = `${this.cachePath}${key}.json`;
            const exists = await RNFS.exists(filePath);
            if (!exists) return null;
            
            const content = await RNFS.readFile(filePath, 'utf8');
            const entry = JSON.parse(content);
            
            // Vérifier expiration
            if (Date.now() > entry.expiry) {
                await RNFS.unlink(filePath);
                return null;
            }
            
            return entry;
            
        } catch (error) {
            console.error(`❌ Erreur L3 get(${key}):`, error);
            return null;
        }
    }
    
    async _setToL3(key, entry, type) {
        try {
            const filePath = `${this.cachePath}${key}.json`;
            await RNFS.writeFile(filePath, JSON.stringify(entry), 'utf8');
            
        } catch (error) {
            console.error(`❌ Erreur L3 set(${key}):`, error);
        }
    }
    
    // ========================================
    // MÉTHODES UTILITAIRES (IDENTIQUES)
    // ========================================
    
    _calculateSize(value) {
        try {
            return JSON.stringify(value).length * 2; // Approximation UTF-16
        } catch {
            return 1024; // Fallback 1KB
        }
    }
    
    /**
     * Précharger des données de chaînes
     * LOGIQUE IDENTIQUE à votre version
     */
    async preloadChannelData(channels) {
        if (!this.options.preloadEnabled || !channels?.length) return;
        
        console.log(`🔄 Préchargement de ${channels.length} chaînes...`);
        
        const batchSize = this.options.preloadBatchSize;
        for (let i = 0; i < channels.length; i += batchSize) {
            const batch = channels.slice(i, i + batchSize);
            
            await Promise.all(batch.map(async (channel) => {
                if (channel.logo) {
                    await this.set(`logo:${channel.id}`, channel.logo, 'logos');
                }
                await this.set(`channel:${channel.id}`, channel, 'channels');
            }));
            
            // Délai entre les batches
            if (i + batchSize < channels.length) {
                await new Promise(resolve => setTimeout(resolve, this.options.preloadDelay));
            }
        }
        
        console.log(`✅ Préchargement terminé`);
    }
    
    /**
     * Obtenir les statistiques du cache
     * IDENTIQUE à votre version
     */
    getStats() {
        const l1HitRate = this.stats.l1Hits / (this.stats.l1Hits + this.stats.l1Misses) * 100 || 0;
        const l2HitRate = this.stats.l2Hits / (this.stats.l2Hits + this.stats.l2Misses) * 100 || 0;
        const l3HitRate = this.stats.l3Hits / (this.stats.l3Hits + this.stats.l3Misses) * 100 || 0;
        const totalHitRate = (this.stats.l1Hits + this.stats.l2Hits + this.stats.l3Hits) / this.stats.totalGets * 100 || 0;
        
        return {
            ...this.stats,
            l1HitRate: l1HitRate.toFixed(1),
            l2HitRate: l2HitRate.toFixed(1),
            l3HitRate: l3HitRate.toFixed(1),
            totalHitRate: totalHitRate.toFixed(1),
            l1Size: this.l1Cache.size,
            memoryUsage: this.l1Size
        };
    }
    
    /**
     * Nettoyer le cache
     */
    async clear(type = null) {
        try {
            // Nettoyer L1
            if (type) {
                for (const [key, entry] of this.l1Cache) {
                    if (entry.type === type) {
                        this.l1Cache.delete(key);
                        this.l1Usage.delete(key);
                    }
                }
            } else {
                this.l1Cache.clear();
                this.l1Usage.clear();
                this.l1Size = 0;
            }
            
            // Nettoyer L2 (AsyncStorage)
            if (!type) {
                const keys = await AsyncStorage.getAllKeys();
                const cacheKeys = keys.filter(key => key.startsWith('iptv-cache:'));
                await AsyncStorage.multiRemove(cacheKeys);
            }
            
            // Nettoyer L3 (Fichiers)
            if (!type) {
                const files = await RNFS.readDir(this.cachePath);
                await Promise.all(files.map(file => RNFS.unlink(file.path)));
            }
            
            console.log(`🧹 Cache nettoyé${type ? ` (type: ${type})` : ''}`);
            
        } catch (error) {
            console.error('❌ Erreur nettoyage cache:', error);
        }
    }
}