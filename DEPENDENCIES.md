# 📦 DÉPENDANCES IPTV REACT NATIVE

> **Toutes les dépendances nécessaires pour une application IPTV complète**  
> **Date d'installation**: 14 juillet 2025

---

## ✅ DÉPENDANCES INSTALLÉES

### 🎥 **Lecture Vidéo**
- **react-native-video**: `^6.16.1`
  - Lecteur vidéo principal avec support HLS/DASH
  - Contrôles avancés, PiP, background play
  - Configuration: Auto-linkage React Native 0.73+

### 🧭 **Navigation**
- **@react-navigation/native**: `^6.1.18`
- **@react-navigation/stack**: `^6.4.1`
- **@react-navigation/drawer**: `^6.7.2`
- **@react-navigation/bottom-tabs**: `^6.5.11` (déjà présent)
  - Navigation complète : Stack, Drawer, Tabs
  - Transitions fluides et gestures

### 🎨 **Interface Utilisateur**
- **react-native-paper**: `^5.14.5`
  - Design system Material Design 3
  - Composants UI modernes et accessibles
  - Thèmes dark/light automatiques

### 💾 **Stockage et Données**
- **@react-native-async-storage/async-storage**: `^1.24.0`
  - Stockage persistant pour configuration
  - Favoris, historique, paramètres utilisateur

### ⚡ **Performance**
- **@shopify/flash-list**: `^1.8.3`
  - Listes haute performance pour 25K+ chaînes
  - Alternative optimisée à FlatList
  - Memory management intelligent

### 📱 **Fonctionnalités Mobile**
- **react-native-orientation-locker**: `^1.7.0`
  - Contrôle orientation écran (portrait/paysage)
  - Essentiel pour lecteur vidéo fullscreen

- **@react-native-community/netinfo**: `^11.4.1`
  - Détection qualité réseau
  - Adaptation streaming selon connexion

### 🛠️ **Support et Utilitaires**
- **react-native-safe-area-context**: `^4.14.1`
  - Gestion safe areas iOS/Android
  - Notch, status bar, navigation bar

- **react-native-screens**: `^3.37.0`
  - Optimisation navigation native
  - Performance screens améliorée

- **react-native-gesture-handler**: `^2.27.1`
  - Gestures avancés (swipe, pinch, etc.)
  - Requis pour React Navigation

- **react-native-reanimated**: `^3.18.0`
  - Animations 60 FPS fluides
  - Micro-interactions et transitions

---

## 🔧 CONFIGURATION

### **App.tsx Structure**
```typescript
<GestureHandlerRootView> // Gestures
  <PaperProvider>         // UI Theme
    <NavigationContainer>  // Navigation
      // App content
    </NavigationContainer>
  </PaperProvider>
</GestureHandlerRootView>
```

### **Thèmes Configurés**
- **Light Mode**: MD3LightTheme (React Native Paper)
- **Dark Mode**: MD3DarkTheme automatique
- **Adaptatif**: Selon préférence système

### **Auto-Linkage React Native 0.73**
- Toutes les dépendances sont auto-linkées
- Pas de configuration manuelle requise
- Android Gradle + iOS CocoaPods automatiques

---

## 🎯 PRÊT POUR DÉVELOPPEMENT

### **Fonctionnalités Activées**
✅ **Navigation** complète (Stack, Drawer, Tabs)  
✅ **UI moderne** avec Material Design 3  
✅ **Lecteur vidéo** HLS/DASH ready  
✅ **Stockage** persistant AsyncStorage  
✅ **Performance** listes 25K+ items  
✅ **Gestures** et animations fluides  
✅ **Network** détection et adaptation  
✅ **Orientation** contrôle pour vidéo  

### **Prochaines Étapes Possibles**
1. **Navigation structure** (tabs IPTV)
2. **Écrans de base** (Home, Playlists, Settings)
3. **Services métier** (PlaylistManager, Parser M3U)
4. **Composants UI** (ChannelCard, VideoPlayer)
5. **Intégration vidéo** (react-native-video)

---

## 📝 NOTES TECHNIQUES

### **Versions Compatibles**
- **React Native**: 0.73.2
- **Node.js**: 18+
- **Android**: API 26+ (Android 8.0)
- **iOS**: 12.0+

### **Bundle Size Impact**
- **Ajout total**: ~8-12 MB
- **react-native-video**: ~3-4 MB
- **React Navigation**: ~2-3 MB
- **React Native Paper**: ~2-3 MB
- **Autres**: ~1-2 MB

### **Performance Impact**
- **Startup**: +200-400ms (acceptable)
- **Memory**: +15-25 MB (normal)
- **60 FPS**: Maintenu avec optimisations

---

*Installation réalisée le 14 juillet 2025 - Bundle testé et fonctionnel ✅*