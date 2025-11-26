/**
 * 🚀 App.tsx - Point d'entrée unifié IPTV Mobile
 * Architecture moderne : Zustand + Services modulaires + DI
 */

import React from 'react';
import {useFastImageCache} from './src/hooks/useFastImageCache';
import {useDatabaseInitialization} from './src/hooks/useDatabaseInitialization';
import {useSyncInitialization} from './src/hooks/useSyncInitialization';
import {usePlaylistSync} from './src/hooks/usePlaylistSync';

// ✅ Masquer les warnings verbeux connus (non critiques pour l'utilisateur)
const originalWarn = console.warn;
console.warn = (...args) => {
  const message = args[0]?.toString?.() || '';

  // Masquer spécifiquement le warning batch de WatermelonDB
  if (
    (message.includes('Database.batch was called with') &&
      message.includes('arguments')) ||
    message.includes('🍉')
  ) {
    return; // Ne pas afficher ce warning spécifique
  }

  // Masquer le warning "Excessive number of pending callbacks" (problème connu React Native)
  // Ce warning apparaît avec les animations intensives mais n'affecte pas les performances
  if (message.includes('Excessive number of pending callbacks')) {
    return; // Warning connu de React Native, non critique
  }

  // Masquer le warning ProgressBarAndroid deprecated (remplacement en cours)
  if (message.includes('ProgressBarAndroid has been extracted from react-native')) {
    return; // Component deprecated, utilise custom progress bar
  }

  // Garder tous les autres warnings
  originalWarn(...args);
};
import './src/version'; // Load version info
import './src/i18n/config'; // Initialisation i18n avec react-i18next
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {PaperProvider} from 'react-native-paper';
import {GestureHandlerRootView} from 'react-native-gesture-handler';

// Le hook de persistance a été supprimé et remplacé par la logique interne du store Zustand.

// Force l'initialisation du PlaylistStore pour déclencher le log de persistance
import './src/stores/PlaylistStore';

// Force l'initialisation du CastManager pour demander les permissions dès le démarrage
import {castManager} from './src/services/CastManager';
// Le simple import du singleton déclenche son initialisation
console.log('📺 [App] CastManager initialized:', !!castManager);

// Initialisation des index de performance pour la recherche
import {databaseIndexService} from './src/services/DatabaseIndexService';
// L'indexation se fera au premier accès, sans bloquer le démarrage
console.log('🗃️ [App] Database index service initialized:', !!databaseIndexService);

// NOTE: Les index SQL sont créés automatiquement par les migrations WatermelonDB (schema v4)
// Il est impossible de vérifier leur existence via SQL car sqlite_master n'est pas dans le schéma
// Les performances se vérifieront lors de l'utilisation réelle de l'app

// Components globaux
import LoadingOverlay from './src/components/LoadingOverlay';
import NotificationToast from './src/components/NotificationToast';
import GlobalVideoPlayer from './src/components/GlobalVideoPlayer';
// import SplashScreen from './src/screens/SplashScreen'; // TODO: Implémenter SplashScreen
import {ThemeProvider} from './src/contexts/ThemeContext';
import {AlertProvider} from './src/contexts/AlertContext';

// Screens
import App_IPTV_SMARTERS from './App_IPTV_SMARTERS';
import ChannelListScreen from './src/screens/ChannelListScreen';
import ChannelsScreen from './src/screens/ChannelsScreen';
import ChannelPlayerScreen from './src/screens/ChannelPlayerScreen';
import FinalSearchScreenWrapper from './src/screens/FinalSearchScreenWrapper';
import SettingsScreen from './src/screens/SettingsScreen';
import AutoSyncSettingsScreen from './src/screens/AutoSyncSettingsScreen';
import VideoPlayerSettingsScreen from './src/screens/VideoPlayerSettingsScreen';
import TVGuideSettingsScreen from './src/screens/TVGuideSettingsScreen';
import ThemeSettingsScreen from './src/screens/ThemeSettingsScreen';
import PlayerSettingsScreen from './src/screens/PlayerSettingsScreen';
import LanguageSettingsScreen from './src/screens/LanguageSettingsScreen';
import PerformanceSettingsScreen from './src/screens/PerformanceSettingsScreen';
import AccountScreen from './src/screens/AccountScreen';
import ProfileStartupSettings from './src/screens/ProfileStartupSettings';
import InterfaceSettingsScreen from './src/screens/InterfaceSettingsScreen';
import AccountInfoScreen from './src/screens/AccountInfoScreen';
import ParentalControlScreen from './src/screens/ParentalControlScreen';
import NetworkInfoScreen from './src/screens/NetworkInfoScreen';
import SpeedTestScreen from './src/screens/SpeedTestScreen';
import CategoriesSelectionScreen from './src/screens/CategoriesSelectionScreen';
import TimeRestrictionsScreen from './src/screens/TimeRestrictionsScreen';
import EPGManualSourcesScreen from './src/screens/EPGManualSourcesScreen';
import EPGPlaylistAssignmentScreen from './src/screens/EPGPlaylistAssignmentScreen';
import AddProfileScreen from './src/screens/AddProfileScreen';
import UserProfileScreen from './src/screens/UserProfileScreen';

// 🎬 Écrans Films et Séries VOD
import MoviesScreen from './src/screens/vod/MoviesScreen';
import SeriesScreen from './src/screens/vod/SeriesScreen';
import MovieDetailScreen from './src/screens/vod/MovieDetailScreen';
import SeriesDetailScreen from './src/screens/vod/SeriesDetailScreen';

// Types navigation
import type {Channel, Profile} from './src/types';

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
  FinalSearch: {
    playlistId: string;
    initialCategory?: string;
    categoryName?: string;
    categoryGroupTitle?: string;
    playlistName?: string;
    playlistType?: string;
  };
  Settings: undefined;
  AutoSyncSettings: undefined;
  VideoPlayerSettings: undefined;
  TVGuideSettings: undefined;
  ThemeSettings: undefined;
  PlayerSettings: undefined;
  LanguageSettings: undefined;
  PerformanceSettings: undefined;
  SpeedTest: undefined;
  Account: undefined;
  AccountInfo: undefined;
  ProfileStartupSettings: undefined;
  InterfaceSettings: undefined;
  AddProfile: undefined;
  UserProfile: { profile: Profile };
  ParentalControl: undefined;
  CategoriesSelection: {profileId: string};
  TimeRestrictions: {profileId: string};
  EPGManualSources: undefined;
  EPGPlaylistAssignment: undefined;
  // 🎬 Écrans Films et Séries VOD
  MoviesScreen: {
    playlistId: string;
    categories?: any[];
  };
  SeriesScreen: {
    playlistId: string;
    categories?: any[];
  };
  MovieDetailScreen: {
    movie: any;
    playlistId: string;
  };
  SeriesDetailScreen: {
    series: any;
    playlistId: string;
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
  // Configuration cache FastImage au démarrage
  useFastImageCache();

  // Initialisation des index de base de données en arrière-plan
  useDatabaseInitialization();

  // Initialisation du système de synchronisation professionnelle
  useSyncInitialization();

  // Écouter les événements de synchronisation pour rafraîchir le store
  usePlaylistSync();

  // La persistance est maintenant gérée automatiquement par le store Zustand.
  // L'état (y compris la playlist active) est restauré au démarrage de l'application.

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <ThemeProvider>
        <AlertProvider>
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
                  gestureDirection: 'horizontal-inverted', // Swipe vers la gauche pour revenir
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
                <Stack.Screen
                  name="ChannelPlayer"
                  component={ChannelPlayerScreen}
                  options={{
                    cardStyleInterpolator: ({current: {progress}}) => ({
                      cardStyle: {
                        opacity: progress,
                      },
                    }),
                  }}
                />
                                  <Stack.Screen
                  name="FinalSearch"
                  component={FinalSearchScreenWrapper}
                  options={{
                    presentation: 'modal',
                    headerShown: false,
                    gestureEnabled: false, // 🔥 Désactiver les gestes pour éviter conflit avec ScrollView horizontal
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
                {/* 🎬 Écrans Films et Séries VOD */}
                <Stack.Screen
                  name="MoviesScreen"
                  component={MoviesScreen}
                  options={{
                    headerShown: false,
                    gestureEnabled: true,
                  }}
                />
                <Stack.Screen
                  name="SeriesScreen"
                  component={SeriesScreen}
                  options={{
                    headerShown: false,
                    gestureEnabled: true,
                  }}
                />
                <Stack.Screen
                  name="MovieDetailScreen"
                  component={MovieDetailScreen}
                  options={{
                    headerShown: false,
                    gestureEnabled: true,
                    presentation: 'modal',
                  }}
                />
                <Stack.Screen
                  name="SeriesDetailScreen"
                  component={SeriesDetailScreen}
                  options={{
                    headerShown: false,
                    gestureEnabled: true,
                    presentation: 'modal',
                  }}
                />
                <Stack.Screen name="Settings" component={SettingsScreen} />
                <Stack.Screen
                  name="AutoSyncSettings"
                  component={AutoSyncSettingsScreen}
                />
                <Stack.Screen
                  name="VideoPlayerSettings"
                  component={VideoPlayerSettingsScreen}
                />
                <Stack.Screen
                  name="TVGuideSettings"
                  component={TVGuideSettingsScreen}
                />
                <Stack.Screen
                  name="ThemeSettings"
                  component={ThemeSettingsScreen}
                />
                <Stack.Screen
                  name="PerformanceSettings"
                  component={PerformanceSettingsScreen}
                />
                <Stack.Screen
                  name="SpeedTest"
                  component={SpeedTestScreen}
                  options={{headerShown: false}}
                />
                <Stack.Screen
                  name="PlayerSettings"
                  component={PlayerSettingsScreen}
                />
                <Stack.Screen
                  name="LanguageSettings"
                  component={LanguageSettingsScreen}
                />
                <Stack.Screen
                  name="Account"
                  component={AccountScreen}
                />
                <Stack.Screen
                  name="ProfileStartupSettings"
                  component={ProfileStartupSettings}
                />
                <Stack.Screen
                  name="InterfaceSettings"
                  component={InterfaceSettingsScreen}
                />
                <Stack.Screen
                  name="AccountInfo"
                  component={AccountInfoScreen}
                />
                  <Stack.Screen
                  name="AddProfile"
                  component={AddProfileScreen}
                  options={{
                    presentation: 'modal',
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="UserProfile"
                  component={UserProfileScreen}
                />
                <Stack.Screen
                  name="ParentalControl"
                  component={ParentalControlScreen}
                />
                <Stack.Screen
                  name="CategoriesSelection"
                  component={CategoriesSelectionScreen}
                />
                <Stack.Screen
                  name="TimeRestrictions"
                  component={TimeRestrictionsScreen}
                />
                <Stack.Screen
                  name="EPGManualSources"
                  component={EPGManualSourcesScreen}
                />
                <Stack.Screen
                  name="EPGPlaylistAssignment"
                  component={EPGPlaylistAssignmentScreen}
                />
              </Stack.Navigator>

              {/* Overlays globaux pour toute l'app */}
              <LoadingOverlay />
              <NotificationToast />

              {/* 🎯 GLOBAL VIDEO PLAYER SINGLETON */}
              <GlobalVideoPlayer />
            </NavigationContainer>
          </PaperProvider>
        </AlertProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
};

export default App;
