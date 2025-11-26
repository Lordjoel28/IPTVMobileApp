import React from 'react';
import {useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  StatusBar,
  Dimensions,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import SystemNavigationBar from 'react-native-system-navigation-bar';
import type {RootStackParamList} from '../../App';
import { useThemeColors } from '../contexts/ThemeContext';
import { useI18n } from '../hooks/useI18n';
import { useUISettings } from '../stores/UIStore';

// Types
type NavigationProp = StackNavigationProp<RootStackParamList>;

interface SettingCard {
  id: string;
  title: string;
  icon: string;
  route: keyof RootStackParamList | '#';
}

// --- Configuration de la grille ---
const {width: screenWidth} = Dimensions.get('window');
const numColumns = 6; // Retour à 6 colonnes
const paddingHorizontal = 18;
const cardMarginHorizontal = 10; // Marge gauche et droite de chaque carte
const cardMarginBottom = 20;
const cardWidth =
  (screenWidth - paddingHorizontal * 2 - cardMarginHorizontal * 2 * numColumns) /
  numColumns;

const SettingsScreen: React.FC = () => {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const navigation = useNavigation<NavigationProp>();
  const { t: tCommon } = useI18n('common');
  const { t: tSettings } = useI18n('settings');
  const { getScaledTextSize } = useUISettings();

  console.log(`🎨 [SettingsScreen] Text scale: ${getScaledTextSize(22)}`);

  useEffect(() => {
    SystemNavigationBar.immersive();
    return () => {
      SystemNavigationBar.navigationShow();
    };
  }, []);

  const settingsCards: SettingCard[] = [
    {
      id: 'themes',
      title: tSettings('themes'),
      icon: 'palette',
      route: 'ThemeSettings',
    },
    {
      id: 'interface',
      title: tSettings('interface'),
      icon: 'layers',
      route: 'InterfaceSettings',
    },
    {
      id: 'video_player',
      title: tSettings('videoPlayer'),
      icon: 'video-settings',
      route: 'VideoPlayerSettings',
    },
    {id: 'tv_guide', title: tSettings('tvGuide'), icon: 'event-note', route: 'TVGuideSettings'},
    {id: 'performance', title: tCommon('performance'), icon: 'bolt', route: 'PerformanceSettings'},
    {id: 'account', title: tSettings('account'), icon: 'account-circle', route: 'Account'},
    {id: 'player_settings', title: tSettings('playerSettings'), icon: 'tune', route: '#'},
    {id: 'player', title: tSettings('player'), icon: 'play-circle-outline', route: 'PlayerSettings'},
    {
      id: 'stream_format',
      title: tSettings('streamFormat'),
      icon: 'settings-ethernet',
      route: '#',
    },
    {id: 'update_content', title: tSettings('updateContent'), icon: 'update', route: 'AutoSyncSettings'},
    {id: 'parental', title: tSettings('parental'), icon: 'lock', route: 'ParentalControl'},
    {id: 'speed_test', title: tSettings('speedTest'), icon: 'network-check', route: 'SpeedTest'},
    {id: 'backup_restore', title: tSettings('backupRestore'), icon: 'cloud-upload', route: '#'},
    {
      id: 'remote_control',
      title: tSettings('remoteControl'),
      icon: 'settings-remote',
      route: '#',
    },
    {id: 'language', title: tCommon('language'), icon: 'language', route: 'LanguageSettings'},
    {id: 'help', title: tCommon('help'), icon: 'help-outline', route: '#'},
  ];

  const handleCardPress = (route: keyof RootStackParamList | '#') => {
    if (route !== '#') {
      navigation.navigate(route as any);
    } else {
      console.log('Action non définie');
    }
  };

  const renderSettingCard = (card: SettingCard, index: number) => {
    const cardStyle = [
      styles.card,
      {
        marginHorizontal: cardMarginHorizontal,
        marginBottom: cardMarginBottom,
      },
    ];


    return (
      <Pressable
        key={card.id}
        style={({pressed}) => [
          cardStyle,
          pressed && {transform: [{scale: 0.95}]},
        ]}
        onPress={() => handleCardPress(card.route)}>
        <View style={styles.cardContent}>
          <View style={styles.iconContainer}>
            <Icon name={card.icon} size={36} color={colors.text.primary} />
          </View>
          <Text style={[styles.cardTitle, { fontSize: getScaledTextSize(9) }]}>{card.title}</Text>
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
        <Text style={[styles.headerTitle, { fontSize: getScaledTextSize(22) }]}>{tCommon('settings')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.gridContainer}>
        {settingsCards.map(renderSettingCard)}
      </ScrollView>
    </LinearGradient>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
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
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingHorizontal: paddingHorizontal,
    paddingTop: 20,
  },
  card: {
    width: cardWidth,
    height: cardWidth,
    borderRadius: 18,
    backgroundColor: colors.surface.primary,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  iconContainer: {
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});

export default SettingsScreen;