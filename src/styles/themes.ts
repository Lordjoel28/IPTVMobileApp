/**
 * 🎨 IPTV Mobile App - Thèmes Modernes
 * Thèmes sombres React Native Paper pour application IPTV
 */

import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';
import type { CustomTheme, ThemeType } from '../types';

// Couleurs de base modernes pour IPTV
const IPTVColors = {
  // Primaires
  primary: '#1E88E5',      // Bleu moderne
  primaryDark: '#1565C0',  // Bleu foncé
  primaryLight: '#42A5F5', // Bleu clair
  
  // Secondaires
  secondary: '#26A69A',    // Teal
  secondaryDark: '#00695C', // Teal foncé
  secondaryLight: '#4DB6AC', // Teal clair
  
  // Tertiaires
  tertiary: '#FF7043',     // Orange
  tertiaryDark: '#D84315', // Orange foncé
  tertiaryLight: '#FF8A65', // Orange clair
  
  // Surfaces sombres
  surface: '#1A1A1A',      // Surface principale
  surfaceVariant: '#2A2A2A', // Surface variante
  surfaceContainer: '#121212', // Conteneur surface
  
  // Backgrounds sombres
  background: '#121212',    // Background principal
  backgroundSecondary: '#1A1A1A', // Background secondaire
  
  // Erreurs
  error: '#F44336',        // Rouge erreur
  errorContainer: '#FFCDD2', // Conteneur erreur
  
  // Succès
  success: '#4CAF50',      // Vert succès
  successContainer: '#C8E6C9', // Conteneur succès
  
  // Warning
  warning: '#FF9800',      // Orange warning
  warningContainer: '#FFE0B2', // Conteneur warning
  
  // Textes
  onPrimary: '#FFFFFF',    // Texte sur primaire
  onSecondary: '#FFFFFF',  // Texte sur secondaire
  onTertiary: '#FFFFFF',   // Texte sur tertiaire
  onSurface: '#E0E0E0',    // Texte sur surface
  onSurfaceVariant: '#B0B0B0', // Texte sur surface variante
  onBackground: '#E0E0E0', // Texte sur background
  onError: '#FFFFFF',      // Texte sur erreur
  
  // Outlines
  outline: '#404040',      // Contour
  outlineVariant: '#303030', // Contour variante
  
  // Inverses
  inverseSurface: '#E0E0E0', // Surface inverse
  inverseOnSurface: '#1A1A1A', // Texte surface inverse
  inversePrimary: '#1E88E5', // Primaire inverse
  
  // Shadows
  shadow: '#000000',       // Ombre
  scrim: '#000000',        // Scrim
  backdrop: 'rgba(0, 0, 0, 0.6)', // Backdrop
};

// Thème sombre principal IPTV
export const IPTVDarkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: IPTVColors.primary,
    onPrimary: IPTVColors.onPrimary,
    primaryContainer: IPTVColors.primaryDark,
    onPrimaryContainer: IPTVColors.onPrimary,
    
    secondary: IPTVColors.secondary,
    onSecondary: IPTVColors.onSecondary,
    secondaryContainer: IPTVColors.secondaryDark,
    onSecondaryContainer: IPTVColors.onSecondary,
    
    tertiary: IPTVColors.tertiary,
    onTertiary: IPTVColors.onTertiary,
    tertiaryContainer: IPTVColors.tertiaryDark,
    onTertiaryContainer: IPTVColors.onTertiary,
    
    surface: IPTVColors.surface,
    onSurface: IPTVColors.onSurface,
    surfaceVariant: IPTVColors.surfaceVariant,
    onSurfaceVariant: IPTVColors.onSurfaceVariant,
    
    background: IPTVColors.background,
    onBackground: IPTVColors.onBackground,
    
    error: IPTVColors.error,
    onError: IPTVColors.onError,
    errorContainer: IPTVColors.errorContainer,
    onErrorContainer: IPTVColors.onError,
    
    outline: IPTVColors.outline,
    outlineVariant: IPTVColors.outlineVariant,
    
    inverseSurface: IPTVColors.inverseSurface,
    inverseOnSurface: IPTVColors.inverseOnSurface,
    inversePrimary: IPTVColors.inversePrimary,
    
    shadow: IPTVColors.shadow,
    scrim: IPTVColors.scrim,
    backdrop: IPTVColors.backdrop,
  },
};

// Thème clair IPTV
export const IPTVLightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: IPTVColors.primary,
    onPrimary: '#FFFFFF',
    primaryContainer: IPTVColors.primaryLight,
    onPrimaryContainer: '#000000',
    
    secondary: IPTVColors.secondary,
    onSecondary: '#FFFFFF',
    secondaryContainer: IPTVColors.secondaryLight,
    onSecondaryContainer: '#000000',
    
    tertiary: IPTVColors.tertiary,
    onTertiary: '#FFFFFF',
    tertiaryContainer: IPTVColors.tertiaryLight,
    onTertiaryContainer: '#000000',
  },
};

// Thèmes colorés pour personnalisation
export const IPTVThemes: Record<ThemeType, MD3Theme> = {
  dark: IPTVDarkTheme,
  light: IPTVLightTheme,
  auto: IPTVDarkTheme, // Sera changé dynamiquement
  
  // Thèmes colorés sombres
  blue: {
    ...IPTVDarkTheme,
    colors: {
      ...IPTVDarkTheme.colors,
      primary: '#2196F3',
      primaryContainer: '#1976D2',
      secondary: '#03DAC6',
      secondaryContainer: '#018786',
    },
  },
  
  green: {
    ...IPTVDarkTheme,
    colors: {
      ...IPTVDarkTheme.colors,
      primary: '#4CAF50',
      primaryContainer: '#388E3C',
      secondary: '#81C784',
      secondaryContainer: '#66BB6A',
    },
  },
  
  purple: {
    ...IPTVDarkTheme,
    colors: {
      ...IPTVDarkTheme.colors,
      primary: '#9C27B0',
      primaryContainer: '#7B1FA2',
      secondary: '#E1BEE7',
      secondaryContainer: '#BA68C8',
    },
  },
  
  orange: {
    ...IPTVDarkTheme,
    colors: {
      ...IPTVDarkTheme.colors,
      primary: '#FF9800',
      primaryContainer: '#F57C00',
      secondary: '#FFCC02',
      secondaryContainer: '#FFB300',
    },
  },
  
  red: {
    ...IPTVDarkTheme,
    colors: {
      ...IPTVDarkTheme.colors,
      primary: '#F44336',
      primaryContainer: '#D32F2F',
      secondary: '#FF5722',
      secondaryContainer: '#E64A19',
    },
  },
  
  pink: {
    ...IPTVDarkTheme,
    colors: {
      ...IPTVDarkTheme.colors,
      primary: '#E91E63',
      primaryContainer: '#C2185B',
      secondary: '#F48FB1',
      secondaryContainer: '#EC407A',
    },
  },
};

// Couleurs custom pour composants IPTV
export const IPTVCustomColors = {
  // Channel states
  channelOnline: '#4CAF50',
  channelOffline: '#F44336',
  channelUnknown: '#9E9E9E',
  
  // Quality indicators
  qualityHD: '#FF9800',
  qualityFHD: '#2196F3',
  quality4K: '#9C27B0',
  qualitySD: '#607D8B',
  
  // Player states
  playerPlaying: '#4CAF50',
  playerPaused: '#FF9800',
  playerBuffering: '#2196F3',
  playerError: '#F44336',
  
  // Categories
  categoryMovies: '#E91E63',
  categorySports: '#4CAF50',
  categoryNews: '#2196F3',
  categoryKids: '#FF9800',
  categoryMusic: '#9C27B0',
  categoryDocumentary: '#607D8B',
  categoryAdult: '#F44336',
  
  // User types
  userAdmin: '#FF5722',
  userStandard: '#2196F3',
  userChild: '#4CAF50',
  
  // Network quality
  networkExcellent: '#4CAF50',
  networkGood: '#8BC34A',
  networkPoor: '#FF9800',
  networkNone: '#F44336',
};

// Gradients pour interfaces modernes
export const IPTVGradients = {
  primary: ['#1E88E5', '#1565C0'],
  secondary: ['#26A69A', '#00695C'],
  background: ['#121212', '#1A1A1A'],
  surface: ['#1A1A1A', '#2A2A2A'],
  player: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.8)'],
  overlay: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)'],
};

// Styles communs pour l'application
export const IPTVStyles = {
  // Shadows
  cardShadow: {
    shadowColor: IPTVColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  
  playerShadow: {
    shadowColor: IPTVColors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  
  // Border radius
  borderRadius: {
    small: 4,
    medium: 8,
    large: 12,
    xlarge: 16,
    round: 50,
  },
  
  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  // Typography
  typography: {
    h1: { fontSize: 32, fontWeight: 'bold' as const },
    h2: { fontSize: 28, fontWeight: 'bold' as const },
    h3: { fontSize: 24, fontWeight: '600' as const },
    h4: { fontSize: 20, fontWeight: '600' as const },
    h5: { fontSize: 18, fontWeight: '500' as const },
    h6: { fontSize: 16, fontWeight: '500' as const },
    body1: { fontSize: 16, fontWeight: 'normal' as const },
    body2: { fontSize: 14, fontWeight: 'normal' as const },
    caption: { fontSize: 12, fontWeight: 'normal' as const },
    overline: { fontSize: 10, fontWeight: '500' as const },
  },
  
  // Opacity
  opacity: {
    disabled: 0.38,
    divider: 0.12,
    overlay: 0.6,
    backdrop: 0.8,
  },
};

// Fonction pour obtenir le thème selon le type
export const getTheme = (themeType: ThemeType, isDarkMode: boolean = true): MD3Theme => {
  if (themeType === 'auto') {
    return isDarkMode ? IPTVDarkTheme : IPTVLightTheme;
  }
  return IPTVThemes[themeType] || IPTVDarkTheme;
};

// Fonction pour obtenir les couleurs custom selon le thème
export const getCustomColors = (themeType: ThemeType) => {
  const baseColors = IPTVCustomColors;
  
  // Ajuster les couleurs selon le thème
  switch (themeType) {
    case 'blue':
      return {
        ...baseColors,
        channelOnline: '#2196F3',
        qualityHD: '#1976D2',
      };
    case 'green':
      return {
        ...baseColors,
        channelOnline: '#66BB6A',
        qualityHD: '#4CAF50',
      };
    case 'purple':
      return {
        ...baseColors,
        channelOnline: '#BA68C8',
        qualityHD: '#9C27B0',
      };
    default:
      return baseColors;
  }
};

// Export des constantes utiles
export const THEME_STORAGE_KEY = 'iptv_theme_preference';
export const DEFAULT_THEME: ThemeType = 'dark';

// Helper types
export type IPTVTheme = MD3Theme & {
  customColors: typeof IPTVCustomColors;
  gradients: typeof IPTVGradients;
  styles: typeof IPTVStyles;
};

// Thème complet IPTV avec extensions
export const createIPTVTheme = (themeType: ThemeType, isDarkMode: boolean = true): IPTVTheme => {
  const baseTheme = getTheme(themeType, isDarkMode);
  const customColors = getCustomColors(themeType);
  
  return {
    ...baseTheme,
    customColors,
    gradients: IPTVGradients,
    styles: IPTVStyles,
  };
};