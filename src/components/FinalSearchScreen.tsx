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
} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {testSearchService} from '../utils/TestSearchService';
import {searchService} from '../services/SearchService';
import SimpleModernSearchCard from './SimpleModernSearchCard';
import {useThemeColors} from '../contexts/ThemeContext';
import {useI18n} from '../hooks/useI18n';
import {useVoiceSearch} from '../hooks/useVoiceSearch';
import {cleanVoiceInput} from '../utils/textUtils';
import {useStatusBar} from '../hooks/useStatusBar';
import type {Channel} from '../types';

interface FinalSearchScreenProps {
  playlistId: string;
  categoryName?: string; // Pour affichage
  categoryGroupTitle?: string; // 🔑 Vrai group_title pour filtrage SQL
  blockedCategories?: string[]; // 🔒 Catégories bloquées à filtrer
  onClose: () => void;
  onChannelSelect: (channel: Channel) => void;
}

export default function FinalSearchScreen({
  playlistId,
  categoryName,
  categoryGroupTitle,
  blockedCategories = [],
  onClose,
  onChannelSelect,
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

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Channel[]>([]);
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
      // Récupérer quelques chaînes depuis la playlist pour générer des suggestions dynamiques
      const result = await testSearchService.searchChannels(playlistId, '', 50); // Prendre les 50 premières chaînes
      const channels = result.channels;

      if (channels.length === 0) {
        // Fallback si aucune chaîne
        const fallbackSuggestions = ['France', 'Sport', 'News', 'HD', 'TV'];
        setSuggestions(fallbackSuggestions);
        return;
      }

      const suggestions: string[] = [];
      const categorySet = new Set<string>();
      const channelWords = new Set<string>();

      // Analyser les chaînes pour extraire des mots-clés pertinents
      channels.forEach(channel => {
        const channelName = channel.name.toLowerCase();

        // Catégories
        if (channel.groupTitle && channel.groupTitle.trim()) {
          const categoryWords = channel.groupTitle.toLowerCase().split(/\s+/);
          categoryWords.forEach(word => {
            if (word.length > 2 && !word.match(/^(d|de|la|le|et|ou|in|on|at|by)$/)) {
              categorySet.add(word.charAt(0).toUpperCase() + word.slice(1));
            }
          });
        }

        // Mots-clés des noms de chaînes
        const commonKeywords = [
          'france', 'sport', 'news', 'info', 'hd', 'uhd', '4k',
          'canal', 'tf1', 'm6', 'arte', 'bfm', 'rmc', 'euronsport',
          'live', 'direct', 'cinema', 'film', 'movie', 'series',
          'music', 'musique', 'kids', 'enfant', 'documentaire',
          'local', 'région', 'international', 'europe', 'monde'
        ];

        commonKeywords.forEach(keyword => {
          if (channelName.includes(keyword)) {
            channelWords.add(keyword.charAt(0).toUpperCase() + keyword.slice(1));
          }
        });

        // Extraire les mots significatifs du nom de la chaîne
        const words = channelName.split(/[^a-zA-Z0-9]+/);
        words.forEach(word => {
          if (word.length > 3 && word.length < 15 && !word.match(/^\d+$/)) {
            channelWords.add(word.charAt(0).toUpperCase() + word.slice(1));
          }
        });
      });

      // Construire la liste finale de suggestions
      channelWords.forEach(word => suggestions.push(word));
      categorySet.forEach(category => suggestions.push(category));

      // Ajouter les suggestions génériques si pas assez
      if (suggestions.length < 5) {
        const genericSuggestions = ['France', 'Sport', 'News', 'HD', 'TV'];
        genericSuggestions.forEach(suggestion => {
          if (!suggestions.includes(suggestion)) {
            suggestions.push(suggestion);
          }
        });
      }

      // Retourner les 8 premières suggestions uniques
      const uniqueSuggestions = Array.from(new Set(suggestions)).slice(0, 8);
      setSuggestions(uniqueSuggestions);

      console.log('✨ [FinalSearchScreen] Suggestions dynamiques générées:', uniqueSuggestions);

    } catch (error) {
      console.error('Erreur génération suggestions:', error);
      // Fallback en cas d'erreur
      const fallbackSuggestions = ['France', 'Sport', 'News', 'HD', 'TV'];
      setSuggestions(fallbackSuggestions);
    }
  };

  // Recherche en temps réel
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      // 🔥 Activer le loading immédiatement pour cacher les anciens résultats pendant le debounce
      setIsLoading(true);
      const timeoutId = setTimeout(() => {
        performSearch(searchQuery);
      }, 300); // Délai de 300ms pour éviter trop de requêtes
      return () => clearTimeout(timeoutId);
    } else if (searchQuery.trim().length === 0) {
      setSearchResults([]);
      setIsLoading(false);
    }
  }, [searchQuery, playlistId]);

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const result = await testSearchService.searchChannels(
        playlistId,
        query,
        150, // 🔥 Limite augmentée à 150 pour afficher tous les résultats (ex: france = 108 chaînes)
        categoryName?.trim().replace(/\s+$/, '') // 🔑 Filtrer par vraie catégorie + retirer espaces de fin
      );

      // 🔒 Filtrer les catégories bloquées (même normalization que ChannelsScreen)
      let filteredChannels = result.channels;
      if (blockedCategories.length > 0) {
        const normalizeName = (name: string) =>
          name.toLowerCase().trim()
            .replace(/\s*\|\s*/g, '-')
            .replace(/\s*-\s*/g, '-')
            .replace(/\s+/g, '-');

        const normalizedBlocked = blockedCategories.map(normalizeName);

        filteredChannels = result.channels.filter((channel: any) => {
          const channelCategory = channel.groupTitle || channel.group || channel.category || '';
          const normalizedCategory = normalizeName(channelCategory);
          return !normalizedBlocked.includes(normalizedCategory);
        });
      }

      setSearchResults(filteredChannels);

      // Ajouter à l'historique seulement si la recherche a réussi et donné des résultats
      if (result.channels.length > 0) {
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
      console.error('❌ Erreur recherche:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [playlistId, categoryGroupTitle]);

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
            onPress={() => onChannelSelect(item)}
            index={index}
          />
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View>
      <View style={[styles.header, {backgroundColor: colors.background.primary}]}>
        <TouchableOpacity onPress={onClose} style={[styles.closeButton, {backgroundColor: colors.surface.secondary}]}>
          <Icon name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={[styles.searchContainer, {backgroundColor: colors.surface.secondary, borderColor: colors.ui.border}]}>
          <Icon name="search" size={20} color={colors.text.placeholder} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, {color: colors.text.primary}]}
            placeholder=""
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

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <KeyboardAvoidingView
        style={{flex: 1, backgroundColor: colors.background.primary}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS === 'ios'}>
        <SafeAreaView
          style={[styles.container, {backgroundColor: colors.background.primary}]}>

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
          {(searchQuery.length >= 2 || searchResults.length > 0) && (
            <View style={styles.section}>
              {searchResults.length > 0 && (
                <Text
                  style={[styles.sectionTitle, {color: colors.text.primary, fontSize: 14, marginBottom: 12, textAlign: 'center'}]}>
                  {searchResults.length} {searchResults.length > 1 ? tChannels('channels') : tChannels('channel')}
                </Text>
              )}
              {searchQuery.length >= 2 &&
                searchResults.length === 0 &&
                !isLoading && (
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
              {searchResults.length > 0 && !isLoading && (
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
                  {searchResults.map((item, index) => (
                    <React.Fragment key={item.id}>
                      {renderChannelCard({item, index})}
                    </React.Fragment>
                  ))}
                </ScrollView>
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
});
