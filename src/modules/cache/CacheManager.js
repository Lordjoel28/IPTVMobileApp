/**
 * 🚀 CACHE MANAGER MULTI-NIVEAUX
 * Système de cache L1 (mémoire) + L2 (localStorage) + L3 (IndexedDB)
 * Optimisé pour les gros catalogues IPTV (25k+ chaînes)
 */

import { LocalStorageCache } from './LocalStorageCache.js';
import { IndexedDBCache } from './IndexedDBCache.js';
import { XtreamCacheOptimizer } from './XtreamCacheOptimizer.js';

export class CacheManager {
    constructor(options = {}) {
        this.options = {
            // Configuration L1 (mémoire)
            l1MaxSize: options.l1MaxSize || 100, // 100 entrées max
            l1MaxMemory: options.l1MaxMemory || 50 * 1024 * 1024, // 50MB max
            
            // Configuration L2 (localStorage)
            l2MaxSize: options.l2MaxSize || 20, // 20 entrées max  
            l2MaxMemory: options.l2MaxMemory || 10 * 1024 * 1024, // 10MB max
            
            // Configuration L3 (IndexedDB)
            l3MaxSize: options.l3MaxSize || 100, // 100 entrées max
            l3MaxMemory: options.l3MaxMemory || 100 * 1024 * 1024, // 100MB max
            
            // TTL par type de données
            ttl: {
                playlist: options.ttl?.playlist || 24 * 60 * 60 * 1000, // 24h
                channels: options.ttl?.channels || 6 * 60 * 60 * 1000, // 6h
                logos: options.ttl?.logos || 7 * 24 * 60 * 60 * 1000, // 7j
                search: options.ttl?.search || 30 * 60 * 1000, // 30min
                metadata: options.ttl?.metadata || 60 * 60 * 1000 // 1h
            },
            
            // Préchargement
            preloadEnabled: options.preloadEnabled !== false,
            preloadBatchSize: options.preloadBatchSize || 1000,
            preloadDelay: options.preloadDelay || 100,
            
            // Compression
            compressionEnabled: options.compressionEnabled !== false,
            compressionThreshold: options.compressionThreshold || 1024 // 1KB
        };
        
        // Cache L1 (mémoire) - LRU Map
        this.l1Cache = new Map();
        this.l1Usage = new Map(); // Suivi d'utilisation pour LRU
        this.l1Size = 0; // Taille approximative en bytes
        
        // Cache L2 (localStorage)
        this.l2Cache = new LocalStorageCache(this.options);
        
        // Cache L3 (IndexedDB) 
        this.l3Cache = new IndexedDBCache(this.options);
        
        // Métriques de performance
        this.metrics = {
            hits: { l1: 0, l2: 0, l3: 0 },
            misses: 0,
            writes: { l1: 0, l2: 0, l3: 0 },
            evictions: { l1: 0, l2: 0, l3: 0 },
            compressions: 0,
            decompressions: 0,
            totalRequests: 0,
            averageResponseTime: 0,
            memoryUsage: { l1: 0, l2: 0, l3: 0 }
        };
        
        // Workers pour préchargement
        this.preloadQueue = [];
        this.preloadWorker = null;
        this.isPreloading = false;
        
        // Optimiseur Xtream pour catalogues 25k+
        this.xtreamOptimizer = new XtreamCacheOptimizer(this);
        
        // Nettoyage automatique
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 5 * 60 * 1000); // Nettoyage toutes les 5 minutes
        
        console.log('🚀 CacheManager initialisé:', {
            l1MaxSize: this.options.l1MaxSize,
            l2MaxSize: this.options.l2MaxSize,
            l3MaxSize: this.options.l3MaxSize,
            compression: this.options.compressionEnabled,
            preload: this.options.preloadEnabled
        });
    }
    
    /**
     * Récupère une donnée du cache (L1 → L2 → L3)
     */
    async get(key, type = 'default') {
        const startTime = performance.now();
        this.metrics.totalRequests++;
        
        try {
            // L1 : Mémoire (le plus rapide)
            const l1Result = this.getFromL1(key, type);
            if (l1Result !== null) {
                this.metrics.hits.l1++;
                this.updateMetrics(startTime);
                return l1Result;
            }
            
            // L2 : localStorage
            const l2Result = await this.l2Cache.get(key, type);
            if (l2Result !== null) {
                this.metrics.hits.l2++;
                // Promouvoir vers L1
                this.setToL1(key, l2Result, type);
                this.updateMetrics(startTime);
                return l2Result;
            }
            
            // L3 : IndexedDB
            const l3Result = await this.l3Cache.get(key, type);
            if (l3Result !== null) {
                this.metrics.hits.l3++;
                // Promouvoir vers L1 et L2
                this.setToL1(key, l3Result, type);
                await this.l2Cache.set(key, l3Result, type);
                this.updateMetrics(startTime);
                return l3Result;
            }
            
            // Cache miss
            this.metrics.misses++;
            this.updateMetrics(startTime);
            return null;
            
        } catch (error) {
            console.error('❌ Erreur cache get:', error);
            this.metrics.misses++;
            this.updateMetrics(startTime);
            return null;
        }
    }
    
    /**
     * Stocke une donnée dans le cache (L1 + L2 + L3) avec gestion intelligente
     */
    async set(key, data, type = 'default') {
        try {
            const dataSize = this.estimateSize(data);
            
            // Stocker dans L1 (toujours)
            this.setToL1(key, data, type);
            this.metrics.writes.l1++;
            
            // Stratégie de stockage selon la taille
            if (dataSize > 2 * 1024 * 1024) { // > 2MB
                console.log(`📦 Gros dataset détecté: ${(dataSize/1024/1024).toFixed(2)}MB, stockage L3 uniquement`);
                
                // Stocker uniquement en L3 pour les gros datasets
                const l3Success = await this.l3Cache.set(key, data, type);
                if (l3Success) {
                    this.metrics.writes.l3++;
                }
                
            } else if (dataSize > 500 * 1024) { // > 500KB
                console.log(`📦 Dataset moyen détecté: ${(dataSize/1024).toFixed(1)}KB, stockage L2 + L3`);
                
                // Stocker en L2 et L3 pour les datasets moyens
                const l2Success = await this.l2Cache.set(key, data, type);
                if (l2Success) {
                    this.metrics.writes.l2++;
                } else {
                    console.log('🔄 Échec L2, redirection vers L3');
                }
                
                const l3Success = await this.l3Cache.set(key, data, type);
                if (l3Success) {
                    this.metrics.writes.l3++;
                }
                
            } else {
                // Stocker dans tous les niveaux pour les petits datasets
                this.l2Cache.set(key, data, type).then(success => {
                    if (success) this.metrics.writes.l2++;
                }).catch(error => {
                    console.warn('⚠️ Erreur cache L2:', error);
                });
                
                this.l3Cache.set(key, data, type).then(success => {
                    if (success) this.metrics.writes.l3++;
                }).catch(error => {
                    console.warn('⚠️ Erreur cache L3:', error);
                });
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Erreur cache set:', error);
            return false;
        }
    }
    
    /**
     * Récupère depuis le cache L1 (mémoire)
     */
    getFromL1(key, type) {
        const entry = this.l1Cache.get(key);
        if (!entry) return null;
        
        // Vérifier TTL
        const now = Date.now();
        const ttl = this.options.ttl[type] || this.options.ttl.metadata;
        if (now - entry.timestamp > ttl) {
            this.l1Cache.delete(key);
            this.l1Usage.delete(key);
            return null;
        }
        
        // Mettre à jour l'usage LRU
        this.l1Usage.set(key, now);
        
        return entry.data;
    }
    
    /**
     * Stocke dans le cache L1 (mémoire)
     */
    setToL1(key, data, type) {
        const now = Date.now();
        const dataSize = this.estimateSize(data);
        
        // Vérifier les limites
        if (this.l1Cache.size >= this.options.l1MaxSize || 
            this.l1Size + dataSize > this.options.l1MaxMemory) {
            this.evictFromL1();
        }
        
        const entry = {
            data,
            type,
            timestamp: now,
            size: dataSize
        };
        
        this.l1Cache.set(key, entry);
        this.l1Usage.set(key, now);
        this.l1Size += dataSize;
        
        // Mettre à jour les métriques
        this.metrics.memoryUsage.l1 = this.l1Size;
    }
    
    /**
     * Éviction LRU du cache L1
     */
    evictFromL1() {
        if (this.l1Cache.size === 0) return;
        
        // Trouver l'entrée la moins récemment utilisée
        let oldestKey = null;
        let oldestTime = Infinity;
        
        for (const [key, time] of this.l1Usage.entries()) {
            if (time < oldestTime) {
                oldestTime = time;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            const entry = this.l1Cache.get(oldestKey);
            this.l1Cache.delete(oldestKey);
            this.l1Usage.delete(oldestKey);
            this.l1Size -= entry.size;
            this.metrics.evictions.l1++;
        }
    }
    
    /**
     * Estime la taille d'un objet en bytes
     */
    estimateSize(obj) {
        try {
            return JSON.stringify(obj).length * 2; // Approximation UTF-16
        } catch {
            return 1000; // Fallback
        }
    }
    
    /**
     * Met à jour les métriques de performance
     */
    updateMetrics(startTime) {
        const responseTime = performance.now() - startTime;
        this.metrics.averageResponseTime = 
            (this.metrics.averageResponseTime * 0.9) + (responseTime * 0.1);
    }
    
    /**
     * APIs spécifiques pour l'IPTV
     */
    
    // Cache des listes de chaînes avec optimisation Xtream
    async getCachedChannelList(playlistId, options = {}) {
        // Vérifier si c'est un catalogue Xtream optimisé
        const strategy = await this.get(`${playlistId}_strategy`, 'metadata');
        if (strategy) {
            return await this.xtreamOptimizer.retrieveChannels(playlistId, options);
        }
        
        return await this.get(`channels_${playlistId}`, 'channels');
    }
    
    async cacheChannelList(playlistId, channels, isXtream = false) {
        // Détection automatique des gros catalogues Xtream
        if (isXtream && channels.length > 10000) {
            console.log(`🔥 CATALOGUE XTREAM EXTRÊME: ${channels.length} chaînes`);
            
            // Extraire les catégories
            const categories = [...new Set(channels.map(c => c.group).filter(Boolean))];
            
            // Utiliser l'optimiseur Xtream
            await this.xtreamOptimizer.cacheXtreamCatalog(playlistId, channels, categories);
        } else {
            // Cache standard
            await this.set(`channels_${playlistId}`, channels, 'channels');
        }
        
        // Précharger les métadonnées des chaînes
        if (this.options.preloadEnabled) {
            this.preloadChannelData(channels.slice(0, 1000)); // Limiter le préchargement
        }
    }
    
    // Cache des playlists
    async getCachedPlaylist(playlistId) {
        return await this.get(`playlist_${playlistId}`, 'playlist');
    }
    
    async cachePlaylist(playlistId, playlist) {
        await this.set(`playlist_${playlistId}`, playlist, 'playlist');
    }
    
    // Cache des logos
    async getCachedLogo(logoUrl) {
        return await this.get(`logo_${logoUrl}`, 'logos');
    }
    
    async cacheLogo(logoUrl, logoData) {
        await this.set(`logo_${logoUrl}`, logoData, 'logos');
    }
    
    // Cache des résultats de recherche
    async getCachedSearchResults(query, playlistId) {
        const key = `search_${playlistId}_${query}`;
        return await this.get(key, 'search');
    }
    
    async cacheSearchResults(query, playlistId, results) {
        const key = `search_${playlistId}_${query}`;
        await this.set(key, results, 'search');
    }
    
    /**
     * Préchargement intelligent des données
     */
    preloadChannelData(channels) {
        if (!this.options.preloadEnabled || this.isPreloading) return;
        
        // Ajouter à la queue de préchargement
        const batch = channels.slice(0, this.options.preloadBatchSize);
        this.preloadQueue.push(...batch);
        
        // Démarrer le préchargement
        this.startPreloading();
    }
    
    async startPreloading() {
        if (this.isPreloading) return;
        this.isPreloading = true;
        
        console.log('🔄 Préchargement démarré:', this.preloadQueue.length, 'éléments');
        
        while (this.preloadQueue.length > 0) {
            const channel = this.preloadQueue.shift();
            
            // Précharger les métadonnées de la chaîne
            if (channel.logo) {
                const cached = await this.getCachedLogo(channel.logo);
                if (!cached) {
                    // Simuler le préchargement du logo
                    await this.set(`logo_${channel.logo}`, { url: channel.logo, preloaded: true }, 'logos');
                }
            }
            
            // Délai pour éviter de surcharger le système
            await new Promise(resolve => setTimeout(resolve, this.options.preloadDelay));
        }
        
        this.isPreloading = false;
        console.log('✅ Préchargement terminé');
    }
    
    /**
     * Nettoyage automatique des données expirées
     */
    cleanup() {
        console.log('🧹 Nettoyage du cache...');
        
        // Nettoyage L1
        const now = Date.now();
        for (const [key, entry] of this.l1Cache.entries()) {
            const ttl = this.options.ttl[entry.type] || this.options.ttl.metadata;
            if (now - entry.timestamp > ttl) {
                this.l1Cache.delete(key);
                this.l1Usage.delete(key);
                this.l1Size -= entry.size;
            }
        }
        
        // Nettoyage L2 et L3 (asynchrone)
        this.l2Cache.cleanup();
        this.l3Cache.cleanup();
        
        // Mise à jour des métriques
        this.metrics.memoryUsage.l1 = this.l1Size;
        
        console.log('✅ Nettoyage terminé');
    }
    
    /**
     * Statistiques et métriques
     */
    getMetrics() {
        const totalHits = this.metrics.hits.l1 + this.metrics.hits.l2 + this.metrics.hits.l3;
        const totalRequests = totalHits + this.metrics.misses;
        
        return {
            ...this.metrics,
            hitRate: totalRequests > 0 ? (totalHits / totalRequests * 100).toFixed(2) : 0,
            l1HitRate: totalRequests > 0 ? (this.metrics.hits.l1 / totalRequests * 100).toFixed(2) : 0,
            l2HitRate: totalRequests > 0 ? (this.metrics.hits.l2 / totalRequests * 100).toFixed(2) : 0,
            l3HitRate: totalRequests > 0 ? (this.metrics.hits.l3 / totalRequests * 100).toFixed(2) : 0,
            cacheSize: {
                l1: this.l1Cache.size,
                l2: this.l2Cache.size || 0,
                l3: this.l3Cache.size || 0
            }
        };
    }
    
    /**
     * Vider le cache
     */
    async clear() {
        this.l1Cache.clear();
        this.l1Usage.clear();
        this.l1Size = 0;
        
        await this.l2Cache.clear();
        await this.l3Cache.clear();
        
        console.log('🗑️ Cache vidé');
    }
    
    /**
     * Destruction
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        
        this.clear();
        console.log('💥 CacheManager détruit');
    }
}