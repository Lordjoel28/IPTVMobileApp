/**
 * ➕ AddProfileModal - Écran plein de création de profil
 * Style fullscreen moderne inspiré de Netflix
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Modal,
  ScrollView,
  StyleSheet as RNStyleSheet,
} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useThemeColors} from '../contexts/ThemeContext';
import {useI18n} from '../hooks/useI18n';
import {useAlert} from '../contexts/AlertContext';
import ProfileService, {AVAILABLE_AVATARS} from '../services/ProfileService';
import AvatarPickerModal from './AvatarPickerModal';

interface AddProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onProfileCreated?: () => void;
}

const AddProfileModal: React.FC<AddProfileModalProps> = ({
  visible,
  onClose,
  onProfileCreated,
}) => {
  const colors = useThemeColors();
  const {t: tCommon} = useI18n('common');
  const {t: tProfiles} = useI18n('profiles');
  const {showAlert} = useAlert();

  const [profileName, setProfileName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVAILABLE_AVATARS[0]); // 👤 par défaut
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [isKids, setIsKids] = useState(false);

  const handleCreateProfile = async () => {
    if (!profileName.trim()) {
      showAlert(tCommon('error'), tProfiles('pleaseEnterProfileName'));
      return;
    }

    try {
      setIsCreating(true);

      // Catégories bloquées par défaut pour profil enfant
      // 🚨 Liste exhaustive pour couvrir toutes les variations possibles
      const blockedCategories = isKids ? [
        'Adulte', 'XXX', '+18', '18+', 'Adult', 'ADULT',
        'Erotic', 'Erotique', 'Mature', 'Mature 18+',
        'Porn', 'Porno', 'Sex', 'NSFW', 'For Adults Only',
        'XXX FOR ADULT', 'XXX FOR ADULTS', 'ADULT +18', 'ADULTS ONLY',
        'XX | FOR ADULT', 'XXX|', 'ADULT XXX', 'PORN XXX', 'SEX XXX',
        'FOR ADULTS', 'ADULTS ONLY', 'PORN ONLY', 'HARDCORE', 'EXPLICIT'
      ] : [];

      // Créer le profil
      const newProfile = await ProfileService.createProfile(
        profileName.trim(),
        selectedAvatar,
        undefined,
        isKids,
        blockedCategories,
      );

      // Si défini comme par défaut, le marquer
      if (setAsDefault) {
        await ProfileService.setDefaultProfile(newProfile.id);
      }

      showAlert(tCommon('success'), tProfiles('profileCreatedSuccess'), [
        {
          text: 'OK',
          onPress: () => {
            // Reset et fermer
            setProfileName('');
            setSelectedAvatar(AVAILABLE_AVATARS[0]);
            setSetAsDefault(false);
            setIsKids(false);
            if (onProfileCreated) {
              onProfileCreated();
            }
            onClose();
          },
        },
      ]);
    } catch (error: any) {
      console.error('❌ Erreur création profil:', error);
      showAlert(tCommon('error'), error.message || tProfiles('errorCreatingProfile'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setProfileName('');
    setSelectedAvatar(AVAILABLE_AVATARS[0]);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}>
      <LinearGradient
        colors={colors.background.gradient}
        style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />

        {/* Header compact */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, {color: colors.text.primary}]}>
            {tProfiles('addProfile')}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Contenu scrollable */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <View
                style={[
                  styles.avatarCircle,
                  {
                    backgroundColor: colors.surface.primary,
                    borderColor: colors.ui.border,
                  },
                ]}>
                <Text style={styles.avatarEmoji}>{selectedAvatar}</Text>
              </View>

              <TouchableOpacity
                style={[styles.editIcon, {backgroundColor: colors.accent.info}]}
                onPress={() => setShowAvatarPicker(true)}>
                <Icon name="edit" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Formulaire */}
          <View style={styles.formSection}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface.secondary,
                    borderColor: colors.ui.border,
                    color: colors.text.primary,
                  },
                ]}
                placeholder={tProfiles('profileNamePlaceholder')}
                placeholderTextColor={colors.text.placeholder}
                value={profileName}
                onChangeText={setProfileName}
                maxLength={20}
                returnKeyType="done"
                blurOnSubmit={true}
              />

              {/* Option profil par défaut - alignée à gauche */}
              <TouchableOpacity
                style={styles.defaultOption}
                onPress={() => setSetAsDefault(!setAsDefault)}
                activeOpacity={0.7}>
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: colors.ui.border,
                      backgroundColor: setAsDefault
                        ? colors.accent.primary
                        : 'transparent',
                    },
                  ]}>
                  {setAsDefault && (
                    <Icon name="check" size={16} color="#ffffff" />
                  )}
                </View>
                <Text
                  style={[styles.defaultText, {color: colors.text.primary}]}>
                  {tProfiles('setAsDefaultProfile')}
                </Text>
              </TouchableOpacity>

              {/* Option profil enfant */}
              <TouchableOpacity
                style={styles.defaultOption}
                onPress={() => setIsKids(!isKids)}
                activeOpacity={0.7}>
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: colors.ui.border,
                      backgroundColor: isKids
                        ? colors.accent.warning
                        : 'transparent',
                    },
                  ]}>
                  {isKids && (
                    <Icon name="child-care" size={16} color="#ffffff" />
                  )}
                </View>
                <Text
                  style={[styles.defaultText, {color: colors.text.primary}]}>
                  {tProfiles('kidsProfileDesc')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Boutons */}
          <View style={styles.buttonsSection}>
            <View style={styles.buttonWrapper}>
              <TouchableOpacity
                style={[
                  styles.createButton,
                  {
                    backgroundColor: profileName.trim()
                      ? colors.accent.success
                      : colors.surface.secondary,
                  },
                  isCreating && {opacity: 0.6},
                ]}
                onPress={handleCreateProfile}
                disabled={!profileName.trim() || isCreating}>
                <Icon
                  name={isCreating ? 'hourglass-empty' : 'check'}
                  size={18}
                  color="#ffffff"
                />
                <Text style={styles.createButtonText}>
                  {isCreating ? tProfiles('creating') : tProfiles('createProfile')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  {
                    backgroundColor: colors.surface.secondary,
                    borderColor: colors.ui.border,
                  },
                ]}
                onPress={handleClose}>
                <Text
                  style={[
                    styles.cancelButtonText,
                    {color: colors.text.secondary},
                  ]}>
                  {tCommon('cancel')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>

      <AvatarPickerModal
        visible={showAvatarPicker}
        selectedAvatar={selectedAvatar}
        onSelect={setSelectedAvatar}
        onClose={() => setShowAvatarPicker(false)}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header ultra compact - taille réduite
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: (StatusBar.currentHeight || 0) + 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 30,
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },

  // Avatar Section - Compact
  avatarSection: {
    alignItems: 'center',
    paddingTop: 12,
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  avatarEmoji: {
    fontSize: 50,
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },

  // Form Section - Compact avec centrage
  formSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  inputWrapper: {
    width: '85%',
    alignSelf: 'center',
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 2,
    marginBottom: 8,
    width: '100%',
  },

  // Option profil par défaut - alignée à gauche
  defaultOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
    alignSelf: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Buttons Section - Compact avec centrage
  buttonsSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: 'center',
  },
  buttonWrapper: {
    width: '85%',
    alignSelf: 'center',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
    marginBottom: 10,
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  cancelButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Styles pour l'effet flou parfait (au cas où)
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
});

export default AddProfileModal;
