/**
 * 🎨 Configuration des thèmes IPTV
 * Système de thèmes complet avec couleurs, typographie et espacements
 */

export interface ThemeColors {
  // Couleurs de fond principales
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
    gradient: string[];
  };

  // Couleurs de surface (cartes, modales, etc.)
  surface: {
    primary: string;
    secondary: string;
    elevated: string;
    overlay: string;
  };

  // Couleurs de texte
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    placeholder: string;
    inverse: string;
  };

  // Couleurs d'interface
  ui: {
    border: string;
    divider: string;
    shadow: string;
    ripple: string;
  };

  // Couleurs d'accent et d'état
  accent: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };

  // Couleurs de navigation
  navigation: {
    background: string;
    activeTab: string;
    inactiveTab: string;
    indicator: string;
  };

  // Couleurs du lecteur vidéo
  player: {
    background: string;
    controls: string;
    overlay: string;
    progress: string;
    buffer: string;
  };
}

export interface ThemeTypography {
  fonts: {
    regular: string;
    medium: string;
    bold: string;
    light: string;
  };

  sizes: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };

  lineHeights: {
    tight: number;
    normal: number;
    relaxed: number;
  };
}

export interface ThemeSpacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

export interface ThemeBorderRadius {
  none: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  full: number;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  borderRadius: ThemeBorderRadius;
  isDark: boolean;
}

// 🌙 Thème Sombre (Défaut)
export const darkTheme: Theme = {
  id: 'dark',
  name: 'Sombre',
  description: 'Thème sombre élégant',
  isDark: true,

  colors: {
    background: {
      primary: '#0f0f0f',
      secondary: '#181825',
      tertiary: '#1e1e2e',
      gradient: ['#1e1e2e', '#181825', '#11111b'],
    },

    surface: {
      primary: 'rgba(255,255,255,0.12)',
      secondary: 'rgba(255,255,255,0.08)',
      elevated: 'rgba(255,255,255,0.16)',
      overlay: 'rgba(30, 30, 46, 0.95)',
    },

    text: {
      primary: '#ffffff',
      secondary: '#cccccc',
      tertiary: '#888888',
      placeholder: '#666666',
      inverse: '#000000',
    },

    ui: {
      border: 'rgba(255,255,255,0.25)',
      divider: 'rgba(255,255,255,0.15)',
      shadow: 'rgba(0,0,0,0.5)',
      ripple: 'rgba(255,255,255,0.1)',
    },

    accent: {
      primary: '#4A90E2',
      secondary: '#7B68EE',
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#F44336',
      info: '#2196F3',
    },

    navigation: {
      background: 'rgba(24, 24, 37, 0.95)',
      activeTab: '#4A90E2',
      inactiveTab: '#888888',
      indicator: '#4A90E2',
    },

    player: {
      background: 'rgba(0,0,0,0.9)',
      controls: 'rgba(255,255,255,0.9)',
      overlay: 'rgba(0,0,0,0.6)',
      progress: '#4A90E2',
      buffer: 'rgba(255,255,255,0.3)',
    },
  },

  typography: {
    fonts: {
      regular: 'System',
      medium: 'System',
      bold: 'System',
      light: 'System',
    },

    sizes: {
      xs: 10,
      sm: 12,
      md: 14,
      lg: 16,
      xl: 18,
      xxl: 24,
    },

    lineHeights: {
      tight: 1.2,
      normal: 1.4,
      relaxed: 1.6,
    },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  borderRadius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 20,
    full: 9999,
  },
};

// ☀️ Thème Clair (Optimisé Best Practices 2024)
export const lightTheme: Theme = {
  id: 'light',
  name: 'Clair',
  description: 'Thème clair moderne anti-fatigue',
  isDark: false,

  colors: {
    background: {
      primary: '#F9F9F9', // Off-white au lieu de blanc pur
      secondary: '#F5F5F5', // Gris très clair
      tertiary: '#EEEEEE', // Gris clair doux
      gradient: ['#F9F9F9', '#F5F5F5', '#EEEEEE'],
    },

    surface: {
      primary: 'rgba(0,0,0,0.06)', // Réduit pour moins de contraste
      secondary: 'rgba(0,0,0,0.03)',
      elevated: 'rgba(0,0,0,0.09)',
      overlay: 'rgba(249, 249, 249, 0.95)', // Off-white avec transparence
    },

    text: {
      primary: '#1F2937', // Gris très foncé au lieu de noir pur
      secondary: '#4B5563', // Gris moyen optimisé lisibilité
      tertiary: '#6B7280', // Gris clair pour texte tertiaire
      placeholder: '#9CA3AF', // Gris pour placeholders
      inverse: '#ffffff',
    },

    ui: {
      border: 'rgba(0,0,0,0.15)', // Réduit pour douceur
      divider: 'rgba(0,0,0,0.08)', // Plus subtil
      shadow: 'rgba(0,0,0,0.12)', // Ombres plus douces
      ripple: 'rgba(0,0,0,0.04)', // Effet touch plus subtil
    },

    accent: {
      primary: '#2563EB', // Bleu moderne plus doux
      secondary: '#4338CA', // Indigo sophistiqué
      success: '#10B981', // Vert moderne
      warning: '#F59E0B', // Orange doux
      error: '#EF4444', // Rouge moderne moins agressif
      info: '#0891B2', // Teal professionnel
    },

    navigation: {
      background: 'rgba(249, 249, 249, 0.95)', // Off-white cohérent
      activeTab: '#2563EB', // Bleu moderne cohérent
      inactiveTab: '#6B7280', // Gris cohérent avec texte
      indicator: '#2563EB', // Bleu moderne cohérent
    },

    player: {
      background: 'rgba(0,0,0,0.9)', // Noir pour vidéo reste optimal
      controls: 'rgba(249,249,249,0.95)', // Off-white pour contrôles
      overlay: 'rgba(0,0,0,0.6)', // Overlay reste sombre
      progress: '#2563EB', // Bleu moderne cohérent
      buffer: 'rgba(249,249,249,0.3)', // Off-white buffer
    },
  },

  typography: darkTheme.typography, // Même typo
  spacing: darkTheme.spacing, // Même espacement
  borderRadius: darkTheme.borderRadius, // Même border radius
};


// 🎨 Thème Gris Contraste
export const grayTheme: Theme = {
  id: 'gray',
  name: 'Gris Contraste',
  description: 'Thème gris neutre avec contraste élevé',
  isDark: true,

  colors: {
    background: {
      primary: '#1A1A1A',
      secondary: '#2A2A2A',
      tertiary: '#3A3A3A',
      gradient: ['#1A1A1A', '#2A2A2A', '#3A3A3A'],
    },

    surface: {
      primary: 'rgba(255, 255, 255, 0.1)',
      secondary: 'rgba(255, 255, 255, 0.05)',
      elevated: 'rgba(255, 255, 255, 0.15)',
      overlay: 'rgba(26, 26, 26, 0.95)',
    },

    text: {
      primary: '#FFFFFF',
      secondary: '#E0E0E0',
      tertiary: '#BDBDBD',
      placeholder: '#888888',
      inverse: '#1A1A1A',
    },

    ui: {
      border: 'rgba(255, 255, 255, 0.2)',
      divider: 'rgba(255, 255, 255, 0.1)',
      shadow: 'rgba(0, 0, 0, 0.5)',
      ripple: 'rgba(255, 255, 255, 0.1)',
    },

    accent: {
      primary: '#FFFFFF',
      secondary: '#E0E0E0',
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#F44336',
      info: '#2196F3',
    },

    navigation: {
      background: 'rgba(26, 26, 26, 0.95)',
      activeTab: '#FFFFFF',
      inactiveTab: '#BDBDBD',
      indicator: '#FFFFFF',
    },

    player: {
      background: 'rgba(0, 0, 0, 0.9)',
      controls: 'rgba(255, 255, 255, 0.9)',
      overlay: 'rgba(26, 26, 26, 0.6)',
      progress: '#FFFFFF',
      buffer: 'rgba(255, 255, 255, 0.3)',
    },
  },

  typography: darkTheme.typography,
  spacing: darkTheme.spacing,
  borderRadius: darkTheme.borderRadius,
};

// 🤎 Thème Marron Doux
export const brownTheme: Theme = {
  id: 'brown',
  name: 'Marron Doux',
  description: 'Thème marron chaleureux et doux',
  isDark: true,

  colors: {
    background: {
      primary: '#2C1810',
      secondary: '#3D2A1F',
      tertiary: '#4E3B2E',
      gradient: ['#2C1810', '#3D2A1F', '#4E3B2E'],
    },

    surface: {
      primary: 'rgba(213, 119, 68, 0.18)',
      secondary: 'rgba(213, 119, 68, 0.12)',
      elevated: 'rgba(213, 119, 68, 0.25)',
      overlay: 'rgba(44, 24, 16, 0.95)',
    },

    text: {
      primary: '#FFF8F5',
      secondary: '#F4DCC6',
      tertiary: '#E6B887',
      placeholder: '#D57744',
      inverse: '#2C1810',
    },

    ui: {
      border: 'rgba(213, 119, 68, 0.35)',
      divider: 'rgba(213, 119, 68, 0.2)',
      shadow: 'rgba(0, 0, 0, 0.4)',
      ripple: 'rgba(213, 119, 68, 0.15)',
    },

    accent: {
      primary: '#D57744',
      secondary: '#F4A460',
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#F44336',
      info: '#2196F3',
    },

    navigation: {
      background: 'rgba(44, 24, 16, 0.95)',
      activeTab: '#D57744',
      inactiveTab: '#E6B887',
      indicator: '#D57744',
    },

    player: {
      background: 'rgba(0, 0, 0, 0.9)',
      controls: 'rgba(245, 245, 245, 0.9)',
      overlay: 'rgba(46, 43, 41, 0.6)',
      progress: '#A1887F',
      buffer: 'rgba(245, 245, 245, 0.3)',
    },
  },

  typography: darkTheme.typography,
  spacing: darkTheme.spacing,
  borderRadius: darkTheme.borderRadius,
};

// 🌿 Thème Vert Doux (modifié)
export const greenSoftTheme: Theme = {
  id: 'green',
  name: 'Vert Doux',
  description: 'Thème vert naturel et apaisant',
  isDark: true,

  colors: {
    background: {
      primary: '#1A2E1A',
      secondary: '#254029',
      tertiary: '#305238',
      gradient: ['#1A2E1A', '#254029', '#305238'],
    },

    surface: {
      primary: 'rgba(76, 175, 80, 0.2)',
      secondary: 'rgba(76, 175, 80, 0.15)',
      elevated: 'rgba(76, 175, 80, 0.28)',
      overlay: 'rgba(26, 46, 26, 0.95)',
    },

    text: {
      primary: '#E8F5E8',
      secondary: '#C8E6C9',
      tertiary: '#A5D6A7',
      placeholder: '#4CAF50',
      inverse: '#1A2E1A',
    },

    ui: {
      border: 'rgba(76, 175, 80, 0.4)',
      divider: 'rgba(76, 175, 80, 0.25)',
      shadow: 'rgba(0, 0, 0, 0.4)',
      ripple: 'rgba(76, 175, 80, 0.15)',
    },

    accent: {
      primary: '#4CAF50',
      secondary: '#66BB6A',
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#F44336',
      info: '#2196F3',
    },

    navigation: {
      background: 'rgba(26, 46, 26, 0.95)',
      activeTab: '#4CAF50',
      inactiveTab: '#A5D6A7',
      indicator: '#4CAF50',
    },

    player: {
      background: 'rgba(0, 0, 0, 0.9)',
      controls: 'rgba(241, 248, 233, 0.9)',
      overlay: 'rgba(38, 50, 41, 0.6)',
      progress: '#81C784',
      buffer: 'rgba(241, 248, 233, 0.3)',
    },
  },

  typography: darkTheme.typography,
  spacing: darkTheme.spacing,
  borderRadius: darkTheme.borderRadius,
};

// 💜 Thème Violet Doux
export const purpleSoftTheme: Theme = {
  id: 'purple',
  name: 'Violet Doux',
  description: 'Thème violet élégant et doux',
  isDark: true,

  colors: {
    background: {
      primary: '#2A1B3D',
      secondary: '#3D2B54',
      tertiary: '#503B6B',
      gradient: ['#2A1B3D', '#3D2B54', '#503B6B'],
    },

    surface: {
      primary: 'rgba(142, 69, 173, 0.2)',
      secondary: 'rgba(142, 69, 173, 0.15)',
      elevated: 'rgba(142, 69, 173, 0.28)',
      overlay: 'rgba(42, 27, 61, 0.95)',
    },

    text: {
      primary: '#F3E5F5',
      secondary: '#E1BEE7',
      tertiary: '#CE93D8',
      placeholder: '#8E45AD',
      inverse: '#2A1B3D',
    },

    ui: {
      border: 'rgba(142, 69, 173, 0.4)',
      divider: 'rgba(142, 69, 173, 0.25)',
      shadow: 'rgba(0, 0, 0, 0.4)',
      ripple: 'rgba(142, 69, 173, 0.15)',
    },

    accent: {
      primary: '#8E45AD',
      secondary: '#AB47BC',
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#F44336',
      info: '#2196F3',
    },

    navigation: {
      background: 'rgba(42, 27, 61, 0.95)',
      activeTab: '#8E45AD',
      inactiveTab: '#CE93D8',
      indicator: '#8E45AD',
    },

    player: {
      background: 'rgba(0, 0, 0, 0.9)',
      controls: 'rgba(243, 229, 245, 0.9)',
      overlay: 'rgba(43, 40, 56, 0.6)',
      progress: '#B39DDB',
      buffer: 'rgba(243, 229, 245, 0.3)',
    },
  },

  typography: darkTheme.typography,
  spacing: darkTheme.spacing,
  borderRadius: darkTheme.borderRadius,
};

// 🌸 Thème Rose Sunset
export const sunsetTheme: Theme = {
  id: 'sunset',
  name: 'Sunset',
  description: 'Thème rose et orange chaleureux',
  isDark: true,

  colors: {
    background: {
      primary: '#1a0b1e',
      secondary: '#2d1b2e',
      tertiary: '#3d2b3e',
      gradient: ['#1a0b1e', '#2d1b2e', '#3d2b3e'],
    },

    surface: {
      primary: 'rgba(236, 72, 153, 0.15)',
      secondary: 'rgba(236, 72, 153, 0.1)',
      elevated: 'rgba(236, 72, 153, 0.2)',
      overlay: 'rgba(26, 11, 30, 0.95)',
    },

    text: {
      primary: '#fdf2f8',
      secondary: '#f3e8ff',
      tertiary: '#d8b4fe',
      placeholder: '#a855f7',
      inverse: '#1a0b1e',
    },

    ui: {
      border: 'rgba(236, 72, 153, 0.3)',
      divider: 'rgba(236, 72, 153, 0.2)',
      shadow: 'rgba(26, 11, 30, 0.5)',
      ripple: 'rgba(236, 72, 153, 0.1)',
    },

    accent: {
      primary: '#ec4899',
      secondary: '#f97316',
      success: '#22c55e',
      warning: '#eab308',
      error: '#ef4444',
      info: '#3b82f6',
    },

    navigation: {
      background: 'rgba(45, 27, 46, 0.95)',
      activeTab: '#ec4899',
      inactiveTab: '#d8b4fe',
      indicator: '#ec4899',
    },

    player: {
      background: 'rgba(26, 11, 30, 0.9)',
      controls: 'rgba(253, 242, 248, 0.9)',
      overlay: 'rgba(26, 11, 30, 0.6)',
      progress: '#ec4899',
      buffer: 'rgba(253, 242, 248, 0.3)',
    },
  },

  typography: darkTheme.typography,
  spacing: darkTheme.spacing,
  borderRadius: darkTheme.borderRadius,
};

// 🌊 Ocean Comfort (Inspiré TiviMate - Anti-fatigue)
export const oceanComfortTheme: Theme = {
  id: 'ocean-comfort',
  name: 'Ocean Comfort',
  description: 'Bleu océan apaisant pour visionnage longue durée',
  isDark: true,

  colors: {
    background: {
      primary: '#0F1419', // Bleu-noir doux
      secondary: '#1A2332', // Bleu-gris sombre
      tertiary: '#1E293B', // Bleu-gris
      gradient: ['#0F1419', '#1A2332', '#1E293B'],
    },

    surface: {
      primary: 'rgba(14, 165, 233, 0.12)', // Bleu cyan subtil
      secondary: 'rgba(14, 165, 233, 0.08)',
      elevated: 'rgba(14, 165, 233, 0.16)',
      overlay: 'rgba(15, 20, 25, 0.95)',
    },

    text: {
      primary: '#E2E8F0', // Blanc-bleu cassé
      secondary: '#CBD5E1', // Gris-bleu clair
      tertiary: '#94A3B8', // Gris-bleu moyen
      placeholder: '#64748B', // Gris-bleu foncé
      inverse: '#0F1419',
    },

    ui: {
      border: 'rgba(14, 165, 233, 0.25)',
      divider: 'rgba(14, 165, 233, 0.15)',
      shadow: 'rgba(0, 0, 0, 0.4)',
      ripple: 'rgba(14, 165, 233, 0.1)',
    },

    accent: {
      primary: '#0EA5E9', // Bleu cyan moderne
      secondary: '#0284C7', // Bleu foncé
      success: '#10B981', // Vert émeraude
      warning: '#F59E0B', // Orange ambre
      error: '#EF4444', // Rouge moderne
      info: '#06B6D4', // Cyan info
    },

    navigation: {
      background: 'rgba(15, 20, 25, 0.95)',
      activeTab: '#0EA5E9',
      inactiveTab: '#94A3B8',
      indicator: '#0EA5E9',
    },

    player: {
      background: 'rgba(0, 0, 0, 0.9)',
      controls: 'rgba(226, 232, 240, 0.9)',
      overlay: 'rgba(15, 20, 25, 0.6)',
      progress: '#0EA5E9',
      buffer: 'rgba(226, 232, 240, 0.3)',
    },
  },

  typography: darkTheme.typography,
  spacing: darkTheme.spacing,
  borderRadius: darkTheme.borderRadius,
};

// 🌅 Warm Amber (Confort visuel soir)
export const warmAmberTheme: Theme = {
  id: 'warm-amber',
  name: 'Warm Amber',
  description: 'Couleurs chaudes pour visionnage en soirée',
  isDark: true,

  colors: {
    background: {
      primary: '#1C1917', // Brun très sombre
      secondary: '#292524', // Brun gris
      tertiary: '#44403C', // Brun moyen
      gradient: ['#1C1917', '#292524', '#44403C'],
    },

    surface: {
      primary: 'rgba(245, 158, 11, 0.12)',
      secondary: 'rgba(245, 158, 11, 0.08)',
      elevated: 'rgba(245, 158, 11, 0.16)',
      overlay: 'rgba(28, 25, 23, 0.95)',
    },

    text: {
      primary: '#FEF3C7', // Blanc chaud
      secondary: '#FDE68A', // Jaune très clair
      tertiary: '#FCD34D', // Jaune clair
      placeholder: '#F59E0B', // Ambre
      inverse: '#1C1917',
    },

    ui: {
      border: 'rgba(245, 158, 11, 0.25)',
      divider: 'rgba(245, 158, 11, 0.15)',
      shadow: 'rgba(0, 0, 0, 0.4)',
      ripple: 'rgba(245, 158, 11, 0.1)',
    },

    accent: {
      primary: '#F59E0B', // Ambre doux
      secondary: '#D97706', // Orange ambre
      success: '#10B981', // Vert émeraude
      warning: '#F97316', // Orange
      error: '#EF4444', // Rouge moderne
      info: '#06B6D4', // Cyan info
    },

    navigation: {
      background: 'rgba(28, 25, 23, 0.95)',
      activeTab: '#F59E0B',
      inactiveTab: '#FCD34D',
      indicator: '#F59E0B',
    },

    player: {
      background: 'rgba(0, 0, 0, 0.9)',
      controls: 'rgba(254, 243, 199, 0.9)',
      overlay: 'rgba(28, 25, 23, 0.6)',
      progress: '#F59E0B',
      buffer: 'rgba(254, 243, 199, 0.3)',
    },
  },

  typography: darkTheme.typography,
  spacing: darkTheme.spacing,
  borderRadius: darkTheme.borderRadius,
};

// 💙 TiviMate Pro (Réplique optimisée)
export const tivimateProTheme: Theme = {
  id: 'tivimate-pro',
  name: 'TiviMate Pro',
  description: 'Réplique optimisée du style TiviMate',
  isDark: true,

  colors: {
    background: {
      primary: '#0F0F23', // Indigo très sombre
      secondary: '#1E1E3F', // Indigo moyen
      tertiary: '#2D2D5F', // Indigo clair
      gradient: ['#0F0F23', '#1E1E3F', '#2D2D5F'],
    },

    surface: {
      primary: 'rgba(99, 102, 241, 0.12)',
      secondary: 'rgba(99, 102, 241, 0.08)',
      elevated: 'rgba(99, 102, 241, 0.16)',
      overlay: 'rgba(15, 15, 35, 0.95)',
    },

    text: {
      primary: '#E0E7FF', // Blanc-indigo
      secondary: '#C7D2FE', // Indigo très clair
      tertiary: '#A5B4FC', // Indigo clair
      placeholder: '#818CF8', // Indigo moyen
      inverse: '#0F0F23',
    },

    ui: {
      border: 'rgba(99, 102, 241, 0.25)',
      divider: 'rgba(99, 102, 241, 0.15)',
      shadow: 'rgba(0, 0, 0, 0.4)',
      ripple: 'rgba(99, 102, 241, 0.1)',
    },

    accent: {
      primary: '#6366F1', // Indigo moderne
      secondary: '#FDE047', // Jaune doux (style TiviMate)
      success: '#10B981', // Vert émeraude
      warning: '#F59E0B', // Orange ambre
      error: '#EF4444', // Rouge moderne
      info: '#06B6D4', // Cyan info
    },

    navigation: {
      background: 'rgba(15, 15, 35, 0.95)',
      activeTab: '#6366F1',
      inactiveTab: '#A5B4FC',
      indicator: '#6366F1',
    },

    player: {
      background: 'rgba(0, 0, 0, 0.9)',
      controls: 'rgba(224, 231, 255, 0.9)',
      overlay: 'rgba(15, 15, 35, 0.6)',
      progress: '#6366F1',
      buffer: 'rgba(224, 231, 255, 0.3)',
    },
  },

  typography: darkTheme.typography,
  spacing: darkTheme.spacing,
  borderRadius: darkTheme.borderRadius,
};

// Liste de tous les thèmes disponibles
export const availableThemes: Theme[] = [
  darkTheme,
  lightTheme,
  grayTheme,
  brownTheme,
  greenSoftTheme,
  purpleSoftTheme,
  sunsetTheme,
  oceanComfortTheme,
  warmAmberTheme,
  tivimateProTheme,
];

// Fonction pour obtenir un thème par ID
export const getThemeById = (id: string): Theme => {
  const theme = availableThemes.find(t => t.id === id);
  return theme || darkTheme; // Fallback vers le thème sombre
};

// Fonction pour obtenir la liste des thèmes pour sélection
export const getThemesList = () => {
  return availableThemes.map(theme => ({
    id: theme.id,
    name: theme.name,
    description: theme.description,
    isDark: theme.isDark,
    primaryColor: theme.colors.accent.primary,
    backgroundColor: theme.colors.background.primary,
  }));
};