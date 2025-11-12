/**
 * 🌐 Hook useI18n - Système i18n avec namespaces
 * Système unique basé sur react-i18next
 */

import {useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import i18n from '../i18n/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGE_KEY = '@app_language';

/**
 * Hook moderne pour tous les écrans
 * Usage: const {t, changeLanguage, currentLanguage} = useI18n('settings');
 */
export const useI18n = (namespace: string = 'common') => {
  const {t, i18n: i18nInstance} = useTranslation(namespace);

  const changeLanguage = async (lng: string) => {
    try {
      // Changer la langue dans i18next
      await i18nInstance.changeLanguage(lng);

      // Sauvegarder dans AsyncStorage
      await AsyncStorage.setItem(LANGUAGE_KEY, lng);

      console.log(`✅ Langue changée: ${lng}`);
    } catch (error) {
      console.error('❌ Erreur changement langue:', error);
    }
  };

  return {
    t,
    currentLanguage: i18nInstance.language,
    changeLanguage,
    isRTL: i18nInstance.language === 'ar',
  };
};

/**
 * Hook pour écrans avec plusieurs namespaces
 * Usage: const {t} = useI18nMultiple(['common', 'settings']);
 */
export const useI18nMultiple = (namespaces: string[]) => {
  const {t, i18n: i18nInstance} = useTranslation(namespaces);

  const changeLanguage = async (lng: string) => {
    try {
      await i18nInstance.changeLanguage(lng);
      await AsyncStorage.setItem(LANGUAGE_KEY, lng);
      console.log(`✅ Langue changée: ${lng}`);
    } catch (error) {
      console.error('❌ Erreur changement langue:', error);
    }
  };

  return {
    t,
    currentLanguage: i18nInstance.language,
    changeLanguage,
    isRTL: i18nInstance.language === 'ar',
  };
};

export default useI18n;
