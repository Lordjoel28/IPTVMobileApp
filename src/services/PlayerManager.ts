/**
 * 🎬 PlayerManager - Service de gestion des lecteurs vidéo
 * Gère la sélection et le basculement entre différents lecteurs (Default, VLC, MX Player)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {Linking, Platform, Alert} from 'react-native';
import SendIntentAndroid from 'react-native-send-intent';

// Callback pour la navigation vers settings
let navigateToSettingsCallback: (() => void) | null = null;

/**
 * Définit le callback pour naviguer vers les settings
 */
export function setNavigateToSettingsCallback(callback: () => void) {
  navigateToSettingsCallback = callback;
}

export type PlayerType = 'default' | 'vlc';

const PLAYER_PREFERENCE_KEY = '@player_type_preference';

export interface StreamFormat {
  container: string;
  codec?: string;
  protocol: string;
  requiresExternalPlayer: boolean;
  recommendedPlayer: PlayerType;
}

export interface PlayerConfig {
  type: PlayerType;
  name: string;
  supportsInternalPlayback: boolean;
}

class PlayerManager {
  private currentPlayerType: PlayerType = 'default';
  private listeners: Array<(playerType: PlayerType) => void> = [];

  constructor() {
    this.loadPlayerPreference();
  }

  private async loadPlayerPreference() {
    try {
      const saved = await AsyncStorage.getItem(PLAYER_PREFERENCE_KEY);
      if (saved && this.isValidPlayerType(saved)) {
        this.currentPlayerType = saved as PlayerType;
        this.notifyListeners();
      }
    } catch (error) {
      console.error('[PlayerManager] Erreur chargement préférence:', error);
    }
  }

  private isValidPlayerType(type: string): boolean {
    return ['default', 'vlc'].includes(type);
  }

  async setPlayerType(playerType: PlayerType) {
    try {
      await AsyncStorage.setItem(PLAYER_PREFERENCE_KEY, playerType);
      this.currentPlayerType = playerType;
      this.notifyListeners();
      console.log(`[PlayerManager] Lecteur changé vers: ${playerType}`);
    } catch (error) {
      console.error('[PlayerManager] Erreur sauvegarde préférence:', error);
    }
  }

  getPlayerType(): PlayerType {
    return this.currentPlayerType;
  }

  getPlayerConfig(): PlayerConfig {
    const configs: Record<PlayerType, PlayerConfig> = {
      default: {
        type: 'default',
        name: 'Lecteur Par Défaut',
        supportsInternalPlayback: true,
      },
      vlc: {
        type: 'vlc',
        name: 'VLC Player',
        supportsInternalPlayback: false, // Utilise Intent externe
      },
    };
    return configs[this.currentPlayerType];
  }

  /**
   * Ouvre une URL dans VLC Player en utilisant react-native-send-intent
   */
  async openInVLCPlayer(streamUrl: string, title?: string) {
    if (Platform.OS !== 'android') {
      console.warn('[PlayerManager] VLC Player uniquement disponible sur Android');
      return false;
    }

    try {
      const isInstalled = await this.isVLCPlayerInstalled();
      if (!isInstalled) {
        return this.promptInstallVLC(streamUrl, title);
      }

      console.log(`[PlayerManager] Ouverture de VLC avec l'URL: ${streamUrl}`);
      await SendIntentAndroid.openAppWithData(
        'org.videolan.vlc',
        streamUrl,
        'video/*',
        { 'title': title || 'IPTV Stream' }
      );
      return true;
    } catch (error) {
      console.error('[PlayerManager] Erreur ouverture VLC Player:', error);
      Alert.alert(
        'Erreur VLC',
        "Impossible de démarrer la lecture avec VLC. Veuillez vérifier que l'application est à jour.",
      );
      return false;
    }
  }

  /**
   * Vérifie si VLC Player est installé
   */
  async isVLCPlayerInstalled(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }
    try {
      return await SendIntentAndroid.isAppInstalled('org.videolan.vlc');
    } catch (error) {
      console.warn("[PlayerManager] Erreur vérification installation VLC:", error);
      return false;
    }
  }

  private async promptInstallVLC(streamUrl: string, title?: string): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        'VLC Player requis',
        'Cette chaîne nécessite VLC Player pour être lue. Voulez-vous l\'installer depuis le Play Store ?',
        [
          { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
          {
            text: 'Installer',
            onPress: async () => {
              try {
                await Linking.openURL('market://details?id=org.videolan.vlc');
                resolve(false); // L'utilisateur doit revenir manuellement
              } catch (error) {
                console.error('[PlayerManager] Erreur ouverture Play Store:', error);
                resolve(false);
              }
            },
          },
        ],
      );
    });
  }

  
  analyzeStreamFormat(streamUrl: string): StreamFormat {
    const url = streamUrl.toLowerCase();
    let protocol = 'http';
    if (url.startsWith('rtmp://')) protocol = 'rtmp';
    else if (url.startsWith('rtsp://')) protocol = 'rtsp';
    else if (url.includes('m3u8')) protocol = 'hls';
    else if (url.includes('dash')) protocol = 'dash';

    let container = 'mp4';
    if (url.includes('.avi')) container = 'avi';
    else if (url.includes('.mkv')) container = 'mkv';
    else if (url.includes('.flv')) container = 'flv';
    else if (url.includes('.ts')) container = 'mpegts';

    const requiresExternalPlayer =
      ['avi', 'mkv', 'flv', 'rtmp', 'rtsp'].some(f => url.includes(f));

    let recommendedPlayer: PlayerType = 'default';
    if (requiresExternalPlayer) {
      recommendedPlayer = 'vlc'; // VLC recommended for external formats
    }

    return { container, protocol, requiresExternalPlayer, recommendedPlayer };
  }

  requiresExternalPlayer(streamUrl: string): boolean {
    return this.analyzeStreamFormat(streamUrl).requiresExternalPlayer;
  }

  getRecommendedPlayer(streamUrl: string): PlayerType {
    return this.analyzeStreamFormat(streamUrl).recommendedPlayer;
  }

  async openStreamWithBestPlayer(streamUrl: string, title?: string): Promise<{success: boolean, player: PlayerType}> {
    const currentPlayer = this.getPlayerType();

    // If user chose default player and format is supported, use it
    if (currentPlayer === 'default' && !this.requiresExternalPlayer(streamUrl)) {
      return {success: true, player: 'default'};
    }

    // Try with user's preferred player
    try {
      let success = false;

      switch (currentPlayer) {
        case 'vlc':
          success = await this.openInVLCPlayer(streamUrl, title);
          break;
        case 'default':
          // Default player with unsupported format - return error
          success = false;
          break;
      }

      return {success, player: currentPlayer};
    } catch (error) {
      console.error('[PlayerManager] Erreur ouverture:', error);
      return {success: false, player: currentPlayer};
    }
  }

  addListener(listener: (playerType: PlayerType) => void) {
    this.listeners.push(listener);
  }

  removeListener(listener: (playerType: PlayerType) => void) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentPlayerType));
  }

  /**
   * Affiche un message d'erreur format non supporté
   */
  showFormatNotSupportedError(streamUrl: string, currentFormat?: string) {
    const detectedFormat = currentFormat || this.detectFormat(streamUrl);

    Alert.alert(
      'Format non supporté',
      `Ce format (${detectedFormat}) n'est pas supporté par ce lecteur.\n\n` +
      `Solution: Allez dans Settings → Player et choisissez "VLC Player" pour lire ce type de chaîne.\n\n` +
      `Formats VLC: AVI, MKV, FLV, RTMP, RTSP`,
      [
        {
          text: 'OK',
          style: 'default',
        },
        {
          text: 'Ouvrir Settings',
          onPress: () => {
            // Utiliser le callback pour naviguer vers les settings
            if (navigateToSettingsCallback) {
              navigateToSettingsCallback();
            } else {
              console.log('[PlayerManager] Callback navigation non défini');
            }
          },
        },
      ]
    );
  }

  /**
   * Détecte le format vidéo à partir de l'URL
   */
  private detectFormat(streamUrl: string): string {
    const url = streamUrl.toLowerCase();

    if (url.includes('.avi')) return 'AVI';
    if (url.includes('.mkv')) return 'MKV';
    if (url.includes('.flv')) return 'FLV';
    if (url.startsWith('rtmp://')) return 'RTMP';
    if (url.startsWith('rtsp://')) return 'RTSP';
    if (url.includes('.wmv')) return 'WMV';

    return 'Inconnu';
  }

  async resetToDefault() {
    await this.setPlayerType('default');
  }
}

export const playerManager = new PlayerManager();
