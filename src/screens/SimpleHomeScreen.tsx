/**
 * 🏠 HomeScreen Simple - Navigation intégrée style IPTV
 * Pattern inspiré des vraies apps IPTV (navigation dans l'écran)
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import type {RootStackParamList} from '../types';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface MenuItem {
  id: string;
  title: string;
  icon: string;
  color: string;
  description: string;
  screen: keyof RootStackParamList;
}

const SimpleHomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  // Menu principal - Style IPTV moderne
  const menuItems: MenuItem[] = [
    {
      id: 'playlists',
      title: 'Mes Playlists',
      icon: 'playlist-play',
      color: '#4FACFE',
      description: 'Gérer vos playlists M3U et Xtream',
      screen: 'Playlists',
    },
    {
      id: 'favorites',
      title: 'Favoris',
      icon: 'favorite',
      color: '#FF4444',
      description: 'Vos chaînes préférées',
      screen: 'Favorites',
    },
    {
      id: 'search',
      title: 'Recherche',
      icon: 'search',
      color: '#00C851',
      description: 'Rechercher des chaînes',
      screen: 'Search',
    },
    {
      id: 'settings',
      title: 'Paramètres',
      icon: 'settings',
      color: '#FF8800',
      description: "Configuration de l'app",
      screen: 'Settings',
    },
  ];

  const handleMenuPress = (item: MenuItem) => {
    setSelectedItem(item.id);
    setTimeout(() => {
      navigation.navigate(item.screen);
      setSelectedItem(null);
    }, 150);
  };

  const renderMenuItem = (item: MenuItem) => {
    const isSelected = selectedItem === item.id;

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.menuItem, isSelected && styles.menuItemSelected]}
        onPress={() => handleMenuPress(item)}
        activeOpacity={0.8}>
        <View
          style={[styles.iconContainer, {backgroundColor: item.color + '20'}]}>
          <Icon name={item.icon} size={32} color={item.color} />
        </View>

        <View style={styles.menuTextContainer}>
          <Text style={styles.menuTitle}>{item.title}</Text>
          <Text style={styles.menuDescription}>{item.description}</Text>
        </View>

        <Icon name="chevron-right" size={24} color="rgba(255, 255, 255, 0.5)" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#000000"
        translucent
      />

      {/* Header avec gradient */}
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerContent}>
            <View style={styles.appInfo}>
              <Text style={styles.appTitle}>📱 IPTV Mobile</Text>
              <Text style={styles.appSubtitle}>Lecteur IPTV Professionnel</Text>
            </View>

            <TouchableOpacity style={styles.headerButton}>
              <Icon name="notifications" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Contenu principal */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>
        {/* Section statistiques rapides */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Vue d'ensemble</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Icon name="playlist-play" size={24} color="#4FACFE" />
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Playlists</Text>
            </View>

            <View style={styles.statCard}>
              <Icon name="tv" size={24} color="#00C851" />
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Chaînes</Text>
            </View>

            <View style={styles.statCard}>
              <Icon name="favorite" size={24} color="#FF4444" />
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Favoris</Text>
            </View>
          </View>
        </View>

        {/* Menu principal */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Navigation</Text>

          <View style={styles.menuGrid}>{menuItems.map(renderMenuItem)}</View>
        </View>

        {/* Section récents (placeholder) */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Récemment regardé</Text>

          <View style={styles.emptyState}>
            <Icon name="tv-off" size={48} color="rgba(255, 255, 255, 0.3)" />
            <Text style={styles.emptyText}>Aucune chaîne récente</Text>
            <Text style={styles.emptySubtext}>
              Ajoutez une playlist pour commencer
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  appInfo: {
    flex: 1,
  },
  appTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  appSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  headerButton: {
    padding: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsSection: {
    marginBottom: 32,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statNumber: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  menuSection: {
    marginBottom: 32,
  },
  menuGrid: {
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuItemSelected: {
    backgroundColor: '#2A2A2A',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    transform: [{scale: 0.98}],
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  menuDescription: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
  recentSection: {
    marginBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtext: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default SimpleHomeScreen;
