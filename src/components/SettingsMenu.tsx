import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Animated from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialIcons';
import type { ZoomMode, BufferMode } from '../hooks/useVideoSettings';
import {useI18n} from '../hooks/useI18n';
import {useUISettings} from '../stores/UIStore';

// Types pour les pistes
export interface VideoTrack {
  width: number;
  height: number;
  bitrate: number;
  trackId?: number;
  index?: number;
}

export interface AudioTrack {
  language?: string;
  title?: string;
  index: number;
  type?: string;
}

export interface SubtitleTrack {
  language?: string;
  title?: string;
  index: number;
}

export type SubMenuType =
  | 'video'
  | 'audio'
  | 'subtitles'
  | 'display'
  | 'buffer'
  | 'sleeptimer';

interface SettingsMenuProps {
  /** Affichage du menu principal */
  showSettingsMenu: boolean;
  /** Style animé du menu principal */
  settingsMenuAnimatedStyle: any;
  /** Sous-menu actif */
  activeSubMenu: SubMenuType | null;
  /** Style animé du sous-menu */
  subMenuAnimatedStyle: any;

  // États vidéo
  /** Mode de zoom actuel */
  zoomMode: ZoomMode;
  /** Mode de buffer actuel */
  bufferMode: BufferMode;
  /** Minuterie de sommeil (en minutes) */
  sleepTimer: number | null;
  /** Pistes vidéo disponibles */
  availableVideoTracks: VideoTrack[];
  /** Pistes audio disponibles */
  availableAudioTracks: AudioTrack[];
  /** Pistes sous-titres disponibles */
  availableSubtitleTracks: SubtitleTrack[];
  /** Qualité vidéo sélectionnée */
  selectedVideoQuality: string;
  /** Piste audio sélectionnée */
  selectedAudioTrack: number | null;
  /** Sous-titres sélectionnés */
  selectedSubtitleTrack: number | null;

  // États additionnels
  /** Délai audio en millisecondes */
  audioDelay: number;
  /** Délai des sous-titres en millisecondes */
  subtitleDelay: number;
  /** Taille des sous-titres */
  subtitleSize: string;

  // Callbacks
  /** Callback fermeture menu */
  onClose: () => void;
  /** Callback ouverture sous-menu */
  onOpenSubMenu: (subMenu: SubMenuType) => void;
  /** Callback fermeture sous-menu */
  onCloseSubMenu: () => void;
  /** Callback changement mode zoom */
  onZoomModeChange: (mode: ZoomMode) => void;
  /** Callback changement mode buffer */
  onBufferModeChange: (mode: BufferMode) => void;
  /** Callback changement minuterie */
  onSleepTimerChange: (duration: number | null) => void;
  /** Callback changement qualité vidéo */
  onVideoQualityChange: (quality: string) => void;
  /** Callback changement piste audio */
  onAudioTrackChange: (trackIndex: number | null) => void;
  /** Callback changement sous-titres */
  onSubtitleTrackChange: (trackIndex: number | null) => void;
  /** Callback changement délai audio */
  onAudioDelayChange: (delay: number) => void;
  /** Callback changement délai sous-titres */
  onSubtitleDelayChange: (delay: number) => void;
  /** Callback changement taille sous-titres */
  onSubtitleSizeChange: (size: string) => void;
}

/**
 * Menu de paramètres TiviMate avec sous-menus
 * Gère:
 * - Piste vidéo (qualité)
 * - Piste audio
 * - Sous-titres
 * - Mode d'affichage
 * - Contrôle du buffer
 * - Minuterie de sommeil
 */
export const SettingsMenu: React.FC<SettingsMenuProps> = ({
  showSettingsMenu,
  settingsMenuAnimatedStyle,
  activeSubMenu,
  subMenuAnimatedStyle,
  zoomMode,
  bufferMode,
  sleepTimer,
  availableVideoTracks,
  availableAudioTracks,
  availableSubtitleTracks,
  selectedVideoQuality,
  selectedAudioTrack,
  selectedSubtitleTrack,
  audioDelay,
  subtitleDelay,
  subtitleSize,
  onClose,
  onOpenSubMenu,
  onCloseSubMenu,
  onZoomModeChange,
  onBufferModeChange,
  onSleepTimerChange,
  onVideoQualityChange,
  onAudioTrackChange,
  onSubtitleTrackChange,
  onAudioDelayChange,
  onSubtitleDelayChange,
  onSubtitleSizeChange,
}) => {
  const {t: tCommon} = useI18n('common');
  const {t: tPlayer} = useI18n('player');
  const { getMenuAlpha, getScaledTextSize } = useUISettings();

  console.log(`🎨 [SettingsMenu] Menu alpha: ${getMenuAlpha()}, Text scale: ${getScaledTextSize(16)}`);

  if (!showSettingsMenu) {
    return null;
  }

  const getZoomModeLabel = (mode: ZoomMode): string => {
    switch (mode) {
      case 'fit':
        return tPlayer('fit');
      case 'fill':
        return tPlayer('fill');
      case 'stretch':
        return tPlayer('stretch');
      case '4:3':
        return '4:3';
      case '16:9':
        return '16:9';
      default:
        return tPlayer('fit');
    }
  };

  const getBufferModeLabel = (mode: BufferMode): string => {
    switch (mode) {
      case 'auto':
        return tCommon('auto');
      case 'low':
        return tPlayer('fast');
      case 'normal':
        return tPlayer('normalSize');
      case 'high':
        return tPlayer('slow');
      default:
        return tPlayer('normalSize');
    }
  };

  return (
    <>
      {/* Fond transparent pour fermer tous les menus */}
      <TouchableOpacity
        style={styles.settingsBackdrop}
        activeOpacity={1}
        onPress={() => {
          console.log('🎯 [SettingsMenu] Backdrop cliqué - fermeture complète');
          onClose();
          if (activeSubMenu) {
            onCloseSubMenu();
          }
        }}
      />

      {/* Menu principal - Toujours visible */}
      <Animated.View
        style={[styles.settingsMenu, { backgroundColor: getMenuAlpha() }, settingsMenuAnimatedStyle]}
        pointerEvents="auto"
        onStartShouldSetResponder={() => true}>
        <ScrollView
          style={{ maxHeight: 400 }}
          contentContainerStyle={{ paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.settingsMenuItem,
              activeSubMenu === 'video' && styles.settingsMenuItemActive,
            ]}
            onPress={() => onOpenSubMenu('video')}>
            <Icon name="tune" size={22} color="white" />
            <Text style={[styles.settingsMenuText, { fontSize: getScaledTextSize(16) }]}>{tPlayer('videoTrack')}</Text>
            <Icon name="chevron-left" size={20} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.settingsMenuItem,
              activeSubMenu === 'audio' && styles.settingsMenuItemActive,
            ]}
            onPress={() => onOpenSubMenu('audio')}>
            <Icon name="surround-sound" size={22} color="white" />
            <Text style={[styles.settingsMenuText, { fontSize: getScaledTextSize(16) }]}>{tPlayer('audioTrack')}</Text>
            <Icon name="chevron-left" size={20} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.settingsMenuItem,
              activeSubMenu === 'subtitles' && styles.settingsMenuItemActive,
            ]}
            onPress={() => onOpenSubMenu('subtitles')}>
            <Icon name="subtitles" size={22} color="white" />
            <Text style={[styles.settingsMenuText, { fontSize: getScaledTextSize(16) }]}>{tPlayer('subtitles')}</Text>
            <Icon name="chevron-left" size={20} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.settingsMenuItem,
              activeSubMenu === 'display' && styles.settingsMenuItemActive,
            ]}
            onPress={() => onOpenSubMenu('display')}>
            <Icon name="aspect-ratio" size={22} color="white" />
            <Text style={[styles.settingsMenuText, { fontSize: getScaledTextSize(16) }]}>{tPlayer('displayMode')}</Text>
            <Text style={[styles.settingsMenuActiveText, { fontSize: getScaledTextSize(14) }]}>
              {getZoomModeLabel(zoomMode)}
            </Text>
            <Icon name="chevron-left" size={20} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.settingsMenuItem,
              activeSubMenu === 'buffer' && styles.settingsMenuItemActive,
            ]}
            onPress={() => onOpenSubMenu('buffer')}>
            <Icon name="settings-ethernet" size={22} color="white" />
            <Text style={[styles.settingsMenuText, { fontSize: getScaledTextSize(16) }]}>{tPlayer('bufferControl')}</Text>
            <Text style={[styles.settingsMenuActiveText, { fontSize: getScaledTextSize(14) }]}>
              {getBufferModeLabel(bufferMode)}
            </Text>
            <Icon name="chevron-left" size={20} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.settingsMenuItem,
              activeSubMenu === 'sleeptimer' && styles.settingsMenuItemActive,
            ]}
            onPress={() => onOpenSubMenu('sleeptimer')}>
            <Icon name="schedule" size={22} color="white" />
            <Text style={[styles.settingsMenuText, { fontSize: getScaledTextSize(16) }]}>{tPlayer('sleepTimer')}</Text>
            {sleepTimer && (
              <Text style={[styles.settingsMenuActiveText, { fontSize: getScaledTextSize(14) }]}>{sleepTimer} min</Text>
            )}
            <Icon name="chevron-left" size={20} color="white" />
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>

      {/* Sous-menu */}
      {activeSubMenu && (
        <Animated.View
          style={[styles.subMenuContent, { backgroundColor: getMenuAlpha() }, subMenuAnimatedStyle]}
          pointerEvents="auto"
          onStartShouldSetResponder={() => true}>
          <View style={styles.subMenuHeader}>
            <Text style={[styles.subMenuTitle, { fontSize: getScaledTextSize(18) }]}>
              {activeSubMenu === 'video' && tPlayer('videoTrack')}
              {activeSubMenu === 'audio' && tPlayer('audioTrack')}
              {activeSubMenu === 'subtitles' && tPlayer('subtitles')}
              {activeSubMenu === 'display' && tPlayer('displayMode')}
              {activeSubMenu === 'buffer' && tPlayer('bufferControl')}
              {activeSubMenu === 'sleeptimer' && tPlayer('sleepTimer')}
            </Text>
          </View>

          <ScrollView
            style={{ maxHeight: 550 }}
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={true}>
            {/* Minuterie de sommeil */}
            {activeSubMenu === 'sleeptimer' && (
              <View>
                {[null, 10, 15, 20, 30, 45, 60, 90, 120].map(duration => (
                  <TouchableOpacity
                    key={duration ?? 'off'}
                    style={[
                      styles.subMenuItem,
                      sleepTimer === duration && styles.subMenuItemActive,
                    ]}
                    onPress={() => {
                      onSleepTimerChange(duration);
                      // Le sous-menu reste ouvert pour permettre d'autres ajustements
                    }}>
                    <Text style={[styles.subMenuText, { fontSize: getScaledTextSize(13) }]}>
                      {duration === null ? tCommon('disabled') : `${duration} minutes`}
                    </Text>
                    {sleepTimer === duration && (
                      <Icon name="check" size={18} color="#1976d2" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Piste vidéo */}
            {activeSubMenu === 'video' && (
              <View>
                <View style={styles.subMenuSection}>
                  <Text style={[styles.subMenuSectionTitle, { fontSize: getScaledTextSize(13) }]}>
                    {tPlayer('videoQuality')}{' '}
                    {availableVideoTracks.length > 0 &&
                      `(${availableVideoTracks.length} ${tCommon('available')})`}
                  </Text>

                  {/* Option Automatique */}
                  <TouchableOpacity
                    style={[
                      styles.subMenuItem,
                      selectedVideoQuality === 'auto' && styles.subMenuItemActive,
                    ]}
                    onPress={() => {
                      onVideoQualityChange('auto');
                      console.log('📹 [Video] ✅ Qualité changée: Automatique');
                    }}>
                    <Text style={[styles.subMenuText, { fontSize: getScaledTextSize(13) }]}>
                      {tCommon('automatic')} (Adaptative)
                    </Text>
                    {selectedVideoQuality === 'auto' && (
                      <Icon name="check" size={18} color="#1976d2" />
                    )}
                  </TouchableOpacity>

                  {/* Pistes vidéo détectées */}
                  {availableVideoTracks.length > 0 ? (
                    availableVideoTracks
                      .sort(
                        (a, b) =>
                          b.height * b.width * b.bitrate -
                          a.height * a.width * a.bitrate,
                      )
                      .map((track, mapIndex) => {
                        const bitrateKbps = Math.round(track.bitrate / 1000);

                        // Déterminer la résolution et la qualité
                        let resolution: string;
                        let quality: string;

                        if (track.height > 0) {
                          // Si on a une hauteur valide, l'utiliser
                          resolution = `${track.height}p`;
                          quality = track.height >= 1080 ? tPlayer('fullHD') :
                                    track.height >= 720 ? tPlayer('hd') :
                                    track.height >= 480 ? tPlayer('sd') : tPlayer('low');
                        } else {
                          // Sinon, estimer basé sur le bitrate
                          if (bitrateKbps >= 4000) {
                            resolution = '1080p';
                            quality = tPlayer('fullHD');
                          } else if (bitrateKbps >= 2500) {
                            resolution = '720p';
                            quality = tPlayer('hd');
                          } else if (bitrateKbps >= 1000) {
                            resolution = '480p';
                            quality = tPlayer('sd');
                          } else {
                            resolution = 'SD';
                            quality = tPlayer('low');
                          }
                        }

                        // Utiliser trackId ou l'index réel de la piste (pas l'index du map)
                        const trackIndex = track.trackId ?? track.index ?? mapIndex;
                        const trackKey = track.height > 0
                          ? `${track.height}p-${trackIndex}`
                          : `bitrate-${bitrateKbps}-${trackIndex}`;
                        const isSelected = selectedVideoQuality === trackKey;

                        return (
                          <TouchableOpacity
                            key={trackKey}
                            style={[
                              styles.subMenuItem,
                              isSelected && styles.subMenuItemActive,
                            ]}
                            onPress={() => {
                              if (selectedVideoQuality !== trackKey) {
                                onVideoQualityChange(trackKey);
                                console.log(
                                  `📹 [Video] ✅ Qualité changée: ${resolution} (${quality}) - ${bitrateKbps} kbps`,
                                );
                              }
                            }}>
                            <View>
                              <Text style={[styles.subMenuText, { fontSize: getScaledTextSize(13) }]}>
                                {resolution} ({quality})
                              </Text>
                              <Text style={[
                                styles.subMenuText,
                                {
                                  fontSize: 11,
                                  color: '#999',
                                  marginTop: 2,
                                },
                              ]}>
                                {track.width > 0 && track.height > 0
                                  ? `${track.width}x${track.height} • `
                                  : ''}{bitrateKbps} kbps
                              </Text>
                            </View>
                            {isSelected && (
                              <Icon name="check" size={18} color="#1976d2" />
                            )}
                          </TouchableOpacity>
                        );
                      })
                  ) : (
                    <Text style={styles.subMenuNoTracksText}>
                      Aucune piste vidéo détectée
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Piste audio */}
            {activeSubMenu === 'audio' && (
              <View>
                <View style={styles.subMenuSection}>
                  <Text style={[styles.subMenuSectionTitle, { fontSize: getScaledTextSize(13) }]}>
                    {tPlayer('audioTracksAvailable')}{' '}
                    {availableAudioTracks.length > 0 &&
                      `(${availableAudioTracks.length})`}
                  </Text>

                  {/* Option Désactiver */}
                  <TouchableOpacity
                    style={[
                      styles.subMenuItem,
                      selectedAudioTrack === 0 && styles.subMenuItemActive,
                    ]}
                    onPress={() => {
                      onAudioTrackChange(0);
                      console.log('🔇 [Audio] Piste audio désactivée');
                    }}>
                    <Text style={[styles.subMenuText, { fontSize: getScaledTextSize(13) }]}>{tCommon('disabled')}</Text>
                    {selectedAudioTrack === 0 && (
                      <Icon name="check" size={18} color="#1976d2" />
                    )}
                  </TouchableOpacity>

                  {availableAudioTracks.length > 0 ? (
                    availableAudioTracks.map((track, mapIndex) => {
                      // Utiliser l'index réel de la piste, pas celui du map
                      const trackIndex = track.index ?? mapIndex;
                      const isSelected = selectedAudioTrack === trackIndex + 1;
                      const label =
                        track.title ||
                        (track.language === 'fr'
                          ? tPlayer('french')
                          : track.language === 'en'
                          ? tPlayer('english')
                          : track.language === 'qaa'
                          ? tPlayer('originalAudio')
                          : track.language === 'qad'
                          ? tPlayer('audioDescription')
                          : track.language || tCommon('unknown'));

                      return (
                        <TouchableOpacity
                          key={track.index ?? mapIndex}
                          style={[
                            styles.subMenuItem,
                            isSelected && styles.subMenuItemActive,
                          ]}
                          onPress={() => {
                            onAudioTrackChange(trackIndex + 1);
                            console.log(
                              `🔊 [Audio] Piste ${trackIndex + 1} sélectionnée:`,
                              {
                                title: track.title,
                                language: track.language,
                                type: track.type,
                                index: trackIndex,
                              },
                            );
                          }}>
                          <Text style={[styles.subMenuText, { fontSize: getScaledTextSize(13) }]}>{label}</Text>
                          {isSelected && (
                            <Icon name="check" size={18} color="#1976d2" />
                          )}
                        </TouchableOpacity>
                      );
                    })
                  ) : (
                    <Text style={styles.subMenuNoTracksText}>
                      Aucune piste audio détectée
                    </Text>
                  )}
                </View>

                {/* Contrôle du délai audio */}
                <View style={styles.subMenuSection}>
                  <Text style={[styles.subMenuSectionTitle, { fontSize: getScaledTextSize(13) }]}>{tPlayer('audioDelay')}</Text>

                  <View style={styles.audioDelayContainer}>
                    <TouchableOpacity
                      style={styles.audioDelayButton}
                      onPress={() => {
                        const newDelay = Math.max(-1000, audioDelay - 50);
                        onAudioDelayChange(newDelay);
                        console.log(`🔊 [Audio] Délai: ${newDelay}ms`);
                      }}>
                      <Icon name="remove" size={24} color="white" />
                    </TouchableOpacity>

                    <Text style={[styles.audioDelayText, { fontSize: getScaledTextSize(18) }]}>
                      {audioDelay > 0 ? `+${audioDelay}` : audioDelay} ms
                    </Text>

                    <TouchableOpacity
                      style={styles.audioDelayButton}
                      onPress={() => {
                        const newDelay = Math.min(1000, audioDelay + 50);
                        onAudioDelayChange(newDelay);
                        console.log(`🔊 [Audio] Délai: ${newDelay}ms`);
                      }}>
                      <Icon name="add" size={24} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Sous-titres */}
            {activeSubMenu === 'subtitles' && (
              <View>
                <View style={styles.subMenuSection}>
                  <Text style={[styles.subMenuSectionTitle, { fontSize: getScaledTextSize(13) }]}>
                    {tPlayer('subtitlesAvailable')}{' '}
                    {availableSubtitleTracks.length > 0 &&
                      `(${availableSubtitleTracks.length})`}
                  </Text>

                  {/* Option Désactiver */}
                  <TouchableOpacity
                    style={[
                      styles.subMenuItem,
                      selectedSubtitleTrack === 0 && styles.subMenuItemActive,
                    ]}
                    onPress={() => {
                      onSubtitleTrackChange(0);
                      console.log('🚫 [Subtitles] Sous-titres désactivés');
                    }}>
                    <Text style={[styles.subMenuText, { fontSize: getScaledTextSize(13) }]}>{tCommon('disabled')}</Text>
                    {selectedSubtitleTrack === 0 && (
                      <Icon name="check" size={18} color="#1976d2" />
                    )}
                  </TouchableOpacity>

                  {availableSubtitleTracks.length > 0 ? (
                    availableSubtitleTracks.map((track, mapIndex) => {
                      // Utiliser l'index réel de la piste, pas celui du map
                      const trackIndex = track.index ?? mapIndex;
                      const isSelected = selectedSubtitleTrack === trackIndex + 1;
                      const label =
                        track.title ||
                        (track.language === 'fr'
                          ? tPlayer('french')
                          : track.language === 'en'
                          ? tPlayer('english')
                          : track.language === 'qaa'
                          ? tPlayer('originalAudio')
                          : track.language === 'qad'
                          ? tPlayer('audioDescription')
                          : track.language || tCommon('unknown'));

                      return (
                        <TouchableOpacity
                          key={track.index ?? mapIndex}
                          style={[
                            styles.subMenuItem,
                            isSelected && styles.subMenuItemActive,
                          ]}
                          onPress={() => {
                            onSubtitleTrackChange(trackIndex + 1);
                            console.log(
                              `📝 [Subtitles] Sous-titre ${trackIndex + 1} sélectionné:`,
                              {
                                title: track.title,
                                language: track.language,
                                index: trackIndex,
                              },
                            );
                          }}>
                          <Text style={[styles.subMenuText, { fontSize: getScaledTextSize(13) }]}>{label}</Text>
                          {isSelected && (
                            <Icon name="check" size={18} color="#1976d2" />
                          )}
                        </TouchableOpacity>
                      );
                    })
                  ) : (
                    <Text style={styles.subMenuNoTracksText}>
                      Aucun sous-titre détecté
                    </Text>
                  )}
                </View>

                {/* Contrôle du délai des sous-titres */}
                <View style={styles.subMenuSection}>
                  <Text style={[styles.subMenuSectionTitle, { fontSize: getScaledTextSize(13) }]}>{tPlayer('subtitleDelay')}</Text>

                  <View style={styles.audioDelayContainer}>
                    <TouchableOpacity
                      style={styles.audioDelayButton}
                      onPress={() => {
                        const newDelay = Math.max(-1000, subtitleDelay - 50);
                        onSubtitleDelayChange(newDelay);
                        console.log(`📝 [Subtitles] Délai: ${newDelay}ms`);
                      }}>
                      <Icon name="remove" size={24} color="white" />
                    </TouchableOpacity>

                    <Text style={[styles.audioDelayText, { fontSize: getScaledTextSize(18) }]}>
                      {subtitleDelay > 0 ? `+${subtitleDelay}` : subtitleDelay} ms
                    </Text>

                    <TouchableOpacity
                      style={styles.audioDelayButton}
                      onPress={() => {
                        const newDelay = Math.min(1000, subtitleDelay + 50);
                        onSubtitleDelayChange(newDelay);
                        console.log(`📝 [Subtitles] Délai: ${newDelay}ms`);
                      }}>
                      <Icon name="add" size={24} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Taille des sous-titres */}
                <View style={styles.subMenuSection}>
                  <Text style={[styles.subMenuSectionTitle, { fontSize: getScaledTextSize(13) }]}>{tPlayer('subtitleSize')}</Text>

                  {[
                    { key: 'small', label: tCommon('small') },
                    { key: 'normal', label: tCommon('normal') },
                    { key: 'large', label: tCommon('large') },
                    { key: 'xlarge', label: tCommon('xLarge') }
                  ].map(size => (
                    <TouchableOpacity
                      key={size.key}
                      style={[
                        styles.subMenuItem,
                        subtitleSize === size.key && styles.subMenuItemActive,
                      ]}
                      onPress={() => {
                        onSubtitleSizeChange(size.key);
                        console.log(`📝 [Subtitles] Taille: ${size.label}`);
                      }}>
                      <Text style={[styles.subMenuText, { fontSize: getScaledTextSize(13) }]}>{size.label}</Text>
                      {subtitleSize === size.key && (
                        <Icon name="check" size={18} color="#1976d2" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Mode d'affichage */}
            {activeSubMenu === 'display' && (
              <View>
                {(['fit', 'fill', 'stretch', '4:3', '16:9'] as ZoomMode[]).map(
                  mode => (
                    <TouchableOpacity
                      key={mode}
                      style={[
                        styles.subMenuItem,
                        zoomMode === mode && styles.subMenuItemActive,
                      ]}
                      onPress={() => {
                        onZoomModeChange(mode);
                        console.log(`📐 [Display] Mode changé: ${mode}`);
                      }}>
                      <Text style={[styles.subMenuText, { fontSize: getScaledTextSize(13) }]}>
                        {getZoomModeLabel(mode)}
                      </Text>
                      {zoomMode === mode && (
                        <Icon name="check" size={18} color="#1976d2" />
                      )}
                    </TouchableOpacity>
                  ),
                )}
              </View>
            )}

            {/* Contrôle du buffer */}
            {activeSubMenu === 'buffer' && (
              <View>
                {(['auto', 'low', 'normal', 'high'] as BufferMode[]).map(mode => (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.subMenuItem,
                      bufferMode === mode && styles.subMenuItemActive,
                    ]}
                    onPress={() => {
                      onBufferModeChange(mode);
                      console.log(`🌐 [Buffer] Mode changé: ${mode}`);
                    }}>
                    <Text style={[styles.subMenuText, { fontSize: getScaledTextSize(13) }]}>
                      {getBufferModeLabel(mode)}
                    </Text>
                    {bufferMode === mode && (
                      <Icon name="check" size={18} color="#1976d2" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </Animated.View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  settingsBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    zIndex: 99999,
  },
  settingsMenu: {
    position: 'absolute',
    top: 72,
    right: 16,
    backgroundColor: 'rgba(20, 20, 20, 0.7)',
    borderRadius: 16,
    paddingVertical: 6,
    minWidth: 280,
    maxWidth: 320,
    zIndex: 999999,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  settingsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    gap: 10,
  },
  settingsMenuItemActive: {
    backgroundColor: 'rgba(25, 118, 210, 0.15)',
    borderLeftWidth: 3,
    borderLeftColor: '#1976d2',
    borderRadius: 8,
  },
  settingsMenuText: {
    flex: 1,
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  settingsMenuActiveText: {
    color: '#90caf9',
    fontSize: 12,
    marginRight: 4,
  },
  subMenuContent: {
    position: 'absolute',
    top: 72,
    right: 312,
    backgroundColor: 'rgba(20, 20, 20, 0.7)',
    borderRadius: 16,
    paddingVertical: 6,
    minWidth: 280,
    maxWidth: 320,
    zIndex: 100001,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  subMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  subMenuTitle: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  subMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  subMenuItemActive: {
    backgroundColor: 'rgba(25, 118, 210, 0.15)',
    borderRadius: 8,
  },
  subMenuText: {
    flex: 1,
    color: 'white',
    fontSize: 13,
  },
  subMenuSection: {
    paddingVertical: 8,
  },
  subMenuSectionTitle: {
    color: '#90caf9',
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subMenuNoTracksText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    fontStyle: 'italic',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  audioDelayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginVertical: 8,
    marginHorizontal: 12,
  },
  audioDelayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(25, 118, 210, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioDelayText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 24,
    minWidth: 80,
    textAlign: 'center',
  },
});
