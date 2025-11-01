/**
 * 🔒 ParentalPinModal - Compatibilité pour les anciennes utilisations
 * Redirige vers SimplePinModal
 */

import React from 'react';
import SimplePinModal from './SimplePinModal';
import type {Profile, Channel} from '../types';

interface ParentalPinModalProps {
  visible: boolean;
  onClose: () => void;
  profile: Profile;
  channel?: Channel;
  onSuccess: (temporaryUnlock?: boolean, duration?: number) => void;
  reason?: string;
}

const ParentalPinModal: React.FC<ParentalPinModalProps> = ({
  visible,
  onClose,
  profile,
  channel,
  onSuccess,
  reason,
}) => {
  return (
    <SimplePinModal
      visible={visible}
      profile={profile}
      reason={reason || `Chaîne bloquée : ${channel?.name || ''}`}
      onClose={onClose}
      onSuccess={() => onSuccess(true, 30)} // Déblocage temporaire de 30min par défaut
    />
  );
};

export default ParentalPinModal;