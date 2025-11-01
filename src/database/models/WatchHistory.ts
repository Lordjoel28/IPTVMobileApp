/**
 * 🍉 WatermelonDB Model - WatchHistory
 * Modèle pour l'historique de visionnage des chaînes
 */

import {Model} from '@nozbe/watermelondb';
import {field, date, readonly, relation} from '@nozbe/watermelondb/decorators';
import type {Associations} from '@nozbe/watermelondb/Model';

export default class WatchHistory extends Model {
  static table = 'watch_history';

  static associations: Associations = {
    playlist: {type: 'belongs_to', key: 'playlist_id'},
    channel: {type: 'belongs_to', key: 'channel_id'},
  };

  // Champs de base
  @field('user_profile') userProfile!: string;
  @field('channel_id') channelId!: string;
  @field('playlist_id') playlistId!: string;
  @date('watched_at') watchedAt!: Date;
  @field('duration') duration?: number; // Durée en secondes
  @field('position') position?: number; // Position d'arrêt

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Relations
  @relation('playlists', 'playlist_id') playlist: any;
  @relation('channels', 'channel_id') channel: any;
}
