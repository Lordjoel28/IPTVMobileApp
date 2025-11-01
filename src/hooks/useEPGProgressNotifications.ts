/**
 * 📢 Hook pour notifications de progression EPG
 * Écoute les événements EPG Background et affiche des notifications utilisateur
 */

import {useEffect} from 'react';
import {useUIStore} from '../stores/UIStore';
import EPGBackgroundService from '../services/EPGBackgroundService';

interface EPGProgressEvent {
  playlistId: string;
  progress: {
    status: 'queued' | 'downloading' | 'parsing' | 'completed' | 'error';
    progress: number;
    channelsProcessed: number;
    totalChannels: number;
    error?: string;
    estimatedTimeRemaining?: number;
  };
}

export const useEPGProgressNotifications = () => {
  const {showNotification} = useUIStore();

  useEffect(() => {
    console.log(
      '📢 [useEPGProgressNotifications] Démarrage écoute événements EPG',
    );

    // Gestionnaires d'événements EPG
    const handleEPGSyncStarted = (event: EPGProgressEvent) => {
      console.log('🚀 [EPG Notifications] EPG sync démarré', event);

      if (event.progress.totalChannels > 0) {
        showNotification(
          `📺 EPG en cours de chargement... (${event.progress.totalChannels} chaînes)`,
          'info',
          3000,
        );
      }
    };

    const handleEPGSyncProgress = (event: EPGProgressEvent) => {
      const {progress} = event;

      console.log('📊 [EPG Notifications] Progression EPG', {
        playlistId: event.playlistId,
        status: progress.status,
        progress: `${progress.progress}%`,
        channelsProcessed: progress.channelsProcessed,
        totalChannels: progress.totalChannels,
      });

      // Afficher notifications aux étapes importantes
      if (
        progress.progress === 25 ||
        progress.progress === 50 ||
        progress.progress === 75
      ) {
        const timeRemaining = progress.estimatedTimeRemaining
          ? ` (${Math.round(
              progress.estimatedTimeRemaining / 1000,
            )}s restantes)`
          : '';

        showNotification(
          `📺 EPG ${progress.progress}% (${progress.channelsProcessed}/${progress.totalChannels} chaînes)${timeRemaining}`,
          'info',
          2000,
        );
      }
    };

    const handleEPGSyncCompleted = (event: EPGProgressEvent) => {
      console.log('✅ [EPG Notifications] EPG sync terminé', event);

      showNotification(
        `✅ EPG chargé avec succès ! ${event.progress.totalChannels} chaînes disponibles`,
        'success',
        4000,
      );
    };

    const handleEPGSyncError = (event: EPGProgressEvent) => {
      console.log('❌ [EPG Notifications] Erreur EPG sync', event);

      showNotification(
        `⚠️ Erreur EPG: ${
          event.progress.error || 'Impossible de charger le guide'
        }`,
        'error',
        5000,
      );
    };

    // Écouter les événements
    EPGBackgroundService.on('epg-sync-started', handleEPGSyncStarted);
    EPGBackgroundService.on('epg-sync-progress', handleEPGSyncProgress);
    EPGBackgroundService.on('epg-sync-completed', handleEPGSyncCompleted);
    EPGBackgroundService.on('epg-sync-error', handleEPGSyncError);

    // Nettoyage
    return () => {
      console.log('🧹 [useEPGProgressNotifications] Nettoyage listeners EPG');

      EPGBackgroundService.off('epg-sync-started', handleEPGSyncStarted);
      EPGBackgroundService.off('epg-sync-progress', handleEPGSyncProgress);
      EPGBackgroundService.off('epg-sync-completed', handleEPGSyncCompleted);
      EPGBackgroundService.off('epg-sync-error', handleEPGSyncError);
    };
  }, [showNotification]);

  return {
    // Méthodes utilitaires pour obtenir le statut EPG
    getEPGProgress: (playlistId: string) => {
      return EPGBackgroundService.getProgress(playlistId);
    },

    getEPGStats: () => {
      return EPGBackgroundService.getStats();
    },
  };
};
