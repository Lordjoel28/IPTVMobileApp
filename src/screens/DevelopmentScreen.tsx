/**
 * 🛠️ Development Screen - Tests et outils de développement
 * Contient XtreamOptimizedTest et autres outils de dev
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import XtreamOptimizedTest from '../components/XtreamOptimizedTest';

const DevelopmentScreen: React.FC = () => {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <Text style={[styles.header, isDarkMode && styles.headerDark]}>
        🛠️ Development Tools
      </Text>
      
      <XtreamOptimizedTest />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  containerDark: {
    backgroundColor: '#1a1a1a',
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerDark: {
    color: '#fff',
    backgroundColor: '#2a2a2a',
    borderBottomColor: '#444',
  },
});

export default DevelopmentScreen;