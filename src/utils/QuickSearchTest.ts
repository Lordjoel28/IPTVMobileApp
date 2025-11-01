/**
 * 🧪 QuickSearchTest - Test rapide et simple de la recherche SQL
 * Pour valider rapidement que la recherche fonctionne
 */

import {sqlSearchService} from '../services/SqlSearchService';
import {databaseIndexService} from '../services/DatabaseIndexService';

export const quickSearchTest = async (playlistId: string) => {
  console.log('🧪 [QuickSearchTest] Démarrage test rapide...');

  try {
    // 1. Test des stats de base
    console.log('📊 Test 1: Stats base de données...');
    const stats = await databaseIndexService.getDatabaseStats();
    console.log('✅ Stats BDD:', stats);

    if (!stats || stats.channels === 0) {
      console.warn('⚠️ Aucune chaîne trouvée dans la base - test normal si playlist vide');
      return { success: true, message: 'Base vide ou non initialisée' };
    }

    // 2. Test de recherche simple
    console.log('🔍 Test 2: Recherche simple...');
    const searchResult = await sqlSearchService.searchChannels(
      playlistId,
      'a', // Recherche très large pour trouver des résultats
      { limit: 5 }
    );
    console.log('✅ Recherche simple:', searchResult.totalCount, 'résultats en', searchResult.queryTime, 'ms');

    // 3. Test de suggestions
    console.log('💡 Test 3: Suggestions...');
    const suggestions = await sqlSearchService.getSearchSuggestions(
      playlistId,
      'a',
      5
    );
    console.log('✅ Suggestions:', suggestions.length, 'suggestions trouvées');

    // 4. Test avec pagination
    if (searchResult.totalCount > 5) {
      console.log('📄 Test 4: Pagination...');
      const page2 = await sqlSearchService.searchChannels(
        playlistId,
        'a',
        { limit: 5, offset: 5 }
      );
      console.log('✅ Page 2:', page2.channels.length, 'résultats');
    }

    console.log('🎉 [QuickSearchTest] TOUS LES TESTS RÉUSSIS !');
    return {
      success: true,
      message: 'Recherche SQL fonctionnelle',
      stats: {
        totalChannels: stats.channels,
        firstSearchResults: searchResult.totalCount,
        searchTime: searchResult.queryTime,
        suggestionsCount: suggestions.length
      }
    };

  } catch (error) {
    console.error('❌ [QuickSearchTest] Erreur:', error);
    return {
      success: false,
      error: error.message,
      message: 'Erreur lors du test de recherche'
    };
  }
};