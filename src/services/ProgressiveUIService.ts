/**
 * 📱 Progressive UI Service - Mises à jour temps réel non-bloquantes
 * Architecture inspirée IPTV Smarters Pro avec batching intelligent
 * Gère 100K+ chaînes avec UI fluide 60fps
 */

import {XtreamChannel} from './StreamingXtreamService';

export interface UIUpdate {
  id: string;
  type:
    | 'CHANNELS_BATCH'
    | 'CATEGORIES_BATCH'
    | 'SEARCH_RESULTS'
    | 'LOADING_PROGRESS';
  data: any;
  timestamp: number;
  priority: 'LOW' | 'NORMAL' | 'HIGH';
}

export interface UIBatchConfig {
  maxBatchSize: number;
  maxBatchDelay: number; // ms
  targetFPS: number;
}

export interface ProgressiveState {
  totalChannels: number;
  loadedChannels: number;
  currentBatch: number;
  totalBatches: number;
  isLoading: boolean;
  loadingMessage: string;
  estimatedTimeRemaining: number;
}

type UIUpdateHandler = (update: UIUpdate) => void;

/**
 * 🎛️ Adaptive Batch Controller - Ajuste selon performance device
 */
class AdaptiveBatchController {
  private frameTimer: number | null = null;
  private lastFrameTime = 0;
  private frameTimes: number[] = [];
  private readonly MAX_FRAME_SAMPLES = 30;

  private config: UIBatchConfig = {
    maxBatchSize: 50,
    maxBatchDelay: 16, // 60fps
    targetFPS: 60,
  };

  startFrameMonitoring(): void {
    this.frameTimer = requestAnimationFrame(this.measureFrame.bind(this));
  }

  stopFrameMonitoring(): void {
    if (this.frameTimer) {
      cancelAnimationFrame(this.frameTimer);
      this.frameTimer = null;
    }
  }

  private measureFrame(timestamp: number): void {
    if (this.lastFrameTime > 0) {
      const frameTime = timestamp - this.lastFrameTime;
      this.frameTimes.push(frameTime);

      if (this.frameTimes.length > this.MAX_FRAME_SAMPLES) {
        this.frameTimes.shift();
      }
    }

    this.lastFrameTime = timestamp;
    this.frameTimer = requestAnimationFrame(this.measureFrame.bind(this));
  }

  getCurrentFPS(): number {
    if (this.frameTimes.length === 0) {
      return 60;
    }

    const avgFrameTime =
      this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    return Math.round(1000 / avgFrameTime);
  }

  getOptimalBatchSize(): number {
    const currentFPS = this.getCurrentFPS();
    const performanceRatio = currentFPS / this.config.targetFPS;

    if (performanceRatio < 0.8) {
      // Low performance - reduce batch size
      return Math.max(10, Math.floor(this.config.maxBatchSize * 0.5));
    } else if (performanceRatio > 1.1) {
      // High performance - increase batch size
      return Math.min(100, Math.floor(this.config.maxBatchSize * 1.5));
    }

    return this.config.maxBatchSize;
  }

  getOptimalDelay(): number {
    const currentFPS = this.getCurrentFPS();

    if (currentFPS < 45) {
      return 32; // 30fps fallback
    } else if (currentFPS < 55) {
      return 20; // 50fps
    }

    return this.config.maxBatchDelay; // 60fps
  }
}

/**
 * 📊 Progress Calculator - Estimation temps réel intelligent
 */
class ProgressCalculator {
  private startTime: number = 0;
  private processedItems: number = 0;
  private totalItems: number = 0;
  private processingRates: number[] = [];
  private readonly MAX_RATE_SAMPLES = 10;

  start(totalItems: number): void {
    this.startTime = Date.now();
    this.processedItems = 0;
    this.totalItems = totalItems;
    this.processingRates = [];
  }

  update(processedItems: number): ProgressiveState {
    this.processedItems = processedItems;

    // Calculate processing rate
    const elapsed = Date.now() - this.startTime;
    const rate = processedItems / (elapsed / 1000); // items/second

    this.processingRates.push(rate);
    if (this.processingRates.length > this.MAX_RATE_SAMPLES) {
      this.processingRates.shift();
    }

    // Estimate remaining time
    const avgRate =
      this.processingRates.reduce((a, b) => a + b, 0) /
      this.processingRates.length;
    const remaining = this.totalItems - processedItems;
    const estimatedTimeRemaining =
      remaining > 0 ? Math.round(remaining / avgRate) : 0;

    return {
      totalChannels: this.totalItems,
      loadedChannels: processedItems,
      currentBatch: Math.floor(processedItems / 50) + 1,
      totalBatches: Math.ceil(this.totalItems / 50),
      isLoading: processedItems < this.totalItems,
      loadingMessage: this.generateMessage(processedItems, this.totalItems),
      estimatedTimeRemaining,
    };
  }

  private generateMessage(processed: number, total: number): string {
    const percentage = Math.round((processed / total) * 100);

    if (percentage < 25) {
      return `📡 Streaming channels... ${processed}/${total}`;
    } else if (percentage < 50) {
      return `🔄 Processing data... ${processed}/${total}`;
    } else if (percentage < 75) {
      return `💾 Storing in database... ${processed}/${total}`;
    } else if (percentage < 95) {
      return `🔧 Building indexes... ${processed}/${total}`;
    } else {
      return `✅ Finalizing... ${processed}/${total}`;
    }
  }
}

/**
 * 📱 Main Progressive UI Service
 */
class ProgressiveUIService {
  private batchController = new AdaptiveBatchController();
  private progressCalculator = new ProgressCalculator();
  private updateHandlers = new Set<UIUpdateHandler>();
  private pendingUpdates: UIUpdate[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private isActive = false;

  /**
   * 🚀 Start progressive updates
   */
  start(): void {
    if (this.isActive) {
      return;
    }

    this.isActive = true;
    this.batchController.startFrameMonitoring();
    this.scheduleBatchProcessing();

    console.log('📱 Progressive UI Service started');
  }

  /**
   * ⏹️ Stop progressive updates
   */
  stop(): void {
    this.isActive = false;
    this.batchController.stopFrameMonitoring();

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Process remaining updates
    this.processPendingUpdates();

    console.log('⏹️ Progressive UI Service stopped');
  }

  /**
   * 📝 Subscribe to UI updates
   */
  subscribe(handler: UIUpdateHandler): () => void {
    this.updateHandlers.add(handler);

    return () => {
      this.updateHandlers.delete(handler);
    };
  }

  /**
   * 📊 Send progress update
   */
  updateProgress(processed: number, total: number): void {
    const progressState = this.progressCalculator.update(processed, total);

    this.addUpdate({
      id: `progress_${Date.now()}`,
      type: 'LOADING_PROGRESS',
      data: progressState,
      timestamp: Date.now(),
      priority: 'HIGH',
    });
  }

  /**
   * 📺 Send channels batch
   */
  addChannelsBatch(channels: XtreamChannel[], batchIndex: number): void {
    this.addUpdate({
      id: `channels_batch_${batchIndex}`,
      type: 'CHANNELS_BATCH',
      data: {channels, batchIndex},
      timestamp: Date.now(),
      priority: 'NORMAL',
    });
  }

  /**
   * 📂 Send categories batch
   */
  addCategoriesBatch(categories: any[], batchIndex: number): void {
    this.addUpdate({
      id: `categories_batch_${batchIndex}`,
      type: 'CATEGORIES_BATCH',
      data: {categories, batchIndex},
      timestamp: Date.now(),
      priority: 'NORMAL',
    });
  }

  /**
   * 🔍 Send search results
   */
  addSearchResults(results: XtreamChannel[], query: string): void {
    this.addUpdate({
      id: `search_${query}_${Date.now()}`,
      type: 'SEARCH_RESULTS',
      data: {results, query},
      timestamp: Date.now(),
      priority: 'HIGH',
    });
  }

  /**
   * 📤 Add update to queue
   */
  private addUpdate(update: UIUpdate): void {
    this.pendingUpdates.push(update);

    // Immediate processing for high priority
    if (update.priority === 'HIGH') {
      this.processPendingUpdates();
    }
  }

  /**
   * ⏰ Schedule batch processing
   */
  private scheduleBatchProcessing(): void {
    if (!this.isActive) {
      return;
    }

    const delay = this.batchController.getOptimalDelay();

    this.batchTimer = setTimeout(() => {
      this.processPendingUpdates();
      this.scheduleBatchProcessing(); // Reschedule
    }, delay);
  }

  /**
   * 🔄 Process pending updates in batches
   */
  private processPendingUpdates(): void {
    if (this.pendingUpdates.length === 0) {
      return;
    }

    const batchSize = this.batchController.getOptimalBatchSize();
    const batch = this.pendingUpdates.splice(0, batchSize);

    // Sort by priority
    batch.sort((a, b) => {
      const priorityOrder = {HIGH: 3, NORMAL: 2, LOW: 1};
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    // Dispatch updates
    batch.forEach(update => {
      this.updateHandlers.forEach(handler => {
        try {
          handler(update);
        } catch (error) {
          console.error('📱 UI update handler error:', error);
        }
      });
    });

    const currentFPS = this.batchController.getCurrentFPS();
    console.log(`📱 Processed ${batch.length} UI updates (${currentFPS}fps)`);
  }

  /**
   * 📊 Start progress tracking
   */
  startProgress(totalItems: number): void {
    this.progressCalculator.start(totalItems);
  }

  /**
   * 📈 Get current performance stats
   */
  getPerformanceStats(): {
    currentFPS: number;
    optimalBatchSize: number;
    pendingUpdates: number;
    optimalDelay: number;
  } {
    return {
      currentFPS: this.batchController.getCurrentFPS(),
      optimalBatchSize: this.batchController.getOptimalBatchSize(),
      pendingUpdates: this.pendingUpdates.length,
      optimalDelay: this.batchController.getOptimalDelay(),
    };
  }
}

export default new ProgressiveUIService();
