/**
 * 🎬 usePlaylistSelection - Hook pour sélection playlist avec animation
 * Gère l'animation de chargement lors de la sélection d'une playlist
 */

import {useCallback} from 'react';
// AppContext removed - using UIStore instead
import {useUIStore} from '../stores/UIStore';
import {playlistService} from '../services/PlaylistService';
import type {Playlist} from '../types';

export const usePlaylistSelection = () => {
  // Replaced AppContext with UIStore
  const {showLoading, hideLoading} = useUIStore();

  // Configurer les callbacks d'animation une seule fois
  const initializePlaylistService = useCallback(() => {
    playlistService.setLoadingCallbacks(showLoading, hideLoading);
  }, [showLoading, hideLoading]);

  // Fonction pour sélectionner une playlist avec animation
  const selectPlaylistWithAnimation = useCallback(
    async (
      playlistId: string,
      playlistName?: string,
    ): Promise<Playlist | null> => {
      try {
        console.log(
          '🎬 Début sélection playlist avec animation:',
          playlistName,
        );

        // 🚀 ANIMATION IMMÉDIATE - Aucun délai !
        showLoading(
          playlistName
            ? `Chargement ${playlistName}...`
            : 'Chargement playlist...',
          'Lecture des chaînes...',
          0,
        );

        // S'assurer que les callbacks sont configurés
        initializePlaylistService();

        // Appeler la méthode du service qui gère l'animation
        const playlist = await playlistService.selectPlaylist(playlistId);

        return playlist;
      } catch (error) {
        console.error(
          '❌ Hook: Erreur dans selectPlaylistWithAnimation:',
          error,
        );
        // En cas d'erreur, s'assurer que l'animation est masquée
        hideLoading();
        throw error;
      }
    },
    [initializePlaylistService, hideLoading, showLoading],
  );

  return {
    selectPlaylistWithAnimation,
    initializePlaylistService,
  };
};

export default usePlaylistSelection;
