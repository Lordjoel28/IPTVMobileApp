/**
 * 📺 ChannelPlayerScreen - Interface IPTV Smarters Pro authentique
 * Layout 3 zones: Liste chaînes (gauche) + Mini lecteur (droite haut) + EPG future (droite bas)
 */

import React, {useState, useEffect, useRef, useCallback} from 'react';
// import { WatermelonXtreamService } from '../services/WatermelonXtreamService'; // TEMPORAIRE: Désactivé (GitHub Issue #3692)
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Dimensions,
  Pressable,
  ScrollView,
  Modal,
  Animated,
  Platform,
  InteractionManager,
  TextInput,
} from 'react-native';
import {FlashList} from '@shopify/flash-list';
import FastImage from 'react-native-fast-image'; // ✅ FastImage pour logos optimisés
// StatusBar géré par StatusBarManager centralisé
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  List,
  Avatar,
  IconButton,
  Card,
  ProgressBar,
  Text as PaperText,
} from 'react-native-paper';
import {BlurView} from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import MiniPlayerContainer from '../components/MiniPlayerContainer'; // Container pour GlobalVideoPlayer singleton
import {usePlayerStore} from '../stores/PlayerStore'; // Store global vidéo
import {useRecentChannelsStore} from '../stores/RecentChannelsStore'; // Store simple pour chaînes récentes
import EPGCompact from '../components/EPGCompact'; // Guide EPG compact sous mini-lecteur
import {
  useRoute,
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import type {RootStackParamList, Channel, Category} from '../types';
import { useThemeColors } from '../contexts/ThemeContext';
import { useImmersiveScreen } from '../hooks/useStatusBar';

const {width, height} = Dimensions.get('window');

interface ChannelPlayerScreenProps {
  route: {
    params: {
      playlistId: string;
      allCategories: Category[];
      initialCategory: Category;
      initialChannels: Channel[];
      selectedChannel: Channel;
      playlistName: string;
    };
  };
}

type NavigationProp = StackNavigationProp<RootStackParamList>;

// Fonction pour nettoyer le nom de la chaîne
const cleanChannelName = (name: string) => {
  if (!name) return '';
  // Supprime le texte entre parenthèses (1080p) et crochets [Geo-blocked]
  return name.replace(/\s*\([^)]*\)|\[[^\]]*\]/g, '').trim();
};

const ChannelPlayerScreen: React.FC<ChannelPlayerScreenProps> = ({route}) => {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const navigation = useNavigation<NavigationProp>();

  // StatusBar immersif automatique pour cet écran
  useImmersiveScreen('ChannelPlayer', true);
  const miniPlayerPlaceholderRef = useRef<View>(null);
  const channelsListRef = useRef<FlashList<Channel>>(null);
  const {
    playlistId,
    allCategories,
    initialCategory,
    initialChannels,
    selectedChannel: initialChannel,
    playlistName,
  } = route.params;

  // 🎬 Connexion au PlayerStore global
  const playerStore = usePlayerStore();
  const {actions: playerActions} = playerStore;

  // 🕰️ Connexion au store des chaînes récentes
  const {setRecentChannels: setStoreRecentChannels} = useRecentChannelsStore();

  // 📺 Métadonnées EPG (récupérées depuis AsyncStorage saved_m3u_playlists)
  const [playlistMetadata, setPlaylistMetadata] = useState<
    {epgType?: string; epgUrl?: string} | null | undefined
  >(undefined);

  // 🎯 Charger métadonnées EPG au montage
  useEffect(() => {
    const loadPlaylistMetadata = async () => {
      try {
        const AsyncStorage = await import(
          '@react-native-async-storage/async-storage'
        );
        const savedData = await AsyncStorage.default.getItem(
          'saved_m3u_playlists',
        );
        if (savedData) {
          const playlists = JSON.parse(savedData);
          const currentPlaylist = Array.isArray(playlists)
            ? playlists.find(p => p.id === playlistId)
            : null;

          if (currentPlaylist && currentPlaylist.metadata) {
            setPlaylistMetadata(currentPlaylist.metadata);
            console.log(
              '🎯 [ChannelPlayer] Métadonnées EPG chargées:',
              currentPlaylist.metadata,
            );
          } else {
            setPlaylistMetadata(null); // Pas d'EPG intégré
            console.log('📺 [ChannelPlayer] Aucun EPG intégré trouvé');
          }
        } else {
          setPlaylistMetadata(null); // Pas de playlists sauvées
        }
      } catch (error) {
        console.error(
          '❌ [ChannelPlayer] Erreur chargement métadonnées EPG:',
          error,
        );
        setPlaylistMetadata(null); // Erreur = pas d'EPG
      }
    };

    if (playlistId) {
      loadPlaylistMetadata();
    }
  }, [playlistId]);

  // Indiquer au PlayerStore qu'on est dans ChannelPlayerScreen
  useEffect(() => {
    playerActions.setInChannelPlayerScreen(true);

    return () => {
      playerActions.setInChannelPlayerScreen(false);
    };
  }, [playerActions]);

  // 🚀 Précharger les logos initiaux au montage
  useEffect(() => {
    if (initialChannels.length > 0) {
      setTimeout(() => {
        const logosToPreload = initialChannels
          .slice(0, 20)
          .filter(ch => ch.logo && ch.logo.trim())
          .map(ch => ({
            uri: ch.logo!,
            priority: FastImage.priority.high,
            cache: FastImage.cacheControl.immutable,
          }));

        if (logosToPreload.length > 0) {
          FastImage.preload(logosToPreload);
        }
      }, 100);
    }
  }, []);

  // 🔄 Synchronisation avec PlayerStore : Mettre à jour selectedChannel quand une chaîne est lancée depuis l'extérieur
  const lastSyncedChannelIdRef = useRef<string | null>(null);

  // 👁️ Tracker de la dernière position de scroll pour détection intelligente
  const lastScrolledIndexRef = useRef<number | null>(null);

  // 👁️ Fonction ultra-simple : scroll seulement si on change significativement d'index
  const needsScrollToChannel = useCallback((channelIndex: number): boolean => {
    if (!channelsListRef.current || channelIndex < 0) {
      return false;
    }

    try {
      // Approche ultra-simple : comparer avec la dernière position scrollée
      const lastScrolledIndex = lastScrolledIndexRef.current;

      if (lastScrolledIndex === null) {
        // Premier scroll - toujours nécessaire
        console.log('👁️ [ChannelPlayerScreen] Premier scroll nécessaire vers index:', channelIndex);
        return true;
      }

      // Calculer la distance depuis le dernier scroll
      const distanceFromLastScroll = Math.abs(channelIndex - lastScrolledIndex);
      const scrollThreshold = 5; // Scroll seulement si on s'éloigne de plus de 5 positions

      const needsScroll = distanceFromLastScroll > scrollThreshold;

      console.log('👁️ [ChannelPlayerScreen] Analyse scroll:', {
        channelIndex,
        lastScrolledIndex,
        distanceFromLastScroll,
        scrollThreshold,
        needsScroll
      });

      return needsScroll;
    } catch (error) {
      console.warn('👁️ [ChannelPlayerScreen] Erreur analyse scroll:', error);
      return true; // En cas d'erreur, forcer le scroll pour être sûr
    }
  }, []);

  useEffect(() => {
    // Garde anti-boucle : éviter les synchronisations redondantes
    if (!playerStore.channel || playerStore.channel.id === lastSyncedChannelIdRef.current) {
      return;
    }

    // 🚀 SYNCHRONISATION IMMÉDIATE ET ATOMIQUE pour éviter double surlignage
    if (!selectedChannel || playerStore.channel.id !== selectedChannel.id) {
      console.log('🔄 [ChannelPlayerScreen] Synchronisation PlayerStore -> UI:', {
        currentSelected: selectedChannel?.name || 'none',
        newFromStore: playerStore.channel.name,
        lastSynced: lastSyncedChannelIdRef.current
      });

      // Mise à jour atomique pour éviter états intermédiaires
      const newChannel = playerStore.channel;
      setSelectedChannel(newChannel);
      lastSyncedChannelIdRef.current = newChannel.id;

      // 👁️ Auto-scroll intelligent : seulement si nécessaire
      const channelIndex = channels.findIndex(ch => ch.id === playerStore.channel?.id);
      if (channelIndex !== -1 && channelsListRef.current) {

        // Vérifier si un scroll est nécessaire pour cette chaîne
        const shouldScroll = needsScrollToChannel(channelIndex);

        if (shouldScroll) {
          console.log('📜 [ChannelPlayerScreen] Scroll nécessaire vers index:', channelIndex);

          // 🚀 AUTO-SCROLL IMMÉDIAT ET INVISIBLE
          requestAnimationFrame(() => {
            if (!channelsListRef.current) return;

            try {
              // Méthode hybride : scrollToIndex pour précision, mais sans viewPosition
              channelsListRef.current.scrollToIndex({
                index: channelIndex,
                animated: false,
                viewPosition: 0.5 // Centrer la chaîne
              });

              console.log('📜 [ChannelPlayerScreen] Auto-scroll intelligent réussi vers index:', channelIndex);
              lastScrolledIndexRef.current = channelIndex;
            } catch (error) {
              // Fallback immédiat avec scrollToOffset
              try {
                const itemHeight = 60;
                const listHeight = 400;
                const centerOffset = (listHeight / 2) - (itemHeight / 2);
                const targetOffset = Math.max(0, (channelIndex * itemHeight) - centerOffset);

                channelsListRef.current.scrollToOffset({
                  offset: targetOffset,
                  animated: false
                });
                lastScrolledIndexRef.current = channelIndex;
              } catch (fallbackError) {
                // Erreur silencieuse
              }
            }
          });
        } else {
          console.log('📜 [ChannelPlayerScreen] Pas de scroll nécessaire pour index:', channelIndex);
        }
      }
    }
  }, [playerStore.channel?.id, channels]); // ✅ Suppression de selectedChannel des dépendances

  // Force la définition de miniPlayerRect au premier render
  useEffect(() => {
    // Calculer les dimensions immédiatement sans attendre onLayout
    const screenWidth = Dimensions.get('window').width;
    const leftPanelWidth = screenWidth * 0.43;
    const headerHeight = 62;
    const mainLayoutMarginTop = 8;
    const rightPanelMarginLeft = 4;

    const calculatedX = leftPanelWidth + 4 + rightPanelMarginLeft;
    const calculatedY = headerHeight + mainLayoutMarginTop;
    const calculatedWidth =
      screenWidth - leftPanelWidth - 4 - rightPanelMarginLeft;
    const calculatedHeight = miniPlayerHeight;

    playerActions.setMiniPlayerRect({
      x: calculatedX,
      y: calculatedY,
      width: calculatedWidth,
      height: calculatedHeight,
    });
  }, [miniPlayerHeight, playerActions]);

  // Auto-démarrage de la chaîne pré-sélectionnée - Robuste avec garde anti-double-démarrage
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    // Garde pour éviter double-exécution
    if (hasInitializedRef.current) {
      return;
    }

    // 📋 DÉFINIR LE PLAYLISTID pour l'historique récent
    playerActions.setPlaylistId(playlistId);

    // Utiliser InteractionManager pour s'assurer que l'écran est prêt
    InteractionManager.runAfterInteractions(() => {
      // Vérifier si le PlayerStore a déjà une chaîne (venant de la recherche)
      if (playerStore.channel && playerStore.channel.id !== selectedChannel?.id) {
        console.log('🔄 [ChannelPlayerScreen] PlayerStore a déjà une chaîne:', playerStore.channel.name);
        lastSyncedChannelIdRef.current = playerStore.channel.id; // Éviter re-sync
        setSelectedChannel(playerStore.channel);
        hasInitializedRef.current = true;
        return; // Ne pas démarrer la chaîne initiale
      }

      if (selectedChannel) {
        console.log('🎬 [ChannelPlayerScreen] Auto-démarrage initial:', selectedChannel.name);
        playerActions.playChannel(selectedChannel, false);
        lastSyncedChannelIdRef.current = selectedChannel.id; // Marquer comme synchronisé

        // 📜 Auto-scroll initial intelligent vers la chaîne sélectionnée depuis ChannelsScreen
        const channelIndex = channels.findIndex(ch => ch.id === selectedChannel.id);
        if (channelIndex !== -1 && channelsListRef.current) {

          // Pour l'auto-scroll initial, on peut être plus permissif et centrer la chaîne
          console.log('📜 [ChannelPlayerScreen] Auto-scroll initial vers chaîne:', selectedChannel.name, 'index:', channelIndex);

          // 🚀 AUTO-SCROLL INITIAL EFFICACE
          requestAnimationFrame(() => {
            if (!channelsListRef.current) return;

            try {
              // Utiliser scrollToIndex avec centrage pour l'auto-scroll initial
              channelsListRef.current.scrollToIndex({
                index: channelIndex,
                animated: false,
                viewPosition: 0.5 // Centrer parfaitement
              });

              console.log('📜 [ChannelPlayerScreen] Auto-scroll initial réussi vers index:', channelIndex);
              lastScrolledIndexRef.current = channelIndex;
            } catch (error) {
              // Fallback avec scrollToOffset
              try {
                const itemHeight = 60;
                const listHeight = 400;
                const centerOffset = (listHeight / 2) - (itemHeight / 2);
                const targetOffset = Math.max(0, (channelIndex * itemHeight) - centerOffset);

                channelsListRef.current.scrollToOffset({
                  offset: targetOffset,
                  animated: false
                });
                lastScrolledIndexRef.current = channelIndex;
              } catch (fallbackError) {
                // Erreur silencieuse
              }
            }
          });
        }
      }

      hasInitializedRef.current = true;
    });
  }, []); // Une seule fois au montage

  // États locaux pour rendre le composant autonome (selon spec Gemini)
  const [categories, setCategories] = useState<Category[]>(allCategories);
  // Trouver la catégorie qui contient la chaîne sélectionnée (pour les recherches)
  const findCategoryWithChannel = (channelToFind: Channel) => {
    for (let i = 0; i < allCategories.length; i++) {
      const category = allCategories[i];
      if (category.channels && category.channels.some(ch => ch.id === channelToFind.id)) {
        return { category, index: i };
      }
    }
    return null;
  };

  const channelCategoryResult = findCategoryWithChannel(initialChannel);

  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(() => {
    // Si la chaîne sélectionnée est dans une autre catégorie, utiliser cette catégorie
    if (channelCategoryResult) {
      console.log('🔍 [ChannelPlayerScreen] Chaîne trouvée dans catégorie:', channelCategoryResult.category.name);
      return channelCategoryResult.index;
    }
    // Sinon utiliser la catégorie initiale
    return allCategories.findIndex(cat => cat.id === initialCategory.id);
  });

  const [channels, setChannels] = useState<Channel[]>(() => {
    // Si la chaîne sélectionnée est dans une autre catégorie, utiliser ses chaînes
    if (channelCategoryResult && channelCategoryResult.category.channels) {
      return channelCategoryResult.category.channels;
    }
    // Sinon utiliser les chaînes initiales
    return initialChannels;
  });

  const [selectedChannel, setSelectedChannel] =
    useState<Channel>(initialChannel);

  const [showFullscreenPlayer, setShowFullscreenPlayer] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0); // 🚀 Temps vidéo pour transition rapide
  const [shouldKeepCurrentChannel, setShouldKeepCurrentChannel] =
    useState(false); // Flag pour éviter changement auto
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [favoriteChannels, setFavoriteChannels] = useState<string[]>([]); // IDs des chaînes favorites
  const [isChannelLoading, setIsChannelLoading] = useState(false); // Indicateur de chargement non-bloquant

  // Nouveaux états pour les données vidéo réelles
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  // videoCurrentTime déjà déclaré ligne 89
  const [videoMetadata, setVideoMetadata] = useState<any>(null);

  // États pour interface TiviMate
  const [showTiviMateControls, setShowTiviMateControls] = useState(true);

  // 🚀 CACHE MÉMOIRE pour récents - éviter AsyncStorage fréquent
  const recentChannelsCache = useRef<{
    data: Channel[];
    lastUpdate: number;
    isDirty: boolean;
  }>({
    data: [],
    lastUpdate: 0,
    isDirty: false
  });


  // Animations pour les contrôles TiviMate
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const controlsTimer = useRef<NodeJS.Timeout | null>(null);

  // Charger les favoris au montage
  useEffect(() => {
    loadFavorites();
  }, []);

  // Fonction pour charger les favoris depuis AsyncStorage
  const loadFavorites = async () => {
    try {
      const AsyncStorage = await import(
        '@react-native-async-storage/async-storage'
      );
      const favoritesData = await AsyncStorage.default.getItem(
        `favorites_${playlistId}`,
      );
      if (favoritesData) {
        const favorites = JSON.parse(favoritesData);
        setFavoriteChannels(favorites);
      }
    } catch (error) {
      console.error('❌ Erreur chargement favoris:', error);
    }
  };

  // État pour les chaînes récentes
  const [recentChannels, setRecentChannels] = useState<Channel[]>([]);

  // 🚀 Charger les chaînes récentes avec cache mémoire optimisé
  const loadRecentChannels = async () => {
    try {
      const cache = recentChannelsCache.current;

      // Si le cache est récent (moins de 5 minutes), l'utiliser
      const now = Date.now();
      if (cache.data.length > 0 && (now - cache.lastUpdate) < 300000) {
        setRecentChannels(cache.data);
        setStoreRecentChannels(cache.data);
        return;
      }

      // Charger depuis AsyncStorage en arrière-plan
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      const recentKey = `recent_channels_${playlistId}`;
      const recentData = await AsyncStorage.default.getItem(recentKey);

      if (recentData) {
        const recentChannelsData = JSON.parse(recentData);

        // Mettre à jour le cache
        cache.data = recentChannelsData;
        cache.lastUpdate = now;
        cache.isDirty = false;

        // Mettre à jour l'UI
        setRecentChannels(recentChannelsData);
        setStoreRecentChannels(recentChannelsData);
      }
    } catch (error) {
      console.error('❌ Erreur chargement récents:', error);
    }
  };

  // Charger les récents au montage
  useEffect(() => {
    loadRecentChannels();
  }, [playlistId]);

  // Synchroniser avec le store chaque fois que recentChannels change - OPTIMISÉ
  const lastSyncedLengthRef = useRef(0);
  useEffect(() => {
    // Éviter les synchronisations inutiles si la longueur n'a pas changé
    if (
      recentChannels.length > 0 &&
      recentChannels.length !== lastSyncedLengthRef.current
    ) {
      setStoreRecentChannels(recentChannels);
      lastSyncedLengthRef.current = recentChannels.length;
    }
  }, [recentChannels, setStoreRecentChannels]);

  // Fonction pour obtenir le nombre de chaînes pour une catégorie
  const getCategoryChannelCount = (
    category: Category,
    currentChannels: Channel[],
  ): number => {
    // Si c'est la catégorie "RÉCENTS" (détection correcte)
    if (
      category.name.toLowerCase().includes('récent') ||
      category.name.toLowerCase().includes('recent') ||
      category.name.includes('📺') ||
      category.id.includes('history') ||
      category.id.includes('recent')
    ) {
      return recentChannels.length;
    }

    // Si c'est la catégorie "FAVORIS" (détection par nom)
    if (
      category.name.toLowerCase().includes('favoris') ||
      category.name.includes('💙')
    ) {
      return favoriteChannels.length;
    }

    // Si c'est la catégorie active, utiliser les chaînes actuellement affichées
    if (categories[currentCategoryIndex]?.id === category.id) {
      return currentChannels.length;
    }

    // Sinon, utiliser les chaînes associées à la catégorie
    return category.channels?.length || 0;
  };

  // 🔴 Logique LIVE: afficher seulement si vraiment en direct
  const isReallyLive = (channel: Channel) => {
    // Vérifier si la chaîne est vraiment en live
    // Par défaut: true pour chaînes TV classiques, false pour VOD
    return (
      !channel.name.toLowerCase().includes('vod') &&
      !channel.name.toLowerCase().includes('replay') &&
      !channel.url.includes('.mp4') &&
      !channel.url.includes('.mkv')
    );
  };

  // Mode immersif géré par StatusBarManager centralisé
  useFocusEffect(
    React.useCallback(() => {
      // Plus de logique StatusBar complexe - tout est centralisé
      return () => {
        // Cleanup sera géré par useImmersiveScreen
      };
    }, []),
  );

  // Mise à jour de l'heure et date temps réel
  useEffect(() => {
    const updateTimeAndDate = () => {
      const now = new Date();
      const timeString = now.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const dateString = now.toLocaleDateString('fr-FR', {
        weekday: 'short', // Dim, Lun, Mar...
        day: '2-digit',
        month: 'short', // Jan, Fév, Mar...
      });
      setCurrentTime(timeString);
      setCurrentDate(dateString);
    };

    updateTimeAndDate(); // Mise à jour immédiate
    const interval = setInterval(updateTimeAndDate, 1000); // Mise à jour chaque seconde

    return () => clearInterval(interval); // Cleanup
  }, []);

  // Le panneau de gauche a une largeur fixe, le panneau de droite est flexible
  const leftPanelWidth = width * 0.43;

  // 🎯 RATIO COMME IPTV SMARTERS PRO - LECTEUR COMPACT OPTIMISÉ
  // Lecteur plus visible pour débugger le problème d'affichage
  const rightPanelWidth = width - leftPanelWidth - 4; // Largeur restante moins l'espacement
  const miniPlayerHeight = Math.min(
    rightPanelWidth * (9 / 16), // Ratio 16:9
    200, // Augmenté pour meilleure visibilité (était 180)
  );

  // ===== LOGIQUE DE NAVIGATION ENTRE CATÉGORIES (Spec Gemini) =====
  const handleNextCategory = () => {
    const nextIndex = currentCategoryIndex + 1;
    if (nextIndex < categories.length) {
      setCurrentCategoryIndex(nextIndex);
    }
  };

  const handlePreviousCategory = () => {
    const prevIndex = currentCategoryIndex - 1;
    if (prevIndex >= 0) {
      setCurrentCategoryIndex(prevIndex);
    }
  };

  // Ce useEffect réagit au changement de catégorie pour mettre à jour l'UI (Spec Gemini)
  useEffect(() => {
    if (categories.length === 0) {
      return;
    }

    const newCategory = categories[currentCategoryIndex];
    if (newCategory) {
      // 🔧 CHARGEMENT DES CHAÎNES PAR CATÉGORIE
      let newChannels: Channel[];

      // Catégorie RÉCENTS - utiliser les vraies chaînes regardées
      if (
        newCategory.name.toLowerCase().includes('recent') ||
        newCategory.id.includes('recent')
      ) {
        newChannels = recentChannels;
      }
      // Catégorie initiale (celle d'origine)
      else if (
        newCategory.id === initialCategory.id &&
        initialChannels.length > 0
      ) {
        newChannels = initialChannels;
      }
      // Autres catégories
      else {
        newChannels = newCategory.channels || [];

        // 🎯 CAS SPÉCIAL: RÉCENTS - toujours charger les vraies chaînes récentes depuis AsyncStorage
        if (
          newCategory.name.toLowerCase().includes('récent') ||
          newCategory.name.includes('📺') ||
          newCategory.id.includes('recent') ||
          newCategory.id.includes('history')
        ) {
          loadChannelsForCategory(newCategory.id, newCategory.name);
          return; // Exit early, loadChannelsForCategory gérera les setState avec les vraies chaînes
        }

        if (newChannels.length === 0) {
          loadChannelsForCategory(newCategory.id, newCategory.name);
          return; // Exit early, loadChannelsForCategory gérera les setState
        }
      }

      setChannels(newChannels);
      // Précharger les logos
      preloadChannelLogos(newChannels);

      // JAMAIS changer automatiquement la chaîne lors de la navigation
      // L'utilisateur garde sa chaîne actuelle peu importe la catégorie

      // Optionnel: Log si la chaîne actuelle est dans la nouvelle catégorie
      const currentChannelInNewCategory = newChannels.find(
        ch => ch.id === selectedChannel.id,
      );
    }
  }, [currentCategoryIndex, categories, initialChannels]);

  const handleBack = () => {
    try {
      navigation.goBack();
    } catch (error) {
      console.error('❌ Erreur navigation retour:', error);
    }
  };

  const handleChannelSelect = React.useCallback(
    (channel: Channel) => {
      console.log('🎯 [ChannelPlayerScreen] handleChannelSelect:', channel.name);

      // 1. Éviter sélection si déjà sélectionnée (comparaison robuste)
      if (selectedChannel && (
          selectedChannel.id === channel.id ||
          (selectedChannel.url === channel.url && selectedChannel.name === channel.name)
        )) {
        console.log('🔄 [ChannelPlayerScreen] Chaîne déjà sélectionnée, ignorer');
        return;
      }

      // 2. MISE À JOUR UI IMMÉDIATE pour éviter double surlignage
      setSelectedChannel(channel);
      lastSyncedChannelIdRef.current = channel.id;

      // 3. DÉMARRAGE IMMÉDIAT - Actions critiques en parallèle
      setIsChannelLoading(true);
      setIsPlaying(true);

      // Lancer immédiatement la vidéo - priorité absolue
      playerActions.playChannel(channel, false);

      // 4. ACTIONS NON-CRITIQUES EN ARRIÈRE-PLAN
      // Utiliser micro-tâche pour libérer immédiatement le thread principal
      Promise.resolve().then(() => {
        // Arrêter l'indicateur de chargement rapidement
        setTimeout(() => setIsChannelLoading(false), 200);

        // Ajouter aux récents en arrière-plan
        addToRecentChannelsOptimized(channel);
      });
    },
    [playerActions, selectedChannel?.id],
  );

  // 🚀 Version ultra-optimisée avec cache mémoire
  const addToRecentChannelsOptimized = React.useCallback(
    async (channel: Channel) => {
      try {
        const cache = recentChannelsCache.current;

        // 1. VÉRIFICATION CACHE MÉMOIRE FIRST
        if (cache.data.length > 0 && cache.data[0].id === channel.id) {
          // Déjà en première position dans le cache, rien à faire
          return;
        }

        // 2. MISE À JOUR CACHE MÉMOIRE (instantané)
        let updatedRecents = [...cache.data];

        // Supprimer si déjà présent
        updatedRecents = updatedRecents.filter(recent => recent.id !== channel.id);

        // Ajouter en tête avec timestamp
        const recentChannel = {
          ...channel,
          watchedAt: new Date().toISOString(),
        };
        updatedRecents.unshift(recentChannel);

        // Limiter à 20 chaînes
        updatedRecents = updatedRecents.slice(0, 20);

        // Mettre à jour le cache
        cache.data = updatedRecents;
        cache.lastUpdate = Date.now();
        cache.isDirty = true;

        // 3. MISE À JOUR UI IMMÉDIATE
        setRecentChannels(updatedRecents);

        // 4. SAUVEGARDE ASYNCSTORAGE EN ARRIÈRE-PLAN (non-bloquant)
        setTimeout(async () => {
          try {
            const AsyncStorage = await import('@react-native-async-storage/async-storage');
            const recentKey = `recent_channels_${playlistId}`;
            await AsyncStorage.default.setItem(recentKey, JSON.stringify(updatedRecents));
            cache.isDirty = false; // Marquer comme sauvegardé
          } catch (error) {
            console.error('❌ Erreur sauvegarde récents:', error);
          }
        }, 100); // Délai minimal pour ne pas bloquer l'UI

      } catch (error) {
        console.error('❌ Erreur ajout récents optimisé:', error);
      }
    },
    [playlistId],
  );

  const handleMiniPlayerPress = (isFullscreen: boolean) => {
    setShowFullscreenPlayer(isFullscreen);
  };

  const handleCloseFullscreen = (isFullscreen: boolean = false) => {
    setShowFullscreenPlayer(isFullscreen);
  };

  // 🚀 Handlers pour transition rapide
  // handlePlayPauseChange déclaré plus tard (ligne ~484)

  // handleVideoLoad déclaré plus tard avec setVideoMetadata (ligne ~480)

  // Fonctions pour interface TiviMate
  useEffect(() => {
    if (showTiviMateControls) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-masquer les contrôles après 3 secondes
      if (controlsTimer.current) {
        clearTimeout(controlsTimer.current);
      }
      controlsTimer.current = setTimeout(() => {
        hideTiviMateControls();
      }, 3000);
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }

    return () => {
      if (controlsTimer.current) {
        clearTimeout(controlsTimer.current);
      }
    };
  }, [showTiviMateControls]);

  const hideTiviMateControls = () => {
    setShowTiviMateControls(false);
  };

  const toggleTiviMateControls = () => {
    setShowTiviMateControls(!showTiviMateControls);
  };

  const handleTiviMateChannelSelect = (selectedChannel: Channel) => {
    handleChannelSelect(selectedChannel);
  };

  // Fonction pour ouvrir la nouvelle page de recherche modale
  const openSearchScreen = () => {
    // Préparer toutes les chaînes disponibles pour la recherche
    // CORRECTION: Utiliser la catégorie "TOUT" qui contient toutes les chaînes
    const allChannels = categories.find(cat => cat.id === 'all')?.channels || [];

    console.log('🔍 [ChannelPlayerScreen] Opening search with:');
    console.log('  - categories length:', categories.length);
    console.log('  - allChannels length:', allChannels.length);
    console.log('  - playlistId:', playlistId);

    // Stocker les données de navigation dans le PlayerStore pour la recherche
    const navigationData = {
      playlistId: playlistId,
      allCategories: categories,
      initialCategory: initialCategory || categories[0] || { id: 'all', name: 'Toutes', count: allChannels.length, channels: allChannels },
      initialChannels: allChannels,
      playlistName: playlistName,
      useWatermelonDB: false
    };

    // Utiliser le PlayerStore pour passer les données
    usePlayerStore.getState().actions.setNavigationData(navigationData);

    console.log('🔍 [ChannelPlayerScreen] Navigation data stored:', {
      playlistId: navigationData.playlistId,
      channelsCount: navigationData.initialChannels.length,
      firstChannel: navigationData.initialChannels[0]?.name,
      categoryName: navigationData.initialCategory.name
    });

    // Naviguer vers SearchScreen
    navigation.navigate('Search');
  };



  // Gestionnaires pour VideoPlayer
  const handleVideoProgress = (data: any) => {
    setVideoCurrentTime(data.currentTime);
    setVideoDuration(data.seekableDuration || data.duration || 0);
    if (data.seekableDuration && data.seekableDuration > 0) {
      setVideoProgress(data.currentTime / data.seekableDuration);
    }
  };

  const handleVideoLoad = (data: any) => {
    setVideoMetadata(data);
  };

  const handlePlayPauseChange = (playing: boolean) => {
    setIsPlaying(playing);
  };

  // Fonction pour extraire les badges techniques réels
  const getTechnicalBadges = () => {
    const badges = [];

    // Badge qualité depuis channel.quality ou URL
    if (selectedChannel.quality) {
      badges.push(selectedChannel.quality.toUpperCase());
    } else if (selectedChannel.url.includes('1080')) {
      badges.push('FHD');
    } else if (selectedChannel.url.includes('720')) {
      badges.push('HD');
    } else {
      badges.push('SD');
    }

    // Badge FPS (estimation basique)
    if (videoMetadata?.naturalSize?.height >= 1080) {
      badges.push('25 FPS');
    } else {
      badges.push('25 FPS');
    }

    // Badge Audio (IPTV généralement stéréo)
    badges.push('STÉRÉO');

    return badges;
  };

  // Fonction pour calculer les informations de programme réelles
  const getRealProgramInfo = () => {
    const now = new Date();
    const startTime = new Date(now);
    startTime.setMinutes(0, 0, 0); // Arrondir à l'heure

    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + 1); // Programme d'1 heure

    const formatTime = (date: Date) =>
      date.toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'});

    const elapsedMinutes = Math.floor(
      (now.getTime() - startTime.getTime()) / (1000 * 60),
    );
    const totalMinutes = 60;
    const progress = Math.max(0, Math.min(1, elapsedMinutes / totalMinutes));

    return {
      currentShow: selectedChannel.name,
      currentTime: `${formatTime(startTime)} – ${formatTime(endTime)}`,
      duration: `${totalMinutes - elapsedMinutes} min restantes`,
      progress: progress,
      nextShow: 'Programme suivant',
    };
  };

  const realProgramInfo = getRealProgramInfo();
  const technicalBadges = getTechnicalBadges();

  // 🚀 Préchargement des logos pour affichage instantané
  const preloadChannelLogos = (channelsList: Channel[], limit: number = 20) => {
    setTimeout(() => {
      const logosToPreload = channelsList
        .slice(0, limit)
        .filter(ch => ch.logo && ch.logo.trim())
        .map(ch => ({
          uri: ch.logo!,
          priority: FastImage.priority.high,
          cache: FastImage.cacheControl.immutable,
        }));

      if (logosToPreload.length > 0) {
        FastImage.preload(logosToPreload);
      }
    }, 50);
  };

  // 🔍 CHARGEMENT DYNAMIQUE basé sur patterns GitHub/Reddit - FIX prototype error avec AsyncStorage
  const loadChannelsForCategory = async (
    categoryId: string,
    categoryName: string,
  ) => {
    try {
      // 🎯 CAS SPÉCIAL: Catégorie RÉCENTS - charger et utiliser les vraies chaînes récentes
      if (
        categoryName.toLowerCase().includes('récent') ||
        categoryName.toLowerCase().includes('recent') ||
        categoryName.includes('📺') ||
        categoryId.includes('history') ||
        categoryId.includes('recent')
      ) {
        // Charger les récents depuis AsyncStorage
        const AsyncStorage = await import(
          '@react-native-async-storage/async-storage'
        );
        const recentKey = `recent_channels_${playlistId}`;
        const recentData = await AsyncStorage.default.getItem(recentKey);

        if (recentData) {
          const recentChannelsData = JSON.parse(recentData);
          setChannels(recentChannelsData);
          // Précharger les logos
          preloadChannelLogos(recentChannelsData);
          // Aussi mettre à jour l'état local pour la cohérence
          setRecentChannels(recentChannelsData);
          setStoreRecentChannels(recentChannelsData);
        } else {
          setChannels([]);
        }
        return;
      }

      // Import AsyncStorage (alternative safe à WatermelonDB)
      const AsyncStorage = await import(
        '@react-native-async-storage/async-storage'
      );

      // Clé pour les chaînes de cette catégorie
      const cacheKey = `channels_${playlistId}_${categoryId}`;

      const cachedData = await AsyncStorage.default.getItem(cacheKey);
      if (cachedData) {
        const channelsData = JSON.parse(cachedData);
        setChannels(channelsData);
        // Précharger les logos
        preloadChannelLogos(channelsData);
        // JAMAIS changer la chaîne lors du chargement dynamique
      } else {
        // Fallback vers category.channels
        const fallbackChannels =
          categories.find(cat => cat.id === categoryId)?.channels || [];
        if (fallbackChannels.length > 0) {
          setChannels(fallbackChannels);
          // Précharger les logos
          preloadChannelLogos(fallbackChannels);
          // Ne pas changer la chaîne automatiquement en fallback non plus
        }
      }
    } catch (error) {
      console.error(
        `❌ Erreur chargement AsyncStorage ${categoryName}:`,
        error,
      );
      // Fallback silencieux
      const fallbackChannels =
        categories.find(cat => cat.id === categoryId)?.channels || [];
      if (fallbackChannels.length > 0) {
        setChannels(fallbackChannels);
        // Précharger les logos
        preloadChannelLogos(fallbackChannels);
        // Même en cas d'erreur, ne pas changer automatiquement la chaîne
      }
    }
  };

  // 🚀 Composant ultra-optimisé avec React.memo et comparaison précise
  const ChannelListItem = React.memo(
    ({
      item,
      isSelected,
      onPress,
    }: {
      item: Channel;
      isSelected: boolean;
      onPress: (item: Channel) => void;
    }) => {
      // Mémoriser le style conditionnel pour éviter recreation
      const itemStyle = React.useMemo(() => [
        styles.channelListItem,
        isSelected && styles.channelListItemSelected,
      ], [isSelected]);

      const titleStyle = React.useMemo(() => [
        styles.channelTitle,
        isSelected && styles.channelTitleSelected,
      ], [isSelected]);

      // Mémoriser le handler pour éviter recreation
      const handlePress = React.useCallback(() => {
        onPress(item);
      }, [onPress, item]);

      return (
        <TouchableOpacity
          style={itemStyle}
          onPress={handlePress}
          activeOpacity={0.3}
          disabled={false}
          pointerEvents="auto">
          <View style={styles.channelItemContent}>
            {/* Logo ou Avatar */}
            <View style={styles.channelLogoContainer}>
              {item.logo ? (
                <FastImage
                  source={{
                    uri: item.logo,
                    priority: FastImage.priority.high, // ✅ Priorité haute
                    cache: FastImage.cacheControl.immutable, // ✅ Cache permanent
                  }}
                  style={styles.channelLogo}
                  resizeMode={FastImage.resizeMode.contain}
                />
              ) : (
                <Avatar.Text
                  label={item.name.substring(0, 2).toUpperCase()}
                  size={36}
                  style={styles.channelAvatarFallback}
                  labelStyle={styles.channelAvatarText}
                />
              )}
            </View>

            {/* Titre de la chaîne */}
            <View style={styles.channelTextContainer}>
              <Text
                style={titleStyle}
                numberOfLines={1}>
                {item.name}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    // 🎯 Comparaison personnalisée ultra-précise pour éviter re-renders inutiles
    (prevProps, nextProps) => {
      // Comparaison robuste qui évite les faux positifs
      const isSameChannel = (
        prevProps.item.id === nextProps.item.id &&
        prevProps.item.url === nextProps.item.url &&
        prevProps.item.name === nextProps.item.name
      );

      const isSameSelection = prevProps.isSelected === nextProps.isSelected;
      const isSameLogo = prevProps.item.logo === nextProps.item.logo;

      return isSameChannel && isSameSelection && isSameLogo;
    }
  );

  // 🚀 Fonction de comparaison robuste pour éviter double surlignage
  const isChannelSelected = React.useCallback((item: Channel): boolean => {
    if (!selectedChannel) return false;

    // 1. Comparaison par ID exact (priorité)
    if (item.id === selectedChannel.id) return true;

    // 2. Si les IDs sont identiques mais pas la même instance, comparer par URL et nom
    if (item.id !== selectedChannel.id) {
      // Comparaison stricte : URL ET nom doivent matcher exactement
      return item.url === selectedChannel.url &&
             item.name === selectedChannel.name;
    }

    return false;
  }, [selectedChannel]);

  // Rendu d'une chaîne dans la liste de gauche - Version ultra-optimisée
  const renderChannelItem = React.useCallback(
    ({item, index}: {item: Channel; index: number}) => {
      return (
        <ChannelListItem
          item={item}
          isSelected={isChannelSelected(item)}
          onPress={handleChannelSelect}
        />
      );
    },
    [isChannelSelected, handleChannelSelect],
  );

  return (
    <View style={styles.container}>
      {/* StatusBar gérée automatiquement par useImmersiveScreen */}
      {/* Header Version 2 - 3 blocs avec info chaîne courante */}
      <View style={styles.header}>
        {/* Bloc Gauche: Retour */}
        <View style={styles.headerLeftBlock}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.headerIconButton}>
            <Icon name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Bloc Central: Logo + Nom Chaîne */}
        <View style={styles.headerCenterBlock}>
          {selectedChannel.logo ? (
            <FastImage
              source={{
                uri: selectedChannel.logo,
                priority: FastImage.priority.high,
                cache: FastImage.cacheControl.immutable,
              }}
              style={styles.headerChannelLogo}
              resizeMode={FastImage.resizeMode.contain}
            />
          ) : (
            <Avatar.Text
              size={36}
              label={selectedChannel.name.substring(0, 2).toUpperCase()}
              style={styles.headerChannelLogo}
              labelStyle={{fontSize: 10, fontWeight: '600'}}
            />
          )}
          <Text style={styles.headerChannelName} numberOfLines={1}>
            {cleanChannelName(selectedChannel.name)}
          </Text>
        </View>

        {/* Bloc Droite: Heure + Date + Actions */}
        <View style={styles.headerRightBlock}>
          <View style={styles.headerTimeContainer}>
            <Text style={styles.headerTime}>{currentTime}</Text>
          </View>
          <View style={styles.headerIconContainer}>
            <TouchableOpacity
              onPress={openSearchScreen}
              style={styles.headerIconButton}>
              <Icon
                name="search"
                size={22}
                color={colors.text.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {}}
              style={styles.headerIconButton}>
              <Icon name="more-vert" size={20} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Layout 3 zones principal */}
      <View style={styles.mainLayout}>
        {/* Zone Gauche: Interface IPTV Smarters Pro avec sélecteur de catégories */}
        <View style={[styles.leftPanel, {width: leftPanelWidth}]}>
          {/* Sélecteur de catégorie avec IconButton et compteur intégré */}
          <View style={styles.categorySelector}>
            <TouchableOpacity
              onPress={handlePreviousCategory}
              style={styles.categoryArrow}
              disabled={currentCategoryIndex === 0}>
              <Icon
                name="arrow-back-ios"
                size={20}
                color={currentCategoryIndex === 0 ? colors.text.tertiary : colors.text.primary}
              />
            </TouchableOpacity>

            <Text style={styles.categoryTitle} numberOfLines={1}>
              {categories[currentCategoryIndex]?.name || 'Catégories'} (
              {categories[currentCategoryIndex]
                ? getCategoryChannelCount(
                    categories[currentCategoryIndex],
                    channels,
                  )
                : 0}
              )
            </Text>

            <TouchableOpacity
              onPress={handleNextCategory}
              style={styles.categoryArrow}
              disabled={currentCategoryIndex === categories.length - 1}>
              <Icon
                name="arrow-forward-ios"
                size={20}
                color={
                  currentCategoryIndex === categories.length - 1
                    ? '#444444'
                    : '#EAEAEA'
                }
              />
            </TouchableOpacity>
          </View>

          {/* La liste des chaînes */}
          <FlashList
            ref={channelsListRef}
            data={channels}
            renderItem={renderChannelItem}
            keyExtractor={(item, index) => `player-${item.id}-${index}`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.channelsListContent}
            estimatedItemSize={60}
            // 🚀 OPTIMISATIONS FLASHLIST ULTRA-PERFORMANTES
            drawDistance={500}
            estimatedListSize={{height: height * 0.7, width: width * 0.25}}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            extraData={selectedChannel.id}
          />
        </View>

        {/* Zone Droite: Mini lecteur + EPG future */}
        <View style={styles.rightPanel}>
          {/* MiniPlayerContainer avec GlobalVideoPlayer réactivé */}
          <View
            ref={miniPlayerPlaceholderRef}
            style={[styles.miniPlayerContainer, {height: miniPlayerHeight}]}>
            <MiniPlayerContainer height={miniPlayerHeight} />
          </View>

          {/* 🎯 ZONE EPG COMPACT - Guide minimaliste pour économiser l'espace */}
          <View style={styles.epgCompactContainer}>
            <EPGCompact
              selectedChannel={selectedChannel}
              playlistId={playlistId}
              playlistMetadata={playlistMetadata}
              onNavigateToFullEPG={() => {
                // Utiliser des données mockées simples pour éviter l'erreur payload
                const mockCategories = [
                  {
                    id: 'generaliste',
                    name: 'Généraliste',
                    channels: [
                      {
                        id: '1',
                        name: 'TF1 HD',
                        url: 'test1',
                        category: 'Généraliste',
                      },
                      {
                        id: '2',
                        name: 'France 2 HD',
                        url: 'test2',
                        category: 'Généraliste',
                      },
                      {
                        id: '3',
                        name: 'M6 HD',
                        url: 'test3',
                        category: 'Généraliste',
                      },
                    ],
                  },
                  {
                    id: 'actualites',
                    name: 'Actualités',
                    channels: [
                      {
                        id: '4',
                        name: 'BFM TV',
                        url: 'test4',
                        category: 'Actualités',
                      },
                      {
                        id: '5',
                        name: 'France Info',
                        url: 'test5',
                        category: 'Actualités',
                      },
                    ],
                  },
                  {
                    id: 'sport',
                    name: 'Sport',
                    channels: [
                      {
                        id: '6',
                        name: 'Eurosport 1',
                        url: 'test6',
                        category: 'Sport',
                      },
                      {
                        id: '7',
                        name: 'Canal+ Sport',
                        url: 'test7',
                        category: 'Sport',
                      },
                    ],
                  },
                ];

                const allMockChannels = mockCategories.flatMap(
                  cat => cat.channels,
                );

                // Navigation vers EPGCategoriesScreen avec données mockées
                navigation.navigate('EPGCategoriesScreen', {
                  allCategories: mockCategories,
                  allChannels: allMockChannels,
                  playlistId: 'mock-playlist',
                  playlistName: 'Guide EPG Test',
                });
              }}
              // Pas de height fixe - laisse le container flex gérer
            />
          </View>
        </View>
      </View>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: colors.surface.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.ui.border,
    position: 'relative',
  },

  // ===== HEADER REVISITÉ - LAYOUT CENTRÉ =====
  // Bloc Gauche
  headerLeftBlock: {
    position: 'absolute',
    left: 16,
  },

  // Bloc Central - PARFAITEMENT CENTRÉ
  headerCenterBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Centrage parfait du contenu
    maxWidth: '60%', // Limiter la largeur pour éviter débordement
  },

  // Bloc Droite
  headerRightBlock: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerChannelLogo: {
    width: 42,
    height: 42,
    marginRight: 12,
  },
  headerChannelName: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },

  headerTimeContainer: {
    alignItems: 'flex-end',
    marginRight: 16, // Espace augmenté entre l'heure et les icônes
  },
  headerTime: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '600',
  },
  headerDate: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  headerIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    padding: 8,
    marginLeft: 4,
  },

  // Layout 3 zones - STABLE POUR ÉVITER DÉCALAGES
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start', // Alignement top pour éviter décalage vertical
    marginTop: 8, // Espace sous le header
  },

  // Zone Gauche: Liste chaînes
  leftPanel: {
    backgroundColor: colors.surface.primary, // Restaurer un fond pour créer la séparation
    borderRadius: 8,
    marginRight: 4,
    overflow: 'hidden',
  },
  // Header supprimé selon les spécifications

  // ===== STYLES SÉLECTEUR DE CATÉGORIES MODERNISÉ - FIX ESPACEMENT =====
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 4,
    backgroundColor: colors.surface.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.ui.border,
    minHeight: 40,
  },
  categoryTitle: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  categoryArrow: {
    padding: 6, // Padding réduit pour un look plus fin
  },

  channelsListContent: {
    paddingVertical: 8,
  },
  // ===== STYLES TOUCHABLEOPACITY POUR LES CHAÎNES - CONTRÔLE TOTAL =====
  channelListItem: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 0,
    overflow: 'hidden',
  },
  channelListItemSelected: {
    backgroundColor: colors.surface.elevated, // Moins vif, comme dans ChannelsScreen
    borderRadius: 8, // Bords arrondis pour un look moderne
  },
  channelItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12, // Padding vertical généreux
    paddingHorizontal: 12, // Padding horizontal
    minHeight: 56, // Hauteur minimum augmentée pour zone tactile
  },
  channelLogoContainer: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  channelTitle: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: '500',
  },
  channelTitleSelected: {
    color: colors.accent.primary,
  },
  channelDescription: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  // Logo standardisé dans conteneur cohérent
  channelLogo: {
    width: 36, // Taille de logo réduite pour compacter
    height: 36,
    borderRadius: 8, // Arrondi standardisé
  },
  channelAvatarFallback: {
    backgroundColor: colors.surface.secondary,
    borderRadius: 4,
  },
  channelAvatarText: {
    color: colors.text.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  // Anciens styles supprimés - remplacés par List.Item

  // Zone Droite: Mini lecteur + EPG - MARGES OPTIMISÉES
  rightPanel: {
    flex: 1, // Remplir l'espace restant
    // Pas de flex: 1 - utilise width fixe pour éviter décalage liste chaînes
    marginLeft: 4, // Espacement de 4px avec le panneau de gauche
    justifyContent: 'flex-start', // Alignement top pour éviter décalage
  },

  // 🎯 STYLES MINI-LECTEUR - VERSION FONCTIONNELLE OPTIMISÉE
  miniPlayerContainer: {
    position: 'relative',
    backgroundColor: colors.background.secondary,
    marginBottom: 4,
    borderRadius: 12,
    shadowColor: colors.ui.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden', // Pour les coins arrondis
    // borderWidth: 2, // DEBUG: Border pour voir le container
    // borderColor: '#00FF00', // DEBUG: Vert visible
  },
  miniPlayer: {
    width: '100%',
    height: '100%',
  },

  // Debug placeholder temporaire
  debugPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
  },
  debugText: {
    color: '#00D4AA',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  debugSubtext: {
    color: '#888',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 8,
  },

  // 🎯 STYLES EPG COMPACT - Utilise tout l'espace comme la liste des chaînes
  epgCompactContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    elevation: 2,
    flex: 1, // Prend tout l'espace disponible comme la liste des chaînes
    marginTop: 4,
    overflow: 'hidden',
  },
  epgCardHeader: {
    backgroundColor: 'transparent',
    paddingBottom: 8,
  },
  epgCardTitle: {
    color: '#EAEAEA',
    fontSize: 16,
    fontWeight: '600',
  },
  epgCardContent: {
    flex: 1, // S'adapte à la hauteur flexible de la card
    paddingTop: 0,
  },
  currentProgramModern: {
    paddingHorizontal: 16, // Ajouter un espacement intérieur
    width: '100%', // S'assurer qu'il prend toute la largeur
  },

  // Programme Actuel avec ProgressBar
  currentProgramSection: {
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#00D4AA',
  },
  currentProgramTitle: {
    color: '#EAEAEA',
    fontWeight: '600',
    marginBottom: 8,
  },
  currentProgramTime: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  programTimeText: {
    color: '#00D4AA',
    fontWeight: '500',
    marginRight: 8,
  },
  liveBadgeNew: {
    backgroundColor: '#D92D20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8, // Arrondi standardisé
  },
  liveBadgeTextNew: {
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  currentProgramDescription: {
    color: '#888888',
    marginBottom: 12,
    lineHeight: 18,
  },
  programProgressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0, 212, 170, 0.2)',
  },

  // Programmes Suivants avec List.Section
  nextProgramsSection: {
    flex: 1,
  },
  nextProgramsHeader: {
    color: '#EAEAEA',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
  nextProgramItem: {
    paddingHorizontal: 0,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  nextProgramTitle: {
    color: '#EAEAEA',
    fontSize: 14,
    fontWeight: '500',
  },
  nextProgramDescription: {
    color: '#888888',
    fontSize: 12,
    lineHeight: 16,
  },
  nextProgramTime: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextProgramTimeText: {
    color: '#888888',
    fontWeight: '500',
  },

  // EPG Placeholder
  epgPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  epgPlaceholderText: {
    color: '#666666',
    fontSize: 14,
    fontStyle: 'italic',
  },

  // Fullscreen Player
  fullscreenPlayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    backgroundColor: 'black',
  },

  // ============ STYLES TIVIMATE (MODAL PLEIN ÉCRAN) ============

  tiviMateContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  tiviMateVideoContainer: {
    flex: 1,
  },
  tiviMateVideo: {
    width: '100%',
    height: '100%',
  },
  tiviMateTouchOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  // Style supprimé - non utilisé dans nouvelle structure
  tiviMateControlsOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },

  // Header vidéo supprimé comme demandé

  // Contrôles play/pause centraux
  tiviMatePlayControlsContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{translateX: -30}, {translateY: -30}],
    zIndex: 10, // Z-index élevé pour être au-dessus du background
  },
  tiviMatePlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -30,
    marginLeft: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 1000,
  },

  // Docker avec cartes de taille et opacité uniformes
  tiviMateDockerContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    zIndex: 999, // Z-index très élevé pour docker
  },
  tiviMateChannelList: {
    paddingHorizontal: 20,
  },
  tiviMateDockerButton: {
    width: 80,
    height: 80,
    alignItems: 'center',
    marginRight: 10,
    zIndex: 1000, // Z-index maximal
  },
  // Styles Docker supprimés - utilisation des styles unifiés de chaînes
  tiviMateChannelCard: {
    width: 80, // Taille unifiée
    height: 80, // Taille unifiée
    backgroundColor: 'rgba(40, 40, 40, 0.9)', // Opacité augmentée
    borderRadius: 15,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 16, // Z-index pour interactions
  },
  tiviMateChannelCardLogo: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  tiviMateChannelCardFallback: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tiviMateChannelCardText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },

  // Bouton de fermeture TiviMate
  tiviMateCloseButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1001,
  },
  tiviMateCloseButtonBlur: {
    ...StyleSheet.absoluteFillObject,
  },

  // ============ STYLES OVERLAY INFO CENTRAL V2 ============
  infoOverlayContainer: {
    position: 'absolute',
    bottom: 120, // Ajusté pour le nouveau layout
    left: '5%',
    right: '5%',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLogo: {
    width: 80, // Taille augmentée
    height: 80, // Taille augmentée
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  infoProgramTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 3,
  },
  infoProgramTime: {
    color: '#E0E0E0',
    fontSize: 14,
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 3,
  },
  infoProgressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 12, // Espace ajouté au-dessus
  },
  infoProgressBarFill: {
    height: '100%',
    backgroundColor: '#4A90E2', // Couleur bleue de référence
  },

  // Nouveaux styles pour badges techniques et informations réelles
  infoBadgesContainer: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 8,
  },
  infoBadge: {
    backgroundColor: 'rgba(74, 144, 226, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  infoBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2,
  },
  infoProgressText: {
    color: '#E0E0E0',
    fontSize: 12,
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 3,
  },

  // ============ STYLES BARRE DE PROGRESSION MODERNE IPTV ============
  modernProgressContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  modernProgressBar: {
    height: 6,
    borderRadius: 3,
    position: 'relative',
    marginBottom: 8,
  },
  modernProgressBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
  },
  modernProgressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 6,
    backgroundColor: '#4A90E2',
    borderRadius: 3,
    shadowColor: '#4A90E2',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  modernProgressHandle: {
    position: 'absolute',
    top: -2,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modernTimeDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modernTimeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 3,
  },
  modernDurationText: {
    color: '#E0E0E0',
    fontSize: 13,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 3,
  },

  // TextInput invisible pour capturer la saisie
  invisibleTextInput: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    opacity: 0,
    width: 1,
    height: 1,
  },
});

export default ChannelPlayerScreen;
