/**
 * 🚀 SkeletonChannelCard - Preview cards comme IPTV Smarters Pro
 * Affichage instantané pendant scroll avec shimmer effect
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  Dimensions,
  useColorScheme,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SkeletonChannelCardProps {
  style?: any;
  animate?: boolean;
}

export const SkeletonChannelCard: React.FC<SkeletonChannelCardProps> = ({
  style,
  animate = true,
}) => {
  const isDarkMode = useColorScheme() === 'dark';
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) return;

    // 🚀 SHIMMER ANIMATION - Effet brillant comme IPTV Smarters Pro
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      { iterations: -1 }
    );

    shimmerAnimation.start();

    return () => shimmerAnimation.stop();
  }, [animate, shimmerAnim]);

  // 🎨 GRADIENT SHIMMER EFFECT
  const shimmerTranslateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.8, 0.3],
  });

  return (
    <View style={[
      styles.skeletonCard,
      isDarkMode && styles.skeletonCardDark,
      style
    ]}>
      <View style={styles.skeletonContent}>
        {/* 🖼️ SKELETON LOGO */}
        <View style={[
          styles.skeletonLogo,
          isDarkMode && styles.skeletonLogoDark
        ]}>
          {animate && (
            <Animated.View
              style={[
                styles.shimmerOverlay,
                {
                  opacity: shimmerOpacity,
                  transform: [{ translateX: shimmerTranslateX }],
                },
              ]}
            />
          )}
        </View>

        {/* 📝 SKELETON TEXT */}
        <View style={styles.skeletonInfo}>
          {/* Channel name skeleton */}
          <View style={[
            styles.skeletonTitle,
            isDarkMode && styles.skeletonTitleDark
          ]}>
            {animate && (
              <Animated.View
                style={[
                  styles.shimmerOverlay,
                  {
                    opacity: shimmerOpacity,
                    transform: [{ translateX: shimmerTranslateX }],
                  },
                ]}
              />
            )}
          </View>

          {/* Category skeleton */}
          <View style={[
            styles.skeletonCategory,
            isDarkMode && styles.skeletonCategoryDark
          ]}>
            {animate && (
              <Animated.View
                style={[
                  styles.shimmerOverlay,
                  {
                    opacity: shimmerOpacity,
                    transform: [{ translateX: shimmerTranslateX }],
                  },
                ]}
              />
            )}
          </View>
        </View>

        {/* ⭐ SKELETON FAVORITE BUTTON */}
        <View style={[
          styles.skeletonFavorite,
          isDarkMode && styles.skeletonFavoriteDark
        ]}>
          {animate && (
            <Animated.View
              style={[
                styles.shimmerOverlay,
                {
                  opacity: shimmerOpacity,
                  transform: [{ translateX: shimmerTranslateX }],
                },
              ]}
            />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeletonCard: {
    backgroundColor: '#f0f0f0',
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 10,
    height: 80, // Même hauteur que ITEM_HEIGHT
    overflow: 'hidden',
  },
  skeletonCardDark: {
    backgroundColor: '#2a2a2a',
  },
  skeletonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    height: 70,
  },
  skeletonLogo: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    marginRight: 15,
    overflow: 'hidden',
  },
  skeletonLogoDark: {
    backgroundColor: '#404040',
  },
  skeletonInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  skeletonTitle: {
    height: 18,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 8,
    width: '75%',
    overflow: 'hidden',
  },
  skeletonTitleDark: {
    backgroundColor: '#404040',
  },
  skeletonCategory: {
    height: 12,
    backgroundColor: '#e8e8e8',
    borderRadius: 3,
    width: '50%',
    overflow: 'hidden',
  },
  skeletonCategoryDark: {
    backgroundColor: '#383838',
  },
  skeletonFavorite: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
    overflow: 'hidden',
  },
  skeletonFavoriteDark: {
    backgroundColor: '#404040',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
});

export default SkeletonChannelCard;