/**
 * 📺 EPGSourceManager - Gestionnaire intelligent des sources EPG
 * Phase 1.1: Gestion multi-sources avec priorités
 *
 * Priorités EPG:
 * 1. EPG intégré playlist (url-tvg) - PRIORITÉ MAXIMALE
 * 2. EPG manuel assigné par utilisateur
 * 3. EPG global Xtream (fallback universel)
 * 4. Aucun EPG
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlaylistMetadata } from '../playlist/PlaylistManager';

export interface EPGSource {
  id: string;
  type: 'integrated' | 'manual' | 'global';
  url: string;
  playlistId?: string; // Si source spécifique à une playlist
  name: string;
  status: 'active' | 'inactive' | 'error';
  lastUpdate?: string;
  channelsCount?: number;
}

export interface EPGSourceResult {
  source: EPGSource | null;
  priority: number; // 1 = haute priorité, 3 = basse priorité
  reason: string;
}

export interface PlaylistEPGConfig {
  playlistId: string;
  playlistName: string;
  integratedEPG?: string; // url-tvg détectée
  manualEPG?: string; // URL assignée manuellement
  preferredSource: 'integrated' | 'manual' | 'global';
  lastChecked: string;
}

export class EPGSourceManager {
  private static readonly STORAGE_KEYS = {
    MANUAL_EPG_SOURCES: 'epg_manual_sources',
    PLAYLIST_EPG_CONFIG: 'epg_playlist_config',
    GLOBAL_EPG_STATUS: 'epg_global_status',
  };

  /**
   * Détermine la meilleure source EPG pour une playlist
   */
  async getBestEPGSource(
    playlistId: string,
    playlistMetadata?: PlaylistMetadata
  ): Promise<EPGSourceResult> {
    console.log(`🔍 Recherche meilleure source EPG pour playlist: ${playlistId}`);

    // 1. PRIORITÉ 1: EPG intégré (url-tvg)
    if (playlistMetadata?.epgUrl) {
      console.log(`✅ EPG intégré détecté: ${playlistMetadata.epgUrl}`);
      return {
        source: {
          id: `integrated_${playlistId}`,
          type: 'integrated',
          url: playlistMetadata.epgUrl,
          playlistId,
          name: 'EPG Intégré',
          status: 'active',
        },
        priority: 1,
        reason: 'EPG intégré à la playlist (url-tvg)'
      };
    }

    // 2. PRIORITÉ 2: EPG manuel assigné
    const manualEPG = await this.getManualEPGForPlaylist(playlistId);
    if (manualEPG) {
      console.log(`✅ EPG manuel trouvé: ${manualEPG.url}`);
      return {
        source: manualEPG,
        priority: 2,
        reason: 'EPG assigné manuellement par l\'utilisateur'
      };
    }

    // 3. PRIORITÉ 3: EPG global (fallback)
    const globalEPG = await this.getGlobalEPGStatus();
    if (globalEPG?.status === 'active') {
      console.log(`✅ EPG global disponible: ${globalEPG.url}`);
      return {
        source: globalEPG,
        priority: 3,
        reason: 'EPG global (solution de secours)'
      };
    }

    // 4. Aucun EPG disponible
    console.log('❌ Aucune source EPG disponible');
    return {
      source: null,
      priority: 0,
      reason: 'Aucune source EPG configurée'
    };
  }

  /**
   * Assigne une source EPG manuelle à une playlist
   */
  async assignManualEPG(
    playlistId: string,
    playlistName: string,
    epgUrl: string
  ): Promise<boolean> {
    try {
      console.log(`📝 Assignation EPG manuel: ${playlistId} -> ${epgUrl}`);

      // Valider l'URL
      if (!this.validateEPGUrl(epgUrl)) {
        throw new Error('URL EPG invalide');
      }

      // Créer la source EPG
      const epgSource: EPGSource = {
        id: `manual_${playlistId}`,
        type: 'manual',
        url: epgUrl,
        playlistId,
        name: `EPG pour ${playlistName}`,
        status: 'active',
        lastUpdate: new Date().toISOString(),
      };

      // Sauvegarder dans AsyncStorage
      await this.saveManualEPGSource(epgSource);

      // Mettre à jour configuration playlist
      await this.updatePlaylistEPGConfig(playlistId, {
        playlistId,
        playlistName,
        manualEPG: epgUrl,
        preferredSource: 'manual',
        lastChecked: new Date().toISOString(),
      });

      console.log('✅ EPG manuel assigné avec succès');
      return true;

    } catch (error) {
      console.error('❌ Erreur assignation EPG manuel:', error);
      return false;
    }
  }

  /**
   * Récupère l'EPG manuel assigné à une playlist
   */
  private async getManualEPGForPlaylist(playlistId: string): Promise<EPGSource | null> {
    try {
      const sourcesData = await AsyncStorage.getItem(
        EPGSourceManager.STORAGE_KEYS.MANUAL_EPG_SOURCES
      );

      if (!sourcesData) return null;

      const sources: EPGSource[] = JSON.parse(sourcesData);
      return sources.find(s => s.playlistId === playlistId && s.status === 'active') || null;

    } catch (error) {
      console.error('❌ Erreur récupération EPG manuel:', error);
      return null;
    }
  }

  /**
   * Sauvegarde une source EPG manuelle
   */
  private async saveManualEPGSource(epgSource: EPGSource): Promise<void> {
    const sourcesData = await AsyncStorage.getItem(
      EPGSourceManager.STORAGE_KEYS.MANUAL_EPG_SOURCES
    );

    let sources: EPGSource[] = sourcesData ? JSON.parse(sourcesData) : [];

    // CORRECTION: Chercher et supprimer la source originale non-assignée avec la même URL.
    // C'est l'étape qui empêche la duplication.
    const unassignedIndex = sources.findIndex(s => s.url === epgSource.url && !s.playlistId);

    if (unassignedIndex !== -1) {
      console.log('ℹ️ [EPGSourceManager] Suppression de la source non-assignée dupliquée pour la remplacer par l\'assignation.');
      sources.splice(unassignedIndex, 1);
    }

    // Supprimer l'ancienne assignation pour cette playlist (si elle existait)
    const updatedSources = sources.filter(s => s.playlistId !== epgSource.playlistId);

    // Ajouter la nouvelle source (l'assignation)
    updatedSources.push(epgSource);

    await AsyncStorage.setItem(
      EPGSourceManager.STORAGE_KEYS.MANUAL_EPG_SOURCES,
      JSON.stringify(updatedSources)
    );
  }

  /**
   * Met à jour la configuration EPG d'une playlist
   */
  private async updatePlaylistEPGConfig(
    playlistId: string,
    config: Partial<PlaylistEPGConfig>
  ): Promise<void> {
    const configData = await AsyncStorage.getItem(
      EPGSourceManager.STORAGE_KEYS.PLAYLIST_EPG_CONFIG
    );

    const configs: Record<string, PlaylistEPGConfig> = configData ? JSON.parse(configData) : {};

    // Fusionner avec configuration existante
    configs[playlistId] = {
      ...configs[playlistId],
      ...config,
      playlistId, // Assurer la cohérence
    };

    await AsyncStorage.setItem(
      EPGSourceManager.STORAGE_KEYS.PLAYLIST_EPG_CONFIG,
      JSON.stringify(configs)
    );
  }

  /**
   * Récupère le statut de l'EPG global
   */
  private async getGlobalEPGStatus(): Promise<EPGSource | null> {
    try {
      const statusData = await AsyncStorage.getItem(
        EPGSourceManager.STORAGE_KEYS.GLOBAL_EPG_STATUS
      );

      if (!statusData) return null;

      const globalEPG: EPGSource = JSON.parse(statusData);
      return globalEPG.status === 'active' ? globalEPG : null;

    } catch (error) {
      console.error('❌ Erreur récupération EPG global:', error);
      return null;
    }
  }

  /**
   * Valide une URL EPG (compatible React Native)
   */
  private validateEPGUrl(url: string): boolean {
    try {
      // Validation simple du format URL sans utiliser URL constructor
      const urlPattern = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
      return urlPattern.test(url.trim());
    } catch {
      return false;
    }
  }

  /**
   * Liste toutes les sources EPG configurées
   */
  async getAllEPGSources(): Promise<EPGSource[]> {
    try {
      const sources: EPGSource[] = [];

      // Sources manuelles
      const manualData = await AsyncStorage.getItem(
        EPGSourceManager.STORAGE_KEYS.MANUAL_EPG_SOURCES
      );
      if (manualData) {
        sources.push(...JSON.parse(manualData));
      }

      // EPG global
      const globalEPG = await this.getGlobalEPGStatus();
      if (globalEPG) {
        sources.push(globalEPG);
      }

      return sources;

    } catch (error) {
      console.error('❌ Erreur récupération sources EPG:', error);
      return [];
    }
  }

  /**
   * Supprime l'assignation EPG d'une playlist
   */
  async removeEPGAssignment(playlistId: string): Promise<boolean> {
    try {
      // Supprimer source manuelle
      const sourcesData = await AsyncStorage.getItem(
        EPGSourceManager.STORAGE_KEYS.MANUAL_EPG_SOURCES
      );

      if (sourcesData) {
        const sources: EPGSource[] = JSON.parse(sourcesData);
        const updatedSources = sources.filter(s => s.playlistId !== playlistId);

        await AsyncStorage.setItem(
          EPGSourceManager.STORAGE_KEYS.MANUAL_EPG_SOURCES,
          JSON.stringify(updatedSources)
        );
      }

      // Mettre à jour configuration
      await this.updatePlaylistEPGConfig(playlistId, {
        manualEPG: undefined,
        preferredSource: 'integrated', // Retour à l'intégré par défaut
        lastChecked: new Date().toISOString(),
      });

      console.log(`✅ Assignation EPG supprimée pour playlist: ${playlistId}`);
      return true;

    } catch (error) {
      console.error('❌ Erreur suppression assignation EPG:', error);
      return false;
    }
  }

  /**
   * Statistiques des sources EPG
   */
  async getEPGStats(): Promise<{
    totalSources: number;
    integratedCount: number;
    manualCount: number;
    globalAvailable: boolean;
  }> {
    const allSources = await this.getAllEPGSources();

    return {
      totalSources: allSources.length,
      integratedCount: allSources.filter(s => s.type === 'integrated').length,
      manualCount: allSources.filter(s => s.type === 'manual').length,
      globalAvailable: allSources.some(s => s.type === 'global' && s.status === 'active'),
    };
  }

  /**
   * Récupère toutes les sources EPG manuelles
   */
  async getManualSources(): Promise<EPGSource[]> {
    try {
      const sourcesData = await AsyncStorage.getItem(
        EPGSourceManager.STORAGE_KEYS.MANUAL_EPG_SOURCES
      );

      if (!sourcesData) return [];

      const sources: EPGSource[] = JSON.parse(sourcesData);
      return sources.filter(s => s.type === 'manual');

    } catch (error) {
      console.error('❌ Erreur récupération sources manuelles:', error);
      return [];
    }
  }

  /**
   * Ajoute une nouvelle source EPG manuelle (évite les doublons d'URL)
   */
  async addManualSource(sourceData: {
    name: string;
    url: string;
    playlistId?: string;
  }): Promise<EPGSource> {
    try {
      // Valider l'URL
      if (!this.validateEPGUrl(sourceData.url)) {
        throw new Error('URL EPG invalide');
      }

      const cleanUrl = sourceData.url.trim();

      // Récupérer sources existantes
      const sourcesData = await AsyncStorage.getItem(
        EPGSourceManager.STORAGE_KEYS.MANUAL_EPG_SOURCES
      );
      const sources: EPGSource[] = sourcesData ? JSON.parse(sourcesData) : [];

      // Vérifier si une source avec la même URL existe déjà
      const existingSource = sources.find(s => s.url === cleanUrl);

      if (existingSource) {
        console.log(`🔄 Source EPG avec URL existante trouvée, mise à jour du nom: ${cleanUrl}`);

        // Mettre à jour le nom de la source existante
        existingSource.name = sourceData.name.trim();
        existingSource.lastUpdate = new Date().toISOString();

        // Sauvegarder
        await AsyncStorage.setItem(
          EPGSourceManager.STORAGE_KEYS.MANUAL_EPG_SOURCES,
          JSON.stringify(sources)
        );

        console.log(`✅ Source EPG manuelle mise à jour: ${existingSource.name}`);
        return existingSource;
      }

      // Créer la nouvelle source si aucun doublon trouvé
      const newSource: EPGSource = {
        id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'manual',
        url: cleanUrl,
        playlistId: sourceData.playlistId,
        name: sourceData.name.trim(),
        status: 'inactive', // Nouvelle source inactive par défaut
        lastUpdate: new Date().toISOString(),
      };

      // Ajouter la nouvelle source
      sources.push(newSource);

      // Sauvegarder
      await AsyncStorage.setItem(
        EPGSourceManager.STORAGE_KEYS.MANUAL_EPG_SOURCES,
        JSON.stringify(sources)
      );

      console.log(`✅ Source EPG manuelle ajoutée: ${newSource.name}`);
      return newSource;

    } catch (error) {
      console.error('❌ Erreur ajout source manuelle:', error);
      throw error;
    }
  }

  /**
   * Met à jour une source EPG manuelle existante
   */
  async updateManualSource(sourceId: string, updateData: {
    name?: string;
    url?: string;
  }): Promise<void> {
    try {
      // Valider l'URL si fournie
      if (updateData.url && !this.validateEPGUrl(updateData.url)) {
        throw new Error('URL EPG invalide');
      }

      // Récupérer sources existantes
      const sourcesData = await AsyncStorage.getItem(
        EPGSourceManager.STORAGE_KEYS.MANUAL_EPG_SOURCES
      );

      if (!sourcesData) {
        throw new Error('Source non trouvée');
      }

      const sources: EPGSource[] = JSON.parse(sourcesData);
      const sourceIndex = sources.findIndex(s => s.id === sourceId);

      if (sourceIndex === -1) {
        throw new Error('Source non trouvée');
      }

      // Mettre à jour la source
      sources[sourceIndex] = {
        ...sources[sourceIndex],
        ...updateData,
        name: updateData.name?.trim() || sources[sourceIndex].name,
        url: updateData.url?.trim() || sources[sourceIndex].url,
        lastUpdate: new Date().toISOString(),
      };

      // Sauvegarder
      await AsyncStorage.setItem(
        EPGSourceManager.STORAGE_KEYS.MANUAL_EPG_SOURCES,
        JSON.stringify(sources)
      );

      console.log(`✅ Source EPG manuelle mise à jour: ${sourceId}`);

    } catch (error) {
      console.error('❌ Erreur mise à jour source manuelle:', error);
      throw error;
    }
  }

  /**
   * Supprime une source EPG manuelle
   */
  async removeManualSource(sourceId: string): Promise<void> {
    try {
      // Récupérer sources existantes
      const sourcesData = await AsyncStorage.getItem(
        EPGSourceManager.STORAGE_KEYS.MANUAL_EPG_SOURCES
      );

      if (!sourcesData) {
        throw new Error('Source non trouvée');
      }

      const sources: EPGSource[] = JSON.parse(sourcesData);
      const updatedSources = sources.filter(s => s.id !== sourceId);

      if (updatedSources.length === sources.length) {
        throw new Error('Source non trouvée');
      }

      // Sauvegarder
      await AsyncStorage.setItem(
        EPGSourceManager.STORAGE_KEYS.MANUAL_EPG_SOURCES,
        JSON.stringify(updatedSources)
      );

      console.log(`✅ Source EPG manuelle supprimée: ${sourceId}`);

    } catch (error) {
      console.error('❌ Erreur suppression source manuelle:', error);
      throw error;
    }
  }

  /**
   * Teste la validité d'une source EPG
   */
  async testEPGSource(url: string): Promise<{
    success: boolean;
    error?: string;
    channelsCount?: number;
  }> {
    try {
      console.log(`🔍 Test de la source EPG: ${url}`);

      // Valider l'URL d'abord
      if (!this.validateEPGUrl(url)) {
        return {
          success: false,
          error: 'URL invalide'
        };
      }

      // Tenter de récupérer le contenu EPG avec timeout manuel
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 secondes de timeout

      const response = await fetch(url, {
        method: 'HEAD', // Utiliser HEAD pour vérifier l'accessibilité
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          error: `Erreur HTTP: ${response.status}`
        };
      }

      // Vérifier le type de contenu
      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.includes('xml') && !contentType.includes('text')) {
        return {
          success: false,
          error: 'Le contenu ne semble pas être un fichier XML'
        };
      }

      console.log(`✅ Source EPG accessible: ${url}`);
      return {
        success: true
      };

    } catch (error) {
      console.error('❌ Erreur test source EPG:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }
}

export default EPGSourceManager;