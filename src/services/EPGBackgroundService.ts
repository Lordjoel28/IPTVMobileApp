
/**
 * 🚀 EPG Background Service - Service centralisé pour le chargement de l'EPG
 *
 * Architecture V2 (Observable & Indexed):
 * ✅ Singleton pour gérer un seul état EPG pour toute l'application.
 * ✅ Système d'abonnement (observable) pour notifier l'UI des changements de statut.
 * ✅ Double indexation : par ID technique (O(1)) et par nom de chaîne normalisé (O(1)).
 * ✅ Logique de correspondance de noms robuste pour lier M3U et EPG.
 * ✅ Persistance du cache optimisé sur le disque, incluant les deux index.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { InteractionManager } from 'react-native';
import { XtreamEPG, FullEPGData, EPGChannel, EPGProgramme } from './XtreamEPGService';

// --- Types et Interfaces ---

type ServiceStatus = 'idle' | 'loading' | 'processing' | 'ready' | 'error';
type UnsubscribeFn = () => void;

interface EPGCache {
  channels: EPGChannel[];
  programsByChannelId: Map<string, EPGProgramme[]>;
  channelNameIndex: Map<string, string>; // Map<normalized_name, channel_id>
  lastUpdated: number | null;
}

// --- Le Service Singleton ---

class EPGBackgroundServiceController {
  private status: ServiceStatus = 'idle';
  private cache: EPGCache = {
    channels: [],
    programsByChannelId: new Map(),
    channelNameIndex: new Map(),
    lastUpdated: null,
  };
  private listeners: Array<() => void> = [];
  private readonly CACHE_KEY = 'epg_background_cache_v2'; // Version up
  private readonly CACHE_TTL = 4 * 60 * 60 * 1000; // 4 heures

  constructor() {
    this.loadCacheFromDisk();
  }

  // --- Méthodes Publiques ---

  public subscribe = (listener: () => void): UnsubscribeFn => {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners = () => {
    this.listeners.forEach(l => l());
  }

  private setStatus = (newStatus: ServiceStatus) => {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.notifyListeners();
    }
  }

  public startLoading = (credentials: any): void => {
    if (this.status === 'loading' || this.status === 'processing') {
      console.log('🔵 [EPGBackgroundService] Le chargement est déjà en cours.');
      return;
    }

    console.log('🚀 [EPGBackgroundService] Déclenchement du chargement en arrière-plan...');
    this.setStatus('loading');

    // Utiliser setTimeout pour casser la chaîne synchrone et libérer l'UI
    setTimeout(async () => {
      try {
        const epgData = await this.fetchFullEPG(credentials);
        if (!epgData) throw new Error("Les données EPG sont vides.");

        this.setStatus('processing');
        console.log("⚙️ [EPGBackgroundService] Données téléchargées, début de l'indexation...");

        // Laisser le temps à l'UI de se mettre à jour avant l'indexation lourde
        setTimeout(() => {
          this.processAndIndexData(epgData);
          this.setStatus('ready');
          console.log('✅ [EPGBackgroundService] EPG prêt et entièrement optimisé.');
          this.saveCacheToDisk();
        }, 50);

      } catch (error) {
        this.setStatus('error');
        console.error('❌ [EPGBackgroundService] Erreur lors du chargement en arrière-plan:', error);
      }
    }, 100); // Délai pour s'assurer que l'UI est déjà en train de se fermer
  }

  public getProgramsForChannelName = (channelName: string): EPGProgramme[] => {
    if (!channelName) return [];
    const normalizedName = this.normalizeName(channelName);

    // 1. Exact match on the normalized name (fastest)
    let channelId = this.cache.channelNameIndex.get(normalizedName);
    if (channelId) {
      return this.cache.programsByChannelId.get(channelId) || [];
    }

    // 2. Fallback to partial match (slower but more robust)
    for (const [key, id] of this.cache.channelNameIndex.entries()) {
      if (key.includes(normalizedName) || normalizedName.includes(key)) {
        channelId = id;
        return this.cache.programsByChannelId.get(channelId) || [];
      }
    }

    return [];
  }

  public getStatus = (): ServiceStatus => this.status;

  // --- Mécanique Interne ---

  private normalizeName = (name: string): string => {
    if (!name) return '';
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private fetchFullEPG = async (credentials: any): Promise<FullEPGData | null> => {
    try {
      console.log('🌐 [EPGBackgroundService] Téléchargement de l\'EPG complet...');
      const epgData = await XtreamEPG.getFullEPG(credentials);
      if (!epgData || epgData.channels.length === 0) {
        console.warn('⚠️ [EPGBackgroundService] Les données EPG reçues sont vides ou invalides.');
        return null;
      }
      console.log(`📥 [EPGBackgroundService] EPG téléchargé: ${epgData.channels.length} chaînes, ${epgData.programmes.length} programmes.`);
      return epgData;
    } catch (error) {
      console.error('❌ [EPGBackgroundService] Échec du téléchargement de l\'EPG:', error);
      return null;
    }
  }

  private processAndIndexData = (epgData: FullEPGData): void => {
    const newProgramIndex = new Map<string, EPGProgramme[]>();
    const newChannelNameIndex = new Map<string, string>();

    // 1. Indexer les programmes par ID de chaîne
    for (const program of epgData.programmes) {
      const channelId = program.channel;
      if (!newProgramIndex.has(channelId)) {
        newProgramIndex.set(channelId, []);
      }
      newProgramIndex.get(channelId)!.push(program);
    }

    // 2. Trier les programmes par date pour chaque chaîne
    for (const programs of newProgramIndex.values()) {
      programs.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    }

    // 3. Indexer les ID de chaînes par nom normalisé
    for (const channel of epgData.channels) {
        const normalizedName = this.normalizeName(channel.displayName);
        if (normalizedName && !newChannelNameIndex.has(normalizedName)) {
            newChannelNameIndex.set(normalizedName, channel.id);
        }
        // Ajouter des variantes pour améliorer la correspondance
        const variations = [
            channel.displayName.replace(/hd|fhd|4k/gi, '').trim(),
        ];
        variations.forEach(variation => {
            const normalizedVariation = this.normalizeName(variation);
            if (normalizedVariation && !newChannelNameIndex.has(normalizedVariation)) {
                newChannelNameIndex.set(normalizedVariation, channel.id);
            }
        });
    }

    this.cache = {
      channels: epgData.channels,
      programsByChannelId: newProgramIndex,
      channelNameIndex: newChannelNameIndex,
      lastUpdated: Date.now(),
    };

    console.log(`⚡️ [EPGBackgroundService] Indexation terminée. ${newProgramIndex.size} chaînes avec EPG, ${newChannelNameIndex.size} noms de chaînes indexés.`);
  }

  // --- Persistance du Cache ---

  private saveCacheToDisk = async (): Promise<void> => {
    try {
      console.log('💾 [EPGBackgroundService] Sauvegarde du cache optimisé sur le disque...');
      const serializableCache = {
        ...this.cache,
        programsByChannelId: Array.from(this.cache.programsByChannelId.entries()),
        channelNameIndex: Array.from(this.cache.channelNameIndex.entries()),
      };
      const jsonValue = JSON.stringify(serializableCache);
      await AsyncStorage.setItem(this.CACHE_KEY, jsonValue);
      console.log('✅ [EPGBackgroundService] Cache sauvegardé.');
    } catch (error) {
      console.error('❌ [EPGBackgroundService] Erreur lors de la sauvegarde du cache:', error);
    }
  }

  private loadCacheFromDisk = async (): Promise<void> => {
    try {
      const jsonValue = await AsyncStorage.getItem(this.CACHE_KEY);
      if (jsonValue === null) {
        this.setStatus('idle');
        return;
      }

      const parsedCache = JSON.parse(jsonValue);

      if (Date.now() - parsedCache.lastUpdated > this.CACHE_TTL) {
        console.log('⌛️ [EPGBackgroundService] Le cache a expiré.');
        await AsyncStorage.removeItem(this.CACHE_KEY);
        this.setStatus('idle');
        return;
      }

      this.cache = {
        ...parsedCache,
        programsByChannelId: new Map(parsedCache.programsByChannelId),
        channelNameIndex: new Map(parsedCache.channelNameIndex),
      };
      this.setStatus('ready');
      console.log(`✅ [EPGBackgroundService] Cache optimisé chargé. ${this.cache.channelNameIndex.size} chaînes indexées.`);

    } catch (error) {
      console.error('❌ [EPGBackgroundService] Erreur lors du chargement du cache:', error);
      this.setStatus('idle');
    }
  }
}

// Exporter une instance unique (Singleton)
export const EPGBackgroundService = new EPGBackgroundServiceController();
