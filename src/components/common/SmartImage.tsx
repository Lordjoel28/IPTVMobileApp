/**
 * 🖼️ SmartImage - Composant Image intelligent pour IPTV
 * Features:
 * - Fallbacks automatiques sur erreur
 * - Retry intelligent avec délai exponentiel
 * - Validation d'URL et nettoyage
 * - Cache optimisé pour IPTV logos
 */

import React, {useState, useEffect} from 'react';
import {Image, ImageStyle, ImageSourcePropType} from 'react-native';

interface SmartImageProps {
  uri: string;
  style?: ImageStyle;
  fallbackUris?: string[]; // URLs de fallback
  placeholder?: ImageSourcePropType;
  timeout?: number;
  retryDelay?: number;
  maxRetries?: number;
  onLoad?: () => void;
  onError?: (error: any) => void;
  onFinalError?: () => void; // Appelé quand tous les fallbacks échouent
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  fadeDuration?: number;
}

const SmartImage: React.FC<SmartImageProps> = ({
  uri,
  style,
  fallbackUris = [],
  placeholder,
  timeout = 8000,
  retryDelay = 2000,
  maxRetries = 2,
  onLoad,
  onError,
  onFinalError,
  resizeMode = 'contain',
  fadeDuration = 300,
}) => {
  const [currentUriIndex, setCurrentUriIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Construire la liste complète des URIs (principale + fallbacks)
  const allUris = [uri, ...fallbackUris].filter(
    url => url && url.trim() !== '',
  );
  const currentUri = allUris[currentUriIndex];

  // Fonction de nettoyage URL
  const sanitizeUri = (url: string): string => {
    if (!url) {
      return '';
    }

    let clean = url.trim();

    // Corriger les protocoles manquants
    if (clean.startsWith('//')) {
      clean = `https:${clean}`;
    }

    // Encoder les caractères spéciaux dans l'URL
    try {
      const urlObj = new URL(clean);
      return urlObj.toString();
    } catch {
      return clean; // Retourner tel quel si parsing échoue
    }
  };

  // Reset lors du changement d'URI principale
  useEffect(() => {
    setCurrentUriIndex(0);
    setHasError(false);
    setRetryCount(0);
    setIsLoading(true);
  }, [uri]);

  // Gestion des erreurs avec fallback automatique
  const handleError = (error: any) => {
    console.log(`🚫 SmartImage error for URI ${currentUriIndex}:`, error);

    if (onError) {
      onError(error);
    }

    // Essayer l'URI suivante ou retry
    if (currentUriIndex < allUris.length - 1) {
      // Passer à l'URI suivante
      console.log(`🔄 Switching to fallback URI ${currentUriIndex + 1}`);
      setCurrentUriIndex(currentUriIndex + 1);
      setRetryCount(0);
    } else if (retryCount < maxRetries) {
      // Retry avec délai exponentiel
      const delay = retryDelay * Math.pow(2, retryCount);
      console.log(`🔄 Retry attempt ${retryCount + 1} in ${delay}ms`);

      setTimeout(() => {
        setRetryCount(retryCount + 1);
        setHasError(false);
      }, delay);
    } else {
      // Tous les fallbacks et retries ont échoué
      console.log('❌ All URIs failed for SmartImage');
      setHasError(true);
      setIsLoading(false);

      if (onFinalError) {
        onFinalError();
      }
    }
  };

  // Gestion du succès de chargement
  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);

    if (onLoad) {
      onLoad();
    }

    console.log(`✅ SmartImage loaded successfully: URI ${currentUriIndex}`);
  };

  // Ne pas rendre si toutes les URIs ont échoué
  if (
    hasError &&
    currentUriIndex >= allUris.length - 1 &&
    retryCount >= maxRetries
  ) {
    return null;
  }

  // Ne pas rendre si pas d'URI valide
  if (!currentUri) {
    return null;
  }

  const cleanUri = sanitizeUri(currentUri);
  if (!cleanUri) {
    return null;
  }

  return (
    <Image
      source={{
        uri: cleanUri,
        headers: {
          'User-Agent': 'IPTV-Player/1.0',
          Accept:
            'image/webp,image/apng,image/png,image/jpg,image/jpeg,image/gif,*/*;q=0.8',
          'Cache-Control': 'max-age=3600', // Cache 1 heure
        },
      }}
      style={style}
      resizeMode={resizeMode}
      fadeDuration={fadeDuration}
      onLoad={handleLoad}
      onError={handleError}
      defaultSource={placeholder}
      progressiveRenderingEnabled={true}
      loadingIndicatorSource={placeholder}
    />
  );
};

export default SmartImage;
