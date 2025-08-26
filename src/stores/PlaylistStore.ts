/**
 * 🏪 PlaylistStore - Zustand Store
 * Remplacement exact de PlaylistContext avec persistance et catégories
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Channel } from '../types';
import { playlistService } from '../services/PlaylistService';

// Interface Category comme dans PlaylistContext
interface Category {
  name: string;
  count: number;
}

export interface PlaylistStoreState {
  // État (correspondance exacte avec PlaylistContext)
  channels: Channel[];
  categories: Category[];
  selectedCategory: string | null;
  selectedPlaylistId: string | null;
  hasHydrated: boolean;

  // Actions (flux strict - le store reçoit les données parsées)
  loadPlaylist: (uri: string, parsedChannels: Channel[], playlistName?: string) => void;
  selectCategory: (category: string) => void;
  clearAll: () => Promise<void>;
  
  // Actions internes pour la persistance
  setHasHydrated: (hydrated: boolean) => void;
  
  // Getters pour données filtrées
  getFilteredChannels: () => Channel[];
}

export const usePlaylistStore = create<PlaylistStoreState>()(
  persist(
    (set, get) => ({
      // État initial
      channels: [],
      categories: [],
      selectedCategory: null,
      selectedPlaylistId: null,
      hasHydrated: false,

      // Action loadPlaylist - FLUX STRICT : reçoit les données déjà parsées
      loadPlaylist: (uri: string, parsedChannels: Channel[], playlistName?: string) => {
        console.log('🏪 PLAYLIST STORE - Réception données parsées:', parsedChannels.length, 'chaînes');
        
        // Créer catégories à partir des channels reçues
        const categoriesMap = new Map<string, number>();
        
        parsedChannels.forEach(channel => {
          const category = channel.category || channel.group || 'Autres';
          categoriesMap.set(category, (categoriesMap.get(category) || 0) + 1);
        });
        
        const allCategories = [
          { name: 'TOUS', count: parsedChannels.length },
          ...Array.from(categoriesMap.entries()).map(([name, count]) => ({ name, count }))
        ];
        
        console.log('🏪 PLAYLIST STORE - AllCategories avant setState:', allCategories);
        
        // Sauvegarder la playlist pour persistance
        const playlistId = uri.split('/').pop() || 'playlist_' + Date.now();
        
        // Sauvegarder dans AsyncStorage (comme PlaylistContext)
        await AsyncStorage.setItem('selected_playlist_id', playlistId);
        await AsyncStorage.setItem('selected_playlist_uri', uri);
        console.log('💾 Playlist sauvegardée:', playlistId);
        
        // Mettre à jour le state avec toutes les données
        set({
          channels: parsedChannels,
          categories: allCategories,
          selectedCategory: 'TOUS',
          selectedPlaylistId: playlistId,
        });
        
        // Sélectionner la première catégorie si disponible
        if (allCategories.length > 0) {
          console.log('🏪 PLAYLIST STORE - Sélection de la première catégorie:', allCategories[0].name);
          get().selectCategory(allCategories[0].name);
        }
      },

      // Action selectCategory - avec filtrage complet des chaînes
      selectCategory: (category: string) => {
        console.log('🏪 PLAYLIST STORE - selectCategory appelée avec:', category);
        const currentState = get();
        
        // Si pas de channels, pas de filtrage possible
        if (!currentState.channels || currentState.channels.length === 0) {
          console.log('🏪 PLAYLIST STORE - Pas de chaînes à filtrer');
          set({ selectedCategory: category });
          return;
        }

        let filteredChannels: Channel[];
        
        if (category === 'TOUS') {
          // Afficher toutes les chaînes
          filteredChannels = [...currentState.channels];
        } else {
          // Filtrer par catégorie
          filteredChannels = currentState.channels.filter(channel =>
            channel.category === category || channel.group === category
          );
        }

        console.log(`🏪 PLAYLIST STORE - Filtrage terminé: ${filteredChannels.length} chaînes pour "${category}"`);
        
        set({ 
          selectedCategory: category,
          // Note: On garde toutes les chaînes dans le store, le filtrage se fait côté UI
          // Mais on pourrait aussi stocker les chaînes filtrées si nécessaire
        });
      },

      // Action clearAll - reproduction exacte de PlaylistContext
      clearAll: async () => {
        console.log('🧹 CLEAR ALL - Effacement complet cache et données (STORE)');
        
        // Vider le state
        set({
          channels: [],
          categories: [],
          selectedCategory: null,
          selectedPlaylistId: null,
        });
        
        // Supprimer la persistance AsyncStorage
        await AsyncStorage.removeItem('selected_playlist_id');
        await AsyncStorage.removeItem('selected_playlist_uri');
        console.log('✅ CLEAR ALL - Tout vidé, prêt pour nouveau test (STORE)');
      },

      // Hydratation pour persistence
      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),
      
      // Getter pour chaînes filtrées selon catégorie sélectionnée
      getFilteredChannels: () => {
        const state = get();
        if (!state.channels || state.channels.length === 0) {
          return [];
        }
        
        if (!state.selectedCategory || state.selectedCategory === 'TOUS') {
          return state.channels;
        }
        
        return state.channels.filter(channel =>
          channel.category === state.selectedCategory || 
          channel.group === state.selectedCategory
        );
      },
    }),
    {
      name: 'playlist-store',
      storage: {
        getItem: async (name: string) => {
          const value = await AsyncStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: async (name: string, value: any) => {
          await AsyncStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: async (name: string) => {
          await AsyncStorage.removeItem(name);
        },
      },
      onRehydrateStorage: () => (state) => {
        console.log('🏪 PlaylistStore hydratation terminée');
        state?.setHasHydrated(true);
        
        // Charger la playlist sauvegardée au démarrage (comme PlaylistContext)
        (async () => {
          console.log('💾 LOAD SAVED PLAYLIST - Début fonction (STORE)');
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
              console.log('💾 Chargement playlist...');
              await state?.loadPlaylist(savedPlaylistUri);
              console.log('💾 Playlist chargée avec succès!');
            } else {
              console.log('🆕 Aucune playlist sauvegardée - ID:', savedPlaylistId, 'URI:', savedPlaylistUri);
            }
          } catch (error) {
            console.error('❌ Erreur chargement playlist sauvegardée:', error);
          }
          console.log('💾 LOAD SAVED PLAYLIST - Fin fonction (STORE)');
        })();
      },
      partialize: (state) => ({
        // Persister seulement les données essentielles
        selectedPlaylistId: state.selectedPlaylistId,
        selectedCategory: state.selectedCategory,
      }),
    }
  )
);

// Hook de compatibilité exacte avec usePlaylist de PlaylistContext
export const usePlaylist = () => {
  const {
    channels,
    categories,
    selectedCategory,
    selectedPlaylistId,
    loadPlaylist,
    selectCategory,
    clearAll,
  } = usePlaylistStore();

  return {
    channels,
    categories,
    selectedCategory,
    selectedPlaylistId,
    loadPlaylist,
    selectCategory,
    clearAll,
  };
};