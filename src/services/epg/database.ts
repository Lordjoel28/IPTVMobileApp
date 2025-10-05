/**
 * 📺 WatermelonDB Database Configuration
 * Configuration de la base de données SQLite pour EPG
 */

import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { epgSchema } from './models/schema';
import EPGChannel from './models/EPGChannel';
import EPGProgramme from './models/EPGProgramme';
import { Platform } from 'react-native';

// Configuration de l'adaptateur SQLite avec persistance explicite
const adapter = new SQLiteAdapter({
  schema: epgSchema,
  dbName: 'iptv_epg_database.db',
  migrationsExperimental: false,
  // Gestion d'erreurs robuste
  onSetUpError: (error: any) => {
    console.error('❌ [WatermelonDB] Database setup failed:', error);
    console.error('❌ [WatermelonDB] Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
  },
  // Configuration de performance pour gros volumes
  synchronous: 'NORMAL',
  // JSI désactivé pour compatibilité Android - causait des problèmes de persistance
  experimentalUseJSI: false,
});

// Configuration de la base de données avec vérification des models
const modelClasses = [EPGChannel, EPGProgramme];

// Vérification que les models sont correctement définis
console.log('🔍 [WatermelonDB] Models enregistrés:', modelClasses.map(Model => Model.table));

export const epgDatabase = new Database({
  adapter,
  modelClasses,
});

export default epgDatabase;