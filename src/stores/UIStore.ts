/**
 * 🎨 UI Store - Zustand store for UI state management
 * Replaces AppContext for loading overlays, notifications, and global UI state
 */

import {create} from 'zustand';
// import {persist, createJSONStorage} from 'zustand/middleware';
// import AsyncStorage from '@react-native-async-storage/async-storage';

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

interface UIState {
  // Loading overlay state
  loading: LoadingState;

  // Notification state
  notification: NotificationState;

  // Modal closer registry (for complex modals)
  modalClosers: Array<() => void>;

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
  _hasHydrated: false,
};

// Version sans persist pour éviter les erreurs AsyncStorage
export const useUIStore = create<UIState>()((set, get) => ({
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

  // Store management
  setHasHydrated: (state: boolean) => {
    set({_hasHydrated: state});
  },

  reset: () => set({...initialState}),
}));

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

// Export for easier access to specific parts
export const getUIState = () => useUIStore.getState();

console.log('🎨 UIStore initialized - Ready to replace AppContext');
