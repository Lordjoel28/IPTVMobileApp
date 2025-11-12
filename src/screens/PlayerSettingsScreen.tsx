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
import {playerManager, type PlayerType} from '../services/PlayerManager';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface PlayerOption {
  id: PlayerType;
  name: string;
  description: string;
  icon: string;
  available: boolean;
}

const PlayerSettingsScreen: React.FC = () => {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const navigation = useNavigation<NavigationProp>();
  const {t: tCommon} = useI18n('common');
  const {t: tSettings} = useI18n('settings');
  const {t: tPlayer} = useI18n('player');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerType>('default');

  const playerOptions: PlayerOption[] = [
    {
      id: 'default',
      name: tPlayer('defaultPlayer'),
      description: tPlayer('defaultPlayerDescription'),
      icon: 'play-circle-filled',
      available: true,
    },
    {
      id: 'vlc',
      name: tPlayer('vlcPlayer'),
      description: tPlayer('vlcPlayerDescription'),
      icon: 'video-library',
      available: true,
    },
  ];

  useEffect(() => {
    SystemNavigationBar.immersive();
    loadPlayerPreference();
    return () => {
      SystemNavigationBar.navigationShow();
    };
  }, []);

  const loadPlayerPreference = () => {
    const currentPlayer = playerManager.getPlayerType();
    setSelectedPlayer(currentPlayer);
  };

  const savePlayerPreference = async (playerType: PlayerType) => {
    await playerManager.setPlayerType(playerType);
    setSelectedPlayer(playerType);
  };

  const renderPlayerOption = (option: PlayerOption) => {
    const isSelected = selectedPlayer === option.id;
    const isDisabled = !option.available;

    return (
      <Pressable
        key={option.id}
        style={({pressed}) => [
          styles.optionCard,
          isSelected && styles.optionCardSelected,
          isDisabled && styles.optionCardDisabled,
          pressed && !isDisabled && {transform: [{scale: 0.98}]},
        ]}
        onPress={() => !isDisabled && savePlayerPreference(option.id)}
        disabled={isDisabled}>
        <View style={styles.optionContent}>
          <View style={styles.optionHeader}>
            <View
              style={[
                styles.iconContainer,
                isSelected && styles.iconContainerSelected,
              ]}>
              <Icon
                name={option.icon}
                size={32}
                color={isSelected ? colors.accent.primary : colors.text.primary}
              />
            </View>
            <View style={styles.optionInfo}>
              <Text
                style={[
                  styles.optionTitle,
                  isSelected && styles.optionTitleSelected,
                ]}>
                {option.name}
              </Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
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
        <Text style={styles.headerTitle}>{tPlayer('playerScreen')}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        <View style={styles.sectionHeader}>
          <Icon name="play-circle-outline" size={24} color={colors.accent.primary} />
          <Text style={styles.sectionTitle}>{tPlayer('selectPlayer')}</Text>
        </View>

        <Text style={styles.sectionDescription}>
          {tPlayer('selectPlayerDescription')}
        </Text>

        <View style={styles.optionsContainer}>
          {playerOptions.map(renderPlayerOption)}
        </View>

        <View style={styles.infoBox}>
          <Icon name="info-outline" size={20} color={colors.accent.info} />
          <Text style={styles.infoText}>
            {tPlayer('playerInfo')}
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

export default PlayerSettingsScreen;
