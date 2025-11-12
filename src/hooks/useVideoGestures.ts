/**
 * 🎯 Hook personnalisé pour les gestures vidéo
 *
 * Gère uniquement le double tap gauche/droite pour seek backward/forward
 */

import React from 'react';
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
}

// Types pour les états
interface VideoGestureState {
  isScreenLocked: boolean;
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
  const screenDims = Dimensions.get('screen');

  // États locaux
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

  // Valeurs animées
  const seekFeedbackOpacity = useSharedValue(0);
  const seekFeedbackScale = useSharedValue(0.8);
  const rippleOpacity = useSharedValue(0);
  const rippleScale = useSharedValue(0);

  // Afficher effet de vague (ripple)
  const showRippleEffect = (x: number, y: number) => {
    setRipplePosition({x, y});
    setRippleVisible(true);

    rippleScale.value = 0;
    rippleOpacity.value = 0.6;

    rippleScale.value = withSpring(2.5, {
      damping: 15,
      stiffness: 90,
    });

    rippleOpacity.value = withTiming(0, {duration: 600});

    setTimeout(() => {
      setRippleVisible(false);
    }, 600);
  };

  // Afficher feedback de seek
  const showSeekFeedback = (direction: 'forward' | 'backward', seconds: number) => {
    setSeekFeedback({visible: true, direction, seconds});

    seekFeedbackOpacity.value = 0;
    seekFeedbackScale.value = 0.8;
    seekFeedbackOpacity.value = withTiming(1, {duration: 200});
    seekFeedbackScale.value = withSpring(1, {damping: 12});

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

  // Handlers pour les gestures
  const handleSeekBackward = () => {
    if (!callbacks.onSeekBackward) return;
    showSeekFeedback('backward', 10);
    callbacks.onSeekBackward();
  };

  const handleSeekForward = () => {
    if (!callbacks.onSeekForward) return;
    showSeekFeedback('forward', 10);
    callbacks.onSeekForward();
  };

  // GESTURE: Double tap gauche/droite pour seek
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(500)
    .onEnd((event, success) => {
      'worklet';
      if (!success || state.isScreenLocked) return;

      const tapX = event.x;
      const screenWidth = screenDims.width;

      // Zones de détection: 35% à gauche, 35% à droite
      const leftZoneEnd = screenWidth * 0.35;
      const rightZoneStart = screenWidth * 0.65;

      if (tapX < leftZoneEnd) {
        // Zone gauche -> Reculer
        const rippleX = screenWidth * 0.15;
        const rippleY = screenDims.height * 0.5;
        runOnJS(showRippleEffect)(rippleX, rippleY);
        runOnJS(handleSeekBackward)();
      } else if (tapX > rightZoneStart) {
        // Zone droite -> Avancer
        const rippleX = screenWidth * 0.85;
        const rippleY = screenDims.height * 0.5;
        runOnJS(showRippleEffect)(rippleX, rippleY);
        runOnJS(handleSeekForward)();
      }
    });

  // Styles animés
  const seekFeedbackAnimatedStyle = useAnimatedStyle(() => ({
    opacity: seekFeedbackOpacity.value,
    transform: [{scale: seekFeedbackScale.value}],
  }));

  const rippleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: rippleOpacity.value,
    transform: [{scale: rippleScale.value}],
  }));

  return {
    // Gestures pour les zones de l'écran
    gestures: {
      leftSide: doubleTapGesture,
      rightSide: doubleTapGesture,
    },

    // États des feedbacks
    feedback: {
      seek: seekFeedback,
      ripple: {visible: rippleVisible, position: ripplePosition},
    },

    // Styles animés
    animatedStyles: {
      seekFeedback: seekFeedbackAnimatedStyle,
      ripple: rippleAnimatedStyle,
    },

    // Valeurs partagées
    sharedValues: {
      seekFeedbackOpacity,
      seekFeedbackScale,
      rippleOpacity,
      rippleScale,
    },
  };
};
