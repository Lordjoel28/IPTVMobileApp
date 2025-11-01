/**
 * 🕰️ RecentChannelsService - Gestion des chaînes récentes par profil
 * Stockage dans AsyncStorage avec filtrage par profileId
 * Même logique que FavoritesService pour assurer la cohérence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {Channel} from '../types';

const STORAGE_KEY = 'app_recent_channels';
const MAX_RECENT_CHANNELS = 20;

interface RecentChannel {
  id: string; // ID unique du récent
  channelId: string; // ID de la chaîne
  channelName: string; // Nom de la chaîne
  channelUrl: string; // URL du stream
  channelLogo?: string; // Logo de la chaîne
  channelCategory?: string; // Catégorie
  playlistId: string; // ID de la playlist
  profileId: string; // ID du profil
  watchedAt: string; // Date de visionnage
  // On stocke toutes les données de la chaîne pour pouvoir la relire
  channelData: Channel;
}

class RecentChannelsService {
  /**
   * Obtenir tous les récents (tous profils confondus)
   */
  async getAllRecents(): Promise<RecentChannel[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (!data) {
        return [];
      }
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ [RecentChannelsService] Erreur lecture récents:', error);
      return [];
    }
  }

  /**
   * Obtenir les récents d'un profil spécifique pour une playlist
   */
  async getRecentsByProfile(
    profileId: string,
    playlistId?: string,
  ): Promise<Channel[]> {
    try {
      console.log(
        '🔍 [RecentChannelsService] Chargement récents pour profil:',
        profileId,
        'playlist:',
        playlistId,
      );

      const allRecents = await this.getAllRecents();
      console.log(
        '🔍 [RecentChannelsService] Total récents dans le storage:',
        allRecents.length,
      );

      // Filtrer par profileId (et playlistId si fourni)
      let filtered = allRecents.filter(recent => recent.profileId === profileId);

      if (playlistId) {
        filtered = filtered.filter(recent => recent.playlistId === playlistId);
      }

      console.log(
        '🔍 [RecentChannelsService] Récents filtrés pour ce profil:',
        filtered.length,
      );

      // Trier par date de visionnage (plus récent en premier)
      filtered.sort(
        (a, b) =>
          new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime(),
      );

      // Retourner les données des chaînes avec validation robuste
      return filtered
        .map(recent => recent.channelData)
        .filter(Boolean) // Enlever les valeurs null/undefined
        .map(channel => ({
          ...channel,
          // ✅ Garantir que les propriétés critiques existent
          id: channel.id || `recent_${Date.now()}_${Math.random()}`,
          name: channel.name || 'Sans nom',
          url: channel.url || channel.streamUrl || '',
          streamUrl: channel.streamUrl || channel.url || '',
          logo: channel.logo || channel.logoUrl || '',
          logoUrl: channel.logoUrl || channel.logo || '',
          group: channel.group || channel.groupTitle || channel.category || '',
          groupTitle: channel.groupTitle || channel.group || channel.category || '',
          category: channel.category || channel.group || channel.groupTitle || '',
        }));
    } catch (error) {
      console.error(
        '❌ [RecentChannelsService] Erreur récupération récents profil:',
        error,
      );
      return [];
    }
  }

  /**
   * Ajouter une chaîne aux récents d'un profil
   */
  async addRecent(
    channel: Channel,
    playlistId: string,
    profileId: string,
  ): Promise<void> {
    try {
      console.log(
        '🔍 [RecentChannelsService] Ajout chaîne aux récents:',
        channel.name,
        'profil:',
        profileId,
      );

      const allRecents = await this.getAllRecents();

      // Vérifier si la chaîne existe déjà dans les récents
      const existingIndex = allRecents.findIndex(
        recent =>
          recent.channelId === channel.id &&
          recent.profileId === profileId &&
          recent.playlistId === playlistId,
      );

      let filtered = allRecents;

      // Si la chaîne n'existe pas encore, l'ajouter en tête
      if (existingIndex === -1) {
        const newRecent: RecentChannel = {
          id: `recent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          channelId: channel.id,
          channelName: channel.name,
          channelUrl: channel.url,
          channelLogo: channel.logo,
          channelCategory: channel.category || channel.group,
          playlistId,
          profileId,
          watchedAt: new Date().toISOString(),
          channelData: channel, // Stocker toute la chaîne
        };

        // Ajouter en tête uniquement si nouveau
        filtered.unshift(newRecent);
      } else {
        // Si elle existe déjà, juste mettre à jour la date de visionnage sans changer l'ordre
        filtered[existingIndex] = {
          ...filtered[existingIndex],
          watchedAt: new Date().toISOString(),
          channelData: channel, // Mettre à jour les données de la chaîne
        };
        console.log(
          '🔄 [RecentChannelsService] Chaîne déjà présente, mise à jour sans repositionnement',
        );
      }

      // Limiter le nombre total de récents (tous profils confondus)
      // On garde un max de MAX_RECENT_CHANNELS par profil/playlist
      const recentsByProfile = filtered.filter(
        r => r.profileId === profileId && r.playlistId === playlistId,
      );
      const otherRecents = filtered.filter(
        r => !(r.profileId === profileId && r.playlistId === playlistId),
      );

      const limitedProfileRecents = recentsByProfile.slice(
        0,
        MAX_RECENT_CHANNELS,
      );
      const finalRecents = [...limitedProfileRecents, ...otherRecents];

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(finalRecents));

      console.log(
        '✅ [RecentChannelsService] Chaîne ajoutée aux récents:',
        channel.name,
        'pour profil:',
        profileId,
        `(${limitedProfileRecents.length} récents pour ce profil)`,
      );
    } catch (error) {
      console.error(
        '❌ [RecentChannelsService] Erreur ajout récent:',
        error,
      );
      throw error;
    }
  }

  /**
   * Supprimer tous les récents d'un profil
   */
  async clearProfileRecents(profileId: string): Promise<void> {
    try {
      const allRecents = await this.getAllRecents();
      const filtered = allRecents.filter(
        recent => recent.profileId !== profileId,
      );

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      console.log('✅ [RecentChannelsService] Récents du profil supprimés:', profileId);
    } catch (error) {
      console.error(
        '❌ [RecentChannelsService] Erreur suppression récents profil:',
        error,
      );
      throw error;
    }
  }

  /**
   * Obtenir le nombre de récents pour un profil
   */
  async getRecentsCount(profileId: string, playlistId?: string): Promise<number> {
    try {
      const recents = await this.getRecentsByProfile(profileId, playlistId);
      return recents.length;
    } catch (error) {
      console.error(
        '❌ [RecentChannelsService] Erreur comptage récents:',
        error,
      );
      return 0;
    }
  }

  /**
   * Migration des anciennes clés vers le nouveau système
   * À appeler une fois pour migrer les données existantes
   */
  async migrateOldRecents(playlistId: string, profileId: string): Promise<void> {
    try {
      // Tenter de charger depuis l'ancienne clé
      const oldKey = `recent_channels_${playlistId}`;
      const oldData = await AsyncStorage.getItem(oldKey);

      if (!oldData) {
        console.log('🔍 [RecentChannelsService] Pas de migration nécessaire');
        return;
      }

      const oldChannels: Channel[] = JSON.parse(oldData);
      console.log(
        `🔄 [RecentChannelsService] Migration de ${oldChannels.length} chaînes depuis l'ancienne clé`,
      );

      // Ajouter chaque chaîne au nouveau système
      for (const channel of oldChannels) {
        await this.addRecent(channel, playlistId, profileId);
      }

      // Supprimer l'ancienne clé
      await AsyncStorage.removeItem(oldKey);
      console.log('✅ [RecentChannelsService] Migration terminée');
    } catch (error) {
      console.error(
        '❌ [RecentChannelsService] Erreur migration:',
        error,
      );
    }
  }
}

// Export singleton
export default new RecentChannelsService();
