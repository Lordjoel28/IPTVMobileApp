/**
 * 🎨 ModernDialog - Boîtes de dialogue modernes style IPTV
 * Remplace les Alert.alert natifs par un design cohérent
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useUISettings} from '../stores/UIStore';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('screen');

interface DialogButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress: () => void;
}

interface ModernDialogProps {
  visible: boolean;
  title: string;
  message: string;
  icon?: string;
  iconColor?: string;
  buttons: DialogButton[];
  stats?: {channels: number; programmes: number} | null;
  onClose: () => void;
}

export const ModernDialog: React.FC<ModernDialogProps> = ({
  visible,
  title,
  message,
  icon,
  iconColor = '#4A90E2',
  buttons,
  stats,
  onClose,
}) => {
  const { getMenuAlpha, getScaledTextSize } = useUISettings();

  console.log(`🎨 [ModernDialog] Menu alpha: ${getMenuAlpha()}, Text scale: ${getScaledTextSize(18)}`);

  const getButtonStyle = (style?: string) => {
    switch (style) {
      case 'cancel':
        return ['#6B7FBB', '#5A6FA8'];
      case 'destructive':
        return ['#F44336', '#D32F2F'];
      default:
        return ['#4A90E2', '#357ABD'];
    }
  };

  const getButtonTextColor = (style?: string) => {
    return style === 'cancel' ? 'rgba(255, 255, 255, 0.8)' : '#FFFFFF';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <StatusBar
        backgroundColor="rgba(0, 0, 0, 0.75)"
        barStyle="light-content"
      />
      <View style={[styles.overlay, { backgroundColor: getMenuAlpha() }]}>
        <View style={[styles.dialogContainer, { backgroundColor: getMenuAlpha() }]}>
          <LinearGradient
            colors={['#4A4F6C', '#3A3F5C', '#2E3348', '#222734']}
            style={styles.dialog}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            locations={[0, 0.3, 0.7, 1]}>
            {/* Header avec icône */}
            <View style={styles.header}>
              {icon && (
                <View style={styles.iconContainer}>
                  <LinearGradient
                    colors={[iconColor, iconColor + 'CC']}
                    style={styles.iconBackground}>
                    <Icon name={icon} size={24} color="#FFFFFF" />
                  </LinearGradient>
                </View>
              )}
              <Text style={[styles.title, { fontSize: getScaledTextSize(20) }]}>{title}</Text>
            </View>

            {/* Message */}
            <Text style={[styles.message, { fontSize: getScaledTextSize(16) }]}>{message}</Text>

            {/* Stats pour les téléchargements EPG */}
            {stats && (
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <View style={styles.statIconContainer}>
                    <Icon name="tv" size={16} color="#4A90E2" />
                  </View>
                  <Text style={[styles.statNumber, { fontSize: getScaledTextSize(18) }]}>
                    {stats.channels.toLocaleString()}
                  </Text>
                  <Text style={[styles.statLabel, { fontSize: getScaledTextSize(12) }]}>chaînes</Text>
                </View>
                <View style={styles.statItem}>
                  <View style={styles.statIconContainer}>
                    <Icon name="event" size={16} color="#FF9800" />
                  </View>
                  <Text style={[styles.statNumber, { fontSize: getScaledTextSize(18) }]}>
                    {stats.programmes.toLocaleString()}
                  </Text>
                  <Text style={[styles.statLabel, { fontSize: getScaledTextSize(12) }]}>programmes</Text>
                </View>
              </View>
            )}

            {/* Boutons */}
            <View style={styles.buttonsContainer}>
              {buttons.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    buttons.length === 1 && styles.singleButton,
                  ]}
                  onPress={() => {
                    button.onPress();
                    onClose();
                  }}
                  activeOpacity={0.8}>
                  <LinearGradient
                    colors={getButtonStyle(button.style)}
                    style={styles.buttonGradient}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}>
                    <Text
                      style={[
                        [styles.buttonText, { fontSize: getScaledTextSize(16) }],
                        {color: getButtonTextColor(button.style)},
                      ]}>
                      {button.text}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dialogContainer: {
    width: Math.min(SCREEN_WIDTH - 40, 350),
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  dialog: {
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    marginRight: 12,
  },
  iconBackground: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    flex: 1,
  },
  message: {
    fontSize: 14,
    color: 'rgba(240, 241, 245, 0.8)',
    lineHeight: 20,
    marginBottom: 24,
    textAlign: 'left',
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  button: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  singleButton: {
    flex: 0,
    minWidth: 140,
    alignSelf: 'center',
  },
  buttonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    marginTop: 8,
    gap: 16,
    justifyContent: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  statIconContainer: {
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(240, 241, 245, 0.7)',
    fontWeight: '500',
  },
});

export default ModernDialog;
