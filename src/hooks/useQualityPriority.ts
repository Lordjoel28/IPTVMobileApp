/**
 * 🎯 useQualityPriority - Hook pour gérer la priorité de qualité vidéo
 * Permet de choisir entre résolution maximale ou fluidité optimale
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { videoSettingsService } from '../services/VideoSettingsService';

export type QualityPriority = 'resolution' | 'fluidity';

export interface QualityPriorityConfig {
  priority: QualityPriority;
  autoSwitch: boolean;
  networkAware: boolean;
}

export interface QualityOption {
  label: string;
  value: QualityPriority;
  description: string;
  icon: string;
  bitrate: number;
  resolution: string;
}

export const useQualityPriority = (initialConfig?: Partial<QualityPriorityConfig>) => {
  const [config, setConfig] = useState<QualityPriorityConfig>({
    priority: 'resolution',
    autoSwitch: true,
    networkAware: false,
    ...initialConfig,
  });

  const videoRef = useRef<any>(null);

  // Options de qualité prédéfinies
  const qualityOptions: QualityOption[] = [
    {
      label: 'Résolution',
      value: 'resolution',
      description: 'Meilleure qualité visuelle',
      icon: 'high-quality',
      bitrate: 8000, // 8 Mbps
      resolution: '1080p'
    },
    {
      label: 'Fluidité',
      value: 'fluidity',
      description: 'Lecture fluide optimale',
      icon: 'speed',
      bitrate: 3000, // 3 Mbps
      resolution: '720p'
    }
  ];

  /**
   * Charge la configuration depuis les paramètres sauvegardés
   */
  const loadQualityPriority = useCallback(async () => {
    try {
      const priority = await videoSettingsService.getSetting('qualityPriority');
      if (priority) {
        setConfig(prev => ({ ...prev, priority }));
        console.log(`🎯 [QualityPriority] Priorité chargée: ${priority}`);
      }
    } catch (error) {
      console.error('❌ [QualityPriority] Erreur chargement priorité:', error);
    }
  }, []);

  /**
   * Sauvegarde la configuration dans les paramètres
   */
  const saveQualityPriority = useCallback(async (priority: QualityPriority) => {
    try {
      const success = await videoSettingsService.updateSetting('qualityPriority', priority);
      if (success) {
        setConfig(prev => ({ ...prev, priority }));
        console.log(`✅ [QualityPriority] Priorité sauvegardée: ${priority}`);
      }
    } catch (error) {
      console.error('❌ [QualityPriority] Erreur sauvegarde priorité:', error);
    }
  }, []);

  /**
   * Change la priorité de qualité
   */
  const changePriority = useCallback((newPriority: QualityPriority) => {
    setConfig(prev => ({ ...prev, priority: newPriority }));
    saveQualityPriority(newPriority);

    // Appliquer immédiatement si vidéo en cours
    if (videoRef.current) {
      applyQualityPriority(newPriority);
    }
  }, [saveQualityPriority]);

  /**
   * Applique la priorité de qualité au lecteur vidéo
   */
  const applyQualityPriority = useCallback((priority: QualityPriority) => {
    if (!videoRef.current) {
      console.warn('⚠️ [QualityPriority] Aucune référence vidéo');
      return false;
    }

    const selectedOption = qualityOptions.find(opt => opt.value === priority);
    if (!selectedOption) {
      console.error('❌ [QualityPriority] Option non trouvée:', priority);
      return false;
    }

    try {
      // Appliquer les paramètres selon la priorité
      if (priority === 'resolution') {
        // Priorité résolution maximale
        videoRef.current.setNativeProps?.({
          preferredPeakBitRate: selectedOption.bitrate * 1000, // Convertir en bps
          resizeMode: 'cover',
          bufferConfig: {
            minBufferMs: 2000,
            maxBufferMs: 10000,
            bufferForPlaybackMs: 1000,
            bufferForPlaybackAfterRebufferMs: 2000,
          }
        });
      } else {
        // Priorité fluidité
        videoRef.current.setNativeProps?.({
          preferredPeakBitRate: selectedOption.bitrate * 1000,
          resizeMode: 'contain',
          bufferConfig: {
            minBufferMs: 500,
            maxBufferMs: 5000,
            bufferForPlaybackMs: 250,
            bufferForPlaybackAfterRebufferMs: 500,
          }
        });
      }

      console.log(`🎯 [QualityPriority] Priorité appliquée: ${priority} (${selectedOption.label})`);
      return true;
    } catch (error) {
      console.error('❌ [QualityPriority] Erreur application priorité:', error);
      return false;
    }
  }, []);

  /**
   * Obtient la meilleure qualité selon la priorité et le réseau
   */
  const getOptimalQuality = useCallback((availableQualities: any[], networkSpeed?: number) => {
    const priority = config.priority;

    if (priority === 'resolution') {
      // Prendre la qualité la plus élevée disponible
      return availableQualities.reduce((best, current) => {
        const currentBitrate = current.bitrate || 0;
        const bestBitrate = best.bitrate || 0;
        return currentBitrate > bestBitrate ? current : best;
      }, availableQualities[0]);
    } else {
      // Prendre la qualité optimale pour fluidité
      const targetBitrate = qualityOptions.find(opt => opt.value === 'fluidity')?.bitrate || 3000;

      // Trouver la qualité la plus proche du bitrate cible
      return availableQualities.reduce((best, current) => {
        const currentDiff = Math.abs((current.bitrate || 0) - targetBitrate);
        const bestDiff = Math.abs((best.bitrate || 0) - targetBitrate);
        return currentDiff < bestDiff ? current : best;
      }, availableQualities[0]);
    }
  }, [config.priority]);

  /**
   * Active/désactive le changement automatique
   */
  const toggleAutoSwitch = useCallback((enabled: boolean) => {
    setConfig(prev => ({ ...prev, autoSwitch: enabled }));
  }, []);

  /**
   * Active/désactive la détection réseau
   */
  const toggleNetworkAware = useCallback((enabled: boolean) => {
    setConfig(prev => ({ ...prev, networkAware: enabled }));
  }, []);

  /**
   * Ajuste la qualité selon les conditions réseau
   */
  const adjustForNetwork = useCallback((networkType: string, signalStrength?: number) => {
    if (!config.networkAware || !config.autoSwitch) {
      return;
    }

    let adjustedPriority: QualityPriority = config.priority;

    // Ajuster selon le type de réseau
    switch (networkType) {
      case 'wifi':
        // Garder la priorité actuelle
        break;
      case '4g':
      case 'lte':
        if (signalStrength && signalStrength < 50) {
          adjustedPriority = 'fluidity';
        }
        break;
      case '3g':
      case '2g':
        adjustedPriority = 'fluidity';
        break;
      default:
        adjustedPriority = 'fluidity';
    }

    if (adjustedPriority !== config.priority) {
      changePriority(adjustedPriority);
      console.log(`🌐 [QualityPriority] Ajustement réseau: ${networkType} → ${adjustedPriority}`);
    }
  }, [config.networkAware, config.autoSwitch, config.priority, changePriority]);

  // Charger la configuration au montage
  useEffect(() => {
    loadQualityPriority();
  }, [loadQualityPriority]);

  return {
    // État
    currentPriority: config.priority,
    autoSwitch: config.autoSwitch,
    networkAware: config.networkAware,
    qualityOptions,

    // Actions principales
    changePriority,
    applyQualityPriority,
    getOptimalQuality,

    // Configuration avancée
    toggleAutoSwitch,
    toggleNetworkAware,
    adjustForNetwork,

    // Référence vidéo
    videoRef,

    // Configuration
    updateConfig: setConfig,
  };
};

export default useQualityPriority;