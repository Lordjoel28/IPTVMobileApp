/**
 * 🗃️ INDEXED DB CACHE (L3)
 * Cache persistant haute capacité avec compression
 * Optimisé pour les gros volumes de données IPTV
 */

export class IndexedDBCache {
    constructor(options = {}) {
        this.options = options;
        this.dbName = 'IPTVCache';
        this.dbVersion = 1;
        this.storeName = 'cache';
        this.db = null;
        this.compressionEnabled = options.compressionEnabled !== false;
        this.compressionThreshold = options.compressionThreshold || 1024;
        
        // État d'initialisation
        this.initialized = false;
        this.initPromise = this.init();
        
        console.log('🗃️ IndexedDBCache (L3) en cours d\'initialisation...');
    }
    
    /**
     * Initialise IndexedDB
     */
    async init() {
        try {
            if (!window.indexedDB) {
                console.warn('⚠️ IndexedDB non supporté');
                return false;
            }
            
            this.db = await this.openDB();
            this.initialized = true;
            console.log('✅ IndexedDBCache (L3) initialisé');
            return true;
            
        } catch (error) {
            console.error('❌ Erreur initialisation IndexedDB:', error);
            return false;
        }
    }
    
    /**
     * Ouvre la base de données IndexedDB
     */
    openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Créer l'object store
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
                    
                    // Index pour les requêtes
                    store.createIndex('type', 'type', { unique: false });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('lastAccess', 'lastAccess', { unique: false });
                    store.createIndex('size', 'size', { unique: false });
                    
                    console.log('🏗️ Object store créé');
                }
            };
        });
    }
    
    /**
     * Attend l'initialisation
     */
    async waitForInit() {
        await this.initPromise;
        return this.initialized;
    }
    
    /**
     * Récupère une donnée du cache L3
     */
    async get(key, type = 'default') {
        if (!await this.waitForInit()) return null;
        
        try {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(key);
            
            const result = await new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            if (!result) return null;
            
            // Vérifier TTL
            const now = Date.now();
            const ttl = this.options.ttl?.[type] || this.options.ttl?.metadata || 60 * 60 * 1000;
            if (now - result.timestamp > ttl) {
                this.delete(key);
                return null;
            }
            
            // Décompresser si nécessaire
            let data;
            if (result.compressed) {
                data = await this.decompress(result.data);
            } else {
                data = result.data;
            }
            
            // Mettre à jour l'usage
            await this.updateAccess(key, now);
            
            return data;
            
        } catch (error) {
            console.warn('⚠️ Erreur lecture L3:', error);
            return null;
        }
    }
    
    /**
     * Stocke une donnée dans le cache L3
     */
    async set(key, data, type = 'default') {
        if (!await this.waitForInit()) return false;
        
        try {
            // Préparer la donnée
            let processedData = data;
            let compressed = false;
            let size = this.estimateSize(data);
            
            // Compresser si nécessaire
            if (this.compressionEnabled && size > this.compressionThreshold) {
                processedData = await this.compress(data);
                compressed = true;
                size = this.estimateSize(processedData);
            }
            
            // Assurer l'espace disponible
            await this.ensureSpace(size);
            
            const now = Date.now();
            const entry = {
                key,
                data: processedData,
                type,
                compressed,
                size,
                timestamp: now,
                lastAccess: now,
                accessCount: 0
            };
            
            // Stocker
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put(entry);
            
            await new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            return true;
            
        } catch (error) {
            console.warn('⚠️ Erreur écriture L3:', error);
            return false;
        }
    }
    
    /**
     * Supprime une entrée du cache
     */
    async delete(key) {
        if (!await this.waitForInit()) return false;
        
        try {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(key);
            
            await new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            return true;
            
        } catch (error) {
            console.warn('⚠️ Erreur suppression L3:', error);
            return false;
        }
    }
    
    /**
     * Met à jour l'accès à une entrée
     */
    async updateAccess(key, timestamp) {
        try {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const getRequest = store.get(key);
            
            const entry = await new Promise((resolve, reject) => {
                getRequest.onsuccess = () => resolve(getRequest.result);
                getRequest.onerror = () => reject(getRequest.error);
            });
            
            if (entry) {
                entry.lastAccess = timestamp;
                entry.accessCount = (entry.accessCount || 0) + 1;
                
                const putRequest = store.put(entry);
                await new Promise((resolve, reject) => {
                    putRequest.onsuccess = () => resolve(putRequest.result);
                    putRequest.onerror = () => reject(putRequest.error);
                });
            }
            
        } catch (error) {
            console.warn('⚠️ Erreur mise à jour accès L3:', error);
        }
    }
    
    /**
     * Assure l'espace disponible
     */
    async ensureSpace(neededSize) {
        const stats = await this.getStats();
        const maxSize = this.options.l3MaxMemory || 100 * 1024 * 1024; // 100MB
        const maxEntries = this.options.l3MaxSize || 100;
        
        // Vérifier si éviction nécessaire
        if (stats.totalSize + neededSize > maxSize || stats.entryCount >= maxEntries) {
            await this.evictLRU();
        }
    }
    
    /**
     * Éviction LRU
     */
    async evictLRU() {
        if (!await this.waitForInit()) return;
        
        try {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const index = store.index('lastAccess');
            
            // Obtenir les entrées triées par dernier accès
            const request = index.openCursor();
            const entriesToEvict = [];
            
            await new Promise((resolve, reject) => {
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        entriesToEvict.push(cursor.value.key);
                        cursor.continue();
                    } else {
                        resolve();
                    }
                };
                request.onerror = () => reject(request.error);
            });
            
            // Supprimer les 10% les plus anciens
            const toEvict = entriesToEvict.slice(0, Math.ceil(entriesToEvict.length * 0.1));
            
            for (const key of toEvict) {
                await this.delete(key);
            }
            
            console.log(`🗑️ L3 éviction: ${toEvict.length} entrées supprimées`);
            
        } catch (error) {
            console.warn('⚠️ Erreur éviction L3:', error);
        }
    }
    
    /**
     * Compression avancée
     */
    async compress(data) {
        try {
            // Sérialiser
            const serialized = JSON.stringify(data);
            
            // Compression basique (en production, utiliser une vraie lib)
            const compressed = {
                __compressed: true,
                data: serialized.replace(/\s+/g, ' ').trim(),
                originalSize: serialized.length,
                algorithm: 'basic'
            };
            
            return compressed;
            
        } catch (error) {
            console.warn('⚠️ Erreur compression L3:', error);
            return data;
        }
    }
    
    /**
     * Décompression
     */
    async decompress(data) {
        try {
            if (data?.__compressed) {
                return JSON.parse(data.data);
            }
            return data;
            
        } catch (error) {
            console.warn('⚠️ Erreur décompression L3:', error);
            return data;
        }
    }
    
    /**
     * Estime la taille d'un objet
     */
    estimateSize(obj) {
        try {
            return JSON.stringify(obj).length * 2; // UTF-16
        } catch {
            return 1000; // Fallback
        }
    }
    
    /**
     * Nettoyage des données expirées
     */
    async cleanup() {
        if (!await this.waitForInit()) return;
        
        console.log('🧹 Nettoyage L3...');
        
        try {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const index = store.index('timestamp');
            
            const now = Date.now();
            const expiredKeys = [];
            
            // Parcourir toutes les entrées
            const request = index.openCursor();
            
            await new Promise((resolve, reject) => {
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        const entry = cursor.value;
                        const ttl = this.options.ttl?.[entry.type] || this.options.ttl?.metadata || 60 * 60 * 1000;
                        
                        if (now - entry.timestamp > ttl) {
                            expiredKeys.push(entry.key);
                        }
                        
                        cursor.continue();
                    } else {
                        resolve();
                    }
                };
                request.onerror = () => reject(request.error);
            });
            
            // Supprimer les entrées expirées
            for (const key of expiredKeys) {
                await this.delete(key);
            }
            
            console.log(`✅ L3 nettoyé: ${expiredKeys.length} entrées supprimées`);
            
        } catch (error) {
            console.warn('⚠️ Erreur nettoyage L3:', error);
        }
    }
    
    /**
     * Vider complètement le cache
     */
    async clear() {
        if (!await this.waitForInit()) return;
        
        try {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.clear();
            
            await new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            console.log('✅ L3 vidé');
            
        } catch (error) {
            console.warn('⚠️ Erreur vidage L3:', error);
        }
    }
    
    /**
     * Statistiques du cache
     */
    async getStats() {
        if (!await this.waitForInit()) {
            return {
                entryCount: 0,
                totalSize: 0,
                compressedEntries: 0,
                averageSize: 0
            };
        }
        
        try {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();
            
            const entries = await new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            let totalSize = 0;
            let compressedEntries = 0;
            
            for (const entry of entries) {
                totalSize += entry.size || 0;
                if (entry.compressed) compressedEntries++;
            }
            
            return {
                entryCount: entries.length,
                totalSize,
                compressedEntries,
                compressionRatio: entries.length > 0 ? compressedEntries / entries.length : 0,
                averageSize: entries.length > 0 ? totalSize / entries.length : 0
            };
            
        } catch (error) {
            console.warn('⚠️ Erreur stats L3:', error);
            return {
                entryCount: 0,
                totalSize: 0,
                compressedEntries: 0,
                averageSize: 0
            };
        }
    }
    
    /**
     * Vérifier si une clé existe
     */
    async has(key) {
        if (!await this.waitForInit()) return false;
        
        try {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.count(key);
            
            const count = await new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            return count > 0;
            
        } catch (error) {
            console.warn('⚠️ Erreur vérification L3:', error);
            return false;
        }
    }
    
    /**
     * Obtenir toutes les clés
     */
    async keys() {
        if (!await this.waitForInit()) return [];
        
        try {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAllKeys();
            
            const keys = await new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            return keys;
            
        } catch (error) {
            console.warn('⚠️ Erreur récupération clés L3:', error);
            return [];
        }
    }
    
    /**
     * Taille du cache
     */
    async size() {
        const stats = await this.getStats();
        return stats.entryCount;
    }
    
    /**
     * Destruction
     */
    async destroy() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
        
        this.initialized = false;
        console.log('💥 IndexedDBCache détruit');
    }
}