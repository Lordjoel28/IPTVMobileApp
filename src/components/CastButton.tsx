/**
 * 📺 CastButton - Bouton Chromecast natif intégré au lecteur vidéo
 * Utilise le composant natif de react-native-google-cast
 */

import React, {useEffect} from 'react';
import {View, ViewStyle} from 'react-native';
import GoogleCast, {CastButton as NativeCastButton} from 'react-native-google-cast';

interface CastButtonProps {
  size?: number;
  color?: string;
  style?: ViewStyle;
  onCastStateChange?: (isConnected: boolean) => void;
}

export const CastButton: React.FC<CastButtonProps> = ({
  size = 24,
  color = 'white',
  style,
  onCastStateChange,
}) => {
  useEffect(() => {
    if (!onCastStateChange) return;

    const sessionManager = GoogleCast.getSessionManager();

    // Écouter les changements d'état de session Cast
    const sessionStartingListener = sessionManager.onSessionStarting(() => {
      console.log('🔵 [CastButton] Session en cours de démarrage...');
    });

    const sessionStartedListener = sessionManager.onSessionStarted((session) => {
      console.log('✅ [CastButton] Session démarrée - ID:', session.id);
      onCastStateChange(true);
    });

    const sessionStartFailedListener = sessionManager.onSessionStartFailed((session, error) => {
      console.log('❌ [CastButton] Échec démarrage session:', error);
      onCastStateChange(false);
    });

    const sessionEndingListener = sessionManager.onSessionEnding(() => {
      console.log('🔴 [CastButton] Session en cours de fermeture...');
    });

    const sessionEndedListener = sessionManager.onSessionEnded((session, error) => {
      console.log('❌ [CastButton] Session terminée - Erreur:', error || 'Aucune');
      onCastStateChange(false);
    });

    const sessionSuspendedListener = sessionManager.onSessionSuspended(() => {
      console.log('⏸️ [CastButton] Session suspendue');
      onCastStateChange(false);
    });

    const sessionResumingListener = sessionManager.onSessionResuming(() => {
      console.log('🔄 [CastButton] Session en cours de reprise...');
    });

    const sessionResumedListener = sessionManager.onSessionResumed(() => {
      console.log('✅ [CastButton] Session reprise');
      onCastStateChange(true);
    });

    // Cleanup listeners
    return () => {
      sessionStartingListener.remove();
      sessionStartedListener.remove();
      sessionStartFailedListener.remove();
      sessionEndingListener.remove();
      sessionEndedListener.remove();
      sessionSuspendedListener.remove();
      sessionResumingListener.remove();
      sessionResumedListener.remove();
    };
  }, [onCastStateChange]);

  return (
    <View style={style}>
      <NativeCastButton
        style={{
          width: size,
          height: size,
          tintColor: color,
        }}
      />
    </View>
  );
};
