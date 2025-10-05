/**
 * 🎯 useOptimizedImage - Hook React pour Images Ultra-Optimisées
 * Intégration avec ImageCacheService pour 100K+ chaînes
 */

import {useState, useEffect, useMemo} from 'react';
import {
  imageCacheService,
  type CachedImageInfo,
  type ImageLoadOptions,
} from '../services/ImageCacheService';

interface OptimizedImageResult {
  imageInfo: CachedImageInfo | null;
  imageUri: string | null;
  isLoading: boolean;
  error: Error | null;
  isCached: boolean;
  retry: () => void;
}

/**
 * 🚀 Hook principal pour images optimisées avec cache intelligent
 */
export const useOptimizedImage = (
  uri: string | null | undefined,
  options: ImageLoadOptions = {},
): OptimizedImageResult => {
  const [imageInfo, setImageInfo] = useState<CachedImageInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Mémoise les options pour éviter re-renders inutiles
  const memoizedOptions = useMemo(
    () => ({
      priority: options.priority || ('normal' as const),
      quality: options.quality || ('medium' as const),
      timeout: options.timeout || 8000,
      fallback: options.fallback !== false,
      width: options.width,
      height: options.height,
    }),
    [
      options.priority,
      options.quality,
      options.timeout,
      options.fallback,
      options.width,
      options.height,
    ],
  );

  // Fonction retry
  const retry = () => {
    setRetryCount(prev => prev + 1);
  };

  useEffect(() => {
    // Reset si pas d'URI
    if (!uri || !uri.trim()) {
      setImageInfo(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const loadImage = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const info = await imageCacheService.loadOptimizedImage(
          uri,
          memoizedOptions,
        );

        if (!cancelled) {
          setImageInfo(info);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
          setIsLoading(false);
          setImageInfo(null);
        }
      }
    };

    loadImage();

    // Cleanup function
    return () => {
      cancelled = true;
    };
  }, [uri, memoizedOptions, retryCount]);

  return {
    imageInfo,
    imageUri: imageInfo?.uri || null,
    isLoading,
    error,
    isCached: imageInfo?.cached || false,
    retry,
  };
};

/**
 * 🚀 Hook pour préchargement batch d'images
 */
export const useImagePreloader = () => {
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadStats, setPreloadStats] = useState({
    total: 0,
    loaded: 0,
    errors: 0,
  });

  const preloadImages = async (
    uris: string[],
    options: {
      batchSize?: number;
      priority?: 'low' | 'normal' | 'high';
      onProgress?: (stats: {
        total: number;
        loaded: number;
        errors: number;
      }) => void;
    } = {},
  ) => {
    if (uris.length === 0) {
      return;
    }

    setIsPreloading(true);
    setPreloadStats({total: uris.length, loaded: 0, errors: 0});

    try {
      await imageCacheService.preloadImages(uris, {
        batchSize: options.batchSize,
        priority: options.priority,
      });

      // Mettre à jour stats finales
      const finalStats = {total: uris.length, loaded: uris.length, errors: 0};
      setPreloadStats(finalStats);
      options.onProgress?.(finalStats);
    } catch (error) {
      console.warn('Erreur préchargement:', error);
      setPreloadStats(prev => ({...prev, errors: prev.errors + 1}));
    } finally {
      setIsPreloading(false);
    }
  };

  const preloadIntelligent = async (uris: string[]) => {
    setIsPreloading(true);
    try {
      await imageCacheService.intelligentPreload(uris);
    } finally {
      setIsPreloading(false);
    }
  };

  return {
    preloadImages,
    preloadIntelligent,
    isPreloading,
    preloadStats,
  };
};

/**
 * 🎯 Hook pour statistiques cache temps réel
 */
export const useCacheStats = () => {
  const [stats, setStats] = useState(imageCacheService.getCacheStats());

  const refreshStats = () => {
    setStats(imageCacheService.getCacheStats());
  };

  const clearCache = async () => {
    await imageCacheService.clearCache();
    refreshStats();
  };

  // Auto-refresh stats toutes les 5 secondes si nécessaire
  useEffect(() => {
    const interval = setInterval(refreshStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return {
    stats,
    refreshStats,
    clearCache,
  };
};

/**
 * 🏆 Hook combiné pour gestion complète images optimisées
 * Utilise tous les services pour performance maximale
 */
export const useChannelImage = (
  logoUri: string | null | undefined,
  channelId: string,
  priority: 'low' | 'normal' | 'high' = 'normal',
) => {
  const options: ImageLoadOptions = useMemo(
    () => ({
      priority,
      width: 56,
      height: 56,
      quality: 'medium' as const,
      timeout: priority === 'high' ? 10000 : 5000,
      fallback: true,
    }),
    [priority],
  );

  const imageResult = useOptimizedImage(logoUri, options);

  // Props optimisées pour react-native-fast-image
  const imageProps = useMemo(() => {
    if (!logoUri) {
      return {
        source: {uri: ''},
        style: {width: 56, height: 56},
        resizeMode: 'contain' as const,
        fallback: true,
      };
    }

    return imageCacheService.getOptimizedImageProps(
      logoUri,
      {width: 56, height: 56},
      options,
    );
  }, [logoUri, options]);

  return {
    ...imageResult,
    imageProps,
    channelId,
  };
};
