/**
 * 📺 Program Model - Programmes EPG
 * Modèle WatermelonDB pour stocker les données Electronic Program Guide
 */

import {Model} from '@nozbe/watermelondb';
import {field, text} from '@nozbe/watermelondb/decorators';

export default class Program extends Model {
  static table = 'programs';

  @field('channel_id') channelId!: string;
  @field('playlist_id') playlistId!: string; // Ajouté pour l'EPGService
  @text('title') title!: string;
  @text('description') description!: string;
  @field('start_time') startTime!: number;
  @field('stop_time') stopTime!: number;
}
