/**
 * 🚀 VirtualizedChannelList - Liste Ultra-Optimisée pour 100K+ Chaînes
 * Performance cible : TiviMate/IPTV Smarters Pro level (scrolling 60fps)
 */

import React, {useState, useMemo, useCallback, memo} from 'react';
import {
  View,
  Text,
  VirtualizedList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  useColorScheme,
  Dimensions,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import {Channel} from '../types';
// 🚀 OPTIMISATION: Utiliser le store optimisé
import {
  usePlaylistCategories,
  useSelectedCategory,
  useChannelsByCategory,
  usePlaylistActions,
} from '../stores/PlaylistStore';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

// 🔥 OPTIMISATION CRITIQUE : Item Heights fixes pour performances
const ITEM_HEIGHT = 80; // Hauteur fixe channel card
const SEPARATOR_HEIGHT = 1;
const SEARCH_BAR_HEIGHT = 50;
const CATEGORY_BAR_HEIGHT = 50;

interface VirtualizedChannelListProps {
  channels: Channel[];
  onChannelSelect: (channel: Channel) => void;
  currentChannel?: Channel | null;
  favorites: string[];
  onToggleFavorite: (channelId: string) => void;
}

/**
 * 🎯 COMPOSANT OPTIMISÉ : ChannelItem avec memo pour éviter re-render
 */
const ChannelItem = memo<{
  item: Channel;
  isSelected: boolean;
  isFavorite: boolean;
  isDarkMode: boolean;
  onSelect: (channel: Channel) => void;
  onToggleFavorite: (channelId: string) => void;
}>(({item, isSelected, isFavorite, isDarkMode, onSelect, onToggleFavorite}) => {
  const handlePress = useCallback(() => onSelect(item), [item, onSelect]);
  const handleFavoritePress = useCallback(
    () => onToggleFavorite(item.id),
    [item.id, onToggleFavorite],
  );

  return (
    <TouchableOpacity
      style={[
        styles.channelItem,
        isDarkMode && styles.channelItemDark,
        isSelected && styles.channelItemSelected,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}>
      <View style={styles.channelContent}>
        {/* Logo optimisé avec FastImage et cache agressif */}
        <View style={styles.logoContainer}>
          {item.logo ? (
            <FastImage
              source={{
                uri: item.logo,
                priority: FastImage.priority.normal,
                cache: FastImage.cacheControl.immutable,
              }}
              style={styles.channelLogo}
              resizeMode={FastImage.resizeMode.cover}
            />
          ) : (
            <View style={[styles.channelLogo, styles.channelLogoPlaceholder]}>
              <Text style={styles.channelLogoText}>📺</Text>
            </View>
          )}
        </View>

        {/* Informations channel */}
        <View style={styles.channelInfo}>
          <Text
            style={[
              styles.channelName,
              isDarkMode && styles.channelNameDark,
              isSelected && styles.channelNameSelected,
            ]}
            numberOfLines={1}
            ellipsizeMode="tail">
            {item.name}
          </Text>
          {item.category && (
            <Text
              style={[
                styles.channelCategory,
                isDarkMode && styles.channelCategoryDark,
              ]}
              numberOfLines={1}>
              {item.category}
            </Text>
          )}
        </View>

        {/* Bouton favoris optimisé */}
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={handleFavoritePress}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Text style={styles.favoriteIcon}>{isFavorite ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

/**
 * 🚀 LISTE VIRTUALISÉE ULTRA-PERFORMANTE
 */
export const VirtualizedChannelList: React.FC<VirtualizedChannelListProps> = ({
  channels,
  onChannelSelect,
  currentChannel,
  favorites,
  onToggleFavorite,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const isDarkMode = useColorScheme() === 'dark';

  // 🚀 OPTIMISATION: Utiliser le store
  const categories = usePlaylistCategories();
  const selectedCategoryFromStore = useSelectedCategory();
  const {selectCategory} = usePlaylistActions();

  // 🚀 OPTIMISATION: Récupérer channels depuis l'index (O(1))
  const categoryChannels = useChannelsByCategory(selectedCategoryFromStore || 'TOUS');

  // 🚀 OPTIMISATION: Filtrage recherche seulement (catégorie déjà filtrée par le store)
  const filteredChannels = useMemo(() => {
    let filtered = categoryChannels;

    // Recherche par nom (case insensitive)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        channel =>
          channel.name.toLowerCase().includes(query) ||
          (channel.category && channel.category.toLowerCase().includes(query)),
      );
    }

    return filtered;
  }, [categoryChannels, searchQuery]);

  // 🎯 CALLBACKS OPTIMISÉS : useCallback pour éviter re-renders
  const handleChannelSelect = useCallback(
    (channel: Channel) => {
      onChannelSelect(channel);
    },
    [onChannelSelect],
  );

  const handleToggleFavorite = useCallback(
    (channelId: string) => {
      onToggleFavorite(channelId);
    },
    [onToggleFavorite],
  );

  // 🚀 VIRTUALIZEDLIST : Fonctions de rendu optimisées
  const getItem = useCallback((data: Channel[], index: number) => {
    return data[index];
  }, []);

  const getItemCount = useCallback((data: Channel[]) => {
    return data.length;
  }, []);

  const renderItem = useCallback(
    ({item, index}: {item: Channel; index: number}) => {
      const isSelected = currentChannel?.id === item.id;
      const isFavorite = favorites.includes(item.id);

      return (
        <ChannelItem
          item={item}
          isSelected={isSelected}
          isFavorite={isFavorite}
          isDarkMode={isDarkMode}
          onSelect={handleChannelSelect}
          onToggleFavorite={handleToggleFavorite}
        />
      );
    },
    [
      currentChannel,
      favorites,
      isDarkMode,
      handleChannelSelect,
      handleToggleFavorite,
    ],
  );

  const keyExtractor = useCallback((item: Channel, index: number) => {
    return item.id || `channel_${index}`;
  }, []);

  const getItemLayout = useCallback(
    (data: any, index: number) => ({
      length: ITEM_HEIGHT + SEPARATOR_HEIGHT,
      offset: (ITEM_HEIGHT + SEPARATOR_HEIGHT) * index,
      index,
    }),
    [],
  );

  // 🎨 RENDER CATEGORIES BAR
  const renderCategoryButton = (category: string) => {
    const isSelected = selectedCategoryFromStore === category;
    const displayName =
      category === 'all'
        ? 'Toutes'
        : category === 'favorites'
        ? 'Favoris'
        : category;

    return (
      <TouchableOpacity
        key={category}
        style={[
          styles.categoryButton,
          isDarkMode && styles.categoryButtonDark,
          isSelected && styles.categoryButtonSelected,
        ]}
        onPress={() => selectCategory(category)}>
        <Text
          style={[
            styles.categoryButtonText,
            isDarkMode && styles.categoryButtonTextDark,
            isSelected && styles.categoryButtonTextSelected,
          ]}
          numberOfLines={1}>
          {displayName}
        </Text>
      </TouchableOpacity>
    );
  };

  // 📊 STATISTIQUES PERFORMANCE
  console.log(
    `🚀 VirtualizedChannelList - Rendering ${filteredChannels.length} channels`,
  );

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* 🔍 SEARCH BAR FIXE */}
      <View
        style={[
          styles.searchContainer,
          isDarkMode && styles.searchContainerDark,
        ]}>
        <TextInput
          style={[styles.searchInput, isDarkMode && styles.searchInputDark]}
          placeholder="Rechercher une chaîne..."
          placeholderTextColor={isDarkMode ? '#666' : '#999'}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* 📂 CATEGORIES HORIZONTALES */}
      <View
        style={[
          styles.categoriesContainer,
          isDarkMode && styles.categoriesContainerDark,
        ]}>
        <VirtualizedList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories.map(c => c.name)}
          initialNumToRender={5}
          windowSize={10}
          maxToRenderPerBatch={5}
          updateCellsBatchingPeriod={50}
          getItemCount={data => data.length}
          getItem={(data, index) => data[index]}
          keyExtractor={item => item}
          renderItem={({item}) => renderCategoryButton(item)}
        />
      </View>

      {/* 🚀 LISTE VIRTUALISÉE ULTRA-PERFORMANTE */}
      <VirtualizedList
        data={filteredChannels}
        initialNumToRender={Math.ceil(SCREEN_HEIGHT / ITEM_HEIGHT) + 2} // Juste assez pour remplir l'écran
        windowSize={5} // Réduit pour meilleures perfs mémoire
        maxToRenderPerBatch={10} // Batches plus petits
        updateCellsBatchingPeriod={50} // 50ms entre batches
        removeClippedSubviews={true} // CRITIQUE pour 100K+ items
        getItemCount={getItemCount}
        getItem={getItem}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout} // CRITIQUE pour perfs scroll
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text
              style={[styles.emptyText, isDarkMode && styles.emptyTextDark]}>
              {searchQuery
                ? 'Aucune chaîne trouvée'
                : 'Aucune chaîne disponible'}
            </Text>
          </View>
        }
        ListFooterComponent={
          <View
            style={[styles.footerInfo, isDarkMode && styles.footerInfoDark]}>
            <Text
              style={[
                styles.channelCount,
                isDarkMode && styles.channelCountDark,
              ]}>
              📊 {filteredChannels.length.toLocaleString()} chaîne
              {filteredChannels.length !== 1 ? 's' : ''}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  containerDark: {
    backgroundColor: '#1a1a1a',
  },

  // 🔍 SEARCH STYLES
  searchContainer: {
    height: SEARCH_BAR_HEIGHT,
    paddingHorizontal: 15,
    paddingVertical: 5,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchContainerDark: {
    backgroundColor: '#2a2a2a',
    borderBottomColor: '#444',
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    backgroundColor: '#f9f9f9',
    fontSize: 16,
  },
  searchInputDark: {
    backgroundColor: '#333',
    borderColor: '#555',
    color: '#fff',
  },

  // 📂 CATEGORIES STYLES
  categoriesContainer: {
    height: CATEGORY_BAR_HEIGHT,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 8,
  },
  categoriesContainerDark: {
    backgroundColor: '#2a2a2a',
    borderBottomColor: '#444',
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    height: 34,
    justifyContent: 'center',
  },
  categoryButtonDark: {
    backgroundColor: '#333',
  },
  categoryButtonSelected: {
    backgroundColor: '#007AFF',
  },
  categoryButtonText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  categoryButtonTextDark: {
    color: '#fff',
  },
  categoryButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },

  // 📺 CHANNEL ITEM STYLES
  channelItem: {
    height: ITEM_HEIGHT,
    backgroundColor: '#fff',
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  channelItemDark: {
    backgroundColor: '#2a2a2a',
  },
  channelItemSelected: {
    backgroundColor: '#e3f2fd',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  channelContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    height: ITEM_HEIGHT,
  },
  logoContainer: {
    width: 56,
    height: 56,
    marginRight: 12,
  },
  channelLogo: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  channelLogoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  channelLogoText: {
    fontSize: 24,
  },
  channelInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  channelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    lineHeight: 22,
  },
  channelNameDark: {
    color: '#fff',
  },
  channelNameSelected: {
    color: '#007AFF',
  },
  channelCategory: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    lineHeight: 16,
  },
  channelCategoryDark: {
    color: '#999',
  },
  favoriteButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteIcon: {
    fontSize: 18,
  },

  // 📊 EMPTY & FOOTER STYLES
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  emptyTextDark: {
    color: '#999',
  },
  footerInfo: {
    padding: 12,
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
  },
  footerInfoDark: {
    backgroundColor: '#2a2a2a',
  },
  channelCount: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  channelCountDark: {
    color: '#999',
  },
});

export default VirtualizedChannelList;
