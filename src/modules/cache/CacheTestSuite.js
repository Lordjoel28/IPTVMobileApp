/**
 * 🧪 SUITE DE TESTS POUR LE CACHE MULTI-NIVEAUX
 * Tests de performance et validation du système de cache
 */

import { CacheManager } from './CacheManager.js';

export class CacheTestSuite {
    constructor() {
        this.cacheManager = new CacheManager({
            l1MaxSize: 20,
            l2MaxSize: 10,
            l3MaxSize: 50,
            ttl: {
                test: 5000 // 5 secondes pour les tests
            },
            compressionEnabled: true,
            preloadEnabled: true
        });
        
        this.testResults = [];
        this.startTime = Date.now();
    }
    
    /**
     * Exécuter tous les tests
     */
    async runAllTests() {
        console.log('🧪 DÉMARRAGE TESTS CACHE MULTI-NIVEAUX');
        console.log('='.repeat(50));
        
        try {
            await this.testBasicOperations();
            await this.testCacheHierarchy();
            await this.testTTLExpiration();
            await this.testLRUEviction();
            await this.testPerformanceWithLargeData();
            await this.testConcurrentAccess();
            await this.testCacheMetrics();
            await this.testIPTVSpecificOperations();
            
            this.displayResults();
            
        } catch (error) {
            console.error('❌ Erreur lors des tests:', error);
        } finally {
            await this.cleanup();
        }
    }
    
    /**
     * Test des opérations de base
     */
    async testBasicOperations() {
        console.log('🔬 Test: Opérations de base');
        
        const testKey = 'test_basic';
        const testData = { message: 'Hello Cache!', timestamp: Date.now() };
        
        // Test SET
        const setResult = await this.cacheManager.set(testKey, testData, 'test');
        this.assert(setResult === true, 'SET operation should return true');
        
        // Test GET
        const getData = await this.cacheManager.get(testKey, 'test');
        this.assert(JSON.stringify(getData) === JSON.stringify(testData), 'GET should return exact data');
        
        // Test avec clé inexistante
        const noData = await this.cacheManager.get('nonexistent', 'test');
        this.assert(noData === null, 'GET with non-existent key should return null');
        
        this.logTestResult('Opérations de base', true);
    }
    
    /**
     * Test de la hiérarchie du cache (L1 → L2 → L3)
     */
    async testCacheHierarchy() {
        console.log('🔬 Test: Hiérarchie du cache');
        
        const testKey = 'test_hierarchy';
        const testData = { level: 'hierarchy_test', size: 1024 };
        
        // Vider le cache
        await this.cacheManager.clear();
        
        // Ajouter une donnée
        await this.cacheManager.set(testKey, testData, 'test');
        
        // Vérifier présence en L1
        const l1Result = this.cacheManager.getFromL1(testKey, 'test');
        this.assert(l1Result !== null, 'Data should be in L1 cache');
        
        // Simuler éviction L1
        this.cacheManager.l1Cache.clear();
        
        // Vérifier promotion depuis L2
        const l2Result = await this.cacheManager.get(testKey, 'test');
        this.assert(l2Result !== null, 'Data should be promoted from L2');
        
        // Vérifier re-promotion vers L1
        const l1AfterPromotion = this.cacheManager.getFromL1(testKey, 'test');
        this.assert(l1AfterPromotion !== null, 'Data should be back in L1');
        
        this.logTestResult('Hiérarchie du cache', true);
    }
    
    /**
     * Test d'expiration TTL
     */
    async testTTLExpiration() {
        console.log('🔬 Test: Expiration TTL');
        
        const testKey = 'test_ttl';
        const testData = { message: 'TTL test', timestamp: Date.now() };
        
        // Ajouter avec TTL court
        await this.cacheManager.set(testKey, testData, 'test');
        
        // Vérifier présence immédiate
        const immediate = await this.cacheManager.get(testKey, 'test');
        this.assert(immediate !== null, 'Data should be immediately available');
        
        // Attendre expiration
        await new Promise(resolve => setTimeout(resolve, 6000)); // 6 secondes
        
        // Vérifier expiration
        const expired = await this.cacheManager.get(testKey, 'test');
        this.assert(expired === null, 'Data should be expired');
        
        this.logTestResult('Expiration TTL', true);
    }
    
    /**
     * Test d'éviction LRU
     */
    async testLRUEviction() {
        console.log('🔬 Test: Éviction LRU');
        
        // Vider le cache
        await this.cacheManager.clear();
        
        // Remplir le cache L1 au maximum
        for (let i = 0; i < 25; i++) { // Plus que la limite de 20
            await this.cacheManager.set(`lru_test_${i}`, { index: i }, 'test');
        }
        
        // Vérifier que les plus anciens ont été évincés
        const oldestData = await this.cacheManager.get('lru_test_0', 'test');
        const newestData = await this.cacheManager.get('lru_test_24', 'test');
        
        this.assert(oldestData === null || this.cacheManager.l1Cache.size <= 20, 'LRU eviction should work');
        this.assert(newestData !== null, 'Newest data should still be in cache');
        
        this.logTestResult('Éviction LRU', true);
    }
    
    /**
     * Test de performance avec gros volumes
     */
    async testPerformanceWithLargeData() {
        console.log('🔬 Test: Performance avec gros volumes');
        
        const channelCount = 1000;
        const channels = this.generateMockChannels(channelCount);
        
        // Test d'écriture
        const writeStart = performance.now();
        await this.cacheManager.set('large_channels', channels, 'channels');
        const writeTime = performance.now() - writeStart;
        
        // Test de lecture
        const readStart = performance.now();
        const cachedChannels = await this.cacheManager.get('large_channels', 'channels');
        const readTime = performance.now() - readStart;
        
        this.assert(cachedChannels.length === channelCount, 'All channels should be cached');
        this.assert(writeTime < 100, `Write time should be < 100ms (actual: ${writeTime.toFixed(2)}ms)`);
        this.assert(readTime < 10, `Read time should be < 10ms (actual: ${readTime.toFixed(2)}ms)`);
        
        console.log(`  📊 Performance: Write=${writeTime.toFixed(2)}ms, Read=${readTime.toFixed(2)}ms`);
        
        this.logTestResult('Performance gros volumes', true);
    }
    
    /**
     * Test d'accès concurrent
     */
    async testConcurrentAccess() {
        console.log('🔬 Test: Accès concurrent');
        
        const promises = [];
        const concurrency = 50;
        
        // Créer plusieurs promesses d'écriture/lecture simultanées
        for (let i = 0; i < concurrency; i++) {
            promises.push(this.cacheManager.set(`concurrent_${i}`, { index: i }, 'test'));
        }
        
        // Attendre toutes les écritures
        await Promise.all(promises);
        
        // Créer plusieurs promesses de lecture simultanées
        const readPromises = [];
        for (let i = 0; i < concurrency; i++) {
            readPromises.push(this.cacheManager.get(`concurrent_${i}`, 'test'));
        }
        
        const results = await Promise.all(readPromises);
        
        // Vérifier que toutes les données sont présentes
        const validResults = results.filter(r => r !== null);
        this.assert(validResults.length >= concurrency * 0.8, 'At least 80% of concurrent operations should succeed');
        
        this.logTestResult('Accès concurrent', true);
    }
    
    /**
     * Test des métriques
     */
    async testCacheMetrics() {
        console.log('🔬 Test: Métriques du cache');
        
        // Vider le cache pour métriques propres
        await this.cacheManager.clear();
        
        // Générer quelques hits et misses
        await this.cacheManager.set('metrics_test', { data: 'test' }, 'test');
        await this.cacheManager.get('metrics_test', 'test'); // Hit
        await this.cacheManager.get('nonexistent', 'test'); // Miss
        
        const metrics = this.cacheManager.getMetrics();
        
        this.assert(metrics.hits.l1 >= 1, 'Should have at least 1 L1 hit');
        this.assert(metrics.misses >= 1, 'Should have at least 1 miss');
        this.assert(parseFloat(metrics.hitRate) >= 0, 'Hit rate should be a valid percentage');
        this.assert(metrics.totalRequests >= 2, 'Should have at least 2 total requests');
        
        console.log(`  📊 Métriques: Hit Rate=${metrics.hitRate}%, Total Requests=${metrics.totalRequests}`);
        
        this.logTestResult('Métriques du cache', true);
    }
    
    /**
     * Test des opérations spécifiques IPTV
     */
    async testIPTVSpecificOperations() {
        console.log('🔬 Test: Opérations spécifiques IPTV');
        
        const playlistId = 'test_playlist_123';
        const channels = this.generateMockChannels(100);
        
        // Test cache playlist
        await this.cacheManager.cachePlaylist(playlistId, { id: playlistId, channels });
        const cachedPlaylist = await this.cacheManager.getCachedPlaylist(playlistId);
        this.assert(cachedPlaylist !== null, 'Playlist should be cached');
        
        // Test cache channel list
        await this.cacheManager.cacheChannelList(playlistId, channels);
        const cachedChannels = await this.cacheManager.getCachedChannelList(playlistId);
        this.assert(cachedChannels.length === channels.length, 'Channel list should be cached');
        
        // Test cache search results
        const searchQuery = 'sport';
        const searchResults = channels.filter(c => c.group === 'Sports');
        await this.cacheManager.cacheSearchResults(searchQuery, playlistId, searchResults);
        const cachedSearch = await this.cacheManager.getCachedSearchResults(searchQuery, playlistId);
        this.assert(cachedSearch.length === searchResults.length, 'Search results should be cached');
        
        // Test cache logo
        const logoUrl = 'https://example.com/logo.png';
        const logoData = { url: logoUrl, cached: true };
        await this.cacheManager.cacheLogo(logoUrl, logoData);
        const cachedLogo = await this.cacheManager.getCachedLogo(logoUrl);
        this.assert(cachedLogo !== null, 'Logo should be cached');
        
        this.logTestResult('Opérations IPTV', true);
    }
    
    /**
     * Générer des chaînes de test
     */
    generateMockChannels(count) {
        const channels = [];
        const groups = ['Sports', 'News', 'Movies', 'Music', 'Kids'];
        
        for (let i = 0; i < count; i++) {
            channels.push({
                id: `channel_${i}`,
                name: `Channel ${i}`,
                group: groups[i % groups.length],
                logo: `https://example.com/logo_${i}.png`,
                url: `https://stream.example.com/channel_${i}.m3u8`
            });
        }
        
        return channels;
    }
    
    /**
     * Assertion helper
     */
    assert(condition, message) {
        if (!condition) {
            throw new Error(`Assertion failed: ${message}`);
        }
    }
    
    /**
     * Logger les résultats de test
     */
    logTestResult(testName, passed) {
        const status = passed ? '✅' : '❌';
        console.log(`  ${status} ${testName}`);
        
        this.testResults.push({
            name: testName,
            passed,
            timestamp: Date.now()
        });
    }
    
    /**
     * Afficher les résultats finaux
     */
    displayResults() {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(t => t.passed).length;
        const failedTests = totalTests - passedTests;
        const totalTime = Date.now() - this.startTime;
        
        console.log('='.repeat(50));
        console.log('📊 RÉSULTATS DES TESTS');
        console.log(`Total: ${totalTests}`);
        console.log(`✅ Réussis: ${passedTests}`);
        console.log(`❌ Échoués: ${failedTests}`);
        console.log(`⏱️ Temps total: ${totalTime}ms`);
        
        // Afficher les métriques finales
        const metrics = this.cacheManager.getMetrics();
        console.log('\n📈 MÉTRIQUES FINALES:');
        console.log(`Hit Rate: ${metrics.hitRate}%`);
        console.log(`Total Requests: ${metrics.totalRequests}`);
        console.log(`Average Response Time: ${metrics.averageResponseTime.toFixed(2)}ms`);
        console.log(`Cache Sizes: L1=${metrics.cacheSize.l1}, L2=${metrics.cacheSize.l2}, L3=${metrics.cacheSize.l3}`);
        
        if (failedTests === 0) {
            console.log('\n🎉 TOUS LES TESTS SONT PASSÉS!');
        } else {
            console.log('\n⚠️ CERTAINS TESTS ONT ÉCHOUÉ');
        }
    }
    
    /**
     * Nettoyage
     */
    async cleanup() {
        console.log('\n🧹 Nettoyage...');
        await this.cacheManager.clear();
        this.cacheManager.destroy();
        console.log('✅ Nettoyage terminé');
    }
}

// Exposer pour utilisation dans la console
window.CacheTestSuite = CacheTestSuite;

// Auto-exécution si lancé directement
if (typeof window !== 'undefined' && window.location.search.includes('test-cache')) {
    const testSuite = new CacheTestSuite();
    testSuite.runAllTests();
}