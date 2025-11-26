import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import type { Channel } from '../types';

interface TiviMateControlsProps {
  /** État de visibilité des contrôles */
  isVisible: boolean;
  /** Chaîne en cours de lecture */
  channel: Channel | null;
  /** Est-ce que la chaîne est en favori */
  isChannelFavorite: boolean;
  /** Est-ce que l'écran est verrouillé */
  isScreenLocked: boolean;
  /** Est-ce qu'on vient du multi-écran (masque le bouton Cast) */
  isFromMultiScreen: boolean;
  /** État du menu paramètres */
  showSettingsMenu: boolean;
  /** Est-ce qu'on vient de l'autostart (interface simplifiée) */
  isFromAutoStart: boolean;

  // Callbacks
  /** Callback bouton retour */
  onBackPress: () => void;
  /** Callback toggle favori */
  onFavoriteToggle: () => void;
  /** Callback changement état Cast */
  onCastStateChange?: (isConnected: boolean) => void;
  /** Callback toggle verrouillage écran */
  onLockToggle: () => void;
  /** Callback toggle menu paramètres */
  onSettingsToggle: () => void;
  /** Callback Play/Pause */
  onPlayPauseToggle: () => void;
  /** État pause */
  isPaused: boolean;
}

/**
 * Contrôles TiviMate pour le lecteur fullscreen
 * Contient:
 * - Header avec boutons (retour, favoris, cast, lock, settings)
 * - Bouton Play/Pause central
 *
 * Note: Le DockerBar s'affiche automatiquement avec les contrôles (pas de bouton dédié)
 */
export const TiviMateControls: React.FC<TiviMateControlsProps> = ({
  isVisible,
  channel,
  isChannelFavorite,
  isScreenLocked,
  isFromMultiScreen,
  showSettingsMenu,
  isFromAutoStart,
  onBackPress,
  onFavoriteToggle,
  onCastStateChange,
  onLockToggle,
  onSettingsToggle,
  onPlayPauseToggle,
  isPaused,
}) => {
  // Import dynamique CastButton pour éviter dépendances circulaires
  const CastButton = require('./CastButton').CastButton;
  const castManager = require('../services/CastManager').castManager;

  React.useEffect(() => {
    if (isVisible) {
      console.log('📺 [TiviMateControls] Composant VISIBLE - bouton play/pause devrait être cliquable');
    } else {
      console.log('📺 [TiviMateControls] Composant CACHÉ');
    }
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <View
      style={[
        styles.controlsOverlay,
        {
          pointerEvents: isVisible ? 'box-none' : 'none',
        },
      ]}>
      {/* Header TiviMate: Bouton retour + Info chaîne + Paramètres */}
      <LinearGradient
        colors={['rgba(0, 0, 0, 0.8)', 'rgba(0, 0, 0, 0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.tiviMateHeader}
        pointerEvents="box-none">
        <View style={styles.headerLeftSection}>
          <TouchableOpacity
            style={styles.backButtonModern}
            onPress={onBackPress}
            activeOpacity={0.7}>
            <View style={styles.backIconContainer}>
              <Icon name="arrow-back" size={24} color="white" />
            </View>
          </TouchableOpacity>

          {channel && (
            <Text style={styles.headerChannelCategory}>
              {channel.contentType === 'movie' || channel.contentType === 'series'
                ? channel.name
                : (channel.category ? channel.category.toUpperCase() : '')
              }
            </Text>
          )}
        </View>

        <View style={styles.headerSpacer} />

        {/* 🎯 HEADER SIMPLIFIÉ POUR AUTOSTART */}
        {isFromAutoStart ? (
          // Mode autostart : pas de boutons à droite (le retour est déjà à gauche)
          <View style={styles.headerRightButtons} />
        ) : (
          // Mode normal : interface complète
          <View style={styles.headerRightButtons}>
            {/* Bouton Favoris */}
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={onFavoriteToggle}
              activeOpacity={0.7}>
              <Icon
                name={isChannelFavorite ? 'favorite' : 'favorite-border'}
                size={22}
                color={isChannelFavorite ? '#ff5252' : 'white'}
              />
            </TouchableOpacity>

          {/* Bouton Cast - Désactivé si on vient du multiscreen ou si c'est un film/série */}
          {!isFromMultiScreen && channel && (!channel.contentType || channel.contentType === 'live') && (
            <CastButton
              style={styles.headerIconButton}
              size={22}
              color="white"
              onCastStateChange={(isConnected: boolean) => {
                console.log('🎥 [Cast] State changed:', isConnected);
                if (isConnected && channel) {
                  // Caster la chaîne actuelle
                  castManager
                    .castChannel({
                      url: channel.url,
                      title: channel.name,
                      subtitle: channel.category || '',
                      logo: channel.logo,
                      metadata: {
                        studio: channel.category,
                        genre: channel.group,
                      },
                    })
                    .catch((error: Error) => {
                      console.error('❌ [Cast] Error casting channel:', error);
                    });
                }
                onCastStateChange?.(isConnected);
              }}
            />
          )}

          {/* Bouton Verrouillage */}
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={onLockToggle}
            activeOpacity={0.7}>
            <Icon
              name={isScreenLocked ? 'lock' : 'lock-open'}
              size={22}
              color="white"
            />
          </TouchableOpacity>

          {/* Bouton Paramètres */}
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={onSettingsToggle}
            activeOpacity={0.7}>
            <View style={styles.settingsIconContainer}>
              <Icon name="settings" size={24} color="white" />
            </View>
          </TouchableOpacity>
        </View>
        )}
      </LinearGradient>

      {/* Center: Bouton Play/Pause SIMPLE */}
      <View style={styles.centerControls} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.playPauseButton}
          onPress={() => {
            console.log('✅✅✅ [Play/Pause] BOUTON CLIQUÉ - onPress déclenché!');
            onPlayPauseToggle();
          }}
          onPressIn={() => {
            console.log('👇 [Play/Pause] Touch IN détecté');
          }}
          onPressOut={() => {
            console.log('👆 [Play/Pause] Touch OUT détecté');
          }}
          activeOpacity={0.8}
          hitSlop={{ top: 40, bottom: 40, left: 40, right: 40 }}>
          <Icon
            name={isPaused ? 'play-arrow' : 'pause'}
            size={40}
            color="white"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2500,
  },
  tiviMateHeader: {
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  backButtonModern: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerChannelCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  headerSpacer: {
    flex: 1,
  },
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerControls: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    transform: [{ translateX: -40 }, { translateY: -40 }],
    zIndex: 9999,
    elevation: 9999,
  },
  playPauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
});
