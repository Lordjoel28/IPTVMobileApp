/**
 * 🚀 App.tsx - Point d'entrée unifié IPTV Mobile
 * Architecture moderne : Zustand + Services modulaires + DI
 */

import React from 'react';
import {useFastImageCache} from './src/hooks/useFastImageCache';

// ✅ Masquer le warning WatermelonDB spécifique (trop verbeux pour l'utilisateur)
const originalWarn = console.warn;
console.warn = (...args) => {
  const message = args[0]?.toString?.() || '';

  // Masquer spécifiquement le warning batch de WatermelonDB
  if (message.includes('Database.batch was called with') && message.includes('arguments') ||
      message.includes('🍉')) {
    return; // Ne pas afficher ce warning spécifique
  }

  // Garder tous les autres warnings
  originalWarn(...args);
};
import './src/version'; // Load version info
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {PaperProvider} from 'react-native-paper';
import {GestureHandlerRootView} from 'react-native-gesture-handler';

// Le hook de persistance a été supprimé et remplacé par la logique interne du store Zustand.

// Force l'initialisation du PlaylistStore pour déclencher le log de persistance
import './src/stores/PlaylistStore';

// Components globaux
import LoadingOverlay from './src/components/LoadingOverlay';
import NotificationToast from './src/components/NotificationToast';
import GlobalVideoPlayer from './src/components/GlobalVideoPlayer';
import SplashScreen from './src/screens/SplashScreen';
import { ThemeProvider } from './src/contexts/ThemeContext';

// Screens
import App_IPTV_SMARTERS from './App_IPTV_SMARTERS';
import ChannelListScreen from './src/screens/ChannelListScreen';
import ChannelsScreen from './src/screens/ChannelsScreen';
import ChannelPlayerScreen from './src/screens/ChannelPlayerScreen';
import SearchScreen from './src/screens/SearchScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import VideoPlayerSettingsScreen from './src/screens/VideoPlayerSettingsScreen';
import TVGuideSettingsScreen from './src/screens/TVGuideSettingsScreen';
import ThemeSettingsScreen from './src/screens/ThemeSettingsScreen';
import EPGManualSourcesScreen from './src/screens/EPGManualSourcesScreen';
import EPGPlaylistAssignmentScreen from './src/screens/EPGPlaylistAssignmentScreen';

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
  Search: {
    allChannels: Channel[];
    playlistId: string;
    playlistName: string;
  };
  Settings: undefined;
  VideoPlayerSettings: undefined;
  TVGuideSettings: undefined;
  ThemeSettings: undefined;
  EPGManualSources: undefined;
  EPGPlaylistAssignment: undefined;
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

  // Configuration cache FastImage au démarrage
  useFastImageCache();

  // La persistance est maintenant gérée automatiquement par le store Zustand.
  // L'état (y compris la playlist active) est restauré au démarrage de l'application.

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <ThemeProvider>
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
                        outputRange: [layouts?.screen?.width || 375, 0],
                      }),
                    },
                  ],
                },
              }),
            }}>
            <Stack.Screen name="IPTVSmarters" component={App_IPTV_SMARTERS} />
            <Stack.Screen name="ChannelList" component={ChannelListScreen} />
            <Stack.Screen name="ChannelsScreen" component={ChannelsScreen} />
            <Stack.Screen
              name="ChannelPlayer"
              component={ChannelPlayerScreen}
            />
            <Stack.Screen
              name="Search"
              component={SearchScreen}
              options={{
                presentation: 'modal',
                cardStyleInterpolator: ({current, layouts}) => ({
                  cardStyle: {
                    transform: [
                      {
                        translateY: current.progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [layouts?.screen?.height || 844, 0],
                        }),
                      },
                    ],
                  },
                }),
              }}
            />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="VideoPlayerSettings" component={VideoPlayerSettingsScreen} />
            <Stack.Screen name="TVGuideSettings" component={TVGuideSettingsScreen} />
            <Stack.Screen name="ThemeSettings" component={ThemeSettingsScreen} />
            <Stack.Screen name="EPGManualSources" component={EPGManualSourcesScreen} />
            <Stack.Screen name="EPGPlaylistAssignment" component={EPGPlaylistAssignmentScreen} />
          </Stack.Navigator>

          {/* Overlays globaux pour toute l'app */}
          <LoadingOverlay />
          <NotificationToast />

          {/* 🎯 GLOBAL VIDEO PLAYER SINGLETON */}
          <GlobalVideoPlayer />
        </NavigationContainer>
        </PaperProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
};

export default App;
