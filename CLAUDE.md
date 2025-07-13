# 📱 LECTEUR IPTV MOBILE - CLAUDE.md

> **Projet de migration d'une application IPTV web moderne vers React Native**  
> **Objectif**: Créer une application mobile IPTV premium avec toutes les fonctionnalités avancées

---

## 🎯 CONTEXTE DU PROJET

### **Application Source**
- **Projet Web**: `/home/joel/claude-workspace/projets-iptv/lecteur-iptv-moderne`
- **Type**: Lecteur IPTV web ultra-optimisé
- **Performances**: Support 25,000+ chaînes simultanées
- **Parser**: 18,000 chaînes en 1-2 secondes
- **Architecture**: Modulaire ES6 avec cache multi-niveaux

### **Mission de Migration**
Reproduire **100% des fonctionnalités** de l'application web dans une version mobile React Native, en conservant:
- Les **performances exceptionnelles** du parser M3U
- L'**architecture modulaire** avancée
- Les **fonctionnalités premium** (multi-utilisateurs, contrôle parental, etc.)
- L'**expérience utilisateur** fluide et professionnelle

---

## ⚡ FONCTIONNALITÉS PRINCIPALES

### 📺 **Lecture Vidéo IPTV**
- **Formats supportés**: M3U, M3U8, HLS, DASH, MP4, WebM
- **Streaming adaptatif**: Qualité automatique selon connexion
- **Lecteur avancé**: Contrôles complets, PiP, background play
- **Multi-écrans**: Support jusqu'à 9 écrans simultanés (tablettes)
- **Buffer intelligent**: Gestion adaptative selon device/réseau

### 📋 **Gestion Playlists M3U Ultra-Optimisée**
- **Parser haute performance**: 18K+ chaînes en 1-2 secondes
- **Import multiple**: URL, fichiers locaux, Xtream Codes
- **Cache multi-niveaux**: Mémoire → AsyncStorage → SQLite
- **Chunking adaptatif**: Traitement par blocs pour performances
- **Validation robuste**: Vérification intégrité playlists

### 🔍 **Moteur de Recherche Avancé**
- **Recherche fuzzy**: Tolérance fautes de frappe (Levenshtein)
- **Opérateurs booléens**: AND, OR, NOT pour recherches complexes
- **Filtres multiples**: Nom, catégorie, langue, pays, qualité
- **Auto-complétion**: Suggestions temps réel
- **Historique**: Sauvegarde recherches fréquentes

### ⭐ **Système de Favoris et Historique**
- **Favoris multi-utilisateurs**: Séparés par profil
- **Historique intelligent**: 20 dernières chaînes par utilisateur
- **Synchronisation cloud**: Google Drive, Dropbox, iCloud
- **Export/Import**: Sauvegarde données utilisateur
- **Recommandations**: Basées sur l'historique de visionnage

### 👨‍👩‍👧‍👦 **Multi-Utilisateurs et Contrôle Parental**
- **Types de profils**: Admin, Standard, Enfant
- **Authentification**: PIN 4 chiffres sécurisé
- **Restrictions**: Catégories, limite d'âge, horaires
- **Blocage intelligent**: Masquage ou restriction d'accès
- **Session temporaire**: Déverrouillage avec expiration
- **Log sécurité**: Traçabilité des accès

### 📺 **Guide TV (EPG)**
- **Support XMLTV**: Import guides TV complets
- **Interface timeline**: Navigation intuitive par dates/heures
- **Programmation**: Alertes et rappels d'émissions
- **Cache intelligent**: TTL adaptatif selon fréquence usage
- **Multi-langues**: Support guides internationaux

### 🎨 **Thèmes et Personnalisation**
- **8 thèmes visuels**: Dark, Light, Blue, Green, Purple, Orange, Red, Pink
- **Mode adaptatif**: Auto dark/light selon système
- **Personnalisation**: Couleurs, polices, layouts
- **Accessibilité**: Support malvoyants, daltoniens
- **Responsive**: Adaptation mobile/tablette automatique

### 🚀 **Fonctionnalités Avancées**
- **Xtream Codes**: Support API complète
- **Catch-Up TV**: Replay émissions passées
- **Enregistrement**: DVR basique (si supporté provider)
- **Multi-langues**: Interface FR/EN/ES/DE/IT
- **Notifications**: Alertes programmes, mises à jour
- **Statistiques**: Temps visionnage, chaînes populaires

---

## 🛠️ STACK TECHNIQUE

### **Framework Principal**
- **React Native**: 0.73.2 (TypeScript)
- **Target**: iOS 12+ / Android 8+ (API 26+)
- **Architecture**: Hooks + Context API + Services

### **Lecture Vidéo**
- **react-native-video**: 5.2.1+ (player principal)
- **react-native-video-controls**: Custom controls UI
- **Native HLS**: Support streaming adaptatif intégré
- **react-native-video-cache**: Cache vidéo local

### **Navigation et UI**
- **@react-navigation/native**: 6.x (navigation principale)
- **@react-navigation/stack**: Navigation screens
- **@react-navigation/bottom-tabs**: Tabs principale
- **@react-navigation/drawer**: Menu latéral
- **react-native-reanimated**: Animations fluides

### **Stockage et Données**
- **@react-native-async-storage/async-storage**: Configuration rapide
- **react-native-sqlite-2**: Playlists volumineuses (25K+ chaînes)
- **realm**: Alternative NoSQL pour données complexes
- **react-native-fs**: Gestion fichiers M3U locaux

### **Performance et Optimisation**
- **react-native-super-grid**: Grilles virtualisées hautes performances
- **react-native-fast-image**: Images optimisées avec cache
- **FlatList/VirtualizedList**: Listes 25K+ items
- **Memory management**: Garbage collection intelligent

### **Réseau et Fichiers**
- **Fetch API**: Compatible React Native (XMLHttpRequest polyfill)
- **react-native-document-picker**: Sélection fichiers M3U
- **react-native-background-fetch**: Synchronisation background
- **react-native-netinfo**: Détection qualité réseau

### **Services Externes**
- **Cloud Storage**: Google Drive, Dropbox, iCloud APIs
- **Push Notifications**: Firebase Cloud Messaging
- **Analytics**: Firebase Analytics (optionnel)
- **Crash Reporting**: Bugsnag/Sentry

---

## 🎨 DESIGN ET UX

### **Inspiration Visuelle**
- **Style principal**: **IPTV Smarters Pro** (moderne, épuré)
- **Design system**: Material Design 3 + iOS Human Interface
- **Couleurs**: Palette sombre avec accents colorés
- **Typographie**: SF Pro (iOS) / Roboto (Android)

### **Interface Utilisateur**
```
Layout Principal:
├── Navigation Tabs (Bottom)
│   ├── 🏠 Accueil (Home)
│   ├── 📋 Playlists 
│   ├── ⭐ Favoris
│   ├── 🔍 Recherche
│   └── ⚙️ Paramètres

Écrans Secondaires:
├── 📺 Lecteur Vidéo (Fullscreen)
├── 📺 Guide TV (EPG)
├── 👤 Profils Utilisateurs
├── 🔒 Contrôle Parental
└── ℹ️ À Propos
```

### **Composants UI Clés**
- **ChannelCard**: Carte chaîne avec logo, nom, catégorie
- **VideoPlayer**: Lecteur avec contrôles custom
- **PlaylistGrid**: Grille virtualisée 25K+ items
- **SearchBar**: Recherche temps réel avec suggestions
- **FilterPanel**: Filtres multiples collapsible
- **UserProfile**: Sélecteur profil avec PIN
- **ThemeSelector**: Sélecteur thème visuel

### **Animations et Transitions**
- **Page transitions**: Slide, fade, scale fluides
- **Micro-interactions**: Feedback tactile sur touches
- **Loading states**: Skeletons et indicators élégants
- **Gesture support**: Swipe, pinch, long press
- **60 FPS garantis**: Optimisation performances UI

---

## 🏗️ ARCHITECTURE TECHNIQUE

### **Structure de Projet**
```
src/
├── components/          # Composants UI réutilisables
│   ├── common/         # Button, Input, Card, Modal
│   ├── player/         # VideoPlayer, Controls, Overlay
│   ├── lists/          # ChannelList, PlaylistGrid
│   └── forms/          # SearchBar, FilterPanel

├── screens/            # Écrans navigation
│   ├── main/           # Home, Playlists, Search, Settings
│   ├── player/         # Player, Fullscreen
│   └── user/           # Profiles, Parental

├── services/           # 🔥 Logique métier (portée du web)
│   ├── playlist/       # PlaylistManager, M3UParser
│   ├── search/         # SearchEngine, FilterEngine  
│   ├── player/         # PlayerManager, BufferManager
│   ├── user/           # UserManager, ParentalController
│   └── cache/          # CacheManager, StorageAdapter

├── storage/            # Couche persistance
│   ├── AsyncStorageAdapter.ts
│   ├── SQLiteAdapter.ts
│   └── CloudSyncService.ts

├── navigation/         # Configuration navigation
├── styles/             # Système de styles/thèmes
├── utils/              # Utilitaires purs
└── types/              # Définitions TypeScript
```

### **Patterns Architecturaux**
- **Service Layer**: Managers singleton avec injection
- **Provider Pattern**: Thèmes, utilisateur, cache
- **Custom Hooks**: Logique métier réutilisable
- **Context API**: État global application
- **Error Boundaries**: Gestion erreurs robuste

### **Performance Strategy**
- **Lazy Loading**: Composants et images
- **Code Splitting**: Modules par écran
- **Memory Management**: Cleanup automatique
- **Virtual Lists**: 25K+ items sans lag
- **Background Processing**: Tasks non-bloquantes

---

## 📊 MIGRATION WEB → MOBILE

### **Composants 100% Portables** ✅
- **UltraOptimizedM3UParser.js**: Parser 18K chaînes/1-2s
- **SearchManager.js**: Moteur recherche avancé
- **PlaylistManager.js**: Gestion playlists complète
- **ParentalController.js**: Contrôle parental
- **CacheManager.js**: Cache multi-niveaux

### **Adaptations Requises** ⚠️
- **UIManager**: DOM → React Native components
- **PlayerManager**: Video.js → react-native-video
- **StorageAdapter**: localStorage/IndexedDB → AsyncStorage/SQLite
- **NavigationManager**: Modals → Stack navigation

### **Réécriture Complète** 🔄
- **Interface UI**: CSS → StyleSheet
- **Animations**: CSS → Animated API
- **File Handling**: File API → react-native-fs
- **Platform APIs**: Browser → iOS/Android natives

---

## 🎯 OBJECTIFS ET LIVRABLES

### **Objectif Principal**
Créer une **application IPTV mobile premium** qui:
- Reproduit **100% des fonctionnalités** de l'app web
- Maintient les **performances exceptionnelles** (18K chaînes/1-2s)
- Offre une **UX mobile native** fluide et intuitive
- Supporte **25,000+ chaînes** sans dégradation performance

### **Critères de Succès**
- ✅ **Performance**: Parser 18K+ chaînes en <3s mobile
- ✅ **Capacité**: Support 25K+ chaînes simultanées
- ✅ **UX**: Interface fluide 60 FPS garanti
- ✅ **Fonctionnalités**: 100% features web reproduites
- ✅ **Qualité**: 0 crash, gestion erreurs robuste

### **Livrables Finaux**
- 📱 **Application mobile** iOS + Android
- 📚 **Documentation** utilisateur et technique
- 🧪 **Suite de tests** automatisés
- 📦 **Package App Store** ready-to-publish
- 🔧 **Scripts maintenance** et déploiement

---

## 🚀 ROADMAP DÉVELOPPEMENT

### **Phase 1: Foundation (3-4 sem)**
- Setup projet React Native + TypeScript
- Migration services métier (PlaylistManager, SearchEngine)
- Architecture navigation et storage
- Tests performance parsers M3U

### **Phase 2: UI Foundation (4-5 sem)**
- Système de thèmes et design system
- Composants UI de base (buttons, cards, lists)
- Navigation structure (tabs, stack, drawer)
- Grilles virtualisées hautes performances

### **Phase 3: Video Player (3-4 sem)**
- Intégration react-native-video
- Contrôles custom et PiP
- Support HLS/DASH adaptatif
- Optimisations buffer mobile

### **Phase 4: Advanced Features (2-3 sem)**
- Multi-utilisateurs et contrôle parental
- EPG et guide TV interface
- Cloud sync et export/import
- Notifications et background tasks

### **Phase 5: Polish & Release (2-3 sem)**
- Tests devices réels iOS/Android
- Performance optimization finale
- App Store preparation
- Documentation complète

**Durée totale**: 14-19 semaines

---

## 🔧 COMMANDES DÉVELOPPEMENT

### **Setup Initial**
```bash
# Installation dépendances
npm install

# iOS
cd ios && pod install && cd ..
npx react-native run-ios

# Android  
npx react-native run-android

# Tests
npm test
```

### **Build Production**
```bash
# Android APK
cd android && ./gradlew assembleRelease

# iOS Archive
npx react-native run-ios --configuration Release

# Bundle JavaScript
npx react-native bundle --platform android --dev false
```

### **Maintenance**
```bash
# Clean cache
npx react-native start --reset-cache

# Clean builds
cd android && ./gradlew clean
cd ios && xcodebuild clean

# Lint code
npm run lint
npm run type-check
```

---

## 📝 NOTES TECHNIQUES

### **Optimisations Spécifiques Mobile**
- **Memory pressure**: Monitoring et cleanup automatique
- **Battery optimization**: Background tasks intelligents
- **Network adaptation**: Qualité selon connexion
- **Device performance**: Adaptation selon capabilities
- **Platform differences**: iOS vs Android specifics

### **Sécurité et Confidentialité**
- **PIN encryption**: Hash sécurisé avec salt
- **Data protection**: Chiffrement données sensibles
- **Network security**: HTTPS obligatoire, certificate pinning
- **Privacy compliance**: RGPD, CCPA compatible
- **No analytics**: Respect vie privée utilisateur

### **Compatibilité et Support**
- **iOS**: 12.0+ (iPhone 6s+, iPad Air 2+)
- **Android**: 8.0+ (API 26+)
- **React Native**: 0.73+ avec New Architecture
- **Node.js**: 18+ pour développement
- **Xcode**: 14+ pour builds iOS

---

## 📞 SUPPORT ET DOCUMENTATION

### **Documentation Technique**
- **MIGRATION-ANALYSIS.md**: Rapport détaillé migration
- **API.md**: Documentation APIs services
- **COMPONENTS.md**: Guide composants UI
- **PERFORMANCE.md**: Optimisations et benchmarks

### **Guides Utilisateur**
- **INSTALLATION.md**: Guide installation développeur
- **USER-GUIDE.md**: Manuel utilisateur final
- **TROUBLESHOOTING.md**: FAQ et résolution problèmes

### **Ressources Externes**
- **React Native Docs**: https://reactnative.dev
- **react-native-video**: https://github.com/react-native-video/react-native-video
- **M3U Spec**: https://en.wikipedia.org/wiki/M3U
- **HLS Spec**: https://tools.ietf.org/html/rfc8216

---

*Ce document CLAUDE.md sera mis à jour au fur et à mesure du développement pour refléter l'évolution du projet et les décisions techniques prises.*