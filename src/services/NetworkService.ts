/**
 * 🌐 NetworkService - Gestion robuste des requêtes HTTP avec retry logic
 * Améliore la fiabilité des téléchargements de playlists et APIs Xtream
 */

export interface NetworkRequestOptions {
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
  method?: string;
  body?: string;
}

export class NetworkError extends Error {
  constructor(
    public type:
      | 'server'
      | 'timeout'
      | 'network'
      | 'notfound'
      | 'forbidden'
      | 'http'
      | 'abort',
    public statusCode?: number,
    public details?: string,
  ) {
    super(details || `Erreur réseau: ${type}`);
    this.name = 'NetworkError';
  }

  /**
   * Obtenir un message utilisateur friendly
   */
  getUserMessage(): string {
    switch (this.type) {
      case 'notfound':
        return "La playlist demandée n'existe pas ou l'URL est incorrecte";
      case 'forbidden':
        return "Accès refusé. Vérifiez vos identifiants ou l'URL";
      case 'timeout':
        return 'La playlist met trop de temps à répondre. Réessayez plus tard';
      case 'server':
        return 'Le serveur de la playlist rencontre des difficultés';
      case 'network':
        return 'Erreur de connexion réseau. Vérifiez votre connexion Internet';
      case 'abort':
        return 'Le téléchargement a été annulé';
      default:
        return `Erreur de connexion: ${this.details || this.message}`;
    }
  }
}

export class NetworkService {
  private retryConfig = {
    maxAttempts: 3,
    backoffMultiplier: 1.5,
    initialDelay: 1000,
    maxDelay: 10000,
  };

  constructor() {
    console.log('🌐 NetworkService initialized with intelligent retry logic');
  }

  /**
   * Fetch avec retry automatique et gestion d'erreurs robuste
   */
  async fetchWithRetry(
    url: string,
    options: NetworkRequestOptions = {},
  ): Promise<Response> {
    const {
      timeout = 30000,
      retryAttempts = this.retryConfig.maxAttempts,
      method = 'GET',
      headers = {},
      body,
    } = options;

    let attempt = 0;
    let lastError: Error;

    console.log(
      `🌐 Fetching: ${url.substring(0, 100)}${url.length > 100 ? '...' : ''}`,
    );

    while (attempt < retryAttempts) {
      try {
        attempt++;

        // AbortController pour timeout React Native compatible
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, timeout);

        const response = await fetch(url, {
          method,
          headers: {
            'User-Agent': 'IPTV-Player/2.0',
            Accept:
              'application/vnd.apple.mpegurl,application/x-mpegurl,text/plain,application/json,*/*',
            ...headers,
          },
          signal: controller.signal,
          body,
        });

        clearTimeout(timeoutId);

        // Analyse détaillée du code de statut
        if (response.status >= 500 && response.status < 600) {
          throw new NetworkError(
            'server',
            response.status,
            `Erreur serveur ${response.status}: ${response.statusText}`,
          );
        } else if (response.status === 404) {
          throw new NetworkError('notfound', 404, 'Ressource introuvable');
        } else if (response.status === 403 || response.status === 401) {
          throw new NetworkError(
            'forbidden',
            response.status,
            'Accès non autorisé',
          );
        } else if (response.status === 408 || response.status === 504) {
          throw new NetworkError('timeout', response.status, 'Timeout serveur');
        } else if (!response.ok) {
          throw new NetworkError(
            'http',
            response.status,
            `Erreur HTTP ${response.status}: ${response.statusText}`,
          );
        }

        // Succès !
        if (attempt > 1) {
          console.log(`✅ Succès après ${attempt} tentatives`);
        }

        return response;
      } catch (error) {
        lastError = error;

        // Gestion spéciale AbortError (timeout)
        if (error.name === 'AbortError') {
          lastError = new NetworkError('timeout', 408, 'Timeout de connexion');
        }

        // Pas de retry pour certaines erreurs définitives
        if (error instanceof NetworkError) {
          if (
            error.type === 'notfound' ||
            error.type === 'forbidden' ||
            error.type === 'abort'
          ) {
            console.log(`❌ Erreur définitive: ${error.type}, pas de retry`);
            throw error;
          }
        }

        // Retry avec backoff exponentiel
        if (attempt < retryAttempts) {
          const delay = Math.min(
            this.retryConfig.initialDelay *
              Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
            this.retryConfig.maxDelay,
          );

          console.log(
            `🔄 Retry ${attempt}/${retryAttempts} dans ${delay}ms (${error.message})`,
          );
          await this.delay(delay);
        } else {
          console.error(
            `❌ Échec définitif après ${attempt} tentatives:`,
            error.message,
          );
        }
      }
    }

    throw lastError;
  }

  /**
   * Fetch JSON avec parsing automatique et validation
   */
  async fetchJSON<T = any>(
    url: string,
    options: NetworkRequestOptions = {},
  ): Promise<T> {
    const response = await this.fetchWithRetry(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const text = await response.text();

    try {
      return JSON.parse(text) as T;
    } catch (parseError) {
      throw new NetworkError(
        'http',
        response.status,
        'Réponse JSON invalide du serveur',
      );
    }
  }

  /**
   * Fetch text avec validation de contenu
   */
  async fetchText(
    url: string,
    options: NetworkRequestOptions = {},
  ): Promise<string> {
    const response = await this.fetchWithRetry(url, options);
    const text = await response.text();

    if (!text || typeof text !== 'string') {
      throw new NetworkError(
        'http',
        response.status,
        'Contenu vide ou invalide',
      );
    }

    return text;
  }

  /**
   * Test de connectivité rapide
   */
  async testConnection(url: string): Promise<boolean> {
    try {
      await this.fetchWithRetry(url, {
        timeout: 5000,
        retryAttempts: 1,
        method: 'HEAD',
      });
      return true;
    } catch (error) {
      console.log(`🔍 Test connexion échoué pour ${url}: ${error.message}`);
      return false;
    }
  }

  /**
   * Obtenir les statistiques réseau
   */
  getNetworkStats() {
    return {
      retryConfig: this.retryConfig,
      userAgent: 'IPTV-Player/2.0',
      supportedFormats: ['M3U', 'M3U8', 'JSON', 'XML'],
      timeouts: {
        default: 30000,
        quick: 5000,
        large: 60000,
      },
    };
  }

  /**
   * Utilitaire delay pour retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const networkService = new NetworkService();
