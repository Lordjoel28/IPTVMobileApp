# 📺 Guide de Migration SQLite EPG

## 🎯 Objectif

Migration du système EPG de **AsyncStorage** vers **SQLite** via WatermelonDB pour résoudre définitivement les problèmes de limite de stockage.

## 🔄 Processus de Migration

### Phase 1 : Migration Transparente

1. **Remplacement du fichier** :
   ```bash
   # Sauvegarder l'ancien
   mv src/services/epg/EPGCacheManager.ts src/services/epg/EPGCacheManager.old.ts

   # Activer la nouvelle version
   mv src/services/epg/EPGCacheManagerV2.ts src/services/epg/EPGCacheManager.ts
   ```

2. **Initialisation de la base** :
   - L'app détecte automatiquement l'absence de SQLite
   - Migration automatique des données AsyncStorage existantes
   - Marquage de migration terminée

### Phase 2 : Configuration React Native

3. **Metro Configuration** (si nécessaire) :
   ```javascript
   // metro.config.js
   module.exports = {
     resolver: {
       assetExts: ['bin', 'txt', 'jpg', 'png', 'json', 'db'],
     },
   };
   ```

4. **Android Configuration** :
   ```xml
   <!-- android/app/src/main/AndroidManifest.xml -->
   <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
   ```

## ✅ Vérification Migration

### Logs à surveiller :
```
🔄 [EPGCacheV2] Initialisation avec migration SQLite...
🔄 [EPGCacheV2] Migration AsyncStorage → SQLite...
✅ [EPGCacheV2] Migration terminée
✅ [EPGCacheV2] Cache SQLite restauré: X chaînes, Y programmes
```

### Tests de fonctionnement :
1. **Sauvegarde** : 60K+ programmes sans erreur
2. **Redémarrage** : EPG disponible immédiatement
3. **Performance** : Recherche et navigation fluides
4. **Espace** : Pas de limite de stockage

## 🔧 Nouvelles Fonctionnalités

### API Enrichie :
```typescript
// Programmes d'une chaîne avec pagination
await EPGCacheManager.getProgrammesForChannel(channelId, startTime, endTime);

// Programme actuellement diffusé
await EPGCacheManager.getCurrentProgramme(channelId);

// Recherche avancée
await EPGCacheManager.searchProgrammes("sport", 50);
```

### Optimisations automatiques :
- **Index SQLite** pour requêtes rapides
- **Fenêtre glissante** 24h pour économiser l'espace
- **Batch operations** pour performance maximale
- **WAL mode** pour concurrence optimale

## 🚨 Rollback (si nécessaire)

En cas de problème, retour rapide :
```bash
# Restaurer l'ancien système
mv src/services/epg/EPGCacheManager.ts src/services/epg/EPGCacheManagerV2.ts
mv src/services/epg/EPGCacheManager.old.ts src/services/epg/EPGCacheManager.ts
```

## 📊 Bénéfices Attendus

### Avant (AsyncStorage) :
- ❌ Limite 6MB → `SQLITE_FULL`
- ❌ Fallback → 0 programmes sauvés
- ❌ Pas d'EPG après redémarrage

### Après (SQLite) :
- ✅ **Stockage illimité** (plusieurs GB possibles)
- ✅ **60K+ programmes** sauvegardés sans problème
- ✅ **EPG persistant** après redémarrage
- ✅ **Requêtes SQL** rapides et flexibles
- ✅ **Performance TiviMate** niveau professionnel

## 🎯 Instructions d'Activation

**Pour activer la migration maintenant :**

1. Exécuter la commande de remplacement des fichiers
2. Redémarrer l'app React Native
3. Tester le téléchargement EPG
4. Vérifier la persistance après redémarrage

La migration est **automatique** et **transparente** pour l'utilisateur !