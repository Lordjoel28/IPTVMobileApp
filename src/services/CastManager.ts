/**
 * 📺 CastManager - Service de gestion Chromecast
 * Architecture modulaire compatible avec l'écosystème IPTV
 */

import GoogleCast, {
  CastDevice,
  MediaInfo,
  MediaLoadRequest,
  CastState,
} from 'react-native-google-cast';
import { EventEmitter } from 'eventemitter3';
import { Platform, PermissionsAndroid } from 'react-native';

export interface CastChannel {
  url: string;
  title: string;
  subtitle?: string;
  logo?: string;
  metadata?: {
    studio?: string;
    genre?: string;
  };
}

export interface CastStatus {
  isConnected: boolean;
  deviceName?: string;
  mediaTitle?: string;
  mediaSubtitle?: string;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isBuffering: boolean;
}

export class CastManager extends EventEmitter {
  private static instance: CastManager;
  private castState: CastState = CastState.NO_DEVICES_AVAILABLE;
  private currentDevice: CastDevice | null = null;
  private currentChannel: CastChannel | null = null;

  constructor() {
    super();
    this.initialize();
    console.log('📺 CastManager initialized');
  }

  /**
   * Singleton pattern pour compatibilité architecture existante
   */
  public static getInstance(): CastManager {
    if (!CastManager.instance) {
      CastManager.instance = new CastManager();
    }
    return CastManager.instance;
  }

  /**
   * Support pour injection de dépendances (DI)
   */
  public static async createFromDI(): Promise<CastManager> {
    try {
      return new CastManager();
    } catch (error) {
      console.error('❌ Failed to create CastManager from DI:', error);
      return CastManager.getInstance();
    }
  }

  /**
   * Initialiser les listeners Google Cast
   */
  private async initialize(): Promise<void> {
    try {
      // Demander les permissions de localisation pour la découverte Cast
      await this.requestCastPermissions();

      const sessionManager = GoogleCast.getSessionManager();

      // Listener pour changement d'état du Cast
      GoogleCast.onCastStateChanged((state: CastState) => {
        console.log('📺 [CastManager] Cast state changed:', state);
        this.castState = state;
        this.emit('castStateChanged', state);
      });

      // Listener pour connexion appareil
      sessionManager.onSessionStarted(async (session) => {
        console.log('✅ [CastManager] Cast session started');
        const device = await session.getCastDevice();
        if (device) {
          console.log('📱 [CastManager] Device connected:', device.deviceName);
          this.currentDevice = device;
          this.emit('deviceConnected', device);
        }
      });

      // Listener pour déconnexion appareil
      sessionManager.onSessionEnded((session, error) => {
        console.log('❌ [CastManager] Cast session ended - Error:', error || 'None');
        this.currentDevice = null;
        this.currentChannel = null;
        this.emit('deviceDisconnected');
      });

      // Listener pour erreur de session
      sessionManager.onSessionStartFailed((session, error) => {
        console.error('❌ [CastManager] Session start failed:', error);
      });

      console.log('✅ [CastManager] Listeners initialized');
    } catch (error) {
      console.error('❌ [CastManager] Error initializing:', error);
    }
  }

  /**
   * Demander les permissions nécessaires pour Cast
   * Android 13+ : NEARBY_WIFI_DEVICES
   * Android 12 et inférieur : ACCESS_FINE_LOCATION
   */
  private async requestCastPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const androidVersion = Platform.Version;
      console.log('📱 [CastManager] Android API Level:', androidVersion);

      // Android 13+ (API 33+) : utiliser NEARBY_WIFI_DEVICES
      if (androidVersion >= 33) {
        const granted = await PermissionsAndroid.request(
          'android.permission.NEARBY_WIFI_DEVICES' as any,
          {
            title: 'Appareils WiFi à proximité',
            message: 'Cette permission est nécessaire pour découvrir les appareils Cast (Chromecast, TV) sur votre réseau WiFi',
            buttonNeutral: 'Plus tard',
            buttonNegative: 'Refuser',
            buttonPositive: 'Accepter',
          }
        );

        const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
        console.log('📍 [CastManager] NEARBY_WIFI_DEVICES permission:', isGranted ? 'Granted ✅' : 'Denied ❌');

        return isGranted;
      } else {
        // Android 12 et inférieur : utiliser ACCESS_FINE_LOCATION
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Permission de localisation',
            message: 'Cette permission est nécessaire pour découvrir les appareils Cast sur votre réseau WiFi',
            buttonNeutral: 'Plus tard',
            buttonNegative: 'Refuser',
            buttonPositive: 'Accepter',
          }
        );

        const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
        console.log('📍 [CastManager] ACCESS_FINE_LOCATION permission:', isGranted ? 'Granted ✅' : 'Denied ❌');

        return isGranted;
      }
    } catch (error) {
      console.error('❌ [CastManager] Error requesting permissions:', error);
      return false;
    }
  }

  /**
   * Ouvrir le dialogue de sélection d'appareil Cast
   */
  async showDeviceDialog(): Promise<boolean> {
    try {
      // Demander les permissions d'abord
      const hasPermissions = await this.requestCastPermissions();

      if (!hasPermissions) {
        console.warn('⚠️ [CastManager] Cast permissions not granted');
        return false;
      }

      return await GoogleCast.showCastDialog();
    } catch (error) {
      console.error('❌ [CastManager] Error showing cast dialog:', error);
      throw error;
    }
  }

  /**
   * Caster une chaîne IPTV
   */
  async castChannel(channel: CastChannel): Promise<void> {
    try {
      console.log('📺 [CastManager] Casting channel:', channel.title);
      console.log('📺 [CastManager] Channel URL:', channel.url);

      // Obtenir la session Cast actuelle
      const sessionManager = GoogleCast.getSessionManager();
      const session = await sessionManager.getCurrentCastSession();

      if (!session) {
        console.error('❌ [CastManager] No active cast session');
        throw new Error('No active cast session');
      }

      console.log('✅ [CastManager] Session active - ID:', session.id);

      // Obtenir les infos du device
      const device = await session.getCastDevice();
      console.log('📱 [CastManager] Device:', device?.deviceName || 'Unknown');

      const mediaInfo: MediaInfo = {
        contentUrl: channel.url,
        contentType: 'application/x-mpegURL', // HLS
        metadata: {
          type: 'movie', // Ou 'tvShow' selon le type
          title: channel.title,
          subtitle: channel.subtitle,
          images: channel.logo ? [{ url: channel.logo }] : [],
          studio: channel.metadata?.studio,
        },
      };

      console.log('📦 [CastManager] MediaInfo créé:', {
        contentUrl: mediaInfo.contentUrl,
        contentType: mediaInfo.contentType,
        title: mediaInfo.metadata?.title,
      });

      const request: MediaLoadRequest = {
        mediaInfo,
        autoplay: true,
        currentTime: 0,
      };

      console.log('🚀 [CastManager] Envoi de la requête loadMedia...');

      // Utiliser le RemoteMediaClient pour charger le média
      const client = session.client;

      try {
        await client.loadMedia(request);
        console.log('✅ [CastManager] loadMedia() successful');
      } catch (loadError) {
        console.error('❌ [CastManager] loadMedia() failed:', loadError);
        console.error('❌ [CastManager] Error details:', JSON.stringify(loadError, null, 2));
        throw loadError;
      }

      this.currentChannel = channel;
      this.emit('channelCasted', channel);

      console.log('✅ [CastManager] Channel casted successfully');

      // Vérifier le status après un court délai
      setTimeout(async () => {
        try {
          const mediaStatus = await client.getMediaStatus();
          console.log('📊 [CastManager] Media status après cast:', {
            playerState: mediaStatus?.playerState,
            streamPosition: mediaStatus?.streamPosition,
            idleReason: mediaStatus?.idleReason,
          });
        } catch (e) {
          console.error('❌ [CastManager] Error getting media status:', e);
        }
      }, 2000);

    } catch (error) {
      console.error('❌ [CastManager] Error casting channel:', error);
      console.error('❌ [CastManager] Error stack:', error instanceof Error ? error.stack : 'No stack');
      throw error;
    }
  }

  /**
   * Contrôles de lecture
   */
  async play(): Promise<void> {
    try {
      const sessionManager = GoogleCast.getSessionManager();
      const session = await sessionManager.getCurrentCastSession();

      if (session) {
        await session.client.play();
        this.emit('playbackChanged', { isPlaying: true });
      }
    } catch (error) {
      console.error('❌ Error playing:', error);
    }
  }

  async pause(): Promise<void> {
    try {
      const sessionManager = GoogleCast.getSessionManager();
      const session = await sessionManager.getCurrentCastSession();

      if (session) {
        await session.client.pause();
        this.emit('playbackChanged', { isPlaying: false });
      }
    } catch (error) {
      console.error('❌ Error pausing:', error);
    }
  }

  async stop(): Promise<void> {
    try {
      const sessionManager = GoogleCast.getSessionManager();
      const session = await sessionManager.getCurrentCastSession();

      if (session) {
        await session.client.stop();
        this.currentChannel = null;
        this.emit('playbackStopped');
      }
    } catch (error) {
      console.error('❌ Error stopping:', error);
    }
  }

  async seek(position: number): Promise<void> {
    try {
      const sessionManager = GoogleCast.getSessionManager();
      const session = await sessionManager.getCurrentCastSession();

      if (session) {
        await session.client.seek({ position });
      }
    } catch (error) {
      console.error('❌ Error seeking:', error);
    }
  }

  /**
   * Déconnecter du Cast
   */
  async disconnect(): Promise<void> {
    try {
      const sessionManager = GoogleCast.getSessionManager();
      await sessionManager.endCurrentSession(true);
      this.currentDevice = null;
      this.currentChannel = null;
      console.log('✅ Cast disconnected');
    } catch (error) {
      console.error('❌ Error disconnecting:', error);
    }
  }

  /**
   * Obtenir l'état actuel du Cast
   */
  async getStatus(): Promise<CastStatus> {
    try {
      const sessionManager = GoogleCast.getSessionManager();
      const session = await sessionManager.getCurrentCastSession();
      const castState = await GoogleCast.getCastState();
      const isConnected = castState === CastState.CONNECTED;

      if (!session) {
        return {
          isConnected: false,
          currentTime: 0,
          duration: 0,
          isPlaying: false,
          isBuffering: false,
        };
      }

      const device = await session.getCastDevice();
      const mediaStatus = await session.client.getMediaStatus();

      return {
        isConnected,
        deviceName: device?.deviceName,
        mediaTitle: this.currentChannel?.title,
        mediaSubtitle: this.currentChannel?.subtitle,
        currentTime: mediaStatus?.streamPosition || 0,
        duration: mediaStatus?.mediaInfo?.streamDuration || 0,
        isPlaying: mediaStatus?.playerState === 2, // PLAYING = 2
        isBuffering: mediaStatus?.playerState === 3, // BUFFERING = 3
      };
    } catch (error) {
      console.error('❌ Error getting cast status:', error);
      return {
        isConnected: false,
        currentTime: 0,
        duration: 0,
        isPlaying: false,
        isBuffering: false,
      };
    }
  }

  /**
   * Vérifier si un appareil Cast est connecté
   */
  async isConnected(): Promise<boolean> {
    try {
      const state = await GoogleCast.getCastState();
      return state === CastState.CONNECTED;
    } catch (error) {
      return false;
    }
  }

  /**
   * Vérifier si des appareils Cast sont disponibles
   */
  async hasDevicesAvailable(): Promise<boolean> {
    try {
      const state = await GoogleCast.getCastState();
      return state !== CastState.NO_DEVICES_AVAILABLE;
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtenir l'appareil actuellement connecté
   */
  getCurrentDevice(): CastDevice | null {
    return this.currentDevice;
  }

  /**
   * Obtenir la chaîne en cours de diffusion
   */
  getCurrentChannel(): CastChannel | null {
    return this.currentChannel;
  }

  /**
   * Nettoyage des ressources
   */
  async cleanup(): Promise<void> {
    try {
      await this.disconnect();
      this.removeAllListeners();
      console.log('🧹 CastManager cleaned up');
    } catch (error) {
      console.error('❌ Error cleaning up CastManager:', error);
    }
  }
}

// Export singleton instance
export const castManager = CastManager.getInstance();
