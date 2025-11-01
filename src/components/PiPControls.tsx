import React from 'react';
import { TouchableOpacity, Animated as RNAnimated, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface PiPControlsProps {
  isVisible: boolean;
  opacity: RNAnimated.Value;
  onResize: () => void;
  onClose: () => void;
}

/**
 * Boutons de contrôle pour le mode Picture-in-Picture (PiP)
 * Affiche les boutons resize et close en overlay sur le mini-player
 */
export const PiPControls: React.FC<PiPControlsProps> = ({
  isVisible,
  opacity,
  onResize,
  onClose,
}) => {
  if (!isVisible) {
    return null;
  }

  return (
    <RNAnimated.View style={{ opacity }}>
      {/* Bouton resize PiP (comme IPTV Smarters Pro) */}
      <TouchableOpacity
        style={styles.pipResizeButton}
        onPress={onResize}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Icon name="zoom-out-map" size={17} color="white" />
      </TouchableOpacity>

      {/* Bouton fermer PiP - fermeture directe */}
      <TouchableOpacity
        style={styles.pipCloseButton}
        onPress={onClose}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
        <Icon name="close" size={18} color="white" />
      </TouchableOpacity>
    </RNAnimated.View>
  );
};

const styles = StyleSheet.create({
  pipResizeButton: {
    position: 'absolute',
    top: 4,
    right: 32,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3000,
  },
  pipCloseButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 14,
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3001,
  },
});
