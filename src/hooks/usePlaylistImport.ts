/**
 * 📋 Hook usePlaylistImport - Import de playlists avec animations
 * Intègre LoadingOverlay plein écran + NotificationToast + StreamingXtreamService optimisé
 */

// AppContext removed - using UIStore instead
import {useUIStore} from '../stores/UIStore';
// PlaylistContext remplacé par PlaylistStore
import {usePlaylist} from '../stores/PlaylistStore';
// 🚀 NEW: Service Xtream optimisé pour 100K+ chaînes
import StreamingXtreamService from '../services/StreamingXtreamService';

export const usePlaylistImport = () => {
  // Replaced AppContext with UIStore
  const {showLoading, updateLoading, hideLoading, showNotification} =
    useUIStore();
  const {loadPlaylist} = usePlaylist();

  const importPlaylistM3U = async (
    uri: string,
    name: string = 'Playlist M3U',
  ) => {
    try {
      console.log('🎯 Début import playlist M3U:', uri);

      // 1. Afficher le LoadingOverlay plein écran
      showLoading('Téléchargement...', `Import de la playlist ${name}...`, 0);

      // 2. Simulation du processus d'import avec progression
      const steps = [
        {progress: 10, subtitle: 'Connexion au serveur...'},
        {progress: 30, subtitle: 'Téléchargement du fichier M3U...'},
        {progress: 60, subtitle: 'Analyse des chaînes...'},
        {progress: 85, subtitle: 'Organisation des catégories...'},
        {progress: 100, subtitle: 'Finalisation...'},
      ];

      for (const step of steps) {
        updateLoading({
          subtitle: step.subtitle,
          progress: step.progress,
        });

        // Pause pour simulation (à remplacer par vraies opérations)
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      // 3. Charger réellement la playlist
      await loadPlaylist(uri);

      // 4. Cacher le loading
      hideLoading();

      // 5. Afficher notification de succès avec bords lisses
      const channelCount = 383; // TODO: récupérer le vrai nombre
      showNotification(
        `Playlist ajoutée ! ${channelCount} chaînes importées avec succès`,
        'success',
        4000,
      );

      console.log('✅ Import playlist M3U terminé avec succès');
      return true;
    } catch (error) {
      console.error('❌ Erreur import playlist:', error);

      // Cacher le loading en cas d'erreur
      hideLoading();

      // Afficher notification d'erreur
      showNotification("Erreur lors de l'import de la playlist", 'error', 5000);

      return false;
    }
  };

  const importPlaylistXtream = async (
    server: string,
    username: string,
    password: string,
    name: string = 'Playlist Xtream',
  ) => {
    try {
      console.log('🚀 Début import playlist Xtream OPTIMISÉ:', server);

      // 1. Afficher le LoadingOverlay plein écran
      showLoading(
        'Streaming...',
        `Import optimisé ${name} (100K+ compatible)...`,
        0,
      );

      // 2. Préparer credentials pour service optimisé
      const credentials = {
        url: server,
        username,
        password,
      };

      // 3. 🚀 UTILISER LE SERVICE STREAMING OPTIMISÉ
      let totalChannels = 0;
      const playlistId =
        await StreamingXtreamService.importXtreamPlaylistOptimized(
          credentials,
          name,
          (progress: number, message: string) => {
            // Progress callback avec messages temps réel
            console.log(`📊 Progress: ${progress}% - ${message}`);

            updateLoading({
              subtitle: message,
              progress: Math.min(95, progress), // Cap à 95% pour finalisation
            });

            // Extract channel count from message if available
            const countMatch = message.match(/(\d+)\s+channels?/i);
            if (countMatch) {
              totalChannels = parseInt(countMatch[1]);
            }
          },
        );

      // 4. Finalisation
      updateLoading({
        subtitle: '✅ Activation playlist...',
        progress: 100,
      });

      // Small delay to show completion
      await new Promise(resolve => setTimeout(resolve, 500));

      // 5. Cacher le loading
      hideLoading();

      // 6. Notification de succès avec vrai nombre de chaînes
      showNotification(
        `🚀 Playlist Xtream optimisée ! ${totalChannels} chaînes importées avec succès`,
        'success',
        4000,
      );

      console.log(
        `✅ Import playlist Xtream optimisé terminé: ${totalChannels} chaînes, ID: ${playlistId}`,
      );
      return {success: true, playlistId, channelCount: totalChannels};
    } catch (error) {
      console.error('❌ Erreur import playlist Xtream optimisé:', error);

      hideLoading();

      // Message d'erreur plus détaillé
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      showNotification(`Erreur import Xtream: ${errorMessage}`, 'error', 6000);

      return {success: false, error: errorMessage};
    }
  };

  return {
    importPlaylistM3U,
    importPlaylistXtream,
  };
};
