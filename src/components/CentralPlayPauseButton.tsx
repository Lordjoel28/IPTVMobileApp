import React from 'react';
import { TouchableOpacity, Animated, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface CentralPlayPauseButtonProps {
  /** État de visibilité du bouton */
  isVisible: boolean;
  /** État pause/lecture */
  isPaused: boolean;
  /** Style animé pour l'opacité et le scale */
  animatedStyle: any;
  /** Callback quand on clique sur le bouton */
  onPress: () => void;
}

/**
 * Bouton play/pause central qui s'affiche au clic sur la vidéo
 *
 * Comportement :
 * - S'affiche au centre de l'écran pendant 3 secondes
 * - Se masque automatiquement après inactivité
 * - Toggle play/pause au clic
 * - Design moderne avec ombre et gradient
 */
export const CentralPlayPauseButton: React.FC<CentralPlayPauseButtonProps> = ({
  isVisible,
  isPaused,
  animatedStyle,
  onPress,
}) => {
  // Si le bouton n'est pas visible, ne rien afficher
  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View style={[styles.centralButtonContainer, animatedStyle]}>
      <TouchableOpacity
        style={styles.centralPlayPauseButton}
        onPress={onPress}
        activeOpacity={0.8}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
        <LinearGradient
          colors={['rgba(0, 0, 0, 0.7)', 'rgba(0, 0, 0, 0.9)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.centralButtonGradient}>
          <Icon
            name={isPaused ? 'play-arrow' : 'pause'}
            size={64}
            color="white"
          />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  centralButtonContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -50, // -80/2 (hauteur du conteneur)
    marginLeft: -50, // -80/2 (largeur du conteneur)
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3000, // Au-dessus de tous les contrôles
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  centralPlayPauseButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centralButtonGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
});