/**
 * 🔒 CategoriesSelectionScreen - Sélection des catégories bloquées
 * Permet de sélectionner les catégories à bloquer pour un profil
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Text as RNText,
  Animated,
  InteractionManager,
} from 'react-native';
import {Text, Button, Checkbox, Searchbar} from 'react-native-paper';
import {useTheme, useThemeColors} from '../contexts/ThemeContext';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import type {RouteProp} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import type {RootStackParamList, Profile} from '../types';
import ProfileService from '../services/ProfileService';
import CategoriesService from '../services/CategoriesService';
import database from '../database';
import {Q} from '@nozbe/watermelondb';
import {Playlist} from '../database/models';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LZString from 'lz-string';

// Importé depuis CategoriesService
import type { CategoryWithCount } from '../services/CategoriesService';

type CategoriesSelectionScreenRouteProp = RouteProp<
  RootStackParamList,
  'CategoriesSelection'
>;
type CategoriesSelectionScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'CategoriesSelection'
>;

interface Props {
  route: CategoriesSelectionScreenRouteProp;
  navigation: CategoriesSelectionScreenNavigationProp;
}

const CategoriesSelectionScreen: React.FC<Props> = ({route, navigation}) => {
  const {currentTheme} = useTheme();
  const colors = useThemeColors();
  const {profileId} = route.params;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [availableCategories, setAvailableCategories] = useState<CategoryWithCount[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string | null>(null);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [lockAnimations, setLockAnimations] = useState<{[key: string]: Animated.Value}>({});

  // 🛡️ Protection contre les appels multiples simultanés
  const isLoadingCategoriesRef = React.useRef(false);

  // Styles dynamiques basés sur le thème
  const themedStyles = {
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      padding: currentTheme.spacing.md,
      borderBottomWidth: 1,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center' as const,
      fontSize: currentTheme.typography.sizes.lg,
      fontWeight: '600' as const,
    },
    refreshButton: {
      padding: currentTheme.spacing.sm,
      borderRadius: currentTheme.borderRadius.md,
    },
    searchContainer: {
      padding: currentTheme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.ui.border,
    },
    categoryItem: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      padding: currentTheme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.ui.border,
      backgroundColor: colors.surface.primary,
    },
    categoryInfo: {
      flex: 1,
      marginLeft: currentTheme.spacing.sm,
    },
    categoryName: {
      fontSize: 16,
      fontWeight: '500' as const,
      marginBottom: 2,
    },
    categoryCount: {
      fontSize: 12,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    loadingText: {
      marginTop: currentTheme.spacing.md,
      fontSize: 16,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      padding: currentTheme.spacing.lg,
    },
    errorText: {
      marginTop: currentTheme.spacing.sm,
      fontSize: 16,
    },
    retryButton: {
      marginTop: currentTheme.spacing.md,
      paddingVertical: currentTheme.spacing.sm,
      paddingHorizontal: currentTheme.spacing.lg,
      borderRadius: currentTheme.borderRadius.md,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      padding: currentTheme.spacing.lg,
    },
    emptyText: {
      marginTop: currentTheme.spacing.md,
      fontSize: 16,
      fontWeight: '500' as const,
    },
    emptySubText: {
      marginTop: currentTheme.spacing.sm,
      fontSize: 14,
      textAlign: 'center' as const,
    },
    footer: {
      padding: currentTheme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.ui.border,
      backgroundColor: colors.surface.primary,
    },
  };

  useEffect(() => {
    loadData();
  }, [profileId]);

  // Initialiser les animations lorsque les catégories sont chargées
  useEffect(() => {
    if (availableCategories.length > 0) {
      const newAnimations: {[key: string]: Animated.Value} = {};
      availableCategories.forEach(category => {
        newAnimations[category.name] = new Animated.Value(1);
      });
      setLockAnimations(newAnimations);
    }
  }, [availableCategories]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Charger le profil
      const profileData = await ProfileService.getProfileById(profileId);
      if (!profileData) {
        Alert.alert('Erreur', 'Profil introuvable');
        navigation.goBack();
        return;
      }
      setProfile(profileData);

      // Charger les catégories dynamiques depuis la playlist active
      await loadAvailableCategories();

      // Pré-sélectionner les catégories déjà bloquées
      setSelectedCategories(profileData.blockedCategories || []);
    } catch (error) {
      console.error('❌ Error loading categories:', error);
      Alert.alert('Erreur', 'Impossible de charger les catégories');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Charger les catégories depuis la playlist active avec le service optimisé
   * Utilise CategoriesService pour des performances maximales sur les grandes playlists
   */
  const loadAvailableCategories = async () => {
    // 🛡️ Protection contre les appels multiples simultanés
    if (isLoadingCategoriesRef.current) {
      console.log('⚠️ [CategoriesSelection] Chargement déjà en cours, ignorer cet appel');
      return;
    }

    isLoadingCategoriesRef.current = true;

    try {
      setIsLoadingCategories(true);
      setCategoriesError(null);

      console.log('🔄 [CategoriesSelection] Chargement des catégories avec CategoriesService...');

      // ✅ OPTIMISATION: Cache AsyncStorage compressé (INSTANTANÉ au 2ème lancement)
      const playlists = await database
        .get<Playlist>('playlists')
        .query(Q.where('is_active', true))
        .fetch();

      if (playlists.length > 0) {
        const playlistId = playlists[0].id;
        setCurrentPlaylistId(playlistId);

        try {
          const cacheKey = `parental_categories_cache_${playlistId}`;
          const cachedData = await AsyncStorage.getItem(cacheKey);

          if (cachedData) {
            // ⚡ Décompression et parsing en arrière-plan
            InteractionManager.runAfterInteractions(() => {
              try {
                const decompressed = LZString.decompressFromUTF16(cachedData);
                const parsed = decompressed ? JSON.parse(decompressed) : JSON.parse(cachedData);
                const cacheAge = Date.now() - parsed.timestamp;

                // Cache valide pendant 24h
                if (cacheAge < 24 * 60 * 60 * 1000) {
                  console.log(`💾 [CategoriesSelection] Cache AsyncStorage trouvé (${Math.round(cacheAge / 1000 / 60)}min)`);
                  setAvailableCategories(parsed.categories);
                  setIsLoadingCategories(false);
                  isLoadingCategoriesRef.current = false;
                  console.log(`⚡ [CategoriesSelection] Affichage instantané: ${parsed.categories.length} catégories`);
                }
              } catch (parseError) {
                console.log('⚠️ [CategoriesSelection] Erreur parsing cache:', parseError);
              }
            });
            return;
          }
        } catch (error) {
          console.log('⚠️ [CategoriesSelection] Erreur lecture cache AsyncStorage:', error);
        }
      }

      // 🚀 Utiliser le service optimisé
      const categories = await CategoriesService.loadCategories();

      if (categories.length === 0) {
        // Vérifier s'il y a une playlist active
        const playlists = await database
          .get<Playlist>('playlists')
          .query(Q.where('is_active', true))
          .fetch();

        if (playlists.length > 0) {
          setCurrentPlaylistId(playlists[0].id);
        } else {
          setCategoriesError('Aucune playlist active trouvée');
        }
      } else {
        // Mettre à jour le currentPlaylistId pour le bouton de refresh
        const playlists = await database
          .get<Playlist>('playlists')
          .query(Q.where('is_active', true))
          .fetch();

        if (playlists.length > 0) {
          setCurrentPlaylistId(playlists[0].id);
        }
      }

      setAvailableCategories(categories);
      console.log(`✅ [CategoriesSelection] ${categories.length} catégories chargées`);

      // 💾 OPTIMISATION: Sauvegarder dans AsyncStorage avec compression
      if (currentPlaylistId) {
        try {
          const cacheKey = `parental_categories_cache_${currentPlaylistId}`;
          const dataToCache = {
            categories: categories,
            timestamp: Date.now(),
          };

          const jsonString = JSON.stringify(dataToCache);
          const compressed = LZString.compressToUTF16(jsonString);
          const compressionRatio = Math.round((1 - compressed.length / jsonString.length) * 100);

          await AsyncStorage.setItem(cacheKey, compressed);
          console.log(`💾 [CategoriesSelection] Cache sauvegardé (compression: ${compressionRatio}%)`);
        } catch (cacheError) {
          console.log('⚠️ [CategoriesSelection] Erreur sauvegarde cache:', cacheError);
        }
      }

    } catch (error) {
      console.error('❌ [CategoriesSelection] Erreur:', error);
      setCategoriesError(`Erreur: ${error.message || 'Impossible de charger les catégories'}`);
      setAvailableCategories([]);
    } finally {
      setIsLoadingCategories(false);
      isLoadingCategoriesRef.current = false;
    }
  };

  const handleToggleCategory = async (categoryName: string) => {
    if (!profile) return;

    // Animer le cadenas existant ou créer une nouvelle animation
    const animateLock = () => {
      const animatedValue = lockAnimations[categoryName];
      if (animatedValue) {
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 0.8,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 1.1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();
      }
    };

    // Créer une animation pour le cadenas si elle n'existe pas
    if (!lockAnimations[categoryName]) {
      const newAnimations = {
        ...lockAnimations,
        [categoryName]: new Animated.Value(1),
      };
      setLockAnimations(newAnimations);

      // Attendre un tick pour que l'animation soit disponible
      setTimeout(animateLock, 0);
    } else {
      animateLock();
    }

    // Inverser l'état de la catégorie
    const newCategories = selectedCategories.includes(categoryName)
      ? selectedCategories.filter(c => c !== categoryName)
      : [...selectedCategories, categoryName];

    setSelectedCategories(newCategories);

    // Sauvegarder automatiquement
    try {
      await ProfileService.updateProfile(profileId, {
        blockedCategories: newCategories,
      });
    } catch (error) {
      // Rétablir l'état précédent en cas d'erreur
      setSelectedCategories(selectedCategories);
    }
  };

  
  
  
  if (isLoading || !profile) {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: colors.background.primary}]}>
        <View style={styles.loadingContainer}>
          <Icon name="refresh" size={48} color={colors.text.secondary} />
          <RNText style={[styles.loadingText, {color: colors.text.primary}]}>Chargement...</RNText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background.primary}]}>
      {/* Header */}
      <View style={[styles.header, {borderBottomColor: colors.ui.border}]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text variant="titleLarge" style={[styles.headerTitle, {color: colors.text.primary}]}>
            Catégories bloquées
          </Text>
          <Text variant="bodyMedium" style={{color: colors.text.secondary}}>
            Profil: {profile.name}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.refreshButton, {backgroundColor: colors.surface.secondary}]}
          onPress={loadAvailableCategories}
          onLongPress={async () => {
            // 🗑️ Forcer le vidage du cache avec appui long
            try {
              await CategoriesService.clearCache(currentPlaylistId || undefined);
              console.log('🗑️ [CategoriesSelection] Cache vidé manuellement');
              loadAvailableCategories();
            } catch (error) {
              console.error('❌ [CategoriesSelection] Erreur vidage cache:', error);
            }
          }}>
          <Icon name="sync" size={20} color={colors.accent.primary} />
        </TouchableOpacity>
      </View>

      
      
      
      {/* Contenu principal */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {isLoadingCategories ? (
          <View style={styles.loadingContainer}>
            <View style={styles.skeletonContainer}>
              {/* Skeleton loader - affiche une structure de chargement réaliste */}
              {Array.from({length: 12}).map((_, index) => (
                <View key={index} style={[styles.skeletonItem, {backgroundColor: colors.surface.secondary}]}>
                  <View style={[styles.skeletonIcon, {backgroundColor: colors.surface.tertiary}]} />
                  <View style={styles.skeletonTextContainer}>
                    <View style={[styles.skeletonTitle, {backgroundColor: colors.surface.tertiary}]} />
                    <View style={[styles.skeletonSubtitle, {backgroundColor: colors.surface.tertiary}]} />
                  </View>
                </View>
              ))}
            </View>
            <RNText style={[styles.loadingText, {color: colors.text.secondary}]}>
              Chargement des catégories...
            </RNText>
          </View>
        ) : categoriesError ? (
          <View style={styles.errorContainer}>
            <Icon name="error-outline" size={48} color={colors.accent.error} />
            <RNText style={[styles.errorText, {color: colors.accent.error}]}>
              {categoriesError}
            </RNText>
            <TouchableOpacity
              style={[styles.retryButton, {backgroundColor: colors.accent.primary}]}
              onPress={loadAvailableCategories}>
              <Icon name="refresh" size={20} color="#ffffff" />
              <RNText style={styles.retryText}>Réessayer</RNText>
            </TouchableOpacity>
          </View>
        ) : availableCategories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="search-off" size={48} color={colors.text.secondary} />
            <RNText style={[styles.emptyText, {color: colors.text.secondary}]}>
              Aucune catégorie trouvée
            </RNText>
            <RNText style={[styles.emptySubText, {color: colors.text.secondary}]}>
              La playlist active ne contient aucune catégorie valide
            </RNText>
          </View>
        ) : (
          <View style={styles.categoriesGrid}>
            {availableCategories.map(category => {
              const isBlocked = selectedCategories.includes(category.name);
              const animatedValue = lockAnimations[category.name] || new Animated.Value(1);

              return (
                <TouchableOpacity
                  key={category.name}
                  style={[
                    styles.categoryItem,
                    {
                      backgroundColor: colors.surface.primary,
                      borderColor: colors.ui.border,
                    },
                  ]}
                  onPress={() => handleToggleCategory(category.name)}
                >
                  <View style={styles.categoryContent}>
                    <RNText
                      style={[
                        styles.categoryName,
                        {
                          color: colors.text.primary,
                        },
                      ]}
                      numberOfLines={2}
                    >
                      {category.name}
                    </RNText>
                    <View style={styles.lockContainer}>
                      <RNText
                        style={[
                          styles.channelCountBesideLock,
                          {
                            color: colors.text.secondary,
                          },
                        ]}
                      >
                        {category.count}
                      </RNText>
                      <Animated.View
                        style={{
                          transform: [{ scale: animatedValue }],
                        }}
                      >
                        <Icon
                          name={isBlocked ? 'lock' : 'lock-open'}
                          size={20}
                          color={isBlocked ? colors.accent.error : colors.accent.primary}
                        />
                      </Animated.View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 20,
    fontWeight: '500',
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 8,
  },
  categoryItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 50,
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  lockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  channelCountBesideLock: {
    fontSize: 11,
    fontWeight: '600',
    minWidth: 20,
    textAlign: 'right',
    marginRight: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  // Skeleton loader styles
  skeletonContainer: {
    flex: 1,
    width: '100%',
    marginBottom: 20,
  },
  skeletonItem: {
    width: '48%',
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    marginHorizontal: '1%',
  },
  skeletonIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
  },
  skeletonTextContainer: {
    flex: 1,
  },
  skeletonTitle: {
    width: '80%',
    height: 14,
    borderRadius: 4,
    marginBottom: 4,
  },
  skeletonSubtitle: {
    width: '40%',
    height: 10,
    borderRadius: 4,
  },
});

export default CategoriesSelectionScreen;
