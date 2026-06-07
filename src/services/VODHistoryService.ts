/**
 * 🎬 VODHistoryService - Historique de visionnage VOD (films & séries)
 * Même pattern que RecentChannelsService pour cohérence
 * Stockage AsyncStorage par profil/playlist
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {VodMovie, VodSeries} from '../types';

const STORAGE_KEY = 'app_vod_history';
const MAX_HISTORY_ITEMS = 50;

export interface VODHistoryItem {
  id: string;
  itemId: string;
  name: string;
  coverUrl?: string;
  playlistId: string;
  profileId: string;
  watchedAt: string;
  type: 'movie' | 'series';
  itemData: VodMovie | VodSeries;
}

class VODHistoryService {
  async getAllHistory(): Promise<VODHistoryItem[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ [VODHistoryService] Erreur lecture historique:', error);
      return [];
    }
  }

  async addMovieToHistory(
    movie: VodMovie,
    playlistId: string,
    profileId: string,
  ): Promise<void> {
    await this._addToHistory({
      id: `vod_movie_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      itemId: movie.movie_id || movie.id,
      name: movie.name,
      coverUrl: movie.cover_url,
      playlistId,
      profileId,
      watchedAt: new Date().toISOString(),
      type: 'movie',
      itemData: movie,
    });
  }

  async addSeriesToHistory(
    series: VodSeries,
    playlistId: string,
    profileId: string,
  ): Promise<void> {
    await this._addToHistory({
      id: `vod_series_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      itemId: series.series_id || series.id,
      name: series.name,
      coverUrl: series.cover_url,
      playlistId,
      profileId,
      watchedAt: new Date().toISOString(),
      type: 'series',
      itemData: series,
    });
  }

  private async _addToHistory(item: VODHistoryItem): Promise<void> {
    try {
      const allHistory = await this.getAllHistory();

      // Supprimer l'entrée existante pour cet item (évite les doublons)
      const withoutDuplicate = allHistory.filter(
        h =>
          !(
            h.itemId === item.itemId &&
            h.profileId === item.profileId &&
            h.playlistId === item.playlistId &&
            h.type === item.type
          ),
      );

      // Ajouter en tête
      withoutDuplicate.unshift(item);

      // Limiter par profil+type
      const profileTypeItems = withoutDuplicate.filter(
        h => h.profileId === item.profileId && h.type === item.type,
      );
      const others = withoutDuplicate.filter(
        h => !(h.profileId === item.profileId && h.type === item.type),
      );
      const limited = profileTypeItems.slice(0, MAX_HISTORY_ITEMS);

      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([...limited, ...others]),
      );

      console.log(
        `✅ [VODHistoryService] ${item.type} ajouté à l'historique: ${item.name} (profil: ${item.profileId})`,
      );
    } catch (error) {
      console.error('❌ [VODHistoryService] Erreur ajout historique:', error);
    }
  }

  async getWatchedMovies(
    profileId: string,
    playlistId: string,
  ): Promise<VodMovie[]> {
    try {
      const allHistory = await this.getAllHistory();
      return allHistory
        .filter(
          h =>
            h.profileId === profileId &&
            h.playlistId === playlistId &&
            h.type === 'movie',
        )
        .sort(
          (a, b) =>
            new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime(),
        )
        .map(h => h.itemData as VodMovie);
    } catch (error) {
      console.error('❌ [VODHistoryService] Erreur récupération films:', error);
      return [];
    }
  }

  async getWatchedSeries(
    profileId: string,
    playlistId: string,
  ): Promise<VodSeries[]> {
    try {
      const allHistory = await this.getAllHistory();
      return allHistory
        .filter(
          h =>
            h.profileId === profileId &&
            h.playlistId === playlistId &&
            h.type === 'series',
        )
        .sort(
          (a, b) =>
            new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime(),
        )
        .map(h => h.itemData as VodSeries);
    } catch (error) {
      console.error('❌ [VODHistoryService] Erreur récupération séries:', error);
      return [];
    }
  }

  async getWatchedMoviesCount(
    profileId: string,
    playlistId: string,
  ): Promise<number> {
    try {
      const allHistory = await this.getAllHistory();
      return allHistory.filter(
        h =>
          h.profileId === profileId &&
          h.playlistId === playlistId &&
          h.type === 'movie',
      ).length;
    } catch {
      return 0;
    }
  }

  async getWatchedSeriesCount(
    profileId: string,
    playlistId: string,
  ): Promise<number> {
    try {
      const allHistory = await this.getAllHistory();
      return allHistory.filter(
        h =>
          h.profileId === profileId &&
          h.playlistId === playlistId &&
          h.type === 'series',
      ).length;
    } catch {
      return 0;
    }
  }

  async clearProfileHistory(profileId: string): Promise<void> {
    try {
      const allHistory = await this.getAllHistory();
      const filtered = allHistory.filter(h => h.profileId !== profileId);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      console.log(
        `✅ [VODHistoryService] Historique du profil ${profileId} supprimé`,
      );
    } catch (error) {
      console.error('❌ [VODHistoryService] Erreur suppression historique:', error);
    }
  }
}

export default new VODHistoryService();
