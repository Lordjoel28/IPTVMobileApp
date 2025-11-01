/**
 * 🎬 IPTVService - Service Principal d'Orchestration
 * Orchestrateur central de tous les services IPTV
 * Architecture singleton avec injection de dépendances
 */

import PlaylistManager, {
  Playlist,
  ImportResult,
  ImportOptions,
} from './playlist/PlaylistManager';
import SearchManager, {
  SearchOptions,
  SearchResult,
} from './search/SearchManager';
import UserManager, {User, AuthResult} from './users/UserManager';
import StorageAdapter from '../storage/StorageAdapter';
import {Channel} from './parsers/UltraOptimizedM3UParser';

export interface IPTVServiceConfig {
  enableParentalControl: boolean;
  enableUserManagement: boolean;
  enableAdvancedSearch: boolean;
  enablePerformanceMonitoring: boolean;
  storage?: {
    enableL1Cache: boolean;
    enableL2MMKV: boolean;
    enableL3SQLite: boolean;
    maxCacheSizeMB: number;
  };
}

export interface ServiceStats {
  initialization: {
    startTime: number;
    initTime: number;
    isReady: boolean;
  };
  playlists: {
    totalPlaylists: number;
    totalChannels: number;
    cacheHitRate: number;
    averageParseTime: number;
  };
  search: {
    totalSearches: number;
    averageSearchTime: number;
    indexSize: number;
  };
  users: {
    totalUsers: number;
    activeUsers: number;
    adminUsers: number;
  };
  parental: {
    totalBlocks: number;
    temporaryUnlocks: number;
    recentAttempts: number;
  };
  performance: {
    memoryUsageMB: number;
    averageResponseTime: number;
    errorRate: number;
  };
}

export interface ServiceHealth {
  overall: 'healthy' | 'warning' | 'critical';
  components: {
    storage: 'healthy' | 'warning' | 'critical';
    playlist: 'healthy' | 'warning' | 'critical';
    search: 'healthy' | 'warning' | 'critical';
    users: 'healthy' | 'warning' | 'critical';
    parental: 'healthy' | 'warning' | 'critical';
  };
  issues: string[];
  lastCheck: number;
}

/**
 * Moniteur de performance en temps réel
 */
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private errorCount = 0;
  private totalRequests = 0;

  trackOperation(operation: string, startTime: number): void {
    const duration = Date.now() - startTime;

    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }

    const operationMetrics = this.metrics.get(operation)!;
    operationMetrics.push(duration);

    // Garder seulement les 100 dernières métriques
    if (operationMetrics.length > 100) {
      operationMetrics.shift();
    }

    this.totalRequests++;
  }

  trackError(operation: string): void {
    this.errorCount++;
    console.error(`❌ Error in operation: ${operation}`);
  }

  getAverageTime(operation: string): number {
    const metrics = this.metrics.get(operation);
    if (!metrics || metrics.length === 0) {
      return 0;
    }

    const sum = metrics.reduce((a, b) => a + b, 0);
    return Math.round(sum / metrics.length);
  }

  getOverallAverageTime(): number {
    let totalTime = 0;
    let totalOperations = 0;

    for (const metrics of this.metrics.values()) {
      totalTime += metrics.reduce((a, b) => a + b, 0);
      totalOperations += metrics.length;
    }

    return totalOperations > 0 ? Math.round(totalTime / totalOperations) : 0;
  }

  getErrorRate(): number {
    return this.totalRequests > 0
      ? (this.errorCount / this.totalRequests) * 100
      : 0;
  }

  reset(): void {
    this.metrics.clear();
    this.errorCount = 0;
    this.totalRequests = 0;
  }
}

/**
 * Service principal IPTV - Singleton Pattern
 */
export class IPTVService {
  private static instance: IPTVService | null = null;

  // Services
  private storage: StorageAdapter;
  private playlistManager: PlaylistManager;
  private searchManager: SearchManager;
  private userManager: UserManager;

  // Config et state
  private config: IPTVServiceConfig;
  private performanceMonitor: PerformanceMonitor;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private currentUser: User | null = null;

  private constructor(config: IPTVServiceConfig) {
    this.config = {
      enableParentalControl: true,
      enableUserManagement: true,
      enableAdvancedSearch: true,
      enablePerformanceMonitoring: true,
      storage: {
        enableL1Cache: true,
        enableL2MMKV: true,
        enableL3SQLite: true,
        maxCacheSizeMB: 500,
      },
      ...config,
    };

    // Initialiser services
    this.storage = new StorageAdapter(this.config.storage);
    this.playlistManager = new PlaylistManager(this.config.storage);
    this.searchManager = new SearchManager(this.storage);
    this.userManager = new UserManager(this.storage);
    this.performanceMonitor = new PerformanceMonitor();
  }

  /**
   * Singleton Pattern - Obtenir instance
   */
  static getInstance(config?: IPTVServiceConfig): IPTVService {
    if (!IPTVService.instance) {
      IPTVService.instance = new IPTVService(
        config || {
          enableParentalControl: true,
          enableUserManagement: true,
          enableAdvancedSearch: true,
          enablePerformanceMonitoring: true,
        },
      );
    }
    return IPTVService.instance;
  }

  // 🆕 Méthode statique pour compatibilité DI
  // Sera utilisée par le ServiceRegistry
  public static async createFromDI(): Promise<IPTVService> {
    try {
      // Pour le moment, retourne une nouvelle instance avec config par défaut
      // Plus tard, on pourra injecter des dépendances si nécessaire
      return new IPTVService({
        enableParentalControl: true,
        enableUserManagement: true,
        enableAdvancedSearch: true,
        enablePerformanceMonitoring: true,
      });
    } catch (error) {
      console.error('❌ Failed to create IPTVService from DI:', error);
      // Fallback sur l'ancienne méthode
      return IPTVService.getInstance();
    }
  }

  /**
   * Initialisation complète du service
   */
  async initialize(): Promise<void> {
    // Éviter double initialisation
    if (this.isInitialized) {
      return;
    }
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._doInitialize();
    return this.initializationPromise;
  }

  private async _doInitialize(): Promise<void> {
    const startTime = Date.now();
    console.log('🚀 Initializing IPTV Service...');

    try {
      // Initialisation séquentielle des services
      console.log('📦 Initializing Storage...');
      // Storage est initialisé dans le constructeur

      console.log('👥 Initializing User Manager...');
      await this.userManager.initialize();

      if (this.config.enableParentalControl) {
        console.log('🔒 Parental Control enabled (managed by ParentalControlService)');
        // Parental control is now handled by ParentalControlService
      }

      console.log('📋 Initializing Playlist Manager...');
      await this.playlistManager.initialize();

      if (this.config.enableAdvancedSearch) {
        console.log('🔍 Initializing Search Manager...');
        // SearchManager sera initialisé lors du premier chargement de chaînes
      }

      this.isInitialized = true;
      const initTime = Date.now() - startTime;

      console.log(`✅ IPTV Service initialized in ${initTime}ms`);
      console.log('📊 Service Status:', await this.getServiceHealth());

      // Sauvegarder métriques d'initialisation
      await this.storage.set('service_init_metrics', {
        startTime,
        initTime,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('❌ IPTV Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * GESTION DES UTILISATEURS
   */

  async authenticateUser(userId: string, pin: string): Promise<AuthResult> {
    await this.initialize();
    const startTime = Date.now();

    try {
      const result = await this.userManager.authenticate(userId, pin);

      if (result.success && result.user) {
        this.currentUser = result.user;

        // Initialiser search avec données utilisateur si nécessaire
        if (this.config.enableAdvancedSearch) {
          const allChannels = await this.getAllChannels();
          if (allChannels.length > 0) {
            await this.searchManager.initialize(allChannels);
          }
        }
      }

      if (this.config.enablePerformanceMonitoring) {
        this.performanceMonitor.trackOperation('auth', startTime);
      }

      return result;
    } catch (error) {
      this.performanceMonitor.trackError('auth');
      throw error;
    }
  }

  async createUser(
    name: string,
    type: 'admin' | 'standard' | 'child',
    pin: string,
    avatar?: string,
  ): Promise<User> {
    await this.initialize();
    return this.userManager.createUser(name, type, pin, avatar);
  }

  async getCurrentUser(): Promise<User | null> {
    await this.initialize();
    return this.userManager.getCurrentUser() || this.currentUser;
  }

  async getAllUsers(): Promise<User[]> {
    await this.initialize();
    return this.userManager.getAllUsers();
  }

  async logoutCurrentUser(): Promise<boolean> {
    const result = await this.userManager.logout();
    if (result) {
      this.currentUser = null;
    }
    return result;
  }

  /**
   * GESTION DES PLAYLISTS
   */

  async importPlaylistFromUrl(
    url: string,
    name: string,
    options: ImportOptions = {},
  ): Promise<ImportResult> {
    await this.initialize();
    const startTime = Date.now();

    try {
      const result = await this.playlistManager.importFromUrl(
        url,
        name,
        options,
      );

      // Réindexer search si activé
      if (
        this.config.enableAdvancedSearch &&
        result.playlist.channels.length > 0
      ) {
        const allChannels = await this.getAllChannels();
        await this.searchManager.reindex(allChannels);
      }

      if (this.config.enablePerformanceMonitoring) {
        this.performanceMonitor.trackOperation('importPlaylist', startTime);
      }

      return result;
    } catch (error) {
      this.performanceMonitor.trackError('importPlaylist');
      throw error;
    }
  }

  async getPlaylist(id: string): Promise<Playlist | null> {
    await this.initialize();
    return this.playlistManager.getPlaylist(id);
  }

  async getAllPlaylists(): Promise<Playlist[]> {
    await this.initialize();
    return this.playlistManager.getAllPlaylists();
  }

  async deletePlaylist(id: string): Promise<boolean> {
    await this.initialize();
    const result = await this.playlistManager.deletePlaylist(id);

    // Réindexer search après suppression
    if (result && this.config.enableAdvancedSearch) {
      const allChannels = await this.getAllChannels();
      await this.searchManager.reindex(allChannels);
    }

    return result;
  }

  async refreshPlaylist(
    id: string,
    options: ImportOptions = {},
  ): Promise<ImportResult> {
    await this.initialize();
    return this.playlistManager.refreshPlaylist(id, options);
  }

  /**
   * RECHERCHE AVANCÉE
   */

  async searchChannels(
    query: string,
    options: SearchOptions = {},
  ): Promise<SearchResult[]> {
    await this.initialize();

    if (!this.config.enableAdvancedSearch) {
      // Recherche simple sans index
      return this.simpleSearch(query, options);
    }

    const startTime = Date.now();

    try {
      const results = await this.searchManager.search(query, options);

      if (this.config.enablePerformanceMonitoring) {
        this.performanceMonitor.trackOperation('search', startTime);
      }

      return results;
    } catch (error) {
      this.performanceMonitor.trackError('search');
      throw error;
    }
  }

  async getAutoComplete(query: string, limit?: number): Promise<any[]> {
    await this.initialize();

    if (!this.config.enableAdvancedSearch) {
      return [];
    }

    return this.searchManager.getAutoComplete(query, limit);
  }

  /**
   * CONTRÔLE PARENTAL
   */

  async checkChannelAccess(channel: Channel): Promise<{
    allowed: boolean;
    reason?: string;
    requiresPin?: boolean;
    canBeUnlocked?: boolean;
  }> {
    await this.initialize();

    if (!this.config.enableParentalControl) {
      return {allowed: true};
    }

    const user = await this.getCurrentUser();
    if (!user) {
      return {allowed: false, reason: 'Utilisateur non authentifié'};
    }

    // Parental control is now handled by ParentalControlService and useParentalControl hook
    // This method is deprecated - use ParentalControlService.checkAccess() instead
    return {allowed: true};
  }

  async requestTemporaryUnlock(
    categories: string[],
    parentPin: string,
    durationMinutes?: number,
  ): Promise<any> {
    await this.initialize();

    const user = await this.getCurrentUser();
    if (!user || user.type === 'admin') {
      return {success: false, error: 'Action non autorisée'};
    }

    // Parental control is now handled by ParentalControlService
    // This method is deprecated - use ParentalControlService.grantTemporaryAccess() instead
    return {success: false, error: 'Use ParentalControlService instead'};
  }

  /**
   * GESTION FAVORIS ET HISTORIQUE
   */

  async addToFavorites(channel: Channel): Promise<boolean> {
    await this.initialize();

    const user = await this.getCurrentUser();
    if (!user) {
      return false;
    }

    return this.userManager.addToFavorites(user.id, channel);
  }

  async getFavorites(): Promise<Channel[]> {
    await this.initialize();

    const user = await this.getCurrentUser();
    if (!user) {
      return [];
    }

    return this.userManager.getFavorites(user.id);
  }

  async addToHistory(channel: Channel): Promise<boolean> {
    await this.initialize();

    const user = await this.getCurrentUser();
    if (!user) {
      return false;
    }

    return this.userManager.addToHistory(user.id, channel);
  }

  async getHistory(limit?: number): Promise<any[]> {
    await this.initialize();

    const user = await this.getCurrentUser();
    if (!user) {
      return [];
    }

    return this.userManager.getHistory(user.id, limit);
  }

  /**
   * MÉTHODES UTILITAIRES
   */

  private async getAllChannels(): Promise<Channel[]> {
    const playlists = await this.getAllPlaylists();
    const allChannels: Channel[] = [];

    for (const playlist of playlists) {
      allChannels.push(...playlist.channels);
    }

    return allChannels;
  }

  private async simpleSearch(
    query: string,
    options: SearchOptions,
  ): Promise<SearchResult[]> {
    // Recherche simple sans index pour fallback
    const allChannels = await this.getAllChannels();
    const normalizedQuery = query.toLowerCase().trim();
    const results: SearchResult[] = [];

    for (const channel of allChannels) {
      const name = channel.name.toLowerCase();
      const category = (channel.category || '').toLowerCase();

      if (
        name.includes(normalizedQuery) ||
        category.includes(normalizedQuery)
      ) {
        results.push({
          channel,
          score: name.includes(normalizedQuery) ? 0.9 : 0.7,
          matchedFields: [name.includes(normalizedQuery) ? 'name' : 'category'],
        });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, options.maxResults || 50);
  }

  /**
   * MONITORING ET DIAGNOSTICS
   */

  async getServiceStats(): Promise<ServiceStats> {
    await this.initialize();

    const playlistStats = this.playlistManager.getStats();
    const searchStats = this.config.enableAdvancedSearch
      ? this.searchManager.getStats()
      : null;
    const userStats = this.userManager.getStats();
    const parentalStats = this.config.enableParentalControl
      ? {totalBlocks: 0, temporaryUnlocks: 0, recentAttempts: 0}
      : null;
    const storageStats = this.storage.getStats();

    return {
      initialization: {
        startTime: 0, // À récupérer depuis storage
        initTime: 0,
        isReady: this.isInitialized,
      },
      playlists: {
        totalPlaylists: playlistStats.totalPlaylists,
        totalChannels: playlistStats.totalChannels,
        cacheHitRate: playlistStats.cacheHitRate,
        averageParseTime: playlistStats.averageParseTime,
      },
      search: {
        totalSearches: searchStats?.totalSearches || 0,
        averageSearchTime: searchStats?.averageSearchTime || 0,
        indexSize: searchStats?.indexSize || 0,
      },
      users: {
        totalUsers: userStats.totalUsers,
        activeUsers: userStats.activeUsers,
        adminUsers: userStats.adminUsers,
      },
      parental: {
        totalBlocks: parentalStats?.totalBlocks || 0,
        temporaryUnlocks: parentalStats?.temporaryUnlocks || 0,
        recentAttempts: parentalStats?.recentAttempts || 0,
      },
      performance: {
        memoryUsageMB: storageStats.memoryUsageMB,
        averageResponseTime: this.performanceMonitor.getOverallAverageTime(),
        errorRate: this.performanceMonitor.getErrorRate(),
      },
    };
  }

  async getServiceHealth(): Promise<ServiceHealth> {
    const health: ServiceHealth = {
      overall: 'healthy',
      components: {
        storage: 'healthy',
        playlist: 'healthy',
        search: 'healthy',
        users: 'healthy',
        parental: 'healthy',
      },
      issues: [],
      lastCheck: Date.now(),
    };

    // Vérifier chaque composant
    try {
      // Test storage
      await this.storage.get('health_check');

      // Test services
      const stats = await this.getServiceStats();

      // Vérifier métriques critiques
      if (stats.performance.errorRate > 5) {
        health.components.storage = 'warning';
        health.issues.push(
          `Taux d'erreur élevé: ${stats.performance.errorRate.toFixed(1)}%`,
        );
      }

      if (stats.performance.memoryUsageMB > 400) {
        health.components.storage = 'warning';
        health.issues.push(
          `Usage mémoire élevé: ${stats.performance.memoryUsageMB}MB`,
        );
      }

      // Déterminer santé globale
      const componentStates = Object.values(health.components);
      if (componentStates.includes('critical')) {
        health.overall = 'critical';
      } else if (componentStates.includes('warning')) {
        health.overall = 'warning';
      }
    } catch (error) {
      health.overall = 'critical';
      health.components.storage = 'critical';
      health.issues.push(`Service inaccessible: ${error.message}`);
    }

    return health;
  }

  /**
   * CLEANUP ET MAINTENANCE
   */

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up IPTV Service...');

    try {
      if (this.config.enablePerformanceMonitoring) {
        this.performanceMonitor.reset();
      }

      await this.playlistManager.cleanup();

      if (this.config.enableAdvancedSearch) {
        await this.searchManager.cleanup();
      }

      await this.userManager.cleanup();

      if (this.config.enableParentalControl) {
        // Parental control cleanup is now handled by ParentalControlService
        console.log('🔒 Parental control cleanup (handled by ParentalControlService)');
      }

      await this.storage.cleanup();

      this.currentUser = null;
      this.isInitialized = false;
      this.initializationPromise = null;

      console.log('✅ IPTV Service cleanup completed');
    } catch (error) {
      console.error('❌ IPTV Service cleanup failed:', error);
    }
  }

  /**
   * Reset singleton (pour tests)
   */
  static resetInstance(): void {
    IPTVService.instance = null;
  }

  /**
   * Vérifier si le service est initialisé
   */
  get isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Obtenir configuration actuelle
   */
  getConfig(): IPTVServiceConfig {
    return {...this.config};
  }
}

// Export du singleton
export default IPTVService;
