/**
 * 📋 Service Registry - Enregistrement centralisé des services
 * Configuration DI pour tous les services de l'application
 */

import {container} from './ServiceContainer';

// Imports des services existants
import {CacheService} from '../services/CacheService';
import {StorageService} from '../services/StorageService';
import {PlaylistService} from '../services/PlaylistService';
import {SearchService} from '../services/SearchService';
import {CategoryService} from '../services/CategoryService';
import {ImageCacheService} from '../services/ImageCacheService';
import {ParsersService} from '../services/ParsersService';
import {IPTVService} from '../services/IPTVService';
import {UserManager} from '../services/users/UserManager';
import {SearchManager} from '../services/search/SearchManager';

/**
 * Noms des services pour l'injection de dépendances
 */
export const ServiceNames = {
  // Services de base
  STORAGE: 'storage',
  CACHE: 'cache',
  IMAGE_CACHE: 'imageCache',

  // Services métier
  PLAYLIST: 'playlist',
  SEARCH: 'search',
  CATEGORY: 'category',
  PARSERS: 'parsers',
  IPTV: 'iptv',

  // Managers
  USER_MANAGER: 'userManager',
  SEARCH_MANAGER: 'searchManager',
} as const;

export type ServiceName = (typeof ServiceNames)[keyof typeof ServiceNames];

/**
 * Configuration du Service Registry
 * Enregistre tous les services avec leurs dépendances
 */
export class ServiceRegistry {
  /**
   * Initialise tous les services dans l'ordre des dépendances
   */
  static initialize(): void {
    console.log('🏗️ Initializing Service Registry with DI...');

    // 1. Services de base (sans dépendances)
    this.registerBaseServices();

    // 2. Services métier (avec dépendances sur les services de base)
    this.registerBusinessServices();

    // 3. Managers complexes (avec dépendances multiples)
    this.registerManagerServices();

    console.log(
      '✅ Service Registry initialized with',
      container.has.length,
      'services',
    );
  }

  /**
   * Services de base - Niveau 1 (pas de dépendances externes)
   */
  private static registerBaseServices(): void {
    // Storage Service - Service fondamental (Migré vers DI)
    container.register(ServiceNames.STORAGE, {
      factory: () => StorageService.createFromDI(),
      singleton: true,
      lazy: true,
    });

    // Cache Service - Dépend du Storage
    container.register(ServiceNames.CACHE, {
      factory: storage => CacheService.createFromDI(),
      dependencies: [ServiceNames.STORAGE],
      singleton: true,
      lazy: true,
    });

    // Image Cache Service - Dépend du Cache
    container.register(ServiceNames.IMAGE_CACHE, {
      factory: cache => ImageCacheService.createFromDI(),
      dependencies: [ServiceNames.CACHE],
      singleton: true,
      lazy: true,
    });
  }

  /**
   * Services métier - Niveau 2 (dépendent des services de base)
   */
  private static registerBusinessServices(): void {
    // Parsers Service - Pour parser les M3U
    container.register(ServiceNames.PARSERS, {
      factory: cache => ParsersService.createFromDI(),
      dependencies: [ServiceNames.CACHE],
      singleton: true,
      lazy: true,
    });

    // Category Service - Gestion des catégories
    container.register(ServiceNames.CATEGORY, {
      factory: storage => CategoryService.createFromDI(),
      dependencies: [ServiceNames.STORAGE],
      singleton: true,
      lazy: true,
    });

    // Playlist Service - Gestion des playlists
    container.register(ServiceNames.PLAYLIST, {
      factory: (storage, parsers) => PlaylistService.createFromDI(),
      dependencies: [ServiceNames.STORAGE, ServiceNames.PARSERS],
      singleton: true,
      lazy: true,
    });

    // Search Service - Recherche de base
    container.register(ServiceNames.SEARCH, {
      factory: cache => SearchService.createFromDI(),
      dependencies: [ServiceNames.CACHE],
      singleton: true,
      lazy: true,
    });

    // IPTV Service - Service principal IPTV
    container.register(ServiceNames.IPTV, {
      factory: (playlist, search, category) => IPTVService.createFromDI(),
      dependencies: [
        ServiceNames.PLAYLIST,
        ServiceNames.SEARCH,
        ServiceNames.CATEGORY,
      ],
      singleton: true,
      lazy: true,
    });
  }

  /**
   * Managers complexes - Niveau 3 (dépendances multiples)
   */
  private static registerManagerServices(): void {
    // User Manager - Gestion des utilisateurs
    container.register(ServiceNames.USER_MANAGER, {
      factory: storage => UserManager.createFromDI(),
      dependencies: [ServiceNames.STORAGE],
      singleton: true,
      lazy: true,
    });

    // Search Manager - Recherche avancée
    container.register(ServiceNames.SEARCH_MANAGER, {
      factory: (search, cache) => SearchManager.createFromDI(),
      dependencies: [ServiceNames.SEARCH, ServiceNames.CACHE],
      singleton: true,
      lazy: true,
    });
  }

  /**
   * Obtient un service par son nom
   */
  static async getService<T>(name: ServiceName): Promise<T> {
    return container.get<T>(name);
  }

  /**
   * Vérifie si un service est enregistré
   */
  static hasService(name: ServiceName): boolean {
    return container.has(name);
  }

  /**
   * Recharge tous les services (pour le debug)
   */
  static reload(): void {
    container.clearCache();
    this.initialize();
  }

  /**
   * Obtient la liste de tous les services enregistrés
   */
  static getRegisteredServices(): string[] {
    return Object.values(ServiceNames);
  }
}

/**
 * Fonction utilitaire pour obtenir un service
 */
export const getService = ServiceRegistry.getService;

/**
 * Hook React optimisé pour les services
 */
export function useRegistryService<T>(serviceName: ServiceName): T | null {
  return useService<T>(serviceName);
}

// Import du hook depuis ServiceContainer
import {useService} from './ServiceContainer';
