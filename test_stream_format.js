/**
 * 🧪 Test Script - Stream Format Functionality
 */

import { videoSettingsService } from './src/services/VideoSettingsService';
import { playerManager } from './src/services/PlayerManager';

// Test URLs
const testUrls = {
  hls: 'https://example.com/live/stream.m3u8',
  dash: 'https://example.com/live/stream.mpd',
  mp4: 'https://example.com/recordings/video.mp4',
  direct_m3u8: 'https://example.com/direct/index.m3u8'
};

async function testStreamFormat() {
  console.log('🧪 Test Stream Format Functionality');
  console.log('=====================================');

  try {
    // 1. Test chargement paramètres
    console.log('\n1️⃣ Test chargement paramètres...');
    const settings = await videoSettingsService.loadSettings();
    console.log('✅ Paramètres chargés:', settings.streamFormat);

    // 2. Test changement de format
    console.log('\n2️⃣ Test changement de format...');
    const formats = ['hls', 'dash', 'mp4', 'direct_m3u8'];

    for (const format of formats) {
      console.log(`\n📡 Test format: ${format.toUpperCase()}`);

      // Sauvegarder le format
      const success = await videoSettingsService.updateSetting('streamFormat', format);
      console.log(`💾 Sauvegarde ${format}: ${success ? '✅' : '❌'}`);

      // Vérifier la sauvegarde
      const newSettings = await videoSettingsService.loadSettings();
      console.log(`✅ Vérification: ${newSettings.streamFormat}`);

      // Tester l'optimisation d'URL
      const optimizedUrl = playerManager.optimizeStreamUrl(testUrls.hls, format);
      console.log(`🔗 URL optimisée: ${optimizedUrl.substring(0, 50)}...`);
    }

    // 3. Test remise à défaut
    console.log('\n3️⃣ Test remise à défaut...');
    const resetSuccess = await videoSettingsService.updateSetting('streamFormat', 'hls');
    console.log(`🔄 Reset HLS: ${resetSuccess ? '✅' : '❌'}`);

    console.log('\n🎉 Test terminé !');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Test des conversions d'URL
function testUrlConversions() {
  console.log('\n🔗 Test URL Conversions');
  console.log('=========================');

  const testUrl = 'https://iptv.example.com/live/channel123';
  const formats = ['hls', 'dash', 'mp4', 'direct_m3u8'];

  formats.forEach(format => {
    const optimized = playerManager.optimizeStreamUrl(testUrl, format);
    console.log(`${format.toUpperCase()}: ${testUrl} → ${optimized}`);
  });
}

// Lancer les tests
if (require.main === module) {
  testStreamFormat();
  testUrlConversions();
}

export { testStreamFormat, testUrlConversions };