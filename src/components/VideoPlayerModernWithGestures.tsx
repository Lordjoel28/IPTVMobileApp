/**
 * 🎬 VideoPlayerModern - PHASE 2: Gestures Avancés + Animations
 *
 * NOUVELLES FONCTIONNALITÉS PHASE 2:
 * ✅ Double-tap seek avant/arrière (±10s)
 * ✅ Zones gestuelles style YouTube (gauche/droite/centre)
 * ✅ Feedback visuel animé pour seek
 * ✅ Animations fluides avec react-native-reanimated
 * ✅ Gesture.Race pour résoudre conflits single/double tap
 */

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
  Platform,
} from 'react-native';
import Video from 'react-native-video';
import Orientation from 'react-native-orientation-locker';
import SystemNavigationBar from 'react-native-system-navigation-bar';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import {Channel} from '../types';

interface VideoPlayerModernProps {
  channel: Channel | null;
  isVisible?: boolean;
  showInfo?: boolean;
  onError?: (error: string) => void;
  onProgress?: (data: any) => void;
  onFullscreenToggle?: (isFullscreen: boolean) => void;
  isFullscreen?: boolean;
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
  console.log('📍 [DEBUG] VideoPlayerModernWithGestures LOADED');
  console.log('📍 [DEBUG] Props:', {
    channelName: channel?.name,
    isVisible,
    isFullscreen,
    showInfo,
  });
  const videoRef = useRef<any>(null);

  // États de base du lecteur
  const [isLoading, setIsLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // États des contrôles (PHASE 2: Gestures avancés)
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seekFeedback, setSeekFeedback] = useState<{
    visible: boolean;
    direction: 'forward' | 'backward';
    seconds: number;
  }>({visible: false, direction: 'forward', seconds: 0});

  // Valeurs animées pour feedback visuel
  const seekFeedbackOpacity = useSharedValue(0);
  const seekFeedbackScale = useSharedValue(0.8);
  const controlsOpacity = useSharedValue(1);

  const {width, height} = Dimensions.get('window');
  const maxRetries = 3;

  // 🎯 PHASE 2: Auto-hide contrôles avec animations + DEBUG
  useEffect(() => {
    console.log(
      '📍 [DEBUG] Auto-hide effect - showControls:',
      showControls,
      'isFullscreen:',
      isFullscreen,
    );
    if (showControls && isFullscreen) {
      const timer = setTimeout(() => {
        console.log('🕐 [DEBUG] Auto-hiding controls after 3s');
        setShowControls(false);
        controlsOpacity.value = withTiming(0, {duration: 300});
      }, 3000);
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

  // 🎯 HANDLERS VIDÉO (PHASE 2: Améliorés)
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

  // 🎯 CONTRÔLES TACTILES AVANCÉS (PHASE 2: Gestures)
  const togglePlayPause = () => {
    console.log('📍 [DEBUG] togglePlayPause CALLED');
    const newPausedState = !isPaused;
    console.log(
      `📍 [DEBUG] ${newPausedState ? '⏸️' : '▶️'} Toggle play/pause:`,
      newPausedState ? 'PAUSED' : 'PLAYING',
    );
    setIsPaused(newPausedState);
    setShowControls(true);
    console.log('📍 [DEBUG] Setting showControls to true');
    // Animation fluide des contrôles
    controlsOpacity.value = withTiming(1, {duration: 300});
    console.log('📍 [DEBUG] Animation triggered');
  };

  const handleScreenTouch = () => {
    console.log('📍 [DEBUG] 👆 handleScreenTouch CALLED');
    console.log('📍 [DEBUG] Current showControls:', showControls);
    const newShowControls = !showControls;
    console.log('📍 [DEBUG] Setting showControls to:', newShowControls);
    setShowControls(newShowControls);
    // Animation fluide pour montrer/cacher contrôles
    controlsOpacity.value = withTiming(newShowControls ? 1 : 0, {
      duration: 300,
    });
    console.log('📍 [DEBUG] Controls animation triggered');
  };

  // Handlers pour double-tap seek avec LOGS DÉTAILLÉS
  const handleSeekForward = () => {
    console.log('📍 [DEBUG] ⏭️ handleSeekForward CALLED');
    console.log('📍 [DEBUG] videoRef.current:', videoRef.current);
    console.log('📍 [DEBUG] duration:', duration);
    console.log('📍 [DEBUG] currentTime:', currentTime);

    if (videoRef.current && duration > 0) {
      const newTime = Math.min(currentTime + 10, duration);
      console.log('📍 [DEBUG] Seeking to:', newTime);
      videoRef.current.seek(newTime);
      showSeekFeedback('forward', 10);
      console.log('📍 [DEBUG] Seek command sent successfully');
    } else {
      console.log('⚠️ [DEBUG] Cannot seek - videoRef or duration issue');
    }
  };

  const handleSeekBackward = () => {
    console.log('📍 [DEBUG] ⏮️ handleSeekBackward CALLED');
    console.log('📍 [DEBUG] videoRef.current:', videoRef.current);
    console.log('📍 [DEBUG] duration:', duration);
    console.log('📍 [DEBUG] currentTime:', currentTime);

    if (videoRef.current) {
      const newTime = Math.max(currentTime - 10, 0);
      console.log('📍 [DEBUG] Seeking to:', newTime);
      videoRef.current.seek(newTime);
      showSeekFeedback('backward', 10);
      console.log('📍 [DEBUG] Seek command sent successfully');
    } else {
      console.log('⚠️ [DEBUG] Cannot seek - videoRef issue');
    }
  };

  // Feedback visuel pour seek avec LOGS
  const showSeekFeedback = (
    direction: 'forward' | 'backward',
    seconds: number,
  ) => {
    console.log('📍 [DEBUG] showSeekFeedback CALLED:', direction, seconds);
    setSeekFeedback({visible: true, direction, seconds});

    // Animation d'apparition
    seekFeedbackOpacity.value = withTiming(1, {duration: 150});
    seekFeedbackScale.value = withSpring(1, {damping: 15, stiffness: 200});
    console.log('📍 [DEBUG] Seek feedback animation started');

    // Auto-hide après 1 seconde
    setTimeout(() => {
      console.log('📍 [DEBUG] Hiding seek feedback');
      seekFeedbackOpacity.value = withTiming(0, {duration: 300});
      seekFeedbackScale.value = withTiming(0.8, {duration: 300});
      setTimeout(() => {
        runOnJS(setSeekFeedback)({
          visible: false,
          direction: 'forward',
          seconds: 0,
        });
      }, 300);
    }, 1000);
  };

  // Configuration des gestures SIMPLIFIÉE avec TESTS DE BASE
  const leftDoubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onBegin(() => {
      console.log('🔴 [GESTURE] leftDoubleTap BEGAN');
    })
    .onEnd(() => {
      console.log('🔴 [GESTURE] leftDoubleTap END - SEEK BACKWARD');
      runOnJS(handleSeekBackward)();
    });

  const rightDoubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onBegin(() => {
      console.log('🟢 [GESTURE] rightDoubleTap BEGAN');
    })
    .onEnd(() => {
      console.log('🟢 [GESTURE] rightDoubleTap END - SEEK FORWARD');
      runOnJS(handleSeekForward)();
    });

  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .onBegin(() => {
      console.log('🔵 [GESTURE] singleTap BEGAN');
    })
    .onEnd(() => {
      console.log('🔵 [GESTURE] singleTap END - TOGGLE CONTROLS');
      runOnJS(handleScreenTouch)();
    });

  // Gestures spécifiques pour chaque zone avec LOGS DÉTAILLÉS
  const leftSingleTap = Gesture.Tap()
    .numberOfTaps(1)
    .onBegin(() => {
      console.log('🔴 [GESTURE] LEFT singleTap BEGAN');
    })
    .onEnd(() => {
      console.log('🔴 [GESTURE] LEFT singleTap END');
      runOnJS(handleScreenTouch)();
    })
    .requireExternalGestureToFail(leftDoubleTap);

  const rightSingleTap = Gesture.Tap()
    .numberOfTaps(1)
    .onBegin(() => {
      console.log('🟢 [GESTURE] RIGHT singleTap BEGAN');
    })
    .onEnd(() => {
      console.log('🟢 [GESTURE] RIGHT singleTap END');
      runOnJS(handleScreenTouch)();
    })
    .requireExternalGestureToFail(rightDoubleTap);

  const centerSingleTap = Gesture.Tap()
    .numberOfTaps(1)
    .onBegin(() => {
      console.log('🔵 [GESTURE] CENTER singleTap BEGAN');
    })
    .onEnd(() => {
      console.log('🔵 [GESTURE] CENTER singleTap END');
      runOnJS(handleScreenTouch)();
    });

  // Gestures finaux - APPROCHE SIMPLIFIÉE
  const leftSideGesture = Gesture.Race(leftDoubleTap, leftSingleTap);
  const rightSideGesture = Gesture.Race(rightDoubleTap, rightSingleTap);
  const centerGesture = centerSingleTap;

  console.log('📍 [DEBUG] All gestures configured with basic API');

  const handleExitFullscreen = () => {
    console.log('❌ Exiting fullscreen mode (Advanced)');
    onFullscreenToggle?.(false);
  };

  // 🎯 UTILITAIRES (PHASE 2)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Styles animés pour feedback
  const seekFeedbackAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: seekFeedbackOpacity.value,
      transform: [{scale: seekFeedbackScale.value}],
    };
  });

  const controlsAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: controlsOpacity.value,
    };
  });

  // LOGS pour débogage du rendu
  console.log('📍 [DEBUG] Render conditions:');
  console.log('📍 [DEBUG] - channel:', channel?.name || 'null');
  console.log('📍 [DEBUG] - isVisible:', isVisible);
  console.log('📍 [DEBUG] - isFullscreen:', isFullscreen);

  // Ne pas rendre si pas de chaîne ou pas visible
  if (!channel || !isVisible) {
    console.log('⚠️ [DEBUG] Not rendering: missing channel or not visible');
    return null;
  }

  // 🎬 RENDU FULLSCREEN AVEC GESTURES AVANCÉS
  if (!isFullscreen) {
    console.log('⚠️ [DEBUG] Not rendering: not fullscreen');
    return null;
  }

  console.log(
    '✅ [DEBUG] Rendering VideoPlayerModernWithGestures in fullscreen!',
  );
  console.log('📍 [DEBUG] showControls state:', showControls);
  console.log('📍 [DEBUG] controlsOpacity value:', controlsOpacity.value);

  return (
    <Modal
      visible={isFullscreen}
      animationType="slide"
      onRequestClose={handleExitFullscreen}
      supportedOrientations={['landscape-left', 'landscape-right']}
      statusBarTranslucent={true}
      presentationStyle="fullScreen">
      <StatusBar
        hidden={true}
        backgroundColor="#000000"
        translucent={true}
        barStyle="light-content"
      />
      <View style={[styles.fullscreenContainer, {pointerEvents: 'box-none'}]}>
        <View
          style={[
            styles.fullscreenVideoContainer,
            {pointerEvents: 'box-none'},
          ]}>

          {/* 🎯 LECTEUR VIDÉO PRINCIPAL */}
          {!hasError ? (
            <Video
              ref={videoRef}
              source={{
                uri: channel.url,
                headers: {
                  'User-Agent': 'IPTV Smarters Pro',
                  Referer: 'https://www.iptvsmarters.com/',
                  Accept: '*/*',
                  Connection: 'keep-alive',
                },
              }}
              style={[styles.fullscreenVideo, {pointerEvents: 'none'}]}
              resizeMode="contain"
              controls={false}
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

          {/* 🎯 INDICATEUR DE CHARGEMENT */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>⏳ Chargement...</Text>
            </View>
          )}

          {/* 🎯 ZONES GESTUELLES - Style YouTube/TiviMate */}
          {console.log('📍 [DEBUG] Rendering gesture zones...')}
          {console.log('📍 [DEBUG] leftSideGesture:', leftSideGesture)}
          {console.log('📍 [DEBUG] rightSideGesture:', rightSideGesture)}
          {console.log('📍 [DEBUG] centerGesture:', centerGesture)}

          {/* Zone gauche avec TEST TOUCHABLE */}
          <GestureDetector gesture={leftSideGesture}>
            <View
              style={[
                styles.gestureZoneLeft,
                {backgroundColor: 'rgba(255,0,0,0.3)'},
              ]}>
              <Text
                style={{
                  color: 'white',
                  position: 'absolute',
                  top: 10,
                  left: 10,
                  fontSize: 16,
                  fontWeight: 'bold',
                }}>
                LEFT ZONE
              </Text>
              <Text
                style={{
                  color: 'white',
                  position: 'absolute',
                  bottom: 40,
                  left: 10,
                  fontSize: 12,
                }}>
                Double-tap: -10s
              </Text>
              {/* TEST TOUCHABLE SIMPLE */}
              <TouchableOpacity
                style={{
                  position: 'absolute',
                  bottom: 10,
                  left: 10,
                  backgroundColor: 'red',
                  padding: 5,
                  borderRadius: 3,
                }}
                onPress={() => {
                  console.log(
                    '🔴 [TOUCHABLE TEST] LEFT TouchableOpacity PRESSED!',
                  );
                  handleSeekBackward();
                }}>
                <Text style={{color: 'white', fontSize: 10}}>TEST -10s</Text>
              </TouchableOpacity>
            </View>
          </GestureDetector>

          {/* Zone droite avec TEST TOUCHABLE */}
          <GestureDetector gesture={rightSideGesture}>
            <View
              style={[
                styles.gestureZoneRight,
                {backgroundColor: 'rgba(0,255,0,0.3)'},
              ]}>
              <Text
                style={{
                  color: 'white',
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  fontSize: 16,
                  fontWeight: 'bold',
                }}>
                RIGHT ZONE
              </Text>
              <Text
                style={{
                  color: 'white',
                  position: 'absolute',
                  bottom: 40,
                  right: 10,
                  fontSize: 12,
                }}>
                Double-tap: +10s
              </Text>
              {/* TEST TOUCHABLE SIMPLE */}
              <TouchableOpacity
                style={{
                  position: 'absolute',
                  bottom: 10,
                  right: 10,
                  backgroundColor: 'green',
                  padding: 5,
                  borderRadius: 3,
                }}
                onPress={() => {
                  console.log(
                    '🟢 [TOUCHABLE TEST] RIGHT TouchableOpacity PRESSED!',
                  );
                  handleSeekForward();
                }}>
                <Text style={{color: 'white', fontSize: 10}}>TEST +10s</Text>
              </TouchableOpacity>
            </View>
          </GestureDetector>

          {/* Zone centrale avec TEST TOUCHABLE */}
          <GestureDetector gesture={centerGesture}>
            <View
              style={[
                styles.gestureZoneCenter,
                {backgroundColor: 'rgba(0,0,255,0.3)'},
              ]}>
              <Text
                style={{
                  color: 'white',
                  position: 'absolute',
                  top: 10,
                  alignSelf: 'center',
                  fontSize: 16,
                  fontWeight: 'bold',
                }}>
                CENTER ZONE
              </Text>
              <Text
                style={{
                  color: 'white',
                  position: 'absolute',
                  bottom: 40,
                  alignSelf: 'center',
                  fontSize: 12,
                }}>
                Tap: Toggle controls
              </Text>
              {/* TEST TOUCHABLE SIMPLE */}
              <TouchableOpacity
                style={{
                  position: 'absolute',
                  bottom: 10,
                  alignSelf: 'center',
                  backgroundColor: 'blue',
                  padding: 5,
                  borderRadius: 3,
                }}
                onPress={() => {
                  console.log(
                    '🔵 [TOUCHABLE TEST] CENTER TouchableOpacity PRESSED!',
                  );
                  handleScreenTouch();
                }}>
                <Text style={{color: 'white', fontSize: 10}}>TEST TOGGLE</Text>
              </TouchableOpacity>
            </View>
          </GestureDetector>

          {/* 🎯 FEEDBACK VISUEL SEEK - Style YouTube */}
          {seekFeedback.visible && (
            <Animated.View
              style={[
                styles.seekFeedbackContainer,
                seekFeedbackAnimatedStyle,
                {
                  left:
                    seekFeedback.direction === 'backward' ? '20%' : undefined,
                  right:
                    seekFeedback.direction === 'forward' ? '20%' : undefined,
                },
              ]}>
              <Text style={styles.seekFeedbackIcon}>
                {seekFeedback.direction === 'forward' ? '⏭️' : '⏮️'}
              </Text>
              <Text style={styles.seekFeedbackText}>
                {seekFeedback.direction === 'forward' ? '+' : '-'}
                {seekFeedback.seconds}s
              </Text>
            </Animated.View>
          )}

          {/* 🎯 OVERLAY CONTRÔLES TIVIMATE ANIMÉS */}
          {console.log(
            '📍 [DEBUG] Rendering controls overlay, showControls:',
            showControls,
          )}
          <Animated.View
            style={[
              styles.controlsOverlay,
              controlsAnimatedStyle,
              {
                pointerEvents: showControls ? 'auto' : 'none',
                backgroundColor: 'rgba(255,255,0,0.1)',
              },
            ]}>
            {showControls && (
              <>
                {console.log(
                  '📍 [DEBUG] Rendering controls content inside overlay',
                )}
                {/* HEADER: Bouton retour moderne + Info chaîne */}
                <View
                  style={[
                    styles.tiviMateHeader,
                    {backgroundColor: 'rgba(255,0,255,0.3)'},
                  ]}>
                  <TouchableOpacity
                    style={styles.backButtonModern}
                    onPress={handleExitFullscreen}
                    activeOpacity={0.7}>
                    <View style={styles.backIconContainer}>
                      <View style={styles.backArrowModern} />
                      <View style={styles.backLineModern} />
                    </View>
                  </TouchableOpacity>

                <View style={styles.headerChannelInfo}>
                    <Text style={styles.headerChannelName}>{channel.name}</Text>
                    {channel.category && (
                      <Text style={styles.headerChannelCategory}>
                        {channel.category}
                      </Text>
                    )}
                  </View>
                </View>

                {/* CENTER: Bouton Play/Pause TiviMate style */}
                {console.log(
                  '📍 [DEBUG] Rendering play/pause button, isPaused:',
                  isPaused,
                )}
                <View
                  style={[
                    styles.centerControls,
                    {backgroundColor: 'rgba(0,255,255,0.2)'},
                  ]}>
                  <TouchableOpacity
                    style={[
                      styles.playPauseButton,
                      {backgroundColor: 'rgba(255,255,255,0.8)'},
                    ]}
                    onPress={() => {
                      console.log('📍 [DEBUG] Play/Pause button PRESSED!');
                      togglePlayPause();
                    }}
                    activeOpacity={0.7}>
                    <View style={styles.playPauseIcon}>
                      {isPaused ? (
                        <View
                          style={[
                            styles.playTriangle,
                            {borderLeftColor: '#000'},
                          ]}
                        />
                      ) : (
                        <View style={styles.pauseContainer}>
                          <View
                            style={[styles.pauseBar, {backgroundColor: '#000'}]}
                          />
                          <View
                            style={[styles.pauseBar, {backgroundColor: '#000'}]}
                          />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                </View>

                {/* FOOTER: Timeline seulement */}
                <View style={styles.tiviMateFooter}>
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
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
};

// 🎨 STYLES TIVIMATE AVANCÉS (PHASE 2: Gestures + Animations)
const styles = StyleSheet.create({
  // Container principal
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: Platform.OS === 'android' ? 0 : 0,
  },
  fullscreenVideoContainer: {
    flex: 1,
    position: 'relative',
  },
  fullscreenVideo: {
    flex: 1,
    backgroundColor: '#0D0F12',
  },

  // 🎯 ZONES GESTUELLES (Style YouTube/TiviMate) - AVEC DEBUG VISUEL
  gestureZoneLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '30%',
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  gestureZoneRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '30%',
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  gestureZoneCenter: {
    position: 'absolute',
    left: '30%',
    right: '30%',
    top: 0,
    bottom: 0,
    zIndex: 5,
    backgroundColor: 'transparent',
  },

  // 🎯 FEEDBACK VISUEL SEEK
  seekFeedbackContainer: {
    position: 'absolute',
    top: '50%',
    marginTop: -40,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  seekFeedbackIcon: {
    fontSize: 28,
    marginBottom: 5,
    color: '#FFFFFF',
  },
  seekFeedbackText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2,
  },

  // 🎯 OVERLAY CONTRÔLES AVEC ANIMATIONS
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 15,
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

  // 🎯 HEADER TIVIMATE STYLE
  tiviMateHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  backButtonModern: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  backIconContainer: {
    width: 20,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
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
    color: '#1976d2',
    fontSize: 14,
    marginTop: 2,
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 35,
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  playPauseIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
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
    marginLeft: 4,
  },
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

  // 🎯 FOOTER SIMPLE
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
  progressBarContainer: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 1.5,
    overflow: 'hidden',
    marginHorizontal: 0,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#1976d2',
    borderRadius: 1.5,
  },
});

export default VideoPlayerModern;
