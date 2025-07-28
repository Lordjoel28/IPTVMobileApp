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
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { BlurView } from '@react-native-community/blur';
import VideoPlayer from './src/components/VideoPlayer';
import type { Channel } from './src/types';

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

const App: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardsScale = useRef([...Array(6)].map(() => new Animated.Value(1))).current;

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
    return () => clearInterval(timeInterval);
  }, []);

  const createPressAnimation = (index: number) => ({
    onPressIn: () => Animated.spring(cardsScale[index], { toValue: 0.98, useNativeDriver: true, tension: 200, friction: 7 }).start(),
    onPressOut: () => Animated.spring(cardsScale[index], { toValue: 1, useNativeDriver: true, tension: 200, friction: 7 }).start(),
  });

  const handleTVCardPress = () => {
    console.log('🎬 TV Card Pressed! - TEMPORARILY DISABLED');
    console.log('✅ Perfect design restored! VideoPlayer will be added next');
    // VideoPlayer functionality temporarily disabled to avoid RCTVideo error
    return;
  };

  const handleClosePlayer = () => {
    console.log('❌ Closing Video Player');
    setShowVideoPlayer(false);
    setCurrentChannel(null);
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
          <TouchableOpacity style={styles.headerButton}><Icon name="search" size={24} color="#FFFFFF" /><Text style={styles.headerButtonText}>Main Recherche</Text></TouchableOpacity>
          <TouchableOpacity style={styles.headerIconButton}><Icon name="download" size={24} color="#FFFFFF" /></TouchableOpacity>
          <TouchableOpacity style={styles.headerIconButton}><Icon name="notifications" size={24} color="#FFFFFF" /></TouchableOpacity>
          <TouchableOpacity style={styles.headerIconButton}><Icon name="person" size={24} color="#FFFFFF" /></TouchableOpacity>
          <TouchableOpacity style={styles.headerIconButton}><Icon name="cast" size={24} color="#FFFFFF" /></TouchableOpacity>
          <TouchableOpacity style={styles.headerIconButton}><Icon name="settings" size={24} color="#FFFFFF" /></TouchableOpacity>
          <TouchableOpacity style={styles.headerIconButton}><Icon name="logout" size={24} color="#FFFFFF" /></TouchableOpacity>
        </View>
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.mainCardsSection}>
          
          <View style={styles.leftColumn}>
            <Animated.View style={[{ flex: 1, transform: [{ scale: cardsScale[0] }] }]}>
              <TouchableOpacity 
                style={styles.cardBase} 
                {...createPressAnimation(0)}
                onPress={() => {
                  console.log('🎬 TV Card CLICKED!');
                  handleTVCardPress();
                }}
              >
                <BlurView style={styles.absoluteFill} blurType="light" blurAmount={15} reducedTransparencyFallbackColor="rgba(255,255,255,0.15)" />
                <LinearGradient 
                  colors={['rgba(28, 138, 208, 0.7)', 'rgba(20, 100, 160, 0.5)', 'rgba(15, 76, 117, 0.8)']} 
                  locations={[0, 0.5, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.absoluteFill} 
                />
                <LinearGradient
                  colors={['rgba(50, 120, 255, 0.3)', 'rgba(30, 90, 200, 0.15)', 'transparent']}
                  locations={[0, 0.6, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.absoluteFill}
                />
                <LinearGradient 
                  colors={['rgba(255, 255, 255, 0.6)', 'rgba(255, 255, 255, 0.2)', 'transparent']} 
                  locations={[0, 0.2, 1]}
                  style={styles.premiumReflectionEffect} 
                />
                <View style={styles.cardContent}>
                  <View style={styles.premiumIconWrapper}>
                    <Image source={iconMap.tv} style={styles.iconImageLg} />
                  </View>
                  <Text style={styles.modernTvTitle}>TV EN DIRECT</Text>
                  <Text style={styles.modernSubtitle}>Streaming Live</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>

          <View style={styles.rightColumn}>
            <View style={styles.topRow}>
              <Animated.View style={[{ flex: 1, transform: [{ scale: cardsScale[1] }] }]}>
                <TouchableOpacity style={styles.cardBase} {...createPressAnimation(1)}>
                  <BlurView style={styles.absoluteFill} blurType="light" blurAmount={15} reducedTransparencyFallbackColor="rgba(255,255,255,0.15)" />
                  <LinearGradient 
                    colors={['rgba(241, 106, 32, 0.7)', 'rgba(230, 81, 0, 0.5)', 'rgba(200, 60, 0, 0.8)']} 
                    locations={[0, 0.5, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.absoluteFill} 
                  />
                  <LinearGradient
                    colors={['rgba(240, 55, 55, 0.3)', 'rgba(170, 30, 30, 0.15)', 'transparent']}
                    locations={[0, 0.6, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.absoluteFill}
                  />
                  <LinearGradient 
                  colors={['rgba(255, 255, 255, 0.6)', 'rgba(255, 255, 255, 0.2)', 'transparent']} 
                  locations={[0, 0.2, 1]}
                  style={styles.premiumReflectionEffect} 
                />
                  <View style={styles.cardContent}>
                    <View style={styles.premiumIconWrapperFilms}>
                      <Image source={iconMap.films} style={styles.iconImageMd} />
                    </View>
                    <Text style={styles.modernCardTitle}>FILMS</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View style={[{ flex: 1, transform: [{ scale: cardsScale[2] }] }]}>
                <TouchableOpacity style={styles.cardBase} {...createPressAnimation(2)}>
                  <BlurView style={styles.absoluteFill} blurType="light" blurAmount={15} reducedTransparencyFallbackColor="rgba(255,255,255,0.15)" />
                  <LinearGradient 
                    colors={['rgba(130, 100, 160, 0.7)', 'rgba(110, 85, 140, 0.5)', 'rgba(95, 70, 125, 0.8)']} 
                    locations={[0, 0.5, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.absoluteFill} 
                  />
                  <LinearGradient
                    colors={['rgba(160, 90, 255, 0.7)', 'rgba(120, 60, 200, 0.5)', 'transparent']}
                    locations={[0, 0.6, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.absoluteFill}
                  />
                  <LinearGradient 
                  colors={['rgba(255, 255, 255, 0.6)', 'rgba(255, 255, 255, 0.2)', 'transparent']} 
                  locations={[0, 0.2, 1]}
                  style={styles.premiumReflectionEffect} 
                />
                  <View style={styles.cardContent}>
                    <View style={styles.premiumIconWrapperSeries}>
                      <Image source={iconMap.series} style={styles.iconImageMd} />
                    </View>
                    <Text style={styles.modernCardTitle}>SERIES</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </View>

            <View style={styles.bottomRow}>
              {bottomRowCards.map(card => (
                <Animated.View key={card.key} style={[{ flex: 1, transform: [{ scale: cardsScale[card.index] }] }]}>
                  <TouchableOpacity style={[styles.cardBaseSmall, styles.liquidGlassCard]} {...createPressAnimation(card.index)}>
                    <BlurView 
                      style={styles.absoluteFill} 
                      blurType="light" 
                      blurAmount={8} 
                      reducedTransparencyFallbackColor="rgba(255,255,255,0.18)"
                    />
                    <LinearGradient
                      colors={['rgba(65, 85, 75, 0.7)', 'rgba(55, 70, 60, 0.5)', 'rgba(45, 60, 50, 0.8)']}
                      locations={[0, 0.5, 1]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.absoluteFill}
                    />
                    <View style={styles.cardContent}>
                      <View style={[styles.iconWrapper, styles.liquidGlassIconWrapper]}>
                        <Image source={iconMap[card.key]} style={[styles.iconImageSm, styles.liquidGlassIcon]} />
                      </View>
                      <Text style={styles.modernSmallTitle}>{card.title}</Text>
                      <Text style={styles.modernSmallSubtitle}>{card.subtitle}</Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          </View>
        </View>
      </Animated.View>

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
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8, backgroundColor: 'transparent' },
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

  cardBase: { 
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
  cardBaseSmall: { 
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

export default App;
