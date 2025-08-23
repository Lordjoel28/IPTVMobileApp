import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { playlistManager, Channel, Category } from '../services/PlaylistManager';

interface PlaylistContextData {
  channels: Channel[];
  categories: Category[];
  selectedCategory: string | null;
  selectedPlaylistId: string | null;
  loadPlaylist: (uri: string) => Promise<void>;
  selectCategory: (category: string) => void;
  clearAll: () => void;
}

const PlaylistContext = createContext<PlaylistContextData | undefined>(undefined);

export const PlaylistProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  // Charger la playlist sauvegardée au démarrage
  useEffect(() => {
    console.log('🚀 PLAYLIST CONTEXT - useEffect démarrage!');
    loadSavedPlaylist();
  }, []);

  const loadSavedPlaylist = async () => {
    console.log('💾 LOAD SAVED PLAYLIST - Début fonction');
    try {
      console.log('💾 LOAD SAVED PLAYLIST - Lecture AsyncStorage...');
      const savedPlaylistId = await AsyncStorage.getItem('selected_playlist_id');
      const savedPlaylistUri = await AsyncStorage.getItem('selected_playlist_uri');
      
      console.log('💾 LOAD SAVED PLAYLIST - AsyncStorage lu:', {
        savedPlaylistId,
        savedPlaylistUri
      });
      
      if (savedPlaylistId && savedPlaylistUri) {
        console.log('💾 Playlist sauvegardée trouvée:', savedPlaylistId);
        console.log('💾 URI de la playlist:', savedPlaylistUri);
        setSelectedPlaylistId(savedPlaylistId);
        console.log('💾 Chargement playlist...');
        await loadPlaylist(savedPlaylistUri);
        console.log('💾 Playlist chargée avec succès!');
      } else {
        console.log('🆕 Aucune playlist sauvegardée - ID:', savedPlaylistId, 'URI:', savedPlaylistUri);
      }
    } catch (error) {
      console.error('❌ Erreur chargement playlist sauvegardée:', error);
    }
    console.log('💾 LOAD SAVED PLAYLIST - Fin fonction');
  };

  const loadPlaylist = async (uri: string) => {
    console.log('🔥 PLAYLIST CONTEXT - Début loadPlaylist...');
    
    await playlistManager.loadPlaylist(uri);
    
    console.log('🔥 PLAYLIST CONTEXT - Après parsing, récupération catégories...');
    const categoriesFromManager = playlistManager.getCategories();
    console.log('🔥 PLAYLIST CONTEXT - Catégories du manager:', categoriesFromManager);
    
    const allCategories = [
      { name: 'Tous', count: playlistManager.getChannelsByGroup('Tous').length }, 
      ...categoriesFromManager
    ];
    
    console.log('🔥 PLAYLIST CONTEXT - AllCategories avant setState:', allCategories);
    setCategories(allCategories);
    
    // Sauvegarder la playlist pour persistance
    const playlistId = uri.split('/').pop() || 'playlist_' + Date.now();
    setSelectedPlaylistId(playlistId);
    await AsyncStorage.setItem('selected_playlist_id', playlistId);
    await AsyncStorage.setItem('selected_playlist_uri', uri);
    console.log('💾 Playlist sauvegardée:', playlistId);
    
    if (allCategories.length > 0) {
      console.log('🔥 PLAYLIST CONTEXT - Sélection de la première catégorie:', allCategories[0].name);
      selectCategory(allCategories[0].name);
    }
  };

  const selectCategory = (category: string) => {
    console.log('🔥 PLAYLIST CONTEXT - selectCategory appelée avec:', category);
    setSelectedCategory(category);
    
    const channelsForCategory = playlistManager.getChannelsByGroup(category);
    console.log('🔥 PLAYLIST CONTEXT - Chaînes pour cette catégorie:', channelsForCategory.length);
    setChannels(channelsForCategory);
  };

  const clearAll = async () => {
    console.log('🧹 CLEAR ALL - Effacement complet cache et données');
    // Vider le PlaylistManager
    playlistManager.channels = [];
    playlistManager.playlists = [];
    // Vider le state du contexte
    setChannels([]);
    setCategories([]);
    setSelectedCategory(null);
    setSelectedPlaylistId(null);
    // Supprimer la persistance
    await AsyncStorage.removeItem('selected_playlist_id');
    await AsyncStorage.removeItem('selected_playlist_uri');
    console.log('✅ CLEAR ALL - Tout vidé, prêt pour nouveau test');
  };

  return (
    <PlaylistContext.Provider value={{ channels, categories, selectedCategory, selectedPlaylistId, loadPlaylist, selectCategory, clearAll }}>
      {children}
    </PlaylistContext.Provider>
  );
};

export const usePlaylist = (): PlaylistContextData => {
  const context = useContext(PlaylistContext);
  if (!context) {
    throw new Error('usePlaylist doit etre utilise au sein d un PlaylistProvider');
  }
  return context;
};
