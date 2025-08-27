/**
 * 🚀 FastScrollIndicator - Prévisualisation scroll comme IPTV Smarters Pro
 * Affiche aperçu chaîne pendant scroll rapide pour navigation ultra-fluide
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  useColorScheme,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { Channel } from '../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const INDICATOR_WIDTH = 60; // 🚀 Plus fin mais plus visible  
const PREVIEW_CARD_WIDTH = 220; // 🚀 Plus large pour meilleure lisibilité
const PREVIEW_CARD_HEIGHT = 100; // 🚀 Plus compact mais lisible

interface FastScrollIndicatorProps {
  channels: Channel[];
  onScrollToIndex: (index: number) => void;
  visible: boolean;
  currentIndex: number;
}

export const FastScrollIndicator: React.FC<FastScrollIndicatorProps> = ({
  channels,
  onScrollToIndex,
  visible,
  currentIndex,
}) => {
  const isDarkMode = useColorScheme() === 'dark';
  const [isScrolling, setIsScrolling] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const animatedOpacity = useRef(new Animated.Value(0)).current;
  const animatedPosition = useRef(new Animated.Value(0)).current;
  const panResponder = useRef<any>();

  // 🎯 Current channel for preview
  const currentChannel = channels[previewIndex];

  useEffect(() => {
    // 🚀 Pan Responder ULTRA-RÉACTIF - Comme IPTV Smarters Pro
    panResponder.current = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false, // 🚀 Garde le contrôle

      onPanResponderGrant: (evt) => {
        setIsScrolling(true);
        // 🚀 Apparition INSTANTANÉE de la preview card
        Animated.timing(animatedOpacity, {
          toValue: 1,
          duration: 100, // Plus rapide
          useNativeDriver: true,
        }).start();
        
        // 🚀 Position initiale basée sur le touch
        const initialY = evt.nativeEvent.pageY;
        animatedPosition.setValue(initialY);
      },

      onPanResponderMove: (evt, gestureState) => {
        const touchY = evt.nativeEvent.pageY;
        const scrollableTop = 120; // Top margin
        const scrollableBottom = SCREEN_HEIGHT - 120; // Bottom margin
        const scrollableHeight = scrollableBottom - scrollableTop;
        
        // 🚀 Position relative plus précise
        const clampedY = Math.max(scrollableTop, Math.min(scrollableBottom, touchY));
        const relativePosition = (clampedY - scrollableTop) / scrollableHeight;
        
        // 🚀 Index plus précis avec protection bounds
        const newIndex = Math.max(0, Math.min(
          channels.length - 1, 
          Math.floor(relativePosition * channels.length)
        ));
        
        if (newIndex !== previewIndex) {
          setPreviewIndex(newIndex);
        }
        
        // 🚀 Position animée plus fluide
        animatedPosition.setValue(clampedY - scrollableTop);
      },

      onPanResponderRelease: () => {
        setIsScrolling(false);
        // 🚀 Scroll INSTANTANÉ vers l'index sélectionné
        onScrollToIndex(previewIndex);
        
        // 🚀 Disparition avec délai pour voir la sélection
        setTimeout(() => {
          Animated.timing(animatedOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }, 200);
      },
    });
  }, [channels.length, previewIndex, onScrollToIndex, animatedOpacity, animatedPosition]);

  useEffect(() => {
    // Show/hide indicator based on visibility
    Animated.timing(animatedOpacity, {
      toValue: visible && !isScrolling ? 0.7 : isScrolling ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, isScrolling, animatedOpacity]);

  if (!visible && !isScrolling) return null;

  return (
    <View style={styles.container}>
      {/* 🚀 SCROLL INDICATOR BAR */}
      <Animated.View
        style={[
          styles.scrollIndicator,
          isDarkMode && styles.scrollIndicatorDark,
          { opacity: animatedOpacity }
        ]}
        {...panResponder.current?.panHandlers}
      >
        {/* Current position marker */}
        <View style={[
          styles.positionMarker,
          {
            top: (currentIndex / Math.max(1, channels.length - 1)) * (SCREEN_HEIGHT - 200) - 10
          }
        ]} />

        {/* Channel count display */}
        <View style={styles.channelCounter}>
          <Text style={[styles.counterText, isDarkMode && styles.counterTextDark]}>
            {previewIndex + 1}/{channels.length}
          </Text>
        </View>
      </Animated.View>

      {/* 🚀 PREVIEW CARD - Comme IPTV Smarters Pro */}
      {isScrolling && currentChannel && (
        <Animated.View
          style={[
            styles.previewCard,
            isDarkMode && styles.previewCardDark,
            {
              opacity: animatedOpacity,
              transform: [{
                translateY: animatedPosition.interpolate({
                  inputRange: [0, SCREEN_HEIGHT],
                  outputRange: [-PREVIEW_CARD_HEIGHT / 2, SCREEN_HEIGHT - PREVIEW_CARD_HEIGHT / 2],
                  extrapolate: 'clamp'
                })
              }]
            }
          ]}
        >
          {/* Channel logo */}
          <View style={styles.previewImageContainer}>
            {currentChannel.logo ? (
              <FastImage
                source={{ 
                  uri: currentChannel.logo,
                  priority: FastImage.priority.high 
                }}
                style={styles.previewImage}
                resizeMode={FastImage.resizeMode.cover}
              />
            ) : (
              <View style={styles.previewPlaceholder}>
                <Text style={styles.previewPlaceholderText}>📺</Text>
              </View>
            )}
          </View>

          {/* Channel info */}
          <View style={styles.previewInfo}>
            <Text 
              style={[styles.previewTitle, isDarkMode && styles.previewTitleDark]}
              numberOfLines={2}
            >
              {currentChannel.name}
            </Text>
            {currentChannel.category && (
              <Text style={[styles.previewCategory, isDarkMode && styles.previewCategoryDark]}>
                {currentChannel.category}
              </Text>
            )}
            <Text style={[styles.previewIndex, isDarkMode && styles.previewIndexDark]}>
              #{previewIndex + 1}
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: SCREEN_WIDTH,
    pointerEvents: 'box-none',
  },
  scrollIndicator: {
    position: 'absolute',
    right: 8, // 🚀 Plus proche du bord pour faciliter l'accès
    top: 120,
    bottom: 120,
    width: INDICATOR_WIDTH,
    backgroundColor: 'rgba(255, 255, 255, 0.95)', // 🚀 Plus opaque
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4, // 🚀 Ombre plus marquée
    shadowRadius: 6,
    elevation: 8, // 🚀 Plus d'élévation sur Android
    borderWidth: 1, // 🚀 Bordure subtile pour définition
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  scrollIndicatorDark: {
    backgroundColor: 'rgba(45, 45, 45, 0.95)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  positionMarker: {
    position: 'absolute',
    right: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  channelCounter: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  counterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  counterTextDark: {
    color: '#fff',
  },
  previewCard: {
    position: 'absolute',
    left: SCREEN_WIDTH - PREVIEW_CARD_WIDTH - 80, // 🚀 Plus proche de l'indicateur
    width: PREVIEW_CARD_WIDTH,
    height: PREVIEW_CARD_HEIGHT,
    backgroundColor: 'rgba(255, 255, 255, 0.98)', // 🚀 Quasi-opaque pour lisibilité
    borderRadius: 15, // 🚀 Plus arrondi comme Smarters Pro
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, // 🚀 Ombre plus forte
    shadowRadius: 12,
    elevation: 12, // 🚀 Très visible sur Android
    overflow: 'hidden',
    borderWidth: 1, // 🚀 Bordure pour définition
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  previewCardDark: {
    backgroundColor: 'rgba(35, 35, 35, 0.98)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  previewImageContainer: {
    height: 70,
    backgroundColor: '#f0f0f0',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
  },
  previewPlaceholderText: {
    fontSize: 24,
  },
  previewInfo: {
    flex: 1,
    padding: 8,
    justifyContent: 'space-between',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  previewTitleDark: {
    color: '#fff',
  },
  previewCategory: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  previewCategoryDark: {
    color: '#999',
  },
  previewIndex: {
    fontSize: 10,
    color: '#999',
    fontWeight: '500',
  },
  previewIndexDark: {
    color: '#666',
  },
});

export default FastScrollIndicator;