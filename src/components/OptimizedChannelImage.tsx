/**
 * 🚀 OptimizedChannelImage - Composant Image Ultra-Optimisé
 * Performance TiviMate/IPTV Smarters level pour 100K+ chaînes
 */

import React, {memo, useMemo} from 'react';
import {View, Text, StyleSheet, ImageStyle, ViewStyle} from 'react-native';
import FastImage, {FastImageProps} from 'react-native-fast-image';
import {useChannelImage} from '../hooks/useOptimizedImage';

interface OptimizedChannelImageProps {
  uri: string | null | undefined;
  channelId: string;
  channelName?: string;
  size?: number;
  priority?: 'low' | 'normal' | 'high';
  style?: ImageStyle;
  showFallback?: boolean;
  borderRadius?: number;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * 🎯 COMPOSANT OPTIMISÉ avec memo pour éviter re-renders
 */
const OptimizedChannelImage: React.FC<OptimizedChannelImageProps> = memo(
  ({
    uri,
    channelId,
    channelName,
    size = 56,
    priority = 'normal',
    style,
    showFallback = true,
    borderRadius = 8,
    onLoad,
    onError,
  }) => {
    // Hook optimisé avec cache intelligent
    const {imageUri, isLoading, error, isCached, retry} = useChannelImage(
      uri,
      channelId,
      priority,
    );

    // Style mémoisé pour performance
    const imageStyle = useMemo<ImageStyle>(
      () => ({
        width: size,
        height: size,
        borderRadius,
        backgroundColor: '#f0f0f0',
        ...style,
      }),
      [size, borderRadius, style],
    );

    const containerStyle = useMemo<ViewStyle>(
      () => ({
        width: size,
        height: size,
        borderRadius,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
      }),
      [size, borderRadius],
    );

    // Props FastImage mémoisés
    const fastImageProps = useMemo<FastImageProps>(
      () => ({
        source: {
          uri: imageUri || '',
          priority:
            priority === 'high'
              ? FastImage.priority.high
              : priority === 'low'
              ? FastImage.priority.low
              : FastImage.priority.normal,
          cache: FastImage.cacheControl.immutable,
        },
        style: imageStyle,
        resizeMode: FastImage.resizeMode.cover,
        fallback: true,
        onLoad: () => {
          onLoad?.();
        },
        onError: () => {
          onError?.();
          // Auto-retry une fois
          if (!error) {
            setTimeout(retry, 1000);
          }
        },
      }),
      [imageUri, priority, imageStyle, onLoad, onError, error, retry],
    );

    // 🚀 RENDER OPTIMISÉ selon état
    if (!uri || (!imageUri && !isLoading && error)) {
      // Fallback avec emoji ou initiale
      return showFallback ? (
        <View style={[containerStyle, styles.fallbackContainer]}>
          {channelName ? (
            <Text style={[styles.fallbackText, {fontSize: size * 0.3}]}>
              {channelName.charAt(0).toUpperCase()}
            </Text>
          ) : (
            <Text style={[styles.fallbackEmoji, {fontSize: size * 0.4}]}>
              📺
            </Text>
          )}
        </View>
      ) : null;
    }

    if (isLoading && !imageUri) {
      // Loading placeholder avec animation subtile
      return (
        <View style={[containerStyle, styles.loadingContainer]}>
          <View
            style={[
              styles.loadingIndicator,
              {
                width: size * 0.3,
                height: size * 0.3,
                borderRadius: size * 0.15,
              },
            ]}
          />
        </View>
      );
    }

    // Image principale avec FastImage
    return (
      <View style={containerStyle}>
        <FastImage {...fastImageProps} />

        {/* Badge cache pour debug */}
        {__DEV__ && isCached && (
          <View style={styles.cacheBadge}>
            <Text style={styles.cacheBadgeText}>C</Text>
          </View>
        )}
      </View>
    );
  },
);

/**
 * 🏆 VERSION GRILLE optimisée spécifiquement pour grilles denses
 */
export const OptimizedGridImage: React.FC<
  OptimizedChannelImageProps & {
    gridSize?: 'small' | 'medium' | 'large';
  }
> = memo(({gridSize = 'medium', ...props}) => {
  const sizeMap = {
    small: 48,
    medium: 60,
    large: 80,
  };

  return (
    <OptimizedChannelImage
      {...props}
      size={sizeMap[gridSize]}
      priority="low" // Grilles utilisent priorité basse par défaut
    />
  );
});

/**
 * 🎯 VERSION LISTE optimisée pour listes verticales
 */
export const OptimizedListImage: React.FC<OptimizedChannelImageProps> = memo(
  props => {
    return (
      <OptimizedChannelImage
        {...props}
        size={56}
        priority="normal" // Listes utilisent priorité normale
      />
    );
  },
);

const styles = StyleSheet.create({
  fallbackContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  fallbackText: {
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  fallbackEmoji: {
    textAlign: 'center',
  },
  loadingContainer: {
    backgroundColor: '#f5f5f5',
  },
  loadingIndicator: {
    backgroundColor: '#ddd',
    opacity: 0.6,
  },
  cacheBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 12,
    height: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.8)',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cacheBadgeText: {
    fontSize: 8,
    color: 'white',
    fontWeight: '600',
  },
});

// Export avec nom pour debugging
OptimizedChannelImage.displayName = 'OptimizedChannelImage';
OptimizedGridImage.displayName = 'OptimizedGridImage';
OptimizedListImage.displayName = 'OptimizedListImage';

export default OptimizedChannelImage;
