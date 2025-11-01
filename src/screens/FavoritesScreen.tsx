/**
 * ⭐ IPTV Mobile App - Écran Favoris par profil
 * Affiche les chaînes favorites du profil actif
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  FlatList,
  Image,
} from 'react-native';
import {Text} from 'react-native-paper';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useThemeColors} from '../contexts/ThemeContext';
import FavoritesService from '../services/FavoritesService';
import ProfileService from '../services/ProfileService';
import {PlaylistService} from '../services/PlaylistService';
import type {Channel, Favorite} from '../types';

const FavoritesScreen: React.FC = () => {
  const colors = useThemeColors();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState('');

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      setLoading(true);

      // Récupérer le profil actif
      const activeProfile = await ProfileService.getActiveProfile();
      if (!activeProfile) {
        console.log('❌ Aucun profil actif');
        setLoading(false);
        return;
      }

      setProfileName(activeProfile.name);

      // Récupérer les favoris du profil
      const profileFavorites = await FavoritesService.getFavoritesByProfile(
        activeProfile.id,
      );
      setFavorites(profileFavorites);

      // Charger les chaînes correspondantes
      const channelPromises = profileFavorites.map(async fav => {
        try {
          const playlist = await PlaylistService.getPlaylistById(
            fav.playlistId,
          );
          if (playlist) {
            const channel = playlist.channels.find(
              ch => ch.id === fav.channelId,
            );
            return channel;
          }
          return null;
        } catch (error) {
          console.error('Erreur chargement chaîne:', error);
          return null;
        }
      });

      const loadedChannels = await Promise.all(channelPromises);
      // 🔄 DÉDUPLICATION: Éviter les doublons de chaînes favorites
      const uniqueChannels = (loadedChannels.filter(ch => ch !== null) as Channel[])
        .filter((channel, index, self) =>
          self.findIndex(c => c.id === channel.id) === index
        );
      setChannels(uniqueChannels);
    } catch (error) {
      console.error('❌ Erreur chargement favoris:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (channel: Channel) => {
    try {
      const activeProfile = await ProfileService.getActiveProfile();
      if (!activeProfile) {
        return;
      }

      await FavoritesService.removeFavorite(channel.id, activeProfile.id);
      await loadFavorites();
    } catch (error) {
      console.error('❌ Erreur suppression favori:', error);
    }
  };

  const renderChannelItem = ({item}: {item: Channel}) => (
    <TouchableOpacity
      style={[
        styles.channelCard,
        {
          backgroundColor: colors.surface.primary,
          borderColor: colors.ui.border,
        },
      ]}>
      {/* Logo chaîne */}
      {item.logo ? (
        <Image source={{uri: item.logo}} style={styles.channelLogo} />
      ) : (
        <View
          style={[
            styles.channelLogoPlaceholder,
            {backgroundColor: colors.surface.secondary},
          ]}>
          <Icon name="tv" size={24} color={colors.text.tertiary} />
        </View>
      )}

      {/* Infos chaîne */}
      <View style={styles.channelInfo}>
        <Text style={[styles.channelName, {color: colors.text.primary}]}>
          {item.name}
        </Text>
        {item.category && (
          <Text style={[styles.channelCategory, {color: colors.text.tertiary}]}>
            {item.category}
          </Text>
        )}
      </View>

      {/* Bouton retirer */}
      <TouchableOpacity
        style={[
          styles.removeButton,
          {backgroundColor: colors.surface.secondary},
        ]}
        onPress={() => handleRemoveFavorite(item)}>
        <Icon name="star" size={24} color={colors.accent.warning} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={colors.background.gradient}
      style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, {color: colors.text.primary}]}>
            ⭐ Mes Favoris
          </Text>
          <Text style={[styles.headerSubtitle, {color: colors.text.tertiary}]}>
            {profileName && `Profil: ${profileName}`}
          </Text>
        </View>
      </View>

      {/* Liste des favoris */}
      {loading ? (
        <View style={styles.centerContent}>
          <Icon name="refresh" size={48} color={colors.text.tertiary} />
          <Text style={[styles.emptyText, {color: colors.text.secondary}]}>
            Chargement...
          </Text>
        </View>
      ) : channels.length === 0 ? (
        <View style={styles.centerContent}>
          <Icon name="star-outline" size={64} color={colors.text.tertiary} />
          <Text style={[styles.emptyText, {color: colors.text.secondary}]}>
            Aucune chaîne favorite
          </Text>
          <Text style={[styles.emptySubtext, {color: colors.text.tertiary}]}>
            Ajoutez des chaînes à vos favoris pour les retrouver ici
          </Text>
        </View>
      ) : (
        <FlatList
          data={channels}
          renderItem={renderChannelItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: (StatusBar.currentHeight || 0) + 16,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  listContent: {
    padding: 20,
  },
  channelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  channelLogo: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  channelLogoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelInfo: {
    flex: 1,
    marginLeft: 12,
  },
  channelName: {
    fontSize: 16,
    fontWeight: '600',
  },
  channelCategory: {
    fontSize: 13,
    marginTop: 2,
  },
  removeButton: {
    padding: 8,
    borderRadius: 8,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default FavoritesScreen;
