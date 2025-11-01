/**
 * 🔒 SimplePinModal - Modal PIN plein écran
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useThemeColors} from '../contexts/ThemeContext';
import ProfileService from '../services/ProfileService';
import type {Profile} from '../types';

interface SimplePinModalProps {
  visible: boolean;
  profile: Profile;
  reason?: string;
  onClose: () => void;
  onSuccess: (verifiedPin: string) => void; // Passer le PIN vérifié
}

const SimplePinModal: React.FC<SimplePinModalProps> = ({
  visible,
  profile,
  reason,
  onClose,
  onSuccess,
}) => {
  const colors = useThemeColors();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setPin('');
      setError('');
    }
  }, [visible]);

  const handleNumberPress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError('');

      // Auto-submit quand 4 chiffres
      if (newPin.length === 4) {
        setTimeout(() => verifyPin(newPin), 100);
      }
    }
  };

  const handleBackspace = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setError('');
    }
  };

  const verifyPin = async (pinToVerify: string) => {
    try {
      const isValid = await ProfileService.verifyProfilePin(profile.id, pinToVerify);

      if (isValid) {
        onSuccess(pinToVerify); // Passer le PIN vérifié
        setPin('');
      } else {
        setError('Code PIN incorrect');
        setPin('');
      }
    } catch (err) {
      console.error('Erreur vérification PIN:', err);
      setError('Erreur de vérification');
      setPin('');
    }
  };

  if (!visible) return null;

  const renderKey = (key: string, index: number) => {
    if (!key) {
      return <View key={index} style={styles.key} />;
    }

    if (key === 'back') {
      return (
        <TouchableOpacity
          key={index}
          style={[styles.key, {backgroundColor: colors.surface.secondary}]}
          onPress={handleBackspace}
          activeOpacity={0.7}>
          <Icon name="backspace" size={20} color={colors.text.primary} />
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.key,
          {
            backgroundColor: colors.surface.secondary,
            borderWidth: 1,
            borderColor: colors.ui.border,
          },
        ]}
        onPress={() => handleNumberPress(key)}
        activeOpacity={0.7}>
        <Text style={[styles.keyText, {color: colors.text.primary}]}>
          {key}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={true}>
      <BlurView
        style={[styles.fullscreen, {backgroundColor: 'transparent'}]}
        blurType="dark"
        blurAmount={15}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconBg, {backgroundColor: `${colors.accent.error}15`}]}>
              <Icon name="lock" size={28} color={colors.accent.error} />
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={22} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Title */}
          <Text style={[styles.title, {color: colors.text.primary}]}>
            Code PIN Requis
          </Text>

          {/* Reason */}
          {reason ? (
            <Text style={[styles.reason, {color: colors.text.secondary}]}>
              {reason}
            </Text>
          ) : null}

          {/* PIN Dots */}
          <View style={styles.dots}>
            {[0, 1, 2, 3].map(i => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    borderColor: error ? colors.accent.error : colors.accent.primary,
                    backgroundColor: i < pin.length ? colors.accent.primary : 'transparent',
                  },
                ]}
              />
            ))}
          </View>

          {/* Error */}
          {error ? (
            <View style={styles.errorContainer}>
              <Icon name="error-outline" size={16} color={colors.accent.error} />
              <Text style={[styles.error, {color: colors.accent.error}]}>
                {error}
              </Text>
            </View>
          ) : (
            <Text style={[styles.instruction, {color: colors.text.tertiary}]}>
              Entrez votre code PIN à 4 chiffres
            </Text>
          )}

          {/* Keypad */}
          <View style={styles.keypad}>
            <View style={styles.row}>
              {renderKey('1', 0)}
              {renderKey('2', 1)}
              {renderKey('3', 2)}
            </View>
            <View style={styles.row}>
              {renderKey('4', 3)}
              {renderKey('5', 4)}
              {renderKey('6', 5)}
            </View>
            <View style={styles.row}>
              {renderKey('7', 6)}
              {renderKey('8', 7)}
              {renderKey('9', 8)}
            </View>
            <View style={styles.row}>
              {renderKey('', 9)}
              {renderKey('0', 10)}
              {renderKey('back', 11)}
            </View>
          </View>
        </ScrollView>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullscreen: {
    flex: 1,
    paddingTop: 30,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  iconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 0,
    padding: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  reason: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  instruction: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  dot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 20,
  },
  error: {
    fontSize: 12,
    fontWeight: '600',
  },
  keypad: {
    gap: 10,
    maxWidth: 240,
    alignSelf: 'center',
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  key: {
    width: 62,
    height: 62,
    borderRadius: 31,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyText: {
    fontSize: 22,
    fontWeight: '600',
  },
});

export default SimplePinModal;
