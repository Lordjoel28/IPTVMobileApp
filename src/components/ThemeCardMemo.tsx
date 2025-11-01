/**
 * 🚀 ThemeCardMemo - Composant optimisé avec memoization
 * Version performance des cartes de thème pour listes longues
 */

import React, {memo, useCallback} from 'react';
import ThemePreviewCard from './ThemePreviewCard';
import {Theme} from '../themes/themeConfig';

interface ThemeCardMemoProps {
  theme: Theme;
  isSelected: boolean;
  onSelect: (themeId: string) => void;
  onPreview: (themeId: string) => void;
  showLivePreview?: boolean;
}

const ThemeCardMemo: React.FC<ThemeCardMemoProps> = ({
  theme,
  isSelected,
  onSelect,
  onPreview,
  showLivePreview = false,
}) => {
  // Memoize les callbacks pour éviter les re-renders inutiles
  const handleSelect = useCallback(() => {
    onSelect(theme.id);
  }, [theme.id, onSelect]);

  const handlePreview = useCallback(() => {
    onPreview(theme.id);
  }, [theme.id, onPreview]);

  return (
    <ThemePreviewCard
      theme={theme}
      isSelected={isSelected}
      onSelect={handleSelect}
      onPreview={handlePreview}
      showLivePreview={showLivePreview}
    />
  );
};

// Export du composant memoïzé
export default memo(ThemeCardMemo, (prevProps, nextProps) => {
  // Custom comparison pour optimiser les re-renders
  return (
    prevProps.theme.id === nextProps.theme.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.showLivePreview === nextProps.showLivePreview
  );
});