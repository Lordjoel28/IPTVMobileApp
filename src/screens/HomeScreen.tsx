/**
 * 🏠 IPTV Mobile App - Écran d'Accueil
 * Wrapper pour App_IPTV_SMARTERS avec navigation React Navigation
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
import VideoPlayer from '../components/VideoPlayer';
import ConnectionModal from '../components/ConnectionModal';
import XtreamCodeModal from '../components/XtreamCodeModal';
import M3UUrlModal from '../components/M3UUrlModal';
import type { Channel } from '../types';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../types';

// Import du service IPTV
import IPTVService from '../services/IPTVService';

// Type pour navigation
type NavigationProp = StackNavigationProp<RootStackParamList>;

// --- Catalogue des icônes PNG ---
const iconMap = {
  tv: require('../../assets/icons/icon_tv.png'),
  films: require('../../assets/icons/icon_films.png'),
  series: require('../../assets/icons/icon_series.png'),
  epg: require('../../assets/icons/icon_epg.png'),
  multi: require('../../assets/icons/icon_multi.png'),
  replay: require('../../assets/icons/icon_replay.png'),
};

// --- Configuration des couleurs --- 
const cardColors = {
  tv: ['#00CCFF', '#0080FF', '#004080', '#001540'],
  films: ['#FF6B35', '#FF3333', '#B71C1C', '#4A0E0E'],
  series: ['#00E5AA', '#00B388', '#00695C', '#003D35'],
  bottom: ['#4A5D4A', '#3E4E3E', '#2D3A2D', '#1F2A1F'],
};

const bottomRowCards = [
  { key: 'epg', title: 'LIVE EPG', subtitle: 'Guide TV', index: 3 },
  { key: 'multi', title: 'MULTI-ÉCR', subtitle: 'Écrans', index: 4 },
  { key: 'replay', title: 'RATTRAPER', subtitle: 'Replay', index: 5 },
];

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showXtreamModal, setShowXtreamModal] = useState(false);
  const [showM3UModal, setShowM3UModal] = useState(false);
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

  const handleTVCardPress = () => {
    console.log('🎬 TV Card Pressed - NAVIGATION DIRECTE!');
    
    // 🧪 DONNÉES MOCK POUR TEST NAVIGATION
    const mockChannels = [
      { id: '1', name: 'TF1 HD', url: 'https://example.com/tf1.m3u8', category: 'Généraliste' },
      { id: '2', name: 'France 2 HD', url: 'https://example.com/france2.m3u8', category: 'Généraliste' },
      { id: '3', name: 'Canal+ Sport', url: 'https://example.com/canal.m3u8', category: 'Sport' },
      { id: '4', name: 'M6 HD', url: 'https://example.com/m6.m3u8', category: 'Généraliste' },
      { id: '5', name: 'Arte HD', url: 'https://example.com/arte.m3u8', category: 'Culture' },
      { id: '6', name: 'BFM TV', url: 'https://example.com/bfm.m3u8', category: 'Actualités' },
      { id: '7', name: 'Eurosport 1', url: 'https://example.com/eurosport.m3u8', category: 'Sport' },
      { id: '8', name: 'Discovery Channel', url: 'https://example.com/discovery.m3u8', category: 'Documentaires' },
    ];
    
    console.log('🎬 NAVIGATION vers ChannelListScreen avec:', {
      channels: mockChannels.length,
      playlistName: '📺 Chaînes TV Test HomeScreen'
    });
    
    // Navigation immédiate sans Alert
    try {
      navigation.navigate('ChannelList', {
        playlistId: 'mock-tv-channels-homescreen',
        playlistName: '📺 Chaînes TV Test HomeScreen',
        channels: mockChannels,
        totalChannels: mockChannels.length
      });
      console.log('✅ Navigation TV HomeScreen réussie!');
    } catch (error) {
      console.error('❌ ERREUR NAVIGATION TV HomeScreen:', error);
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
    console.log('👥 Liste d\'utilisateurs');
    setShowConnectionModal(false);
  };

  // Handler pour la connexion Xtream Codes
  const handleXtreamConnection = async (credentials: any) => {
    console.log('🔐 Connexion Xtream avec:', credentials);
    setShowXtreamModal(false);
  };

  // Handler pour la connexion M3U URL - NAVIGATION VERS CHANNELLIST
  const handleM3UConnection = async (source: any) => {
    console.log('📁 Connexion M3U avec:', source);
    setShowM3UModal(false);
    
    // 🚀 TEST COMPLET DES SERVICES IPTV - UTILISER L'INSTANCE EXISTANTE
    try {
      console.log('🚀 Utilisation des services IPTV...');
      
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
        await iptv.initialize();
        console.log('✅ Service initialisé:', iptv.isReady);
      }
      
      // Test import playlist
      console.log('📥 Import playlist depuis:', source.source || source.url);
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
      
      console.log('✅ Import IPTV SUCCESS:', {
        totalChannels: result.playlist.channels.length,
        parseTime: result.stats?.parseTime,
        categories: result.stats?.categories?.length,
        success: result.success
      });
      
      // Test recherche si on a des chaînes
      if (result.playlist.channels.length > 0) {
        console.log('🔍 Test recherche...');
        const searchResults = await iptv.searchChannels('tf1', {
          fuzzySearch: true,
          maxResults: 5
        });
        console.log(`🔍 Recherche "tf1": ${searchResults.length} résultats`);
      }
      
      // 🎬 NAVIGATION VERS CHANNELLISTSCREEN
      console.log('🎬 Navigation vers ChannelListScreen avec:', {
        channels: result.playlist.channels.length,
        playlistName: source.name || 'Test Playlist'
      });
      
      navigation.navigate('ChannelList', {
        playlistId: result.playlist.id,
        playlistName: source.name || 'Test Playlist',
        channels: result.playlist.channels,
        totalChannels: result.playlist.channels.length
      });
      
    } catch (error) {
      console.error('❌ TEST SERVICES IPTV FAILED:', error);
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
              console.log('🔥 BOUTON CONNEXION!');
              setShowConnectionModal(true);
            }}
          >
            <Icon name="person" size={24} color="#FFFFFF" />
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
                    console.log('🎬 Films CLICKED!');
                    Alert.alert('TEST CARTE', '🎬 FILMS CLIQUÉ! ✅');
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
                    console.log('📺 Series CLICKED!');
                    Alert.alert('TEST CARTE', '📺 SERIES CLIQUÉ! ✅');
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
                      console.log(`${card.title} CLICKED!`);
                      Alert.alert('TEST CARTE', `${card.title} CLIQUÉ! ✅`);
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

export default HomeScreen;