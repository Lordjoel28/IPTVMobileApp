/**
 * 🎯 PHASE 3: Hook personnalisé pour les gestures vidéo
 *
 * Gère tous les gestures du lecteur vidéo en mode fullscreen:
 * - Double tap gauche/droite: Seek backward/forward
 * - Tap centre: Toggle contrôles
 * - Swipe vertical gauche: Contrôle luminosité
 * - Swipe vertical droite: Contrôle volume
 * - Pinch zoom: Ajustement taille vidéo
 * - Feedback visuel: Ripple effects et indicateurs
 */

import React, {useRef} from 'react';
import {Dimensions} from 'react-native';
import {Gesture} from 'react-native-gesture-handler';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

// Types pour les callbacks
interface VideoGestureCallbacks {
  onSeekBackward: () => void;
  onSeekForward: () => void;
  onToggleControls: () => void;
  onVolumeChange?: (delta: number) => void;
  onBrightnessChange?: (delta: number) => void;
  onZoomChange?: (scale: number) => void;
}

// Types pour les états
interface VideoGestureState {
  isScreenLocked: boolean;
  currentTime: number;
  duration: number;
}

// Types pour le feedback de seek
interface SeekFeedback {
  visible: boolean;
  direction: 'forward' | 'backward';
  seconds: number;
}

// Types pour le ripple effect
interface RipplePosition {
  x: number;
  y: number;
}

export const useVideoGestures = (
  callbacks: VideoGestureCallbacks,
  state: VideoGestureState,
) => {
  // 🎯 DIMENSIONS D'ÉCRAN
  const screenDims = Dimensions.get('screen');

  // 🎯 ÉTATS LOCAUX
  const [seekFeedback, setSeekFeedback] = React.useState<SeekFeedback>({
    visible: false,
    direction: 'forward',
    seconds: 0,
  });
  const [rippleVisible, setRippleVisible] = React.useState(false);
  const [ripplePosition, setRipplePosition] = React.useState<RipplePosition>({
    x: 0,
    y: 0,
  });
  const [volumeFeedback, setVolumeFeedback] = React.useState({
    visible: false,
    level: 0,
  });
  const [brightnessFeedback, setBrightnessFeedback] = React.useState({
    visible: false,
    level: 0,
  });

  // 🎯 VALEURS ANIMÉES
  // Seek feedback animations
  const seekFeedbackOpacity = useSharedValue(0);
  const seekFeedbackScale = useSharedValue(0.8);

  // Ripple effect animations
  const rippleOpacity = useSharedValue(0);
  const rippleScale = useSharedValue(0);

  // Volume/brightness feedback animations
  const volumeFeedbackOpacity = useSharedValue(0);
  const brightnessFeedbackOpacity = useSharedValue(0);

  // Zoom animation
  const zoomScale = useSharedValue(1);

  // 🎯 REFS pour états temporaires
  const lastVolumeUpdate = useRef(0);
  const lastBrightnessUpdate = useRef(0);
  const volumeTimeout = useRef<NodeJS.Timeout | null>(null);
  const brightnessTimeout = useRef<NodeJS.Timeout | null>(null);

  // 🎯 FONCTION: Afficher effet de vague (ripple)
  const showRippleEffect = (x: number, y: number) => {
    setRipplePosition({x, y});
    setRippleVisible(true);

    // Animation de l'effet de vague
    rippleScale.value = 0;
    rippleOpacity.value = 0.6;

    rippleScale.value = withSpring(2.5, {
      damping: 15,
      stiffness: 90,
    });

    rippleOpacity.value = withTiming(0, {duration: 600});

    // Masquer après l'animation
    setTimeout(() => {
      setRippleVisible(false);
    }, 600);
  };

  // 🎯 FONCTION: Afficher feedback de seek
  const showSeekFeedback = (direction: 'forward' | 'backward', seconds: number) => {
    setSeekFeedback({visible: true, direction, seconds});

    // Animation d'apparition
    seekFeedbackOpacity.value = 0;
    seekFeedbackScale.value = 0.8;
    seekFeedbackOpacity.value = withTiming(1, {duration: 200});
    seekFeedbackScale.value = withSpring(1, {damping: 12});

    // Auto-hide après 800ms comme YouTube
    setTimeout(() => {
      seekFeedbackOpacity.value = withTiming(0, {duration: 200});
      seekFeedbackScale.value = withTiming(1.2, {duration: 200});
      setTimeout(() => {
        runOnJS(setSeekFeedback)({
          visible: false,
          direction: 'forward',
          seconds: 0,
        });
      }, 200);
    }, 800);
  };

  // 🎯 HANDLERS pour les gestures
  const handleSeekBackward = () => {
    showSeekFeedback('backward', 10);
    callbacks.onSeekBackward();
  };

  const handleSeekForward = () => {
    showSeekFeedback('forward', 10);
    callbacks.onSeekForward();
  };

  const handleVolumeChange = (delta: number) => {
    if (!callbacks.onVolumeChange) return;

    const now = Date.now();
    if (now - lastVolumeUpdate.current < 50) return; // Throttle
    lastVolumeUpdate.current = now;

    callbacks.onVolumeChange(delta);

    // Afficher feedback visuel
    setVolumeFeedback({visible: true, level: Math.round(delta * 100)});
    volumeFeedbackOpacity.value = withTiming(1, {duration: 100});

    // Clear timeout précédent
    if (volumeTimeout.current) {
      clearTimeout(volumeTimeout.current);
    }

    // Auto-hide après 1s
    volumeTimeout.current = setTimeout(() => {
      volumeFeedbackOpacity.value = withTiming(0, {duration: 300});
      setTimeout(() => {
        runOnJS(setVolumeFeedback)({visible: false, level: 0});
      }, 300);
    }, 1000);
  };

  const handleBrightnessChange = (delta: number) => {
    if (!callbacks.onBrightnessChange) return;

    const now = Date.now();
    if (now - lastBrightnessUpdate.current < 50) return; // Throttle
    lastBrightnessUpdate.current = now;

    callbacks.onBrightnessChange(delta);

    // Afficher feedback visuel
    setBrightnessFeedback({visible: true, level: Math.round(delta * 100)});
    brightnessFeedbackOpacity.value = withTiming(1, {duration: 100});

    // Clear timeout précédent
    if (brightnessTimeout.current) {
      clearTimeout(brightnessTimeout.current);
    }

    // Auto-hide après 1s
    brightnessTimeout.current = setTimeout(() => {
      brightnessFeedbackOpacity.value = withTiming(0, {duration: 300});
      setTimeout(() => {
        runOnJS(setBrightnessFeedback)({visible: false, level: 0});
      }, 300);
    }, 1000);
  };

  // 🎯 GESTURE 1: Double tap gauche (seek backward)
  const leftDoubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(_event => {
      if (state.isScreenLocked) return;

      const rippleX = screenDims.width * 0.15; // 15% de la largeur
      const rippleY = screenDims.height * 0.5; // Centre vertical

      runOnJS(showRippleEffect)(rippleX, rippleY);
      runOnJS(handleSeekBackward)();
    });

  // 🎯 GESTURE 2: Double tap droite (seek forward)
  const rightDoubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(_event => {
      if (state.isScreenLocked) return;

      const rippleX = screenDims.width * 0.85; // 85% de la largeur
      const rippleY = screenDims.height * 0.5; // Centre vertical

      runOnJS(showRippleEffect)(rippleX, rippleY);
      runOnJS(handleSeekForward)();
    });

  // 🎯 GESTURE 3: Tap centre (toggle contrôles)
  const centerTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      runOnJS(callbacks.onToggleControls)();
    });

  // 🎯 GESTURE 4: Swipe vertical gauche (luminosité)
  const leftSwipeGesture = Gesture.Pan()
    .activeOffsetY([-15, 15]) // Actif après 15px de mouvement vertical
    .failOffsetX([-30, 30]) // Échoue si mouvement horizontal > 30px
    .maxPointers(1) // Un seul doigt
    .onUpdate(event => {
      if (state.isScreenLocked) return;

      // event.translationY négatif = swipe vers le haut = augmenter luminosité
      // Normaliser le delta sur une échelle de 0 à 1
      const delta = -event.translationY / screenDims.height;

      runOnJS(handleBrightnessChange)(delta);
    })
    .onEnd(() => {
      // Reset si besoin
    });

  // 🎯 GESTURE 5: Swipe vertical droite (volume)
  const rightSwipeGesture = Gesture.Pan()
    .activeOffsetY([-15, 15])
    .failOffsetX([-30, 30])
    .maxPointers(1)
    .onUpdate(event => {
      if (state.isScreenLocked) return;

      // event.translationY négatif = swipe vers le haut = augmenter volume
      const delta = -event.translationY / screenDims.height;

      runOnJS(handleVolumeChange)(delta);
    })
    .onEnd(() => {
      // Reset si besoin
    });

  // 🎯 GESTURE 6: Pinch zoom
  const pinchGesture = Gesture.Pinch()
    .onUpdate(event => {
      if (state.isScreenLocked) return;

      // event.scale > 1 = zoom in, < 1 = zoom out
      zoomScale.value = event.scale;

      if (callbacks.onZoomChange) {
        runOnJS(callbacks.onZoomChange)(event.scale);
      }
    })
    .onEnd(event => {
      // Snap au zoom le plus proche
      const finalScale = event.scale;
      let snappedScale = 1;

      if (finalScale < 0.8) {
        snappedScale = 0.75; // Zoom out
      } else if (finalScale > 1.2) {
        snappedScale = 1.5; // Zoom in
      } else {
        snappedScale = 1; // Normal
      }

      zoomScale.value = withSpring(snappedScale, {
        damping: 15,
        stiffness: 150,
      });

      if (callbacks.onZoomChange) {
        runOnJS(callbacks.onZoomChange)(snappedScale);
      }
    });

  // 🎯 GESTURE COMPOSÉS
  // Pour les zones gauche et droite, on utilise Race:
  // Le premier gesture reconnu "gagne" et annule l'autre
  // Double-tap est reconnu rapidement (2 taps), swipe nécessite mouvement continu
  // Avec Race(), si l'utilisateur commence à swiper, le double-tap est annulé
  // Si l'utilisateur double-tap rapidement, le swipe n'est pas initié
  const leftSideGesture = Gesture.Race(leftDoubleTap, leftSwipeGesture);
  const rightSideGesture = Gesture.Race(rightDoubleTap, rightSwipeGesture);

  // 🎯 STYLES ANIMÉS
  const seekFeedbackAnimatedStyle = useAnimatedStyle(() => ({
    opacity: seekFeedbackOpacity.value,
    transform: [{scale: seekFeedbackScale.value}],
  }));

  const rippleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: rippleOpacity.value,
    transform: [{scale: rippleScale.value}],
  }));

  const volumeFeedbackAnimatedStyle = useAnimatedStyle(() => ({
    opacity: volumeFeedbackOpacity.value,
  }));

  const brightnessFeedbackAnimatedStyle = useAnimatedStyle(() => ({
    opacity: brightnessFeedbackOpacity.value,
  }));

  const zoomAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: zoomScale.value}],
  }));

  // 🎯 RETOURNER TOUS LES GESTURES ET ÉTATS
  return {
    // Gestures pour les zones de l'écran
    gestures: {
      leftSide: leftSideGesture,
      rightSide: rightSideGesture,
      center: centerTapGesture,
      pinch: pinchGesture,
    },

    // États des feedbacks
    feedback: {
      seek: seekFeedback,
      ripple: {visible: rippleVisible, position: ripplePosition},
      volume: volumeFeedback,
      brightness: brightnessFeedback,
    },

    // Styles animés
    animatedStyles: {
      seekFeedback: seekFeedbackAnimatedStyle,
      ripple: rippleAnimatedStyle,
      volumeFeedback: volumeFeedbackAnimatedStyle,
      brightnessFeedback: brightnessFeedbackAnimatedStyle,
      zoom: zoomAnimatedStyle,
    },

    // Valeurs partagées (si besoin d'accès direct)
    sharedValues: {
      seekFeedbackOpacity,
      seekFeedbackScale,
      rippleOpacity,
      rippleScale,
      volumeFeedbackOpacity,
      brightnessFeedbackOpacity,
      zoomScale,
    },
  };
};
