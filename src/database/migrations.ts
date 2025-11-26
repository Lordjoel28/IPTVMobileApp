/**
 * 🔄 WatermelonDB Migrations - Évolution du schéma de base
 * Création des index SQL pour optimiser les performances de recherche
 */

import {schemaMigrations, addColumns, createTable} from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
  migrations: [
    // Migration 1→2: Création initiale (historique)
    // Migration 2→3: Optimisation schéma (historique)

    // Migration 3→4: Ajout des index de performance pour recherche + catégories
    {
      toVersion: 4,
      steps: [
        {
          type: 'sql',
          sql: `
            -- 🚀 Index optimisés pour le chargement des catégories (PRIORITÉ MAXIMALE)

            -- Index principal pour accélérer les requêtes par playlist
            CREATE INDEX IF NOT EXISTS idx_channels_playlist_id ON channels(playlist_id);

            -- 🎯 Index COMPOSITE le plus important: accélère le GROUP BY des catégories
            -- Optimisé spécifiquement pour: SELECT group_title, COUNT(*) FROM channels WHERE playlist_id=? GROUP BY group_title
            CREATE INDEX IF NOT EXISTS idx_channels_playlist_group ON channels(playlist_id, group_title);

            -- Index pour les recherches par nom (utile pour la recherche de chaînes)
            CREATE INDEX IF NOT EXISTS idx_channels_name ON channels(name);

            -- Index pour les favoris (accélère l'affichage des chaînes favorites)
            CREATE INDEX IF NOT EXISTS idx_channels_playlist_favorite ON channels(playlist_id, is_favorite);

            -- Index pour les chaînes récemment regardées (historique)
            CREATE INDEX IF NOT EXISTS idx_channels_last_watched ON channels(last_watched);

            -- Index pour contrôle parental (filtrage contenu adulte)
            CREATE INDEX IF NOT EXISTS idx_channels_adult ON channels(is_adult);

            -- Anciens index conservés pour compatibilité
            CREATE INDEX IF NOT EXISTS idx_channels_playlist_name ON channels(playlist_id, name);
            CREATE INDEX IF NOT EXISTS idx_channels_category ON channels(group_title);
          `,
        },
      ],
    },

    // Migration 4→5: Index COLLATE NOCASE pour tri alphabétique optimisé (insensible à la casse)
    {
      toVersion: 5,
      steps: [
        {
          type: 'sql',
          sql: `
            -- 🔤 Index COLLATE NOCASE pour tri alphabétique ultra-rapide
            -- Optimise les requêtes ORDER BY name COLLATE NOCASE
            -- Particulièrement utile pour l'affichage des 100 premières chaînes triées
            CREATE INDEX IF NOT EXISTS idx_channels_name_nocase ON channels(name COLLATE NOCASE);

            -- Index composite pour playlist + nom trié (encore plus rapide)
            CREATE INDEX IF NOT EXISTS idx_channels_playlist_name_nocase ON channels(playlist_id, name COLLATE NOCASE);
          `,
        },
      ],
    },

    // Migration 5→6: Ajout champs account_created_date et connection_info pour playlists Xtream
    {
      toVersion: 6,
      steps: [
        {
          type: 'sql',
          sql: `
            -- 📅 Ajout champ pour la vraie date de création du compte Xtream
            ALTER TABLE playlists ADD COLUMN account_created_date TEXT;

            -- 🔗 Ajout champ pour les infos de connexions actives (JSON string)
            ALTER TABLE playlists ADD COLUMN connection_info TEXT;
          `,
        },
      ],
    },

    // Migration 6→7: Ajout tables VOD (Films & Séries) pour stockage local massif
    {
      toVersion: 7,
      steps: [
        // Créer la table des catégories VOD
        createTable({
          name: 'vod_categories',
          columns: [
            {name: 'playlist_id', type: 'string', isIndexed: true},
            {name: 'category_id', type: 'string', isIndexed: true},
            {name: 'category_name', type: 'string'},
            {name: 'category_type', type: 'string'},
            {name: 'parent_id', type: 'number', isOptional: true},
            {name: 'created_at', type: 'number'},
            {name: 'updated_at', type: 'number'},
          ],
        }),

        // Créer la table des films VOD
        createTable({
          name: 'vod_movies',
          columns: [
            {name: 'playlist_id', type: 'string', isIndexed: true},
            {name: 'movie_id', type: 'string', isIndexed: true},
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
            {name: 'added', type: 'string', isOptional: true},
            {name: 'container_extension', type: 'string', isOptional: true},
            {name: 'created_at', type: 'number'},
            {name: 'updated_at', type: 'number'},
          ],
        }),

        // Créer la table des séries VOD
        createTable({
          name: 'vod_series',
          columns: [
            {name: 'playlist_id', type: 'string', isIndexed: true},
            {name: 'series_id', type: 'string', isIndexed: true},
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

        // Créer les index pour optimiser les requêtes VOD
        {
          type: 'sql',
          sql: `
            -- 🎬 Index optimisés pour les films VOD
            CREATE INDEX IF NOT EXISTS idx_vod_movies_playlist_category ON vod_movies(playlist_id, category_id);
            CREATE INDEX IF NOT EXISTS idx_vod_movies_name ON vod_movies(name);
            CREATE INDEX IF NOT EXISTS idx_vod_movies_added ON vod_movies(added);

            -- 📺 Index optimisés pour les séries VOD
            CREATE INDEX IF NOT EXISTS idx_vod_series_playlist_category ON vod_series(playlist_id, category_id);
            CREATE INDEX IF NOT EXISTS idx_vod_series_name ON vod_series(name);
            CREATE INDEX IF NOT EXISTS idx_vod_series_added ON vod_series(added);

            -- 📁 Index pour les catégories VOD
            CREATE INDEX IF NOT EXISTS idx_vod_categories_playlist_type ON vod_categories(playlist_id, category_type);
          `,
        },
      ],
    },
  ],
});
