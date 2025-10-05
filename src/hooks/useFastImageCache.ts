/**
 * 🎯 Hook pour configurer le cache FastImage (Glide)
 * Optimisé pour 100K+ chaînes avec cache plafonné
 */

import {useEffect} from 'react';
import FastImage from 'react-native-fast-image';

export const useFastImageCache = () => {
  useEffect(() => {
    // Configuration du cache au démarrage
    // FastImage utilise Glide qui a des paramètres par défaut:
    // - Cache mémoire: ~10% RAM disponible
    // - Cache disque: 250 MB (par défaut)

    // Note: Pour ajuster ces valeurs, il faut configurer Glide en natif
    // Pour l'instant, on utilise les valeurs par défaut qui sont raisonnables

    console.log('🎨 FastImage cache initialized with default Glide settings');
    console.log('   Memory cache: ~10% available RAM');
    console.log('   Disk cache: 250 MB (LRU eviction)');

    // Fonction pour vider le cache manuellement si nécessaire
    return () => {
      // Cleanup si nécessaire
    };
  }, []);
};

/**
 * Fonction pour vider le cache FastImage manuellement
 * Utile pour les paramètres ou après suppression de playlist
 */
export const clearFastImageCache = async (): Promise<void> => {
  try {
    await FastImage.clearMemoryCache();
    await FastImage.clearDiskCache();
    console.log('✅ FastImage cache cleared');
  } catch (error) {
    console.error('❌ Error clearing FastImage cache:', error);
  }
};
