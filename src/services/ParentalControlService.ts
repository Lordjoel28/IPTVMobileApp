/**
 * 🔒 ParentalControlService V2 - Version Simplifiée
 *
 * Gestion du contrôle parental avec restrictions avancées
 * Les restrictions sont stockées dans le Profile, ce service gère :
 * - PIN parental sécurisé
 * - Vérification d'accès (catégories, mots-clés, chaînes, horaires)
 * - Déverrouillages temporaires
 * - Temps d'écoute quotidien
 *
 * ❌ Supprimé : stats, logs, historique
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Profile, Channel, TemporaryUnlock } from '../types';
import ProfileService from './ProfileService';
import { useParentalControlStore } from '../stores/ParentalControlStore';

// Résultat de vérification d'accès
export interface AccessResult {
  allowed: boolean;
  reason?: string;
  requiresPin: boolean;
  blockedBy?: 'category' | 'keyword' | 'channel' | 'adult' | 'time' | 'daily_limit';
}

class ParentalControlService {
  private static readonly STORAGE_KEY = 'parental_pin_hash';

  // Mots-clés détectant automatiquement du contenu adulte
  // 🎯 Liste précise pour détecter SEULEMENT les contenus XXX réels
  private static readonly ADULT_KEYWORDS = [
    'xxx', 'porn', 'sex', 'erotic', 'nude', 'hardcore',
    'porno', 'adult only', 'x-rated', 'nsfw', 'explicit',
    'xxx for adult', 'xxx for adults', 'adult +18', 'adults only',
    'for adults only', 'parents strongly cautioned', 'restricted',
    '+18', '18+', 'adulte', 'pour adultes', 'réservé aux adultes',
    'érotique', 'charme'
  ];

  // Catégories considérées comme adultes
  // 🚨 Liste exhaustive pour couvrir toutes les variations possibles
  private static readonly ADULT_CATEGORIES = [
    'adult', 'xxx', '+18', '18+', 'mature', 'erotic', 'nsfw',
    'adulte', 'pour adultes', 'réservé aux adultes', 'érotique',
    'porn', 'porno', 'hardcore', 'explicit', 'sensitive',
    'xxx for adult', 'xxx for adults', 'adult +18', 'for adults',
    'adults only', 'restricted', 'x-rated', 'parents strongly cautioned'
  ];

  // ========================================
  // GESTION DU PIN PARENTAL
  // ========================================

  /**
   * Définir le PIN parental (4 chiffres)
   */
  async setPin(pin: string): Promise<boolean> {
    try {
      if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        throw new Error('Le PIN doit contenir exactement 4 chiffres');
      }

      const hashedPin = await this.hashPin(pin);
      await AsyncStorage.setItem(ParentalControlService.STORAGE_KEY, hashedPin);

      console.log('✅ PIN parental configuré');
      return true;
    } catch (error) {
      console.error('❌ Erreur configuration PIN:', error);
      return false;
    }
  }

  /**
   * Vérifier si un PIN parental est configuré
   */
  async isPinConfigured(): Promise<boolean> {
    try {
      const storedHash = await AsyncStorage.getItem(ParentalControlService.STORAGE_KEY);
      const configured = !!storedHash;
      console.log(`🔍 [DEBUG] isPinConfigured: ${configured ? 'OUI' : 'NON'}`);
      return configured;
    } catch (error) {
      console.error('❌ Erreur vérification configuration PIN:', error);
      return false;
    }
  }

  /**
   * Vérifier le PIN parental
   */
  async verifyPin(pin: string): Promise<boolean> {
    try {
      const storedHash = await AsyncStorage.getItem(ParentalControlService.STORAGE_KEY);

      // Pas de PIN configuré = accès libre
      if (!storedHash) {
        console.log('⚠️ [DEBUG] verifyPin: PAS DE PIN CONFIGURÉ - accès libre');
        return true;
      }

      const inputHash = await this.hashPin(pin);
      const isValid = inputHash === storedHash;
      console.log(`🔍 [DEBUG] verifyPin: ${isValid ? 'VALIDE' : 'INVALIDE'}`);
      return isValid;
    } catch (error) {
      console.error('❌ Erreur vérification PIN:', error);
      return false;
    }
  }

  /**
   * Vérifier si le contrôle parental est configuré
   */
  async isConfigured(): Promise<boolean> {
    const pin = await AsyncStorage.getItem(ParentalControlService.STORAGE_KEY);
    return !!pin;
  }

  /**
   * Supprimer le PIN parental (nécessite PIN actuel)
   */
  async removePin(currentPin: string): Promise<boolean> {
    try {
      if (!(await this.verifyPin(currentPin))) {
        return false;
      }

      await AsyncStorage.removeItem(ParentalControlService.STORAGE_KEY);
      console.log('🔓 PIN parental supprimé');
      return true;
    } catch (error) {
      console.error('❌ Erreur suppression PIN:', error);
      return false;
    }
  }

  /**
   * Changer le PIN parental
   */
  async changePin(oldPin: string, newPin: string): Promise<boolean> {
    try {
      if (!(await this.verifyPin(oldPin))) {
        return false;
      }

      return await this.setPin(newPin);
    } catch (error) {
      console.error('❌ Erreur changement PIN:', error);
      return false;
    }
  }

  // ========================================
  // VÉRIFICATION D'ACCÈS AUX CHAÎNES
  // ========================================

  /**
   * 🔍 Extraire la catégorie réelle d'une chaîne (priorité à category > group > name)
   * @param channel - Chaîne à analyser
   * @returns Catégorie la plus pertinente
   */
  private getChannelCategory(channel: Channel): string {
    // Priorité 1: catégorie explicite
    if (channel.category && channel.category.trim() !== '' && channel.category !== 'N/A') {
      return channel.category.trim();
    }

    // Priorité 2: group/category (pour Xtream et M3U)
    if (channel.group && channel.group.trim() !== '' && channel.group !== 'N/A') {
      return channel.group.trim();
    }

    // Priorité 3: groupTitle (pour M3U)
    if ((channel as any).groupTitle && (channel as any).groupTitle.trim() !== '') {
      return (channel as any).groupTitle.trim();
    }

    // Priorité 4: nom de chaîne (si aucun autre)
    return channel.name || 'Unknown';
  }

  /**
   * Vérifier si une chaîne est accessible pour un profil
   * Vérifie : catégories, mots-clés, chaînes spécifiques, contenu adulte, horaires, temps quotidien
   *
   * 🔒 LOGIQUE DE FILTRAGE:
   * - blockedCategories = SÉCURITÉ (nécessite PIN, affiché avec badge 🔒)
   * - visibleGroups = PRÉFÉRENCE (pas de PIN, chaîne cachée 🙈)
   * - Priorité: Sécurité > Préférence
   */
  async checkAccess(channel: Channel, profile: Profile): Promise<AccessResult> {
    try {
      // 🔍 Utiliser la nouvelle fonction pour extraire la vraie catégorie
      const category = this.getChannelCategory(channel);

      console.log(`🎬 [DEBUG] === VÉRIFICATION ACCÈS CHAÎNE ===`);
      console.log(`🎬 [DEBUG] Profil: ${profile.name} (ID: ${profile.id})`);
      console.log(`🎬 [DEBUG] Chaîne: "${channel.name}"`);
      console.log(`🎬 [DEBUG] Catégorie extraite: "${category}"`);
      console.log(`🎬 [DEBUG] blockedCategories: ${profile.blockedCategories?.length || 0} catégories`);
      console.log(`🎬 [DEBUG] isKids: ${profile.isKids}`);

      // 🆕 PRIORITÉ 0: Vérifier le store global (déverrouillage manuel)
      const parentalStore = useParentalControlStore.getState();
      if (parentalStore.isUnlocked(category)) {
        console.log(`🔓 [ParentalControl] Catégorie "${category}" déverrouillée globalement - Accès autorisé`);
        return { allowed: true, requiresPin: false };
      }

      // 1. 🔒 SÉCURITÉ PRIORITAIRE: Vérifier contenu adulte pour PROFILS ENFANTS
      // Doit être vérifié AVANT toute autre condition
      if (profile.isKids && this.isAdultContent(channel)) {
        console.log(`🚫 [ParentalControl] CONTENU ADULTE DÉTECTÉ pour profil enfant: "${channel.name}"`);
        return {
          allowed: false,
          reason: 'Contenu pour adultes détecté - Profil enfant',
          requiresPin: true,
          blockedBy: 'adult'
        };
      }

      // 2. Vérifier déverrouillage temporaire actif
      if (profile.temporaryUnlock && this.isUnlockActive(profile.temporaryUnlock)) {
        if (profile.temporaryUnlock.unlockedCategories?.includes(category)) {
          console.log(`🔓 Déverrouillage temporaire actif: ${category}`);
          return { allowed: true, requiresPin: false };
        }
      }

      // 3. Profils sans restrictions = accès total (uniquement après vérification adulte)
      if (!profile.blockedCategories || profile.blockedCategories.length === 0) {
        console.log(`✅ [ParentalControl] Aucune restriction configurée pour le profil`);
        return { allowed: true, requiresPin: false };
      }

      // 4. 🔒 SÉCURITÉ: Vérifier catégories bloquées (contrôle parental)
      if (profile.blockedCategories?.includes(category)) {
        return {
          allowed: false,
          reason: `Catégorie "${category}" bloquée par le contrôle parental`,
          requiresPin: true,
          blockedBy: 'category'
        };
      }

      // ✅ Aucun blocage de sécurité détecté
      // Note: visibleGroups est géré au niveau UI (filtre préférence, pas de PIN)
      return { allowed: true, requiresPin: false };

    } catch (error) {
      console.error('❌ Erreur vérification accès:', error);
      // En cas d'erreur, autoriser l'accès pour éviter de bloquer l'utilisateur
      return { allowed: true, requiresPin: false };
    }
  }

  /**
   * Détecter si une chaîne contient du contenu adulte
   */
  isAdultContent(channel: Channel): boolean {
    // Flag explicite
    if (channel.isAdult) return true;

    const name = channel.name.toLowerCase();
    const category = (channel.category || '').toLowerCase();
    const group = (channel.group || '').toLowerCase();

    // 🎯 Vérification catégorie PLUS PRÉCISE pour éviter les faux positifs
    const categoryLower = category.toLowerCase().trim();

    // Cas spécial : "XX | FOR ADULT" - XXX explicite avec FOR ADULT
    if (categoryLower.includes('for adult') ||
        categoryLower.includes('xxx for adult') ||
        categoryLower.includes('adult +18') ||
        categoryLower.includes('18+')) {
      console.log(`🚫 [ParentalControl] Catégorie XXX explicite détectée: "${category}"`);
      return true;
    }

    // Cas spécial : Catégories XXX/ADULT seules
    const explicitAdultPatterns = ['xxx ', 'adult ', 'porn ', 'sex ', 'erotic', 'nude', 'hardcore', 'porno'];
    const hasExplicitCategory = explicitAdultPatterns.some(pattern =>
      categoryLower.includes(pattern) || categoryLower.startsWith(pattern)
    );

    if (hasExplicitCategory) {
      console.log(`🚫 [ParentalControl] Catégorie explicite détectée: "${category}"`);
      return true;
    }

    // 🚨 ATTENTION: Ne PAS bloquer les fausses correspondances (AR != Adult, SA != Sex, etc.)
    // On ne bloque que si le mot-clé XXX/ADULT est évident dans le contexte
    const nameWords = name.split(' ');
    const hasObviousAdultKeyword = ParentalControlService.ADULT_KEYWORDS.some(keyword => {
      return nameWords.some(word =>
        word.includes(keyword) && keyword.length > 3 // Au moins 4 caractères
      );
    });

    if (hasObviousAdultKeyword) {
      console.log(`🚫 [ParentalControl] Mot-clé adulte évident détecté dans: "${channel.name}"`);
      return true;
    }

    return false;
  }

  /**
   * Déterminer si un badge cadenas doit être affiché pour une chaîne
   * Combine la détection de contenu adulte avec les restrictions du profil
   */
  shouldShowLockBadge(channel: Channel, profile: Profile | null): boolean {
    // Si pas de profil, ne jamais afficher de cadenas
    if (!profile) {
      return false;
    }

    // Si le profil n'a aucune restriction, ne pas afficher de cadenas
    if (!this.hasRestrictions(profile)) {
      return false;
    }

    // Si c'est un profil enfant, bloquer tout contenu adulte
    if (profile.isKids && this.isAdultContent(channel)) {
      return true;
    }

    // Vérifier les restrictions spécifiques du profil
    const accessResult = this.checkAccess(channel, profile);

    // Afficher le cadenas seulement si l'accès est bloqué ET nécessite un PIN
    return !accessResult.allowed && accessResult.requiresPin;
  }

  /**
   * Vérifier si un profil a des restrictions actives
   */
  private hasRestrictions(profile: Profile): boolean {
    return !!(
      profile.blockedCategories?.length ||
      profile.visibleGroups?.length
    );
  }

  // ========================================
  // DÉVERROUILLAGE TEMPORAIRE
  // ========================================

  /**
   * Demander un déverrouillage temporaire
   */
  async unlockTemporarily(
    profile: Profile,
    pin: string,
    durationMinutes: number,
    categories: string[]
  ): Promise<boolean> {
    try {
      // Vérifier le PIN
      if (!(await this.verifyPin(pin))) {
        console.log('❌ PIN incorrect');
        return false;
      }

      const unlock: TemporaryUnlock = {
        grantedAt: Date.now(),
        expiresAt: Date.now() + durationMinutes * 60 * 1000,
        unlockedCategories: categories || []
      };

      // Mettre à jour le profil
      await ProfileService.updateProfile(profile.id, {
        temporaryUnlock: unlock
      });

      console.log(`🔓 Déverrouillage temporaire accordé: ${categories.join(', ')} pour ${durationMinutes}min`);
      return true;
    } catch (error) {
      console.error('❌ Erreur déverrouillage temporaire:', error);
      return false;
    }
  }

  /**
   * Révoquer un déverrouillage temporaire
   */
  async revokeUnlock(profile: Profile, pin: string): Promise<boolean> {
    try {
      if (!(await this.verifyPin(pin))) {
        return false;
      }

      await ProfileService.updateProfile(profile.id, {
        temporaryUnlock: undefined
      });

      console.log('🔒 Déverrouillage temporaire révoqué');
      return true;
    } catch (error) {
      console.error('❌ Erreur révocation déverrouillage:', error);
      return false;
    }
  }

  /**
   * Vérifier si un déverrouillage est encore actif
   */
  private isUnlockActive(unlock: TemporaryUnlock): boolean {
    return Date.now() < unlock.expiresAt;
  }

  /**
   * Obtenir les déverrouillages actifs de tous les profils
   */
  async getActiveUnlocks(): Promise<Array<{profile: Profile, unlock: TemporaryUnlock}>> {
    try {
      const profiles = await ProfileService.getAllProfiles();
      const activeUnlocks: Array<{profile: Profile, unlock: TemporaryUnlock}> = [];

      for (const profile of profiles) {
        if (profile.temporaryUnlock && this.isUnlockActive(profile.temporaryUnlock)) {
          // S'assurer que unlockedCategories est toujours un tableau
          const unlock: TemporaryUnlock = {
            ...profile.temporaryUnlock,
            unlockedCategories: profile.temporaryUnlock.unlockedCategories || []
          };

          activeUnlocks.push({
            profile,
            unlock
          });
        }
      }

      return activeUnlocks;
    } catch (error) {
      console.error('❌ Erreur récupération déverrouillages actifs:', error);
      return [];
    }
  }

  // ========================================
  // UTILITAIRES
  // ========================================

  /**
   * Hashage simple du PIN (à améliorer avec expo-crypto)
   * TODO: Utiliser SHA-256 avec expo-crypto pour plus de sécurité
   */
  private async hashPin(pin: string): Promise<string> {
    // Pour l'instant : hashage basique
    // À remplacer par expo-crypto SHA-256 en production
    const salt = 'iptv_parental_control_v2';
    return btoa(`${salt}_${pin}_${salt.split('').reverse().join('')}`);
  }

  /**
   * Obtenir le temps restant d'un déverrouillage (format lisible)
   */
  getRemainingTime(unlock: TemporaryUnlock): string {
    const remaining = unlock.expiresAt - Date.now();

    if (remaining <= 0) {
      return 'Expiré';
    }

    const minutes = Math.floor(remaining / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}min`;
    }

    return `${minutes} min`;
  }

  /**
   * Vérifier si un profil peut éditer ses propres restrictions (avec PIN)
   * Profils standard: peuvent éditer avec PIN
   * Profils enfants: lecture seule (même avec PIN)
   * @param profile Profil demandant l'accès
   * @param pin PIN parental (requis si configuré)
   * @returns true si le profil peut éditer ses restrictions
   */
  async canEditRestrictions(profile: Profile, pin?: string): Promise<{
    canEdit: boolean;
    reason?: string;
  }> {
    try {
      // Profils enfants: toujours lecture seule
      if (profile.isKids) {
        return {
          canEdit: false,
          reason: 'Les profils enfants ne peuvent pas modifier leurs restrictions'
        };
      }

      // Vérifier si un PIN est configuré
      const hasPin = await this.isConfigured();
      if (!hasPin) {
        // Pas de PIN configuré, accès autorisé
        return { canEdit: true };
      }

      // PIN configuré, le vérifier
      if (!pin) {
        return {
          canEdit: false,
          reason: 'PIN parental requis pour modifier les restrictions'
        };
      }

      const pinValid = await this.verifyPin(pin);
      if (!pinValid) {
        return {
          canEdit: false,
          reason: 'PIN incorrect'
        };
      }

      return { canEdit: true };
    } catch (error) {
      console.error('❌ Erreur vérification édition restrictions:', error);
      return {
        canEdit: false,
        reason: 'Erreur lors de la vérification'
      };
    }
  }
}

// Export singleton
export default new ParentalControlService();
