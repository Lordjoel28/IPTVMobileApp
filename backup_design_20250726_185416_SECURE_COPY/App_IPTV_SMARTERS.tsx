/**
 * 🎬 IPTV Smarters Pro Interface - Code Gemini Complet
 * Implémentation avec catalogue d'icônes et structure optimisée
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Animated,
  ScrollView,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { BlurView } from '@react-native-community/blur';

// --- Catalogue des nouvelles icônes ---
// On dit à l'application où trouver chaque image.
const iconMap = {
  tv: require('./assets/icons/icon_tv.png'),
  films: require('./assets/icons/icon_films.png'),
  series: require('./assets/icons/icon_series.png'),
  epg: require('./assets/icons/icon_epg.png'),
  multi: require('./assets/icons/icon_multi.png'),
  replay: require('./assets/icons/icon_replay.png'),
  download: require('./assets/icons/icon_download.png'),
};

const { width, height } = Dimensions.get('window');

const App: React.FC = () => {
  // LOG POUR CONFIRMER LE CHARGEMENT
  console.log('🎬 APP_IPTV_SMARTERS GEMINI VERSION LOADED');
  
  // États pour l'horloge dynamique et données conditionnelles
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Animations pour les cartes
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardsScale = useRef([...Array(6)].map(() => new Animated.Value(1))).current;

  useEffect(() => {
    // Animation d'entrée
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Horloge temps réel
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timeInterval);
  }, []);

  const createPressAnimation = (index: number) => ({
    onPressIn: () => {
      console.log(`CARD PRESSED: ${index}`);
      Animated.spring(cardsScale[index], {
        toValue: 0.98,
        useNativeDriver: true,
        tension: 200,
        friction: 7,
      }).start();
    },
    onPressOut: () => {
      console.log(`CARD RELEASED: ${index}`);
      Animated.spring(cardsScale[index], {
        toValue: 1,
        useNativeDriver: true,
        tension: 200,
        friction: 7,
      }).start();
    },
  });

  const handleCardPress = (cardName: string, index: number) => {
    console.log(`🎬 CARD CLICKED: ${cardName} (${index})`);
    // TODO: Add navigation logic here
  };

  // Configuration des couleurs pour chaque carte
  const cardColors = {
    tv: ['rgba(255, 210, 78, 0.2)', 'rgba(255, 160, 50, 0.1)'],
    films: ['rgba(255, 78, 78, 0.25)', 'rgba(255, 170, 170, 0.1)'],
    series: ['rgba(78, 175, 255, 0.2)', 'rgba(170, 235, 255, 0.1)'],
    epg: ['rgba(78, 255, 161, 0.2)', 'rgba(120, 255, 200, 0.1)'],
    multi: ['rgba(192, 78, 255, 0.2)', 'rgba(220, 160, 255, 0.1)'],
    replay: ['rgba(255, 150, 78, 0.2)', 'rgba(255, 200, 150, 0.1)'],
  };

  // Configuration des cartes de la rangée du bas
  const bottomRowCards = [
    { key: 'epg', title: 'LIVE EPG', subtitle: 'Guide TV', index: 3 },
    { key: 'multi', title: 'MULTI-ÉCR', subtitle: 'Écrans', index: 4 },
    { key: 'replay', title: 'RATTRAPER', subtitle: 'Replay', index: 5 },
  ];

  return (
    <LinearGradient
      colors={['#1A1F36', '#2C3E50']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Header exact comme capture 7 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Icon name="tv" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.logoText}>IPTV SMARTERS</Text>
          </View>
          <Text style={styles.timeText}>
            {currentTime.toLocaleString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              weekday: 'short'
            })}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerButton}>
            <Icon name="search" size={24} color="#FFFFFF" />
            <Text style={styles.headerButtonText}>Main Recherche</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconButton}>
            <Icon name="download" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconButton}>
            <Icon name="notifications" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconButton}>
            <Icon name="person" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconButton}>
            <Icon name="cast" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconButton}>
            <Icon name="settings" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconButton}>
            <Icon name="logout" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.mainCardsSection}>
          
          {/* Colonne gauche - TV EN DIRECT */}
          <View style={styles.leftColumn}>
            <Animated.View style={[{ flex: 1, transform: [{ scale: cardsScale[0] }] }]}>
              <TouchableOpacity 
                style={styles.cardBase}
                activeOpacity={0.8}
                onPress={() => handleCardPress('TV EN DIRECT', 0)}
                {...createPressAnimation(0)}
              >
                <BlurView style={styles.absoluteFill} blurType="dark" blurAmount={15} />
                <LinearGradient colors={cardColors.tv} style={styles.absoluteFill} />
                <LinearGradient 
                  colors={['rgba(255, 255, 255, 0.15)', 'transparent']} 
                  style={styles.glassReflection} 
                />
                <View style={styles.cardContent}>
                  <View style={[styles.iconWrapperBase, styles.iconWrapperTv]}>
                    <Image source={iconMap.tv} style={styles.iconImageLg} />
                  </View>
                  <Text style={styles.modernTvTitle}>TV EN DIRECT</Text>
                  <Text style={styles.modernSubtitle}>Streaming Live</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Colonne droite */}
          <View style={styles.rightColumn}>
            
            {/* Rangée 1 - FILMS et SERIES */}
            <View style={styles.topRow}>
              
              {/* FILMS */}
              <Animated.View style={[{ flex: 1, transform: [{ scale: cardsScale[1] }] }]}>
                <TouchableOpacity 
                  style={styles.cardBase}
                  activeOpacity={0.8}
                  onPress={() => handleCardPress('FILMS', 1)}
                  {...createPressAnimation(1)}
                >
                  <BlurView style={styles.absoluteFill} blurType="dark" blurAmount={15} />
                  <LinearGradient colors={cardColors.films} style={styles.absoluteFill} />
                  <LinearGradient 
                    colors={['rgba(255, 255, 255, 0.15)', 'transparent']} 
                    style={styles.glassReflection} 
                  />
                  <View style={styles.cardContent}>
                    <View style={[styles.iconWrapperBase, styles.iconWrapperFilms]}>
                      <Image source={iconMap.films} style={styles.iconImageMd} />
                    </View>
                    <Text style={styles.modernCardTitle}>FILMS</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>

              {/* SERIES */}
              <Animated.View style={[{ flex: 1, transform: [{ scale: cardsScale[2] }] }]}>
                <TouchableOpacity 
                  style={styles.cardBase}
                  activeOpacity={0.8}
                  onPress={() => handleCardPress('SERIES', 2)}
                  {...createPressAnimation(2)}
                >
                  <BlurView style={styles.absoluteFill} blurType="dark" blurAmount={15} />
                  <LinearGradient colors={cardColors.series} style={styles.absoluteFill} />
                  <LinearGradient 
                    colors={['rgba(255, 255, 255, 0.15)', 'transparent']} 
                    style={styles.glassReflection} 
                  />
                  <View style={styles.cardContent}>
                    <View style={[styles.iconWrapperBase, styles.iconWrapperSeries]}>
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
                  <TouchableOpacity style={styles.cardBaseSmall} {...createPressAnimation(card.index)}>
                    <BlurView style={styles.absoluteFill} blurType="dark" blurAmount={15} />
                    <LinearGradient colors={cardColors[card.key]} style={styles.absoluteFill} />
                    <LinearGradient colors={['rgba(255, 255, 255, 0.15)', 'transparent']} style={styles.glassReflection} />
                    <View style={styles.cardContent}>
                      <View style={styles[`iconWrapper${card.key.charAt(0).toUpperCase() + card.key.slice(1)}`]}>
                        <Image source={iconMap[card.key]} style={styles.iconImageSm} />
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
      {/* Le Footer a été supprimé comme demandé */}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 40, paddingBottom: 8, backgroundColor: 'transparent' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  logoContainer: { flexDirection: 'row', alignItems: 'center', marginRight: 32 },
  logoIcon: { width: 32, height: 32, backgroundColor: '#4A90E2', borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  logoText: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  timeText: { fontSize: 14, color: '#B0BEC5' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 12 },
  headerButtonText: { color: '#FFFFFF', fontSize: 14, marginLeft: 8 },
  headerIconButton: { padding: 8, marginLeft: 8 },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  mainCardsSection: { flexDirection: 'row', flex: 1, gap: 12 },
  leftColumn: { flex: 0.85 },
  rightColumn: { flex: 1.1, flexDirection: 'column', gap: 10 },
  topRow: { flexDirection: 'row', flex: 0.7, gap: 10 },
  bottomRow: { flexDirection: 'row', flex: 0.3, gap: 8 },

  cardBase: { flex: 1, borderRadius: 24, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  cardBaseSmall: { flex: 1, borderRadius: 20, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  glassReflection: { position: 'absolute', top: 0, left: 0, right: 0, height: '60%' },
  cardContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 12 },

  iconWrapperBase: { shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.8, shadowRadius: 15, marginBottom: 10 },
  iconWrapperTv: { shadowColor: 'rgba(255, 210, 78, 0.5)', marginBottom: 15 },
  iconWrapperFilms: { shadowColor: 'rgba(255, 78, 78, 0.6)', marginBottom: 15 },
  iconWrapperSeries: { shadowColor: 'rgba(78, 175, 255, 0.6)', marginBottom: 15 },
  iconWrapperEpg: { shadowColor: 'rgba(78, 255, 161, 0.5)' },
  iconWrapperMulti: { shadowColor: 'rgba(192, 78, 255, 0.5)' },
  iconWrapperReplay: { shadowColor: 'rgba(255, 150, 78, 0.5)' },

  iconImageLg: { width: 90, height: 90, resizeMode: 'contain' },
  iconImageMd: { width: 70, height: 70, resizeMode: 'contain' },
  iconImageSm: { width: 40, height: 40, resizeMode: 'contain' },

  modernTvTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  modernSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', textAlign: 'center', fontWeight: '500' },
  modernCardTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  modernSmallTitle: { fontSize: 11, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  modernSmallSubtitle: { fontSize: 9, color: 'rgba(255,255,255,0.7)', textAlign: 'center', fontWeight: '500' },
});

export default App;