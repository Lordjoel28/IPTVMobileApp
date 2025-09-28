/**
 * 🌍 useGlobalImmersion - Hook global pour gérer l'immersion avec StatusBarManager
 * MIGRATION : Ancien code remplacé par StatusBarManager centralisé
 * Compatible SafeAreaProvider pour transitions fluides
 */

import { usePlayerStatusBar } from './useStatusBar';
import { usePlayerStore } from '../stores/PlayerStore';

export const useGlobalImmersion = () => {
  const { isVisible: isPipVisible, isFullscreen } = usePlayerStore();

  // Déléguer au nouveau hook centralisé
  usePlayerStatusBar(isFullscreen, isPipVisible, 'GlobalImmersion');
};
