/**
 * 🔍 Script de Vérification des Index SQL
 *
 * Copiez ce code dans votre console React Native (Remote JS Debugging)
 * pour vérifier si les index sont réellement créés dans SQLite
 */

import database from './src/database';

async function checkSQLiteIndexes() {
  console.log('🔍 ========================================');
  console.log('🔍 VÉRIFICATION DES INDEX SQL WATERMELONDB');
  console.log('🔍 ========================================\n');

  try {
    // 1. Vérifier la version du schéma
    console.log('📊 1. VERSION DU SCHÉMA');
    const versionQuery = `SELECT * FROM pragma_user_version()`;
    const versionResult = await database.adapter.query(versionQuery);
    console.log(`   Version actuelle: ${versionResult[0]?.user_version || 'inconnue'}`);
    console.log(`   Version attendue: 4 (avec index optimisés)\n`);

    // 2. Lister TOUS les index sur la table channels
    console.log('📊 2. INDEX SUR LA TABLE "channels"');
    const indexQuery = `
      SELECT name, sql
      FROM sqlite_master
      WHERE type='index'
        AND tbl_name='channels'
        AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `;

    const indexes = await database.adapter.query(indexQuery);

    if (indexes.length === 0) {
      console.log('   ❌ AUCUN INDEX TROUVÉ !');
      console.log('   ⚠️  Les migrations n\'ont pas été appliquées\n');
    } else {
      console.log(`   ✅ ${indexes.length} index trouvés:\n`);
      indexes.forEach((idx, i) => {
        console.log(`   ${i + 1}. ${idx.name}`);
        console.log(`      SQL: ${idx.sql}\n`);
      });
    }

    // 3. Vérifier les index critiques attendus
    console.log('📊 3. INDEX CRITIQUES ATTENDUS');
    const expectedIndexes = [
      'idx_channels_playlist_id',
      'idx_channels_playlist_group',
      'idx_channels_name',
      'idx_channels_playlist_favorite',
      'idx_channels_last_watched',
      'idx_channels_adult'
    ];

    const indexNames = indexes.map(idx => idx.name);
    expectedIndexes.forEach(expectedName => {
      const exists = indexNames.includes(expectedName);
      console.log(`   ${exists ? '✅' : '❌'} ${expectedName}`);
    });

    // 4. Analyser une requête de recherche
    console.log('\n📊 4. ANALYSE D\'UNE REQUÊTE DE RECHERCHE');
    const searchQuery = `
      SELECT * FROM channels
      WHERE playlist_id = 'test'
        AND name LIKE '%france%'
      LIMIT 10
    `;

    const explainQuery = `EXPLAIN QUERY PLAN ${searchQuery}`;
    const plan = await database.adapter.query(explainQuery);

    console.log('   Plan d\'exécution:');
    plan.forEach((step, i) => {
      console.log(`   ${i + 1}. ${step.detail}`);

      // Vérifier si un index est utilisé
      if (step.detail.includes('USING INDEX')) {
        console.log('      ✅ INDEX UTILISÉ !');
      } else if (step.detail.includes('SCAN')) {
        console.log('      ❌ SCAN COMPLET (lent)');
      }
    });

    // 5. Statistiques de la table
    console.log('\n📊 5. STATISTIQUES TABLE "channels"');
    const countQuery = `SELECT COUNT(*) as count FROM channels`;
    const countResult = await database.adapter.query(countQuery);
    console.log(`   Nombre de chaînes: ${countResult[0]?.count || 0}`);

    console.log('\n✅ Vérification terminée !');
    console.log('=========================================\n');

  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
  }
}

// Exécuter automatiquement
checkSQLiteIndexes();
