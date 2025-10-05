/**
 * 🔍 SearchScreen - Interface de recherche moderne IPTV
 * Interface style image 2 avec recherche fuzzy et suggestions intelligentes
 */

import React, {useState, useEffect, useRef, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Keyboard,
  Dimensions,
  Platform,
  Animated,
  Alert,
} from 'react-native';
import FastImage from 'react-native-fast-image'; // ✅ FastImage pour logos optimisés
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {searchService} from '../services/SearchService';
import {usePlayerStore} from '../stores/PlayerStore';
import {useThemeColors, useIsDark} from '../contexts/ThemeContext';
import {useVoiceSearch} from '../hooks/useVoiceSearch';
import {filterChannels, cleanVoiceInput} from '../utils/textUtils';
import type {Channel, RootStackParamList} from '../types';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Search'>;

interface SearchScreenProps {}

interface ListItem {
  id: string;
  type: 'suggestion' | 'history' | 'channel' | 'section';
  data?: any;
  title?: string;
}

const SearchScreen: React.FC<SearchScreenProps> = () => {
  const navigation = useNavigation<NavigationProp>();
  const playerStore = usePlayerStore();

  // Hooks de thème
  const colors = useThemeColors();
  const isDark = useIsDark();

  // États de recherche
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Channel[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Animation pour le bouton vocal
  const [voiceAnimValue] = useState(new Animated.Value(1));

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
        console.log('🎤 [SearchScreen] Résultat vocal final:', text);
        const cleanedText = cleanVoiceInput(text);
        if (cleanedText.trim()) {
          setQuery(cleanedText);
          // Arrêter l'animation
          Animated.timing(voiceAnimValue, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }
      },
      onPartialResult: (text: string) => {
        console.log('🎤 [SearchScreen] Résultat vocal partiel:', text);
        const cleanedText = cleanVoiceInput(text);
        if (cleanedText.trim()) {
          // Afficher les résultats partiels en temps réel
          setQuery(cleanedText);
        }
      },
      onStart: () => {
        console.log('🎤 [SearchScreen] Début reconnaissance vocale');
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
          ])
        ).start();
      },
      onEnd: () => {
        console.log('🎤 [SearchScreen] Fin reconnaissance vocale');
        // Arrêter l'animation
        voiceAnimValue.stopAnimation();
        Animated.timing(voiceAnimValue, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      },
      onError: (error: string) => {
        // Arrêter l'animation silencieusement
        voiceAnimValue.stopAnimation();
        Animated.timing(voiceAnimValue, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();

        // Vérifier si c'est une erreur critique (non-vocale)
        const isCriticalError = !error.includes('7/No match') &&
                               !error.includes('11/Didn\'t understand') &&
                               !error.includes('Aucune parole détectée') &&
                               !error.includes('Parole non comprise') &&
                               !error.includes('Permission') &&
                               !error.includes('network');

        // Afficher seulement les erreurs critiques (système)
        if (isCriticalError) {
          Alert.alert(
            'Erreur Recherche Vocale',
            error,
            [{ text: 'OK', style: 'default' }]
          );
        }
      },
    }
  );

  // Générer suggestions intelligentes basées sur les chaînes disponibles - MISE À JOUR DYNAMIQUE
  useEffect(() => {
    const generateSmartSuggestions = () => {
      const allChannels = playerStore.navigationData?.initialChannels || [];
      const playlistId = playerStore.navigationData?.playlistId;

      console.log('🔄 [SearchScreen] Régénération suggestions pour playlist:', playlistId, 'avec', allChannels.length, 'chaînes');

      if (allChannels.length === 0) {
        return ['France', 'Sport', 'News', 'HD', 'TV'];
      }

      const suggestions: string[] = [];
      const categorySet = new Set<string>();
      const channelWords = new Set<string>();

      // Extraire catégories et mots-clés des vraies chaînes
      allChannels.forEach(channel => {
        if (channel.group && channel.group.trim()) {
          categorySet.add(channel.group.trim());
        }

        const channelName = channel.name.toLowerCase();

        // Détection intelligente de mots-clés
        if (channelName.includes('france')) channelWords.add('France');
        if (channelName.includes('sport')) channelWords.add('Sport');
        if (channelName.includes('news') || channelName.includes('info')) channelWords.add('News');
        if (channelName.includes('hd') || channelName.includes('1080')) channelWords.add('HD');
        if (channelName.includes('canal')) channelWords.add('Canal');
        if (channelName.includes('tf1')) channelWords.add('TF1');
        if (channelName.includes('m6')) channelWords.add('M6');
        if (channelName.includes('arte')) channelWords.add('Arte');
        if (channelName.includes('bfm')) channelWords.add('BFM');
        if (channelName.includes('rmc')) channelWords.add('RMC');
        if (channelName.includes('eurosport')) channelWords.add('Eurosport');
        // Nouveaux mots-clés dynamiques
        if (channelName.includes('live')) channelWords.add('Live');
        if (channelName.includes('cinema') || channelName.includes('film')) channelWords.add('Cinéma');
        if (channelName.includes('music')) channelWords.add('Music');
        if (channelName.includes('kids') || channelName.includes('enfant')) channelWords.add('Enfants');
      });

      channelWords.forEach(word => suggestions.push(word));

      // Prendre les 4 catégories les plus populaires
      const topCategories = Array.from(categorySet).slice(0, 4);
      topCategories.forEach(cat => suggestions.push(cat));

      const uniqueSuggestions = Array.from(new Set(suggestions)).slice(0, 8);
      console.log('✨ [SearchScreen] Suggestions dynamiques générées:', uniqueSuggestions);
      return uniqueSuggestions;
    };

    // Force la régénération à chaque changement de navigationData
    const newSuggestions = generateSmartSuggestions();
    setSuggestions(newSuggestions);
  }, [playerStore.navigationData]);

  // Refs et animations
  const searchInputRef = useRef<TextInput>(null);

  // États clavier
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Pas de focus automatique - uniquement quand l'utilisateur clique

  // Gestion du clavier
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardVisible(true);
        setKeyboardHeight(e.endCoordinates.height);
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);


  // Charger l'historique et vider le cache au changement de playlist
  useEffect(() => {
    const currentPlaylistId = playerStore.navigationData?.playlistId;

    if (currentPlaylistId) {
      console.log('🗑️ [SearchScreen] Changement de playlist détecté:', currentPlaylistId, '- Vidage cache historique');

      // Vider l'historique des recherches pour la nouvelle playlist
      setSearchHistory([]);

      // Charger l'historique spécifique à cette playlist
      const history = searchService.getSearchHistory();
      setSearchHistory(history);
    }

    // Marquer que l'écran de recherche est ouvert pour masquer le lecteur
    playerStore.actions.setSearchScreenOpen(true);

    // Nettoyer à la sortie
    return () => {
      playerStore.actions.setSearchScreenOpen(false);
    };
  }, [playerStore.navigationData?.playlistId]);

  // Recherche en temps réel avec suggestions fuzzy intelligentes
  useEffect(() => {
    if (query.trim().length >= 2) {
      performSearch(query);
      // Générer suggestions fuzzy en temps réel
      generateFuzzySuggestions(query);
      setShowSuggestions(true);
    } else if (query.trim().length === 0) {
      setResults([]);
      setShowSuggestions(false);
      // Rétablir suggestions intelligentes statiques
      const generateSmartSuggestions = () => {
        const allChannels = playerStore.navigationData?.initialChannels || [];
        if (allChannels.length === 0) return ['France', 'Sport', 'News', 'HD', 'TV'];

        const suggestions: string[] = [];
        const categorySet = new Set<string>();
        const channelWords = new Set<string>();

        allChannels.forEach(channel => {
          if (channel.group && channel.group.trim()) {
            categorySet.add(channel.group.trim());
          }

          const channelName = channel.name.toLowerCase();
          if (channelName.includes('france')) channelWords.add('France');
          if (channelName.includes('sport')) channelWords.add('Sport');
          if (channelName.includes('news') || channelName.includes('info')) channelWords.add('News');
          if (channelName.includes('hd') || channelName.includes('1080')) channelWords.add('HD');
          if (channelName.includes('canal')) channelWords.add('Canal');
          if (channelName.includes('tf1')) channelWords.add('TF1');
        });

        channelWords.forEach(word => suggestions.push(word));
        const topCategories = Array.from(categorySet).slice(0, 3);
        topCategories.forEach(cat => suggestions.push(cat));

        return Array.from(new Set(suggestions)).slice(0, 8);
      };
      setSuggestions(generateSmartSuggestions());
    } else if (query.trim().length === 1) {
      // Pour 1 caractère, suggestions fuzzy basiques
      generateFuzzySuggestions(query);
      setShowSuggestions(true);
    }
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setIsLoading(true);

    try {
      // Récupérer toutes les chaînes depuis le navigationData
      const allChannels = playerStore.navigationData?.initialChannels || [];
      console.log('🔍 [SearchScreen] Données disponibles:', {
        hasNavigationData: !!playerStore.navigationData,
        channelsCount: allChannels.length,
        firstChannelName: allChannels[0]?.name,
        searchQuery: searchQuery
      });

      // Effectuer la recherche avec le service
      const searchResult = searchService.searchChannels(
        allChannels,
        searchQuery,
        undefined,
        {
          enableFuzzy: true,
          fuzzyTolerance: 2,
          maxResults: 100,
        }
      );

      console.log('🔍 [SearchScreen] Résultats recherche:', {
        totalResults: searchResult.totalResults,
        channelsFound: searchResult.channels.length
      });

      setResults(searchResult.channels);

      // 🚀 OPTIMISATION: Précharger les logos des 15 premiers résultats
      setTimeout(() => {
        const logosToPreload = searchResult.channels
          .slice(0, 15)
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
    } catch (error) {
      console.error('❌ Erreur lors de la recherche:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    Keyboard.dismiss();
  };

  const handleChannelPress = (channel: Channel) => {
    console.log('🎬 [SearchScreen] Sélection chaîne:', channel.name);

    // Ajouter à l'historique
    searchService.searchChannels([channel], query);

    // S'assurer que le playlistId est défini dans le PlayerStore
    if (playerStore.navigationData?.playlistId && !playerStore.playlistId) {
      playerStore.actions.setPlaylistId(playerStore.navigationData.playlistId);
      console.log('🔧 [SearchScreen] PlaylistId défini:', playerStore.navigationData.playlistId);
    }

    // IMPORTANTE: Lancer immédiatement la chaîne dans le PlayerStore
    console.log('🎬 [SearchScreen] Lancement immédiat de:', channel.name);
    playerStore.actions.playChannel(channel, false);

    // Réactiver le lecteur
    playerStore.actions.setSearchScreenOpen(false);

    console.log('🎬 [SearchScreen] Navigation vers ChannelPlayer avec chaîne:', channel.name);

    // Attendre un cycle pour la synchronisation
    requestAnimationFrame(() => {
      // Naviguer vers ChannelPlayer avec la chaîne sélectionnée (comme avant)
      if (playerStore.navigationData) {
        const transformedCategories = playerStore.navigationData.allCategories.map(cat => ({
          ...cat,
          count: cat.count || 0,
          channels: cat.channels || [],
        }));

        const transformedInitialCategory = {
          ...playerStore.navigationData.initialCategory,
          count: playerStore.navigationData.initialCategory.count || 0,
          channels: playerStore.navigationData.initialCategory.channels || [],
        };

        navigation.navigate('ChannelPlayer', {
          playlistId: playerStore.navigationData.playlistId,
          allCategories: transformedCategories,
          initialCategory: transformedInitialCategory,
          initialChannels: playerStore.navigationData.initialChannels,
          selectedChannel: channel, // La chaîne sélectionnée
          playlistName: playerStore.navigationData.playlistName,
        });
      }
    });
  };

  // Générer suggestions fuzzy intelligentes basées sur les vraies chaînes
  const generateFuzzySuggestions = (partialQuery: string) => {
    const allChannels = playerStore.navigationData?.initialChannels || [];
    const lowerQuery = partialQuery.toLowerCase().trim();
    const fuzzySuggestions: string[] = [];

    // Recherche fuzzy dans les noms de chaînes
    allChannels.forEach(channel => {
      const channelName = channel.name.toLowerCase();

      // Correspondance exacte au début
      if (channelName.startsWith(lowerQuery)) {
        fuzzySuggestions.push(channel.name);
      }
      // Correspondance fuzzy (contient la query)
      else if (channelName.includes(lowerQuery)) {
        fuzzySuggestions.push(channel.name);
      }
      // Correspondance dans la catégorie
      else if (channel.group && channel.group.toLowerCase().includes(lowerQuery)) {
        fuzzySuggestions.push(channel.group);
      }
    });

    // Recherche dans les catégories
    const categories = new Set<string>();
    allChannels.forEach(channel => {
      if (channel.group && channel.group.toLowerCase().includes(lowerQuery)) {
        categories.add(channel.group);
      }
    });

    categories.forEach(cat => fuzzySuggestions.push(cat));

    // Supprimer doublons, trier par pertinence et limiter
    const uniqueSuggestions = Array.from(new Set(fuzzySuggestions))
      .sort((a, b) => {
        // Prioriser les correspondances exactes au début
        const aStart = a.toLowerCase().startsWith(lowerQuery);
        const bStart = b.toLowerCase().startsWith(lowerQuery);
        if (aStart && !bStart) return -1;
        if (!aStart && bStart) return 1;
        return a.length - b.length; // Plus court = plus pertinent
      })
      .slice(0, 8);

    console.log('🔍 [SearchScreen] Suggestions fuzzy pour "' + partialQuery + '":', uniqueSuggestions.length);
    setSuggestions(uniqueSuggestions);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setSuggestions([]);
    setShowSuggestions(false);
    searchInputRef.current?.focus();
  };

  const removeFromHistory = async (itemToRemove: string) => {
    const updatedHistory = searchHistory.filter(item => item !== itemToRemove);
    setSearchHistory(updatedHistory);
  };


  // Calcul des dimensions des cartes
  const screenWidth = Dimensions.get('window').width;
  // Largeur pour les cartes de chaînes et suggestions (plus compact)
  const cardWidth = (screenWidth - 80) / 8;
  // Largeur pour les cartes de l'historique (plus large pour la lisibilité)
  const historyCardWidth = (screenWidth - 184) / 6;

  // Logique d'affichage conditionnelle
  const showHistoryAndSuggestions = query.length === 0;
  const showResults = query.length > 0 && results.length > 0;
  const showEmptyResults = query.length > 0 && results.length === 0 && !isLoading;

  const renderSuggestion = ({item}: {item: string}) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSuggestionPress(item)}
      activeOpacity={0.7}>
      <Icon name="lightbulb-outline" size={18} color="#888" style={styles.suggestionIcon} />
      <Text style={styles.suggestionText}>{item}</Text>
      <Icon name="trending-up" size={16} color="#666" />
    </TouchableOpacity>
  );

  const renderChannel = ({item, index}: {item: Channel, index: number}) => (
    <TouchableOpacity
      style={[
        styles.channelItem,
        index === 0 && results.length > 0 && styles.exactMatch
      ]}
      onPress={() => handleChannelPress(item)}
      activeOpacity={0.8}>
      <View style={styles.channelContent}>
        {item.logo ? (
          <FastImage
            source={{
              uri: item.logo,
              priority: FastImage.priority.high, // ✅ Priorité haute
              cache: FastImage.cacheControl.immutable, // ✅ Cache permanent
            }}
            style={styles.channelLogo}
            resizeMode={FastImage.resizeMode.contain}
          />
        ) : (
          <View style={[styles.channelLogo, styles.channelLogoPlaceholder]}>
            <Text style={{fontSize: 24}}>📺</Text>
          </View>
        )}
        <View style={styles.channelInfo}>
          <Text style={styles.channelName} numberOfLines={2}>
            {item.name}
          </Text>
          {item.group && (
            <Text style={styles.channelGroup} numberOfLines={1}>
              {item.group}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderHistoryItem = ({item}: {item: string}) => (
    <TouchableOpacity
      style={styles.historyItem}
      onPress={() => handleSuggestionPress(item)}
      activeOpacity={0.7}>
      <Icon name="access-time" size={18} color="#666" style={styles.historyIcon} />
      <Text style={styles.historyText}>{item}</Text>
    </TouchableOpacity>
  );



  return (
    <View
      style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent={true} />

      {/* Masquer la barre de suggestions du clavier Android */}
      {Platform.OS === 'android' && (
        <View style={{position: 'absolute', top: -1000, left: -1000}}>
          <TextInput style={{height: 0, width: 0}} />
        </View>
      )}

      {/* Header avec barre de recherche */}
      <View style={[styles.header, {
        borderBottomColor: 'transparent',
        backgroundColor: 'transparent',
      }]}>
        <View style={styles.searchContainer}>
          <TouchableOpacity
            style={[styles.backButton, {
              backgroundColor: colors.surface.primary,
            }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}>
            <Icon name="arrow-back-ios" size={20} color={colors.text.primary} />
          </TouchableOpacity>

          <View style={[styles.searchInputContainer, {
            backgroundColor: colors.surface.primary,
            borderColor: colors.ui.border,
          }]}>
            <Icon name="search" size={22} color={colors.text.placeholder} style={styles.searchIcon} />
            <TextInput
              ref={searchInputRef}
              style={[styles.searchInput, { color: colors.text.primary }]}
              placeholder="Rechercher"
              placeholderTextColor={colors.text.placeholder}
              value={query}
              onChangeText={setQuery}
              autoFocus={false}
              returnKeyType="search"
              onSubmitEditing={() => Keyboard.dismiss()}
              autoComplete="off"
              autoCorrect={false}
              keyboardType="default"
              blurOnSubmit={false}
              textContentType="none"
              importantForAutofill="no"
              contextMenuHidden={true}
              spellCheck={false}
              underlineColorAndroid="transparent"
              {...(Platform.OS === 'android' && {
                inlineImageLeft: undefined,
                enablesReturnKeyAutomatically: false,
                disableFullscreenUI: true
              })}
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={clearSearch}
                style={[styles.clearButton, {
                  backgroundColor: colors.surface.primary,
                }]}
                activeOpacity={0.7}>
                <Icon name="clear" size={20} color={colors.text.placeholder} />
              </TouchableOpacity>
            )}
          </View>

          {/* Bouton microphone pour recherche vocale */}
          <Animated.View style={{ transform: [{ scale: voiceAnimValue }] }}>
            <TouchableOpacity
              onPress={() => voiceSearch.toggleListening()}
              style={[
                styles.voiceButton,
                voiceSearch.isListening && styles.voiceButtonActive
              ]}
              activeOpacity={0.7}>
              <Icon
                name={voiceSearch.isListening ? "mic-off" : "keyboard-voice"}
                size={24}
                color={voiceSearch.isListening ? "#FF8C00" : "#D2691E"}
              />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>

      {/* Contenu conditionnel selon état de recherche */}
      <View style={styles.content}>
        {/* AVANT RECHERCHE: Suggestions + Historique */}
        {showHistoryAndSuggestions && (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 100 }}
            keyboardShouldPersistTaps="handled">

            {/* Section Suggestions */}
            {suggestions.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Suggestions</Text>
                <FlatList
                  horizontal
                  data={suggestions}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.suggestionCard, {
                        width: cardWidth,
                        backgroundColor: colors.surface.primary,
                        borderColor: colors.ui.border,
                      }]}
                      onPress={() => handleSuggestionPress(item)}
                      activeOpacity={0.8}>
                      <Icon name="lightbulb-outline" size={18} color={colors.text.placeholder} />
                      <Text style={[styles.suggestionText, { color: colors.text.primary }]}>{item}</Text>
                    </TouchableOpacity>
                  )}
                  keyExtractor={(item, index) => `suggestion-${index}`}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingLeft: 68, paddingRight: 16 }}
                  ItemSeparatorComponent={() => <View style={{ width: 20 }} />}
                />
              </View>
            )}

            {/* Section Historique */}
            {searchHistory.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, {
                  fontSize: 14,
                  color: colors.text.primary
                }]}>Historique des recherches</Text>
                <FlatList
                  horizontal
                  data={searchHistory.slice(0, 8)}
                  renderItem={({ item, index }) => (
                    <TouchableOpacity
                      style={[styles.historyCard, {
                        width: historyCardWidth,
                        backgroundColor: colors.surface.primary,
                        borderColor: colors.ui.border,
                      }]}
                      onPress={() => handleSuggestionPress(item)}
                      activeOpacity={0.8}>
                      <Text style={[styles.historyCardText, { color: colors.text.secondary }]} numberOfLines={1} ellipsizeMode="middle">{item}</Text>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => removeFromHistory(item)}
                        activeOpacity={0.7}>
                        <Icon name="delete-outline" size={16} color={colors.text.placeholder} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  )}
                  keyExtractor={(item, index) => `history-${index}`}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingLeft: 68, paddingRight: 16 }}
                  ItemSeparatorComponent={() => <View style={{ width: 20 }} />}
                />
              </View>
            )}
          </ScrollView>
        )}

        {/* APRÈS RECHERCHE: Résultats uniquement */}
        {showResults && (
          <View style={{paddingTop: 8}}>
            <Text style={[styles.resultsTitle, { color: colors.text.secondary }]}>
              {results.length} chaîne{results.length > 1 ? 's' : ''}
            </Text>
            <FlatList
              horizontal
              data={results}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.channelCard, {
                    width: cardWidth,
                    backgroundColor: colors.surface.primary,
                    borderColor: colors.ui.border,
                  }]}
                  onPress={() => handleChannelPress(item)}
                  activeOpacity={0.8}>
                  {/* Logo en arrière-plan comme ChannelsScreen */}
                  {item.logo && (
                    <FastImage
                      source={{
                        uri: item.logo,
                        priority: FastImage.priority.high,
                        cache: FastImage.cacheControl.immutable,
                      }}
                      style={styles.channelLogoFull}
                      resizeMode={FastImage.resizeMode.contain}
                    />
                  )}

                  {/* Overlay avec gradient et texte comme ChannelsScreen */}
                  <View style={[styles.channelOverlay, {
                    backgroundColor: colors.surface.overlay
                  }]}>
                    <View style={styles.channelTextContainer}>
                      <Text style={[styles.channelName, { color: colors.text.primary }]} numberOfLines={2}>
                        {item.name}
                      </Text>
                      {item.group && (
                        <Text style={[styles.channelGroup, { color: colors.text.secondary }]} numberOfLines={1}>
                          {item.group}
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              keyExtractor={(item, index) => `channel-${item.id}-${index}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 68, paddingRight: 16 }}
              ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
            />
          </View>
        )}

        {/* ÉTAT VIDE */}
        {showEmptyResults && (
          <View style={styles.emptyContainer}>
            <Icon name="sentiment-dissatisfied" size={64} color={colors.text.placeholder} />
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>Aucun résultat</Text>
            <Text style={[styles.emptyText, { color: colors.text.placeholder }]}>
              Essayez avec d'autres mots-clés
            </Text>
          </View>
        )}

        {/* LOADING */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.text.placeholder }]}>Recherche en cours...</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 25,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
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
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  voiceButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
    backgroundColor: 'rgba(139, 69, 19, 0.15)',
  },
  voiceButtonActive: {
    backgroundColor: 'rgba(255, 140, 0, 0.2)',
    transform: [{ scale: 1.05 }],
  },
  content: {
    flex: 1,
  },
  resultsTitle: {
    fontSize: 14,
    fontWeight: '500',
    paddingLeft: 68,
    paddingRight: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginVertical: 16,
    paddingLeft: 68,
    paddingRight: 16,
  },
  section: {
    marginBottom: 24,
  },
  // Cards Suggestions
  suggestionCard: {
    borderRadius: 16,
    height: 50,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  // Cards Historique
  historyCard: {
    borderRadius: 16,
    height: 50,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyCardText: {
    fontSize: 12,
    marginLeft: 6,
    flex: 1,
    lineHeight: 16,
  },
  deleteButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Cards Chaînes avec design moderne
  channelCard: {
    borderRadius: 20,
    height: 140,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  // Logo adapté comme ChannelsScreen
  channelLogoFull: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 40,
    borderRadius: 12,
  },
  // Overlay avec gradient harmonieux adaptatif
  channelOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  channelTextContainer: {
    alignItems: 'center',
  },
  channelName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  channelGroup: {
    fontSize: 10,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  channelItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    overflow: 'hidden',
    width: 200,
    height: 120,
  },
  exactMatch: {
    transform: [{ scale: 1.05 }],
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  channelContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelLogo: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  channelLogoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
  },
  channelInfo: {
    flex: 1,
    marginLeft: 12,
  },
});

export default SearchScreen;