import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  StatusBar,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import SystemNavigationBar from 'react-native-system-navigation-bar';
import type {RootStackParamList} from '../../App';
import {useThemeColors} from '../contexts/ThemeContext';
import {useI18n} from '../hooks/useI18n';
import {videoSettingsService} from '../services/VideoSettingsService';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface LanguageOption {
  code: 'fr' | 'en' | 'es' | 'ar';
  name: string;
  nativeName: string;
  icon: string;
  flag: string;
}

const LanguageSettingsScreen: React.FC = () => {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const navigation = useNavigation<NavigationProp>();
  const {currentLanguage, changeLanguage} = useI18n('common');
  const {t: tCommon} = useI18n('common');
  const {t: tSettings} = useI18n('settings');
  const [isLoading, setIsLoading] = useState(true);

  const languageOptions: LanguageOption[] = [
    {
      code: 'fr',
      name: 'Français',
      nativeName: 'Français',
      icon: 'language',
      flag: '🇫🇷',
    },
    {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      icon: 'language',
      flag: '🇬🇧',
    },
    {
      code: 'es',
      name: 'Spanish',
      nativeName: 'Español',
      icon: 'language',
      flag: '🇪🇸',
    },
    {
      code: 'ar',
      name: 'Arabic',
      nativeName: 'العربية',
      icon: 'language',
      flag: '🇸🇦',
    },
  ];

  useEffect(() => {
    SystemNavigationBar.immersive();
    return () => {
      SystemNavigationBar.navigationShow();
    };
  }, []);

  // Utiliser la langue du contexte au lieu de charger depuis les paramètres
  // Le contexte gère déjà le chargement et la sauvegarde
  useEffect(() => {
    // Le contexte gère déjà l'état, pas besoin de charger manuellement
    setIsLoading(false);
  }, []);

  const saveLanguagePreference = async (language: 'fr' | 'en' | 'es' | 'ar') => {
    // Utiliser la méthode setLanguage du contexte qui gère aussi la sauvegarde
    await changeLanguage(language);
  };

  const renderLanguageOption = (option: LanguageOption) => {
    const isSelected = currentLanguage === option.code;

    return (
      <Pressable
        key={option.code}
        style={({pressed}) => [
          styles.optionCard,
          isSelected && styles.optionCardSelected,
          pressed && {transform: [{scale: 0.98}]},
        ]}
        onPress={() => saveLanguagePreference(option.code)}>
        <View style={styles.optionContent}>
          <View style={styles.optionHeader}>
            <View
              style={[
                styles.iconContainer,
                isSelected && styles.iconContainerSelected,
              ]}>
              <Text style={styles.flagEmoji}>{option.flag}</Text>
            </View>
            <View style={styles.optionInfo}>
              <Text
                style={[
                  styles.optionTitle,
                  isSelected && styles.optionTitleSelected,
                ]}>
                {option.nativeName}
              </Text>
              <Text style={styles.optionDescription}>{option.name}</Text>
            </View>
          </View>
          <View style={styles.radioContainer}>
            <View
              style={[
                styles.radioOuter,
                isSelected && styles.radioOuterSelected,
              ]}>
              {isSelected && <View style={styles.radioInner} />}
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>🔄 {tCommon('loading')}</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[colors.background.secondary, colors.background.secondary]}
      style={styles.container}>
      <StatusBar hidden={true} />

      <View style={styles.header}>
        <Pressable
          style={({pressed}) => [
            styles.backButton,
            pressed && {transform: [{scale: 0.9}]},
          ]}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>{tCommon('language').toUpperCase()}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        <View style={styles.sectionHeader}>
          <Icon name="language" size={24} color={colors.accent.primary} />
          <Text style={styles.sectionTitle}>{tSettings('chooseLanguage')}</Text>
        </View>

        <Text style={styles.sectionDescription}>
          {tSettings('selectAppLanguage')}
        </Text>

        <View style={styles.optionsContainer}>
          {languageOptions.map(renderLanguageOption)}
        </View>

        <View style={styles.infoBox}>
          <Icon name="info-outline" size={20} color={colors.accent.info} />
          <Text style={styles.infoText}>
            {tSettings('languageChangeInfo')}
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background.primary,
    },
    loadingText: {
      fontSize: 16,
      color: colors.text.primary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 25,
      paddingBottom: 20,
      position: 'relative',
    },
    backButton: {
      position: 'absolute',
      left: 15,
      top: 22,
      padding: 8,
      zIndex: 1,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text.primary,
      letterSpacing: 1.5,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
      marginLeft: 10,
    },
    sectionDescription: {
      fontSize: 14,
      color: colors.text.secondary,
      marginBottom: 24,
      lineHeight: 20,
    },
    optionsContainer: {
      gap: 16,
    },
    optionCard: {
      backgroundColor: colors.surface.primary,
      borderRadius: 16,
      padding: 16,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    optionCardSelected: {
      borderColor: colors.accent.primary,
      backgroundColor: colors.surface.elevated,
    },
    optionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    optionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    iconContainer: {
      width: 56,
      height: 56,
      borderRadius: 12,
      backgroundColor: colors.surface.secondary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    iconContainerSelected: {
      backgroundColor: colors.accent.primary + '20',
    },
    flagEmoji: {
      fontSize: 32,
    },
    optionInfo: {
      flex: 1,
    },
    optionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 4,
    },
    optionTitleSelected: {
      color: colors.accent.primary,
    },
    optionDescription: {
      fontSize: 13,
      color: colors.text.secondary,
      lineHeight: 18,
    },
    radioContainer: {
      marginLeft: 12,
    },
    radioOuter: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.ui.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioOuterSelected: {
      borderColor: colors.accent.primary,
    },
    radioInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.accent.primary,
    },
    infoBox: {
      flexDirection: 'row',
      backgroundColor: colors.surface.primary,
      borderRadius: 12,
      padding: 16,
      marginTop: 24,
      alignItems: 'flex-start',
    },
    infoText: {
      flex: 1,
      fontSize: 13,
      color: colors.text.secondary,
      lineHeight: 20,
      marginLeft: 12,
    },
  });

export default LanguageSettingsScreen;
