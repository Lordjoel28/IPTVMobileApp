/**
 * 📋 PlaylistManager - React Native Migration
 * Gestionnaire playlist intelligent avec cascade parsers et cache multi-niveaux
 * Migration DIRECTE de l'architecture web ultra-optimisée
 */

import UltraOptimizedM3UParser, { Channel, ParseResult, ParseStats } from '../parsers/UltraOptimizedM3UParser';
import StorageAdapter from '../../storage/StorageAdapter';
import { networkService, NetworkError } from '../NetworkService';

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
      
      // 🛡️ CACHE ROBUSTE avec validation selon best practices GitHub/Reddit
      const cacheKey = `playlist_url_${btoa(url)}`;
      if (options.enableCache !== false) {
        const cachedResult = await this.getCachedPlaylistSafely(cacheKey);
        if (cachedResult) {
          console.log('⚡ Using validated cached playlist data');
          this.stats.cacheHitRate = this.updateHitRate(this.stats.cacheHitRate, true);
          return this.createImportResult(cachedResult.playlist, [], warnings, errors);
        }
        this.stats.cacheHitRate = this.updateHitRate(this.stats.cacheHitRate, false);
      }

      // 🚀 Fetch robuste avec NetworkService
      let content: string;
      try {
        content = await networkService.fetchText(url, {
          timeout: options.largePlaylist ? 60000 : 30000,
          retryAttempts: 3
        });
      } catch (error) {
        if (error instanceof NetworkError) {
          console.error(`❌ Network error: ${error.type} - ${error.getUserMessage()}`);
          throw new Error(error.getUserMessage());
        }
        throw error;
      }
      
      // Vérification du contenu téléchargé
      if (!content || typeof content !== 'string') {
        console.error('❌ Downloaded content is empty or invalid');
        throw new Error('Le contenu de la playlist est vide ou invalide');
      }
      
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
      
      // 💾 CACHE SÉCURISÉ selon best practices GitHub/Reddit
      if (options.enableCache !== false) {
        await this.cachePlaylistSafely(cacheKey, playlist);
      }

      // Mettre à jour stats
      this.updateStats(Date.now() - startTime);

      console.log(`✅ Playlist imported: ${channels.length} channels in ${Date.now() - startTime}ms`);
      
      return this.createImportResult(playlist, parseResult.stats, warnings, errors);

    } catch (error) {
      // 🧹 AUTO-NETTOYAGE cache corrompu si erreur de parsing
      if (error.message && error.message.includes('length of undefined')) {
        console.warn('🧹 Auto-cleaning corrupted cache due to parsing error');
        const cacheKey = `playlist_url_${btoa(url)}`;
        await this.storage.delete(cacheKey);
      }
      
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
      
      // Import du service Xtream modernisé
      const { WatermelonXtreamService } = await import('../WatermelonXtreamService');
      const xtreamManager = new WatermelonXtreamService();
      
      // Configuration et authentification
      await xtreamManager.loadConfig();
      xtreamManager.setCredentials(credentials.url || credentials.server, credentials.username, credentials.password);
      
      // Authentification
      await xtreamManager.authenticate();
      
      // Récupération des chaînes
      const channels = await xtreamManager.fetchChannelsExtreme();
      
      if (!channels || channels.length === 0) {
        throw new Error('Aucune chaîne trouvée dans cette playlist Xtream');
      }
      
      // Conversion au format standard de playlist
      const playlistData = xtreamManager.exportToPlaylistFormat();
      
      // Création de la playlist
      const playlistId = `xtream_${Date.now()}`;
      const playlist: Playlist = {
        id: playlistId,
        name: name,
        type: 'xtream',
        channels: playlistData,
        totalChannels: playlistData.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: credentials.url || credentials.server,
        metadata: {
          username: credentials.username,
          server: credentials.url || credentials.server,
          accountInfo: xtreamManager.accountInfo
        }
      };
      
      // Sauvegarder la playlist
      await this.savePlaylist(playlist);
      
      console.log(`✅ Playlist Xtream importée: ${playlist.totalChannels} chaînes`);
      
      return {
        success: true,
        playlist: playlist,
        stats: {
          totalChannels: playlist.totalChannels,
          validChannels: playlist.totalChannels,
          invalidChannels: 0,
          duplicates: 0,
          categories: new Set(playlist.channels.map(c => c.group)).size,
          duration: 0 // TODO: calculer temps de traitement
        }
      };
      
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
   * 🛡️ CACHE ROBUSTE - Récupération sécurisée selon GitHub/Reddit best practices
   */
  private async getCachedPlaylistSafely(cacheKey: string): Promise<{playlist: Playlist} | null> {
    try {
      // Étape 1: Récupération avec try-catch
      const cachedData = await this.storage.get(cacheKey);
      
      // Étape 2: Validation null/undefined (GitHub pattern)
      if (cachedData == null) {
        return null;
      }
      
      // Étape 3: Validation structure de base
      if (!cachedData || typeof cachedData !== 'object') {
        console.warn('🗑️ Invalid cache data format, clearing');
        await this.storage.delete(cacheKey);
        return null;
      }
      
      // Étape 4: Validation métadonnées (version + timestamp)
      if (!cachedData.version || !cachedData.timestamp) {
        console.warn('🗑️ Cache missing metadata, clearing');
        await this.storage.delete(cacheKey);
        return null;
      }
      
      // Étape 5: Validation âge du cache (24h max selon Reddit)
      const maxAge = 24 * 60 * 60 * 1000; // 24 heures
      const isRecent = Date.now() - cachedData.timestamp < maxAge;
      if (!isRecent) {
        console.log('🗑️ Cache expired, clearing');
        await this.storage.delete(cacheKey);
        return null;
      }
      
      // Étape 6: Validation structure playlist
      const playlist = cachedData.playlist;
      if (!playlist || typeof playlist !== 'object') {
        console.warn('🗑️ Cache missing playlist object, clearing');
        await this.storage.delete(cacheKey);
        return null;
      }
      
      // Étape 7: Validation propriétés playlist critiques
      if (!playlist.id || !playlist.name || !Array.isArray(playlist.channels)) {
        console.warn('🗑️ Cache corrupted playlist structure, clearing');
        await this.storage.delete(cacheKey);
        return null;
      }
      
      // Étape 8: Validation channels array (défense vs .length undefined)
      if (playlist.channels.length === undefined) {
        console.warn('🗑️ Cache channels array corrupted, clearing');
        await this.storage.delete(cacheKey);
        return null;
      }
      
      console.log(`🔍 Cache validation OK: ${playlist.channels.length} channels`);
      return { playlist };
      
    } catch (error) {
      // Étape 9: Auto-cleanup en cas d'erreur (GitHub pattern)
      console.error('🗑️ Cache error, auto-cleaning:', error.message);
      await this.storage.delete(cacheKey);
      return null;
    }
  }

  /**
   * 💾 CACHE SÉCURISÉ - Sauvegarde robuste selon GitHub/Reddit best practices  
   */
  private async cachePlaylistSafely(cacheKey: string, playlist: Playlist): Promise<void> {
    try {
      // Validation avant sauvegarde (défensive)
      if (!playlist || typeof playlist !== 'object') {
        throw new Error('Invalid playlist data for caching');
      }
      
      if (!Array.isArray(playlist.channels)) {
        throw new Error('Invalid playlist channels for caching');
      }
      
      // Création entry avec metadata (GitHub pattern)
      const cacheEntry = {
        version: '1.0', // Pour migration future
        timestamp: Date.now(),
        playlist: {
          ...playlist,
          // Assurer que les propriétés critiques existent
          id: playlist.id || `fallback_${Date.now()}`,
          name: playlist.name || 'Unknown Playlist',
          channels: playlist.channels || []
        }
      };
      
      await this.storage.set(cacheKey, cacheEntry);
      console.log(`💾 Cached playlist safely: ${playlist.channels.length} channels`);
      
    } catch (error) {
      console.error('💾 Error caching playlist:', error.message);
      // Ne pas rethrow - cache failing ne doit pas casser l'import
    }
  }

  /**
   * 🔍 VALIDATION ROBUSTE des données cachées (legacy - remplacée par getCachedPlaylistSafely)
   */
  private validateCachedPlaylist(cached: any): boolean {
    try {
      // Vérifier structure de base
      if (!cached || !cached.playlist || !cached.timestamp) {
        console.warn('🔍 Cache validation: Missing basic structure');
        return false;
      }

      const playlist = cached.playlist;
      
      // Vérifier propriétés playlist obligatoires
      if (!playlist.id || !playlist.name || !Array.isArray(playlist.channels)) {
        console.warn('🔍 Cache validation: Invalid playlist structure');
        return false;
      }

      // Vérifier chaque chaîne dans le cache
      const invalidChannels = playlist.channels.some((channel: any, index: number) => {
        if (!channel || typeof channel !== 'object') {
          console.warn(`🔍 Cache validation: Channel ${index} is not an object`);
          return true;
        }

        // Propriétés obligatoires
        if (!channel.name || typeof channel.name !== 'string') {
          console.warn(`🔍 Cache validation: Channel ${index} missing valid name`);
          return true;
        }

        if (!channel.url || typeof channel.url !== 'string') {
          console.warn(`🔍 Cache validation: Channel ${index} missing valid URL`);
          return true;
        }

        if (!channel.id || typeof channel.id !== 'string') {
          console.warn(`🔍 Cache validation: Channel ${index} missing valid ID`);
          return true;
        }

        return false; // Channel valide
      });

      if (invalidChannels) {
        console.warn('🔍 Cache validation: Found invalid channels');
        return false;
      }

      console.log(`🔍 Cache validation: OK - ${playlist.channels.length} channels validated`);
      return true;

    } catch (error) {
      console.warn('🔍 Cache validation error:', error.message);
      return false;
    }
  }

  /**
   * 🛠️ SÉRIALISATION SÉCURISÉE des chaînes pour cache
   */
  private cleanChannelForStorage(channel: Channel): Channel {
    return {
      id: channel.id || `unknown_${Date.now()}`,
      name: channel.name || 'Unknown Channel',
      url: channel.url || '',
      logo: channel.logo || '',
      category: channel.category || '',
      quality: channel.quality || 'SD',
      language: channel.language || '',
      country: channel.country || '',
      tvgId: channel.tvgId || '',
      groupTitle: channel.groupTitle || ''
    };
  }

  /**
   * 🛠️ DÉSÉRIALISATION SÉCURISÉE des chaînes depuis cache
   */
  private restoreChannelFromStorage(data: any): Channel {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid channel data from storage');
    }

    return {
      id: String(data.id || ''),
      name: String(data.name || ''),
      url: String(data.url || ''),
      logo: String(data.logo || ''),
      category: String(data.category || ''),
      quality: String(data.quality || 'SD'),
      language: String(data.language || ''),
      country: String(data.country || ''),
      tvgId: String(data.tvgId || ''),
      groupTitle: String(data.groupTitle || '')
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