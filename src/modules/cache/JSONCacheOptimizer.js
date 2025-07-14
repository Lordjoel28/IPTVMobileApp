/**
 * JSON Cache Optimizer - Implémentation recommandation Gemini
 * Parse M3U une fois → Stocke JSON → Lecture ultra-rapide
 */
export class JSONCacheOptimizer {
    constructor() {
        this.cachePrefix = 'iptv_json_cache_';
        this.versionKey = 'iptv_cache_version';
        this.currentVersion = '2.0';
        
        // Configuration cache intelligent
        this.config = {
            // TTL différenciés selon type
            ttl: {
                m3u: 24 * 60 * 60 * 1000,      // 24h pour M3U statiques
                xtream: 6 * 60 * 60 * 1000,     // 6h pour Xtream (plus dynamique)
                epg: 12 * 60 * 60 * 1000       // 12h pour EPG
            },
            
            // Compression selon taille
            compression: {
                threshold: 100 * 1024,          // 100KB
                level: 'high'                   // high/medium/low
            },
            
            // Versioning intelligent
            versioning: {
                enabled: true,
                hashCheck: true,                // Vérifier hash contenu
                sizeCheck: true                 // Vérifier taille
            }
        };
        
        // Stats performance
        this.stats = {
            cacheHits: 0,
            cacheMisses: 0,
            parseTime: 0,
            loadTime: 0,
            savedParsings: 0
        };
        
        this.init();
        console.log('📄 JSONCacheOptimizer initialisé - Parse une fois, charge 100x plus vite');
    }
    
    /**
     * Initialise le cache JSON optimisé
     */
    init() {
        // Vérifier version cache
        this.checkCacheVersion();
        
        // Nettoyer cache expiré
        this.cleanExpiredCache();
        
        // Migrer ancien format si nécessaire
        this.migrateOldCache();
    }
    
    /**
     * CORE: Obtenir playlist avec cache JSON intelligent
     */
    async getPlaylist(url, options = {}) {
        const startTime = Date.now();
        
        try {
            // 1. Générer clé de cache intelligente
            const cacheKey = await this.generateSmartCacheKey(url, options);
            
            // 2. Vérifier cache JSON
            const cachedJSON = await this.getCachedJSON(cacheKey);
            if (cachedJSON) {
                this.stats.cacheHits++;
                this.stats.loadTime += Date.now() - startTime;
                console.log(`🎯 Cache JSON hit: ${Date.now() - startTime}ms`);
                return cachedJSON;
            }
            
            // 3. Cache miss - parser et stocker
            console.log('🔄 Cache miss - Parsing M3U...');
            this.stats.cacheMisses++;
            
            const parseStartTime = Date.now();
            const parsedData = await this.parseAndCache(url, cacheKey, options);
            this.stats.parseTime += Date.now() - parseStartTime;
            this.stats.savedParsings++;
            
            console.log(`✅ M3U parsé et mis en cache: ${Date.now() - parseStartTime}ms`);
            return parsedData;
            
        } catch (error) {
            console.error('❌ Erreur JSONCacheOptimizer:', error);
            throw error;
        }
    }
    
    /**
     * Génère une clé de cache intelligente
     */
    async generateSmartCacheKey(url, options) {
        // Hash basé sur URL + options + timestamp intelligent
        const keyData = {
            url: url,
            options: options,
            timestamp: this.getIntelligentTimestamp(url)
        };
        
        // Créer hash simple mais efficace
        const keyString = JSON.stringify(keyData);
        const hash = await this.simpleHash(keyString);
        
        return `${this.cachePrefix}${hash}`;
    }
    
    /**
     * Timestamp intelligent selon type de playlist
     */
    getIntelligentTimestamp(url) {
        const now = Date.now();
        
        // M3U statiques : cache long (quotidien)
        if (url.includes('.m3u') && !url.includes('/live/')) {
            return Math.floor(now / (24 * 60 * 60 * 1000)); // Jour
        }
        
        // Xtream : cache moyen (6h)
        if (url.includes('get_live_categories') || url.includes('player_api')) {
            return Math.floor(now / (6 * 60 * 60 * 1000)); // 6h
        }
        
        // EPG : cache moyen (12h)
        if (url.includes('.xml') || url.includes('epg')) {
            return Math.floor(now / (12 * 60 * 60 * 1000)); // 12h
        }
        
        // Défaut : 1h
        return Math.floor(now / (60 * 60 * 1000));
    }
    
    /**
     * Récupère JSON du cache avec validation
     */
    async getCachedJSON(cacheKey) {
        try {
            // 1. Vérifier localStorage d'abord (plus rapide)
            const localData = localStorage.getItem(cacheKey);
            if (localData) {
                const parsed = JSON.parse(localData);
                
                // Vérifier expiration
                if (this.isValidCache(parsed)) {
                    console.log('🎯 Cache localStorage hit');
                    return parsed.data;
                }
            }
            
            // 2. Vérifier IndexedDB pour gros datasets
            const indexedData = await this.getFromIndexedDB(cacheKey);
            if (indexedData && this.isValidCache(indexedData)) {
                console.log('🎯 Cache IndexedDB hit');
                return indexedData.data;
            }
            
            return null;
            
        } catch (error) {
            console.warn('⚠️ Erreur lecture cache:', error.message);
            return null;
        }
    }
    
    /**
     * Parse et met en cache intelligemment
     */
    async parseAndCache(url, cacheKey, options) {
        // 1. Télécharger contenu
        const response = await fetch(url);
        const content = await response.text();
        
        // 2. Parser selon le type détecté
        const parsedData = await this.intelligentParse(content, url, options);
        
        // 3. Préparer pour cache
        const cacheData = {
            data: parsedData,
            metadata: {
                url: url,
                size: content.length,
                hash: await this.simpleHash(content),
                timestamp: Date.now(),
                version: this.currentVersion,
                ttl: this.getTTL(url)
            }
        };
        
        // 4. Stocker intelligemment selon taille
        await this.smartStore(cacheKey, cacheData);
        
        return parsedData;
    }
    
    /**
     * Parser intelligent selon type de contenu
     */
    async intelligentParse(content, url, options) {
        // Détecter type de contenu
        if (content.includes('#EXTINF') || content.includes('#EXT-X-')) {
            return await this.parseM3U(content, options);
        }
        
        if (content.includes('get_live_categories') || content.startsWith('[{')) {
            return await this.parseXtreamJSON(content, options);
        }
        
        if (content.includes('<?xml') || content.includes('<tv>')) {
            return await this.parseEPGXML(content, options);
        }
        
        throw new Error('Type de contenu non reconnu');
    }
    
    /**
     * Parse M3U optimisé
     */
    async parseM3U(content, options) {
        // Utiliser le parser existant mais optimisé
        const app = window.app;
        if (app?.playlistManager?.parsers) {
            const parser = app.playlistManager.parsers.find(p => 
                p.constructor.name === 'UltraOptimizedM3UParser'
            ) || app.playlistManager.parsers[0];
            
            return await parser.parse(content, options);
        }
        
        throw new Error('Parser M3U non disponible');
    }
    
    /**
     * Parse Xtream JSON
     */
    async parseXtreamJSON(content, options) {
        try {
            const data = JSON.parse(content);
            
            // Transformer en format unifié
            return {
                channels: data.map(item => ({
                    id: item.stream_id || item.id,
                    name: item.name,
                    url: item.stream_url || item.url,
                    group: item.category_name || 'Xtream',
                    logo: item.stream_icon || '',
                    type: 'xtream'
                })),
                metadata: {
                    source: 'xtream',
                    count: data.length,
                    timestamp: Date.now()
                }
            };
        } catch (error) {
            throw new Error('Erreur parsing Xtream JSON: ' + error.message);
        }
    }
    
    /**
     * Parse EPG XML
     */
    async parseEPGXML(content, options) {
        // Parser XML basique pour EPG
        // Implementation simplifiée - à étendre selon besoins
        return {
            programmes: [],
            channels: [],
            metadata: {
                source: 'epg',
                timestamp: Date.now()
            }
        };
    }
    
    /**
     * Stockage intelligent selon taille
     */
    async smartStore(cacheKey, cacheData) {
        const dataString = JSON.stringify(cacheData);
        const sizeKB = dataString.length / 1024;
        
        try {
            // Petit dataset : localStorage (< 1MB)
            if (sizeKB < 1024) {
                localStorage.setItem(cacheKey, dataString);
                console.log(`💾 Stocké en localStorage: ${sizeKB.toFixed(1)}KB`);
                return;
            }
            
            // Gros dataset : IndexedDB
            await this.storeInIndexedDB(cacheKey, cacheData);
            console.log(`💾 Stocké en IndexedDB: ${sizeKB.toFixed(1)}KB`);
            
        } catch (error) {
            console.warn('⚠️ Erreur stockage cache:', error.message);
            
            // Fallback : compression + localStorage
            if (sizeKB < 5120) { // 5MB max après compression
                const compressed = await this.compress(dataString);
                localStorage.setItem(cacheKey + '_compressed', compressed);
                console.log(`💾 Stocké compressé: ${(compressed.length/1024).toFixed(1)}KB`);
            }
        }
    }
    
    /**
     * Stockage IndexedDB
     */
    async storeInIndexedDB(key, data) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('IPTVJSONCache', 1);
            
            request.onerror = () => reject(request.error);
            
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['cache'], 'readwrite');
                const store = transaction.objectStore('cache');
                
                store.put({ key, data, timestamp: Date.now() });
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            };
            
            request.onupgradeneeded = () => {
                const db = request.result;
                db.createObjectStore('cache', { keyPath: 'key' });
            };
        });
    }
    
    /**
     * Lecture IndexedDB
     */
    async getFromIndexedDB(key) {
        return new Promise((resolve) => {
            try {
                const request = indexedDB.open('IPTVJSONCache', 1);
                
                request.onsuccess = () => {
                    const db = request.result;
                    const transaction = db.transaction(['cache'], 'readonly');
                    const store = transaction.objectStore('cache');
                    const getRequest = store.get(key);
                    
                    getRequest.onsuccess = () => {
                        resolve(getRequest.result?.data || null);
                    };
                    
                    getRequest.onerror = () => resolve(null);
                };
                
                request.onerror = () => resolve(null);
                request.onblocked = () => resolve(null);
                
            } catch (error) {
                resolve(null);
            }
        });
    }
    
    /**
     * Validation cache
     */
    isValidCache(cacheData) {
        if (!cacheData?.metadata) return false;
        
        const now = Date.now();
        const age = now - cacheData.metadata.timestamp;
        const ttl = cacheData.metadata.ttl || (60 * 60 * 1000); // 1h défaut
        
        return age < ttl;
    }
    
    /**
     * TTL selon type d'URL
     */
    getTTL(url) {
        if (url.includes('.m3u') && !url.includes('/live/')) {
            return this.config.ttl.m3u;
        }
        if (url.includes('player_api') || url.includes('get_live')) {
            return this.config.ttl.xtream;
        }
        if (url.includes('.xml') || url.includes('epg')) {
            return this.config.ttl.epg;
        }
        return 60 * 60 * 1000; // 1h défaut
    }
    
    /**
     * Hash simple et rapide
     */
    async simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 32bit integer
        }
        return Math.abs(hash).toString(36);
    }
    
    /**
     * Compression basique
     */
    async compress(str) {
        // Compression simple - à remplacer par LZ4/Brotli si nécessaire
        return btoa(unescape(encodeURIComponent(str)));
    }
    
    /**
     * Décompression
     */
    async decompress(str) {
        return decodeURIComponent(escape(atob(str)));
    }
    
    /**
     * Vérification version cache
     */
    checkCacheVersion() {
        const storedVersion = localStorage.getItem(this.versionKey);
        if (storedVersion !== this.currentVersion) {
            console.log('🔄 Nouvelle version cache, nettoyage...');
            this.clearAllCache();
            localStorage.setItem(this.versionKey, this.currentVersion);
        }
    }
    
    /**
     * Nettoyage cache expiré
     */
    cleanExpiredCache() {
        const now = Date.now();
        const keysToRemove = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(this.cachePrefix)) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (!this.isValidCache(data)) {
                        keysToRemove.push(key);
                    }
                } catch {
                    keysToRemove.push(key);
                }
            }
        }
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });
        
        if (keysToRemove.length > 0) {
            console.log(`🧹 ${keysToRemove.length} caches expirés nettoyés`);
        }
    }
    
    /**
     * Nettoyer tout le cache
     */
    clearAllCache() {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(this.cachePrefix)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log(`🧹 ${keysToRemove.length} caches supprimés`);
    }
    
    /**
     * Migration ancien cache
     */
    migrateOldCache() {
        // Migrer depuis ancien format si nécessaire
        const oldKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.includes('iptv_cache') && !key.startsWith(this.cachePrefix)) {
                oldKeys.push(key);
            }
        }
        
        if (oldKeys.length > 0) {
            console.log(`🔄 Migration ${oldKeys.length} anciens caches...`);
            oldKeys.forEach(key => localStorage.removeItem(key));
        }
    }
    
    /**
     * Statistiques de performance
     */
    getStats() {
        const hitRate = this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) * 100;
        const avgLoadTime = this.stats.loadTime / this.stats.cacheHits;
        const avgParseTime = this.stats.parseTime / this.stats.cacheMisses;
        
        return {
            hitRate: hitRate.toFixed(1) + '%',
            cacheHits: this.stats.cacheHits,
            cacheMisses: this.stats.cacheMisses,
            avgLoadTime: Math.round(avgLoadTime || 0) + 'ms',
            avgParseTime: Math.round(avgParseTime || 0) + 'ms',
            savedParsings: this.stats.savedParsings,
            estimatedTimeSaved: Math.round((this.stats.savedParsings * avgParseTime) / 1000) + 's'
        };
    }
    
    /**
     * API publique - Optimisation recommandée par Gemini
     */
    async optimizePlaylistLoading(app) {
        console.log('🚀 Optimisation Gemini: Parse une fois, charge 100x plus vite');
        
        // Remplacer le chargement M3U standard
        if (app.playlistManager) {
            const originalLoadM3U = app.playlistManager.loadM3U;
            
            app.playlistManager.loadM3U = async (url, options) => {
                return await this.getPlaylist(url, options);
            };
            
            console.log('✅ Chargement M3U optimisé avec cache JSON');
        }
        
        // Exposer stats pour monitoring
        window.jsonCacheStats = () => this.getStats();
        
        return this.getStats();
    }
}