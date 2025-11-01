/**
 * 🍉 WatermelonDB Model - Favorite
 * Modèle pour les chaînes favorites par utilisateur
 */

import {Model} from '@nozbe/watermelondb';
import {field, date, readonly, relation} from '@nozbe/watermelondb/decorators';
import type {Associations} from '@nozbe/watermelondb/Model';

export default class Favorite extends Model {
  static table = 'favorites';

  static associations: Associations = {
    playlist: {type: 'belongs_to', key: 'playlist_id'},
    channel: {type: 'belongs_to', key: 'channel_id'},
  };

  // Champs de base
  @field('user_profile') userProfile!: string;
  @field('channel_id') channelId!: string;
  @field('playlist_id') playlistId!: string;
  @date('added_at') addedAt!: Date;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Relations
  @relation('playlists', 'playlist_id') playlist: any;
  @relation('channels', 'channel_id') channel: any;
}
