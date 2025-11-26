/**
 * ⚡ Test Performance - Stream Format
 */

import { videoSettingsService } from './src/services/VideoSettingsService';
import { playerManager } from './src/services/PlayerManager';

function measurePerformance(label, fn) {
  console.log(`\n⏱️ ${label}`);
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  console.log(`⚡ Temps: ${(end - start).toFixed(2)}ms`);
  return result;
}

async function testPerformance() {
  console.log('⚡ Test Performance Stream Format');
  console.log('=================================');

  // Test 1: Chargement des paramètres
  measurePerformance('Chargement paramètres', async () => {
    return await videoSettingsService.loadSettings();
  });

  // Test 2: Sauvegarde des paramètres
  measurePerformance('Sauvegarde paramètres', async () => {
    return await videoSettingsService.updateSetting('streamFormat', 'dash');
  });

  // Test 3: Optimisation d'URL (1000 fois)
  const testUrl = 'https://example.com/live/test.m3u8';
  measurePerformance('Optimisation URL (1000x)', () => {
    for (let i = 0; i < 1000; i++) {
      playerManager.optimizeStreamUrl(testUrl, 'hls');
    }
  });

  // Test 4: Analyse de format (1000 fois)
  measurePerformance('Analyse format (1000x)', () => {
    for (let i = 0; i < 1000; i++) {
      playerManager.analyzeStreamFormat(testUrl);
    }
  });
}

export { testPerformance };