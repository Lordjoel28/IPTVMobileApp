/**
 * 🎬 TiviMateOverlay - Interface overlay style TiviMate
 * Se superpose au VideoPlayerSimple sans interférer avec les gestures
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';

interface TiviMateOverlayProps {
  channel?: {
    name: string;
    logo?: string;
    group?: string;
  };
  isVisible: boolean;
  onBackPress: () => void;
  currentTime?: number;
  duration?: number;
  recentChannels?: any[];
}

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

const TiviMateOverlay: React.FC<TiviMateOverlayProps> = ({
  channel,
  isVisible,
  onBackPress,
  currentTime = 0,
  duration = 0,
  recentChannels = [],
}) => {
  // Animation d'opacité pour l'overlay
  const overlayOpacity = useSharedValue(isVisible ? 1 : 0);

  React.useEffect(() => {
    overlayOpacity.value = withTiming(isVisible ? 1 : 0, {duration: 300});
  }, [isVisible, overlayOpacity]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  if (!isVisible) {
    return null;
  }

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Animated.View style={[styles.container, overlayStyle]}>
      {/* 🔹 EN-TÊTE : Bouquet + Heure */}
      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'transparent']}
        style={styles.headerGradient}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBackPress}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={styles.bouquetText}>
              {channel?.group || 'IPTV'} | {channel?.name || 'CHAÎNE'}
            </Text>
          </View>

          <Text style={styles.timeText}>{getCurrentTime()}</Text>
        </View>
      </LinearGradient>

      {/* 🔹 PANNEAU INFO CENTRE-BAS (style TiviMate) */}
      <View style={styles.infoPanel}>
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.9)', 'rgba(0,0,0,0.9)']}
          style={styles.infoPanelGradient}>
          <View style={styles.infoContent}>
            {/* Logo chaîne */}
            <View style={styles.channelLogo}>
              <Icon name="tv" size={32} color="#1976d2" />
            </View>

            {/* Info programme */}
            <View style={styles.programInfo}>
              <Text style={styles.programTitle}>Programme actuel</Text>
              <View style={styles.programDetails}>
                <Text style={styles.programTime}>
                  {Math.floor((currentTime || 0) / 60)
                    .toString()
                    .padStart(2, '0')}
                  :
                  {Math.floor((currentTime || 0) % 60)
                    .toString()
                    .padStart(2, '0')}{' '}
                  —
                  {Math.floor((duration || 0) / 60)
                    .toString()
                    .padStart(2, '0')}
                  :
                  {Math.floor((duration || 0) % 60)
                    .toString()
                    .padStart(2, '0')}
                </Text>
                <View style={styles.programBadges}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>FHD</Text>
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>25 FPS</Text>
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>STÉRÉO</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* 🔹 DOCK CHAÎNES RÉCENTES (bas) */}
      <View style={styles.recentChannelsDock}>
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.dockGradient}>
          <View style={styles.dockContent}>
            {/* Guide TV et Historique */}
            <TouchableOpacity
              style={[styles.dockButton, styles.dockSpecialButton]}>
              <Icon name="apps" size={20} color="#fff" />
              <Text style={styles.dockButtonText}>Guide TV</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dockButton, styles.dockSpecialButton]}>
              <Icon name="history" size={20} color="#fff" />
              <Text style={styles.dockButtonText}>Historique</Text>
            </TouchableOpacity>

            {/* Chaînes récentes simulées */}
            {[1, 2, 3, 4, 5].map((_, index) => (
              <TouchableOpacity key={index} style={styles.channelButton}>
                <View style={styles.channelButtonContent}>
                  <Icon name="tv" size={16} color="#fff" />
                </View>
                <Text style={styles.channelButtonText}>Ch {index + 1}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </LinearGradient>
      </View>

      {/* 🔹 TIMELINE PROGRESS (très fine, en bas) */}
      <View style={styles.timeline}>
        <View style={styles.timelineTrack}>
          <View
            style={[
              styles.timelineProgress,
              {width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`},
            ]}
          />
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none', // IMPORTANT: Laisse passer les touches au VideoPlayer
  },

  // EN-TÊTE
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 20,
    height: 80,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'auto', // IMPORTANT: Active le touch pour ce bouton
  },
  headerInfo: {
    flex: 1,
    marginLeft: 15,
  },
  bouquetText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  timeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },

  // PANNEAU INFO
  infoPanel: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    height: 120,
  },
  infoPanelGradient: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  infoContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  channelLogo: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  programInfo: {
    flex: 1,
  },
  programTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  programDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  programTime: {
    color: '#ccc',
    fontSize: 14,
    marginRight: 12,
  },
  programBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  badge: {
    backgroundColor: 'rgba(25,118,210,0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
    marginTop: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },

  // DOCK CHAÎNES
  recentChannelsDock: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    height: 100,
  },
  dockGradient: {
    flex: 1,
  },
  dockContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  dockButton: {
    alignItems: 'center',
    marginRight: 20,
    pointerEvents: 'auto', // IMPORTANT: Active le touch
  },
  dockSpecialButton: {
    minWidth: 70,
  },
  dockButtonText: {
    color: '#fff',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  channelButton: {
    alignItems: 'center',
    marginRight: 15,
    pointerEvents: 'auto', // IMPORTANT: Active le touch
  },
  channelButtonContent: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  channelButtonText: {
    color: '#ccc',
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },

  // TIMELINE
  timeline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  timelineTrack: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  timelineProgress: {
    height: '100%',
    backgroundColor: '#1976d2',
  },
});

export default TiviMateOverlay;
