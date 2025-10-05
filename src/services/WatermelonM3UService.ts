/**
 * 🍉 WatermelonDB M3U Service - Gestion M3U avec WatermelonDB
 * Service optimisé pour 25K+ chaînes M3U avec lazy loading
 * Réutilise UltraOptimizedM3UParser existant
 */

import {Q} from '@nozbe/watermelondb';
import database from '../database';
import {Playlist, Channel, Category} from '../database/models';
import {UltraOptimizedM3UParser} from './parsers/UltraOptimizedM3UParser';
import type {Channel as ParsedChannel} from './parsers/UltraOptimizedM3UParser';

class WatermelonM3UService {
  /**
   * 🚀 Import complet d'une playlist M3U dans WatermelonDB
   * Utilise UltraOptimizedM3UParser + batch operations
   */
  async importM3UPlaylist(
    m3uContent: string,
    playlistName: string,
    playlistUrl?: string,
    onProgress?: (progress: number, message: string) => void,
  ): Promise<string> {
    try {
      onProgress?.(10, '🔍 Parsing M3U avec UltraOptimizedParser...');

      // 1. Parse M3U avec le parser ultra-optimisé existant
      const startParse = Date.now();
      const parser = new UltraOptimizedM3UParser();
      const parseResult = await parser.parse(m3uContent);
      const parseTime = Date.now() - startParse;

      console.log(
        `✅ Parse M3U terminé: ${parseResult.channels.length} chaînes en ${parseTime}ms`,
      );
      console.log('📊 Stats:', parseResult.stats);

      onProgress?.(
        40,
        `📺 ${parseResult.channels.length} chaînes parsées en ${parseTime}ms...`,
      );

      // 2. Extraire catégories uniques
      const categoriesMap = new Map<string, number>();
      parseResult.channels.forEach(channel => {
        const categoryName =
          channel.category || channel.groupTitle || 'Non classé';
        categoriesMap.set(
          categoryName,
          (categoriesMap.get(categoryName) || 0) + 1,
        );
      });

      onProgress?.(
        50,
        `📂 ${categoriesMap.size} catégories trouvées, import SQLite...`,
      );

      // 3. Import en base avec batch operations
      const playlistId = await this.batchImportToWatermelon({
        playlistName,
        playlistUrl,
        channels: parseResult.channels,
        categories: Array.from(categoriesMap.entries()).map(
          ([name, count]) => ({
            name,
            count,
          }),
        ),
        onProgress,
      });

      onProgress?.(100, '✅ Import M3U terminé avec succès !');
      return playlistId;
    } catch (error) {
      console.error('❌ Erreur import M3U WatermelonDB:', error);
      throw error;
    }
  }

  /**
   * 📦 Import par batch dans WatermelonDB - Optimisé pour 25K+ records
   */
  private async batchImportToWatermelon({
    playlistName,
    playlistUrl,
    channels,
    categories,
    onProgress,
  }: {
    playlistName: string;
    playlistUrl?: string;
    channels: ParsedChannel[];
    categories: {name: string; count: number}[];
    onProgress?: (progress: number, message: string) => void;
  }): Promise<string> {
    const BATCH_SIZE = 1000; // Traitement par batch de 1000 records

    return await database.write(async () => {
      onProgress?.(60, '💾 Création de la playlist...');

      // 1. Créer la playlist
      const playlistsCollection = database.get<Playlist>('playlists');
      const playlist = await playlistsCollection.create(p => {
        p.name = playlistName;
        p.type = 'M3U';
        p.url = playlistUrl || '';
        p.dateAdded = Date.now();
        p.channelsCount = channels.length;
        p.status = 'active';
        p.isActive = false; // Sera activée à la fin
      });

      console.log(`✅ Playlist créée: ${playlist.id}`);

      onProgress?.(65, '📂 Import des catégories...');

      // 2. Créer les catégories
      const categoriesCollection = database.get<Category>('categories');
      const categoryRecords = await Promise.all(
        categories.map(cat =>
          categoriesCollection.prepareCreate(c => {
            c.playlistId = playlist.id;
            c.name = cat.name;
            c.categoryId = cat.name
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '_');
            c.channelsCount = cat.count;
          }),
        ),
      );

      await database.batch(categoryRecords);
      console.log(`✅ ${categories.length} catégories créées`);

      // Créer un map categoryName -> categoryId pour référence
      const categoryIdMap = new Map<string, string>();
      categoryRecords.forEach((cat: any) => {
        categoryIdMap.set(cat.name, cat.id);
      });

      onProgress?.(70, `📺 Import de ${channels.length} chaînes par batch...`);

      // 3. Créer les chaînes par batch
      const channelBatches = this.chunkArray(channels, BATCH_SIZE);
      const channelsCollection = database.get<Channel>('channels');

      for (let i = 0; i < channelBatches.length; i++) {
        const batch = channelBatches[i];
        const progress = 70 + Math.floor((i / channelBatches.length) * 25);
        onProgress?.(
          progress,
          `💾 Batch ${i + 1}/${channelBatches.length} (${batch.length} chaînes)...`,
        );

        const channelRecords = await Promise.all(
          batch.map(channel =>
            channelsCollection.prepareCreate(ch => {
              ch.playlistId = playlist.id;

              // Récupérer categoryId normalisé (pas l'ID WatermelonDB!)
              const categoryName =
                channel.category || channel.groupTitle || 'Non classé';
              const catRecord = categoryRecords.find(
                (c: any) => c.name === categoryName,
              );
              // CORRECTION: Utiliser categoryId normalisé au lieu de l'ID auto-généré
              ch.categoryId = catRecord?.categoryId || categoryName.toLowerCase().replace(/[^a-z0-9]/g, '_');

              // Champs de base
              ch.name = channel.name;
              ch.streamUrl = channel.url;
              ch.logoUrl = channel.logo || '';
              ch.groupTitle = channel.groupTitle || categoryName;

              // TVG metadata
              ch.tvgId = channel.tvgId || '';
              ch.tvgName = channel.name;
              ch.tvgLogo = channel.logo || '';

              // Autres metadata
              ch.language = channel.language || '';
              ch.country = channel.country || '';
              ch.quality = channel.quality || '';
              ch.streamType = 'live';

              // Stats initiales
              ch.isFavorite = false;
              ch.watchCount = 0;
            }),
          ),
        );

        // Batch insert optimisé
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
        `✅ Import M3U WatermelonDB terminé: ${channels.length} chaînes, ${categories.length} catégories`,
      );
      return playlist.id;
    });
  }

  /**
   * 🔍 Récupérer une playlist M3U avec lazy loading des chaînes
   */
  async getPlaylistWithChannels(
    playlistId: string,
    limit: number = 500,
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
      console.error('❌ Erreur récupération playlist M3U WatermelonDB:', error);
      throw error;
    }
  }

  /**
   * 🔍 Recherche de chaînes M3U avec SQL rapide
   */
  async searchChannels(playlistId: string, query: string, limit: number = 500) {
    try {
      const sanitized = Q.sanitizeLikeString(query);
      return await database
        .get<Channel>('channels')
        .query(
          Q.where('playlist_id', playlistId),
          Q.where('name', Q.like(`%${sanitized}%`)),
          Q.sortBy('name', Q.asc),
          Q.take(limit),
        )
        .fetch();
    } catch (error) {
      console.error('❌ Erreur recherche M3U WatermelonDB:', error);
      throw error;
    }
  }

  /**
   * 📺 Récupérer les chaînes par catégorie avec lazy loading
   */
  async getChannelsByCategory(
    playlistId: string,
    categoryId: string,
    limit: number = 500,
    offset: number = 0,
  ) {
    try {
      const channels = await database
        .get<Channel>('channels')
        .query(
          Q.where('playlist_id', playlistId),
          Q.where('category_id', categoryId), // categoryId est maintenant normalisé (ex: "entertainment")
          Q.skip(offset),
          Q.take(limit),
        )
        .fetch();

      console.log(`📊 [WatermelonM3U] ${channels.length} chaînes trouvées pour catégorie "${categoryId}"`);
      return channels;
    } catch (error) {
      console.error('❌ Erreur récupération chaînes M3U par catégorie:', error);
      throw error;
    }
  }

  /**
   * ⭐ Récupérer les chaînes favorites M3U
   */
  async getFavoriteChannels(
    playlistId: string,
    limit: number = 500,
    offset: number = 0,
  ) {
    try {
      return await database
        .get<Channel>('channels')
        .query(
          Q.where('playlist_id', playlistId),
          Q.where('is_favorite', true),
          Q.sortBy('last_watched', Q.desc),
          Q.skip(offset),
          Q.take(limit),
        )
        .fetch();
    } catch (error) {
      console.error('❌ Erreur récupération favoris M3U WatermelonDB:', error);
      throw error;
    }
  }

  /**
   * 📺 Récupérer l'historique de visionnage M3U
   */
  async getRecentChannels(playlistId: string, limit: number = 20) {
    try {
      return await database
        .get<Channel>('channels')
        .query(
          Q.where('playlist_id', playlistId),
          Q.where('last_watched', Q.notEq(null)),
          Q.sortBy('last_watched', Q.desc),
          Q.take(limit),
        )
        .fetch();
    } catch (error) {
      console.error('❌ Erreur récupération historique M3U WatermelonDB:', error);
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
}

export default new WatermelonM3UService();
