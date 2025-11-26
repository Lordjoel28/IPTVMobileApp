/**
 * 🍉 WatermelonDB Schema - Schéma pour IPTV avec 25K+ chaînes
 * Optimisé pour lazy loading et haute performance
 */

import {appSchema, tableSchema} from '@nozbe/watermelondb';

export default appSchema({
  version: 7, // Migration v7: Ajout tables VOD (movies, series, vod_categories)
  tables: [
    // Table des playlists
    tableSchema({
      name: 'playlists',
      columns: [
        {name: 'name', type: 'string'},
        {name: 'type', type: 'string'}, // 'M3U' | 'XTREAM'
        {name: 'url', type: 'string', isOptional: true},
        {name: 'server', type: 'string', isOptional: true},
        {name: 'username', type: 'string', isOptional: true},
        {name: 'password', type: 'string', isOptional: true},
        {name: 'date_added', type: 'number'},
        {name: 'expiration_date', type: 'string', isOptional: true},
        {name: 'account_created_date', type: 'string', isOptional: true}, // Date de création du compte Xtream
        {name: 'connection_info', type: 'string', isOptional: true}, // Infos connexions (JSON string)
        {name: 'channels_count', type: 'number'},
        {name: 'status', type: 'string'}, // 'active' | 'expiring' | 'expired'
        {name: 'is_active', type: 'boolean'},
        {name: 'created_at', type: 'number'},
        {name: 'updated_at', type: 'number'},
      ],
    }),

    // Table des catégories
    tableSchema({
      name: 'categories',
      columns: [
        {name: 'playlist_id', type: 'string', isIndexed: true},
        {name: 'name', type: 'string', isIndexed: true},
        {name: 'category_id', type: 'string'}, // ID Xtream Codes si applicable
        {name: 'channels_count', type: 'number'},
        {name: 'created_at', type: 'number'},
        {name: 'updated_at', type: 'number'},
      ],
    }),

    // Table des chaînes - ULTRA-OPTIMISÉE pour 100K+ records
    // Réduction 26 → 14 champs = -46% taille SQLite
    tableSchema({
      name: 'channels',
      columns: [
        {name: 'playlist_id', type: 'string', isIndexed: true},
        {
          name: 'category_id',
          type: 'string',
          isOptional: true,
          isIndexed: true,
        },
        {name: 'name', type: 'string', isIndexed: true},
        {name: 'stream_url', type: 'string'},
        {name: 'logo_url', type: 'string', isOptional: true},
        {name: 'group_title', type: 'string', isOptional: true},
        {name: 'tvg_id', type: 'string', isOptional: true},
        {name: 'stream_type', type: 'string', isOptional: true}, // live, movie, series
        {name: 'stream_id', type: 'string', isOptional: true},
        {name: 'is_adult', type: 'boolean', isOptional: true},
        // Métadonnées d'utilisation
        {name: 'is_favorite', type: 'boolean'},
        {name: 'last_watched', type: 'number', isOptional: true},
        {name: 'watch_count', type: 'number'},
        {name: 'created_at', type: 'number'},
        {name: 'updated_at', type: 'number'},
      ],
    }),

    // Table des favoris par utilisateur
    tableSchema({
      name: 'favorites',
      columns: [
        {name: 'user_profile', type: 'string', isIndexed: true}, // Profil utilisateur
        {name: 'channel_id', type: 'string', isIndexed: true},
        {name: 'playlist_id', type: 'string', isIndexed: true},
        {name: 'added_at', type: 'number'},
        {name: 'created_at', type: 'number'},
        {name: 'updated_at', type: 'number'},
      ],
    }),

    // Table de l'historique de visionnage
    tableSchema({
      name: 'watch_history',
      columns: [
        {name: 'user_profile', type: 'string', isIndexed: true},
        {name: 'channel_id', type: 'string', isIndexed: true},
        {name: 'playlist_id', type: 'string', isIndexed: true},
        {name: 'watched_at', type: 'number', isIndexed: true},
        {name: 'duration', type: 'number', isOptional: true}, // Durée en secondes
        {name: 'position', type: 'number', isOptional: true}, // Position d'arrêt
        {name: 'created_at', type: 'number'},
        {name: 'updated_at', type: 'number'},
      ],
    }),

    // Table pour les données EPG (programmes)
    tableSchema({
      name: 'programs',
      columns: [
        {name: 'channel_id', type: 'string', isIndexed: true},
        {name: 'playlist_id', type: 'string', isIndexed: true}, // Ajouté pour l'EPGService
        {name: 'title', type: 'string'},
        {name: 'description', type: 'string', isOptional: true},
        {name: 'start_time', type: 'number', isIndexed: true},
        {name: 'stop_time', type: 'number'},
        {name: 'created_at', type: 'number'},
        {name: 'updated_at', type: 'number'},
      ],
    }),

    // ===== TABLES VOD (Films & Séries) - Migration v7 =====

    // Table des catégories VOD
    tableSchema({
      name: 'vod_categories',
      columns: [
        {name: 'playlist_id', type: 'string', isIndexed: true},
        {name: 'category_id', type: 'string', isIndexed: true}, // ID Xtream
        {name: 'category_name', type: 'string'},
        {name: 'category_type', type: 'string'}, // 'movie' | 'series'
        {name: 'parent_id', type: 'number', isOptional: true},
        {name: 'created_at', type: 'number'},
        {name: 'updated_at', type: 'number'},
      ],
    }),

    // Table des films VOD - Optimisée pour 10K+ films
    tableSchema({
      name: 'vod_movies',
      columns: [
        {name: 'playlist_id', type: 'string', isIndexed: true},
        {name: 'movie_id', type: 'string', isIndexed: true}, // ID Xtream
        {name: 'category_id', type: 'string', isIndexed: true},
        {name: 'name', type: 'string', isIndexed: true},
        {name: 'stream_url', type: 'string'},
        {name: 'cover_url', type: 'string', isOptional: true},
        {name: 'rating', type: 'string', isOptional: true},
        {name: 'duration', type: 'string', isOptional: true},
        {name: 'genre', type: 'string', isOptional: true},
        {name: 'release_date', type: 'string', isOptional: true},
        {name: 'plot', type: 'string', isOptional: true},
        {name: 'director', type: 'string', isOptional: true},
        {name: 'cast', type: 'string', isOptional: true},
        {name: 'added', type: 'string', isOptional: true}, // Timestamp ajout serveur
        {name: 'container_extension', type: 'string', isOptional: true},
        {name: 'created_at', type: 'number'},
        {name: 'updated_at', type: 'number'},
      ],
    }),

    // Table des séries VOD - Optimisée pour 5K+ séries
    tableSchema({
      name: 'vod_series',
      columns: [
        {name: 'playlist_id', type: 'string', isIndexed: true},
        {name: 'series_id', type: 'string', isIndexed: true}, // ID Xtream
        {name: 'category_id', type: 'string', isIndexed: true},
        {name: 'name', type: 'string', isIndexed: true},
        {name: 'cover_url', type: 'string', isOptional: true},
        {name: 'backdrop_url', type: 'string', isOptional: true},
        {name: 'rating', type: 'string', isOptional: true},
        {name: 'genre', type: 'string', isOptional: true},
        {name: 'release_date', type: 'string', isOptional: true},
        {name: 'plot', type: 'string', isOptional: true},
        {name: 'director', type: 'string', isOptional: true},
        {name: 'cast', type: 'string', isOptional: true},
        {name: 'episodes_count', type: 'number', isOptional: true},
        {name: 'seasons_count', type: 'number', isOptional: true},
        {name: 'added', type: 'string', isOptional: true},
        {name: 'last_updated', type: 'string', isOptional: true},
        {name: 'created_at', type: 'number'},
        {name: 'updated_at', type: 'number'},
      ],
    }),
  ],
});
