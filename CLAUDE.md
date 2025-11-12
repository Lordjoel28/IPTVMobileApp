# 📱 LECTEUR IPTV MOBILE - CLAUDE.md

> **Application IPTV mobile complète avec React Native**  
> **Environnement**: Ubuntu natif optimisé pour développement mobile

---

## 🎯 OBJECTIF DU PROJET

**Migration exacte** de l'application IPTV web ultra-optimisée vers React Native en préservant:
- **Architecture modulaire** de 23 modules (95% business logic portable)
- **Performances exceptionnelles** (18K chaînes/1-2s → <3s mobile)
- **UltraOptimizedM3UParser** avec pool d'objets et string interning
- **Cache 3-niveaux intelligent** (L1→L2→L3) adapté AsyncStorage/SQLite
- **Support 25K+ chaînes** avec VirtualizedList optimisée
- **Interface moderne** style IPTV Smarters Pro

---

## 🛠️ ENVIRONNEMENT DE DÉVELOPPEMENT

### **Plateforme Principale**
- **OS**: Ubuntu natif (optimisé développement mobile)
- **IDE Principal**: Android Studio + VS Code
- **Assistant**: Claude Code intégré
- **Target**: Android prioritaire (APK natif)

### **Avantages Ubuntu Natif**
- ✅ **Performance maximale** (pas de virtualisation)
- ✅ **Android Studio optimal** (SDK natif)
- ✅ **Build rapides** (ressources dédiées)
- ✅ **Debugging efficace** (ADB direct)
- ✅ **Claude Code intégré** (workflow fluide)

---

## 📱 STACK TECHNIQUE

### **Framework Core**
- **React Native**: 0.73.2+ (TypeScript)
- **Target Platform**: Android 8+ (API 26+)
- **Architecture**: Functional Components + Hooks

### **Streaming Vidéo**
- **react-native-video**: Lecteur principal HLS/MP4
- **HLS.js Mobile**: Streaming adaptatif optimisé
- **Buffer Management**: Cache intelligent mobile
- **Quality Control**: Auto-adaptation selon réseau

### **Interface Utilisateur**
- **Design System**: Style IPTV Smarters Pro
- **Navigation**: @react-navigation/native 6.x
- **Animations**: react-native-reanimated 3.x
- **Icons**: react-native-vector-icons
- **Theming**: Dark/Light modes adaptatifs

### **Données et Storage**
- **AsyncStorage**: Configuration utilisateur
- **SQLite**: Playlists et historique volumineux
- **File System**: react-native-fs pour M3U locaux
- **Network**: Fetch API avec retry logic

### **Internationalisation (i18n)**
- **react-i18next**: Système de traduction moderne
- **4 langues**: Français, Anglais, Espagnol, Arabe
- **9 namespaces**: common, settings, player, channels, profiles, playlists, parental, epg, themes
- **RTL Support**: Support automatique droite-à-gauche pour l'arabe
- **Lazy Loading**: Charge uniquement la langue active (90% moins de mémoire)
- **Persistance**: Langue sauvegardée dans AsyncStorage

---

## 🎨 DESIGN ET UX

### **Inspiration Visuelle**
- **Référence**: **IPTV Smarters Pro** (interface moderne)
- **Couleurs**: Palette sombre avec accents bleus/oranges
- **Typography**: Roboto (clean et lisible)
- **Layout**: Cards + Grid responsive

### **Écrans Principaux**
```
App Structure:
├── 🏠 Home (Dernières chaînes regardées)
├── 📋 Playlists (Gestion M3U)
├── ⭐ Favoris (Chaînes favorites)
├── 🔍 Recherche (Moteur de recherche)
├── 📺 Player (Lecteur fullscreen)
└── ⚙️ Settings (Configuration)
```

### **Composants UI Clés**
- **ChannelCard**: Carte chaîne avec logo/nom
- **VideoPlayer**: Lecteur avec contrôles custom
- **PlaylistManager**: Import/gestion M3U
- **SearchBar**: Recherche temps réel
- **FavoritesList**: Gestion favoris par profil

---

## 🚀 FONCTIONNALITÉS PRINCIPALES

### 📺 **Lecture Vidéo IPTV**
- **Formats**: M3U8, HLS, MP4, stream URLs
- **Contrôles**: Play/pause, seek, volume, fullscreen
- **Adaptatif**: Qualité auto selon bande passante
- **Background**: Lecture en arrière-plan (audio)
- **PiP**: Picture-in-Picture (Android 8+)

### 📋 **Gestion Playlists M3U**
- **Import**: URLs, fichiers locaux, Xtream Codes
- **Parser**: Extraction rapide métadonnées M3U
- **Validation**: Vérification liens actifs
- **Organisation**: Catégories, tri, filtres
- **Cache**: Stockage local pour accès offline

### ⭐ **Système de Favoris**
- **Multi-profils**: Favoris par utilisateur
- **Synchronisation**: Sauvegarde cloud optionnelle
- **Organisation**: Dossiers personnalisés
- **Accès rapide**: Raccourcis interface principale

### 🔍 **Moteur de Recherche**
- **Recherche fuzzy**: Tolérance fautes de frappe
- **Filtres**: Nom, catégorie, qualité
- **Historique**: Recherches récentes
- **Suggestions**: Auto-complétion intelligente

### 🎯 **Fonctionnalités Avancées**
- **EPG**: Guide TV (si disponible)
- **Catch-up**: Replay (si supporté)
- **Multi-langues**: Interface FR/EN
- **Thèmes**: Dark/Light modes
- **Statistiques**: Temps visionnage

---

## 🏗️ ARCHITECTURE PROJET - MIGRATION EXACTE WEB

### **Architecture Modulaire - 23 Modules Web → React Native**
```
src/
├── services/          # 🔥 CORE: Migration directe business logic web
│   ├── parsers/       # UltraOptimizedM3UParser (100% portable)
│   │   ├── UltraOptimizedM3UParser.ts  # 18K chaînes/1-2s
│   │   ├── OptimizedM3UParser.ts       # Pool objets + cache
│   │   └── TraditionalM3UParser.ts     # Fallback
│   ├── cache/         # Cache 3-niveaux adapté mobile
│   │   ├── CacheManager.ts             # L1(Mémoire)→L2(AsyncStorage)→L3(SQLite)
│   │   ├── MemoryCache.ts              # LRU avec éviction intelligente
│   │   └── StorageAdapter.ts           # Abstraction localStorage→RN
│   ├── playlist/      # Gestion playlists volumineuses
│   │   ├── PlaylistManager.ts          # Orchestrateur principal (web logic)
│   │   ├── PlaylistValidator.ts        # Validation intégrité M3U
│   │   └── XtreamManager.ts            # Support API Xtream Codes
│   ├── search/        # Moteur recherche avancé
│   │   ├── SearchManager.ts            # Recherche fuzzy + opérateurs booléens
│   │   ├── FuzzySearchWorker.ts        # Index N-grammes pour 25K+ items
│   │   └── FilterEngine.ts             # Filtres multiples
│   ├── users/         # Multi-utilisateurs avec PIN
│   │   ├── UserManager.ts              # Gestion profils (admin/standard/child)
│   │   └── ParentalController.ts       # Restrictions granulaires
│   ├── performance/   # Monitoring temps réel
│   │   ├── PerformanceMonitor.ts       # Métriques parsing/UI
│   │   └── MemoryOptimizer.ts          # Cleanup automatique
│   └── network/       # APIs et réseau
│       ├── NetworkManager.ts           # Proxy cascade + resilience
│       └── CorsProxyManager.ts         # Contournement CORS
│
├── storage/           # 🔄 ADAPTERS: Web storage → React Native
│   ├── AsyncStorageAdapter.ts          # localStorage → AsyncStorage
│   ├── SQLiteAdapter.ts                # IndexedDB → SQLite
│   └── CloudSyncAdapter.ts             # Synchronisation cloud
│
├── components/        # 🆕 UI React Native (réécriture complète)
│   ├── player/        # VideoPlayer avec react-native-video
│   ├── lists/         # VirtualizedList optimisée 25K+ items
│   ├── search/        # SearchBar avec auto-complétion
│   └── themes/        # ThemeProvider adapté StyleSheet
│
├── screens/          # 🆕 Navigation React Native
│   ├── HomeScreen.tsx
│   ├── PlaylistsScreen.tsx
│   ├── PlayerScreen.tsx
│   └── SettingsScreen.tsx
│
├── navigation/       # React Navigation structure
├── styles/          # Système thèmes (9 thèmes web → RN)
└── types/           # Types migration web interfaces
```

### **Patterns Architecturaux - Préservés du Web**
- **Service Layer Architecture** avec injection dépendances
- **Observer Pattern** pour events cross-modules
- **Strategy Pattern** pour cache adaptatif selon taille
- **Factory Pattern** pour pool d'objets parsers
- **Singleton Pattern** pour managers avec app reference

### **Patterns Techniques**
- **Custom Hooks**: Logique métier réutilisable
- **Context API**: État global application
- **Service Layer**: Abstractions métier
- **Error Boundaries**: Gestion erreurs robuste

---

## 🔧 DÉVELOPPEMENT ET BUILD

### **Setup Initial**
```bash
# Installation dépendances
npm install

# Android (Ubuntu natif)
npx react-native run-android

# Build APK
cd android && ./gradlew assembleDebug
```

### **Commandes Utiles**
```bash
# Clean builds
cd android && ./gradlew clean

# Reset cache
npx react-native start --reset-cache

# Type checking
npx tsc --noEmit

# Lint code
npx eslint src/
```

### **Tests et Debugging**
```bash
# Logs Android
adb logcat | grep ReactNativeJS

# Install APK
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Reverse port (if needed)
adb reverse tcp:8081 tcp:8081
```

---

## 📱 OPTIMISATIONS MOBILE

### **Performance**
- **FlatList virtualisé**: Listes longues (1000+ chaînes)
- **Lazy loading**: Images et composants
- **Memory management**: Cleanup automatique
- **Bundle optimization**: Code splitting

### **UX Mobile**
- **Touch targets**: Minimum 44px
- **Loading states**: Skeletons et spinners
- **Error handling**: Messages utilisateur clairs
- **Offline support**: Cache intelligent

### **Android Spécifique**
- **Back button**: Gestion navigation native
- **Permissions**: Storage, network appropriés
- **Notifications**: Lecteur en background
- **Adaptive icons**: Support Android moderne

---

## 🎯 STRATÉGIE DÉVELOPPEMENT UI-FIRST

### **NOUVELLE APPROCHE - RÉPLICATION SUCCÈS APP WEB** ✅
**Reproduction exacte de votre méthode gagnante**:
1. **Interface générale créée en premier** (design complet navigable)
2. **Fonctionnalités ajoutées 1 à 1** avec test immédiat
3. **App toujours fonctionnelle** à chaque étape
4. **Feedback visuel immédiat** pour validation

### **Phase UI-1: Interface Générale Complète (1-2 semaines)**
- 🎨 Design System complet style IPTV Smarters Pro
- 🏗️ Navigation 5 onglets fonctionnelle
- 📱 Interface finale avec mock data
- 🎬 Lecteur vidéo avec vidéo test

### **Phase UI-2: Fonctionnalités Une par Une (4-5 semaines)**
- 📋 **F1**: Import et Lecture Playlist (vraies chaînes)
- 🎬 **F2**: Lecteur Vidéo Complet (HLS, contrôles)
- 🔍 **F3**: Recherche Avancée (fuzzy, filtres)
- ⭐ **F4**: Système Favoris (multi-profils)
- ⚡ **F5**: Cache et Performance (25K+ chaînes)
- 👨‍👩‍👧‍👦 **F6**: Multi-utilisateurs Avancé (contrôle parental)

### **Phase UI-3: Fonctionnalités Premium (2-3 semaines)**
- 🔌 Xtream Codes Support complet
- 📺 EPG Guide TV interactif
- 💾 Export/Import avancé avec cloud sync

**Durée totale**: 7-10 semaines vs 14-19 semaines (méthode module-first)

---

## 🚨 BONNES PRATIQUES

### **🌐 RÈGLE ABSOLUE: Internationalisation (i18n)**

⚠️ **INTERDICTION FORMELLE: JAMAIS coder en dur des textes !**

❌ **INTERDIT - Ne JAMAIS faire:**
```typescript
<Text>Annuler</Text>
<Button>Se connecter</Button>
Alert.alert('Confirmer', 'Êtes-vous sûr ?');
const message = "Chargement en cours...";
```

✅ **OBLIGATOIRE - Toujours utiliser react-i18next:**
```typescript
import {useI18n} from '../hooks/useI18n';

const MyScreen = () => {
  const {t: tCommon} = useI18n('common');
  const {t: tSettings} = useI18n('settings');

  return (
    <>
      <Text>{tCommon('cancel')}</Text>
      <Button>{tCommon('login')}</Button>
      <Alert.alert(tCommon('confirm'), tCommon('areYouSure'));
    </>
  );
};
```

**Namespaces disponibles:**
- `common` → Textes communs (boutons, messages génériques)
- `settings` → Paramètres
- `player` → Lecteur vidéo
- `channels` → Chaînes
- `profiles` → Profils
- `playlists` → Playlists
- `parental` → Contrôle parental
- `epg` → Guide TV
- `themes` → Thèmes

**Ajouter une nouvelle clé:**
1. Ajouter dans **les 4 fichiers** : `fr/common.json`, `en/common.json`, `es/common.json`, `ar/common.json`
2. Vérifier les logs : si `missingKey` apparaît → ajouter la clé manquante

**Voir FINAL_I18N_STATUS.md pour la documentation complète**

---

### **Développement UI-First**
- ✅ **Interface d'abord**: Design complet avant fonctionnalités
- ✅ **Fonctionnalités 1 à 1**: Comme votre app web réussie
- ✅ **App toujours utilisable**: Pas de phases techniques isolées
- ✅ **Tests utilisateur immédiats**: Feedback visuel constant
- ✅ **APK après chaque feature**: Validation continue

### **Git Workflow**
- 🔄 Commits fréquents avec messages clairs
- 🏷️ Tags pour versions importantes
- 🌿 Branches pour features importantes
- 📝 CHANGELOG.md maintenu

### **Qualité Code**
- 📏 TypeScript strict mode
- 🧹 ESLint + Prettier configurés
- 🧪 Tests unitaires pour logique métier
- 📖 Code autodocumenté

---

## 📞 RESSOURCES ET SUPPORT

### **Documentation Officielle**
- [React Native](https://reactnative.dev/)
- [react-native-video](https://github.com/react-native-video/react-native-video)
- [React Navigation](https://reactnavigation.org/)

### **Références Design**
- [IPTV Smarters Pro](https://www.iptvsmarters.com/) - Style inspiration
- [Material Design 3](https://m3.material.io/) - Guidelines Android

### **Outils Ubuntu**
- Android Studio - IDE principal Android
- VS Code + Claude Code - Développement assisté
- ADB - Debug et install APK

---

## 📝 NOTES SPÉCIFIQUES UBUNTU

### **Avantages Environnement**
- **Performance native**: Pas de virtualisation Windows/Mac
- **Claude Code optimal**: Intégration système complète
- **Android Studio fluide**: SDK natif Linux
- **Builds rapides**: Ressources dédiées mobile

### **Configuration Optimale**
- **JDK**: OpenJDK 11+ (compatible Android)
- **Android SDK**: Dernière version stable
- **Node.js**: 18+ LTS pour React Native
- **ADB**: Configuré PATH système

---

*📱 Projet optimisé pour développement mobile sur Ubuntu avec Claude Code*
