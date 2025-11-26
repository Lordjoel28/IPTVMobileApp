/**
 * 🍉 WatermelonDB Model - VodCategory
 * Modèle pour les catégories VOD (Films & Séries)
 */

import {Model} from '@nozbe/watermelondb';
import {field, date, readonly} from '@nozbe/watermelondb/decorators';
import type {Associations} from '@nozbe/watermelondb/Model';

export default class VodCategory extends Model {
  static table = 'vod_categories';

  static associations: Associations = {
    playlist: {type: 'belongs_to', key: 'playlist_id'},
  };

  // Champs de base
  @field('playlist_id') playlistId!: string;
  @field('category_id') categoryId!: string; // ID Xtream Codes
  @field('category_name') categoryName!: string;
  @field('category_type') categoryType!: string; // 'movie' | 'series'
  @field('parent_id') parentId?: number;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Méthodes utilitaires
  get displayName(): string {
    return this.categoryName || `Category ${this.categoryId}`;
  }

  get isMovieCategory(): boolean {
    return this.categoryType === 'movie';
  }

  get isSeriesCategory(): boolean {
    return this.categoryType === 'series';
  }
}
