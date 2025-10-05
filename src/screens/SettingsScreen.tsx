import React, {useEffect} from 'react';
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

  useEffect(() => {
    SystemNavigationBar.immersive();
    return () => {
      SystemNavigationBar.navigationShow();
    };
  }, []);

  const settingsCards: SettingCard[] = [
    {
      id: 'themes',
      title: 'Thèmes',
      icon: 'palette',
      route: 'ThemeSettings',
    },
    {
      id: 'video_player',
      title: 'Lecteur Vidéo',
      icon: 'video-settings',
      route: 'VideoPlayerSettings',
    },
    {id: 'tv_guide', title: 'TV Guide', icon: 'event', route: 'TVGuideSettings'},
    {id: 'app', title: 'APP', icon: 'apps', route: '#'},
    {id: 'account', title: 'Compte', icon: 'account-circle', route: '#'},
    {id: 'player_settings', title: 'Player Settings', icon: 'tune', route: '#'},
    {id: 'player', title: 'Player', icon: 'play-circle-outline', route: '#'},
    {
      id: 'stream_format',
      title: 'Type de flux',
      icon: 'settings-ethernet',
      route: '#',
    },
    {id: 'update_content', title: 'Mettre à jour', icon: 'update', route: '#'},
    {id: 'parental', title: 'Parental', icon: 'lock', route: '#'},
    {id: 'speed_test', title: 'Test de rapidité', icon: 'speed', route: '#'},
    {id: 'backup_restore', title: 'Sauvegarde', icon: 'cloud-upload', route: '#'},
    {
      id: 'remote_control',
      title: 'Télécommande',
      icon: 'settings-remote',
      route: '#',
    },
    {id: 'language', title: 'Language', icon: 'language', route: '#'},
    {id: 'help', title: 'Aidez-moi', icon: 'help-outline', route: '#'},
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
          <Text style={styles.cardTitle}>{card.title}</Text>
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
        <Text style={styles.headerTitle}>SETTINGS</Text>
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