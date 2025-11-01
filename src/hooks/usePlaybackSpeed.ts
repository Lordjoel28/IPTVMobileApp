/**
 * 🎬 usePlaybackSpeed - Hook pour gérer la vitesse de lecture vidéo
 * Compatible avec react-native-video pour les flux VOD/Catch-up
 * Détecte automatiquement si le flux permet la vitesse variable
 */

import { useState, useRef, useCallback } from 'react';

export interface PlaybackSpeedConfig {
  speed: number;
  isEnabled: boolean;
  supportedSpeeds: number[];
  autoDetectCompatibility: boolean;
}

const DEFAULT_SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export const usePlaybackSpeed = (initialConfig: Partial<PlaybackSpeedConfig> = {}) => {
  const [config, setConfig] = useState<PlaybackSpeedConfig>({
    speed: 1.0,
    isEnabled: true,
    supportedSpeeds: DEFAULT_SPEEDS,
    autoDetectCompatibility: true,
    ...initialConfig,
  });

  const [isSpeedSupported, setIsSpeedSupported] = useState<boolean>(true);
  const [streamType, setStreamType] = useState<'vod' | 'live' | 'unknown'>('unknown');
  const videoRef = useRef<any>(null);

  /**
   * Détecte si le flux supporte la vitesse variable
   */
  const detectStreamCompatibility = useCallback((streamUrl?: string, metadata?: any) => {
    if (!config.autoDetectCompatibility) {
      setIsSpeedSupported(true);
      setStreamType('unknown');
      return;
    }

    // Détection basique par URL/métadonnées
    const isLiveStream = detectLiveStream(streamUrl, metadata);

    setStreamType(isLiveStream ? 'live' : 'vod');
    setIsSpeedSupported(!isLiveStream);

    console.log(`🎬 [PlaybackSpeed] Flux détecté: ${isLiveStream ? 'LIVE (vitesse fixe)' : 'VOD (vitesse variable)'}`);
  }, [config.autoDetectCompatibility]);

  /**
   * Détecte si c'est un flux live
   */
  const detectLiveStream = useCallback((streamUrl?: string, metadata?: any): boolean => {
    if (!streamUrl) return false;

    // Détection par patterns dans l'URL
    const livePatterns = [
      /\/live\//i,
      /\/stream\//i,
      /\.m3u8.*live/i,
      /rtmp:\/\//i,
      /rtsp:\/\//i,
      /udp:\/\//i,
      /http:\/\/.*:8080/i,
      /http:\/\/.*:8000/i,
      /http:\/\/.*:9981/i,
    ];

    const hasLivePattern = livePatterns.some(pattern => pattern.test(streamUrl));

    // Détection par métadonnées
    const hasLiveMetadata = metadata?.isLive || metadata?.live ||
                           (metadata?.contentType && metadata.contentType.includes('live'));

    return hasLivePattern || hasLiveMetadata;
  }, []);

  /**
   * Change la vitesse de lecture
   */
  const changeSpeed = useCallback((newSpeed: number) => {
    if (!isSpeedSupported) {
      console.warn('⚠️ [PlaybackSpeed] Vitesse non supportée pour ce flux');
      return false;
    }

    if (!config.supportedSpeeds.includes(newSpeed)) {
      console.warn('⚠️ [PlaybackSpeed] Vitesse non supportée:', newSpeed);
      return false;
    }

    setConfig(prev => ({ ...prev, speed: newSpeed }));

    // Appliquer la vitesse au composant vidéo si disponible
    if (videoRef.current && videoRef.current.setNativeProps) {
      videoRef.current.setNativeProps({ rate: newSpeed });
    }

    console.log(`⚡ [PlaybackSpeed] Vitesse changée: ${newSpeed}x`);
    return true;
  }, [isSpeedSupported, config.supportedSpeeds]);

  /**
   * Active/désactive la fonctionnalité
   */
  const toggleEnabled = useCallback(() => {
    setConfig(prev => ({ ...prev, isEnabled: !prev.isEnabled }));
  }, []);

  /**
   * Réinitialise à la vitesse normale
   */
  const resetSpeed = useCallback(() => {
    changeSpeed(1.0);
  }, [changeSpeed]);

  /**
   * Obtient la vitesse la plus proche
   */
  const getClosestSpeed = useCallback((targetSpeed: number): number => {
    return config.supportedSpeeds.reduce((prev, curr) =>
      Math.abs(curr - targetSpeed) < Math.abs(prev - targetSpeed) ? curr : prev
    );
  }, [config.supportedSpeeds]);

  /**
   * Vérifie si une vitesse est supportée
   */
  const isSpeedSupportedFunc = useCallback((speed: number): boolean => {
    return isSpeedSupported && config.supportedSpeeds.includes(speed);
  }, [isSpeedSupported, config.supportedSpeeds]);

  return {
    // État
    currentSpeed: config.speed,
    isEnabled: config.isEnabled,
    isSupported: isSpeedSupported,
    streamType,
    supportedSpeeds: config.supportedSpeeds,

    // Actions
    changeSpeed,
    resetSpeed,
    toggleEnabled,
    detectStreamCompatibility,

    // Utilitaires
    getClosestSpeed,
    isSpeedSupported: isSpeedSupportedFunc,

    // Référence vidéo
    videoRef,

    // Configuration
    updateConfig: setConfig,
  };
};

export default usePlaybackSpeed;