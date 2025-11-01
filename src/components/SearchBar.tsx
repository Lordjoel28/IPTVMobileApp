/**
 * =
 SearchBar - Composant de recherche simple pour les cha�nes
 */

import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import type {Channel} from '../types';

interface SearchBarProps {
  visible: boolean;
  onClose: () => void;
  channels: Channel[];
  onChannelSelect: (channel: Channel) => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  visible,
  onClose,
  channels,
  onChannelSelect,
  placeholder = 'Rechercher une cha�ne...',
}) => {
  const [query, setQuery] = useState('');
  const [filteredChannels, setFilteredChannels] = useState<Channel[]>([]);
  const inputRef = useRef<TextInput>(null);
  const slideAnim = useRef(new Animated.Value(-100)).current;

  // Animation d'ouverture/fermeture
  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Focus automatique sur l'input quand ouvert
        inputRef.current?.focus();
      });
    } else {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }).start();
      // Reset query quand ferm�
      setQuery('');
      setFilteredChannels([]);
    }
  }, [visible]);

  // Recherche simple en temps r�el
  useEffect(() => {
    if (!query.trim()) {
      setFilteredChannels([]);
      return;
    }

    const filtered = channels.filter(
      channel =>
        channel.name.toLowerCase().includes(query.toLowerCase()) ||
        (channel.group &&
          channel.group.toLowerCase().includes(query.toLowerCase())) ||
        (channel.category &&
          channel.category.toLowerCase().includes(query.toLowerCase())),
    );

    // Limiter � 20 r�sultats pour performance
    setFilteredChannels(filtered.slice(0, 20));
  }, [query, channels]);

  const handleChannelPress = (channel: Channel) => {
    onChannelSelect(channel);
    onClose(); // Fermer apr�s s�lection
  };

  const clearSearch = () => {
    setQuery('');
    setFilteredChannels([]);
    inputRef.current?.focus();
  };

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{translateY: slideAnim}],
        },
      ]}>
      {/* Barre de recherche */}
      <View style={styles.searchInputContainer}>
        <Icon name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder}
          placeholderTextColor="#888"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
            <Icon name="clear" size={18} color="#888" />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Icon name="close" size={20} color="#888" />
        </TouchableOpacity>
      </View>

      {/* R�sultats de recherche */}
      {filteredChannels.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsHeader}>
            {filteredChannels.length} r�sultat
            {filteredChannels.length > 1 ? 's' : ''}
          </Text>
          <FlatList
            data={filteredChannels}
            keyExtractor={item => `search-${item.id}`}
            renderItem={({item}) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => handleChannelPress(item)}
                activeOpacity={0.7}>
                <Text style={styles.resultTitle} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.group && (
                  <Text style={styles.resultSubtitle} numberOfLines={1}>
                    {item.group}
                  </Text>
                )}
              </TouchableOpacity>
            )}
            style={styles.resultsList}
            showsVerticalScrollIndicator={false}
            maxToRenderPerBatch={10}
            removeClippedSubviews={true}
          />
        </View>
      )}

      {/* Message si pas de r�sultats */}
      {query.length > 0 && filteredChannels.length === 0 && (
        <View style={styles.noResultsContainer}>
          <Icon name="search-off" size={32} color="#666" />
          <Text style={styles.noResultsText}>
            Aucune cha�ne trouv�e pour "{query}"
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1F1F1F',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2A2A2A',
    margin: 8,
    borderRadius: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#EAEAEA',
    fontSize: 16,
    paddingVertical: 4,
  },
  clearButton: {
    padding: 4,
    marginRight: 8,
  },
  closeButton: {
    padding: 4,
  },
  resultsContainer: {
    maxHeight: 200,
    backgroundColor: '#1F1F1F',
  },
  resultsHeader: {
    color: '#888',
    fontSize: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  resultsList: {
    paddingHorizontal: 8,
  },
  resultItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  resultTitle: {
    color: '#EAEAEA',
    fontSize: 14,
    fontWeight: '500',
  },
  resultSubtitle: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  noResultsText: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default SearchBar;
