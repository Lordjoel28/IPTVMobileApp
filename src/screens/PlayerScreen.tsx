import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  useColorScheme,
  Dimensions,
  BackHandler,
} from 'react-native';
import ChannelList from '../components/ChannelList';
import {Channel} from '../types';
import {usePlayerStore} from '../stores/PlayerStore';
import {useRecentChannelsStore} from '../stores/RecentChannelsStore';
import ProfileService from '../services/ProfileService';
import FavoritesService from '../services/FavoritesService';

const PlayerScreen: React.FC = () => {
  // 🎯 Utilisation du PlayerStore global (GlobalVideoPlayer)
  const playerStore = usePlayerStore();
  const {channel: currentChannel, isVisible, isFullscreen, isLoading, error} = playerStore;
  const {actions: playerActions} = playerStore;

  // 🕰️ Connexion au store des chaînes récentes
  const {setRecentChannels} = useRecentChannelsStore();

  // États locaux pour l'interface
  const [allChannels, setAllChannels] = useState<Channel[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showChannelList, setShowChannelList] = useState(true);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    console.log('🎬 [PlayerScreen] MOUNTED - Migration vers GlobalVideoPlayer');

    // 🎯 Indiquer au PlayerStore qu'on est en mode PlayerScreen (pas ChannelPlayerScreen)
    playerActions.setInChannelPlayerScreen(false);

    // Charger les données réelles
    loadRealData();
  }, []);

  // 🔄 Gestion du retour arrière
  useEffect(() => {
    const backHandler = () => {
      if (isFullscreen) {
        playerActions.setFullscreen(false);
        return true;
      }
      return false;
    };

    BackHandler.addEventListener('hardwareBackPress', backHandler);
    return () => BackHandler.removeEventListener('hardwareBackPress', backHandler);
  }, [isFullscreen, playerActions]);

  // 🔄 Charger les données réelles via les services
  const loadRealData = async () => {
    try {
      console.log('🔄 [PlayerScreen] Chargement des données réelles');

      // Charger le profil actif
      const activeProfile = await ProfileService.getActiveProfile();
      if (activeProfile) {
        setActiveProfileId(activeProfile.id);

        // Charger les favoris du profil
        const profileFavorites = await FavoritesService.getFavoritesByProfile(activeProfile.id);
        const favoriteChannelIds = profileFavorites.map(fav => fav.channelId);
        setFavorites(favoriteChannelIds);

        console.log(`⭐ [PlayerScreen] ${favoriteChannelIds.length} favoris chargés pour: ${activeProfile.name}`);
      }

      // TODO: Charger les vraies chaînes depuis les playlists
      // Pour l'instant, garder la logique de test existante
      const testChannel: Channel = {
        id: 'test-1',
        name: 'Test Channel',
        url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
        category: 'Test',
      };

      setAllChannels([testChannel]);

      // Démarrer la lecture avec GlobalVideoPlayer
      if (testChannel) {
        playerActions.playChannel(testChannel, false);
      }

    } catch (error) {
      console.error('❌ [PlayerScreen] Erreur chargement données:', error);
      Alert.alert('Erreur', 'Impossible de charger les données');
    }
  };

  // 🎯 Handler pour sélectionner une chaîne
  const handleChannelSelect = async (channel: Channel) => {
    try {
      console.log('▶️ [PlayerScreen] Lecture chaîne:', channel.name);

      // Utiliser PlayerStore pour lancer la lecture
      playerActions.playChannel(channel, false);

      // Ajouter aux chaînes récentes
      if (activeProfileId) {
        setRecentChannels([channel], activeProfileId);
      }

      setShowChannelList(false); // Cacher la liste après sélection

    } catch (error) {
      console.error('❌ [PlayerScreen] Erreur lecture chaîne:', error);
      Alert.alert('Erreur de lecture', 'Impossible de lire cette chaîne');
    }
  };

  // 🎯 Handler pour gérer les favoris
  const handleToggleFavorite = async (channelId: string) => {
    try {
      if (!activeProfileId) {
        Alert.alert('Erreur', 'Aucun profil actif');
        return;
      }

      const isFavorite = favorites.includes(channelId);

      if (isFavorite) {
        await FavoritesService.removeFavorite(channelId, activeProfileId);
        setFavorites(prev => prev.filter(id => id !== channelId));
        console.log('💔 [PlayerScreen] Favori retiré:', channelId);
      } else {
        await FavoritesService.addFavorite(channelId, activeProfileId);
        setFavorites(prev => [...prev, channelId]);
        console.log('❤️ [PlayerScreen] Favori ajouté:', channelId);
      }

    } catch (error) {
      console.error('❌ [PlayerScreen] Erreur favori:', error);
      Alert.alert('Erreur', 'Impossible de modifier les favoris');
    }
  };

  // 🎯 Handler pour les erreurs vidéo (gérées par GlobalVideoPlayer)
  const handleVideoError = (error: string) => {
    console.error('🚨 [PlayerScreen] Erreur vidéo:', error);
    Alert.alert('Erreur de lecture', error, [
      {text: 'OK', style: 'cancel'},
      {text: 'Changer de chaîne', onPress: () => setShowChannelList(true)},
    ]);
  };

  // 🎯 Handler pour le progress (optionnel)
  const handleVideoProgress = (data: any) => {
    // Progress géré par GlobalVideoPlayer
    // console.log('📊 [PlayerScreen] Progress:', data);
  };

  // 🎯 Handler pour le fullscreen (utilise PlayerStore)
  const handleFullscreenToggle = (fullscreen: boolean) => {
    playerActions.setFullscreen(fullscreen);
    if (fullscreen) {
      setShowChannelList(false); // Cacher la liste en fullscreen
    }
  };

  // 🎯 Toggle de la liste des chaînes
  const toggleChannelList = () => {
    if (!isFullscreen) {
      setShowChannelList(!showChannelList);
    }
  };

  // 🎯 Arrêter la lecture
  const stopPlayback = () => {
    playerActions.stop();
  };

  if (allChannels.length === 0) {
    return (
      <View
        style={[
          styles.emptyContainer,
          isDarkMode && styles.emptyContainerDark,
        ]}>
        <Text style={[styles.emptyTitle, isDarkMode && styles.emptyTitleDark]}>
          📋 Aucune playlist
        </Text>
        <Text style={[styles.emptyText, isDarkMode && styles.emptyTextDark]}>
          Ajoutez des playlists dans l'onglet "Playlists" pour commencer à
          regarder des chaînes.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* 🎯 Video Player Section - Utilise GlobalVideoPlayer (singleton) */}
      <View
        style={[
          styles.playerSection,
          showChannelList && styles.playerSectionCompact,
        ]}>
        {/* GlobalVideoPlayer est monté globalement dans App.tsx */}
        {/* Cette section contient les contrôles et l'info de la chaîne */}

        {/* Player Controls Overlay - Hidden in fullscreen */}
        {!isFullscreen && (
          <View style={styles.playerControls}>
            <TouchableOpacity
              style={[
                styles.controlButton,
                isDarkMode && styles.controlButtonDark,
              ]}
              onPress={toggleChannelList}>
              <Text style={styles.controlButtonText}>
                {showChannelList ? '📺' : '📋'}
              </Text>
            </TouchableOpacity>

            {/* Bouton Play/Pause */}
            <TouchableOpacity
              style={[
                styles.controlButton,
                isDarkMode && styles.controlButtonDark,
              ]}
              onPress={() => playerActions.togglePlayPause()}>
              <Text style={styles.controlButtonText}>
                {isLoading ? '🔄' : (isVisible && !playerStore.isPaused) ? '⏸️' : '▶️'}
              </Text>
            </TouchableOpacity>

            {/* Bouton Stop */}
            {currentChannel && (
              <TouchableOpacity
                style={[styles.controlButton, styles.stopButton]}
                onPress={stopPlayback}>
                <Text style={styles.controlButtonText}>⏹️</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Channel Info - Hidden in fullscreen */}
        {currentChannel && !showChannelList && !isFullscreen && (
          <View style={styles.channelInfoOverlay}>
            <Text style={styles.channelInfoName}>{currentChannel.name}</Text>
            {currentChannel.category && (
              <Text style={styles.channelInfoCategory}>
                {currentChannel.category}
              </Text>
            )}
          </View>
        )}

        {/* Message d'erreur si nécessaire */}
        {error && (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => currentChannel && playerActions.playChannel(currentChannel, false)}>
              <Text style={styles.retryButtonText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Channel List Section */}
      {showChannelList && (
        <View style={styles.channelSection}>
          <View style={styles.channelHeader}>
            <Text
              style={[
                styles.channelHeaderTitle,
                isDarkMode && styles.channelHeaderTitleDark,
              ]}>
              📺 Chaînes ({allChannels.length})
            </Text>
            <TouchableOpacity onPress={() => setShowChannelList(false)}>
              <Text style={styles.hideButton}>❌</Text>
            </TouchableOpacity>
          </View>

          <ChannelList
            channels={allChannels}
            onChannelSelect={handleChannelSelect}
            currentChannel={currentChannel}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
          />
        </View>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>🔄 Chargement...</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  containerDark: {
    backgroundColor: '#000',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f5f5f5',
  },
  emptyContainerDark: {
    backgroundColor: '#1a1a1a',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  emptyTitleDark: {
    color: '#fff',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  emptyTextDark: {
    color: '#999',
  },
  playerSection: {
    flex: 2,
    position: 'relative',
  },
  playerSectionCompact: {
    flex: 1,
  },
  playerControls: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'column',
    gap: 10,
  },
  controlButton: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonDark: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  controlButtonText: {
    fontSize: 20,
  },
  stopButton: {
    backgroundColor: 'rgba(255,0,0,0.7)',
  },
  channelInfoOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 15,
    borderRadius: 10,
  },
  channelInfoName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  channelInfoCategory: {
    color: '#ccc',
    fontSize: 14,
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  channelSection: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  channelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  channelHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  channelHeaderTitleDark: {
    color: '#fff',
  },
  hideButton: {
    fontSize: 20,
    padding: 5,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 20,
    borderRadius: 10,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default PlayerScreen;
