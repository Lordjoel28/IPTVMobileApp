import React, {useRef, useEffect} from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  BackHandler,
  ScrollView,
  Animated as RNAnimated,
  Platform,
  AppState,
  Modal,
} from 'react-native';
import { usePlayerStatusBar } from '../hooks/useStatusBar';
import {useNavigation} from '@react-navigation/native';
import {
  PanGestureHandler,
  State,
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS, 
} from 'react-native-reanimated';
import Video, {SelectedVideoTrackType, SelectedTrackType} from 'react-native-video';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FastImage from 'react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';
import {usePlayerStore} from '../stores/PlayerStore';
import {useRecentChannelsStore} from '../stores/RecentChannelsStore';
import {EPGHelper, EPGData} from '../services/EPGHelper';
import EPGDataManager from '../services/EPGDataManager';
import {EPGCacheManager} from '../services/epg/EPGCacheManager';
import {usePlaylistStore} from '../stores/PlaylistStore';
import type {Channel} from '../types';
import MultiScreenView from './MultiScreenView';
import {IPTVService} from '../services/IPTVService';
import WatermelonM3UService from '../services/WatermelonM3UService';

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');
const {width: deviceWidth, height: deviceHeight} = Dimensions.get('screen'); // Vraies dimensions pour fullscreen


// Position et taille par défaut du lecteur flottant
const MINI_PLAYER_WIDTH = 240; // Augmenté de 192 à 240 (+25%)
const MINI_PLAYER_HEIGHT = MINI_PLAYER_WIDTH * (9 / 16);
const SAFE_AREA_MARGIN = 16;

const GlobalVideoPlayer: React.FC = () => {
  const videoRef = useRef<Video>(null);
  const navigation = useNavigation();


  // Force re-render du composant Video quand miniPlayerRect change
  const [videoKey, setVideoKey] = React.useState(0);

  // 🎯 PHASE 2: États pour gestures avancées (fullscreen uniquement)
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [seekFeedback, setSeekFeedback] = React.useState<{
    visible: boolean;
    direction: 'forward' | 'backward';
    seconds: number;
  }>({visible: false, direction: 'forward', seconds: 0});

  // Valeurs animées pour feedback visuel en fullscreen
  const seekFeedbackOpacity = useSharedValue(0);
  const seekFeedbackScale = useSharedValue(0.8);

  // État et animations pour l'effet de vague (ripple)
  const [rippleVisible, setRippleVisible] = React.useState(false);
  const [ripplePosition, setRipplePosition] = React.useState({x: 0, y: 0});
  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(0);

  // Récupérer TOUT l'état du store, y compris miniPlayerRect, isInChannelPlayerScreen et navigationData
  const {
    channel,
    isVisible,
    isFullscreen,
    isPaused,
    isLoading,
    error,
    miniPlayerRect,
    isInChannelPlayerScreen,
    navigationData,
    playlistId: storePlaylistId,
    isSearchScreenOpen,
    isFromMultiScreen,
    isMultiScreenOpen,
    actions,
  } = usePlayerStore();

  // 🎯 StatusBar automatique avec notre hook centralisé
  usePlayerStatusBar(isFullscreen, isVisible, 'GlobalVideoPlayer');

  // 🔄 Restaurer le playlistId au montage
  React.useEffect(() => {
    actions.restorePlaylistId();
  }, [actions]);

  const viewPosition = useRef(new RNAnimated.ValueXY()).current;
  const viewSize = useRef(new RNAnimated.ValueXY()).current;
  const viewOpacity = useRef(new RNAnimated.Value(0)).current;

  // Gestion du drag pour PiP
  const dragPosition = useRef(new RNAnimated.ValueXY()).current;
  const isDragging = useRef(false);


  // 🚀 CALCULS MÉMORISÉS avec dependencies ultra-stables
  const miniPlayerPosition = React.useMemo(() => {
    return miniPlayerRect ? { x: miniPlayerRect.x, y: miniPlayerRect.y } : { x: 0, y: 0 };
  }, [miniPlayerRect?.x, miniPlayerRect?.y]);

  const miniPlayerSize = React.useMemo(() => {
    return miniPlayerRect ? { width: miniPlayerRect.width, height: miniPlayerRect.height } : { width: 0, height: 0 };
  }, [miniPlayerRect?.width, miniPlayerRect?.height]);

  const finalPosition = React.useMemo(() => {
    if (!isVisible) return { x: 0, y: 0 };

    if (isFullscreen) {
      return { x: 0, y: 0 };
    } else if (isInChannelPlayerScreen && miniPlayerRect) {
      return miniPlayerPosition;
    } else {
      return {
        x: screenWidth - MINI_PLAYER_WIDTH - SAFE_AREA_MARGIN,
        y: screenHeight - MINI_PLAYER_HEIGHT - SAFE_AREA_MARGIN - 50,
      };
    }
  }, [isVisible, isFullscreen, isInChannelPlayerScreen, miniPlayerPosition, miniPlayerRect]); // Dependencies stables

  const finalSize = React.useMemo(() => {
    if (!isVisible) return { width: 0, height: 0 };

    if (isFullscreen) {
      // 🎯 SIMPLE: Utiliser directement screen dimensions (mode paysage détecté)
      const screen = Dimensions.get('screen');
      // Forcer le mode paysage: width doit être supérieur à height
      const isLandscape = screen.width > screen.height;
      return {
        width: isLandscape ? screen.width : screen.height,
        height: isLandscape ? screen.height : screen.width,
      };
    } else if (isInChannelPlayerScreen && miniPlayerRect) {
      return miniPlayerSize;
    } else {
      return { width: MINI_PLAYER_WIDTH, height: MINI_PLAYER_HEIGHT };
    }
  }, [isVisible, isFullscreen, isInChannelPlayerScreen, miniPlayerSize, miniPlayerRect]); // Dependencies stables

  // L'immersion est maintenant gérée par le hook global useGlobalImmersion


  // useEffect d'animation avec debounce pour éviter les boucles
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear le timeout précédent
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }

    // Debounce l'animation pour éviter les déclenchements excessifs
    animationTimeoutRef.current = setTimeout(() => {
      if (isVisible) {
        const isFs = isFullscreen;

        // Utiliser finalPosition et finalSize calculés pour éviter les recalculs
        const positionTarget = {x: finalPosition.x, y: finalPosition.y};
        const sizeTarget = {x: finalSize.width, y: finalSize.height};

        // Animation rapide pour transitions fluides sans flash
        const animDuration = isFs ? 200 : isInChannelPlayerScreen ? 150 : 300;

        console.log('🎬 [Animation] Démarrage animation vers:', {
          positionTarget,
          sizeTarget,
          duration: animDuration,
          isInChannelPlayerScreen,
          isFullscreen,
        });

        RNAnimated.parallel([
          RNAnimated.timing(viewPosition, {
            toValue: positionTarget,
            duration: animDuration,
            useNativeDriver: false,
          }),
          RNAnimated.timing(viewSize, {
            toValue: sizeTarget,
            duration: animDuration,
            useNativeDriver: false,
          }),
          RNAnimated.timing(viewOpacity, {
            toValue: 1,
            duration: 100,
            useNativeDriver: false,
          }),
        ]).start();
      } else {
        viewOpacity.setValue(0);
      }
    }, 50); // Debounce de 50ms

    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [isVisible, isFullscreen, isInChannelPlayerScreen]); // Dependencies réduites - finalPosition/finalSize calculés dans l'animation

  // Optimisation : éviter les re-renders inutiles du composant Video
  useEffect(() => {
    if (miniPlayerRect && !isFullscreen) {
      console.log('🔄 [GlobalVideoPlayer] MiniPlayerRect disponible');
      // Ne plus forcer le re-render du Video pour éviter les interruptions
    }
  }, [miniPlayerRect, isFullscreen]);

  // Debug logs pour les changements d'état critiques seulement (optimisé pour éviter boucles)
  useEffect(() => {
    console.log('🎬 [GlobalVideoPlayer] État critique changé:', {
      isVisible,
      isFullscreen,
      channelName: channel?.name,
    });
  }, [isVisible, isFullscreen, channel?.name]); // Dependencies minimales

  // 🎯 LIFECYCLE: Stopper la lecture quand l'app passe en arrière-plan
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log('🔇 [GlobalVideoPlayer] App en arrière-plan - STOP player');
        if (isVisible && channel) {
          actions.stop(); // Arrêter complètement le player
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isVisible, channel, actions]);

  // 🎯 CORRECTION: Afficher les contrôles automatiquement en fullscreen
  useEffect(() => {
    if (isFullscreen && !isInChannelPlayerScreen) {
      console.log('🎬 [Fullscreen] Showing controls automatically');
      showControlsTemporarily();
    }
  }, [isFullscreen, isInChannelPlayerScreen]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        console.log('🔙 [BackHandler] Hardware back button pressed');
        console.log('🔙 [BackHandler] Current state:', {
          isFullscreen,
          hasNavigationData: !!navigationData,
          channel: channel?.name || 'none',
        });
        if (isFullscreen) {
          console.log(
            '🔙 [BackHandler] In fullscreen mode, checking navigation data...',
          );

          // 🎯 CAS SPÉCIAL: Si vient du multi-écran, revenir au multi-écran
          if (isFromMultiScreen) {
            console.log('🔙 [BackHandler] From multi-screen, reopening multi-screen...');
            // Ordre important pour éviter flash:
            // 1. Marquer MultiScreen comme ouvert AVANT de quitter fullscreen
            actions.setMultiScreenOpen(true);
            setMultiScreenVisible(true);
            // 2. Sortir du fullscreen (le player sera masqué car isMultiScreenOpen=true)
            actions.setFullscreen(false);
            actions.setFromMultiScreen(false);
            return true;
          }

          // 🎯 COMPORTEMENT NORMAL: Navigation vers ChannelPlayerScreen si vient de PiP→Fullscreen
          if (navigationData) {
            console.log('🔙 [BackHandler] NavigationData found:', {
              playlistId: navigationData.playlistId,
              playlistName: navigationData.playlistName,
              channelCount: navigationData.initialChannels.length,
              categoryName: navigationData.initialCategory.name,
            });
            console.log(
              `🔄 [Navigation] Retour fullscreen → ChannelPlayerScreen avec ${navigationData.initialChannels.length} chaînes`,
            );

            // Naviguer vers ChannelPlayerScreen avec les données stockées
            navigation.navigate('ChannelPlayer', {
              playlistId: navigationData.playlistId,
              allCategories: navigationData.allCategories,
              initialCategory: navigationData.initialCategory,
              initialChannels: navigationData.initialChannels,
              selectedChannel: channel, // Chaîne actuelle
              playlistName: navigationData.playlistName,
              useWatermelonDB: navigationData.useWatermelonDB,
            });

            // Nettoyer les données de navigation après utilisation
            actions.setNavigationData(null);
          } else {
            console.log(
              '🔙 [BackHandler] No navigationData found, using default behavior',
            );
            // Comportement par défaut: juste sortir du fullscreen
            actions.setFullscreen(false);
          }

          return true;
        } else {
          console.log(
            '🔙 [BackHandler] Not in fullscreen mode, ignoring back button',
          );
        }
        return false;
      },
    );
    return () => backHandler.remove();
  }, [isFullscreen, actions, navigation, channel, navigationData, isFromMultiScreen, setMultiScreenVisible]);

  // StatusBar gérée par StatusBarManager centralisé
  // La logique complexe est maintenant simplifiée

  // Gestionnaire pour drag PiP avec adoucissement
  const onPanGestureEvent = RNAnimated.event(
    [
      {
        nativeEvent: {
          translationX: dragPosition.x,
          translationY: dragPosition.y,
        },
      },
    ],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        // Ajouter une résistance douce aux bords
        const {translationX, translationY} = event.nativeEvent;
        const currentX = finalPosition.x + translationX;
        const currentY = finalPosition.y + translationY;

        // Limites souples avec résistance
        const maxX = screenWidth - finalSize.width;
        const maxY = screenHeight - finalSize.height;

        let dampedX = translationX;
        let dampedY = translationY;

        // Résistance horizontale
        if (currentX < 0) {
          dampedX = translationX * 0.3; // Résistance 70%
        } else if (currentX > maxX) {
          dampedX = translationX * 0.3;
        }

        // Résistance verticale
        if (currentY < 0) {
          dampedY = translationY * 0.3;
        } else if (currentY > maxY) {
          dampedY = translationY * 0.3;
        }

        dragPosition.setValue({x: dampedX, y: dampedY});
      },
    }
  );

  // État local pour fullscreen instantané (sans store)
  const [localFullscreen, setLocalFullscreen] = React.useState(false);

  // État pour affichage temporaire des boutons PiP
  const [showPipButtons, setShowPipButtons] = React.useState(false);
  const pipButtonsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pipButtonsOpacity = useRef(new RNAnimated.Value(0)).current;

  // État pour bouton play/pause central
  const [showPlayPauseButton, setShowPlayPauseButton] = React.useState(false);
  const playPauseButtonTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playPauseButtonOpacity = useSharedValue(0);
  const playPauseButtonScale = useSharedValue(0.8);

  // États pour contrôles TiviMate
  const [showControls, setShowControls] = React.useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const controlsOpacity = useSharedValue(0);

  // États pour docker TiviMate
  const [showDocker, setShowDocker] = React.useState(false);
  const dockerOpacity = useSharedValue(0);
  const [isScrolling, setIsScrolling] = React.useState(false);

  // États pour le menu paramètres
  const [showSettingsMenu, setShowSettingsMenu] = React.useState(false);
  const settingsMenuOpacity = useSharedValue(0);

  // États pour les sous-menus
  const [activeSubMenu, setActiveSubMenu] = React.useState<string | null>(null);
  const [sleepTimer, setSleepTimer] = React.useState<number | null>(null);
  const sleepTimerRef = useRef<NodeJS.Timeout | null>(null);
  const subMenuOpacity = useSharedValue(0);

  // États pour piste audio (1 = Piste 1 activée par défaut, 0 = muet)
  const [selectedAudioTrack, setSelectedAudioTrack] = React.useState<number>(1);
  const [audioDelay, setAudioDelay] = React.useState<number>(0); // en ms

  // États pour piste vidéo
  const [selectedVideoQuality, setSelectedVideoQuality] = React.useState<string>('auto');
  const [availableVideoTracks, setAvailableVideoTracks] = React.useState<any[]>([]);
  const [availableAudioTracks, setAvailableAudioTracks] = React.useState<any[]>([]);
  const [availableTextTracks, setAvailableTextTracks] = React.useState<any[]>([]);

  // États pour sous-titres
  const [subtitlesEnabled, setSubtitlesEnabled] = React.useState<boolean>(false);
  const [selectedSubtitleTrack, setSelectedSubtitleTrack] = React.useState<number>(0);
  const [subtitleSize, setSubtitleSize] = React.useState<string>('normal');
  const [subtitleDelay, setSubtitleDelay] = React.useState<number>(0); // en ms

  // États pour mode d'affichage
  const [zoomMode, setZoomMode] = React.useState<string>('fit');

  // États pour contrôle du buffer
  const [bufferMode, setBufferMode] = React.useState<string>('normal'); // 'low' | 'normal' | 'high'

  // État pour verrouillage de l'écran
  const [isScreenLocked, setIsScreenLocked] = React.useState<boolean>(false);

  // État pour multi-écran
  const [multiScreenVisible, setMultiScreenVisible] = React.useState<boolean>(false);
  // Persister l'état du multiscreen pour ne pas le perdre à la fermeture/réouverture
  const [multiScreenLayout, setMultiScreenLayout] = React.useState<string | null>(null);
  const [multiScreenSlots, setMultiScreenSlots] = React.useState<(Channel | null)[]>([]);
  const [multiScreenActiveSlot, setMultiScreenActiveSlot] = React.useState<number>(0);

  // États pour EPG réelles
  const [epgLoading, setEpgLoading] = React.useState(false);
  const [epgData, setEpgData] = React.useState<EPGData | null>(null);

  // Récupération des données playlist pour les chaînes récentes
  const {channels: playlistChannels} = usePlaylistStore();

  // 🕰️ Récupération des chaînes récentes du store simple
  const {recentChannels: storeRecentChannels} = useRecentChannelsStore();

  // 📺 Récupération des chaînes de la playlist active pour multi-écran
  const [allChannelsForMultiScreen, setAllChannelsForMultiScreen] = React.useState<Channel[]>([]);
  const [lastLoadedPlaylistId, setLastLoadedPlaylistId] = React.useState<string | null>(null);
  const [isLoadingChannels, setIsLoadingChannels] = React.useState(false);

  // Charger les chaînes de la playlist active quand le multi-écran s'ouvre ou la playlist change
  React.useEffect(() => {
    // Récupérer playlistId depuis navigationData (priorité) ou store (fallback)
    const activePlaylistId = navigationData?.playlistId || storePlaylistId;

    // Charger si: multi-screen visible ET playlistId existe ET (pas encore chargé OU playlist différente)
    if (multiScreenVisible && activePlaylistId && activePlaylistId !== lastLoadedPlaylistId) {
      const loadAllChannels = async () => {
        try {
          setIsLoadingChannels(true);
          console.log('📋 [MultiScreen] Chargement chaînes de la playlist:', activePlaylistId);

          // Charger en arrière-plan avec timeout pour ne pas bloquer l'UI
          setTimeout(async () => {
            const result = await WatermelonM3UService.getPlaylistWithChannels(
              activePlaylistId,
              50000, // Limit très élevé pour supporter playlists massives (11K+ chaînes)
              0
            );

            // Convertir les chaînes WatermelonDB en format Channel
            const convertedChannels = result.channels.map((ch: any) => ({
              id: ch.id,
              name: ch.name,
              url: ch.streamUrl,
              logo: ch.logoUrl,
              group: ch.groupTitle,
              category: ch.groupTitle,
            }));

            console.log('📺 [MultiScreen] Loaded', convertedChannels.length, 'channels from playlist', activePlaylistId);
            setAllChannelsForMultiScreen(convertedChannels);
            setLastLoadedPlaylistId(activePlaylistId);
            setIsLoadingChannels(false);
          }, 0);
        } catch (error) {
          console.error('❌ [MultiScreen] Error loading channels:', error);
          setIsLoadingChannels(false);
        }
      };

      loadAllChannels();
    } else if (multiScreenVisible && !activePlaylistId) {
      console.warn('⚠️ [MultiScreen] Aucune playlist active trouvée (navigationData et store)');
    }
  }, [multiScreenVisible, navigationData, storePlaylistId, lastLoadedPlaylistId]);

  const normalizeName = (name: string): string =>
    name.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Fonction pour charger les données EPG
  const loadEPGData = React.useCallback(async () => {
    if (!channel) {
        setEpgData(null);
        return;
    }

    setEpgLoading(true);
    try {
        // 1. Normaliser le nom de la chaîne M3U
        const normalizedM3UName = normalizeName(channel.name);

        // 2. Chercher dans l'index du EPGCacheManager
        const epgChannel = EPGCacheManager.channelIndex.get(normalizedM3UName);

        if (epgChannel) {
            console.log(`✅ [EPG] Match trouvé pour "${channel.name}" -> EPG ID: ${epgChannel.id}`);
            // 3. Utiliser EPGDataManager avec le bon ID
            const data = await EPGDataManager.getChannelEPG(epgChannel.id);
            setEpgData(data);
        } else {
            console.log(`❌ [EPG] Aucun match trouvé pour "${channel.name}" dans l'index EPG.`);
            setEpgData(null);
        }
    } catch (error) {
        console.warn('⚠️ Failed to load EPG data:', error);
        setEpgData(null);
    } finally {
        setEpgLoading(false);
    }
  }, [channel]);

  // Log de mount unique (éviter logs constants)
  React.useEffect(() => {
    console.log('🔄 [GlobalVideoPlayer] Component mounted with BackHandler enabled');
  }, []);

  // Charger EPG au changement de chaîne
  React.useEffect(() => {
    loadEPGData();
  }, [loadEPGData]); // Supprimer showControls

  // Fonction pour déterminer la qualité de la chaîne
  const getChannelQuality = (channel: any) => {
    if (channel?.quality) {
      return channel.quality.toUpperCase();
    }
    // Essayer de détecter depuis l'URL
    const url = channel?.url?.toLowerCase() || '';
    if (url.includes('fhd') || url.includes('1080')) {return 'FHD';}
    if (url.includes('hd') || url.includes('720')) {return 'HD';}
    if (url.includes('sd') || url.includes('480')) {return 'SD';}
    return 'HD'; // Par défaut
  };

  // Fonction pour déterminer le FPS (estimation)
  const getChannelFPS = (channel: any) => {
    const url = channel?.url?.toLowerCase() || '';
    if (url.includes('60fps')) {return '60 FPS';}
    if (url.includes('30fps')) {return '30 FPS';}
    if (url.includes('24fps')) {return '24 FPS';}
    return '25 FPS'; // Standard européen
  };

  // Fonction pour déterminer l'audio
  const getChannelAudio = (channel: any) => {
    const url = channel?.url?.toLowerCase() || '';
    if (url.includes('stereo')) {return 'STÉRÉO';}
    if (url.includes('mono')) {return 'MONO';}
    if (url.includes('5.1') || url.includes('surround')) {return '5.1';}
    return 'STÉRÉO'; // Par défaut
  };

  // Utiliser les chaînes récentes du store simple (limite 20 avec scroll)
  const recentChannels = React.useMemo(() => {
    if (storeRecentChannels && storeRecentChannels.length > 0) {
      const limitedChannels = storeRecentChannels.slice(0, 20);
      console.log(
        `✅ [GlobalVideoPlayer] Store → Docker: ${storeRecentChannels.length} chaînes récentes → affichage de ${limitedChannels.length} (limite 20)`,
      );
      console.log('📋 [GlobalVideoPlayer] Noms des chaînes:', limitedChannels.map(ch => ch.name).join(', '));
      return limitedChannels.map((ch, index) => ({
        ...ch,
        // Assurer un ID unique
        id: ch.id || `channel_${index}`,
        // Debug pour voir les logos disponibles
        _hasLogo: !!ch.logo,
      }));
    }

    // Fallback: utiliser les premières chaînes de la playlist avec leurs logos
    if (playlistChannels && playlistChannels.length > 0) {
      console.log(
        `🔄 [GlobalVideoPlayer] Fallback sur premières chaînes de playlist: ${playlistChannels.length}`,
      );
      const fallbackChannels = playlistChannels
        .slice(0, 20) // Limite 20 chaînes avec scroll
        .map((ch, index) => ({
          ...ch,
          // Assurer un ID unique
          id: ch.id || `channel_${index}`,
          // Debug pour voir les logos disponibles
          _hasLogo: !!ch.logo,
        }));

      console.log(
        `🔄 [GlobalVideoPlayer] Fallback: ${fallbackChannels.length} chaînes, logos:`,
        fallbackChannels.map(ch => ({name: ch.name, hasLogo: ch._hasLogo})),
      );

      return fallbackChannels;
    }

    console.log('⚠️ [GlobalVideoPlayer] Aucune chaîne récente disponible');
    return [];
  }, [storeRecentChannels, playlistChannels]);

  // Animation pour le clic sur le bouton play/pause
  const animatePlayPauseClick = () => {
    playPauseButtonScale.value = withSpring(
      0.85,
      {
        damping: 20,
        stiffness: 400,
      },
      () => {
        playPauseButtonScale.value = withSpring(1, {
          damping: 15,
          stiffness: 300,
        });
      },
    );
  };

  // Fonction pour créer l'effet de vague (ripple)
  const showRippleEffect = (x: number, y: number) => {
    setRipplePosition({x, y});
    setRippleVisible(true);

    // Reset les valeurs
    rippleScale.value = 0;
    rippleOpacity.value = 0.6;

    // Animation de la vague qui se propage
    rippleScale.value = withTiming(4, {duration: 600}); // Se propage sur tout l'écran
    rippleOpacity.value = withTiming(0, {duration: 600}, () => {
      runOnJS(setRippleVisible)(false);
    });
  };

  // Fonction pour toggle resize PiP (comme IPTV Smarters Pro)
  const toggleResize = () => {
    const newFullscreen = !localFullscreen;
    setLocalFullscreen(newFullscreen);
    if (newFullscreen) {
      showControlsTemporarily();
    }
  };

  // Fonctions pour contrôles TiviMate
  const showControlsTemporarily = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    setShowControls(true);
    setShowDocker(true);
    controlsOpacity.value = withTiming(1, {duration: 300});
    dockerOpacity.value = withTiming(1, {duration: 300});

    // Délai adaptatif : 8 secondes si scroll actif, sinon 5 secondes
    const hideDelay = isScrolling ? 8000 : 5000;
    console.log(
      `⏱️ [Controls] Auto-hide dans ${
        hideDelay / 1000
      }s (scroll: ${isScrolling})`,
    );

    controlsTimeoutRef.current = setTimeout(() => {
      controlsOpacity.value = withTiming(0, {duration: 300});
      dockerOpacity.value = withTiming(0, {duration: 300});
      setTimeout(() => {
        setShowControls(false);
        setShowDocker(false);
      }, 300);
    }, hideDelay);
  };

  const toggleControls = () => {
    // Si l'écran est verrouillé, ne rien faire sauf si on veut afficher le bouton de déverrouillage
    if (isScreenLocked && !showControls) {
      // Afficher seulement le header avec le bouton de déverrouillage
      setShowControls(true);
      controlsOpacity.value = withTiming(1, {duration: 300});
      // Auto-cacher après 3s
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        controlsOpacity.value = withTiming(0, {duration: 300});
        setTimeout(() => setShowControls(false), 300);
      }, 3000);
      return;
    }

    if (showControls) {
      // Cacher immédiatement
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsOpacity.value = withTiming(0, {duration: 300});
      dockerOpacity.value = withTiming(0, {duration: 300});
      setTimeout(() => {
        setShowControls(false);
        setShowDocker(false);
      }, 300);
    } else {
      // Montrer temporairement
      showControlsTemporarily();
    }
  };

  // Fonction pour afficher temporairement les boutons PiP
  const showPipButtonsTemporarily = () => {
    // Annuler le timeout précédent si il existe
    if (pipButtonsTimeoutRef.current) {
      clearTimeout(pipButtonsTimeoutRef.current);
    }

    setShowPipButtons(true);

    // Animation d'apparition
    RNAnimated.timing(pipButtonsOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // Masquer après 3 secondes avec animation
    pipButtonsTimeoutRef.current = setTimeout(() => {
      RNAnimated.timing(pipButtonsOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setShowPipButtons(false);
      });
    }, 3000);

    console.log('👆 [GlobalVideoPlayer] Showing PiP buttons temporarily');
  };

  // Fonction pour afficher temporairement le bouton play/pause central
  const showPlayPauseButtonTemporarily = () => {
    if (playPauseButtonTimeoutRef.current) {
      clearTimeout(playPauseButtonTimeoutRef.current);
    }

    setShowPlayPauseButton(true);

    // Animation d'apparition fluide
    playPauseButtonOpacity.value = withTiming(1, {duration: 200});
    playPauseButtonScale.value = withSpring(1, {damping: 15, stiffness: 200});

    // Masquer après 3 secondes
    playPauseButtonTimeoutRef.current = setTimeout(() => {
      playPauseButtonOpacity.value = withTiming(0, {duration: 300});
      playPauseButtonScale.value = withTiming(0.8, {duration: 300});
      setTimeout(() => {
        setShowPlayPauseButton(false);
      }, 300);
    }, 3000);
  };

  // Cleanup du timeout
  useEffect(() => {
    return () => {
      if (pipButtonsTimeoutRef.current) {
        clearTimeout(pipButtonsTimeoutRef.current);
      }
      if (sleepTimerRef.current) {
        clearTimeout(sleepTimerRef.current);
      }
    };
  }, []);

  // Fonction pour définir la minuterie de sommeil
  const setSleepTimerDuration = (minutes: number | null) => {
    // Nettoyer le timer existant
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }

    if (minutes === null) {
      setSleepTimer(null);
      console.log('⏰ [SleepTimer] Minuterie désactivée');
      return;
    }

    setSleepTimer(minutes);
    console.log(`⏰ [SleepTimer] Minuterie activée: ${minutes} minutes`);

    // Créer le nouveau timer
    sleepTimerRef.current = setTimeout(() => {
      console.log('⏰ [SleepTimer] Timer expiré - Arrêt de la lecture');
      actions.stop();
      setSleepTimer(null);
    }, minutes * 60 * 1000);
  };

  // 🎯 PHASE 2: Handlers pour gestures avancées (fullscreen uniquement)
  const handleSeekForward = () => {
    console.log(
      '📍 [DEBUG] videoRef:',
      !!videoRef.current,
      'duration:',
      duration,
      'currentTime:',
      currentTime,
    );

    if (videoRef.current && duration > 0) {
      const newTime = Math.min(currentTime + 10, duration);
      console.log('📍 [DEBUG] Seeking to:', newTime, 'seconds');
      videoRef.current.seek(newTime);
      showSeekFeedback('forward', 10);
    } else {
      console.warn(
        '⚠️ [DEBUG] Cannot seek forward - videoRef or duration issue',
      );
    }
  };

  const handleSeekBackward = () => {
    console.log(
      '📍 [DEBUG] videoRef:',
      !!videoRef.current,
      'duration:',
      duration,
      'currentTime:',
      currentTime,
    );

    if (videoRef.current) {
      const newTime = Math.max(currentTime - 10, 0);
      console.log('📍 [DEBUG] Seeking to:', newTime, 'seconds');
      videoRef.current.seek(newTime);
      showSeekFeedback('backward', 10);
    } else {
      console.warn('⚠️ [DEBUG] Cannot seek backward - videoRef issue');
    }
  };

  const showSeekFeedback = (
    direction: 'forward' | 'backward',
    seconds: number,
  ) => {
    setSeekFeedback({visible: true, direction, seconds});

    // Animation style YouTube : apparition rapide avec scaling
    seekFeedbackOpacity.value = 0;
    seekFeedbackScale.value = 0.5;

    // Animation d'entrée rapide
    seekFeedbackOpacity.value = withTiming(1, {duration: 150});
    seekFeedbackScale.value = withSpring(1, {
      damping: 20,
      stiffness: 400,
      mass: 0.8,
    });

    // Auto-hide après 800ms comme YouTube
    setTimeout(() => {
      seekFeedbackOpacity.value = withTiming(0, {duration: 200});
      seekFeedbackScale.value = withTiming(1.2, {duration: 200});
      setTimeout(() => {
        runOnJS(setSeekFeedback)({
          visible: false,
          direction: 'forward',
          seconds: 0,
        });
      }, 200);
    }, 800);
  };

  // Récupérer les dimensions d'écran une seule fois
  const screenDims = React.useMemo(() => Dimensions.get('screen'), []);

  // 🎯 PHASE 2: Configuration des gestures avancées pour fullscreen
  const leftDoubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(event => {
      // Si écran verrouillé, ne rien faire
      if (isScreenLocked) return;

      // Position de la vague : centre de la zone gauche
      const rippleX = screenDims.width * 0.15; // 15% de la largeur d'écran
      const rippleY = screenDims.height * 0.5; // Centre vertical

      runOnJS(showRippleEffect)(rippleX, rippleY);
      runOnJS(handleSeekBackward)();
    });

  const rightDoubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(event => {
      // Si écran verrouillé, ne rien faire
      if (isScreenLocked) return;

      // Position de la vague : centre de la zone droite
      const rippleX = screenDims.width * 0.85; // 85% de la largeur d'écran
      const rippleY = screenDims.height * 0.5; // Centre vertical

      runOnJS(showRippleEffect)(rippleX, rippleY);
      runOnJS(handleSeekForward)();
    });

  // Geste pour zone centrale - afficher contrôles TiviMate
  const centerTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      runOnJS(toggleControls)();
    });

  // Gestes simplifiés : seulement double-tap pour seek
  const leftSideGesture = leftDoubleTap;
  const rightSideGesture = rightDoubleTap;

  // 🎯 STYLES ANIMÉS pour le feedback visuel
  const seekFeedbackAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: seekFeedbackOpacity.value,
      transform: [{scale: seekFeedbackScale.value}],
    };
  });

  // Style animé pour le bouton play/pause central
  const playPauseButtonAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: playPauseButtonOpacity.value,
      transform: [{scale: playPauseButtonScale.value}],
    };
  });

  // Style animé pour l'effet de vague (ripple)
  const rippleAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: rippleOpacity.value,
      transform: [{scale: rippleScale.value}],
    };
  });

  // Style animé pour les contrôles TiviMate
  const controlsAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: controlsOpacity.value,
    };
  });

  // Style animé pour le docker TiviMate
  const dockerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: dockerOpacity.value,
    };
  });

  // Style animé pour le menu paramètres
  const settingsMenuAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: settingsMenuOpacity.value,
    };
  });

  // Style animé pour le sous-menu
  const subMenuAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: subMenuOpacity.value,
    };
  });

  // Fonction pour ouvrir un sous-menu
  const openSubMenu = (menuName: string) => {
    setActiveSubMenu(menuName);
    subMenuOpacity.value = withTiming(1, {duration: 200});
  };

  // Fonction pour fermer le sous-menu
  const closeSubMenu = () => {
    subMenuOpacity.value = withTiming(0, {duration: 200});
    setTimeout(() => setActiveSubMenu(null), 200);
  };

  const onPanStateChange = (event: any) => {
    if (event.nativeEvent.state === State.BEGAN) {
      isDragging.current = true;
    } else if (
      event.nativeEvent.state === State.END ||
      event.nativeEvent.state === State.CANCELLED
    ) {
      isDragging.current = false;

      // Snap vers les bords pour éviter que le PiP soit au milieu
      const {translationX, translationY} = event.nativeEvent;
      const currentX = finalPosition.x + translationX;
      const currentY = finalPosition.y + translationY;

      // Limites d'écran
      const maxX = screenWidth - finalSize.width;
      const maxY = screenHeight - finalSize.height;

      let snapX = Math.max(0, Math.min(maxX, currentX));
      let snapY = Math.max(0, Math.min(maxY, currentY));

      // Snap vers les côtés (gauche ou droite)
      if (snapX < screenWidth / 2) {
        snapX = 16; // Marge gauche
      } else {
        snapX = screenWidth - finalSize.width - 16; // Marge droite
      }

      // Animation de snap plus douce
      RNAnimated.parallel([
        RNAnimated.spring(viewPosition.x, {
          toValue: snapX,
          useNativeDriver: false,
          bounciness: 8,
          speed: 12,
        }),
        RNAnimated.spring(viewPosition.y, {
          toValue: snapY,
          useNativeDriver: false,
          bounciness: 8,
          speed: 12,
        }),
      ]).start();

      // Reset drag position
      dragPosition.setValue({x: 0, y: 0});
    }
  };

  // Ne pas faire de return conditionnel avant d'avoir utilisé tous les hooks !
  // On gère la visibilité avec une condition dans le render

  // 🚀 Position et taille avec mémorisation stable
  const renderPosition = React.useMemo(() => {
    if (localFullscreen) {
      return { left: 0, top: 0 };
    } else if (!isInChannelPlayerScreen && !isFullscreen) {
      // Mode PiP draggable : combiner viewPosition + drag
      return {
        left: RNAnimated.add(viewPosition.x, dragPosition.x),
        top: RNAnimated.add(viewPosition.y, dragPosition.y),
      };
    } else {
      return { left: finalPosition.x, top: finalPosition.y };
    }
  }, [localFullscreen, isInChannelPlayerScreen, isFullscreen, finalPosition]); // Dependencies objets stables

  const renderSize = React.useMemo(() => {
    if (localFullscreen) {
      return { width: screenWidth, height: screenHeight }; // Utiliser constantes
    } else {
      return { width: finalSize.width, height: finalSize.height };
    }
  }, [localFullscreen, finalSize]); // Dependencies objets stables

  // Force la synchronisation une seule fois avec debounce (évite boucles infinies)
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 🚀 Synchronisation optimisée avec références stables
  const syncPositionRef = useRef(finalPosition);
  const syncSizeRef = useRef(finalSize);

  React.useEffect(() => {
    syncPositionRef.current = finalPosition;
    syncSizeRef.current = finalSize;
  }, [finalPosition, finalSize]);

  React.useEffect(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(() => {
      if (!localFullscreen && !isFullscreen && isVisible) {
        const currentSize = syncSizeRef.current;
        const currentPosition = syncPositionRef.current;

        // Synchronisation taille silencieuse
        viewSize.setValue({x: currentSize.width, y: currentSize.height});

        // Sync position seulement si vraiment nécessaire
        if (!isInChannelPlayerScreen) {
          const currentPos = {x: viewPosition.x._value, y: viewPosition.y._value};
          const shouldSync = (
            (currentPos.x === 0 && currentPos.y === 0) ||
            Math.abs(currentPos.x - currentPosition.x) > 20 ||
            Math.abs(currentPos.y - currentPosition.y) > 20
          );

          if (shouldSync) {
            viewPosition.setValue({x: currentPosition.x, y: currentPosition.y});
          }
        }
      }
    }, 150); // Debounce plus long pour éviter cycles

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [localFullscreen, isFullscreen, isInChannelPlayerScreen, isVisible]); // Dependencies minimales

  const calculatedOpacity = (isFullscreen && !isInChannelPlayerScreen) ? 1 : (isVisible ? 1 : 0);
  const usingFullscreenStyle = isFullscreen && !isInChannelPlayerScreen;

  const PlayerContent = (
    <RNAnimated.View
      style={[
        // Utiliser un style différent si en fullscreen dans Modal
        usingFullscreenStyle ? styles.fullscreenPlayerContent : styles.container,
        {
          opacity: calculatedOpacity,
          // Ne pas appliquer renderPosition/renderSize si fullscreen dans Modal
          ...(usingFullscreenStyle ? {} : renderPosition),
          ...(usingFullscreenStyle ? {} : renderSize),
          borderRadius:
            isFullscreen || localFullscreen
              ? 0
              : isInChannelPlayerScreen && miniPlayerRect
              ? 12
              : 8,
          // 🎯 Z-index et elevation conditionnels
          zIndex: (isFullscreen || localFullscreen) ? 99999 : isInChannelPlayerScreen ? 1 : 1000,
          elevation: (isFullscreen || localFullscreen) ? 999 : isInChannelPlayerScreen ? 0 : 10,
          shadowOpacity: isInChannelPlayerScreen ? 0 : 0.3, // Pas d'ombre dans ChannelPlayerScreen
          backgroundColor: (isFullscreen || localFullscreen) ? '#000000' : 'transparent',
        },
      ]}>


      {/* Video persistante - jamais démontée */}
      {channel ? (
        <Video
          ref={videoRef}
          source={{
            uri: channel.url,
            // 🔧 Headers pour améliorer compatibilité IPTV + Pluto TV
            headers: {
              'User-Agent': channel.url.includes('vodalys.com')
                ? 'VLC/3.0.16 LibVLC/3.0.16'
                : 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
              'Referer': channel.url.includes('pluto.tv')
                ? 'https://pluto.tv/'
                : channel.url.includes('vodalys.com')
                ? 'https://www.assemblee-nationale.fr/'
                : 'https://www.iptvsmarters.com/',
              'Accept': '*/*',
              'Connection': 'keep-alive',
              'Origin': channel.url.includes('pluto.tv') ? 'https://pluto.tv' : undefined,
            }
          }}
          key={`global-video-player-${videoKey}`}
          style={styles.video}
          resizeMode={
            zoomMode === 'fill' ? 'cover' :
            zoomMode === 'fit' ? 'contain' :
            zoomMode === 'stretch' ? 'stretch' :
            'contain'
          }
          paused={isPaused}
          muted={selectedAudioTrack === 0}
          volume={selectedAudioTrack === 0 ? 0 : 1}
          selectedAudioTrack={
            selectedAudioTrack > 0 && availableAudioTracks.length > 0
              ? {
                  type: SelectedTrackType.INDEX,
                  value: selectedAudioTrack - 1,
                }
              : undefined
          }
          selectedVideoTrack={
            selectedVideoQuality !== 'auto' && availableVideoTracks.length > 0
              ? (() => {
                  // Extraire l'index de la piste depuis le trackId (format: "720p-2")
                  const track = availableVideoTracks.find(
                    t => `${t.height}p-${t.index}` === selectedVideoQuality
                  );

                  if (track) {
                    return {
                      type: SelectedVideoTrackType.INDEX,
                      value: track.index,
                    };
                  }
                  // Si la piste n'est pas trouvée, utiliser AUTO
                  return undefined;
                })()
              : undefined
          }
          selectedTextTrack={
            subtitlesEnabled && selectedSubtitleTrack > 0 && availableTextTracks.length > 0
              ? {
                  type: SelectedTrackType.INDEX,
                  value: selectedSubtitleTrack - 1,
                }
              : undefined
          }
          subtitleStyle={{
            fontSize: subtitleSize === 'small' ? 14 :
                      subtitleSize === 'normal' ? 18 :
                      subtitleSize === 'large' ? 24 :
                      subtitleSize === 'xlarge' ? 30 : 18,
            paddingBottom: 10,
            paddingTop: 10,
          }}
          onError={(error) => {
            const errorString = error.error?.errorString || '';
            console.error('❌ [GlobalVideoPlayer] Video Error:', {
              channel: channel.name,
              url: channel.url,
              error: errorString
            });

            // Gestion spéciale de ERROR_CODE_BEHIND_LIVE_WINDOW
            if (errorString.includes('ERROR_CODE_BEHIND_LIVE_WINDOW') || errorString.includes('BEHIND_LIVE_WINDOW')) {
              console.log('🔄 [GlobalVideoPlayer] Rechargement automatique du flux (trop de retard sur le live)');
              // Forcer le rechargement complet du composant Video en changeant sa key
              setVideoKey(prev => prev + 1);
              return; // Ne pas afficher l'erreur à l'utilisateur
            }

            const errorMsg = `${channel.name}: ${errorString || 'Erreur de lecture'}`;
            actions.setError(errorMsg);
          }}
          onLoadStart={() => {
            console.log('🎬 Video LoadStart - Channel:', channel.name);
            if (!channel || isLoading) {
              actions.setLoading(true);
            }
          }}
          onLoad={data => {
            console.log('🎬 Video Load Success - Channel:', channel.name);
            setDuration(data.duration || 0);
            actions.setLoading(false);

            // Si seekTime est défini (venant du multiscreen), reprendre à cette position
            if (channel.seekTime !== undefined && channel.seekTime > 0 && videoRef.current) {
              console.log('⏩ [GlobalVideoPlayer] Reprise depuis multiscreen à position:', channel.seekTime, 's');
              setTimeout(() => {
                videoRef.current?.seek(channel.seekTime);
              }, 100); // Petit délai pour s'assurer que la vidéo est prête
            }

            // Détecter les pistes disponibles
            if (data.videoTracks && data.videoTracks.length > 0) {
              console.log('📹 [Video] Pistes vidéo disponibles:', data.videoTracks);
              setAvailableVideoTracks(data.videoTracks);
            }

            if (data.audioTracks && data.audioTracks.length > 0) {
              console.log('🔊 [Audio] Pistes audio disponibles:', data.audioTracks);
              setAvailableAudioTracks(data.audioTracks);
            }

            if (data.textTracks && data.textTracks.length > 0) {
              console.log('📝 [Subtitles] Pistes sous-titres disponibles:', data.textTracks);
              setAvailableTextTracks(data.textTracks);
            }
          }}
          onProgress={data => {
            setCurrentTime(data.currentTime || 0);
          }}
          onBuffer={({isBuffering}) => {
            // Buffer state changes handled silently
          }}
          playInBackground={false}
          pictureInPicture={false}
          useTextureView={true}
          controls={false}
          ignoreSilentSwitch="ignore"
          playWhenInactive={false}
          bufferConfig={
            bufferMode === 'low'
              ? {
                  // 🚀 Connexion rapide - Buffer faible pour moins de latence
                  minBufferMs: 1500,
                  maxBufferMs: 5000,
                  bufferForPlaybackMs: 1500,
                  bufferForPlaybackAfterRebufferMs: 1500,
                }
              : bufferMode === 'high'
              ? {
                  // 🐢 Connexion lente - Buffer élevé pour éviter coupures
                  minBufferMs: 5000,
                  maxBufferMs: 15000,
                  bufferForPlaybackMs: 5000,
                  bufferForPlaybackAfterRebufferMs: 5000,
                }
              : {
                  // ⚡ Normal - Équilibré (par défaut)
                  minBufferMs: 2500,
                  maxBufferMs: 8000,
                  bufferForPlaybackMs: 2500,
                  bufferForPlaybackAfterRebufferMs: 2500,
                }
          }
          maxBitRate={3000000}
          reportBandwidth={false}
          automaticallyWaitsToMinimizeStalling={false}
          preventsDisplaySleepDuringVideoPlayback={true}
          progressUpdateInterval={2000}
          playWhenInactive={false}
          ignoreSilentSwitch="ignore"
          mixWithOthers="duck"
        />
      ) : null}

      <View style={StyleSheet.absoluteFill}>
        {isLoading && (
          <View style={styles.overlay}>
            <Text style={styles.overlayText}>Chargement...</Text>
          </View>
        )}
        {error && (
          <View
            style={[
              styles.overlay,
              {backgroundColor: 'rgba(200, 50, 50, 0.7)'},
            ]}>
            <Text style={styles.overlayText}>{error}</Text>
          </View>
        )}
        {/* 🎯 ZONES GESTUELLES AVANCÉES - FULLSCREEN UNIQUEMENT */}
        {isFullscreen || localFullscreen ? (
          <>
            {/* Zone gauche - Seek backward */}
            <GestureDetector gesture={leftSideGesture}>
              <View style={styles.gestureZoneLeft} />
            </GestureDetector>

            {/* Zone droite - Seek forward */}
            <GestureDetector gesture={rightSideGesture}>
              <View style={styles.gestureZoneRight} />
            </GestureDetector>

            {/* Zone centrale - Afficher bouton play/pause */}
            <GestureDetector gesture={centerTapGesture}>
              <View style={styles.gestureZoneCenter} />
            </GestureDetector>

            {/* 🎯 CONTRÔLES TIVIMATE */}
            <Animated.View
              style={[
                styles.controlsOverlay,
                controlsAnimatedStyle,
                {
                  pointerEvents: showControls ? 'auto' : 'none',
                },
              ]}>
              {showControls && (
                <>
                  {/* Header TiviMate: Bouton retour + Info chaîne + Paramètres */}
                  <LinearGradient
                    colors={['rgba(0, 0, 0, 0.8)', 'rgba(0, 0, 0, 0)']}
                    start={{x: 0, y: 0}}
                    end={{x: 0, y: 1}}
                    style={styles.tiviMateHeader}>
                    <TouchableOpacity
                      style={styles.backButtonModern}
                      onPress={() => {
                        if (localFullscreen) {
                          setLocalFullscreen(false);
                          return;
                        }

                        // 🎯 CAS SPÉCIAL: Si vient du multi-écran, revenir au multi-écran
                        if (isFromMultiScreen) {
                          console.log('🔙 [On-screen Back] From multi-screen, reopening multi-screen...');
                          actions.setFullscreen(false);
                          actions.setFromMultiScreen(false);
                          actions.setMultiScreenOpen(true);
                          setMultiScreenVisible(true);
                          return;
                        }

                        // 🎯 COMPORTEMENT NORMAL: Navigation vers ChannelPlayerScreen
                        if (navigationData && channel) {
                          console.log('🔙 [On-screen Back] NavigationData found, redirecting with NAVIGATE...');
                          actions.setFullscreen(false);
                          navigation.navigate('ChannelPlayer', {
                            ...navigationData,
                            selectedChannel: channel,
                          });
                          actions.setNavigationData(null);
                        } else {
                          console.log('🔙 [On-screen Back] No NavigationData, default behavior.');
                          actions.setFullscreen(false);
                        }
                      }}
                      activeOpacity={0.7}>
                      <View style={styles.backIconContainer}>
                        <Icon name="arrow-back" size={24} color="white" />
                      </View>
                    </TouchableOpacity>

                    <View style={styles.headerChannelInfo}>
                      {channel?.category && (
                        <Text style={styles.headerChannelCategory}>
                          {channel.category.toUpperCase()}
                        </Text>
                      )}
                    </View>

                    <View style={styles.headerRightButtons}>
                      {/* Bouton Multi-écran - Désactivé si on vient du multiscreen */}
                      {!isFromMultiScreen && (
                        <TouchableOpacity
                          style={styles.headerIconButton}
                          onPress={() => {
                            actions.setMultiScreenOpen(true);
                            setMultiScreenVisible(true);
                            console.log('🖥️ [MultiScreen] Ouverture du sélecteur multi-écrans');
                          }}
                          activeOpacity={0.7}>
                          <Icon name="grid-on" size={22} color="white" />
                        </TouchableOpacity>
                      )}

                      {/* Bouton Cast - Désactivé si on vient du multiscreen */}
                      {!isFromMultiScreen && (
                        <TouchableOpacity
                          style={styles.headerIconButton}
                          onPress={() => {
                            console.log('🎥 [Cast] Bouton Cast pressé');
                            // TODO: Implémenter la fonctionnalité Cast
                          }}
                          activeOpacity={0.7}>
                          <Icon name="cast" size={22} color="white" />
                        </TouchableOpacity>
                      )}

                      {/* Bouton Verrouillage */}
                      <TouchableOpacity
                        style={styles.headerIconButton}
                        onPress={() => {
                          setIsScreenLocked(!isScreenLocked);
                          console.log('🔒 [Lock] Écran', isScreenLocked ? 'déverrouillé' : 'verrouillé');
                        }}
                        activeOpacity={0.7}>
                        <Icon name={isScreenLocked ? 'lock' : 'lock-open'} size={22} color="white" />
                      </TouchableOpacity>

                      {/* Bouton Paramètres */}
                      <TouchableOpacity
                        style={styles.settingsButton}
                        onPress={() => {
                          setShowSettingsMenu(!showSettingsMenu);
                          settingsMenuOpacity.value = withTiming(
                            showSettingsMenu ? 0 : 1,
                            {duration: 200}
                          );
                        }}
                        activeOpacity={0.7}>
                        <View style={styles.settingsIconContainer}>
                          <Icon name="settings" size={24} color="white" />
                        </View>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>

                  {/* Center: Bouton Play/Pause TiviMate style */}
                  <View style={styles.centerControls}>
                    <TouchableOpacity
                      onPress={() => actions.togglePlayPause()}
                      activeOpacity={0.7}>
                      <LinearGradient
                        colors={['rgba(0, 0, 0, 0.2)', 'rgba(0, 0, 0, 0.8)']}
                        start={{x: 0, y: 0}}
                        end={{x: 0, y: 1}}
                        style={styles.playPauseButtonTivi}>
                        <Icon
                          name={isPaused ? 'play-arrow' : 'pause'}
                          size={32}
                          color="white"
                        />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>

                  {/* Footer: Timeline supprimée - utilisée seulement la barre EPG principale */}
                </>
              )}
            </Animated.View>

            {/* 🎯 DOCKER TIVIMATE AUTHENTIQUE - Copié depuis VideoPlayerSimple.tsx */}
            <Animated.View
              style={[
                styles.dockerOverlay,
                dockerAnimatedStyle,
                {
                  pointerEvents: showDocker ? 'auto' : 'none',
                },
              ]}>
              {showDocker && !isFromMultiScreen && (
                <LinearGradient
                  colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.95)']}
                  start={{x: 0, y: 0}}
                  end={{x: 0, y: 1}}
                  style={styles.dockerGradient}>
                  {/* InfoBar avec EPG */}
                  <View style={styles.infoBar}>
                    {channel?.logo && (
                      <FastImage
                        source={{uri: channel.logo}}
                        style={styles.infoBarLogo}
                        resizeMode={FastImage.resizeMode.contain}
                        onError={() =>
                          console.log(
                            '❌ [DEBUG] Logo failed to load:',
                            channel.logo,
                          )
                        }
                        onLoad={() =>
                          console.log(
                            '✅ [DEBUG] Logo loaded successfully:',
                            channel.logo,
                          )
                        }
                      />
                    )}
                    <View style={styles.infoBarDetails}>
                      <Text
                        style={styles.infoBarProgramTitle}
                        numberOfLines={1}>
                        {epgData?.currentProgram?.title || "Pas d'information"}
                      </Text>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginVertical: 4,
                        }}>
                        <Text style={styles.infoBarProgramTime}>
                          {epgData
                            ? `${epgData.programStartTime} - ${epgData.programEndTime}`
                            : "Pas d'information"}
                        </Text>
                        {epgData && (
                          <Text style={styles.infoBarRemainingTime}>
                            {epgData.remainingMinutes} min
                          </Text>
                        )}
                      </View>
                      <Text style={styles.infoBarNextProgram} numberOfLines={1}>
                        À suivre:{' '}
                        {epgData?.nextProgram?.title || "Pas d'information"}
                      </Text>
                    </View>
                    <View style={styles.infoBarChannel}>
                      <View style={styles.qualityBadges}>
                        <View style={styles.qualityBadge}>
                          <Text style={styles.badgeText}>
                            {getChannelQuality(channel)}
                          </Text>
                        </View>
                        <View style={styles.qualityBadge}>
                          <Text style={styles.badgeText}>
                            {getChannelFPS(channel)}
                          </Text>
                        </View>
                        <View style={styles.qualityBadge}>
                          <Text style={styles.badgeText}>
                            {getChannelAudio(channel)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Barre de progression principale EPG/Vidéo dynamique */}
                  <View style={styles.mainProgressBarContainer}>
                    <View
                      style={[
                        styles.mainProgressBarFill,
                        {
                          width: `${(() => {
                            // Priorité 1: EPG si disponible et valide
                            if (epgData && epgData.progressPercentage >= 0) {
                              return Math.min(
                                100,
                                Math.max(0, epgData.progressPercentage),
                              );
                            }
                            // Priorité 2: Progression vidéo temps réel
                            if (duration > 0 && currentTime >= 0) {
                              return Math.min(
                                100,
                                Math.max(0, (currentTime / duration) * 100),
                              );
                            }
                            // Fallback: 0%
                            return 0;
                          })()}%`,
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.mainProgressHandle,
                        {
                          left: `${(() => {
                            // Même logique que la barre de progression
                            if (epgData && epgData.progressPercentage >= 0) {
                              return Math.min(
                                100,
                                Math.max(0, epgData.progressPercentage),
                              );
                            }
                            if (duration > 0 && currentTime >= 0) {
                              return Math.min(
                                100,
                                Math.max(0, (currentTime / duration) * 100),
                              );
                            }
                            return 0;
                          })()}%`,
                        },
                      ]}
                    />
                  </View>

                  {/* Docker avec boutons et chaînes récentes */}
                  <View style={styles.dockerContent}>
                    <TouchableOpacity
                      style={styles.recentChannelItem}
                      onPress={() => console.log('Guide TV')}>
                      <View style={styles.recentChannelPreview}>
                        <Icon name="apps" size={22} color="#fff" />
                        <Text style={styles.dockerButtonTextModern}>
                          Guide TV
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.recentChannelItem}
                      onPress={() => console.log('Historique')}>
                      <View style={styles.recentChannelPreview}>
                        <Icon name="history" size={22} color="#fff" />
                        <Text style={styles.dockerButtonTextModern}>
                          Historique
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.recentChannelsScroll}
                      contentContainerStyle={styles.recentChannelsContent}
                      onScrollBeginDrag={() => {
                        console.log(
                          '🏃‍♂️ [Scroll] Début du scroll - prolonger délai',
                        );
                        setIsScrolling(true);
                      }}
                      onScrollEndDrag={() => {
                        console.log('⏸️ [Scroll] Fin du scroll - délai normal');
                        // Petit délai avant de remettre à false pour éviter le flickering
                        setTimeout(() => {
                          setIsScrolling(false);
                        }, 1000);
                      }}>
                      {recentChannels.map((recentChannel, index) => (
                        <TouchableOpacity
                          key={recentChannel.id || `mock-${index}`}
                          style={styles.recentChannelItem}
                          onPress={() => {
                            console.log(
                              '🔄 [DEBUG] Switching to recent channel:',
                              recentChannel.name,
                            );
                            if (recentChannel.url) {
                              // Convertir vers Channel si nécessaire
                              const channelToPlay = {
                                id: recentChannel.id,
                                name: recentChannel.name,
                                url: recentChannel.url,
                                logo: recentChannel.logo,
                                category: recentChannel.category,
                              };
                              actions.playChannel(channelToPlay, true); // Lancer en fullscreen direct
                            } else {
                              console.warn(
                                '⚠️ [DEBUG] Recent channel has no URL:',
                                recentChannel,
                              );
                            }
                          }}>
                          <View style={styles.recentChannelPreview}>
                            {recentChannel.logo ? (
                              <FastImage
                                source={{uri: recentChannel.logo}}
                                style={styles.recentChannelLogo}
                                resizeMode={FastImage.resizeMode.contain}
                                onError={(error: any) => {
                                  console.log(
                                    '❌ [DOCKER] Logo failed to load:',
                                    {
                                      channel: recentChannel.name,
                                      logoUrl: recentChannel.logo,
                                      error: error?.nativeEvent,
                                    },
                                  );
                                }}
                                onLoad={() => {
                                  console.log('✅ [DOCKER] Logo loaded:', {
                                    channel: recentChannel.name,
                                    logoUrl: recentChannel.logo,
                                  });
                                }}
                                onLoadStart={() => {
                                  console.log(
                                    '🔄 [DOCKER] Logo loading started:',
                                    recentChannel.name,
                                  );
                                }}
                              />
                            ) : (
                              <View style={styles.logoFallback}>
                                <Text style={styles.logoFallbackText}>
                                  {recentChannel.name.substring(0, 2)}
                                </Text>
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </LinearGradient>
              )}
            </Animated.View>

            {/* 🎯 EFFET DE VAGUE (RIPPLE) POUR DOUBLE-CLICS */}
            {rippleVisible && (
              <Animated.View
                style={[
                  styles.rippleEffect,
                  rippleAnimatedStyle,
                  {
                    left: ripplePosition.x - 50, // Centrer le cercle
                    top: ripplePosition.y - 50,
                  },
                ]}
              />
            )}

            {/* 🎯 FEEDBACK VISUEL SEEK - Style YouTube */}
            {seekFeedback.visible && (
              <Animated.View
                style={[
                  styles.seekFeedbackContainer,
                  seekFeedbackAnimatedStyle,
                  {
                    left:
                      seekFeedback.direction === 'backward' ? '20%' : undefined,
                    right:
                      seekFeedback.direction === 'forward' ? '20%' : undefined,
                  },
                ]}>
                <Icon
                  name={
                    seekFeedback.direction === 'forward'
                      ? 'fast-forward'
                      : 'fast-rewind'
                  }
                  size={32}
                  color="white"
                  style={{marginBottom: 8}}
                />
                <Text style={styles.seekFeedbackText}>
                  {seekFeedback.direction === 'forward' ? '+' : '-'}
                  {seekFeedback.seconds}s
                </Text>
              </Animated.View>
            )}

            {/* 🎯 MENU PARAMÈTRES - Indépendant, au-dessus de tout */}
            {showSettingsMenu && (
              <>
                {/* Fond transparent pour fermer le menu en cliquant en dehors */}
                <TouchableOpacity
                  style={styles.settingsBackdrop}
                  activeOpacity={1}
                  onPress={() => {
                    setShowSettingsMenu(false);
                    setActiveSubMenu(null);
                  }}
                />

                <Animated.View
                  style={[
                    styles.settingsMenu,
                    settingsMenuAnimatedStyle,
                  ]}
                  pointerEvents="auto">
                  <ScrollView
                    style={{maxHeight: 400}}
                    showsVerticalScrollIndicator={false}>
                    <TouchableOpacity
                      style={styles.settingsMenuItem}
                      onPress={() => openSubMenu('video')}>
                    <Icon name="video-settings" size={22} color="white" />
                    <Text style={styles.settingsMenuText}>Piste vidéo</Text>
                    <Icon name="chevron-left" size={20} color="white" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.settingsMenuItem}
                    onPress={() => openSubMenu('audio')}>
                    <Icon name="surround-sound" size={22} color="white" />
                    <Text style={styles.settingsMenuText}>Piste audio</Text>
                    <Icon name="chevron-left" size={20} color="white" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.settingsMenuItem}
                    onPress={() => openSubMenu('subtitles')}>
                    <Icon name="subtitles" size={22} color="white" />
                    <Text style={styles.settingsMenuText}>Sous-titres</Text>
                    <Icon name="chevron-left" size={20} color="white" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.settingsMenuItem}
                    onPress={() => openSubMenu('display')}>
                    <Icon name="fit-screen" size={22} color="white" />
                    <Text style={styles.settingsMenuText}>Mode d'affichage</Text>
                    <Icon name="chevron-left" size={20} color="white" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.settingsMenuItem}
                    onPress={() => openSubMenu('buffer')}>
                    <Icon name="settings-ethernet" size={22} color="white" />
                    <Text style={styles.settingsMenuText}>Contrôle du buffer</Text>
                    <Text style={styles.settingsMenuActiveText}>
                      {bufferMode === 'low' ? 'Rapide' : bufferMode === 'high' ? 'Lent' : 'Normal'}
                    </Text>
                    <Icon name="chevron-left" size={20} color="white" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.settingsMenuItem}
                    onPress={() => openSubMenu('sleeptimer')}>
                    <Icon name="schedule" size={22} color="white" />
                    <Text style={styles.settingsMenuText}>Minuterie de sommeil</Text>
                    {sleepTimer && (
                      <Text style={styles.settingsMenuActiveText}>
                        {sleepTimer} min
                      </Text>
                    )}
                    <Icon name="chevron-left" size={20} color="white" />
                  </TouchableOpacity>

                </ScrollView>
              </Animated.View>
              </>
            )}

            {/* 🎯 SOUS-MENU ENFANT - À gauche du menu principal */}
            {activeSubMenu && (
              <Animated.View
                style={[
                  styles.subMenuWindow,
                  subMenuAnimatedStyle,
                ]}
                pointerEvents="auto">
                <View style={styles.subMenuHeader}>
                  <TouchableOpacity onPress={closeSubMenu} style={styles.backButton}>
                    <Icon name="chevron-right" size={24} color="white" />
                  </TouchableOpacity>
                  <Text style={styles.subMenuTitle}>
                    {activeSubMenu === 'video' && 'Piste vidéo'}
                    {activeSubMenu === 'audio' && 'Piste audio'}
                    {activeSubMenu === 'subtitles' && 'Sous-titres'}
                    {activeSubMenu === 'display' && "Mode d'affichage"}
                    {activeSubMenu === 'buffer' && 'Contrôle du buffer'}
                    {activeSubMenu === 'sleeptimer' && 'Minuterie de sommeil'}
                  </Text>
                </View>

                <ScrollView style={{maxHeight: 350}} showsVerticalScrollIndicator={false}>
                  {/* Contenu pour Minuterie de sommeil */}
                  {activeSubMenu === 'sleeptimer' && (
                    <View>
                      <TouchableOpacity
                        style={[styles.subMenuItem, sleepTimer === null && styles.subMenuItemActive]}
                        onPress={() => {
                          setSleepTimerDuration(null);
                          closeSubMenu();
                        }}>
                        <Text style={styles.subMenuText}>Désactivé</Text>
                        {sleepTimer === null && <Icon name="check" size={18} color="#1976d2" />}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.subMenuItem, sleepTimer === 10 && styles.subMenuItemActive]}
                        onPress={() => {
                          setSleepTimerDuration(10);
                          closeSubMenu();
                        }}>
                        <Text style={styles.subMenuText}>10 minutes</Text>
                        {sleepTimer === 10 && <Icon name="check" size={18} color="#1976d2" />}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.subMenuItem, sleepTimer === 15 && styles.subMenuItemActive]}
                        onPress={() => {
                          setSleepTimerDuration(15);
                          closeSubMenu();
                        }}>
                        <Text style={styles.subMenuText}>15 minutes</Text>
                        {sleepTimer === 15 && <Icon name="check" size={18} color="#1976d2" />}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.subMenuItem, sleepTimer === 20 && styles.subMenuItemActive]}
                        onPress={() => {
                          setSleepTimerDuration(20);
                          closeSubMenu();
                        }}>
                        <Text style={styles.subMenuText}>20 minutes</Text>
                        {sleepTimer === 20 && <Icon name="check" size={18} color="#1976d2" />}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.subMenuItem, sleepTimer === 30 && styles.subMenuItemActive]}
                        onPress={() => {
                          setSleepTimerDuration(30);
                          closeSubMenu();
                        }}>
                        <Text style={styles.subMenuText}>30 minutes</Text>
                        {sleepTimer === 30 && <Icon name="check" size={18} color="#1976d2" />}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.subMenuItem, sleepTimer === 45 && styles.subMenuItemActive]}
                        onPress={() => {
                          setSleepTimerDuration(45);
                          closeSubMenu();
                        }}>
                        <Text style={styles.subMenuText}>45 minutes</Text>
                        {sleepTimer === 45 && <Icon name="check" size={18} color="#1976d2" />}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.subMenuItem, sleepTimer === 60 && styles.subMenuItemActive]}
                        onPress={() => {
                          setSleepTimerDuration(60);
                          closeSubMenu();
                        }}>
                        <Text style={styles.subMenuText}>60 minutes</Text>
                        {sleepTimer === 60 && <Icon name="check" size={18} color="#1976d2" />}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.subMenuItem, sleepTimer === 90 && styles.subMenuItemActive]}
                        onPress={() => {
                          setSleepTimerDuration(90);
                          closeSubMenu();
                        }}>
                        <Text style={styles.subMenuText}>90 minutes</Text>
                        {sleepTimer === 90 && <Icon name="check" size={18} color="#1976d2" />}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.subMenuItem, sleepTimer === 120 && styles.subMenuItemActive]}
                        onPress={() => {
                          setSleepTimerDuration(120);
                          closeSubMenu();
                        }}>
                        <Text style={styles.subMenuText}>120 minutes</Text>
                        {sleepTimer === 120 && <Icon name="check" size={18} color="#1976d2" />}
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Piste vidéo */}
                  {activeSubMenu === 'video' && (
                    <View>
                      <View style={styles.subMenuSection}>
                        <Text style={styles.subMenuSectionTitle}>
                          Qualité vidéo {availableVideoTracks.length > 0 && `(${availableVideoTracks.length} disponibles)`}
                        </Text>

                        {/* Option Automatique */}
                        <TouchableOpacity
                          style={[styles.subMenuItem, selectedVideoQuality === 'auto' && styles.subMenuItemActive]}
                          onPress={() => {
                            setSelectedVideoQuality('auto');
                            console.log('📹 [Video] ✅ Qualité changée: Automatique');
                          }}>
                          <Text style={styles.subMenuText}>Automatique (Adaptative)</Text>
                          {selectedVideoQuality === 'auto' && <Icon name="check" size={18} color="#1976d2" />}
                        </TouchableOpacity>

                        {/* Pistes vidéo détectées */}
                        {availableVideoTracks.length > 0 ? (
                          availableVideoTracks
                            .sort((a, b) => (b.height * b.width * b.bitrate) - (a.height * a.width * a.bitrate))
                            .map((track) => {
                              const resolution = `${track.height}p`;
                              const bitrateKbps = Math.round(track.bitrate / 1000);
                              const quality = track.height >= 1080 ? 'Full HD' :
                                            track.height >= 720 ? 'HD' :
                                            track.height >= 480 ? 'SD' : 'Basse';
                              const trackId = `${track.height}p-${track.index}`;

                              return (
                                <TouchableOpacity
                                  key={track.index}
                                  style={[styles.subMenuItem, selectedVideoQuality === trackId && styles.subMenuItemActive]}
                                  onPress={() => {
                                    setSelectedVideoQuality(trackId);
                                    console.log(`📹 [Video] ✅ Qualité changée: ${resolution} (${quality}) - ${bitrateKbps} kbps`);
                                  }}>
                                  <View>
                                    <Text style={styles.subMenuText}>
                                      {resolution} ({quality})
                                    </Text>
                                    <Text style={[styles.subMenuText, {fontSize: 11, color: '#999', marginTop: 2}]}>
                                      {track.width}x{track.height} • {bitrateKbps} kbps
                                    </Text>
                                  </View>
                                  {selectedVideoQuality === trackId && <Icon name="check" size={18} color="#1976d2" />}
                                </TouchableOpacity>
                              );
                            })
                        ) : (
                          <View style={styles.subMenuItem}>
                            <Text style={[styles.subMenuText, {color: '#888'}]}>
                              Aucune piste vidéo détectée
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}

                  {activeSubMenu === 'audio' && (
                    <View>
                      {/* Liste des pistes audio */}
                      <View style={styles.subMenuSection}>
                        <Text style={styles.subMenuSectionTitle}>
                          Pistes audio {availableAudioTracks.length > 0 && `(${availableAudioTracks.length} disponibles)`}
                        </Text>

                        <TouchableOpacity
                          style={[styles.subMenuItem, selectedAudioTrack === 0 && styles.subMenuItemActive]}
                          onPress={() => {
                            setSelectedAudioTrack(0);
                            console.log('🔊 [Audio] Piste audio désactivée');
                          }}>
                          <Text style={styles.subMenuText}>Désactivé (Muet)</Text>
                          {selectedAudioTrack === 0 && <Icon name="check" size={18} color="#1976d2" />}
                        </TouchableOpacity>

                        {availableAudioTracks.length > 0 ? (
                          availableAudioTracks.map((track, index) => {
                            const displayTitle = track.title ||
                                                (track.language === 'fr' ? 'Français' :
                                                 track.language === 'en' ? 'Anglais' :
                                                 track.language === 'qaa' ? 'Audio original' :
                                                 track.language === 'qad' ? 'Audiodescription' :
                                                 track.language || 'Inconnu');

                            return (
                              <TouchableOpacity
                                key={track.index}
                                style={[styles.subMenuItem, selectedAudioTrack === index + 1 && styles.subMenuItemActive]}
                                onPress={() => {
                                  setSelectedAudioTrack(index + 1);
                                  console.log(`🔊 [Audio] Piste ${index + 1} sélectionnée:`, {
                                    title: track.title,
                                    language: track.language,
                                    type: track.type,
                                    index: track.index
                                  });
                                }}>
                                <Text style={styles.subMenuText}>
                                  {displayTitle}
                                </Text>
                                {selectedAudioTrack === index + 1 && <Icon name="check" size={18} color="#1976d2" />}
                              </TouchableOpacity>
                            );
                          })
                        ) : (
                          <View style={styles.subMenuItem}>
                            <Text style={[styles.subMenuText, {color: '#888'}]}>
                              Aucune piste audio détectée
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Délai audio */}
                      <View style={styles.subMenuSection}>
                        <Text style={styles.subMenuSectionTitle}>Délai audio</Text>
                        <View style={styles.audioDelayContainer}>
                          <TouchableOpacity
                            style={styles.audioDelayButton}
                            onPress={() => {
                              const newDelay = audioDelay - 50;
                              setAudioDelay(newDelay);
                              console.log(`🔊 [Audio] Délai: ${newDelay}ms`);
                            }}>
                            <Icon name="remove" size={24} color="white" />
                          </TouchableOpacity>

                          <Text style={styles.audioDelayText}>
                            {audioDelay > 0 ? `+${audioDelay}` : audioDelay} ms
                          </Text>

                          <TouchableOpacity
                            style={styles.audioDelayButton}
                            onPress={() => {
                              const newDelay = audioDelay + 50;
                              setAudioDelay(newDelay);
                              console.log(`🔊 [Audio] Délai: ${newDelay}ms`);
                            }}>
                            <Icon name="add" size={24} color="white" />
                          </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                          style={styles.resetButton}
                          onPress={() => {
                            setAudioDelay(0);
                            console.log('🔊 [Audio] Délai réinitialisé');
                          }}>
                          <Icon name="refresh" size={18} color="white" />
                          <Text style={styles.resetButtonText}>Réinitialiser</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {activeSubMenu === 'subtitles' && (
                    <View>
                      {/* Activation sous-titres */}
                      <View style={styles.subMenuSection}>
                        <Text style={styles.subMenuSectionTitle}>Activer les sous-titres</Text>

                        <TouchableOpacity
                          style={[styles.subMenuItem, !subtitlesEnabled && styles.subMenuItemActive]}
                          onPress={() => {
                            setSubtitlesEnabled(false);
                            console.log('📝 [Subtitles] Sous-titres désactivés');
                          }}>
                          <Text style={styles.subMenuText}>Désactivé</Text>
                          {!subtitlesEnabled && <Icon name="check" size={18} color="#1976d2" />}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.subMenuItem, subtitlesEnabled && styles.subMenuItemActive]}
                          onPress={() => {
                            setSubtitlesEnabled(true);
                            console.log('📝 [Subtitles] Sous-titres activés');
                          }}>
                          <Text style={styles.subMenuText}>Activé</Text>
                          {subtitlesEnabled && <Icon name="check" size={18} color="#1976d2" />}
                        </TouchableOpacity>
                      </View>

                      {/* Piste sous-titres */}
                      {subtitlesEnabled && (
                        <View style={styles.subMenuSection}>
                          <Text style={styles.subMenuSectionTitle}>
                            Piste de sous-titres {availableTextTracks.length > 0 && `(${availableTextTracks.length} disponibles)`}
                          </Text>

                          {availableTextTracks.length > 0 ? (
                            availableTextTracks.map((track, index) => {
                              const displayTitle = track.title ||
                                                  (track.language === 'fr' || track.language === 'fra' ? 'Français' :
                                                   track.language === 'en' || track.language === 'eng' ? 'Anglais' :
                                                   track.language === 'es' || track.language === 'spa' ? 'Espagnol' :
                                                   track.language === 'de' || track.language === 'deu' ? 'Allemand' :
                                                   track.language === 'it' || track.language === 'ita' ? 'Italien' :
                                                   track.language || 'Inconnu');

                              return (
                                <TouchableOpacity
                                  key={track.index || index}
                                  style={[styles.subMenuItem, selectedSubtitleTrack === index + 1 && styles.subMenuItemActive]}
                                  onPress={() => {
                                    setSelectedSubtitleTrack(index + 1);
                                    console.log(`📝 [Subtitles] Piste ${index + 1} sélectionnée:`, {
                                      title: track.title,
                                      language: track.language,
                                      index: track.index
                                    });
                                  }}>
                                  <Text style={styles.subMenuText}>
                                    {displayTitle}
                                  </Text>
                                  {selectedSubtitleTrack === index + 1 && <Icon name="check" size={18} color="#1976d2" />}
                                </TouchableOpacity>
                              );
                            })
                          ) : (
                            <View style={styles.subMenuItem}>
                              <Text style={[styles.subMenuText, {color: '#888'}]}>
                                Aucune piste de sous-titres détectée
                              </Text>
                            </View>
                          )}
                        </View>
                      )}

                      {/* Taille sous-titres */}
                      {subtitlesEnabled && (
                        <View style={styles.subMenuSection}>
                          <Text style={styles.subMenuSectionTitle}>Taille des sous-titres</Text>

                          <TouchableOpacity
                            style={[styles.subMenuItem, subtitleSize === 'small' && styles.subMenuItemActive]}
                            onPress={() => {
                              setSubtitleSize('small');
                              console.log('📝 [Subtitles] Taille: Petit');
                            }}>
                            <Text style={styles.subMenuText}>Petit</Text>
                            {subtitleSize === 'small' && <Icon name="check" size={18} color="#1976d2" />}
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.subMenuItem, subtitleSize === 'normal' && styles.subMenuItemActive]}
                            onPress={() => {
                              setSubtitleSize('normal');
                              console.log('📝 [Subtitles] Taille: Normal');
                            }}>
                            <Text style={styles.subMenuText}>Normal</Text>
                            {subtitleSize === 'normal' && <Icon name="check" size={18} color="#1976d2" />}
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.subMenuItem, subtitleSize === 'large' && styles.subMenuItemActive]}
                            onPress={() => {
                              setSubtitleSize('large');
                              console.log('📝 [Subtitles] Taille: Grand');
                            }}>
                            <Text style={styles.subMenuText}>Grand</Text>
                            {subtitleSize === 'large' && <Icon name="check" size={18} color="#1976d2" />}
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.subMenuItem, subtitleSize === 'xlarge' && styles.subMenuItemActive]}
                            onPress={() => {
                              setSubtitleSize('xlarge');
                              console.log('📝 [Subtitles] Taille: Très grand');
                            }}>
                            <Text style={styles.subMenuText}>Très grand</Text>
                            {subtitleSize === 'xlarge' && <Icon name="check" size={18} color="#1976d2" />}
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* Délai sous-titres */}
                      {subtitlesEnabled && (
                        <View style={styles.subMenuSection}>
                          <Text style={styles.subMenuSectionTitle}>Délai sous-titres</Text>
                          <View style={styles.audioDelayContainer}>
                            <TouchableOpacity
                              style={styles.audioDelayButton}
                              onPress={() => {
                                const newDelay = subtitleDelay - 50;
                                setSubtitleDelay(newDelay);
                                console.log(`📝 [Subtitles] Délai: ${newDelay}ms`);
                              }}>
                              <Icon name="remove" size={24} color="white" />
                            </TouchableOpacity>

                            <Text style={styles.audioDelayText}>
                              {subtitleDelay > 0 ? `+${subtitleDelay}` : subtitleDelay} ms
                            </Text>

                            <TouchableOpacity
                              style={styles.audioDelayButton}
                              onPress={() => {
                                const newDelay = subtitleDelay + 50;
                                setSubtitleDelay(newDelay);
                                console.log(`📝 [Subtitles] Délai: ${newDelay}ms`);
                              }}>
                              <Icon name="add" size={24} color="white" />
                            </TouchableOpacity>
                          </View>

                          <TouchableOpacity
                            style={styles.resetButton}
                            onPress={() => {
                              setSubtitleDelay(0);
                              console.log('📝 [Subtitles] Délai réinitialisé');
                            }}>
                            <Icon name="refresh" size={18} color="white" />
                            <Text style={styles.resetButtonText}>Réinitialiser</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Contrôle du buffer */}
                  {activeSubMenu === 'buffer' && (
                    <View>
                      <View style={styles.subMenuSection}>
                        <Text style={styles.subMenuSectionTitle}>Qualité de connexion</Text>

                        <TouchableOpacity
                          style={[styles.subMenuItem, bufferMode === 'normal' && styles.subMenuItemActive]}
                          onPress={() => {
                            setBufferMode('normal');
                            console.log('📡 [Buffer] Mode: Normal (équilibré)');
                          }}>
                          <Icon name="bolt" size={22} color="#FFC107" style={{marginRight: 12}} />
                          <View style={{flex: 1}}>
                            <Text style={styles.subMenuText}>Normal</Text>
                            <Text style={[styles.subMenuText, {fontSize: 11, color: '#999', marginTop: 2}]}>
                              Buffer équilibré (2.5-8s)
                            </Text>
                          </View>
                          {bufferMode === 'normal' && <Icon name="check" size={18} color="#1976d2" />}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.subMenuItem, bufferMode === 'low' && styles.subMenuItemActive]}
                          onPress={() => {
                            setBufferMode('low');
                            console.log('📡 [Buffer] Mode: Rapide (faible latence)');
                          }}>
                          <Icon name="speed" size={22} color="#4CAF50" style={{marginRight: 12}} />
                          <View style={{flex: 1}}>
                            <Text style={styles.subMenuText}>Connexion rapide</Text>
                            <Text style={[styles.subMenuText, {fontSize: 11, color: '#999', marginTop: 2}]}>
                              Buffer faible (1.5-5s) - Moins de latence
                            </Text>
                          </View>
                          {bufferMode === 'low' && <Icon name="check" size={18} color="#1976d2" />}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.subMenuItem, bufferMode === 'high' && styles.subMenuItemActive]}
                          onPress={() => {
                            setBufferMode('high');
                            console.log('📡 [Buffer] Mode: Lent (haute stabilité)');
                          }}>
                          <Icon name="signal-cellular-alt" size={22} color="#FF5722" style={{marginRight: 12}} />
                          <View style={{flex: 1}}>
                            <Text style={styles.subMenuText}>Connexion lente</Text>
                            <Text style={[styles.subMenuText, {fontSize: 11, color: '#999', marginTop: 2}]}>
                              Buffer élevé (5-15s) - Moins de coupures
                            </Text>
                          </View>
                          {bufferMode === 'high' && <Icon name="check" size={18} color="#1976d2" />}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {activeSubMenu === 'display' && (
                    <View>
                      {/* Mode d'affichage */}
                      <View style={styles.subMenuSection}>
                        <Text style={styles.subMenuSectionTitle}>Mode d'affichage</Text>

                        <TouchableOpacity
                          style={[styles.subMenuItem, zoomMode === 'fit' && styles.subMenuItemActive]}
                          onPress={() => {
                            setZoomMode('fit');
                            console.log('📐 [Display] Mode: Ajuster');
                          }}>
                          <Text style={styles.subMenuText}>Ajuster</Text>
                          {zoomMode === 'fit' && <Icon name="check" size={18} color="#1976d2" />}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.subMenuItem, zoomMode === 'fill' && styles.subMenuItemActive]}
                          onPress={() => {
                            setZoomMode('fill');
                            console.log('📐 [Display] Mode: Remplir');
                          }}>
                          <Text style={styles.subMenuText}>Remplir</Text>
                          {zoomMode === 'fill' && <Icon name="check" size={18} color="#1976d2" />}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.subMenuItem, zoomMode === 'stretch' && styles.subMenuItemActive]}
                          onPress={() => {
                            setZoomMode('stretch');
                            console.log('📐 [Display] Mode: Étirer');
                          }}>
                          <Text style={styles.subMenuText}>Étirer</Text>
                          {zoomMode === 'stretch' && <Icon name="check" size={18} color="#1976d2" />}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </ScrollView>
              </Animated.View>
            )}
          </>
        ) : (
          /* 🎯 TOUCHABLE CLASSIQUE - MODES MINI/PIP */
          <TouchableOpacity
            style={styles.touchableOverlay}
            onPress={() => {
              if (!isInChannelPlayerScreen && !localFullscreen) {
                showPipButtonsTemporarily();
              } else if (!isInChannelPlayerScreen && localFullscreen) {
                // En fullscreen local : ne rien faire (gestes gérent déjà)
              } else {
                actions.setFullscreen(!isFullscreen);
              }
            }}
            onLongPress={actions.togglePlayPause}
            activeOpacity={0.7}>
            {/* Boutons PiP - seulement visible quand PiP draggable */}
            {!isInChannelPlayerScreen &&
              !isFullscreen &&
              !localFullscreen &&
              showPipButtons && (
                <RNAnimated.View style={{opacity: pipButtonsOpacity}}>
                  {/* Bouton resize PiP (comme IPTV Smarters Pro) */}
                  <TouchableOpacity
                    style={styles.pipResizeButton}
                    onPress={toggleResize}
                    hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                    <Icon name="zoom-out-map" size={17} color="white" />
                  </TouchableOpacity>

                {/* Bouton fermer PiP */}
                  <TouchableOpacity
                    style={styles.pipCloseButton}
                    onPress={() => actions.stop()}
                    hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                    <Icon name="close" size={18} color="white" />
                  </TouchableOpacity>
                </RNAnimated.View>
              )}
          </TouchableOpacity>
        )}
      </View>
    </RNAnimated.View>
  );

  // Toujours afficher le MultiScreenView quand visible
  const renderMultiScreen = multiScreenVisible ? (
    <MultiScreenView
      visible={multiScreenVisible}
      onClose={() => {
        setMultiScreenVisible(false);
        actions.setMultiScreenOpen(false);
        // Le lecteur reste actif mais ne doit pas être en PiP flottant
      }}
      channels={allChannelsForMultiScreen}
      isLoadingChannels={isLoadingChannels}
      currentChannel={channel}
      initialLayout={multiScreenLayout}
      initialSlots={multiScreenSlots}
      initialActiveSlot={multiScreenActiveSlot}
      onStateChange={(layout, slots, activeSlot) => {
        console.log('💾 [GlobalVideoPlayer] Sauvegarde état multiscreen:', {layout, slotsCount: slots.length, activeSlot});
        setMultiScreenLayout(layout);
        setMultiScreenSlots(slots);
        setMultiScreenActiveSlot(activeSlot);
      }}
      onChannelFullscreen={(selectedChannel) => {
        actions.setFromMultiScreen(true);
        // Ne pas fermer MultiScreen immédiatement - laisser le Modal se fermer après la transition
        actions.setMultiScreenOpen(false);
        actions.playChannel(selectedChannel, true);

        // Fermer MultiScreen après un court délai pour transition fluide
        setTimeout(() => {
          setMultiScreenVisible(false);
        }, 100);
      }}
    />
  ) : null;

  // Masquer le player principal si SearchScreen est ouvert
  if (!isVisible || isSearchScreenOpen) {
    return renderMultiScreen;
  }

  // Si MultiScreen est ouvert, afficher seulement le MultiScreen (masquer le player pour éviter le flash)
  if (isMultiScreenOpen) {
    // Forcer opacity à 0 pour masquer instantanément le player
    viewOpacity.setValue(0);
    return renderMultiScreen;
  }


  return (
    <>
      {/* Multi-Screen Modal */}
      {renderMultiScreen}

      {/* Fond noir fullscreen pour localFullscreen */}
      {localFullscreen && !isInChannelPlayerScreen && (
        <View style={styles.localFullscreenBackdrop} pointerEvents="none" />
      )}

      {/* Fullscreen Modal - comme ChannelPlayerScreen */}
      {isFullscreen && !isInChannelPlayerScreen && (
        <Modal
          visible={true}
          transparent={false}
          animationType="fade"
          statusBarTranslucent={true}
          onRequestClose={() => actions.setFullscreen(false)}>
          <View style={styles.fullscreenContainer}>
            {PlayerContent}
          </View>
        </Modal>
      )}

      {/* Main Player */}
      {!isInChannelPlayerScreen && !isFullscreen ? (
        // PiP draggable (hors ChannelPlayerScreen et fullscreen)
        <PanGestureHandler
          onGestureEvent={onPanGestureEvent}
          onHandlerStateChange={onPanStateChange}
          enabled={true}>
          {PlayerContent}
        </PanGestureHandler>
      ) : isInChannelPlayerScreen ? (
        // ChannelPlayerScreen (lecteur fixe, pas draggable)
        PlayerContent
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  localFullscreenBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 999,
  },
  fullscreenContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'black',
  },
  fullscreenPlayerContent: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'black',
  },
  container: {
    position: 'absolute',
    backgroundColor: 'black',
    elevation: 10,
    zIndex: 1000,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  video: {...StyleSheet.absoluteFillObject},
  touchableOverlay: {...StyleSheet.absoluteFillObject},
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pipResizeButton: {
    position: 'absolute',
    top: 6,
    right: 40, // À gauche du bouton close avec plus d'espace
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1002,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  pipCloseButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1002,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

  // 🎯 STYLES POUR ZONES GESTUELLES AVANCÉES (FULLSCREEN UNIQUEMENT)
  gestureZoneLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '30%',
    zIndex: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gestureZoneRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '30%',
    zIndex: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gestureZoneCenter: {
    position: 'absolute',
    left: '30%',
    right: '30%',
    top: 0,
    bottom: 0,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 🎯 STYLES DEBUG POUR ZONES GESTUELLES
  gestureDebugText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    position: 'absolute',
    top: 20,
    textAlign: 'center',
  },
  gestureDebugSubtext: {
    color: 'white',
    fontSize: 12,
    position: 'absolute',
    bottom: 40,
    textAlign: 'center',
  },

  // 🎯 STYLES FEEDBACK VISUEL SEEK
  seekFeedbackContainer: {
    position: 'absolute',
    top: '50%',
    marginTop: -40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    minWidth: 80,
  },
  seekFeedbackText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  // Styles pour le bouton play/pause central
  playPauseButtonContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -40,
    marginLeft: -40,
    zIndex: 1000,
  },
  playPauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },

  // Style pour l'effet de vague (ripple)
  rippleEffect: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: 5, // Sous les feedbacks mais au-dessus du vidéo
  },

  // Styles pour contrôles TiviMate
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },

  // Header TiviMate
  tiviMateHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  backButtonModern: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  backIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerChannelInfo: {
    flex: 1,
    marginLeft: 20,
  },
  headerChannelName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerChannelCategory: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 3,
  },
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingsButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingsIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
    backgroundColor: 'transparent',
  },
  settingsMenu: {
    position: 'absolute',
    top: 70,
    right: 20,
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 220,
    maxHeight: 400,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 30,
    zIndex: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  settingsMenuText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 12,
    fontWeight: '500',
    flex: 1,
  },
  settingsMenuActiveText: {
    color: '#1976d2',
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 8,
  },
  expandIcon: {
    marginLeft: 'auto',
  },
  subMenu: {
    backgroundColor: 'rgba(20, 20, 20, 0.95)',
    marginLeft: 20,
    marginRight: 8,
    marginVertical: 4,
    borderRadius: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#1976d2',
    elevation: 5,
    zIndex: 110,
  },
  subMenuWindow: {
    position: 'absolute',
    top: 70,
    right: 250, // À gauche du menu principal (220 + 30 de marge)
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 240,
    maxWidth: 300,
    maxHeight: 450,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 35,
    zIndex: 105,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  subMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  subMenuTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  subMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  subMenuItemActive: {
    backgroundColor: 'rgba(25, 118, 210, 0.1)',
  },
  subMenuText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '400',
  },
  subMenuSection: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  subMenuSectionTitle: {
    color: '#1976d2',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingVertical: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  audioDelayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  audioDelayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(25, 118, 210, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1976d2',
  },
  audioDelayText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 24,
    minWidth: 80,
    textAlign: 'center',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
  },

  // Contrôles centrés TiviMate
  centerControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseButtonTivi: {
    borderRadius: 35,
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },

  // Footer timeline
  tiviMateFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingBottom: 5,
    justifyContent: 'flex-end',
  },
  progressBarContainer: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 1.5,
    overflow: 'hidden',
    marginHorizontal: 0,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#1976d2',
    borderRadius: 1.5,
  },

  // 🎯 DOCKER TIVIMATE AUTHENTIQUE - Styles copiés depuis VideoPlayerSimple.tsx
  dockerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200, // Plus grand pour InfoBar + progression + docker
    zIndex: 25,
  },
  dockerGradient: {
    flex: 1,
    paddingTop: 10,
    paddingBottom: 15,
  },

  // BARRE D'INFO EPG
  infoBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  infoBarLogo: {
    width: 70,
    height: 70,
    marginLeft: 20,
    marginRight: 15,
  },
  infoBarDetails: {
    flex: 1,
    justifyContent: 'center' as const,
  },
  infoBarProgramTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold' as const,
  },
  infoBarProgramTime: {
    color: '#ccc',
    fontSize: 12,
  },
  infoBarRemainingTime: {
    color: '#ccc',
    fontSize: 12,
    marginLeft: 8,
  },
  infoBarNextProgram: {
    color: '#aaa',
    fontSize: 12,
  },
  infoBarChannel: {
    alignItems: 'flex-end' as const,
    marginLeft: 10,
    marginRight: 40,
  },
  qualityBadges: {
    flexDirection: 'row' as const,
    marginTop: 5,
  },
  qualityBadge: {
    backgroundColor: 'rgba(128, 128, 128, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  badgeText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '500' as const,
  },

  // BARRE DE PROGRESSION PRINCIPALE EPG
  mainProgressBarContainer: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 40,
    marginBottom: 10,
    position: 'relative' as const,
  },
  mainProgressBarFill: {
    height: '100%',
    backgroundColor: '#1976d2',
    borderRadius: 2,
  },
  mainProgressHandle: {
    position: 'absolute' as const,
    top: -4.5,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#1976d2',
  },

  // DOCKER CONTENT
  dockerContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    height: 100,
    paddingHorizontal: 20,
  },
  dockerButtonModern: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 10,
    width: 75,
    height: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
  },
  dockerIconContainer: {
    marginBottom: 5,
  },
  dockerButtonTextModern: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600' as const,
  },
  recentChannelsScroll: {
    flex: 1,
    marginLeft: 10,
  },
  recentChannelsContent: {
    alignItems: 'center' as const,
    paddingRight: 20,
  },
  recentChannelItem: {
    alignItems: 'center' as const,
    marginRight: 10,
    width: 80,
  },
  recentChannelPreview: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: 'rgba(40, 40, 40, 0.9)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  recentChannelLogo: {
    width: 60,
    height: 60,
  },
  logoFallback: {
    width: 60,
    height: 60,
    backgroundColor: '#1976d2',
    borderRadius: 8,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  logoFallbackText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
});

export default GlobalVideoPlayer;
