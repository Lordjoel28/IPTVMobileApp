/**
 * 🧪 TEST DU CACHE MANAGER REACT NATIVE
 * Valide que la migration fonctionne correctement
 */

import { CacheManager } from './CacheManager';

export class CacheTest {
    constructor() {
        this.cache = new CacheManager({
            l1MaxSize: 10,
            l2MaxSize: 5,
            l3MaxSize: 15,
            ttl: {
                channels: 60000, // 1 minute pour test
                logos: 120000    // 2 minutes pour test
            }
        });
    }

    async runAllTests() {
        console.log('🧪 === DÉBUT DES TESTS CACHE MANAGER ===');
        
        try {
            await this.testBasicSetGet();
            await this.testMultiLevel();
            await this.testTTL();
            await this.testPreload();
            await this.testStats();
            await this.testChannelData();
            
            console.log('✅ === TOUS LES TESTS RÉUSSIS ===');
            
        } catch (error) {
            console.error('❌ === ÉCHEC DES TESTS ===', error);
        }
    }

    async testBasicSetGet() {
        console.log('\n🔬 Test 1: Set/Get basique');
        
        const testData = { name: 'Test Channel', url: 'http://test.m3u8' };
        
        // Set
        await this.cache.set('test-channel', testData, 'channels');
        
        // Get
        const retrieved = await this.cache.get('test-channel', 'channels');
        
        if (JSON.stringify(retrieved) === JSON.stringify(testData)) {
            console.log('✅ Set/Get basique fonctionne');
        } else {
            throw new Error('Échec Set/Get basique');
        }
    }

    async testMultiLevel() {
        console.log('\n🔬 Test 2: Cache multi-niveaux');
        
        const testData = { 
            channels: Array.from({length: 100}, (_, i) => ({
                id: i,
                name: `Channel ${i}`,
                url: `http://test${i}.m3u8`
            }))
        };
        
        // Remplir le cache
        await this.cache.set('big-playlist', testData, 'channels');
        
        // Forcer éviction L1 avec beaucoup de données
        for (let i = 0; i < 15; i++) {
            await this.cache.set(`filler-${i}`, { data: 'x'.repeat(1000) }, 'channels');
        }
        
        // Vérifier que les données sont récupérables depuis L2/L3
        const retrieved = await this.cache.get('big-playlist', 'channels');
        
        if (retrieved && retrieved.channels.length === 100) {
            console.log('✅ Cache multi-niveaux fonctionne');
        } else {
            throw new Error('Échec cache multi-niveaux');
        }
    }

    async testTTL() {
        console.log('\n🔬 Test 3: Expiration TTL');
        
        const testData = { name: 'Expire Test' };
        
        // Set avec TTL court
        await this.cache.set('expire-test', testData, 'channels', { ttl: 100 }); // 100ms
        
        // Immédiatement disponible
        let retrieved = await this.cache.get('expire-test', 'channels');
        if (!retrieved) {
            throw new Error('Données pas disponibles immédiatement');
        }
        
        // Attendre expiration
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // Plus disponible
        retrieved = await this.cache.get('expire-test', 'channels');
        if (retrieved) {
            throw new Error('Données pas expirées');
        }
        
        console.log('✅ TTL fonctionne');
    }

    async testPreload() {
        console.log('\n🔬 Test 4: Préchargement');
        
        const channels = Array.from({length: 50}, (_, i) => ({
            id: `ch${i}`,
            name: `Channel ${i}`,
            logo: `http://logo${i}.png`,
            url: `http://stream${i}.m3u8`
        }));
        
        // Précharger
        await this.cache.preloadChannelData(channels);
        
        // Vérifier quelques chaînes
        const ch1 = await this.cache.get('channel:ch1', 'channels');
        const logo1 = await this.cache.get('logo:ch1', 'logos');
        
        if (ch1 && logo1) {
            console.log('✅ Préchargement fonctionne');
        } else {
            throw new Error('Échec préchargement');
        }
    }

    async testStats() {
        console.log('\n🔬 Test 5: Statistiques');
        
        // Générer des hits/misses
        await this.cache.get('nonexistent-key', 'channels'); // Miss
        await this.cache.set('stats-test', { data: 'test' }, 'channels');
        await this.cache.get('stats-test', 'channels'); // Hit
        
        const stats = this.cache.getStats();
        
        if (stats.totalGets > 0 && stats.totalSets > 0) {
            console.log('✅ Statistiques fonctionnent');
            console.log(`📊 Hit rate total: ${stats.totalHitRate}%`);
            console.log(`📊 L1 hits: ${stats.l1Hits}, L2 hits: ${stats.l2Hits}`);
        } else {
            throw new Error('Échec statistiques');
        }
    }

    async testChannelData() {
        console.log('\n🔬 Test 6: Données chaînes réelles');
        
        // Simuler données IPTV réelles
        const channelData = {
            id: 'fr-tf1',
            name: 'TF1 HD',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/d/da/TF1_logo_2013.png',
            group: 'France',
            url: 'http://iptv.example.com/tf1.m3u8',
            country: 'FR',
            language: 'fr'
        };
        
        // Stocker
        await this.cache.set(`channel:${channelData.id}`, channelData, 'channels');
        await this.cache.set(`logo:${channelData.id}`, channelData.logo, 'logos');
        
        // Récupérer
        const retrievedChannel = await this.cache.get(`channel:${channelData.id}`, 'channels');
        const retrievedLogo = await this.cache.get(`logo:${channelData.id}`, 'logos');
        
        if (retrievedChannel && retrievedLogo === channelData.logo) {
            console.log('✅ Données chaînes IPTV fonctionnent');
        } else {
            throw new Error('Échec données chaînes');
        }
    }
}

// Export pour utilisation dans l'app
export const runCacheTests = async () => {
    const tester = new CacheTest();
    await tester.runAllTests();
};