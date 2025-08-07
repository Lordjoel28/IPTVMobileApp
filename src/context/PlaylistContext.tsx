import React, { createContext, useState, useContext, ReactNode } from 'react';
import { playlistManager, Channel, Category } from '../services/PlaylistManager';

interface PlaylistContextData {
  channels: Channel[];
  categories: Category[];
  selectedCategory: string | null;
  loadPlaylist: (uri: string) => Promise<void>;
  selectCategory: (category: string) => void;
  clearAll: () => void;
}

const PlaylistContext = createContext<PlaylistContextData | undefined>(undefined);

export const PlaylistProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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

  const clearAll = () => {
    console.log('🧹 CLEAR ALL - Effacement complet cache et données');
    // Vider le PlaylistManager
    playlistManager.channels = [];
    playlistManager.playlists = [];
    // Vider le state du contexte
    setChannels([]);
    setCategories([]);
    setSelectedCategory(null);
    console.log('✅ CLEAR ALL - Tout vidé, prêt pour nouveau test');
  };

  return (
    <PlaylistContext.Provider value={{ channels, categories, selectedCategory, loadPlaylist, selectCategory, clearAll }}>
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
