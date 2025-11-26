import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  useColorScheme,
  ActivityIndicator,
  Animated,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import type {RootStackParamList} from '../../App';
import {EPGSourceManager} from '../services/epg/EPGSourceManager';
import {XtreamEPG, FullEPGData, EPGChannel} from '../services/XtreamEPGService';
import {EPGCacheManager} from '../services/epg/EPGCacheManager';
import {ModernDialog} from '../components/ModernDialog';
import {useI18n} from '../hooks/useI18n';
import {useUISettings} from '../stores/UIStore';

type NavigationProp = StackNavigationProp<RootStackParamList>;

// Utilisation du cache EPG centralisé (même référence que EPGCompact)
const epgCache = EPGCacheManager;

// Credentials Xtream (devraient venir des paramètres utilisateur)
const xtreamCredentials = {
  server: 'http://rhxupbfj.mlyan.xyz',
  username: '6SYN24FA',
  password: 'B58Y9VGJ',
};

const TVGuideSettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const {t: tCommon} = useI18n('common');
  const {t: tSettings} = useI18n('settings');
  const {t: tEpg} = useI18n('epg');
  const { getScaledTextSize } = useUISettings();
  const [epgGlobalStatus, setEpgGlobalStatus] = useState(tEpg('notDownloaded'));
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [epgStats, setEpgStats] = useState({
    totalSources: 0,
    manualCount: 0,
    globalAvailable: false,
  });
  const isDarkMode = useColorScheme() === 'dark';

  // États pour les dialogues modernes
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [showRefreshDialog, setShowRefreshDialog] = useState(false);
  const [showClearCacheDialog, setShowClearCacheDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [clearProgress, setClearProgress] = useState(0);

  // Animation refs
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // EPG Manager
  const epgManager = useRef(new EPGSourceManager()).current;

  // Effet d'initialisation - charge les stats EPG une seule fois
  useEffect(() => {
    console.log(`🎨 [TVGuideSettings] Text scale: ${getScaledTextSize(20)}`);
    loadEPGStats();
  }, []);

  // ✅ Fonction simplifiée pour vérifier statut EPG (sans boucles)
  const checkEPGStatus = () => {
    const cacheStats = epgCache.getCacheStats();
    const hasValidData = cacheStats.hasData && cacheStats.channelsCount > 0;
    const newStatus = hasValidData ? tEpg('upToDate') : tEpg('notDownloaded');

    if (newStatus !== epgGlobalStatus) {
      console.log('🔍 [TVGuideSettings] Mise à jour statut EPG:', newStatus);
      setEpgGlobalStatus(newStatus);
    }
  };

  // Animations de progression
  useEffect(() => {
    if (isDownloading) {
      // Animation du pouls pendant le téléchargement
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      pulseAnimation.start();

      return () => pulseAnimation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isDownloading]);

  // Animation de progression améliorée
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: downloadProgress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [downloadProgress]);

  const loadEPGStats = async () => {
    try {
      const stats = await epgManager.getEPGStats();
      setEpgStats(stats);

      // Vérifier le cache global pour le statut EPG
      const cacheStats = epgCache.getCacheStats();
      if (cacheStats.hasData) {
        setEpgGlobalStatus(tEpg('upToDate'));
        console.log(
          '✅ [TVGuideSettings] EPG global détecté en cache:',
          cacheStats.channelsCount,
          'chaînes',
        );
      } else {
        setEpgGlobalStatus(tEpg('notDownloaded'));
      }
    } catch (error) {
      console.error('Erreur chargement stats EPG:', error);
    }
  };

  const handleDownloadGlobalEPG = async () => {
    if (isDownloading) {
      Alert.alert(
        tSettings('information'),
        'Un téléchargement EPG est déjà en cours. Veuillez patienter.',
      );
      return;
    }

    // Si EPG déjà téléchargé, c'est une actualisation
    if (epgGlobalStatus === tEpg('upToDate')) {
      console.log('🔄 Actualisation EPG Global');
      setShowRefreshDialog(true);
    } else {
      console.log('📥 Téléchargement EPG Global');
      setShowDownloadDialog(true);
    }
  };

  const startEPGDownload = async () => {
    try {
      setIsDownloading(true);
      setDownloadProgress(0);
      setEpgGlobalStatus(tEpg('initializationDots'));

      // Éviter les chargements multiples
      if (epgCache.isLoadingFullEPG) {
        Alert.alert(tCommon('attention'), 'Un téléchargement EPG est déjà en cours.');
        setIsDownloading(false);
        return;
      }

      epgCache.isLoadingFullEPG = true;

      // Étape 1: Connexion au serveur EPG
      setDownloadProgress(5);
      setEpgGlobalStatus(tEpg('connectingToServer'));
      await new Promise(resolve => setTimeout(resolve, 800));

      setDownloadProgress(15);
      setEpgGlobalStatus(tEpg('authentication'));
      await new Promise(resolve => setTimeout(resolve, 600));

      // Étape 2: Téléchargement des données EPG
      setDownloadProgress(30);
      setEpgGlobalStatus(tEpg('downloadingPrograms'));

      console.log(
        '🔄 [TVGuideSettings] Démarrage téléchargement EPG Xtream...',
      );
      console.log('🔗 [TVGuideSettings] Serveur:', xtreamCredentials.server);

      const epgData = await XtreamEPG.getFullEPG(xtreamCredentials);

      if (!epgData || epgData.channels.length === 0) {
        throw new Error('Aucune donnée EPG reçue du serveur');
      }

      // Étape 3: Traitement des données
      setDownloadProgress(65);
      setEpgGlobalStatus(tEpg('analyzingData'));
      await new Promise(resolve => setTimeout(resolve, 400));

      setDownloadProgress(80);
      setEpgGlobalStatus(tEpg('processingData'));

      console.log(
        '✅ [TVGuideSettings] EPG téléchargé:',
        epgData.channels.length,
        'chaînes,',
        epgData.programmes.length,
        'programmes',
      );

      // Étape 4: Construction de l'index et sauvegarde en cache
      setDownloadProgress(88);
      setEpgGlobalStatus(tEpg('buildingIndex'));
      await new Promise(resolve => setTimeout(resolve, 300));

      setDownloadProgress(95);
      setEpgGlobalStatus(tEpg('savingToCache'));

      // Mettre à jour le cache global
      epgCache.updateCache(epgData);

      // Construire l'index pour recherche O(1)
      buildChannelIndex(epgData.channels);

      // Étape 5: Finalisation
      setDownloadProgress(100);
      setEpgGlobalStatus(tEpg('downloadComplete'));
      await new Promise(resolve => setTimeout(resolve, 800));

      // Finalisation
      setIsDownloading(false);
      epgCache.isLoadingFullEPG = false;
      setEpgGlobalStatus(tEpg('upToDate'));

      // On recharge les stats pour mettre à jour les compteurs, mais sans toucher au statut EPG global
      // qui vient d'être défini correctement.
      epgManager.getEPGStats().then(setEpgStats);

      // ✅ Succès silencieux - Le statut "À jour" avec icône verte suffit

      console.log(
        '✅ [TVGuideSettings] EPG Global téléchargé avec succès!',
        epgData.channels.length,
        'chaînes,',
        epgData.programmes.length,
        'programmes',
      );
    } catch (error) {
      console.error('❌ [TVGuideSettings] Erreur téléchargement EPG:', error);
      setIsDownloading(false);
      epgCache.isLoadingFullEPG = false;
      setEpgGlobalStatus(tEpg('downloadError'));

      let errorMessage = tEpg('downloadError');
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.message.includes('timeout')) {
          errorMessage = tEpg('connectionTimeout');
        } else if (error.message.includes('Network')) {
          errorMessage = tEpg('networkError');
        } else if (error.message.includes('Aucune donnée')) {
          errorMessage = tEpg('noDataFromServer');
        }
      }

      Alert.alert(tCommon('error'), errorMessage);
    }
  };

  // Fonction pour construire l'index de chaînes (copiée depuis EPGCompact)
  const buildChannelIndex = (channels: EPGChannel[]) => {
    epgCache.channelIndex.clear();
    channels.forEach(channel => {
      const normalizedName = normalizeName(channel.displayName);
      epgCache.channelIndex.set(normalizedName, channel);

      // Ajouter des variantes communes pour améliorer la correspondance
      const variations = [
        channel.displayName.toLowerCase(),
        channel.displayName.replace(/\s+/g, ''),
        channel.displayName.replace(/hd|fhd|4k/gi, '').trim(),
      ];

      variations.forEach(variation => {
        const normalized = normalizeName(variation);
        if (normalized && normalized !== normalizedName) {
          epgCache.channelIndex.set(normalized, channel);
        }
      });
    });
    console.log(
      '🔍 [TVGuideSettings] Index de chaînes construit:',
      epgCache.channelIndex.size,
      'entrées',
    );
  };

  // Fonction de normalisation (copiée depuis EPGCompact)
  const normalizeName = (name: string): string =>
    name.toLowerCase().replace(/[^a-z0-9]/g, '');

  const handleManageEPGSources = () => {
    console.log('📋 Navigation vers sources EPG manuelles');
    navigation.navigate('EPGManualSources');
  };

  const handleAssignEPGToPlaylists = () => {
    console.log('📋 Navigation vers assignation EPG ↔ Playlists');
    navigation.navigate('EPGPlaylistAssignment');
  };

  const handleOldManageEPGSources = () => {
    console.log('📋 Gestion sources EPG');
    Alert.alert(
      tEpg('manualEPGSources'),
      "Cette fonctionnalité permettra d'assigner des sources EPG spécifiques à vos playlists.",
      [{text: tCommon('ok')}],
    );
  };

  // ✅ handleRefreshEPG supprimé - fonction intégrée dans handleDownloadGlobalEPG

  const executeRefreshEPG = async () => {
    console.log('🔄 Actualisation EPG');

    try {
      setIsDownloading(true);
      setDownloadProgress(0);
      setEpgGlobalStatus(tEpg('refreshStarting'));

      // Vider le cache actuel
      epgCache.clearCache();

      // Redémarrer le téléchargement EPG
      await startEPGDownload();
    } catch (error) {
      console.error('❌ Erreur actualisation EPG:', error);
      setIsDownloading(false);
      setEpgGlobalStatus(tEpg('refreshError'));
      Alert.alert(
        tCommon('error'),
        tEpg('refreshError'),
      );
    }
  };

  const handleClearEPGCache = () => {
    setShowClearCacheDialog(true);
  };

  const executeClearCache = async () => {
    try {
      setIsClearingCache(true);
      setClearProgress(0);
      console.log('🗑️ [TVGuideSettings] Début suppression cache EPG...');

      // Animation de progression pendant l'opération
      setClearProgress(20);
      await new Promise(resolve => setTimeout(resolve, 200));

      setClearProgress(50);
      await new Promise(resolve => setTimeout(resolve, 200));

      // Vider le cache centralisé (opération lourde mais avec progression)
      setClearProgress(80);
      epgCache.clearCache();

      setClearProgress(90);
      setEpgGlobalStatus(tEpg('notDownloaded'));

      // Finalisation
      setClearProgress(100);
      await new Promise(resolve => setTimeout(resolve, 300));

      setIsClearingCache(false);
      setClearProgress(0);

      setSuccessMessage(tEpg('cacheClearedMessage'));
      setShowSuccessDialog(true);

      console.log('✅ [TVGuideSettings] Cache EPG supprimé avec succès !');
      loadEPGStats(); // Recharger les stats
    } catch (error) {
      console.error('❌ [TVGuideSettings] Erreur suppression cache:', error);
      setIsClearingCache(false);
      setClearProgress(0);
    }
  };

  return (
    <LinearGradient
      colors={['#1A1B2E', '#2C2F4A', '#3E4266', '#525482']}
      style={styles.container}>
      <StatusBar hidden={true} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-back-ios" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {fontSize: getScaledTextSize(18)}]}>{tEpg('tvGuide')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Espacement avec arrière-plan transparent */}
        <View style={styles.topSpacer} />
        {/* Section EPG Global */}
        <LinearGradient
          colors={['#4A4F6C', '#3A3F5C', '#2E3348', '#222734']}
          style={styles.modernSection}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          locations={[0, 0.3, 0.7, 1]}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconTitleContainer}>
              <LinearGradient
                colors={['#4A90E2', '#357ABD']}
                style={styles.sectionIcon}>
                <Icon name="file-download" size={16} color="#FFFFFF" />
              </LinearGradient>
              <Text style={[styles.modernSectionTitle, {fontSize: getScaledTextSize(16)}]}>
                {tEpg('automaticEPGGlobal')}
              </Text>
            </View>
          </View>

          {/* Status Card */}
          <LinearGradient
            colors={['#4A4F6C', '#3A3F5C', '#2E3348', '#222734']}
            style={styles.statusCard}
            locations={[0, 0.3, 0.7, 1]}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}>
            <View style={styles.statusCardContent}>
              <View style={styles.statusInfo}>
                <Text style={[styles.statusTitle, {fontSize: getScaledTextSize(14)}]}>{tCommon('status')}</Text>
                <View style={styles.statusWithIcon}>
                  {isDownloading ? (
                    <>
                      <ActivityIndicator
                        size="small"
                        color="#FF9800"
                        style={styles.statusIcon}
                      />
                      <Text
                        style={[
                          styles.statusDescription,
                          styles.statusInProgress,
                          {fontSize: getScaledTextSize(12)},
                        ]}>
                        {tEpg('inProgress')}
                      </Text>
                    </>
                  ) : epgGlobalStatus === tEpg('upToDate') ? (
                    <>
                      <Icon
                        name="check-circle"
                        size={16}
                        color="#4CAF50"
                        style={styles.statusIcon}
                      />
                      <Text
                        style={[
                          styles.statusDescription,
                          styles.statusSuccessText,
                          {fontSize: getScaledTextSize(12)},
                        ]}>
                        {tEpg('upToDate')}
                      </Text>
                    </>
                  ) : epgGlobalStatus.includes(tCommon('error')) ? (
                    <>
                      <Icon
                        name="error"
                        size={16}
                        color="#F44336"
                        style={styles.statusIcon}
                      />
                      <Text
                        style={[
                          styles.statusDescription,
                          styles.statusErrorText,
                          {fontSize: getScaledTextSize(12)},
                        ]}>
                        {tCommon('error')}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Icon
                        name="cloud-download"
                        size={16}
                        color="#9E9E9E"
                        style={styles.statusIcon}
                      />
                      <Text
                        style={[
                          styles.statusDescription,
                          styles.statusInactive,
                          {fontSize: getScaledTextSize(12)},
                        ]}>
                        {tEpg('notDownloaded')}
                      </Text>
                    </>
                  )}
                </View>
              </View>
            </View>

            {/* Barre de progression moderne */}
            {isDownloading && (
              <View style={styles.modernProgressContainer}>
                <View style={styles.modernProgressBar}>
                  <Animated.View
                    style={[
                      styles.modernProgressFill,
                      {
                        width: progressAnim.interpolate({
                          inputRange: [0, 100],
                          outputRange: ['0%', '100%'],
                          extrapolate: 'clamp',
                        }),
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.modernProgressText, {fontSize: getScaledTextSize(10)}]}>
                  {Math.round(downloadProgress)}%
                </Text>
              </View>
            )}
          </LinearGradient>

          {/* Bouton d'action principal */}
          <TouchableOpacity
            style={[
              styles.modernActionButton,
              styles.primaryActionButton,
              isDownloading && styles.disabledActionButton,
            ]}
            onPress={handleDownloadGlobalEPG}
            disabled={isDownloading}
            activeOpacity={0.8}>
            <LinearGradient
              colors={
                isDownloading ? ['#6B7FBB', '#5A6FA8'] : ['#4A90E2', '#357ABD']
              }
              style={styles.actionButtonGradient}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}>
              <View style={styles.actionButtonContent}>
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Icon
                    name={
                      epgGlobalStatus === 'Téléchargé'
                        ? 'refresh'
                        : 'file-download'
                    }
                    size={14}
                    color="#FFFFFF"
                  />
                )}
                <Text style={[styles.modernActionButtonText, {fontSize: getScaledTextSize(13)}]}>
                  {isDownloading
                    ? tEpg('downloading')
                    : epgGlobalStatus === tEpg('upToDate')
                    ? tEpg('refreshEPGGlobal')
                    : tEpg('downloadEPGGlobal')}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={[styles.modernHelpText, {fontSize: getScaledTextSize(10)}]}>
            {tEpg('epgGlobalHelpText')}
          </Text>
        </LinearGradient>

        {/* Section Sources Manuelles */}
        <LinearGradient
          colors={['#4A4F6C', '#3A3F5C', '#2E3348', '#222734']}
          style={styles.modernSection}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          locations={[0, 0.3, 0.7, 1]}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconTitleContainer}>
              <LinearGradient
                colors={['#00BCD4', '#0097A7']}
                style={styles.sectionIcon}>
                <Icon name="tune" size={16} color="#FFFFFF" />
              </LinearGradient>
              <Text style={[styles.modernSectionTitle, {fontSize: getScaledTextSize(16)}]}>
                {tEpg('manualEPGSources')}
              </Text>
            </View>
          </View>

          {/* ✅ Compteur unifié plus clair */}
          <LinearGradient
            colors={['#4A4F6C', '#3A3F5C', '#2E3348', '#222734']}
            style={styles.unifiedStatCard}
            locations={[0, 0.3, 0.7, 1]}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}>
            <View style={styles.unifiedStatContent}>
              <View style={styles.statInfo}>
                <Text style={[styles.statLabel, {fontSize: getScaledTextSize(10)}]}>{tEpg('assignedSources')}</Text>
                <View style={styles.ratioContainer}>
                  <Text style={[styles.ratioValue, {fontSize: getScaledTextSize(16)}]}>
                    <Text style={[styles.ratioActive, {fontSize: getScaledTextSize(18)}]}>
                      {epgStats.manualCount}
                    </Text>
                    <Text style={[styles.ratioSeparator, {fontSize: getScaledTextSize(14)}]}> / </Text>
                    <Text style={[styles.ratioTotal, {fontSize: getScaledTextSize(16)}]}>
                      {epgStats.totalSources}
                    </Text>
                  </Text>
                </View>
              </View>
              <View style={styles.statIconContainer}>
                <View style={styles.progressRing}>
                  {epgStats.manualCount > 0 ? (
                    <Icon name="check-circle" size={16} color="#4CAF50" />
                  ) : (
                    <Icon
                      name="radio-button-unchecked"
                      size={16}
                      color="#9E9E9E"
                    />
                  )}
                </View>
              </View>
            </View>
          </LinearGradient>

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.modernActionButton}
              onPress={handleManageEPGSources}
              activeOpacity={0.8}>
              <LinearGradient
                colors={['#00BCD4', '#0097A7']}
                style={styles.actionButtonGradient}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}>
                <View style={styles.actionButtonContent}>
                  <Icon name="tune" size={14} color="#FFFFFF" />
                  <Text style={[styles.modernActionButtonText, {fontSize: getScaledTextSize(13)}]}>
                    {tEpg('manageSources')}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modernActionButton}
              onPress={handleAssignEPGToPlaylists}
              activeOpacity={0.8}>
              <LinearGradient
                colors={['#7B1FA2', '#6A1B99']}
                style={styles.actionButtonGradient}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}>
                <View style={styles.actionButtonContent}>
                  <Icon name="playlist-add" size={14} color="#FFFFFF" />
                  <Text style={[styles.modernActionButtonText, {fontSize: getScaledTextSize(13)}]}>
                    {tEpg('assignToPlaylists')}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <Text style={[styles.modernHelpText, {fontSize: getScaledTextSize(10)}]}>
            {tEpg('manualEPGHelpText')}
          </Text>
        </LinearGradient>

        {/* Section Actions */}
        <LinearGradient
          colors={['#4A4F6C', '#3A3F5C', '#2E3348', '#222734']}
          style={styles.modernSection}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          locations={[0, 0.3, 0.7, 1]}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconTitleContainer}>
              <LinearGradient
                colors={['#FF9800', '#F57C00']}
                style={styles.sectionIcon}>
                <Icon name="build" size={16} color="#FFFFFF" />
              </LinearGradient>
              <Text style={[styles.modernSectionTitle, {fontSize: getScaledTextSize(16)}]}>{tEpg('epgActions')}</Text>
            </View>
          </View>

          {/* ✅ Animation de progression pour vidage cache */}
          {isClearingCache && (
            <View style={styles.clearProgressContainer}>
              <View style={styles.progressHeader}>
                <ActivityIndicator size="small" color="#F44336" />
                <Text style={[styles.progressTitle, {fontSize: getScaledTextSize(14)}]}>
                  {tEpg('deletingCache')}
                </Text>
              </View>
              <View style={styles.modernProgressBar}>
                <View
                  style={[
                    styles.modernProgressFill,
                    {width: `${clearProgress}%`},
                  ]}
                />
              </View>
              <Text style={[styles.modernProgressText, {fontSize: getScaledTextSize(10)}]}>{clearProgress}%</Text>
            </View>
          )}

          <View style={styles.actionButtonsContainer}>
            {/* ✅ Bouton "Actualiser EPG" supprimé - fonction intégrée au bouton principal */}

            <TouchableOpacity
              style={[
                styles.modernActionButton,
                isClearingCache && styles.disabledActionButton,
              ]}
              onPress={handleClearEPGCache}
              disabled={isClearingCache}
              activeOpacity={0.8}>
              <LinearGradient
                colors={
                  isClearingCache
                    ? ['#9E9E9E', '#757575']
                    : ['#F44336', '#D32F2F']
                }
                style={styles.actionButtonGradient}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}>
                <View style={styles.actionButtonContent}>
                  {isClearingCache ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Icon name="delete-sweep" size={14} color="#FFFFFF" />
                  )}
                  <Text style={[styles.modernActionButtonText, {fontSize: getScaledTextSize(13)}]}>
                    {isClearingCache ? tEpg('clearing') : tEpg('clearCache')}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Section Informations */}
        <LinearGradient
          colors={['#4A4F6C', '#3A3F5C', '#2E3348', '#222734']}
          style={styles.modernSection}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          locations={[0, 0.3, 0.7, 1]}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconTitleContainer}>
              <LinearGradient
                colors={['#4CAF50', '#388E3C']}
                style={styles.sectionIcon}>
                <Icon name="info-outline" size={16} color="#FFFFFF" />
              </LinearGradient>
              <Text style={[styles.modernSectionTitle, {fontSize: getScaledTextSize(16)}]}>{tSettings('information')}</Text>
            </View>
          </View>

          <View style={styles.infoCardsContainer}>
            <LinearGradient
              colors={['#4A4F6C', '#3A3F5C', '#2E3348', '#222734']}
              style={styles.modernInfoCard}
              locations={[0, 0.3, 0.7, 1]}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}>
              <View style={styles.infoCardHeader}>
                <Icon name="help-outline" size={14} color="#4CAF50" />
                <Text style={[styles.modernInfoTitle, {fontSize: getScaledTextSize(13)}]}>
                  {tEpg('whatIsEPG')}
                </Text>
              </View>
              <Text style={[styles.modernInfoText, {fontSize: getScaledTextSize(11)}]}>
                {tEpg('whatIsEPGDescription')}
              </Text>
            </LinearGradient>

            <LinearGradient
              colors={['#4A4F6C', '#3A3F5C', '#2E3348', '#222734']}
              style={styles.modernInfoCard}
              locations={[0, 0.3, 0.7, 1]}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}>
              <View style={styles.infoCardHeader}>
                <Icon name="priority-high" size={14} color="#FF9800" />
                <Text style={[styles.modernInfoTitle, {fontSize: getScaledTextSize(13)}]}>
                  {tEpg('epgPriorities')}
                </Text>
              </View>
              <View style={styles.priorityList}>
                <View style={styles.priorityItem}>
                  <View
                    style={[
                      styles.priorityBadge,
                      {backgroundColor: '#4CAF50'},
                    ]}>
                    <Text style={[styles.priorityNumber, {fontSize: getScaledTextSize(8)}]}>1</Text>
                  </View>
                  <Text style={[styles.priorityText, {fontSize: getScaledTextSize(11)}]}>
                    {tEpg('integratedPlaylistEPG')}
                  </Text>
                </View>
                <View style={styles.priorityItem}>
                  <View
                    style={[
                      styles.priorityBadge,
                      {backgroundColor: '#FF9800'},
                    ]}>
                    <Text style={[styles.priorityNumber, {fontSize: getScaledTextSize(8)}]}>2</Text>
                  </View>
                  <Text style={[styles.priorityText, {fontSize: getScaledTextSize(11)}]}>
                    {tEpg('manualAssignedEPG')}
                  </Text>
                </View>
                <View style={styles.priorityItem}>
                  <View
                    style={[
                      styles.priorityBadge,
                      {backgroundColor: '#2196F3'},
                    ]}>
                    <Text style={[styles.priorityNumber, {fontSize: getScaledTextSize(8)}]}>3</Text>
                  </View>
                  <Text style={[styles.priorityText, {fontSize: getScaledTextSize(11)}]}>
                    {tEpg('globalEPG')}
                  </Text>
                </View>
                <View style={styles.priorityItem}>
                  <View
                    style={[
                      styles.priorityBadge,
                      {backgroundColor: '#9E9E9E'},
                    ]}>
                    <Text style={[styles.priorityNumber, {fontSize: getScaledTextSize(8)}]}>4</Text>
                  </View>
                  <Text style={[styles.priorityText, {fontSize: getScaledTextSize(11)}]}>{tEpg('noEPG')}</Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        </LinearGradient>
      </ScrollView>

      {/* Dialogues modernes */}
      <ModernDialog
        visible={showDownloadDialog}
        title={tEpg('automaticEPGGlobal')}
        message={tEpg('downloadEPGMessage')}
        icon="file-download"
        iconColor="#4A90E2"
        buttons={[
          {text: tCommon('cancel'), style: 'cancel', onPress: () => {}},
          {text: tEpg('downloadStarting'), onPress: () => startEPGDownload()},
        ]}
        onClose={() => setShowDownloadDialog(false)}
      />

      <ModernDialog
        visible={showRefreshDialog}
        title={tEpg('refreshEPGGlobal')}
        message={tEpg('refreshEPGMessage')}
        icon="refresh"
        iconColor="#FF9800"
        buttons={[
          {text: tCommon('cancel'), style: 'cancel', onPress: () => {}},
          {text: tEpg('refreshStarting'), onPress: () => executeRefreshEPG()},
        ]}
        onClose={() => setShowRefreshDialog(false)}
      />

      <ModernDialog
        visible={showClearCacheDialog}
        title={tCommon('attention')}
        message={tEpg('clearCacheMessage')}
        icon="warning"
        iconColor="#F44336"
        buttons={[
          {text: tCommon('cancel'), style: 'cancel', onPress: () => {}},
          {
            text: tEpg('clearCacheWarning'),
            style: 'destructive',
            onPress: () => executeClearCache(),
          },
        ]}
        onClose={() => setShowClearCacheDialog(false)}
      />

      {/* ModernDialog de succès pour actions comme vider le cache */}
      <ModernDialog
        visible={showSuccessDialog}
        title={tEpg('actionCompleted')}
        message={successMessage}
        icon="check-circle"
        iconColor="#4CAF50"
        buttons={[{text: tCommon('perfect'), onPress: () => {}}]}
        onClose={() => setShowSuccessDialog(false)}
      />
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
    paddingTop: 35,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textAlign: 'center',
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  topSpacer: {
    height: 24,
    backgroundColor: 'transparent',
  },

  // ===== MODERN STYLES =====
  modernSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  sectionHeader: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  iconTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },

  modernSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Status Card
  statusCard: {
    borderRadius: 8,
    padding: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },

  statusCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  statusInfo: {
    flex: 1,
  },

  statusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F0F1F5',
    marginBottom: 2,
  },

  statusDescription: {
    fontSize: 12,
    color: 'rgba(240, 241, 245, 0.7)',
    fontWeight: '500',
  },

  statusIndicatorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  modernStatusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },

  statusSuccess: {
    backgroundColor: '#4CAF50',
  },

  statusError: {
    backgroundColor: '#F44336',
  },

  modernLoadingIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(74, 144, 226, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ✅ Nouveaux styles pour indicateurs de statut améliorés
  statusWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },

  statusIcon: {
    marginRight: 6,
  },

  statusSuccessText: {
    color: '#4CAF50',
    fontWeight: '600',
  },

  statusErrorText: {
    color: '#F44336',
    fontWeight: '600',
  },

  statusInProgress: {
    color: '#FF9800',
    fontWeight: '600',
  },

  statusInactive: {
    color: '#9E9E9E',
    fontWeight: '500',
  },

  // ✅ Nouveaux styles pour compteur unifié
  unifiedStatCard: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    marginHorizontal: 4,
  },

  unifiedStatContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  ratioContainer: {
    marginTop: 4,
  },

  ratioValue: {
    fontSize: 16,
    fontWeight: '700',
  },

  ratioActive: {
    color: '#4CAF50',
    fontSize: 18,
  },

  ratioSeparator: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },

  ratioTotal: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
  },

  progressRing: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ✅ Styles pour animation de progression vidage cache
  clearProgressContainer: {
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
  },

  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  progressTitle: {
    fontSize: 14,
    color: '#F0F1F5',
    fontWeight: '600',
    marginLeft: 8,
  },

  // Progress Bar Modern
  modernProgressContainer: {
    marginTop: 10,
  },

  modernProgressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },

  modernProgressFill: {
    height: '100%',
    backgroundColor: '#4A90E2',
    borderRadius: 2,
  },

  modernProgressText: {
    fontSize: 10,
    color: '#F0F1F5',
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Action Buttons Modern
  modernActionButton: {
    borderRadius: 8,
    marginBottom: 10,
    marginHorizontal: 4,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },

  primaryActionButton: {
    marginBottom: 12,
  },

  disabledActionButton: {
    opacity: 0.6,
  },

  actionButtonGradient: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },

  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modernActionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
    letterSpacing: 0.3,
  },

  actionButtonsContainer: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  // Stats Container
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 10,
    paddingHorizontal: 4,
  },

  statCard: {
    flex: 1,
    borderRadius: 6,
    padding: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },

  statCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  statInfo: {
    flex: 1,
  },

  statLabel: {
    fontSize: 10,
    color: 'rgba(240, 241, 245, 0.7)',
    fontWeight: '500',
    marginBottom: 2,
  },

  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F0F1F5',
  },

  statIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Info Cards Modern
  infoCardsContainer: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  modernInfoCard: {
    borderRadius: 8,
    padding: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },

  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },

  modernInfoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F0F1F5',
    marginLeft: 6,
    letterSpacing: 0.3,
  },

  modernInfoText: {
    fontSize: 11,
    color: 'rgba(240, 241, 245, 0.8)',
    lineHeight: 16,
    fontWeight: '400',
  },

  // Priority List
  priorityList: {
    marginTop: 4,
  },

  priorityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },

  priorityBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },

  priorityNumber: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  priorityText: {
    fontSize: 11,
    color: 'rgba(240, 241, 245, 0.8)',
    fontWeight: '500',
    flex: 1,
  },

  // Features List
  featuresList: {
    marginTop: 4,
  },

  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },

  featureText: {
    fontSize: 11,
    color: 'rgba(240, 241, 245, 0.8)',
    fontWeight: '500',
    marginLeft: 6,
    flex: 1,
  },

  modernHelpText: {
    fontSize: 10,
    color: 'rgba(240, 241, 245, 0.6)',
    lineHeight: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 8,
  },

  // ===== LEGACY STYLES (kept for compatibility) =====
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 15,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  settingDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  statusActive: {
    backgroundColor: '#4CAF50',
  },
  downloadingIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(33, 150, 243, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    marginBottom: 15,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
  },
  downloadButton: {
    backgroundColor: '#2196F3',
  },
  downloadButtonDisabled: {
    backgroundColor: 'rgba(33, 150, 243, 0.5)',
  },
  manageButton: {
    backgroundColor: '#009688',
  },
  assignButton: {
    backgroundColor: '#673ab7',
  },
  refreshButton: {
    backgroundColor: '#FF9800',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  helpText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
  },
  headerSpacer: {
    width: 36, // Same width as back button for perfect centering
  },
});

export default TVGuideSettingsScreen;
