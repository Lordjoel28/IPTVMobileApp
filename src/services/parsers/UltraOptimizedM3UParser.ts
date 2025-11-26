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
  group?: string;
  category?: string;
  quality?: string;
  language?: string;
  country?: string;
  tvgId?: string;
  groupTitle?: string;
  type?: 'M3U' | 'XTREAM';
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
  extinfCount: number;
  validUrlCount: number;
  orphanChannels: number;
  duplicateUrls: number;
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
  private urlSet: Set<string> = new Set();
  private diagnostics = {
    extinfCount: 0,
    validUrlCount: 0,
    orphanChannels: 0,
    duplicateUrls: 0,
  };

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
        groupTitle: '',
      }),
      channel => {
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
      500, // Initial pool size
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
      // Vérification du contenu
      if (!content || typeof content !== 'string') {
        console.error('❌ Parse error: Content is undefined or not a string');
        throw new Error('Content de playlist invalide ou vide');
      }

      // Preprocessing ultra-optimisé
      const lines = this.preprocessLinesOptimized(content);
      const channels = await this.parseChannelsOptimized(lines, chunkSize);

      this.calculateStats(startTime, channels.length);

      return {
        channels,
        stats: this.stats,
        errors: this.errors,
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
    // Vérification de sécurité pour React Native
    if (!content || typeof content !== 'string') {
      console.warn('⚠️ Content is undefined or not a string:', typeof content);
      return [];
    }

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
  private async parseChannelsOptimized(
    lines: string[],
    chunkSize: number,
  ): Promise<Channel[]> {
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
   * Parse chunk avec machine à états ultra-robuste - CORRECTION CRITIQUE pour 10824 chaînes
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

        if (firstChar === 35) {
          // '#'
          if (line.startsWith('#EXTINF:')) {
            this.diagnostics.extinfCount++;

            // 🔧 CORRECTION CRITIQUE: Finaliser channel précédent AVANT nouveau #EXTINF
            if (currentChannel) {
              if (currentChannel.url && currentChannel.name) {
                // Channel complet, l'ajouter
                channels.push(currentChannel);
              } else {
                // Channel orphelin (EXTINF sans URL)
                this.diagnostics.orphanChannels++;
                console.warn(
                  `⚠️ Orphan channel detected: ${
                    currentChannel.name || 'unnamed'
                  }`,
                );
              }
              currentChannel = null;
            }
            currentExtinf = line;
          }
          // 🔧 CORRECTION CRITIQUE: Ignorer #EXTVLCOPT/#EXTGRP SANS perdre currentExtinf
          // Ces lignes sont ignorées mais l'état currentExtinf/currentChannel reste intact
        } else if (this.isValidUrlOptimized(line)) {
          this.diagnostics.validUrlCount++;

          // Vérifier URL dupliquée - compter seulement
          if (this.urlSet.has(line)) {
            this.diagnostics.duplicateUrls++;
          } else {
            this.urlSet.add(line);
          }

          // 🔧 CORRECTION: Créer channel si on a un EXTINF en attente
          if (currentExtinf) {
            // Finaliser channel précédent si existe
            if (currentChannel && currentChannel.url && currentChannel.name) {
              channels.push(currentChannel);
            }

            currentChannel = this.channelPool.acquire();
            this.parseExtinf(currentExtinf, currentChannel);
            currentChannel.url = line;
            currentChannel.id = this.generateChannelId(currentChannel);

            // Finaliser immédiatement si channel complet
            if (currentChannel.name && currentChannel.url) {
              channels.push(currentChannel);
              currentChannel = null;
              currentExtinf = '';
            }
          } else {
            // URL sans EXTINF - créer channel basique pour ne pas perdre l'URL
            // Note: Message réduit pour éviter spam - seulement compter
            this.diagnostics.orphanChannels++;
            currentChannel = this.channelPool.acquire();
            currentChannel.name = this.extractNameFromUrl(line);
            currentChannel.url = line;
            currentChannel.id = this.generateChannelId(currentChannel);

            if (currentChannel.name && currentChannel.url) {
              channels.push(currentChannel);
              currentChannel = null;
            }
          }
        }
      } catch (error) {
        this.errors.push({
          line: lineNumber,
          content: line,
          error: error.message || 'Unknown error',
        });
      }
    }

    // 🔧 CORRECTION: Sauvegarder channel orphelin en fin de chunk
    if (currentChannel) {
      if (currentChannel.url && currentChannel.name) {
        channels.push(currentChannel);
      } else {
        this.diagnostics.orphanChannels++;
      }
    }

    return channels;
  }

  /**
   * Validation URL ultra-optimisée pour TOUS les formats IPTV + edge cases
   */
  private isValidUrlOptimized(url: string): boolean {
    if (url.length < 4) {
      return false;
    }

    const first = url.charCodeAt(0);

    // http/https (même URLs mal formées avec hhttps, hhttp)
    if (first === 104) {
      // 'h'
      return (
        url.startsWith('http://') ||
        url.startsWith('https://') ||
        url.startsWith('hhttps://') ||
        url.startsWith('hhttp://')
      );
    }
    // rtmp/rtp/rtsp
    if (first === 114) {
      // 'r'
      return (
        url.startsWith('rtmp://') ||
        url.startsWith('rtp://') ||
        url.startsWith('rtsp://')
      );
    }
    // udp
    if (first === 117) {
      // 'u'
      return url.startsWith('udp://') || url.startsWith('udpxy://');
    }
    // mmsh/mms
    if (first === 109) {
      // 'm'
      return (
        url.startsWith('mmsh://') ||
        url.startsWith('mms://') ||
        url.startsWith('mcast://')
      );
    }
    // ftp/ftps
    if (first === 102) {
      // 'f'
      return url.startsWith('ftp://') || url.startsWith('ftps://');
    }
    // tcp
    if (first === 116) {
      // 't'
      return url.startsWith('tcp://') || url.startsWith('tls://');
    }
    // pipe (VLC)
    if (first === 112) {
      // 'p'
      return url.startsWith('pipe://') || url.startsWith('pvr://');
    }
    // dvb/dshow
    if (first === 100) {
      // 'd'
      return url.startsWith('dvb://') || url.startsWith('dshow://');
    }
    // screen/file
    if (first === 115) {
      // 's'
      return (
        url.startsWith('screen://') ||
        url.startsWith('srt://') ||
        url.startsWith('smb://')
      );
    }
    // v4l2
    if (first === 118) {
      // 'v'
      return url.startsWith('v4l2://') || url.startsWith('vlc://');
    }

    // 🔧 FALLBACK ÉTENDU: Toute ligne avec protocole potentiel
    if (!url.startsWith('#') && url.includes('://')) {
      // Vérifier que ce n'est pas juste du texte avec ://
      const protocolMatch = url.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//);
      return protocolMatch !== null;
    }

    // 🔧 EDGE CASE: URLs sans protocole mais qui ressemblent à des IPs/domaines
    if (
      !url.startsWith('#') &&
      (url.match(/^\d+\.\d+\.\d+\.\d+/) || url.includes('.'))
    ) {
      // Possiblement une URL malformée sans protocole
      return url.includes('.') && !url.includes(' ');
    }

    return false;
  }

  /**
   * Parse EXTINF avec extraction métadonnées ultra-robuste + fallbacks multiples
   * Gère guillemets doubles, simples, valeurs sans guillemets et cas edge
   */
  private parseExtinf(extinf: string, channel: Channel): void {
    // 🔧 FALLBACKS MULTIPLES pour extraction nom
    let channelName = '';

    // Fallback 1: Texte après dernière virgule (standard)
    const nameMatch = extinf.match(/,([^,]*)$/);
    if (nameMatch && nameMatch[1] && nameMatch[1].trim()) {
      channelName = nameMatch[1].trim();
    }

    // Fallback 2: Si pas de virgule, essayer après durée
    if (!channelName) {
      const noCommaMatch = extinf.match(/#EXTINF:[^,]*\s+(.+)$/);
      if (noCommaMatch && noCommaMatch[1]) {
        channelName = noCommaMatch[1].trim();
      }
    }

    // Fallback 3: Extraire depuis attributs (tvg-name, etc.)
    if (!channelName) {
      const tvgNameMatch = extinf.match(/tvg-name=["']?([^"'\s,]+)["']?/);
      if (tvgNameMatch && tvgNameMatch[1]) {
        channelName = tvgNameMatch[1];
      }
    }

    // Fallback 4: Nom générique avec index
    if (!channelName) {
      channelName = `Channel_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
    }

    channel.name = this.internString(channelName);

    // 🔧 REGEX ROBUSTE pour attributs avec gestion edge cases
    // Capture: key="value" | key='value' | key=value | key="value avec espace"
    const attributeRegex =
      /(\w+(?:-\w+)*)=(?:"([^"]*)"|'([^']*)'|([^\s,"']+))/g;
    let match;

    while ((match = attributeRegex.exec(extinf)) !== null) {
      const [, key, doubleQuoted, singleQuoted, unquoted] = match;
      const value = doubleQuoted || singleQuoted || unquoted || '';

      if (value && value.trim()) {
        const internedValue = this.internString(value.trim());

        switch (key.toLowerCase()) {
          case 'tvg-id':
            channel.tvgId = internedValue;
            break;
          case 'tvg-logo':
          case 'logo':
            channel.logo = internedValue;
            break;
          case 'group-title':
          case 'group':
            channel.groupTitle = internedValue;
            break;
          case 'tvg-language':
          case 'language':
            channel.language = internedValue;
            break;
          case 'tvg-country':
          case 'country':
            channel.country = internedValue;
            break;
          case 'tvg-name':
            // Si pas de nom extrait, utiliser tvg-name
            if (!channelName || channelName.startsWith('Channel_')) {
              channel.name = this.internString(internedValue);
            }
            break;
          // Attributs étendus
          case 'tvg-shift':
          case 'catchup':
          case 'catchup-days':
          case 'timeshift':
            // Pour compatibilité future
            break;
        }
      }
    }

    // Déduction qualité depuis nom (plus robuste)
    const name = channel.name.toLowerCase();
    if (name.includes('4k') || name.includes('uhd') || name.includes('2160')) {
      channel.quality = '4K';
    } else if (
      name.includes('fhd') ||
      name.includes('1080') ||
      name.includes('full hd')
    ) {
      channel.quality = 'FHD';
    } else if (
      name.includes('hd') ||
      name.includes('720') ||
      name.includes('high def')
    ) {
      channel.quality = 'HD';
    } else if (
      name.includes('sd') ||
      name.includes('480') ||
      name.includes('576')
    ) {
      channel.quality = 'SD';
    } else {
      channel.quality = 'Unknown';
    }

    // Catégorie depuis group-title avec fallback
    if (channel.groupTitle) {
      channel.category = channel.groupTitle;
    } else {
      // Fallback: déduire catégorie depuis nom
      const lowerName = name;
      if (lowerName.includes('sport')) {
        channel.category = 'Sports';
      } else if (lowerName.includes('news') || lowerName.includes('info')) {
        channel.category = 'News';
      } else if (lowerName.includes('movie') || lowerName.includes('cinema')) {
        channel.category = 'Movies';
      } else if (lowerName.includes('music')) {
        channel.category = 'Music';
      } else if (lowerName.includes('kids') || lowerName.includes('cartoon')) {
        channel.category = 'Kids';
      } else {
        channel.category = 'General';
      }
    }
  }

  /**
   * String interning avec cache
   */
  private internString(str: string): string {
    const cached = this.stringCache.get(str);
    if (cached) {
      return cached;
    }

    this.stringCache.set(str, str);
    return str;
  }

  /**
   * Génération ID unique chaîne
   */
  private generateChannelId(channel: Channel): string {
    const base = `${channel.name}_${channel.url}`;
    return btoa(base)
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 16);
  }

  /**
   * Calcul statistiques performance + diagnostics parsing
   */
  private calculateStats(startTime: number, channelCount: number): void {
    const parseTime = Date.now() - startTime;
    const channelsPerSecond = Math.round((channelCount / parseTime) * 1000);

    this.stats = {
      totalChannels: channelCount,
      parseTime,
      channelsPerSecond,
      memoryUsageMB: this.estimateMemoryUsage(),
      poolEfficiency: this.calculatePoolEfficiency(),
      extinfCount: this.diagnostics.extinfCount,
      validUrlCount: this.diagnostics.validUrlCount,
      orphanChannels: this.diagnostics.orphanChannels,
      duplicateUrls: this.diagnostics.duplicateUrls,
    };

    // 🔧 DIAGNOSTIC PARSING - Logs désactivés pour mode production
    // console.log('📊 PARSING DIAGNOSTICS:');
    // console.log(`   EXTINF found: ${this.diagnostics.extinfCount}`);
    // console.log(`   Valid URLs: ${this.diagnostics.validUrlCount}`);
    // console.log(`   Channels created: ${channelCount}`);
    // console.log(`   Orphan channels: ${this.diagnostics.orphanChannels}`);
    // console.log(`   Duplicate URLs: ${this.diagnostics.duplicateUrls}`);
    // console.log(
    //   `   Match rate: ${(
    //     (channelCount / this.diagnostics.extinfCount) *
    //     100
    //   ).toFixed(1)}%`,
    // );
  }

  /**
   * Estimation usage mémoire
   */
  private estimateMemoryUsage(): number {
    // Estimation basée sur pool size et cache
    const poolMemory = this.channelPool.size * 0.001; // ~1KB per channel object
    const cacheMemory = this.stringCache.cache.size * 0.0005; // ~0.5KB per cached string
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
   * Reset stats + diagnostics
   */
  private resetStats(): void {
    this.stats = {
      totalChannels: 0,
      parseTime: 0,
      channelsPerSecond: 0,
      memoryUsageMB: 0,
      poolEfficiency: 0,
      extinfCount: 0,
      validUrlCount: 0,
      orphanChannels: 0,
      duplicateUrls: 0,
    };

    this.diagnostics = {
      extinfCount: 0,
      validUrlCount: 0,
      orphanChannels: 0,
      duplicateUrls: 0,
    };

    this.urlSet.clear();
  }

  /**
   * Extraire nom depuis URL (fallback pour URLs sans EXTINF)
   */
  private extractNameFromUrl(url: string): string {
    try {
      // Extraire nom de fichier ou segment d'URL
      const urlParts = url.split('/');
      const lastPart = urlParts[urlParts.length - 1];

      if (lastPart && lastPart.length > 0) {
        // Retirer extension et paramètres
        let name = lastPart.split('?')[0].split('.')[0];
        name = name.replace(/[_-]/g, ' ').trim();

        if (name.length > 2) {
          return name.charAt(0).toUpperCase() + name.slice(1);
        }
      }

      // Fallback: utiliser domaine
      try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname.replace('www.', '');
        return `Channel ${domain}`;
      } catch {
        return `Channel ${Math.random().toString(36).substr(2, 9)}`;
      }
    } catch (error) {
      return `Channel ${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stringCache.clear();
    this.errors = [];
    this.urlSet.clear();
    this.resetStats();
  }

  /**
   * Get current statistics
   */
  getStats(): ParseStats {
    return {...this.stats};
  }
}

export default UltraOptimizedM3UParser;
