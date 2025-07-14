/**
 * 🏠 IPTV Mobile App - Écran d'Accueil
 * Écran principal avec chaînes récentes, favoris et accès rapide
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {
  Surface,
  Text,
  Card,
  Button,
  Chip,
  useTheme,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Types
import type { HomeScreenNavigationProp } from '../types';
import type { Channel, Playlist, RecentChannel } from '../types';

// Components (à créer)
import ChannelCard from '../components/ChannelCard';
import QuickActions from '../components/QuickActions';

interface Props {
  navigation: HomeScreenNavigationProp;
}

const { width } = Dimensions.get('window');

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [recentChannels, setRecentChannels] = useState<Channel[]>([]);
  const [favoriteChannels, setFavoriteChannels] = useState<Channel[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [stats, setStats] = useState({
    totalChannels: 0,
    totalPlaylists: 0,
    favoriteCount: 0,
  });

  // Simulation de chargement des données
  useEffect(() => {
    const loadHomeData = async () => {
      try {
        setLoading(true);
        
        // Simulation de chargement
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Données de démonstration
        const mockRecentChannels: Channel[] = [
          {
            id: '1',
            name: 'TF1 HD',
            url: 'https://example.com/tf1',
            logo: 'https://via.placeholder.com/80x80?text=TF1',
            category: 'Généraliste',
            quality: 'HD',
          },
          {
            id: '2',
            name: 'France 2 HD',
            url: 'https://example.com/france2',
            logo: 'https://via.placeholder.com/80x80?text=F2',
            category: 'Généraliste',
            quality: 'HD',
          },
          {
            id: '3',
            name: 'Canal+ Sport',
            url: 'https://example.com/canalplus',
            logo: 'https://via.placeholder.com/80x80?text=C+',
            category: 'Sport',
            quality: 'FHD',
          },
        ];
        
        const mockPlaylists: Playlist[] = [
          {
            id: '1',
            name: 'Playlist Française',
            channels: mockRecentChannels,
            isLocal: false,
            dateAdded: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            totalChannels: 150,
            type: 'M3U',
          },
        ];
        
        setRecentChannels(mockRecentChannels);
        setFavoriteChannels(mockRecentChannels.slice(0, 2));
        setPlaylists(mockPlaylists);
        setStats({
          totalChannels: 150,
          totalPlaylists: 1,
          favoriteCount: 2,
        });
        
      } catch (error) {
        console.error('Erreur chargement données accueil:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadHomeData();
  }, []);

  const handleChannelPress = (channel: Channel) => {
    navigation.navigate('Player', { channel });
  };

  const handlePlaylistPress = (playlist: Playlist) => {
    navigation.navigate('PlaylistDetail', { playlist });
  };

  const renderChannelItem = ({ item }: { item: Channel }) => (
    <ChannelCard
      channel={item}
      onPress={handleChannelPress}
      style={styles.channelCard}
    />
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.onBackground }]}>
            Chargement...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        
        {/* En-tête avec statistiques */}
        <Surface style={[styles.headerCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
          <Text variant="headlineSmall" style={[styles.welcomeText, { color: theme.colors.onSurface }]}>
            Bienvenue dans IPTV Mobile
          </Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text variant="titleLarge" style={{ color: theme.colors.primary }}>
                {stats.totalChannels}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Chaînes
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="titleLarge" style={{ color: theme.colors.secondary }}>
                {stats.totalPlaylists}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Playlists
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="titleLarge" style={{ color: theme.colors.tertiary }}>
                {stats.favoriteCount}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Favoris
              </Text>
            </View>
          </View>
        </Surface>

        {/* Actions rapides */}
        <QuickActions navigation={navigation} />

        {/* Chaînes récentes */}
        {recentChannels.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text variant="titleLarge" style={{ color: theme.colors.onBackground }}>
                Récemment regardées
              </Text>
              <Chip icon="history" compact>
                {recentChannels.length}
              </Chip>
            </View>
            <FlashList
              data={recentChannels}
              renderItem={renderChannelItem}
              horizontal
              showsHorizontalScrollIndicator={false}
              estimatedItemSize={160}
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
              contentContainerStyle={styles.horizontalList}
            />
          </View>
        )}

        {/* Chaînes favorites */}
        {favoriteChannels.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text variant="titleLarge" style={{ color: theme.colors.onBackground }}>
                Favoris
              </Text>
              <Chip icon="favorite" compact>
                {favoriteChannels.length}
              </Chip>
            </View>
            <FlashList
              data={favoriteChannels}
              renderItem={renderChannelItem}
              horizontal
              showsHorizontalScrollIndicator={false}
              estimatedItemSize={160}
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
              contentContainerStyle={styles.horizontalList}
            />
          </View>
        )}

        {/* Playlists */}
        {playlists.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text variant="titleLarge" style={{ color: theme.colors.onBackground }}>
                Mes Playlists
              </Text>
              <Button
                mode="text"
                compact
                onPress={() => navigation.navigate('PlaylistsTab' as any)}
              >
                Voir tout
              </Button>
            </View>
            {playlists.map((playlist) => (
              <Card
                key={playlist.id}
                style={styles.playlistCard}
                onPress={() => handlePlaylistPress(playlist)}
              >
                <Card.Content>
                  <View style={styles.playlistHeader}>
                    <View style={styles.playlistInfo}>
                      <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                        {playlist.name}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {playlist.totalChannels} chaînes • {playlist.type}
                      </Text>
                    </View>
                    <Icon
                      name="playlist-play"
                      size={32}
                      color={theme.colors.primary}
                    />
                  </View>
                </Card.Content>
              </Card>
            ))}
          </View>
        )}

        {/* Espacement en bas */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  headerCard: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  welcomeText: {
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  section: {
    marginVertical: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  horizontalList: {
    paddingHorizontal: 16,
  },
  channelCard: {
    width: 140,
  },
  playlistCard: {
    marginHorizontal: 16,
    marginVertical: 4,
  },
  playlistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playlistInfo: {
    flex: 1,
  },
});

export default HomeScreen;