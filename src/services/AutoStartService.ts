/**
 * 🎬 AutoStartService - Service de démarrage automatique IPTV multi-profils
 * Gère la reprise automatique de la dernière chaîne regardée au lancement de l'application
 */

import { videoSettingsService } from './VideoSettingsService';
import RecentChannelsService from './RecentChannelsService';
import ProfileService from './ProfileService';
import ParentalControlService from './ParentalControlService';
import { usePlayerStore } from '../stores/PlayerStore';

export interface AutoStartResult {
  success: boolean;
  channelName?: string;
  reason?: string;
  error?: string;
}

class AutoStartService {
  private static readonly AUTO_START_DELAY = 2500; // 2.5 secondes

  /**
   * Tente de démarrer automatiquement la dernière chaîne regardée
   */
  async tryAutoStart(): Promise<AutoStartResult> {
    try {
      console.log('🎬 [AutoStartService] Début du démarrage automatique...');

      // 1. Vérifier si l'option autoplay est activée
      const settings = await videoSettingsService.loadSettings();
      if (!settings.autoplay) {
        console.log('⏸️ [AutoStartService] Autoplay désactivé - Annulation');
        return { success: false, reason: 'autoplay-disabled' };
      }

      // 2. Récupérer le profil actif
      const activeProfile = await ProfileService.getActiveProfile();
      if (!activeProfile) {
        console.log('❌ [AutoStartService] Aucun profil actif - Annulation');
        return { success: false, reason: 'no-active-profile' };
      }

      console.log(`👤 [AutoStartService] Profil actif: ${activeProfile.name}`);

      // 3. Récupérer les dernières chaînes regardées pour ce profil
      const recentChannels = await RecentChannelsService.getRecentChannels(
        activeProfile.id,
        5 // Limiter à 5 pour essais multiples
      );

      if (!recentChannels || recentChannels.length === 0) {
        console.log('📭 [AutoStartService] Aucune chaîne récente - Annulation');
        return { success: false, reason: 'no-recent-channels' };
      }

      console.log(`📺 [AutoStartService] ${recentChannels.length} chaîne(s) récente(s) trouvée(s)`);

      // 4. Essayer les chaînes récentes par ordre (dernière d'abord)
      for (let i = 0; i < recentChannels.length; i++) {
        const recentChannel = recentChannels[i];

        try {
          console.log(`🎯 [AutoStartService] Tentative ${i + 1}/${recentChannels.length}: ${recentChannel.channelData?.name}`);

          // 5. Valider l'accès avec le contrôle parental
          const accessResult = await ParentalControlService.checkAccess(
            recentChannel.channelData,
            activeProfile
          );

          if (!accessResult.allowed) {
            console.log(`🔒 [AutoStartService] Chaîne ${recentChannel.channelData?.name} bloquée (contrôle parental)`);
            continue; // Essayer la chaîne suivante
          }

          // 6. Valider que la chaîne a toujours des URL valides
          if (!recentChannel.channelData?.url || recentChannel.channelData.url.trim() === '') {
            console.log(`⚠️ [AutoStartService] Chaîne ${recentChannel.channelData?.name} sans URL valide`);
            continue; // Essayer la chaîne suivante
          }

          // 7. Lancer la lecture via PlayerStore
          const { actions } = usePlayerStore.getState();

          // Récupérer la playlist associée à cette chaîne
          const playlistId = recentChannel.playlistId;
          if (!playlistId) {
            console.log(`⚠️ [AutoStartService] Playlist ID manquant pour ${recentChannel.channelData?.name}`);
            continue;
          }

          console.log(`🚀 [AutoStartService] Lancement de: ${recentChannel.channelData.name}`);

          // 📺 Charger les vraies données de la playlist depuis WatermelonDB
          const recentChannelPlaylistId = recentChannel.playlistId || 'default_playlist';

          try {
            // Charger les catégories depuis WatermelonDB
            const WatermelonM3UService = (await import('./WatermelonM3UService')).default;
            const categories = await WatermelonM3UService.getPlaylistCategories(recentChannelPlaylistId);

            if (categories && categories.length > 0) {
              console.log(`📂 [AutoStartService] ${categories.length} catégories chargées depuis WatermelonDB`);

              // Trouver la catégorie de la chaîne ou utiliser la première
              const channelCategory = recentChannel.channelData.group || recentChannel.channelData.category;
              const initialCategory = categories.find(cat => cat.name === channelCategory) || categories[0];

              // Charger toutes les chaînes de la catégorie initiale
              let initialChannels = [recentChannel.channelData];
              try {
                const categoryChannels = await WatermelonM3UService.getChannelsByCategory(
                  recentChannelPlaylistId,
                  initialCategory.name
                );
                if (categoryChannels && categoryChannels.length > 0) {
                  // 🔄 Convertir les objets WatermelonDB vers format Channel de l'app
                  initialChannels = categoryChannels.map((ch: any) => ({
                    id: ch.id,
                    name: ch.name || 'Sans nom',
                    logo: ch.logoUrl || ch.streamIcon || '', // WatermelonDB utilise logoUrl
                    logoUrl: ch.logoUrl || ch.streamIcon || '',
                    group: ch.groupTitle || ch.categoryName || 'Non classé',
                    groupTitle: ch.groupTitle || ch.categoryName || 'Non classé',
                    category: ch.groupTitle || ch.categoryName || 'Non classé',
                    url: ch.streamUrl || '',
                    streamUrl: ch.streamUrl || '',
                    type: 'M3U' as const,
                  }));
                  console.log(`📺 [AutoStartService] ${categoryChannels.length} chaînes chargées pour catégorie "${initialCategory.name}"`);
                }
              } catch (channelError) {
                console.warn(`⚠️ [AutoStartService] Erreur chargement chaînes catégorie, utilisation chaîne seule:`, channelError);
              }

              // Définir les données de navigation avec les vraies catégories
              actions.setNavigationData({
                playlistId: recentChannelPlaylistId,
                playlistName: 'Playlist',
                initialChannels: initialChannels,
                initialCategory: initialCategory,
                allCategories: categories,
                useWatermelonDB: true,
                playlistType: 'M3U'
              });
              console.log(`📺 [AutoStartService] NavigationData défini: ${categories.length} catégories, ${initialChannels.length} chaînes initiales`);
            } else {
              throw new Error('Pas de catégories trouvées');
            }
          } catch (error) {
            console.warn(`⚠️ [AutoStartService] Erreur chargement catégories:`, error);
            // Fallback: données minimales - ChannelPlayerScreen chargera les vraies catégories
            actions.setNavigationData({
              playlistId: recentChannelPlaylistId,
              playlistName: 'Dernière chaîne',
              initialChannels: [recentChannel.channelData],
              initialCategory: {
                id: 'all',
                name: recentChannel.channelData.group || 'Toutes',
                count: 1
              },
              allCategories: [{
                id: 'all',
                name: 'Toutes',
                count: 1
              }],
              useWatermelonDB: true,
              playlistType: 'M3U'
            });
            console.log(`📺 [AutoStartService] NavigationData fallback défini`);
          }

          // 🎬 Marquer qu'on vient de l'autostart (pour masquer certains boutons Docker)
          actions.setFromAutoStart(true);

          // Lancer la lecture en fullscreen (type décodeur TV)
          actions.playChannel(recentChannel.channelData, true);

          console.log(`✅ [AutoStartService] Démarrage automatique réussi: ${recentChannel.channelData.name}`);

          return {
            success: true,
            channelName: recentChannel.channelData.name
          };

        } catch (channelError) {
          console.error(`❌ [AutoStartService] Erreur avec ${recentChannel.channelData?.name}:`, channelError);
          // Continuer avec la chaîne suivante
          continue;
        }
      }

      console.log('❌ [AutoStartService] Aucune chaîne récente n\'a pu être démarrée');
      return { success: false, reason: 'no-valid-channels' };

    } catch (error) {
      console.error('💥 [AutoStartService] Erreur critique du démarrage automatique:', error);
      return { success: false, reason: 'critical-error', error: error.message };
    }
  }

  /**
   * Vérifie si le démarrage automatique est possible
   */
  async canAutoStart(): Promise<boolean> {
    try {
      // Vérifier l'option autoplay
      const settings = await videoSettingsService.loadSettings();
      if (!settings.autoplay) {
        return false;
      }

      // Vérifier le profil actif
      const activeProfile = await ProfileService.getActiveProfile();
      if (!activeProfile) {
        return false;
      }

      // Vérifier qu'il y a des chaînes récentes
      const recentChannels = await RecentChannelsService.getRecentChannels(activeProfile.id, 1);
      return recentChannels && recentChannels.length > 0;

    } catch (error) {
      console.error('❌ [AutoStartService] Erreur vérification canAutoStart:', error);
      return false;
    }
  }

  /**
   * Obtient des informations sur le prochain démarrage automatique
   */
  async getNextAutoStartInfo(): Promise<{
    enabled: boolean;
    profileName?: string;
    lastChannelName?: string;
    lastWatchedAt?: string;
  }> {
    try {
      const settings = await videoSettingsService.loadSettings();
      const activeProfile = await ProfileService.getActiveProfile();
      const recentChannels = await RecentChannelsService.getRecentChannels(activeProfile?.id, 1);

      return {
        enabled: settings.autoplay && !!activeProfile && recentChannels.length > 0,
        profileName: activeProfile?.name,
        lastChannelName: recentChannels[0]?.channelData?.name,
        lastWatchedAt: recentChannels[0]?.watchedAt,
      };

    } catch (error) {
      console.error('❌ [AutoStartService] Erreur getNextAutoStartInfo:', error);
      return { enabled: false };
    }
  }
}

// Export singleton
export const autoStartService = new AutoStartService();
export default autoStartService;