import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native';

interface PlaylistItem {
  id: string;
  name: string;
  channelsCount: number;
  dateAdded: string;
  source: string; // 'url' ou 'file'
}

const PlaylistManagerScreen = () => {
  const navigation = useNavigation();
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistItem | null>(
    null,
  );
  const [newName, setNewName] = useState('');

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      console.log('🗂️ Chargement des playlists sauvegardées...');
      const keys = await AsyncStorage.getAllKeys();
      const playlistKeys = keys.filter(key => key.startsWith('playlist_'));

      const playlistsData: PlaylistItem[] = [];

      for (const key of playlistKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const playlist = JSON.parse(data);
            playlistsData.push({
              id: key.replace('playlist_', ''),
              name: playlist.name || 'Playlist sans nom',
              channelsCount: playlist.channels?.length || 0,
              dateAdded: playlist.dateAdded || new Date().toISOString(),
              source: playlist.source || 'unknown',
            });
          }
        } catch (error) {
          console.warn(`Erreur lecture playlist ${key}:`, error);
        }
      }

      // Trier par date d'ajout (plus récent en premier)
      playlistsData.sort(
        (a, b) =>
          new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime(),

      setPlaylists(playlistsData);
      console.log(`📋 ${playlistsData.length} playlists chargées`);
    } catch (error) {
      console.error('Erreur chargement playlists:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPlaylists();
  };

  const openPlaylist = async (playlistItem: PlaylistItem) => {
    try {
      console.log(`🎬 Ouverture playlist: ${playlistItem.name}`);
      const data = await AsyncStorage.getItem(`playlist_${playlistItem.id}`);
      if (data) {
        const playlist = JSON.parse(data);

        navigation.navigate('ChannelList', {
          playlistId: playlistItem.id,
          playlistName: playlistItem.name,
          channels: playlist.channels || [],
          totalChannels: playlist.channels?.length || 0,
        });
      }
    } catch (error) {
      console.error('Erreur ouverture playlist:', error);
      Alert.alert('Erreur', "Impossible d'ouvrir cette playlist");
    }
  };

  const deletePlaylist = (playlistItem: PlaylistItem) => {
    Alert.alert(
      'Supprimer playlist',
      `Êtes-vous sûr de vouloir supprimer "${playlistItem.name}" ?`,
      [
        {text: 'Annuler', style: 'cancel'},
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(`playlist_${playlistItem.id}`);
              loadPlaylists();
              console.log(`🗑️ Playlist supprimée: ${playlistItem.name}`);
            } catch (error) {
              console.error('Erreur suppression:', error);
              Alert.alert('Erreur', 'Impossible de supprimer la playlist');
            }
          },
        }
      ],
    );
  };

  const startRename = (playlistItem: PlaylistItem) => {
    setSelectedPlaylist(playlistItem);
    setNewName(playlistItem.name);
    setRenameModalVisible(true);
  };

  const confirmRename = async () => {
    if (!selectedPlaylist || !newName.trim()) {return;}

    try {
      const data = await AsyncStorage.getItem(
        `playlist_${selectedPlaylist.id}`,
      );
      if (data) {
        const playlist = JSON.parse(data);
        playlist.name = newName.trim();
        await AsyncStorage.setItem(
          `playlist_${selectedPlaylist.id}`,
          JSON.stringify(playlist),

        setRenameModalVisible(false);
        setSelectedPlaylist(null);
        setNewName('');
        loadPlaylists();

        console.log(
          `✏️ Playlist renommée: ${selectedPlaylist.name} → ${newName.trim()}`,
        );
      }
    } catch (error) {
      console.error('Erreur renommage:', error);
      Alert.alert('Erreur', 'Impossible de renommer la playlist');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('fr-FR');
    } catch {
      return 'Date inconnue';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'url':
        return '🌐';
      case 'file':
        return '📁';
      default:
        return '📺';
    }
  };

  const renderPlaylistItem = ({item}: {item: PlaylistItem}) => (
    <TouchableOpacity
      style={styles.playlistCard}
      onPress={() => openPlaylist(item)}
      activeOpacity={0.8}>
      <View style={styles.playlistHeader}>
        <View style={styles.playlistInfo}>
          <Text style={styles.playlistName}>{item.name}</Text>
          <Text style={styles.playlistDetails}>
            {getSourceIcon(item.source)} {item.channelsCount} chaînes •{' '}
            {formatDate(item.dateAdded)}
          </Text>
        </View>
        <View style={styles.playlistActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => startRename(item)}>
            <Text style={styles.actionButtonText}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => deletePlaylist(item)}>
            <Text style={styles.actionButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.playlistStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.channelsCount}</Text>
          <Text style={styles.statLabel}>Chaînes</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {item.source === 'url' ? 'URL' : 'Fichier'}
          </Text>
          <Text style={styles.statLabel}>Source</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📺</Text>
      <Text style={styles.emptyTitle}>Aucune playlist</Text>
      <Text style={styles.emptyText}>
        Ajoutez des playlists M3U depuis l'écran d'accueil
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes Playlists</Text>
        <Text style={styles.subtitle}>
          {playlists.length} playlist{playlists.length !== 1 ? 's' : ''}{' '}
          sauvegardée{playlists.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={playlists}
        renderItem={renderPlaylistItem}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.listContainer,
          playlists.length === 0 && styles.centerContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#4A90E2']}
            tintColor="#4A90E2"
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Modal de renommage */}
      <Modal
        visible={renameModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setRenameModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Renommer la playlist</Text>

            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Nom de la playlist"
              autoFocus={true}
              selectTextOnFocus={true}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setRenameModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmRename}
                disabled={!newName.trim()}>
                <Text style={styles.confirmButtonText}>Renommer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1419',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E9AAF',
  },
  listContainer: {
    padding: 16,
  },
  centerContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistCard: {
    backgroundColor: '#1A2332',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A3441',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  playlistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  playlistInfo: {
    flex: 1,
    marginRight: 12,
  },
  playlistName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  playlistDetails: {
    fontSize: 14,
    color: '#8E9AAF',
  },
  playlistActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 32,
    height: 32,
    backgroundColor: '#2A3441',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  deleteButton: {
    backgroundColor: '#D32F2F',
  },
  actionButtonText: {
    fontSize: 14,
  },
  playlistStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A3441',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
  },
  statLabel: {
    fontSize: 12,
    color: '#8E9AAF',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E9AAF',
    textAlign: 'center',
    lineHeight: 22,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#1A2332',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#2A3441',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#3A4551',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 6,
  },
  cancelButton: {
    backgroundColor: '#2A3441',
  },
  confirmButton: {
    backgroundColor: '#4A90E2',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '500',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default PlaylistManagerScreen;
