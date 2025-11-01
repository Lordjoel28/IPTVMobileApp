/**
 * 🎬 IPTV Smarters Pro Interface - Version Finale Corrigée 3.0
 * Implémentation finale avec fond premium, couleurs riches, reflets et lueurs.
 */

import React, {useRef, useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  StatusBar,
  Animated,
  Image,
  Modal,
  Alert,
} from 'react-native';
import SystemNavigationBar from 'react-native-system-navigation-bar';
// Solution native MainActivity.java pour immersif
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import VideoPlayer from './src/components/VideoPlayer';
import ConnectionModal from './src/components/ConnectionModal';
import XtreamCodeModal from './src/components/XtreamCodeModal';
import M3UUrlModal from './src/components/M3UUrlModal';
import ProfilesModal from './src/components/ProfilesModal';
import MultiScreenView from './src/components/MultiScreenView';
import ProfileSelectionScreen from './src/screens/ProfileSelectionScreen';
import ProfileManagementModal from './src/components/ProfileManagementModal';
import AddProfileModal from './src/components/AddProfileModal';
// GlobalVideoPlayer géré par App.tsx (instance principale) - import supprimé pour éviter la duplication
// import { ServiceTest } from './src/components/ServiceTest'; // Removed for production

// 🔧 DEBUG: Script pour vider le cache EPG (test 1er démarrage TiviMate)
import './clearEPGCache';
import type {Channel, Profile} from './src/types';

// 👤 Import ProfileService pour gestion des profils
import ProfileService from './src/services/ProfileService';
import SimplePinModal from './src/components/SimplePinModal';
// import { APP_VERSION } from './src/version'; // Removed for production
// AppContext removed - using UIStore instead
import {useUIStore} from './src/stores/UIStore';
import {usePlayerStore} from './src/stores/PlayerStore';
import {useGlobalImmersion} from './src/hooks/useGlobalImmersion';
import {useStatusBar} from './src/hooks/useStatusBar';
import {useTheme} from './src/contexts/ThemeContext';

// Import des nouveaux services migrés
import IPTVService from './src/services/IPTVService';

// 🚀 PRÉ-CHARGER PlaylistService pour éviter délais au runtime
import {PlaylistService} from './src/services/PlaylistService';

// 🏗️ Import du nouveau système d'architecture DI
import {initializeServiceArchitecture, ServiceMigration} from './src/core';

// 🎯 Import EPGCacheManager pour initialisation au démarrage
import {EPGCacheManager} from './src/services/epg/EPGCacheManager';

// --- Catalogue des icônes PNG ---
const iconMap = {
  tv: require('./assets/icons/icon_tv.png'),
  films: require('./assets/icons/icon_films.png'),
  series: require('./assets/icons/icon_series.png'),
  epg: require('./assets/icons/icon_epg.png'),
  multi: require('./assets/icons/icon_multi.png'),
  replay: require('./assets/icons/icon_replay.png'),
};

// --- Configuration des couleurs ---
const cardColors = {
  tv: ['#00CCFF', '#0080FF', '#004080', '#001540'], // Cyan vif → Bleu électrique → Bleu moyen → Bleu sombre
  films: ['#FF6B35', '#FF3333', '#B71C1C', '#4A0E0E'], // Orange vif → Rouge vif → Rouge foncé → Rouge très sombre
  series: ['#00E5AA', '#00B388', '#00695C', '#003D35'], // Vert cyan → Vert teal → Teal foncé → Teal très sombre
  bottom: ['#4A5D4A', '#3E4E3E', '#2D3A2D', '#1F2A1F'], // Vert-gris moyen → Gris-vert → Vert sombre → Vert très sombre
};

const bottomRowCards = [
  {key: 'epg', title: 'LIVE EPG', subtitle: 'Guide TV', index: 3},
  {key: 'multi', title: 'MULTI-ÉCR', subtitle: 'Écrans', index: 4},
  {key: 'replay', title: 'RATTRAPER', subtitle: 'Replay', index: 5},
];

// Type pour navigation
type NavigationProp = StackNavigationProp<RootStackParamList>;

const App: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  // Hook global pour immersion quand PiP présent
  useGlobalImmersion();

  // StatusBar normale pour l'écran d'accueil (sera surchargée par les écrans immersifs)
  const {setNormal} = useStatusBar();

  // Hook pour gérer le thème par profil
  const {loadProfileTheme} = useTheme();

  useEffect(() => {
    setNormal('App_HomeScreen');
  }, [setNormal]);

  // Replaced AppContext with UIStore
  const {
    showLoading,
    updateLoading,
    hideLoading,
    showNotification,
    registerModalCloser,
  } = useUIStore();

  // PlayerStore pour contrôler le GlobalVideoPlayer
  const {actions: playerActions} = usePlayerStore();

  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  // États pour lecteur persistant (nouvelles fonctionnalités)
  const [showPersistentPlayer, setShowPersistentPlayer] = useState(false);
  const [isPersistentFullscreen, setIsPersistentFullscreen] = useState(false);
  const [persistentChannel, setPersistentChannel] = useState<Channel | null>(
    null,
  );
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showXtreamModal, setShowXtreamModal] = useState(false);
  const [showM3UModal, setShowM3UModal] = useState(false);
  const [showProfilesModal, setShowProfilesModal] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<
    string | undefined
  >();

  // États pour le contrôle parental
  const [activeProfileForPIN, setActiveProfileForPIN] = useState<Profile | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);

  const [playlistInfo, setPlaylistInfo] = useState<{
    name: string;
    expirationDate: string | null;
  } | null>(null);
  const [showMultiScreen, setShowMultiScreen] = useState(false);
  // 🧪 État pour le test du système DI
  // const [showServiceTest, setShowServiceTest] = useState(false); // Removed for production

  // 👤 États pour le système de profils
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [profilesInitialized, setProfilesInitialized] = useState(false);
  const [showProfileSelection, setShowProfileSelection] = useState(false);
  const [showProfileManagement, setShowProfileManagement] = useState(false);
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [profilesRefreshKey, setProfilesRefreshKey] = useState(0);
  const [isInitializing, setIsInitializing] = useState(true); // État de chargement initial
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardsScale = useRef(
    [...Array(6)].map(() => new Animated.Value(1)),
  ).current;

  // Instance IPTV unique pour toute l'app
  const iptvServiceRef = useRef<any>(null);

  // Test channel for demo
  const testChannel: Channel = {
    id: '1',
    name: '📺 Test IPTV Channel',
    url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    category: 'Test',
  };

  // Test channel for persistent player
  const testPersistentChannel: Channel = {
    id: '2',
    name: '🚀 Test Lecteur Persistant',
    url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    category: 'Test',
  };

  useEffect(() => {
    // 👤 Initialiser les profils en premier
    const initProfiles = async () => {
      try {
        console.log('🔄 Démarrage initialisation des profils...');
        const profile = await ProfileService.initializeProfiles();

        if (profile) {
          // Profil chargé automatiquement
          console.log('✅ Profil existant trouvé:', profile.name);
          setCurrentProfile(profile);
          setActiveProfileForPIN(profile); // Pour le contrôle parental
          // Charger le thème du profil
          await loadProfileTheme(profile.id);
          setProfilesInitialized(true);
          console.log('✅ Profil actif chargé');
        } else {
          // Aucun profil trouvé - afficher écran de sélection
          console.log('📋 Aucun profil - affichage sélection');
          setShowProfileSelection(true);
          setProfilesInitialized(true);
        }
      } catch (error) {
        console.error('❌ Erreur initialisation profils:', error);
        // En cas d'erreur, afficher quand même la sélection
        setShowProfileSelection(true);
        setProfilesInitialized(true);
      } finally {
        // Toujours marquer l'initialisation comme terminée
        setIsInitializing(false);
        console.log('✅ Initialisation terminée');
      }
    };

    initProfiles();

    // Mode immersif géré par StatusBarManager centralisé

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Enregistrer la fonction de fermeture du modal de connexion
    registerModalCloser(() => setShowConnectionModal(false));

    // 🏗️ Initialisation du nouveau système d'architecture DI (Phase 2)
    const initializeDIArchitecture = async () => {
      try {
        initializeServiceArchitecture();
        // Test de validation des services
        await ServiceMigration.validateAllServices();
      } catch (error) {
        // L'app continue avec l'ancienne architecture si besoin
      }
    };

    // Test d'initialisation des nouveaux services IPTV - INSTANCE UNIQUE
    const testServices = async () => {
      try {
        // Utiliser toujours la même instance
        if (!iptvServiceRef.current) {
          iptvServiceRef.current = IPTVService.getInstance({
            enableParentalControl: true,
            enableUserManagement: true,
            enableAdvancedSearch: true,
            enablePerformanceMonitoring: true,
          });
        }

        const iptv = iptvServiceRef.current;
        await iptv.initialize();
      } catch (error) {
        // L'app continue de fonctionner normalement
      }
    };

    // Initialise d'abord la nouvelle architecture DI
    initializeDIArchitecture();

    // 🚀 TiviMate Style : Pas d'auto-initialisation EPG
    // EPG sera chargé progressivement seulement quand nécessaire
    console.log('🚀 [App] Démarrage rapide - EPG chargé à la demande');

    // Puis les services existants
    testServices();

    // 🎯 IPTV SMARTERS PRO STYLE : Restaurer la playlist active au démarrage
    const restoreActivePlaylist = async () => {
      try {
        console.log('🔄 Restauration playlist active depuis WatermelonDB...');

        // Récupérer l'ID de la dernière playlist sélectionnée
        const AsyncStorage = await import(
          '@react-native-async-storage/async-storage'
        );
        const lastSelectedId = await AsyncStorage.default.getItem(
          'last_selected_playlist_id',
        );

        if (lastSelectedId) {
          console.log(
            '🎯 ID playlist précédemment sélectionnée:',
            lastSelectedId,
          );

          // 🚀 CHARGER DEPUIS WATERMELONDB (nouveau système - pré-chargé)
          const playlistService = PlaylistService.getInstance();

          const playlists = await playlistService.getAllPlaylists();
          const targetPlaylist = playlists.find(p => p.id === lastSelectedId);

          if (targetPlaylist) {
            console.log(
              '✅ Playlist spécifique trouvée pour restauration:',
              targetPlaylist.name,
            );
            setSelectedPlaylistId(targetPlaylist.id);
            console.log('✅ Active playlist restored successfully');
          } else {
            console.log(
              '⚠️ Playlist précédente introuvable, prendre la première disponible',
            );
            if (playlists.length > 0) {
              const firstPlaylist = playlists[0];
              setSelectedPlaylistId(firstPlaylist.id);
              console.log('✅ Fallback playlist restored:', firstPlaylist.name);
            }
          }
        } else {
          console.log('ℹ️ Aucune playlist précédemment sélectionnée');

          // Fallback : prendre la première playlist disponible
          const iptv = IPTVService.getInstance();
          await iptv.initialize();
          const playlists = await iptv.getAllPlaylists();

          if (playlists.length > 0) {
            const firstPlaylist = playlists[0];
            setSelectedPlaylistId(firstPlaylist.id);
            console.log(
              '✅ First available playlist restored:',
              firstPlaylist.name,
            );
          } else {
            console.log('ℹ️ No playlist available to restore');
          }
        }
      } catch (error) {
        console.error('❌ Error restoring active playlist:', error);
      }
    };

    // Restaurer la playlist active après initialisation des services
    setTimeout(restoreActivePlaylist, 1000); // Délai pour s'assurer que les services sont prêts

    return () => {
      // Pas de cleanup nécessaire avec SystemBars
    };
  }, []);

  // 📊 Récupérer les infos de la playlist active pour le footer
  useEffect(() => {
    const loadPlaylistInfo = async () => {
      if (!selectedPlaylistId) {
        setPlaylistInfo(null);
        return;
      }

      try {
        const database = await import('./src/database');
        const {Playlist} = await import('./src/database/models');

        const playlist = await database.default
          .get<typeof Playlist>('playlists')
          .find(selectedPlaylistId);

        setPlaylistInfo({
          name: playlist.name,
          expirationDate: playlist.formattedExpirationDate,
        });
      } catch (error) {
        console.log('⚠️ Playlist non trouvée dans WatermelonDB pour footer');
        setPlaylistInfo(null);
      }
    };

    loadPlaylistInfo();
  }, [selectedPlaylistId]);

  // Animations supprimées pour assurer clics fonctionnels

  const handleTVCardPress = async () => {
    console.log('📺 TV Card Pressed - Vérification playlist active');

    // Vérifier s'il y a une playlist sélectionnée
    if (!selectedPlaylistId) {
      console.log('❌ Aucune playlist sélectionnée');
      Alert.alert(
        '📺 Aucune playlist',
        'Veuillez d\'abord importer et sélectionner une playlist depuis le menu "Profils".',
        [{text: 'OK'}],
      );
      return;
    }

    console.log('✅ Playlist active détectée:', selectedPlaylistId);
    console.log('🍉🍉🍉 DEBUT LOGIQUE WATERMELONDB - handleTVCardPress');

    try {
      console.log('🍉 ÉTAPE 1: Récupération chaînes avec WatermelonDB...');

      // Vérifier si c'est une playlist WatermelonDB (Xtream Codes)
      try {
        const database = await import('./src/database');
        const {Playlist} = await import('./src/database/models');

        // Tentative de récupération depuis WatermelonDB
        const playlist = await database.default
          .get<typeof Playlist>('playlists')
          .find(selectedPlaylistId);

        if (playlist) {
          console.log(
            `🍉 Playlist WatermelonDB trouvée: ${playlist.name} (${playlist.channelsCount} chaînes)`,
          );

          // Navigation directe vers ChannelsScreen - WatermelonDB gère le lazy loading
          navigation.navigate('ChannelsScreen', {
            playlistId: selectedPlaylistId,
            channelsCount: playlist.channelsCount,
            playlistType: playlist.type || 'M3U', // 🔧 CORRECTION: Passer le type de playlist
            useWatermelonDB: true, // Flag pour indiquer l'usage de WatermelonDB
          });
          return;
        }
      } catch (watermelonError) {
        console.log(
          '⚠️ Playlist non trouvée dans WatermelonDB, tentative avec ancien système...',
        );
        console.log('🔧 Erreur WatermelonDB:', watermelonError.message);
      }

      // Fallback vers l'ancien système pour les playlists M3U
      const iptvService = iptvServiceRef.current;
      if (!iptvService) {
        throw new Error('Service IPTV non disponible');
      }

      console.log('🔄 Récupération avec ancien système IPTV...');
      let playlist = await iptvService.getPlaylist(selectedPlaylistId);

      if (!playlist) {
        console.log(
          '⚠️ Playlist non trouvée dans le service, tentative de récupération directe...',
        );

        // Fallback: Récupérer directement depuis AsyncStorage avec plusieurs clés possibles
        try {
          const AsyncStorage = (
            await import('@react-native-async-storage/async-storage')
          ).default;

          // D'ABORD: Vérifier si c'est une playlist Xtream Codes
          if (selectedPlaylistId.startsWith('xtream_')) {
            console.log(
              '🔍 Détection playlist Xtream Codes, recherche spécialisée...',
            );

            try {
              // Récupérer la liste des playlists Xtream sauvegardées
              const xtreamPlaylists = await AsyncStorage.getItem(
                'saved_xtream_playlists',
              );
              if (xtreamPlaylists) {
                const xtreamList = JSON.parse(xtreamPlaylists);
                console.log('📋 Playlists Xtream trouvées:', xtreamList.length);

                // Chercher la playlist correspondante par ID
                const targetPlaylist = xtreamList.find(
                  (p: any) => p.id === selectedPlaylistId,
                );
                if (targetPlaylist) {
                  console.log(
                    '✅ Playlist Xtream trouvée:',
                    targetPlaylist.name,
                    '(' + targetPlaylist.channelsCount + ' chaînes)',
                  );

                  // Pour Xtream Codes, il faut reconstruire la playlist depuis les credentials
                  try {
                    console.log(
                      '🔄 Reconstruction playlist Xtream avec credentials...',
                    );
                    const {WatermelonXtreamService} = await import(
                      './src/services/WatermelonXtreamService'
                    );
                    const xtreamManager = new WatermelonXtreamService();

                    // Charger config et credentials
                    await xtreamManager.loadConfig();
                    xtreamManager.setCredentials(
                      targetPlaylist.server,
                      targetPlaylist.username,
                      targetPlaylist.password,
                    );

                    // Timeout pour éviter blocage infini
                    const timeoutPromise = new Promise((_, reject) => {
                      setTimeout(
                        () =>
                          reject(
                            new Error('Timeout reconstruction Xtream (30s)'),
                          ),
                        30000,
                      );
                    });

                    // Course entre le processus Xtream et le timeout
                    const xtreamProcess = async () => {
                      console.log('🔐 Authentification Xtream...');
                      await xtreamManager.authenticate();
                      console.log('📺 Récupération chaînes Xtream...');
                      const channels =
                        await xtreamManager.fetchChannelsExtreme();
                      return channels;
                    };

                    const channels = await Promise.race([
                      xtreamProcess(),
                      timeoutPromise,
                    ]);

                    // Créer l'objet playlist au format attendu
                    playlist = {
                      id: targetPlaylist.id,
                      name: targetPlaylist.name,
                      channels: channels,
                      totalChannels: channels.length,
                      type: 'xtream',
                      metadata: {
                        username: targetPlaylist.username,
                        server: targetPlaylist.server,
                        password: targetPlaylist.password,
                      },
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    };

                    // CRITIQUE: Sauvegarder avec chunking pour playlists volumineuses (25K+ chaînes)
                    const AsyncStorage = (
                      await import('@react-native-async-storage/async-storage')
                    ).default;

                    if (playlist.channels.length > 4000) {
                      console.log(
                        `📦 Playlist volumineuse (${playlist.channels.length} chaînes), chunking activé...`,
                      );

                      // Chunking des chaînes par paquets de 500 (optimisé espace disque)
                      const chunkSize = 500;
                      const chunks = [];

                      for (
                        let i = 0;
                        i < playlist.channels.length;
                        i += chunkSize
                      ) {
                        chunks.push(playlist.channels.slice(i, i + chunkSize));
                      }

                      // Supprimer les anciens chunks au cas où
                      const allKeys = await AsyncStorage.getAllKeys();
                      const oldChunks = allKeys.filter(
                        key =>
                          key.includes(targetPlaylist.id) &&
                          key.includes('_chunk_'),
                      );
                      if (oldChunks.length > 0) {
                        await AsyncStorage.multiRemove(oldChunks);
                        console.log(
                          `🗑️ ${oldChunks.length} anciens chunks supprimés`,
                        );
                      }

                      // Sauvegarder les nouveaux chunks
                      for (let i = 0; i < chunks.length; i++) {
                        const chunkKey = `playlist_${
                          targetPlaylist.id
                        }_chunk_${String(i).padStart(3, '0')}`;
                        await AsyncStorage.setItem(
                          chunkKey,
                          JSON.stringify(chunks[i]),
                        );
                      }

                      // Sauvegarder les métadonnées (sans les chaînes)
                      const playlistMeta = {...playlist};
                      delete playlistMeta.channels;
                      playlistMeta.chunked = true;
                      playlistMeta.chunkCount = chunks.length;
                      playlistMeta.chunkSize = chunkSize;

                      await AsyncStorage.setItem(
                        `playlist_${targetPlaylist.id}`,
                        JSON.stringify(playlistMeta),
                      );
                      console.log(
                        `💾 Playlist Xtream sauvée: ${chunks.length} chunks de ${chunkSize} chaînes`,
                      );
                    } else {
                      // Sauvegarde normale pour petites playlists
                      await AsyncStorage.setItem(
                        `playlist_${targetPlaylist.id}`,
                        JSON.stringify(playlist),
                      );
                      console.log(
                        '💾 Playlist Xtream sauvée dans AsyncStorage',
                      );
                    }

                    console.log(
                      '✅ Playlist Xtream reconstruite:',
                      channels.length,
                      'chaînes',
                    );
                  } catch (xtreamError: any) {
                    console.error(
                      '❌ Erreur reconstruction Xtream:',
                      xtreamError.message,
                    );

                    // Alternative: Proposer un rechargement différé
                    Alert.alert(
                      '⏳ Chargement Xtream en cours',
                      `La playlist "${targetPlaylist.name}" est en cours de reconstruction depuis le serveur. Cela peut prendre jusqu'à 30 secondes.\n\nVoulez-vous réessayer ?`,
                      [
                        {
                          text: 'Annuler',
                          style: 'cancel',
                          onPress: () => {
                            // Créer playlist vide pour éviter crash
                            playlist = {
                              id: targetPlaylist.id,
                              name: targetPlaylist.name,
                              channels: [],
                              type: 'XTREAM',
                              error: 'Chargement annulé',
                            };
                          },
                        },
                        {
                          text: 'Réessayer',
                          onPress: () => {
                            // Relancer le processus (récursion simple)
                            setTimeout(() => {
                              handleTVCardPress();
                            }, 1000);
                          },
                        },
                      ],
                    );

                    // En cas d'erreur, retourner directement pour éviter la navigation
                    return;
                  }
                } else {
                  console.error(
                    '❌ Playlist Xtream non trouvée dans saved_xtream_playlists',
                  );
                }
              } else {
                console.error('❌ Aucune playlist Xtream sauvegardée trouvée');
              }
            } catch (xtreamError: any) {
              console.error(
                '❌ Erreur accès playlists Xtream:',
                xtreamError.message,
              );
            }
          } else {
            // Playlist M3U classique - essayer différentes clés de stockage
            const possibleKeys = [
              `playlist_${selectedPlaylistId}`,
              selectedPlaylistId,
              `playlist_meta_${selectedPlaylistId}`,
              `playlist_url_${selectedPlaylistId}`,
            ];

            for (const key of possibleKeys) {
              console.log(`🔍 Tentative récupération M3U avec clé: ${key}`);
              const playlistData = await AsyncStorage.getItem(key);

              if (playlistData) {
                try {
                  const parsedData = JSON.parse(playlistData);
                  if (
                    parsedData &&
                    parsedData.channels &&
                    Array.isArray(parsedData.channels) &&
                    parsedData.channels.length > 0
                  ) {
                    playlist = parsedData;
                    console.log(
                      `✅ Playlist M3U récupérée avec clé "${key}":`,
                      playlist.channels.length,
                      'chaînes',
                    );
                    break;
                  } else {
                    console.log(
                      `⚠️ Playlist trouvée avec clé "${key}" mais sans chaînes valides (${
                        parsedData?.channels?.length || 0
                      } chaînes)`,
                    );
                  }
                } catch (parseError: any) {
                  console.log(
                    `⚠️ Erreur parsing avec clé "${key}":`,
                    parseError.message,
                  );
                }
              }
            }
          }

          // Si toujours pas trouvé, recherche générale dans toutes les clés
          if (!playlist) {
            console.log('🔍 Recherche dans toutes les clés AsyncStorage...');
            const allKeys = await AsyncStorage.getAllKeys();
            console.log(
              '📋 Clés disponibles:',
              allKeys.filter(
                k => k.includes('playlist') || k.includes('xtream'),
              ),
            );

            // Chercher d'abord les playlists chunkées (grosses playlists)
            const chunkedKeys = allKeys.filter(
              k => k.includes(selectedPlaylistId) && k.includes('_chunk_'),
            );
            if (chunkedKeys.length > 0) {
              console.log(
                `🧩 Playlist chunked détectée: ${chunkedKeys.length} chunks`,
              );
              try {
                const chunks = [];
                for (const chunkKey of chunkedKeys.sort()) {
                  const chunkData = await AsyncStorage.getItem(chunkKey);
                  if (chunkData) {
                    chunks.push(JSON.parse(chunkData));
                  }
                }

                // Reconstituer la playlist from chunks
                if (chunks.length > 0) {
                  const allChannels = chunks.flat();
                  playlist = {
                    id: selectedPlaylistId,
                    name: 'Playlist reconstituée',
                    channels: allChannels,
                    totalChannels: allChannels.length,
                  };
                  console.log(
                    `✅ Playlist chunked reconstituée: ${allChannels.length} chaînes from ${chunks.length} chunks`,
                  );
                }
              } catch (chunkError) {
                console.error('❌ Erreur reconstitution chunks:', chunkError);
              }
            }

            // Fallback: chercher playlist normale
            if (!playlist) {
              for (const key of allKeys) {
                if (
                  key.includes(selectedPlaylistId) ||
                  key.includes('playlist')
                ) {
                  const data = await AsyncStorage.getItem(key);
                  if (data) {
                    try {
                      const parsed = JSON.parse(data);
                      if (
                        parsed &&
                        parsed.channels &&
                        parsed.channels.length > 0
                      ) {
                        playlist = parsed;
                        console.log(
                          `✅ Playlist de secours trouvée "${key}":`,
                          playlist.channels.length,
                          'chaînes',
                        );
                        break;
                      }
                    } catch (e) {
                      console.log(
                        `⚠️ Erreur parsing playlist de secours "${key}"`,
                      );
                    }
                  }
                }
              }
            }
          }
        } catch (storageError) {
          console.error('❌ Erreur récupération AsyncStorage:', storageError);
        }

        if (!playlist) {
          throw new Error('Playlist introuvable dans le service et le storage');
        }
      }

      // Validation finale de la playlist
      if (
        !playlist ||
        !playlist.channels ||
        !Array.isArray(playlist.channels)
      ) {
        throw new Error(
          'Playlist invalide: structure des chaînes manquante ou corrompue',
        );
      }

      const channels = playlist.channels;

      console.log('📺 Chaînes récupérées:', channels.length);

      if (channels.length === 0) {
        Alert.alert(
          '📺 Aucune chaîne',
          'La playlist sélectionnée ne contient aucune chaîne.',
          [{text: 'OK'}],
        );
        return;
      }

      // Navigation vers ChannelsScreen avec seulement l'ID (éviter les données volumineuses)
      navigation.navigate('ChannelsScreen', {
        playlistId: selectedPlaylistId,
        channelsCount: channels.length,
      });
    } catch (error) {
      console.error('❌ Erreur récupération chaînes:', error);

      // 🔧 CORRECTION: Si erreur structure corrompue, forcer reimport
      if (
        error.message &&
        error.message.includes('structure des chaînes manquante ou corrompue')
      ) {
        console.log('🔄 Tentative de réparation automatique de la playlist...');

        Alert.alert(
          '🔄 Reconstruction',
          'La playlist doit être reconstruite. Cela peut prendre quelques secondes.',
          [
            {
              text: 'Annuler',
              style: 'cancel',
            },
            {
              text: 'Reconstruire',
              onPress: async () => {
                try {
                  console.log('🚧 Nettoyage des chunks corrompus...');

                  // Nettoyer AsyncStorage des chunks orphelins
                  const AsyncStorage = (
                    await import('@react-native-async-storage/async-storage')
                  ).default;
                  const allKeys = await AsyncStorage.getAllKeys();
                  const chunkKeys = allKeys.filter(key =>
                    key.includes('_chunk_'),
                  );

                  if (chunkKeys.length > 0) {
                    console.log(
                      `🗑️ Suppression de ${chunkKeys.length} chunks orphelins...`,
                    );
                    await AsyncStorage.multiRemove(chunkKeys);
                  }

                  // Supprimer aussi l'ancienne playlist corrompue
                  await AsyncStorage.removeItem(
                    `playlist_${selectedPlaylistId}`,
                  );

                  // Forcer reload de l'app pour recréer la playlist
                  console.log('🔄 Rechargement automatique...');
                  // Navigation vers écran d'accueil puis retour pour forcer refresh
                  handleClosePlayer();

                  // Petit délai puis relancer
                  setTimeout(() => {
                    handleTVCardPress();
                  }, 1000);
                } catch (repairError) {
                  console.error(
                    '❌ Erreur lors de la réparation:',
                    repairError,
                  );
                  Alert.alert(
                    '❌ Erreur',
                    'Impossible de réparer la playlist. Veuillez la supprimer et la recréer.',
                    [{text: 'OK'}],
                  );
                }
              },
            },
          ],
        );
      } else {
        // Erreur normale
        Alert.alert(
          '❌ Erreur',
          'Impossible de charger les chaînes de la playlist.',
          [{text: 'OK'}],
        );
      }
    }
  };

  const handleClosePlayer = () => {
    console.log('❌ Closing Video Player');
    setShowVideoPlayer(false);
    setCurrentChannel(null);
  };

  // Handlers pour lecteur persistant (nouvelles fonctionnalités)
  const handleShowPersistentPlayer = (channel: Channel) => {
    console.log('🎬 Starting persistent player for:', channel.name);
    setPersistentChannel(channel);
    setShowPersistentPlayer(true);
  };

  const handlePersistentPlayerToggleFullscreen = (isFullscreen: boolean) => {
    console.log('🎬 Persistent player fullscreen:', isFullscreen);
    setIsPersistentFullscreen(isFullscreen);
  };

  const handleClosePersistentPlayer = () => {
    console.log('❌ Closing persistent player');
    setShowPersistentPlayer(false);
    setPersistentChannel(null);
    setIsPersistentFullscreen(false);
  };

  // Handlers pour le modal de connexion
  const handleXtreamConnect = () => {
    console.log('🔐 Ouvrir modal Xtream Codes');
    setShowConnectionModal(false);
    setShowXtreamModal(true);
  };

  const handleM3UConnect = () => {
    console.log('📁 Ouvrir modal M3U URL');
    setShowConnectionModal(false);
    setShowM3UModal(true);
  };

  const handleUsersList = () => {
    console.log('👤 Ouverture modal Profils');
    setShowConnectionModal(false);
    setShowProfilesModal(true);
  };

  // Handler pour la connexion Xtream Codes
  const handleXtreamConnection = async (credentials: any) => {
    console.log('🔐 Connexion Xtream avec:', credentials);
    setShowXtreamModal(false);

    // 🚀 FERMER TOUS LES MODALS D'ABORD !
    console.log('🔄 Fermeture de tous les modals avant import Xtream...');
    setShowConnectionModal(false);

    // Délai ultra-minimal pour fermeture modals
    await new Promise(resolve => setTimeout(resolve, 20));

    // 🚀 AFFICHER LOADING OVERLAY AVEC ANIMATION XTREAM
    showLoading(
      'Connexion Xtream...',
      `Authentification ${credentials.username}...`,
      0,
    );

    try {
      console.log('🍉 Utilisation de WatermelonDB pour Xtream...');

      // Importer le nouveau service WatermelonDB
      const WatermelonXtreamService = await import(
        './src/services/WatermelonXtreamService'
      );
      const xtreamService = WatermelonXtreamService.default;

      // Fonction de callback pour la progression
      const onProgress = (progress: number, message: string) => {
        updateLoading({progress: Math.round(progress), subtitle: message});
      };

      const playlistName = `${credentials.username} (Xtream)`;

      // Import avec WatermelonDB - résout le problème SQLITE_FULL
      const playlistId = await xtreamService.importXtreamPlaylist(
        {
          url: credentials.url,
          username: credentials.username,
          password: credentials.password,
        },
        playlistName,
        onProgress,
      );

      console.log(`🍉 Import WatermelonDB terminé: ${playlistId}`);

      // Récupérer les informations de la playlist créée pour AsyncStorage
      const database = await import('./src/database');
      const {Playlist} = await import('./src/database/models');
      const playlist = await database.default
        .get<typeof Playlist>('playlists')
        .find(playlistId);

      // Format pour ProfilesModal (compatibilité)
      const playlistData = {
        id: playlistId,
        name: playlist.name,
        type: 'XTREAM' as const,
        url: playlist.server,
        server: playlist.server,
        username: playlist.username,
        password: playlist.password,
        dateAdded: playlist.dateAdded.toISOString(),
        expirationDate: playlist.expirationDate,
        channelsCount: playlist.channelsCount,
        status: 'active' as const,
      };

      // Sauvegarder dans AsyncStorage pour rétrocompatibilité avec ProfilesModal
      const AsyncStorage = await import(
        '@react-native-async-storage/async-storage'
      );
      const existingData = await AsyncStorage.default.getItem(
        'saved_xtream_playlists',
      );
      const playlists = existingData ? JSON.parse(existingData) : [];

      // Éviter les doublons
      const existingIndex = playlists.findIndex(
        (p: any) =>
          p.server === credentials.url && p.username === credentials.username,
      );
      if (existingIndex >= 0) {
        playlists[existingIndex] = playlistData;
      } else {
        playlists.push(playlistData);
      }

      await AsyncStorage.default.setItem(
        'saved_xtream_playlists',
        JSON.stringify(playlists),
      );

      // Finalisation
      updateLoading({
        progress: 100,
        subtitle: `✅ ${playlist.channelsCount} chaînes importées avec WatermelonDB !`,
      });

      await new Promise(resolve => setTimeout(resolve, 1000));
      hideLoading();

      // Ouvrir automatiquement le ProfilesModal pour sélection
      console.log('📋 Ouverture automatique du ProfilesModal');
      setShowProfilesModal(true);

      console.log(
        `✅ Import Xtream WatermelonDB réussi: ${playlist.channelsCount} chaînes`,
      );
    } catch (error) {
      console.error('❌ Erreur import Xtream WatermelonDB:', error);
      hideLoading();

      // Afficher erreur détaillée
      const errorMessage = error.message || 'Erreur inconnue';
      Alert.alert(
        '❌ Erreur Import',
        `Impossible d'importer la playlist Xtream:\n\n${errorMessage}`,
        [{text: 'OK'}],
      );
    }
  };

  // Handler pour la connexion M3U URL - VRAI TEST SERVICES IPTV
  const handleM3UConnection = async (source: any) => {
    console.log('📁 Connexion M3U avec:', source);
    setShowM3UModal(false);

    // 🚀 AFFICHER LOADING OVERLAY AVEC ANIMATION
    showLoading(
      'Téléchargement...',
      `Import de la playlist ${source.name}...`,
      0,
    );

    // 🚀 IMPORT DIRECT WATERMELONDB - UN SEUL SYSTÈME UNIFIÉ
    try {
      console.log('🚀 Import DIRECT WatermelonDB (sans ancien système)...');

      // Étape 1: Télécharger le contenu M3U
      updateLoading({
        progress: 10,
        subtitle: 'Téléchargement de la playlist...',
      });
      await new Promise(resolve => setTimeout(resolve, 200));

      const playlistUrl = source.source || source.url;
      console.log('🌐 Téléchargement depuis:', playlistUrl);

      const response = await fetch(playlistUrl);
      if (!response.ok) {
        throw new Error(`Erreur téléchargement: ${response.status}`);
      }

      const m3uContent = await response.text();
      console.log(`📥 Téléchargé: ${Math.round(m3uContent.length / 1024)}KB`);

      // Étape 2: Import DIRECT dans WatermelonDB (un seul système - pré-chargé)
      updateLoading({
        progress: 40,
        subtitle: 'Import dans la base de données...',
      });

      const playlistService = PlaylistService.getInstance();

      const newPlaylistId = await playlistService.addPlaylist(
        source.name || 'Playlist M3U',
        m3uContent,
        playlistUrl,
        (progress, message) => {
          // Progress callback pour mise à jour UI
          updateLoading({
            progress: 40 + Math.floor(progress / 2), // 40% → 90%
            subtitle: message,
          });
        },
      );

      console.log('✅ Playlist importée dans WatermelonDB:', newPlaylistId);

      // Récupérer les infos de la playlist pour affichage
      const WatermelonM3UService = (
        await import('./src/services/WatermelonM3UService')
      ).default;
      const playlistInfo = await WatermelonM3UService.getPlaylistWithChannels(
        newPlaylistId,
        1,
        0,
      );
      const channelsCount = playlistInfo.totalChannels || 0;

      // Étape 3: Définir comme playlist active
      setSelectedPlaylistId(newPlaylistId);

      // Étape 4: Synchroniser avec AsyncStorage (juste l'ID)
      updateLoading({progress: 95, subtitle: 'Finalisation...'});
      try {
        const AsyncStorage = await import(
          '@react-native-async-storage/async-storage'
        );
        await AsyncStorage.default.setItem(
          'last_selected_playlist_id',
          newPlaylistId,
        );
        console.log('💾 ID playlist synchronisé:', newPlaylistId);
      } catch (syncError) {
        console.error('❌ Erreur synchronisation AsyncStorage:', syncError);
      }

      // 🎯 FINALISATION - CACHER LOADING ET AFFICHER NOTIFICATION SUCCESS
      updateLoading({progress: 100, subtitle: 'Terminé!'});
      await new Promise(resolve => setTimeout(resolve, 300));
      hideLoading();

      // 🎉 NOTIFICATION SUCCESS POPUP
      showNotification(
        `Playlist ajoutée ! ${channelsCount} chaînes importées`,
        'success',
        4000,
      );

      console.log('🎬 Import terminé - playlist disponible dans Profils');

      // 📋 Ouvrir le ProfilesModal après import réussi
      setTimeout(() => {
        console.log('📋 Ouverture automatique du ProfilesModal');
        setShowProfilesModal(true);
      }, 1000); // Petit délai pour laisser la notification s'afficher
    } catch (error) {
      console.error('❌ TEST SERVICES IPTV FAILED:', error);

      // Cacher le loading en cas d'erreur
      hideLoading();

      // Afficher notification d'erreur
      showNotification(
        `Erreur import: ${error.message || 'Problème de connexion'}`,
        'error',
        5000,
      );

      Alert.alert(
        '❌ Erreur Services IPTV',
        `Erreur: ${error.message || 'Inconnue'}\n\nStack: ${
          error.stack?.substring(0, 200) || 'N/A'
        }`,
      );
    }
  };

  // Handler pour fermer Xtream Modal et retourner au Connection Modal
  const handleXtreamClose = () => {
    console.log('🔙 Fermer Xtream Modal et retourner au Connection Modal');
    setShowXtreamModal(false);
    setTimeout(() => {
      setShowConnectionModal(true);
    }, 100);
  };

  // Handler pour fermer M3U Modal et retourner au Connection Modal
  const handleM3UClose = () => {
    console.log('🔙 Fermer M3U Modal et retourner au Connection Modal');
    setShowM3UModal(false);
    setTimeout(() => {
      setShowConnectionModal(true);
    }, 100);
  };

  // Handlers pour ProfilesModal
  const handleProfilesClose = () => {
    console.log('🔙 Fermer Profiles Modal - retour écran principal');
    setShowProfilesModal(false);
    // Pas de retour au ConnectionModal - rester sur l'écran principal
  };

  const handlePlaylistSelect = async (playlist: any) => {
    console.log('🎬 Playlist sélectionnée:', playlist.name);

    // 🚀 FERMER TOUS LES MODALS D'ABORD !
    console.log('🔄 Fermeture de tous les modals avant animation...');
    setShowConnectionModal(false);
    setShowProfilesModal(false);

    // Délai ultra-minimal pour fermeture modals
    await new Promise(resolve => setTimeout(resolve, 20));

    // Animation de connexion à la playlist
    const channelCount = playlist.channelsCount || 50;
    const totalDuration = Math.max(3000, Math.min(8000, channelCount * 5));
    const stepDuration = totalDuration / 7;

    console.log(
      `🎬 Animation calculée: ${channelCount} chaînes → ${totalDuration}ms`,
    );

    // Afficher l'animation de chargement
    showLoading(
      `Connexion à "${playlist.name}"`,
      `Préparation de ${channelCount} chaînes...`,
      0,
    );

    // Animation progressive de connexion
    const connectionSteps = [
      {progress: 10, subtitle: '🔍 Lecture de la playlist...'},
      {progress: 25, subtitle: '🔗 Connexion au serveur...'},
      {progress: 45, subtitle: `📺 Chargement de ${channelCount} chaînes...`},
      {progress: 65, subtitle: '📂 Organisation par catégories...'},
      {progress: 80, subtitle: '⚙️ Configuration des paramètres...'},
      {progress: 95, subtitle: '✅ Finalisation de la connexion...'},
      {progress: 100, subtitle: '🎉 Playlist connectée avec succès !'},
    ];

    for (let i = 0; i < connectionSteps.length; i++) {
      const step = connectionSteps[i];
      await new Promise(resolve => setTimeout(resolve, stepDuration));

      updateLoading({
        progress: step.progress,
        subtitle: step.subtitle,
      });

      // Pause plus longue sur l'étape de chargement des chaînes
      if (step.progress === 45) {
        await new Promise(resolve => setTimeout(resolve, stepDuration * 1.5));
      }
    }

    // Attendre finalisation
    await new Promise(resolve => setTimeout(resolve, 500));

    // Masquer chargement
    hideLoading();

    // Activer la playlist et sauvegarder l'ID pour persistance
    setSelectedPlaylistId(playlist.id);

    // 🔧 NOUVEAU: Synchroniser avec WatermelonDB - marquer la playlist comme active
    try {
      console.log('🔄 Mise à jour flag is_active dans WatermelonDB...');
      const database = await import('./src/database');
      const {Playlist} = await import('./src/database/models');

      // Marquer la playlist sélectionnée comme active dans WatermelonDB
      await database.default.write(async () => {
        // D'abord, désactiver toutes les playlists
        const allPlaylists = await database.default
          .get<Playlist>('playlists')
          .query()
          .fetch();

        for (const pl of allPlaylists) {
          await pl.update(p => {
            p.isActive = false;
          });
        }

        // Puis, activer la playlist sélectionnée
        const selectedPlaylist = await database.default
          .get<Playlist>('playlists')
          .find(playlist.id);

        if (selectedPlaylist) {
          await selectedPlaylist.update(p => {
            p.isActive = true;
          });
          console.log('✅ Playlist marquée comme active dans WatermelonDB:', selectedPlaylist.name);
        }
      });
    } catch (dbError) {
      console.error('❌ Erreur mise à jour is_active WatermelonDB:', dbError);
    }

    // Sauvegarder l'ID de playlist active pour restauration au redémarrage
    try {
      const AsyncStorage = await import(
        '@react-native-async-storage/async-storage'
      );
      await AsyncStorage.default.setItem(
        'last_selected_playlist_id',
        playlist.id,
      );
      console.log('💾 ID playlist active sauvegardé:', playlist.id);
    } catch (error) {
      console.error('❌ Erreur sauvegarde ID playlist active:', error);
    }

    // Fermer le ProfilesModal
    setShowProfilesModal(false);

    // Afficher notification de succès
    setTimeout(() => {
      showNotification('Connexion réussie', 'success', 3000);
    }, 300);

    console.log('✅ Playlist activée - retour écran principal');
  };

  const handleAddPlaylist = () => {
    console.log('➕ Ajouter nouvelle playlist');
    setShowProfilesModal(false);
    setTimeout(() => {
      setShowConnectionModal(true);
    }, 100);
  };

  const handleSettingsPress = () => {
    console.log('⚙️ Clic sur paramètres');

    // 🔒 Contrôle parental pour les profils enfants
    if (activeProfileForPIN?.isKids) {
      console.log('🔒 Contrôle parental: Profil enfant détecté - PIN requis');
      setShowPinModal(true);
      return;
    }

    // Accès normal pour les profils adultes
    navigation.navigate('Settings');
  };

  const handleMultiScreenPress = () => {
    const startTime = performance.now();
    console.log('📺 Multi-écran CLICKED - Ouverture INSTANTANÉE');

    if (!selectedPlaylistId) {
      Alert.alert(
        '📺 Aucune playlist',
        "Veuillez d'abord importer et sélectionner une playlist.",
        [{text: 'OK'}],
      );
      return;
    }

    // ⚡ Ouvrir le modal INSTANTANÉMENT - Pas de chargement préalable !
    setShowMultiScreen(true);

    // Log du temps d'ouverture
    requestAnimationFrame(() => {
      const endTime = performance.now();
      console.log(
        `⏱️ [PERF] Modal ouvert en ${(endTime - startTime).toFixed(2)}ms`,
      );
    });
  };

  const handleMultiScreenClose = () => {
    console.log('🚪 Fermeture multi-écran');
    setShowMultiScreen(false);
  };

  const handleMultiScreenFullscreen = (channel: Channel) => {
    console.log(
      '🎬 Passage en fullscreen via GlobalVideoPlayer:',
      channel.name,
      'seekTime:',
      channel.seekTime,
    );

    // ⚡ Utiliser le GlobalVideoPlayer via PlayerStore au lieu de l'ancien VideoPlayer
    playerActions.playChannel(channel, selectedPlaylistId);
    playerActions.setFromMultiScreen(true);
    playerActions.setFullscreen(true);

    // Fermer multi-écran après que le fullscreen soit actif
    requestAnimationFrame(() => {
      setTimeout(() => {
        setShowMultiScreen(false);
      }, 150);
    });
  };

  // 👤 Handlers pour le système de profils
  const handleProfileSelect = async (profile: Profile) => {
    console.log('👤 handleProfileSelect dans App_IPTV_SMARTERS.tsx');
    console.log('✅ Profil sélectionné:', profile.name);
    setCurrentProfile(profile);
    setActiveProfileForPIN(profile); // 🔑 Mettre à jour le profil pour le contrôle parental
    setShowProfileSelection(false);

    // Charger le thème du profil
    await loadProfileTheme(profile.id);
  };

  const handleOpenProfileManagement = () => {
    setEditingProfile(null); // Assurez-vous qu'aucun profil n'est en cours d'édition
    setShowProfileManagement(true);
  };

  const handleStartEditProfile = (profile: Profile) => {
    setEditingProfile(profile);
    setShowProfileManagement(true);
  };

  const handleCloseProfileManagement = () => {
    setShowProfileManagement(false);
    setEditingProfile(null); // Nettoyer le profil en cours d'édition
    // Recharger le profil actif après modification
    ProfileService.getActiveProfile().then(profile => {
      if (profile) {
        setCurrentProfile(profile);
      }
    });
  };

  const handleOpenPlaylistsFromSelection = () => {
    console.log('👤 Ouverture directe ProfilesModal depuis ProfileSelection');
    // Ne pas masquer l'écran de sélection, juste ouvrir le modal par-dessus
    setShowProfilesModal(true);
  };

  const handleAddProfile = () => {
    console.log('➕ Ouverture AddProfileModal');
    setShowAddProfile(true);
  };

  const handleCloseAddProfile = () => {
    setShowAddProfile(false);
  };

  const handleProfileCreated = async () => {
    console.log('✅ Profil créé, rechargement de la liste');
    // Recharger la liste des profils
    const profiles = await ProfileService.getAllProfiles();
    console.log('📋 Profils rechargés:', profiles.length);
    // Incrémenter la clé de rafraîchissement pour forcer la mise à jour de ProfileSelectionScreen
    setProfilesRefreshKey(prev => prev + 1);
  };

  // 🔄 Afficher écran de chargement pendant l'initialisation
  if (isInitializing) {
    return (
      <View style={[styles.container, {backgroundColor: '#0a0e1a'}]}>
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <Text style={{color: '#FFFFFF', fontSize: 18, marginBottom: 12}}>
            Chargement...
          </Text>
          <Text style={{color: 'rgba(255, 255, 255, 0.6)', fontSize: 14}}>
            Initialisation de l'application
          </Text>
        </View>
      </View>
    );
  }

  // Afficher écran de sélection si profils non initialisés, affichage demandé, OU aucun profil actif
  if (!profilesInitialized || showProfileSelection || !currentProfile) {
    return (
      <>
        <ProfileSelectionScreen
          onProfileSelect={handleProfileSelect}
          onManageProfiles={handleOpenProfileManagement}
          onOpenPlaylists={handleOpenPlaylistsFromSelection}
          onAddProfile={handleAddProfile}
          onEditProfile={handleStartEditProfile} // Passer la nouvelle fonction
          refreshKey={profilesRefreshKey}
        />
        <AddProfileModal
          visible={showAddProfile}
          onClose={handleCloseAddProfile}
          onProfileCreated={handleProfileCreated}
        />
        <ProfileManagementModal
          visible={showProfileManagement}
          onClose={handleCloseProfileManagement}
          onProfilesChanged={() => {
            // Recharger les profils si nécessaire
            ProfileService.getActiveProfile().then(profile => {
              if (profile) {
                setCurrentProfile(profile);
              }
            });
            // Incrémenter la clé de rafraîchissement
            setProfilesRefreshKey(prev => prev + 1);
          }}
          profileToEdit={editingProfile}
          refreshKey={profilesRefreshKey}
        />
        {/* Modals de connexion déplacés ici pour être accessibles */}
        <ConnectionModal
          visible={showConnectionModal}
          onClose={() => setShowConnectionModal(false)}
          onXtreamConnect={handleXtreamConnect}
          onM3UConnect={handleM3UConnect}
          onUsersList={handleUsersList}
        />
        <XtreamCodeModal
          visible={showXtreamModal}
          onClose={handleXtreamClose}
          onConnect={handleXtreamConnection}
        />
        <M3UUrlModal
          visible={showM3UModal}
          onClose={handleM3UClose}
          onConnect={handleM3UConnection}
        />
        <ProfilesModal
          visible={showProfilesModal}
          onClose={handleProfilesClose}
          onPlaylistSelect={handlePlaylistSelect}
          onAddPlaylist={handleAddPlaylist}
          selectedPlaylistId={selectedPlaylistId}
        />
      </>
    );
  }

  return (
    <LinearGradient
      colors={['#0a0e1a', '#12182e', '#1a2440', '#233052']}
      locations={[0, 0.3, 0.7, 1]}
      start={{x: 0.5, y: 0}}
      end={{x: 0.5, y: 1}}
      style={styles.container}>
      {/* Effet grain de sable (noise texture) */}
      <View
        style={[
          styles.absoluteFill,
          {
            backgroundColor: 'transparent',
            opacity: 0.08,
          },
        ]}
        pointerEvents="none">
        <View
          style={[
            styles.absoluteFill,
            {
              backgroundColor: '#000',
              opacity: 0.5,
            },
          ]}
        />
      </View>

      {/* Dégradé radial - lumière centrale */}
      <LinearGradient
        colors={[
          'rgba(60, 100, 160, 0.25)',
          'rgba(50, 90, 150, 0.18)',
          'rgba(40, 80, 140, 0.12)',
          'rgba(30, 70, 130, 0.08)',
          'rgba(20, 60, 120, 0.04)',
          'transparent',
        ]}
        locations={[0, 0.2, 0.4, 0.6, 0.8, 1]}
        start={{x: 0.5, y: 0.3}}
        end={{x: 0.5, y: 1}}
        style={styles.absoluteFill}
        pointerEvents="none"
      />

      {/* Effet de lumière du bas gauche - plus prononcé */}
      <LinearGradient
        colors={[
          'rgba(90, 140, 220, 0.45)',
          'rgba(80, 130, 210, 0.38)',
          'rgba(70, 120, 200, 0.30)',
          'rgba(60, 110, 190, 0.22)',
          'rgba(50, 100, 180, 0.15)',
          'rgba(40, 90, 170, 0.10)',
          'rgba(30, 80, 160, 0.06)',
          'rgba(20, 70, 150, 0.03)',
          'transparent',
        ]}
        locations={[0, 0.1, 0.2, 0.32, 0.45, 0.6, 0.75, 0.88, 1]}
        start={{x: 0, y: 1}}
        end={{x: 0.65, y: 0.2}}
        style={styles.absoluteFill}
        pointerEvents="none"
      />
      {/* StatusBar gérée par StatusBarManager centralisé */}

      <View style={styles.header}>
        <View style={styles.headerRight}>
            <Pressable
            style={({pressed}) => [
              styles.headerIconButton,
              pressed && {transform: [{scale: 0.9}]},
            ]}
            onPress={handleSettingsPress}>
            <Icon name="settings" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.mainCardsSection}>
          <View style={styles.leftColumn}>
            <View style={{flex: 1}}>
              <Pressable
                style={({pressed}) => [
                  styles.cardTV,
                  pressed && {transform: [{scale: 0.97}]},
                ]}
                onPress={handleTVCardPress}>
                {({pressed}) => (
                  <>
                    <LinearGradient
                      colors={['#153963', '#334e71', '#506a7f']}
                      locations={[0, 0.5, 1]}
                      start={{x: 1, y: 0}}
                      end={{x: 0, y: 1}}
                      style={styles.absoluteFill}
                      pointerEvents="none"
                    />
                    <LinearGradient
                      colors={[
                        'rgba(130, 165, 205, 0.38)',
                        'rgba(125, 160, 200, 0.34)',
                        'rgba(120, 155, 195, 0.30)',
                        'rgba(115, 150, 190, 0.26)',
                        'rgba(110, 145, 185, 0.22)',
                        'rgba(100, 135, 175, 0.18)',
                        'rgba(90, 125, 165, 0.14)',
                        'rgba(80, 115, 155, 0.10)',
                        'rgba(70, 105, 145, 0.07)',
                        'rgba(60, 95, 135, 0.04)',
                        'rgba(50, 85, 125, 0.02)',
                        'transparent',
                      ]}
                      locations={[
                        0, 0.08, 0.15, 0.22, 0.28, 0.35, 0.42, 0.5, 0.6, 0.7,
                        0.85, 1,
                      ]}
                      start={{x: 0, y: 1}}
                      end={{x: 1, y: 0}}
                      style={styles.absoluteFill}
                      pointerEvents="none"
                    />
                    {pressed && (
                      <View
                        style={[
                          styles.absoluteFill,
                          {backgroundColor: 'rgba(0, 0, 0, 0.2)'},
                        ]}
                        pointerEvents="none"
                      />
                    )}
                    <View style={styles.cardContent} pointerEvents="box-none">
                      <View style={styles.premiumIconWrapper}>
                        <Image source={iconMap.tv} style={styles.iconImageLg} />
                      </View>
                      <Text style={styles.modernTvTitle}>TV EN DIRECT</Text>
                      <Text style={styles.modernSubtitle}>Streaming Live</Text>
                    </View>
                  </>
                )}
              </Pressable>
            </View>
          </View>

          <View style={styles.rightColumn}>
            <View style={styles.topRow}>
              <View style={{flex: 1}}>
                <Pressable
                  style={({pressed}) => [
                    styles.cardFilms,
                    pressed && {transform: [{scale: 0.97}]},
                  ]}
                  onPress={() => {
                    console.log('🎬 Films CLICKED! - NAVIGATION FUTURE');
                  }}>
                  {({pressed}) => (
                    <>
                      <LinearGradient
                        colors={['#d97d3f', '#e38d4d', '#ed9d5b']}
                        locations={[0, 0.5, 1]}
                        start={{x: 1, y: 0}}
                        end={{x: 0, y: 1}}
                        style={styles.absoluteFill}
                        pointerEvents="none"
                      />
                      <LinearGradient
                        colors={[
                          'rgba(255, 180, 120, 0.38)',
                          'rgba(250, 175, 115, 0.34)',
                          'rgba(245, 170, 110, 0.30)',
                          'rgba(240, 165, 105, 0.26)',
                          'rgba(235, 160, 100, 0.22)',
                          'rgba(230, 155, 95, 0.18)',
                          'rgba(225, 150, 90, 0.14)',
                          'rgba(220, 145, 85, 0.10)',
                          'rgba(215, 140, 80, 0.07)',
                          'rgba(210, 135, 75, 0.04)',
                          'rgba(205, 130, 70, 0.02)',
                          'transparent',
                        ]}
                        locations={[
                          0, 0.08, 0.15, 0.22, 0.28, 0.35, 0.42, 0.5, 0.6, 0.7,
                          0.85, 1,
                        ]}
                        start={{x: 0, y: 1}}
                        end={{x: 1, y: 0}}
                        style={styles.absoluteFill}
                        pointerEvents="none"
                      />
                      {pressed && (
                        <View
                          style={[
                            styles.absoluteFill,
                            {backgroundColor: 'rgba(0, 0, 0, 0.2)'},
                          ]}
                          pointerEvents="none"
                        />
                      )}
                      <View style={styles.cardContent} pointerEvents="box-none">
                        <View style={styles.premiumIconWrapperFilms}>
                          <Image
                            source={iconMap.films}
                            style={styles.iconImageMd}
                          />
                        </View>
                        <Text style={styles.modernCardTitle}>FILMS</Text>
                      </View>
                    </>
                  )}
                </Pressable>
              </View>

              <View style={{flex: 1}}>
                <Pressable
                  style={({pressed}) => [
                    styles.cardSeries,
                    pressed && {transform: [{scale: 0.97}]},
                  ]}
                  onPress={() => {
                    console.log('📺 Series CLICKED! - NAVIGATION FUTURE');
                  }}>
                  {({pressed}) => (
                    <>
                      <LinearGradient
                        colors={['#5d6185', '#4d5178', '#3d416b']}
                        locations={[0, 0.5, 1]}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 1}}
                        style={styles.absoluteFill}
                        pointerEvents="none"
                      />
                      <LinearGradient
                        colors={['rgba(140, 160, 200, 0.3)', 'transparent']}
                        locations={[0, 0.5]}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 0.5}}
                        style={styles.absoluteFill}
                        pointerEvents="none"
                      />
                      <LinearGradient
                        colors={['rgba(255, 255, 255, 0.2)', 'transparent']}
                        locations={[0, 0.4]}
                        style={styles.premiumReflectionEffect}
                        pointerEvents="none"
                      />
                      {pressed && (
                        <View
                          style={[
                            styles.absoluteFill,
                            {backgroundColor: 'rgba(0, 0, 0, 0.2)'},
                          ]}
                          pointerEvents="none"
                        />
                      )}
                      <View style={styles.cardContent} pointerEvents="box-none">
                        <View style={styles.premiumIconWrapperSeries}>
                          <Image
                            source={iconMap.series}
                            style={styles.iconImageMd}
                          />
                        </View>
                        <Text style={styles.modernCardTitle}>SERIES</Text>
                      </View>
                    </>
                  )}
                </Pressable>
              </View>
            </View>

            <View style={styles.bottomRow}>
              {bottomRowCards.map(card => (
                <View key={card.key} style={{flex: 1}}>
                  <Pressable
                    style={({pressed}) => [
                      styles.cardBottom,
                      styles.liquidGlassCard,
                      pressed && {transform: [{scale: 0.97}]},
                    ]}
                    onPress={() => {
                      if (card.key === 'multi') {
                        handleMultiScreenPress();
                      } else {
                        console.log(
                          `${card.title} CLICKED! - NAVIGATION FUTURE`,
                        );
                      }
                    }}>
                    {({pressed}) => (
                      <>
                        <LinearGradient
                          colors={['#3a404a', '#424852', '#4a525c']}
                          locations={[0, 0.5, 1]}
                          start={{x: 0, y: 0}}
                          end={{x: 1, y: 1}}
                          style={styles.absoluteFill}
                          pointerEvents="none"
                        />
                        <LinearGradient
                          colors={[
                            'rgba(140, 150, 165, 0.18)',
                            'rgba(130, 140, 155, 0.14)',
                            'rgba(120, 130, 145, 0.10)',
                            'rgba(110, 120, 135, 0.08)',
                            'rgba(100, 110, 125, 0.06)',
                            'rgba(90, 100, 115, 0.04)',
                            'rgba(80, 90, 105, 0.02)',
                            'transparent',
                          ]}
                          locations={[0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1]}
                          start={{x: 0, y: 1}}
                          end={{x: 1, y: 0}}
                          style={styles.absoluteFill}
                          pointerEvents="none"
                        />
                        {pressed && (
                          <View
                            style={[
                              styles.absoluteFill,
                              {backgroundColor: 'rgba(0, 0, 0, 0.2)'},
                            ]}
                            pointerEvents="none"
                          />
                        )}
                        <View
                          style={styles.cardContent}
                          pointerEvents="box-none">
                          <View
                            style={[
                              styles.iconWrapper,
                              styles.liquidGlassIconWrapper,
                            ]}>
                            <Image
                              source={iconMap[card.key as keyof typeof iconMap]}
                              style={[
                                styles.iconImageSm,
                                styles.liquidGlassIcon,
                              ]}
                            />
                          </View>
                          <Text style={styles.modernSmallTitle}>
                            {card.title}
                          </Text>
                        </View>
                      </>
                    )}
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Footer avec informations playlist et utilisateur */}
      <View style={styles.footerSpace}>
        {currentProfile ? (
          <View style={styles.footerContent}>
            {/* Section gauche: Date d'expiration (conditionnelle) */}
            <View style={styles.footerLeft}>
              {playlistInfo && (
                <>
                  <Text style={styles.footerLabel}>Expiration: </Text>
                  <Text style={styles.footerValue}>
                    {playlistInfo.expirationDate}
                  </Text>
                </>
              )}
            </View>

            {/* Section centre: Profil actif (toujours visible) */}
            <Pressable
              style={({pressed}) => [
                styles.footerCenter,
                pressed && {transform: [{scale: 0.95}]},
              ]}
              onPress={() => setShowProfileSelection(true)}>
              <View style={styles.avatarWrapper}>
                <Text style={styles.footerProfileAvatar}>
                  {currentProfile.avatar || '👤'}
                </Text>
              </View>
              <Text style={styles.footerUsername}>
                {currentProfile.name || 'Profil'}
              </Text>
              <View
                style={[
                  styles.arrowButton,
                  {backgroundColor: 'rgba(255, 255, 255, 0.05)'},
                ]}>
                <Icon
                  name="expand-more"
                  size={18}
                  color="rgba(255, 255, 255, 0.7)"
                />
              </View>
            </Pressable>

            {/* Section droite: Nom playlist (conditionnel) */}
            <View style={styles.footerRight}>
              <Text
                style={styles.footerValue}
                numberOfLines={1}
                ellipsizeMode="tail">
                {playlistInfo
                  ? `Connecté: ${playlistInfo.name}`
                  : 'Aucune playlist'}
              </Text>
            </View>
          </View>
        ) : (
          // Fallback si aucun profil n'est sélectionné
          <Text style={styles.footerPlaceholder}>
            Aucune playlist sélectionnée
          </Text>
        )}
      </View>

      {/* 🎬 GlobalVideoPlayer - Géré par App.tsx (instance principale) */}
      {/* L'instance dupliquée a été supprimée pour corriger le double PIP */}

      {/* Video Player Modal - Ancien système (conservé pour compatibilité) */}
      <Modal
        visible={showVideoPlayer}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent={true}
        onShow={() => console.log('📺 Modal is now visible')}
        onDismiss={() => console.log('📺 Modal dismissed')}>
        <View style={styles.playerContainer}>
          <View style={styles.playerHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClosePlayer}>
              <Icon name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          <VideoPlayer
            channel={currentChannel}
            isVisible={showVideoPlayer}
            onError={error => console.log('Video error:', error)}
          />
        </View>
      </Modal>

      {/* Multi-Screen Modal */}
      <MultiScreenView
        visible={showMultiScreen}
        onClose={handleMultiScreenClose}
        playlistId={selectedPlaylistId}
        currentChannel={currentChannel}
        onChannelFullscreen={handleMultiScreenFullscreen}
      />

      {/* Composants de test DI supprimés pour production */}

      {/* VideoPlayerPersistent maintenant intégré directement dans ChannelPlayerScreen */}

      {/* 👤 Profile Management Modal */}
      <ProfileManagementModal
        visible={showProfileManagement}
        onClose={handleCloseProfileManagement}
        onProfilesChanged={() => {
          // Recharger les profils si nécessaire
          ProfileService.getActiveProfile().then(profile => {
            if (profile) {
              setCurrentProfile(profile);
            }
          });
          // Incrémenter la clé de rafraîchissement
          setProfilesRefreshKey(prev => prev + 1);
        }}
        refreshKey={profilesRefreshKey}
      />

      {/* Modal PIN parental pour l'accès aux paramètres */}
      <SimplePinModal
        visible={showPinModal}
        profile={activeProfileForPIN}
        reason="PIN parental requis pour accéder aux paramètres"
        onClose={() => {
          setShowPinModal(false);
        }}
        onSuccess={async (verifiedPin) => {
          setShowPinModal(false);
          // PIN valide, naviguer vers les paramètres
          navigation.navigate('Settings');
        }}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  absoluteFill: {position: 'absolute', top: 0, left: 0, right: 0, bottom: 0},

  // Styles pour bouton de test lecteur persistant
  testPersistentButton: {
    position: 'absolute',
    top: 120,
    right: 20,
    backgroundColor: 'rgba(255, 69, 0, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 999,
  },
  testButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  container: {flex: 1},
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  headerLeft: {flexDirection: 'row', alignItems: 'center', flex: 1},
  logoContainer: {flexDirection: 'row', alignItems: 'center', marginRight: 16},
  logoIcon: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(74, 144, 226, 0.5)',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoText: {fontSize: 18, fontWeight: '600', color: '#FFFFFF'},
  timeText: {fontSize: 14, color: '#B0BEC5'},
  headerRight: {flexDirection: 'row', alignItems: 'center'},
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  headerButtonText: {color: '#FFFFFF', fontSize: 14, marginLeft: 8},
  headerIconButton: {padding: 8, marginLeft: 4},
  content: {
    flex: 0.85,
    paddingHorizontal: 40,
    paddingTop: 8,
    paddingBottom: 16,
  },
  mainCardsSection: {flexDirection: 'row', flex: 1, gap: 20},
  leftColumn: {flex: 1},
  rightColumn: {flex: 1.2, flexDirection: 'column', gap: 16},
  topRow: {flexDirection: 'row', flex: 0.7, gap: 16},
  bottomRow: {flexDirection: 'row', flex: 0.3, gap: 14},

  // Footer space
  footerSpace: {
    flex: 0.15,
    marginHorizontal: 16,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerContent: {
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: 40,
  },
  footerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  avatarWrapper: {
    marginRight: 4,
  },
  arrowButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  footerRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 40,
  },
  footerLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  footerValue: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 15,
    fontWeight: '700',
    maxWidth: 150,
  },
  footerProfileAvatar: {
    fontSize: 24,
    marginRight: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    width: 40,
    height: 40,
    borderRadius: 20,
    textAlign: 'center',
    lineHeight: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  footerUsername: {
    color: 'rgba(255, 255, 255, 1)',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 8,
    marginRight: 6,
  },
  footerPlaceholder: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    fontWeight: '600',
  },

  // Cards refactorisées - Frosted Glass unifié
  cardTV: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 16},
    shadowOpacity: 0.5,
    shadowRadius: 32,
    elevation: 25,
  },
  cardFilms: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 16},
    shadowOpacity: 0.5,
    shadowRadius: 32,
    elevation: 25,
  },
  cardSeries: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 16},
    shadowOpacity: 0.5,
    shadowRadius: 32,
    elevation: 25,
  },
  cardBottom: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 14},
    shadowOpacity: 0.45,
    shadowRadius: 28,
    elevation: 22,
  },
  reflectionEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  premiumReflectionEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
  },
  // TouchableOverlay supprimé - fusionné dans les cartes

  iconWrapper: {
    marginBottom: 8,
  },
  premiumIconWrapper: {
    marginBottom: 6,
    shadowColor: '#4A9EFF',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 1.0,
    shadowRadius: 12,
    elevation: 10,
  },
  premiumIconWrapperFilms: {
    marginBottom: 6,
    shadowColor: '#FF6B35',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 1.0,
    shadowRadius: 12,
    elevation: 10,
  },
  premiumIconWrapperSeries: {
    marginBottom: 6,
    shadowColor: '#826AA0',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 1.0,
    shadowRadius: 12,
    elevation: 10,
  },
  iconImageLg: {width: 70, height: 70, resizeMode: 'contain'},
  iconImageMd: {width: 55, height: 55, resizeMode: 'contain'},
  iconImageSm: {width: 35, height: 35, resizeMode: 'contain'},

  // Liquid Glass Styles
  liquidGlassCard: {
    backgroundColor: 'rgba(65, 85, 75, 0.6)',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#2D3D32',
    shadowOffset: {width: 0, height: 15},
    shadowOpacity: 0.9,
    shadowRadius: 30,
    elevation: 28,
    borderWidth: 2,
    borderColor: 'rgba(65, 85, 75, 0.7)',
  },
  liquidGlassIconWrapper: {
    shadowColor: '#2D3D32',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 1.0,
    shadowRadius: 18,
    elevation: 15,
  },
  liquidGlassIcon: {
    opacity: 1.0,
    tintColor: 'rgba(255, 255, 255, 1.0)',
  },

  modernTvTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  modernSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    fontWeight: '500',
  },
  modernCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  modernSmallTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  modernSmallSubtitle: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Video Player Styles
  playerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  playerHeader: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1000,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  closeButton: {
    padding: 8,
  },

  // Styles de test DI supprimés pour production
  versionContainer: {
    position: 'absolute',
    top: 30,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    zIndex: 1000,
  },
  versionText: {
    color: '#4A9EFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  versionSubText: {
    color: '#FFFFFF',
    fontSize: 10,
    opacity: 0.8,
  },
  confirmationBanner: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: '#FF4444',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    zIndex: 2000,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  confirmationText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  confirmationSub: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});

export default App;
