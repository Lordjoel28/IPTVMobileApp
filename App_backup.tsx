/**
 * 📱 LECTEUR IPTV MOBILE - App Principale
 * Architecture modulaire avancée inspirée de l'app web
 */

import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Import des modules principaux
import { AppManager } from './src/modules/app/AppManager';
import { AppState } from './src/modules/app/AppManager';

// Import des écrans
import HomeScreen from './src/screens/HomeScreen';
import PlaylistsScreen from './src/screens/PlaylistsScreen';
import PlayerScreen from './src/screens/PlayerScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Navigation
const Tab = createBottomTabNavigator();

function App(): React.JSX.Element {
  const [appManager] = useState(() => AppManager.getInstance());
  const [appState, setAppState] = useState<AppState | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('🚀 Initialisation de l\'application IPTV Mobile...');
      
      // Subscribe to app state changes
      const unsubscribe = appManager.subscribe((state) => {
        setAppState(state);
        console.log('📱 App state updated:', {
          initialized: state.isInitialized,
          loading: state.isLoading,
          currentUser: state.currentUser?.name,
          error: state.error,
        });
      });

      // Initialize app manager
      await appManager.initialize();
      
      setIsInitializing(false);
      console.log('✅ Application IPTV Mobile initialisée avec succès');

      return () => {
        unsubscribe();
      };
    } catch (error) {
      console.error('❌ Erreur initialisation application:', error);
      setIsInitializing(false);
      Alert.alert(
        'Erreur d\'initialisation',
        'Impossible d\'initialiser l\'application. Veuillez redémarrer.',
        [{ text: 'OK' }]
      );
    }
  };

  // Loading screen
  if (isInitializing || !appState || appState.isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={styles.loadingContent}>
          <Text style={styles.loadingTitle}>📱 IPTV Mobile</Text>
          <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
          <Text style={styles.loadingText}>
            {isInitializing ? 'Initialisation...' : 'Chargement...'}
          </Text>
          <Text style={styles.loadingSubtext}>
            Configuration des modules avancés
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error screen
  if (appState.error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#ff0000" />
        <View style={styles.errorContent}>
          <Text style={styles.errorTitle}>❌ Erreur</Text>
          <Text style={styles.errorText}>{appState.error}</Text>
          <Text style={styles.errorSubtext}>
            Veuillez redémarrer l'application
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Main navigation
  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: '#8E8E93',
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#E5E5EA',
            paddingBottom: 5,
            paddingTop: 5,
            height: 60,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
          headerStyle: {
            backgroundColor: '#ffffff',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 3,
          },
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 18,
          },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: 'Accueil',
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 24, color }}>🏠</Text>
            ),
            headerTitle: '📱 IPTV Mobile',
          }}
        />
        <Tab.Screen
          name="Player"
          component={PlayerScreen}
          options={{
            title: 'Lecteur',
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 24, color }}>📺</Text>
            ),
            headerTitle: 'Lecteur Vidéo',
          }}
        />
        <Tab.Screen
          name="Playlists"
          component={PlaylistsScreen}
          options={{
            title: 'Playlists',
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 24, color }}>📋</Text>
            ),
            headerTitle: 'Mes Playlists',
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: 'Paramètres',
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 24, color }}>⚙️</Text>
            ),
            headerTitle: 'Paramètres',
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  // Loading styles
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
  },
  loader: {
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 10,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#cccccc',
    textAlign: 'center',
  },
  // Error styles
  errorContainer: {
    flex: 1,
    backgroundColor: '#ff0000',
  },
  errorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#ffcccc',
    textAlign: 'center',
  },
});

export default App;
  container: {
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  logContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    maxHeight: 300,
  },
  logText: {
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 16,
  },
});

export default App;