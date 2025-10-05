import * as RNFS from 'react-native-fs';
import {XMLParser} from 'fast-xml-parser';
import {Q} from '@nozbe/watermelondb';
import {database} from '../database';
import Program from '../database/models/Program';

const BATCH_SIZE = 500; // Insert 500 programs at a time

class EPGService {
  public async fetchAndProcessEPG(
    url: string,
    playlistId: string,
  ): Promise<boolean> {
    console.log(
      `[EPGService] Starting EPG processing for playlist ${playlistId} from ${url}`,
    );

    const tempPath = `${RNFS.CachesDirectoryPath}/epg_${playlistId}.xml`;

    try {
      // Step 1: Download the EPG file
      console.log(
        `[EPGService] Downloading EPG file from ${url} to ${tempPath}`,
      );
      const downloadResult = await RNFS.downloadFile({
        fromUrl: url,
        toFile: tempPath,
      }).promise;

      if (downloadResult.statusCode !== 200) {
        throw new Error(
          `Failed to download EPG file. Status code: ${downloadResult.statusCode}`,
        );
      }

      console.log('[EPGService] EPG file downloaded successfully.');

      // Step 2: Read the downloaded file
      const xmlContent = await RNFS.readFile(tempPath, 'utf8');

      // Step 3: Parse the XML content
      console.log('[EPGService] Parsing XML content...');
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
      });
      const epgData = parser.parse(xmlContent);

      if (!epgData.tv || !epgData.tv.programme) {
        throw new Error('Invalid EPG data structure.');
      }

      const programs = Array.isArray(epgData.tv.programme)
        ? epgData.tv.programme
        : [epgData.tv.programme];
      console.log(`[EPGService] Found ${programs.length} programs to process.`);

      // Step 4: Batch insert programs into the database
      const programsCollection = database.get<Program>('programs');

      // Clear old programs for this playlist to avoid duplicates
      // This is a simple approach. A more advanced implementation could update existing programs.
      const oldPrograms = await programsCollection
        .query(Q.where('playlist_id', playlistId))
        .fetch();
      if (oldPrograms.length > 0) {
        await database.write(async () => {
          const deleted = oldPrograms.map(p => p.prepareDestroyPermanently());
          await database.batch(...deleted);
        });
        console.log(`[EPGService] Deleted ${oldPrograms.length} old programs.`);
      }

      let recordsToCreate: Program[] = [];

      for (const prog of programs) {
        const startTime = new Date(
          prog['@_start'].replace(/ (\d{4})/, '$1'),
        ).getTime();
        const stopTime = new Date(
          prog['@_stop'].replace(/ (\d{4})/, '$1'),
        ).getTime();

        recordsToCreate.push(
          programsCollection.prepareCreate(p => {
            p.channelId = prog['@_channel'];
            p.playlistId = playlistId; // Utilise la propriété correcte du modèle
            p.title = prog.title['#text'] || prog.title;
            p.description = (prog.desc ? prog.desc['#text'] : '') || '';
            p.startTime = startTime;
            p.stopTime = stopTime;
          }),
        );

        if (recordsToCreate.length >= BATCH_SIZE) {
          await database.write(async () => {
            await database.batch(...recordsToCreate);
          });
          console.log(
            `[EPGService] Inserted batch of ${recordsToCreate.length} programs.`,
          );
          recordsToCreate = [];
        }
      }

      if (recordsToCreate.length > 0) {
        await database.write(async () => {
          await database.batch(...recordsToCreate);
        });
        console.log(
          `[EPGService] Inserted final batch of ${recordsToCreate.length} programs.`,
        );
      }

      console.log('[EPGService] EPG processing finished successfully.');
      return true;
    } catch (error) {
      console.error('[EPGService] Error processing EPG data:', error);
      return false;
    } finally {
      // Step 5: Cleanup - delete the temporary file
      try {
        await RNFS.unlink(tempPath);
        console.log(`[EPGService] Deleted temporary file: ${tempPath}`);
      } catch (cleanupError) {
        console.error(
          '[EPGService] Error cleaning up temporary file:',
          cleanupError,
        );
      }
    }
  }

  public async getProgramsForChannel(channelId: string): Promise<Program[]> {
    const programsCollection = database.get<Program>('programs');
    const now = Date.now();
    try {
      const programs = await programsCollection
        .query(
          Q.where('channel_id', channelId),
          Q.where('stop_time', Q.gt(now)),
          Q.sortBy('start_time', Q.asc),
        )
        .fetch();
      return programs;
    } catch (error) {
      console.error('[EPGService] Error fetching programs for channel:', error);
      return [];
    }
  }
}

export default new EPGService();
