/**
 * ⚙️ AutoSyncSettingsScreen - Configuration synchronisation automatique SIMPLIFIÉE
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useThemeColors, useIsDark } from '../contexts/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../App';
import { useI18n } from '../hooks/useI18n';
import { autoSyncService } from '../services/AutoSyncService';
import { useUIStore } from '../stores/UIStore';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const AutoSyncSettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { showLoading, hideLoading } = useUIStore();
  const { getScaledTextSize } = useUIStore();

  // Thème
  let colors, isDark;
  try {
    colors = useThemeColors();
    isDark = useIsDark();
  } catch (error) {
    colors = {
      background: { primary: '#000000', secondary: '#1a1a1a' },
      surface: { primary: '#2a2a2a', secondary: '#333333' },
      text: { primary: '#ffffff', secondary: '#cccccc' },
      accent: { primary: '#6366f1' },
      border: '#444444'
    };
    isDark = true;
  }

  const { t: tSettings } = useI18n('settings');
  const { t: tCommon } = useI18n('common');

  // États
  const [enabled, setEnabled] = useState(false);
  const [intervalHours, setIntervalHours] = useState(24);
  const [wifiOnly, setWifiOnly] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [stats, setStats] = useState({ totalSyncs: 0, successfulSyncs: 0, failedSyncs: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [nextSyncTime, setNextSyncTime] = useState<number | null>(null);

  // Couleurs sécurisées
  const safeColors = {
    background: colors?.background?.primary || '#000000',
    surface: colors?.surface?.primary || '#1a1a1a',
    surfaceSecondary: colors?.surface?.secondary || '#2a2a2a',
    text: colors?.text?.primary || '#ffffff',
    textSecondary: colors?.text?.secondary || '#cccccc',
    primary: colors?.accent?.primary || '#2196F3',
    border: (colors as any)?.border || '#333333',
    success: '#4CAF50',
    error: '#F44336',
  };

  // Styles
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: safeColors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 25,
      paddingBottom: 20,
      paddingHorizontal: 16,
      backgroundColor: safeColors.surface,
      borderBottomWidth: 1,
      borderBottomColor: safeColors.border,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: safeColors.surfaceSecondary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: safeColors.text,
    },
    content: {
      padding: 16,
    },
    section: {
      backgroundColor: safeColors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: safeColors.text,
      marginBottom: 16,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: safeColors.border,
    },
    lastSettingRow: {
      borderBottomWidth: 0,
    },
    settingInfo: {
      flex: 1,
      marginRight: 16,
    },
    settingLabel: {
      fontSize: 16,
      fontWeight: '500',
      color: safeColors.text,
      marginBottom: 4,
    },
    settingDescription: {
      fontSize: 13,
      color: safeColors.textSecondary,
      lineHeight: 18,
    },
    intervalButtons: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 12,
      gap: 8,
    },
    intervalButton: {
      flex: 1,
      minWidth: '22%',
      backgroundColor: safeColors.surfaceSecondary,
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: safeColors.border,
    },
    intervalButtonActive: {
      backgroundColor: safeColors.primary,
      borderColor: safeColors.primary,
    },
    intervalButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: safeColors.textSecondary,
    },
    intervalButtonTextActive: {
      color: '#FFFFFF',
    },
    statusCard: {
      backgroundColor: safeColors.surfaceSecondary,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
    },
    statusRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    statusLabel: {
      fontSize: 14,
      color: safeColors.textSecondary,
    },
    statusValue: {
      fontSize: 14,
      fontWeight: '600',
      color: safeColors.text,
    },
    actionButton: {
      backgroundColor: safeColors.primary,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    actionButtonDisabled: {
      backgroundColor: safeColors.border,
    },
    actionButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    syncIndicator: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: 8,
    },
    syncIndicatorActive: {
      backgroundColor: safeColors.success,
    },
    syncIndicatorInactive: {
      backgroundColor: safeColors.border,
    },
  });

  // Charger les données au montage
  useEffect(() => {
    console.log(`🎨 [AutoSyncSettings] Text scale: ${getScaledTextSize(20)}`);
    loadData();
  }, []);

  const loadData = () => {
    const config = autoSyncService.getConfig();
    const statsData = autoSyncService.getStats();

    setEnabled(config.enabled);
    setIntervalHours(config.intervalHours);
    setWifiOnly(config.wifiOnly);
    setLastSyncTime(statsData.lastSyncTime);
    setStats({
      totalSyncs: statsData.totalSyncs,
      successfulSyncs: statsData.successfulSyncs,
      failedSyncs: statsData.failedSyncs,
    });

    // Calculer prochaine sync
    if (statsData.lastSyncTime) {
      const intervalMs = config.intervalHours * 60 * 60 * 1000;
      setNextSyncTime(statsData.lastSyncTime + intervalMs);
    }
  };

  // Toggle activation
  const handleToggleEnabled = async (value: boolean) => {
    setIsLoading(true);
    try {
      await autoSyncService.setEnabled(value);
      setEnabled(value);
      Alert.alert(
        tCommon('success'),
        value ? 'Synchronisation automatique activée' : 'Synchronisation automatique désactivée'
      );
    } catch (error) {
      Alert.alert(tCommon('error'), 'Erreur lors de la modification');
    } finally {
      setIsLoading(false);
    }
  };

  // Changer l'intervalle
  const handleIntervalChange = async (hours: number) => {
    setIsLoading(true);
    try {
      await autoSyncService.setInterval(hours);
      setIntervalHours(hours);

      // 🆕 Recalculer la prochaine sync avec le nouvel intervalle
      const statsData = autoSyncService.getStats();
      if (statsData.lastSyncTime) {
        const intervalMs = hours * 60 * 60 * 1000;
        setNextSyncTime(statsData.lastSyncTime + intervalMs);
      }
    } catch (error) {
      Alert.alert(tCommon('error'), 'Erreur lors de la modification');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle WiFi only
  const handleToggleWifiOnly = async (value: boolean) => {
    setIsLoading(true);
    try {
      await autoSyncService.setWifiOnly(value);
      setWifiOnly(value);
    } catch (error) {
      Alert.alert(tCommon('error'), 'Erreur lors de la modification');
    } finally {
      setIsLoading(false);
    }
  };

  // Forcer la synchronisation avec modal de chargement
  const handleForceSync = async () => {
    Alert.alert(
      'Synchronisation manuelle',
      'Voulez-vous synchroniser maintenant ?',
      [
        { text: tCommon('cancel'), style: 'cancel' },
        {
          text: 'Synchroniser',
          onPress: async () => {
            try {
              // Afficher le modal de chargement (comme IPTV Smarters Pro)
              showLoading(
                'Synchronisation en cours...',
                'Veuillez patienter, mise à jour de la playlist...',
                0
              );

              const result = await autoSyncService.forceSync();

              // Cacher le modal
              hideLoading();

              if (result.success) {
                Alert.alert(tCommon('success'), 'Synchronisation terminée avec succès');
                loadData();
              } else {
                Alert.alert(tCommon('error'), result.error || 'Erreur lors de la synchronisation');
              }
            } catch (error) {
              hideLoading();
              Alert.alert(tCommon('error'), 'Erreur lors de la synchronisation');
            }
          }
        }
      ]
    );
  };

  // Formater la date
  const formatLastSync = (timestamp: number | null): string => {
    if (!timestamp) return 'Jamais';
    const date = new Date(timestamp);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculer le taux de succès
  const getSuccessRate = (): number => {
    if (stats.totalSyncs === 0) return 0;
    return Math.round((stats.successfulSyncs / stats.totalSyncs) * 100);
  };

  // Formater l'intervalle
  const formatInterval = (hours: number): string => {
    if (hours < 24) return `${hours}h`;
    const days = hours / 24;
    return `${days}j`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={safeColors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {fontSize: getScaledTextSize(22)}]}>🔄 Synchronisation Automatique</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Activation */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {fontSize: getScaledTextSize(18)}]}>Activation</Text>

          <View style={[styles.settingRow, styles.lastSettingRow]}>
            <View style={styles.settingInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[
                  styles.syncIndicator,
                  enabled ? styles.syncIndicatorActive : styles.syncIndicatorInactive
                ]} />
                <Text style={[styles.settingLabel, {fontSize: getScaledTextSize(16)}]}>Synchronisation automatique</Text>
              </View>
              <Text style={[styles.settingDescription, {fontSize: getScaledTextSize(13)}]}>
                Actualise automatiquement les playlists et l'EPG
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={handleToggleEnabled}
              disabled={isLoading}
              trackColor={{ false: safeColors.border, true: safeColors.primary }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Intervalle */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {fontSize: getScaledTextSize(18)}]}>Fréquence de synchronisation</Text>

          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, {fontSize: getScaledTextSize(16)}]}>Intervalle actuel</Text>
              <Text style={[styles.settingDescription, {fontSize: getScaledTextSize(13)}]}>
                {formatInterval(intervalHours)}
              </Text>
            </View>
          </View>

          <View style={styles.intervalButtons}>
            {[12, 24, 72, 168].map(hours => (
              <TouchableOpacity
                key={hours}
                style={[
                  styles.intervalButton,
                  intervalHours === hours && styles.intervalButtonActive,
                ]}
                onPress={() => handleIntervalChange(hours)}
                disabled={isLoading}>
                <Text
                  style={[
                    styles.intervalButtonText,
                    intervalHours === hours && styles.intervalButtonTextActive,
                    {fontSize: getScaledTextSize(14)},
                  ]}>
                  {formatInterval(hours)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Contraintes */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {fontSize: getScaledTextSize(18)}]}>Options</Text>

          <View style={[styles.settingRow, styles.lastSettingRow]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, {fontSize: getScaledTextSize(16)}]}>📶 WiFi uniquement</Text>
              <Text style={[styles.settingDescription, {fontSize: getScaledTextSize(13)}]}>
                Ne synchroniser qu'en WiFi (économise la data mobile)
              </Text>
            </View>
            <Switch
              value={wifiOnly}
              onValueChange={handleToggleWifiOnly}
              disabled={isLoading}
              trackColor={{ false: safeColors.border, true: safeColors.success }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Statistiques */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {fontSize: getScaledTextSize(18)}]}>📊 Statistiques</Text>

          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={[styles.statusLabel, {fontSize: getScaledTextSize(14)}]}>Dernière synchronisation</Text>
              <Text style={[styles.statusValue, {fontSize: getScaledTextSize(14)}]}>{formatLastSync(lastSyncTime)}</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={[styles.statusLabel, {fontSize: getScaledTextSize(14)}]}>Prochaine synchronisation</Text>
              <Text style={[styles.statusValue, { color: safeColors.primary, fontSize: getScaledTextSize(14)}]}>
                {nextSyncTime ? formatLastSync(nextSyncTime) : 'N/A'}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={[styles.statusLabel, {fontSize: getScaledTextSize(14)}]}>Total synchronisations</Text>
              <Text style={[styles.statusValue, {fontSize: getScaledTextSize(14)}]}>{stats.totalSyncs}</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={[styles.statusLabel, {fontSize: getScaledTextSize(14)}]}>Réussies</Text>
              <Text style={[styles.statusValue, { color: safeColors.success, fontSize: getScaledTextSize(14)}]}>
                {stats.successfulSyncs}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={[styles.statusLabel, {fontSize: getScaledTextSize(14)}]}>Échouées</Text>
              <Text style={[styles.statusValue, { color: safeColors.error, fontSize: getScaledTextSize(14)}]}>
                {stats.failedSyncs}
              </Text>
            </View>
            <View style={[styles.statusRow, { marginBottom: 0 }]}>
              <Text style={[styles.statusLabel, {fontSize: getScaledTextSize(14)}]}>Taux de succès</Text>
              <Text style={[styles.statusValue, {fontSize: getScaledTextSize(14)}]}>{getSuccessRate()}%</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.actionButton,
              isSyncing && styles.actionButtonDisabled
            ]}
            onPress={handleForceSync}
            disabled={isSyncing}>
            {isSyncing ? (
              <>
                <ActivityIndicator color="#ffffff" />
                <Text style={[styles.actionButtonText, {fontSize: getScaledTextSize(16)}]}>Synchronisation en cours...</Text>
              </>
            ) : (
              <>
                <Icon name="sync" size={20} color="#ffffff" />
                <Text style={[styles.actionButtonText, {fontSize: getScaledTextSize(16)}]}>Forcer la synchronisation</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default AutoSyncSettingsScreen;
