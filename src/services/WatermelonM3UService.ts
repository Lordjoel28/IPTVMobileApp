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
  // Throttle pour éviter trop de callbacks de progression
  private lastProgressUpdate = 0;
  private readonly PROGRESS_THROTTLE_MS = 200; // Max 5 updates/seconde

  /**
   * Wrapper throttlé pour onProgress
   */
  private throttledProgress(
    onProgress: ((progress: number, message: string) => void) | undefined,
    progress: number,
    message: string,
    force: boolean = false
  ): void {
    if (!onProgress) return;

    const now = Date.now();
    if (!force && now - this.lastProgressUpdate < this.PROGRESS_THROTTLE_MS) {
      return; // Ignorer (trop rapide)
    }

    this.lastProgressUpdate = now;
    onProgress(progress, message);
  }

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
      this.throttledProgress(onProgress, 10, '🔍 Parsing M3U avec UltraOptimizedParser...', true); // Force

      // 1. Parse M3U avec le parser ultra-optimisé existant
      const startParse = Date.now();
      const parser = new UltraOptimizedM3UParser();
      const parseResult = await parser.parse(m3uContent);
      const parseTime = Date.now() - startParse;

      console.log(
        `✅ Parse M3U terminé: ${parseResult.channels.length} chaînes en ${parseTime}ms`,
      );
      console.log('📊 Stats:', parseResult.stats);

      this.throttledProgress(
        onProgress,
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

      this.throttledProgress(onProgress, 100, '✅ Import M3U terminé avec succès !', true); // Force final
      return playlistId;
    } catch (error) {
      console.error('❌ Erreur import M3U WatermelonDB:', error);
      throw error;
    }
  }

  /**
   * 🔄 Mise à jour EN PLACE d'une playlist M3U (garde le même ID)
   * Pour synchronisation automatique sans perdre la session utilisateur
   */
  async updatePlaylistInPlace(
    playlistId: string,
    m3uContent: string,
    playlistName: string,
    playlistUrl?: string,
    onProgress?: (progress: number, message: string) => void,
  ): Promise<string> {
    try {
      // Message simple et unifié
      this.throttledProgress(onProgress, 10, 'settings:updatingPlaylist', true);

      // 1. Parse M3U avec le parser ultra-optimisé
      const parser = new UltraOptimizedM3UParser();
      const parseResult = await parser.parse(m3uContent);

      this.throttledProgress(onProgress, 30, 'settings:updatingPlaylist');

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

      this.throttledProgress(onProgress, 40, 'settings:updatingPlaylist', true);

      // 3. Supprimer les anciennes chaînes et catégories PAR BATCHS (évite blocage UI)
      console.log('🗑️ [WatermelonM3U] Suppression anciennes données...');

      // 3a. Récupérer les anciennes données
      const channelsCollection = database.get<Channel>('channels');
      const oldChannels = await channelsCollection
        .query(Q.where('playlist_id', playlistId))
        .fetch();

      const categoriesCollection = database.get<Category>('categories');
      const oldCategories = await categoriesCollection
        .query(Q.where('playlist_id', playlistId))
        .fetch();

      console.log(`🗑️ [WatermelonM3U] ${oldChannels.length} chaînes + ${oldCategories.length} catégories à supprimer`);

      // 3b. Supprimer les chaînes par batchs de 500 (évite blocage)
      const DELETE_BATCH_SIZE = 500;
      const channelBatches = this.chunkArray(oldChannels, DELETE_BATCH_SIZE);

      for (let i = 0; i < channelBatches.length; i++) {
        const batch = channelBatches[i];

        // Progression de 40% à 48% pendant suppression chaînes
        const progress = 40 + Math.floor((i / channelBatches.length) * 8);
        this.throttledProgress(onProgress, progress, 'settings:updatingPlaylist', true);

        await database.write(async () => {
          await Promise.all(batch.map(ch => ch.markAsDeleted()));
        });

        // Pause de 10ms pour laisser l'UI respirer
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      console.log(`✅ [WatermelonM3U] ${oldChannels.length} chaînes supprimées`);

      // 3c. Supprimer les catégories (rapide, peu d'items)
      this.throttledProgress(onProgress, 48, 'settings:updatingPlaylist', true);

      await database.write(async () => {
        await Promise.all(oldCategories.map(cat => cat.markAsDeleted()));
      });

      console.log(`✅ [WatermelonM3U] ${oldCategories.length} catégories supprimées`);
      this.throttledProgress(onProgress, 50, 'settings:updatingPlaylist', true);

      // 4. Réimporter les nouvelles données (réutilise la même playlist)
      await this.batchUpdatePlaylist({
        playlistId,
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

      this.throttledProgress(onProgress, 100, 'settings:updatingPlaylist', true);

      return playlistId;
    } catch (error) {
      console.error('❌ Erreur mise à jour playlist:', error);
      throw error;
    }
  }

  /**
   * 📦 Mise à jour des données d'une playlist existante
   */
  private async batchUpdatePlaylist({
    playlistId,
    playlistName,
    playlistUrl,
    channels,
    categories,
    onProgress,
  }: {
    playlistId: string;
    playlistName: string;
    playlistUrl?: string;
    channels: ParsedChannel[];
    categories: {name: string; count: number}[];
    onProgress?: (progress: number, message: string) => void;
  }): Promise<void> {
    // 🚀 OPTIMISATION: Batch plus petit pour éviter de bloquer le thread UI
    const BATCH_SIZE = 500; // Réduit de 1000 à 500

    // 1. Mettre à jour les métadonnées de la playlist
    await database.write(async () => {
      const playlistsCollection = database.get<Playlist>('playlists');
      const playlist = await playlistsCollection.find(playlistId);

      await playlist.update(p => {
        p.name = playlistName;
        p.url = playlistUrl || p.url;
        p.channelsCount = channels.length;
        p.status = 'active';
      });
    });

    this.throttledProgress(onProgress, 55, 'settings:updatingPlaylist');

    // 2. Créer les nouvelles catégories (séparé pour éviter transaction longue)
    let categoryRecords: any[] = [];
    await database.write(async () => {
      const categoriesCollection = database.get<Category>('categories');
      categoryRecords = await Promise.all(
        categories.map(cat =>
          categoriesCollection.prepareCreate(c => {
            c.playlistId = playlistId;
            c.name = cat.name;
            c.categoryId = cat.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
            c.channelsCount = cat.count;
          }),
        ),
      );

      await database.batch(categoryRecords);
    });

    this.throttledProgress(onProgress, 60, 'settings:updatingPlaylist');

    // 3. Créer les nouvelles chaînes par batch (SANS write global pour éviter blocage)
    const channelBatches = this.chunkArray(channels, BATCH_SIZE);
    const channelsCollection = database.get<Channel>('channels');

    for (let i = 0; i < channelBatches.length; i++) {
      const batch = channelBatches[i];

      // 🔥 CRITIQUE: Mettre à jour la progression AVANT le batch (THROTTLÉ pour éviter 500+ callbacks)
      const progress = 60 + Math.floor((i / channelBatches.length) * 35);
      this.throttledProgress(onProgress, progress, 'settings:updatingPlaylist');

      // 🚀 Transaction séparée pour chaque batch (évite blocage long)
      await database.write(async () => {
        const channelRecords = await Promise.all(
          batch.map(channel =>
            channelsCollection.prepareCreate(ch => {
              ch.playlistId = playlistId;

              const categoryName =
                channel.category || channel.groupTitle || 'Non classé';
              const catRecord = categoryRecords.find(
                (c: any) => c.name === categoryName,
              );
              ch.categoryId =
                catRecord?.categoryId ||
                categoryName.toLowerCase().replace(/[^a-z0-9]/g, '_');

              ch.name = channel.name;
              ch.streamUrl = channel.url;
              ch.logoUrl = channel.logo || '';
              ch.groupTitle = channel.groupTitle || categoryName;

              ch.tvgId = channel.tvgId || '';
              ch.tvgName = channel.name;
              ch.tvgLogo = channel.logo || '';

              ch.language = channel.language || '';
              ch.country = channel.country || '';
              ch.quality = channel.quality || '';
              ch.streamType = 'live';

              ch.isFavorite = false;
              ch.watchCount = 0;
            }),
          ),
        );

        await database.batch(channelRecords);
      });

      // 🚀 CRITIQUE: Pause plus longue entre batches pour laisser le thread UI respirer
      if (i < channelBatches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 50)); // 50ms au lieu de 10ms
      }
    }

    this.throttledProgress(onProgress, 95, 'settings:updatingPlaylist');
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
    // 🚀 OPTIMISATION: Réduire la taille des batchs pour éviter de bloquer l'UI thread
    const BATCH_SIZE = 500; // Réduit de 1000 à 500 pour fluidité animation

    // 🚀 OPTIMISATION: Séparer les transactions pour permettre à l'UI de respirer

    // 1. Créer la playlist (transaction séparée)
    const playlist = await database.write(async () => {
      this.throttledProgress(onProgress, 60, 'settings:updatingPlaylist');

      const playlistsCollection = database.get<Playlist>('playlists');
      return await playlistsCollection.create(p => {
        p.name = playlistName;
        p.type = 'M3U';
        p.url = playlistUrl || '';
        p.dateAdded = Date.now();
        p.channelsCount = channels.length;
        p.status = 'active';
        p.isActive = false; // Sera activée à la fin
      });
    });

    console.log(`✅ Playlist créée: ${playlist.id}`);

    // 2. Créer les catégories (transaction séparée)
    const categoryRecords = await database.write(async () => {
      this.throttledProgress(onProgress, 65, 'Veuillez patienter, contenu actualisé');

      const categoriesCollection = database.get<Category>('categories');
      const records = await Promise.all(
        categories.map(cat =>
          categoriesCollection.prepareCreate(c => {
            c.playlistId = playlist.id;
            c.name = cat.name;
            c.categoryId = cat.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
            c.channelsCount = cat.count;
          }),
        ),
      );

      await database.batch(records);
      console.log(`✅ ${categories.length} catégories créées`);
      return records;
    });

    // Créer un map categoryName -> categoryId pour référence
    const categoryIdMap = new Map<string, string>();
    categoryRecords.forEach((cat: any) => {
      categoryIdMap.set(cat.name, cat.id);
    });

    // 3. Créer les chaînes par batch (transactions séparées par batch)
    const channelBatches = this.chunkArray(channels, BATCH_SIZE);
    const channelsCollection = database.get<Channel>('channels');

    for (let i = 0; i < channelBatches.length; i++) {
      const batch = channelBatches[i];

      // 🚀 OPTIMISATION: Mettre à jour la progression AVANT le batch (THROTTLÉ)
      const progress = 70 + Math.floor((i / channelBatches.length) * 25);
      this.throttledProgress(onProgress, progress, 'settings:updatingPlaylist');

      // 🚀 OPTIMISATION: Transaction séparée par batch pour éviter blocage
      await database.write(async () => {
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
              ch.categoryId =
                catRecord?.categoryId ||
                categoryName.toLowerCase().replace(/[^a-z0-9]/g, '_');

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
      });

      // 🚀 OPTIMISATION: Pause plus longue pour laisser l'UI respirer
      if (i < channelBatches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 50)); // 50ms au lieu de 10ms
      }
    }

    // 4. Activer la playlist après import complet (transaction séparée)
    await database.write(async () => {
      this.throttledProgress(onProgress, 95, 'settings:updatingPlaylist');

      await playlist.update(p => {
        p.isActive = true;
      });

      console.log(
        `✅ Import M3U WatermelonDB terminé: ${channels.length} chaînes, ${categories.length} catégories`,
      );
    });

    return playlist.id;
  }

  /**
   * 🔍 Récupérer une playlist M3U avec lazy loading des chaînes
   * @param blockedCategories - Catégories à exclure (mode enfant)
   */
  async getPlaylistWithChannels(
    playlistId: string,
    limit: number = 50000, // Augmenté pour supporter les très grosses playlists
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
          `🔒 [WatermelonM3U] Mode enfant actif - Filtrage JavaScript: ${blockedCategories.join(
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

        channels = channels.filter(ch => {
          const groupTitle = (ch.groupTitle || '').toLowerCase();
          // Exclure si le groupTitle contient un mot bloqué
          return !blockedCategories.some(blocked =>
            groupTitle.includes(blocked.toLowerCase()),
          );
        });
        console.log(
          `🔒 [WatermelonM3U] Filtrage: ${beforeCount} → ${channels.length} chaînes`,
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

      return {
        playlist,
        channels,
        categories: categories, // ✅ Retourner TOUTES les catégories (interface affichera cadenas)
        totalChannels: playlist.channelsCount,
      };
    } catch (error) {
      console.error('❌ Erreur récupération playlist M3U WatermelonDB:', error);
      throw error;
    }
  }

  /**
   * 🔍 Recherche de chaînes M3U avec SQL rapide
   * @param blockedCategories - Catégories à exclure (mode enfant)
   */
  async searchChannels(
    playlistId: string,
    query: string,
    limit: number = 500,
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
          Q.sortBy('name', Q.asc),
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
      console.error('❌ Erreur recherche M3U WatermelonDB:', error);
      throw error;
    }
  }

  /**
   * 📂 Récupérer toutes les catégories d'une playlist (depuis les chaînes)
   */
  async getPlaylistCategories(playlistId: string) {
    try {
      // Récupérer toutes les chaînes pour extraire les catégories uniques
      const allChannels = await database
        .get<Channel>('channels')
        .query(
          Q.where('playlist_id', playlistId),
          Q.take(50000), // Limite haute pour avoir toutes les chaînes
        )
        .fetch();

      // Extraire les catégories uniques depuis les chaînes
      const categoryMap = new Map<string, { id: string; name: string; count: number; categoryId: string }>();

      allChannels.forEach(channel => {
        const categoryName = channel.groupTitle || 'Non classé';
        if (!categoryMap.has(categoryName)) {
          // Utiliser le même format de categoryId que dans le code original
          const categoryId = categoryName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');

          categoryMap.set(categoryName, {
            id: categoryId,
            name: categoryName,
            categoryId: categoryId, // Ajout pour compatibilité
            count: 0,
          });
        }
        categoryMap.get(categoryName)!.count++;
      });

      const categories = Array.from(categoryMap.values())
        .sort((a, b) => a.name.localeCompare(b.name));

      console.log(`📂 [WatermelonM3U] ${categories.length} catégories extraites de ${allChannels.length} chaînes pour playlist ${playlistId}`);
      return categories;
    } catch (error) {
      console.error('❌ Erreur récupération catégories M3U WatermelonDB:', error);
      throw error;
    }
  }

  /**
   * 🔍 Récupérer le vrai nom de catégorie (group_title) à partir d'un categoryId normalisé
   * @param playlistId - ID de la playlist
   * @param categoryId - ID normalisé (ex: "shop") ou nom original (ex: "Shop")
   */
  private async getRealCategoryName(
    playlistId: string,
    categoryId: string,
  ): Promise<string | null> {
    try {
      // D'abord chercher par categoryId exact dans la table categories
      const category = await database
        .get<Category>('categories')
        .query(
          Q.where('playlist_id', playlistId),
          Q.where('category_id', categoryId),
        )
        .fetch();

      if (category.length > 0) {
        console.log(`✅ [WatermelonM3U] Catégorie trouvée par ID: "${categoryId}" → "${category[0].name}"`);
        return category[0].name; // Retourner le nom original (group_title)
      }

      // Si pas trouvé, chercher par nom direct (au cas où categoryId est déjà le nom original)
      const categoryByName = await database
        .get<Category>('categories')
        .query(
          Q.where('playlist_id', playlistId),
          Q.where('name', categoryId),
        )
        .fetch();

      if (categoryByName.length > 0) {
        console.log(`✅ [WatermelonM3U] Catégorie trouvée par nom: "${categoryId}"`);
        return categoryByName[0].name;
      }

      console.log(`❌ [WatermelonM3U] Aucune catégorie trouvée pour: "${categoryId}"`);
      return null;
    } catch (error) {
      console.error('❌ [WatermelonM3U] Erreur recherche catégorie:', error);
      return null;
    }
  }

  /**
   * 📺 Récupérer les chaînes par catégorie avec lazy loading
   * @param categoryId - Peut être soit un ID normalisé (ex: "canada") soit un nom original (ex: "Canada")
   * @param blockedCategories - Catégories à exclure (mode enfant)
   */
  async getChannelsByCategory(
    playlistId: string,
    categoryId: string,
    limit: number = 2000, // Augmenté pour les grosses catégories
    offset: number = 0,
    blockedCategories?: string[],
  ) {
    try {
      // Charger plus si mode enfant
      const fetchLimit =
        blockedCategories && blockedCategories.length > 0 ? limit * 3 : limit;

      let channels = [];

      // 🔍 NOUVELLE APPROACHE: Utiliser le mapping direct depuis la table categories
      console.log(`🔍 [WatermelonM3U] Recherche chaînes pour catégorie: "${categoryId}"`);

      // D'abord essayer de trouver le vrai nom de catégorie (group_title)
      const realCategoryName = await this.getRealCategoryName(playlistId, categoryId);

      if (realCategoryName) {
        // Utiliser le vrai nom pour chercher les chaînes
        console.log(`✅ [WatermelonM3U] Utilisation nom réel: "${realCategoryName}"`);
        channels = await database
          .get<Channel>('channels')
          .query(
            Q.where('playlist_id', playlistId),
            Q.where('group_title', realCategoryName),
            Q.skip(offset),
            Q.take(fetchLimit),
          )
          .fetch();
      } else {
        // Fallback: essayer directement avec categoryId (au cas où c'est déjà le nom)
        console.log(`⚠️ [WatermelonM3U] Pas de mapping trouvé, essai direct avec: "${categoryId}"`);
        channels = await database
          .get<Channel>('channels')
          .query(
            Q.where('playlist_id', playlistId),
            Q.where('group_title', categoryId),
            Q.skip(offset),
            Q.take(fetchLimit),
          )
          .fetch();
      }

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

      console.log(
        `📊 [WatermelonM3U] ${channels.length} chaînes trouvées pour catégorie "${categoryId}"`,
      );
      return channels;
    } catch (error) {
      console.error('❌ Erreur récupération chaînes M3U par catégorie:', error);
      throw error;
    }
  }

  /**
   * ⭐ Récupérer les chaînes favorites M3U
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
          Q.sortBy('last_watched', Q.desc),
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
      console.error(
        '❌ Erreur récupération historique M3U WatermelonDB:',
        error,
      );
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
