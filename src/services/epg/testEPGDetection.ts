/**
 * 🧪 Test unitaire pour la détection url-tvg
 * Phase 1.1: Validation du parser M3UParserWithEPG
 */

import PlaylistManager from '../playlist/PlaylistManager';

// Échantillons de contenu M3U avec différents formats url-tvg
const M3U_SAMPLES = {
  withEPG: `#EXTM3U url-tvg="https://example.com/epg.xml"
#EXTINF:-1 tvg-id="canal1" group-title="Général",Canal Test 1
http://stream1.example.com/live.m3u8
#EXTINF:-1 tvg-id="canal2" group-title="Sport",Canal Test 2
http://stream2.example.com/live.m3u8`,

  withEPGQuotes: `#EXTM3U url-tvg='https://example.com/guide.xml'
#EXTINF:-1 tvg-id="canal1" group-title="Général",Canal Test 1
http://stream1.example.com/live.m3u8`,

  withEPGNoQuotes: `#EXTM3U url-tvg=https://example.com/xmltv.xml
#EXTINF:-1 tvg-id="canal1" group-title="Général",Canal Test 1
http://stream1.example.com/live.m3u8`,

  withoutEPG: `#EXTM3U
#EXTINF:-1 tvg-id="canal1" group-title="Général",Canal Test 1
http://stream1.example.com/live.m3u8
#EXTINF:-1 tvg-id="canal2" group-title="Sport",Canal Test 2
http://stream2.example.com/live.m3u8`,

  withEPGInMiddle: `#EXTM3U
#EXTINF:-1 tvg-id="canal1" group-title="Général",Canal Test 1
http://stream1.example.com/live.m3u8
url-tvg="https://example.com/middle-epg.xml"
#EXTINF:-1 tvg-id="canal2" group-title="Sport",Canal Test 2
http://stream2.example.com/live.m3u8`
};

/**
 * Tests de détection EPG
 */
export async function runEPGDetectionTests(): Promise<void> {
  console.log('🧪 Starting EPG Detection Tests...');

  const playlistManager = new PlaylistManager();
  await playlistManager.initialize();

  // Test 1: M3U avec EPG entre guillemets doubles
  console.log('\n📋 Test 1: M3U avec url-tvg entre guillemets doubles');
  const test1 = await playlistManager.testEPGDetection(M3U_SAMPLES.withEPG);
  console.log('Result:', test1);
  console.assert(test1.hasEPG === true, 'Should detect EPG');
  console.assert(test1.epgUrl === 'https://example.com/epg.xml', 'Should extract correct URL');

  // Test 2: M3U avec EPG entre guillemets simples
  console.log('\n📋 Test 2: M3U avec url-tvg entre guillemets simples');
  const test2 = await playlistManager.testEPGDetection(M3U_SAMPLES.withEPGQuotes);
  console.log('Result:', test2);
  console.assert(test2.hasEPG === true, 'Should detect EPG');
  console.assert(test2.epgUrl === 'https://example.com/guide.xml', 'Should extract correct URL');

  // Test 3: M3U avec EPG sans guillemets
  console.log('\n📋 Test 3: M3U avec url-tvg sans guillemets');
  const test3 = await playlistManager.testEPGDetection(M3U_SAMPLES.withEPGNoQuotes);
  console.log('Result:', test3);
  console.assert(test3.hasEPG === true, 'Should detect EPG');
  console.assert(test3.epgUrl === 'https://example.com/xmltv.xml', 'Should extract correct URL');

  // Test 4: M3U sans EPG
  console.log('\n📋 Test 4: M3U sans url-tvg');
  const test4 = await playlistManager.testEPGDetection(M3U_SAMPLES.withoutEPG);
  console.log('Result:', test4);
  console.assert(test4.hasEPG === false, 'Should not detect EPG');
  console.assert(test4.epgType === 'none', 'Should be type none');

  // Test 5: M3U avec EPG au milieu du contenu
  console.log('\n📋 Test 5: M3U avec url-tvg au milieu');
  const test5 = await playlistManager.testEPGDetection(M3U_SAMPLES.withEPGInMiddle);
  console.log('Result:', test5);
  console.assert(test5.hasEPG === true, 'Should detect EPG even in middle');
  console.assert(test5.epgUrl === 'https://example.com/middle-epg.xml', 'Should extract correct URL');

  console.log('\n✅ All EPG Detection Tests Completed!');

  await playlistManager.cleanup();
}

/**
 * Test d'intégration complète
 */
export async function runIntegrationTest(): Promise<void> {
  console.log('\n🔗 Starting Integration Test...');

  const playlistManager = new PlaylistManager();
  await playlistManager.initialize();

  try {
    // Simuler import d'une playlist avec EPG
    const testM3U = M3U_SAMPLES.withEPG;

    // Créer un mock pour test (sans vraie URL)
    console.log('📺 Testing full integration with mock data...');

    const result = await playlistManager.testEPGDetection(testM3U);
    console.log('EPG Detection Result:', result);

    if (result.hasEPG) {
      console.log('✅ Integration test successful - EPG would be configured automatically');
    } else {
      console.error('❌ Integration test failed - EPG not detected');
    }

  } catch (error) {
    console.error('❌ Integration test failed:', error);
  }

  await playlistManager.cleanup();
}

// Export pour utilisation dans d'autres fichiers
export { M3U_SAMPLES };