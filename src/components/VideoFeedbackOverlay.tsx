/**
 * 🎯 COMPOSANT: Overlays de feedback pour le lecteur vidéo
 *
 * Affiche les indicateurs visuels pour:
 * - Seek forward/backward (avec icônes et durée)
 * - Volume (barre verticale + icône)
 * - Luminosité (barre verticale + icône)
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

interface VolumeBrightnessFeedback {
  visible: boolean;
  level: number;
}

interface VideoFeedbackOverlayProps {
  // Feedback seek
  seekFeedback: SeekFeedback;
  seekFeedbackStyle: any;

  // Feedback ripple
  rippleFeedback: RippleFeedback;
  rippleStyle: any;

  // Feedback volume
  volumeFeedback: VolumeBrightnessFeedback;
  volumeFeedbackStyle: any;

  // Feedback luminosité
  brightnessFeedback: VolumeBrightnessFeedback;
  brightnessFeedbackStyle: any;
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

// 🎯 COMPOSANT: Indicateur de Volume/Luminosité
const VerticalIndicator: React.FC<{
  type: 'volume' | 'brightness';
  level: number;
  style: any;
}> = ({type, level, style}) => {
  const isVolume = type === 'volume';
  const icon = isVolume ? 'volume-up' : 'brightness-high';
  const color = isVolume ? '#FF9500' : '#FFD700';

  // Normaliser le level entre 0 et 100
  const normalizedLevel = Math.max(0, Math.min(100, level));

  return (
    <Animated.View
      style={[
        styles.verticalIndicator,
        isVolume ? styles.volumeIndicator : styles.brightnessIndicator,
        style,
      ]}>
      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.6)']}
        style={styles.indicatorContainer}>
        {/* Icône */}
        <Icon name={icon} size={28} color={color} />

        {/* Barre de progression verticale */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarFill,
                {
                  height: `${normalizedLevel}%`,
                  backgroundColor: color,
                },
              ]}
            />
          </View>
        </View>

        {/* Pourcentage */}
        <Text style={styles.indicatorText}>{normalizedLevel}%</Text>
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
  volumeFeedback,
  volumeFeedbackStyle,
  brightnessFeedback,
  brightnessFeedbackStyle,
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

      {/* Volume Feedback - Côté droit */}
      {volumeFeedback.visible && (
        <VerticalIndicator
          type="volume"
          level={volumeFeedback.level}
          style={volumeFeedbackStyle}
        />
      )}

      {/* Brightness Feedback - Côté gauche */}
      {brightnessFeedback.visible && (
        <VerticalIndicator
          type="brightness"
          level={brightnessFeedback.level}
          style={brightnessFeedbackStyle}
        />
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

  // Vertical Indicator (Volume/Brightness)
  verticalIndicator: {
    position: 'absolute',
    top: '50%',
    transform: [{translateY: -100}],
    width: 80,
    height: 200,
    zIndex: 1000,
  },
  volumeIndicator: {
    right: 30,
  },
  brightnessIndicator: {
    left: 30,
  },
  indicatorContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Progress Bar
  progressBarContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  progressBarBackground: {
    width: 8,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  progressBarFill: {
    width: '100%',
    borderRadius: 4,
  },
  indicatorText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
