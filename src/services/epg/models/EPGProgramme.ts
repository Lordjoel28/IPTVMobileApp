/**
 * 📺 WatermelonDB Model - EPG Programme
 * Modèle SQLite pour les programmes EPG
 */

import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

export default class EPGProgramme extends Model {
  static table = 'epg_programmes';

  @field('channel_id') channelId!: string;
  @field('title') title!: string;
  @field('description') description?: string;
  @field('start_time') startTime!: number;
  @field('end_time') endTime!: number;
  @field('duration') duration!: number;
  @field('category') category!: string;
  @field('source_xmltv') sourceXmltv!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}