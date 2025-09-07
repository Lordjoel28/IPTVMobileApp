import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export default class Program extends Model {
  static table = 'programs';

  @field('channel_id') channelId!: string;
  @text('title') title!: string;
  @text('description') description!: string;
  @field('start_time') startTime!: number;
  @field('stop_time') stopTime!: number;
}
