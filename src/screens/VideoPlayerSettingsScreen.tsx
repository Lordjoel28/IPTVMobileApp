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

// L'interface est maintenant importée depuis VideoSettingsService

type NavigationProp = StackNavigationProp<RootStackParamList>;

const VideoPlayerSettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const colors = useThemeColors();
  const isDark = useIsDark();
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
    skipButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 12,
      flexWrap: 'wrap',
    },
    skipButton: {
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
    skipButtonActive: {
      backgroundColor: safeColors.success.main,
      borderColor: safeColors.success.main,
    },
    skipButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: safeColors.text.secondary,
      textAlign: 'center',
    },
    skipButtonTextActive: {
      color: '#FFFFFF',
    },
    priorityButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 12,
    },
    priorityButton: {
      flex: 1,
      backgroundColor: safeColors.surface.secondary,
      paddingVertical: 16,
      marginHorizontal: 8,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: safeColors.border.primary,
    },
    priorityButtonActive: {
      backgroundColor: safeColors.info.main,
      borderColor: safeColors.info.main,
    },
    priorityButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: safeColors.text.secondary,
      textAlign: 'center',
    },
    priorityButtonTextActive: {
      color: '#FFFFFF',
    },
    priorityButtonDescription: {
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
      Alert.alert('Erreur', 'Impossible de charger les paramètres');
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
      Alert.alert('Erreur', 'Impossible de sauvegarder les paramètres');
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

  const handleQualityChange = async (
    quality: 'auto' | '1080p' | '720p' | '480p',
  ) => {
    if (settings) {
      await saveSettings({...settings, quality});
    }
  };

  const handleVolumeChange = async (volume: number) => {
    if (settings) {
      await saveSettings({...settings, volume});
      // TODO: Intégrer avec le nouveau système de player
    }
  };

  const handlePlaybackSpeedChange = async (speed: number) => {
    if (settings) {
      await saveSettings({...settings, playbackSpeed: speed});
      console.log(`⚡ Vitesse de lecture changée: ${speed}x`);
    }
  };

  const handleSkipDurationChange = async (duration: number) => {
    if (settings) {
      await saveSettings({...settings, skipDuration: duration});
      console.log(`⏩ Durée de saut changée: ${duration}s`);
    }
  };

  const handleBackgroundPlayToggle = async (value: boolean) => {
    if (settings) {
      await saveSettings({...settings, backgroundPlay: value});
      console.log(`🎵 Lecture arrière-plan: ${value ? 'activée' : 'désactivée'}`);
    }
  };

  const handleQualityPriorityChange = async (priority: 'resolution' | 'fluidity') => {
    if (settings) {
      await saveSettings({...settings, qualityPriority: priority});
      console.log(`🎯 Priorité qualité: ${priority}`);
    }
  };

  // Formater la durée pour l'affichage
  const formatSkipDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
    return `${Math.floor(seconds / 3600)}h${Math.floor((seconds % 3600) / 60)}min`;
  };

  if (isLoading || !settings) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          {isLoading ? '🔄 Chargement des paramètres...' : '❌ Erreur de chargement'}
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
        <Text style={styles.headerTitle}>Lecteur Vidéo</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Section Lecture */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎬 Paramètres de Lecture</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Lecture automatique</Text>
              <Text style={styles.settingDescription}>
                Démarrer automatiquement la lecture des chaînes
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
              <Text style={styles.settingLabel}>Mémoriser la position</Text>
              <Text style={styles.settingDescription}>
                Reprendre la lecture où vous vous êtes arrêté
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
              <Text style={styles.settingLabel}>⚡ Vitesse de lecture</Text>
              <Text style={styles.settingDescription}>
                Actuellement: {settings.playbackSpeed}x (VOD/Catch-up uniquement)
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

          {/* Saut intelligent */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>⏩ Saut intelligent</Text>
              <Text style={styles.settingDescription}>
                Durée du saut pour double-tap gauche/droite: {formatSkipDuration(settings.skipDuration)}
              </Text>
            </View>
          </View>

          <View style={styles.skipButtons}>
            {[10, 30, 60, 300].map(duration => (
              <TouchableOpacity
                key={duration}
                style={[
                  styles.skipButton,
                  settings.skipDuration === duration && styles.skipButtonActive,
                ]}
                onPress={() => handleSkipDurationChange(duration)}>
                <Text
                  style={[
                    styles.skipButtonText,
                    settings.skipDuration === duration && styles.skipButtonTextActive,
                  ]}>
                  {formatSkipDuration(duration)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Lecture en arrière-plan */}
          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>🎵 Lecture en arrière-plan</Text>
              <Text style={styles.settingDescription}>
                Continuer l'audio lorsque l'app est en arrière-plan
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

        {/* Section Qualité */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Qualité Vidéo</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Qualité par défaut</Text>
              <Text style={styles.settingDescription}>
                Actuellement: {settings.quality}
              </Text>
            </View>
          </View>

          <View style={styles.qualityButtons}>
            {['auto', '1080p', '720p', '480p'].map(quality => (
              <TouchableOpacity
                key={quality}
                style={[
                  styles.qualityButton,
                  settings.quality === quality && styles.qualityButtonActive,
                ]}
                onPress={() => handleQualityChange(quality as any)}>
                <Text
                  style={[
                    styles.qualityButtonText,
                    settings.quality === quality &&
                      styles.qualityButtonTextActive,
                  ]}>
                  {quality}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Priorité Qualité */}
          <View style={[styles.settingRow, { marginTop: 16 }]}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>🎯 Priorité de qualité</Text>
              <Text style={styles.settingDescription}>
                Privilégier la résolution ou la fluidité
              </Text>
            </View>
          </View>

          <View style={styles.priorityButtons}>
            <TouchableOpacity
              style={[
                styles.priorityButton,
                settings.qualityPriority === 'resolution' && styles.priorityButtonActive,
              ]}
              onPress={() => handleQualityPriorityChange('resolution')}>
              <Icon
                name="high-quality"
                size={24}
                color={settings.qualityPriority === 'resolution' ? '#FFFFFF' : safeColors.text.secondary}
              />
              <Text
                style={[
                  styles.priorityButtonText,
                  settings.qualityPriority === 'resolution' && styles.priorityButtonTextActive,
                ]}>
                Résolution
              </Text>
              <Text style={styles.priorityButtonDescription}>
                Meilleure qualité
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.priorityButton,
                settings.qualityPriority === 'fluidity' && styles.priorityButtonActive,
              ]}
              onPress={() => handleQualityPriorityChange('fluidity')}>
              <Icon
                name="speed"
                size={24}
                color={settings.qualityPriority === 'fluidity' ? '#FFFFFF' : safeColors.text.secondary}
              />
              <Text
                style={[
                  styles.priorityButtonText,
                  settings.qualityPriority === 'fluidity' && styles.priorityButtonTextActive,
                ]}>
                Fluidité
              </Text>
              <Text style={styles.priorityButtonDescription}>
                Lecture fluide
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section Volume */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔊 Audio</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>
                Volume par défaut: {settings.volume}%
              </Text>
            </View>
          </View>

          <View style={styles.volumeButtons}>
            {[25, 50, 75, 100].map(volume => (
              <TouchableOpacity
                key={volume}
                style={[
                  styles.volumeButton,
                  settings.volume === volume && styles.volumeButtonActive,
                ]}
                onPress={() => handleVolumeChange(volume)}>
                <Text
                  style={[
                    styles.volumeButtonText,
                    settings.volume === volume && styles.volumeButtonTextActive,
                  ]}>
                  {volume}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default VideoPlayerSettingsScreen;
