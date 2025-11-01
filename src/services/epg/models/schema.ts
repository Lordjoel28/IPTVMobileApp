/**
 * 📺 WatermelonDB Schema - EPG Database
 * Schéma de base de données SQLite pour EPG
 */

import {appSchema, tableSchema} from '@nozbe/watermelondb';

export const epgSchema = appSchema({
  version: 1,
  tables: [
    // Table des chaînes EPG
    tableSchema({
      name: 'epg_channels',
      columns: [
        {name: 'channel_id', type: 'string', isIndexed: true},
        {name: 'display_name', type: 'string'},
        {name: 'icon_url', type: 'string', isOptional: true},
        {name: 'category', type: 'string', isIndexed: true},
        {name: 'language', type: 'string'},
        {name: 'is_active', type: 'boolean'},
        {name: 'created_at', type: 'number'},
        {name: 'updated_at', type: 'number'},
      ],
    }),

    // Table des programmes EPG
    tableSchema({
      name: 'epg_programmes',
      columns: [
        {name: 'channel_id', type: 'string', isIndexed: true},
        {name: 'title', type: 'string', isIndexed: true},
        {name: 'description', type: 'string', isOptional: true},
        {name: 'start_time', type: 'number', isIndexed: true},
        {name: 'end_time', type: 'number', isIndexed: true},
        {name: 'duration', type: 'number'},
        {name: 'category', type: 'string', isIndexed: true},
        {name: 'source_xmltv', type: 'string'},
        {name: 'created_at', type: 'number'},
        {name: 'updated_at', type: 'number'},
      ],
    }),
  ],
});

export default epgSchema;
