import {create} from 'zustand';
import {Channel} from '../types';

interface Category {
  id: string;
  name: string;
  count?: number;
  channels?: Channel[];
}

interface NavigationData {
  playlistId: string;
  allCategories: Category[];
  initialCategory: Category;
  initialChannels: Channel[];
  playlistName: string;
  useWatermelonDB: boolean;
  playlistType?: 'M3U' | 'XTREAM';
}

export interface PlayerState {
  channel: Channel | null;
  isVisible: boolean;
  isFullscreen: boolean;
  isPaused: boolean; // Remplacer isPlaying par isPaused pour correspondre à react-native-video
  isLoading: boolean;
  error: string | null;
  miniPlayerRect: {x: number; y: number; width: number; height: number} | null;
  isInChannelPlayerScreen: boolean; // Nouveau: savoir si on est dans la page 3 zones
  navigationData: NavigationData | null; // Pour stocker les données ChannelPlayerScreen
  playlistId: string | null; // Pour sauvegarder dans la bonne clé AsyncStorage
  hasRestoredPlaylistId: boolean; // Pour savoir si on a déjà restauré le playlistId
  isSearchScreenOpen: boolean; // Pour masquer le player pendant la recherche
  isFromMultiScreen: boolean; // Pour savoir si on vient du multi-écran
  isMultiScreenOpen: boolean; // Pour masquer le player quand MultiScreen est ouvert

  actions: {
    playChannel: (channel: Channel, startInFullscreen?: boolean) => void;
    play: (channel: Channel, startInFullscreen?: boolean) => void;
    setFullscreen: (fullscreen: boolean) => void;
    togglePlayPause: () => void;
    stop: () => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setMiniPlayerRect: (rect: {
      x: number;
      y: number;
      width: number;
      height: number;
    }) => void;
    setInChannelPlayerScreen: (inScreen: boolean) => void;
    setNavigationData: (data: NavigationData | null) => void;
    setPlaylistId: (playlistId: string) => void;
    restorePlaylistId: () => Promise<void>;
    setSearchScreenOpen: (isOpen: boolean) => void;
    setFromMultiScreen: (fromMultiScreen: boolean) => void;
    setMultiScreenOpen: (isOpen: boolean) => void;
  };
}

const initialState = {
  channel: null,
  isVisible: false,
  isFullscreen: false,
  isPaused: true, // La vidéo est en pause par défaut
  isLoading: false,
  error: null,
  miniPlayerRect: null,
  isInChannelPlayerScreen: false,
  navigationData: null,
  playlistId: null,
  hasRestoredPlaylistId: false,
  isSearchScreenOpen: false,
  isFromMultiScreen: false,
  isMultiScreenOpen: false,
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  ...initialState,

  actions: {
    // Action unique pour lancer une chaîne
    playChannel: (channel: Channel, startInFullscreen = false) => {
      console.log(
        `🎬 [PlayerStore] Playing channel '${channel.name}' | Fullscreen: ${startInFullscreen}`,
      );
      // 🕰️ AJOUT AUTOMATIQUE AUX RÉCENTS (fix première chaîne ChannelPlayerScreen)
      const currentState = get();
      if (currentState.playlistId) {
        setTimeout(async () => {
          try {
            // 👤 Récupérer le profil actif
            const ProfileService = (
              await import('../services/ProfileService')
            ).default;
            const activeProfile = await ProfileService.getActiveProfile();

            if (!activeProfile) {
              console.log('⚠️ [PlayerStore] Aucun profil actif, impossible d\'ajouter aux récents');
              return;
            }

            // 🆕 Utiliser le nouveau RecentChannelsService
            const RecentChannelsService = (
              await import('../services/RecentChannelsService')
            ).default;

            await RecentChannelsService.addRecent(
              channel,
              currentState.playlistId,
              activeProfile.id,
            );

            // Mettre à jour le store partagé pour synchronisation
            const updatedRecents = await RecentChannelsService.getRecentsByProfile(
              activeProfile.id,
              currentState.playlistId,
            );

            const {setRecentChannels} = (
              await import('./RecentChannelsStore')
            ).useRecentChannelsStore.getState();
            setRecentChannels(updatedRecents, activeProfile.id);
          } catch (error) {
            console.error(
              '❌ [PlayerStore Récents] Erreur ajout aux récents:',
              error,
            );
          }
        }, 0); // Exécuter dans la prochaine tick pour éviter de bloquer l'UI
      }
      // Note: Si playlistId non défini, on n'ajoute pas aux récents (normal pour certains contextes)

      set(state => ({
        ...state,
        channel,
        isVisible: true,
        isPaused: false, // Démarrer la lecture
        isLoading: true,
        isFullscreen: startInFullscreen,
        error: null,
      }));

      console.log(
        '✅ [PlayerStore] Channel state updated - isPaused: false, isVisible: true',
      );
    },

    // Alias pour compatibilité avec les appels existants
    play: (channel: Channel, startInFullscreen = false) => {
      console.log(
        `🎬 [PlayerStore] Play alias called for '${channel.name}' | Fullscreen: ${startInFullscreen}`,
      );
      set(state => ({
        ...state,
        channel,
        isVisible: true,
        isPaused: false,
        isLoading: true,
        isFullscreen: startInFullscreen,
        error: null,
      }));
    },

    // Gérer le mode plein écran
    setFullscreen: (fullscreen: boolean) => {
      const currentState = get();

      console.log(`🖥️ [PlayerStore] Changement fullscreen demandé: ${fullscreen}`);
      console.log('  État actuel:', {
        isFullscreen: currentState.isFullscreen,
        isVisible: currentState.isVisible,
        channelName: currentState.channel?.name,
        isPaused: currentState.isPaused,
        isInChannelPlayerScreen: currentState.isInChannelPlayerScreen
      });

      // Guard: éviter les changements inutiles
      if (currentState.isFullscreen === fullscreen) {
        console.log('⏭️ [PlayerStore] Changement fullscreen ignoré - déjà dans cet état');
        return;
      }

      // Guard: préserver isVisible sauf si explicitement demandé autrement
      if (!currentState.isVisible) {
        console.log('⚠️ [PlayerStore] Changement fullscreen - player non visible, autorisé');
      }

      set(state => ({
        ...state,
        isFullscreen: fullscreen,
        // Préserver isVisible sauf si explicitement demandé autrement
        isVisible: fullscreen ? currentState.isVisible : currentState.isVisible,
      }));

      console.log('✅ [PlayerStore] Changement fullscreen effectué:', {
        newFullscreen: fullscreen,
        isVisible: get().isVisible
      });
    },

    // Gérer Play/Pause
    togglePlayPause: () => {
      if (get().channel) {
        // Ne rien faire si aucune chaîne n'est chargée
        set(state => {
          console.log(
            state.isPaused
              ? '▶️ [PlayerStore] Resuming'
              : '⏸️ [PlayerStore] Pausing',
          );
          return {isPaused: !state.isPaused};
        });
      }
    },

    // Arrêter et masquer le lecteur
    stop: () => {
      console.log('⏹️ [PlayerStore] Demande d\'arrêt - vérification des conditions');

      const currentState = get();

      // Guard: Ne pas arrêter si on est en plein écran et que c'est un clic accidentel
      if (currentState.isFullscreen && currentState.isVisible && currentState.channel) {
        console.log('⚠️ [PlayerStore] Arrêt bloqué - fullscreen actif et visible');
        console.log('   État actuel:', {
          isFullscreen: currentState.isFullscreen,
          isVisible: currentState.isVisible,
          channelName: currentState.channel?.name,
          isPaused: currentState.isPaused
        });
        return;
      }

  
      console.log('✅ [PlayerStore] Arrêt autorisé - État avant arrêt:', {
        isFullscreen: currentState.isFullscreen,
        isVisible: currentState.isVisible,
        channelName: currentState.channel?.name,
        isPaused: currentState.isPaused
      });

      set(() => ({...initialState}));
    },

    setLoading: (loading: boolean) => {
      set(state => ({...state, isLoading: loading}));
    },

    setError: (error: string | null) => {
      set(state => ({...state, error, isLoading: false}));
    },

    setMiniPlayerRect: rect => {
      console.log('[PlayerStore] Setting mini-player rect:', rect);
      set(state => ({...state, miniPlayerRect: rect}));
    },

    setInChannelPlayerScreen: (inScreen: boolean) => {
      console.log(`[PlayerStore] In ChannelPlayerScreen: ${inScreen}`);
      set(state => ({...state, isInChannelPlayerScreen: inScreen}));
    },

    setNavigationData: (data: NavigationData | null) => {
      if (data) {
        console.log(
          `📍 [PlayerStore] Navigation data stored for ${data.playlistName} (${data.initialChannels.length} channels)`,
        );
        console.log('📍 [PlayerStore] Navigation data details:', {
          playlistId: data.playlistId,
          categoryName: data.initialCategory.name,
          useWatermelonDB: data.useWatermelonDB,
        });
      } else {
        console.log('📍 [PlayerStore] Navigation data cleared');
      }
      set(state => ({...state, navigationData: data}));
    },

    setPlaylistId: (playlistId: string) => {
      console.log(`📋 [PlayerStore] PlaylistId set: ${playlistId}`);
      set(state => ({...state, playlistId}));
    },

    restorePlaylistId: async () => {
      if (get().hasRestoredPlaylistId) {
        console.log('📋 [PlayerStore] PlaylistId already restored, skipping');
        return;
      }

      try {
        console.log('🔄 [PlayerStore] Attempting to restore playlistId...');
        const AsyncStorage = (
          await import('@react-native-async-storage/async-storage')
        ).default;
        const persistenceData = await AsyncStorage.getItem(
          'active_playlist_persistence',
        );

        if (persistenceData) {
          const data = JSON.parse(persistenceData);
          if (data.selectedPlaylistId) {
            console.log(
              `✅ [PlayerStore] Restored playlistId: ${data.selectedPlaylistId}`,
            );
            set(state => ({
              ...state,
              playlistId: data.selectedPlaylistId,
              hasRestoredPlaylistId: true,
            }));
          } else {
            console.log(
              '⚠️ [PlayerStore] No playlistId found in persistence data',
            );
            set(state => ({...state, hasRestoredPlaylistId: true}));
          }
        } else {
          console.log('ℹ️ [PlayerStore] No persistence data found');
          set(state => ({...state, hasRestoredPlaylistId: true}));
        }
      } catch (error) {
        console.error('❌ [PlayerStore] Error restoring playlistId:', error);
        set(state => ({...state, hasRestoredPlaylistId: true}));
      }
    },

    setSearchScreenOpen: (isOpen: boolean) => {
      console.log(
        `[PlayerStore] Search screen ${isOpen ? 'opened' : 'closed'}`,
      );
      set(state => ({...state, isSearchScreenOpen: isOpen}));
    },

    setFromMultiScreen: (fromMultiScreen: boolean) => {
      console.log(`[PlayerStore] From multi-screen: ${fromMultiScreen}`);
      set(state => ({...state, isFromMultiScreen: fromMultiScreen}));
    },

    setMultiScreenOpen: (isOpen: boolean) => {
      console.log(`[PlayerStore] Multi-screen open: ${isOpen}`);
      set(state => ({...state, isMultiScreenOpen: isOpen}));
    },
  },
}));

// Hook pour un accès simple aux actions
export const usePlayerActions = () => usePlayerStore(state => state.actions);
