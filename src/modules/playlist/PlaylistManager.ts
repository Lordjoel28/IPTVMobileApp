import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Channel, Playlist } from '../../types';

export class PlaylistManager {
  private static instance: PlaylistManager;
  private playlists: Playlist[] = [];
  private channels: Channel[] = [];
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): PlaylistManager {
    if (!PlaylistManager.instance) {
      PlaylistManager.instance = new PlaylistManager();
    }
    return PlaylistManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.loadPlaylists();
      this.isInitialized = true;
      console.log('📋 PlaylistManager initialisé:', this.playlists.length, 'playlists');
    } catch (error) {
      console.error('❌ Erreur initialisation PlaylistManager:', error);
    }
  }

  // Getters
  getPlaylists(): Playlist[] {
    return this.playlists;
  }

  getAllChannels(): Channel[] {
    const allChannels: Channel[] = [];
    this.playlists.forEach(playlist => {
      allChannels.push(...playlist.channels);
    });
    return allChannels;
  }

  getChannelById(channelId: string): Channel | null {
    const allChannels = this.getAllChannels();
    return allChannels.find(channel => channel.id === channelId) || null;
  }

  getPlaylistById(playlistId: string): Playlist | null {
    return this.playlists.find(playlist => playlist.id === playlistId) || null;
  }

  getChannelsByCategory(): { [key: string]: Channel[] } {
    const allChannels = this.getAllChannels();
    const grouped: { [key: string]: Channel[] } = {};
    
    allChannels.forEach(channel => {
      const category = channel.category || 'Autres';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(channel);
    });

    return grouped;
  }

  // M3U Parsing
  private parseM3U(content: string): Channel[] {
    const channels: Channel[] = [];
    const lines = content.split('\n');
    let currentChannel: Partial<Channel> = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('#EXTINF:')) {
        // Parse channel info
        const info = line.substring(8);
        const nameMatch = info.match(/,(.+)$/);
        if (nameMatch) {
          currentChannel.name = nameMatch[1].trim();
        }

        // Extract attributes
        const logoMatch = info.match(/tvg-logo="([^"]+)"/);
        if (logoMatch) {
          currentChannel.logo = logoMatch[1];
        }

        const groupMatch = info.match(/group-title="([^"]+)"/);
        if (groupMatch) {
          currentChannel.group = groupMatch[1];
          currentChannel.category = groupMatch[1];
        }

        const tvgIdMatch = info.match(/tvg-id="([^"]+)"/);
        if (tvgIdMatch) {
          currentChannel.tvgId = tvgIdMatch[1];
        }

        const languageMatch = info.match(/tvg-language="([^"]+)"/);
        if (languageMatch) {
          currentChannel.language = languageMatch[1];
        }

        const countryMatch = info.match(/tvg-country="([^"]+)"/);
        if (countryMatch) {
          currentChannel.country = countryMatch[1];
        }
      } else if (line && !line.startsWith('#')) {
        // URL line
        if (currentChannel.name) {
          channels.push({
            id: this.generateChannelId(currentChannel.name, line),
            name: currentChannel.name,
            url: line,
            logo: currentChannel.logo,
            group: currentChannel.group,
            category: currentChannel.category,
            language: currentChannel.language,
            country: currentChannel.country,
            tvgId: currentChannel.tvgId,
          });
        }
        currentChannel = {};
      }
    }

    console.log('📺 Parsed', channels.length, 'channels from M3U');
    return channels;
  }

  // Playlist management
  async addPlaylist(name: string, source: { url?: string; content?: string }): Promise<Playlist> {
    try {
      let channels: Channel[] = [];

      if (source.url) {
        console.log('🌐 Chargement playlist depuis URL:', source.url);
        const response = await axios.get(source.url, {
          timeout: 15000,
          headers: {
            'User-Agent': 'IPTV Mobile App/1.0',
          },
        });
        channels = this.parseM3U(response.data);
      } else if (source.content) {
        console.log('📄 Parsing playlist depuis contenu local');
        channels = this.parseM3U(source.content);
      }

      const playlist: Playlist = {
        id: this.generatePlaylistId(name),
        name,
        url: source.url,
        channels,
        isLocal: !source.url,
        dateAdded: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };

      this.playlists.push(playlist);
      await this.savePlaylists();

      console.log('✅ Playlist ajoutée:', playlist.name, '(', playlist.channels.length, 'chaînes)');
      return playlist;
    } catch (error) {
      console.error('❌ Erreur ajout playlist:', error);
      throw new Error('Impossible d\'ajouter la playlist: ' + (error as Error).message);
    }
  }

  async updatePlaylist(playlistId: string): Promise<void> {
    try {
      const playlist = this.getPlaylistById(playlistId);
      if (!playlist) {
        throw new Error('Playlist introuvable');
      }

      if (!playlist.url) {
        throw new Error('Impossible de mettre à jour une playlist locale');
      }

      console.log('🔄 Mise à jour playlist:', playlist.name);
      const response = await axios.get(playlist.url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'IPTV Mobile App/1.0',
        },
      });

      playlist.channels = this.parseM3U(response.data);
      playlist.lastUpdated = new Date().toISOString();
      
      await this.savePlaylists();
      console.log('✅ Playlist mise à jour:', playlist.name, '(', playlist.channels.length, 'chaînes)');
    } catch (error) {
      console.error('❌ Erreur mise à jour playlist:', error);
      throw new Error('Impossible de mettre à jour la playlist: ' + (error as Error).message);
    }
  }

  async deletePlaylist(playlistId: string): Promise<void> {
    try {
      const index = this.playlists.findIndex(p => p.id === playlistId);
      if (index === -1) {
        throw new Error('Playlist introuvable');
      }

      const playlistName = this.playlists[index].name;
      this.playlists.splice(index, 1);
      await this.savePlaylists();
      
      console.log('🗑️ Playlist supprimée:', playlistName);
    } catch (error) {
      console.error('❌ Erreur suppression playlist:', error);
      throw error;
    }
  }

  // Search
  searchChannels(query: string): Channel[] {
    const allChannels = this.getAllChannels();
    const lowerQuery = query.toLowerCase();
    
    return allChannels.filter(channel =>
      channel.name.toLowerCase().includes(lowerQuery) ||
      (channel.category && channel.category.toLowerCase().includes(lowerQuery)) ||
      (channel.group && channel.group.toLowerCase().includes(lowerQuery))
    );
  }

  // Storage
  private async loadPlaylists(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem('iptv_playlists');
      this.playlists = data ? JSON.parse(data) : [];
      console.log('📂 Playlists chargées:', this.playlists.length);
    } catch (error) {
      console.error('❌ Erreur chargement playlists:', error);
      this.playlists = [];
    }
  }

  private async savePlaylists(): Promise<void> {
    try {
      await AsyncStorage.setItem('iptv_playlists', JSON.stringify(this.playlists));
      console.log('💾 Playlists sauvegardées');
    } catch (error) {
      console.error('❌ Erreur sauvegarde playlists:', error);
      throw error;
    }
  }

  // Utilities
  private generateChannelId(name: string, url: string): string {
    return `${name}_${url}`.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().substring(0, 50);
  }

  private generatePlaylistId(name: string): string {
    return `playlist_${name}_${Date.now()}`.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  }

  // Stats
  getStats() {
    const allChannels = this.getAllChannels();
    const categories = this.getChannelsByCategory();
    
    return {
      totalPlaylists: this.playlists.length,
      totalChannels: allChannels.length,
      totalCategories: Object.keys(categories).length,
      channelsByCategory: Object.entries(categories).map(([name, channels]) => ({
        name,
        count: channels.length,
      })),
    };
  }

  // Export for debugging
  exportData() {
    return {
      playlists: this.playlists,
      stats: this.getStats(),
    };
  }
}