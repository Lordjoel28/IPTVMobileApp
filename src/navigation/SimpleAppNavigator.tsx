/**
 * 🧭 IPTV Mobile App - Navigation Simple et Robuste
 * Basé sur l'analyse des vraies apps IPTV (Stack-only)
 */

import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Types
import type {RootStackParamList} from '../types';

// Screens
import HomeScreen from '../screens/HomeScreen'; // Votre interface originale
import AddProfileScreen from '../screens/AddProfileScreen';
import ChannelListScreen from '../screens/ChannelListScreen';
import ChannelPlayerScreen from '../screens/ChannelPlayerScreen';
import PlaylistsScreen from '../screens/PlaylistsScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import FinalSearchScreenWrapper from '../screens/FinalSearchScreenWrapper';
import SettingsScreen from '../screens/SettingsScreen';
import AccountScreen from '../screens/AccountScreen';
import AccountInfoScreen from '../screens/AccountInfoScreen';

const Stack = createStackNavigator<RootStackParamList>();

/**
 * Navigation simple Stack-only - Pattern des vraies apps IPTV
 * ✅ Performance maximale
 * ✅ Pas de problèmes RNGestureHandler
 * ✅ Navigation directe entre écrans
 */
const SimpleAppNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#111111',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: {
          color: '#FFFFFF',
          fontWeight: 'bold',
          fontSize: 18,
        },
        headerTintColor: '#FFFFFF',
        cardStyle: {
          backgroundColor: '#000000',
        },
        gestureEnabled: true,
        headerBackTitleVisible: false,
      }}>
      {/* Écran principal avec votre interface originale */}
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: '📱 IPTV Mobile',
          headerShown: false, // Interface custom dans HomeScreen
        }}
      />

      {/* Ajouter un profil */}
      <Stack.Screen
        name="AddProfile"
        component={AddProfileScreen}
        options={{
          title: 'Ajouter un profil',
          headerBackTitleVisible: false,
        }}
      />

      {/* Mes Playlists */}
      <Stack.Screen
        name="Playlists"
        component={PlaylistsScreen}
        options={{
          title: 'Mes Playlists',
        }}
      />

      {/* Liste des chaînes d'une playlist */}
      <Stack.Screen
        name="ChannelList"
        component={ChannelListScreen}
        options={({route}) => ({
          title: route.params?.playlistName || 'Chaînes IPTV',
          headerShown: false, // Interface custom
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

      {/* Favoris */}
      <Stack.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          title: 'Chaînes Favorites',
          headerRight: () => (
            <Icon
              name="favorite"
              size={24}
              color="#FF4444"
              style={{marginRight: 15}}
            />
          ),
        }}
      />

      {/* Recherche optimisée FinalSearch */}
      <Stack.Screen
        name="FinalSearch"
        component={FinalSearchScreenWrapper}
        options={{
          title: 'Recherche Optimisée',
          headerShown: false, // Interface custom dans FinalSearchScreen
          gestureEnabled: false,
        }}
      />

      {/* Paramètres */}
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Paramètres',
          headerRight: () => (
            <Icon
              name="save"
              size={24}
              color="#FFFFFF"
              style={{marginRight: 15}}
            />
          ),
        }}
      />

      {/* Compte */}
      <Stack.Screen
        name="Account"
        component={AccountScreen}
        options={{
          title: 'Mon Compte',
          headerShown: false, // Interface custom dans AccountScreen
        }}
      />

      {/* Informations du compte */}
      <Stack.Screen
        name="AccountInfo"
        component={AccountInfoScreen}
        options={{
          title: 'Informations du compte',
          headerShown: false, // Interface custom dans AccountInfoScreen
        }}
      />
    </Stack.Navigator>
  );
};

export default SimpleAppNavigator;
