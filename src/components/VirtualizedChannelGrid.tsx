/**
 * 🚀 VirtualizedChannelGrid - Grille Ultra-Optimisée pour 100K+ Chaînes
 * Style TiviMate/IPTV Smarters Pro avec scrolling fluide 60fps
 */

import React, { useState, useMemo, useCallback, memo } from 'react';
import {
  View,
  Text,
  VirtualizedList,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  useColorScheme,
  Dimensions,
} from 'react-native';
import { Channel } from '../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 🔥 OPTIMISATIONS CRITIQUES : Constantes de performance
const GRID_COLUMNS = 3; // Colonnes par défaut
const CARD_MARGIN = 6;
const GRID_PADDING = 12;
const CARD_WIDTH = (SCREEN_WIDTH - (GRID_PADDING * 2) - (CARD_MARGIN * (GRID_COLUMNS + 1))) / GRID_COLUMNS;
const CARD_HEIGHT = 140;
const ROW_HEIGHT = CARD_HEIGHT + CARD_MARGIN * 2;
const SEARCH_HEIGHT = 50;

interface VirtualizedChannelGridProps {
  channels: Channel[];
  onChannelSelect: (channel: Channel) => void;
  currentChannel?: Channel | null;
  favorites: string[];
  onToggleFavorite: (channelId: string) => void;
  columns?: number;
}

/**
 * 🎯 CARTE CHAÎNE ULTRA-OPTIMISÉE avec memo
 */
const ChannelCard = memo<{
  item: Channel;
  isSelected: boolean;
  isFavorite: boolean;
  isDarkMode: boolean;
  onSelect: (channel: Channel) => void;
  onToggleFavorite: (channelId: string) => void;
  cardWidth: number;
}>(({ item, isSelected, isFavorite, isDarkMode, onSelect, onToggleFavorite, cardWidth }) => {

  const handlePress = useCallback(() => onSelect(item), [item, onSelect]);
  const handleFavoritePress = useCallback((e: any) => {
    e.stopPropagation();
    onToggleFavorite(item.id);
  }, [item.id, onToggleFavorite]);

  return (
    <TouchableOpacity
      style={[
        styles.channelCard,
        { width: cardWidth },
        isDarkMode && styles.channelCardDark,
        isSelected && styles.channelCardSelected,
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      {/* Logo avec gestion fallback optimisée */}
      <View style={styles.logoContainer}>
        {item.logo ? (
          <Image
            source={{ uri: item.logo }}
            style={styles.channelLogo}
            resizeMode="cover"
            fadeDuration={0} // Pas d'animation pour les perfs
            defaultSource={require('../assets/channel-placeholder.png')} // Fallback par défaut
          />
        ) : (
          <View style={[styles.channelLogo, styles.logoPlaceholder]}>
            <Text style={styles.logoEmoji}>📺</Text>
          </View>
        )}
        
        {/* Badge favoris */}
        {isFavorite && (
          <View style={styles.favoriteBadge}>
            <Text style={styles.favoriteBadgeText}>❤️</Text>
          </View>
        )}
      </View>

      {/* Nom chaîne avec gestion overflow */}
      <View style={styles.channelInfo}>
        <Text
          style={[
            styles.channelName,
            isDarkMode && styles.channelNameDark,
            isSelected && styles.channelNameSelected,
          ]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {item.name}
        </Text>
        
        {/* Catégorie optionnelle */}
        {item.category && (
          <Text 
            style={[styles.channelCategory, isDarkMode && styles.channelCategoryDark]}
            numberOfLines={1}
          >
            {item.category}
          </Text>
        )}
      </View>

      {/* Bouton favoris discret */}
      <TouchableOpacity
        style={styles.favoriteToggle}
        onPress={handleFavoritePress}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.favoriteIcon}>
          {isFavorite ? '💖' : '🤍'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

/**
 * 🚀 RANGÉE DE GRILLE VIRTUALISÉE pour performance maximale
 */
const GridRow = memo<{
  rowData: Channel[];
  rowIndex: number;
  currentChannel?: Channel | null;
  favorites: string[];
  isDarkMode: boolean;
  cardWidth: number;
  onChannelSelect: (channel: Channel) => void;
  onToggleFavorite: (channelId: string) => void;
}>(({ rowData, currentChannel, favorites, isDarkMode, cardWidth, onChannelSelect, onToggleFavorite }) => {

  return (
    <View style={styles.gridRow}>
      {rowData.map((channel) => {
        const isSelected = currentChannel?.id === channel.id;
        const isFavorite = favorites.includes(channel.id);

        return (
          <ChannelCard
            key={channel.id}
            item={channel}
            isSelected={isSelected}
            isFavorite={isFavorite}
            isDarkMode={isDarkMode}
            cardWidth={cardWidth}
            onSelect={onChannelSelect}
            onToggleFavorite={onToggleFavorite}
          />
        );
      })}
    </View>
  );
});

/**
 * 🏆 GRILLE VIRTUALISÉE PRINCIPALE
 */
export const VirtualizedChannelGrid: React.FC<VirtualizedChannelGridProps> = ({
  channels,
  onChannelSelect,
  currentChannel,
  favorites,
  onToggleFavorite,
  columns = GRID_COLUMNS,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const isDarkMode = useColorScheme() === 'dark';

  // 📏 Calcul dynamique largeur cartes selon colonnes
  const cardWidth = useMemo(() => {
    return (SCREEN_WIDTH - (GRID_PADDING * 2) - (CARD_MARGIN * (columns + 1))) / columns;
  }, [columns]);

  // 🧠 Categories mémoisées pour performance
  const categories = useMemo(() => {
    const cats = new Set(['all', 'favorites']);
    for (let i = 0; i < channels.length; i++) {
      const channel = channels[i];
      if (channel.category) {
        cats.add(channel.category);
      }
    }
    return Array.from(cats);
  }, [channels]);

  // 🔍 Filtrage ultra-optimisé
  const filteredChannels = useMemo(() => {
    let filtered = channels;

    // Filtre catégorie
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'favorites') {
        const favoriteSet = new Set(favorites);
        filtered = channels.filter(channel => favoriteSet.has(channel.id));
      } else {
        filtered = channels.filter(channel => channel.category === selectedCategory);
      }
    }

    // Recherche textuelle
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(channel => 
        channel.name.toLowerCase().includes(query) ||
        (channel.category && channel.category.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [channels, selectedCategory, searchQuery, favorites]);

  // 🏗️ Conversion en rangées pour grille virtualisée
  const gridData = useMemo(() => {
    const rows: Channel[][] = [];
    for (let i = 0; i < filteredChannels.length; i += columns) {
      const row = filteredChannels.slice(i, i + columns);
      // Completer rangée incomplete avec éléments vides si besoin
      while (row.length < columns) {
        row.push({ 
          id: `empty_${i}_${row.length}`, 
          name: '', 
          url: '', 
          logo: '',
          category: '',
          isEmpty: true 
        } as Channel & { isEmpty: boolean });
      }
      rows.push(row);
    }
    return rows;
  }, [filteredChannels, columns]);

  // 🎯 Callbacks optimisés
  const handleChannelSelect = useCallback((channel: Channel) => {
    if (!(channel as any).isEmpty) {
      onChannelSelect(channel);
    }
  }, [onChannelSelect]);

  const handleToggleFavorite = useCallback((channelId: string) => {
    onToggleFavorite(channelId);
  }, [onToggleFavorite]);

  // 🚀 Fonctions VirtualizedList optimisées
  const getItem = useCallback((data: Channel[][], index: number) => {
    return data[index];
  }, []);

  const getItemCount = useCallback((data: Channel[][]) => {
    return data.length;
  }, []);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: ROW_HEIGHT,
    offset: ROW_HEIGHT * index,
    index,
  }), []);

  const renderRow = useCallback(({ item: rowData, index }: { item: Channel[]; index: number }) => {
    return (
      <GridRow
        rowData={rowData}
        rowIndex={index}
        currentChannel={currentChannel}
        favorites={favorites}
        isDarkMode={isDarkMode}
        cardWidth={cardWidth}
        onChannelSelect={handleChannelSelect}
        onToggleFavorite={handleToggleFavorite}
      />
    );
  }, [currentChannel, favorites, isDarkMode, cardWidth, handleChannelSelect, handleToggleFavorite]);

  const keyExtractor = useCallback((item: Channel[], index: number) => {
    return `row_${index}_${item[0]?.id || 'empty'}`;
  }, []);

  // 📊 Stats de performance
  console.log(`🚀 VirtualizedChannelGrid - ${filteredChannels.length} chaînes en ${gridData.length} rangées`);

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* 🔍 Barre de recherche */}
      <View style={[styles.searchContainer, isDarkMode && styles.searchContainerDark]}>
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

      {/* 📂 Barre catégories horizontale */}
      <View style={[styles.categoriesContainer, isDarkMode && styles.categoriesContainerDark]}>
        <VirtualizedList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          initialNumToRender={5}
          windowSize={8}
          maxToRenderPerBatch={3}
          getItemCount={(data) => data.length}
          getItem={(data, index) => data[index]}
          keyExtractor={(item) => `cat_${item}`}
          renderItem={({ item: category }) => {
            const isSelected = selectedCategory === category;
            const displayName = category === 'all' ? 'Toutes' : 
                              category === 'favorites' ? 'Favoris' : category;
            
            return (
              <TouchableOpacity
                style={[
                  styles.categoryButton,
                  isDarkMode && styles.categoryButtonDark,
                  isSelected && styles.categoryButtonSelected,
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    isDarkMode && styles.categoryButtonTextDark,
                    isSelected && styles.categoryButtonTextSelected,
                  ]}
                  numberOfLines={1}
                >
                  {displayName}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* 🚀 GRILLE VIRTUALISÉE ULTRA-PERFORMANTE */}
      <VirtualizedList
        data={gridData}
        initialNumToRender={Math.ceil(SCREEN_HEIGHT / ROW_HEIGHT) + 2}
        windowSize={6} // Optimisé pour mémoire
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={true} // ESSENTIEL pour 100K+ items
        getItemCount={getItemCount}
        getItem={getItem}
        renderItem={renderRow}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout} // Performance critique
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.gridContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📺</Text>
            <Text style={[styles.emptyText, isDarkMode && styles.emptyTextDark]}>
              {searchQuery ? 'Aucune chaîne trouvée' : 'Aucune chaîne disponible'}
            </Text>
          </View>
        }
        ListFooterComponent={
          <View style={[styles.footerStats, isDarkMode && styles.footerStatsDark]}>
            <Text style={[styles.statsText, isDarkMode && styles.statsTextDark]}>
              📊 {filteredChannels.length.toLocaleString()} chaînes • {gridData.length} rangées
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
    backgroundColor: '#f8f9fa',
  },
  containerDark: {
    backgroundColor: '#121212',
  },

  // 🔍 RECHERCHE
  searchContainer: {
    height: SEARCH_HEIGHT,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  searchContainerDark: {
    backgroundColor: '#1f1f1f',
    borderBottomColor: '#333',
  },
  searchInput: {
    flex: 1,
    height: 34,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 17,
    paddingHorizontal: 14,
    backgroundColor: '#f5f5f5',
    fontSize: 15,
  },
  searchInputDark: {
    backgroundColor: '#2a2a2a',
    borderColor: '#444',
    color: '#fff',
  },

  // 📂 CATEGORIES
  categoriesContainer: {
    height: 44,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
    paddingVertical: 6,
  },
  categoriesContainerDark: {
    backgroundColor: '#1f1f1f',
    borderBottomColor: '#333',
  },
  categoryButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginHorizontal: 4,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    height: 32,
    justifyContent: 'center',
  },
  categoryButtonDark: {
    backgroundColor: '#2a2a2a',
  },
  categoryButtonSelected: {
    backgroundColor: '#007AFF',
  },
  categoryButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  categoryButtonTextDark: {
    color: '#ccc',
  },
  categoryButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },

  // 🏗️ GRILLE
  gridContainer: {
    padding: GRID_PADDING,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: CARD_MARGIN,
    height: CARD_HEIGHT,
  },

  // 🎯 CARTES CHAÎNES
  channelCard: {
    height: CARD_HEIGHT,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    margin: CARD_MARGIN / 2,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  channelCardDark: {
    backgroundColor: '#1f1f1f',
  },
  channelCardSelected: {
    backgroundColor: '#e3f2fd',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  
  logoContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  channelLogo: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  logoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoEmoji: {
    fontSize: 24,
  },
  favoriteBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteBadgeText: {
    fontSize: 10,
  },

  channelInfo: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
    marginTop: 6,
  },
  channelName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    lineHeight: 14,
  },
  channelNameDark: {
    color: '#fff',
  },
  channelNameSelected: {
    color: '#007AFF',
  },
  channelCategory: {
    fontSize: 9,
    color: '#999',
    marginTop: 2,
    textAlign: 'center',
  },
  channelCategoryDark: {
    color: '#666',
  },

  favoriteToggle: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteIcon: {
    fontSize: 12,
  },

  // 📊 EMPTY STATES & FOOTER
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  emptyTextDark: {
    color: '#999',
  },
  footerStats: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    marginTop: 8,
  },
  footerStatsDark: {
    backgroundColor: '#1a1a1a',
  },
  statsText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  statsTextDark: {
    color: '#999',
  },
});

export default VirtualizedChannelGrid;