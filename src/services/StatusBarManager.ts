/**
 * 🎯 StatusBarManager - Source de vérité unique pour StatusBar et mode immersif
 *
 * Résout le chaos des 5 logiques conflictuelles dans l'app :
 * - useGlobalImmersion
 * - GlobalVideoPlayer
 * - ChannelPlayerScreen
 * - VideoPlayerPersistent (supprimé)
 * - StatusBar components statiques
 *
 * PRINCIPE : Une seule instance, un seul état, une seule décision
 */

import {Platform, StatusBar} from 'react-native';
import ImmersiveMode from 'react-native-immersive-mode';
import SystemNavigationBar from 'react-native-system-navigation-bar';

type StatusBarState = 'immersive' | 'normal';

interface StatusBarConfig {
  state: StatusBarState;
  reason: string;
  timestamp: number;
  force?: boolean;
  priority?: number; // 🆕 Système de priorités
}

// Priorités pour éviter les conflits
const PRIORITY = {
  PLAYER_FULLSCREEN: 100, // Plus haute priorité
  PLAYER_PIP: 90, // Priorité élevée
  SCREEN_IMMERSIVE: 50, // Priorité moyenne
  APP_NORMAL: 10, // Priorité basse
};

export class StatusBarManager {
  private static instance: StatusBarManager | null = null;
  private currentConfig: StatusBarConfig;
  private listeners: Set<(config: StatusBarConfig) => void> = new Set();
  private debugMode: boolean = true; // Activer logs pour debug

  private constructor() {
    this.currentConfig = {
      state: 'normal',
      reason: 'initialization',
      timestamp: Date.now(),
      force: false,
      priority: PRIORITY.APP_NORMAL,
    };
  }

  static getInstance(): StatusBarManager {
    if (!StatusBarManager.instance) {
      StatusBarManager.instance = new StatusBarManager();
    }
    return StatusBarManager.instance;
  }

  /**
   * 🔒 MODE IMMERSIF : Masquer StatusBar + Navigation Bar
   * Utilisé pour : Fullscreen, ChannelPlayerScreen, PiP visible
   */
  setImmersive(
    reason: string,
    force: boolean = false,
    priority: number = PRIORITY.SCREEN_IMMERSIVE,
  ): void {
    // Vérifier la priorité - ne pas appliquer si priorité plus faible
    if (
      !force &&
      this.currentConfig.priority &&
      priority < this.currentConfig.priority
    ) {
      if (this.debugMode) {
        console.log(
          `🎯 [StatusBarManager] SKIP setImmersive - priorité trop faible (${priority} < ${this.currentConfig.priority})`,
        );
      }
      return;
    }

    // Éviter les appels redondants sauf si forcé ou priorité différente
    if (
      this.currentConfig.state === 'immersive' &&
      !force &&
      this.currentConfig.priority === priority
    ) {
      if (this.debugMode) {
        console.log(
          `🎯 [StatusBarManager] SKIP setImmersive - déjà en mode immersif (reason: ${reason})`,
        );
      }
      return;
    }

    const newConfig: StatusBarConfig = {
      state: 'immersive',
      reason,
      timestamp: Date.now(),
      force,
      priority,
    };

    if (this.debugMode) {
      console.log('🔒 [StatusBarManager] IMMERSIVE MODE', {
        reason,
        force,
        previous: this.currentConfig.state,
        timestamp: new Date().toISOString(),
      });
    }

    try {
      // StatusBar native
      StatusBar.setHidden(true, 'fade');
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor('transparent', true);

      // Mode immersif Android - TOTAL
      if (Platform.OS === 'android') {
        ImmersiveMode.setBarMode('FullSticky');
        SystemNavigationBar.immersive(); // Force aussi la navigation bar
      }

      this.currentConfig = newConfig;
      this.notifyListeners();
    } catch (error) {
      console.error('❌ [StatusBarManager] Erreur setImmersive:', error);
      // Fallback silencieux
      try {
        StatusBar.setHidden(true, 'fade');
      } catch (fallbackError) {
        console.error(
          '❌ [StatusBarManager] Fallback setImmersive failed:',
          fallbackError,
        );
      }
    }
  }

  /**
   * 🔓 MODE NORMAL : Afficher StatusBar normale
   * Utilisé pour : Écrans standards, sortie de fullscreen
   */
  setNormal(
    reason: string,
    force: boolean = false,
    priority: number = PRIORITY.APP_NORMAL,
  ): void {
    // Vérifier la priorité - ne pas appliquer si priorité plus faible
    if (
      !force &&
      this.currentConfig.priority &&
      priority < this.currentConfig.priority
    ) {
      if (this.debugMode) {
        console.log(
          `🎯 [StatusBarManager] SKIP setNormal - priorité trop faible (${priority} < ${this.currentConfig.priority})`,
        );
      }
      return;
    }

    // Éviter les appels redondants sauf si forcé
    if (this.currentConfig.state === 'normal' && !force) {
      if (this.debugMode) {
        console.log(
          `🎯 [StatusBarManager] SKIP setNormal - déjà en mode normal (reason: ${reason})`,
        );
      }
      return;
    }

    const newConfig: StatusBarConfig = {
      state: 'normal',
      reason,
      timestamp: Date.now(),
      force,
      priority,
    };

    if (this.debugMode) {
      console.log('🔓 [StatusBarManager] NORMAL MODE', {
        reason,
        force,
        previous: this.currentConfig.state,
        timestamp: new Date().toISOString(),
      });
    }

    try {
      // Mode normal Android d'abord
      if (Platform.OS === 'android') {
        ImmersiveMode.setBarMode('Normal');
        SystemNavigationBar.navigationShow(); // Restaurer navigation bar
      }

      // StatusBar native avec délai pour éviter conflicts
      setTimeout(() => {
        StatusBar.setHidden(false, 'fade');
        StatusBar.setTranslucent(false);
        StatusBar.setBackgroundColor('#000000', true);
        StatusBar.setBarStyle('light-content', true);
      }, 100);

      this.currentConfig = newConfig;
      this.notifyListeners();
    } catch (error) {
      console.error('❌ [StatusBarManager] Erreur setNormal:', error);
      // Fallback silencieux
      try {
        StatusBar.setHidden(false, 'fade');
      } catch (fallbackError) {
        console.error(
          '❌ [StatusBarManager] Fallback setNormal failed:',
          fallbackError,
        );
      }
    }
  }

  /**
   * 🚨 FORCE REFRESH : Réappliquer l'état actuel
   * Utilisé si des composants tiers perturbent l'état
   */
  forceRefresh(reason: string): void {
    if (this.debugMode) {
      console.log(`🚨 [StatusBarManager] FORCE REFRESH (reason: ${reason})`);
    }

    if (this.currentConfig.state === 'immersive') {
      this.setImmersive(`force_refresh_${reason}`, true);
    } else {
      this.setNormal(`force_refresh_${reason}`, true);
    }
  }

  /**
   * 📊 État actuel
   */
  getCurrentState(): StatusBarConfig {
    return {...this.currentConfig};
  }

  /**
   * 🎯 Check si en mode immersif
   */
  isImmersive(): boolean {
    return this.currentConfig.state === 'immersive';
  }

  /**
   * 👂 Listeners pour React hooks
   */
  addListener(callback: (config: StatusBarConfig) => void): () => void {
    this.listeners.add(callback);

    // Retourner fonction de cleanup
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback(this.currentConfig);
      } catch (error) {
        console.error('❌ [StatusBarManager] Erreur listener:', error);
      }
    });
  }

  /**
   * 🐛 Debug utilities
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  getDebugInfo(): any {
    return {
      currentConfig: this.currentConfig,
      listenersCount: this.listeners.size,
      debugMode: this.debugMode,
      platform: Platform.OS,
    };
  }

  /**
   * 🧹 Cleanup (pour tests)
   */
  static reset(): void {
    StatusBarManager.instance = null;
  }
}

// Export de l'instance singleton
export const statusBarManager = StatusBarManager.getInstance();

// Export des priorités pour les hooks
export const STATUS_BAR_PRIORITY = PRIORITY;

// Export du type pour TypeScript
export type {StatusBarConfig, StatusBarState};
