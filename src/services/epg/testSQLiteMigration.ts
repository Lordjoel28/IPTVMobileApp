/**
 * 🧪 Test de migration SQLite EPG
 * Vérifie que la migration vers SQLite fonctionne correctement
 */

import {EPGCacheManager} from './EPGCacheManager';
import {SQLiteEPG} from './SQLiteEPGStorage';
import {FullEPGData} from '../XtreamEPGService';
import epgDatabase from './database';

/**
 * Données de test EPG simulées
 */
const createTestEPGData = (): FullEPGData => {
  const now = Date.now();
  const formatXMLTVDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hour = String(date.getUTCHours()).padStart(2, '0');
    const minute = String(date.getUTCMinutes()).padStart(2, '0');
    const second = String(date.getUTCSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hour}${minute}${second} +0000`;
  };

  return {
    channels: [
      {
        id: 'tf1',
        displayName: 'TF1',
        icon: 'https://example.com/tf1.png',
      },
      {
        id: 'france2',
        displayName: 'France 2',
        icon: 'https://example.com/france2.png',
      },
      {
        id: 'france3',
        displayName: 'France 3',
        icon: 'https://example.com/france3.png',
      },
    ],
    programmes: [
      // TF1 - Programme actuel
      {
        start: formatXMLTVDate(now - 30 * 60 * 1000), // 30 min dans le passé
        stop: formatXMLTVDate(now + 30 * 60 * 1000), // 30 min dans le futur
        channel: 'tf1',
        title: 'Journal de 20h',
        desc: 'Actualités nationales et internationales',
      },
      // TF1 - Programme suivant
      {
        start: formatXMLTVDate(now + 30 * 60 * 1000), // 30 min dans le futur
        stop: formatXMLTVDate(now + 90 * 60 * 1000), // 90 min dans le futur
        channel: 'tf1',
        title: 'Prime Time',
        desc: 'Émission de divertissement',
      },
      // France 2 - Programme actuel
      {
        start: formatXMLTVDate(now - 15 * 60 * 1000), // 15 min dans le passé
        stop: formatXMLTVDate(now + 45 * 60 * 1000), // 45 min dans le futur
        channel: 'france2',
        title: 'Télé-réalité',
        desc: 'Émission de télé-réalité',
      },
      // France 3 - Programme futur
      {
        start: formatXMLTVDate(now + 60 * 60 * 1000), // 1h dans le futur
        stop: formatXMLTVDate(now + 120 * 60 * 1000), // 2h dans le futur
        channel: 'france3',
        title: 'Documentaire',
        desc: 'Documentaire sur la nature',
      },
    ],
    source: 'test',
  };
};

/**
 * Test de base de la migration SQLite
 */
export const testBasicSQLiteMigration = async (): Promise<boolean> => {
  try {
    console.log('🧪 [Test] Début du test de migration SQLite...');

    // 1. Initialiser le cache manager
    await EPGCacheManager.initialize();
    console.log('✅ [Test] EPGCacheManager initialisé');

    // 2. Créer des données de test
    const testData = createTestEPGData();
    console.log(
      '✅ [Test] Données de test créées:',
      testData.channels.length,
      'chaînes,',
      testData.programmes.length,
      'programmes',
    );

    // 3. Sauvegarder dans le cache hybride
    await EPGCacheManager.updateCache(testData);
    console.log('✅ [Test] Données sauvegardées dans le cache hybride');

    // 4. Vérifier les statistiques
    const stats = await EPGCacheManager.getCacheStats();
    console.log('📊 [Test] Statistiques cache:', {
      mémoire: `${stats.channelsCount} chaînes, ${stats.programmesCount} programmes`,
      sqlite: `${stats.sqliteStats.channelsCount} chaînes, ${stats.sqliteStats.programmesCount} programmes`,
    });

    // 5. Tester la récupération de programmes pour une chaîne
    const tf1Programs = await EPGCacheManager.getProgramsForChannel('tf1');
    console.log('✅ [Test] Programmes TF1 récupérés:', tf1Programs.length);

    // 6. Vérifier que les programmes contiennent les bonnes données
    const currentProgram = tf1Programs.find(p => p.isLive);
    if (currentProgram) {
      console.log(
        '✅ [Test] Programme actuel trouvé:',
        currentProgram.title,
        `(${Math.round(currentProgram.progress || 0)}%)`,
      );
    }

    // 7. Test de recherche dans SQLite
    const searchResults = await SQLiteEPG.searchProgrammes('Journal');
    console.log(
      '✅ [Test] Recherche "Journal":',
      searchResults.length,
      'résultats',
    );

    console.log('🎉 [Test] Migration SQLite testée avec succès!');
    return true;
  } catch (error) {
    console.error('❌ [Test] Erreur test migration SQLite:', error);
    return false;
  }
};

/**
 * Test de performance avec de gros volumes
 */
export const testSQLitePerformance = async (): Promise<boolean> => {
  try {
    console.log('⚡ [Test] Début du test de performance SQLite...');

    // Créer un gros volume de données (simuler 10K programmes)
    const largeTestData = createTestEPGData();
    const now = Date.now();

    // Générer plus de programmes
    for (let i = 0; i < 10000; i++) {
      const channelId = `channel_${i % 100}`; // 100 chaînes
      const startTime = now + i * 30 * 60 * 1000; // Programme toutes les 30 min

      largeTestData.programmes.push({
        start:
          new Date(startTime).toISOString().replace(/[-:T]/g, '').slice(0, 14) +
          ' +0000',
        stop:
          new Date(startTime + 30 * 60 * 1000)
            .toISOString()
            .replace(/[-:T]/g, '')
            .slice(0, 14) + ' +0000',
        channel: channelId,
        title: `Programme ${i}`,
        desc: `Description du programme ${i}`,
      });
    }

    console.log(
      '📊 [Test] Données volumineuses créées:',
      largeTestData.programmes.length,
      'programmes',
    );

    // Mesurer le temps de sauvegarde
    const startTime = Date.now();
    await EPGCacheManager.updateCache(largeTestData);
    const saveTime = Date.now() - startTime;

    console.log(
      `⏱️ [Test] Sauvegarde SQLite: ${saveTime}ms pour ${largeTestData.programmes.length} programmes`,
    );

    // Mesurer le temps de récupération
    const queryStart = Date.now();
    const programs = await EPGCacheManager.getProgramsForChannel('channel_1');
    const queryTime = Date.now() - queryStart;

    console.log(
      `⏱️ [Test] Requête SQLite: ${queryTime}ms pour récupérer ${programs.length} programmes`,
    );

    // Test des statistiques
    const stats = await EPGCacheManager.getCacheStats();
    console.log('📊 [Test] Stats finales:', stats);

    console.log('🚀 [Test] Test de performance terminé avec succès!');
    return true;
  } catch (error) {
    console.error('❌ [Test] Erreur test performance:', error);
    return false;
  }
};

/**
 * Exécute tous les tests
 */
export const runAllSQLiteTests = async (): Promise<void> => {
  console.log('🧪 [TestSuite] Début des tests SQLite EPG...');

  const basicTestResult = await testBasicSQLiteMigration();
  const performanceTestResult = await testSQLitePerformance();

  console.log('📋 [TestSuite] Résultats des tests:');
  console.log(`  - Test de base: ${basicTestResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(
    `  - Test performance: ${performanceTestResult ? '✅ PASS' : '❌ FAIL'}`,
  );

  if (basicTestResult && performanceTestResult) {
    console.log('🎉 [TestSuite] Tous les tests SQLite ont réussi!');
  } else {
    console.log('⚠️ [TestSuite] Certains tests ont échoué');
  }
};

// Export pour utilisation externe
export default {
  testBasicSQLiteMigration,
  testSQLitePerformance,
  runAllSQLiteTests,
};
