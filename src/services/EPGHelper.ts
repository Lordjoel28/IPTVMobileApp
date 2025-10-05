/**
 * 📺 EPG Helper - Interface simplifiée pour le lecteur vidéo
 * Utilise EPGDataManager pour des données robustes avec cache
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
}

class EPGHelperClass {
  /**
   * Obtient les données EPG pour une chaîne donnée
   * Utilise EPGDataManager avec fallback intelligent
   */
  async getChannelEPG(
    channelId: string,
    forceRefresh = false,
  ): Promise<EPGData | null> {
    console.log('🔄 EPG: Récupération des données pour', channelId);

    try {
      const epgData = await EPGDataManager.getChannelEPG(
        channelId,
        forceRefresh,
      );
      console.log('✅ EPG: Données récupérées avec succès pour', channelId);
      return epgData;
    } catch (error) {
      console.error('❌ EPG: Aucune donnée disponible pour', channelId);
      return null; // Plus de données mock - retourner null
    }
  }

  /**
   * Synchronise les données EPG depuis une source externe
   */
  async syncEPGData(
    epgUrl: string,
    playlistId: string,
  ): Promise<{
    success: boolean;
    error?: string;
    programsCount?: number;
  }> {
    return EPGDataManager.syncEPGData(epgUrl, playlistId);
  }

  /**
   * Obtient le statut de synchronisation EPG
   */
  getSyncStatus(playlistId: string) {
    return EPGDataManager.getSyncStatus(playlistId);
  }

  /**
   * Obtient les statistiques du cache EPG
   */
  getCacheStats() {
    return EPGDataManager.getCacheStats();
  }

  /**
   * Crée des données EPG mockées quand aucune donnée réelle n'est disponible
   */
  private createMockEPGData(now: Date, channelId: string): EPGData {
    // Créer un programme de 2h qui commence à l'heure paire précédente
    const startHour = Math.floor(now.getHours() / 2) * 2;
    const startTime = new Date(now);
    startTime.setHours(startHour, 0, 0, 0);

    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + 2);

    // Programme suivant
    const nextStartTime = new Date(endTime);
    const nextEndTime = new Date(nextStartTime);
    nextEndTime.setHours(nextStartTime.getHours() + 2);

    const currentTime = now.getTime();
    const progressPercentage =
      ((currentTime - startTime.getTime()) /
        (endTime.getTime() - startTime.getTime())) *
      100;
    const remainingMinutes = Math.ceil(
      (endTime.getTime() - currentTime) / (1000 * 60),
    );

    const programStartTime = startTime.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit', 
    });

    const programEndTime = endTime.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit', 
    });

    // Programmes mock réalistes selon l'heure et la chaîne
    const getProgramTitle = (channelId: string, hour: number) => {
      const programs = {
        '1': {
          // TF1
          6: 'Bonjour !',
          8: 'Télé-achat',
          10: 'Coup de pouce pour la planète',
          12: "Les Feux de l'amour",
          13: 'Le Journal de 13h',
          14: "Les Feux de l'amour",
          17: 'Quatre mariages pour une lune de miel',
          18: 'Bienvenue chez nous',
          19: 'Demain nous appartient',
          20: 'Le Journal de 20h',
          21: 'Koh-Lanta',
          23: 'Sept à huit',
        },
        '2': {
          // France 2
          6: 'Télématin',
          9: 'Amour, gloire et beauté',
          10: "C'est au programme",
          12: 'Tout le monde veut prendre sa place',
          13: 'Journal de 13h',
          14: 'Un si grand soleil',
          17: 'Affaire conclue',
          19: "N'oubliez pas les paroles",
          20: 'Journal de 20h',
          21: 'Envoyé spécial',
          23: "Complément d'enquête",
        },
        default: {
          6: 'Émission matinale',
          12: 'Magazine midi',
          13: 'Journal',
          17: 'Émission quotidienne',
          20: 'Journal du soir',
          21: 'Prime time',
          23: 'Émission de soirée',
        }
      };

      const channelPrograms = programs[channelId] || programs.default;
      const exactProgram = channelPrograms[hour];
      if (exactProgram) {return exactProgram;}

      // Trouver le programme le plus proche
      const availableHours = Object.keys(channelPrograms)
        .map(Number)
        .sort((a, b) => a - b);
      const closestHour = availableHours.reduce((prev, curr) =>
        Math.abs(curr - hour) < Math.abs(prev - hour) ? curr : prev,
      );
      return channelPrograms[closestHour] || 'Programme en cours';
    };

    const currentTitle = getProgramTitle(channelId, startHour);
    const nextTitle = getProgramTitle(channelId, endTime.getHours());

    return {
      currentProgram: {
        id: `mock-current-${channelId}`,
        channelId,
        title: currentTitle,
        description: `${currentTitle} - Programme diffusé en direct`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: 120,
        category: 'Général',
        isLive: true,
      },
      nextProgram: {
        id: `mock-next-${channelId}`,
        channelId,
        title: nextTitle,
        description: `${nextTitle} - À suivre`,
        startTime: nextStartTime.toISOString(),
        endTime: nextEndTime.toISOString(),
        duration: 120,
        category: 'Général',
        isLive: false,
      },
      progressPercentage: Math.max(0, Math.min(100, progressPercentage)),
      remainingMinutes: Math.max(0, remainingMinutes),
      programStartTime,
      programEndTime,
    };
  }
}

export const EPGHelper = new EPGHelperClass();
