/**
 * 📺 Channel List Screen - Affichage des chaînes importées
 * Navigation après import M3U réussi
 */

import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {VirtualizedChannelList} from '../components/VirtualizedChannelList';
import type {Channel} from '../types';

interface ChannelListScreenProps {
  route?: {
    params?: {
      playlistId?: string;
      playlistName?: string;
      channels?: Channel[];
      totalChannels?: number;
    };
  };
  navigation?: any;
}

const ChannelListScreen: React.FC<ChannelListScreenProps> = ({
  route,
  navigation,
}) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const playlistName = route?.params?.playlistName || 'Playlist IPTV';

  const loadChannels = useCallback(async () => {
    try {
      setLoading(true);

      // Récupérer les chaînes depuis les paramètres ou IPTVService
      const channelsFromParams = route?.params?.channels;

      if (channelsFromParams && channelsFromParams.length > 0) {
        setChannels(channelsFromParams);
        console.log(
          `📺 Chaînes chargées depuis params: ${channelsFromParams.length}`,
        );
      } else {
        // TODO: Récupérer depuis IPTVService si pas de paramètres
        console.log('⚠️ Aucune chaîne dans les paramètres');
        setChannels([]);
      }
    } catch (error) {
      console.error('❌ Erreur chargement chaînes:', error);
      Alert.alert('Erreur', 'Impossible de charger les chaînes');
    } finally {
      setLoading(false);
    }
  }, [route?.params?.channels]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  const handleChannelPress = (channel: Channel) => {
    console.log('🎬 Ouverture chaîne:', channel.name);
    setCurrentChannel(channel);

    // TODO: Navigation vers VideoPlayer
    Alert.alert(
      '📺 Chaîne sélectionnée',
      `Nom: ${channel.name}\nURL: ${channel.url}\nCatégorie: ${
        channel.category || 'N/A'
      }`,
    );
  };

  const handleToggleFavorite = (channelId: string) => {
    setFavorites(prev => {
      const isCurrentlyFavorite = prev.includes(channelId);
      if (isCurrentlyFavorite) {
        return prev.filter(id => id !== channelId);
      } else {
        return [...prev, channelId];
      }
    });
    console.log(`⭐ Favoris toggled pour channel ${channelId}`);
  };

  const handleBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    } else {
      console.log('🔙 Retour navigation');
    }
  };

  // Fonctions de recherche
  const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (showSearch) {
      setSearchQuery('');
    }
  };

  // Filtrer les chaînes selon la recherche
  const getFilteredChannels = () => {
    if (!searchQuery.trim()) {
      return channels;
    }

    return channels.filter(
      channel =>
        channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (channel.group &&
          channel.group.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (channel.category &&
          channel.category.toLowerCase().includes(searchQuery.toLowerCase())),
    );
  };

  // Render functions moved to VirtualizedChannelList component

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#4A90E2" />
      <Text style={styles.loadingText}>Chargement des chaînes...</Text>
    </View>
  );

  if (loading) {
    return (
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />
        {renderLoadingState()}
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          {showSearch ? (
            // Mode Recherche: Texte de recherche à la place du titre
            <Text style={styles.headerTitle} numberOfLines={1}>
              {searchQuery || 'Rechercher...'}
            </Text>
          ) : (
            // Mode Normal: Titre + Sous-titre comme avant
            <>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {playlistName}
              </Text>
              <Text style={styles.headerSubtitle}>
                {getFilteredChannels().length} chaîne
                {getFilteredChannels().length > 1 ? 's' : ''} disponible
                {getFilteredChannels().length > 1 ? 's' : ''}
              </Text>
            </>
          )}
        </View>

      {/* TextInput invisible pour capturer la saisie */}
      {showSearch && (
        <TextInput
          style={styles.invisibleTextInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus={true}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
      )}

        <TouchableOpacity style={styles.searchButton} onPress={toggleSearch}>
          <Icon
            name={showSearch ? 'close' : 'search'}
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>

      {/* 🚀 ULTRA-OPTIMIZED CHANNEL LIST - 100K+ Channels Support */}
      <View style={styles.channelListContainer}>
        <VirtualizedChannelList
          channels={getFilteredChannels()}
          onChannelSelect={handleChannelPress}
          currentChannel={currentChannel}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
        />
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  searchButton: {
    padding: 8,
  },
  channelListContainer: {
    flex: 1,
  },
  channelListContent: {
    paddingVertical: 8,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    height: 80,
  },
  channelIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  channelInfo: {
    flex: 1,
  },
  channelName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  channelMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelCategory: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    flex: 1,
  },
  qualityBadge: {
    backgroundColor: 'rgba(74, 144, 226, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  qualityText: {
    fontSize: 10,
    color: '#4A90E2',
    fontWeight: '600',
  },
  favoriteButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: 'rgba(74, 144, 226, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  retryButtonText: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '600',
  },
  // TextInput invisible pour capturer la saisie
  invisibleTextInput: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    opacity: 0,
    width: 1,
    height: 1,
  },
});

export default ChannelListScreen;
