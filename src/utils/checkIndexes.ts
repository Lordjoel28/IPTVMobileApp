/**
 * 🔍 Vérificateur d'Index SQL - Version Simple
 * Ce fichier vérifie automatiquement si les index sont créés
 */

import database from '../database';

export async function checkSQLIndexes() {
  console.log('\n🔍 ========================================');
  console.log('🔍 VÉRIFICATION INDEX SQL');
  console.log('🔍 ========================================\n');

  try {
    // Compter le nombre d'index sur la table channels
    const indexQuery = `
      SELECT name FROM sqlite_master
      WHERE type='index'
        AND tbl_name='channels'
        AND name LIKE 'idx_channels_%'
      ORDER BY name
    `;

    // Utiliser database.read() pour wrapper la requête
    const indexes = await database.read(async () => {
      return await database.adapter.query(indexQuery);
    });

    console.log(`📊 Nombre d'index trouvés: ${indexes.length}\n`);

    if (indexes.length === 0) {
      console.log('❌ AUCUN INDEX TROUVÉ!');
      console.log('   Les optimisations SQL ne sont PAS actives');
      console.log('   Performance: LENTE (5-6 secondes)\n');
    } else {
      console.log('✅ INDEX TROUVÉS:');
      indexes.forEach((idx: any, i: number) => {
        console.log(`   ${i + 1}. ${idx.name}`);
      });

      if (indexes.length >= 5) {
        console.log('\n🚀 OPTIMISATIONS ACTIVES!');
        console.log('   Performance attendue: RAPIDE (1-2 secondes)');
      } else {
        console.log('\n⚠️ SEULEMENT ${indexes.length} INDEX');
        console.log('   Performance: MOYENNE (3-4 secondes)');
      }
    }

    console.log('\n=========================================\n');

  } catch (error) {
    console.error('❌ Erreur vérification:', error);
  }
}
