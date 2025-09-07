/**
 * 🍉 WatermelonDB Model - Channel
 * Modèle pour les chaînes IPTV - OPTIMISÉ pour 25K+ records
 */

import {Model} from '@nozbe/watermelondb';
import {field, date, readonly, relation} from '@nozbe/watermelondb/decorators';
import type {Associations} from '@nozbe/watermelondb/Model';

export default class Channel extends Model {
  static table = 'channels';

  static associations: Associations = {
    playlist: {type: 'belongs_to', key: 'playlist_id'},
    category: {type: 'belongs_to', key: 'category_id'},
    favorites: {type: 'has_many', foreignKey: 'channel_id'},
    watch_history: {type: 'has_many', foreignKey: 'channel_id'},
  };

  // Champs de base
  @field('playlist_id') playlistId!: string;
  @field('category_id') categoryId?: string;
  @field('name') name!: string;
  @field('stream_url') streamUrl!: string;
  @field('logo_url') logoUrl?: string;
  @field('group_title') groupTitle?: string;

  // Champs TVG (Electronic Program Guide)
  @field('tvg_id') tvgId?: string;
  @field('tvg_name') tvgName?: string;
  @field('tvg_logo') tvgLogo?: string;

  // Métadonnées
  @field('language') language?: string;
  @field('country') country?: string;
  @field('quality') quality?: string;
  @field('stream_type') streamType?: string; // 'live' | 'movie' | 'series'

  // Champs Xtream Codes spécifiques
  @field('num') num?: number;
  @field('stream_id') streamId?: string;
  @field('stream_icon') streamIcon?: string;
  @field('epg_channel_id') epgChannelId?: string;
  @field('added') added?: string;
  @field('is_adult') isAdult?: boolean;

  // Métadonnées d'utilisation
  @field('is_favorite') isFavorite!: boolean;
  @date('last_watched') lastWatched?: Date;
  @field('watch_count') watchCount!: number;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Relations
  @relation('playlists', 'playlist_id') playlist: any;
  @relation('categories', 'category_id') category: any;

  // Méthodes utilitaires
  get displayName(): string {
    return this.name || this.tvgName || `Channel ${this.streamId || this.id}`;
  }

  get displayLogo(): string {
    return this.logoUrl || this.tvgLogo || this.streamIcon || '';
  }

  get isHD(): boolean {
    if (!this.quality) {
      return false;
    }
    return (
      this.quality.toUpperCase().includes('HD') ||
      this.quality.toUpperCase().includes('FHD') ||
      this.quality.toUpperCase().includes('4K')
    );
  }

  get categoryName(): string {
    return this.groupTitle || 'Uncategorized';
  }

  // Construire l'URL de streaming pour Xtream Codes
  get xtreamStreamUrl(): string {
    if (this.streamType === 'live' && this.streamId) {
      // Format: http://server:port/username/password/streamId
      const playlist = this.playlist.observe().getValue();
      if (
        playlist &&
        playlist.server &&
        playlist.username &&
        playlist.password
      ) {
        return `${playlist.server}/${playlist.username}/${playlist.password}/${this.streamId}`;
      }
    }
    return this.streamUrl;
  }

  // Marquer comme favori
  async toggleFavorite(): Promise<void> {
    await this.update(channel => {
      channel.isFavorite = !channel.isFavorite;
    });
  }

  // Enregistrer un visionnage
  async recordWatch(): Promise<void> {
    await this.update(channel => {
      channel.lastWatched = new Date();
      channel.watchCount = (channel.watchCount || 0) + 1;
    });
  }
}
