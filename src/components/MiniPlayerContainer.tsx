/**
 * 🎯 MiniPlayerContainer - Container pour GlobalVideoPlayer dans ChannelPlayerScreen
 *
 * Ce composant remplace l'icône TV par le vrai GlobalVideoPlayer
 * quand une chaîne est en cours de lecture
 */

import React from 'react';
import {View, StyleSheet, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {usePlayerStore} from '../stores/PlayerStore';

interface MiniPlayerContainerProps {
  height: number;
}

const MiniPlayerContainer: React.FC<MiniPlayerContainerProps> = ({height}) => {
  const {channel, isVisible, isFullscreen, actions} = usePlayerStore();

  // Si pas de chaîne active, afficher l'icône placeholder
  if (!channel || !isVisible) {
    return (
      <View style={[styles.placeholder, {height}]}>
        <Icon name="tv" size={40} color="#333" />
      </View>
    );
  }

  // Si une chaîne est active, afficher l'espace réservé pour le GlobalVideoPlayer
  // Le GlobalVideoPlayer se positionnera automatiquement ici quand ce n'est pas en fullscreen
  return (
    <TouchableOpacity
      style={[styles.videoContainer, {height}]}
      onPress={() => actions.setFullscreen(!isFullscreen)}
      activeOpacity={0.8}>
      {/* Espace réservé pour le GlobalVideoPlayer qui se positionnera par-dessus */}
      {isFullscreen && (
        <View style={styles.fullscreenIndicator}>
          <Icon name="fullscreen" size={40} color="#666" />
          <TouchableOpacity
            style={styles.backToMiniButton}
            onPress={() => actions.setFullscreen(false)}
            activeOpacity={0.7}>
            <Icon name="fullscreen-exit" size={20} color="white" />
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  fullscreenIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  backToMiniButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
    padding: 8,
  },
});

export default MiniPlayerContainer;
