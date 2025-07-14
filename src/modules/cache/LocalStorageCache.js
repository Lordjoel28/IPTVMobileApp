/**
 * 🗄️ LOCAL STORAGE CACHE (L2)
 * Cache intermédiaire avec compression LZ-string
 * Persistant mais limité en taille
 */

export class LocalStorageCache {
    constructor(options = {}) {
        this.options = options;
        this.prefix = 'iptv_cache_';
        this.metadataKey = `${this.prefix}metadata`;
        this.compressionEnabled = options.compressionEnabled !== false;
        this.compressionThreshold = options.compressionThreshold || 512; // Plus agressif pour IPTV
        
        // Métadonnées du cache
        this.metadata = this.loadMetadata();
        
        // Nettoyage initial
        this.cleanup();
        
        console.log('🗄️ LocalStorageCache (L2) initialisé');
    }
    
    /**
     * Charge les métadonnées du cache
     */
    loadMetadata() {
        try {
            const data = localStorage.getItem(this.metadataKey);
            return data ? JSON.parse(data) : {
                entries: {},
                totalSize: 0,
                lastCleanup: Date.now()
            };
        } catch (error) {
            console.warn('⚠️ Erreur chargement métadonnées L2:', error);
            return {
                entries: {},
                totalSize: 0,
                lastCleanup: Date.now()
            };
        }
    }
    
    /**
     * Sauvegarde les métadonnées
     */
    saveMetadata() {
        try {
            localStorage.setItem(this.metadataKey, JSON.stringify(this.metadata));
        } catch (error) {
            console.warn('⚠️ Erreur sauvegarde métadonnées L2:', error);
        }
    }
    
    /**
     * Récupère une donnée du cache L2
     */
    async get(key, type = 'default') {
        const fullKey = this.prefix + key;
        
        try {
            const rawData = localStorage.getItem(fullKey);
            if (!rawData) return null;
            
            // Vérifier les métadonnées
            const meta = this.metadata.entries[key];
            if (!meta) {
                // Entrée orpheline, la supprimer
                localStorage.removeItem(fullKey);
                return null;
            }
            
            // Vérifier TTL
            const now = Date.now();
            const ttl = this.options.ttl?.[type] || this.options.ttl?.metadata || 60 * 60 * 1000;
            if (now - meta.timestamp > ttl) {
                this.delete(key);
                return null;
            }
            
            // Décompresser si nécessaire
            let data;
            if (meta.compressed) {
                data = await this.decompress(rawData);
            } else {
                data = JSON.parse(rawData);
            }
            
            // Mettre à jour l'usage
            meta.lastAccess = now;
            meta.accessCount = (meta.accessCount || 0) + 1;
            this.saveMetadata();
            
            return data;
            
        } catch (error) {
            console.warn('⚠️ Erreur lecture L2:', error);
            return null;
        }
    }
    
    /**
     * Stocke une donnée dans le cache L2
     */
    async set(key, data, type = 'default') {
        const fullKey = this.prefix + key;
        
        try {
            // Sérialiser la donnée
            let serialized = JSON.stringify(data);
            let compressed = false;
            
            // Compresser si nécessaire
            if (this.compressionEnabled && serialized.length > this.compressionThreshold) {
                serialized = await this.compress(serialized);
                compressed = true;
            }
            
            const size = serialized.length;
            
            // Vérifier si la donnée est trop grosse pour L2
            const maxSingleItemSize = 2 * 1024 * 1024; // 2MB max par item
            if (size > maxSingleItemSize) {
                console.warn(`⚠️ Item trop gros pour L2: ${(size/1024/1024).toFixed(2)}MB, passage en L3`);
                return false; // Forcer le passage en L3
            }
            
            // Vérifier l'espace disponible
            await this.ensureSpace(size);
            
            // Stocker avec gestion quota
            localStorage.setItem(fullKey, serialized);
            
            // Mettre à jour les métadonnées
            const now = Date.now();
            const oldMeta = this.metadata.entries[key];
            
            this.metadata.entries[key] = {
                type,
                size,
                compressed,
                timestamp: now,
                lastAccess: now,
                accessCount: oldMeta?.accessCount || 0
            };
            
            if (oldMeta) {
                this.metadata.totalSize -= oldMeta.size;
            }
            this.metadata.totalSize += size;
            
            this.saveMetadata();
            
            return true;
            
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                console.warn('🚨 Quota localStorage dépassé, éviction forcée');
                
                // Éviction agressive en cas de quota dépassé
                const evictCount = Math.max(5, Math.floor(Object.keys(this.metadata.entries).length * 0.3));
                for (let i = 0; i < evictCount; i++) {
                    const evicted = this.evictLRU();
                    if (!evicted) break;
                }
                
                // Nouvelle tentative après éviction
                try {
                    localStorage.setItem(fullKey, serialized);
                    
                    // Mettre à jour les métadonnées
                    const now = Date.now();
                    const oldMeta = this.metadata.entries[key];
                    
                    this.metadata.entries[key] = {
                        type,
                        size,
                        compressed,
                        timestamp: now,
                        lastAccess: now,
                        accessCount: oldMeta?.accessCount || 0
                    };
                    
                    if (oldMeta) {
                        this.metadata.totalSize -= oldMeta.size;
                    }
                    this.metadata.totalSize += size;
                    
                    this.saveMetadata();
                    console.log(`✅ Sauvegarde L2 réussie après éviction: ${(size/1024).toFixed(1)}KB`);
                    return true;
                    
                } catch (retryError) {
                    console.warn('❌ Échec définitif écriture L2, passage en L3 uniquement');
                    return false;
                }
            } else {
                console.warn('⚠️ Erreur écriture L2:', error);
                return false;
            }
        }
    }
    
    /**
     * Supprime une entrée du cache
     */
    delete(key) {
        const fullKey = this.prefix + key;
        
        try {
            localStorage.removeItem(fullKey);
            
            const meta = this.metadata.entries[key];
            if (meta) {
                this.metadata.totalSize -= meta.size;
                delete this.metadata.entries[key];
                this.saveMetadata();
            }
            
            return true;
            
        } catch (error) {
            console.warn('⚠️ Erreur suppression L2:', error);
            return false;
        }
    }
    
    /**
     * Assure l'espace disponible en évictant les anciennes entrées
     */
    async ensureSpace(neededSize) {
        const maxSize = this.options.l2MaxMemory || 10 * 1024 * 1024; // 10MB
        const maxEntries = this.options.l2MaxSize || 20;
        
        // Vérifier la taille
        while (this.metadata.totalSize + neededSize > maxSize || 
               Object.keys(this.metadata.entries).length >= maxEntries) {
            
            const evicted = this.evictLRU();
            if (!evicted) break; // Plus d'entrées à évincer
        }
    }
    
    /**
     * Éviction LRU (Least Recently Used)
     */
    evictLRU() {
        const entries = Object.entries(this.metadata.entries);
        if (entries.length === 0) return false;
        
        // Trouver l'entrée la moins récemment utilisée
        let oldestKey = null;
        let oldestTime = Infinity;
        
        for (const [key, meta] of entries) {
            const lastAccess = meta.lastAccess || meta.timestamp;
            if (lastAccess < oldestTime) {
                oldestTime = lastAccess;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            this.delete(oldestKey);
            return true;
        }
        
        return false;
    }
    
    /**
     * Compression optimisée pour gros datasets IPTV
     */
    async compress(data) {
        try {
            // Compression multi-niveaux pour gros datasets
            let compressed = data;
            
            // Niveau 1: Compression des espaces
            compressed = compressed.replace(/\s+/g, ' ').trim();
            
            // Niveau 2: Compression JSON spécifique IPTV
            compressed = compressed
                .replace(/"id":/g, '"i":')
                .replace(/"name":/g, '"n":')
                .replace(/"logo":/g, '"l":')
                .replace(/"group":/g, '"g":')
                .replace(/"url":/g, '"u":')
                .replace(/"channels":/g, '"c":')
                .replace(/"timestamp":/g, '"t":')
                .replace(/"lastAccess":/g, '"a":');
            
            // Niveau 3: Compression des URLs répétitives
            const urlMatches = compressed.match(/https?:\/\/[^"]+/g);
            if (urlMatches) {
                const urlMap = new Map();
                let urlIndex = 0;
                
                urlMatches.forEach(url => {
                    if (!urlMap.has(url)) {
                        urlMap.set(url, `@URL${urlIndex++}`);
                    }
                });
                
                // Remplacer les URLs par des références
                urlMap.forEach((ref, url) => {
                    compressed = compressed.replace(new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), ref);
                });
                
                // Ajouter la map d'URLs au début
                const urlMapStr = JSON.stringify(Array.from(urlMap.entries()));
                compressed = `URLS:${urlMapStr}|DATA:${compressed}`;
            }
            
            const originalSize = data.length;
            const compressedSize = compressed.length;
            const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
            
            console.log(`🗜️ Compression: ${(originalSize/1024).toFixed(1)}KB → ${(compressedSize/1024).toFixed(1)}KB (${ratio}%)`);
            
            return compressed;
            
        } catch (error) {
            console.warn('⚠️ Erreur compression:', error);
            return data;
        }
    }
    
    /**
     * Décompression optimisée pour gros datasets IPTV
     */
    async decompress(data) {
        try {
            let decompressed = data;
            
            // Décompression des URLs si présentes
            if (decompressed.startsWith('URLS:')) {
                const urlsEnd = decompressed.indexOf('|DATA:');
                if (urlsEnd !== -1) {
                    const urlMapStr = decompressed.substring(5, urlsEnd);
                    const urlMap = new Map(JSON.parse(urlMapStr));
                    decompressed = decompressed.substring(urlsEnd + 6);
                    
                    // Restaurer les URLs
                    urlMap.forEach((ref, url) => {
                        decompressed = decompressed.replace(new RegExp(ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), url);
                    });
                }
            }
            
            // Décompression JSON spécifique IPTV
            decompressed = decompressed
                .replace(/"i":/g, '"id":')
                .replace(/"n":/g, '"name":')
                .replace(/"l":/g, '"logo":')
                .replace(/"g":/g, '"group":')
                .replace(/"u":/g, '"url":')
                .replace(/"c":/g, '"channels":')
                .replace(/"t":/g, '"timestamp":')
                .replace(/"a":/g, '"lastAccess":');
            
            return decompressed;
            
        } catch (error) {
            console.warn('⚠️ Erreur décompression:', error);
            return data;
        }
    }
    
    /**
     * Nettoyage des données expirées
     */
    cleanup() {
        console.log('🧹 Nettoyage L2...');
        
        const now = Date.now();
        const keysToDelete = [];
        
        for (const [key, meta] of Object.entries(this.metadata.entries)) {
            const ttl = this.options.ttl?.[meta.type] || this.options.ttl?.metadata || 60 * 60 * 1000;
            
            if (now - meta.timestamp > ttl) {
                keysToDelete.push(key);
            }
        }
        
        for (const key of keysToDelete) {
            this.delete(key);
        }
        
        this.metadata.lastCleanup = now;
        this.saveMetadata();
        
        console.log(`✅ L2 nettoyé: ${keysToDelete.length} entrées supprimées`);
    }
    
    /**
     * Vider complètement le cache
     */
    async clear() {
        console.log('🗑️ Vidage L2...');
        
        // Supprimer toutes les entrées
        const keys = Object.keys(this.metadata.entries);
        for (const key of keys) {
            localStorage.removeItem(this.prefix + key);
        }
        
        // Réinitialiser les métadonnées
        this.metadata = {
            entries: {},
            totalSize: 0,
            lastCleanup: Date.now()
        };
        
        this.saveMetadata();
        console.log('✅ L2 vidé');
    }
    
    /**
     * Statistiques du cache
     */
    getStats() {
        const entries = Object.values(this.metadata.entries);
        const compressedEntries = entries.filter(e => e.compressed);
        
        return {
            size: Object.keys(this.metadata.entries).length,
            totalSize: this.metadata.totalSize,
            compressionRatio: compressedEntries.length / entries.length,
            averageSize: entries.length > 0 ? this.metadata.totalSize / entries.length : 0,
            lastCleanup: this.metadata.lastCleanup
        };
    }
    
    /**
     * Vérifier si une clé existe
     */
    has(key) {
        return key in this.metadata.entries;
    }
    
    /**
     * Obtenir toutes les clés
     */
    keys() {
        return Object.keys(this.metadata.entries);
    }
    
    /**
     * Taille du cache
     */
    get size() {
        return Object.keys(this.metadata.entries).length;
    }
}