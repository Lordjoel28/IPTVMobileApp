/**
 * 🎬 MoviesScreen ULTRA-RAPIDE - Architecture style TiviMate
 * SQLite natif + pagination + lazy loading = performances professionnelles
 */

import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
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
import type {VodMovie, VodCategory, RootStackParamList, XtreamCredentials, Profile, Channel} from '../../types';

type MoviesScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MoviesScreen'>;
type MoviesScreenRouteProp = RouteProp<RootStackParamList, 'MoviesScreen'>;

interface Props {
  navigation: MoviesScreenNavigationProp;
  route: MoviesScreenRouteProp;
}

const {width: screenWidth} = Dimensions.get('window');
const SIDEBAR_WIDTH = screenWidth * 0.30; // Taille équilibrée pour les catégories
const INITIAL_PAGE_SIZE = 100; // Chargement initial rapide
const PAGE_SIZE = 300; // Pages suivantes plus grandes

// Cache global pour éviter rechargement à chaque navigation
const moviesCache: Map<string, {
  categories: ExtendedCategory[];
  movies: VodMovie[];
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

interface MoviesState {
  movies: VodMovie[];
  page: number;
  hasMore: boolean;
  totalCount: number;
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
}

// 🚀 MovieCard extrait hors du composant parent pour éviter les re-créations
const MovieCard = React.memo(({
  item,
  cardWidth,
  cardHeight,
  isFavorite,
  hideMovieNames,
  onPress,
  onLongPress,
}: {
  item: VodMovie;
  cardWidth: number;
  cardHeight: number;
  isFavorite: boolean;
  hideMovieNames: boolean;
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
      style={[styles.movieCard, {
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
      <View style={[styles.movieImageContainer, { width: cardWidth, height: cardHeight }]}>
        {item.cover_url ? (
          <FastImage
            source={{uri: item.cover_url, priority: FastImage.priority.normal}}
            style={styles.movieImage}
            resizeMode={FastImage.resizeMode.cover}
            cacheControl={FastImage.cacheControl.immutable}
          />
        ) : (
          <View style={styles.movieImagePlaceholder}>
            <Icon name="movie" size={20} color="#666" />
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

        {!hideMovieNames && (
          <View style={styles.movieTitleContainer}>
            <Text style={styles.movieTitle} numberOfLines={2}>
              {item.name}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Comparaison personnalisée pour éviter les re-renders inutiles
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.isFavorite === nextProps.isFavorite &&
    prevProps.hideMovieNames === nextProps.hideMovieNames &&
    prevProps.cardWidth === nextProps.cardWidth
  );
});

const MoviesScreen: React.FC<Props> = ({navigation, route}) => {
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
  const [totalMoviesCount, setTotalMoviesCount] = useState<number>(0);
  const [searchVisible, setSearchVisible] = useState(false);
  const [hideMovieNames, setHideMovieNames] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [sortOption, setSortOption] = useState<'default' | 'newest' | 'az' | 'za'>('default');
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // État paginé des films
  const [moviesState, setMoviesState] = useState<MoviesState>({
    movies: [],
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

  // Filtrer et trier les films selon la catégorie et l'option de tri
  const filteredMovies = useMemo(() => {
    let result = [...moviesState.movies];

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
        result.sort((a, b) => parseInt(b.movie_id || '0') - parseInt(a.movie_id || '0'));
        break;
      case 'default':
      default:
        // Ordre par défaut (ordre de la base de données)
        break;
    }

    return result;
  }, [moviesState.movies, sortOption]);

  // Ne plus rediriger automatiquement - afficher l'interface directement
  useEffect(() => {
    console.log('🎬 [MoviesScreen] Interface films rapide');

    // Vérifier le cache global
    const cached = moviesCache.get(playlistId);
    const cacheAge = cached ? Date.now() - cached.loadedAt : Infinity;
    const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

    if (cached && cacheAge < CACHE_TTL) {
      // Utiliser le cache
      console.log('⚡ [MoviesScreen] Utilisation du cache (age: ' + Math.round(cacheAge/1000) + 's)');
      setCategories(cached.categories);
      setTotalMoviesCount(cached.totalCount);
      setMoviesState(prev => ({
        ...prev,
        movies: cached.movies,
        totalCount: cached.totalCount,
        hasMore: cached.movies.length < cached.totalCount,
      }));
      setIsInitialLoading(false);
    } else {
      // Charger depuis SQLite/API
      loadMoviesFromDatabase();
    }
  }, [playlistId]);

  /**
   * 📥 Charger les films depuis SQLite déjà remplis
   */
  const loadMoviesFromDatabase = useCallback(async () => {
    console.log('📥 [MoviesScreen] Chargement films depuis SQLite...');
    setIsInitialLoading(true);
    setLoadingMessage('Initialisation...');

    try {
      // Récupérer le profil actif
      const profile = await ProfileService.getActiveProfile();
      setActiveProfile(profile);
      console.log(`👤 [MoviesScreen] Profil actif: ${profile?.name || 'Aucun'}`);

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
      console.log('🔧 [MoviesScreen] Initialisation SQLite...');
      setLoadingMessage('Initialisation de la base de données...');
      await FastSQLiteService.initializeDatabase();
      console.log('✅ [MoviesScreen] SQLite initialisé avec succès');

      // Vérifier si les données existent déjà
      console.log('📂 [MoviesScreen] Recherche catégories...');
      let dbCategories = await FastSQLiteService.getCategoriesWithCounts(playlistId, 'movie');
      console.log(`📂 [MoviesScreen] ${dbCategories.length} catégories trouvées`);

      // Vérifier si les films existent (pas seulement les catégories)
      let hasMovies = false;
      let totalCount = 0;
      let recentlyAddedCount = 0;
      if (dbCategories.length > 0) {
        const allMoviesResult = await FastSQLiteService.getAllMoviesPaginated(playlistId, 0, 1);
        totalCount = allMoviesResult.totalCount;
        hasMovies = totalCount > 0;

        // Récupérer le nombre réel de films récents
        const recentlyAddedResult = await FastSQLiteService.getRecentlyAddedMovies(playlistId, 0, 1);
        recentlyAddedCount = recentlyAddedResult.totalCount;

        console.log(`📂 [MoviesScreen] Films existants: ${hasMovies ? 'Oui' : 'Non'} (${totalCount})`);
        console.log(`📂 [MoviesScreen] Films récents: ${recentlyAddedCount}`);
      }

      if (dbCategories.length === 0 || !hasMovies) {
        console.log('🔄 [MoviesScreen] Aucune donnée trouvée - Chargement depuis API...');
        setLoadingMessage('Téléchargement des films...');
        // Si pas de données, charger depuis l'API
        await loadDataFromApi(creds);
        // Récupérer les catégories maintenant
        dbCategories = await FastSQLiteService.getCategoriesWithCounts(playlistId, 'movie');
        const allMoviesResult = await FastSQLiteService.getAllMoviesPaginated(playlistId, 0, 1);
        totalCount = allMoviesResult.totalCount;

        // Récupérer le nombre réel de films récents après l'import API
        const recentlyAddedResult = await FastSQLiteService.getRecentlyAddedMovies(playlistId, 0, 1);
        recentlyAddedCount = recentlyAddedResult.totalCount;

        console.log(`📂 [MoviesScreen] ${dbCategories.length} catégories chargées après API`);
        console.log(`📂 [MoviesScreen] Films récents après API: ${recentlyAddedCount}`);
      }

      setTotalMoviesCount(totalCount);

      // Récupérer le nombre de favoris pour ce profil
      let favoritesCount = 0;
      if (profile) {
        try {
          const favorites = await FavoritesService.getFavoriteChannelsByProfile(
            profile.id,
            playlistId
          );
          // Filtrer pour ne compter que les films (streamType === 'movie' ou non défini pour compatibilité)
          favoritesCount = favorites.filter(f => f.streamType === 'movie' || !f.streamType).length;
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
          type: 'movie',
          count: totalCount,
          isSpecial: true,
        },
        {
          id: SPECIAL_CATEGORIES.FAVORITES,
          category_id: SPECIAL_CATEGORIES.FAVORITES,
          category_name: 'Favoris',
          type: 'movie',
          count: favoritesCount,
          isSpecial: true,
        },
        {
          id: SPECIAL_CATEGORIES.RECENTLY_WATCHED,
          category_id: SPECIAL_CATEGORIES.RECENTLY_WATCHED,
          category_name: 'Récemment regardé',
          type: 'movie',
          count: 0, // TODO: Compter l'historique VOD du profil
          isSpecial: true,
        },
        {
          id: SPECIAL_CATEGORIES.RECENTLY_ADDED,
          category_id: SPECIAL_CATEGORIES.RECENTLY_ADDED,
          category_name: 'Récemment ajouté',
          type: 'movie',
          count: recentlyAddedCount, // Nombre réel de films récents
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

      // Charger les films et mettre en cache (taille initiale réduite pour rendu rapide)
      const result = await FastSQLiteService.getAllMoviesPaginated(playlistId, 0, INITIAL_PAGE_SIZE);
      setMoviesState(prev => ({
        ...prev,
        movies: result.movies,
        totalCount: result.totalCount,
        hasMore: result.hasMore,
        isLoading: false,
      }));

      // Sauvegarder dans le cache global
      moviesCache.set(playlistId, {
        categories: allCategories,
        movies: result.movies,
        totalCount: totalCount,
        loadedAt: Date.now(),
      });

      console.log('💾 [MoviesScreen] Cache mis à jour');

    } catch (error) {
      console.error('❌ [MoviesScreen] Erreur chargement:', error);
      showNotification('Erreur de chargement', 'error', 3000);
      setIsInitialLoading(false);
    }
  }, [playlistId, showNotification]);

  /**
   * 🔄 Charger les données depuis l'API si SQLite est vide
   */
  const loadDataFromApi = useCallback(async (creds: XtreamCredentials) => {
    console.log('🔄 [MoviesScreen] Début chargement API...');

    try {
      // Télécharger catégories et films
      setLoadingMessage('Téléchargement des catégories et films...');
      const [cats, allMovies] = await Promise.all([
        WatermelonXtreamService.getVodCategories(creds),
        WatermelonXtreamService.getVodStreams(creds)
      ]);

      console.log(`📥 [MoviesScreen] ${cats.length} catégories et ${allMovies.length} films reçus`);
      setLoadingMessage(`Sauvegarde de ${allMovies.length} films...`);

      // Insertion dans SQLite
      await FastSQLiteService.insertCategories(playlistId, cats.map(c => ({...c, type: 'movie'})));
      setLoadingMessage(`Sauvegarde en cours... (${allMovies.length} films)`);
      await FastSQLiteService.insertMovies(playlistId, allMovies);

      console.log('✅ [MoviesScreen] Données importées avec succès');
      setLoadingMessage('Finalisation...');

    } catch (error) {
      console.error('❌ [MoviesScreen] Erreur chargement API:', error);
      throw error;
    }
  }, [playlistId]);

  /**
   * ⚡ Charger les films d'une catégorie avec pagination
   */
  const loadMoviesForCategory = useCallback(async (categoryId: string, page: number = 0, append: boolean = false) => {
    // État de chargement
    if (append) {
      setMoviesState(prev => ({ ...prev, isLoadingMore: true }));
    } else {
      setMoviesState(prev => ({ ...prev, isLoading: true, movies: [], page: 0 }));
    }

    try {
      console.log(`📥 Chargement catégorie ${categoryId}, page ${page}`);

      let result: {movies: VodMovie[], hasMore: boolean, totalCount: number};

      // Gérer les catégories spéciales
      switch (categoryId) {
        case SPECIAL_CATEGORIES.ALL:
          result = await FastSQLiteService.getAllMoviesPaginated(playlistId, page, PAGE_SIZE);
          break;

        case SPECIAL_CATEGORIES.RECENTLY_ADDED:
          result = await FastSQLiteService.getRecentlyAddedMovies(playlistId, page, PAGE_SIZE);
          break;

        case SPECIAL_CATEGORIES.FAVORITES:
          // Charger les favoris films du profil actif
          // Récupérer le profil directement pour éviter les problèmes de timing
          const currentProfile = activeProfile || await ProfileService.getActiveProfile();
          if (currentProfile) {
            try {
              const favorites = await FavoritesService.getFavoriteChannelsByProfile(
                currentProfile.id,
                playlistId
              );
              console.log(`📥 [MoviesScreen] Favoris bruts: ${favorites.length}`, favorites.map(f => ({name: f.name, streamType: f.streamType})));
              // Filtrer uniquement les films et convertir en VodMovie
              // Si streamType n'est pas défini, on accepte tous les favoris (compatibilité)
              const favoriteMovies = favorites
                .filter(f => f.streamType === 'movie' || !f.streamType)
                .map(f => ({
                  id: f.id,
                  name: f.name,
                  stream_url: f.url || f.streamUrl || '',
                  cover_url: f.logo || f.logoUrl || '',
                  category_id: '',
                  category_name: f.category || f.group || '',
                  movie_id: f.tvgId || '',
                  rating: '',
                  plot: '',
                  director: '',
                  cast: '',
                  genre: '',
                  releaseDate: '',
                  duration: '',
                  year: '',
                  container_extension: '',
                })) as VodMovie[];
              console.log(`📥 [MoviesScreen] Films favoris filtrés: ${favoriteMovies.length}`);
              result = {
                movies: favoriteMovies,
                hasMore: false,
                totalCount: favoriteMovies.length,
              };
            } catch (error) {
              console.error('Erreur chargement favoris:', error);
              result = { movies: [], hasMore: false, totalCount: 0 };
            }
          } else {
            console.log('📥 [MoviesScreen] Pas de profil actif pour charger les favoris');
            result = { movies: [], hasMore: false, totalCount: 0 };
          }
          break;

        case SPECIAL_CATEGORIES.RECENTLY_WATCHED:
          // TODO: Implémenter avec le service d'historique VOD
          result = { movies: [], hasMore: false, totalCount: 0 };
          break;

        default:
          // Catégorie normale
          result = await FastSQLiteService.getMoviesPaginated(
            playlistId,
            categoryId,
            page,
            PAGE_SIZE
          );
          break;
      }

      setMoviesState(prev => ({
        movies: append ? [...prev.movies, ...result.movies] : result.movies,
        page,
        hasMore: result.hasMore,
        totalCount: result.totalCount,
        isLoading: false,
        isLoadingMore: false,
        isRefreshing: false,
      }));

      console.log(`✅ ${result.movies.length} films chargés (total: ${result.totalCount})`);

    } catch (error) {
      console.error(`❌ Erreur chargement catégorie ${categoryId}:`, error);
      setMoviesState(prev => ({ ...prev, isLoading: false, isLoadingMore: false }));
      showNotification('Erreur de chargement', 'error', 3000);
    }
  }, [playlistId, activeProfile, showNotification]);

  /**
   * Charger plus de films (scroll infini)
   */
  const loadMoreMovies = useCallback(() => {
    if (!moviesState.hasMore || moviesState.isLoadingMore || moviesState.isLoading) {
      return;
    }

    loadMoviesForCategory(selectedCategory, moviesState.page + 1, true);
  }, [selectedCategory, moviesState.hasMore, moviesState.isLoadingMore, moviesState.isLoading, moviesState.page, loadMoviesForCategory]);

  /**
   * Rafraîchissement
   */
  const onRefresh = useCallback(async () => {
    setMoviesState(prev => ({ ...prev, isRefreshing: true }));

    try {
      if (credentials) {
        await loadDataFromApi(credentials);
        await loadMoviesForCategory(selectedCategory, 0, false);
      }
    } catch (error) {
      console.error('❌ Erreur rafraîchissement:', error);
    } finally {
      setMoviesState(prev => ({ ...prev, isRefreshing: false }));
    }
  }, [credentials, selectedCategory, loadDataFromApi, loadMoviesForCategory]);

  /**
   * Sélection de catégorie
   */
  const onCategorySelect = useCallback((categoryId: string, categoryName: string) => {
    setSelectedCategory(categoryId);
    setSelectedCategoryName(categoryName);
    loadMoviesForCategory(categoryId, 0, false);
  }, [loadMoviesForCategory]);

  const getCategoryIcon = (name: string): string => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('action')) return 'sports-martial-arts';
    if (lowerName.includes('comedy')) return 'sentiment-very-satisfied';
    if (lowerName.includes('drama')) return 'theater-comedy';
    if (lowerName.includes('horror')) return 'mood-bad';
    if (lowerName.includes('sci-fi')) return 'rocket-launch';
    if (lowerName.includes('animation')) return 'animation';
    if (lowerName.includes('documentary')) return 'nature-people';
    if (lowerName.includes('romance')) return 'favorite-border';
    if (lowerName.includes('thriller')) return 'psychology';
    if (lowerName.includes('family')) return 'family-restroom';
    return 'movie';
  };

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
      console.error('❌ Erreur chargement favoris films:', error);
    }
  }, [activeProfile, playlistId]);

  // Charger les favoris quand le profil est chargé
  useEffect(() => {
    if (activeProfile) {
      loadFavorites();
    }
  }, [activeProfile, loadFavorites]);

  // ⭐ Toggle favori sur long press
  const toggleMovieFavorite = useCallback(async (movie: VodMovie) => {
    // Toujours récupérer le profil actif depuis le service pour éviter les problèmes de timing
    const currentProfile = activeProfile || await ProfileService.getActiveProfile();
    if (!currentProfile) {
      console.log('❌ Aucun profil actif disponible pour ajouter aux favoris');
      showNotification('Aucun profil actif', 'error', 3000);
      return;
    }

    try {
      // Convertir VodMovie en format Channel pour FavoritesService
      const movieAsChannel: Channel = {
        id: movie.id,
        name: movie.name,
        url: movie.stream_url,
        streamUrl: movie.stream_url,
        logo: movie.cover_url,
        logoUrl: movie.cover_url,
        group: movie.category_name || 'Films',
        groupTitle: movie.category_name || 'Films',
        category: movie.category_name || 'Films',
        tvgId: movie.movie_id,
        streamType: 'movie',
        isAdult: false,
        isFavorite: favoriteIds.has(movie.id),
      };

      const newIsFavorite = await FavoritesService.toggleFavorite(
        movieAsChannel,
        playlistId,
        currentProfile.id
      );

      // Vibration légère de feedback
      Vibration.vibrate(15);

      // Mettre à jour l'état local
      setFavoriteIds(prev => {
        const newSet = new Set(prev);
        if (newIsFavorite) {
          newSet.add(movie.id);
        } else {
          newSet.delete(movie.id);
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
      console.error('❌ Erreur toggle favori film:', error);
    }
  }, [activeProfile, playlistId, favoriteIds, showNotification]);

  // Fonction de rendu optimisée pour FlashList
  const renderMovieItem = useCallback(({item}: {item: VodMovie}) => (
    <MovieCard
      item={item}
      cardWidth={cardWidth}
      cardHeight={cardHeight}
      isFavorite={favoriteIds.has(item.id)}
      hideMovieNames={hideMovieNames}
      onPress={() => navigation.navigate('MovieDetailScreen', {movie: item, playlistId})}
      onLongPress={() => toggleMovieFavorite(item)}
    />
  ), [cardWidth, cardHeight, favoriteIds, hideMovieNames, navigation, playlistId, toggleMovieFavorite]);

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
        <ActivityIndicator size="large" color="#00CCFF" />
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

        {/* Grille de films - FlashList ultra-performante */}
        <View style={styles.moviesContainer}>
          <FlashList
            key={`movies-flash-${columns}`}
            data={filteredMovies}
            renderItem={renderMovieItem}
            extraData={{favoriteIds, hideMovieNames}}
            keyExtractor={item => item.id}
            numColumns={columns}
            estimatedItemSize={cardHeight + 12}
            contentContainerStyle={styles.moviesGrid}
            onEndReached={loadMoreMovies}
            onEndReachedThreshold={4}
            drawDistance={cardHeight * 15}
            overrideItemLayout={(layout, item, index, maxColumns) => {
              layout.size = cardHeight + 12;
            }}
            ListFooterComponent={
              moviesState.isLoadingMore ? (
                <View style={styles.loadingMore}>
                  <ActivityIndicator size="small" color="#00CCFF" />
                  <Text style={styles.loadingMoreText}>Chargement...</Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="movie" size={64} color="#666" />
                <Text style={styles.emptyText}>{tChannels('noMoviesAvailable')}</Text>
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
                  setHideMovieNames(!hideMovieNames);
                  setShowOptionsMenu(false);
                }}>
                <Icon
                  name={hideMovieNames ? 'visibility' : 'visibility-off'}
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={[styles.dropdownText, {color: '#FFFFFF'}]}>
                  {hideMovieNames ? 'Afficher les titres' : 'Masquer les titres'}
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
                    {backgroundColor: sortOption === option.key ? 'rgba(0, 204, 255, 0.2)' : 'transparent'}
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
                    color={sortOption === option.key ? '#00CCFF' : 'rgba(255, 255, 255, 0.7)'}
                  />
                  <Text style={[
                    styles.sortDropdownText,
                    {color: '#FFFFFF'},
                    sortOption === option.key && {color: '#00CCFF', fontWeight: '600'}
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
          searchType="movies"
          categoryId={selectedCategory}
          categoryName={selectedCategoryName}
          onClose={() => setSearchVisible(false)}
          onMovieSelect={(movie) => {
            setSearchVisible(false);
            navigation.navigate('MovieDetailScreen', {movie, playlistId});
          }}
        />
      </Modal>
    </View>
  );
};

// Styles (similaires à l'original)
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
    backgroundColor: '#00CCFF',
    borderLeftWidth: 5,
    borderLeftColor: '#0099CC',
    borderRadius: 6,
    paddingLeft: 8,
  },
  categoryText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  selectedCategoryText: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  categoryCount: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  selectedCategoryCount: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  categoryCountContainer: { flexDirection: 'column', alignItems: 'flex-end' },
  moviesContainer: { flex: 1, backgroundColor: '#1a1a2e' },
  moviesGrid: { paddingHorizontal: 8, paddingVertical: 8 },
  movieRow: {
    gap: 8,
  },
  movieCard: {
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
  movieImageContainer: {
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#333',
    position: 'relative',
  },
  movieImage: { width: '100%', height: '100%' },
  movieImagePlaceholder: {
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
    backgroundColor: '#00CCFF',
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
  movieTitleContainer: {
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
  movieTitle: {
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

export default MoviesScreen;