/**
 * 🎣 useStatusBar - Hook React pour le StatusBarManager
 *
 * Usage:
 * const { setImmersive, setNormal, isImmersive, currentState } = useStatusBar();
 *
 * Auto-cleanup au démontage du composant
 */

import {useEffect, useState, useCallback} from 'react';
import {
  statusBarManager,
  StatusBarConfig,
  STATUS_BAR_PRIORITY,
} from '../services/StatusBarManager';

export const useStatusBar = () => {
  const [currentState, setCurrentState] = useState<StatusBarConfig>(
    statusBarManager.getCurrentState(),
  );

  // Synchroniser avec le StatusBarManager
  useEffect(() => {
    const unsubscribe = statusBarManager.addListener(config => {
      setCurrentState(config);
    });

    return unsubscribe;
  }, []);

  // Méthodes wrappées avec useCallback pour éviter re-renders
  const setImmersive = useCallback(
    (reason: string, force?: boolean, priority?: number) => {
      statusBarManager.setImmersive(reason, force, priority);
    },
    [],
  );

  const setNormal = useCallback(
    (reason: string, force?: boolean, priority?: number) => {
      statusBarManager.setNormal(reason, force, priority);
    },
    [],
  );

  const forceRefresh = useCallback((reason: string) => {
    statusBarManager.forceRefresh(reason);
  }, []);

  const isImmersive = useCallback(() => {
    return statusBarManager.isImmersive();
  }, []);

  const getDebugInfo = useCallback(() => {
    return statusBarManager.getDebugInfo();
  }, []);

  return {
    // État actuel
    currentState,
    isImmersive: currentState.state === 'immersive',

    // Actions
    setImmersive,
    setNormal,
    forceRefresh,

    // Utils
    getDebugInfo,
  };
};

/**
 * 🎯 Hook spécialisé pour les écrans fullscreen/immersifs
 * Auto-gestion du cycle de vie immersif/normal
 */
export const useImmersiveScreen = (
  screenName: string,
  isActive: boolean = true,
) => {
  const {setImmersive, setNormal} = useStatusBar();

  useEffect(() => {
    if (isActive) {
      setImmersive(
        `screen_${screenName}_focus`,
        false,
        STATUS_BAR_PRIORITY.SCREEN_IMMERSIVE,
      );
    }

    return () => {
      if (isActive) {
        // Utiliser priorité plus faible au cleanup pour ne pas écraser le player
        setNormal(
          `screen_${screenName}_blur`,
          false,
          STATUS_BAR_PRIORITY.APP_NORMAL,
        );
      }
    };
  }, [screenName, isActive, setImmersive, setNormal]);
};

/**
 * 🎮 Hook pour les composants player
 * Gestion automatique selon l'état du player
 */
export const usePlayerStatusBar = (
  isFullscreen: boolean,
  isPipVisible: boolean,
  componentName: string,
) => {
  const {setImmersive, setNormal} = useStatusBar();

  useEffect(() => {
    const shouldBeImmersive = isFullscreen || isPipVisible;

    if (shouldBeImmersive) {
      // Priorité maximale pour le player
      const priority = isFullscreen
        ? STATUS_BAR_PRIORITY.PLAYER_FULLSCREEN
        : STATUS_BAR_PRIORITY.PLAYER_PIP;
      setImmersive(
        `player_${componentName}_${isFullscreen ? 'fullscreen' : 'pip'}`,
        false,
        priority,
      );
    } else {
      setNormal(
        `player_${componentName}_normal`,
        false,
        STATUS_BAR_PRIORITY.APP_NORMAL,
      );
    }
  }, [isFullscreen, isPipVisible, componentName, setImmersive, setNormal]);
};
