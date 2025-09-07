/**
 * 🏗️ Service Container - Dependency Injection pour React Native
 * Architecture moderne pour remplacer les singletons
 */

export type ServiceConstructor<T = any> = new (...args: any[]) => T;
export type ServiceFactory<T = any> = (...args: any[]) => T | Promise<T>;

export interface ServiceDefinition<T = any> {
  factory: ServiceFactory<T>;
  dependencies?: string[];
  singleton?: boolean;
  lazy?: boolean;
}

export interface IServiceContainer {
  register<T>(name: string, definition: ServiceDefinition<T>): void;
  get<T>(name: string): Promise<T>;
  has(name: string): boolean;
  clearCache(): void;
}

/**
 * Conteneur de services moderne avec injection de dépendances
 * Remplace les singletons par une architecture DI flexible
 */
export class ServiceContainer implements IServiceContainer {
  private services = new Map<string, ServiceDefinition>();
  private instances = new Map<string, any>();
  private resolutionStack = new Set<string>();

  /**
   * Enregistre un service avec ses dépendances
   */
  register<T>(name: string, definition: ServiceDefinition<T>): void {
    this.services.set(name, {
      singleton: true, // Par défaut singleton
      lazy: true, // Par défaut lazy loading
      ...definition,
    });
  }

  /**
   * Résout et retourne une instance de service
   */
  async get<T>(name: string): Promise<T> {
    // Vérification des dépendances circulaires
    if (this.resolutionStack.has(name)) {
      throw new Error(
        `Circular dependency detected: ${Array.from(this.resolutionStack).join(
          ' → ',
        )} → ${name}`,
      );
    }

    // Retourne l'instance existante si singleton
    if (this.instances.has(name)) {
      return this.instances.get(name);
    }

    const definition = this.services.get(name);
    if (!definition) {
      throw new Error(`Service '${name}' not registered`);
    }

    this.resolutionStack.add(name);

    try {
      // Résout les dépendances d'abord
      const dependencies = await this.resolveDependencies(
        definition.dependencies || [],
      );

      // Crée l'instance
      const instance = await definition.factory(...dependencies);

      // Cache si singleton
      if (definition.singleton) {
        this.instances.set(name, instance);
      }

      return instance;
    } finally {
      this.resolutionStack.delete(name);
    }
  }

  /**
   * Vérifie si un service est enregistré
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Vide le cache des instances
   */
  clearCache(): void {
    this.instances.clear();
  }

  /**
   * Résout récursivement les dépendances
   */
  private async resolveDependencies(dependencies: string[]): Promise<any[]> {
    const resolved = [];

    for (const dep of dependencies) {
      const instance = await this.get(dep);
      resolved.push(instance);
    }

    return resolved;
  }
}

/**
 * Instance globale du conteneur de services
 * Point d'entrée unique pour l'injection de dépendances
 */
export const container = new ServiceContainer();

/**
 * Décorateur pour l'injection automatique de dépendances
 */
export function Injectable(name: string, dependencies: string[] = []) {
  return function <T extends ServiceConstructor>(target: T) {
    container.register(name, {
      factory: (...deps) => new target(...deps),
      dependencies,
      singleton: true,
      lazy: true,
    });
    return target;
  };
}

/**
 * Hook React pour utiliser les services
 */
export function useService<T>(serviceName: string): T | null {
  const [service, setService] = React.useState<T | null>(null);

  React.useEffect(() => {
    container.get<T>(serviceName).then(setService).catch(console.error);
  }, [serviceName]);

  return service;
}

// Import React pour le hook
import React from 'react';
