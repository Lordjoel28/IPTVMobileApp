/**
 * 🔄 ReliableSyncScheduler - Synchronisation fiable multi-stratégie
 *
 * Stratégies combinées pour maximiser la fiabilité:
 * 1. ⏰ Timer périodique (quand app active)
 * 2. 📱 AppState (retour au premier plan)
 * 3. 🔔 BackgroundFetch (opportuniste Android)
 * 4. 🚀 WorkManager (backup fiable - futur)
 *
 * Inspiré de: IPTV Smarters Pro + TiviMate
 */

import { AppState, AppStateStatus } from 'react-native';
import BackgroundFetch from 'react-native-background-fetch';
import { autoSyncService } from './AutoSyncService';

export interface SyncSchedulerConfig {
  enabled: boolean;
  intervalHours: number;
  checkIntervalMinutes: number; // Intervalle de vérification quand app active
}

class ReliableSyncScheduler {
  private config: SyncSchedulerConfig = {
    enabled: false,
    intervalHours: 24,
    checkIntervalMinutes: 30, // Vérifier toutes les 30 min si sync nécessaire
  };

  private checkTimer: NodeJS.Timeout | null = null;
  private appStateListener: any = null;
  private lastAppStateChangeTime: number = 0;
  private appJustStarted = true;
  private isInitialized = false;

  // ===== INITIALISATION =====

  async initialize(config: Partial<SyncSchedulerConfig> = {}): Promise<void> {
    if (this.isInitialized) {
      console.log('✅ [SyncScheduler] Déjà initialisé');
      return;
    }

    this.config = { ...this.config, ...config };

    // Stratégie 1: AppState listener (prioritaire)
    this.setupAppStateListener();

    // Stratégie 2: Timer périodique quand app active
    if (this.config.enabled) {
      this.startCheckTimer();
    }

    // Stratégie 3: BackgroundFetch (opportuniste)
    await this.setupBackgroundFetch();

    this.isInitialized = true;
  }

  // ===== STRATÉGIE 1: APP STATE (PRIORITAIRE) =====

  private setupAppStateListener(): void {
    this.appStateListener = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const now = Date.now();

      if (nextAppState === 'background' || nextAppState === 'inactive') {
        this.lastAppStateChangeTime = now;

        // Arrêter le timer quand app en arrière-plan
        if (this.checkTimer) {
          clearInterval(this.checkTimer);
          this.checkTimer = null;
        }
      }

      if (nextAppState === 'active') {
        if (!this.config.enabled) {
          return;
        }

        // Redémarrer le timer
        this.startCheckTimer();

        // Cas 1: Démarrage de l'app
        if (this.appJustStarted) {
          this.appJustStarted = false;
          this.checkAndTriggerSync('app-start');
          return;
        }

        // Cas 2: Retour au premier plan après > 30 min
        const timeInBackground = this.lastAppStateChangeTime
          ? now - this.lastAppStateChangeTime
          : 0;

        const BACKGROUND_THRESHOLD = 30 * 60 * 1000; // 30 minutes

        if (timeInBackground > BACKGROUND_THRESHOLD) {
          this.checkAndTriggerSync('app-resume-long');
        }
      }
    });
  }

  // ===== STRATÉGIE 2: TIMER PÉRIODIQUE (QUAND APP ACTIVE) =====

  private startCheckTimer(): void {
    // Si déjà un timer, le nettoyer d'abord
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
    }

    if (!this.config.enabled) {
      return;
    }

    const intervalMs = this.config.checkIntervalMinutes * 60 * 1000;

    this.checkTimer = setInterval(() => {
      this.checkAndTriggerSync('timer');
    }, intervalMs);
  }

  // ===== STRATÉGIE 3: BACKGROUNDFETCH (OPPORTUNISTE) =====

  private async setupBackgroundFetch(): Promise<void> {
    try {
      await BackgroundFetch.configure({
        minimumFetchInterval: this.config.intervalHours * 60,
        stopOnTerminate: false,
        startOnBoot: true,
        enableHeadless: true,
        requiresBatteryNotLow: false, // Plus permissif pour tests
        requiresCharging: false,
        requiresDeviceIdle: false,
        requiresStorageNotLow: false,
      }, async (taskId) => {
        if (this.config.enabled) {
          await this.checkAndTriggerSync('background-fetch');
        }
        BackgroundFetch.finish(taskId);
      }, (taskId) => {
        BackgroundFetch.finish(taskId);
      });
    } catch (error) {
      console.warn('⚠️ [SyncScheduler] Erreur BackgroundFetch (non-critique):', error);
    }
  }

  // ===== VÉRIFICATION ET DÉCLENCHEMENT =====

  private async checkAndTriggerSync(source: string): Promise<void> {
    try {
      await autoSyncService.checkAndSync();
    } catch (error) {
      console.warn('[SyncScheduler] Erreur vérification sync:', error);
    }
  }

  // ===== CONFIGURATION =====

  async setEnabled(enabled: boolean): Promise<void> {
    this.config.enabled = enabled;

    if (enabled) {
      this.startCheckTimer();
    } else {
      if (this.checkTimer) {
        clearInterval(this.checkTimer);
        this.checkTimer = null;
      }
    }
  }

  async setInterval(hours: number): Promise<void> {
    this.config.intervalHours = hours;

    // Reconfigurer BackgroundFetch
    await this.setupBackgroundFetch();
  }

  getConfig(): SyncSchedulerConfig {
    return { ...this.config };
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
    console.log('🧹 [SyncScheduler] Nettoyé');
  }
}

// Export singleton
export const reliableSyncScheduler = new ReliableSyncScheduler();
export default reliableSyncScheduler;
