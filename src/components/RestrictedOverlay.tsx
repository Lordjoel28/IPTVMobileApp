/**
 * 🔒 RestrictedOverlay - Overlay pour contenu restreint
 * Superposition visuelle appliquée sur les cartes de chaînes restreintes
 */

import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {useTheme} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import RestrictedBadge from './RestrictedBadge';

interface RestrictedOverlayProps {
  visible: boolean;
  onPress?: () => void;
  showFullOverlay?: boolean;
  channelName?: string;
  restrictionReason?: string;
}

const RestrictedOverlay: React.FC<RestrictedOverlayProps> = ({
  visible,
  onPress,
  showFullOverlay = false,
  channelName,
  restrictionReason = 'Contenu restreint',
}) => {
  const theme = useTheme();

  if (!visible) return null;

  if (showFullOverlay) {
    // Overlay complet pour les détails de chaîne
    return (
      <TouchableOpacity
        style={[styles.fullOverlay, {backgroundColor: 'rgba(0,0,0,0.85)'}]}
        onPress={onPress}
        activeOpacity={0.9}>
        <View style={styles.fullOverlayContent}>
          <Icon name="lock" size={48} color={theme.colors.error} />
          <Text
            style={[styles.restrictedText, {color: theme.colors.error}]}
            variant="headlineSmall">
            CONTENU RESTREINT
          </Text>
          {channelName && (
            <Text
              style={[styles.channelName, {color: theme.colors.onSurfaceVariant}]}>
              {channelName}
            </Text>
          )}
          <Text
            style={[styles.reasonText, {color: theme.colors.onSurface}]}>
            {restrictionReason}
          </Text>
          <View style={styles.tapContainer}>
            <Icon name="touch-app" size={20} color={theme.colors.accent.primary} />
            <Text
              style={[styles.tapText, {color: theme.colors.accent.primary}]}>
              Appuyer pour déverrouiller
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Overlay simple pour les cartes de grille
  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <View style={[styles.overlayGradient, {backgroundColor: 'rgba(0,0,0,0.6)'}]} />
      <View style={styles.overlayContent}>
        <Icon name="lock" size={24} color="#ffffff" />
        {onPress && (
          <TouchableOpacity
            style={[styles.unlockButton, {backgroundColor: theme.colors.accent.primary}]}
            onPress={onPress}
            activeOpacity={0.8}>
            <Text style={[styles.unlockText, {color: theme.colors.onPrimary}]}>
              Déverrouiller
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <RestrictedBadge size="small" position="top-right" />
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    overflow: 'hidden',
  },
  overlayGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlayContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  unlockButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 2,
  },
  unlockText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Overlay complet pour les détails
  fullOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  fullOverlayContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  restrictedText: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 16,
  },
  channelName: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
  },
  reasonText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.9,
  },
  tapContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  tapText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default RestrictedOverlay;