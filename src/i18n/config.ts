/**
 * 🌐 Configuration react-i18next avec namespaces complets
 * Toutes les langues (FR, EN, ES, AR) avec 9 namespaces
 */

import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGE_KEY = '@app_language';

// Import FR
import commonFr from './locales/fr/common.json';
import settingsFr from './locales/fr/settings.json';
import playerFr from './locales/fr/player.json';
import channelsFr from './locales/fr/channels.json';
import profilesFr from './locales/fr/profiles.json';
import playlistsFr from './locales/fr/playlists.json';
import parentalFr from './locales/fr/parental.json';
import epgFr from './locales/fr/epg.json';
import themesFr from './locales/fr/themes.json';
import speedtestFr from './locales/fr/speedtest.json';

// Import EN
import commonEn from './locales/en/common.json';
import settingsEn from './locales/en/settings.json';
import playerEn from './locales/en/player.json';
import channelsEn from './locales/en/channels.json';
import profilesEn from './locales/en/profiles.json';
import playlistsEn from './locales/en/playlists.json';
import parentalEn from './locales/en/parental.json';
import epgEn from './locales/en/epg.json';
import themesEn from './locales/en/themes.json';
import speedtestEn from './locales/en/speedtest.json';

// Import ES
import commonEs from './locales/es/common.json';
import settingsEs from './locales/es/settings.json';
import playerEs from './locales/es/player.json';
import channelsEs from './locales/es/channels.json';
import profilesEs from './locales/es/profiles.json';
import playlistsEs from './locales/es/playlists.json';
import parentalEs from './locales/es/parental.json';
import epgEs from './locales/es/epg.json';
import themesEs from './locales/es/themes.json';
import speedtestEs from './locales/es/speedtest.json';

// Import AR
import commonAr from './locales/ar/common.json';
import settingsAr from './locales/ar/settings.json';
import playerAr from './locales/ar/player.json';
import channelsAr from './locales/ar/channels.json';
import profilesAr from './locales/ar/profiles.json';
import playlistsAr from './locales/ar/playlists.json';
import parentalAr from './locales/ar/parental.json';
import epgAr from './locales/ar/epg.json';
import themesAr from './locales/ar/themes.json';
import speedtestAr from './locales/ar/speedtest.json';

// Initialiser immédiatement avec la langue par défaut
i18n
  .use(initReactI18next)
  .init({
    // Ressources complètes pour toutes les langues
    resources: {
      fr: {
        common: commonFr,
        settings: settingsFr,
        player: playerFr,
        channels: channelsFr,
        profiles: profilesFr,
        playlists: playlistsFr,
        parental: parentalFr,
        epg: epgFr,
        themes: themesFr,
        speedtest: speedtestFr,
      },
      en: {
        common: commonEn,
        settings: settingsEn,
        player: playerEn,
        channels: channelsEn,
        profiles: profilesEn,
        playlists: playlistsEn,
        parental: parentalEn,
        epg: epgEn,
        themes: themesEn,
        speedtest: speedtestEn,
      },
      es: {
        common: commonEs,
        settings: settingsEs,
        player: playerEs,
        channels: channelsEs,
        profiles: profilesEs,
        playlists: playlistsEs,
        parental: parentalEs,
        epg: epgEs,
        themes: themesEs,
        speedtest: speedtestEs,
      },
      ar: {
        common: commonAr,
        settings: settingsAr,
        player: playerAr,
        channels: channelsAr,
        profiles: profilesAr,
        playlists: playlistsAr,
        parental: parentalAr,
        epg: epgAr,
        themes: themesAr,
        speedtest: speedtestAr,
      },
    },

    // Langue par défaut
    lng: 'fr',
    fallbackLng: 'fr',

    // Namespace par défaut
    defaultNS: 'common',

    // Tous les namespaces disponibles
    ns: [
      'common',
      'settings',
      'player',
      'channels',
      'profiles',
      'playlists',
      'parental',
      'epg',
      'themes',
      'speedtest',
    ],

    // Interpolation
    interpolation: {
      escapeValue: false,
    },

    // React Native
    react: {
      useSuspense: false,
    },

    // Debug
    debug: __DEV__,

    // Format compatible
    compatibilityJSON: 'v3',
  });

// Charger la langue sauvegardée après l'initialisation
AsyncStorage.getItem(LANGUAGE_KEY).then(savedLang => {
  if (savedLang && savedLang !== i18n.language) {
    console.log('🌐 Restauration langue sauvegardée:', savedLang);
    i18n.changeLanguage(savedLang);
  }
});

export default i18n;
