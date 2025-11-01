/**
 * ⏩ useSmartSkip - Hook pour gérer les sauts intelligents dans le lecteur vidéo
 * Permet de personnaliser la durée des sauts (10s, 30s, 1min, 5min)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { videoSettingsService } from '../services/VideoSettingsService';

export interface SmartSkipConfig {
  duration: number; // en secondes
  isEnabled: boolean;
}

export const useSmartSkip = (initialConfig?: Partial<SmartSkipConfig>) => {
  const [config, setConfig] = useState<SmartSkipConfig>({
    duration: 10, // 10 secondes par défaut
    isEnabled: true,
    ...initialConfig,
  });

  const videoRef = useRef<any>(null);

  /**
   * Charge la durée de saut depuis les paramètres sauvegardés
   */
  const loadSkipDuration = useCallback(async () => {
    try {
      const settings = await videoSettingsService.getSetting('skipDuration');
      if (settings) {
        setConfig(prev => ({ ...prev, duration: settings }));
        console.log(`⏩ [SmartSkip] Durée chargée: ${settings}s`);
      }
    } catch (error) {
      console.error('❌ [SmartSkip] Erreur chargement durée:', error);
    }
  }, []);

  /**
   * Sauvegarde la durée de saut dans les paramètres
   */
  const saveSkipDuration = useCallback(async (duration: number) => {
    try {
      const success = await videoSettingsService.updateSetting('skipDuration', duration);
      if (success) {
        setConfig(prev => ({ ...prev, duration }));
        console.log(`✅ [SmartSkip] Durée sauvegardée: ${duration}s`);
      }
    } catch (error) {
      console.error('❌ [SmartSkip] Erreur sauvegarde durée:', error);
    }
  }, []);

  /**
   * Effectue un saut avant dans la vidéo
   */
  const skipForward = useCallback(() => {
    if (!config.isEnabled || !videoRef.current) {
      console.warn('⚠️ [SmartSkip] Saut avant non disponible');
      return false;
    }

    try {
      const currentTime = videoRef.current.getCurrentTime?.() || 0;
      const newTime = currentTime + config.duration;
      videoRef.current.seek?.(newTime);

      console.log(`⏩ [SmartSkip] Saut avant de ${config.duration}s: ${currentTime}s → ${newTime}s`);
      return true;
    } catch (error) {
      console.error('❌ [SmartSkip] Erreur saut avant:', error);
      return false;
    }
  }, [config.duration, config.isEnabled]);

  /**
   * Effectue un saut arrière dans la vidéo
   */
  const skipBackward = useCallback(() => {
    if (!config.isEnabled || !videoRef.current) {
      console.warn('⚠️ [SmartSkip] Saut arrière non disponible');
      return false;
    }

    try {
      const currentTime = videoRef.current.getCurrentTime?.() || 0;
      const newTime = Math.max(0, currentTime - config.duration);
      videoRef.current.seek?.(newTime);

      console.log(`⏪ [SmartSkip] Saut arrière de ${config.duration}s: ${currentTime}s → ${newTime}s`);
      return true;
    } catch (error) {
      console.error('❌ [SmartSkip] Erreur saut arrière:', error);
      return false;
    }
  }, [config.duration, config.isEnabled]);

  /**
   * Change la durée de saut
   */
  const changeSkipDuration = useCallback((newDuration: number) => {
    setConfig(prev => ({ ...prev, duration: newDuration }));
    saveSkipDuration(newDuration);
  }, [saveSkipDuration]);

  /**
   * Active/désactive les sauts intelligents
   */
  const toggleEnabled = useCallback(() => {
    setConfig(prev => ({ ...prev, isEnabled: !prev.isEnabled }));
  }, []);

  /**
   * Formate la durée pour l'affichage
   */
  const formatDuration = useCallback((seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
    return `${Math.floor(seconds / 3600)}h${Math.floor((seconds % 3600) / 60)}min`;
  }, []);

  /**
   * Gestionnaire pour double-tap (gauche/droite)
   */
  const handleDoubleTap = useCallback((direction: 'left' | 'right') => {
    if (direction === 'left') {
      return skipBackward();
    } else {
      return skipForward();
    }
  }, [skipBackward, skipForward]);

  // Charger la durée sauvegardée au montage
  useEffect(() => {
    loadSkipDuration();
  }, [loadSkipDuration]);

  return {
    // État
    currentDuration: config.duration,
    isEnabled: config.isEnabled,
    formattedDuration: formatDuration(config.duration),

    // Actions principales
    skipForward,
    skipBackward,
    changeSkipDuration,
    toggleEnabled,

    // Utilitaires
    handleDoubleTap,
    formatDuration,

    // Référence vidéo
    videoRef,

    // Configuration
    updateConfig: setConfig,
  };
};

export default useSmartSkip;