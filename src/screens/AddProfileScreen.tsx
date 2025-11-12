/**
 * ➕ AddProfileScreen - Écran de création de profil simplifié
 * Flux direct : Avatar + Nom → Créer
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import type {RootStackParamList} from '../types';
import {useThemeColors} from '../contexts/ThemeContext';
import {useAlert} from '../contexts/AlertContext';
import ProfileService, {AVAILABLE_AVATARS} from '../services/ProfileService';
import AvatarPickerModal from '../components/AvatarPickerModal';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const AddProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const colors = useThemeColors();
  const {showAlert} = useAlert();

  const [profileName, setProfileName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVAILABLE_AVATARS[0]); // 👤 par défaut
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [setAsDefault, setSetAsDefault] = useState(false);

  const handleCreateProfile = async () => {
    if (!profileName.trim()) {
      showAlert('Erreur', 'Veuillez entrer un nom de profil');
      return;
    }

    try {
      setIsCreating(true);

      // Créer le profil
      const newProfile = await ProfileService.createProfile(
        profileName.trim(),
        selectedAvatar,
      );

      // Si défini comme par défaut, le marquer
      if (setAsDefault) {
        await ProfileService.setDefaultProfile(newProfile.id);
      }

      showAlert('Succès', 'Profil créé avec succès', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      console.error('❌ Erreur création profil:', error);
      showAlert('Erreur', error.message || 'Impossible de créer le profil');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <LinearGradient
      colors={colors.background.gradient}
      style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Header avec bouton retour */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: colors.text.primary}]}>
          Ajouter un profil
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <Text style={[styles.sectionTitle, {color: colors.text.secondary}]}>
              Avatar du profil
            </Text>

            <View style={styles.avatarContainer}>
              {/* Avatar circulaire */}
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

              {/* Icône crayon en overlay */}
              <TouchableOpacity
                style={[styles.editIcon, {backgroundColor: colors.accent.info}]}
                onPress={() => setShowAvatarPicker(true)}>
                <Icon name="edit" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <Text style={[styles.avatarHint, {color: colors.text.tertiary}]}>
              Appuyez sur le crayon pour changer
            </Text>
          </View>

          {/* Nom Section */}
          <View style={styles.nameSection}>
            <View style={styles.inputWrapper}>
              <Text
                style={[styles.sectionTitle, {color: colors.text.secondary}]}>
                Nom du profil
              </Text>

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface.secondary,
                    borderColor: colors.ui.border,
                    color: colors.text.primary,
                  },
                ]}
                placeholder="Entrez un nom"
                placeholderTextColor={colors.text.placeholder}
                value={profileName}
                onChangeText={setProfileName}
                maxLength={20}
                autoFocus
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={handleCreateProfile}
                selectTextOnFocus
                clearButtonMode="while-editing"
              />

              {/* Astuce clavier */}
              <View style={styles.keyboardHint}>
                <Icon name="keyboard" size={14} color={colors.text.secondary} />
                <Text style={[styles.keyboardHintText, {color: colors.text.secondary}]}>
                  Appuyez sur "Entrée" pour créer rapidement
                </Text>
              </View>

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
                  Définir comme profil par défaut
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Boutons */}
          <View style={styles.buttonWrapper}>
            {/* Bouton Créer */}
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
                {isCreating ? 'Création...' : 'Créer le profil'}
              </Text>
            </TouchableOpacity>

            {/* Bouton Annuler */}
            <TouchableOpacity
              style={[
                styles.cancelButton,
                {
                  backgroundColor: colors.surface.secondary,
                  borderColor: colors.ui.border,
                },
              ]}
              onPress={() => navigation.goBack()}>
              <Text
                style={[
                  styles.cancelButtonText,
                  {color: colors.text.secondary},
                ]}>
                {tCommon('cancel')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal de sélection d'avatar */}
      <AvatarPickerModal
        visible={showAvatarPicker}
        selectedAvatar={selectedAvatar}
        onSelect={setSelectedAvatar}
        onClose={() => setShowAvatarPicker(false)}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
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

  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },

  // Avatar Section - Compact
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  avatarHint: {
    fontSize: 11,
    fontStyle: 'italic',
  },

  // Nom Section - Compact avec centrage
  nameSection: {
    marginBottom: 24,
    alignItems: 'center',
    width: '100%',
  },
  inputWrapper: {
    width: '85%',
    alignSelf: 'center',
  },
  input: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 2,
    marginBottom: 8,
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

  // Astuce clavier
  keyboardHint: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 4,
    paddingVertical: 6,
    marginTop: 4,
    marginBottom: 8,
    gap: 6,
  },
  keyboardHintText: {
    fontSize: 12,
    fontStyle: 'italic',
  },

  // Boutons - Compact avec centrage
  buttonWrapper: {
    width: '85%',
    alignSelf: 'center',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
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
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default AddProfileScreen;
