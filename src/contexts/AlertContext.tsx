/**
 * 🔔 AlertContext - Contexte pour gérer les alertes personnalisées
 */

import React, {createContext, useContext, useState} from 'react';
import AlertModal from '../components/AlertModal';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertConfig {
  title: string;
  message?: string;
  buttons?: AlertButton[];
}

interface AlertContextType {
  showAlert: (title: string, message?: string, buttons?: AlertButton[]) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<AlertConfig>({title: ''});

  const showAlert = (
    title: string,
    message?: string,
    buttons?: AlertButton[],
  ) => {
    setConfig({title, message, buttons});
    setVisible(true);
  };

  const hideAlert = () => {
    setVisible(false);
  };

  return (
    <AlertContext.Provider value={{showAlert}}>
      {children}
      <AlertModal
        visible={visible}
        title={config.title}
        message={config.message}
        buttons={config.buttons}
        onClose={hideAlert}
      />
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within AlertProvider');
  }
  return context;
};
