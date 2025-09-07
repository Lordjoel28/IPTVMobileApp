/**
 * 🌊 Streaming Xtream Service - Optimisé pour 100K+ chaînes
 * Architecture inspirée IPTV Smarters Pro avec streaming JSON + memory pool
 * Phase 2: Background Workers + Progressive UI + Smart Performance
 */

import {Q} from '@nozbe/watermelondb';
import database from '../database';
import {Playlist, Channel, Category} from '../database/models';
import {networkService, NetworkError} from './NetworkService';
import BackgroundWorkerService from './BackgroundWorkerService';
import ProgressiveUIService from './ProgressiveUIService';
import CacheIntegrationService from './CacheIntegrationService';

export interface XtreamCredentials {
  url: string;
  username: string;
  password: string;
}

export interface XtreamChannel {
  num: number;
  name: string;
  stream_type: string;
  stream_id: string;
  stream_icon: string;
  epg_channel_id: string;
  added: string;
  is_adult: string;
  category_name: string;
  category_id: string;
}

export interface XtreamCategory {
  category_id: string;
  category_name: string;
  parent_id: number;
}

/**
 * 🏊‍♂️ Memory Pool pour optimiser allocation/déallocation objets
 */
class XtreamMemoryPool {
  private channelPool: XtreamChannel[] = [];
  private readonly MAX_POOL_SIZE = 5000;
  private readonly poolStats = {
    created: 0,
    reused: 0,
    recycled: 0,
  };

  getChannel(): XtreamChannel {
    const channel = this.channelPool.pop();
    if (channel) {
      this.poolStats.reused++;
      return this.resetChannel(channel);
    } else {
      this.poolStats.created++;
      return this.createChannel();
    }
  }

  recycleChannel(channel: XtreamChannel) {
    if (this.channelPool.length < this.MAX_POOL_SIZE) {
      this.poolStats.recycled++;
      this.channelPool.push(channel);
    }
  }

  private createChannel(): XtreamChannel {
    return {
      num: 0,
      name: '',
      stream_type: '',
      stream_id: '',
      stream_icon: '',
      epg_channel_id: '',
      added: '',
      is_adult: '0',
      category_name: '',
      category_id: '',
    };
  }

  private resetChannel(channel: XtreamChannel): XtreamChannel {
    channel.num = 0;
    channel.name = '';
    channel.stream_type = '';
    channel.stream_id = '';
    channel.stream_icon = '';
    channel.epg_channel_id = '';
    channel.added = '';
    channel.is_adult = '0';
    channel.category_name = '';
    channel.category_id = '';
    return channel;
  }

  getStats() {
    return {...this.poolStats, poolSize: this.channelPool.length};
  }
}

/**
 * 🌊 Streaming JSON Processor - Évite memory overflow
 */
class StreamingJSONProcessor {
  private memoryPool = new XtreamMemoryPool();
  private processedCount = 0;
  private readonly MEMORY_CHECK_INTERVAL = 1000;

  async *processChannelsStream(
    response: Response,
    onProgress?: (count: number, memStats: any) => void,
  ): AsyncGenerator<XtreamChannel[], void, unknown> {
    const reader = response.body?.getReader();
    if (!reader) {throw new Error('Unable to get response reader');}

    let buffer = '';
    let decoder = new TextDecoder();
    let batch: XtreamChannel[] = [];
    const BATCH_SIZE = 250; // Micro-batches pour UI réactive

    try {
      while (true) {
        const {done, value} = await reader.read();

        if (done) {
          // Process remaining buffer
          if (buffer.trim()) {
            const remainingChannels = this.parseBufferChannels(buffer);
            if (remainingChannels.length > 0) {
              yield remainingChannels;
            }
          }
          break;
        }

        // Decode chunk
        buffer += decoder.decode(value, {stream: true});

        // Extract complete JSON objects
        const {channels, remainingBuffer} =
          this.extractChannelsFromBuffer(buffer);
        buffer = remainingBuffer;

        // Add to batch
        for (const channel of channels) {
          batch.push(channel);
          this.processedCount++;

          if (batch.length >= BATCH_SIZE) {
            yield [...batch];

            // Recycle objects to memory pool
            batch.forEach(ch => this.memoryPool.recycleChannel(ch));
            batch = [];

            // Memory management
            if (this.processedCount % this.MEMORY_CHECK_INTERVAL === 0) {
              await this.performMemoryMaintenance();
              onProgress?.(this.processedCount, this.memoryPool.getStats());
            }
          }
        }
      }

      // Yield final batch
      if (batch.length > 0) {
        yield batch;
      }
    } finally {
      reader.releaseLock();
    }
  }

  private extractChannelsFromBuffer(buffer: string): {
    channels: XtreamChannel[];
    remainingBuffer: string
  } {
    const channels: XtreamChannel[] = [];
    let remainingBuffer = buffer;

    try {
      // Simple JSON array parsing for Xtream API response
      const jsonMatch = buffer.match(/^\s*\[(.*)\]\s*$/s);
      if (jsonMatch) {
        const arrayContent = jsonMatch[1];
        const objects = this.splitJSONObjects(arrayContent);

        for (const objStr of objects) {
          try {
            const parsed = JSON.parse('{' + objStr + '}');
            const channel = this.memoryPool.getChannel();
            Object.assign(channel, parsed);
            channels.push(channel);
          } catch (e) {
            // Skip malformed objects
            console.warn('Skipping malformed channel object:', e);
          }
        }
        remainingBuffer = '';
      }
    } catch (error) {
      console.warn('JSON parsing error:', error);
    }

    return {channels, remainingBuffer};
  }

  private splitJSONObjects(arrayContent: string): string[] {
    const objects: string[] = [];
    let depth = 0;
    let currentObj = '';
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < arrayContent.length; i++) {
      const char = arrayContent[i];

      if (escapeNext) {
        escapeNext = false;
        currentObj += char;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        currentObj += char;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
      }

      if (!inString) {
        if (char === '{') {depth++;}
        else if (char === '}') {depth--;}
      }

      currentObj += char;

      if (!inString && depth === 0 && char === '}') {
        objects.push(currentObj.trim());
        currentObj = '';

        // Skip comma and whitespace
        while (
          i + 1 < arrayContent.length &&
          [',', ' ', '\n', '\r', '\t'].includes(arrayContent[i + 1])
        ) {
          i++;
        }
      }
    }

    return objects.filter(obj => obj.trim().length > 0);
  }

  private parseBufferChannels(buffer: string): XtreamChannel[] {
    try {
      const parsed = JSON.parse(buffer);
      if (Array.isArray(parsed)) {
        return parsed.map(item => {
          const channel = this.memoryPool.getChannel();
          Object.assign(channel, item);
          return channel;
        });
      }
    } catch (error) {
      console.warn('Final buffer parsing error:', error);
    }
    return [];
  }

  private async performMemoryMaintenance() {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Yield to main thread
    await new Promise(resolve => setTimeout(resolve, 1));
  }
}

/**
 * 🚀 Chunked API Loader - Chargement par catégories
 */
class ChunkedAPILoader {
  private streamProcessor = new StreamingJSONProcessor();

  async loadChannelsByCategories(
    credentials: XtreamCredentials,
    onProgress?: (progress: number, message: string, count?: number) => void,
  ): Promise<XtreamChannel[]> {
    try {
      onProgress?.(10, '📂 Loading categories...');

      // 1. Load categories first (small payload)
      const categories = await this.loadCategories(credentials);
      onProgress?.(20, `📂 ${categories.length} categories loaded`);

      // 2. Load all channels with streaming (optimized)
      onProgress?.(30, '📺 Streaming channels...');
      const allChannels = await this.loadAllChannelsStreaming(
        credentials,
        (count, memStats) => {
          const progress = 30 + Math.min(60, Math.round(count / 1000)); // Estimate progress
          onProgress?.(progress, `📺 Processed ${count} channels`, count);
        },

      onProgress?.(100, `✅ ${allChannels.length} channels loaded`);
      return allChannels;

    } catch (error) {
      console.error('❌ Chunked loading error:', error);
      throw error;
    }
  }

  private async loadCategories(
    credentials: XtreamCredentials,
  ): Promise<XtreamCategory[]> {
    const url = `${credentials.url}/player_api.php?username=${credentials.username}&password=${credentials.password}&action=get_live_categories`;
    return await networkService.fetchJSON<XtreamCategory[]>(url, {
      timeout: 15000,
    });
  }

  private async loadAllChannelsStreaming(
    credentials: XtreamCredentials,
    onProgress?: (count: number, memStats: any) => void,
  ): Promise<XtreamChannel[]> {
    const url = `${credentials.url}/player_api.php?username=${credentials.username}&password=${credentials.password}&action=get_live_streams`;

    // Use fetch for streaming instead of networkService
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'IPTV-Player/1.0',
      }
    });

    if (!response.ok) {
      throw new NetworkError(`HTTP ${response.status}`, response.status);
    }

    const allChannels: XtreamChannel[] = [];

    // Process streaming response
    for await (const channelBatch of this.streamProcessor.processChannelsStream(
      response,
      onProgress,
    )) {
      allChannels.push(...channelBatch);
    }

    return allChannels;
  }
}

/**
 * 🏗️ Main Streaming Xtream Service - Architecture optimisée 100K+
 */
class StreamingXtreamService {
  private chunkedLoader = new ChunkedAPILoader();
  private readonly MICRO_BATCH_SIZE = 250; // Optimisé pour mobile

  /**
   * 🚀 Import optimisé Phase 2 - Background Workers + Progressive UI
   */
  async importXtreamPlaylistOptimized(
    credentials: XtreamCredentials,
    playlistName: string,
    onProgress?: (progress: number, message: string) => void,
  ): Promise<string> {
    try {
      console.log(
        '🚀 Starting Phase 3 optimized import with Smart Cache L1/L2/L3...',

      // Start all services including cache
      BackgroundWorkerService.start();
      ProgressiveUIService.start();

      // Setup progress tracking
      onProgress?.(5, '🧠 Initializing Smart Cache + Background Workers...');

      // Phase 0: Check cache for existing data
      const cachedChannels = await CacheIntegrationService.getCached<
        XtreamChannel[]
      >(
        `xtream_channels_${credentials.url}_${credentials.username}_all`,
        'XTREAM_API',
      );

      if (cachedChannels && cachedChannels.length > 0) {
        console.log(
          `🧠 Found ${cachedChannels.length} cached channels, using cache-first approach`,
        );
        onProgress?.(
          25,
          `🧠 Found ${cachedChannels.length} cached channels - fast track enabled`,

        // Fast track with cached data
        const playlistId = await this.importFromCache(
          cachedChannels,
          playlistName,
          credentials,
          onProgress,
        );
        return playlistId;
      }

      onProgress?.(
        10,
        '🔍 No cache found - performing full import with smart caching...',
      );

      // Phase 1: Quick streaming load (same as before but with progress UI)
      const channels = await this.chunkedLoader.loadChannelsByCategories(
        credentials,
        (progress, message, count) => {
          const adjustedProgress = Math.round(progress * 0.4); // 40% for loading
          onProgress?.(adjustedProgress, message);

          // Update progressive UI
          if (count) {
            ProgressiveUIService.updateProgress(count, 100000); // Estimate for UI
          }
        },
      );

      console.log(
        `📊 Loaded ${channels.length} channels, caching + starting background processing...`,
      );
      onProgress?.(
        35,
        `📺 ${channels.length} channels loaded - caching for future use...`,
      );

      // Cache the loaded channels for future fast access
      await CacheIntegrationService.cacheChannels(credentials, channels);

      onProgress?.(
        40,
        `🧠 Channels cached - starting background processing...`,
      );

      // Phase 2: Background processing while showing progress
      const processedData = await this.backgroundProcessChannels(
        channels,
        credentials,
        (progress, message) => {
          const totalProgress = 40 + Math.round(progress * 0.35); // 35% for processing
          onProgress?.(totalProgress, message);
        },
      );

      // Phase 3: Database import with progressive updates
      const playlistId = await this.importToDatabaseWithWorkers({
        credentials,
        playlistName,
        processedData,
        onProgress: (progress, message) => {
          const totalProgress = 75 + Math.round(progress * 0.25); // Final 25%
          onProgress?.(totalProgress, message);
        },
      });

      // Cleanup
      onProgress?.(
        100,
        '✅ Advanced import completed with background processing!',

      // Keep services running for ongoing optimization
      setTimeout(() => {
        BackgroundWorkerService.stop();
        ProgressiveUIService.stop();
      }, 5000);

      return playlistId;
    } catch (error) {
      console.error('❌ Phase 2 optimized import error:', error);
      BackgroundWorkerService.stop();
      ProgressiveUIService.stop();
      throw error;
    }
  }

  /**
   * ⚡ Import rapide depuis cache - Phase 3 Fast Track
   */
  private async importFromCache(
    cachedChannels: XtreamChannel[],
    playlistName: string,
    credentials: XtreamCredentials,
    onProgress?: (progress: number, message: string) => void,
  ): Promise<string> {
    console.log(
      `⚡ Fast track import for ${cachedChannels.length} cached channels`,

    onProgress?.(30, '🧠 Using cached data - warming up search index...');

    // Warm up cache with most important data
    await CacheIntegrationService.warmUpCache(
      'cached_playlist',
      cachedChannels.slice(0, 1000),

    onProgress?.(50, '🏗️ Creating playlist from cached data...');

    // Create playlist directly from cached data - much faster
    const playlistId = await this.createPlaylistFromCache({
      channels: cachedChannels,
      playlistName,
      credentials,
      onProgress: (progress, message) => {
        const adjustedProgress = 50 + Math.round(progress * 0.5);
        onProgress?.(adjustedProgress, message);
      },
    });

    onProgress?.(
      100,
      `✅ Fast import completed! ${cachedChannels.length} channels from cache`,

    // Background cache optimization for next time
    setTimeout(async () => {
      console.log('🧠 Running background cache optimization...');
      await CacheIntegrationService.performIntelligentCleanup();
    }, 2000);

    return playlistId;
  }

  /**
   * 🏗️ Create playlist from cached data
   */
  private async createPlaylistFromCache({
    channels,
    playlistName,
    credentials,
    onProgress,
  }: {
    channels: XtreamChannel[];
    playlistName: string;
    credentials: XtreamCredentials;
    onProgress?: (progress: number, message: string) => void;
  }): Promise<string> {
    return await database.write(async () => {
      onProgress?.(10, 'Creating playlist record...');

      // Create playlist
      const playlist = await database
        .get<Playlist>('playlists')
        .create(record => {
          record.name = playlistName;
          record.type = 'xtream';
          record.url = credentials.url;
          record.username = credentials.username;
          record.password = credentials.password;
          record.channelCount = channels.length;
          record.lastUpdated = new Date();
          record.isActive = true;
        });

      onProgress?.(25, 'Processing categories from cache...');

      // Extract and create categories
      const categoryMap = new Map<string, XtreamCategory>();
      channels.forEach(channel => {
        if (channel.category_id && !categoryMap.has(channel.category_id)) {
          categoryMap.set(channel.category_id, {
            category_id: channel.category_id,
            category_name: channel.category_name || 'Unknown',
            parent_id: 0,
          });
        }
      });

      const categories = Array.from(categoryMap.values());
      onProgress?.(40, `Creating ${categories.length} categories...`);

      // Batch create categories
      const batchSize = 100;
      for (let i = 0; i < categories.length; i += batchSize) {
        const batch = categories.slice(i, i + batchSize);
        await Promise.all(
          batch.map(cat =>
            database.get<Category>('categories').create(record => {
              record.name = cat.category_name;
              record.parentId = cat.parent_id.toString();
              record.playlist.set(playlist);
            }),
          ),

        const progress = 40 + Math.round((i / categories.length) * 20);
        onProgress?.(
          progress,
          `Created ${Math.min(i + batchSize, categories.length)}/${
            categories.length
          } categories`,
        );

      onProgress?.(60, `Creating ${channels.length} channels from cache...`);

      // Batch create channels
      for (let i = 0; i < channels.length; i += batchSize) {
        const batch = channels.slice(i, i + batchSize);
        await Promise.all(
          batch.map(ch =>
            database.get<Channel>('channels').create(record => {
              record.name = ch.name;
              record.streamId = ch.stream_id;
              record.streamUrl = ''; // Will be generated on play
              record.logoUrl = ch.stream_icon || '';
              record.groupTitle = ch.category_name || 'Uncategorized';
              record.playlist.set(playlist);
            }),
          ),

        const progress = 60 + Math.round((i / channels.length) * 40);
        onProgress?.(
          progress,
          `Created ${Math.min(i + batchSize, channels.length)}/${
            channels.length
          } channels`,
        );
      }

      onProgress?.(100, 'Fast import from cache completed!');
      return playlist.id;
    });
  }

  /**
   * 🔄 Background processing des chaînes avec workers
   */
  private async backgroundProcessChannels(
    channels: XtreamChannel[],
    credentials: XtreamCredentials,
    onProgress?: (progress: number, message: string) => void,
  ): Promise<{
    normalizedChannels: XtreamChannel[];
    categories: any[];
    searchIndex: Map<string, string[]>;
  }> {
    console.log(
      `🔄 Starting background processing of ${channels.length} channels...`,

    let normalizedChannels: XtreamChannel[] = [];
    let categories: any[] = [];
    let searchIndex: Map<string, string[]> = new Map();

    // Task 1: Normalize channels in background
    onProgress?.(10, '🔧 Normalizing channels in background...');
    await new Promise<void>((resolve, reject) => {
      BackgroundWorkerService.addTask({
        id: `normalize_${Date.now()}`,
        type: 'NORMALIZE_CHANNELS',
        data: {channels, serverUrl: credentials.url, batchSize: 500},
        priority: 'HIGH',
        onProgress: (progress, message) => {
          onProgress?.(10 + Math.round(progress * 0.4), message);
        },
        onComplete: result => {
          normalizedChannels = result;
          console.log(`✅ Normalized ${result.length} channels`);
          resolve();
        },
        onError: reject,
      });
    });

    // Task 2: Process categories
    onProgress?.(50, '📂 Processing categories...');
    await new Promise<void>((resolve, reject) => {
      BackgroundWorkerService.addTask({
        id: `categories_${Date.now()}`,
        type: 'PROCESS_CATEGORIES',
        data: {channels: normalizedChannels},
        priority: 'NORMAL',
        onProgress: (progress, message) => {
          onProgress?.(50 + Math.round(progress * 0.2), message);
        },
        onComplete: result => {
          categories = result;
          console.log(`✅ Processed ${result.length} categories`);
          resolve();
        },
        onError: reject,
      });
    });

    // Task 3: Build search index
    onProgress?.(70, '🔍 Building search index...');
    await new Promise<void>((resolve, reject) => {
      BackgroundWorkerService.addTask({
        id: `search_${Date.now()}`,
        type: 'BUILD_SEARCH_INDEX',
        data: {channels: normalizedChannels},
        priority: 'LOW',
        onProgress: (progress, message) => {
          onProgress?.(70 + Math.round(progress * 0.3), message);
        },
        onComplete: result => {
          searchIndex = result;
          console.log(`✅ Built search index with ${result.size} terms`);
          resolve();
        },
        onError: reject,
      });
    });

    onProgress?.(100, '✅ Background processing completed');

    return {normalizedChannels, categories, searchIndex};
  }

  /**
   * 💾 Database import avec Progressive UI
   */
  private async importToDatabaseWithWorkers({
    credentials,
    playlistName,
    processedData,
    onProgress,
  }: {
    credentials: XtreamCredentials;
    playlistName: string;
    processedData: {
      normalizedChannels: XtreamChannel[];
      categories: any[];
      searchIndex: Map<string, string[]>;
    };
    onProgress?: (progress: number, message: string) => void;
  }): Promise<string> {
    const {normalizedChannels, categories} = processedData;

    return await database.write(async () => {
      onProgress?.(10, '💾 Creating playlist...');

      // Start progressive UI updates
      ProgressiveUIService.startProgress(normalizedChannels.length);

      // 1. Create playlist
      const playlist = await database
        .get<Playlist>('playlists')
        .create(playlist => {
          playlist.name = playlistName;
          playlist.type = 'XTREAM_PHASE2';
          playlist.server = credentials.url;
          playlist.username = credentials.username;
          playlist.password = credentials.password;
          playlist.dateAdded = new Date();
          playlist.channelsCount = normalizedChannels.length;
          playlist.status = 'importing';
          playlist.isActive = false;
        });

      onProgress?.(20, '📂 Importing categories...');

      // 2. Create categories in micro-batches with progressive updates
      await this.createCategoriesWithProgressiveUI(
        playlist.id,
        categories,
        progress => {
          onProgress?.(
            20 + Math.round(progress * 0.2),
            'Creating categories...',
          );
        },

      onProgress?.(
        40,
        `📺 Importing ${normalizedChannels.length} channels with progressive UI...`,

      // 3. Create channels with progressive UI updates
      await this.createChannelsWithProgressiveUI(
        playlist.id,
        credentials,
        normalizedChannels,
        (progress, count) => {
          onProgress?.(
            40 + Math.round(progress * 0.5),
            `Imported ${count}/${normalizedChannels.length} channels`,
          );
          ProgressiveUIService.updateProgress(count, normalizedChannels.length);
        },
      );

      onProgress?.(90, '✅ Activating playlist...');

      // 4. Activate playlist
      await playlist.update(p => {
        p.status = 'active';
        p.isActive = true;
      });

      console.log(
        `✅ Phase 2 import complete: ${normalizedChannels.length} channels with background processing`,
      );
      return playlist.id;
    });
  }

  /**
   * 📂 Create categories avec Progressive UI
   */
  private async createCategoriesWithProgressiveUI(
    playlistId: string,
    categories: any[],
    onProgress?: (progress: number) => void,
  ): Promise<void> {
    const batches = this.chunkArray(categories, this.MICRO_BATCH_SIZE);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      const categoryRecords = batch.map(cat =>
        database.get<Category>('categories').prepareCreate(category => {
          category.playlistId = playlistId;
          category.name = cat.name;
          category.categoryId = cat.id;
          category.channelsCount = cat.channelCount;
        }),
      );

      await database.batch(categoryRecords);

      // Progressive UI update
      ProgressiveUIService.addCategoriesBatch(batch, i);

      const progress = Math.round(((i + 1) / batches.length) * 100);
      onProgress?.(progress);

      await this.yieldToMainThread(4); // More frequent yields
    }
  }

  /**
   * 📺 Create channels avec Progressive UI
   */
  private async createChannelsWithProgressiveUI(
    playlistId: string,
    credentials: XtreamCredentials,
    channels: XtreamChannel[],
    onProgress?: (progress: number, count: number) => void,
  ): Promise<void> {
    const batches = this.chunkArray(channels, this.MICRO_BATCH_SIZE);
    let processedCount = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      const channelRecords = batch.map(channel =>
        database.get<Channel>('channels').prepareCreate(ch => {
          ch.playlistId = playlistId;
          ch.categoryId = channel.category_id;
          ch.name = channel.name || 'Unknown Channel';
          ch.streamUrl = this.buildStreamUrl(credentials, channel.stream_id);
          ch.logoUrl = channel.stream_icon; // Already normalized by background worker
          ch.streamIcon = ch.logoUrl;
          ch.groupTitle = channel.category_name; // Already normalized

          // Xtream specific fields
          ch.num = channel.num;
          ch.streamId = channel.stream_id;
          ch.epgChannelId = channel.epg_channel_id;
          ch.added = channel.added;
          ch.isAdult = channel.is_adult === '1';
          ch.streamType = 'live';

          // Initialize stats
          ch.isFavorite = false;
          ch.watchCount = 0;
        }),
      );

      await database.batch(channelRecords);

      processedCount += batch.length;

      // Progressive UI update
      ProgressiveUIService.addChannelsBatch(batch, i);

      const progress = Math.round((processedCount / channels.length) * 100);
      onProgress?.(progress, processedCount);

      // Adaptive yield based on performance
      await this.yieldToMainThread(6); // Balanced for UI + performance
    }
  }

  /**
   * 💾 Micro-batch database import - Non-blocking UI
   */
  private async importToDatabase({
    credentials,
    playlistName,
    channels,
    onProgress,
  }: {
    credentials: XtreamCredentials;
    playlistName: string;
    channels: XtreamChannel[];
    onProgress?: (progress: number, message: string) => void;
  }): Promise<string> {

    return await database.write(async () => {
      onProgress?.(10, '💾 Creating playlist...');

      // 1. Create playlist
      const playlist = await database
        .get<Playlist>('playlists')
        .create(playlist => {
          playlist.name = playlistName;
          playlist.type = 'XTREAM_OPTIMIZED';
          playlist.server = credentials.url;
          playlist.username = credentials.username;
          playlist.password = credentials.password;
          playlist.dateAdded = new Date();
          playlist.channelsCount = channels.length;
          playlist.status = 'importing';
          playlist.isActive = false;
        });

      onProgress?.(20, '📂 Processing categories...');

      // 2. Extract and create categories
      const categoryMap = new Map<string, XtreamCategory>();
      channels.forEach(channel => {
        if (channel.category_id && !categoryMap.has(channel.category_id)) {
          categoryMap.set(channel.category_id, {
            category_id: channel.category_id,
            category_name: channel.category_name || 'Unknown',
            parent_id: 0,
          });
        }
      });

      // Create categories in micro-batches
      const categories = Array.from(categoryMap.values());
      await this.createCategoriesInBatches(playlist.id, categories, onProgress);

      onProgress?.(40, `📺 Importing ${channels.length} channels...`);

      // 3. Create channels in micro-batches (CRITICAL for 100K+)
      await this.createChannelsInMicroBatches(
        playlist.id,
        credentials,
        channels,
        onProgress,
      );

      onProgress?.(90, '✅ Finalizing...');

      // 4. Activate playlist
      await playlist.update(p => {
        p.status = 'active';
        p.isActive = true;
      });

      console.log(
        `✅ Optimized import complete: ${channels.length} channels imported`,
      );
      return playlist.id;
    });
  }

  private async createCategoriesInBatches(
    playlistId: string,
    categories: XtreamCategory[],
    onProgress?: (progress: number, message: string) => void,
  ) {
    const batches = this.chunkArray(categories, this.MICRO_BATCH_SIZE);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      const categoryRecords = batch.map(cat =>
        database.get<Category>('categories').prepareCreate(category => {
          category.playlistId = playlistId;
          category.name = cat.category_name;
          category.categoryId = cat.category_id;
          category.channelsCount = 0; // Will be updated later
        }),
      );

      await database.batch(categoryRecords);

      // Yield to main thread every batch
      await this.yieldToMainThread();
    }
  }

  private async createChannelsInMicroBatches(
    playlistId: string,
    credentials: XtreamCredentials,
    channels: XtreamChannel[],
    onProgress?: (progress: number, message: string) => void,
  ) {
    const batches = this.chunkArray(channels, this.MICRO_BATCH_SIZE);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const progress = 40 + Math.round((i / batches.length) * 45); // 40-85% range

      onProgress?.(
        progress,
        `📺 Batch ${i + 1}/${batches.length} - ${batch.length} channels`,

      const channelRecords = batch.map(channel =>
        database.get<Channel>('channels').prepareCreate(ch => {
          ch.playlistId = playlistId;
          ch.categoryId = channel.category_id;
          ch.name = channel.name || 'Unknown Channel';
          ch.streamUrl = this.buildStreamUrl(credentials, channel.stream_id);
          ch.logoUrl = this.normalizeLogoUrl(
            channel.stream_icon,
            credentials.url,
          );
          ch.streamIcon = ch.logoUrl;
          ch.groupTitle = this.normalizeCategoryName(channel.category_name);

          // Xtream specific fields
          ch.num = channel.num;
          ch.streamId = channel.stream_id;
          ch.epgChannelId = channel.epg_channel_id;
          ch.added = channel.added;
          ch.isAdult = channel.is_adult === '1';
          ch.streamType = 'live';

          // Initialize stats
          ch.isFavorite = false;
          ch.watchCount = 0;
        }),
      );

      await database.batch(channelRecords);

      // Yield to main thread more frequently for UI responsiveness
      await this.yieldToMainThread(8); // 120fps friendly
    }
  }

  // ================================
  // UTILITY METHODS
  // ================================

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private async yieldToMainThread(ms: number = 16): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private buildStreamUrl(
    credentials: XtreamCredentials,
    streamId: string,
  ): string {
    return `${credentials.url}/${credentials.username}/${credentials.password}/${streamId}`;
  }

  private normalizeLogoUrl(logoUrl: string, serverUrl: string): string {
    if (!logoUrl || logoUrl.trim() === '' || logoUrl.toLowerCase() === 'null') {
      return '';
    }

    const trimmedLogoUrl = logoUrl.trim();

    if (
      trimmedLogoUrl.startsWith('http://') ||
      trimmedLogoUrl.startsWith('https://')
    ) {
      return trimmedLogoUrl;
    }

    try {
      const serverUri = new URL(serverUrl);
      const baseUrl = `${serverUri.protocol}//${serverUri.host}`;

      if (trimmedLogoUrl.startsWith('/')) {
        return `${baseUrl}${trimmedLogoUrl}`;
      } else {
        return `${baseUrl}/${trimmedLogoUrl}`;
      }
    } catch (e) {
      console.warn('Logo URL normalization failed:', e);
      return '';
    }
  }

  private normalizeCategoryName(categoryName: string): string {
    if (!categoryName || categoryName.trim() === '') {return 'Uncategorized';}

    return categoryName
      .trim()
      .replace(/[<>]/g, '')
      .replace(/[|]/g, ' - ')
      .replace(/\s+/g, ' ')
      .substring(0, 50);
  }
}

export default new StreamingXtreamService();
