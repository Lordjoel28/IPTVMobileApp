/**
 * 🎨 UI Store - Zustand store for UI state management
 * Replaces AppContext for loading overlays, notifications, and global UI state
 */

import React from 'react';
import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LoadingState {
  visible: boolean;
  title: string;
  subtitle?: string;
  progress?: number;
}

interface NotificationState {
  visible: boolean;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

// Préférences d'interface utilisateur
export interface UISettings {
  // Transparence/Opacité
  transparency: {
    overlayOpacity: number; // 0-100 (pourcentage)
    epgOpacity: number; // 0-100 (pourcentage)
    menuOpacity: number; // 0-100 (pourcentage)
  };

  // Taille du texte
  textSize: {
    scale: number; // 0.8, 1.0, 1.2, 1.5
    channelName: number; // taille base en sp
    epgTitle: number; // taille base en sp
    menuText: number; // taille base en sp
  };
}

const DEFAULT_UI_SETTINGS: UISettings = {
  transparency: {
    overlayOpacity: 80, // 80% par défaut
    epgOpacity: 70, // 70% par défaut
    menuOpacity: 90, // 90% par défaut
  },
  textSize: {
    scale: 1.0, // Taille normale par défaut
    channelName: 16, // 16sp base
    epgTitle: 14, // 14sp base
    menuText: 12, // 12sp base
  },
};

interface UIState {
  // Loading overlay state
  loading: LoadingState;

  // Notification state
  notification: NotificationState;

  // Modal closer registry (for complex modals)
  modalClosers: Array<() => void>;

  // UI Preferences
  uiSettings: UISettings;

  // Hydration tracking
  _hasHydrated: boolean;

  // Actions - Loading
  showLoading: (title: string, subtitle?: string, progress?: number) => void;
  updateLoading: (updates: Partial<Omit<LoadingState, 'visible'>>) => void;
  hideLoading: () => void;

  // Actions - Notifications
  showNotification: (
    message: string,
    type: NotificationState['type'],
    duration?: number,
  ) => void;
  hideNotification: () => void;

  // Actions - Modal management
  registerModalCloser: (closer: () => void) => void;
  unregisterModalCloser: (closer: () => void) => void;
  closeAllModals: () => void;

  // Actions - UI Preferences
  setOverlayOpacity: (opacity: number) => void;
  setEpgOpacity: (opacity: number) => void;
  setMenuOpacity: (opacity: number) => void;
  setTextScale: (scale: number) => void;
  getOverlayAlpha: () => string; // Retourne "rgba(0, 0, 0, 0.8)"
  getEpgAlpha: () => string; // Retourne "rgba(0, 0, 0, 0.7)"
  getMenuAlpha: () => string; // Retourne "rgba(0, 0, 0, 0.9)"
  getScaledTextSize: (baseSize: number) => number; // Retourne baseSize * scale
  resetUIToDefaults: () => void;
  applyUIPreset: (preset: 'light' | 'dark' | 'high-contrast') => void;

  // Actions - Store management
  setHasHydrated: (state: boolean) => void;
  reset: () => void;
}

const initialState = {
  loading: {
    visible: false,
    title: '',
    subtitle: undefined,
    progress: undefined,
  },
  notification: {
    visible: false,
    message: '',
    type: 'info' as const,
    duration: 3000,
  },
  modalClosers: [],
  uiSettings: DEFAULT_UI_SETTINGS,
  _hasHydrated: false,
};

// Version avec persist pour les préférences UI
export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Loading actions
      showLoading: (title: string, subtitle?: string, progress?: number) =>
        set({
          loading: {
            visible: true,
            title,
            subtitle,
            progress,
          },
        }),

      updateLoading: updates =>
        set(state => ({
          loading: {
            ...state.loading,
            ...updates,
          },
        })),

      hideLoading: () =>
        set({
          loading: {
            ...initialState.loading,
            visible: false,
          },
        }),

      // Notification actions
      showNotification: (
        message: string,
        type: NotificationState['type'],
        duration = 3000,
      ) => {
        set({
          notification: {
            visible: true,
            message,
            type,
            duration,
          },
        });

        // Auto-hide after duration
        if (duration > 0) {
          setTimeout(() => {
            get().hideNotification();
          }, duration);
        }
      },

      hideNotification: () =>
        set({
          notification: {
            ...initialState.notification,
            visible: false,
          },
        }),

      // Modal management actions
      registerModalCloser: (closer: () => void) =>
        set(state => ({
          modalClosers: [...state.modalClosers, closer],
        })),

      unregisterModalCloser: (closer: () => void) =>
        set(state => ({
          modalClosers: state.modalClosers.filter(c => c !== closer),
        })),

      closeAllModals: () => {
        const {modalClosers} = get();
        modalClosers.forEach(closer => closer());
        set({modalClosers: []});
      },

      // UI Preferences actions
      setOverlayOpacity: (opacity: number) => {
        const clampedOpacity = Math.max(0, Math.min(100, opacity));
        console.log('🎨 [UIStore] setOverlayOpacity:', opacity, '->', clampedOpacity);
        set(state => ({
          uiSettings: {
            ...state.uiSettings,
            transparency: {
              ...state.uiSettings.transparency,
              overlayOpacity: clampedOpacity,
            },
          },
        }));
        console.log('🎨 [UIStore] New uiSettings:', {
          ...get().uiSettings,
          transparency: { ...get().uiSettings.transparency, overlayOpacity: clampedOpacity }
        });
      },

      setEpgOpacity: (opacity: number) => {
        const clampedOpacity = Math.max(0, Math.min(100, opacity));
        console.log('🎨 [UIStore] setEpgOpacity:', opacity, '->', clampedOpacity);
        set(state => ({
          uiSettings: {
            ...state.uiSettings,
            transparency: {
              ...state.uiSettings.transparency,
              epgOpacity: clampedOpacity,
            },
          },
        }));
        console.log('🎨 [UIStore] New uiSettings:', {
          ...get().uiSettings,
          transparency: { ...get().uiSettings.transparency, epgOpacity: clampedOpacity }
        });
      },

      setMenuOpacity: (opacity: number) => {
        const clampedOpacity = Math.max(0, Math.min(100, opacity));
        console.log('🎨 [UIStore] setMenuOpacity:', opacity, '->', clampedOpacity);
        set(state => ({
          uiSettings: {
            ...state.uiSettings,
            transparency: {
              ...state.uiSettings.transparency,
              menuOpacity: clampedOpacity,
            },
          },
        }));
        console.log('🎨 [UIStore] New uiSettings:', {
          ...get().uiSettings,
          transparency: { ...get().uiSettings.transparency, menuOpacity: clampedOpacity }
        });
      },

      setTextScale: (scale: number) => {
        const validScales = [0.8, 1.0, 1.2, 1.5];
        const closestScale = validScales.reduce((prev, curr) =>
          Math.abs(curr - scale) < Math.abs(prev - scale) ? curr : prev
        );

        console.log('🎨 [UIStore] setTextScale:', scale, '->', closestScale);
        set(state => ({
          uiSettings: {
            ...state.uiSettings,
            textSize: {
              ...state.uiSettings.textSize,
              scale: closestScale,
            },
          },
        }));
        console.log('🎨 [UIStore] New uiSettings:', {
          ...get().uiSettings,
          textSize: { ...get().uiSettings.textSize, scale: closestScale }
        });
      },

      getOverlayAlpha: () => {
        const opacity = get().uiSettings.transparency.overlayOpacity / 100;
        return `rgba(0, 0, 0, ${opacity})`;
      },

      getEpgAlpha: () => {
        const opacity = get().uiSettings.transparency.epgOpacity / 100;
        return `rgba(0, 0, 0, ${opacity})`;
      },

      getMenuAlpha: () => {
        const opacity = get().uiSettings.transparency.menuOpacity / 100;
        return `rgba(0, 0, 0, ${opacity})`;
      },

      getScaledTextSize: (baseSize: number) => {
        return baseSize * get().uiSettings.textSize.scale;
      },

      resetUIToDefaults: () => {
        set({
          uiSettings: DEFAULT_UI_SETTINGS,
        });
      },

      applyUIPreset: (preset: 'light' | 'dark' | 'high-contrast') => {
        const presets = {
          light: {
            transparency: {
              overlayOpacity: 90,
              epgOpacity: 85,
              menuOpacity: 95,
            },
            textSize: {
              scale: 1.0,
              channelName: 16,
              epgTitle: 14,
              menuText: 12,
            },
          },
          dark: {
            transparency: {
              overlayOpacity: 60,
              epgOpacity: 50,
              menuOpacity: 70,
            },
            textSize: {
              scale: 1.0,
              channelName: 16,
              epgTitle: 14,
              menuText: 12,
            },
          },
          'high-contrast': {
            transparency: {
              overlayOpacity: 100,
              epgOpacity: 90,
              menuOpacity: 100,
            },
            textSize: {
              scale: 1.2,
              channelName: 18,
              epgTitle: 16,
              menuText: 14,
            },
          },
        };

        set({
          uiSettings: presets[preset],
        });
      },

      // Store management
      setHasHydrated: (state: boolean) => {
        set({_hasHydrated: state});
      },

      reset: () => set({...initialState}),
    }),
    {
      name: 'ui-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        uiSettings: state.uiSettings,
      }),
      onRehydrateStorage: () => state => {
        console.log('🌊 Rehydrating UI store');
        state?.setHasHydrated(true);
      },
    }
  )
);

// Version alternative avec persist si nécessaire (commentée pour éviter les warnings)
/*
export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({ ...store logic... }),
    {
      name: 'ui-store',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => state => {
        console.log('🌊 Rehydrating UI store');
        state?.setHasHydrated(true);
      },
    },
  ),
);
*/

// Hook personnalisé pour faciliter l'utilisation
export const useUISettings = () => {
  const uiStore = useUIStore();

  // Log initial
  React.useEffect(() => {
    console.log('🎨 [useUISettings] Hook initialized');
    console.log('🎨 [useUISettings] Current uiSettings:', uiStore.uiSettings);
  }, []);

  return {
    ...uiStore,

    // Méthodes pratiques pour obtenir les styles
    styles: {
      overlay: {
        backgroundColor: uiStore.getOverlayAlpha(),
      },
      epg: {
        backgroundColor: uiStore.getEpgAlpha(),
      },
      menu: {
        backgroundColor: uiStore.getMenuAlpha(),
      },
      text: {
        fontSize: (baseSize: number) => uiStore.getScaledTextSize(baseSize),
      },
    },
  };
};

// Export for easier access to specific parts
export const getUIState = () => useUIStore.getState();

console.log('🎨 UIStore initialized with UI Preferences - Ready to replace AppContext');
