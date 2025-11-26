/**
 * 🚀 ProfileStartupSettings - Écran des paramètres de démarrage des profils
 * Paramètre pour forcer l'affichage des profils au démarrage
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Switch,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useThemeColors } from '../contexts/ThemeContext';
import { useI18n } from '../hooks/useI18n';
import ProfileService from '../services/ProfileService';

const ProfileStartupSettings: React.FC = () => {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const navigation = useNavigation();
  const { t: tSettings } = useI18n('settings');
  const { t: tCommon } = useI18n('common');

  const [isLoading, setIsLoading] = useState(true);
  const [alwaysShowSelection, setAlwaysShowSelection] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const setting = await ProfileService.getAskOnStartup();
      setAlwaysShowSelection(setting);
    } catch (error) {
      console.error('❌ [ProfileStartupSettings] Erreur chargement paramètres:', error);
      Alert.alert(
        tCommon('error'),
        'Impossible de charger les paramètres de démarrage'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAlwaysShowSelection = async (value: boolean) => {
    try {
      await ProfileService.setAskOnStartup(value);
      setAlwaysShowSelection(value);
      console.log(`✅ [ProfileStartupSettings] Paramètre mis à jour: ${value}`);
    } catch (error) {
      console.error('❌ [ProfileStartupSettings] Erreur sauvegarde:', error);
      Alert.alert(
        tCommon('error'),
        'Impossible de sauvegarder le paramètre'
      );
      // Revenir à l'état précédent en cas d'erreur
      setAlwaysShowSelection(!value);
    }
  };

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
        {tCommon('loading')}
      </Text>
    </View>
  );

  const renderContent = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {/* Toggle Switch */}
      <View style={[styles.settingCard, { backgroundColor: colors.background.secondary }]}>
        <View style={styles.settingContent}>
          <View style={styles.settingTextContainer}>
            <Text style={[styles.settingTitle, { color: colors.text.primary }]}>
              {tSettings('alwaysShowProfileSelection')}
            </Text>
            <Text style={[styles.settingSubtitle, { color: colors.text.secondary }]}>
              {tSettings('alwaysShowProfileSelectionDesc')}
            </Text>
          </View>

          <Switch
            value={alwaysShowSelection}
            onValueChange={toggleAlwaysShowSelection}
            trackColor={{ false: colors.ui.border, true: colors.primary + '40' }}
            thumbColor={alwaysShowSelection ? colors.primary : colors.text.secondary}
            ios_backgroundColor={colors.ui.border}
          />
        </View>
      </View>

      {/* Espace en bas */}
      <View style={styles.bottomSpace} />
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

              </View>

      {/* Content */}
      {isLoading ? renderLoadingState() : renderContent()}
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 45,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  content: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  descriptionCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  descriptionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  settingCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  usageCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  usageTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  usageItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  usageText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
  },
  noteCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
  },
  bottomSpace: {
    height: 50,
  },
});

export default ProfileStartupSettings;