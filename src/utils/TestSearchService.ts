/**
 * 🧪 TestSearchService - Version simplifiée pour diagnostic
 * Recherche SQL avec la syntaxe WatermelonDB correcte
 */

import {Q} from '@nozbe/watermelondb';
import database from '../database';
import type {Channel} from '../types';

export class TestSearchService {
  private static instance: TestSearchService;

  constructor() {
    console.log('🧪 TestSearchService initialized');
  }

  public static getInstance(): TestSearchService {
    if (!TestSearchService.instance) {
      TestSearchService.instance = new TestSearchService();
    }
    return TestSearchService.instance;
  }

  /**
   * Recherche simple avec syntaxe WatermelonDB correcte
   * @param categoryName - Si fourni, recherche uniquement dans cette catégorie
   */
  async searchChannels(
    playlistId: string,
    query: string,
    limit: number = 20,
    categoryName?: string, // 🔑 Filtrer par catégorie
  ): Promise<{channels: Channel[], totalCount: number}> {
    const startTime = Date.now();

    try {
      console.log(`🧪 [TestSearchService] Recherche: "${query}" ${categoryName ? `dans "${categoryName}"` : '(globale)'}`);

      // Log simplifié pour debug (sans requêtes supplémentaires)
      if (categoryName) {
        console.log(`🔍 [TestSearchService] Recherche dans catégorie: "${categoryName}"`);
      }

      // Construire les conditions correctement
      const conditions = [
        Q.where('playlist_id', playlistId),
      ];

      // 🔑 Ajouter filtre par catégorie si fournie (avec fallback si catégorie inexistante)
      let categoryExists = 0;
      let normalizedCategory = '';

      if (categoryName) {
        normalizedCategory = categoryName.trim();

        // Vérifier d'abord si la catégorie existe (une seule fois)
        categoryExists = await database.get('channels')
          .query(
            Q.where('playlist_id', playlistId),
            Q.where('group_title', normalizedCategory)
          )
          .fetchCount();

        if (categoryExists > 0) {
          conditions.push(Q.where('group_title', normalizedCategory));
          console.log(`✅ [TestSearchService] Catégorie "${normalizedCategory}" trouvée: ${categoryExists} chaînes`);
        } else {
          console.log(`⚠️ [TestSearchService] Catégorie "${normalizedCategory}" inexistante, recherche globale appliquée`);
          // Ne pas ajouter le filtre de catégorie -> recherche globale
        }
      }

      // Ajouter condition de recherche si query non vide
      if (query && query.trim()) {
        const sanitizedQuery = query.trim().replace(/[%_\\]/g, '\\$&');
        conditions.push(Q.where('name', Q.like(`%${sanitizedQuery}%`)));
      }

      // Ajouter pagination et tri
      conditions.push(Q.sortBy('name', Q.asc));
      conditions.push(Q.take(limit));

      // Exécuter la requête
      const dbChannels = await database.get('channels').query(...conditions).fetch();

      // Mapper les canaux pour convertir streamUrl en url (compatibilité avec le reste du code)
      const channels = dbChannels.map((ch: any) => ({
        id: ch.id,
        name: ch.name,
        url: ch.streamUrl || '', // Convertir streamUrl en url
        logo: ch.logoUrl,
        group: ch.groupTitle,
        category: ch.groupTitle,
        groupTitle: ch.groupTitle,
        tvgId: ch.tvgId,
        streamType: ch.streamType,
        streamId: ch.streamId,
        isAdult: ch.isAdult,
        isFavorite: ch.isFavorite,
        lastWatched: ch.lastWatched,
        watchCount: ch.watchCount,
        // Conserver aussi streamUrl pour compatibilité
        streamUrl: ch.streamUrl,
      }));

      // Compter le total (requête séparée)
      const countConditions = [
        Q.where('playlist_id', playlistId),
      ];

      // 🔑 Ajouter filtre par catégorie si fournie (réutiliser la vérification précédente)
      if (categoryExists > 0 && normalizedCategory) {
        countConditions.push(Q.where('group_title', normalizedCategory));
      }
      // Si catégorie inexistante, ne pas ajouter de filtre -> recherche globale

      if (query && query.trim()) {
        const sanitizedQuery = query.trim().replace(/[%_\\]/g, '\\$&');
        countConditions.push(Q.where('name', Q.like(`%${sanitizedQuery}%`)));
      }

      const totalCount = await database.get('channels').query(...countConditions).fetchCount();

      const executionTime = Date.now() - startTime;

      console.log(`✅ [TestSearchService] ${channels.length}/${totalCount} résultats en ${executionTime}ms`);

      return {
        channels,
        totalCount,
      };

    } catch (error) {
      console.error('❌ [TestSearchService] Erreur recherche:', error);
      throw error;
    }
  }

  /**
   * Test de base pour vérifier que la BDD fonctionne
   */
  async testBasicQuery(): Promise<{count: number, sample: Channel[]}> {
    try {
      console.log('🧪 [TestSearchService] Test requête de base...');

      // Compter toutes les chaînes
      const totalChannels = await database.get('channels').query().fetchCount();

      // Prendre 5 chaînes example
      const dbChannels = await database.get('channels').query(
        Q.take(5),
        Q.sortBy('name', Q.asc)
      ).fetch();

      // Mapper les canaux pour convertir streamUrl en url
      const sampleChannels = dbChannels.map((ch: any) => ({
        id: ch.id,
        name: ch.name,
        url: ch.streamUrl || '',
        logo: ch.logoUrl,
        group: ch.groupTitle,
        category: ch.groupTitle,
        streamUrl: ch.streamUrl,
      }));

      console.log(`✅ [TestSearchService] BDD OK: ${totalChannels} chaînes, sample: ${sampleChannels.length}`);

      return {
        count: totalChannels,
        sample: sampleChannels,
      };

    } catch (error) {
      console.error('❌ [TestSearchService] Erreur test BDD:', error);
      throw error;
    }
  }
}

// Export singleton
export const testSearchService = TestSearchService.getInstance();