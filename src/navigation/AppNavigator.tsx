/**
 * 🧭 IPTV Mobile App - Navigation Principale
 * Configuration React Navigation pour application IPTV
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Types
import type { RootStackParamList, BottomTabParamList } from '../types';

// Screens (à créer)
import HomeScreen from '../screens/HomeScreen';
import ChannelListScreen from '../screens/ChannelListScreen';
import ChannelPlayerScreen from '../screens/ChannelPlayerScreen';
import PlayerScreen from '../screens/PlayerScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PlaylistDetailScreen from '../screens/PlaylistDetailScreen';
import SearchScreen from '../screens/SearchScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import ParentalControlScreen from '../screens/ParentalControlScreen';

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
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
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
        tabBarActiveTintColor: theme.colors.primary,
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
      })}
    >
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
        component={SearchScreen}
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
        drawerActiveTintColor: theme.colors.primary,
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
      }}
    >
      <Drawer.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{
          title: 'IPTV Mobile',
          drawerIcon: ({ color, size }) => (
            <Icon name="home" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{
          title: 'Profil Utilisateur',
          drawerIcon: ({ color, size }) => (
            <Icon name="account-circle" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="ParentalControl"
        component={ParentalControlScreen}
        options={{
          title: 'Contrôle Parental',
          drawerIcon: ({ color, size }) => (
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
      }}
    >
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
        options={({ route }) => ({
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
        options={({ route }) => ({
          title: route.params?.playlist?.name || 'Playlist',
          headerRight: () => (
            <Icon
              name="more-vert"
              size={24}
              color={theme.colors.onSurface}
              style={{ marginRight: 15 }}
            />
          ),
        })}
      />
      
      {/* Recherche globale */}
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{
          title: 'Recherche Avancée',
          headerRight: () => (
            <Icon
              name="filter-list"
              size={24}
              color={theme.colors.onSurface}
              style={{ marginRight: 15 }}
            />
          ),
        }}
      />
      
      {/* Paramètres utilisateur */}
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Paramètres',
          headerRight: () => (
            <Icon
              name="save"
              size={24}
              color={theme.colors.onSurface}
              style={{ marginRight: 15 }}
            />
          ),
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
              style={{ marginRight: 15 }}
            />
          ),
        }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;