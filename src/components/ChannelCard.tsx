/**
 * 📺 ChannelCard - Composant carte chaîne avec animations et feedback visuel
 * Optimisé performance avec driver natif
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  Animated,
  StyleSheet,
  PressableStateCallbackType,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

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
}

const ChannelCard: React.FC<ChannelCardProps> = ({ 
  channel, 
  index, 
  width, 
  onPress, 
  serverUrl = '' 
}) => {
  // 🎬 ÉTAPE 3: Animation fade-in avec driver natif
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
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
    console.log(`📺 ChannelCard ${index}: "${channel.name}" - Logo: "${channel.logo || 'ABSENT'}"`);
  }
  
  // Validation et normalisation du logo
  const logoUrl = channel.logo;
  const hasLogo = logoUrl && logoUrl.trim() !== '' && logoUrl !== 'null' && logoUrl !== 'undefined';
  
  // 🎯 ÉTAPE 2: Feedback visuel avec Pressable - Styles conditionnels
  const getPressableStyle = ({ pressed }: PressableStateCallbackType) => [
    styles.channelCard,
    { width },
    pressed && styles.channelCardPressed, // Style appliqué quand pressé
  ];

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          opacity: fadeAnim, // Animation fade-in
        }
      ]}
    >
      <Pressable
        style={getPressableStyle}
        onPress={() => onPress(channel)}
        // android_ripple supprimé pour éviter débordement
      >
        {/* Logo principal */}
        {hasLogo ? (
          <Image 
            source={{ 
              uri: logoUrl,
              headers: {
                'User-Agent': 'IPTV-Player/1.0',
                'Accept': 'image/*',
                'Cache-Control': 'max-age=86400'
              }
            }} 
            style={styles.channelLogoFullscreen}
            resizeMode="contain"
            fadeDuration={100}
            onError={() => {
              if (index < 5) {
                console.log(`❌ Logo échoué: "${channel.name}" -> ${logoUrl}`);
              }
            }}
            onLoad={() => {
              if (index < 5) {
                console.log(`✅ Logo CHARGÉ: "${channel.name}"`);
              }
            }}
            progressiveRenderingEnabled={true}
          />
        ) : (
          <View style={styles.channelLogoPlaceholderFullscreen}>
            <Text style={styles.channelNameFallback}>📺</Text>
          </View>
        )}

        {/* Superposition avec dégradé sombre pour lisibilité */}
        <LinearGradient
          colors={['transparent', 'rgba(0, 0, 0, 0.3)', 'rgba(0, 0, 0, 0.85)']}
          locations={[0, 0.4, 1]}
          style={styles.channelNameOverlay}
        >
          <Text 
            style={styles.channelCardName} 
            numberOfLines={2} 
            ellipsizeMode="tail"
            adjustsFontSizeToFit={false}
          >
            {channel.name?.replace(/\s*\(\d+p\)$/, '') || 'Sans nom'}
          </Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    // Container pour animation - pas de style visuel
  },
  channelCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    marginBottom: 8, // RÉDUIT : espacement vertical entre rangées
    // margin: 4 SUPPRIMÉ - l'espacement est géré par columnWrapperStyle
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden', // CRITIQUE : Empêche débordement
    height: 140,
    position: 'relative',
    // Ombres subtiles pour effet "flottant"
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  channelCardPressed: {
    // 🎯 FEEDBACK VISUEL: État pressé SANS transform pour éviter débordement
    backgroundColor: '#252525', // Changement de couleur au lieu de scale
    shadowOpacity: 0.25, // Ombre plus prononcée
    elevation: 8,
    borderColor: 'rgba(79, 172, 254, 0.4)', // Bordure colorée plus visible
    borderWidth: 2, // Bordure plus épaisse pour feedback
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
    backgroundColor: '#2a2a2a',
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
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    textAlign: 'center',
    width: '100%',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  channelNameFallback: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 4,
    lineHeight: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});

export default ChannelCard;