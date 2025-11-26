import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {View, Text, StyleSheet} from 'react-native';
import {AppProvider} from './src/context/AppContext';
import LoadingOverlay from './src/components/LoadingOverlay';
import NotificationToast from './src/components/NotificationToast';

import App_IPTV_SMARTERS from './App_IPTV_SMARTERS';
import PlaylistsScreenWithPin from './src/components/PlaylistsScreenWithPin';

const Tab = createBottomTabNavigator();

// Écran temporaire pour les autres onglets
const ComingSoonScreen = ({route}: {route: any}) => (
  <View style={styles.comingSoon}>
    <Icon name="construction" size={64} color="#8E9AAF" />
    <Text style={styles.comingSoonTitle}>{route.name}</Text>
    <Text style={styles.comingSoonText}>Fonctionnalité en développement</Text>
  </View>
);

const TabNavigator = () => {
  return (
    <AppProvider>
      <Tab.Navigator
        screenOptions={{
          tabBarStyle: {
            backgroundColor: '#0F1419',
            borderTopColor: '#2A3441',
            borderTopWidth: 1,
            height: 65,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarActiveTintColor: '#4A90E2',
          tabBarInactiveTintColor: '#8E9AAF',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
          headerShown: false,
        }}>
        <Tab.Screen
          name="Accueil"
          component={App_IPTV_SMARTERS}
          options={{
            tabBarIcon: ({color, size}) => (
              <Icon name="home" color={color} size={size} />
            ),
          }}
        />

        <Tab.Screen
          name="Playlists"
          component={PlaylistsScreenWithPin}
          options={{
            tabBarIcon: ({color, size}) => (
              <Icon name="playlist-play" color={color} size={size} />
            ),
          }}
        />

        <Tab.Screen
          name="Favoris"
          component={ComingSoonScreen}
          options={{
            tabBarIcon: ({color, size}) => (
              <Icon name="favorite" color={color} size={size} />
            ),
          }}
        />

        <Tab.Screen
          name="Recherche"
          component={ComingSoonScreen}
          options={{
            tabBarIcon: ({color, size}) => (
              <Icon name="search" color={color} size={size} />
            ),
          }}
        />

        <Tab.Screen
          name="Paramètres"
          component={ComingSoonScreen}
          options={{
            tabBarIcon: ({color, size}) => (
              <Icon name="settings" color={color} size={size} />
            ),
          }}
        />
      </Tab.Navigator>

      {/* 🎬 Overlays nécessaires pour animations */}
      <LoadingOverlay />
      <NotificationToast />
    </AppProvider>
  );
};

const styles = StyleSheet.create({
  comingSoon: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F1419',
    padding: 40,
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 10,
  },
  comingSoonText: {
    fontSize: 16,
    color: '#8E9AAF',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default TabNavigator;
