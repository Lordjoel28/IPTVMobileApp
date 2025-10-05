import React, {useRef, useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  StatusBar,
} from 'react-native';
import Video from 'react-native-video';
import {Channel} from '../types';

interface VideoPlayerProps {
  channel: Channel | null;
  isVisible?: boolean;
  showInfo?: boolean; // Ajout de la prop pour afficher les infos
  onError?: (error: string) => void;
  onProgress?: (data: any) => void;
  onMiniPlayerPress?: () => void; // Callback pour clic sur mini-lecteur
  allowFullscreen?: boolean; // Contrôle si le lecteur peut passer en plein écran
  showControls?: boolean; // Contrôle l'affichage des contrôles
  style?: any; // Style personnalisé pour le conteneur
  isFullscreen?: boolean; // Mode plein écran
  onFullscreenToggle?: (isFullscreen: boolean) => void; // Callback pour toggle fullscreen
  externalIsPlaying?: boolean; // Contrôle externe de lecture/pause
  onPlayPause?: (isPlaying: boolean) => void; // Callback pour changements d'état
  onLoadStart?: () => void; // Callback début de chargement
  onVideoLoad?: (data: any) => void; // Callback métadonnées vidéo chargées
  paused?: boolean; // 🔇 Contrôle externe pause/play pour éviter l'écho
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  channel,
  isVisible = true,
  showInfo = true, // Par défaut, on affiche les infos
  onError,
  onProgress,
  onMiniPlayerPress,
  allowFullscreen = true,
  showControls = true,
  style,
  isFullscreen = false,
  onFullscreenToggle,
  externalIsPlaying,
  onPlayPause,
  onLoadStart,
  onVideoLoad,
  paused: externalPaused,
}) => {
  const videoRef = useRef<Video>(null);
  const fullscreenVideoRef = useRef<Video>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [videoData, setVideoData] = useState<any>(null);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showControlsState, setShowControlsState] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const {width, height} = Dimensions.get('window');
  const maxRetries = 3;

  // Nettoyage au démontage pour éviter les fuites mémoire et l'écho
  useEffect(() => {
    return () => {
      // Nettoyer les références vidéo au démontage
      if (videoRef.current) {
        videoRef.current = null;
      }
      if (fullscreenVideoRef.current) {
        fullscreenVideoRef.current = null;
      }
      console.log('📹 VideoPlayer unmounted - Références nettoyées');
    };
  }, []);

  useEffect(() => {
    if (channel) {
      // Simple reset d'état (style TiviMate)
      setHasError(false);
      setRetryCount(0);
      setIsLoading(true);
      onLoadStart?.();
    }
  }, [channel]);

  // Synchroniser avec contrôle externe
  useEffect(() => {
    if (externalIsPlaying !== undefined) {
      setIsPaused(!externalIsPlaying);
    }
  }, [externalIsPlaying]);

  useEffect(() => {
    if (showControls && showControlsState) {
      const timer = setTimeout(() => {
        setShowControlsState(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showControls, showControlsState]);

  const handleError = (error: any) => {
    console.error('Video playback error:', error);
    setIsLoading(false);
    setHasError(true);

    if (retryCount < maxRetries) {
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setHasError(false);
        setIsLoading(true);
      }, 2000);
    } else {
      const errorMessage =
        'Impossible de lire cette chaîne. Veuillez vérifier votre connexion internet.';
      onError?.(errorMessage);
      Alert.alert('Erreur de lecture', errorMessage, [
        {text: 'Réessayer', onPress: () => handleRetry()},
        {text: 'OK', style: 'cancel'},
      ]);
    }
  };

  const handleRetry = () => {
    setRetryCount(0);
    setHasError(false);
    setIsLoading(true);
  };

  const handleLoad = (data: any) => {
    console.log('📹 Video loaded with data:', data);
    setIsLoading(false);
    setHasError(false);
    setVideoData(data);
    // Reset du player pour éviter les images figées
    if (videoRef.current) {
      videoRef.current.seek(0);
    }
    onVideoLoad?.(data);
  };

  const handleProgress = (data: any) => {
    // Protection contre les resets de progression pour IPTV streams
    if (data && data.currentTime > 0) {
      setCurrentTime(data.currentTime);
      onProgress?.(data);
    }
  };

  // Gestion simple du buffering (style TiviMate)
  const handleBuffer = (bufferData: any) => {
    // Simple indicateur de loading comme TiviMate
    setIsLoading(bufferData.isBuffering);
  };

  const togglePlayPause = () => {
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    setShowControlsState(true);
    onPlayPause?.(!newPausedState); // Inverser car isPaused est l'opposé de isPlaying
  };

  const handleScreenTouch = () => {
    console.log(
      '🎬 VideoPlayer handleScreenTouch called, onMiniPlayerPress:',
      !!onMiniPlayerPress,
    );
    if (onMiniPlayerPress) {
      // Si c'est un mini-lecteur, passer en mode fullscreen directement
      console.log('🔥 Switching to fullscreen mode');
      onFullscreenToggle?.(true);
    } else {
      // Sinon, basculer les contrôles
      console.log('📱 Toggling controls');
      setShowControlsState(!showControlsState);
    }
  };

  const handleExitFullscreen = () => {
    console.log('❌ Exiting fullscreen mode');

    // Sauvegarder la position actuelle pour continuité
    const savedTime = currentTime;

    // Changer le mode
    onFullscreenToggle?.(false);

    // Restaurer la position après le changement de mode
    setTimeout(() => {
      const newRef = videoRef; // Maintenant on utilise le mini-player
      if (newRef.current && savedTime > 0) {
        try {
          newRef.current.seek(savedTime);
          console.log(`📹 Position restaurée: ${savedTime}s`);
        } catch (error) {
          console.log('❌ Erreur restauration position:', error);
        }
      }
    }, 500);
  };

  if (!channel) {
    return (
      <View style={[styles.container, styles.noChannel]}>
        <Text style={styles.noChannelText}>
          Sélectionnez une chaîne pour commencer à regarder
        </Text>
      </View>
    );
  }

  if (!isVisible) {
    return <View style={styles.container} />;
  }

  // Rendu avec UN SEUL composant Video (solution anti-écho)
  const renderVideoComponent = () => {
    return (
      <Video
        ref={isFullscreen ? fullscreenVideoRef : videoRef}
        source={{
          uri: channel.url,
          headers: {
            'User-Agent': 'IPTV Smarters Pro',
            Referer: 'https://www.iptvsmarters.com/',
            Accept: '*/*',
            Connection: 'keep-alive',
          },
        }}
        style={isFullscreen ? styles.fullscreenVideo : styles.video}
        resizeMode="contain"
        paused={externalPaused !== undefined ? externalPaused : isPaused}
        onLoad={handleLoad}
        onError={error => {
          if (isFullscreen) {
            Alert.alert('Erreur Video', JSON.stringify(error));
          } else {
            console.log('❌ Erreur Video mini-player:', error);
          }
          handleError(error);
        }}
        onProgress={handleProgress}
        onBuffer={handleBuffer}
        bufferConfig={{
          minBufferMs: 15000, // TiviMate style - buffer plus important
          maxBufferMs: 50000, // TiviMate style - buffer maximal élevé
          bufferForPlaybackMs: 2500, // Démarrage rapide mais sûr
          bufferForPlaybackAfterRebufferMs: 5000, // Plus de sécurité après rebuffer
        }}
        repeat={false}
        playWhenInactive={false}
        playInBackground={false}
        ignoreSilentSwitch="ignore"
        muted={false}
        volume={1.0}
        rate={1.0}
        progressUpdateInterval={1000} // Réduction fréquence updates
        hideShutterView={true}
        shutterColor="transparent"
        disableFocus={true}
        useTextureView={false} // Performance Android
        allowsExternalPlayback={false} // Évite conflit AirPlay
        controls={false} // Contrôles custom seulement
        onReadyForDisplay={() => {
          console.log(
            `📹 Video ready for display (${
              isFullscreen ? 'fullscreen' : 'mini-player'
            })`,
          );
          setIsLoading(false);
        }}
        onVideoLoadStart={() => {
          console.log(
            `📹 Video load start (${
              isFullscreen ? 'fullscreen' : 'mini-player'
            })`,
          );
          setIsLoading(true);
        }}
        reportBandwidth={true}
      />
    );
  };

  // Rendu plein écran
  if (isFullscreen) {
    return (
      <Modal
        visible={isFullscreen}
        animationType="fade"
        onRequestClose={handleExitFullscreen}>
        <StatusBar hidden />
        <View style={styles.fullscreenContainer}>
          <View style={styles.fullscreenVideoContainer}>
            {!hasError ? (
              renderVideoComponent()
            ) : (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>❌ Erreur de lecture</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={handleRetry}>
                  <Text style={styles.retryButtonText}>🔄 Réessayer</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Simple fullscreen controls */}
            <TouchableOpacity
              style={styles.fullscreenCloseButton}
              onPress={handleExitFullscreen}>
              <Text style={styles.fullscreenCloseText}>✕</Text>
            </TouchableOpacity>

            {/* Simple play/pause control */}
            <TouchableOpacity
              style={styles.fullscreenPlayButton}
              onPress={togglePlayPause}>
              <Text style={styles.fullscreenPlayText}>
                {isPaused ? '▶️' : '⏸️'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // Rendu mini-lecteur (utilise le même composant Video unique)
  return (
    <View style={[styles.container, style]}>
      <View style={styles.videoContainer}>
        {!hasError ? (
          renderVideoComponent()
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

        {/* Loading indicator simple (style TiviMate) */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>⏳ Chargement...</Text>
          </View>
        )}

        {/* Channel info */}
        {showInfo && (
          <View style={styles.channelInfo}>
            <Text style={styles.channelName}>{channel.name}</Text>
            {channel.category && (
              <Text style={styles.channelCategory}>{channel.category}</Text>
            )}
          </View>
        )}

        {/* Controls overlay */}
        {showControls && showControlsState && (
          <View style={styles.controlsOverlay}>
            <TouchableOpacity
              style={styles.playPauseButton}
              onPress={togglePlayPause}>
              <Text style={styles.playPauseText}>{isPaused ? '▶️' : '⏸️'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Separate TouchableOpacity overlay for click detection - Only for mini-player */}
      {onMiniPlayerPress && (
        <TouchableOpacity
          style={styles.clickOverlay}
          onPress={handleScreenTouch}
          activeOpacity={Platform.OS === 'android' ? 0.8 : 1}>
          {/* Transparent overlay for clicks */}
        </TouchableOpacity>
      )}

      {/* Retry info */}
      {retryCount > 0 && !hasError && (
        <View style={styles.retryInfo}>
          <Text style={styles.retryInfoText}>
            🔄 Reconnexion... ({retryCount}/{maxRetries})
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  noChannel: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  noChannelText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
  },
  video: {
    flex: 1,
    backgroundColor: '#000',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 20,
    marginBottom: 10,
  },
  errorSubText: {
    color: '#999',
    fontSize: 14,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
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
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  loadingSubText: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  channelInfo: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
  },
  channelName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 3,
  },
  channelCategory: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 3,
  },
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseButton: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 35,
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseText: {
    fontSize: 30,
  },
  retryInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  retryInfoText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  // Stack Overflow solution: separate overlay for click detection
  clickOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    backgroundColor: 'transparent',
  },
  // Fullscreen styles
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullscreenVideoContainer: {
    flex: 1,
    position: 'relative',
  },
  fullscreenVideo: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullscreenCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  fullscreenCloseText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  fullscreenPlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -35,
    marginLeft: -35,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 35,
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  fullscreenPlayText: {
    fontSize: 30,
  },
});

export default VideoPlayer;
