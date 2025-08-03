/**
 * 🎬 IPTV Smarters Pro Interface - Design Moderne v2.0
 * Reproduction exacte avec dégradés stylés et icônes modernes
 * Dernière modification: ${new Date().toISOString()}
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

const { width, height } = Dimensions.get('window');

const App: React.FC = () => {
  // LOG POUR CONFIRMER LE CHARGEMENT
  console.log('🎬 APP_IPTV_SMARTERS LOADED - VERSION MODERNE 2.0');
  
  // États pour l'horloge dynamique et données conditionnelles
  const [currentTime, setCurrentTime] = useState(new Date());
  const [playlistInfo, setPlaylistInfo] = useState({ name: null, expiration: null });
  const [liveTvUpdateTime, setLiveTvUpdateTime] = useState(null);
  const [filmsUpdateTime, setFilmsUpdateTime] = useState(null);

  // Fonction pour formater le temps écoulé
  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'À l\'instant';
    if (diffInMinutes < 60) return `${diffInMinutes} min`;
    const hours = Math.floor(diffInMinutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}j`;
  };
  
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
          
          {/* Section principale - Design moderne avec proportions parfaites */}
          <View style={styles.mainCardsSection}>
          
          {/* Colonne gauche - TV EN DIRECT moderne */}
          <View style={styles.leftColumn}>
            <Animated.View style={[styles.tvDirectContainer, { transform: [{ scale: cardsScale[0] }] }]}>
              <TouchableOpacity 
                style={styles.tvDirectCard}
                activeOpacity={0.8}
                onPress={() => handleCardPress('TV EN DIRECT', 0)}
                {...createPressAnimation(0)}
              >
                {/* 1. L'EFFET DE VERRE DÉPOLI (en fond de carte) */}
                <BlurView
                  style={StyleSheet.absoluteFill}
                  blurType="dark"
                  blurAmount={8}
                  reducedTransparencyFallbackColor="rgba(26, 35, 126, 0.2)"
                />
                
                {/* 2. LA TEINTE DE COULEUR (TV EN DIRECT - jaune/orange) */}
                <LinearGradient
                  colors={['rgba(255, 210, 78, 0.2)', 'rgba(255, 160, 50, 0.1)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                
                {/* 3. L'EFFET DE BRILLANCE (reflet intensifié) */}
                <LinearGradient
                  colors={['rgba(255,255,255,0.25)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.brillanceOverlay}
                />
                
                {/* 4. LE CONTENU (100% OPAQUE ET AU-DESSUS DE TOUT) */}
                <View style={styles.cardContentCenter}>
                    <View style={styles.modernIconContainer}>
                      <View style={styles.iconGlowEffect}>
                        <Image 
                          source={{uri: 'icon_tv'}} 
                          style={styles.cardIconLarge}
                          resizeMode="contain"
                        />
                      </View>
                    </View>
                    <Text style={styles.modernTvTitle}>TV EN DIRECT</Text>
                    <Text style={styles.modernSubtitle}>Streaming Live</Text>
                    
                    {liveTvUpdateTime && (
                      <View style={styles.modernUpdateContainer}>
                        <View style={styles.statusDot} />
                        <Text style={styles.modernUpdateText}>Mise à jour: {formatTimeAgo(liveTvUpdateTime)}</Text>
                        <TouchableOpacity style={styles.modernRefreshButton}>
                          <Icon name="refresh" size={14} color="#000000" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Colonne droite - Layout moderne */}
          <View style={styles.rightColumn}>
            
            {/* Rangée 1 - FILMS et SERIES modernes */}
            <View style={styles.topRow}>
              
              {/* FILMS - Design moderne */}
              <Animated.View style={[styles.filmsContainer, { transform: [{ scale: cardsScale[1] }] }]}>
                <TouchableOpacity 
                  style={styles.modernCard}
                  activeOpacity={0.8}
                  onPress={() => handleCardPress('FILMS', 1)}
                  {...createPressAnimation(1)}
                >
                  {/* 1. L'EFFET DE VERRE DÉPOLI (en fond de carte) */}
                  <BlurView
                    style={StyleSheet.absoluteFill}
                    blurType="dark"
                    blurAmount={6}
                    reducedTransparencyFallbackColor="rgba(230, 81, 0, 0.2)"
                  />
                  
                  {/* 2. LA TEINTE DE COULEUR (FILMS - rouge/rose) */}
                  <LinearGradient
                    colors={['rgba(255, 78, 78, 0.25)', 'rgba(255, 170, 170, 0.1)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  
                  {/* 3. L'EFFET DE BRILLANCE (reflet intensifié) */}
                  <LinearGradient
                    colors={['rgba(255,255,255,0.25)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.brillanceOverlayMedium}
                  />
                  
                  {/* 4. LE CONTENU (100% OPAQUE ET AU-DESSUS DE TOUT) */}
                  <View style={styles.cardContentCenter}>
                      <View style={styles.modernIconContainer}>
                        <View style={styles.playButtonModern}>
                          <Image 
                            source={{uri: 'icon_films'}} 
                            style={styles.cardIconMedium}
                            resizeMode="contain"
                          />
                        </View>
                      </View>
                      <Text style={styles.modernCardTitle}>FILMS</Text>
                      
                      {filmsUpdateTime && (
                        <View style={styles.modernUpdateContainer}>
                          <View style={styles.statusDot} />
                          <Text style={styles.modernUpdateText}>{formatTimeAgo(filmsUpdateTime)}</Text>
                          <TouchableOpacity style={styles.modernRefreshButton}>
                            <Icon name="refresh" size={12} color="#000000" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                </TouchableOpacity>
              </Animated.View>

              {/* SERIES - Design moderne */}
              <Animated.View style={[styles.seriesContainer, { transform: [{ scale: cardsScale[2] }] }]}>
                <TouchableOpacity 
                  style={styles.modernCard}
                  activeOpacity={0.8}
                  onPress={() => handleCardPress('SERIES', 2)}
                  {...createPressAnimation(2)}
                >
                  {/* 1. L'EFFET DE VERRE DÉPOLI (en fond de carte) */}
                  <BlurView
                    style={StyleSheet.absoluteFill}
                    blurType="dark"
                    blurAmount={6}
                    reducedTransparencyFallbackColor="rgba(78, 175, 255, 0.2)"
                  />
                  
                  {/* 2. LA TEINTE DE COULEUR (SÉRIES - bleu clair) */}
                  <LinearGradient
                    colors={['rgba(78, 175, 255, 0.2)', 'rgba(170, 235, 255, 0.1)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  
                  {/* 3. L'EFFET DE BRILLANCE (reflet intensifié) */}
                  <LinearGradient
                    colors={['rgba(255,255,255,0.25)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.brillanceOverlayMedium}
                  />
                  
                  {/* 4. LE CONTENU (100% OPAQUE ET AU-DESSUS DE TOUT) */}
                  <View style={styles.cardContentCenter}>
                      <View style={styles.modernIconContainer}>
                        <Image 
                          source={{uri: 'icon_series'}} 
                          style={styles.cardIconMedium}
                          resizeMode="contain"
                        />
                      </View>
                      <Text style={styles.modernCardTitle}>SERIES</Text>
                      
                      <TouchableOpacity style={styles.modernDownloadButton}>
                        <Image 
                          source={{uri: 'icon_download'}} 
                          style={styles.downloadIcon}
                          resizeMode="contain"
                        />
                        <Text style={styles.modernDownloadText}>Télécharger</Text>
                      </TouchableOpacity>
                    </View>
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Rangée 2 - 3 petites cartes modernes (16.6% chacune) */}
            <View style={styles.bottomRow}>
              
              {/* LIVE AVEC EPG - Moderne */}
              <Animated.View style={[styles.modernSmallContainer, { transform: [{ scale: cardsScale[3] }] }]}>
                <TouchableOpacity 
                  style={styles.modernSmallCard}
                  activeOpacity={0.8}
                  onPress={() => handleCardPress('LIVE EPG', 3)}
                  {...createPressAnimation(3)}
                >
                  {/* LIVE EPG - Vert */}
                  <BlurView style={StyleSheet.absoluteFill} blurType="dark" blurAmount={4} />
                  <LinearGradient
                    colors={['rgba(78, 255, 161, 0.2)', 'rgba(120, 255, 200, 0.1)']}
                    style={StyleSheet.absoluteFill}
                  />
                  <LinearGradient
                    colors={['rgba(255,255,255,0.25)', 'transparent']}
                    style={styles.brillanceOverlaySmall}
                  />
                  <View style={styles.smallCardContent}>
                    <Image 
                      source={{uri: 'icon_epg'}} 
                      style={styles.cardIconSmall}
                      resizeMode="contain"
                    />
                    <Text style={styles.modernSmallTitle}>LIVE EPG</Text>
                    <Text style={styles.modernSmallSubtitle}>Guide TV</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>

              {/* MULTI-ÉCRANS - Moderne */}
              <Animated.View style={[styles.modernSmallContainer, { transform: [{ scale: cardsScale[4] }] }]}>
                <TouchableOpacity 
                  style={styles.modernSmallCard}
                  activeOpacity={0.8}
                  onPress={() => handleCardPress('MULTI-ÉCR', 4)}
                  {...createPressAnimation(4)}
                >
                  {/* MULTI-ÉCRANS - Violet */}
                  <BlurView style={StyleSheet.absoluteFill} blurType="dark" blurAmount={4} />
                  <LinearGradient
                    colors={['rgba(192, 78, 255, 0.2)', 'rgba(220, 160, 255, 0.1)']}
                    style={StyleSheet.absoluteFill}
                  />
                  <LinearGradient
                    colors={['rgba(255,255,255,0.25)', 'transparent']}
                    style={styles.brillanceOverlaySmall}
                  />
                  <View style={styles.smallCardContent}>
                    <Image 
                      source={{uri: 'icon_multi'}} 
                      style={styles.cardIconSmall}
                      resizeMode="contain"
                    />
                    <Text style={styles.modernSmallTitle}>MULTI-ÉCR</Text>
                    <Text style={styles.modernSmallSubtitle}>Écrans</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
              
              {/* RATTRAPER - Moderne */}
              <Animated.View style={[styles.modernSmallContainer, { transform: [{ scale: cardsScale[5] }] }]}>
                <TouchableOpacity 
                  style={styles.modernSmallCard}
                  activeOpacity={1}
                  {...createPressAnimation(5)}
                >
                  {/* RATTRAPER - Orange */}
                  <BlurView style={StyleSheet.absoluteFill} blurType="dark" blurAmount={4} />
                  <LinearGradient
                    colors={['rgba(255, 150, 78, 0.2)', 'rgba(255, 200, 150, 0.1)']}
                    style={StyleSheet.absoluteFill}
                  />
                  <LinearGradient
                    colors={['rgba(255,255,255,0.25)', 'transparent']}
                    style={styles.brillanceOverlaySmall}
                  />
                  <View style={styles.smallCardContent}>
                    <Image 
                      source={{uri: 'icon_replay'}} 
                      style={styles.cardIconSmall}
                      resizeMode="contain"
                    />
                    <Text style={styles.modernSmallTitle}>RATTRAPER</Text>
                    <Text style={styles.modernSmallSubtitle}>Replay</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </View>

        {/* Footer conditionnel */}
        <View style={styles.footer}>
          {playlistInfo.expiration && (
            <Text style={styles.footerText}>Expiration : {playlistInfo.expiration}</Text>
          )}
          {playlistInfo.name && (
            <Text style={styles.footerText}>Connecté : {playlistInfo.name}</Text>
          )}
        </View>
      </Animated.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 32,
  },
  logoIcon: {
    width: 32,
    height: 32,
    backgroundColor: '#4A90E2',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  timeText: {
    fontSize: 14,
    color: '#B0BEC5',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  headerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 8,
  },
  headerIconButton: {
    padding: 8,
    marginLeft: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  
  // Layout principal - Flexbox adaptatif
  mainCardsSection: {
    flexDirection: 'row',
    flex: 1,
    marginBottom: 16,
    gap: 12,
  },
  
  // Colonnes
  leftColumn: {
    flex: 0.85,
  },
  rightColumn: {
    flex: 1.1,
    flexDirection: 'column',
    gap: 10,
  },
  
  // Rangées droite - Flexbox adaptatif
  topRow: {
    flexDirection: 'row',
    flex: 0.7,
    gap: 10,
    marginBottom: 10,
  },
  bottomRow: {
    flexDirection: 'row',
    flex: 0.3,
    gap: 8,
  },
  
  // TV EN DIRECT - Design moderne
  tvDirectContainer: {
    flex: 1,
  },
  tvDirectCard: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
    elevation: 16,
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  
  // FILMS et SERIES - Design moderne
  filmsContainer: {
    flex: 1,
  },
  seriesContainer: {
    flex: 1,
  },
  modernCard: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
    elevation: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  
  // Petites cartes modernes (16.6% chacune)
  modernSmallContainer: {
    flex: 1,
  },
  modernSmallCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.07)',
    elevation: 10,
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },

  // Dégradés modernes
  modernCardGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
    position: 'relative',
  },
  modernSmallGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
    position: 'relative',
  },
  
  // Effets lumineux glassmorphism
  blurContainer: {
    flex: 1,
    borderRadius: 28,
  },
  blurContainerMedium: {
    flex: 1,
    borderRadius: 24,
  },
  blurContainerSmall: {
    flex: 1,
    borderRadius: 20,
  },
  glassReflection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    borderRadius: 16,
  },
  smallGlassReflection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    borderRadius: 12,
  },
  brillanceOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    borderRadius: 16,
  },
  brillanceOverlayMedium: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    borderRadius: 12,
  },
  brillanceOverlaySmall: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    borderRadius: 10,
  },
  // Styles pour les nouvelles icônes
  cardIconLarge: {
    width: 65,
    height: 65,
    tintColor: '#FFFFFF',
  },
  cardIconMedium: {
    width: 45,
    height: 45,
    tintColor: '#FFFFFF',
  },
  cardIconSmall: {
    width: 28,
    height: 28,
    tintColor: '#FFFFFF',
    marginBottom: 6,
  },
  downloadIcon: {
    width: 14,
    height: 14,
    tintColor: '#FFFFFF',
    marginRight: 4,
  },
  smallCardContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },

  // Conteneurs d'icônes modernes
  modernIconContainer: {
    marginBottom: 8,
    position: 'relative',
  },
  modernSmallIconContainer: {
    marginBottom: 10,
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  
  // Effets d'icônes améliorés
  iconGlowEffect: {
    padding: 16,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  
  // Bouton play moderne amélioré
  playButtonModern: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Titres modernes
  modernTvTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    letterSpacing: 0.5,
  },
  modernSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  modernCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  modernSmallTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 2,
  },
  modernSmallSubtitle: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Conteneurs d'info modernes
  modernUpdateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  modernUpdateText: {
    fontSize: 10,
    color: '#FFFFFF',
    marginLeft: 6,
    marginRight: 6,
    fontWeight: '500',
  },
  modernRefreshButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  
  // Statut et indicateurs
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00FF88',
    shadowColor: '#00FF88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  // Bouton téléchargement moderne
  modernDownloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  modernDownloadText: {
    fontSize: 9,
    color: '#FFFFFF',
    marginLeft: 4,
    fontWeight: '600',
  },

  cardContentCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  
  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#90A4AE',
    flex: 1,
  },
  buyPremiumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFD700',
    flex: 1,
    justifyContent: 'center',
  },
  buyPremiumText: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: 'bold',
    marginLeft: 6,
  },
});

export default App;