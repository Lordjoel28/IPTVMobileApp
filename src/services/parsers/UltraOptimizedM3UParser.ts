/**
 * 🚀 UltraOptimizedM3UParser - React Native Migration
 * Parser M3U ultra-optimisé - Migration DIRECTE depuis app web
 * Performance cible: 18K+ chaînes en <3s mobile
 */

export interface Channel {
  id: string;
  name: string;
  url: string;
  logo?: string;
  category?: string;
  quality?: string;
  language?: string;
  country?: string;
  tvgId?: string;
  groupTitle?: string;
}

export interface ParseResult {
  channels: Channel[];
  stats: ParseStats;
  errors: ParseError[];
}

export interface ParseStats {
  totalChannels: number;
  parseTime: number;
  channelsPerSecond: number;
  memoryUsageMB: number;
  poolEfficiency: number;
}

export interface ParseError {
  line: number;
  content: string;
  error: string;
}

/**
 * Pool d'objets ultra-optimisé pour éviter garbage collection
 */
class ObjectPool<T> {
  private objects: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;

  constructor(createFn: () => T, resetFn: (obj: T) => void, initialSize = 100) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    
    // Pré-allocation pool
    for (let i = 0; i < initialSize; i++) {
      this.objects.push(createFn());
    }
  }

  acquire(): T {
    return this.objects.pop() || this.createFn();
  }

  release(obj: T): void {
    this.resetFn(obj);
    this.objects.push(obj);
  }

  get size(): number {
    return this.objects.length;
  }
}

/**
 * Cache LRU pour string interning
 */
class LRUCache<T> {
  private cache = new Map<string, T>();
  private maxSize: number;

  constructor(maxSize = 5000) {
    this.maxSize = maxSize;
  }

  get(key: string): T | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Refresh LRU
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: string, value: T): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }
}

export class UltraOptimizedM3UParser {
  private channelPool: ObjectPool<Channel>;
  private stringCache: LRUCache<string>;
  private stats: ParseStats;
  private errors: ParseError[];

  constructor() {
    // Pool d'objets Channel
    this.channelPool = new ObjectPool<Channel>(
      () => ({
        id: '',
        name: '',
        url: '',
        logo: '',
        category: '',
        quality: '',
        language: '',
        country: '',
        tvgId: '',
        groupTitle: ''
      }),
      (channel) => {
        channel.id = '';
        channel.name = '';
        channel.url = '';
        channel.logo = '';
        channel.category = '';
        channel.quality = '';
        channel.language = '';
        channel.country = '';
        channel.tvgId = '';
        channel.groupTitle = '';
      },
      500 // Initial pool size
    );

    this.stringCache = new LRUCache<string>(5000);
    this.resetStats();
    this.errors = [];
  }

  /**
   * Parse M3U content with ultra-optimizations
   */
  async parse(content: string, chunkSize = 1000): Promise<ParseResult> {
    const startTime = Date.now();
    this.resetStats();
    this.errors = [];

    try {
      // Preprocessing ultra-optimisé
      const lines = this.preprocessLinesOptimized(content);
      const channels = await this.parseChannelsOptimized(lines, chunkSize);
      
      this.calculateStats(startTime, channels.length);
      
      return {
        channels,
        stats: this.stats,
        errors: this.errors
      };
    } catch (error) {
      console.error('Parse error:', error);
      throw error;
    }
  }

  /**
   * Preprocessing ultra-optimisé des lignes
   */
  private preprocessLinesOptimized(content: string): string[] {
    const lines: string[] = [];
    const contentLength = content.length;
    let start = 0;
    let pos = 0;

    while (pos < contentLength) {
      // Trouver fin de ligne
      while (pos < contentLength && content.charCodeAt(pos) !== 10) {
        pos++;
      }

      if (pos > start) {
        let line = content.substring(start, pos);
        
        // Trim ultra-optimisé
        let trimStart = 0;
        let trimEnd = line.length;
        
        while (trimStart < trimEnd && line.charCodeAt(trimStart) <= 32) {
          trimStart++;
        }
        
        while (trimEnd > trimStart && line.charCodeAt(trimEnd - 1) <= 32) {
          trimEnd--;
        }

        if (trimEnd > trimStart) {
          line = line.substring(trimStart, trimEnd);
          
          // String interning avec cache
          const cachedLine = this.stringCache.get(line);
          if (cachedLine) {
            lines.push(cachedLine);
          } else {
            this.stringCache.set(line, line);
            lines.push(line);
          }
        }
      }

      pos++;
      start = pos;
    }

    return lines;
  }

  /**
   * Parse channels avec chunking adaptatif
   */
  private async parseChannelsOptimized(lines: string[], chunkSize: number): Promise<Channel[]> {
    const channels: Channel[] = [];
    let i = 0;
    let processedChunks = 0;

    while (i < lines.length) {
      const chunkEnd = Math.min(i + chunkSize, lines.length);
      const chunk = lines.slice(i, chunkEnd);
      
      const chunkChannels = this.parseChunk(chunk, i);
      channels.push(...chunkChannels);
      
      i = chunkEnd;
      processedChunks++;

      // Yield control pour React Native thread
      if (processedChunks % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    return channels;
  }

  /**
   * Parse chunk avec machine à états optimisée
   */
  private parseChunk(lines: string[], startIndex: number): Channel[] {
    const channels: Channel[] = [];
    let currentExtinf = '';
    let currentChannel: Channel | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = startIndex + i;

      try {
        // Machine à états basée sur premier caractère (plus rapide que startsWith)
        const firstChar = line.charCodeAt(0);

        if (firstChar === 35) { // '#'
          if (line.startsWith('#EXTINF:')) {
            currentExtinf = line;
          }
        } else if (this.isValidUrlOptimized(line)) {
          if (currentExtinf && !currentChannel) {
            currentChannel = this.channelPool.acquire();
            this.parseExtinf(currentExtinf, currentChannel);
            currentChannel.url = line;
            currentChannel.id = this.generateChannelId(currentChannel);
            
            channels.push(currentChannel);
            currentChannel = null;
            currentExtinf = '';
          }
        }
      } catch (error) {
        this.errors.push({
          line: lineNumber,
          content: line,
          error: error.message || 'Unknown error'
        });
      }
    }

    return channels;
  }

  /**
   * Validation URL ultra-optimisée par premier caractère
   */
  private isValidUrlOptimized(url: string): boolean {
    if (url.length < 7) return false;
    
    const first = url.charCodeAt(0);
    
    // http/https
    if (first === 104) { // 'h'
      return url.startsWith('http://') || url.startsWith('https://');
    }
    // rtmp/rtp
    if (first === 114) { // 'r' 
      return url.startsWith('rtmp://') || url.startsWith('rtp://');
    }
    // udp
    if (first === 117) { // 'u'
      return url.startsWith('udp://');
    }
    
    return false;
  }

  /**
   * Parse EXTINF avec extraction métadonnées optimisée
   */
  private parseExtinf(extinf: string, channel: Channel): void {
    // Extraction nom chaîne
    const nameMatch = extinf.match(/,(.+)$/);
    if (nameMatch) {
      channel.name = this.internString(nameMatch[1].trim());
    }

    // Extraction attributs avec RegExp optimisées
    const extractAttribute = (attr: string): string => {
      const regex = new RegExp(`${attr}="([^"]+)"`);
      const match = extinf.match(regex);
      return match ? this.internString(match[1]) : '';
    };

    channel.tvgId = extractAttribute('tvg-id');
    channel.logo = extractAttribute('tvg-logo');
    channel.groupTitle = extractAttribute('group-title');
    channel.language = extractAttribute('tvg-language');
    channel.country = extractAttribute('tvg-country');

    // Déduction qualité depuis nom
    const name = channel.name.toLowerCase();
    if (name.includes('4k') || name.includes('uhd')) {
      channel.quality = '4K';
    } else if (name.includes('fhd') || name.includes('1080')) {
      channel.quality = 'FHD';
    } else if (name.includes('hd') || name.includes('720')) {
      channel.quality = 'HD';
    } else {
      channel.quality = 'SD';
    }

    // Catégorie depuis group-title
    if (channel.groupTitle) {
      channel.category = channel.groupTitle;
    }
  }

  /**
   * String interning avec cache
   */
  private internString(str: string): string {
    const cached = this.stringCache.get(str);
    if (cached) return cached;
    
    this.stringCache.set(str, str);
    return str;
  }

  /**
   * Génération ID unique chaîne
   */
  private generateChannelId(channel: Channel): string {
    const base = `${channel.name}_${channel.url}`;
    return btoa(base).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }

  /**
   * Calcul statistiques performance
   */
  private calculateStats(startTime: number, channelCount: number): void {
    const parseTime = Date.now() - startTime;
    const channelsPerSecond = Math.round((channelCount / parseTime) * 1000);
    
    this.stats = {
      totalChannels: channelCount,
      parseTime,
      channelsPerSecond,
      memoryUsageMB: this.estimateMemoryUsage(),
      poolEfficiency: this.calculatePoolEfficiency()
    };
  }

  /**
   * Estimation usage mémoire
   */
  private estimateMemoryUsage(): number {
    // Estimation basée sur pool size et cache
    const poolMemory = this.channelPool.size * 0.001; // ~1KB per channel object
    const cacheMemory = this.stringCache['cache'].size * 0.0005; // ~0.5KB per cached string
    return Math.round((poolMemory + cacheMemory) * 100) / 100;
  }

  /**
   * Calcul efficacité pool
   */
  private calculatePoolEfficiency(): number {
    const totalObjects = 500; // Initial pool size
    const remainingObjects = this.channelPool.size;
    return Math.round(((totalObjects - remainingObjects) / totalObjects) * 100);
  }

  /**
   * Reset stats
   */
  private resetStats(): void {
    this.stats = {
      totalChannels: 0,
      parseTime: 0,
      channelsPerSecond: 0,
      memoryUsageMB: 0,
      poolEfficiency: 0
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stringCache.clear();
    this.errors = [];
    this.resetStats();
  }

  /**
   * Get current statistics
   */
  getStats(): ParseStats {
    return { ...this.stats };
  }
}

export default UltraOptimizedM3UParser;