/**
 * 📺 EPG Data Manager - Gestionnaire central des données EPG
 * Orchestrateur intelligent avec cache mémoire et synchronisation
 */

import EPGServiceRobust from './EPGServiceRobust';
import {EPGProgram} from '../types';

interface CachedProgram {
  id: string;
  channelId: string;
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  duration: number;
  category: string;
  isLive?: boolean;
}

interface ChannelEPGData {
  currentProgram: CachedProgram | null;
  nextProgram: CachedProgram | null;
  programs: CachedProgram[];
  lastFetch: number;
  cacheExpiry: number;
}

interface EPGProgress {
  progressPercentage: number;
  remainingMinutes: number;
  programStartTime: string;
  programEndTime: string;
}

class EPGDataManager {
  private static instance: EPGDataManager;
  private memoryCache: Map<string, ChannelEPGData> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
  private syncInProgress: Set<string> = new Set();

  private constructor() {
    // Nettoyage périodique du cache
    setInterval(() => this.cleanupExpiredCache(), 10 * 60 * 1000); // 10 minutes
  }

  public static getInstance(): EPGDataManager {
    if (!EPGDataManager.instance) {
      EPGDataManager.instance = new EPGDataManager();
    }
    return EPGDataManager.instance;
  }

  /**
   * Obtient les données EPG complètes pour une chaîne
   */
  public async getChannelEPG(
    channelId: string,
    forceRefresh = false,
  ): Promise<{
    currentProgram: EPGProgram | null;
    nextProgram: EPGProgram | null;
    progressPercentage: number;
    remainingMinutes: number;
    programStartTime: string;
    programEndTime: string;
  }> {
    const now = new Date();
    const cacheKey = channelId;

    // Vérifier le cache si pas de force refresh
    if (!forceRefresh) {
      const cached = this.memoryCache.get(cacheKey);
      if (cached && now.getTime() < cached.cacheExpiry) {
        return this.formatEPGResponse(cached, now);
      }
    }

    // Éviter les requêtes parallèles pour le même channel
    if (this.syncInProgress.has(channelId)) {
      // Utiliser le cache même expiré si sync en cours
      const cached = this.memoryCache.get(cacheKey);
      if (cached) {
        return this.formatEPGResponse(cached, now);
      }
    }

    try {
      this.syncInProgress.add(channelId);

      // Récupérer depuis la base de données
      const programs = await EPGServiceRobust.getProgramsForChannel(channelId, {
        start: now.getTime() - 2 * 60 * 60 * 1000, // 2h avant maintenant
        end: now.getTime() + 24 * 60 * 60 * 1000, // 24h après maintenant
      });

      const cachedPrograms: CachedProgram[] = programs.map(p => ({
        id: p.id,
        channelId: p.channelId,
        title: p.title,
        description: p.description || '',
        startTime: p.startTime,
        endTime: p.stopTime,
        duration: Math.ceil((p.stopTime - p.startTime) / (1000 * 60)),
        category: 'Programme TV',
        isLive: now.getTime() >= p.startTime && now.getTime() <= p.stopTime,
      }));

      // Identifier programme actuel et suivant
      const currentTime = now.getTime();
      const currentProgram =
        cachedPrograms.find(
          p => currentTime >= p.startTime && currentTime <= p.endTime,
        ) || null;

      const nextProgram =
        cachedPrograms.find(p => p.startTime > currentTime) || null;

      // Mettre en cache
      const epgData: ChannelEPGData = {
        currentProgram,
        nextProgram,
        programs: cachedPrograms,
        lastFetch: now.getTime(),
        cacheExpiry: now.getTime() + this.cacheTimeout,
      };

      this.memoryCache.set(cacheKey, epgData);

      return this.formatEPGResponse(epgData, now);
    } catch (error) {
      console.error('[EPGDataManager] Error fetching channel EPG:', error);

      // Fallback vers données mockées si pas de cache et erreur
      const cached = this.memoryCache.get(cacheKey);
      if (cached) {
        return this.formatEPGResponse(cached, now);
      }

      return this.createFallbackEPG(channelId, now);
    } finally {
      this.syncInProgress.delete(channelId);
    }
  }

  /**
   * Synchronise les données EPG depuis une source externe
   */
  public async syncEPGData(
    epgUrl: string,
    playlistId: string,
  ): Promise<{
    success: boolean;
    error?: string;
    programsCount?: number;
  }> {
    console.log(`[EPGDataManager] Syncing EPG data from ${epgUrl}`);

    try {
      const result = await EPGServiceRobust.fetchAndProcessEPG(
        epgUrl,
        playlistId,
      );

      if (result.success) {
        // Invalider le cache pour forcer un rafraîchissement
        this.invalidateCacheForPlaylist(playlistId);
        console.log(
          `[EPGDataManager] Successfully synced ${result.programsCount} programs`,
        );
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('[EPGDataManager] Sync failed:', errorMessage);
      return {success: false, error: errorMessage};
    }
  }

  /**
   * Obtient le statut de synchronisation EPG
   */
  public getSyncStatus(playlistId: string) {
    return EPGServiceRobust.getStatus(playlistId);
  }

  /**
   * Précharge les données EPG pour plusieurs chaînes
   */
  public async preloadChannelsEPG(channelIds: string[]): Promise<void> {
    const promises = channelIds.map(channelId =>
      this.getChannelEPG(channelId).catch(error => {
        console.warn(`[EPGDataManager] Failed to preload ${channelId}:`, error);
        return null;
      }),
    );

    await Promise.allSettled(promises);
    console.log(
      `[EPGDataManager] Preloaded EPG for ${channelIds.length} channels`,
    );
  }

  /**
   * Nettoie les données EPG expirées
   */
  public async cleanupExpiredData(): Promise<{
    cleanedPrograms: number;
    cleanedCache: number;
  }> {
    const cleanedPrograms = await EPGServiceRobust.cleanupOldPrograms(24); // 24h
    const cleanedCache = this.cleanupExpiredCache();

    return {cleanedPrograms, cleanedCache};
  }

  /**
   * Obtient des statistiques sur le cache EPG
   */
  public getCacheStats() {
    const now = Date.now();
    const totalEntries = this.memoryCache.size;
    let validEntries = 0;
    let totalPrograms = 0;

    this.memoryCache.forEach(data => {
      if (data.cacheExpiry > now) {
        validEntries++;
      }
      totalPrograms += data.programs.length;
    });

    return {
      totalEntries,
      validEntries,
      expiredEntries: totalEntries - validEntries,
      totalPrograms,
      cacheHitRate: (validEntries / Math.max(1, totalEntries)) * 100,
    };
  }

  // Méthodes privées

  private formatEPGResponse(epgData: ChannelEPGData, now: Date) {
    const {currentProgram, nextProgram} = epgData;

    let progressPercentage = 0;
    let remainingMinutes = 0;
    let programStartTime = now.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    let programEndTime = new Date(now.getTime() + 3600000).toLocaleTimeString(
      'fr-FR',
      {hour: '2-digit', minute: '2-digit'},
    );

    if (currentProgram) {
      const currentTime = now.getTime();
      const startTime = currentProgram.startTime;
      const endTime = currentProgram.endTime;

      // Calcul de la progression comme TiviMate
      progressPercentage = Math.max(
        0,
        Math.min(
          100,
          ((currentTime - startTime) / (endTime - startTime)) * 100,
        ),
      );

      remainingMinutes = Math.max(
        0,
        Math.ceil((endTime - currentTime) / (1000 * 60)),
      );

      programStartTime = new Date(startTime).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });

      programEndTime = new Date(endTime).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    return {
      currentProgram: currentProgram
        ? this.convertToEPGProgram(currentProgram)
        : null,
      nextProgram: nextProgram ? this.convertToEPGProgram(nextProgram) : null,
      progressPercentage,
      remainingMinutes,
      programStartTime,
      programEndTime,
    };
  }

  private convertToEPGProgram(cached: CachedProgram): EPGProgram {
    return {
      id: cached.id,
      channelId: cached.channelId,
      title: cached.title,
      description: cached.description,
      startTime: new Date(cached.startTime).toISOString(),
      endTime: new Date(cached.endTime).toISOString(),
      duration: cached.duration,
      category: cached.category,
      isLive: cached.isLive,
    };
  }

  private createFallbackEPG(channelId: string, now: Date) {
    // Créer un programme de 2h comme fallback
    const startHour = Math.floor(now.getHours() / 2) * 2;
    const startTime = new Date(now);
    startTime.setHours(startHour, 0, 0, 0);

    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + 2);

    const nextStartTime = new Date(endTime);
    const nextEndTime = new Date(nextStartTime);
    nextEndTime.setHours(nextStartTime.getHours() + 2);

    const currentTime = now.getTime();
    const progressPercentage =
      ((currentTime - startTime.getTime()) /
        (endTime.getTime() - startTime.getTime())) *
      100;
    const remainingMinutes = Math.ceil(
      (endTime.getTime() - currentTime) / (1000 * 60),
    );

    return {
      currentProgram: {
        id: `fallback-current-${channelId}`,
        channelId,
        title: 'Diffusion en cours',
        description: 'Programme actuellement diffusé',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: 120,
        category: 'Général',
        isLive: true,
      },
      nextProgram: {
        id: `fallback-next-${channelId}`,
        channelId,
        title: 'Programme suivant',
        description: 'À suivre sur cette chaîne',
        startTime: nextStartTime.toISOString(),
        endTime: nextEndTime.toISOString(),
        duration: 120,
        category: 'Général',
        isLive: false,
      },
      progressPercentage: Math.max(0, Math.min(100, progressPercentage)),
      remainingMinutes: Math.max(0, remainingMinutes),
      programStartTime: startTime.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      programEndTime: endTime.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  }

  private cleanupExpiredCache(): number {
    const now = Date.now();
    let cleanedCount = 0;

    this.memoryCache.forEach((data, key) => {
      if (data.cacheExpiry < now) {
        this.memoryCache.delete(key);
        cleanedCount++;
      }
    });

    return cleanedCount;
  }

  private invalidateCacheForPlaylist(playlistId: string) {
    // Pour l'instant, on invalide tout le cache
    // TODO: Améliorer pour invalider seulement les chaînes de cette playlist
    this.memoryCache.clear();
  }
}

export default EPGDataManager.getInstance();
