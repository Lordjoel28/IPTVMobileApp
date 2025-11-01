/**
 * 🗃️ DatabaseIndexService - Gestion des index SQL pour performances optimales
 * Indexation critique pour la recherche sur 26000+ chaînes
 */

import database from '../database';

export class DatabaseIndexService {
  private static instance: DatabaseIndexService;
  private hasSqlQuerySupport: boolean | null = null; // Cache pour éviter vérifications répétées

  constructor() {
    console.log('🗃️ DatabaseIndexService initialized - Index management ready');
  }

  public static getInstance(): DatabaseIndexService {
    if (!DatabaseIndexService.instance) {
      DatabaseIndexService.instance = new DatabaseIndexService();
    }
    return DatabaseIndexService.instance;
  }

  /**
   * Vérifier une seule fois si unsafeSqlQuery est disponible
   */
  private checkSqlQuerySupport(): boolean {
    if (this.hasSqlQuerySupport !== null) {
      return this.hasSqlQuerySupport;
    }

    const underlyingAdapter = (database.adapter as any).underlyingAdapter || database.adapter;
    this.hasSqlQuerySupport = underlyingAdapter && typeof underlyingAdapter.unsafeSqlQuery === 'function';

    if (!this.hasSqlQuerySupport) {
      // Les index sont créés automatiquement via les migrations WatermelonDB (schema v4)
      console.log('📋 Index SQL gérés par les migrations WatermelonDB (schema v4)');
    } else {
      console.log('✅ Support SQL natif détecté - Création directe des index activée');
    }

    return this.hasSqlQuerySupport;
  }

  /**
   * Créer tous les index nécessaires pour les performances de recherche
   * À appeler au démarrage de l'application
   */
  async createAllIndexes(): Promise<void> {
    console.log('🚀 Création des index de performance...');

    try {
      // Index principal pour la recherche de chaînes par nom
      await this.createIndex('channels', 'idx_channels_name', 'name');

      // Index composé pour recherche par playlist + nom (très important)
      await this.createIndex('channels', 'idx_channels_playlist_name', 'playlist_id, name');

      // Index pour recherche par catégorie
      await this.createIndex('channels', 'idx_channels_category', 'group_title');

      // Index composé pour recherche par playlist + catégorie
      await this.createIndex('channels', 'idx_channels_playlist_category', 'playlist_id, group_title');

      // Index pour favoris
      await this.createIndex('channels', 'idx_channels_favorite', 'is_favorite');

      // Index pour derniers visionnés
      await this.createIndex('channels', 'idx_channels_last_watched', 'last_watched');

      // Index pour chaînes adultes (contrôle parental)
      await this.createIndex('channels', 'idx_channels_adult', 'is_adult');

      console.log('✅ Tous les index de performance créés avec succès');

    } catch (error) {
      console.error('❌ Erreur création index:', error);
      throw error;
    }
  }

  /**
   * Créer un index individuel sur une table
   */
  private async createIndex(
    tableName: string,
    indexName: string,
    columns: string
  ): Promise<void> {
    try {
      // Vérifier le support SQL une seule fois au premier appel
      const hasSqlSupport = this.checkSqlQuerySupport();

      if (!hasSqlSupport) {
        // Si pas de support SQL, on saute silencieusement (warning déjà affiché une fois)
        return;
      }

      // Créer l'index avec CREATE INDEX IF NOT EXISTS (pas besoin de vérifier l'existence)
      const sql = `CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName} (${columns})`;

      // Utiliser database.write pour les opérations SQL
      await database.write(async () => {
        const underlyingAdapter = (database.adapter as any).underlyingAdapter || database.adapter;
        await underlyingAdapter.unsafeSqlQuery(sql);
      });

      console.log(`✅ Index ${indexName} créé sur ${tableName}(${columns})`);

    } catch (error) {
      console.error(`❌ Erreur création index ${indexName}:`, error);
      // Ne pas bloquer l'app si l'indexation échoue
    }
  }

  /**
   * Vérifier si un index existe (utilisé pour le débogage)
   */
  private async indexExists(indexName: string): Promise<boolean> {
    try {
      const hasSqlSupport = this.checkSqlQuerySupport();

      if (!hasSqlSupport) {
        return false; // Pas de support, supposer que l'index n'existe pas
      }

      const underlyingAdapter = (database.adapter as any).underlyingAdapter || database.adapter;
      const result = await database.read(async () => {
        return await underlyingAdapter.unsafeSqlQuery(
          `SELECT name FROM sqlite_master WHERE type='index' AND name=?`,
          [indexName]
        );
      });
      return result && result.length > 0;

    } catch (error) {
      console.error(`❌ Erreur vérification index ${indexName}:`, error);
      return false;
    }
  }

  /**
   * Obtenir des informations sur tous les index de la table channels
   */
  async getIndexInfo(): Promise<any[]> {
    try {
      const hasSqlSupport = this.checkSqlQuerySupport();

      if (!hasSqlSupport) {
        return []; // Pas de support SQL, retourner liste vide
      }

      const underlyingAdapter = (database.adapter as any).underlyingAdapter || database.adapter;
      const result = await database.read(async () => {
        return await underlyingAdapter.unsafeSqlQuery(`
          SELECT
            name as index_name,
            tbl_name as table_name,
            sql as creation_sql
          FROM sqlite_master
          WHERE type='index'
          AND tbl_name='channels'
          ORDER BY name
        `);
      });
      return result || [];

    } catch (error) {
      console.error('❌ Erreur récupération infos index:', error);
      return [];
    }
  }

  /**
   * Analyser les performances d'une requête de recherche
   */
  async analyzeQueryPerformance(query: string, params: any[] = []): Promise<any> {
    try {
      // Utiliser EXPLAIN QUERY PLAN pour analyser la performance
      const explainQuery = `EXPLAIN QUERY PLAN ${query}`;

      const result = await database.read(async () => {
        return await database.adapter.unsafeSqlQuery(explainQuery, params);
      });

      console.log('📊 Analyse performance requête:', result);
      return result;

    } catch (error) {
      console.error('❌ Erreur analyse performance:', error);
      return null;
    }
  }

  /**
   * Optimiser la base de données (VACUUM)
   * À appeler périodiquement ou après des grosses modifications
   */
  async optimizeDatabase(): Promise<void> {
    try {
      const hasSqlSupport = this.checkSqlQuerySupport();

      if (!hasSqlSupport) {
        return; // Pas de support SQL, on saute silencieusement
      }

      console.log('🧹 Optimisation de la base de données...');

      const underlyingAdapter = (database.adapter as any).underlyingAdapter || database.adapter;

      await database.write(async () => {
        // VACUUM pour reconstruire la base et optimiser l'espace
        await underlyingAdapter.unsafeSqlQuery('VACUUM');

        // ANALYZE pour mettre à jour les statistiques de l'optimiseur
        await underlyingAdapter.unsafeSqlQuery('ANALYZE');
      });

      console.log('✅ Base de données optimisée avec succès');

    } catch (error) {
      console.error('❌ Erreur optimisation base:', error);
    }
  }

  /**
   * Supprimer un index (pour maintenance)
   */
  async dropIndex(indexName: string): Promise<void> {
    try {
      const hasSqlSupport = this.checkSqlQuerySupport();

      if (!hasSqlSupport) {
        return; // Pas de support SQL, on saute silencieusement
      }

      const underlyingAdapter = (database.adapter as any).underlyingAdapter || database.adapter;

      await database.write(async () => {
        await underlyingAdapter.unsafeSqlQuery(`DROP INDEX IF EXISTS ${indexName}`);
      });

      console.log(`🗑️ Index ${indexName} supprimé`);

    } catch (error) {
      console.error(`❌ Erreur suppression index ${indexName}:`, error);
    }
  }

  /**
   * Recréer tous les index (pour maintenance complète)
   */
  async recreateAllIndexes(): Promise<void> {
    console.log('🔄 Recréation complète des index...');

    try {
      // Supprimer tous les index existants
      const indexes = [
        'idx_channels_name',
        'idx_channels_playlist_name',
        'idx_channels_category',
        'idx_channels_playlist_category',
        'idx_channels_favorite',
        'idx_channels_last_watched',
        'idx_channels_adult'
      ];

      for (const indexName of indexes) {
        await this.dropIndex(indexName);
      }

      // Recréer tous les index
      await this.createAllIndexes();

      // Optimiser la base
      await this.optimizeDatabase();

      console.log('✅ Index recréés avec succès');

    } catch (error) {
      console.error('❌ Erreur recréation index:', error);
      throw error;
    }
  }

  /**
   * Obtenir des statistiques sur la base de données
   */
  async getDatabaseStats(): Promise<any> {
    try {
      // Utiliser les méthodes WatermelonDB natives pour compter les enregistrements
      const channelCount = await database.read(async () => {
        return await database.get('channels').query().fetchCount();
      });

      const playlistCount = await database.read(async () => {
        return await database.get('playlists').query().fetchCount();
      });

      // Pour la taille de la base, essayer avec unsafeSqlQuery ou utiliser une estimation
      let dbSize = { size_bytes: 0, databaseSizeMB: 0 };

      const hasSqlSupport = this.checkSqlQuerySupport();

      if (hasSqlSupport) {
        try {
          const underlyingAdapter = (database.adapter as any).underlyingAdapter || database.adapter;
          const sizeResult = await database.read(async () => {
            return await underlyingAdapter.unsafeSqlQuery(`
              SELECT
                page_count * page_size as size_bytes,
                page_count,
                page_size
              FROM pragma_page_count(), pragma_page_size()
            `);
          });

          if (sizeResult && sizeResult[0]) {
            dbSize = {
              size_bytes: sizeResult[0].size_bytes || 0,
              databaseSizeMB: Math.round((sizeResult[0].size_bytes || 0) / (1024 * 1024) * 100) / 100
            };
          }
        } catch (sizeError) {
          console.warn('⚠️ Impossible d\'obtenir la taille de la base:', sizeError);
          // Estimation basique: environ 1KB par chaîne
          dbSize = {
            size_bytes: channelCount * 1024,
            databaseSizeMB: Math.round((channelCount * 1024) / (1024 * 1024) * 100) / 100
          };
        }
      } else {
        // Estimation basique
        dbSize = {
          size_bytes: channelCount * 1024,
          databaseSizeMB: Math.round((channelCount * 1024) / (1024 * 1024) * 100) / 100
        };
      }

      return {
        channels: channelCount,
        playlists: playlistCount,
        databaseSize: dbSize.size_bytes,
        databaseSizeMB: dbSize.databaseSizeMB
      };

    } catch (error) {
      console.error('❌ Erreur statistiques base:', error);
      return {
        channels: 0,
        playlists: 0,
        databaseSize: 0,
        databaseSizeMB: 0
      };
    }
  }
}

// Export singleton instance
export const databaseIndexService = DatabaseIndexService.getInstance();