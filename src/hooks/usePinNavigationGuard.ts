/**
 * 🔒 usePinNavigationGuard - Hook pour la vérification PIN avant navigation
 * Basé sur le pattern existant dans ChannelsScreen.tsx
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useI18n } from './useI18n';
import ParentalControlService from '../services/ParentalControlService';
import ProfileService from '../services/ProfileService';
import type { Profile } from '../types';

type NavigationType = 'settings' | 'profiles' | 'playlists';

interface UsePinNavigationGuardOptions {
  navigationType: NavigationType;
  onNavigate: () => void;
  activeProfile?: Profile | null;
}

interface UsePinNavigationGuardReturn {
  triggerNavigation: () => Promise<void>;
  pinModalVisible: boolean;
  pinModalReason: string;
  handlePinSuccess: () => void;
  handlePinCancel: () => void;
}

export const usePinNavigationGuard = ({
  navigationType,
  onNavigate,
  activeProfile
}: UsePinNavigationGuardOptions): UsePinNavigationGuardReturn => {
  const { t: tCommon } = useI18n('common');
  const { t: tParental } = useI18n('parental');

  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinModalReason, setPinModalReason] = useState('');

  /**
   * Détermine si un PIN est requis pour le type de navigation
   */
  const isPinRequired = useCallback(async (): Promise<boolean> => {
    try {
      // Si aucun profil actif, pas de PIN requis
      if (!activeProfile) {
        return false;
      }

      // Vérifier si le contrôle parental est configuré
      const isPinConfigured = await ParentalControlService.isConfigured();
      if (!isPinConfigured) {
        return false;
      }

      // Vérifier selon le type de navigation
      switch (navigationType) {
        case 'settings':
          return await ParentalControlService.requiresPinForSettings(activeProfile);
        case 'profiles':
          return await ParentalControlService.requiresPinForProfile(activeProfile);
        case 'playlists':
          return await ParentalControlService.requiresModalForPlaylist(activeProfile);
        default:
          return false;
      }
    } catch (error) {
      console.error('❌ Erreur vérification PIN requis:', error);
      return false;
    }
  }, [activeProfile, navigationType]);

  /**
   * Obtient le message approprié pour le modal PIN
   */
  const getPinReason = useCallback((): string => {
    switch (navigationType) {
      case 'settings':
        return tParental('requirePinForSettingsDesc');
      case 'profiles':
        return tParental('requirePinForProfileDesc');
      case 'playlists':
        return tParental('requirePinForPlaylistDesc');
      default:
        return tParental('parentalPinRequired');
    }
  }, [navigationType, tParental]);

  /**
   * Gère le succès de la vérification PIN
   */
  const handlePinSuccess = useCallback(() => {
    setPinModalVisible(false);
    onNavigate();
  }, [onNavigate]);

  /**
   * Gère l'annulation du modal PIN
   */
  const handlePinCancel = useCallback(() => {
    setPinModalVisible(false);
  }, []);

  /**
   * Déclenche la navigation avec vérification PIN si nécessaire
   */
  const triggerNavigation = useCallback(async () => {
    try {
      const pinRequired = await isPinRequired();

      if (pinRequired) {
        // Afficher le modal PIN
        setPinModalReason(getPinReason());
        setPinModalVisible(true);
      } else {
        // Navigation directe sans PIN
        onNavigate();
      }
    } catch (error) {
      console.error('❌ Erreur lors de la vérification PIN:', error);
      Alert.alert(
        tCommon('error'),
        tParental('securitySettingUpdateFailed')
      );
    }
  }, [isPinRequired, getPinReason, onNavigate, tCommon, tParental]);

  return {
    triggerNavigation,
    pinModalVisible,
    pinModalReason,
    handlePinSuccess,
    handlePinCancel
  };
};