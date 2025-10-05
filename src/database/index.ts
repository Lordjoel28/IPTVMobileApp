/**
 * 🍉 WatermelonDB Database - Configuration principale
 * Base de données optimisée pour 25K+ chaînes IPTV
 */

import {Database} from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import schema from './schema';
import {Playlist, Channel, Category, Program} from './models';

// Configuration de l'adaptateur SQLite optimisé avec PERSISTANCE
const adapter = new SQLiteAdapter({
  schema,
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
  modelClasses: [Playlist, Channel, Category, Program],
  actionsEnabled: true, // Activer les actions pour le debugging
});

// 🔍 VÉRIFICATION PERSISTANCE au démarrage
(async () => {
  try {
    const playlistsCount = await database.get<Playlist>('playlists').query().fetchCount();
    const channelsCount = await database.get<Channel>('channels').query().fetchCount();

    if (playlistsCount > 0 || channelsCount > 0) {
      console.log('🎉 PERSISTANCE OK - Données récupérées depuis disque:');
      console.log(`   📋 ${playlistsCount} playlists`);
      console.log(`   📺 ${channelsCount} chaînes`);
    } else {
      console.log('📱 Base WatermelonDB vide - Premier démarrage');
    }
  } catch (error) {
    console.error('❌ Erreur vérification persistance:', error);
  }
})();

export default database;
