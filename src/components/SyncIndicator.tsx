/**
 * 🔄 SyncIndicator - Indicateur visuel de synchronisation NON-BLOQUANT
 * Style IPTV Smarters Pro / TiviMate
 *
 * Affichage:
 * - Badge discret (top-right) si sync < 5s
 * - Barre de progression (bottom) si sync > 5s
 * - NON-MODAL : UI reste fonctionnelle
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { syncEventEmitter, SyncStatusEvent } from '../services/SyncEventEmitter';
import { useI18n } from '../hooks/useI18n';

const SyncIndicator: React.FC = () => {
  const { t } = useI18n('settings');
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [showProgressBar, setShowProgressBar] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [syncStartTime, setSyncStartTime] = useState<number | null>(null);

  useEffect(() => {
    // Écouter les événements de sync
    const unsubscribeStatus = syncEventEmitter.onSyncStatus(handleSyncStatus);
    const unsubscribeComplete = syncEventEmitter.onSyncComplete(handleSyncComplete);
    const unsubscribeError = syncEventEmitter.onSyncError(handleSyncError);

    return () => {
      // Cleanup: stopper toutes les animations en cours
      fadeAnim.stopAnimation();

      // Unsubscribe des événements
      unsubscribeStatus();
      unsubscribeComplete();
      unsubscribeError();
    };
  }, [fadeAnim]);

  useEffect(() => {
    // Vérifier si on doit afficher barre de progression
    if (isVisible && syncStartTime) {
      const timer = setTimeout(() => {
        const elapsed = Date.now() - syncStartTime;
        if (elapsed > 5000 && isVisible) {
          // Sync > 5s : afficher barre progression
          setShowProgressBar(true);
        }
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, syncStartTime]);

  const lastUpdateRef = useRef<number>(0);
  const THROTTLE_MS = 100; // Maximum 10 updates/seconde

  const handleSyncStatus = (data: SyncStatusEvent) => {
    if (data.isActive) {
      // Démarrage sync
      if (!isVisible) {
        setIsVisible(true);
        setSyncStartTime(Date.now());
        fadeIn();
      }

      // THROTTLE: Ne mettre à jour que toutes les 100ms max
      const now = Date.now();
      if (now - lastUpdateRef.current < THROTTLE_MS) {
        return; // Ignorer cette update (trop rapide)
      }
      lastUpdateRef.current = now;

      // Traduire le message et mettre à jour EN UNE SEULE FOIS
      const translatedMessage = translateMessage(data.message);

      // BATCH les setState avec un seul re-render
      React.startTransition(() => {
        setMessage(translatedMessage);
        setProgress(data.progress || 0);
      });

    } else {
      // Fin sync
      fadeOut();
    }
  };

  /**
   * Traduit les clés de traduction envoyées par le service
   */
  const translateMessage = (message: string): string => {
    // Format simple: "settings:keyName"
    if (message.startsWith('settings:')) {
      const key = message.replace('settings:', '');
      return t(key);
    }

    // Format avec paramètres: "settings:syncEPGProgress|10|50"
    if (message.includes('|')) {
      const [keyPart, ...params] = message.split('|');
      const key = keyPart.replace('settings:', '');

      // Pour syncEPGProgress, params = [count, total]
      if (key === 'syncEPGProgress' && params.length === 2) {
        return t(key, { count: params[0], total: params[1] });
      }
    }

    // Fallback: retourner tel quel
    return message;
  };

  const handleSyncComplete = () => {
    fadeOut();
  };

  const handleSyncError = (data: { error: string }) => {
    setMessage(`❌ ${data.error}`);
    setTimeout(() => {
      fadeOut();
    }, 3000);
  };

  const fadeIn = () => {
    // Stopper animations en cours avant le fadeIn
    fadeAnim.stopAnimation(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  const fadeOut = () => {
    // Stopper toutes les animations en cours avant de commencer le fadeOut
    fadeAnim.stopAnimation(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setIsVisible(false);
        setShowProgressBar(false);
        setSyncStartTime(null);
        setProgress(0);
      });
    });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {showProgressBar ? (
        // Mode barre de progression (sync longue)
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressBarText}>{message}</Text>
        </View>
      ) : (
        // Mode badge discret (sync rapide)
        <View style={styles.badge}>
          <ActivityIndicator size="small" color="#2196F3" />
          <Text style={styles.badgeText}>{message}</Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 9999,
    pointerEvents: 'none', // Ne bloque pas les interactions
  },

  // ===== BADGE DISCRET (top-right) =====
  badge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 50,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
  },

  // ===== BARRE DE PROGRESSION (bottom) =====
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  progressBarBackground: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 2,
  },
  progressBarText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
});

export default SyncIndicator;
