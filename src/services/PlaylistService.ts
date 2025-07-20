import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Channel, Playlist } from '../types';

export class PlaylistService {
  private static instance: PlaylistService;

  public static getInstance(): PlaylistService {
    if (!PlaylistService.instance) {
      PlaylistService.instance = new PlaylistService();
    }
    return PlaylistService.instance;
  }

  async parseM3U(content: string): Promise<Channel[]> {
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

    return channels;
  }

  async loadPlaylistFromUrl(url: string): Promise<Channel[]> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'IPTV Mobile App',
        },
      });
      return this.parseM3U(response.data);
    } catch (error) {
      console.error('Error loading playlist from URL:', error);
      throw new Error('Impossible de charger la playlist depuis l\'URL');
    }
  }

  async loadPlaylistFromFile(content: string): Promise<Channel[]> {
    try {
      return this.parseM3U(content);
    } catch (error) {
      console.error('Error parsing playlist file:', error);
      throw new Error('Format de fichier playlist invalide');
    }
  }

  async savePlaylists(playlists: Playlist[]): Promise<void> {
    try {
      await AsyncStorage.setItem('iptv_playlists', JSON.stringify(playlists));
    } catch (error) {
      console.error('Error saving playlists:', error);
      throw new Error('Impossible de sauvegarder les playlists');
    }
  }

  async loadPlaylists(): Promise<Playlist[]> {
    try {
      const data = await AsyncStorage.getItem('iptv_playlists');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading playlists:', error);
      return [];
    }
  }

  async addPlaylist(name: string, url?: string, content?: string): Promise<Playlist> {
    try {
      let channels: Channel[] = [];

      if (url) {
        channels = await this.loadPlaylistFromUrl(url);
      } else if (content) {
        channels = await this.loadPlaylistFromFile(content);
      }

      const playlist: Playlist = {
        id: this.generatePlaylistId(name),
        name,
        url,
        channels,
        isLocal: !url,
        dateAdded: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };

      const playlists = await this.loadPlaylists();
      playlists.push(playlist);
      await this.savePlaylists(playlists);

      return playlist;
    } catch (error) {
      console.error('Error adding playlist:', error);
      throw error;
    }
  }

  async updatePlaylist(playlistId: string): Promise<void> {
    try {
      const playlists = await this.loadPlaylists();
      const playlist = playlists.find(p => p.id === playlistId);

      if (!playlist) {
        throw new Error('Playlist introuvable');
      }

      if (playlist.url) {
        playlist.channels = await this.loadPlaylistFromUrl(playlist.url);
        playlist.lastUpdated = new Date().toISOString();
        await this.savePlaylists(playlists);
      }
    } catch (error) {
      console.error('Error updating playlist:', error);
      throw error;
    }
  }

  async deletePlaylist(playlistId: string): Promise<void> {
    try {
      const playlists = await this.loadPlaylists();
      const filteredPlaylists = playlists.filter(p => p.id !== playlistId);
      await this.savePlaylists(filteredPlaylists);
    } catch (error) {
      console.error('Error deleting playlist:', error);
      throw error;
    }
  }

  private generateChannelId(name: string, url: string): string {
    return `${name}_${url}`.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  }

  private generatePlaylistId(name: string): string {
    return `playlist_${name}_${Date.now()}`.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  }

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

  searchChannels(channels: Channel[], query: string): Channel[] {
    const lowerQuery = query.toLowerCase();
    return channels.filter(channel =>
      channel.name.toLowerCase().includes(lowerQuery) ||
      (channel.category && channel.category.toLowerCase().includes(lowerQuery)) ||
      (channel.group && channel.group.toLowerCase().includes(lowerQuery))
    );
  }
}