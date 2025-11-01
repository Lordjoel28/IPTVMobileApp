# 🔒 Architecture du Contrôle Parental - Version Simplifiée

## 📋 Vue d'ensemble

**Principe :** Le **Profile** est la source de vérité pour les restrictions. Le **ParentalControlService** gère uniquement le PIN et les vérifications.

```
┌─────────────────────────────────────────────────────────────┐
│                        UTILISATEUR                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    PROFILE SERVICE                          │
│  • Stocke les restrictions dans le profil                   │
│  • blockedCategories, blockedKeywords, etc.                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              PARENTAL CONTROL SERVICE                       │
│  • Vérifie le PIN                                           │
│  • Vérifie l'accès selon restrictions du profil            │
│  • Gère déverrouillages temporaires                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    MODAL PIN / UI                           │
│  • Affiche le clavier PIN                                   │
│  • Options de déverrouillage temporaire                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Restrictions Disponibles

### 1. **Profils Enfants** (`isKids: true`)
- ✅ Blocage automatique contenu adulte
- ✅ Détection par mots-clés (xxx, adult, +18, etc.)
- ✅ Détection par catégories adultes
- ✅ + Toutes les restrictions personnalisées ci-dessous

### 2. **Restrictions par Catégorie**
```typescript
profile.blockedCategories = ['News', 'Sports', 'Films'];
profile.visibleGroups = ['Enfants', 'Dessins Animés']; // Whitelist (filtre préférence)
```

**🔑 Distinction importante:**
- **`blockedCategories`** (Contrôle Parental): Blocage de sécurité nécessitant un PIN. Les chaînes sont affichées avec un badge 🔒 et nécessitent un déverrouillage.
- **`visibleGroups`** (Éditer Profil): Filtre de préférence, sans PIN. Les chaînes sont simplement cachées de l'interface 🙈 pour améliorer l'expérience utilisateur.
- **Priorité**: Les vérifications de sécurité (`blockedCategories`) sont effectuées en premier, puis le filtre de préférence (`visibleGroups`).

### 3. **Restrictions par Mots-clés**
```typescript
profile.blockedKeywords = ['violence', 'guerre', 'horreur'];
```
Bloque toute chaîne dont le nom/catégorie/groupe contient ces mots.

### 4. **Restrictions par Chaînes Spécifiques**
```typescript
profile.blockedChannels = ['channel_123', 'channel_456'];
```

### 5. **Restrictions Horaires**
```typescript
profile.allowedTimeSlots = [
  {
    days: [1, 2, 3, 4, 5], // Lundi à Vendredi
    startTime: '17:00',
    endTime: '20:00'
  },
  {
    days: [0, 6], // Dimanche et Samedi
    startTime: '08:00',
    endTime: '22:00'
  }
];
```

### 6. **Temps d'Écoute Quotidien**
```typescript
profile.maxDailyMinutes = 120; // 2 heures max par jour
```
- Compteur réinitialisé automatiquement à minuit
- Incrémenté pendant la lecture

---

## 🔑 Gestion du PIN

### Configuration
```typescript
await ParentalControlService.setPin('1234');
```

### Vérification
```typescript
const isValid = await ParentalControlService.verifyPin('1234');
```

### Changement
```typescript
await ParentalControlService.changePin('1234', '5678');
```

### Suppression
```typescript
await ParentalControlService.removePin('1234');
```

---

## 🔓 Déverrouillage Temporaire

Permet à un parent de débloquer temporairement des catégories :

```typescript
// Débloquer "Films" et "Sports" pendant 30 minutes
await ParentalControlService.unlockTemporarily(
  profile,
  '1234', // PIN parental
  30,     // Durée en minutes
  ['Films', 'Sports']
);
```

Le déverrouillage est stocké dans `profile.temporaryUnlock` :
```typescript
{
  grantedAt: 1699876543210,
  expiresAt: 1699878343210,
  unlockedCategories: ['Films', 'Sports']
}
```

---

## 🎬 Flux d'Utilisation

### Scénario : Enfant veut regarder une chaîne

```typescript
// 1. Récupérer le profil actif
const profile = await ProfileService.getActiveProfile();

// 2. Vérifier l'accès
const result = await ParentalControlService.checkAccess(channel, profile);

if (result.allowed) {
  // ✅ Accès autorisé
  playChannel(channel);
} else if (result.requiresPin) {
  // 🔒 Bloqué - afficher modal PIN
  showPinModal({
    channel,
    profile,
    reason: result.reason,
    blockedBy: result.blockedBy
  });
}
```

### Scénario : Parent entre le PIN

```typescript
// Dans le modal PIN
const handlePinSubmit = async (pin: string, tempUnlockDuration?: number) => {
  if (tempUnlockDuration) {
    // Déverrouillage temporaire
    const success = await ParentalControlService.unlockTemporarily(
      profile,
      pin,
      tempUnlockDuration,
      [channel.category]
    );

    if (success) {
      playChannel(channel);
    }
  } else {
    // Vérification simple
    const isValid = await ParentalControlService.verifyPin(pin);
    if (isValid) {
      playChannel(channel);
    }
  }
};
```

---

## 📊 Comparaison Avant/Après

### ❌ **AVANT (Version Complexe)**

| Aspect | Détails |
|--------|---------|
| **Lignes de code** | ~500 lignes |
| **Storage** | 4 clés AsyncStorage (PIN, unlocks, stats, logs) |
| **Features** | PIN + restrictions + stats + logs + historique |
| **Redondance** | Logique dupliquée Profile/ParentalControl |
| **Performance** | Multiples lectures AsyncStorage |
| **Maintenance** | Complexe, difficile à déboguer |

### ✅ **APRÈS (Version Simplifiée)**

| Aspect | Détails |
|--------|---------|
| **Lignes de code** | ~300 lignes |
| **Storage** | 1 clé AsyncStorage (juste le PIN) |
| **Features** | PIN + restrictions avancées + déverrouillages |
| **Redondance** | Aucune, Profile = source de vérité |
| **Performance** | Lecture unique du profil |
| **Maintenance** | Simple, logique claire |

---

## 🗂️ Structure des Fichiers

```
src/
├── types/
│   └── index.ts                          ✏️  Profile étendu avec restrictions
│
├── services/
│   ├── ProfileService.ts                 ✅ Inchangé (gère les profils)
│   └── ParentalControlService.v2.ts      🆕 Version simplifiée (~300 lignes)
│
├── hooks/
│   └── useParentalControl.ts             ✏️  À simplifier
│
├── components/
│   ├── ParentalPinModal.tsx              ✅ Inchangé (parfait)
│   └── RestrictedBadge.tsx               ✅ Inchangé (parfait)
│
└── screens/
    └── ParentalControlScreen.tsx         ✏️  À simplifier (config PIN + liste profils)
```

---

## 🚀 Migration de l'Ancien Système

### Étape 1 : Remplacer le service
```bash
# Renommer l'ancien
mv src/services/ParentalControlService.ts src/services/ParentalControlService.old.ts

# Activer le nouveau
mv src/services/ParentalControlService.v2.ts src/services/ParentalControlService.ts
```

### Étape 2 : Mettre à jour les imports
Aucun changement nécessaire, l'API publique reste compatible :
- `setPin()`, `verifyPin()`, `checkAccess()`, `unlockTemporarily()`

### Étape 3 : Simplifier les écrans
- `ParentalControlScreen.tsx` : Supprimer sections stats/logs
- `useParentalControl.ts` : Utiliser le profil actif

---

## 📝 Configuration Profil - Exemples

### Profil Enfant (8 ans)
```typescript
{
  name: 'Alice',
  avatar: '👧',
  isKids: true,
  blockedCategories: ['News', 'Films'],
  allowedTimeSlots: [
    {
      days: [1, 2, 3, 4, 5], // Lun-Ven
      startTime: '17:00',
      endTime: '19:00'
    }
  ],
  maxDailyMinutes: 60
}
```

### Profil Ado (14 ans)
```typescript
{
  name: 'Thomas',
  avatar: '👦',
  isKids: false,
  blockedKeywords: ['xxx', 'adult'],
  allowedTimeSlots: [
    {
      days: [1, 2, 3, 4, 5],
      startTime: '18:00',
      endTime: '21:00'
    },
    {
      days: [0, 6], // Week-end
      startTime: '09:00',
      endTime: '23:00'
    }
  ],
  maxDailyMinutes: 180 // 3 heures
}
```

### Profil Adulte avec Restrictions
```typescript
{
  name: 'Papa',
  avatar: '👨',
  isKids: false,
  blockedCategories: ['Sports'], // Papa n'aime pas le sport 😄
  blockedChannels: ['channel_sport1', 'channel_sport2']
}
```

---

## 🔐 Sécurité

### PIN actuel
- ⚠️ Hashage basique (btoa)
- À améliorer avec `expo-crypto` :

```bash
npm install expo-crypto
```

```typescript
import * as Crypto from 'expo-crypto';

private async hashPin(pin: string): Promise<string> {
  const salt = await Crypto.getRandomBytesAsync(16);
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${pin}_${salt.toString()}`
  );
  return `${salt}:${hash}`;
}
```

---

## ✅ Avantages de cette Architecture

1. **Simplicité** : Profil = source unique de vérité
2. **Performance** : Moins de lectures AsyncStorage
3. **Flexibilité** : Restrictions configurables par profil
4. **Maintenabilité** : Code clair et concis
5. **Scalabilité** : Facile d'ajouter de nouvelles restrictions
6. **Sans stats/logs** : Pas de complexité inutile

---

## 🎯 Prochaines Étapes

1. ✅ Types Profile étendus
2. ✅ ParentalControlService.v2 créé et activé
3. ✅ Simplifié `useParentalControl.ts`
4. ✅ Simplifié `ParentalControlScreen.tsx` (stats/logs supprimés)
5. ✅ Mis à jour tous les imports et appels de méthodes
6. ⏳ Tester avec vrais profils
7. ⏳ Améliorer sécurité PIN (expo-crypto)

---

*Architecture simplifiée pour un contrôle parental robuste et performant* 🚀
