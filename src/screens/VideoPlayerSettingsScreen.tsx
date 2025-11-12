import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Dimensions,
} from 'react-native';
import { useThemeColors, useIsDark } from '../contexts/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import type {RootStackParamList} from '../../App';
import { videoSettingsService } from '../services/VideoSettingsService';
import type { VideoSettings } from '../services/VideoSettingsService';
import {useI18n} from '../hooks/useI18n';

// L'interface est maintenant importée depuis VideoSettingsService

type NavigationProp = StackNavigationProp<RootStackParamList>;

const VideoPlayerSettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const colors = useThemeColors();
  const isDark = useIsDark();
  const {t: tSettings} = useI18n('settings');
  const {t: tCommon} = useI18n('common');
  const [settings, setSettings] = useState<VideoSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Couleurs par défaut sécurisées si le thème n'est pas disponible
  const safeColors = {
    background: {
      primary: colors?.background?.primary || '#000000',
      secondary: colors?.background?.secondary || '#111111',
    },
    surface: {
      primary: colors?.surface?.primary || '#1a1a1a',
      secondary: colors?.surface?.secondary || '#2a2a2a',
    },
    text: {
      primary: colors?.text?.primary || '#ffffff',
      secondary: colors?.text?.secondary || '#cccccc',
      tertiary: colors?.text?.tertiary || '#999999',
    },
    border: {
      primary: colors?.ui?.border || '#333333',
      secondary: colors?.ui?.divider || '#444444',
    },
    shadow: {
      primary: colors?.ui?.shadow || '#000000',
    },
    primary: {
      main: colors?.accent?.primary || '#2196F3',
    },
    accent: {
      main: colors?.accent?.primary || '#FF9800',
    },
    success: {
      main: colors?.accent?.success || '#4CAF50',
    },
    info: {
      main: colors?.accent?.info || '#2196F3',
    },
  };

  // Fonction pour créer les styles dynamiques selon le thème
  const createStyles = (themeColors: any) => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: safeColors.background.primary,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: safeColors.background.primary,
    },
    loadingText: {
      fontSize: 16,
      color: safeColors.text.primary,
      marginTop: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 25,
      paddingBottom: 20,
      paddingHorizontal: 16,
      backgroundColor: safeColors.surface.primary,
      borderBottomWidth: 1,
      borderBottomColor: safeColors.border.primary,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: safeColors.surface.secondary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: safeColors.text.primary,
      letterSpacing: 1.5,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    section: {
      backgroundColor: safeColors.surface.primary,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      shadowColor: safeColors.shadow.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: safeColors.text.primary,
      marginBottom: 16,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: safeColors.border.secondary,
    },
    settingInfo: {
      flex: 1,
      marginRight: 16,
    },
    settingLabel: {
      fontSize: 16,
      fontWeight: '500',
      color: safeColors.text.primary,
      marginBottom: 4,
    },
    settingDescription: {
      fontSize: 13,
      color: safeColors.text.secondary,
      lineHeight: 18,
    },
    qualityButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 12,
      flexWrap: 'wrap',
    },
    qualityButton: {
      width: '22%',
      backgroundColor: safeColors.surface.secondary,
      paddingVertical: 12,
      marginHorizontal: '1.5%',
      marginVertical: 4,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: safeColors.border.primary,
    },
    qualityButtonActive: {
      backgroundColor: safeColors.primary.main,
      borderColor: safeColors.primary.main,
    },
    qualityButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: safeColors.text.secondary,
    },
    qualityButtonTextActive: {
      color: '#FFFFFF',
    },
    speedButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 12,
      flexWrap: 'wrap',
    },
    speedButton: {
      width: '15%',
      backgroundColor: safeColors.surface.secondary,
      paddingVertical: 10,
      marginHorizontal: 2,
      marginVertical: 2,
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: safeColors.border.primary,
    },
    speedButtonActive: {
      backgroundColor: safeColors.accent.main,
      borderColor: safeColors.accent.main,
    },
    speedButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: safeColors.text.secondary,
    },
    speedButtonTextActive: {
      color: '#FFFFFF',
    },
            volumeButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 12,
      flexWrap: 'wrap',
    },
    volumeButton: {
      width: '23%',
      backgroundColor: safeColors.surface.secondary,
      paddingVertical: 12,
      marginHorizontal: '1%',
      marginVertical: 4,
      borderRadius: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: safeColors.border.primary,
    },
    volumeButtonActive: {
      backgroundColor: safeColors.primary.main,
      borderColor: safeColors.primary.main,
    },
    volumeButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: safeColors.text.secondary,
      textAlign: 'center',
    },
    volumeButtonTextActive: {
      color: '#FFFFFF',
    },
    timeFormatButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 12,
    },
    timeFormatButton: {
      flex: 1,
      backgroundColor: safeColors.surface.secondary,
      paddingVertical: 16,
      marginHorizontal: 8,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: safeColors.border.primary,
    },
    timeFormatButtonActive: {
      backgroundColor: safeColors.info.main,
      borderColor: safeColors.info.main,
    },
    timeFormatButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: safeColors.text.secondary,
      textAlign: 'center',
    },
    timeFormatButtonTextActive: {
      color: '#FFFFFF',
    },
    timeFormatButtonDescription: {
      fontSize: 11,
      color: safeColors.text.tertiary,
      marginTop: 4,
      textAlign: 'center',
    },
  });

  const styles = createStyles(colors);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const loadedSettings = await videoSettingsService.loadSettings();
      setSettings(loadedSettings);
      console.log('✅ Paramètres vidéo chargés:', loadedSettings);
    } catch (error) {
      console.error('❌ Erreur chargement paramètres:', error);
      Alert.alert(tCommon('error'), tCommon('cannotLoadSettings'));
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (newSettings: VideoSettings) => {
    try {
      const success = await videoSettingsService.saveSettings(newSettings);
      if (success) {
        setSettings(newSettings);
        console.log('✅ Paramètres sauvegardés avec succès');
      } else {
        throw new Error('Échec sauvegarde');
      }
    } catch (error) {
      console.error('❌ Erreur sauvegarde paramètres:', error);
      Alert.alert(tCommon('error'), tCommon('cannotSaveSettings'));
    }
  };

  const handleToggleAutoplay = async (value: boolean) => {
    if (settings) {
      await saveSettings({...settings, autoplay: value});
    }
  };

  const handleToggleRememberPosition = async (value: boolean) => {
    if (settings) {
      await saveSettings({...settings, rememberPosition: value});
    }
  };

  const handlePlaybackSpeedChange = async (speed: number) => {
    if (settings) {
      await saveSettings({...settings, playbackSpeed: speed});
      console.log(`⚡ Vitesse de lecture changée: ${speed}x`);
    }
  };

  const handleBackgroundPlayToggle = async (value: boolean) => {
    if (settings) {
      await saveSettings({...settings, backgroundPlay: value});
      console.log(`🎵 Lecture arrière-plan: ${value ? 'activée' : 'désactivée'}`);
    }
  };

  
  const handleNetworkTimeoutChange = async (timeout: number) => {
    if (settings) {
      await saveSettings({...settings, networkTimeout: timeout});
      console.log(`🌐 Timeout réseau: ${timeout}s`);
    }
  };

  const handleTimeFormatChange = async (format: '12h' | '24h') => {
    if (settings) {
      await saveSettings({...settings, timeFormat: format});
      console.log(`🕐 Format heure: ${format}`);
    }
  };

  
  if (isLoading || !settings) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          {isLoading ? `🔄 ${tCommon('loadingSettings')}` : `❌ ${tCommon('loadingError')}`}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={safeColors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{tSettings('videoPlayerSettings')}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Section Lecture */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎬 {tSettings('playbackSettings')}</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{tSettings('autoplayLabel')}</Text>
              <Text style={styles.settingDescription}>
                {tSettings('autoplayDesc')}
              </Text>
            </View>
            <Switch
              value={settings.autoplay}
              onValueChange={handleToggleAutoplay}
              trackColor={{ false: safeColors.border.primary, true: safeColors.primary.main }}
              thumbColor={settings.autoplay ? '#ffffff' : safeColors.surface.secondary}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{tSettings('rememberPositionLabel')}</Text>
              <Text style={styles.settingDescription}>
                {tSettings('rememberPositionDesc')}
              </Text>
            </View>
            <Switch
              value={settings.rememberPosition}
              onValueChange={handleToggleRememberPosition}
              trackColor={{ false: safeColors.border.primary, true: safeColors.primary.main }}
              thumbColor={settings.rememberPosition ? '#ffffff' : safeColors.surface.secondary}
            />
          </View>

          {/* Vitesse de lecture */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>⚡ {tSettings('playbackSpeedLabel')}</Text>
              <Text style={styles.settingDescription}>
                {tCommon('currently')}: {settings.playbackSpeed}x ({tSettings('playbackSpeedDesc')})
              </Text>
            </View>
          </View>

          <View style={styles.speedButtons}>
            {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(speed => (
              <TouchableOpacity
                key={speed}
                style={[
                  styles.speedButton,
                  settings.playbackSpeed === speed && styles.speedButtonActive,
                ]}
                onPress={() => handlePlaybackSpeedChange(speed)}>
                <Text
                  style={[
                    styles.speedButtonText,
                    settings.playbackSpeed === speed &&
                      styles.speedButtonTextActive,
                  ]}>
                  {speed}x
                </Text>
              </TouchableOpacity>
            ))}
          </View>


          {/* Lecture en arrière-plan */}
          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>🎵 {tSettings('backgroundPlayLabel')}</Text>
              <Text style={styles.settingDescription}>
                {tSettings('backgroundPlayDesc')}
              </Text>
            </View>
            <Switch
              value={settings.backgroundPlay}
              onValueChange={handleBackgroundPlayToggle}
              trackColor={{ false: safeColors.border.primary, true: safeColors.success.main }}
              thumbColor={settings.backgroundPlay ? '#ffffff' : safeColors.surface.secondary}
            />
          </View>
        </View>

        
        {/* Section Réseau */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌐 {tSettings('networkSettings')}</Text>

          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{tSettings('networkTimeoutLabel')}</Text>
              <Text style={styles.settingDescription}>
                {tSettings('networkTimeoutDesc')}: {settings.networkTimeout}s
              </Text>
            </View>
          </View>

          <View style={styles.speedButtons}>
            {[5, 10, 15, 20, 30].map(timeout => (
              <TouchableOpacity
                key={timeout}
                style={[
                  styles.speedButton,
                  settings.networkTimeout === timeout && styles.speedButtonActive,
                ]}
                onPress={() => handleNetworkTimeoutChange(timeout)}>
                <Text
                  style={[
                    styles.speedButtonText,
                    settings.networkTimeout === timeout &&
                      styles.speedButtonTextActive,
                  ]}>
                  {timeout}s
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Section Interface */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎨 {tSettings('userInterface')}</Text>

          {/* Format heure */}
          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{tSettings('timeFormatLabel')}</Text>
              <Text style={styles.settingDescription}>
                {tSettings('timeFormatDesc')}
              </Text>
            </View>
          </View>

          <View style={styles.timeFormatButtons}>
            <TouchableOpacity
              style={[
                styles.timeFormatButton,
                settings.timeFormat === '12h' && styles.timeFormatButtonActive,
              ]}
              onPress={() => handleTimeFormatChange('12h')}>
              <Icon
                name="access-time"
                size={24}
                color={settings.timeFormat === '12h' ? '#FFFFFF' : safeColors.text.secondary}
              />
              <Text
                style={[
                  styles.timeFormatButtonText,
                  settings.timeFormat === '12h' && styles.timeFormatButtonTextActive,
                ]}>
                {tSettings('twelveHours')}
              </Text>
              <Text style={styles.timeFormatButtonDescription}>
                {tSettings('amPm')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.timeFormatButton,
                settings.timeFormat === '24h' && styles.timeFormatButtonActive,
              ]}
              onPress={() => handleTimeFormatChange('24h')}>
              <Icon
                name="schedule"
                size={24}
                color={settings.timeFormat === '24h' ? '#FFFFFF' : safeColors.text.secondary}
              />
              <Text
                style={[
                  styles.timeFormatButtonText,
                  settings.timeFormat === '24h' && styles.timeFormatButtonTextActive,
                ]}>
                {tSettings('twentyFourHours')}
              </Text>
              <Text style={styles.timeFormatButtonDescription}>
                {tCommon('standard')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default VideoPlayerSettingsScreen;
