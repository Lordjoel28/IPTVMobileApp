/**
 * 🗺️ CategoryMappingService - Service global pour mapping catégories → group_title
 * Charge UNE SEULE FOIS le mapping en arrière-plan pour performance optimale
 */

import database from '../database';
import {Q} from '@nozbe/watermelondb';

class CategoryMappingService {
  private mappingCache: Map<string, string> | null = null;
  private loadingPromise: Promise<Map<string, string>> | null = null;

  /**
   * Charger le mapping en arrière-plan (appelé au démarrage de l'app)
   */
  async loadMapping(playlistId: string): Promise<Map<string, string>> {
    // Si déjà chargé, retourner le cache
    if (this.mappingCache) {
      console.log(`✅ [CategoryMapping] Cache hit: ${this.mappingCache.size} mappings`);
      return this.mappingCache;
    }

    // Si chargement en cours, attendre la Promise existante
    if (this.loadingPromise) {
      console.log(`⏳ [CategoryMapping] Chargement déjà en cours, attente...`);
      return this.loadingPromise;
    }

    // Démarrer le chargement
    console.log(`🔄 [CategoryMapping] Chargement mapping pour playlist: ${playlistId}...`);
    const startTime = Date.now();

    this.loadingPromise = (async () => {
      try {
        // Charger TOUS les group_title uniques (raw pour performance)
        const rawChannels = await database.get('channels')
          .query(Q.where('playlist_id', playlistId))
          // @ts-ignore
          .unsafeFetchRaw();

        // Créer mapping : nom_catégorie_normalisé → vrai_group_title
        const mapping = new Map<string, string>();

        rawChannels.forEach((ch: any) => {
          const realGroupTitle = ch.group_title;
          if (!realGroupTitle) return;

          // Créer plusieurs clés normalisées pointant vers le vrai nom
          const normalizedKey = this.normalizeKey(realGroupTitle);
          mapping.set(normalizedKey, realGroupTitle);
        });

        const loadTime = Date.now() - startTime;
        console.log(`✅ [CategoryMapping] Mapping créé en ${loadTime}ms: ${mapping.size} catégories uniques`);

        this.mappingCache = mapping;
        return mapping;
      } catch (error) {
        console.error(`❌ [CategoryMapping] Erreur chargement:`, error);
        this.loadingPromise = null;
        throw error;
      }
    })();

    return this.loadingPromise;
  }

  /**
   * Trouver le vrai group_title à partir d'un nom de catégorie
   */
  async findRealGroupTitle(categoryName: string, playlistId: string): Promise<string | null> {
    const mapping = await this.loadMapping(playlistId);

    // Essayer avec le nom normalisé
    const normalizedKey = this.normalizeKey(categoryName);
    const exact = mapping.get(normalizedKey);

    if (exact) {
      return exact;
    }

    // Recherche fuzzy : trouver une clé similaire
    const keywords = categoryName
      .split(/[\s\-\|]+/)
      .filter(w => w.length > 2)
      .map(w => w.toLowerCase());

    for (const [key, value] of mapping.entries()) {
      // Si la clé contient tous les mots-clés principaux
      const keyLower = key.toLowerCase();
      if (keywords.slice(0, 2).every(kw => keyLower.includes(kw))) {
        console.log(`🔍 [CategoryMapping] Match fuzzy: "${categoryName}" → "${value}"`);
        return value;
      }
    }

    return null;
  }

  /**
   * Normaliser un nom pour le mapping
   */
  private normalizeKey(name: string): string {
    return name
      .replace(/\s*\|\s*/g, '|')
      .replace(/\s*-\s*/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  /**
   * Vider le cache (utile lors du changement de playlist)
   */
  clearCache() {
    console.log(`🗑️ [CategoryMapping] Cache vidé`);
    this.mappingCache = null;
    this.loadingPromise = null;
  }
}

export default new CategoryMappingService();
