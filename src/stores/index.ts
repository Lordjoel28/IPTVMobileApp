/**
 * 🏪 Stores Index - Export central Zustand
 * Point d'entrée unique pour tous les stores
 */

// Export des stores individuels
export {usePlaylistStore} from './PlaylistStore';
export {useUserStore} from './UserStore';
export {useThemeStore} from './ThemeStore';

// Types
export type {PlaylistStoreState} from './PlaylistStore';
export type {UserStoreState} from './UserStore';
export type {ThemeStoreState} from './ThemeStore';

/**
 * Hook combiné pour accéder à tous les stores si nécessaire
 * (optionnel - on peut utiliser les stores individuellement)
 */
export const useStores = () => ({
  playlist: usePlaylistStore(),
  user: useUserStore(),
  theme: useThemeStore(),
});

/**
 * Reset de tous les stores (utile pour logout complet)
 */
export const resetAllStores = () => {
  usePlaylistStore.getState().reset();
  useUserStore.getState().reset();
  useThemeStore.getState().reset();
};
