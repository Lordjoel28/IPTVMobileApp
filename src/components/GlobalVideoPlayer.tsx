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
import Video from 'react-native-video';
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
    isSearchScreenOpen,
    actions,
  } = usePlayerStore();

  // 🎯 StatusBar automatique avec notre hook centralisé
  usePlayerStatusBar(isFullscreen, isVisible, 'GlobalVideoPlayer');

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
      return { width: deviceWidth, height: deviceHeight }; // Utiliser VRAIES dimensions écran
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

        // Animation plus lente pour transition PiP
        const animDuration = isFs ? 150 : isInChannelPlayerScreen ? 100 : 300;

        console.log('🎬 [Animation] Démarrage animation vers:', {
          positionTarget,
          sizeTarget,
          duration: animDuration,
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
          // 🎯 NOUVELLE LOGIQUE: Navigation vers ChannelPlayerScreen si vient de PiP→Fullscreen

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
  }, [isFullscreen, actions, navigation, channel, navigationData]);

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


  // États pour EPG réelles
  const [epgLoading, setEpgLoading] = React.useState(false);
  const [epgData, setEpgData] = React.useState<EPGData | null>(null);

  // Récupération des données playlist pour les chaînes récentes
  const {channels: playlistChannels} = usePlaylistStore();

  // 🕰️ Récupération des chaînes récentes du store simple
  const {recentChannels: storeRecentChannels} = useRecentChannelsStore();

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
    };
  }, []);

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
      // Position de la vague : centre de la zone gauche
      const rippleX = screenDims.width * 0.15; // 15% de la largeur d'écran
      const rippleY = screenDims.height * 0.5; // Centre vertical

      runOnJS(showRippleEffect)(rippleX, rippleY);
      runOnJS(handleSeekBackward)();
    });

  const rightDoubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(event => {
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

  const PlayerContent = (
    <RNAnimated.View
      style={[
        styles.container,
        {
          opacity: isVisible ? 1 : 0,
          ...renderPosition,
          ...renderSize,
          borderRadius:
            isFullscreen || localFullscreen
              ? 0
              : isInChannelPlayerScreen && miniPlayerRect
              ? 12
              : 8,
          // 🎯 IMMERSIF TOTAL : Z-index maximal + background noir
          zIndex: (isFullscreen || localFullscreen) ? 9999 : 1000,
          backgroundColor: (isFullscreen || localFullscreen) ? '#000000' : 'transparent',
        },
      ]}>
      {/* Video persistante - jamais démontée */}
      {channel ? (
        <Video
          ref={videoRef}
          source={{uri: channel.url}}
          key="global-video-player-persistent"
          style={styles.video}
          resizeMode="contain"
          paused={isPaused}
          onError={e => actions.setError('Erreur de lecture.')}
          onLoadStart={() => {
            console.log('🎬 Video LoadStart - Channel:', channel.name, '| isPaused:', isPaused);
            // Ne pas afficher loading si déjà en cours de lecture
            if (!channel || isLoading) {
              actions.setLoading(true);
            }
          }}
          onLoad={data => {
            console.log(
              '🎬 Video Load Success - Channel:',
              channel.name,
              'Duration:',
              data.duration,
              '| Should be playing (isPaused=' + isPaused + ')'
            );
            setDuration(data.duration || 0);
            actions.setLoading(false);
          }}
          onProgress={data => {
            setCurrentTime(data.currentTime || 0);
          }}
          onBuffer={({isBuffering}) => {
            // Minimiser les logs et états lors buffering pour éviter re-renders
            // console.log('🎬 Video Buffer:', isBuffering, 'Channel:', channel.name);
          }}
          playInBackground={false}
          pictureInPicture={false}
          useTextureView={true}
          controls={false}
          bufferConfig={{
            minBufferMs: 2500,
            maxBufferMs: 8000,
            bufferForPlaybackMs: 2500,
            bufferForPlaybackAfterRebufferMs: 2500,
          }}
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
                  {/* Header TiviMate: Bouton retour + Info chaîne */}
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
              {showDocker && (
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
                                onError={error => {
                                  console.log(
                                    '❌ [DOCKER] Logo failed to load:',
                                    {
                                      channel: recentChannel.name,
                                      logoUrl: recentChannel.logo,
                                      error: error.nativeEvent,
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

  return !isVisible || isSearchScreenOpen ? null : // Si PiP draggable, envelopper avec PanGestureHandler
  !isInChannelPlayerScreen && !isFullscreen ? (
    <PanGestureHandler
      onGestureEvent={onPanGestureEvent}
      onHandlerStateChange={onPanStateChange}
      enabled={true}>
      {PlayerContent}
    </PanGestureHandler>
  ) : (
    PlayerContent
  );
};

const styles = StyleSheet.create({
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
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
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
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 3,
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
