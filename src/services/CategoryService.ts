/**
 * 🏷️ Category Service - Module de gestion des catégories IPTV
 * Architecture modulaire pour l'organisation et la présentation des catégories
 */

import type {Channel} from '../types';

export interface CategoryInfo {
  id: string;
  name: string;
  normalizedName: string;
  color: string;
  icon: string;
  channelCount: number;
  priority: number; // Pour l'ordre d'affichage
}

export interface CategoryMapping {
  [key: string]: CategoryInfo;
}

export class CategoryService {
  private static instance: CategoryService;

  // Mapping intelligent des catégories avec couleurs et icônes
  private readonly categoryMappings: {[key: string]: Partial<CategoryInfo>} = {
    // Sport
    sport: {
      name: 'Sport',
      color: '#FF4444',
      icon: 'sports-football',
      priority: 1,
    },
    sports: {
      name: 'Sport',
      color: '#FF4444',
      icon: 'sports-football',
      priority: 1,
    },
    football: {
      name: 'Sport',
      color: '#FF4444',
      icon: 'sports-football',
      priority: 1,
    },
    soccer: {
      name: 'Sport',
      color: '#FF4444',
      icon: 'sports-football',
      priority: 1,
    },
    basketball: {
      name: 'Sport',
      color: '#FF4444',
      icon: 'sports-basketball',
      priority: 1,
    },
    tennis: {
      name: 'Sport',
      color: '#FF4444',
      icon: 'sports-tennis',
      priority: 1,
    },

    // News
    news: {name: 'News', color: '#2196F3', icon: 'newspaper', priority: 2},
    information: {
      name: 'News',
      color: '#2196F3',
      icon: 'newspaper',
      priority: 2,
    },
    info: {name: 'News', color: '#2196F3', icon: 'newspaper', priority: 2},
    actualités: {
      name: 'News',
      color: '#2196F3',
      icon: 'newspaper',
      priority: 2,
    },

    // Movies
    movies: {name: 'Movies', color: '#9C27B0', icon: 'movie', priority: 3},
    movie: {name: 'Movies', color: '#9C27B0', icon: 'movie', priority: 3},
    films: {name: 'Movies', color: '#9C27B0', icon: 'movie', priority: 3},
    film: {name: 'Movies', color: '#9C27B0', icon: 'movie', priority: 3},
    cinema: {name: 'Movies', color: '#9C27B0', icon: 'movie', priority: 3},

    // Series/TV Shows
    series: {name: 'Series', color: '#FF9800', icon: 'tv', priority: 4},
    serie: {name: 'Series', color: '#FF9800', icon: 'tv', priority: 4},
    'tv shows': {name: 'Series', color: '#FF9800', icon: 'tv', priority: 4},
    shows: {name: 'Series', color: '#FF9800', icon: 'tv', priority: 4},

    // Entertainment
    entertainment: {
      name: 'Entertainment',
      color: '#E91E63',
      icon: 'theater-comedy',
      priority: 5,
    },
    variety: {
      name: 'Entertainment',
      color: '#E91E63',
      icon: 'theater-comedy',
      priority: 5,
    },
    divertissement: {
      name: 'Entertainment',
      color: '#E91E63',
      icon: 'theater-comedy',
      priority: 5,
    },

    // Music
    music: {name: 'Music', color: '#4CAF50', icon: 'music-note', priority: 6},
    musique: {name: 'Music', color: '#4CAF50', icon: 'music-note', priority: 6},
    radio: {name: 'Music', color: '#4CAF50', icon: 'radio', priority: 6},

    // Kids
    kids: {name: 'Kids', color: '#FFEB3B', icon: 'child-care', priority: 7},
    children: {name: 'Kids', color: '#FFEB3B', icon: 'child-care', priority: 7},
    enfants: {name: 'Kids', color: '#FFEB3B', icon: 'child-care', priority: 7},
    cartoon: {name: 'Kids', color: '#FFEB3B', icon: 'child-care', priority: 7},

    // Documentary
    documentary: {
      name: 'Documentary',
      color: '#795548',
      icon: 'school',
      priority: 8,
    },
    documentaire: {
      name: 'Documentary',
      color: '#795548',
      icon: 'school',
      priority: 8,
    },
    education: {
      name: 'Documentary',
      color: '#795548',
      icon: 'school',
      priority: 8,
    },

    // Lifestyle
    lifestyle: {name: 'Lifestyle', color: '#607D8B', icon: 'home', priority: 9},
    cooking: {
      name: 'Lifestyle',
      color: '#607D8B',
      icon: 'restaurant',
      priority: 9,
    },
    travel: {name: 'Lifestyle', color: '#607D8B', icon: 'flight', priority: 9},
    voyage: {name: 'Lifestyle', color: '#607D8B', icon: 'flight', priority: 9},

    // Default
    general: {name: 'General', color: '#757575', icon: 'tv', priority: 10},
    uncategorized: {
      name: 'Uncategorized',
      color: '#757575',
      icon: 'tv',
      priority: 11,
    },
  };

  constructor() {
    console.log(
      '🏷️ CategoryService initialized - Smart category management ready',
    );
  }

  public static getInstance(): CategoryService {
    if (!CategoryService.instance) {
      CategoryService.instance = new CategoryService();
    }
    return CategoryService.instance;
  }

  // 🆕 Méthode statique pour compatibilité DI
  // Sera utilisée par le ServiceRegistry
  public static async createFromDI(): Promise<CategoryService> {
    try {
      // Pour le moment, retourne une nouvelle instance
      // Plus tard, on pourra injecter des dépendances si nécessaire
      return new CategoryService();
    } catch (error) {
      console.error('❌ Failed to create CategoryService from DI:', error);
      // Fallback sur l'ancienne méthode
      return CategoryService.getInstance();
    }
  }

  /**
   * Extraire et organiser les catégories depuis les chaînes
   * PRESERVE les vraies catégories M3U comme IPTV Smarters
   */
  extractCategories(channels: Channel[]): CategoryMapping {
    const categoryMap: CategoryMapping = {};
    const categoryCounts: {[key: string]: number} = {};

    // Compter les chaînes par catégorie EXACTE du M3U
    channels.forEach(channel => {
      const rawCategory = channel.category || 'Uncategorized';
      categoryCounts[rawCategory] = (categoryCounts[rawCategory] || 0) + 1;
    });

    // Créer les objets CategoryInfo en PRESERVANT les noms originaux
    Object.entries(categoryCounts).forEach(([rawCategory, count]) => {
      // Utiliser la catégorie EXACTE du M3U comme nom d'affichage
      const displayName =
        rawCategory === 'Uncategorized' ? 'Uncategorized' : rawCategory;
      const categoryId = rawCategory.toLowerCase().replace(/[^a-z0-9]/g, '-');

      // Essayer de détecter le type pour couleur/icône
      const categoryType = this.detectCategoryType(rawCategory);
      const mapping =
        this.categoryMappings[categoryType] || this.categoryMappings.general;

      categoryMap[categoryId] = {
        id: categoryId,
        name: displayName, // NOM EXACT du M3U !
        normalizedName: rawCategory,
        color: mapping?.color || '#757575',
        icon: mapping?.icon || 'tv',
        channelCount: count,
        priority: mapping?.priority || 10,
      };
    });

    console.log(
      `🏷️ Extracted ${
        Object.keys(categoryMap).length
      } REAL M3U categories from ${channels.length} channels`,
    );
    return categoryMap;
  }

  /**
   * Détecter le type de catégorie pour couleur/icône
   */
  private detectCategoryType(categoryName: string): string {
    const lower = categoryName.toLowerCase();

    if (lower.includes('sport')) {
      return 'sport';
    }
    if (lower.includes('news') || lower.includes('info')) {
      return 'news';
    }
    if (
      lower.includes('movie') ||
      lower.includes('cinema') ||
      lower.includes('film')
    ) {
      return 'movies';
    }
    if (lower.includes('entertainment') || lower.includes('divertissement')) {
      return 'entertainment';
    }
    if (lower.includes('music') || lower.includes('radio')) {
      return 'music';
    }
    if (
      lower.includes('kids') ||
      lower.includes('enfant') ||
      lower.includes('cartoon')
    ) {
      return 'kids';
    }
    if (lower.includes('doc')) {
      return 'documentary';
    }
    if (
      lower.includes('lifestyle') ||
      lower.includes('cooking') ||
      lower.includes('travel')
    ) {
      return 'lifestyle';
    }

    return 'general';
  }

  /**
   * Obtenir les catégories triées par priorité
   */
  getSortedCategories(categoryMapping: CategoryMapping): CategoryInfo[] {
    return Object.values(categoryMapping).sort((a, b) => {
      // Trier par priorité puis par nombre de chaînes
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return b.channelCount - a.channelCount;
    });
  }

  /**
   * Filtrer les chaînes par catégorie
   */
  filterChannelsByCategory(channels: Channel[], categoryId: string): Channel[] {
    if (categoryId === 'all') {
      return channels;
    }

    const targetCategory = this.findCategoryMatch(categoryId);

    return channels.filter(channel => {
      const channelCategory = (channel.category || 'Uncategorized')
        .toLowerCase()
        .trim();
      const normalizedChannelCategory = this.normalizeCategory(channelCategory);

      return (
        normalizedChannelCategory.toLowerCase() ===
          targetCategory.toLowerCase() ||
        channelCategory === categoryId.toLowerCase()
      );
    });
  }

  /**
   * Normaliser le nom de catégorie
   */
  private normalizeCategory(category: string): string {
    const normalized = category.toLowerCase().trim();

    // Chercher une correspondance exacte
    if (this.categoryMappings[normalized]) {
      return (
        this.categoryMappings[normalized].name ||
        this.capitalizeCategory(category)
      );
    }

    // Chercher une correspondance partielle
    for (const [key, mapping] of Object.entries(this.categoryMappings)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return mapping.name || this.capitalizeCategory(category);
      }
    }

    return this.capitalizeCategory(category);
  }

  /**
   * Trouver la correspondance de catégorie
   */
  private findCategoryMatch(categoryId: string): string {
    const mapping = this.categoryMappings[categoryId.toLowerCase()];
    return mapping?.name || this.capitalizeCategory(categoryId);
  }

  /**
   * Capitaliser proprement une catégorie
   */
  private capitalizeCategory(category: string): string {
    return category
      .split(/[\s\-_]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Obtenir la couleur d'une catégorie
   */
  getCategoryColor(categoryName: string): string {
    const normalized = categoryName.toLowerCase();
    const mapping = this.categoryMappings[normalized];
    return mapping?.color || '#757575';
  }

  /**
   * Obtenir l'icône d'une catégorie
   */
  getCategoryIcon(categoryName: string): string {
    const normalized = categoryName.toLowerCase();
    const mapping = this.categoryMappings[normalized];
    return mapping?.icon || 'tv';
  }

  /**
   * Obtenir les statistiques des catégories
   */
  getCategoryStats(channels: Channel[]): {
    totalCategories: number;
    totalChannels: number;
    avgChannelsPerCategory: number;
  } {
    const categories = this.extractCategories(channels);
    const totalCategories = Object.keys(categories).length;
    const totalChannels = channels.length;
    const avgChannelsPerCategory = Math.round(totalChannels / totalCategories);

    return {
      totalCategories,
      totalChannels,
      avgChannelsPerCategory,
    };
  }
}

// Export singleton instance
export const categoryService = CategoryService.getInstance();
