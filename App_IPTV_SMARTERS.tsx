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
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

const App: React.FC = () => {
  // LOG POUR CONFIRMER LE CHARGEMENT
  console.log('🎬 APP_IPTV_SMARTERS LOADED - VERSION MODERNE 2.0');
  
  // État pour l'horloge dynamique
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
      Animated.spring(cardsScale[index], {
        toValue: 0.98,
        useNativeDriver: true,
        tension: 200,
        friction: 7,
      }).start();
    },
    onPressOut: () => {
      Animated.spring(cardsScale[index], {
        toValue: 1,
        useNativeDriver: true,
        tension: 200,
        friction: 7,
      }).start();
    },
  });

  return (
    <View style={styles.container}>
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

      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          
          {/* Section principale - Design moderne avec proportions parfaites */}
          <View style={styles.mainCardsSection}>
          
          {/* Colonne gauche - TV EN DIRECT moderne */}
          <View style={styles.leftColumn}>
            <Animated.View style={[styles.tvDirectContainer, { transform: [{ scale: cardsScale[0] }] }]}>
              <TouchableOpacity 
                style={styles.tvDirectCard}
                activeOpacity={1}
                {...createPressAnimation(0)}
              >
                <LinearGradient
                  colors={['#00D4FF', '#0099CC', '#007399', '#004D66']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.modernCardGradient}
                >
                  <View style={styles.modernGlowOverlay} />
                  <View style={styles.cardContentCenter}>
                    <View style={styles.modernIconContainer}>
                      <View style={styles.iconGlowEffect}>
                        <Icon name="tv" size={65} color="#FFFFFF" />
                      </View>
                      <View style={styles.signalIndicator}>
                        <View style={[styles.signalDot, styles.signalActive]} />
                        <View style={[styles.signalDot, styles.signalActive]} />
                        <View style={[styles.signalDot, styles.signalActive]} />
                      </View>
                    </View>
                    <Text style={styles.modernTvTitle}>TV EN DIRECT</Text>
                    <Text style={styles.modernSubtitle}>Streaming Live</Text>
                    
                    <View style={styles.modernUpdateContainer}>
                      <View style={styles.statusDot} />
                      <Text style={styles.modernUpdateText}>Mise à jour: 14 min</Text>
                      <TouchableOpacity style={styles.modernRefreshButton}>
                        <Icon name="refresh" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </LinearGradient>
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
                  activeOpacity={1}
                  {...createPressAnimation(1)}
                >
                  <LinearGradient
                    colors={['#FF6B6B', '#FF5722', '#E64A19', '#BF360C']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.modernCardGradient}
                  >
                    <View style={styles.modernGlowOverlay} />
                    <View style={styles.cardContentCenter}>
                      <View style={styles.modernIconContainer}>
                        <View style={styles.playButtonModern}>
                          <Icon name="play-arrow" size={35} color="#FFFFFF" />
                        </View>
                      </View>
                      <Text style={styles.modernCardTitle}>FILMS</Text>
                      
                      <View style={styles.modernUpdateContainer}>
                        <View style={styles.statusDot} />
                        <Text style={styles.modernUpdateText}>1 min ago</Text>
                        <TouchableOpacity style={styles.modernRefreshButton}>
                          <Icon name="refresh" size={14} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              {/* SERIES - Design moderne */}
              <Animated.View style={[styles.seriesContainer, { transform: [{ scale: cardsScale[2] }] }]}>
                <TouchableOpacity 
                  style={styles.modernCard}
                  activeOpacity={1}
                  {...createPressAnimation(2)}
                >
                  <LinearGradient
                    colors={['#9C27B0', '#7B1FA2', '#6A1B9A', '#4A148C']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.modernCardGradient}
                  >
                    <View style={styles.modernGlowOverlay} />
                    <View style={styles.cardContentCenter}>
                      <View style={styles.modernIconContainer}>
                        <Icon name="movie" size={45} color="#FFFFFF" />
                      </View>
                      <Text style={styles.modernCardTitle}>SERIES</Text>
                      
                      <TouchableOpacity style={styles.modernDownloadButton}>
                        <Icon name="download" size={14} color="#FFFFFF" />
                        <Text style={styles.modernDownloadText}>Télécharger</Text>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Rangée 2 - 3 petites cartes modernes (16.6% chacune) */}
            <View style={styles.bottomRow}>
              
              {/* LIVE AVEC EPG - Moderne */}
              <Animated.View style={[styles.modernSmallContainer, { transform: [{ scale: cardsScale[3] }] }]}>
                <TouchableOpacity 
                  style={styles.modernSmallCard}
                  activeOpacity={1}
                  {...createPressAnimation(3)}
                >
                  <LinearGradient
                    colors={['#00E676', '#00C853', '#00A64F', '#00833A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.modernSmallGradient}
                  >
                    <View style={styles.smallGlowOverlay} />
                    <View style={styles.modernSmallIconContainer}>
                      <Icon name="event" size={24} color="#FFFFFF" />
                    </View>
                    <Text style={styles.modernSmallTitle}>LIVE EPG</Text>
                    <Text style={styles.modernSmallSubtitle}>Guide TV</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              {/* MULTI-ÉCRANS - Moderne */}
              <Animated.View style={[styles.modernSmallContainer, { transform: [{ scale: cardsScale[4] }] }]}>
                <TouchableOpacity 
                  style={styles.modernSmallCard}
                  activeOpacity={1}
                  {...createPressAnimation(4)}
                >
                  <LinearGradient
                    colors={['#00E676', '#00C853', '#00A64F', '#00833A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.modernSmallGradient}
                  >
                    <View style={styles.smallGlowOverlay} />
                    <View style={styles.modernSmallIconContainer}>
                      <Icon name="apps" size={24} color="#FFFFFF" />
                    </View>
                    <Text style={styles.modernSmallTitle}>MULTI-ÉCR</Text>
                    <Text style={styles.modernSmallSubtitle}>Écrans</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
              
              {/* RATTRAPER - Moderne */}
              <Animated.View style={[styles.modernSmallContainer, { transform: [{ scale: cardsScale[5] }] }]}>
                <TouchableOpacity 
                  style={styles.modernSmallCard}
                  activeOpacity={1}
                  {...createPressAnimation(5)}
                >
                  <LinearGradient
                    colors={['#00E676', '#00C853', '#00A64F', '#00833A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.modernSmallGradient}
                  >
                    <View style={styles.smallGlowOverlay} />
                    <View style={styles.modernSmallIconContainer}>
                      <Icon name="replay" size={24} color="#FFFFFF" />
                    </View>
                    <Text style={styles.modernSmallTitle}>RATTRAPER</Text>
                    <Text style={styles.modernSmallSubtitle}>Replay</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </View>

        {/* Footer exact comme capture 7 */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Expiration : février 9, 2026</Text>
          
          <TouchableOpacity style={styles.buyPremiumButton}>
            <Icon name="shop" size={20} color="#FFD700" />
            <Text style={styles.buyPremiumText}>Buy Premium Version</Text>
          </TouchableOpacity>
          
          <Text style={styles.footerText}>Connecté : zz</Text>
        </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#16213E',
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
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  
  // Layout principal - Flexbox adaptatif
  mainCardsSection: {
    flexDirection: 'row',
    minHeight: 280,
    marginBottom: 20,
    gap: 12,
  },
  
  // Colonnes
  leftColumn: {
    flex: 1,
  },
  rightColumn: {
    flex: 1,
    flexDirection: 'column',
    gap: 8,
  },
  
  // Rangées droite - Flexbox adaptatif
  topRow: {
    flexDirection: 'row',
    flex: 1.3,
    gap: 8,
    marginBottom: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    flex: 1,
    gap: 4,
  },
  
  // TV EN DIRECT - Design moderne
  tvDirectContainer: {
    flex: 1,
  },
  tvDirectCard: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
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
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  
  // Petites cartes modernes (16.6% chacune)
  modernSmallContainer: {
    flex: 1,
  },
  modernSmallCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },

  // Dégradés modernes
  modernCardGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    position: 'relative',
  },
  modernSmallGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    position: 'relative',
  },
  
  // Effets lumineux
  modernGlowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
  },
  smallGlowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
  },

  // Conteneurs d'icônes modernes
  modernIconContainer: {
    marginBottom: 12,
    position: 'relative',
  },
  modernSmallIconContainer: {
    marginBottom: 8,
  },
  
  // Effets d'icônes
  iconGlowEffect: {
    padding: 12,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Bouton play moderne
  playButtonModern: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  
  // Indicateur de signal
  signalIndicator: {
    flexDirection: 'row',
    position: 'absolute',
    top: -5,
    right: -5,
    gap: 2,
  },
  signalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  signalActive: {
    backgroundColor: '#00FF88',
    shadowColor: '#00FF88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
    elevation: 3,
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
    padding: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
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
  },
  
  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    marginBottom: 32,
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