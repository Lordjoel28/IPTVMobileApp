/**
 * 🏪 PlaylistStore - Zustand Store
 * Version sans persist pour éviter les erreurs AsyncStorage
 */

import {create} from 'zustand';
import {Channel} from '../types';

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
  loadPlaylist: (
    uri: string,
    parsedChannels: Channel[],
    playlistName?: string,
  ) => void;
  selectCategory: (category: string) => void;
  clearAll: () => Promise<void>;

  // Actions internes pour la persistance
  setHasHydrated: (hydrated: boolean) => void;

  // Getters pour données filtrées
  getFilteredChannels: () => Channel[];
}

// Version sans persist pour éviter les erreurs AsyncStorage
export const usePlaylistStore = create<PlaylistStoreState>()((set, get) => ({
  // État initial
  channels: [],
  categories: [],
  selectedCategory: null,
  selectedPlaylistId: null,
  hasHydrated: false,

  // Action loadPlaylist - FLUX STRICT : reçoit les données déjà parsées
  loadPlaylist: (
    uri: string,
    parsedChannels: Channel[],
    playlistName?: string,
  ) => {
    console.log(
      '🏪 PLAYLIST STORE - Réception données parsées:',
      parsedChannels.length,
      'chaînes',
    );

    // Créer catégories à partir des channels reçues
    const categoriesMap = new Map<string, number>();

    parsedChannels.forEach(channel => {
      const category = channel.category || channel.group || 'Autres';
      categoriesMap.set(category, (categoriesMap.get(category) || 0) + 1);
    });

    const allCategories = [
      {name: 'TOUS', count: parsedChannels.length},
      ...Array.from(categoriesMap.entries()).map(([name, count]) => ({
        name,
        count,
      })),
    ];

    console.log(
      '🏪 PLAYLIST STORE - AllCategories avant setState:',
      allCategories,
    );

    // Sauvegarder la playlist pour persistance
    const playlistId = uri.split('/').pop() || 'playlist_' + Date.now();

    // Note: Sans persist, pas de sauvegarde AsyncStorage automatique
    console.log('💾 Playlist chargée en mémoire:', playlistId);

    // Mettre à jour le state avec toutes les données
    set({
      channels: parsedChannels,
      categories: allCategories,
      selectedCategory: 'TOUS',
      selectedPlaylistId: playlistId,
    });

    // Sélectionner la première catégorie si disponible
    if (allCategories.length > 0) {
      console.log(
        '🏪 PLAYLIST STORE - Sélection de la première catégorie:',
        allCategories[0].name,
      );
      get().selectCategory(allCategories[0].name);
    }
  },

  // Action selectCategory - avec filtrage complet des chaînes
  selectCategory: (category: string) => {
    console.log(
      '🏪 PLAYLIST STORE - selectCategory appelée avec:',
      category,
    );
    const currentState = get();

    // Si pas de channels, pas de filtrage possible
    if (!currentState.channels || currentState.channels.length === 0) {
      console.log('🏪 PLAYLIST STORE - Pas de chaînes à filtrer');
      set({selectedCategory: category});
      return;
    }

    let filteredChannels: Channel[];

    if (category === 'TOUS') {
      // Afficher toutes les chaînes
      filteredChannels = [...currentState.channels];
    } else {
      // Filtrer par catégorie
      filteredChannels = currentState.channels.filter(
        channel =>
          channel.category === category || channel.group === category,
      );
    }

    console.log(
      `🏪 PLAYLIST STORE - Filtrage terminé: ${filteredChannels.length} chaînes pour "${category}"`,
    );

    set({
      selectedCategory: category,
      // Note: On garde toutes les chaînes dans le store, le filtrage se fait côté UI
      // Mais on pourrait aussi stocker les chaînes filtrées si nécessaire
    });
  },

  // Action clearAll - version sans persist
  clearAll: async () => {
    console.log(
      '🧹 CLEAR ALL - Effacement complet cache et données (STORE)',
    );

    // Vider le state
    set({
      channels: [],
      categories: [],
      selectedCategory: null,
      selectedPlaylistId: null,
    });

    // Note: Sans persist, pas de cleanup AsyncStorage nécessaire
    console.log('✅ CLEAR ALL - Tout vidé, prêt pour nouveau test (STORE)');
  },

  // Hydratation pour persistence (garde pour compatibilité)
  setHasHydrated: hydrated => set({hasHydrated: hydrated}),

  // Getter pour chaînes filtrées selon catégorie sélectionnée
  getFilteredChannels: () => {
    const state = get();
    if (!state.channels || state.channels.length === 0) {
      return [];
    }

    if (!state.selectedCategory || state.selectedCategory === 'TOUS') {
      return state.channels;
    }

    return state.channels.filter(
      channel =>
        channel.category === state.selectedCategory ||
        channel.group === state.selectedCategory,
    );
  },
}));

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

console.log('🏪 PlaylistStore initialized - Version sans persist pour éviter les erreurs AsyncStorage');