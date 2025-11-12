/**
 * 🎬 useVideoPlayerSettings - Hook pour accéder aux paramètres vidéo persistants
 * Utilisé par GlobalVideoPlayer et les écrans de settings
 */

import { useState, useEffect } from 'react';
import { videoSettingsService } from '../services/VideoSettingsService';
import type { VideoSettings } from '../services/VideoSettingsService';

export const useVideoPlayerSettings = () => {
  const [settings, setSettings] = useState<VideoSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const loadedSettings = await videoSettingsService.loadSettings();
      setSettings(loadedSettings);
      console.log('📹 [useVideoPlayerSettings] Paramètres chargés:', loadedSettings);
    } catch (error) {
      console.error('❌ [useVideoPlayerSettings] Erreur chargement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = async <K extends keyof VideoSettings>(
    key: K,
    value: VideoSettings[K]
  ): Promise<boolean> => {
    try {
      const success = await videoSettingsService.updateSetting(key, value);
      if (success) {
        setSettings(prev => prev ? { ...prev, [key]: value } : null);
        console.log(`✅ [useVideoPlayerSettings] ${key} mis à jour:`, value);
      }
      return success;
    } catch (error) {
      console.error(`❌ [useVideoPlayerSettings] Erreur mise à jour ${key}:`, error);
      return false;
    }
  };

  const getBackgroundPlay = (): boolean => {
    return settings?.backgroundPlay || false;
  };

  
  const getPlaybackSpeed = (): number => {
    return settings?.playbackSpeed || 1.0;
  };

  const getAutoplay = (): boolean => {
    return settings?.autoplay || true;
  };

  const getRememberPosition = (): boolean => {
    return settings?.rememberPosition || true;
  };

  const getHardwareAcceleration = (): boolean => {
    return settings?.hardwareAcceleration ?? true;
  };

  const getDecoderType = (): 'auto' | 'hardware' | 'software' => {
    return settings?.decoderType || 'auto';
  };

  const getNetworkTimeout = (): number => {
    return settings?.networkTimeout || 10;
  };

  const getTimeFormat = (): '12h' | '24h' => {
    return settings?.timeFormat || '24h';
  };

  const getAppLanguage = (): 'fr' | 'en' | 'es' | 'ar' => {
    return settings?.appLanguage || 'fr';
  };

  return {
    // État
    settings,
    isLoading,

    // Actions principales
    updateSetting,
    loadSettings,

    // Accesseurs rapides
    getBackgroundPlay,
    getPlaybackSpeed,
    getAutoplay,
    getRememberPosition,
    getHardwareAcceleration,
    getDecoderType,
    getNetworkTimeout,
    getTimeFormat,
    getAppLanguage,

    // Valeurs directes (pour commodité)
    backgroundPlay: getBackgroundPlay(),
    playbackSpeed: getPlaybackSpeed(),
    autoplay: getAutoplay(),
    rememberPosition: getRememberPosition(),
    hardwareAcceleration: getHardwareAcceleration(),
    decoderType: getDecoderType(),
    networkTimeout: getNetworkTimeout(),
    timeFormat: getTimeFormat(),
    appLanguage: getAppLanguage(),
  };
};

export default useVideoPlayerSettings;