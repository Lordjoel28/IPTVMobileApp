/**
 * 🔍 SearchManager - React Native Migration
 * Moteur recherche avancé avec fuzzy search, filtres et auto-complétion
 * Migration DIRECTE de l'architecture web ultra-optimisée
 */

import { Channel } from '../parsers/UltraOptimizedM3UParser';
import StorageAdapter from '../../storage/StorageAdapter';

export interface SearchOptions {
  fuzzySearch?: boolean;
  caseSensitive?: boolean;
  maxResults?: number;
  categories?: string[];
  qualities?: string[];
  languages?: string[];
  countries?: string[];
  minScore?: number;
}

export interface SearchResult {
  channel: Channel;
  score: number;
  matchedFields: string[];
  highlightedName?: string;
}

export interface SearchStats {
  totalSearches: number;
  averageSearchTime: number;
  cacheHitRate: number;
  indexSize: number;
  lastReindexTime: number;
}

export interface AutoCompleteResult {
  suggestion: string;
  type: 'channel' | 'category' | 'recent';
  count?: number;
}

export interface SearchFilter {
  field: keyof Channel;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith';
  value: string;
}

/**
 * Fuzzy Search avec algorithme Levenshtein optimisé
 */
class FuzzySearchEngine {
  /**
   * Distance Levenshtein optimisée
   */
  static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array.from({ length: str1.length + 1 }, () => 
      Array(str2.length + 1).fill(0)
    );

    for (let i = 0; i <= str1.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= str2.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= str1.length; i++) {
      for (let j = 1; j <= str2.length; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // Deletion
          matrix[i][j - 1] + 1,     // Insertion
          matrix[i - 1][j - 1] + cost // Substitution
        );
      }
    }

    return matrix[str1.length][str2.length];
  }

  /**
   * Score de similarité fuzzy (0-1)
   */
  static fuzzyScore(query: string, target: string): number {
    if (query === target) return 1;
    if (query.length === 0) return 0;

    const distance = this.levenshteinDistance(
      query.toLowerCase(), 
      target.toLowerCase()
    );
    const maxLength = Math.max(query.length, target.length);
    
    return 1 - (distance / maxLength);
  }

  /**
   * Recherche avec N-grammes pour améliorer performance
   */
  static generateNGrams(text: string, n: number = 3): string[] {
    const ngrams: string[] = [];
    const normalized = text.toLowerCase();
    
    for (let i = 0; i <= normalized.length - n; i++) {
      ngrams.push(normalized.substring(i, i + n));
    }
    
    return ngrams;
  }

  /**
   * Score basé sur N-grammes (plus rapide pour gros datasets)
   */
  static ngramScore(query: string, target: string): number {
    const queryNGrams = new Set(this.generateNGrams(query));
    const targetNGrams = this.generateNGrams(target);
    
    let matches = 0;
    for (const ngram of targetNGrams) {
      if (queryNGrams.has(ngram)) {
        matches++;
      }
    }
    
    return matches / Math.max(queryNGrams.size, targetNGrams.length);
  }
}

/**
 * Index de recherche optimisé
 */
class SearchIndex {
  private index: Map<string, Set<string>> = new Map(); // ngram -> channelIds
  private channels: Map<string, Channel> = new Map(); // channelId -> Channel
  private categories: Set<string> = new Set();
  private qualities: Set<string> = new Set();
  private languages: Set<string> = new Set();
  private countries: Set<string> = new Set();

  /**
   * Construire index depuis channels
   */
  buildIndex(channels: Channel[]): void {
    console.log(`🔍 Building search index for ${channels.length} channels`);
    const startTime = Date.now();
    
    this.clearIndex();
    
    for (const channel of channels) {
      this.indexChannel(channel);
    }
    
    console.log(`✅ Search index built in ${Date.now() - startTime}ms`);
  }

  /**
   * Indexer une chaîne individuelle
   */
  private indexChannel(channel: Channel): void {
    this.channels.set(channel.id, channel);
    
    // Index texte principal
    const searchableText = [
      channel.name,
      channel.category || '',
      channel.groupTitle || '',
      channel.language || '',
      channel.country || ''
    ].join(' ').toLowerCase();

    // Générer N-grammes
    const ngrams = FuzzySearchEngine.generateNGrams(searchableText);
    for (const ngram of ngrams) {
      if (!this.index.has(ngram)) {
        this.index.set(ngram, new Set());
      }
      this.index.get(ngram)!.add(channel.id);
    }

    // Index facettes
    if (channel.category) this.categories.add(channel.category);
    if (channel.quality) this.qualities.add(channel.quality);
    if (channel.language) this.languages.add(channel.language);
    if (channel.country) this.countries.add(channel.country);
  }

  /**
   * Recherche candidates par N-grammes
   */
  findCandidates(query: string): Set<string> {
    const queryNGrams = FuzzySearchEngine.generateNGrams(query.toLowerCase());
    const candidates = new Set<string>();
    
    for (const ngram of queryNGrams) {
      const channelIds = this.index.get(ngram);
      if (channelIds) {
        channelIds.forEach(id => candidates.add(id));
      }
    }
    
    return candidates;
  }

  /**
   * Obtenir channel par ID
   */
  getChannel(channelId: string): Channel | undefined {
    return this.channels.get(channelId);
  }

  /**
   * Obtenir facettes pour auto-complétion
   */
  getFacets(): {
    categories: string[];
    qualities: string[];
    languages: string[];
    countries: string[];
  } {
    return {
      categories: Array.from(this.categories).sort(),
      qualities: Array.from(this.qualities).sort(),
      languages: Array.from(this.languages).sort(),
      countries: Array.from(this.countries).sort()
    };
  }

  private clearIndex(): void {
    this.index.clear();
    this.channels.clear();
    this.categories.clear();
    this.qualities.clear();
    this.languages.clear();
    this.countries.clear();
  }

  get size(): number {
    return this.channels.size;
  }
}

export class SearchManager {
  private searchIndex: SearchIndex;
  private storage: StorageAdapter;
  private searchHistory: string[] = [];
  private stats: SearchStats;
  private recentSearches: Map<string, number> = new Map(); // query -> timestamp

  constructor(storageAdapter?: StorageAdapter) {
    this.searchIndex = new SearchIndex();
    this.storage = storageAdapter || new StorageAdapter();
    this.resetStats();
    this.loadSearchHistory();
  }

  /**
   * Initialiser avec channels
   */
  async initialize(channels: Channel[]): Promise<void> {
    console.log('🔄 Initializing SearchManager...');
    
    // Construire index
    this.searchIndex.buildIndex(channels);
    
    // Charger historique
    await this.loadSearchHistory();
    
    // Charger stats
    const savedStats = await this.storage.get('search_stats');
    if (savedStats) {
      this.stats = { ...this.stats, ...savedStats };
    }

    this.stats.indexSize = this.searchIndex.size;
    this.stats.lastReindexTime = Date.now();
    
    console.log('✅ SearchManager initialized:', this.getStats());
  }

  /**
   * Recherche principale
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const startTime = Date.now();
    this.stats.totalSearches++;

    try {
      if (!query.trim()) {
        return [];
      }

      const normalizedQuery = query.trim();
      console.log(`🔍 Searching for: "${normalizedQuery}"`);

      // Vérifier cache
      const cacheKey = `search_${btoa(normalizedQuery + JSON.stringify(options))}`;
      if (!options.fuzzySearch) { // Cache seulement pour recherche exacte
        const cached = await this.storage.get(cacheKey);
        if (cached && this.isCacheValid(cached, 0.5)) { // 30 min cache
          console.log('⚡ Using cached search results');
          this.stats.cacheHitRate = this.updateHitRate(this.stats.cacheHitRate, true);
          this.updateSearchTime(Date.now() - startTime);
          return cached.results;
        }
      }
      
      this.stats.cacheHitRate = this.updateHitRate(this.stats.cacheHitRate, false);

      // Recherche avec index
      const results = await this.performSearch(normalizedQuery, options);
      
      // Sauver en cache
      await this.storage.set(cacheKey, {
        results,
        timestamp: Date.now()
      });

      // Ajouter à l'historique
      this.addToHistory(normalizedQuery);

      this.updateSearchTime(Date.now() - startTime);
      console.log(`✅ Found ${results.length} results in ${Date.now() - startTime}ms`);
      
      return results;

    } catch (error) {
      console.error('❌ Search failed:', error);
      this.updateSearchTime(Date.now() - startTime);
      return [];
    }
  }

  /**
   * Recherche avec filtres avancés
   */
  async advancedSearch(
    query: string, 
    filters: SearchFilter[], 
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    console.log('🔍 Advanced search with filters:', filters);
    
    // Recherche de base
    let results = await this.search(query, options);
    
    // Appliquer filtres
    for (const filter of filters) {
      results = this.applyFilter(results, filter);
    }
    
    return results;
  }

  /**
   * Auto-complétion intelligente
   */
  async getAutoComplete(query: string, limit: number = 10): Promise<AutoCompleteResult[]> {
    if (query.length < 2) {
      return this.getRecentSearches(limit);
    }

    const suggestions: AutoCompleteResult[] = [];
    const normalizedQuery = query.toLowerCase();
    
    // Suggestions depuis facettes
    const facets = this.searchIndex.getFacets();
    
    // Catégories matchantes
    for (const category of facets.categories) {
      if (category.toLowerCase().includes(normalizedQuery)) {
        suggestions.push({
          suggestion: category,
          type: 'category'
        });
      }
    }
    
    // TODO: Suggestions depuis noms de chaînes (top matches)
    
    // Recherches récentes matchantes
    for (const recent of this.searchHistory) {
      if (recent.toLowerCase().includes(normalizedQuery)) {
        suggestions.push({
          suggestion: recent,
          type: 'recent'
        });
      }
    }
    
    return suggestions.slice(0, limit);
  }

  /**
   * Recherches récentes
   */
  getRecentSearches(limit: number = 10): AutoCompleteResult[] {
    return this.searchHistory
      .slice(-limit)
      .reverse()
      .map(query => ({
        suggestion: query,
        type: 'recent' as const
      }));
  }

  /**
   * Supprimer de l'historique
   */
  async clearHistory(): Promise<void> {
    this.searchHistory = [];
    this.recentSearches.clear();
    await this.storage.delete('search_history');
  }

  /**
   * Statistiques
   */
  getStats(): SearchStats {
    return { ...this.stats };
  }

  /**
   * MÉTHODES PRIVÉES
   */

  private async performSearch(query: string, options: SearchOptions): Promise<SearchResult[]> {
    // Trouver candidates via index
    const candidateIds = this.searchIndex.findCandidates(query);
    console.log(`📊 Found ${candidateIds.size} candidate channels`);
    
    const results: SearchResult[] = [];
    const minScore = options.minScore || 0.3;
    
    // Score chaque candidate
    for (const channelId of candidateIds) {
      const channel = this.searchIndex.getChannel(channelId);
      if (!channel) continue;
      
      // Vérifier filtres de base
      if (!this.matchesBasicFilters(channel, options)) {
        continue;
      }
      
      const searchResult = this.scoreChannel(query, channel, options);
      if (searchResult.score >= minScore) {
        results.push(searchResult);
      }
    }
    
    // Trier par score décroissant
    results.sort((a, b) => b.score - a.score);
    
    // Limiter résultats
    const maxResults = options.maxResults || 100;
    return results.slice(0, maxResults);
  }

  private scoreChannel(query: string, channel: Channel, options: SearchOptions): SearchResult {
    const matchedFields: string[] = [];
    let totalScore = 0;
    let fieldCount = 0;
    
    // Score nom (poids le plus important)
    const nameScore = options.fuzzySearch 
      ? FuzzySearchEngine.fuzzyScore(query, channel.name)
      : this.exactMatchScore(query, channel.name);
    
    if (nameScore > 0) {
      matchedFields.push('name');
      totalScore += nameScore * 3; // Poids x3 pour nom
      fieldCount += 3;
    }
    
    // Score catégorie
    if (channel.category) {
      const categoryScore = options.fuzzySearch
        ? FuzzySearchEngine.fuzzyScore(query, channel.category)
        : this.exactMatchScore(query, channel.category);
      
      if (categoryScore > 0) {
        matchedFields.push('category');
        totalScore += categoryScore * 2; // Poids x2 pour catégorie
        fieldCount += 2;
      }
    }
    
    // Score groupe
    if (channel.groupTitle) {
      const groupScore = options.fuzzySearch
        ? FuzzySearchEngine.fuzzyScore(query, channel.groupTitle)
        : this.exactMatchScore(query, channel.groupTitle);
      
      if (groupScore > 0) {
        matchedFields.push('groupTitle');
        totalScore += groupScore; // Poids x1 pour groupe
        fieldCount += 1;
      }
    }
    
    const finalScore = fieldCount > 0 ? totalScore / fieldCount : 0;
    
    return {
      channel,
      score: Math.round(finalScore * 1000) / 1000,
      matchedFields,
      highlightedName: this.highlightMatches(channel.name, query)
    };
  }

  private exactMatchScore(query: string, target: string): number {
    const normalizedQuery = query.toLowerCase();
    const normalizedTarget = target.toLowerCase();
    
    if (normalizedTarget === normalizedQuery) return 1.0;
    if (normalizedTarget.startsWith(normalizedQuery)) return 0.9;
    if (normalizedTarget.includes(normalizedQuery)) return 0.7;
    
    return 0;
  }

  private matchesBasicFilters(channel: Channel, options: SearchOptions): boolean {
    if (options.categories && options.categories.length > 0) {
      if (!channel.category || !options.categories.includes(channel.category)) {
        return false;
      }
    }
    
    if (options.qualities && options.qualities.length > 0) {
      if (!channel.quality || !options.qualities.includes(channel.quality)) {
        return false;
      }
    }
    
    if (options.languages && options.languages.length > 0) {
      if (!channel.language || !options.languages.includes(channel.language)) {
        return false;
      }
    }
    
    if (options.countries && options.countries.length > 0) {
      if (!channel.country || !options.countries.includes(channel.country)) {
        return false;
      }
    }
    
    return true;
  }

  private applyFilter(results: SearchResult[], filter: SearchFilter): SearchResult[] {
    return results.filter(result => {
      const fieldValue = result.channel[filter.field] as string;
      if (!fieldValue) return false;
      
      const normalized = filter.value.toLowerCase();
      const target = fieldValue.toLowerCase();
      
      switch (filter.operator) {
        case 'equals': return target === normalized;
        case 'contains': return target.includes(normalized);
        case 'startsWith': return target.startsWith(normalized);
        case 'endsWith': return target.endsWith(normalized);
        default: return false;
      }
    });
  }

  private highlightMatches(text: string, query: string): string {
    if (!query || query.length < 2) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  private async addToHistory(query: string): Promise<void> {
    // Éviter doublons
    const index = this.searchHistory.indexOf(query);
    if (index > -1) {
      this.searchHistory.splice(index, 1);
    }
    
    // Ajouter en fin
    this.searchHistory.push(query);
    
    // Limiter historique
    if (this.searchHistory.length > 50) {
      this.searchHistory = this.searchHistory.slice(-50);
    }
    
    // Sauvegarder
    await this.storage.set('search_history', this.searchHistory);
    
    // Tracker récentes avec timestamp
    this.recentSearches.set(query, Date.now());
  }

  private async loadSearchHistory(): Promise<void> {
    try {
      const history = await this.storage.get('search_history');
      if (Array.isArray(history)) {
        this.searchHistory = history;
      }
    } catch (error) {
      console.error('Failed to load search history:', error);
      this.searchHistory = [];
    }
  }

  private isCacheValid(cached: any, maxAgeHours: number): boolean {
    if (!cached.timestamp) return false;
    const ageHours = (Date.now() - cached.timestamp) / (1000 * 60 * 60);
    return ageHours < maxAgeHours;
  }

  private updateHitRate(currentRate: number, hit: boolean): number {
    const alpha = 0.1;
    return currentRate * (1 - alpha) + (hit ? 1 : 0) * alpha;
  }

  private updateSearchTime(time: number): void {
    const alpha = 0.1;
    this.stats.averageSearchTime = this.stats.averageSearchTime * (1 - alpha) + time * alpha;
  }

  private resetStats(): void {
    this.stats = {
      totalSearches: 0,
      averageSearchTime: 0,
      cacheHitRate: 0,
      indexSize: 0,
      lastReindexTime: 0
    };
  }

  /**
   * Réindexation complète
   */
  async reindex(channels: Channel[]): Promise<void> {
    console.log('🔄 Reindexing search engine...');
    this.searchIndex.buildIndex(channels);
    this.stats.indexSize = this.searchIndex.size;
    this.stats.lastReindexTime = Date.now();
    
    // Sauvegarder stats
    await this.storage.set('search_stats', this.stats);
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    this.searchHistory = [];
    this.recentSearches.clear();
    this.resetStats();
  }
}

export default SearchManager;