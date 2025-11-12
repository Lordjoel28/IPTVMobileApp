/**
 * 🎬 VLCPlayerComponent - Composant wrapper pour VLC Player
 * Encapsule le lecteur VLC avec une interface compatible avec react-native-video
 */

import React, {forwardRef, useImperativeHandle, useRef, useEffect, useState} from 'react';
import {View, StyleSheet, Text} from 'react-native';

// Try to import VLC, but handle error gracefully
let VLCPlayer: any = null;
try {
  const vlcModule = require('react-native-vlc-media-player');
  VLCPlayer = vlcModule.VLCPlayer;
} catch (error) {
  console.error('[VLCPlayerComponent] VLC not available:', error);
}

export interface VLCPlayerComponentProps {
  source: {uri: string} | {uri: string; headers?: Record<string, string>};
  paused?: boolean;
  volume?: number;
  muted?: boolean;
  rate?: number;
  onLoad?: (data: any) => void;
  onProgress?: (data: {currentTime: number; duration: number}) => void;
  onEnd?: () => void;
  onError?: (error: any) => void;
  onBuffer?: (data: {isBuffering: boolean}) => void;
  resizeMode?: 'contain' | 'cover' | 'stretch';
  style?: any;
}

export interface VLCPlayerComponentRef {
  seek: (time: number) => void;
  getCurrentTime: () => Promise<number>;
  getDuration: () => Promise<number>;
}

const VLCPlayerComponent = forwardRef<
  VLCPlayerComponentRef,
  VLCPlayerComponentProps
>((props, ref) => {
  const {
    source,
    paused = false,
    volume = 1.0,
    muted = false,
    rate = 1.0,
    onLoad,
    onProgress,
    onEnd,
    onError,
    onBuffer,
    resizeMode = 'contain',
    style,
  } = props;

  const vlcRef = useRef<any>(null);
  const currentTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(0);
  const [vlcError, setVlcError] = useState<string | null>(null);

  // Check if VLC is available
  useEffect(() => {
    if (!VLCPlayer) {
      const errorMsg = 'VLC Player non disponible sur cet appareil. Veuillez utiliser le lecteur par défaut.';
      setVlcError(errorMsg);
      console.error('[VLCPlayerComponent]', errorMsg);
      onError?.({error: {errorString: errorMsg}});
    }
  }, []);

  // Expose les méthodes via ref
  useImperativeHandle(ref, () => ({
    seek: (time: number) => {
      if (vlcRef.current) {
        vlcRef.current.seek(time);
      }
    },
    getCurrentTime: async () => {
      return currentTimeRef.current;
    },
    getDuration: async () => {
      return durationRef.current;
    },
  }));

  const handleVLCLoad = (data: any) => {
    console.log('[VLCPlayer] Media loaded:', data);
    if (data.duration) {
      durationRef.current = data.duration / 1000; // VLC renvoie en ms
    }
    onLoad?.({
      duration: durationRef.current,
      currentTime: 0,
      naturalSize: {width: 1920, height: 1080},
    });
  };

  const handleVLCProgress = (data: any) => {
    if (data.currentTime !== undefined) {
      currentTimeRef.current = data.currentTime / 1000; // VLC renvoie en ms
    }
    if (data.duration !== undefined) {
      durationRef.current = data.duration / 1000;
    }
    onProgress?.({
      currentTime: currentTimeRef.current,
      duration: durationRef.current,
    });
  };

  const handleVLCEnd = () => {
    console.log('[VLCPlayer] Playback ended');
    onEnd?.();
  };

  const handleVLCError = (error: any) => {
    console.error('[VLCPlayer] Error:', error);
    onError?.(error);
  };

  const handleVLCBuffer = (data: any) => {
    onBuffer?.({isBuffering: data.isBuffering || false});
  };

  // Conversion de resizeMode pour VLC
  const getVLCVideoAspectRatio = () => {
    switch (resizeMode) {
      case 'stretch':
        return '16:9'; // Force aspect ratio
      case 'cover':
        return '16:9';
      case 'contain':
      default:
        return undefined; // Auto
    }
  };

  // Show error message if VLC is not available
  if (!VLCPlayer || vlcError) {
    return (
      <View style={[styles.container, style, styles.errorContainer]}>
        <Text style={styles.errorText}>
          ⚠️ VLC Player non compatible avec Android 15
        </Text>
        <Text style={styles.errorSubtext}>
          Veuillez utiliser le lecteur par défaut dans Settings → Player
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <VLCPlayer
        ref={vlcRef}
        source={{uri: source.uri}}
        paused={paused}
        volume={muted ? 0 : Math.round(volume * 100)}
        rate={rate}
        onLoad={handleVLCLoad}
        onProgress={handleVLCProgress}
        onEnd={handleVLCEnd}
        onError={handleVLCError}
        onBuffering={handleVLCBuffer}
        videoAspectRatio={getVLCVideoAspectRatio()}
        style={styles.vlcPlayer}
      />
    </View>
  );
});

VLCPlayerComponent.displayName = 'VLCPlayerComponent';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  vlcPlayer: {
    flex: 1,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorSubtext: {
    color: '#CCCCCC',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default VLCPlayerComponent;
