# 🎯 GUIDE D'INTÉGRATION: useVideoGestures dans GlobalVideoPlayer

## 📋 RÉSUMÉ
Ce guide détaille l'intégration du hook `useVideoGestures` et du composant `VideoFeedbackOverlay` dans le `GlobalVideoPlayer` pour la Phase 3 de la refactorisation.

---

## 🎯 OBJECTIF
Extraire ~400 lignes de code lié aux gestures du GlobalVideoPlayer vers:
- **Hook**: `src/hooks/useVideoGestures.ts`
- **Composant**: `src/components/VideoFeedbackOverlay.tsx`

---

## 📝 MODIFICATIONS À EFFECTUER

### 1️⃣ IMPORTS (Lignes 1-70)

**AJOUTER:**
```typescript
import {useVideoGestures} from '../hooks/useVideoGestures';
import {VideoFeedbackOverlay} from './VideoFeedbackOverlay';
```

**REMARQUE:** Les imports suivants ne sont plus nécessaires dans le composant principal car ils sont dans le hook:
- `Gesture` (déjà importé mais sera utilisé via le hook)
- Les `useSharedValue`, `useAnimatedStyle` liés aux gestures seront dans le hook

---

### 2️⃣ SUPPRIMER LES ÉTATS LOCAUX (Lignes ~85-100)

**À SUPPRIMER (maintenant dans le hook):**
```typescript
const [currentTime, setCurrentTime] = React.useState(0);
const [duration, setDuration] = React.useState(0);
const [seekFeedback, setSeekFeedback] = React.useState<{...}>({...});

// Valeurs animées pour feedback visuel
const seekFeedbackOpacity = useSharedValue(0);
const seekFeedbackScale = useSharedValue(0.8);

// État et animations pour ripple
const [rippleVisible, setRippleVisible] = React.useState(false);
const [ripplePosition, setRipplePosition] = React.useState({x: 0, y: 0});
```

**À CONSERVER:**
```typescript
const [currentTime, setCurrentTime] = React.useState(0);
const [duration, setDuration] = React.useState(0);
```
(car utilisés pour la logique de seek, pas seulement les gestures)

---

### 3️⃣ SUPPRIMER LES FONCTIONS HANDLERS (Lignes ~1350-1412)

**À SUPPRIMER (maintenant dans le hook):**
```typescript
const showRippleEffect = (x: number, y: number) => { ... }
const showSeekFeedback = (...) => { ... }
```

**À CONSERVER ET ADAPTER:**
```typescript
const handleSeekBackward = () => {
  if (videoRef.current && currentTime > 0) {
    const newTime = Math.max(0, currentTime - 10);
    videoRef.current.seek(newTime);
    setCurrentTime(newTime);
  }
};

const handleSeekForward = () => {
  if (videoRef.current && duration > 0) {
    const newTime = Math.min(duration, currentTime + 10);
    videoRef.current.seek(newTime);
    setCurrentTime(newTime);
  }
};
```

---

### 4️⃣ SUPPRIMER LES DÉFINITIONS DE GESTURES (Lignes ~1418-1463)

**À SUPPRIMER COMPLÈTEMENT:**
```typescript
const leftDoubleTap = Gesture.Tap()...
const rightDoubleTap = Gesture.Tap()...
const centerTapGesture = Gesture.Tap()...
const leftSideGesture = leftDoubleTap;
const rightSideGesture = rightDoubleTap;
```

---

### 5️⃣ SUPPRIMER LES STYLES ANIMÉS DES GESTURES (Lignes ~1465-1487)

**À SUPPRIMER:**
```typescript
const seekFeedbackAnimatedStyle = useAnimatedStyle(() => {...});
const rippleAnimatedStyle = useAnimatedStyle(() => {...});
```

**À CONSERVER:**
```typescript
const playPauseButtonAnimatedStyle = useAnimatedStyle(() => {...});
const controlsAnimatedStyle = useAnimatedStyle(() => {...});
const dockerAnimatedStyle = useAnimatedStyle(() => {...});
const settingsMenuAnimatedStyle = useAnimatedStyle(() => {...});
// Tous les autres styles animés non liés aux gestures
```

---

### 6️⃣ AJOUTER L'UTILISATION DU HOOK (Après les hooks existants)

**AJOUTER (après les hooks useVideoSettings, useAutoHideControls, etc.):**
```typescript
// 🎯 HOOK: Gestures vidéo avancées (Phase 3 refactoring)
const videoGestures = useVideoGestures(
  {
    onSeekBackward: handleSeekBackward,
    onSeekForward: handleSeekForward,
    onToggleControls: toggleControls,
    onVolumeChange: (delta) => {
      // TODO: Implémenter contrôle volume
      console.log('Volume change:', delta);
    },
    onBrightnessChange: (delta) => {
      // TODO: Implémenter contrôle luminosité
      console.log('Brightness change:', delta);
    },
    onZoomChange: (scale) => {
      // TODO: Implémenter zoom vidéo
      console.log('Zoom change:', scale);
    },
  },
  {
    isScreenLocked: videoSettings.isScreenLocked,
    currentTime,
    duration,
  }
);
```

---

### 7️⃣ MODIFIER LE JSX - ZONES DE GESTURES (Lignes ~1933-1945)

**REMPLACER:**
```typescript
{/* Zone gauche - Seek backward */}
<GestureDetector gesture={leftSideGesture}>
  <View style={styles.gestureZoneLeft} />
</GestureDetector>

{/* Zone droite - Seek forward */}
<GestureDetector gesture={rightSideGesture}>
  <View style={styles.gestureZoneRight} />
</GestureDetector>

{/* Zone centrale - Afficher contrôles */}
<GestureDetector gesture={centerTapGesture}>
  <View style={styles.gestureZoneCenter} />
</GestureDetector>
```

**PAR:**
```typescript
{/* Zone gauche - Double tap seek backward + Swipe brightness */}
<GestureDetector gesture={videoGestures.gestures.leftSide}>
  <View style={styles.gestureZoneLeft} />
</GestureDetector>

{/* Zone droite - Double tap seek forward + Swipe volume */}
<GestureDetector gesture={videoGestures.gestures.rightSide}>
  <View style={styles.gestureZoneRight} />
</GestureDetector>

{/* Zone centrale - Toggle contrôles */}
<GestureDetector gesture={videoGestures.gestures.center}>
  <View style={styles.gestureZoneCenter} />
</GestureDetector>
```

---

### 8️⃣ AJOUTER LE COMPOSANT VIDEOFE EDBACKOVERLAY AU JSX

**AJOUTER (après les zones de gestures, avant la fermeture du container):**
```typescript
{/* 🎯 FEEDBACK OVERLAY - Indicateurs visuels gestures */}
{localFullscreen && (
  <VideoFeedbackOverlay
    seekFeedback={videoGestures.feedback.seek}
    seekFeedbackStyle={videoGestures.animatedStyles.seekFeedback}
    rippleFeedback={videoGestures.feedback.ripple}
    rippleStyle={videoGestures.animatedStyles.ripple}
    volumeFeedback={videoGestures.feedback.volume}
    volumeFeedbackStyle={videoGestures.animatedStyles.volumeFeedback}
    brightnessFeedback={videoGestures.feedback.brightness}
    brightnessFeedbackStyle={videoGestures.animatedStyles.brightnessFeedback}
  />
)}
```

---

### 9️⃣ NETTOYER LE JSX DES ANCIENS FEEDBACKS

**SUPPRIMER (si existants):**
```typescript
{/* Ancien feedback de seek */}
{seekFeedback.visible && (
  <Animated.View style={[styles.seekIndicator, seekFeedbackAnimatedStyle]}>
    ...
  </Animated.View>
)}

{/* Ancien ripple effect */}
{rippleVisible && (
  <Animated.View style={[styles.ripple, rippleAnimatedStyle]}>
    ...
  </Animated.View>
)}
```

---

### 🔟 NETTOYER LES STYLES (Section styles en bas du fichier)

**SUPPRIMER (si définis dans le fichier):**
```typescript
seekIndicator: {...},
ripple: {...},
// Tous les styles liés aux feedbacks de gestures
```

**CONSERVER:**
```typescript
gestureZoneLeft: {...},
gestureZoneRight: {...},
gestureZoneCenter: {...},
// Tous les autres styles du player
```

---

## ✅ CHECKLIST D'INTÉGRATION

- [ ] 1. Ajouter les imports (useVideoGestures, VideoFeedbackOverlay)
- [ ] 2. Supprimer les états locaux des gestures
- [ ] 3. Supprimer les fonctions handlers (showRippleEffect, showSeekFeedback)
- [ ] 4. Conserver handleSeekBackward et handleSeekForward (logique métier)
- [ ] 5. Supprimer les définitions de gestures
- [ ] 6. Supprimer les styles animés des gestures
- [ ] 7. Ajouter l'appel au hook useVideoGestures
- [ ] 8. Modifier le JSX des zones de gestures
- [ ] 9. Ajouter le composant VideoFeedbackOverlay
- [ ] 10. Supprimer les anciens feedbacks du JSX
- [ ] 11. Nettoyer les styles obsolètes
- [ ] 12. Tester en mode fullscreen

---

## 📊 RÉSULTAT ATTENDU

**AVANT:**
- GlobalVideoPlayer: ~3323 lignes
- Code gestures mélangé avec logique player

**APRÈS:**
- GlobalVideoPlayer: ~2900 lignes (-400 lignes)
- Hook useVideoGestures: ~380 lignes (logique gestures)
- VideoFeedbackOverlay: ~300 lignes (UI feedbacks)
- Code mieux organisé et maintenable

---

## 🚀 PROCHAINES ÉTAPES

1. **Implémenter Volume Control**
   - Installer: `react-native-volume-manager` ou `react-native-system-setting`
   - Intégrer dans le callback `onVolumeChange`

2. **Implémenter Brightness Control**
   - Installer: `react-native-device-brightness` ou `react-native-system-setting`
   - Intégrer dans le callback `onBrightnessChange`

3. **Implémenter Zoom Vidéo**
   - Modifier les styles du composant Video
   - Utiliser transform scale ou ajuster le resizeMode

4. **Tests**
   - Tester tous les gestures en mode fullscreen
   - Vérifier les feedbacks visuels
   - Tester les conflits de gestures (double-tap vs swipe)
   - Tester avec écran verrouillé

---

*Guide créé pour la Phase 3 de refactorisation du GlobalVideoPlayer*
