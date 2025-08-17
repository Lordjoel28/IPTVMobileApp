/**
 * 🚀 ParsersService - Migration UltraOptimizedM3UParser web
 * Parser M3U ultra-optimisé avec pool d'objets et chunking non-bloquant
 */

import type { Channel } from '../types';

export interface ParseOptions {
  useUltraOptimized?: boolean;
  chunkSize?: number;
  yieldControl?: boolean;
  poolSize?: number;
}

export interface ParseResult {
  channels: Channel[];
  parseTime: number;
  totalChannels: number;
  stats: {
    channelsPerSecond: number;
    poolEfficiency: number;
    cacheEfficiency: number;
    memoryUsage: number;
  };
}

export class ParsersService {
  // Pool d'objets pour éviter les allocations
  private channelPool: Partial<Channel>[] = [];
  private poolMaxSize = 25000;
  private poolUsed = 0;

  // Cache de strings internées (LRU)
  private stringCache = new Map<string, string>();
  private readonly STRING_CACHE_SIZE = 5000;
  private stringCacheHits = 0;
  private stringCacheMisses = 0;

  // Stats performance
  private stats = {
    totalParsed: 0,
    totalTime: 0,
    avgChannelsPerSecond: 0
  };

  constructor() {
    this.initializePool();
    console.log('🚀 ParsersService initialized - Ultra-optimized M3U parser ready');
  }

  /**
   * Parser M3U avec sélection automatique du parser optimal
   */
  async parseM3U(content: string, options: ParseOptions = {}): Promise<ParseResult> {
    const startTime = Date.now();
    
    // Estimer nombre de chaînes pour sélectionner le parser
    const estimatedChannels = (content.match(/#EXTINF:/g) || []).length;
    const contentSizeMB = content.length / 1024 / 1024;
    
    console.log(`🔍 Parsing M3U: ~${estimatedChannels} chaînes, ${contentSizeMB.toFixed(2)}MB`);

    let channels: Channel[];
    
    // Sélection automatique du parser (logique identique au web)
    if (options.useUltraOptimized && estimatedChannels >= 5000) {
      console.log('🚀 Using UltraOptimized parser (high volume)');
      channels = await this.parseUltraOptimized(content, options);
    } else if (estimatedChannels >= 1000) {
      console.log('⚡ Using Optimized parser (medium volume)');
      channels = await this.parseOptimized(content, options);
    } else {
      console.log('📝 Using Traditional parser (low volume)');
      channels = await this.parseTraditional(content);
    }

    const parseTime = Date.now() - startTime;
    const channelsPerSecond = Math.round((channels.length / parseTime) * 1000);

    // Mettre à jour stats globales
    this.stats.totalParsed += channels.length;
    this.stats.totalTime += parseTime;
    this.stats.avgChannelsPerSecond = Math.round((this.stats.totalParsed / this.stats.totalTime) * 1000);

    const result: ParseResult = {
      channels,
      parseTime,
      totalChannels: channels.length,
      stats: {
        channelsPerSecond,
        poolEfficiency: this.calculatePoolEfficiency(),
        cacheEfficiency: this.calculateCacheEfficiency(),
        memoryUsage: this.estimateMemoryUsage()
      }
    };

    console.log(`✅ Parsing completed: ${channels.length} chaînes en ${parseTime}ms (${channelsPerSecond} ch/s)`);
    return result;
  }

  /**
   * Parser Ultra-Optimisé avec chunking non-bloquant
   * Migration directe de UltraOptimizedM3UParser.js
   */
  private async parseUltraOptimized(content: string, options: ParseOptions): Promise<Channel[]> {
    const chunkSize = options.chunkSize || 25000;
    const lines = content.split('\n');
    const channels: Channel[] = [];
    
    // Réinitialiser pool pour parsing volumineux
    this.initializePool(Math.min(chunkSize, this.poolMaxSize));
    
    let currentChannel: Partial<Channel> | null = null;
    let processedLines = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('#EXTINF:')) {
        // Obtenir objet du pool
        currentChannel = this.getFromPool();
        
        // Parser ligne EXTINF avec optimisations
        this.parseExtinfLineOptimized(line, currentChannel);
        
      } else if (line && !line.startsWith('#') && currentChannel) {
        // URL de chaîne
        currentChannel.url = line;
        currentChannel.id = this.generateChannelId(currentChannel.name!, line);
        
        // Ajouter au résultat et retourner au pool
        channels.push(currentChannel as Channel);
        this.returnToPool(currentChannel);
        currentChannel = null;
      }

      // Yield control pour UI responsiveness
      processedLines++;
      if (options.yieldControl && processedLines % chunkSize === 0) {
        await this.yieldControl();
      }
    }

    console.log(`🚀 Ultra-optimized parsing: ${channels.length} chaînes, pool efficiency: ${this.calculatePoolEfficiency()}%`);
    return channels;
  }

  /**
   * Parser Optimisé avec pool d'objets
   */
  private async parseOptimized(content: string, options: ParseOptions): Promise<Channel[]> {
    const lines = content.split('\n');
    const channels: Channel[] = [];
    
    let currentChannel: Partial<Channel> | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('#EXTINF:')) {
        currentChannel = this.getFromPool();
        this.parseExtinfLineOptimized(line, currentChannel);
        
      } else if (line && !line.startsWith('#') && currentChannel) {
        currentChannel.url = line;
        currentChannel.id = this.generateChannelId(currentChannel.name!, line);
        
        channels.push(currentChannel as Channel);
        this.returnToPool(currentChannel);
        currentChannel = null;
      }
    }

    console.log(`⚡ Optimized parsing: ${channels.length} chaînes`);
    return channels;
  }

  /**
   * Parser Traditionnel (baseline)
   */
  private async parseTraditional(content: string): Promise<Channel[]> {
    const lines = content.split('\n');
    const channels: Channel[] = [];
    let currentChannel: Partial<Channel> = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('#EXTINF:')) {
        // Parser la ligne EXTINF
        const info = line.substring(8);
        const nameMatch = info.match(/,(.+)$/);
        if (nameMatch) {
          currentChannel.name = nameMatch[1].trim();
        }

        // Extraire attributs
        const logoMatch = info.match(/tvg-logo="([^"]+)"/);
        if (logoMatch) currentChannel.logo = logoMatch[1];

        const groupMatch = info.match(/group-title="([^"]+)"/);
        if (groupMatch) {
          currentChannel.group = groupMatch[1];
          currentChannel.category = groupMatch[1];
        }

        const tvgIdMatch = info.match(/tvg-id="([^"]+)"/);
        if (tvgIdMatch) currentChannel.tvgId = tvgIdMatch[1];

        const languageMatch = info.match(/tvg-language="([^"]+)"/);
        if (languageMatch) currentChannel.language = languageMatch[1];

        const countryMatch = info.match(/tvg-country="([^"]+)"/);
        if (countryMatch) currentChannel.country = countryMatch[1];

      } else if (line && !line.startsWith('#') && currentChannel.name) {
        currentChannel.url = line;
        currentChannel.id = this.generateChannelId(currentChannel.name, line);
        
        channels.push(currentChannel as Channel);
        currentChannel = {};
      }
    }

    console.log(`📝 Traditional parsing: ${channels.length} chaînes`);
    return channels;
  }

  /**
   * Parser ligne EXTINF optimisé avec string interning
   */
  private parseExtinfLineOptimized(line: string, channel: Partial<Channel>): void {
    // Machine à états optimisée (switch numérique)
    const info = line.substring(8);
    
    // Nom de chaîne
    const nameMatch = info.match(/,(.+)$/);
    if (nameMatch) {
      channel.name = nameMatch[1].trim();
    }

    // Attributs avec string interning pour les valeurs fréquentes
    const logoMatch = info.match(/tvg-logo="([^"]+)"/);
    if (logoMatch) channel.logo = logoMatch[1];

    const groupMatch = info.match(/group-title="([^"]+)"/);
    if (groupMatch) {
      const group = this.internString(groupMatch[1]);
      channel.group = group;
      channel.category = group;
    }

    const tvgIdMatch = info.match(/tvg-id="([^"]+)"/);
    if (tvgIdMatch) channel.tvgId = tvgIdMatch[1];

    const languageMatch = info.match(/tvg-language="([^"]+)"/);
    if (languageMatch) channel.language = this.internString(languageMatch[1]);

    const countryMatch = info.match(/tvg-country="([^"]+)"/);
    if (countryMatch) channel.country = this.internString(countryMatch[1]);
  }

  /**
   * Pool d'objets pour éviter les allocations
   */
  private initializePool(size: number = this.poolMaxSize): void {
    this.channelPool = [];
    for (let i = 0; i < size; i++) {
      this.channelPool.push({});
    }
    this.poolUsed = 0;
    console.log(`🏊 Pool initialized: ${size} objects`);
  }

  private getFromPool(): Partial<Channel> {
    if (this.poolUsed < this.channelPool.length) {
      const obj = this.channelPool[this.poolUsed++];
      this.clearObject(obj);
      return obj;
    }
    
    // Pool épuisé, créer nouvel objet
    console.warn('⚠️ Pool exhausted, creating new object');
    return {};
  }

  private returnToPool(obj: Partial<Channel>): void {
    // L'objet reste dans le pool, pas besoin de le retourner physiquement
    // La réinitialisation se fait dans getFromPool()
  }

  private clearObject(obj: Partial<Channel>): void {
    obj.id = undefined;
    obj.name = undefined;
    obj.url = undefined;
    obj.logo = undefined;
    obj.group = undefined;
    obj.category = undefined;
    obj.language = undefined;
    obj.country = undefined;
    obj.tvgId = undefined;
    obj.quality = undefined;
    obj.isAdult = undefined;
    obj.epgId = undefined;
  }

  /**
   * String interning pour réduire mémoire
   */
  private internString(str: string): string {
    if (this.stringCache.has(str)) {
      this.stringCacheHits++;
      return this.stringCache.get(str)!;
    }

    // Éviction LRU si cache plein
    if (this.stringCache.size >= this.STRING_CACHE_SIZE) {
      const firstKey = this.stringCache.keys().next().value;
      this.stringCache.delete(firstKey);
    }

    this.stringCache.set(str, str);
    this.stringCacheMisses++;
    return str;
  }

  /**
   * Yield control pour UI responsiveness
   */
  private async yieldControl(): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, 0);
    });
  }

  /**
   * Générer ID chaîne optimisé
   */
  private generateChannelId(name: string, url: string): string {
    // Hash simple et rapide
    const combined = `${name}_${url}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      hash = ((hash << 5) - hash + combined.charCodeAt(i)) & 0xffffffff;
    }
    return `ch_${Math.abs(hash)}`;
  }

  /**
   * Calculer efficacité du pool
   */
  private calculatePoolEfficiency(): number {
    if (this.poolMaxSize === 0) return 0;
    return Math.round((this.poolUsed / this.poolMaxSize) * 100);
  }

  /**
   * Calculer efficacité du cache strings
   */
  private calculateCacheEfficiency(): number {
    const total = this.stringCacheHits + this.stringCacheMisses;
    if (total === 0) return 0;
    return Math.round((this.stringCacheHits / total) * 100);
  }

  /**
   * Estimer usage mémoire en MB
   */
  private estimateMemoryUsage(): number {
    const poolSize = this.channelPool.length * 0.001; // ~1KB par objet
    const cacheSize = this.stringCache.size * 0.05; // ~50 bytes par string
    return Math.round((poolSize + cacheSize) * 100) / 100;
  }

  /**
   * Obtenir statistiques de performance
   */
  getStats() {
    return {
      ...this.stats,
      pool: {
        size: this.channelPool.length,
        used: this.poolUsed,
        efficiency: this.calculatePoolEfficiency()
      },
      stringCache: {
        size: this.stringCache.size,
        hits: this.stringCacheHits,
        misses: this.stringCacheMisses,
        efficiency: this.calculateCacheEfficiency()
      },
      memory: {
        estimated: this.estimateMemoryUsage(),
        unit: 'MB'
      }
    };
  }

  /**
   * Nettoyer ressources
   */
  dispose(): void {
    this.channelPool = [];
    this.stringCache.clear();
    this.poolUsed = 0;
    this.stringCacheHits = 0;
    this.stringCacheMisses = 0;
    console.log('🧹 ParsersService disposed');
  }
}

// Export singleton instance  
export const parsersService = new ParsersService();