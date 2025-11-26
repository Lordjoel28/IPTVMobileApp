/**
 * 🎬 VOD Cache Service - Stockage WatermelonDB pour Films/Séries
 *
 * Stratégie TIVIMATE/IPTV SMARTERS PRO:
 * 1. PRÉCHARGER les données VOD lors de l'ajout/sync de la playlist (PAS à l'ouverture de l'écran)
 * 2. Afficher instantanément depuis WatermelonDB à l'ouverture de l'écran
 * 3. Utilise SQLite via WatermelonDB pour stockage illimité (pas de limite 6MB comme AsyncStorage)
 */

import {Q} from '@nozbe/watermelondb';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {database} from '../database';
import type {
  VodMovie as VodMovieType,
  VodSeries as VodSeriesType,
  VodCategory as VodCategoryType,
} from '../types';
import type VodMovieModel from '../database/models/VodMovie';
import type VodSeriesModel from '../database/models/VodSeries';
import type VodCategoryModel from '../database/models/VodCategory';

const CACHE_PREFIX = '@vod_cache_';
const BATCH_SIZE = 2000; // Lots plus grands pour insertions SQL batch rapides

interface PreloadStats {
  moviesCount: number;
  seriesCount: number;
  categoriesCount: number;
  lastPreload: number;
}

class VODCacheService {
  private static instance: VODCacheService;

  private constructor() {}

  static getInstance(): VODCacheService {
    if (!VODCacheService.instance) {
      VODCacheService.instance = new VODCacheService();
    }
    return VODCacheService.instance;
  }

  /**
   * 🚀 PRÉCHARGEMENT COMPLET - Style TiviMate/IPTV Smarters Pro
   * Stocke TOUTES les données VOD dans WatermelonDB (SQLite)
   * ULTRA-RAPIDE: insertion batch en une seule transaction
   */
  async preloadPlaylistVOD(
    playlistId: string,
    credentials: {url: string; username: string; password: string},
    onProgress?: (stage: string, progress: number) => void,
  ): Promise<PreloadStats> {
    console.log(`🚀 [VODCache] Préchargement VOD ULTRA-RAPIDE pour playlist ${playlistId}...`);
    const totalStartTime = Date.now();

    const WatermelonXtreamService = (await import('./WatermelonXtreamService')).default;

    let moviesCount = 0;
    let seriesCount = 0;
    let categoriesCount = 0;

    try {
      // 1. Nettoyer les anciennes données VOD (rapide si vide)
      onProgress?.('Nettoyage cache...', 0);
      await this.clearPlaylistVOD(playlistId);

      // 2. Télécharger TOUTES les données en parallèle (le plus rapide)
      onProgress?.('Téléchargement des films et séries...', 10);
      console.log('📥 Téléchargement parallèle des données VOD...');

      const [movieCategories, movies, seriesCategories, series] = await Promise.all([
        WatermelonXtreamService.getVodCategories(credentials),
        WatermelonXtreamService.getVodStreams(credentials),
        WatermelonXtreamService.getSeriesCategories(credentials),
        WatermelonXtreamService.getSeriesStreams(credentials),
      ]);

      console.log(`📥 Téléchargement terminé: ${movies.length} films, ${series.length} séries`);
      onProgress?.('Sauvegarde des films...', 40);

      // 3. Sauvegarder les catégories (très rapide)
      await this.saveCategoriesToDB(playlistId, movieCategories, 'movie');
      await this.saveCategoriesToDB(playlistId, seriesCategories, 'series');
      categoriesCount = movieCategories.length + seriesCategories.length;

      // 4. Sauvegarder les films (batch ultra-rapide)
      await this.saveMoviesToDB(playlistId, movies);
      moviesCount = movies.length;
      onProgress?.('Sauvegarde des séries...', 70);

      // 5. Sauvegarder les séries (batch ultra-rapide)
      await this.saveSeriesToDB(playlistId, series);
      seriesCount = series.length;
      onProgress?.('Finalisation...', 95);

      // 6. Sauvegarder le statut de préchargement
      const stats: PreloadStats = {
        moviesCount,
        seriesCount,
        categoriesCount,
        lastPreload: Date.now(),
      };
      await AsyncStorage.setItem(
        `${CACHE_PREFIX}preload_status_${playlistId}`,
        JSON.stringify(stats),
      );

      const totalDuration = ((Date.now() - totalStartTime) / 1000).toFixed(1);
      onProgress?.('Terminé!', 100);
      console.log(`✅ [VODCache] Préchargement terminé en ${totalDuration}s: ${moviesCount} films, ${seriesCount} séries, ${categoriesCount} catégories`);

      return stats;
    } catch (error) {
      console.error('❌ [VODCache] Erreur préchargement VOD:', error);
      throw error;
    }
  }

  /**
   * 💾 Sauvegarder les films dans WatermelonDB - INSERTION BATCH ULTRA-RAPIDE
   */
  private async saveMoviesToDB(
    playlistId: string,
    movies: VodMovieType[],
    _onProgress?: (stage: string, progress: number) => void,
  ): Promise<void> {
    if (movies.length === 0) return;

    console.log(`💾 Sauvegarde ULTRA-RAPIDE de ${movies.length} films...`);
    const startTime = Date.now();

    // Préparer toutes les créations en une seule transaction
    await database.write(async () => {
      const movieCollection = database.get<VodMovieModel>('vod_movies');
      const batchCreates: Promise<VodMovieModel>[] = [];

      for (const movie of movies) {
        batchCreates.push(
          movieCollection.create(record => {
            record.playlistId = playlistId;
            record.movieId = String(movie.movie_id || '');
            record.categoryId = String(movie.category_id || '');
            record.name = movie.name || '';
            record.streamUrl = movie.stream_url || '';
            record.coverUrl = movie.cover_url || '';
            record.rating = movie.rating || '';
            record.duration = movie.duration || '';
            record.genre = movie.genre || '';
            record.releaseDate = movie.release_date || '';
            record.plot = movie.plot || '';
            record.director = movie.director || '';
            record.cast = movie.cast || '';
            record.added = movie.added ? String(movie.added) : '';
            record.containerExtension = movie.container_extension || '';
          }),
        );
      }

      // Exécuter toutes les créations en parallèle dans la même transaction
      await Promise.all(batchCreates);
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`   ✅ ${movies.length} films sauvegardés en ${duration}s`);
  }

  /**
   * 💾 Sauvegarder les séries dans WatermelonDB - INSERTION BATCH ULTRA-RAPIDE
   */
  private async saveSeriesToDB(
    playlistId: string,
    series: VodSeriesType[],
    _onProgress?: (stage: string, progress: number) => void,
  ): Promise<void> {
    if (series.length === 0) return;

    console.log(`💾 Sauvegarde ULTRA-RAPIDE de ${series.length} séries...`);
    const startTime = Date.now();

    // Préparer toutes les créations en une seule transaction
    await database.write(async () => {
      const seriesCollection = database.get<VodSeriesModel>('vod_series');
      const batchCreates: Promise<VodSeriesModel>[] = [];

      for (const seriesItem of series) {
        batchCreates.push(
          seriesCollection.create(record => {
            record.playlistId = playlistId;
            record.seriesId = String(seriesItem.series_id || seriesItem.stream_id || '');
            record.categoryId = String(seriesItem.category_id || '');
            record.name = seriesItem.name || '';
            record.coverUrl = seriesItem.cover_url || '';
            record.backdropUrl = seriesItem.backdrop_url || '';
            record.rating = seriesItem.rating || '';
            record.genre = seriesItem.genre || '';
            record.releaseDate = seriesItem.release_date || '';
            record.plot = seriesItem.plot || '';
            record.director = seriesItem.director || '';
            record.cast = seriesItem.cast || '';
            record.episodesCount = seriesItem.episodes_count || 0;
            record.seasonsCount = seriesItem.seasons_count || 0;
            record.added = seriesItem.added ? String(seriesItem.added) : '';
            record.lastUpdated = seriesItem.last_updated || '';
          }),
        );
      }

      // Exécuter toutes les créations en parallèle dans la même transaction
      await Promise.all(batchCreates);
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`   ✅ ${series.length} séries sauvegardées en ${duration}s`);
  }

  /**
   * 💾 Sauvegarder les catégories dans WatermelonDB
   */
  private async saveCategoriesToDB(
    playlistId: string,
    categories: VodCategoryType[],
    type: 'movie' | 'series',
  ): Promise<void> {
    console.log(`💾 Sauvegarde de ${categories.length} catégories ${type}...`);

    await database.write(async () => {
      const categoryCollection = database.get<VodCategoryModel>('vod_categories');

      for (const category of categories) {
        await categoryCollection.create(record => {
          record.playlistId = playlistId;
          record.categoryId = String(category.category_id || '');
          record.categoryName = category.category_name || '';
          record.categoryType = type;
          record.parentId = typeof category.parent_id === 'number' ? category.parent_id : 0;
        });
      }
    });

    console.log(`   ✅ ${categories.length} catégories ${type} sauvegardées`);
  }

  /**
   * 🧹 Nettoyer les données VOD d'une playlist
   */
  private async clearPlaylistVOD(playlistId: string): Promise<void> {
    console.log(`🧹 Nettoyage des données VOD pour playlist ${playlistId}...`);

    await database.write(async () => {
      // Supprimer les films
      const movies = await database
        .get<VodMovieModel>('vod_movies')
        .query(Q.where('playlist_id', playlistId))
        .fetch();
      for (const movie of movies) {
        await movie.destroyPermanently();
      }
      console.log(`   🗑️ ${movies.length} films supprimés`);

      // Supprimer les séries
      const series = await database
        .get<VodSeriesModel>('vod_series')
        .query(Q.where('playlist_id', playlistId))
        .fetch();
      for (const seriesItem of series) {
        await seriesItem.destroyPermanently();
      }
      console.log(`   🗑️ ${series.length} séries supprimées`);

      // Supprimer les catégories
      const categories = await database
        .get<VodCategoryModel>('vod_categories')
        .query(Q.where('playlist_id', playlistId))
        .fetch();
      for (const category of categories) {
        await category.destroyPermanently();
      }
      console.log(`   🗑️ ${categories.length} catégories supprimées`);
    });
  }

  /**
   * 📥 Récupérer les films INSTANTANÉMENT depuis WatermelonDB
   */
  async getMoviesFromCache(playlistId: string): Promise<VodMovieType[] | null> {
    try {
      const movies = await database
        .get<VodMovieModel>('vod_movies')
        .query(Q.where('playlist_id', playlistId))
        .fetch();

      if (movies.length === 0) {
        console.log('🎬 Films: Aucune donnée en cache');
        return null;
      }

      console.log(`🎬 Films: ${movies.length} films chargés depuis WatermelonDB`);

      // Convertir les modèles WatermelonDB en types VodMovie
      return movies.map(movie => ({
        id: movie.id,
        movie_id: movie.movieId,
        name: movie.name,
        plot: movie.plot || '',
        genre: movie.genre || '',
        director: movie.director || '',
        cast: movie.cast || '',
        release_date: movie.releaseDate || '',
        rating: movie.rating || '',
        duration: movie.duration || '',
        imdb_id: '',
        cover_url: movie.coverUrl || '',
        backdrop_url: movie.coverUrl || '', // Utiliser cover comme fallback
        stream_url: movie.streamUrl,
        container_extension: movie.containerExtension || '',
        added: movie.added || '',
        category_id: movie.categoryId,
        category_name: '', // Sera rempli par le mapping côté écran
      }));
    } catch (error) {
      console.error('❌ Erreur lecture films depuis WatermelonDB:', error);
      return null;
    }
  }

  /**
   * 📥 Récupérer les séries INSTANTANÉMENT depuis WatermelonDB
   */
  async getSeriesFromCache(playlistId: string): Promise<VodSeriesType[] | null> {
    try {
      const series = await database
        .get<VodSeriesModel>('vod_series')
        .query(Q.where('playlist_id', playlistId))
        .fetch();

      if (series.length === 0) {
        console.log('📺 Séries: Aucune donnée en cache');
        return null;
      }

      console.log(`📺 Séries: ${series.length} séries chargées depuis WatermelonDB`);

      // Convertir les modèles WatermelonDB en types VodSeries
      return series.map(s => ({
        id: s.id,
        series_id: s.seriesId,
        stream_id: s.seriesId,
        name: s.name,
        plot: s.plot || '',
        genre: s.genre || '',
        director: s.director || '',
        cast: s.cast || '',
        release_date: s.releaseDate || '',
        rating: s.rating || '',
        imdb_id: '',
        cover_url: s.coverUrl || '',
        backdrop_url: s.backdropUrl || '',
        youtube_trailer: '',
        episodes_count: s.episodesCount || 0,
        seasons_count: s.seasonsCount || 0,
        last_updated: s.lastUpdated || '',
        category_id: s.categoryId,
        category_name: '', // Sera rempli par le mapping côté écran
        added: s.added || '',
      }));
    } catch (error) {
      console.error('❌ Erreur lecture séries depuis WatermelonDB:', error);
      return null;
    }
  }

  /**
   * 📥 Récupérer les catégories INSTANTANÉMENT depuis WatermelonDB
   */
  async getCategoriesFromCache(
    playlistId: string,
    type: 'movies' | 'series',
  ): Promise<VodCategoryType[] | null> {
    try {
      const categoryType = type === 'movies' ? 'movie' : 'series';
      const categories = await database
        .get<VodCategoryModel>('vod_categories')
        .query(
          Q.where('playlist_id', playlistId),
          Q.where('category_type', categoryType),
        )
        .fetch();

      if (categories.length === 0) {
        console.log(`📁 Catégories ${type}: Aucune donnée en cache`);
        return null;
      }

      console.log(`📁 Catégories ${type}: ${categories.length} catégories chargées`);

      // Convertir les modèles WatermelonDB en types VodCategory
      return categories.map(cat => ({
        id: cat.id,
        category_id: cat.categoryId,
        category_name: cat.categoryName,
        parent_id: cat.parentId || 0,
        type: categoryType as 'movie' | 'series',
        count: 0, // Le count sera calculé côté écran si nécessaire
      }));
    } catch (error) {
      console.error(`❌ Erreur lecture catégories ${type} depuis WatermelonDB:`, error);
      return null;
    }
  }

  /**
   * 🔍 Vérifier si le cache VOD est disponible et valide
   */
  async hasValidCache(playlistId: string): Promise<boolean> {
    try {
      const statusJson = await AsyncStorage.getItem(`${CACHE_PREFIX}preload_status_${playlistId}`);
      if (!statusJson) return false;

      const status: PreloadStats = JSON.parse(statusJson);
      const age = Date.now() - status.lastPreload;

      // Cache valide si moins de 7 jours ET données présentes
      const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
      return age < SEVEN_DAYS && (status.moviesCount > 0 || status.seriesCount > 0);
    } catch {
      return false;
    }
  }

  /**
   * ⭐ Gestion des favoris VOD (persistant via AsyncStorage)
   */
  async getFavorites(playlistId: string, type: 'movies' | 'series'): Promise<string[]> {
    const key = `${CACHE_PREFIX}favorites_${type}_${playlistId}`;
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  async addFavorite(playlistId: string, type: 'movies' | 'series', itemId: string): Promise<void> {
    const favorites = await this.getFavorites(playlistId, type);
    if (!favorites.includes(itemId)) {
      favorites.push(itemId);
      const key = `${CACHE_PREFIX}favorites_${type}_${playlistId}`;
      await AsyncStorage.setItem(key, JSON.stringify(favorites));
    }
  }

  async removeFavorite(playlistId: string, type: 'movies' | 'series', itemId: string): Promise<void> {
    const favorites = await this.getFavorites(playlistId, type);
    const filtered = favorites.filter(id => id !== itemId);
    const key = `${CACHE_PREFIX}favorites_${type}_${playlistId}`;
    await AsyncStorage.setItem(key, JSON.stringify(filtered));
  }

  /**
   * 🕐 Gestion de l'historique de visionnage
   */
  async getRecentlyWatched(
    playlistId: string,
    type: 'movies' | 'series',
  ): Promise<{id: string; timestamp: number}[]> {
    const key = `${CACHE_PREFIX}watched_${type}_${playlistId}`;
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  async addToRecentlyWatched(
    playlistId: string,
    type: 'movies' | 'series',
    itemId: string,
  ): Promise<void> {
    const watched = await this.getRecentlyWatched(playlistId, type);
    const filtered = watched.filter(item => item.id !== itemId);
    filtered.unshift({id: itemId, timestamp: Date.now()});
    const limited = filtered.slice(0, 50);
    const key = `${CACHE_PREFIX}watched_${type}_${playlistId}`;
    await AsyncStorage.setItem(key, JSON.stringify(limited));
  }

  /**
   * 🆕 Tri par date d'ajout (récemment ajoutés)
   */
  getRecentlyAdded(
    items: (VodMovieType | VodSeriesType)[],
    limit: number = 50,
  ): (VodMovieType | VodSeriesType)[] {
    return [...items]
      .sort((a, b) => {
        const dateA = a.added ? parseInt(String(a.added), 10) : 0;
        const dateB = b.added ? parseInt(String(b.added), 10) : 0;
        return dateB - dateA;
      })
      .slice(0, limit);
  }

  /**
   * 📊 Obtenir les statistiques du cache VOD
   */
  async getCacheStats(playlistId: string): Promise<PreloadStats | null> {
    try {
      const statusJson = await AsyncStorage.getItem(`${CACHE_PREFIX}preload_status_${playlistId}`);
      if (!statusJson) return null;
      return JSON.parse(statusJson);
    } catch {
      return null;
    }
  }

  /**
   * 🧹 Nettoyer tout le cache VOD (toutes les playlists)
   */
  async clearAllCache(): Promise<void> {
    console.log('🧹 Nettoyage complet du cache VOD...');

    await database.write(async () => {
      // Supprimer tous les films
      const allMovies = await database.get<VodMovieModel>('vod_movies').query().fetch();
      for (const movie of allMovies) {
        await movie.destroyPermanently();
      }

      // Supprimer toutes les séries
      const allSeries = await database.get<VodSeriesModel>('vod_series').query().fetch();
      for (const series of allSeries) {
        await series.destroyPermanently();
      }

      // Supprimer toutes les catégories
      const allCategories = await database.get<VodCategoryModel>('vod_categories').query().fetch();
      for (const category of allCategories) {
        await category.destroyPermanently();
      }
    });

    // Nettoyer les métadonnées dans AsyncStorage
    const keys = await AsyncStorage.getAllKeys();
    const vodKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
    if (vodKeys.length > 0) {
      await AsyncStorage.multiRemove(vodKeys);
    }

    console.log('✅ Cache VOD complètement nettoyé');
  }
}

export default VODCacheService.getInstance();
