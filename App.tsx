
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { PlaylistProvider } from './src/context/PlaylistContext';
import AppNavigator from './src/navigation/AppNavigator';

const App = () => {
  return (
    <PaperProvider>
      <PlaylistProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </PlaylistProvider>
    </PaperProvider>
  );
};

export default App;
