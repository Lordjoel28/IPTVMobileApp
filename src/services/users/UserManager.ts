/**
 * 👥 UserManager - React Native Migration
 * Gestion multi-utilisateurs avec authentification PIN et profils
 * Migration DIRECTE de l'architecture web ultra-optimisée
 */

import StorageAdapter from '../../storage/StorageAdapter';
import {Channel} from '../parsers/UltraOptimizedM3UParser';

export interface User {
  id: string;
  name: string;
  type: 'admin' | 'standard' | 'child';
  avatar: string;
  pin: string; // Hash sécurisé
  dateCreated: string;
  lastLogin: string;
  preferences: UserPreferences;
  restrictions?: UserRestrictions;
  stats: UserStats;
}

export interface UserPreferences {
  theme: string;
  language: string;
  autoplay: boolean;
  defaultQuality: 'auto' | '4K' | 'FHD' | 'HD' | 'SD';
  favoriteCategories: string[];
  recentChannelsLimit: number;
  parentalPinRequired: boolean;
}

export interface UserRestrictions {
  allowedCategories?: string[];
  blockedCategories?: string[];
  maxContentRating?: string;
  timeRestrictions?: TimeRestriction[];
  sessionTimeLimit?: number; // minutes
}

export interface TimeRestriction {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
}

export interface UserStats {
  totalWatchTime: number; // minutes
  favoriteChannels: number;
  sessionsCount: number;
  lastChannelWatched?: string;
  topCategories: {[category: string]: number};
}

export interface Session {
  userId: string;
  startTime: number;
  lastActivity: number;
  isActive: boolean;
  temporaryUnlock?: {
    until: number;
    unlockedCategories: string[];
  };
}

export interface AuthResult {
  success: boolean;
  user?: User;
  session?: Session;
  error?: string;
}

export interface UserManagerStats {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  childUsers: number;
  totalSessions: number;
  averageSessionTime: number;
}

/**
 * Service de hachage PIN sécurisé
 */
class PinHashService {
  private static readonly SALT_ROUNDS = 10;

  /**
   * Hash PIN avec salt (simulation bcrypt)
   */
  static async hashPin(pin: string): Promise<string> {
    // Pour React Native, utiliser crypto-js ou implémentation native
    // Simulation simple pour le moment
    const salt = Math.random().toString(36).substring(2, 15);
    const hash = btoa(`${pin}_${salt}_${this.SALT_ROUNDS}`);
    return `${salt}:${hash}`;
  }

  /**
   * Vérifier PIN
   */
  static async verifyPin(pin: string, hashedPin: string): Promise<boolean> {
    try {
      const [salt, hash] = hashedPin.split(':');
      const expectedHash = btoa(`${pin}_${salt}_${this.SALT_ROUNDS}`);
      return hash === expectedHash;
    } catch (error) {
      console.error('PIN verification failed:', error);
      return false;
    }
  }
}

export class UserManager {
  // 🆕 Singleton pattern instance
  private static instance: UserManager;

  private storage: StorageAdapter;
  private users: Map<string, User> = new Map();
  private sessions: Map<string, Session> = new Map();
  private currentSession: Session | null = null;
  private stats: UserManagerStats;
  private isInitialized = false;
  private isInitializing = false;

  constructor(storageAdapter?: StorageAdapter) {
    this.storage = storageAdapter || new StorageAdapter();
    this.resetStats();
  }

  // 🆕 Support pour injection de dépendances (DI)
  // Cette méthode permet d'utiliser le service via DI ou singleton legacy
  public static getInstance(storageAdapter?: StorageAdapter): UserManager {
    if (!UserManager.instance) {
      UserManager.instance = new UserManager(storageAdapter);
    }
    return UserManager.instance;
  }

  // 🆕 Méthode statique pour compatibilité DI
  // Sera utilisée par le ServiceRegistry
  public static async createFromDI(): Promise<UserManager> {
    try {
      // Pour le moment, retourne une nouvelle instance
      // Plus tard, on pourra injecter des dépendances si nécessaire
      return new UserManager();
    } catch (error) {
      console.error('❌ Failed to create UserManager from DI:', error);
      // Fallback sur l'ancienne méthode
      return UserManager.getInstance();
    }
  }

  /**
   * Initialisation avec chargement utilisateurs
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    if (this.isInitializing) {
      console.log('⏳ UserManager already initializing, waiting...');
      return; // Éviter l'attente active qui peut créer des problèmes
    }

    this.isInitializing = true;

    try {
      console.log('🔄 Initializing UserManager...');

      // Charger utilisateurs existants
      const userIds = (await this.storage.get('user_ids')) || [];
      console.log(`📋 Found ${userIds.length} existing user(s)`);

      for (const userId of userIds) {
        const user = await this.storage.get(`user_${userId}`);
        if (user) {
          this.users.set(userId, user);
          console.log(`👤 Loaded user: ${user.name} (${user.type})`);
        }
      }

      // Créer utilisateur admin par défaut si aucun utilisateur
      if (this.users.size === 0) {
        console.log('🆕 No users found, creating default admin...');
        await this.createDefaultAdminUser();
      }

      // Charger sessions actives
      const activeSessions = (await this.storage.get('active_sessions')) || [];
      for (const sessionData of activeSessions) {
        if (this.isSessionValid(sessionData)) {
          this.sessions.set(sessionData.userId, sessionData);
        }
      }

      // Charger stats
      const savedStats = await this.storage.get('user_stats');
      if (savedStats) {
        this.stats = {...this.stats, ...savedStats};
      }

      this.updateStats();
      this.isInitialized = true;
      this.isInitializing = false;

      console.log('✅ UserManager initialized:', this.getStats());
    } catch (error) {
      console.error('❌ UserManager initialization failed:', error);
      this.isInitialized = true;
      this.isInitializing = false;
    }
  }

  /**
   * Créer nouvel utilisateur
   */
  async createUser(
    name: string,
    type: 'admin' | 'standard' | 'child',
    pin: string,
    avatar: string = 'default',
  ): Promise<User> {
    await this.initialize();

    // Validation
    if (name.trim().length < 2) {
      throw new Error('Le nom doit contenir au moins 2 caractères');
    }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      throw new Error('Le PIN doit contenir exactement 4 chiffres');
    }

    // Vérifier unicité du nom
    for (const user of this.users.values()) {
      if (user.name.toLowerCase() === name.toLowerCase()) {
        throw new Error('Un utilisateur avec ce nom existe déjà');
      }
    }

    const userId = this.generateUserId();
    const hashedPin = await PinHashService.hashPin(pin);

    const user: User = {
      id: userId,
      name: name.trim(),
      type,
      avatar,
      pin: hashedPin,
      dateCreated: new Date().toISOString(),
      lastLogin: '',
      preferences: this.getDefaultPreferences(type),
      restrictions:
        type === 'child' ? this.getDefaultChildRestrictions() : undefined,
      stats: this.getDefaultStats(),
    };

    // Sauvegarder
    await this.saveUser(user);

    console.log(`👤 User created: ${name} (${type})`);
    return {...user, pin: ''}; // Ne pas retourner le PIN hashé
  }

  /**
   * Authentification utilisateur
   */
  async authenticate(userId: string, pin: string): Promise<AuthResult> {
    await this.initialize();

    try {
      const user = this.users.get(userId);
      if (!user) {
        return {success: false, error: 'Utilisateur non trouvé'};
      }

      // Vérifier restrictions horaires
      if (!this.isAccessAllowed(user)) {
        return {success: false, error: 'Accès non autorisé à cette heure'};
      }

      // Vérifier PIN
      const pinValid = await PinHashService.verifyPin(pin, user.pin);
      if (!pinValid) {
        return {success: false, error: 'PIN incorrect'};
      }

      // Créer session
      const session = await this.createSession(user);

      // Mettre à jour stats utilisateur
      user.lastLogin = new Date().toISOString();
      user.stats.sessionsCount++;
      await this.saveUser(user);

      console.log(`🔐 User authenticated: ${user.name}`);

      return {
        success: true,
        user: {...user, pin: ''}, // Masquer PIN
        session,
      };
    } catch (error) {
      console.error('Authentication failed:', error);
      return {success: false, error: "Erreur d'authentification"};
    }
  }

  /**
   * Déconnexion utilisateur
   */
  async logout(userId?: string): Promise<boolean> {
    try {
      const targetUserId = userId || this.currentSession?.userId;
      if (!targetUserId) {
        return false;
      }

      // Terminer session
      const session = this.sessions.get(targetUserId);
      if (session) {
        session.isActive = false;
        this.sessions.delete(targetUserId);
      }

      // Clear current session si c'est la session courante
      if (this.currentSession?.userId === targetUserId) {
        this.currentSession = null;
      }

      await this.saveActiveSessions();

      console.log(`👋 User logged out: ${targetUserId}`);
      return true;
    } catch (error) {
      console.error('Logout failed:', error);
      return false;
    }
  }

  /**
   * Obtenir utilisateur courant
   */
  getCurrentUser(): User | null {
    if (!this.currentSession || !this.currentSession.isActive) {
      return null;
    }

    const user = this.users.get(this.currentSession.userId);
    return user ? {...user, pin: ''} : null;
  }

  /**
   * Liste tous les utilisateurs
   */
  async getAllUsers(): Promise<User[]> {
    await this.initialize();

    return Array.from(this.users.values()).map(user => ({
      ...user,
      pin: '', // Masquer PINs
    }));
  }

  /**
   * Mettre à jour utilisateur
   */
  async updateUser(userId: string, updates: Partial<User>): Promise<boolean> {
    await this.initialize();

    try {
      const user = this.users.get(userId);
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      // Hash nouveau PIN si fourni
      if (updates.pin) {
        updates.pin = await PinHashService.hashPin(updates.pin);
      }

      // Appliquer mises à jour
      const updatedUser = {...user, ...updates};

      // Validation
      if (updatedUser.name && updatedUser.name.trim().length < 2) {
        throw new Error('Le nom doit contenir au moins 2 caractères');
      }

      await this.saveUser(updatedUser);

      console.log(`📝 User updated: ${updatedUser.name}`);
      return true;
    } catch (error) {
      console.error('User update failed:', error);
      return false;
    }
  }

  /**
   * Supprimer utilisateur
   */
  async deleteUser(userId: string): Promise<boolean> {
    await this.initialize();

    try {
      const user = this.users.get(userId);
      if (!user) {
        return false;
      }

      // Vérifier qu'il reste au moins un admin
      if (user.type === 'admin') {
        const adminCount = Array.from(this.users.values()).filter(
          u => u.type === 'admin',
        ).length;
        if (adminCount <= 1) {
          throw new Error('Impossible de supprimer le dernier administrateur');
        }
      }

      // Supprimer utilisateur
      this.users.delete(userId);
      await this.storage.delete(`user_${userId}`);

      // Terminer sessions actives
      await this.logout(userId);

      // Mettre à jour index
      await this.updateUserIndex();

      console.log(`🗑️ User deleted: ${user.name}`);
      return true;
    } catch (error) {
      console.error('User deletion failed:', error);
      return false;
    }
  }

  /**
   * Ajouter chaîne aux favoris
   */
  async addToFavorites(userId: string, channel: Channel): Promise<boolean> {
    try {
      const favorites = (await this.storage.get(`favorites_${userId}`)) || [];

      // Éviter doublons
      const exists = favorites.find((fav: Channel) => fav.id === channel.id);
      if (exists) {
        return true;
      }

      favorites.push(channel);
      await this.storage.set(`favorites_${userId}`, favorites);

      // Mettre à jour stats utilisateur
      const user = this.users.get(userId);
      if (user) {
        user.stats.favoriteChannels = favorites.length;
        await this.saveUser(user);
      }

      return true;
    } catch (error) {
      console.error('Add to favorites failed:', error);
      return false;
    }
  }

  /**
   * Obtenir favoris utilisateur
   */
  async getFavorites(userId: string): Promise<Channel[]> {
    try {
      return (await this.storage.get(`favorites_${userId}`)) || [];
    } catch (error) {
      console.error('Get favorites failed:', error);
      return [];
    }
  }

  /**
   * Ajouter à l'historique
   */
  async addToHistory(userId: string, channel: Channel): Promise<boolean> {
    try {
      const history = (await this.storage.get(`history_${userId}`)) || [];

      // Supprimer si déjà présent
      const filtered = history.filter(
        (item: any) => item.channel.id !== channel.id,
      );

      // Ajouter en début
      filtered.unshift({
        channel,
        timestamp: Date.now(),
      });

      // Limiter taille
      const user = this.users.get(userId);
      const limit = user?.preferences.recentChannelsLimit || 20;
      const trimmed = filtered.slice(0, limit);

      await this.storage.set(`history_${userId}`, trimmed);

      // Mettre à jour stats
      if (user) {
        user.stats.lastChannelWatched = channel.id;
        const category = channel.category || 'Unknown';
        user.stats.topCategories[category] =
          (user.stats.topCategories[category] || 0) + 1;
        await this.saveUser(user);
      }

      return true;
    } catch (error) {
      console.error('Add to history failed:', error);
      return false;
    }
  }

  /**
   * Obtenir historique utilisateur
   */
  async getHistory(userId: string, limit?: number): Promise<any[]> {
    try {
      const history = (await this.storage.get(`history_${userId}`)) || [];
      return limit ? history.slice(0, limit) : history;
    } catch (error) {
      console.error('Get history failed:', error);
      return [];
    }
  }

  /**
   * Statistiques générales
   */
  getStats(): UserManagerStats {
    this.updateStats();
    return {...this.stats};
  }

  /**
   * MÉTHODES PRIVÉES
   */

  private async createDefaultAdminUser(): Promise<void> {
    console.log('👤 Creating default admin user');

    // Créer directement sans passer par createUser() pour éviter la récursion
    const userId = this.generateUserId();
    const hashedPin = await PinHashService.hashPin('0000');

    const user: User = {
      id: userId,
      name: 'Administrateur',
      type: 'admin',
      avatar: 'admin',
      pin: hashedPin,
      dateCreated: new Date().toISOString(),
      lastLogin: '',
      preferences: this.getDefaultPreferences('admin'),
      restrictions: undefined,
      stats: this.getDefaultStats(),
    };

    // Sauvegarder directement
    await this.saveUser(user);
    console.log('👤 Default admin user created successfully');
  }

  private async createSession(user: User): Promise<Session> {
    const session: Session = {
      userId: user.id,
      startTime: Date.now(),
      lastActivity: Date.now(),
      isActive: true,
    };

    this.sessions.set(user.id, session);
    this.currentSession = session;

    await this.saveActiveSessions();

    return session;
  }

  private isSessionValid(session: Session): boolean {
    if (!session.isActive) {
      return false;
    }

    // Session expire après 8 heures d'inactivité
    const maxIdleTime = 8 * 60 * 60 * 1000; // 8h en ms
    const idleTime = Date.now() - session.lastActivity;

    return idleTime < maxIdleTime;
  }

  private isAccessAllowed(user: User): boolean {
    if (user.type === 'admin') {
      return true;
    }
    if (!user.restrictions?.timeRestrictions) {
      return true;
    }

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;

    for (const restriction of user.restrictions.timeRestrictions) {
      if (restriction.dayOfWeek === currentDay) {
        if (
          currentTime >= restriction.startTime &&
          currentTime <= restriction.endTime
        ) {
          return true;
        }
      }
    }

    return false;
  }

  private async saveUser(user: User): Promise<void> {
    this.users.set(user.id, user);
    await this.storage.set(`user_${user.id}`, user);
    await this.updateUserIndex();
  }

  private async updateUserIndex(): Promise<void> {
    const userIds = Array.from(this.users.keys());
    await this.storage.set('user_ids', userIds);
  }

  private async saveActiveSessions(): Promise<void> {
    const activeSessions = Array.from(this.sessions.values()).filter(
      session => session.isActive,
    );
    await this.storage.set('active_sessions', activeSessions);
  }

  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultPreferences(
    type: 'admin' | 'standard' | 'child',
  ): UserPreferences {
    return {
      theme: 'dark',
      language: 'fr',
      autoplay: true,
      defaultQuality: 'auto',
      favoriteCategories: [],
      recentChannelsLimit: type === 'child' ? 10 : 20,
      parentalPinRequired: type === 'child',
    };
  }

  private getDefaultChildRestrictions(): UserRestrictions {
    return {
      blockedCategories: ['Adult', 'XXX', '+18'],
      maxContentRating: 'PG-13',
      timeRestrictions: [
        // Accès limité en semaine (après école)
        {dayOfWeek: 1, startTime: '16:00', endTime: '20:00'}, // Lundi
        {dayOfWeek: 2, startTime: '16:00', endTime: '20:00'}, // Mardi
        {dayOfWeek: 3, startTime: '16:00', endTime: '20:00'}, // Mercredi
        {dayOfWeek: 4, startTime: '16:00', endTime: '20:00'}, // Jeudi
        {dayOfWeek: 5, startTime: '16:00', endTime: '20:00'}, // Vendredi
        // Weekend plus permissif
        {dayOfWeek: 6, startTime: '08:00', endTime: '21:00'}, // Samedi
        {dayOfWeek: 0, startTime: '08:00', endTime: '20:00'}, // Dimanche
      ],
      sessionTimeLimit: 120, // 2 heures max
    };
  }

  private getDefaultStats(): UserStats {
    return {
      totalWatchTime: 0,
      favoriteChannels: 0,
      sessionsCount: 0,
      topCategories: {},
    };
  }

  private updateStats(): void {
    this.stats.totalUsers = this.users.size;
    this.stats.activeUsers = this.sessions.size;
    this.stats.adminUsers = Array.from(this.users.values()).filter(
      u => u.type === 'admin',
    ).length;
    this.stats.childUsers = Array.from(this.users.values()).filter(
      u => u.type === 'child',
    ).length;
    this.stats.totalSessions = Array.from(this.users.values()).reduce(
      (total, user) => total + user.stats.sessionsCount,
      0,
    );
  }

  private resetStats(): void {
    this.stats = {
      totalUsers: 0,
      activeUsers: 0,
      adminUsers: 0,
      childUsers: 0,
      totalSessions: 0,
      averageSessionTime: 0,
    };
  }

  /**
   * Cleanup ressources
   */
  async cleanup(): Promise<void> {
    // Terminer toutes les sessions
    for (const userId of this.sessions.keys()) {
      await this.logout(userId);
    }

    this.users.clear();
    this.sessions.clear();
    this.currentSession = null;
    this.resetStats();
    this.isInitialized = false;
  }
}

export default UserManager;
