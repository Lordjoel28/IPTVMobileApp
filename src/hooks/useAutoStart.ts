/**
 * 🎬 useAutoStart - Hook React pour le démarrage automatique IPTV
 * Gère le cycle de vie du démarrage automatique après l'initialisation des profils
 */

import { useEffect, useRef, useCallback } from 'react';
import { autoStartService, type AutoStartResult } from '../services/AutoStartService';

interface UseAutoStartOptions {
  /** Délai avant le démarrage automatique (ms) */
  delay?: number;
  /** Callback appelé lors du démarrage automatique */
  onAutoStart?: (result: AutoStartResult) => void;
  /** Désactiver temporairement l'auto-start */
  disabled?: boolean;
}

interface UseAutoStartReturn {
  /** Si le démarrage automatique est en cours */
  isAutoStarting: boolean;
  /** Forcer manuellement le démarrage automatique */
  triggerAutoStart: () => Promise<AutoStartResult>;
  /** Vérifier si l'auto-start est possible */
  canAutoStart: () => Promise<boolean>;
}

/**
 * Hook pour gérer le démarrage automatique de la dernière chaîne regardée
 *
 * @param isProfileReady - Si le profil est complètement initialisé
 * @param options - Options de configuration
 * @returns État et méthodes de contrôle
 */
export const useAutoStart = (
  isProfileReady: boolean,
  options: UseAutoStartOptions = {}
): UseAutoStartReturn => {
  const {
    delay = 0, // Démarrage instantané
    onAutoStart,
    disabled = false
  } = options;

  // États et refs
  const isAutoStartingRef = useRef(false);
  const hasTriggeredRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Déclenche le démarrage automatique
   */
  const triggerAutoStart = useCallback(async (): Promise<AutoStartResult> => {
    // Éviter les déclenchements multiples
    if (isAutoStartingRef.current) {
      console.log('⏸️ [useAutoStart] Démarrage déjà en cours - Ignoré');
      return { success: false, reason: 'already-starting' };
    }

    isAutoStartingRef.current = true;

    try {
      console.log('🚀 [useAutoStart] Déclenchement du démarrage automatique...');

      const result = await autoStartService.tryAutoStart();

      // Notifier le callback si fourni
      if (onAutoStart) {
        onAutoStart(result);
      }

      return result;

    } catch (error) {
      console.error('❌ [useAutoStart] Erreur lors du démarrage automatique:', error);

      const errorResult: AutoStartResult = {
        success: false,
        reason: 'hook-error',
        error: error.message
      };

      if (onAutoStart) {
        onAutoStart(errorResult);
      }

      return errorResult;

    } finally {
      isAutoStartingRef.current = false;
    }
  }, [onAutoStart]);

  /**
   * Vérifie si le démarrage automatique est possible
   */
  const canAutoStart = useCallback(async (): Promise<boolean> => {
    return await autoStartService.canAutoStart();
  }, []);

  /**
   * Effet principal pour le démarrage automatique
   */
  useEffect(() => {
    // Nettoyer les états quand le profil n'est plus prêt
    if (!isProfileReady) {
      hasTriggeredRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // Ne pas déclencher si déjà fait ou désactivé
    if (hasTriggeredRef.current || disabled) {
      return;
    }

    console.log(`⏱️ [useAutoStart] Profil prêt, planification auto-start dans ${delay}ms...`);

    // Planifier le démarrage automatique
    timeoutRef.current = setTimeout(async () => {
      console.log('🎬 [useAutoStart] Délai écoulé, lancement du démarrage automatique...');
      hasTriggeredRef.current = true;
      await triggerAutoStart();
    }, delay);

    // Nettoyage
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

  }, [isProfileReady, disabled, delay, triggerAutoStart]);

  /**
   * Nettoyage au démontage du composant
   */
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      isAutoStartingRef.current = false;
      hasTriggeredRef.current = false;
    };
  }, []);

  return {
    isAutoStarting: isAutoStartingRef.current,
    triggerAutoStart,
    canAutoStart
  };
};

/**
 * Hook simplifié qui ne retourne que l'état
 */
export const useAutoStartSimple = (
  isProfileReady: boolean,
  options: UseAutoStartOptions = {}
) => {
  const { isAutoStarting, triggerAutoStart, canAutoStart } = useAutoStart(isProfileReady, options);

  // Logger automatiquement les résultats en développement
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && isProfileReady && !options.disabled) {
      canAutoStart().then(canStart => {
        console.log(`🔍 [useAutoStartSimple] Auto-start possible: ${canStart}`);
      });
    }
  }, [isProfileReady, options.disabled, canAutoStart]);

  return {
    isAutoStarting,
    canAutoStart
  };
};

export default useAutoStart;