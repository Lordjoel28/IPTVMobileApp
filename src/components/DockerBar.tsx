import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FastImage from 'react-native-fast-image';
import type { Channel } from '../types';
import { EPGData } from '../services/EPGHelper';

interface RecentChannel {
  id: string;
  name: string;
  url: string;
  logo?: string;
  category?: string;
}

interface DockerBarProps {
  /** État de visibilité du docker */
  isVisible: boolean;
  /** Chaîne en cours de lecture */
  channel: Channel | null;
  /** Données EPG actuelles */
  epgData: EPGData | null;
  /** Chaînes récentes */
  recentChannels: RecentChannel[];
  /** Est-ce qu'on vient du multi-écran */
  isFromMultiScreen: boolean;
  /** Est-ce qu'on vient du démarrage automatique */
  isFromAutoStart?: boolean;
  /** Temps actuel de la vidéo */
  currentTime: number;
  /** Durée totale de la vidéo */
  duration: number;

  // Callbacks
  /** Callback ouverture sélecteur de chaînes */
  onChannelsPress: () => void;
  /** Callback ouverture multi-écran */
  onMultiScreenPress: () => void;
  /** Callback lecture d'une chaîne récente */
  onRecentChannelPress: (channel: RecentChannel) => void;
  /** Callback effacement des chaînes récentes */
  onClearRecentChannels: () => void;
  /** Callback début scroll */
  onScrollBegin?: () => void;
  /** Callback fin scroll */
  onScrollEnd?: () => void;
}

/**
 * Barre Docker TiviMate (barre inférieure)
 * Contient:
 * - InfoBar avec EPG (logo, programme actuel, suivant)
 * - Barre de progression EPG/Vidéo
 * - Docker avec boutons et chaînes récentes
 */
export const DockerBar: React.FC<DockerBarProps> = ({
  isVisible,
  channel,
  epgData,
  recentChannels,
  isFromMultiScreen,
  isFromAutoStart = false,
  currentTime,
  duration,
  onChannelsPress,
  onMultiScreenPress,
  onRecentChannelPress,
  onClearRecentChannels,
  onScrollBegin,
  onScrollEnd,
}) => {
  // 🐛 DEBUG: Logs d'état du composant
  React.useEffect(() => {
    console.log('🔍 [DockerBar] État:', {
      isVisible,
      isFromMultiScreen,
      recentChannelsCount: recentChannels.length,
      hasChannel: !!channel,
    });
  }, [isVisible, isFromMultiScreen, recentChannels.length, channel]);

  // Calcul de la progression (EPG prioritaire, sinon temps vidéo)
  const progressPercentage = React.useMemo(() => {
    // Priorité 1: EPG si disponible et valide
    if (epgData && epgData.progressPercentage >= 0) {
      return Math.min(100, Math.max(0, epgData.progressPercentage));
    }
    // Priorité 2: Progression vidéo temps réel
    if (duration > 0 && currentTime >= 0) {
      return Math.min(100, Math.max(0, (currentTime / duration) * 100));
    }
    // Fallback: 0%
    return 0;
  }, [epgData, currentTime, duration]);

  return (
    <View
      style={[
        styles.dockerOverlay,
        {
          pointerEvents: isVisible ? 'box-none' : 'none',
        },
      ]}>
      {isVisible && !isFromMultiScreen && (
        <LinearGradient
          colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.95)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.dockerGradient}
          pointerEvents="box-none">
        {/* InfoBar avec EPG */}
        <View style={styles.infoBar} pointerEvents="box-none">
          {channel?.logo && (
            <FastImage
              source={{ uri: channel.logo }}
              style={styles.infoBarLogo}
              resizeMode={FastImage.resizeMode.contain}
              onError={() =>
                console.log('❌ [DEBUG] Logo failed to load:', channel.logo)
              }
              onLoad={() =>
                console.log('✅ [DEBUG] Logo loaded successfully:', channel.logo)
              }
            />
          )}
          <View style={styles.infoBarDetails}>
            <Text style={styles.infoBarProgramTitle} numberOfLines={1}>
              {epgData?.currentProgram?.title || "Pas d'information"}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginVertical: 4,
              }}>
              <Text style={styles.infoBarProgramTime}>
                {epgData
                  ? `${epgData.programStartTime} - ${epgData.programEndTime}`
                  : "Pas d'information"}
              </Text>
              {epgData && (
                <Text style={styles.infoBarRemainingTime}>
                  {epgData.remainingMinutes} min
                </Text>
              )}
            </View>
            <Text style={styles.infoBarNextProgram} numberOfLines={1}>
              À suivre: {epgData?.nextProgram?.title || "Pas d'information"}
            </Text>
          </View>
        </View>

        {/* Barre de progression principale EPG/Vidéo dynamique */}
        <View style={styles.mainProgressBarContainer}>
          <View
            style={[
              styles.mainProgressBarFill,
              {
                width: `${progressPercentage}%`,
              },
            ]}
          />
          <View
            style={[
              styles.mainProgressHandle,
              {
                left: `${progressPercentage}%`,
              },
            ]}
          />
        </View>

        {/* Docker unifié avec boutons et chaînes récentes dans un seul ScrollView */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dockerContent}
          pointerEvents="auto"
          onScrollBeginDrag={() => {
            console.log('🏃‍♂️ [Scroll] Début du scroll - prolonger délai');
            onScrollBegin?.();
          }}
          onScrollEndDrag={() => {
            console.log('⏸️ [Scroll] Fin du scroll - délai normal');
            setTimeout(() => {
              onScrollEnd?.();
            }, 1000);
          }}>
          {/* Bouton Chaînes - Masqué pendant l'autostart */}
          {!isFromAutoStart && (
            <TouchableOpacity
              style={styles.recentChannelItem}
              onPress={() => {
                console.log('🐛 [DockerBar] Clic Bouton Chaînes');
                onChannelsPress();
              }}>
              <View style={styles.recentChannelPreview}>
                <Icon name="live-tv" size={28} color="#fff" />
                <Text style={styles.dockerButtonTextModern}>Chaînes</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Bouton Multi-écran - Masqué pendant l'autostart */}
          {!isFromAutoStart && (
            <TouchableOpacity
              style={styles.recentChannelItem}
              onPress={() => {
                console.log('🐛 [DockerBar] Clic Bouton Multi-écran');
                onMultiScreenPress();
              }}>
              <View style={styles.recentChannelPreview}>
                <Icon name="view-comfy" size={28} color="#fff" />
                <Text style={styles.dockerButtonTextModern}>Multi-écran</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Chaînes récentes */}
          {recentChannels.map((recentChannel, index) => {
            const isActive = channel?.id === recentChannel.id;

            return (
              <TouchableOpacity
                key={recentChannel.id || `mock-${index}`}
                style={styles.recentChannelItem}
                onPress={() => {
                  console.log('🐛 [DockerBar] Clic chaîne récente:', recentChannel.name);
                  if (recentChannel.url) {
                    onRecentChannelPress(recentChannel);
                  } else {
                    console.warn('⚠️ [DockerBar] Chaîne sans URL:', recentChannel);
                  }
                }}>
                <View
                  style={[
                    styles.recentChannelPreview,
                    isActive
                      ? styles.activeChannelCard
                      : styles.inactiveChannelCard,
                  ]}>
                  {recentChannel.logo ? (
                    <FastImage
                      source={{ uri: recentChannel.logo }}
                      style={styles.recentChannelLogo}
                      resizeMode={FastImage.resizeMode.contain}
                    />
                  ) : (
                    <View style={styles.logoFallback}>
                      <Text style={styles.logoFallbackText}>
                        {(recentChannel.name || 'CH').substring(0, 2)}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Bouton Effacer les chaînes récentes */}
          {recentChannels.length > 0 && (
            <TouchableOpacity
              style={styles.recentChannelItem}
              onPress={onClearRecentChannels}>
              <View style={styles.recentChannelPreview}>
                <Icon name="clear-all" size={24} color="#fff" />
                <Text style={styles.dockerButtonTextModern}>Effacer</Text>
              </View>
            </TouchableOpacity>
          )}
        </ScrollView>
      </LinearGradient>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  dockerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 2400,
  },
  dockerGradient: {
    paddingBottom: 16,
    paddingTop: 32,
  },
  infoBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 12,
  },
  infoBarLogo: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  infoBarDetails: {
    flex: 1,
  },
  infoBarProgramTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  infoBarProgramTime: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  infoBarRemainingTime: {
    fontSize: 11,
    color: '#90caf9',
    marginLeft: 8,
    fontWeight: '500',
  },
  infoBarNextProgram: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  mainProgressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 2,
    position: 'relative',
    overflow: 'visible',
  },
  mainProgressBarFill: {
    height: '100%',
    backgroundColor: '#1976d2',
    borderRadius: 2,
  },
  mainProgressHandle: {
    position: 'absolute',
    top: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1976d2',
    transform: [{ translateX: -6 }],
  },
  dockerContent: {
    paddingHorizontal: 12,
    gap: 12,
    alignItems: 'center',
  },
  recentChannelItem: {
    marginRight: 4,
  },
  recentChannelPreview: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: 'rgba(40, 40, 40, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  activeChannelCard: {
    backgroundColor: 'rgba(60, 60, 60, 1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 12,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  inactiveChannelCard: {
    opacity: 0.7,
  },
  recentChannelLogo: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  logoFallback: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoFallbackText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textTransform: 'uppercase',
  },
  dockerButtonTextModern: {
    fontSize: 11,
    color: 'white',
    marginTop: 4,
    fontWeight: '500',
  },
});
