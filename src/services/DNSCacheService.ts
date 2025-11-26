/**
 * 🌐 DNSCacheService - Cache des résolutions DNS
 * Évite les résolutions DNS répétées pour améliorer les performances réseau
 */

import { CacheManager } from './CacheManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DNSCacheEntry {
  hostname: string;
  ip: string;
  timestamp: number;
  ttl: number; // Time To Live en ms
}

class DNSCacheService {
  private memoryCache = new Map<string, DNSCacheEntry>();
  private readonly DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 heure
  private readonly STORAGE_KEY = '@dns_cache';
  private isEnabled = true;

  // ⚡ Optimisation: Sauvegardes moins fréquentes
  private isDirty = false; // Indique si le cache a été modifié
  private readonly SAVE_DEBOUNCE_MS = 60000; // Sauvegarder max toutes les 60 secondes

  constructor() {
    this.loadCacheFromStorage();
    this.startCleanupTimer();
    this.startPeriodicSave();
  }

  /**
   * Charge le cache DNS depuis AsyncStorage au démarrage
   */
  private async loadCacheFromStorage(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const entries: DNSCacheEntry[] = JSON.parse(stored);
        const now = Date.now();

        // Filtrer les entrées expirées
        entries.forEach(entry => {
          if (entry.timestamp + entry.ttl > now) {
            this.memoryCache.set(entry.hostname, entry);
          }
        });

        console.log(`🌐 [DNSCache] ${this.memoryCache.size} entrées chargées depuis le stockage`);
      }
    } catch (error) {
      console.error('🌐 [DNSCache] Erreur chargement cache:', error);
    }
  }

  /**
   * Sauvegarde le cache en mémoire vers AsyncStorage
   * ⚡ OPTIMISÉ: Sauvegarde seulement si modifié
   */
  private async saveCacheToStorage(): Promise<void> {
    try {
      if (!this.isDirty) {
        return; // Rien à sauvegarder
      }

      const entries = Array.from(this.memoryCache.values());
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(entries));
      this.isDirty = false;
      console.log(`🌐 [DNSCache] Cache sauvegardé (${entries.length} entrées)`);
    } catch (error) {
      console.error('🌐 [DNSCache] Erreur sauvegarde cache:', error);
    }
  }

  /**
   * ⚡ Sauvegarde périodique (toutes les 60 secondes si modifié)
   */
  private startPeriodicSave(): void {
    setInterval(() => {
      if (this.isDirty) {
        this.saveCacheToStorage();
      }
    }, this.SAVE_DEBOUNCE_MS);
  }

  /**
   * Démarre le timer de nettoyage périodique
   */
  private startCleanupTimer(): void {
    // Nettoyer les entrées expirées toutes les 10 minutes
    setInterval(() => {
      this.cleanExpiredEntries();
    }, 10 * 60 * 1000);
  }

  /**
   * Nettoie les entrées DNS expirées
   * ⚡ OPTIMISÉ: Marque comme dirty au lieu de sauvegarder immédiatement
   */
  private async cleanExpiredEntries(): Promise<void> {
    const now = Date.now();
    let removedCount = 0;

    for (const [hostname, entry] of this.memoryCache.entries()) {
      if (entry.timestamp + entry.ttl <= now) {
        this.memoryCache.delete(hostname);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`🌐 [DNSCache] ${removedCount} entrées expirées nettoyées`);
      this.isDirty = true; // Sera sauvegardé au prochain cycle
    }
  }

  /**
   * Résout un hostname (avec cache)
   * Note: En React Native, on ne peut pas vraiment faire de résolution DNS
   * Cette méthode simule le cache et peut être utilisée avec des IPs connues
   */
  async resolve(hostname: string): Promise<string | null> {
    // Vérifier si le DNS cache est activé
    const settings = await CacheManager.getSettings();
    if (!settings.dnsCacheEnabled) {
      return null; // Cache désactivé, utiliser la résolution système
    }

    // Vérifier le cache
    const cached = this.memoryCache.get(hostname);
    if (cached) {
      const now = Date.now();
      if (cached.timestamp + cached.ttl > now) {
        console.log(`🌐 [DNSCache] HIT: ${hostname} → ${cached.ip}`);
        return cached.ip;
      } else {
        // Entrée expirée
        this.memoryCache.delete(hostname);
      }
    }

    console.log(`🌐 [DNSCache] MISS: ${hostname}`);
    return null; // Pas dans le cache
  }

  /**
   * Ajoute une résolution DNS au cache
   * À utiliser après une résolution réussie
   * ⚡ OPTIMISÉ: Ne sauvegarde pas immédiatement, marque comme "dirty"
   */
  async cache(hostname: string, ip: string, ttl?: number): Promise<void> {
    const settings = await CacheManager.getSettings();
    if (!settings.dnsCacheEnabled) {
      return; // Cache désactivé
    }

    const entry: DNSCacheEntry = {
      hostname,
      ip,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL_MS,
    };

    this.memoryCache.set(hostname, entry);
    this.isDirty = true; // Marquer comme modifié

    console.log(`🌐 [DNSCache] Cached: ${hostname} → ${ip} (TTL: ${(entry.ttl / 1000 / 60).toFixed(0)} min)`);

    // ⚡ Plus de sauvegarde immédiate - sera sauvegardé périodiquement
  }

  /**
   * Extrait le hostname d'une URL
   */
  extractHostname(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      // URL invalide
      return null;
    }
  }

  /**
   * Wrapper pour fetch() qui utilise le DNS cache
   * Usage: await DNSCacheService.fetch('http://example.com/api')
   */
  async fetch(url: string, options?: RequestInit): Promise<Response> {
    const hostname = this.extractHostname(url);

    if (hostname) {
      const cachedIP = await this.resolve(hostname);

      if (cachedIP) {
        // Remplacer le hostname par l'IP dans l'URL (si possible)
        // Note: Ceci peut causer des problèmes avec HTTPS/SNI
        // C'est plus une optimisation théorique qu'une vraie implémentation
        console.log(`🌐 [DNSCache] Utilisation IP cachée pour ${hostname}`);
      }
    }

    // Faire la requête normale (avec résolution DNS système)
    const response = await fetch(url, options);

    // Si succès, essayer de cacher la résolution DNS
    // Note: En réalité, on ne peut pas obtenir l'IP depuis fetch() en React Native
    // Cette partie est plus théorique
    if (response.ok && hostname) {
      // Dans une vraie implémentation, on obtiendrait l'IP depuis les headers ou une API
      // Pour l'instant, on simule juste le mécanisme
    }

    return response;
  }

  /**
   * Vide le cache DNS
   */
  async clearCache(): Promise<{success: boolean; entriesCleared: number}> {
    try {
      const count = this.memoryCache.size;
      this.memoryCache.clear();
      this.isDirty = false; // Plus rien à sauvegarder
      await AsyncStorage.removeItem(this.STORAGE_KEY);

      console.log(`🌐 [DNSCache] Cache vidé: ${count} entrées supprimées`);

      return {
        success: true,
        entriesCleared: count,
      };
    } catch (error) {
      console.error('🌐 [DNSCache] Erreur vidage cache:', error);
      return {
        success: false,
        entriesCleared: 0,
      };
    }
  }

  /**
   * Obtient des statistiques sur le cache DNS
   */
  async getStats(): Promise<{
    enabled: boolean;
    entriesCount: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
    hitRate: number;
  }> {
    const settings = await CacheManager.getSettings();

    let oldestTimestamp = Infinity;
    let newestTimestamp = 0;

    for (const entry of this.memoryCache.values()) {
      oldestTimestamp = Math.min(oldestTimestamp, entry.timestamp);
      newestTimestamp = Math.max(newestTimestamp, entry.timestamp);
    }

    return {
      enabled: settings.dnsCacheEnabled,
      entriesCount: this.memoryCache.size,
      oldestEntry: oldestTimestamp < Infinity ? new Date(oldestTimestamp) : null,
      newestEntry: newestTimestamp > 0 ? new Date(newestTimestamp) : null,
      hitRate: 0, // À implémenter avec compteurs hits/misses
    };
  }

  /**
   * Pré-cache des hostnames connus (utile pour l'initialisation)
   * ⚡ OPTIMISÉ: Batch insert sans sauvegardes individuelles
   */
  async precache(hostnameIPMap: Record<string, string>): Promise<void> {
    const settings = await CacheManager.getSettings();
    if (!settings.dnsCacheEnabled) {
      return;
    }

    for (const [hostname, ip] of Object.entries(hostnameIPMap)) {
      const entry: DNSCacheEntry = {
        hostname,
        ip,
        timestamp: Date.now(),
        ttl: this.DEFAULT_TTL_MS,
      };
      this.memoryCache.set(hostname, entry);
    }

    this.isDirty = true;
    console.log(`🌐 [DNSCache] ${Object.keys(hostnameIPMap).length} entrées pré-cachées`);

    // ⚡ Une seule sauvegarde à la fin
    await this.saveCacheToStorage();
  }

  /**
   * Liste toutes les entrées du cache (debug)
   */
  listCache(): DNSCacheEntry[] {
    return Array.from(this.memoryCache.values());
  }
}

export default new DNSCacheService();
