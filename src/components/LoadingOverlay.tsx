/**
 * ⛕ Loading Overlay - Animation de chargement moderne 2.0
 * Design sobre, centrage parfait, animations fluides premium
 */

import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {BlurView} from '@react-native-community/blur';
// AppContext removed - using UIStore instead
import {useUIStore} from '../stores/UIStore';
import {useI18n} from '../hooks/useI18n';

const {width, height} = Dimensions.get('window');

const LoadingOverlay: React.FC = () => {
  // Replaced AppContext with UIStore
  const {loading} = useUIStore();
  const {visible, title, subtitle, progress} = loading;
  const {t} = useI18n('settings');

  // Traduire le message si c'est une clé i18n
  const translateMessage = (message: string): string => {
    if (!message) return message;

    // Format "settings:keyName"
    if (message.startsWith('settings:')) {
      const key = message.replace('settings:', '');
      return t(key);
    }

    // Sinon retourner tel quel
    return message;
  };

  const translatedTitle = translateMessage(title);
  const translatedSubtitle = subtitle ? translateMessage(subtitle) : subtitle;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const rotateValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  const dotsValue = useRef(new Animated.Value(0)).current;
  const hasAnimatedOut = useRef(false);

  // Animations continues
  const rotateAnimation = useRef<Animated.CompositeAnimation>();
  const pulseAnimation = useRef<Animated.CompositeAnimation>();
  const dotsAnimation = useRef<Animated.CompositeAnimation>();
  const isMountedRef = useRef(true);

  useEffect(() => {
    if (visible) {
      hasAnimatedOut.current = false;
      isMountedRef.current = true;

      // Animation d'entrée
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Animation de rotation continue
      const startRotate = () => {
        if (!isMountedRef.current) return;

        rotateValue.setValue(0);
        rotateAnimation.current = Animated.timing(rotateValue, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        });
        rotateAnimation.current.start(({finished}) => {
          if (finished && isMountedRef.current) {
            startRotate();
          }
        });
      };
      startRotate();

      // Animation de pulsation
      const startPulse = () => {
        if (!isMountedRef.current) return;

        pulseAnimation.current = Animated.sequence([
          Animated.timing(pulseValue, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseValue, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]);
        pulseAnimation.current.start(({finished}) => {
          if (finished && isMountedRef.current) {
            startPulse();
          }
        });
      };
      startPulse();

      // Animation des points
      const startDots = () => {
        if (!isMountedRef.current) return;

        dotsAnimation.current = Animated.timing(dotsValue, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        });
        dotsAnimation.current.start(({finished}) => {
          if (finished && isMountedRef.current) {
            dotsValue.setValue(0);
            startDots();
          }
        });
      };
      startDots();
    } else {
      // Marquer comme non monté pour stopper les boucles
      isMountedRef.current = false;

      // Arrêter IMMÉDIATEMENT toutes les animations AVANT la sortie
      rotateValue.stopAnimation();
      pulseValue.stopAnimation();
      dotsValue.stopAnimation();
      if (rotateAnimation.current) {
        rotateAnimation.current.stop();
      }
      if (pulseAnimation.current) {
        pulseAnimation.current.stop();
      }
      if (dotsAnimation.current) {
        dotsAnimation.current.stop();
      }

      // Animation de sortie
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        hasAnimatedOut.current = true;
      });
    }

    return () => {
      // Cleanup au démontage
      isMountedRef.current = false;
      rotateValue.stopAnimation();
      pulseValue.stopAnimation();
      dotsValue.stopAnimation();
      opacity.stopAnimation();
      scale.stopAnimation();

      if (rotateAnimation.current) {
        rotateAnimation.current.stop();
      }
      if (pulseAnimation.current) {
        pulseAnimation.current.stop();
      }
      if (dotsAnimation.current) {
        dotsAnimation.current.stop();
      }
    };
  }, [visible]);

  if (!visible && hasAnimatedOut.current) {
    return null;
  }

  const spin = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const dotsOpacity = dotsValue.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: [0.3, 1, 0.3, 0.3],
  });

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity,
        },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}>
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.95)" />

      <BlurView
        style={styles.blurOverlay}
        blurType="dark"
        blurAmount={5}
        reducedTransparencyFallbackColor="rgba(0,0,0,0.4)">
        <View style={styles.centeringContainer}>
          <Animated.View
            style={[
              styles.container,
              {
                transform: [{scale}],
              },
            ]}>
            <LinearGradient
              colors={[
                'rgba(26, 26, 26, 0.98)',
                'rgba(45, 45, 45, 0.96)',
                'rgba(30, 58, 95, 0.94)',
              ]}
              locations={[0, 0.6, 1]}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.contentContainer}>
              {/* Spinner principal moderne */}
              <Animated.View
                style={[
                  styles.spinnerContainer,
                  {
                    transform: [{scale: pulseValue}, {rotate: spin}],
                  },
                ]}>
                <LinearGradient
                  colors={['#4a9b8e', '#2c5282', '#1e3a5f']}
                  style={styles.spinner}>
                  <View style={styles.spinnerInner} />
                </LinearGradient>
              </Animated.View>

              {/* Texte principal sobre */}
              <Text style={styles.title}>{translatedTitle}</Text>

              {/* Sous-titre avec points animés */}
              {translatedSubtitle && (
                <View style={styles.subtitleContainer}>
                  <Text style={styles.subtitle}>{translatedSubtitle}</Text>
                  <Animated.Text style={[styles.dots, {opacity: dotsOpacity}]}>
                    ...
                  </Animated.Text>
                </View>
              )}

              {/* Barre de progression dynamique */}
              {typeof progress === 'number' && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressTrack}>
                    <Animated.View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.max(0, Math.min(100, progress))}%`,
                        },
                      ]}>
                      <LinearGradient
                        colors={['#4a9b8e', '#2c5282']}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 0}}
                        style={styles.progressGradient}
                      />
                    </Animated.View>
                  </View>
                  <Text style={styles.progressText}>
                    {Math.round(progress)}%
                  </Text>
                </View>
              )}

              {/* Effet de brillance subtile */}
              <LinearGradient
                colors={[
                  'transparent',
                  'rgba(74, 155, 142, 0.08)',
                  'transparent',
                ]}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.shine}
              />
            </LinearGradient>
          </Animated.View>
        </View>
      </BlurView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999999, // Maximum z-index pour être au-dessus de tous les modals
    elevation: 999999, // Maximum elevation pour Android
  },
  blurOverlay: {
    flex: 1,
  },
  centeringContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    padding: 40,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(74, 155, 142, 0.2)',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 12},
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 20,
    maxWidth: 400,
    minWidth: 320,
  },
  spinnerContainer: {
    marginBottom: 20,
  },
  spinner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4a9b8e',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  spinnerInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    borderWidth: 2,
    borderColor: 'rgba(74, 155, 142, 0.25)',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e2e8f0',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 20,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(226, 232, 240, 0.8)',
    textAlign: 'center',
    fontWeight: '400',
  },
  dots: {
    fontSize: 14,
    color: 'rgba(226, 232, 240, 0.8)',
    marginLeft: 4,
  },
  progressContainer: {
    width: '100%',
    marginTop: 18,
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(226, 232, 240, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressGradient: {
    flex: 1,
    height: '100%',
  },
  progressText: {
    fontSize: 11,
    color: 'rgba(226, 232, 240, 0.7)',
    marginTop: 8,
    fontWeight: '500',
  },
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
});

export default LoadingOverlay;
