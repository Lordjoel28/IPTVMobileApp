/**
 * 📺 EPG Helper - Interface simplifiée pour le lecteur vidéo
 * Version autonome sans dépendances WatermelonDB
 */

import { EPGProgram } from '../types';

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
   * Version complètement autonome sans dépendances externes
   */
  async getChannelEPG(channelId: string): Promise<EPGData> {
    console.log('🔄 EPG: Génération de données mockées pour', channelId);
    
    // Pour l'instant, on utilise toujours les données mockées
    // Cela évite les erreurs de base de données non initialisée
    return this.createMockEPGData(new Date(), channelId);
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
    const progressPercentage = ((currentTime - startTime.getTime()) / (endTime.getTime() - startTime.getTime())) * 100;
    const remainingMinutes = Math.ceil((endTime.getTime() - currentTime) / (1000 * 60));
    
    const programStartTime = startTime.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const programEndTime = endTime.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    return {
      currentProgram: {
        id: `mock-current-${channelId}`,
        channelId,
        title: 'Diffusion en cours',
        description: 'Programme actuellement diffusé',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: 120,
        category: 'Général',
        isLive: true
      },
      nextProgram: {
        id: `mock-next-${channelId}`,
        channelId,
        title: 'Programme suivant',
        description: 'À suivre sur cette chaîne',
        startTime: nextStartTime.toISOString(),
        endTime: nextEndTime.toISOString(),
        duration: 120,
        category: 'Général',
        isLive: false
      },
      progressPercentage: Math.max(0, Math.min(100, progressPercentage)),
      remainingMinutes: Math.max(0, remainingMinutes),
      programStartTime,
      programEndTime
    };
  }
}

export const EPGHelper = new EPGHelperClass();