import React, {useEffect, useRef} from 'react';
import {Animated, View, StyleSheet} from 'react-native';
import {useThemeColors} from '../contexts/ThemeContext';

interface RotationBackgroundProps {
  isVisible: boolean;
  children?: React.ReactNode;
}

export function RotationBackground({isVisible, children}: RotationBackgroundProps) {
  const theme = useThemeColors();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      // Animation de fondu entrant (700ms comme demandé)
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }).start();
    } else {
      // Animation de fondu sortant (plus rapide pour meilleure UX)
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, fadeAnim]);

  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          backgroundColor: theme.background, // Utilise la couleur du thème actuel
        }
      ]}
    >
      <View style={styles.content}>
        {children}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1, // Derrière les contrôles mais devant le contenu principal
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});