/**
 * 💾 Test AsyncStorage - Stream Format
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

async function checkStorage() {
  console.log('💾 Vérification AsyncStorage');
  console.log('=============================');

  try {
    // Lire les données brutes
    const rawData = await AsyncStorage.getItem('video_player_settings');
    console.log('📄 Données brutes:', rawData);

    if (rawData) {
      const parsed = JSON.parse(rawData);
      console.log('✅ Format actuel:', parsed.streamFormat);
      console.log('📋 Tous les paramètres:', parsed);
    }

    // Test écriture/lecture
    const testData = { streamFormat: 'mp4', test: true };
    await AsyncStorage.setItem('test_stream', JSON.stringify(testData));
    const readTest = await AsyncStorage.getItem('test_stream');
    console.log('🧪 Test écriture/lecture:', JSON.parse(readTest));

    // Nettoyer
    await AsyncStorage.removeItem('test_stream');
    console.log('🧹 Nettoyage terminé');

  } catch (error) {
    console.error('❌ Erreur AsyncStorage:', error);
  }
}

export { checkStorage };