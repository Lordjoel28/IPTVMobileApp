# 🌐 RÈGLES I18N - À RESPECTER ABSOLUMENT

> **Dernière mise à jour**: 12 Novembre 2025
> **Statut**: ✅ OBLIGATOIRE pour tout développement

---

## ⚠️ RÈGLE D'OR

### 🚫 INTERDICTION ABSOLUE

**JAMAIS coder en dur des textes en français, anglais, espagnol ou arabe !**

Tous les textes visibles par l'utilisateur DOIVENT passer par le système react-i18next.

---

## ❌ EXEMPLES INTERDITS

```typescript
// ❌ INTERDIT - Textes en dur
<Text>Annuler</Text>
<Text>Se connecter</Text>
<Button title="Confirmer" />

// ❌ INTERDIT - Alerts en dur
Alert.alert('Confirmer', 'Êtes-vous sûr ?');

// ❌ INTERDIT - Variables en dur
const message = "Chargement en cours...";
const error = "Une erreur s'est produite";

// ❌ INTERDIT - Strings dans code
console.log('Données chargées');
throw new Error('Connexion échouée');
```

---

## ✅ EXEMPLES CORRECTS

```typescript
import {useI18n} from '../hooks/useI18n';

const MyScreen = () => {
  const {t: tCommon} = useI18n('common');
  const {t: tSettings} = useI18n('settings');

  // ✅ CORRECT - Utilisation de i18n
  return (
    <View>
      <Text>{tCommon('cancel')}</Text>
      <Text>{tCommon('login')}</Text>
      <Button title={tCommon('confirm')} />
    </View>
  );
};

// ✅ CORRECT - Alerts traduits
const handleDelete = () => {
  Alert.alert(
    tCommon('confirm'),
    tCommon('areYouSure'),
    [
      {text: tCommon('cancel'), style: 'cancel'},
      {text: tCommon('delete'), style: 'destructive', onPress: doDelete}
    ]
  );
};

// ✅ CORRECT - Messages d'erreur
try {
  await loadData();
  console.log('✅', tCommon('dataLoaded'));
} catch (error) {
  Alert.alert(tCommon('error'), tCommon('connectionFailed'));
}
```

---

## 📚 NAMESPACES DISPONIBLES

Choisis le bon namespace selon le contexte :

| Namespace | Usage | Exemples |
|-----------|-------|----------|
| `common` | Textes génériques, boutons communs | cancel, save, delete, confirm, loading |
| `settings` | Écrans de paramètres | videoQuality, performance, cache |
| `player` | Lecteur vidéo | play, pause, volume, fullscreen |
| `channels` | Gestion chaînes | allChannels, favorites, search |
| `profiles` | Profils utilisateurs | createProfile, editProfile, deleteProfile |
| `playlists` | Gestion playlists | addPlaylist, myPlaylists, loadPlaylist |
| `parental` | Contrôle parental | parentalControl, pin, blockedCategories |
| `epg` | Guide TV | tvGuide, liveEPG, programs |
| `themes` | Thèmes visuels | themeDark, themeLight, automaticTheme |

---

## 🔧 AJOUTER UNE NOUVELLE CLÉ

### 1️⃣ Identifier le namespace approprié

Exemple: Un nouveau bouton "Rafraîchir" → `common.json`

### 2️⃣ Ajouter dans LES 4 fichiers de langue

**Emplacement**: `src/i18n/locales/[langue]/[namespace].json`

```bash
# Modifier ces 4 fichiers:
src/i18n/locales/fr/common.json  # Français
src/i18n/locales/en/common.json  # Anglais
src/i18n/locales/es/common.json  # Espagnol
src/i18n/locales/ar/common.json  # Arabe
```

### 3️⃣ Ajouter la clé avec sa traduction

```json
// fr/common.json
{
  "refresh": "Rafraîchir"
}

// en/common.json
{
  "refresh": "Refresh"
}

// es/common.json
{
  "refresh": "Actualizar"
}

// ar/common.json
{
  "refresh": "تحديث"
}
```

### 4️⃣ Utiliser dans le code

```typescript
const {t: tCommon} = useI18n('common');

<Button onPress={handleRefresh}>
  {tCommon('refresh')}
</Button>
```

---

## 🔍 DÉTECTER LES PROBLÈMES

### Vérifier les logs i18next

Si tu vois dans les logs:
```
i18next::translator: missingKey fr common myKey myKey
```

➡️ La clé `myKey` n'existe pas dans `fr/common.json`
➡️ **Action**: Ajoute la clé dans les 4 fichiers de langue

### Vérifier les textes en dur

Rechercher dans le code:
```bash
# Rechercher les textes en français dans les fichiers
grep -r "\"[A-ZÀ-Ù]" src/screens/
grep -r "'[A-ZÀ-Ù]" src/screens/

# Rechercher les Alert en dur
grep -r "Alert.alert(" src/
```

---

## 🎯 CHECKLIST DÉVELOPPEMENT

Avant de commiter du code, vérifie:

- [ ] Aucun texte en dur dans les composants
- [ ] Tous les textes utilisent `t()` ou `tCommon()`, etc.
- [ ] Les nouvelles clés sont ajoutées dans les 4 langues
- [ ] Pas de `missingKey` dans les logs
- [ ] Les Alert.alert utilisent des traductions
- [ ] Les messages d'erreur sont traduits

---

## 📖 DOCUMENTATION COMPLÈTE

Pour plus de détails, consulte:
- **FINAL_I18N_STATUS.md** - Statut complet du système i18n
- **MIGRATION_I18N_GUIDE.md** - Guide de migration (450 lignes)
- **CLAUDE.md** - Documentation générale du projet

---

## 🚀 AVANTAGES DU SYSTÈME

- ✅ **4 langues** supportées (FR, EN, ES, AR)
- ✅ **90% moins de mémoire** (charge 1 seule langue)
- ✅ **RTL automatique** pour l'arabe
- ✅ **Persistance** de la langue choisie
- ✅ **Standard industriel** (react-i18next)
- ✅ **Facile à maintenir** (9 namespaces organisés)

---

**⚠️ RAPPEL FINAL: TOUT texte visible = i18n OBLIGATOIRE !**
