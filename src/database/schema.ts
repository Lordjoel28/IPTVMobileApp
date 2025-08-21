/**
 * 🍉 WatermelonDB Schema - Schéma pour IPTV avec 25K+ chaînes
 * Optimisé pour lazy loading et haute performance
 */

import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
  version: 1,
  tables: [
    // Table des playlists
    tableSchema({
      name: 'playlists',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'type', type: 'string' }, // 'M3U' | 'XTREAM'
        { name: 'url', type: 'string', isOptional: true },
        { name: 'server', type: 'string', isOptional: true },
        { name: 'username', type: 'string', isOptional: true },
        { name: 'password', type: 'string', isOptional: true },
        { name: 'date_added', type: 'number' },
        { name: 'expiration_date', type: 'string', isOptional: true },
        { name: 'channels_count', type: 'number' },
        { name: 'status', type: 'string' }, // 'active' | 'expiring' | 'expired'
        { name: 'is_active', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' }
      ]
    }),

    // Table des catégories
    tableSchema({
      name: 'categories',
      columns: [
        { name: 'playlist_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string', isIndexed: true },
        { name: 'category_id', type: 'string' }, // ID Xtream Codes si applicable
        { name: 'channels_count', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' }
      ]
    }),

    // Table des chaînes - OPTIMISÉE pour 25K+ records
    tableSchema({
      name: 'channels',
      columns: [
        { name: 'playlist_id', type: 'string', isIndexed: true },
        { name: 'category_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'name', type: 'string', isIndexed: true },
        { name: 'stream_url', type: 'string' },
        { name: 'logo_url', type: 'string', isOptional: true },
        { name: 'group_title', type: 'string', isOptional: true },
        { name: 'tvg_id', type: 'string', isOptional: true },
        { name: 'tvg_name', type: 'string', isOptional: true },
        { name: 'tvg_logo', type: 'string', isOptional: true },
        { name: 'language', type: 'string', isOptional: true },
        { name: 'country', type: 'string', isOptional: true },
        { name: 'quality', type: 'string', isOptional: true }, // HD, FHD, 4K, etc.
        { name: 'stream_type', type: 'string', isOptional: true }, // live, movie, series
        // Champs Xtream Codes spécifiques
        { name: 'num', type: 'number', isOptional: true },
        { name: 'stream_id', type: 'string', isOptional: true },
        { name: 'stream_icon', type: 'string', isOptional: true },
        { name: 'epg_channel_id', type: 'string', isOptional: true },
        { name: 'added', type: 'string', isOptional: true },
        { name: 'is_adult', type: 'boolean', isOptional: true },
        // Métadonnées d'utilisation
        { name: 'is_favorite', type: 'boolean' },
        { name: 'last_watched', type: 'number', isOptional: true },
        { name: 'watch_count', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' }
      ]
    }),

    // Table des favoris par utilisateur
    tableSchema({
      name: 'favorites',
      columns: [
        { name: 'user_profile', type: 'string', isIndexed: true }, // Profil utilisateur
        { name: 'channel_id', type: 'string', isIndexed: true },
        { name: 'playlist_id', type: 'string', isIndexed: true },
        { name: 'added_at', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' }
      ]
    }),

    // Table de l'historique de visionnage
    tableSchema({
      name: 'watch_history',
      columns: [
        { name: 'user_profile', type: 'string', isIndexed: true },
        { name: 'channel_id', type: 'string', isIndexed: true },
        { name: 'playlist_id', type: 'string', isIndexed: true },
        { name: 'watched_at', type: 'number', isIndexed: true },
        { name: 'duration', type: 'number', isOptional: true }, // Durée en secondes
        { name: 'position', type: 'number', isOptional: true }, // Position d'arrêt
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' }
      ]
    })
  ]
});