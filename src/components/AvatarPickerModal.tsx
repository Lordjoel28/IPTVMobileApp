/**
 * 🎭 AvatarPickerModal - Sélecteur d'avatars en modal
 * Grille d'emojis avec sélection visuelle
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  StyleSheet as RNStyleSheet,
} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {AVAILABLE_AVATARS} from '../services/ProfileService';
import {useThemeColors} from '../contexts/ThemeContext';
import {useI18n} from '../hooks/useI18n';

interface AvatarPickerModalProps {
  visible: boolean;
  selectedAvatar: string;
  onSelect: (avatar: string) => void;
  onClose: () => void;
}

const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  visible,
  selectedAvatar,
  onSelect,
  onClose,
}) => {
  const colors = useThemeColors();
  const {t: tCommon} = useI18n('common');

  const handleAvatarSelect = (avatar: string) => {
    onSelect(avatar);
    onClose();
  };

  return (
    <>
      {/* Modal avec effet flou parfait */}
      {visible && (
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
          <View style={styles.modalContainer}>
            <View
              style={[
                styles.modalContent,
                {backgroundColor: colors.surface.overlay},
              ]}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, {color: colors.text.primary}]}>
                  {tCommon('chooseAvatar')}
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={[
                    styles.closeButton,
                    {backgroundColor: colors.surface.secondary},
                  ]}>
                  <Icon name="close" size={20} color={colors.text.primary} />
                </TouchableOpacity>
              </View>

              {/* Grille d'avatars */}
              <View
                style={[
                  styles.avatarGrid,
                  {backgroundColor: colors.surface.elevated},
                ]}>
                {AVAILABLE_AVATARS.map(avatar => (
                  <TouchableOpacity
                    key={avatar}
                    style={[
                      styles.avatarOption,
                      {
                        backgroundColor: colors.surface.secondary,
                        borderColor: colors.ui.border,
                      },
                      selectedAvatar === avatar && {
                        borderColor: colors.accent.success,
                        backgroundColor: colors.surface.elevated,
                      },
                    ]}
                    onPress={() => handleAvatarSelect(avatar)}>
                    <Text style={styles.avatarEmoji}>{avatar}</Text>
                    {selectedAvatar === avatar && (
                      <View
                        style={[
                          styles.checkmark,
                          {backgroundColor: colors.accent.success},
                        ]}>
                        <Icon name="check" size={14} color="#ffffff" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  // Styles avec effet flou parfait
  modalBlurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1500,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 450,
    maxHeight: '85%',
  },
  modalContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 20},
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 30,
    transform: [{translateY: -2}],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 12,
  },
  avatarOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    position: 'relative',
  },
  avatarEmoji: {
    fontSize: 32,
  },
  checkmark: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AvatarPickerModal;
