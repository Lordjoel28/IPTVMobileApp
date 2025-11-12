/**
 * 🧭 IPTV Mobile App - Navigation Principale
 * Configuration React Navigation pour application IPTV
 */

import React from 'react';
import {
  createStackNavigator,
  CardStyleInterpolators,
} from '@react-navigation/stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createDrawerNavigator} from '@react-navigation/drawer';
import {useTheme} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Types
import type {RootStackParamList, BottomTabParamList} from '../types';

// Screens (à créer)
import HomeScreen from '../screens/HomeScreen';
import ChannelListScreen from '../screens/ChannelListScreen';
import ChannelPlayerScreen from '../screens/ChannelPlayerScreen';
import PlayerScreen from '../screens/PlayerScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ThemeSettingsScreen from '../screens/ThemeSettingsScreen';
import VideoPlayerSettingsScreen from '../screens/VideoPlayerSettingsScreen';
import TVGuideSettingsScreen from '../screens/TVGuideSettingsScreen';
import PlaylistDetailScreen from '../screens/PlaylistDetailScreen';
import FinalSearchScreenWrapper from '../screens/FinalSearchScreenWrapper';
import UserProfileScreen from '../screens/UserProfileScreen';
import AccountScreen from '../screens/AccountScreen';
import AccountInfoScreen from '../screens/AccountInfoScreen';
import ParentalControlScreen from '../screens/ParentalControlScreen';
import CategoriesSelectionScreen from '../screens/CategoriesSelectionScreen';

// Tab Screens
import PlaylistsScreen from '../screens/PlaylistsScreen';
import FavoritesScreen from '../screens/FavoritesScreen';

// Navigation instances
const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<BottomTabParamList>();
const Drawer = createDrawerNavigator();

/**
 * Navigation par onglets (Bottom Tabs)
 */
const TabNavigator: React.FC = () => {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color, size}) => {
          let iconName: string;

          switch (route.name) {
            case 'HomeTab':
              iconName = 'home';
              break;
            case 'PlaylistsTab':
              iconName = 'playlist-play';
              break;
            case 'FavoritesTab':
              iconName = focused ? 'favorite' : 'favorite-border';
              break;
            case 'SearchTab':
              iconName = 'search';
              break;
            case 'SettingsTab':
              iconName = 'settings';
              break;
            default:
              iconName = 'help';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.accent.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
          borderTopWidth: 1,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: theme.colors.surface,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: {
          color: theme.colors.onSurface,
          fontWeight: 'bold',
          fontSize: 18,
        },
        headerTintColor: theme.colors.onSurface,
      })}>
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: 'Accueil',
          headerTitle: '📱 IPTV Mobile',
        }}
      />
      <Tab.Screen
        name="PlaylistsTab"
        component={PlaylistsScreen}
        options={{
          title: 'Playlists',
          headerTitle: 'Mes Playlists',
        }}
      />
      <Tab.Screen
        name="FavoritesTab"
        component={FavoritesScreen}
        options={{
          title: 'Favoris',
          headerTitle: 'Chaînes Favorites',
        }}
      />
      <Tab.Screen
        name="SearchTab"
        component={FinalSearchScreenWrapper}
        initialParams={{playlistId: null, categoryName: 'GLOBAL', categoryGroupTitle: 'GLOBAL'}}
        options={{
          title: 'Recherche',
          headerTitle: 'Rechercher',
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          title: 'Paramètres',
          headerTitle: 'Paramètres',
        }}
      />
    </Tab.Navigator>
  );
};

/**
 * Navigation par tiroir (Drawer)
 */
const DrawerNavigator: React.FC = () => {
  const theme = useTheme();

  return (
    <Drawer.Navigator
      screenOptions={{
        drawerStyle: {
          backgroundColor: theme.colors.surface,
          width: 280,
        },
        drawerActiveTintColor: theme.colors.accent.primary,
        drawerInactiveTintColor: theme.colors.onSurfaceVariant,
        drawerLabelStyle: {
          fontSize: 16,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTitleStyle: {
          color: theme.colors.onSurface,
        },
        headerTintColor: theme.colors.onSurface,
      }}>
      <Drawer.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{
          title: 'IPTV Mobile',
          drawerIcon: ({color, size}) => (
            <Icon name="home" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{
          title: 'Profil Utilisateur',
          drawerIcon: ({color, size}) => (
            <Icon name="account-circle" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="ParentalControl"
        component={ParentalControlScreen}
        options={{
          title: 'Contrôle Parental',
          drawerIcon: ({color, size}) => (
            <Icon name="child-care" size={size} color={color} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
};

/**
 * Navigation principale (Stack)
 */
const AppNavigator: React.FC = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: {
          color: theme.colors.onSurface,
          fontWeight: 'bold',
          fontSize: 18,
        },
        headerTintColor: theme.colors.onSurface,
        cardStyle: {
          backgroundColor: theme.colors.background,
        },
        gestureEnabled: true,
        headerBackTitleVisible: false,
      }}>
      {/* Écran principal avec navigation par onglets et tiroir */}
      <Stack.Screen
        name="Home"
        component={DrawerNavigator}
        options={{
          headerShown: false,
        }}
      />

      {/* Liste des chaînes d'une playlist */}
      <Stack.Screen
        name="ChannelList"
        component={ChannelListScreen}
        options={({route}) => ({
          title: route.params?.playlistName || 'Chaînes IPTV',
          headerShown: false, // Interface custom dans ChannelListScreen
        })}
      />

      {/* Interface 3-zones IPTV Smarters Pro */}
      <Stack.Screen
        name="ChannelPlayer"
        component={ChannelPlayerScreen}
        options={{
          headerShown: false,
          gestureEnabled: true,
          cardStyleInterpolator: CardStyleInterpolators.forFadeFromBottomAndroid,
        }}
      />

      {/* Lecteur vidéo en plein écran */}
      <Stack.Screen
        name="Player"
        component={PlayerScreen}
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
          gestureEnabled: false,
        }}
      />

      {/* Détail d'une playlist */}
      <Stack.Screen
        name="PlaylistDetail"
        component={PlaylistDetailScreen}
        options={({route}) => ({
          title: route.params?.playlist?.name || 'Playlist',
          headerRight: () => (
            <Icon
              name="more-vert"
              size={24}
              color={theme.colors.onSurface}
              style={{marginRight: 15}}
            />
          ),
        })}
      />

      {/* Recherche optimisée FinalSearch */}
      <Stack.Screen
        name="FinalSearch"
        component={FinalSearchScreenWrapper}
        options={{
          headerShown: false, // Interface custom dans FinalSearchScreen
          presentation: 'card', // ✅ Écran normal (pas modal)
          gestureEnabled: false, // ❌ Désactiver gestures swipe arrière pour éviter conflits
          gestureDirection: 'vertical', // ✅ Autoriser seulement swipe vertical si nécessaire
        }}
      />

      {/* Paramètres utilisateur */}
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerShown: false, // Interface custom dans SettingsScreen
        }}
      />

      {/* Compte utilisateur */}
      <Stack.Screen
        name="Account"
        component={AccountScreen}
        options={{
          title: 'Mon Compte',
          headerShown: false, // Interface custom dans AccountScreen
          gestureEnabled: true,
        }}
      />

      {/* Informations du compte */}
      <Stack.Screen
        name="AccountInfo"
        component={AccountInfoScreen}
        options={{
          title: 'Informations du compte',
          headerShown: false, // Interface custom dans AccountInfoScreen
          gestureEnabled: true,
        }}
      />

      {/* Paramètres des thèmes */}
      <Stack.Screen
        name="ThemeSettings"
        component={ThemeSettingsScreen}
        options={{
          headerShown: false, // Interface custom dans ThemeSettingsScreen
          gestureEnabled: true,
        }}
      />

      {/* Paramètres du lecteur vidéo */}
      <Stack.Screen
        name="VideoPlayerSettings"
        component={VideoPlayerSettingsScreen}
        options={{
          headerShown: false, // Interface custom
          gestureEnabled: true,
        }}
      />

      {/* Paramètres du guide TV */}
      <Stack.Screen
        name="TVGuideSettings"
        component={TVGuideSettingsScreen}
        options={{
          headerShown: false, // Interface custom
          gestureEnabled: true,
        }}
      />

      {/* Profil utilisateur */}
      <Stack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{
          title: 'Profil Utilisateur',
        }}
      />

      {/* Contrôle parental */}
      <Stack.Screen
        name="ParentalControl"
        component={ParentalControlScreen}
        options={{
          title: 'Contrôle Parental',
          headerRight: () => (
            <Icon
              name="security"
              size={24}
              color={theme.colors.onSurface}
              style={{marginRight: 15}}
            />
          ),
        }}
      />

      {/* Sélection des catégories bloquées */}
      <Stack.Screen
        name="CategoriesSelection"
        component={CategoriesSelectionScreen}
        options={{
          headerShown: false,
          gestureEnabled: true,
        }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;
