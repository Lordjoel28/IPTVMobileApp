/**
 * 🎨 ThemeSelector - Composant de sélection de thème
 * Interface élégante pour choisir et prévisualiser les thèmes
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Dimensions,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTheme, useThemeColors} from '../contexts/ThemeContext';
import {Theme, getThemesList} from '../themes/themeConfig';

interface ThemeSelectorProps {
  visible: boolean;
  onClose: () => void;
}

const {width} = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2; // 2 colonnes avec marges

const ThemeSelector: React.FC<ThemeSelectorProps> = ({visible, onClose}) => {
  const {currentTheme, setTheme, resetToSystem, isSystemTheme} = useTheme();
  const colors = useThemeColors();
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);

  const themesList = getThemesList();

  const handleThemeSelect = async (themeId: string) => {
    await setTheme(themeId);
    setSelectedPreview(null);
    onClose();
  };

  const handleSystemTheme = async () => {
    await resetToSystem();
    setSelectedPreview(null);
    onClose();
  };

  const renderThemeCard = ({item}: {item: any}) => {
    const isSelected = item.id === currentTheme.id && !isSystemTheme;
    const isPreview = selectedPreview === item.id;

    return (
      <TouchableOpacity
        style={[
          styles.themeCard,
          {width: CARD_WIDTH},
          isSelected && styles.selectedCard,
          isPreview && styles.previewCard,
        ]}
        onPress={() => handleThemeSelect(item.id)}
        onLongPress={() => setSelectedPreview(item.id)}
        activeOpacity={0.8}>
        {/* Prévisualisation du gradient */}
        <LinearGradient
          colors={
            item.id === 'dark'
              ? ['#1e1e2e', '#181825', '#11111b']
              : item.id === 'light'
              ? ['#f8f9fa', '#e9ecef', '#dee2e6']
              : item.id === 'ocean'
              ? ['#0f172a', '#1e293b', '#334155']
              : item.id === 'sunset'
              ? ['#1a0b1e', '#2d1b2e', '#3d2b3e']
              : ['#0f1b0f', '#1a2e1a', '#2d3f2d'] // forest
          }
          style={styles.gradientPreview}
        />

        {/* Couleur d'accent */}
        <View
          style={[styles.accentColor, {backgroundColor: item.primaryColor}]}
        />

        {/* Informations du thème */}
        <View style={styles.themeInfo}>
          <Text style={[styles.themeName, {color: colors.text.primary}]}>
            {item.name}
          </Text>
          <Text
            style={[styles.themeDescription, {color: colors.text.secondary}]}>
            {item.description}
          </Text>
        </View>

        {/* Indicateur de sélection */}
        {isSelected && (
          <View
            style={[
              styles.selectedIndicator,
              {backgroundColor: colors.accent.primary},
            ]}>
            <Icon name="check" size={16} color={colors.text.inverse} />
          </View>
        )}

        {/* Badge thème sombre/clair */}
        <View
          style={[
            styles.themeBadge,
            {
              backgroundColor: item.isDark
                ? colors.surface.elevated
                : colors.surface.primary,
            },
          ]}>
          <Icon
            name={item.isDark ? 'dark-mode' : 'light-mode'}
            size={12}
            color={colors.text.secondary}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const renderSystemOption = () => (
    <TouchableOpacity
      style={[
        styles.systemOption,
        isSystemTheme && styles.selectedSystemOption,
        {
          backgroundColor: colors.surface.primary,
          borderColor: colors.ui.border,
        },
      ]}
      onPress={handleSystemTheme}
      activeOpacity={0.8}>
      <View style={styles.systemIconContainer}>
        <Icon
          name="settings-system-daydream"
          size={24}
          color={colors.accent.primary}
        />
      </View>

      <View style={styles.systemInfo}>
        <Text style={[styles.systemTitle, {color: colors.text.primary}]}>
          Thème automatique
        </Text>
        <Text
          style={[styles.systemDescription, {color: colors.text.secondary}]}>
          Suit les réglages système de votre appareil
        </Text>
      </View>

      {isSystemTheme && (
        <View
          style={[
            styles.selectedIndicator,
            {backgroundColor: colors.accent.primary},
          ]}>
          <Icon name="check" size={16} color={colors.text.inverse} />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <LinearGradient
        colors={colors.background.gradient}
        style={styles.container}>
        {/* Header */}
        <View style={[styles.header, {borderBottomColor: colors.ui.divider}]}>
          <TouchableOpacity
            style={[
              styles.closeButton,
              {backgroundColor: colors.surface.primary},
            ]}
            onPress={onClose}
            activeOpacity={0.7}>
            <Icon name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>

          <Text style={[styles.title, {color: colors.text.primary}]}>
            Choix du thème
          </Text>

          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          {/* Option système */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, {color: colors.text.primary}]}>
              Automatique
            </Text>
            {renderSystemOption()}
          </View>

          {/* Thèmes personnalisés */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, {color: colors.text.primary}]}>
              Thèmes personnalisés
            </Text>

            <FlatList
              data={themesList}
              renderItem={renderThemeCard}
              keyExtractor={item => item.id}
              numColumns={2}
              columnWrapperStyle={styles.row}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          </View>

          {/* Aperçu thème sélectionné */}
          {selectedPreview && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, {color: colors.text.primary}]}>
                Aperçu
              </Text>
              <Text
                style={[styles.previewText, {color: colors.text.secondary}]}>
                Appuyez longuement sur un thème pour le prévisualiser
              </Text>
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },

  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  title: {
    fontSize: 18,
    fontWeight: '600',
  },

  placeholder: {
    width: 40,
  },

  content: {
    flex: 1,
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  section: {
    marginBottom: 32,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },

  // Option système
  systemOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    position: 'relative',
  },

  selectedSystemOption: {
    borderWidth: 2,
  },

  systemIconContainer: {
    marginRight: 16,
  },

  systemInfo: {
    flex: 1,
  },

  systemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },

  systemDescription: {
    fontSize: 14,
  },

  // Cartes de thème
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  themeCard: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },

  selectedCard: {
    borderWidth: 3,
  },

  previewCard: {
    transform: [{scale: 1.05}],
  },

  gradientPreview: {
    height: 80,
    width: '100%',
  },

  accentColor: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 16,
    height: 16,
    borderRadius: 8,
  },

  themeInfo: {
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },

  themeName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },

  themeDescription: {
    fontSize: 12,
  },

  selectedIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  themeBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Aperçu
  previewText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});

export default ThemeSelector;
