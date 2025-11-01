import { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';

/**
 * Hook pour gérer les paramètres d'affichage et de performance vidéo.
 *
 * Remplace la duplication de code dans GlobalVideoPlayer pour:
 * - Modes d'affichage (fit, fill, stretch, 4:3, 16:9)
 * - Calcul automatique des dimensions pour ratios personnalisés
 * - Contrôle du buffer (low, normal, high)
 * - Verrouillage de l'écran
 */

export type ZoomMode = 'fit' | 'fill' | 'stretch' | '4:3' | '16:9';
export type BufferMode = 'low' | 'normal' | 'high';

interface CustomVideoDimensions {
  width: number;
  height: number;
  top: number;
  left: number;
}

interface UseVideoSettingsOptions {
  /** Mode d'affichage initial. Default: 'fit' */
  initialZoomMode?: ZoomMode;
  /** Mode de buffer initial. Default: 'normal' */
  initialBufferMode?: BufferMode;
  /** État initial du verrouillage écran. Default: false */
  initialScreenLocked?: boolean;
  /** Est-ce que le player est en fullscreen? Nécessaire pour calculs dimensions */
  isFullscreen: boolean;
}

interface UseVideoSettingsReturn {
  // États
  zoomMode: ZoomMode;
  bufferMode: BufferMode;
  isScreenLocked: boolean;
  customVideoDimensions: CustomVideoDimensions | null;

  // Actions
  setZoomMode: (mode: ZoomMode) => void;
  setBufferMode: (mode: BufferMode) => void;
  toggleScreenLock: () => void;

  // Helpers
  getBufferConfig: () => {
    minBufferMs: number;
    maxBufferMs: number;
    bufferForPlaybackMs: number;
    bufferForPlaybackAfterRebufferMs: number;
  };
}

export const useVideoSettings = (
  options: UseVideoSettingsOptions
): UseVideoSettingsReturn => {
  const {
    initialZoomMode = 'fit',
    initialBufferMode = 'normal',
    initialScreenLocked = false,
    isFullscreen,
  } = options;

  // États
  const [zoomMode, setZoomMode] = useState<ZoomMode>(initialZoomMode);
  const [bufferMode, setBufferMode] = useState<BufferMode>(initialBufferMode);
  const [isScreenLocked, setIsScreenLocked] = useState<boolean>(initialScreenLocked);
  const [customVideoDimensions, setCustomVideoDimensions] = useState<CustomVideoDimensions | null>(null);

  /**
   * Calcule les dimensions personnalisées pour les ratios 4:3 et 16:9
   * Centré sur l'écran en fullscreen
   */
  useEffect(() => {
    if (isFullscreen && (zoomMode === '4:3' || zoomMode === '16:9')) {
      const { width: screenWidth, height: screenHeight } = Dimensions.get('screen');

      let videoWidth = screenWidth;
      let videoHeight = screenHeight;
      const screenRatio = screenWidth / screenHeight;
      const videoRatio = zoomMode === '4:3' ? 4 / 3 : 16 / 9;

      if (screenRatio > videoRatio) {
        // L'écran est plus large que la vidéo, la hauteur est la dimension limitante
        videoHeight = screenHeight;
        videoWidth = videoHeight * videoRatio;
      } else {
        // L'écran est plus haut que la vidéo, la largeur est la dimension limitante
        videoWidth = screenWidth;
        videoHeight = videoWidth / videoRatio;
      }

      // Centrer la vidéo
      const left = (screenWidth - videoWidth) / 2;
      const top = (screenHeight - videoHeight) / 2;

      setCustomVideoDimensions({
        width: videoWidth,
        height: videoHeight,
        top,
        left,
      });

      console.log(`📐 [VideoSettings] Dimensions ${zoomMode}:`, {
        width: videoWidth,
        height: videoHeight,
        top,
        left,
      });
    } else {
      setCustomVideoDimensions(null);
    }
  }, [zoomMode, isFullscreen]);

  /**
   * Toggle le verrouillage de l'écran
   */
  const toggleScreenLock = () => {
    setIsScreenLocked(prev => {
      const newValue = !prev;
      console.log(`🔒 [VideoSettings] Écran ${newValue ? 'verrouillé' : 'déverrouillé'}`);
      return newValue;
    });
  };

  /**
   * Retourne la configuration du buffer selon le mode
   */
  const getBufferConfig = () => {
    if (bufferMode === 'low') {
      return {
        minBufferMs: 5000,
        maxBufferMs: 10000,
        bufferForPlaybackMs: 1000,
        bufferForPlaybackAfterRebufferMs: 2000,
      };
    } else if (bufferMode === 'high') {
      return {
        minBufferMs: 30000,
        maxBufferMs: 60000,
        bufferForPlaybackMs: 5000,
        bufferForPlaybackAfterRebufferMs: 10000,
      };
    } else {
      // normal
      return {
        minBufferMs: 15000,
        maxBufferMs: 30000,
        bufferForPlaybackMs: 2500,
        bufferForPlaybackAfterRebufferMs: 5000,
      };
    }
  };

  return {
    // États
    zoomMode,
    bufferMode,
    isScreenLocked,
    customVideoDimensions,

    // Actions
    setZoomMode,
    setBufferMode,
    toggleScreenLock,

    // Helpers
    getBufferConfig,
  };
};
