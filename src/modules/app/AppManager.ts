import { PlaylistManager } from '../playlist/PlaylistManager';
import { PlayerManager } from '../player/PlayerManager';
import { UIManager } from '../ui/UIManager';
import { SearchManager } from '../search/SearchManager';
import { StorageService } from '../../services/StorageService';
import { Channel, Playlist, User } from '../../types';

export interface AppState {
  isInitialized: boolean;
  currentUser: User | null;
  currentChannel: Channel | null;
  currentPlaylist: Playlist | null;
  favorites: string[];
  isLoading: boolean;
  error: string | null;
}

export class AppManager {
  private static instance: AppManager;
  private state: AppState;
  private listeners: Array<(state: AppState) => void> = [];
  
  // Modules
  private playlistManager: PlaylistManager;
  private playerManager: PlayerManager;
  private uiManager: UIManager;
  private searchManager: SearchManager;
  private storageService: StorageService;

  private constructor() {
    this.state = {
      isInitialized: false,
      currentUser: null,
      currentChannel: null,
      currentPlaylist: null,
      favorites: [],
      isLoading: true,
      error: null,
    };

    // Initialize modules
    this.playlistManager = PlaylistManager.getInstance();
    this.playerManager = PlayerManager.getInstance();
    this.uiManager = UIManager.getInstance();
    this.searchManager = SearchManager.getInstance();
    this.storageService = StorageService.getInstance();
  }

  public static getInstance(): AppManager {
    if (!AppManager.instance) {
      AppManager.instance = new AppManager();
    }
    return AppManager.instance;
  }

  // Initialization
  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initialisation AppManager...');
      this.setState({ isLoading: true, error: null });

      // Initialize modules in order
      await this.playlistManager.initialize();
      await this.loadUserData();
      await this.loadFavorites();

      // Subscribe to module changes
      this.setupModuleSubscriptions();

      this.setState({ 
        isInitialized: true, 
        isLoading: false 
      });

      console.log('✅ AppManager initialisé avec succès');
    } catch (error) {
      console.error('❌ Erreur initialisation AppManager:', error);
      this.setState({ 
        error: 'Erreur d\'initialisation de l\'application',
        isLoading: false 
      });
    }
  }

  private async loadUserData(): Promise<void> {
    try {
      const currentUser = await this.storageService.getCurrentUser();
      this.setState({ currentUser });
      console.log('👤 Utilisateur chargé:', currentUser?.name);
    } catch (error) {
      console.error('❌ Erreur chargement utilisateur:', error);
    }
  }

  private async loadFavorites(): Promise<void> {
    try {
      const favorites = await this.storageService.getFavorites();
      this.setState({ 
        favorites: favorites.map(f => f.channelId) 
      });
      console.log('❤️ Favoris chargés:', favorites.length);
    } catch (error) {
      console.error('❌ Erreur chargement favoris:', error);
    }
  }

  private setupModuleSubscriptions(): void {
    // Subscribe to player state changes
    this.playerManager.subscribe((playerState) => {
      if (playerState.currentChannel !== this.state.currentChannel) {
        this.setState({ currentChannel: playerState.currentChannel });
      }
    });
  }

  // State management
  getState(): AppState {
    return { ...this.state };
  }

  subscribe(listener: (state: AppState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private setState(updates: Partial<AppState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Module getters
  getPlaylistManager(): PlaylistManager {
    return this.playlistManager;
  }

  getPlayerManager(): PlayerManager {
    return this.playerManager;
  }

  getUIManager(): UIManager {
    return this.uiManager;
  }

  getSearchManager(): SearchManager {
    return this.searchManager;
  }

  getStorageService(): StorageService {
    return this.storageService;
  }

  // Channel management
  async playChannel(channel: Channel): Promise<void> {
    try {
      console.log('▶️ Lecture chaîne:', channel.name);
      
      await this.playerManager.loadChannel(channel);
      this.setState({ currentChannel: channel });
      
      // Add to recent channels
      await this.storageService.addRecentChannel(
        channel.id, 
        this.state.currentPlaylist?.id || 'unknown'
      );
    } catch (error) {
      console.error('❌ Erreur lecture chaîne:', error);
      this.setState({ error: 'Impossible de lire cette chaîne' });
    }
  }

  stopChannel(): void {
    this.playerManager.stop();
    this.setState({ currentChannel: null });
  }

  // Playlist management
  async addPlaylist(name: string, source: { url?: string; content?: string }): Promise<Playlist> {
    try {
      const playlist = await this.playlistManager.addPlaylist(name, source);
      console.log('📋 Playlist ajoutée:', playlist.name);
      return playlist;
    } catch (error) {
      console.error('❌ Erreur ajout playlist:', error);
      throw error;
    }
  }

  async selectPlaylist(playlistId: string): Promise<void> {
    try {
      const playlist = this.playlistManager.getPlaylistById(playlistId);
      if (playlist) {
        this.setState({ currentPlaylist: playlist });
        console.log('📋 Playlist sélectionnée:', playlist.name);
      }
    } catch (error) {
      console.error('❌ Erreur sélection playlist:', error);
    }
  }

  async updatePlaylist(playlistId: string): Promise<void> {
    try {
      await this.playlistManager.updatePlaylist(playlistId);
      console.log('🔄 Playlist mise à jour');
    } catch (error) {
      console.error('❌ Erreur mise à jour playlist:', error);
      throw error;
    }
  }

  async deletePlaylist(playlistId: string): Promise<void> {
    try {
      await this.playlistManager.deletePlaylist(playlistId);
      
      // If current playlist was deleted, clear it
      if (this.state.currentPlaylist?.id === playlistId) {
        this.setState({ currentPlaylist: null });
      }
      
      console.log('🗑️ Playlist supprimée');
    } catch (error) {
      console.error('❌ Erreur suppression playlist:', error);
      throw error;
    }
  }

  // Favorites management
  async toggleFavorite(channelId: string): Promise<void> {
    try {
      const isFavorite = this.state.favorites.includes(channelId);
      
      if (isFavorite) {
        await this.storageService.removeFavorite(channelId);
        this.setState({
          favorites: this.state.favorites.filter(id => id !== channelId)
        });
        console.log('💔 Favori retiré');
      } else {
        await this.storageService.addFavorite(channelId);
        this.setState({
          favorites: [...this.state.favorites, channelId]
        });
        console.log('❤️ Favori ajouté');
      }
    } catch (error) {
      console.error('❌ Erreur gestion favori:', error);
    }
  }

  isFavorite(channelId: string): boolean {
    return this.state.favorites.includes(channelId);
  }

  async getFavoriteChannels(): Promise<Channel[]> {
    const allChannels = this.playlistManager.getAllChannels();
    return allChannels.filter(channel => this.isFavorite(channel.id));
  }

  // User management
  async switchUser(userId: string): Promise<void> {
    try {
      await this.storageService.switchUser(userId);
      await this.loadUserData();
      await this.loadFavorites();
      console.log('👤 Utilisateur changé');
    } catch (error) {
      console.error('❌ Erreur changement utilisateur:', error);
      throw error;
    }
  }

  // Search
  async searchChannels(query: string): Promise<Channel[]> {
    try {
      const results = await this.searchManager.search(query);
      return results.map(r => r.channel);
    } catch (error) {
      console.error('❌ Erreur recherche:', error);
      return [];
    }
  }

  // Data management
  async clearAllData(): Promise<void> {
    try {
      console.log('🧹 Suppression de toutes les données...');
      
      // Stop current playback
      this.stopChannel();
      
      // Clear storage
      await this.storageService.clearAllData();
      
      // Reset state
      this.setState({
        currentUser: null,
        currentChannel: null,
        currentPlaylist: null,
        favorites: [],
        error: null,
      });
      
      // Reinitialize
      await this.initialize();
      
      console.log('✅ Toutes les données supprimées');
    } catch (error) {
      console.error('❌ Erreur suppression données:', error);
      throw error;
    }
  }

  // Statistics and debugging
  getStats() {
    const playlistStats = this.playlistManager.getStats();
    const playerStats = this.playerManager.getStats();
    const uiStats = this.uiManager.getStats();
    const searchStats = this.searchManager.getStats();
    
    return {
      app: {
        isInitialized: this.state.isInitialized,
        currentUser: this.state.currentUser?.name || 'Aucun',
        currentChannel: this.state.currentChannel?.name || 'Aucune',
        currentPlaylist: this.state.currentPlaylist?.name || 'Aucune',
        favoritesCount: this.state.favorites.length,
        hasError: !!this.state.error,
      },
      playlist: playlistStats,
      player: playerStats,
      ui: uiStats,
      search: searchStats,
    };
  }

  exportDebugData() {
    return {
      state: this.state,
      stats: this.getStats(),
      playlists: this.playlistManager.exportData(),
    };
  }

  // Error handling
  clearError(): void {
    this.setState({ error: null });
  }

  setError(error: string): void {
    this.setState({ error });
  }

  // Cleanup
  destroy(): void {
    this.playerManager.destroy();
    this.uiManager.destroy();
    this.searchManager.destroy();
    this.listeners = [];
    console.log('🧹 AppManager détruit');
  }
}