# 🌐 Architecture Internationalization (i18n)

## ✅ Système Complet Opérationnel

Cette application dispose maintenant d'un **système i18n complet avec react-i18next** :
- **4 langues** : Français (FR), English (EN), Español (ES), العربية (AR)
- **9 namespaces** : common, settings, player, channels, profiles, playlists, parental, epg, themes
- **446 clés par langue** = **1784 traductions** au total
- **Synchronisation automatique** avec l'ancien système pendant la migration

## Pourquoi deux systèmes (temporaire) ?

L'ancien système `LanguageContext` charge **toutes les traductions en mémoire** (~100KB).
Le nouveau système `react-i18next` utilise des **namespaces** pour un chargement plus performant et scalable.

## Architecture du nouveau système

```
src/
├── i18n/
│   ├── config.ts              # Configuration react-i18next
│   ├── locales/
│   │   ├── fr/
│   │   │   ├── common.json    # Traductions communes (boutons, actions)
│   │   │   └── settings.json  # Traductions paramètres
│   │   └── en/
│   │       ├── common.json
│   │       └── settings.json
│   └── README.md             # Ce fichier
└── hooks/
    └── useI18n.ts            # Hook pour utiliser react-i18next
```

## Utilisation

### Ancien système (toujours actif)

```tsx
import { useLanguage } from '../contexts/LanguageContext';

const MyComponent = () => {
  const { t } = useLanguage();

  return <Text>{t.settings}</Text>;
};
```

### Nouveau système (pour nouveaux écrans ou migration)

```tsx
import { useI18n } from '../hooks/useI18n';

const MyNewComponent = () => {
  // Un seul namespace
  const { t } = useI18n('common');

  return <Text>{t('settings')}</Text>;
};
```

#### Avec plusieurs namespaces

```tsx
import { useI18nMultiple } from '../hooks/useI18n';

const MyComponent = () => {
  const { t } = useI18nMultiple(['common', 'settings']);

  return (
    <>
      <Text>{t('common:save')}</Text>
      <Text>{t('settings:themes')}</Text>
    </>
  );
};
```

## Namespaces disponibles

### 📦 `common` (78 clés) - Traductions communes
- Boutons : `save`, `cancel`, `ok`, `yes`, `no`, `reset`
- Actions : `add`, `edit`, `delete`, `search`, `select`, `connect`
- États : `loading`, `error`, `success`, `disabled`, `active`, `online`
- Navigation : `settings`, `back`, `home`, `logout`

### 📦 `settings` (42 clés) - Paramètres
- Sections : `themes`, `videoPlayer`, `tvGuide`, `app`, `account`
- Options : `parental`, `language`, `help`, `speedTest`
- Configuration : `autoplayLabel`, `rememberPositionLabel`, `hardwareAccelerationLabel`

### 📦 `player` (47 clés) - Lecteur vidéo
- Contrôles : `videoTrack`, `audioTrack`, `subtitles`, `displayMode`
- Qualités : `hd`, `fullHD`, `sd`, `low`
- Modes : `fit`, `fill`, `stretch`, `fast`, `normal`, `slow`
- Tailles : `small`, `normalSize`, `large`, `xlarge`

### 📦 `channels` (33 clés) - Chaînes
- Vues : `allChannels`, `favorites`, `recent`, `categories`
- Actions : `addToFavorites`, `removeFromFavorites`, `sort`
- Types : `tv`, `movies`, `series`, `liveEPG`, `catchUp`

### 📦 `profiles` (57 clés) - Profils utilisateurs
- Gestion : `addProfile`, `manageProfiles`, `deleteProfile`
- Types : `standardProfile`, `childProfile`, `kidsProfile`
- Actions : `setAsDefaultProfile`, `editProfileOption`

### 📦 `playlists` (31 clés) - Gestion playlists
- Actions : `addPlaylist`, `deletePlaylist`, `loadPlaylist`
- Types : `xtreamCodes`, `urlM3U`, `localFile`
- États : `loadingPlaylists`, `noPlaylistsFound`

### 📦 `parental` (50 clés) - Contrôle parental
- Configuration : `parentalControl`, `changePin`, `configurePinTitle`
- Actions : `unlock`, `revoke`, `blockProfileSwitch`
- États : `locked`, `unlocked`, `requiresUnlock`

### 📦 `epg` (81 clés) - Guide TV
- Actions : `downloadEPGGlobal`, `refreshEPGGlobal`, `clearCache`
- Sources : `manualEPGSources`, `integratedPlaylistEPG`, `globalEPG`
- États : `downloading`, `upToDate`, `notDownloaded`

### 📦 `themes` (27 clés) - Thèmes
- Noms : `themeDark`, `themeLight`, `themeTivimatePro`
- Descriptions : `themeDarkDesc`, `themeLightDesc`
- Options : `automaticTheme`, `light`, `dark`

## État du système

### ✅ Phase 1 : Infrastructure (TERMINÉE)
- ✅ Installation react-i18next
- ✅ Configuration avec 9 namespaces
- ✅ Hook useI18n avec synchronisation automatique
- ✅ Extraction complète des 446 clés × 4 langues
- ✅ Écran test I18nTestScreen complet

### 🔄 Phase 2 : Migration progressive (EN COURS)
**Prochaines étapes** :
1. Migrer un écran réel (ex: SettingsScreen) vers react-i18next
2. Valider le bon fonctionnement
3. Migrer progressivement les autres écrans
4. Tester avec utilisateurs réels

### 🎯 Phase 3 : Finalisation (À VENIR)
- Supprimer l'ancien LanguageContext une fois tous les écrans migrés
- Optimiser les bundles si nécessaire
- Documentation utilisateur finale

## Tester le système complet

1. Ouvrir l'application
2. Aller dans **Paramètres** (icône engrenage)
3. Cliquer sur **🧪 Test I18n** (dernière carte)
4. **Changer de langue** avec les boutons 🇫🇷 🇬🇧 🇪🇸 🇸🇦
5. Vérifier que :
   - ✅ Tous les namespaces affichent les traductions
   - ✅ Le changement de langue est instantané
   - ✅ L'ancien système se synchronise automatiquement
   - ✅ Les 4 langues fonctionnent correctement

## Avantages du nouveau système

✅ **Scalable** : Charge uniquement les traductions nécessaires par écran
✅ **Performant** : Pas de gros fichier de 200KB+ en mémoire
✅ **Modulaire** : Facile d'ajouter de nouveaux namespaces
✅ **Standard** : Utilise react-i18next (bibliothèque standard)
✅ **Flexible** : Support interpolation, pluriels, contextes
✅ **Compatible** : Coexiste avec l'ancien système pendant la migration

## Notes importantes

- **N'AJOUTEZ PAS** de nouvelles traductions à `LanguageContext` (en cours de suppression)
- **UTILISEZ** react-i18next pour tous les nouveaux écrans
- **TESTEZ** toujours avec l'écran I18nTest après modifications
- **Synchronisation automatique** : Les deux systèmes partagent la même langue via `VideoSettingsService`

## Statistiques du système

```
📊 Statistiques complètes :
├── Langues supportées : 4 (FR, EN, ES, AR)
├── Namespaces : 9
├── Clés par langue : 446
├── Total traductions : 1784
├── Taille estimée : ~150KB (vs 200KB+ avec ancien système)
└── Performance : Chargement par namespace (optimal)
```

## Migration d'un écran - Exemple

```tsx
// AVANT (ancien système)
import { useLanguage } from '../contexts/LanguageContext';

const MyScreen = () => {
  const { t } = useLanguage();
  return <Text>{t.settings}</Text>;
};

// APRÈS (nouveau système)
import { useI18n } from '../hooks/useI18n';

const MyScreen = () => {
  const { t } = useI18n('common'); // ou autre namespace
  return <Text>{t('settings')}</Text>;
};
```
