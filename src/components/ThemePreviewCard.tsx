/**
 * 🎨 ThemePreviewCard - Carte de prévisualisation de thème
 * Carte interactive pour sélectionner et prévisualiser les thèmes
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Theme} from '../themes/themeConfig';
import {useI18n} from '../hooks/useI18n';

interface ThemePreviewCardProps {
  theme: Theme;
  isSelected: boolean;
  onSelect: (themeId: string) => void;
  onPreview?: (themeId: string) => void;
}

const {width: screenWidth} = Dimensions.get('window');
const cardWidth = (screenWidth - 80) / 3; // 3 colonnes avec marges

const ThemePreviewCard: React.FC<ThemePreviewCardProps> = ({
  theme,
  isSelected,
  onSelect,
  onPreview,
}) => {
  const {t: tThemes} = useI18n('themes');

  const handlePress = () => {
    onSelect(theme.id);
  };

  const handleLongPress = () => {
    if (onPreview) {
      onPreview(theme.id);
    }
  };

  const getThemeIcon = (themeId: string) => {
    switch (themeId) {
      case 'dark':
        return 'dark-mode';
      case 'light':
        return 'light-mode';
      case 'ocean-comfort':
        return 'waves';
      case 'sunset':
        return 'wb-sunny';
      case 'green':
        return 'nature';
      default:
        return 'palette';
    }
  };

  // Fonction pour obtenir le nom traduit du thème
  const getTranslatedName = (themeId: string): string => {
    const themeNameMap: Record<string, string> = {
      'dark': tThemes('themeDark'),
      'light': tThemes('themeLight'),
      'gray': tThemes('themeGray'),
      'brown': tThemes('themeBrown'),
      'green': tThemes('themeGreen'),
      'purple': tThemes('themePurple'),
      'sunset': tThemes('themeSunset'),
      'ocean-comfort': tThemes('themeOceanComfort'),
      'warm-amber': tThemes('themeWarmAmber'),
      'tivimate-pro': tThemes('themeTivimatePro'),
    };
    return themeNameMap[themeId] || theme.name;
  };

  // Fonction pour obtenir la description traduite du thème
  const getTranslatedDescription = (themeId: string): string => {
    const themeDescMap: Record<string, string> = {
      'dark': tThemes('themeDarkDesc'),
      'light': tThemes('themeLightDesc'),
      'gray': tThemes('themeGrayDesc'),
      'brown': tThemes('themeBrownDesc'),
      'green': tThemes('themeGreenDesc'),
      'purple': tThemes('themePurpleDesc'),
      'sunset': tThemes('themeSunsetDesc'),
      'ocean-comfort': tThemes('themeOceanComfortDesc'),
      'warm-amber': tThemes('themeWarmAmberDesc'),
      'tivimate-pro': tThemes('themeTivimateProDesc'),
    };
    return themeDescMap[themeId] || theme.description;
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {width: cardWidth},
        isSelected && styles.selectedCard,
      ]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.8}>
      {/* Gradient de prévisualisation du thème */}
      <LinearGradient
        colors={theme.colors.background.gradient}
        style={styles.gradientPreview}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
      />

      {/* Couleur d'accent en coin */}
      <View
        style={[
          styles.accentDot,
          {backgroundColor: theme.colors.accent.primary},
        ]}
      />

      {/* Contenu de la carte */}
      <View style={styles.cardContent}>
        <View style={styles.iconContainer}>
          <Icon
            name={getThemeIcon(theme.id)}
            size={28}
            color={theme.colors.text.primary}
          />
        </View>

        <Text style={[styles.themeName, {color: theme.colors.text.primary}]}>
          {getTranslatedName(theme.id)}
        </Text>

        <Text
          style={[
            styles.themeDescription,
            {color: theme.colors.text.secondary},
          ]}
          numberOfLines={2}>
          {getTranslatedDescription(theme.id)}
        </Text>
      </View>

      {/* Badge "Actuel" pour le thème sélectionné */}
      {isSelected && (
        <View style={styles.selectedBadge}>
          <Icon name="check-circle" size={20} color="#4CAF50" />
          <Text style={styles.selectedText}>{tThemes('current')}</Text>
        </View>
      )}

  
      {/* Bordure de sélection */}
      {isSelected && (
        <View
          style={[
            styles.selectionBorder,
            {borderColor: theme.colors.accent.primary},
          ]}
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    position: 'relative',
  },

  selectedCard: {
    transform: [{scale: 1.02}],
  },

  gradientPreview: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  accentDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },

  cardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },

  iconContainer: {
    marginBottom: 8,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  themeName: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },

  themeDescription: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },

  selectedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },

  selectedText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 2,
  },

  
  selectionBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 3,
    borderRadius: 16,
  },
});

export default ThemePreviewCard;
