/**
 * =ú IPTV Mobile App - Composant Carte Chaîne
 * Carte d'affichage pour une chaîne TV
 */

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  ViewStyle,
} from 'react-native';
import {
  Text,
  Surface,
  Chip,
  useTheme,
  IconButton,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';

import type { Channel, ChannelCardProps } from '../types';

interface Props extends ChannelCardProps {
  style?: ViewStyle;
}

const ChannelCard: React.FC<Props> = ({
  channel,
  onPress,
  onFavoritePress,
  isFavorite = false,
  showCategory = true,
  showQuality = true,
  style,
}) => {
  const theme = useTheme();

  const handlePress = () => {
    onPress(channel);
  };

  const handleFavoritePress = () => {
    onFavoritePress?.(channel);
  };

  const getQualityColor = (quality?: string) => {
    switch (quality?.toLowerCase()) {
      case '4k':
      case 'uhd':
        return theme.colors.tertiary;
      case 'fhd':
      case '1080p':
        return theme.colors.primary;
      case 'hd':
      case '720p':
        return theme.colors.secondary;
      case 'sd':
      case '480p':
        return theme.colors.outline;
      default:
        return theme.colors.onSurfaceVariant;
    }
  };

  return (
    <Surface style={[styles.container, style]} elevation={2}>
      <TouchableOpacity onPress={handlePress} style={styles.touchable}>
        {/* Logo de la chaîne */}
        <View style={styles.logoContainer}>
          {channel.logo ? (
            <Image
              source={{ uri: channel.logo }}
              style={styles.logo}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.logoPlaceholder, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Icon
                name="tv"
                size={24}
                color={theme.colors.onSurfaceVariant}
              />
            </View>
          )}
          
          {/* Bouton favoris */}
          {onFavoritePress && (
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={handleFavoritePress}
            >
              <Icon
                name={isFavorite ? 'favorite' : 'favorite-border'}
                size={16}
                color={isFavorite ? theme.colors.error : theme.colors.onSurfaceVariant}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Informations de la chaîne */}
        <View style={styles.info}>
          <Text
            variant="bodyMedium"
            style={[styles.name, { color: theme.colors.onSurface }]}
            numberOfLines={2}
          >
            {channel.name}
          </Text>

          {/* Catégorie */}
          {showCategory && channel.category && (
            <Text
              variant="bodySmall"
              style={[styles.category, { color: theme.colors.onSurfaceVariant }]}
              numberOfLines={1}
            >
              {channel.category}
            </Text>
          )}

          {/* Badges qualité et statut */}
          <View style={styles.badges}>
            {showQuality && channel.quality && (
              <Chip
                compact
                style={[styles.qualityChip, { backgroundColor: getQualityColor(channel.quality) }]}
                textStyle={[styles.chipText, { color: theme.colors.onPrimary }]}
              >
                {channel.quality}
              </Chip>
            )}
            
            {channel.language && (
              <Chip
                compact
                style={[styles.languageChip, { backgroundColor: theme.colors.surfaceVariant }]}
                textStyle={[styles.chipText, { color: theme.colors.onSurfaceVariant }]}
              >
                {channel.language.toUpperCase()}
              </Chip>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    margin: 4,
  },
  touchable: {
    padding: 12,
  },
  logoContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 8,
  },
  logo: {
    width: 60,
    height: 40,
    borderRadius: 6,
  },
  logoPlaceholder: {
    width: 60,
    height: 40,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 2,
  },
  info: {
    alignItems: 'center',
  },
  name: {
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
    minHeight: 32,
  },
  category: {
    textAlign: 'center',
    marginBottom: 6,
  },
  badges: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  qualityChip: {
    height: 20,
    marginVertical: 0,
  },
  languageChip: {
    height: 20,
    marginVertical: 0,
  },
  chipText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginVertical: 0,
    marginHorizontal: 6,
  },
});

export default ChannelCard;