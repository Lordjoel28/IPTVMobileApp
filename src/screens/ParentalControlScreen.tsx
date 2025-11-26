/**
 * 🔒 IPTV Mobile App - Écran de Contrôle Parental REFONTE
 * Architecture Netflix-like avec 3 onglets:
 * 1. Mes Restrictions (profil actif)
 * 2. Tous les Profils (vue globale + toggle switch)
 * 3. Paramètres Globaux (PIN, désactivation)
 *
 * LOGIQUE SIMPLIFIÉE:
 * - Pas de propriétaire (owner supprimé)
 * - PIN parental global pour déverrouiller
 * - Profils standard: peuvent éditer avec PIN
 * - Profils enfants: lecture seule (même avec PIN)
 * - Toggle switch enfant: configurable par profil
 */

import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  Modal,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {Text, Button} from 'react-native-paper';
import {useTheme, useThemeColors} from '../contexts/ThemeContext';
import {useI18n} from '../hooks/useI18n';
import {useUISettings} from '../stores/UIStore';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import type {RootStackParamList} from '../../App';
import ParentalControlService from '../services/ParentalControlService';
import ProfileService from '../services/ProfileService';
import type {Profile, TemporaryUnlock} from '../types';
import {BlurView} from '@react-native-community/blur';

type ParentalControlScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'ParentalControl'
>;

const ParentalControlScreen: React.FC = () => {
  const {currentTheme} = useTheme();
  const colors = useThemeColors();
  const {t: tCommon} = useI18n('common');
  const {t: tSettings} = useI18n('settings');
  const {t: tProfiles} = useI18n('profiles');
  const {t: tParental} = useI18n('parental');
  const {t: tChannels} = useI18n('channels');
  const { getScaledTextSize } = useUISettings();
  const navigation = useNavigation<ParentalControlScreenNavigationProp>();

  // Styles pour les modaux avec effet flou parfait
  const modalStyles = createModalStyles(colors);

  // États généraux
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  // Onglets
  const [currentTab, setCurrentTab] = useState<'restrictions' | 'profiles' | 'settings'>('restrictions');

  // Déverrouillage PIN
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockPin, setUnlockPin] = useState('');


  // Modal changement PIN
  const [showChangePin, setShowChangePin] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  // Modal désactivation
  const [showDisablePin, setShowDisablePin] = useState(false);
  const [disablePin, setDisablePin] = useState('');

  // Modal configuration initiale PIN
  const [showInitialPinSetup, setShowInitialPinSetup] = useState(false);
  const [initialPin, setInitialPin] = useState('');
  const [initialPinConfirm, setInitialPinConfirm] = useState('');

  // Déverrouillages actifs
  const [activeUnlocks, setActiveUnlocks] = useState<Array<{profile: Profile, unlock: TemporaryUnlock}>>([]);
  const [showRevokePin, setShowRevokePin] = useState(false);
  const [revokePin, setRevokePin] = useState('');
  const [selectedUnlock, setSelectedUnlock] = useState<{profile: Profile, unlock: TemporaryUnlock} | null>(null);

  // Header collapsible - Animation fluide
  const [headerVisible, setHeaderVisible] = useState(true);
  const headerHeight = useRef(new Animated.Value(1)).current; // 1 = visible, 0 = hidden

  // Hauteur approximative du header : paddingTop(16) + paddingBottom(16) + icon(40) + title(36) + statusBadge(20) + margins ≈ 130
  const HEADER_HEIGHT = 130;

  // Styles dynamiques basés sur le thème
  const themedStyles = {
    container: {
      flex: 1,
    },
    header: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingHorizontal: currentTheme.spacing.md,
      paddingTop: currentTheme.spacing.md,
      paddingBottom: currentTheme.spacing.md,
      overflow: 'hidden' as const,
    },
    title: {
      fontSize: currentTheme.typography.sizes.xxl,
      fontWeight: '700' as const,
      marginTop: currentTheme.spacing.sm,
      marginBottom: currentTheme.spacing.sm,
    },
    statusBadge: {
      paddingHorizontal: currentTheme.spacing.sm,
      paddingVertical: currentTheme.spacing.xs,
      borderRadius: currentTheme.borderRadius.lg,
    },
    statusText: {
      fontSize: currentTheme.typography.sizes.xs,
      fontWeight: '600' as const,
    },
    tabBar: {
      flexDirection: 'row' as const,
      borderBottomWidth: 1,
      paddingHorizontal: currentTheme.spacing.sm,
    },
    tab: {
      flex: 1,
      alignItems: 'center' as const,
      paddingVertical: currentTheme.spacing.sm,
    },
    content: {
      flex: 1,
      padding: currentTheme.spacing.md,
    },
    card: {
      marginBottom: currentTheme.spacing.md,
      borderRadius: currentTheme.borderRadius.lg,
      elevation: 2,
    },
    sectionTitle: {
      fontSize: currentTheme.typography.sizes.xl,
      fontWeight: '700' as const,
      marginBottom: currentTheme.spacing.sm,
    },
    profileHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
    },
    restrictionItem: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingVertical: currentTheme.spacing.sm,
      borderBottomWidth: 1,
      gap: currentTheme.spacing.sm,
    },
    restrictionLabel: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500' as const,
    },
    restrictionValue: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    infoBox: {
      flexDirection: 'row' as const,
      padding: currentTheme.spacing.md,
      borderRadius: currentTheme.borderRadius.lg,
      gap: currentTheme.spacing.sm,
      alignItems: 'flex-start' as const,
    },
    infoText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 20,
    },
    tabDescription: {
      marginBottom: currentTheme.spacing.md,
      textAlign: 'center' as const,
    },
    profileRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
    },
    profileName: {
      fontSize: 16,
      fontWeight: '500' as const,
    },
    profileDetails: {
      fontSize: 12,
      marginTop: 2,
    },
    switchContainer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginTop: currentTheme.spacing.sm,
      paddingTop: currentTheme.spacing.sm,
      borderTopWidth: 1,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'transparent',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      padding: currentTheme.spacing.md,
    },
    modalContent: {
      width: '95%',
      maxWidth: 300,
      borderRadius: currentTheme.borderRadius.lg,
      padding: currentTheme.spacing.md,
      elevation: 8,
    },
    modalTitle: {
      fontSize: currentTheme.typography.sizes.lg,
      fontWeight: '700' as const,
      marginBottom: currentTheme.spacing.sm,
    },
    modalDescription: {
      fontSize: 14,
      lineHeight: 20,
      marginBottom: currentTheme.spacing.md,
    },
    pinInput: {
      borderWidth: 1,
      borderRadius: currentTheme.borderRadius.md,
      padding: currentTheme.spacing.sm,
      fontSize: 16,
      marginBottom: currentTheme.spacing.sm,
    },
    pinInputCompact: {
      borderWidth: 1,
      borderRadius: currentTheme.borderRadius.md,
      padding: currentTheme.spacing.sm,
      fontSize: 16,
      marginBottom: currentTheme.spacing.sm,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    unlockItem: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingVertical: currentTheme.spacing.sm,
      borderBottomWidth: 1,
      marginBottom: currentTheme.spacing.sm,
    },
    modalHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginBottom: currentTheme.spacing.sm,
    },
    modalActions: {
      flexDirection: 'row' as const,
      gap: currentTheme.spacing.sm,
      marginTop: currentTheme.spacing.md,
    },
    configButton: {
      padding: currentTheme.spacing.sm,
    },
  };

  useEffect(() => {
    console.log(`🎨 [ParentalControl] Text scale: ${getScaledTextSize(20)}`);
    loadData();
  }, []);

  // Animer le header lorsque la visibilité change
  useEffect(() => {
    Animated.timing(headerHeight, {
      toValue: headerVisible ? 1 : 0,
      duration: 200,
      useNativeDriver: false, // On utilise false car on anime la hauteur
    }).start();
  }, [headerVisible]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Vérifier configuration
      const configured = await ParentalControlService.isConfigured();
      setIsConfigured(configured);

      // Charger profils
      const allProfiles = await ProfileService.getAllProfiles();
      setProfiles(allProfiles);

      // Charger profil actif
      const currentProfile = await ProfileService.getActiveProfile();
      setActiveProfile(currentProfile);

      // Charger déverrouillages
      const unlocks = await ParentalControlService.getActiveUnlocks();
      setActiveUnlocks(unlocks);

    } catch (error) {
      console.error('❌ Error loading parental control data:', error);
      Alert.alert(tCommon('error'), tCommon('error'));
    } finally {
      setIsLoading(false);
    }
  };

  // ====================
  // GESTION DÉVERROUILLAGE
  // ====================

  const handleUnlock = async () => {
    if (!unlockPin || unlockPin.length !== 4) {
      Alert.alert(tCommon('error'), tParental('pleaseEnterPin'));
      return;
    }

    const isValid = await ParentalControlService.verifyPin(unlockPin);
    if (!isValid) {
      Alert.alert(tCommon('error'), tParental('incorrectPin'));
      setUnlockPin('');
      return;
    }

    setIsUnlocked(true);
    setShowUnlockModal(false);
    setUnlockPin('');
  };

  const promptUnlockIfNeeded = () => {
    if (!isConfigured) {
      return true; // Pas de PIN configuré
    }

    if (!isUnlocked) {
      setShowUnlockModal(true);
      return false;
    }

    return true;
  };

  // ====================
  // GESTION PIN PARENTAL
  // ====================

  const handleChangePin = async () => {
    if (!oldPin || !newPin || !confirmPin) {
      Alert.alert(tCommon('error'), tParental('fillAllFields'));
      return;
    }

    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      Alert.alert(tCommon('error'), tParental('pinMustBeFourDigits'));
      return;
    }

    if (newPin !== confirmPin) {
      Alert.alert(tCommon('error'), tParental('pinsDoNotMatch'));
      return;
    }

    const success = await ParentalControlService.changePin(oldPin, newPin);
    if (success) {
      setShowChangePin(false);
      setOldPin('');
      setNewPin('');
      setConfirmPin('');
      Alert.alert(tCommon('success'), tParental('pinChangedSuccessfully'));
    } else {
      Alert.alert(tCommon('error'), tParental('incorrectPin'));
    }
  };

  const handleDisableParentalControl = async () => {
    if (!disablePin || disablePin.length !== 4) {
      Alert.alert(tCommon('error'), tParental('pleaseEnterPin'));
      return;
    }

    const success = await ParentalControlService.removePin(disablePin);
    if (success) {
      setIsConfigured(false);
      setShowDisablePin(false);
      setDisablePin('');
      setIsUnlocked(false);
      Alert.alert(tCommon('success'), tParental('parentalControlDisabled'));
    } else {
      Alert.alert(tCommon('error'), tParental('incorrectPin'));
    }
  };

  const handleInitialPinSetup = async () => {
    if (!initialPin || !initialPinConfirm) {
      Alert.alert(tCommon('error'), tParental('fillAllFields'));
      return;
    }

    if (initialPin.length !== 4 || !/^\d{4}$/.test(initialPin)) {
      Alert.alert(tCommon('error'), tParental('pinMustBeFourDigits'));
      return;
    }

    if (initialPin !== initialPinConfirm) {
      Alert.alert(tCommon('error'), tParental('pinsDoNotMatch'));
      return;
    }

    const success = await ParentalControlService.setPin(initialPin);
    if (success) {
      setShowInitialPinSetup(false);
      setInitialPin('');
      setInitialPinConfirm('');
      setIsConfigured(true);
      setIsUnlocked(true); // Auto-déverrouiller après configuration
      Alert.alert(tCommon('success'), tParental('pinConfiguredSuccessfully'));
      loadData();
    } else {
      Alert.alert(tCommon('error'), tParental('errorConfiguringPin'));
    }
  };

  // ====================
  // GESTION DÉVERROUILLAGES TEMPORAIRES
  // ====================

  const handleRevokeUnlock = async () => {
    if (!revokePin || !selectedUnlock) return;

    const success = await ParentalControlService.revokeUnlock(
      selectedUnlock.profile,
      revokePin
    );
    if (success) {
      loadData();
      setShowRevokePin(false);
      setSelectedUnlock(null);
      setRevokePin('');
      Alert.alert(tCommon('success'), tParental('unlockRevoked'));
    } else {
      Alert.alert(tCommon('error'), tParental('incorrectPin'));
    }
  };

  // ====================
  // 🔒 GESTION PARAMÈTRES DE SÉCURITÉ
  // ====================

  const handleSecuritySettingChange = async (
    setting: 'requirePinForSettings' | 'requireModalForProfile' | 'requireModalForPlaylist',
    value: boolean
  ) => {
    if (!activeProfile) {
      Alert.alert(tCommon('error'), tParental('noActiveProfile'));
      return;
    }

    // Demander une confirmation
    Alert.alert(
      tParental('confirmSecurityChange'),
      `${value ? tParental('enableSecuritySetting') : tParental('disableSecuritySetting')} "${tParental(setting)}"`,
      [
        {text: tCommon('cancel'), style: 'cancel'},
        {
          text: tCommon('ok'),
          onPress: async () => {
            try {
              const success = await ParentalControlService.updateSecuritySettings(
                activeProfile.id,
                { [setting]: value }
              );

              if (success) {
                loadData(); // Recharger les données
                Alert.alert(
                  tCommon('success'),
                  `${tParental('securitySettingUpdated')}: ${tParental(setting)}`
                );
              } else {
                Alert.alert(
                  tCommon('error'),
                  tParental('securitySettingUpdateFailed')
                );
              }
            } catch (error) {
              console.error('❌ Erreur mise à jour paramètre sécurité:', error);
              Alert.alert(
                tCommon('error'),
                tParental('securitySettingUpdateFailed')
              );
            }
          }
        }
      ]
    );
  };

  // ====================
  // GESTION CONFIGURATION PROFIL
  // ====================

  const openProfileConfig = (profile: Profile) => {
    // Navigation directe vers les catégories à bloquer (seule fonction restante)
    navigation.navigate('CategoriesSelection', {profileId: profile.id});
  };

  const toggleSwitchLock = async (profile: Profile, enabled: boolean) => {
    if (!isUnlocked && isConfigured) {
      Alert.alert(tParental('requiresUnlock'), tParental('requiresUnlock'));
      promptUnlockIfNeeded();
      return;
    }

    // Demander confirmation
    Alert.alert(
      enabled ? tParental('blockProfileSwitch') : tParental('unblockProfileSwitch'),
      `${enabled ? tParental('blockProfileSwitch') : tParental('unblockProfileSwitch')} ${tParental('blockSwitchDescription')} "${profile.name}"?`,
      [
        {text: tCommon('cancel'), style: 'cancel'},
        {
          text: tCommon('ok'),
          onPress: async () => {
            // Utiliser le PIN déjà vérifié (unlock)
            const ParentalService = (await import('../services/ParentalControlService')).default;
            const pin = ''; // On a déjà déverrouillé, pas besoin de re-demander

            // Mettre à jour directement
            await ProfileService.updateProfile(profile.id, {
              requiresPinToAccess: enabled,
            });

            loadData(); // Recharger
            Alert.alert(tCommon('success'), enabled ? tParental('blockingActivated') : tParental('blockingDeactivated'));
          }
        }
      ]
    );
  };

  // ====================
  // RENDU ONGLET 1: MES RESTRICTIONS
  // ====================

  const renderRestrictionsTab = () => {
    if (!activeProfile) {
      return (
        <View style={[themedStyles.card, {backgroundColor: colors.surface.primary}]}>
          <View style={{padding: 16}}>
            <Text style={{color: colors.text.secondary}}>
              {tParental('noActiveProfile')}
            </Text>
          </View>
        </View>
      );
    }

    const isChild = activeProfile.isKids;
    const canEdit = isUnlocked && !isChild;

    return (
      <View>
        {/* Info profil */}
        <View style={[themedStyles.card, {backgroundColor: colors.surface.primary}]}>
          <View style={{padding: 16}}>
            <View style={themedStyles.profileHeader}>
              <View style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                backgroundColor: colors.accent.primary,
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Text style={{color: colors.text.inverse, fontSize: 18, fontWeight: 'bold'}}>
                  {activeProfile.name.substring(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={{marginLeft: 12, flex: 1}}>
                <Text variant="titleLarge" style={{color: colors.text.primary}}>
                  {activeProfile.name}
                </Text>
                <Text style={{color: colors.text.secondary}}>
                  {isChild ? `🧒 ${tProfiles('childProfile')}` : `👤 ${tProfiles('standardProfile')}`}
                </Text>
              </View>
              {canEdit && (
                <Icon name="edit" size={24} color={colors.accent.primary} />
              )}
            </View>
          </View>
        </View>

        {/* Restrictions actuelles */}
        <View style={[themedStyles.card, {backgroundColor: colors.surface.primary}]}>
          <View style={{padding: 16}}>
            <Text variant="titleMedium" style={[themedStyles.sectionTitle, {color: colors.text.primary}]}>
              {tParental('currentRestrictions')}
            </Text>

            <View style={[themedStyles.restrictionItem, {borderBottomColor: colors.ui.border}]}>
              <Icon name="block" size={20} color={colors.accent.error} />
              <Text style={[themedStyles.restrictionLabel, {color: colors.text.primary}]}>
                {tParental('blockedCategories')} :
              </Text>
              <Text style={[themedStyles.restrictionValue, {color: colors.text.secondary}]}>
                {activeProfile.blockedCategories?.length || 0}
              </Text>
            </View>

            {/* Actions */}
            {!canEdit && isChild && (
              <View style={[themedStyles.infoBox, {backgroundColor: colors.surface.primaryVariant, marginTop: 16}]}>
                <Icon name="info-outline" size={20} color={colors.accent.primary} />
                <Text style={[themedStyles.infoText, {color: colors.text.secondary}]}>
                  {tParental('childProfilesCannotModify')}
                </Text>
              </View>
            )}

            {canEdit && (
              <View style={{marginTop: 16}}>
                <Button
                  mode="contained"
                  onPress={() => openProfileConfig(activeProfile)}
                  style={{marginBottom: 8}}
                  icon={({size, color}) => <Icon name="block" size={size} color={color} />}
                >
                  {tParental('manageBlockedCategories')}
                </Button>
              </View>
            )}

            {!canEdit && !isChild && (
              <View style={{marginTop: 16}}>
                <Button
                  mode="outlined"
                  onPress={() => promptUnlockIfNeeded()}
                >
                  {tParental('unlockToModify')}
                </Button>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  // ====================
  // RENDU ONGLET 2: TOUS LES PROFILS
  // ====================

  const renderProfilesTab = () => {
    if (!isUnlocked && isConfigured) {
      return (
        <View style={[themedStyles.card, {backgroundColor: colors.surface.primary}]}>
          <View style={{alignItems: 'center', padding: 32}}>
            <Icon name="lock" size={48} color={colors.ui.border} />
            <Text style={{color: colors.text.secondary, marginTop: 16, textAlign: 'center'}}>
              {tParental('enterPinToViewProfiles')}
            </Text>
            <Button
              mode="contained"
              onPress={() => promptUnlockIfNeeded()}
              style={{marginTop: 16}}
            >
              {tParental('unlock')}
            </Button>
          </View>
        </View>
      );
    }

    return (
      <View>
        <Text style={[themedStyles.tabDescription, {color: colors.text.secondary}]}>
          {tParental('profilesOverview')}
        </Text>

        {profiles.map((profile) => (
          <View key={profile.id} style={[themedStyles.card, {backgroundColor: colors.surface.primary}]}>
            <View style={{padding: 16}}>
              <View style={themedStyles.profileRow}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: profile.isKids ? colors.accent.secondary : colors.accent.primary,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Text style={{color: colors.text.inverse, fontSize: 14, fontWeight: 'bold'}}>
                    {profile.name.substring(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={{flex: 1, marginLeft: 12}}>
                  <Text style={[themedStyles.profileName, {color: colors.text.primary}]}>
                    {profile.name}
                    {profile.isKids && ' 🧒'}
                  </Text>
                  <Text style={[themedStyles.profileDetails, {color: colors.text.secondary}]}>
                    {profile.blockedCategories?.length || 0} {tChannels('categories')}
                    {profile.requiresPinToAccess && ` • 🔒 ${tParental('blockedSwitch')}`}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => openProfileConfig(profile)}
                  style={themedStyles.configButton}
                >
                  <Icon name="block" size={24} color={colors.accent.primary} />
                </TouchableOpacity>
              </View>

              {/* Toggle blocage switch pour profils enfants */}
              {profile.isKids && (
                <View style={[themedStyles.switchContainer, {borderTopColor: colors.ui.border}]}>
                  <View style={{flex: 1}}>
                    <Text style={{color: colors.text.primary}}>{tParental('blockProfileSwitch')}</Text>
                    <Text style={{color: colors.text.secondary, fontSize: 12}}>
                      {tParental('pinRequiredToLeave')}
                    </Text>
                  </View>
                  <Switch
                    value={profile.requiresPinToAccess || false}
                    onValueChange={(value) => toggleSwitchLock(profile, value)}
                    trackColor={{false: colors.surface.primaryVariant, true: colors.accent.primary}}
                  />
                </View>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  };

  // ====================
  // RENDU ONGLET 3: PARAMÈTRES GLOBAUX
  // ====================

  const renderSettingsTab = () => {
    if (!isConfigured) {
      return (
        <View style={[themedStyles.card, {backgroundColor: colors.surface.primary}]}>
          <View style={{padding: 16}}>
            <View style={{alignItems: 'center', padding: 16}}>
              <Icon name="lock-open" size={48} color={colors.ui.border} />
              <Text variant="titleLarge" style={{color: colors.text.primary, marginTop: 16, fontSize: getScaledTextSize(20)}}>
                {tCommon('disabled')}
              </Text>
              <Text style={{color: colors.text.secondary, textAlign: 'center', marginTop: 8, fontSize: getScaledTextSize(14)}}>
                {tParental('parentalPinDescription')}
              </Text>
              <Button
                mode="contained"
                onPress={() => setShowInitialPinSetup(true)}
                style={{marginTop: 16}}
              >
                {tSettings('configure')}
              </Button>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View>
        {/* Gestion PIN */}
        <View style={[themedStyles.card, {backgroundColor: colors.surface.primary}]}>
          <View style={{padding: 16}}>
            <Text variant="titleMedium" style={[themedStyles.sectionTitle, {color: colors.text.primary, fontSize: getScaledTextSize(20)}]}>
              {tParental('parentalPin')}
            </Text>
            <Text style={{color: colors.text.secondary, marginBottom: 16, fontSize: getScaledTextSize(14)}}>
              {tParental('parentalPinDescription')}
            </Text>

            <Button
              mode="outlined"
              onPress={() => setShowChangePin(true)}
              style={{marginBottom: 8}}
            >
              {tParental('changePin')}
            </Button>

            <Button
              mode="outlined"
              onPress={() => setShowDisablePin(true)}
              textColor={colors.accent.error}
              style={{borderColor: colors.accent.error}}
            >
              {tParental('disableParentalControl')}
            </Button>
          </View>
        </View>

        {/* 🔒 Options de sécurité avancées */}
        <View style={[themedStyles.card, {backgroundColor: colors.surface.primary}]}>
          <View style={{padding: 16}}>
            <Text variant="titleMedium" style={[themedStyles.sectionTitle, {color: colors.text.primary, fontSize: getScaledTextSize(20)}]}>
              {tParental('securitySettings')}
            </Text>
            <Text style={{color: colors.text.secondary, marginBottom: 16, fontSize: getScaledTextSize(14)}}>
              {tParental('securitySettingsDescription')}
            </Text>

            {/* Option: Exiger PIN pour les paramètres */}
            <View style={[themedStyles.switchContainer, {borderTopColor: colors.ui.border, marginTop: 16, paddingTop: 16}]}>
              <View style={{flex: 1}}>
                <Text style={{color: colors.text.primary, fontSize: getScaledTextSize(16)}}>{tParental('requirePinForSettings')}</Text>
                <Text style={{color: colors.text.secondary, fontSize: getScaledTextSize(12)}}>
                  {tParental('requirePinForSettingsDesc')}
                </Text>
              </View>
              <Switch
                value={activeProfile?.securitySettings?.requirePinForSettings || false}
                onValueChange={(value) => handleSecuritySettingChange('requirePinForSettings', value)}
                trackColor={{false: colors.surface.primaryVariant, true: colors.accent.primary}}
              />
            </View>

            {/* Option: Exiger PIN pour les profils */}
            <View style={[themedStyles.switchContainer, {borderTopColor: colors.ui.border}]}>
              <View style={{flex: 1}}>
                <Text style={{color: colors.text.primary, fontSize: getScaledTextSize(16)}}>{tParental('requirePinForProfile')}</Text>
                <Text style={{color: colors.text.secondary, fontSize: getScaledTextSize(12)}}>
                  {tParental('requirePinForProfileDesc')}
                </Text>
              </View>
              <Switch
                value={activeProfile?.securitySettings?.requireModalForProfile || false}
                onValueChange={(value) => handleSecuritySettingChange('requireModalForProfile', value)}
                trackColor={{false: colors.surface.primaryVariant, true: colors.accent.primary}}
              />
            </View>

            {/* Option: Exiger PIN pour les playlists */}
            <View style={[themedStyles.switchContainer, {borderTopColor: colors.ui.border}]}>
              <View style={{flex: 1}}>
                <Text style={{color: colors.text.primary, fontSize: getScaledTextSize(16)}}>{tParental('requirePinForPlaylist')}</Text>
                <Text style={{color: colors.text.secondary, fontSize: getScaledTextSize(12)}}>
                  {tParental('requirePinForPlaylistDesc')}
                </Text>
              </View>
              <Switch
                value={activeProfile?.securitySettings?.requireModalForPlaylist || false}
                onValueChange={(value) => handleSecuritySettingChange('requireModalForPlaylist', value)}
                trackColor={{false: colors.surface.primaryVariant, true: colors.accent.primary}}
              />
            </View>
          </View>
        </View>

        {/* Déverrouillages actifs */}
        {activeUnlocks.length > 0 && (
          <View style={[themedStyles.card, {backgroundColor: colors.surface.primary}]}>
            <View style={{padding: 16}}>
              <Text variant="titleMedium" style={[themedStyles.sectionTitle, {color: colors.text.primary}]}>
                {tParental('activeTemporaryUnlocks')}
              </Text>

              {activeUnlocks.map((item, index) => (
                <View key={index} style={themedStyles.unlockItem}>
                  <View style={{flex: 1}}>
                    <Text style={[themedStyles.profileName, {color: colors.text.primary}]}>
                      {item.profile.name}
                    </Text>
                    <Text style={{color: colors.text.secondary, fontSize: 12}}>
                      {tChannels('categories')}: {item.unlock.unlockedCategories?.join(', ') || tChannels('categories')}
                    </Text>
                    <Text style={{color: colors.accent.secondary, fontSize: 12}}>
                      {tParental('remainingTime')}: {ParentalControlService.getRemainingTime(item.unlock)}
                    </Text>
                  </View>
                  <Button
                    mode="outlined"
                    compact
                    onPress={() => {
                      setSelectedUnlock(item);
                      setShowRevokePin(true);
                    }}
                  >
                    {tParental('revoke')}
                  </Button>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  // ====================
  // RENDU PRINCIPAL
  // ====================

  if (isLoading) {
    return (
      <SafeAreaView style={[themedStyles.container, {backgroundColor: colors.background.primary}]}>
        <View style={themedStyles.loadingContainer}>
          <Text style={{color: colors.text.primary}}>{tCommon('loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[themedStyles.container, {backgroundColor: colors.background.primary}]}>
      {/* Header - Animé au scroll */}
      <Animated.View
        style={[
          themedStyles.header,
          {
            height: headerHeight.interpolate({
              inputRange: [0, 1],
              outputRange: [0, HEADER_HEIGHT], // 0 quand caché, HEADER_HEIGHT quand visible
              extrapolate: 'clamp',
            }),
            opacity: headerHeight,
            overflow: 'hidden',
          }
        ]}
      >
        <Icon name="security" size={40} color={isConfigured ? colors.accent.primary : colors.accent.error} />
        <Text variant="headlineMedium" style={[themedStyles.title, {color: colors.text.primary}]}>
          {tParental('parentalControl')}
        </Text>
        <View style={[themedStyles.statusBadge, {backgroundColor: isConfigured ? colors.accent.primary : colors.accent.error}]}>
          <Text style={themedStyles.statusText}>
            {isConfigured ? (isUnlocked ? `🔓 ${tParental('unlocked')}` : `🔒 ${tParental('locked')}`) : tCommon('disabled')}
          </Text>
        </View>
      </Animated.View>

      {/* Onglets */}
      <View style={[themedStyles.tabBar, {borderBottomColor: colors.ui.border}]}>
        <TouchableOpacity
          style={[themedStyles.tab, currentTab === 'restrictions' && {borderBottomColor: colors.accent.primary, borderBottomWidth: 2}]}
          onPress={() => setCurrentTab('restrictions')}
        >
          <Icon name="tune" size={24} color={currentTab === 'restrictions' ? colors.accent.primary : colors.text.secondary} />
          <Text style={{color: currentTab === 'restrictions' ? colors.accent.primary : colors.text.secondary, marginTop: 4}}>
            {tParental('myRestrictions')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[themedStyles.tab, currentTab === 'profiles' && {borderBottomColor: colors.accent.primary, borderBottomWidth: 2}]}
          onPress={() => setCurrentTab('profiles')}
        >
          <Icon name="people" size={24} color={currentTab === 'profiles' ? colors.accent.primary : colors.text.secondary} />
          <Text style={{color: currentTab === 'profiles' ? colors.accent.primary : colors.text.secondary, marginTop: 4}}>
            {tProfiles('allProfiles')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[themedStyles.tab, currentTab === 'settings' && {borderBottomColor: colors.accent.primary, borderBottomWidth: 2}]}
          onPress={() => setCurrentTab('settings')}
        >
          <Icon name="build" size={24} color={currentTab === 'settings' ? colors.accent.primary : colors.text.secondary} />
          <Text style={{color: currentTab === 'settings' ? colors.accent.primary : colors.text.secondary, marginTop: 4}}>
            {tCommon('settings')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contenu onglet */}
      <ScrollView
        style={themedStyles.content}
        showsVerticalScrollIndicator={false}
        onScroll={(event) => {
          const offsetY = event.nativeEvent.contentOffset.y;
          const shouldShow = offsetY < 50;
          if (shouldShow !== headerVisible) {
            setHeaderVisible(shouldShow);
          }
        }}
        scrollEventThrottle={100}
      >
        {currentTab === 'restrictions' && renderRestrictionsTab()}
        {currentTab === 'profiles' && renderProfilesTab()}
        {currentTab === 'settings' && renderSettingsTab()}
        <View style={{height: 40}} />
      </ScrollView>

      {/* Modal déverrouillage avec effet flou parfait */}
      {showUnlockModal && (
        <View style={modalStyles.modalBlurOverlay}>
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="dark"
            blurAmount={5}
          />
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowUnlockModal(false)}
          />
          <View style={modalStyles.modalPinContent}>
            <View style={modalStyles.modalHeader}>
              <Icon name="lock-open" size={20} color={colors.accent.primary} />
              <Text style={modalStyles.modalTitle}>
                {tParental('unlockPinTitle')}
              </Text>
              <TouchableOpacity onPress={() => setShowUnlockModal(false)}>
                <Icon name="close" size={18} color="#F44336" />
              </TouchableOpacity>
            </View>

            <View style={{height: 12}} />

            <TextInput
              style={[modalStyles.pinInput, {
                borderColor: colors.accent.primary,
                color: colors.text.primary,
                backgroundColor: colors.background.primary,
              }]}
              value={unlockPin}
              onChangeText={setUnlockPin}
              placeholder={tParental('enterPin')}
              placeholderTextColor={colors.text.secondary}
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
              autoFocus
            />

            <View style={modalStyles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setShowUnlockModal(false)}
                style={{flex: 1, borderColor: colors.ui.border}}
                textColor={colors.text.primary}
              >
                {tCommon('cancel')}
              </Button>
              <Button
                mode="contained"
                onPress={handleUnlock}
                style={{flex: 1, marginLeft: 8, backgroundColor: colors.accent.primary}}
                buttonColor={colors.accent.primary}
              >
                {tParental('unlock')}
              </Button>
            </View>
          </View>
        </View>
      )}

      {/* Modal configuration initiale PIN avec effet flou parfait */}
      {showInitialPinSetup && (
        <View style={modalStyles.modalBlurOverlay}>
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="dark"
            blurAmount={5}
          />
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowInitialPinSetup(false)}
          />
          <View style={modalStyles.modalPinContent}>
            <View style={modalStyles.modalHeader}>
              <Icon name="lock" size={20} color={colors.accent.primary} />
              <Text style={modalStyles.modalTitle}>{tParental('configurePinTitle')}</Text>
              <TouchableOpacity onPress={() => setShowInitialPinSetup(false)}>
                <Icon name="close" size={18} color="#F44336" />
              </TouchableOpacity>
            </View>

            <Text style={{color: colors.text.secondary, marginBottom: 8, textAlign: 'center', fontSize: 12}}>
              {tParental('createFourDigitPin')}
            </Text>

            <TextInput
              style={[modalStyles.pinInput, {borderColor: colors.accent.primary, color: colors.text.primary, backgroundColor: colors.background.primary}]}
              value={initialPin}
              onChangeText={setInitialPin}
              placeholder={tParental('newPin')}
              placeholderTextColor={colors.text.secondary}
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
              autoFocus
            />
            <TextInput
              style={[modalStyles.pinInput, {borderColor: colors.accent.primary, color: colors.text.primary, backgroundColor: colors.background.primary}]}
              value={initialPinConfirm}
              onChangeText={setInitialPinConfirm}
              placeholder={tParental('confirmPin')}
              placeholderTextColor={colors.text.secondary}
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
            />

            <View style={modalStyles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setShowInitialPinSetup(false)}
                style={{flex: 1, borderColor: colors.ui.border}}
                textColor={colors.text.primary}
              >
                {tCommon('cancel')}
              </Button>
              <Button
                mode="contained"
                onPress={handleInitialPinSetup}
                style={{flex: 1, marginLeft: 8, backgroundColor: colors.accent.primary}}
                buttonColor={colors.accent.primary}
              >
                {tSettings('configure')}
              </Button>
            </View>
          </View>
        </View>
      )}

      {/* Modal changement PIN avec effet flou parfait */}
      {showChangePin && (
        <View style={modalStyles.modalBlurOverlay}>
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="dark"
            blurAmount={5}
          />
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowChangePin(false)}
          />
          <View style={modalStyles.modalPinContent}>
            <View style={modalStyles.modalHeader}>
              <Icon name="vpn-key" size={20} color={colors.accent.primary} />
              <Text style={modalStyles.modalTitle}>{tParental('changePinTitle')}</Text>
              <TouchableOpacity onPress={() => setShowChangePin(false)}>
                <Icon name="close" size={18} color="#F44336" />
              </TouchableOpacity>
            </View>

            <View style={{height: 12}} />

            <TextInput
              style={[modalStyles.pinInput, {
                borderColor: colors.accent.primary,
                color: colors.text.primary,
                backgroundColor: colors.background.primary,
              }]}
              value={oldPin}
              onChangeText={setOldPin}
              placeholder={tParental('oldPin')}
              placeholderTextColor={colors.text.secondary}
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
              autoFocus
            />
            <TextInput
              style={[modalStyles.pinInput, {
                borderColor: colors.accent.primary,
                color: colors.text.primary,
                backgroundColor: colors.background.primary,
              }]}
              value={newPin}
              onChangeText={setNewPin}
              placeholder={tParental('newPin')}
              placeholderTextColor={colors.text.secondary}
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
            />
            <TextInput
              style={[modalStyles.pinInput, {
                borderColor: colors.accent.primary,
                color: colors.text.primary,
                backgroundColor: colors.background.primary,
              }]}
              value={confirmPin}
              onChangeText={setConfirmPin}
              placeholder={tParental('confirmPin')}
              placeholderTextColor={colors.text.secondary}
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
            />

            <View style={modalStyles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setShowChangePin(false)}
                style={{flex: 1, borderColor: colors.ui.border}}
                textColor={colors.text.primary}
              >
                {tCommon('cancel')}
              </Button>
              <Button
                mode="contained"
                onPress={handleChangePin}
                style={{
                  flex: 1,
                  marginLeft: 8,
                  backgroundColor: colors.accent.primary,
                }}
                buttonColor={colors.accent.primary}
              >
                {tParental('changePin')}
              </Button>
            </View>
          </View>
        </View>
      )}

      {/* Modal désactivation avec effet flou parfait */}
      {showDisablePin && (
        <View style={modalStyles.modalBlurOverlay}>
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="dark"
            blurAmount={5}
          />
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowDisablePin(false)}
          />
          <View style={modalStyles.modalPinContent}>
            <View style={modalStyles.modalHeader}>
              <Icon name="warning" size={20} color={colors.accent.error} />
              <Text style={modalStyles.modalTitle}>{tParental('disableTitle')}</Text>
              <TouchableOpacity onPress={() => setShowDisablePin(false)}>
                <Icon name="close" size={18} color="#F44336" />
              </TouchableOpacity>
            </View>

            <View style={{height: 12}} />

            <Text style={{color: colors.text.secondary, marginBottom: 12, textAlign: 'center', fontSize: 12}}>
              {tParental('disableMessage')}
            </Text>
            <TextInput
              style={[modalStyles.pinInput, {
                borderColor: colors.accent.primary,
                color: colors.text.primary,
                backgroundColor: colors.background.primary,
              }]}
              value={disablePin}
              onChangeText={setDisablePin}
              placeholder={tParental('enterPin')}
              placeholderTextColor={colors.text.secondary}
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
              autoFocus
            />
            <View style={modalStyles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setShowDisablePin(false)}
                style={{flex: 1, borderColor: colors.ui.border}}
                textColor={colors.text.primary}
              >
                {tCommon('cancel')}
              </Button>
              <Button
                mode="contained"
                onPress={handleDisableParentalControl}
                style={{flex: 1, marginLeft: 8, backgroundColor: colors.accent.error}}
              >
                {tParental('disableTitle')}
              </Button>
            </View>
          </View>
        </View>
      )}

      {/* Modal révocation avec effet flou parfait */}
      {showRevokePin && (
        <View style={modalStyles.modalBlurOverlay}>
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="dark"
            blurAmount={5}
          />
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowRevokePin(false)}
          />
          <View style={modalStyles.modalPinContent}>
            <View style={modalStyles.modalHeader}>
              <Icon name="lock" size={20} color={colors.accent.primary} />
              <Text style={modalStyles.modalTitle}>{tParental('revokeTitle')}</Text>
              <TouchableOpacity onPress={() => setShowRevokePin(false)}>
                <Icon name="close" size={18} color="#F44336" />
              </TouchableOpacity>
            </View>
            <Text style={{color: colors.text.secondary, marginBottom: 8, textAlign: 'center', fontSize: 12}}>
              {tParental('revokeMessage')} "{selectedUnlock?.profile.name}"
            </Text>
            <TextInput
              style={[modalStyles.pinInput, {
                borderColor: colors.accent.primary,
                color: colors.text.primary,
                backgroundColor: colors.background.primary,
              }]}
              value={revokePin}
              onChangeText={setRevokePin}
              placeholder={tParental('enterPin')}
              placeholderTextColor={colors.text.secondary}
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
              autoFocus
            />
            <View style={modalStyles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setShowRevokePin(false)}
                style={{flex: 1, borderColor: colors.ui.border}}
                textColor={colors.text.primary}
              >
                {tCommon('cancel')}
              </Button>
              <Button
                mode="contained"
                onPress={handleRevokeUnlock}
                style={{flex: 1, marginLeft: 8, backgroundColor: colors.accent.primary}}
                buttonColor={colors.accent.primary}
              >
                {tParental('revoke')}
              </Button>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

// Fonction pour créer les styles des modaux avec effet flou parfait (identique à AccountInfoScreen)
const createModalStyles = (colors: any) => StyleSheet.create({
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
    borderRadius: 20,
    padding: 18,
    width: '85%',
    maxWidth: 350,
    maxHeight: '80%',
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
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.primary,
    flex: 1,
    marginLeft: 10,
  },
  pinInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 2,
    width: '75%',
    alignSelf: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  // Style spécifique pour les modaux PIN plus aérés
  modalPinContent: {
    backgroundColor: colors.background.secondary || 'rgba(255, 255, 255, 0.98)',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 30,
    transform: [{translateY: -2}],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
});


export default ParentalControlScreen;
