/**
 * 👤 ProfileService - Gestion des profils utilisateur
 * Stockage dans AsyncStorage avec profil par défaut
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {Profile, ThemeType} from '../types';

const STORAGE_KEYS = {
  PROFILES: 'app_profiles',
  ACTIVE_PROFILE_ID: 'active_profile_id',
  ASK_ON_STARTUP: 'ask_profile_on_startup',
};

// Avatars disponibles (emojis) - Sélection étendue
export const AVAILABLE_AVATARS = [
  '👤',
  '👨',
  '👩',
  '👶',
  '👧',
  '👦',
  '🧓',
  '👴',
  '👵',
  '😊',
  '🙂',
  '😎',
  '🤓',
  '🧒',
  '👨‍💼',
];

// Limite maximale de profils
export const MAX_PROFILES = 10;

class ProfileService {
  /**
   * Obtenir tous les profils
   */
  async getAllProfiles(): Promise<Profile[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PROFILES);
      if (!data) {
        return [];
      }
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ Erreur lecture profils:', error);
      return [];
    }
  }

  /**
   * Obtenir un profil par ID
   */
  async getProfileById(id: string): Promise<Profile | null> {
    try {
      const profiles = await this.getAllProfiles();
      return profiles.find(p => p.id === id) || null;
    } catch (error) {
      console.error('❌ Erreur récupération profil:', error);
      return null;
    }
  }

  /**
   * Obtenir le profil actif
   */
  async getActiveProfile(): Promise<Profile | null> {
    try {
      const activeId = await AsyncStorage.getItem(
        STORAGE_KEYS.ACTIVE_PROFILE_ID,
      );
      if (!activeId) {
        return null;
      }
      return this.getProfileById(activeId);
    } catch (error) {
      console.error('❌ Erreur récupération profil actif:', error);
      return null;
    }
  }

  /**
   * Définir le profil actif
   */
  async setActiveProfile(id: string): Promise<void> {
    try {
      const profile = await this.getProfileById(id);
      if (!profile) {
        throw new Error(`Profil ${id} introuvable`);
      }

      // Mettre à jour la date de dernière utilisation
      await this.updateProfile(id, {
        lastUsed: new Date().toISOString(),
      });

      // Sauvegarder comme profil actif
      await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE_ID, id);
      console.log('✅ Profil actif défini:', profile.name);
    } catch (error) {
      console.error('❌ Erreur définition profil actif:', error);
      throw error;
    }
  }

  /**
   * Créer un nouveau profil
   */
  async createProfile(
    name: string,
    avatar?: string,
    theme?: ThemeType,
    isKids?: boolean,
    blockedCategories?: string[],
    visibleGroups?: string[],
    isOwner?: boolean,
  ): Promise<Profile> {
    try {
      const profiles = await this.getAllProfiles();

      // Vérifier la limite maximale de profils
      if (profiles.length >= MAX_PROFILES) {
        throw new Error(`Limite maximale de ${MAX_PROFILES} profils atteinte`);
      }

      const newProfile: Profile = {
        id: `profile_${Date.now()}`,
        name: name.trim(),
        avatar: avatar || AVAILABLE_AVATARS[0],
        theme: theme || 'dark', // Thème dark par défaut
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        isKids: isKids || false,
        blockedCategories: blockedCategories || [],
        visibleGroups: visibleGroups || [],
      };

      profiles.push(newProfile);
      await AsyncStorage.setItem(
        STORAGE_KEYS.PROFILES,
        JSON.stringify(profiles),
      );

      console.log(
        '✅ Profil créé:',
        newProfile.name,
        isKids ? '(Mode Enfant)' : '',
      );
      return newProfile;
    } catch (error) {
      console.error('❌ Erreur création profil:', error);
      throw error;
    }
  }

  /**
   * Créer le profil par défaut
   */
  async createDefaultProfile(): Promise<Profile> {
    console.log('🆕 Création profil par défaut...');
    const defaultProfile = await this.createProfile('Principal', '👤');
    await this.setActiveProfile(defaultProfile.id);
    return defaultProfile;
  }

  /**
   * Mettre à jour un profil
   */
  async updateProfile(id: string, updates: Partial<Profile>): Promise<void> {
    try {
      const profiles = await this.getAllProfiles();
      const index = profiles.findIndex(p => p.id === id);

      if (index === -1) {
        throw new Error(`Profil ${id} introuvable`);
      }

      profiles[index] = {...profiles[index], ...updates};
      await AsyncStorage.setItem(
        STORAGE_KEYS.PROFILES,
        JSON.stringify(profiles),
      );

      console.log('✅ Profil mis à jour:', profiles[index].name);
    } catch (error) {
      console.error('❌ Erreur mise à jour profil:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour le thème d'un profil
   */
  async updateProfileTheme(id: string, theme: ThemeType): Promise<void> {
    try {
      await this.updateProfile(id, {theme});
      console.log('✅ Thème du profil mis à jour:', theme);
    } catch (error) {
      console.error('❌ Erreur mise à jour thème profil:', error);
      throw error;
    }
  }

  /**
   * Supprimer un profil
   */
  async deleteProfile(id: string): Promise<void> {
    try {
      const profiles = await this.getAllProfiles();
      const filtered = profiles.filter(p => p.id !== id);

      if (filtered.length === profiles.length) {
        throw new Error(`Profil ${id} introuvable`);
      }

      // Ne pas permettre la suppression si c'est le seul profil
      if (filtered.length === 0) {
        throw new Error('Impossible de supprimer le dernier profil');
      }

      await AsyncStorage.setItem(
        STORAGE_KEYS.PROFILES,
        JSON.stringify(filtered),
      );

      // Si c'était le profil actif, définir le premier profil comme actif
      const activeId = await AsyncStorage.getItem(
        STORAGE_KEYS.ACTIVE_PROFILE_ID,
      );
      if (activeId === id) {
        await this.setActiveProfile(filtered[0].id);
      }

      console.log('✅ Profil supprimé:', id);
    } catch (error) {
      console.error('❌ Erreur suppression profil:', error);
      throw error;
    }
  }

  /**
   * Obtenir le paramètre "Demander au démarrage"
   */
  async getAskOnStartup(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.ASK_ON_STARTUP);
      return value === 'true';
    } catch (error) {
      console.error('❌ Erreur lecture paramètre:', error);
      return false;
    }
  }

  /**
   * Définir le paramètre "Demander au démarrage"
   */
  async setAskOnStartup(value: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ASK_ON_STARTUP, value.toString());
      console.log('✅ Paramètre "Demander au démarrage" défini:', value);
    } catch (error) {
      console.error('❌ Erreur définition paramètre:', error);
      throw error;
    }
  }

  /**
   * Obtenir le profil par défaut
   */
  async getDefaultProfile(): Promise<Profile | null> {
    try {
      const profiles = await this.getAllProfiles();
      return profiles.find(p => p.isDefault === true) || null;
    } catch (error) {
      console.error('❌ Erreur récupération profil par défaut:', error);
      return null;
    }
  }

  /**
   * Définir un profil comme défaut
   */
  async setDefaultProfile(id: string): Promise<void> {
    try {
      const profiles = await this.getAllProfiles();

      // Retirer le flag isDefault de tous les profils
      profiles.forEach(p => {
        p.isDefault = false;
      });

      // Définir le nouveau profil par défaut
      const index = profiles.findIndex(p => p.id === id);
      if (index === -1) {
        throw new Error(`Profil ${id} introuvable`);
      }

      profiles[index].isDefault = true;
      await AsyncStorage.setItem(
        STORAGE_KEYS.PROFILES,
        JSON.stringify(profiles),
      );
      console.log('✅ Profil par défaut défini:', profiles[index].name);
    } catch (error) {
      console.error('❌ Erreur définition profil par défaut:', error);
      throw error;
    }
  }

  /**
   * Initialiser le système de profils au démarrage
   * Retourne le profil à utiliser ou null si sélection nécessaire
   */
  async initializeProfiles(): Promise<Profile | null> {
    try {
      const profiles = await this.getAllProfiles();

      // Aucun profil : afficher l'écran de sélection pour création manuelle
      if (profiles.length === 0) {
        console.log('📋 Aucun profil existant, affichage écran de sélection');
        return null; // Afficher écran "Qui regarde ?" pour créer profils
      }

      // Chercher un profil défini comme par défaut
      const defaultProfile = await this.getDefaultProfile();
      if (defaultProfile) {
        console.log(
          '✅ Profil par défaut trouvé, chargement automatique:',
          defaultProfile.name,
        );
        await this.setActiveProfile(defaultProfile.id);
        return defaultProfile;
      }

      // Sinon, afficher l'écran de sélection
      console.log('📋 Aucun profil par défaut, affichage de la sélection');
      return null; // Afficher écran de sélection
    } catch (error) {
      console.error('❌ Erreur initialisation profils:', error);
      // En cas d'erreur, afficher l'écran de sélection au lieu de créer auto
      return null;
    }
  }

  /**
   * Nettoyer tous les profils (debug uniquement)
   */
  async clearAllProfiles(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.PROFILES);
      await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_PROFILE_ID);
      await AsyncStorage.removeItem(STORAGE_KEYS.ASK_ON_STARTUP);
      console.log('🗑️ Tous les profils supprimés');
    } catch (error) {
      console.error('❌ Erreur nettoyage profils:', error);
      throw error;
    }
  }

  /**
   * Vérifier le PIN d'un profil (utilise le PIN parental global)
   */
  async verifyProfilePin(profileId: string, pin: string): Promise<boolean> {
    try {
      const profile = await this.getProfileById(profileId);
      if (!profile) {
        console.error('❌ Profil introuvable pour vérification PIN');
        return false;
      }

      // 🔒 Utiliser le service de contrôle parental pour vérifier le PIN global
      const ParentalControlService = (await import('./ParentalControlService')).default;
      const isValid = await ParentalControlService.verifyPin(pin);

      console.log(isValid ? '✅ PIN correct' : '❌ PIN incorrect');
      return isValid;
    } catch (error) {
      console.error('❌ Erreur vérification PIN:', error);
      return false;
    }
  }

  // ==================== MÉTHODES PIN ANTI-SWITCH ====================

  /**
   * Vérifier PIN global pour switcher depuis ce profil (anti-switch)
   * Note: Utilise le PIN parental global, pas un PIN spécifique au profil
   */
  async verifyProfileAccessPin(profileId: string, pin: string): Promise<boolean> {
    try {
      const profile = await this.getProfileById(profileId);
      if (!profile || !profile.requiresPinToAccess) {
        return true; // Pas de PIN requis pour switcher
      }

      // Utiliser le PIN parental global pour vérification
      const ParentalControlService = (await import('./ParentalControlService')).default;
      const isValid = await ParentalControlService.verifyPin(pin);

      console.log(isValid ? '✅ PIN anti-switch correct' : '❌ PIN anti-switch incorrect');
      return isValid;
    } catch (error) {
      console.error('❌ Erreur vérification PIN anti-switch:', error);
      return false;
    }
  }

  /**
   * Activer/désactiver le blocage de switch pour un profil (avec PIN parental)
   */
  async toggleProfileSwitchLock(
    profileId: string,
    enabled: boolean,
    parentalPin: string,
  ): Promise<boolean> {
    try {
      // Vérifier le PIN parental
      const ParentalControlService = (await import('./ParentalControlService')).default;
      const pinValid = await ParentalControlService.verifyPin(parentalPin);
      if (!pinValid) {
        console.error('❌ PIN parental incorrect');
        return false;
      }

      await this.updateProfile(profileId, {
        requiresPinToAccess: enabled,
      });

      console.log(`✅ Blocage switch ${enabled ? 'activé' : 'désactivé'} pour profil`);
      return true;
    } catch (error) {
      console.error('❌ Erreur toggle blocage switch:', error);
      return false;
    }
  }

  /**
   * Obtenir le type de profil (helper)
   */
  getProfileType(profile: Profile): 'adult' | 'child' {
    if (profile.isKids) {
      return 'child';
    }
    return 'adult';
  }
}

// Export singleton
export default new ProfileService();
