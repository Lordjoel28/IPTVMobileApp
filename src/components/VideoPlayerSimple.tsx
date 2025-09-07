/**
 * 🎬 VideoPlayerSimple - Lecteur vidéo fullscreen ultra-simplifié
 * Fonctionnalités essentielles :
 * - Double-tap gauche/droite (seek ±10s avec animation)
 * - Long press → menu options (qualité, audio, sous-titres)
 * - Gestures avance/recul fluides
 * - Contrôle luminosité par gesture
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Modal,
  StatusBar,
  Dimensions,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import Video from 'react-native-video';
import Icon from 'react-native-vector-icons/MaterialIcons';
// TiviMateOverlay supprimé - interface intégrée directement
// Gestures temporairement désactivés - utilisation TouchableOpacity
// import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import SystemNavigationBar from 'react-native-system-navigation-bar';
import {usePlaylistStore} from '../stores/PlaylistStore';
import FastImage from 'react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';
import { EPGHelper, EPGData } from '../services/EPGHelper';

interface VideoPlayerSimpleProps {
  channel?: {
    name: string;
    url: string;
    logo?: string;
    id?: string; // ID nécessaire pour EPG
    tvgId?: string; // ID EPG alternatif
  };
  isVisible: boolean;
  isFullscreen: boolean;
  onExitFullscreen: () => void;
  initialTime?: number; // Temps de départ pour reprendre où le mini lecteur s'est arrêté
  initialPaused?: boolean; // État pause du mini lecteur
  recentChannels?: any[]; // Chaînes récentes dynamiques
  onChannelSelect?: (channel: any) => void; // Callback pour changer de chaîne
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const VideoPlayerSimple: React.FC<VideoPlayerSimpleProps> = ({
  channel,
  isVisible,
  isFullscreen,
  onExitFullscreen,
  initialTime = 0,
  initialPaused = false,
  recentChannels: recentChannelsProp,
  onChannelSelect,
}) => {
  // Accès aux données du store pour chaînes récentes
  const { channels } = usePlaylistStore();
  
  // Utiliser les vraies chaînes récentes passées en props
  const recentChannels = recentChannelsProp || [];
  const videoRef = useRef<Video>(null);

  // Debug: surveiller les changements de recentChannels
  useEffect(() => {
    console.log(`🔄 VideoPlayerSimple reçoit ${recentChannels.length} chaînes récentes:`, 
      recentChannels.map(ch => ch.name).slice(0, 3)
    );
  }, [recentChannels]);

  // Charger les données EPG quand la chaîne change
  useEffect(() => {
    const loadEPGData = async () => {
      if (!channel) {
        console.log('🔄 EPG: Pas de chaîne disponible');
        setEPGData(null);
        return;
      }
      
      // Utiliser le nom de la chaîne comme ID si pas d'autres identifiants disponibles
      const channelId = channel.tvgId || channel.id || channel.name;
      console.log('🔄 EPG: Chargement des données pour', channelId);
      
      setEPGLoading(true);
      try {
        const data = await EPGHelper.getChannelEPG(channelId);
        setEPGData(data);
        console.log('✅ EPG: Données chargées:', data.currentProgram?.title);
      } catch (error) {
        console.error('❌ EPG: Erreur de chargement:', error);
        // En cas d'erreur, créer des données mockées directement
        const now = new Date();
        const startHour = Math.floor(now.getHours() / 2) * 2;
        const startTime = new Date(now);
        startTime.setHours(startHour, 0, 0, 0);
        const endTime = new Date(startTime);
        endTime.setHours(startTime.getHours() + 2);
        
        const mockData = {
          currentProgram: {
            id: 'fallback-current',
            channelId: channelId,
            title: 'Programme en cours',
            description: 'Diffusion en cours',
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            duration: 120,
            category: 'Général',
            isLive: true
          },
          nextProgram: null,
          progressPercentage: ((now.getTime() - startTime.getTime()) / (endTime.getTime() - startTime.getTime())) * 100,
          remainingMinutes: Math.ceil((endTime.getTime() - now.getTime()) / (1000 * 60)),
          programStartTime: startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          programEndTime: endTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        };
        setEPGData(mockData);
      } finally {
        setEPGLoading(false);
      }
    };

    loadEPGData();
  }, [channel?.id, channel?.tvgId, channel?.name]);

  // Rafraîchir les données EPG toutes les minutes
  useEffect(() => {
    if (!channel) return;
    
    const interval = setInterval(async () => {
      const channelId = channel.tvgId || channel.id || channel.name;
      if (channelId) {
        try {
          const data = await EPGHelper.getChannelEPG(channelId);
          setEPGData(data);
        } catch (error) {
          console.error('❌ EPG: Erreur de rafraîchissement:', error);
        }
      }
    }, 60000); // 1 minute
    
    return () => clearInterval(interval);
  }, [channel?.id, channel?.tvgId, channel?.name]);
  
  // États vidéo
  const [isPaused, setIsPaused] = useState(initialPaused);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false); // Pas de loading si on reprend
  const [hasError, setHasError] = useState(false);
  
  // États UI
  const [showControls, setShowControls] = useState(true); // Afficher les contrôles par défaut
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  
  // État EPG
  const [epgData, setEPGData] = useState<EPGData | null>(null);
  const [epgLoading, setEPGLoading] = useState(false);
  
  // Timer intelligent pour contrôles
  const controlsTimer = useRef<NodeJS.Timeout | null>(null);
  const [isDockerInteracting, setIsDockerInteracting] = useState(false);
  
  // États pour double tap
  const [lastLeftTap, setLastLeftTap] = useState(0);
  const [lastRightTap, setLastRightTap] = useState(0);
  
  // Animations
  const seekAnimationLeft = useSharedValue(0);
  const seekAnimationRight = useSharedValue(0);
  const controlsOpacity = useSharedValue(1); // Contrôles visibles par défaut
  
  // Animations YouTube-style pour seek
  const seekRippleLeft = useSharedValue(0);
  const seekRippleRight = useSharedValue(0);
  const seekScaleLeft = useSharedValue(1);
  const seekScaleRight = useSharedValue(1);

  console.log('🎬 [VideoPlayerSimple] Rendering with channel:', channel?.name);

  // 🎯 Handlers vidéo
  const handleLoad = useCallback((data: any) => {
    console.log('✅ [VIDEO] Video loaded successfully');
    setDuration(data.duration);
    setIsLoading(false);
    setHasError(false);
    
    // Si on a un temps initial, se positionner immédiatement
    if (initialTime > 0) {
      console.log(`⏯️ [VIDEO] Seeking to initial time: ${initialTime}s`);
      setTimeout(() => {
        videoRef.current?.seek(initialTime);
      }, 100);
    }
  }, [initialTime]);

  const handleError = useCallback((error: any) => {
    console.error('❌ [VIDEO] Error:', error);
    setHasError(true);
    setIsLoading(false);
  }, []);

  const handleProgress = useCallback((data: any) => {
    setCurrentTime(data.currentTime);
  }, []);

  const handlePlayPause = useCallback(() => {
    console.log('⏯️ [ACTION] Toggle play/pause - Current isPaused:', isPaused);
    setIsPaused(!isPaused);
    console.log('⏯️ [ACTION] New isPaused will be:', !isPaused);
  }, [isPaused]);

  // 🎯 Seek functions
  const seekBackward = useCallback(() => {
    const newTime = Math.max(0, currentTime - 10);
    console.log(`⏪ [SEEK] Backward 10s: ${currentTime}s → ${newTime}s`);
    videoRef.current?.seek(newTime);
    
    // Animation YouTube-style avec ripple + scale
    seekAnimationLeft.value = withSequence(
      withTiming(1, { duration: 150 }),
      withTiming(0, { duration: 500 })
    );
    seekRippleLeft.value = withSequence(
      withTiming(1, { duration: 300 }),
      withTiming(0, { duration: 200 })
    );
    seekScaleLeft.value = withSequence(
      withTiming(1.2, { duration: 100 }),
      withTiming(1, { duration: 200 })
    );
  }, [currentTime, seekAnimationLeft, seekRippleLeft, seekScaleLeft]);

  const seekForward = useCallback(() => {
    const newTime = Math.min(duration, currentTime + 10);
    console.log(`⏩ [SEEK] Forward 10s: ${currentTime}s → ${newTime}s`);
    videoRef.current?.seek(newTime);
    
    // Animation YouTube-style avec ripple + scale
    seekAnimationRight.value = withSequence(
      withTiming(1, { duration: 150 }),
      withTiming(0, { duration: 500 })
    );
    seekRippleRight.value = withSequence(
      withTiming(1, { duration: 300 }),
      withTiming(0, { duration: 200 })
    );
    seekScaleRight.value = withSequence(
      withTiming(1.2, { duration: 100 }),
      withTiming(1, { duration: 200 })
    );
  }, [currentTime, duration, seekAnimationRight, seekRippleRight, seekScaleRight]);

  // 🎯 Timer intelligent pour contrôles
  const startControlsTimer = useCallback(() => {
    if (controlsTimer.current) {
      clearTimeout(controlsTimer.current);
    }
    
    // 3s standard, mais pas de timer si interaction docker active
    if (!isDockerInteracting) {
      controlsTimer.current = setTimeout(() => {
        setShowControls(false);
        controlsOpacity.value = withTiming(0, { duration: 300 });
      }, 3000); // 🚀 3s standard comme demandé
    }
  }, [isDockerInteracting, controlsOpacity]);

  // 🎯 Controls toggle
  const toggleControls = useCallback(() => {
    const newShowControls = !showControls;
    console.log('🎮 [CONTROLS] Toggle:', newShowControls);
    setShowControls(newShowControls);
    
    controlsOpacity.value = withTiming(newShowControls ? 1 : 0, { duration: 300 });
    
    if (newShowControls) {
      startControlsTimer();
    }
  }, [showControls, controlsOpacity, startControlsTimer]);

  // 🎯 Long press menu
  const showOptionsMenuHandler = useCallback(() => {
    console.log('📱 [MENU] Long press - Show options menu');
    setShowOptionsMenu(true);
  }, []);

  // 🎯 Brightness control supprimé

  // 🎯 GESTURES TEMPORAIREMENT DÉSACTIVÉS
  // Utilisation de TouchableOpacity pour diagnostic
  
  console.log('🎬 [VideoPlayerSimple] Component rendered, ready for touch tests');

  // 🎯 PanResponder luminosité supprimé

  // 🎯 Exit fullscreen
  const handleExitFullscreen = useCallback(() => {
    console.log('🚪 [ACTION] Exit fullscreen');
    SystemNavigationBar.navigationShow();
    onExitFullscreen();
  }, [onExitFullscreen]);

  // 🎯 Hide system bars in fullscreen
  useEffect(() => {
    if (isFullscreen) {
      SystemNavigationBar.navigationHide();
    }
    return () => {
      SystemNavigationBar.navigationShow();
    };
  }, [isFullscreen]);

  // Animated styles YouTube-style
  const seekLeftStyle = useAnimatedStyle(() => ({
    opacity: seekAnimationLeft.value,
    transform: [{ scale: seekScaleLeft.value }],
  }));

  const seekRightStyle = useAnimatedStyle(() => ({
    opacity: seekAnimationRight.value,
    transform: [{ scale: seekScaleRight.value }],
  }));

  const seekRippleLeftStyle = useAnimatedStyle(() => ({
    opacity: seekRippleLeft.value * 0.3,
    transform: [{ scale: 1 + seekRippleLeft.value * 2 }],
  }));

  const seekRippleRightStyle = useAnimatedStyle(() => ({
    opacity: seekRippleRight.value * 0.3,
    transform: [{ scale: 1 + seekRippleRight.value * 2 }],
  }));

  const controlsStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
  }));

  // 🎯 Render guards
  if (!channel || !isVisible || !isFullscreen) {
    return null;
  }

  return (
    <Modal
      visible={isFullscreen}
      animationType="slide"
      onRequestClose={handleExitFullscreen}
      supportedOrientations={['landscape-left', 'landscape-right']}
      statusBarTranslucent={true}
      presentationStyle="fullScreen"
    >
      <StatusBar 
        hidden={true}
        backgroundColor="#000000"
        translucent={true}
        barStyle="light-content"
      />
      
      <View style={{ flex: 1, backgroundColor: '#000000' }}>
        {/* 🎬 LECTEUR VIDÉO - OPTIMISÉ TRANSITION RAPIDE */}
        {!hasError ? (
          <Video
            key={channel?.url} // 🚀 Key pour forcer re-render immédiat
            ref={videoRef}
            source={{ uri: channel.url }}
            style={{ flex: 1 }}
            resizeMode="contain"
            controls={false}
            paused={isPaused}
            onLoad={handleLoad}
            onError={handleError}
            onProgress={handleProgress}
            onBuffer={(data) => setIsLoading(data.isBuffering)}
            repeat={false}
            playInBackground={false}
            bufferConfig={{
              minBufferMs: 2000,       // 🚀 Buffer minimal 2s (vs 15s défaut)
              maxBufferMs: 8000,       // 🚀 Buffer max 8s (vs 50s défaut)  
              bufferForPlaybackMs: 1000, // 🚀 1s pour démarrer (vs 2.5s)
              bufferForPlaybackAfterRebufferMs: 2000 // 🚀 2s après rebuffering
            }}
            maxBitRate={2000000}       // 🚀 Limite débit 2Mbps pour transition rapide
          />
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 18 }}>❌ Erreur de lecture</Text>
            <Text style={{ color: '#ccc', fontSize: 14, marginTop: 10 }}>
              {channel.name}
            </Text>
          </View>
        )}

        {/* 🎯 BRIGHTNESS OVERLAY supprimé */}

        {/* 🎯 ANCIEN BOUTON RETOUR supprimé - remplacé par header TiviMate */}

        {/* 🎯 ZONES TOUCH SIMPLES POUR TEST */}
        
        {/* Zone gauche (30%) - Seek -10s DOUBLE TAP */}
        <TouchableOpacity
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: screenWidth * 0.3,
            height: '100%',
            backgroundColor: 'rgba(255,0,0,0.1)', // Rouge debug
          }}
          onPress={() => {
            const now = Date.now();
            if (lastLeftTap && (now - lastLeftTap) < 300) {
              // Double tap détecté
              console.log('🔴 [DOUBLE TAP] Left zone - Seek backward');
              seekBackward();
              setLastLeftTap(0); // Reset pour éviter triple tap
            } else {
              // Premier tap
              console.log('🔴 [SINGLE TAP] Left zone - Wait for double tap');
              setLastLeftTap(now);
              // Timeout pour reset si pas de second tap
              setTimeout(() => {
                if (lastLeftTap === now) {
                  console.log('🔵 [SINGLE TAP TIMEOUT] Toggle controls');
                  toggleControls();
                }
              }, 300);
            }
          }}
          activeOpacity={0.7}
        />

        {/* Zone droite (30%) - Seek +10s DOUBLE TAP */}
        <TouchableOpacity
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: screenWidth * 0.3,
            height: '100%',
            backgroundColor: 'rgba(0,255,0,0.1)', // Vert debug
          }}
          onPress={() => {
            const now = Date.now();
            if (lastRightTap && (now - lastRightTap) < 300) {
              // Double tap détecté
              console.log('🟢 [DOUBLE TAP] Right zone - Seek forward');
              seekForward();
              setLastRightTap(0); // Reset pour éviter triple tap
            } else {
              // Premier tap
              console.log('🟢 [SINGLE TAP] Right zone - Wait for double tap');
              setLastRightTap(now);
              // Timeout pour reset si pas de second tap
              setTimeout(() => {
                if (lastRightTap === now) {
                  console.log('🔵 [SINGLE TAP TIMEOUT] Toggle controls');
                  toggleControls();
                }
              }, 300);
            }
          }}
          activeOpacity={0.7}
        />

        {/* 🎯 ZONE LUMINOSITÉ supprimée */}

        {/* Zone centre (40%) - Toggle controls */}
        <TouchableOpacity
          style={{
            position: 'absolute',
            left: '30%',
            top: 0,
            width: '40%',
            height: '100%',
            backgroundColor: 'rgba(0,0,255,0.1)', // Bleu debug
          }}
          onPress={() => {
            console.log('🔵 [TOUCH] Center zone pressed - Toggle controls');
            toggleControls();
          }}
          onLongPress={() => {
            console.log('🟡 [TOUCH] Center zone long pressed - Options menu');
            showOptionsMenuHandler();
          }}
          activeOpacity={0.7}
          pointerEvents={showControls ? 'none' : 'auto'} // 🚀 Désactiver quand contrôles visibles
        />

        {/* 🎯 SEEK ANIMATIONS YouTube-style */}
        
        {/* Ripple effect gauche */}
        <Animated.View
          style={[
            seekRippleLeftStyle,
            {
              position: 'absolute',
              left: 50,
              top: '50%',
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: '#fff',
              transform: [{ translateX: -25 }, { translateY: -40 }],
              pointerEvents: 'none',
            },
          ]}
        />
        
        {/* Icône seek gauche */}
        <Animated.View
          style={[
            seekLeftStyle,
            {
              position: 'absolute',
              left: 50,
              top: '50%',
              transform: [{ translateY: -30 }],
              pointerEvents: 'none',
            },
          ]}
        >
          <View style={{
            backgroundColor: 'rgba(0,0,0,0.8)',
            borderRadius: 35,
            width: 70,
            height: 70,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}>
            <Icon name="replay-10" size={28} color="#fff" />
          </View>
        </Animated.View>

        {/* Ripple effect droite */}
        <Animated.View
          style={[
            seekRippleRightStyle,
            {
              position: 'absolute',
              right: 50,
              top: '50%',
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: '#fff',
              transform: [{ translateX: 25 }, { translateY: -40 }],
              pointerEvents: 'none',
            },
          ]}
        />
        
        {/* Icône seek droite */}
        <Animated.View
          style={[
            seekRightStyle,
            {
              position: 'absolute',
              right: 50,
              top: '50%',
              transform: [{ translateY: -30 }],
              pointerEvents: 'none',
            },
          ]}
        >
          <View style={{
            backgroundColor: 'rgba(0,0,0,0.8)',
            borderRadius: 35,
            width: 70,
            height: 70,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}>
            <Icon name="forward-10" size={28} color="#fff" />
          </View>
        </Animated.View>

        {/* 🎯 BRIGHTNESS INDICATOR supprimé */}


        {/* 🎯 OPTIONS MENU */}
        {showOptionsMenu && (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <View style={{
              backgroundColor: '#333',
              borderRadius: 10,
              padding: 20,
              width: 300,
            }}>
              <Text style={{ color: '#fff', fontSize: 18, textAlign: 'center', marginBottom: 20 }}>
                Options
              </Text>

              <TouchableOpacity style={{ marginBottom: 15, flexDirection: 'row', alignItems: 'center' }} onPress={() => Alert.alert('Qualité', 'Fonction à implémenter')}>
                <Icon name="high-quality" size={20} color="#fff" style={{ marginRight: 10 }} />
                <Text style={{ color: '#fff', fontSize: 16 }}>Qualité vidéo</Text>
              </TouchableOpacity>

              <TouchableOpacity style={{ marginBottom: 15, flexDirection: 'row', alignItems: 'center' }} onPress={() => Alert.alert('Audio', 'Fonction à implémenter')}>
                <Icon name="audiotrack" size={20} color="#fff" style={{ marginRight: 10 }} />
                <Text style={{ color: '#fff', fontSize: 16 }}>Piste audio</Text>
              </TouchableOpacity>

              <TouchableOpacity style={{ marginBottom: 20, flexDirection: 'row', alignItems: 'center' }} onPress={() => Alert.alert('Sous-titres', 'Fonction à implémenter')}>
                <Icon name="subtitles" size={20} color="#fff" style={{ marginRight: 10 }} />
                <Text style={{ color: '#fff', fontSize: 16 }}>Sous-titres</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setShowOptionsMenu(false)}>
                <Text style={{ color: '#ff6b6b', fontSize: 16, textAlign: 'center' }}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 🎯 LOADING INDICATOR */}
        {isLoading && (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}>
            <Icon name="hourglass-empty" size={32} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 16, marginTop: 10 }}>Chargement...</Text>
          </View>
        )}

        {/* 🎬 INTERFACE TIVIMATE (design du VideoPlayerModern.tsx) */}
        {showControls && (
          <>
            {/* HEADER: Bouton retour moderne + Info chaîne (Conservé) */}
            <View style={styles.tiviMateHeader}>
              <TouchableOpacity
                style={styles.backButtonModern}
                onPress={handleExitFullscreen}
                activeOpacity={0.7}
              >
                <View style={styles.backIconContainer}>
                  <View style={styles.backArrowModern} />
                  <View style={styles.backLineModern} />
                </View>
              </TouchableOpacity>
              <View style={styles.headerChannelInfo}>
                <Text style={styles.headerChannelName}>{channel?.name || 'IPTV'}</Text>
              </View>
            </View>

            {/* CENTER: Bouton Play/Pause (Conservé) */}
            <View style={styles.centerControls}>
              <TouchableOpacity
                style={styles.playPauseButton}
                onPress={() => {
                  console.log('🎯 [DEBUG] TouchableOpacity pressed');
                  handlePlayPause();
                }}
                activeOpacity={0.7}
              >
                <View style={styles.playPauseIcon}>
                  {isPaused ? (
                    <View style={styles.playTriangle} />
                  ) : (
                    <View style={styles.pauseContainer}>
                      <View style={styles.pauseBar} />
                      <View style={styles.pauseBar} />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>

            {/* 🔽 NOUVELLE INTERFACE INFÉRIEURE (style d'après référence) */}
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,1)']}
              locations={[0, 0.3, 1]}
              style={styles.bottomContainer}
            >
              {/* Barre d'information principale */}
              <View style={styles.infoBar}>
                {channel?.logo && (
                  <FastImage
                    source={{ uri: channel.logo }}
                    style={styles.infoBarLogo}
                    resizeMode={FastImage.resizeMode.contain}
                  />
                )}
                <View style={styles.infoBarDetails}>
                  <Text style={styles.infoBarProgramTitle} numberOfLines={1}>
                    {epgLoading ? 'Chargement EPG...' : (epgData?.currentProgram?.title || 'Diffusion en cours')}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 4 }}>
                    <Text style={styles.infoBarProgramTime}>
                      {epgData ? `${epgData.programStartTime} - ${epgData.programEndTime}` : 
                       `${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - ${new Date(Date.now() + 3600000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
                    </Text>
                    {/* Petite barre de progression supprimée */}
                    <Text style={styles.infoBarRemainingTime}>
                      {epgData ? `${epgData.remainingMinutes} min` : `${Math.round((duration - currentTime) / 60)} min`}
                    </Text>
                  </View>
                  <Text style={styles.infoBarNextProgram} numberOfLines={1}>
                    À suivre: {epgData?.nextProgram?.title || 'Information non disponible'}
                  </Text>
                </View>
                <View style={styles.infoBarChannel}>
                  {/* Nom de la chaîne supprimé */}
                  <View style={styles.qualityBadges}>
                    <View style={styles.qualityBadge}><Text style={styles.badgeText}>FHD</Text></View>
                    <View style={styles.qualityBadge}><Text style={styles.badgeText}>25 FPS</Text></View>
                    <View style={styles.qualityBadge}><Text style={styles.badgeText}>STÉRÉO</Text></View>
                  </View>
                </View>
              </View>

              {/* Barre de progression principale - basée sur le programme EPG */}
              <View style={styles.mainProgressBarContainer}>
                <View style={[
                  styles.mainProgressBarFill, 
                  { width: `${epgData ? epgData.progressPercentage : (currentTime / Math.max(1, duration)) * 100}%` }
                ]} />
                <View style={[
                  styles.mainProgressHandle, 
                  { left: `${epgData ? epgData.progressPercentage : (currentTime / Math.max(1, duration)) * 100}%` }
                ]} />
              </View>

              {/* Docker avec boutons et chaînes récentes (Conservé) */}
              <View style={styles.dockerContent}>
                <TouchableOpacity style={styles.dockerButtonModern} onPress={() => console.log('Guide TV')}>
                  <View style={styles.dockerIconContainer}><Icon name="apps" size={22} color="#fff" /></View>
                  <Text style={styles.dockerButtonTextModern}>Guide TV</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dockerButtonModern} onPress={() => console.log('Historique')}>
                  <View style={styles.dockerIconContainer}><Icon name="history" size={22} color="#fff" /></View>
                  <Text style={styles.dockerButtonTextModern}>Historique</Text>
                </TouchableOpacity>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.recentChannelsScroll}
                  contentContainerStyle={styles.recentChannelsContent}
                >
                  {recentChannels.map((recentChannel, index) => (
                    <TouchableOpacity
                      key={recentChannel.id || `mock-${index}`}
                      style={styles.recentChannelItem}
                      onPress={() => onChannelSelect && onChannelSelect(recentChannel)}
                    >
                      <View style={styles.recentChannelPreview}>
                        {recentChannel.logo ? (
                          <FastImage
                            source={{ uri: recentChannel.logo }}
                            style={styles.recentChannelLogo}
                            resizeMode={FastImage.resizeMode.contain}
                          />
                        ) : (
                           <View style={styles.logoFallback}><Text style={styles.logoFallbackText}>{recentChannel.name.substring(0, 2)}</Text></View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </LinearGradient>
          </>
        )}
      </View>
    </Modal>
  );
};

// 🎨 STYLES TIVIMATE (copiés du VideoPlayerModern.tsx)
const styles = {
  // 🎯 HEADER TIVIMATE STYLE (Conservé)
  tiviMateHeader: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 70,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: 'transparent', // 🚀 Fond transparent comme demandé
  },
  backButtonModern: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  backIconContainer: {
    width: 20,
    height: 16,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    position: 'relative' as const,
  },
  backArrowModern: {
    width: 0,
    height: 0,
    borderStyle: 'solid' as const,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderRightWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: '#FFFFFF',
    position: 'absolute' as const,
    left: 0,
  },
  backLineModern: {
    width: 12,
    height: 2,
    backgroundColor: '#FFFFFF',
    position: 'absolute' as const,
    right: 0,
    borderRadius: 1,
  },
  headerChannelInfo: {
    flex: 1,
    marginLeft: 20,
  },
  headerChannelName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold' as const,
  },

  // 🎯 CONTRÔLES CENTRÉS (Icône transparente)
  centerControls: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  playPauseButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // 🚀 Léger fond pour améliorer la détection touch
    borderRadius: 35,
    width: 70,
    height: 70,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  playPauseIcon: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    // Ombre sur l'icône elle-même pour la lisibilité
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  playTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid' as const,
    borderTopWidth: 14, // Légèrement plus grand
    borderBottomWidth: 14,
    borderLeftWidth: 20,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#FFFFFF',
    marginLeft: 4,
  },
  pauseContainer: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  pauseBar: {
    width: 7, // Légèrement plus épais
    height: 24, // Légèrement plus grand
    backgroundColor: '#FFFFFF',
    marginHorizontal: 2.5,
    borderRadius: 1,
  },

  // 🔽 INTERFACE INFÉRIEURE
  bottomContainer: {
    position: 'absolute' as const,
    bottom: -10, // Remonté légèrement
    left: 0,
    right: 0,
    paddingTop: 10,
    paddingBottom: 15,
  },

  // BARRE D'INFO
  infoBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  infoBarLogo: {
    width: 70,
    height: 70,
    marginLeft: 20,
    marginRight: 15,
  },
  infoBarDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  infoBarProgramTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold' as const,
  },
  infoBarProgramTime: {
    color: '#ccc',
    fontSize: 12,
  },
  infoBarRemainingTime: {
    color: '#ccc',
    fontSize: 12,
    marginLeft: 8,
  },
  infoBarNextProgram: {
    color: '#aaa',
    fontSize: 12,
  },
  infoBarChannel: {
    alignItems: 'flex-end' as const,
    marginLeft: 10,
    marginRight: 40,
  },
  qualityBadges: {
    flexDirection: 'row' as const,
    marginTop: 5,
  },
  qualityBadge: {
    backgroundColor: 'rgba(128, 128, 128, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  badgeText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '500' as const,
  },

  // BARRE DE PROGRESSION PRINCIPALE
  mainProgressBarContainer: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 40,
    marginBottom: 10,
    position: 'relative' as const,
  },
  mainProgressBarFill: {
    height: '100%',
    backgroundColor: '#1976d2',
    borderRadius: 2,
  },
  mainProgressHandle: {
    position: 'absolute' as const,
    top: -4.5,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#1976d2',
  },

  // DOCKER
  dockerContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    height: 100,
    paddingHorizontal: 20,
  },
  dockerButtonModern: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 10,
    width: 75,
    height: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
  },
  dockerIconContainer: {
    marginBottom: 5,
  },
  dockerButtonTextModern: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600' as const,
  },
  recentChannelsScroll: {
    flex: 1,
    marginLeft: 10,
  },
  recentChannelsContent: {
    alignItems: 'center' as const,
    paddingRight: 20,
  },
  recentChannelItem: {
    alignItems: 'center' as const,
    marginRight: 10,
    width: 75,
  },
  recentChannelPreview: {
    width: 75,
    height: 75,
    borderRadius: 10,
    backgroundColor: 'rgba(40, 40, 40, 0.9)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  recentChannelLogo: {
    width: 60,
    height: 60,
  },
  logoFallback: {
    width: 60,
    height: 60,
    backgroundColor: '#1976d2',
    borderRadius: 8,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  logoFallbackText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
};

export default VideoPlayerSimple;