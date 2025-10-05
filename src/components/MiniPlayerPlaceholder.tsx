/**
 * 🎯 MiniPlayerPlaceholder - Container pour GlobalVideoPlayer
 *
 * Remplace l'ancien VideoPlayerPersistent dans ChannelPlayerScreen
 * Le vrai lecteur est maintenant géré par le GlobalVideoPlayer singleton
 */

import React from 'react';
import {View, StyleSheet, TouchableOpacity, Text} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  usePlayerStore_FULL,
  usePlayerControls,
  usePlayerDisplay,
  usePlayerData,
} from '../stores/PlayerStore';
import {Channel} from '../types';

interface MiniPlayerPlaceholderProps {
  channel: Channel;
  height: number;
}

const MiniPlayerPlaceholder: React.FC<MiniPlayerPlaceholderProps> = ({
  channel,
  height,
}) => {
  const {actions} = usePlayerStore_FULL();
  const {isPlaying, isPaused} = usePlayerControls();
  const {isVisible, isFullscreen} = usePlayerDisplay();
  const {channel: activeChannel} = usePlayerData();

  // 🎯 Démarrer la lecture si ce n'est pas déjà fait
  const handleStartPlayback = () => {
    console.log(
      '🎬 [MiniPlayerPlaceholder] Starting playback for:',
      channel.name,
    );
    actions.play(channel);
    actions.showMiniPlayer();
  };

  // 🎛️ Contrôles
  const handlePlayPause = () => {
    if (isPaused) {
      actions.resume();
    } else {
      actions.pause();
    }
  };

  const handleFullscreen = () => {
    console.log('🖥️ [MiniPlayerPlaceholder] Opening fullscreen');
    actions.showFullscreen();
  };

  // Si le GlobalVideoPlayer n'est pas actif ou c'est une autre chaîne
  if (!isVisible || !activeChannel || activeChannel.id !== channel.id) {
    return (
      <View style={[styles.placeholder, {height}]}>
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStartPlayback}
          activeOpacity={0.7}>
          <Icon name="play-arrow" size={32} color="white" />
          <Text style={styles.startText}>Lancer la lecture</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Si fullscreen, afficher un placeholder
  if (isFullscreen) {
    return (
      <View style={[styles.placeholder, {height}]}>
        <View style={styles.fullscreenIndicator}>
          <Icon name="fullscreen" size={24} color="white" />
          <Text style={styles.fullscreenText}>Lecture en plein écran</Text>
          <TouchableOpacity
            style={styles.miniButton}
            onPress={() => actions.showMiniPlayer()}
            activeOpacity={0.7}>
            <Text style={styles.miniButtonText}>Revenir au mini</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Si mini-lecteur actif, afficher les contrôles
  return (
    <View style={[styles.activeContainer, {height}]}>
      <TouchableOpacity
        style={styles.playerArea}
        onPress={handleFullscreen}
        activeOpacity={0.9}>
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.playPauseButton}
            onPress={e => {
              e.stopPropagation();
              handlePlayPause();
            }}
            activeOpacity={0.7}>
            <Icon
              name={isPaused ? 'play-arrow' : 'pause'}
              size={24}
              color="white"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.fullscreenButton}
            onPress={e => {
              e.stopPropagation();
              handleFullscreen();
            }}
            activeOpacity={0.7}>
            <Icon name="fullscreen" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      <Text style={styles.channelInfo} numberOfLines={1}>
        {channel.name}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  startText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },

  fullscreenIndicator: {
    alignItems: 'center',
  },
  fullscreenText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  miniButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  miniButtonText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '500',
  },

  activeContainer: {
    backgroundColor: '#000000',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  playerArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  playPauseButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    padding: 8,
  },
  fullscreenButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 6,
  },
  channelInfo: {
    position: 'absolute',
    bottom: 4,
    left: 8,
    right: 8,
    color: 'white',
    fontSize: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    textAlign: 'center',
  },
});

export default MiniPlayerPlaceholder;
