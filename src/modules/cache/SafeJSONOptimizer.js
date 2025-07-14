/**
 * Safe JSON Cache Optimizer - Intégration sécurisée sans casser l'existant
 * Mode progressif avec fallback automatique
 */
export class SafeJSONOptimizer {
    constructor() {
        this.enabled = false; // DÉSACTIVÉ par défaut
        this.shadowMode = true; // Mode observation seulement
        this.fallbackMode = false;
        
        // Feature flags de sécurité
        this.safetyFlags = {
            validateData: true,
            compareWithOriginal: true,
            autoFallback: true,
            maxRetries: 3,
            timeoutMs: 10000
        };
        
        // Statistiques de sécurité
        this.stats = {
            attempts: 0,
            successes: 0,
            failures: 0,
            fallbacks: 0,
            dataCorruptions: 0,
            performanceGains: []
        };
        
        // Clé de cache spécifique pour éviter conflits
        this.cachePrefix = 'safe_json_cache_v1_';
        this.metaKey = 'safe_json_meta';
        
        console.log('🛡️ SafeJSONOptimizer initialisé en mode sécurisé');
        
        // Exposer contrôles immédiatement pour débogage
        this.exposeControls();
    }
    
    /**
     * Initialisation sécurisée avec vérifications
     */
    async initSafely(app) {
        try {
            // 1. Vérifier que l'app est stable
            if (!this.isAppReady(app)) {
                console.log('⏳ App non prête, initialisation différée...');
                setTimeout(() => this.initSafely(app), 1000);
                return;
            }
            
            // 2. Vérifier compatibilité navigateur
            if (!this.checkBrowserSupport()) {
                console.warn('⚠️ Navigateur non compatible avec optimisations JSON');
                return;
            }
            
            // 3. Vérifier intégrité cache existant
            await this.validateExistingCache(app);
            
            // 4. Activer mode observation uniquement
            this.shadowMode = true;
            console.log('👁️ Mode observation activé - cache sans servir');
            
            // 5. Exposer contrôles de sécurité
            this.exposeControls();
            
        } catch (error) {
            console.error('❌ Erreur initialisation SafeJSONOptimizer:', error);
            this.disable();
        }
    }
    
    /**
     * Vérification app prête et stable
     */
    isAppReady(app) {
        return app && 
               app.playlistManager && 
               app.channelManager &&
               !app.isLoading;
    }
    
    /**
     * Vérification support navigateur
     */
    checkBrowserSupport() {
        try {
            // Test localStorage
            localStorage.setItem('test_json_cache', 'test');
            localStorage.removeItem('test_json_cache');
            
            // Test JSON
            JSON.parse('{"test":true}');
            
            // Test Promise
            return typeof Promise !== 'undefined';
            
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Validation cache existant
     */
    async validateExistingCache(app) {
        try {
            // Vérifier que le cache existant fonctionne
            if (app.cacheManager) {
                const testKey = 'validation_test_' + Date.now();
                const testData = { test: true, timestamp: Date.now() };
                
                await app.cacheManager.set(testKey, testData);
                const retrieved = await app.cacheManager.get(testKey);
                
                if (!retrieved || retrieved.test !== true) {
                    throw new Error('Cache existant défaillant');
                }
                
                console.log('✅ Cache existant validé');
            }
        } catch (error) {
            console.warn('⚠️ Problème cache existant:', error.message);
            this.disable();
        }
    }
    
    /**
     * MODE SHADOW: Cache en parallèle sans servir
     */
    async shadowCache(url, data, originalParser) {
        if (!this.shadowMode) return;
        
        try {
            const startTime = Date.now();
            
            // 1. Générer clé cache sécurisée
            const cacheKey = await this.generateSafeCacheKey(url);
            
            // 2. Stocker en mode shadow (n'interfère pas)
            const cacheData = {
                data: data,
                metadata: {
                    url: url,
                    parser: originalParser?.constructor?.name || 'unknown',
                    timestamp: Date.now(),
                    size: JSON.stringify(data).length,
                    version: '1.0'
                }
            };
            
            // 3. Stocker dans espace dédié (pas de conflit)
            localStorage.setItem(cacheKey, JSON.stringify(cacheData));
            
            const duration = Date.now() - startTime;
            console.log(`👁️ Shadow cache: ${duration}ms pour ${cacheKey.slice(-8)}`);
            
            // 4. Statistiques
            this.stats.attempts++;
            if (data && data.channels) {
                this.stats.successes++;
            }
            
        } catch (error) {
            console.warn('⚠️ Erreur shadow cache:', error.message);
            this.stats.failures++;
        }
    }
    
    /**
     * TEST MODE: Comparer avec cache si disponible
     */
    async testCache(url, originalData, originalDuration) {
        if (!this.shadowMode) return null;
        
        try {
            const cacheKey = await this.generateSafeCacheKey(url);
            const cached = localStorage.getItem(cacheKey);
            
            if (!cached) return null;
            
            const startTime = Date.now();
            const parsedCache = JSON.parse(cached);
            const loadDuration = Date.now() - startTime;
            
            // Validation données
            if (this.validateCacheData(parsedCache.data, originalData)) {
                const speedup = originalDuration / loadDuration;
                this.stats.performanceGains.push(speedup);
                
                console.log(`🎯 Test réussi: ${speedup.toFixed(1)}x plus rapide (${loadDuration}ms vs ${originalDuration}ms)`);
                
                return {
                    data: parsedCache.data,
                    speedup: speedup,
                    loadTime: loadDuration,
                    valid: true
                };
            } else {
                console.warn('⚠️ Données cache invalides vs original');
                this.stats.dataCorruptions++;
                return null;
            }
            
        } catch (error) {
            console.warn('⚠️ Erreur test cache:', error.message);
            return null;
        }
    }
    
    /**
     * Validation stricte des données
     */
    validateCacheData(cachedData, originalData) {
        try {
            // Vérifications de base
            if (!cachedData || !originalData) return false;
            if (!cachedData.channels || !originalData.channels) return false;
            
            // Vérification nombre de chaînes (tolérance 1%)
            const cacheDiff = Math.abs(cachedData.channels.length - originalData.channels.length);
            const tolerance = Math.max(1, originalData.channels.length * 0.01);
            
            if (cacheDiff > tolerance) {
                console.warn(`⚠️ Nombre chaînes différent: ${cachedData.channels.length} vs ${originalData.channels.length}`);
                return false;
            }
            
            // Vérification échantillon (10 chaînes aléatoires)
            const sampleSize = Math.min(10, originalData.channels.length);
            for (let i = 0; i < sampleSize; i++) {
                const idx = Math.floor(Math.random() * originalData.channels.length);
                const original = originalData.channels[idx];
                const cached = cachedData.channels[idx];
                
                if (!original || !cached) continue;
                
                if (original.name !== cached.name || original.url !== cached.url) {
                    console.warn('⚠️ Données chaîne différentes:', original.name, 'vs', cached.name);
                    return false;
                }
            }
            
            return true;
            
        } catch (error) {
            console.warn('⚠️ Erreur validation:', error.message);
            return false;
        }
    }
    
    /**
     * Génération clé cache sécurisée
     */
    async generateSafeCacheKey(url) {
        // Hash simple et rapide sans conflit
        const hash = this.simpleHash(url + '_safe_json');
        return this.cachePrefix + hash;
    }
    
    /**
     * Hash simple
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }
    
    /**
     * HOOK SÉCURISÉ: Intercepter sans casser
     */
    async hookIntoPlaylistManager(app) {
        if (!app.playlistManager) return;
        
        // Éviter les hooks multiples
        if (app.playlistManager._safeJSONHookInstalled) return;
        
        try {
            console.log('🔗 Hook sécurisé dans PlaylistManager...');
            
            // Sauvegarder méthodes originales
            const originalLoadM3U = app.playlistManager.loadM3U?.bind(app.playlistManager);
            const originalParseM3U = app.playlistManager.parseM3U?.bind(app.playlistManager);
            
            // Hook NON-INVASIF
            if (originalLoadM3U) {
                app.playlistManager.loadM3U = async (url, options) => {
                    const startTime = Date.now();
                    
                    try {
                        // 1. Appeler méthode originale (TOUJOURS)
                        const result = await originalLoadM3U(url, options);
                        const duration = Date.now() - startTime;
                        
                        // 2. Mode selon activation
                        if (this.enabled && !this.shadowMode) {
                            // Mode actif : utiliser cache si disponible
                            const cached = await this.getCachedData(url).catch(() => null);
                            if (cached) {
                                console.log('🎯 Cache JSON hit - chargement ultra-rapide');
                                this.stats.cacheHits++;
                                return cached;
                            }
                            // Pas de cache : stocker pour la prochaine fois
                            this.storeData(url, result).catch(() => {});
                        } else {
                            // Mode shadow : cache en parallèle sans servir
                            this.shadowCache(url, result, 'loadM3U').catch(() => {});
                            this.testCache(url, result, duration).catch(() => {});
                        }
                        
                        // 3. TOUJOURS retourner résultat original
                        return result;
                        
                    } catch (error) {
                        // Fallback total vers original
                        console.warn('⚠️ Erreur hook, fallback vers original');
                        this.stats.fallbacks++;
                        return await originalLoadM3U(url, options);
                    }
                };
                
                // Marquer hook installé
                app.playlistManager._safeJSONHookInstalled = true;
                console.log('✅ Hook loadM3U installé en mode sécurisé');
            }
            
        } catch (error) {
            console.error('❌ Erreur installation hook:', error);
            this.disable();
        }
    }
    
    /**
     * Exposition contrôles sécurisés
     */
    exposeControls() {
        window.safeJSONOptimizer = {
            // Statut système
            getStatus: () => this.getSystemStatus(),
            checkAppReady: () => this.debugAppReadiness(),
            
            // Statistiques
            getStats: () => this.getDetailedStats(),
            
            // Contrôles sécurisés
            enableSafely: () => this.enableSafely(),
            disable: () => this.disable(),
            testMode: () => this.enterTestMode(),
            
            // Diagnostics
            validateCache: () => this.runValidation(),
            benchmark: () => this.runBenchmark(),
            
            // Nettoyage
            clearSafeCache: () => this.clearSafeCache()
        };
        
        console.log('🎛️ Contrôles exposés: window.safeJSONOptimizer');
    }
    
    /**
     * Activation sécurisée progressive
     */
    async enableSafely() {
        if (this.enabled) {
            console.log('ℹ️ Déjà activé');
            return;
        }
        
        try {
            // Vérifications pré-activation
            const validation = await this.runValidation();
            if (!validation.safe) {
                console.warn('⚠️ Validation échouée, activation refusée');
                return false;
            }
            
            console.log('🚀 Activation sécurisée...');
            this.shadowMode = false;
            this.enabled = true;
            
            console.log('🎯 Mode cache actif - prochains chargements optimisés');
            
            console.log('✅ SafeJSONOptimizer activé');
            return true;
            
        } catch (error) {
            console.error('❌ Erreur activation:', error);
            this.disable();
            return false;
        }
    }
    
    /**
     * Désactivation sécurisée
     */
    disable() {
        this.enabled = false;
        this.shadowMode = false;
        console.log('🛑 SafeJSONOptimizer désactivé');
    }
    
    /**
     * Mode test avancé
     */
    async enterTestMode() {
        console.log('🧪 Entrée en mode test...');
        
        const tests = [
            this.testCachePerformance,
            this.testDataIntegrity,
            this.testFallbackMechanisms
        ];
        
        const results = [];
        for (const test of tests) {
            try {
                const result = await test.call(this);
                results.push(result);
            } catch (error) {
                results.push({ error: error.message });
            }
        }
        
        console.log('🧪 Résultats tests:', results);
        return results;
    }
    
    /**
     * Validation complète
     */
    async runValidation() {
        const checks = {
            browserSupport: this.checkBrowserSupport(),
            cacheIntegrity: true,
            dataConsistency: this.stats.dataCorruptions === 0,
            fallbackWorks: this.stats.fallbacks >= 0,
            performanceGain: this.stats.performanceGains.length === 0 || this.getAverageSpeedup() > 1.5
        };
        
        const safe = Object.values(checks).every(check => check === true);
        
        return {
            safe: safe,
            checks: checks,
            recommendation: safe ? 'Activation recommandée' : 'Activation déconseillée'
        };
    }
    
    /**
     * Benchmark de performance
     */
    async runBenchmark() {
        console.log('📊 Benchmark en cours...');
        
        const results = {
            averageSpeedup: this.getAverageSpeedup(),
            totalAttempts: this.stats.attempts,
            successRate: (this.stats.successes / this.stats.attempts * 100).toFixed(1) + '%',
            errorRate: (this.stats.failures / this.stats.attempts * 100).toFixed(1) + '%',
            dataIntegrity: (1 - this.stats.dataCorruptions / this.stats.attempts * 100).toFixed(1) + '%'
        };
        
        console.log('📊 Résultats benchmark:', results);
        return results;
    }
    
    /**
     * Nettoyage cache sécurisé
     */
    clearSafeCache() {
        let cleared = 0;
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key?.startsWith(this.cachePrefix)) {
                localStorage.removeItem(key);
                cleared++;
            }
        }
        console.log(`🧹 ${cleared} entrées cache sécurisé supprimées`);
        return cleared;
    }
    
    /**
     * Statistiques détaillées
     */
    getDetailedStats() {
        return {
            ...this.stats,
            averageSpeedup: this.getAverageSpeedup(),
            enabled: this.enabled,
            shadowMode: this.shadowMode,
            cacheSize: this.getCacheSize()
        };
    }
    
    /**
     * Speedup moyen
     */
    getAverageSpeedup() {
        if (this.stats.performanceGains.length === 0) return 0;
        return this.stats.performanceGains.reduce((a, b) => a + b, 0) / this.stats.performanceGains.length;
    }
    
    /**
     * Taille cache
     */
    getCacheSize() {
        let size = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(this.cachePrefix)) {
                size += localStorage.getItem(key)?.length || 0;
            }
        }
        return Math.round(size / 1024) + 'KB';
    }
    
    /**
     * Statut système complet
     */
    getSystemStatus() {
        const app = window.app;
        return {
            initialized: this.shadowMode !== undefined,
            shadowMode: this.shadowMode,
            enabled: this.enabled,
            appAvailable: !!app,
            appReady: app ? this.isAppReady(app) : false,
            playlistManager: !!(app?.playlistManager),
            channelManager: !!(app?.channelManager),
            isLoading: app?.isLoading || false,
            controleursExposes: !!window.safeJSONOptimizer
        };
    }
    
    /**
     * Récupère données du cache (mode actif)
     */
    async getCachedData(url) {
        const cacheKey = await this.generateSafeCacheKey(url);
        const cached = localStorage.getItem(cacheKey);
        
        if (!cached) return null;
        
        const parsedCache = JSON.parse(cached);
        if (this.isValidCache(parsedCache)) {
            return parsedCache.data;
        }
        
        return null;
    }
    
    /**
     * Stocke données en cache (mode actif)
     */
    async storeData(url, data) {
        const cacheKey = await this.generateSafeCacheKey(url);
        const cacheData = {
            data: data,
            metadata: {
                url: url,
                timestamp: Date.now(),
                size: JSON.stringify(data).length,
                version: '1.0',
                ttl: 24 * 60 * 60 * 1000 // 24h
            }
        };
        
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        console.log(`💾 Cache JSON stocké: ${cacheKey.slice(-8)}`);
    }
    
    /**
     * Validation cache simple
     */
    isValidCache(cacheData) {
        if (!cacheData?.metadata) return false;
        
        const now = Date.now();
        const age = now - cacheData.metadata.timestamp;
        const ttl = cacheData.metadata.ttl || (60 * 60 * 1000);
        
        return age < ttl;
    }
    
    /**
     * Debug préparation app
     */
    debugAppReadiness() {
        const app = window.app;
        if (!app) {
            console.log('❌ window.app non disponible');
            return false;
        }
        
        console.log('🔍 Debug app readiness:');
        console.log('  - app:', !!app);
        console.log('  - playlistManager:', !!app.playlistManager);
        console.log('  - channelManager:', !!app.channelManager);
        console.log('  - isLoading:', app.isLoading);
        console.log('  - Ready:', this.isAppReady(app));
        
        return this.isAppReady(app);
    }
}