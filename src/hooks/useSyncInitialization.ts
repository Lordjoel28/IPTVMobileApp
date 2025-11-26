/**
 * 🚀 useSyncInitialization - Hook pour initialiser la synchronisation automatique SIMPLIFIÉE
 * À appeler au démarrage de l'application
 * + Affiche modal de chargement pour la sync au démarrage (mode IPTV Smarters Pro)
 * + Utilise ReliableSyncScheduler pour fiabilité maximale
 */

import { useEffect, useState } from 'react';
import { autoSyncService } from '../services/AutoSyncService';
import { reliableSyncScheduler } from '../services/ReliableSyncScheduler';
import { syncEventEmitter } from '../services/SyncEventEmitter';
import { useUIStore } from '../stores/UIStore';

interface SyncInitializationState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useSyncInitialization = () => {
  const [state, setState] = useState<SyncInitializationState>({
    isInitialized: false,
    isLoading: true,
    error: null,
  });

  const { showLoading, hideLoading } = useUIStore();

  useEffect(() => {
    const initializeSync = async () => {
      try {
        console.log('🚀 [useSyncInitialization] Initialisation AutoSyncService...');

        // Écouter les événements de sync pour afficher le modal
        const unsubscribeStatus = syncEventEmitter.onSyncStatus((event) => {
          if (event.isActive && event.progress !== undefined) {
            // Afficher le modal de chargement avec le message traduit uniquement
            showLoading(
              event.message,
              undefined, // ← Pas de sous-titre pour éviter duplication
              event.progress
            );
          } else if (!event.isActive) {
            // Cacher le modal quand sync terminée
            hideLoading();
          }
        });

        const unsubscribeComplete = syncEventEmitter.onSyncComplete(() => {
          hideLoading();
        });

        const unsubscribeError = syncEventEmitter.onSyncError(() => {
          hideLoading();
        });

        await autoSyncService.initialize();

        // 🆕 Initialiser le scheduler fiable
        const config = autoSyncService.getConfig();
        await reliableSyncScheduler.initialize({
          enabled: config.enabled,
          intervalHours: config.intervalHours,
          checkIntervalMinutes: 30, // Vérifier toutes les 30 min
        });

        setState({
          isInitialized: true,
          isLoading: false,
          error: null,
        });

        console.log('✅ [useSyncInitialization] AutoSyncService + ReliableSyncScheduler initialisés');

        // Nettoyage des listeners (garder une référence pour cleanup)
        return () => {
          unsubscribeStatus();
          unsubscribeComplete();
          unsubscribeError();
        };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        console.error('❌ [useSyncInitialization] Erreur initialisation:', error);

        hideLoading();

        setState({
          isInitialized: false,
          isLoading: false,
          error: errorMessage,
        });
      }
    };

    const cleanup = initializeSync();

    // Nettoyage
    return () => {
      console.log('🧹 [useSyncInitialization] Nettoyage hook');
      cleanup?.then(fn => fn?.());
      autoSyncService.cleanup();
      reliableSyncScheduler.cleanup();
    };
  }, [showLoading, hideLoading]);

  return {
    ...state,
    isReady: state.isInitialized && !state.isLoading && !state.error
  };
};
