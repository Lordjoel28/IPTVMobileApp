import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  useColorScheme,
} from 'react-native';
import { Channel } from '../types';

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
  const isDarkMode = useColorScheme() === 'dark';

  const categories = useMemo(() => {
    const cats = new Set(['all']);
    channels.forEach(channel => {
      if (channel.category) {
        cats.add(channel.category);
      }
    });
    return Array.from(cats);
  }, [channels]);

  const filteredChannels = useMemo(() => {
    let filtered = channels;

    // Filter by category
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'favorites') {
        filtered = filtered.filter(channel => favorites.includes(channel.id));
      } else {
        filtered = filtered.filter(channel => channel.category === selectedCategory);
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(channel =>
        channel.name.toLowerCase().includes(query) ||
        (channel.category && channel.category.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [channels, selectedCategory, searchQuery, favorites]);

  const renderChannelItem = ({ item }: { item: Channel }) => {
    const isSelected = currentChannel?.id === item.id;
    const isFavorite = favorites.includes(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.channelItem,
          isDarkMode && styles.channelItemDark,
          isSelected && styles.channelItemSelected,
        ]}
        onPress={() => onChannelSelect(item)}
      >
        <View style={styles.channelContent}>
          {item.logo ? (
            <Image
              source={{ uri: item.logo }}
              style={styles.channelLogo}
              defaultSource={require('../../assets/default-channel.png')}
            />
          ) : (
            <View style={[styles.channelLogo, styles.channelLogoPlaceholder]}>
              <Text style={styles.channelLogoText}>📺</Text>
            </View>
          )}

          <View style={styles.channelInfo}>
            <Text
              style={[
                styles.channelName,
                isDarkMode && styles.channelNameDark,
                isSelected && styles.channelNameSelected,
              ]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            {item.category && (
              <Text style={[styles.channelCategory, isDarkMode && styles.channelCategoryDark]}>
                {item.category}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={() => onToggleFavorite(item.id)}
          >
            <Text style={[styles.favoriteIcon, isFavorite && styles.favoriteIconActive]}>
              {isFavorite ? '❤️' : '🤍'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCategoryButton = (category: string) => {
    const isSelected = selectedCategory === category;
    const displayName = category === 'all' ? 'Toutes' : 
                       category === 'favorites' ? 'Favoris' : category;
    
    return (
      <TouchableOpacity
        key={category}
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
        >
          {displayName}
        </Text>
      </TouchableOpacity>
    );
  };

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

      {/* Categories */}
      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['all', 'favorites', ...categories.filter(c => c !== 'all')]}
          renderItem={({ item }) => renderCategoryButton(item)}
          keyExtractor={(item) => item}
        />
      </View>

      {/* Channels list */}
      <FlatList
        data={filteredChannels}
        renderItem={renderChannelItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, isDarkMode && styles.emptyTextDark]}>
              {searchQuery ? 'Aucune chaîne trouvée' : 'Aucune chaîne disponible'}
            </Text>
          </View>
        }
      />

      {/* Channel count */}
      <View style={styles.footerInfo}>
        <Text style={[styles.channelCount, isDarkMode && styles.channelCountDark]}>
          {filteredChannels.length} chaîne{filteredChannels.length !== 1 ? 's' : ''}
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
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
    padding: 15,
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