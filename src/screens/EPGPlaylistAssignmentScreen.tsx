/**
 * 📺 EPG Playlist Assignment Screen - Assignation sources EPG ↔ Playlists
 * Permet d'assigner des sources EPG spécifiques à chaque playlist
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  useColorScheme,
  ActivityIndicator,
  Modal,
  StatusBar,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import type {RootStackParamList} from '../../App';
import {EPGSourceManager, EPGSource} from '../services/epg/EPGSourceManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SystemNavigationBar from 'react-native-system-navigation-bar';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface PlaylistItem {
  id: string;
  name: string;
  type: 'M3U' | 'XTREAM';
  channelsCount?: number;
  dateAdded: string;
}

interface PlaylistEPGAssignment {
  playlistId: string;
  playlistName: string;
  assignedSourceId?: string;
  assignedSourceName?: string;
  preferredSource: 'integrated' | 'manual' | 'global';
  hasIntegratedEPG: boolean;
}

const EPGPlaylistAssignmentScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(true);
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [sources, setSources] = useState<EPGSource[]>([]);
  const [assignments, setAssignments] = useState<PlaylistEPGAssignment[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] =
    useState<PlaylistEPGAssignment | null>(null);
  const isDarkMode = useColorScheme() === 'dark';

  const epgManager = new EPGSourceManager();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Charger les playlists
      const loadedPlaylists = await loadPlaylists();
      console.log('📋 Playlists chargées:', loadedPlaylists.length);

      // Charger les sources EPG manuelles
      const manualSources = await epgManager.getManualSources();
      setSources(manualSources);
      console.log('📺 Sources EPG manuelles:', manualSources.length);

      // Construire les assignations avec les playlists chargées
      await buildAssignments(loadedPlaylists);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  const loadPlaylists = async (): Promise<PlaylistItem[]> => {
    try {
      const allPlaylists: PlaylistItem[] = [];

      // Charger M3U playlists
      const m3uData = await AsyncStorage.getItem('saved_m3u_playlists');
      if (m3uData) {
        const m3uPlaylists = JSON.parse(m3uData);
        console.log('📋 M3U playlists trouvées:', m3uPlaylists.length);
        allPlaylists.push(
          ...m3uPlaylists.map((p: any) => ({...p, type: 'M3U'})),
        );
      }

      // Charger Xtream playlists
      const xtreamData = await AsyncStorage.getItem('saved_xtream_playlists');
      if (xtreamData) {
        const xtreamPlaylists = JSON.parse(xtreamData);
        console.log('📋 Xtream playlists trouvées:', xtreamPlaylists.length);
        allPlaylists.push(
          ...xtreamPlaylists.map((p: any) => ({...p, type: 'XTREAM'})),
        );
      }

      // Déduplication par ID
      const uniquePlaylists = allPlaylists.filter(
        (playlist, index, self) =>
          index === self.findIndex(p => p.id === playlist.id),
      );

      console.log('📋 Total playlists chargées:', allPlaylists.length);
      console.log(
        '📋 Playlists uniques après déduplication:',
        uniquePlaylists.length,
      );
      setPlaylists(uniquePlaylists);
      return uniquePlaylists;
    } catch (error) {
      console.error('Erreur chargement playlists:', error);
      return [];
    }
  };

  const buildAssignments = async (
    playlistsToProcess: PlaylistItem[] = playlists,
  ) => {
    try {
      const assignmentList: PlaylistEPGAssignment[] = [];

      console.log(
        '🔧 Construction assignations pour',
        playlistsToProcess.length,
        'playlists',
      );

      for (const playlist of playlistsToProcess) {
        // Vérifier s'il y a une source assignée manuellement
        const assignedSource = sources.find(s => s.playlistId === playlist.id);

        // Vérifier s'il y a un EPG intégré (url-tvg dans le M3U)
        const hasIntegratedEPG = await checkIntegratedEPG(playlist.id);

        assignmentList.push({
          playlistId: playlist.id,
          playlistName: playlist.name,
          assignedSourceId: assignedSource?.id,
          assignedSourceName: assignedSource?.name,
          preferredSource: assignedSource
            ? 'manual'
            : hasIntegratedEPG
            ? 'integrated'
            : 'global',
          hasIntegratedEPG,
        });
      }

      console.log('✅ Assignations construites:', assignmentList.length);
      setAssignments(assignmentList);
    } catch (error) {
      console.error('Erreur construction assignations:', error);
    }
  };

  const checkIntegratedEPG = async (playlistId: string): Promise<boolean> => {
    try {
      // Vérifier s'il y a un url-tvg dans les métadonnées de la playlist
      // Cette logique dépend de votre implémentation des métadonnées
      return false; // Pour l'instant, on assume qu'il n'y en a pas
    } catch {
      return false;
    }
  };

  const handleAssignSource = (assignment: PlaylistEPGAssignment) => {
    setSelectedPlaylist(assignment);
    setModalVisible(true);
    // Masquer les barres système pour une immersion totale
    SystemNavigationBar.immersive();
  };

  const handleSelectSource = async (sourceId: string | null) => {
    if (!selectedPlaylist) {
      return;
    }

    try {
      if (sourceId) {
        // Assigner une source manuelle
        const source = sources.find(s => s.id === sourceId);
        if (source) {
          await epgManager.assignManualEPG(
            selectedPlaylist.playlistId,
            selectedPlaylist.playlistName,
            source.url,
          );
        }
      } else {
        // Supprimer l'assignation (retour au mode automatique)
        await epgManager.removeEPGAssignment(selectedPlaylist.playlistId);
      }

      setModalVisible(false);
      SystemNavigationBar.navigationShow(); // Restaurer les barres système
      await loadData(); // Recharger les données
    } catch (error) {
      console.error('Erreur assignation source:', error);
      Alert.alert('Erreur', "Impossible de modifier l'assignation");
    }
  };

  const getSourcePriorityInfo = (assignment: PlaylistEPGAssignment) => {
    if (assignment.assignedSourceId) {
      return {
        text: `Manuel: ${assignment.assignedSourceName}`,
        color: '#f59e0b',
        icon: 'settings',
      };
    } else if (assignment.hasIntegratedEPG) {
      return {
        text: 'EPG intégré (url-tvg)',
        color: '#10b981',
        icon: 'check-circle',
      };
    } else {
      return {
        text: 'EPG global (fallback)',
        color: '#6b7280',
        icon: 'public',
      };
    }
  };

  const renderPlaylistCard = (
    assignment: PlaylistEPGAssignment,
    index: number,
  ) => {
    const sourceInfo = getSourcePriorityInfo(assignment);
    const playlist = playlists.find(p => p.id === assignment.playlistId);

    return (
      <View style={styles.playlistCard}>
        <LinearGradient
          colors={[
            isDarkMode ? '#2A2F4A' : '#F5F7FA',
            isDarkMode ? '#1E2542' : '#E8EDF4',
          ]}
          style={styles.cardGradient}>
          <View style={styles.cardHeader}>
            <View style={styles.playlistInfo}>
              <Text
                style={[
                  styles.playlistName,
                  {color: isDarkMode ? '#E2E8F0' : '#1E293B'},
                ]}>
                {assignment.playlistName}
              </Text>
              <View
                style={[
                  styles.sourceStatus,
                  {backgroundColor: sourceInfo.color},
                ]}>
                <Icon name={sourceInfo.icon} size={14} color="#ffffff" />
                <Text style={styles.sourceStatusText}>
                  {assignment.assignedSourceId
                    ? 'Manuel'
                    : assignment.hasIntegratedEPG
                    ? 'Intégré'
                    : 'Global'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.assignButton}
              onPress={() => handleAssignSource(assignment)}>
              <Icon name="settings" size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  };

  const renderSourceModal = () => (
    <Modal
      visible={modalVisible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => {
        setModalVisible(false);
        SystemNavigationBar.navigationShow();
      }}>
      <View style={styles.modalOverlay}>
        <StatusBar
          backgroundColor="rgba(0, 0, 0, 0.8)"
          barStyle="light-content"
          translucent
        />
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={
              isDarkMode
                ? ['rgba(15, 23, 42, 0.98)', 'rgba(30, 41, 59, 0.95)']
                : ['rgba(248, 250, 252, 0.98)', 'rgba(226, 232, 240, 0.95)']
            }
            style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalTitle,
                  {color: isDarkMode ? '#e2e8f0' : '#1e293b'},
                ]}>
                Assigner source EPG
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setModalVisible(false);
                  SystemNavigationBar.navigationShow();
                }}>
                <Icon
                  name="close"
                  size={24}
                  color={isDarkMode ? '#94a3b8' : '#64748b'}
                />
              </TouchableOpacity>
            </View>

            <Text
              style={[
                styles.modalSubtitle,
                {color: isDarkMode ? '#94a3b8' : '#64748b'},
              ]}>
              {selectedPlaylist?.playlistName}
            </Text>

            {/* Options */}
            <ScrollView style={styles.optionsList}>
              {/* Option automatique */}
              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => handleSelectSource(null)}>
                <View style={styles.optionContent}>
                  <Icon name="auto-awesome" size={24} color="#10b981" />
                  <View style={styles.optionText}>
                    <Text
                      style={[
                        styles.optionTitle,
                        {color: isDarkMode ? '#e2e8f0' : '#1e293b'},
                      ]}>
                      Automatique
                    </Text>
                    <Text
                      style={[
                        styles.optionDesc,
                        {color: isDarkMode ? '#94a3b8' : '#64748b'},
                      ]}>
                      EPG intégré ou global selon disponibilité
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Sources manuelles */}
              {sources.map(source => (
                <TouchableOpacity
                  key={source.id}
                  style={styles.optionItem}
                  onPress={() => handleSelectSource(source.id)}>
                  <View style={styles.optionContent}>
                    <Icon name="source" size={24} color="#f59e0b" />
                    <View style={styles.optionText}>
                      <Text
                        style={[
                          styles.optionTitle,
                          {color: isDarkMode ? '#e2e8f0' : '#1e293b'},
                        ]}>
                        {source.name}
                      </Text>
                      <Text
                        style={[
                          styles.optionDesc,
                          {color: isDarkMode ? '#94a3b8' : '#64748b'},
                        ]}
                        numberOfLines={1}>
                        {source.url}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}

              {/* Message si pas de sources */}
              {sources.length === 0 && (
                <View style={styles.emptyOption}>
                  <Icon
                    name="info"
                    size={20}
                    color={isDarkMode ? '#64748b' : '#94a3b8'}
                  />
                  <Text
                    style={[
                      styles.emptyText,
                      {color: isDarkMode ? '#64748b' : '#94a3b8'},
                    ]}>
                    Aucune source EPG manuelle disponible.{'\n'}
                    Ajoutez-en depuis l'écran "Sources EPG Manuelles".
                  </Text>
                </View>
              )}
            </ScrollView>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );

  return (
    <LinearGradient
      colors={
        isDarkMode
          ? ['#0f172a', '#1e293b', '#334155']
          : ['#f8fafc', '#e2e8f0', '#cbd5e1']
      }
      style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon
            name="arrow-back"
            size={24}
            color={isDarkMode ? '#e2e8f0' : '#1e293b'}
          />
        </TouchableOpacity>

        <Text
          style={[
            styles.headerTitle,
            {color: isDarkMode ? '#e2e8f0' : '#1e293b'},
          ]}>
          Assignation EPG ↔ Playlists
        </Text>

        <TouchableOpacity
          style={styles.helpButton}
          onPress={() =>
            Alert.alert(
              'Aide',
              'Assignez des sources EPG spécifiques à vos playlists.\n\nPriorité EPG:\n1. EPG intégré (url-tvg)\n2. Source manuelle assignée\n3. EPG global (fallback)',
            )
          }>
          <Icon
            name="help-outline"
            size={24}
            color={isDarkMode ? '#94a3b8' : '#64748b'}
          />
        </TouchableOpacity>
      </View>

      {/* Contenu */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text
              style={[
                styles.loadingText,
                {color: isDarkMode ? '#94a3b8' : '#64748b'},
              ]}>
              Chargement des assignations...
            </Text>
          </View>
        ) : assignments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon
              name="playlist-add"
              size={64}
              color={isDarkMode ? '#475569' : '#94a3b8'}
            />
            <Text
              style={[
                styles.emptyTitle,
                {color: isDarkMode ? '#e2e8f0' : '#1e293b'},
              ]}>
              Aucune playlist trouvée
            </Text>
            <Text
              style={[
                styles.emptyText,
                {color: isDarkMode ? '#94a3b8' : '#64748b'},
              ]}>
              Importez des playlists M3U ou Xtream pour les voir ici
            </Text>
          </View>
        ) : (
          <View style={styles.assignmentsList}>
            {assignments.map((assignment, index) => (
              <View key={`assignment-${assignment.playlistId}-${index}`}>
                {renderPlaylistCard(assignment, index)}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal de sélection */}
      {renderSourceModal()}
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  helpButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  assignmentsList: {
    paddingBottom: 20,
  },
  playlistCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardGradient: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardHeader: {
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
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  assignButton: {
    backgroundColor: '#4F46E5',
    padding: 10,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  sourceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  sourceStatusText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: Dimensions.get('screen').width,
    height: Dimensions.get('screen').height,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalContent: {
    padding: 24,
    maxHeight: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  optionsList: {
    maxHeight: 300,
  },
  optionItem: {
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  optionText: {
    flex: 1,
    marginLeft: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 13,
    lineHeight: 16,
  },
  emptyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
  },
});

export default EPGPlaylistAssignmentScreen;
