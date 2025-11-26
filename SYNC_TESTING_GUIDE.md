# 🧪 Guide de Test - Synchronisation Automatique

> Documentation pour tester et valider la synchronisation automatique améliorée

---

## 🎯 Améliorations Implémentées

### ✅ **1. Logs de Debug Améliorés**

**Nouveaux logs ajoutés** :
- ⏰ Temps restant avant prochaine sync
- 📅 Date/heure exacte de la prochaine sync
- 🔔 Déclenchements BackgroundFetch avec timestamp
- 🔍 Source du déclenchement (timer, app-start, app-resume-long, background-fetch)

### ✅ **2. Interface de Test BackgroundFetch**

**Nouvelle section dans Paramètres > Synchronisation** :
- 🧪 Bouton "Tester BackgroundFetch"
- 📊 Affichage de la prochaine sync prévue
- 📈 Stats détaillées (dernière sync, taux de succès)

### ✅ **3. Scheduler Fiable Multi-Stratégie**

**Nouveau service `ReliableSyncScheduler`** avec 3 stratégies combinées :
1. **Timer périodique** : Vérifie toutes les 30 min (quand app active)
2. **AppState listener** : Sync au démarrage + retour app > 30 min
3. **BackgroundFetch** : Opportuniste (quand système Android le permet)

---

## 🧪 Tests à Effectuer

### **Test 1 : Logs de Debug**

**Objectif** : Vérifier que les logs affichent correctement les infos de sync

**Procédure** :
```bash
# 1. Builder et installer l'app
cd android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk

# 2. Monitorer les logs
adb logcat | grep -E "\[AutoSync\]|\[SyncScheduler\]|BackgroundFetch"
```

**Logs attendus au démarrage** :
```
🚀 [SyncScheduler] Initialisation...
✅ [SyncScheduler] Timer démarré (vérif toutes les 30 min)
✅ BackgroundFetch configuré, status: 2
📅 BackgroundFetch intervalle: 12h (720 min)
⏰ [AutoSync] Prochaine sync dans 11h 45min
📅 [AutoSync] Prochaine sync prévue: 15/11/2025 13:20
```

**✅ Critères de validation** :
- [ ] Logs affichent le temps restant avant sync
- [ ] Date/heure de la prochaine sync visible
- [ ] Pas d'erreurs dans les logs

---

### **Test 2 : Interface Utilisateur**

**Objectif** : Vérifier que l'UI affiche correctement les infos

**Procédure** :
1. Ouvrir l'app
2. Aller dans **Paramètres** → **⚙️ Paramètres**
3. Cliquer sur **🔄 Synchronisation Automatique**

**✅ Critères de validation** :
- [ ] Section "📊 Statistiques" affiche :
  - [ ] Dernière synchronisation (date/heure)
  - [ ] **Prochaine synchronisation** (date/heure en bleu)
  - [ ] Total syncs, Réussies, Échouées, Taux de succès
- [ ] Section "🧪 Debug (Développeurs)" visible
- [ ] Bouton "Tester BackgroundFetch" présent

---

### **Test 3 : BackgroundFetch Manuel**

**Objectif** : Tester si BackgroundFetch peut être déclenché manuellement

**Procédure** :
1. Dans l'app, aller dans **Paramètres** → **Synchronisation Automatique**
2. Activer la synchronisation automatique (si désactivée)
3. Cliquer sur **🧪 Tester BackgroundFetch**
4. Confirmer dans l'alerte
5. Monitorer les logs immédiatement

**Logs attendus (dans 1-2 secondes)** :
```
🧪 [DEBUG] Déclenchement manuel BackgroundFetch...
🔔 [SyncScheduler] BackgroundFetch déclenché: com.iptv.manual-test à 15/11/2025 01:30:45
🔄 [BackgroundFetch] Auto-sync activé, démarrage sync...
🔄 [AutoSync] Démarrage synchronisation...
...
✅ [BackgroundFetch] Sync terminée: { success: true }
```

**✅ Critères de validation** :
- [ ] Alerte "Test BackgroundFetch lancé !" apparaît
- [ ] Logs BackgroundFetch visibles dans logcat
- [ ] Sync démarre (si intervalle dépassé) OU message "Prochaine sync dans X heures"
- [ ] Pas d'erreurs

---

### **Test 4 : Timer Périodique (App Active)**

**Objectif** : Vérifier que le timer vérifie la sync toutes les 30 min

**Procédure** :
1. Laisser l'app ouverte (premier plan)
2. Attendre 30 minutes
3. Monitorer les logs

**Logs attendus (toutes les 30 min)** :
```
⏰ [SyncScheduler] Vérification périodique (timer)...
🔍 [SyncScheduler] Vérification sync (source: timer)
⏰ [AutoSync] Prochaine sync dans 11h 15min
```

**✅ Critères de validation** :
- [ ] Logs de vérification toutes les 30 min
- [ ] Sync démarre si intervalle dépassé (12h par défaut)
- [ ] Sinon, affiche temps restant

**Note** : Pour accélérer le test, vous pouvez temporairement modifier `checkIntervalMinutes: 1` dans `useSyncInitialization.ts` (vérif toutes les 1 min au lieu de 30)

---

### **Test 5 : Retour App après Arrière-Plan**

**Objectif** : Vérifier la sync au retour de l'app après > 30 min

**Procédure** :
1. Ouvrir l'app
2. Mettre l'app en arrière-plan (bouton Home)
3. Attendre 31 minutes
4. Rouvrir l'app
5. Monitorer les logs

**Logs attendus** :
```
📱 [SyncScheduler] App en arrière-plan
⏸️ [SyncScheduler] Timer stoppé (app background)
... (31 min plus tard)
📱 [SyncScheduler] App redevenue active
✅ [SyncScheduler] Timer démarré (vérif toutes les 30 min)
🔄 [SyncScheduler] Retour après 31 min - Vérification sync...
🔍 [SyncScheduler] Vérification sync (source: app-resume-long)
```

**✅ Critères de validation** :
- [ ] Timer stoppé quand app en background
- [ ] Timer redémarré au retour
- [ ] Vérification sync après retour > 30 min
- [ ] Pas de vérification si retour < 30 min

---

### **Test 6 : Démarrage App**

**Objectif** : Vérifier la sync au premier lancement de l'app

**Procédure** :
1. Forcer l'arrêt complet de l'app
   ```bash
   adb shell am force-stop com.iptvmobileapp
   ```
2. Relancer l'app
3. Monitorer les logs

**Logs attendus** :
```
🚀 [useSyncInitialization] Initialisation AutoSyncService...
🚀 [SyncScheduler] Initialisation...
📱 [SyncScheduler] App redevenue active
🚀 [SyncScheduler] Premier lancement - Vérification sync...
🔍 [SyncScheduler] Vérification sync (source: app-start)
```

**✅ Critères de validation** :
- [ ] Sync vérifiée au premier lancement
- [ ] Si intervalle dépassé → sync démarre
- [ ] Sinon → affiche temps restant

---

### **Test 7 : Changement de Fréquence**

**Objectif** : Vérifier que la fréquence est bien mise à jour

**Procédure** :
1. Dans l'app, aller dans **Synchronisation Automatique**
2. Changer l'intervalle (ex: 12h → 24h)
3. Monitorer les logs

**Logs attendus** :
```
⏰ [AutoSync] Intervalle: 24h
✅ BackgroundFetch configuré, status: 2
📅 BackgroundFetch intervalle: 24h (1440 min)
⏰ [SyncScheduler] Intervalle mis à jour: 24h
```

**✅ Critères de validation** :
- [ ] BackgroundFetch reconfiguré avec nouvel intervalle
- [ ] Scheduler mis à jour
- [ ] Prochaine sync recalculée avec nouvel intervalle

---

## 📋 Récapitulatif des Critères de Validation Globaux

### ✅ **Vérification Changements Serveur**
- [x] Requête HEAD avec `Last-Modified` + `ETag`
- [x] Téléchargement uniquement si modifié
- [x] Délai minimum 5 min entre syncs
- [x] Cache intelligent

### ✅ **Synchronisation Automatique**
- [ ] Sync au démarrage (si intervalle dépassé)
- [ ] Sync retour app > 30 min (si intervalle dépassé)
- [ ] Timer périodique (30 min) quand app active
- [ ] BackgroundFetch opportuniste
- [ ] Logs informatifs à chaque étape

### ✅ **Interface Utilisateur**
- [ ] Prochaine sync affichée dans l'UI
- [ ] Bouton test BackgroundFetch fonctionnel
- [ ] Stats précises (total/succès/échecs)
- [ ] Configuration fréquence (12h, 24h, 3j, 7j)

---

## 🐛 Résolution de Problèmes

### **BackgroundFetch ne se déclenche pas**

**Cause** : Android limite BackgroundFetch (économie batterie)

**Solutions** :
- ✅ Timer périodique prend le relais (quand app active)
- ✅ Sync au retour app > 30 min
- ⚠️ Pour tests : Désactiver optimisation batterie pour l'app
  ```bash
  # Dans l'app Android
  Paramètres > Applications > IPTV App > Batterie > Non optimisée
  ```

### **Logs absents**

**Cause** : Filtrage logcat trop strict

**Solution** :
```bash
# Logs ALL (verbose)
adb logcat *:V | grep -E "AutoSync|SyncScheduler|BackgroundFetch"
```

### **Timer ne se déclenche pas**

**Cause** : App en arrière-plan (timer stoppé)

**Solution** : Normal ! Le timer ne fonctionne que quand app active. BackgroundFetch + AppState prennent le relais.

---

## 📊 Logs de Référence Complets

### **Démarrage Normal**
```
🚀 [useSyncInitialization] Initialisation AutoSyncService...
🔄 [AutoSync] Initialisation v2.0...
📂 [AutoSync] Config chargée
📂 [AutoSync] Stats chargées
✅ BackgroundFetch configuré, status: 2
📅 BackgroundFetch intervalle: 12h (720 min)
⏰ [AutoSync] Mode IPTV Smarters Pro: Pas de timer périodique
✅ [AutoSync] Initialisé v2.0
🚀 [SyncScheduler] Initialisation...
✅ [SyncScheduler] Timer démarré (vérif toutes les 30 min)
✅ [SyncScheduler] BackgroundFetch configuré
✅ [SyncScheduler] Initialisé avec succès
📅 [SyncScheduler] Prochaine sync dans 11h 45min (15/11/2025 13:20)
✅ [useSyncInitialization] AutoSyncService + ReliableSyncScheduler initialisés
```

### **Sync Forcée Réussie**
```
⚡ [AutoSync] Synchronisation forcée
🔄 [AutoSync] Démarrage synchronisation...
🎯 [AutoSync] Sync playlist active: Monde (M3U)
📡 [AutoSync] Sync M3U URL...
📥 [AutoSync] M3U URL Headers: {"etag": "...", "lastModified": "..."}
💾 [AutoSync] Cache: {"etag": "...", "lastModified": "...", "updatedAt": ...}
🔄 [AutoSync] Last-Modified changé - Mise à jour détectée
📥 [AutoSync] M3U modifié - Re-téléchargement...
📥 [AutoSync] M3U téléchargé: 2633KB
✅ [AutoSync] Playlist mise à jour EN PLACE
✅ [AutoSync] Playlist M3U mise à jour avec succès
📺 [AutoSync] Synchronisation EPG intelligente...
✅ [AutoSync] EPG synchronisé pour 50 chaînes
✅ [AutoSync] Terminé en 95877ms
📅 [AutoSync] Prochaine sync prévue: 15/11/2025 13:20
```

### **Vérification Périodique (Aucune Sync Nécessaire)**
```
⏰ [SyncScheduler] Vérification périodique (timer)...
🔍 [SyncScheduler] Vérification sync (source: timer)
⏰ [AutoSync] Prochaine sync dans 11h 15min
📅 [SyncScheduler] Prochaine sync dans 11h 15min (15/11/2025 13:20)
```

---

## 🎯 Conclusion

Les 3 améliorations implémentées garantissent :
1. **Logs détaillés** pour debugging facile
2. **Test manuel BackgroundFetch** pour validation
3. **Fiabilité maximale** avec multi-stratégie (Timer + AppState + BackgroundFetch)

**Prochaines étapes suggérées** :
- Exécuter les tests 1 à 7 ci-dessus
- Valider les critères de chaque test
- Reporter tout problème avec les logs complets

**Bon test ! 🚀**
