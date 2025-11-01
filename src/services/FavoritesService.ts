/**
 * ⭐ FavoritesService - Gestion des favoris par profil
 * Stockage dans AsyncStorage avec filtrage par profileId
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {Favorite, Channel} from '../types';

const STORAGE_KEY = 'app_favorites';

class FavoritesService {
  /**
   * Obtenir tous les favoris (tous profils confondus)
   */
  async getAllFavorites(): Promise<Favorite[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (!data) {
        return [];
      }
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ Erreur lecture favoris:', error);
      return [];
    }
  }

  /**
   * Obtenir les favoris d'un profil spécifique
   */
  async getFavoritesByProfile(profileId: string): Promise<Favorite[]> {
    try {
      const allFavorites = await this.getAllFavorites();
      return allFavorites.filter(fav => fav.profileId === profileId);
    } catch (error) {
      console.error('❌ Erreur récupération favoris profil:', error);
      return [];
    }
  }

  /**
   * 🆕 Obtenir les chaînes favorites d'un profil pour une playlist (retourne Channel[])
   * Même logique que RecentChannelsService.getRecentsByProfile()
   */
  async getFavoriteChannelsByProfile(
    profileId: string,
    playlistId?: string,
  ): Promise<Channel[]> {
    try {
      console.log(
        '🔍 [FavoritesService] Chargement favoris pour profil:',
        profileId,
        'playlist:',
        playlistId,
      );

      const allFavorites = await this.getAllFavorites();
      console.log(
        '🔍 [FavoritesService] Total favoris dans le storage:',
        allFavorites.length,
      );

      // Filtrer par profileId (et playlistId si fourni)
      let filtered = allFavorites.filter(fav => fav.profileId === profileId);

      if (playlistId) {
        filtered = filtered.filter(fav => fav.playlistId === playlistId);
      }

      console.log(
        '🔍 [FavoritesService] Favoris filtrés pour ce profil:',
        filtered.length,
      );

      // Trier par date d'ajout (plus récent en premier)
      filtered.sort(
        (a, b) =>
          new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime(),
      );

      // ✅ Retourner les données des chaînes avec validation robuste
      return filtered
        .map(fav => fav.channelData)
        .filter(Boolean) // Enlever les valeurs null/undefined
        .map(channel => ({
          ...channel,
          // ✅ Garantir que les propriétés critiques existent
          id: channel.id || `favorite_${Date.now()}_${Math.random()}`,
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
        '❌ [FavoritesService] Erreur récupération favoris profil:',
        error,
      );
      return [];
    }
  }

  /**
   * Vérifier si une chaîne est en favori pour un profil et playlist spécifiques
   */
  async isFavorite(channelId: string, profileId: string, playlistId?: string): Promise<boolean> {
    try {
      const favorites = await this.getFavoritesByProfile(profileId);
      return favorites.some(fav =>
        fav.channelId === channelId && (!playlistId || fav.playlistId === playlistId)
      );
    } catch (error) {
      console.error('❌ Erreur vérification favori:', error);
      return false;
    }
  }

  /**
   * Ajouter une chaîne aux favoris d'un profil
   */
  async addFavorite(
    channel: Channel,
    playlistId: string,
    profileId: string,
  ): Promise<void> {
    try {
      const allFavorites = await this.getAllFavorites();

      // Vérifier si déjà en favori (même profil + même playlist)
      const exists = allFavorites.some(
        fav => fav.channelId === channel.id && fav.profileId === profileId && fav.playlistId === playlistId,
      );

      if (exists) {
        console.log('⭐ Chaîne déjà en favoris');
        return;
      }

      const newFavorite: Favorite = {
        id: `fav_${Date.now()}`,
        channelId: channel.id,
        playlistId,
        userId: 'default', // Legacy, peut être supprimé plus tard
        profileId,
        dateAdded: new Date().toISOString(),
        category: channel.category || channel.group,
        streamUrl: channel.url,
        channelName: channel.name,
        // ✅ Stocker la chaîne complète (même logique que RecentChannelsService)
        channelData: channel,
      };

      allFavorites.push(newFavorite);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(allFavorites));

      console.log('✅ Favori ajouté:', channel.name, 'pour profil:', profileId);
    } catch (error) {
      console.error('❌ Erreur ajout favori:', error);
      throw error;
    }
  }

  /**
   * Retirer une chaîne des favoris d'un profil
   */
  async removeFavorite(channelId: string, profileId: string): Promise<void> {
    try {
      const allFavorites = await this.getAllFavorites();
      const filtered = allFavorites.filter(
        fav => !(fav.channelId === channelId && fav.profileId === profileId),
      );

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      console.log('✅ Favori retiré:', channelId, 'du profil:', profileId);
    } catch (error) {
      console.error('❌ Erreur suppression favori:', error);
      throw error;
    }
  }

  /**
   * Basculer l'état favori d'une chaîne pour un profil et playlist spécifiques
   */
  async toggleFavorite(
    channel: Channel,
    playlistId: string,
    profileId: string,
  ): Promise<boolean> {
    try {
      const isFav = await this.isFavorite(channel.id, profileId, playlistId);

      if (isFav) {
        await this.removeFavorite(channel.id, profileId);
        return false;
      } else {
        await this.addFavorite(channel, playlistId, profileId);
        return true;
      }
    } catch (error) {
      console.error('❌ Erreur toggle favori:', error);
      throw error;
    }
  }

  /**
   * Supprimer tous les favoris d'un profil (lors de suppression du profil)
   */
  async clearProfileFavorites(profileId: string): Promise<void> {
    try {
      const allFavorites = await this.getAllFavorites();
      const filtered = allFavorites.filter(fav => fav.profileId !== profileId);

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      console.log('✅ Favoris du profil supprimés:', profileId);
    } catch (error) {
      console.error('❌ Erreur suppression favoris profil:', error);
      throw error;
    }
  }

  /**
   * Obtenir le nombre de favoris pour un profil
   */
  async getFavoritesCount(profileId: string): Promise<number> {
    try {
      const favorites = await this.getFavoritesByProfile(profileId);
      return favorites.length;
    } catch (error) {
      console.error('❌ Erreur comptage favoris:', error);
      return 0;
    }
  }

}

// Export singleton
export default new FavoritesService();
