/**
 * 🔔 Notification Toast - Pop-up de notification moderne
 * Design avec bords parfaitement lisses, animations fluides
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
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useApp } from '../context/AppContext';

const { width, height } = Dimensions.get('window');

const NotificationToast: React.FC = () => {
  const { notification } = useApp();
  const { visible, message, type } = notification;
  
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-100)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      // Animation d'entrée
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 120,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animation de sortie
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.8,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible && opacity._value === 0) {
    return null;
  }

  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          colors: ['#10b981', '#059669', '#047857'],
          icon: 'check-circle',
          iconColor: '#ffffff',
        };
      case 'error':
        return {
          colors: ['#ef4444', '#dc2626', '#b91c1c'],
          icon: 'error',
          iconColor: '#ffffff',
        };
      case 'warning':
        return {
          colors: ['#f59e0b', '#d97706', '#b45309'],
          icon: 'warning',
          iconColor: '#ffffff',
        };
      default:
        return {
          colors: ['#3b82f6', '#2563eb', '#1d4ed8'],
          icon: 'info',
          iconColor: '#ffffff',
        };
    }
  };

  const config = getTypeConfig();

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <StatusBar barStyle="light-content" />
      
      {/* Conteneur de notification */}
      <View style={styles.container}>
        <LinearGradient
          colors={config.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.contentContainer}
        >
          {/* BlurView pour effet glassmorphisme */}
          <BlurView
            style={styles.blurOverlay}
            blurType="light"
            blurAmount={10}
            reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.1)"
          />
          
          {/* Contenu */}
          <View style={styles.content}>
            {/* Icône */}
            <View style={styles.iconContainer}>
              <Icon name={config.icon} size={28} color={config.iconColor} />
            </View>
            
            {/* Message */}
            <Text style={styles.message}>{message}</Text>
          </View>
          
          {/* Effet de brillance */}
          <LinearGradient
            colors={[
              'transparent',
              'rgba(255, 255, 255, 0.1)',
              'transparent',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.shine}
          />
        </LinearGradient>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 999,
    paddingTop: StatusBar.currentHeight || 44, // Pour éviter la status bar
    paddingHorizontal: 16,
  },
  container: {
    alignSelf: 'center',
    maxWidth: Math.min(width - 32, 380),
    width: '100%',
    marginTop: 20,
  },
  contentContainer: {
    borderRadius: 16, // Bords arrondis plus modérés
    overflow: 'hidden', // CRUCIAL pour éviter les pixels crénelés
    // Propriétés anti-aliasing avancées
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
    // Lissage des bords pour Android
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    zIndex: 1,
  },
  iconContainer: {
    marginRight: 12,
  },
  message: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  shine: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
});

export default NotificationToast;