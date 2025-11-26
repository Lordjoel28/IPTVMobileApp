/**
 * 🍉 WatermelonDB Model - VodMovie
 * Modèle pour les films VOD - OPTIMISÉ pour 10K+ films
 */

import {Model} from '@nozbe/watermelondb';
import {field, date, readonly} from '@nozbe/watermelondb/decorators';
import type {Associations} from '@nozbe/watermelondb/Model';

export default class VodMovie extends Model {
  static table = 'vod_movies';

  static associations: Associations = {
    playlist: {type: 'belongs_to', key: 'playlist_id'},
  };

  // Champs de base
  @field('playlist_id') playlistId!: string;
  @field('movie_id') movieId!: string; // ID Xtream Codes
  @field('category_id') categoryId!: string;
  @field('name') name!: string;
  @field('stream_url') streamUrl!: string;

  // Métadonnées visuelles
  @field('cover_url') coverUrl?: string;

  // Métadonnées film
  @field('rating') rating?: string;
  @field('duration') duration?: string;
  @field('genre') genre?: string;
  @field('release_date') releaseDate?: string;
  @field('plot') plot?: string;
  @field('director') director?: string;
  @field('cast') cast?: string;
  @field('added') added?: string; // Timestamp ajout serveur
  @field('container_extension') containerExtension?: string;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Méthodes utilitaires
  get displayName(): string {
    return this.name || `Movie ${this.movieId}`;
  }

  get displayCover(): string {
    return this.coverUrl || '';
  }

  get year(): string {
    if (this.releaseDate) {
      // Extraire l'année de la date
      const match = this.releaseDate.match(/\d{4}/);
      return match ? match[0] : '';
    }
    return '';
  }

  get ratingNumber(): number {
    if (this.rating) {
      const num = parseFloat(this.rating);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  }

  get durationMinutes(): number {
    if (this.duration) {
      // Format: "120 min" ou "01:30:00"
      const minMatch = this.duration.match(/(\d+)\s*min/i);
      if (minMatch) {
        return parseInt(minMatch[1], 10);
      }
      const timeMatch = this.duration.match(/(\d+):(\d+):(\d+)/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        return hours * 60 + minutes;
      }
    }
    return 0;
  }

  get genreList(): string[] {
    if (this.genre) {
      return this.genre.split(',').map(g => g.trim());
    }
    return [];
  }

  get castList(): string[] {
    if (this.cast) {
      return this.cast.split(',').map(c => c.trim());
    }
    return [];
  }

  get addedTimestamp(): number {
    if (this.added) {
      const timestamp = parseInt(this.added, 10);
      return isNaN(timestamp) ? 0 : timestamp;
    }
    return 0;
  }
}
