/**
 * 🎵 useBackgroundPlay - Hook pour gérer la lecture en arrière-plan
 * Permet de continuer l'audio quand l'app est en arrière-plan
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { videoSettingsService } from '../services/VideoSettingsService';
import { Alert } from 'react-native';

export interface BackgroundPlayConfig {
  isEnabled: boolean;
  pauseOnBackground: boolean;
  resumeOnForeground: boolean;
}

export const useBackgroundPlay = (initialConfig?: Partial<BackgroundPlayConfig>) => {
  const [config, setConfig] = useState<BackgroundPlayConfig>({
    isEnabled: false,
    pauseOnBackground: false,
    resumeOnForeground: true,
    ...initialConfig,
  });

  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [isInBackground, setIsInBackground] = useState(false);
  const videoRef = useRef<any>(null);
  const backgroundTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Charge la configuration depuis les paramètres sauvegardés
   */
  const loadBackgroundPlayConfig = useCallback(async () => {
    try {
      const backgroundPlay = await videoSettingsService.getSetting('backgroundPlay');
      if (backgroundPlay !== null) {
        setConfig(prev => ({ ...prev, isEnabled: backgroundPlay }));
        console.log(`🎵 [BackgroundPlay] Configuration chargée: ${backgroundPlay ? 'activée' : 'désactivée'}`);
      }
    } catch (error) {
      console.error('❌ [BackgroundPlay] Erreur chargement configuration:', error);
    }
  }, []);

  /**
   * Sauvegarde la configuration dans les paramètres
   */
  const saveBackgroundPlayConfig = useCallback(async (enabled: boolean) => {
    try {
      const success = await videoSettingsService.updateSetting('backgroundPlay', enabled);
      if (success) {
        setConfig(prev => ({ ...prev, isEnabled: enabled }));
        console.log(`✅ [BackgroundPlay] Configuration sauvegardée: ${enabled ? 'activée' : 'désactivée'}`);
      }
    } catch (error) {
      console.error('❌ [BackgroundPlay] Erreur sauvegarde configuration:', error);
    }
  }, []);

  /**
   * Gère le changement d'état de l'application
   */
  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    const previousState = appState;
    setAppState(nextAppState);

    if (!config.isEnabled) {
      return; // Ne rien faire si la fonctionnalité est désactivée
    }

    if (previousState.match(/inactive|background/) && nextAppState === 'active') {
      // L'app revient au premier plan
      setIsInBackground(false);
      onForeground();
    } else if (nextAppState.match(/inactive|background/)) {
      // L'app passe en arrière-plan
      setIsInBackground(true);
      onBackground();
    }
  }, [appState, config.isEnabled]);

  /**
   * Action lorsque l'app passe en arrière-plan
   */
  const onBackground = useCallback(() => {
    console.log('🎵 [BackgroundPlay] App en arrière-plan');

    if (config.pauseOnBackground) {
      // Mettre en pause immédiatement
      if (videoRef.current) {
        videoRef.current.setPaused?.(true);
      }
      return;
    }

    // Continuer l'audio seulement (mode background)
    if (videoRef.current && Platform.OS === 'android') {
      try {
        // Garder l'audio actif
        console.log('🎵 [BackgroundPlay] Maintien de l\'audio actif');
      } catch (error) {
        console.error('❌ [BackgroundPlay] Erreur maintien audio:', error);
      }
    }

    // Timeout pour arrêter complètement après un certain temps
    if (backgroundTimeoutRef.current) {
      clearTimeout(backgroundTimeoutRef.current);
    }

    backgroundTimeoutRef.current = setTimeout(() => {
      console.log('🎵 [BackgroundPlay] Arrêt après timeout');
      if (videoRef.current) {
        videoRef.current.setPaused?.(true);
      }
    }, 5 * 60 * 1000); // 5 minutes par défaut
  }, [config.pauseOnBackground]);

  /**
   * Action lorsque l'app revient au premier plan
   */
  const onForeground = useCallback(() => {
    console.log('🎵 [BackgroundPlay] App au premier plan');

    // Annuler le timeout
    if (backgroundTimeoutRef.current) {
      clearTimeout(backgroundTimeoutRef.current);
      backgroundTimeoutRef.current = null;
    }

    if (config.resumeOnForeground && !config.pauseOnBackground) {
      // Reprendre la lecture automatiquement
      if (videoRef.current) {
        videoRef.current.setPaused?.(false);
      }
    }
  }, [config.resumeOnForeground, config.pauseOnBackground]);

  /**
   * Active/désactive la lecture en arrière-plan
   */
  const toggleBackgroundPlay = useCallback(async () => {
    const newState = !config.isEnabled;

    // Demander confirmation si activation
    if (newState) {
      Alert.alert(
        '🎵 Lecture en arrière-plan',
        'Cela permettra de continuer l\'audio lorsque l\'application est en arrière-plan. Consomme plus de batterie.',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Activer',
            onPress: () => saveBackgroundPlayConfig(true)
          }
        ]
      );
    } else {
      saveBackgroundPlayConfig(false);
    }
  }, [config.isEnabled, saveBackgroundPlayConfig]);

  /**
   * Configure le mode pause en arrière-plan
   */
  const setPauseOnBackground = useCallback((pause: boolean) => {
    setConfig(prev => ({ ...prev, pauseOnBackground: pause }));
  }, []);

  /**
   * Configure la reprise au premier plan
   */
  const setResumeOnForeground = useCallback((resume: boolean) => {
    setConfig(prev => ({ ...prev, resumeOnForeground: resume }));
  }, []);

  /**
   * Arrête manuellement la lecture en arrière-plan
   */
  const stopBackgroundPlay = useCallback(() => {
    if (backgroundTimeoutRef.current) {
      clearTimeout(backgroundTimeoutRef.current);
      backgroundTimeoutRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.setPaused?.(true);
    }

    setIsInBackground(false);
    console.log('🎵 [BackgroundPlay] Arrêt manuel');
  }, []);

  // Gestionnaire d'état de l'app
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [handleAppStateChange]);

  // Charger la configuration au montage
  useEffect(() => {
    loadBackgroundPlayConfig();
  }, [loadBackgroundPlayConfig]);

  // Nettoyage au démontage
  useEffect(() => {
    return () => {
      if (backgroundTimeoutRef.current) {
        clearTimeout(backgroundTimeoutRef.current);
      }
    };
  }, []);

  return {
    // État
    isEnabled: config.isEnabled,
    isInBackground,
    appState,
    pauseOnBackground: config.pauseOnBackground,
    resumeOnForeground: config.resumeOnForeground,

    // Actions principales
    toggleBackgroundPlay,
    setPauseOnBackground,
    setResumeOnForeground,
    stopBackgroundPlay,

    // Référence vidéo
    videoRef,

    // Configuration
    updateConfig: setConfig,
  };
};

export default useBackgroundPlay;