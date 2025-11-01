/**
 * 🚀 CategoriesService V1 - Service d'Optimisation des Catégories
 *
 * Service spécialisé pour le chargement ultra-rapide des catégories
 * Conçu pour les grandes playlists (+10K chaînes) avec :
 * - Cache intelligent 24h
 * - Requêtes SQL optimisées
 * - Fallback graceful
 * - Monitoring performance
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import database from '../database';
import {Q} from '@nozbe/watermelondb';
import {Channel, Playlist} from '../database/models';

// Interface pour les catégories avec comptage
export interface CategoryWithCount {
  name: string;
  count: number;
}

// Interface pour les stats de performance
export interface CategoryLoadStats {
  playlistId: string;
  categoriesCount: number;
  channelsCount: number;
  loadTime: number;
  cacheHit: boolean;
  method: 'sql' | 'watermelondb';
}

class CategoriesService {
  private static readonly CACHE_KEY_PREFIX = 'categories_with_count_cache_';
  private static readonly CACHE_DURATION = 86400000; // 24h en millisecondes
  private static readonly SQL_QUERY = `
    SELECT
      CASE
        WHEN group_title IS NULL OR group_title = '' THEN 'Uncategorized'
        WHEN group_title = 'Favoris' THEN NULL
        WHEN group_title = 'Récents' THEN NULL
        ELSE group_title
      END as category_name,
      COUNT(*) as channel_count
    FROM channels
    WHERE playlist_id = ?
      AND group_title NOT IN ('Favoris', 'Récents')
      AND (group_title IS NULL OR group_title != '')
    GROUP BY category_name
    HAVING category_name IS NOT NULL
    ORDER BY category_name COLLATE NOCASE
  `;

  /**
   * Charger les catégories pour une playlist avec optimisations
   * @param playlistId - ID de la playlist (optionnel, utilisera la playlist active si non fourni)
   * @param forceRefresh - Forcer le rechargement (ignorer le cache)
   * @returns Promise<CategoryWithCount[]> - Catégories avec comptage de chaînes
   */
  async loadCategories(
    playlistId?: string,
    forceRefresh: boolean = false
  ): Promise<CategoryWithCount[]> {
    try {
      // 1. Récupérer la playlist cible
      const targetPlaylist = await this.getTargetPlaylist(playlistId);

      if (!targetPlaylist) {
        console.log('⚠️ [CategoriesService] Aucune playlist trouvée');
        return [];
      }

      // 2. Vérifier le cache (sauf si force refresh)
      if (!forceRefresh) {
        const cachedResult = await this.loadFromCache(targetPlaylist.id);
        if (cachedResult) {
          return cachedResult;
        }
      }

      // 3. Charger depuis la base avec optimisation
      const categories = await this.loadFromDatabase(targetPlaylist.id);

      // 4. Mettre en cache le résultat
      await this.saveToCache(targetPlaylist.id, categories);

      return categories;
    } catch (error) {
      console.error('❌ [CategoriesService] Erreur chargement catégories:', error);
      return [];
    }
  }

  /**
   * Charger les catégories avec monitoring performance détaillé
   */
  async loadCategoriesWithStats(
    playlistId?: string,
    forceRefresh: boolean = false
  ): Promise<{categories: CategoryWithCount[], stats: CategoryLoadStats}> {
    const startTime = Date.now();
    let cacheHit = false;
    let method: 'sql' | 'watermelondb' = 'sql';
    let categories: CategoryWithCount[] = [];

    try {
      const targetPlaylist = await this.getTargetPlaylist(playlistId);

      if (!targetPlaylist) {
        throw new Error('Aucune playlist trouvée');
      }

      // Tenter le cache
      if (!forceRefresh) {
        const cachedResult = await this.loadFromCache(targetPlaylist.id);
        if (cachedResult) {
          categories = cachedResult;
          cacheHit = true;
        }
      }

      // Si pas de cache valide, charger depuis DB
      if (categories.length === 0) {
        categories = await this.loadFromDatabaseWithMethod(targetPlaylist.id);
        method = 'sql'; // ou 'watermelondb' selon ce qui est utilisé
        await this.saveToCache(targetPlaylist.id, categories);
      }

      const loadTime = Date.now() - startTime;
      const stats: CategoryLoadStats = {
        playlistId: targetPlaylist.id,
        categoriesCount: categories.length,
        channelsCount: categories.reduce((sum, cat) => sum + cat.count, 0),
        loadTime,
        cacheHit,
        method
      };

      console.log(`✅ [CategoriesService] Chargement: ${stats.categoriesCount} catégories, ${stats.channelsCount} chaînes en ${stats.loadTime}ms (${cacheHit ? 'cache' : method})`);

      return {categories, stats};
    } catch (error) {
      const loadTime = Date.now() - startTime;
      console.error(`❌ [CategoriesService] Erreur après ${loadTime}ms:`, error);
      throw error;
    }
  }

  /**
   * Vider le cache pour une playlist ou toutes les playlists
   */
  async clearCache(playlistId?: string): Promise<void> {
    try {
      if (playlistId) {
        // Vider le cache pour une playlist spécifique
        await AsyncStorage.removeItem(`${CategoriesService.CACHE_KEY_PREFIX}${playlistId}`);
        console.log(`🗑️ [CategoriesService] Cache vidé pour playlist ${playlistId}`);
      } else {
        // Vider tous les caches de catégories
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(key => key.startsWith(CategoriesService.CACHE_KEY_PREFIX));

        if (cacheKeys.length > 0) {
          await AsyncStorage.multiRemove(cacheKeys);
          console.log(`🗑️ [CategoriesService] ${cacheKeys.length} caches de catégories vidés`);
        }
      }
    } catch (error) {
      console.error('❌ [CategoriesService] Erreur vidage cache:', error);
    }
  }

  /**
   * Obtenir les stats du cache (taille, âge, etc.)
   */
  async getCacheStats(): Promise<{
    count: number;
    totalSize: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CategoriesService.CACHE_KEY_PREFIX));

      if (cacheKeys.length === 0) {
        return { count: 0, totalSize: 0, oldestEntry: null, newestEntry: null };
      }

      const cacheEntries = await AsyncStorage.multiGet(cacheKeys);
      let totalSize = 0;
      let oldestTimestamp = Date.now();
      let newestTimestamp = 0;

      cacheEntries.forEach(([key, value]) => {
        if (value) {
          totalSize += value.length;
          try {
            const parsed = JSON.parse(value);
            if (parsed.timestamp) {
              oldestTimestamp = Math.min(oldestTimestamp, parsed.timestamp);
              newestTimestamp = Math.max(newestTimestamp, parsed.timestamp);
            }
          } catch (parseError) {
            // Ignorer les erreurs de parsing
          }
        }
      });

      return {
        count: cacheKeys.length,
        totalSize,
        oldestEntry: oldestTimestamp === Date.now() ? null : oldestTimestamp,
        newestEntry: newestTimestamp === 0 ? null : newestTimestamp
      };
    } catch (error) {
      console.error('❌ [CategoriesService] Erreur stats cache:', error);
      return { count: 0, totalSize: 0, oldestEntry: null, newestEntry: null };
    }
  }

  // ========================================
  // MÉTHODES PRIVÉES
  // ========================================

  /**
   * Récupérer la playlist cible (active ou spécifique)
   */
  private async getTargetPlaylist(playlistId?: string): Promise<Playlist | null> {
    if (playlistId) {
      try {
        return await database.get<Playlist>('playlists').find(playlistId);
      } catch (error) {
        console.error(`❌ [CategoriesService] Playlist ${playlistId} non trouvée:`, error);
        return null;
      }
    }

    // Récupérer la playlist active
    const activePlaylists = await database
      .get<Playlist>('playlists')
      .query(Q.where('is_active', true))
      .fetch();

    if (activePlaylists.length > 0) {
      return activePlaylists[0];
    }

    // Fallback: dernière playlist utilisée
    const lastSelectedId = await AsyncStorage.getItem('last_selected_playlist_id');
    if (lastSelectedId) {
      try {
        const playlist = await database.get<Playlist>('playlists').find(lastSelectedId);
        if (playlist) {
          // Marquer comme active pour la prochaine fois
          await database.write(async () => {
            await playlist.update(p => { p.isActive = true; });
          });
          return playlist;
        }
      } catch (error) {
        // Silently handle fallback error
      }
    }

    return null;
  }

  /**
   * Charger depuis le cache si valide
   */
  private async loadFromCache(playlistId: string): Promise<CategoryWithCount[] | null> {
    try {
      const cacheKey = `${CategoriesService.CACHE_KEY_PREFIX}${playlistId}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);

      if (!cachedData) {
        return null;
      }

      const {categories, timestamp} = JSON.parse(cachedData);
      const cacheAge = Date.now() - timestamp;

      // Vérifier si le cache est encore valide (24h)
      if (cacheAge < CategoriesService.CACHE_DURATION && categories?.length > 0) {
        console.log(`✅ [CategoriesService] Cache utilisé (${Math.round(cacheAge/60000)}h ago) - ${categories.length} catégories`);
        return categories;
      }

      // Cache expiré, le supprimer
      await AsyncStorage.removeItem(cacheKey);
      return null;
    } catch (error) {
      console.error('❌ [CategoriesService] Erreur lecture cache:', error);
      return null;
    }
  }

  /**
   * Charger depuis la base avec méthode optimisée
   */
  private async loadFromDatabase(playlistId: string): Promise<CategoryWithCount[]> {
    try {
      console.log(`🔄 [CategoriesService] Chargement categories pour playlist ${playlistId}...`);
      const startTime = Date.now();

      const result = await this.loadFromDatabaseWithMethod(playlistId);

      const loadTime = Date.now() - startTime;
      console.log(`✅ [CategoriesService] ${result.length} catégories chargées en ${loadTime}ms`);

      return result;
    } catch (error) {
      console.error('❌ [CategoriesService] Erreur chargement DB:', error);
      throw error;
    }
  }

  /**
   * Charger depuis DB avec tentative SQL puis fallback WatermelonDB
   */
  private async loadFromDatabaseWithMethod(playlistId: string): Promise<CategoryWithCount[]> {
    try {
      // Tenter la requête SQL directe avec Q.unsafeSqlQuery (plus rapide)
      const rawResults = await database
        .get<Channel>('channels')
        .query(Q.unsafeSqlQuery(CategoriesService.SQL_QUERY, [playlistId]))
        .unsafeFetchRaw();

      // Convertir au format CategoryWithCount
      return rawResults
        .filter((cat: any) => cat.category_name && cat.channel_count > 0)
        .map((cat: any) => ({
          name: cat.category_name,
          count: cat.channel_count
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));

    } catch (sqlError) {
      console.log('🔄 [CategoriesService] Fallback vers méthode WatermelonDB standard');
      console.error('❌ [CategoriesService] Erreur SQL:', sqlError);

      // Fallback: méthode WatermelonDB standard
      const channels = await database
        .get<Channel>('channels')
        .query(Q.where('playlist_id', playlistId))
        .fetch();

      // Grouper par catégorie avec comptage
      const categoryMap: {[key: string]: number} = {};

      channels.forEach(channel => {
        const categoryName = channel.groupTitle || 'Uncategorized';

        // Filtrer les catégories non désirées
        if (categoryName &&
            categoryName.trim() !== '' &&
            categoryName !== 'Favoris' &&
            categoryName !== 'Récents') {
          categoryMap[categoryName] = (categoryMap[categoryName] || 0) + 1;
        }
      });

      // Convertir et trier
      return Object.entries(categoryMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
    }
  }

  /**
   * Sauvegarder en cache
   */
  private async saveToCache(playlistId: string, categories: CategoryWithCount[]): Promise<void> {
    try {
      const cacheKey = `${CategoriesService.CACHE_KEY_PREFIX}${playlistId}`;
      const cacheData = {
        categories,
        timestamp: Date.now(),
        channelCount: categories.reduce((sum, cat) => sum + cat.count, 0),
        version: 1
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log(`💾 [CategoriesService] Cache sauvegardé: ${categories.length} catégories pour playlist ${playlistId}`);
    } catch (error) {
      console.error('❌ [CategoriesService] Erreur sauvegarde cache:', error);
    }
  }
}

// Export singleton
export default new CategoriesService();