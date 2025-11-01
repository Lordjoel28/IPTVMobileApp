/**
 * 🍉 WatermelonDB Model - Playlist
 * Modèle pour les playlists M3U et Xtream Codes
 */

import {Model} from '@nozbe/watermelondb';
import {field, date, readonly, children} from '@nozbe/watermelondb/decorators';
import type {Associations} from '@nozbe/watermelondb/Model';

export default class Playlist extends Model {
  static table = 'playlists';

  static associations: Associations = {
    channels: {type: 'has_many', foreignKey: 'playlist_id'},
    categories: {type: 'has_many', foreignKey: 'playlist_id'},
    favorites: {type: 'has_many', foreignKey: 'playlist_id'},
    watch_history: {type: 'has_many', foreignKey: 'playlist_id'},
  };

  @field('name') name!: string;
  @field('type') type!: 'M3U' | 'XTREAM';
  @field('url') url?: string;
  @field('server') server?: string;
  @field('username') username?: string;
  @field('password') password?: string;
  @date('date_added') dateAdded!: Date;
  @field('expiration_date') expirationDate?: string;
  @field('account_created_date') accountCreatedDate?: string; // Date de création du compte Xtream
  @field('connection_info') connectionInfo?: string; // Infos connexions (JSON string)
  @field('channels_count') channelsCount!: number;
  @field('status') status!: 'active' | 'expiring' | 'expired';
  @field('is_active') isActive!: boolean;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Relations
  @children('channels') channels: any;
  @children('categories') categories: any;
  @children('favorites') favorites: any;
  @children('watch_history') watchHistory: any;

  // Méthodes utilitaires
  get isExpired(): boolean {
    if (!this.expirationDate) {
      return false;
    }

    let expDate: Date;
    if (/^\d+$/.test(this.expirationDate)) {
      // Timestamp Unix (Xtream Codes)
      expDate = new Date(parseInt(this.expirationDate) * 1000);
    } else {
      // Date ISO standard
      expDate = new Date(this.expirationDate);
    }

    return expDate.getTime() < Date.now();
  }

  get isExpiring(): boolean {
    if (!this.expirationDate || this.isExpired) {
      return false;
    }

    let expDate: Date;
    if (/^\d+$/.test(this.expirationDate)) {
      expDate = new Date(parseInt(this.expirationDate) * 1000);
    } else {
      expDate = new Date(this.expirationDate);
    }

    const diffTime = expDate.getTime() - Date.now();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays <= 3;
  }

  get formattedExpirationDate(): string {
    if (!this.expirationDate) {
      return 'Unlimited';
    }

    let expDate: Date;
    if (/^\d+$/.test(this.expirationDate)) {
      expDate = new Date(parseInt(this.expirationDate) * 1000);
    } else {
      expDate = new Date(this.expirationDate);
    }

    if (isNaN(expDate.getTime())) {
      return 'Invalid';
    }

    const diffTime = expDate.getTime() - Date.now();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return 'Expired';
    }
    if (diffDays === 0) {
      return 'Today';
    }
    if (diffDays === 1) {
      return 'Tomorrow';
    }
    if (diffDays <= 30) {
      return `${diffDays}d left`;
    }

    return expDate.toLocaleDateString('fr-FR');
  }
}
