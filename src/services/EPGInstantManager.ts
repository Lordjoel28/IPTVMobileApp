/**
 * 🚀 EPG Instant Manager - Stratégie hybride optimisée
 * Phase 1: EPG instantané avec background fetch intelligent
 */

import {EPGProgram} from '../types';
import EPGDataManager from './EPGDataManager';

export interface EPGData {
  currentProgram: EPGProgram | null;
  nextProgram: EPGProgram | null;
  progressPercentage: number;
  remainingMinutes: number;
  programStartTime: string;
  programEndTime: string;
  isRealData?: boolean; // Nouveau: indique si les données sont réelles ou instantanées
  lastUpdated?: number; // Nouveau: timestamp de dernière mise à jour
}

class EPGInstantManagerClass {
  // Cache ultra-rapide pour affichage instantané (< 100ms)
  private instantCache = new Map<string, EPGData>();
  private instantCacheTTL = 30 * 1000; // 30 secondes pour l'instant cache

  // Queue des channels en cours de fetch en arrière-plan
  private backgroundFetchQueue = new Set<string>();

  // Listeners pour notifier les mises à jour EPG
  private updateListeners = new Map<string, ((data: EPGData) => void)[]>();

  /**
   * 🎯 STRATÉGIE PRINCIPALE : Obtient EPG instantané + fetch background
   * Retourne immédiatement des données (< 100ms) puis met à jour en arrière-plan
   */
  async getInstantEPG(channelId: string): Promise<EPGData> {
    console.log(`⚡ [EPGInstant DEBUG] Demande EPG instantané pour: ${channelId}`);

    // 1. Vérifier cache instantané (< 1ms)
    const cached = this.instantCache.get(channelId);
    if (cached && this.isCacheValid(cached)) {
      console.log(`✅ [EPGInstant DEBUG] Cache hit instantané pour: ${channelId}`);

      // Déclencher background fetch si données anciennes (> 5min)
      if (!cached.isRealData || (Date.now() - (cached.lastUpdated || 0)) > 5 * 60 * 1000) {
        this.triggerBackgroundFetch(channelId);
      }

      return cached;
    }

    // 2. Générer données instantanées intelligentes
    console.log(`🔄 [EPGInstant DEBUG] Génération données pour: ${channelId}`);
    const instantData = this.generateSmartInstantData(channelId);
    this.instantCache.set(channelId, instantData);

    console.log(`🔥 [EPGInstant DEBUG] Données instantanées générées pour: ${channelId}`, {
      currentProgram: !!instantData.currentProgram,
      nextProgram: !!instantData.nextProgram,
      currentTitle: instantData.currentProgram?.title,
      isRealData: instantData.isRealData
    });

    // 3. Déclencher fetch real EPG en arrière-plan (non-bloquant)
    this.triggerBackgroundFetch(channelId);

    return instantData;
  }

  /**
   * 🔄 Met à jour EPG avec vraies données en arrière-plan
   */
  async updateWithRealEPG(channelId: string): Promise<EPGData | null> {
    if (this.backgroundFetchQueue.has(channelId)) {
      console.log(`⏳ [EPGInstant] Background fetch déjà en cours pour: ${channelId}`);
      return null;
    }

    try {
      this.backgroundFetchQueue.add(channelId);
      console.log(`🔄 [EPGInstant] Début background fetch pour: ${channelId}`);

      // Utiliser EPGDataManager existant pour récupérer vraies données
      const realData = await EPGDataManager.getChannelEPG(channelId, false);

      if (realData) {
        // Marquer comme vraies données
        const enhancedData: EPGData = {
          ...realData,
          isRealData: true,
          lastUpdated: Date.now(),
        };

        // Mettre à jour cache instantané
        this.instantCache.set(channelId, enhancedData);

        console.log(`✅ [EPGInstant] Vraies données EPG récupérées pour: ${channelId}`);

        // Notifier les listeners (UI update)
        this.notifyListeners(channelId, enhancedData);

        return enhancedData;
      }

      return null;
    } catch (error) {
      console.warn(`⚠️ [EPGInstant] Échec background fetch pour ${channelId}:`, error);
      return null;
    } finally {
      this.backgroundFetchQueue.delete(channelId);
    }
  }

  /**
   * 📻 S'abonner aux mises à jour EPG en temps réel
   */
  subscribe(channelId: string, callback: (data: EPGData) => void) {
    if (!this.updateListeners.has(channelId)) {
      this.updateListeners.set(channelId, []);
    }
    this.updateListeners.get(channelId)!.push(callback);

    // Retourner fonction de désabonnement
    return () => {
      const listeners = this.updateListeners.get(channelId);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  /**
   * 🧠 Génère données instantanées intelligentes basées sur l'heure et le channel
   */
  private generateSmartInstantData(channelId: string): EPGData {
    const now = new Date();

    // Calculer slot de programme (programmes de 2h comme TiviMate)
    const startHour = Math.floor(now.getHours() / 2) * 2;
    const startTime = new Date(now);
    startTime.setHours(startHour, 0, 0, 0);

    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + 2);

    // Programme suivant
    const nextStartTime = new Date(endTime);
    const nextEndTime = new Date(nextStartTime);
    nextEndTime.setHours(nextStartTime.getHours() + 2);

    // Calculs de progression précis
    const currentTime = now.getTime();
    const totalDuration = endTime.getTime() - startTime.getTime();
    const elapsed = currentTime - startTime.getTime();

    const progressPercentage = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
    const remainingMinutes = Math.max(0, Math.ceil((endTime.getTime() - currentTime) / (1000 * 60)));

    // Formats d'heure cohérents
    const programStartTime = startTime.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const programEndTime = endTime.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Génération des titres de programmes intelligents
    const currentTitle = this.getSmartProgramTitle(channelId, startHour, now);
    const nextTitle = this.getSmartProgramTitle(channelId, nextStartTime.getHours(), now);

    return {
      currentProgram: {
        id: `instant-current-${channelId}-${startTime.getTime()}`,
        channelId,
        title: currentTitle,
        description: this.getSmartDescription(currentTitle, true),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: 120,
        category: this.getSmartCategory(channelId, startHour),
        isLive: true,
      },
      nextProgram: {
        id: `instant-next-${channelId}-${nextStartTime.getTime()}`,
        channelId,
        title: nextTitle,
        description: this.getSmartDescription(nextTitle, false),
        startTime: nextStartTime.toISOString(),
        endTime: nextEndTime.toISOString(),
        duration: 120,
        category: this.getSmartCategory(channelId, nextStartTime.getHours()),
        isLive: false,
      },
      progressPercentage,
      remainingMinutes,
      programStartTime,
      programEndTime,
      isRealData: false,
      lastUpdated: Date.now(),
    };
  }

  /**
   * 📺 Obtient titre de programme intelligent selon chaîne, heure et jour
   */
  private getSmartProgramTitle(channelId: string, hour: number, date: Date): string {
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    // Base de données programme par chaîne (pattern réaliste français)
    const programsDB = {
      // Chaînes généralistes
      'tf1': {
        weekday: {
          6: 'Bonjour !', 8: 'Télé-achat', 10: 'Coup de pouce pour la planète',
          12: "Les Feux de l'amour", 13: 'Le Journal de 13h', 14: "Les Feux de l'amour",
          17: 'Quatre mariages pour une lune de miel', 18: 'Bienvenue chez nous',
          19: 'Demain nous appartient', 20: 'Le Journal de 20h', 21: 'Koh-Lanta', 23: 'Esprits criminels'
        },
        weekend: {
          8: 'TFou', 10: 'Automoto', 12: 'Reportages', 13: 'Le Journal de 13h',
          16: 'Les docs du dimanche', 18: 'Sept à huit Life', 20: 'Le Journal de 20h',
          21: 'The Voice', 23: 'Esprits criminels'
        }
      },
      'france2': {
        weekday: {
          6: 'Télématin', 9: 'Amour, gloire et beauté', 10: "C'est au programme",
          12: 'Tout le monde veut prendre sa place', 13: 'Journal de 13h', 14: 'Un si grand soleil',
          17: 'Affaire conclue', 19: "N'oubliez pas les paroles", 20: 'Journal de 20h',
          21: 'Envoyé spécial', 23: "Complément d'enquête"
        },
        weekend: {
          8: 'Sagesses bouddhistes', 10: 'Tout compte fait', 12: 'Journal de 13h',
          14: 'Vivement dimanche', 17: 'Stade 2', 19: "N'oubliez pas les paroles",
          20: 'Journal de 20h', 21: 'Les enquêtes de Vera', 23: 'Un soir à la Tour Eiffel'
        }
      },
      // Chaînes info
      'bfmtv': {
        weekday: { 6: 'BFM Matin', 9: 'BFM Story', 12: 'BFM Midi', 14: 'BFM Afternoon', 17: 'BFM Soir', 20: 'BFM Story' },
        weekend: { 8: 'BFM Weekend', 12: 'BFM Midi Weekend', 17: 'BFM Soir Weekend', 20: 'BFM Story' }
      },
      // Chaînes sport
      'lequipe': {
        weekday: { 6: "L'Équipe du matin", 10: "L'Équipe d'Estelle", 14: "L'Équipe TYPE", 18: "L'Équipe du soir", 21: 'Ligue 1' },
        weekend: { 10: "L'Équipe Weekend", 14: 'Ligue 1', 17: 'Premier League', 21: 'NBA' }
      }
    };

    // Détection intelligente du type de chaîne par l'ID
    let channelType = 'default';
    const lowerChannelId = channelId.toLowerCase();

    if (lowerChannelId.includes('tf1')) channelType = 'tf1';
    else if (lowerChannelId.includes('france2') || lowerChannelId.includes('f2')) channelType = 'france2';
    else if (lowerChannelId.includes('bfm')) channelType = 'bfmtv';
    else if (lowerChannelId.includes('equipe')) channelType = 'lequipe';

    const scheduleType = isWeekend ? 'weekend' : 'weekday';
    const channelPrograms = programsDB[channelType]?.[scheduleType];

    if (channelPrograms) {
      // Chercher programme exact ou le plus proche
      const exactProgram = channelPrograms[hour];
      if (exactProgram) return exactProgram;

      const availableHours = Object.keys(channelPrograms).map(Number).sort((a, b) => a - b);
      const closestHour = availableHours.reduce((prev, curr) =>
        Math.abs(curr - hour) < Math.abs(prev - hour) ? curr : prev
      );

      return channelPrograms[closestHour] || this.getGenericProgramTitle(hour);
    }

    return this.getGenericProgramTitle(hour);
  }

  /**
   * 📝 Génère titre générique intelligent selon l'heure
   */
  private getGenericProgramTitle(hour: number): string {
    if (hour >= 6 && hour < 9) return 'Émission matinale';
    if (hour >= 9 && hour < 12) return 'Magazine matinal';
    if (hour >= 12 && hour < 14) return 'Journal et magazine midi';
    if (hour >= 14 && hour < 17) return 'Émission de l\'après-midi';
    if (hour >= 17 && hour < 20) return 'Magazine de fin d\'après-midi';
    if (hour >= 20 && hour < 22) return 'Programme de soirée';
    if (hour >= 22 && hour < 2) return 'Émission de fin de soirée';
    return 'Programme de nuit';
  }

  /**
   * 📄 Génère description intelligente
   */
  private getSmartDescription(title: string, isCurrent: boolean): string {
    const prefix = isCurrent ? 'En cours : ' : 'À suivre : ';

    // Descriptions contextuelles selon le type d'émission
    if (title.toLowerCase().includes('journal')) {
      return `${prefix}${title} - Actualités et informations`;
    }
    if (title.toLowerCase().includes('météo')) {
      return `${prefix}${title} - Prévisions météorologiques`;
    }
    if (title.toLowerCase().includes('sport')) {
      return `${prefix}${title} - Magazine sportif`;
    }

    return `${prefix}${title}`;
  }

  /**
   * 🏷️ Détermine catégorie intelligente
   */
  private getSmartCategory(channelId: string, hour: number): string {
    const lowerChannelId = channelId.toLowerCase();

    if (lowerChannelId.includes('sport') || lowerChannelId.includes('equipe')) {
      return 'Sport';
    }
    if (lowerChannelId.includes('news') || lowerChannelId.includes('bfm') || lowerChannelId.includes('cnews')) {
      return 'Information';
    }
    if (lowerChannelId.includes('kids') || lowerChannelId.includes('toon')) {
      return 'Jeunesse';
    }

    // Catégorie selon l'heure
    if (hour >= 20 && hour < 23) return 'Prime Time';
    if (hour >= 13 && hour < 14) return 'Information';
    if (hour >= 6 && hour < 9) return 'Matinale';

    return 'Général';
  }

  // Méthodes utilitaires

  private isCacheValid(data: EPGData): boolean {
    if (!data.lastUpdated) return false;
    return (Date.now() - data.lastUpdated) < this.instantCacheTTL;
  }

  private triggerBackgroundFetch(channelId: string) {
    // Déclencher en arrière-plan avec délai minimal pour ne pas bloquer l'UI
    setTimeout(() => {
      this.updateWithRealEPG(channelId);
    }, 50); // 50ms délai pour UI fluide
  }

  private notifyListeners(channelId: string, data: EPGData) {
    const listeners = this.updateListeners.get(channelId);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.warn(`⚠️ [EPGInstant] Erreur callback listener:`, error);
        }
      });
    }
  }

  /**
   * 🧹 Nettoyage du cache instantané
   */
  cleanup() {
    const now = Date.now();
    for (const [channelId, data] of this.instantCache.entries()) {
      if (!this.isCacheValid(data)) {
        this.instantCache.delete(channelId);
      }
    }
    console.log(`🧹 [EPGInstant] Cache cleanup: ${this.instantCache.size} entrées restantes`);
  }

  /**
   * 📊 Statistiques du cache instantané
   */
  getStats() {
    return {
      cacheSize: this.instantCache.size,
      backgroundFetchActive: this.backgroundFetchQueue.size,
      listeners: Array.from(this.updateListeners.entries()).reduce((acc, [id, listeners]) => acc + listeners.length, 0),
    };
  }
}

// Export singleton
export const EPGInstantManager = new EPGInstantManagerClass();

// Nettoyage automatique toutes les 2 minutes
setInterval(() => {
  EPGInstantManager.cleanup();
}, 2 * 60 * 1000);