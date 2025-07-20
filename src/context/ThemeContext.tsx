/**
 * 🎨 Theme Context pour IPTV Mobile
 * Gestion centralisée des thèmes avec persistence
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { 
  getTheme, 
  createIPTVTheme, 
  THEME_STORAGE_KEY, 
  DEFAULT_THEME,
  IPTVThemes
} from '../styles/themes';
import type { ThemeType } from '../types';
import type { IPTVTheme } from '../styles/themes';

interface ThemeContextType {
  theme: IPTVTheme;
  themeType: ThemeType;
  isDarkMode: boolean;
  availableThemes: Array<{
    name: ThemeType;
    displayName: string;
    primaryColor: string;
  }>;
  setTheme: (themeType: ThemeType) => Promise<void>;
  toggleDarkMode: () => Promise<void>;
  resetToDefault: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeType, setThemeType] = useState<ThemeType>(DEFAULT_THEME);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [theme, setThemeState] = useState<IPTVTheme>(createIPTVTheme(DEFAULT_THEME, true));

  // Liste des thèmes disponibles
  const availableThemes = [
    { name: 'dark' as ThemeType, displayName: 'Sombre', primaryColor: '#1E88E5' },
    { name: 'light' as ThemeType, displayName: 'Clair', primaryColor: '#1E88E5' },
    { name: 'blue' as ThemeType, displayName: 'Bleu Océan', primaryColor: '#2196F3' },
    { name: 'green' as ThemeType, displayName: 'Vert Matrix', primaryColor: '#4CAF50' },
    { name: 'purple' as ThemeType, displayName: 'Violet Royal', primaryColor: '#9C27B0' },
    { name: 'orange' as ThemeType, displayName: 'Orange Coucher', primaryColor: '#FF9800' },
    { name: 'red' as ThemeType, displayName: 'Rouge Feu', primaryColor: '#F44336' },
    { name: 'pink' as ThemeType, displayName: 'Rose Cerise', primaryColor: '#E91E63' },
  ];

  // Charger le thème sauvegardé au démarrage
  useEffect(() => {
    loadSavedTheme();
  }, []);

  // Mettre à jour le thème quand les paramètres changent
  useEffect(() => {
    const effectiveIsDark = themeType === 'auto' ? systemColorScheme === 'dark' : isDarkMode;
    const newTheme = createIPTVTheme(themeType, effectiveIsDark);
    setThemeState(newTheme);
    
    console.log(`🎨 Thème mis à jour: ${themeType} (${effectiveIsDark ? 'sombre' : 'clair'})`);
  }, [themeType, isDarkMode, systemColorScheme]);

  const loadSavedTheme = async () => {
    try {
      const savedThemeData = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedThemeData) {
        const { themeType: savedTheme, isDarkMode: savedIsDark } = JSON.parse(savedThemeData);
        setThemeType(savedTheme || DEFAULT_THEME);
        setIsDarkMode(savedIsDark !== undefined ? savedIsDark : true);
        console.log(`📱 Thème chargé: ${savedTheme} (${savedIsDark ? 'sombre' : 'clair'})`);
      } else {
        console.log(`🎨 Thème par défaut: ${DEFAULT_THEME}`);
      }
    } catch (error) {
      console.warn('⚠️ Erreur chargement thème:', error);
      setThemeType(DEFAULT_THEME);
      setIsDarkMode(true);
    }
  };

  const saveTheme = async (newThemeType: ThemeType, newIsDarkMode: boolean) => {
    try {
      const themeData = {
        themeType: newThemeType,
        isDarkMode: newIsDarkMode,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(themeData));
      console.log(`💾 Thème sauvegardé: ${newThemeType} (${newIsDarkMode ? 'sombre' : 'clair'})`);
    } catch (error) {
      console.warn('⚠️ Erreur sauvegarde thème:', error);
    }
  };

  const setTheme = async (newThemeType: ThemeType) => {
    setThemeType(newThemeType);
    await saveTheme(newThemeType, isDarkMode);
    console.log(`🎨 Nouveau thème sélectionné: ${newThemeType}`);
  };

  const toggleDarkMode = async () => {
    const newIsDarkMode = !isDarkMode;
    setIsDarkMode(newIsDarkMode);
    await saveTheme(themeType, newIsDarkMode);
    console.log(`🌓 Mode ${newIsDarkMode ? 'sombre' : 'clair'} activé`);
  };

  const resetToDefault = async () => {
    setThemeType(DEFAULT_THEME);
    setIsDarkMode(true);
    await saveTheme(DEFAULT_THEME, true);
    console.log(`🔄 Thème réinitialisé: ${DEFAULT_THEME}`);
  };

  const contextValue: ThemeContextType = {
    theme,
    themeType,
    isDarkMode: themeType === 'auto' ? systemColorScheme === 'dark' : isDarkMode,
    availableThemes,
    setTheme,
    toggleDarkMode,
    resetToDefault,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme doit être utilisé dans un ThemeProvider');
  }
  return context;
};