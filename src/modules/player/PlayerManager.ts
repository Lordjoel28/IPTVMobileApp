import { Channel } from '../../types';
import { StorageService } from '../../services/StorageService';

export interface PlayerState {
  currentChannel: Channel | null;
  isPlaying: boolean;
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string | null;
  volume: number;
  position: number;
  duration: number;
  retryCount: number;
}

export interface PlayerConfig {
  autoplay: boolean;
  quality: 'auto' | '1080p' | '720p' | '480p';
  maxRetries: number;
  bufferConfig: {
    minBufferMs: number;
    maxBufferMs: number;
    bufferForPlaybackMs: number;
    bufferForPlaybackAfterRebufferMs: number;
  };
}

export class PlayerManager {
  private static instance: PlayerManager;
  private state: PlayerState;
  private config: PlayerConfig;
  private listeners: Array<(state: PlayerState) => void> = [];
  private retryTimeout: NodeJS.Timeout | null = null;
  private storageService: StorageService;

  private constructor() {
    this.storageService = StorageService.getInstance();
    
    this.state = {
      currentChannel: null,
      isPlaying: false,
      isLoading: false,
      hasError: false,
      errorMessage: null,
      volume: 80,
      position: 0,
      duration: 0,
      retryCount: 0,
    };

    this.config = {
      autoplay: true,
      quality: 'auto',
      maxRetries: 3,
      bufferConfig: {
        minBufferMs: 15000,
        maxBufferMs: 50000,
        bufferForPlaybackMs: 2500,
        bufferForPlaybackAfterRebufferMs: 5000,
      },
    };

    this.initialize();
  }

  public static getInstance(): PlayerManager {
    if (!PlayerManager.instance) {
      PlayerManager.instance = new PlayerManager();
    }
    return PlayerManager.instance;
  }

  private async initialize(): Promise<void> {
    try {
      const settings = await this.storageService.getSettings();
      this.config.autoplay = settings.autoplay;
      this.config.quality = settings.quality;
      this.state.volume = settings.volume;
      
      console.log('🎬 PlayerManager initialisé');
    } catch (error) {
      console.error('❌ Erreur initialisation PlayerManager:', error);
    }
  }

  // State management
  getState(): PlayerState {
    return { ...this.state };
  }

  getConfig(): PlayerConfig {
    return { ...this.config };
  }

  subscribe(listener: (state: PlayerState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private setState(updates: Partial<PlayerState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Channel management
  async loadChannel(channel: Channel): Promise<void> {
    try {
      console.log('🎵 Chargement chaîne:', channel.name);
      
      this.clearRetryTimeout();
      this.setState({
        currentChannel: channel,
        isLoading: true,
        hasError: false,
        errorMessage: null,
        retryCount: 0,
      });

      // Add to recent channels
      await this.storageService.addRecentChannel(channel.id, 'current_playlist');
      
      // Auto-play if enabled
      if (this.config.autoplay) {
        this.setState({ isPlaying: true });
      }

    } catch (error) {
      console.error('❌ Erreur chargement chaîne:', error);
      this.handleError('Impossible de charger la chaîne');
    }
  }

  play(): void {
    if (this.state.currentChannel) {
      console.log('▶️ Lecture:', this.state.currentChannel.name);
      this.setState({ isPlaying: true, hasError: false });
    }
  }

  pause(): void {
    console.log('⏸️ Pause');
    this.setState({ isPlaying: false });
  }

  togglePlayPause(): void {
    if (this.state.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  stop(): void {
    console.log('⏹️ Arrêt');
    this.clearRetryTimeout();
    this.setState({
      isPlaying: false,
      currentChannel: null,
      position: 0,
      hasError: false,
      errorMessage: null,
      retryCount: 0,
    });
  }

  setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(100, volume));
    this.setState({ volume: clampedVolume });
    
    // Save to settings
    this.storageService.getSettings().then(settings => {
      settings.volume = clampedVolume;
      this.storageService.saveSettings(settings);
    });
  }

  // Error handling
  handleError(message: string): void {
    console.error('🚨 Erreur lecteur:', message);
    
    this.setState({
      hasError: true,
      errorMessage: message,
      isLoading: false,
      isPlaying: false,
    });

    // Auto-retry if under limit
    if (this.state.retryCount < this.config.maxRetries && this.state.currentChannel) {
      this.scheduleRetry();
    }
  }

  private scheduleRetry(): void {
    const retryDelay = Math.min(2000 * Math.pow(2, this.state.retryCount), 10000);
    
    console.log(`🔄 Retry programmé dans ${retryDelay}ms (tentative ${this.state.retryCount + 1}/${this.config.maxRetries})`);
    
    this.retryTimeout = setTimeout(() => {
      if (this.state.currentChannel) {
        this.setState({
          retryCount: this.state.retryCount + 1,
          hasError: false,
          isLoading: true,
        });
        
        // Re-trigger load
        this.play();
      }
    }, retryDelay);
  }

  retry(): void {
    if (this.state.currentChannel) {
      console.log('🔄 Retry manuel');
      this.setState({
        retryCount: 0,
        hasError: false,
        isLoading: true,
      });
      this.play();
    }
  }

  private clearRetryTimeout(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }

  // Playback events
  onLoadStart(): void {
    this.setState({ isLoading: true });
  }

  onLoad(data: any): void {
    console.log('✅ Chaîne chargée');
    this.setState({
      isLoading: false,
      hasError: false,
      duration: data.duration || 0,
      retryCount: 0,
    });
  }

  onProgress(data: any): void {
    this.setState({
      position: data.currentTime || 0,
    });
  }

  onBuffer(data: any): void {
    this.setState({ isLoading: data.isBuffering });
  }

  onEnd(): void {
    console.log('📺 Fin de lecture');
    this.setState({
      isPlaying: false,
      position: 0,
    });
  }

  // Configuration
  async updateConfig(updates: Partial<PlayerConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
    
    // Save relevant settings
    try {
      const settings = await this.storageService.getSettings();
      if (updates.autoplay !== undefined) {
        settings.autoplay = updates.autoplay;
      }
      if (updates.quality !== undefined) {
        settings.quality = updates.quality;
      }
      await this.storageService.saveSettings(settings);
      
      console.log('⚙️ Configuration lecteur mise à jour');
    } catch (error) {
      console.error('❌ Erreur mise à jour config:', error);
    }
  }

  // Quality management
  getAvailableQualities(): string[] {
    return ['auto', '1080p', '720p', '480p'];
  }

  setQuality(quality: string): void {
    if (this.getAvailableQualities().includes(quality)) {
      this.config.quality = quality as any;
      console.log('🎬 Qualité définie:', quality);
    }
  }

  // Statistics
  getStats() {
    return {
      currentChannel: this.state.currentChannel?.name || 'Aucune',
      isPlaying: this.state.isPlaying,
      hasError: this.state.hasError,
      retryCount: this.state.retryCount,
      volume: this.state.volume,
      quality: this.config.quality,
      autoplay: this.config.autoplay,
    };
  }

  // Cleanup
  destroy(): void {
    this.clearRetryTimeout();
    this.listeners = [];
    this.stop();
    console.log('🧹 PlayerManager détruit');
  }
}