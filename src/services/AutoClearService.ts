/**
 * 🧹 AutoClearService - Nettoyage automatique périodique du cache
 * Supprime automatiquement les entrées de cache plus anciennes que autoClearDays
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CacheManager } from './CacheManager';
import { InteractionManager } from 'react-native';

interface CacheEntry {
  timestamp: number;
  data?: any;
  [key: string]: any;
}

class AutoClearService {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 heure
  private isRunning = false;

  /**
   * Démarre le service de nettoyage automatique
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('🧹 [AutoClear] Service déjà démarré');
      return;
    }

    console.log('🧹 [AutoClear] Démarrage du service de nettoyage automatique...');

    // Vérification immédiate au démarrage
    await this.performCleanup();

    // Vérification périodique toutes les heures
    this.intervalId = setInterval(() => {
      this.performCleanup().catch(error => {
        console.error('🧹 [AutoClear] Erreur lors du nettoyage périodique:', error);
      });
    }, this.CHECK_INTERVAL_MS);

    this.isRunning = true;
    console.log('🧹 [AutoClear] Service démarré (vérification toutes les heures)');
  }

  /**
   * Arrête le service de nettoyage automatique
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning = false;
      console.log('🧹 [AutoClear] Service arrêté');
    }
  }

  /**
   * Force un nettoyage immédiat
   */
  async forceCleanup(): Promise<{deleted: number; freedMB: number}> {
    return await this.performCleanup();
  }

  /**
   * Effectue le nettoyage selon les paramètres autoClearDays
   * ⚡ OPTIMISÉ: Utilise InteractionManager pour ne pas bloquer l'UI
   */
  private async performCleanup(): Promise<{deleted: number; freedMB: number}> {
    // Attendre que l'UI soit libre avant de commencer
    return new Promise((resolve) => {
      InteractionManager.runAfterInteractions(async () => {
        try {
          const settings = await CacheManager.getSettings();
          const maxAgeDays = settings.autoClearDays;
          const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
          const cutoffTimestamp = Date.now() - maxAgeMs;

          console.log(`🧹 [AutoClear] Nettoyage des entrées > ${maxAgeDays} jours (avant ${new Date(cutoffTimestamp).toISOString()})`);

          // Récupérer toutes les clés de cache
          const allKeys = await AsyncStorage.getAllKeys();
          const cacheKeys = allKeys.filter(key =>
            key.startsWith('@cache_') ||
            key.startsWith('@image_') ||
            key.startsWith('@epg_') ||
            key.startsWith('smart_cache_l2_') ||
            key.includes('_cache') ||
            key.includes('_cached')
          );

          // ⚡ OPTIMISATION: Limiter à 100 clés maximum pour éviter blocage
          const keysToCheck = cacheKeys.slice(0, 100);

          // Filtrer les entrées à supprimer
          const keysToDelete: string[] = [];
          let totalSize = 0;

          // ⚡ OPTIMISATION: Traiter par batch de 10 pour ne pas bloquer
          const BATCH_SIZE = 10;
          for (let i = 0; i < keysToCheck.length; i += BATCH_SIZE) {
            const batch = keysToCheck.slice(i, i + BATCH_SIZE);

            // Traiter le batch en parallèle
            const results = await Promise.all(
              batch.map(async (key) => {
                try {
                  const value = await AsyncStorage.getItem(key);
                  if (!value) return null;

                  // Essayer de parser comme JSON
                  try {
                    const entry: CacheEntry = JSON.parse(value);

                    // Vérifier si l'entrée a un timestamp
                    if (entry.timestamp && entry.timestamp < cutoffTimestamp) {
                      return { key, size: value.length };
                    }
                  } catch (parseError) {
                    // Ignorer les erreurs de parsing
                  }
                } catch (error) {
                  // Ignorer les erreurs de lecture
                }
                return null;
              })
            );

            // Collecter les résultats
            results.forEach((result) => {
              if (result) {
                keysToDelete.push(result.key);
                totalSize += result.size;
              }
            });

            // ⚡ Laisser respirer l'UI entre les batchs
            await new Promise(r => setImmediate(r));
          }

          // Supprimer les entrées anciennes
          if (keysToDelete.length > 0) {
            await AsyncStorage.multiRemove(keysToDelete);
            const freedMB = totalSize / (1024 * 1024);
            console.log(`🧹 [AutoClear] ✅ Nettoyé ${keysToDelete.length} entrées (${freedMB.toFixed(2)} MB libérés)`);

            resolve({
              deleted: keysToDelete.length,
              freedMB: freedMB,
            });
          } else {
            console.log('🧹 [AutoClear] Aucune entrée à nettoyer');
            resolve({ deleted: 0, freedMB: 0 });
          }

        } catch (error) {
          console.error('🧹 [AutoClear] Erreur lors du nettoyage:', error);
          resolve({ deleted: 0, freedMB: 0 });
        }
      });
    });
  }

  /**
   * Obtient des statistiques sur le cache
   */
  async getStats(): Promise<{
    totalCacheKeys: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  }> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key =>
        key.startsWith('@cache_') ||
        key.startsWith('@image_') ||
        key.startsWith('@epg_') ||
        key.startsWith('smart_cache_l2_')
      );

      let oldestTimestamp = Infinity;
      let newestTimestamp = 0;

      for (const key of cacheKeys.slice(0, 100)) { // Échantillon pour performance
        try {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            const entry: CacheEntry = JSON.parse(value);
            if (entry.timestamp) {
              oldestTimestamp = Math.min(oldestTimestamp, entry.timestamp);
              newestTimestamp = Math.max(newestTimestamp, entry.timestamp);
            }
          }
        } catch (error) {
          // Ignorer les erreurs de parsing
        }
      }

      return {
        totalCacheKeys: cacheKeys.length,
        oldestEntry: oldestTimestamp < Infinity ? new Date(oldestTimestamp) : null,
        newestEntry: newestTimestamp > 0 ? new Date(newestTimestamp) : null,
      };
    } catch (error) {
      console.error('🧹 [AutoClear] Erreur lors du calcul des stats:', error);
      return {
        totalCacheKeys: 0,
        oldestEntry: null,
        newestEntry: null,
      };
    }
  }
}

export default new AutoClearService();
