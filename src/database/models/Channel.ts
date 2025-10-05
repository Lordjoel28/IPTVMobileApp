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

  // Champs TVG (Electronic Program Guide) - OPTIMISÉ
  @field('tvg_id') tvgId?: string;
  // tvgName supprimé - utiliser name
  // tvgLogo supprimé - utiliser logoUrl

  // Métadonnées essentielles uniquement
  @field('stream_type') streamType?: string; // 'live' | 'movie' | 'series'

  // Champs Xtream Codes spécifiques - OPTIMISÉ
  @field('stream_id') streamId?: string;
  // streamIcon supprimé - utiliser logoUrl
  // num, added, epgChannelId supprimés - rarement utilisés
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

  // Méthodes utilitaires - OPTIMISÉ
  get displayName(): string {
    return this.name || `Channel ${this.streamId || this.id}`;
  }

  get displayLogo(): string {
    return this.logoUrl || '';
  }

  get isHD(): boolean {
    // Détection HD depuis le nom (plus besoin du champ quality)
    const nameUpper = this.name.toUpperCase();
    return (
      nameUpper.includes('HD') ||
      nameUpper.includes('FHD') ||
      nameUpper.includes('4K') ||
      nameUpper.includes('UHD')
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
