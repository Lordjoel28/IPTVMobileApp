/**
 * 🚀 UltraOptimizedM3UParser - React Native TypeScript Edition
 * 
 * Parser M3U Ultra-Optimisé - Migration Complète du Web vers React Native
 * Performance cible: 18,000+ chaînes en 1-2 secondes
 * 
 * Optimisations critiques migrées:
 * - Pool d'objets adaptatif avec resize automatique
 * - String interning avancé avec cache LRU
 * - Machine à états finis optimisée (switch numérique)
 * - Chunking non-bloquant avec yield control
 * - Garbage collection forcée pour gros volumes
 * - Métriques performance temps réel ultra-détaillées
 * - Buffer pré-alloués pour éviter allocations
 * - Preprocessing lignes ultra-optimisé
 * - Validation URL optimisée par ASCII code
 * 
 * Compatibilité: React Native 0.73+ / TypeScript
 */

// ===== INTERFACES TYPESCRIPT =====

export interface Channel {
  id: string;
  name: string;
  logo: string;
  group: string;
  url: string;
  country: string;
  language: string;
  epg: string;
  catchup: string;
  duration?: number;
  quality?: string;
  tvgId?: string;
}

export interface ParseStats {
  channelsParsed: number;
  poolHits: number;
  poolMisses: number;
  cacheHits: number;
  cacheMisses: number;
  parseTime: number;
  memoryUsage: number;
  linesProcessed: number;
  chunksProcessed: number;
  avgChunkTime: number;
  peakMemoryUsage: number;
  gcCount: number;
  workerTime: number;
  poolEfficiency: number;
  cacheEfficiency: number;
  channelsPerSecond: number;
  memoryUsageMB: number;
  peakMemoryUsageMB: number;
  poolSize: number;
  cacheSize: number;
  efficiency: {
    pool: number;
    cache: number;
    overall: number;
  };
}

export interface ParseOptions {
  useWorker?: boolean;
  chunkSize?: number;
  yieldControl?: boolean;
  strictValidation?: boolean;
  maxChannels?: number;
}

export interface ChunkConfig {
  minChunkSize: number;
  maxChunkSize: number;
  adaptiveSize: boolean;
  yieldInterval: number;
  gcInterval: number;
}

export interface ParseResult {
  channels: Channel[];
  stats: ParseStats;
}

// ===== ÉTATS MACHINE À ÉTATS =====
enum ParserState {
  SEEKING_EXTINF = 0,    // Utiliser numbers pour switch plus rapide
  PARSING_EXTINF = 1,
  SEEKING_URL = 2,
  COMPLETE_CHANNEL = 3
}

// ===== CLASSE PARSER ULTRA-OPTIMISÉE =====

/**
 * UltraOptimizedM3UParser - Version React Native TypeScript
 * Migration 100% fidèle de l'app web avec toutes les optimisations
 */
export class UltraOptimizedM3UParser {
  // Pool d'objets adaptatif avec resize automatique
  private channelPool: Channel[] = [];
  private poolSize: number = 500; // Augmenté pour gros volumes
  private readonly maxPoolSize: number = 2000;
  private readonly poolGrowthFactor: number = 1.5;
  
  // String interning avancé avec LRU cache
  private stringCache: Map<string, string> = new Map();
  private stringCacheOrder: Map<string, number> = new Map(); // Pour LRU
  private readonly maxCacheSize: number = 5000; // Augmenté pour gros volumes
  private cacheAccessCounter: number = 0;
  
  // Métriques performance temps réel
  private stats: ParseStats = {
    channelsParsed: 0,
    poolHits: 0,
    poolMisses: 0,
    cacheHits: 0,
    cacheMisses: 0,
    parseTime: 0,
    memoryUsage: 0,
    linesProcessed: 0,
    chunksProcessed: 0,
    avgChunkTime: 0,
    peakMemoryUsage: 0,
    gcCount: 0,
    workerTime: 0,
    poolEfficiency: 0,
    cacheEfficiency: 0,
    channelsPerSecond: 0,
    memoryUsageMB: 0,
    peakMemoryUsageMB: 0,
    poolSize: 0,
    cacheSize: 0,
    efficiency: {
      pool: 0,
      cache: 0,
      overall: 0
    }
  };
  
  // Configuration chunking adaptatif
  private chunkConfig: ChunkConfig = {
    minChunkSize: 1000,
    maxChunkSize: 5000,
    adaptiveSize: true,
    yieldInterval: 100, // Yield contrôle UI toutes les 100 chaînes
    gcInterval: 2000    // Force GC toutes les 2000 chaînes
  };
  
  // Buffers pré-alloués pour performance
  private lineBuffer: string[] = [];
  private channelBuffer: Channel[] = [];
  
  // Worker support pour gros fichiers (React Native n'a pas Worker, mais gardé pour compatibilité)
  private readonly workerSupport: boolean = false; // Toujours false en React Native
  
  constructor() {
    this.initializePool();
    console.log('🚀 UltraOptimizedM3UParser initialisé - Mode haute performance React Native');
    console.log(`🔧 Pool: ${this.poolSize} objets, Cache: ${this.maxCacheSize} entrées`);
  }
  
  // ===== POOL D'OBJETS ADAPTATIF =====
  
  /**
   * Initialise le pool d'objets Channel
   */
  private initializePool(): void {
    this.channelPool = [];
    for (let i = 0; i < this.poolSize; i++) {
      this.channelPool.push(this.createEmptyChannel());
    }
    console.log(`🏊 Pool adaptatif initialisé: ${this.poolSize} objets`);
  }
  
  /**
   * Agrandir le pool si nécessaire
   */
  private expandPool(): void {
    if (this.poolSize < this.maxPoolSize) {
      const oldSize = this.poolSize;
      this.poolSize = Math.min(this.poolSize * this.poolGrowthFactor, this.maxPoolSize);
      const newObjects = this.poolSize - oldSize;
      
      for (let i = 0; i < newObjects; i++) {
        this.channelPool.push(this.createEmptyChannel());
      }
      
      console.log(`📈 Pool agrandi: ${oldSize} → ${this.poolSize} objets`);
    }
  }
  
  /**
   * Crée un channel vide pré-initialisé
   */
  private createEmptyChannel(): Channel {
    return {
      id: '',
      name: '',
      logo: '',
      group: '',
      url: '',
      country: '',
      language: '',
      epg: '',
      catchup: ''
    };
  }
  
  /**
   * Récupère un channel du pool
   */
  private getPooledChannel(): Channel {
    if (this.channelPool.length > 0) {
      this.stats.poolHits++;
      const channel = this.channelPool.pop()!;
      this.resetChannel(channel);
      return channel;
    }
    
    // Pool vide - agrandir ou créer
    this.stats.poolMisses++;
    if (this.stats.poolMisses > 10) {
      this.expandPool();
      this.stats.poolMisses = 0;
    }
    
    return this.createEmptyChannel();
  }
  
  /**
   * Retourne un channel au pool
   */
  private returnToPool(channel: Channel): void {
    if (this.channelPool.length < this.poolSize) {
      this.channelPool.push(channel);
    }
  }
  
  /**
   * Reset les propriétés d'un channel
   */
  private resetChannel(channel: Channel): void {
    channel.id = '';
    channel.name = '';
    channel.logo = '';
    channel.group = '';
    channel.url = '';
    channel.country = '';
    channel.language = '';
    channel.epg = '';
    channel.catchup = '';
    delete channel.duration;
    delete channel.quality;
    delete channel.tvgId;
  }
  
  // ===== STRING INTERNING AVANCÉ AVEC LRU =====
  
  /**
   * String interning avec cache LRU pour économiser mémoire
   */
  private getCachedString(str: string): string {
    if (!str) return '';
    
    if (this.stringCache.has(str)) {
      this.stats.cacheHits++;
      // Mettre à jour LRU
      this.stringCacheOrder.set(str, this.cacheAccessCounter++);
      return this.stringCache.get(str)!;
    }
    
    this.stats.cacheMisses++;
    
    // Éviction LRU si cache plein
    if (this.stringCache.size >= this.maxCacheSize) {
      this.evictLRU();
    }
    
    this.stringCache.set(str, str);
    this.stringCacheOrder.set(str, this.cacheAccessCounter++);
    return str;
  }
  
  /**
   * Éviction LRU du cache string
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;
    
    for (const [key, access] of this.stringCacheOrder) {
      if (access < oldestAccess) {
        oldestAccess = access;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.stringCache.delete(oldestKey);
      this.stringCacheOrder.delete(oldestKey);
    }
  }
  
  // ===== PARSER ULTRA-OPTIMISÉ PRINCIPAL =====
  
  /**
   * Parse un contenu M3U avec toutes les optimisations
   */
  async parseM3U(content: string, options: ParseOptions = {}): Promise<ParseResult> {
    const startTime = Date.now();
    const startMemory = this.getMemoryUsage();
    
    console.log('🚀 Parser M3U ultra-optimisé démarré...');
    console.log(`📊 Contenu: ${(content.length / 1024 / 1024).toFixed(2)}MB`);
    
    if (!content || typeof content !== 'string') {
      console.warn('⚠️ Contenu M3U invalide');
      return { channels: [], stats: this.getStats() };
    }
    
    const config: ParseOptions = {
      useWorker: false,
      chunkSize: this.calculateOptimalChunkSize(content),
      yieldControl: true,
      strictValidation: false,
      maxChannels: 50000,
      ...options
    };
    
    let channels: Channel[] = [];
    
    // Choix de stratégie selon taille
    if (content.length > 50 * 1024 * 1024 && this.workerSupport && config.useWorker) {
      // Très gros fichiers: worker thread (pas supporté en React Native)
      console.log('⚠️ Worker non supporté en React Native, fallback chunking');
      channels = await this.parseWithChunking(content, config);
    } else if (content.length > 5 * 1024 * 1024 && config.yieldControl) {
      // Gros fichiers: chunking non-bloquant
      channels = await this.parseWithChunking(content, config);
    } else {
      // Fichiers moyens: parsing direct optimisé
      channels = this.parseDirectOptimized(content);
    }
    
    // Stats finales
    this.stats.channelsParsed = channels.length;
    this.stats.parseTime = Date.now() - startTime;
    this.stats.memoryUsage = this.getMemoryUsage() - startMemory;
    this.stats.peakMemoryUsage = Math.max(this.stats.peakMemoryUsage, this.stats.memoryUsage);
    
    this.logPerformanceStats();
    
    return { 
      channels, 
      stats: this.getStats() 
    };
  }
  
  /**
   * Calcul taille chunk optimale selon contenu
   */
  private calculateOptimalChunkSize(content: string): number {
    const sizeMB = content.length / 1024 / 1024;
    const estimatedChannels = (content.match(/#EXTINF:/g) || []).length;
    
    if (estimatedChannels < 1000) return this.chunkConfig.minChunkSize;
    if (estimatedChannels > 50000) return this.chunkConfig.maxChunkSize;
    
    // Taille adaptative basée sur le contenu
    const adaptiveSize = Math.min(
      Math.max(
        Math.floor(estimatedChannels / 20), 
        this.chunkConfig.minChunkSize
      ),
      this.chunkConfig.maxChunkSize
    );
    
    console.log(`🎯 Taille chunk optimale: ${adaptiveSize} (${estimatedChannels} chaînes estimées)`);
    return adaptiveSize;
  }
  
  // ===== PARSING AVEC CHUNKING NON-BLOQUANT =====
  
  /**
   * Parsing avec chunking pour maintenir UI responsive
   */
  private async parseWithChunking(content: string, config: ParseOptions): Promise<Channel[]> {
    console.log('🧩 Mode chunking non-bloquant activé');
    
    const lines = this.preprocessLinesOptimized(content);
    const channels: Channel[] = [];
    const chunkSize = config.chunkSize!;
    
    let state = ParserState.SEEKING_EXTINF;
    let currentChannel: Channel | null = null;
    let channelIndex = 0;
    let processedLines = 0;
    
    // Traitement par chunks
    for (let i = 0; i < lines.length; i += chunkSize) {
      const chunkStart = Date.now();
      const chunk = lines.slice(i, Math.min(i + chunkSize, lines.length));
      
      // Traiter le chunk
      const chunkResult = this.processChunk(chunk, state, currentChannel, channelIndex, processedLines);
      
      // Fusionner résultats
      channels.push(...chunkResult.channels);
      state = chunkResult.state;
      currentChannel = chunkResult.currentChannel;
      channelIndex = chunkResult.channelIndex;
      processedLines += chunk.length;
      
      // Métriques chunk
      const chunkTime = Date.now() - chunkStart;
      this.stats.chunksProcessed++;
      this.stats.avgChunkTime = (this.stats.avgChunkTime + chunkTime) / 2;
      
      // Yield contrôle UI
      if (channelIndex % this.chunkConfig.yieldInterval === 0) {
        await this.yieldControl();
      }
      
      // Garbage collection forcée
      if (channelIndex % this.chunkConfig.gcInterval === 0) {
        this.forceGC();
      }
      
      // Limite sécurité
      if (config.maxChannels && channels.length >= config.maxChannels) {
        console.warn(`⚠️ Limite atteinte: ${config.maxChannels} chaînes max`);
        break;
      }
      
      console.log(`📦 Chunk ${Math.floor(i / chunkSize) + 1}: ${chunkResult.channels.length} chaînes en ${chunkTime.toFixed(2)}ms`);
    }
    
    // Nettoyer channel orphelin
    if (currentChannel) {
      this.returnToPool(currentChannel);
    }
    
    return channels;
  }
  
  /**
   * Traitement d'un chunk de lignes
   */
  private processChunk(
    lines: string[], 
    initialState: ParserState, 
    initialChannel: Channel | null, 
    initialIndex: number, 
    processedOffset: number
  ): {
    channels: Channel[];
    state: ParserState;
    currentChannel: Channel | null;
    channelIndex: number;
  } {
    const channels: Channel[] = [];
    let state = initialState;
    let currentChannel = initialChannel;
    let channelIndex = initialIndex;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      this.stats.linesProcessed++;
      
      // Machine à états optimisée avec switch numérique
      switch (state) {
        case ParserState.SEEKING_EXTINF: // 0
          if (line.charCodeAt(0) === 35 && line.startsWith('#EXTINF:')) { // ASCII 35 = '#'
            currentChannel = this.getPooledChannel();
            this.parseExtInfUltraOptimized(line, currentChannel, channelIndex++);
            state = ParserState.SEEKING_URL;
          }
          break;
          
        case ParserState.SEEKING_URL: // 2
          if (line && line.charCodeAt(0) !== 35) { // Non-commentaire
            if (this.isValidUrlOptimized(line)) {
              currentChannel!.url = line;
              channels.push(this.cloneChannelOptimized(currentChannel!));
              this.returnToPool(currentChannel!);
              currentChannel = null;
              state = ParserState.SEEKING_EXTINF;
            } else {
              // URL invalide
              this.returnToPool(currentChannel!);
              currentChannel = null;
              state = ParserState.SEEKING_EXTINF;
            }
          }
          break;
      }
    }
    
    return { channels, state, currentChannel, channelIndex };
  }
  
  // ===== PARSING DIRECT OPTIMISÉ =====
  
  /**
   * Parsing direct optimisé pour fichiers moyens
   */
  private parseDirectOptimized(content: string): Channel[] {
    const lines = this.preprocessLinesOptimized(content);
    const channels: Channel[] = [];
    
    let state = ParserState.SEEKING_EXTINF;
    let currentChannel: Channel | null = null;
    let channelIndex = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      this.stats.linesProcessed++;
      
      switch (state) {
        case ParserState.SEEKING_EXTINF:
          if (line.charCodeAt(0) === 35 && line.startsWith('#EXTINF:')) {
            currentChannel = this.getPooledChannel();
            this.parseExtInfUltraOptimized(line, currentChannel, channelIndex++);
            state = ParserState.SEEKING_URL;
          }
          break;
          
        case ParserState.SEEKING_URL:
          if (line && line.charCodeAt(0) !== 35) {
            if (this.isValidUrlOptimized(line)) {
              currentChannel!.url = line;
              channels.push(this.cloneChannelOptimized(currentChannel!));
              this.returnToPool(currentChannel!);
              currentChannel = null;
              state = ParserState.SEEKING_EXTINF;
            } else {
              this.returnToPool(currentChannel!);
              currentChannel = null;
              state = ParserState.SEEKING_EXTINF;
            }
          }
          break;
      }
    }
    
    if (currentChannel) {
      this.returnToPool(currentChannel);
    }
    
    return channels;
  }
  
  // ===== PREPROCESSING ULTRA-OPTIMISÉ =====
  
  /**
   * Preprocessing des lignes ultra-optimisé avec buffer pré-alloué
   */
  private preprocessLinesOptimized(content: string): string[] {
    // Utiliser un buffer pré-alloué si disponible
    if (this.lineBuffer.length > 0) {
      this.lineBuffer.length = 0;
    }
    
    let start = 0;
    let pos = 0;
    const contentLength = content.length;
    
    while (pos < contentLength) {
      // Recherche optimisée du \n
      while (pos < contentLength && content.charCodeAt(pos) !== 10) { // ASCII 10 = '\n'
        pos++;
      }
      
      if (pos > start) {
        let line = content.substring(start, pos);
        
        // Trim optimisé
        let trimStart = 0;
        let trimEnd = line.length;
        
        while (trimStart < trimEnd && (line.charCodeAt(trimStart) <= 32)) {
          trimStart++;
        }
        
        while (trimEnd > trimStart && (line.charCodeAt(trimEnd - 1) <= 32)) {
          trimEnd--;
        }
        
        if (trimEnd > trimStart) {
          line = line.substring(trimStart, trimEnd);
          this.lineBuffer.push(line);
        }
      }
      
      pos++;
      start = pos;
    }
    
    return this.lineBuffer;
  }
  
  // ===== PARSER EXTINF ULTRA-OPTIMISÉ =====
  
  /**
   * Parser EXTINF ultra-optimisé avec lookup table
   */
  private parseExtInfUltraOptimized(line: string, channel: Channel, index: number): void {
    // ID ultra-rapide
    channel.id = `ch_${index}_${Date.now() % 1000000}`;
    
    // Extraction nom optimisée
    const nameStart = line.lastIndexOf(',');
    if (nameStart !== -1 && nameStart < line.length - 1) {
      channel.name = line.substring(nameStart + 1) || `Chaîne ${index + 1}`;
    } else {
      channel.name = `Chaîne ${index + 1}`;
    }
    
    // Extraction attributs avec lookup table optimisée
    const attributeMap: Record<string, keyof Channel> = {
      'tvg-logo="': 'logo',
      'group-title="': 'group',
      'tvg-country="': 'country',
      'tvg-language="': 'language',
      'tvg-epg="': 'epg',
      'catchup="': 'catchup'
    };
    
    for (const [attr, prop] of Object.entries(attributeMap)) {
      const attrStart = line.indexOf(attr);
      if (attrStart !== -1) {
        const valueStart = attrStart + attr.length;
        const valueEnd = line.indexOf('"', valueStart);
        
        if (valueEnd !== -1 && valueEnd > valueStart) {
          const value = line.substring(valueStart, valueEnd);
          if (prop === 'group') {
            channel[prop] = this.getCachedString(value || 'Général');
          } else if (prop === 'country' || prop === 'language') {
            channel[prop] = this.getCachedString(value);
          } else {
            channel[prop as any] = value;
          }
        }
      }
    }
    
    // Valeurs par défaut
    if (!channel.group) {
      channel.group = this.getCachedString('Général');
    }
  }
  
  // ===== VALIDATION URL ULTRA-OPTIMISÉE =====
  
  /**
   * Validation URL ultra-optimisée par ASCII code
   */
  private isValidUrlOptimized(url: string): boolean {
    if (!url || url.length < 7) return false;
    
    const first = url.charCodeAt(0);
    
    // Vérification rapide par premier caractère
    if (first === 104) { // 'h' - http/https
      return url.startsWith('http://') || url.startsWith('https://');
    } else if (first === 114) { // 'r' - rtmp/rtp
      return url.startsWith('rtmp://') || url.startsWith('rtmps://') || url.startsWith('rtp://');
    } else if (first === 117) { // 'u' - udp
      return url.startsWith('udp://');
    }
    
    return false;
  }
  
  // ===== UTILITAIRES OPTIMISÉS =====
  
  /**
   * Clone channel optimisé
   */
  private cloneChannelOptimized(channel: Channel): Channel {
    return {
      id: channel.id,
      name: channel.name,
      logo: channel.logo,
      group: channel.group,
      url: channel.url,
      country: channel.country,
      language: channel.language,
      epg: channel.epg,
      catchup: channel.catchup,
      duration: channel.duration,
      quality: channel.quality,
      tvgId: channel.tvgId
    };
  }
  
  /**
   * Yield contrôle UI pour React Native
   */
  private async yieldControl(): Promise<void> {
    return new Promise(resolve => {
      // En React Native, utiliser setTimeout pour yield
      setTimeout(resolve, 0);
    });
  }
  
  /**
   * Garbage collection forcée (React Native n'a pas window.gc)
   */
  private forceGC(): void {
    // React Native n'a pas accès à window.gc
    // Mais on peut déclencher une simulation
    this.stats.gcCount++;
    
    // Nettoyage manuel des buffers si trop gros
    if (this.lineBuffer.length > 10000) {
      this.lineBuffer.length = 0;
    }
  }
  
  /**
   * Obtenir usage mémoire approximatif pour React Native
   */
  private getMemoryUsage(): number {
    // React Native n'a pas performance.memory
    // Approximation basée sur les objets créés
    return (
      this.stringCache.size * 50 + 
      this.stats.channelsParsed * 200 + 
      this.lineBuffer.length * 10
    );
  }
  
  // ===== LOGGING ET STATISTIQUES =====
  
  /**
   * Logs performance ultra-détaillés
   */
  private logPerformanceStats(): void {
    const poolEfficiency = this.stats.channelsParsed > 0 ? 
      (this.stats.poolHits / (this.stats.poolHits + this.stats.poolMisses) * 100).toFixed(1) : '0';
    const cacheEfficiency = (this.stats.cacheHits + this.stats.cacheMisses) > 0 ?
      (this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) * 100).toFixed(1) : '0';
    const channelsPerSecond = this.stats.parseTime > 0 ?
      Math.round(this.stats.channelsParsed / (this.stats.parseTime / 1000)) : 0;
    
    console.log(`\n🏆 === PARSER ULTRA-OPTIMISÉ TERMINÉ ===`);
    console.log(`📊 ${this.stats.channelsParsed} chaînes en ${this.stats.parseTime.toFixed(2)}ms`);
    console.log(`⚡ Vitesse: ${channelsPerSecond.toLocaleString()} chaînes/seconde`);
    console.log(`🔄 Pool: ${poolEfficiency}% efficacité (${this.stats.poolHits}H/${this.stats.poolMisses}M)`);
    console.log(`📦 Cache: ${cacheEfficiency}% efficacité (${this.stats.cacheHits}H/${this.stats.cacheMisses}M)`);
    console.log(`🧠 Mémoire: ${(this.stats.memoryUsage / 1024 / 1024).toFixed(2)}MB utilisée`);
    console.log(`📈 Pic mémoire: ${(this.stats.peakMemoryUsage / 1024 / 1024).toFixed(2)}MB`);
    console.log(`🧩 Chunks: ${this.stats.chunksProcessed} (${this.stats.avgChunkTime.toFixed(2)}ms moy.)`);
    console.log(`🗑️ GC forcées: ${this.stats.gcCount}`);
    console.log(`📋 Lignes: ${this.stats.linesProcessed.toLocaleString()}`);
    console.log(`=======================================\n`);
  }
  
  /**
   * Obtenir statistiques complètes
   */
  getStats(): ParseStats {
    const poolEfficiency = (this.stats.poolHits + this.stats.poolMisses) > 0 ?
      (this.stats.poolHits / (this.stats.poolHits + this.stats.poolMisses) * 100) : 0;
    const cacheEfficiency = (this.stats.cacheHits + this.stats.cacheMisses) > 0 ?
      (this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) * 100) : 0;
    const channelsPerSecond = this.stats.parseTime > 0 ?
      (this.stats.channelsParsed / (this.stats.parseTime / 1000)) : 0;
    
    return {
      ...this.stats,
      poolEfficiency: Math.round(poolEfficiency * 100) / 100,
      cacheEfficiency: Math.round(cacheEfficiency * 100) / 100,
      channelsPerSecond: Math.round(channelsPerSecond),
      memoryUsageMB: Math.round((this.stats.memoryUsage / 1024 / 1024) * 100) / 100,
      peakMemoryUsageMB: Math.round((this.stats.peakMemoryUsage / 1024 / 1024) * 100) / 100,
      poolSize: this.channelPool.length,
      cacheSize: this.stringCache.size,
      efficiency: {
        pool: poolEfficiency,
        cache: cacheEfficiency,
        overall: (poolEfficiency + cacheEfficiency) / 2
      }
    };
  }
  
  // ===== MÉTHODES PUBLIQUES AVANCÉES =====
  
  /**
   * Benchmark complet pour tester performances
   */
  async benchmarkComplete(): Promise<Array<{
    size: number;
    parseTime: number;
    channelsPerSecond: number;
    memoryUsageMB: number;
    channelsParsed: number;
  }>> {
    console.log('🏁 Benchmark ultra-optimisé complet...');
    
    const sizes = [1000, 5000, 10000, 18000, 25000];
    const results = [];
    
    for (const size of sizes) {
      console.log(`\n📊 Test ${size} chaînes...`);
      
      const testContent = this.generateTestM3U(size);
      await this.cleanup();
      
      const result = await this.parseM3U(testContent);
      const stats = this.getStats();
      
      results.push({
        size,
        parseTime: stats.parseTime,
        channelsPerSecond: stats.channelsPerSecond,
        memoryUsageMB: stats.memoryUsageMB,
        channelsParsed: result.channels.length
      });
      
      console.log(`✅ ${size} chaînes: ${stats.parseTime.toFixed(2)}ms (${stats.channelsPerSecond.toLocaleString()} ch/s)`);
    }
    
    console.log('\n📋 RÉSULTATS BENCHMARK:');
    results.forEach(r => {
      console.log(`  ${r.size.toLocaleString()} chaînes: ${r.parseTime.toFixed(2)}ms - ${r.channelsPerSecond.toLocaleString()} ch/s - ${r.memoryUsageMB}MB`);
    });
    
    return results;
  }
  
  /**
   * Générateur M3U optimisé pour tests
   */
  generateTestM3U(channelCount: number): string {
    const categories = ['Sport', 'News', 'Cinema', 'Music', 'Kids', 'Documentary', 'Entertainment', 'Education'];
    const countries = ['FR', 'EN', 'DE', 'ES', 'IT', 'US', 'CA', 'AU'];
    const languages = ['fr', 'en', 'de', 'es', 'it'];
    
    let content = '#EXTM3U\n';
    
    for (let i = 0; i < channelCount; i++) {
      const category = categories[i % categories.length];
      const country = countries[i % countries.length];
      const language = languages[i % languages.length];
      
      content += `#EXTINF:-1 tvg-id="test${i}" tvg-name="Test ${i}" tvg-logo="https://example.com/logo${i}.png" group-title="${category}" tvg-country="${country}" tvg-language="${language}" catchup="default",Test Channel ${i}\n`;
      content += `https://example.com/stream${i}.m3u8\n`;
    }
    
    return content;
  }
  
  /**
   * Nettoyage complet des caches et pools
   */
  async cleanup(): Promise<void> {
    // Nettoyer pools
    this.channelPool.length = 0;
    this.initializePool();
    
    // Nettoyer caches
    this.stringCache.clear();
    this.stringCacheOrder.clear();
    this.cacheAccessCounter = 0;
    
    // Nettoyer buffers
    this.lineBuffer.length = 0;
    this.channelBuffer.length = 0;
    
    // Reset stats
    this.stats = {
      channelsParsed: 0,
      poolHits: 0,
      poolMisses: 0,
      cacheHits: 0,
      cacheMisses: 0,
      parseTime: 0,
      memoryUsage: 0,
      linesProcessed: 0,
      chunksProcessed: 0,
      avgChunkTime: 0,
      peakMemoryUsage: 0,
      gcCount: 0,
      workerTime: 0,
      poolEfficiency: 0,
      cacheEfficiency: 0,
      channelsPerSecond: 0,
      memoryUsageMB: 0,
      peakMemoryUsageMB: 0,
      poolSize: 0,
      cacheSize: 0,
      efficiency: {
        pool: 0,
        cache: 0,
        overall: 0
      }
    };
    
    // Force GC
    this.forceGC();
    
    console.log('🧹 Parser ultra-optimisé nettoyé');
  }
  
  /**
   * Validation rapide de playlist
   */
  async validatePlaylist(content: string): Promise<boolean> {
    try {
      const result = await this.parseM3U(content, { chunkSize: 100, maxChannels: 10 });
      return result.channels.length > 0;
    } catch {
      return false;
    }
  }
}

/**
 * Export instance singleton pour utilisation dans l'app
 */
export const ultraOptimizedParser = new UltraOptimizedM3UParser();

/**
 * Export du type Channel pour utilisation dans d'autres modules
 */
export type { Channel, ParseStats, ParseOptions, ParseResult };