/**
 * 🎬 Wrapper simple avec Navigation pour App_IPTV_SMARTERS
 * Navigation basique : App_IPTV_SMARTERS ↔ ChannelListScreen
 */

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
import ChannelsScreen from './src/screens/ChannelsScreen';
import type { Channel } from './src/types';

// Types navigation simple
export type SimpleRootStackParamList = {
  IPTVSmarters: undefined;
  ChannelList: {
    playlistId?: string;
    playlistName?: string;
    channels?: Channel[];
    totalChannels?: number;
  };
  ChannelsScreen: {
    playlistId?: string;
    channelsCount?: number;
  };
};

const Stack = createStackNavigator<SimpleRootStackParamList>();

const AppWithNavigation: React.FC = () => {
  return (
    <PaperProvider>
      <AppProvider>
        <PlaylistProvider>
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName="IPTVSmarters"
              screenOptions={{
                headerShown: false,
                gestureEnabled: true,
                cardStyleInterpolator: ({ current, layouts }) => ({
                  cardStyle: {
                    transform: [
                      {
                        translateX: current.progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [layouts.screen.width, 0],
                        }),
                      },
                    ],
                  },
                }),
              }}
            >
              <Stack.Screen 
                name="IPTVSmarters" 
                component={App_IPTV_SMARTERS}
              />
              <Stack.Screen 
                name="ChannelList" 
                component={ChannelListScreen}
              />
              <Stack.Screen 
                name="ChannelsScreen" 
                component={ChannelsScreen}
              />
            </Stack.Navigator>
            {/* Overlays globaux pour toute l'app */}
            <LoadingOverlay />
            <NotificationToast />
          </NavigationContainer>
        </PlaylistProvider>
      </AppProvider>
    </PaperProvider>
  );
};

export default AppWithNavigation;