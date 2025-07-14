/**
 * 🛠️ IPTV Mobile App - Utilitaires
 * Fonctions helper pour l'application IPTV
 */

/**
 * Formate la durée en format lisible
 */
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Génère un ID unique
 */
export const generateId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Valide une URL
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Détermine la qualité d'une chaîne basée sur son nom/URL
 */
export const getChannelQuality = (name: string, url: string): string => {
  const text = `${name} ${url}`.toLowerCase();
  
  if (text.includes('4k') || text.includes('uhd')) return '4K';
  if (text.includes('fhd') || text.includes('1080')) return 'FHD';
  if (text.includes('hd') || text.includes('720')) return 'HD';
  if (text.includes('sd') || text.includes('480')) return 'SD';
  
  return 'AUTO';
};

/**
 * Nettoie le nom d'une chaîne
 */
export const cleanChannelName = (name: string): string => {
  return name
    .replace(/\[.*?\]/g, '') // Supprime [...]
    .replace(/\(.*?\)/g, '') // Supprime (...)
    .replace(/\s+/g, ' ')    // Normalise les espaces
    .trim();
};

/**
 * Extrait le pays d'une chaîne
 */
export const extractCountry = (name: string, group?: string): string | undefined => {
  const text = `${name} ${group || ''}`.toLowerCase();
  
  const countries = {
    'fr': 'France',
    'us': 'USA',
    'uk': 'UK',
    'de': 'Germany',
    'es': 'Spain',
    'it': 'Italy',
    'ca': 'Canada',
  };
  
  for (const [code, country] of Object.entries(countries)) {
    if (text.includes(code) || text.includes(country.toLowerCase())) {
      return country;
    }
  }
  
  return undefined;
};

/**
 * Détermine si une chaîne est pour adultes
 */
export const isAdultChannel = (name: string, group?: string): boolean => {
  const text = `${name} ${group || ''}`.toLowerCase();
  const adultKeywords = ['xxx', 'adult', 'sexy', '+18', 'porn', 'erotic'];
  
  return adultKeywords.some(keyword => text.includes(keyword));
};

/**
 * Formate la taille en format lisible
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

/**
 * Calcule le pourcentage
 */
export const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
};

/**
 * Attendre un délai
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Débounce une fonction
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Groupe un tableau par une clé
 */
export const groupBy = <T>(
  array: T[],
  keyFn: (item: T) => string
): Record<string, T[]> => {
  return array.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<string, T[]>);
};

/**
 * Capitalise la première lettre
 */
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Tronque un texte
 */
export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
};

/**
 * Comparateur pour tri des chaînes
 */
export const sortChannels = (a: any, b: any, sortBy: 'name' | 'category' = 'name'): number => {
  const aValue = (a[sortBy] || '').toLowerCase();
  const bValue = (b[sortBy] || '').toLowerCase();
  
  return aValue.localeCompare(bValue);
};