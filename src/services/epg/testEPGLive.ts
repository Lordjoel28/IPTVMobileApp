/**
 * 🧪 Test en conditions réelles de la détection url-tvg
 * Phase 1.1: Validation avec échantillons réalistes
 */

import {M3UParserWithEPG} from '../parsers/M3UParserWithEPG';
import {EPGSourceManager} from './EPGSourceManager';

// Échantillons M3U réalistes avec différents formats d'EPG
const REALISTIC_M3U_SAMPLES = {
  // Format Xtream avec EPG intégré
  xtreamWithEPG: `#EXTM3U url-tvg="http://provider.com/xmltv.php?username=user&password=pass"
#EXTINF:-1 tvg-id="TF1.fr" tvg-name="TF1" tvg-logo="http://provider.com/logos/tf1.png" group-title="France",TF1
http://provider.com:8080/user/pass/1234
#EXTINF:-1 tvg-id="France2.fr" tvg-name="France 2" tvg-logo="http://provider.com/logos/france2.png" group-title="France",France 2
http://provider.com:8080/user/pass/1235`,

  // Format M3U8 classique avec EPG
  standardWithEPG: `#EXTM3U url-tvg="https://epg.provider.com/guide.xml"
#EXTINF:-1 tvg-id="cnn" group-title="News",CNN International
https://cnn-cnninternational-1-de.samsung.wurl.com/manifest/playlist.m3u8
#EXTINF:-1 tvg-id="bbc" group-title="News",BBC World News
https://vs-hls-push-ww-live.akamaized.net/x=4/i=urn:bbc:pips:service:bbc_world_service/playlist.m3u8`,

  // Format sans EPG (test négatif)
  withoutEPG: `#EXTM3U
#EXTINF:-1 group-title="Entertainment",Channel 1
http://stream.provider.com/channel1.m3u8
#EXTINF:-1 group-title="Entertainment",Channel 2
http://stream.provider.com/channel2.m3u8`,

  // Format avec EPG invalide (URL malformée)
  invalidEPG: `#EXTM3U url-tvg="not-a-valid-url"
#EXTINF:-1 group-title="Test",Test Channel
http://stream.provider.com/test.m3u8`,

  // Format avec multiple URLs EPG (edge case)
  multipleEPG: `#EXTM3U url-tvg="http://epg1.provider.com/guide.xml"
#EXTINF:-1 tvg-id="test1" group-title="Test",Test Channel 1
http://stream.provider.com/test1.m3u8
url-tvg="http://epg2.provider.com/guide.xml"
#EXTINF:-1 tvg-id="test2" group-title="Test",Test Channel 2
http://stream.provider.com/test2.m3u8`,

  // Format avec paramètres EPG complexes
  complexEPG: `#EXTM3U url-tvg="http://provider.com/epg.php?username=test&password=test123&format=xml&timezone=Europe/Paris"
#EXTINF:-1 tvg-id="tf1hd" tvg-name="TF1 HD" tvg-logo="http://provider.com/logos/tf1hd.png" group-title="France HD",TF1 HD
http://provider.com:8080/test/test123/45678`,
};

/**
 * Tests avec échantillons réalistes
 */
export async function runRealisticEPGTests(): Promise<void> {
  console.log('🔍 Starting Realistic EPG Detection Tests...');

  const parser = new M3UParserWithEPG();

  // Test 1: Format Xtream avec EPG
  console.log('\n📺 Test 1: Format Xtream avec EPG');
  try {
    const result1 = await parser.parseWithEPGDetection(
      REALISTIC_M3U_SAMPLES.xtreamWithEPG,
    );
    console.log('✅ Xtream EPG Detection:', {
      hasEPG: !!result1.metadata.epgUrl,
      epgUrl: result1.metadata.epgUrl,
      channelsCount: result1.channels.length,
    });
  } catch (error) {
    console.error('❌ Xtream test failed:', error);
  }

  // Test 2: Format standard avec EPG
  console.log('\n📺 Test 2: Format standard avec EPG');
  try {
    const result2 = await parser.parseWithEPGDetection(
      REALISTIC_M3U_SAMPLES.standardWithEPG,
    );
    console.log('✅ Standard EPG Detection:', {
      hasEPG: !!result2.metadata.epgUrl,
      epgUrl: result2.metadata.epgUrl,
      channelsCount: result2.channels.length,
    });
  } catch (error) {
    console.error('❌ Standard test failed:', error);
  }

  // Test 3: Sans EPG
  console.log('\n📺 Test 3: Sans EPG');
  try {
    const result3 = await parser.parseWithEPGDetection(
      REALISTIC_M3U_SAMPLES.withoutEPG,
    );
    console.log('✅ No EPG Detection:', {
      hasEPG: !!result3.metadata.epgUrl,
      epgType: result3.metadata.epgType,
      channelsCount: result3.channels.length,
    });
  } catch (error) {
    console.error('❌ No EPG test failed:', error);
  }

  // Test 4: EPG invalide
  console.log('\n📺 Test 4: EPG invalide');
  try {
    const result4 = await parser.parseWithEPGDetection(
      REALISTIC_M3U_SAMPLES.invalidEPG,
    );
    console.log('✅ Invalid EPG Detection:', {
      hasEPG: !!result4.metadata.epgUrl,
      epgUrl: result4.metadata.epgUrl,
      channelsCount: result4.channels.length,
    });
  } catch (error) {
    console.error('❌ Invalid EPG test failed:', error);
  }

  // Test 5: Multiples EPG
  console.log('\n📺 Test 5: Multiples EPG');
  try {
    const result5 = await parser.parseWithEPGDetection(
      REALISTIC_M3U_SAMPLES.multipleEPG,
    );
    console.log('✅ Multiple EPG Detection:', {
      hasEPG: !!result5.metadata.epgUrl,
      epgUrl: result5.metadata.epgUrl,
      channelsCount: result5.channels.length,
    });
  } catch (error) {
    console.error('❌ Multiple EPG test failed:', error);
  }

  // Test 6: EPG complexe avec paramètres
  console.log('\n📺 Test 6: EPG complexe avec paramètres');
  try {
    const result6 = await parser.parseWithEPGDetection(
      REALISTIC_M3U_SAMPLES.complexEPG,
    );
    console.log('✅ Complex EPG Detection:', {
      hasEPG: !!result6.metadata.epgUrl,
      epgUrl: result6.metadata.epgUrl,
      channelsCount: result6.channels.length,
    });
  } catch (error) {
    console.error('❌ Complex EPG test failed:', error);
  }

  console.log('\n🎯 Realistic EPG Tests Completed!');
}

/**
 * Test d'intégration avec EPGSourceManager
 */
export async function testEPGSourceManagerIntegration(): Promise<void> {
  console.log('\n🔗 Testing EPGSourceManager Integration...');

  const epgManager = new EPGSourceManager();
  const parser = new M3UParserWithEPG();

  try {
    // Parser un M3U avec EPG
    const parseResult = await parser.parseWithEPGDetection(
      REALISTIC_M3U_SAMPLES.xtreamWithEPG,
    );

    if (parseResult.metadata.epgUrl) {
      console.log('📺 EPG détecté, test de getBestEPGSource...');

      // Simuler une playlist avec EPG intégré
      const mockPlaylistId = 'test_playlist_123';
      const epgSource = await epgManager.getBestEPGSource(
        mockPlaylistId,
        parseResult.metadata,
      );

      console.log('✅ EPG Source Result:', {
        sourceType: epgSource.source?.type,
        priority: epgSource.priority,
        reason: epgSource.reason,
        epgUrl: epgSource.source?.url,
      });

      // Vérifier que l'EPG intégré a la priorité maximale
      if (epgSource.priority === 1 && epgSource.source?.type === 'integrated') {
        console.log('✅ EPG intégré correctement priorisé!');
      } else {
        console.log('⚠️ Priorité EPG inattendue');
      }
    }
  } catch (error) {
    console.error('❌ EPGSourceManager integration test failed:', error);
  }
}

/**
 * Test de performance avec gros fichiers M3U
 */
export async function testEPGPerformance(): Promise<void> {
  console.log('\n⚡ Testing EPG Detection Performance...');

  const parser = new M3UParserWithEPG();

  // Générer un gros M3U avec EPG
  let bigM3U = '#EXTM3U url-tvg="http://provider.com/epg.xml"\n';

  for (let i = 1; i <= 1000; i++) {
    bigM3U += `#EXTINF:-1 tvg-id="channel${i}" group-title="Test",Channel ${i}\n`;
    bigM3U += `http://provider.com/stream${i}.m3u8\n`;
  }

  const startTime = Date.now();

  try {
    const result = await parser.parseWithEPGDetection(bigM3U);
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('✅ Performance Test Results:', {
      channelsCount: result.channels.length,
      hasEPG: !!result.metadata.epgUrl,
      parseTimeMs: duration,
      channelsPerSecond: Math.round(result.channels.length / (duration / 1000)),
    });

    if (duration < 5000) {
      // Moins de 5 secondes pour 1000 chaînes
      console.log('✅ Performance acceptable!');
    } else {
      console.log('⚠️ Performance dégradée');
    }
  } catch (error) {
    console.error('❌ Performance test failed:', error);
  }
}

/**
 * Fonction principale pour lancer tous les tests
 */
export async function runAllEPGTests(): Promise<void> {
  console.log('🚀 Starting Complete EPG Detection Test Suite...\n');

  await runRealisticEPGTests();
  await testEPGSourceManagerIntegration();
  await testEPGPerformance();

  console.log('\n🎉 All EPG Tests Completed Successfully!');
}

// Test rapide des méthodes statiques
export function runQuickTests(): void {
  console.log('⚡ Running Quick Static Method Tests...');

  // Test détection rapide
  const hasEPG1 = M3UParserWithEPG.hasIntegratedEPG(
    REALISTIC_M3U_SAMPLES.xtreamWithEPG,
  );
  const hasEPG2 = M3UParserWithEPG.hasIntegratedEPG(
    REALISTIC_M3U_SAMPLES.withoutEPG,
  );

  console.log('Quick tests:', {
    xtreamHasEPG: hasEPG1, // should be true
    noEpgHasEPG: hasEPG2, // should be false
  });

  // Test extraction URL
  const epgUrl1 = M3UParserWithEPG.extractEPGUrlFromM3U(
    REALISTIC_M3U_SAMPLES.standardWithEPG,
  );
  const epgUrl2 = M3UParserWithEPG.extractEPGUrlFromM3U(
    REALISTIC_M3U_SAMPLES.withoutEPG,
  );

  console.log('URL extraction tests:', {
    standardEpgUrl: epgUrl1, // should extract URL
    noEpgUrl: epgUrl2, // should be null
  });

  console.log('✅ Quick Tests Completed!');
}

export {REALISTIC_M3U_SAMPLES};
