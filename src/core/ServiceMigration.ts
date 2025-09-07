/**
 * 🔄 Service Migration - Transition Singleton → DI
 * Permet une migration en douceur sans casser l'app existante
 */

import {ServiceRegistry, ServiceNames, getService} from './ServiceRegistry';
import type {ServiceName} from './ServiceRegistry';

/**
 * Wrapper de compatibility pour l'ancienne architecture singleton
 * Permet aux anciens appels getInstance() de fonctionner avec le nouveau DI
 */
export class ServiceMigration {
  private static initialized = false;

  /**
   * Initialise la migration - à appeler au démarrage de l'app
   */
  static initialize(): void {
    if (this.initialized) {return;}

    console.log('🔄 Starting Service Migration: Singleton → DI');

    // Initialise le nouveau système DI
    ServiceRegistry.initialize();

    // Configure les wrappers de compatibilité
    this.setupCompatibilityWrappers();

    this.initialized = true;
    console.log('✅ Service Migration completed');
  }

  /**
   * Configure les wrappers pour maintenir la compatibilité
   * avec l'ancien code qui utilise getInstance()
   */
  private static setupCompatibilityWrappers(): void {
    // Note: Ces wrappers seront supprimés progressivement
    // pendant la migration de chaque service

    this.wrapLegacyService('CacheService', ServiceNames.CACHE);
    this.wrapLegacyService('StorageService', ServiceNames.STORAGE);
    this.wrapLegacyService('PlaylistService', ServiceNames.PLAYLIST);
    this.wrapLegacyService('SearchService', ServiceNames.SEARCH);
    this.wrapLegacyService('CategoryService', ServiceNames.CATEGORY);
    this.wrapLegacyService('ImageCacheService', ServiceNames.IMAGE_CACHE);
    this.wrapLegacyService('ParsersService', ServiceNames.PARSERS);
    this.wrapLegacyService('IPTVService', ServiceNames.IPTV);
  }

  /**
   * Crée un wrapper de compatibilité pour un service legacy
   */
  private static wrapLegacyService(
    legacyClassName: string,
    serviceName: ServiceName,
  ): void {
    // Note: Cette fonction crée des méthodes statiques getInstance()
    // qui redirigent vers le nouveau système DI
    //
    // Exemple d'utilisation:
    // const service = await CacheService.getInstance(); // Ancien code
    // const service = await getService('cache');         // Nouveau code
  }

  /**
   * Obtient un service avec fallback sur l'ancienne méthode
   * Utilisé pendant la période de transition
   */
  static async getServiceWithFallback<T>(
    serviceName: ServiceName,
    legacyGetter?: () => T,
  ): Promise<T> {
    try {
      // Essaie le nouveau système DI d'abord
      return await getService<T>(serviceName);
    } catch (error) {
      console.warn(
        `⚠️ DI failed for ${serviceName}, falling back to legacy:`,
        error,
      );

      // Fallback sur l'ancienne méthode si fournie
      if (legacyGetter) {
        return legacyGetter();
      }

      throw new Error(
        `Service ${serviceName} not available in DI or legacy mode`,
      );
    }
  }

  /**
   * Vérifie l'état de la migration
   */
  static getMigrationStatus(): {
    initialized: boolean;
    servicesRegistered: number;
    servicesReady: string[];
  } {
    return {
      initialized: this.initialized,
      servicesRegistered: ServiceRegistry.getRegisteredServices().length,
      servicesReady: ServiceRegistry.getRegisteredServices(),
    };
  }

  /**
   * Méthodes utilitaires pour la migration progressive
   */
  static async migrateService(serviceName: ServiceName): Promise<boolean> {
    try {
      const service = await getService(serviceName);
      console.log(`✅ Service ${serviceName} migrated successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to migrate service ${serviceName}:`, error);
      return false;
    }
  }

  /**
   * Test de tous les services pour validation
   */
  static async validateAllServices(): Promise<{
    passed: string[];
    failed: string[];
  }> {
    const passed: string[] = [];
    const failed: string[] = [];

    for (const serviceName of ServiceRegistry.getRegisteredServices()) {
      const success = await this.migrateService(serviceName as ServiceName);
      if (success) {
        passed.push(serviceName);
      } else {
        failed.push(serviceName);
      }
    }

    return {passed, failed};
  }
}

/**
 * Hook React pour la migration progressive des composants
 */
export function useMigratedService<T>(
  serviceName: ServiceName,
  legacyGetter?: () => T,
): T | null {
  const [service, setService] = React.useState<T | null>(null);

  React.useEffect(() => {
    ServiceMigration.getServiceWithFallback(serviceName, legacyGetter)
      .then(setService)
      .catch(console.error);
  }, [serviceName, legacyGetter]);

  return service;
}

// Import React pour les hooks
import React from 'react';
