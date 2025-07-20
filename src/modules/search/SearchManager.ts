import { Channel } from '../../types';
import { PlaylistManager } from '../playlist/PlaylistManager';

export interface SearchResult {
  channel: Channel;
  relevance: number;
  matchType: 'name' | 'category' | 'group' | 'description';
  matchedText: string;
}

export interface SearchFilters {
  categories: string[];
  languages: string[];
  countries: string[];
  hasLogo: boolean | null;
}

export interface SearchState {
  query: string;
  results: SearchResult[];
  isSearching: boolean;
  filters: SearchFilters;
  recentSearches: string[];
  suggestions: string[];
}

export class SearchManager {
  private static instance: SearchManager;
  private state: SearchState;
  private playlistManager: PlaylistManager;
  private listeners: Array<(state: SearchState) => void> = [];
  private searchTimeout: NodeJS.Timeout | null = null;

  private constructor() {
    this.playlistManager = PlaylistManager.getInstance();
    
    this.state = {
      query: '',
      results: [],
      isSearching: false,
      filters: {
        categories: [],
        languages: [],
        countries: [],
        hasLogo: null,
      },
      recentSearches: [],
      suggestions: [],
    };

    this.initialize();
  }

  public static getInstance(): SearchManager {
    if (!SearchManager.instance) {
      SearchManager.instance = new SearchManager();
    }
    return SearchManager.instance;
  }

  private async initialize(): Promise<void> {
    try {
      await this.loadRecentSearches();
      console.log('🔍 SearchManager initialisé');
    } catch (error) {
      console.error('❌ Erreur initialisation SearchManager:', error);
    }
  }

  // State management
  getState(): SearchState {
    return { ...this.state };
  }

  subscribe(listener: (state: SearchState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private setState(updates: Partial<SearchState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Search functionality
  async search(query: string, useFilters: boolean = true): Promise<SearchResult[]> {
    console.log('🔍 Recherche:', query);
    
    this.setState({ 
      query, 
      isSearching: true 
    });

    // Clear previous timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Debounce search
    return new Promise((resolve) => {
      this.searchTimeout = setTimeout(async () => {
        try {
          const results = await this.performSearch(query, useFilters);
          
          this.setState({
            results,
            isSearching: false,
          });

          // Add to recent searches if not empty
          if (query.trim()) {
            await this.addRecentSearch(query.trim());
          }

          resolve(results);
        } catch (error) {
          console.error('❌ Erreur recherche:', error);
          this.setState({
            results: [],
            isSearching: false,
          });
          resolve([]);
        }
      }, 300);
    });
  }

  private async performSearch(query: string, useFilters: boolean): Promise<SearchResult[]> {
    if (!query.trim()) {
      return [];
    }

    const allChannels = this.playlistManager.getAllChannels();
    const lowerQuery = query.toLowerCase().trim();
    const results: SearchResult[] = [];

    for (const channel of allChannels) {
      const searchResult = this.scoreChannel(channel, lowerQuery);
      if (searchResult) {
        results.push(searchResult);
      }
    }

    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance);

    // Apply filters if enabled
    if (useFilters) {
      return this.applyFilters(results);
    }

    return results.slice(0, 100); // Limit results
  }

  private scoreChannel(channel: Channel, query: string): SearchResult | null {
    let relevance = 0;
    let matchType: SearchResult['matchType'] = 'name';
    let matchedText = '';

    // Name matching (highest priority)
    const nameMatch = this.fuzzyMatch(channel.name.toLowerCase(), query);
    if (nameMatch.score > 0) {
      relevance += nameMatch.score * 10;
      matchType = 'name';
      matchedText = channel.name;
    }

    // Category matching
    if (channel.category) {
      const categoryMatch = this.fuzzyMatch(channel.category.toLowerCase(), query);
      if (categoryMatch.score > 0) {
        relevance += categoryMatch.score * 5;
        if (matchType === 'name' && categoryMatch.score > nameMatch.score) {
          matchType = 'category';
          matchedText = channel.category;
        }
      }
    }

    // Group matching
    if (channel.group) {
      const groupMatch = this.fuzzyMatch(channel.group.toLowerCase(), query);
      if (groupMatch.score > 0) {
        relevance += groupMatch.score * 3;
        if (matchType === 'name' && groupMatch.score > nameMatch.score) {
          matchType = 'group';
          matchedText = channel.group;
        }
      }
    }

    // Country/Language matching
    if (channel.country && channel.country.toLowerCase().includes(query)) {
      relevance += 2;
    }
    if (channel.language && channel.language.toLowerCase().includes(query)) {
      relevance += 2;
    }

    // Boost for exact matches
    if (channel.name.toLowerCase() === query) {
      relevance += 50;
    }

    // Boost for channels with logos
    if (channel.logo) {
      relevance += 1;
    }

    return relevance > 0 ? {
      channel,
      relevance,
      matchType,
      matchedText: matchedText || channel.name,
    } : null;
  }

  private fuzzyMatch(text: string, query: string): { score: number; matches: number[] } {
    if (text.includes(query)) {
      return { score: 100, matches: [] };
    }

    const textLen = text.length;
    const queryLen = query.length;
    
    if (queryLen > textLen) {
      return { score: 0, matches: [] };
    }

    let score = 0;
    let textIndex = 0;
    const matches: number[] = [];

    for (let queryIndex = 0; queryIndex < queryLen; queryIndex++) {
      const queryChar = query[queryIndex];
      let found = false;

      while (textIndex < textLen) {
        if (text[textIndex] === queryChar) {
          matches.push(textIndex);
          score += queryLen - queryIndex;
          textIndex++;
          found = true;
          break;
        }
        textIndex++;
      }

      if (!found) {
        return { score: 0, matches: [] };
      }
    }

    // Normalize score
    score = (score / (queryLen * queryLen)) * 100;

    return { score, matches };
  }

  private applyFilters(results: SearchResult[]): SearchResult[] {
    const { filters } = this.state;
    
    return results.filter(result => {
      const { channel } = result;

      // Category filter
      if (filters.categories.length > 0) {
        if (!channel.category || !filters.categories.includes(channel.category)) {
          return false;
        }
      }

      // Language filter
      if (filters.languages.length > 0) {
        if (!channel.language || !filters.languages.includes(channel.language)) {
          return false;
        }
      }

      // Country filter
      if (filters.countries.length > 0) {
        if (!channel.country || !filters.countries.includes(channel.country)) {
          return false;
        }
      }

      // Logo filter
      if (filters.hasLogo !== null) {
        const hasLogo = !!channel.logo;
        if (hasLogo !== filters.hasLogo) {
          return false;
        }
      }

      return true;
    });
  }

  // Filters
  setFilters(filters: Partial<SearchFilters>): void {
    this.setState({
      filters: { ...this.state.filters, ...filters }
    });

    // Re-search with new filters if there's an active query
    if (this.state.query) {
      this.search(this.state.query, true);
    }
  }

  clearFilters(): void {
    this.setState({
      filters: {
        categories: [],
        languages: [],
        countries: [],
        hasLogo: null,
      }
    });

    // Re-search without filters
    if (this.state.query) {
      this.search(this.state.query, false);
    }
  }

  getAvailableFilters() {
    const allChannels = this.playlistManager.getAllChannels();
    const categories = new Set<string>();
    const languages = new Set<string>();
    const countries = new Set<string>();

    allChannels.forEach(channel => {
      if (channel.category) categories.add(channel.category);
      if (channel.language) languages.add(channel.language);
      if (channel.country) countries.add(channel.country);
    });

    return {
      categories: Array.from(categories).sort(),
      languages: Array.from(languages).sort(),
      countries: Array.from(countries).sort(),
    };
  }

  // Suggestions
  generateSuggestions(): string[] {
    const allChannels = this.playlistManager.getAllChannels();
    const suggestions = new Set<string>();

    // Add popular categories
    const categories = new Map<string, number>();
    allChannels.forEach(channel => {
      if (channel.category) {
        categories.set(channel.category, (categories.get(channel.category) || 0) + 1);
      }
    });

    // Sort categories by popularity and add top 5
    Array.from(categories.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([category]) => suggestions.add(category));

    // Add some popular terms
    const popularTerms = ['Sport', 'News', 'Movies', 'Music', 'Kids', 'Documentary'];
    popularTerms.forEach(term => suggestions.add(term));

    this.setState({ suggestions: Array.from(suggestions).slice(0, 10) });
    return Array.from(suggestions);
  }

  // Recent searches
  private async loadRecentSearches(): Promise<void> {
    try {
      // Implementation would load from AsyncStorage
      this.setState({ recentSearches: [] });
    } catch (error) {
      console.error('❌ Erreur chargement recherches récentes:', error);
    }
  }

  private async addRecentSearch(query: string): Promise<void> {
    try {
      let recent = [...this.state.recentSearches];
      
      // Remove if already exists
      recent = recent.filter(s => s.toLowerCase() !== query.toLowerCase());
      
      // Add to beginning
      recent.unshift(query);
      
      // Keep only last 10
      recent = recent.slice(0, 10);

      this.setState({ recentSearches: recent });
      
      // Save to storage
      // Implementation would save to AsyncStorage
      
    } catch (error) {
      console.error('❌ Erreur sauvegarde recherche récente:', error);
    }
  }

  clearRecentSearches(): void {
    this.setState({ recentSearches: [] });
    // Implementation would clear from AsyncStorage
  }

  // Quick search
  quickSearch(category: string): Promise<SearchResult[]> {
    return this.search(category, false);
  }

  searchByCategory(category: string): SearchResult[] {
    const allChannels = this.playlistManager.getAllChannels();
    return allChannels
      .filter(channel => channel.category === category)
      .map(channel => ({
        channel,
        relevance: 100,
        matchType: 'category' as const,
        matchedText: category,
      }));
  }

  // Clear search
  clearSearch(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    this.setState({
      query: '',
      results: [],
      isSearching: false,
    });
  }

  // Statistics
  getStats() {
    const allChannels = this.playlistManager.getAllChannels();
    const filters = this.getAvailableFilters();
    
    return {
      totalChannels: allChannels.length,
      availableCategories: filters.categories.length,
      availableLanguages: filters.languages.length,
      availableCountries: filters.countries.length,
      currentResults: this.state.results.length,
      recentSearches: this.state.recentSearches.length,
      hasActiveFilters: Object.values(this.state.filters).some(f => 
        Array.isArray(f) ? f.length > 0 : f !== null
      ),
    };
  }

  // Cleanup
  destroy(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.listeners = [];
    console.log('🧹 SearchManager détruit');
  }
}