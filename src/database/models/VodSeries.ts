/**
 * 🍉 WatermelonDB Model - VodSeries
 * Modèle pour les séries VOD - OPTIMISÉ pour 5K+ séries
 */

import {Model} from '@nozbe/watermelondb';
import {field, date, readonly} from '@nozbe/watermelondb/decorators';
import type {Associations} from '@nozbe/watermelondb/Model';

export default class VodSeries extends Model {
  static table = 'vod_series';

  static associations: Associations = {
    playlist: {type: 'belongs_to', key: 'playlist_id'},
  };

  // Champs de base
  @field('playlist_id') playlistId!: string;
  @field('series_id') seriesId!: string; // ID Xtream Codes
  @field('category_id') categoryId!: string;
  @field('name') name!: string;

  // Métadonnées visuelles
  @field('cover_url') coverUrl?: string;
  @field('backdrop_url') backdropUrl?: string;

  // Métadonnées série
  @field('rating') rating?: string;
  @field('genre') genre?: string;
  @field('release_date') releaseDate?: string;
  @field('plot') plot?: string;
  @field('director') director?: string;
  @field('cast') cast?: string;
  @field('episodes_count') episodesCount?: number;
  @field('seasons_count') seasonsCount?: number;
  @field('added') added?: string; // Timestamp ajout serveur
  @field('last_updated') lastUpdated?: string;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Méthodes utilitaires
  get displayName(): string {
    return this.name || `Series ${this.seriesId}`;
  }

  get displayCover(): string {
    return this.coverUrl || '';
  }

  get displayBackdrop(): string {
    return this.backdropUrl || this.coverUrl || '';
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

  get totalEpisodes(): number {
    return this.episodesCount || 0;
  }

  get totalSeasons(): number {
    return this.seasonsCount || 0;
  }

  get addedTimestamp(): number {
    if (this.added) {
      const timestamp = parseInt(this.added, 10);
      return isNaN(timestamp) ? 0 : timestamp;
    }
    return 0;
  }

  get seasonInfo(): string {
    if (this.seasonsCount && this.episodesCount) {
      return `${this.seasonsCount} saison${this.seasonsCount > 1 ? 's' : ''} • ${this.episodesCount} épisode${this.episodesCount > 1 ? 's' : ''}`;
    }
    if (this.seasonsCount) {
      return `${this.seasonsCount} saison${this.seasonsCount > 1 ? 's' : ''}`;
    }
    if (this.episodesCount) {
      return `${this.episodesCount} épisode${this.episodesCount > 1 ? 's' : ''}`;
    }
    return '';
  }
}
