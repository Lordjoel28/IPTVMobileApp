import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Video from 'react-native-video';
import { Channel } from '../types';

interface VideoPlayerProps {
  channel: Channel | null;
  isVisible?: boolean;
  onError?: (error: string) => void;
  onProgress?: (data: any) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  channel,
  isVisible = true,
  onError,
  onProgress,
}) => {
  const videoRef = useRef<Video>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showControls, setShowControls] = useState(true);

  const { width, height } = Dimensions.get('window');
  const maxRetries = 3;

  useEffect(() => {
    if (channel) {
      setHasError(false);
      setRetryCount(0);
      setIsLoading(true);
    }
  }, [channel]);

  useEffect(() => {
    if (showControls) {
      const timer = setTimeout(() => {
        setShowControls(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showControls]);

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
    setRetryCount(0);
    setHasError(false);
    setIsLoading(true);
  };

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleProgress = (data: any) => {
    onProgress?.(data);
  };

  const togglePlayPause = () => {
    setIsPaused(!isPaused);
    setShowControls(true);
  };

  const handleScreenTouch = () => {
    setShowControls(!showControls);
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

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.videoContainer}
        onPress={handleScreenTouch}
        activeOpacity={1}
      >
        {!hasError ? (
          <Video
            ref={videoRef}
            source={{ uri: channel.url }}
            style={styles.video}
            resizeMode="contain"
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

        {/* Loading indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>⏳ Chargement...</Text>
          </View>
        )}

        {/* Channel info */}
        <View style={styles.channelInfo}>
          <Text style={styles.channelName}>{channel.name}</Text>
          {channel.category && (
            <Text style={styles.channelCategory}>{channel.category}</Text>
          )}
        </View>

        {/* Controls overlay */}
        {showControls && (
          <View style={styles.controlsOverlay}>
            <TouchableOpacity
              style={styles.playPauseButton}
              onPress={togglePlayPause}
            >
              <Text style={styles.playPauseText}>
                {isPaused ? '▶️' : '⏸️'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>

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
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  channelCategory: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 1, height: 1 },
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
});

export default VideoPlayer;