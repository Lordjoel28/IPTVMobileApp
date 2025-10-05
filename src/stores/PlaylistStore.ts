/**
 * 🏪 PlaylistStore - Zustand Store
 * Version sans persist pour éviter les erreurs AsyncStorage
 */

import {create} from 'zustand';
import {shallow} from 'zustand/shallow';
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

  // 🚀 OPTIMISATION: Index pré-calculé par catégorie (évite filtres répétés)
  channelsByCategory: Map<string, Channel[]>;

  // 🚀 OPTIMISATION: Pagination virtuelle pour UI
  currentPage: number;
  pageSize: number;

  // Actions (flux strict - le store reçoit les données parsées)
  loadPlaylist: (
    uri: string,
    parsedChannels: Channel[],
    playlistName?: string,
  ) => void;
  selectPlaylist: (playlistId: string | null) => void;
  selectCategory: (category: string) => void;
  clearAll: () => Promise<void>;

  // 🚀 OPTIMISATION: Actions pagination
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;

  // Actions internes pour la persistance
  setHasHydrated: (hydrated: boolean) => void;

  // Getters pour données filtrées
  getFilteredChannels: () => Channel[];

  // 🚀 OPTIMISATION: Getter utilisant l'index (O(1) au lieu de O(n))
  getChannelsByCategory: (category: string) => Channel[];

  // 🚀 OPTIMISATION: Getter paginé (seulement les channels visibles)
  getVisibleChannels: () => Channel[];
  getTotalPages: () => number;
}

// Version sans persist pour éviter les erreurs AsyncStorage
export const usePlaylistStore = create<PlaylistStoreState>()((set, get) => ({
  // État initial
  channels: [],
  categories: [],
  selectedCategory: null,
  selectedPlaylistId: null,
  hasHydrated: false,

  // 🚀 OPTIMISATION: Index initialisé vide
  channelsByCategory: new Map<string, Channel[]>(),

  // 🚀 OPTIMISATION: Pagination virtuelle
  currentPage: 0,
  pageSize: 100, // Afficher max 100 channels à la fois

  // Action pour définir la playlist active
  selectPlaylist: (playlistId: string | null) => {
    set({selectedPlaylistId: playlistId});
    console.log(`🏪 PlaylistStore - Playlist active définie sur : ${playlistId}`);
  },

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

    // 🚀 OPTIMISATION: Créer index par catégorie + compter en 1 seul passage
    const categoriesMap = new Map<string, number>();
    const channelsByCategoryMap = new Map<string, Channel[]>();

    // Initialiser "TOUS" avec tous les channels
    channelsByCategoryMap.set('TOUS', parsedChannels);

    parsedChannels.forEach(channel => {
      const category = channel.category || channel.group || 'Autres';

      // Compter
      categoriesMap.set(category, (categoriesMap.get(category) || 0) + 1);

      // 🚀 Indexer dans Map (O(1) lookup après)
      const existing = channelsByCategoryMap.get(category) || [];
      existing.push(channel);
      channelsByCategoryMap.set(category, existing);
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
    console.log(
      '🚀 OPTIMISATION - Index créé pour',
      channelsByCategoryMap.size,
      'catégories',
    );

    // Sauvegarder la playlist pour persistance
    const playlistId = uri.split('/').pop() || 'playlist_' + Date.now();

    // Note: Sans persist, pas de sauvegarde AsyncStorage automatique
    console.log('💾 Playlist chargée en mémoire:', playlistId);

    // Mettre à jour le state avec toutes les données + index
    set({
      channels: parsedChannels,
      categories: allCategories,
      selectedCategory: 'TOUS',
      selectedPlaylistId: playlistId,
      channelsByCategory: channelsByCategoryMap, // 🚀 Index ajouté
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
      set({selectedCategory: category, currentPage: 0}); // 🚀 Reset page
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
      currentPage: 0, // 🚀 Reset à la page 1 lors changement catégorie
      // Note: On garde toutes les chaînes dans le store, le filtrage se fait côté UI
      // Mais on pourrait aussi stocker les chaînes filtrées si nécessaire
    });
  },

  // Action clearAll - version sans persist
  clearAll: async () => {
    console.log(
      '🧹 CLEAR ALL - Effacement complet cache et données (STORE)',
    );

    // Vider le state + index
    set({
      channels: [],
      categories: [],
      selectedCategory: null,
      selectedPlaylistId: null,
      channelsByCategory: new Map<string, Channel[]>(), // 🚀 Clear index
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

  // 🚀 OPTIMISATION: Getter utilisant l'index (O(1) au lieu de O(n))
  getChannelsByCategory: (category: string) => {
    const state = get();

    // Lookup direct dans l'index Map (ultra-rapide)
    const indexedChannels = state.channelsByCategory.get(category);

    if (indexedChannels) {
      console.log(
        `🚀 OPTIMISATION - Channels récupérés depuis index: ${indexedChannels.length} pour "${category}"`,
      );
      return indexedChannels;
    }

    // Fallback si index pas encore créé (ne devrait pas arriver)
    console.warn(`⚠️ Index manquant pour catégorie: ${category}, fallback filter`);
    return state.channels.filter(
      channel => channel.category === category || channel.group === category,
    );
  },

  // 🚀 OPTIMISATION: Actions pagination
  setPage: (page: number) => {
    const totalPages = get().getTotalPages();
    const validPage = Math.max(0, Math.min(page, totalPages - 1));
    set({currentPage: validPage});
    console.log(`📄 Page changée: ${validPage + 1}/${totalPages}`);
  },

  nextPage: () => {
    const state = get();
    const totalPages = state.getTotalPages();
    if (state.currentPage < totalPages - 1) {
      set({currentPage: state.currentPage + 1});
    }
  },

  prevPage: () => {
    const state = get();
    if (state.currentPage > 0) {
      set({currentPage: state.currentPage - 1});
    }
  },

  // 🚀 OPTIMISATION: Getter paginé (seulement channels visibles)
  getVisibleChannels: () => {
    const state = get();
    const categoryChannels = state.selectedCategory
      ? state.getChannelsByCategory(state.selectedCategory)
      : state.channels;

    const start = state.currentPage * state.pageSize;
    const end = start + state.pageSize;
    const visible = categoryChannels.slice(start, end);

    console.log(
      `📄 PAGINATION - Page ${state.currentPage + 1}: ${visible.length} channels (${start}-${end})`,
    );

    return visible;
  },

  getTotalPages: () => {
    const state = get();
    const categoryChannels = state.selectedCategory
      ? state.getChannelsByCategory(state.selectedCategory)
      : state.channels;

    return Math.ceil(categoryChannels.length / state.pageSize);
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

// 🚀 OPTIMISATION: Sélecteurs optimisés avec shallow compare
export const usePlaylistChannels = () =>
  usePlaylistStore(state => state.channels, shallow);

export const usePlaylistCategories = () =>
  usePlaylistStore(state => state.categories, shallow);

export const useSelectedCategory = () =>
  usePlaylistStore(state => state.selectedCategory);

export const useChannelsByCategory = (category: string) =>
  usePlaylistStore(state => state.getChannelsByCategory(category), shallow);

export const usePlaylistActions = () =>
  usePlaylistStore(
    state => ({
      loadPlaylist: state.loadPlaylist,
      selectCategory: state.selectCategory,
      selectPlaylist: state.selectPlaylist,
      clearAll: state.clearAll,
    }),
    shallow,
  );

// 🚀 OPTIMISATION: Hooks pagination (ultra-performants)
export const useVisibleChannels = () =>
  usePlaylistStore(state => state.getVisibleChannels(), shallow);

export const usePagination = () =>
  usePlaylistStore(
    state => ({
      currentPage: state.currentPage,
      totalPages: state.getTotalPages(),
      pageSize: state.pageSize,
      setPage: state.setPage,
      nextPage: state.nextPage,
      prevPage: state.prevPage,
    }),
    shallow,
  );

export const usePaginationInfo = () =>
  usePlaylistStore(state => ({
    currentPage: state.currentPage + 1, // +1 pour affichage humain (page 1 au lieu de 0)
    totalPages: state.getTotalPages(),
    hasNext: state.currentPage < state.getTotalPages() - 1,
    hasPrev: state.currentPage > 0,
  }));

console.log('🏪 PlaylistStore initialized - Version sans persist pour éviter les erreurs AsyncStorage');