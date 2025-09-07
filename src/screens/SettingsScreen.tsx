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
// AppManager removed - will be replaced by DI services
import {Settings} from '../types';

const SettingsScreen: React.FC = () => {
  // AppManager removed - will use DI services + Zustand stores
  const [settings, setSettings] = useState<Settings | null>(null);
  const [stats, setStats] = useState<any>(null);
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    loadSettings();
    loadStats();
  }, []);

  const loadSettings = async () => {
    try {
      const currentSettings = await appManager
        .getStorageService()
        .getSettings();
      setSettings(currentSettings);
    } catch (error) {
      console.error('❌ Erreur chargement paramètres:', error);
    }
  };

  const loadStats = () => {
    try {
      const appStats = appManager.getStats();
      setStats(appStats);
    } catch (error) {
      console.error('❌ Erreur chargement statistiques:', error);
    }
  };

  const saveSettings = async (newSettings: Settings) => {
    try {
      await appManager.getStorageService().saveSettings(newSettings);
      setSettings(newSettings);

      // Update player config if needed
      await appManager.getPlayerManager().updateConfig({
        autoplay: newSettings.autoplay,
        quality: newSettings.quality,
      });

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
      appManager.getPlayerManager().setVolume(volume);
    }
  };

  const handleClearAllData = () => {
    Alert.alert(
      '⚠️ Attention',
      'Cette action supprimera toutes vos données (playlists, favoris, paramètres). Cette action est irréversible.',
      [
        {text: 'Annuler', style: 'cancel'},
        {
          text: 'Confirmer',
          style: 'destructive',
          onPress: async () => {
            try {
              await appManager.clearAllData();
              Alert.alert('✅ Succès', 'Toutes les données ont été supprimées');
              await loadSettings();
              await loadStats();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer les données');
            }
          },
        },
      ],
    );
  };

  const handleExportDebugData = () => {
    try {
      const debugData = appManager.exportDebugData();
      Alert.alert('📊 Données de Debug', JSON.stringify(debugData, null, 2), [
        {text: 'OK'},
      ]);
    } catch (error) {
      Alert.alert('Erreur', "Impossible d'exporter les données de debug");
    }
  };

  if (!settings) {
    return (
      <View
        style={[
          styles.loadingContainer,
          isDarkMode && styles.loadingContainerDark,
        ]}>
        <Text
          style={[styles.loadingText, isDarkMode && styles.loadingTextDark]}>
          🔄 Chargement des paramètres...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* Lecteur Section */}
      <View style={[styles.section, isDarkMode && styles.sectionDark]}>
        <Text
          style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
          🎬 Lecteur Vidéo
        </Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text
              style={[
                styles.settingLabel,
                isDarkMode && styles.settingLabelDark,
              ]}>
              Lecture automatique
            </Text>
            <Text
              style={[
                styles.settingDescription,
                isDarkMode && styles.settingDescriptionDark,
              ]}>
              Démarrer automatiquement la lecture des chaînes
            </Text>
          </View>
          <Switch
            value={settings.autoplay}
            onValueChange={handleToggleAutoplay}
            trackColor={{false: '#767577', true: '#007AFF'}}
            thumbColor={settings.autoplay ? '#ffffff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text
              style={[
                styles.settingLabel,
                isDarkMode && styles.settingLabelDark,
              ]}>
              Mémoriser la position
            </Text>
            <Text
              style={[
                styles.settingDescription,
                isDarkMode && styles.settingDescriptionDark,
              ]}>
              Reprendre la lecture où vous vous êtes arrêté
            </Text>
          </View>
          <Switch
            value={settings.rememberPosition}
            onValueChange={handleToggleRememberPosition}
            trackColor={{false: '#767577', true: '#007AFF'}}
            thumbColor={settings.rememberPosition ? '#ffffff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text
              style={[
                styles.settingLabel,
                isDarkMode && styles.settingLabelDark,
              ]}>
              Qualité par défaut
            </Text>
            <Text
              style={[
                styles.settingDescription,
                isDarkMode && styles.settingDescriptionDark,
              ]}>
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

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text
              style={[
                styles.settingLabel,
                isDarkMode && styles.settingLabelDark,
              ]}>
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

      {/* Statistics Section */}
      {stats && (
        <View style={[styles.section, isDarkMode && styles.sectionDark]}>
          <Text
            style={[
              styles.sectionTitle,
              isDarkMode && styles.sectionTitleDark,
            ]}>
            📊 Statistiques
          </Text>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text
                style={[styles.statValue, isDarkMode && styles.statValueDark]}>
                {stats.playlist.totalPlaylists}
              </Text>
              <Text
                style={[styles.statLabel, isDarkMode && styles.statLabelDark]}>
                Playlists
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text
                style={[styles.statValue, isDarkMode && styles.statValueDark]}>
                {stats.playlist.totalChannels}
              </Text>
              <Text
                style={[styles.statLabel, isDarkMode && styles.statLabelDark]}>
                Chaînes
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text
                style={[styles.statValue, isDarkMode && styles.statValueDark]}>
                {stats.app.favoritesCount}
              </Text>
              <Text
                style={[styles.statLabel, isDarkMode && styles.statLabelDark]}>
                Favoris
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text
                style={[styles.statValue, isDarkMode && styles.statValueDark]}>
                {stats.playlist.totalCategories}
              </Text>
              <Text
                style={[styles.statLabel, isDarkMode && styles.statLabelDark]}>
                Catégories
              </Text>
            </View>
          </View>

          <View style={styles.statusInfo}>
            <Text
              style={[
                styles.statusLabel,
                isDarkMode && styles.statusLabelDark,
              ]}>
              Utilisateur actuel: {stats.app.currentUser}
            </Text>
            <Text
              style={[
                styles.statusLabel,
                isDarkMode && styles.statusLabelDark,
              ]}>
              Chaîne actuelle: {stats.app.currentChannel}
            </Text>
            <Text
              style={[
                styles.statusLabel,
                isDarkMode && styles.statusLabelDark,
              ]}>
              Playlist actuelle: {stats.app.currentPlaylist}
            </Text>
          </View>
        </View>
      )}

      {/* Debug Section */}
      <View style={[styles.section, isDarkMode && styles.sectionDark]}>
        <Text
          style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
          🔧 Debug & Maintenance
        </Text>

        <TouchableOpacity
          style={[styles.debugButton, styles.debugButtonInfo]}
          onPress={handleExportDebugData}>
          <Text style={styles.debugButtonText}>📊 Voir données de debug</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.debugButton, styles.debugButtonWarning]}
          onPress={() => {
            loadStats();
            Alert.alert('✅ Succès', 'Statistiques mises à jour');
          }}>
          <Text style={styles.debugButtonText}>🔄 Actualiser statistiques</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.debugButton, styles.debugButtonDanger]}
          onPress={handleClearAllData}>
          <Text style={styles.debugButtonText}>
            🗑️ Supprimer toutes les données
          </Text>
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <View style={[styles.section, isDarkMode && styles.sectionDark]}>
        <Text
          style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
          ℹ️ À propos
        </Text>

        <Text style={[styles.appInfo, isDarkMode && styles.appInfoDark]}>
          📱 IPTV Mobile v1.0.0
        </Text>
        <Text style={[styles.appInfo, isDarkMode && styles.appInfoDark]}>
          🏗️ Architecture modulaire avancée
        </Text>
        <Text style={[styles.appInfo, isDarkMode && styles.appInfoDark]}>
          ⚡ Optimisé pour les gros catalogues (25k+ chaînes)
        </Text>
        <Text style={[styles.appInfo, isDarkMode && styles.appInfoDark]}>
          🎯 Cache intelligent multi-niveaux
        </Text>
        <Text style={[styles.appInfo, isDarkMode && styles.appInfoDark]}>
          📺 Support Xtream Codes
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  containerDark: {
    backgroundColor: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingContainerDark: {
    backgroundColor: '#1a1a1a',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  loadingTextDark: {
    color: '#999',
  },
  section: {
    backgroundColor: '#fff',
    marginBottom: 10,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  sectionDark: {
    backgroundColor: '#2a2a2a',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  sectionTitleDark: {
    color: '#fff',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  settingLabelDark: {
    color: '#fff',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  settingDescriptionDark: {
    color: '#999',
  },
  qualityButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 15,
  },
  qualityButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    marginHorizontal: 2,
    borderRadius: 6,
    alignItems: 'center',
  },
  qualityButtonActive: {
    backgroundColor: '#007AFF',
  },
  qualityButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  qualityButtonTextActive: {
    color: '#fff',
  },
  volumeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  volumeButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    marginHorizontal: 2,
    borderRadius: 6,
    alignItems: 'center',
  },
  volumeButtonActive: {
    backgroundColor: '#34C759',
  },
  volumeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  volumeButtonTextActive: {
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statValueDark: {
    color: '#0A84FF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statLabelDark: {
    color: '#999',
  },
  statusInfo: {
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statusLabelDark: {
    color: '#999',
  },
  debugButton: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  debugButtonInfo: {
    backgroundColor: '#007AFF',
  },
  debugButtonWarning: {
    backgroundColor: '#FF9500',
  },
  debugButtonDanger: {
    backgroundColor: '#FF3B30',
  },
  debugButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  appInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  appInfoDark: {
    color: '#999',
  },
});

export default SettingsScreen;
