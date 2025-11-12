/**
 * ⚡ PerformanceSettingsScreen - Écran de paramètres Performance, Cache et Optimisations
 * Gère le cache vidéo, les optimisations réseau et les paramètres de performance
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Switch,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import SystemNavigationBar from 'react-native-system-navigation-bar';
import {Picker} from '@react-native-picker/picker';

import {useThemeColors} from '../contexts/ThemeContext';
import {useI18n} from '../hooks/useI18n';
import type {RootStackParamList} from '../types';
import {CacheManager} from '../services/CacheManager';
import { videoSettingsService } from '../services/VideoSettingsService';
import type { VideoSettings } from '../services/VideoSettingsService';
import CacheMetricsService, { CacheMetrics } from '../services/CacheMetricsService';

type NavigationProp = StackNavigationProp<RootStackParamList>;

type CacheSize = 500 | 1000 | 2000;
type AutoClearDays = 3 | 7 | 14 | 30;
type DecoderType = 'auto' | 'hardware' | 'software';

const PerformanceSettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const colors = useThemeColors();
  const {t: tCommon} = useI18n('common');
  const {t: tSettings} = useI18n('settings');

  // États des paramètres
  const [cacheLimit, setCacheLimit] = useState<CacheSize>(1000);
  const [autoClearDays, setAutoClearDays] = useState<AutoClearDays>(7);
  const [compressionEnabled, setCompressionEnabled] = useState(true);
  const [hlsCacheEnabled, setHlsCacheEnabled] = useState(true);
  const [dnsCacheEnabled, setDnsCacheEnabled] = useState(true);

  // États pour les paramètres vidéo
  const [videoSettings, setVideoSettings] = useState<VideoSettings | null>(null);
  const [isLoadingVideoSettings, setIsLoadingVideoSettings] = useState(true);

  // États pour le monitoring du cache
  const [cacheMetrics, setCacheMetrics] = useState<CacheMetrics | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Charger les paramètres de cache
        const cacheSettings = await CacheManager.getSettings();
        setCacheLimit(cacheSettings.cacheLimit);
        setAutoClearDays(cacheSettings.autoClearDays);
        setCompressionEnabled(cacheSettings.compressionEnabled);
        setHlsCacheEnabled(cacheSettings.hlsCacheEnabled);
        setDnsCacheEnabled(cacheSettings.dnsCacheEnabled);

        // Charger les paramètres vidéo
        setIsLoadingVideoSettings(true);
        const loadedVideoSettings = await videoSettingsService.loadSettings();
        setVideoSettings(loadedVideoSettings);
      } catch (error) {
        console.error('Erreur chargement paramètres:', error);
      } finally {
        setIsLoadingVideoSettings(false);
      }
    };

    SystemNavigationBar.immersive();
    loadSettings();

    // Démarrer le monitoring du cache
    CacheMetricsService.startMonitoring();
    setIsMonitoring(true);

    // Charger les métriques initiales
    loadCacheMetrics();

    // Rafraîchir les métriques uniquement quand nécessaire (optimisé)
    let metricsInterval: NodeJS.Timeout | null = null;

    return () => {
      SystemNavigationBar.navigationShow();
      CacheMetricsService.stopMonitoring();
      if (metricsInterval) clearInterval(metricsInterval);
    };
  }, []);

  // Charger les métriques du cache
  const loadCacheMetrics = async () => {
    try {
      const metrics = await CacheMetricsService.calculateMetrics();
      setCacheMetrics(metrics);
    } catch (error) {
      console.error('❌ Erreur chargement métriques cache:', error);
    }
  };

  const handleCacheLimitChange = async (value: CacheSize) => {
    setCacheLimit(value);
    await CacheManager.setCacheLimit(value);

    // Vérifier immédiatement les limites après le changement
    await CacheMetricsService.forceCheckLimits();

    // Recharger les métriques pour l'UI (une seule fois)
    await loadCacheMetrics();

    console.log(`📊 Limite de cache changée: ${value}MB`);
  };

  const handleAutoClearChange = async (value: AutoClearDays) => {
    setAutoClearDays(value);
    await CacheManager.setAutoClearDays(value);
  };

  const handleCompressionToggle = async (value: boolean) => {
    setCompressionEnabled(value);
    await CacheManager.enableCompression(value);
  };

  const handleHLSCacheToggle = async (value: boolean) => {
    setHlsCacheEnabled(value);
    await CacheManager.enableHLSCache(value);
  };

  const handleDNSCacheToggle = async (value: boolean) => {
    setDnsCacheEnabled(value);
    await CacheManager.enableDNSCache(value);
  };

  // Gestionnaires pour les paramètres vidéo
  const saveVideoSettings = async (newSettings: VideoSettings) => {
    try {
      const success = await videoSettingsService.saveSettings(newSettings);
      if (success) {
        setVideoSettings(newSettings);
        console.log('✅ Paramètres vidéo sauvegardés avec succès');
      } else {
        throw new Error('Échec sauvegarde');
      }
    } catch (error) {
      console.error('❌ Erreur sauvegarde paramètres vidéo:', error);
      Alert.alert(tCommon('error'), tCommon('cannotSaveSettings'));
    }
  };

  const handleHardwareAccelerationToggle = async (value: boolean) => {
    if (videoSettings) {
      await saveVideoSettings({...videoSettings, hardwareAcceleration: value});
      console.log(`⚡ Accélération matérielle: ${value ? 'activée' : 'désactivée'}`);
    }
  };

  const handleDecoderTypeChange = async (type: DecoderType) => {
    if (videoSettings) {
      await saveVideoSettings({...videoSettings, decoderType: type});
      console.log(`🎬 Type de décodeur: ${type}`);
    }
  };

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={[styles.section, {backgroundColor: colors.surface.primary}]}>
      <Text style={[styles.sectionTitle, {color: colors.accent.primary}]}>
        {title}
      </Text>
      {children}
    </View>
  );

  const renderPickerOption = (
    label: string,
    value: CacheSize | AutoClearDays,
    onChange: (value: any) => void,
    options: {label: string; value: CacheSize | AutoClearDays}[],
  ) => (
    <View style={styles.optionContainer}>
      <Text style={[styles.optionLabel, {color: colors.text.primary}]}>
        {label}
      </Text>
      <View
        style={[
          styles.pickerContainer,
          {backgroundColor: colors.surface.secondary},
        ]}>
        <Picker
          selectedValue={value}
          onValueChange={onChange}
          style={[styles.picker, {color: colors.text.primary}]}
          dropdownIconColor={colors.text.secondary}>
          {options.map(option => (
            <Picker.Item
              key={option.value}
              label={option.label}
              value={option.value}
            />
          ))}
        </Picker>
      </View>
    </View>
  );

  const renderSwitchOption = (
    label: string,
    description: string,
    value: boolean,
    onChange: (value: boolean) => void,
    icon: string,
  ) => (
    <View style={styles.switchOption}>
      <View style={styles.switchOptionLeft}>
        <Icon name={icon} size={24} color={colors.accent.primary} />
        <View style={styles.switchOptionText}>
          <Text style={[styles.switchOptionLabel, {color: colors.text.primary}]}>
            {label}
          </Text>
          <Text
            style={[
              styles.switchOptionDescription,
              {color: colors.text.secondary},
            ]}>
            {description}
          </Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{
          false: colors.surface.secondary,
          true: colors.accent.primary,
        }}
        thumbColor={value ? colors.accent.secondary : colors.text.disabled}
      />
    </View>
  );

  const renderDecoderOption = (
    type: DecoderType,
    icon: string,
    title: string,
    description: string,
  ) => (
    <TouchableOpacity
      key={type}
      style={[
        styles.decoderOption,
        {
          backgroundColor: colors.surface.secondary,
          borderColor: videoSettings?.decoderType === type ? colors.accent.primary : colors.border,
        },
      ]}
      onPress={() => handleDecoderTypeChange(type)}>
      <Icon
        name={icon}
        size={24}
        color={videoSettings?.decoderType === type ? colors.accent.primary : colors.text.secondary}
      />
      <Text
        style={[
          styles.decoderOptionTitle,
          {color: videoSettings?.decoderType === type ? colors.accent.primary : colors.text.primary},
        ]}>
        {title}
      </Text>
      <Text style={[styles.decoderOptionDescription, {color: colors.text.secondary}]}>
        {description}
      </Text>
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={colors.background.gradient} style={styles.container}>
      <StatusBar hidden={true} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, {backgroundColor: colors.surface.primary}]}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, {color: colors.text.primary}]}>
            {tCommon('performance').toUpperCase()}
          </Text>
          <Text style={[styles.headerSubtitle, {color: colors.text.secondary}]}>
            {tSettings('cacheAndOptimizations')}
          </Text>
        </View>
      </View>

      {/* Contenu */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>
        {/* Section Cache Vidéo */}
        {renderSection(
          tSettings('videoCache'),
          <>
            {/* Affichage de l'utilisation actuelle du cache */}
            {cacheMetrics && (
              <View style={[styles.cacheUsageContainer, {backgroundColor: colors.surface.secondary}]}>
                <Text style={[styles.cacheUsageTitle, {color: colors.text.primary}]}>
                  📊 {tSettings('currentUsage')}
                </Text>
                <View style={styles.cacheUsageBar}>
                  <View style={styles.cacheUsageInfo}>
                    <Text style={[styles.cacheUsageText, {color: colors.text.primary}]}>
                      {cacheMetrics.totalSizeMB.toFixed(1)} MB / {cacheLimit} MB
                    </Text>
                    <Text style={[styles.cacheUsagePercentage, {
                      color: cacheMetrics.totalSizeMB > cacheLimit * 0.9 ? colors.accent.error : colors.accent.primary
                    }]}>
                      {((cacheMetrics.totalSizeMB / cacheLimit) * 100).toFixed(1)}%
                    </Text>
                  </View>
                  <View style={styles.cacheUsageProgressContainer}>
                    <View
                      style={[
                        styles.cacheUsageProgress,
                        {
                          width: `${Math.min((cacheMetrics.totalSizeMB / cacheLimit) * 100, 100)}%`,
                          backgroundColor: cacheMetrics.totalSizeMB > cacheLimit * 0.9
                            ? colors.accent.error
                            : cacheMetrics.totalSizeMB > cacheLimit * 0.7
                              ? colors.accent.warning
                              : colors.accent.primary
                        }
                      ]}
                    />
                  </View>
                </View>

                {/* Breakdown détaillé */}
                <View style={styles.cacheBreakdown}>
                  <Text style={[styles.cacheBreakdownTitle, {color: colors.text.secondary}]}>
                    📈 {tSettings('breakdown')}
                  </Text>
                  <View style={styles.cacheBreakdownItems}>
                    <Text style={[styles.cacheBreakdownItem, {color: colors.text.tertiary}]}>
                      • {tSettings('images')}: {(cacheMetrics.breakdown.imageCache.memorySizeMB + cacheMetrics.breakdown.imageCache.diskSizeMB).toFixed(1)}MB
                    </Text>
                    <Text style={[styles.cacheBreakdownItem, {color: colors.text.tertiary}]}>
                      • {tSettings('cacheService')}: {(cacheMetrics.breakdown.cacheService.l1SizeMB + cacheMetrics.breakdown.cacheService.l2SizeMB).toFixed(1)}MB
                    </Text>
                    <Text style={[styles.cacheBreakdownItem, {color: colors.text.tertiary}]}>
                      • {tSettings('epg')}: {(cacheMetrics.breakdown.epgCache.dbSizeMB + cacheMetrics.breakdown.epgCache.memorySizeMB).toFixed(1)}MB
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {renderPickerOption(
              tSettings('cacheLimit'),
              cacheLimit,
              handleCacheLimitChange,
              [
                {label: '500 MB', value: 500},
                {label: '1 GB', value: 1000},
                {label: '2 GB', value: 2000},
              ],
            )}

            {renderPickerOption(
              tSettings('autoClear'),
              autoClearDays,
              handleAutoClearChange,
              [
                {label: `3 ${tSettings('days')}`, value: 3},
                {label: `7 ${tSettings('days')}`, value: 7},
                {label: `14 ${tSettings('days')}`, value: 14},
                {label: `30 ${tSettings('days')}`, value: 30},
              ],
            )}

            {renderSwitchOption(
              tSettings('compression'),
              tSettings('compressionDesc'),
              compressionEnabled,
              handleCompressionToggle,
              'compress',
            )}
          </>,
        )}

        {/* Section Optimisations */}
        {renderSection(
          tSettings('optimizations'),
          <>
            {renderSwitchOption(
              tSettings('hlsCache'),
              tSettings('hlsCacheDesc'),
              hlsCacheEnabled,
              handleHLSCacheToggle,
              'video-library',
            )}

            {renderSwitchOption(
              tSettings('dnsCache'),
              tSettings('dnsCacheDesc'),
              dnsCacheEnabled,
              handleDNSCacheToggle,
              'dns',
            )}
          </>,
        )}

        {/* Section Performance & Décodage */}
        {renderSection(
          tSettings('performanceDecoding'),
          <>
            {videoSettings && (
              <>
                {renderSwitchOption(
                  tSettings('hardwareAccelerationLabel'),
                  tSettings('hardwareAccelerationDesc'),
                  videoSettings.hardwareAcceleration,
                  handleHardwareAccelerationToggle,
                  'memory',
                )}

                <View style={styles.decoderContainer}>
                  <Text style={[styles.switchOptionLabel, {color: colors.text.primary}]}>
                    {tSettings('decoderTypeLabel')}
                  </Text>
                  <Text
                    style={[
                      styles.switchOptionDescription,
                      {color: colors.text.secondary, marginBottom: 16},
                    ]}>
                    {tSettings('decoderTypeDesc')}
                  </Text>
                  <View style={styles.decoderOptions}>
                    {renderDecoderOption(
                      'auto',
                      'autorenew',
                      tCommon('auto'),
                      tCommon('recommended'),
                    )}
                    {renderDecoderOption(
                      'hardware',
                      'memory',
                      'Hardware',
                      'GPU (4K)',
                    )}
                    {renderDecoderOption(
                      'software',
                      'developer-board',
                      'Software',
                      'CPU (Compat.)',
                    )}
                  </View>
                </View>
              </>
            )}
          </>,
        )}

        
        {/* Info Buffer */}
        <View style={[styles.infoCard, {backgroundColor: colors.surface.primary}]}>
          <Icon name="info-outline" size={24} color={colors.accent.primary} />
          <View style={styles.infoTextContainer}>
            <Text style={[styles.infoTitle, {color: colors.text.primary}]}>
              {tSettings('bufferSettings')}
            </Text>
            <Text style={[styles.infoText, {color: colors.text.secondary}]}>
              {tSettings('bufferSettingsDesc')}
            </Text>
          </View>
        </View>
      </ScrollView>
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
    paddingTop: 25,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  section: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  optionContainer: {
    marginBottom: 20,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
  },
  pickerContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  switchOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  switchOptionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  switchOptionText: {
    flex: 1,
    marginLeft: 12,
  },
  switchOptionLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  switchOptionDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  infoCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 20,
    marginTop: 10,
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
  decoderContainer: {
    marginTop: 8,
  },
  decoderOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  decoderOption: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  decoderOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  decoderOptionDescription: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
  },
  cacheUsageContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  cacheUsageTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  cacheUsageBar: {
    marginBottom: 12,
  },
  cacheUsageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cacheUsageText: {
    fontSize: 14,
    fontWeight: '500',
  },
  cacheUsagePercentage: {
    fontSize: 14,
    fontWeight: '600',
  },
  cacheUsageProgressContainer: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  cacheUsageProgress: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 0.3s ease-in-out',
  },
  cacheBreakdown: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  cacheBreakdownTitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  cacheBreakdownItems: {
    paddingLeft: 4,
  },
  cacheBreakdownItem: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 2,
  },
  });

export default PerformanceSettingsScreen;
