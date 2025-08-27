/**
 * 🔄 Background Worker Service - Processing non-bloquant pour 100K+ chaînes
 * Utilise Web Workers pattern avec setTimeout pour React Native
 * Architecture inspirée IPTV Smarters Pro avec queuing intelligent
 */

import { XtreamChannel } from './StreamingXtreamService';

export interface WorkerTask {
  id: string;
  type: 'NORMALIZE_CHANNELS' | 'PROCESS_CATEGORIES' | 'BUILD_SEARCH_INDEX';
  data: any;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  onProgress?: (progress: number, message: string) => void;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
}

export interface WorkerStats {
  tasksCompleted: number;
  tasksQueued: number;
  tasksRunning: number;
  averageTaskTime: number;
  memoryUsage: number;
  cpuUsage: number;
}

/**
 * 🧠 Intelligent Task Queue avec priorités
 */
class TaskQueue {
  private tasks: Map<string, WorkerTask> = new Map();
  private priorityOrder = ['CRITICAL', 'HIGH', 'NORMAL', 'LOW'] as const;
  private maxConcurrent = 2; // Limite mobile-friendly

  enqueue(task: WorkerTask): void {
    this.tasks.set(task.id, task);
    console.log(`📋 Task queued: ${task.id} (${task.type}) - Priority: ${task.priority}`);
  }

  dequeue(): WorkerTask | null {
    // Priorité par ordre d'importance
    for (const priority of this.priorityOrder) {
      for (const [id, task] of this.tasks) {
        if (task.priority === priority) {
          this.tasks.delete(id);
          return task;
        }
      }
    }
    return null;
  }

  size(): number {
    return this.tasks.size;
  }

  clear(): void {
    this.tasks.clear();
  }

  getTasksByPriority(): Record<string, number> {
    const counts = { CRITICAL: 0, HIGH: 0, NORMAL: 0, LOW: 0 };
    for (const task of this.tasks.values()) {
      counts[task.priority]++;
    }
    return counts;
  }
}

/**
 * 📊 Performance Monitor pour adaptabilité
 */
class PerformanceMonitor {
  private taskTimes: number[] = [];
  private memorySnapshots: number[] = [];
  private readonly MAX_SAMPLES = 10;

  recordTaskTime(duration: number): void {
    this.taskTimes.push(duration);
    if (this.taskTimes.length > this.MAX_SAMPLES) {
      this.taskTimes.shift();
    }
  }

  recordMemoryUsage(usage: number): void {
    this.memorySnapshots.push(usage);
    if (this.memorySnapshots.length > this.MAX_SAMPLES) {
      this.memorySnapshots.shift();
    }
  }

  getAverageTaskTime(): number {
    if (this.taskTimes.length === 0) return 0;
    return this.taskTimes.reduce((a, b) => a + b, 0) / this.taskTimes.length;
  }

  getAverageMemoryUsage(): number {
    if (this.memorySnapshots.length === 0) return 0;
    return this.memorySnapshots.reduce((a, b) => a + b, 0) / this.memorySnapshots.length;
  }

  isPerformanceDegraded(): boolean {
    const avgTime = this.getAverageTaskTime();
    const avgMemory = this.getAverageMemoryUsage();
    
    // Seuils pour devices mobiles
    return avgTime > 2000 || avgMemory > 400 * 1024 * 1024; // 2s ou 400MB
  }

  shouldThrottle(): boolean {
    return this.isPerformanceDegraded();
  }
}

/**
 * 🔄 Main Background Worker Service
 */
class BackgroundWorkerService {
  private taskQueue = new TaskQueue();
  private performanceMonitor = new PerformanceMonitor();
  private runningTasks = new Set<string>();
  private stats: WorkerStats = {
    tasksCompleted: 0,
    tasksQueued: 0,
    tasksRunning: 0,
    averageTaskTime: 0,
    memoryUsage: 0,
    cpuUsage: 0
  };
  private isRunning = false;

  /**
   * 🚀 Start background processing
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🔄 Background Worker Service started');
    this.processTaskLoop();
  }

  /**
   * ⏹️ Stop background processing
   */
  stop(): void {
    this.isRunning = false;
    this.runningTasks.clear();
    console.log('⏹️ Background Worker Service stopped');
  }

  /**
   * ➕ Add task to queue
   */
  addTask(task: WorkerTask): string {
    this.taskQueue.enqueue(task);
    this.updateStats();
    return task.id;
  }

  /**
   * 📊 Get current stats
   */
  getStats(): WorkerStats {
    this.stats.tasksQueued = this.taskQueue.size();
    this.stats.tasksRunning = this.runningTasks.size;
    this.stats.averageTaskTime = this.performanceMonitor.getAverageTaskTime();
    this.stats.memoryUsage = this.performanceMonitor.getAverageMemoryUsage();
    return { ...this.stats };
  }

  /**
   * 🔄 Main processing loop
   */
  private async processTaskLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        // Check if we should throttle based on performance
        const shouldThrottle = this.performanceMonitor.shouldThrottle();
        const maxConcurrent = shouldThrottle ? 1 : 2;
        
        // Process tasks if under concurrency limit
        if (this.runningTasks.size < maxConcurrent) {
          const task = this.taskQueue.dequeue();
          if (task) {
            this.executeTask(task);
          }
        }

        // Adaptive delay based on performance
        const delay = shouldThrottle ? 100 : 50; // Slower when throttling
        await this.sleep(delay);

      } catch (error) {
        console.error('🔥 Background worker loop error:', error);
        await this.sleep(1000); // Longer delay on error
      }
    }
  }

  /**
   * 🏃‍♂️ Execute individual task
   */
  private async executeTask(task: WorkerTask): Promise<void> {
    const startTime = performance.now();
    this.runningTasks.add(task.id);
    
    try {
      console.log(`🚀 Executing task: ${task.id} (${task.type})`);
      
      let result: any;
      switch (task.type) {
        case 'NORMALIZE_CHANNELS':
          result = await this.normalizeChannelsTask(task);
          break;
        case 'PROCESS_CATEGORIES':
          result = await this.processCategoriesTask(task);
          break;
        case 'BUILD_SEARCH_INDEX':
          result = await this.buildSearchIndexTask(task);
          break;
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      const duration = performance.now() - startTime;
      this.performanceMonitor.recordTaskTime(duration);
      this.stats.tasksCompleted++;

      console.log(`✅ Task completed: ${task.id} in ${Math.round(duration)}ms`);
      task.onComplete?.(result);

    } catch (error) {
      console.error(`❌ Task failed: ${task.id}`, error);
      task.onError?.(error as Error);
    } finally {
      this.runningTasks.delete(task.id);
      this.updateStats();
    }
  }

  /**
   * 📺 Normalize channels task - Heavy processing
   */
  private async normalizeChannelsTask(task: WorkerTask): Promise<XtreamChannel[]> {
    const channels = task.data.channels as XtreamChannel[];
    const batchSize = task.data.batchSize || 100;
    const normalizedChannels: XtreamChannel[] = [];

    for (let i = 0; i < channels.length; i += batchSize) {
      const batch = channels.slice(i, i + batchSize);
      
      // Process batch
      for (const channel of batch) {
        const normalized = this.normalizeChannel(channel, task.data.serverUrl);
        normalizedChannels.push(normalized);
      }

      // Progress reporting
      const progress = Math.round(((i + batchSize) / channels.length) * 100);
      task.onProgress?.(progress, `Normalized ${i + batchSize}/${channels.length} channels`);

      // Yield to main thread
      await this.sleep(1);

      // Memory pressure check
      if (i % 1000 === 0) {
        await this.performMemoryCleanup();
      }
    }

    return normalizedChannels;
  }

  /**
   * 📂 Process categories task
   */
  private async processCategoriesTask(task: WorkerTask): Promise<any[]> {
    const channels = task.data.channels as XtreamChannel[];
    const categoryMap = new Map<string, any>();

    for (let i = 0; i < channels.length; i++) {
      const channel = channels[i];
      
      if (channel.category_id && !categoryMap.has(channel.category_id)) {
        categoryMap.set(channel.category_id, {
          id: channel.category_id,
          name: this.normalizeCategoryName(channel.category_name),
          channelCount: 0
        });
      }

      // Update channel count
      if (channel.category_id && categoryMap.has(channel.category_id)) {
        const category = categoryMap.get(channel.category_id)!;
        category.channelCount++;
      }

      // Progress every 1000 channels
      if (i % 1000 === 0) {
        const progress = Math.round((i / channels.length) * 100);
        task.onProgress?.(progress, `Processed ${i}/${channels.length} for categories`);
        await this.sleep(1);
      }
    }

    return Array.from(categoryMap.values());
  }

  /**
   * 🔍 Build search index task
   */
  private async buildSearchIndexTask(task: WorkerTask): Promise<Map<string, string[]>> {
    const channels = task.data.channels as XtreamChannel[];
    const searchIndex = new Map<string, string[]>();

    for (let i = 0; i < channels.length; i++) {
      const channel = channels[i];
      
      // Build searchable terms
      const terms = this.extractSearchTerms(channel);
      terms.forEach(term => {
        if (!searchIndex.has(term)) {
          searchIndex.set(term, []);
        }
        searchIndex.get(term)!.push(channel.stream_id);
      });

      // Progress every 500 channels
      if (i % 500 === 0) {
        const progress = Math.round((i / channels.length) * 100);
        task.onProgress?.(progress, `Indexed ${i}/${channels.length} channels`);
        await this.sleep(1);
      }
    }

    return searchIndex;
  }

  // ================================
  // UTILITY METHODS
  // ================================

  private normalizeChannel(channel: XtreamChannel, serverUrl: string): XtreamChannel {
    return {
      ...channel,
      name: this.normalizeChannelName(channel.name),
      stream_icon: this.normalizeLogoUrl(channel.stream_icon, serverUrl),
      category_name: this.normalizeCategoryName(channel.category_name)
    };
  }

  private normalizeChannelName(name: string): string {
    if (!name) return 'Unknown Channel';
    
    return name
      .trim()
      .replace(/[<>]/g, '') // Remove dangerous chars
      .replace(/\s+/g, ' ') // Normalize spaces
      .substring(0, 100); // Limit length
  }

  private normalizeCategoryName(categoryName: string): string {
    if (!categoryName || categoryName.trim() === '') return 'Uncategorized';
    
    return categoryName
      .trim()
      .replace(/[<>]/g, '')
      .replace(/[|]/g, ' - ')
      .replace(/\s+/g, ' ')
      .substring(0, 50);
  }

  private normalizeLogoUrl(logoUrl: string, serverUrl: string): string {
    if (!logoUrl || logoUrl.trim() === '' || logoUrl.toLowerCase() === 'null') {
      return '';
    }

    const trimmed = logoUrl.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }

    try {
      const serverUri = new URL(serverUrl);
      const baseUrl = `${serverUri.protocol}//${serverUri.host}`;
      
      return trimmed.startsWith('/') ? 
        `${baseUrl}${trimmed}` : 
        `${baseUrl}/${trimmed}`;
    } catch (e) {
      return '';
    }
  }

  private extractSearchTerms(channel: XtreamChannel): string[] {
    const terms: string[] = [];
    
    // Channel name terms
    if (channel.name) {
      const words = channel.name.toLowerCase().split(/\s+/);
      terms.push(...words.filter(word => word.length > 2));
    }

    // Category terms
    if (channel.category_name) {
      const categoryWords = channel.category_name.toLowerCase().split(/\s+/);
      terms.push(...categoryWords.filter(word => word.length > 2));
    }

    // Remove duplicates
    return Array.from(new Set(terms));
  }

  private async performMemoryCleanup(): Promise<void> {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Record memory usage
    const usage = this.getMemoryUsage();
    this.performanceMonitor.recordMemoryUsage(usage);
  }

  private getMemoryUsage(): number {
    // Estimate memory usage (React Native doesn't have precise APIs)
    return Math.floor(Math.random() * 200 * 1024 * 1024); // Mock for now
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private updateStats(): void {
    this.stats.tasksQueued = this.taskQueue.size();
    this.stats.tasksRunning = this.runningTasks.size;
  }
}

export default new BackgroundWorkerService();