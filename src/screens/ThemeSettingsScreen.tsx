/**
 * 🎨 ThemeSettingsScreen - Écran de paramètres des thèmes
 * Interface complète pour gérer les thèmes avec prévisualisation et statistiques
 */

import React, { useState, useEffect } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import SystemNavigationBar from 'react-native-system-navigation-bar';

import { useTheme, useThemeColors, useIsDark } from '../contexts/ThemeContext';
import { availableThemes, getThemesList } from '../themes/themeConfig';
import ThemePreviewCard from '../components/ThemePreviewCard';
import ThemeQuickActions from '../components/ThemeQuickActions';
import type { RootStackParamList } from '../types';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const { width: screenWidth } = Dimensions.get('window');

const ThemeSettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { currentTheme, setTheme, isSystemTheme } = useTheme();
  const colors = useThemeColors();
  const isDark = useIsDark();

  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);
  useEffect(() => {
    SystemNavigationBar.immersive();

    return () => {
      SystemNavigationBar.navigationShow();
    };
  }, []);

  const handleThemeSelect = async (themeId: string) => {
    try {
      await setTheme(themeId);
      // Petite vibration de confirmation si disponible
      // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de changer le thème');
    }
  };

  const handleThemePreview = (themeId: string) => {
    setSelectedPreview(themeId);
    // Implémenter une prévisualisation modale si désiré
    Alert.alert(
      'Prévisualisation',
      `Aperçu du thème: ${availableThemes.find(t => t.id === themeId)?.name}`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Appliquer', onPress: () => handleThemeSelect(themeId) }
      ]
    );
  };

  const themesList = getThemesList();

  return (
    <LinearGradient
      colors={colors.background.gradient}
      style={styles.container}>
      <StatusBar hidden={true} />

      {/* Header avec aperçu du thème actuel */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.surface.primary }]}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
            THÈMES
          </Text>
          <View style={styles.currentThemeInfo}>
            <View style={[styles.currentThemeDot, { backgroundColor: colors.accent.primary }]} />
            <Text style={[styles.currentThemeText, { color: colors.text.secondary }]}>
              {currentTheme.name} {isSystemTheme ? '(Auto)' : ''}
            </Text>
          </View>
        </View>

        {/* Toggle rapide sombre/clair */}
        <TouchableOpacity
          style={[styles.quickToggle, { backgroundColor: colors.surface.primary }]}
          onPress={() => {/* Toggle rapide géré par ThemeQuickActions */}}
          activeOpacity={0.8}>
          <Icon
            name={isDark ? 'light-mode' : 'dark-mode'}
            size={20}
            color={colors.accent.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>

        {/* Section Sélection des Thèmes */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Choisir un thème
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.text.secondary }]}>
            Appui long pour prévisualiser
          </Text>

          <View style={styles.themesGrid}>
            {availableThemes.map((theme) => (
              <ThemePreviewCard
                key={theme.id}
                theme={theme}
                isSelected={theme.id === currentTheme.id && !isSystemTheme}
                onSelect={handleThemeSelect}
                onPreview={handleThemePreview}
              />
            ))}

            {/* Carte Thème Automatique */}
            <TouchableOpacity
              style={[
                styles.autoThemeCard,
                { backgroundColor: colors.surface.primary },
                isSystemTheme && styles.selectedAutoCard,
              ]}
              onPress={() => {/* Géré par ThemeQuickActions */}}
              activeOpacity={0.8}>
              <LinearGradient
                colors={['#4A90E2', '#357ABD', '#2E6BA8']}
                style={styles.autoThemeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <View style={styles.autoThemeContent}>
                <Icon name="settings-system-daydream" size={32} color="#fff" />
                <Text style={styles.autoThemeText}>Auto</Text>
                <Text style={styles.autoThemeSubtext}>Système</Text>
              </View>
              {isSystemTheme && (
                <View style={styles.autoSelectedBadge}>
                  <Icon name="check-circle" size={16} color="#4CAF50" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Section Actions Rapides */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Actions rapides
          </Text>
          <ThemeQuickActions style={styles.quickActions} />
        </View>


        {/* Section Info */}
        <View style={styles.section}>
          <View style={[styles.infoBox, { backgroundColor: colors.surface.secondary }]}>
            <Icon name="info-outline" size={20} color={colors.accent.info} />
            <Text style={[styles.infoText, { color: colors.text.secondary }]}>
              Les thèmes s'appliquent instantanément à toute l'application.
              Le thème automatique suit les réglages système de votre appareil.
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

  autoThemeCard: {
    width: (screenWidth - 60) / 2,
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },

  selectedAutoCard: {
    transform: [{ scale: 1.02 }],
  },

  autoThemeGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  autoThemeContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },

  autoThemeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  autoThemeSubtext: {
    color: '#fff',
    fontSize: 11,
    opacity: 0.9,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  autoSelectedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    borderRadius: 10,
    padding: 4,
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