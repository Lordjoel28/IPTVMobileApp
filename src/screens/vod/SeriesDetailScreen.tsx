/**
 * 📺 Écran de Détail d'une Série
 * Affiche les informations complètes de la série et les saisons
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
} from 'react-native';
import type {StackNavigationProp} from '@react-navigation/stack';
import type {RouteProp} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import {useI18n} from '../../hooks/useI18n';
import {useUIStore} from '../../stores/UIStore';
import WatermelonXtreamService from '../../services/WatermelonXtreamService';
import type {VodSeries, VodSeason, VodEpisode, RootStackParamList} from '../../types';

type SeriesDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SeriesDetailScreen'>;
type SeriesDetailScreenRouteProp = RouteProp<RootStackParamList, 'SeriesDetailScreen'>;

interface Props {
  navigation: SeriesDetailScreenNavigationProp;
  route: SeriesDetailScreenRouteProp;
}

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');
const backdropHeight = screenHeight * 0.4;

// Cache global pour les détails de séries (évite refetch à chaque clic)
const seriesDetailsCache: Map<string, {
  data: { series: VodSeries; seasons: VodSeason[] };
  loadedAt: number;
}> = new Map();

const SeriesDetailScreen: React.FC<Props> = ({navigation, route}) => {
  const {t: tCommon} = useI18n('common');
  const {t: tPlayer} = useI18n('player');
  const {t: tChannels} = useI18n('channels');

  const {showNotification} = useUIStore();

  const {series, playlistId} = route.params;
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [seriesData, setSeriesData] = useState<{
    series: VodSeries;
    seasons: VodSeason[];
  } | null>(null);
  const [expandedSeasons, setExpandedSeasons] = useState<Set<string>>(new Set());

  useEffect(() => {
    navigation.setOptions({
      title: series.name,
      headerStyle: {
        backgroundColor: 'transparent',
      },
      headerTintColor: '#FFFFFF',
      headerTransparent: true,
    });

    loadSeriesDetails();
  }, [navigation, series.name]);

  const loadSeriesDetails = async (forceRefresh: boolean = false) => {
    const cacheKey = `${playlistId}_${series.series_id}`;
    const cached = seriesDetailsCache.get(cacheKey);
    const cacheAge = cached ? Date.now() - cached.loadedAt : Infinity;
    const CACHE_TTL = 60 * 60 * 1000; // 1 heure

    // Utiliser le cache si disponible et pas forcé
    if (!forceRefresh && cached && cacheAge < CACHE_TTL) {
      console.log('⚡ [SeriesDetail] Utilisation du cache (age: ' + Math.round(cacheAge/1000) + 's)');
      setSeriesData(cached.data);
      if (cached.data.seasons.length > 0) {
        setExpandedSeasons(new Set([cached.data.seasons[0].season_id]));
      }
      return;
    }

    setLoading(true);
    try {
      // Récupérer les informations de la playlist depuis WatermelonDB
      const database = await import('../../database');
      const {Playlist} = await import('../../database/models');

      const playlist = await database.default
        .get<typeof Playlist>('playlists')
        .find(playlistId);

      if (!playlist || playlist.type !== 'XTREAM') {
        throw new Error('Cette playlist n\'est pas une playlist Xtream Codes');
      }

      const credentials = {
        url: playlist.server,
        username: playlist.username,
        password: playlist.password,
      };

      // Charger les détails complets de la série
      const data = await WatermelonXtreamService.getSeriesInfo(credentials, series.series_id);
      setSeriesData(data);

      // Sauvegarder dans le cache
      seriesDetailsCache.set(cacheKey, {
        data,
        loadedAt: Date.now(),
      });
      console.log('💾 [SeriesDetail] Cache mis à jour');

      // Développer la première saison par défaut
      if (data.seasons.length > 0) {
        setExpandedSeasons(new Set([data.seasons[0].season_id]));
      }
    } catch (error) {
      console.error('❌ Erreur chargement détails série:', error);
      showNotification('Erreur lors du chargement des détails', 'error', 5000);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSeriesDetails(true); // Force refresh
    setRefreshing(false);
  };

  const toggleSeason = (seasonId: string) => {
    setExpandedSeasons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(seasonId)) {
        newSet.delete(seasonId);
      } else {
        newSet.add(seasonId);
      }
      return newSet;
    });
  };

  const handlePlayEpisode = (episode: VodEpisode, season: VodSeason) => {
    console.log('📺 Lecture de l\'épisode:', episode.name);
    console.log('📺 Saison:', season.season_number, 'Épisode:', episode.episode_number);

    try {
      // Créer un objet canal compatible avec le lecteur
      const episodeChannel = {
        id: episode.id,
        name: `${series.name} - S${String(season.season_number).padStart(2, '0')}E${String(episode.episode_number).padStart(2, '0')} - ${episode.name}`,
        url: episode.stream_url,
        logo: series.cover_url || '',
        category: series.category_name,
        isHighlighted: false,
        // Ajouter des métadonnées pour le lecteur
        streamType: 'episode' as const,
        contentType: 'series' as const,
      };

      // Lancer le lecteur avec l'épisode
      navigation.navigate('Player', {channel: episodeChannel});

      showNotification(`Lecture de "S${season.season_number}E${episode.episode_number}"`, 'success', 3000);
    } catch (error) {
      console.error('❌ Erreur lecture épisode:', error);
      showNotification('Erreur lors du démarrage de la lecture', 'error', 5000);
    }
  };

  const renderSeason = (season: VodSeason) => {
    const isExpanded = expandedSeasons.has(season.season_id);

    return (
      <View key={season.season_id} style={styles.seasonContainer}>
        <TouchableOpacity
          style={styles.seasonHeader}
          onPress={() => toggleSeason(season.season_id)}>
          <View style={styles.seasonInfo}>
            <Text style={styles.seasonTitle}>
              Saison {season.season_number}
            </Text>
            <Text style={styles.episodeCount}>
              {season.episodes_count} épisode{season.episodes_count > 1 ? 's' : ''}
            </Text>
          </View>
          <Icon
            name={isExpanded ? 'expand-less' : 'expand-more'}
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.episodesContainer}>
            {season.episodes.map(episode => (
              <TouchableOpacity
                key={episode.episode_id}
                style={styles.episodeItem}
                onPress={() => handlePlayEpisode(episode, season)}>
                <View style={styles.episodeThumbnail}>
                  {episode.stream_url ? (
                    <View style={styles.playIcon}>
                      <Icon name="play-arrow" size={20} color="#FFFFFF" />
                    </View>
                  ) : (
                    <Icon name="error" size={20} color="#FF6B35" />
                  )}
                </View>

                <View style={styles.episodeInfo}>
                  <Text style={styles.episodeTitle}>
                    Épisode {episode.episode_number}: {episode.name}
                  </Text>
                  {episode.duration && (
                    <Text style={styles.episodeDuration}>{episode.duration}</Text>
                  )}
                  {episode.air_date && (
                    <Text style={styles.episodeAirDate}>
                      Diffusé le: {new Date(episode.air_date).toLocaleDateString()}
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.episodePlayButton}
                  onPress={() => handlePlayEpisode(episode, season)}>
                  <Icon name="play-circle-filled" size={32} color="#00E5AA" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderCastList = (cast: string) => {
    if (!cast || cast.trim() === '') return null;

    const castArray = cast.split(',').map(actor => actor.trim()).filter(actor => actor.length > 0);

    return (
      <View style={styles.castSection}>
        <Text style={styles.sectionTitle}>Acteurs</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.castContainer}>
            {castArray.map((actor, index) => (
              <View key={index} style={styles.castItem}>
                <Text style={styles.castText}>{actor}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  if (loading && !seriesData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00E5AA" />
        <Text style={styles.loadingText}>Chargement des détails...</Text>
      </View>
    );
  }

  const displaySeries = seriesData?.series || series;
  const seasons = seriesData?.seasons || [];

  return (
    <View style={styles.container}>
      {/* Header avec backdrop */}
      <View style={styles.headerContainer}>
        {/* Image de fond (backdrop) */}
        {displaySeries.backdrop_url ? (
          <>
            <Image
              source={{uri: displaySeries.backdrop_url}}
              style={styles.backdropImage}
              resizeMode="cover"
              onLoad={() => setImageLoading(false)}
            />
            {imageLoading && (
              <View style={styles.imageLoadingOverlay}>
                <ActivityIndicator size="large" color="#00E5AA" />
              </View>
            )}
          </>
        ) : (
          <View style={styles.backdropPlaceholder}>
            <Icon name="tv" size={80} color="#666" />
          </View>
        )}

        {/* Overlay dégradé */}
        <LinearGradient
          colors={['transparent', 'rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.8)', '#0a0e1a']}
          locations={[0, 0.3, 0.7, 1]}
          style={styles.backdropOverlay}
        />

        {/* Bouton retour */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Contenu de la série */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00E5AA"
            colors={['#00E5AA']}
          />
        }>
        {/* Informations principales */}
        <View style={styles.mainInfo}>
          <Text style={styles.seriesTitle}>{displaySeries.name}</Text>

          <View style={styles.metadataRow}>
            {displaySeries.release_date && (
              <View style={styles.metadataItem}>
                <Icon name="calendar-today" size={16} color="#00E5AA" />
                <Text style={styles.metadataText}>
                  {new Date(displaySeries.release_date).getFullYear()}
                </Text>
              </View>
            )}

            {displaySeries.rating && (
              <View style={styles.metadataItem}>
                <Icon name="star" size={16} color="#FFD700" />
                <Text style={styles.metadataText}>{displaySeries.rating}</Text>
              </View>
            )}

            {seasons.length > 0 && (
              <View style={styles.metadataItem}>
                <Icon name="layers" size={16} color="#00E5AA" />
                <Text style={styles.metadataText}>{seasons.length} saison{seasons.length > 1 ? 's' : ''}</Text>
              </View>
            )}
          </View>

          {displaySeries.genre && (
            <View style={styles.genreContainer}>
              {displaySeries.genre.split(',').map((genre, index) => (
                <View key={index} style={styles.genreItem}>
                  <Text style={styles.genreText}>{genre.trim()}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Synopsis */}
        {displaySeries.plot && displaySeries.plot.trim() !== '' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Synopsis</Text>
            <Text style={styles.plotText}>{displaySeries.plot}</Text>
          </View>
        )}

        {/* Réalisateur */}
        {displaySeries.director && displaySeries.director.trim() !== '' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Réalisateur</Text>
            <Text style={styles.directorText}>{displaySeries.director}</Text>
          </View>
        )}

        {/* Acteurs */}
        {renderCastList(displaySeries.cast)}

        {/* Saisons */}
        {seasons.length > 0 && (
          <View style={styles.seasonsSection}>
            <Text style={styles.sectionTitle}>Saisons</Text>
            {seasons.sort((a, b) => a.season_number - b.season_number).map(renderSeason)}
          </View>
        )}

        {/* Espacement pour le padding */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 12,
    fontSize: 16,
  },
  headerContainer: {
    height: backdropHeight,
    position: 'relative',
  },
  backdropImage: {
    width: '100%',
    height: '100%',
  },
  backdropPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#222',
  },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdropOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: 8,
  },
  content: {
    flex: 1,
  },
  mainInfo: {
    padding: 20,
  },
  seriesTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    lineHeight: 28,
  },
  metadataRow: {
    flexDirection: 'row',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    marginBottom: 4,
  },
  metadataText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  genreContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  genreItem: {
    backgroundColor: 'rgba(0, 229, 170, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 170, 0.4)',
  },
  genreText: {
    color: '#00E5AA',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  plotText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 15,
    lineHeight: 22,
  },
  directorText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    fontWeight: '500',
  },
  castSection: {
    marginBottom: 24,
  },
  castContainer: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  castItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  castText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  seasonsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  seasonContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  seasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(0, 229, 170, 0.1)',
  },
  seasonInfo: {
    flex: 1,
  },
  seasonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  episodeCount: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  episodesContainer: {
    paddingHorizontal: 12,
  },
  episodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  episodeThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 229, 170, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playIcon: {
    backgroundColor: 'rgba(0, 229, 170, 0.8)',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodeInfo: {
    flex: 1,
  },
  episodeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  episodeDuration: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  episodeAirDate: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  episodePlayButton: {
    padding: 8,
  },
  bottomSpacing: {
    height: 40,
  },
});

export default SeriesDetailScreen;