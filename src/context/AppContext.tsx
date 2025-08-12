/**
 * 🌐 App Context - Gestionnaire global des états UI
 * Gestion centralisée des overlays, notifications et états globaux
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';

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

interface AppContextData {
  // Loading overlay
  loading: LoadingState;
  showLoading: (title: string, subtitle?: string, progress?: number) => void;
  updateLoading: (updates: Partial<Omit<LoadingState, 'visible'>>) => void;
  hideLoading: () => void;
  
  // Notifications
  notification: NotificationState;
  showNotification: (message: string, type?: 'success' | 'error' | 'warning' | 'info', duration?: number) => void;
  hideNotification: () => void;
}

const AppContext = createContext<AppContextData | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState<LoadingState>({
    visible: false,
    title: '',
    subtitle: undefined,
    progress: undefined,
  });

  const [notification, setNotification] = useState<NotificationState>({
    visible: false,
    message: '',
    type: 'info',
    duration: 3000,
  });

  const showLoading = (title: string, subtitle?: string, progress?: number) => {
    setLoading({
      visible: true,
      title,
      subtitle,
      progress,
    });
  };

  const updateLoading = (updates: Partial<Omit<LoadingState, 'visible'>>) => {
    setLoading(prev => ({
      ...prev,
      ...updates,
      visible: true,
    }));
  };

  const hideLoading = () => {
    setLoading(prev => ({ ...prev, visible: false }));
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration: number = 3000) => {
    setNotification({
      visible: true,
      message,
      type,
      duration,
    });

    // Auto-hide après la durée spécifiée
    setTimeout(() => {
      hideNotification();
    }, duration);
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, visible: false }));
  };

  return (
    <AppContext.Provider
      value={{
        loading,
        showLoading,
        updateLoading,
        hideLoading,
        notification,
        showNotification,
        hideNotification,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextData => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};