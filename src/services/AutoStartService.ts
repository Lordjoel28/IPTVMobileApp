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

          // 🚀 STRATÉGIE FAST-FIRST : Lancer immédiatement avec données minimales
          const fastStartCategory = {
            id: 'current',
            name: recentChannel.channelData.group || 'Actuelle',
            count: 1
          };

          const minimalCategories = [{
            id: 'current',
            name: recentChannel.channelData.group || 'Actuelle',
            count: 1
          }];

          // Définir les données de navigation minimales pour démarrage immédiat
          actions.setNavigationData({
            playlistId: recentChannelPlaylistId,
            playlistName: 'Playlist',
            initialChannels: [recentChannel.channelData], // 🚀 Uniquement la chaîne cible
            initialCategory: fastStartCategory,
            allCategories: minimalCategories,
            useWatermelonDB: true,
            playlistType: 'M3U'
          });

          // 🎬 Marquer qu'on vient de l'autostart (pour masquer certains boutons Docker)
          actions.setFromAutoStart(true);

          // 🚀 LANCER IMMÉDIATEMENT la lecture
          actions.playChannel(recentChannel.channelData, true);

          console.log(`⚡ [AutoStartService] Lecture lancée immédiatement`);

          // 🔄 Charger les vraies données en ARRIÈRE-PLAN (non bloquant)
          this.loadFullPlaylistData(recentChannelPlaylistId, recentChannel.channelData.group)
            .then(fullData => {
              // Mettre à jour la navigation quand les données sont prêtes
              actions.setNavigationData(fullData);
              console.log(`📊 [AutoStartService] Données complètes chargées en arrière-plan: ${fullData.allCategories.length} catégories`);
            })
            .catch(error => {
              console.warn('⚠️ [AutoStartService] Erreur chargement arrière-plan:', error);
            });

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
   * Charge les données complètes de la playlist en arrière-plan
   */
  private async loadFullPlaylistData(playlistId: string, categoryName?: string): Promise<any> {
    try {
      const WatermelonM3UService = (await import('./WatermelonM3UService')).default;
      const categories = await WatermelonM3UService.getPlaylistCategories(playlistId);

      if (categories && categories.length > 0) {
        const targetCategory = categories.find(cat => cat.name === categoryName) || categories[0];
        let fullChannels: any[] = [];

        try {
          const categoryChannels = await WatermelonM3UService.getChannelsByCategory(playlistId, targetCategory.name);
          if (categoryChannels && categoryChannels.length > 0) {
            // 🔄 Convertir les objets WatermelonDB vers format Channel de l'app
            fullChannels = categoryChannels.map((ch: any) => ({
              id: ch.id,
              name: ch.name || 'Sans nom',
              logo: ch.logoUrl || ch.streamIcon || '',
              logoUrl: ch.logoUrl || ch.streamIcon || '',
              group: ch.groupTitle || ch.categoryName || 'Non classé',
              groupTitle: ch.groupTitle || ch.categoryName || 'Non classé',
              category: ch.groupTitle || ch.categoryName || 'Non classé',
              url: ch.streamUrl || '',
              streamUrl: ch.streamUrl || '',
              type: 'M3U' as const,
            }));
          }
        } catch (channelError) {
          console.warn(`⚠️ [AutoStartService] Erreur chargement chaînes catégorie en arrière-plan:`, channelError);
          // En cas d'erreur, on garde les catégories mais les chaînes restent vides
        }

        return {
          playlistId,
          playlistName: 'Playlist',
          initialChannels: fullChannels,
          initialCategory: targetCategory,
          allCategories: categories,
          useWatermelonDB: true,
          playlistType: 'M3U'
        };
      } else {
        throw new Error('Pas de catégories trouvées');
      }
    } catch (error) {
      console.warn(`⚠️ [AutoStartService] Erreur chargement complet en arrière-plan:`, error);
      throw error;
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
      const recentChannels = await RecentChannelsService.getRecentChannels(activeProfile?.id || '', 1);

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