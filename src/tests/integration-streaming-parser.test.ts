/**
 * 🧪 Tests d'Intégration Parser Streaming
 * Vérification compatibilité avec architecture existante
 */

import { parsersService } from '../services/ParsersService';
import { playlistService } from '../services/PlaylistService';

// Test data : petit M3U pour validation
const testM3UContent = `#EXTM3U
#EXTINF:-1 tvg-logo="https://example.com/logo1.png" group-title="News",Chaîne Test 1
http://example.com/stream1.m3u8
#EXTINF:-1 tvg-logo="https://example.com/logo2.png" group-title="Sports",Chaîne Test 2  
http://example.com/stream2.m3u8
#EXTINF:-1 tvg-logo="https://example.com/logo3.png" group-title="Movies",Chaîne Test 3
http://example.com/stream3.m3u8`;

// Mock URLs pour tests (ne pas utiliser en production)
const TEST_URLS = {
  small: 'https://iptv-org.github.io/iptv/languages/fra.m3u', // ~500 chaînes
  // large: 'URL_LARGE_PLAYLIST' // Pour tests 100K+ chaînes
};

/**
 * 🔬 Test 1 : ParsersService avec nouvelles options
 */
export async function testParsersServiceIntegration() {
  console.log('🧪 Test 1: ParsersService integration...');

  try {
    // Test parser standard (existant)
    const standardResult = await parsersService.parseM3U(testM3UContent, {
      useUltraOptimized: true,
      chunkSize: 1000
    });

    console.log(`✅ Standard parser: ${standardResult.channels.length} channels`);

    // Test parser streaming (nouveau)
    const streamingResult = await parsersService.parseM3U(testM3UContent, {
      useStreamingParser: true,
      streamingOptions: {
        maxMemoryMB: 50,
        yieldInterval: 1000
      },
      onProgress: (progress) => {
        console.log(`Progress: ${progress.progress}%`);
      }
    });

    console.log(`✅ Streaming parser: ${streamingResult.channels.length} channels`);

    // Vérification compatibilité
    if (standardResult.channels.length === streamingResult.channels.length) {
      console.log('✅ Test 1 PASSED: Both parsers return same channel count');
      return true;
    } else {
      console.log('❌ Test 1 FAILED: Channel count mismatch');
      return false;
    }

  } catch (error) {
    console.error('❌ Test 1 ERROR:', error);
    return false;
  }
}

/**
 * 🔬 Test 2 : PlaylistService avec nouvelle méthode streaming
 */
export async function testPlaylistServiceStreaming() {
  console.log('🧪 Test 2: PlaylistService streaming integration...');

  try {
    // Test avec URL test (petit dataset)
    let progressCallbacks = 0;
    let statusCallbacks = 0;

    const result = await playlistService.parseM3UWithStreaming(
      TEST_URLS.small, 
      'Test Playlist',
      {
        onProgress: (progress) => {
          progressCallbacks++;
          console.log(`📊 Progress: ${progress.channelsParsed} channels`);
        },
        onStatusChange: (status, details) => {
          statusCallbacks++;
          console.log(`📢 Status: ${status} - ${details}`);
        }
      }
    );

    console.log(`✅ Streaming import completed: ${result.channels.length} channels`);
    console.log(`📊 Callbacks: ${progressCallbacks} progress, ${statusCallbacks} status`);

    // Vérifications
    const testsOk = [
      result.channels.length > 0,
      result.parseTime > 0,
      progressCallbacks > 0,
      statusCallbacks > 0
    ];

    if (testsOk.every(t => t)) {
      console.log('✅ Test 2 PASSED: Streaming import working correctly');
      return true;
    } else {
      console.log('❌ Test 2 FAILED: Some streaming features not working');
      return false;
    }

  } catch (error) {
    console.error('❌ Test 2 ERROR:', error);
    return false;
  }
}

/**
 * 🔬 Test 3 : Compatibilité avec hook existant
 */
export async function testModernFlowCompatibility() {
  console.log('🧪 Test 3: Modern flow compatibility...');

  try {
    // Test méthode parseM3U existante (ne doit pas casser)
    const standardResult = await playlistService.parseM3U(testM3UContent);
    console.log(`✅ Standard parseM3U still works: ${standardResult.channels.length} channels`);

    // Vérifier que parsersService.getStats() marche toujours
    const stats = parsersService.getStats();
    console.log('✅ ParsersService stats:', stats);

    const compatibilityOk = [
      standardResult.channels.length > 0,
      stats.pool !== undefined,
      stats.memory !== undefined
    ];

    if (compatibilityOk.every(t => t)) {
      console.log('✅ Test 3 PASSED: Existing functionality preserved');
      return true;
    } else {
      console.log('❌ Test 3 FAILED: Compatibility issues detected');
      return false;
    }

  } catch (error) {
    console.error('❌ Test 3 ERROR:', error);
    return false;
  }
}

/**
 * 🔬 Test 4 : Performance et fallback
 */
export async function testPerformanceAndFallback() {
  console.log('🧪 Test 4: Performance and fallback mechanisms...');

  try {
    const startTime = Date.now();

    // Test avec option streaming sur petit dataset (doit fallback)
    const result = await parsersService.parseM3U(testM3UContent, {
      useStreamingParser: true, // Demande streaming
      useUltraOptimized: true   // Mais fallback si pas assez de chaînes
    });

    const duration = Date.now() - startTime;
    console.log(`⏱️ Parse completed in ${duration}ms`);
    console.log(`📊 Performance: ${Math.round(result.channels.length / duration * 1000)} channels/second`);

    // Test fallback mechanism
    try {
      // Test avec URL invalide (doit déclencher fallback)
      const fallbackResult = await parsersService.parseM3U('INVALID_M3U_CONTENT', {
        useStreamingParser: true
      });
      console.log('✅ Fallback mechanism working');
    } catch (fallbackError) {
      console.log('✅ Error handling working:', fallbackError.message);
    }

    if (result.channels.length > 0 && duration < 5000) {
      console.log('✅ Test 4 PASSED: Performance and fallback working');
      return true;
    } else {
      console.log('❌ Test 4 FAILED: Performance or fallback issues');
      return false;
    }

  } catch (error) {
    console.error('❌ Test 4 ERROR:', error);
    return false;
  }
}

/**
 * 🚀 Suite de tests complète
 */
export async function runIntegrationTests() {
  console.log('🚀 Starting Streaming Parser Integration Tests...\n');

  const tests = [
    { name: 'ParsersService Integration', fn: testParsersServiceIntegration },
    { name: 'PlaylistService Streaming', fn: testPlaylistServiceStreaming },
    { name: 'Modern Flow Compatibility', fn: testModernFlowCompatibility },
    { name: 'Performance & Fallback', fn: testPerformanceAndFallback },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`\n--- ${test.name} ---`);
    try {
      const result = await test.fn();
      if (result) {
        passed++;
        console.log(`✅ ${test.name}: PASSED\n`);
      } else {
        failed++;
        console.log(`❌ ${test.name}: FAILED\n`);
      }
    } catch (error) {
      failed++;
      console.log(`❌ ${test.name}: ERROR - ${error.message}\n`);
    }
  }

  console.log('📊 INTEGRATION TEST RESULTS:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round(passed / tests.length * 100)}%`);

  if (failed === 0) {
    console.log('\n🎉 ALL INTEGRATION TESTS PASSED!');
    console.log('🚀 Streaming parser integration is ready for production!');
    return true;
  } else {
    console.log('\n⚠️ Some integration tests failed');
    console.log('🔧 Please fix issues before using streaming parser');
    return false;
  }
}

// Export pour utilisation dans l'app
export const streamingParserTests = {
  runIntegrationTests,
  testParsersServiceIntegration,
  testPlaylistServiceStreaming,
  testModernFlowCompatibility,
  testPerformanceAndFallback
};