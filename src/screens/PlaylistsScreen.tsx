import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  useColorScheme,
  RefreshControl,
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
// AppManager removed - will be replaced by DI services
import {Playlist} from '../types';
import {usePlaylistSelection} from '../hooks/usePlaylistSelection';
// AppContext removed - using UIStore instead
import {useUIStore} from '../stores/UIStore';

const PlaylistsScreen: React.FC = () => {
  // AppManager removed - will be replaced by DI services + Zustand
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistUrl, setNewPlaylistUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const isDarkMode = useColorScheme() === 'dark';

  // 🎬 Hook pour l'animation de sélection de playlist
  const {selectPlaylistWithAnimation, initializePlaylistService} =
    usePlaylistSelection();

  // 🔄 Hook pour la gestion globale de l'app
  // Replaced AppContext with UIStore
  const {closeAllModals} = useUIStore();

  useEffect(() => {
    loadPlaylists();
    // Initialiser le service de playlist avec les callbacks d'animation
    initializePlaylistService();
  }, [initializePlaylistService]);

  const loadPlaylists = async () => {
    try {
      // TODO: Replace with DI PlaylistService
      // const playlistManager = appManager.getPlaylistManager();
      const loadedPlaylists = playlistManager.getPlaylists();
      setPlaylists(loadedPlaylists);
      console.log('📋 Playlists chargées:', loadedPlaylists.length);
    } catch (error) {
      console.error('❌ Erreur chargement playlists:', error);
      Alert.alert('Erreur', 'Impossible de charger les playlists');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPlaylists();
    setRefreshing(false);
  };

  const handleAddPlaylist = () => {
    setNewPlaylistName('');
    setNewPlaylistUrl('');
    setShowAddModal(true);
  };

  const handleAddFromUrl = async () => {
    if (!newPlaylistName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom pour la playlist');
      return;
    }

    if (!newPlaylistUrl.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer une URL valide');
      return;
    }

    try {
      setIsLoading(true);
      await appManager.addPlaylist(newPlaylistName.trim(), {
        url: newPlaylistUrl.trim(),
      });

      setShowAddModal(false);
      await loadPlaylists();
      Alert.alert(
        '✅ Succès',
        `Playlist "${newPlaylistName}" ajoutée avec succès`,
      );
    } catch (error) {
      console.error('❌ Erreur ajout playlist URL:', error);
      Alert.alert(
        'Erreur',
        "Impossible d'ajouter la playlist depuis cette URL",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddFromFile = async () => {
    if (!newPlaylistName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom pour la playlist');
      return;
    }

    try {
      setIsLoading(true);

      const result = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.allFiles],
        copyTo: 'documentDirectory',
      });

      if (result.fileCopyUri) {
        // Read file content (this would need react-native-fs)
        // For now, we'll show an alert that this feature is not yet implemented
        Alert.alert(
          'Fonctionnalité à venir',
          "L'ajout de fichiers locaux sera disponible dans une prochaine version.",
        );
      }
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        console.error('❌ Erreur sélection fichier:', error);
        Alert.alert('Erreur', 'Impossible de sélectionner le fichier');
      }
    } finally {
      setIsLoading(false);
      setShowAddModal(false);
    }
  };

  const handleUpdatePlaylist = async (playlist: Playlist) => {
    if (!playlist.url) {
      Alert.alert(
        'Information',
        'Cette playlist locale ne peut pas être mise à jour',
      );
      return;
    }

    try {
      setIsLoading(true);
      await appManager.updatePlaylist(playlist.id);
      await loadPlaylists();
      Alert.alert('✅ Succès', `Playlist "${playlist.name}" mise à jour`);
    } catch (error) {
      console.error('❌ Erreur mise à jour playlist:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour la playlist');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPlaylist = async (playlist: Playlist) => {
    try {
      // 🚀 FERMER TOUS LES MODALS D'ABORD !
      console.log('🔄 Fermeture de tous les modals avant animation...');
      closeAllModals();

      // Petit délai pour s'assurer que les modals se ferment
      await new Promise(resolve => setTimeout(resolve, 100));

      // 🎬 Puis déclencher l'animation
      const selectedPlaylist = await selectPlaylistWithAnimation(
        playlist.id,
        playlist.name,
      );

      if (selectedPlaylist) {
        console.log(
          `✅ Playlist "${selectedPlaylist.name}" sélectionnée avec succès`,
        );

        // Aussi mettre à jour l'AppManager pour cohérence
        await appManager.selectPlaylist(playlist.id);

        // Navigation exemple (si vous avez la navigation):
        // navigation.navigate('ChannelList', {
        //   playlistId: playlist.id,
        //   playlistName: playlist.name,
        //   channels: selectedPlaylist.channels,
        //   totalChannels: selectedPlaylist.totalChannels
        // });
      } else {
        Alert.alert('Erreur', 'Impossible de charger cette playlist');
      }
    } catch (error) {
      console.error('❌ Erreur sélection playlist:', error);
      Alert.alert(
        'Erreur',
        'Une erreur est survenue lors du chargement de la playlist',
      );
    }
  };

  const handleDeletePlaylist = (playlist: Playlist) => {
    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer la playlist "${playlist.name}" ?`,
      [
        {text: 'Annuler', style: 'cancel'},
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await appManager.deletePlaylist(playlist.id);
              await loadPlaylists();
              Alert.alert(
                '✅ Supprimée',
                `Playlist "${playlist.name}" supprimée`,
              );
            } catch (error) {
              console.error('❌ Erreur suppression playlist:', error);
              Alert.alert('Erreur', 'Impossible de supprimer la playlist');
            }
          },
        },
      ],
    );
  };

  const renderPlaylistItem = ({item}: {item: Playlist}) => (
    <TouchableOpacity
      style={[styles.playlistCard, isDarkMode && styles.playlistCardDark]}
      onPress={() => handleSelectPlaylist(item)}
      activeOpacity={0.7}>
      <View style={styles.playlistHeader}>
        <Text
          style={[styles.playlistName, isDarkMode && styles.playlistNameDark]}>
          {item.name}
        </Text>
        <View style={styles.playlistBadge}>
          <Text style={styles.playlistBadgeText}>
            {item.channels.length} chaînes
          </Text>
        </View>
      </View>

      <View style={styles.playlistInfo}>
        <Text
          style={[
            styles.playlistDetails,
            isDarkMode && styles.playlistDetailsDark,
          ]}>
          {item.isLocal ? '📄 Fichier local' : '🌐 URL distante'}
        </Text>
        <Text
          style={[styles.playlistDate, isDarkMode && styles.playlistDateDark]}>
          Ajoutée le {new Date(item.dateAdded).toLocaleDateString('fr-FR')}
        </Text>
        {item.lastUpdated !== item.dateAdded && (
          <Text
            style={[
              styles.playlistDate,
              isDarkMode && styles.playlistDateDark,
            ]}>
            Mise à jour le{' '}
            {new Date(item.lastUpdated).toLocaleDateString('fr-FR')}
          </Text>
        )}
      </View>

      <View style={styles.playlistActions}>
        {item.url && (
          <TouchableOpacity
            style={[styles.actionButton, styles.updateButton]}
            onPress={e => {
              e.stopPropagation(); // Empêcher le clic sur la carte
              handleUpdatePlaylist(item);
            }}>
            <Text style={styles.actionButtonText}>🔄 MAJ</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={e => {
            e.stopPropagation(); // Empêcher le clic sur la carte
            handleDeletePlaylist(item);
          }}>
          <Text style={styles.actionButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* Header */}
      <View style={[styles.header, isDarkMode && styles.headerDark]}>
        <Text
          style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>
          📋 Mes Playlists ({playlists.length})
        </Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddPlaylist}>
          <Text style={styles.addButtonText}>➕ Ajouter</Text>
        </TouchableOpacity>
      </View>

      {/* Playlists List */}
      <FlatList
        data={playlists}
        renderItem={renderPlaylistItem}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text
              style={[styles.emptyTitle, isDarkMode && styles.emptyTitleDark]}>
              📋 Aucune playlist
            </Text>
            <Text
              style={[styles.emptyText, isDarkMode && styles.emptyTextDark]}>
              Ajoutez votre première playlist pour commencer à regarder des
              chaînes IPTV.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={handleAddPlaylist}>
              <Text style={styles.emptyButtonText}>
                ➕ Ajouter une playlist
              </Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={
          playlists.length === 0 ? styles.emptyList : undefined
        }
      />

      {/* Add Playlist Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              isDarkMode && styles.modalContentDark,
            ]}>
            <Text
              style={[styles.modalTitle, isDarkMode && styles.modalTitleDark]}>
              ➕ Ajouter une Playlist
            </Text>

            <TextInput
              style={[styles.input, isDarkMode && styles.inputDark]}
              placeholder="Nom de la playlist"
              placeholderTextColor={isDarkMode ? '#666' : '#999'}
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
            />

            <TextInput
              style={[styles.input, isDarkMode && styles.inputDark]}
              placeholder="URL M3U/M3U8 (optionnel)"
              placeholderTextColor={isDarkMode ? '#666' : '#999'}
              value={newPlaylistUrl}
              onChangeText={setNewPlaylistUrl}
              autoCapitalize="none"
              keyboardType="url"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalButtonTextSecondary}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleAddFromUrl}
                disabled={isLoading}>
                <Text style={styles.modalButtonText}>
                  {isLoading ? '⏳' : '🌐'} URL
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleAddFromFile}
                disabled={isLoading}>
                <Text style={styles.modalButtonText}>
                  {isLoading ? '⏳' : '📄'} Fichier
                </Text>
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
    backgroundColor: '#f5f5f5',
  },
  containerDark: {
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerDark: {
    backgroundColor: '#2a2a2a',
    borderBottomColor: '#444',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerTitleDark: {
    color: '#fff',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  playlistCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginVertical: 8,
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  playlistCardDark: {
    backgroundColor: '#2a2a2a',
  },
  playlistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  playlistName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  playlistNameDark: {
    color: '#fff',
  },
  playlistBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  playlistBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  playlistInfo: {
    marginBottom: 12,
  },
  playlistDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  playlistDetailsDark: {
    color: '#999',
  },
  playlistDate: {
    fontSize: 12,
    color: '#999',
  },
  playlistDateDark: {
    color: '#666',
  },
  playlistActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  updateButton: {
    backgroundColor: '#34C759',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  emptyTitleDark: {
    color: '#fff',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  emptyTextDark: {
    color: '#999',
  },
  emptyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalContentDark: {
    backgroundColor: '#2a2a2a',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalTitleDark: {
    color: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  inputDark: {
    backgroundColor: '#333',
    borderColor: '#444',
    color: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
  },
  modalButtonSecondary: {
    backgroundColor: '#8E8E93',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  modalButtonTextSecondary: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default PlaylistsScreen;
