/**
 * 🎬 VOD Hybrid Service - Solution hybride style IPTV Smarters Pro
 *
 * Stratégie:
 * 1. Import RAPIDE des catégories seulement
 * 2. Lazy loading par catégorie à la demande
 * 3. Cache intelligent pour éviter re-téléchargements
 */

import {Q} from '@nozbe/watermelondb';
import {database} from '../database';
import type {
  VodMovie as VodMovieType,
  VodSeries as VodSeriesType,
  VodCategory as VodCategoryType,
} from '../types';
import type VodMovieModel from '../database/models/VodMovie';
import type VodSeriesModel from '../database/models/VodSeries';
import type VodCategoryModel from '../database/models/VodCategory';
import {networkService} from './NetworkService';

export interface XtreamCredentials {
  url: string;
  username: string;
  password: string;
}

// Cache des catégories déjà téléchargées pour éviter re-téléchargement
const DOWNLOADED_CATEGORIES = new Set<string>();

// Cache des compteurs pour éviter les recalculs fréquents
const CATEGORIES_COUNTS_CACHE = new Map<string, {counts: Map<string, {moviesCount: number; seriesCount: number}>; lastUpdate: number}>();

// Durée de validité du cache des compteurs (5 minutes)
const COUNTS_CACHE_TTL = 5 * 60 * 1000;

// Helper pour générer des IDs uniques (style WatermelonDB)
const generateId = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 16; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
};

// Helper pour échapper les quotes SQL
const escapeSQL = (str: string | undefined | null): string => {
  if (!str) return '';
  return String(str).replace(/'/g, "''");
};

class VODHybridService {
  private static instance: VODHybridService;

  private constructor() {}

  static getInstance(): VODHybridService {
    if (!VODHybridService.instance) {
      VODHybridService.instance = new VODHybridService();
    }
    return VODHybridService.instance;
  }

  /**
   * 📊 Calculer les compteurs de films/séries par catégorie
   * OPTIMISÉ: Utilise SQL COUNT au lieu de charger tous les objets en mémoire
   */
  async calculateCategoriesCounts(
    playlistId: string,
    credentials?: XtreamCredentials,
    onProgress?: (message: string) => void
  ): Promise<Map<string, {moviesCount: number; seriesCount: number}>> {
    try {
      console.log('📊 Calcul des compteurs...');
      const startTime = Date.now();

      // 1. Vérifier le cache mémoire (valide 5 minutes)
      const cached = CATEGORIES_COUNTS_CACHE.get(playlistId);
      if (cached && (Date.now() - cached.lastUpdate) < COUNTS_CACHE_TTL) {
        console.log(`⚡ Compteurs depuis cache mémoire (${cached.counts.size} entrées)`);
        return cached.counts;
      }

      // 2. Vérifier si des films existent en DB avec une requête COUNT rapide
      const countResult = await database
        .get<VodMovieModel>('vod_movies')
        .query(Q.where('playlist_id', playlistId))
        .fetchCount();

      // 3. Si cache vide et credentials → télécharger et sauvegarder
      if (countResult === 0 && credentials) {
        console.log('🎬 Cache vide → Téléchargement des films...');
        onProgress?.('Téléchargement des films...');

        const WatermelonXtreamService = (await import('./WatermelonXtreamService')).default;
        const freshMovies = await WatermelonXtreamService.getVodStreams(credentials);

        if (freshMovies.length > 0) {
          console.log(`📥 ${freshMovies.length} films reçus`);
          onProgress?.(`Sauvegarde de ${freshMovies.length} films...`);
          await this.saveMoviesDirectSQL(playlistId, freshMovies);
        }
      }

      // 4. Compter par catégorie avec SQL direct (ULTRA RAPIDE)
      const result = new Map<string, {moviesCount: number; seriesCount: number}>();

      // Obtenir le total
      const totalCount = await database
        .get<VodMovieModel>('vod_movies')
        .query(Q.where('playlist_id', playlistId))
        .fetchCount();

      result.set('movies', {moviesCount: totalCount, seriesCount: 0});

      // Compter par catégorie avec SQL raw GROUP BY (ULTRA RAPIDE)
      try {
        // Méthode WatermelonDB officielle: Q.unsafeSqlQuery + unsafeFetchRaw
        const rawCounts = await database
          .get<VodMovieModel>('vod_movies')
          .query(
            Q.unsafeSqlQuery(
              `SELECT category_id, COUNT(*) as count FROM vod_movies WHERE playlist_id = ? GROUP BY category_id`,
              [playlistId]
            )
          )
          .unsafeFetchRaw();

        for (const row of rawCounts) {
          if (row.category_id) {
            result.set(row.category_id, {moviesCount: row.count, seriesCount: 0});
          }
        }
        console.log(`⚡ SQL GROUP BY: ${rawCounts.length} catégories comptées`);
      } catch (sqlError) {
        // Fallback: charger et compter en mémoire si SQL raw échoue
        console.warn('⚠️ SQL raw non supporté, fallback mémoire...', sqlError);
        const movies = await database
          .get<VodMovieModel>('vod_movies')
          .query(Q.where('playlist_id', playlistId))
          .fetch();

        const categoryCountMap = new Map<string, number>();
        for (const movie of movies) {
          if (movie.categoryId) {
            const catId = movie.categoryId;
            categoryCountMap.set(catId, (categoryCountMap.get(catId) || 0) + 1);
          }
        }

        categoryCountMap.forEach((count, catId) => {
          result.set(catId, {moviesCount: count, seriesCount: 0});
        });
      }

      // 5. Mettre en cache mémoire
      CATEGORIES_COUNTS_CACHE.set(playlistId, {
        counts: result,
        lastUpdate: Date.now(),
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✅ Compteurs calculés en ${duration}s: ${totalCount} films`);

      return result;

    } catch (error) {
      console.error('❌ Erreur calcul des compteurs:', error);
      return new Map();
    }
  }

  /**
   * 📺 Calculer les compteurs de séries (même logique que films)
   * Style IPTV Smarters Pro: Cache mémoire + sauvegarde DB en arrière-plan
   */
  async calculateSeriesCounts(
    playlistId: string,
    credentials?: XtreamCredentials,
    onProgress?: (message: string) => void
  ): Promise<Map<string, {moviesCount: number; seriesCount: number}>> {
    try {
      console.log('📊 Calcul des compteurs séries...');
      const startTime = Date.now();

      // 1. Vérifier le cache DB
      let allSeries = await this.getAllCachedSeries(playlistId);

      if (allSeries.length > 0) {
        console.log(`✅ ${allSeries.length} séries depuis cache DB`);
      }

      // 2. Si cache vide → télécharger et sauvegarder avec SQL direct
      if ((!allSeries || allSeries.length === 0) && credentials) {
        console.log('📺 Cache vide → Téléchargement des séries...');
        onProgress?.('Téléchargement des séries...');

        const WatermelonXtreamService = (await import('./WatermelonXtreamService')).default;
        const freshSeries = await WatermelonXtreamService.getSeriesStreams(credentials);

        if (freshSeries.length > 0) {
          console.log(`📥 ${freshSeries.length} séries reçues`);
          onProgress?.(`Sauvegarde de ${freshSeries.length} séries...`);

          // Sauvegarder avec SQL direct (RAPIDE)
          await this.saveSeriesDirectSQL(playlistId, freshSeries);
          allSeries = freshSeries;
        }
      }

      // 3. Compter localement
      const seriesCountsByCategory = new Map<string, number>();

      allSeries.forEach(series => {
        if (series.category_id) {
          const catId = String(series.category_id);
          seriesCountsByCategory.set(catId, (seriesCountsByCategory.get(catId) || 0) + 1);
        }
      });

      const seriesTotal = allSeries.length;

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✅ Compteurs séries calculés en ${duration}s: ${seriesTotal} séries`);

      const result = new Map<string, {moviesCount: number; seriesCount: number}>([
        ['series', {moviesCount: 0, seriesCount: seriesTotal}],
      ]);

      seriesCountsByCategory.forEach((count, catId) => {
        result.set(catId, { moviesCount: 0, seriesCount: count });
      });

      return result;

    } catch (error) {
      console.error('❌ Erreur calcul des compteurs séries:', error);
      return new Map();
    }
  }

  /**
   * 📁 Vérifier si les catégories sont déjà en cache
   */
  async hasCachedCategories(playlistId: string): Promise<boolean> {
    try {
      const categories = await database
        .get<VodCategoryModel>('vod_categories')
        .query(Q.where('playlist_id', playlistId))
        .fetch();

      return categories.length > 0;
    } catch (error) {
      console.error('❌ Erreur vérification catégories en cache:', error);
      return false;
    }
  }

  /**
   * 📥 Récupérer les catégories depuis le cache
   */
  async getCachedCategories(
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

      return categories.map(cat => ({
        id: cat.id,
        category_id: cat.categoryId,
        category_name: cat.categoryName,
        parent_id: cat.parentId || 0,
        type: categoryType as 'movie' | 'series',
        count: 0,
      }));
    } catch (error) {
      console.error(`❌ Erreur lecture catégories ${type}:`, error);
      return null;
    }
  }

  /**
   * 🎬 Récupérer les films d'une catégorie depuis le cache mémoire
   * Tous les films sont déjà chargés via calculateCategoriesCounts
   */
  async loadCategoryMovies(
    playlistId: string,
    categoryId: string,
    _credentials: XtreamCredentials,
  ): Promise<VodMovieType[]> {
    try {
      const movies = await this.getCachedMovies(playlistId, categoryId);
      console.log(`✅ ${movies.length} films catégorie ${categoryId}`);
      return movies;

    } catch (error) {
      console.error(`❌ Erreur récupération films catégorie ${categoryId}:`, error);
      return [];
    }
  }

  /**
   * 📺 Récupérer les séries d'une catégorie depuis le cache DB
   */
  async loadCategorySeries(
    playlistId: string,
    categoryId: string,
    _credentials: XtreamCredentials,
  ): Promise<VodSeriesType[]> {
    try {
      const series = await this.getCachedSeries(playlistId, categoryId);
      console.log(`✅ ${series.length} séries catégorie ${categoryId}`);
      return series;

    } catch (error) {
      console.error(`❌ Erreur récupération séries catégorie ${categoryId}:`, error);
      return [];
    }
  }

  /**
   * 🎬 Récupérer TOUS les films depuis le cache (performant - 1 seule requête)
   */
  async getAllCachedMovies(playlistId: string): Promise<VodMovieType[]> {
    try {
      const movies = await database
        .get<VodMovieModel>('vod_movies')
        .query(Q.where('playlist_id', playlistId))
        .fetch();

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
        backdrop_url: movie.coverUrl || '',
        stream_url: movie.streamUrl,
        container_extension: movie.containerExtension || '',
        added: movie.added || '',
        category_id: movie.categoryId,
        category_name: '',
      }));
    } catch (error) {
      console.error('❌ Erreur lecture TOUS les films depuis cache:', error);
      return [];
    }
  }

  /**
   * 🎬 Récupérer les films depuis le cache (filtrés par catégorie)
   */
  async getCachedMovies(playlistId: string, categoryId?: string): Promise<VodMovieType[]> {
    try {
      // Construire les conditions de requête
      const queryConditions = [Q.where('playlist_id', playlistId)];

      // Ajouter le filtre par catégorie si spécifié
      if (categoryId) {
        queryConditions.push(Q.where('category_id', categoryId));
      }

      const movies = await database
        .get<VodMovieModel>('vod_movies')
        .query(...queryConditions)
        .fetch();

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
        backdrop_url: movie.coverUrl || '',
        stream_url: movie.streamUrl,
        container_extension: movie.containerExtension || '',
        added: movie.added || '',
        category_id: movie.categoryId,
        category_name: '',
      }));
    } catch (error) {
      console.error('❌ Erreur lecture films depuis cache:', error);
      return [];
    }
  }

  /**
   * 📺 Récupérer TOUTES les séries depuis le cache (performant - 1 seule requête)
   */
  async getAllCachedSeries(playlistId: string): Promise<VodSeriesType[]> {
    try {
      const series = await database
        .get<VodSeriesModel>('vod_series')
        .query(Q.where('playlist_id', playlistId))
        .fetch();

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
        category_name: '',
        added: s.added || '',
      }));
    } catch (error) {
      console.error('❌ Erreur lecture TOUTES les séries depuis cache:', error);
      return [];
    }
  }

  /**
   * 📺 Récupérer les séries depuis le cache (filtrées par catégorie)
   */
  async getCachedSeries(playlistId: string, categoryId?: string): Promise<VodSeriesType[]> {
    try {
      // Construire les conditions de requête
      const queryConditions = [Q.where('playlist_id', playlistId)];

      // Ajouter le filtre par catégorie si spécifié
      if (categoryId) {
        queryConditions.push(Q.where('category_id', categoryId));
      }

      const series = await database
        .get<VodSeriesModel>('vod_series')
        .query(...queryConditions)
        .fetch();

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
        category_name: '',
        added: s.added || '',
      }));
    } catch (error) {
      console.error('❌ Erreur lecture séries depuis cache:', error);
      return [];
    }
  }

  /**
   * 🔄 Mettre à jour ou créer les métadonnées enrichies d'un film (genre, cast, director, etc.)
   * Performance: ~10ms par film (très rapide)
   */
  async updateMovieMetadata(
    playlistId: string,
    movieId: string,
    enrichedData: Partial<VodMovieType>
  ): Promise<void> {
    try {
      console.log(`💾 Mise à jour/création métadonnées pour film ${movieId}...`);

      await database.write(async () => {
        const movies = await database
          .get<VodMovieModel>('vod_movies')
          .query(
            Q.where('playlist_id', playlistId),
            Q.where('movie_id', movieId)
          )
          .fetch();

        const movieCollection = database.get<VodMovieModel>('vod_movies');

        if (movies.length === 0) {
          // Film n'existe pas → CRÉER une nouvelle entrée
          console.log(`📝 Création nouvelle entrée DB pour film ${movieId}`);
          await movieCollection.create(record => {
            record.playlistId = playlistId;
            record.movieId = String(movieId);
            record.categoryId = String(enrichedData.category_id || '');
            record.name = enrichedData.name || '';
            record.streamUrl = enrichedData.stream_url || '';
            record.coverUrl = enrichedData.cover_url || '';
            record.rating = enrichedData.rating || '';
            record.duration = enrichedData.duration || '';
            record.genre = enrichedData.genre || '';
            record.releaseDate = enrichedData.release_date || '';
            record.plot = enrichedData.plot || '';
            record.director = enrichedData.director || '';
            record.cast = enrichedData.cast || '';
            record.added = enrichedData.added || '';
            record.containerExtension = enrichedData.container_extension || '';
          });
        } else {
          // Film existe → METTRE À JOUR
          const movie = movies[0];
          await movie.update(record => {
            if (enrichedData.genre) record.genre = enrichedData.genre;
            if (enrichedData.cast) record.cast = enrichedData.cast;
            if (enrichedData.director) record.director = enrichedData.director;
            if (enrichedData.duration) record.duration = enrichedData.duration;
            if (enrichedData.rating) record.rating = enrichedData.rating;
            if (enrichedData.release_date) record.releaseDate = enrichedData.release_date;
            if (enrichedData.plot) record.plot = enrichedData.plot;
            if (enrichedData.cover_url) record.coverUrl = enrichedData.cover_url;
          });
        }
      });

      console.log(`✅ Métadonnées sauvegardées pour ${movieId}`);
    } catch (error) {
      console.error(`❌ Erreur updateMovieMetadata pour ${movieId}:`, error);
    }
  }

  /**
   * 🚀 Sauvegarder les films avec SQL direct (ULTRA RAPIDE: ~10-20s pour 129K films)
   */
  private async saveMoviesDirectSQL(playlistId: string, movies: VodMovieType[]): Promise<void> {
    if (movies.length === 0) return;

    console.log(`🚀 SQL Direct: Sauvegarde de ${movies.length} films...`);
    const startTime = Date.now();

    try {
      // Supprimer les anciens films de cette playlist
      await database.write(async () => {
        const oldMovies = await database
          .get<VodMovieModel>('vod_movies')
          .query(Q.where('playlist_id', playlistId))
          .fetch();

        if (oldMovies.length > 0) {
          const deleteOps = oldMovies.map(m => m.prepareDestroyPermanently());
          await database.batch(...deleteOps);
          console.log(`🗑️ ${oldMovies.length} anciens films supprimés`);
        }
      });

      // Insérer par chunks de 2000 (4x plus rapide pour 129K+ films)
      const CHUNK_SIZE = 2000;
      const chunks = [];
      for (let i = 0; i < movies.length; i += CHUNK_SIZE) {
        chunks.push(movies.slice(i, i + CHUNK_SIZE));
      }

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        await database.write(async () => {
          const movieCollection = database.get<VodMovieModel>('vod_movies');

          const batchOperations = chunk.map(movie =>
            movieCollection.prepareCreate(record => {
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
            })
          );

          await database.batch(...batchOperations);
        });

        // Log progression tous les 10 chunks (moins fréquent avec chunks plus gros)
        if ((i + 1) % 10 === 0 || i === chunks.length - 1) {
          const progress = Math.round(((i + 1) / chunks.length) * 100);
          console.log(`📦 ${progress}% - ${(i + 1) * CHUNK_SIZE}/${movies.length} films`);
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✅ ${movies.length} films sauvegardés en ${duration}s (SQL Direct)`);

    } catch (error) {
      console.error('❌ Erreur saveMoviesDirectSQL:', error);
      throw error;
    }
  }

  /**
   * 🚀 Sauvegarder les séries avec SQL direct (ULTRA RAPIDE)
   */
  private async saveSeriesDirectSQL(playlistId: string, series: VodSeriesType[]): Promise<void> {
    if (series.length === 0) return;

    console.log(`🚀 SQL Direct: Sauvegarde de ${series.length} séries...`);
    const startTime = Date.now();

    try {
      // Supprimer les anciennes séries de cette playlist
      await database.write(async () => {
        const oldSeries = await database
          .get<VodSeriesModel>('vod_series')
          .query(Q.where('playlist_id', playlistId))
          .fetch();

        if (oldSeries.length > 0) {
          const deleteOps = oldSeries.map(s => s.prepareDestroyPermanently());
          await database.batch(...deleteOps);
          console.log(`🗑️ ${oldSeries.length} anciennes séries supprimées`);
        }
      });

      // Insérer par chunks de 2000 (4x plus rapide)
      const CHUNK_SIZE = 2000;
      const chunks = [];
      for (let i = 0; i < series.length; i += CHUNK_SIZE) {
        chunks.push(series.slice(i, i + CHUNK_SIZE));
      }

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        await database.write(async () => {
          const seriesCollection = database.get<VodSeriesModel>('vod_series');

          const batchOperations = chunk.map(seriesItem =>
            seriesCollection.prepareCreate(record => {
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
            })
          );

          await database.batch(...batchOperations);
        });

        // Log progression tous les 20 chunks
        if ((i + 1) % 20 === 0 || i === chunks.length - 1) {
          const progress = Math.round(((i + 1) / chunks.length) * 100);
          console.log(`📦 ${progress}% - ${(i + 1) * CHUNK_SIZE}/${series.length} séries`);
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✅ ${series.length} séries sauvegardées en ${duration}s (SQL Direct)`);

    } catch (error) {
      console.error('❌ Erreur saveSeriesDirectSQL:', error);
      throw error;
    }
  }

  /**
   * 💾 Sauvegarder les films dans WatermelonDB avec batch insert optimisé
   * @deprecated Utiliser saveMoviesDirectSQL à la place
   */
  private async saveMoviesToDB(playlistId: string, movies: VodMovieType[]): Promise<void> {
    if (movies.length === 0) return;

    const CHUNK_SIZE = 2000; // 2x plus rapide
    const chunks = [];
    for (let i = 0; i < movies.length; i += CHUNK_SIZE) {
      chunks.push(movies.slice(i, i + CHUNK_SIZE));
    }

    console.log(`💾 Sauvegarde de ${movies.length} films en ${chunks.length} chunks...`);
    const startTime = Date.now();

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      await database.write(async () => {
        const movieCollection = database.get<VodMovieModel>('vod_movies');

        // Créer tous les records du chunk en batch
        const batchOperations = chunk.map(movie =>
          movieCollection.prepareCreate(record => {
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
          })
        );

        await database.batch(...batchOperations);
      });

      if ((i + 1) % 10 === 0 || i === chunks.length - 1) {
        console.log(`📦 Chunk ${i + 1}/${chunks.length} sauvegardé (${(i + 1) * CHUNK_SIZE} films)`);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ ${movies.length} films sauvegardés en ${duration}s`);
  }

  /**
   * 💾 Sauvegarder les séries dans WatermelonDB avec batch insert optimisé
   */
  private async saveSeriesToDB(playlistId: string, series: VodSeriesType[]): Promise<void> {
    if (series.length === 0) return;

    const CHUNK_SIZE = 2000; // 2x plus rapide
    const chunks = [];
    for (let i = 0; i < series.length; i += CHUNK_SIZE) {
      chunks.push(series.slice(i, i + CHUNK_SIZE));
    }

    console.log(`💾 Sauvegarde de ${series.length} séries en ${chunks.length} chunks...`);
    const startTime = Date.now();

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      await database.write(async () => {
        const seriesCollection = database.get<VodSeriesModel>('vod_series');

        // Créer tous les records du chunk en batch
        const batchOperations = chunk.map(seriesItem =>
          seriesCollection.prepareCreate(record => {
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
          })
        );

        await database.batch(...batchOperations);
      });

      if ((i + 1) % 10 === 0 || i === chunks.length - 1) {
        console.log(`📦 Chunk ${i + 1}/${chunks.length} sauvegardé (${(i + 1) * CHUNK_SIZE} séries)`);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ ${series.length} séries sauvegardées en ${duration}s`);
  }

  /**
   * 🧹 Vider le cache des catégories téléchargées (pour debug)
   */
  clearDownloadedCache(): void {
    DOWNLOADED_CATEGORIES.clear();
    console.log('🧹 Cache des catégories téléchargées vidé');
  }

  /**
   * 📊 Obtenir des statistiques sur les catégories téléchargées
   */
  getDownloadedStats(): {count: number; categories: string[]} {
    return {
      count: DOWNLOADED_CATEGORIES.size,
      categories: Array.from(DOWNLOADED_CATEGORIES),
    };
  }
}

export default VODHybridService.getInstance();