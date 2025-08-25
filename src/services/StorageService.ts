import AsyncStorage from '@react-native-async-storage/async-storage';
import { Favorite, RecentChannel, Settings, User, ParentalControl } from '../types';

export class StorageService {
  private static instance: StorageService;

  // 🆕 Support pour injection de dépendances (DI)
  // Cette méthode permet d'utiliser le service via DI ou singleton legacy
  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  // 🆕 Méthode statique pour compatibilité DI
  // Sera utilisée par le ServiceRegistry
  public static async createFromDI(): Promise<StorageService> {
    try {
      // Pour le moment, retourne une nouvelle instance
      // Plus tard, on pourra injecter des dépendances si nécessaire
      return new StorageService();
    } catch (error) {
      console.error('❌ Failed to create StorageService from DI:', error);
      // Fallback sur l'ancienne méthode
      return StorageService.getInstance();
    }
  }

  // Favorites
  async getFavorites(): Promise<Favorite[]> {
    try {
      const data = await AsyncStorage.getItem('iptv_favorites');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting favorites:', error);
      return [];
    }
  }

  async addFavorite(channelId: string): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      const exists = favorites.find(f => f.channelId === channelId);
      
      if (!exists) {
        favorites.push({
          channelId,
          dateAdded: new Date().toISOString(),
        });
        await AsyncStorage.setItem('iptv_favorites', JSON.stringify(favorites));
      }
    } catch (error) {
      console.error('Error adding favorite:', error);
    }
  }

  async removeFavorite(channelId: string): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      const filtered = favorites.filter(f => f.channelId !== channelId);
      await AsyncStorage.setItem('iptv_favorites', JSON.stringify(filtered));
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  }

  async isFavorite(channelId: string): Promise<boolean> {
    try {
      const favorites = await this.getFavorites();
      return favorites.some(f => f.channelId === channelId);
    } catch (error) {
      console.error('Error checking favorite:', error);
      return false;
    }
  }

  // Recent Channels
  async getRecentChannels(): Promise<RecentChannel[]> {
    try {
      const data = await AsyncStorage.getItem('iptv_recent');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting recent channels:', error);
      return [];
    }
  }

  async addRecentChannel(channelId: string, playlistId: string): Promise<void> {
    try {
      let recent = await this.getRecentChannels();
      
      // Remove if already exists
      recent = recent.filter(r => r.channelId !== channelId);
      
      // Add to beginning
      recent.unshift({
        channelId,
        playlistId,
        lastWatched: new Date().toISOString(),
      });

      // Keep only last 50
      recent = recent.slice(0, 50);

      await AsyncStorage.setItem('iptv_recent', JSON.stringify(recent));
    } catch (error) {
      console.error('Error adding recent channel:', error);
    }
  }

  // Settings
  async getSettings(): Promise<Settings> {
    try {
      const data = await AsyncStorage.getItem('iptv_settings');
      return data ? JSON.parse(data) : this.getDefaultSettings();
    } catch (error) {
      console.error('Error getting settings:', error);
      return this.getDefaultSettings();
    }
  }

  async saveSettings(settings: Settings): Promise<void> {
    try {
      await AsyncStorage.setItem('iptv_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  private getDefaultSettings(): Settings {
    return {
      theme: 'auto',
      autoplay: false,
      quality: 'auto',
      volume: 80,
      rememberPosition: true,
      parentalControl: false,
      language: 'fr',
    };
  }

  // Users
  async getUsers(): Promise<User[]> {
    try {
      const data = await AsyncStorage.getItem('iptv_users');
      return data ? JSON.parse(data) : this.getDefaultUsers();
    } catch (error) {
      console.error('Error getting users:', error);
      return this.getDefaultUsers();
    }
  }

  async saveUsers(users: User[]): Promise<void> {
    try {
      await AsyncStorage.setItem('iptv_users', JSON.stringify(users));
    } catch (error) {
      console.error('Error saving users:', error);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const users = await this.getUsers();
      return users.find(u => u.isActive) || users[0] || null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  async switchUser(userId: string): Promise<void> {
    try {
      const users = await this.getUsers();
      users.forEach(user => {
        user.isActive = user.id === userId;
      });
      await this.saveUsers(users);
    } catch (error) {
      console.error('Error switching user:', error);
    }
  }

  private getDefaultUsers(): User[] {
    return [
      {
        id: 'default',
        name: 'Utilisateur par défaut',
        type: 'standard',
        avatar: 'person',
        isActive: true,
      },
    ];
  }

  // Parental Control
  async getParentalControl(): Promise<ParentalControl> {
    try {
      const data = await AsyncStorage.getItem('iptv_parental_control');
      return data ? JSON.parse(data) : this.getDefaultParentalControl();
    } catch (error) {
      console.error('Error getting parental control:', error);
      return this.getDefaultParentalControl();
    }
  }

  async saveParentalControl(control: ParentalControl): Promise<void> {
    try {
      await AsyncStorage.setItem('iptv_parental_control', JSON.stringify(control));
    } catch (error) {
      console.error('Error saving parental control:', error);
    }
  }

  private getDefaultParentalControl(): ParentalControl {
    return {
      enabled: false,
      pin: null,
      ageLimit: 18,
      blockedCategories: [],
      hideBlockedChannels: false,
      isUnlocked: false,
      unlockExpires: null,
    };
  }

  // Clear all data
  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        'iptv_playlists',
        'iptv_favorites',
        'iptv_recent',
        'iptv_settings',
        'iptv_users',
        'iptv_parental_control',
      ]);
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  }
}