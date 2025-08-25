/**
 * 🔍 SearchService - Migration du SearchManager web
 * Moteur de recherche avancé avec recherche fuzzy et filtres multiples
 */

import type { Channel, SearchFilters, SearchResult } from '../types';

export interface SearchOptions {
  fuzzyTolerance?: number;
  maxResults?: number;
  enableFuzzy?: boolean;
  enableOperators?: boolean;
}

export class SearchService {
  private lastQuery: string = '';
  private lastResults: Channel[] = [];
  private searchHistory: string[] = [];
  private readonly maxHistorySize = 20;

  // Cache de suggestions pour auto-complétion
  private suggestionsCache = new Map<string, string[]>();
  private categories: Set<string> = new Set();
  private languages: Set<string> = new Set();
  private countries: Set<string> = new Set();

  // 🆕 Singleton pattern instance
  private static instance: SearchService;

  constructor() {
    console.log('🔍 SearchService initialized - Advanced search engine ready');
  }

  // 🆕 Support pour injection de dépendances (DI)
  // Cette méthode permet d'utiliser le service via DI ou singleton legacy
  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  // 🆕 Méthode statique pour compatibilité DI
  // Sera utilisée par le ServiceRegistry
  public static async createFromDI(): Promise<SearchService> {
    try {
      // Pour le moment, retourne une nouvelle instance
      // Plus tard, on pourra injecter des dépendances si nécessaire
      return new SearchService();
    } catch (error) {
      console.error('❌ Failed to create SearchService from DI:', error);
      // Fallback sur l'ancienne méthode
      return SearchService.getInstance();
    }
  }

  /**
   * Recherche principale avec support fuzzy et opérateurs booléens
   * Migration directe de SearchManager.js
   */
  searchChannels(
    channels: Channel[], 
    query: string, 
    filters?: SearchFilters,
    options: SearchOptions = {}
  ): SearchResult {
    const startTime = Date.now();
    
    if (!query.trim() && !filters) {
      return {
        channels,
        totalResults: channels.length,
        query: '',
        filters: {},
        executionTime: 0
      };
    }

    console.log(`🔍 Recherche: "${query}" avec ${channels.length} chaînes`);

    let filteredChannels = [...channels];
    
    // 1. Appliquer les filtres d'abord
    if (filters) {
      filteredChannels = this.applyFilters(filteredChannels, filters);
    }

    // 2. Recherche textuelle si query fournie
    if (query.trim()) {
      if (options.enableOperators && this.hasOperators(query)) {
        filteredChannels = this.searchWithOperators(filteredChannels, query);
      } else if (options.enableFuzzy) {
        filteredChannels = this.searchFuzzy(filteredChannels, query, options.fuzzyTolerance);
      } else {
        filteredChannels = this.searchExact(filteredChannels, query);
      }
      
      // Ajouter à l'historique
      this.addToHistory(query);
    }

    // 3. Limiter résultats si nécessaire
    if (options.maxResults && filteredChannels.length > options.maxResults) {
      filteredChannels = filteredChannels.slice(0, options.maxResults);
    }

    const executionTime = Date.now() - startTime;
    
    // Mettre à jour cache pour auto-complétion
    this.updateAutoComplete(channels);
    
    const result: SearchResult = {
      channels: filteredChannels,
      totalResults: filteredChannels.length,
      query,
      filters: filters || {},
      executionTime
    };

    console.log(`✅ Recherche terminée: ${result.totalResults} résultats en ${executionTime}ms`);
    this.lastQuery = query;
    this.lastResults = filteredChannels;

    return result;
  }

  /**
   * Recherche exacte (insensible à la casse)
   */
  private searchExact(channels: Channel[], query: string): Channel[] {
    const lowerQuery = query.toLowerCase().trim();
    
    return channels.filter(channel => {
      return (
        channel.name.toLowerCase().includes(lowerQuery) ||
        (channel.group && channel.group.toLowerCase().includes(lowerQuery)) ||
        (channel.category && channel.category.toLowerCase().includes(lowerQuery)) ||
        (channel.language && channel.language.toLowerCase().includes(lowerQuery)) ||
        (channel.country && channel.country.toLowerCase().includes(lowerQuery))
      );
    });
  }

  /**
   * Recherche fuzzy avec tolérance aux fautes de frappe
   * Utilise la distance de Levenshtein
   */
  private searchFuzzy(channels: Channel[], query: string, tolerance: number = 2): Channel[] {
    const lowerQuery = query.toLowerCase().trim();
    const results: { channel: Channel; score: number }[] = [];

    channels.forEach(channel => {
      let bestScore = Infinity;
      const searchFields = [
        channel.name,
        channel.group || '',
        channel.category || '',
        channel.language || '',
        channel.country || ''
      ];

      searchFields.forEach(field => {
        if (field) {
          const fieldLower = field.toLowerCase();
          
          // Recherche de sous-chaîne d'abord (score parfait)
          if (fieldLower.includes(lowerQuery)) {
            bestScore = 0;
            return;
          }

          // Distance de Levenshtein pour fuzzy matching
          const distance = this.levenshteinDistance(lowerQuery, fieldLower);
          if (distance <= tolerance) {
            bestScore = Math.min(bestScore, distance);
          }
        }
      });

      if (bestScore <= tolerance) {
        results.push({ channel, score: bestScore });
      }
    });

    // Trier par score (meilleur score = plus pertinent)
    return results
      .sort((a, b) => a.score - b.score)
      .map(result => result.channel);
  }

  /**
   * Recherche avec opérateurs booléens (AND, OR, NOT)
   * Migration logique web
   */
  private searchWithOperators(channels: Channel[], query: string): Channel[] {
    const normalizedQuery = query.trim();
    
    // Parser les opérateurs booléens
    const andTerms = this.extractTerms(normalizedQuery, 'AND');
    const orTerms = this.extractTerms(normalizedQuery, 'OR');
    const notTerms = this.extractTerms(normalizedQuery, 'NOT');

    return channels.filter(channel => {
      const searchableText = this.getSearchableText(channel).toLowerCase();
      
      // Vérifier termes AND (tous doivent être présents)
      const hasAllAndTerms = andTerms.every(term => 
        searchableText.includes(term.toLowerCase())
      );
      
      // Vérifier termes OR (au moins un doit être présent)
      const hasAnyOrTerm = orTerms.length === 0 || orTerms.some(term =>
        searchableText.includes(term.toLowerCase())
      );
      
      // Vérifier termes NOT (aucun ne doit être présent)
      const hasNoNotTerms = notTerms.every(term => 
        !searchableText.includes(term.toLowerCase())
      );
      
      return hasAllAndTerms && hasAnyOrTerm && hasNoNotTerms;
    });
  }

  /**
   * Appliquer filtres multiples
   */
  private applyFilters(channels: Channel[], filters: SearchFilters): Channel[] {
    return channels.filter(channel => {
      // Filtre par catégorie
      if (filters.category && channel.category !== filters.category) {
        return false;
      }
      
      // Filtre par langue
      if (filters.language && channel.language !== filters.language) {
        return false;
      }
      
      // Filtre par pays
      if (filters.country && channel.country !== filters.country) {
        return false;
      }
      
      // Filtre par qualité
      if (filters.quality && channel.quality !== filters.quality) {
        return false;
      }
      
      // Filtre contenu adulte
      if (filters.adultContent === false && channel.isAdult === true) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Obtenir suggestions pour auto-complétion
   */
  getSuggestions(partialQuery: string, maxSuggestions: number = 10): string[] {
    const lowerPartial = partialQuery.toLowerCase().trim();
    
    if (!lowerPartial || lowerPartial.length < 2) {
      return this.searchHistory.slice(0, maxSuggestions);
    }

    // Vérifier cache
    if (this.suggestionsCache.has(lowerPartial)) {
      return this.suggestionsCache.get(lowerPartial)!.slice(0, maxSuggestions);
    }

    // Générer suggestions depuis categories, langues, pays
    const suggestions: string[] = [];
    
    // Suggestions depuis historique
    this.searchHistory.forEach(historyItem => {
      if (historyItem.toLowerCase().includes(lowerPartial)) {
        suggestions.push(historyItem);
      }
    });
    
    // Suggestions depuis catégories
    this.categories.forEach(category => {
      if (category.toLowerCase().includes(lowerPartial)) {
        suggestions.push(category);
      }
    });
    
    // Suggestions depuis langues
    this.languages.forEach(language => {
      if (language.toLowerCase().includes(lowerPartial)) {
        suggestions.push(language);
      }
    });
    
    // Suggestions depuis pays
    this.countries.forEach(country => {
      if (country.toLowerCase().includes(lowerPartial)) {
        suggestions.push(country);
      }
    });
    
    // Dédupliquer et mettre en cache
    const uniqueSuggestions = [...new Set(suggestions)];
    this.suggestionsCache.set(lowerPartial, uniqueSuggestions);
    
    return uniqueSuggestions.slice(0, maxSuggestions);
  }

  /**
   * Obtenir filtres disponibles basés sur les chaînes
   */
  getAvailableFilters(channels: Channel[]): {
    categories: string[];
    languages: string[];
    countries: string[];
    qualities: string[];
  } {
    const categories = new Set<string>();
    const languages = new Set<string>();
    const countries = new Set<string>();
    const qualities = new Set<string>();

    channels.forEach(channel => {
      if (channel.category) categories.add(channel.category);
      if (channel.language) languages.add(channel.language);
      if (channel.country) countries.add(channel.country);
      if (channel.quality) qualities.add(channel.quality);
    });

    return {
      categories: Array.from(categories).sort(),
      languages: Array.from(languages).sort(),
      countries: Array.from(countries).sort(),
      qualities: Array.from(qualities).sort()
    };
  }

  /**
   * Obtenir historique de recherche
   */
  getSearchHistory(): string[] {
    return [...this.searchHistory];
  }

  /**
   * Nettoyer historique de recherche
   */
  clearSearchHistory(): void {
    this.searchHistory = [];
    this.suggestionsCache.clear();
    console.log('🧹 Historique de recherche effacé');
  }

  // ========== MÉTHODES UTILITAIRES ==========

  private hasOperators(query: string): boolean {
    return /\b(AND|OR|NOT)\b/i.test(query);
  }

  private extractTerms(query: string, operator: string): string[] {
    const regex = new RegExp(`\\b${operator}\\s+([^\\s]+)`, 'gi');
    const matches = [];
    let match;
    
    while ((match = regex.exec(query)) !== null) {
      matches.push(match[1]);
    }
    
    return matches;
  }

  private getSearchableText(channel: Channel): string {
    return [
      channel.name,
      channel.group || '',
      channel.category || '',
      channel.language || '',
      channel.country || ''
    ].join(' ');
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix = [];
    
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[b.length][a.length];
  }

  private addToHistory(query: string): void {
    if (!query.trim()) return;
    
    // Supprimer si déjà présent
    const index = this.searchHistory.indexOf(query);
    if (index > -1) {
      this.searchHistory.splice(index, 1);
    }
    
    // Ajouter au début
    this.searchHistory.unshift(query);
    
    // Limiter taille
    if (this.searchHistory.length > this.maxHistorySize) {
      this.searchHistory = this.searchHistory.slice(0, this.maxHistorySize);
    }
  }

  private updateAutoComplete(channels: Channel[]): void {
    // Mettre à jour sets pour auto-complétion
    channels.forEach(channel => {
      if (channel.category) this.categories.add(channel.category);
      if (channel.language) this.languages.add(channel.language);
      if (channel.country) this.countries.add(channel.country);
    });
  }

  /**
   * Obtenir statistiques de recherche
   */
  getStats() {
    return {
      lastQuery: this.lastQuery,
      lastResultsCount: this.lastResults.length,
      historySize: this.searchHistory.length,
      cacheSize: this.suggestionsCache.size,
      categoriesCount: this.categories.size,
      languagesCount: this.languages.size,
      countriesCount: this.countries.size
    };
  }

  /**
   * Nettoyer ressources
   */
  dispose(): void {
    this.lastResults = [];
    this.searchHistory = [];
    this.suggestionsCache.clear();
    this.categories.clear();
    this.languages.clear();
    this.countries.clear();
    console.log('🧹 SearchService disposed');
  }
}

// Export singleton instance
export const searchService = new SearchService();