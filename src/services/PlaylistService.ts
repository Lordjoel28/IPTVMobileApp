/**
 * 📋 PlaylistService - Migration du PlaylistManager web
 * Gestion des playlists M3U/M3U8 avec cache intelligent multi-niveaux
 */

import { cacheService } from './CacheService';
import { parsersService } from './ParsersService';
import type { Playlist, Channel } from '../types';

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
   * Ajouter une playlist avec cache automatique - Migration directe web
   */
  async addPlaylist(name: string, content: string, source: string = 'manual'): Promise<string> {
    const startTime = Date.now();
    
    try {
      console.log(`📋 Ajout playlist: ${name}`);
      
      // Parser M3U avec sélection automatique du parser optimal
      const parseResult = await parsersService.parseM3U(content, {
        useUltraOptimized: true,
        chunkSize: 25000,
        yieldControl: true
      });

      const playlistId = `playlist_${Date.now()}`;
      
      const playlist: Playlist = {
        id: playlistId,
        name,
        url: source.startsWith('http') ? source : undefined,
        channels: parseResult.channels,
        isLocal: !source.startsWith('http'),
        dateAdded: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        totalChannels: parseResult.channels.length,
        categories: this.extractCategories(parseResult.channels),
        type: 'M3U'
      };

      // Stockage en mémoire
      this.playlists.set(playlistId, playlist);

      // Cache intelligent selon taille
      await this.cachePlaylist(playlistId, playlist);

      const loadTime = Date.now() - startTime;
      console.log(`✅ Playlist ajoutée: ${playlist.totalChannels} chaînes en ${loadTime}ms`);
      console.log(`📊 Performance: ${parseResult.stats.channelsPerSecond} ch/s, efficacité pool: ${parseResult.stats.poolEfficiency}%`);
      
      return playlistId;
    } catch (error) {
      console.error('❌ Erreur ajout playlist:', error);
      throw error;
    }
  }

  // ❌ REMOVED: selectPlaylist - Couplage UI supprimé
  // Cette méthode contenait de la logique UI (animations) qui n'a pas sa place dans un service

  /**
   * Obtenir la playlist courante
   */
  getCurrentPlaylist(): Playlist | null {
    if (!this.currentPlaylistId) return null;
    return this.playlists.get(this.currentPlaylistId) || null;
  }

  /**
   * Obtenir toutes les playlists
   */
  getAllPlaylists(): Playlist[] {
    return Array.from(this.playlists.values());
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
      yieldControl: true
    });
  }

  /**
   * Cache intelligent selon taille - Migration logique web
   */
  private async cachePlaylist(playlistId: string, playlist: Playlist): Promise<void> {
    const dataSize = this.estimatePlaylistSize(playlist);
    const cacheKey = `playlist_${playlistId}`;
    
    console.log(`💾 Cache playlist ${playlist.name}: ${dataSize}KB`);

    // Stratégie cache selon taille (logique identique au web)
    if (dataSize > 2048) { // >2MB → L3 uniquement
      await cacheService.set(cacheKey, playlist, 'L3');
    } else if (dataSize > 512) { // >512KB → L2+L3
      await cacheService.set(cacheKey, playlist, 'L2');
      await cacheService.set(cacheKey, playlist, 'L3');
    } else { // <512KB → Tous niveaux
      await cacheService.set(cacheKey, playlist, 'all');
    }
  }

  /**
   * Charger playlist depuis cache multi-niveaux
   */
  private async loadPlaylistFromCache(playlistId: string): Promise<Playlist | null> {
    const cacheKey = `playlist_${playlistId}`;
    
    // Essayer cascade L1 → L2 → L3 (stratégie identique au web)
    const playlist = await cacheService.get<Playlist>(cacheKey, 'all');
    if (playlist) {
      console.log(`📦 Playlist chargée depuis cache`);
      return playlist;
    }
    
    return null;
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
      if (channel.group) categories.add(channel.group);
      if (channel.category) categories.add(channel.category);
    });
    return Array.from(categories).sort();
  }

  /**
   * Rechercher dans les chaînes
   */
  searchChannels(channels: Channel[], query: string): Channel[] {
    const lowerQuery = query.toLowerCase();
    return channels.filter(channel =>
      channel.name.toLowerCase().includes(lowerQuery) ||
      (channel.category && channel.category.toLowerCase().includes(lowerQuery)) ||
      (channel.group && channel.group.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Grouper chaînes par catégorie
   */
  getChannelsByCategory(channels: Channel[]): { [key: string]: Channel[] } {
    const grouped: { [key: string]: Channel[] } = {};
    
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
    const totalChannels = Array.from(this.playlists.values())
      .reduce((sum, playlist) => sum + (playlist.totalChannels || 0), 0);
    
    return {
      totalPlaylists,
      totalChannels,
      currentPlaylistId: this.currentPlaylistId,
      memoryUsage: this.playlists.size * 0.5, // Estimation MB
      cacheStats: cacheService.getStats(),
      parserStats: parsersService.getStats()
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