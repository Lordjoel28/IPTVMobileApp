/**
 * 🏗️ Core Architecture Index
 * Point d'entrée pour le système d'injection de dépendances
 */

// Service Container (DI Engine)
export { 
  ServiceContainer, 
  container, 
  Injectable, 
  useService 
} from './ServiceContainer';

export type { 
  IServiceContainer, 
  ServiceDefinition, 
  ServiceConstructor, 
  ServiceFactory 
} from './ServiceContainer';

// Service Registry (Configuration centralisée)
export { 
  ServiceRegistry, 
  ServiceNames, 
  getService, 
  useRegistryService 
} from './ServiceRegistry';

export type { ServiceName } from './ServiceRegistry';

// Service Migration (Compatibilité Singleton → DI)
export { 
  ServiceMigration, 
  useMigratedService 
} from './ServiceMigration';

/**
 * Initialisation rapide du système DI
 * À appeler dans App.tsx au démarrage
 */
export function initializeServiceArchitecture(): void {
  console.log('🏗️ Initializing Modern Service Architecture...');
  
  // Import ServiceMigration dynamiquement pour éviter les problèmes circulaires
  try {
    const { ServiceMigration: SM } = require('./ServiceMigration');
    SM.initialize();
    console.log('✅ Service Architecture ready');
  } catch (error) {
    console.error('❌ Failed to initialize Service Architecture:', error.message);
  }
}