/**
 * 📱 LECTEUR IPTV MOBILE - Architecture Complète
 * Application IPTV avec architecture modulaire et thèmes modernes
 */

import React from 'react';
import {
  StatusBar,
  useColorScheme,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Navigation
import AppNavigator from './src/navigation/AppNavigator';

// Thèmes
import { getTheme } from './src/styles/themes';

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const theme = getTheme('dark', isDarkMode); // Utilise le thème sombre IPTV par défaut

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          <StatusBar 
            barStyle={isDarkMode ? 'light-content' : 'dark-content'}
            backgroundColor={theme.colors.surface}
          />
          <AppNavigator />
        </NavigationContainer>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

export default App;