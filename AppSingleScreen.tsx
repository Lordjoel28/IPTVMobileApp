import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { PaperProvider } from 'react-native-paper';
import { AppProvider } from './src/context/AppContext';
import { PlaylistProvider } from './src/context/PlaylistContext';
import LoadingOverlay from './src/components/LoadingOverlay';
import NotificationToast from './src/components/NotificationToast';
import App_IPTV_SMARTERS from './App_IPTV_SMARTERS';
import ChannelListScreen from './src/screens/ChannelListScreen';
import type { Channel } from './src/types';

// Types pour la navigation simple (sans tabs)
export type RootStackParamList = {
  Home: undefined;
  ChannelList: {
    playlistId?: string;
    playlistName?: string;
    channels?: Channel[];
    totalChannels?: number;
  };
};

const Stack = createStackNavigator<RootStackParamList>();

const AppSingleScreen: React.FC = () => {
  return (
    <PaperProvider>
      <AppProvider>
        <PlaylistProvider>
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName="Home"
              screenOptions={{
                headerShown: false, // Pas de header par défaut
              }}
            >
              <Stack.Screen 
                name="Home" 
                component={App_IPTV_SMARTERS} 
              />
              <Stack.Screen 
                name="ChannelList" 
                component={ChannelListScreen}
                options={{
                  headerShown: true,
                  title: 'Chaînes',
                  headerStyle: { backgroundColor: '#0F1419' },
                  headerTintColor: '#FFFFFF',
                }}
              />
            </Stack.Navigator>
            <LoadingOverlay />
            <NotificationToast />
          </NavigationContainer>
        </PlaylistProvider>
      </AppProvider>
    </PaperProvider>
  );
};

export default AppSingleScreen;