/**
 * 🔒 useParentalControl - Hook pour gestion du contrôle parental
 * Facilite l'intégration des vérifications d'accès et indicateurs visuels
 */

import {useState, useEffect, useCallback} from 'react';
import {Alert} from 'react-native';
import ParentalControlService from '../services/ParentalControlService';
import {useUserStore} from '../stores/UserStore';
import ProfileService from '../services/ProfileService';
import type {Channel, Profile} from '../types';

interface UseParentalControlReturn {
  // Vérification d'accès
  checkChannelAccess: (channel: Channel) => Promise<{allowed: boolean; reason?: string}>;
  isChannelRestricted: (channel: Channel) => boolean;

  // États
  isRestrictionActive: boolean;
  currentProfile: Profile | null;

  // Fonctions utilitaires
  getRestrictionReason: (channel: Channel) => string;
  getRestrictionBadgeProps: (channel: Channel) => {
    show: boolean;
    reason?: string;
    isAdult: boolean;
  };

  // Modal PIN
  showPinModal: boolean;
  pendingChannel: Channel | null;
  handlePinModalClose: () => void;
  handlePinSuccess: () => void;
}

export const useParentalControl = (): UseParentalControlReturn => {
  const {currentUser} = useUserStore();
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [isRestrictionActive, setIsRestrictionActive] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingChannel, setPendingChannel] = useState<Channel | null>(null);

  // Charger le profil actif et vérifier si le contrôle parental est actif
  useEffect(() => {
    const loadProfileAndCheckStatus = async () => {
      try {
        // Charger le profil actif depuis ProfileService
        const activeProfile = await ProfileService.getActiveProfile();
        setCurrentProfile(activeProfile);

        const configured = await ParentalControlService.isConfigured();
        const hasActiveProfile = !!activeProfile;
        setIsRestrictionActive(configured && hasActiveProfile);
      } catch (error) {
        console.error('❌ Error checking restriction status:', error);
        setIsRestrictionActive(false);
      }
    };

    loadProfileAndCheckStatus();
  }, [currentUser]); // Recharger quand l'utilisateur change

  // Vérifier l'accès à une chaîne
  const checkChannelAccess = useCallback(async (channel: Channel): Promise<{allowed: boolean; reason?: string}> => {
    if (!isRestrictionActive || !currentProfile) {
      return {allowed: true};
    }

    try {
      const result = await ParentalControlService.checkAccess(channel, currentProfile);

      if (!result.allowed && result.requiresPin) {
        setPendingChannel(channel);
        setShowPinModal(true);
        return {
          allowed: false,
          reason: result.reason || 'Contenu restreint par le contrôle parental'
        };
      }

      return {allowed: true};
    } catch (error) {
      console.error('❌ Error checking channel access:', error);
      return {allowed: true}; // En cas d'erreur, autoriser l'accès
    }
  }, [isRestrictionActive, currentProfile]);

  // Vérifier si une chaîne est restreinte (sans ouvrir de modal)
  const isChannelRestricted = useCallback((channel: Channel): boolean => {
    if (!isRestrictionActive || !currentProfile) {
      return false;
    }

    // Vérifications rapides sans appeler le service complet
    const isAdultContent = ParentalControlService.isAdultContent(channel);
    const hasBlockedCategory = currentProfile.blockedCategories?.includes(channel.category || '');

    return isAdultContent || hasBlockedCategory || false;
  }, [isRestrictionActive, currentProfile]);

  // Obtenir la raison de restriction
  const getRestrictionReason = useCallback((channel: Channel): string => {
    if (!isChannelRestricted(channel)) {
      return '';
    }

    const isAdultContent = ParentalControlService.isAdultContent(channel);
    if (isAdultContent) {
      return 'Contenu pour adultes';
    }

    if (currentProfile?.blockedCategories?.includes(channel.category || '')) {
      return `Catégorie "${channel.category}" bloquée`;
    }

    return 'Contenu restreint';
  }, [isChannelRestricted, currentProfile]);

  // Obtenir les props pour le badge de restriction
  const getRestrictionBadgeProps = useCallback((channel: Channel) => {
    const restricted = isChannelRestricted(channel);
    const isAdult = ParentalControlService.isAdultContent(channel);

    return {
      show: restricted,
      reason: restricted ? getRestrictionReason(channel) : undefined,
      isAdult: restricted && isAdult,
    };
  }, [isChannelRestricted, getRestrictionReason]);

  // Gérer la fermeture du modal PIN
  const handlePinModalClose = useCallback(() => {
    setShowPinModal(false);
    setPendingChannel(null);
  }, []);

  // Gérer le succès du PIN
  const handlePinSuccess = useCallback(() => {
    setShowPinModal(false);
    setPendingChannel(null);
  }, []);

  return {
    // Vérification d'accès
    checkChannelAccess,
    isChannelRestricted,

    // États
    isRestrictionActive,
    currentProfile,

    // Fonctions utilitaires
    getRestrictionReason,
    getRestrictionBadgeProps,

    // Modal PIN
    showPinModal,
    pendingChannel,
    handlePinModalClose,
    handlePinSuccess,
  };
};