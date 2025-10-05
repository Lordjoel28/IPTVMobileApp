/**
 * 🔤 TextUtils - Utilitaires pour normalisation et recherche de texte
 * Optimisé pour la recherche vocale française avec gestion des accents
 */

import type { Channel } from '../types';

/**
 * Normalise un texte pour la recherche
 * - Supprime les accents
 * - Convertit en minuscules
 * - Supprime espaces multiples et caractères spéciaux
 */
export const normalizeText = (text: string): string => {
  if (!text) return '';

  return text
    // Supprimer les accents français
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Convertir en minuscules
    .toLowerCase()
    // Supprimer caractères spéciaux sauf lettres, chiffres et espaces
    .replace(/[^a-z0-9\s]/g, ' ')
    // Supprimer espaces multiples
    .replace(/\s+/g, ' ')
    // Trim
    .trim();
};

/**
 * Nettoie une chaîne de recherche vocale
 * Gère les spécificités de la reconnaissance vocale française
 */
export const cleanVoiceInput = (voiceText: string): string => {
  if (!voiceText) return '';

  let cleaned = voiceText;

  // Remplacements spécifiques à la reconnaissance vocale française
  const voiceReplacements: Record<string, string> = {
    // Chiffres en lettres
    'un': '1',
    'deux': '2',
    'trois': '3',
    'quatre': '4',
    'cinq': '5',
    'six': '6',
    'sept': '7',
    'huit': '8',
    'neuf': '9',
    'dix': '10',

    // Mots communs mal reconnus
    'chaîne': 'chaine',
    'télé': 'tele',
    'télévision': 'television',
    'émission': 'emission',

    // Noms de chaînes courantes avec variantes de reconnaissance
    'france deux': 'france 2',
    'france trois': 'france 3',
    'france quatre': 'france 4',
    'france cinq': 'france 5',
    'tf un': 'tf1',
    'tf1': 'tf1',
    'canal plus': 'canal+',
    'canal +': 'canal+',
    'm six': 'm6',
    'bfm': 'bfm',
    'arte': 'arte',
    'eurosport': 'eurosport',
  };

  // Appliquer les remplacements
  Object.entries(voiceReplacements).forEach(([key, value]) => {
    const regex = new RegExp(`\\b${key}\\b`, 'gi');
    cleaned = cleaned.replace(regex, value);
  });

  // Normaliser le résultat
  return normalizeText(cleaned);
};

/**
 * Filtre un tableau de chaînes en temps réel
 * Utilise une recherche floue optimisée
 */
export const filterChannels = (
  channels: Channel[],
  searchText: string,
  options: {
    maxResults?: number;
    fuzzyTolerance?: number;
    searchInGroup?: boolean;
    searchInCategory?: boolean;
  } = {}
): Channel[] => {
  if (!searchText || !channels.length) {
    return channels.slice(0, options.maxResults || 100);
  }

  const normalizedSearch = normalizeText(searchText);
  const searchWords = normalizedSearch.split(' ').filter(word => word.length > 0);

  if (searchWords.length === 0) {
    return channels.slice(0, options.maxResults || 100);
  }

  const results: { channel: Channel; score: number }[] = [];

  channels.forEach(channel => {
    let score = 0;
    const channelName = normalizeText(channel.name);
    const channelGroup = options.searchInGroup ? normalizeText(channel.group || '') : '';
    const channelCategory = options.searchInCategory ? normalizeText(channel.category || '') : '';

    // Recherche exacte dans le nom (score maximal)
    if (channelName.includes(normalizedSearch)) {
      score += 100;
    }

    // Recherche par mots dans le nom
    let wordsFound = 0;
    searchWords.forEach(word => {
      if (channelName.includes(word)) {
        wordsFound++;
        score += 50;
      }

      // Recherche au début du nom (bonus)
      if (channelName.startsWith(word)) {
        score += 25;
      }
    });

    // Bonus si tous les mots sont trouvés
    if (wordsFound === searchWords.length) {
      score += 30;
    }

    // Recherche dans le groupe (score moindre)
    if (options.searchInGroup && channelGroup) {
      if (channelGroup.includes(normalizedSearch)) {
        score += 20;
      }
      searchWords.forEach(word => {
        if (channelGroup.includes(word)) {
          score += 10;
        }
      });
    }

    // Recherche dans la catégorie (score moindre)
    if (options.searchInCategory && channelCategory) {
      if (channelCategory.includes(normalizedSearch)) {
        score += 15;
      }
      searchWords.forEach(word => {
        if (channelCategory.includes(word)) {
          score += 8;
        }
      });
    }

    // Recherche floue pour la tolérance aux erreurs vocales
    if (options.fuzzyTolerance && score === 0) {
      const fuzzyScore = calculateFuzzyScore(channelName, normalizedSearch, options.fuzzyTolerance);
      if (fuzzyScore > 0) {
        score = fuzzyScore;
      }
    }

    if (score > 0) {
      results.push({ channel, score });
    }
  });

  // Trier par score décroissant et prendre les meilleurs résultats
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, options.maxResults || 50)
    .map(result => result.channel);
};

/**
 * Calcule un score de recherche floue (Levenshtein simplifié)
 */
const calculateFuzzyScore = (text: string, search: string, tolerance: number): number => {
  if (search.length === 0) return 0;
  if (text.length === 0) return 0;

  // Recherche de sous-chaînes avec tolérance
  for (let i = 0; i <= text.length - search.length; i++) {
    const substring = text.substr(i, search.length);
    const distance = levenshteinDistance(substring, search);

    if (distance <= tolerance) {
      // Score inversement proportionnel à la distance
      return Math.max(1, 20 - (distance * 5));
    }
  }

  return 0;
};

/**
 * Calcule la distance de Levenshtein entre deux chaînes
 */
const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
};

/**
 * Extrait des mots-clés pertinents d'un texte vocal
 * Utile pour générer des suggestions intelligentes
 */
export const extractKeywords = (text: string): string[] => {
  const normalized = normalizeText(text);
  const words = normalized.split(' ').filter(word => word.length > 2);

  // Supprimer les mots vides français
  const stopWords = [
    'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'et', 'ou', 'avec',
    'pour', 'sur', 'dans', 'par', 'sans', 'vers', 'chez', 'entre', 'avant',
    'apres', 'pendant', 'depuis', 'jusqu', 'chaine', 'chaines', 'television',
    'tele', 'tv', 'emission', 'programme', 'regarder', 'voir', 'chercher'
  ];

  return words.filter(word => !stopWords.includes(word) && word.length > 2);
};

/**
 * Génère des suggestions de recherche basées sur les chaînes disponibles
 */
export const generateSearchSuggestions = (
  channels: Channel[],
  partialText: string,
  maxSuggestions: number = 8
): string[] => {
  if (!partialText || partialText.length < 2) return [];

  const normalized = normalizeText(partialText);
  const suggestions = new Set<string>();

  channels.forEach(channel => {
    const channelName = normalizeText(channel.name);

    // Suggestions basées sur le début du nom
    if (channelName.startsWith(normalized)) {
      suggestions.add(channel.name);
    }

    // Suggestions basées sur les mots contenus
    if (channelName.includes(normalized) && suggestions.size < maxSuggestions) {
      suggestions.add(channel.name);
    }

    // Suggestions basées sur le groupe
    if (channel.group) {
      const groupName = normalizeText(channel.group);
      if (groupName.includes(normalized) && suggestions.size < maxSuggestions) {
        suggestions.add(channel.group);
      }
    }
  });

  return Array.from(suggestions).slice(0, maxSuggestions);
};