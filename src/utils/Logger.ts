/**
 * 📝 Logger optimisé pour performance
 * Désactive les logs debug en production pour éviter la pollution console
 */

const isDebugMode = __DEV__; // true en développement, false en production

const Logger = {
  log: (message: string, ...args: any[]) => {
    if (isDebugMode) {
      console.log(message, ...args);
    }
  },

  warn: (message: string, ...args: any[]) => {
    if (isDebugMode) {
      console.warn(message, ...args);
    }
  },

  error: (message: string, ...args: any[]) => {
    // Les erreurs sont toujours affichées
    console.error(message, ...args);
  },

  performance: (message: string, ...args: any[]) => {
    // Logs performance toujours affichés (même en production)
    console.log(message, ...args);
  }
};

export default Logger;