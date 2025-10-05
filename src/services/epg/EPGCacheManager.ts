/**
 * 📺 EPG Cache Manager - Cache global partagé pour EPG avec SQLite
 *
 * Cache centralisé avec stockage SQLite persistant
 * Migration depuis AsyncStorage vers SQLite pour performance et volume
 */

import { FullEPGData, EPGChannel } from '../XtreamEPGService';
import { SQLiteEPG } from './SQLiteEPGStorage';
import epgDatabase from './database';
import { Q } from '@nozbe/watermelondb';

/**
 * Parse une date au format XMLTV vers un objet Date JavaScript
 * Format XMLTV: "20250920103300 +0000" -> Date object
 */
function parseEPGDate(dateString: string): Date | null {
  if (!dateString) return null;

  // Regex pour matcher le format XMLTV: YYYYMMDDHHMMSS +HHHMM
  const match = dateString.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*(.*)$/);

  if (match) {
    const [, year, month, day, hour, minute, second] = match;
    // Convertir en format ISO: YYYY-MM-DDTHH:MM:SSZ
    const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
    const date = new Date(isoString);

    // Vérifier que la date est valide
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  console.warn('⚠️ [EPGCacheManager] Format de date XMLTV invalide:', dateString);
  return null;
}

interface CompactProgram {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  isLive: boolean;
  progress?: number;
  duration: number;
  category?: string;
}

// Cache intelligent global hybride (mémoire + SQLite) - TiviMate Style
export const EPGCacheManager = {
  fullEPG: null as FullEPGData | null,
  channelIndex: new Map<string, EPGChannel>(),
  programsCache: new Map<string, CompactProgram[]>(),
  isLoadingFullEPG: false,
  lastFullEPGUpdate: 0,
  isInitialized: false,

  // 🚀 TiviMate Style : État du chargement progressif
  isLoadingChunked: false,
  loadingProgress: 0,
  onProgressCallback: null as ((progress: number) => void) | null,

  // 🎯 TiviMate Style : Session tracking (première utilisation vs redémarrage)
  isFirstSessionAfterDownload: false,

  /**
   * 🚀 TiviMate Style : Initialisation minimale sans chargement automatique
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔄 [EPGCacheManager] Initialisation minimale...');
      await SQLiteEPG.initialize();
      this.isInitialized = true;

      // 🎯 TiviMate Style : Charger le flag de session depuis storage
      this.isFirstSessionAfterDownload = await this.loadFirstSessionFlag();
      if (this.isFirstSessionAfterDownload) {
        console.log('🎯 [EPGCacheManager] Première session après téléchargement détectée - pas de chargement progressif');
      } else {
        console.log('🎯 [EPGCacheManager] Redémarrage normal - chargement progressif TiviMate autorisé');
      }

      console.log('✅ [EPGCacheManager] Prêt pour chargement à la demande');
    } catch (error) {
      console.error('❌ [EPGCacheManager] Erreur initialisation:', error);
      throw error;
    }
  },

  /**
   * Vérifie si le cache EPG est valide (30 minutes)
   */
  isCacheValid(): boolean {
    const now = Date.now();
    const cacheValidityPeriod = 30 * 60 * 1000; // 30 minutes
    return this.fullEPG !== null && (now - this.lastFullEPGUpdate) < cacheValidityPeriod;
  },

  /**
   * Vide complètement le cache EPG (mémoire + SQLite)
   */
  async clearCache(): Promise<void> {
    try {
      // Vider le cache mémoire
      this.fullEPG = null;
      this.channelIndex.clear();
      this.programsCache.clear();
      this.lastFullEPGUpdate = 0;

      // Vider le cache SQLite
      if (this.isInitialized) {
        await SQLiteEPG.clearCache();
      }

      console.log('🗑️ [EPGCacheManager] Cache EPG vidé (mémoire + SQLite)');
    } catch (error) {
      console.error('❌ [EPGCacheManager] Erreur nettoyage cache:', error);
    }
  },

  /**
   * Met à jour le cache avec de nouvelles données EPG (hybride mémoire + SQLite)
   */
  async updateCache(epgData: FullEPGData): Promise<void> {
    try {
      console.log('🔄 [EPGCacheManager] Traitement des données EPG...', epgData.programmes.length, 'programmes bruts');

      // S'assurer que SQLite est initialisé
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Filtrer et valider les programmes avec dates correctes
      const validProgrammes = epgData.programmes.filter(programme => {
        const startDate = parseEPGDate(programme.start);
        const stopDate = parseEPGDate(programme.stop);

        if (!startDate || !stopDate) {
          return false;
        }

        // Garder seulement les programmes des 24 prochaines heures (fenêtre glissante)
        const now = new Date();
        const nextDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        return startDate >= now && startDate <= nextDay;
      });

      // Mettre à jour avec les programmes filtrés
      const filteredEPGData = {
        ...epgData,
        programmes: validProgrammes
      };

      // Sauvegarder en SQLite d'abord (persistant)
      await SQLiteEPG.saveFullEPG(filteredEPGData);

      // Puis mettre à jour le cache mémoire (rapide)
      this.fullEPG = filteredEPGData;
      this.lastFullEPGUpdate = Date.now();
      this.programsCache.clear(); // Vider le cache des programmes

      // 🎯 TiviMate Style : Marquer comme première session après téléchargement
      this.isFirstSessionAfterDownload = true;
      // Persister le flag pour survivre au redémarrage
      await this.saveFirstSessionFlag(true);
      console.log('🎯 [EPGCacheManager] Marqué comme première session après téléchargement EPG');

      console.log('✅ [EPGCacheManager] Cache hybride mis à jour:',
        epgData.channels.length, 'chaînes,',
        validProgrammes.length, 'programmes valides sur', epgData.programmes.length,
        '(SQLite + mémoire)');

    } catch (error) {
      console.error('❌ [EPGCacheManager] Erreur mise à jour cache:', error);

      // Fallback sur cache mémoire seulement
      const filteredEPGData = {
        ...epgData,
        programmes: epgData.programmes.filter(programme => {
          const startDate = parseEPGDate(programme.start);
          const stopDate = parseEPGDate(programme.stop);
          return startDate && stopDate;
        })
      };

      this.fullEPG = filteredEPGData;
      this.lastFullEPGUpdate = Date.now();
      this.programsCache.clear();

      console.log('⚠️ [EPGCacheManager] Fallback sur cache mémoire uniquement');
    }
  },

  /**
   * 🚀 TiviMate Style : Chargement progressif des données existantes
   */
  async loadExistingDataChunked(progressCallback?: (progress: number) => void): Promise<boolean> {
    if (this.isLoadingChunked) {
      console.log('⚠️ [EPGCacheManager] Chargement déjà en cours...');
      return false;
    }

    try {
      // S'assurer que la base est initialisée
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Vérifier si des données existent
      const stats = await SQLiteEPG.getCacheStats();
      console.log('📊 [EPGCacheManager] Stats EPG SQLite:', {
        hasData: stats.hasData,
        channelsCount: stats.channelsCount,
        programmesCount: stats.programmesCount,
        threshold: 1000
      });

      if (!stats.hasData || stats.channelsCount < 1000) {
        console.log('📭 [EPGCacheManager] Aucune donnée EPG valide trouvée - 1er démarrage TiviMate');
        return false;
      }

      // 🎯 TiviMate Style : Vérifier si c'est la première session après téléchargement
      if (this.isFirstSessionAfterDownload) {
        console.log('🎯 [EPGCacheManager] Première session après téléchargement - pas de chargement progressif TiviMate');
        console.log('📭 [EPGCacheManager] Style TiviMate : chargement progressif au prochain redémarrage uniquement');

        // Réinitialiser le flag pour permettre le chargement au prochain redémarrage
        this.isFirstSessionAfterDownload = false;
        await this.saveFirstSessionFlag(false);
        console.log('🎯 [EPGCacheManager] Flag réinitialisé - chargement progressif activé pour le prochain redémarrage');

        return false;
      }

      this.isLoadingChunked = true;
      this.loadingProgress = 0;
      this.onProgressCallback = progressCallback || null;

      console.log('🚀 [EPGCacheManager] Chargement progressif TiviMate style démarré...');
      console.log(`📊 Données trouvées: ${stats.channelsCount} chaînes, ${stats.programmesCount} programmes`);

      // 1. Charger les chaînes d'abord (rapide)
      console.log('📺 [EPGCacheManager] Chargement des chaînes...');
      const channels = await SQLiteEPG.getAllChannels();

      // Créer le cache de base immédiatement
      this.fullEPG = {
        channels,
        programmes: [], // Sera rempli progressivement
        source: 'SQLite chunked loading'
      };

      this.updateProgress(10); // 10% pour les chaînes
      console.log(`✅ [EPGCacheManager] ${channels.length} chaînes chargées`);

      // 2. Charger les programmes par chunks
      const totalPrograms = await SQLiteEPG.getTotalProgramsCount();
      const CHUNK_SIZE = 1500; // Taille optimale TiviMate
      const allPrograms: any[] = [];

      console.log(`📋 [EPGCacheManager] Chargement de ${totalPrograms} programmes par chunks de ${CHUNK_SIZE}...`);

      for (let offset = 0; offset < totalPrograms; offset += CHUNK_SIZE) {
        // Charger chunk
        const chunk = await SQLiteEPG.getProgrammesChunk(offset, CHUNK_SIZE);
        allPrograms.push(...chunk);

        // Mettre à jour la progression (10% pour chaînes + 90% pour programmes)
        const programProgress = Math.round((offset / totalPrograms) * 90);
        this.updateProgress(10 + programProgress);

        console.log(`📈 [EPGCacheManager] Progression: ${this.loadingProgress}% (${offset + chunk.length}/${totalPrograms})`);

        // 🎯 PAUSE CRITIQUE : Laisser respirer l'UI (TiviMate style)
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // 3. Finaliser le cache
      if (this.fullEPG) {
        this.fullEPG.programmes = allPrograms;
      }

      this.lastFullEPGUpdate = Date.now();
      this.updateProgress(100);

      console.log('✅ [EPGCacheManager] Chargement progressif terminé');
      console.log(`📊 Cache final: ${channels.length} chaînes, ${allPrograms.length} programmes`);

      // 🎯 TiviMate Style : Reconstruire l'index après chargement pour optimiser les recherches
      this.buildChannelIndex(channels);

      this.isLoadingChunked = false;
      return true;

    } catch (error) {
      console.error('❌ [EPGCacheManager] Erreur chargement progressif:', error);
      this.isLoadingChunked = false;
      this.updateProgress(0);
      return false;
    }
  },

  /**
   * Met à jour la progression et notifie le callback
   */
  updateProgress(progress: number): void {
    this.loadingProgress = Math.min(100, Math.max(0, progress));
    if (this.onProgressCallback) {
      this.onProgressCallback(this.loadingProgress);
    }
  },

  /**
   * Retourne les statistiques du cache hybride
   */
  async getCacheStats(): Promise<{
    hasData: boolean;
    channelsCount: number;
    programmesCount: number;
    isLoading: boolean;
    lastUpdate: string;
    sqliteStats: {
      hasData: boolean;
      channelsCount: number;
      programmesCount: number;
      lastUpdate: string;
    };
  }> {
    try {
      // Stats du cache mémoire
      const memoryStats = {
        hasData: this.fullEPG !== null,
        channelsCount: this.fullEPG?.channels.length || 0,
        programmesCount: this.fullEPG?.programmes.length || 0,
        isLoading: this.isLoadingFullEPG,
        lastUpdate: this.lastFullEPGUpdate > 0 ? new Date(this.lastFullEPGUpdate).toLocaleString('fr-FR') : 'Jamais',
      };

      // Stats du cache SQLite
      let sqliteStats = {
        hasData: false,
        channelsCount: 0,
        programmesCount: 0,
        lastUpdate: 'Non initialisé'
      };

      if (this.isInitialized) {
        sqliteStats = await SQLiteEPG.getCacheStats();
      }

      return {
        ...memoryStats,
        sqliteStats
      };

    } catch (error) {
      console.error('❌ [EPGCacheManager] Erreur stats cache:', error);
      return {
        hasData: false,
        channelsCount: 0,
        programmesCount: 0,
        isLoading: false,
        lastUpdate: 'Erreur',
        sqliteStats: {
          hasData: false,
          channelsCount: 0,
          programmesCount: 0,
          lastUpdate: 'Erreur'
        }
      };
    }
  },

  /**
   * Récupère les programmes d'une chaîne directement depuis SQLite
   * Performance optimisée pour éviter de charger tout l'EPG en mémoire
   */
  async getProgramsForChannel(channelId: string, startTime?: number, endTime?: number): Promise<CompactProgram[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const programmes = await SQLiteEPG.getProgrammesForChannel(channelId, startTime, endTime);

      // Convertir vers le format CompactProgram
      const compactPrograms: CompactProgram[] = programmes.map(prog => ({
        id: prog.id,
        title: prog.title,
        description: prog.description,
        startTime: new Date(prog.start_time),
        endTime: new Date(prog.end_time),
        isLive: this.isProgramLive(prog.start_time, prog.end_time),
        progress: this.calculateProgress(prog.start_time, prog.end_time),
        duration: prog.duration,
        category: prog.category
      }));

      return compactPrograms;

    } catch (error) {
      console.error('❌ [EPGCacheManager] Erreur récupération programmes SQLite:', error);
      return [];
    }
  },

  /**
   * Vérifie si un programme est en cours
   */
  isProgramLive(startTime: number, endTime: number): boolean {
    const now = Date.now();
    return startTime <= now && now < endTime;
  },

  /**
   * Calcule le pourcentage de progression d'un programme
   */
  calculateProgress(startTime: number, endTime: number): number | undefined {
    const now = Date.now();

    if (now < startTime || now >= endTime) {
      return undefined;
    }

    const duration = endTime - startTime;
    const elapsed = now - startTime;
    return Math.max(0, Math.min(100, (elapsed / duration) * 100));
  },

  /**
   * 🎯 CORRECTION : Restaure les données EPG depuis SQLite au démarrage
   */
  async restoreFromSQLite(): Promise<void> {
    try {
      const stats = await SQLiteEPG.getCacheStats();

      if (stats.hasData) {
        // 🧪 Vérifier si ce sont des données de test à supprimer
        const channels = await this.getChannelsFromSQLite();
        const isTestData = channels.some(ch => ch.id && ch.id.startsWith('test_channel_'));

        if (isTestData) {
          console.log('🧪 [EPGCacheManager] Données de test détectées - nettoyage en cours...');
          await SQLiteEPG.clearCache();
          console.log('🗑️ [EPGCacheManager] Données de test supprimées');
          return;
        }

        // Vérifier si les données sont assez récentes (moins de 24h)
        if (stats.channelsCount < 1000) {
          console.log(`⚠️ [EPGCacheManager] Données trop anciennes ou incomplètes (${stats.channelsCount} chaînes) - ignorer la restauration`);
          return;
        }

        console.log(`🔄 [EPGCacheManager] Restauration depuis SQLite: ${stats.channelsCount} chaînes, ${stats.programmesCount} programmes`);

        // 🚀 OPTIMISATION : Restauration progressive pour éviter le blocage UI
        console.log('🚀 [EPGCacheManager] Restauration progressive démarrée...');

        // Créer un cache basique d'abord (rapide)
        this.fullEPG = {
          channels,
          programmes: [], // Vide au début, sera rempli progressivement
          source: 'SQLite restore (progressive)'
        };

        this.lastFullEPGUpdate = Date.now();
        console.log('⚡ [EPGCacheManager] Cache de base restauré (UI non-bloquée)');

        // Charger les programmes progressivement en arrière-plan
        setTimeout(async () => {
          try {
            console.log('🔄 [EPGCacheManager] Chargement programmes en arrière-plan...');
            const programmes = await this.getProgrammesFromSQLite();

            if (this.fullEPG) {
              this.fullEPG.programmes = programmes;
              console.log('✅ [EPGCacheManager] Programmes chargés en arrière-plan');
            }
          } catch (error) {
            console.error('❌ [EPGCacheManager] Erreur chargement programmes:', error);
          }
        }, 2000); // Délai pour ne pas bloquer l'UI

        console.log('✅ [EPGCacheManager] Cache mémoire restauré depuis persistance SQLite');
      } else {
        console.log('📭 [EPGCacheManager] Aucune donnée persistante trouvée');
      }
    } catch (error) {
      console.error('❌ [EPGCacheManager] Erreur restauration SQLite:', error);
    }
  },

  /**
   * Récupère toutes les chaînes depuis SQLite via les méthodes publiques
   */
  async getChannelsFromSQLite(): Promise<any[]> {
    try {
      // Utiliser l'API SQLiteEPG existante
      const channels = await epgDatabase.get('epg_channels').query().fetch();
      return channels.map((ch: any) => ({
        id: ch.channelId,
        displayName: ch.displayName,
        icon: ch.iconUrl
      }));
    } catch (error) {
      console.error('❌ [EPGCacheManager] Erreur récupération chaînes SQLite:', error);
      return [];
    }
  },

  /**
   * Récupère tous les programmes depuis SQLite via les méthodes publiques
   */
  async getProgrammesFromSQLite(): Promise<any[]> {
    try {
      // Utiliser l'API SQLiteEPG existante
      const programmes = await epgDatabase.get('epg_programmes').query().fetch();
      return programmes.map((prog: any) => ({
        channel: prog.channelId,
        title: prog.title,
        desc: prog.description,
        start: new Date(prog.startTime).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '') + ' +0000',
        stop: new Date(prog.endTime).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '') + ' +0000'
      }));
    } catch (error) {
      console.error('❌ [EPGCacheManager] Erreur récupération programmes SQLite:', error);
      return [];
    }
  },

  /**
   * 🎯 TiviMate Style : Sauvegarder le flag de première session
   */
  async saveFirstSessionFlag(isFirstSession: boolean): Promise<void> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('epg_first_session_after_download', JSON.stringify(isFirstSession));
    } catch (error) {
      console.error('❌ [EPGCacheManager] Erreur sauvegarde flag session:', error);
    }
  },

  /**
   * 🎯 TiviMate Style : Charger le flag de première session
   */
  async loadFirstSessionFlag(): Promise<boolean> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const value = await AsyncStorage.getItem('epg_first_session_after_download');
      return value ? JSON.parse(value) : false;
    } catch (error) {
      console.error('❌ [EPGCacheManager] Erreur chargement flag session:', error);
      return false;
    }
  },

  /**
   * 🎯 TiviMate Style : Récupérer programmes pour une chaîne directement depuis SQLite
   * Utilisé pendant le chargement progressif pour éviter les résultats vides
   */
  async getProgramsForChannelFromSQLite(channelId: string): Promise<any[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Rechercher directement dans SQLite
      const programmes = await epgDatabase.get('epg_programmes')
        .query(Q.where('channel_id', channelId))
        .fetch();

      // Convertir au format attendu
      return programmes.map((prog: any) => ({
        channel: prog.channelId,
        title: prog.title,
        desc: prog.description,
        start: new Date(prog.startTime).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '') + ' +0000',
        stop: new Date(prog.endTime).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '') + ' +0000'
      }));
    } catch (error) {
      console.error('❌ [EPGCacheManager] Erreur recherche programmes SQLite:', error);
      return [];
    }
  },

  /**
   * 🎯 TiviMate Style : Construire l'index des chaînes pour recherche O(1)
   */
  buildChannelIndex(channels: EPGChannel[]) {
    this.channelIndex.clear();
    const normalizeName = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]/g, '');

    channels.forEach(channel => {
      const normalizedName = normalizeName(channel.displayName);
      this.channelIndex.set(normalizedName, channel);

      // Ajouter des variantes communes pour améliorer la correspondance
      const variations = [
        channel.displayName.toLowerCase(),
        channel.displayName.replace(/\s+/g, ''),
        channel.displayName.replace(/hd|fhd|4k/gi, '').trim(),
      ];

      variations.forEach(variation => {
        const normalized = normalizeName(variation);
        if (normalized && normalized !== normalizedName) {
          this.channelIndex.set(normalized, channel);
        }
      });
    });

    console.log('🔍 [EPGCacheManager] Index de chaînes reconstruit:', this.channelIndex.size, 'entrées');
  }
};

export default EPGCacheManager;