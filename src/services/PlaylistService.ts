/**
 * 📋 PlaylistService - Migration du PlaylistManager web
 * Gestion des playlists M3U/M3U8 avec cache intelligent multi-niveaux
 */

import {cacheService} from './CacheService';
import {parsersService} from './ParsersService';
import type {Playlist, Channel} from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PlaylistSource {
  id: string;
  name: string;
  url?: string;
  content?: string;
  type: 'url' | 'file' | 'xtream';
  dateAdded: string;
  lastUpdated: string;
}

export class PlaylistService {
  private playlists: Map<string, Playlist> = new Map();
  private currentPlaylistId: string | null = null;

  // 🆕 Singleton pattern instance
  private static instance: PlaylistService;

  constructor() {
    console.log('📋 PlaylistService initialized with modular architecture');
  }

  /**
   * 🚀 NOUVELLE MÉTHODE : Initialiser et charger playlists sauvegardées
   * Appelée au démarrage pour restaurer toutes les playlists disponibles
   */
  async initializeFromStorage(): Promise<void> {
    try {
      console.log('🔄 Initialisation PlaylistService depuis storage...');

      // Charger toutes les playlists disponibles dans AsyncStorage
      const allKeys = await AsyncStorage.getAllKeys();
      console.log('📋 Clés AsyncStorage disponibles:', allKeys);

      // Chercher les différents patterns de clés de playlist
      const playlistKeys = allKeys.filter(
        key =>
          key.startsWith('playlist_') &&
          !key.includes('index') &&
          !key.includes('meta') &&
          !key.includes('url_') &&
          key !== 'current_active_playlist_id',
      );

      console.log(
        `📦 ${playlistKeys.length} playlists trouvées dans storage:`,
        playlistKeys,
      );

      // 🚀 NOUVELLE LOGIQUE : Essayer aussi saved_m3u_playlists
      if (allKeys.includes('saved_m3u_playlists')) {
        console.log('🔍 Tentative chargement depuis saved_m3u_playlists...');
        try {
          const savedPlaylists = await AsyncStorage.getItem(
            'saved_m3u_playlists',
          );
          if (savedPlaylists) {
            const playlistsArray = JSON.parse(savedPlaylists);
            console.log(
              '📋 Playlists dans saved_m3u_playlists:',
              playlistsArray.length,
            );

            for (let i = 0; i < playlistsArray.length; i++) {
              try {
                const playlist = playlistsArray[i] as Playlist;
                this.playlists.set(playlist.id, playlist);
                console.log(
                  `✅ Playlist chargée: ${playlist.name} (${
                    playlist.channels?.length || 0
                  } chaînes)`,
                );
              } catch (error) {
                console.error(`❌ Erreur chargement playlist ${i}:`, error);
              }
            }
          }
        } catch (error) {
          console.error('❌ Erreur lecture saved_m3u_playlists:', error);
        }
      }

      // Charger aussi les playlists individuelles
      for (const key of playlistKeys) {
        try {
          const playlistData = await AsyncStorage.getItem(key);
          if (playlistData) {
            const playlist = JSON.parse(playlistData) as Playlist;
            this.playlists.set(playlist.id, playlist);
            console.log(
              `✅ Playlist chargée: ${playlist.name} (${
                playlist.channels?.length || 0
              } chaînes)`,
            );
          }
        } catch (error) {
          console.error(`❌ Erreur chargement playlist ${key}:`, error);
        }
      }

      console.log(
        `✅ PlaylistService initialisé avec ${this.playlists.size} playlists`,
      );
    } catch (error) {
      console.error('❌ Erreur initialisation PlaylistService:', error);
    }
  }

  // 🆕 Support pour injection de dépendances (DI)
  // Cette méthode permet d'utiliser le service via DI ou singleton legacy
  public static getInstance(): PlaylistService {
    if (!PlaylistService.instance) {
      PlaylistService.instance = new PlaylistService();
    }
    return PlaylistService.instance;
  }

  // 🆕 Méthode statique pour compatibilité DI
  // Sera utilisée par le ServiceRegistry
  public static async createFromDI(): Promise<PlaylistService> {
    try {
      // Pour le moment, retourne une nouvelle instance
      // Plus tard, on pourra injecter des dépendances si nécessaire
      return new PlaylistService();
    } catch (error) {
      console.error('❌ Failed to create PlaylistService from DI:', error);
      // Fallback sur l'ancienne méthode
      return PlaylistService.getInstance();
    }
  }

  // ❌ REMOVED: setLoadingCallbacks - Couplage UI supprimé
  // Le service ne gère plus l'UI - c'est le rôle du hook

  /**
   * 🔄 MIGRATION: Migrer playlist AsyncStorage → WatermelonDB
   * Convertit une playlist existante du format Legacy vers WatermelonDB
   */
  async migratePlaylistToWatermelon(
    playlistId: string,
    onProgress?: (progress: number, message: string) => void,
  ): Promise<string> {
    try {
      console.log(`🔄 Migration playlist ${playlistId} vers WatermelonDB...`);
      onProgress?.(5, 'Chargement playlist depuis AsyncStorage...');

      // 1. Charger la playlist depuis AsyncStorage
      const playlist = await this.loadPlaylistFromCache(playlistId);
      if (!playlist) {
        throw new Error(`Playlist ${playlistId} non trouvée dans AsyncStorage`);
      }

      console.log(
        `📋 Playlist chargée: ${playlist.name} (${
          playlist.channels?.length || 0
        } chaînes)`,
      );
      onProgress?.(
        15,
        `Préparation migration ${playlist.channels?.length || 0} chaînes...`,
      );

      // 2. Convertir en format M3U pour import
      const m3uContent = this.convertPlaylistToM3U(playlist);
      console.log(
        `✅ Conversion M3U terminée: ${m3uContent.length} caractères`,
      );

      // 3. Importer dans WatermelonDB via WatermelonM3UService
      const WatermelonM3UService = (await import('./WatermelonM3UService'))
        .default;

      const newPlaylistId = await WatermelonM3UService.importM3UPlaylist(
        m3uContent,
        playlist.name,
        playlist.url,
        (progress, message) => {
          // Mapper le progress de 15% → 90%
          const mappedProgress = 15 + Math.floor((progress / 100) * 75);
          onProgress?.(mappedProgress, message);
        },
      );

      console.log(`✅ Migration WatermelonDB terminée: ${newPlaylistId}`);
      onProgress?.(95, 'Nettoyage AsyncStorage...');

      // 4. Supprimer l'ancienne playlist d'AsyncStorage
      await AsyncStorage.removeItem(playlistId);
      await AsyncStorage.removeItem(`playlist_${playlistId}`);

      // Supprimer aussi de saved_m3u_playlists si présente
      try {
        const savedPlaylists = await AsyncStorage.getItem(
          'saved_m3u_playlists',
        );
        if (savedPlaylists) {
          const playlistsArray = JSON.parse(savedPlaylists);
          const filtered = playlistsArray.filter(
            (p: Playlist) => p.id !== playlistId,
          );
          await AsyncStorage.setItem(
            'saved_m3u_playlists',
            JSON.stringify(filtered),
          );
          console.log(
            `✅ Playlist ${playlistId} supprimée de saved_m3u_playlists`,
          );
        }
      } catch (e) {
        console.log('⚠️ saved_m3u_playlists non trouvée ou vide');
      }

      // 5. Mettre à jour la référence en mémoire
      this.playlists.delete(playlistId);

      const result = await WatermelonM3UService.getPlaylistWithChannels(
        newPlaylistId,
        100,
        0,
      );
      this.playlists.set(newPlaylistId, {
        id: newPlaylistId,
        name: result.playlist.name,
        url: result.playlist.url,
        channels: [],
        isLocal: !result.playlist.url,
        dateAdded: new Date(result.playlist.dateAdded).toISOString(),
        lastUpdated: new Date().toISOString(),
        totalChannels: result.totalChannels,
        categories: [],
        type: 'M3U',
      });

      onProgress?.(100, '✅ Migration terminée avec succès !');
      console.log(`✅ Migration complète: ${playlistId} → ${newPlaylistId}`);

      return newPlaylistId;
    } catch (error) {
      console.error('❌ Erreur migration playlist vers WatermelonDB:', error);
      throw error;
    }
  }

  /**
   * 🔄 Convertir une playlist en format M3U
   * Utilisé pour migration AsyncStorage → WatermelonDB
   */
  private convertPlaylistToM3U(playlist: Playlist): string {
    const lines: string[] = ['#EXTM3U'];

    for (const channel of playlist.channels || []) {
      // Ligne #EXTINF
      const extinf = [
        '#EXTINF:-1',
        channel.logo ? `tvg-logo="${channel.logo}"` : '',
        channel.groupTitle ? `group-title="${channel.groupTitle}"` : '',
        channel.name || 'Sans nom',
      ]
        .filter(Boolean)
        .join(' ');

      lines.push(extinf);
      lines.push(channel.url);
    }

    return lines.join('\n');
  }

  /**
   * 🚀 Ajouter une playlist avec WatermelonDB (SQLite optimisé)
   */
  async addPlaylist(
    name: string,
    content: string,
    source: string = 'manual',
    onProgress?: (progress: number, message: string) => void,
  ): Promise<string> {
    const startTime = Date.now();

    try {
      console.log(`📋 Ajout playlist: ${name} - Stockage WatermelonDB`);
      onProgress?.(5, 'Démarrage import...');

      // 🚀 Utiliser WatermelonM3UService pour import SQLite
      const WatermelonM3UService = (await import('./WatermelonM3UService'))
        .default;

      // Import avec progress callback
      const playlistId = await WatermelonM3UService.importM3UPlaylist(
        content,
        name,
        source.startsWith('http') ? source : undefined,
        onProgress,
      );

      const loadTime = Date.now() - startTime;
      console.log(
        `✅ Playlist ajoutée en WatermelonDB: ${playlistId} en ${loadTime}ms`,
      );

      // 🔄 Charger la playlist depuis WatermelonDB pour vérification
      const result = await WatermelonM3UService.getPlaylistWithChannels(
        playlistId,
        100, // Juste pour avoir les infos basiques
        0,
      );

      // Créer un objet Playlist compatible pour la mémoire (léger)
      const playlist: Playlist = {
        id: playlistId,
        name: result.playlist.name,
        url: source.startsWith('http') ? source : undefined,
        channels: [], // Pas de channels en mémoire avec WatermelonDB
        isLocal: !source.startsWith('http'),
        dateAdded: new Date(result.playlist.dateAdded).toISOString(),
        lastUpdated: new Date().toISOString(),
        totalChannels: result.totalChannels,
        categories: [], // Catégories en SQLite
        type: 'M3U',
      };

      // Stockage en mémoire (métadonnées seulement)
      this.playlists.set(playlistId, playlist);

      console.log(
        `✅ Playlist métadonnées stockées en mémoire: ${result.totalChannels} chaînes`,
      );

      return playlistId;
    } catch (error) {
      console.error('❌ Erreur ajout playlist WatermelonDB:', error);
      throw error;
    }
  }

  /**
   * 🔄 RESTAURÉE: selectPlaylist avec synchronisation PlaylistStore
   * Sélectionne une playlist et synchronise avec le store moderne pour persistance
   */
  async selectPlaylist(playlistId: string): Promise<Playlist | null> {
    try {
      console.log(`🎬 Sélection playlist: ${playlistId}`);

      let playlist = this.playlists.get(playlistId);

      // 🚀 FALLBACK : Si playlist pas en mémoire, essayer WatermelonDB d'abord
      if (!playlist) {
        console.log(
          `⚠️ Playlist ${playlistId} pas en mémoire, tentative chargement WatermelonDB...`,
        );

        try {
          // Essayer de charger depuis WatermelonDB
          const WatermelonM3UService = (await import('./WatermelonM3UService'))
            .default;
          const result = await WatermelonM3UService.getPlaylistWithChannels(
            playlistId,
            100,
            0,
          );

          if (result && result.playlist) {
            // Créer objet Playlist depuis WatermelonDB
            playlist = {
              id: playlistId,
              name: result.playlist.name,
              url: result.playlist.url,
              channels: [], // Pas de channels en mémoire avec WatermelonDB
              isLocal: !result.playlist.url,
              dateAdded: new Date(result.playlist.dateAdded).toISOString(),
              lastUpdated: new Date().toISOString(),
              totalChannels: result.totalChannels,
              categories: [],
              type: result.playlist.type as 'M3U' | 'XTREAM',
            };

            this.playlists.set(playlistId, playlist);
            console.log(
              `✅ Playlist ${playlistId} chargée depuis WatermelonDB`,
            );
          }
        } catch (watermelonError) {
          console.log('⚠️ Pas dans WatermelonDB, essai cache AsyncStorage...');
          // Fallback sur cache AsyncStorage (Legacy)
          playlist = await this.loadPlaylistFromCache(playlistId);

          if (playlist) {
            this.playlists.set(playlistId, playlist);
            console.log(
              `✅ Playlist ${playlistId} chargée depuis cache AsyncStorage`,
            );
          }
        }
      }

      if (!playlist) {
        console.error(`❌ Playlist introuvable: ${playlistId}`);
        return null;
      }

      // Définir comme playlist active
      this.currentPlaylistId = playlistId;

      // 🚀 Pour WatermelonDB, pas besoin de synchroniser PlaylistStore
      // Les données sont déjà en SQLite
      if (playlist.channels && playlist.channels.length > 0) {
        // Legacy: synchroniser avec PlaylistStore
        const {usePlaylistStore} = await import('../stores/PlaylistStore');
        const {loadPlaylist} = usePlaylistStore.getState();

        console.log('🔄 Synchronisation PlaylistStore (Legacy)...');
        loadPlaylist(playlist.source, playlist.channels, playlist.name);
        console.log('✅ PlaylistStore synchronisé');
      } else {
        console.log(
          '✅ Playlist WatermelonDB - Pas de sync PlaylistStore nécessaire',
        );
      }

      return playlist;
    } catch (error) {
      console.error('❌ Erreur sélection playlist:', error);
      return null;
    }
  }

  /**
   * Obtenir la playlist courante
   */
  getCurrentPlaylist(): Playlist | null {
    if (!this.currentPlaylistId) {
      return null;
    }
    return this.playlists.get(this.currentPlaylistId) || null;
  }

  /**
   * Obtenir toutes les playlists depuis WatermelonDB
   */
  async getAllPlaylists(): Promise<Playlist[]> {
    try {
      console.log(
        '📋 Chargement de toutes les playlists depuis WatermelonDB...',
      );

      const database = (await import('../database')).default;
      const {Playlist: PlaylistModel} = await import('../database/models');

      const watermelonPlaylists = await database
        .get<typeof PlaylistModel>('playlists')
        .query()
        .fetch();

      console.log(
        `📋 ${watermelonPlaylists.length} playlists trouvées dans WatermelonDB`,
      );

      return watermelonPlaylists.map(p => ({
        id: p.id,
        name: p.name,
        url: p.url,
        type: p.type as 'M3U' | 'XTREAM',
        channelsCount: p.channelsCount,
        createdAt: p.createdAt,
        channels: [], // Pas besoin de charger toutes les chaînes ici
      }));
    } catch (error) {
      console.error('❌ Erreur chargement playlists WatermelonDB:', error);
      // Fallback: retourner playlists en mémoire
      return Array.from(this.playlists.values());
    }
  }

  /**
   * Supprimer une playlist
   */
  async deletePlaylist(playlistId: string): Promise<boolean> {
    console.log(`🗑️ Suppression playlist: ${playlistId}`);

    const deleted = this.playlists.delete(playlistId);
    await cacheService.remove(`playlist_${playlistId}`, 'all');

    if (this.currentPlaylistId === playlistId) {
      this.currentPlaylistId = null;
    }

    console.log(`✅ Playlist supprimée: ${deleted}`);
    return deleted;
  }

  /**
   * Parser M3U - délégué au ParsersService
   */
  async parseM3U(content: string) {
    return await parsersService.parseM3U(content, {
      useUltraOptimized: true,
      chunkSize: 2000,
      yieldControl: true,
    });
  }

  /**
   * 🚀 NOUVELLE MÉTHODE : Parser M3U avec streaming pour 100K+ chaînes
   * Utilise le parser streaming TiviMate-level avec progress callbacks
   */
  async parseM3UWithStreaming(
    url: string,
    name: string,
    callbacks?: {
      onProgress?: (progress: any) => void;
      onStatusChange?: (status: string, details?: string) => void;
    },
  ) {
    console.log(`🚀🚀 PlaylistService.parseM3UWithStreaming: ${name}`);

    try {
      // 1. Télécharger le contenu M3U
      callbacks?.onStatusChange?.('Téléchargement...', `Récupération ${name}`);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const content = await response.text();
      const contentSizeMB = Math.round(content.length / 1024 / 1024);

      console.log(`📥 Downloaded ${contentSizeMB}MB M3U content`);
      callbacks?.onStatusChange?.(
        'Analyse...',
        `${contentSizeMB}MB téléchargés`,
      );

      // 2. Estimer nombre de chaînes pour sélection parser
      const estimatedChannels = (content.match(/#EXTINF:/g) || []).length;
      console.log(`📊 Estimated ${estimatedChannels} channels`);

      // 🎯 STRATÉGIE ULTRA-AGGRESSIVE : Streaming dès 1K chaînes pour fluidité maximale
      const useStreaming = estimatedChannels >= 1000; // ⬇️ Seuil ultra-bas pour vos playlists moyennes

      if (useStreaming) {
        callbacks?.onStatusChange?.(
          'Parser streaming...',
          `${estimatedChannels} chaînes détectées`,
        );
        console.log('🚀🚀 Using STREAMING parser for large playlist');
      }

      // 4. Parser avec options optimales
      const parseResult = await parsersService.parseM3U(content, {
        useStreamingParser: useStreaming,
        useUltraOptimized: !useStreaming,
        chunkSize: useStreaming ? 20000 : 5000,
        yieldControl: true,
        enableProgressCallbacks: true,
        onProgress: callbacks?.onProgress,
        onStatusChange: callbacks?.onStatusChange,
        streamingOptions: {
          maxMemoryMB: 200,
          yieldInterval: 8000,
          enableSQLiteStream: false, // Pour l'instant
        },
      });

      console.log(
        `🎉 parseM3UWithStreaming completed: ${parseResult.channels.length} channels`,
      );
      return parseResult;
    } catch (error) {
      console.error('❌ parseM3UWithStreaming error:', error);
      throw error;
    }
  }

  /**
   * Cache intelligent selon taille - Migration logique web
   */
  private async cachePlaylist(
    playlistId: string,
    playlist: Playlist,
  ): Promise<void> {
    const dataSize = this.estimatePlaylistSize(playlist);
    const cacheKey = `playlist_${playlistId}`;

    console.log(`💾 Cache playlist ${playlist.name}: ${dataSize}KB`);

    // Stratégie cache selon taille (logique identique au web)
    if (dataSize > 2048) {
      // >2MB → L3 uniquement
      await cacheService.set(cacheKey, playlist, 'L3');
    } else if (dataSize > 512) {
      // >512KB → L2+L3
      await cacheService.set(cacheKey, playlist, 'L2');
      await cacheService.set(cacheKey, playlist, 'L3');
    } else {
      // <512KB → Tous niveaux
      await cacheService.set(cacheKey, playlist, 'all');
    }
  }

  /**
   * Charger playlist depuis cache multi-niveaux
   */
  private async loadPlaylistFromCache(
    playlistId: string,
  ): Promise<Playlist | null> {
    const cacheKey = `playlist_${playlistId}`;

    try {
      // Essayer cascade L1 → L2 → L3 (stratégie identique au web)
      const playlist = await cacheService.get<Playlist>(cacheKey, 'all');
      if (playlist) {
        console.log('📦 Playlist chargée depuis cache multi-niveaux');
        return playlist;
      }

      // 🚀 FALLBACK CRITIQUE : Essayer AsyncStorage directement
      console.log(
        `📦 Tentative chargement direct AsyncStorage pour: ${playlistId}`,
      );
      const playlistData = await AsyncStorage.getItem(cacheKey);

      if (playlistData) {
        const parsedPlaylist = JSON.parse(playlistData) as Playlist;
        console.log(
          `✅ Playlist ${playlistId} chargée depuis AsyncStorage direct:`,
          {
            name: parsedPlaylist.name,
            channels: parsedPlaylist.channels?.length || 0,
          },
        );
        return parsedPlaylist;
      }

      console.log(`❌ Playlist ${playlistId} introuvable dans tous les caches`);
      return null;
    } catch (error) {
      console.error(
        `❌ Erreur chargement cache playlist ${playlistId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Estimer taille playlist en KB
   */
  private estimatePlaylistSize(playlist: Playlist): number {
    const jsonStr = JSON.stringify(playlist);
    return Math.round(jsonStr.length / 1024);
  }

  /**
   * Extraire catégories uniques des chaînes
   */
  private extractCategories(channels: Channel[]): string[] {
    const categories = new Set<string>();
    channels.forEach(channel => {
      if (channel.group) {
        categories.add(channel.group);
      }
      if (channel.category) {
        categories.add(channel.category);
      }
    });
    return Array.from(categories).sort();
  }

  /**
   * Rechercher dans les chaînes
   */
  searchChannels(channels: Channel[], query: string): Channel[] {
    const lowerQuery = query.toLowerCase();
    return channels.filter(
      channel =>
        channel.name.toLowerCase().includes(lowerQuery) ||
        (channel.category &&
          channel.category.toLowerCase().includes(lowerQuery)) ||
        (channel.group && channel.group.toLowerCase().includes(lowerQuery)),
    );
  }

  /**
   * Grouper chaînes par catégorie
   */
  getChannelsByCategory(channels: Channel[]): {[key: string]: Channel[]} {
    const grouped: {[key: string]: Channel[]} = {};

    channels.forEach(channel => {
      const category = channel.category || 'Autres';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(channel);
    });

    return grouped;
  }

  /**
   * Obtenir statistiques playlists
   */
  getStats() {
    const totalPlaylists = this.playlists.size;
    const totalChannels = Array.from(this.playlists.values()).reduce(
      (sum, playlist) => sum + (playlist.totalChannels || 0),
      0,
    );

    return {
      totalPlaylists,
      totalChannels,
      currentPlaylistId: this.currentPlaylistId,
      memoryUsage: this.playlists.size * 0.5, // Estimation MB
      cacheStats: cacheService.getStats(),
      parserStats: parsersService.getStats(),
    };
  }

  /**
   * Nettoyer ressources
   */
  dispose(): void {
    this.playlists.clear();
    this.currentPlaylistId = null;
    console.log('🧹 PlaylistService disposed');
  }
}

// Export singleton instance
export const playlistService = new PlaylistService();
