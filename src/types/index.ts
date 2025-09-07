/**
 * 📱 IPTV Mobile App - Types TypeScript
 * Définitions de types pour l'application IPTV React Native
 */

// Navigation Types
export type RootStackParamList = {
  Home: undefined;
  ChannelList: {
    playlistId?: string;
    playlistName?: string;
    channels?: Channel[];
    totalChannels?: number;
  };
  ChannelPlayer: {
    playlistId: string;
    allCategories: Category[];
    initialCategory: Category;
    initialChannels: Channel[];
    selectedChannel: Channel;
    playlistName: string;
  };
  Player: {channel: Channel; playlist?: Playlist};
  Settings: undefined;
  PlaylistDetail: {playlist: Playlist};
  Search: undefined;
  UserProfile: undefined;
  ParentalControl: undefined;
};

export type BottomTabParamList = {
  HomeTab: undefined;
  PlaylistsTab: undefined;
  FavoritesTab: undefined;
  SearchTab: undefined;
  SettingsTab: undefined;
};

// Channel Types
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
  quality?: string;
  isAdult?: boolean;
  epgId?: string;
}

// Category Types
export interface Category {
  id: string;
  name: string;
  count: number;
  channels: Channel[];
}

// Playlist Types
export interface Playlist {
  id: string;
  name: string;
  url?: string;
  channels: Channel[];
  isLocal: boolean;
  dateAdded: string;
  lastUpdated: string;
  totalChannels?: number;
  categories?: string[];
  provider?: string;
  type?: 'M3U' | 'Xtream' | 'Local';
}

// User Types
export interface User {
  id: string;
  name: string;
  type: 'admin' | 'standard' | 'child';
  avatar?: string;
  isActive: boolean;
  pin?: string;
  preferences: UserPreferences;
  restrictions?: ParentalRestrictions;
}

export interface UserPreferences {
  theme: ThemeType;
  language: string;
  autoplay: boolean;
  quality: VideoQuality;
  volume: number;
  subtitles: boolean;
  rememberPosition: boolean;
  notifications: boolean;
}

export interface ParentalRestrictions {
  enabled: boolean;
  pin?: string;
  ageLimit: number;
  blockedCategories: string[];
  timeRestrictions?: TimeRestriction[];
  hideRestrictedContent: boolean;
}

export interface TimeRestriction {
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  days: number[]; // 0-6 (Sunday-Saturday)
}

// Settings Types
export interface AppSettings {
  theme: ThemeType;
  language: string;
  notifications: NotificationSettings;
  playback: PlaybackSettings;
  parental: ParentalSettings;
  cache: CacheSettings;
  network: NetworkSettings;
}

export interface NotificationSettings {
  enabled: boolean;
  programReminders: boolean;
  updateNotifications: boolean;
  errorNotifications: boolean;
}

export interface PlaybackSettings {
  autoplay: boolean;
  quality: VideoQuality;
  bufferSize: number;
  hardwareDecoding: boolean;
  pip: boolean;
  backgroundPlay: boolean;
}

export interface ParentalSettings {
  enabled: boolean;
  defaultPin: string;
  ageRatingSystem: 'US' | 'EU' | 'Custom';
  adultContentBlocked: boolean;
}

export interface CacheSettings {
  enabled: boolean;
  maxSize: number; // MB
  autoClean: boolean;
  preloadChannels: boolean;
}

export interface NetworkSettings {
  timeout: number;
  retryAttempts: number;
  adaptiveStreaming: boolean;
  preferredConnection: 'wifi' | 'cellular' | 'any';
}

// Theme Types
export type ThemeType =
  | 'light'
  | 'dark'
  | 'auto'
  | 'blue'
  | 'green'
  | 'purple'
  | 'orange'
  | 'red'
  | 'pink';

export interface CustomTheme {
  colors: {
    primary: string;
    primaryContainer: string;
    secondary: string;
    secondaryContainer: string;
    tertiary: string;
    tertiaryContainer: string;
    surface: string;
    surfaceVariant: string;
    background: string;
    error: string;
    errorContainer: string;
    onPrimary: string;
    onSecondary: string;
    onTertiary: string;
    onSurface: string;
    onSurfaceVariant: string;
    onError: string;
    onErrorContainer: string;
    onBackground: string;
    outline: string;
    outlineVariant: string;
    inverseSurface: string;
    inverseOnSurface: string;
    inversePrimary: string;
    shadow: string;
    scrim: string;
    backdrop: string;
  };
  dark: boolean;
}

// Video Player Types
export type VideoQuality = 'auto' | '1080p' | '720p' | '480p' | '360p';

export interface VideoPlayerState {
  isPlaying: boolean;
  isPaused: boolean;
  isBuffering: boolean;
  hasError: boolean;
  currentTime: number;
  duration: number;
  quality: VideoQuality;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  isPiP: boolean;
}

export interface PlayerError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

// Search Types
export interface SearchFilters {
  category?: string;
  language?: string;
  country?: string;
  quality?: VideoQuality;
  adultContent?: boolean;
}

export interface SearchResult {
  channels: Channel[];
  totalResults: number;
  query: string;
  filters: SearchFilters;
  executionTime: number;
}

// Cache Types
export interface CacheEntry<T = any> {
  key: string;
  data: T;
  timestamp: number;
  ttl?: number;
  size?: number;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  lastCleanup: number;
}

// Network Types
export interface NetworkInfo {
  isConnected: boolean;
  type: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  isWiFi: boolean;
  quality: 'excellent' | 'good' | 'poor' | 'unknown';
  effectiveType: '2g' | '3g' | '4g' | '5g' | 'unknown';
}

// Performance Types
export interface PerformanceMetrics {
  appStartTime: number;
  playlistLoadTime: number;
  channelSwitchTime: number;
  searchTime: number;
  memoryUsage: number;
  cpuUsage?: number;
  networkLatency?: number;
}

// EPG Types
export interface EPGProgram {
  id: string;
  channelId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  duration: number;
  category?: string;
  rating?: string;
  isLive?: boolean;
  hasReplay?: boolean;
}

export interface EPGChannel {
  id: string;
  displayName: string;
  programs: EPGProgram[];
  logo?: string;
}

// Favorites Types
export interface Favorite {
  id: string;
  channelId: string;
  playlistId: string;
  userId: string;
  dateAdded: string;
  category?: string;
}

// Recent Channels Types
export interface RecentChannel {
  id: string;
  channelId: string;
  playlistId: string;
  userId: string;
  lastWatched: string;
  watchDuration: number;
  position?: number;
}

// Error Types
export interface AppError {
  id: string;
  type: 'network' | 'playback' | 'parsing' | 'cache' | 'unknown';
  message: string;
  details?: any;
  timestamp: string;
  userId?: string;
  context?: string;
}

// Analytics Types (optionnel)
export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  userId?: string;
  timestamp: string;
}

// Component Props Types
export interface ChannelCardProps {
  channel: Channel;
  onPress: (channel: Channel) => void;
  onFavoritePress?: (channel: Channel) => void;
  isFavorite?: boolean;
  showCategory?: boolean;
  showQuality?: boolean;
}

export interface VideoPlayerProps {
  channel: Channel;
  autoplay?: boolean;
  onError?: (error: PlayerError) => void;
  onStateChange?: (state: VideoPlayerState) => void;
  onClose?: () => void;
}

export interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  onFilter?: (filters: SearchFilters) => void;
  value?: string;
  filters?: SearchFilters;
}

// Hook Types
export interface UsePlaylistReturn {
  playlists: Playlist[];
  loading: boolean;
  error: string | null;
  addPlaylist: (playlist: Playlist) => Promise<void>;
  removePlaylist: (id: string) => Promise<void>;
  updatePlaylist: (id: string, updates: Partial<Playlist>) => Promise<void>;
  refreshPlaylist: (id: string) => Promise<void>;
}

export interface UseChannelsReturn {
  channels: Channel[];
  loading: boolean;
  error: string | null;
  searchChannels: (query: string, filters?: SearchFilters) => void;
  getChannelsByCategory: (category: string) => Channel[];
  getFavoriteChannels: () => Channel[];
}

export interface UseVideoPlayerReturn {
  state: VideoPlayerState;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleFullscreen: () => void;
  togglePiP: () => void;
}

// Context Types
export interface UserContextType {
  currentUser: User | null;
  users: User[];
  login: (userId: string, pin?: string) => Promise<boolean>;
  logout: () => void;
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
}

export interface ThemeContextType {
  theme: CustomTheme;
  themeType: ThemeType;
  setTheme: (theme: ThemeType) => void;
  isDark: boolean;
}

export interface PlaylistContextType {
  playlists: Playlist[];
  currentPlaylist: Playlist | null;
  setCurrentPlaylist: (playlist: Playlist | null) => void;
  addPlaylist: (playlist: Playlist) => Promise<void>;
  removePlaylist: (id: string) => Promise<void>;
  updatePlaylist: (id: string, updates: Partial<Playlist>) => Promise<void>;
}

// Storage Types
export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  getAllKeys(): Promise<string[]>;
  getSize(): Promise<number>;
}

// Import et re-export IPTVTheme depuis styles
// import type { IPTVTheme } from '../styles/themes';
// export type { IPTVTheme };

// Export all types (commentés car fichiers n'existent pas encore)
// export type * from './navigation';
// export type * from './video';
// export type * from './api';

// Re-export common React Navigation types
import type {RouteProp} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';

export type HomeScreenRouteProp = RouteProp<RootStackParamList, 'Home'>;
export type PlayerScreenRouteProp = RouteProp<RootStackParamList, 'Player'>;
export type SettingsScreenRouteProp = RouteProp<RootStackParamList, 'Settings'>;

export type HomeScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Home'
>;
export type PlayerScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Player'
>;
export type SettingsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Settings'
>;
