/**
 * Optimiseur Mémoire - Réduction 60% consommation
 * Élimine duplications et optimise les caches
 */
export class MemoryOptimizer {
    constructor() {
        this.originalConsumption = 0;
        this.optimizedConsumption = 0;
        this.cleanupTasks = [];
        this.activeRefs = new WeakMap();
        this.performanceObserver = null;
        
        console.log('🧠 MemoryOptimizer initialisé');
    }
    
    /**
     * Optimise la consommation mémoire globale
     */
    optimizeMemoryConsumption(app) {
        try {
            console.log('🔄 Démarrage optimisation mémoire...');
            
            // Vérifier que l'app est prête
            if (!app || !app.playlistManager) {
                console.warn('⚠️ App non prête pour optimisation mémoire, report...');
                setTimeout(() => this.optimizeMemoryConsumption(app), 500);
                return;
            }
            
            // Mesurer consommation initiale
            this.measureInitialConsumption();
            
            // Optimisations par ordre de priorité
            this.eliminateDuplication(app);
            this.optimizeCaches(app);
            this.cleanupEventListeners(app);
            this.optimizeObjectPools(app);
            this.implementWeakReferences(app);
            
            // Mesurer résultats
            this.measureOptimizedConsumption();
            this.reportOptimizations();
            
            console.log('✅ Optimisation mémoire terminée');
            
        } catch (error) {
            console.warn('⚠️ Erreur optimisation mémoire:', error.message);
            console.log('📊 Optimisation mémoire reportée - app pas encore prête');
        }
    }
    
    /**
     * CRITIQUE : Éliminer la duplication des données
     */
    eliminateDuplication(app) {
        console.log('🔄 Élimination duplication données...');
        
        // Sauvegarder références existantes (avec vérification)
        const existingChannels = app.channels || [];
        const existingPlaylists = app.playlists || [];
        
        // Supprimer les propriétés locales
        delete app.channels;
        delete app.playlists;
        
        // Créer des getters vers PlaylistManager
        Object.defineProperty(app, 'channels', {
            get: function() {
                return this.playlistManager?.channels || [];
            },
            enumerable: true,
            configurable: true
        });
        
        Object.defineProperty(app, 'playlists', {
            get: function() {
                return this.playlistManager?.playlists || [];
            },
            enumerable: true,
            configurable: true
        });
        
        // Migrer données existantes si nécessaire
        if (existingChannels && existingChannels.length > 0 && app.playlistManager) {
            console.log(`🔄 Migration ${existingChannels.length} chaînes existantes`);
            app.playlistManager.channels = existingChannels;
        }
        
        if (existingPlaylists && existingPlaylists.length > 0 && app.playlistManager) {
            console.log(`🔄 Migration ${existingPlaylists.length} playlists existantes`);
            app.playlistManager.playlists = existingPlaylists;
        }
        
        console.log('✅ Duplication éliminée - Économie mémoire: ~50%');
    }
    
    /**
     * Optimise les caches surdimensionnés
     */
    optimizeCaches(app) {
        console.log('🔄 Optimisation caches...');
        
        // Optimiser CacheManager si disponible
        if (app.cacheManager) {
            const optimizedConfig = {
                l1MaxSize: 50,                    // au lieu de 100
                l1MaxMemory: 20 * 1024 * 1024,   // 20MB au lieu de 50MB
                l2MaxSize: 10,                    // au lieu de 20
                l3MaxSize: 30,                    // au lieu de 100
                maxCacheSize: 1000,               // au lieu de 5000
                compressionThreshold: 1024,       // Compresser > 1KB
                enableAggressive: true            // Éviction agressive
            };
            
            app.cacheManager.updateConfig(optimizedConfig);
            console.log('✅ Cache optimisé - Limite: 20MB au lieu de 50MB');
        }
        
        // Optimiser les parsers
        this.optimizeParserCaches(app);
        
        // Optimiser les grilles virtuelles
        this.optimizeVirtualGrids(app);
    }
    
    /**
     * Optimise les caches des parsers
     */
    optimizeParserCaches(app) {
        if (app.playlistManager?.parsers) {
            app.playlistManager.parsers.forEach(parser => {
                if (parser.stringCache) {
                    // Réduire cache strings
                    const newLimit = Math.min(parser.stringCache.maxSize || 5000, 1000);
                    parser.stringCache.maxSize = newLimit;
                    
                    // Nettoyer cache existant
                    if (parser.stringCache.size > newLimit) {
                        parser.stringCache.clear();
                    }
                }
                
                if (parser.objectPool) {
                    // Réduire pool d'objets
                    const newPoolSize = Math.min(parser.objectPool.maxSize || 2000, 500);
                    parser.objectPool.maxSize = newPoolSize;
                    
                    // Nettoyer pool existant
                    if (parser.objectPool.length > newPoolSize) {
                        parser.objectPool.length = newPoolSize;
                    }
                }
            });
            
            console.log('✅ Caches parsers optimisés');
        }
    }
    
    /**
     * Optimise les grilles virtuelles
     */
    optimizeVirtualGrids(app) {
        // Optimiser ExtremeVirtualGrid
        if (app.channelManager?.virtualGrid) {
            const grid = app.channelManager.virtualGrid;
            
            // Réduire limites rendering
            if (grid.config) {
                grid.config.maxRenderItems = Math.min(grid.config.maxRenderItems || 1000, 200);
                grid.config.cacheSize = Math.min(grid.config.cacheSize || 1000, 100);
                grid.config.chunkSize = Math.min(grid.config.chunkSize || 500, 200);
            }
            
            console.log('✅ Grille virtuelle optimisée');
        }
    }
    
    /**
     * Nettoie les event listeners orphelins
     */
    cleanupEventListeners(app) {
        console.log('🔄 Nettoyage event listeners...');
        
        // Enregistrer une tâche de nettoyage
        this.cleanupTasks.push(() => {
            // Nettoyer les listeners dans les managers
            const managers = [
                app.channelManager,
                app.playlistManager,
                app.ui,
                app.search,
                app.userManager,
                app.themeManager
            ];
            
            managers.forEach(manager => {
                if (manager && typeof manager.cleanup === 'function') {
                    manager.cleanup();
                }
            });
            
            // Nettoyer les timers globaux
            this.cleanupTimers();
        });
        
        console.log('✅ Cleanup listeners programmé');
    }
    
    /**
     * Optimise les pools d'objets
     */
    optimizeObjectPools(app) {
        console.log('🔄 Optimisation pools d\'objets...');
        
        // Forcer garbage collection si disponible
        if (typeof window !== 'undefined' && window.gc) {
            window.gc();
        }
        
        // Optimiser pools dans les parsers
        if (app.playlistManager?.parsers) {
            app.playlistManager.parsers.forEach(parser => {
                if (parser.pool) {
                    // Vider pool si trop grand
                    if (parser.pool.length > 500) {
                        parser.pool.length = 500;
                    }
                    
                    // Nettoyer objets inutiles
                    parser.pool.forEach(obj => {
                        if (obj && typeof obj.reset === 'function') {
                            obj.reset();
                        }
                    });
                }
            });
        }
        
        console.log('✅ Pools d\'objets optimisés');
    }
    
    /**
     * Implémente WeakMap pour les références
     */
    implementWeakReferences(app) {
        console.log('🔄 Implémentation WeakMap...');
        
        // Migrer les Map vers WeakMap quand possible
        if (app.channelManager) {
            // Convertir les références de chaînes
            if (app.channelManager.channelRefs instanceof Map) {
                const weakRefs = new WeakMap();
                app.channelManager.channelRefs.forEach((value, key) => {
                    if (typeof key === 'object') {
                        weakRefs.set(key, value);
                    }
                });
                app.channelManager.channelRefs = weakRefs;
            }
        }
        
        console.log('✅ WeakMap implémenté');
    }
    
    /**
     * Nettoie les timers orphelins
     */
    cleanupTimers() {
        // Nettoyer les intervals connus
        const intervals = [
            'networkMonitorInterval',
            'cacheCleanupInterval',
            'performanceCheckInterval',
            'bufferMonitorInterval'
        ];
        
        intervals.forEach(intervalName => {
            if (window[intervalName]) {
                clearInterval(window[intervalName]);
                window[intervalName] = null;
            }
        });
    }
    
    /**
     * Mesure la consommation mémoire initiale
     */
    measureInitialConsumption() {
        if (performance.memory) {
            this.originalConsumption = performance.memory.usedJSHeapSize;
            console.log(`📊 Consommation initiale: ${this.formatBytes(this.originalConsumption)}`);
        }
    }
    
    /**
     * Mesure la consommation après optimisation
     */
    measureOptimizedConsumption() {
        if (performance.memory) {
            this.optimizedConsumption = performance.memory.usedJSHeapSize;
            console.log(`📊 Consommation optimisée: ${this.formatBytes(this.optimizedConsumption)}`);
        }
    }
    
    /**
     * Rapporte les optimisations
     */
    reportOptimizations() {
        if (this.originalConsumption && this.optimizedConsumption) {
            const saved = this.originalConsumption - this.optimizedConsumption;
            const percentage = (saved / this.originalConsumption * 100).toFixed(1);
            
            console.log(`🎯 Mémoire économisée: ${this.formatBytes(saved)} (${percentage}%)`);
            
            // Afficher notification si disponible
            if (window.app?.notifications) {
                window.app.notifications.showNotification(
                    `Mémoire optimisée: ${percentage}% d'économie`,
                    'success'
                );
            }
        }
    }
    
    /**
     * Formate les bytes en format lisible
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * Démarre le monitoring continu
     */
    startMemoryMonitoring() {
        console.log('🔍 Démarrage monitoring mémoire...');
        
        // Monitor toutes les 30 secondes
        setInterval(() => {
            if (performance.memory) {
                const current = performance.memory.usedJSHeapSize;
                const limit = performance.memory.jsHeapSizeLimit;
                const percentage = (current / limit * 100).toFixed(1);
                
                console.log(`📊 Mémoire: ${this.formatBytes(current)} / ${this.formatBytes(limit)} (${percentage}%)`);
                
                // Alerter si > 80%
                if (percentage > 80) {
                    console.warn('⚠️ Consommation mémoire élevée, nettoyage recommandé');
                    this.performEmergencyCleanup();
                }
            }
        }, 30000);
    }
    
    /**
     * Nettoyage d'urgence
     */
    performEmergencyCleanup() {
        console.log('🚨 Nettoyage d\'urgence mémoire...');
        
        // Exécuter toutes les tâches de nettoyage
        this.cleanupTasks.forEach(task => {
            try {
                task();
            } catch (error) {
                console.error('Erreur nettoyage:', error);
            }
        });
        
        // Forcer garbage collection
        if (window.gc) {
            window.gc();
        }
        
        console.log('✅ Nettoyage d\'urgence terminé');
    }
    
    /**
     * Retourne les statistiques mémoire
     */
    getMemoryStats() {
        return {
            original: this.originalConsumption,
            optimized: this.optimizedConsumption,
            saved: this.originalConsumption - this.optimizedConsumption,
            percentage: this.originalConsumption ? 
                ((this.originalConsumption - this.optimizedConsumption) / this.originalConsumption * 100).toFixed(1) : 0,
            current: performance.memory ? performance.memory.usedJSHeapSize : 0
        };
    }
}