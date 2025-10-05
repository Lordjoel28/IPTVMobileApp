/**
 * 📺 ChannelCard - Composant carte chaîne avec animations et feedback visuel
 * Optimisé performance avec driver natif
 */

import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  PressableStateCallbackType,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';
import { useThemeColors } from '../contexts/ThemeContext';

interface Channel {
  id: string;
  name: string;
  logo?: string;
  group: string;
  url: string;
  type: 'M3U' | 'XTREAM';
}

interface ChannelCardProps {
  channel: Channel;
  index: number;
  width: number;
  onPress: (channel: Channel) => void;
  serverUrl?: string;
  hideChannelNames?: boolean;
}

const ChannelCard: React.FC<ChannelCardProps> = ({
  channel,
  index,
  width,
  onPress,
  serverUrl = '',
  hideChannelNames = false,
}) => {
  const colors = useThemeColors();
  const styles = createStyles(colors, width);
  // 🎬 ÉTAPE 3: Animations avec driver natif
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Animation d'apparition au montage du composant
  useEffect(() => {
    // Délai staggered basé sur l'index pour effet cascade
    const delay = Math.min(index * 50, 300); // 50ms de délai, max 300ms

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400, // Animation fluide
        useNativeDriver: true, // 🚀 OBLIGATOIRE: Driver natif pour performance
        isInteraction: false, // N'interrompt pas autres interactions
      }).start();
    }, delay);

    return () => clearTimeout(timer); // Cleanup du timer
  }, [fadeAnim, index]);

  // Debug logs pour premières cartes seulement
  if (index < 3) {
    console.log(
      `📺 ChannelCard ${index}: "${channel.name}" - Logo: "${
        channel.logo || 'ABSENT'
      }"`,
    );
  }

  // Validation et normalisation du logo
  const logoUrl = channel.logo;
  const hasLogo =
    logoUrl &&
    logoUrl.trim() !== '' &&
    logoUrl !== 'null' &&
    logoUrl !== 'undefined';

  // 🎯 ÉTAPE 2: Feedback visuel avec Pressable - Styles conditionnels + animations
  const getPressableStyle = ({pressed}: PressableStateCallbackType) => [
    styles.channelCard,
    {width},
    pressed && styles.channelCardPressed, // Style appliqué quand pressé
  ];

  // 🎬 Animation scale au press
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      tension: 150,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 150,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          opacity: fadeAnim, // Animation fade-in
          transform: [{scale: scaleAnim}], // Animation scale
        },
      ]}>
      <Pressable
        style={getPressableStyle}
        onPress={() => onPress(channel)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        // android_ripple supprimé pour éviter débordement
      >
        {/* Logo principal avec FastImage optimisé */}
        {hasLogo ? (
          <FastImage
            source={{
              uri: logoUrl,
              priority: FastImage.priority.high, // ✅ Priorité haute pour chargement instantané
              cache: FastImage.cacheControl.immutable, // ✅ Cache permanent
              headers: {
                'User-Agent': 'IPTV-Player/1.0',
                Accept: 'image/*',
              },
            }}
            style={styles.channelLogoFullscreen}
            resizeMode={FastImage.resizeMode.contain}
            // Suppression des logs pour améliorer les performances
          />
        ) : (
          <View style={styles.channelLogoPlaceholderFullscreen}>
            <Text style={styles.channelNameFallback}>📺</Text>
          </View>
        )}

        {/* Superposition avec dégradé sombre pour lisibilité - conditionnel */}
        {!hideChannelNames && (
          <LinearGradient
            colors={[
              'transparent',
              'rgba(0, 0, 0, 0.3)',
              'rgba(0, 0, 0, 0.85)',
            ]}
            locations={[0, 0.4, 1]}
            style={styles.channelNameOverlay}>
            <Text
              style={styles.channelCardName}
              numberOfLines={2}
              ellipsizeMode="tail"
              adjustsFontSizeToFit={false}>
              {channel.name?.replace(/\s*\(\d+p\)$/, '') || 'Sans nom'}
            </Text>
          </LinearGradient>
        )}
      </Pressable>
    </Animated.View>
  );
};

const createStyles = (colors: any, width: number) => StyleSheet.create({
  cardContainer: {
    // Container pour animation - pas de style visuel
  },
  channelCard: {
    backgroundColor: colors.surface.primary,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.ui.border,
    overflow: 'hidden',
    height: 140,
    position: 'relative',
    // Conservation des ombres avec couleur thématique
    shadowColor: colors.ui.shadow,
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  channelCardPressed: {
    // Conservation des effets visuels avec couleurs thématiques
    backgroundColor: colors.surface.elevated,
    shadowOpacity: 0.35,
    elevation: 12,
    shadowOffset: {width: 0, height: 8},
    shadowRadius: 20,
    borderColor: colors.accent.primary + '99', // Transparence 60%
    borderWidth: 2,
  },
  channelLogoFullscreen: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 50,
    width: undefined,
    height: undefined,
    resizeMode: 'contain',
    borderRadius: 12,
    opacity: 0.8,
  },
  channelLogoPlaceholderFullscreen: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 50,
    backgroundColor: colors.surface.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  channelNameOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelCardName: {
    color: colors.text.primary,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    textAlign: 'center',
    width: '100%',
    textShadowColor: colors.ui.shadow,
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 4,
  },
  channelNameFallback: {
    color: colors.text.secondary,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 4,
    lineHeight: 12,
    textShadowColor: colors.ui.shadow,
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2,
  },
});

export default ChannelCard;
