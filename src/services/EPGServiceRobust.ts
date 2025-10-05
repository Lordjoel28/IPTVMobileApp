/**
 * 📺 EPG Service Robuste - Electronic Program Guide
 * Service complet avec gestion d'erreurs, cache et performance optimisée
 * Basé sur les recherches TiviMate et meilleures pratiques IPTV 2025
 */

import * as RNFS from 'react-native-fs';
import {XMLParser} from 'fast-xml-parser';
import {Q} from '@nozbe/watermelondb';
import {database} from '../database';
import Program from '../database/models/Program';

interface EPGStatus {
  isLoading: boolean;
  lastUpdate: number;
  totalPrograms: number;
  error: string | null;
}

interface EPGConfig {
  batchSize: number;
  maxRetries: number;
  timeoutMs: number;
  cacheDir: string;
  maxFileSize: number; // MB
}

class EPGServiceRobust {
  private static instance: EPGServiceRobust;
  private status: Map<string, EPGStatus> = new Map();
  private config: EPGConfig;
  private activeDownloads: Set<string> = new Set();

  constructor() {
    this.config = {
      batchSize: 500,
      maxRetries: 3,
      timeoutMs: 30000, // 30 secondes
      cacheDir: RNFS.CachesDirectoryPath,
      maxFileSize: 100, // 100MB max
    };
  }

  public static getInstance(): EPGServiceRobust {
    if (!EPGServiceRobust.instance) {
      EPGServiceRobust.instance = new EPGServiceRobust();
    }
    return EPGServiceRobust.instance;
  }

  /**
   * Télécharge et traite les données EPG avec gestion robuste des erreurs
   */
  public async fetchAndProcessEPG(
    url: string,
    playlistId: string,
    retryCount = 0,
  ): Promise<{success: boolean; error?: string; programsCount?: number}> {
    const logPrefix = `[EPGService:${playlistId}]`;

    // Vérifier si un téléchargement est déjà en cours
    if (this.activeDownloads.has(playlistId)) {
      console.log(`${logPrefix} Download already in progress, skipping`);
      return {success: false, error: 'Download already in progress'};
    }

    // Marquer comme en cours
    this.activeDownloads.add(playlistId);
    this.updateStatus(playlistId, {isLoading: true, error: null});

    const tempPath = `${
      this.config.cacheDir
    }/epg_${playlistId}_${Date.now()}.xml`;

    try {
      console.log(`${logPrefix} Starting EPG processing from ${url}`);

      // Étape 1: Téléchargement avec gestion des timeouts
      const downloadResult = await this.downloadEPGFile(url, tempPath);
      if (!downloadResult.success) {
        throw new Error(downloadResult.error || 'Download failed');
      }

      // Étape 2: Validation du fichier
      const validationResult = await this.validateEPGFile(tempPath);
      if (!validationResult.isValid) {
        throw new Error(`Invalid EPG file: ${validationResult.error}`);
      }

      // Étape 3: Parsing XML optimisé
      const programs = await this.parseEPGFile(tempPath);
      if (programs.length === 0) {
        throw new Error('No programs found in EPG file');
      }

      // Étape 4: Insertion en base avec batch optimisé
      const insertResult = await this.insertProgramsBatch(programs, playlistId);
      if (!insertResult.success) {
        throw new Error(`Database insertion failed: ${insertResult.error}`);
      }

      // Succès
      this.updateStatus(playlistId, {
        isLoading: false,
        lastUpdate: Date.now(),
        totalPrograms: programs.length,
        error: null,
      });

      console.log(
        `${logPrefix} Successfully processed ${programs.length} programs`,
      );
      return {success: true, programsCount: programs.length};
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`${logPrefix} Error:`, errorMessage);

      // Retry logic
      if (retryCount < this.config.maxRetries) {
        console.log(
          `${logPrefix} Retrying... (${retryCount + 1}/${
            this.config.maxRetries
          })`,
        );
        await new Promise(resolve =>
          setTimeout(resolve, 1000 * (retryCount + 1)),
        ); // Backoff
        return this.fetchAndProcessEPG(url, playlistId, retryCount + 1);
      }

      // Échec définitif
      this.updateStatus(playlistId, {
        isLoading: false,
        error: errorMessage,
        lastUpdate: 0,
        totalPrograms: 0,
      });

      return {success: false, error: errorMessage};
    } finally {
      // Nettoyage
      this.activeDownloads.delete(playlistId);
      await this.cleanupTempFile(tempPath);
    }
  }

  /**
   * Télécharge le fichier EPG avec gestion des timeouts
   */
  private async downloadEPGFile(
    url: string,
    destPath: string,
  ): Promise<{success: boolean; error?: string}> {
    try {
      const downloadResult = await RNFS.downloadFile({
        fromUrl: url,
        toFile: destPath,
        connectionTimeout: this.config.timeoutMs,
        readTimeout: this.config.timeoutMs,
      }).promise;

      if (downloadResult.statusCode !== 200) {
        return {success: false, error: `HTTP ${downloadResult.statusCode}`};
      }

      return {success: true};
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Valide le fichier EPG téléchargé
   */
  private async validateEPGFile(
    filePath: string,
  ): Promise<{isValid: boolean; error?: string}> {
    try {
      const stats = await RNFS.stat(filePath);

      // Vérifier la taille du fichier
      const sizeInMB = stats.size / (1024 * 1024);
      if (sizeInMB > this.config.maxFileSize) {
        return {
          isValid: false,
          error: `File too large: ${sizeInMB.toFixed(1)}MB`,
        };
      }

      if (stats.size === 0) {
        return {isValid: false, error: 'Empty file'};
      }

      // Lire le début du fichier pour vérifier le format XML
      const header = await RNFS.read(filePath, 1024, 0, 'utf8');
      if (!header.includes('<?xml') && !header.includes('<tv')) {
        return {isValid: false, error: 'Not a valid XML/XMLTV file'};
      }

      return {isValid: true};
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Parse le fichier EPG avec gestion mémoire optimisée
   */
  private async parseEPGFile(filePath: string): Promise<
    Array<{
      channel: string;
      title: string;
      description: string;
      startTime: number;
      stopTime: number;
    }>
  > {
    const xmlContent = await RNFS.readFile(filePath, 'utf8');

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseAttributeValue: false,
      trimValues: true,
    });

    const epgData = parser.parse(xmlContent);

    if (!epgData.tv || !epgData.tv.programme) {
      throw new Error('Invalid XMLTV structure');
    }

    const programmes = Array.isArray(epgData.tv.programme)
      ? epgData.tv.programme
      : [epgData.tv.programme];

    const programs: Array<{
      channel: string;
      title: string;
      description: string;
      startTime: number;
      stopTime: number;
    }> = [];

    for (const prog of programmes) {
      try {
        // Parsing des dates XMLTV (format: "20241201120000 +0000")
        const startTime = this.parseXMLTVDate(prog['@_start']);
        const stopTime = this.parseXMLTVDate(prog['@_stop']);

        if (startTime && stopTime && startTime < stopTime) {
          programs.push({
            channel: prog['@_channel'] || '',
            title: this.extractText(prog.title) || 'Programme sans titre',
            description: this.extractText(prog.desc) || '',
            startTime,
            stopTime,
          });
        }
      } catch (error) {
        console.warn('[EPGService] Skipping invalid program:', error);
        continue;
      }
    }

    return programs;
  }

  /**
   * Insertion optimisée par batch avec transaction
   */
  private async insertProgramsBatch(
    programs: Array<{
      channel: string;
      title: string;
      description: string;
      startTime: number;
      stopTime: number;
    }>,
    playlistId: string,
  ): Promise<{success: boolean; error?: string}> {
    try {
      const programsCollection = database.get<Program>('programs');

      // Supprimer les anciens programmes pour cette playlist
      const oldPrograms = await programsCollection
        .query(Q.where('playlist_id', playlistId))
        .fetch();

      if (oldPrograms.length > 0) {
        await database.write(async () => {
          const deleteActions = oldPrograms.map(p =>
            p.prepareDestroyPermanently(),
          );
          await database.batch(...deleteActions);
        });
        console.log(`[EPGService] Deleted ${oldPrograms.length} old programs`);
      }

      // Insérer par batch
      let totalInserted = 0;
      const {batchSize} = this.config;

      for (let i = 0; i < programs.length; i += batchSize) {
        const batch = programs.slice(i, i + batchSize);

        await database.write(async () => {
          const createActions = batch.map(prog =>
            programsCollection.prepareCreate(p => {
              p.channelId = prog.channel;
              p.playlistId = playlistId;
              p.title = prog.title;
              p.description = prog.description;
              p.startTime = prog.startTime;
              p.stopTime = prog.stopTime;
            }),
          );

          await database.batch(...createActions);
        });

        totalInserted += batch.length;
        console.log(
          `[EPGService] Inserted batch ${Math.ceil(
            (i + batchSize) / batchSize,
          )}/${Math.ceil(programs.length / batchSize)} (${totalInserted}/${
            programs.length
          })`,
        );
      }

      return {success: true};
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Récupère les programmes pour une chaîne donnée
   */
  public async getProgramsForChannel(
    channelId: string,
    timeWindow?: {start: number; end: number},
  ): Promise<Program[]> {
    try {
      const programsCollection = database.get<Program>('programs');
      const now = Date.now();

      let query = programsCollection.query(
        Q.where('channel_id', channelId),
        Q.where('stop_time', Q.gt(timeWindow?.start || now)),
        Q.sortBy('start_time', Q.asc),
      );

      if (timeWindow?.end) {
        query = programsCollection.query(
          Q.where('channel_id', channelId),
          Q.where('start_time', Q.lt(timeWindow.end)),
          Q.where('stop_time', Q.gt(timeWindow.start)),
          Q.sortBy('start_time', Q.asc),
        );
      }

      return await query.fetch();
    } catch (error) {
      console.error('[EPGService] Error fetching programs:', error);
      return [];
    }
  }

  /**
   * Obtient le statut EPG pour une playlist
   */
  public getStatus(playlistId: string): EPGStatus | null {
    return this.status.get(playlistId) || null;
  }

  /**
   * Nettoie les anciennes données EPG
   */
  public async cleanupOldPrograms(olderThanHours = 24): Promise<number> {
    try {
      const cutoffTime = Date.now() - olderThanHours * 60 * 60 * 1000;
      const programsCollection = database.get<Program>('programs');

      const oldPrograms = await programsCollection
        .query(Q.where('stop_time', Q.lt(cutoffTime)))
        .fetch();

      if (oldPrograms.length > 0) {
        await database.write(async () => {
          const deleteActions = oldPrograms.map(p =>
            p.prepareDestroyPermanently(),
          );
          await database.batch(...deleteActions);
        });
      }

      return oldPrograms.length;
    } catch (error) {
      console.error('[EPGService] Error cleaning up old programs:', error);
      return 0;
    }
  }

  // Utilitaires privées

  private updateStatus(playlistId: string, updates: Partial<EPGStatus>) {
    const current = this.status.get(playlistId) || {
      isLoading: false,
      lastUpdate: 0,
      totalPrograms: 0,
      error: null,
    };

    this.status.set(playlistId, {...current, ...updates});
  }

  private parseXMLTVDate(dateStr: string): number | null {
    try {
      // Format XMLTV: "20241201120000 +0000" ou "20241201120000"
      const cleanDate = dateStr.replace(/\s.*$/, ''); // Enlever timezone
      if (cleanDate.length !== 14) {
        return null;
      }

      const year = parseInt(cleanDate.substr(0, 4));
      const month = parseInt(cleanDate.substr(4, 2)) - 1; // Mois 0-indexé
      const day = parseInt(cleanDate.substr(6, 2));
      const hour = parseInt(cleanDate.substr(8, 2));
      const minute = parseInt(cleanDate.substr(10, 2));
      const second = parseInt(cleanDate.substr(12, 2));

      return new Date(year, month, day, hour, minute, second).getTime();
    } catch {
      return null;
    }
  }

  private extractText(textObj: any): string {
    if (typeof textObj === 'string') {
      return textObj;
    }
    if (textObj && typeof textObj === 'object' && textObj['#text']) {
      return textObj['#text'];
    }
    return '';
  }

  private async cleanupTempFile(filePath: string): Promise<void> {
    try {
      if (await RNFS.exists(filePath)) {
        await RNFS.unlink(filePath);
      }
    } catch (error) {
      console.warn('[EPGService] Error cleaning up temp file:', error);
    }
  }
}

export default EPGServiceRobust.getInstance();
