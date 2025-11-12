/**
 * 👤 ProfileSelectionScreen - Écran de sélection de profil (Redesign Compact)
 * Style Netflix/Disney+ - Grille 5 colonnes avec scroll, indicateur profil actif
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Dimensions,
  StatusBar,
  Modal,
  Alert,
  StyleSheet as RNStyleSheet,
} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ProfileService from '../services/ProfileService';
import type {Profile} from '../types';
import {useThemeColors} from '../contexts/ThemeContext';
import {useI18n} from '../hooks/useI18n';
import SimplePinModal from '../components/SimplePinModal';

const {width} = Dimensions.get('window');

interface ProfileSelectionScreenProps {
  onProfileSelect: (profile: Profile) => void;
  onManageProfiles?: () => void;
  onOpenPlaylists?: () => void;
  onAddProfile?: () => void; // Nouvelle fonction pour ajouter un profil
  onEditProfile?: (profile: Profile) => void; // Nouvelle fonction pour éditer un profil
  refreshKey?: number; // Clé de rafraîchissement - change quand les profils sont modifiés
}

const ProfileSelectionScreen: React.FC<ProfileSelectionScreenProps> = ({
  onProfileSelect,
  onManageProfiles,
  onOpenPlaylists,
  onAddProfile,
  onEditProfile,
  refreshKey,
}) => {
  const colors = useThemeColors();
  const {t: tCommon} = useI18n('common');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);

  // États pour le modal PIN parental
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinModalTargetProfile, setPinModalTargetProfile] = useState<Profile | null>(null);

  useEffect(() => {
    loadProfiles();
    loadCurrentProfile();
  }, []);

  // Rafraîchir les profils quand refreshKey change
  useEffect(() => {
    if (refreshKey !== undefined && refreshKey > 0) {
      loadProfiles();
      loadCurrentProfile(); // Recharger aussi le profil actuel
    }
  }, [refreshKey]);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const allProfiles = await ProfileService.getAllProfiles();
      setProfiles(allProfiles);
    } catch (error) {
      console.error('❌ Erreur chargement profils:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentProfile = async () => {
    try {
      const activeProfile = await ProfileService.getActiveProfile();
      setCurrentProfile(activeProfile);
    } catch (error) {
      console.error('Erreur chargement profil actuel:', error);
    }
  };

  /**
   * Vérifie si un PIN parental est requis pour le changement de profil
   */
  const requireParentalPinForSwitch = (targetProfile: Profile): boolean => {
    if (!currentProfile) {
      return false; // Pas de profil actuel, pas de restriction
    }

    const currentProfileType = currentProfile.isKids ? 'child' : 'adult';
    const targetProfileType = targetProfile.isKids ? 'child' : 'adult';

    // 🔒 PIN requis uniquement si: enfant -> adulte
    const pinRequired = currentProfileType === 'child' && targetProfileType === 'adult';

    
    return pinRequired;
  };

  const handleProfilePress = async (profile: Profile) => {
    try {
      // 🔒 NOUVEAU: Contrôle parental anti-switch (enfant -> adulte)
      if (requireParentalPinForSwitch(profile)) {
        setPinModalTargetProfile(profile);
        setShowPinModal(true);
        return; // 👑 BLOQUER ici - attendre la validation PIN via modal
      }

      // 🆕 Vérifier si le profil requiert un PIN (anti-switch comme Disney+)
      if (profile.requiresPinToAccess) {
        Alert.prompt(
          'PIN requis',
          `Entrez le PIN pour accéder au profil ${profile.name}`,
          [
            {
              text: tCommon('cancel'),
              style: 'cancel',
            },
            {
              text: 'Confirmer',
              onPress: async (pin?: string) => {
                if (!pin) {
                  Alert.alert('Erreur', 'Veuillez entrer un PIN');
                  return;
                }

                // Vérifier le PIN du profil
                const isValid = await ProfileService.verifyProfileAccessPin(profile.id, pin);
                if (!isValid) {
                  Alert.alert('Erreur', 'PIN incorrect');
                  return;
                }

                // PIN valide, continuer la sélection
                await continueProfileSelectionAfterValidation(profile);
              },
            },
          ],
          'secure-text',
        );
        return;
      }

      // Pas de PIN requis, continuer directement
      await continueProfileSelection(profile);
    } catch (error) {
      console.error('❌ Erreur sélection profil:', error);
    }
  };

  /**
   * Continuer la sélection de profil après vérification PIN
   */
  const continueProfileSelection = async (profile: Profile) => {
    await ProfileService.setActiveProfile(profile.id);

    // 🔑 Nettoyer le store des récents lors du changement de profil
    const {clearRecentChannels} = (
      await import('../stores/RecentChannelsStore')
    ).useRecentChannelsStore.getState();
    clearRecentChannels();

    onProfileSelect(profile);
  };

  /**
   * Continuer la sélection de profil après validation PIN (contrôle parental)
   */
  const continueProfileSelectionAfterValidation = async (profile: Profile) => {
    // Réutiliser la logique existante de changement de profil
    await continueProfileSelection(profile);
  };

  const handleCreateProfile = () => {
    // Appeler la fonction callback si fournie, sinon utiliser onManageProfiles
    if (onAddProfile) {
      onAddProfile();
    } else if (onManageProfiles) {
      onManageProfiles();
    }
  };

  const handleLongPress = (profile: Profile) => {
    setSelectedProfile(profile);
    setShowOptionsMenu(true);
  };

  const handleSetAsDefault = async () => {
    if (!selectedProfile) {
      return;
    }
    try {
      await ProfileService.setDefaultProfile(selectedProfile.id);
      await loadProfiles(); // Recharger pour mettre à jour l'affichage
      setShowOptionsMenu(false);
      setSelectedProfile(null);
    } catch (error) {
      console.error('❌ Erreur définition profil par défaut:', error);
    }
  };

  const handleEditProfile = () => {
    setShowOptionsMenu(false);
    if (onEditProfile && selectedProfile) {
      onEditProfile(selectedProfile);
    } else if (onManageProfiles) {
      onManageProfiles();
    }
  };

  const handleDeleteProfile = async () => {
    if (!selectedProfile) {
      return;
    }
    try {
      await ProfileService.deleteProfile(selectedProfile.id);
      await loadProfiles();
      setShowOptionsMenu(false);
      setSelectedProfile(null);
    } catch (error) {
      console.error('❌ Erreur suppression profil:', error);
    }
  };

  if (loading) {
    return (
      <LinearGradient
        colors={colors.background.gradient}
        style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />
        <View style={styles.centerContainer}>
          <Icon name="refresh" size={48} color={colors.text.tertiary} />
          <Text style={[styles.loadingText, {color: colors.text.secondary}]}>
            Chargement...
          </Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={colors.background.gradient}
      style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Header avec titre centré et boutons à droite */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          {/* Espace gauche vide pour équilibrer */}
          <View style={styles.headerLeft} />

          {/* Centre: Titre */}
          <View style={styles.headerCenter}>
            <Text style={[styles.title, {color: colors.text.primary}]}>
              {tCommon('whoIsWatching')}
            </Text>
          </View>

          {/* Bouton droite: Changer de liste */}
          <View style={styles.headerRight}>
            {onOpenPlaylists && (
              <Pressable
                style={({pressed}) => [
                  styles.headerButton,
                  {backgroundColor: colors.surface.secondary},
                  pressed && {opacity: 0.7},
                ]}
                onPress={onOpenPlaylists}>
                <Icon
                  name="playlist-play"
                  size={20}
                  color={colors.accent.primary}
                />
                <Text
                  style={[
                    styles.headerButtonText,
                    {color: colors.text.primary},
                  ]}>
                  {tCommon('changePlaylist')}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/* Grille de profils */}
      <View style={styles.contentContainer}>
        <View style={styles.profilesGrid}>
          {profiles.map(profile => (
            <Pressable
              key={profile.id}
              style={({pressed}) => [
                styles.profileItem,
                pressed && {transform: [{scale: 0.92}]},
              ]}
              onPress={() => handleProfilePress(profile)}
              onLongPress={() => handleLongPress(profile)}>
              {/* Avatar circulaire simple */}
              <View
                style={[
                  styles.avatarCircle,
                  {
                    backgroundColor: colors.surface.primary,
                    borderColor: profile.isDefault
                      ? colors.accent.success
                      : colors.ui.border,
                    borderWidth: profile.isDefault ? 3 : 2,
                  },
                ]}>
                <Text style={styles.avatarEmoji}>{profile.avatar}</Text>
                {/* Indicateur profil par défaut uniquement */}
                {profile.isDefault && (
                  <View
                    style={[
                      styles.activeIndicator,
                      {backgroundColor: colors.accent.success},
                    ]}>
                    <Icon name="check" size={14} color="#ffffff" />
                  </View>
                )}
              </View>
              {/* Nom du profil */}
              <View style={styles.profileNameContainer}>
                <Text
                  style={[styles.profileName, {color: colors.text.primary}]}
                  numberOfLines={1}>
                  {profile.name}
                </Text>
                {/* Badge Enfant */}
                {profile.isKids && (
                  <View
                    style={[
                      styles.kidsBadge,
                      {backgroundColor: colors.accent.warning},
                    ]}>
                    <Icon name="child-care" size={10} color="#ffffff" />
                  </View>
                )}
              </View>
            </Pressable>
          ))}

          {/* Bouton Nouveau profil */}
          <Pressable
            style={({pressed}) => [
              styles.profileItem,
              pressed && {transform: [{scale: 0.92}]},
            ]}
            onPress={handleCreateProfile}>
            <View
              style={[
                styles.addCircle,
                {
                  backgroundColor: colors.surface.secondary,
                  borderColor: colors.accent.success,
                },
              ]}>
              <Icon name="add" size={40} color={colors.accent.success} />
            </View>
            <Text
              style={[styles.addProfileText, {color: colors.accent.success}]}>
              Nouveau
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Menu d'options avec effet flou parfait */}
      <Modal
        visible={showOptionsMenu}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowOptionsMenu(false)}>
        <View style={styles.modalBlurOverlay}>
          <BlurView
            style={RNStyleSheet.absoluteFill}
            blurType="dark"
            blurAmount={5}
          />
          <TouchableOpacity
            style={RNStyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowOptionsMenu(false)}
          />
          <View style={styles.modalContainer}>
            <View
              style={[
                styles.optionsMenu,
                {backgroundColor: colors.surface.overlay},
              ]}>
              {/* Header du menu */}
              <View style={styles.menuHeader}>
                <Text
                  style={[styles.menuTitle, {color: colors.text.primary}]}>
                  {selectedProfile?.name}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowOptionsMenu(false)}
                  style={styles.closeButton}>
                  <Icon
                    name="close"
                    size={22}
                    color={colors.text.secondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Options */}
              <View style={styles.menuOptions}>
                {/* Définir comme défaut */}
                {!selectedProfile?.isDefault && (
                  <TouchableOpacity
                    style={[
                      styles.menuOption,
                      {borderBottomColor: colors.ui.border},
                    ]}
                    onPress={handleSetAsDefault}>
                    <Icon
                      name="check-circle"
                      size={24}
                      color={colors.accent.success}
                    />
                    <Text
                      style={[
                        styles.menuOptionText,
                        {color: colors.text.primary},
                      ]}>
                      {tCommon('setAsDefaultProfileOption')}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Éditer */}
                <TouchableOpacity
                  style={[
                    styles.menuOption,
                    {borderBottomColor: colors.ui.border},
                    ]}
                    onPress={handleEditProfile}>
                  <Icon name="edit" size={24} color={colors.accent.info} />
                  <Text
                    style={[
                      styles.menuOptionText,
                      {color: colors.text.primary},
                    ]}>
                    {tCommon('editProfileOption')}
                  </Text>
                </TouchableOpacity>

                {/* Supprimer */}
                <TouchableOpacity
                  style={styles.menuOption}
                  onPress={handleDeleteProfile}>
                  <Icon name="delete" size={24} color={colors.accent.error} />
                  <Text
                    style={[
                      styles.menuOptionText,
                      {color: colors.text.primary},
                    ]}>
                      {tCommon('deleteProfileOption')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
      </Modal>

      {/* Modal PIN parental pour contrôle anti-switch */}
      <SimplePinModal
        visible={showPinModal}
        profile={pinModalTargetProfile}
        reason={tCommon('parentalPinRequired')}
        onClose={() => {
          setShowPinModal(false);
          setPinModalTargetProfile(null);
        }}
        onSuccess={async (verifiedPin) => {
          setShowPinModal(false);

          // Continuer le changement de profil
          if (pinModalTargetProfile) {
            await continueProfileSelectionAfterValidation(pinModalTargetProfile);
            setPinModalTargetProfile(null);
          }
        }}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
  header: {
    paddingTop: (StatusBar.currentHeight || 0) + 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  headerButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  profilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
    maxWidth: 700,
  },
  profileItem: {
    alignItems: 'center',
    marginBottom: 16,
    width: (width - 140) / 5, // 5 colonnes
    maxWidth: 100,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  avatarEmoji: {
    fontSize: 42,
  },
  activeIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  profileName: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  kidsBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  addProfileText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Menu d'options avec effet flou parfait
  modalBlurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1500,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 420,
  },
  optionsMenu: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 20},
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 30,
    transform: [{translateY: -2}],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  menuOptions: {
    paddingVertical: 8,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
    borderBottomWidth: 1,
  },
  menuOptionText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
});

export default ProfileSelectionScreen;
