/**
 * 📺 SeriesScreen ULTRA-RAPIDE - Architecture style TiviMate
 * SQLite natif + pagination + lazy loading = performances professionnelles
 */

import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Modal,
  Platform,
  Vibration,
  Animated,
} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import FastImage from 'react-native-fast-image';
import {FlashList} from '@shopify/flash-list';
import type {StackNavigationProp} from '@react-navigation/stack';
import type {RouteProp} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import {useI18n} from '../../hooks/useI18n';
import {useUIStore} from '../../stores/UIStore';
import FastSQLiteService from '../../services/FastSQLiteService';
import WatermelonXtreamService from '../../services/WatermelonXtreamService';
import ProfileService from '../../services/ProfileService';
import FavoritesService from '../../services/FavoritesService';
import FinalSearchScreen from '../../components/FinalSearchScreen';
import type {VodSeries, VodCategory, RootStackParamList, XtreamCredentials, Profile, Channel} from '../../types';

type SeriesScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SeriesScreen'>;
type SeriesScreenRouteProp = RouteProp<RootStackParamList, 'SeriesScreen'>;

interface Props {
  navigation: SeriesScreenNavigationProp;
  route: SeriesScreenRouteProp;
}

const {width: screenWidth} = Dimensions.get('window');
const SIDEBAR_WIDTH = screenWidth * 0.30; // Taille équilibrée pour les catégories
const INITIAL_PAGE_SIZE = 100; // Chargement initial rapide
const PAGE_SIZE = 300; // Pages suivantes plus grandes

// Cache global pour éviter rechargement à chaque navigation
const seriesCache: Map<string, {
  categories: ExtendedCategory[];
  series: VodSeries[];
  totalCount: number;
  loadedAt: number;
}> = new Map();

// IDs des catégories spéciales
const SPECIAL_CATEGORIES = {
  ALL: 'all',
  FAVORITES: 'favorites',
  RECENTLY_WATCHED: 'recently_watched',
  RECENTLY_ADDED: 'recently_added',
};

interface ExtendedCategory extends VodCategory {
  icon?: string;
  isSpecial?: boolean;
}

interface SeriesState {
  series: VodSeries[];
  page: number;
  hasMore: boolean;
  totalCount: number;
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
}

// 🚀 SeriesCard extrait hors du composant parent pour éviter les re-créations
const SeriesCard = React.memo(({
  item,
  cardWidth,
  cardHeight,
  isFavorite,
  hideSeriesNames,
  onPress,
  onLongPress,
}: {
  item: VodSeries;
  cardWidth: number;
  cardHeight: number;
  isFavorite: boolean;
  hideSeriesNames: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const favoriteAnim = React.useRef(new Animated.Value(isFavorite ? 1 : 0)).current;
  const prevFavoriteRef = React.useRef(isFavorite);

  // Animation seulement quand le favori CHANGE
  React.useEffect(() => {
    const wasFavorite = prevFavoriteRef.current;
    prevFavoriteRef.current = isFavorite;

    if (wasFavorite === isFavorite) return;

    if (isFavorite) {
      Animated.sequence([
        Animated.timing(favoriteAnim, {
          toValue: 1.3,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(favoriteAnim, {
          toValue: 1,
          friction: 4,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(favoriteAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [isFavorite, favoriteAnim]);

  return (
    <TouchableOpacity
      style={[styles.seriesCard, {
        width: cardWidth,
        height: cardHeight,
        opacity: isPressed ? 0.6 : 1,
      }]}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      delayLongPress={400}
      activeOpacity={0.9}>
      <View style={[styles.seriesImageContainer, { width: cardWidth, height: cardHeight }]}>
        {item.cover_url ? (
          <FastImage
            source={{uri: item.cover_url, priority: FastImage.priority.normal}}
            style={styles.seriesImage}
            resizeMode={FastImage.resizeMode.cover}
            cacheControl={FastImage.cacheControl.immutable}
          />
        ) : (
          <View style={styles.seriesImagePlaceholder}>
            <Icon name="tv" size={20} color="#666" />
          </View>
        )}

        {isFavorite && (
          <Animated.View style={[styles.favoriteOverlay, {
            transform: [{scale: favoriteAnim}],
            opacity: favoriteAnim,
          }]}>
            <Icon name="favorite" size={18} color="#FF4444" />
          </Animated.View>
        )}

        {item.rating && (
          <View style={styles.ratingOverlay}>
            <Text style={styles.ratingText}>{item.rating}</Text>
          </View>
        )}

        {!hideSeriesNames && (
          <View style={styles.seriesTitleContainer}>
            <Text style={styles.seriesTitle} numberOfLines={2}>
              {item.name}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.isFavorite === nextProps.isFavorite &&
    prevProps.hideSeriesNames === nextProps.hideSeriesNames &&
    prevProps.cardWidth === nextProps.cardWidth
  );
});

const SeriesScreen: React.FC<Props> = ({navigation, route}) => {
  const {t: tCommon} = useI18n('common');
  const {t: tChannels} = useI18n('channels');
  const {showNotification} = useUIStore();

  const {playlistId} = route.params;

  // États
  const [categories, setCategories] = useState<ExtendedCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(SPECIAL_CATEGORIES.ALL);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('Tout');
  const [credentials, setCredentials] = useState<XtreamCredentials | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(true); // Ouverte par défaut
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Chargement...');
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [totalSeriesCount, setTotalSeriesCount] = useState<number>(0);
  const [searchVisible, setSearchVisible] = useState(false);
  const [hideSeriesNames, setHideSeriesNames] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [sortOption, setSortOption] = useState<'default' | 'newest' | 'az' | 'za'>('default');
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // État paginé des séries
  const [seriesState, setSeriesState] = useState<SeriesState>({
    series: [],
    page: 0,
    hasMore: true,
    totalCount: 0,
    isLoading: false,
    isRefreshing: false,
    isLoadingMore: false,
  });

  // Calcul dynamique - Taille optimisée avec espacement vertical
  const dynamicDimensions = useMemo(() => {
    const sidebarWidth = sidebarVisible ? SIDEBAR_WIDTH : 0;
    const availableWidth = screenWidth - sidebarWidth;
    const columns = sidebarVisible ? 4 : 6; // 6 colonnes sans sidebar, 4 avec
    const gap = 8; // Espacement entre cartes
    const padding = 8; // Padding réduit pour maximiser l'espace
    const cardWidth = (availableWidth - padding * 2 - gap * (columns - 1)) / columns;
    const cardHeight = cardWidth * 1.5; // Ratio poster standard
    return { columns, cardWidth, cardHeight, gap };
  }, [sidebarVisible, screenWidth]);

  const { columns, cardWidth, cardHeight, gap } = dynamicDimensions;

  // Filtrer et trier les séries selon la catégorie et l'option de tri
  const filteredSeries = useMemo(() => {
    let result = [...seriesState.series];

    // Appliquer le tri
    switch (sortOption) {
      case 'az':
        result.sort((a, b) => a.name.localeCompare(b.name, 'fr', {sensitivity: 'base'}));
        break;
      case 'za':
        result.sort((a, b) => b.name.localeCompare(a.name, 'fr', {sensitivity: 'base'}));
        break;
      case 'newest':
        // Trier par ID décroissant (plus récent en premier)
        result.sort((a, b) => parseInt(b.series_id || '0') - parseInt(a.series_id || '0'));
        break;
      case 'default':
      default:
        // Ordre par défaut (ordre de la base de données)
        break;
    }

    return result;
  }, [seriesState.series, sortOption]);

  // Ne plus rediriger automatiquement - afficher l'interface directement
  useEffect(() => {
    console.log('📺 [SeriesScreen] Interface séries rapide');

    // Vérifier le cache global
    const cached = seriesCache.get(playlistId);
    const cacheAge = cached ? Date.now() - cached.loadedAt : Infinity;
    const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

    if (cached && cacheAge < CACHE_TTL) {
      // Utiliser le cache
      console.log('⚡ [SeriesScreen] Utilisation du cache (age: ' + Math.round(cacheAge/1000) + 's)');
      setCategories(cached.categories);
      setTotalSeriesCount(cached.totalCount);
      setSeriesState(prev => ({
        ...prev,
        series: cached.series,
        totalCount: cached.totalCount,
        hasMore: cached.series.length < cached.totalCount,
      }));
      setIsInitialLoading(false);
    } else {
      // Charger depuis SQLite/API
      loadSeriesFromDatabase();
    }
  }, [playlistId]);

  /**
   * 📥 Charger les séries depuis SQLite déjà remplies
   */
  const loadSeriesFromDatabase = useCallback(async () => {
    console.log('📥 [SeriesScreen] Chargement séries depuis SQLite...');
    setIsInitialLoading(true);
    setLoadingMessage('Initialisation...');

    try {
      // Récupérer le profil actif
      const profile = await ProfileService.getActiveProfile();
      setActiveProfile(profile);
      console.log(`👤 [SeriesScreen] Profil actif: ${profile?.name || 'Aucun'}`);

      // Récupérer les credentials
      const database = await import('../../database');
      const {Playlist} = await import('../../database/models');

      const playlist = await database.default
        .get<typeof Playlist>('playlists')
        .find(playlistId);

      if (!playlist || playlist.type !== 'XTREAM') {
        throw new Error('Playlist Xtream Codes invalide');
      }

      const creds = {
        url: playlist.server,
        username: playlist.username,
        password: playlist.password,
      };

      setCredentials(creds);

      // Initialiser la base si nécessaire
      console.log('🔧 [SeriesScreen] Initialisation SQLite...');
      setLoadingMessage('Initialisation de la base de données...');
      await FastSQLiteService.initializeDatabase();
      console.log('✅ [SeriesScreen] SQLite initialisé avec succès');

      // Vérifier si les données existent déjà
      console.log('📂 [SeriesScreen] Recherche catégories...');
      let dbCategories = await FastSQLiteService.getCategoriesWithCounts(playlistId, 'series');
      console.log(`📂 [SeriesScreen] ${dbCategories.length} catégories trouvées`);

      // Vérifier si les séries existent (pas seulement les catégories)
      let hasSeries = false;
      let totalCount = 0;
      let recentlyAddedCount = 0;
      if (dbCategories.length > 0) {
        const allSeriesResult = await FastSQLiteService.getAllSeriesPaginated(playlistId, 0, 1);
        totalCount = allSeriesResult.totalCount;
        hasSeries = totalCount > 0;

        // Récupérer le nombre réel de séries récentes
        const recentlyAddedResult = await FastSQLiteService.getRecentlyAddedSeries(playlistId, 0, 1);
        recentlyAddedCount = recentlyAddedResult.totalCount;

        console.log(`📂 [SeriesScreen] Séries existantes: ${hasSeries ? 'Oui' : 'Non'} (${totalCount})`);
        console.log(`📂 [SeriesScreen] Séries récentes: ${recentlyAddedCount}`);
      }

      if (dbCategories.length === 0 || !hasSeries) {
        console.log('🔄 [SeriesScreen] Aucune donnée trouvée - Chargement depuis API...');
        setLoadingMessage('Téléchargement des séries...');
        // Si pas de données, charger depuis l'API
        await loadDataFromApi(creds);
        // Récupérer les catégories maintenant
        dbCategories = await FastSQLiteService.getCategoriesWithCounts(playlistId, 'series');
        const allSeriesResult = await FastSQLiteService.getAllSeriesPaginated(playlistId, 0, 1);
        totalCount = allSeriesResult.totalCount;

        // Récupérer le nombre réel de séries récentes après l'import API
        const recentlyAddedResult = await FastSQLiteService.getRecentlyAddedSeries(playlistId, 0, 1);
        recentlyAddedCount = recentlyAddedResult.totalCount;

        console.log(`📂 [SeriesScreen] ${dbCategories.length} catégories chargées après API`);
        console.log(`📂 [SeriesScreen] Séries récentes après API: ${recentlyAddedCount}`);
      }

      setTotalSeriesCount(totalCount);

      // Récupérer le nombre de favoris pour ce profil
      let favoritesCount = 0;
      if (profile) {
        try {
          const favorites = await FavoritesService.getFavoriteChannelsByProfile(
            profile.id,
            playlistId
          );
          // Filtrer pour ne compter que les séries (streamType === 'series')
          favoritesCount = favorites.filter(f => f.streamType === 'series').length;
        } catch (error) {
          console.log('Erreur comptage favoris:', error);
        }
      }

      // Créer les catégories spéciales en haut de liste
      const specialCategories: ExtendedCategory[] = [
        {
          id: SPECIAL_CATEGORIES.ALL,
          category_id: SPECIAL_CATEGORIES.ALL,
          category_name: 'Tout',
          type: 'series',
          count: totalCount,
          isSpecial: true,
        },
        {
          id: SPECIAL_CATEGORIES.FAVORITES,
          category_id: SPECIAL_CATEGORIES.FAVORITES,
          category_name: 'Favoris',
          type: 'series',
          count: favoritesCount,
          isSpecial: true,
        },
        {
          id: SPECIAL_CATEGORIES.RECENTLY_WATCHED,
          category_id: SPECIAL_CATEGORIES.RECENTLY_WATCHED,
          category_name: 'Récemment regardé',
          type: 'series',
          count: 0, // TODO: Compter l'historique VOD du profil
          isSpecial: true,
        },
        {
          id: SPECIAL_CATEGORIES.RECENTLY_ADDED,
          category_id: SPECIAL_CATEGORIES.RECENTLY_ADDED,
          category_name: 'Récemment ajouté',
          type: 'series',
          count: recentlyAddedCount, // Nombre réel de séries récentes
          isSpecial: true,
        },
      ];

      // Combiner catégories spéciales + catégories normales
      const allCategories = [...specialCategories, ...dbCategories];
      setCategories(allCategories);
      setIsInitialLoading(false);

      // Charger "Tout" par défaut
      setSelectedCategory(SPECIAL_CATEGORIES.ALL);
      setSelectedCategoryName('Tout');

      // Charger les séries et mettre en cache (taille initiale réduite pour rendu rapide)
      const result = await FastSQLiteService.getAllSeriesPaginated(playlistId, 0, INITIAL_PAGE_SIZE);
      setSeriesState(prev => ({
        ...prev,
        series: result.series,
        totalCount: result.totalCount,
        hasMore: result.hasMore,
        isLoading: false,
      }));

      // Sauvegarder dans le cache global
      seriesCache.set(playlistId, {
        categories: allCategories,
        series: result.series,
        totalCount: totalCount,
        loadedAt: Date.now(),
      });

      console.log('💾 [SeriesScreen] Cache mis à jour');

    } catch (error) {
      console.error('❌ [SeriesScreen] Erreur chargement:', error);
      showNotification('Erreur de chargement', 'error', 3000);
      setIsInitialLoading(false);
    }
  }, [playlistId, showNotification]);

  /**
   * 🔄 Charger les données depuis l'API si SQLite est vide
   */
  const loadDataFromApi = useCallback(async (creds: XtreamCredentials) => {
    console.log('🔄 [SeriesScreen] Début chargement API...');

    try {
      // Télécharger catégories et séries
      setLoadingMessage('Téléchargement des catégories et séries...');
      const [cats, allSeries] = await Promise.all([
        WatermelonXtreamService.getSeriesCategories(creds),
        WatermelonXtreamService.getSeriesStreams(creds)
      ]);

      console.log(`📥 [SeriesScreen] ${cats.length} catégories et ${allSeries.length} séries reçues`);
      setLoadingMessage(`Sauvegarde de ${allSeries.length} séries...`);

      // Insertion dans SQLite
      await FastSQLiteService.insertCategories(playlistId, cats.map(c => ({...c, type: 'series'})));
      setLoadingMessage(`Sauvegarde en cours... (${allSeries.length} séries)`);
      await FastSQLiteService.insertSeries(playlistId, allSeries);

      console.log('✅ [SeriesScreen] Données importées avec succès');
      setLoadingMessage('Finalisation...');

    } catch (error) {
      console.error('❌ [SeriesScreen] Erreur chargement API:', error);
      throw error;
    }
  }, [playlistId]);

  /**
   * ⚡ Charger les séries d'une catégorie avec pagination
   */
  const loadSeriesForCategory = useCallback(async (categoryId: string, page: number = 0, append: boolean = false) => {
    // État de chargement
    if (append) {
      setSeriesState(prev => ({ ...prev, isLoadingMore: true }));
    } else {
      setSeriesState(prev => ({ ...prev, isLoading: true, series: [], page: 0 }));
    }

    try {
      console.log(`📥 Chargement catégorie ${categoryId}, page ${page}`);

      let result: {series: VodSeries[], hasMore: boolean, totalCount: number};

      // Gérer les catégories spéciales
      switch (categoryId) {
        case SPECIAL_CATEGORIES.ALL:
          result = await FastSQLiteService.getAllSeriesPaginated(playlistId, page, PAGE_SIZE);
          break;

        case SPECIAL_CATEGORIES.RECENTLY_ADDED:
          result = await FastSQLiteService.getRecentlyAddedSeries(playlistId, page, PAGE_SIZE);
          break;

        case SPECIAL_CATEGORIES.FAVORITES:
          // Charger les favoris séries du profil actif
          // Récupérer le profil directement pour éviter les problèmes de timing
          const currentProfile = activeProfile || await ProfileService.getActiveProfile();
          if (currentProfile) {
            try {
              const favorites = await FavoritesService.getFavoriteChannelsByProfile(
                currentProfile.id,
                playlistId
              );
              console.log(`📥 [SeriesScreen] Favoris bruts: ${favorites.length}`, favorites.map(f => ({name: f.name, streamType: f.streamType})));
              // Filtrer uniquement les séries et convertir en VodSeries
              const favoriteSeries = favorites
                .filter(f => f.streamType === 'series')
                .map(f => ({
                  id: f.id,
                  name: f.name,
                  cover_url: f.logo || f.logoUrl || '',
                  category_id: '',
                  category_name: f.category || f.group || '',
                  series_id: f.tvgId || '',
                  rating: '',
                  plot: '',
                  cast: '',
                  genre: '',
                  releaseDate: '',
                  director: '',
                  backdrop_path: [],
                  youtube_trailer: '',
                  episode_run_time: '',
                  last_modified: '',
                })) as VodSeries[];
              console.log(`📥 [SeriesScreen] Séries favorites filtrées: ${favoriteSeries.length}`);
              result = {
                series: favoriteSeries,
                hasMore: false,
                totalCount: favoriteSeries.length,
              };
            } catch (error) {
              console.error('Erreur chargement favoris:', error);
              result = { series: [], hasMore: false, totalCount: 0 };
            }
          } else {
            console.log('📥 [SeriesScreen] Pas de profil actif pour charger les favoris');
            result = { series: [], hasMore: false, totalCount: 0 };
          }
          break;

        case SPECIAL_CATEGORIES.RECENTLY_WATCHED:
          // TODO: Implémenter avec le service d'historique VOD
          result = { series: [], hasMore: false, totalCount: 0 };
          break;

        default:
          // Catégorie normale
          result = await FastSQLiteService.getSeriesPaginated(
            playlistId,
            categoryId,
            page,
            PAGE_SIZE
          );
          break;
      }

      setSeriesState(prev => ({
        series: append ? [...prev.series, ...result.series] : result.series,
        page,
        hasMore: result.hasMore,
        totalCount: result.totalCount,
        isLoading: false,
        isLoadingMore: false,
        isRefreshing: false,
      }));

      console.log(`✅ ${result.series.length} séries chargées (total: ${result.totalCount})`);

    } catch (error) {
      console.error(`❌ Erreur chargement catégorie ${categoryId}:`, error);
      setSeriesState(prev => ({ ...prev, isLoading: false, isLoadingMore: false }));
      showNotification('Erreur de chargement', 'error', 3000);
    }
  }, [playlistId, activeProfile, showNotification]);

  /**
   * Charger plus de séries (scroll infini)
   */
  const loadMoreSeries = useCallback(() => {
    if (!seriesState.hasMore || seriesState.isLoadingMore || seriesState.isLoading) {
      return;
    }

    loadSeriesForCategory(selectedCategory, seriesState.page + 1, true);
  }, [selectedCategory, seriesState.hasMore, seriesState.isLoadingMore, seriesState.isLoading, seriesState.page, loadSeriesForCategory]);

  /**
   * Rafraîchissement
   */
  const onRefresh = useCallback(async () => {
    setSeriesState(prev => ({ ...prev, isRefreshing: true }));

    try {
      if (credentials) {
        await loadDataFromApi(credentials);
        await loadSeriesForCategory(selectedCategory, 0, false);
      }
    } catch (error) {
      console.error('❌ Erreur rafraîchissement:', error);
    } finally {
      setSeriesState(prev => ({ ...prev, isRefreshing: false }));
    }
  }, [credentials, selectedCategory, loadDataFromApi, loadSeriesForCategory]);

  /**
   * Sélection de catégorie
   */
  const onCategorySelect = useCallback((categoryId: string, categoryName: string) => {
    setSelectedCategory(categoryId);
    setSelectedCategoryName(categoryName);
    loadSeriesForCategory(categoryId, 0, false);
  }, [loadSeriesForCategory]);

  // ⭐ Charger les favoris du profil actif
  const loadFavorites = useCallback(async () => {
    if (!activeProfile) return;
    try {
      const favorites = await FavoritesService.getFavoriteChannelsByProfile(
        activeProfile.id,
        playlistId
      );
      const ids = new Set(favorites.map(f => f.id));
      setFavoriteIds(ids);
    } catch (error) {
      console.error('❌ Erreur chargement favoris séries:', error);
    }
  }, [activeProfile, playlistId]);

  // Charger les favoris quand le profil est chargé
  useEffect(() => {
    if (activeProfile) {
      loadFavorites();
    }
  }, [activeProfile, loadFavorites]);

  // ⭐ Toggle favori sur long press
  const toggleSeriesFavorite = useCallback(async (series: VodSeries) => {
    // Toujours récupérer le profil actif depuis le service pour éviter les problèmes de timing
    const currentProfile = activeProfile || await ProfileService.getActiveProfile();
    if (!currentProfile) {
      console.log('❌ Aucun profil actif disponible pour ajouter aux favoris');
      showNotification('Aucun profil actif', 'error', 3000);
      return;
    }

    try {
      // Convertir VodSeries en format Channel pour FavoritesService
      const seriesAsChannel: Channel = {
        id: series.id,
        name: series.name,
        url: '',
        streamUrl: '',
        logo: series.cover_url,
        logoUrl: series.cover_url,
        group: series.category_name || 'Séries',
        groupTitle: series.category_name || 'Séries',
        category: series.category_name || 'Séries',
        tvgId: series.series_id,
        streamType: 'series',
        isAdult: false,
        isFavorite: favoriteIds.has(series.id),
      };

      const newIsFavorite = await FavoritesService.toggleFavorite(
        seriesAsChannel,
        playlistId,
        currentProfile.id
      );

      // Vibration légère de feedback
      Vibration.vibrate(15);

      // Mettre à jour l'état local
      setFavoriteIds(prev => {
        const newSet = new Set(prev);
        if (newIsFavorite) {
          newSet.add(series.id);
        } else {
          newSet.delete(series.id);
        }
        return newSet;
      });

      // Mettre à jour le compteur de favoris dans les catégories
      setCategories(prev => prev.map(cat => {
        if (cat.category_id === SPECIAL_CATEGORIES.FAVORITES) {
          return {
            ...cat,
            count: (cat.count || 0) + (newIsFavorite ? 1 : -1),
          };
        }
        return cat;
      }));
    } catch (error) {
      console.error('❌ Erreur toggle favori série:', error);
    }
  }, [activeProfile, playlistId, favoriteIds, showNotification]);

  // Fonction de rendu optimisée pour FlashList
  const renderSeriesItem = useCallback(({item}: {item: VodSeries}) => (
    <SeriesCard
      item={item}
      cardWidth={cardWidth}
      cardHeight={cardHeight}
      isFavorite={favoriteIds.has(item.id)}
      hideSeriesNames={hideSeriesNames}
      onPress={() => navigation.navigate('SeriesDetailScreen', {series: item, playlistId})}
      onLongPress={() => toggleSeriesFavorite(item)}
    />
  ), [cardWidth, cardHeight, favoriteIds, hideSeriesNames, navigation, playlistId, toggleSeriesFavorite]);

  const CategoryItem = React.memo(({item, isSelected}: {item: ExtendedCategory, isSelected: boolean}) => {
    return (
      <TouchableOpacity
        style={[styles.categoryItem, isSelected && styles.selectedCategory]}
        onPress={() => onCategorySelect(item.category_id, item.category_name)}>
        <Text
          style={[styles.categoryText, isSelected && styles.selectedCategoryText]}
          numberOfLines={2}>
          {item.category_name}
        </Text>
        <View style={styles.categoryCountContainer}>
          <Text style={[styles.categoryCount, isSelected && styles.selectedCategoryCount]}>
            {item.count || 0}
          </Text>
        </View>
      </TouchableOpacity>
    );
  });

  if (isInitialLoading) {
    return (
      <LinearGradient colors={['#0a0e1a', '#12182e', '#1a2440']} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>{loadingMessage}</Text>
        <Text style={styles.loadingSubtext}>Veuillez patienter...</Text>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.rootContainer}>
      <LinearGradient colors={['#0a0e1a', '#12182e', '#1a2440']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {selectedCategoryName}
        </Text>
        <View style={styles.headerActions}>
          {!sidebarVisible && (
            <TouchableOpacity
              style={styles.headerSidebarButton}
              onPress={() => setSidebarVisible(true)}>
              <Icon name="menu" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => setSearchVisible(true)}>
            <Icon name="search" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowOptionsMenu(true)}>
            <Icon name="more-vert" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Sidebar catégories */}
        {sidebarVisible && (
          <View style={styles.sidebar}>
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarTitle}>{tChannels('categories')}</Text>
              <TouchableOpacity
                style={styles.sidebarCloseButton}
                onPress={() => setSidebarVisible(false)}>
                <Icon name="close" size={18} color="rgba(255, 255, 255, 0.7)" />
              </TouchableOpacity>
            </View>
            <FlashList
              data={categories}
              renderItem={({item}) => <CategoryItem item={item} isSelected={selectedCategory === item.category_id} />}
              extraData={selectedCategory}
              keyExtractor={item => `cat_${item.id}`}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.categoriesList}
              estimatedItemSize={50}
            />
          </View>
        )}

        {/* Grille de séries - FlashList ultra-performante */}
        <View style={styles.seriesContainer}>
          <FlashList
            key={`series-flash-${columns}`}
            data={filteredSeries}
            renderItem={renderSeriesItem}
            extraData={{favoriteIds, hideSeriesNames}}
            keyExtractor={item => item.id}
            numColumns={columns}
            estimatedItemSize={cardHeight + 12}
            contentContainerStyle={styles.seriesGrid}
            onEndReached={loadMoreSeries}
            onEndReachedThreshold={4}
            drawDistance={cardHeight * 15}
            overrideItemLayout={(layout, item, index, maxColumns) => {
              layout.size = cardHeight + 12;
            }}
            ListFooterComponent={
              seriesState.isLoadingMore ? (
                <View style={styles.loadingMore}>
                  <ActivityIndicator size="small" color="#8B5CF6" />
                  <Text style={styles.loadingMoreText}>Chargement...</Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="tv" size={64} color="#666" />
                <Text style={styles.emptyText}>{tChannels('noSeriesAvailable')}</Text>
              </View>
            }
          />
        </View>
      </View>
        </LinearGradient>

      {/* Menu d'options (3 points) - Version dropdown compacte avec effet flou */}
      {showOptionsMenu && (
        <View style={styles.dropdownBlurOverlay}>
          {Platform.OS === 'ios' && (
            <BlurView
              style={StyleSheet.absoluteFill}
              blurType="dark"
              blurAmount={5}
            />
          )}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowOptionsMenu(false)}
          />
          <View style={styles.dropdownContainer}>
            <View style={[styles.dropdownMenu, {backgroundColor: 'rgba(30, 41, 64, 0.95)'}]}>
              <TouchableOpacity
                style={styles.dropdownItem}
                activeOpacity={0.7}
                onPress={() => {
                  setHideSeriesNames(!hideSeriesNames);
                  setShowOptionsMenu(false);
                }}>
                <Icon
                  name={hideSeriesNames ? 'visibility' : 'visibility-off'}
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={[styles.dropdownText, {color: '#FFFFFF'}]}>
                  {hideSeriesNames ? 'Afficher les titres' : 'Masquer les titres'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dropdownItem}
                activeOpacity={0.7}
                onPress={() => {
                  setShowOptionsMenu(false);
                  setShowSortModal(true);
                }}>
                <Icon name="sort" size={20} color="#FFFFFF" />
                <Text style={[styles.dropdownText, {color: '#FFFFFF'}]}>Trier</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Menu de tri - Sous-menu avec effet flou */}
      {showSortModal && (
        <View style={styles.sortModalBlurOverlay}>
          {Platform.OS === 'ios' && (
            <BlurView
              style={StyleSheet.absoluteFill}
              blurType="dark"
              blurAmount={5}
            />
          )}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowSortModal(false)}
          />
          <View style={styles.sortModalContainer}>
            <View style={[styles.sortDropdownMenu, {backgroundColor: 'rgba(30, 41, 64, 0.95)'}]}>
              {/* Header simplifié */}
              <View style={styles.sortDropdownHeader}>
                <Icon name="sort" size={20} color="#FFFFFF" />
                <Text style={[styles.sortDropdownTitle, {color: '#FFFFFF'}]}>Trier</Text>
              </View>

              <View style={[styles.sortDropdownSeparator, {backgroundColor: 'rgba(255, 255, 255, 0.2)'}]} />

              {/* Options de tri simplifiées */}
              {[
                {key: 'default', label: 'Par défaut'},
                {key: 'az', label: 'Nom (A-Z)'},
                {key: 'za', label: 'Nom (Z-A)'},
              ].map(option => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.sortDropdownItem,
                    sortOption === option.key && styles.sortDropdownItemSelected,
                    {backgroundColor: sortOption === option.key ? 'rgba(139, 92, 246, 0.2)' : 'transparent'}
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setSortOption(option.key as any);
                    setShowSortModal(false);
                  }}>
                  <Icon
                    name={
                      option.key === 'default' ? 'list' :
                      option.key === 'az' ? 'sort-by-alpha' :
                      'sort-by-alpha'
                    }
                    size={18}
                    color={sortOption === option.key ? '#8B5CF6' : 'rgba(255, 255, 255, 0.7)'}
                  />
                  <Text style={[
                    styles.sortDropdownText,
                    {color: '#FFFFFF'},
                    sortOption === option.key && {color: '#8B5CF6', fontWeight: '600'}
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}

              <View style={[styles.sortDropdownSeparator, {backgroundColor: 'rgba(255, 255, 255, 0.2)'}]} />

              {/* Bouton Annuler */}
              <TouchableOpacity
                style={[styles.sortDropdownItem, styles.sortDropdownItemCancel]}
                activeOpacity={0.7}
                onPress={() => setShowSortModal(false)}>
                <Icon name="close" size={18} color="#FF6B6B" />
                <Text style={[styles.sortDropdownText, {color: '#FF6B6B'}]}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Modal de recherche - plein écran */}
      <Modal
        visible={searchVisible}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setSearchVisible(false)}>
        <FinalSearchScreen
          playlistId={playlistId}
          searchType="series"
          categoryId={selectedCategory}
          categoryName={selectedCategoryName}
          onClose={() => setSearchVisible(false)}
          onSeriesSelect={(series) => {
            setSearchVisible(false);
            navigation.navigate('SeriesDetailScreen', {series, playlistId});
          }}
        />
      </Modal>
    </View>
  );
};

// Styles (similaires à MoviesScreen)
const styles = StyleSheet.create({
  rootContainer: { flex: 1 },
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0e1a',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  loadingSubtext: {
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 8,
    fontSize: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: { padding: 6 },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerSidebarButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchButton: { padding: 6 },
  headerButton: { padding: 6 },
  mainContent: { flex: 1, flexDirection: 'row' },
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 8,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 4,
  },
  sidebarTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  sidebarCloseButton: {
    padding: 6,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoriesList: { paddingHorizontal: 6, paddingBottom: 20 },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 3,
  },
  selectedCategory: {
    backgroundColor: '#8B5CF6',
    borderLeftWidth: 5,
    borderLeftColor: '#7C3AED',
    borderRadius: 6,
    paddingLeft: 8,
  },
  categoryText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  selectedCategoryText: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  categoryCount: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  selectedCategoryCount: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  categoryCountContainer: { flexDirection: 'column', alignItems: 'flex-end' },
  seriesContainer: { flex: 1, backgroundColor: '#1a1a2e' },
  seriesGrid: { paddingHorizontal: 8, paddingVertical: 8 },
  seriesRow: {
    gap: 8,
  },
  seriesCard: {
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#333',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    marginBottom: 12,
  },
  seriesImageContainer: {
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#333',
    position: 'relative',
  },
  seriesImage: { width: '100%', height: '100%' },
  seriesImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#222',
  },
  ratingOverlay: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  favoriteOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 4,
    borderRadius: 12,
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '700',
  },
  seriesTitleContainer: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    minHeight: 36,
  },
  seriesTitle: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 11,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingMoreText: {
    color: '#FFFFFF',
    marginLeft: 10,
    fontSize: 14,
  },
  searchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  // Menu dropdown - copié depuis ChannelsScreen
  dropdownBlurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
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
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
    gap: 12,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  // Menu de tri
  sortModalBlurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
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
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});

export default SeriesScreen;
