/**
 * Script pour vider le cache EPG et tester le vrai 1er démarrage TiviMate
 */

import { EPGCacheManager } from './src/services/epg/EPGCacheManager';

export const clearEPGCache = async () => {
  try {
    console.log('🗑️ [DEBUG] Vidage du cache EPG...');
    await EPGCacheManager.clearCache();
    console.log('✅ [DEBUG] Cache EPG vidé - Redémarrez l\'app pour tester le 1er démarrage TiviMate');
  } catch (error) {
    console.error('❌ [DEBUG] Erreur vidage cache:', error);
  }
};

// Exposer globalement pour usage dans Metro console
global.clearEPGCache = clearEPGCache;

console.log('🔧 [DEBUG] Fonction clearEPGCache() disponible dans la console');