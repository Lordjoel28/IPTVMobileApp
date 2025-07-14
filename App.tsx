/**
 * 📱 LECTEUR IPTV MOBILE - Version avec Dépendances
 * Toutes les dépendances IPTV installées et configurées
 */

import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const theme = isDarkMode ? MD3DarkTheme : MD3LightTheme;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          <SafeAreaView style={styles.container}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
            <ScrollView contentInsetAdjustmentBehavior="automatic" style={styles.scrollView}>
              <View style={styles.content}>
                <Text style={[styles.title, {color: isDarkMode ? '#fff' : '#000'}]}>
                  📱 LECTEUR IPTV MOBILE
                </Text>
                <Text style={[styles.subtitle, {color: isDarkMode ? '#ccc' : '#666'}]}>
                  ✅ Toutes les Dépendances Installées
                </Text>
                <View style={styles.dependenciesContainer}>
                  <Text style={[styles.dependencyItem, {color: isDarkMode ? '#4CAF50' : '#2E7D32'}]}>
                    ✅ react-native-video (Lecteur)
                  </Text>
                  <Text style={[styles.dependencyItem, {color: isDarkMode ? '#4CAF50' : '#2E7D32'}]}>
                    ✅ React Navigation (Navigation)
                  </Text>
                  <Text style={[styles.dependencyItem, {color: isDarkMode ? '#4CAF50' : '#2E7D32'}]}>
                    ✅ React Native Paper (UI)
                  </Text>
                  <Text style={[styles.dependencyItem, {color: isDarkMode ? '#4CAF50' : '#2E7D32'}]}>
                    ✅ AsyncStorage (Stockage)
                  </Text>
                  <Text style={[styles.dependencyItem, {color: isDarkMode ? '#4CAF50' : '#2E7D32'}]}>
                    ✅ FlashList (Performance)
                  </Text>
                  <Text style={[styles.dependencyItem, {color: isDarkMode ? '#4CAF50' : '#2E7D32'}]}>
                    ✅ Orientation Locker
                  </Text>
                  <Text style={[styles.dependencyItem, {color: isDarkMode ? '#4CAF50' : '#2E7D32'}]}>
                    ✅ NetInfo (Réseau)
                  </Text>
                </View>
                <Text style={[styles.description, {color: isDarkMode ? '#999' : '#555'}]}>
                  🚀 Prêt pour construction IPTV avancée !{'\n'}
                  En attente de la prochaine instruction...
                </Text>
              </View>
            </ScrollView>
          </SafeAreaView>
        </NavigationContainer>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 400,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 25,
    textAlign: 'center',
    fontWeight: '600',
  },
  dependenciesContainer: {
    width: '100%',
    marginBottom: 25,
  },
  dependencyItem: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },
});

export default App;