# 📱 LECTEUR IPTV MOBILE - CLAUDE.md

> **Application IPTV mobile complète avec React Native**  
> **Environnement**: Ubuntu natif optimisé pour développement mobile

---

## 🎯 OBJECTIF DU PROJET

Développer une **application IPTV mobile premium** avec React Native offrant:
- **Streaming HLS** haute performance
- **Gestion playlists M3U** optimisée
- **Interface moderne** style IPTV Smarters Pro
- **Fonctionnalités complètes** pour utilisateurs finaux

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

## 🏗️ ARCHITECTURE PROJET

### **Structure Recommandée**
```
src/
├── components/
│   ├── common/         # Button, Card, Input
│   ├── player/         # VideoPlayer, Controls
│   └── lists/          # ChannelList, PlaylistGrid

├── screens/
│   ├── Home.tsx        # Écran accueil
│   ├── Playlists.tsx   # Gestion M3U
│   ├── Favorites.tsx   # Favoris utilisateur
│   ├── Search.tsx      # Recherche avancée
│   ├── Player.tsx      # Lecteur vidéo
│   └── Settings.tsx    # Configuration

├── services/
│   ├── PlaylistService.ts    # Gestion M3U
│   ├── PlayerService.ts      # Contrôle lecteur
│   ├── StorageService.ts     # Persistance données
│   └── NetworkService.ts     # API calls

├── utils/
│   ├── m3uParser.ts    # Parser playlists
│   ├── validators.ts   # Validation URLs
│   └── formatters.ts   # Formatage données

└── types/
    └── index.ts        # Types TypeScript
```

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

## 🎯 ROADMAP DÉVELOPPEMENT

### **Phase 1: Foundation (2 semaines)**
- ✅ Setup projet React Native + TypeScript
- ✅ Architecture de base (navigation, storage)
- ✅ Interface minimaliste fonctionnelle
- ✅ Premier build APK réussi

### **Phase 2: Core Features (3 semaines)**
- 📺 Intégration react-native-video
- 📋 Parser M3U basique
- 🎨 Interface style IPTV Smarters Pro
- ⭐ Système favoris simple

### **Phase 3: Advanced Features (2 semaines)**
- 🔍 Moteur recherche avancé
- 📱 Optimisations mobile
- 🎯 Fonctionnalités premium
- 🧪 Tests et debugging complets

### **Phase 4: Polish & Release (1 semaine)**
- 🎨 Finalisation UI/UX
- 📦 Build production
- 📚 Documentation utilisateur
- 🚀 Préparation distribution

---

## 🚨 BONNES PRATIQUES

### **Développement**
- ✅ **Développement incrémental**: Une feature à la fois
- ✅ **Tests fréquents**: APK testé après chaque ajout
- ✅ **Code simple**: Éviter sur-architecture
- ✅ **Performance first**: Optimiser dès le début

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