/**
 * 🔔 AlertModal - Alertes personnalisées avec thème
 * Remplace Alert.alert() natif
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  StyleSheet as RNStyleSheet,
} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useThemeColors} from '../contexts/ThemeContext';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertModalProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  onClose: () => void;
}

const AlertModal: React.FC<AlertModalProps> = ({
  visible,
  title,
  message,
  buttons = [{text: 'OK'}],
  onClose,
}) => {
  const colors = useThemeColors();

  const handleButtonPress = (button: AlertButton) => {
    if (button.onPress) {
      button.onPress();
    }
    onClose();
  };

  const getButtonColor = (style?: string) => {
    switch (style) {
      case 'destructive':
        return colors.accent.error;
      case 'cancel':
        return colors.surface.secondary;
      default:
        return colors.accent.info;
    }
  };

  const getButtonTextColor = (style?: string) => {
    return style === 'cancel' ? colors.text.secondary : '#ffffff';
  };

  const getIconForTitle = (title: string) => {
    if (
      title.toLowerCase().includes('succès') ||
      title.toLowerCase().includes('success')
    ) {
      return {name: 'check-circle', color: colors.accent.success};
    }
    if (
      title.toLowerCase().includes('erreur') ||
      title.toLowerCase().includes('error')
    ) {
      return {name: 'error', color: colors.accent.error};
    }
    if (
      title.toLowerCase().includes('supprimer') ||
      title.toLowerCase().includes('delete')
    ) {
      return {name: 'delete', color: colors.accent.error};
    }
    return {name: 'info', color: colors.accent.info};
  };

  const icon = getIconForTitle(title);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.modalBlurOverlay}>
        <BlurView
          style={RNStyleSheet.absoluteFill}
          blurType="dark"
          blurAmount={5}
        />
        <TouchableOpacity
          style={RNStyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.dialogContainer}>
          <View
            style={[
              styles.dialog,
              {
                backgroundColor: colors.surface.primary,
                borderColor: colors.ui.border,
              },
            ]}>
            {/* Icône */}
            <View
              style={[
                styles.iconContainer,
                {backgroundColor: icon.color + '20'},
              ]}>
              <Icon name={icon.name} size={36} color={icon.color} />
            </View>

            {/* Titre */}
            <Text style={[styles.title, {color: colors.text.primary}]}>
              {title}
            </Text>

            {/* Message */}
            {message && (
              <Text style={[styles.message, {color: colors.text.secondary}]}>
                {message}
              </Text>
            )}

            {/* Boutons */}
            <View style={styles.buttonContainer}>
              {buttons.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    buttons.length === 1 && styles.buttonSingle,
                    {backgroundColor: getButtonColor(button.style)},
                    button.style === 'cancel' && {
                      borderWidth: 1,
                      borderColor: colors.ui.border,
                    },
                  ]}
                  onPress={() => handleButtonPress(button)}>
                  <Text
                    style={[
                      styles.buttonText,
                      {color: getButtonTextColor(button.style)},
                    ]}>
                    {button.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Styles avec effet flou parfait
  modalBlurOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogContainer: {
    width: '90%',
    maxWidth: 420,
  },
  dialog: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 20},
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 30,
    transform: [{translateY: -2}],
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSingle: {
    minWidth: 120,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AlertModal;
