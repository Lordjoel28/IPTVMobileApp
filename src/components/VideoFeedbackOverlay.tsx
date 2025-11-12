/**
 * 🎯 COMPOSANT: Overlays de feedback pour le lecteur vidéo
 *
 * Affiche les indicateurs visuels pour:
 * - Seek forward/backward (avec icônes et durée)
 * - Ripple effect (effet de vague)
 */

import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Animated from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

// 🎯 TYPES
interface SeekFeedback {
  visible: boolean;
  direction: 'forward' | 'backward';
  seconds: number;
}

interface RippleFeedback {
  visible: boolean;
  position: {x: number; y: number};
}

interface VideoFeedbackOverlayProps {
  // Feedback seek
  seekFeedback: SeekFeedback;
  seekFeedbackStyle: any;

  // Feedback ripple
  rippleFeedback: RippleFeedback;
  rippleStyle: any;
}

// 🎯 COMPOSANT: Indicateur de Seek
const SeekIndicator: React.FC<{
  direction: 'forward' | 'backward';
  seconds: number;
  style: any;
}> = ({direction, seconds, style}) => {
  const isForward = direction === 'forward';

  return (
    <Animated.View style={[styles.seekIndicator, style]}>
      <LinearGradient
        colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']}
        style={styles.seekGradient}>
        <Icon
          name={isForward ? 'forward-10' : 'replay-10'}
          size={48}
          color="#FFFFFF"
        />
        <Text style={styles.seekText}>
          {isForward ? '+' : '-'}{seconds}s
        </Text>
      </LinearGradient>
    </Animated.View>
  );
};

// 🎯 COMPOSANT: Effet de vague (Ripple)
const RippleEffect: React.FC<{
  position: {x: number; y: number};
  style: any;
}> = ({position, style}) => {
  return (
    <Animated.View
      style={[
        styles.ripple,
        {
          left: position.x - 75, // Centrer le ripple (150/2)
          top: position.y - 75,
        },
        style,
      ]}>
      <LinearGradient
        colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.0)']}
        style={styles.rippleGradient}
      />
    </Animated.View>
  );
};

// 🎯 COMPOSANT PRINCIPAL: Overlay de feedback vidéo
export const VideoFeedbackOverlay: React.FC<VideoFeedbackOverlayProps> = ({
  seekFeedback,
  seekFeedbackStyle,
  rippleFeedback,
  rippleStyle,
}) => {
  return (
    <>
      {/* Seek Feedback - Centre de l'écran */}
      {seekFeedback.visible && (
        <SeekIndicator
          direction={seekFeedback.direction}
          seconds={seekFeedback.seconds}
          style={seekFeedbackStyle}
        />
      )}

      {/* Ripple Effect - Position dynamique */}
      {rippleFeedback.visible && (
        <RippleEffect position={rippleFeedback.position} style={rippleStyle} />
      )}
    </>
  );
};

// 🎯 STYLES
const styles = StyleSheet.create({
  // Seek Indicator
  seekIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{translateX: -75}, {translateY: -75}],
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  seekGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  seekText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },

  // Ripple Effect
  ripple: {
    position: 'absolute',
    width: 150,
    height: 150,
    zIndex: 999,
  },
  rippleGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 75,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
});
