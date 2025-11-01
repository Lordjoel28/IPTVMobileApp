/**
 * 🔒 LockedChannelBadge - Badge cadenas pour chaînes verrouillées
 * S'affiche sur les chaînes bloquées par le contrôle parental
 */

import React from 'react';
import {View, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useThemeColors} from '../contexts/ThemeContext';

interface LockedChannelBadgeProps {
  size?: 'small' | 'medium' | 'large';
  absolute?: boolean; // Nouveau prop pour choisir le mode de positionnement
}

const LockedChannelBadge: React.FC<LockedChannelBadgeProps> = ({
  size = 'medium',
  absolute = true, // Par défaut, comportement actuel
}) => {
  const colors = useThemeColors();
  const styles = createStyles(colors, size, absolute);

  return (
    <View style={styles.container}>
      <Icon name="lock" size={styles.iconSize} color="#E74C3C" />
    </View>
  );
};

const createStyles = (colors: any, size: string, absolute: boolean) => {
  const sizes = {
    small: {
      container: 24,
      iconSize: 14,
    },
    medium: {
      container: 32,
      iconSize: 18,
    },
    large: {
      container: 40,
      iconSize: 24,
    },
  };

  const currentSize = sizes[size as keyof typeof sizes];

  return StyleSheet.create({
    container: {
      // Positionnement conditionnel selon le contexte d'utilisation
      ...(absolute ? {
        position: 'absolute' as const,
        top: 8,
        left: 8,
        zIndex: 10,
      } : {
        // Positionnement relatif pour les conteneurs flex (comme ChannelPlayerScreen)
        // Pas de positionnement absolu, s'intègre dans le flux flex
      }),
      width: currentSize.container,
      height: currentSize.container,
      borderRadius: currentSize.container / 2,
      // Pas de fond, juste l'icône
      backgroundColor: 'transparent',
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconSize: currentSize.iconSize,
  }) as any;
};

export default LockedChannelBadge;