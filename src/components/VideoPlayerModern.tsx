/**
 * 🎬 VideoPlayerModern - PHASE 1: Infrastructure ExoPlayer + Contrôles TiviMate
 * 
 * OBJECTIFS PHASE 1:
 * ✅ Upgrade ExoPlayer (react-native-video v6.x)
 * ✅ Contrôles de base (play/pause centré)
 * ✅ Auto-hide overlay après 3s
 * ✅ Transition mini-lecteur → fullscreen immédiate
 * ✅ Structure overlay TiviMate (header/footer)
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  TouchableOpacity,
  Alert,
  Modal,
  StatusBar,
  Platform,
} from 'react-native';
import Video from 'react-native-video';
import Orientation from 'react-native-orientation-locker';
import SystemNavigationBar from 'react-native-system-navigation-bar';
import { Channel } from '../types';

interface VideoPlayerModernProps {
  channel: Channel | null;
  isVisible?: boolean;
  showInfo?: boolean;
  onError?: (error: string) => void;
  onProgress?: (data: any) => void;
  onFullscreenToggle?: (isFullscreen: boolean) => void;
  isFullscreen?: boolean; // Contrôle externe du mode fullscreen
}

const VideoPlayerModern: React.FC<VideoPlayerModernProps> = ({
  channel,
  isVisible = true,
  showInfo = true,
  onError,
  onProgress,
  onFullscreenToggle,
  isFullscreen = false,
}) => {
  const videoRef = useRef<Video>(null);
  
  // États de base du lecteur
  const [isLoading, setIsLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  // États des contrôles (PHASE 1: Base)
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const { width, height } = Dimensions.get('window');
  const maxRetries = 3;

  // 🎯 PHASE 1: Auto-hide contrôles après 3s (TiviMate style)
  useEffect(() => {
    if (showControls && isFullscreen) {
      const timer = setTimeout(() => {
        console.log('🕐 Auto-hiding controls after 3s');
        setShowControls(false);
      }, 3000); // 3s comme TiviMate
      return () => clearTimeout(timer);
    }
  }, [showControls, isFullscreen]);

  // Reset état quand chaîne change
  useEffect(() => {
    if (channel) {
      console.log('🎬 Channel changed, resetting video state');
      setHasError(false);
      setRetryCount(0);
      setIsLoading(true);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [channel]);

  // 🎯 PHASE 1: Gestion fullscreen SIMPLE (thème Android fait le travail)
  useEffect(() => {
    if (isFullscreen) {
      console.log('🎬 Entering fullscreen mode (Theme-based)');
      // Le thème Android s'occupe de tout automatiquement
    } else {
      console.log('📱 Exiting fullscreen mode (Theme-based)');
      // Le thème Android s'occupe de tout automatiquement
    }
  }, [isFullscreen]);

  // 🎯 HANDLERS VIDÉO (PHASE 1: Base)
  const handleError = (error: any) => {
    console.error('🚨 Video playback error:', error);
    setIsLoading(false);
    setHasError(true);

    if (retryCount < maxRetries) {
      setTimeout(() => {
        console.log(`🔄 Retry attempt ${retryCount + 1}/${maxRetries}`);
        setRetryCount(prev => prev + 1);
        setHasError(false);
        setIsLoading(true);
      }, 2000);
    } else {
      const errorMessage = 'Impossible de lire cette chaîne. Veuillez vérifier votre connexion internet.';
      onError?.(errorMessage);
      Alert.alert(
        'Erreur de lecture',
        errorMessage,
        [
          { text: 'Réessayer', onPress: () => handleRetry() },
          { text: 'OK', style: 'cancel' },
        ]
      );
    }
  };

  const handleRetry = () => {
    console.log('🔄 Manual retry requested');
    setRetryCount(0);
    setHasError(false);
    setIsLoading(true);
  };

  const handleLoad = (data: any) => {
    console.log('✅ Video loaded successfully');
    setIsLoading(false);
    setHasError(false);
    setDuration(data.duration || 0);
  };

  const handleProgress = (data: any) => {
    setCurrentTime(data.currentTime || 0);
    onProgress?.(data);
  };

  // 🎯 CONTRÔLES TACTILES (PHASE 1: Base)
  const togglePlayPause = () => {
    const newPausedState = !isPaused;
    console.log(`${newPausedState ? '⏸️' : '▶️'} Toggle play/pause:`, newPausedState ? 'PAUSED' : 'PLAYING');
    setIsPaused(newPausedState);
    setShowControls(true); // Toujours afficher contrôles après interaction
  };

  const handleScreenTouch = () => {
    console.log('👆 Screen touched - toggling controls visibility');
    setShowControls(!showControls);
  };

  const handleExitFullscreen = () => {
    console.log('❌ Exiting fullscreen mode (Simple)');
    
    // 🎯 SIMPLE: Le thème Android gère tout
    onFullscreenToggle?.(false);
  };

  // 🎯 UTILITAIRES (PHASE 1)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Ne pas rendre si pas de chaîne ou pas visible
  if (!channel || !isVisible) {
    return null;
  }

  // 🎬 RENDU FULLSCREEN SEULEMENT (PHASE 1)
  // Le mini-lecteur est géré par VideoPlayer.tsx
  if (!isFullscreen) {
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
      <View style={styles.fullscreenContainer}>
        <TouchableOpacity
          style={styles.fullscreenVideoContainer}
          onPress={handleScreenTouch}
          activeOpacity={1}
        >
          {/* 🎯 LECTEUR VIDÉO PRINCIPAL */}
          {!hasError ? (
            <Video
              ref={videoRef}
              source={{ uri: channel.url }}
              style={styles.fullscreenVideo}
              resizeMode="contain"
              controls={false} // Désactivé pour contrôles personnalisés
              paused={isPaused}
              onLoad={handleLoad}
              onError={handleError}
              onProgress={handleProgress}
              onBuffer={(data) => setIsLoading(data.isBuffering)}
              bufferConfig={{
                minBufferMs: 15000,
                maxBufferMs: 50000,
                bufferForPlaybackMs: 2500,
                bufferForPlaybackAfterRebufferMs: 5000,
              }}
              repeat={false}
              playWhenInactive={false}
              playInBackground={false}
              ignoreSilentSwitch="ignore"
              // 🎯 PHASE 1: ExoPlayer activé par défaut dans v6.x
            />
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>❌ Erreur de lecture</Text>
              <Text style={styles.errorSubText}>
                Tentative {retryCount + 1}/{maxRetries + 1}
              </Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                <Text style={styles.retryButtonText}>🔄 Réessayer</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 🎯 INDICATEUR DE CHARGEMENT */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>⏳ Chargement...</Text>
            </View>
          )}

          {/* 🎯 OVERLAY CONTRÔLES TIVIMATE STYLE (PHASE 1) */}
          {showControls && (
            <>
              {/* HEADER: Bouton retour moderne + Info chaîne */}
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
                  <Text style={styles.headerChannelName}>{channel.name}</Text>
                  {channel.category && (
                    <Text style={styles.headerChannelCategory}>{channel.category}</Text>
                  )}
                </View>
              </View>

              {/* CENTER: Bouton Play/Pause TiviMate style */}
              <View style={styles.centerControls}>
                <TouchableOpacity
                  style={styles.playPauseButton}
                  onPress={togglePlayPause}
                  activeOpacity={0.7}
                >
                  <View style={styles.playPauseIcon}>
                    {isPaused ? (
                      // Triangle play
                      <View style={styles.playTriangle} />
                    ) : (
                      // Barres pause
                      <View style={styles.pauseContainer}>
                        <View style={styles.pauseBar} />
                        <View style={styles.pauseBar} />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </View>

              {/* FOOTER: Timeline seulement */}
              <View style={styles.tiviMateFooter}>
                {/* Progress bar affinée */}
                <View style={styles.progressBarContainer}>
                  <View 
                    style={[
                      styles.progressBar,
                      { width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }
                    ]} 
                  />
                </View>
              </View>
            </>
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

// 🎨 STYLES TIVIMATE INSPIRÉS (PHASE 1)
const styles = StyleSheet.create({
  // Container principal
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000000', // Noir complet pour masquer StatusBar
    paddingTop: Platform.OS === 'android' ? 0 : 0, // Pas de padding, StatusBar hidden
  },
  fullscreenVideoContainer: {
    flex: 1,
    position: 'relative',
  },
  fullscreenVideo: {
    flex: 1,
    backgroundColor: '#0D0F12',
  },

  // États d'erreur et chargement
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D0F12',
    paddingHorizontal: 20,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 24,
    marginBottom: 10,
    textAlign: 'center',
  },
  errorSubText: {
    color: '#999',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(13,15,18,0.8)',
  },
  loadingText: {
    color: '#fff',
    fontSize: 20,
  },

  // 🎯 HEADER TIVIMATE STYLE (Paysage uniquement)
  tiviMateHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10, // Minimal padding pour paysage
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  // Bouton retour moderne
  backButtonModern: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  // Conteneur icône retour
  backIconContainer: {
    width: 20,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  // Flèche moderne
  backArrowModern: {
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderRightWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: '#FFFFFF',
    position: 'absolute',
    left: 0,
  },
  // Ligne moderne
  backLineModern: {
    width: 12,
    height: 2,
    backgroundColor: '#FFFFFF',
    position: 'absolute',
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
    fontWeight: 'bold',
  },
  headerChannelCategory: {
    color: '#1976d2', // Accent TiviMate
    fontSize: 14,
    marginTop: 2,
  },
  headerTime: {
    alignItems: 'flex-end',
  },
  timeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // 🎯 CONTRÔLES CENTRÉS TiviMate style
  centerControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Style YouTube translucide
    borderRadius: 35,
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  playPauseIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Triangle play (comme TiviMate)
  playTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopWidth: 12,
    borderBottomWidth: 12,
    borderLeftWidth: 18,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#FFFFFF',
    marginLeft: 4, // Centrage visuel
  },
  // Barres pause (comme TiviMate)
  pauseContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseBar: {
    width: 6,
    height: 20,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 2,
    borderRadius: 1,
  },

  // 🎯 FOOTER SIMPLE (Progress bar seulement)
  tiviMateFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingBottom: 5,
    justifyContent: 'flex-end',
  },
  
  // Progress bar optimisée
  progressBarContainer: {
    height: 3, // Légèrement plus épaisse
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 1.5,
    overflow: 'hidden',
    marginHorizontal: 0,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#1976d2', // Bleu conservé
    borderRadius: 1.5,
  },
});

export default VideoPlayerModern;