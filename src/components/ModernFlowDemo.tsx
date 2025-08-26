/**
 * 🚀 ModernFlowDemo - Démonstration du flux UI→Service→Store→UI
 * Composant exemple qui illustre parfaitement l'architecture moderne v3.0.0
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useModernPlaylistFlow } from '../hooks/useModernPlaylistFlow';

const ModernFlowDemo: React.FC = () => {
  const {
    // 🔄 Modern Flow Methods
    importPlaylistModern,
    selectCategoryModern,
    resetAllModern,
    
    // 📊 Reactive Data from Zustand Stores
    channels,
    categories,
    selectedCategory,
    selectedPlaylistId,
    
    // 📈 Flow Analytics
    getFlowStats,
    
    // 🎯 Status
    hasData,
    isReady,
  } = useModernPlaylistFlow();

  const [flowStats, setFlowStats] = useState<any>(null);

  // Update stats when data changes (reactive to store updates)
  useEffect(() => {
    setFlowStats(getFlowStats());
  }, [channels, categories, getFlowStats]);

  const testUrl = 'https://iptv-org.github.io/iptv/languages/fra.m3u';

  const handleImportTest = () => {
    console.log('🚀 DEMO - Starting modern flow test');
    importPlaylistModern(testUrl, 'Demo Playlist FR');
  };

  const handleCategoryTest = (categoryName: string) => {
    console.log('🚀 DEMO - Testing category selection:', categoryName);
    selectCategoryModern(categoryName);
  };

  const handleResetTest = () => {
    Alert.alert(
      'Reset Modern Flow',
      'Voulez-vous tester le reset complet du flux moderne ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => {
            console.log('🚀 DEMO - Testing modern reset');
            resetAllModern();
          }
        },
      ]
    );
  };

  const renderFlowStats = () => {
    if (!flowStats) return null;

    return (
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>📊 Architecture Moderne v3.0.0</Text>
        <Text style={styles.statsText}>Architecture: {flowStats.architecture}</Text>
        <Text style={styles.statsText}>Stores: {flowStats.stores.join(', ')}</Text>
        <Text style={styles.statsText}>Services: {flowStats.services.join(', ')}</Text>
        <Text style={styles.statsText}>Channels: {flowStats.totalChannels}</Text>
        <Text style={styles.statsText}>Categories: {flowStats.totalCategories}</Text>
        <Text style={styles.statsText}>Selected: {flowStats.currentCategory || 'Aucune'}</Text>
      </View>
    );
  };

  const renderCategories = () => {
    if (!categories.length) return null;

    return (
      <View style={styles.categoriesContainer}>
        <Text style={styles.sectionTitle}>🗂️ Catégories (Store → UI)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.name}
              style={[
                styles.categoryButton,
                selectedCategory === category.name && styles.selectedCategory
              ]}
              onPress={() => handleCategoryTest(category.name)}
            >
              <Text style={[
                styles.categoryText,
                selectedCategory === category.name && styles.selectedCategoryText
              ]}>
                {category.name} ({category.count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🚀 Modern Flow Demo</Text>
        <Text style={styles.subtitle}>UI → Service → Store → UI</Text>
      </View>

      {renderFlowStats()}

      {/* Test Controls */}
      <View style={styles.controlsContainer}>
        <Text style={styles.sectionTitle}>🎮 Tests du Flux Moderne</Text>
        
        <TouchableOpacity
          style={styles.button}
          onPress={handleImportTest}
        >
          <Text style={styles.buttonText}>
            📥 Test Import Playlist (UI→Service→Store→UI)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.resetButton]}
          onPress={handleResetTest}
        >
          <Text style={styles.buttonText}>
            🧹 Test Reset Complet (Modern Flow)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Reactive Categories Display */}
      {renderCategories()}

      {/* Data Status */}
      <View style={styles.statusContainer}>
        <Text style={styles.sectionTitle}>📈 État Réactif</Text>
        <Text style={styles.statusText}>
          Has Data: {hasData ? '✅' : '❌'}
        </Text>
        <Text style={styles.statusText}>
          Is Ready: {isReady ? '✅' : '❌'}
        </Text>
        <Text style={styles.statusText}>
          Channels Count: {channels.length}
        </Text>
        <Text style={styles.statusText}>
          Categories Count: {categories.length}
        </Text>
        {selectedPlaylistId && (
          <Text style={styles.statusText}>
            Playlist ID: {selectedPlaylistId}
          </Text>
        )}
      </View>

      {/* Channels Preview */}
      {channels.length > 0 && (
        <View style={styles.channelsContainer}>
          <Text style={styles.sectionTitle}>
            📺 Chaînes (Store Data - premiers 5)
          </Text>
          {channels.slice(0, 5).map((channel, index) => (
            <View key={channel.id || index} style={styles.channelItem}>
              <Text style={styles.channelName}>{channel.name}</Text>
              <Text style={styles.channelGroup}>{channel.group || channel.category || 'N/A'}</Text>
            </View>
          ))}
          {channels.length > 5 && (
            <Text style={styles.moreText}>
              ... et {channels.length - 5} autres chaînes
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  statsContainer: {
    margin: 20,
    padding: 15,
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10,
  },
  statsText: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 5,
  },
  controlsContainer: {
    margin: 20,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  resetButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  categoriesContainer: {
    margin: 20,
  },
  categoryButton: {
    backgroundColor: '#333',
    padding: 10,
    marginRight: 10,
    borderRadius: 6,
  },
  selectedCategory: {
    backgroundColor: '#2196F3',
  },
  categoryText: {
    color: '#fff',
    fontSize: 14,
  },
  selectedCategoryText: {
    fontWeight: 'bold',
  },
  statusContainer: {
    margin: 20,
    padding: 15,
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
  },
  statusText: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 5,
  },
  channelsContainer: {
    margin: 20,
    padding: 15,
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
  },
  channelItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  channelName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  channelGroup: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  moreText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
});

export default ModernFlowDemo;