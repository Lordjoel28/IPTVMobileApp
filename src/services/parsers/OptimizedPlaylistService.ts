/**
 * 🚀 OptimizedPlaylistService - Service Intégré avec StreamingParser
 * Remplace PlaylistService pour playlists 100K+ chaînes
 * Performance cible : IPTV Smarters Pro / TiviMate level
 */

import {
  streamingParser,
  StreamingParseOptions,
  ParseProgress,
} from './StreamingM3UParser';
import {networkService} from '../NetworkService';
import type {Channel} from '../../types';

export interface OptimizedImportResult {
  success: boolean;
  playlistId: string;
  totalChannels: number;
  parseTimeMs: number;
  avgSpeed: number;
  memoryPeakMB: number;
  errors: string[];
  warnings: string[];
}

export interface ImportProgressCallback {
  onProgress: (progress: ParseProgress) => void;
  onStatusChange: (status: string, details?: string) => void;
}

export class OptimizedPlaylistService {
  private abortController?: AbortController;

  /**
   * 🚀 IMPORT M3U ULTRA-OPTIMISÉ
   * Objectif : 100K chaînes en ≤ 5 secondes sans freeze UI
   */
  async importM3UOptimized(
    url: string,
    playlistName: string,
    callbacks?: ImportProgressCallback,
    options: StreamingParseOptions = {},
  ): Promise<OptimizedImportResult> {
    const startTime = Date.now();
    this.abortController = new AbortController();

    try {
      // 1. 📥 DOWNLOAD avec NetworkService robuste
      callbacks?.onStatusChange(
        'Téléchargement playlist...',
        `Connexion à ${url}`,
      );

      const content = await networkService.fetchText(url, {
        timeout:
          options.maxMemoryMB && options.maxMemoryMB > 100 ? 90000 : 60000,
        retryAttempts: 3,
      });

      const contentSizeMB = Math.round(content.length / 1024 / 1024);
      console.log(`📥 Downloaded ${contentSizeMB}MB M3U content`);

      callbacks?.onStatusChange(
        'Traitement playlist...',
        `${contentSizeMB}MB téléchargés`,
      );

      // 2. 🚀 PARSING STREAMING avec progress callbacks
      const parseResult = await streamingParser.parseStreamAsync(
        content,
        {
          chunkSize: 15000, // Plus gros chunks pour 100K+
          yieldInterval: 8000, // Yield moins fréquent
          maxMemoryMB: 200, // Plus de mémoire autorisée
          enableSQLiteStream: true, // Stream vers SQLite
          ...options,
        },
        progress => {
          // Callback progress vers UI
          callbacks?.onProgress(progress);

          // Status updates détaillés
          if (progress.channelsParsed > 0) {
            const eta =
              progress.estimatedTimeLeft > 0
                ? ` (${progress.estimatedTimeLeft}s restantes)`
                : '';
            callbacks?.onStatusChange(
              `Traitement... ${progress.channelsParsed} chaînes`,
              `${Math.round(progress.parseSpeed)} ch/s${eta}`,
            );
          }
        },
      );

      // 3. 💾 STOCKAGE optimisé avec ID unique
      const playlistId = `opt_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // TODO: Intégrer avec PlaylistStore pour stocker résultats
      // await this.storeOptimizedResults(playlistId, playlistName, parseResult);

      const totalTime = Date.now() - startTime;

      console.log('🎉 OPTIMIZED IMPORT SUCCESS');
      console.log(`├─ Channels: ${parseResult.totalChannels}`);
      console.log(
        `├─ Time: ${totalTime}ms (${parseResult.avgChannelsPerSecond} ch/s)`,
      );
      console.log(`├─ Memory Peak: ${parseResult.memoryPeakMB}MB`);
      console.log(`└─ Errors: ${parseResult.errors.length}`);

      callbacks?.onStatusChange(
        '✅ Import terminé',
        `${parseResult.totalChannels} chaînes en ${Math.round(
          totalTime / 1000,
        )}s`,
      );

      return {
        success: true,
        playlistId,
        totalChannels: parseResult.totalChannels,
        parseTimeMs: totalTime,
        avgSpeed: parseResult.avgChannelsPerSecond,
        memoryPeakMB: parseResult.memoryPeakMB,
        errors: parseResult.errors,
        warnings: parseResult.warnings,
      };
    } catch (error) {
      console.error('❌ Optimized import failed:', error);

      callbacks?.onStatusChange(
        '❌ Erreur import',
        error instanceof Error ? error.message : 'Erreur inconnue',
      );

      return {
        success: false,
        playlistId: '',
        totalChannels: 0,
        parseTimeMs: Date.now() - startTime,
        avgSpeed: 0,
        memoryPeakMB: 0,
        errors: [error instanceof Error ? error.message : 'Erreur inconnue'],
        warnings: [],
      };
    }
  }

  /**
   * 🛑 Annuler import en cours
   */
  cancelImport() {
    if (this.abortController) {
      this.abortController.abort();
      streamingParser.abort();
      console.log('🛑 Import cancelled by user');
    }
  }

  /**
   * 📊 Test de performance avec playlist exemple
   */
  async benchmarkParser(testUrls: string[] = []) {
    const defaultTestUrls = [
      'https://iptv-org.github.io/iptv/languages/fra.m3u', // ~500 chaînes
      // Ajouter URLs tests plus volumineux quand disponibles
    ];

    const urls = testUrls.length > 0 ? testUrls : defaultTestUrls;
    const results: any[] = [];

    for (const url of urls) {
      console.log(`🧪 Benchmarking: ${url}`);

      try {
        const startTime = Date.now();
        const result = await this.importM3UOptimized(url, 'Benchmark Test', {
          onProgress: progress => {
            console.log(
              `Progress: ${progress.progress}% (${progress.parseSpeed} ch/s)`,
            );
          },
          onStatusChange: (status, details) => {
            console.log(`Status: ${status} - ${details}`);
          },
        });

        results.push({
          url,
          ...result,
          totalTimeMs: Date.now() - startTime,
        });
      } catch (error) {
        console.error(`❌ Benchmark failed for ${url}:`, error);
        results.push({
          url,
          success: false,
          error: error.message,
        });
      }
    }

    console.log('\n🏆 BENCHMARK RESULTS:');
    results.forEach(result => {
      if (result.success) {
        console.log(`✅ ${result.url}`);
        console.log(`   Channels: ${result.totalChannels}`);
        console.log(
          `   Time: ${result.totalTimeMs}ms (${result.avgSpeed} ch/s)`,
        );
        console.log(`   Memory: ${result.memoryPeakMB}MB`);
      } else {
        console.log(`❌ ${result.url} - ${result.error}`);
      }
    });

    return results;
  }

  /**
   * 🧹 Cleanup ressources
   */
  dispose() {
    this.cancelImport();
    streamingParser.dispose();
  }
}

// Export singleton
export const optimizedPlaylistService = new OptimizedPlaylistService();
