/**
 * 🎨 ThemeContext - Gestionnaire global des thèmes
 * Context React pour la gestion centralisée des thèmes
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useColorScheme} from 'react-native';
import {
  Theme,
  darkTheme,
  lightTheme,
  getThemeById,
  availableThemes,
} from '../themes/themeConfig';
import ProfileService from '../services/ProfileService';

interface ThemeContextType {
  // État actuel
  currentTheme: Theme;
  isLoading: boolean;

  // Actions
  setTheme: (themeId: string) => Promise<void>;
  toggleTheme: () => Promise<void>;
  resetToSystem: () => Promise<void>;
  loadProfileTheme: (profileId: string) => Promise<void>;

  // Configuration
  availableThemes: Theme[];
  isSystemTheme: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

const THEME_STORAGE_KEY = 'user_selected_theme';
const SYSTEM_THEME_KEY = 'use_system_theme';

export const ThemeProvider: React.FC<ThemeProviderProps> = ({children}) => {
  const systemColorScheme = useColorScheme();
  const [currentTheme, setCurrentTheme] = useState<Theme>(darkTheme);
  const [isLoading, setIsLoading] = useState(true);
  const [isSystemTheme, setIsSystemTheme] = useState(true);

  // Charger les préférences de thème au démarrage
  useEffect(() => {
    loadThemePreferences();
  }, []);

  // Réagir aux changements du thème système si activé
  useEffect(() => {
    if (isSystemTheme) {
      const systemTheme = systemColorScheme === 'dark' ? darkTheme : lightTheme;
      setCurrentTheme(systemTheme);
      console.log(
        '🎨 [ThemeProvider] Thème système appliqué:',
        systemTheme.name,
      );
    }
  }, [systemColorScheme, isSystemTheme]);

  const loadThemePreferences = async () => {
    try {
      setIsLoading(true);

      // Vérifier si l'utilisateur utilise le thème système
      const useSystemTheme = await AsyncStorage.getItem(SYSTEM_THEME_KEY);
      const shouldUseSystem = useSystemTheme !== 'false'; // Par défaut, utiliser le système

      if (shouldUseSystem) {
        setIsSystemTheme(true);
        const systemTheme =
          systemColorScheme === 'dark' ? darkTheme : lightTheme;
        setCurrentTheme(systemTheme);
        console.log(
          '🎨 [ThemeProvider] Chargement thème système:',
          systemTheme.name,
        );
      } else {
        // Charger le thème personnalisé sélectionné
        const savedThemeId = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedThemeId) {
          const theme = getThemeById(savedThemeId);
          setCurrentTheme(theme);
          setIsSystemTheme(false);
          console.log(
            '🎨 [ThemeProvider] Chargement thème personnalisé:',
            theme.name,
          );
        } else {
          // Fallback vers le thème système
          setIsSystemTheme(true);
          const systemTheme =
            systemColorScheme === 'dark' ? darkTheme : lightTheme;
          setCurrentTheme(systemTheme);
        }
      }
    } catch (error) {
      console.error('❌ [ThemeProvider] Erreur chargement thème:', error);
      // Fallback vers le thème sombre par défaut
      setCurrentTheme(darkTheme);
      setIsSystemTheme(false);
    } finally {
      setIsLoading(false);
    }
  };

  const setTheme = async (themeId: string) => {
    try {
      const theme = getThemeById(themeId);
      setCurrentTheme(theme);
      setIsSystemTheme(false);

      // Sauvegarder les préférences globales
      await AsyncStorage.setItem(THEME_STORAGE_KEY, themeId);
      await AsyncStorage.setItem(SYSTEM_THEME_KEY, 'false');

      // Sauvegarder le thème dans le profil actif
      const activeProfile = await ProfileService.getActiveProfile();
      if (activeProfile) {
        await ProfileService.updateProfileTheme(
          activeProfile.id,
          themeId as any,
        );
        console.log(
          '🎨 [ThemeProvider] Thème sauvegardé dans le profil:',
          activeProfile.name,
        );
      }

      console.log('🎨 [ThemeProvider] Thème changé vers:', theme.name);
    } catch (error) {
      console.error('❌ [ThemeProvider] Erreur changement thème:', error);
    }
  };

  const loadProfileTheme = async (profileId: string) => {
    try {
      const profile = await ProfileService.getProfileById(profileId);
      if (profile && profile.theme) {
        const theme = getThemeById(profile.theme);
        setCurrentTheme(theme);
        setIsSystemTheme(false);
        console.log(
          '🎨 [ThemeProvider] Thème du profil chargé:',
          theme.name,
          'pour',
          profile.name,
        );
      } else {
        // Pas de thème défini, charger le thème par défaut
        const systemTheme =
          systemColorScheme === 'dark' ? darkTheme : lightTheme;
        setCurrentTheme(systemTheme);
        console.log(
          '🎨 [ThemeProvider] Pas de thème de profil, utilisation du thème système',
        );
      }
    } catch (error) {
      console.error(
        '❌ [ThemeProvider] Erreur chargement thème profil:',
        error,
      );
    }
  };

  const toggleTheme = async () => {
    try {
      if (isSystemTheme) {
        // Si on utilise le système, basculer vers le thème opposé manuellement
        const oppositeTheme = currentTheme.isDark ? lightTheme : darkTheme;
        await setTheme(oppositeTheme.id);
      } else {
        // Si on a un thème manuel, basculer entre sombre et clair
        const targetTheme = currentTheme.isDark ? lightTheme : darkTheme;
        await setTheme(targetTheme.id);
      }
    } catch (error) {
      console.error('❌ [ThemeProvider] Erreur toggle thème:', error);
    }
  };

  const resetToSystem = async () => {
    try {
      setIsSystemTheme(true);
      const systemTheme = systemColorScheme === 'dark' ? darkTheme : lightTheme;
      setCurrentTheme(systemTheme);

      // Sauvegarder les préférences
      await AsyncStorage.setItem(SYSTEM_THEME_KEY, 'true');
      await AsyncStorage.removeItem(THEME_STORAGE_KEY);

      console.log(
        '🎨 [ThemeProvider] Retour au thème système:',
        systemTheme.name,
      );
    } catch (error) {
      console.error('❌ [ThemeProvider] Erreur reset thème système:', error);
    }
  };

  const contextValue: ThemeContextType = {
    currentTheme,
    isLoading,
    setTheme,
    toggleTheme,
    resetToSystem,
    loadProfileTheme,
    availableThemes,
    isSystemTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook personnalisé pour utiliser le thème
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme doit être utilisé dans un ThemeProvider');
  }
  return context;
};

// Hook pour accéder rapidement aux couleurs du thème actuel
export const useThemeColors = () => {
  const {currentTheme} = useTheme();
  return currentTheme.colors;
};

// Hook pour accéder à la typologie du thème actuel
export const useThemeTypography = () => {
  const {currentTheme} = useTheme();
  return currentTheme.typography;
};

// Hook pour accéder aux espacements du thème actuel
export const useThemeSpacing = () => {
  const {currentTheme} = useTheme();
  return currentTheme.spacing;
};

// Hook pour accéder aux border radius du thème actuel
export const useThemeBorderRadius = () => {
  const {currentTheme} = useTheme();
  return currentTheme.borderRadius;
};

// Hook pour vérifier si c'est un thème sombre
export const useIsDark = () => {
  const {currentTheme} = useTheme();
  return currentTheme.isDark;
};
