/**
 * 🚀 App.tsx - Point d'entrée unifié IPTV Mobile
 * Architecture moderne : Zustand + Services modulaires + DI
 */

import React from 'react';
import './src/version'; // Load version info
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {PaperProvider} from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Components globaux
import LoadingOverlay from './src/components/LoadingOverlay';
import NotificationToast from './src/components/NotificationToast';

// Screens
import App_IPTV_SMARTERS from './App_IPTV_SMARTERS';
import ChannelListScreen from './src/screens/ChannelListScreen';
import ChannelsScreen from './src/screens/ChannelsScreen';
import ChannelPlayerScreen from './src/screens/ChannelPlayerScreen';

// Types navigation
import type {Channel} from './src/types';

// Types navigation unifiés
export type RootStackParamList = {
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
  ChannelPlayer: {
    channels: Channel[];
    selectedChannel: Channel;
    playlistName: string;
    category?: string;
  };
};

const Stack = createStackNavigator<RootStackParamList>();

/**
 * 🏗️ Application principale IPTV
 * Architecture moderne sans Context API, avec :
 * - Zustand stores (UIStore, PlaylistStore)
 * - Services modulaires avec DI
 * - Navigation unifiée
 * - Overlays globaux
 */
const App: React.FC = () => {
  console.log('📍 [DEBUG] App.tsx loaded with GestureHandler support');
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <PaperProvider>
      {/*
        Architecture moderne IPTV Mobile v2.2.0+ :
        ✅ Pas de Context Providers (remplacés par Zustand)
        ✅ Architecture DI pure avec services modulaires
        ✅ Stores Zustand avec persistance AsyncStorage
        ✅ Navigation React Navigation 6.x
        ✅ Overlays globaux pour UX fluide
      */}
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="IPTVSmarters"
          screenOptions={{
            headerShown: false,
            gestureEnabled: true,
            cardStyleInterpolator: ({current, layouts}) => ({
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
          }}>
          <Stack.Screen name="IPTVSmarters" component={App_IPTV_SMARTERS} />
          <Stack.Screen name="ChannelList" component={ChannelListScreen} />
          <Stack.Screen name="ChannelsScreen" component={ChannelsScreen} />
          <Stack.Screen name="ChannelPlayer" component={ChannelPlayerScreen} />
        </Stack.Navigator>

        {/* Overlays globaux pour toute l'app */}
        <LoadingOverlay />
        <NotificationToast />
      </NavigationContainer>
    </PaperProvider>
    </GestureHandlerRootView>
  );
};

export default App;
