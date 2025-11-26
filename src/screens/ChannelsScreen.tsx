/**
 * 📺 ChannelsScreen - Interface navigation chaînes style IPTV Smarters Pro
 * Structure: Sidebar catégories + Grille chaînes + Recherche
 */

import React from 'react';
import {useState, useEffect, useRef, useCallback} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Image,
  Animated,
  Alert,
  InteractionManager,
  Modal,
  Platform,
  StyleSheet as RNStyleSheet,
} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import {FlashList} from '@shopify/flash-list';
import {useImmersiveScreen} from '../hooks/useStatusBar';

import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import {useI18n} from '../hooks/useI18n';
import FastImage from 'react-native-fast-image'; // ✅ Import pour préchargement
import {useUISettings} from '../stores/UIStore';
import ChannelCard from '../components/ChannelCard';
import type {Category, Channel, Profile} from '../types';
import {usePlayerStore} from '../stores/PlayerStore';
import {useRecentChannelsStore} from '../stores/RecentChannelsStore';
import {useParentalControlStore} from '../stores/ParentalControlStore';
import {useThemeColors} from '../contexts/ThemeContext';
import database from '../database';
import ProfileService from '../services/ProfileService';
import FavoritesService from '../services/FavoritesService';
import {Q} from '@nozbe/watermelondb';
import SimplePinModal from '../components/SimplePinModal';
import ParentalControlService from '../services/ParentalControlService';
// import SmartImage from '../components/common/SmartImage'; // Temporairement désactivé
import {quickSearchTest} from '../utils/QuickSearchTest'; // Test rapide recherche

const {width, height} = Dimensions.get('window');

interface ChannelsScreenProps {
  route: {
    params: {
      playlistId: string;
      channelsCount?: number;
      playlistType?: 'M3U' | 'XTREAM';
    };
  };
  navigation: any;
}

// Fonction createStyles définie avant le composant
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background.primary,
    },
    loadingText: {
      color: colors.text.primary,
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 8,
    },
    loadingSubtext: {
      color: colors.text.secondary,
      fontSize: 14,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 4,
      backgroundColor: colors.surface.primary,
      borderBottomWidth: 1,
      borderBottomColor: colors.ui.border,
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      color: colors.text.primary,
      fontSize: 18,
      fontWeight: '700',
      textAlign: 'center',
      flex: 1,
      marginHorizontal: 16,
    },
    headerTitleCount: {
      color: colors.text.primary,
      fontSize: 16,
      fontWeight: '400',
    },
    headerActions: {
      flexDirection: 'row',
    },
    headerButton: {
      padding: 8,
      marginLeft: 8,
    },
    searchButton: {
      padding: 8,
      marginLeft: 8,
      borderRadius: 20,
      backgroundColor: colors.surface.elevated,
      minWidth: 40,
      minHeight: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerSidebarButton: {
      padding: 8,
      marginRight: 16,
      borderRadius: 20,
      backgroundColor: colors.surface.elevated,
      minWidth: 40,
      minHeight: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    mainContent: {
      flex: 1,
      flexDirection: 'row',
    },
    sidebar: {
      width: width * 0.32,
      paddingTop: 16,
      paddingHorizontal: 16,
      paddingBottom: 16,
      backgroundColor: colors.surface.secondary,
      borderTopRightRadius: 16,
      borderBottomRightRadius: 16,
      borderRightWidth: 1,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.ui.border,
      shadowColor: colors.ui.shadow,
      shadowOffset: {width: 0, height: 8},
      shadowOpacity: 0.5,
      shadowRadius: 16,
      elevation: 12,
    },
    sidebarHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.ui.border,
      minHeight: 44,
    },
    sidebarTitle: {
      color: colors.text.primary,
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    sidebarCloseButton: {
      padding: 6,
      borderRadius: 18,
      backgroundColor: colors.surface.elevated,
      minWidth: 32,
      minHeight: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    channelsGridFullWidth: {
      flex: 1,
      width: '100%',
    },
    categoriesList: {
      flex: 1,
    },
    categoriesListContent: {
      paddingBottom: 20,
      flexGrow: 1,
    },
    categoryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
      marginBottom: 3,
      backgroundColor: 'transparent',
    },
    categoryItemSelected: {
      backgroundColor: colors.surface.elevated,
      borderLeftWidth: 5,
      borderLeftColor: colors.accent.primary,
      paddingLeft: 12, // Compenser la bordure
      borderRadius: 8,
    },
    categoryIcon: {
      marginRight: 12,
      width: 20,
    },
    categoryName: {
      flex: 1,
      color: colors.text.secondary,
      fontSize: 15,
      fontWeight: '500',
      lineHeight: 18,
    },
    categoryNameSelected: {
      color: colors.accent.primary,
      fontWeight: '700',
    },
    categoryCount: {
      color: colors.text.primary,
      fontSize: 13,
      fontWeight: '400',
      marginLeft: 8,
      minWidth: 40,
      textAlign: 'right',
    },
    categoryCountSelected: {
      color: colors.accent.primary,
      fontWeight: '700',
      fontSize: 18,
      transform: [{scale: 1.1}],
    },
    categoryCountContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      minWidth: 45,
    },
    channelsGrid: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    channelsGridContent: {
      paddingTop: 8,
      paddingBottom: 20,
    },
    channelsRow: {
      justifyContent: 'flex-start',
      marginBottom: 6,
    },
    emptyChannels: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyText: {
      color: colors.text.secondary,
      fontSize: 16,
      fontWeight: '600',
      marginTop: 16,
      textAlign: 'center',
    },
    emptySubtext: {
      color: colors.text.tertiary,
      fontSize: 12,
      marginTop: 8,
      textAlign: 'center',
      paddingHorizontal: 32,
      lineHeight: 16,
    },
    loadingFooter: {
      padding: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingFooterText: {
      color: colors.text.secondary,
      fontSize: 14,
      fontWeight: '500',
    },
    endFooter: {
      padding: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    endFooterText: {
      color: 'rgba(255, 255, 255, 0.5)',
      fontSize: 12,
      fontWeight: '400',
    },
    rowSpacingSidebar: {
      justifyContent: 'space-between',
      paddingHorizontal: 0,
      marginBottom: 4,
    },
    rowSpacingFullscreen: {
      justifyContent: 'space-between',
      paddingHorizontal: 0,
      marginBottom: 6,
    },
    // 🎯 Styles avec effet flou pour le menu dropdown
    dropdownBlurOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1500,
    },
    dropdownContainer: {
      position: 'absolute',
      top: 55,
      right: 12,
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
    },
    dropdownMenu: {
      borderRadius: 20,
      paddingVertical: 12,
      paddingHorizontal: 8,
      minWidth: 200,
      maxWidth: 240,
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 20},
      shadowOpacity: 0.25,
      shadowRadius: 32,
      elevation: 30,
      transform: [{translateY: -2}],
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    dropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      marginHorizontal: 4,
      marginVertical: 1,
      backgroundColor: 'transparent',
    },
    dropdownText: {
      fontSize: 13,
      fontWeight: '500',
      marginLeft: 12,
      flex: 1,
    },
    dropdownSeparator: {
      height: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.06)',
      marginVertical: 6,
      marginHorizontal: 16,
      borderRadius: 1,
    },
    // 🎯 Styles avec effet flou pour le menu de tri
    sortModalBlurOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1500,
    },
    sortModalContainer: {
      position: 'absolute',
      top: 100,
      right: 12,
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
    },
    sortDropdownMenu: {
      borderRadius: 20,
      paddingVertical: 8,
      paddingHorizontal: 4,
      minWidth: 180,
      maxWidth: 200,
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 20},
      shadowOpacity: 0.25,
      shadowRadius: 32,
      elevation: 30,
      transform: [{translateY: -2}],
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    sortDropdownHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 8,
    },
    sortDropdownTitle: {
      fontSize: 13,
      fontWeight: '600',
    },
    sortDropdownSeparator: {
      height: 1,
      marginVertical: 4,
      marginHorizontal: 8,
    },
    sortDropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 8,
      marginHorizontal: 4,
      gap: 10,
    },
    sortDropdownItemSelected: {
      backgroundColor: 'rgba(74, 158, 255, 0.1)',
    },
    sortDropdownItemCancel: {
      // Pas de style spécial, utilisation des couleurs par défaut
    },
    sortDropdownText: {
      fontSize: 13,
      fontWeight: '500',
      flex: 1,
    },
    sortOptions: {
      marginBottom: 18,
    },
    sortOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 6,
      borderRadius: 8,
      marginVertical: 1,
    },
    sortOptionText: {
      fontSize: 15,
      fontWeight: '400',
      color: '#333333',
      marginLeft: 10,
    },
    sortOptionTextSelected: {
      fontWeight: '500',
      color: '#4A9EFF',
    },
    sortModalActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
      paddingTop: 8,
    },
    sortModalButtonSecondary: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 16,
      backgroundColor: '#F2F2F7',
      shadowColor: '#000000',
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
      minWidth: 90,
    },
    sortModalButtonSecondaryText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#8E8E93',
      textAlign: 'center',
    },
    sortModalButtonPrimary: {
      paddingVertical: 12,
      paddingHorizontal: 28,
      borderRadius: 16,
      backgroundColor: '#007AFF',
      shadowColor: '#007AFF',
      shadowOffset: {width: 0, height: 8},
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 8,
      minWidth: 120,
    },
    sortModalButtonPrimaryText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
      textAlign: 'center',
    },

    // Styles Modal Favoris avec effet flou parfait
    favoriteModalBlurOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1500,
    },
    favoriteModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    favoriteModalContainer: {
      backgroundColor: colors.surface.overlay || 'rgba(255, 255, 255, 0.98)',
      borderRadius: 24,
      padding: 16,
      width: width * 0.90,
      maxWidth: 350,
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 20},
      shadowOpacity: 0.25,
      shadowRadius: 32,
      elevation: 30,
      transform: [{translateY: -2}],
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    favoriteModalTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.text.primary,
      textAlign: 'center',
      marginBottom: 16,
      lineHeight: 20,
    },
    favoriteModalActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    favoriteModalButtonCancel: {
      flex: 1,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 12,
      backgroundColor: colors.surface.secondary,
      alignItems: 'center',
    },
    favoriteModalButtonCancelText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.text.secondary,
    },
    favoriteModalButtonConfirm: {
      flex: 1.5,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 12,
      backgroundColor: colors.accent.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.accent.primary,
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    favoriteModalButtonConfirmText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });

const ChannelsScreen: React.FC<ChannelsScreenProps> = ({route, navigation}) => {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const {t: tChannels} = useI18n('channels');
  const {t: tCommon} = useI18n('common');
  const {t: tProfiles} = useI18n('profiles');
  const { getScaledTextSize } = useUISettings();

  console.log(`🎨 [ChannelsScreen] Text scale: ${getScaledTextSize(18)}`);

  // StatusBar immersif automatique pour cet écran
  useImmersiveScreen('Channels', true);

  const {
    playlistId,
    channelsCount = 0,
    playlistType = 'M3U', // 'M3U' ou 'XTREAM'
  } = route.params || {};

  // 🚀 NOUVELLE ARCHITECTURE: Tout en WatermelonDB (M3U + Xtream)
  console.log('🚀 Architecture WatermelonDB unifiée:', {
    playlistType,
    channelsCount,
    storage: 'WatermelonDB (SQLite)',
  });

  // États
  const [channels, setChannels] = useState<Channel[]>([]);
  const [playlistName, setPlaylistName] = useState<string>('Playlist');
  const [totalChannels, setTotalChannels] = useState<number>(0);
  const [serverUrl, setServerUrl] = useState<string>('');

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const flashListRef = useRef<FlashList<Channel>>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [displayedChannels, setDisplayedChannels] = useState<Channel[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMoreChannels, setHasMoreChannels] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hideChannelNames, setHideChannelNames] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [sortOption, setSortOption] = useState<
    'default' | 'newest' | 'az' | 'za'
  >('default');
  const CHANNELS_PER_PAGE = 800; // ✅ 800 chaînes - SQLite local est instantané

  // 🕰️ LISTENER RÉCENTS: Ecouter les changements dans RecentChannelsStore pour mettre à jour le compteur
  const recentChannels = useRecentChannelsStore(state => state.recentChannels);
  const profileChangeCounter = useRecentChannelsStore(state => state.profileChangeCounter);

  // ⭐ États pour les favoris par profil
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [blockedCategories, setBlockedCategories] = useState<string[]>([]);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [selectedBlockedCategory, setSelectedBlockedCategory] = useState<Category | null>(null);

  // 🆕 Store global pour le déverrouillage de catégorie (partagé entre ChannelsScreen et ChannelPlayerScreen)
  const {
    unlockedCategories,
    currentUnlockedCategory,
    unlockCategory,
    unlockAllCategories,
    lockAll,
    isUnlocked,
    setCurrentUnlockedCategory,
    version: unlockedCategoriesVersion, // 🔄 Compteur de version pour détecter les changements
  } = useParentalControlStore();
  // 🆕 Plus de limite de temps - le déverrouillage dure jusqu'au changement de catégorie

  // États pour le modal favoris
  const [favoriteModalVisible, setFavoriteModalVisible] = useState(false);
  const [selectedChannelForFavorite, setSelectedChannelForFavorite] =
    useState<Channel | null>(null);

  // 🛡️ SOLUTION RACE CONDITION: useRef pour capturer états actuels sans stale state
  const currentStateRef = useRef({
    channels: [] as Channel[],
    displayedChannels: [] as Channel[],
    categories: [] as Category[],
    selectedCategory: null as Category | null,
  });

  // ⚡ OPTIMISATION GROSSES PLAYLISTS - getItemLayout pour performances
  const ITEM_HEIGHT = 148; // 140 (height) + 8 (marginBottom) = 148px - AJUSTÉ pour 2 lignes
  const getItemLayout = React.useCallback(
    (data: ArrayLike<Channel> | null | undefined, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  // 🚀 OPTIMISATION MÉMOIRE - KeyExtractor optimisé pour 10K+ items
  const keyExtractor = React.useCallback((item: Channel, index: number) => {
    return `${item.id}-${index}`;
  }, []);

  // Normaliser les noms de catégories pour cohérence
  const normalizeCategoryName = (name: string): string => {
    if (!name || name.trim() === '') {
      return 'Non classé';
    }

    return name
      .trim()
      .replace(/[<>]/g, '') // Supprimer caractères dangereux
      .replace(/[|]/g, ' - ') // Remplacer pipes par tirets
      .replace(/\s+/g, ' ') // Normaliser espaces multiples
      .substring(0, 50) // Limiter longueur
      .replace(/^\w/, c => c.toUpperCase()); // Première lettre majuscule
  };

  //⭐ RESTAURÉ : Charger les favoris depuis FavoritesService (par profil + playlist)
  const loadProfileFavorites = async () => {
    try {
      const activeProfile = await ProfileService.getActiveProfile();
      if (!activeProfile) {
        console.log('❌ Aucun profil actif');
        return [];
      }

      setActiveProfileId(activeProfile.id);
      setActiveProfile(activeProfile);

      // 🔑 NOUVEAU: Filtrer par playlist actuelle pour les compteurs sidebar/header
      const favoriteChannels = await FavoritesService.getFavoriteChannelsByProfile(
        activeProfile.id,
        playlistId, // 🔑 Filtre par playlist actuelle
      );
      const favoriteChannelIds = favoriteChannels.map((channel: any) => channel.id);
      setFavorites(favoriteChannelIds);

      console.log(
        `⭐ ${favoriteChannelIds.length} favoris chargés pour profil "${activeProfile.name}" (playlist: ${playlistId})`,
      );

      return favoriteChannelIds;
    } catch (error) {
      console.error('❌ Erreur chargement favoris:', error);
      return [];
    }
  };

  // NOUVEAU : Charger favoris et historique depuis AsyncStorage
  const loadFavoritesAndHistory = async (profileBlockedCategories?: string[]) => {
    try {
      // Charger favoris depuis FavoritesService (par profil)
      const activeProfile = await ProfileService.getActiveProfile();
      let favoritesCount = 0;
      let historyCount = 0;

      if (!activeProfile) {
        console.log('⚠️ [loadFavoritesAndHistory] Aucun profil actif');
        return {favoritesCount: 0, historyCount: 0};
      }

      setActiveProfileId(activeProfile.id);
      setActiveProfile(activeProfile);

      // 🔑 Charger favoris du profil pour cette playlist (utilise la nouvelle méthode)
      let favoriteChannels = await FavoritesService.getFavoriteChannelsByProfile(
        activeProfile.id,
        playlistId,
      );

      // 🔒 FILTRER les favoris selon les catégories bloquées
      if (profileBlockedCategories && profileBlockedCategories.length > 0) {
        favoriteChannels = favoriteChannels.filter((ch: any) => {
          const groupTitle = ((ch as any).groupTitle || ch.group || ch.category || '').toLowerCase();
          return !profileBlockedCategories.some(blocked =>
            groupTitle.includes(blocked.toLowerCase())
          );
        });
      }
      favoritesCount = favoriteChannels.length;

      // 🔑 Charger récents du profil via RecentChannelsService (pas tous les récents!)
      const RecentChannelsService = (
        await import('../services/RecentChannelsService')
      ).default;
      let recentChannels = await RecentChannelsService.getRecentsByProfile(
        activeProfile.id,
        playlistId,
      );

      // 🔒 FILTRER les récents selon les catégories bloquées
      if (profileBlockedCategories && profileBlockedCategories.length > 0) {
        recentChannels = recentChannels.filter((ch: any) => {
          const groupTitle = ((ch as any).groupTitle || ch.group || ch.category || '').toLowerCase();
          return !profileBlockedCategories.some(blocked =>
            groupTitle.includes(blocked.toLowerCase())
          );
        });
      }
      historyCount = recentChannels.length;

      console.log(
        `✅ [loadFavoritesAndHistory] Profil ${activeProfile.name}: ${favoritesCount} favoris, ${historyCount} récents (après filtrage catégories bloquées)`,
      );

      return {favoritesCount, historyCount};
    } catch (error) {
      console.log('⚠️ Erreur chargement favoris/historique:', error);
      return {favoritesCount: 0, historyCount: 0};
    }
  };

  // 🔄 MISE À JOUR REF À CHAQUE CHANGEMENT D'ÉTAT - Solution GitHub Race Condition
  useEffect(() => {
    currentStateRef.current = {
      channels: channels,
      displayedChannels: displayedChannels,
      categories: categories,
      selectedCategory: selectedCategory,
    };
    console.log('🔄 REF UPDATED:', {
      channels: channels.length,
      displayedChannels: displayedChannels.length,
      categories: categories.length,
      selectedCategory: selectedCategory?.name,
    });
  }, [channels, displayedChannels, categories, selectedCategory]);

  // 🔄 RECHARGER LES RÉCENTS quand le profil change
  useEffect(() => {
    const loadRecentChannelsForProfile = async () => {
      try {
        console.log('🔄 [ChannelsScreen] Profil changé, rechargement des récents...');

        const activeProfile = await ProfileService.getActiveProfile();
        if (!activeProfile) {
          console.log('⚠️ [ChannelsScreen] Aucun profil actif');
          return;
        }

        // Charger les récents depuis le service (filtrés par profil)
        const RecentChannelsService = (await import('../services/RecentChannelsService')).default;
        const recentChannelsData = await RecentChannelsService.getRecentsByProfile(
          activeProfile.id,
          playlistId,
        );

        console.log(
          `✅ [ChannelsScreen] ${recentChannelsData.length} récents chargés pour profil:`,
          activeProfile.name,
        );

        // Mettre à jour le store avec les récents filtrés
        const {setRecentChannels} = useRecentChannelsStore.getState();
        setRecentChannels(recentChannelsData, activeProfile.id);

        // 🔑 MISE À JOUR IMMÉDIATE des compteurs dans categories ET selectedCategory
        const newCount = recentChannelsData.length;

        setCategories(prevCategories =>
          prevCategories.map(cat => {
            if (cat.id === 'history' || cat.name.includes('RÉCENTS')) {
              console.log(
                `📊 [ChannelsScreen] Mise à jour immédiate compteur RÉCENTS: ${cat.count} → ${newCount}`,
              );
              return {...cat, count: newCount};
            }
            return cat;
          }),
        );

        setSelectedCategory(prevSelected => {
          if (
            prevSelected &&
            (prevSelected.id === 'history' || prevSelected.name.includes('RÉCENTS'))
          ) {
            console.log(
              `📊 [ChannelsScreen] Mise à jour immédiate selectedCategory RÉCENTS: ${prevSelected.count} → ${newCount}`,
            );
            return {...prevSelected, count: newCount};
          }
          return prevSelected;
        });
      } catch (error) {
        console.error('❌ [ChannelsScreen] Erreur rechargement récents:', error);
      }
    };

    loadRecentChannelsForProfile();
  }, [profileChangeCounter, playlistId]); // 🔑 Se déclenche quand le profil change

  // 🕰️ MISE À JOUR TEMPS RÉEL: Mettre à jour le compteur RÉCENTS quand RecentChannelsStore change
  useEffect(() => {
    console.log(
      `🔄 [ChannelsScreen] RecentChannels changed: ${recentChannels.length} chaînes récentes`,
    );

    // Mettre à jour la liste des catégories
    setCategories(prevCategories =>
      prevCategories.map(cat => {
        if (cat.id === 'history' || cat.name.includes('RÉCENTS')) {
          console.log(
            `📊 [ChannelsScreen] Mise à jour compteur RÉCENTS: ${cat.count} → ${recentChannels.length}`,
          );
          return {...cat, count: recentChannels.length};
        }
        return cat;
      }),
    );

    // 🔑 AUSSI mettre à jour selectedCategory si c'est RÉCENTS (pour le header)
    setSelectedCategory(prevSelected => {
      if (
        prevSelected &&
        (prevSelected.id === 'history' || prevSelected.name.includes('RÉCENTS'))
      ) {
        console.log(
          `📊 [ChannelsScreen] Mise à jour selectedCategory RÉCENTS pour header: ${prevSelected.count} → ${recentChannels.length}`,
        );
        return {...prevSelected, count: recentChannels.length};
      }
      return prevSelected;
    });
  }, [recentChannels]);

  // 🔄 Focus listener pour rafraîchir les compteurs quand on revient sur l'écran
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      console.log('🎯 [ChannelsScreen] Focus - Rafraîchissement des compteurs');
      try {
        // Récupérer les catégories bloquées du profil actif
        const activeProfile = await ProfileService.getActiveProfile();
        const profileBlockedCategories =
          activeProfile?.blockedCategories && activeProfile.blockedCategories.length > 0
            ? activeProfile.blockedCategories
            : undefined;

        // Recharger les favoris du profil actif
        const favoriteIds = await loadProfileFavorites();

        const {favoritesCount, historyCount} = await loadFavoritesAndHistory(profileBlockedCategories);

        // Mettre à jour les catégories avec les nouveaux compteurs (filtrés)
        setCategories(prevCategories =>
          prevCategories.map(cat => {
            if (cat.id === 'favorites') {
              return {...cat, count: favoritesCount}; // Utiliser compteur filtré
            }
            if (cat.id === 'history') {
              return {...cat, count: historyCount}; // Utiliser compteur filtré
            }
            return cat;
          }),
        );
      } catch (error) {
        console.log('❌ [ChannelsScreen] Erreur refresh focus:', error);
      }
    });

    return unsubscribe;
  }, [navigation]);

  // StatusBar gérée automatiquement par useImmersiveScreen

  // Chargement des chaînes depuis l'ID de playlist
  useEffect(() => {
    console.log('🔄 useEffect ChannelsScreen - DÉMARRAGE');
    console.log('🔄 playlistId:', playlistId);
    console.log('🔄 playlistType:', playlistType);

    // Mode de chargement identifié
    console.log(
      `🔄 Mode: ${playlistType} (WatermelonDB) - ${channelsCount} chaînes`,
    );

    const loadChannels = async () => {
      if (!playlistId) {
        console.error('❌ Aucun ID de playlist fourni');
        setIsLoading(false);
        return;
      }

      try {
        console.log('📺 ChannelsScreen - Chargement playlist:', playlistId);
        console.log('🍉 Type:', playlistType);

        // 🚀 TOUJOURS WatermelonDB (M3U ou Xtream)
        console.log('🍉 USING WATERMELONDB for channels loading');
        await loadChannelsFromWatermelonDB();
      } catch (error) {
        console.error('❌ Erreur récupération chaînes:', error);
        Alert.alert(
          '❌ Erreur',
          'Impossible de charger les chaînes de la playlist.',
          [{text: 'OK', onPress: () => navigation.goBack()}],
        );
        setIsLoading(false);
      }
    };

    loadChannels();
  }, [playlistId, playlistType, channelsCount, navigation, loadChannelsFromWatermelonDB]);

  // Fonction pour normaliser les URLs de logos Xtream
  const normalizeXtreamLogoUrl = React.useCallback(
    (logoUrl: string, serverUrl: string): string => {
      if (!logoUrl || logoUrl.trim() === '' || logoUrl === 'null') {
        return '';
      }

      // URL complète - retourner directement
      if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
        return logoUrl;
      }

      // URL relative - construire avec serveur
      const cleanServerUrl = serverUrl.replace(/\/$/, '');
      if (logoUrl.startsWith('/')) {
        return `${cleanServerUrl}${logoUrl}`;
      }

      // Cas Xtream typique: chemin simple sans slash
      return `${cleanServerUrl}/${logoUrl}`;
    },
    [],
  );

  // 🍉 NOUVELLE FONCTION: Chargement depuis WatermelonDB avec lazy loading
  const loadChannelsFromWatermelonDB = React.useCallback(async () => {
    try {
      console.log('🍉 Loading from WatermelonDB - playlistId:', playlistId);
      console.log('🍉 WatermelonDB function CALLED - début chargement');
      const startTime = Date.now();

      // 🚀 Importer le bon service selon le type de playlist
      const WatermelonService =
        playlistType === 'XTREAM'
          ? (await import('../services/WatermelonXtreamService')).default
          : (await import('../services/WatermelonM3UService')).default;

      console.log(
        `🍉 Using ${
          playlistType === 'XTREAM' ? 'Xtream' : 'M3U'
        } WatermelonDB Service`,
      );

      // 🔒 CATÉGORIES BLOQUÉES + 📂 GROUPES VISIBLES: Récupérer les filtres du profil
      const activeProfile = await ProfileService.getActiveProfile();
      const profileBlockedCategories =
        activeProfile?.blockedCategories && activeProfile.blockedCategories.length > 0
          ? activeProfile.blockedCategories
          : undefined;
      const visibleGroups =
        activeProfile?.visibleGroups && activeProfile.visibleGroups.length > 0
          ? activeProfile.visibleGroups
          : undefined;

      if (profileBlockedCategories) {
        console.log(
          '🔒 Catégories bloquées:',
          profileBlockedCategories,
        );
      }
      if (visibleGroups) {
        console.log(
          `📂 Groupes visibles actifs (${visibleGroups.length}):`,
          visibleGroups,
        );
      }

      let result;
      try {
        // Pagination WatermelonDB optimisée - Charger première page (500 items)
        result = await WatermelonService.getPlaylistWithChannels(
          playlistId,
          CHANNELS_PER_PAGE, // 500 items cohérent avec le reste
          0,
          profileBlockedCategories, // 🔒 Filtrage SQL des catégories bloquées dès le chargement
        );
        console.log(`⏱️ WatermelonDB Query Time: ${Date.now() - startTime}ms`);

        console.log('🍉 WatermelonDB result:', {
          playlist: result.playlist?.name,
          channels: result.channels?.length,
          categories: result.categories?.length,
          totalChannels: result.totalChannels,
        });

        if (!result.playlist) {
          throw new Error('Playlist WatermelonDB introuvable');
        }
      } catch (watermelonError: any) {
        console.log(
          '⚠️ Playlist non trouvée dans WatermelonDB:',
          watermelonError.message,
        );
        console.log('🔄 Migration automatique depuis AsyncStorage...');

        // Migration automatique en arrière-plan (sans dialogue utilisateur)
        try {
          // Importer PlaylistService
          const {PlaylistService} = await import('../services/PlaylistService');
          const playlistService = PlaylistService.getInstance();

          console.log('🔄 Début migration automatique...');

          // Lancer la migration (silencieuse)
          const newPlaylistId =
            await playlistService.migratePlaylistToWatermelon(
              playlistId,
              (progress, message) => {
                console.log(`📊 Migration: ${progress}% - ${message}`);
              },
            );

          console.log(
            `✅ Migration automatique terminée: ${playlistId} → ${newPlaylistId}`,
          );

          // 🔧 CORRECTION: Mettre à jour AsyncStorage avec le nouveau ID
          try {
            const AsyncStorage = (
              await import('@react-native-async-storage/async-storage')
            ).default;
            await AsyncStorage.setItem(
              'last_selected_playlist_id',
              newPlaylistId,
            );
            console.log(
              `💾 ID playlist mis à jour dans AsyncStorage: ${newPlaylistId}`,
            );
          } catch (updateError) {
            console.error('❌ Erreur mise à jour AsyncStorage:', updateError);
          }

          // Recharger automatiquement avec le nouveau ID (sans alert)
          navigation.replace('ChannelsScreen', {
            playlistId: newPlaylistId,
            channelsCount: 0,
            playlistType: 'M3U',
          });

          return;
        } catch (migrationError: any) {
          console.error('❌ Erreur migration automatique:', migrationError);

          // Si migration échoue, afficher une vraie erreur
          Alert.alert(
            '❌ Erreur',
            'Impossible de charger cette playlist. Elle semble corrompue.',
            [
              {
                text: 'OK',
                onPress: () => navigation.goBack(),
              },
            ],
          );

          setIsLoading(false);
          return;
        }
      }

      // Récupérer le serveur Xtream pour normaliser les logos
      const playlistServerUrl = result.playlist.server || '';
      setServerUrl(playlistServerUrl);

      // Convertir les modèles WatermelonDB en objets Channel compatibles AVEC LOGOS CORRIGÉS
      const convertedChannels: Channel[] = result.channels.map(
        (channel: any, index: number) => {
          const rawLogo = channel.logoUrl || channel.streamIcon || '';
          const normalizedLogo = normalizeXtreamLogoUrl(
            rawLogo,
            playlistServerUrl,
          );


          return {
            id: channel.id,
            name: channel.name || 'Sans nom',
            logo: normalizedLogo,
            group: channel.groupTitle || channel.categoryName || 'Non classé',
            url: channel.streamUrl || '',
            type: 'XTREAM' as const,
          };
        },
      );

      console.log('🍉 Converted channels:', convertedChannels.length);
      console.log(
        '🍉 Sample channels:',
        convertedChannels.slice(0, 3).map(ch => ({
          name: ch.name,
          group: ch.group,
          hasLogo: !!ch.logo,
          logoUrl:
            ch.logo?.substring(0, 50) + ((ch.logo?.length ?? 0) > 50 ? '...' : ''),
        })),
      );

      const categoriesStartTime = Date.now();

      // Charger favoris du profil actif
      const favoriteIds = await loadProfileFavorites();

      // Charger favoris et historique (avec filtrage catégories bloquées)
      const {favoritesCount, historyCount} = await loadFavoritesAndHistory(profileBlockedCategories);

      // Récupérer les VRAIES catégories Xtream stockées dans WatermelonDB
      let xtreamCategories = result.categories || [];
      console.log(
        '📂 Vraies catégories Xtream trouvées:',
        xtreamCategories.length,
      );

      // 🔒 SAUVEGARDER les catégories bloquées dans le state pour l'affichage
      let filteredChannels = convertedChannels;
      if (profileBlockedCategories && profileBlockedCategories.length > 0) {
        console.log(
          `🔒 Catégories bloquées détectées (${profileBlockedCategories.length} catégories):`,
          profileBlockedCategories,
        );
        console.log(
          `📂 Les catégories bloquées resteront visibles avec cadenas 🔒`,
        );
        setBlockedCategories(profileBlockedCategories);
      } else {
        setBlockedCategories([]);
      }

      // 📂 FILTRAGE GROUPES VISIBLES: Filtrer les catégories et chaînes
      if (visibleGroups && visibleGroups.length > 0) {
        console.log(
          `📂 Application filtrage groupes visibles (${visibleGroups.length} groupes):`,
          visibleGroups,
        );

        // Filtrer les catégories
        const beforeCategoriesCount = xtreamCategories.length;
        xtreamCategories = xtreamCategories.filter((cat: any) => {
          const catName = (cat.name || '').toLowerCase();
          return visibleGroups.some(vg => catName.includes(vg.toLowerCase()));
        });
        console.log(
          `📂 Catégories: ${beforeCategoriesCount} → ${xtreamCategories.length}`,
        );

        // Filtrer les chaînes - normaliser les noms pour correspondance
        const beforeChannelsCount = filteredChannels.length;

        // Normaliser les groupes visibles pour la comparaison
        const normalizedVisibleGroups = visibleGroups.map(vg =>
          vg
            .trim()
            .toLowerCase()
            .replace(/\s*\|\s*/g, '-')
            .replace(/\s+/g, ' '),
        );

        filteredChannels = filteredChannels.filter(ch => {
          const groupTitle = (
            (ch as any).groupTitle ||
            ch.group ||
            ch.category ||
            ''
          ).toLowerCase();
          // Normaliser aussi le groupTitle de la chaîne
          const normalizedGroupTitle = groupTitle
            .replace(/\s*-\s*/g, '-')
            .replace(/\s+/g, ' ');

          const match = normalizedVisibleGroups.some(vg => {
            // Comparaison flexible : soit égalité exacte, soit contient
            return (
              normalizedGroupTitle === vg ||
              normalizedGroupTitle.includes(vg) ||
              vg.includes(normalizedGroupTitle)
            );
          });
          return match;
        });
        console.log(
          `📂 Chaînes: ${beforeChannelsCount} → ${filteredChannels.length}`,
        );
      }

      // CORRECTION: Créer les catégories de base
      const categoriesWithCounts: Category[] = [];

      // 📂 TOUJOURS AFFICHER "TOUT" (même avec catégories bloquées)
      categoriesWithCounts.push({
        id: 'all',
        name: tChannels('all'),
        count: result.totalChannels || 0,
        channels: [],
      });

      // Catégories spéciales avec icônes modernes et vrais compteurs
      categoriesWithCounts.push(
        {
          id: 'favorites',
          name: tChannels('favorites'),
          count: favoriteIds.length, // Utiliser le nombre réel de favoris du profil
          channels: [], // Sera chargé depuis WatermelonDB
        },
        {
          id: 'history',
          name: tChannels('recent'),
          count: historyCount,
          channels: [], // Sera chargé depuis AsyncStorage
        },
      );

      // Ajouter TOUTES les vraies catégories Xtream (après filtrage)
      xtreamCategories.forEach((cat: any) => {
        // 🚫 FILTRAGE AUTOMATIQUE POUR PROFILS ENFANTS
        if (activeProfile?.isKids) {
          const categoryForCheck = {
            name: cat.name || '',
            category: cat.name || '',
            group: cat.name || ''
          };

          if (ParentalControlService.isAdultContent(categoryForCheck)) {
            console.log(`🚫 [ChannelsScreen] Catégorie adulte masquée pour profil enfant: "${cat.name}"`);
            return; // Ne pas ajouter aux catégories visibles
          }
        }

        categoriesWithCounts.push({
          id: cat.categoryId, // 🔧 CORRECTION: Utiliser SEULEMENT categoryId (Xtream ID)
          name: cat.name || 'Sans nom',
          count: cat.channelsCount || 0,
          channels: [], // Sera chargé dynamiquement
        });
      });

      // 🎯 NOUVEAU: Ajouter les catégories M3U (pour les playlists M3U)
      if (playlistType === 'M3U' && result.categories) {
        console.log(`📂 Ajout des catégories M3U: ${result.categories.length} catégories`);

        result.categories.forEach((cat: any) => {
          // 🚫 FILTRAGE AUTOMATIQUE POUR PROFILS ENFANTS
          if (activeProfile?.isKids) {
            const categoryForCheck = {
              name: cat.name || '',
              category: cat.name || '',
              group: cat.name || ''
            };

            if (ParentalControlService.isAdultContent(categoryForCheck)) {
              console.log(`🚫 [ChannelsScreen] Catégorie M3U adulte masquée pour profil enfant: "${cat.name}"`);
              return; // Ne pas ajouter aux catégories visibles
            }
          }

          categoriesWithCounts.push({
            id: cat.categoryId, // 🔧 UTILISER categoryId (ex: "shop")
            name: cat.name || 'Sans nom',
            count: cat.channelsCount || 0,
            channels: [], // Sera chargé dynamiquement via getChannelsByCategory
          });
        });
      }

      console.log(
        `⏱️ Categories Processing: ${Date.now() - categoriesStartTime}ms`,
      );
      console.log(
        `📂 Catégories finales: ${
          categoriesWithCounts.length
        } catégories (${categoriesWithCounts
          .slice(1, 6)
          .map(c => `${c.name}: ${c.count}`)
          .join(', ')}, ...)`,
      );

      const setStateStartTime = Date.now();

      // ✅ Le filtrage mode enfant + groupes visibles est maintenant appliqué

      // Initialiser les données (ne pas mettre dans channels pour éviter useEffect)
      setDisplayedChannels(filteredChannels);
      // setChannels(filteredChannels); // DÉSACTIVÉ pour WatermelonDB - évite le useEffect groupChannelsByCategories
      setPlaylistName(result.playlist.name || 'Playlist WatermelonDB');
      setTotalChannels(filteredChannels.length); // Utiliser le compte filtré
      setCategories(categoriesWithCounts);
      setSelectedCategory(categoriesWithCounts[0]); // Sélectionner "TOUT"
      setDisplayedChannels(filteredChannels);

      // 🚀 OPTIMISATION: Précharger les logos des 30 premières chaînes
      setTimeout(() => {
        const logosToPreload = filteredChannels
          .slice(0, 30) // Plus de logos au démarrage
          .filter(ch => ch.logo && ch.logo.trim())
          .map(ch => ({
            uri: ch.logo!,
            priority: FastImage.priority.high,
            cache: FastImage.cacheControl.immutable,
          }));

        if (logosToPreload.length > 0) {
          FastImage.preload(logosToPreload);
          console.log(`🚀 ${logosToPreload.length} logos préchargés`);
        }
      }, 100);

      // Configurer la pagination
      setCurrentPage(0);
      setHasMoreChannels(convertedChannels.length === CHANNELS_PER_PAGE);

      console.log(
        '✅ ChannelsScreen - WatermelonDB chargé:',
        categoriesWithCounts.length,
        'catégories,',
        filteredChannels.length,
        'chaînes',
      );

      // Arrêter l'écran de chargement
      setIsLoading(false);
    } catch (error) {
      console.error('❌ Erreur chargement WatermelonDB:', error);
      throw error;
    }
  }, [
    playlistId,
    playlistType,
    navigation,
    CHANNELS_PER_PAGE,
    loadProfileFavorites,
    loadFavoritesAndHistory,
    normalizeXtreamLogoUrl,
  ]);

  // 📦 FONCTION LEGACY: Chargement depuis l'ancien système (M3U)
  const loadChannelsFromLegacySystem = async () => {
    console.log('📦 Loading from Legacy System - playlistId:', playlistId);

    // Importer le service IPTV
    const IPTVService = (await import('../services/IPTVService')).default;
    const iptvService = IPTVService.getInstance();
    await iptvService.initialize();

    // Récupérer la playlist avec fallback
    let playlist = await iptvService.getPlaylist(playlistId);

    // 🔧 CHUNKING SUPPORT: Vérifier si playlist chunkée même si trouvée (OPTIMISÉ)
    if (
      playlist &&
      playlist.chunked &&
      playlist.chunkCount &&
      (!playlist.channels || playlist.channels.length === 0)
    ) {
      console.log(
        `📦 Playlist en mémoire chunkée détectée: ${playlist.chunkCount} chunks à reconstruire...`,
      );

      const AsyncStorage = (
        await import('@react-native-async-storage/async-storage')
      ).default;
      const reconstructedChannels: Channel[] = [];
      let successfulChunks = 0;

      // ⚡ OPTIMISATION: Chargement par batch de 3 chunks en parallèle
      const batchSize = 3;

      for (
        let batchStart = 0;
        batchStart < playlist.chunkCount;
        batchStart += batchSize
      ) {
        const batchEnd = Math.min(batchStart + batchSize, playlist.chunkCount);

        const batchPromisesArray = [];
        for (let i = batchStart; i < batchEnd; i++) {
          const chunkKey = `playlist_${playlistId}_chunk_${String(i).padStart(
            3,
            '0',
          )}`;
          batchPromisesArray.push(
            AsyncStorage.getItem(chunkKey).then(chunkData => ({
              index: i,
              data: chunkData,
            })),
          );
        }

        try {
          const batchResults = await Promise.all(batchPromisesArray);

          batchResults
            .sort((a, b) => a.index - b.index)
            .forEach(({index, data}) => {
              if (data) {
                try {
                  const chunk = JSON.parse(data);
                  if (Array.isArray(chunk)) {
                    reconstructedChannels.push(...chunk);
                    successfulChunks++;
                    if (index < 3) {
                      console.log(`✅ Chunk ${index}: ${chunk.length} chaînes`);
                    }
                  }
                } catch (parseError) {
                  console.warn(`⚠️ Erreur parsing chunk ${index}`);
                }
              }
            });

          const progress = Math.round((batchEnd / playlist.chunkCount) * 100);
          console.log(
            `🔄 Progression: ${progress}% (${successfulChunks} chunks traités)`,
          );
        } catch (batchError) {
          console.error(
            `❌ Erreur batch ${batchStart}-${batchEnd}:`,
            batchError instanceof Error ? batchError.message : String(batchError),
          );
        }
      }

      if (reconstructedChannels.length > 0) {
        playlist.channels = reconstructedChannels;
        playlist.totalChannels = reconstructedChannels.length;
        console.log(
          `✅ Reconstruction en mémoire réussie: ${reconstructedChannels.length} chaînes depuis ${successfulChunks}/${playlist.chunkCount} chunks`,
        );
      }
    }

    // Fallback si pas de playlist
    if (!playlist) {
      console.log('⚠️ Playlist non trouvée, tentative depuis AsyncStorage...');

      const AsyncStorage = (
        await import('@react-native-async-storage/async-storage')
      ).default;
      const playlistData = await AsyncStorage.getItem(`playlist_${playlistId}`);

      if (playlistData) {
        playlist = JSON.parse(playlistData);
        console.log('✅ Playlist récupérée depuis AsyncStorage');
      }
    }

    // Fallback supplémentaire: chercher dans les playlists Xtream
    if (!playlist) {
      console.log('🔍 Recherche dans les playlists Xtream sauvegardées...');

      const AsyncStorage = (
        await import('@react-native-async-storage/async-storage')
      ).default;
      const xtreamPlaylistsData = await AsyncStorage.getItem('saved_xtream_playlists');

      if (xtreamPlaylistsData) {
        try {
          const xtreamPlaylists = JSON.parse(xtreamPlaylistsData);
          console.log(`📋 ${xtreamPlaylists.length} playlists Xtream trouvées`);

          const xtreamPlaylist = xtreamPlaylists.find((p: any) => p.id === playlistId);
          if (xtreamPlaylist) {
            console.log(`✅ Playlist Xtream trouvée: ${xtreamPlaylist.name}`);

            // Créer une structure de playlist minimale
            playlist = {
              id: xtreamPlaylist.id,
              name: xtreamPlaylist.name,
              type: 'xtream',
              channels: [], // Sera rempli plus tard
              totalChannels: xtreamPlaylist.channelsCount || 0,
              metadata: {
                username: xtreamPlaylist.username,
                server: xtreamPlaylist.server,
                password: xtreamPlaylist.password
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };

            console.log('✅ Structure playlist Xtream créée');
          }
        } catch (error) {
          console.error('❌ Erreur parsing playlists Xtream:', error);
        }
      }
    }

    if (!playlist) {
      throw new Error('Playlist introuvable dans le service et le storage');
    }

    // 🔧 VALIDATION FINALE: Vérifier structure des chaînes
    if (!playlist.channels || !Array.isArray(playlist.channels)) {
      console.log(
        `⚠️ Structure channels invalide ou vide, type: ${typeof playlist.channels}`,
      );

      // Si c'est une playlist Xtream sans chaînes, initialiser avec un tableau vide
      if (playlist.type === 'xtream') {
        console.log('📡 Playlist Xtream sans chaînes - initialisation avec tableau vide');
        playlist.channels = [];
        playlist.totalChannels = 0;
      } else {
        throw new Error(
          'Playlist invalide: structure des chaînes manquante ou corrompue',
        );
      }
    }

    console.log(
      '📺 Legacy System - Chaînes chargées:',
      playlist.channels.length,
    );

    setChannels(playlist.channels as Channel[]);
    setPlaylistName(playlist.name || 'Playlist Legacy');

    console.log(
      '📺 ChannelsScreen - Legacy system channels loaded successfully',
    );
  };

  // 🔧 UNIFIED LOADING: Un seul useEffect unifié (Best Practice 2024)
  useEffect(() => {
    console.log('🔄 UNIFIED DATA LOADING - Mode: WatermelonDB (M3U ou Xtream)');

    // WatermelonDB géré par son propre chargement initial
    console.log(
      '📺 WatermelonDB: Chargement effectué dans loadChannelsFromWatermelonDB',
    );

    // 🧪 Test rapide de la recherche SQL (une seule fois au chargement)
    if (playlistId && channels.length > 0) {
      quickSearchTest(playlistId).then(result => {
        if (result.success) {
          console.log('🎉 [ChannelsScreen] Test recherche SQL OK:', result.message);
        } else {
          console.warn('⚠️ [ChannelsScreen] Test recherche SQL:', result.message);
        }
      });
    }
  }, [channels, playlistType, playlistId]);

  // 🔧 Fonction de normalisation pour comparer les noms de catégories (déclarée en premier)
  const normalizeCategoryNameForComparison = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s*\|\s*/g, '-')  // "AF | AFRICA" → "af-africa"
      .replace(/\s*-\s*/g, '-')   // "AF - AFRICA" → "af-africa"
      .replace(/\s+/g, '-');      // Espaces multiples → tiret
  };

  // 🔒 VÉRIFICATION DES CHAÎNES VERROUILLÉES - Calcul SYNCHRONE avec useMemo
  // 🚀 ULTRA-OPTIMISÉ : Évite le flash des cadenas car calculé avant le render (< 5ms)
  const lockedChannels = React.useMemo(() => {
    if (!activeProfile || displayedChannels.length === 0) {
      return new Set<string>();
    }

    try {
      const locked = new Set<string>();

      // 🔥 Pré-calculer les catégories bloquées normalisées (une seule fois)
      const normalizedBlockedSet = new Set(
        blockedCategories.map(normalizeCategoryNameForComparison)
      );

      for (const channel of displayedChannels) {
        // 🔑 Utiliser groupTitle en priorité (stocké en base), puis fallback
        const channelCategory = (channel as any).groupTitle || channel.group || channel.category || 'N/A';

        // ✅ CORRECTION: Ne plus vérifier isUnlocked() - le badge montre que la catégorie
        // EST bloquée (information permanente), pas qu'elle est ACTUELLEMENT verrouillée
        // Les chaînes restent accessibles après déverrouillage PIN, mais le badge reste
        // pour indiquer "🔒 Catégorie avec contrôle parental"

        // Vérifier si catégorie bloquée (lookup ultra-rapide avec Set)
        const normalizedChannelCategory = normalizeCategoryNameForComparison(channelCategory);
        if (normalizedBlockedSet.has(normalizedChannelCategory)) {
          locked.add(channel.id);
        }
      }

      return locked;
    } catch (error) {
      console.error('❌ Erreur vérification chaînes verrouillées:', error);
      return new Set<string>();
    }
  }, [activeProfile, displayedChannels, blockedCategories]);

  // 🆕 Logique pour reverrouiller quand l'utilisateur quitte la catégorie déverrouillée
  useEffect(() => {
    if (!currentUnlockedCategory || !selectedCategory) {
      console.log(`🔍 [RELOCK_CHECK] Skipped - currentUnlockedCategory: ${currentUnlockedCategory}, selectedCategory: ${selectedCategory?.name}`);
      return;
    }

    // 🌐 Cas spécial : Toutes les catégories déverrouillées depuis "TOUT"
    if (currentUnlockedCategory === 'ALL_CATEGORIES') {
      console.log(`🔍 [RELOCK_CHECK] ALL_CATEGORIES mode - Reverrouillage`);
      // Reverrouiller tout si on change de catégorie (y compris retour vers "TOUT")
      lockAll();
      return;
    }

    // 🌍 NOUVEAU : Ne pas reverrouiller si on est dans "TOUT" (vue globale)
    // "TOUT" affiche toutes les catégories, donc rester dans TOUT ne signifie pas quitter la catégorie déverrouillée
    if (selectedCategory.name === 'TOUT') {
      console.log(`🔍 [RELOCK_CHECK] Vue "TOUT" - Pas de reverrouillage (vue globale)`);
      return;
    }

    // 📂 Cas normal : Une catégorie spécifique déverrouillée
    // Reverrouiller seulement si on quitte cette catégorie (avec normalisation pour comparaison)
    const normalizedCurrentUnlocked = normalizeCategoryNameForComparison(currentUnlockedCategory);
    const normalizedSelected = normalizeCategoryNameForComparison(selectedCategory.name);

    console.log(`🔍 [RELOCK_CHECK] Comparaison:
      currentUnlockedCategory: "${currentUnlockedCategory}" → normalized: "${normalizedCurrentUnlocked}"
      selectedCategory: "${selectedCategory.name}" → normalized: "${normalizedSelected}"
      Match: ${normalizedSelected === normalizedCurrentUnlocked}`);

    if (normalizedSelected !== normalizedCurrentUnlocked) {
      console.log(`🔒 [RELOCK_CHECK] Catégories différentes - Reverrouillage`);
      // Remettre à zéro l'état de déverrouillage
      lockAll();
    } else {
      console.log(`✅ [RELOCK_CHECK] Catégories identiques - Pas de reverrouillage`);
    }
  }, [selectedCategory, currentUnlockedCategory, lockAll]);

  // 🔧 UNIFIED GROUPING: Fonction unifiée qui met à jour les MÊMES états que WatermelonDB
  const groupChannelsByCategories = () => {
    console.log('🔄 UNIFIED GROUPING - Legacy mode - Début regroupement');
    setIsLoading(true);

    try {
      console.log('🔄 Regroupement par catégories réelles...');
      console.log(
        `📊 Analyse de ${channels.length} chaînes pour extraction catégories`,
      );

      // Statistiques de catégories détaillées
      const categoryStats = new Map<
        string,
        {
          count: number;
          channels: Channel[];
          types: Set<string>;
        }
      >();

      // Analyser toutes les chaînes et extraire les vraies catégories
      channels.forEach((channel, index) => {
        // Extraire le nom de catégorie (group pour M3U, vraie catégorie pour Xtream)
        let categoryName = 'Non classé';

        // Essayer plusieurs propriétés pour la catégorie
        const categoryField =
          (channel as any).groupTitle ||
          channel.group ||
          (channel as any).category;

        if (categoryField && categoryField.trim() !== '') {
          categoryName = categoryField.trim();
        }

        // Nettoyer et normaliser le nom de catégorie
        categoryName = normalizeCategoryName(categoryName);

        // Debug pour les premières chaînes
        if (index < 10) {
          console.log(
            `🔍 Channel ${index}: "${channel.name}" -> catégorie: "${categoryName}"`,
          );
          console.log('   Props:', {
            group: channel.group,
            category: (channel as any).category,
            groupTitle: (channel as any).groupTitle,
          });
        }

        // Initialiser ou mettre à jour les stats de catégorie
        if (!categoryStats.has(categoryName)) {
          categoryStats.set(categoryName, {
            count: 0,
            channels: [],
            types: new Set(),
          });
        }

        const stats = categoryStats.get(categoryName)!;
        stats.count++;
        stats.channels.push(channel);
        stats.types.add(channel.type || 'unknown');
      });

      console.log(`📂 ${categoryStats.size} catégories uniques trouvées`);

      // Créer la liste des catégories avec compteurs et tri intelligent
      const categoriesList: Category[] = [];

      // Pour le legacy system, on suppose qu'il n'y a pas de catégories bloquées
      // (le filtrage est déjà fait en amont)
      const hasBlockedCategories = false;

      // Ajouter "TOUT" seulement si aucune catégorie bloquée
      if (!hasBlockedCategories) {
        categoriesList.push({
          id: 'all',
          name: tChannels('all'),
          count: channels.length,
          channels: channels,
        });
      } else {
        console.log(
          `📂 "TOUT" masqué car catégories bloquées actives`,
        );
      }

      // NOUVEAU : Catégories spéciales pour système legacy avec icônes modernes
      categoriesList.push({
        id: 'favorites',
        name: `💙 ${tChannels('favorites')}`,
        count: 0, // TODO: Compter favoris depuis AsyncStorage
        channels: [], // Sera chargé depuis AsyncStorage
      });

      categoriesList.push({
        id: 'history',
        name: `📺 ${tChannels('recent')}`,
        count: 0, // TODO: Compter historique depuis AsyncStorage
        channels: [], // Sera chargé depuis AsyncStorage
      });

      // Convertir Map en array et trier par popularité puis alphabétiquement
      const sortedCategories = Array.from(categoryStats.entries()).sort(
        ([nameA, statsA], [nameB, statsB]) => {
          // D'abord par nombre de chaînes (desc), puis alphabétiquement
          if (statsB.count !== statsA.count) {
            return statsB.count - statsA.count;
          }
          return nameA.localeCompare(nameB);
        },
      );

      // Ajouter les vraies catégories triées avec IDs uniques
      const usedIds = new Set(['all']); // Tracker des IDs déjà utilisés
      sortedCategories.forEach(([categoryName, stats], index) => {
        let categoryId = categoryName
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '') // Supprimer caractères spéciaux
          .replace(/\s+/g, '_') // Remplacer espaces par underscores
          .substring(0, 40); // Réduire à 40 pour laisser place au suffix

        // Assurer l'unicité en ajoutant un index si nécessaire
        if (usedIds.has(categoryId)) {
          categoryId = `${categoryId}_${index}`;
        }
        usedIds.add(categoryId);

        categoriesList.push({
          id: categoryId,
          name: categoryName,
          count: stats.count,
          channels: stats.channels,
        });

        // Log des catégories populaires
        if (stats.count >= 10) {
          console.log(
            `📺 ${categoryName}: ${stats.count} chaînes (types: ${Array.from(
              stats.types,
            ).join(', ')})`,
          );
        }
      });

      // 🔧 UNIFIED STATE UPDATE: Même logique que WatermelonDB
      setCategories(categoriesList);
      setSelectedCategory(categoriesList[0]); // Sélectionner "TOUT" par défaut
      setDisplayedChannels(categoriesList[0]?.channels || []); // 🔧 NOUVEAU: Assurer cohérence displayedChannels

      // 🔧 CORRECTION: Configurer la pagination comme WatermelonDB
      setCurrentPage(0);
      setHasMoreChannels(false); // Legacy charge tout d'un coup

      console.log('✅ UNIFIED Legacy State Update:', {
        categories: categoriesList.length,
        selectedCategory: categoriesList[0]?.name,
        displayedChannels: categoriesList[0]?.channels?.length || 0,
      });

      console.log('🏆 Top 5 catégories Legacy:');
      categoriesList.slice(1, 6).forEach(cat => {
        console.log(`   ${cat.name}: ${cat.count} chaînes`);
      });
    } catch (error) {
      console.error('❌ Erreur regroupement catégories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  // Fonction pour ouvrir la recherche moderne SQL native
  const openSearchScreen = async () => {
    // Déterminer si c'est une recherche globale ou dans une catégorie
    const isGlobalSearch = !selectedCategory ||
                          selectedCategory.name === 'TOUT' ||
                          selectedCategory.id === 'all' ||
                          selectedCategory.name.toLowerCase().includes('tout');

    // 🔑 Récupérer le vrai group_title depuis une chaîne de la catégorie
    let realGroupTitle: string | undefined;
    if (!isGlobalSearch && selectedCategory?.channels && selectedCategory.channels.length > 0) {
      const firstChannel = selectedCategory.channels[0];
      realGroupTitle = (firstChannel as any).groupTitle || firstChannel.group || firstChannel.category;
    }

    // 🔒 Filtrer les catégories actuellement verrouillées (exclure les déverrouillées)
    const currentlyLockedCategories = blockedCategories.filter(cat => !isUnlocked(cat));

    // Navigation vers l'écran de recherche final avec design moderne
    navigation.navigate('FinalSearch', {
      playlistId: playlistId!,
      initialCategory: selectedCategory?.id || 'all',
      categoryName: isGlobalSearch
        ? undefined
        : normalizeCategoryName(selectedCategory?.name || ''), // 🔧 CORRECTION: Normaliser le nom
      categoryGroupTitle: realGroupTitle, // 🔑 Vrai group_title pour filtrage SQL
      playlistName: playlistName || tChannels('search'),
      playlistType: playlistType || 'M3U',
      blockedCategories: currentlyLockedCategories, // 🔒 Seulement les catégories encore verrouillées
    });
  };

  // ⭐ Handler pour l'appui long - Gestion des favoris
  const handleChannelLongPress = async (channel: Channel) => {
    try {
      if (!activeProfileId) {
        console.log('❌ Aucun profil actif');
        Alert.alert(tCommon('error'), tProfiles('noActiveProfile'));
        return;
      }

      // Ouvrir le modal personnalisé
      setSelectedChannelForFavorite(channel);
      setFavoriteModalVisible(true);
    } catch (error) {
      console.error('❌ Erreur appui long favori:', error);
    }
  };

  // Handler pour confirmer l'action favori depuis le modal
  const handleConfirmFavorite = async () => {
    try {
      if (!selectedChannelForFavorite || !activeProfileId) {
        return;
      }

      // ⭐ RESTAURÉ: Utiliser FavoritesService pour gérer les favoris par profil
      const newIsFavorite = await FavoritesService.toggleFavorite(
        selectedChannelForFavorite,
        playlistId,
        activeProfileId,
      );

      // ✅ PAS de synchronisation WatermelonDB - les données sont stockées dans FavoritesService

      // Mettre à jour l'état local des favoris
      const updatedFavorites = newIsFavorite
        ? [...favorites, selectedChannelForFavorite.id]
        : favorites.filter(id => id !== selectedChannelForFavorite.id);

      setFavorites(updatedFavorites);

      // 🔑 Recharger le vrai compte depuis FavoritesService (filtre par playlist)
      const realFavoritesCount = await FavoritesService.getFavoriteChannelsByProfile(
        activeProfileId,
        playlistId,
      );
      const newCount = realFavoritesCount.length;

      console.log(
        `📊 [handleFavoriteConfirm] Mise à jour compteur FAVORIS: ${newCount} favoris pour cette playlist`,
      );

      // Mettre à jour le compteur de la catégorie FAVORIS
      setCategories(prevCategories =>
        prevCategories.map(cat => {
          if (cat.id === 'favorites') {
            return {...cat, count: newCount};
          }
          return cat;
        }),
      );

      // 🔑 AUSSI mettre à jour selectedCategory si c'est FAVORIS (pour le header)
      setSelectedCategory(prevSelected => {
        if (prevSelected && prevSelected.id === 'favorites') {
          console.log(
            `📊 [handleFavoriteConfirm] Mise à jour selectedCategory FAVORIS pour header: ${prevSelected.count} → ${newCount}`,
          );
          return {...prevSelected, count: newCount};
        }
        return prevSelected;
      });

      // Si on est dans la catégorie FAVORIS, recharger la liste
      if (selectedCategory?.id === 'favorites') {
        await handleCategorySelect(selectedCategory);
      }

      console.log(
        `⭐ Favori ${newIsFavorite ? 'ajouté' : 'retiré'} pour chaîne:`,
        selectedChannelForFavorite.name,
        `(Total: ${updatedFavorites.length})`,
      );

      // Fermer le modal
      setFavoriteModalVisible(false);
      setSelectedChannelForFavorite(null);
    } catch (error) {
      console.error('❌ Erreur toggle favori:', error);
      Alert.alert(tCommon('error'), tProfiles('cannotModifyFavorites'));
      setFavoriteModalVisible(false);
      setSelectedChannelForFavorite(null);
    }
  };

  const handleChannelPress = async (channel: Channel) => {
    console.log('🛡️ RACE CONDITION FIX - GitHub/Reddit Solutions');

    // ✅ PIN catégorie déjà vérifié - Lecture directe autorisée

    // 🚀 WINDOW LOADING OPTIMIZATION
    // Si catégorie "TOUT" avec beaucoup de chaînes, charger une fenêtre centrée sur la chaîne
    const isAllCategory = selectedCategory?.id === 'all';
    const hasManyChannels = totalChannels > 1000;

    if (isAllCategory && hasManyChannels) {
      console.log(`🎯 [Window Loading] Chargement window pour chaîne: ${channel.name} (total: ${totalChannels})`);

      try {
        // 1. Trouver l'index de la chaîne dans la BD
        const WatermelonService =
          playlistType === 'XTREAM'
            ? (await import('../services/WatermelonXtreamService')).default
            : (await import('../services/WatermelonM3UService')).default;

        const channelIndex = await WatermelonService.findChannelIndex(
          playlistId,
          channel.id,
          selectedCategory?.id,
        );

        console.log(`✅ [Window Loading] Chaîne trouvée à l'index: ${channelIndex}/${totalChannels}`);

        // 2. Calculer window centrée (500 chaînes autour de la chaîne cible)
        const WINDOW_SIZE = 1000; // Charger 1000 chaînes pour avoir 500 avant et 500 après
        const halfWindow = Math.floor(WINDOW_SIZE / 2);
        const offset = Math.max(0, channelIndex - halfWindow);
        const localIndex = channelIndex - offset; // Position de la chaîne dans la fenêtre

        console.log(`📊 [Window Loading] offset: ${offset}, localIndex: ${localIndex}, windowSize: ${WINDOW_SIZE}`);

        // 3. Charger la fenêtre de chaînes
        const activeProfile = await ProfileService.getActiveProfile();
        const profileBlockedCategories =
          activeProfile && blockedCategories.length > 0 ? blockedCategories : undefined;

        const result = await WatermelonService.getPlaylistWithChannels(
          playlistId,
          WINDOW_SIZE,
          offset,
          profileBlockedCategories,
        );

        // 4. Mapper les chaînes
        const windowChannels = (result.channels || []).map((ch: any) => {
          const rawLogo = ch.logoUrl || ch.streamIcon || ch.logo || '';
          const normalizedLogo =
            playlistType === 'XTREAM'
              ? normalizeXtreamLogoUrl(rawLogo, serverUrl)
              : rawLogo;

          return {
            id: ch.id,
            name: ch.name || 'Sans nom',
            logo: normalizedLogo,
            group: ch.groupTitle || ch.categoryName || ch.group || 'Non classé',
            url: ch.streamUrl || ch.url || '',
            type: playlistType as 'M3U' | 'XTREAM',
          };
        });

        console.log(`✅ [Window Loading] ${windowChannels.length} chaînes chargées, navigation...`);

        // 5. Créer catégorie spéciale pour la fenêtre
        const windowCategory: Category = {
          id: 'window_loaded',
          name: `${selectedCategory?.name} (Window)`,
          count: totalChannels, // Le vrai total
          channels: windowChannels,
        };

        // 6. Naviguer avec les données de la fenêtre
        InteractionManager.runAfterInteractions(() => {
          navigation.navigate('ChannelPlayer', {
            playlistId,
            allCategories: categories || [windowCategory],
            initialCategory: windowCategory,
            initialChannels: windowChannels,
            selectedChannel: channel,
            playlistName,
            playlistType: playlistType || 'M3U',
            // Nouveaux paramètres pour window loading
            windowOffset: offset,
            targetChannelIndex: channelIndex,
            targetChannelLocalIndex: localIndex,
            totalChannelsInPlaylist: totalChannels,
          });

          console.log(`🚀 [Window Loading] Navigation complétée avec index local: ${localIndex}`);
        });

        return; // Exit early, on utilise le window loading
      } catch (error) {
        console.error('❌ [Window Loading] Erreur, fallback vers méthode normale:', error);
        // Continuer avec la méthode normale en cas d'erreur
      }
    }

    // ⚡ SOLUTION 1: useRef pour éviter stale state (GitHub Issue #194)
    const currentState = currentStateRef.current;

    // 🎯 CAS SPÉCIAL: Si PiP visible, passer directement en fullscreen au lieu de naviguer
    const {isVisible: pipVisible, actions} = usePlayerStore.getState();
    if (pipVisible) {
      console.log(
        '🔄 [PiP → Fullscreen] PiP détecté, transition directe vers fullscreen',
      );

      // 🔧 Préparer navigation vers ChannelPlayerScreen pour le retour depuis fullscreen
      if (!currentState) {
        console.warn(
          '⚠️ [PiP → Fullscreen] currentState est undefined, utilisation des états directs',
        );
        // Fallback: utiliser les états React directs au lieu de currentStateRef
        const fallbackChannels = displayedChannels;
        const fallbackCategories = categories;
        const fallbackSelected = selectedCategory;

        if (fallbackChannels && fallbackChannels.length > 0) {
          const unifiedCategory: Category = {
            id: 'pip_to_fullscreen_fallback',
            name: fallbackSelected?.name || 'CHAÎNES PiP',
            count: fallbackChannels.length,
            channels: fallbackChannels,
          };

          console.log(
            '📍 [ChannelsScreen] Storing navigation data (fallback path):',
            {
              playlistId,
              playlistName,
              channelCount: fallbackChannels.length,
              categoryName: (fallbackSelected || unifiedCategory).name,
            },
          );

          actions.setNavigationData({
            playlistId,
            allCategories: fallbackCategories || [unifiedCategory],
            initialCategory: fallbackSelected || unifiedCategory,
            initialChannels: fallbackChannels,
            playlistName,
            playlistType: playlistType || 'M3U',
            useWatermelonDB: playlistType === 'XTREAM' || playlistType === 'M3U',
          });

          console.log(
            `📍 [Navigation Data Fallback] Préparé pour retour vers ChannelPlayerScreen avec ${fallbackChannels.length} chaînes`,
          );
        }
      } else {
        const {
          displayedChannels: safeChannels,
          categories: safeCategories,
          selectedCategory: safeSelected,
        } = currentState;

        if (safeChannels && safeChannels.length > 0) {
          const unifiedCategory: Category = {
            id: 'pip_to_fullscreen_category',
            name: safeSelected?.name || 'CHAÎNES PiP',
            count: safeChannels.length,
            channels: safeChannels,
          };

          // Stocker les données pour ChannelPlayerScreen dans le PlayerStore
          console.log(
            '📍 [ChannelsScreen] Storing navigation data (normal path):',
            {
              playlistId,
              playlistName,
              channelCount: safeChannels.length,
              categoryName: (safeSelected || unifiedCategory).name,
            },
          );

          actions.setNavigationData({
            playlistId,
            allCategories: safeCategories || [unifiedCategory],
            initialCategory: safeSelected || unifiedCategory,
            initialChannels: safeChannels,
            playlistName,
            playlistType: playlistType || 'M3U',
            useWatermelonDB: playlistType === 'XTREAM' || playlistType === 'M3U',
          });

          console.log(
            `📍 [Navigation Data] Préparé pour retour vers ChannelPlayerScreen avec ${safeChannels.length} chaînes`,
          );
        }
      }

      // 🕰️ AJOUTER À L'HISTORIQUE RÉCENT avant de lancer la chaîne
      try {
        // 👤 Récupérer le profil actif
        const activeProfile = await ProfileService.getActiveProfile();
        if (!activeProfile) {
          console.log('⚠️ [ChannelsScreen] Aucun profil actif, impossible d\'ajouter aux récents');
        } else {
          // 🆕 Utiliser le nouveau RecentChannelsService
          const RecentChannelsService = (
            await import('../services/RecentChannelsService')
          ).default;

          await RecentChannelsService.addRecent(
            channel,
            playlistId,
            activeProfile.id,
          );

          // Mettre à jour le store partagé pour synchronisation
          const updatedRecents = await RecentChannelsService.getRecentsByProfile(
            activeProfile.id,
            playlistId,
          );

          const {setRecentChannels} = (
            await import('../stores/RecentChannelsStore')
          ).useRecentChannelsStore.getState();
          setRecentChannels(updatedRecents, activeProfile.id);
        }
      } catch (error) {
        console.error('❌ [Historique] Erreur ajout aux récents:', error);
      }

      // Jouer la nouvelle chaîne en fullscreen directement
      actions.playChannel(channel, true); // true = startInFullscreen
      console.log(
        `✅ [PiP → Fullscreen] Chaîne "${channel.name}" lancée en fullscreen`,
      );
      return; // Exit early, pas de navigation vers ChannelPlayer
    }

    console.log('📊 REF STATE:', {
      channels: currentState.channels?.length || 0,
      displayedChannels: currentState.displayedChannels?.length || 0,
      categories: currentState.categories?.length || 0,
      selectedCategory: currentState.selectedCategory?.name || 'null',
    });

    // ⚡ SOLUTION 2: InteractionManager pour délayer navigation (Issue #1266)
    const performNavigation = () => {
      const {
        displayedChannels: safeChannels,
        categories: safeCategories,
        selectedCategory: safeSelected,
      } = currentState;

      if (!safeChannels || safeChannels.length === 0) {
        console.error('❌ REF: Aucune chaîne dans useRef');
        Alert.alert(
          'Race Condition',
          'États non synchronisés. Réessayez dans un instant.',
        );
        return;
      }

      const unifiedCategory: Category = {
        id: 'ref_safe_channels',
        name: 'CHAÎNES (REF SAFE)',
        count: safeChannels.length,
        channels: safeChannels,
      };

      console.log(
        `🎬 REF NAVIGATION: ${safeChannels.length} chaînes sécurisées (useRef)`,
      );

      navigation.navigate('ChannelPlayer', {
        playlistId,
        allCategories: safeCategories || [unifiedCategory],
        initialCategory: safeSelected || unifiedCategory,
        initialChannels: safeChannels,
        selectedChannel: channel,
        playlistName,
        playlistType: playlistType || 'M3U',
      });
    };

    // ⚡ SOLUTION 3: InteractionManager.runAfterInteractions (React Router Flux Fix)
    InteractionManager.runAfterInteractions(() => {
      console.log('🚀 Navigation après interactions complétées');
      performNavigation();
    });
  };


  const handleCategorySelect = async (category: Category, skipPinCheck: boolean = false) => {
    console.log(
      `📂 Catégorie sélectionnée: ${category.name} (${category.count} chaînes)`,
    );

    // 🔒 Vérifier si la catégorie est bloquée (sauf si skipPinCheck = true)
    if (!skipPinCheck) {
      // 🆕 Vérifier d'abord si la catégorie est déjà déverrouillée (utilise le store global)
      if (!isUnlocked(category.name)) {
        const normalizedCategoryName = normalizeCategoryNameForComparison(category.name);

        // Vérifier les catégories explicitement bloquées (avec normalisation)
        const matchedBlockedCategory = blockedCategories.find(blocked =>
          normalizeCategoryNameForComparison(blocked) === normalizedCategoryName
        );

        if (matchedBlockedCategory) {
          setSelectedBlockedCategory(category);
          setPinModalVisible(true);
          return;
        }
      }
    }

    // Déclencher l'animation de transition
    animateCategoryTransition();

    setSelectedCategory(category);
    setCurrentPage(0);
    setHasMoreChannels(false); // Désactiver le "+" immédiatement pour éviter le flash

    try {
      // 🚀 Utiliser le bon service WatermelonDB (M3U ou Xtream)
      const WatermelonService =
        playlistType === 'XTREAM'
          ? (await import('../services/WatermelonXtreamService')).default
          : (await import('../services/WatermelonM3UService')).default;

      // 🔒 MODE ENFANT + 📂 GROUPES VISIBLES: Récupérer les filtres du profil
      const activeProfile = await ProfileService.getActiveProfile();

      // ✅ LOGIQUE FILTRAGE CATÉGORIES BLOQUÉES:
      // - Pour "Tout" (all): Filtrer les catégories bloquées
      // - Pour catégories spécifiques: Ne PAS filtrer (accès déjà contrôlé par PIN modal)
      const isToutCategory = category.id === 'all';
      const profileBlockedCategories = isToutCategory && blockedCategories.length > 0
        ? blockedCategories
        : undefined;

      const visibleGroups =
        activeProfile?.visibleGroups && activeProfile.visibleGroups.length > 0
          ? activeProfile.visibleGroups
          : undefined;

      let result;

      // 🎯 CAS SPÉCIAL: FAVORIS - charger depuis FavoritesService (par profil)
      if (category.id === 'favorites') {
        if (!activeProfileId) {
          console.log('❌ Aucun profil actif pour les favoris');
          result = {channels: [], playlist: null};
        } else {
          // ✅ Charger directement depuis FavoritesService (même logique que les récents)
          let favoriteChannels = await FavoritesService.getFavoriteChannelsByProfile(
            activeProfileId,
            playlistId,
          );

          // 🔒 FILTRER les chaînes des catégories bloquées
          if (blockedCategories.length > 0) {
            const beforeCount = favoriteChannels.length;
            favoriteChannels = favoriteChannels.filter((ch: any) => {
              const groupTitle = ((ch as any).groupTitle || ch.group || ch.category || '').toLowerCase();
              return !blockedCategories.some(blocked =>
                groupTitle.includes(blocked.toLowerCase())
              );
            });
            console.log(
              `🔒 Favoris filtrés: ${beforeCount} → ${favoriteChannels.length} chaînes`,
            );
          }

          console.log(
            `⭐ ${favoriteChannels.length} chaînes favorites chargées pour profil ${activeProfile?.name}`,
          );

          result = {channels: favoriteChannels, playlist: null};
        }
      }
      // 🎯 CAS SPÉCIAL: RÉCENTS - charger depuis RecentChannelsStore
      else if (category.id === 'history' || category.id.includes('recent')) {
        // Toujours recharger depuis le service pour garantir les bonnes données
        const RecentChannelsService = (await import('../services/RecentChannelsService')).default;
        const activeProfile = await ProfileService.getActiveProfile();

        if (!activeProfile) {
          console.log('⚠️ Aucun profil actif pour les récents');
          result = {channels: [], playlist: null};
        } else {
          let recentChannelsData = await RecentChannelsService.getRecentsByProfile(
            activeProfile.id,
            playlistId,
          );

          // 🔒 FILTRER les chaînes des catégories bloquées
          if (blockedCategories.length > 0) {
            const beforeCount = recentChannelsData.length;
            recentChannelsData = recentChannelsData.filter((ch: any) => {
              const groupTitle = ((ch as any).groupTitle || ch.group || ch.category || '').toLowerCase();
              return !blockedCategories.some(blocked =>
                groupTitle.includes(blocked.toLowerCase())
              );
            });
            console.log(
              `🔒 Récents filtrés: ${beforeCount} → ${recentChannelsData.length} chaînes`,
            );
          }

          console.log(
            `📺 ${recentChannelsData.length} chaînes récentes chargées pour profil ${activeProfile.name}`,
          );

          // Mettre à jour le store pour la cohérence
          const {setRecentChannels} = useRecentChannelsStore.getState();
          setRecentChannels(recentChannelsData, activeProfile.id);

          result = {channels: recentChannelsData, playlist: null};
        }
      }
      // Charger toutes les chaînes
      else if (category.id === 'all') {
        result = await WatermelonService.getPlaylistWithChannels(
          playlistId,
          CHANNELS_PER_PAGE,
          0,
          profileBlockedCategories, // 🔒 Filtrage SQL catégories bloquées (seulement pour "Tout")
        );
      }
      // Charger par catégorie spécifique
      else {
        const categoryChannels = await WatermelonService.getChannelsByCategory(
          playlistId,
          category.id, // ✅ FIX: Utiliser category.id (contient le categoryId Xtream comme "1")
          CHANNELS_PER_PAGE,
          0,
          undefined, // ✅ Pas de filtrage - l'accès est déjà contrôlé par PIN modal
        );
        result = {channels: categoryChannels, playlist: null};
      }

      // Toujours traiter les chaînes, même si le tableau est vide
      let validChannels = (result.channels || []).filter(
        (ch: any) => ch && ch.id,
      );

      // 📂 FILTRAGE GROUPES VISIBLES: Appliquer en JavaScript
      // ⚠️ IMPORTANT: Ne pas filtrer TOUT, FAVORIS, RÉCENTS
      if (
        visibleGroups &&
        visibleGroups.length > 0 &&
        category.id !== 'all' &&
        category.id !== 'favorites' &&
        category.id !== 'history'
      ) {
        const beforeCount = validChannels.length;

        // Normaliser les groupes visibles pour la comparaison
        const normalizedVisibleGroups = visibleGroups.map(vg =>
          vg
            .trim()
            .toLowerCase()
            .replace(/\s*\|\s*/g, '-')
            .replace(/\s+/g, ' '),
        );

        
        validChannels = validChannels.filter((ch: any) => {
          const groupTitle = (
            (ch as any).groupTitle ||
            ch.group ||
            ch.category ||
            ''
          ).toLowerCase();
          // Normaliser aussi le groupTitle de la chaîne
          const normalizedGroupTitle = groupTitle
            .replace(/\s*-\s*/g, '-')
            .replace(/\s+/g, ' ');

          const match = normalizedVisibleGroups.some(vg => {
            // Comparaison flexible : soit égalité exacte, soit contient
            return (
              normalizedGroupTitle === vg ||
              normalizedGroupTitle.includes(vg) ||
              vg.includes(normalizedGroupTitle)
            );
          });
          return match;
        });
        console.log(
          `📂 Filtrage groupes visibles "${category.name}": ${beforeCount} → ${validChannels.length} chaînes`,
        );

        // 🔧 CORRECTION: Si le filtrage bloque tout, désactiver temporairement le filtrage
        if (validChannels.length === 0 && beforeCount > 0) {
          console.warn(`⚠️ ATTENTION: Le filtrage groupes visibles a bloqué TOUTES les chaînes de "${category.name}"! Désactivation temporaire...`);
          validChannels = (result.channels || []).filter((ch: any) => ch && ch.id);
        }
      }

      const newChannels = validChannels.map((channel: any) => {
        const rawLogo =
          channel.logoUrl || channel.streamIcon || channel.logo || '';
        const normalizedLogo =
          playlistType === 'XTREAM'
            ? normalizeXtreamLogoUrl(rawLogo, serverUrl)
            : rawLogo;

        return {
          id: channel.id,
          name: channel.name || 'Sans nom',
          logo: normalizedLogo,
          group:
            channel.groupTitle ||
            channel.categoryName ||
            channel.group ||
            'Non classé',
          url: channel.streamUrl || channel.url || '',
          type: playlistType as 'M3U' | 'XTREAM',
        };
      });

      // 🔧 CORRECTION: Mettre à jour displayedChannels même si vide
      setDisplayedChannels(newChannels);
      setHasMoreChannels(newChannels.length === CHANNELS_PER_PAGE);

      if (newChannels.length > 0) {
        // 🚀 OPTIMISATION: Précharger les logos des 20 premières chaînes
        setTimeout(() => {
          const logosToPreload = newChannels
            .slice(0, 20) // Premiers logos visibles
            .filter(ch => ch.logo && ch.logo.trim())
            .map(ch => ({
              uri: ch.logo!,
              priority: FastImage.priority.high,
              cache: FastImage.cacheControl.immutable,
            }));

          if (logosToPreload.length > 0) {
            FastImage.preload(logosToPreload);
          }
        }, 50);
      }

      // Scroll vers le haut
      setTimeout(() => {
        flashListRef.current?.scrollToOffset({offset: 0, animated: true});
      }, 100);

      console.log(
        `✅ "${category.name}" chargée: ${newChannels.length} chaînes affichées`,
      );
    } catch (error) {
      console.error('❌ Erreur chargement catégorie:', error);
    }
  };

  // 🔒 Fonction de gestion du PIN parental (fermeture)
  const handlePinCancel = () => {
    setPinModalVisible(false);
    setSelectedBlockedCategory(null);
  };

  /**
   * 🔒 Fonction de déverrouillage réussi pour les catégories (avec PIN vérifié)
   * 🆕 NOUVELLE LOGIQUE: Déverrouillage sans limite de temps jusqu'au changement de catégorie
   */
  const handleCategoryUnlockSuccess = async (verifiedPin: string) => {
    if (!selectedBlockedCategory || !activeProfile) return;

    try {
      // 🆕 Utiliser le store global pour déverrouiller la catégorie
      unlockCategory(selectedBlockedCategory.name);

      // Fermer le modal
      setPinModalVisible(false);

      // Débloquer et charger la catégorie (skipPinCheck = true pour éviter de redemander le PIN)
      handleCategorySelect(selectedBlockedCategory, true);
      setSelectedBlockedCategory(null);

    } catch (error) {
      console.error('❌ Erreur déverrouillage catégorie:', error);
      Alert.alert('Erreur', 'Impossible de déverrouiller la catégorie');
    }
  };

  // Charger une page de chaînes
  const loadChannelsPage = (channels: Channel[], page: number) => {
    const startIndex = 0;
    const endIndex = page * CHANNELS_PER_PAGE;
    const newChannels = channels.slice(startIndex, endIndex);

    console.log('🔍 LoadChannelsPage DEBUG:');
    console.log(
      '  - channels input:',
      Array.isArray(channels),
      channels?.length,
    );
    console.log(
      '  - newChannels output:',
      Array.isArray(newChannels),
      newChannels?.length,
    );
    console.log(
      '  - sample newChannels:',
      newChannels?.slice(0, 2)?.map(ch => ({name: ch?.name, id: ch?.id})),
    );

    setDisplayedChannels(newChannels);
  };

  // 🔧 PAGINATION ULTRA-RAPIDE : Chargement en arrière-plan NON-BLOQUANT
  const loadMoreChannels = () => {
    console.log('🔄 onEndReached déclenché - loadMoreChannels appelé avec:', {
      hasMoreChannels,
      isLoadingMore,
      playlistType,
      selectedCategory: selectedCategory?.name,
      currentPage,
      displayedCount: displayedChannels.length,
      categoryId: selectedCategory?.id,
    });

    if (!hasMoreChannels || isLoadingMore || !selectedCategory) {
      console.log('⛔ Conditions non remplies pour loadMoreChannels:', {
        hasMoreChannels,
        isLoadingMore,
        playlistType,
        hasSelectedCategory: !!selectedCategory,
      });
      return;
    }

    // 🚀 WATERMELONDB - Chargement en background pour scroll fluide
    setIsLoadingMore(true);
    console.log('🍉 WatermelonDB - Démarrage chargement page suivante (background)...');

    // ✅ InteractionManager = Chargement après toutes les interactions pour scroll ULTRA-fluide
    InteractionManager.runAfterInteractions(async () => {
      try {
      // 🚀 Utiliser le bon service WatermelonDB (M3U ou Xtream)
      const WatermelonService =
        playlistType === 'XTREAM'
          ? (await import('../services/WatermelonXtreamService')).default
          : (await import('../services/WatermelonM3UService')).default;

      // 🔒 Récupérer les catégories bloquées
      const activeProfile = await ProfileService.getActiveProfile();
      const profileBlockedCategories =
        activeProfile?.blockedCategories && activeProfile.blockedCategories.length > 0
          ? activeProfile.blockedCategories
          : undefined;

      const nextPage = currentPage + 1;
      const offset = nextPage * CHANNELS_PER_PAGE;

      console.log(
        `📄 Chargement page ${nextPage} pour "${selectedCategory.name}" (offset: ${offset})`,
      );

      let result;

      // 🎯 CAS SPÉCIAL: FAVORIS (pas de pagination, chargés depuis FavoritesService)
      if (selectedCategory.id === 'favorites') {
        console.log('ℹ️ [loadMoreChannels] FAVORIS ne supporte pas la pagination');
        return;
      }
      // 🎯 CAS SPÉCIAL: RÉCENTS (pas de pagination, limité à 20)
      else if (
        selectedCategory.id === 'history' ||
        selectedCategory.id.includes('recent')
      ) {
        // Récents n'ont pas de pagination - retourner immédiatement sans charger
        console.log(
          'ℹ️ [loadMoreChannels] RÉCENTS ne supporte pas la pagination',
        );
        return;
      }
      // Toutes les chaînes
      else if (selectedCategory.id === 'all') {
        result = await WatermelonService.getPlaylistWithChannels(
          playlistId,
          CHANNELS_PER_PAGE,
          offset,
          undefined, // 🔒 Pas de filtrage SQL (toutes les catégories visibles)
        );
      }
      // Par catégorie
      else {
        const categoryChannels = await WatermelonService.getChannelsByCategory(
          playlistId,
          selectedCategory.name, // ✅ FIX: Utiliser name (original "Afghanistan") au lieu de id ("afghanistan")
          CHANNELS_PER_PAGE,
          offset,
          undefined, // 🔒 Pas de filtrage SQL (toutes les catégories visibles)
        );
        result = {channels: categoryChannels, playlist: null};
      }

      if (result.channels && result.channels.length > 0) {
        // Filtrer les chaînes invalides avant le map
        const validChannels = result.channels.filter((ch: any) => ch && ch.id);

        // Note: Plus besoin de filtrer "TOUT" car il est masqué quand groupes visibles actifs

        const newChannels = validChannels.map((channel: any) => {
          const rawLogo =
            channel.logoUrl || channel.streamIcon || channel.logo || '';
          const normalizedLogo =
            playlistType === 'XTREAM'
              ? normalizeXtreamLogoUrl(rawLogo, serverUrl)
              : rawLogo;

          return {
            id: channel.id,
            name: channel.name || 'Sans nom',
            logo: normalizedLogo,
            group:
              channel.groupTitle ||
              channel.categoryName ||
              channel.group ||
              'Non classé',
            url: channel.streamUrl || channel.url || '',
            type: playlistType as 'M3U' | 'XTREAM',
          };
        });

        // Ajouter sans doublons
        setDisplayedChannels(prev => {
          const existingIds = new Set(prev.map(ch => ch.id));
          const uniqueNewChannels = newChannels.filter(
            ch => !existingIds.has(ch.id),
          );
          const updated = [...prev, ...uniqueNewChannels];

          console.log(
            `➕ Ajout de ${uniqueNewChannels.length} nouvelles chaînes (Total: ${updated.length})`,
          );
          return updated;
        });

        setCurrentPage(nextPage);
        setHasMoreChannels(result.channels.length === CHANNELS_PER_PAGE);

        console.log(`✅ Page ${nextPage} chargée avec succès`);
      } else {
        console.log('🔚 Aucune nouvelle chaîne - Fin de pagination');
        setHasMoreChannels(false);
      }
      } catch (error) {
        console.error('❌ ERREUR dans loadMoreChannels:', error);
        setHasMoreChannels(false);
      } finally {
        setIsLoadingMore(false);
        console.log('⚙️ loadMoreChannels terminé');
      }
    }); // InteractionManager
  };


  // 🔧 Fonction pour charger toutes les chaînes restantes d'une catégorie
  const loadAllRemainingChannels = async (category: Category) => {
    // Cette fonction n'est plus nécessaire avec WatermelonDB
    // La pagination SQL gère tout automatiquement
    console.log('ℹ️ loadAllRemainingChannels - Non utilisé avec WatermelonDB');
  };

  // NOUVEAU : Rendu avec animation pour compteurs
  const renderCategoryItem = ({item: category}: {item: Category}) => {
    const isSelected = selectedCategory?.id === category.id;

    // 🔒 Vérifier si la catégorie est bloquée (avec sécurité)
    const isBlocked = blockedCategories && category.name && blockedCategories.some(blocked => {
      const blockedNormalized = blocked.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // Supprimer caractères spéciaux
        .replace(/\s+/g, ' ') // Normaliser espaces
        .trim();

      const categoryNormalized = (category.name || '').toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // Supprimer caractères spéciaux
        .replace(/\s+/g, ' ') // Normaliser espaces
        .trim();

      return blockedNormalized === categoryNormalized;
    });

    // 🆕 Vérifier si la catégorie est déverrouillée localement
    const isUnlocked = unlockedCategories.has(category.name);

    // 🎨 Icônes Material Design - SEULEMENT les icônes essentielles
    const getCategoryIcon = (categoryName: string) => {
      // Catégories spéciales
      if (categoryName === 'favorites') {
        return 'favorite';
      }
      if (categoryName === 'history') {
        return 'history';
      }

      // 🔒 Icône de cadenas Material Design pour catégories bloquées (mais pas déverrouillées)
      if (isBlocked && !isUnlocked) {
        return 'lock';
      }

      return null; // Pas d'icône pour les autres catégories
    };

    // 🎨 Couleurs essentielles Material Design
    const themeColors = colors || {
      accent: { primary: '#1976D2', error: '#FF5252' },
      text: { secondary: '#666666', primary: '#FFFFFF' },
      background: { primary: '#000000' }
    };

    const iconColor = isSelected
      ? themeColors.accent.primary
      : (isBlocked && !isUnlocked)
        ? themeColors.accent.error // Rouge pour catégories bloquées mais non déverrouillées
        : themeColors.text.secondary;

    return (
      <TouchableOpacity
        style={[styles.categoryItem, isSelected && styles.categoryItemSelected]}
        onPress={() => handleCategorySelect(category)}
        activeOpacity={0.7}>
        {/* Icônes Material Design - seulement si nécessaire */}
        {getCategoryIcon(category.name) && (
          <Icon
            name={getCategoryIcon(category.name)!}
            size={20}
            color={iconColor}
            style={styles.categoryIcon}
          />
        )}

        {/* Nom de catégorie avec hiérarchie typographique */}
        <Text
          style={[
            styles.categoryName,
            isSelected && styles.categoryNameSelected,
          ]}
          numberOfLines={1}>
          {category.name}
        </Text>

        {/* Compteur avec style secondaire */}
        <Animated.View style={styles.categoryCountContainer}>
          <Animated.Text
            style={[
              styles.categoryCount,
              isSelected && styles.categoryCountSelected,
            ]}>
            {category.count.toLocaleString()}
          </Animated.Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  // Obtenir l'icône selon le nom de catégorie
  const getCategoryIcon = (categoryName: string): string => {
    const name = categoryName.toLowerCase();

    if (name === 'tout') {
      return 'apps';
    }
    if (name.includes('sport')) {
      return 'sports-soccer';
    }
    if (name.includes('news') || name.includes('info')) {
      return 'newspaper';
    }
    if (name.includes('movies') || name.includes('film')) {
      return 'movie';
    }
    if (name.includes('kids') || name.includes('enfant')) {
      return 'child-care';
    }
    if (name.includes('music') || name.includes('musique')) {
      return 'music-note';
    }
    if (name.includes('documentary') || name.includes('docu')) {
      return 'school';
    }
    if (name.includes('entertainment')) {
      return 'tv';
    }
    if (name.includes('religion')) {
      return 'place';
    }
    if (name.includes('adult')) {
      return 'block';
    }

    return 'tv'; // Icône par défaut
  };

  // GRILLE DYNAMIQUE : Adaptation selon la disponibilité de l'écran
  const getOptimalColumns = (): number => {
    if (sidebarVisible) {
      return 5; // Sidebar visible : 5 colonnes optimales (INCHANGÉ)
    } else {
      return 7; // Mode plein écran : 7 colonnes avec cartes agrandies
    }
  };

  // Simplified state management
  // const [failedLogos, setFailedLogos] = useState<Set<string>>(new Set()); // Désactivé temporairement

  // Animation de transition entre catégories uniquement
  const categoryTransitionAnim = useRef(new Animated.Value(1)).current;

  // Animation de transition entre catégories optimisée
  const animateCategoryTransition = () => {
    Animated.sequence([
      // Fade out rapide et fluide
      Animated.timing(categoryTransitionAnim, {
        toValue: 0.3,
        duration: 120, // Plus rapide pour réactivité
        useNativeDriver: true,
        isInteraction: false,
      }),
      // Fade in avec courbe naturelle
      Animated.timing(categoryTransitionAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
        isInteraction: false,
      }),
    ]).start();
  };

  // Fonction pour appliquer le tri
  const applySorting = (sortType: 'default' | 'newest' | 'az' | 'za') => {
    let sortedChannels = [...displayedChannels];

    switch (sortType) {
      case 'az':
        sortedChannels.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'za':
        sortedChannels.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'newest':
        // Tri par ordre d'ajout (récent en premier) - peut utiliser l'index ou une date
        sortedChannels.reverse();
        break;
      case 'default':
      default:
        // Ordre par défaut - peut recharger depuis la source ou garder l'ordre initial
        break;
    }

    setDisplayedChannels(sortedChannels);
    console.log(
      `✅ Tri appliqué: ${sortType} - ${sortedChannels.length} chaînes`,
    );
  };

  // Fonction pour charger automatiquement toutes les chaînes restantes d'une catégorie
  const loadAllRemainingChannelsOld = async (category: Category) => {
    // Cette fonction n'est plus utilisée avec WatermelonDB
    if (category.id === 'all') {
      return;
    }

    try {
      const WatermelonXtreamService = (
        await import('../services/WatermelonXtreamService')
      ).default;
      let page = 1;
      let allChannels = [...displayedChannels];
      let hasMore = true;

      console.log(
        `🔄 Chargement automatique invisible pour "${category.name}"...`,
      );

      while (hasMore) {
        const offset = page * CHANNELS_PER_PAGE;
        const result = await WatermelonXtreamService.getChannelsByCategory(
          playlistId,
          category.id,
          CHANNELS_PER_PAGE,
          offset,
        );

        if (result && result.length > 0) {
          const newChannels = result.map((channel: any) => ({
            id: channel.id || `channel-${channel.stream_id}-${Date.now()}`,
            name: channel.name || channel.displayName || 'Sans nom',
            logo: normalizeXtreamLogoUrl(
              channel.displayLogo ||
                channel.logoUrl ||
                channel.streamIcon ||
                '',
              serverUrl,
            ),
            group: category.name,
            url: channel.streamUrl || channel.url || '',
            type: 'XTREAM' as const,
          }));

          allChannels = [...allChannels, ...newChannels];

          // Mise à jour silencieuse de l'affichage
          setDisplayedChannels(allChannels);

          console.log(
            `📄 Page ${page + 1} chargée: +${
              newChannels.length
            } chaînes (Total: ${allChannels.length})`,
          );
          page++;

          if (result.length < CHANNELS_PER_PAGE) {
            hasMore = false;
            setHasMoreChannels(false);
          }
        } else {
          hasMore = false;
          setHasMoreChannels(false);
        }
      }

      console.log(
        `✅ Chargement automatique terminé: ${allChannels.length} chaînes pour "${category.name}"`,
      );
    } catch (error) {
      console.error('❌ Erreur chargement automatique:', error);
    }
  };

  // Rendu d'un item de chaîne avec nouveau composant optimisé
  const renderChannelItem = React.useCallback(
    ({item: channel, index}: {item: Channel; index: number}) => {
      const isFavorite = favorites.includes(channel.id);
      const isLocked = lockedChannels.has(channel.id);

      return (
        <ChannelCard
          channel={channel}
          index={index}
          width={getChannelCardWidth()}
          onPress={handleChannelPress}
          onLongPress={handleChannelLongPress}
          isFavorite={isFavorite}
          isLocked={isLocked}
          serverUrl={serverUrl}
          hideChannelNames={hideChannelNames}
        />
      );
    },
    [serverUrl, hideChannelNames, favorites, lockedChannels],
  ); // Dépendances mises à jour

  // OPTIMISÉ : Calcul largeur pour utiliser TOUT l'espace disponible
  const getChannelCardWidth = (): number => {
    // Calcul précis de l'espace disponible
    const sidebarWidth = sidebarVisible ? width * 0.32 : 0;
    const availableScreenWidth = width - sidebarWidth;

    const columns = getOptimalColumns();

    if (sidebarVisible) {
      // Mode sidebar : cartes légèrement plus grandes avec espacement amélioré
      const containerPadding = 6 * 2; // AUGMENTÉ : plus d'espace aux bords
      const cardMargin = 7; // AUGMENTÉ : plus d'espace entre cartes pour occuper l'espace
      const totalMargins = cardMargin * 2 * columns;
      const netWidth = availableScreenWidth - containerPadding - totalMargins;
      const cardWidth = Math.floor(netWidth / columns);
      const minWidth = 88; // AUGMENTÉ : cartes légèrement plus grandes
      return Math.max(cardWidth, minWidth);
    } else {
      // Mode plein écran : utiliser TOUT l'espace avec espacement généreux
      const containerPadding = 8 * 2; // Léger padding aux bords
      const spaceBetweenCards = 6; // Espacement généreux entre cartes
      const totalSpacing = spaceBetweenCards * (columns - 1);
      const netWidth = availableScreenWidth - containerPadding - totalSpacing;
      const cardWidth = Math.floor(netWidth / columns);
      return cardWidth;
    }
  };

  // Composant vide quand aucune chaîne
  const renderEmptyChannels = () => (
    <View style={styles.emptyChannels}>
      <Icon name="tv-off" size={48} color="rgba(255, 255, 255, 0.3)" />
      <Text style={[styles.emptyText, { fontSize: getScaledTextSize(16) }]}>Aucune chaîne dans cette catégorie</Text>
      <Text style={[styles.emptySubtext, { fontSize: getScaledTextSize(14) }]}>
        Sélectionnez une autre catégorie ou vérifiez votre playlist
      </Text>
    </View>
  );

  // Footer avec indicateur de chargement ou fin de liste
  const renderFooter = () => {
    if (isLoadingMore) {
      return (
        <View style={styles.loadingFooter}>
          <Text style={[styles.loadingFooterText, { fontSize: getScaledTextSize(12) }]}>Chargement...</Text>
        </View>
      );
    }

    if (!hasMoreChannels && displayedChannels.length > 0) {
      return (
        <View style={styles.endFooter}>
          <Text style={[styles.endFooterText, { fontSize: getScaledTextSize(12) }]}>
            {displayedChannels.length} chaînes chargées
          </Text>
        </View>
      );
    }

    return null;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        {/* StatusBar gérée automatiquement par useImmersiveScreen */}
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { fontSize: getScaledTextSize(16) }]}>Chargement des chaînes...</Text>
          <Text style={[styles.loadingSubtext, { fontSize: getScaledTextSize(14) }]}>
            {channelsCount > 0
              ? `Reconstruction de ${Math.floor(
                  channelsCount / 1000,
                )}K chaînes...`
              : 'Préparation de la playlist volumineuse...'}
          </Text>
          <Text style={[styles.loadingSubtext, { fontSize: getScaledTextSize(14) }]}>
            Veuillez patienter quelques secondes
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* StatusBar gérée automatiquement par useImmersiveScreen */}

      {/* Header simplifié */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {selectedCategory?.name || tChannels('allChannels')}{' '}
          <Text style={styles.headerTitleCount}>
            (
            {selectedCategory?.id === 'all'
              ? selectedCategory?.count ||
                totalChannels ||
                displayedChannels.length
              : selectedCategory?.count || displayedChannels.length}
            {hasMoreChannels && selectedCategory?.id !== 'all' ? '+' : ''})
          </Text>
        </Text>

        <View style={styles.headerActions}>
          {/* Bouton pour ouvrir sidebar si fermé */}
          {!sidebarVisible && (
            <TouchableOpacity
              onPress={() => setSidebarVisible(true)}
              style={styles.headerSidebarButton}>
              <Icon name="menu" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          )}

          {/* Bouton recherche modale */}
          <TouchableOpacity
            onPress={openSearchScreen}
            style={styles.searchButton}>
            <Icon name="search" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowOptionsMenu(true)}>
            <Icon name="more-vert" size={26} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Menu d'options (3 points) - Version dropdown compacte avec effet flou */}
      {showOptionsMenu && (
        <View style={styles.dropdownBlurOverlay}>
          <BlurView
            style={RNStyleSheet.absoluteFill}
            blurType="dark"
            blurAmount={5}
          />
          <TouchableOpacity
            style={RNStyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowOptionsMenu(false)}
          />
          <View style={styles.dropdownContainer}>
            <View style={[styles.dropdownMenu, {backgroundColor: colors.surface.overlay}]}>
              <TouchableOpacity
                style={styles.dropdownItem}
                activeOpacity={0.7}
                onPress={() => {
                  setHideChannelNames(!hideChannelNames);
                  setShowOptionsMenu(false);
                }}>
                <Icon
                  name={hideChannelNames ? 'visibility' : 'visibility-off'}
                  size={20}
                  color={colors.text.primary}
                />
                <Text style={[styles.dropdownText, {color: colors.text.primary}]}>
                  {hideChannelNames
                    ? tChannels('showChannelNames')
                    : tChannels('hideChannelName')}
                </Text>
              </TouchableOpacity>

              <View style={[styles.dropdownSeparator, {backgroundColor: colors.ui.border}]} />

              <TouchableOpacity
                style={styles.dropdownItem}
                activeOpacity={0.7}
                onPress={() => {
                  setShowOptionsMenu(false);
                  setShowSortModal(true);
                }}>
                <Icon name="sort" size={20} color={colors.text.primary} />
                <Text style={[styles.dropdownText, {color: colors.text.primary}]}>{tCommon('sort')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Menu de tri - Sous-menu avec effet flou */}
      {showSortModal && (
        <View style={styles.sortModalBlurOverlay}>
          <BlurView
            style={RNStyleSheet.absoluteFill}
            blurType="dark"
            blurAmount={5}
          />
          <TouchableOpacity
            style={RNStyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowSortModal(false)}
          />
          <View style={styles.sortModalContainer}>
            <View style={[styles.sortDropdownMenu, {backgroundColor: colors.surface.overlay}]}>
              {/* Header simplifié */}
              <View style={styles.sortDropdownHeader}>
                <Icon name="sort" size={20} color={colors.text.primary} />
                <Text style={[styles.sortDropdownTitle, {color: colors.text.primary}]}>{tCommon('sort')}</Text>
              </View>

              <View style={[styles.sortDropdownSeparator, {backgroundColor: colors.ui.border}]} />

              {/* Options de tri simplifiées */}
              {[
                {key: 'default', label: tChannels('sortByDefault')},
                {key: 'az', label: tChannels('sortByNameAZ')},
                {key: 'za', label: tChannels('sortByNameZA')},
              ].map(option => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.sortDropdownItem,
                    sortOption === option.key && styles.sortDropdownItemSelected,
                    {backgroundColor: sortOption === option.key ? colors.accent.primary + '20' : 'transparent'}
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setSortOption(option.key as any);
                    applySorting(option.key as any);
                    setShowSortModal(false);
                  }}>
                  <Icon
                    name={
                      sortOption === option.key
                        ? 'radio-button-checked'
                        : 'radio-button-unchecked'
                    }
                    size={18}
                    color={sortOption === option.key ? colors.accent.primary : colors.text.secondary}
                  />
                  <Text style={[
                    styles.sortDropdownText,
                    {color: colors.text.primary},
                    sortOption === option.key && {color: colors.accent.primary, fontWeight: '600'}
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}

              <View style={[styles.sortDropdownSeparator, {backgroundColor: colors.ui.border}]} />

              {/* Bouton Annuler */}
              <TouchableOpacity
                style={[styles.sortDropdownItem, styles.sortDropdownItemCancel]}
                activeOpacity={0.7}
                onPress={() => setShowSortModal(false)}>
                <Icon name="close" size={18} color={colors.accent.error} />
                <Text style={[styles.sortDropdownText, {color: colors.accent.error}]}>{tCommon('cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Contenu principal - Layout horizontal */}
      <View style={styles.mainContent}>
        {/* NOUVEAU : Sidebar épuré style liste */}
        {sidebarVisible && (
          <View style={styles.sidebar}>
            {/* Header simplifié - seulement bouton fermer */}
            <View style={styles.sidebarHeader}>
              <Text style={[styles.sidebarTitle, { fontSize: getScaledTextSize(18) }]}>{tChannels('categories')}</Text>
              <TouchableOpacity
                onPress={() => setSidebarVisible(false)}
                style={styles.sidebarCloseButton}>
                <Icon name="close" size={20} color="rgba(255, 255, 255, 0.7)" />
              </TouchableOpacity>
            </View>

            <FlashList
              data={categories}
              keyExtractor={(item, index) => `category-${item.id}-${index}`}
              renderItem={renderCategoryItem}
              showsVerticalScrollIndicator={false}
              estimatedItemSize={50}
              extraData={selectedCategory?.id}
            />
          </View>
        )}

        {/* ÉTAPE 4: Grille principale des chaînes */}
        <Animated.View
          style={[
            styles.channelsGrid,
            !sidebarVisible && styles.channelsGridFullWidth,
            {opacity: categoryTransitionAnim},
          ]}>
          <FlashList
            ref={flashListRef}
            data={displayedChannels}
            keyExtractor={keyExtractor}
            renderItem={renderChannelItem}
            numColumns={getOptimalColumns()}
            key={`channels-grid-${
              sidebarVisible ? 'sidebar' : 'fullscreen'
            }-${getOptimalColumns()}`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: sidebarVisible ? 6 : 8,
              paddingTop: 8,
              paddingBottom: 20,
            }}
            ListEmptyComponent={renderEmptyChannels}
            ListFooterComponent={renderFooter}
            estimatedItemSize={ITEM_HEIGHT}
            onEndReached={hasMoreChannels ? loadMoreChannels : undefined}
            onEndReachedThreshold={4}
            drawDistance={ITEM_HEIGHT * 15}
            extraData={{selectedCategoryId: selectedCategory?.id, favoritesLength: favorites.length, hideChannelNames, lockedChannelsSize: lockedChannels.size}}
          />
        </Animated.View>
      </View>

      {/* Modal Favoris avec effet flou parfait */}
      <Modal
        visible={favoriteModalVisible}
        transparent={true}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          setFavoriteModalVisible(false);
          setSelectedChannelForFavorite(null);
        }}>
        <View style={styles.favoriteModalBlurOverlay}>
          <BlurView
            style={RNStyleSheet.absoluteFill}
            blurType="dark"
            blurAmount={5}
          />
          <TouchableOpacity
            style={RNStyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => {
              setFavoriteModalVisible(false);
              setSelectedChannelForFavorite(null);
            }}
          />
          <View style={styles.favoriteModalContainer}>
            {/* Nom de la chaîne */}
            <Text style={styles.favoriteModalTitle} numberOfLines={2}>
              {selectedChannelForFavorite?.name || ''}
            </Text>

            {/* Boutons d'action */}
            <View style={styles.favoriteModalActions}>
              <TouchableOpacity
                style={styles.favoriteModalButtonCancel}
                activeOpacity={0.7}
                onPress={() => {
                  setFavoriteModalVisible(false);
                  setSelectedChannelForFavorite(null);
                }}>
                <Text style={styles.favoriteModalButtonCancelText}>
                  {tCommon('cancel')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.favoriteModalButtonConfirm}
                activeOpacity={0.8}
                onPress={handleConfirmFavorite}>
                <Icon
                  name="favorite"
                  size={16}
                  color="#FFFFFF"
                  style={{marginRight: 4}}
                />
                <Text style={styles.favoriteModalButtonConfirmText}>
                  {selectedChannelForFavorite &&
                  favorites.includes(selectedChannelForFavorite.id)
                    ? tChannels('removeFromFavorites')
                    : tChannels('addToFavorites')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 🔒 Modal PIN parental simplifié */}
      {activeProfile && (
        <SimplePinModal
          visible={pinModalVisible}
          profile={activeProfile}
          reason={`Catégorie bloquée : ${selectedBlockedCategory?.name || ''}`}
          onClose={handlePinCancel}
          onSuccess={handleCategoryUnlockSuccess}
        />
      )}
    </View>
  );
};

export default ChannelsScreen;
