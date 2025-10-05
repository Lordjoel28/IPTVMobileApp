/**
 * 🕰️ RecentChannelsStore - Store simple pour partager les chaînes récentes
 * Entre ChannelPlayerScreen et GlobalVideoPlayer
 */

import {create} from 'zustand';
import {Channel} from '../types';

interface RecentChannelsState {
  recentChannels: Channel[];
  setRecentChannels: (channels: Channel[]) => void;
}

export const useRecentChannelsStore = create<RecentChannelsState>(set => ({
  recentChannels: [],

  setRecentChannels: (channels: Channel[]) => {
    console.log(
      `[RecentChannelsStore] Setting ${channels.length} recent channels`,
    );
    set({recentChannels: channels});
  },
}));
