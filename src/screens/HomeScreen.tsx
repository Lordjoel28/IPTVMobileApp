import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  useColorScheme,
} from 'react-native';
import { AppManager } from '../modules/app/AppManager';
import { Channel, Playlist } from '../types';

const HomeScreen: React.FC = () => {
  const [appManager] = useState(() => AppManager.getInstance());
  const [stats, setStats] = useState<any>(null);
  const [recentChannels, setRecentChannels] = useState<Channel[]>([]);
  const [favoriteChannels, setFavoriteChannels] = useState<Channel[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      // Get app statistics
      const appStats = appManager.getStats();
      setStats(appStats);

      // Get recent channels
      const recent = await appManager.getStorageService().getRecentChannels();
      const recentChannelData = recent.slice(0, 5).map(r => 
        appManager.getPlaylistManager().getChannelById(r.channelId)
      ).filter(Boolean) as Channel[];
      setRecentChannels(recentChannelData);

      // Get favorite channels
      const favorites = await appManager.getFavoriteChannels();
      setFavoriteChannels(favorites.slice(0, 5));

    } catch (error) {
      console.error('❌ Erreur chargement données accueil:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHomeData();
    setRefreshing(false);
  };

  const playChannel = async (channel: Channel) => {
    try {
      await appManager.playChannel(channel);
      Alert.alert('▶️ Lecture', `Lecture de ${channel.name}`);
    } catch (error) {
      Alert.alert('❌ Erreur', 'Impossible de lire cette chaîne');
    }
  };

  const toggleFavorite = async (channelId: string) => {
    try {
      await appManager.toggleFavorite(channelId);
      await loadHomeData(); // Refresh data
    } catch (error) {
      Alert.alert('❌ Erreur', 'Impossible de modifier les favoris');
    }
  };

  const renderChannelCard = (channel: Channel, showFavorite = true) => (
    <TouchableOpacity
      key={channel.id}
      style={[styles.channelCard, isDarkMode && styles.channelCardDark]}
      onPress={() => playChannel(channel)}
    >
      <View style={styles.channelHeader}>
        <Text 
          style={[styles.channelName, isDarkMode && styles.channelNameDark]}
          numberOfLines={1}
        >
          {channel.name}
        </Text>
        {showFavorite && (
          <TouchableOpacity onPress={() => toggleFavorite(channel.id)}>
            <Text style={styles.favoriteIcon}>
              {appManager.isFavorite(channel.id) ? '❤️' : '🤍'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {channel.category && (
        <Text style={[styles.channelCategory, isDarkMode && styles.channelCategoryDark]}>
          {channel.category}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView 
      style={[styles.container, isDarkMode && styles.containerDark]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Welcome Section */}
      <View style={[styles.welcomeSection, isDarkMode && styles.welcomeSectionDark]}>
        <Text style={[styles.welcomeTitle, isDarkMode && styles.welcomeTitleDark]}>
          Bienvenue dans IPTV Mobile! 👋
        </Text>
        <Text style={[styles.welcomeSubtitle, isDarkMode && styles.welcomeSubtitleDark]}>
          Application modulaire haute performance
        </Text>
      </View>

      {/* Statistics */}
      {stats && (
        <View style={[styles.statsSection, isDarkMode && styles.statsSectionDark]}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
            📊 Statistiques
          </Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, isDarkMode && styles.statCardDark]}>
              <Text style={[styles.statNumber, isDarkMode && styles.statNumberDark]}>
                {stats.playlist.totalPlaylists}
              </Text>
              <Text style={[styles.statLabel, isDarkMode && styles.statLabelDark]}>
                Playlists
              </Text>
            </View>
            <View style={[styles.statCard, isDarkMode && styles.statCardDark]}>
              <Text style={[styles.statNumber, isDarkMode && styles.statNumberDark]}>
                {stats.playlist.totalChannels}
              </Text>
              <Text style={[styles.statLabel, isDarkMode && styles.statLabelDark]}>
                Chaînes
              </Text>
            </View>
            <View style={[styles.statCard, isDarkMode && styles.statCardDark]}>
              <Text style={[styles.statNumber, isDarkMode && styles.statNumberDark]}>
                {stats.app.favoritesCount}
              </Text>
              <Text style={[styles.statLabel, isDarkMode && styles.statLabelDark]}>
                Favoris
              </Text>
            </View>
            <View style={[styles.statCard, isDarkMode && styles.statCardDark]}>
              <Text style={[styles.statNumber, isDarkMode && styles.statNumberDark]}>
                {stats.playlist.totalCategories}
              </Text>
              <Text style={[styles.statLabel, isDarkMode && styles.statLabelDark]}>
                Catégories
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Recent Channels */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
          🕒 Récemment regardées
        </Text>
        {recentChannels.length > 0 ? (
          <View style={styles.channelsList}>
            {recentChannels.map(channel => renderChannelCard(channel))}
          </View>
        ) : (
          <View style={[styles.emptyCard, isDarkMode && styles.emptyCardDark]}>
            <Text style={[styles.emptyText, isDarkMode && styles.emptyTextDark]}>
              Aucune chaîne récente
            </Text>
            <Text style={[styles.emptySubtext, isDarkMode && styles.emptySubtextDark]}>
              Commencez à regarder des chaînes pour les voir ici
            </Text>
          </View>
        )}
      </View>

      {/* Favorite Channels */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
          ❤️ Mes favoris
        </Text>
        {favoriteChannels.length > 0 ? (
          <View style={styles.channelsList}>
            {favoriteChannels.map(channel => renderChannelCard(channel, false))}
          </View>
        ) : (
          <View style={[styles.emptyCard, isDarkMode && styles.emptyCardDark]}>
            <Text style={[styles.emptyText, isDarkMode && styles.emptyTextDark]}>
              Aucun favori
            </Text>
            <Text style={[styles.emptySubtext, isDarkMode && styles.emptySubtextDark]}>
              Ajoutez des chaînes à vos favoris pour les voir ici
            </Text>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
          ⚡ Actions rapides
        </Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={[styles.actionCard, isDarkMode && styles.actionCardDark]}
            onPress={() => Alert.alert('🔍 Recherche', 'Fonctionnalité bientôt disponible')}
          >
            <Text style={styles.actionIcon}>🔍</Text>
            <Text style={[styles.actionText, isDarkMode && styles.actionTextDark]}>
              Rechercher
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionCard, isDarkMode && styles.actionCardDark]}
            onPress={() => Alert.alert('📋 Playlists', 'Consultez l\'onglet Playlists')}
          >
            <Text style={styles.actionIcon}>📋</Text>
            <Text style={[styles.actionText, isDarkMode && styles.actionTextDark]}>
              Playlists
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionCard, isDarkMode && styles.actionCardDark]}
            onPress={() => Alert.alert('⚙️ Paramètres', 'Consultez l\'onglet Paramètres')}
          >
            <Text style={styles.actionIcon}>⚙️</Text>
            <Text style={[styles.actionText, isDarkMode && styles.actionTextDark]}>
              Paramètres
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionCard, isDarkMode && styles.actionCardDark]}
            onPress={() => Alert.alert('📊 Stats', JSON.stringify(stats, null, 2))}
          >
            <Text style={styles.actionIcon}>📊</Text>
            <Text style={[styles.actionText, isDarkMode && styles.actionTextDark]}>
              Statistiques
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
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
  welcomeSection: {
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  welcomeSectionDark: {
    backgroundColor: '#2a2a2a',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  welcomeTitleDark: {
    color: '#fff',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  welcomeSubtitleDark: {
    color: '#999',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  sectionTitleDark: {
    color: '#fff',
  },
  statsSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 10,
  },
  statsSectionDark: {
    backgroundColor: '#2a2a2a',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 2,
  },
  statCardDark: {
    backgroundColor: '#333',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statNumberDark: {
    color: '#0A84FF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  statLabelDark: {
    color: '#999',
  },
  channelsList: {
    paddingHorizontal: 20,
  },
  channelCard: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 8,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  channelCardDark: {
    backgroundColor: '#2a2a2a',
  },
  channelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  channelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  channelNameDark: {
    color: '#fff',
  },
  channelCategory: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  channelCategoryDark: {
    color: '#999',
  },
  favoriteIcon: {
    fontSize: 20,
    marginLeft: 10,
  },
  emptyCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  emptyCardDark: {
    backgroundColor: '#2a2a2a',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  emptyTextDark: {
    color: '#999',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  emptySubtextDark: {
    color: '#666',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
  },
  actionCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    width: '48%',
    marginBottom: 10,
    marginRight: '2%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  actionCardDark: {
    backgroundColor: '#2a2a2a',
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  actionTextDark: {
    color: '#fff',
  },
});

export default HomeScreen;