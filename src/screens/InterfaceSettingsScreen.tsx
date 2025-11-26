/**
 * 🎨 InterfaceSettingsScreen - Écran des paramètres d'interface utilisateur
 * Transparence, taille du texte et personnalisations visuelles
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useThemeColors } from '../contexts/ThemeContext';
import { useI18n } from '../hooks/useI18n';
import { useUISettings } from '../stores/UIStore';

// Composant Slider custom
const CustomSlider = ({
  value,
  onValueChange,
  minimumTrackTintColor,
  maximumTrackTintColor,
  thumbColor,
}: {
  value: number;
  onValueChange: (value: number) => void;
  minimumTrackTintColor: string;
  maximumTrackTintColor: string;
  thumbColor: string;
}) => {
  const [sliderWidth, setSliderWidth] = React.useState(0);

  const handlePress = (event: any) => {
    if (sliderWidth === 0) {
      console.log('🎚️ [CustomSlider] Slider width not ready yet');
      return;
    }
    const { locationX } = event.nativeEvent;
    const newValue = Math.max(0, Math.min(100, Math.round((locationX / sliderWidth) * 100)));
    console.log(`🎚️ [CustomSlider] Press at ${locationX}px, width=${sliderWidth}, newValue=${newValue}`);
    onValueChange(newValue);
  };

  const trackWidth = sliderWidth > 0 ? ((value / 100) * sliderWidth) : 0;

  console.log(`🎚️ [CustomSlider] Render: value=${value}, sliderWidth=${sliderWidth}, trackWidth=${trackWidth}`);

  return (
    <View
      style={customSliderStyles.sliderContainer}
      onLayout={(event) => {
        const { width: layoutWidth } = event.nativeEvent.layout;
        if (layoutWidth !== sliderWidth) {
          console.log(`🎚️ [CustomSlider] Layout width changed: ${sliderWidth} -> ${layoutWidth}`);
          setSliderWidth(layoutWidth);
        }
      }}
    >
      <TouchableOpacity
        style={customSliderStyles.sliderTouchable}
        onPress={handlePress}
        activeOpacity={1}
      >
        {/* Track arrière */}
        <View style={[customSliderStyles.track, { backgroundColor: maximumTrackTintColor }]} />

        {/* Track actif */}
        <View
          style={[
            customSliderStyles.activeTrack,
            {
              backgroundColor: minimumTrackTintColor,
              width: trackWidth,
            }
          ]}
        />

        {/* Thumb */}
        <View
          style={[
            customSliderStyles.thumb,
            {
              backgroundColor: thumbColor,
              left: Math.max(0, trackWidth - 10),
            }
          ]}
        />
      </TouchableOpacity>
    </View>
  );
};

const customSliderStyles = StyleSheet.create({
  sliderContainer: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
  },
  sliderTouchable: {
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
    width: '100%',
    top: 18,
  },
  activeTrack: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
    top: 18,
  },
  thumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    top: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
});

const InterfaceSettingsScreen: React.FC = () => {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const navigation = useNavigation();
  const { t: tSettings } = useI18n('settings');
  const { t: tCommon } = useI18n('common');

  const {
    uiSettings,
    setOverlayOpacity,
    setEpgOpacity,
    setMenuOpacity,
    setTextScale,
    resetUIToDefaults,
    applyUIPreset,
  } = useUISettings();

  // Debug logs
  console.log('🎨 [InterfaceSettingsScreen] Render');
  console.log('🎨 [InterfaceSettingsScreen] uiSettings:', uiSettings);

  // Options de taille de texte
  const textSizeOptions = [
    { label: tSettings('small'), value: 0.8 },
    { label: tSettings('medium'), value: 1.0 },
    { label: tSettings('large'), value: 1.2 },
    { label: tSettings('extraLarge'), value: 1.5 },
  ];

  // Options de presets
  const presets = [
    { key: 'light', label: tSettings('lightPreset'), desc: tSettings('presetLightDesc') },
    { key: 'dark', label: tSettings('darkPreset'), desc: tSettings('presetDarkDesc') },
    { key: 'high-contrast', label: tSettings('highContrastPreset'), desc: tSettings('presetHighContrastDesc') },
  ] as const;

  const handleResetToDefaults = () => {
    console.log('🎨 [InterfaceSettingsScreen] Reset to defaults requested');
    Alert.alert(
      tCommon('confirm'),
      tSettings('resetToDefaults') + '?',
      [
        { text: tCommon('cancel'), style: 'cancel' },
        {
          text: tSettings('resetToDefaults'),
          style: 'destructive',
          onPress: () => {
            console.log('🎨 [InterfaceSettingsScreen] Resetting to defaults...');
            resetUIToDefaults();
          },
        }
      ]
    );
  };

  const renderOpacitySlider = (
    title: string,
    description: string,
    value: number,
    onValueChange: (value: number) => void,
    icon: string
  ) => {
    console.log(`🎨 [InterfaceSettingsScreen] renderOpacitySlider: ${title}, current value: ${value}`);

      const handleValueChange = (newValue: number) => {
        console.log(`🎨 [InterfaceSettingsScreen] ${title} changed from ${value} to ${newValue}`);
        onValueChange(newValue);
      };

      return (
        <View style={[styles.settingCard, { backgroundColor: colors.background.secondary }]}>
          <View style={styles.settingHeader}>
            <View style={styles.settingIconContainer}>
              <Icon name={icon} size={24} color={colors.accent.primary} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: colors.text.primary }]}>
                {title}
              </Text>
              <Text style={[styles.settingSubtitle, { color: colors.text.secondary }]}>
                {description}
              </Text>
            </View>
          </View>

          <View style={styles.sliderContainer}>
            <CustomSlider
              value={value}
              onValueChange={handleValueChange}
              minimumTrackTintColor={colors.accent.primary}
              maximumTrackTintColor={colors.ui.border}
              thumbColor={colors.accent.primary}
            />
            <Text style={[styles.sliderValue, { color: colors.text.primary }]}>
              {Math.round(value)}%
            </Text>
          </View>
        </View>
      );
    };

  const renderTextSizeSelector = () => {
    console.log('🎨 [InterfaceSettingsScreen] renderTextSizeSelector');
    console.log('🎨 [InterfaceSettingsScreen] Current text scale:', uiSettings.textSize.scale);

    const handleTextScaleChange = (newScale: number) => {
      console.log(`🎨 [InterfaceSettingsScreen] Text scale changed from ${uiSettings.textSize.scale} to ${newScale}`);
      setTextScale(newScale);
    };

    return (
      <View style={[styles.settingCard, { backgroundColor: colors.background.secondary }]}>
        <View style={styles.settingHeader}>
          <View style={styles.settingIconContainer}>
            <Icon name="text-fields" size={24} color={colors.accent.primary} />
          </View>
          <View style={styles.settingTextContainer}>
            <Text style={[styles.settingTitle, { color: colors.text.primary }]}>
              {tSettings('textSize')}
            </Text>
            <Text style={[styles.settingSubtitle, { color: colors.text.secondary }]}>
              {tSettings('textSizeDesc')}
            </Text>
          </View>
        </View>

        <View style={styles.textSizeOptions}>
          {textSizeOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.textSizeOption,
                {
                  backgroundColor: uiSettings.textSize.scale === option.value
                    ? colors.accent.primary
                    : colors.background.primary,
                  borderColor: uiSettings.textSize.scale === option.value
                    ? colors.accent.primary
                    : colors.ui.border,
                }
              ]}
              onPress={() => handleTextScaleChange(option.value)}
            >
              <Text
                style={[
                  styles.textSizeOptionText,
                  {
                    color: uiSettings.textSize.scale === option.value
                      ? '#FFFFFF'
                      : colors.text.primary,
                  }
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderPresets = () => (
    <View style={[styles.settingCard, { backgroundColor: colors.background.secondary }]}>
      <View style={styles.settingHeader}>
        <View style={styles.settingIconContainer}>
          <Icon name="palette" size={24} color={colors.accent.primary} />
        </View>
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingTitle, { color: colors.text.primary }]}>
            {tSettings('presets')}
          </Text>
        </View>
      </View>

      <View style={styles.presetsContainer}>
        {presets.map((preset) => (
          <TouchableOpacity
            key={preset.key}
            style={[styles.presetOption, { backgroundColor: colors.background.primary }]}
            onPress={() => applyUIPreset(preset.key)}
          >
            <View style={styles.presetContent}>
              <Text style={[styles.presetTitle, { color: colors.text.primary }]}>
                {preset.label}
              </Text>
              <Text style={[styles.presetDescription, { color: colors.text.secondary }]}>
                {preset.desc}
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderResetButton = () => (
    <TouchableOpacity
      style={[styles.resetButton, { backgroundColor: '#FFF5F5' }]}
      onPress={handleResetToDefaults}
    >
      <Icon name="refresh" size={20} color={colors.accent.error} />
      <Text style={[styles.resetButtonText, { color: colors.accent.error }]}>
        {tSettings('resetToDefaults')}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.accent.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {tSettings('interface')}
        </Text>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Transparence */}
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          {tSettings('transparency')}
        </Text>

        {renderOpacitySlider(
          tSettings('overlayOpacity'),
          tSettings('overlayOpacityDesc'),
          uiSettings.transparency.overlayOpacity,
          setOverlayOpacity,
          'layers'
        )}

        {renderOpacitySlider(
          tSettings('epgOpacity'),
          tSettings('epgOpacityDesc'),
          uiSettings.transparency.epgOpacity,
          setEpgOpacity,
          'live-tv'
        )}

        {renderOpacitySlider(
          tSettings('menuOpacity'),
          tSettings('menuOpacityDesc'),
          uiSettings.transparency.menuOpacity,
          setMenuOpacity,
          'menu'
        )}

        {/* Taille du texte */}
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          {tSettings('textSize')}
        </Text>

        {renderTextSizeSelector()}

        {/* Presets */}
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          {tSettings('presets')}
        </Text>

        {renderPresets()}

        {/* Bouton reset */}
        {renderResetButton()}

        {/* Espace en bas */}
        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    backgroundColor: colors.accent.primary,
    paddingTop: 45,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  content: {
    flex: 1,
    backgroundColor: colors.background.primary,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 12,
    marginHorizontal: 8,
  },
  settingCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sliderValue: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'center',
  },
  textSizeOptions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  textSizeOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  textSizeOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  presetsContainer: {
    marginTop: 8,
  },
  presetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  presetContent: {
    flex: 1,
  },
  presetTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  presetDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpace: {
    height: 50,
  },
});

export default InterfaceSettingsScreen;