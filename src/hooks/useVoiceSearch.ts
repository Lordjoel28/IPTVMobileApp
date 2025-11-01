/**
 * 🎤 useVoiceSearch - Hook personnalisé pour recherche vocale
 * Gestion complète de @react-native-voice/voice avec permissions et normalisation
 */

import {useState, useEffect, useCallback, useRef} from 'react';
import {Platform, Alert, Linking} from 'react-native';
import Voice, {
  SpeechRecognizedEvent,
  SpeechResultsEvent,
  SpeechErrorEvent,
  SpeechStartEvent,
  SpeechEndEvent,
} from '@react-native-voice/voice';
import {cleanVoiceInput} from '../utils/textUtils';

export interface VoiceSearchState {
  isListening: boolean;
  isAvailable: boolean;
  hasPermission: boolean;
  results: string[];
  partialResults: string[];
  error: string | null;
  isInitialized: boolean;
}

export interface VoiceSearchConfig {
  locale?: string;
  maxAlternatives?: number;
  partialResults?: boolean;
  continuousMode?: boolean;
  timeout?: number;
}

export interface VoiceSearchCallbacks {
  onResult?: (text: string, allResults: string[]) => void;
  onPartialResult?: (text: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

const DEFAULT_CONFIG: VoiceSearchConfig = {
  locale: 'fr-FR',
  maxAlternatives: 3,
  partialResults: true,
  continuousMode: false,
  timeout: 10000, // 10 secondes
};

export const useVoiceSearch = (
  config: VoiceSearchConfig = {},
  callbacks: VoiceSearchCallbacks = {},
) => {
  const finalConfig = {...DEFAULT_CONFIG, ...config};

  const [state, setState] = useState<VoiceSearchState>({
    isListening: false,
    isAvailable: false,
    hasPermission: false,
    results: [],
    partialResults: [],
    error: null,
    isInitialized: false,
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const callbacksRef = useRef(callbacks);

  // Toujours garder les callbacks à jour
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  // Safe state update (évite les warnings si le composant est démonté)
  const safeSetState = useCallback((updates: Partial<VoiceSearchState>) => {
    if (mountedRef.current) {
      setState(prev => ({...prev, ...updates}));
    }
  }, []);

  // 📱 Vérification des permissions
  const checkPermissions = async (): Promise<boolean> => {
    try {
      const available = await Voice.isAvailable();
      console.log('🎤 [VoiceSearch] Service disponible:', available);

      if (!available) {
        safeSetState({
          isAvailable: false,
          error: 'Service de reconnaissance vocale non disponible',
        });
        return false;
      }

      // Sur Android, supposer que les permissions sont accordées si le service est disponible
      // Ne pas tester en démarrant réellement la reconnaissance
      if (Platform.OS === 'android') {
        // Simplement marquer comme disponible, les permissions seront vérifiées au premier usage
        safeSetState({isAvailable: true, hasPermission: true});
        return true;
      }

      safeSetState({isAvailable: true, hasPermission: true});
      return true;
    } catch (error: any) {
      console.error('🎤 [VoiceSearch] Erreur vérification permissions:', error);
      safeSetState({
        isAvailable: false,
        hasPermission: false,
        error: error.message || 'Erreur inconnue',
      });
      return false;
    }
  };

  // 🔧 Initialisation du service Voice
  const initializeVoice = async () => {
    try {
      console.log('🎤 [VoiceSearch] Initialisation...');

      // Détruire toute session existante
      await Voice.destroy();

      // Event listeners
      Voice.onSpeechStart = (event: SpeechStartEvent) => {
        console.log('🎤 [VoiceSearch] Début reconnaissance');
        safeSetState({isListening: true, error: null});
        callbacksRef.current.onStart?.();
      };

      Voice.onSpeechRecognized = (event: SpeechRecognizedEvent) => {
        console.log('🎤 [VoiceSearch] Parole détectée');
      };

      Voice.onSpeechEnd = (event: SpeechEndEvent) => {
        console.log('🎤 [VoiceSearch] Fin reconnaissance');
        safeSetState({isListening: false});

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        callbacksRef.current.onEnd?.();
      };

      Voice.onSpeechError = (event: SpeechErrorEvent) => {
        let errorMessage =
          event.error?.message || 'Erreur de reconnaissance vocale';

        // Gestion spécifique des codes d'erreur courants (sans logs)
        if (event.error?.code === '7' || errorMessage.includes('No match')) {
          errorMessage = 'Aucune parole détectée';
        } else if (
          event.error?.code === '11' ||
          errorMessage.includes("Didn't understand")
        ) {
          errorMessage = 'Parole non comprise. Répétez plus clairement.';
        } else if (
          event.error?.code === '6' ||
          errorMessage.includes('No network')
        ) {
          errorMessage = 'Erreur réseau. Vérifiez votre connexion internet.';
        } else if (
          event.error?.code === '9' ||
          errorMessage.includes('Insufficient permissions')
        ) {
          errorMessage = 'Permission microphone requise';
        } else {
          // Logs seulement pour les erreurs vraiment critiques/inattendues
          console.error('🎤 [VoiceSearch] Erreur critique:', event.error);
        }

        safeSetState({
          isListening: false,
          error: errorMessage,
        });

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        callbacksRef.current.onError?.(errorMessage);
      };

      Voice.onSpeechResults = (event: SpeechResultsEvent) => {
        console.log('🎤 [VoiceSearch] Résultats finaux:', event.value);

        if (event.value && event.value.length > 0) {
          const cleanedResults = event.value.map(result =>
            cleanVoiceInput(result),
          );
          const bestResult = cleanedResults[0];

          safeSetState({
            results: cleanedResults,
            isListening: false,
          });

          callbacksRef.current.onResult?.(bestResult, cleanedResults);
        }
      };

      Voice.onSpeechPartialResults = (event: SpeechResultsEvent) => {
        console.log('🎤 [VoiceSearch] Résultats partiels:', event.value);

        if (
          finalConfig.partialResults &&
          event.value &&
          event.value.length > 0
        ) {
          const cleanedPartials = event.value.map(result =>
            cleanVoiceInput(result),
          );
          const bestPartial = cleanedPartials[0];

          safeSetState({partialResults: cleanedPartials});
          callbacksRef.current.onPartialResult?.(bestPartial);
        }
      };

      // Vérifier les permissions
      const hasPermission = await checkPermissions();

      safeSetState({
        isInitialized: true,
        hasPermission,
      });

      console.log('🎤 [VoiceSearch] Initialisé avec succès');
    } catch (error: any) {
      console.error('🎤 [VoiceSearch] Erreur initialisation:', error);
      safeSetState({
        error: error.message || 'Erreur initialisation',
        isInitialized: true,
      });
    }
  };

  // 🎙️ Démarrer la reconnaissance
  const startListening = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🎤 [VoiceSearch] Démarrage reconnaissance...');

      // Vérifier si déjà en cours
      if (state.isListening) {
        console.log('🎤 [VoiceSearch] Déjà en cours');
        return true;
      }

      // Vérifier les permissions
      if (!state.hasPermission) {
        const hasPermission = await checkPermissions();
        if (!hasPermission) {
          // Proposer d'ouvrir les paramètres
          Alert.alert(
            'Permission requise',
            "L'accès au microphone est nécessaire pour la recherche vocale.",
            [
              {text: 'Annuler', style: 'cancel'},
              {
                text: 'Paramètres',
                onPress: () => {
                  if (Platform.OS === 'ios') {
                    Linking.openURL('app-settings:');
                  } else {
                    Linking.openSettings();
                  }
                },
              },
            ],
          );
          return false;
        }
      }

      // Nettoyer l'état précédent
      safeSetState({
        error: null,
        results: [],
        partialResults: [],
      });

      // Démarrer avec timeout
      await Voice.start(finalConfig.locale);

      // Timeout de sécurité
      if (finalConfig.timeout) {
        timeoutRef.current = setTimeout(() => {
          console.log('🎤 [VoiceSearch] Timeout atteint');
          stopListening();
        }, finalConfig.timeout);
      }

      return true;
    } catch (error: any) {
      console.error('🎤 [VoiceSearch] Erreur démarrage:', error);

      let errorMessage = 'Impossible de démarrer la reconnaissance vocale';

      if (error.message?.includes('permission')) {
        errorMessage = 'Permission microphone refusée';
      } else if (error.message?.includes('network')) {
        errorMessage = 'Erreur réseau. Vérifiez votre connexion.';
      }

      safeSetState({
        error: errorMessage,
        isListening: false,
      });

      callbacksRef.current.onError?.(errorMessage);
      return false;
    }
  }, [
    state.isListening,
    state.hasPermission,
    finalConfig.locale,
    finalConfig.timeout,
  ]);

  // 🛑 Arrêter la reconnaissance
  const stopListening = useCallback(async () => {
    try {
      console.log('🎤 [VoiceSearch] Arrêt reconnaissance...');

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      await Voice.stop();
      safeSetState({isListening: false});
    } catch (error: any) {
      console.error('🎤 [VoiceSearch] Erreur arrêt:', error);
      safeSetState({isListening: false});
    }
  }, []);

  // 🧹 Nettoyer les ressources
  const cleanup = async () => {
    try {
      console.log('🎤 [VoiceSearch] Nettoyage...');

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      await Voice.destroy();
      safeSetState({
        isListening: false,
        results: [],
        partialResults: [],
        error: null,
      });
    } catch (error: any) {
      console.error('🎤 [VoiceSearch] Erreur nettoyage:', error);
    }
  };

  // 🔄 Toggle reconnaissance
  const toggleListening = useCallback(async (): Promise<boolean> => {
    if (state.isListening) {
      await stopListening();
      return false;
    } else {
      return await startListening();
    }
  }, [state.isListening, startListening, stopListening]);

  // Initialisation au montage - une seule fois
  useEffect(() => {
    mountedRef.current = true;
    initializeVoice();

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, []); // Pas de dépendances pour éviter les boucles

  // Nettoyage automatique si le composant reste en écoute trop longtemps
  useEffect(() => {
    if (state.isListening && finalConfig.timeout) {
      const emergencyCleanup = setTimeout(() => {
        console.log("🎤 [VoiceSearch] Nettoyage d'urgence");
        stopListening();
      }, finalConfig.timeout + 5000); // 5s de marge

      return () => clearTimeout(emergencyCleanup);
    }
  }, [state.isListening, finalConfig.timeout, stopListening]);

  return {
    // État
    ...state,

    // Actions
    startListening,
    stopListening,
    toggleListening,
    cleanup,

    // Utilitaires
    checkPermissions,

    // Configuration
    config: finalConfig,
  };
};
