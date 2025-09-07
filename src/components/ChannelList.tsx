import React, {useState, useMemo, useCallback, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  useColorScheme,
  Dimensions,
} from 'react-native';
import {FlashList} from '@shopify/flash-list';
import FastImage from 'react-native-fast-image';
import FastScrollIndicator from './FastScrollIndicator';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

// 🚀 CONSTANTES PERFORMANCE IPTV SMARTERS PRO LEVEL
const ITEM_HEIGHT = 80; // Hauteur pour FlashList estimatedItemSize
const SCREEN_HEIGHT = Dimensions.get('window').height;
import {Channel} from '../types';

// 🚀 SKELETON COMPONENT pour FlashList
const SkeletonChannelCard: React.FC<{isDarkMode: boolean}> = ({isDarkMode}) => {
  return (
    <View style={[styles.channelItem, isDarkMode && styles.channelItemDark]}>
      <SkeletonPlaceholder
        backgroundColor={isDarkMode ? '#2a2a2a' : '#f0f0f0'}
        highlightColor={isDarkMode ? '#404040' : '#ffffff'}
        speed={1200}>
        <View style={styles.channelContent}>
          {/* Logo skeleton */}
          <View
            style={{
              width: 50,
              height: 50,
              borderRadius: 8,
              marginRight: 15,
            }}
          />

          {/* Info skeleton */}
          <View style={{flex: 1}}>
            <View
              style={{
                height: 18,
                borderRadius: 4,
                marginBottom: 6,
                width: '75%',
              }}
            />
            <View
              style={{
                height: 12,
                borderRadius: 3,
                width: '50%',
              }}
            />
          </View>

          {/* Favorite button skeleton */}
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
            }}
          />
        </View>
      </SkeletonPlaceholder>
    </View>
  );
};

interface ChannelListProps {
  channels: Channel[];
  onChannelSelect: (channel: Channel) => void;
  currentChannel?: Channel | null;
  favorites: string[];
  onToggleFavorite: (channelId: string) => void;
}

const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  onChannelSelect,
  currentChannel,
  favorites,
  onToggleFavorite,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showFastScroll, setShowFastScroll] = useState(false);
  const [currentScrollIndex, setCurrentScrollIndex] = useState(0);
  const isDarkMode = useColorScheme() === 'dark';
  const flashListRef = useRef<FlashList<Channel>>(null);

  // 🚀 CACHE CATÉGORIES - Pre-compute pour éviter recalculs
  const categoriesWithCounts = useMemo(() => {
    const categoryCounts = new Map<string, number>();
    categoryCounts.set('all', channels.length);
    categoryCounts.set('favorites', favorites.length);

    channels.forEach(channel => {
      if (channel.category) {
        const count = categoryCounts.get(channel.category) || 0;
        categoryCounts.set(channel.category, count + 1);
      }
    });

    return Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1]);
  }, [channels, favorites]);

  // 🚀 CACHE FILTRES PAR CATÉGORIE - Pre-compute pour changement instantané
  const channelsByCategory = useMemo(() => {
    const cache = new Map<string, Channel[]>();

    // All channels
    cache.set('all', channels);

    // Favorites
    cache.set(
      'favorites',
      channels.filter(channel => favorites.includes(channel.id)),
    );

    // By category
    const categoryGroups = new Map<string, Channel[]>();
    channels.forEach(channel => {
      if (channel.category) {
        const existing = categoryGroups.get(channel.category) || [];
        existing.push(channel);
        categoryGroups.set(channel.category, existing);
      }
    });

    categoryGroups.forEach((channels, category) => {
      cache.set(category, channels);
    });

    return cache;
  }, [channels, favorites]);

  // 🚀 FILTERED CHANNELS - Ultra-rapide avec cache pre-computed
  const filteredChannels = useMemo(() => {
    // Get cached channels for selected category (instant!)
    let filtered = channelsByCategory.get(selectedCategory) || [];

    // Filter by search query only if needed
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        channel =>
          channel.name.toLowerCase().includes(query) ||
          (channel.category && channel.category.toLowerCase().includes(query)),
      );
    }

    return filtered;
  }, [channelsByCategory, selectedCategory, searchQuery]);

  // 🚀 RENDER ITEM SIMPLIFIÉ - FlashList gère les skeletons nativement
  const renderChannelItem = useCallback(
    ({item}: {item: Channel}) => {
      const isSelected = currentChannel?.id === item.id;
      const isFavorite = favorites.includes(item.id);

    return (
        <TouchableOpacity
          style={[
            styles.channelItem,
            isDarkMode && styles.channelItemDark,
            isSelected && styles.channelItemSelected,
          ]}
          onPress={() => onChannelSelect(item)}>
          <View style={styles.channelContent}>
            {/* 🖼️ LOGO */}
            {item.logo ? (
              <FastImage
                source={{
                  uri: item.logo,
                  priority: FastImage.priority.normal,
                  cache: FastImage.cacheControl.web,
                }}
                style={styles.channelLogo}
                resizeMode={FastImage.resizeMode.cover}
              />
            ) : (
              <View style={[styles.channelLogo, styles.channelLogoPlaceholder]}>
                <Text style={styles.channelLogoText}>📺</Text>
              </View>
            )}

            {/* 📝 INFO */}
            <View style={styles.channelInfo}>
              <Text
                style={[
                  styles.channelName,
                  isDarkMode && styles.channelNameDark,
                  isSelected && styles.channelNameSelected,
                ]}
                numberOfLines={1}>
                {item.name}
              </Text>
              {item.category && (
                <Text
                  style={[
                    styles.channelCategory,
                    isDarkMode && styles.channelCategoryDark,
                  ]}>
                  {item.category}
                </Text>
              )}
            </View>

            {/* ⭐ FAVORITE BUTTON */}
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={() => onToggleFavorite(item.id)}>
              <Text
                style={[
                  styles.favoriteIcon,
                  isFavorite && styles.favoriteIconActive,
                ]}>
                {isFavorite ? '❤️' : '🤍'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    },
    [
      currentChannel?.id,
      favorites,
      isDarkMode,
      onChannelSelect,
      onToggleFavorite,
    ],
  );

  // 🚀 CHANGEMENT CATÉGORIE RAPIDE
  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category);

    // Reset position scroll
    flashListRef.current?.scrollToOffset({
      offset: 0,
      animated: true,
    });
  }, []);

  // 🚀 RENDER CATEGORY OPTIMISÉ - Animation instantanée
  const renderCategoryButton = useCallback(
    ([category, count]: [string, number]) => {
      const isSelected = selectedCategory === category;
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
          onPress={() => handleCategoryChange(category)}
          activeOpacity={0.7}>
          <Text
            style={[
              styles.categoryButtonText,
              isDarkMode && styles.categoryButtonTextDark,
              isSelected && styles.categoryButtonTextSelected,
            ]}>
            {displayName} ({count})
          </Text>
        </TouchableOpacity>
      );
    },
    [selectedCategory, isDarkMode, handleCategoryChange],
  );

  // 🚀 KEY EXTRACTOR optimisé
  const keyExtractor = useCallback((item: Channel) => item.id, []);

  // 🚀 FAST SCROLL HANDLERS
  const handleScrollToIndex = useCallback(
    (index: number) => {
      flashListRef.current?.scrollToIndex({
        index: Math.max(0, Math.min(index, filteredChannels.length - 1)),
        animated: true,
      });
    },
    [filteredChannels.length],
  );

  const onScroll = useCallback(
    (event: any) => {
      const {contentOffset} = event.nativeEvent;
      const currentIndex = Math.floor(contentOffset.y / ITEM_HEIGHT);
      setCurrentScrollIndex(currentIndex);

    // Show fast scroll indicator for large lists during scroll
      if (filteredChannels.length > 50) {
        setShowFastScroll(true);
        // Hide after 2 seconds of no scrolling
        setTimeout(() => setShowFastScroll(false), 2000);
      }
    },
    [filteredChannels.length],
  );

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={[styles.searchInput, isDarkMode && styles.searchInputDark]}
          placeholder="Rechercher une chaîne..."
          placeholderTextColor={isDarkMode ? '#666' : '#999'}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* 🚀 Categories avec compteurs */}
      <View style={styles.categoriesContainer}>
        <FlashList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categoriesWithCounts}
          renderItem={({item}) => renderCategoryButton(item)}
          keyExtractor={item => item[0]}
          estimatedItemSize={100}
        />
      </View>

      {/* 🚀 CHANNELS LIST ULTRA-OPTIMISÉE avec FlashList */}
      <FlashList
        ref={flashListRef}
        data={filteredChannels}
        renderItem={renderChannelItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={ITEM_HEIGHT}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
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
        PlaceholderComponent={<SkeletonChannelCard isDarkMode={isDarkMode} />}
      />

      {/* 🚀 FAST SCROLL INDICATOR - Comme IPTV Smarters Pro */}
      <FastScrollIndicator
        channels={filteredChannels}
        onScrollToIndex={handleScrollToIndex}
        visible={showFastScroll && filteredChannels.length > 50}
        currentIndex={currentScrollIndex}
      />

      {/* Channel count */}
      <View style={styles.footerInfo}>
        <Text
          style={[styles.channelCount, isDarkMode && styles.channelCountDark]}>
          {filteredChannels.length} chaîne
          {filteredChannels.length !== 1 ? 's' : ''}
        </Text>
      </View>
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
  searchContainer: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    backgroundColor: '#f9f9f9',
  },
  searchInputDark: {
    backgroundColor: '#2a2a2a',
    borderColor: '#444',
    color: '#fff',
  },
  categoriesContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 10,
  },
  categoryButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 5,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
  },
  categoryButtonDark: {
    backgroundColor: '#333',
  },
  categoryButtonSelected: {
    backgroundColor: '#007AFF',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#333',
  },
  categoryButtonTextDark: {
    color: '#fff',
  },
  categoryButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  channelItem: {
    backgroundColor: '#fff',
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 2,
    height: ITEM_HEIGHT, // 🚀 HAUTEUR FIXE pour getItemLayout
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
    padding: 12, // 🚀 Padding réduit pour tenir dans hauteur fixe
    height: ITEM_HEIGHT - 10, // 🚀 Hauteur exacte pour contenu
  },
  channelLogo: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 15,
  },
  channelLogoPlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelLogoText: {
    fontSize: 20,
  },
  channelInfo: {
    flex: 1,
  },
  channelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
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
  },
  channelCategoryDark: {
    color: '#999',
  },
  favoriteButton: {
    padding: 8,
  },
  favoriteIcon: {
    fontSize: 20,
  },
  favoriteIconActive: {
    // Already colored with emoji
  },
  emptyContainer: {
    padding: 50,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  emptyTextDark: {
    color: '#999',
  },
  footerInfo: {
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  channelCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  channelCountDark: {
    color: '#999',
  },
});

export default ChannelList;
