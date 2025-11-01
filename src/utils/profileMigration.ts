/**
 * 🔄 Script de Migration - Nettoyage Profils
 * Utilitaires de nettoyage et vérification d'intégrité des profils
 *
 * Note: Système owner supprimé - tous les profils sont égaux (avec PIN parental global)
 */

import ProfileService from '../services/ProfileService';
import type {Profile} from '../types';

/**
 * Nettoyer les anciennes propriétés owner (migration legacy)
 * Supprime la propriété isOwner des anciens profils
 */
export const cleanupLegacyOwnerProperty = async (): Promise<void> => {
  try {
    console.log('🧹 [Cleanup] Nettoyage propriété owner legacy...');

    const profiles = await ProfileService.getAllProfiles();
    let cleanedCount = 0;

    for (const profile of profiles) {
      // Supprimer isOwner si présent (legacy)
      if ('isOwner' in profile) {
        const {isOwner, ...cleanProfile} = profile as any;
        await ProfileService.updateProfile(profile.id, cleanProfile);
        cleanedCount++;
        console.log(`  ✓ Propriété owner supprimée du profil "${profile.name}"`);
      }
    }

    if (cleanedCount > 0) {
      console.log(`✅ [Cleanup] ${cleanedCount} profil(s) nettoyé(s)`);
    } else {
      console.log('✅ [Cleanup] Aucun nettoyage nécessaire');
    }
  } catch (error) {
    console.error('❌ [Cleanup] Erreur nettoyage:', error);
  }
};

/**
 * Vérifier l'intégrité des profils
 * S'assure qu'il n'y a pas de données corrompues
 */
export const verifyProfileIntegrity = async (): Promise<boolean> => {
  try {
    const profiles = await ProfileService.getAllProfiles();

    if (profiles.length === 0) {
      console.log('✅ [Integrity] Aucun profil, pas de vérification nécessaire');
      return true;
    }

    let hasIssues = false;

    for (const profile of profiles) {
      // Vérifier les champs obligatoires
      if (!profile.id || !profile.name || !profile.createdAt) {
        console.error(`⚠️ [Integrity] Profil invalide détecté: ${JSON.stringify(profile)}`);
        hasIssues = true;
      }

      // Vérifier que requiresPinToAccess est cohérent
      if (profile.requiresPinToAccess && !profile.isKids) {
        console.warn(`⚠️ [Integrity] Profil "${profile.name}" a requiresPinToAccess mais n'est pas enfant`);
      }
    }

    if (!hasIssues) {
      console.log(`✅ [Integrity] ${profiles.length} profil(s) vérifiés - Aucun problème détecté`);
    }

    return !hasIssues;
  } catch (error) {
    console.error('❌ [Integrity] Erreur vérification intégrité:', error);
    return false;
  }
};

/**
 * Migration complète - À exécuter au démarrage de l'app
 * Nettoie les anciennes propriétés owner et vérifie l'intégrité
 */
export const runFullMigration = async (): Promise<void> => {
  console.log('🚀 [Migration] Démarrage migration/nettoyage profils...');

  try {
    // Étape 1: Nettoyer anciennes propriétés owner (legacy)
    await cleanupLegacyOwnerProperty();

    // Étape 2: Vérifier l'intégrité des profils
    const isValid = await verifyProfileIntegrity();

    if (!isValid) {
      console.warn('⚠️ [Migration] Problèmes d\'intégrité détectés - vérifiez les logs');
    }

    console.log('✅ [Migration] Migration/nettoyage terminé');
  } catch (error) {
    console.error('❌ [Migration] Erreur durant la migration:', error);
    // Ne pas bloquer l'app
  }
};

export default {
  cleanupLegacyOwnerProperty,
  verifyProfileIntegrity,
  runFullMigration,
};
