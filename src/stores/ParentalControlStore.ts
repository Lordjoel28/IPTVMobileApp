/**
 * 🔒 ParentalControlStore - Zustand Store
 * Gestion globale des catégories déverrouillées
 * Partagé entre ChannelsScreen et ChannelPlayerScreen
 */

import {create} from 'zustand';

export interface ParentalControlStoreState {
  // État
  unlockedCategories: Set<string>;
  currentUnlockedCategory: string | null;
  version: number; // 🔄 Compteur de version pour forcer les rerenders React

  // Actions
  unlockCategory: (categoryName: string) => void;
  unlockAllCategories: (categories: string[]) => void;
  lockAll: () => void;
  isUnlocked: (categoryName: string) => boolean;
  setCurrentUnlockedCategory: (categoryName: string | null) => void;
}

// 🔧 Fonction de normalisation pour comparer les noms de catégories
const normalizeCategoryName = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s*\|\s*/g, '-')  // "AF | AFRICA" → "af-africa"
    .replace(/\s*-\s*/g, '-')   // "AF - AFRICA" → "af-africa"
    .replace(/\s+/g, '-');      // Espaces multiples → tiret
};

export const useParentalControlStore = create<ParentalControlStoreState>((set, get) => ({
  // État initial
  unlockedCategories: new Set<string>(),
  currentUnlockedCategory: null,
  version: 0,

  // Actions
  unlockCategory: (categoryName: string) => {
    set(state => {
      const newUnlocked = new Set(state.unlockedCategories);
      newUnlocked.add(categoryName);
      console.log(`🔓 [STORE] Catégorie déverrouillée: "${categoryName}"`);
      return {
        unlockedCategories: newUnlocked,
        currentUnlockedCategory: categoryName,
        version: state.version + 1, // 🔄 Incrémenter version pour forcer rerender
      };
    });
  },

  unlockAllCategories: (categories: string[]) => {
    set(state => {
      const newUnlocked = new Set(state.unlockedCategories);
      categories.forEach(cat => newUnlocked.add(cat));
      console.log(`🌐 [STORE] ${categories.length} catégories déverrouillées globalement`);
      return {
        unlockedCategories: newUnlocked,
        currentUnlockedCategory: 'ALL_CATEGORIES',
        version: state.version + 1, // 🔄 Incrémenter version pour forcer rerender
      };
    });
  },

  lockAll: () => {
    console.log(`🔒 [STORE] Reverrouillage de toutes les catégories`);
    set(state => ({
      unlockedCategories: new Set<string>(),
      currentUnlockedCategory: null,
      version: state.version + 1, // 🔄 Incrémenter version pour forcer rerender
    }));
  },

  isUnlocked: (categoryName: string): boolean => {
    const state = get();
    const normalizedCategory = normalizeCategoryName(categoryName);

    // 🚀 Vérifier si la catégorie est déverrouillée (avec normalisation) - ULTRA RAPIDE
    const unlocked = Array.from(state.unlockedCategories).some(unlocked =>
      normalizeCategoryName(unlocked) === normalizedCategory
    );

    return unlocked;
  },

  setCurrentUnlockedCategory: (categoryName: string | null) => {
    set({ currentUnlockedCategory: categoryName });
  },
}));
