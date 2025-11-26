/**
 * 🔄 usePlaylistSync - Hook pour écouter la synchronisation de playlist
 * Recharge automatiquement les chaînes du store quand la playlist est mise à jour
 */

import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncEventEmitter, PlaylistUpdatedEvent } from '../services/SyncEventEmitter';
import { usePlaylistStore } from '../stores/PlaylistStore';
import watermelonM3UService from '../services/WatermelonM3UService';

const ACTIVE_PLAYLIST_KEY = 'last_selected_playlist_id';

export const usePlaylistSync = () => {
  const { selectedPlaylistId, loadPlaylist, selectPlaylist } = usePlaylistStore();

  useEffect(() => {
    // Écouter l'événement playlistUpdated
    const unsubscribe = syncEventEmitter.onPlaylistUpdated(
      async (event: PlaylistUpdatedEvent) => {
        console.log('🔄 [usePlaylistSync] Playlist mise à jour détectée:', event);

        // Vérifier aussi dans AsyncStorage (pour les playlists actives après sync)
        const asyncStoragePlaylistId = await AsyncStorage.getItem(ACTIVE_PLAYLIST_KEY);

        // Recharger si c'est la playlist active (dans le store OU dans AsyncStorage)
        const shouldReload =
          selectedPlaylistId === event.playlistId ||
          asyncStoragePlaylistId === event.playlistId ||
          (!selectedPlaylistId && asyncStoragePlaylistId === event.playlistId);

        if (shouldReload) {
          console.log('✅ [usePlaylistSync] Rechargement de la playlist active...');

          try {
            // Recharger les chaînes depuis WatermelonDB
            const playlistData = await watermelonM3UService.getPlaylistWithChannels(
              event.playlistId,
              50000, // Toutes les chaînes
            );

            // Convertir les chaînes WatermelonDB au format attendu par le store
            const channels = playlistData.channels.map((ch: any) => ({
              id: ch.id,
              name: ch.name,
              url: ch.streamUrl,
              logo: ch.logoUrl,
              category: ch.groupTitle,
              group: ch.groupTitle,
              tvgId: ch.tvgId,
              tvgName: ch.tvgName,
              tvgLogo: ch.tvgLogo,
              language: ch.language,
              country: ch.country,
              quality: ch.quality,
            }));

            // Mettre à jour le store avec les nouvelles chaînes
            loadPlaylist('', channels, event.playlistName);

            // Définir la playlist comme active dans le store
            selectPlaylist(event.playlistId);

            console.log(
              `✅ [usePlaylistSync] Playlist rechargée: ${channels.length} chaînes`
            );
          } catch (error) {
            console.error(
              '❌ [usePlaylistSync] Erreur rechargement playlist:',
              error
            );
          }
        } else {
          console.log(
            `⏭️ [usePlaylistSync] Playlist mise à jour (${event.playlistId}) différente de l'active (store: ${selectedPlaylistId}, async: ${asyncStoragePlaylistId})`
          );
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [selectedPlaylistId, loadPlaylist, selectPlaylist]);
};

export default usePlaylistSync;
