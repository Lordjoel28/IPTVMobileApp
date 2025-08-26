/**
 * 🎬 IPTV Smarters Pro Interface - Version Finale Corrigée 3.0
 * Implémentation finale avec fond premium, couleurs riches, reflets et lueurs.
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  Image,
  Modal,
  Alert,
} from 'react-native';
// Solution native MainActivity.java pour immersif
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { BlurView } from '@react-native-community/blur';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import VideoPlayer from './src/components/VideoPlayer';
import ConnectionModal from './src/components/ConnectionModal';
import XtreamCodeModal from './src/components/XtreamCodeModal';
import M3UUrlModal from './src/components/M3UUrlModal';
import ProfilesModal from './src/components/ProfilesModal';
import { ServiceTest } from './src/components/ServiceTest';
import type { Channel } from './src/types';
// import { APP_VERSION } from './src/version'; // Removed for production
import type { SimpleRootStackParamList } from './AppWithNavigation';
// AppContext removed - using UIStore instead
import { useUIStore } from './src/stores/UIStore';

// Import des nouveaux services migrés
import IPTVService from './src/services/IPTVService';

// 🏗️ Import du nouveau système d'architecture DI
import { initializeServiceArchitecture, ServiceMigration } from './src/core';

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
  { key: 'epg', title: 'LIVE EPG', subtitle: 'Guide TV', index: 3 },
  { key: 'multi', title: 'MULTI-ÉCR', subtitle: 'Écrans', index: 4 },
  { key: 'replay', title: 'RATTRAPER', subtitle: 'Replay', index: 5 },
];

// Type pour navigation
type NavigationProp = StackNavigationProp<SimpleRootStackParamList>;

const App: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  // Replaced AppContext with UIStore
  const { showLoading, updateLoading, hideLoading, showNotification, registerModalCloser } = useUIStore();
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showXtreamModal, setShowXtreamModal] = useState(false);
  const [showM3UModal, setShowM3UModal] = useState(false);
  const [showProfilesModal, setShowProfilesModal] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | undefined>();
  // 🧪 État pour le test du système DI
  const [showServiceTest, setShowServiceTest] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardsScale = useRef([...Array(6)].map(() => new Animated.Value(1))).current;
  
  // Instance IPTV unique pour toute l'app
  const iptvServiceRef = useRef<any>(null);

  // Test channel for demo
  const testChannel: Channel = {
    id: '1',
    name: '📺 Test IPTV Channel',
    url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    category: 'Test'
  };

  useEffect(() => {
    // Mode immersif avec react-native-edge-to-edge (solution moderne 2025)
    
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    
    // Enregistrer la fonction de fermeture du modal de connexion
    registerModalCloser(() => setShowConnectionModal(false));
    
    // 🏗️ Initialisation du nouveau système d'architecture DI (Phase 2)
    const initializeDIArchitecture = async () => {
      try {
        console.log('🏗️ Initializing Modern Service Architecture...');
        initializeServiceArchitecture();
        
        // Test de validation des services
        const status = ServiceMigration.getMigrationStatus();
        console.log('📊 DI Architecture Status:', status);
        
        // 🧪 Test automatique de tous les services
        console.log('🧪 Testing all services automatically...');
        const testResults = await ServiceMigration.validateAllServices();
        console.log('📋 Service Test Results:', {
          passed: testResults.passed.length,
          failed: testResults.failed.length,
          passedServices: testResults.passed,
          failedServices: testResults.failed
        });
        
        console.log('✅ Modern Service Architecture ready');
      } catch (error) {
        console.log('⚠️ DI Architecture not ready yet:', error.message);
        // L'app continue avec l'ancienne architecture si besoin
      }
    };

    // Test d'initialisation des nouveaux services IPTV - INSTANCE UNIQUE
    const testServices = async () => {
      try {
        console.log('🚀 Initialisation des services IPTV...');
        
        // Utiliser toujours la même instance
        if (!iptvServiceRef.current) {
          iptvServiceRef.current = IPTVService.getInstance({
            enableParentalControl: true,
            enableUserManagement: true,
            enableAdvancedSearch: true,
            enablePerformanceMonitoring: true
          });
        }
        
        const iptv = iptvServiceRef.current;
        await iptv.initialize();
        console.log('✅ Services IPTV initialisés avec succès!');
        
        // Obtenir stats pour validation  
        const stats = await iptv.getServiceStats();
        console.log('📊 Stats services:', {
          isReady: stats.initialization.isReady,
          users: stats.users.totalUsers,
          playlists: stats.playlists.totalPlaylists
        });
        
      } catch (error) {
        console.log('⚠️ Services pas encore complètement prêts:', error.message);
        // L'app continue de fonctionner normalement
      }
    };
    
    // Initialise d'abord la nouvelle architecture DI
    initializeDIArchitecture();
    
    // Puis les services existants
    testServices();
    
    return () => {
      clearInterval(timeInterval);
      // Pas de cleanup nécessaire avec SystemBars
    };
  }, []);

  // Animations supprimées pour assurer clics fonctionnels

  const handleTVCardPress = async () => {
    console.log('📺 TV Card Pressed - Vérification playlist active');
    
    // Vérifier s'il y a une playlist sélectionnée
    if (!selectedPlaylistId) {
      console.log('❌ Aucune playlist sélectionnée');
      Alert.alert(
        '📺 Aucune playlist',
        'Veuillez d\'abord importer et sélectionner une playlist depuis le menu "Profils".',
        [{ text: 'OK' }]
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
        const { Playlist } = await import('./src/database/models');
        
        // Tentative de récupération depuis WatermelonDB
        const playlist = await database.default.get<typeof Playlist>('playlists').find(selectedPlaylistId);
        
        if (playlist) {
          console.log(`🍉 Playlist WatermelonDB trouvée: ${playlist.name} (${playlist.channelsCount} chaînes)`);
          
          // Navigation directe vers ChannelsScreen - WatermelonDB gère le lazy loading
          navigation.navigate('ChannelsScreen', {
            playlistId: selectedPlaylistId,
            channelsCount: playlist.channelsCount,
            useWatermelonDB: true // Flag pour indiquer l'usage de WatermelonDB
          });
          return;
        }
      } catch (watermelonError) {
        console.log('⚠️ Playlist non trouvée dans WatermelonDB, tentative avec ancien système...');
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
        console.log('⚠️ Playlist non trouvée dans le service, tentative de récupération directe...');
        
        // Fallback: Récupérer directement depuis AsyncStorage avec plusieurs clés possibles
        try {
          const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
          
          // D'ABORD: Vérifier si c'est une playlist Xtream Codes
          if (selectedPlaylistId.startsWith('xtream_')) {
            console.log('🔍 Détection playlist Xtream Codes, recherche spécialisée...');
            
            try {
              // Récupérer la liste des playlists Xtream sauvegardées
              const xtreamPlaylists = await AsyncStorage.getItem('saved_xtream_playlists');
              if (xtreamPlaylists) {
                const xtreamList = JSON.parse(xtreamPlaylists);
                console.log('📋 Playlists Xtream trouvées:', xtreamList.length);
                
                // Chercher la playlist correspondante par ID
                const targetPlaylist = xtreamList.find((p: any) => p.id === selectedPlaylistId);
                if (targetPlaylist) {
                  console.log('✅ Playlist Xtream trouvée:', targetPlaylist.name, '(' + targetPlaylist.channelsCount + ' chaînes)');
                  
                  // Pour Xtream Codes, il faut reconstruire la playlist depuis les credentials
                  try {
                    console.log('🔄 Reconstruction playlist Xtream avec credentials...');
                    const { WatermelonXtreamService } = await import('./src/services/WatermelonXtreamService');
                    const xtreamManager = new WatermelonXtreamService();
                    
                    // Charger config et credentials
                    await xtreamManager.loadConfig();
                    xtreamManager.setCredentials(targetPlaylist.server, targetPlaylist.username, targetPlaylist.password);
                    
                    // Timeout pour éviter blocage infini
                    const timeoutPromise = new Promise((_, reject) => {
                      setTimeout(() => reject(new Error('Timeout reconstruction Xtream (30s)')), 30000);
                    });
                    
                    // Course entre le processus Xtream et le timeout
                    const xtreamProcess = async () => {
                      console.log('🔐 Authentification Xtream...');
                      await xtreamManager.authenticate();
                      console.log('📺 Récupération chaînes Xtream...');
                      const channels = await xtreamManager.fetchChannelsExtreme();
                      return channels;
                    };
                    
                    const channels = await Promise.race([xtreamProcess(), timeoutPromise]);
                    
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
                        password: targetPlaylist.password
                      },
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString()
                    };
                    
                    // CRITIQUE: Sauvegarder avec chunking pour playlists volumineuses (25K+ chaînes)
                    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
                    
                    if (playlist.channels.length > 4000) {
                      console.log(`📦 Playlist volumineuse (${playlist.channels.length} chaînes), chunking activé...`);
                      
                      // Chunking des chaînes par paquets de 500 (optimisé espace disque)
                      const chunkSize = 500;
                      const chunks = [];
                      
                      for (let i = 0; i < playlist.channels.length; i += chunkSize) {
                        chunks.push(playlist.channels.slice(i, i + chunkSize));
                      }
                      
                      // Supprimer les anciens chunks au cas où
                      const allKeys = await AsyncStorage.getAllKeys();
                      const oldChunks = allKeys.filter(key => key.includes(targetPlaylist.id) && key.includes('_chunk_'));
                      if (oldChunks.length > 0) {
                        await AsyncStorage.multiRemove(oldChunks);
                        console.log(`🗑️ ${oldChunks.length} anciens chunks supprimés`);
                      }
                      
                      // Sauvegarder les nouveaux chunks
                      for (let i = 0; i < chunks.length; i++) {
                        const chunkKey = `playlist_${targetPlaylist.id}_chunk_${String(i).padStart(3, '0')}`;
                        await AsyncStorage.setItem(chunkKey, JSON.stringify(chunks[i]));
                      }
                      
                      // Sauvegarder les métadonnées (sans les chaînes)
                      const playlistMeta = { ...playlist };
                      delete playlistMeta.channels;
                      playlistMeta.chunked = true;
                      playlistMeta.chunkCount = chunks.length;
                      playlistMeta.chunkSize = chunkSize;
                      
                      await AsyncStorage.setItem(`playlist_${targetPlaylist.id}`, JSON.stringify(playlistMeta));
                      console.log(`💾 Playlist Xtream sauvée: ${chunks.length} chunks de ${chunkSize} chaînes`);
                      
                    } else {
                      // Sauvegarde normale pour petites playlists
                      await AsyncStorage.setItem(`playlist_${targetPlaylist.id}`, JSON.stringify(playlist));
                      console.log('💾 Playlist Xtream sauvée dans AsyncStorage');
                    }
                    
                    console.log('✅ Playlist Xtream reconstruite:', channels.length, 'chaînes');
                  } catch (xtreamError: any) {
                    console.error('❌ Erreur reconstruction Xtream:', xtreamError.message);
                    
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
                              error: 'Chargement annulé'
                            };
                          }
                        },
                        {
                          text: 'Réessayer',
                          onPress: () => {
                            // Relancer le processus (récursion simple)
                            setTimeout(() => {
                              handleTVCardPress();
                            }, 1000);
                          }
                        }
                      ]
                    );
                    
                    // En cas d'erreur, retourner directement pour éviter la navigation
                    return;
                  }
                } else {
                  console.error('❌ Playlist Xtream non trouvée dans saved_xtream_playlists');
                }
              } else {
                console.error('❌ Aucune playlist Xtream sauvegardée trouvée');
              }
            } catch (xtreamError: any) {
              console.error('❌ Erreur accès playlists Xtream:', xtreamError.message);
            }
          } else {
            // Playlist M3U classique - essayer différentes clés de stockage
            const possibleKeys = [
              `playlist_${selectedPlaylistId}`,
              selectedPlaylistId,
              `playlist_meta_${selectedPlaylistId}`,
              `playlist_url_${selectedPlaylistId}`
            ];
            
            for (const key of possibleKeys) {
              console.log(`🔍 Tentative récupération M3U avec clé: ${key}`);
              const playlistData = await AsyncStorage.getItem(key);
              
              if (playlistData) {
                try {
                  const parsedData = JSON.parse(playlistData);
                  if (parsedData && parsedData.channels && Array.isArray(parsedData.channels) && parsedData.channels.length > 0) {
                    playlist = parsedData;
                    console.log(`✅ Playlist M3U récupérée avec clé "${key}":`, playlist.channels.length, 'chaînes');
                    break;
                  } else {
                    console.log(`⚠️ Playlist trouvée avec clé "${key}" mais sans chaînes valides (${parsedData?.channels?.length || 0} chaînes)`);
                  }
                } catch (parseError: any) {
                  console.log(`⚠️ Erreur parsing avec clé "${key}":`, parseError.message);
                }
              }
            }
          }
          
          
          // Si toujours pas trouvé, recherche générale dans toutes les clés
          if (!playlist) {
            console.log('🔍 Recherche dans toutes les clés AsyncStorage...');
            const allKeys = await AsyncStorage.getAllKeys();
            console.log('📋 Clés disponibles:', allKeys.filter(k => k.includes('playlist') || k.includes('xtream')));
            
            // Chercher d'abord les playlists chunkées (grosses playlists)
            const chunkedKeys = allKeys.filter(k => k.includes(selectedPlaylistId) && k.includes('_chunk_'));
            if (chunkedKeys.length > 0) {
              console.log(`🧩 Playlist chunked détectée: ${chunkedKeys.length} chunks`);
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
                    totalChannels: allChannels.length
                  };
                  console.log(`✅ Playlist chunked reconstituée: ${allChannels.length} chaînes from ${chunks.length} chunks`);
                }
              } catch (chunkError) {
                console.error('❌ Erreur reconstitution chunks:', chunkError);
              }
            }
            
            // Fallback: chercher playlist normale
            if (!playlist) {
              for (const key of allKeys) {
                if (key.includes(selectedPlaylistId) || key.includes('playlist')) {
                  const data = await AsyncStorage.getItem(key);
                  if (data) {
                    try {
                      const parsed = JSON.parse(data);
                      if (parsed && parsed.channels && parsed.channels.length > 0) {
                        playlist = parsed;
                        console.log(`✅ Playlist de secours trouvée "${key}":`, playlist.channels.length, 'chaînes');
                        break;
                      }
                    } catch (e) {
                      console.log(`⚠️ Erreur parsing playlist de secours "${key}"`);
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
      if (!playlist || !playlist.channels || !Array.isArray(playlist.channels)) {
        throw new Error('Playlist invalide: structure des chaînes manquante ou corrompue');
      }
      
      const channels = playlist.channels;
      
      console.log('📺 Chaînes récupérées:', channels.length);
      
      if (channels.length === 0) {
        Alert.alert(
          '📺 Aucune chaîne',
          'La playlist sélectionnée ne contient aucune chaîne.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Navigation vers ChannelsScreen avec seulement l'ID (éviter les données volumineuses)
      navigation.navigate('ChannelsScreen', {
        playlistId: selectedPlaylistId,
        channelsCount: channels.length
      });
      
    } catch (error) {
      console.error('❌ Erreur récupération chaînes:', error);
      
      // 🔧 CORRECTION: Si erreur structure corrompue, forcer reimport
      if (error.message && error.message.includes('structure des chaînes manquante ou corrompue')) {
        console.log('🔄 Tentative de réparation automatique de la playlist...');
        
        Alert.alert(
          '🔄 Reconstruction',
          'La playlist doit être reconstruite. Cela peut prendre quelques secondes.',
          [
            {
              text: 'Annuler',
              style: 'cancel'
            },
            {
              text: 'Reconstruire',
              onPress: async () => {
                try {
                  console.log('🚧 Nettoyage des chunks corrompus...');
                  
                  // Nettoyer AsyncStorage des chunks orphelins
                  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
                  const allKeys = await AsyncStorage.getAllKeys();
                  const chunkKeys = allKeys.filter(key => key.includes('_chunk_'));
                  
                  if (chunkKeys.length > 0) {
                    console.log(`🗑️ Suppression de ${chunkKeys.length} chunks orphelins...`);
                    await AsyncStorage.multiRemove(chunkKeys);
                  }
                  
                  // Supprimer aussi l'ancienne playlist corrompue
                  await AsyncStorage.removeItem(`playlist_${selectedPlaylistId}`);
                  
                  // Forcer reload de l'app pour recréer la playlist
                  console.log('🔄 Rechargement automatique...');
                  // Navigation vers écran d'accueil puis retour pour forcer refresh
                  handleClosePlayer();
                  
                  // Petit délai puis relancer
                  setTimeout(() => {
                    handleTVCardPress();
                  }, 1000);
                  
                } catch (repairError) {
                  console.error('❌ Erreur lors de la réparation:', repairError);
                  Alert.alert(
                    '❌ Erreur',
                    'Impossible de réparer la playlist. Veuillez la supprimer et la recréer.',
                    [{ text: 'OK' }]
                  );
                }
              }
            }
          ]
        );
      } else {
        // Erreur normale
        Alert.alert(
          '❌ Erreur',
          'Impossible de charger les chaînes de la playlist.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleClosePlayer = () => {
    console.log('❌ Closing Video Player');
    setShowVideoPlayer(false);
    setCurrentChannel(null);
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
    showLoading('Connexion Xtream...', `Authentification ${credentials.username}...`, 0);
    
    try {
      console.log('🍉 Utilisation de WatermelonDB pour Xtream...');
      
      // Importer le nouveau service WatermelonDB
      const WatermelonXtreamService = await import('./src/services/WatermelonXtreamService');
      const xtreamService = WatermelonXtreamService.default;
      
      // Fonction de callback pour la progression
      const onProgress = (progress: number, message: string) => {
        updateLoading({ progress: Math.round(progress), subtitle: message });
      };
      
      const playlistName = `${credentials.username} (Xtream)`;
      
      // Import avec WatermelonDB - résout le problème SQLITE_FULL
      const playlistId = await xtreamService.importXtreamPlaylist(
        {
          url: credentials.url,
          username: credentials.username, 
          password: credentials.password
        },
        playlistName,
        onProgress
      );
      
      console.log(`🍉 Import WatermelonDB terminé: ${playlistId}`);
      
      // Récupérer les informations de la playlist créée pour AsyncStorage
      const database = await import('./src/database');
      const { Playlist } = await import('./src/database/models');
      const playlist = await database.default.get<typeof Playlist>('playlists').find(playlistId);
      
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
        status: 'active' as const
      };
      
      // Sauvegarder dans AsyncStorage pour rétrocompatibilité avec ProfilesModal
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      const existingData = await AsyncStorage.default.getItem('saved_xtream_playlists');
      const playlists = existingData ? JSON.parse(existingData) : [];
      
      // Éviter les doublons
      const existingIndex = playlists.findIndex((p: any) => 
        p.server === credentials.url && p.username === credentials.username
      );
      if (existingIndex >= 0) {
        playlists[existingIndex] = playlistData;
      } else {
        playlists.push(playlistData);
      }
      
      await AsyncStorage.default.setItem('saved_xtream_playlists', JSON.stringify(playlists));
      
      // Finalisation
      updateLoading({ progress: 100, subtitle: `✅ ${playlist.channelsCount} chaînes importées avec WatermelonDB !` });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      hideLoading();
      
      // Ouvrir automatiquement le ProfilesModal pour sélection
      console.log('📋 Ouverture automatique du ProfilesModal');
      setShowProfilesModal(true);
      
      console.log(`✅ Import Xtream WatermelonDB réussi: ${playlist.channelsCount} chaînes`);
      
    } catch (error) {
      console.error('❌ Erreur import Xtream WatermelonDB:', error);
      hideLoading();
      
      // Afficher erreur détaillée
      const errorMessage = error.message || 'Erreur inconnue';
      Alert.alert('❌ Erreur Import', `Impossible d'importer la playlist Xtream:\n\n${errorMessage}`, [{ text: 'OK' }]);
    }
  };

  // Handler pour la connexion M3U URL - VRAI TEST SERVICES IPTV  
  const handleM3UConnection = async (source: any) => {
    console.log('📁 Connexion M3U avec:', source);
    setShowM3UModal(false);
    
    // 🚀 AFFICHER LOADING OVERLAY AVEC ANIMATION
    showLoading('Téléchargement...', `Import de la playlist ${source.name}...`, 0);
    
    // 🚀 TEST COMPLET DES SERVICES IPTV - UTILISER L'INSTANCE EXISTANTE
    try {
      console.log('🚀 Utilisation des services IPTV...');
      
      // Simuler progression de téléchargement
      updateLoading({ progress: 10, subtitle: 'Connexion au serveur...' });
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Utiliser l'instance déjà initialisée
      const iptv = iptvServiceRef.current || IPTVService.getInstance({
        enableParentalControl: true,
        enableUserManagement: true, 
        enableAdvancedSearch: true,
        enablePerformanceMonitoring: true
      });
      
      // Sauvegarder la référence si pas déjà fait
      if (!iptvServiceRef.current) {
        iptvServiceRef.current = iptv;
      }
      
      // Vérifier si déjà initialisé
      if (!iptv.isReady) {
        console.log('⏳ Initialisation du service...');
        updateLoading({ progress: 25, subtitle: 'Initialisation des services...' });
        await iptv.initialize();
        console.log('✅ Service initialisé:', iptv.isReady);
      }
      
      // Test import playlist avec progression
      console.log('📥 Import playlist depuis:', source.source || source.url);
      updateLoading({ progress: 40, subtitle: 'Téléchargement playlist...' });
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const result = await iptv.importPlaylistFromUrl(
        source.source || source.url, 
        source.name || 'Test Playlist',
        {
          validateUrls: false, // Skip validation pour test rapide
          chunkSize: 500,
          maxChannels: 25000,
          enableCache: true,
          parserMode: 'ultra'
        }
      );
      
      // Progression parsing
      updateLoading({ progress: 70, subtitle: 'Analyse des chaînes...' });
      await new Promise(resolve => setTimeout(resolve, 400));
      
      console.log('✅ Import IPTV SUCCESS:', {
        totalChannels: result.playlist.channels.length,
        parseTime: result.stats?.parseTime,
        categories: result.stats?.categories?.length,
        success: result.success
      });
      
      // 💾 Sauvegarde de la playlist dans AsyncStorage pour ProfilesModal
      console.log('💾 Sauvegarde de la playlist...');
      updateLoading({ progress: 90, subtitle: 'Sauvegarde...' });
      await new Promise(resolve => setTimeout(resolve, 200));
      
      try {
        // Importer AsyncStorage
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        
        // Créer l'objet playlist pour ProfilesModal
        const playlistForProfiles = {
          id: result.playlist.id,
          name: source.name || 'Playlist M3U',
          type: 'M3U' as const,
          url: source.source || source.url,
          dateAdded: new Date().toISOString(),
          channelsCount: result.playlist.channels.length,
          status: 'active' as const
        };
        
        // Récupérer les playlists existantes
        const existingPlaylists = await AsyncStorage.getItem('saved_m3u_playlists');
        const playlists = existingPlaylists ? JSON.parse(existingPlaylists) : [];
        
        // Ajouter la nouvelle playlist
        playlists.push(playlistForProfiles);
        
        // Sauvegarder
        await AsyncStorage.setItem('saved_m3u_playlists', JSON.stringify(playlists));
        console.log('💾 Playlist sauvegardée:', playlistForProfiles.name, `(${playlistForProfiles.channelsCount} chaînes)`);
        
        // Définir comme playlist active
        setSelectedPlaylistId(result.playlist.id);
        
      } catch (saveError) {
        console.error('❌ Erreur sauvegarde playlist:', saveError);
      }
      
      // 🎯 FINALISATION - CACHER LOADING ET AFFICHER NOTIFICATION SUCCESS
      updateLoading({ progress: 100, subtitle: 'Terminé!' });
      await new Promise(resolve => setTimeout(resolve, 300));
      hideLoading();
      
      // 🎉 NOTIFICATION SUCCESS POPUP
      showNotification(
        `Playlist ajoutée ! ${result.playlist.channels.length} chaînes importées`,
        'success',
        4000
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
        5000
      );
      
      Alert.alert(
        '❌ Erreur Services IPTV', 
        `Erreur: ${error.message || 'Inconnue'}\n\nStack: ${error.stack?.substring(0, 200) || 'N/A'}`
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
    
    console.log(`🎬 Animation calculée: ${channelCount} chaînes → ${totalDuration}ms`);
    
    // Afficher l'animation de chargement
    showLoading(
      `Connexion à "${playlist.name}"`, 
      `Préparation de ${channelCount} chaînes...`, 
      0
    );
    
    // Animation progressive de connexion
    const connectionSteps = [
      { progress: 10, subtitle: '🔍 Lecture de la playlist...' },
      { progress: 25, subtitle: '🔗 Connexion au serveur...' },
      { progress: 45, subtitle: `📺 Chargement de ${channelCount} chaînes...` },
      { progress: 65, subtitle: '📂 Organisation par catégories...' },
      { progress: 80, subtitle: '⚙️ Configuration des paramètres...' },
      { progress: 95, subtitle: '✅ Finalisation de la connexion...' },
      { progress: 100, subtitle: '🎉 Playlist connectée avec succès !' }
    ];
    
    for (let i = 0; i < connectionSteps.length; i++) {
      const step = connectionSteps[i];
      await new Promise(resolve => setTimeout(resolve, stepDuration));
      
      updateLoading({ 
        progress: step.progress, 
        subtitle: step.subtitle 
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
    
    // Activer la playlist
    setSelectedPlaylistId(playlist.id);
    
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

  return (
    <LinearGradient 
      colors={['#253a58', '#2d4663', '#405E87', '#E67E22']} 
      locations={[0, 0.3, 0.65, 1]}
      start={{ x: 0, y: 0 }} 
      end={{ x: 1, y: 1 }} 
      style={styles.container}
    >
      {/* Mode immersif géré par MainActivity.java */}
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}><Icon name="tv" size={24} color="#FFFFFF" /></View>
            <Text style={styles.logoText}>IPTV SMARTERS</Text>
          </View>
          <Text style={styles.timeText}>
            {currentTime.toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'long', year: 'numeric', weekday: 'short' })}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => {
              console.log('🔍 RECHERCHE PRINCIPALE!');
              Alert.alert('DEBUG', '🔍 RECHERCHE CLIQUÉ!');
            }}
          >
            <Icon name="search" size={24} color="#FFFFFF" />
            <Text style={styles.headerButtonText}>Main Recherche</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerIconButton}
            onPress={() => {
              console.log('📥 TÉLÉCHARGEMENTS!');
              Alert.alert('DEBUG', '📥 TÉLÉCHARGEMENTS CLIQUÉ!');
            }}
          >
            <Icon name="download" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerIconButton}
            onPress={() => {
              console.log('🔔 NOTIFICATIONS!');
              Alert.alert('DEBUG', '🔔 NOTIFICATIONS CLIQUÉ!');
            }}
          >
            <Icon name="notifications" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerIconButton}
            onPress={() => {
              console.log('🔥 BOUTON CONNEXION!');
              setShowConnectionModal(true);
            }}
          >
            <Icon name="person" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerIconButton}
            onPress={() => {
              console.log('📺 CAST/CHROMECAST!');
              Alert.alert('DEBUG', 'CAST CLIQUÉ!');
            }}
          >
            <Icon name="cast" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerIconButton}
            onPress={() => {
              console.log('⚙️ PARAMÈTRES!');
              Alert.alert('DEBUG', 'PARAMÈTRES CLIQUÉ!');
            }}
          >
            <Icon name="settings" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerIconButton}
            onPress={() => {
              console.log('🚪 DÉCONNEXION!');
              Alert.alert('DEBUG', 'DÉCONNEXION CLIQUÉ!');
            }}
          >
            <Icon name="logout" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.mainCardsSection}>
          
          <View style={styles.leftColumn}>
            <View style={{ flex: 1 }}>
              <TouchableOpacity 
                style={styles.cardTV}
                onPress={handleTVCardPress}
                activeOpacity={0.8}
              >
                <BlurView 
                  style={styles.absoluteFill} 
                  blurType="light" 
                  blurAmount={15} 
                  reducedTransparencyFallbackColor="rgba(255,255,255,0.15)"
                  pointerEvents="none"
                />
                <LinearGradient 
                  colors={['rgba(28, 138, 208, 0.7)', 'rgba(20, 100, 160, 0.5)', 'rgba(15, 76, 117, 0.8)']} 
                  locations={[0, 0.5, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.absoluteFill}
                  pointerEvents="none"
                />
                <LinearGradient
                  colors={['rgba(50, 120, 255, 0.3)', 'rgba(30, 90, 200, 0.15)', 'transparent']}
                  locations={[0, 0.6, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.absoluteFill}
                  pointerEvents="none"
                />
                <LinearGradient 
                  colors={['rgba(255, 255, 255, 0.6)', 'rgba(255, 255, 255, 0.2)', 'transparent']} 
                  locations={[0, 0.2, 1]}
                  style={styles.premiumReflectionEffect}
                  pointerEvents="none"
                />
                <View style={styles.cardContent} pointerEvents="box-none">
                  <View style={styles.premiumIconWrapper}>
                    <Image source={iconMap.tv} style={styles.iconImageLg} />
                  </View>
                  <Text style={styles.modernTvTitle}>TV EN DIRECT</Text>
                  <Text style={styles.modernSubtitle}>Streaming Live</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.rightColumn}>
            <View style={styles.topRow}>
              <View style={{ flex: 1 }}>
                <TouchableOpacity 
                  style={styles.cardFilms}
                  onPress={() => {
                    console.log('🎬 Films CLICKED! - NAVIGATION FUTURE');
                  }}
                  activeOpacity={0.8}
                >
                  <BlurView 
                    style={styles.absoluteFill} 
                    blurType="light" 
                    blurAmount={15} 
                    reducedTransparencyFallbackColor="rgba(255,255,255,0.15)"
                    pointerEvents="none"
                  />
                  <LinearGradient 
                    colors={['rgba(241, 106, 32, 0.7)', 'rgba(230, 81, 0, 0.5)', 'rgba(200, 60, 0, 0.8)']} 
                    locations={[0, 0.5, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.absoluteFill}
                    pointerEvents="none"
                  />
                  <LinearGradient
                    colors={['rgba(240, 55, 55, 0.3)', 'rgba(170, 30, 30, 0.15)', 'transparent']}
                    locations={[0, 0.6, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.absoluteFill}
                    pointerEvents="none"
                  />
                  <LinearGradient 
                    colors={['rgba(255, 255, 255, 0.6)', 'rgba(255, 255, 255, 0.2)', 'transparent']} 
                    locations={[0, 0.2, 1]}
                    style={styles.premiumReflectionEffect}
                    pointerEvents="none"
                  />
                  <View style={styles.cardContent} pointerEvents="box-none">
                    <View style={styles.premiumIconWrapperFilms}>
                      <Image source={iconMap.films} style={styles.iconImageMd} />
                    </View>
                    <Text style={styles.modernCardTitle}>FILMS</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={{ flex: 1 }}>
                <TouchableOpacity 
                  style={styles.cardSeries}
                  onPress={() => {
                    console.log('📺 Series CLICKED! - NAVIGATION FUTURE');
                  }}
                  activeOpacity={0.8}
                >
                  <BlurView 
                    style={styles.absoluteFill} 
                    blurType="light" 
                    blurAmount={15} 
                    reducedTransparencyFallbackColor="rgba(255,255,255,0.15)"
                    pointerEvents="none"
                  />
                  <LinearGradient 
                    colors={['rgba(130, 100, 160, 0.7)', 'rgba(110, 85, 140, 0.5)', 'rgba(95, 70, 125, 0.8)']} 
                    locations={[0, 0.5, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.absoluteFill}
                    pointerEvents="none"
                  />
                  <LinearGradient
                    colors={['rgba(160, 90, 255, 0.7)', 'rgba(120, 60, 200, 0.5)', 'transparent']}
                    locations={[0, 0.6, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.absoluteFill}
                    pointerEvents="none"
                  />
                  <LinearGradient 
                    colors={['rgba(255, 255, 255, 0.6)', 'rgba(255, 255, 255, 0.2)', 'transparent']} 
                    locations={[0, 0.2, 1]}
                    style={styles.premiumReflectionEffect}
                    pointerEvents="none"
                  />
                  <View style={styles.cardContent} pointerEvents="box-none">
                    <View style={styles.premiumIconWrapperSeries}>
                      <Image source={iconMap.series} style={styles.iconImageMd} />
                    </View>
                    <Text style={styles.modernCardTitle}>SERIES</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.bottomRow}>
              {bottomRowCards.map(card => (
                <View key={card.key} style={{ flex: 1 }}>
                  <TouchableOpacity 
                    style={[styles.cardBottom, styles.liquidGlassCard]}
                    onPress={() => {
                      console.log(`${card.title} CLICKED! - NAVIGATION FUTURE`);
                    }}
                    activeOpacity={0.8}
                  >
                    <BlurView 
                      style={styles.absoluteFill} 
                      blurType="light" 
                      blurAmount={8} 
                      reducedTransparencyFallbackColor="rgba(255,255,255,0.18)"
                      pointerEvents="none"
                    />
                    <LinearGradient
                      colors={['rgba(65, 85, 75, 0.7)', 'rgba(55, 70, 60, 0.5)', 'rgba(45, 60, 50, 0.8)']}
                      locations={[0, 0.5, 1]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.absoluteFill}
                      pointerEvents="none"
                    />
                    <View style={styles.cardContent} pointerEvents="box-none">
                      <View style={[styles.iconWrapper, styles.liquidGlassIconWrapper]}>
                        <Image source={iconMap[card.key as keyof typeof iconMap]} style={[styles.iconImageSm, styles.liquidGlassIcon]} />
                      </View>
                      <Text style={styles.modernSmallTitle}>{card.title}</Text>
                      <Text style={styles.modernSmallSubtitle}>{card.subtitle}</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Video Player Modal */}
      <Modal
        visible={showVideoPlayer}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent={true}
        onShow={() => console.log('📺 Modal is now visible')}
        onDismiss={() => console.log('📺 Modal dismissed')}
      >
        <View style={styles.playerContainer}>
          <View style={styles.playerHeader}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={handleClosePlayer}
            >
              <Icon name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          <VideoPlayer 
            channel={currentChannel}
            isVisible={showVideoPlayer}
            onError={(error) => console.log('Video error:', error)}
          />
        </View>
      </Modal>

      {/* Connection Modal */}
      <ConnectionModal
        visible={showConnectionModal}
        onClose={() => setShowConnectionModal(false)}
        onXtreamConnect={handleXtreamConnect}
        onM3UConnect={handleM3UConnect}
        onUsersList={handleUsersList}
      />

      {/* Xtream Codes Modal */}
      <XtreamCodeModal
        visible={showXtreamModal}
        onClose={handleXtreamClose}
        onConnect={handleXtreamConnection}
      />

      {/* M3U URL Modal */}
      <M3UUrlModal
        visible={showM3UModal}
        onClose={handleM3UClose}
        onConnect={handleM3UConnection}
      />

      {/* Profiles Modal */}
      <ProfilesModal
        visible={showProfilesModal}
        onClose={handleProfilesClose}
        onPlaylistSelect={handlePlaylistSelect}
        onAddPlaylist={handleAddPlaylist}
        selectedPlaylistId={selectedPlaylistId}
      />

      {/* 🧪 Bouton de test du système DI (Mode développement) */}
      <TouchableOpacity
        style={styles.serviceTestButton}
        onPress={() => setShowServiceTest(!showServiceTest)}
      >
        <Text style={styles.serviceTestText}>🏗️ DI</Text>
      </TouchableOpacity>

      {/* Bannières de version supprimées pour production */}

      {/* 🧪 Composant de test des services */}
      <ServiceTest visible={showServiceTest} />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8, backgroundColor: 'transparent', zIndex: 10 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  logoContainer: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  logoIcon: { width: 32, height: 32, backgroundColor: 'rgba(74, 144, 226, 0.5)', borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  logoText: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  timeText: { fontSize: 14, color: '#B0BEC5' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 12 },
  headerButtonText: { color: '#FFFFFF', fontSize: 14, marginLeft: 8 },
  headerIconButton: { padding: 8, marginLeft: 4 },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  mainCardsSection: { flexDirection: 'row', flex: 1, gap: 16 },
  leftColumn: { flex: 0.8 },
  rightColumn: { flex: 1.1, flexDirection: 'column', gap: 12 },
  topRow: { flexDirection: 'row', flex: 0.65, gap: 12 },
  bottomRow: { flexDirection: 'row', flex: 0.35, gap: 10 },

  // Cards refactorisées - TouchableOpacity Standard
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
    shadowOffset: { width: 0, height: 16 },
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
    shadowOffset: { width: 0, height: 16 },
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
    shadowOffset: { width: 0, height: 16 },
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
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.6,
    shadowRadius: 35,
    elevation: 30,
  },
  reflectionEffect: { position: 'absolute', top: 0, left: 0, right: 0, height: '50%' },
  premiumReflectionEffect: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    height: '40%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  cardContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 8 },
  // TouchableOverlay supprimé - fusionné dans les cartes

  iconWrapper: {
    marginBottom: 8,
  },
  premiumIconWrapper: {
    marginBottom: 8,
    shadowColor: '#4A9EFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1.0,
    shadowRadius: 16,
    elevation: 12,
  },
  premiumIconWrapperFilms: {
    marginBottom: 8,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1.0,
    shadowRadius: 16,
    elevation: 12,
  },
  premiumIconWrapperSeries: {
    marginBottom: 8,
    shadowColor: '#826AA0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1.0,
    shadowRadius: 16,
    elevation: 12,
  },
  iconImageLg: { width: 95, height: 95, resizeMode: 'contain' },
  iconImageMd: { width: 75, height: 75, resizeMode: 'contain' },
  iconImageSm: { width: 45, height: 45, resizeMode: 'contain' },

  // Liquid Glass Styles
  liquidGlassCard: {
    backgroundColor: 'rgba(65, 85, 75, 0.6)',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#2D3D32',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.9,
    shadowRadius: 30,
    elevation: 28,
    borderWidth: 2,
    borderColor: 'rgba(65, 85, 75, 0.7)',
  },
  liquidGlassIconWrapper: {
    shadowColor: '#2D3D32',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1.0,
    shadowRadius: 18,
    elevation: 15,
  },
  liquidGlassIcon: {
    opacity: 1.0,
    tintColor: 'rgba(255, 255, 255, 1.0)',
  },

  modernTvTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  modernSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', textAlign: 'center', fontWeight: '500' },
  modernCardTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  modernSmallTitle: { fontSize: 10, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  modernSmallSubtitle: { fontSize: 9, color: 'rgba(255,255,255,0.7)', textAlign: 'center', fontWeight: '500' },

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
  
  // 🧪 Styles pour le test DI (développement)
  serviceTestButton: {
    position: 'absolute',
    top: 120,
    right: 10,
    width: 50,
    height: 30,
    backgroundColor: 'rgba(33, 150, 243, 0.8)',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },
  serviceTestText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
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
    shadowOffset: { width: 0, height: 4 },
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