/**
 * 📺 Channel Helpers - Fonctions utilitaires pour la gestion des chaînes
 */

import {Dimensions} from 'react-native';

const {width: screenWidth} = Dimensions.get('window');

/**
 * Normalise les URLs de logos Xtream Codes
 */
export const normalizeXtreamLogoUrl = (
  logoUrl: string,
  serverUrl: string,
): string => {
  if (!logoUrl || logoUrl.trim() === '' || logoUrl === 'null') {
    return '';
  }

  // Déjà une URL complète
  if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
    return logoUrl;
  }

  // Nettoyer l'URL du serveur
  const cleanServerUrl = serverUrl.replace(/\/+$/, '');

  // Cas Xtream typique: chemin simple sans slash
  return `${cleanServerUrl}/${logoUrl}`;
};

/**
 * Calcule la largeur optimale des cartes de chaînes
 */
export const getChannelCardWidth = (
  sidebarVisible: boolean,
  columns: number = 8,
): number => {
  // Calcul précis de l'espace disponible
  const sidebarWidth = sidebarVisible ? screenWidth * 0.32 : 0;
  const availableScreenWidth = screenWidth - sidebarWidth;

  if (sidebarVisible) {
    // Mode sidebar visible : maximiser l'espace disponible
    const containerPadding = 16 * 2;
    const cardMargin = 4;
    const totalMargins = cardMargin * 2 * columns;
    const netWidth = availableScreenWidth - containerPadding - totalMargins;
    const cardWidth = Math.floor(netWidth / columns);
    const minWidth = 88; // Cartes légèrement plus grandes
    return Math.max(cardWidth, minWidth);
  } else {
    // Mode plein écran : utiliser TOUT l'espace avec espacement généreux
    const containerPadding = 8 * 2; // Léger padding aux bords
    const spaceBetweenCards = 6; // Espacement généreux entre cartes
    const totalSpacing = spaceBetweenCards * (columns - 1);
    const netWidth = availableScreenWidth - containerPadding - totalSpacing;
    const cardWidth = Math.floor(netWidth / columns);
    return cardWidth;
  }
};

/**
 * Calcule le nombre de colonnes optimal selon la largeur d'écran
 */
export const getOptimalColumns = (sidebarVisible: boolean): number => {
  const sidebarWidth = sidebarVisible ? screenWidth * 0.32 : 0;
  const availableWidth = screenWidth - sidebarWidth;

  if (availableWidth > 800) return 10;
  if (availableWidth > 600) return 8;
  if (availableWidth > 400) return 6;
  return 4;
};
