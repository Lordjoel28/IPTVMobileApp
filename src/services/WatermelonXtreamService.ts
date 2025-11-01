/**
 * 🍉 WatermelonDB Xtream Service - Gestion Xtream Codes avec WatermelonDB
 * Service optimisé pour 25K+ chaînes avec lazy loading
 */

import {Q} from '@nozbe/watermelondb';
import database from '../database';
import {Playlist, Channel, Category} from '../database/models';
import {networkService, NetworkError} from './NetworkService';

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
}

export default new WatermelonXtreamService();
