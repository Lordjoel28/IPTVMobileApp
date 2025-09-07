import React, {useRef, useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  TouchableOpacity,
  Alert,
  Modal,
  StatusBar,
} from 'react-native';
import Video from 'react-native-video';
import Orientation from 'react-native-orientation-locker';
import {Channel} from '../types';

interface VideoPlayerModernProps {
  channel: Channel | null;
  isVisible?: boolean;
  showInfo?: boolean;
  onError?: (error: string) => void;
  onProgress?: (data: any) => void;
  onFullscreenToggle?: (isFullscreen: boolean) => void;
}

const VideoPlayerModern: React.FC<VideoPlayerModernProps> = ({
  channel,
  isVisible = true,
  showInfo = true,
  onError,
  onProgress,
  onFullscreenToggle,
}) => {
  const videoRef = useRef<typeof Video>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const {width, height} = Dimensions.get('window');
  const maxRetries = 3;

  // Auto-hide controls after 3 seconds
  useEffect(() => {
    if (showControls && isFullscreen) {
      const timer = setTimeout(() => {
        setShowControls(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showControls, isFullscreen]);

  // Reset state when channel changes
  useEffect(() => {
    if (channel) {
      setHasError(false);
      setRetryCount(0);
      setIsLoading(true);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [channel]);

  // Handle orientation changes
  useEffect(() => {
    const orientationListener = (orientation: string) => {
      if (
        orientation === 'LANDSCAPE-LEFT' ||
        orientation === 'LANDSCAPE-RIGHT'
      ) {
        if (!isFullscreen) {
          setIsFullscreen(true);
          onFullscreenToggle?.(true);
        }
      }
    };

    Orientation.addOrientationListener(orientationListener);
    return () => {
      Orientation.removeOrientationListener(orientationListener);
    };
  }, [isFullscreen, onFullscreenToggle]);

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
    setIsLoading(false);
    setHasError(false);
    setDuration(data.duration || 0);
  };

  const handleProgress = (data: any) => {
    setCurrentTime(data.currentTime || 0);
    onProgress?.(data);
  };

  const togglePlayPause = () => {
    setIsPaused(!isPaused);
    setShowControls(true);
  };

  const handleScreenTouch = () => {
    if (isFullscreen) {
      setShowControls(!showControls);
    }
  };

  const handleMiniPlayerPress = () => {
    if (!isFullscreen) {
      // Force landscape orientation and enter fullscreen
      Orientation.lockToLandscapeLeft();
      setIsFullscreen(true);
      onFullscreenToggle?.(true);
    }
  };

  const handleExitFullscreen = () => {
    Orientation.unlockAllOrientations();
    setIsFullscreen(false);
    setShowControls(true);
    onFullscreenToggle?.(false);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderMiniPlayer = () => {
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

    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.videoContainer}
          onPress={handleMiniPlayerPress}
          activeOpacity={1}>
          {!hasError ? (
            <Video
              ref={videoRef}
              source={{uri: channel.url}}
              style={styles.video}
              resizeMode="contain"
              paused={isPaused}
              onLoad={handleLoad}
              onError={handleError}
              onProgress={handleProgress}
              onBuffer={data => setIsLoading(data.isBuffering)}
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
            />
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>❌ Erreur de lecture</Text>
              <Text style={styles.errorSubText}>
                Tentative {retryCount + 1}/{maxRetries + 1}
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleRetry}>
                <Text style={styles.retryButtonText}>🔄 Réessayer</Text>
              </TouchableOpacity>
            </View>
          )}

          {isLoading && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>⏳ Chargement...</Text>
            </View>
          )}

          {showInfo && (
            <View style={styles.channelInfo}>
              <Text style={styles.channelName}>{channel.name}</Text>
              {channel.category && (
                <Text style={styles.channelCategory}>{channel.category}</Text>
              )}
            </View>
          )}

          {/* Simple play/pause for mini player */}
          <View style={styles.miniControlsOverlay}>
            <TouchableOpacity
              style={styles.miniPlayButton}
              onPress={e => {
                e.stopPropagation();
                togglePlayPause();
              }}>
              <Text style={styles.miniPlayText}>{isPaused ? '▶️' : '⏸️'}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

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

  const renderFullscreenPlayer = () => {
    if (!channel) {
      return null;
    }

    return (
      <Modal
        visible={isFullscreen}
        animationType="slide"
        onRequestClose={handleExitFullscreen}
        supportedOrientations={['landscape-left', 'landscape-right']}>
        <StatusBar hidden />
        <View style={styles.fullscreenContainer}>
          <TouchableOpacity
            style={styles.fullscreenVideoContainer}
            onPress={handleScreenTouch}
            activeOpacity={1}>
            {!hasError ? (
              <Video
                ref={videoRef}
                source={{uri: channel.url}}
                style={styles.fullscreenVideo}
                resizeMode="contain"
                paused={isPaused}
                onLoad={handleLoad}
                onError={handleError}
                onProgress={handleProgress}
                onBuffer={data => setIsLoading(data.isBuffering)}
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
              />
            ) : (
              <View style={styles.fullscreenErrorContainer}>
                <Text style={styles.fullscreenErrorText}>
                  ❌ Erreur de lecture
                </Text>
                <TouchableOpacity
                  style={styles.fullscreenRetryButton}
                  onPress={handleRetry}>
                  <Text style={styles.fullscreenRetryButtonText}>
                    🔄 Réessayer
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {isLoading && (
              <View style={styles.fullscreenLoadingContainer}>
                <Text style={styles.fullscreenLoadingText}>
                  ⏳ Chargement...
                </Text>
              </View>
            )}

            {/* TiviMate-style overlay controls */}
            {showControls && (
              <>
                {/* Header with back button and channel info */}
                <View style={styles.fullscreenHeader}>
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleExitFullscreen}>
                    <Text style={styles.backButtonText}>←</Text>
                  </TouchableOpacity>
                  <View style={styles.headerChannelInfo}>
                    <Text style={styles.headerChannelName}>{channel.name}</Text>
                    {channel.category && (
                      <Text style={styles.headerChannelCategory}>
                        {channel.category}
                      </Text>
                    )}
                  </View>
                  <View style={styles.headerTime}>
                    <Text style={styles.timeText}>
                      {new Date().toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>

                {/* Center play/pause button */}
                <View style={styles.fullscreenCenterControls}>
                  <TouchableOpacity
                    style={styles.fullscreenPlayButton}
                    onPress={togglePlayPause}>
                    <Text style={styles.fullscreenPlayText}>
                      {isPaused ? '▶️' : '⏸️'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Footer with time and progress */}
                <View style={styles.fullscreenFooter}>
                  <View style={styles.timeInfo}>
                    <Text style={styles.currentTimeText}>
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </Text>
                  </View>
                  {/* Progress bar placeholder for now */}
                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width:
                            duration > 0
                              ? `${(currentTime / duration) * 100}%`
                              : '0%',
                        },
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

  // Only render fullscreen player - mini player is handled by VideoPlayer
  return renderFullscreenPlayer();
};

const styles = StyleSheet.create({
  // Mini player styles
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
  },
  video: {
    width: '100%',
    height: '100%',
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
    fontSize: 16,
    marginBottom: 10,
  },
  errorSubText: {
    color: '#999',
    fontSize: 12,
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
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
    fontSize: 14,
  },
  channelInfo: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
  },
  channelName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 3,
  },
  channelCategory: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 3,
  },
  miniControlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniPlayButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniPlayText: {
    fontSize: 20,
  },
  retryInfo: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  retryInfoText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },

  // Fullscreen styles (TiviMate-inspired)
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#0D0F12',
  },
  fullscreenVideoContainer: {
    flex: 1,
    position: 'relative',
  },
  fullscreenVideo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0D0F12',
  },
  fullscreenErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D0F12',
  },
  fullscreenErrorText: {
    color: '#ff6b6b',
    fontSize: 24,
    marginBottom: 20,
  },
  fullscreenRetryButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 8,
  },
  fullscreenRetryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  fullscreenLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(13,15,18,0.8)',
  },
  fullscreenLoadingText: {
    color: '#fff',
    fontSize: 20,
  },

  // TiviMate-style header
  fullscreenHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  backButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerChannelInfo: {
    flex: 1,
    marginLeft: 20,
  },
  headerChannelName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerChannelCategory: {
    color: '#1976d2',
    fontSize: 16,
    marginTop: 2,
  },
  headerTime: {
    alignItems: 'flex-end',
  },
  timeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },

  // Center controls
  fullscreenCenterControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenPlayButton: {
    backgroundColor: 'rgba(25,118,210,0.9)',
    borderRadius: 40,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  fullscreenPlayText: {
    fontSize: 40,
  },

  // Footer controls
  fullscreenFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 20,
    paddingBottom: 20,
    justifyContent: 'flex-end',
  },
  timeInfo: {
    marginBottom: 10,
  },
  currentTimeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#1976d2',
    borderRadius: 2,
  },
});

export default VideoPlayerModern;
