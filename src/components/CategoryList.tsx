import React from 'react';
import {View, Text, FlatList, TouchableOpacity, StyleSheet} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
// PlaylistContext remplacé par PlaylistStore
import {usePlaylist} from '../stores/PlaylistStore';

const CategoryList: React.FC = () => {
  const {categories, selectedCategory, selectCategory} = usePlaylist();

  console.log('🔍 CATEGORY LIST - Rendu avec catégories:', categories.length);
  console.log('🔍 CATEGORY LIST - Détail catégories:', categories);
  console.log('🔍 CATEGORY LIST - Catégorie sélectionnée:', selectedCategory);

  // Forcer un re-render si pas de catégories
  if (!categories || categories.length === 0) {
    console.log('❌ CATEGORY LIST - AUCUNE CATÉGORIE À AFFICHER !');
    return (
      <View style={styles.sidebar}>
        <View style={styles.sectionHeader}>
          <Icon name="menu" size={20} color="#FFFFFF" />
          <Text style={styles.sectionTitle}>Catégories</Text>
        </View>
        <Text style={styles.noDataText}>❌ Aucune catégorie trouvée</Text>
      </View>
    );
  }

  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('sport')) {
      return 'sports-soccer';
    }
    if (name.includes('news') || name.includes('actualité')) {
      return 'article';
    }
    if (
      name.includes('movie') ||
      name.includes('film') ||
      name.includes('cinema')
    ) {
      return 'movie';
    }
    if (name.includes('music') || name.includes('musique')) {
      return 'music-note';
    }
    if (name.includes('kids') || name.includes('enfant')) {
      return 'child-care';
    }
    if (name.includes('documentary') || name.includes('documentaire')) {
      return 'description';
    }
    if (name.includes('entertainment') || name.includes('divertissement')) {
      return 'theaters';
    }
    if (name.includes('générale') || name.includes('general')) {
      return 'tv';
    }
    return 'menu'; // Icône par défaut
  };

  const renderCategoryItem = ({
    item,
  }: {
    item: {name: string; count: number};
  }) => {
    const isSelected = selectedCategory === item.name;
    const icon = getCategoryIcon(item.name);

    return (
      <TouchableOpacity
        style={[styles.navItem, isSelected && styles.navItemActive]}
        onPress={() => selectCategory(item.name)}
        activeOpacity={0.8}>
        <LinearGradient
          colors={
            isSelected
              ? ['rgba(33, 150, 243, 0.3)', 'rgba(33, 150, 243, 0.1)']
              : ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.04)']
          }
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.navItemGradient}>
          <View style={styles.navItemContent}>
            <Icon
              name={icon}
              size={18}
              color={isSelected ? '#2196F3' : '#FFFFFF'}
              style={styles.categoryIcon}
            />
            <Text
              style={[
                styles.categoryName,
                isSelected && styles.categoryNameActive,
              ]}
              numberOfLines={2}>
              {item.name}
            </Text>
            <LinearGradient
              colors={['rgba(33, 150, 243, 0.8)', 'rgba(33, 150, 243, 0.6)']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.categoryCountContainer}>
              <Text style={styles.categoryCount}>{item.count}</Text>
            </LinearGradient>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.sidebar}>
      <View style={styles.sectionHeader}>
        <Icon name="menu" size={20} color="#FFFFFF" />
        <Text style={styles.sectionTitle}>Catégories</Text>
      </View>

      <FlatList
        data={categories}
        keyExtractor={item => item.name}
        renderItem={renderCategoryItem}
        showsVerticalScrollIndicator={false}
        style={styles.categoryList}
        contentContainerStyle={styles.categoryListContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    width: 280,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 12,
    letterSpacing: 0.5,
  },
  categoryList: {
    flex: 1,
  },
  categoryListContent: {
    paddingBottom: 20,
  },
  navItem: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  navItemActive: {
    // Les styles actifs sont gérés par le gradient
  },
  navItemGradient: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  navItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  categoryIcon: {
    width: 20,
    textAlign: 'center',
  },
  categoryName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    lineHeight: 18,
  },
  categoryNameActive: {
    color: '#2196F3',
    fontWeight: '600',
  },
  categoryCountContainer: {
    borderRadius: 16,
    minWidth: 32,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  categoryCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  noDataText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default CategoryList;
