/**
 * 📋 PlaylistManager - React Native Migration
 * Gestionnaire playlist intelligent avec cascade parsers et cache multi-niveaux
 * Migration DIRECTE de l'architecture web ultra-optimisée
 */

import UltraOptimizedM3UParser, { Channel, ParseResult, ParseStats } from '../parsers/UltraOptimizedM3UParser';
import StorageAdapter from '../../storage/StorageAdapter';

export interface Playlist {
  id: string;
  name: string;
  source: string;
  type: 'url' | 'file' | 'xtream';
  channels: Channel[];
  totalChannels: number;
  dateAdded: string;
  lastUpdated: string;
  isLocal: boolean;
  metadata?: PlaylistMetadata;
}

export interface PlaylistMetadata {
  title?: string;
  description?: string;
  country?: string;
  language?: string;
  categories?: string[];
  provider?: string;
  version?: string;
}

export interface ImportOptions {
  validateUrls?: boolean;
  chunkSize?: number;
  maxChannels?: number;
  enableCache?: boolean;
  parserMode?: 'ultra' | 'optimized' | 'traditional';
}

export interface ImportResult {
  playlist: Playlist;
  stats: ParseStats;
  warnings: string[];
  errors: string[];
}

export interface PlaylistStats {
  totalPlaylists: number;
  totalChannels: number;
  cacheHitRate: number;
  averageParseTime: number;
  storageUsageMB: number;
  lastImportTime: number;
}

/**
 * Gestionnaire cascade de parsers
 */
class ParserCascade {
  private ultraParser: UltraOptimizedM3UParser;
  private currentMode: 'ultra' | 'optimized' | 'traditional' = 'ultra';

  constructor() {
    this.ultraParser = new UltraOptimizedM3UParser();
  }

  async parse(content: string, options: ImportOptions): Promise<ParseResult> {
    const mode = options.parserMode || this.currentMode;
    
    try {
      switch (mode) {
        case 'ultra':
          console.log('🚀 Using UltraOptimizedParser');
          return await this.ultraParser.parse(content, options.chunkSize);
          
        case 'optimized':
          console.log('⚡ Using OptimizedParser (fallback)');
          // TODO: Implémenter OptimizedParser si nécessaire
          return await this.ultraParser.parse(content, options.chunkSize);
          
        case 'traditional':
          console.log('📜 Using TraditionalParser (legacy)');
          // TODO: Implémenter TraditionalParser si nécessaire
          return await this.ultraParser.parse(content, options.chunkSize);
          
        default:
          return await this.ultraParser.parse(content, options.chunkSize);
      }
    } catch (error) {
      console.error(`Parser ${mode} failed:`, error);
      
      // Auto-fallback vers parser plus simple
      if (mode === 'ultra') {
        console.log('↩️ Falling back to optimized parser');
        return await this.parse(content, { ...options, parserMode: 'optimized' });
      } else if (mode === 'optimized') {
        console.log('↩️ Falling back to traditional parser');
        return await this.parse(content, { ...options, parserMode: 'traditional' });
      }
      
      throw error;
    }
  }

  cleanup(): void {
    this.ultraParser.cleanup();
  }

  getStats(): ParseStats {
    return this.ultraParser.getStats();
  }
}

export class PlaylistManager {
  private storage: StorageAdapter;
  private parserCascade: ParserCascade;
  private playlists: Map<string, Playlist> = new Map();
  private stats: PlaylistStats;
  private isInitialized = false;

  constructor(storageConfig?: any) {
    this.storage = new StorageAdapter(storageConfig);
    this.parserCascade = new ParserCascade();
    this.resetStats();
  }

  /**
   * Initialisation avec chargement playlists sauvegardées
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔄 Initializing PlaylistManager...');
      
      // Charger playlists depuis storage
      const savedPlaylists = await this.storage.get('playlists_index');
      if (savedPlaylists && Array.isArray(savedPlaylists)) {
        console.log(`📂 Loading ${savedPlaylists.length} saved playlists`);
        
        for (const playlistId of savedPlaylists) {
          const playlist = await this.storage.get(`playlist_${playlistId}`);
          if (playlist) {
            this.playlists.set(playlistId, playlist);
            this.stats.totalPlaylists++;
            this.stats.totalChannels += playlist.totalChannels;
          }
        }
      }

      // Charger stats sauvegardées
      const savedStats = await this.storage.get('playlist_stats');
      if (savedStats) {
        this.stats = { ...this.stats, ...savedStats };
      }

      this.isInitialized = true;
      console.log('✅ PlaylistManager initialized:', this.getStats());
      
    } catch (error) {
      console.error('❌ PlaylistManager initialization failed:', error);
      this.isInitialized = true; // Continue même si chargement échoue
    }
  }

  /**
   * Import playlist depuis URL
   */
  async importFromUrl(url: string, name: string, options: ImportOptions = {}): Promise<ImportResult> {
    await this.initialize();
    
    const startTime = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      console.log(`🌐 Importing playlist from URL: ${url}`);
      
      // Vérifier cache d'abord
      const cacheKey = `playlist_url_${btoa(url)}`;
      if (options.enableCache !== false) {
        const cached = await this.storage.get(cacheKey);
        if (cached && this.isCacheValid(cached, 1)) { // 1 heure de cache
          console.log('⚡ Using cached playlist data');
          this.stats.cacheHitRate = this.updateHitRate(this.stats.cacheHitRate, true);
          return this.createImportResult(cached, [], warnings, errors);
        }
      }
      
      this.stats.cacheHitRate = this.updateHitRate(this.stats.cacheHitRate, false);

      // Fetch contenu M3U
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'IPTV-Player/1.0',
          'Accept': 'application/vnd.apple.mpegurl,application/x-mpegurl,text/plain,*/*'
        },
        timeout: 30000
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const content = await response.text();
      const contentSize = new Blob([content]).size;
      console.log(`📥 Downloaded ${Math.round(contentSize / 1024)}KB of M3U content`);

      // Parse avec cascade
      const parseResult = await this.parserCascade.parse(content, options);
      
      // Validation et filtrage
      let channels = parseResult.channels;
      
      if (options.validateUrls) {
        console.log('🔍 Validating channel URLs...');
        // TODO: Implémenter validation URLs en batch
        warnings.push('URL validation not implemented yet');
      }

      if (options.maxChannels && channels.length > options.maxChannels) {
        console.log(`✂️ Truncating to ${options.maxChannels} channels`);
        channels = channels.slice(0, options.maxChannels);
        warnings.push(`Playlist truncated to ${options.maxChannels} channels`);
      }

      // Créer playlist
      const playlist: Playlist = {
        id: this.generatePlaylistId(),
        name,
        source: url,
        type: 'url',
        channels,
        totalChannels: channels.length,
        dateAdded: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        isLocal: false,
        metadata: this.extractMetadata(content)
      };

      // Sauvegarder avec cache intelligent
      await this.savePlaylist(playlist);
      
      // Cache le contenu pour réimport rapide
      if (options.enableCache !== false) {
        await this.storage.set(cacheKey, {
          playlist,
          timestamp: Date.now()
        });
      }

      // Mettre à jour stats
      this.updateStats(Date.now() - startTime);

      console.log(`✅ Playlist imported: ${channels.length} channels in ${Date.now() - startTime}ms`);
      
      return this.createImportResult(playlist, parseResult.stats, warnings, errors);

    } catch (error) {
      errors.push(error.message || 'Unknown import error');
      console.error('❌ Playlist import failed:', error);
      
      throw new Error(`Playlist import failed: ${error.message}`);
    }
  }

  /**
   * Import playlist depuis fichier local
   */
  async importFromFile(filePath: string, name: string, options: ImportOptions = {}): Promise<ImportResult> {
    await this.initialize();
    
    try {
      console.log(`📁 Importing playlist from file: ${filePath}`);
      
      // TODO: Implémenter lecture fichier avec react-native-fs
      // const content = await RNFS.readFile(filePath, 'utf8');
      
      // Pour le moment, simuler avec erreur explicite
      throw new Error('File import not implemented yet - requires react-native-fs');
      
    } catch (error) {
      console.error('❌ File import failed:', error);
      throw error;
    }
  }

  /**
   * Import Xtream Codes
   */
  async importFromXtream(credentials: any, name: string, options: ImportOptions = {}): Promise<ImportResult> {
    await this.initialize();
    
    try {
      console.log('🔐 Importing from Xtream Codes API');
      
      // TODO: Implémenter support complet Xtream Codes
      throw new Error('Xtream Codes import not implemented yet');
      
    } catch (error) {
      console.error('❌ Xtream import failed:', error);
      throw error;
    }
  }

  /**
   * Obtenir playlist par ID
   */
  async getPlaylist(id: string): Promise<Playlist | null> {
    await this.initialize();
    
    const playlist = this.playlists.get(id);
    if (playlist) {
      return { ...playlist }; // Clone pour éviter mutations
    }
    
    // Essayer de charger depuis storage si pas en mémoire
    const stored = await this.storage.get(`playlist_${id}`);
    if (stored) {
      this.playlists.set(id, stored);
      return { ...stored };
    }
    
    return null;
  }

  /**
   * Liste toutes les playlists
   */
  async getAllPlaylists(): Promise<Playlist[]> {
    await this.initialize();
    
    return Array.from(this.playlists.values()).map(p => ({ ...p }));
  }

  /**
   * Supprimer playlist
   */
  async deletePlaylist(id: string): Promise<boolean> {
    await this.initialize();
    
    try {
      // Supprimer de la mémoire
      const deleted = this.playlists.delete(id);
      
      if (deleted) {
        // Supprimer du storage
        await this.storage.delete(`playlist_${id}`);
        
        // Mettre à jour index
        await this.updatePlaylistIndex();
        
        console.log(`🗑️ Playlist ${id} deleted`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Playlist deletion failed:', error);
      return false;
    }
  }

  /**
   * Rafraîchir playlist (re-import)
   */
  async refreshPlaylist(id: string, options: ImportOptions = {}): Promise<ImportResult> {
    const playlist = await this.getPlaylist(id);
    if (!playlist) {
      throw new Error(`Playlist ${id} not found`);
    }

    console.log(`🔄 Refreshing playlist: ${playlist.name}`);
    
    if (playlist.type === 'url') {
      // Supprimer cache pour forcer re-téléchargement
      const cacheKey = `playlist_url_${btoa(playlist.source)}`;
      await this.storage.delete(cacheKey);
      
      // Re-importer
      await this.deletePlaylist(id);
      return await this.importFromUrl(playlist.source, playlist.name, options);
    }
    
    throw new Error(`Refresh not supported for playlist type: ${playlist.type}`);
  }

  /**
   * Recherche dans toutes les playlists
   */
  async searchChannels(query: string, playlistIds?: string[]): Promise<Channel[]> {
    await this.initialize();
    
    const results: Channel[] = [];
    const searchPlaylists = playlistIds ? 
      playlistIds.map(id => this.playlists.get(id)).filter(Boolean) :
      Array.from(this.playlists.values());

    const normalizedQuery = query.toLowerCase().trim();
    
    for (const playlist of searchPlaylists) {
      for (const channel of playlist!.channels) {
        if (
          channel.name.toLowerCase().includes(normalizedQuery) ||
          channel.category?.toLowerCase().includes(normalizedQuery) ||
          channel.groupTitle?.toLowerCase().includes(normalizedQuery)
        ) {
          results.push({ ...channel, playlistId: playlist!.id } as Channel & { playlistId: string });
        }
      }
    }
    
    return results;
  }

  /**
   * Statistiques générales
   */
  getStats(): PlaylistStats {
    return { ...this.stats };
  }

  /**
   * HELPERS PRIVÉS
   */

  private async savePlaylist(playlist: Playlist): Promise<void> {
    // Sauver playlist
    await this.storage.set(`playlist_${playlist.id}`, playlist);
    
    // Ajouter à la mémoire
    this.playlists.set(playlist.id, playlist);
    
    // Mettre à jour index
    await this.updatePlaylistIndex();
    
    this.stats.totalPlaylists = this.playlists.size;
    this.stats.totalChannels = Array.from(this.playlists.values())
      .reduce((total, p) => total + p.totalChannels, 0);
  }

  private async updatePlaylistIndex(): Promise<void> {
    const playlistIds = Array.from(this.playlists.keys());
    await this.storage.set('playlists_index', playlistIds);
  }

  private generatePlaylistId(): string {
    return `playlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractMetadata(content: string): PlaylistMetadata {
    const metadata: PlaylistMetadata = {};
    
    // Extraire titre depuis première ligne
    const firstLine = content.split('\n')[0];
    if (firstLine.startsWith('#EXTM3U')) {
      const titleMatch = firstLine.match(/title="([^"]+)"/i);
      if (titleMatch) {
        metadata.title = titleMatch[1];
      }
    }
    
    // TODO: Extraire plus de métadonnées si nécessaire
    
    return metadata;
  }

  private isCacheValid(cached: any, maxAgeHours: number): boolean {
    if (!cached.timestamp) return false;
    
    const ageHours = (Date.now() - cached.timestamp) / (1000 * 60 * 60);
    return ageHours < maxAgeHours;
  }

  private createImportResult(
    playlist: Playlist, 
    stats: ParseStats | any,
    warnings: string[], 
    errors: string[]
  ): ImportResult {
    return {
      playlist,
      stats: stats || this.parserCascade.getStats(),
      warnings,
      errors
    };
  }

  private updateStats(parseTime: number): void {
    this.stats.averageParseTime = this.stats.averageParseTime * 0.9 + parseTime * 0.1;
    this.stats.lastImportTime = Date.now();
    this.stats.storageUsageMB = this.storage.getStats().memoryUsageMB;
  }

  private updateHitRate(currentRate: number, hit: boolean): number {
    const alpha = 0.1;
    return currentRate * (1 - alpha) + (hit ? 1 : 0) * alpha;
  }

  private resetStats(): void {
    this.stats = {
      totalPlaylists: 0,
      totalChannels: 0,
      cacheHitRate: 0,
      averageParseTime: 0,
      storageUsageMB: 0,
      lastImportTime: 0
    };
  }

  /**
   * Nettoyage ressources
   */
  async cleanup(): Promise<void> {
    this.parserCascade.cleanup();
    await this.storage.cleanup();
    this.playlists.clear();
    this.resetStats();
    this.isInitialized = false;
  }

  /**
   * Export playlist au format M3U
   */
  async exportToM3U(playlistId: string): Promise<string> {
    const playlist = await this.getPlaylist(playlistId);
    if (!playlist) {
      throw new Error(`Playlist ${playlistId} not found`);
    }

    let m3uContent = '#EXTM3U\n';
    
    for (const channel of playlist.channels) {
      let extinf = `#EXTINF:-1`;
      
      if (channel.tvgId) extinf += ` tvg-id="${channel.tvgId}"`;
      if (channel.logo) extinf += ` tvg-logo="${channel.logo}"`;
      if (channel.groupTitle) extinf += ` group-title="${channel.groupTitle}"`;
      if (channel.language) extinf += ` tvg-language="${channel.language}"`;
      if (channel.country) extinf += ` tvg-country="${channel.country}"`;
      
      extinf += `,${channel.name}\n`;
      
      m3uContent += extinf;
      m3uContent += `${channel.url}\n`;
    }
    
    return m3uContent;
  }
}

export default PlaylistManager;