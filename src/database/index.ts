/**
 * 🍉 WatermelonDB Database - Configuration principale
 * Base de données optimisée pour 25K+ chaînes IPTV
 */

import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import schema from './schema';
import { Playlist, Channel, Category } from './models';

// Configuration de l'adaptateur SQLite optimisé
const adapter = new SQLiteAdapter({
  schema,
  // JSI désactivé temporairement pour éviter warnings React Native 0.73
  jsi: false, // Fallback vers operations asynchrones (stable)
  onSetUpError: error => {
    console.error('🚨 WatermelonDB Setup Error:', error);
  }
});

// Instance de la base de données
export const database = new Database({
  adapter,
  modelClasses: [
    Playlist,
    Channel, 
    Category
  ],
  actionsEnabled: true, // Activer les actions pour le debugging
});

export default database;