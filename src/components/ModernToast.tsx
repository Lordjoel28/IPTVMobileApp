/**
 * 🎨 Modern Toast - Popup pilule élégant 2.0
 * Design sobre, taille adaptative, style pilule moderne
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';

const { width, height } = Dimensions.get('window');

interface ModernToastProps {
  visible: boolean;
  type: 'success' | 'error' | 'loading' | 'info';
  title: string;
  message?: string;
  duration?: number;
  onHide?: () => void;
}

const ModernToast: React.FC<ModernToastProps> = ({
  visible,
  type,
  title,
  message,
  duration = 3000,
  onHide,
}) => {
  const translateY = useRef(new Animated.Value(-200)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const rotateValue = useRef(new Animated.Value(0)).current;

  // Animation de rotation pour le loading
  const rotateAnimation = useRef<Animated.CompositeAnimation>();

  useEffect(() => {
    if (visible) {
      // Animation d'entrée
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: StatusBar.currentHeight ? StatusBar.currentHeight + 20 : 60,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 100,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();

      // Animation de rotation pour loading
      if (type === 'loading') {
        const rotate = () => {
          rotateValue.setValue(0);
          rotateAnimation.current = Animated.timing(rotateValue, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          });
          rotateAnimation.current.start(({ finished }) => {
            if (finished && visible) {
              rotate();
            }
          });
        };
        rotate();
      }

      // Auto-hide sauf pour loading
      if (type !== 'loading' && duration > 0) {
        const timer = setTimeout(() => {
          hideToast();
        }, duration);
        return () => clearTimeout(timer);
      }
    } else {
      // Animation de sortie
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -200,
          duration: 200,
          useNativeDriver: true,
        }),
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
      ]).start();

      // Arrêter l'animation de rotation
      if (rotateAnimation.current) {
        rotateAnimation.current.stop();
      }
    }
  }, [visible, type, duration]);

  const hideToast = () => {
    if (onHide) {
      onHide();
    }
  };

  if (!visible && opacity._value === 0) {
    return null;
  }

  const getConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: 'check-circle',
          colors: ['rgba(74, 155, 142, 0.95)', 'rgba(44, 82, 130, 0.9)'],
          iconColor: '#FFFFFF',
        };
      case 'error':
        return {
          icon: 'error',
          colors: ['rgba(239, 68, 68, 0.95)', 'rgba(185, 28, 28, 0.9)'],
          iconColor: '#FFFFFF',
        };
      case 'loading':
        return {
          icon: 'sync',
          colors: ['rgba(44, 82, 130, 0.95)', 'rgba(30, 58, 95, 0.9)'],
          iconColor: '#FFFFFF',
        };
      case 'info':
      default:
        return {
          icon: 'info',
          colors: ['rgba(214, 158, 46, 0.95)', 'rgba(180, 83, 9, 0.9)'],
          iconColor: '#FFFFFF',
        };
    }
  };

  const config = getConfig();
  const spin = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }, { scale }],
          opacity,
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.centeredContainer}>
        <BlurView
          style={styles.blurContainer}
          blurType="dark"
          blurAmount={25}
          reducedTransparencyFallbackColor="rgba(0,0,0,0.85)"
        >
          <LinearGradient
            colors={config.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <View style={styles.content}>
              <View style={styles.iconContainer}>
                <Animated.View
                  style={[
                    type === 'loading' && { transform: [{ rotate: spin }] },
                  ]}
                >
                  <Icon 
                    name={config.icon} 
                    size={22} 
                    color={config.iconColor} 
                  />
                </Animated.View>
              </View>
              
              <View style={styles.textContainer}>
                <Text style={styles.title}>{title}</Text>
                {message && <Text style={styles.message}>{message}</Text>}
              </View>
            </View>

            {/* Effet de brillance subtile */}
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.08)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shine}
            />
          </LinearGradient>
        </BlurView>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 999,
  },
  centeredContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  blurContainer: {
    borderRadius: 28,
    overflow: 'hidden',
    minWidth: 200,
    maxWidth: width * 0.85,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  gradient: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  iconContainer: {
    marginRight: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    paddingRight: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 1,
    letterSpacing: 0.2,
  },
  message: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.92)',
    lineHeight: 16,
    fontWeight: '400',
  },
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    transform: [{ skewX: '-15deg' }],
  },
});

export default ModernToast;