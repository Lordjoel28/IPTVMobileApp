/**
 * 🍉 WatermelonDB Model - Category
 * Modèle pour les catégories de chaînes
 */

import {Model} from '@nozbe/watermelondb';
import {
  field,
  date,
  readonly,
  relation,
  children,
} from '@nozbe/watermelondb/decorators';
import type {Associations} from '@nozbe/watermelondb/Model';

export default class Category extends Model {
  static table = 'categories';

  static associations: Associations = {
    playlist: {type: 'belongs_to', key: 'playlist_id'},
    channels: {type: 'has_many', foreignKey: 'category_id'},
  };

  @field('playlist_id') playlistId!: string;
  @field('name') name!: string;
  @field('category_id') categoryId!: string; // ID Xtream Codes si applicable
  @field('channels_count') channelsCount!: number;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Relations
  @relation('playlists', 'playlist_id') playlist: any;
  @children('channels') channels: any;

  // Méthodes utilitaires
  get displayName(): string {
    return this.name || 'Uncategorized';
  }

  get isEmpty(): boolean {
    return this.channelsCount === 0;
  }
}
