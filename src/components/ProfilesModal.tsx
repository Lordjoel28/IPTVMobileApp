/**
 * 👤 ProfilesModal 2.0 - Grille plein écran moderne
 * Design: Grille 2 colonnes, cards modernes, interactions avancées
 */

import React, {useState, useEffect} from 'react';
import {PlaylistService} from '../services/PlaylistService'; // Pré-charger pour éviter délais
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Modal,
  Alert,
  Dimensions,
  StatusBar,
  SafeAreaView,
  ScrollView,
  PanResponder,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {BlurView} from '@react-native-community/blur';
// AppContext removed - using UIStore instead
import {useUIStore} from '../stores/UIStore';

const {width, height} = Dimensions.get('window');

interface PlaylistItem {
  id: string;
  name: string;
  type: 'M3U' | 'XTREAM';
  url?: string;
  server?: string;
  username?: string;
  password?: string;
  dateAdded: string;
  expirationDate?: string;
  channelsCount?: number;
  status?: 'active' | 'expiring' | 'expired';
}

interface ProfilesModalProps {
  visible: boolean;
  onClose: () => void;
  onPlaylistSelect: (playlist: PlaylistItem) => void;
  onAddPlaylist?: () => void;
  selectedPlaylistId?: string;
}

const ProfilesModal: React.FC<ProfilesModalProps> = ({
  visible,
  onClose,
  onPlaylistSelect,
  onAddPlaylist,
  selectedPlaylistId,
}) => {
  // Replaced AppContext with UIStore
  const {showLoading, updateLoading, hideLoading, showNotification} =
    useUIStore();
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    playlist: PlaylistItem | null;
    x: number;
    y: number;
  }>({visible: false, playlist: null, x: 0, y: 0});
  const [deleteModal, setDeleteModal] = useState<{
    visible: boolean;
    playlist: PlaylistItem | null;
  }>({visible: false, playlist: null});
  const contextMenuOpacity = useState(new Animated.Value(0))[0];
  const contextMenuScale = useState(new Animated.Value(0.8))[0];

  // États pour l'animation de sélection
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const selectedCardScale = useState(new Animated.Value(1))[0];
  const selectedCardOpacity = useState(new Animated.Value(1))[0];

  // Charger les playlists et calculer le statut
  const loadPlaylists = async () => {
    try {
      setLoading(true);

      // 🚀 CHARGER DEPUIS WATERMELONDB (nouveau système unifié - pré-chargé)
      const playlistService = PlaylistService.getInstance();

      const watermelonPlaylists = await playlistService.getAllPlaylists();

      console.log('📋 Playlists WatermelonDB:', watermelonPlaylists.length);

      // Convertir au format PlaylistItem attendu par le composant
      const allPlaylists = watermelonPlaylists
        .map(p => ({
          id: p.id,
          name: p.name,
          url: p.url,
          type: p.type as 'M3U' | 'XTREAM',
          channelsCount: p.channelsCount,
          createdAt: p.createdAt,
          dateAdded: p.createdAt, // Compatibilité
          status: calculateStatus(undefined), // Pas d'expiration pour M3U
        }))
        .sort(
          (a, b) =>
            new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime(),
        );

      setPlaylists(allPlaylists);
      console.log(`Playlists chargées: ${allPlaylists.length}`);
    } catch (error) {
      console.error('Erreur chargement playlists:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculer le statut d'expiration
  const calculateStatus = (
    expirationDate?: string,
  ): 'active' | 'expiring' | 'expired' => {
    if (!expirationDate) {
      return 'active';
    }

    let expDate: Date;

    // Gérer les timestamps Unix (Xtream Codes) et les dates ISO
    if (/^\d+$/.test(expirationDate)) {
      // Timestamp Unix (comme "1778248620")
      expDate = new Date(parseInt(expirationDate) * 1000);
    } else {
      // Date ISO standard
      expDate = new Date(expirationDate);
    }

    // Vérifier si la date est valide
    if (isNaN(expDate.getTime())) {
      return 'active';
    }

    const now = new Date();
    const diffTime = expDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return 'expired';
    }
    if (diffDays <= 3) {
      return 'expiring';
    }
    return 'active';
  };

  // Formater la date d'expiration
  const formatExpirationDate = (expirationDate?: string) => {
    if (!expirationDate) {
      return 'Unlimited';
    }

    let expDate: Date;

    // Gérer les timestamps Unix (Xtream Codes) et les dates ISO
    if (/^\d+$/.test(expirationDate)) {
      // Timestamp Unix (comme "1778248620")
      expDate = new Date(parseInt(expirationDate) * 1000);
    } else {
      // Date ISO standard
      expDate = new Date(expirationDate);
    }

    // Vérifier si la date est valide
    if (isNaN(expDate.getTime())) {
      return 'Invalid';
    }

    const now = new Date();
    const diffTime = expDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return 'Expired';
    }
    if (diffDays === 0) {
      return 'Today';
    }
    if (diffDays === 1) {
      return 'Tomorrow';
    }
    if (diffDays <= 30) {
      return `${diffDays}d left`;
    }

    return expDate.toLocaleDateString('fr-FR');
  };

  useEffect(() => {
    if (visible) {
      loadPlaylists();
    }
  }, [visible]);

  // Obtenir les couleurs selon le type et le statut (design moderne attractif)
  const getPlaylistColors = (item: PlaylistItem) => {
    const baseColors = {
      M3U: [
        'rgba(99, 102, 241, 0.95)',
        'rgba(67, 56, 202, 0.9)',
        'rgba(55, 48, 163, 0.85)',
      ],
      XTREAM: [
        'rgba(16, 185, 129, 0.95)',
        'rgba(5, 150, 105, 0.9)',
        'rgba(4, 120, 87, 0.85)',
      ],
    };

    if (item.status === 'expired') {
      return [
        'rgba(239, 68, 68, 0.95)',
        'rgba(220, 38, 38, 0.9)',
        'rgba(185, 28, 28, 0.85)',
      ];
    }
    if (item.status === 'expiring') {
      return [
        'rgba(245, 158, 11, 0.95)',
        'rgba(217, 119, 6, 0.9)',
        'rgba(180, 83, 9, 0.85)',
      ];
    }

    return baseColors[item.type];
  };

  // Obtenir des couleurs sobres avec dégradés élégants
  const getSoberGradientColors = (item: PlaylistItem) => {
    const soberColors = {
      M3U: [
        'rgba(71, 85, 105, 0.75)', // Gris-bleu foncé plus transparent
        'rgba(51, 65, 85, 0.7)', // Gris-bleu moyen plus transparent
        'rgba(30, 41, 59, 0.65)', // Gris-bleu très foncé plus transparent
      ],
      XTREAM: [
        'rgba(75, 85, 99, 0.75)', // Gris chaud plus transparent
        'rgba(55, 65, 81, 0.7)', // Gris moyen plus transparent
        'rgba(31, 41, 55, 0.65)', // Gris foncé plus transparent
      ],
    };

    // Variations selon le statut
    if (item.status === 'expired') {
      return [
        'rgba(87, 83, 78, 0.95)', // Gris-brun
        'rgba(68, 64, 60, 0.9)', // Brun foncé
        'rgba(41, 37, 36, 0.85)', // Très foncé
      ];
    }
    if (item.status === 'expiring') {
      return [
        'rgba(120, 113, 108, 0.95)', // Gris-beige
        'rgba(87, 83, 78, 0.9)', // Gris-brun
        'rgba(68, 64, 60, 0.85)', // Brun moyen
      ];
    }

    return soberColors[item.type];
  };

  // Gestion du menu contextuel
  const showContextMenu = (playlist: PlaylistItem, x: number, y: number) => {
    setContextMenu({visible: true, playlist, x, y});

    Animated.parallel([
      Animated.timing(contextMenuOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(contextMenuScale, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideContextMenu = () => {
    Animated.parallel([
      Animated.timing(contextMenuOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(contextMenuScale, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setContextMenu({visible: false, playlist: null, x: 0, y: 0});
    });
  };

  const handleConnect = () => {
    if (contextMenu.playlist) {
      hideContextMenu();
      onPlaylistSelect(contextMenu.playlist);
    }
  };

  const handleDelete = async () => {
    if (!contextMenu.playlist) {
      return;
    }

    const playlist = contextMenu.playlist;
    hideContextMenu();
    setDeleteModal({visible: true, playlist});
  };

  const confirmDelete = async () => {
    if (!deleteModal.playlist) {
      return;
    }

    const playlist = deleteModal.playlist;
    setDeleteModal({visible: false, playlist: null});

    try {
      // Supprimer selon le type
      if (playlist.type === 'M3U') {
        const m3uData = await AsyncStorage.getItem('saved_m3u_playlists');
        const m3uPlaylists = m3uData ? JSON.parse(m3uData) : [];
        const updatedM3u = m3uPlaylists.filter(
          (p: PlaylistItem) => p.id !== playlist.id,
        );
        await AsyncStorage.setItem(
          'saved_m3u_playlists',
          JSON.stringify(updatedM3u),
        );
      } else {
        const xtreamData = await AsyncStorage.getItem('saved_xtream_playlists');
        const xtreamPlaylists = xtreamData ? JSON.parse(xtreamData) : [];
        const updatedXtream = xtreamPlaylists.filter(
          (p: PlaylistItem) => p.id !== playlist.id,
        );
        await AsyncStorage.setItem(
          'saved_xtream_playlists',
          JSON.stringify(updatedXtream),
        );
      }

      // Recharger les playlists
      await loadPlaylists();

      console.log(`Playlist supprimée: ${playlist.name}`);
    } catch (error) {
      console.error('Erreur suppression playlist:', error);
      Alert.alert('Erreur', 'Impossible de supprimer la playlist');
    }
  };

  // Animation de sélection de carte
  const animateCardSelection = (itemId: string) => {
    setSelectedItemId(itemId);

    // Animation de pulsation et mise en évidence plus prononcée
    Animated.sequence([
      // Agrandir la carte plus fortement
      Animated.timing(selectedCardScale, {
        toValue: 1.1,
        duration: 200,
        useNativeDriver: true,
      }),
      // Flash d'opacité plus visible
      Animated.timing(selectedCardOpacity, {
        toValue: 0.6,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(selectedCardOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      // Garder un peu agrandi avant de revenir
      Animated.timing(selectedCardScale, {
        toValue: 1.05,
        duration: 100,
        useNativeDriver: true,
      }),
      // Remettre à la taille normale
      Animated.timing(selectedCardScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Reset après animation
      setTimeout(() => {
        setSelectedItemId(null);
        selectedCardScale.setValue(1);
        selectedCardOpacity.setValue(1);
      }, 100);
    });
  };

  // Animation simple de la carte puis passage à l'App principal
  const handlePlaylistSelect = async (item: PlaylistItem) => {
    try {
      // Animation de feedback visuel sur la carte en parallèle
      animateCardSelection(item.id);

      // Appeler immédiatement la fonction parent qui gère l'animation complète
      onPlaylistSelect(item);
    } catch (error) {
      console.error('Erreur sélection playlist:', error);
      showNotification('Erreur lors de la sélection', 'error', 3000);
    }
  };

  // Rendu d'une playlist en grille
  const renderPlaylist = ({
    item,
    index,
  }: {
    item: PlaylistItem;
    index: number;
  }) => {
    const isSelected = selectedPlaylistId === item.id;
    const isBeingSelected = selectedItemId === item.id;

    return (
      <Animated.View
        style={[
          {
            transform: [
              {
                scale: isBeingSelected ? selectedCardScale : 1,
              },
            ],
            opacity: isBeingSelected ? selectedCardOpacity : 1,
          },
        ]}>
        <Pressable
          style={({pressed}) => [
            styles.playlistCard,
            pressed && {transform: [{scale: 0.96}]},
          ]}
          onPress={() => handlePlaylistSelect(item)}
          onLongPress={event => {
            const {pageX, pageY} = event.nativeEvent;
            showContextMenu(item, pageX, pageY);
          }}>
          <LinearGradient
            colors={getSoberGradientColors(item)}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.cardGradient}>
            {/* Effet de brillance moderne */}
            <LinearGradient
              colors={['rgba(255,255,255,0.15)', 'transparent']}
              style={styles.cardShine}
            />

            {/* Effet de bordure intérieure subtile */}
            <View style={styles.cardInnerBorder} />
            {/* Indicateur de sélection au lieu du status */}
            {isSelected && (
              <View style={styles.selectedBadge}>
                <Text style={styles.selectedText}>ACTIVE</Text>
              </View>
            )}

            {/* Header avec icône et type */}
            <View style={styles.cardHeader}>
              <View style={styles.typeContainer}>
                <Icon
                  name={item.type === 'M3U' ? 'list' : 'cloud'}
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.typeText}>{item.type}</Text>
              </View>
            </View>

            {/* Nom de la playlist */}
            <Text style={styles.playlistTitle} numberOfLines={2}>
              {item.name}
            </Text>

            {/* URL/Server (tronqué) */}
            <Text style={styles.playlistSource} numberOfLines={1}>
              {item.url || item.server || 'Source non disponible'}
            </Text>

            {/* Informations du bas */}
            <View style={styles.cardFooter}>
              {/* Nombre de chaînes si disponible */}
              {item.channelsCount && (
                <View style={styles.channelsContainer}>
                  <Icon name="tv" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.channelsText}>{item.channelsCount}</Text>
                </View>
              )}

              {/* Date d'expiration */}
              <Text style={styles.expirationText}>
                {formatExpirationDate(item.expirationDate)}
              </Text>
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />

      <LinearGradient
        colors={['#1e1e2e', '#2a2a3a', '#363647', '#4a4a5a']}
        locations={[0, 0.3, 0.7, 1]}
        style={styles.fullScreenContainer}>
        <SafeAreaView style={styles.safeArea}>
          {/* Header moderne */}
          <View style={styles.modernHeader}>
            <Text style={styles.headerTitle}>Mes Playlists</Text>
            <View style={styles.headerButtons}>
              {onAddPlaylist && (
                <Pressable
                  onPress={onAddPlaylist}
                  style={({pressed}) => [
                    styles.addButtonModern,
                    pressed && {transform: [{scale: 0.9}]},
                  ]}>
                  <Icon name="playlist-add" size={24} color="#e2e8f0" />
                </Pressable>
              )}
              <Pressable
                onPress={onClose}
                style={({pressed}) => [
                  styles.closeButtonModern,
                  pressed && {transform: [{scale: 0.9}]},
                ]}>
                <Icon name="close" size={26} color="#e2e8f0" />
              </Pressable>
            </View>
          </View>

          {/* Contenu */}
          {loading ? (
            <View style={styles.centerContainer}>
              <Icon name="refresh" size={48} color="rgba(226, 232, 240, 0.6)" />
              <Text style={styles.loadingText}>Chargement...</Text>
            </View>
          ) : playlists.length === 0 ? (
            <View style={styles.centerContainer}>
              <Icon
                name="playlist-add"
                size={64}
                color="rgba(226, 232, 240, 0.4)"
              />
              <Text style={styles.emptyTitle}>Aucune playlist</Text>
              <Text style={styles.emptySubtitle}>
                Ajoutez des playlists pour les voir ici
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollContainer}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.gridContentContainer}>
              <View style={styles.gridRow}>
                {playlists.map((item, index) => (
                  <View key={`${item.id}_${index}`} style={styles.gridItemContainer}>
                    {renderPlaylist({item, index})}
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </LinearGradient>

      {/* Menu contextuel */}
      {contextMenu.visible && (
        <TouchableOpacity
          style={styles.contextMenuOverlay}
          activeOpacity={1}
          onPress={hideContextMenu}>
          <Animated.View
            style={[
              styles.contextMenu,
              {
                left: Math.min(contextMenu.x, width - 160),
                top: Math.min(contextMenu.y, height - 120),
                opacity: contextMenuOpacity,
                transform: [{scale: contextMenuScale}],
              },
            ]}>
            <LinearGradient
              colors={['rgba(15, 23, 42, 0.98)', 'rgba(30, 41, 59, 0.95)']}
              style={styles.contextMenuContent}>
              <TouchableOpacity
                style={styles.contextMenuItem}
                onPress={handleConnect}>
                <Icon name="play-circle-outline" size={20} color="#4a9b8e" />
                <Text style={styles.contextMenuText}>Se connecter</Text>
              </TouchableOpacity>

              <View style={styles.contextMenuDivider} />

              <TouchableOpacity
                style={styles.contextMenuItem}
                onPress={handleDelete}>
                <Icon name="delete-outline" size={20} color="#ef4444" />
                <Text style={[styles.contextMenuText, {color: '#ef4444'}]}>
                  Supprimer
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
      )}

      {/* Modal de confirmation de suppression */}
      {deleteModal.visible && deleteModal.playlist && (
        <Modal
          transparent
          visible={deleteModal.visible}
          animationType="fade"
          onRequestClose={() =>
            setDeleteModal({visible: false, playlist: null})
          }>
          <View style={styles.deleteModalOverlay}>
            <View style={styles.deleteModalContainer}>
              <LinearGradient
                colors={[
                  'rgba(15, 23, 42, 0.98)',
                  'rgba(30, 41, 59, 0.96)',
                  'rgba(51, 65, 85, 0.94)',
                ]}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.deleteModalContent}>
                {/* Icône de suppression */}
                <View style={styles.deleteIconContainer}>
                  <Icon name="delete-outline" size={48} color="#ef4444" />
                </View>

                {/* Titre */}
                <Text style={styles.deleteModalTitle}>
                  Supprimer la playlist
                </Text>

                {/* Message */}
                <Text style={styles.deleteModalMessage}>
                  Êtes-vous sûr de vouloir supprimer la playlist{'\n'}
                  <Text style={styles.playlistNameHighlight}>
                    "{deleteModal.playlist.name}"
                  </Text>{' '}
                  ?
                </Text>

                <Text style={styles.deleteModalWarning}>
                  Cette action est irréversible.
                </Text>

                {/* Boutons */}
                <View style={styles.deleteModalButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() =>
                      setDeleteModal({visible: false, playlist: null})
                    }>
                    <Text style={styles.cancelButtonText}>Annuler</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={confirmDelete}>
                    <LinearGradient
                      colors={['#ef4444', '#dc2626']}
                      style={styles.deleteButtonGradient}>
                      <Text style={styles.deleteButtonText}>Supprimer</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  modernHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.1)',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#e2e8f0',
    letterSpacing: 0.5,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addButtonModern: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(74, 155, 142, 0.2)',
  },
  closeButtonModern: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(226, 232, 240, 0.1)',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(226, 232, 240, 0.8)',
    marginTop: 16,
    fontWeight: '500',
  },
  emptyTitle: {
    fontSize: 20,
    color: '#e2e8f0',
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(226, 232, 240, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  gridContentContainer: {
    paddingTop: 16,
    paddingBottom: 32,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 12, // Plus de padding pour éviter rognage
  },
  gridItemContainer: {
    width: '48%', // Revenir à 48% mais avec plus de padding container
    marginBottom: 16,
  },
  playlistCard: {
    flex: 1,
    minHeight: 130,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 15,
    backgroundColor: 'rgba(45, 55, 72, 0.9)',
  },
  cardBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
  },
  cardGradient: {
    flex: 1,
    padding: 16,
    position: 'relative',
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#4ade80',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    shadowColor: '#4ade80',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 8,
  },
  selectedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  playlistTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    lineHeight: 20,
  },
  playlistSource: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 12,
    fontWeight: '400',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  channelsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  channelsText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 3,
  },
  expirationText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  contextMenuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10000,
  },
  contextMenu: {
    position: 'absolute',
    minWidth: 150,
    zIndex: 10001,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
  },
  contextMenuContent: {
    borderRadius: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  contextMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  contextMenuText: {
    fontSize: 14,
    color: '#e2e8f0',
    fontWeight: '500',
    marginLeft: 12,
    letterSpacing: 0.2,
  },
  contextMenuDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 12,
  },
  selectedPlaylistCard: {
    borderColor: '#4ade80',
    borderWidth: 2,
    shadowColor: '#4ade80',
    shadowOpacity: 0.6,
    elevation: 25,
    transform: [{scale: 1.02}],
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  deleteModalContainer: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  deleteModalContent: {
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  deleteIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  deleteModalMessage: {
    fontSize: 16,
    color: 'rgba(226, 232, 240, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
    fontWeight: '400',
  },
  playlistNameHighlight: {
    fontWeight: '600',
    color: '#4ade80',
  },
  deleteModalWarning: {
    fontSize: 13,
    color: 'rgba(239, 68, 68, 0.8)',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 24,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(226, 232, 240, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.2)',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  deleteButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#ef4444',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  deleteButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  // Nouveaux effets modernes pour les cartes
  cardShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '30%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    zIndex: 1,
  },
  cardInnerBorder: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    zIndex: 0,
  },
});

export default ProfilesModal;
