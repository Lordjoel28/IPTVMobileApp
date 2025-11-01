/**
 * ⚡ ThemeQuickActions - Actions rapides pour la gestion des thèmes.
 * Offre des contrôles clairs et standards pour le choix manuel et automatique du thème.
 */
import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Switch} from 'react-native';
import {useTheme, useThemeColors, useIsDark} from '../contexts/ThemeContext';

interface ThemeQuickActionsProps {
  style?: any;
}

const ThemeQuickActions: React.FC<ThemeQuickActionsProps> = ({style}) => {
  const {
    setTheme,
    currentTheme,
    resetToSystem,
    isSystemTheme,
    toggleTheme,
  } = useTheme();
  const colors = useThemeColors();
  const isDark = useIsDark();

  const handleSystemToggle = async (enabled: boolean) => {
    if (enabled) {
      await resetToSystem();
    } else {
      // Désactive le mode auto et conserve le thème actuel (clair ou sombre)
      await setTheme(currentTheme.id);
    }
  };

  const handleManualToggle = (targetIsDark: boolean) => {
    if (isDark !== targetIsDark) {
      toggleTheme();
    }
  };

  return (
    <View style={[styles.container, style]}>
      {/* Section 1: Sélecteur de mode manuel */}
      <View style={styles.manualToggleContainer}>
        <Text style={[styles.label, {color: colors.text.secondary}]}>Mode</Text>
        <View
          style={[
            styles.segmentedControl,
            {
              backgroundColor: colors.surface.primary,
              opacity: isSystemTheme ? 0.5 : 1,
            },
          ]}>
          <TouchableOpacity
            style={[
              styles.segmentButton,
              !isDark ? [styles.segmentActive, {backgroundColor: colors.accent.primary}] : {},
            ]}
            onPress={() => handleManualToggle(false)}
            disabled={isSystemTheme}>
            <Text
              style={[
                styles.segmentText,
                {color: !isDark ? '#fff' : colors.text.primary},
              ]}>
              Clair
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segmentButton,
              isDark ? [styles.segmentActive, {backgroundColor: colors.accent.primary}] : {},
            ]}
            onPress={() => handleManualToggle(true)}
            disabled={isSystemTheme}>
            <Text
              style={[
                styles.segmentText,
                {color: isDark ? '#fff' : colors.text.primary},
              ]}>
              Sombre
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Section 2: Interrupteur pour le mode automatique */}
      <View style={styles.autoToggleContainer}>
        <Text style={[styles.label, {color: colors.text.primary}]}>
          Thème automatique
        </Text>
        <Switch
          value={isSystemTheme}
          onValueChange={handleSystemToggle}
          trackColor={{false: colors.ui.border, true: colors.ui.border}}
          thumbColor={isSystemTheme ? colors.accent.primary : colors.text.tertiary}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Le conteneur principal n'a plus besoin de gérer la direction
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  manualToggleContainer: {
    marginBottom: 24,
    backgroundColor: 'transparent',
    padding: 16,
    borderRadius: 16,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 12,
    height: 44,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 9,
  },
  segmentActive: {
    // La couleur de fond est appliquée dynamiquement
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '700',
  },
  autoToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
  },
});

export default ThemeQuickActions;

