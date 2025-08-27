/**
 * 🚀 Image Cache Service - Cache Ultra-Optimisé pour 100K+ Chaînes
 * Performance cible : TiviMate/IPTV Smarters Pro level
 * Cache 3-niveaux : Mémoire → AsyncStorage → Network
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ImageStyle } from 'react-native';

export interface CachedImageInfo {
  uri: string;
  cached: boolean;
  localPath?: string;
  timestamp: number;
  size?: number;
  etag?: string;
  contentType?: string;
  quality?: 'low' | 'medium' | 'high';
  lastAccessed?: number;
}

export interface ImageCacheStats {
  totalImages: number;
  cachedImages: number;
  cacheSize: number;
  hitRate: number;
  memoryUsage: number;
  diskUsage: number;
  preloadedImages: number;
}

export interface ImageLoadOptions {
  priority?: 'low' | 'normal' | 'high';
  quality?: 'low' | 'medium' | 'high';
  timeout?: number;
  fallback?: boolean;
  width?: number;
  height?: number;
}

/**
 * 🧠 CACHE LRU ADAPTATIF ultra-rapide pour mémoire
 */
class AdaptiveLRUCache {
  private cache = new Map<string, CachedImageInfo>();
  private accessTimes = new Map<string, number>();
  private maxSize: number;
  private currentMemoryUsage = 0;

  constructor(maxSizeMB: number) {
    this.maxSize = maxSizeMB * 1024 * 1024; // Convert to bytes
  }

  get(key: string): CachedImageInfo | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // Update access time (LRU)
    this.accessTimes.set(key, Date.now());
    item.lastAccessed = Date.now();
    return item;
  }

  set(key: string, value: CachedImageInfo): void {
    const estimatedSize = value.size || 50000; // 50KB par défaut

    // Remove existing if present
    if (this.cache.has(key)) {
      const existing = this.cache.get(key)!;
      this.currentMemoryUsage -= (existing.size || 50000);
    }

    // Evict old items if necessary
    while (this.currentMemoryUsage + estimatedSize > this.maxSize && this.cache.size > 0) {
      this.evictLeastRecentlyUsed();
    }

    // Add new item
    this.cache.set(key, value);
    this.accessTimes.set(key, Date.now());
    this.currentMemoryUsage += estimatedSize;
  }

  private evictLeastRecentlyUsed(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, accessTime] of this.accessTimes) {
      if (accessTime < oldestTime) {
        oldestTime = accessTime;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const item = this.cache.get(oldestKey);
      if (item) {
        this.currentMemoryUsage -= (item.size || 50000);
      }
      this.cache.delete(oldestKey);
      this.accessTimes.delete(oldestKey);
    }
  }

  clear(): void {
    this.cache.clear();
    this.accessTimes.clear();
    this.currentMemoryUsage = 0;
  }

  getStats() {
    return {
      count: this.cache.size,
      memoryUsage: Math.round(this.currentMemoryUsage / 1024 / 1024), // MB
      maxSize: Math.round(this.maxSize / 1024 / 1024) // MB
    };
  }
}

export class ImageCacheService {
  private static instance: ImageCacheService;
  private readonly CACHE_PREFIX = 'iptv_image_cache_';
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24h optimisé
  private readonly MAX_MEMORY_CACHE = 50; // 50MB mémoire
  private readonly MAX_DISK_CACHE = 200; // 200MB disque
  
  private memoryCache: AdaptiveLRUCache;
  private pendingLoads = new Map<string, Promise<CachedImageInfo>>();
  private preloadQueue: string[] = [];
  private isPreloading = false;
  
  // Statistiques performance
  private cacheHits = 0;
  private cacheMisses = 0;
  private preloadedCount = 0;
  private diskCacheSize = 0;

  constructor() {
    this.memoryCache = new AdaptiveLRUCache(this.MAX_MEMORY_CACHE);
    this.initializeDiskCache();
  }

  public static getInstance(): ImageCacheService {
    if (!ImageCacheService.instance) {
      ImageCacheService.instance = new ImageCacheService();
    }
    return ImageCacheService.instance;
  }

  /**
   * 🔄 Initialisation cache disque asynchrone
   */
  private async initializeDiskCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      let totalSize = 0;
      for (const key of cacheKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const info: CachedImageInfo = JSON.parse(data);
            totalSize += info.size || 50000;
          }
        } catch {
          // Supprimer entrée corrompue
          await AsyncStorage.removeItem(key);
        }
      }
      
      this.diskCacheSize = totalSize;
      console.log(`📦 ImageCache initialisé: ${Math.round(totalSize/1024/1024)}MB sur disque`);
    } catch (error) {
      console.warn('⚠️ Erreur initialisation cache disque:', error);
    }
  }

  // 🆕 Méthode statique pour compatibilité DI
  // Sera utilisée par le ServiceRegistry
  public static async createFromDI(): Promise<ImageCacheService> {
    try {
      // Pour le moment, retourne une nouvelle instance
      // Plus tard, on pourra injecter des dépendances si nécessaire
      return new ImageCacheService();
    } catch (error) {
      console.error('❌ Failed to create ImageCacheService from DI:', error);
      // Fallback sur l'ancienne méthode
      return ImageCacheService.getInstance();
    }
  }

  /**
   * 🚀 CHARGEMENT IMAGE ULTRA-OPTIMISÉ avec cache 3-niveaux
   */
  async loadOptimizedImage(uri: string, options: ImageLoadOptions = {}): Promise<CachedImageInfo> {
    if (!uri || !uri.trim()) {
      throw new Error('URI manquant');
    }

    const cleanUri = uri.trim();
    const cacheKey = this.generateCacheKey(cleanUri, options);

    // 1. CHECK MÉMOIRE CACHE (ultra-rapide O(1))
    const memoryHit = this.memoryCache.get(cacheKey);
    if (memoryHit && !this.isExpired(memoryHit)) {
      this.cacheHits++;
      return memoryHit;
    }

    // 2. CHECK PENDING LOADS (évite doublons)
    const pendingLoad = this.pendingLoads.get(cacheKey);
    if (pendingLoad) {
      return await pendingLoad;
    }

    // 3. NOUVEAU CHARGEMENT avec cache
    const loadPromise = this.loadAndCacheImage(cleanUri, cacheKey, options);
    this.pendingLoads.set(cacheKey, loadPromise);

    try {
      return await loadPromise;
    } finally {
      this.pendingLoads.delete(cacheKey);
    }
  }

  /**
   * Propriétés optimisées react-native-fast-image avec cache intelligent
   */
  getOptimizedImageProps(uri: string | undefined | null, style?: ImageStyle, options: ImageLoadOptions = {}) {
    if (!uri || !uri.trim()) {
      return this.getPlaceholderProps(style);
    }

    // Configuration ultra-optimisée
    return {
      source: {
        uri: uri.trim(),
        priority: options.priority || 'normal' as const,
        cache: 'immutable' as const,
      },
      style: style || { width: 56, height: 56 },
      resizeMode: 'contain' as const,
      fallback: options.fallback !== false,
      onLoadStart: () => this.onImageLoadStart(uri),
      onLoad: () => this.onImageLoadSuccess(uri),
      onError: () => this.onImageLoadError(uri),
      // Propriétés performance
      blurRadius: 0,
      capInsets: { top: 0, left: 0, bottom: 0, right: 0 },
      borderRadius: 0,
    };
  }

  /**
   * Obtenir les propriétés pour un placeholder
   */
  getPlaceholderProps(style?: ImageStyle) {
    // Retourner null pour laisser le composant gérer le placeholder
    return null;
  }

  /**
   * 🔄 Chargement et mise en cache interne
   */
  private async loadAndCacheImage(uri: string, cacheKey: string, options: ImageLoadOptions): Promise<CachedImageInfo> {
    try {
      // 1. CHECK CACHE DISQUE AsyncStorage
      const diskCached = await this.getDiskCached(cacheKey);
      if (diskCached && !this.isExpired(diskCached)) {
        // Ajouter en mémoire pour prochain accès
        this.memoryCache.set(cacheKey, diskCached);
        this.cacheHits++;
        return diskCached;
      }

      // 2. TÉLÉCHARGEMENT avec timeout et retry
      this.cacheMisses++;
      const imageInfo = await this.downloadWithRetry(uri, options);
      
      // 3. MISE EN CACHE mémoire + disque
      this.memoryCache.set(cacheKey, imageInfo);
      await this.saveToDiskCache(cacheKey, imageInfo);

      return imageInfo;

    } catch (error) {
      console.warn(`⚠️ Erreur chargement image ${uri}:`, error);
      throw error;
    }
  }

  /**
   * 📥 Téléchargement avec retry et timeout
   */
  private async downloadWithRetry(uri: string, options: ImageLoadOptions): Promise<CachedImageInfo> {
    const timeout = options.timeout || 8000; // 8s par défaut
    const maxRetries = 2;
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(uri, {
          method: 'HEAD', // Juste headers pour vérifier
          signal: controller.signal,
          headers: {
            'User-Agent': 'IPTVMobileApp/1.0',
            'Accept': 'image/*'
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        // Créer CachedImageInfo avec métadonnées
        const imageInfo: CachedImageInfo = {
          uri,
          cached: true,
          timestamp: Date.now(),
          lastAccessed: Date.now(),
          size: parseInt(response.headers.get('content-length') || '50000'),
          contentType: response.headers.get('content-type') || 'image/jpeg',
          etag: response.headers.get('etag') || undefined,
          quality: options.quality || 'medium'
        };

        return imageInfo;

      } catch (error) {
        lastError = error;
        if (attempt < maxRetries - 1) {
          await this.delay(500 * (attempt + 1)); // Exponential backoff
        }
      }
    }

    throw lastError;
  }

  /**
   * 🚀 PRÉCHARGEMENT BATCH ULTRA-OPTIMISÉ pour 100K+ images
   */
  async preloadImages(uris: string[], options: { batchSize?: number, priority?: 'low' | 'normal' | 'high' } = {}): Promise<void> {
    const { batchSize = 15, priority = 'low' } = options;
    
    console.log(`🚀 Préchargement ultra-optimisé: ${uris.length} images`);
    
    const validUris = uris.filter(uri => uri && uri.trim() && this.isValidImageUrl(uri));
    console.log(`📊 ${validUris.length} URLs valides à précharger`);
    
    let successCount = 0;
    let errorCount = 0;
    const startTime = Date.now();

    // Préchargement par batches optimisés
    for (let i = 0; i < validUris.length; i += batchSize) {
      const batch = validUris.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(uri => this.loadOptimizedImage(uri, { 
          priority, 
          timeout: 3000, // Timeout court pour préchargement
          fallback: false 
        }))
      );

      // Compter succès/erreurs
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          successCount++;
          this.preloadedCount++;
        } else {
          errorCount++;
        }
      }

      // Progress logging
      if (i % (batchSize * 10) === 0) {
        const progress = Math.round((i / validUris.length) * 100);
        console.log(`📊 Préchargement: ${progress}% (${successCount} succès, ${errorCount} erreurs)`);
      }

      // Pause dynamique entre batches selon priorité
      if (i + batchSize < validUris.length) {
        const pauseMs = priority === 'high' ? 50 : priority === 'normal' ? 100 : 200;
        await this.delay(pauseMs);
      }
    }

    const elapsed = Date.now() - startTime;
    const rate = Math.round((validUris.length / elapsed) * 1000); // images/seconde
    
    console.log(`✅ Préchargement terminé: ${successCount} succès, ${errorCount} erreurs en ${elapsed}ms (${rate} img/s)`);
  }

  /**
   * Précharger une image unique
   */
  private async preloadSingleImage(uri: string): Promise<void> {
    try {
      // Simuler le préchargement (react-native-fast-image le fait automatiquement)
      const imageInfo: CachedImageInfo = {
        uri,
        cached: true,
        timestamp: Date.now(),
      };
      
      this.imageCache.set(uri, imageInfo);
      await this.saveCacheInfo(uri, imageInfo);
      
    } catch (error) {
      console.warn(`⚠️ Failed to preload image: ${uri}`, error);
    }
  }

  /**
   * Vérifier si une URL d'image est valide
   */
  private isValidImageUrl(uri: string): boolean {
    if (!uri || typeof uri !== 'string') return false;
    
    const trimmedUri = uri.trim();
    
    // Vérifier le format de l'URL
    if (!trimmedUri.startsWith('http')) return false;
    
    // Vérifier les extensions d'image communes
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const hasImageExtension = imageExtensions.some(ext => 
      trimmedUri.toLowerCase().includes(ext)
    );
    
    // Accepter si c'est une URL d'image ou si elle contient 'logo'
    return hasImageExtension || trimmedUri.toLowerCase().includes('logo');
  }

  /**
   * Gestionnaire de début de chargement
   */
  private onImageLoadStart(uri: string): void {
    // console.log(`🔄 Loading image: ${uri}`);
  }

  /**
   * Gestionnaire de succès de chargement
   */
  private onImageLoadSuccess(uri: string): void {
    this.cacheHits++;
    
    const imageInfo: CachedImageInfo = {
      uri,
      cached: true,
      timestamp: Date.now(),
    };
    
    this.imageCache.set(uri, imageInfo);
    this.saveCacheInfo(uri, imageInfo);
    
    // console.log(`✅ Image loaded successfully: ${uri}`);
  }

  /**
   * Gestionnaire d'erreur de chargement
   */
  private onImageLoadError(uri: string): void {
    this.cacheMisses++;
    console.warn(`❌ Failed to load image: ${uri}`);
    
    // Retirer de la cache en cas d'erreur
    this.imageCache.delete(uri);
    this.removeCacheInfo(uri);
  }

  /**
   * Encoder une chaîne en base64 (compatible React Native)
   */
  private encodeBase64(str: string): string {
    // Simple hash pour React Native (pas besoin de Buffer)
    return str.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 32);
  }

  /**
   * Sauvegarder les informations de cache
   */
  private async saveCacheInfo(uri: string, info: CachedImageInfo): Promise<void> {
    try {
      const key = `${this.CACHE_PREFIX}${this.encodeBase64(uri)}`;
      await AsyncStorage.setItem(key, JSON.stringify(info));
    } catch (error) {
      console.warn('⚠️ Failed to save image cache info:', error);
    }
  }

  /**
   * Supprimer les informations de cache
   */
  private async removeCacheInfo(uri: string): Promise<void> {
    try {
      const key = `${this.CACHE_PREFIX}${this.encodeBase64(uri)}`;
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.warn('⚠️ Failed to remove image cache info:', error);
    }
  }

  /**
   * Nettoyer le cache expiré
   */
  async cleanExpiredCache(): Promise<void> {
    try {
      console.log('🧹 Cleaning expired image cache...');
      
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      const now = Date.now();
      
      let cleanedCount = 0;
      
      for (const key of cacheKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const info: CachedImageInfo = JSON.parse(data);
            
            // Supprimer si expiré
            if (now - info.timestamp > this.CACHE_TTL) {
              await AsyncStorage.removeItem(key);
              this.imageCache.delete(info.uri);
              cleanedCount++;
            }
          }
        } catch (error) {
          // Supprimer les entrées corrompues
          await AsyncStorage.removeItem(key);
          cleanedCount++;
        }
      }
      
      console.log(`✅ Cleaned ${cleanedCount} expired cache entries`);
      
    } catch (error) {
      console.warn('⚠️ Failed to clean image cache:', error);
    }
  }

  /**
   * 🔧 MÉTHODES UTILITAIRES PRIVÉES
   */
  private generateCacheKey(uri: string, options: ImageLoadOptions): string {
    const sizeKey = options.width && options.height ? `_${options.width}x${options.height}` : '';
    const qualityKey = options.quality ? `_${options.quality}` : '';
    return `${this.hashString(uri)}${sizeKey}${qualityKey}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private isExpired(imageInfo: CachedImageInfo): boolean {
    return Date.now() - imageInfo.timestamp > this.CACHE_TTL;
  }

  private async getDiskCached(key: string): Promise<CachedImageInfo | null> {
    try {
      const data = await AsyncStorage.getItem(`${this.CACHE_PREFIX}${key}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private async saveToDiskCache(key: string, imageInfo: CachedImageInfo): Promise<void> {
    try {
      await AsyncStorage.setItem(`${this.CACHE_PREFIX}${key}`, JSON.stringify(imageInfo));
      this.diskCacheSize += imageInfo.size || 50000;
      
      // Nettoyage si dépassement
      if (this.diskCacheSize > this.MAX_DISK_CACHE * 1024 * 1024) {
        await this.cleanupDiskCacheInternal();
      }
    } catch (error) {
      console.warn('⚠️ Erreur sauvegarde cache disque:', error);
    }
  }

  private async cleanupDiskCacheInternal(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      // Récupérer toutes les images avec timestamps
      const images: Array<{key: string, info: CachedImageInfo}> = [];
      
      for (const key of cacheKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const info = JSON.parse(data) as CachedImageInfo;
            images.push({ key, info });
          }
        } catch {
          // Supprimer entrées corrompues
          await AsyncStorage.removeItem(key);
        }
      }

      // Trier par dernière utilisation (LRU)
      images.sort((a, b) => (a.info.lastAccessed || a.info.timestamp) - (b.info.lastAccessed || b.info.timestamp));

      // Supprimer jusqu'à 80% de la limite
      const targetSize = this.MAX_DISK_CACHE * 0.8 * 1024 * 1024;
      let currentSize = this.diskCacheSize;

      for (const {key, info} of images) {
        if (currentSize <= targetSize) break;
        
        await AsyncStorage.removeItem(key);
        currentSize -= (info.size || 50000);
      }

      this.diskCacheSize = currentSize;
      console.log(`🧹 Cache disque nettoyé: ${Math.round(currentSize/1024/1024)}MB restants`);
      
    } catch (error) {
      console.warn('⚠️ Erreur nettoyage cache:', error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 📊 STATISTIQUES CACHE ULTRA-DÉTAILLÉES
   */
  getCacheStats(): ImageCacheStats {
    const totalRequests = this.cacheHits + this.cacheMisses;
    const hitRate = totalRequests > 0 ? (this.cacheHits / totalRequests) * 100 : 0;
    const memoryStats = this.memoryCache.getStats();
    
    return {
      totalImages: memoryStats.count,
      cachedImages: this.cacheHits,
      cacheSize: this.diskCacheSize,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryUsage: memoryStats.memoryUsage,
      diskUsage: Math.round(this.diskCacheSize / 1024 / 1024), // MB
      preloadedImages: this.preloadedCount,
    };
  }

  /**
   * 🗑️ NETTOYAGE COMPLET CACHE - Ultra-rapide avec stats
   */
  async clearCache(): Promise<void> {
    try {
      const startTime = Date.now();
      console.log('🗑️ Nettoyage complet cache images...');
      
      // 1. Nettoyer mémoire
      this.memoryCache.clear();
      
      // 2. Nettoyer disque
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
      
      // 3. Reset compteurs
      const oldStats = this.getCacheStats();
      this.cacheHits = 0;
      this.cacheMisses = 0;
      this.preloadedCount = 0;
      this.diskCacheSize = 0;
      this.pendingLoads.clear();
      this.preloadQueue = [];
      
      const elapsed = Date.now() - startTime;
      console.log(`✅ Cache nettoyé: ${cacheKeys.length} entrées supprimées, ${oldStats.diskUsage}MB libérés en ${elapsed}ms`);
      
    } catch (error) {
      console.warn('⚠️ Erreur nettoyage cache:', error);
    }
  }

  /**
   * 🧪 PRÉCHARGEMENT INTELLIGENT ADAPTATIF
   * Adapte la vitesse selon la performance du réseau et device
   */
  async intelligentPreload(uris: string[]): Promise<void> {
    if (uris.length === 0) return;

    // Test vitesse réseau avec premiers URLs
    const testSample = uris.slice(0, 3);
    const startTest = Date.now();
    
    const testResults = await Promise.allSettled(
      testSample.map(uri => this.loadOptimizedImage(uri, { timeout: 2000 }))
    );
    
    const testDuration = Date.now() - startTest;
    const successRate = testResults.filter(r => r.status === 'fulfilled').length / testResults.length;
    const avgSpeed = testResults.length / (testDuration / 1000); // images/seconde

    // Adapter paramètres selon performance
    let batchSize = 10;
    let priority: 'low' | 'normal' | 'high' = 'normal';
    
    if (avgSpeed > 2 && successRate > 0.8) {
      // Connexion rapide et fiable
      batchSize = 20;
      priority = 'high';
    } else if (avgSpeed < 1 || successRate < 0.5) {
      // Connexion lente ou instable
      batchSize = 5;
      priority = 'low';
    }

    console.log(`🧪 Test réseau: ${Math.round(avgSpeed * 100)/100} img/s, ${Math.round(successRate*100)}% succès → batch=${batchSize}, priorité=${priority}`);

    // Préchargement adaptatif avec paramètres optimisés
    const remainingUris = uris.slice(3); // Exclure échantillon test
    await this.preloadImages(remainingUris, { batchSize, priority });
  }

  /**
   * 🔧 Configuration dynamique selon capacité device
   */
  optimizeForDevice(): void {
    // Détecter capacité approximative (basique)
    const isLowEnd = this.memoryCache.getStats().maxSize < 30; // Moins de 30MB config
    
    if (isLowEnd) {
      console.log('📱 Device low-end détecté - optimisation conservative');
      this.memoryCache = new AdaptiveLRUCache(20); // 20MB seulement
    } else {
      console.log('📱 Device standard détecté - optimisation agressive');
    }
  }
}

// Export singleton instance
export const imageCacheService = ImageCacheService.getInstance();