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

// Types pour les pistes
export interface VideoTrack {
  width: number;
  height: number;
  bitrate: number;
  trackId?: number;
}

export interface AudioTrack {
  language?: string;
  title?: string;
  index: number;
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
  if (!showSettingsMenu) {
    return null;
  }

  const getZoomModeLabel = (mode: ZoomMode): string => {
    switch (mode) {
      case 'fit':
        return 'Ajuster';
      case 'fill':
        return 'Remplir';
      case 'stretch':
        return 'Étirer';
      case '4:3':
        return '4:3';
      case '16:9':
        return '16:9';
      default:
        return 'Ajuster';
    }
  };

  const getBufferModeLabel = (mode: BufferMode): string => {
    switch (mode) {
      case 'low':
        return 'Rapide';
      case 'normal':
        return 'Normal';
      case 'high':
        return 'Lent';
      default:
        return 'Normal';
    }
  };

  return (
    <>
      {/* Fond transparent pour fermer le menu */}
      <TouchableOpacity
        style={styles.settingsBackdrop}
        activeOpacity={1}
        onPress={onClose}
      />

      {/* Menu principal */}
      <Animated.View
        style={[styles.settingsMenu, settingsMenuAnimatedStyle]}
        pointerEvents="auto">
        <ScrollView
          style={{ maxHeight: 400 }}
          showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={styles.settingsMenuItem}
            onPress={() => onOpenSubMenu('video')}>
            <Icon name="tune" size={22} color="white" />
            <Text style={styles.settingsMenuText}>Piste vidéo</Text>
            <Icon name="chevron-left" size={20} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsMenuItem}
            onPress={() => onOpenSubMenu('audio')}>
            <Icon name="surround-sound" size={22} color="white" />
            <Text style={styles.settingsMenuText}>Piste audio</Text>
            <Icon name="chevron-left" size={20} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsMenuItem}
            onPress={() => onOpenSubMenu('subtitles')}>
            <Icon name="subtitles" size={22} color="white" />
            <Text style={styles.settingsMenuText}>Sous-titres</Text>
            <Icon name="chevron-left" size={20} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsMenuItem}
            onPress={() => onOpenSubMenu('display')}>
            <Icon name="aspect-ratio" size={22} color="white" />
            <Text style={styles.settingsMenuText}>Mode d'affichage</Text>
            <Text style={styles.settingsMenuActiveText}>
              {getZoomModeLabel(zoomMode)}
            </Text>
            <Icon name="chevron-left" size={20} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsMenuItem}
            onPress={() => onOpenSubMenu('buffer')}>
            <Icon name="settings-ethernet" size={22} color="white" />
            <Text style={styles.settingsMenuText}>Contrôle du buffer</Text>
            <Text style={styles.settingsMenuActiveText}>
              {getBufferModeLabel(bufferMode)}
            </Text>
            <Icon name="chevron-left" size={20} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsMenuItem}
            onPress={() => onOpenSubMenu('sleeptimer')}>
            <Icon name="schedule" size={22} color="white" />
            <Text style={styles.settingsMenuText}>Minuterie de sommeil</Text>
            {sleepTimer && (
              <Text style={styles.settingsMenuActiveText}>{sleepTimer} min</Text>
            )}
            <Icon name="chevron-left" size={20} color="white" />
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>

      {/* Sous-menu */}
      {activeSubMenu && (
        <Animated.View
          style={[styles.subMenuWindow, subMenuAnimatedStyle]}
          pointerEvents="auto">
          <View style={styles.subMenuHeader}>
            <TouchableOpacity onPress={onCloseSubMenu} style={styles.backButton}>
              <Icon name="chevron-right" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.subMenuTitle}>
              {activeSubMenu === 'video' && 'Piste vidéo'}
              {activeSubMenu === 'audio' && 'Piste audio'}
              {activeSubMenu === 'subtitles' && 'Sous-titres'}
              {activeSubMenu === 'display' && "Mode d'affichage"}
              {activeSubMenu === 'buffer' && 'Contrôle du buffer'}
              {activeSubMenu === 'sleeptimer' && 'Minuterie de sommeil'}
            </Text>
          </View>

          <ScrollView
            style={{ maxHeight: 350 }}
            showsVerticalScrollIndicator={false}>
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
                      onCloseSubMenu();
                    }}>
                    <Text style={styles.subMenuText}>
                      {duration === null ? 'Désactivé' : `${duration} minutes`}
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
                  <Text style={styles.subMenuSectionTitle}>
                    Qualité vidéo{' '}
                    {availableVideoTracks.length > 0 &&
                      `(${availableVideoTracks.length} disponibles)`}
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
                    <Text style={styles.subMenuText}>
                      Automatique (Adaptative)
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
                      .map((track, index) => {
                        const resolution = `${track.height}p`;
                        const bitrateKbps = Math.round(track.bitrate / 1000);
                        const quality = track.height >= 1080 ? 'Full HD' :
                                      track.height >= 720 ? 'HD' :
                                      track.height >= 480 ? 'SD' : 'Basse';
                        const trackKey = `${track.height}p-${track.index || index}`;
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
                              <Text style={styles.subMenuText}>
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
                                {track.width}x{track.height} • {bitrateKbps} kbps
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
                  <Text style={styles.subMenuSectionTitle}>
                    Pistes audio disponibles{' '}
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
                    <Text style={styles.subMenuText}>Désactivé</Text>
                    {selectedAudioTrack === 0 && (
                      <Icon name="check" size={18} color="#1976d2" />
                    )}
                  </TouchableOpacity>

                  {availableAudioTracks.length > 0 ? (
                    availableAudioTracks.map((track, index) => {
                      const isSelected = selectedAudioTrack === index + 1;
                      const label =
                        track.title ||
                        (track.language === 'fr'
                          ? 'Français'
                          : track.language === 'en'
                          ? 'Anglais'
                          : track.language === 'qaa'
                          ? 'Audio original'
                          : track.language === 'qad'
                          ? 'Audiodescription'
                          : track.language || 'Inconnu');

                      return (
                        <TouchableOpacity
                          key={track.index}
                          style={[
                            styles.subMenuItem,
                            isSelected && styles.subMenuItemActive,
                          ]}
                          onPress={() => {
                            onAudioTrackChange(index + 1);
                            console.log(
                              `🔊 [Audio] Piste ${index + 1} sélectionnée:`,
                              {
                                title: track.title,
                                language: track.language,
                                type: track.type,
                                index: track.index,
                              },
                            );
                          }}>
                          <Text style={styles.subMenuText}>{label}</Text>
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
                  <Text style={styles.subMenuSectionTitle}>Délai audio</Text>

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

                    <Text style={styles.audioDelayText}>
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

                  <TouchableOpacity
                    style={styles.resetButton}
                    onPress={() => {
                      onAudioDelayChange(0);
                      console.log('🔊 [Audio] Délai réinitialisé');
                    }}>
                    <Icon name="refresh" size={18} color="white" />
                    <Text style={styles.resetButtonText}>Réinitialiser</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Sous-titres */}
            {activeSubMenu === 'subtitles' && (
              <View>
                <View style={styles.subMenuSection}>
                  <Text style={styles.subMenuSectionTitle}>
                    Sous-titres disponibles{' '}
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
                    <Text style={styles.subMenuText}>Désactivé</Text>
                    {selectedSubtitleTrack === 0 && (
                      <Icon name="check" size={18} color="#1976d2" />
                    )}
                  </TouchableOpacity>

                  {availableSubtitleTracks.length > 0 ? (
                    availableSubtitleTracks.map((track, index) => {
                      const isSelected = selectedSubtitleTrack === index + 1;
                      const label =
                        track.title ||
                        (track.language === 'fr'
                          ? 'Français'
                          : track.language === 'en'
                          ? 'Anglais'
                          : track.language === 'qaa'
                          ? 'Original'
                          : track.language === 'qad'
                          ? 'Audiodescription'
                          : track.language || 'Inconnu');

                      return (
                        <TouchableOpacity
                          key={track.index}
                          style={[
                            styles.subMenuItem,
                            isSelected && styles.subMenuItemActive,
                          ]}
                          onPress={() => {
                            onSubtitleTrackChange(index + 1);
                            console.log(
                              `📝 [Subtitles] Sous-titre ${index + 1} sélectionné:`,
                              {
                                title: track.title,
                                language: track.language,
                                index: track.index,
                              },
                            );
                          }}>
                          <Text style={styles.subMenuText}>{label}</Text>
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
                  <Text style={styles.subMenuSectionTitle}>Délai des sous-titres</Text>

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

                    <Text style={styles.audioDelayText}>
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

                  <TouchableOpacity
                    style={styles.resetButton}
                    onPress={() => {
                      onSubtitleDelayChange(0);
                      console.log('📝 [Subtitles] Délai réinitialisé');
                    }}>
                    <Icon name="refresh" size={18} color="white" />
                    <Text style={styles.resetButtonText}>Réinitialiser</Text>
                  </TouchableOpacity>
                </View>

                {/* Taille des sous-titres */}
                <View style={styles.subMenuSection}>
                  <Text style={styles.subMenuSectionTitle}>Taille des sous-titres</Text>

                  {[
                    { key: 'small', label: 'Petit' },
                    { key: 'normal', label: 'Normal' },
                    { key: 'large', label: 'Grand' },
                    { key: 'xlarge', label: 'Très grand' }
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
                      <Text style={styles.subMenuText}>{size.label}</Text>
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
                      <Text style={styles.subMenuText}>
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
                {(['low', 'normal', 'high'] as BufferMode[]).map(mode => (
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
                    <Text style={styles.subMenuText}>
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
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Rendre visible pour debug
    zIndex: 99998,
  },
  settingsMenu: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 280,
    maxWidth: 320,
    zIndex: 99999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  settingsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  settingsMenuText: {
    flex: 1,
    color: 'white',
    fontSize: 15,
    fontWeight: '500',
  },
  settingsMenuActiveText: {
    color: '#90caf9',
    fontSize: 13,
    marginRight: 4,
  },
  subMenuWindow: {
    position: 'absolute',
    top: 60,
    right: 312,
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 280,
    maxWidth: 320,
    zIndex: 100000,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  subMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    marginRight: 8,
  },
  subMenuTitle: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  subMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  subMenuItemActive: {
    backgroundColor: 'rgba(25, 118, 210, 0.15)',
  },
  subMenuText: {
    flex: 1,
    color: 'white',
    fontSize: 14,
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
    borderRadius: 8,
    marginVertical: 8,
  },
  audioDelayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(25, 118, 210, 0.2)',
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
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    borderRadius: 8,
    marginTop: 8,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
  },
});
