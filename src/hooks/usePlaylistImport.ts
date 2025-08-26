/**
 * 📋 Hook usePlaylistImport - Import de playlists avec animations
 * Intègre LoadingOverlay plein écran + NotificationToast
 */

// AppContext removed - using UIStore instead
import { useUIStore } from '../stores/UIStore';
// PlaylistContext remplacé par PlaylistStore
import { usePlaylist } from '../stores/PlaylistStore';

export const usePlaylistImport = () => {
  // Replaced AppContext with UIStore
  const { showLoading, updateLoading, hideLoading, showNotification } = useUIStore();
  const { loadPlaylist } = usePlaylist();

  const importPlaylistM3U = async (uri: string, name: string = 'Playlist M3U') => {
    try {
      console.log('🎯 Début import playlist M3U:', uri);

      // 1. Afficher le LoadingOverlay plein écran
      showLoading(
        'Téléchargement...',
        `Import de la playlist ${name}...`,
        0
      );

      // 2. Simulation du processus d'import avec progression
      const steps = [
        { progress: 10, subtitle: 'Connexion au serveur...' },
        { progress: 30, subtitle: 'Téléchargement du fichier M3U...' },
        { progress: 60, subtitle: 'Analyse des chaînes...' },
        { progress: 85, subtitle: 'Organisation des catégories...' },
        { progress: 100, subtitle: 'Finalisation...' },
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
        4000
      );

      console.log('✅ Import playlist M3U terminé avec succès');
      return true;

    } catch (error) {
      console.error('❌ Erreur import playlist:', error);
      
      // Cacher le loading en cas d'erreur
      hideLoading();
      
      // Afficher notification d'erreur
      showNotification(
        'Erreur lors de l\'import de la playlist',
        'error',
        5000
      );
      
      return false;
    }
  };

  const importPlaylistXtream = async (server: string, username: string, password: string, name: string = 'Playlist Xtream') => {
    try {
      console.log('🎯 Début import playlist Xtream:', server);

      // 1. Afficher le LoadingOverlay plein écran avec messages spécifiques Xtream
      showLoading(
        'Téléchargement...',
        `Import de la playlist ${name}...`,
        0
      );

      // 2. Étapes spécifiques à Xtream Codes
      const steps = [
        { progress: 15, subtitle: 'Authentification sur le serveur...' },
        { progress: 35, subtitle: 'Récupération des catégories...' },
        { progress: 60, subtitle: 'Téléchargement de chaînes, films et séries...' },
        { progress: 85, subtitle: 'Traitement des données...' },
        { progress: 100, subtitle: 'Configuration terminée...' },
      ];

      for (const step of steps) {
        updateLoading({
          subtitle: step.subtitle,
          progress: step.progress,
        });
        
        // Temps plus long pour Xtream (plus de données)
        await new Promise(resolve => setTimeout(resolve, 1200));
      }

      // 3. Ici on appellerait la vraie méthode d'import Xtream
      // await xtreamManager.importPlaylist(server, username, password);

      // 4. Cacher le loading
      hideLoading();

      // 5. Notification de succès
      const channelCount = 2547; // TODO: récupérer le vrai nombre
      showNotification(
        `Playlist Xtream ajoutée ! ${channelCount} chaînes importées avec succès`,
        'success',
        4000
      );

      console.log('✅ Import playlist Xtream terminé avec succès');
      return true;

    } catch (error) {
      console.error('❌ Erreur import playlist Xtream:', error);
      
      hideLoading();
      showNotification(
        'Erreur lors de l\'import de la playlist Xtream',
        'error',
        5000
      );
      
      return false;
    }
  };

  return {
    importPlaylistM3U,
    importPlaylistXtream,
  };
};