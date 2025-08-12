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
import type { Channel } from './src/types';
import type { SimpleRootStackParamList } from './AppWithNavigation';
import { useApp } from './src/context/AppContext';

// Import des nouveaux services migrés
import IPTVService from './src/services/IPTVService';

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
  const { showLoading, updateLoading, hideLoading, showNotification } = useApp();
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showXtreamModal, setShowXtreamModal] = useState(false);
  const [showM3UModal, setShowM3UModal] = useState(false);
  const [showProfilesModal, setShowProfilesModal] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | undefined>();
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
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    
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
    
    testServices();
    
    return () => clearInterval(timeInterval);
  }, []);

  // Animations supprimées pour assurer clics fonctionnels

  const handleTVCardPress = () => {
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
    Alert.alert(
      '📺 TV En Direct',
      'Navigation vers les chaînes TV en direct à implémenter.',
      [{ text: 'OK' }]
    );
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
          maxChannels: 2000,
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
});

export default App;
