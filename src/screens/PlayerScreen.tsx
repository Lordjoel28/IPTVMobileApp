import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  useColorScheme,
  Dimensions,
} from 'react-native';
import VideoPlayerModern from '../components/VideoPlayerModern';
import ChannelList from '../components/ChannelList';
// AppManager removed - will be replaced by DI services
import { Channel } from '../types';

const PlayerScreen: React.FC = () => {
  // AppManager removed - state will be managed by Zustand stores
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [allChannels, setAllChannels] = useState<Channel[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showChannelList, setShowChannelList] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isInFullscreen, setIsInFullscreen] = useState(false);
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    // TODO: Replace with DI services + Zustand stores
    console.log('PlayerScreen - AppManager removed, ready for DI migration');
    
    // Temporary test channel for development
    const testChannel: Channel = {
      id: 'test-1',
      name: 'Test Channel',
      url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
      category: 'Test',
    };
    setCurrentChannel(testChannel);
    setAllChannels([testChannel]);
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // TODO: Replace with DI services + Zustand stores
      // Get all channels from playlists
      // const channels = appManager.getPlaylistManager().getAllChannels();
      // setAllChannels(channels);
      
      // Get favorites
      // const favs = appManager.getState().favorites;
      // setFavorites(favs);
      
      // Get current channel from app state
      // const currentCh = appManager.getState().currentChannel;
      // setCurrentChannel(currentCh);
      
    } catch (error) {
      console.error('❌ Erreur chargement données player:', error);
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChannelSelect = async (channel: Channel) => {
    try {
      setIsLoading(true);
      // await appManager.playChannel(channel); // TODO: Replace with service
      setCurrentChannel(channel);
      console.log('▶️ Lecture démarrée:', channel.name);
    } catch (error) {
      console.error('❌ Erreur lecture chaîne:', error);
      Alert.alert('Erreur de lecture', 'Impossible de lire cette chaîne');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFavorite = async (channelId: string) => {
    try {
      // await appManager.toggleFavorite(channelId); // TODO: Replace with service
      console.log('Toggle favorite for channel:', channelId);
    } catch (error) {
      console.error('❌ Erreur favori:', error);
      Alert.alert('Erreur', 'Impossible de modifier les favoris');
    }
  };

  const handleVideoError = (error: string) => {
    console.error('🚨 Erreur vidéo:', error);
    Alert.alert(
      'Erreur de lecture',
      error,
      [
        { text: 'OK', style: 'cancel' },
        { text: 'Changer de chaîne', onPress: () => setShowChannelList(true) },
      ]
    );
  };

  const handleVideoProgress = (data: any) => {
    // Handle video progress if needed
    // console.log('📊 Progress:', data);
  };

  const handleFullscreenToggle = (isFullscreen: boolean) => {
    setIsInFullscreen(isFullscreen);
    if (isFullscreen) {
      setShowChannelList(false); // Hide channel list in fullscreen
    }
  };

  const toggleChannelList = () => {
    if (!isInFullscreen) {
      setShowChannelList(!showChannelList);
    }
  };

  const stopPlayback = () => {
    // appManager.stopChannel(); // Commented out for now
    setCurrentChannel(null);
  };

  if (allChannels.length === 0) {
    return (
      <View style={[styles.emptyContainer, isDarkMode && styles.emptyContainerDark]}>
        <Text style={[styles.emptyTitle, isDarkMode && styles.emptyTitleDark]}>
          📋 Aucune playlist
        </Text>
        <Text style={[styles.emptyText, isDarkMode && styles.emptyTextDark]}>
          Ajoutez des playlists dans l'onglet "Playlists" pour commencer à regarder des chaînes.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* Video Player Section */}
      <View style={[styles.playerSection, showChannelList && styles.playerSectionCompact]}>
        <VideoPlayerModern
          channel={currentChannel}
          isVisible={true}
          onError={handleVideoError}
          onProgress={handleVideoProgress}
          onFullscreenToggle={handleFullscreenToggle}
        />
        
        {/* Player Controls Overlay - Hidden in fullscreen */}
        {!isInFullscreen && (
          <View style={styles.playerControls}>
          <TouchableOpacity
            style={[styles.controlButton, isDarkMode && styles.controlButtonDark]}
            onPress={toggleChannelList}
          >
            <Text style={styles.controlButtonText}>
              {showChannelList ? '📺' : '📋'}
            </Text>
          </TouchableOpacity>
          
          {currentChannel && (
            <TouchableOpacity
              style={[styles.controlButton, styles.stopButton]}
              onPress={stopPlayback}
            >
              <Text style={styles.controlButtonText}>⏹️</Text>
            </TouchableOpacity>
          )}
          </View>
        )}

        {/* Channel Info - Hidden in fullscreen */}
        {currentChannel && !showChannelList && !isInFullscreen && (
          <View style={styles.channelInfoOverlay}>
            <Text style={styles.channelInfoName}>{currentChannel.name}</Text>
            {currentChannel.category && (
              <Text style={styles.channelInfoCategory}>{currentChannel.category}</Text>
            )}
          </View>
        )}
      </View>

      {/* Channel List Section */}
      {showChannelList && (
        <View style={styles.channelSection}>
          <View style={styles.channelHeader}>
            <Text style={[styles.channelHeaderTitle, isDarkMode && styles.channelHeaderTitleDark]}>
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