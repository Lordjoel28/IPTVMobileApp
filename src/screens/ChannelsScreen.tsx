/**
 * 📺 ChannelsScreen - Interface navigation chaînes style IPTV Smarters Pro
 * Structure: Sidebar catégories + Grille chaînes + Recherche
 */

import React, {useState, useEffect, useRef} from 'react';
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
} from 'react-native';
import {FlashList} from '@shopify/flash-list';
import { useImmersiveScreen } from '../hooks/useStatusBar';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import FastImage from 'react-native-fast-image'; // ✅ Import pour préchargement
import ChannelCard from '../components/ChannelCard';
import type {Category} from '../types';
import {usePlayerStore} from '../stores/PlayerStore';
import {useRecentChannelsStore} from '../stores/RecentChannelsStore';
import { useThemeColors } from '../contexts/ThemeContext';
// import SmartImage from '../components/common/SmartImage'; // Temporairement désactivé

const {width, height} = Dimensions.get('window');

interface Channel {
  id: string;
  name: string;
  logo?: string;
  group: string;
  url: string;
  type: 'M3U' | 'XTREAM';
}

interface Category {
  id: string;
  name: string;
  count: number;
  channels: Channel[];
}

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
const createStyles = (colors: any) => StyleSheet.create({
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
      },  categoryIcon: {
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
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  dropdownBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 55,
    right: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 8,
    minWidth: 200,
    maxWidth: 240,
    borderWidth: 0,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
    backdropFilter: 'blur(10px)',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 8,
    marginVertical: 2,
    backgroundColor: 'transparent',
  },
  dropdownText: {
    color: '#333333',
    fontSize: 14,
    fontWeight: '400',
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
  sortModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1500, // Réduit pour ne pas dépasser player fullscreen
  },
  sortModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  sortModalContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 24,
    minWidth: 280,
    maxWidth: 320,
    width: '80%',
    borderWidth: 0,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 16},
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 24,
    transform: [{translateY: -2}],
    backdropFilter: 'blur(20px)',
  },
  sortModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sortModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginLeft: 10,
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
});

const ChannelsScreen: React.FC<ChannelsScreenProps> = ({route, navigation}) => {
  const colors = useThemeColors();
  const styles = createStyles(colors);

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
  const CHANNELS_PER_PAGE = 500; // WatermelonDB pagination augmentée pour afficher plus de chaînes

  // 🕰️ LISTENER RÉCENTS: Ecouter les changements dans RecentChannelsStore pour mettre à jour le compteur
  const recentChannels = useRecentChannelsStore(state => state.recentChannels);

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
    if (!name || name.trim() === '') {return 'Non classé';}

    return name
      .trim()
      .replace(/[<>]/g, '') // Supprimer caractères dangereux
      .replace(/[|]/g, ' - ') // Remplacer pipes par tirets
      .replace(/\s+/g, ' ') // Normaliser espaces multiples
      .substring(0, 50) // Limiter longueur
      .replace(/^\w/, c => c.toUpperCase()); // Première lettre majuscule
  };

  // NOUVEAU : Charger favoris et historique depuis AsyncStorage
  const loadFavoritesAndHistory = async () => {
    try {
      const AsyncStorage = (
        await import('@react-native-async-storage/async-storage')
      ).default;

      // Charger favoris
      const favoritesData = await AsyncStorage.getItem('favorites_channels');
      const favoritesCount = favoritesData
        ? JSON.parse(favoritesData).length
        : 0;

      // Charger historique - debug complet des clés
      let historyCount = 0;

      // Debug: Voir toutes les clés AsyncStorage
      const allKeys = await AsyncStorage.getAllKeys();
      console.log('🔍 [ChannelsScreen] Toutes les clés AsyncStorage:', allKeys);

      // Chercher toutes les clés avec "recent" ou "history"
      const recentKeys = allKeys.filter(
        key => key.includes('recent') || key.includes('history'),
      );
      console.log('🕰️ [ChannelsScreen] Clés avec "recent/history":', recentKeys);

      // Tentative 1: Clé spécifique avec playlistId (comme ChannelPlayerScreen)
      const recentKey = allKeys.find(key => key.startsWith('recent_channels_'));

      if (recentKey) {
        const recentData = await AsyncStorage.getItem(recentKey);
        historyCount = recentData ? JSON.parse(recentData).length : 0;
        console.log(
          `✅ [ChannelsScreen] Chaînes récentes depuis ${recentKey}: ${historyCount}`,
        );
      } else {
        // Tentative 2: Toutes les clés avec "recent"
        for (const key of recentKeys) {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            try {
              const parsed = JSON.parse(data);
              if (Array.isArray(parsed) && parsed.length > 0) {
                historyCount = parsed.length;
                console.log(
                  `✅ [ChannelsScreen] Chaînes récentes trouvées dans ${key}: ${historyCount}`,
                );
                break;
              }
            } catch (e) {
              console.log(`⚠️ [ChannelsScreen] Erreur parsing ${key}:`, e);
            }
          }
        }

        if (historyCount === 0) {
          console.log(
            `❌ [ChannelsScreen] Aucune chaîne récente trouvée dans toutes les clés`,
          );
        }
      }

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

  // 🕰️ MISE À JOUR TEMPS RÉEL: Mettre à jour le compteur RÉCENTS quand RecentChannelsStore change
  useEffect(() => {
    console.log(
      `🔄 [ChannelsScreen] RecentChannels changed: ${recentChannels.length} chaînes récentes`,
    );

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
  }, [recentChannels]);

  // 🔄 Focus listener pour rafraîchir les compteurs quand on revient sur l'écran
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      console.log('🎯 [ChannelsScreen] Focus - Rafraîchissement des compteurs');
      try {
        const {favoritesCount, historyCount} = await loadFavoritesAndHistory();

        // Mettre à jour les catégories avec les nouveaux compteurs
        setCategories(prevCategories =>
          prevCategories.map(cat => {
            if (cat.id === 'favorites') {
              return {...cat, count: favoritesCount};
            }
            if (cat.id === 'history') {
              return {...cat, count: historyCount};
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
  }, [playlistId, playlistType]);

  // Fonction pour normaliser les URLs de logos Xtream
  const normalizeXtreamLogoUrl = (
    logoUrl: string,
    serverUrl: string,
  ): string => {
    if (!logoUrl || logoUrl.trim() === '' || logoUrl === 'null') {return '';}

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
  };

  // 🍉 NOUVELLE FONCTION: Chargement depuis WatermelonDB avec lazy loading
  const loadChannelsFromWatermelonDB = async () => {
    try {
      console.log('🍉 Loading from WatermelonDB - playlistId:', playlistId);
      console.log('🍉 WatermelonDB function CALLED - début chargement');
      const startTime = Date.now();

      // 🚀 Importer le bon service selon le type de playlist
      const WatermelonService = playlistType === 'XTREAM'
        ? (await import('../services/WatermelonXtreamService')).default
        : (await import('../services/WatermelonM3UService')).default;

      console.log(`🍉 Using ${playlistType === 'XTREAM' ? 'Xtream' : 'M3U'} WatermelonDB Service`);

      let result;
      try {
        // Pagination WatermelonDB optimisée - Charger première page (500 items)
        result = await WatermelonService.getPlaylistWithChannels(
          playlistId,
          CHANNELS_PER_PAGE, // 500 items cohérent avec le reste
          0,
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
        console.log('⚠️ Playlist non trouvée dans WatermelonDB:', watermelonError.message);
        console.log('🔄 Migration automatique depuis AsyncStorage...');

        // Migration automatique en arrière-plan (sans dialogue utilisateur)
        try {
          // Importer PlaylistService
          const {PlaylistService} = await import('../services/PlaylistService');
          const playlistService = PlaylistService.getInstance();

          console.log('🔄 Début migration automatique...');

          // Lancer la migration (silencieuse)
          const newPlaylistId = await playlistService.migratePlaylistToWatermelon(
            playlistId,
            (progress, message) => {
              console.log(`📊 Migration: ${progress}% - ${message}`);
            },
          );

          console.log(`✅ Migration automatique terminée: ${playlistId} → ${newPlaylistId}`);

          // 🔧 CORRECTION: Mettre à jour AsyncStorage avec le nouveau ID
          try {
            const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
            await AsyncStorage.setItem('last_selected_playlist_id', newPlaylistId);
            console.log(`💾 ID playlist mis à jour dans AsyncStorage: ${newPlaylistId}`);
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

          // Debug pour les premiers logos
          if (index < 5) {
            console.log(`🔍 LOGO DEBUG ${index}: "${channel.name}"`);
            console.log(`   Logo brut: "${rawLogo}"`);
            console.log(`   Logo normalisé: "${normalizedLogo}"`);
            console.log(`   Serveur: "${serverUrl}"`);
          }

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
            ch.logo?.substring(0, 50) + (ch.logo?.length > 50 ? '...' : ''),
        })),
      );

      const categoriesStartTime = Date.now();

      // Charger favoris et historique
      const {favoritesCount, historyCount} = await loadFavoritesAndHistory();

      // Récupérer les VRAIES catégories Xtream stockées dans WatermelonDB
      const xtreamCategories = result.categories || [];
      console.log(
        '📂 Vraies catégories Xtream trouvées:',
        xtreamCategories.length,
      );

      // CORRECTION: Assigner les vraies chaînes à la catégorie TOUT
      const categoriesWithCounts: Category[] = [
        {
          id: 'all',
          name: 'TOUT',
          count: result.totalChannels || result.playlist.channelsCount || 0,
          channels: convertedChannels, // 🔧 CORRECTION: Vraies chaînes au lieu d'array vide
        },
        // NOUVEAU : Catégories spéciales avec icônes modernes et vrais compteurs
        {
          id: 'favorites',
          name: '💙 FAVORIS',
          count: favoritesCount,
          channels: [], // Sera chargé depuis AsyncStorage
        },
        {
          id: 'history',
          name: '📺 RÉCENTS',
          count: historyCount,
          channels: [], // Sera chargé depuis AsyncStorage
        },
      ];

      // Ajouter TOUTES les vraies catégories Xtream (314 catégories)
      xtreamCategories.forEach((cat: any) => {
        categoriesWithCounts.push({
          id: cat.categoryId || cat.id,
          name: cat.name || 'Sans nom',
          count: cat.channelsCount || 0,
          channels: [], // Sera chargé dynamiquement
        });
      });

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

      // Initialiser les données (ne pas mettre dans channels pour éviter useEffect)
      setDisplayedChannels(convertedChannels);
      // setChannels(convertedChannels); // DÉSACTIVÉ pour WatermelonDB - évite le useEffect groupChannelsByCategories
      setPlaylistName(result.playlist.name || 'Playlist WatermelonDB');
      setTotalChannels(
        result.totalChannels || result.playlist.channelsCount || 0,
      );
      console.log('🔍 DIAGNOSTIC WatermelonDB - Avant setState:');
      console.log(
        '   categoriesWithCounts.length:',
        categoriesWithCounts.length,
      );
      console.log('   convertedChannels.length:', convertedChannels.length);
      console.log(
        '   categoriesWithCounts[0].channels.length:',
        categoriesWithCounts[0]?.channels?.length || 0,
      );

      setCategories(categoriesWithCounts);
      setSelectedCategory(categoriesWithCounts[0]); // Sélectionner "TOUT"
      setDisplayedChannels(convertedChannels);

      // 🚀 OPTIMISATION: Précharger les logos des 30 premières chaînes
      setTimeout(() => {
        const logosToPreload = convertedChannels
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

      console.log('🔍 DIAGNOSTIC WatermelonDB - Après setState:');
      console.log(
        '   setState appelé avec',
        categoriesWithCounts.length,
        'catégories',
      );
      console.log(
        '   Catégorie TOUT avec',
        categoriesWithCounts[0]?.channels?.length || 0,
        'chaînes',
      );

      console.log(
        `⏱️ React setState Time: ${Date.now() - setStateStartTime}ms`,
      );
      console.log(
        '🍉 ChannelsScreen - WatermelonDB channels loaded successfully',
      );

      // Arrêter l'écran de chargement
      setIsLoading(false);
    } catch (error) {
      console.error('❌ Erreur chargement WatermelonDB:', error);
      throw error;
    }
  };

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
      const reconstructedChannels = [];
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
            batchError.message,
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

    if (!playlist) {
      throw new Error('Playlist introuvable dans le service et le storage');
    }

    // 🔧 VALIDATION FINALE: Vérifier structure des chaînes
    if (!playlist.channels || !Array.isArray(playlist.channels)) {
      console.error(
        '❌ Structure channels invalide:',
        typeof playlist.channels,
      );
      throw new Error(
        'Playlist invalide: structure des chaînes manquante ou corrompue',
      );
    }

    console.log(
      '📺 Legacy System - Chaînes chargées:',
      playlist.channels.length,
    );

    setChannels(playlist.channels);
    setPlaylistName(playlist.name || 'Playlist Legacy');

    console.log(
      '📺 ChannelsScreen - Legacy system channels loaded successfully',
    );
  };

  // 🔧 UNIFIED LOADING: Un seul useEffect unifié (Best Practice 2024)
  useEffect(() => {
    console.log(
      '🔄 UNIFIED DATA LOADING - Mode: WatermelonDB (M3U ou Xtream)',
    );

    // WatermelonDB géré par son propre chargement initial
    console.log(
      '📺 WatermelonDB: Chargement effectué dans loadChannelsFromWatermelonDB',
    );
  }, [channels, playlistType]);

  // Timer cleanup removed for simplicity

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

      // Ajouter "TOUT" en premier + catégories spéciales
      categoriesList.push({
        id: 'all',
        name: 'TOUT',
        count: channels.length,
        channels: channels,
      });

      // NOUVEAU : Catégories spéciales pour système legacy avec icônes modernes
      categoriesList.push({
        id: 'favorites',
        name: '💙 FAVORIS',
        count: 0, // TODO: Compter favoris depuis AsyncStorage
        channels: [], // Sera chargé depuis AsyncStorage
      });

      categoriesList.push({
        id: 'history',
        name: '📺 RÉCENTS',
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

  // Fonction pour ouvrir la nouvelle page de recherche modale
  const openSearchScreen = () => {
    // Préparer toutes les chaînes disponibles pour la recherche
    // CORRECTION: Utiliser displayedChannels ou la catégorie "TOUT" qui contient toutes les chaînes
    const allChannels = displayedChannels.length > 0
      ? displayedChannels
      : (categories.find(cat => cat.id === 'all')?.channels || []);

    console.log('🔍 [ChannelsScreen] Opening search with:');
    console.log('  - displayedChannels length:', displayedChannels.length);
    console.log('  - allChannels length:', allChannels.length);
    console.log('  - playlistId:', playlistId);

    // Stocker les données de navigation dans le PlayerStore pour la recherche
    const navigationData = {
      playlistId: playlistId || 'default',
      allCategories: categories,
      initialCategory: selectedCategory || categories[0] || { id: 'all', name: 'Toutes', count: allChannels.length, channels: allChannels },
      initialChannels: allChannels,
      playlistName: playlistName || 'Recherche',
      playlistType: playlistType || 'M3U'
    };

    // Utiliser le PlayerStore pour passer les données
    usePlayerStore.getState().actions.setNavigationData(navigationData);

    // Naviguer vers SearchScreen
    navigation.navigate('Search');
  };

  const handleChannelPress = async (channel: Channel) => {
    console.log('🛡️ RACE CONDITION FIX - GitHub/Reddit Solutions');

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
          });

          console.log(
            `📍 [Navigation Data] Préparé pour retour vers ChannelPlayerScreen avec ${safeChannels.length} chaînes`,
          );
        }
      }

      // 🕰️ AJOUTER À L'HISTORIQUE RÉCENT avant de lancer la chaîne
      try {
        const AsyncStorage = (
          await import('@react-native-async-storage/async-storage')
        ).default;
        const recentKey = `recent_channels_${playlistId}`;

        // Récupérer l'historique actuel
        const existingData = await AsyncStorage.getItem(recentKey);
        let recentChannels: Channel[] = existingData
          ? JSON.parse(existingData)
          : [];

        // Retirer la chaîne si elle existe déjà (éviter doublons)
        recentChannels = recentChannels.filter(c => c.id !== channel.id);

        // Ajouter la chaîne en première position
        recentChannels.unshift(channel);

        // Limiter à 20 chaînes récentes maximum
        if (recentChannels.length > 20) {
          recentChannels = recentChannels.slice(0, 20);
        }

        // Sauvegarder l'historique mis à jour
        await AsyncStorage.setItem(recentKey, JSON.stringify(recentChannels));
        console.log(
          `✅ [Historique] Chaîne "${channel.name}" ajoutée aux récents (${recentChannels.length} total)`,
        );

        // Mettre à jour le store partagé pour synchronisation
        const {setRecentChannels} = (
          await import('../stores/RecentChannelsStore')
        ).useRecentChannelsStore.getState();
        setRecentChannels(recentChannels);
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
        Alert.alert('Race Condition', 'États non synchronisés. Réessayez dans un instant.');
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

  const handleCategorySelect = async (category: Category) => {
    console.log(`📂 Catégorie sélectionnée: ${category.name} (${category.count} chaînes)`);

    // Déclencher l'animation de transition
    animateCategoryTransition();

    setSelectedCategory(category);
    setCurrentPage(0);
    setHasMoreChannels(false); // Désactiver le "+" immédiatement pour éviter le flash

    try {
      // 🚀 Utiliser le bon service WatermelonDB (M3U ou Xtream)
      const WatermelonService = playlistType === 'XTREAM'
        ? (await import('../services/WatermelonXtreamService')).default
        : (await import('../services/WatermelonM3UService')).default;

      let result;

      // 🎯 CAS SPÉCIAL: FAVORIS - utiliser la méthode dédiée
      if (category.id === 'favorites') {
        const favoriteChannels = await WatermelonService.getFavoriteChannels(
          playlistId,
          CHANNELS_PER_PAGE,
          0,
        );
        result = {channels: favoriteChannels, playlist: null};
      }
      // 🎯 CAS SPÉCIAL: RÉCENTS - utiliser la méthode dédiée
      else if (category.id === 'history' || category.id.includes('recent')) {
        const recentChannels = await WatermelonService.getRecentChannels(
          playlistId,
          20, // Limité à 20 récents
        );
        result = {channels: recentChannels, playlist: null};
      }
      // Charger toutes les chaînes
      else if (category.id === 'all') {
        result = await WatermelonService.getPlaylistWithChannels(
          playlistId,
          CHANNELS_PER_PAGE,
          0,
        );
      }
      // Charger par catégorie
      else {
        const categoryChannels = await WatermelonService.getChannelsByCategory(
          playlistId,
          category.id,
          CHANNELS_PER_PAGE,
          0,
        );
        result = {channels: categoryChannels, playlist: null};
      }

      if (result.channels && result.channels.length > 0) {
        const newChannels = result.channels.map((channel: any) => {
          const rawLogo = channel.logoUrl || channel.streamIcon || channel.logo || '';
          const normalizedLogo = playlistType === 'XTREAM'
            ? normalizeXtreamLogoUrl(rawLogo, serverUrl)
            : rawLogo;

          return {
            id: channel.id,
            name: channel.name || 'Sans nom',
            logo: normalizedLogo,
            group: channel.groupTitle || channel.categoryName || channel.group || 'Non classé',
            url: channel.streamUrl || channel.url || '',
            type: playlistType as 'M3U' | 'XTREAM',
          };
        });

        setDisplayedChannels(newChannels);
        setHasMoreChannels(newChannels.length === CHANNELS_PER_PAGE);

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

        // Scroll vers le haut
        setTimeout(() => {
          flashListRef.current?.scrollToOffset({offset: 0, animated: true});
        }, 100);

        console.log(`✅ "${category.name}" chargée: ${newChannels.length} chaînes affichées`);
      }
    } catch (error) {
      console.error('❌ Erreur chargement catégorie:', error);
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

  // 🔧 CORRECTION PAGINATION : Fonction corrigée pour charger TOUTES les chaînes
  const loadMoreChannels = async () => {
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

    // 🚀 WATERMELONDB UNIQUEMENT : Plus de système Legacy
    setIsLoadingMore(true);
    console.log('🍉 WatermelonDB - Démarrage chargement page suivante...');

    try {
      // 🚀 Utiliser le bon service WatermelonDB (M3U ou Xtream)
      const WatermelonService = playlistType === 'XTREAM'
        ? (await import('../services/WatermelonXtreamService')).default
        : (await import('../services/WatermelonM3UService')).default;

      const nextPage = currentPage + 1;
      const offset = nextPage * CHANNELS_PER_PAGE;

      console.log(
        `📄 Chargement page ${nextPage} pour "${selectedCategory.name}" (offset: ${offset})`,
      );

      let result;

      // 🎯 CAS SPÉCIAL: FAVORIS
      if (selectedCategory.id === 'favorites') {
        const favoriteChannels = await WatermelonService.getFavoriteChannels(
          playlistId,
          CHANNELS_PER_PAGE,
          offset,
        );
        result = {channels: favoriteChannels, playlist: null};
      }
      // 🎯 CAS SPÉCIAL: RÉCENTS (pas de pagination, limité à 20)
      else if (selectedCategory.id === 'history' || selectedCategory.id.includes('recent')) {
        // Récents n'ont pas de pagination
        result = {channels: [], playlist: null};
      }
      // Toutes les chaînes
      else if (selectedCategory.id === 'all') {
        result = await WatermelonService.getPlaylistWithChannels(
          playlistId,
          CHANNELS_PER_PAGE,
          offset,
        );
      }
      // Par catégorie
      else {
        const categoryChannels = await WatermelonService.getChannelsByCategory(
          playlistId,
          selectedCategory.id,
          CHANNELS_PER_PAGE,
          offset,
        );
        result = {channels: categoryChannels, playlist: null};
      }

      if (result.channels && result.channels.length > 0) {
        const newChannels = result.channels.map((channel: any) => {
          const rawLogo = channel.logoUrl || channel.streamIcon || channel.logo || '';
          const normalizedLogo = playlistType === 'XTREAM'
            ? normalizeXtreamLogoUrl(rawLogo, serverUrl)
            : rawLogo;

          return {
            id: channel.id,
            name: channel.name || 'Sans nom',
            logo: normalizedLogo,
            group: channel.groupTitle || channel.categoryName || channel.group || 'Non classé',
            url: channel.streamUrl || channel.url || '',
            type: playlistType as 'M3U' | 'XTREAM',
          };
        });

        // Ajouter sans doublons
        setDisplayedChannels(prev => {
          const existingIds = new Set(prev.map(ch => ch.id));
          const uniqueNewChannels = newChannels.filter(ch => !existingIds.has(ch.id));
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

    // 🎨 Icônes uniquement pour Favoris et Récents
    const getCategoryIcon = (name: string) => {
      if (name.includes('FAVORIS') || name.includes('💙')) {
        return 'favorite';
      }
      if (name.includes('RÉCENTS') || name.includes('📺')) {
        return 'history';
      }
      return null; // Pas d'icône pour les autres catégories
    };

    // 🎨 Couleur d'accent moderne (Cyan menthe)
    const accentColor = '#00D4AA';
    const iconColor = isSelected ? accentColor : 'rgba(255, 255, 255, 0.6)';

    return (
      <TouchableOpacity
        style={[styles.categoryItem, isSelected && styles.categoryItemSelected]}
        onPress={() => handleCategorySelect(category)}
        activeOpacity={0.7}>
        {/* Icône uniquement pour Favoris et Récents */}
        {getCategoryIcon(category.name) && (
          <Icon
            name={getCategoryIcon(category.name)}
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
          {category.name.replace(/💙|📺|[🎯📂]/g, '').trim()}
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

    if (name === 'tout') {return 'apps';}
    if (name.includes('sport')) {return 'sports-soccer';}
    if (name.includes('news') || name.includes('info')) {return 'newspaper';}
    if (name.includes('movies') || name.includes('film')) {return 'movie';}
    if (name.includes('kids') || name.includes('enfant')) {return 'child-care';}
    if (name.includes('music') || name.includes('musique')) {return 'music-note';}
    if (name.includes('documentary') || name.includes('docu')) {return 'school';}
    if (name.includes('entertainment')) {return 'tv';}
    if (name.includes('religion')) {return 'place';}
    if (name.includes('adult')) {return 'block';}

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
      return (
        <ChannelCard
          channel={channel}
          index={index}
          width={getChannelCardWidth()}
          onPress={handleChannelPress}
          serverUrl={serverUrl}
          hideChannelNames={hideChannelNames}
        />
      );
    },
    [serverUrl, hideChannelNames],
  ); // Dépendances minimales

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
      <Text style={styles.emptyText}>Aucune chaîne dans cette catégorie</Text>
      <Text style={styles.emptySubtext}>
        Sélectionnez une autre catégorie ou vérifiez votre playlist
      </Text>
    </View>
  );

  // Footer avec indicateur de chargement ou fin de liste
  const renderFooter = () => {
    if (isLoadingMore) {
      return (
        <View style={styles.loadingFooter}>
          <Text style={styles.loadingFooterText}>Chargement...</Text>
        </View>
      );
    }

    if (!hasMoreChannels && displayedChannels.length > 0) {
      return (
        <View style={styles.endFooter}>
          <Text style={styles.endFooterText}>
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
          <Text style={styles.loadingText}>Chargement des chaînes...</Text>
          <Text style={styles.loadingSubtext}>
            {channelsCount > 0
              ? `Reconstruction de ${Math.floor(
                  channelsCount / 1000,
                )}K chaînes...`
              : 'Préparation de la playlist volumineuse...'}
          </Text>
          <Text style={styles.loadingSubtext}>
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
          {selectedCategory?.name || 'TOUTES LES CHAÎNES'}{' '}
          <Text style={styles.headerTitleCount}>
            (
            {selectedCategory?.id === 'all'
              ? selectedCategory?.count || totalChannels || displayedChannels.length
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
            <Icon
              name="search"
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowOptionsMenu(true)}>
            <Icon name="more-vert" size={26} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Menu d'options (3 points) - Version dropdown compacte */}
      {showOptionsMenu && (
        <View style={styles.dropdownOverlay}>
          <TouchableOpacity
            style={styles.dropdownBackdrop}
            activeOpacity={1}
            onPress={() => setShowOptionsMenu(false)}
          />
          <View style={styles.dropdownMenu}>
            <TouchableOpacity
              style={styles.dropdownItem}
              activeOpacity={0.7}
              onPress={() => {
                setHideChannelNames(!hideChannelNames);
                setShowOptionsMenu(false);
              }}>
              <Icon
                name={hideChannelNames ? 'visibility' : 'visibility-off'}
                size={18}
                color="#333333"
              />
              <Text style={styles.dropdownText}>
                {hideChannelNames
                  ? 'Afficher les noms'
                  : 'Masquer le nom de la chaîne'}
              </Text>
            </TouchableOpacity>

            <View style={styles.dropdownSeparator} />

            <TouchableOpacity
              style={styles.dropdownItem}
              activeOpacity={0.7}
              onPress={() => {
                setShowOptionsMenu(false);
                setShowSortModal(true);
              }}>
              <Icon
                name="sort"
                size={18}
                color="#333333"
              />
              <Text style={styles.dropdownText}>Trier</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Modal de tri - Version sans Modal React Native */}
      {showSortModal && (
        <View style={styles.sortModalOverlay}>
          <TouchableOpacity
            style={styles.sortModalBackdrop}
            activeOpacity={1}
            onPress={() => setShowSortModal(false)}
          />
          <View style={styles.sortModalContent}>
            {/* Header du modal */}
            <View style={styles.sortModalHeader}>
              <Icon name="sort" size={24} color={colors.accent.primary} />
              <Text style={styles.sortModalTitle}>Trier selon :</Text>
            </View>

            {/* Options de tri */}
            <View style={styles.sortOptions}>
              {[
                {
                  key: 'default',
                  label: 'Défaut',
                  icon: 'radio-button-unchecked',
                },
                {
                  key: 'newest',
                  label: 'Top Ajouté',
                  icon: 'radio-button-unchecked',
                },
                {key: 'az', label: 'A-Z', icon: 'radio-button-unchecked'},
                {key: 'za', label: 'Z-A', icon: 'radio-button-unchecked'},
              ].map(option => (
                <TouchableOpacity
                  key={option.key}
                  style={styles.sortOption}
                  activeOpacity={0.6}
                  onPress={() => setSortOption(option.key as any)}>
                  <Icon
                    name={
                      sortOption === option.key
                        ? 'radio-button-checked'
                        : 'radio-button-unchecked'
                    }
                    size={20}
                    color={sortOption === option.key ? '#4A9EFF' : '#666666'}
                  />
                  <Text
                    style={[
                      styles.sortOptionText,
                      sortOption === option.key &&
                        styles.sortOptionTextSelected,
                    ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Boutons d'action */}
            <View style={styles.sortModalActions}>
              <TouchableOpacity
                style={styles.sortModalButtonSecondary}
                activeOpacity={0.7}
                onPress={() => setShowSortModal(false)}>
                <Text style={styles.sortModalButtonSecondaryText}>FERMER</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sortModalButtonPrimary}
                activeOpacity={0.8}
                onPress={() => {
                  // Appliquer le tri
                  applySorting(sortOption);
                  setShowSortModal(false);
                }}>
                <Text style={styles.sortModalButtonPrimaryText}>
                  ENREGISTRER
                </Text>
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
              <Text style={styles.sidebarTitle}>Catégories</Text>
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
            key={`channels-grid-${sidebarVisible ? 'sidebar' : 'fullscreen'}-${getOptimalColumns()}`}
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
            onEndReachedThreshold={0.1}
            extraData={`${selectedCategory?.id}-${displayedChannels.length}-${hasMoreChannels}`}
          />
        </Animated.View>
      </View>
    </View>
  );
};

export default ChannelsScreen;
