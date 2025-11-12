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
  Alert,
  AppState,
  ActivityIndicator,
  StyleSheet as RNStyleSheet,
} from 'react-native';
import {BlurView} from '@react-native-community/blur';
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
import LinearGradient from 'react-native-linear-gradient';
import MiniPlayerContainer from '../components/MiniPlayerContainer'; // Container pour GlobalVideoPlayer singleton
import {usePlayerStore} from '../stores/PlayerStore'; // Store global vidéo
import {useRecentChannelsStore} from '../stores/RecentChannelsStore'; // Store simple pour chaînes récentes
import {useUIStore} from '../stores/UIStore'; // Store pour les notifications
import EPGCompact from '../components/EPGCompact'; // Guide EPG compact sous mini-lecteur
import ProfilesModal from '../components/ProfilesModal'; // Modal des profils pour déconnexion
import ConnectionModal from '../components/ConnectionModal'; // Modal de sélection du type de connexion
import XtreamCodeModal from '../components/XtreamCodeModal'; // Modal pour Xtream Codes
import M3UUrlModal from '../components/M3UUrlModal'; // Modal pour URL M3U
import RestrictedOverlay from '../components/RestrictedOverlay'; // Overlay pour contenu restreint
import LockedChannelBadge from '../components/LockedChannelBadge'; // Badge cadenas pour chaînes verrouillées
import {
  useRoute,
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import type {RootStackParamList, Channel, Category} from '../types';
import type {Profile} from '../types/index';
import {useThemeColors} from '../contexts/ThemeContext';
import {useI18n} from '../hooks/useI18n';
import type { VideoSettings } from '../services/VideoSettingsService';
import {useImmersiveScreen} from '../hooks/useStatusBar';
import FavoritesService from '../services/FavoritesService';
import ProfileService from '../services/ProfileService';
import ParentalControlService from '../services/ParentalControlService';
import {useParentalControlStore} from '../stores/ParentalControlStore';
import SimplePinModal from '../components/SimplePinModal';
import { DeviceEventEmitter } from 'react-native';
import database from '../database';
import { Q } from '@nozbe/watermelondb';
import { videoSettingsService } from '../services/VideoSettingsService';

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
      // 🚀 Window Loading params (optional)
      windowOffset?: number; // Offset de la fenêtre dans la BD
      targetChannelIndex?: number; // Index global de la chaîne cible
      targetChannelLocalIndex?: number; // Index local dans la fenêtre
      totalChannelsInPlaylist?: number; // Nombre total de chaînes
      playlistType?: 'M3U' | 'XTREAM';
    };
  };
}

type NavigationProp = StackNavigationProp<RootStackParamList>;

// Fonction pour nettoyer le nom de la chaîne
const cleanChannelName = (name: string) => {
  if (!name) {
    return '';
  }
  // Supprime le texte entre parenthèses (1080p) et crochets [Geo-blocked]
  return name.replace(/\s*\([^)]*\)|\[[^\]]*\]/g, '').trim();
};

const ChannelPlayerScreen: React.FC<ChannelPlayerScreenProps> = ({route}) => {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const {t: tChannels} = useI18n('channels');
  const {t: tCommon} = useI18n('common');
  const {t: tProfiles} = useI18n('profiles');
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
  const {
    setRecentChannels: setStoreRecentChannels,
    profileChangeCounter,
  } = useRecentChannelsStore();

  // 🔔 Connexion au UIStore pour les notifications
  const {showNotification} = useUIStore();


  // 📺 Métadonnées EPG (récupérées depuis AsyncStorage saved_m3u_playlists)
  const [playlistMetadata, setPlaylistMetadata] = useState<
    {epgType?: string; epgUrl?: string} | null | undefined
  >(undefined);

  // 🔧 Fonction de normalisation du nom de catégorie (identique à ChannelsScreen)
  const normalizeCategoryName = (name: string): string => {
    if (!name || name.trim() === '') {
      return 'Non classé';
    }

    return name
      .trim()
      .replace(/[<>]/g, '') // Supprimer caractères dangereux
      .replace(/[|]/g, ' - ') // Remplacer pipes par tirets
      .replace(/\s+/g, ' ') // Normaliser espaces multiples
      .substring(0, 50) // Limiter longueur
      .replace(/^\w/, c => c.toUpperCase()); // Première lettre majuscule
  };

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

  // 🎯 Indiquer au PlayerStore qu'on est dans ChannelPlayerScreen
  // Utiliser useEffect simple - le flag reste actif tant que le composant est monté
  useEffect(() => {
    console.log('🎯 [ChannelPlayerScreen] MOUNTED - Activation PERMANENTE mode mini-lecteur');
    playerActions.setInChannelPlayerScreen(true);

    return () => {
      console.log('🎯 [ChannelPlayerScreen] UNMOUNTED - Désactivation mode mini-lecteur');
      playerActions.setInChannelPlayerScreen(false);
    };
  }, [playerActions]);

  // 🎯 Logique supplémentaire pour la reprise du lecteur vidéo au retour
  // DÉSACTIVÉ : Ce code interfère aussi avec le clic sur le mini-lecteur
  /*
  useEffect(() => {
    if (playerStore.channel && playerStore.isFullscreen) {
      console.log('🎬 [ChannelPlayerScreen] Détection d\'un retour avec PIP actif - reprise du lecteur');

      // Forcer la désactivation du PIP et la reprise du lecteur principal
      setTimeout(() => {
        playerActions.setFullscreen(false);
        if (playerStore.isPaused) {
          playerActions.setPaused(false);
        }
      }, 100); // Léger délai pour s'assurer que l'écran est bien monté
    }
  }, [playerStore.channel, playerStore.isFullscreen, playerStore.isPaused, playerActions]);
  */

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

  // 🔄 Tracker pour détecter le retour du fullscreen - Initialisé APRÈS le premier render
  const wasFullscreenRef = useRef<boolean | null>(null); // null = pas encore initialisé

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
        console.log(
          '👁️ [ChannelPlayerScreen] Premier scroll nécessaire vers index:',
          channelIndex,
        );
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
        needsScroll,
      });

      return needsScroll;
    } catch (error) {
      console.warn('👁️ [ChannelPlayerScreen] Erreur analyse scroll:', error);
      return true; // En cas d'erreur, forcer le scroll pour être sûr
    }
  }, []);

  useEffect(() => {
    // 🔥 Garde anti-interférence : NE PAS synchroniser pendant l'initialisation
    if (!hasInitializedRef.current) {
      return; // Attendre que l'auto-démarrage soit terminé
    }

    // Garde anti-boucle : éviter les synchronisations redondantes
    if (
      !playerStore.channel ||
      playerStore.channel.id === lastSyncedChannelIdRef.current
    ) {
      return;
    }

    // 🚀 SYNCHRONISATION IMMÉDIATE ET ATOMIQUE pour éviter double surlignage
    if (!selectedChannel || playerStore.channel.id !== selectedChannel.id) {
      console.log(
        '🔄 [ChannelPlayerScreen] Synchronisation PlayerStore -> UI:',
        {
          currentSelected: selectedChannel?.name || 'none',
          newFromStore: playerStore.channel.name,
          lastSynced: lastSyncedChannelIdRef.current,
        },
      );

      // Mise à jour atomique pour éviter états intermédiaires
      const newChannel = playerStore.channel;
      setSelectedChannel(newChannel);
      lastSyncedChannelIdRef.current = newChannel.id;

      // 👁️ Auto-scroll intelligent : seulement si nécessaire
      const channelIndex = channels.findIndex(
        ch => ch.id === playerStore.channel?.id,
      );
      if (channelIndex !== -1 && channelsListRef.current) {
        // Vérifier si un scroll est nécessaire pour cette chaîne
        const shouldScroll = needsScrollToChannel(channelIndex);

        if (shouldScroll) {
          console.log(
            '📜 [ChannelPlayerScreen] Scroll nécessaire vers index:',
            channelIndex,
          );

          // 🚀 AUTO-SCROLL INSTANTANÉ avec scrollToIndex (meilleur centrage)
          requestAnimationFrame(() => {
            if (!channelsListRef.current) {
              return;
            }

            try {
              // Utiliser scrollToIndex avec viewPosition pour un centrage parfait
              channelsListRef.current.scrollToIndex({
                index: channelIndex,
                animated: false,
                viewPosition: 0.5, // Centrer l'item au milieu de la liste
              });

              console.log(
                '📜 [Auto-scroll] Scroll instantané vers index:',
                channelIndex,
                '(centré)',
              );
              lastScrolledIndexRef.current = channelIndex;
            } catch (error) {
              console.error('❌ [Auto-scroll] Échec scrollToIndex, fallback scrollToOffset:', error);

              // Fallback: utiliser scrollToOffset si scrollToIndex échoue
              try {
                const ITEM_HEIGHT = 58;
                const LIST_HEIGHT = height * 0.72; // Hauteur réelle de la FlashList (72% de l'écran)
                const centerOffset = LIST_HEIGHT / 2 - ITEM_HEIGHT / 2;
                const targetOffset = Math.max(0, channelIndex * ITEM_HEIGHT - centerOffset);

                channelsListRef.current.scrollToOffset({
                  offset: targetOffset,
                  animated: false,
                });

                console.log('📜 [Auto-scroll] Scroll réussi avec scrollToOffset (fallback)');
                lastScrolledIndexRef.current = channelIndex;
              } catch (fallbackError) {
                console.error('❌ [Auto-scroll] Échec complet:', fallbackError);
              }
            }
          });
        } else {
          console.log(
            '📜 [ChannelPlayerScreen] Pas de scroll nécessaire pour index:',
            channelIndex,
          );
        }
      }
    }
  }, [playerStore.channel?.id, channels]); // ✅ Suppression de selectedChannel des dépendances

  // 🔄 Détecter le retour du fullscreen et forcer auto-scroll en réinitialisant lastScrolledIndexRef
  useEffect(() => {
    console.log('🔍 [ChannelPlayerScreen] useEffect fullscreen - wasFullscreen:', wasFullscreenRef.current, 'isFullscreen:', playerStore.isFullscreen);

    // 🆕 Initialisation au premier render (null → valeur actuelle)
    if (wasFullscreenRef.current === null) {
      console.log('🎬 [ChannelPlayerScreen] Initialisation wasFullscreenRef:', playerStore.isFullscreen);
      wasFullscreenRef.current = playerStore.isFullscreen;
      return; // Ne pas déclencher auto-scroll lors de l'initialisation
    }

    // Si on revient du fullscreen (wasFullscreen true → false)
    if (wasFullscreenRef.current === true && playerStore.isFullscreen === false) {
      console.log('🔙 [ChannelPlayerScreen] Retour du fullscreen détecté - Reset lastScrolledIndexRef pour forcer auto-scroll');

      // 🎯 Forcer auto-scroll en réinitialisant le tracker de position
      // Cela fera que needsScrollToChannel() retournera true lors du prochain useEffect
      lastScrolledIndexRef.current = null;
    }

    // Mettre à jour le tracker
    wasFullscreenRef.current = playerStore.isFullscreen;
  }, [playerStore.isFullscreen]);

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
      // Vérifier si la bonne chaîne joue déjà (même ID)
      if (
        playerStore.channel &&
        selectedChannel &&
        playerStore.channel.id === selectedChannel.id
      ) {
        console.log(
          '✅ [ChannelPlayerScreen] La bonne chaîne joue déjà:',
          playerStore.channel.name,
        );
        lastSyncedChannelIdRef.current = playerStore.channel.id;
        hasInitializedRef.current = true;
        return;
      }

      // Sinon, démarrer la chaîne sélectionnée (vérifier les paramètres utilisateur)
      if (selectedChannel) {
        // 🎬 Toujours lancer la chaîne sélectionnée dans ChannelPlayerScreen
        // Le paramètre autoplay est uniquement pour l'autostart au démarrage de l'app
        console.log(
          '🎬 [ChannelPlayerScreen] Lancement automatique de la chaîne sélectionnée:',
          selectedChannel.name,
        );
        playerActions.playChannel(selectedChannel, false);
        lastSyncedChannelIdRef.current = selectedChannel.id;
      }

      // 📜 Auto-scroll initial intelligent vers la chaîne sélectionnée depuis ChannelsScreen
      // Seulement s'il y a une chaîne sélectionnée
      if (selectedChannel) {
        // 🚀 WINDOW LOADING: Utiliser targetChannelLocalIndex si disponible (beaucoup plus rapide)
        const targetLocalIndex = route.params.targetChannelLocalIndex;
        const channelIndex =
          targetLocalIndex !== undefined
            ? targetLocalIndex
            : channels.findIndex(ch => ch.id === selectedChannel.id);

        if (channelIndex !== -1 && channelsListRef.current) {
          // Pour l'auto-scroll initial, on peut être plus permissif et centrer la chaîne
          const scrollSource = targetLocalIndex !== undefined ? 'Window Loading' : 'findIndex';
          console.log(
            `📜 [ChannelPlayerScreen] Auto-scroll initial vers chaîne: ${selectedChannel.name}`,
            `index: ${channelIndex} (source: ${scrollSource})`,
          );

          // 🚀 SMART AUTO-SCROLL: Charge les données si nécessaire puis scroll
          const performSmartScroll = async () => {
            let currentChannelsCount = channels.length;

            console.log(`🎯 [Auto-scroll] Vers "${selectedChannel?.name}" (index: ${channelIndex}, chargées: ${currentChannelsCount})`);

            // Si la chaîne est au-delà des chaînes chargées, charger plus de données
            if (channelIndex >= currentChannelsCount) {
              console.log(`🔄 [Auto-scroll] Chargement de données supplémentaires...`);

              // Calculer combien de batches charger
              const channelsNeeded = channelIndex + 100; // +100 pour avoir un buffer
              const batchesToLoad = Math.ceil((channelsNeeded - currentChannelsCount) / CHANNELS_PER_PAGE);

              console.log(`🔄 [Auto-scroll] Chargement de ${batchesToLoad} batch(es)...`);

              // Charger progressivement
              for (let i = 0; i < batchesToLoad; i++) {
                await loadMoreChannels();
                console.log(`🔄 [Auto-scroll] Batch ${i + 1}/${batchesToLoad} chargé`);

                // Attendre entre chaque batch pour que le state se mette à jour
                await new Promise(resolve => setTimeout(resolve, 200));
              }

              console.log(`✅ [Auto-scroll] Chargement terminé: ${batchesToLoad} batch(es)`);
            } else {
              // Même si on n'a pas besoin de charger, attendre un peu pour la stabilité
              await new Promise(resolve => setTimeout(resolve, 100));
            }

            // ⏰ Attendre un délai supplémentaire pour que React mette à jour le state et FlashList
            await new Promise(resolve => setTimeout(resolve, 500));

            // ✅ Attendre que FlashList soit prêt (onLayout déclenché)
            let waitAttempts = 0;
            while (!isFlashListReadyRef.current && waitAttempts < 20) {
              console.log(`⏳ [Auto-scroll] Attente FlashList ready... (${waitAttempts + 1}/20)`);
              await new Promise(resolve => setTimeout(resolve, 100));
              waitAttempts++;
            }

            if (!isFlashListReadyRef.current) {
              console.error(`❌ [Auto-scroll] FlashList pas prêt après 2s`);
              return;
            }

            // Maintenant faire le scroll avec InteractionManager pour s'assurer que le rendu est terminé
            if (!channelsListRef.current) {
              console.error(`❌ [Auto-scroll] channelsListRef est null`);
              return;
            }

            console.log(`✅ [Auto-scroll] FlashList prêt, démarrage scroll...`);

            // Utiliser InteractionManager pour exécuter le scroll après toutes les interactions/rendus
            InteractionManager.runAfterInteractions(() => {
              if (!channelsListRef.current) {
                console.error(`❌ [Auto-scroll] channelsListRef null après interactions`);
                return;
              }

              try {
                console.log(`🎯 [Auto-scroll] Scroll vers index: ${channelIndex} avec scrollToIndex`);

                // Utiliser scrollToIndex pour les index élevés (plus fiable que scrollToOffset)
                channelsListRef.current.scrollToIndex({
                  index: channelIndex,
                  animated: false,
                  viewPosition: 0.5, // Centrer l'item (0.5 = au milieu de la vue)
                });

                console.log(`✅ [Auto-scroll] Scroll réussi`);
                lastScrolledIndexRef.current = channelIndex;
              } catch (error) {
                console.error(`❌ [Auto-scroll] Échec scrollToIndex, tentative scrollToOffset:`, error);

                // Fallback: utiliser scrollToOffset si scrollToIndex échoue
                try {
                  const ITEM_HEIGHT = 58;
                  const LIST_HEIGHT = height * 0.72;
                  const centerOffset = LIST_HEIGHT / 2 - ITEM_HEIGHT / 2;
                  const targetOffset = Math.max(0, channelIndex * ITEM_HEIGHT - centerOffset);

                  channelsListRef.current.scrollToOffset({
                    offset: targetOffset,
                    animated: false,
                  });

                  console.log(`✅ [Auto-scroll] Scroll réussi avec scrollToOffset (fallback)`);
                  lastScrolledIndexRef.current = channelIndex;
                } catch (fallbackError) {
                  console.error(`❌❌ [Auto-scroll] Échec complet:`, fallbackError);
                }
              }
            });
          };

          // Exécuter le smart scroll après un délai
          setTimeout(() => {
            performSmartScroll().catch(err => {
              console.error('❌ [Auto-scroll] Erreur smart scroll:', err);
            });
          }, 300);
        } else {
          if (channelIndex === -1) {
            console.warn(`⚠️ [Auto-scroll] Chaîne "${selectedChannel.name}" non trouvée dans les données (${channels.length} chaînes)`);
          }
        }
      }

      // Marquer l'initialisation comme terminée
      hasInitializedRef.current = true;
    });
  }, []); // Une seule fois au montage

  // 🔍 NOUVEAU: Détecter les changements de selectedChannel depuis la recherche
  useEffect(() => {
    // Ignorer le premier montage (géré par le useEffect précédent)
    if (!hasInitializedRef.current) {
      return;
    }

    // Détecter si route.params.selectedChannel a changé
    const newSelectedChannel = route.params.selectedChannel;

    if (newSelectedChannel && newSelectedChannel.id !== selectedChannel.id) {
      console.log(
        '🔍 [Search Result] Nouvelle chaîne depuis recherche:',
        newSelectedChannel.name,
        '(ancienne:',
        selectedChannel.name,
        ')',
      );

      // Mettre à jour l'état local
      setSelectedChannel(newSelectedChannel);

      // Lancer la nouvelle chaîne
      playerActions.playChannel(newSelectedChannel, false);
      lastSyncedChannelIdRef.current = newSelectedChannel.id;

      // Ajouter aux récents
      if (activeProfile) {
        (async () => {
          try {
            // 🆕 Utiliser le nouveau RecentChannelsService
            const RecentChannelsService = (
              await import('../services/RecentChannelsService')
            ).default;

            await RecentChannelsService.addRecent(
              newSelectedChannel,
              playlistId,
              activeProfile.id,
            );
          } catch (err) {
            console.error('❌ [Search] Erreur ajout récents:', err);
          }
        })();
      }

      // 🎯 Vérifier si la chaîne est dans la catégorie actuelle
      const channelIndex = channels.findIndex(ch => ch.id === newSelectedChannel.id);

      if (channelIndex !== -1) {
        // ✅ Chaîne trouvée dans la catégorie actuelle → Auto-scroll
        console.log(
          `📜 [Search Result] Auto-scroll vers: ${newSelectedChannel.name} (index: ${channelIndex})`,
        );

        setTimeout(() => {
          channelsListRef.current?.scrollToIndex({
            index: channelIndex,
            animated: true,
            viewPosition: 0.3,
          });
        }, 300);
      } else {
        // ⚠️ Chaîne dans une autre catégorie → Changer de catégorie
        const channelCategory = (newSelectedChannel as any).groupTitle || newSelectedChannel.group || newSelectedChannel.category;
        console.log(`🔄 [Search Result] Chaîne dans une autre catégorie: "${channelCategory}" - Changement de catégorie...`);

        // Trouver l'index de la catégorie qui contient cette chaîne
        const targetCategoryIndex = categories.findIndex(cat => {
          const normalizedCatName = normalizeCategoryNameForComparison(cat.name);
          const normalizedChannelCat = normalizeCategoryNameForComparison(channelCategory);
          return normalizedCatName === normalizedChannelCat;
        });

        if (targetCategoryIndex !== -1) {
          console.log(`✅ [Search Result] Changement vers catégorie: ${categories[targetCategoryIndex].name}`);
          setCurrentCategoryIndex(targetCategoryIndex);
          // Le useEffect de changement de catégorie chargera les chaînes et fera le scroll
        } else {
          console.warn(`⚠️ [Search Result] Catégorie "${channelCategory}" non trouvée dans la liste`);
        }
      }
    }
  }, [route.params.selectedChannel?.id, channels, categories]); // Surveiller les changements de l'ID de la chaîne

  // États locaux pour rendre le composant autonome (selon spec Gemini)
  const [categories, setCategories] = useState<Category[]>(allCategories);
  // Trouver la catégorie qui contient la chaîne sélectionnée (pour les recherches)
  const findCategoryWithChannel = (channelToFind: Channel) => {
    for (let i = 0; i < allCategories.length; i++) {
      const category = allCategories[i];
      if (
        category.channels &&
        category.channels.some(ch => ch.id === channelToFind.id)
      ) {
        return {category, index: i};
      }
    }
    return null;
  };

  const channelCategoryResult = findCategoryWithChannel(initialChannel);

  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(() => {
    // Si la chaîne sélectionnée est dans une autre catégorie, utiliser cette catégorie
    if (channelCategoryResult) {
      console.log(
        '🔍 [ChannelPlayerScreen] Chaîne trouvée dans catégorie:',
        channelCategoryResult.category.name,
      );
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
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('24h');
  const [favoriteChannels, setFavoriteChannels] = useState<string[]>([]); // IDs des chaînes favorites
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null); // Profil actif pour favoris
  const [isChannelLoading, setIsChannelLoading] = useState(false); // Indicateur de chargement non-bloquant

  // 🚀 États pour la pagination progressive (gros catalogues 26000+ chaînes)
  const [displayedChannels, setDisplayedChannels] = useState<Channel[]>([]);
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMoreChannels, setHasMoreChannels] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentWindowOffset, setCurrentWindowOffset] = useState(0); // Offset actuel dans la BD
  const [totalChannelsInPlaylist, setTotalChannelsInPlaylist] = useState(0); // Total de chaînes
  const isFlashListReadyRef = useRef(false); // ✅ Ref au lieu de state pour accès dans fonctions async
  const CHANNELS_PER_PAGE = 1000; // ✅ 1000 chaînes par page = moins de chargements, scroll plus fluide

  const [activeProfile, setActiveProfile] = useState<any>(null);

  // 🔒 États pour le contrôle parental
  const [blockedCategories, setBlockedCategories] = useState<string[]>([]);
  const [lockedChannels, setLockedChannels] = useState<Set<string>>(new Set());
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [selectedBlockedCategory, setSelectedBlockedCategory] = useState<Category | null>(null);

  // 🔒 Store global pour le déverrouillage de catégorie
  const {
    unlockedCategories,
    currentUnlockedCategory,
    unlockCategory,
    lockAll,
    isUnlocked,
    version: unlockedCategoriesVersion,
  } = useParentalControlStore();

  // États pour le modal favoris
  const [favoriteModalVisible, setFavoriteModalVisible] = useState(false);
  const [selectedChannelForFavorite, setSelectedChannelForFavorite] =
    useState<Channel | null>(null);

  // 🎯 États pour le menu d'options du header
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [currentSortOrder, setCurrentSortOrder] = useState<'default' | 'name-asc' | 'name-desc'>('default');

  // 🎯 Animations pour les menus
  const optionsMenuAnimValue = useRef(new Animated.Value(0)).current;
  const sortMenuAnimValue = useRef(new Animated.Value(0)).current;


  // 🎯 États pour le modal des profils
  const [showProfilesModal, setShowProfilesModal] = useState(false);

  // 🎯 État pour la boîte de dialogue de déconnexion moderne
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // 🎯 Animation pour la boîte de dialogue de déconnexion
  const logoutDialogAnimValue = useRef(new Animated.Value(0)).current;

  // 🎯 États pour les modaux de connexion (ajout de playlist depuis ProfilesModal)
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showXtreamModal, setShowXtreamModal] = useState(false);
  const [showM3UModal, setShowM3UModal] = useState(false);

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
    lastProfileChangeCounter: number; // 🆕 Pour détecter les changements de profil
  }>({
    data: [],
    lastUpdate: 0,
    isDirty: false,
    lastProfileChangeCounter: 0,
  });

  // Animations pour les contrôles TiviMate
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const controlsTimer = useRef<NodeJS.Timeout | null>(null);

  // Charger les favoris au montage
  useEffect(() => {
    loadProfileFavorites();
  }, []);

  // 🔒 Charger le profil actif et les catégories bloquées
  useEffect(() => {
    const loadActiveProfileAndBlocked = async () => {
      try {
        const profile = await ProfileService.getActiveProfile();
        if (profile) {
          setActiveProfile(profile);
          setBlockedCategories(profile.blockedCategories || []);
          console.log(`🔒 [ChannelPlayerScreen] Profil chargé: ${profile.name}, catégories bloquées: ${profile.blockedCategories?.length || 0}`);
        }
      } catch (error) {
        console.error('❌ [ChannelPlayerScreen] Erreur chargement profil:', error);
      }
    };

    loadActiveProfileAndBlocked();
  }, []);

  // Charger le format d'heure depuis les paramètres vidéo
  useEffect(() => {
    const loadTimeFormat = async () => {
      try {
        const videoSettings = await videoSettingsService.loadSettings();
        if (videoSettings && videoSettings.timeFormat) {
          setTimeFormat(videoSettings.timeFormat);
        }
      } catch (error) {
        console.error('❌ [ChannelPlayerScreen] Erreur chargement format d\'heure:', error);
      }
    };

    loadTimeFormat();
  }, []);

  // 🔄 Écouter les mises à jour de favoris depuis GlobalVideoPlayer
  useEffect(() => {
    const handleFavoriteUpdate = (data: any) => {
      const { channelId, isFavorite, playlistId, profileId } = data;

      // Mettre à jour seulement si ça concerne la playlist et le profil actuels
      if (profileId === activeProfileId) {
        const updatedFavorites = isFavorite
          ? [...favoriteChannels, channelId]
          : favoriteChannels.filter(id => id !== channelId);

        setFavoriteChannels(updatedFavorites);
        console.log('🔄 [ChannelPlayerScreen] Favori mis à jour depuis GlobalVideoPlayer:', { channelId, isFavorite });
      }
    };

    // Ajouter l'écouteur d'événements
    const subscription = DeviceEventEmitter.addListener('favoriteUpdate', handleFavoriteUpdate);

    // Nettoyer l'écouteur
    return () => {
      subscription.remove();
    };
  }, [favoriteChannels, playlistId, activeProfileId]);

  // 🔄 Système de synchronisation des favoris
  const emitFavoriteUpdate = (channelId: string, isFavorite: boolean) => {
    // Utiliser DeviceEventEmitter pour synchroniser entre composants
    DeviceEventEmitter.emit('favoriteUpdate', {
      channelId,
      isFavorite,
      playlistId,
      profileId: activeProfileId
    });
    console.log('🔄 [ChannelPlayerScreen] Événement favori émis:', { channelId, isFavorite });
  };

  // Fonction pour charger les favoris du profil actif
  const loadProfileFavorites = async () => {
    try {
      const activeProfile = await ProfileService.getActiveProfile();
      if (!activeProfile) {
        console.log('❌ [ChannelPlayerScreen] Aucun profil actif');
        return [];
      }

      setActiveProfileId(activeProfile.id);

      const profileFavorites = await FavoritesService.getFavoritesByProfile(
        activeProfile.id,
      );
      const favoriteChannelIds = profileFavorites.map(fav => fav.channelId);
      setFavoriteChannels(favoriteChannelIds);

      console.log(
        `⭐ [ChannelPlayerScreen] ${favoriteChannelIds.length} favoris chargés pour profil:`,
        activeProfile.name,
      );

      return favoriteChannelIds;
    } catch (error) {
      console.error(
        '❌ [ChannelPlayerScreen] Erreur chargement favoris:',
        error,
      );
      return [];
    }
  };

  // État pour les chaînes récentes
  const [recentChannels, setRecentChannels] = useState<Channel[]>([]);

  // 🚀 Charger les chaînes récentes avec cache mémoire optimisé
  const loadRecentChannels = async () => {
    try {
      const cache = recentChannelsCache.current;

      // 👤 Récupérer le profil actif (TOUJOURS, même pour le cache)
      const activeProfile = await ProfileService.getActiveProfile();

      if (!activeProfile) {
        console.log('⚠️ [loadRecentChannels] Aucun profil actif');
        return;
      }

      // 🔑 Vérifier si le profil a changé (invalide le cache)
      const profileHasChanged = cache.lastProfileChangeCounter !== profileChangeCounter;
      if (profileHasChanged) {
        console.log('🔄 [loadRecentChannels] Profil changé, invalidation du cache');
        cache.data = [];
        cache.lastUpdate = 0;
        cache.lastProfileChangeCounter = profileChangeCounter;
      }

      // Si le cache est récent (moins de 5 minutes), l'utiliser
      const now = Date.now();
      if (cache.data.length > 0 && now - cache.lastUpdate < 300000 && !profileHasChanged) {
        console.log('🔍 [loadRecentChannels] Utilisation du cache');
        setRecentChannels(cache.data);
        setStoreRecentChannels(cache.data, activeProfile.id);
        return;
      }

      // 🆕 Utiliser le nouveau RecentChannelsService
      console.log('🔍 [loadRecentChannels] Chargement depuis le service');
      const RecentChannelsService = (
        await import('../services/RecentChannelsService')
      ).default;

      let recentChannelsData = await RecentChannelsService.getRecentsByProfile(
        activeProfile.id,
        playlistId,
      );

      // 🔒 FILTRER les chaînes des catégories bloquées
      const blockedCategories = activeProfile.blockedCategories || [];
      if (blockedCategories.length > 0) {
        const beforeCount = recentChannelsData.length;
        recentChannelsData = recentChannelsData.filter((ch: any) => {
          const groupTitle = ((ch as any).groupTitle || ch.group || ch.category || '').toLowerCase();
          return !blockedCategories.some(blocked =>
            groupTitle.includes(blocked.toLowerCase())
          );
        });
        console.log(
          `🔒 [loadRecentChannels] Récents filtrés: ${beforeCount} → ${recentChannelsData.length} chaînes`,
        );
      }

      // Mettre à jour le cache
      cache.data = recentChannelsData;
      cache.lastUpdate = now;
      cache.isDirty = false;
      cache.lastProfileChangeCounter = profileChangeCounter;

      // Mettre à jour l'UI
      setRecentChannels(recentChannelsData);
      setStoreRecentChannels(recentChannelsData, activeProfile.id);
    } catch (error) {
      console.error('❌ Erreur chargement récents:', error);
    }
  };

  // Charger les récents au montage ET quand le profil change
  useEffect(() => {
    console.log('🔍 [ChannelPlayerScreen] Rechargement des récents (playlistId ou profileChangeCounter changé)');
    loadRecentChannels();
  }, [playlistId, profileChangeCounter]); // 🔑 Recharger quand le profil change

  // Synchroniser avec le store chaque fois que recentChannels change - OPTIMISÉ
  const lastSyncedLengthRef = useRef(0);
  useEffect(() => {
    // Éviter les synchronisations inutiles si la longueur n'a pas changé
    if (
      recentChannels.length > 0 &&
      recentChannels.length !== lastSyncedLengthRef.current
    ) {
      // 🔑 Obtenir le profileId avant de synchroniser
      ProfileService.getActiveProfile().then(activeProfile => {
        if (activeProfile) {
          setStoreRecentChannels(recentChannels, activeProfile.id);
          lastSyncedLengthRef.current = recentChannels.length;
        }
      });
    }
  }, [recentChannels, setStoreRecentChannels]);

  // 🔒 Calcul initial des lockedChannels au montage (synchrone + optimisé)
  useEffect(() => {
    // Calcul synchrone pour éviter le délai à l'ouverture de l'écran
    if (channels.length > 0 && activeProfile && blockedCategories.length > 0) {
        updateLockedChannels();
    }
  }, [activeProfile, blockedCategories]); // Déclencher si profil/catégories changent

  // 🔒 NOUVEAU: Recalculer lockedChannels quand les chaînes changent
  useEffect(() => {
    if (channels.length > 0) {
      updateLockedChannels();
    }
  }, [channels.length, updateLockedChannels]);

  // 🔒 useEffect pour reverrouiller quand on quitte une catégorie déverrouillée
  useEffect(() => {
    if (!currentUnlockedCategory || categories.length === 0 || currentCategoryIndex < 0) {
      return;
    }

    const selectedCategory = categories[currentCategoryIndex];
    if (!selectedCategory) return;

    // Ne pas reverrouiller si on est dans "TOUT"
    if (selectedCategory.name === 'TOUT' || selectedCategory.name === 'Tout' || selectedCategory.id === 'all') {
      console.log(`🔍 [ChannelPlayerScreen] Vue "TOUT" - Pas de reverrouillage`);
      return;
    }

    // Reverrouiller si on quitte la catégorie déverrouillée
    const normalizedCurrentUnlocked = normalizeCategoryNameForComparison(currentUnlockedCategory);
    const normalizedSelected = normalizeCategoryNameForComparison(selectedCategory.name);

    if (normalizedSelected !== normalizedCurrentUnlocked) {
      console.log(`🔒 [ChannelPlayerScreen] Catégories différentes - Reverrouillage automatique`);
      lockAll();
    }
  }, [currentCategoryIndex, currentUnlockedCategory, categories, lockAll]);

  // ✅ CORRECTION: Plus besoin de recalculer lockedChannels quand unlockedCategoriesVersion change
  // car le badge reste visible même après déverrouillage (information permanente)

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

    // Si c'est la catégorie "TOUT" - afficher le nombre TOTAL de chaînes (pas le nombre progressif)
    if (
      category.name === 'Tout' ||
      category.name === 'TOUT' ||
      category.name.toLowerCase() === 'tout' ||
      category.id === 'all'
    ) {
      return totalChannelsInPlaylist || 0;
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
    const channelUrl = (channel as any).streamUrl || channel.url || '';
    return (
      !channel.name.toLowerCase().includes('vod') &&
      !channel.name.toLowerCase().includes('replay') &&
      !channelUrl.includes('.mp4') &&
      !channelUrl.includes('.mkv')
    );
  };

  // 🎯 Gestion du retour à ChannelPlayerScreen - désactivation du PIP
  // DÉSACTIVÉ : Ce code crée un conflit avec le clic sur le mini-lecteur
  // Il force setFullscreen(false) immédiatement après un clic sur le mini-lecteur
  /*
  useFocusEffect(
    React.useCallback(() => {
      // Variable pour suivre si c'est le premier focus ou un retour
      let isReturningFromSettings = false;

      // Détecter si on revient des paramètres avec PIP actif
      if (playerStore.channel && playerStore.isFullscreen) {
        console.log('🎬 [ChannelPlayerScreen] Retour détecté avec PIP actif - reprise du lecteur principal');
        isReturningFromSettings = true;

        // Forcer la reprise du lecteur vidéo principal
        playerActions.setInChannelPlayerScreen(true);
        playerActions.setFullscreen(false);

        // Reprendre la lecture si elle était en pause
        if (playerStore.isPaused) {
          setTimeout(() => {
            console.log('▶️ [ChannelPlayerScreen] Reprise automatique de la lecture');
            playerActions.setPaused(false);
          }, 200);
        }
      }

      return () => {
        if (isReturningFromSettings) {
          console.log('📱 [ChannelPlayerScreen] Nettoyage après retour - PIP désactivé');
        }
      };
    }, [playerStore.channel, playerStore.isFullscreen, playerStore.isPaused, playerActions]),
  );
  */

  // Mise à jour de l'heure et date temps réel
  useEffect(() => {
    const updateTimeAndDate = () => {
      const now = new Date();

      // Utiliser le format d'heure sauvegardé
      const timeOptions: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: timeFormat === '12h',
      };

      const timeString = now.toLocaleTimeString('fr-FR', timeOptions);

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
  }, [timeFormat]); // Dépendance au format d'heure pour se mettre à jour quand il change

  // 🎯 Animations pour le menu d'options
  useEffect(() => {
    if (showOptionsMenu) {
      Animated.spring(optionsMenuAnimValue, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.timing(optionsMenuAnimValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [showOptionsMenu, optionsMenuAnimValue]);

  // 🎯 Animations pour le menu de tri
  useEffect(() => {
    if (showSortOptions) {
      Animated.spring(sortMenuAnimValue, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.timing(sortMenuAnimValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [showSortOptions, sortMenuAnimValue]);

  // 🎯 Animations pour la boîte de dialogue de déconnexion
  useEffect(() => {
    if (showLogoutDialog) {
      Animated.spring(logoutDialogAnimValue, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      logoutDialogAnimValue.setValue(0);
    }
  }, [showLogoutDialog, logoutDialogAnimValue]);

  // Le panneau de gauche a une largeur fixe, le panneau de droite est flexible
  const leftPanelWidth = width * 0.43;

  // 🎯 RATIO COMME IPTV SMARTERS PRO - LECTEUR COMPACT OPTIMISÉ
  // Lecteur plus visible pour débugger le problème d'affichage
  const rightPanelWidth = width - leftPanelWidth - 4; // Largeur restante moins l'espacement
  const miniPlayerHeight = Math.min(
    rightPanelWidth * (9 / 16), // Ratio 16:9
    200, // Augmenté pour meilleure visibilité (était 180)
  );

  // 🔒 ===== CONTRÔLE PARENTAL =====

  // Normaliser les noms de catégories pour cohérence
  const normalizeCategoryNameForComparison = (name: string): string => {
    if (!name || name.trim() === '') {
      return '';
    }
    return name
      .toLowerCase()
      .trim()
      .replace(/\s*\|\s*/g, '-')  // "AF | AFRICA" → "af-africa"
      .replace(/\s*-\s*/g, '-')   // "AF - AFRICA" → "af-africa"
      .replace(/\s+/g, '-');      // Espaces multiples → tiret
  };

  // Fonction pour calculer les chaînes verrouillées
  const updateLockedChannels = useCallback(() => {
    if (!activeProfile || channels.length === 0) {
      setLockedChannels(new Set());
      return;
    }

    try {
      const locked = new Set<string>();
      const normalizedBlockedSet = new Set(
        blockedCategories.map(normalizeCategoryNameForComparison)
      );

      for (const channel of channels) {
        const channelCategory = (channel as any).groupTitle || channel.group || channel.category || 'N/A';

        // Vérifier si catégorie bloquée
        const normalizedChannelCategory = normalizeCategoryNameForComparison(channelCategory);
        if (normalizedBlockedSet.has(normalizedChannelCategory)) {
          locked.add(channel.id);
        }
      }

      setLockedChannels(locked);
    } catch (error) {
      setLockedChannels(new Set());
    }
  }, [activeProfile, channels, blockedCategories]);

  // Gestionnaire de succès PIN catégorie
  const handleCategoryUnlockSuccess = async (verifiedPin: string) => {
    if (!selectedBlockedCategory) return;

    try {
        unlockCategory(selectedBlockedCategory.name);

      setPinModalVisible(false);
      setSelectedBlockedCategory(null);

      // Changer vers la catégorie déverrouillée
      const categoryIndex = categories.findIndex(cat => cat.id === selectedBlockedCategory.id);
      if (categoryIndex !== -1) {
        setCurrentCategoryIndex(categoryIndex);
      }
    } catch (error) {
      console.error('❌ Erreur déverrouillage catégorie:', error);
      Alert.alert('Erreur', 'Impossible de déverrouiller la catégorie');
    }
  };

  const handlePinCancel = () => {
    setPinModalVisible(false);
    setSelectedBlockedCategory(null);
  };

  // ===== LOGIQUE DE NAVIGATION ENTRE CATÉGORIES (Spec Gemini) =====
  const handleNextCategory = () => {
    const nextIndex = currentCategoryIndex + 1;
    if (nextIndex >= categories.length) return;

    const nextCategory = categories[nextIndex];

    // 🔒 Vérifier si la catégorie suivante est bloquée
    const isBlocked = blockedCategories.some(blocked =>
      normalizeCategoryNameForComparison(blocked) === normalizeCategoryNameForComparison(nextCategory.name)
    );

    if (isBlocked && !isUnlocked(nextCategory.name)) {
      console.log(`🔒 [ChannelPlayerScreen] Catégorie "${nextCategory.name}" bloquée - Modal PIN`);
      setSelectedBlockedCategory(nextCategory);
      setPinModalVisible(true);
      return;
    }

    setCurrentCategoryIndex(nextIndex);
  };

  const handlePreviousCategory = () => {
    const prevIndex = currentCategoryIndex - 1;
    if (prevIndex < 0) return;

    const prevCategory = categories[prevIndex];

    // 🔒 Vérifier si la catégorie précédente est bloquée
    const isBlocked = blockedCategories.some(blocked =>
      normalizeCategoryNameForComparison(blocked) === normalizeCategoryNameForComparison(prevCategory.name)
    );

    if (isBlocked && !isUnlocked(prevCategory.name)) {
      console.log(`🔒 [ChannelPlayerScreen] Catégorie "${prevCategory.name}" bloquée - Modal PIN`);
      setSelectedBlockedCategory(prevCategory);
      setPinModalVisible(true);
      return;
    }

    setCurrentCategoryIndex(prevIndex);
  };

  // Ce useEffect réagit au changement de catégorie pour mettre à jour l'UI (Spec Gemini)
  useEffect(() => {
    console.log('🔄🔄🔄 [ChannelPlayer] useEffect changement catégorie déclenché');
    if (categories.length === 0) {
      console.log('⚠️ [ChannelPlayer] Aucune catégorie disponible');
      return;
    }

    const newCategory = categories[currentCategoryIndex];
    console.log('📂 [ChannelPlayer] Catégorie actuelle:', {
      index: currentCategoryIndex,
      name: newCategory?.name,
      id: newCategory?.id,
      channelsCount: newCategory?.channels?.length
    });

    if (newCategory) {
      // 🔧 CHARGEMENT DES CHAÎNES PAR CATÉGORIE
      let newChannels: Channel[];

      // 🎯 CAS SPÉCIAL: CATÉGORIE "Tout" - PRIORITÉ ABSOLUE
      // ⚠️ IMPORTANT: Cette condition DOIT être testée EN PREMIER, avant initialCategory
      if (
        newCategory.name === 'Tout' ||
        newCategory.name === 'TOUT' ||
        newCategory.id === 'all' ||
        newCategory.id === 'window_loaded' || // 🚀 Nouveau: support window loading
        newCategory.name.toLowerCase().includes('toutes') ||
        newCategory.name.toLowerCase().includes('tout') ||
        (newCategory.name.includes('(') && newCategory.name.includes(')') &&
         parseInt(newCategory.name.match(/\((\d+)\)/)?.[1] || '0') > 500)
      ) {
        // 🚀 OPTIMISATION: Utiliser initialChannels si disponibles (évite rechargement 26K)
        // Cela couvre à la fois:
        // - Window loading (avec targetChannelLocalIndex)
        // - Navigation normale depuis ChannelsScreen (500 premières chaînes)
        if (initialChannels.length > 0) {
          const hasWindowParams = route.params.targetChannelLocalIndex !== undefined;

          if (hasWindowParams) {
            console.log(`🚀 [Window Loading] Utilisation fenêtre pré-chargée (${initialChannels.length} chaînes)`);
            console.log(`🎯 [Window Loading] Target local index: ${route.params.targetChannelLocalIndex}`);
            console.log(`🌍 [Window Loading] Target global index: ${route.params.targetChannelIndex}/${route.params.totalChannelsInPlaylist}`);
          } else {
            console.log(`✅ [Optimisation] Utilisation initialChannels depuis ChannelsScreen (${initialChannels.length} chaînes) - PAS de rechargement!`);
          }

          // Utiliser directement les chaînes passées par ChannelsScreen
          newChannels = initialChannels;

          // 🚀 Initialiser les states de pagination pour permettre le scroll infini
          const windowOffset = route.params.windowOffset || 0;
          const totalInPlaylist = route.params.totalChannelsInPlaylist || 0;

          // Si totalChannelsInPlaylist n'est pas fourni, le récupérer depuis la BD de manière asynchrone
          if (!totalInPlaylist) {
            console.log('🔍 [Pagination] totalChannelsInPlaylist non fourni, récupération depuis BD...');

            (async () => {
              try {
                // Importer le bon service selon le type de playlist
                const playlistType = route.params.playlistType || 'M3U';
                const WatermelonService =
                  playlistType === 'XTREAM'
                    ? (await import('../services/WatermelonXtreamService')).default
                    : (await import('../services/WatermelonM3UService')).default;

                // Récupérer les métadonnées de la playlist (avec limit 1 pour être rapide)
                const result = await WatermelonService.getPlaylistWithChannels(
                  playlistId,
                  1, // On veut juste les métadonnées, pas les chaînes
                  0,
                  [],
                );

                const fetchedTotal = result.totalChannels || 0;
                console.log(`✅ [Pagination] Total récupéré depuis BD: ${fetchedTotal} chaînes`);
                setTotalChannelsInPlaylist(fetchedTotal);
                setHasMoreChannels(windowOffset + initialChannels.length < fetchedTotal);
              } catch (error) {
                console.error('❌ [Pagination] Erreur récupération totalChannels depuis BD:', error);
                setTotalChannelsInPlaylist(0); // Fallback sécurisé
              }
            })();
          } else {
            setTotalChannelsInPlaylist(totalInPlaylist);
            setHasMoreChannels(windowOffset + initialChannels.length < totalInPlaylist);
          }

          setCurrentWindowOffset(windowOffset);

          console.log(`📊 [Pagination] Initialisé - offset: ${windowOffset}, total: ${totalInPlaylist || 'en cours...'}, hasMore: ${windowOffset + initialChannels.length < totalInPlaylist}`);
        } else {
          console.log('🔥🔥🔥 [ChannelPlayer] CATÉGORIE "TOUT" DÉTECTÉE - Aucun initialChannels, chargement complet...');

          // Seulement si initialChannels est vide (ne devrait jamais arriver)
          loadAllChannelsOptimized();
          return;
        }
      }
      // Catégorie RÉCENTS - utiliser les vraies chaînes regardées
      else if (
        newCategory.name.toLowerCase().includes('recent') ||
        newCategory.id.includes('recent')
      ) {
        console.log('📺 [ChannelPlayer] Catégorie RÉCENTS détectée');
        newChannels = recentChannels;
      }
      // Catégorie initiale (celle d'origine) - seulement si ce n'est PAS "Tout"
      else if (
        newCategory.id === initialCategory.id &&
        initialChannels.length > 0
      ) {
        console.log('🎬 [ChannelPlayer] Catégorie INITIALE détectée (non-Tout)');
        newChannels = initialChannels;
      }
      // Autres catégories
      else {
        newChannels = newCategory.channels || [];

        // 🎯 GROSSE CATÉGORIE: Charger TOUTES les chaînes (FlashList optimise automatiquement)
        if (newChannels.length > 500) {
          console.log(`🎯 [ChannelPlayer] Grosse catégorie détectée (${newChannels.length} chaînes) - chargement complet`);
          console.log('🔍 [ChannelPlayer] Détails catégorie:', {
            name: newCategory.name,
            id: newCategory.id,
            channelCount: newChannels.length
          });
          loadAllChannelsOptimized();
          return;
        }

        // 🎯 CAS SPÉCIAL: FAVORIS - toujours charger les vrais favoris depuis FavoritesService
        if (
          newCategory.name.toLowerCase().includes('favori') ||
          newCategory.name.toLowerCase().includes('favorite') ||
          newCategory.name.includes('⭐') ||
          newCategory.id.includes('favorite') ||
          newCategory.id.includes('favori')
        ) {
          // 🚫 DÉSACTIVER IMMÉDIATEMENT la pagination pour FAVORIS
          setHasMoreChannels(false);
          setIsLoadingMore(false);
          loadChannelsForCategory(newCategory.id, newCategory.name);
          return; // Exit early, loadChannelsForCategory gérera les setState avec les vraies chaînes
        }

        // 🎯 CAS SPÉCIAL: RÉCENTS - toujours charger les vraies chaînes récentes depuis AsyncStorage
        if (
          newCategory.name.toLowerCase().includes('récent') ||
          newCategory.name.includes('📺') ||
          newCategory.id.includes('recent') ||
          newCategory.id.includes('history')
        ) {
          // 🚫 DÉSACTIVER IMMÉDIATEMENT la pagination pour RÉCENTS
          setHasMoreChannels(false);
          setIsLoadingMore(false);
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
    async (channel: Channel) => {
      console.log(
        '🎯 [ChannelPlayerScreen] handleChannelSelect:',
        channel.name,
      );

      // 1. Éviter sélection si déjà sélectionnée (comparaison robuste)
      const selectedUrl = (selectedChannel as any)?.streamUrl || selectedChannel?.url || '';
      const channelUrl = (channel as any).streamUrl || channel.url || '';
      if (
        selectedChannel &&
        (selectedChannel.id === channel.id ||
          (selectedUrl === channelUrl &&
            selectedChannel.name === channel.name))
      ) {
        console.log(
          '🔄 [ChannelPlayerScreen] Chaîne déjà sélectionnée, ignorer',
        );
        return;
      }

      // 2. ✅ CONTRÔLE PARENTAL SIMPLIFIÉ
      // Le PIN est déjà vérifié au niveau de la catégorie dans ChannelsScreen
      // Pas de vérification supplémentaire nécessaire ici
      console.log('✅ [ChannelPlayerScreen] Accès autorisé - PIN catégorie vérifié en amont');

      // 3. MISE À JOUR UI IMMÉDIATE pour éviter double surlignage
      setSelectedChannel(channel);
      lastSyncedChannelIdRef.current = channel.id;

      // 3. DÉMARRAGE IMMÉDIAT - Actions critiques en parallèle
      setIsChannelLoading(true);
      setIsPlaying(true);

      // S'assurer qu'on reste dans le ChannelPlayerScreen (pas de PIP)
      playerActions.setInChannelPlayerScreen(true);

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
    [playerActions, selectedChannel?.id, activeProfile],
  );

  // 🎯 RESTAURATION: Restaurer l'état lors du retour dans l'écran
  useFocusEffect(
    React.useCallback(() => {
      // Restaurer le contexte ChannelPlayerScreen
      if (playerStore.channel && playerStore.isVisible) {
        console.log('🎬 [ChannelPlayerScreen] Restauration état - Channel:', playerStore.channel.name);

        // S'assurer qu'on est bien dans le ChannelPlayerScreen
        playerActions.setInChannelPlayerScreen(true);

        // Si la vidéo était en plein écran, conserver cet état
        if (playerStore.isFullscreen) {
          console.log('🖥️ [ChannelPlayerScreen] Restauration mode plein écran');
          // Le mode plein écran est déjà conservé dans le store
        }
      }
    }, [playerStore.channel, playerStore.isVisible, playerStore.isFullscreen, playerActions])
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
        updatedRecents = updatedRecents.filter(
          recent => recent.id !== channel.id,
        );

        // Ajouter en tête
        updatedRecents.unshift(channel);

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
            // 👤 Récupérer le profil actif
            const activeProfile = await ProfileService.getActiveProfile();

            if (!activeProfile) {
              console.log('⚠️ [addToRecentChannelsOptimized] Aucun profil actif');
              return;
            }

            // 🆕 Utiliser le nouveau RecentChannelsService
            const RecentChannelsService = (
              await import('../services/RecentChannelsService')
            ).default;

            await RecentChannelsService.addRecent(
              channel,
              playlistId,
              activeProfile.id,
            );

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

  // Fonction pour ouvrir la recherche optimisée FinalSearch
  const openSearchScreen = async () => {
    try {
      // 🎯 Utiliser la catégorie ACTUELLE (pas initialCategory)
      const currentCategory = categories[currentCategoryIndex];
      const isToutCategory = currentCategory?.name === 'TOUT' ||
                            currentCategory?.name === 'Tout' ||
                            currentCategory?.id === 'all';

      // 🔑 Récupérer le vrai group_title depuis une chaîne de la catégorie (comme ChannelsScreen)
      let realGroupTitle: string | undefined;
      if (!isToutCategory && channels.length > 0) {
        const firstChannel = channels[0];
        realGroupTitle = (firstChannel as any).groupTitle || firstChannel.group || firstChannel.category;
      }

      // Si "TOUT" → recherche globale, sinon → recherche dans la catégorie actuelle
      const searchCategory = isToutCategory ? 'all' : (currentCategory?.id || 'all');
      const rawCategoryName = currentCategory?.name || 'GLOBAL';
      const searchCategoryName = isToutCategory ? undefined : normalizeCategoryName(rawCategoryName);

      // 🔒 Filtrer les catégories actuellement verrouillées (exclure les déverrouillées)
      const currentlyLockedCategories = blockedCategories.filter(cat => !isUnlocked(cat));

      // FinalSearch n'a pas besoin de tout ce traitement - il utilise SQL direct
      navigation.navigate('FinalSearch', {
        playlistId: playlistId!,
        initialCategory: searchCategory,
        categoryName: searchCategoryName,
        categoryGroupTitle: realGroupTitle, // 🔑 Vrai group_title pour filtrage SQL
        playlistName: playlistName || 'Playlist',
        playlistType: 'XTREAM',
        blockedCategories: currentlyLockedCategories, // 🔒 Seulement les catégories encore verrouillées
      });
    } catch (error) {
      console.error('❌ [ChannelPlayerScreen] Erreur navigation FinalSearch:', error);
      // Fallback: navigation basique si erreur
      navigation.navigate('FinalSearch', {
        playlistId: playlistId!,
        initialCategory: 'all',
        categoryName: undefined,
        categoryGroupTitle: undefined,
      });
    }
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
    const channelUrl = (selectedChannel as any).streamUrl || selectedChannel.url || '';
    if (selectedChannel.quality) {
      badges.push(selectedChannel.quality.toUpperCase());
    } else if (channelUrl.includes('1080')) {
      badges.push('FHD');
    } else if (channelUrl.includes('720')) {
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

  // 🚀 PAGINATION INFINIE: Charger plus de chaînes quand on scroll vers le bas (NON-BLOQUANT)
  const loadMoreChannels = useCallback(() => {
    if (isLoadingMore || !hasMoreChannels) {
      console.log(`⏸️ [Pagination] Skip loading - isLoadingMore: ${isLoadingMore}, hasMore: ${hasMoreChannels}`);
      return;
    }

    setIsLoadingMore(true);
    console.log(`⬇️ [Pagination] Chargement chaînes suivantes (background)...`);

    // ✅ Charger en arrière-plan sans bloquer le scroll
    setTimeout(async () => {
      try {
      // Calculer le nouvel offset basé sur le nombre de chaînes déjà chargées
      const newOffset = currentWindowOffset + channels.length;

      if (newOffset >= totalChannelsInPlaylist) {
        console.log(`✋ [Pagination] Fin atteinte - offset: ${newOffset} >= total: ${totalChannelsInPlaylist}`);
        setHasMoreChannels(false);
        setIsLoadingMore(false);
        return;
      }

      console.log(`📊 [Pagination] Chargement depuis offset: ${newOffset}, limit: ${CHANNELS_PER_PAGE}`);

      // Charger les chaînes suivantes
      const database = await import('../database').then(db => db.default);
      const channelsRaw = await database
        .get('channels')
        .query(
          Q.where('playlist_id', playlistId),
          Q.skip(newOffset),
          Q.take(CHANNELS_PER_PAGE),
        )
        .fetch();

      console.log(`✅ [Pagination] ${channelsRaw.length} chaînes récupérées`);

      // Mapper vers le format Channel
      const newChannels = channelsRaw.map((ch: any) => ({
        id: ch.id,
        name: ch.name,
        url: ch.streamUrl || ch.url,
        logo: ch.logoUrl || ch.logo,
        groupTitle: ch.groupTitle || '',
        category: ch.categoryId,
        tvgId: ch.tvgId,
        quality: ch.isHD ? 'HD' : undefined,
        isAdult: ch.isAdult,
        epgId: ch.tvgId,
      }));

      // Ajouter à la liste existante
      setChannels(prev => [...prev, ...newChannels]);
      setHasMoreChannels(newChannels.length === CHANNELS_PER_PAGE);

        console.log(`🎉 [Pagination] Total chaînes maintenant: ${channels.length + newChannels.length}, hasMore: ${newChannels.length === CHANNELS_PER_PAGE}`);
      } catch (error) {
        console.error('❌ [Pagination] Erreur chargement:', error);
      } finally {
        setIsLoadingMore(false);
      }
    }, 0); // ✅ setTimeout avec 0ms = exécution immédiate sans bloquer UI thread
  }, [isLoadingMore, hasMoreChannels, currentWindowOffset, channels.length, totalChannelsInPlaylist, playlistId, CHANNELS_PER_PAGE]);

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

  // ✅ PAS DE FOOTER - Les apps pro n'ont pas d'indicateur de chargement visible
  const renderFooter = () => null;

  // 🚀 APPROCHE HYBRIDE PRO - Affichage instantané + Chargement arrière-plan
  // ⚡ SOLUTION ULTRA-OPTIMISÉE - Type IPTV Smarters Pro
  const loadAllChannelsOptimized = async () => {
    try {
      console.log('⚡ [ChannelPlayer] CHARGEMENT ULTRA-RAPIDE - Toutes les chaînes...');
      const startTime = performance.now();

      // 🎯 Requête optimisée - TOUT charger d'un coup comme les pros
      const allChannelsRaw = await database.get('channels')
        .query(
          Q.where('playlist_id', playlistId),
          Q.sortBy('name', Q.asc)
        )
        .fetch();

      const queryTime = performance.now() - startTime;
      console.log(`🚀 Database query: ${allChannelsRaw.length} chaînes en ${queryTime.toFixed(2)}ms`);

      // 🚀 Conversion ultra-rapide - map direct sans validations
      const formattedChannels = allChannelsRaw.map((ch: any) => ({
        id: ch.id,
        name: ch.name,
        url: ch.streamUrl || ch.url,
        logo: ch.logoUrl || ch.logo,
        groupTitle: ch.groupTitle || '',
        group: ch.groupTitle || '',
        category: ch.groupTitle || '',
        streamUrl: ch.streamUrl || ch.url,
        tvgId: ch.tvgId,
        streamType: ch.streamType,
        streamId: ch.streamId,
        isAdult: ch.isAdult,
        isFavorite: ch.isFavorite,
        language: ch.language,
        country: ch.country,
        quality: ch.isHD ? 'HD' : 'SD',
        isHighlighted: false,
      }));

      const totalTime = performance.now() - startTime;
      console.log(`⚡ Conversion terminée: ${formattedChannels.length} chaînes en ${totalTime.toFixed(2)}ms`);

      // 🎯 MISE À JOUR ATOMIQUE + SCROLL IMMÉDIAT
      setDisplayedChannels(formattedChannels);
      setChannels(formattedChannels);
      setHasMoreChannels(false);
      setIsLoadingMore(false);

      // 🚀 SCROLL IMMÉDIAT vers la chaîne cible (comme IPTV Smarters)
      requestAnimationFrame(() => {
        const targetIndex = formattedChannels.findIndex(ch => ch.id === selectedChannel.id);
        if (targetIndex !== -1 && channelsListRef.current) {
          console.log(`⚡ Scroll immédiat vers: ${selectedChannel.name} (index: ${targetIndex})`);
          channelsListRef.current.scrollToIndex({
            index: targetIndex,
            animated: false,
            viewPosition: 0.3, // Position légèrement au-dessus pour voir le contexte
          });
        }
      });

      console.log(`✅ CHARGEMENT COMPLET: ${formattedChannels.length} chaînes en ${totalTime.toFixed(2)}ms`);

    } catch (error) {
      console.error('❌ [ChannelPlayer] Erreur chargement optimisé:', error);
      // Fallback minimal
      setDisplayedChannels([]);
      setChannels([]);
      setHasMoreChannels(false);
      setIsLoadingMore(false);
    }
  };

  // ✅ PAS DE CHARGEMENT PROGRESSIF - Les apps pro chargent tout d'un coup

  // 🚀 CHARGEMENT DYNAMIQUE ULTRA-OPTIMISÉ - SQL direct pour le changement de catégorie
  const loadChannelsForCategory = async (
    categoryId: string,
    categoryName: string,
  ) => {
    try {
      console.log(`⚡ [ChannelPlayer] Chargement optimisé catégorie "${categoryName}"...`);
      const startTime = Date.now();

      // 🎯 CAS SPÉCIAL: Catégorie FAVORIS - utiliser les vrais favoris
      if (
        categoryName.toLowerCase().includes('favori') ||
        categoryName.toLowerCase().includes('favorite') ||
        categoryName.includes('⭐') ||
        categoryId.includes('favorite') ||
        categoryId.includes('favori')
      ) {
        console.log(`⭐ [ChannelPlayer] Chargement catégorie FAVORIS optimisé...`);

        // 👤 Récupérer le profil actif
        const activeProfile = await ProfileService.getActiveProfile();
        if (!activeProfile) {
          console.log('⚠️ [ChannelPlayer] Aucun profil actif');
          setChannels([]);
          return;
        }

        // 🆕 Charger les favoris depuis FavoritesService
        const FavoritesService = (
          await import('../services/FavoritesService')
        ).default;

        let favoriteChannelsData = await FavoritesService.getFavoriteChannelsByProfile(
          activeProfile.id,
          playlistId,
        );

        // 🔒 FILTRER les chaînes des catégories bloquées
        const blockedCategories = activeProfile.blockedCategories || [];
        if (blockedCategories.length > 0) {
          const beforeCount = favoriteChannelsData.length;
          favoriteChannelsData = favoriteChannelsData.filter((ch: any) => {
            // ✅ Validation robuste de groupTitle
            const groupTitle = ((ch as any).groupTitle || ch.group || ch.category || '');
            if (typeof groupTitle !== 'string') {
              return true; // Garder la chaîne si groupTitle invalide
            }

            const groupTitleLower = groupTitle.toLowerCase();

            // ✅ Validation robuste des catégories bloquées
            return !blockedCategories.some(blocked => {
              if (!blocked || typeof blocked !== 'string') {
                return false; // Ignorer les valeurs invalides
              }
              return groupTitleLower.includes(blocked.toLowerCase());
            });
          });
          console.log(
            `🔒 [ChannelPlayer] Favoris filtrés: ${beforeCount} → ${favoriteChannelsData.length} chaînes`,
          );
        }

        setChannels(favoriteChannelsData);
        // ✅ Réinitialiser displayedChannels pour éviter d'afficher les anciennes données
        setDisplayedChannels([]);
        // ✅ Mettre à jour la liste des IDs favoris pour le compteur du header
        setFavoriteChannels(favoriteChannelsData.map(ch => ch.id));
        // Précharger les logos
        preloadChannelLogos(favoriteChannelsData);

        // 🚫 DÉSACTIVER COMPLÈTEMENT la pagination - tous les favoris sont déjà chargés
        setHasMoreChannels(false);
        setIsLoadingMore(false);
        setCurrentWindowOffset(0);
        setCurrentPage(0);

        const loadTime = Date.now() - startTime;
        console.log(`✅ [ChannelPlayer] Catégorie FAVORIS chargée en ${loadTime}ms (${favoriteChannelsData.length} chaînes)`);
        return;
      }

      // 🎯 CAS SPÉCIAL: Catégorie RÉCENTS - utiliser les vraies chaînes récentes
      if (
        categoryName.toLowerCase().includes('récent') ||
        categoryName.toLowerCase().includes('recent') ||
        categoryName.includes('📺') ||
        categoryId.includes('history') ||
        categoryId.includes('recent')
      ) {
        console.log(`🎯 [ChannelPlayer] Chargement catégorie RÉCENTS optimisé...`);

        // 👤 Récupérer le profil actif
        const activeProfile = await ProfileService.getActiveProfile();
        if (!activeProfile) {
          console.log('⚠️ [ChannelPlayer] Aucun profil actif');
          setChannels([]);
          return;
        }

        // 🆕 Utiliser le nouveau RecentChannelsService
        const RecentChannelsService = (
          await import('../services/RecentChannelsService')
        ).default;

        let recentChannelsData = await RecentChannelsService.getRecentsByProfile(
          activeProfile.id,
          playlistId,
        );

        // 🔒 FILTRER les chaînes des catégories bloquées
        const blockedCategories = activeProfile.blockedCategories || [];
        if (blockedCategories.length > 0) {
          const beforeCount = recentChannelsData.length;
          recentChannelsData = recentChannelsData.filter((ch: any) => {
            // ✅ Validation robuste de groupTitle
            const groupTitle = ((ch as any).groupTitle || ch.group || ch.category || '');
            if (typeof groupTitle !== 'string') {
              return true; // Garder la chaîne si groupTitle invalide
            }

            const groupTitleLower = groupTitle.toLowerCase();

            // ✅ Validation robuste des catégories bloquées
            return !blockedCategories.some(blocked => {
              if (!blocked || typeof blocked !== 'string') {
                return false; // Ignorer les valeurs invalides
              }
              return groupTitleLower.includes(blocked.toLowerCase());
            });
          });
          console.log(
            `🔒 [ChannelPlayer] Récents filtrés: ${beforeCount} → ${recentChannelsData.length} chaînes`,
          );
        }

        setChannels(recentChannelsData);
        // ✅ Réinitialiser displayedChannels pour éviter d'afficher les anciennes données
        setDisplayedChannels([]);
        // Précharger les logos
        preloadChannelLogos(recentChannelsData);
        // Mettre à jour l'état local pour la cohérence
        setRecentChannels(recentChannelsData);
        setStoreRecentChannels(recentChannelsData, activeProfile.id);

        // 🚫 DÉSACTIVER COMPLÈTEMENT la pagination - tous les récents sont déjà chargés
        setHasMoreChannels(false);
        setIsLoadingMore(false);
        setCurrentWindowOffset(0);
        setCurrentPage(0);

        const loadTime = Date.now() - startTime;
        console.log(`✅ [ChannelPlayer] Catégorie RÉCENTS chargée en ${loadTime}ms (${recentChannelsData.length} chaînes)`);
        return;
      }

      // 🚀 CHARGEMENT ULTRA-RAPIDE: requête SQL directe avec matching flexible
      console.log(`🔍 [ChannelPlayer] Recherche flexible pour "${categoryName}"...`);

      const database = await import('../database').then(db => db.default);

      // Générer TOUTES les variantes possibles pour matching ultra-flexible
      const baseClean = categoryName.trim();
      const categoryVariants = [
        baseClean,                                           // 1. Original nettoyé
        baseClean.replace(/\s+/g, ' '),                     // 2. Espaces multiples → simple
        baseClean.replace(/\s*\|\s*/g, ' - '),              // 3. Pipe → Tiret avec espaces
        baseClean.replace(/\s*-\s*/g, ' | '),               // 4. Tiret → Pipe avec espaces
        baseClean.replace(/\s*\|\s*/g, '| '),               // 5. Pipe sans espace avant (VIP| X)
        baseClean.replace(/\s*\|\s*/g, ' |'),               // 6. Pipe sans espace après (VIP |X)
        baseClean.replace(/\s*\|\s*/g, '|'),                // 7. Pipe sans espaces (VIP|X)
        baseClean.replace(/\s*-\s*/g, '- '),                // 8. Tiret sans espace avant (VIP- X)
        baseClean.replace(/\s*-\s*/g, ' -'),                // 9. Tiret sans espace après (VIP -X)
        baseClean.replace(/\s*-\s*/g, '-'),                 // 10. Tiret sans espaces (VIP-X)
        baseClean.replace(/\s*\|\s*/g, ' - ').replace(/\s+/g, ' '),  // 11. Pipe→Tiret + espaces normalisés
        baseClean.replace(/\s*-\s*/g, ' | ').replace(/\s+/g, ' '),   // 12. Tiret→Pipe + espaces normalisés
      ];

      // Supprimer les doublons
      const uniqueVariants = [...new Set(categoryVariants)];

      let categoryChannels: any[] = [];
      let matchedVariant = '';

      // Essayer chaque variante jusqu'à trouver des chaînes
      for (const variant of uniqueVariants) {
        categoryChannels = await database.get('channels')
          .query(
            Q.where('playlist_id', playlistId),
            Q.where('group_title', variant)
          )
          .fetch();

        if (categoryChannels.length > 0) {
          matchedVariant = variant;
          console.log(`✅ [ChannelPlayer] Trouvé ${categoryChannels.length} chaînes avec variante: "${variant}"`);
          break;
        }
      }

      if (categoryChannels.length === 0) {
        console.log(`⚠️ [ChannelPlayer] Aucune chaîne trouvée pour: "${categoryName}" (essayé ${uniqueVariants.length} variantes)`);
      }

      const loadTime = Date.now() - startTime;
      console.log(`⚡ [ChannelPlayer] ${categoryChannels.length} chaînes chargées en ${loadTime}ms via SQL direct`);

      if (categoryChannels.length > 0) {
        // Convertir les chaînes de la base de données vers le format Channel
        const formattedChannels = categoryChannels.map((ch: any) => ({
          id: ch.id,
          name: ch.name,
          url: ch.streamUrl || ch.url,
          logo: ch.logoUrl || ch.logo,
          groupTitle: ch.groupTitle,
          group: ch.groupTitle,
          category: ch.groupTitle,
          streamUrl: ch.streamUrl || ch.url,
          tvgId: ch.tvgId,
          streamType: ch.streamType,
          streamId: ch.streamId,
          isAdult: ch.isAdult,
          isFavorite: ch.isFavorite,
          language: ch.language,
          country: ch.country,
          quality: ch.isHD ? 'HD' : 'SD',
          isHighlighted: false,
        }));

        setChannels(formattedChannels);
        // Précharger les logos
        preloadChannelLogos(formattedChannels);
        console.log(`✅ [ChannelPlayer] Catégorie "${categoryName}" prête (${formattedChannels.length} chaînes)`);
      } else {
        console.log(`⚠️ [ChannelPlayer] Catégorie "${categoryName}" vide ou non trouvée`);
        setChannels([]);
      }
    } catch (error) {
      console.error(
        `❌ [ChannelPlayer] Erreur chargement catégorie "${categoryName}":`,
        error,
      );
      // Fallback silencieux
      const fallbackChannels =
        categories.find(cat => cat.id === categoryId)?.channels || [];
      if (fallbackChannels.length > 0) {
        setChannels(fallbackChannels);
        // Précharger les logos
        preloadChannelLogos(fallbackChannels);
        console.log(`🔄 [ChannelPlayer] Fallback utilisé pour "${categoryName}" (${fallbackChannels.length} chaînes)`);
      } else {
        setChannels([]);
      }
    }
  };

  // 🚀 Composant ultra-optimisé avec React.memo et comparaison précise
  const ChannelListItem = React.memo(
    ({
      item,
      index,
      isSelected,
      isFavorite,
      isLocked,
      activeProfile,
      onPress,
      onLongPress,
    }: {
      item: Channel;
      index: number;
      isSelected: boolean;
      isFavorite: boolean;
      isLocked: boolean;
      activeProfile: any;
      onPress: (item: Channel) => void;
      onLongPress?: (item: Channel) => void;
    }) => {
      // Mémoriser le style conditionnel pour éviter recreation
      const itemStyle = React.useMemo(
        () => [
          styles.channelListItem,
          isSelected && styles.channelListItemSelected,
        ],
        [isSelected],
      );

      const titleStyle = React.useMemo(
        () => [styles.channelTitle, isSelected && styles.channelTitleSelected],
        [isSelected],
      );

      // Mémoriser le handler pour éviter recreation
      const handlePress = React.useCallback(() => {
        onPress(item);
      }, [onPress, item]);

      const handleLongPress = React.useCallback(() => {
        if (onLongPress) {
          onLongPress(item);
        }
      }, [onLongPress, item]);

      return (
        <TouchableOpacity
          style={itemStyle}
          onPress={handlePress}
          onLongPress={handleLongPress}
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
                  label={(item.name || 'CH').substring(0, 2).toUpperCase()}
                  size={36}
                  style={styles.channelAvatarFallback}
                  labelStyle={styles.channelAvatarText}
                />
              )}
            </View>

            {/* Titre de la chaîne */}
            <View style={styles.channelTextContainer}>
              <Text style={titleStyle} numberOfLines={1}>
                {item.name || 'Sans nom'}
              </Text>
            </View>

            {/* Indicateurs */}
            <View style={styles.channelIndicators}>
              {/* Badge cadenas si chaîne verrouillée */}
              {isLocked && <LockedChannelBadge size="small" absolute={false} />}

              {/* Indicateur favori */}
              {isFavorite && (
                <View style={styles.favoriteIndicator}>
                  <Icon name="favorite" size={16} color="#3B82F6" />
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    // 🎯 Comparaison personnalisée ultra-précise pour éviter re-renders inutiles
    (prevProps, nextProps) => {
      // Comparaison robuste qui évite les faux positifs
      const isSameChannel =
        prevProps.item.id === nextProps.item.id &&
        prevProps.item.url === nextProps.item.url &&
        prevProps.item.name === nextProps.item.name;

      const isSameSelection = prevProps.isSelected === nextProps.isSelected;
      const isSameFavorite = prevProps.isFavorite === nextProps.isFavorite;
      const isSameLocked = prevProps.isLocked === nextProps.isLocked;
      const isSameLogo = prevProps.item.logo === nextProps.item.logo;

      return isSameChannel && isSameSelection && isSameFavorite && isSameLocked && isSameLogo;
    },
  );

  // 🚀 Fonction de comparaison robuste pour éviter double surlignage
  const isChannelSelected = React.useCallback(
    (item: Channel): boolean => {
      // Utiliser la chaîne EN COURS DE LECTURE depuis PlayerStore (pas selectedChannel local)
      const currentPlayingChannel = playerStore.channel;

      if (!currentPlayingChannel) {
        return false;
      }

      // 1. Comparaison par ID exact (priorité)
      if (item.id === currentPlayingChannel.id) {
        return true;
      }

      // 2. Si les IDs sont identiques mais pas la même instance, comparer par URL et nom
      if (item.id !== currentPlayingChannel.id) {
        // Comparaison stricte : URL ET nom doivent matcher exactement
        return (
          item.url === currentPlayingChannel.url && item.name === currentPlayingChannel.name
        );
      }

      return false;
    },
    [playerStore.channel],
  );

  // 🎯 Handler pour l'option Accueil
  const handleGoHome = useCallback(() => {
    // Masquer le menu d'options
    setShowOptionsMenu(false);

    // Arrêter la lecture vidéo et fermer le PIP
    playerActions.stop();
    playerActions.setFullscreen(false);
    playerActions.setInChannelPlayerScreen(false);

    // Revenir à l'écran principal IPTV Smarters
    navigation.navigate('IPTVSmarters' as never);

    showNotification('Retour à l\'accueil', 'success');
  }, [navigation, playerActions]);

  // 🎯 Handler pour l'option Trier
  const handleSortChannels = useCallback(() => {
    // Masquer le menu d'options et afficher les options de tri
    setShowOptionsMenu(false);
    setShowSortOptions(true);
  }, []);

  // 🎯 Handler pour appliquer le tri
  const applySort = useCallback((sortOrder: 'default' | 'name-asc' | 'name-desc') => {
    setCurrentSortOrder(sortOrder);
    setShowSortOptions(false);

    let sortedChannels = [...channels];

    switch (sortOrder) {
      case 'name-asc':
        sortedChannels.sort((a, b) => a.name.localeCompare(b.name));
        showNotification('Chaînes triées par nom (A-Z)', 'success');
        break;
      case 'name-desc':
        sortedChannels.sort((a, b) => b.name.localeCompare(a.name));
        showNotification('Chaînes triées par nom (Z-A)', 'success');
        break;
            case 'default':
        // Restaurer l'ordre initial
        const originalCategory = allCategories[currentCategoryIndex];
        if (originalCategory?.channels) {
          sortedChannels = [...originalCategory.channels];
        }
        showNotification('Tri par défaut', 'success');
    }

    // Mettre à jour les canaux triés
    setChannels(sortedChannels);
  }, [channels, allCategories, currentCategoryIndex]);

  // 🎯 Handler pour annuler le tri
  const cancelSort = useCallback(() => {
    setShowSortOptions(false);
  }, []);

  // 🎯 Handler pour l'option Paramètres
  const handleGoToSettings = useCallback(() => {
    // Masquer le menu d'options
    setShowOptionsMenu(false);

    // Mettre en pause au lieu d'arrêter pour préserver l'état
    if (playerStore.channel && !playerStore.isPaused) {
      playerActions.togglePlayPause();
    }
    playerActions.setFullscreen(false);
    playerActions.setInChannelPlayerScreen(false);

    // Naviguer vers l'écran des paramètres sans PIP
    navigation.navigate('Settings' as never);

    showNotification('Ouverture des paramètres', 'success');
  }, [navigation, playerActions]);

  // 🎯 Handler pour l'option Déconnexion/Profils
  const handleLogoutOrProfiles = useCallback(() => {
    // Masquer le menu d'options
    setShowOptionsMenu(false);

    // Afficher la boîte de dialogue moderne avec animation
    setShowLogoutDialog(true);
    Animated.spring(logoutDialogAnimValue, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, [logoutDialogAnimValue]);

  // 🎯 Handler pour confirmer la déconnexion
  const handleConfirmLogout = useCallback(() => {
    // Animation de fermeture
    Animated.timing(logoutDialogAnimValue, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowLogoutDialog(false);
    });

    console.log('✅ [ChannelPlayerScreen] Confirmation déconnexion - arrêt complet du lecteur et affichage profils');

    // Forcer l'arrêt complet du lecteur vidéo et désactiver complètement le PIP
    playerActions.stop();
    playerActions.setFullscreen(false);
    playerActions.setInChannelPlayerScreen(false);

    // S'assurer que le PIP est complètement désactivé
    setTimeout(() => {
      playerActions.setFullscreen(false);
      playerActions.setInChannelPlayerScreen(false);
    }, 100);

    // Afficher le modal des profils
    setShowProfilesModal(true);

    showNotification('Gestion des profils', 'success');
  }, [playerActions, logoutDialogAnimValue]);

  // 🎯 Handler pour annuler la déconnexion
  const handleCancelLogout = useCallback(() => {
    // Animation de fermeture
    Animated.timing(logoutDialogAnimValue, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowLogoutDialog(false);
    });
    console.log('❌ [ChannelPlayerScreen] Annulation de la déconnexion');
  }, [logoutDialogAnimValue]);

  // 🎯 Handler pour la sélection d'une playlist depuis le profils
  const handleProfileSelect = useCallback((playlist: any) => {
    setShowProfilesModal(false);
    showNotification('Changement de playlist', 'success');
    // Revenir à l'écran principal pour recharger avec la nouvelle playlist
    navigation.navigate('IPTVSmarters' as never);
  }, [navigation]);

  // 🎯 Handler pour fermer le modal des profils
  const handleProfilesClose = useCallback(() => {
    setShowProfilesModal(false);
  }, []);

  // 🎯 Handlers pour les modaux de connexion (ajout de playlist)

  // Handler pour ouvrir le modal de connexion depuis ProfilesModal
  const handleAddPlaylist = useCallback(() => {
    console.log('🆕 [ChannelPlayerScreen] Ouverture du modal de connexion depuis ProfilesModal');
    // Ouvrir ConnectionModal IMMÉDIATEMENT pour éviter le flash
    setShowConnectionModal(true);
    // Fermer ProfilesModal après un court délai pour chevauchement fluide
    setTimeout(() => {
      setShowProfilesModal(false);
    }, 50);
  }, []);

  // Handler pour fermer le modal de connexion et revenir à ProfilesModal
  const handleConnectionClose = useCallback(() => {
    console.log('🔙 [ChannelPlayerScreen] Fermeture ConnectionModal, retour à ProfilesModal');
    // Ouvrir ProfilesModal IMMÉDIATEMENT pour éviter le flash
    setShowProfilesModal(true);
    // Fermer ConnectionModal après un court délai pour chevauchement fluide
    setTimeout(() => {
      setShowConnectionModal(false);
    }, 50);
  }, []);

  // Handler pour ouvrir le modal Xtream Codes
  const handleXtreamConnect = useCallback(() => {
    console.log('🔐 [ChannelPlayerScreen] Ouverture du modal Xtream Codes');
    // Ouvrir XtreamModal IMMÉDIATEMENT pour éviter le flash
    setShowXtreamModal(true);
    // Fermer ConnectionModal après un court délai
    setTimeout(() => {
      setShowConnectionModal(false);
    }, 50);
  }, []);

  // Handler pour ouvrir le modal M3U URL
  const handleM3UConnect = useCallback(() => {
    console.log('📁 [ChannelPlayerScreen] Ouverture du modal M3U URL');
    // Ouvrir M3UModal IMMÉDIATEMENT pour éviter le flash
    setShowM3UModal(true);
    // Fermer ConnectionModal après un court délai
    setTimeout(() => {
      setShowConnectionModal(false);
    }, 50);
  }, []);

  // Handler pour l'option "Profils" du ConnectionModal
  const handleUsersList = useCallback(() => {
    console.log('👥 [ChannelPlayerScreen] Retour à la liste des profils');
    // Ouvrir ProfilesModal IMMÉDIATEMENT pour éviter le flash
    setShowProfilesModal(true);
    // Fermer ConnectionModal après un court délai
    setTimeout(() => {
      setShowConnectionModal(false);
    }, 50);
  }, []);

  // Handler pour fermer Xtream Modal et retourner au Connection Modal
  const handleXtreamClose = useCallback(() => {
    console.log('🔙 [ChannelPlayerScreen] Fermeture Xtream Modal, retour à Connection Modal');
    // Ouvrir ConnectionModal IMMÉDIATEMENT pour éviter le flash
    setShowConnectionModal(true);
    // Fermer XtreamModal après un court délai
    setTimeout(() => {
      setShowXtreamModal(false);
    }, 50);
  }, []);

  // Handler pour fermer M3U Modal et retourner au Connection Modal
  const handleM3UClose = useCallback(() => {
    console.log('🔙 [ChannelPlayerScreen] Fermeture M3U Modal, retour à Connection Modal');
    // Ouvrir ConnectionModal IMMÉDIATEMENT pour éviter le flash
    setShowConnectionModal(true);
    // Fermer M3UModal après un court délai
    setTimeout(() => {
      setShowM3UModal(false);
    }, 50);
  }, []);

  // Handler pour la connexion Xtream Codes
  const handleXtreamConnection = useCallback(async (credentials: any) => {
    console.log('🔐 [ChannelPlayerScreen] Connexion Xtream avec:', credentials);
    // Ouvrir ProfilesModal IMMÉDIATEMENT pour éviter le flash
    setShowProfilesModal(true);
    // Fermer XtreamModal après un court délai
    setTimeout(() => {
      setShowXtreamModal(false);
    }, 50);
    showNotification('Playlist Xtream ajoutée avec succès', 'success');
    // TODO: Implémenter l'ajout de la playlist Xtream
  }, [showNotification]);

  // Handler pour la connexion M3U URL
  const handleM3UConnection = useCallback(async (source: any) => {
    console.log('📁 [ChannelPlayerScreen] Connexion M3U avec:', source);
    // Ouvrir ProfilesModal IMMÉDIATEMENT pour éviter le flash
    setShowProfilesModal(true);
    // Fermer M3UModal après un court délai
    setTimeout(() => {
      setShowM3UModal(false);
    }, 50);
    showNotification('Playlist M3U ajoutée avec succès', 'success');
    // TODO: Implémenter l'ajout de la playlist M3U
  }, [showNotification]);

  // Handler pour appui long sur une chaîne (favoris)
  const handleChannelLongPress = React.useCallback(
    async (channel: Channel) => {
      try {
        if (!activeProfileId) {
          console.log('❌ [ChannelPlayerScreen] Aucun profil actif');
          Alert.alert('Erreur', 'Aucun profil actif');
          return;
        }

        // Ouvrir le modal personnalisé
        setSelectedChannelForFavorite(channel);
        setFavoriteModalVisible(true);
      } catch (error) {
        console.error(
          '❌ [ChannelPlayerScreen] Erreur appui long favori:',
          error,
        );
      }
    },
    [activeProfileId],
  );

  // Handler pour confirmer l'action favori depuis le modal
  const handleConfirmFavorite = React.useCallback(async () => {
    try {
      if (!selectedChannelForFavorite || !activeProfileId) {
        return;
      }

      const newIsFavorite = await FavoritesService.toggleFavorite(
        selectedChannelForFavorite,
        playlistId,
        activeProfileId,
      );

      // Mettre à jour l'état local des favoris
      const updatedFavorites = newIsFavorite
        ? [...favoriteChannels, selectedChannelForFavorite.id]
        : favoriteChannels.filter(id => id !== selectedChannelForFavorite.id);

      setFavoriteChannels(updatedFavorites);

      console.log(
        `⭐ [ChannelPlayerScreen] Favori ${
          newIsFavorite ? 'ajouté' : 'retiré'
        } pour chaîne:`,
        selectedChannelForFavorite.name,
        `(Total: ${updatedFavorites.length})`,
      );

      // 🔄 Synchroniser avec GlobalVideoPlayer via événement global
      emitFavoriteUpdate(selectedChannelForFavorite.id, newIsFavorite);

      // Fermer le modal
      setFavoriteModalVisible(false);
      setSelectedChannelForFavorite(null);
    } catch (error) {
      console.error('❌ [ChannelPlayerScreen] Erreur toggle favori:', error);
      Alert.alert('Erreur', 'Impossible de modifier les favoris');
      setFavoriteModalVisible(false);
      setSelectedChannelForFavorite(null);
    }
  }, [
    selectedChannelForFavorite,
    activeProfileId,
    playlistId,
    favoriteChannels,
  ]);

  // Rendu d'une chaîne dans la liste de gauche - Version ultra-optimisée
  const renderChannelItem = React.useCallback(
    ({item, index}: {item: Channel; index: number}) => {
      const isFavorite = favoriteChannels.includes(item.id);
      const isLocked = lockedChannels.has(item.id); // 🔒 Vérifier si la chaîne est verrouillée

      
      return (
        <ChannelListItem
          item={item}
          index={index}
          isSelected={isChannelSelected(item)}
          isFavorite={isFavorite}
          isLocked={isLocked}
          activeProfile={activeProfile}
          onPress={handleChannelSelect}
          onLongPress={handleChannelLongPress}
        />
      );
    },
    [
      isChannelSelected,
      handleChannelSelect,
      handleChannelLongPress,
      favoriteChannels,
      lockedChannels,
      activeProfile,
    ],
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
              label={(selectedChannel.name || 'CH').substring(0, 2).toUpperCase()}
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
              <Icon name="search" size={22} color={colors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowOptionsMenu(true)}
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
                color={
                  currentCategoryIndex === 0
                    ? colors.text.tertiary
                    : colors.text.primary
                }
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
          {/* 🔄 Indicateur de chargement pour la pagination */}
          {isLoadingMore && (
            <View style={styles.loadingMoreContainer}>
              <ActivityIndicator
                size="small"
                color="#00BCD4"
                style={styles.loadingMoreIndicator}
              />
              <Text style={styles.loadingMoreText}>
                Chargement des chaînes...
              </Text>
            </View>
          )}

          <FlashList
            ref={channelsListRef}
            data={displayedChannels.length > 0 ? displayedChannels : channels}
            renderItem={renderChannelItem}
            keyExtractor={(item) => item.id} // ✅ Pas de préfixe - FlashList recommande ID pur
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.channelsListContent}
            onLayout={() => {
              if (!isFlashListReadyRef.current) {
                console.log('🎯 [FlashList] onLayout - FlashList prêt pour auto-scroll');
                isFlashListReadyRef.current = true;
              }
            }}
            // 🚀 OPTIMISATIONS PRO IPTV SMARTERS - Ultra-performantes
            estimatedItemSize={58} // Taille exacte optimisée (60 -> 58px)
            initialNumToRender={12} // ✅ Pro: 12 items initiaux = premier rendu ultra-rapide
            maxToRenderPerBatch={8} // ✅ Pro: 8 items par batch = scroll parfaitement fluide
            updateCellsBatchingPeriod={16} // ✅ Pro: 16ms = 60 FPS parfait
            windowSize={15} // ✅ Pro: 15 écrans = mémoire optimisée
            drawDistance={200} // ✅ Pro: 200px = buffer minimal mais suffisant
            estimatedListSize={{height: height * 0.72, width: width * 0.24}}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            extraData={`${playerStore.channel?.id}-${favoriteChannels.length}-${channels.length}-${lockedChannels.size}`}
            // 🚀 PAGINATION INFINIE - Optimisée pour scroll rapide
            onEndReached={loadMoreChannels}
            onEndReachedThreshold={1.2} // ✅ 1.2 = Chargement très anticipé (120% avant la fin)
            ListFooterComponent={
              hasMoreChannels && !isLoadingMore ? (
                <View style={{padding: 10, alignItems: 'center'}}>
                  <Text style={{color: '#666', fontSize: 12}}>
                    Scrollez pour charger plus de chaînes...
                  </Text>
                </View>
              ) : !hasMoreChannels ? (
                <View style={{padding: 10, alignItems: 'center'}}>
                  <Text style={{color: '#666', fontSize: 12}}>
                    Fin de la liste ({channels.length} chaînes)
                  </Text>
                </View>
              ) : null
            }
            // 🎯 RECYCLAGE AGRESSIF - Configuration IPTV Smarters Pro
            removeClippedSubviews={true}
            // ✅ PAS DE PAGINATION - Toutes les données chargées d'un coup
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

      {/* 🎯 Modal Menu Options avec effet flou parfait */}
      <Modal
        visible={showOptionsMenu}
        transparent={true}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowOptionsMenu(false)}>
        <View style={styles.optionsModalBlurOverlay}>
          <BlurView
            style={RNStyleSheet.absoluteFill}
            blurType="dark"
            blurAmount={5}
          />
          <TouchableOpacity
            style={RNStyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowOptionsMenu(false)}
          />
          <Animated.View
            style={[
              styles.optionsMenuContainer,
              {
                opacity: optionsMenuAnimValue,
                transform: [
                  {
                    scale: optionsMenuAnimValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                  {
                    translateY: optionsMenuAnimValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  },
                ],
              },
            ]}>
            <TouchableOpacity
              style={styles.optionMenuItem}
              onPress={handleGoHome}
              activeOpacity={0.7}>
              <Icon name="home" size={20} color={colors.text.primary} style={styles.optionMenuIcon} />
              <Text style={styles.optionMenuText}>{tCommon('home')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionMenuItem}
              onPress={handleSortChannels}
              activeOpacity={0.7}>
              <Icon name="sort" size={20} color={colors.text.primary} style={styles.optionMenuIcon} />
              <Text style={styles.optionMenuText}>{tCommon('sort')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionMenuItem}
              onPress={handleGoToSettings}
              activeOpacity={0.7}>
              <Icon name="settings" size={20} color={colors.text.primary} style={styles.optionMenuIcon} />
              <Text style={styles.optionMenuText}>{tCommon('settings')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionMenuItem}
              onPress={handleLogoutOrProfiles}
              activeOpacity={0.7}>
              <Icon name="logout" size={20} color={colors.text.primary} style={styles.optionMenuIcon} />
              <Text style={styles.optionMenuText}>{tProfiles('logoutProfiles')}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* 🎯 Modal Options de Tri avec effet flou */}
      <Modal
        visible={showSortOptions}
        transparent={true}
        animationType="none"
        statusBarTranslucent={true}
        onRequestClose={() => setShowSortOptions(false)}>
        <View style={styles.sortModalBlurOverlay}>
          <BlurView
            style={RNStyleSheet.absoluteFill}
            blurType="dark"
            blurAmount={5}
          />
          <TouchableOpacity
            style={RNStyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowSortOptions(false)}
          />
          <View style={styles.sortModalContainer}>
            <Animated.View
              style={[
                styles.optionsMenuContainer,
                {
                  opacity: sortMenuAnimValue,
                  transform: [
                    {
                      scale: sortMenuAnimValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                    {
                      translateY: sortMenuAnimValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0],
                      }),
                    },
                  ],
                },
              ]}>
              <TouchableOpacity
                style={[styles.optionMenuItem, currentSortOrder === 'name-asc' && styles.optionMenuItemSelected]}
                onPress={() => applySort('name-asc')}
                activeOpacity={0.7}>
                <Icon name="sort" size={20} color={colors.text.primary} style={styles.optionMenuIcon} />
                <Text style={styles.optionMenuText}>{tChannels('nameAZ')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionMenuItem, currentSortOrder === 'name-desc' && styles.optionMenuItemSelected]}
                onPress={() => applySort('name-desc')}
                activeOpacity={0.7}>
                <Icon name="sort" size={20} color={colors.text.primary} style={styles.optionMenuIcon} />
                <Text style={styles.optionMenuText}>{tChannels('nameZA')}</Text>
              </TouchableOpacity>


              <TouchableOpacity
                style={[styles.optionMenuItem, currentSortOrder === 'default' && styles.optionMenuItemSelected]}
                onPress={() => applySort('default')}
                activeOpacity={0.7}>
                <Icon name="list" size={20} color={colors.text.primary} style={styles.optionMenuIcon} />
                <Text style={styles.optionMenuText}>{tCommon('byDefault')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionMenuItem, styles.optionMenuCancel]}
                onPress={cancelSort}
                activeOpacity={0.7}>
                <Icon name="close" size={20} color={colors.accent.error} style={styles.optionMenuIcon} />
                <Text style={[styles.optionMenuText, {color: colors.accent.error}]}>{tCommon('cancel')}</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </Modal>

      {/* 🎯 Boîte de Dialogue de Déconnexion Moderne avec effet flou */}
      <Modal
        visible={showLogoutDialog}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={handleCancelLogout}>
        <View style={styles.logoutDialogBlurOverlay}>
          <BlurView
            style={RNStyleSheet.absoluteFill}
            blurType="dark"
            blurAmount={5}
          />
          <TouchableOpacity
            style={RNStyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleCancelLogout}
          />
          <View style={styles.logoutDialogModalContainer}>
            <Animated.View
              style={[
                styles.logoutDialogContainer,
                {
                  opacity: logoutDialogAnimValue,
                  transform: [
                    {
                      scale: logoutDialogAnimValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      }),
                    },
                  ],
                }
              ]}>
              {/* Icône de déconnexion */}
              <View style={styles.logoutIconContainer}>
                <Icon name="logout" size={32} color={colors.accent.error} />
              </View>

              {/* Titre */}
              <Text style={styles.logoutDialogTitle}>
                {tProfiles('logout')}
              </Text>

              {/* Message simple */}
              <Text style={styles.logoutDialogMessage}>
                {tProfiles('confirmLogout')}
              </Text>

              {/* Boutons d'action */}
              <View style={styles.logoutDialogActions}>
                <TouchableOpacity
                  style={[styles.logoutDialogButton, styles.logoutDialogButtonCancel]}
                  onPress={handleCancelLogout}
                  activeOpacity={0.7}>
                  <Text style={styles.logoutDialogButtonTextCancel}>
                    {tCommon('cancel')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.logoutDialogButton, styles.logoutDialogButtonConfirm]}
                  onPress={handleConfirmLogout}
                  activeOpacity={0.8}>
                  <Icon
                    name="logout"
                    size={16}
                    color="#FFFFFF"
                    style={styles.logoutDialogButtonIcon}
                  />
                  <Text style={styles.logoutDialogButtonTextConfirm}>
                    {tProfiles('logoutConfirmButton')}
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </View>
      </Modal>

      {/* Modal Favoris avec effet flou parfait et thèmes */}
      <Modal
        visible={favoriteModalVisible}
        transparent={true}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          setFavoriteModalVisible(false);
          setSelectedChannelForFavorite(null);
        }}>
        <View style={styles.favoriteModalBlurOverlay}>
          <BlurView
            style={RNStyleSheet.absoluteFill}
            blurType="dark"
            blurAmount={5}
          />
          <TouchableOpacity
            style={RNStyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => {
              setFavoriteModalVisible(false);
              setSelectedChannelForFavorite(null);
            }}
          />
          <View style={styles.favoriteModalContainer}>
            {/* Nom de la chaîne */}
            <Text style={styles.favoriteModalTitle} numberOfLines={2}>
              {selectedChannelForFavorite?.name || ''}
            </Text>

            {/* Boutons d'action */}
            <View style={styles.favoriteModalActions}>
              <TouchableOpacity
                style={styles.favoriteModalButtonCancel}
                activeOpacity={0.7}
                onPress={() => {
                  setFavoriteModalVisible(false);
                  setSelectedChannelForFavorite(null);
                }}>
                <Text style={styles.favoriteModalButtonCancelText}>
                  {tCommon('cancel')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.favoriteModalButtonConfirm}
                activeOpacity={0.8}
                onPress={handleConfirmFavorite}>
                <Icon
                  name="favorite"
                  size={18}
                  color="#FFFFFF"
                  style={{marginRight: 6}}
                />
                <Text style={styles.favoriteModalButtonConfirmText}>
                  {selectedChannelForFavorite &&
                  favoriteChannels.includes(selectedChannelForFavorite.id)
                    ? tChannels('removeFromFavorites')
                    : tChannels('addToFavorites')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 🎯 Modal Profiles Modal */}
      <ProfilesModal
        visible={showProfilesModal}
        onClose={handleProfilesClose}
        onPlaylistSelect={handleProfileSelect}
        onAddPlaylist={handleAddPlaylist}
        hideCloseButton={true} // 🆕 Masquer le bouton fermer pour forcer le choix de playlist
      />

      {/* 🎯 Connection Modal - Sélection du type de connexion */}
      <ConnectionModal
        visible={showConnectionModal}
        onClose={handleConnectionClose}
        onXtreamConnect={handleXtreamConnect}
        onM3UConnect={handleM3UConnect}
        onUsersList={handleUsersList}
      />

      {/* 🎯 Xtream Codes Modal */}
      <XtreamCodeModal
        visible={showXtreamModal}
        onClose={handleXtreamClose}
        onConnect={handleXtreamConnection}
      />

      {/* 🎯 M3U URL Modal */}
      <M3UUrlModal
        visible={showM3UModal}
        onClose={handleM3UClose}
        onConnect={handleM3UConnection}
      />

      {/* 🔒 Modal PIN catégorie bloquée */}
      {activeProfile && selectedBlockedCategory && (
        <SimplePinModal
          visible={pinModalVisible}
          profile={activeProfile}
          reason={`Catégorie bloquée : ${selectedBlockedCategory.name}`}
          onClose={handlePinCancel}
          onSuccess={handleCategoryUnlockSuccess}
        />
      )}
    </View>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
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
    channelIndicators: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 8,
      gap: 6,
    },
    restrictionIndicator: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    favoriteIndicator: {
      justifyContent: 'center',
      alignItems: 'center',
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

    // Styles Modal Favoris avec effet flou parfait et thèmes
    favoriteModalBlurOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1500,
    },
    favoriteModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    favoriteModalContainer: {
      backgroundColor: colors.surface.overlay || 'rgba(255, 255, 255, 0.98)',
      borderRadius: 24,
      padding: 20,
      width: width * 0.90,
      maxWidth: 420,
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 20},
      shadowOpacity: 0.25,
      shadowRadius: 32,
      elevation: 30,
      transform: [{translateY: -2}],
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    favoriteModalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.primary,
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 24,
    },
    favoriteModalActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    favoriteModalButtonCancel: {
      flex: 1,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 12,
      backgroundColor: colors.surface.secondary,
      alignItems: 'center',
    },
    favoriteModalButtonCancelText: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.text.secondary,
    },
    favoriteModalButtonConfirm: {
      flex: 1.5,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 12,
      backgroundColor: colors.accent.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.accent.primary,
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    favoriteModalButtonConfirmText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#FFFFFF',
    },

    // 🎯 Styles Menu Options Modal avec effet flou parfait
    optionsModalBlurOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'flex-start',
      alignItems: 'flex-end',
      paddingTop: 80, // Positionner sous le header
      paddingRight: 16,
      zIndex: 1500,
    },
    optionsModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)', // Opacité normale pour l'arrière-plan
      justifyContent: 'flex-start',
      alignItems: 'flex-end',
      paddingTop: 80, // Positionner sous le header
      paddingRight: 16,
    },
    optionsMenuContainer: {
      backgroundColor: colors.surface.overlay || 'rgba(255, 255, 255, 0.98)',
      borderRadius: 20,
      paddingVertical: 12,
      minWidth: 220,
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 20},
      shadowOpacity: 0.25,
      shadowRadius: 32,
      elevation: 30,
      transform: [{translateY: -2}],
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
      opacity: 0.98, // Opacité maximale du conteneur
    },
    optionMenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.ui.border,
    },
    optionMenuItemSelected: {
      backgroundColor: colors.accent.primary + '20', // Fond subtil pour l'option sélectionnée
    },
    optionMenuCancel: {
      borderTopWidth: 1,
      borderTopColor: colors.ui.border,
    },
    optionMenuIcon: {
      marginRight: 10,
    },
    optionMenuText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.text.primary,
    },

    // 🎯 Styles Boîte de Dialogue de Déconnexion Moderne
    logoutDialogOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoutDialogContainer: {
      backgroundColor: colors.surface.overlay || colors.surface.elevated,
      borderRadius: 24,
      padding: 28,
      width: width * 0.85,
      maxWidth: 340,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 20},
      shadowOpacity: 0.25,
      shadowRadius: 32,
      elevation: 30,
      transform: [{translateY: -2}],
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    logoutIconContainer: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.accent.error + '20', // Fond légèrement plus visible
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
      borderWidth: 2,
      borderColor: colors.accent.error + '30',
    },
    logoutDialogTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text.primary,
      textAlign: 'center',
      marginBottom: 12,
    },
    logoutDialogMessage: {
      fontSize: 16,
      fontWeight: '400',
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 28,
    },
    logoutDialogActions: {
      flexDirection: 'row',
      width: '100%',
      gap: 12,
    },
    logoutDialogButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      minHeight: 44,
      minWidth: 120,
    },
    logoutDialogButtonCancel: {
      backgroundColor: colors.surface.secondary || 'rgba(128, 128, 128, 0.2)',
      borderWidth: 1,
      borderColor: colors.ui.border || 'rgba(255, 255, 255, 0.1)',
    },
    logoutDialogButtonConfirm: {
      backgroundColor: colors.accent.error,
      shadowColor: colors.accent.error,
      shadowOffset: {width: 0, height: 8},
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 1,
      borderColor: colors.accent.error + '40',
    },
    logoutDialogButtonIcon: {
      marginRight: 6,
    },
    logoutDialogButtonTextCancel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text.primary || '#FFFFFF',
    },
    logoutDialogButtonTextConfirm: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
      textAlign: 'center',
    },

    // 🎯 Styles avec effet flou pour les sous-menus
    sortModalBlurOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'flex-start',
      alignItems: 'flex-end',
      paddingTop: 80,
      paddingRight: 16,
      zIndex: 1500,
    },
    sortModalContainer: {
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
      width: 'auto',
      maxWidth: 200,
    },

    logoutDialogBlurOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1500,
    },
    logoutDialogModalContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      width: '90%',
      maxWidth: 340,
    },

    // 🔄 Styles pour l'indicateur de chargement de la pagination
    loadingMoreContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 20,
      backgroundColor: 'rgba(0, 0, 0, 0.05)',
    },
    loadingMoreIndicator: {
      marginRight: 12,
    },
    loadingMoreText: {
      fontSize: 14,
      color: colors.text.secondary,
      fontStyle: 'italic',
    },
    listFooterContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 20,
      paddingHorizontal: 16,
      backgroundColor: 'rgba(0, 0, 0, 0.02)',
    },
    footerIndicator: {
      marginRight: 12,
    },
    footerText: {
      fontSize: 14,
      color: colors.text.secondary,
      fontStyle: 'italic',
    },
  });

export default ChannelPlayerScreen;
