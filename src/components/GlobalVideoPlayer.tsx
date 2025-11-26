import React, {useRef, useEffect, useMemo} from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Text,
  BackHandler,
  ScrollView,
  Animated as RNAnimated,
  Platform,
  AppState,
  Modal,
  InteractionManager,
} from 'react-native';
import LZString from 'lz-string';
import {usePlayerStatusBar} from '../hooks/useStatusBar';
import {useAutoHideControls} from '../hooks/useAutoHideControls';
import {useChannelSelector} from '../hooks/useChannelSelector';
import {useVideoSettings} from '../hooks/useVideoSettings';
import {useVideoPlayerSettings} from '../hooks/useVideoPlayerSettings';
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
import Video, {
  SelectedVideoTrackType,
  SelectedTrackType,
} from 'react-native-video';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FastImage from 'react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';
import {FlashList} from '@shopify/flash-list';
import {usePlayerStore} from '../stores/PlayerStore';
import {useRecentChannelsStore} from '../stores/RecentChannelsStore';
import {EPGHelper, EPGData} from '../services/EPGHelper';
import EPGDataManager from '../services/EPGDataManager';
import {EPGCacheManager} from '../services/epg/EPGCacheManager';
import {usePlaylistStore} from '../stores/PlaylistStore';
import type {Channel, Category} from '../types';
import MultiScreenView from './MultiScreenView';
import {PiPControls} from './PiPControls';
import {TiviMateControls} from './TiviMateControls';
import {SettingsMenu} from './SettingsMenu';
import {DockerBar} from './DockerBar';
import {RotationBackground} from './RotationBackground';
import type {SubMenuType} from './SettingsMenu';
import {IPTVService} from '../services/IPTVService';
import WatermelonM3UService from '../services/WatermelonM3UService';
import CategoriesService from '../services/CategoriesService'; // ⚡ Service optimisé catégories
import RecentChannelsService from '../services/RecentChannelsService';
import FavoritesService from '../services/FavoritesService';
import ProfileService from '../services/ProfileService';
import ParentalControlService from '../services/ParentalControlService';
import database from '../database';
import {Q} from '@nozbe/watermelondb';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import {CastButton} from './CastButton';
import {castManager} from '../services/CastManager';
import {playerManager, type PlayerType, setNavigateToSettingsCallback} from '../services/PlayerManager';
// VLC intégré désactivé - Utilisation de VLC externe via intent
// import VLCPlayerComponent from './VLCPlayerComponent';

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');
const {width: deviceWidth, height: deviceHeight} = Dimensions.get('screen'); // Vraies dimensions pour fullscreen

// Position et taille par défaut du lecteur flottant
const MINI_PLAYER_WIDTH = 240; // Augmenté de 192 à 240 (+25%)
const MINI_PLAYER_HEIGHT = MINI_PLAYER_WIDTH * (9 / 16);
const SAFE_AREA_MARGIN = 16;

const GlobalVideoPlayer: React.FC = () => {
  const videoRef = useRef<Video>(null);
  // vlcRef supprimé - VLC intégré désactivé
  // const vlcRef = useRef<any>(null);
  const navigation = useNavigation();

  // Configurer le callback de navigation vers settings
  React.useEffect(() => {
    setNavigateToSettingsCallback(() => {
      navigation.navigate('PlayerSettings' as any);
    });
  }, [navigation]);

  // 🎬 Gestion du type de lecteur (Default / VLC)
  const [playerType, setPlayerType] = React.useState<PlayerType>(
    playerManager.getPlayerType()
  );

  // 🎧 Écouter les changements de lecteur
  React.useEffect(() => {
    const handlePlayerTypeChange = (newPlayerType: PlayerType) => {
      console.log(`🔄 [GlobalVideoPlayer] Changement de lecteur: ${newPlayerType}`);
      setPlayerType(newPlayerType);
    };

    playerManager.addListener(handlePlayerTypeChange);

    return () => {
      playerManager.removeListener(handlePlayerTypeChange);
    };
  }, []);

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
    isFromAutoStart,
    retryCount,
    isRetrying,
    retryState,
    actions,
  } = usePlayerStore();

  // 🎯 StatusBar automatique avec notre hook centralisé
  usePlayerStatusBar(isFullscreen, isVisible, 'GlobalVideoPlayer');

  // 🔄 Restaurer le playlistId au montage
  React.useEffect(() => {
    actions.restorePlaylistId();
  }, [actions]);

  // 🔄 État pour la gestion des favoris (système existant)
  const [isChannelFavorite, setIsChannelFavorite] = React.useState(false);
  const [favoriteProfileId, setFavoriteProfileId] = React.useState<string | null>(null);

  // 🌐 Utiliser l'état centralisé du store pour les retries
  const maxRetries = 5; // Augmenté comme les apps IPTV professionnelles

  // 🔄 État local pour le retry timing
  const [retryTimeout, setRetryTimeout] = React.useState<NodeJS.Timeout | null>(null);
  
  // 📱 État pour la popup de retry
  const [showRetryPopup, setShowRetryPopup] = React.useState(false);
  const [popupTimeout, setPopupTimeout] = React.useState<NodeJS.Timeout | null>(null);

  // 🎭 Animation pour la popup de retry
  const popupAnimValue = React.useRef(new RNAnimated.Value(0) as RNAnimated.Value).current;

  // 🔄 Animation de rotation pour l'icône de refresh
  const iconRotationAnim = React.useRef(new RNAnimated.Value(0) as RNAnimated.Value).current;

  // 🔄 Machine à états simplifiée pour les retries automatiques
  const scheduleNextRetry = React.useCallback(() => {
    // Utiliser retryCount + 1 car on planifie le PROCHAIN retry
    const nextRetryCount = retryCount + 1;
    if (!channel || nextRetryCount > maxRetries || retryState !== 'retrying') {
      console.log(`🔄 [GlobalVideoPlayer] Retry bloqué - channel: ${!!channel}, nextRetryCount: ${nextRetryCount}, maxRetries: ${maxRetries}, state: ${retryState}`);
      return;
    }

    // Délais optimisés : 2s → 4s → 6s → 8s → 10s (total: 30s)
    const optimizedDelays = [2000, 4000, 6000, 8000, 10000];
    // Utiliser nextRetryCount - 1 pour indexer correctement le tableau
    const delay = optimizedDelays[nextRetryCount - 1] || 10000;
    const delaySeconds = Math.round(delay / 1000);
    console.log(`🔄 [GlobalVideoPlayer] Prochain retry dans ${delaySeconds}s pour ${channel.name} (prochaine tentative ${nextRetryCount}/${maxRetries})`);

    const timeout = setTimeout(() => {
      // Vérifier qu'on est toujours en état de retry
      if (retryState !== 'retrying') {
        console.log(`🔄 [GlobalVideoPlayer] Retry annulé - état changé à ${retryState}`);
        return;
      }

      console.log(`🔄 [GlobalVideoPlayer] Exécution retry ${nextRetryCount}/${maxRetries} pour ${channel.name}`);

      // Incrémenter le compteur
      actions.incrementRetry();

      // Préparer la relecture vidéo
      actions.setLoading(true);

      setTimeout(() => {
        if (isPaused) {
          actions.togglePlayPause();
        }
        console.log(`🔄 [GlobalVideoPlayer] Retry ${nextRetryCount} lancé pour ${channel.name}`);

        // 📱 Afficher la popup de retry pendant 3 secondes
        showRetryPopupTemporarily();
      }, 300);

    }, delay);

    setRetryTimeout(timeout);
  }, [channel, retryCount, retryState, maxRetries, actions, isPaused]);

  // 📱 Fonction pour afficher la popup de retry avec animation fluide
  const showRetryPopupTemporarily = React.useCallback(() => {
    // Nettoyer le timeout précédent
    if (popupTimeout) {
      clearTimeout(popupTimeout);
    }

    // Afficher la popup avec animation d'apparition fluide
    setShowRetryPopup(true);

    // Animation d'apparition (slide up + fade in) + rotation icône
    RNAnimated.parallel([
      RNAnimated.timing(popupAnimValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true, // Optimisé pour les performances
      }),
      // Animation de rotation continue de l'icône
      RNAnimated.loop(
        RNAnimated.timing(iconRotationAnim, {
          toValue: 1,
          duration: 2000, // Rotation complète en 2 secondes
          useNativeDriver: true, // Optimisé pour les performances
        })
      )
    ]).start();

    // Masquer après 3 secondes avec animation de disparition fluide
    const timeout = setTimeout(() => {
      // Animation de disparition (slide down + fade out)
      RNAnimated.timing(popupAnimValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true, // Optimisé pour les performances
      }).start(() => {
        setShowRetryPopup(false); // Masquer après l'animation
      });
    }, 3000);

    setPopupTimeout(timeout);
  }, [popupTimeout, popupAnimValue, iconRotationAnim]);

  
  // Nettoyer le timeout de la popup si nécessaire
  React.useEffect(() => {
    return () => {
      if (popupTimeout) {
        clearTimeout(popupTimeout);
      }
    };
  }, [popupTimeout]);

  // 🔄 useEffect principal pour gérer la machine à états des retries
  React.useEffect(() => {
    if (retryState === 'retrying') {
      const maxRetriesReached = retryCount >= maxRetries;

      if (!maxRetriesReached) {
        // Démarrer ou continuer le cycle retry pour toutes les tentatives
        console.log(`🔄 [GlobalVideoPlayer] Cycle retry en cours pour ${channel?.name} (tentative ${retryCount + 1}/${maxRetries})`);
        scheduleNextRetry();
      } else if (maxRetriesReached) {
        // Épuisé les retries → état failed
        console.log(`🔄 [GlobalVideoPlayer] Retry épuisé pour ${channel?.name}`);
        actions.setRetryState('failed');

        // Afficher l'erreur finale
        if (error?.includes('Tentative de reconnexion')) {
          actions.setError(`Impossible de lire cette chaîne. Réessayez plus tard`);
        }

        // 📱 Afficher la notification finale d'échec pendant 3 secondes
        showRetryPopupTemporarily();
      }
    }

    // ✅ Nettoyage robuste : annuler le retry si l'état change ou si le composant est démonté
    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [retryState, retryCount, maxRetries, actions, error, channel?.name, scheduleNextRetry]);

  // 🔄 Le retry est maintenant géré par l'useEffect principal ci-dessus

  // 📱 useEffect pour afficher la notification quand on passe à l'état failed
  React.useEffect(() => {
    if (retryState === 'failed') {
      console.log(`🔄 [GlobalVideoPlayer] Notification finale d'échec pour ${channel?.name}`);
      showRetryPopupTemporarily();
    }
  }, [retryState, channel?.name]);

  // 📺 Initialiser favoriteProfileId depuis ProfileService
  React.useEffect(() => {
    const loadProfileId = async () => {
      if (storePlaylistId) {
        const ProfileService = (await import('../services/ProfileService')).default;
        const activeProfile = await ProfileService.getActiveProfile();
        if (activeProfile) {
          setFavoriteProfileId(activeProfile.id);
          console.log(`🔗 [GlobalVideoPlayer] ProfileID initialisé: ${activeProfile.id} pour playlist: ${storePlaylistId}`);
        }
      }
    };
    loadProfileId();
  }, [storePlaylistId]);

  // 🎬 Gestion des lecteurs externes (VLC)
  React.useEffect(() => {
    const handleExternalPlayer = async () => {
      if (channel && playerType === 'vlc') {
        const streamUrl = channel.url;
        const title = channel.name;

        console.log(`[GlobalVideoPlayer] Ouverture VLC externe pour: ${title}`);

        try {
          let success = false;
          if (playerType === 'vlc') {
            success = await playerManager.openInVLCPlayer(streamUrl, title);
          }

          if (success) {
            console.log(`[GlobalVideoPlayer] ${playerType} ouvert avec succès`);
            // Mettre en pause la lecture interne car le lecteur externe gère
            actions.setPaused(true);
          } else {
            // Si l'ouverture échoue, afficher une erreur
            actions.setError(`Impossible d'ouvrir ${playerType} pour cette chaîne`);
          }
        } catch (error) {
          console.error(`[GlobalVideoPlayer] Erreur ouverture ${playerType}:`, error);
          actions.setError(`Erreur lors de l'ouverture de ${playerType}`);
        }
      }
    };

    handleExternalPlayer();
  }, [channel, playerType]);

  // 🎯 Détection automatique du format et suggestion du meilleur lecteur
  React.useEffect(() => {
    const suggestBestPlayer = async () => {
      if (channel && playerType === 'default') {
        const streamUrl = channel.url;
        const format = playerManager.analyzeStreamFormat(streamUrl);

        if (format.requiresExternalPlayer) {
          console.log(`[GlobalVideoPlayer] Format ${format.container}/${format.protocol} nécessite un lecteur externe`);
          console.log(`[GlobalVideoPlayer] Lecteur recommandé: ${format.recommendedPlayer}`);

          // On pourrait afficher une suggestion à l'utilisateur ici
          // Pour l'instant, on log juste la recommandation
        }
      }
    };

    suggestBestPlayer();
  }, [channel, playerType]);

  // 🛡️ Protection contre les clics multiples
  const [isClickProcessing, setIsClickProcessing] = React.useState(false);
  const clickTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // État local pour fullscreen instantané (sans store)
  const [localFullscreen, setLocalFullscreen] = React.useState(false);

  // État pour l'arrière-plan de rotation (simple et performant)
  const [showRotationBackground, setShowRotationBackground] = React.useState(false);

  // État pour multi-écran (doit être avant le useEffect BackHandler)
  const [multiScreenVisible, setMultiScreenVisible] = React.useState<boolean>(false);
  const [multiScreenLayout, setMultiScreenLayout] = React.useState<string | null>(null);
  const [multiScreenSlots, setMultiScreenSlots] = React.useState<(Channel | null)[]>([]);
  const [multiScreenActiveSlot, setMultiScreenActiveSlot] = React.useState<number>(0);

  // 🎯 REFACTORED: Utilisation du hook useAutoHideControls pour éliminer la duplication

  // Boutons PiP (mode mini-player)
  const pipButtonsControls = useAutoHideControls({
    hideDelay: 3000,
    animationDuration: 200,
    animationType: 'animated', // Utilise RN Animated pour compatibilité
  });

  // Bouton Play/Pause central
  const playPauseButtonControls = useAutoHideControls({
    hideDelay: 3000,
    animationDuration: 300,
  });
  const playPauseButtonScale = useSharedValue(0.8);

  // Contrôles TiviMate (header)
  const [isScrolling, setIsScrolling] = React.useState(false);
  const tiviMateControls = useAutoHideControls({
    hideDelay: isScrolling ? 8000 : 5000, // Délai adaptatif selon scroll
    animationDuration: 300,
  });

  // Docker TiviMate (barre inférieure)
  const dockerControls = useAutoHideControls({
    hideDelay: isScrolling ? 8000 : 5000, // Synchronisé avec les contrôles
    animationDuration: 300,
  });

  // ⚡ Fermeture directe du PiP sans confirmation anormale

  // Charger le statut de favori quand la chaîne change
  React.useEffect(() => {
    if (channel && storePlaylistId) {
      loadChannelFavoriteStatus();
    }
  }, [channel, storePlaylistId]);

  // 🔄 Écouter les mises à jour de favoris depuis ChannelPlayerScreen
  React.useEffect(() => {
    const handleFavoriteUpdate = (data: any) => {
      const { channelId, isFavorite, playlistId, profileId } = data;

      // Mettre à jour seulement si ça concerne la chaîne actuelle
      if (channel && channelId === channel.id && playlistId === storePlaylistId && profileId === favoriteProfileId) {
        setIsChannelFavorite(isFavorite);
        console.log('🔄 [GlobalVideoPlayer] Favori mis à jour depuis ChannelPlayerScreen:', { channelId, isFavorite });
      }
    };

    // Ajouter l'écouteur d'événements
    const subscription = DeviceEventEmitter.addListener('favoriteUpdate', handleFavoriteUpdate);

    // Nettoyer l'écouteur
    return () => {
      subscription.remove();
    };
  }, [channel, storePlaylistId, favoriteProfileId]);

  // 🎨 Gestion simple de l'arrière-plan de rotation (performant)
  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleDimensionsChange = () => {
      // Afficher l'arrière-plan immédiatement
      setShowRotationBackground(true);

      // Cacher l'arrière-plan après la transition (700ms)
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        setShowRotationBackground(false);
      }, 700);
    };

    const subscription = Dimensions.addEventListener('change', handleDimensionsChange);

    return () => {
      subscription?.remove();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const loadChannelFavoriteStatus = async () => {
    if (!channel || !storePlaylistId) return;

    try {
      // Récupérer le profil actif
      const ProfileService = (await import('../services/ProfileService')).default;
      const activeProfile = await ProfileService.getActiveProfile();

      if (activeProfile) {
        setFavoriteProfileId(activeProfile.id);

        // Utiliser le système existant pour vérifier si la chaîne est en favori
        const favorites = await (await import('../services/FavoritesService')).default.getFavoritesByProfile(activeProfile.id);
        const isFav = favorites.some(fav => fav.channelId === channel.id);
        setIsChannelFavorite(isFav);
      }
    } catch (error) {
      console.error('❌ [GlobalVideoPlayer] Erreur chargement statut favori:', error);
    }
  };

  const handleFavoriteToggle = async () => {
    if (!channel || !storePlaylistId || !favoriteProfileId) return;

    try {
      // Utiliser le système existant toggleFavorite
      const FavoritesService = (await import('../services/FavoritesService')).default;
      const newIsFavorite = await FavoritesService.toggleFavorite(channel, storePlaylistId, favoriteProfileId);

      setIsChannelFavorite(newIsFavorite);
      console.log(`⭐ [GlobalVideoPlayer] Favori ${newIsFavorite ? 'ajouté' : 'retiré'} pour: ${channel.name}`);

      // 🔄 Synchroniser avec ChannelPlayerScreen via événement global
      emitFavoriteUpdate(channel.id, newIsFavorite);
    } catch (error) {
      console.error('❌ [GlobalVideoPlayer] Erreur toggle favori:', error);
    }
  };

  // 🔙 Callback pour le bouton retour des contrôles TiviMate
  const handleBackPress = React.useCallback(() => {
    if (localFullscreen) {
      setLocalFullscreen(false);
      return;
    }

    // 🎯 CAS SPÉCIAL: Si vient du multi-écran, revenir au multi-écran
    if (isFromMultiScreen) {
      console.log('🔙 [On-screen Back] From multi-screen, reopening multi-screen...');
      actions.setFullscreen(false);
      actions.setFromMultiScreen(false);
      actions.setFromAutoStart(false); // Reset flag autostart
      actions.setMultiScreenOpen(true);
      setMultiScreenVisible(true);
      return;
    }

    // 🎯 COMPORTEMENT NORMAL: Navigation vers ChannelPlayerScreen
    if (navigationData && channel) {
      console.log('🔙 [On-screen Back] NavigationData found, redirecting with NAVIGATE...');
      actions.setFullscreen(false);
      actions.setFromAutoStart(false); // Reset flag autostart
      navigation.navigate('ChannelPlayer', {
        ...navigationData,
        selectedChannel: channel,
      });
      actions.setNavigationData(null);
    } else {
      console.log('🔙 [On-screen Back] No NavigationData, default behavior.');
      actions.setFullscreen(false);
      actions.setFromAutoStart(false); // Reset flag autostart
    }
  }, [localFullscreen, isFromMultiScreen, navigationData, channel, actions, navigation]);

  // 🛡️ Fonction de clic sécurisé avec debounce
  const handleVideoPress = React.useCallback(() => {
    // Protection contre les clics multiples
    if (isClickProcessing) {
      console.log('🚫 [GlobalVideoPlayer] Clic ignoré - traitement en cours');
      return;
    }

    setIsClickProcessing(true);
    console.log('👆 [GlobalVideoPlayer] Clic vidéo traité - Mode:', {
      isInChannelPlayerScreen,
      localFullscreen,
      isFullscreen,
      isVisible
    });

    // Logique de clic simplifiée et sécurisée
    try {
      if (!isInChannelPlayerScreen && !localFullscreen) {
        console.log('📱 [GlobalVideoPlayer] Mode PiP - affichage boutons temporaires');
        // Appel direct du hook au lieu de la fonction wrappée
        pipButtonsControls.showTemporarily();
      } else if (!isInChannelPlayerScreen && localFullscreen) {
        // En fullscreen local : ne rien faire (gestes gérent déjà)
        console.log('🖥️ [GlobalVideoPlayer] Fullscreen local - pas d\'action');
      } else {
        // Mode ChannelPlayerScreen - basculer fullscreen avec protection
        console.log('🔄 [GlobalVideoPlayer] Toggle fullscreen depuis ChannelPlayerScreen');
        actions.setFullscreen(!isFullscreen);
      }
    } catch (error) {
      console.error('❌ [GlobalVideoPlayer] Erreur lors du clic:', error);
    } finally {
      // Réinitialiser après un délai pour éviter les clics rapides
      clickTimeoutRef.current = setTimeout(() => {
        setIsClickProcessing(false);
        console.log('✅ [GlobalVideoPlayer] Traitement clic terminé');
      }, 300);
    }
  }, [isInChannelPlayerScreen, localFullscreen, isFullscreen, isVisible, isClickProcessing, actions, pipButtonsControls]);

  // ⚡ Fermeture directe du PiP - UX normale sans confirmation anormale
  const handleClosePiP = React.useCallback(() => {
    console.log('❌ [GlobalVideoPlayer] Fermeture directe du PiP');
    actions.stop();
  }, [actions]);

  // 🧹 Cleanup des timeouts
  React.useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  // 🔄 Système de synchronisation des favoris
  const emitFavoriteUpdate = (channelId: string, isFavorite: boolean) => {
    // Utiliser DeviceEventEmitter pour synchroniser entre composants
    DeviceEventEmitter.emit('favoriteUpdate', {
      channelId,
      isFavorite,
      playlistId: storePlaylistId,
      profileId: favoriteProfileId
    });
    console.log('🔄 [GlobalVideoPlayer] Événement favori émis:', { channelId, isFavorite });
  };

  const viewPosition = useRef(new RNAnimated.ValueXY()).current;
  const viewSize = useRef(new RNAnimated.ValueXY()).current;
  const viewOpacity = useRef(new RNAnimated.Value(0)).current;

  // Gestion du drag pour PiP
  const dragPosition = useRef(new RNAnimated.ValueXY()).current;
  const isDragging = useRef(false);

  // 🚀 CALCULS MÉMORISÉS avec dependencies ultra-stables
  const miniPlayerPosition = React.useMemo(() => {
    return miniPlayerRect
      ? {x: miniPlayerRect.x, y: miniPlayerRect.y}
      : {x: 0, y: 0};
  }, [miniPlayerRect?.x, miniPlayerRect?.y]);

  const miniPlayerSize = React.useMemo(() => {
    return miniPlayerRect
      ? {width: miniPlayerRect.width, height: miniPlayerRect.height}
      : {width: 0, height: 0};
  }, [miniPlayerRect?.width, miniPlayerRect?.height]);

  const finalPosition = React.useMemo(() => {
    if (!isVisible) {
      return {x: 0, y: 0};
    }

    if (isFullscreen) {
      return {x: 0, y: 0};
    } else if (isInChannelPlayerScreen && miniPlayerRect) {
      return miniPlayerPosition;
    } else {
      return {
        x: screenWidth - MINI_PLAYER_WIDTH - SAFE_AREA_MARGIN,
        y: screenHeight - MINI_PLAYER_HEIGHT - SAFE_AREA_MARGIN - 50,
      };
    }
  }, [
    isVisible,
    isFullscreen,
    isInChannelPlayerScreen,
    miniPlayerPosition,
    miniPlayerRect,
  ]); // Dependencies stables

  const finalSize = React.useMemo(() => {
    if (!isVisible) {
      return {width: 0, height: 0};
    }

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
      return {width: MINI_PLAYER_WIDTH, height: MINI_PLAYER_HEIGHT};
    }
  }, [
    isVisible,
    isFullscreen,
    isInChannelPlayerScreen,
    miniPlayerSize,
    miniPlayerRect,
  ]); // Dependencies stables

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

        // 🚀 FIX IMMÉDIAT: Désactiver l'animation pour fullscreen - bloquait les contrôles
        if (isFs) {
          // Mode fullscreen : position et taille directes, pas d'animation
          console.log('🎬 [Animation] Fullscreen MODE DIRECT - pas d\'animation pour contrôles fonctionnels');
          viewPosition.setValue(positionTarget);
          viewSize.setValue(sizeTarget);
          viewOpacity.setValue(1);
        } else {
          // Mode PiP : animation SEULEMENT si on n'est pas dans ChannelPlayerScreen
          if (isInChannelPlayerScreen) {
            // Pas d'animation dans ChannelPlayerScreen - position directe
            viewPosition.setValue(positionTarget);
            viewSize.setValue(sizeTarget);
            viewOpacity.setValue(1);
            return;
          }

          console.log('🎬 [Animation] Démarrage animation PiP vers:', {
            positionTarget,
            sizeTarget,
          isInChannelPlayerScreen,
          isFullscreen,
                });

          // 🎯 Animation PiP fluide avec spring (style YouTube)
          // Utilise spring au lieu de timing pour un mouvement plus naturel
          RNAnimated.parallel([
          RNAnimated.spring(viewPosition, {
            toValue: positionTarget,
            useNativeDriver: false,
            damping: 18,         // Légèrement plus souple pour transitions
            stiffness: 140,      // Rigidité équilibrée
            mass: 1,
            overshootClamping: false,
            restDisplacementThreshold: 0.01,
            restSpeedThreshold: 0.01,
          }),
          RNAnimated.spring(viewSize, {
            toValue: sizeTarget,
            useNativeDriver: false,
            damping: 18,         // Synchronisé avec position
            stiffness: 140,
            mass: 1,
            overshootClamping: false,
            restDisplacementThreshold: 0.01,
            restSpeedThreshold: 0.01,
          }),
          RNAnimated.timing(viewOpacity, {
            toValue: 1,
            duration: 150,       // Légèrement plus long pour fade-in doux
            useNativeDriver: false,
          }),
        ]).start();
      }
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

  // 🔧 Utiliser le hook pour accéder aux paramètres vidéo
  const videoPlayerSettings = useVideoPlayerSettings();

  
  // 🎯 LIFECYCLE: Gestion arrière-plan avec paramètre utilisateur
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log('🔇 [GlobalVideoPlayer] App en arrière-plan');

        // Utiliser le paramètre de lecture en arrière-plan
        const backgroundPlay = videoPlayerSettings.backgroundPlay;
        console.log(`🔍 [GlobalVideoPlayer] Paramètre backgroundPlay: ${backgroundPlay}`);

        if (backgroundPlay) {
          console.log('🎵 [GlobalVideoPlayer] Lecture en arrière-plan activée - CONTINUE audio');
          // Continuer la lecture (ne rien faire - react-native-video gère l'audio)
        } else {
          console.log('🔇 [GlobalVideoPlayer] Lecture en arrière-plan désactivée - PAUSE player');
          if (isVisible && channel && !isPaused) {
            // Mettre en pause (comportement par défaut)
            actions.togglePlayPause();
          }
        }
      } else if (nextAppState === 'active') {
        console.log('▶️ [GlobalVideoPlayer] App active - Vérification reprise automatique');

        const backgroundPlay = videoPlayerSettings.backgroundPlay;

        if (backgroundPlay && isVisible && channel && isPaused) {
          console.log('🔄 [GlobalVideoPlayer] Reprise automatique depuis arrière-plan');
          setTimeout(() => {
            actions.togglePlayPause();
          }, 500);
        } else if (!backgroundPlay && isVisible && channel && isPaused) {
          console.log('🔄 [GlobalVideoPlayer] Reprise automatique après pause normale');
          setTimeout(() => {
            actions.togglePlayPause();
          }, 500);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isVisible, channel, isPaused, actions, videoPlayerSettings.backgroundPlay]);

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
            console.log(
              '🔙 [BackHandler] From multi-screen, reopening multi-screen...',
            );
            // Ordre important pour éviter flash:
            // 1. Marquer MultiScreen comme ouvert AVANT de quitter fullscreen
            actions.setMultiScreenOpen(true);
            setMultiScreenVisible(true);
            // 2. Sortir du fullscreen (le player sera masqué car isMultiScreenOpen=true)
            actions.setFullscreen(false);
            actions.setFromMultiScreen(false);
            actions.setFromAutoStart(false); // Reset flag autostart
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
            actions.setFromAutoStart(false); // Reset flag autostart
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
  }, [
    isFullscreen,
    actions,
    navigation,
    channel,
    navigationData,
    isFromMultiScreen,
    setMultiScreenVisible,
  ]);

  // StatusBar gérée par StatusBarManager centralisé
  // La logique complexe est maintenant simplifiée

  // 🎯 Gestionnaire pour drag PiP ultra-fluide style YouTube
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
        // Résistance douce progressive aux bords (technique YouTube)
        const {translationX, translationY} = event.nativeEvent;
        const currentX = finalPosition.x + translationX;
        const currentY = finalPosition.y + translationY;

        // Limites souples avec résistance
        const maxX = screenWidth - finalSize.width;
        const maxY = screenHeight - finalSize.height;

        let dampedX = translationX;
        let dampedY = translationY;

        // 🎯 Résistance PROGRESSIVE horizontale (non-linéaire, comme YouTube)
        // Plus on s'éloigne, plus la résistance augmente graduellement
        if (currentX < 0) {
          const overflow = Math.abs(currentX);
          // Formule rubberband: résistance croissante non-linéaire
          const resistance = Math.max(0.1, 1 - (overflow / 200));
          dampedX = translationX * resistance;
        } else if (currentX > maxX) {
          const overflow = currentX - maxX;
          const resistance = Math.max(0.1, 1 - (overflow / 200));
          dampedX = translationX * resistance;
        }

        // 🎯 Résistance PROGRESSIVE verticale (synchronisée)
        if (currentY < 0) {
          const overflow = Math.abs(currentY);
          const resistance = Math.max(0.1, 1 - (overflow / 200));
          dampedY = translationY * resistance;
        } else if (currentY > maxY) {
          const overflow = currentY - maxY;
          const resistance = Math.max(0.1, 1 - (overflow / 200));
          dampedY = translationY * resistance;
        }

        dragPosition.setValue({x: dampedX, y: dampedY});
      },
    },
  );

  // État pour modal de confirmation d'effacement
  const [showClearConfirmModal, setShowClearConfirmModal] = React.useState(false);

  // 🎯 HOOK: Sélecteur de chaînes (remplace ~585 lignes de code)
  const channelSelector = useChannelSelector({
    playlistId: storePlaylistId,
    currentChannel: channel,
    channelsPerPage: 200,
  });

  // États pour le menu paramètres
  const [showSettingsMenu, setShowSettingsMenu] = React.useState(false);
  const settingsMenuOpacity = useSharedValue(0);

  // Synchroniser l'opacité avec l'état showSettingsMenu
  React.useEffect(() => {
    console.log('🔧 [Settings] useEffect - showSettingsMenu:', showSettingsMenu);
    console.log('🔧 [Settings] Opacité avant animation:', settingsMenuOpacity.value);
    settingsMenuOpacity.value = withTiming(showSettingsMenu ? 1 : 0, {
      duration: 200,
    }, (finished) => {
      console.log('🔧 [Settings] Animation terminée, finished:', finished, 'opacité finale:', settingsMenuOpacity.value);
    });
  }, [showSettingsMenu]);

  // États pour les sous-menus
  const [activeSubMenu, setActiveSubMenu] = React.useState<string | null>(null);
  const [sleepTimer, setSleepTimer] = React.useState<number | null>(null);
  const sleepTimerRef = useRef<NodeJS.Timeout | null>(null);
  const subMenuOpacity = useSharedValue(0);

  // États pour piste audio (1 = Piste 1 activée par défaut, 0 = muet)
  const [selectedAudioTrack, setSelectedAudioTrack] = React.useState<number | null>(1);
  const [audioDelay, setAudioDelay] = React.useState<number>(0); // en ms

  // États pour piste vidéo
  const [selectedVideoQuality, setSelectedVideoQuality] =
    React.useState<string>('auto');
  const [availableVideoTracks, setAvailableVideoTracks] = React.useState<any[]>(
    [],
  );
  const [availableAudioTracks, setAvailableAudioTracks] = React.useState<any[]>(
    [],
  );
  const [availableTextTracks, setAvailableTextTracks] = React.useState<any[]>(
    [],
  );

  // États pour sous-titres
  const [subtitlesEnabled, setSubtitlesEnabled] =
    React.useState<boolean>(false);
  const [selectedSubtitleTrack, setSelectedSubtitleTrack] =
    React.useState<number | null>(0);

  // 🔄 Réinitialiser les pistes lors du changement de chaîne/film/série
  React.useEffect(() => {
    if (channel) {
      console.log(`🔄 [Tracks] Changement de contenu: ${channel.name} (contentType: ${channel.contentType || 'live'})`);
      console.log('🔄 [Tracks] Réinitialisation des pistes audio et sous-titres');

      // Réinitialiser les états des pistes
      setSelectedAudioTrack(1); // Réinitialiser à la piste audio 1
      setSelectedSubtitleTrack(0); // Réinitialiser les sous-titres (désactivés)
      setAvailableAudioTracks([]); // Vider les pistes disponibles (seront remplies lors du onLoad)
      setAvailableTextTracks([]); // Vider les sous-titres disponibles (seront remplis lors du onLoad)
      setSelectedVideoQuality('auto'); // Réinitialiser la qualité vidéo
      setAvailableVideoTracks([]); // Vider les pistes vidéo
    }
  }, [channel?.id, channel?.url]); // Déclencher quand la chaîne/film/série change
  const [subtitleSize, setSubtitleSize] = React.useState<string>('normal');
  const [subtitleDelay, setSubtitleDelay] = React.useState<number>(0); // en ms

  // 🎯 Optimisation: Mémoriser les objets de sélection de pistes pour éviter re-renders
  const memoizedAudioTrack = useMemo(() => {
    if (selectedAudioTrack > 0 && availableAudioTracks.length > 0) {
      const trackIndex = selectedAudioTrack - 1;
      const track = availableAudioTracks[trackIndex];
      if (track) {
        const realIndex = track.index ?? trackIndex;
        console.log(`🔊 [Audio] Recalcul piste: ${selectedAudioTrack}, index réel: ${realIndex}`);
        return {
          type: SelectedTrackType.INDEX,
          value: realIndex,
        };
      }
    }
    return undefined;
  }, [selectedAudioTrack, availableAudioTracks]);

  const memoizedVideoTrack = useMemo(() => {
    if (selectedVideoQuality !== 'auto' && availableVideoTracks.length > 0) {
      const track = availableVideoTracks.find(t => {
        const trackIndex = t.trackId ?? t.index ?? 0;
        return `${t.height}p-${trackIndex}` === selectedVideoQuality;
      });
      if (track) {
        const trackIndex = track.trackId ?? track.index ?? 0;
        console.log(`📹 [Video] Recalcul qualité: ${selectedVideoQuality}, index: ${trackIndex}`);
        return {
          type: SelectedVideoTrackType.INDEX,
          value: trackIndex,
        };
      }
    }
    return undefined;
  }, [selectedVideoQuality, availableVideoTracks]);

  const memoizedTextTrack = useMemo(() => {
    if (subtitlesEnabled && selectedSubtitleTrack > 0 && availableTextTracks.length > 0) {
      const trackIndex = selectedSubtitleTrack - 1;
      const track = availableTextTracks[trackIndex];
      if (track) {
        const realIndex = track.index ?? trackIndex;
        console.log(`📝 [Subtitles] Recalcul sous-titre: ${selectedSubtitleTrack}, index réel: ${realIndex}`);
        return {
          type: SelectedTrackType.INDEX,
          value: realIndex,
        };
      }
    }
    return undefined;
  }, [subtitlesEnabled, selectedSubtitleTrack, availableTextTracks]);

  // 🎯 HOOK: Paramètres vidéo (zoom, buffer, screen lock)
  const videoSettings = useVideoSettings({
    isFullscreen,
  });

  // États pour EPG réelles
  const [epgLoading, setEpgLoading] = React.useState(false);
  const [epgData, setEpgData] = React.useState<EPGData | null>(null);

  // Récupération des données playlist pour les chaînes récentes
  const {channels: playlistChannels} = usePlaylistStore();

  // 🕰️ Récupération des chaînes récentes du store simple
  const {recentChannels: storeRecentChannels, clearRecentChannels} = useRecentChannelsStore();

  // 📺 Récupération des chaînes de la playlist active pour multi-écran
  const [allChannelsForMultiScreen, setAllChannelsForMultiScreen] =
    React.useState<Channel[]>([]);
  const [lastLoadedPlaylistId, setLastLoadedPlaylistId] = React.useState<
    string | null
  >(null);
  const [isLoadingChannels, setIsLoadingChannels] = React.useState(false);

  // 🔒 État pour les catégories bloquées du profil actif
  const [blockedCategories, setBlockedCategories] = React.useState<string[]>([]);

  // 🔒 Charger les catégories bloquées du profil actif
  React.useEffect(() => {
    const loadBlockedCategories = async () => {
      try {
        const activeProfile = await ProfileService.getActiveProfile();
        if (activeProfile && activeProfile.blockedCategories) {
          setBlockedCategories(activeProfile.blockedCategories);
          console.log('🔒 [GlobalVideoPlayer] Catégories bloquées chargées:', activeProfile.blockedCategories);
        } else {
          setBlockedCategories([]);
        }
      } catch (error) {
        console.error('❌ [GlobalVideoPlayer] Erreur chargement catégories bloquées:', error);
        setBlockedCategories([]);
      }
    };

    loadBlockedCategories();
  }, []);

  // Charger les chaînes de la playlist active quand le multi-écran s'ouvre ou la playlist change
  React.useEffect(() => {
    // Récupérer playlistId depuis navigationData (priorité) ou store (fallback)
    const activePlaylistId = navigationData?.playlistId || storePlaylistId;

    // Charger si: multi-screen visible ET playlistId existe ET (pas encore chargé OU playlist différente)
    if (
      multiScreenVisible &&
      activePlaylistId &&
      activePlaylistId !== lastLoadedPlaylistId
    ) {
      const loadAllChannels = async () => {
        try {
          setIsLoadingChannels(true);
          console.log(
            '📋 [MultiScreen] Chargement chaînes de la playlist:',
            activePlaylistId,
          );

          // Charger en arrière-plan avec timeout pour ne pas bloquer l'UI
          setTimeout(async () => {
            const result = await WatermelonM3UService.getPlaylistWithChannels(
              activePlaylistId,
              50000, // Limit très élevé pour supporter playlists massives (11K+ chaînes)
              0,
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

            console.log(
              '📺 [MultiScreen] Loaded',
              convertedChannels.length,
              'channels from playlist',
              activePlaylistId,
            );
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
      console.warn(
        '⚠️ [MultiScreen] Aucune playlist active trouvée (navigationData et store)',
      );
    }
  }, [
    multiScreenVisible,
    navigationData,
    storePlaylistId,
    lastLoadedPlaylistId,
  ]);

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
        console.log(
          `✅ [EPG] Match trouvé pour "${channel.name}" -> EPG ID: ${epgChannel.id}`,
        );
        // 3. Utiliser EPGDataManager avec le bon ID
        const data = await EPGDataManager.getChannelEPG(epgChannel.id);
        setEpgData(data);
      } else {
        console.log(
          `❌ [EPG] Aucun match trouvé pour "${channel.name}" dans l'index EPG.`,
        );
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
    console.log(
      '🔄 [GlobalVideoPlayer] Component mounted with BackHandler enabled',
    );
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
    if (url.includes('fhd') || url.includes('1080')) {
      return 'FHD';
    }
    if (url.includes('hd') || url.includes('720')) {
      return 'HD';
    }
    if (url.includes('sd') || url.includes('480')) {
      return 'SD';
    }
    return 'HD'; // Par défaut
  };

  // Fonction pour déterminer le FPS (estimation)
  const getChannelFPS = (channel: any) => {
    const url = channel?.url?.toLowerCase() || '';
    if (url.includes('60fps')) {
      return '60 FPS';
    }
    if (url.includes('30fps')) {
      return '30 FPS';
    }
    if (url.includes('24fps')) {
      return '24 FPS';
    }
    return '25 FPS'; // Standard européen
  };

  // Fonction pour déterminer l'audio
  const getChannelAudio = (channel: any) => {
    const url = channel?.url?.toLowerCase() || '';
    if (url.includes('stereo')) {
      return 'STÉRÉO';
    }
    if (url.includes('mono')) {
      return 'MONO';
    }
    if (url.includes('5.1') || url.includes('surround')) {
      return '5.1';
    }
    return 'STÉRÉO'; // Par défaut
  };

  // Utiliser les chaînes récentes du store simple (limite 20 avec scroll)
  const recentChannels = React.useMemo(() => {
    if (storeRecentChannels && storeRecentChannels.length > 0) {
      // 🔒 FILTRER les chaînes des catégories bloquées
      let filteredChannels = storeRecentChannels;
      if (blockedCategories.length > 0) {
        const beforeCount = storeRecentChannels.length;
        filteredChannels = storeRecentChannels.filter((ch: any) => {
          const groupTitle = ((ch as any).groupTitle || ch.group || ch.category || '').toLowerCase();
          return !blockedCategories.some(blocked =>
            groupTitle.includes(blocked.toLowerCase())
          );
        });
        console.log(
          `🔒 [GlobalVideoPlayer] Docker filtrés: ${beforeCount} → ${filteredChannels.length} chaînes récentes`,
        );
      }

      const limitedChannels = filteredChannels.slice(0, 20);
      // console.log(
      //   `✅ [GlobalVideoPlayer] Store → Docker: ${filteredChannels.length} chaînes récentes → affichage de ${limitedChannels.length} (limite 20)`,
      // );
      // console.log(
      //   '📋 [GlobalVideoPlayer] Noms des chaînes:',
      //   limitedChannels.map(ch => ch.name).join(', '),
      // );
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
  }, [storeRecentChannels, playlistChannels, blockedCategories]);

  // 🎯 NOUVEAU: État local pour stabiliser la liste des chaînes dans le docker
  const [stableRecentChannels, setStableRecentChannels] = React.useState<Channel[]>([]);

  React.useEffect(() => {
    // Si le docker est affiché et que notre liste stable est vide, on la remplit.
    // Cela "photographie" l'état des chaînes récentes à l'ouverture du docker.
    if (dockerControls.isVisible && stableRecentChannels.length === 0) {
      setStableRecentChannels(recentChannels);
    }
    // Si le docker est masqué, on vide notre liste stable pour qu'elle se rafraîchisse à la prochaine ouverture.
    else if (!dockerControls.isVisible && stableRecentChannels.length > 0) {
      setStableRecentChannels([]);
    }
  }, [dockerControls.isVisible, recentChannels, stableRecentChannels]);

  // Fonction pour effacer les chaînes récentes
  const handleClearRecentChannels = async () => {
    try {
      // 1. Récupérer le profil actif
      const activeProfile = await ProfileService.getActiveProfile();
      if (!activeProfile) {
        console.log('⚠️ [Docker] Aucun profil actif, impossible d\'effacer');
        return;
      }

      console.log('🗑️ [Docker] Effacement des chaînes récentes pour profil:', activeProfile.id);

      // 2. Vider AsyncStorage via le service
      await RecentChannelsService.clearProfileRecents(activeProfile.id);

      // 3. Vider le store en mémoire
      clearRecentChannels();

      // 4. Vider la liste stabilisée locale
      setStableRecentChannels([]);

      console.log('✅ [Docker] Chaînes récentes effacées avec succès');
    } catch (error) {
      console.error('❌ [Docker] Erreur lors de l\'effacement:', error);
    }
  };


  // ✅ Fonctions adaptées pour le sélecteur (utilise le hook)
  const handleChannelSelect = (selectedChannel: Channel) => {
    actions.playChannel(selectedChannel, true);
    channelSelector.close();
  };

  const handleCategorySelect = async (category: Category) => {
    channelSelector.selectCategory(category);
  };

  // Rendu d'une catégorie dans le sélecteur
  const renderSelectorCategoryItem = ({item}: {item: Category}) => {
    const isSelected = channelSelector.selectedCategory?.id === item.id;

    // Déterminer l'icône et le nom à afficher
    let iconName = null;
    let displayName = item.name;

    if (item.id === 'recents') {
      iconName = 'history';
      displayName = 'Récents';
    } else if (item.id === 'favorites') {
      iconName = 'star';
      displayName = 'Favoris';
    }

    return (
      <TouchableOpacity
        style={[
          styles.selectorCategoryItem,
          isSelected && styles.selectorCategoryItemActive,
        ]}
        onPress={() => handleCategorySelect(item)}>
        <View style={styles.selectorCategoryNameContainer}>
          {iconName && (
            <Icon
              name={iconName}
              size={18}
              color={isSelected ? '#fff' : '#ccc'}
              style={styles.selectorCategoryIcon}
            />
          )}
          <Text
            style={[
              styles.selectorCategoryText,
              isSelected && styles.selectorCategoryTextActive,
            ]}
            numberOfLines={1}>
            {displayName}
          </Text>
        </View>
        <Text
          style={[
            styles.selectorCategoryCount,
            isSelected && styles.selectorCategoryCountActive,
          ]}>
          {item.count}
        </Text>
      </TouchableOpacity>
    );
  };

  // ✅ OPTIMISATION: Composant mémoïsé pour éviter re-renders inutiles (5-10x plus rapide)
  const ChannelItem = React.memo(({item, onPress, isPlaying}: {item: Channel; onPress: () => void; isPlaying: boolean}) => {
    return (
      <TouchableOpacity
        style={[
          styles.selectorChannelItem,
          isPlaying && styles.selectorChannelItemActive,
        ]}
        onPress={onPress}>
        {/* Logo à gauche */}
        <View style={styles.selectorChannelLogo}>
          {item.logo ? (
            <FastImage
              source={{uri: item.logo}}
              style={styles.selectorChannelLogoImage}
              resizeMode={FastImage.resizeMode.contain}
            />
          ) : (
            <View style={styles.selectorChannelLogoFallback}>
              <Text style={styles.selectorChannelLogoText}>
                {(item.name || 'CH').substring(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        {/* Nom à droite */}
        <Text style={[
          styles.selectorChannelName,
          isPlaying && styles.selectorChannelNameActive,
        ]} numberOfLines={1}>
          {item.name || 'Chaîne sans nom'}
        </Text>
      </TouchableOpacity>
    );
  }, (prevProps, nextProps) => {
    // ✅ Comparaison personnalisée: re-render si l'ID OU le statut playing change
    return prevProps.item.id === nextProps.item.id && prevProps.isPlaying === nextProps.isPlaying;
  });

  // Rendu d'une chaîne dans le sélecteur (format liste) - wrapper mémoïsé
  const renderSelectorChannelItem = React.useCallback(({item}: {item: Channel}) => {
    const isPlaying = channel?.id === item.id;
    return <ChannelItem item={item} onPress={() => handleChannelSelect(item)} isPlaying={isPlaying} />;
  }, [channel]);

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
  const showRippleEffect = React.useCallback((x: number, y: number) => {
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
  }, [rippleScale, rippleOpacity]);

  // Fonction pour toggle resize PiP (comme IPTV Smarters Pro)
  const toggleResize = () => {
    const newFullscreen = !localFullscreen;
    setLocalFullscreen(newFullscreen);
    if (newFullscreen) {
      showControlsTemporarily();
    }
  };

  // 🎯 REFACTORED: Fonction pour afficher contrôles et docker ensemble
  const showControlsTemporarily = React.useCallback(() => {
    const hideDelay = isScrolling ? 8000 : 5000;
    console.log(
      `⏱️ [Controls] Auto-hide dans ${hideDelay / 1000}s (scroll: ${isScrolling})`,
    );

    // Afficher contrôles et docker ensemble
    console.log('🎬 [Controls] Affichage TiviMate controls...');
    tiviMateControls.showTemporarily();
    console.log('🐳 [Controls] Affichage DockerBar...', {
      wasVisible: dockerControls.isVisible,
    });
    dockerControls.showTemporarily();
    console.log('✅ [Controls] Les deux contrôles ont été appelés');
    console.log('👆 [Controls] Zones gestuelles désactivées (pointerEvents: none) pour permettre interactions');
  }, [isScrolling, tiviMateControls, dockerControls]);

  const toggleControls = React.useCallback(() => {
    console.log('👆 [toggleControls] Appelé - État actuel:', {
      tiviMateVisible: tiviMateControls.isVisible,
      dockerVisible: dockerControls.isVisible,
      screenLocked: videoSettings.isScreenLocked,
    });

    // Si l'écran est verrouillé
    if (videoSettings.isScreenLocked) {
      if (!tiviMateControls.isVisible) {
        console.log('🔒 [toggleControls] Écran verrouillé - affichage bouton déverrouillage uniquement');
        // Afficher seulement le header avec le bouton de déverrouillage
        tiviMateControls.show();
        tiviMateControls.opacity.value = withTiming(1, {duration: 300});

        // Auto-cacher après 5s (augmenté pour laisser plus de temps)
        setTimeout(() => {
          if (videoSettings.isScreenLocked) {
            tiviMateControls.hide();
          }
        }, 5000);
        return;
      } else {
        // Si les contrôles sont déjà visibles et l'écran est verrouillé, on les cache
        console.log('🔒 [toggleControls] Écran verrouillé - masquage contrôles');
        tiviMateControls.hide();
        return;
      }
    }

    // Comportement normal si l'écran n'est pas verrouillé
    if (tiviMateControls.isVisible) {
      console.log('👁️ [toggleControls] Contrôles visibles - masquage des deux');
      // Cacher immédiatement
      tiviMateControls.hide();
      dockerControls.hide();
      console.log('✋ [toggleControls] Zones gestuelles réactivées (pointerEvents: auto)');
    } else {
      console.log('🎬 [toggleControls] Contrôles cachés - affichage des deux via showControlsTemporarily()');
      // Montrer temporairement
      showControlsTemporarily();
    }
  }, [videoSettings.isScreenLocked, tiviMateControls, dockerControls, showControlsTemporarily]);

  // 🎯 REFACTORED: Fonction pour afficher temporairement les boutons PiP
  const showPipButtonsTemporarily = React.useCallback(() => {
    console.log('👆 [GlobalVideoPlayer] Showing PiP buttons temporarily');
    pipButtonsControls.showTemporarily();
  }, [pipButtonsControls]);

  // 🎯 REFACTORED: Fonction pour afficher temporairement le bouton play/pause central
  const showPlayPauseButtonTemporarily = React.useCallback(() => {
    playPauseButtonControls.showTemporarily();
    // Animation de scale supplémentaire pour effet visuel
    playPauseButtonScale.value = withSpring(1, {damping: 15, stiffness: 200});
    setTimeout(() => {
      playPauseButtonScale.value = withTiming(0.8, {duration: 300});
    }, 3000);
  }, [playPauseButtonControls, playPauseButtonScale]);

  // Cleanup du timeout (sleep timer uniquement maintenant)
  useEffect(() => {
    return () => {
      if (sleepTimerRef.current) {
        clearTimeout(sleepTimerRef.current);
      }
      // Les autres timeouts sont gérés par les hooks
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

  // Définir showSeekFeedback AVANT handleSeekForward et handleSeekBackward
  const showSeekFeedback = React.useCallback((
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
  }, [seekFeedbackOpacity, seekFeedbackScale]);

  // 🎯 PHASE 2: Handlers pour gestures avancées (fullscreen uniquement)
  const handleSeekForward = React.useCallback(() => {
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
  }, [currentTime, duration, showSeekFeedback]);

  const handleSeekBackward = React.useCallback(() => {
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
  }, [currentTime, showSeekFeedback]);

  // Récupérer les dimensions d'écran une seule fois
  const screenDims = React.useMemo(() => Dimensions.get('screen'), []);

  // 🎯 LOGIQUE SIMPLE TAP + DOUBLE TAP avec setTimeout (comme YouTube)
  const DOUBLE_TAP_DELAY = 300; // 300ms pour détecter un double tap
  const lastTapTime = React.useRef(0);
  const lastTapX = React.useRef(0);
  const singleTapTimer = React.useRef<NodeJS.Timeout | null>(null);

  const handleScreenPress = React.useCallback(
    (event: any) => {
      // Si l'écran est verrouillé, permettre seulement le toggle des contrôles pour afficher le bouton déverrouillage
      if (videoSettings.isScreenLocked) {
        console.log('🔒 [handleScreenPress] Écran verrouillé - affichage bouton déverrouillage');
        toggleControls();
        return;
      }

      const tapX = event.nativeEvent.locationX;
      const now = Date.now();
      const delta = now - lastTapTime.current;
      const screenWidth = screenDims.width;

      // Vérifier si c'est un double tap (même position, <300ms)
      if (
        delta < DOUBLE_TAP_DELAY &&
        Math.abs(tapX - lastTapX.current) < 50
      ) {
        // DOUBLE TAP détecté
        if (singleTapTimer.current) {
          clearTimeout(singleTapTimer.current);
          singleTapTimer.current = null;
        }

        // Déterminer si c'est gauche, droite ou centre
        const leftZoneEnd = screenWidth * 0.35;
        const rightZoneStart = screenWidth * 0.65;

        if (tapX < leftZoneEnd) {
          // Double tap GAUCHE - Seek backward
          const rippleX = screenWidth * 0.15;
          const rippleY = screenDims.height * 0.5;
          showRippleEffect(rippleX, rippleY);
          handleSeekBackward();
        } else if (tapX > rightZoneStart) {
          // Double tap DROITE - Seek forward
          const rippleX = screenWidth * 0.85;
          const rippleY = screenDims.height * 0.5;
          showRippleEffect(rippleX, rippleY);
          handleSeekForward();
        } else {
          // Double tap CENTRE - Toggle contrôles (comme YouTube)
          toggleControls();
        }
      } else {
        // Premier tap - attendre pour voir si c'est un double tap
        singleTapTimer.current = setTimeout(() => {
          // SIMPLE TAP - Toggle contrôles
          toggleControls();
          singleTapTimer.current = null;
        }, DOUBLE_TAP_DELAY);
      }

      lastTapTime.current = now;
      lastTapX.current = tapX;
    },
    [
      videoSettings.isScreenLocked,
      screenDims,
      showRippleEffect,
      handleSeekBackward,
      handleSeekForward,
      toggleControls,
    ],
  );

  // Cleanup du timer
  React.useEffect(() => {
    return () => {
      if (singleTapTimer.current) {
        clearTimeout(singleTapTimer.current);
      }
    };
  }, []);

  // 🎯 STYLES ANIMÉS pour le feedback visuel
  const seekFeedbackAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: seekFeedbackOpacity.value,
      transform: [{scale: seekFeedbackScale.value}],
    };
  });

  // 🎯 REFACTORED: Style animé pour le bouton play/pause central
  const playPauseButtonAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: playPauseButtonControls.opacity.value,
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

  // 🎯 REFACTORED: Styles animés pour les contrôles TiviMate
  const controlsAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: tiviMateControls.opacity.value,
    };
  });

  const dockerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: dockerControls.opacity.value,
    };
  });

  // Style animé pour le menu paramètres
  const settingsMenuAnimatedStyle = useAnimatedStyle(() => {
    const opacity = settingsMenuOpacity.value;
    console.log('🔧 [Settings] Style animé - opacité actuelle:', opacity);
    return {
      opacity: opacity,
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
    console.log('🐛 [SubMenu] Ouverture:', menuName);
    setActiveSubMenu(menuName);
    subMenuOpacity.value = withTiming(1, {duration: 200});
  };

  // Fonction pour fermer le sous-menu
  const closeSubMenu = () => {
    console.log('🐛 [SubMenu] Fermeture');
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

      // 🎯 Animation ultra-fluide style YouTube/IPTV Smarters Pro
      // Utilise spring avec damping/stiffness au lieu de bounciness/speed
      // pour un mouvement plus naturel et moins saccadé
      RNAnimated.parallel([
        RNAnimated.spring(viewPosition.x, {
          toValue: snapX,
          useNativeDriver: false,
          damping: 20,        // Plus élevé = moins de rebond (YouTube: 15-25)
          stiffness: 150,     // Rigidité modérée pour fluidité (YouTube: 120-180)
          mass: 1,            // Masse standard pour mouvement naturel
          overshootClamping: false, // Permet léger dépassement naturel
          restDisplacementThreshold: 0.01,
          restSpeedThreshold: 0.01,
        }),
        RNAnimated.spring(viewPosition.y, {
          toValue: snapY,
          useNativeDriver: false,
          damping: 20,        // Synchronisé avec X pour cohérence
          stiffness: 150,
          mass: 1,
          overshootClamping: false,
          restDisplacementThreshold: 0.01,
          restSpeedThreshold: 0.01,
        }),
      ]).start();

      // Reset drag position
      dragPosition.setValue({x: 0, y: 0});
    }
  };

  // Ne pas faire de return conditionnel avant d'avoir utilisé tous les hooks !
  // On gère la visibilité avec une condition dans le render

  // 🚀 Position et taille avec mémorisation stable (sans animation pour éviter l'erreur Reanimated)
  const renderPosition = React.useMemo(() => {
    if (localFullscreen) {
      return {left: 0, top: 0};
    } else if (!isInChannelPlayerScreen && !isFullscreen) {
      // Mode PiP draggable : combiner viewPosition + drag
      return {
        left: RNAnimated.add(viewPosition.x, dragPosition.x),
        top: RNAnimated.add(viewPosition.y, dragPosition.y),
      };
    } else {
      return {left: finalPosition.x, top: finalPosition.y};
    }
  }, [localFullscreen, isInChannelPlayerScreen, isFullscreen, finalPosition]); // Dependencies objets stables

  const renderSize = React.useMemo(() => {
    if (localFullscreen) {
      return {width: screenWidth, height: screenHeight}; // Utiliser constantes
    } else {
      return {width: finalSize.width, height: finalSize.height};
    }
  }, [localFullscreen, finalSize]); // Dependencies objets stables

  // Force la synchronisation une seule fois avec debounce (évite boucles infinies)
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 🚀 Synchronisation optimisée avec références stables
  const syncPositionRef = useRef(finalPosition);
  const syncSizeRef = useRef(finalSize);
  const lastSyncedPositionRef = useRef({x: 0, y: 0}); // Track last synced position

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
          const lastPos = lastSyncedPositionRef.current;
          const shouldSync =
            (lastPos.x === 0 && lastPos.y === 0) ||
            Math.abs(lastPos.x - currentPosition.x) > 20 ||
            Math.abs(lastPos.y - currentPosition.y) > 20;

          if (shouldSync) {
            viewPosition.setValue({x: currentPosition.x, y: currentPosition.y});
            lastSyncedPositionRef.current = {x: currentPosition.x, y: currentPosition.y};
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

  const calculatedOpacity =
    isFullscreen && !isInChannelPlayerScreen ? 1 : isVisible ? 1 : 0;
  const usingFullscreenStyle = isFullscreen && !isInChannelPlayerScreen;

  const PlayerContent = (
    <RNAnimated.View
      style={[
        // Utiliser un style différent si en fullscreen dans Modal
        usingFullscreenStyle
          ? styles.fullscreenPlayerContent
          : styles.container,
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
          zIndex:
            isFullscreen || localFullscreen
              ? 99999
              : isInChannelPlayerScreen
              ? 1
              : 1000,
          elevation:
            isFullscreen || localFullscreen
              ? 999
              : isInChannelPlayerScreen
              ? 0
              : 10,
          shadowOpacity: isInChannelPlayerScreen ? 0 : 0.3, // Pas d'ombre dans ChannelPlayerScreen
          backgroundColor:
            isFullscreen || localFullscreen ? '#000000' : 'transparent',
        },
      ]}>
      {/* Video persistante - jamais démontée */}
      {channel ? (
        <>
          {playerType === 'vlc' ? (
            // VLC intégré désactivé - Redirection vers VLC externe
            <View style={styles.externalPlayerPlaceholder}>
              <Text style={styles.externalPlayerText}>📱 Ouverture dans VLC externe...</Text>
              <Text style={styles.externalPlayerSubtext}>{channel.name}</Text>
            </View>
          ) : (
            <Video
              key={`video-${channel.id}-${retryState}-${retryCount}`} // Key dynamique pour forcer rechargement pendant retry
              ref={videoRef}
            source={{
              uri: channel.url,
            // 🔧 Headers pour améliorer compatibilité IPTV + Pluto TV
            headers: {
              'User-Agent': channel.url?.includes('vodalys.com')
                ? 'VLC/3.0.16 LibVLC/3.0.16'
                : 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
              Referer: channel.url?.includes('pluto.tv')
                ? 'https://pluto.tv/'
                : channel.url?.includes('vodalys.com')
                ? 'https://www.assemblee-nationale.fr/'
                : 'https://www.iptvsmarters.com/',
              Accept: '*/*',
              Connection: 'keep-alive',
              Origin: channel.url?.includes('pluto.tv')
                ? 'https://pluto.tv'
                : undefined,
            },
          }}
          style={[
            styles.video,
            videoSettings.customVideoDimensions && {
              position: 'absolute',
              width: videoSettings.customVideoDimensions.width,
              height: videoSettings.customVideoDimensions.height,
              top: videoSettings.customVideoDimensions.top,
              left: videoSettings.customVideoDimensions.left,
              backgroundColor: 'black',
            },
          ]}
          resizeMode={
            videoSettings.zoomMode === 'fill'
              ? 'cover'
              : videoSettings.zoomMode === 'fit'
              ? 'contain'
              : videoSettings.zoomMode === 'stretch'
              ? 'stretch'
              : (videoSettings.zoomMode === '4:3' || videoSettings.zoomMode === '16:9')
              ? 'cover'
              : 'contain'
          }
          paused={isPaused}
          playInBackground={true}  // Forcer à true pour test
          playWhenInactive={true}  // Forcer à true pour test
          controls={false}
          preventsDisplaySleepDuringVideoPlayback={false}  // Permettre sleep si background
          ignoreSilentSwitch={videoPlayerSettings.backgroundPlay}
          mixWithOthers="mix"  // Toujours mixer avec autres apps
          continuePlaying={videoPlayerSettings.backgroundPlay}
          focusable={false}
          muted={selectedAudioTrack === 0}
          volume={selectedAudioTrack === 0 ? 0 : 1}
          selectedAudioTrack={memoizedAudioTrack}
          selectedVideoTrack={memoizedVideoTrack}
          selectedTextTrack={memoizedTextTrack}
          // 🆕 Performance & Décodage
          disableFocus={!videoPlayerSettings.hardwareAcceleration}
          // 🆕 Timeout réseau (en millisecondes)
          operationTimeout={videoPlayerSettings.networkTimeout * 1000}
          subtitleStyle={{
            fontSize:
              subtitleSize === 'small'
                ? 14
                : subtitleSize === 'normal'
                ? 18
                : subtitleSize === 'large'
                ? 24
                : subtitleSize === 'xlarge'
                ? 30
                : 18,
            paddingBottom: 10,
            paddingTop: 10,
          }}
          onError={error => {
            const errorString = error.error?.errorString || '';
            console.error('❌ [GlobalVideoPlayer] Video Error:', {
              channel: channel.name,
              url: channel.url,
              error: errorString,
            });

            // Gestion spéciale de ERROR_CODE_BEHIND_LIVE_WINDOW
            if (
              errorString.includes('ERROR_CODE_BEHIND_LIVE_WINDOW') ||
              errorString.includes('BEHIND_LIVE_WINDOW')
            ) {
              console.log(
                '🔄 [GlobalVideoPlayer] Rechargement automatique du flux (trop de retard sur le live)',
              );
                return; // Ne pas afficher l'erreur à l'utilisateur
            }

            // Détecter les erreurs de réseau
            const isNetworkError =
              errorString.includes('ERROR_CODE_IO_NETWORK_CONNECTION_FAILED') ||
              errorString.includes('NETWORK_CONNECTION_FAILED') ||
              errorString.includes('Unable to connect to') ||
              errorString.includes('Connection refused') ||
              errorString.includes('Network timeout') ||
              errorString.includes('Host not found') ||
              errorString.includes('No network connection') ||
              errorString.includes('Internet connection');

            // Détecter les erreurs HTTP (bad status, 404, 403, etc.)
            const isHttpError =
              errorString.includes('ERROR_CODE_IO_BAD_HTTP_STATUS') ||
              errorString.includes('HTTP 404') ||
              errorString.includes('HTTP 403') ||
              errorString.includes('HTTP 500') ||
              errorString.includes('Bad HTTP status') ||
              errorString.includes('Not Found') ||
              errorString.includes('Forbidden') ||
              errorString.includes('Server Error');

            if (isNetworkError) {
              console.log(`🌐 [GlobalVideoPlayer] Erreur réseau pour ${channel.name}:`, errorString);

              // 🔄 Machine à états : lancer le retry automatiquement
              if (retryCount < maxRetries && retryState === 'idle') {
                console.log(`🔄 [GlobalVideoPlayer] Démarrage machine à états retry pour ${channel.name}`);

                // Afficher un message temporaire PENDANT le retry
                actions.setError(`${channel.name}: Tentative de reconnexion...`);
                actions.setLoading(false);

                // Démarrer le cycle de retry dans le store
                actions.startRetry();
                return; // IMPORTANT: ne pas continuer, laisser la machine à états gérer
              }

              // Si on est en échec final, ne rien faire
              if (retryState === 'failed') {
                console.log(`🔄 [GlobalVideoPlayer] Erreur ignorée - état final: ${retryState}`);
                return;
              }

              // Si on est en retry, ne pas bloquer le cycle avec setError
              if (retryState === 'retrying') {
                console.log(`🔄 [GlobalVideoPlayer] Erreur réseau détectée pendant retry - état: ${retryState}, tentative: ${retryCount}`);
                // NE PAS appeler setError() car ça bloque le cycle de retry
                // Laisser la machine à états continuer son travail
                return;
              }

              // Afficher l'erreur finale (quand tout est épuisé)
              const errorMsg = `${channel.name}: Erreur de connexion réseau`;
              actions.setError(errorMsg);
              actions.setLoading(false);
              return;
            }

            if (isHttpError) {
              console.log(`🌐 [GlobalVideoPlayer] Erreur HTTP pour ${channel.name}:`, errorString);

              // 🔄 Machine à états : même logique pour les erreurs HTTP
              if (retryCount < maxRetries && retryState === 'idle') {
                console.log(`🔄 [GlobalVideoPlayer] Démarrage machine à états retry HTTP pour ${channel.name}`);

                actions.setError(`${channel.name}: Tentative de reconnexion au serveur...`);
                actions.setLoading(false);
                actions.startRetry();
                return;
              }

              // Si on est en échec final, ne rien faire
              if (retryState === 'failed') {
                console.log(`🔄 [GlobalVideoPlayer] Erreur HTTP ignorée - état final: ${retryState}`);
                return;
              }

              // Si on est en retry, ne pas bloquer le cycle avec setError
              if (retryState === 'retrying') {
                console.log(`🔄 [GlobalVideoPlayer] Erreur HTTP détectée pendant retry - état: ${retryState}, tentative: ${retryCount}`);
                // NE PAS appeler setError() car ça bloque le cycle de retry
                // Laisser la machine à états continuer son travail
                return;
              }

              const errorMsg = `Impossible de lire cette chaîne. Réessayez plus tard`;
              actions.setError(errorMsg);
              actions.setLoading(false);
              return;
            }

            // Détecter les erreurs de format/codec non supportés
            const isFormatError =
              errorString.includes('This video cannot be played') ||
              errorString.includes('format not supported') ||
              errorString.includes('codec not supported') ||
              errorString.includes('Could not open file') ||
              errorString.includes('failed to open stream') ||
              errorString.includes('Unable to open stream');

            if (isFormatError && playerManager.getPlayerType() === 'default') {
              console.log(`❌ [GlobalVideoPlayer] Format non supporté pour ${channel.name}:`, errorString);

              // Afficher le message d'erreur format non supporté
              playerManager.showFormatNotSupportedError(channel.url);

              // Marquer comme erreur pour arrêter le chargement
              const errorMsg = `${channel.name}: Format non supporté`;
              actions.setError(errorMsg);
              actions.setLoading(false);
              return;
            }

            const errorMsg = `${channel.name}: ${
              errorString || 'Erreur de lecture'
            }`;
            actions.setError(errorMsg);
            actions.setLoading(false); // ⚡ CRUCIAL: Forcer la fin du chargement en cas d'erreur
          }}
          onLoadStart={async () => {
            console.log('🎬 Video LoadStart - Channel:', channel.name);
            if (!channel || isLoading) {
              actions.setLoading(true);
            }

            // ✅ CONTRÔLE PARENTAL SIMPLIFIÉ
            // Le PIN est déjà vérifié au niveau de la catégorie dans ChannelsScreen
            // Pas de vérification supplémentaire nécessaire ici
            console.log(`✅ [PARENTAL] Accès autorisé - PIN catégorie vérifié en amont pour: ${channel.name}`);
          }}
          onLoad={data => {
            console.log('🎬 Video Load Success - Channel:', channel.name);
            setDuration(data.duration || 0);
            actions.setLoading(false);

            // 🔄 Succès ! Si on était en retry, réinitialiser l'état
            if (retryState === 'retrying' || retryState === 'failed') {
              console.log(`✅ [GlobalVideoPlayer] Retry réussi pour ${channel.name} - Réinitialisation état`);
              actions.resetRetry();
              actions.clearError(); // Effacer le message d'erreur temporaire
            }

            // Si seekTime est défini (venant du multiscreen), reprendre à cette position
            if (
              channel.seekTime !== undefined &&
              channel.seekTime > 0 &&
              videoRef.current
            ) {
              console.log(
                '⏩ [GlobalVideoPlayer] Reprise depuis multiscreen à position:',
                channel.seekTime,
                's',
              );
              setTimeout(() => {
                videoRef.current?.seek(channel.seekTime);
              }, 100); // Petit délai pour s'assurer que la vidéo est prête
            }

            // Détecter les pistes disponibles
            if (data.videoTracks && data.videoTracks.length > 0) {
              console.log(
                '📹 [Video] Pistes vidéo disponibles:',
                data.videoTracks,
              );
              setAvailableVideoTracks(data.videoTracks);
            }

            if (data.audioTracks && data.audioTracks.length > 0) {
              console.log(
                '🔊 [Audio] Pistes audio disponibles:',
                data.audioTracks,
              );
              setAvailableAudioTracks(data.audioTracks);
            }

            if (data.textTracks && data.textTracks.length > 0) {
              console.log(
                '📝 [Subtitles] Pistes sous-titres disponibles:',
                data.textTracks,
              );
              setAvailableTextTracks(data.textTracks);
            }
          }}
          onProgress={data => {
            const time = data.currentTime || 0;
            setCurrentTime(time);
          }}
          onBuffer={({isBuffering}) => {
            // 🕵️ CORRECTION: Gérer l'état de buffering pour afficher un indicateur et comprendre les freezes.
            actions.setLoading(isBuffering);
          }}
          playInBackground={false}
          pictureInPicture={false}
          useTextureView={true}
          controls={false}
          ignoreSilentSwitch="ignore"
          playWhenInactive={false}
          bufferConfig={videoSettings.getBufferConfig()}
          maxBitRate={3000000}
          reportBandwidth={false}
          automaticallyWaitsToMinimizeStalling={false}
          preventsDisplaySleepDuringVideoPlayback={true}
          progressUpdateInterval={2000}
          mixWithOthers="duck"
            />
          )}
        </>
      ) : null}

      {/* 🏷️ Indicateur de format de streaming - overlay principal */}
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
              styles.errorOverlay,
            ]}>
            <Text style={styles.overlayText}>{error}</Text>
          </View>
        )}
        {/* 🎯 ZONES GESTUELLES AVANCÉES - FULLSCREEN UNIQUEMENT */}
        {/* ⚠️ IMPORTANT: Désactivées quand contrôles visibles pour permettre l'interaction */}
        {isFullscreen || localFullscreen ? (
          <>
            {/* ⚠️ ZONE TAP UNIQUE: Simple tap = contrôles, Double tap bords = seek */}
            {/* La zone reste active même quand l'écran est verrouillé pour permettre de réafficher le bouton déverrouillage */}
            {(!(tiviMateControls.isVisible || dockerControls.isVisible) || videoSettings.isScreenLocked) && (
              <TouchableWithoutFeedback onPress={handleScreenPress}>
                <View style={styles.gestureZoneFullScreen} />
              </TouchableWithoutFeedback>
            )}

            {/* 🎯 CONTRÔLES TIVIMATE - Enveloppé pour gérer les pointerEvents */}
            <Animated.View
              style={[
                styles.controlsOverlay,
                controlsAnimatedStyle,
                {
                  pointerEvents: tiviMateControls.isVisible ? 'box-none' : 'none',
                },
              ]}>
              <TiviMateControls
                isVisible={tiviMateControls.isVisible}
                channel={channel}
                isChannelFavorite={isChannelFavorite}
                isScreenLocked={videoSettings.isScreenLocked}
                isFromMultiScreen={isFromMultiScreen}
                showSettingsMenu={showSettingsMenu}
                isFromAutoStart={isFromAutoStart}
                isPaused={isPaused}
                onBackPress={handleBackPress}
                onFavoriteToggle={handleFavoriteToggle}
                onLockToggle={() => videoSettings.toggleScreenLock()}
                onSettingsToggle={() => {
                  // 🚫 Désactiver les settings seulement pendant le vrai autostart live (pas pour films/séries)
                  if (isFromAutoStart && (!channel?.contentType || channel.contentType === 'live')) {
                    console.log('🚫 [Settings] Désactivé pendant l\'autostart des chaînes live');
                    return;
                  }
                  console.log(
                    '🐛 [Settings] Toggle - État actuel:',
                    showSettingsMenu,
                    'contentType:',
                    channel?.contentType || 'live',
                  );
                  setShowSettingsMenu(!showSettingsMenu);
                  console.log('🐛 [Settings] Nouvel état:', !showSettingsMenu);
                }}
                onPlayPauseToggle={() => {
                  console.log('▶️ [Play/Pause] Bouton cliqué');
                  actions.togglePlayPause();
                }}
              />
            </Animated.View>

            {/* 🎯 DOCKER TIVIMATE - Seulement pour les chaînes live (pas films/séries) */}
            {console.log(`🐳 [Docker] contentType: ${channel?.contentType || 'live'}, afficher docker: ${!channel?.contentType || channel.contentType === 'live'}`) ||
             (!channel?.contentType || channel.contentType === 'live') && (
              <Animated.View
                style={[
                  styles.dockerOverlay,
                  dockerAnimatedStyle,
                  {
                    pointerEvents: dockerControls.isVisible ? 'box-none' : 'none',
                  },
                ]}>
                <DockerBar
                isVisible={dockerControls.isVisible}
                channel={channel}
                epgData={epgData}
                recentChannels={stableRecentChannels}
                isFromMultiScreen={isFromMultiScreen}
                isFromAutoStart={isFromAutoStart}
                currentTime={currentTime}
                duration={duration}
                onChannelsPress={() => {
                  console.log(
                    '🎬 [ChannelSelector] Ouverture sélecteur de chaînes',
                  );
                  channelSelector.open();
                }}
                onMultiScreenPress={() => {
                  actions.setMultiScreenOpen(true);
                  setMultiScreenVisible(true);
                  console.log(
                    '🖥️ [MultiScreen] Ouverture du sélecteur multi-écrans',
                  );
                }}
                onRecentChannelPress={recentChannel => {
                  if (recentChannel.url) {
                    const channelToPlay = {
                      id: recentChannel.id,
                      name: recentChannel.name,
                      url: recentChannel.url,
                      logo: recentChannel.logo,
                      category: recentChannel.category,
                    };
                    actions.playChannel(channelToPlay, true);
                  }
                }}
                onClearRecentChannels={() => setShowClearConfirmModal(true)}
                onScrollBegin={() => {
                  console.log('🏃‍♂️ [Scroll] Début du scroll - prolonger délai');
                  setIsScrolling(true);
                }}
                onScrollEnd={() => {
                  console.log('⏸️ [Scroll] Fin du scroll - délai normal');
                  setTimeout(() => {
                    setIsScrolling(false);
                  }, 1000);
                }}
              />
              </Animated.View>
            )}

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
            onPress={handleVideoPress}
            onLongPress={actions.togglePlayPause}
            activeOpacity={0.8}
            disabled={isClickProcessing}>
            {/* Boutons PiP - seulement visible quand PiP draggable */}
            {!isInChannelPlayerScreen &&
              !isFullscreen &&
              !localFullscreen &&
              pipButtonsControls.isVisible && (
                <RNAnimated.View style={{opacity: pipButtonsControls.rnOpacity}}>
                  {/* Bouton resize PiP (comme IPTV Smarters Pro) */}
                  <TouchableOpacity
                    style={styles.pipResizeButton}
                    onPress={toggleResize}
                    hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                    <Icon name="zoom-out-map" size={17} color="white" />
                  </TouchableOpacity>

                  {/* Bouton fermer PiP - fermeture directe */}
                  <TouchableOpacity
                    style={styles.pipCloseButton}
                    onPress={handleClosePiP}
                    hitSlop={{top: 4, bottom: 4, left: 4, right: 4}}>
                    <Icon
                      name="close"
                      size={18}
                      color="white"
                    />
                  </TouchableOpacity>
                </RNAnimated.View>
              )}
          </TouchableOpacity>
        )}

        {/* 🎯 MENU PARAMÈTRES - Intégré dans le lecteur vidéo */}
        <SettingsMenu
          showSettingsMenu={showSettingsMenu}
          settingsMenuAnimatedStyle={{
            opacity: showSettingsMenu ? 1 : 0,
          }}
          activeSubMenu={activeSubMenu}
          subMenuAnimatedStyle={subMenuAnimatedStyle}
          zoomMode={videoSettings.zoomMode}
          bufferMode={videoSettings.bufferMode}
          sleepTimer={sleepTimer}
          availableVideoTracks={availableVideoTracks}
          availableAudioTracks={availableAudioTracks}
          availableSubtitleTracks={availableTextTracks}
          selectedVideoQuality={selectedVideoQuality}
          selectedAudioTrack={selectedAudioTrack}
          selectedSubtitleTrack={selectedSubtitleTrack}
          onClose={() => {
            console.log('🔧 [GlobalVideoPlayer] onClose appelé - fermeture menu settings');
            setShowSettingsMenu(false);
            setActiveSubMenu(null);
          }}
          onOpenSubMenu={openSubMenu}
          onCloseSubMenu={() => {
            console.log('🔧 [GlobalVideoPlayer] onCloseSubMenu appelé - fermeture sous-menu');
            closeSubMenu();
          }}
          onZoomModeChange={videoSettings.setZoomMode}
          onBufferModeChange={videoSettings.setBufferMode}
          onSleepTimerChange={setSleepTimer}
          onVideoQualityChange={setSelectedVideoQuality}
          onAudioTrackChange={(track: number) => setSelectedAudioTrack(track)}
          onSubtitleTrackChange={(track: number) => setSelectedSubtitleTrack(track)}
          audioDelay={audioDelay}
          subtitleDelay={subtitleDelay}
          subtitleSize={subtitleSize}
        />
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
      playlistId={navigationData?.playlistId || storePlaylistId}
      currentChannel={channel}
      initialLayout={multiScreenLayout}
      initialSlots={multiScreenSlots}
      initialActiveSlot={multiScreenActiveSlot}
      onStateChange={(layout, slots, activeSlot) => {
        console.log('💾 [GlobalVideoPlayer] Sauvegarde état multiscreen:', {
          layout,
          slotsCount: slots.length,
          activeSlot,
        });
        setMultiScreenLayout(layout);
        setMultiScreenSlots(slots);
        setMultiScreenActiveSlot(activeSlot);
      }}
onChannelFullscreen={selectedChannel => {
            console.log(
              '🎬 [MultiScreen -> Fullscreen] Lancement de la chaîne:',
              selectedChannel.name,
            );
            // 1. Fermer le multi-écran
            setMultiScreenVisible(false);
            actions.setMultiScreenOpen(false);

            // 2. Attendre la fin de l'animation de fermeture du Modal (environ 300ms)
            setTimeout(() => {
              // Lancer la chaîne en mode fullscreen
              actions.playChannel(selectedChannel, true); // true for fullscreen

              // Indiquer que l'on vient du multi-écran
              actions.setFromMultiScreen(true);
            }, 300);
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

      {/* 🎨 Arrière-plan de rotation avec animation douce */}
      <RotationBackground isVisible={showRotationBackground} />

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
          <View style={styles.fullscreenContainer}>{PlayerContent}</View>
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

      
      {/* Modal de confirmation d'effacement moderne */}
      <Modal
        visible={showClearConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowClearConfirmModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Icon name="delete-outline" size={32} color="#ff5252" />
              <Text style={styles.modalTitle}>Effacer l'historique</Text>
            </View>

            <Text style={styles.modalMessage}>
              Voulez-vous effacer toutes les chaînes récentes ?
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowClearConfirmModal(false)}>
                <Text style={styles.modalButtonTextCancel}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={() => {
                  setShowClearConfirmModal(false);
                  handleClearRecentChannels();
                }}>
                <Icon name="delete-sweep" size={20} color="#fff" style={{marginRight: 8}} />
                <Text style={styles.modalButtonTextConfirm}>Effacer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de sélection de chaînes - Overlay */}
      <Modal
        visible={channelSelector.isVisible}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => channelSelector.close()}>
        <TouchableOpacity
          style={styles.channelSelectorOverlay}
          activeOpacity={1}
          onPress={() => {
            console.log('🎬 [ChannelSelector] Fermeture par clic extérieur');
            channelSelector.close();
          }}>
          <View style={styles.channelSelectorContainer}>
            {/* Contenu: Sidebar catégories + Liste chaînes */}
            <View style={styles.channelSelectorContent}>
              {/* Sidebar catégories */}
              <View style={styles.channelSelectorSidebar}>
                {/* Bouton retour */}
                <TouchableOpacity
                  style={styles.selectorBackButton}
                  onPress={() => channelSelector.close()}>
                  <Icon
                    name="keyboard-arrow-left"
                    size={24}
                    color="#fff"
                  />
                  <Text style={styles.selectorBackButtonText}>Retour</Text>
                </TouchableOpacity>

                {channelSelector.categories.length > 0 ? (
                  <FlashList
                    data={channelSelector.categories}
                    renderItem={renderSelectorCategoryItem}
                    keyExtractor={(item) => item.id}
                    estimatedItemSize={50}
                    showsVerticalScrollIndicator={false}
                    extraData={channelSelector.selectedCategory}
                    removeClippedSubviews={true}
                  />
                ) : (
                  <Text style={styles.channelSelectorEmptyText}>
                    Aucune catégorie
                  </Text>
                )}
              </View>

              {/* Liste chaînes */}
              <View style={styles.channelSelectorList}>
                {channelSelector.isLoading ? (
                  <View style={styles.channelSelectorLoadingContainer}>
                    <Icon name="hourglass-empty" size={40} color="#666" />
                    <Text style={styles.channelSelectorLoadingText}>
                      Chargement...
                    </Text>
                  </View>
                ) : channelSelector.channels.length > 0 ? (
                  <FlashList
                    data={channelSelector.channels}
                    renderItem={renderSelectorChannelItem}
                    keyExtractor={(item, index) => `${item.id}_${index}`}
                    estimatedItemSize={60}
                    showsVerticalScrollIndicator={false}
                    onEndReached={() => channelSelector.loadMore()}
                    onEndReachedThreshold={0.5}
                    removeClippedSubviews={true}
                    drawDistance={200}
                  />
                ) : (
                  <View style={styles.channelSelectorEmptyContainer}>
                    <Icon name="tv-off" size={48} color="#666" />
                    <Text style={styles.channelSelectorEmptyText}>
                      Aucune chaîne dans cette catégorie
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>

      </Modal>

      {/* 🎭 Popup moderne de retry avec animation fluide */}
      {showRetryPopup && (
        <RNAnimated.View
          style={[
            styles.modernRetryPopup,
            {
              opacity: popupAnimValue,
              transform: [
                {
                  translateY: popupAnimValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0], // Slide up de 50px à 0px
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.modernRetryContent}>
            <RNAnimated.View
              style={[
                styles.modernRetryIcon,
                {
                  transform: [
                    {
                      rotate: iconRotationAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Icon
                name="refresh"
                size={20}
                color="#FFFFFF"
              />
            </RNAnimated.View>
            <Text style={styles.modernRetryText} numberOfLines={1}>
              {retryState === 'failed'
                ? 'Impossible de lire cette chaîne'
                : `Reconnexion en cours... (${retryCount + 1}/${maxRetries})`
              }
            </Text>
          </View>
        </RNAnimated.View>
      )}
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
    marginBottom: 16,
  },
  // 🎨 Styles pour les erreurs (design moderne type IPTV)
  errorOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  retryButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.8)', // Bleu moderne
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 0,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  retryIndicator: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  retryIndicatorText: {
    color: '#93C5FD', // Bleu clair
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  errorInfoBox: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(31, 41, 55, 0.8)', // Gris foncé
    borderRadius: 12,
    maxWidth: '85%',
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
  },
  errorInfoText: {
    color: '#D1D5DB', // Gris clair
    fontSize: 13,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 6,
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
  // Zone fullscreen pour simple tap + double tap (comme YouTube)
  gestureZoneFullScreen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 15,
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
    fontWeight: '500', // Rendu moins gras pour être plus discret
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
    zIndex: 10000,
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
    zIndex: 10001,
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
    zIndex: 10002,
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
    height: 80, // Réduit de 90 à 80 pour correspondre à la hauteur des items
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
    width: 85,
    paddingHorizontal: 2,
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
  activeChannelCard: {
    backgroundColor: 'rgba(60, 60, 60, 1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 12,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  inactiveChannelCard: {
    opacity: 0.7,
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

  // Modal de confirmation moderne
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#ffffff',
    marginLeft: 12,
    flex: 1,
  },
  modalMessage: {
    fontSize: 16,
    color: '#cccccc',
    marginBottom: 24,
    lineHeight: 24,
  },
  modalButtons: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    minHeight: 50,
  },
  modalButtonCancel: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalButtonConfirm: {
    backgroundColor: '#ff5252',
    shadowColor: '#ff5252',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalButtonTextCancel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  modalButtonTextConfirm: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  // 📺 Styles pour l'overlay de sélection de chaînes
  channelSelectorOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.05)', // Encore plus transparent pour voir la vidéo en arrière-plan
  },
  channelSelectorContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  channelSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  channelSelectorHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  channelSelectorTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#fff',
  },
  channelSelectorCount: {
    fontSize: 14,
    color: '#999',
    marginLeft: 8,
  },
  channelSelectorCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  channelSelectorContent: {
    flex: 1,
    flexDirection: 'row',
  },
  // Sidebar catégories
  channelSelectorSidebar: {
    width: 250,
    backgroundColor: 'rgba(25, 25, 35, 0.70)', // Niveau de transparence ajusté
    borderRightWidth: 0,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  channelSelectorSidebarTitle: {
    fontSize: 12,
    fontWeight: 'bold' as const,
    color: '#999',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  selectorBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  selectorBackButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500' as const,
    marginLeft: 8,
  },
  selectorCategoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12, // Augmenté pour plus de taille
    paddingHorizontal: 12,
    marginHorizontal: 0,
    marginBottom: 0, // Supprimé pour compacter
    borderRadius: 0,
    backgroundColor: 'transparent', // Fond transparent, le sidebar a déjà une couleur
    borderBottomWidth: 1, // Séparateur fin
    borderBottomColor: 'rgba(255, 255, 255, 0.05)', // Couleur discrète
  },
  selectorCategoryItemActive: {
    backgroundColor: '#00ACC1',
    borderLeftWidth: 4,
    borderLeftColor: '#00838F',
  },
  selectorCategoryNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectorCategoryIcon: {
    marginRight: 8,
  },
  selectorCategoryText: {
    fontSize: 15,
    color: '#ccc',
    fontWeight: '500' as const,
    flex: 1,
  },
  selectorCategoryTextActive: {
    color: '#fff',
    fontWeight: 'bold' as const,
  },
  selectorCategoryCount: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
    fontWeight: '600' as const,
  },
  selectorCategoryCountActive: {
    color: '#fff',
  },
  // Liste chaînes
  channelSelectorList: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: 0,
    paddingHorizontal: 0,
    marginRight: '35%', // Prend 65% de l'écran pour plus d'espace vide à droite
  },
  selectorChannelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8, // Augmenté pour plus de taille des chaînes
    paddingHorizontal: 12,
    marginHorizontal: 0,
    marginBottom: 0, // Supprimé pour compacter
    borderRadius: 0, // Bords droits
    backgroundColor: 'rgba(25, 25, 35, 0.6)', // Plus transparent
    borderBottomWidth: 1, // Ligne de séparation
    borderBottomColor: 'rgba(255, 255, 255, 0.05)', // Couleur discrète
  },
  selectorChannelLogo: {
    width: 32, // Réduit
    height: 32, // Réduit
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  selectorChannelLogoImage: {
    width: 40,
    height: 40,
    borderRadius: 4,
  },
  selectorChannelLogoFallback: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: '#ff9800',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorChannelLogoText: {
    fontSize: 14,
    fontWeight: 'bold' as const,
    color: '#fff',
  },
  selectorChannelName: {
    flex: 1,
    fontSize: 15,
    color: '#fff',
    fontWeight: '500' as const,
  },
  // ✅ Styles pour chaîne en cours de lecture (IDENTIQUE aux catégories)
  selectorChannelItemActive: {
    backgroundColor: '#00ACC1', // ✅ Même cyan que catégories
    borderLeftWidth: 4, // ✅ Même bordure que catégories
    borderLeftColor: '#00838F', // ✅ Même couleur que catégories
  },
  selectorChannelNameActive: {
    color: '#fff', // ✅ Blanc comme catégories
    fontWeight: 'bold' as const, // ✅ Bold comme catégories
  },
  // États vides et loading
  channelSelectorLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  channelSelectorLoadingText: {
    fontSize: 16,
    color: '#999',
    marginTop: 8,
  },
  channelSelectorEmptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  channelSelectorEmptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  // Styles pour le placeholder de lecteur externe
  externalPlayerPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 20,
  },
  externalPlayerText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  externalPlayerSubtext: {
    color: '#CCCCCC',
    fontSize: 14,
    textAlign: 'center',
  },
  
  // 🎭 Styles modernes pour la popup de retry avec animation
  modernRetryPopup: {
    position: 'absolute',
    bottom: 100, // Position en bas de l'écran
    alignSelf: 'center', // Centré horizontalement
    zIndex: 9999,
  },
  modernRetryContent: {
    backgroundColor: 'rgba(30, 30, 30, 0.95)', // Fond semi-transparent foncé
    borderRadius: 20, // Bords très arrondis pour design moderne
    paddingHorizontal: 20, // Augmenté pour plus d'espace
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    minWidth: 350, // Garder la largeur qui fonctionnait bien
    maxWidth: '95%', // Maximum d'espace pour le texte complet
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)', // Léger bordure pour effet premium
  },
  modernRetryIcon: {
    marginRight: 8, // Réduit pour plus d'espace pour le texte
    // Animation de rotation subtile pour l'icône de refresh
  },
  modernRetryText: {
    color: '#FFFFFF',
    fontSize: 13, // Encore plus réduit pour éviter la troncature
    fontWeight: '500', // Un peu moins gras pour économiser de l'espace
    textAlign: 'center',
    letterSpacing: 0.2, // Espacement réduit
    flex: 1, // Permet au texte de bien s'adapter
  },
});

export default GlobalVideoPlayer;
