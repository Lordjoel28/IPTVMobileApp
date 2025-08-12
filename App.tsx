
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { PlaylistProvider } from './src/context/PlaylistContext';
import { AppProvider } from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';
import LoadingOverlay from './src/components/LoadingOverlay';
import NotificationToast from './src/components/NotificationToast';

const App = () => {
  return (
    <PaperProvider>
      <AppProvider>
        <PlaylistProvider>
          <NavigationContainer>
            <AppNavigator />
            {/* Overlays globaux pour toute l'app */}
            <LoadingOverlay />
            <NotificationToast />
          </NavigationContainer>
        </PlaylistProvider>
      </AppProvider>
    </PaperProvider>
  );
};

export default App;
