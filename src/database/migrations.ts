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
  ],
});
