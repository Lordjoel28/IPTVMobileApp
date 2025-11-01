/**
 * 📺 EPG Categories Screen - Sélection catégories style TiviMate
 *
 * RÉPLIQUE EXACTE de l'interface TiviMate (Image 1)
 * ✅ Design: Liste 2 colonnes (Nom catégorie | Nombre chaînes)
 * ✅ Navigation: Depuis HomeScreen bouton "LIVE EPG"
 * ✅ Interaction: Clic catégorie → EPGFullScreen
 * ✅ Données: Compteurs dynamiques par catégorie
 * ✅ Style: Cards sombres avec flèches navigation
 */

import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import type {RootStackParamList, Category, Channel} from '../types';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface EPGCategoriesScreenProps {
  route: {
    params: {
      allCategories: Category[];
      allChannels: Channel[];
      playlistId: string;
      playlistName: string;
    };
  };
}

interface CategoryWithCount {
  id: string;
  name: string;
  channelCount: number;
  channels: Channel[];
  icon: string; // Icône pour le type de catégorie
}

const EPGCategoriesScreen: React.FC<EPGCategoriesScreenProps> = ({route}) => {
  const navigation = useNavigation<NavigationProp>();
  const {allCategories, allChannels, playlistId, playlistName} = route.params;

  const [categoriesWithCount, setCategoriesWithCount] = useState<
    CategoryWithCount[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  console.log(
    '📺 [EPGCategories] Screen ouvert avec',
    allCategories?.length,
    'catégories',
  );

  // Calculer compteurs par catégorie
  const calculateCategoryCounters = useCallback(() => {
    console.log('🔄 [EPGCategories] Calcul compteurs...');

    const categoriesWithCounters: CategoryWithCount[] = [];

    // Catégorie "Tout" - toutes les chaînes
    categoriesWithCounters.push({
      id: 'all',
      name: 'Tout',
      channelCount: allChannels?.length || 0,
      channels: allChannels || [],
      icon: 'tv',
    });

    // Catégorie "Favoris" - TODO: implémenter système favoris
    categoriesWithCounters.push({
      id: 'favorites',
      name: 'Favoris',
      channelCount: 0, // TODO: compter vrais favoris
      channels: [],
      icon: 'favorite',
    });

    // Autres catégories avec comptage réel
    if (allCategories) {
      allCategories.forEach(category => {
        const categoryChannels = category.channels || [];

        // Déterminer icône basée sur nom catégorie
        const getIcon = (name: string) => {
          const lowerName = name.toLowerCase();
          if (lowerName.includes('sport')) {
            return 'sports_soccer';
          }
          if (lowerName.includes('news') || lowerName.includes('info')) {
            return 'article';
          }
          if (lowerName.includes('movie') || lowerName.includes('cinema')) {
            return 'movie';
          }
          if (lowerName.includes('music')) {
            return 'music_note';
          }
          if (lowerName.includes('kids') || lowerName.includes('enfant')) {
            return 'child_care';
          }
          if (lowerName.includes('vip') || lowerName.includes('premium')) {
            return 'star';
          }
          return 'tv';
        };

        categoriesWithCounters.push({
          id: category.id,
          name: category.name,
          channelCount: categoryChannels.length,
          channels: categoryChannels,
          icon: getIcon(category.name),
        });
      });
    }

    // Trier par nombre de chaînes décroissant
    categoriesWithCounters.sort((a, b) => b.channelCount - a.channelCount);

    setCategoriesWithCount(categoriesWithCounters);
    setIsLoading(false);

    console.log(
      '✅ [EPGCategories] Compteurs calculés:',
      categoriesWithCounters.length,
      'catégories',
    );
  }, [allCategories, allChannels]);

  // Calculer au montage
  useEffect(() => {
    calculateCategoryCounters();
  }, [calculateCategoryCounters]);

  // Navigation vers guide EPG complet
  const handleCategorySelect = (category: CategoryWithCount) => {
    console.log(
      '🎯 [EPGCategories] Catégorie sélectionnée:',
      category.name,
      '(',
      category.channelCount,
      'chaînes)',
    );

    if (category.channelCount === 0) {
      console.log('⚠️ [EPGCategories] Catégorie vide, pas de navigation');
      return;
    }

    // Navigation vers EPGFullScreen avec données catégorie
    navigation.navigate('EPGFullScreen', {
      category,
      playlistId,
      playlistName,
    });
  };

  // Filtrage recherche
  const filteredCategories = categoriesWithCount.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Rendu d'une catégorie (style TiviMate)
  const renderCategoryItem = ({item}: {item: CategoryWithCount}) => {
    const isDisabled = item.channelCount === 0;

    return (
      <TouchableOpacity
        style={[styles.categoryCard, isDisabled && styles.categoryCardDisabled]}
        onPress={() => handleCategorySelect(item)}
        disabled={isDisabled}
        activeOpacity={0.7}>
        <View style={styles.categoryContent}>
          <View style={styles.categoryLeft}>
            <View style={styles.categoryIconContainer}>
              <Icon
                name={item.icon}
                size={24}
                color={isDisabled ? '#555' : '#3498DB'}
              />
            </View>
            <Text
              style={[
                styles.categoryName,
                isDisabled && styles.categoryNameDisabled,
              ]}
              numberOfLines={1}>
              {item.name}
            </Text>
          </View>

          <View style={styles.categoryRight}>
            <Text
              style={[
                styles.categoryCount,
                isDisabled && styles.categoryCountDisabled,
              ]}>
              {item.channelCount.toLocaleString()}
            </Text>
            <Icon
              name="arrow-forward-ios"
              size={18}
              color={isDisabled ? '#333' : '#666'}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#1F1F1F"
        translucent={false}
      />

      {/* Header style TiviMate */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#EAEAEA" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Catégories EPG</Text>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              // TODO: Implémenter recherche
              console.log('🔍 Recherche non implémentée');
            }}>
            <Icon name="search" size={24} color="#EAEAEA" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              // TODO: Menu options
              console.log('⋮ Menu non implémenté');
            }}>
            <Icon name="more-vert" size={24} color="#EAEAEA" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats playlist */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          {playlistName} • {allChannels?.length || 0} chaînes •{' '}
          {categoriesWithCount.length} catégories
        </Text>
      </View>

      {/* Liste des catégories */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498DB" />
          <Text style={styles.loadingText}>Chargement des catégories...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredCategories}
          renderItem={renderCategoryItem}
          keyExtractor={item => item.id}
          style={styles.categoriesList}
          contentContainerStyle={styles.categoriesListContent}
          showsVerticalScrollIndicator={false}
          numColumns={2} // 2 colonnes comme TiviMate sur tablette
          columnWrapperStyle={styles.categoryRow}
          ItemSeparatorComponent={() => (
            <View style={styles.categorySeparator} />
          )}
        />
      )}

      {/* Message si pas de catégories */}
      {!isLoading && filteredCategories.length === 0 && (
        <View style={styles.emptyState}>
          <Icon name="tv-off" size={48} color="#666" />
          <Text style={styles.emptyTitle}>Aucune catégorie trouvée</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? 'Modifiez votre recherche'
              : 'Vérifiez votre playlist IPTV'}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101010',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1F1F1F',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },

  headerButton: {
    padding: 8,
  },

  headerTitle: {
    color: '#EAEAEA',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },

  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },

  // Stats
  statsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1F1F1F',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },

  statsText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
  },

  // Liste catégories
  categoriesList: {
    flex: 1,
  },

  categoriesListContent: {
    paddingHorizontal: 12,
    paddingVertical: 16,
  },

  categoryRow: {
    justifyContent: 'space-between',
    gap: 12,
  },

  categorySeparator: {
    height: 12,
  },

  // Card catégorie (style TiviMate)
  categoryCard: {
    flex: 1,
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',

    // Shadow pour effet depth
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },

  categoryCardDisabled: {
    backgroundColor: '#191919',
    borderColor: '#222',
    opacity: 0.6,
  },

  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },

  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  categoryName: {
    color: '#EAEAEA',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },

  categoryNameDisabled: {
    color: '#555',
  },

  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  categoryCount: {
    color: '#3498DB',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'monospace',
  },

  categoryCountDisabled: {
    color: '#555',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },

  loadingText: {
    color: '#888',
    fontSize: 14,
  },

  // État vide
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },

  emptyTitle: {
    color: '#EAEAEA',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },

  emptySubtitle: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default EPGCategoriesScreen;
