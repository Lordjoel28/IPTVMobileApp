/**
 * 🎨 ThemeSettingsScreen - Écran de paramètres des thèmes
 * Interface complète pour gérer les thèmes avec prévisualisation et statistiques
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import SystemNavigationBar from 'react-native-system-navigation-bar';

import {useTheme, useThemeColors, useIsDark} from '../contexts/ThemeContext';
import {useI18n} from '../hooks/useI18n';
import {availableThemes, getThemesList} from '../themes/themeConfig';
import ThemePreviewCard from '../components/ThemePreviewCard';
import ThemeQuickActions from '../components/ThemeQuickActions';
import type {RootStackParamList} from '../types';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const {width: screenWidth} = Dimensions.get('window');

const ThemeSettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const {currentTheme, setTheme, isSystemTheme} = useTheme();
  const colors = useThemeColors();
  const isDark = useIsDark();

  // Nouveau système i18n avec namespaces themes, profiles et common
  const {t: tThemes} = useI18n('themes');
  const {t: tProfiles} = useI18n('profiles');
  const {t: tCommon} = useI18n('common');

  // Fonction pour obtenir le nom traduit d'un thème
  const getTranslatedThemeName = (themeId: string): string => {
    const themeKeyMap: Record<string, string> = {
      'dark': 'themeDark',
      'light': 'themeLight',
      'gray': 'themeGray',
      'brown': 'themeBrown',
      'green': 'themeGreen',
      'purple': 'themePurple',
      'sunset': 'themeSunset',
      'ocean-comfort': 'themeOceanComfort',
      'warm-amber': 'themeWarmAmber',
      'tivimate-pro': 'themeTivimatePro',
    };

    const key = themeKeyMap[themeId];
    return key ? tThemes(key) : currentTheme.name;
  };

  useEffect(() => {
    SystemNavigationBar.immersive();

    return () => {
      SystemNavigationBar.navigationShow();
    };
  }, []);

  const handleThemeSelect = async (themeId: string) => {
    try {
      await setTheme(themeId);
    } catch (error) {
      Alert.alert(tCommon('error'), tCommon('error'));
    }
  };

  const handleThemePreview = (themeId: string) => {
    Alert.alert(
      tCommon('preview'),
      `${availableThemes.find(theme => theme.id === themeId)?.name}`,
      [
        {text: tCommon('cancel'), style: 'cancel'},
        {text: tCommon('apply'), onPress: () => handleThemeSelect(themeId)},
      ],
    );
  };

  return (
    <LinearGradient
      colors={colors.background.gradient}
      style={styles.container}>
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
            {tThemes('themes').toUpperCase()}
          </Text>
          <View style={styles.currentThemeInfo}>
            <View
              style={[
                styles.currentThemeDot,
                {backgroundColor: colors.accent.primary},
              ]}
            />
            <Text
              style={[styles.currentThemeText, {color: colors.text.secondary}]}>
              {getTranslatedThemeName(currentTheme.id)} {isSystemTheme ? `(${tCommon('auto')})` : ''}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        
        {/* Section Actions Rapides - Maintenant en haut */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {color: colors.text.primary}]}>
            {tThemes('quickActions')}
          </Text>
          <ThemeQuickActions style={styles.quickActions} />
        </View>

        {/* Section Sélection des Thèmes */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {color: colors.text.primary}]}>
            {tProfiles('chooseTheme')}
          </Text>
          <Text
            style={[styles.sectionSubtitle, {color: colors.text.secondary}]}>
            {tThemes('longPressPreview')}
          </Text>

          <View style={[styles.themesGrid, {opacity: isSystemTheme ? 0.5 : 1}]}>
            {availableThemes.map(theme => (
              <ThemePreviewCard
                key={theme.id}
                theme={theme}
                isSelected={theme.id === currentTheme.id && !isSystemTheme}
                onSelect={handleThemeSelect}
                onPreview={handleThemePreview}
                disabled={isSystemTheme}
              />
            ))}
          </View>
        </View>

        {/* Section Info */}
        <View style={styles.section}>
          <View
            style={[
              styles.infoBox,
              {backgroundColor: colors.surface.secondary},
            ]}>
            <Icon name="info-outline" size={20} color={colors.accent.info} />
            <Text style={[styles.infoText, {color: colors.text.secondary}]}>
              {tThemes('themeAppliesInstantly')}
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
    paddingHorizontal: 20,
    paddingTop: 25,
    paddingBottom: 20,
  },

  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    marginRight: 16,
  },

  headerContent: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 4,
  },

  currentThemeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  currentThemeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },

  currentThemeText: {
    fontSize: 14,
    fontWeight: '500',
  },

  quickToggle: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },

  content: {
    flex: 1,
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  section: {
    marginBottom: 32,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },

  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },

  themesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  quickActions: {
    // Styles pour ThemeQuickActions
  },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
  },

  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 12,
  },
});

export default ThemeSettingsScreen;
