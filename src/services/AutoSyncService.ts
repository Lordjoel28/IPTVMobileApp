/**
 * 🔄 AutoSyncService v2.0 - Synchronisation automatique professionnelle
 * Niveau IPTV Smarters Pro / TiviMate
 *
 * Fonctionnalités:
 * - Synchronisation périodique configurable (12h, 24h, 3j, 7j)
 * - Sync uniquement playlist active (économie ressources)
 * - Différenciation Xtream / M3U URL / M3U Local
 * - Retry automatique avec exponential backoff
 * - Circuit breaker pattern
 * - EPG intelligent (top 50 chaînes)
 * - Background sync avec BackgroundFetch
 * - UI non-bloquante
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import BackgroundFetch from 'react-native-background-fetch';
import { AppState, AppStateStatus } from 'react-native';
import { PlaylistService } from './PlaylistService';
import epgDataManager from './EPGDataManager';
import { syncEventEmitter } from './SyncEventEmitter';
import type { Playlist } from '../types';

// ===== TYPES =====

export interface AutoSyncConfig {
  enabled: boolean;
  intervalHours: number;  // 12, 24, 72 (3j), 168 (7j)
  wifiOnly: boolean;
}

export interface SyncStats {
  lastSyncTime: number | null;
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  lastError: string | null;
}

export interface SyncResult {
  success: boolean;
  type: 'playlist' | 'epg';
  timestamp: number;
  duration: number;
  itemsUpdated?: number;
  error?: string;
}

// ===== CIRCUIT BREAKER =====

class CircuitBreaker {
  private failureCount = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private lastFailureTime = 0;
  private readonly THRESHOLD = 5;
  private readonly TIMEOUT = 60000; // 1 minute

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.TIMEOUT) {
        this.state = 'HALF_OPEN';
        console.log('🔄 Circuit breaker HALF_OPEN');
      } else {
        throw new Error('Circuit breaker OPEN - trop d\'erreurs récentes');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.THRESHOLD) {
      this.state = 'OPEN';
      console.log('⚠️ Circuit breaker OPEN - trop d\'échecs consécutifs');
    }
  }
}

// ===== SERVICE =====

class AutoSyncService {
  private static readonly CONFIG_KEY = 'auto_sync_config';
  private static readonly STATS_KEY = 'auto_sync_stats';
  private static readonly ACTIVE_PLAYLIST_KEY = 'last_selected_playlist_id';

  private config: AutoSyncConfig = {
    enabled: false,
    intervalHours: 24,  // Par défaut: 24h
    wifiOnly: true,
  };

  private stats: SyncStats = {
    lastSyncTime: null,
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    lastError: null,
  };

  // Configuration retry
  private readonly RETRY_CONFIG = {
    maxRetries: 3,
    baseDelay: 2000,      // 2 secondes
    maxDelay: 30000,      // 30 secondes max
    retryableCodes: [408, 429, 500, 502, 503, 504],
  };

  // Configuration EPG
  private readonly EPG_CONFIG = {
    enabled: true,
    maxChannels: 50,
    syncAfterPlaylists: true,
    cacheHours: 12,
    batchSize: 10,
  };

  private checkTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private isSyncing = false;
  private abortController = new AbortController();
  private circuitBreaker = new CircuitBreaker();
  private playlistService: PlaylistService;
  private appStateListener: any = null;
  private lastAppStateChangeTime: number = 0;
  private appJustStarted = true;

  // ===== INITIALISATION =====

  constructor() {
    this.playlistService = PlaylistService.getInstance();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('🔄 [AutoSync] Déjà initialisé');
      return;
    }

    console.log('🔄 [AutoSync] Initialisation v2.0...');

    // Charger config et stats
    await this.loadConfig();
    await this.loadStats();

    // Configurer BackgroundFetch
    await this.initBackgroundFetch();

    // Démarrer le timer de vérification (toutes les 30 minutes)
    this.startCheckTimer();

    // Écouter les changements d'état de l'app
    this.setupAppStateListener();

    this.isInitialized = true;
    console.log('✅ [AutoSync] Initialisé v2.0');
  }

  // ===== BACKGROUNDFETCH =====

  private async initBackgroundFetch(): Promise<void> {
    try {
      const status = await BackgroundFetch.configure({
        minimumFetchInterval: this.config.intervalHours * 60, // En minutes
        stopOnTerminate: false,
        startOnBoot: true,
        enableHeadless: true,
        requiresBatteryNotLow: true,
        requiresCharging: false,
        requiresDeviceIdle: false,
        requiresStorageNotLow: false,
      }, async (taskId) => {
        console.log('[BackgroundFetch] Task démarré:', taskId);

        if (this.config.enabled) {
          await this.performSyncWithTimeout();
        }

        BackgroundFetch.finish(taskId);
      }, (taskId) => {
        console.log('[BackgroundFetch] Timeout:', taskId);
        BackgroundFetch.finish(taskId);
      });

      console.log('✅ BackgroundFetch configuré, status:', status);
    } catch (error) {
      console.error('❌ Erreur configuration BackgroundFetch:', error);
    }
  }

  // ===== CONFIGURATION =====

  async setEnabled(enabled: boolean): Promise<void> {
    this.config.enabled = enabled;
    await this.saveConfig();

    // Notifier le scheduler
    try {
      const { reliableSyncScheduler } = require('./ReliableSyncScheduler');
      await reliableSyncScheduler.setEnabled(enabled);
    } catch (error) {
      // Silencieux
    }
  }

  async setInterval(hours: number): Promise<void> {
    this.config.intervalHours = hours;
    await this.saveConfig();

    // Reconfigurer BackgroundFetch
    await this.initBackgroundFetch();

    // Notifier le scheduler
    try {
      const { reliableSyncScheduler } = require('./ReliableSyncScheduler');
      await reliableSyncScheduler.setInterval(hours);
    } catch (error) {
      // Silencieux
    }
  }

  async setWifiOnly(wifiOnly: boolean): Promise<void> {
    this.config.wifiOnly = wifiOnly;
    await this.saveConfig();
    console.log(`📶 [AutoSync] WiFi only: ${wifiOnly}`);
  }

  getConfig(): AutoSyncConfig {
    return { ...this.config };
  }

  getStats(): SyncStats {
    return { ...this.stats };
  }

  // ===== SYNCHRONISATION PRINCIPALE =====

  async checkAndSync(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    if (this.isSyncing) {
      console.log('⏳ [AutoSync] Sync déjà en cours');
      return;
    }

    if (!this.needsSync()) {
      const nextSync = this.getNextSyncTime();
      console.log(`⏰ [AutoSync] Prochaine sync: ${new Date(nextSync).toLocaleString()}`);
      return;
    }

    if (!await this.checkConstraints()) {
      console.log('⏸️ [AutoSync] Contraintes non respectées');
      return;
    }

    await this.performSync();
  }

  async forceSync(): Promise<{ success: boolean; error?: string }> {
    console.log('⚡ [AutoSync] Synchronisation forcée');

    if (this.isSyncing) {
      return { success: false, error: 'Synchronisation déjà en cours' };
    }

    const result = await this.performSync();
    return result;
  }

  private needsSync(): boolean {
    if (!this.stats.lastSyncTime) {
      console.log('🆕 [AutoSync] Première synchronisation');
      return true;
    }

    const now = Date.now();
    const intervalMs = this.config.intervalHours * 60 * 60 * 1000;
    const timeSinceLastSync = now - this.stats.lastSyncTime;

    const needsSync = timeSinceLastSync >= intervalMs;

    if (needsSync) {
      const hours = Math.round(timeSinceLastSync / 1000 / 60 / 60);
      console.log(`🔄 [AutoSync] Sync nécessaire (${hours}h écoulées)`);
    } else {
      // 🆕 Log du temps restant avant prochaine sync
      const remainingMs = intervalMs - timeSinceLastSync;
      const remainingHours = Math.round(remainingMs / 1000 / 60 / 60);
      const remainingMinutes = Math.round((remainingMs % (60 * 60 * 1000)) / 1000 / 60);
      console.log(`⏰ [AutoSync] Prochaine sync dans ${remainingHours}h ${remainingMinutes}min`);
    }

    return needsSync;
  }

  private getNextSyncTime(): number {
    if (!this.stats.lastSyncTime) {
      return Date.now();
    }

    const intervalMs = this.config.intervalHours * 60 * 60 * 1000;
    return this.stats.lastSyncTime + intervalMs;
  }

  // ===== SYNC AVEC TIMEOUT =====

  private async performSyncWithTimeout(): Promise<{ success: boolean; error?: string }> {
    const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes max

    const syncPromise = this.performSyncInternal();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Sync timeout (5 min)')), TIMEOUT_MS);
    });

    try {
      await Promise.race([syncPromise, timeoutPromise]);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('❌ [AutoSync] Timeout ou erreur:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  private async performSync(): Promise<{ success: boolean; error?: string }> {
    return await this.performSyncWithTimeout();
  }

  private async performSyncInternal(): Promise<void> {
    const startTime = Date.now();
    this.isSyncing = true;
    this.abortController = new AbortController();

    console.log('🔄 [AutoSync] Démarrage synchronisation...');

    try {
      // 1. Vérifier contraintes
      if (!await this.checkConstraints()) {
        throw new Error('Contraintes système non respectées');
      }

      // 2. Récupérer playlist active uniquement
      const activePlaylist = await this.getActivePlaylist();

      if (!activePlaylist) {
        console.log('⚠️ [AutoSync] Aucune playlist active - Sync annulée');
        return;
      }

      console.log(`🎯 [AutoSync] Sync playlist active: ${activePlaylist.name} (${activePlaylist.type})`);

      // 3. Synchroniser playlist selon type
      await this.syncPlaylistWithRetry(activePlaylist);

      // 4. Synchroniser EPG intelligent (après playlist)
      if (this.EPG_CONFIG.enabled && this.EPG_CONFIG.syncAfterPlaylists) {
        await this.syncEPGIntelligent();
      }

      // 5. Mise à jour stats succès
      this.stats.lastSyncTime = Date.now();
      this.stats.totalSyncs++;
      this.stats.successfulSyncs++;
      this.stats.lastError = null;
      await this.saveStats();

      const duration = Date.now() - startTime;
      console.log(`✅ [AutoSync] Terminé en ${duration}ms`);

      // 🆕 Afficher la prochaine sync prévue
      const nextSyncTime = this.getNextSyncTime();
      const nextSyncDate = new Date(nextSyncTime);
      console.log(`📅 [AutoSync] Prochaine sync prévue: ${nextSyncDate.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('❌ [AutoSync] Erreur synchronisation:', errorMessage);

      // Mise à jour stats erreur
      this.stats.totalSyncs++;
      this.stats.failedSyncs++;
      this.stats.lastError = errorMessage;
      await this.saveStats();

      throw error;

    } finally {
      this.isSyncing = false;
    }
  }

  // ===== RÉCUPÉRATION PLAYLIST ACTIVE =====

  private async getActivePlaylistId(): Promise<string | null> {
    try {
      const playlistId = await AsyncStorage.getItem(AutoSyncService.ACTIVE_PLAYLIST_KEY);
      return playlistId;
    } catch (error) {
      console.error('❌ [AutoSync] Erreur récupération playlist active:', error);
      return null;
    }
  }

  private async getActivePlaylist(): Promise<Playlist | null> {
    try {
      const playlistId = await this.getActivePlaylistId();

      if (!playlistId) {
        console.log('⚠️ [AutoSync] Aucune playlist active trouvée');
        return null;
      }

      const playlists = await this.playlistService.getAllPlaylists();
      const activePlaylist = playlists.find(p => p.id === playlistId);

      if (!activePlaylist) {
        console.log(`⚠️ [AutoSync] Playlist ${playlistId} introuvable`);
        return null;
      }

      return activePlaylist;

    } catch (error) {
      console.error('❌ [AutoSync] Erreur récupération playlist active:', error);
      return null;
    }
  }

  // ===== SYNC AVEC RETRY =====

  private async syncPlaylistWithRetry(
    playlist: Playlist,
    attempt: number = 1
  ): Promise<void> {
    try {
      await this.circuitBreaker.execute(async () => {
        await this.syncPlaylistByType(playlist);
      });
    } catch (error) {
      const isLastAttempt = attempt >= this.RETRY_CONFIG.maxRetries;
      const isRetryable = this.shouldRetry(error);

      if (!isRetryable || isLastAttempt) {
        await this.handleFinalError(playlist, error);
        throw error;
      }

      // Calcul délai exponentiel
      const delay = Math.min(
        this.RETRY_CONFIG.baseDelay * Math.pow(2, attempt - 1),
        this.RETRY_CONFIG.maxDelay
      );

      console.log(`⏳ Retry ${attempt}/${this.RETRY_CONFIG.maxRetries} dans ${delay}ms`);
      await this.sleep(delay);

      return this.syncPlaylistWithRetry(playlist, attempt + 1);
    }
  }

  // ===== SYNC PAR TYPE =====

  private async syncPlaylistByType(playlist: Playlist): Promise<void> {
    switch (playlist.type?.toUpperCase()) {
      case 'XTREAM':
        return await this.syncXtreamPlaylist(playlist);

      case 'M3U':
        return await this.syncM3UUrl(playlist);

      case 'FILE':
      case 'LOCAL':
        console.log('⏭️ [AutoSync] Playlist locale - Pas de synchronisation');
        return;

      default:
        console.log(`⚠️ [AutoSync] Type playlist inconnu: ${playlist.type}`);
    }
  }

  // ===== SYNC XTREAM =====

  private async syncXtreamPlaylist(playlist: Playlist): Promise<void> {
    console.log('📡 [AutoSync] Sync Xtream playlist...');

    if (!playlist.server || !playlist.username || !playlist.password) {
      console.log('⚠️ [AutoSync] Credentials Xtream manquants');
      return;
    }

    const credentials = {
      url: playlist.server,
      username: playlist.username,
      password: playlist.password,
    };

    try {
      // Import dynamique pour éviter les dépendances circulaires
      const WatermelonXtreamService = (await import('./WatermelonXtreamService')).default;
      const VODCacheService = (await import('./VODCacheService')).default;

      // 1. Synchroniser les chaînes live TV
      console.log('📺 [AutoSync] Sync chaînes live...');
      syncEventEmitter.emitSyncStatus('in_progress', 'Synchronisation des chaînes live...', 10);

      const channels = await WatermelonXtreamService.getChannelsFromXtream(credentials);
      console.log(`📺 [AutoSync] ${channels.length} chaînes récupérées`);

      // Mettre à jour les chaînes dans WatermelonDB
      await this.updateXtreamChannelsInDatabase(playlist.id, channels);

      // 2. Synchroniser les Films et Séries VOD
      console.log('🎬 [AutoSync] Sync films et séries VOD...');
      syncEventEmitter.emitSyncStatus('in_progress', 'Synchronisation des films et séries...', 40);

      const vodStats = await VODCacheService.preloadPlaylistVOD(
        playlist.id,
        credentials,
        (stage, progress) => {
          console.log(`📊 [AutoSync] VOD: ${stage} (${progress}%)`);
        },
      );

      console.log(`🎬 [AutoSync] ${vodStats.moviesCount} films, ${vodStats.seriesCount} séries synchronisés`);

      // 3. Émettre événement de mise à jour
      syncEventEmitter.emitSyncStatus('in_progress', 'Finalisation...', 90);
      syncEventEmitter.emitPlaylistUpdated(playlist.id, playlist.name);

      // 4. Mettre à jour le compteur de chaînes dans la playlist
      const database = (await import('../database')).default;
      const playlistRecord = await database.get('playlists').find(playlist.id);
      await database.write(async () => {
        await playlistRecord.update((p: any) => {
          p.channelsCount = channels.length;
          p.updatedAt = Date.now();
        });
      });

      console.log(`✅ [AutoSync] Xtream playlist synchronisée: ${channels.length} chaînes, ${vodStats.moviesCount} films, ${vodStats.seriesCount} séries`);

    } catch (error) {
      console.error('❌ [AutoSync] Erreur sync Xtream:', error);
      throw error;
    }
  }

  private async updateXtreamChannelsInDatabase(playlistId: string, channels: any[]): Promise<void> {
    const database = (await import('../database')).default;

    console.log(`🔄 [AutoSync] Mise à jour de ${channels.length} chaînes dans WatermelonDB...`);

    await database.write(async () => {
      // Supprimer anciennes chaînes de cette playlist
      const oldChannels = await database
        .get('channels')
        .query()
        .fetch();

      const channelsToDelete = oldChannels.filter((ch: any) => ch.playlistId === playlistId);

      if (channelsToDelete.length > 0) {
        console.log(`🗑️ [AutoSync] Suppression de ${channelsToDelete.length} anciennes chaînes...`);
        for (const ch of channelsToDelete) {
          await ch.destroyPermanently();
        }
      }

      // Insérer nouvelles chaînes par chunks
      const CHUNK_SIZE = 500;
      for (let i = 0; i < channels.length; i += CHUNK_SIZE) {
        const chunk = channels.slice(i, i + CHUNK_SIZE);
        console.log(`📦 [AutoSync] Insertion chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(channels.length / CHUNK_SIZE)}`);

        for (const ch of chunk) {
          await database.get('channels').create((record: any) => {
            record.playlistId = playlistId;
            record.categoryId = ch.categoryId || '';
            record.name = ch.name;
            record.streamUrl = ch.streamUrl;
            record.logoUrl = ch.logoUrl || '';
            record.groupTitle = ch.groupTitle || '';
            record.tvgId = ch.tvgId || '';
            record.streamType = ch.streamType || 'live';
            record.streamId = ch.streamId || '';
            record.isAdult = ch.isAdult || false;
            record.isFavorite = false;
            record.watchCount = 0;
            record.createdAt = Date.now();
            record.updatedAt = Date.now();
          });
        }
      }
    });

    console.log(`✅ [AutoSync] ${channels.length} chaînes mises à jour`);
  }

  // ===== SYNC M3U URL =====

  private async syncM3UUrl(playlist: Playlist): Promise<void> {
    console.log('📡 [AutoSync] Sync M3U URL...');

    if (!playlist.url) {
      console.log('⚠️ [AutoSync] Pas d\'URL pour playlist M3U');
      return;
    }

    try {
      // Émettre événement de début de sync
      this.emitProgress(0, 'playlist', 'settings:syncCheckingUpdates');

      // 1. Vérifier modification avec HEAD request
      const response = await fetch(playlist.url, {
        method: 'HEAD',
        signal: this.abortController.signal,
        headers: {
          'User-Agent': 'IPTVMobileApp/1.0',
        },
      });

      const lastModified = response.headers.get('Last-Modified');
      const etag = response.headers.get('ETag');

      console.log('📥 [AutoSync] M3U URL Headers:', { lastModified, etag });

      // 2. Récupérer le cache
      const cacheKey = `m3u_cache_${playlist.id}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);
      const cache = cachedData ? JSON.parse(cachedData) : null;

      console.log('💾 [AutoSync] Cache:', cache);

      // 3. Comparer avec cache de manière intelligente
      // Stratégie:
      // - Privilégier Last-Modified (plus fiable que ETag)
      // - Ignorer ETag si instable (change à chaque requête)
      // - Délai minimum de 5 min entre syncs
      let needsUpdate = false;

      if (!cache) {
        console.log('🆕 [AutoSync] Pas de cache - Téléchargement nécessaire');
        needsUpdate = true;
      } else {
        // Vérifier délai minimum (5 minutes)
        const MIN_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
        const timeSinceLastSync = Date.now() - (cache.updatedAt || 0);

        if (timeSinceLastSync < MIN_SYNC_INTERVAL_MS) {
          console.log(`⏰ [AutoSync] Sync trop récente (${Math.round(timeSinceLastSync / 1000)}s) - Ignoré`);
          needsUpdate = false;
        } else if (lastModified && cache.lastModified && lastModified !== cache.lastModified) {
          // Last-Modified a changé = mise à jour confirmée
          console.log('🔄 [AutoSync] Last-Modified changé - Mise à jour détectée');
          needsUpdate = true;
        } else if (!lastModified && etag && cache.etag && etag !== cache.etag) {
          // Fallback sur ETag seulement si Last-Modified absent
          console.log('🔄 [AutoSync] ETag changé (Last-Modified absent) - Mise à jour détectée');
          needsUpdate = true;
        } else {
          console.log('✅ [AutoSync] Headers identiques - Aucune mise à jour');
          needsUpdate = false;
        }
      }

      if (!needsUpdate) {
        console.log('✅ [AutoSync] M3U inchangé (cache valide) - Aucun téléchargement');
        this.emitProgress(100, 'playlist', 'settings:syncPlaylistUpToDate');

        // Fermer le modal immédiatement (pas de sync nécessaire)
        setTimeout(() => {
          syncEventEmitter.emitSyncStatus({
            isActive: false,
            message: '',
            progress: 100,
            type: 'playlist',
            timestamp: Date.now(),
          });
        }, 500);

        return;
      }

      console.log('📥 [AutoSync] M3U modifié - Re-téléchargement...');
      this.emitProgress(10, 'playlist', 'settings:updatingPlaylist');

      // 4. Télécharger le fichier M3U complet
      const downloadResponse = await fetch(playlist.url, {
        signal: this.abortController.signal,
        headers: {
          'User-Agent': 'IPTVMobileApp/1.0',
        },
      });

      if (!downloadResponse.ok) {
        throw new Error(`HTTP ${downloadResponse.status}: ${downloadResponse.statusText}`);
      }

      const m3uContent = await downloadResponse.text();
      console.log(`📥 [AutoSync] M3U téléchargé: ${Math.round(m3uContent.length / 1024)}KB`);

      this.emitProgress(20, 'playlist', 'settings:updatingPlaylist');

      // 5. Mise à jour EN PLACE avec WatermelonM3UService (garde le même ID)
      const watermelonM3UService = require('./WatermelonM3UService').default;

      // 🚀 UPDATE EN PLACE (pas de DELETE + CREATE)
      await watermelonM3UService.updatePlaylistInPlace(
        playlist.id,  // ✅ Même ID conservé
        m3uContent,
        playlist.name,
        playlist.url,
        (progress: number, message: string) => {
          // Progression de 20% à 100%
          const adjustedProgress = 20 + Math.floor(progress * 0.8);
          this.emitProgress(adjustedProgress, 'playlist', message);
        }
      );

      console.log(`✅ [AutoSync] Playlist ${playlist.id} mise à jour EN PLACE`);

      // 6. Émettre événement pour notification du store
      const database = require('../database').default;
      const Q = require('@nozbe/watermelondb').Q;
      const channelsCollection = database.get('channels');
      const categoriesCollection = database.get('categories');

      const channelsCount = await channelsCollection
        .query(Q.where('playlist_id', playlist.id))
        .fetchCount();
      const categoriesCount = await categoriesCollection
        .query(Q.where('playlist_id', playlist.id))
        .fetchCount();

      syncEventEmitter.emitPlaylistUpdated({
        playlistId: playlist.id,
        playlistName: playlist.name,
        channelsCount,
        categoriesCount,
      });

      console.log(`📢 [AutoSync] Événement playlistUpdated émis pour ${playlist.id}`);

      // 7. Sauvegarder le nouveau cache
      await AsyncStorage.setItem(
        cacheKey,
        JSON.stringify({
          lastModified,
          etag,
          updatedAt: Date.now(),
        })
      );

      console.log('✅ [AutoSync] Playlist M3U mise à jour avec succès');
      this.emitProgress(100, 'playlist', 'settings:syncPlaylistUpdated');

      // Fermer le modal après un court délai
      setTimeout(() => {
        syncEventEmitter.emitSyncStatus({
          isActive: false,
          message: '',
          progress: 100,
          type: 'playlist',
          timestamp: Date.now(),
        });
      }, 500);

    } catch (error) {
      console.error('❌ [AutoSync] Erreur sync M3U URL:', error);

      // Fermer le modal en cas d'erreur aussi
      syncEventEmitter.emitSyncStatus({
        isActive: false,
        message: '',
        progress: 0,
        type: 'playlist',
        timestamp: Date.now(),
      });

      throw error;
    }
  }

  /**
   * Supprimer complètement une playlist (chaînes + catégories + playlist)
   */
  private async deletePlaylistCompletely(playlistId: string): Promise<void> {
    try {
      const database = require('../database').default;
      const Q = require('@nozbe/watermelondb').Q;

      await database.write(async () => {
        // 1. Supprimer les chaînes
        const channelsCollection = database.get('channels');
        const channels = await channelsCollection
          .query(Q.where('playlist_id', playlistId))
          .fetch();
        await Promise.all(channels.map((ch: any) => ch.markAsDeleted()));
        console.log(`🗑️ [AutoSync] ${channels.length} anciennes chaînes supprimées`);

        // 2. Supprimer les catégories
        const categoriesCollection = database.get('categories');
        const categories = await categoriesCollection
          .query(Q.where('playlist_id', playlistId))
          .fetch();
        await Promise.all(categories.map((cat: any) => cat.markAsDeleted()));
        console.log(`🗑️ [AutoSync] ${categories.length} catégories supprimées`);

        // 3. Supprimer la playlist elle-même
        const playlistsCollection = database.get('playlists');
        const playlist = await playlistsCollection.find(playlistId);
        await playlist.markAsDeleted();
        console.log(`🗑️ [AutoSync] Playlist supprimée: ${playlistId}`);
      });
    } catch (error) {
      console.error('❌ [AutoSync] Erreur suppression playlist:', error);
    }
  }

  // ===== EPG INTELLIGENT =====

  private async syncEPGIntelligent(): Promise<void> {
    console.log('📺 [AutoSync] Synchronisation EPG intelligente...');

    try {
      const activePlaylist = await this.getActivePlaylist();

      if (!activePlaylist) {
        console.log('⏭️ [AutoSync] Pas de playlist active');
        return;
      }

      console.log('📺 [AutoSync] Synchronisation EPG pour playlist:', activePlaylist.name);

      // IMPORTANT: Après re-import, récupérer la playlist mise à jour (peut avoir un nouvel ID)
      const playlists = await this.playlistService.getAllPlaylists();
      const refreshedPlaylist = playlists.find(p => p.name === activePlaylist.name);

      if (!refreshedPlaylist) {
        console.log('⏭️ [AutoSync] Playlist introuvable après sync');
        return;
      }

      // 1. Récupérer les top 50 chaînes les plus regardées
      const topChannels = await this.getTopWatchedChannels(
        refreshedPlaylist.id,
        this.EPG_CONFIG.maxChannels
      );

      console.log(`📺 [AutoSync] ${topChannels.length} chaînes à synchroniser (top regardées)`);

      if (topChannels.length === 0) {
        console.log('⏭️ [AutoSync] Aucune chaîne à synchroniser');
        return;
      }

      // Pas de message EPG pour ne pas encombrer l'UI
      // this.emitProgress(0, 'epg', 'settings:syncEPGProgress|0|' + topChannels.length);

      // 2. Sync par batchs
      const BATCH_SIZE = this.EPG_CONFIG.batchSize;
      let syncedCount = 0;

      for (let i = 0; i < topChannels.length; i += BATCH_SIZE) {
        const batch = topChannels.slice(i, i + BATCH_SIZE);

        // console.log(`📺 [AutoSync] Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(topChannels.length / BATCH_SIZE)}`);

        await Promise.all(
          batch.map(channel => this.syncChannelEPGSafe(channel))
        );

        syncedCount += batch.length;
        const progress = Math.round((syncedCount / topChannels.length) * 100);
        // Pas de message EPG pour ne pas encombrer l'UI
        // this.emitProgress(progress, 'epg', 'settings:syncEPGProgress|' + syncedCount + '|' + topChannels.length);

        // Pause entre batchs
        if (i + BATCH_SIZE < topChannels.length) {
          await this.sleep(500);
        }
      }

      console.log(`✅ [AutoSync] EPG synchronisé pour ${syncedCount} chaînes`);
      // Pas de message EPG pour ne pas encombrer l'UI
      // this.emitProgress(100, 'epg', 'settings:syncEPGComplete');

    } catch (error) {
      console.warn('⚠️ [AutoSync] Erreur sync EPG (non-bloquant):', error);
    }
  }

  /**
   * Récupérer les top N chaînes les plus regardées de la playlist active
   */
  private async getTopWatchedChannels(playlistId: string, limit: number): Promise<any[]> {
    try {
      const database = require('../database').default;
      const Q = require('@nozbe/watermelondb').Q;

      // 1. Récupérer l'historique de visionnage pour cette playlist
      const watchHistoryCollection = database.get('watch_history');
      const historyEntries = await watchHistoryCollection
        .query(Q.where('playlist_id', playlistId))
        .fetch();

      console.log(`📊 [AutoSync] ${historyEntries.length} entrées d'historique trouvées`);

      if (historyEntries.length === 0) {
        // Pas d'historique, prendre les premières chaînes de la playlist
        console.log('📺 [AutoSync] Pas d\'historique, utilisation premières chaînes...');
        const channelsCollection = database.get('channels');
        const channels = await channelsCollection
          .query(Q.where('playlist_id', playlistId), Q.take(limit))
          .fetch();
        return channels;
      }

      // 2. Compter les visionnages par chaîne
      const channelCounts = new Map<string, number>();
      historyEntries.forEach((entry: any) => {
        const count = channelCounts.get(entry.channelId) || 0;
        channelCounts.set(entry.channelId, count + 1);
      });

      // 3. Trier par nombre de visionnages (décroissant)
      const sortedChannelIds = Array.from(channelCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([channelId]) => channelId);

      console.log(`📊 [AutoSync] Top ${sortedChannelIds.length} chaînes les plus regardées`);

      // 4. Récupérer les objets Channel
      const channelsCollection = database.get('channels');
      const channels = await Promise.all(
        sortedChannelIds.map(async (channelId) => {
          try {
            return await channelsCollection.find(channelId);
          } catch (error) {
            console.warn(`⚠️ [AutoSync] Chaîne ${channelId} introuvable:`, error);
            return null;
          }
        })
      );

      return channels.filter((ch) => ch !== null);

    } catch (error) {
      console.error('❌ [AutoSync] Erreur récupération top chaînes:', error);
      // Fallback: retourner les premières chaînes
      try {
        const database = require('../database').default;
        const Q = require('@nozbe/watermelondb').Q;
        const channelsCollection = database.get('channels');
        const channels = await channelsCollection
          .query(Q.where('playlist_id', playlistId), Q.take(limit))
          .fetch();
        return channels;
      } catch (fallbackError) {
        console.error('❌ [AutoSync] Erreur fallback:', fallbackError);
        return [];
      }
    }
  }

  private async syncChannelEPGSafe(channel: any): Promise<void> {
    try {
      const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('EPG timeout')), 5000);
      });

      await Promise.race([
        epgDataManager.getChannelEPG(channel.id, true),
        timeout,
      ]);

    } catch (error) {
      // Ne pas bloquer pour erreur EPG individuelle
      console.warn(`⚠️ EPG sync failed for ${channel.name}`);
    }
  }

  // ===== GESTION ERREURS =====

  private shouldRetry(error: any): boolean {
    // Network errors
    if (error.message?.includes('ETIMEDOUT')) return true;
    if (error.message?.includes('ECONNREFUSED')) return true;
    if (error.message?.includes('NetworkError')) return true;
    if (error.message?.includes('timeout')) return true;

    // HTTP errors retryables
    if (error.response?.status) {
      return this.RETRY_CONFIG.retryableCodes.includes(error.response.status);
    }

    return false;
  }

  private async handleFinalError(playlist: Playlist, error: any): Promise<void> {
    const errorMessage = this.getUserFriendlyError(error);

    console.error(`❌ [AutoSync] Échec final sync ${playlist.name}:`, errorMessage);

    this.stats.lastError = errorMessage;
    await this.saveStats();
  }

  private getUserFriendlyError(error: any): string {
    if (error.message?.includes('ETIMEDOUT')) {
      return 'Délai d\'attente dépassé';
    }
    if (error.message?.includes('Circuit breaker')) {
      return 'Service temporairement indisponible';
    }
    if (error.response?.status === 401) {
      return 'Identifiants invalides';
    }
    if (error.response?.status === 404) {
      return 'Playlist introuvable';
    }
    if (error.response?.status === 503) {
      return 'Serveur surchargé';
    }
    return error.message || 'Erreur de connexion';
  }

  // ===== CONTRAINTES SYSTÈME =====

  private async checkConstraints(): Promise<boolean> {
    try {
      const netInfo = await NetInfo.fetch();

      // Vérifier connexion internet
      if (!netInfo.isConnected) {
        console.log('📶 [AutoSync] Pas de connexion internet');
        return false;
      }

      // Vérifier WiFi si requis
      if (this.config.wifiOnly && netInfo.type !== 'wifi') {
        console.log('📶 [AutoSync] WiFi requis mais non disponible');
        return false;
      }

      return true;

    } catch (error) {
      console.warn('⚠️ [AutoSync] Erreur vérification contraintes:', error);
      return false;
    }
  }

  // ===== TIMER =====

  private startCheckTimer(): void {
    // 🎯 IPTV Smarters Pro: PAS de timer pendant navigation
    // La sync se fait UNIQUEMENT au démarrage et retour au premier plan
    console.log('⏰ [AutoSync] Mode IPTV Smarters Pro: Pas de timer périodique (sync uniquement au démarrage/retour app)');

    // Timer désactivé pour suivre la logique IPTV Smarters Pro
    // this.checkTimer = setInterval(() => {
    //   this.checkAndSync();
    // }, 30 * 60 * 1000);
  }

  // ===== APP STATE =====

  /**
   * 🎯 Logique IPTV Smarters Pro:
   * - Sync au démarrage de l'app (si intervalle dépassé)
   * - Sync au retour au premier plan (si absence > 30min ET intervalle dépassé)
   * - JAMAIS de sync pendant navigation
   */
  private setupAppStateListener(): void {
    this.appStateListener = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const now = Date.now();

      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App passe en arrière-plan
        this.lastAppStateChangeTime = now;
        console.log('📱 [AutoSync] App en arrière-plan');
      }

      if (nextAppState === 'active') {
        console.log('📱 [AutoSync] App redevenue active');

        if (!this.config.enabled) {
          console.log('⏸️ [AutoSync] Auto-sync désactivé, ignoré');
          return;
        }

        // Cas 1: Démarrage de l'app (appJustStarted = true)
        if (this.appJustStarted) {
          console.log('🚀 [AutoSync] Premier lancement - Vérification sync...');
          this.appJustStarted = false;
          this.checkAndSync();
          return;
        }

        // Cas 2: Retour au premier plan après > 30 min
        const timeInBackground = this.lastAppStateChangeTime
          ? now - this.lastAppStateChangeTime
          : 0;

        const BACKGROUND_THRESHOLD = 30 * 60 * 1000; // 30 minutes

        if (timeInBackground > BACKGROUND_THRESHOLD) {
          console.log(
            `🔄 [AutoSync] Retour après ${Math.round(timeInBackground / 60000)} min - Vérification sync...`
          );
          this.checkAndSync();
        } else {
          console.log(
            `⏭️ [AutoSync] Retour rapide (${Math.round(timeInBackground / 1000)}s) - Pas de sync`
          );
        }
      }
    });
  }

  // ===== ANNULATION =====

  public cancelSync(): void {
    console.log('🛑 [AutoSync] Annulation synchronisation...');
    this.abortController.abort();
  }

  // ===== PERSISTENCE =====

  private async loadConfig(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(AutoSyncService.CONFIG_KEY);
      if (data) {
        this.config = JSON.parse(data);
        console.log('📂 [AutoSync] Config chargée');
      }
    } catch (error) {
      console.warn('⚠️ [AutoSync] Erreur chargement config:', error);
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      await AsyncStorage.setItem(AutoSyncService.CONFIG_KEY, JSON.stringify(this.config));
    } catch (error) {
      console.error('❌ [AutoSync] Erreur sauvegarde config:', error);
    }
  }

  private async loadStats(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(AutoSyncService.STATS_KEY);
      if (data) {
        this.stats = JSON.parse(data);
        console.log('📂 [AutoSync] Stats chargées');
      }
    } catch (error) {
      console.warn('⚠️ [AutoSync] Erreur chargement stats:', error);
    }
  }

  private async saveStats(): Promise<void> {
    try {
      await AsyncStorage.setItem(AutoSyncService.STATS_KEY, JSON.stringify(this.stats));
    } catch (error) {
      console.error('❌ [AutoSync] Erreur sauvegarde stats:', error);
    }
  }

  // ===== HELPERS =====

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Émettre progression vers UI via SyncEventEmitter
   */
  private emitProgress(progress: number, type: 'playlist' | 'epg', message: string): void {
    syncEventEmitter.emitSyncStatus({
      isActive: true,
      message,
      progress,
      type,
      timestamp: Date.now(),
    });
  }

  // ===== CLEANUP =====

  cleanup(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
    if (this.appStateListener) {
      this.appStateListener.remove();
      this.appStateListener = null;
    }
    this.isInitialized = false;
    console.log('🧹 [AutoSync] Nettoyé');
  }
}

// Export singleton
export const autoSyncService = new AutoSyncService();
export default autoSyncService;
