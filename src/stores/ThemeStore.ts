/**
 * 🎨 ThemeStore - Zustand Store
 * Remplace ThemeContext avec Zustand
 */

import { create } from 'zustand';
import type { ThemeType, CustomTheme } from '../types';
import { themes } from '../styles/themes';

export interface ThemeStoreState {
  // État
  themeType: ThemeType;
  theme: CustomTheme;
  isDark: boolean;

  // Actions
  setTheme: (themeType: ThemeType) => void;
  toggleDarkMode: () => void;
  setCustomTheme: (theme: CustomTheme) => void;
  reset: () => void;
}

const getThemeFromType = (themeType: ThemeType): CustomTheme => {
  return themes[themeType] || themes.dark;
};

const isDarkTheme = (themeType: ThemeType): boolean => {
  return themeType === 'dark' || themeType === 'auto';
};

export const useThemeStore = create<ThemeStoreState>((set, get) => ({
  // État initial
  themeType: 'dark',
  theme: getThemeFromType('dark'),
  isDark: true,

  // Actions
  setTheme: (themeType) => {
    const theme = getThemeFromType(themeType);
    const isDark = isDarkTheme(themeType);
    
    set({
      themeType,
      theme,
      isDark
    });
  },
  
  toggleDarkMode: () => {
    const { themeType } = get();
    const newThemeType: ThemeType = themeType === 'dark' ? 'light' : 'dark';
    const theme = getThemeFromType(newThemeType);
    const isDark = isDarkTheme(newThemeType);
    
    set({
      themeType: newThemeType,
      theme,
      isDark
    });
  },
  
  setCustomTheme: (theme) => set({ 
    theme,
    themeType: 'auto', // Ou custom si on ajoute ce type
    isDark: theme.dark 
  }),
  
  reset: () => {
    const defaultTheme = getThemeFromType('dark');
    set({
      themeType: 'dark',
      theme: defaultTheme,
      isDark: true
    });
  }
}));