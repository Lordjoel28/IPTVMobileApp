/**
 * 🚀 EPG Instant Service - UI Non-Bloquante + Préservation EPG Existant
 *
 * STRATÉGIE HYBRIDE:
 * ✅ Affichage instantané (<100ms) pour débloquer UI immédiatement
 * ✅ Préservation totale des vrais programmes EPG existants
 * ✅ Transition transparente : mockées → vraies données
 * ✅ Compatible avec tous les services EPG existants
 * ✅ Zero impact sur la fonctionnalité actuelle
 */

import {EPGData} from './EPGHelper';
import {EPGOptimized} from './EPGOptimizedService';
import EPGDataManager from './EPGDataManager';

interface EPGCacheEntry {
  data: EPGData;
  timestamp: number;
  isRealData: boolean;
  expiresAt: number;
}

type EPGUpdateListener = (
  channelId: string,
  data: EPGData,
  isRealData: boolean,
) => void;

class EPGInstantServiceClass {
  // Cache ultra-rapide pour affichage instantané
  private instantCache = new Map<string, EPGCacheEntry>();
  private instantCacheTTL = 30 * 1000; // 30s pour données instantanées
  private realDataTTL = 20 * 60 * 1000; // 20min pour vraies données

  // Queue des requêtes background pour vraies données
  private backgroundQueue = new Set<string>();
  private pendingRealFetch = new Map<string, Promise<EPGData | null>>();

  // Listeners pour updates UI en temps réel
  private updateListeners = new Set<EPGUpdateListener>();

  // Métriques pour debugging
  private stats = {
    instantHits: 0,
    realDataFetched: 0,
    backgroundUpdates: 0,
    errors: 0,
  };

  /**
   * 🎯 MÉTHODE PRINCIPALE : Obtenir EPG avec affichage instantané
   *
   * WORKFLOW:
   * 1. Vérifier cache vraies données d'abord
   * 2. Si pas de vraies données → affichage instantané mockées
   * 3. Déclencher fetch background des vraies données
   * 4. Notifier UI quand vraies données arrivent
   */
  async getEPGInstant(channelId: string): Promise<EPGData> {
    console.log(`⚡ [EPGInstant] Demande EPG pour: ${channelId}`);

    // 1. PRIORITÉ : Vraies données si disponibles et fraîches
    const cached = this.instantCache.get(channelId);
    if (cached && cached.isRealData && cached.expiresAt > Date.now()) {
      console.log(
        `✅ [EPGInstant] Vraies données EPG disponibles pour: ${channelId}`,
      );
      this.stats.instantHits++;
      return cached.data;
    }

    // 2. Si vraies données expirées mais encore acceptables (< 1h)
    if (
      cached &&
      cached.isRealData &&
      Date.now() - cached.timestamp < 60 * 60 * 1000
    ) {
      console.log(
        `🔄 [EPGInstant] Vraies données légèrement expirées, refresh background: ${channelId}`,
      );
      this.triggerBackgroundRealFetch(channelId); // Refresh en arrière-plan
      return cached.data;
    }

    // 3. Générer données instantanées intelligentes SEULEMENT si pas de vraies données
    console.log(
      `🔥 [EPGInstant] Génération données instantanées pour: ${channelId}`,
    );
    const instantData = this.generateIntelligentMockData(channelId);

    // Cache les données instantanées avec marqueur
    this.cacheData(channelId, instantData, false);

    // 4. Déclencher fetch des vraies données en arrière-plan (NON-BLOQUANT)
    this.triggerBackgroundRealFetch(channelId);

    this.stats.instantHits++;
    return instantData;
  }

  /**
   * 📻 S'abonner aux mises à jour EPG temps réel
   * Permet à l'UI de recevoir les vraies données quand elles arrivent
   */
  subscribeToUpdates(listener: EPGUpdateListener) {
    this.updateListeners.add(listener);

    // Retourner fonction de désabonnement
    return () => {
      this.updateListeners.delete(listener);
    };
  }

  /**
   * 🔄 Déclencher fetch background des vraies données EPG
   * Cette méthode PRESERVE totalement le système EPG existant
   */
  private triggerBackgroundRealFetch(channelId: string) {
    // Éviter doublons de requêtes
    if (this.backgroundQueue.has(channelId)) {
      console.log(
        `⏳ [EPGInstant] Background fetch déjà en cours pour: ${channelId}`,
      );
      return;
    }

    // Délai minimal pour laisser UI s'afficher d'abord
    setTimeout(() => {
      this.fetchRealEPGBackground(channelId);
    }, 50); // 50ms seulement pour UI fluide
  }

  /**
   * 📡 Fetch des vraies données EPG en arrière-plan (NON-BLOQUANT)
   * Utilise les services EPG existants SANS les modifier
   */
  private async fetchRealEPGBackground(channelId: string): Promise<void> {
    if (this.backgroundQueue.has(channelId)) {
      return;
    }

    try {
      this.backgroundQueue.add(channelId);
      console.log(
        `🔄 [EPGInstant] Début fetch vraies données EPG: ${channelId}`,
      );

      // UTILISER LES SERVICES EXISTANTS - Zéro modification !
      let realEPGData: EPGData | null = null;

      // Essayer EPGOptimized en premier (votre service principal)
      try {
        realEPGData = await EPGOptimized.getChannelEPG(channelId, false);
        console.log(
          `✅ [EPGInstant] EPGOptimized a fourni vraies données: ${channelId}`,
        );
      } catch (error) {
        console.warn(
          `⚠️ [EPGInstant] EPGOptimized échec pour ${channelId}:`,
          error.message,
        );
      }

      // Fallback sur EPGDataManager si EPGOptimized échoue
      if (!realEPGData) {
        try {
          realEPGData = await EPGDataManager.getChannelEPG(channelId, false);
          console.log(
            `✅ [EPGInstant] EPGDataManager a fourni vraies données: ${channelId}`,
          );
        } catch (error) {
          console.warn(
            `⚠️ [EPGInstant] EPGDataManager échec pour ${channelId}:`,
            error.message,
          );
        }
      }

      // Si vraies données obtenues, remplacer les mockées
      if (realEPGData) {
        // Vérifier que ce sont de VRAIES données avec de vrais programmes
        if (this.isRealEPGData(realEPGData)) {
          console.log(
            `🎉 [EPGInstant] Vraies données EPG confirmées pour: ${channelId}`,
            {
              currentProgram: realEPGData.currentProgram?.title,
              nextProgram: realEPGData.nextProgram?.title,
            },
          );

          // Cache les vraies données
          this.cacheData(channelId, realEPGData, true);

          // Notifier tous les listeners UI
          this.notifyListeners(channelId, realEPGData, true);

          this.stats.realDataFetched++;
          this.stats.backgroundUpdates++;
        } else {
          console.warn(
            `⚠️ [EPGInstant] Données EPG invalides reçues pour: ${channelId}`,
          );
        }
      } else {
        console.warn(
          `❌ [EPGInstant] Aucune vraie donnée EPG disponible pour: ${channelId}`,
        );
        this.stats.errors++;
      }
    } catch (error) {
      console.error(
        `❌ [EPGInstant] Erreur fetch background ${channelId}:`,
        error,
      );
      this.stats.errors++;
    } finally {
      this.backgroundQueue.delete(channelId);
    }
  }

  /**
   * 🧠 Générer données instantanées intelligentes (temporaires)
   * Ces données ne remplacent JAMAIS les vraies données EPG
   */
  private generateIntelligentMockData(channelId: string): EPGData {
    const now = new Date();

    // Calculer créneau de programme réaliste (2h comme TiviMate)
    const startHour = Math.floor(now.getHours() / 2) * 2;
    const startTime = new Date(now);
    startTime.setHours(startHour, 0, 0, 0);

    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + 2);

    // Programme suivant
    const nextStartTime = new Date(endTime);
    const nextEndTime = new Date(nextStartTime);
    nextEndTime.setHours(nextStartTime.getHours() + 2);

    // Calculs progression précis
    const currentTime = now.getTime();
    const totalDuration = endTime.getTime() - startTime.getTime();
    const elapsed = currentTime - startTime.getTime();

    const progressPercentage = Math.max(
      0,
      Math.min(100, (elapsed / totalDuration) * 100),
    );
    const remainingMinutes = Math.max(
      0,
      Math.ceil((endTime.getTime() - currentTime) / (1000 * 60)),
    );

    // Formats d'heure cohérents
    const programStartTime = startTime.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const programEndTime = endTime.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return {
      currentProgram: {
        id: `instant-${channelId}-${startTime.getTime()}`,
        channelId,
        title: '📺 Programme en cours...', // Marqueur visible temporaire
        description: 'Chargement des informations du programme en cours...',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: 120,
        category: 'En direct',
        isLive: true,
      },
      nextProgram: {
        id: `instant-next-${channelId}-${nextStartTime.getTime()}`,
        channelId,
        title: '⏭️ Programme suivant...', // Marqueur visible temporaire
        description: 'Chargement des informations du programme suivant...',
        startTime: nextStartTime.toISOString(),
        endTime: nextEndTime.toISOString(),
        duration: 120,
        category: 'À venir',
        isLive: false,
      },
      progressPercentage,
      remainingMinutes,
      programStartTime,
      programEndTime,
      isRealData: false, // IMPORTANT : Marquer comme données temporaires
      lastUpdated: Date.now(),
    };
  }

  /**
   * 🔍 Vérifier si les données EPG sont réelles (pas mockées)
   */
  private isRealEPGData(data: EPGData): boolean {
    if (!data.currentProgram) {
      console.log('🔍 [EPGInstant] Pas de currentProgram');
      return false;
    }

    // Vérifier que ce ne sont pas nos données instantanées
    if (
      data.currentProgram.title.includes('Programme en cours...') ||
      data.currentProgram.title.includes('📺') ||
      data.currentProgram.id.startsWith('instant-')
    ) {
      console.log(
        '🔍 [EPGInstant] Données détectées comme instantanées:',
        data.currentProgram.title,
      );
      return false;
    }

    // 🔧 VALIDATION ASSOUPLIE pour accepter plus de données EPG
    const isValid =
      data.currentProgram.title.length > 1 && // Au moins 2 caractères
      !data.currentProgram.title.includes('...') &&
      data.currentProgram.title !== 'N/A' &&
      data.currentProgram.title !== 'null' &&
      data.currentProgram.title !== '';

    console.log('🔍 [EPGInstant] Validation EPG:', {
      title: data.currentProgram.title,
      titleLength: data.currentProgram.title.length,
      description: data.currentProgram.description?.substring(0, 50) + '...',
      isValid: isValid,
    });

    return isValid;
  }

  /**
   * 💾 Cache des données avec marqueur réel/instantané
   */
  private cacheData(
    channelId: string,
    data: EPGData,
    isRealData: boolean,
  ): void {
    const entry: EPGCacheEntry = {
      data: {...data, isRealData}, // Injecter le marqueur
      timestamp: Date.now(),
      isRealData,
      expiresAt:
        Date.now() + (isRealData ? this.realDataTTL : this.instantCacheTTL),
    };

    this.instantCache.set(channelId, entry);

    console.log(
      `💾 [EPGInstant] Cache mis à jour: ${channelId} (${
        isRealData ? 'VRAIES' : 'INSTANTANÉES'
      } données)`,
    );
  }

  /**
   * 📢 Notifier les listeners d'une mise à jour EPG
   */
  private notifyListeners(
    channelId: string,
    data: EPGData,
    isRealData: boolean,
  ): void {
    this.updateListeners.forEach(listener => {
      try {
        listener(channelId, data, isRealData);
      } catch (error) {
        console.warn('⚠️ [EPGInstant] Erreur notification listener:', error);
      }
    });
  }

  /**
   * 📊 Statistiques pour debugging
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.instantCache.size,
      backgroundQueueSize: this.backgroundQueue.size,
      realDataPercentage:
        this.stats.realDataFetched > 0
          ? Math.round(
              (this.stats.realDataFetched / (this.stats.instantHits || 1)) *
                100,
            )
          : 0,
    };
  }

  /**
   * 🧹 Nettoyage du cache expiré
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    this.instantCache.forEach((entry, channelId) => {
      if (entry.expiresAt <= now) {
        this.instantCache.delete(channelId);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      console.log(`🧹 [EPGInstant] ${cleaned} entrées expirées supprimées`);
    }

    return cleaned;
  }

  /**
   * 🗑️ Reset complet (debugging)
   */
  reset(): void {
    this.instantCache.clear();
    this.backgroundQueue.clear();
    this.pendingRealFetch.clear();
    this.stats = {
      instantHits: 0,
      realDataFetched: 0,
      backgroundUpdates: 0,
      errors: 0,
    };
    console.log('🗑️ [EPGInstant] Service complètement réinitialisé');
  }
}

// Export singleton
export const EPGInstantService = new EPGInstantServiceClass();

// Interface pour TypeScript
export interface EPGInstantInterface {
  getEPGInstant(channelId: string): Promise<EPGData>;
  subscribeToUpdates(listener: EPGUpdateListener): () => void;
  getStats(): any;
  cleanup(): number;
  reset(): void;
}

// Nettoyage automatique toutes les 5 minutes
setInterval(() => {
  EPGInstantService.cleanup();
}, 5 * 60 * 1000);
