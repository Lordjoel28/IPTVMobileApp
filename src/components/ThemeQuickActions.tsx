/**
 * ⚡ ThemeQuickActions - Actions rapides pour les thèmes
 * Composant avec actions rapides : toggle, auto, reset
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme, useThemeColors, useIsDark } from '../contexts/ThemeContext';

interface ThemeQuickActionsProps {
  style?: any;
}

const ThemeQuickActions: React.FC<ThemeQuickActionsProps> = ({ style }) => {
  const { toggleTheme, resetToSystem, isSystemTheme } = useTheme();
  const colors = useThemeColors();
  const isDark = useIsDark();

  const handleToggleTheme = async () => {
    await toggleTheme();
  };

  const handleSystemToggle = async (enabled: boolean) => {
    if (enabled) {
      await resetToSystem();
    } else {
      // Si on désactive le thème système, on garde le thème actuel
      // L'utilisateur peut ensuite choisir manuellement
    }
  };

  return (
    <View style={[styles.container, style]}>
      {/* Action Toggle Sombre/Clair */}
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: colors.surface.primary }]}
        onPress={handleToggleTheme}
        activeOpacity={0.8}>
        <View style={styles.actionIcon}>
          <Icon
            name={isDark ? 'light-mode' : 'dark-mode'}
            size={24}
            color={colors.accent.primary}
          />
        </View>
        <View style={styles.actionContent}>
          <Text style={[styles.actionTitle, { color: colors.text.primary }]}>
            Mode {isDark ? 'Clair' : 'Sombre'}
          </Text>
          <Text style={[styles.actionSubtitle, { color: colors.text.secondary }]}>
            Basculer rapidement
          </Text>
        </View>
        <Icon name="keyboard-arrow-right" size={20} color={colors.text.tertiary} />
      </TouchableOpacity>

      {/* Switch Thème Automatique */}
      <View style={[styles.actionButton, { backgroundColor: colors.surface.primary }]}>
        <View style={styles.actionIcon}>
          <Icon
            name="settings-system-daydream"
            size={24}
            color={isSystemTheme ? colors.accent.primary : colors.text.tertiary}
          />
        </View>
        <View style={styles.actionContent}>
          <Text style={[styles.actionTitle, { color: colors.text.primary }]}>
            Thème automatique
          </Text>
          <Text style={[styles.actionSubtitle, { color: colors.text.secondary }]}>
            Suit les réglages système
          </Text>
        </View>
        <Switch
          value={isSystemTheme}
          onValueChange={handleSystemToggle}
          trackColor={{
            false: colors.ui.border,
            true: colors.accent.primary + '40'
          }}
          thumbColor={isSystemTheme ? colors.accent.primary : colors.surface.secondary}
          ios_backgroundColor={colors.ui.border}
        />
      </View>

      {/* Action Reset */}
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: colors.surface.primary }]}
        onPress={resetToSystem}
        activeOpacity={0.8}>
        <View style={styles.actionIcon}>
          <Icon
            name="restore"
            size={24}
            color={colors.text.tertiary}
          />
        </View>
        <View style={styles.actionContent}>
          <Text style={[styles.actionTitle, { color: colors.text.primary }]}>
            Réinitialiser
          </Text>
          <Text style={[styles.actionSubtitle, { color: colors.text.secondary }]}>
            Retour aux défauts
          </Text>
        </View>
        <Icon name="keyboard-arrow-right" size={20} color={colors.text.tertiary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  actionIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginRight: 12,
  },

  actionContent: {
    flex: 1,
  },

  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },

  actionSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
});

export default ThemeQuickActions;