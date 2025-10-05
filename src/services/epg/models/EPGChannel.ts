/**
 * 📺 WatermelonDB Model - EPG Channel
 * Modèle SQLite pour les chaînes EPG
 */

import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

export default class EPGChannel extends Model {
  static table = 'epg_channels';

  @field('channel_id') channelId!: string;
  @field('display_name') displayName!: string;
  @field('icon_url') iconUrl?: string;
  @field('category') category!: string;
  @field('language') language!: string;
  @field('is_active') isActive!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}