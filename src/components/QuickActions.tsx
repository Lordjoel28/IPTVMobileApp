/**
 * � IPTV Mobile App - Actions Rapides
 * Boutons d'actions rapides pour l'�cran d'accueil
 */

import React from 'react';
import {View, StyleSheet} from 'react-native';
import {Button, Surface, useTheme} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';

import type {HomeScreenNavigationProp} from '../types';

interface Props {
  navigation: HomeScreenNavigationProp;
}

const QuickActions: React.FC<Props> = ({navigation}) => {
  const theme = useTheme();

  const handleAddPlaylist = () => {
    // navigation.navigate('PlaylistsTab' as any);
    console.log('Add playlist');
  };

  const handleSearch = () => {
    navigation.navigate('Search');
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleUserProfile = () => {
    navigation.navigate('UserProfile');
  };

  return (
    <Surface
      style={[styles.container, {backgroundColor: theme.colors.surface}]}
      elevation={1}>
      <View style={styles.actionsGrid}>
        {/* Ajouter Playlist */}
        <Button
          mode="contained-tonal"
          onPress={handleAddPlaylist}
          style={styles.actionButton}
          icon={() => (
            <Icon name="playlist-add" size={20} color={theme.colors.primary} />
          )}>
          Ajouter
        </Button>

        {/* Recherche */}
        <Button
          mode="contained-tonal"
          onPress={handleSearch}
          style={styles.actionButton}
          icon={() => (
            <Icon name="search" size={20} color={theme.colors.primary} />
          )}>
          Rechercher
        </Button>

        {/* Profil */}
        <Button
          mode="contained-tonal"
          onPress={handleUserProfile}
          style={styles.actionButton}
          icon={() => (
            <Icon
              name="account-circle"
              size={20}
              color={theme.colors.primary}
            />
          )}>
          Profil
        </Button>

        {/* Param�tres */}
        <Button
          mode="contained-tonal"
          onPress={handleSettings}
          style={styles.actionButton}
          icon={() => (
            <Icon name="settings" size={20} color={theme.colors.primary} />
          )}>
          Param�tres
        </Button>
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    minWidth: '22%',
  },
});

export default QuickActions;
