/**
 * 📋 PlaylistsScreenWithPin - Wrapper pour PlaylistsScreen avec vérification PIN
 * Protège l'accès aux playlists si le contrôle parental l'exige
 */

import React, { useState, useEffect } from 'react';
import PlaylistsScreen from '../screens/PlaylistsScreen';
import SimplePinModal from './SimplePinModal';
import { usePinNavigationGuard } from '../hooks/usePinNavigationGuard';
import ProfileService from '../services/ProfileService';
import type { Profile } from '../types';

const PlaylistsScreenWithPin: React.FC = () => {
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [showPlaylists, setShowPlaylists] = useState(false);

  // Hook pour la vérification PIN
  const {
    triggerNavigation,
    pinModalVisible,
    pinModalReason,
    handlePinSuccess,
    handlePinCancel
  } = usePinNavigationGuard({
    navigationType: 'playlists',
    onNavigate: () => {
      setShowPlaylists(true);
    },
    activeProfile: activeProfile
  });

  useEffect(() => {
    // Charger le profil actif au montage du composant
    const loadActiveProfile = async () => {
      try {
        const profile = await ProfileService.getActiveProfile();
        setActiveProfile(profile);
      } catch (error) {
        console.error('❌ Erreur chargement profil actif:', error);
      }
    };

    loadActiveProfile();
  }, []);

  useEffect(() => {
    // Démarrer la vérification PIN dès que le profil est disponible
    if (activeProfile) {
      triggerNavigation();
    }
  }, [activeProfile, triggerNavigation]);

  // Afficher un écran vide si le profil n'est pas encore chargé
  if (!activeProfile) {
    return null;
  }

  return (
    <>
      {showPlaylists && <PlaylistsScreen />}

      <SimplePinModal
        visible={pinModalVisible}
        profile={activeProfile}
        reason={pinModalReason}
        onClose={handlePinCancel}
        onSuccess={handlePinSuccess}
      />
    </>
  );
};

export default PlaylistsScreenWithPin;