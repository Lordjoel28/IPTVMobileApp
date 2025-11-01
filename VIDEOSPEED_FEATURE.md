# 🎬 Fonctionnalité Vitesse de Lecture - Documentation

## 📋 **Vue d'ensemble**

Implémentation de la vitesse de lecture variable pour les flux IPTV, compatible avec le contenu VOD et Catch-up.

## 🎯 **Fonctionnalités implémentées**

### ✅ **Interface utilisateur**
- **Écran Settings** modifié avec nouvelle option vitesse
- **6 vitesses disponibles** : 0.5x, 0.75x, 1.0x, 1.25x, 1.5x, 2.0x
- **Interface intuitive** avec boutons orange pour sélection active
- **Information claire** : "VOD/Catch-up uniquement"

### ✅ **Service de persistance**
- **VideoSettingsService** - Gestion centralisée des préférences
- **AsyncStorage** - Sauvegarde automatique des choix
- **Paramètres par défaut** - 1.0x vitesse normale
- **Import/Export** - Backup des paramètres

### ✅ **Hook intelligent**
- **usePlaybackSpeed** - Détection automatique flux
- **Compatibilité VOD** - Activation automatique pour contenu compatible
- **Flux LIVE** - Désactivation automatique pour chaînes directes
- **Patterns de détection** - URLs live, métadonnées

## 🔧 **Architecture technique**

```
src/
├── screens/
│   └── VideoPlayerSettingsScreen.tsx    # Interface utilisateur
├── services/
│   └── VideoSettingsService.ts         # Persistance des données
├── hooks/
│   └── usePlaybackSpeed.ts             # Logique vitesse
└── components/                         # Composants existants (SettingsMenu, etc.)
```

## 📱 **Utilisation**

### **Dans les Settings**
1. **Navigation** : Settings → Lecteur Vidéo
2. **Section** : 🎬 Paramètres de Lecture
3. **Option** : ⚡ Vitesse de lecture
4. **Sélection** : Toucher le bouton de vitesse désiré
5. **Sauvegarde** : Automatique

### **Dans le lecteur vidéo**
```javascript
import { usePlaybackSpeed } from '../hooks/usePlaybackSpeed';

const VideoPlayer = () => {
  const { changeSpeed, isSupported, detectStreamCompatibility } = usePlaybackSpeed({
    speed: 1.0,
    autoDetectCompatibility: true
  });

  // Détecter compatibilité
  useEffect(() => {
    detectStreamCompatibility(channel.url, channel.metadata);
  }, [channel]);

  // Appliquer vitesse
  const handleSpeedChange = (speed) => {
    if (changeSpeed(speed)) {
      console.log(`Vitesse changée: ${speed}x`);
    }
  };

  return (
    <Video
      source={{uri: channel.url}}
      rate={currentSpeed}
      // ...
    />
  );
};
```

## 🔍 **Détection automatique**

### **Flux LIVE (vitesse fixe)**
- URLs contenant : `/live/`, `/stream/`, `.m3u8.*live`
- Protocoles : `rtmp://`, `rtsp://`, `udp://`
- Ports TV : `:8080`, `:8000`, `:9981`
- Métadonnées : `isLive: true`, `live: true`

### **Flux VOD (vitesse variable)**
- URLs contenant : `/vod/`, `/movie/`, `/series/`
- Extensions : `.mp4`, `.mkv`, `.avi`
- Métadonnées : `contentType: 'video/mp4'`

## 🎨 **Interface visuelle**

### **Boutons de vitesse**
- **Dimensions** : 15% largeur, padding 10px
- **Style** : Fond transparent, bordure blanche
- **Actif** : Fond orange (#FF9800), texte blanc
- **Inactif** : Fond transparent, texte gris clair

### **Section dans les settings**
```
⚡ Vitesse de lecture
Actuellement: 1.0x (VOD/Catch-up uniquement)

[0.5x] [0.75x] [1.0x] [1.25x] [1.5x] [2.0x]
```

## ⚙️ **Configuration des vitesses**

### **Vitesse par défaut**
```javascript
const defaultSpeeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
```

### **Personnalisation**
```javascript
const customSpeeds = [0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0];
```

## 🔄 **Compatibilité**

### **✅ Supporté**
- react-native-video ✅
- VOD local ✅
- Catch-up TV ✅
- Streams HTTP progressifs ✅

### **❌ Non supporté**
- Chaînes LIVE directes ❌
- Flux RTMP/RTSP live ❌
- Streams MPEG-TS live ❌

## 🚀 **Intégration future**

### **Options envisagées**
1. **Saut intelligent** - Avancer/reculer 10s/30s
2. **Lecture arrière-plan** - Audio uniquement
3. **Contrôles gestuels** - Swipe volume/luminosité
4. **Picture-in-Picture** - Contrôle global

### **Évolutions possibles**
- Détection plus précise des flux
- Vitesse personnalisable par utilisateur
- Raccourcis clavier pour tablette
- Intégration avec contrôles existants (SettingsMenu)

## 📝 **Notes importantes**

1. **Performance** : La détection automatique est légère et rapide
2. **Stockage** : Les préférences sont persistantes entre sessions
3. **Compatibilité** : Détecte automatiquement si le flux permet la vitesse
4. **UX** : Messages clairs quand la vitesse n'est pas disponible
5. **Fallback** : Toujours 1.0x par défaut si problème

## 🎯 **Conclusion**

Cette implémentation offre une expérience utilisateur moderne pour la lecture IPTV, avec gestion intelligente de la compatibilité des flux et une interface intuitive dans les paramètres vidéo.