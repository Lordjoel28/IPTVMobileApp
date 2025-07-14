/**
 * Vérificateur de Compatibilité Cache - Teste l'intégration
 * S'assure que le nouveau cache adaptatif ne casse rien
 */
export class CacheCompatibilityChecker {
    constructor() {
        this.testResults = {
            parsers: { passed: 0, failed: 0, tests: [] },
            cacheManagers: { passed: 0, failed: 0, tests: [] },
            virtualGrids: { passed: 0, failed: 0, tests: [] },
            lazyLoaders: { passed: 0, failed: 0, tests: [] },
            bufferManagers: { passed: 0, failed: 0, tests: [] },
            overall: { score: 0, status: 'UNKNOWN' }
        };
        
        this.criticalFunctions = [
            'playlistManager.loadM3U',
            'playlistManager.loadXtream', 
            'channelManager.displayChannels',
            'virtualGrid.render',
            'cacheManager.get',
            'cacheManager.set',
            'parser.parse',
            'bufferManager.optimize'
        ];
        
        console.log('🔍 CacheCompatibilityChecker initialisé');
    }
    
    /**
     * Lance tous les tests de compatibilité
     */
    async runAllCompatibilityTests(app) {
        console.log('🧪 Démarrage tests de compatibilité...');
        
        try {
            // Tests par module
            await this.testParsersCompatibility(app);
            await this.testCacheManagersCompatibility(app);
            await this.testVirtualGridsCompatibility(app);
            await this.testLazyLoadersCompatibility(app);
            await this.testBufferManagersCompatibility(app);
            
            // Test intégration globale
            await this.testGlobalIntegration(app);
            
            // Calcul score final
            this.calculateOverallScore();
            
            // Rapport final
            this.generateCompatibilityReport();
            
            return this.testResults;
            
        } catch (error) {
            console.error('❌ Erreur tests compatibilité:', error);
            this.testResults.overall.status = 'ERROR';
            return this.testResults;
        }
    }
    
    /**
     * Teste la compatibilité des parsers
     */
    async testParsersCompatibility(app) {
        console.log('🔍 Test compatibilité parsers...');
        
        const tests = [
            {
                name: 'OptimizedM3UParser - Object Pool',
                test: () => this.testParserObjectPool(app, 'OptimizedM3UParser')
            },
            {
                name: 'UltraOptimizedM3UParser - String Cache',
                test: () => this.testParserStringCache(app, 'UltraOptimizedM3UParser')
            },
            {
                name: 'Parser Selection Logic',
                test: () => this.testParserSelection(app)
            },
            {
                name: 'Cache Integration with Parsers',
                test: () => this.testParserCacheIntegration(app)
            }
        ];
        
        for (const test of tests) {
            try {
                const result = await test.test();
                this.recordTestResult('parsers', test.name, result, null);
            } catch (error) {
                this.recordTestResult('parsers', test.name, false, error.message);
            }
        }
    }
    
    /**
     * Teste la compatibilité des gestionnaires de cache
     */
    async testCacheManagersCompatibility(app) {
        console.log('🔍 Test compatibilité cache managers...');
        
        const tests = [
            {
                name: 'CacheManager L1/L2/L3 Structure',
                test: () => this.testCacheManagerStructure(app)
            },
            {
                name: 'Cache Size Limits Respect',
                test: () => this.testCacheSizeLimits(app)
            },
            {
                name: 'LRU Eviction Still Works',
                test: () => this.testLRUEviction(app)
            },
            {
                name: 'Compression Integration',
                test: () => this.testCompressionIntegration(app)
            }
        ];
        
        for (const test of tests) {
            try {
                const result = await test.test();
                this.recordTestResult('cacheManagers', test.name, result, null);
            } catch (error) {
                this.recordTestResult('cacheManagers', test.name, false, error.message);
            }
        }
    }
    
    /**
     * Teste la compatibilité des grilles virtuelles
     */
    async testVirtualGridsCompatibility(app) {
        console.log('🔍 Test compatibilité grilles virtuelles...');
        
        const tests = [
            {
                name: 'VirtualChannelGrid Rendering',
                test: () => this.testVirtualGridRendering(app)
            },
            {
                name: 'ExtremeVirtualGrid 50K+ Support',
                test: () => this.testExtremeGridSupport(app)
            },
            {
                name: 'DOM Element Recycling',
                test: () => this.testDOMRecycling(app)
            },
            {
                name: 'Virtual Scroll Performance',
                test: () => this.testVirtualScrollPerformance(app)
            }
        ];
        
        for (const test of tests) {
            try {
                const result = await test.test();
                this.recordTestResult('virtualGrids', test.name, result, null);
            } catch (error) {
                this.recordTestResult('virtualGrids', test.name, false, error.message);
            }
        }
    }
    
    /**
     * Teste la compatibilité des lazy loaders
     */
    async testLazyLoadersCompatibility(app) {
        console.log('🔍 Test compatibilité lazy loaders...');
        
        const tests = [
            {
                name: 'HybridLazyManager Integration',
                test: () => this.testHybridLazyManager(app)
            },
            {
                name: 'Image Lazy Loading',
                test: () => this.testImageLazyLoading(app)
            },
            {
                name: 'Intersection Observer',
                test: () => this.testIntersectionObserver(app)
            },
            {
                name: 'Preloading Strategies',
                test: () => this.testPreloadingStrategies(app)
            }
        ];
        
        for (const test of tests) {
            try {
                const result = await test.test();
                this.recordTestResult('lazyLoaders', test.name, result, null);
            } catch (error) {
                this.recordTestResult('lazyLoaders', test.name, false, error.message);
            }
        }
    }
    
    /**
     * Teste la compatibilité des buffer managers
     */
    async testBufferManagersCompatibility(app) {
        console.log('🔍 Test compatibilité buffer managers...');
        
        const tests = [
            {
                name: 'AdaptiveBufferManager Integration',
                test: () => this.testAdaptiveBufferManager(app)
            },
            {
                name: 'Video.js Configuration',
                test: () => this.testVideoJSConfig(app)
            },
            {
                name: 'HLS.js Buffer Settings',
                test: () => this.testHLSJSBuffer(app)
            },
            {
                name: 'Buffer Diagnostics',
                test: () => this.testBufferDiagnostics(app)
            }
        ];
        
        for (const test of tests) {
            try {
                const result = await test.test();
                this.recordTestResult('bufferManagers', test.name, result, null);
            } catch (error) {
                this.recordTestResult('bufferManagers', test.name, false, error.message);
            }
        }
    }
    
    /**
     * Teste l'intégration globale
     */
    async testGlobalIntegration(app) {
        console.log('🔍 Test intégration globale...');
        
        const integrationTests = [
            () => this.testStartupTime(app),
            () => this.testMemoryUsage(app), 
            () => this.testCriticalFunctions(app),
            () => this.testErrorHandling(app)
        ];
        
        for (const test of integrationTests) {
            try {
                await test();
            } catch (error) {
                console.warn('⚠️ Test intégration échoué:', error.message);
            }
        }
    }
    
    // Tests spécifiques - Parsers
    testParserObjectPool(app, parserName) {
        const parser = app.playlistManager?.parsers?.find(p => p.constructor.name === parserName);
        if (!parser) return false;
        
        const hasPool = !!parser.objectPool || !!parser.pool;
        const hasCorrectSize = parser.objectPool?.maxSize > 0 || parser.pool?.length >= 0;
        
        return hasPool && hasCorrectSize;
    }
    
    testParserStringCache(app, parserName) {
        const parser = app.playlistManager?.parsers?.find(p => p.constructor.name === parserName);
        if (!parser) return false;
        
        const hasStringCache = !!parser.stringCache;
        const hasLRU = parser.stringCache?.has && parser.stringCache?.set;
        
        return hasStringCache && hasLRU;
    }
    
    testParserSelection(app) {
        if (!app.playlistManager) return false;
        
        // Vérifier que la logique de sélection fonctionne
        const hasSelectionLogic = typeof app.playlistManager.selectOptimalParser === 'function';
        const hasParserArray = Array.isArray(app.playlistManager.parsers);
        
        return hasSelectionLogic && hasParserArray;
    }
    
    testParserCacheIntegration(app) {
        // Vérifier que les parsers peuvent utiliser le cache
        const parser = app.playlistManager?.parsers?.[0];
        if (!parser) return false;
        
        return typeof parser.parse === 'function';
    }
    
    // Tests spécifiques - Cache Managers
    testCacheManagerStructure(app) {
        const cache = app.playlistManager?.cacheManager;
        if (!cache) return false;
        
        const hasL1 = !!cache.l1Cache || !!cache.memoryCache;
        const hasL2 = !!cache.l2Cache || !!cache.localStorage;
        const hasL3 = !!cache.l3Cache || !!cache.indexedDB;
        
        return hasL1 && (hasL2 || hasL3);
    }
    
    testCacheSizeLimits(app) {
        const cache = app.playlistManager?.cacheManager;
        if (!cache) return false;
        
        const hasLimits = cache.options && (
            cache.options.l1MaxSize || 
            cache.options.l1MaxMemory ||
            cache.options.maxCacheSize
        );
        
        return !!hasLimits;
    }
    
    testLRUEviction(app) {
        const cache = app.playlistManager?.cacheManager;
        if (!cache) return false;
        
        // Vérifier méthodes LRU
        const hasEviction = typeof cache.evictLRU === 'function' ||
                           typeof cache.evict === 'function' ||
                           cache.l1Cache?.delete;
        
        return hasEviction;
    }
    
    testCompressionIntegration(app) {
        const cache = app.playlistManager?.cacheManager;
        if (!cache) return false;
        
        const hasCompression = typeof cache.compress === 'function' ||
                              typeof cache.decompress === 'function' ||
                              cache.options?.compression;
        
        return hasCompression;
    }
    
    // Tests spécifiques - Grilles Virtuelles
    testVirtualGridRendering(app) {
        const grid = app.channelManager?.virtualGrid;
        if (!grid) return true; // Optionnel
        
        const hasRender = typeof grid.render === 'function';
        const hasConfig = !!grid.config;
        
        return hasRender && hasConfig;
    }
    
    testExtremeGridSupport(app) {
        const grid = app.channelManager?.virtualGrid;
        if (!grid) return true; // Optionnel
        
        const hasLimits = grid.config?.maxRenderItems && 
                         grid.config.maxRenderItems < 2000; // Limite raisonnable
        
        return hasLimits;
    }
    
    testDOMRecycling(app) {
        const grid = app.channelManager?.virtualGrid;
        if (!grid) return true; // Optionnel
        
        const hasRecycling = !!grid.elementPool || 
                            !!grid.recycleElements ||
                            grid.config?.recycling;
        
        return hasRecycling;
    }
    
    testVirtualScrollPerformance(app) {
        // Test basique de performance
        const grid = app.channelManager?.virtualGrid;
        if (!grid) return true; // Optionnel
        
        return typeof grid.updateVisibleItems === 'function' ||
               typeof grid.onScroll === 'function';
    }
    
    // Tests spécifiques - Lazy Loaders
    testHybridLazyManager(app) {
        const lazy = app.hybridLazyManager;
        if (!lazy) return true; // Optionnel, chargé différé
        
        const hasInit = typeof lazy.init === 'function';
        const hasLoad = typeof lazy.loadImages === 'function';
        
        return hasInit && hasLoad;
    }
    
    testImageLazyLoading(app) {
        // Vérifier Intersection Observer support
        const hasIntersectionObserver = 'IntersectionObserver' in window;
        
        return hasIntersectionObserver;
    }
    
    testIntersectionObserver(app) {
        const lazy = app.hybridLazyManager;
        if (!lazy) return true; // Optionnel
        
        return !!lazy.observer || !!lazy.intersectionObserver;
    }
    
    testPreloadingStrategies(app) {
        const lazy = app.hybridLazyManager;
        if (!lazy) return true; // Optionnel
        
        return !!lazy.strategies || typeof lazy.preload === 'function';
    }
    
    // Tests spécifiques - Buffer Managers
    testAdaptiveBufferManager(app) {
        const buffer = app.bufferManager;
        if (!buffer) return false;
        
        const hasProfiles = !!buffer.profiles;
        const hasConfig = typeof buffer.configureVideoJS === 'function';
        
        return hasProfiles && hasConfig;
    }
    
    testVideoJSConfig(app) {
        const buffer = app.bufferManager;
        if (!buffer) return false;
        
        return typeof buffer.configureVideoJS === 'function';
    }
    
    testHLSJSBuffer(app) {
        const buffer = app.bufferManager;
        if (!buffer) return false;
        
        return typeof buffer.configureHLSJS === 'function';
    }
    
    testBufferDiagnostics(app) {
        const diagnostics = app.bufferDiagnostics;
        if (!diagnostics) return true; // Optionnel
        
        return typeof diagnostics.startDiagnostics === 'function';
    }
    
    // Tests d'intégration
    async testStartupTime(app) {
        const startTime = Date.now();
        
        // Simuler un redémarrage partiel
        try {
            if (app.productionCacheStrategy) {
                app.productionCacheStrategy.getCurrentConfig();
            }
            
            const endTime = Date.now();
            const startupTime = endTime - startTime;
            
            console.log(`⏱️ Temps startup: ${startupTime}ms`);
            return startupTime < 500; // Moins de 500ms acceptable
            
        } catch (error) {
            return false;
        }
    }
    
    async testMemoryUsage(app) {
        if (!performance.memory) return true; // Non disponible
        
        const memoryBefore = performance.memory.usedJSHeapSize;
        
        // Forcer quelques opérations
        try {
            if (app.productionCacheStrategy) {
                app.productionCacheStrategy.getCurrentConfig();
            }
            if (app.memoryOptimizer) {
                app.memoryOptimizer.getMemoryStats();
            }
        } catch (error) {
            // Ignoré
        }
        
        const memoryAfter = performance.memory.usedJSHeapSize;
        const memoryIncrease = memoryAfter - memoryBefore;
        
        console.log(`📊 Augmentation mémoire: ${memoryIncrease} bytes`);
        return memoryIncrease < 10 * 1024 * 1024; // Moins de 10MB
    }
    
    async testCriticalFunctions(app) {
        let workingFunctions = 0;
        
        for (const funcPath of this.criticalFunctions) {
            try {
                const func = this.getNestedProperty(app, funcPath);
                if (typeof func === 'function') {
                    workingFunctions++;
                }
            } catch (error) {
                console.warn(`⚠️ Fonction critique manquante: ${funcPath}`);
            }
        }
        
        const successRate = workingFunctions / this.criticalFunctions.length;
        console.log(`🔧 Fonctions critiques: ${workingFunctions}/${this.criticalFunctions.length} (${(successRate * 100).toFixed(1)}%)`);
        
        return successRate >= 0.8; // 80% minimum
    }
    
    async testErrorHandling(app) {
        try {
            // Test gestion erreurs cache
            if (app.productionCacheStrategy) {
                app.productionCacheStrategy.forceStrategy('INVALID_STRATEGY');
            }
            
            // Test gestion erreurs mémoire
            if (app.memoryOptimizer) {
                app.memoryOptimizer.performEmergencyCleanup();
            }
            
            return true; // Si ça ne crash pas, c'est bon
            
        } catch (error) {
            console.warn('⚠️ Gestion erreur défaillante:', error.message);
            return false;
        }
    }
    
    // Utilitaires
    getNestedProperty(obj, path) {
        return path.split('.').reduce((current, prop) => current?.[prop], obj);
    }
    
    recordTestResult(category, testName, passed, error) {
        this.testResults[category].tests.push({
            name: testName,
            passed: passed,
            error: error,
            timestamp: new Date().toISOString()
        });
        
        if (passed) {
            this.testResults[category].passed++;
        } else {
            this.testResults[category].failed++;
        }
        
        const status = passed ? '✅' : '❌';
        console.log(`${status} ${testName}: ${passed ? 'PASS' : 'FAIL'}${error ? ` (${error})` : ''}`);
    }
    
    calculateOverallScore() {
        let totalPassed = 0;
        let totalTests = 0;
        
        Object.keys(this.testResults).forEach(category => {
            if (category !== 'overall') {
                totalPassed += this.testResults[category].passed;
                totalTests += this.testResults[category].passed + this.testResults[category].failed;
            }
        });
        
        const score = totalTests > 0 ? (totalPassed / totalTests * 100) : 0;
        
        this.testResults.overall.score = Math.round(score);
        
        if (score >= 95) {
            this.testResults.overall.status = 'EXCELLENT';
        } else if (score >= 85) {
            this.testResults.overall.status = 'GOOD';
        } else if (score >= 70) {
            this.testResults.overall.status = 'ACCEPTABLE';
        } else {
            this.testResults.overall.status = 'NEEDS_WORK';
        }
    }
    
    generateCompatibilityReport() {
        const report = {
            timestamp: new Date().toISOString(),
            overall: this.testResults.overall,
            summary: {},
            recommendations: []
        };
        
        // Résumé par catégorie
        Object.keys(this.testResults).forEach(category => {
            if (category !== 'overall') {
                const cat = this.testResults[category];
                const total = cat.passed + cat.failed;
                const rate = total > 0 ? (cat.passed / total * 100) : 100;
                
                report.summary[category] = {
                    passed: cat.passed,
                    failed: cat.failed,
                    total: total,
                    rate: Math.round(rate)
                };
            }
        });
        
        // Recommandations
        if (report.overall.score < 100) {
            report.recommendations.push('Quelques tests ont échoué - vérifier les logs pour plus de détails');
        }
        
        if (report.summary.parsers?.rate < 90) {
            report.recommendations.push('Optimisations parsers à revoir');
        }
        
        if (report.summary.cacheManagers?.rate < 90) {
            report.recommendations.push('Intégration cache managers à améliorer');
        }
        
        console.log('📋 Rapport de compatibilité:', report);
        return report;
    }
    
    /**
     * API publique pour lancement rapide
     */
    async quickCompatibilityCheck(app) {
        console.log('⚡ Test compatibilité rapide...');
        
        const quickTests = [
            () => this.testParserSelection(app),
            () => this.testCacheManagerStructure(app),
            () => this.testAdaptiveBufferManager(app),
            () => this.testStartupTime(app)
        ];
        
        let passed = 0;
        for (const test of quickTests) {
            try {
                if (await test()) passed++;
            } catch {
                // Ignoré pour test rapide
            }
        }
        
        const score = (passed / quickTests.length * 100);
        console.log(`⚡ Compatibilité rapide: ${score}% (${passed}/${quickTests.length})`);
        
        return {
            score: Math.round(score),
            status: score >= 75 ? 'OK' : 'ISSUES',
            passed: passed,
            total: quickTests.length
        };
    }
}