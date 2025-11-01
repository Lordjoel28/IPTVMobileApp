/**
 * 🎨 SimpleModernSearchCard - Carte moderne style backup avec overlay
 * Design IPTV Smarters Pro avec image de fond et overlay semi-transparent
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {useThemeColors} from '../contexts/ThemeContext';
import type {Channel} from '../types';

interface SimpleModernSearchCardProps {
  channel: Channel;
  onPress: () => void;
  index: number;
}

export default function SimpleModernSearchCard({channel, onPress, index}: SimpleModernSearchCardProps) {
  const colors = useThemeColors();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.channelCard,
        {
          backgroundColor: colors.surface.primary,
          borderColor: colors.ui.border,
          transform: [{scale: scaleAnim}],
        },
      ]}>
      <TouchableOpacity
        style={styles.cardTouchable}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
        delayPressIn={0}
        delayPressOut={0}
        hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>

        {/* Logo en arrière-plan comme le style backup */}
        {channel.logoUrl && channel.logoUrl.trim() !== '' ? (
          <Image
            style={styles.channelLogoFull}
            source={{uri: channel.logoUrl}}
            resizeMode="contain"
          />
        ) : (
          <View style={[styles.channelLogoFull, {backgroundColor: colors.surface.secondary}]}>
            <Icon name="tv" size={48} color={colors.text.secondary} />
          </View>
        )}

        {/* Overlay avec texte comme le style backup */}
        <View
          style={[
            styles.channelOverlay,
            {
              backgroundColor: colors.surface.overlay,
            },
          ]}>
          <View style={styles.channelTextContainer}>
            <Text
              style={[
                styles.channelName,
                {color: colors.text.primary},
              ]}
              numberOfLines={2}>
              {channel.name}
            </Text>
            {channel.groupTitle && (
              <Text
                style={[
                  styles.channelGroup,
                  {color: colors.text.secondary},
                ]}
                numberOfLines={1}>
                {channel.groupTitle}
              </Text>
            )}
          </View>
        </View>

        {/* Badge favoris en haut à droite */}
        {channel.isFavorite && (
          <View style={[styles.favoriteBadge, {backgroundColor: colors.accent.primary}]}>
            <Icon name="star" size={12} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Cards Chaînes avec design moderne - STYLE BACKUP
  channelCard: {
    borderRadius: 20,
    height: 140,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    marginHorizontal: 6,
  },
  cardTouchable: {
    flex: 1,
    height: '100%',
  },
  // Logo adapté comme ChannelsScreen - STYLE BACKUP
  channelLogoFull: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Overlay avec gradient harmonieux adaptatif - STYLE BACKUP
  channelOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  channelTextContainer: {
    alignItems: 'center',
  },
  channelName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  channelGroup: {
    fontSize: 10,
    textAlign: 'center',
  },
  favoriteBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
});