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
        });

      onProgress?.(65, '📂 Import des catégories...');

      // 2. Créer les catégories par batch
      const categoryBatches = this.chunkArray(categories, BATCH_SIZE);
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
      }

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
            ch.categoryId = channel.category_id;
            ch.name = channel.name || 'Sans nom';
            ch.streamUrl = this.buildXtreamStreamUrl(
              credentials,
              channel.stream_id,
            );

            // NORMALISATION LOGOS lors de l'import
            console.log(
              '🔍 Logo original pour',
              channel.name + ':',
              channel.stream_icon,
            );
            console.log('🔍 URL serveur:', credentials.url);

            ch.logoUrl = this.normalizeLogoUrl(
              channel.stream_icon,
              credentials.url,
            );
            ch.streamIcon = this.normalizeLogoUrl(
              channel.stream_icon,
              credentials.url,
            );

            console.log('🔍 Logo normalisé:', ch.logoUrl);

            // NORMALISATION CATÉGORIES lors de l'import
            ch.groupTitle = this.normalizeCategoryName(channel.category_name);

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
   */
  async getPlaylistWithChannels(
    playlistId: string,
    limit: number = 25000,
    offset: number = 0,
  ) {
    try {
      const playlist = await database
        .get<Playlist>('playlists')
        .find(playlistId);

      // Lazy loading: récupérer seulement les chaînes demandées
      const channels = await database
        .get<Channel>('channels')
        .query(
          Q.where('playlist_id', playlistId),
          Q.skip(offset),
          Q.take(limit),
        )
        .fetch();

      const categories = await database
        .get<Category>('categories')
        .query(Q.where('playlist_id', playlistId))
        .fetch();

      return {
        playlist,
        channels,
        categories,
        totalChannels: playlist.channelsCount,
      };
    } catch (error) {
      console.error('❌ Erreur récupération playlist WatermelonDB:', error);
      throw error;
    }
  }

  /**
   * 🔍 Recherche de chaînes avec lazy loading
   */
  async searchChannels(
    playlistId: string,
    query: string,
    limit: number = 25000,
  ) {
    try {
      return await database
        .get<Channel>('channels')
        .query(
          Q.where('playlist_id', playlistId),
          Q.where('name', Q.like(`%${Q.sanitizeLikeString(query)}%`)),
          Q.take(limit),
        )
        .fetch();
    } catch (error) {
      console.error('❌ Erreur recherche chaînes WatermelonDB:', error);
      throw error;
    }
  }

  /**
   * 📺 Récupérer les chaînes par catégorie avec lazy loading
   */
  async getChannelsByCategory(
    playlistId: string,
    categoryId: string,
    limit: number = 25000,
    offset: number = 0,
  ) {
    try {
      return await database
        .get<Channel>('channels')
        .query(
          Q.where('playlist_id', playlistId),
          Q.where('category_id', categoryId),
          Q.skip(offset),
          Q.take(limit),
        )
        .fetch();
    } catch (error) {
      console.error('❌ Erreur récupération chaînes par catégorie:', error);
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
    if (!categoryName || categoryName.trim() === '') {return 'Non classé';}

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
}

export default new WatermelonXtreamService();
