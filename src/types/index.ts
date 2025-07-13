export interface Channel {
  id: string;
  name: string;
  url: string;
  logo?: string;
  group?: string;
  category?: string;
  language?: string;
  country?: string;
  tvgId?: string;
}

export interface Playlist {
  id: string;
  name: string;
  url?: string;
  channels: Channel[];
  isLocal: boolean;
  dateAdded: string;
  lastUpdated: string;
}

export interface Favorite {
  channelId: string;
  dateAdded: string;
}

export interface RecentChannel {
  channelId: string;
  playlistId: string;
  lastWatched: string;
}

export interface User {
  id: string;
  name: string;
  type: 'admin' | 'standard' | 'child';
  avatar: string;
  isActive: boolean;
  pin?: string;
}

export interface Settings {
  theme: 'light' | 'dark' | 'auto';
  autoplay: boolean;
  quality: 'auto' | '1080p' | '720p' | '480p';
  volume: number;
  rememberPosition: boolean;
  parentalControl: boolean;
  language: string;
}

export interface ParentalControl {
  enabled: boolean;
  pin: string | null;
  ageLimit: number;
  blockedCategories: string[];
  hideBlockedChannels: boolean;
  isUnlocked: boolean;
  unlockExpires: number | null;
}