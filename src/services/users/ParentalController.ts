/**
 * 🔒 ParentalController - React Native Migration  
 * Contrôle parental avancé avec PIN, restrictions granulaires et déverrouillage temporaire
 * Migration DIRECTE de l'architecture web ultra-optimisée
 */

import StorageAdapter from '../../storage/StorageAdapter';
import { User, UserRestrictions, TimeRestriction } from './UserManager';
import { Channel } from '../parsers/UltraOptimizedM3UParser';

export interface ParentalSettings {
  globalPinRequired: boolean;
  globalPin: string; // Hash sécurisé
  defaultChildRestrictions: UserRestrictions;
  temporaryUnlockDuration: number; // minutes
  logAccessAttempts: boolean;
  notifyParents: boolean;
}

export interface AccessAttempt {
  id: string;
  userId: string;
  userName: string;
  channelId: string;
  channelName: string;
  category: string;
  timestamp: number;
  blocked: boolean;
  reason: string;
  userAgent?: string;
}

export interface TemporaryUnlock {
  userId: string;
  grantedBy: string; // User ID qui a accordé l'unlock
  grantedAt: number;
  expiresAt: number;
  unlockedCategories: string[];
  reason?: string;
  isActive: boolean;
}

export interface ContentRating {
  level: string;
  age: number;
  description: string;
  countries: string[];
}

export interface ParentalStats {
  totalBlocks: number;
  categoriesBlocked: { [category: string]: number };
  temporaryUnlocks: number;
  averageBlocksPerDay: number;
  mostBlockedCategory: string;
  recentAttempts: number;
}

/**
 * Système de ratings de contenu
 */
class ContentRatingSystem {
  private static readonly RATINGS: { [key: string]: ContentRating } = {
    'G': { level: 'G', age: 0, description: 'Tout public', countries: ['US', 'CA'] },
    'PG': { level: 'PG', age: 8, description: 'Accord parental souhaitable', countries: ['US', 'CA'] },
    'PG-13': { level: 'PG-13', age: 13, description: 'Déconseillé aux moins de 13 ans', countries: ['US'] },
    'R': { level: 'R', age: 17, description: 'Interdit aux moins de 17 ans', countries: ['US'] },
    'NC-17': { level: 'NC-17', age: 18, description: 'Interdit aux moins de 18 ans', countries: ['US'] },
    'U': { level: 'U', age: 0, description: 'Universel', countries: ['GB'] },
    'PG': { level: 'PG', age: 8, description: 'Accord parental', countries: ['GB'] },
    '12': { level: '12', age: 12, description: 'Interdit aux moins de 12 ans', countries: ['GB', 'DE'] },
    '15': { level: '15', age: 15, description: 'Interdit aux moins de 15 ans', countries: ['GB'] },
    '18': { level: '18', age: 18, description: 'Interdit aux moins de 18 ans', countries: ['GB', 'FR', 'DE'] }
  };

  static getRating(level: string): ContentRating | null {
    return this.RATINGS[level] || null;
  }

  static isAgeAppropriate(ratingLevel: string, userAge: number): boolean {
    const rating = this.getRating(ratingLevel);
    return rating ? userAge >= rating.age : true;
  }

  static getAllRatings(): ContentRating[] {
    return Object.values(this.RATINGS);
  }
}

/**
 * Détecteur de contenu adulte basé sur mots-clés
 */
class AdultContentDetector {
  private static readonly ADULT_KEYWORDS = [
    'adult', 'xxx', 'sex', 'porn', 'erotic', 'nude', 'mature',
    '+18', '18+', 'adults only', 'x-rated', 'nsfw'
  ];

  private static readonly ADULT_CATEGORIES = [
    'adult', 'xxx', '+18', '18+', 'mature', 'erotic', 'nsfw',
    'adulte', 'pour adultes', 'réservé aux adultes'
  ];

  static isAdultContent(channel: Channel): boolean {
    const name = channel.name.toLowerCase();
    const category = (channel.category || '').toLowerCase();
    const groupTitle = (channel.groupTitle || '').toLowerCase();

    // Vérification catégorie
    if (this.ADULT_CATEGORIES.some(cat => category.includes(cat))) {
      return true;
    }

    // Vérification nom et groupe
    const searchText = `${name} ${groupTitle}`;
    return this.ADULT_KEYWORDS.some(keyword => searchText.includes(keyword));
  }

  static getDetectionReason(channel: Channel): string {
    if (this.isAdultContent(channel)) {
      const category = (channel.category || '').toLowerCase();
      if (this.ADULT_CATEGORIES.some(cat => category.includes(cat))) {
        return `Catégorie restreinte: ${channel.category}`;
      }
      return 'Contenu détecté comme adulte';
    }
    return '';
  }
}

export class ParentalController {
  private storage: StorageAdapter;
  private settings: ParentalSettings;
  private accessAttempts: AccessAttempt[] = [];
  private temporaryUnlocks: Map<string, TemporaryUnlock> = new Map();
  private stats: ParentalStats;
  private isInitialized = false;

  constructor(storageAdapter?: StorageAdapter) {
    this.storage = storageAdapter || new StorageAdapter();
    this.resetStats();
    this.settings = this.getDefaultSettings();
  }

  /**
   * Initialisation
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔒 Initializing ParentalController...');

      // Charger paramètres
      const savedSettings = await this.storage.get('parental_settings');
      if (savedSettings) {
        this.settings = { ...this.settings, ...savedSettings };
      }

      // Charger tentatives d'accès récentes (7 derniers jours)
      const attempts = await this.storage.get('access_attempts') || [];
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      this.accessAttempts = attempts.filter((attempt: AccessAttempt) => 
        attempt.timestamp > sevenDaysAgo
      );

      // Charger déverrouillages temporaires actifs
      const unlocks = await this.storage.get('temporary_unlocks') || [];
      for (const unlock of unlocks) {
        if (this.isUnlockActive(unlock)) {
          this.temporaryUnlocks.set(unlock.userId, unlock);
        }
      }

      // Charger stats
      const savedStats = await this.storage.get('parental_stats');
      if (savedStats) {
        this.stats = { ...this.stats, ...savedStats };
      }

      this.updateStats();
      this.isInitialized = true;

      console.log('✅ ParentalController initialized');
    } catch (error) {
      console.error('❌ ParentalController initialization failed:', error);
      this.isInitialized = true;
    }
  }

  /**
   * Vérifier si l'accès à une chaîne est autorisé
   */
  async checkChannelAccess(user: User, channel: Channel): Promise<{
    allowed: boolean;
    reason?: string;
    requiresPin?: boolean;
    canBeUnlocked?: boolean;
  }> {
    await this.initialize();

    try {
      // Admins ont accès à tout
      if (user.type === 'admin') {
        return { allowed: true };
      }

      // Vérifier déverrouillage temporaire
      const temporaryUnlock = this.temporaryUnlocks.get(user.id);
      if (temporaryUnlock && this.isUnlockActive(temporaryUnlock)) {
        const category = channel.category || 'Unknown';
        if (temporaryUnlock.unlockedCategories.includes(category)) {
          console.log(`🔓 Temporary unlock active for ${user.name}: ${category}`);
          return { allowed: true };
        }
      }

      // Vérifications de restrictions
      const restrictions = user.restrictions;
      if (!restrictions) {
        return { allowed: true };
      }

      // 1. Vérifier contenu adulte automatiquement
      if (AdultContentDetector.isAdultContent(channel)) {
        const reason = AdultContentDetector.getDetectionReason(channel);
        this.logAccessAttempt(user, channel, true, reason);
        return { 
          allowed: false, 
          reason,
          canBeUnlocked: true
        };
      }

      // 2. Vérifier catégories bloquées
      const category = channel.category || 'Unknown';
      if (restrictions.blockedCategories?.includes(category)) {
        const reason = `Catégorie bloquée: ${category}`;
        this.logAccessAttempt(user, channel, true, reason);
        return { 
          allowed: false, 
          reason,
          canBeUnlocked: true
        };
      }

      // 3. Vérifier catégories autorisées (liste blanche)
      if (restrictions.allowedCategories && restrictions.allowedCategories.length > 0) {
        if (!restrictions.allowedCategories.includes(category)) {
          const reason = `Catégorie non autorisée: ${category}`;
          this.logAccessAttempt(user, channel, true, reason);
          return { 
            allowed: false, 
            reason,
            canBeUnlocked: true
          };
        }
      }

      // 4. Vérifier rating de contenu
      if (restrictions.maxContentRating) {
        // TODO: Extraire rating depuis métadonnées de la chaîne
        // Pour le moment, supposer que les chaînes adultes ont un rating R
        if (category.toLowerCase().includes('adult')) {
          if (!ContentRatingSystem.isAgeAppropriate('R', 18)) { // Supposer âge adulte
            const reason = `Rating de contenu trop élevé`;
            this.logAccessAttempt(user, channel, true, reason);
            return { 
              allowed: false, 
              reason,
              requiresPin: true,
              canBeUnlocked: true
            };
          }
        }
      }

      // 5. Vérifier restrictions horaires
      if (!this.isAccessTimeAllowed(user)) {
        const reason = 'Accès non autorisé à cette heure';
        this.logAccessAttempt(user, channel, true, reason);
        return { 
          allowed: false, 
          reason,
          canBeUnlocked: false
        };
      }

      // Accès autorisé
      this.logAccessAttempt(user, channel, false, 'Accès autorisé');
      return { allowed: true };

    } catch (error) {
      console.error('Channel access check failed:', error);
      return { 
        allowed: false, 
        reason: 'Erreur de vérification des restrictions' 
      };
    }
  }

  /**
   * Demander déverrouillage temporaire avec PIN parental
   */
  async requestTemporaryUnlock(
    childUser: User,
    parentPin: string,
    categories: string[],
    durationMinutes?: number,
    reason?: string
  ): Promise<{
    success: boolean;
    error?: string;
    unlock?: TemporaryUnlock;
  }> {
    await this.initialize();

    try {
      // Vérifier PIN parental global
      if (!await this.verifyParentalPin(parentPin)) {
        return { success: false, error: 'PIN parental incorrect' };
      }

      const duration = durationMinutes || this.settings.temporaryUnlockDuration;
      const unlock: TemporaryUnlock = {
        userId: childUser.id,
        grantedBy: 'parent', // TODO: Identifier parent spécifique
        grantedAt: Date.now(),
        expiresAt: Date.now() + (duration * 60 * 1000),
        unlockedCategories: categories,
        reason,
        isActive: true
      };

      // Sauvegarder
      this.temporaryUnlocks.set(childUser.id, unlock);
      await this.saveTemporaryUnlocks();

      // Stats
      this.stats.temporaryUnlocks++;
      await this.saveStats();

      console.log(`🔓 Temporary unlock granted for ${childUser.name}: ${categories.join(', ')} (${duration}min)`);
      
      return { success: true, unlock };

    } catch (error) {
      console.error('Temporary unlock failed:', error);
      return { success: false, error: 'Erreur lors du déverrouillage' };
    }
  }

  /**
   * Révoquer déverrouillage temporaire
   */
  async revokeTemporaryUnlock(userId: string, parentPin: string): Promise<boolean> {
    try {
      // Vérifier PIN parental
      if (!await this.verifyParentalPin(parentPin)) {
        return false;
      }

      const unlock = this.temporaryUnlocks.get(userId);
      if (unlock) {
        unlock.isActive = false;
        this.temporaryUnlocks.delete(userId);
        await this.saveTemporaryUnlocks();
        
        console.log(`🔒 Temporary unlock revoked for user: ${userId}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Revoke unlock failed:', error);
      return false;
    }
  }

  /**
   * Obtenir tentatives d'accès récentes
   */
  async getAccessAttempts(limit: number = 50): Promise<AccessAttempt[]> {
    await this.initialize();
    
    return this.accessAttempts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Obtenir déverrouillages temporaires actifs
   */
  getActiveUnlocks(): TemporaryUnlock[] {
    return Array.from(this.temporaryUnlocks.values())
      .filter(unlock => this.isUnlockActive(unlock));
  }

  /**
   * Configurer restrictions utilisateur
   */
  async setUserRestrictions(userId: string, restrictions: UserRestrictions, parentPin: string): Promise<boolean> {
    try {
      // Vérifier PIN parental
      if (!await this.verifyParentalPin(parentPin)) {
        return false;
      }

      // TODO: Intégrer avec UserManager pour sauvegarder les restrictions
      console.log(`🔧 Restrictions configured for user: ${userId}`);
      return true;

    } catch (error) {
      console.error('Set restrictions failed:', error);
      return false;
    }
  }

  /**
   * Mettre à jour paramètres parentaux
   */
  async updateSettings(newSettings: Partial<ParentalSettings>, currentPin?: string): Promise<boolean> {
    await this.initialize();

    try {
      // Si on change le PIN, vérifier l'ancien
      if (newSettings.globalPin && currentPin) {
        if (!await this.verifyParentalPin(currentPin)) {
          return false;
        }
        // Hash nouveau PIN
        newSettings.globalPin = await this.hashPin(newSettings.globalPin);
      }

      this.settings = { ...this.settings, ...newSettings };
      await this.storage.set('parental_settings', this.settings);

      console.log('🔧 Parental settings updated');
      return true;

    } catch (error) {
      console.error('Update settings failed:', error);
      return false;
    }
  }

  /**
   * Obtenir statistiques
   */
  getStats(): ParentalStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * MÉTHODES PRIVÉES
   */

  private async logAccessAttempt(
    user: User, 
    channel: Channel, 
    blocked: boolean, 
    reason: string
  ): Promise<void> {
    if (!this.settings.logAccessAttempts) return;

    const attempt: AccessAttempt = {
      id: `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      userId: user.id,
      userName: user.name,
      channelId: channel.id,
      channelName: channel.name,
      category: channel.category || 'Unknown',
      timestamp: Date.now(),
      blocked,
      reason
    };

    this.accessAttempts.push(attempt);

    // Limiter le nombre de tentatives stockées
    if (this.accessAttempts.length > 1000) {
      this.accessAttempts = this.accessAttempts.slice(-1000);
    }

    await this.storage.set('access_attempts', this.accessAttempts);

    if (blocked) {
      this.stats.totalBlocks++;
      const category = channel.category || 'Unknown';
      this.stats.categoriesBlocked[category] = (this.stats.categoriesBlocked[category] || 0) + 1;
      await this.saveStats();
    }
  }

  private isAccessTimeAllowed(user: User): boolean {
    if (!user.restrictions?.timeRestrictions) return true;

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    return user.restrictions.timeRestrictions.some(restriction => {
      if (restriction.dayOfWeek === currentDay) {
        return currentTime >= restriction.startTime && currentTime <= restriction.endTime;
      }
      return false;
    });
  }

  private isUnlockActive(unlock: TemporaryUnlock): boolean {
    return unlock.isActive && Date.now() < unlock.expiresAt;
  }

  private async verifyParentalPin(pin: string): Promise<boolean> {
    if (!this.settings.globalPin) return true; // Pas de PIN configuré
    
    // TODO: Implémenter vérification hash sécurisée
    // Pour le moment, comparaison simple
    return pin === '0000'; // PIN par défaut temporaire
  }

  private async hashPin(pin: string): Promise<string> {
    // TODO: Implémenter hash sécurisé
    // Pour le moment, encoder en base64
    return btoa(`${pin}_salt_${Date.now()}`);
  }

  private async saveTemporaryUnlocks(): Promise<void> {
    const activeUnlocks = Array.from(this.temporaryUnlocks.values())
      .filter(unlock => this.isUnlockActive(unlock));
    await this.storage.set('temporary_unlocks', activeUnlocks);
  }

  private async saveStats(): Promise<void> {
    await this.storage.set('parental_stats', this.stats);
  }

  private getDefaultSettings(): ParentalSettings {
    return {
      globalPinRequired: true,
      globalPin: '', // À configurer
      defaultChildRestrictions: {
        blockedCategories: ['Adult', 'XXX', '+18', 'Mature'],
        maxContentRating: 'PG-13',
        timeRestrictions: [
          // Accès après l'école uniquement
          { dayOfWeek: 1, startTime: '16:00', endTime: '20:00' },
          { dayOfWeek: 2, startTime: '16:00', endTime: '20:00' },
          { dayOfWeek: 3, startTime: '16:00', endTime: '20:00' },
          { dayOfWeek: 4, startTime: '16:00', endTime: '20:00' },
          { dayOfWeek: 5, startTime: '16:00', endTime: '20:00' },
          { dayOfWeek: 6, startTime: '09:00', endTime: '21:00' },
          { dayOfWeek: 0, startTime: '09:00', endTime: '20:00' }
        ],
        sessionTimeLimit: 120
      },
      temporaryUnlockDuration: 30, // 30 minutes par défaut
      logAccessAttempts: true,
      notifyParents: true
    };
  }

  private updateStats(): void {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    // Tentatives récentes (24h)
    this.stats.recentAttempts = this.accessAttempts.filter(
      attempt => attempt.timestamp > oneDayAgo
    ).length;

    // Catégorie la plus bloquée
    let maxBlocks = 0;
    for (const [category, blocks] of Object.entries(this.stats.categoriesBlocked)) {
      if (blocks > maxBlocks) {
        maxBlocks = blocks;
        this.stats.mostBlockedCategory = category;
      }
    }

    // Moyenne des blocages par jour (sur 7 jours)
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    const recentBlocks = this.accessAttempts.filter(
      attempt => attempt.blocked && attempt.timestamp > sevenDaysAgo
    ).length;
    this.stats.averageBlocksPerDay = Math.round(recentBlocks / 7);
  }

  private resetStats(): void {
    this.stats = {
      totalBlocks: 0,
      categoriesBlocked: {},
      temporaryUnlocks: 0,
      averageBlocksPerDay: 0,
      mostBlockedCategory: '',
      recentAttempts: 0
    };
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    // Révoquer tous les déverrouillages temporaires
    for (const unlock of this.temporaryUnlocks.values()) {
      unlock.isActive = false;
    }
    this.temporaryUnlocks.clear();
    
    this.accessAttempts = [];
    this.resetStats();
    this.isInitialized = false;
  }

  /**
   * Exporter logs pour analyse parentale
   */
  async exportAccessLogs(): Promise<string> {
    const attempts = await this.getAccessAttempts();
    
    const csv = [
      'Date,Utilisateur,Chaîne,Catégorie,Bloqué,Raison',
      ...attempts.map(attempt => 
        `${new Date(attempt.timestamp).toISOString()},${attempt.userName},${attempt.channelName},${attempt.category},${attempt.blocked ? 'Oui' : 'Non'},"${attempt.reason}"`
      )
    ].join('\n');

    return csv;
  }
}

export default ParentalController;