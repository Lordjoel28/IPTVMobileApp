/**
 * 🕰️ RecentChannelsStore - Store simple pour partager les chaînes récentes
 * Entre ChannelPlayerScreen et GlobalVideoPlayer
 * 🔑 IMPORTANT : Inclut le profileId pour éviter les mélanges entre profils
 */

import {create} from 'zustand';
import {Channel} from '../types';

interface RecentChannelsState {
  recentChannels: Channel[];
  currentProfileId: string | null; // 🆕 Pour tracker le profil actuel
  profileChangeCounter: number; // 🆕 Compteur pour invalider les caches
  setRecentChannels: (channels: Channel[], profileId: string) => void;
  clearRecentChannels: () => void; // 🆕 Pour nettoyer lors du changement de profil
}

export const useRecentChannelsStore = create<RecentChannelsState>(set => ({
  recentChannels: [],
  currentProfileId: null,
  profileChangeCounter: 0,

  setRecentChannels: (channels: Channel[], profileId: string) => {
    console.log(
      `🔍 [RecentChannelsStore] Setting ${channels.length} recent channels for profile:`,
      profileId,
    );
    set({recentChannels: channels, currentProfileId: profileId});
  },

  clearRecentChannels: () => {
    console.log('🔍 [RecentChannelsStore] Clearing recent channels and incrementing change counter');
    set(state => ({
      recentChannels: [],
      currentProfileId: null,
      profileChangeCounter: state.profileChangeCounter + 1, // 🔑 Incrémenter pour invalider les caches
    }));
  },
}));
