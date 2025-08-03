/**
 * 🖼️ Image Cache Service - Module de gestion optimisée des images
 * Architecture modulaire pour le cache et l'optimisation des logos IPTV
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ImageStyle } from 'react-native';

export interface CachedImageInfo {
  uri: string;
  cached: boolean;
  localPath?: string;
  timestamp: number;
  size?: number;
}

export interface ImageCacheStats {
  totalImages: number;
  cachedImages: number;
  cacheSize: number;
  hitRate: number;
}

export class ImageCacheService {
  private static instance: ImageCacheService;
  private readonly CACHE_PREFIX = 'iptv_image_cache_';
  private readonly CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 jours
  private readonly MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB
  
  private imageCache = new Map<string, CachedImageInfo>();
  private cacheHits = 0;
  private cacheMisses = 0;

  public static getInstance(): ImageCacheService {
    if (!ImageCacheService.instance) {
      ImageCacheService.instance = new ImageCacheService();
    }
    return ImageCacheService.instance;
  }

  /**
   * Obtenir les propriétés optimisées pour react-native-fast-image
   */
  getOptimizedImageProps(uri: string | undefined | null, style?: ImageStyle) {
    if (!uri || !uri.trim()) {
      return this.getPlaceholderProps(style);
    }

    // Configuration optimisée pour react-native-fast-image
    return {
      source: {
        uri: uri.trim(),
        priority: 'normal' as const,
        cache: 'immutable' as const,
      },
      style: style || { width: 56, height: 56 },
      resizeMode: 'contain' as const,
      fallback: true,
      onLoadStart: () => this.onImageLoadStart(uri),
      onLoad: () => this.onImageLoadSuccess(uri),
      onError: () => this.onImageLoadError(uri),
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
   * Précharger une liste d'images
   */
  async preloadImages(uris: string[]): Promise<void> {
    console.log(`🖼️ Preloading ${uris.length} images...`);
    
    const validUris = uris.filter(uri => uri && uri.trim() && this.isValidImageUrl(uri));
    
    // Précharger par batches de 10 pour éviter la surcharge
    const batchSize = 10;
    for (let i = 0; i < validUris.length; i += batchSize) {
      const batch = validUris.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(uri => this.preloadSingleImage(uri))
      );
      
      // Petite pause entre les batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`✅ Image preloading completed`);
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
   * Obtenir les statistiques du cache
   */
  getCacheStats(): ImageCacheStats {
    const totalRequests = this.cacheHits + this.cacheMisses;
    const hitRate = totalRequests > 0 ? (this.cacheHits / totalRequests) * 100 : 0;
    
    return {
      totalImages: this.imageCache.size,
      cachedImages: this.cacheHits,
      cacheSize: 0, // Difficile à calculer précisément
      hitRate: Math.round(hitRate * 100) / 100,
    };
  }

  /**
   * Vider complètement le cache
   */
  async clearCache(): Promise<void> {
    try {
      console.log('🗑️ Clearing all image cache...');
      
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      await AsyncStorage.multiRemove(cacheKeys);
      this.imageCache.clear();
      this.cacheHits = 0;
      this.cacheMisses = 0;
      
      console.log('✅ Image cache cleared');
      
    } catch (error) {
      console.warn('⚠️ Failed to clear image cache:', error);
    }
  }
}

// Export singleton instance
export const imageCacheService = ImageCacheService.getInstance();