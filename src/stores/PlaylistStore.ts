/**
 * 🏪 PlaylistStore - Zustand Store
 * Remplace PlaylistContext pour un meilleur état global
 */

import { create } from 'zustand';
import type { Playlist } from '../types';

export interface PlaylistStoreState {
  // État
  playlists: Playlist[];
  currentPlaylist: Playlist | null;
  loading: boolean;
  error: string | null;

  // Actions
  setPlaylists: (playlists: Playlist[]) => void;
  setCurrentPlaylist: (playlist: Playlist | null) => void;
  addPlaylist: (playlist: Playlist) => void;
  removePlaylist: (id: string) => void;
  updatePlaylist: (id: string, updates: Partial<Playlist>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const usePlaylistStore = create<PlaylistStoreState>((set, get) => ({
  // État initial
  playlists: [],
  currentPlaylist: null,
  loading: false,
  error: null,

  // Actions
  setPlaylists: (playlists) => set({ playlists }),
  
  setCurrentPlaylist: (playlist) => set({ currentPlaylist: playlist }),
  
  addPlaylist: (playlist) => set((state) => ({
    playlists: [...state.playlists, playlist]
  })),
  
  removePlaylist: (id) => set((state) => ({
    playlists: state.playlists.filter(p => p.id !== id),
    currentPlaylist: state.currentPlaylist?.id === id ? null : state.currentPlaylist
  })),
  
  updatePlaylist: (id, updates) => set((state) => ({
    playlists: state.playlists.map(p => p.id === id ? { ...p, ...updates } : p),
    currentPlaylist: state.currentPlaylist?.id === id 
      ? { ...state.currentPlaylist, ...updates } 
      : state.currentPlaylist
  })),
  
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  
  reset: () => set({
    playlists: [],
    currentPlaylist: null,
    loading: false,
    error: null
  })
}));