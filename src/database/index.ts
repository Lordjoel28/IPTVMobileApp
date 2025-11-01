/**
 * 🍉 WatermelonDB Database - Configuration principale
 * Base de données optimisée pour 25K+ chaînes IPTV
 */

import {Database} from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import schema from './schema';
import migrations from './migrations';
import {Playlist, Channel, Category, Program, Favorite, WatchHistory} from './models';

// Configuration de l'adaptateur SQLite optimisé avec PERSISTANCE
const adapter = new SQLiteAdapter({
  schema,
  migrations, // 🔄 Migrations pour créer les index SQL
  // 🔧 NOM DE LA BASE pour persistance sur disque
  dbName: 'iptv_watermelon.db', // CRITIQUE: Sans nom = base en mémoire qui disparaît !
  // JSI désactivé temporairement pour éviter warnings React Native 0.73
  jsi: false, // Fallback vers operations asynchrones (stable)
  onSetUpError: error => {
    console.error('🚨 WatermelonDB Setup Error:', error);
  },
});

// Instance de la base de données
export const database = new Database({
  adapter,
  modelClasses: [Playlist, Channel, Category, Program, Favorite, WatchHistory],
  actionsEnabled: true, // Activer les actions pour le debugging
});

// 🔍 VÉRIFICATION PERSISTANCE au démarrage
(async () => {
  try {
    const playlistsCount = await database
      .get<Playlist>('playlists')
      .query()
      .fetchCount();
    const channelsCount = await database
      .get<Channel>('channels')
      .query()
      .fetchCount();

    if (playlistsCount > 0 || channelsCount > 0) {
      console.log('🎉 PERSISTANCE OK - Données récupérées depuis disque:');
      console.log(`   📋 ${playlistsCount} playlists`);
      console.log(`   📺 ${channelsCount} chaînes`);

      // 🚀 Vérification des index de performance
      await verifyPerformanceIndexes();
    } else {
      console.log('📱 Base WatermelonDB vide - Premier démarrage');
    }
  } catch (error) {
    console.error('❌ Erreur vérification persistance:', error);
  }
})();

/**
 * 🚀 Vérifier que les index de performance sont bien créés
 * Important pour les performances des requêtes de catégories
 */
async function verifyPerformanceIndexes(): Promise<void> {
  try {
    console.log('🔍 [DB] Vérification des index de performance...');

    // Liste des index critiques pour les catégories
    const criticalIndexes = [
      'idx_channels_playlist_id',
      'idx_channels_playlist_group',
      'idx_channels_name',
      'idx_channels_playlist_favorite',
      'idx_channels_last_watched'
    ];

    // 🚀 Requête SQL directe pour vérifier les index (méthode correcte)
    const indexCheckQuery = `
      SELECT name FROM sqlite_master
      WHERE type='index'
      AND tbl_name='channels'
      AND name LIKE 'idx_channels_%'
    `;

    // Utiliser la bonne méthode database.adapter.query() comme dans CategoriesService
    let existingIndexes: any[] = [];
    let existingIndexNames: string[] = [];

    try {
      existingIndexes = await database.adapter.query(indexCheckQuery, []);
      existingIndexNames = existingIndexes.map((row: any) => row.name);
    } catch (queryError) {
      // Les index seront créés par les migrations WatermelonDB (silencieux au premier démarrage)
      return;
    }

    console.log(`📊 [DB] Index trouvés: ${existingIndexNames.length}/${criticalIndexes.length}`);

    // Vérifier chaque index critique
    criticalIndexes.forEach(indexName => {
      if (existingIndexNames.includes(indexName)) {
        console.log(`✅ [DB] Index ${indexName}: OK`);
      } else {
        console.log(`⚠️ [DB] Index ${indexName}: MANQUANT`);
      }
    });

    if (existingIndexNames.length >= criticalIndexes.length) {
      console.log('🚀 [DB] Tous les index critiques sont présents - Performances optimales');
    } else {
      console.log('⚠️ [DB] Certains index manquent - Performances dégradées');
      console.log(`   Index existants: ${existingIndexNames.join(', ')}`);

      // 🚀 Si peu d'index trouvés, essayer de les créer manuellement
      if (existingIndexNames.length < 3) {
        console.log('⚠️ [DB] Peu d\'index trouvés, tentative de création manuelle...');
        await createMissingIndexes();
      }
    }

  } catch (error) {
    console.warn('⚠️ [DB] Vérification des index non disponible (normal au premier démarrage)');
    console.log('   Les index seront créés automatiquement par les migrations WatermelonDB');
    // Ne pas essayer de créer les index manuellement, laisser les migrations le faire
  }
}

/**
 * 🚀 Créer manuellement les index manquants (fallback)
 * Utilisé si la migration ne s'est pas exécutée correctement
 */
async function createMissingIndexes(): Promise<void> {
  try {
    console.log('🔧 [DB] Création manuelle des index de performance...');

    const indexCommands = [
      'CREATE INDEX IF NOT EXISTS idx_channels_playlist_id ON channels(playlist_id)',
      'CREATE INDEX IF NOT EXISTS idx_channels_playlist_group ON channels(playlist_id, group_title)',
      'CREATE INDEX IF NOT EXISTS idx_channels_name ON channels(name)',
      'CREATE INDEX IF NOT EXISTS idx_channels_playlist_favorite ON channels(playlist_id, is_favorite)',
      'CREATE INDEX IF NOT EXISTS idx_channels_last_watched ON channels(last_watched)',
      'CREATE INDEX IF NOT EXISTS idx_channels_adult ON channels(is_adult)'
    ];

    for (const command of indexCommands) {
      try {
        // Utiliser database.adapter.query() pour la création d'index
        await database.adapter.query(command, []);
        const indexName = command.match(/idx_\w+/)?.[0] || 'unknown';
        console.log(`✅ [DB] Index créé: ${indexName}`);
      } catch (indexError) {
        console.log(`⚠️ [DB] Index déjà existant ou erreur: ${indexError.message}`);
      }
    }

    console.log('🚀 [DB] Création manuelle des index terminée');

  } catch (error) {
    console.error('❌ [DB] Erreur création manuelle index:', error);
  }
}

export default database;
