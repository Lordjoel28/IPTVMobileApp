import { useState, useRef, useCallback } from 'react';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { Animated as RNAnimated } from 'react-native';

/**
 * Hook générique pour gérer l'affichage/masquage automatique de contrôles
 * avec animation et timeout automatique.
 *
 * Remplace la duplication de code dans GlobalVideoPlayer pour:
 * - PiP buttons
 * - Play/Pause button
 * - TiviMate controls
 * - Docker
 * - Settings menu
 */

interface UseAutoHideControlsOptions {
  /** Durée avant masquage automatique (ms). Default: 3000 */
  hideDelay?: number;
  /** Durée de l'animation fade in/out (ms). Default: 300 */
  animationDuration?: number;
  /** Type d'animation: 'reanimated' (useSharedValue) ou 'animated' (RNAnimated). Default: 'reanimated' */
  animationType?: 'reanimated' | 'animated';
  /** Callback appelé après affichage */
  onShow?: () => void;
  /** Callback appelé après masquage */
  onHide?: () => void;
}

interface UseAutoHideControlsReturn {
  /** État visible/caché */
  isVisible: boolean;
  /** Opacity animée (Reanimated) */
  opacity: any;
  /** Opacity animée (RN Animated) - si animationType='animated' */
  rnOpacity?: RNAnimated.Value;
  /** Afficher les contrôles */
  show: () => void;
  /** Masquer les contrôles */
  hide: () => void;
  /** Afficher temporairement puis cacher automatiquement */
  showTemporarily: () => void;
  /** Toggle visible/caché */
  toggle: () => void;
  /** Reset le timeout (prolonge l'affichage) */
  resetTimeout: () => void;
  /** Annule le timeout en cours */
  clearTimeout: () => void;
}

export const useAutoHideControls = (
  options: UseAutoHideControlsOptions = {}
): UseAutoHideControlsReturn => {
  const {
    hideDelay = 3000,
    animationDuration = 300,
    animationType = 'reanimated',
    onShow,
    onHide,
  } = options;

  // État visible/caché
  const [isVisible, setIsVisible] = useState(false);

  // Animations
  const opacity = useSharedValue(0);
  const rnOpacity = useRef(new RNAnimated.Value(0)).current;

  // Timeout de masquage automatique
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Nettoie le timeout existant
   */
  const clearCurrentTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  /**
   * Affiche les contrôles avec animation
   */
  const show = useCallback(() => {
    console.log('🔵 [useAutoHideControls] show() appelé - isVisible devient true');
    setIsVisible(true);

    if (animationType === 'reanimated') {
      opacity.value = withTiming(1, { duration: animationDuration });
    } else {
      RNAnimated.timing(rnOpacity, {
        toValue: 1,
        duration: animationDuration,
        useNativeDriver: false,
      }).start();
    }

    onShow?.();
  }, [animationType, animationDuration, opacity, rnOpacity, onShow]);

  /**
   * Masque les contrôles avec animation
   */
  const hide = useCallback(() => {
    clearCurrentTimeout();

    if (animationType === 'reanimated') {
      opacity.value = withTiming(0, { duration: animationDuration });
    } else {
      RNAnimated.timing(rnOpacity, {
        toValue: 0,
        duration: animationDuration,
        useNativeDriver: false,
      }).start();
    }

    // Attendre la fin de l'animation avant de changer l'état
    setTimeout(() => {
      setIsVisible(false);
      onHide?.();
    }, animationDuration);
  }, [animationType, animationDuration, opacity, rnOpacity, clearCurrentTimeout, onHide]);

  /**
   * Affiche temporairement puis masque automatiquement
   */
  const showTemporarily = useCallback(() => {
    console.log(`🟢 [useAutoHideControls] showTemporarily() - hideDelay: ${hideDelay}ms`);
    // Nettoyer le timeout précédent
    clearCurrentTimeout();

    // Afficher
    show();

    // Programmer le masquage automatique
    timeoutRef.current = setTimeout(() => {
      console.log('⏱️ [useAutoHideControls] Auto-hide timeout atteint - appel hide()');
      hide();
    }, hideDelay);
  }, [show, hide, hideDelay, clearCurrentTimeout]);

  /**
   * Toggle visible/caché
   */
  const toggle = useCallback(() => {
    if (isVisible) {
      hide();
    } else {
      show();
    }
  }, [isVisible, show, hide]);

  /**
   * Reset le timeout (prolonge l'affichage)
   */
  const resetTimeout = useCallback(() => {
    if (isVisible) {
      showTemporarily();
    }
  }, [isVisible, showTemporarily]);

  return {
    isVisible,
    opacity,
    rnOpacity: animationType === 'animated' ? rnOpacity : undefined,
    show,
    hide,
    showTemporarily,
    toggle,
    resetTimeout,
    clearTimeout: clearCurrentTimeout,
  };
};
