/**
 * 📺 SQLite EPG Storage - Version WatermelonDB
 *
 * Utilise WatermelonDB pour une vraie base de données SQLite
 * Performance optimale pour gros volumes EPG IPTV (50K+ programmes)
 */

import {
  FullEPGData,
  EPGChannel as XtreamEPGChannel,
  EPGProgramme as XtreamEPGProgramme,
} from '../XtreamEPGService';
import {Q} from '@nozbe/watermelondb';
import epgDatabase from './database';
import EPGChannel from './models/EPGChannel';
import EPGProgramme from './models/EPGProgramme';

// Interfaces pour compatibilité avec l'API existante
interface SQLiteEPGChannel {
  id: string;
  channel_id: string;
  display_name: string;
  icon_url?: string;
  category: string;
  language: string;
  is_active: boolean;
  last_updated: number;
}

interface SQLiteEPGProgramme {
  id: string;
  channel_id: string;
  title: string;
  description?: string;
  start_time: number;
  end_time: number;
  duration: number;
  category: string;
  source_xmltv: string;
}

/**
 * Parse une date au format XMLTV vers timestamp
 */
function parseEPGDate(dateString: string): number | null {
  try {
    const match = dateString.match(
      /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*(.*)$/,
    );
    if (match) {
      const [, year, month, day, hour, minute, second] = match;
      const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
      const date = new Date(isoString);
      return isNaN(date.getTime()) ? null : date.getTime();
    }
    const directDate = new Date(dateString);
    return isNaN(directDate.getTime()) ? null : directDate.getTime();
  } catch (error) {
    return null;
  }
}

/**
 * Service SQLite EPG avec WatermelonDB - Vraie base de données
 */
export class SQLiteEPGStorage {
  private isInitialized = false;
  private database = epgDatabase;

  /**
   * Initialise la base de données SQLite WatermelonDB avec vérification persistance
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log(
        '🔄 [SQLiteEPG] Initialisation WatermelonDB SQLite avec persistance...',
      );

      // Attendre que la base soit prête
      await new Promise(resolve => setTimeout(resolve, 100));

      // Vérifier la persistance existante
      const channelsCount = await this.database
        .get<EPGChannel>('epg_channels')
        .query()
        .fetchCount();
      const programmesCount = await this.database
        .get<EPGProgramme>('epg_programmes')
        .query()
        .fetchCount();

      this.isInitialized = true;

      if (channelsCount > 0 || programmesCount > 0) {
        console.log(
          `🎉 [SQLiteEPG] PERSISTANCE RÉUSSIE! WatermelonDB récupéré - ${channelsCount} chaînes, ${programmesCount} programmes en base`,
        );

        // Vérifier si ce sont des données de test
        const channels = await this.database
          .get<EPGChannel>('epg_channels')
          .query()
          .fetch();
        const isTestData = channels.some(ch =>
          ch.channelId.startsWith('test_channel_'),
        );

        if (isTestData) {
          console.log(
            '🧪 [SQLiteEPG] Données de test détectées - persistance fonctionnelle!',
          );
        }
      } else {
        console.log(
          `📱 [SQLiteEPG] WatermelonDB initialisé (base vide) - ${channelsCount} chaînes, ${programmesCount} programmes`,
        );
        console.log('✅ [SQLiteEPG] Base prête pour vraies données EPG');
      }

      // Diagnostic de la base
      await this.diagnosticDatabase();
    } catch (error) {
      console.error(
        '❌ [SQLiteEPG] Erreur initialisation WatermelonDB:',
        error,
      );
      this.isInitialized = true;
    }
  }

  /**
   * Diagnostic de la base de données pour le debugging
   */
  private async diagnosticDatabase(): Promise<void> {
    try {
      console.log('🔍 [SQLiteEPG] Diagnostic de la base de données...');

      // Vérifier les collections spécifiques
      try {
        const channelsCollection =
          this.database.get<EPGChannel>('epg_channels');
        const programmesCollection =
          this.database.get<EPGProgramme>('epg_programmes');

        const channelsCount = await channelsCollection.query().fetchCount();
        const programmesCount = await programmesCollection.query().fetchCount();

        console.log('📊 [SQLiteEPG] Collections trouvées:');
        console.log(`  📋 epg_channels: ${channelsCount} enregistrements`);
        console.log(`  📋 epg_programmes: ${programmesCount} enregistrements`);
      } catch (collectionError) {
        console.error('❌ [SQLiteEPG] Erreur accès collections:', {
          message: collectionError.message,
          name: collectionError.name,
        });

        // Test alternatif pour vérifier les collections
        try {
          const collectionsMap = this.database.collections;
          console.log(
            '📊 [SQLiteEPG] Collections map keys:',
            Object.keys(collectionsMap),
          );

          // Vérifier si les collections existent
          if (collectionsMap.epg_channels) {
            console.log('✅ [SQLiteEPG] Collection epg_channels existe');
          } else {
            console.error('❌ [SQLiteEPG] Collection epg_channels MANQUANTE');
          }

          if (collectionsMap.epg_programmes) {
            console.log('✅ [SQLiteEPG] Collection epg_programmes existe');
          } else {
            console.error('❌ [SQLiteEPG] Collection epg_programmes MANQUANTE');
          }
        } catch (mapError) {
          console.error(
            '❌ [SQLiteEPG] Erreur collections map:',
            mapError.message,
          );
        }
      }

      // Informations sur l'adaptateur (mise à jour)
      console.log('⚙️ [SQLiteEPG] Adaptateur SQLite configuré avec:', {
        dbName: 'iptv_epg_database.db',
        experimentalUseJSI: false, // Mis à jour
        synchronous: 'NORMAL',
        migrationsExperimental: false,
      });
    } catch (error) {
      console.error('❌ [SQLiteEPG] Erreur diagnostic générale:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
    }
  }

  /**
   * Sauvegarde les données EPG complètes dans WatermelonDB
   */
  async saveFullEPG(epgData: FullEPGData): Promise<void> {
    try {
      console.log('💾 [SQLiteEPG] Sauvegarde EPG dans WatermelonDB...');

      // Filtrer les programmes (fenêtre 24h glissante optimisée)
      const now = Date.now();
      const windowStart = now - 2 * 60 * 60 * 1000; // 2h dans le passé
      const windowEnd = now + 22 * 60 * 60 * 1000; // 22h dans le futur

      console.log(
        '🎯 [SQLiteEPG] Fenêtre temporelle:',
        new Date(windowStart).toLocaleString(),
        '→',
        new Date(windowEnd).toLocaleString(),
      );

      const relevantPrograms = epgData.programmes.filter(program => {
        const startTime = parseEPGDate(program.start);
        const endTime = parseEPGDate(program.stop);

        if (!startTime || !endTime) {
          return false;
        }

        return (
          (startTime >= windowStart && startTime <= windowEnd) ||
          (startTime <= now && endTime >= now)
        );
      });

      console.log(
        `📊 [SQLiteEPG] Programmes filtrés: ${relevantPrograms.length}/${
          epgData.programmes.length
        } (${Math.round(
          (relevantPrograms.length / epgData.programmes.length) * 100,
        )}%)`,
      );

      // Transaction WatermelonDB pour performance avec logs détaillés
      await this.database.write(async () => {
        console.log('🔄 [SQLiteEPG] Début transaction WatermelonDB...');

        // 1. Nettoyer les anciennes données
        const oldChannels = await this.database
          .get<EPGChannel>('epg_channels')
          .query()
          .fetch();
        const oldProgrammes = await this.database
          .get<EPGProgramme>('epg_programmes')
          .query()
          .fetch();

        console.log(
          `🗑️ [SQLiteEPG] Suppression: ${oldChannels.length} anciennes chaînes, ${oldProgrammes.length} anciens programmes`,
        );

        if (oldChannels.length > 0 || oldProgrammes.length > 0) {
          // Supprimer en batch pour performance
          await this.database.batch(
            ...oldChannels.map(channel => channel.prepareDestroyPermanently()),
            ...oldProgrammes.map(programme =>
              programme.prepareDestroyPermanently(),
            ),
          );
          console.log('✅ [SQLiteEPG] Anciennes données supprimées');
        }

        // 2. Créer les nouvelles chaînes
        console.log(
          `📺 [SQLiteEPG] Préparation de ${epgData.channels.length} nouvelles chaînes...`,
        );
        const channelActions = epgData.channels.map(channel =>
          this.database
            .get<EPGChannel>('epg_channels')
            .prepareCreate(record => {
              record.channelId = channel.id;
              record.displayName = channel.displayName;
              record.iconUrl = channel.icon;
              record.category = this.extractCategory(channel.displayName);
              record.language = 'fr';
              record.isActive = true;
            }),
        );

        // 3. Créer les nouveaux programmes
        console.log(
          `📋 [SQLiteEPG] Préparation de ${relevantPrograms.length} nouveaux programmes...`,
        );
        const programmeActions = relevantPrograms.map((program, index) => {
          const startTime = parseEPGDate(program.start)!;
          const endTime = parseEPGDate(program.stop)!;

          if (index % 10000 === 0 && index > 0) {
            console.log(
              `  📊 [SQLiteEPG] Progression: ${index}/${relevantPrograms.length} programmes préparés`,
            );
          }

          return this.database
            .get<EPGProgramme>('epg_programmes')
            .prepareCreate(record => {
              record.channelId = program.channel;
              record.title = program.title || 'Programme sans titre';
              record.description = (program.desc || '').substring(0, 500);
              record.startTime = startTime;
              record.endTime = endTime;
              record.duration = Math.round((endTime - startTime) / (1000 * 60));
              record.category = this.extractCategory(program.title || '');
              record.sourceXmltv = epgData.source || 'unknown';
            });
        });

        console.log(
          `💾 [SQLiteEPG] Exécution batch: ${
            channelActions.length + programmeActions.length
          } opérations...`,
        );

        // Exécuter toutes les créations en batch
        const totalOperations = channelActions.length + programmeActions.length;

        // Diviser en chunks pour éviter les problèmes de mémoire
        const chunkSize = 5000;
        const allOperations = [...channelActions, ...programmeActions];

        for (let i = 0; i < allOperations.length; i += chunkSize) {
          const chunk = allOperations.slice(i, i + chunkSize);
          await this.database.batch(...chunk);
          console.log(
            `  📦 [SQLiteEPG] Chunk ${
              Math.floor(i / chunkSize) + 1
            }/${Math.ceil(totalOperations / chunkSize)} sauvegardé`,
          );
        }

        console.log(
          '✅ [SQLiteEPG] Transaction WatermelonDB terminée avec succès',
        );
      });

      console.log(
        `✅ [SQLiteEPG] Sauvegarde WatermelonDB terminée: ${epgData.channels.length} chaînes, ${relevantPrograms.length} programmes`,
      );

      // Vérification immédiate de la persistance
      await this.verifyPersistence();

      // Forcer la synchronisation du fichier SQLite
      await this.forceDatabaseSync();
    } catch (error) {
      console.error('❌ [SQLiteEPG] Erreur sauvegarde WatermelonDB:', error);
      throw error;
    }
  }

  /**
   * Vérification immédiate que les données sont bien sauvegardées
   */
  private async verifyPersistence(): Promise<void> {
    try {
      console.log('🔍 [SQLiteEPG] Vérification de la persistance...');

      const channelsCount = await this.database
        .get<EPGChannel>('epg_channels')
        .query()
        .fetchCount();
      const programmesCount = await this.database
        .get<EPGProgramme>('epg_programmes')
        .query()
        .fetchCount();

      if (channelsCount > 0 && programmesCount > 0) {
        console.log(
          `✅ [SQLiteEPG] Persistance vérifiée: ${channelsCount} chaînes, ${programmesCount} programmes en base`,
        );
      } else {
        console.error(
          `❌ [SQLiteEPG] PROBLÈME PERSISTANCE: ${channelsCount} chaînes, ${programmesCount} programmes trouvés`,
        );
      }
    } catch (error) {
      console.error('❌ [SQLiteEPG] Erreur vérification persistance:', error);
    }
  }

  /**
   * Force la synchronisation de la base de données SQLite
   */
  private async forceDatabaseSync(): Promise<void> {
    try {
      console.log('🔄 [SQLiteEPG] Forçage de la synchronisation SQLite...');

      // Attendre un peu pour laisser WatermelonDB terminer ses écritures
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('✅ [SQLiteEPG] Synchronisation SQLite forcée');
    } catch (error) {
      console.error('❌ [SQLiteEPG] Erreur synchronisation:', error);
    }
  }

  /**
   * Test de persistance simple avec quelques enregistrements
   * Pour valider que la base fonctionne avant de traiter 50K programmes
   */
  async testSimplePersistence(): Promise<boolean> {
    try {
      console.log('🧪 [SQLiteEPG] Test persistance simple - Début...');

      // Créer 2 chaînes et 3 programmes de test
      await this.database.write(async () => {
        // Supprimer les données existantes
        const oldChannels = await this.database
          .get<EPGChannel>('epg_channels')
          .query()
          .fetch();
        const oldProgrammes = await this.database
          .get<EPGProgramme>('epg_programmes')
          .query()
          .fetch();

        if (oldChannels.length > 0 || oldProgrammes.length > 0) {
          await this.database.batch(
            ...oldChannels.map(ch => ch.prepareDestroyPermanently()),
            ...oldProgrammes.map(prog => prog.prepareDestroyPermanently()),
          );
        }

        // Créer 2 chaînes test
        const testChannels = [
          this.database
            .get<EPGChannel>('epg_channels')
            .prepareCreate(record => {
              record.channelId = 'test_channel_1';
              record.displayName = 'Chaîne Test 1';
              record.category = 'Test';
              record.language = 'fr';
              record.isActive = true;
            }),
          this.database
            .get<EPGChannel>('epg_channels')
            .prepareCreate(record => {
              record.channelId = 'test_channel_2';
              record.displayName = 'Chaîne Test 2';
              record.category = 'Test';
              record.language = 'fr';
              record.isActive = true;
            }),
        ];

        // Créer 3 programmes test
        const now = Date.now();
        const testProgrammes = [
          this.database
            .get<EPGProgramme>('epg_programmes')
            .prepareCreate(record => {
              record.channelId = 'test_channel_1';
              record.title = 'Programme Test 1';
              record.description = 'Description test 1';
              record.startTime = now;
              record.endTime = now + 60 * 60 * 1000;
              record.duration = 60;
              record.category = 'Test';
              record.sourceXmltv = 'test';
            }),
          this.database
            .get<EPGProgramme>('epg_programmes')
            .prepareCreate(record => {
              record.channelId = 'test_channel_1';
              record.title = 'Programme Test 2';
              record.description = 'Description test 2';
              record.startTime = now + 60 * 60 * 1000;
              record.endTime = now + 120 * 60 * 1000;
              record.duration = 60;
              record.category = 'Test';
              record.sourceXmltv = 'test';
            }),
          this.database
            .get<EPGProgramme>('epg_programmes')
            .prepareCreate(record => {
              record.channelId = 'test_channel_2';
              record.title = 'Programme Test 3';
              record.description = 'Description test 3';
              record.startTime = now;
              record.endTime = now + 90 * 60 * 1000;
              record.duration = 90;
              record.category = 'Test';
              record.sourceXmltv = 'test';
            }),
        ];

        await this.database.batch(...testChannels, ...testProgrammes);
      });

      // Vérifier immédiatement
      const channelsCount = await this.database
        .get<EPGChannel>('epg_channels')
        .query()
        .fetchCount();
      const programmesCount = await this.database
        .get<EPGProgramme>('epg_programmes')
        .query()
        .fetchCount();

      console.log(
        `🧪 [SQLiteEPG] Test données créées: ${channelsCount} chaînes, ${programmesCount} programmes`,
      );

      // Forcer la synchronisation
      await this.forceDatabaseSync();

      const success = channelsCount === 2 && programmesCount === 3;
      console.log(
        `🧪 [SQLiteEPG] Test persistance simple: ${
          success ? '✅ SUCCÈS' : '❌ ÉCHEC'
        }`,
      );

      return success;
    } catch (error) {
      console.error('❌ [SQLiteEPG] Erreur test persistance simple:', error);
      return false;
    }
  }

  /**
   * Récupère les programmes d'une chaîne depuis WatermelonDB
   */
  async getProgrammesForChannel(
    channelId: string,
    startTime?: number,
    endTime?: number,
    options?: {
      includeCurrent?: boolean;
      maxPrograms?: number;
      includeDescription?: boolean;
    },
  ): Promise<SQLiteEPGProgramme[]> {
    try {
      const now = Date.now();
      const queryStartTime = startTime || now;
      const queryEndTime = endTime || now + 24 * 60 * 60 * 1000;
      const maxPrograms = options?.maxPrograms || 50;
      const includeCurrent = options?.includeCurrent !== false;

      console.log(
        `🔍 [SQLiteEPG] Recherche WatermelonDB programmes pour ${channelId}`,
      );

      // Requête WatermelonDB optimisée avec index
      let query = this.database.get<EPGProgramme>('epg_programmes').query(
        Q.where('channel_id', channelId),
        Q.or(
          // Programme actuel
          Q.and(
            Q.where('start_time', Q.lte(now)),
            Q.where('end_time', Q.gte(now)),
          ),
          // Programmes dans la fenêtre temporelle
          Q.and(
            Q.where('start_time', Q.gte(queryStartTime)),
            Q.where('start_time', Q.lte(queryEndTime)),
          ),
        ),
        Q.sortBy('start_time', Q.asc),
        Q.take(maxPrograms),
      );

      const programmes = await query.fetch();

      // Convertir en format compatible
      const result = programmes.map(prog => ({
        id: prog.id,
        channel_id: prog.channelId,
        title: prog.title,
        description:
          options?.includeDescription !== false ? prog.description : undefined,
        start_time: prog.startTime,
        end_time: prog.endTime,
        duration: prog.duration,
        category: prog.category,
        source_xmltv: prog.sourceXmltv,
      }));

      console.log(
        `✅ [SQLiteEPG] ${result.length} programmes WatermelonDB trouvés pour ${channelId}`,
      );
      return result;
    } catch (error) {
      console.error(
        '❌ [SQLiteEPG] Erreur récupération programmes WatermelonDB:',
        error,
      );
      return [];
    }
  }

  /**
   * Récupère le programme actuel d'une chaîne depuis WatermelonDB
   */
  async getCurrentProgramme(
    channelId: string,
  ): Promise<SQLiteEPGProgramme | null> {
    try {
      const now = Date.now();

      const programme = await this.database
        .get<EPGProgramme>('epg_programmes')
        .query(
          Q.where('channel_id', channelId),
          Q.where('start_time', Q.lte(now)),
          Q.where('end_time', Q.gte(now)),
        )
        .fetch();

      if (programme.length > 0) {
        const prog = programme[0];
        return {
          id: prog.id,
          channel_id: prog.channelId,
          title: prog.title,
          description: prog.description,
          start_time: prog.startTime,
          end_time: prog.endTime,
          duration: prog.duration,
          category: prog.category,
          source_xmltv: prog.sourceXmltv,
        };
      }

      return null;
    } catch (error) {
      console.error(
        '❌ [SQLiteEPG] Erreur programme actuel WatermelonDB:',
        error,
      );
      return null;
    }
  }

  /**
   * Recherche de programmes dans WatermelonDB
   */
  async searchProgrammes(
    searchTerm: string,
    limit = 50,
  ): Promise<SQLiteEPGProgramme[]> {
    try {
      const programmes = await this.database
        .get<EPGProgramme>('epg_programmes')
        .query(
          Q.where('title', Q.like(`%${Q.sanitizeLikeString(searchTerm)}%`)),
          Q.sortBy('start_time', Q.desc),
          Q.take(limit),
        )
        .fetch();

      return programmes.map(prog => ({
        id: prog.id,
        channel_id: prog.channelId,
        title: prog.title,
        description: prog.description,
        start_time: prog.startTime,
        end_time: prog.endTime,
        duration: prog.duration,
        category: prog.category,
        source_xmltv: prog.sourceXmltv,
      }));
    } catch (error) {
      console.error('❌ [SQLiteEPG] Erreur recherche WatermelonDB:', error);
      return [];
    }
  }

  /**
   * Statistiques de la base de données WatermelonDB
   */
  async getCacheStats(): Promise<{
    hasData: boolean;
    channelsCount: number;
    programmesCount: number;
    lastUpdate: string;
  }> {
    try {
      const channelsCount = await this.database
        .get<EPGChannel>('epg_channels')
        .query()
        .fetchCount();
      const programmesCount = await this.database
        .get<EPGProgramme>('epg_programmes')
        .query()
        .fetchCount();
      const hasData = channelsCount > 0;

      let lastUpdate = 'Jamais';
      if (hasData) {
        const latestChannel = await this.database
          .get<EPGChannel>('epg_channels')
          .query(Q.sortBy('updated_at', Q.desc), Q.take(1))
          .fetch();
        if (latestChannel.length > 0) {
          lastUpdate = latestChannel[0].updatedAt.toLocaleString('fr-FR');
        }
      }

      return {
        hasData,
        channelsCount,
        programmesCount,
        lastUpdate,
      };
    } catch (error) {
      console.error('❌ [SQLiteEPG] Erreur stats WatermelonDB:', error);
      return {
        hasData: false,
        channelsCount: 0,
        programmesCount: 0,
        lastUpdate: 'Erreur',
      };
    }
  }

  /**
   * Vide la base de données WatermelonDB
   */
  async clearCache(): Promise<void> {
    try {
      await this.database.write(async () => {
        // Supprimer toutes les données
        const channels = await this.database
          .get<EPGChannel>('epg_channels')
          .query()
          .fetch();
        const programmes = await this.database
          .get<EPGProgramme>('epg_programmes')
          .query()
          .fetch();

        await this.database.batch(
          ...channels.map(channel => channel.prepareDestroyPermanently()),
          ...programmes.map(programme => programme.prepareDestroyPermanently()),
        );
      });

      console.log('🗑️ [SQLiteEPG] Base de données WatermelonDB vidée');
    } catch (error) {
      console.error('❌ [SQLiteEPG] Erreur nettoyage WatermelonDB:', error);
    }
  }

  /**
   * 🚀 TiviMate Style : Méthodes pour chargement progressif par chunks
   */

  /**
   * Compte le nombre total de programmes en base
   */
  async getTotalProgramsCount(): Promise<number> {
    try {
      return await this.database
        .get<EPGProgramme>('epg_programmes')
        .query()
        .fetchCount();
    } catch (error) {
      console.error('❌ [SQLiteEPG] Erreur comptage programmes:', error);
      return 0;
    }
  }

  /**
   * Récupère tous les canaux (rapide pour initialisation)
   */
  async getAllChannels(): Promise<any[]> {
    try {
      const channels = await this.database
        .get<EPGChannel>('epg_channels')
        .query()
        .fetch();
      return channels.map((ch: any) => ({
        id: ch.channelId,
        displayName: ch.displayName,
        icon: ch.iconUrl,
      }));
    } catch (error) {
      console.error('❌ [SQLiteEPG] Erreur récupération chaînes:', error);
      return [];
    }
  }

  /**
   * Récupère un chunk de programmes (pagination)
   */
  async getProgrammesChunk(offset: number, limit: number): Promise<any[]> {
    try {
      const programmes = await this.database
        .get<EPGProgramme>('epg_programmes')
        .query(Q.sortBy('start_time', Q.asc), Q.skip(offset), Q.take(limit))
        .fetch();

      return programmes.map((prog: any) => ({
        channel: prog.channelId,
        title: prog.title,
        desc: prog.description,
        start:
          new Date(prog.startTime)
            .toISOString()
            .replace(/[-:]/g, '')
            .replace(/\.\d{3}/, '') + ' +0000',
        stop:
          new Date(prog.endTime)
            .toISOString()
            .replace(/[-:]/g, '')
            .replace(/\.\d{3}/, '') + ' +0000',
      }));
    } catch (error) {
      console.error(
        '❌ [SQLiteEPG] Erreur récupération chunk programmes:',
        error,
      );
      return [];
    }
  }

  /**
   * Extrait une catégorie depuis le nom
   */
  private extractCategory(name: string): string {
    const upperName = name.toUpperCase();

    if (upperName.includes('SPORT')) {
      return 'Sport';
    }
    if (upperName.includes('NEWS') || upperName.includes('INFO')) {
      return 'News';
    }
    if (upperName.includes('KIDS') || upperName.includes('CARTOON')) {
      return 'Kids';
    }
    if (upperName.includes('MOVIE') || upperName.includes('CINEMA')) {
      return 'Movies';
    }
    if (upperName.includes('MUSIC')) {
      return 'Music';
    }
    if (upperName.includes('DOCUMENTARY')) {
      return 'Documentary';
    }

    return 'General';
  }
}

// Instance singleton
export const SQLiteEPG = new SQLiteEPGStorage();
