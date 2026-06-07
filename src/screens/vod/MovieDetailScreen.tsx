/**
 * 🎬 MovieDetailScreen - Écran de détails des films
 * Design "Concept 2" (Dune) optimisé pour le mode paysage
 * Architecture robuste avec gestion complète des données manquantes
 * Style premium inspiré de IPTV Smarters Pro
 */

import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Vibration,
  ScrollView,
  ImageBackground,
  SafeAreaView,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {StackNavigationProp} from '@react-navigation/stack';
import type {RouteProp} from '@react-navigation/native';

import {useI18n} from '../../hooks/useI18n';
import {useUIStore} from '../../stores/UIStore';
import {usePlayerStore} from '../../stores/PlayerStore';
import FavoritesService from '../../services/FavoritesService';
import ProfileService from '../../services/ProfileService';
import WatermelonXtreamService from '../../services/WatermelonXtreamService';
import VODHybridService from '../../services/VODHybridService';
import VODHistoryService from '../../services/VODHistoryService';
import {database} from '../../database';
import {Q} from '@nozbe/watermelondb';
import type {RootStackParamList, Channel, VodMovie} from '../../types';
import type Playlist from '../../database/models/Playlist';
import type VodMovieModel from '../../database/models/VodMovie';

// === Types ===
type MovieDetailScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'MovieDetailScreen'
>;
type MovieDetailScreenRouteProp = RouteProp<
  RootStackParamList,
  'MovieDetailScreen'
>;

interface Props {
  route: MovieDetailScreenRouteProp;
}

// === Constants ===
const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');
const IS_LANDSCAPE = SCREEN_WIDTH > SCREEN_HEIGHT;

// === Component ===
const MovieDetailScreen: React.FC<Props> = ({route}) => {
  const {movie, playlistId} = route.params;
  const insets = useSafeAreaInsets();
  const {t: tCommon} = useI18n('common');
  const {showNotification} = useUIStore();
  const {actions: playerActions} = usePlayerStore();

  const [isFavorite, setIsFavorite] = useState(false);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [enrichedMovie, setEnrichedMovie] = useState<VodMovie>(movie);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);

  // Configuration de la StatusBar pour le thème sombre
  useEffect(() => {
    StatusBar.setBarStyle('light-content');
  }, []);

  // Transformer le cast (string) en tableau - utiliser enrichedMovie au lieu de movie
  const castArray = React.useMemo(() => {
    if (!enrichedMovie.cast || typeof enrichedMovie.cast !== 'string') return [];
    // Le cast peut être séparé par virgules ou par des retours à la ligne
    return enrichedMovie.cast
      .split(/,|\n/)
      .map(actor => actor.trim())
      .filter(actor => actor.length > 0);
  }, [enrichedMovie.cast]);

  // Debug : Afficher les données du film et type de source
  useEffect(() => {
    console.log('🎬 MOVIE DATA:', {
      name: movie.name,
      release_date: movie.release_date,
      genre: movie.genre,
      duration: movie.duration,
      rating: movie.rating,
      plot: movie.plot?.substring(0, 50) + '...',
      cast: movie.cast,
      director: movie.director,
      container_extension: movie.container_extension,
      backdrop_url: movie.backdrop_url,
      movie_id: movie.movie_id,
      category_id: movie.category_id,
    });

    // Détection du type de source
    const hasXtreamFields = !!(
      movie.movie_id &&
      movie.category_id &&
      movie.added
    );

    console.log('🔍 SOURCE TYPE:', hasXtreamFields ? 'Xtream Codes API' : 'M3U Playlist simple');

    if (!hasXtreamFields) {
      console.log('⚠️ Les métadonnées riches ne sont pas disponibles - Source M3U détectée');
    }
  }, [movie]);

  useEffect(() => {
    const loadData = async () => {
      const profile = await ProfileService.getActiveProfile();
      if (profile) {
        setActiveProfileId(profile.id);
        checkIfFavorite(profile.id);
      }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movie.id, playlistId]);

  // 🚀 Charger les métadonnées détaillées (avec cache DB intelligent)
  useEffect(() => {
    const loadMovieMetadata = async () => {
      // Vérifier si les métadonnées sont déjà présentes dans le prop
      const hasMetadata = !!(
        movie.genre &&
        movie.cast &&
        movie.director &&
        movie.release_date &&
        movie.rating
      );

      if (hasMetadata) {
        console.log('✅ Métadonnées déjà présentes dans le prop');
        return;
      }

      // Vérifier si c'est une source Xtream Codes
      const isXtreamSource = !!(movie.movie_id && movie.category_id);
      if (!isXtreamSource) {
        console.log('⚠️ Source non-Xtream, impossible de charger les métadonnées');
        return;
      }

      try {
        setIsLoadingMetadata(true);

        // 1️⃣ ÉTAPE 1: Vérifier d'abord en DB (CACHE)
        console.log('💾 Vérification cache DB pour film:', movie.movie_id);
        const cachedMovies = await database
          .get<VodMovieModel>('vod_movies')
          .query(
            Q.where('playlist_id', playlistId),
            Q.where('movie_id', movie.movie_id)
          )
          .fetch();

        if (cachedMovies.length > 0) {
          const cachedMovie = cachedMovies[0];
          // Vérifier si les métadonnées du cache sont complètes
          const cacheHasMetadata = !!(
            cachedMovie.genre &&
            cachedMovie.cast &&
            cachedMovie.director
          );

          if (cacheHasMetadata) {
            console.log('⚡ Métadonnées trouvées dans le cache DB (0 appel API)');
            setEnrichedMovie({
              ...movie,
              genre: cachedMovie.genre,
              cast: cachedMovie.cast,
              director: cachedMovie.director,
              duration: cachedMovie.duration,
              rating: cachedMovie.rating,
              release_date: cachedMovie.releaseDate,
              plot: cachedMovie.plot,
            });
            setIsLoadingMetadata(false);
            return; // ✅ SORTIE RAPIDE - Pas besoin d'appel API !
          }
        }

        // 2️⃣ ÉTAPE 2: Cache vide ou incomplet → Appel API Xtream
        console.log('🌐 Cache vide, appel API pour film:', movie.movie_id);

        // Récupérer les credentials Xtream depuis la playlist
        const playlistCollection = database.get<Playlist>('playlists');
        const playlist = await playlistCollection.find(playlistId);

        // Vérifier si la playlist a des credentials Xtream
        if (!playlist.server || !playlist.username || !playlist.password) {
          console.warn('⚠️ Playlist sans credentials Xtream');
          return;
        }

        const credentials = {
          url: playlist.server,
          username: playlist.username,
          password: playlist.password,
        };

        // Appeler l'API Xtream pour récupérer les métadonnées complètes
        const detailedMovie = await WatermelonXtreamService.getVodInfo(
          credentials,
          movie.movie_id,
        );

        if (detailedMovie) {
          console.log('✅ Métadonnées chargées depuis API:', {
            genre: detailedMovie.genre,
            cast: detailedMovie.cast?.substring(0, 50),
            director: detailedMovie.director,
          });

          // 3️⃣ ÉTAPE 3: Sauvegarder en DB pour la prochaine fois (CACHE)
          await VODHybridService.updateMovieMetadata(playlistId, movie.movie_id, detailedMovie);
          console.log('💾 Métadonnées sauvegardées dans le cache DB');

          // Mettre à jour l'état avec les métadonnées enrichies
          setEnrichedMovie(detailedMovie);
        } else {
          console.warn('⚠️ Aucune métadonnée retournée par l\'API');
        }
      } catch (error) {
        console.error('❌ Erreur chargement métadonnées:', error);
      } finally {
        setIsLoadingMetadata(false);
      }
    };

    loadMovieMetadata();
  }, [movie.movie_id, movie.category_id, playlistId, movie.genre, movie.cast, movie.director, movie.release_date, movie.rating]);

  const checkIfFavorite = useCallback(
    async (profileId: string) => {
      try {
        const favorites = await FavoritesService.getFavoriteChannelsByProfile(
          profileId,
          playlistId,
        );
        const isFav = favorites.some(
          fav => fav.id === movie.id || fav.tvgId === movie.movie_id,
        );
        setIsFavorite(isFav);
      } catch (error) {
        console.error('Erreur vérification favori:', error);
      }
    },
    [movie.id, movie.movie_id, playlistId],
  );

  const toggleFavorite = useCallback(async () => {
    if (!activeProfileId) {
      const currentProfile = await ProfileService.getActiveProfile();
      if (!currentProfile) {
        showNotification(tCommon('noActiveProfile'), 'error', 3000);
        return;
      }
      setActiveProfileId(currentProfile.id);
    }

    Vibration.vibrate(15);

    try {
      const movieChannel: Channel = {
        id: movie.id,
        name: movie.name,
        url: movie.stream_url,
        streamUrl: movie.stream_url,
        logo: movie.cover_url,
        logoUrl: movie.cover_url,
        group: movie.category_name || tCommon('movies'),
        groupTitle: movie.category_name || tCommon('movies'),
        category: movie.category_name || tCommon('movies'),
        tvgId: movie.movie_id,
        streamType: 'movie',
        isAdult: false,
        isFavorite: isFavorite,
      };

      const profileToUse =
        activeProfileId || (await ProfileService.getActiveProfile())?.id;
      if (!profileToUse) {
        showNotification(tCommon('noActiveProfile'), 'error', 3000);
        return;
      }
      const newStatus = await FavoritesService.toggleFavorite(
        movieChannel,
        playlistId,
        profileToUse,
      );
      setIsFavorite(newStatus);
      showNotification(
        newStatus
          ? tCommon('addedToFavorites')
          : tCommon('removedFromFavorites'),
        newStatus ? 'success' : 'info',
        2000,
      );
    } catch (error) {
      console.error('Erreur toggle favori:', error);
      showNotification(tCommon('errorUpdatingFavorites'), 'error', 3000);
    }
  }, [
    activeProfileId,
    movie,
    playlistId,
    isFavorite,
    showNotification,
    tCommon,
  ]);

  const handlePlay = useCallback(async () => {
    try {
      // Définir le playlistId dans le PlayerStore
      playerActions.setPlaylistId(playlistId);

      // Créer l'objet channel pour le film
      const movieChannel: Channel = {
        id: movie.id,
        name: movie.name,
        url: movie.stream_url,
        logo: movie.cover_url,
        group: movie.category_name || tCommon('movies'),
        category: movie.category_name || tCommon('movies'),
        tvgId: movie.movie_id,
        isAdult: false,
        contentType: 'movie',
      };

      // Lancer la lecture avec le GlobalVideoPlayer
      playerActions.playChannel(movieChannel, true); // true pour démarrer en fullscreen

      // Enregistrer dans l'historique VOD (fire & forget)
      if (activeProfileId) {
        VODHistoryService.addMovieToHistory(
          enrichedMovie,
          playlistId,
          activeProfileId,
        ).catch(err =>
          console.error('❌ Erreur ajout historique film:', err),
        );
      }

      showNotification(tCommon('playing') + ' ' + movie.name, 'success', 2000);
    } catch (error) {
      console.error('❌ Erreur lors du lancement du film:', error);
      showNotification(tCommon('errorPlayingVideo'), 'error', 3000);
    }
  }, [movie, enrichedMovie, playlistId, activeProfileId, isFavorite, tCommon, showNotification, playerActions]);

  const handleTrailer = useCallback(() => {
    showNotification(tCommon('noTrailerAvailable'), 'info', 2000);
  }, [showNotification, tCommon]);

  // === Render ===
  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      {/* Image de fond GLOBALE avec dégradé - ZOOM MODÉRÉ */}
      <ImageBackground
        source={{
          uri:
            enrichedMovie.backdrop_url ||
            enrichedMovie.cover_url ||
            'https://via.placeholder.com/800x450/1A1A1A/FFFFFF?text=Film',
        }}
        style={styles.backdropImageGlobal}
        resizeMode="cover"
        imageStyle={styles.backdropImageStyle}>
        <LinearGradient
          colors={[
            'rgba(26, 26, 26, 0.3)',
            'rgba(26, 26, 26, 0.7)',
            'rgba(26, 26, 26, 0.95)',
            '#1A1A1A',
          ]}
          locations={[0, 0.3, 0.6, 1]}
          style={styles.gradientOverlayGlobal}
        />
      </ImageBackground>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {paddingTop: insets.top + 20},
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Section Header du Film (Affiche + Infos + Boutons) */}
        <View style={styles.headerContainer}>
          {/* Affiche du film - PLUS GRANDE ET PLUS HAUTE */}
          <FastImage
            source={{
              uri:
                enrichedMovie.cover_url ||
                'https://via.placeholder.com/300x450/2A2A2A/FFFFFF?text=Film',
              priority: FastImage.priority.high,
            }}
            style={styles.posterImage}
            resizeMode={FastImage.resizeMode.cover}
          />

          {/* Bloc d'informations */}
          <View style={styles.infoContainer}>
            {/* Titre du film */}
            <Text style={styles.movieTitle} numberOfLines={2}>
              {enrichedMovie.name || tCommon('unknown')}
            </Text>

            {/* Métadonnées (Année, Genre, Durée) */}
            <View style={styles.metadataRow}>
              {enrichedMovie.release_date && (
                <Text style={styles.metadataText}>
                  {enrichedMovie.release_date.substring(0, 4)}
                </Text>
              )}
              {enrichedMovie.release_date && enrichedMovie.genre && (
                <Text style={styles.metadataSeparator}>•</Text>
              )}
              {enrichedMovie.genre && (
                <Text style={styles.metadataText}>{enrichedMovie.genre}</Text>
              )}
              {enrichedMovie.duration && (enrichedMovie.genre || enrichedMovie.release_date) && (
                <Text style={styles.metadataSeparator}>•</Text>
              )}
              {enrichedMovie.duration && (
                <Text style={styles.metadataText}>{enrichedMovie.duration}</Text>
              )}
              {(enrichedMovie.release_date || enrichedMovie.genre || enrichedMovie.duration) &&
                enrichedMovie.rating && <Text style={styles.metadataSeparator}>•</Text>}
              {enrichedMovie.rating && (
                <View style={styles.ratingInline}>
                  <Icon name="star" size={14} color="#FFD700" />
                  <Text style={styles.ratingTextInline}>
                    IMDb {enrichedMovie.rating}/10
                  </Text>
                </View>
              )}
            </View>

            {/* Boutons d'action */}
            <View style={styles.buttonContainer}>
              {/* Bouton Lecture */}
              <TouchableOpacity
                style={styles.playButton}
                onPress={handlePlay}
                activeOpacity={0.8}>
                <Icon name="play-circle" size={24} color="white" />
                <Text style={styles.playButtonText}>{tCommon('play')}</Text>
              </TouchableOpacity>

              {/* Bouton Bande-annonce */}
              <TouchableOpacity
                style={styles.trailerButton}
                onPress={handleTrailer}
                activeOpacity={0.8}>
                <Icon name="film-outline" size={24} color="white" />
                <Text style={styles.trailerButtonText}>
                  {tCommon('trailer')}
                </Text>
              </TouchableOpacity>

              {/* Bouton Favoris */}
              <TouchableOpacity
                style={[
                  styles.favoriteButtonInline,
                  isFavorite && styles.favoriteButtonActive,
                ]}
                onPress={toggleFavorite}
                activeOpacity={0.8}>
                <Icon
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={24}
                  color={isFavorite ? '#FF3B30' : 'white'}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Séparateur */}
        <View style={styles.divider} />

        {/* Sections Contenu (Synopsis & Casting côte à côte) */}
        <View style={styles.cardsContainer}>
          {/* Carte Synopsis */}
          <View style={styles.synopsisCard}>
            <Text style={styles.cardTitle}>{tCommon('synopsis').toUpperCase()}</Text>
            <Text style={styles.cardContent}>
              {enrichedMovie.plot || tCommon('noSynopsisAvailable')}
            </Text>
          </View>

          {/* Carte Casting */}
          <View style={styles.castingCard}>
            <Text style={styles.cardTitle}>{tCommon('casting').toUpperCase()}</Text>
            {castArray.length > 0 ? (
              castArray.map((actor: string, index: number) => (
                <Text key={index} style={styles.castMember}>
                  {actor}
                </Text>
              ))
            ) : (
              <Text style={styles.cardContent}>
                {tCommon('noCastingAvailable') ||
                  'Informations sur le casting non disponibles.'}
              </Text>
            )}

            {/* Info Directeur (si présent) */}
            {enrichedMovie.director && (
              <View style={styles.directorInfo}>
                <Text style={styles.directorLabel}>{tCommon('director')}:</Text>
                <Text style={styles.directorValue}>{enrichedMovie.director}</Text>
              </View>
            )}


          </View>
        </View>
      </ScrollView>
    </View>
  );
};

// === Styles ===
const styles = StyleSheet.create({
  // Container principal
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },

  // Image de fond GLOBALE (moins zoomée avec contain)
  backdropImageGlobal: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  backdropImageStyle: {
    opacity: 0.6, // Légère transparence pour ne pas surcharger
  },
  gradientOverlayGlobal: {
    flex: 1,
  },

  // Barre de navigation (Favoris centré)
  navBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
    paddingHorizontal: IS_LANDSCAPE ? 40 : 20,
  },

  // Section Header (Affiche + Infos + Boutons)
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },

  // Affiche du film - BEAUCOUP PLUS GRANDE
  posterImage: {
    width: IS_LANDSCAPE ? 220 : 180,
    height: IS_LANDSCAPE ? 330 : 280,
    borderRadius: 16,
    marginRight: 20,
    backgroundColor: '#2A2A2A',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 12},
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 16,
  },

  // Bloc d'informations
  infoContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  movieTitle: {
    fontSize: IS_LANDSCAPE ? 32 : 26,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20, // Increased padding between title and metadata
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 4,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10, // Adjusted for better space
    flexWrap: 'wrap',
  },
  metadataText: {
    fontSize: 15,
    color: '#E0E0E0',
    fontWeight: '500',
  },
  metadataSeparator: {
    fontSize: 15,
    color: '#E0E0E0',
    marginHorizontal: 10,
  },

  // Rating IMDb inline
  ratingInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  ratingTextInline: {
    fontSize: 15,
    color: '#FFD700',
    marginLeft: 4,
    fontWeight: '600',
  },

  // Boutons d'action
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  playButton: {
    backgroundColor: '#007AFF',
    borderRadius: 28,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#007AFF',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  playButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
  trailerButton: {
    backgroundColor: 'rgba(58, 58, 58, 0.9)',
    borderRadius: 28,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  trailerButtonText: {
    color: 'white',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  favoriteButtonInline: {
    backgroundColor: 'rgba(58, 58, 58, 0.9)',
    borderRadius: 28,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  favoriteButtonActive: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderColor: '#FF3B30',
  },

  // Séparateur
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 20,
  },

  // Sections Contenu (Synopsis & Casting) - Style simple sans effet de carte
  cardsContainer: {
    flexDirection: IS_LANDSCAPE ? 'row' : 'column',
    justifyContent: 'space-between',
    gap: IS_LANDSCAPE ? 24 : 0,
  },
  synopsisCard: {
    padding: 0,
    flex: IS_LANDSCAPE ? 1 : undefined,
    marginBottom: 24,
  },
  castingCard: {
    padding: 0,
    flex: IS_LANDSCAPE ? 1 : undefined,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 18,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cardContent: {
    fontSize: 16,
    color: '#E0E0E0',
    lineHeight: 26,
    textAlign: 'justify',
  },
  castMember: {
    fontSize: 16,
    color: '#E0E0E0',
    marginBottom: 10,
    lineHeight: 24,
    paddingLeft: 8,
  },

  // Info Directeur - Style Material amélioré
  directorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 2,
    borderTopColor: 'rgba(255, 152, 0, 0.3)',
  },
  directorLabel: {
    fontSize: 15,
    color: '#BBB',
    marginRight: 12,
    fontWeight: '500',
  },
  directorValue: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
    flex: 1,
  },

  // Info Format - Style Material amélioré
  formatInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  formatLabel: {
    fontSize: 15,
    color: '#BBB',
    marginRight: 12,
    fontWeight: '500',
  },
  formatValue: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 1.2,
  },
});

export default MovieDetailScreen;
