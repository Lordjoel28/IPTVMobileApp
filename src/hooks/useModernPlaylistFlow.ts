/**
 * 🔄 useModernPlaylistFlow - Exemple parfait du flux UI→Service→Store→UI
 * Intégration complète : UI ↔ Hook ↔ Service ↔ Store ↔ UI
 * Architecture moderne v3.0.0
 */

import { useCallback } from 'react';
import { useUIStore } from '../stores/UIStore';
import { usePlaylistStore } from '../stores/PlaylistStore';
import { playlistService } from '../services/PlaylistService';

/**
 * 🎯 Hook qui implémente le flux moderne complet :
 * 
 * 1. UI Component appelle le hook
 * 2. Hook utilise Service pour logique métier
 * 3. Service met à jour Store avec résultats
 * 4. Store notifie UI via subscriptions Zustand
 * 5. UI re-render automatiquement avec nouvelles données
 */
export const useModernPlaylistFlow = () => {
  // 🏪 Zustand Stores
  const { showLoading, updateLoading, hideLoading, showNotification } = useUIStore();
  const { 
    channels, 
    categories, 
    selectedCategory,
    selectedPlaylistId,
    loadPlaylist,
    selectCategory,
    clearAll 
  } = usePlaylistStore();

  /**
   * 🔄 Flux moderne : Import playlist avec UI→Service→Store→UI
   */
  const importPlaylistModern = useCallback(async (url: string, name: string) => {
    console.log('🔄 MODERN FLOW - Starting playlist import');

    try {
      // 1. 🎨 UI State Update (Loading)
      showLoading(
        'Import moderne...',
        `Chargement ${name} avec nouveau flux...`,
        0
      );

      // 2. 📋 Service Layer - Business Logic
      console.log('📋 SERVICE LAYER - Calling PlaylistService.parseM3U');
      updateLoading({
        subtitle: 'Service traite les données...',
        progress: 30,
      });

      // Service fait son travail métier
      const parseResult = await playlistService.parseM3U(url);
      console.log('📋 SERVICE LAYER - Parse completed:', parseResult.channels.length, 'channels');

      // 3. 🏪 Store Update - State Management
      console.log('🏪 STORE LAYER - Updating PlaylistStore via loadPlaylist');
      updateLoading({
        subtitle: 'Mise à jour du state Zustand...',
        progress: 70,
      });

      // Store met à jour son state avec les résultats du service (FLUX STRICT)
      loadPlaylist(url, parseResult.channels, name);

      updateLoading({
        subtitle: 'Finalisation...',
        progress: 100,
      });

      // 4. 🎨 UI State Update (Success)
      hideLoading();
      showNotification(
        `✅ Import moderne réussi ! ${parseResult.channels.length} chaînes via flux UI→Service→Store→UI`,
        'success',
        4000
      );

      console.log('🔄 MODERN FLOW - Complete success');
      return true;

    } catch (error) {
      console.error('🔄 MODERN FLOW - Error:', error);
      
      hideLoading();
      showNotification(
        '❌ Erreur dans le flux moderne',
        'error',
        5000
      );
      
      return false;
    }
  }, [showLoading, updateLoading, hideLoading, showNotification, loadPlaylist]);

  /**
   * 🔄 Flux moderne : Sélection catégorie avec UI→Service→Store→UI
   */
  const selectCategoryModern = useCallback((category: string) => {
    console.log('🔄 MODERN FLOW - Category selection:', category);

    try {
      // 1. 🎨 UI State Update (Immediate feedback)
      showNotification(
        `Catégorie sélectionnée : ${category}`,
        'success',
        2000
      );

      // 2. 📋 Service Layer - Business Logic (si nécessaire)
      console.log('📋 SERVICE LAYER - Category filtering logic could go here');
      
      // 3. 🏪 Store Update - State Management
      console.log('🏪 STORE LAYER - Updating selected category');
      selectCategory(category);

      // 4. 🎨 UI will automatically re-render via Zustand subscription
      console.log('🔄 MODERN FLOW - Category selection complete');

    } catch (error) {
      console.error('🔄 MODERN FLOW - Category selection error:', error);
      showNotification(
        '❌ Erreur sélection catégorie',
        'error',
        3000
      );
    }
  }, [selectCategory, showNotification]);

  /**
   * 🧹 Flux moderne : Reset complet avec UI→Service→Store→UI
   */
  const resetAllModern = useCallback(async () => {
    console.log('🔄 MODERN FLOW - Reset all data');

    try {
      // 1. 🎨 UI State Update (Loading)
      showLoading('Reset moderne...', 'Nettoyage des données...', 50);

      // 2. 📋 Service Layer - Business Logic (cleanup)
      console.log('📋 SERVICE LAYER - Service cleanup (if needed)');
      // Ici on pourrait appeler playlistService.clearCache() etc.

      // 3. 🏪 Store Update - State Management
      console.log('🏪 STORE LAYER - Clearing all store data');
      await clearAll();

      // 4. 🎨 UI State Update (Success)
      hideLoading();
      showNotification(
        '🧹 Reset moderne terminé',
        'success',
        3000
      );

      console.log('🔄 MODERN FLOW - Reset complete');

    } catch (error) {
      console.error('🔄 MODERN FLOW - Reset error:', error);
      hideLoading();
      showNotification(
        '❌ Erreur lors du reset',
        'error',
        5000
      );
    }
  }, [showLoading, hideLoading, showNotification, clearAll]);

  /**
   * 📊 Données et statistiques du flux moderne
   */
  const getFlowStats = useCallback(() => {
    return {
      // Store State
      totalChannels: channels.length,
      totalCategories: categories.length,
      currentCategory: selectedCategory,
      currentPlaylistId: selectedPlaylistId,
      
      // Flow Status
      hasData: channels.length > 0,
      isInitialized: categories.length > 0,
      
      // Architecture Info
      architecture: 'Modern UI→Service→Store→UI Flow',
      version: 'v3.0.0',
      stores: ['UIStore (Zustand)', 'PlaylistStore (Zustand)'],
      services: ['PlaylistService (DI)'],
    };
  }, [channels, categories, selectedCategory, selectedPlaylistId]);

  return {
    // 🔄 Modern Flow Methods
    importPlaylistModern,
    selectCategoryModern,
    resetAllModern,
    
    // 📊 Data from Store (reactive)
    channels,
    categories,
    selectedCategory,
    selectedPlaylistId,
    
    // 📈 Flow Analytics
    getFlowStats,
    
    // 🎯 Flow Status
    hasData: channels.length > 0,
    isReady: categories.length > 0,
  };
};

/**
 * 📝 DOCUMENTATION DU FLUX :
 * 
 * 1. UI Component: const { importPlaylistModern, channels } = useModernPlaylistFlow();
 * 2. User Action: <Button onPress={() => importPlaylistModern(url, name)} />
 * 3. Hook receives call and shows loading UI
 * 4. Hook calls PlaylistService.parseM3U (business logic)
 * 5. Service processes M3U and returns data
 * 6. Hook calls PlaylistStore.loadPlaylist (state update)
 * 7. Store updates and persists data
 * 8. Hook updates UI state (hide loading, show notification)
 * 9. UI automatically re-renders with new data (Zustand subscription)
 * 10. Complete UI→Service→Store→UI cycle ✅
 */

export default useModernPlaylistFlow;