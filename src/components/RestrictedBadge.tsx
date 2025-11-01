/**
 * 🔒 RestrictedBadge - Badge pour chaînes restreintes
 * Indicateur visuel montrant qu'une chaîne est protégée par le contrôle parental
 */

import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useTheme} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface RestrictedBadgeProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  style?: any;
}

const RestrictedBadge: React.FC<RestrictedBadgeProps> = ({
  size = 'medium',
  showText = false,
  position = 'top-right',
  style,
}) => {
  const theme = useTheme();

  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return {
          badgeSize: 20,
          iconSize: 12,
          fontSize: 8,
        };
      case 'large':
        return {
          badgeSize: 32,
          iconSize: 18,
          fontSize: 12,
        };
      default: // medium
        return {
          badgeSize: 26,
          iconSize: 14,
          fontSize: 10,
        };
    }
  };

  const {badgeSize, iconSize, fontSize} = getSizeStyle();

  const getPositionStyle = () => {
    switch (position) {
      case 'top-left':
        return {
          position: 'absolute' as const,
          top: -badgeSize / 2,
          left: -badgeSize / 2,
        };
      case 'bottom-left':
        return {
          position: 'absolute' as const,
          bottom: -badgeSize / 2,
          left: -badgeSize / 2,
        };
      case 'bottom-right':
        return {
          position: 'absolute' as const,
          bottom: -badgeSize / 2,
          right: -badgeSize / 2,
        };
      default: // top-right
        return {
          position: 'absolute' as const,
          top: -badgeSize / 2,
          right: -badgeSize / 2,
        };
    }
  };

  if (showText) {
    return (
      <View
        style={[
          styles.badgeWithText,
          {
            backgroundColor: theme.colors.error,
            width: badgeSize * 2.5,
            height: badgeSize,
          },
          getPositionStyle(),
          style,
        ]}>
        <Icon name="lock" size={iconSize} color="#ffffff" />
        <Text
          style={[
            styles.badgeText,
            {
              color: '#ffffff',
              fontSize,
              marginLeft: 4,
            },
          ]}>
          18+
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: theme.colors.error,
          width: badgeSize,
          height: badgeSize,
          borderRadius: badgeSize / 2,
        },
        getPositionStyle(),
        style,
      ]}>
      <Icon name="lock" size={iconSize} color="#ffffff" />
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  badgeWithText: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  badgeText: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default RestrictedBadge;