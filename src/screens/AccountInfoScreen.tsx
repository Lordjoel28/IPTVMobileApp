/**
 * ℹ️ AccountInfoScreen - Écran d'informations du compte (Version Moderne)
 * Design moderne avec header compact, grille d'avatars et aperçus de thèmes
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import type {RootStackParamList} from '../../App';
import { useThemeColors, useTheme } from '../contexts/ThemeContext';
import { availableThemes } from '../themes/themeConfig';
import ProfileService, { AVAILABLE_AVATARS } from '../services/ProfileService';
import database from '../database';
import { Q } from '@nozbe/watermelondb';
import type { Profile } from '../types';
import ProfileManagementModal from '../components/ProfileManagementModal';
import AddProfileModal from '../components/AddProfileModal';

const { width: screenWidth } = Dimensions.get('window');

type NavigationProp = StackNavigationProp<RootStackParamList>;

// Fonction pour formater la date en format lisible
const formatDate = (dateString: string | null) => {
  if (!dateString) return null;

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    };

    return date.toLocaleDateString('fr-FR', options);
  } catch (error) {
    return dateString;
  }
};

const AccountInfoScreen: React.FC = () => {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const navigation = useNavigation<NavigationProp>();
  const { currentTheme, setTheme } = useTheme();
  const isFocused = useIsFocused();

  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showProfileSwitcher, setShowProfileSwitcher] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // États pour les informations de la playlist active
  const [activePlaylist, setActivePlaylist] = useState<any>(null);
  const [playlistInfo, setPlaylistInfo] = useState({
    name: 'Chargement...',
    type: 'M3U',
    expirationDate: null,
    createdDate: null,
    activeConnections: 0,
    connectionStatus: 'unknown' as 'online' | 'offline' | 'error'
  });

  useEffect(() => {
    loadProfileData();
  }, []);

  // Rafraîchir quand l'écran est en focus avec useIsFocused
  useEffect(() => {
    if (isFocused && isLoaded) {
      console.log('🔄 [AccountInfoScreen] Écran en focus, rechargement complet...');
      loadProfileData(true); // Forcer le rechargement
    }
  }, [isFocused, isLoaded]);

  const loadProfileData = async (forceReload = false) => {
    try {
      if (isLoaded && !forceReload) return;

      // PAS DE LOADING - Lecture directe depuis les services
      const [activeProfile, profiles] = await Promise.all([
        ProfileService.getActiveProfile(),
        ProfileService.getAllProfiles(),
      ]);

      setCurrentProfile(activeProfile);
      setAllProfiles(profiles);

      // Charger la playlist active
      await loadActivePlaylistInfo();

    } catch (error) {
      console.error('❌ Erreur chargement profil:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  
  const loadActivePlaylistInfo = async () => {
    try {
      // Récupérer la playlist active depuis la BDD
      const activePlaylists = await database
        .get('playlists')
        .query(Q.where('is_active', true))
        .fetch();

      if (activePlaylists.length === 0) {
        setPlaylistInfo({
          name: 'Aucune playlist',
          type: 'M3U',
          expirationDate: null,
          createdDate: null,
          activeConnections: 0,
          connectionStatus: 'offline'
        });
        return;
      }

      const playlistData = activePlaylists[0] as any;

      // Vérifier les connexions en temps réel SEULEMENT pour Xtream
      let realConnectionInfo = { activeConnections: 0, maxConnections: 1 };
      if (playlistData.type === 'XTREAM' && playlistData.server && playlistData.username && playlistData.password) {
        realConnectionInfo = await checkRealTimeConnections(playlistData);
      }

      // Nettoyer le nom de la playlist en supprimant "(Xtream)"
      const cleanName = playlistData.name ? playlistData.name.replace(/\s*\(.*?\)$/g, '') : 'Playlist sans nom';

      const formattedInfo = {
        name: cleanName,
        type: playlistData.type || 'M3U',
        expirationDate: playlistData.expirationDate,
        createdDate: playlistData.accountCreatedDate || playlistData.dateAdded,
        activeConnections: realConnectionInfo.activeConnections,
        connectionStatus: realConnectionInfo.hasError ? 'error' : 'online'
      };

      setPlaylistInfo(formattedInfo);
      setActivePlaylist(activePlaylists[0]);

    } catch (error) {
      console.error('❌ [AccountInfoScreen] Erreur chargement playlist:', error);
      setPlaylistInfo({
        name: 'Erreur de chargement',
        type: 'M3U',
        expirationDate: null,
        createdDate: null,
        activeConnections: 0,
        connectionStatus: 'error'
      });
    }
  };

  // Vérification en temps réel - SANS CACHE
  const checkRealTimeConnections = async (playlist: any) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch(`${playlist.server}/player_api.php?username=${playlist.username}&password=${playlist.password}`, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'User-Agent': 'IPTV-App' }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.user_info) {
        const activeConnections = parseInt(data.user_info.active_cons || '0');
        const maxConnections = parseInt(data.user_info.max_connections || '1');

        console.log('🔗 [AccountInfoScreen] Connexion active DÉTECTÉE:', activeConnections, '/', maxConnections);

        return {
          activeConnections,
          maxConnections,
          hasError: false
        };
      }

      return { activeConnections: 0, maxConnections: 1, hasError: false };

    } catch (error) {
      // Erreur réseau silencieuse - ne pas logger dans la console
      return { activeConnections: 0, maxConnections: 1, hasError: true };
    }
  };

  const handleAvatarChange = async (avatar: string) => {
    if (!currentProfile) return;

    try {
      await ProfileService.updateProfile(currentProfile.id, { avatar });
      setCurrentProfile({ ...currentProfile, avatar });
      setShowAvatarPicker(false);
      Alert.alert('Succès', 'Avatar modifié avec succès');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier l\'avatar');
    }
  };

  const handleThemeChange = async (themeId: string) => {
    if (!currentProfile) return;

    try {
      await ProfileService.updateProfile(currentProfile.id, { theme: themeId as any });
      await setTheme(themeId);
      setCurrentProfile({ ...currentProfile, theme: themeId as any });
      setShowThemePicker(false);
      Alert.alert('Succès', 'Thème modifié avec succès');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier le thème');
    }
  };

  const handleSetDefaultProfile = async () => {
    if (!currentProfile) return;

    try {
      await ProfileService.setDefaultProfile(currentProfile.id);
      await loadProfileData();
      Alert.alert('Succès', 'Profil défini par défaut');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de définir le profil par défaut');
    }
  };

  const handleProfileSwitch = async (profile: Profile) => {
    try {
      // Définir le nouveau profil actif
      await ProfileService.setActiveProfile(profile.id);

      // Nettoyer les données récentes (comme dans ProfileSelectionScreen)
      const {useRecentChannelsStore} = await import('../stores/RecentChannelsStore');
      useRecentChannelsStore.getState().clearRecentChannels();

      setShowProfileSwitcher(false);

      // Retourner à l'écran précédent après le changement
      navigation.goBack();

      Alert.alert('Succès', `Profil "${profile.name}" activé`);
    } catch (error) {
      console.error('❌ Erreur changement de profil:', error);
      Alert.alert('Erreur', 'Impossible de changer de profil');
    }
  };

  const handleDeleteProfile = () => {
    if (!currentProfile || allProfiles.length <= 1) {
      Alert.alert('Erreur', 'Vous ne pouvez pas supprimer le seul profil existant');
      return;
    }

    Alert.alert(
      'Supprimer le profil',
      `Êtes-vous sûr de vouloir supprimer le profil "${currentProfile.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await ProfileService.deleteProfile(currentProfile.id);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer le profil');
            }
          }
        }
      ]
    );
  };

  const handleDuplicateProfile = async () => {
    if (!currentProfile) return;

    const newName = `${currentProfile.name} - Copie`;
    try {
      const newProfile = await ProfileService.createProfile(newName);
      await loadProfileData();
      Alert.alert('Succès', `Profil "${newProfile.name}" créé avec succès`);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de dupliquer le profil');
    }
  };

  
  if (!currentProfile) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Informations du compte</Text>
        </View>

        <View style={styles.errorContainer}>
          <Icon name="error" size={48} color="#F44336" />
          <Text style={styles.errorText}>Aucun profil trouvé</Text>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowCreateModal(true)}
          >
            <Text style={styles.actionButtonText}>Créer un profil</Text>
          </TouchableOpacity>
        </View>

        <AddProfileModal
          visible={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onProfileCreated={loadProfileData}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header moderne compact */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Informations du compte</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header Profil - Design moderne épuré */}
        <View style={styles.accountHeader}>
          <View style={styles.profileSection}>
            <TouchableOpacity style={styles.avatarContainer} onPress={() => setShowAvatarPicker(true)}>
              <Text style={styles.avatarText}>{currentProfile.avatar}</Text>
              <View style={styles.avatarEdit}>
                <Icon name="edit" size={14} color="white" />
              </View>
            </TouchableOpacity>

            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{currentProfile.name}</Text>
              <View style={styles.profileBadges}>
                {currentProfile.isDefault && (
                  <View style={styles.badge}>
                    <Icon name="star" size={10} color="white" />
                    <Text style={styles.badgeText}>Par défaut</Text>
                  </View>
                )}
                {currentProfile.isKids && (
                  <View style={[styles.badge, { backgroundColor: '#4CAF50' }]}>
                    <Icon name="child-friendly" size={10} color="white" />
                    <Text style={styles.badgeText}>Enfant</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.switchProfileBtn} onPress={() => setShowProfileSwitcher(true)}>
            <Icon name="swap-horizontal-circle" size={22} color="#667eea" />
          </TouchableOpacity>
        </View>

        {/* Section Abonnement Actif - Design amélioré */}
        <View style={styles.subscriptionCard}>
          {/* Header avec icône playlist plus grande */}
          <View style={styles.playlistHeader}>
            <View style={styles.playlistIconLarge}>
              <Icon name="playlist-play" size={32} color="white" />
            </View>
            <View style={styles.playlistInfoContainer}>
              <Text style={styles.playlistName}>{playlistInfo.name}</Text>
            </View>
            <View style={[styles.typeBadge, {backgroundColor: playlistInfo.type === 'XTREAM' ? colors.accent.secondary : colors.accent.primary}]}>
              <Icon name="library-music" size={12} color="white" />
              <Text style={styles.typeBadgeText}>{playlistInfo.type}</Text>
            </View>
          </View>

          {/* Informations principales en grille 2x2 */}
          <View style={styles.mainInfoGrid}>
            {/* Date de création */}
            {playlistInfo.createdDate && (
              <View style={styles.mainInfoItem}>
                <View style={styles.infoIconContainer}>
                  <Icon name="calendar-today" size={18} color={colors.accent.primary} />
                </View>
                <View style={styles.mainInfoText}>
                  <Text style={styles.mainInfoLabel}>Création</Text>
                  <Text style={styles.mainInfoValue}>{formatDate(playlistInfo.createdDate)}</Text>
                </View>
              </View>
            )}

            {/* Statut de connexion */}
            <View style={[
              styles.mainInfoItem,
              !playlistInfo.expirationDate && playlistInfo.type !== 'XTREAM' ? { width: '100%' } : {}
            ]}>
              <View style={styles.infoIconContainer}>
                <Icon
                  name="wifi"
                  size={18}
                  color={
                    playlistInfo.type === 'XTREAM'
                      ? playlistInfo.connectionStatus === 'error'
                        ? '#F44336'
                        : playlistInfo.connectionStatus === 'online'
                          ? '#4CAF50'
                          : colors.text.secondary
                      : colors.text.secondary
                  }
                />
              </View>
              <View style={styles.mainInfoText}>
                <Text style={styles.mainInfoLabel}>Statut</Text>
                <Text style={[
                  styles.mainInfoValue,
                  {
                    color:
                      playlistInfo.type === 'XTREAM'
                        ? playlistInfo.connectionStatus === 'error'
                          ? '#F44336'
                          : playlistInfo.connectionStatus === 'online'
                            ? '#4CAF50'
                            : colors.text.primary
                        : colors.text.primary
                  }
                ]}>
                  {playlistInfo.type === 'XTREAM'
                    ? playlistInfo.connectionStatus === 'error'
                      ? 'Hors ligne'
                      : 'En ligne'
                    : 'Locale'
                  }
                </Text>
              </View>
            </View>

            {/* Expiration */}
            {playlistInfo.expirationDate && (
              <View style={styles.mainInfoItem}>
                <View style={styles.infoIconContainer}>
                  <Icon name="timer" size={18} color={colors.accent.primary} />
                </View>
                <View style={styles.mainInfoText}>
                  <Text style={styles.mainInfoLabel}>Expiration</Text>
                  <Text style={styles.mainInfoValue}>{formatDate(playlistInfo.expirationDate)}</Text>
                </View>
              </View>
            )}

            {/* Connexions actives */}
            {playlistInfo.type === 'XTREAM' && (
              <View style={styles.mainInfoItem}>
                <View style={styles.infoIconContainer}>
                  <Icon name="device-hub" size={18} color={colors.primary || '#667eea'} />
                </View>
                <View style={styles.mainInfoText}>
                  <Text style={styles.mainInfoLabel}>Connexion active</Text>
                  <Text style={styles.mainInfoValue}>{playlistInfo.activeConnections}</Text>
                </View>
              </View>
            )}
          </View>

          </View>

        {/* Actions principales en grille */}
        <View style={styles.actionsGrid}>
          {/* Modifier le profil */}
          <TouchableOpacity style={styles.actionCard} onPress={() => setShowEditModal(true)}>
            <Icon name="edit" size={24} color="#667eea" />
            <Text style={styles.actionCardTitle}>Modifier</Text>
          </TouchableOpacity>

          {/* Changer de thème */}
          <TouchableOpacity style={styles.actionCard} onPress={() => setShowThemePicker(true)}>
            <Icon name="brush" size={24} color="#9C27B0" />
            <Text style={styles.actionCardTitle}>Thème</Text>
          </TouchableOpacity>

          {/* Dupliquer le profil */}
          <TouchableOpacity style={styles.actionCard} onPress={handleDuplicateProfile}>
            <Icon name="file-copy" size={24} color="#4CAF50" />
            <Text style={styles.actionCardTitle}>Dupliquer</Text>
          </TouchableOpacity>

          {/* Définir par défaut */}
          {!currentProfile.isDefault && (
            <TouchableOpacity style={styles.actionCard} onPress={handleSetDefaultProfile}>
              <Icon name="star" size={24} color="#FF9800" />
              <Text style={styles.actionCardTitle}>Par défaut</Text>
            </TouchableOpacity>
          )}
        </View>

  
  
  
        {/* Section Actions irréversibles */}
        {allProfiles.length > 1 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="warning" size={20} color="#F44336" />
              <Text style={styles.sectionTitle}>Actions irréversibles</Text>
            </View>

            <View style={[styles.actionCardGeneral, styles.dangerCard]}>
              <TouchableOpacity
                style={styles.actionItem}
                onPress={handleDeleteProfile}
              >
                <View style={styles.actionLeft}>
                  <View style={styles.actionIcon}>
                    <Icon name="delete" size={24} color="#F44336" />
                  </View>
                  <Text style={[styles.actionTitle, { color: '#F44336' }]}>Supprimer le profil</Text>
                  <Text style={[styles.actionValue, { color: '#F44336', fontSize: 12, marginTop: 4 }]}>
                    Cette action est définitive
                  </Text>
                </View>
                <Icon name="arrow-forward" size={22} color="#F44336" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Espace en bas augmenté */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal grille d'avatars moderne avec flou parfait */}
      {showAvatarPicker && (
        <View style={styles.modalBlurOverlay}>
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="dark"
            blurAmount={5}
          />
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowAvatarPicker(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir un avatar</Text>
              <TouchableOpacity onPress={() => setShowAvatarPicker(false)}>
                <Icon name="close" size={22} color="#F44336" />
              </TouchableOpacity>
            </View>

            <View style={styles.avatarGrid}>
              {AVAILABLE_AVATARS.map((avatar) => (
                <TouchableOpacity
                  key={avatar}
                  style={[
                    styles.avatarOption,
                    currentProfile.avatar === avatar && styles.avatarSelected
                  ]}
                  onPress={() => handleAvatarChange(avatar)}
                >
                  <Text style={styles.avatarOptionText}>{avatar}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Modal aperçus de thèmes avec l'effet de flou parfait de ChannelsScreen */}
      {showThemePicker && (
        <View style={styles.modalBlurOverlay}>
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="dark"
            blurAmount={5}
          />
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowThemePicker(false)}
          />

          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir un thème</Text>
              <TouchableOpacity onPress={() => setShowThemePicker(false)}>
                <Icon name="close" size={22} color="#F44336" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.themeList}>
              {availableThemes.map((theme) => (
                <TouchableOpacity
                  key={theme.id}
                  style={[
                    styles.themeOption,
                    currentProfile.theme === theme.id && styles.themeSelected
                  ]}
                  onPress={() => handleThemeChange(theme.id)}
                >
                  {/* Aperçu visuel avec vraies couleurs */}
                  <View style={styles.themePreviewContainer}>
                    <View style={[styles.themePreviewBar, { backgroundColor: theme.colors.text.primary }]} />
                    <View style={[styles.themePreviewBar, { backgroundColor: theme.colors.text.secondary }]} />
                    <View style={[styles.themePreviewBar, { backgroundColor: theme.colors.background.primary }]} />
                  </View>

                  <View style={styles.themeInfo}>
                    <Text style={styles.themeName}>{theme.name}</Text>
                    <Text style={styles.themeDescription}>{theme.description}</Text>
                  </View>

                  {currentProfile.theme === theme.id && (
                    <Icon name="check-circle" size={26} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Modal switcher de profil */}
      <Modal
        visible={showProfileSwitcher}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowProfileSwitcher(false)}>
        <View style={styles.modalBlurOverlay}>
          <View style={styles.switcherModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir un profil</Text>
              <TouchableOpacity onPress={() => setShowProfileSwitcher(false)}>
                <Icon name="close" size={22} color="#F44336" />
              </TouchableOpacity>
            </View>

            <View style={styles.profilesGrid}>
              {allProfiles.map((profile) => (
                <TouchableOpacity
                  key={profile.id}
                  style={[
                    styles.profileItemCompact,
                    currentProfile?.id === profile.id && styles.profileCompactSelected
                  ]}
                  onPress={() => handleProfileSwitch(profile)}>
                  <View style={styles.avatarCompact}>
                    <Text style={styles.avatarCompactText}>{profile.avatar}</Text>
                    {currentProfile?.id === profile.id && (
                      <View style={styles.selectedRing} />
                    )}
                  </View>
                  <Text style={styles.profileNameCompact} numberOfLines={1}>{profile.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal édition profil */}
      <ProfileManagementModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        onProfilesChanged={loadProfileData}
        profileToEdit={currentProfile}
      />
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    paddingTop: 40,
    paddingBottom: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  profileCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 24,
    padding: 28,
    marginBottom: 24,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },

  // Avatar centré et design moderne
  profileCentered: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarCenteredContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarCenteredText: {
    fontSize: 64,
    width: 100,
    height: 100,
    textAlign: 'center',
    lineHeight: 100,
    color: colors.text.primary,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  avatarCenteredEdit: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: colors.accent.primary || '#FF9800',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.background.secondary,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  profileCenteredName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  profileCenteredMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  kidsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9800',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },

  // Statistiques rapides
  profileQuickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    marginBottom: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  quickStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginVertical: 4,
  },
  quickStatLabel: {
    fontSize: 11,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  quickStatDivider: {
    width: 1,
    backgroundColor: colors.ui.border,
    marginVertical: 8,
  },

  // Détails du profil
  profileDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginLeft: 8,
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: 8,
  },
  actionCardGeneral: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    marginBottom: 8,
  },
  dangerCard: {
    backgroundColor: 'rgba(244, 67, 54, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.2)',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.ui.border,
  },
  disabledAction: {
    opacity: 0.6,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  actionValue: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 1,
  },
  dangerAction: {
    backgroundColor: 'rgba(244, 67, 54, 0.05)',
  },
  actionButton: {
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    color: colors.text.primary,
    marginTop: 20,
    marginBottom: 30,
    textAlign: 'center',
  },

  // Modal styles avec l'effet de flou parfait de ChannelsScreen
  modalBlurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1500, // Réduit pour ne pas dépasser player fullscreen
  },
  modalContent: {
    backgroundColor: colors.background.secondary || 'rgba(255, 255, 255, 0.98)',
    borderRadius: 24,
    padding: 10,
    width: '92%',
    maxWidth: 450,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 30,
    transform: [{translateY: -2}],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.ui.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
  },

  // Grille d'avatars moderne
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 5,
    justifyContent: 'center',
  },
  avatarOption: {
    width: 55,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 27,
    margin: 5,
    backgroundColor: colors.background.primary,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
  },
  avatarOptionText: {
    fontSize: 26,
  },
  
  // Aperçus de thèmes
  themeList: {
    padding: 10,
    maxHeight: 400,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  themeSelected: {
    backgroundColor: 'rgba(102, 126, 234, 0.15)',
    borderColor: colors.primary,
  },
  themePreviewContainer: {
    width: 50,
    height: 35,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: 2,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  themePreviewBar: {
    height: 9,
    borderRadius: 2,
  },
  themeInfo: {
    flex: 1,
  },
  themeName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  themeDescription: {
    fontSize: 11,
    color: colors.text.secondary,
  },

  // Modal switcher de profil
  switcherModal: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  profilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    maxHeight: 400,
    gap: 20,
  },
  profileItemCompact: {
    alignItems: 'center',
    marginHorizontal: 10,
    marginVertical: 10,
  },
  profileCompactSelected: {
    transform: [{ scale: 1.1 }],
  },
  avatarCompact: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  avatarCompactText: {
    fontSize: 24,
    color: 'white',
  },
  selectedRing: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  profileNameCompact: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.primary,
    textAlign: 'center',
    maxWidth: 70,
  },
  profileOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: colors.background.primary,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  profileSelected: {
    backgroundColor: 'rgba(102, 126, 234, 0.15)',
    borderColor: colors.primary,
  },
  profileOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileAvatar: {
    fontSize: 28,
    marginRight: 12,
  },
  profileOptionInfo: {
    flex: 1,
  },
  profileOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  profileOptionMeta: {
    flexDirection: 'row',
    gap: 6,
  },
  smallKidsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  smallDefaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },

  // Styles pour layout paysage inspirés de prop2-cards
  profileCardLandscape: {
    backgroundColor: colors.background.secondary,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  profileLandscapeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarLandscapeContainer: {
    position: 'relative',
    width: 80,
    height: 80,
  },
  avatarLandscapeText: {
    fontSize: 40,
    textAlign: 'center',
    textAlignVertical: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    overflow: 'hidden',
  },
  avatarLandscapeEdit: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    backgroundColor: '#FF9800',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.background.secondary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  profileLandscapeInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  profileLandscapeName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 6,
  },
  profileLandscapeMeta: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  profileLandscapeDetails: {
    gap: 2,
  },
  profileLandscapeStat: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  profileLandscapeActions: {
    alignItems: 'center',
    gap: 8,
  },
  quickActionBtn: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    minWidth: 60,
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.primary,
    marginTop: 2,
  },

  // Grille de 3 cartes horizontales pour paysage
  cardsGridLandscape: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  landscapeCard: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  cardContent: {
    flex: 1,
  },
  bigStat: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: colors.text.secondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subStat: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.primary,
  },
  settingText: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
    marginLeft: 12,
  },
  settingArrow: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  cardActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(102, 126, 234, 0.15)',
    marginBottom: 6,
    gap: 6,
  },
  cardActionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primary,
  },

  // Nouveaux styles pour le design moderne
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.secondary,
    borderRadius: 18,
    padding: 20,
    marginBottom: 18,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.2)',
    marginRight: 32,
  },
  avatarText: {
    fontSize: 42,
    color: colors.primary || '#667eea',
  },
  avatarEdit: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.background.secondary,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 6,
  },
  profileBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
  },
  switchProfileBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(102, 126, 234, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.3)',
  },

  // Nouveaux styles pour la carte d'abonnement
  subscriptionCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.12)',
  },
  playlistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  playlistInfoContainer: {
    flex: 1,
    marginLeft: 14,
  },
  playlistName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 5,
    lineHeight: 22,
    letterSpacing: -0.15,
  },
  playlistSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    alignSelf: 'flex-start',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    gap: 5,
  },
  typeBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    marginBottom: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    padding: 10,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  infoTextContainer: {
    marginLeft: 10,
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: colors.text.tertiary || colors.text.secondary,
    marginBottom: 3,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.25,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    lineHeight: 17,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
  },
  footerInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(102, 126, 234, 0.08)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginLeft: 8,
  },
  footerInfoText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  playlistIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Grille d'actions
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    width: '30%',
    aspectRatio: 1.1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
  },
  actionCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 6,
  },

  // Nouveaux styles pour la section playlist améliorée
  playlistIconLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary || '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  mainInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 16,
  },
  mainInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mainInfoText: {
    flex: 1,
  },
  mainInfoLabel: {
    fontSize: 10,
    color: colors.text.tertiary || colors.text.secondary,
    marginBottom: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  mainInfoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
    lineHeight: 16,
  },
  });

export default AccountInfoScreen;