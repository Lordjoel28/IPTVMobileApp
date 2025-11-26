/**
 * 🎨 FinalSearchScreen - Écran de recherche final avec design moderne
 * Recherche SQL + Design IPTV Smarters Pro avec cartes et logos
 */

import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  BackHandler,
} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {testSearchService} from '../utils/TestSearchService';
import {searchService} from '../services/SearchService';
import {FastSQLiteService} from '../services/FastSQLiteService';
import SimpleModernSearchCard from './SimpleModernSearchCard';
import FastImage from 'react-native-fast-image';
import {useThemeColors} from '../contexts/ThemeContext';
import {useI18n} from '../hooks/useI18n';
import {useVoiceSearch} from '../hooks/useVoiceSearch';
import {cleanVoiceInput} from '../utils/textUtils';
import {useStatusBar} from '../hooks/useStatusBar';
import type {Channel, Movie, Series} from '../types';

interface FinalSearchScreenProps {
  playlistId: string;
  categoryName?: string; // Pour affichage
  categoryGroupTitle?: string; // 🔑 Vrai group_title pour filtrage SQL
  categoryId?: string; // 🔑 ID de catégorie pour filtrage films/séries
  blockedCategories?: string[]; // 🔒 Catégories bloquées à filtrer
  searchType?: 'channels' | 'movies' | 'series' | 'all'; // Type de recherche
  onClose: () => void;
  onChannelSelect?: (channel: Channel) => void;
  onMovieSelect?: (movie: Movie) => void;
  onSeriesSelect?: (series: Series) => void;
}

export default function FinalSearchScreen({
  playlistId,
  categoryName,
  categoryGroupTitle,
  categoryId,
  blockedCategories = [],
  searchType = 'channels',
  onClose,
  onChannelSelect,
  onMovieSelect,
  onSeriesSelect,
}: FinalSearchScreenProps) {
  const colors = useThemeColors();
  const {t: tChannels} = useI18n('channels');
  const {t: tCommon} = useI18n('common');
  const isDark = colors.background.primary === '#000000';

  // 🎯 Utiliser le système global de StatusBar pour éviter l'interférence tactile
  const {setNormal, setImmersive} = useStatusBar();

  // Configurer la StatusBar pour l'écran de recherche (mode normal, pas immersif)
  useEffect(() => {
    setNormal('FinalSearchScreen_focus', false, 1); // Mode normal pour la recherche

    // Cleanup au démontage
    return () => {
      setNormal('FinalSearchScreen_cleanup', false, 1);
    };
  }, [setNormal]);

  // 🔒 Gérer le bouton retour Android pour fermer proprement
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true; // Empêcher le comportement par défaut
    });

    return () => backHandler.remove();
  }, [onClose]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    channels: Channel[];
    movies: Movie[];
    series: Series[];
  }>({
    channels: [],
    movies: [],
    series: [],
  });
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Animation pour le bouton vocal
  const [voiceAnimValue] = useState(new Animated.Value(1));

  // Charger l'historique et générer les suggestions au démarrage et quand la playlist change
  useEffect(() => {
    loadSearchHistory();
    generateSuggestions();
  }, [playlistId]);

  // 🎤 Hook de recherche vocale
  const voiceSearch = useVoiceSearch(
    {
      locale: 'fr-FR',
      maxAlternatives: 3,
      partialResults: true,
      continuousMode: false,
      timeout: 8000,
    },
    {
      onResult: (text: string, allResults: string[]) => {
        console.log('🎤 [FinalSearchScreen] Résultat vocal final:', text);
        const cleanedText = cleanVoiceInput(text);
        if (cleanedText.trim()) {
          setSearchQuery(cleanedText);
          // Arrêter l'animation
          Animated.timing(voiceAnimValue, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }
      },
      onPartialResult: (text: string) => {
        console.log('🎤 [FinalSearchScreen] Résultat vocal partiel:', text);
        const cleanedText = cleanVoiceInput(text);
        if (cleanedText.trim()) {
          // Afficher les résultats partiels en temps réel
          setSearchQuery(cleanedText);
        }
      },
      onStart: () => {
        console.log('🎤 [FinalSearchScreen] Début reconnaissance vocale');
        // Animation pulsation
        Animated.loop(
          Animated.sequence([
            Animated.timing(voiceAnimValue, {
              toValue: 1.3,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(voiceAnimValue, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
          ]),
        ).start();
      },
      onEnd: () => {
        console.log('🎤 [FinalSearchScreen] Fin reconnaissance vocale');
        // Arrêter l'animation
        voiceAnimValue.stopAnimation();
        Animated.timing(voiceAnimValue, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      },
      onError: (error: string) => {
        console.log('🎤 [FinalSearchScreen] Erreur reconnaissance vocale:', error);
        // Arrêter l'animation silencieusement
        voiceAnimValue.stopAnimation();
        Animated.timing(voiceAnimValue, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      },
    },
  );

  const loadSearchHistory = () => {
    try {
      const history = searchService.getSearchHistory();
      setSearchHistory(history);
      console.log('📚 Historique chargé:', history);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
      setSearchHistory([]);
    }
  };

  const generateSuggestions = async () => {
    try {
      const suggestionSet = new Set<string>();
      const fastSQLiteService = FastSQLiteService.getInstance();

      // Récupérer des suggestions RÉELLES depuis la base de données selon le contexte
      if (searchType === 'channels' || searchType === 'all') {
        // Pour les chaînes TV en direct : extraire les noms de catégories populaires
        const result = await testSearchService.searchChannels(playlistId, '', 100);
        const channels = result.channels;

        // Extraire les groupes/catégories les plus fréquents
        const categoryCount = new Map<string, number>();
        channels.forEach(channel => {
          if (channel.groupTitle && channel.groupTitle.trim()) {
            const category = channel.groupTitle.trim();
            categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
          }
        });

        // Trier par fréquence et prendre les plus populaires
        const sortedCategories = Array.from(categoryCount.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([name]) => name);

        sortedCategories.forEach(cat => suggestionSet.add(cat));

        // Ajouter quelques noms de chaînes populaires
        const popularChannelWords = new Set<string>();
        channels.slice(0, 30).forEach(channel => {
          const words = channel.name.split(/[^a-zA-Z0-9À-ÿ]+/);
          words.forEach(word => {
            if (word.length > 3 && word.length < 12 && !word.match(/^\d+$/) && !word.match(/^(d|de|la|le|et|ou|the|and)$/i)) {
              popularChannelWords.add(word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
            }
          });
        });
        Array.from(popularChannelWords).slice(0, 4).forEach(w => suggestionSet.add(w));
      }

      if (searchType === 'movies' || searchType === 'all') {
        try {
          // Pour les films : extraire des titres de films populaires/récents
          const movies = await fastSQLiteService.searchMovies(playlistId, '', 100);

          // Extraire les mots-clés des titres de films
          const movieWords = new Map<string, number>();
          movies.forEach(movie => {
            const words = movie.name.split(/[^a-zA-Z0-9À-ÿ]+/);
            words.forEach(word => {
              const cleanWord = word.trim().toLowerCase();
              if (cleanWord.length > 3 && cleanWord.length < 15 && !cleanWord.match(/^\d+$/) &&
                  !cleanWord.match(/^(d|de|la|le|et|ou|the|and|vf|vostfr|hd|uhd|4k|1080p|720p)$/i)) {
                const formatted = cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1);
                movieWords.set(formatted, (movieWords.get(formatted) || 0) + 1);
              }
            });
          });

          // Prendre les mots les plus fréquents (probablement des genres ou franchises populaires)
          const sortedMovieWords = Array.from(movieWords.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([word]) => word);

          sortedMovieWords.forEach(w => suggestionSet.add(w));

          // Ajouter quelques titres de films complets populaires
          movies.slice(0, 3).forEach(movie => {
            const shortName = movie.name.split(/[:\-–]/)[0].trim();
            if (shortName.length > 3 && shortName.length < 25) {
              suggestionSet.add(shortName);
            }
          });
        } catch (error) {
          console.log('Erreur récupération films pour suggestions:', error);
        }
      }

      if (searchType === 'series' || searchType === 'all') {
        try {
          // Pour les séries : extraire des noms de séries populaires
          const series = await fastSQLiteService.searchSeries(playlistId, '', 100);

          // Extraire les mots-clés des titres de séries
          const seriesWords = new Map<string, number>();
          series.forEach(serie => {
            const words = serie.name.split(/[^a-zA-Z0-9À-ÿ]+/);
            words.forEach(word => {
              const cleanWord = word.trim().toLowerCase();
              if (cleanWord.length > 3 && cleanWord.length < 15 && !cleanWord.match(/^\d+$/) &&
                  !cleanWord.match(/^(d|de|la|le|et|ou|the|and|saison|season|s\d+|e\d+|vf|vostfr)$/i)) {
                const formatted = cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1);
                seriesWords.set(formatted, (seriesWords.get(formatted) || 0) + 1);
              }
            });
          });

          // Prendre les mots les plus fréquents
          const sortedSeriesWords = Array.from(seriesWords.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([word]) => word);

          sortedSeriesWords.forEach(w => suggestionSet.add(w));

          // Ajouter quelques titres de séries complets populaires
          series.slice(0, 4).forEach(serie => {
            // Nettoyer le nom (enlever année, saison, etc.)
            const shortName = serie.name
              .replace(/\s*\(\d{4}\)\s*/g, '')
              .replace(/\s*S\d+.*$/i, '')
              .replace(/\s*Saison\s*\d+.*$/i, '')
              .split(/[:\-–]/)[0]
              .trim();
            if (shortName.length > 3 && shortName.length < 30) {
              suggestionSet.add(shortName);
            }
          });
        } catch (error) {
          console.log('Erreur récupération séries pour suggestions:', error);
        }
      }

      const suggestions = Array.from(suggestionSet).slice(0, 10);
      setSuggestions(suggestions);

      console.log('✨ [FinalSearchScreen] Suggestions contextuelles pour', searchType, ':', suggestions);

    } catch (error) {
      console.error('Erreur génération suggestions:', error);
      // Fallback selon le type
      let fallbackSuggestions = ['France', 'Sport', 'News', 'HD', 'TV'];
      if (searchType === 'movies') {
        fallbackSuggestions = ['Action', 'Comédie', 'Drame', 'Thriller', 'Aventure'];
      } else if (searchType === 'series') {
        fallbackSuggestions = ['Crime', 'Drame', 'Comédie', 'Thriller', 'Fantastique'];
      }
      setSuggestions(fallbackSuggestions);
    }
  };

  const performSearch = useCallback(async (query: string) => {
    console.log(`🔍 [FinalSearchScreen] performSearch appelé avec: "${query}", type: ${searchType}, playlistId: ${playlistId}`);

    if (!query.trim() || query.length < 2) {
      console.log('🔍 [FinalSearchScreen] Query trop courte, abandon');
      setSearchResults({
        channels: [],
        movies: [],
        series: [],
      });
      return;
    }

    setIsLoading(true);
    console.log('🔍 [FinalSearchScreen] Début recherche...');

    try {
      const results = {
        channels: [] as Channel[],
        movies: [] as Movie[],
        series: [] as Series[],
      };

      const fastSQLiteService = FastSQLiteService.getInstance();
      console.log('🔍 [FinalSearchScreen] FastSQLiteService instance obtenue');

      // Rechercher selon le type
      if (searchType === 'channels' || searchType === 'all') {
        try {
          const channelResult = await testSearchService.searchChannels(
            playlistId,
            query,
            100,
            categoryName?.trim().replace(/\s+$/, '')
          );

          // Filtrer les catégories bloquées
          let filteredChannels = channelResult.channels;
          if (blockedCategories.length > 0) {
            const normalizeName = (name: string) =>
              name.toLowerCase().trim()
                .replace(/\s*\|\s*/g, '-')
                .replace(/\s*-\s*/g, '-')
                .replace(/\s+/g, '-');

            const normalizedBlocked = blockedCategories.map(normalizeName);
            filteredChannels = channelResult.channels.filter((channel: any) => {
              const channelCategory = channel.groupTitle || channel.group || channel.category || '';
              const normalizedCategory = normalizeName(channelCategory);
              return !normalizedBlocked.includes(normalizedCategory);
            });
          }

          results.channels = filteredChannels;
        } catch (error) {
          console.error('❌ Erreur recherche chaînes:', error);
        }
      }

      if (searchType === 'movies' || searchType === 'all') {
        console.log('🔍 [FinalSearchScreen] Recherche films...');
        try {
          results.movies = await fastSQLiteService.searchMovies(playlistId, query, 50, categoryId);
          console.log(`✅ [FinalSearchScreen] ${results.movies.length} films trouvés`);
        } catch (error) {
          console.error('❌ Erreur recherche films:', error);
        }
      }

      if (searchType === 'series' || searchType === 'all') {
        console.log('🔍 [FinalSearchScreen] Recherche séries...');
        try {
          results.series = await fastSQLiteService.searchSeries(playlistId, query, 50, categoryId);
          console.log(`✅ [FinalSearchScreen] ${results.series.length} séries trouvées`);
        } catch (error) {
          console.error('❌ Erreur recherche séries:', error);
        }
      }

      console.log(`🔍 [FinalSearchScreen] Résultats totaux: ${results.channels.length} chaînes, ${results.movies.length} films, ${results.series.length} séries`);
      setSearchResults(results);

      // Ajouter à l'historique seulement si la recherche a donné des résultats
      const totalResults = results.channels.length + results.movies.length + results.series.length;
      if (totalResults > 0) {
        console.log('💾 Ajout à l\'historique:', query);
        // Ajouter à l'historique de manière asynchrone pour ne pas bloquer
        setTimeout(() => {
          try {
            searchService.searchChannels([], query);
            loadSearchHistory();
          } catch (error) {
            console.error('Erreur ajout historique:', error);
          }
        }, 0);
      }
    } catch (error) {
      console.error('❌ Erreur recherche générale:', error);
      setSearchResults({
        channels: [],
        movies: [],
        series: [],
      });
    } finally {
      setIsLoading(false);
    }
  }, [playlistId, searchType, categoryName, categoryId, blockedCategories]);

  // Recherche en temps réel - DOIT être après performSearch
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      // 🔥 Activer le loading immédiatement pour cacher les anciens résultats pendant le debounce
      setIsLoading(true);
      console.log(`🔍 [FinalSearchScreen] Démarrage recherche pour: "${searchQuery}"`);
      const timeoutId = setTimeout(() => {
        console.log('🔍 [FinalSearchScreen] Timer terminé, appel performSearch...');
        performSearch(searchQuery);
      }, 300); // Délai de 300ms pour éviter trop de requêtes
      return () => clearTimeout(timeoutId);
    } else if (searchQuery.trim().length === 0) {
      setSearchResults({
        channels: [],
        movies: [],
        series: [],
      });
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleSuggestionPress = (suggestion: string) => {
    setSearchQuery(suggestion);
    console.log('💾 Suggestion ajoutée à l\'historique:', suggestion);
    // Ajouter à l'historique de manière asynchrone pour ne pas bloquer l'interface
    setTimeout(() => {
      try {
        searchService.searchChannels([], suggestion);
        loadSearchHistory();
      } catch (error) {
        console.error('Erreur ajout historique:', error);
      }
    }, 0);
  };

  const removeFromHistory = (itemToRemove: string) => {
    try {
      // Supprimer de l'historique persistant
      const currentHistory = searchService.getSearchHistory();
      const updatedHistory = currentHistory.filter(item => item !== itemToRemove);

      // Mettre à jour le stockage
      // Note: searchService n'a probablement pas de méthode setSearchHistory,
      // donc on simule en ajoutant un élément vide pour forcer la mise à jour
      searchService.searchChannels([], '');

      // Mettre à jour l'état local
      setSearchHistory(updatedHistory);

      console.log('🗑️ Élément supprimé de l\'historique:', itemToRemove);
    } catch (error) {
      console.error('Erreur suppression historique:', error);
    }
  };

  const renderChannelCard = ({item, index}: {item: Channel; index: number}) => {
    const screenWidth = 400; // Largeur approximative pour les cartes
    const cardWidth = (screenWidth - 80) / 3; // Calcul largeur carte comme dans backup

    return (
      <View style={{flexDirection: 'row'}}>
        {index > 0 && <View style={{width: 16}} />}
        <View style={{width: cardWidth}}>
          <SimpleModernSearchCard
            channel={item}
            onPress={() => onChannelSelect?.(item)}
            index={index}
          />
        </View>
      </View>
    );
  };

  const renderMovieCard = ({item, index}: {item: Movie; index: number}) => {
    const screenWidth = 400;
    const cardWidth = (screenWidth - 80) / 3;
    const cardHeight = cardWidth * 1.5; // Ratio poster film

    return (
      <View style={{flexDirection: 'row'}}>
        {index > 0 && <View style={{width: 16}} />}
        <TouchableOpacity
          style={{width: cardWidth}}
          onPress={() => onMovieSelect?.(item)}>
          <View style={[styles.movieCard, {width: cardWidth, height: cardHeight}]}>
            {item.cover_url ? (
              <FastImage
                source={{uri: item.cover_url}}
                style={[styles.movieImage, {width: cardWidth, height: cardHeight}]}
                resizeMode={FastImage.resizeMode.cover}
                cache={FastImage.cacheControl.immutable}
                priority={FastImage.priority.normal}
              />
            ) : (
              <View style={[styles.movieImagePlaceholder, {width: cardWidth, height: cardHeight}]}>
                <Icon name="movie" size={24} color={colors.text.placeholder} />
              </View>
            )}

            {/* Badge avec le nom du film */}
            <View style={styles.movieTitleContainer}>
              <Text style={[styles.movieTitle, {color: colors.text.primary}]} numberOfLines={2}>
                {item.name}
              </Text>
            </View>

            {/* Rating si disponible */}
            {item.rating && (
              <View style={styles.ratingOverlay}>
                <Text style={styles.ratingText}>{item.rating}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSeriesCard = ({item, index}: {item: Series; index: number}) => {
    const screenWidth = 400;
    const cardWidth = (screenWidth - 80) / 3;
    const cardHeight = cardWidth * 1.5; // Ratio poster série

    return (
      <View style={{flexDirection: 'row'}}>
        {index > 0 && <View style={{width: 16}} />}
        <TouchableOpacity
          style={{width: cardWidth}}
          onPress={() => onSeriesSelect?.(item)}>
          <View style={[styles.seriesCard, {width: cardWidth, height: cardHeight}]}>
            {item.cover_url ? (
              <FastImage
                source={{uri: item.cover_url}}
                style={[styles.seriesImage, {width: cardWidth, height: cardHeight}]}
                resizeMode={FastImage.resizeMode.cover}
                cache={FastImage.cacheControl.immutable}
                priority={FastImage.priority.normal}
              />
            ) : (
              <View style={[styles.seriesImagePlaceholder, {width: cardWidth, height: cardHeight}]}>
                <Icon name="live-tv" size={24} color={colors.text.placeholder} />
              </View>
            )}

            {/* Badge avec le nom de la série */}
            <View style={styles.seriesTitleContainer}>
              <Text style={[styles.seriesTitle, {color: colors.text.primary}]} numberOfLines={2}>
                {item.name}
              </Text>
            </View>

            {/* Info épisodes si disponible */}
            {item.info?.episode_count && (
              <View style={styles.episodeCountOverlay}>
                <Text style={styles.episodeCountText}>{item.info.episode_count} ép</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // Helper functions pour la gestion des résultats
  const hasResults = () => {
    return searchResults.channels.length > 0 || searchResults.movies.length > 0 || searchResults.series.length > 0;
  };

  const getResultsSummary = () => {
    const parts = [];
    if (searchResults.channels.length > 0 && (searchType === 'channels' || searchType === 'all')) {
      parts.push(`${searchResults.channels.length} ${searchResults.channels.length > 1 ? tChannels('channels') : tChannels('channel')}`);
    }
    if (searchResults.movies.length > 0 && (searchType === 'movies' || searchType === 'all')) {
      parts.push(`${searchResults.movies.length} Film${searchResults.movies.length > 1 ? 's' : ''}`);
    }
    if (searchResults.series.length > 0 && (searchType === 'series' || searchType === 'all')) {
      parts.push(`${searchResults.series.length} Série${searchResults.series.length > 1 ? 's' : ''}`);
    }
    return parts.join(', ') || 'Aucun résultat';
  };

  // Couleurs sombres pour le header
  const darkHeaderBg = '#0a0e1a';
  const darkSurfaceSecondary = '#1e2940';
  const darkBorder = 'rgba(255,255,255,0.1)';
  const darkTextPrimary = '#FFFFFF';
  const darkTextPlaceholder = 'rgba(255,255,255,0.5)';

  const renderHeader = () => (
    <View>
      <View style={[styles.header, {backgroundColor: darkHeaderBg}]}>
        <TouchableOpacity onPress={onClose} style={[styles.closeButton, {backgroundColor: darkSurfaceSecondary}]}>
          <Icon name="arrow-back" size={24} color={darkTextPrimary} />
        </TouchableOpacity>
        <View style={[styles.searchContainer, {backgroundColor: darkSurfaceSecondary, borderColor: darkBorder}]}>
          <Icon name="search" size={20} color={darkTextPlaceholder} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, {color: darkTextPrimary}]}
            placeholder=""
            placeholderTextColor={darkTextPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="done"
            blurOnSubmit={true}
            autoCorrect={false}
            autoCapitalize="none"
            focusable={true}
            autoComplete="off"
            keyboardType="default"
            textContentType="none"
            importantForAutofill="no"
            spellCheck={false}
            underlineColorAndroid="transparent"
            {...(Platform.OS === 'android' && {
              disableFullscreenUI: true,
            })}
          />
          {/* Bouton croix pour effacer le texte */}
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}>
              <Icon
                name="close"
                size={16}
                color={colors.text.placeholder}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Bouton microphone indépendant */}
        <Animated.View style={{transform: [{scale: voiceAnimValue}]}}>
          <TouchableOpacity
            onPress={() => voiceSearch.toggleListening()}
            style={[
              styles.voiceButtonStandalone,
              voiceSearch.isListening && styles.voiceButtonActive,
            ]}>
            <Icon
              name={voiceSearch.isListening ? 'mic' : 'keyboard-voice'}
              size={24}
              color={voiceSearch.isListening ? '#FF8C00' : '#D2691E'}
            />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );

  const renderSuggestion = ({item}: {item: string}) => (
    <TouchableOpacity
      style={[styles.suggestionItem, {backgroundColor: colors.surface.primary, borderColor: colors.ui.border}]}
      onPress={() => handleSuggestionPress(item)}
      activeOpacity={0.7}>
      <Icon
        name="lightbulb-outline"
        size={18}
        color={colors.text.placeholder}
        style={styles.suggestionIcon}
      />
      <Text style={[styles.suggestionText, {color: colors.text.primary}]}>{item}</Text>
      <Icon name="trending-up" size={16} color={colors.text.placeholder} />
    </TouchableOpacity>
  );

  const renderHistoryItem = ({item}: {item: string}) => (
    <TouchableOpacity
      style={[styles.historyItem, {backgroundColor: colors.surface.primary, borderColor: colors.ui.border}]}
      onPress={() => handleSuggestionPress(item)}
      activeOpacity={0.7}>
      <Icon
        name="access-time"
        size={18}
        color={colors.text.placeholder}
        style={styles.historyIcon}
      />
      <Text style={[styles.historyText, {color: colors.text.primary}]}>{item}</Text>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => removeFromHistory(item)}
        activeOpacity={0.7}
        hitSlop={{top: 5, bottom: 5, left: 5, right: 5}}>
        <Icon
          name="delete-outline"
          size={16}
          color={colors.text.placeholder}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // Couleurs sombres forcées pour le confort visuel
  const darkBackground = '#0a0e1a';
  const darkSurface = '#1a1a2e';

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <KeyboardAvoidingView
        style={{flex: 1, backgroundColor: darkBackground}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS === 'ios'}>
        <SafeAreaView
          style={[styles.container, {backgroundColor: darkBackground}]}>

        {renderHeader()}

        {/* Espacement après le header - réduit pour remonter les résultats */}
        <View style={{height: 8}} />

        {/* Contenu principal */}
        <ScrollView
          style={{flex: 1}}
          contentContainerStyle={{paddingBottom: 100}}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}>
          {/* Suggestions quand pas de recherche */}
          {searchQuery.length === 0 && suggestions.length > 0 && (
            <View style={styles.section}>
              <Text
                style={[styles.sectionTitle, {color: colors.text.primary, paddingLeft: 60, marginBottom: 16}]}>
                {tChannels('suggestions')}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{paddingLeft: 60, paddingRight: 16}}>
                {suggestions.map((item, index) => (
                  <React.Fragment key={`suggestion-${index}`}>
                    {index > 0 && <View style={{width: 12}} />}
                    {renderSuggestion({item})}
                  </React.Fragment>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Espacement entre suggestions et historique */}
          {searchQuery.length === 0 && suggestions.length > 0 && searchHistory.length > 0 && (
            <View style={{height: 16}} />
          )}

          {/* Historique des recherches - affiché seulement si pas de recherche en cours */}
          {searchQuery.length === 0 && searchHistory.length > 0 && (
            <View style={styles.section}>
              <Text
                style={[styles.sectionTitle, {color: colors.text.primary, paddingLeft: 60, marginBottom: 16}]}>
                {tChannels('searchHistory')}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{paddingLeft: 60, paddingRight: 16}}>
                {searchHistory.slice(0, 6).map((item, index) => (
                  <React.Fragment key={`history-${index}`}>
                    {index > 0 && <View style={{width: 12}} />}
                    {renderHistoryItem({item})}
                  </React.Fragment>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Résultats de recherche - affichés en temps réel */}
          {(searchQuery.length >= 2 || hasResults()) && (
            <View style={styles.section}>
              {/* Compteurs de résultats */}
              {hasResults() && (
                <View style={styles.resultsSummary}>
                  <Text style={[styles.sectionTitle, {color: colors.text.primary, fontSize: 14, marginBottom: 12, textAlign: 'center'}]}>
                    {getResultsSummary()}
                  </Text>
                </View>
              )}

              {/* Aucun résultat */}
              {searchQuery.length >= 2 && !hasResults() && !isLoading && (
                <View style={styles.emptyStateContainer}>
                  <Icon
                    name="sentiment-dissatisfied"
                    size={64}
                    color={colors.text.placeholder}
                    style={{marginBottom: 16}}
                  />
                  <Text
                    style={[
                      styles.emptyStateTitle,
                      {color: colors.text.primary},
                    ]}>
                    {tChannels('noResultsFound')}
                  </Text>
                  <Text
                    style={[
                      styles.emptyStateSubtitle,
                      {color: colors.text.secondary},
                    ]}>
                    {tChannels('tryOtherKeywords')}
                  </Text>
                </View>
              )}

              {/* Chaînes trouvées */}
              {searchResults.channels.length > 0 && !isLoading && (
                <View style={styles.resultSection}>
                  <Text style={[styles.resultSectionTitle, {color: colors.text.primary}]}>
                    {searchResults.channels.length} {searchResults.channels.length > 1 ? tChannels('channels') : tChannels('channel')}
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{paddingLeft: 68, paddingRight: 16}}
                    directionalLockEnabled={true}
                    disableIntervalMomentum={true}
                    automaticallyAdjustContentInsets={false}
                    removeClippedSubviews={false}
                    scrollEventThrottle={16}
                    decelerationRate="fast"
                    bounces={false}>
                    {searchResults.channels.map((item, index) => (
                      <React.Fragment key={`channel-${item.id}`}>
                        {renderChannelCard({item, index})}
                      </React.Fragment>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Films trouvés */}
              {searchResults.movies.length > 0 && !isLoading && (
                <View style={styles.resultSection}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{paddingLeft: 68, paddingRight: 16}}
                    directionalLockEnabled={true}
                    disableIntervalMomentum={true}
                    automaticallyAdjustContentInsets={false}
                    removeClippedSubviews={false}
                    scrollEventThrottle={16}
                    decelerationRate="fast"
                    bounces={false}>
                    {searchResults.movies.map((item, index) => (
                      <React.Fragment key={`movie-${item.id}`}>
                        {renderMovieCard({item, index})}
                      </React.Fragment>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Séries trouvées */}
              {searchResults.series.length > 0 && !isLoading && (
                <View style={styles.resultSection}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{paddingLeft: 68, paddingRight: 16}}
                    directionalLockEnabled={true}
                    disableIntervalMomentum={true}
                    automaticallyAdjustContentInsets={false}
                    removeClippedSubviews={false}
                    scrollEventThrottle={16}
                    decelerationRate="fast"
                    bounces={false}>
                    {searchResults.series.map((item, index) => (
                      <React.Fragment key={`series-${item.id}`}>
                        {renderSeriesCard({item, index})}
                      </React.Fragment>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Loader flottant pendant recherche */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <View
              style={[
                styles.loadingCard,
                {backgroundColor: colors.surface.primary},
              ]}>
              <Text style={[styles.loadingText, {color: colors.text.primary}]}>
                {tChannels('searchingInProgress')}
              </Text>
            </View>
          </View>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  </GestureHandlerRootView>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    paddingVertical: 0,
  },
  clearButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  // Suggestions
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 100,
  },
  suggestionIcon: {
    marginRight: 8,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  // Historique
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 120,
  },
  historyIcon: {
    marginRight: 8,
  },
  historyText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  deleteButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Bouton recherche vocale indépendant
  voiceButtonStandalone: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(210, 105, 30, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    borderWidth: 1,
    borderColor: 'rgba(210, 105, 30, 0.3)',
  },
  voiceButtonActive: {
    backgroundColor: 'rgba(255, 140, 0, 0.2)',
    borderColor: 'rgba(255, 140, 0, 0.5)',
    shadowColor: '#FF8C00',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Styles pour les films et séries
  movieCard: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    position: 'relative',
  },
  movieImage: {
    borderRadius: 8,
  },
  movieImagePlaceholder: {
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  movieTitleContainer: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  movieTitle: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  ratingOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 193, 7, 0.9)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
  },
  seriesCard: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    position: 'relative',
  },
  seriesImage: {
    borderRadius: 8,
  },
  seriesImagePlaceholder: {
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  seriesTitleContainer: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.7)', // Purple pour séries
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  seriesTitle: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    color: '#FFFFFF',
  },
  episodeCountOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.9)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  episodeCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resultsSummary: {
    marginBottom: 12,
  },
  resultSection: {
    marginBottom: 20,
  },
  resultSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginHorizontal: 16,
    marginBottom: 8,
  },
});
