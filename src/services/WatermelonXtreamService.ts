/**
 * 🍉 WatermelonDB Xtream Service - Gestion Xtream Codes avec WatermelonDB
 * Service optimisé pour 25K+ chaînes avec lazy loading
 */

import {Q} from '@nozbe/watermelondb';
import database from '../database';
import {Playlist, Channel, Category} from '../database/models';
import {networkService, NetworkError} from './NetworkService';
import type {VodMovie, VodSeries, VodSeason, VodEpisode, VodCategory} from '../types';

export interface XtreamCredentials {
  url: string;
  username: string;
  password: string;
}

export interface XtreamChannel {
  num: number;
  name: string;
  stream_type: string;
  stream_id: string;
  stream_icon: string;
  epg_channel_id: string;
  added: string;
  is_adult: string;
  category_name: string;
  category_id: string;
}

export interface XtreamCategory {
  category_id: string;
  category_name: string;
  parent_id: number;
}

// 🎬 Interfaces Xtream Codes pour VOD Films
export interface XtreamMovie {
  num: number;
  name: string;
  stream_type: 'movie';
  stream_id: string;
  stream_icon: string;
  added: string;
  category_id: string;
  container_extension: string;
  custom_sid: string;
  direct_source: string;
  rating: string;
  plot: string;
  duration: string;
  director: string;
  cast: string;
  release_date: string;
  last_modified: string;
  genre: string;
  backdrop: string;
  // Champs optionnels supplémentaires
  cover?: string;
  movie_image?: string;
  cover_big?: string;
  tmdb_cover?: string;
  backdrop_path?: string;
  tmdb_backdrop?: string;
}

// 📺 Interfaces Xtream Codes pour Séries
export interface XtreamSeries {
  num: number;
  name: string;
  stream_type: 'series';
  stream_id: string;
  stream_icon: string;
  added: string;
  category_id: string;
  cover: string;
  plot: string;
  cast: string;
  director: string;
  genre: string;
  release_date: string;
  last_modified: string;
  rating: string;
  backdrop: string;
  youtube_trailer: string;
  episode_run_time: string;
  episodes: number;
}

export interface XtreamSeriesInfo {
  series_id: string;
  name: string;
  plot: string;
  cast: string;
  director: string;
  genre: string;
  release_date: string;
  rating: string;
  backdrop: string;
  youtube_trailer: string;
  categories: {category_id: string; category_name: string}[];
  seasons: XtreamSeason[];
}

export interface XtreamSeason {
  season_id: string;
  season_number: number;
  name: string;
  overview: string;
  episodes_count: number;
  episodes: XtreamEpisode[];
}

export interface XtreamEpisode {
  episode_id: string;
  episode_num: number;
  title: string;
  container_extension: string;
  custom_sid: string;
  direct_source: string;
  info: {
    movie_image: string;
    plot: string;
    duration: string;
    rating: string;
    genre: string;
    cast: string;
    director: string;
    release_date: string;
    last_modified: string;
  };
  seasons: {season_id: string; season_number: number}[];
}

class WatermelonXtreamService {
  /**
   * 🚀 Import complet d'une playlist Xtream Codes dans WatermelonDB
   * Utilise batch operations pour optimiser les 25K+ chaînes
   */
  async importXtreamPlaylist(
    credentials: XtreamCredentials,
    playlistName: string,
    onProgress?: (progress: number, message: string) => void,
  ): Promise<string> {
    try {
      onProgress?.(10, '🔍 Récupération des données Xtream...');

      // 1. Récupérer les informations du compte
      const accountInfo = await this.getXtreamAccountInfo(credentials);
      onProgress?.(20, '📊 Récupération des catégories...');

      // 2. Récupérer les catégories
      const categories = await this.getXtreamCategories(credentials);
      onProgress?.(30, '📺 Récupération des chaînes live...');

      // 3. Récupérer toutes les chaînes live
      const channels = await this.getXtreamLiveChannels(credentials);
      onProgress?.(50, `📺 ${channels.length} chaînes récupérées...`);

      // 4. Import en base avec batch operations
      const playlistId = await this.batchImportToWatermelon({
        credentials,
        playlistName,
        accountInfo,
        categories,
        channels,
        onProgress,
      });

      // 5. 🚀 IMPORTER SEULEMENT LES CATÉGORIES VOD (SOLUTION HYBRIDE)
      onProgress?.(96, '📁 Import des catégories films et séries...');
      try {
        await this.importXtreamCategoriesOnly(playlistId, credentials);
        console.log(`📁 Catégories VOD importées avec succès`);
        onProgress?.(99, '✅ Catégories films et séries importées');
      } catch (vodError) {
        console.warn('⚠️ Erreur import catégories VOD (non bloquant):', vodError);
        // Ne pas bloquer l'import si les catégories échouent
      }

      onProgress?.(100, '✅ Import terminé avec succès !');
      return playlistId;
    } catch (error) {
      console.error('❌ Erreur import Xtream WatermelonDB:', error);
      throw error;
    }
  }

  /**
   * 📦 Import par batch dans WatermelonDB - Optimisé pour 25K+ records
   */
  private async batchImportToWatermelon({
    credentials,
    playlistName,
    accountInfo,
    categories,
    channels,
    onProgress,
  }: {
    credentials: XtreamCredentials;
    playlistName: string;
    accountInfo: any;
    categories: XtreamCategory[];
    channels: XtreamChannel[];
    onProgress?: (progress: number, message: string) => void;
  }): Promise<string> {
    const BATCH_SIZE = 1000; // Traitement par batch de 1000 records

    return await database.write(async () => {
      onProgress?.(60, '💾 Création de la playlist...');

      // 1. Créer la playlist
      const playlist = await database
        .get<Playlist>('playlists')
        .create(playlist => {
          playlist.name = playlistName;
          playlist.type = 'XTREAM';
          playlist.server = credentials.url;
          playlist.username = credentials.username;
          playlist.password = credentials.password;
          playlist.dateAdded = new Date();
          playlist.channelsCount = channels.length;
          playlist.status = 'active';
          playlist.isActive = false; // Sera activé après import complet

          // Date d'expiration Xtream Codes
          if (accountInfo?.user_info?.exp_date) {
            const expTimestamp = parseInt(accountInfo.user_info.exp_date);
            if (!isNaN(expTimestamp)) {
              playlist.expirationDate = new Date(
                expTimestamp * 1000,
              ).toISOString();
            }
          }

          // Date de création du compte Xtream Codes depuis l'API
          if (accountInfo?.user_info?.created_at) {
            const createdTimestamp = parseInt(accountInfo.user_info.created_at);
            if (!isNaN(createdTimestamp)) {
              const realCreatedDate = new Date(createdTimestamp * 1000);
              playlist.accountCreatedDate = realCreatedDate.toISOString();
              console.log('📅 [Xtream] Date de création réelle sauvegardée:', realCreatedDate.toISOString());
            }
          } else if (accountInfo?.user_info?.reg_date) {
            // Alternative: certains serveurs utilisent reg_date
            const regTimestamp = parseInt(accountInfo.user_info.reg_date);
            if (!isNaN(regTimestamp)) {
              const realCreatedDate = new Date(regTimestamp * 1000);
              playlist.accountCreatedDate = realCreatedDate.toISOString();
              console.log('📅 [Xtream] Date de création (reg_date) sauvegardée:', realCreatedDate.toISOString());
            }
          } else {
            console.log('⚠️ [Xtream] Aucune date de création trouvée dans l\'API');
          }

          // Connexions actives Xtream (0 ou 1)
          if (accountInfo?.user_info?.active_cons !== undefined) {
            const activeConnections = parseInt(accountInfo.user_info.active_cons);
            const maxConnections = parseInt(accountInfo.user_info.max_connections || '1');

            const connectionData = {
              activeConnections: activeConnections, // 0 ou 1
              maxConnections: maxConnections
            };
            playlist.connectionInfo = JSON.stringify(connectionData);
            console.log('🔗 [Xtream] Connexion active:', activeConnections, '/', maxConnections);
          }
        });

      onProgress?.(65, '📂 Import des catégories...');

      // 2. Créer les catégories par batch
      const categoryBatches = this.chunkArray(categories, BATCH_SIZE);
      const createdCategories: Category[] = [];

      for (let i = 0; i < categoryBatches.length; i++) {
        const batch = categoryBatches[i];

        const categoryRecords = batch.map(cat =>
          database.get<Category>('categories').prepareCreate(category => {
            category.playlistId = playlist.id;
            category.name = cat.category_name;
            category.categoryId = cat.category_id;
            category.channelsCount = channels.filter(
              ch => ch.category_id === cat.category_id,
            ).length;
          }),
        );

        await database.batch(categoryRecords);
        createdCategories.push(...categoryRecords);
      }

      console.log(`✅ ${createdCategories.length} catégories créées`);

      // 🗺️ Créer un Map: categoryId → categoryName pour le filtrage mode enfant
      const categoryIdToNameMap = new Map<string, string>();
      categories.forEach(cat => {
        categoryIdToNameMap.set(cat.category_id, cat.category_name);
      });
      console.log(
        `🗺️ Map categoryId → categoryName créée: ${categoryIdToNameMap.size} entrées`,
      );

      onProgress?.(
        70,
        `📺 Import de ${channels.length} chaînes (par batch)...`,
      );

      // 3. Créer les chaînes par batch (CRITIQUE pour 25K+ records)
      const channelBatches = this.chunkArray(channels, BATCH_SIZE);
      for (let i = 0; i < channelBatches.length; i++) {
        const batch = channelBatches[i];
        const progress = 70 + Math.round((i / channelBatches.length) * 25);

        onProgress?.(
          progress,
          `📺 Batch ${i + 1}/${channelBatches.length} - ${
            batch.length
          } chaînes...`,
        );

        const channelRecords = batch.map(channel =>
          database.get<Channel>('channels').prepareCreate(ch => {
            ch.playlistId = playlist.id;

            // 🔧 CORRECTION: Utiliser directement l'Xtream category_id (pas le mapping WatermelonDB)
            ch.categoryId = channel.category_id || null;

            ch.name = channel.name || 'Sans nom';
            ch.streamUrl = this.buildXtreamStreamUrl(
              credentials,
              channel.stream_id,
            );

            // NORMALISATION LOGOS lors de l'import
            ch.logoUrl = this.normalizeLogoUrl(
              channel.stream_icon,
              credentials.url,
            );
            ch.streamIcon = this.normalizeLogoUrl(
              channel.stream_icon,
              credentials.url,
            );

            // 🗺️ NORMALISATION CATÉGORIES: Utiliser le Map pour récupérer le vrai nom
            const categoryName =
              categoryIdToNameMap.get(channel.category_id) || '';
            ch.groupTitle = this.normalizeCategoryName(categoryName);

            // Champs Xtream spécifiques
            ch.num = channel.num;
            ch.streamId = channel.stream_id;
            ch.epgChannelId = channel.epg_channel_id;
            ch.added = channel.added;
            ch.isAdult = channel.is_adult === '1';
            ch.streamType = 'live';

            // Initialiser les stats
            ch.isFavorite = false;
            ch.watchCount = 0;
          }),
        );

        // Batch insert optimisé - Fixed: pass array instead of spread
        await database.batch(channelRecords);

        // Petite pause pour éviter de bloquer le thread UI
        if (i < channelBatches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      onProgress?.(95, '✅ Finalisation...');

      // 4. Activer la playlist après import complet
      await playlist.update(p => {
        p.isActive = true;
      });

      console.log(
        `✅ Import WatermelonDB terminé: ${channels.length} chaînes, ${categories.length} catégories`,
      );
      return playlist.id;
    });
  }

  /**
   * 🔍 Récupérer une playlist avec lazy loading des chaînes
   * @param blockedCategories - Catégories à exclure (mode enfant)
   */
  async getPlaylistWithChannels(
    playlistId: string,
    limit: number = 25000,
    offset: number = 0,
    blockedCategories?: string[],
  ) {
    try {
      const playlist = await database
        .get<Playlist>('playlists')
        .find(playlistId);

      // 🔒 FILTRAGE MODE ENFANT: Si mode enfant, charger plus de chaînes pour compenser le filtrage
      const fetchLimit =
        blockedCategories && blockedCategories.length > 0
          ? limit * 3 // Charger 3x plus pour compenser les chaînes filtrées
          : limit;

      if (blockedCategories && blockedCategories.length > 0) {
        console.log(
          `🔒 [WatermelonXtream] Mode enfant actif - Filtrage JavaScript: ${blockedCategories.join(
            ', ',
          )}`,
        );
      }

      // Lazy loading: récupérer les chaînes (avant filtrage)
      let channels = await database
        .get<Channel>('channels')
        .query(
          Q.where('playlist_id', playlistId),
          Q.skip(offset),
          Q.take(fetchLimit),
        )
        .fetch();

      // 🔒 FILTRAGE MODE ENFANT: Filtrer en JavaScript après la requête
      if (blockedCategories && blockedCategories.length > 0) {
        const beforeCount = channels.length;

        // 🔍 DEBUG: Afficher les 5 premiers groupTitle pour vérifier
        console.log('🔍 DEBUG groupTitle des 5 premières chaînes:');
        channels.slice(0, 5).forEach((ch, idx) => {
          console.log(
            `   [${idx}] "${ch.name}" → groupTitle: "${ch.groupTitle}"`,
          );
        });

        channels = channels.filter(ch => {
          const groupTitle = (ch.groupTitle || '').toLowerCase();
          const channelName = (ch.name || '').toLowerCase();

          // 🔍 Améliorer le filtrage pour détecter toutes les variations adultes
          const hasBlockedKeyword = blockedCategories.some(blocked => {
            const blockedLower = blocked.toLowerCase();

            // Vérification exacte et partielle
            return groupTitle.includes(blockedLower) ||
                   groupTitle.includes(blockedLower.replace(/\s+/g, ' ')) ||
                   channelName.includes(blockedLower) ||
                   channelName.includes(blockedLower.replace(/\s+/g, ' ')) ||
                   // Cas spécial: "XX | FOR ADULT" → détecter "ADULT" même si séparé
                   (blockedLower.includes('adult') && groupTitle.includes('adult')) ||
                   (blockedLower.includes('xxx') && groupTitle.includes('xxx')) ||
                   (blockedLower.includes('porn') && groupTitle.includes('porn'));
          });

          // Exclure si un mot-clé bloqué est détecté
          return !hasBlockedKeyword;
        });
        console.log(
          `🔒 [WatermelonXtream] Filtrage: ${beforeCount} → ${channels.length} chaînes`,
        );

        // Limiter au nombre demandé après filtrage
        channels = channels.slice(0, limit);
      }

      // Récupérer TOUTES les catégories (même les bloquées)
      // 🔒 Les catégories bloquées seront affichées avec un cadenas dans l'interface
      const categories = await database
        .get<Category>('categories')
        .query(Q.where('playlist_id', playlistId))
        .fetch();

      // 🔍 CRITICAL: Mapper les objets WatermelonDB vers le type Channel attendu
      const mappedChannels = channels.map(ch => ({
        id: ch.id,
        name: ch.name,
        url: ch.streamUrl,
        logo: ch.logoUrl,
        group: ch.groupTitle,
        category: ch.categoryId,
        tvgId: ch.tvgId,
        quality: ch.isHD ? 'HD' : undefined,
        isAdult: ch.isAdult,
        epgId: ch.tvgId,
      }));

      return {
        playlist,
        channels: mappedChannels,
        categories: categories, // ✅ Retourner TOUTES les catégories (interface affichera cadenas)
        totalChannels: playlist.channelsCount,
      };
    } catch (error) {
      console.error('❌ Erreur récupération playlist WatermelonDB:', error);
      throw error;
    }
  }

  /**
   * 🔍 Recherche de chaînes avec lazy loading et tri optimisé
   * @param blockedCategories - Catégories à exclure (mode enfant)
   */
  async searchChannels(
    playlistId: string,
    query: string,
    limit: number = 500, // Réduit de 25000 à 500 pour cohérence pagination
    blockedCategories?: string[],
  ) {
    try {
      const sanitized = Q.sanitizeLikeString(query);

      // Charger plus si mode enfant
      const fetchLimit =
        blockedCategories && blockedCategories.length > 0 ? limit * 3 : limit;

      let channels = await database
        .get<Channel>('channels')
        .query(
          Q.where('playlist_id', playlistId),
          Q.where('name', Q.like(`%${sanitized}%`)),
          Q.sortBy('name', Q.asc), // Tri alphabétique pour UX
          Q.take(fetchLimit),
        )
        .fetch();

      // 🔒 FILTRAGE MODE ENFANT: Filtrer en JavaScript
      if (blockedCategories && blockedCategories.length > 0) {
        channels = channels.filter(ch => {
          const groupTitle = (ch.groupTitle || '').toLowerCase();
          return !blockedCategories.some(blocked =>
            groupTitle.includes(blocked.toLowerCase()),
          );
        });
        channels = channels.slice(0, limit);
      }

      return channels;
    } catch (error) {
      console.error('❌ Erreur recherche chaînes WatermelonDB:', error);
      throw error;
    }
  }

  /**
   * 📺 Récupérer les chaînes par catégorie avec lazy loading
   * @param blockedCategories - Catégories à exclure (mode enfant)
   */
  async getChannelsByCategory(
    playlistId: string,
    categoryId: string,
    limit: number = 500,
    offset: number = 0,
    blockedCategories?: string[],
  ) {
    try {
      // Charger plus si mode enfant
      const fetchLimit =
        blockedCategories && blockedCategories.length > 0 ? limit * 3 : limit;

      let channels = await database
        .get<Channel>('channels')
        .query(
          Q.where('playlist_id', playlistId),
          Q.where('category_id', categoryId),
          Q.skip(offset),
          Q.take(fetchLimit),
        )
        .fetch();

      // 🔒 FILTRAGE MODE ENFANT: Filtrer en JavaScript
      if (blockedCategories && blockedCategories.length > 0) {
        channels = channels.filter(ch => {
          const groupTitle = (ch.groupTitle || '').toLowerCase();
          return !blockedCategories.some(blocked =>
            groupTitle.includes(blocked.toLowerCase()),
          );
        });
        channels = channels.slice(0, limit);
      }

      return channels;
    } catch (error) {
      console.error('❌ Erreur récupération chaînes par catégorie:', error);
      throw error;
    }
  }

  /**
   * ⭐ Récupérer les chaînes favorites avec SQL rapide
   * @param blockedCategories - Catégories à exclure (mode enfant)
   */
  async getFavoriteChannels(
    playlistId: string,
    limit: number = 500,
    offset: number = 0,
    blockedCategories?: string[],
  ) {
    try {
      // Charger plus si mode enfant
      const fetchLimit =
        blockedCategories && blockedCategories.length > 0 ? limit * 3 : limit;

      let channels = await database
        .get<Channel>('channels')
        .query(
          Q.where('playlist_id', playlistId),
          Q.where('is_favorite', true),
          Q.sortBy('last_watched', Q.desc), // Favoris récents en premier
          Q.skip(offset),
          Q.take(fetchLimit),
        )
        .fetch();

      // 🔒 FILTRAGE MODE ENFANT: Filtrer en JavaScript
      if (blockedCategories && blockedCategories.length > 0) {
        channels = channels.filter(ch => {
          const groupTitle = (ch.groupTitle || '').toLowerCase();
          return !blockedCategories.some(blocked =>
            groupTitle.includes(blocked.toLowerCase()),
          );
        });
        channels = channels.slice(0, limit);
      }

      return channels;
    } catch (error) {
      console.error('❌ Erreur récupération favoris WatermelonDB:', error);
      throw error;
    }
  }

  /**
   * 📺 Récupérer l'historique de visionnage avec SQL rapide
   */
  async getRecentChannels(playlistId: string, limit: number = 20) {
    try {
      return await database
        .get<Channel>('channels')
        .query(
          Q.where('playlist_id', playlistId),
          Q.where('last_watched', Q.notEq(null)),
          Q.sortBy('last_watched', Q.desc), // Plus récents en premier
          Q.take(limit),
        )
        .fetch();
    } catch (error) {
      console.error('❌ Erreur récupération historique WatermelonDB:', error);
      throw error;
    }
  }

  // ================================
  // MÉTHODES UTILITAIRES PRIVÉES
  // ================================

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private buildXtreamStreamUrl(
    credentials: XtreamCredentials,
    streamId: string,
  ): string {
    return `${credentials.url}/${credentials.username}/${credentials.password}/${streamId}`;
  }

  private normalizeLogoUrl(logoUrl: string, serverUrl: string): string {
    if (!logoUrl || logoUrl.trim() === '' || logoUrl.toLowerCase() === 'null') {
      return '';
    }

    const trimmedLogoUrl = logoUrl.trim();

    // Si l'URL est déjà complète, on la retourne directement
    if (
      trimmedLogoUrl.startsWith('http://') ||
      trimmedLogoUrl.startsWith('https://')
    ) {
      return trimmedLogoUrl;
    }

    // Construire l'URL de base du serveur - méthode robuste
    let baseUrl = '';

    try {
      // Essayer avec new URL() d'abord
      const serverUri = new URL(serverUrl);
      baseUrl = `${serverUri.protocol}//${serverUri.host}`;
    } catch (e) {
      // Si URL invalide, parser manuellement
      console.log('🔧 Parsing manuel serverUrl:', serverUrl);

      // Nettoyer l'URL et extraire les composants
      let cleanUrl = serverUrl.trim();

      // Ajouter http:// si manquant
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'http://' + cleanUrl;
      }

      // Extraire protocol://host:port
      const urlMatch = cleanUrl.match(/^(https?:\/\/[^\/]+)/);
      if (urlMatch) {
        baseUrl = urlMatch[1];
      } else {
        console.error('❌ Impossible de parser serverUrl:', serverUrl);
        return '';
      }
    }

    if (!baseUrl) {
      console.error('❌ BaseUrl vide pour serverUrl:', serverUrl);
      return '';
    }

    // Construire l'URL finale du logo
    if (trimmedLogoUrl.startsWith('/')) {
      return `${baseUrl}${trimmedLogoUrl}`;
    } else {
      return `${baseUrl}/${trimmedLogoUrl}`;
    }
  }

  private normalizeCategoryName(categoryName: string): string {
    if (!categoryName || categoryName.trim() === '') {
      return 'Non classé';
    }

    return categoryName
      .trim()
      .replace(/[<>]/g, '') // Supprimer caractères dangereux
      .replace(/[|]/g, ' - ') // Remplacer pipes par tirets
      .replace(/\s+/g, ' ') // Normaliser espaces multiples
      .substring(0, 50); // Limiter longueur
  }

  // ================================
  // APIs XTREAM CODES
  // ================================

  private async getXtreamAccountInfo(credentials: XtreamCredentials) {
    const url = `${credentials.url}/player_api.php?username=${credentials.username}&password=${credentials.password}`;
    try {
      return await networkService.fetchJSON(url, {timeout: 15000});
    } catch (error) {
      if (error instanceof NetworkError) {
        throw new Error(`Erreur connexion Xtream: ${error.getUserMessage()}`);
      }
      throw error;
    }
  }

  private async getXtreamCategories(
    credentials: XtreamCredentials,
  ): Promise<XtreamCategory[]> {
    const url = `${credentials.url}/player_api.php?username=${credentials.username}&password=${credentials.password}&action=get_live_categories`;
    try {
      return await networkService.fetchJSON<XtreamCategory[]>(url, {
        timeout: 15000,
      });
    } catch (error) {
      if (error instanceof NetworkError) {
        throw new Error(
          `Erreur chargement catégories Xtream: ${error.getUserMessage()}`,
        );
      }
      throw error;
    }
  }

  private async getXtreamLiveChannels(
    credentials: XtreamCredentials,
  ): Promise<XtreamChannel[]> {
    const url = `${credentials.url}/player_api.php?username=${credentials.username}&password=${credentials.password}&action=get_live_streams`;
    try {
      return await networkService.fetchJSON<XtreamChannel[]>(url, {
        timeout: 30000,
      }); // Plus long pour les chaînes
    } catch (error) {
      if (error instanceof NetworkError) {
        throw new Error(
          `Erreur chargement chaînes Xtream: ${error.getUserMessage()}`,
        );
      }
      throw error;
    }
  }

  // ================================
  // 🎬 API VOD - FILMS ET SÉRIES
  // ================================

  /**
   * 🎬 Récupérer les catégories de films VOD
   */
  async getVodCategories(
    credentials: XtreamCredentials,
  ): Promise<VodCategory[]> {
    const url = `${credentials.url}/player_api.php?username=${credentials.username}&password=${credentials.password}&action=get_vod_categories`;
    try {
      const categories = await networkService.fetchJSON<XtreamCategory[]>(url, {
        timeout: 15000,
      });

      return categories.map(cat => ({
        id: `vod_cat_${cat.category_id}`,
        category_id: cat.category_id,
        category_name: cat.category_name,
        parent_id: cat.parent_id,
        type: 'movie' as const,
        count: 0, // À récupérer avec getVodStreams
      }));
    } catch (error) {
      if (error instanceof NetworkError) {
        throw new Error(
          `Erreur chargement catégories VOD: ${error.getUserMessage()}`,
        );
      }
      throw error;
    }
  }

  /**
   * 🎬 Récupérer les films VOD par catégorie
   * Optimisé pour 129K+ films - évite appels de fonctions répétitifs
   */
  async getVodStreams(
    credentials: XtreamCredentials,
    categoryId?: string,
  ): Promise<VodMovie[]> {
    const baseUrl = `${credentials.url}/player_api.php?username=${credentials.username}&password=${credentials.password}&action=get_vod_streams`;
    const url = categoryId ? `${baseUrl}&category_id=${categoryId}` : baseUrl;

    try {
      const movies = await networkService.fetchJSON<XtreamMovie[]>(url, {
        timeout: 30000,
      });

      // 🚀 Précalculer les bases URL une seule fois (évite 387K appels de fonction)
      const serverUrl = credentials.url;
      const streamUrlBase = `${serverUrl}/movie/${credentials.username}/${credentials.password}/`;

      // Extraire le hostname pour normalizeLogoUrl inline
      let serverHost = '';
      try {
        const urlObj = new URL(serverUrl);
        serverHost = `${urlObj.protocol}//${urlObj.host}`;
      } catch {
        serverHost = serverUrl;
      }

      return movies.map(movie => {
        // Inline normalizeLogoUrl pour cover_url - essayer plusieurs sources
        let cover_url = '';
        const coverSource = movie.stream_icon || movie.cover || movie.movie_image || movie.cover_big || movie.tmdb_cover || '';
        if (coverSource) {
          if (coverSource.startsWith('http')) {
            cover_url = coverSource;
          } else if (coverSource.startsWith('/')) {
            cover_url = serverHost + coverSource;
          } else {
            cover_url = serverHost + '/' + coverSource;
          }
        }

        // Inline normalizeLogoUrl pour backdrop_url - essayer plusieurs sources
        let backdrop_url = '';
        const backdropSource = movie.backdrop || movie.backdrop_path || movie.tmdb_backdrop || '';
        if (backdropSource) {
          if (backdropSource.startsWith('http')) {
            backdrop_url = backdropSource;
          } else if (backdropSource.startsWith('/')) {
            backdrop_url = serverHost + backdropSource;
          } else {
            backdrop_url = serverHost + '/' + backdropSource;
          }
        }

        return {
          id: `vod_movie_${movie.stream_id}`,
          movie_id: movie.stream_id,
          name: movie.name,
          plot: movie.plot || '',
          genre: movie.genre || '',
          director: movie.director || '',
          cast: movie.cast || '',
          release_date: movie.release_date || '',
          rating: movie.rating || '',
          duration: movie.duration || '',
          imdb_id: '',
          cover_url,
          backdrop_url,
          stream_url: streamUrlBase + movie.stream_id + '.' + (movie.container_extension || 'mp4'),
          container_extension: movie.container_extension || '',
          added: movie.added || '',
          category_id: movie.category_id,
          category_name: '',
        };
      });
    } catch (error) {
      if (error instanceof NetworkError) {
        throw new Error(
          `Erreur chargement films VOD: ${error.getUserMessage()}`,
        );
      }
      throw error;
    }
  }

  /**
   * 🎬 Récupérer les informations détaillées d'un film (métadonnées complètes)
   * Endpoint: get_vod_info - Retourne genre, casting, durée, note, etc.
   */
  async getVodInfo(
    credentials: XtreamCredentials,
    vodId: string,
  ): Promise<VodMovie | null> {
    const url = `${credentials.url}/player_api.php?username=${credentials.username}&password=${credentials.password}&action=get_vod_info&vod_id=${vodId}`;

    try {
      const response = await networkService.fetchJSON<{
        info: {
          tmdb_id?: string;
          name: string;
          cover?: string;
          cover_big?: string;
          movie_image?: string;
          tmdb_cover?: string;        // 🎨 TMDB cover (haute qualité)
          backdrop_path?: string;
          tmdb_backdrop?: string;     // 🎨 TMDB backdrop (haute qualité)
          youtube_trailer?: string;
          director?: string;
          actors?: string;
          cast?: string;
          description?: string;
          plot?: string;
          age?: string;
          rating?: string;
          rating_5based?: string;
          duration_secs?: string;
          duration?: string;
          video?: {
            duration_secs?: number;
            duration?: string;
          };
          releasedate?: string;
          release_date?: string;
          genre?: string;
          category_id?: string;
          container_extension?: string;
        };
        movie_data: {
          stream_id: string;
          name: string;
          added: string;
          category_id: string;
          container_extension: string;
          custom_sid: string;
          direct_source: string;
        };
      }>(url, {
        timeout: 15000,
      });

      if (!response || !response.info || !response.movie_data) {
        console.warn(`⚠️ Données VOD incomplètes pour ${vodId}`);
        return null;
      }

      const info = response.info;
      const movieData = response.movie_data;

      // 🔍 Debug: Afficher la structure de la réponse
      console.log('🔍 Structure API response.info:', {
        has_name: !!info.name,
        has_plot: !!info.plot,
        has_genre: !!info.genre,
        has_cast: !!info.cast,
        has_director: !!info.director,
        has_rating: !!info.rating,
        has_backdrop_path: !!info.backdrop_path,
        has_cover: !!info.cover,
        has_movie_image: !!info.movie_image,
      });

      // 🚀 Précalculer les bases URL
      const serverUrl = credentials.url;
      let serverHost = '';
      try {
        const urlObj = new URL(serverUrl);
        serverHost = `${urlObj.protocol}//${urlObj.host}`;
      } catch {
        serverHost = serverUrl;
      }

      // 🎨 Normaliser cover_url avec priorisation TMDB (meilleure qualité)
      let cover_url = '';
      // Ordre de priorité : TMDB → movie_image → cover_big → cover
      const coverSources = [
        info.tmdb_cover,        // 1️⃣ TMDB (haute qualité)
        info.movie_image,       // 2️⃣ Image du serveur
        info.cover_big,         // 3️⃣ Grande couverture
        info.cover              // 4️⃣ Couverture standard
      ];

      for (const source of coverSources) {
        if (source && typeof source === 'string') {
          if (source.startsWith('http')) {
            cover_url = source;
            break;
          } else if (source.startsWith('/')) {
            cover_url = serverHost + source;
            break;
          } else if (source) {
            cover_url = serverHost + '/' + source;
            break;
          }
        }
      }

      // 🎨 Normaliser backdrop_url avec priorisation TMDB
      let backdrop_url = '';
      // Ordre de priorité : TMDB → backdrop_path standard
      const backdropSources = [
        info.tmdb_backdrop,     // 1️⃣ TMDB backdrop (haute qualité)
        info.backdrop_path      // 2️⃣ Backdrop standard
      ];

      for (const source of backdropSources) {
        if (source && typeof source === 'string') {
          if (source.startsWith('http')) {
            backdrop_url = source;
            break;
          } else if (source.startsWith('/')) {
            backdrop_url = serverHost + source;
            break;
          } else if (source) {
            backdrop_url = serverHost + '/' + source;
            break;
          }
        }
      }

      // Calculer la durée (peut être dans info.duration, info.duration_secs ou info.video.duration_secs)
      let duration = '';
      if (info.duration && typeof info.duration === 'string') {
        duration = info.duration;
      } else if (info.duration_secs) {
        const secs = typeof info.duration_secs === 'string'
          ? parseInt(info.duration_secs, 10)
          : info.duration_secs;
        if (!isNaN(secs)) {
          const hours = Math.floor(secs / 3600);
          const minutes = Math.floor((secs % 3600) / 60);
          duration = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
        }
      } else if (info.video?.duration_secs) {
        const secs = info.video.duration_secs;
        const hours = Math.floor(secs / 3600);
        const minutes = Math.floor((secs % 3600) / 60);
        duration = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
      }

      // Construire l'objet VodMovie avec toutes les métadonnées
      const vodMovie = {
        id: `vod_movie_${vodId}`,
        movie_id: vodId,
        name: info.name || movieData.name,
        plot: info.plot || info.description || '',
        genre: info.genre || '',
        director: info.director || '',
        cast: info.cast || info.actors || '',
        release_date: info.release_date || info.releasedate || '',
        rating: info.rating || info.rating_5based || '',
        duration,
        imdb_id: info.tmdb_id || '',
        cover_url,
        backdrop_url,
        stream_url: `${serverUrl}/movie/${credentials.username}/${credentials.password}/${vodId}.${movieData.container_extension || 'mp4'}`,
        container_extension: movieData.container_extension || '',
        added: movieData.added || '',
        category_id: movieData.category_id || info.category_id || '',
        category_name: '',
      };

      console.log('✅ VodMovie construit:', {
        name: vodMovie.name,
        genre: vodMovie.genre,
        cast: vodMovie.cast?.substring(0, 50),
        director: vodMovie.director,
        rating: vodMovie.rating,
        duration: vodMovie.duration,
        release_date: vodMovie.release_date,
      });

      return vodMovie;
    } catch (error) {
      console.error(`❌ Erreur récupération info VOD ${vodId}:`, error);
      if (error instanceof NetworkError) {
        throw new Error(
          `Erreur chargement info film: ${error.getUserMessage()}`,
        );
      }
      return null;
    }
  }

  /**
   * 📺 Récupérer les catégories de séries VOD
   */
  async getSeriesCategories(
    credentials: XtreamCredentials,
  ): Promise<VodCategory[]> {
    const url = `${credentials.url}/player_api.php?username=${credentials.username}&password=${credentials.password}&action=get_series_categories`;
    try {
      const categories = await networkService.fetchJSON<XtreamCategory[]>(url, {
        timeout: 15000,
      });

      return categories.map(cat => ({
        id: `series_cat_${cat.category_id}`,
        category_id: cat.category_id,
        category_name: cat.category_name,
        parent_id: cat.parent_id,
        type: 'series' as const,
        count: 0, // À récupérer avec getSeriesStreams
      }));
    } catch (error) {
      if (error instanceof NetworkError) {
        throw new Error(
          `Erreur chargement catégories séries: ${error.getUserMessage()}`,
        );
      }
      throw error;
    }
  }

  /**
   * 📺 Récupérer les séries VOD par catégorie
   */
  async getSeriesStreams(
    credentials: XtreamCredentials,
    categoryId?: string,
  ): Promise<VodSeries[]> {
    const baseUrl = `${credentials.url}/player_api.php?username=${credentials.username}&password=${credentials.password}&action=get_series`;
    const url = categoryId ? `${baseUrl}&category_id=${categoryId}` : baseUrl;

    try {
      const series = await networkService.fetchJSON<XtreamSeries[]>(url, {
        timeout: 30000,
      });

      return series.map((s, index) => {
        // Protection contre les IDs undefined - utiliser plusieurs fallbacks
        const seriesId = s.stream_id || s.num?.toString() || `idx_${index}`;
        return {
          id: `vod_series_${seriesId}`,
          series_id: seriesId,
          stream_id: s.stream_id, // Garder l'original pour référence
          name: s.name || `Series ${index + 1}`,
          plot: s.plot || '',
          genre: s.genre || '',
          director: s.director || '',
          cast: s.cast || '',
          release_date: s.release_date || '',
          rating: s.rating || '',
          imdb_id: '', // Pas disponible dans l'API Xtream
          cover_url: this.normalizeLogoUrl(s.cover || s.stream_icon, credentials.url),
          backdrop_url: this.normalizeLogoUrl(s.backdrop, credentials.url),
          youtube_trailer: s.youtube_trailer || '',
          episodes_count: s.episodes || 0,
          seasons_count: 0, // À récupérer avec getSeriesInfo
          last_updated: s.last_modified || '',
          category_id: s.category_id || '',
          category_name: '', // À remplir avec le mapping
          added: s.added || '', // Pour le tri par date d'ajout
        };
      });
    } catch (error) {
      if (error instanceof NetworkError) {
        throw new Error(
          `Erreur chargement séries VOD: ${error.getUserMessage()}`,
        );
      }
      throw error;
    }
  }

  /**
   * 📺 Récupérer les détails complets d'une série (saisons et épisodes)
   */
  async getSeriesInfo(
    credentials: XtreamCredentials,
    seriesId: string,
  ): Promise<{
    series: VodSeries;
    seasons: VodSeason[];
  }> {
    const url = `${credentials.url}/player_api.php?username=${credentials.username}&password=${credentials.password}&action=get_series_info&series_id=${seriesId}`;

    try {
      const seriesInfo = await networkService.fetchJSON<XtreamSeriesInfo>(url, {
        timeout: 30000,
      });

      // Vérifier que la réponse est valide
      if (!seriesInfo || !seriesInfo.info) {
        throw new Error('Réponse API invalide pour les détails de la série');
      }

      // Extraire les données de info (structure API Xtream)
      const info = seriesInfo.info;
      const seasonsData = seriesInfo.seasons || [];
      const episodesData = seriesInfo.episodes || {};
      const categoriesData = Array.isArray(seriesInfo.categories) ? seriesInfo.categories : [];

      // Mapper la série principale
      const series: VodSeries = {
        id: `vod_series_${info.series_id || seriesId}`,
        series_id: info.series_id || seriesId,
        name: info.name || 'Sans nom',
        plot: info.plot || '',
        genre: info.genre || '',
        director: info.director || '',
        cast: info.cast || '',
        release_date: info.releaseDate || info.release_date || '',
        rating: info.rating || '',
        imdb_id: '',
        cover_url: this.normalizeLogoUrl(info.cover || info.backdrop_path?.[0], credentials.url),
        backdrop_url: this.normalizeLogoUrl(info.backdrop_path?.[0] || info.cover, credentials.url),
        youtube_trailer: info.youtube_trailer || '',
        episodes_count: 0, // Calculé après
        seasons_count: seasonsData.length,
        last_updated: info.last_modified || '',
        category_id: categoriesData[0]?.category_id || '',
        category_name: categoriesData[0]?.category_name || '',
      };

      // Mapper les saisons et épisodes (structure API Xtream: episodes est un objet {1: [...], 2: [...], ...})
      const seasons: VodSeason[] = (seasonsData || []).map(season => {
        const seasonNumber = String(season.season_number);
        const seasonEpisodes = episodesData[seasonNumber] || [];

        return {
          id: `vod_season_${season.id || seasonNumber}`,
          season_id: String(season.id || seasonNumber),
          series_id: info.series_id || seriesId,
          season_number: season.season_number,
          name: season.name || `Saison ${season.season_number}`,
          overview: season.overview || '',
          cover_url: season.cover || season.cover_big || '',
          episodes_count: seasonEpisodes.length,
          episodes: seasonEpisodes.map((episode: any) => ({
            id: `vod_episode_${episode.id}`,
            episode_id: String(episode.id),
            season_id: String(season.id || seasonNumber),
            series_id: info.series_id || seriesId,
            episode_number: episode.episode_num,
            name: episode.title || `Épisode ${episode.episode_num}`,
            plot: episode.info?.plot || '',
            duration: episode.info?.duration || '',
            stream_url: this.buildXtreamStreamUrl(credentials, String(episode.id)),
            container_extension: episode.container_extension || 'mkv',
            added: episode.added || '',
            air_date: episode.info?.release_date || '',
          })),
        };
      });

      // Calculer le total d'épisodes
      series.episodes_count = seasons.reduce((total, season) => total + season.episodes_count, 0);

      return { series, seasons };
    } catch (error) {
      if (error instanceof NetworkError) {
        throw new Error(
          `Erreur chargement détails série: ${error.getUserMessage()}`,
        );
      }
      throw error;
    }
  }

  /**
   * 🔍 Trouver l'index d'une chaîne dans la playlist (pour window loading)
   * Version OPTIMISÉE : Utilise uniquement la récupération de l'ID pour trouver la position
   * Sans charger toutes les chaînes en mémoire
   */
  async findChannelIndex(
    playlistId: string,
    channelId: string,
    categoryId?: string,
    blockedCategories?: string[],
  ): Promise<number> {
    try {
      const startTime = Date.now();
      console.log(`🔍 [findChannelIndex] Recherche index pour chaîne: ${channelId}`);

      // 🚀 OPTIMISATION: Récupérer uniquement les IDs (pas les données complètes)
      // Cela réduit drastiquement la mémoire utilisée
      let queryConditions = [Q.where('playlist_id', playlistId)];

      // Si catégorie spécifique (pas "all"), filtrer par catégorie
      if (categoryId && categoryId !== 'all') {
        queryConditions.push(Q.where('category_id', categoryId));
      }

      const allChannelIds = await database
        .get<Channel>('channels')
        .query(...queryConditions)
        .fetch();

      // Trouver l'index de la chaîne cible
      const index = allChannelIds.findIndex(ch => ch.id === channelId);

      const duration = Date.now() - startTime;

      if (index === -1) {
        console.warn(`⚠️ [findChannelIndex] Chaîne ${channelId} non trouvée (${duration}ms)`);
        return 0; // Retourner 0 si non trouvé (début de la liste)
      }

      console.log(`✅ [findChannelIndex] Chaîne trouvée à l'index: ${index}/${allChannelIds.length} en ${duration}ms`);
      return index;
    } catch (error) {
      console.error('❌ [findChannelIndex] Erreur:', error);
      return 0; // Fallback vers le début
    }
  }

  // ==========================================
  // 📁 SOLUTION HYBRIDE - IMPORT CATÉGORIES SEULEMENT
  // ==========================================

  /**
   * 📁 Importer SEULEMENT les catégories VOD (ultra-rapide)
   * Solution hybride pour éviter le téléchargement massif
   */
  async importXtreamCategoriesOnly(
    playlistId: string,
    credentials: XtreamCredentials,
  ): Promise<void> {
    try {
      console.log('📁 Import léger des catégories VOD...');
      const startTime = Date.now();

      // Télécharger uniquement les catégories (rapide)
      const [movieCategories, seriesCategories] = await Promise.all([
        this.getVodCategories(credentials),
        this.getSeriesCategories(credentials),
      ]);

      console.log(`📁 Téléchargé: ${movieCategories.length} catégories films, ${seriesCategories.length} catégories séries`);

      // Sauvegarder dans WatermelonDB via VODCacheService
      const VODCacheService = (await import('./VODCacheService')).default;

      await VODCacheService.saveCategoriesToDB(playlistId, movieCategories, 'movie');
      await VODCacheService.saveCategoriesToDB(playlistId, seriesCategories, 'series');

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✅ Catégories VOD importées en ${duration}s: ${movieCategories.length + seriesCategories.length} catégories`);

    } catch (error) {
      console.error('❌ Erreur import catégories VOD:', error);
      throw error;
    }
  }

  // ==========================================
  // 🚀 MÉTHODES PUBLIQUES POUR CONNEXION XTREAM
  // ==========================================

  /**
   * 🔍 Récupérer les informations du compte Xtream (PUBLIC)
   */
  async getAccountInfo(credentials: XtreamCredentials): Promise<{
    username: string;
    password: string;
    message: string;
    auth: number;
    status: string;
    exp_date: string;
    is_trial: string;
    active_cons: string;
    created_at: string;
    max_connections: string;
    allowed_output_formats: string[];
  }> {
    const accountData = await this.getXtreamAccountInfo(credentials);
    return accountData.user_info || accountData;
  }

  /**
   * 📺 Récupérer toutes les chaînes live depuis Xtream (PUBLIC)
   */
  async getChannelsFromXtream(credentials: XtreamCredentials): Promise<any[]> {
    const [categories, channels] = await Promise.all([
      this.getXtreamCategories(credentials),
      this.getXtreamLiveChannels(credentials),
    ]);

    // Créer un map des catégories pour lookup rapide
    const categoryMap = new Map<string, string>();
    categories.forEach(cat => {
      categoryMap.set(cat.category_id, cat.category_name);
    });

    // Mapper les chaînes avec les infos de catégorie
    return channels.map((ch, index) => ({
      id: `xtream_${ch.stream_id || index}`,
      name: ch.name,
      streamUrl: this.buildXtreamStreamUrl(
        credentials.url,
        credentials.username,
        credentials.password,
        ch.stream_id,
        'ts',
      ),
      logoUrl: this.normalizeLogoUrl(ch.stream_icon, credentials.url),
      groupTitle: categoryMap.get(ch.category_id) || ch.category_name || 'Non classé',
      tvgId: ch.epg_channel_id || '',
      streamType: 'live',
      streamId: ch.stream_id,
      isAdult: ch.is_adult === '1' || ch.is_adult === 1,
      categoryId: ch.category_id,
    }));
  }

  /**
   * 💾 Sauvegarder les chaînes dans WatermelonDB (PUBLIC)
   */
  async saveChannelsToDatabase(playlistId: string, channels: any[]): Promise<void> {
    console.log(`💾 Sauvegarde de ${channels.length} chaînes dans WatermelonDB...`);

    const CHUNK_SIZE = 500;
    const chunks = this.chunkArray(channels, CHUNK_SIZE);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`📦 Chunk ${i + 1}/${chunks.length}: ${chunk.length} chaînes`);

      await database.write(async () => {
        const channelCollection = database.get<any>('channels');

        for (const ch of chunk) {
          await channelCollection.create((record: any) => {
            record.playlistId = playlistId;
            record.categoryId = ch.categoryId || '';
            record.name = ch.name;
            record.streamUrl = ch.streamUrl;
            record.logoUrl = ch.logoUrl || '';
            record.groupTitle = ch.groupTitle || '';
            record.tvgId = ch.tvgId || '';
            record.streamType = ch.streamType || 'live';
            record.streamId = ch.streamId || '';
            record.isAdult = ch.isAdult || false;
            record.isFavorite = false;
            record.watchCount = 0;
            record.createdAt = Date.now();
            record.updatedAt = Date.now();
          });
        }
      });
    }

    console.log(`✅ ${channels.length} chaînes sauvegardées avec succès`);
  }
}

export default new WatermelonXtreamService();
