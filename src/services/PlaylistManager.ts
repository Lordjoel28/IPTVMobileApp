import RNFS from 'react-native-fs';
import type { Channel } from '../types';

// Interfaces adaptées pour React Native
export interface Category {
  name: string;
  count: number;
}

export interface Playlist {
  id: string;
  name: string;
  source: string;
  channels: Channel[];
  channelCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 📺 PlaylistManager - Version React Native du code web
 * Gestionnaire des playlists IPTV adapté pour mobile
 */
export class PlaylistManager {
  private playlists: Playlist[] = [];
  private channels: Channel[] = [];
  private currentPlaylist: string | null = null;
  
  constructor() {
    console.log('📺 Initialisation PlaylistManager React Native');
    this.ensurePlaylistsArray();
  }
  
  /**
   * S'assurer que playlists est toujours un tableau
   */
  ensurePlaylistsArray(): void {
    if (!Array.isArray(this.playlists)) {
      console.warn('⚠️ Correction: playlists n\'était pas un tableau, type:', typeof this.playlists);
      this.playlists = [];
    }
  }
  
  /**
   * Charger une playlist depuis un fichier M3U
   */
  public async loadPlaylist(uri: string): Promise<void> {
    console.log('🔥 PLAYLIST MANAGER - Début chargement depuis:', uri);
    try {
      const content = await RNFS.readFile(uri, 'utf8');
      console.log(`🔥 PLAYLIST MANAGER - Fichier lu: ${(content.length / 1024).toFixed(1)}KB`);
      
      // Parser le M3U avec la méthode traditionnelle optimisée
      const channels = await this.parseM3U(content);
      console.log(`🔥 PLAYLIST MANAGER - Parsing terminé: ${channels.length} chaînes`);
      
      this.channels = channels;
      this.processCategories();
      console.log(`🔥 PLAYLIST MANAGER - SUCCÈS: ${this.channels.length} chaînes chargées et ${this.getCategories().length} catégories trouvées.`);
    } catch (error) {
      console.error('❌ PLAYLIST MANAGER - Erreur lors du chargement:', error);
    }
  }
  
  /**
   * Parser le contenu M3U - Version optimisée du web adaptée pour RN
   */
  private async parseM3U(content: string): Promise<Channel[]> {
    console.log('🔍 Parsing M3U avec parser web optimisé...');
    
    if (!content || typeof content !== 'string') {
      console.warn('⚠️ Contenu M3U invalide');
      return [];
    }

    const channels: Channel[] = [];
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    let currentChannel: Partial<Channel> = {};
    
    console.log(`📊 Lignes à traiter: ${lines.length}`);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.startsWith('#EXTINF:')) {
        const info = this.parseExtinf(line);
        currentChannel = {
          id: `channel_${Date.now()}_${i}`,
          name: info.name || `Chaîne ${channels.length + 1}`,
          tvgLogo: info.logo || '',
          logo: info.logo || '', // Compatibilité
          category: info.group || 'Général',
          group: info.group || 'Général', // Compatibilité
          country: '',
          language: '',
          url: ''
        };
        
        // Log debug pour les premières chaînes
        if (channels.length < 5) {
          console.log(`🔍 PARSER - Chaîne parsée:`, {
            name: currentChannel.name,
            category: currentChannel.category,
            logo: currentChannel.tvgLogo ? 'OUI' : 'NON'
          });
        }
      } else if (line.startsWith('http') && currentChannel.name) {
        currentChannel.url = line;
        channels.push(currentChannel as Channel);
        currentChannel = {};
      }
    }
    
    console.log(`✅ Parsing M3U terminé: ${channels.length} chaînes`);
    return channels;
  }
  
  /**
   * Parser une ligne EXTINF - Méthode du web adaptée
   */
  private parseExtinf(line: string): { name: string; logo: string; group: string } {
    const result = { name: '', logo: '', group: '' };
    
    // Extract logo
    const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
    if (logoMatch) result.logo = logoMatch[1];
    
    // Extract group (TRÈS IMPORTANT pour les catégories)
    const groupMatch = line.match(/group-title="([^"]+)"/i);
    if (groupMatch) {
      result.group = groupMatch[1];
      console.log(`🔍 PARSER - Catégorie trouvée: "${result.group}"`);
    }
    
    // Extract name
    const nameMatch = line.match(/,(.+)$/);
    if (nameMatch) result.name = nameMatch[1].trim();
    
    return result;
  }
  
  /**
   * Traiter les catégories comme dans le web
   */
  private processCategories(): void {
    const groupCounts = new Map<string, number>();
    
    console.log('🔍 PLAYLIST MANAGER - Traitement des catégories...');
    
    this.channels.forEach((channel, index) => {
      const group = channel.category || channel.group || 'Général';
      groupCounts.set(group, (groupCounts.get(group) || 0) + 1);
      
      // Log des premières chaînes pour debug
      if (index < 10) {
        console.log(`🔍 Channel ${index}: "${channel.name}" -> Catégorie: "${group}"`);
      }
    });

    const categories = Array.from(groupCounts.entries()).map(([name, count]) => ({ name, count }));
    console.log('🔍 PLAYLIST MANAGER - Catégories extraites:', categories);
  }

  public getCategories(): Category[] {
    const groupCounts = new Map<string, number>();
    
    this.channels.forEach(channel => {
      const group = channel.category || channel.group || 'Général';
      groupCounts.set(group, (groupCounts.get(group) || 0) + 1);
    });

    const categories = Array.from(groupCounts.entries()).map(([name, count]) => ({ name, count }));
    console.log('🔍 PLAYLIST MANAGER - getCategories() retourne:', categories.length, 'catégories');
    return categories;
  }

  public getChannelsByGroup(group: string): Channel[] {
    if (group === 'Tous') {
      return this.channels;
    }
    const filtered = this.channels.filter(channel => (channel.category || channel.group || 'Général') === group);
    console.log(`🔍 PLAYLIST MANAGER - getChannelsByGroup("${group}") retourne ${filtered.length} chaînes`);
    return filtered;
  }
  
  /**
   * Obtenir toutes les chaînes
   */
  public getChannels(): Channel[] {
    return [...this.channels];
  }
}

export const playlistManager = new PlaylistManager();
