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

  const getSkipDuration = (): number => {
    return settings?.skipDuration || 10;
  };

  const getPlaybackSpeed = (): number => {
    return settings?.playbackSpeed || 1.0;
  };

  const getQualityPriority = (): 'resolution' | 'fluidity' => {
    return settings?.qualityPriority || 'resolution';
  };

  const getAutoplay = (): boolean => {
    return settings?.autoplay || true;
  };

  const getRememberPosition = (): boolean => {
    return settings?.rememberPosition || true;
  };

  const getQuality = (): 'auto' | '1080p' | '720p' | '480p' => {
    return settings?.quality || 'auto';
  };

  const getVolume = (): number => {
    return settings?.volume || 75;
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
    getSkipDuration,
    getPlaybackSpeed,
    getQualityPriority,
    getAutoplay,
    getRememberPosition,
    getQuality,
    getVolume,

    // Valeurs directes (pour commodité)
    backgroundPlay: getBackgroundPlay(),
    skipDuration: getSkipDuration(),
    playbackSpeed: getPlaybackSpeed(),
    qualityPriority: getQualityPriority(),
    autoplay: getAutoplay(),
    rememberPosition: getRememberPosition(),
    quality: getQuality(),
    volume: getVolume(),
  };
};

export default useVideoPlayerSettings;