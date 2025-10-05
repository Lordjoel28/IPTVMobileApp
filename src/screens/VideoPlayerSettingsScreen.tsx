import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  useColorScheme,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import type {RootStackParamList} from '../../App';

interface Settings {
  autoplay: boolean;
  rememberPosition: boolean;
  quality: 'auto' | '1080p' | '720p' | '480p';
  volume: number;
}

type NavigationProp = StackNavigationProp<RootStackParamList>;

const VideoPlayerSettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [settings, setSettings] = useState<Settings | null>(null);
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // TODO: Remplacer par le nouveau système de services
      const defaultSettings = {
        autoplay: true,
        rememberPosition: true,
        quality: 'auto' as const,
        volume: 75,
      };
      setSettings(defaultSettings);
    } catch (error) {
      console.error('❌ Erreur chargement paramètres:', error);
    }
  };

  const saveSettings = async (newSettings: Settings) => {
    try {
      // TODO: Remplacer par le nouveau système de services
      setSettings(newSettings);
      console.log('⚙️ Paramètres sauvegardés');
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

  if (!settings) {
    return (
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.loadingContainer}>
        <Text style={styles.loadingText}>🔄 Chargement des paramètres...</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
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
              trackColor={{false: '#767577', true: '#2196F3'}}
              thumbColor={settings.autoplay ? '#ffffff' : '#f4f3f4'}
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
              trackColor={{false: '#767577', true: '#2196F3'}}
              thumbColor={settings.rememberPosition ? '#ffffff' : '#f4f3f4'}
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
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    marginRight: 16,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
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
  },
  settingInfo: {
    flex: 1,
    marginRight: 20,
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
  qualityButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  qualityButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  qualityButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  qualityButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  qualityButtonTextActive: {
    color: '#FFFFFF',
  },
  volumeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  volumeButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  volumeButtonActive: {
    backgroundColor: '#009688',
    borderColor: '#009688',
  },
  volumeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  volumeButtonTextActive: {
    color: '#FFFFFF',
  },
});

export default VideoPlayerSettingsScreen;