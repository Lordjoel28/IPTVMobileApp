# 🔄 Changements d'API - Contrôle Parental

## Guide de migration pour mettre à jour le code existant

---

## 📋 Table des matières

1. [Méthodes renommées](#méthodes-renommées)
2. [Méthodes supprimées](#méthodes-supprimées)
3. [Changements de signature](#changements-de-signature)
4. [Changements de types](#changements-de-types)
5. [Exemples de migration](#exemples-de-migration)

---

## 🔄 Méthodes renommées

### Configuration PIN

```typescript
// ❌ ANCIEN
await ParentalControlService.setParentalPin('1234');

// ✅ NOUVEAU
await ParentalControlService.setPin('1234');
```

### Vérification PIN

```typescript
// ❌ ANCIEN
const isValid = await ParentalControlService.verifyParentalPin('1234');

// ✅ NOUVEAU
const isValid = await ParentalControlService.verifyPin('1234');
```

### Vérification d'accès

```typescript
// ❌ ANCIEN
const result = await ParentalControlService.checkChannelAccess(channel, profile);

// ✅ NOUVEAU
const result = await ParentalControlService.checkAccess(channel, profile);
```

### Déverrouillage temporaire

```typescript
// ❌ ANCIEN
const result = await ParentalControlService.requestTemporaryUnlock(
  profile,
  pin,
  30,
  ['Films']
);
if (result.success) {
  console.log('Déverrouillé pour', result.duration, 'minutes');
}

// ✅ NOUVEAU
const success = await ParentalControlService.unlockTemporarily(
  profile,
  pin,
  30,
  ['Films']
);
if (success) {
  console.log('Déverrouillé avec succès');
}
```

### Révocation déverrouillage

```typescript
// ❌ ANCIEN
await ParentalControlService.revokeTemporaryUnlock(profileId, pin);

// ✅ NOUVEAU
await ParentalControlService.revokeUnlock(profile, pin);
```

---

## ❌ Méthodes supprimées

Ces méthodes n'existent plus dans la nouvelle version :

### Initialisation

```typescript
// ❌ ANCIEN
await ParentalControlService.initialize();

// ✅ NOUVEAU
// Aucune initialisation nécessaire
// Le service est prêt à l'emploi immédiatement
```

### Désactivation

```typescript
// ❌ ANCIEN
await ParentalControlService.disable(pin);

// ✅ NOUVEAU
await ParentalControlService.removePin(pin);
```

### Statistiques

```typescript
// ❌ ANCIEN
const stats = ParentalControlService.getStats();
console.log('Blocages:', stats.totalBlocks);
console.log('Déverrouillages:', stats.temporaryUnlocks);

// ✅ NOUVEAU
// Statistiques supprimées
// Utilisez les logs applicatifs si nécessaire
```

### Logs

```typescript
// ❌ ANCIEN
const logs = await ParentalControlService.getLogs();
const recentLogs = await ParentalControlService.getRecentLogs(10);

// ✅ NOUVEAU
// Logs supprimés
// Utilisez console.log() ou un service de logging tiers
```

### Historique

```typescript
// ❌ ANCIEN
const history = await ParentalControlService.getHistory(profileId);

// ✅ NOUVEAU
// Historique supprimé
// Les données sont maintenant stockées dans le Profile
```

---

## 🔧 Changements de signature

### `checkAccess` - Retour simplifié

```typescript
// ❌ ANCIEN
interface AccessResult {
  allowed: boolean;
  reason?: string;
  requiresPin: boolean;
  blockedBy?: string;
  isAdult?: boolean;
}

// ✅ NOUVEAU (identique, mais plus clair)
interface AccessResult {
  allowed: boolean;
  reason?: string;
  requiresPin: boolean;
  blockedBy?: 'category' | 'keyword' | 'channel' | 'adult' | 'time' | 'daily_limit';
}
```

### `unlockTemporarily` - Retour boolean au lieu d'objet

```typescript
// ❌ ANCIEN
const result = await ParentalControlService.requestTemporaryUnlock(
  profile,
  pin,
  30,
  ['Films']
);
// result = { success: boolean, error?: string, duration?: number }

// ✅ NOUVEAU
const success = await ParentalControlService.unlockTemporarily(
  profile,
  pin,
  30,
  ['Films']
);
// success = boolean
```

### `getActiveUnlocks` - Structure changée

```typescript
// ❌ ANCIEN
const unlocks: TemporaryUnlock[] = ParentalControlService.getActiveUnlocks();
unlocks.forEach(unlock => {
  console.log('Profile ID:', unlock.profileId);
  console.log('Categories:', unlock.unlockedCategories);
});

// ✅ NOUVEAU
const unlocks: Array<{profile: Profile, unlock: TemporaryUnlock}> =
  await ParentalControlService.getActiveUnlocks();

unlocks.forEach(item => {
  console.log('Profile:', item.profile.name);
  console.log('Categories:', item.unlock.unlockedCategories);
});
```

---

## 📦 Changements de types

### Import `TemporaryUnlock`

```typescript
// ❌ ANCIEN
import ParentalControlService, {TemporaryUnlock} from '../services/ParentalControlService';

// ✅ NOUVEAU
import ParentalControlService from '../services/ParentalControlService';
import type {TemporaryUnlock} from '../types';
```

### Profile étendu

```typescript
// ✅ NOUVEAU - Propriétés ajoutées au type Profile
interface Profile {
  // ... propriétés existantes

  // Restrictions par catégorie
  blockedCategories?: string[];
  visibleGroups?: string[];

  // Restrictions avancées
  blockedKeywords?: string[];
  blockedChannels?: string[];

  // Restrictions horaires
  allowedTimeSlots?: TimeSlot[];
  maxDailyMinutes?: number;
  dailyWatchTime?: number;
  lastResetDate?: string;

  // Déverrouillage temporaire
  temporaryUnlock?: TemporaryUnlock;
}
```

---

## 🔀 Exemples de migration

### Exemple 1 : Écran de configuration PIN

```typescript
// ❌ ANCIEN
const setupParentalControl = async (pin: string) => {
  await ParentalControlService.initialize();

  const success = await ParentalControlService.setParentalPin(pin);
  if (success) {
    const stats = ParentalControlService.getStats();
    console.log('Contrôle parental activé. Stats:', stats);
  }
};

// ✅ NOUVEAU
const setupParentalControl = async (pin: string) => {
  const success = await ParentalControlService.setPin(pin);
  if (success) {
    console.log('Contrôle parental activé');
  }
};
```

### Exemple 2 : Vérification d'accès à une chaîne

```typescript
// ❌ ANCIEN
const checkAndPlay = async (channel: Channel) => {
  const profile = await ProfileService.getActiveProfile();
  if (!profile) return;

  const result = await ParentalControlService.checkChannelAccess(channel, profile);

  if (!result.allowed) {
    showPinModal({
      channel,
      reason: result.reason,
      isAdult: result.isAdult
    });
  } else {
    playChannel(channel);
  }
};

// ✅ NOUVEAU
const checkAndPlay = async (channel: Channel) => {
  const profile = await ProfileService.getActiveProfile();
  if (!profile) return;

  const result = await ParentalControlService.checkAccess(channel, profile);

  if (!result.allowed && result.requiresPin) {
    showPinModal({
      channel,
      reason: result.reason,
      blockedBy: result.blockedBy
    });
  } else {
    playChannel(channel);
  }
};
```

### Exemple 3 : Modal PIN avec déverrouillage temporaire

```typescript
// ❌ ANCIEN
const handlePinSubmit = async (pin: string, tempUnlock: boolean) => {
  if (tempUnlock) {
    const result = await ParentalControlService.requestTemporaryUnlock(
      profile,
      pin,
      30,
      [channel.category]
    );

    if (result.success) {
      Alert.alert('Succès', `Déverrouillé pour ${result.duration} minutes`);
      playChannel();
    } else {
      Alert.alert('Erreur', result.error || 'PIN incorrect');
    }
  } else {
    const valid = await ParentalControlService.verifyParentalPin(pin);
    if (valid) {
      playChannel();
    }
  }
};

// ✅ NOUVEAU
const handlePinSubmit = async (pin: string, tempUnlock: boolean) => {
  if (tempUnlock) {
    const success = await ParentalControlService.unlockTemporarily(
      profile,
      pin,
      30,
      [channel.category]
    );

    if (success) {
      Alert.alert('Succès', 'Déverrouillé pour 30 minutes');
      playChannel();
    } else {
      Alert.alert('Erreur', 'PIN incorrect');
    }
  } else {
    const valid = await ParentalControlService.verifyPin(pin);
    if (valid) {
      playChannel();
    }
  }
};
```

### Exemple 4 : Affichage des déverrouillages actifs

```typescript
// ❌ ANCIEN
const DisplayActiveUnlocks = () => {
  const [unlocks, setUnlocks] = useState<TemporaryUnlock[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const activeUnlocks = ParentalControlService.getActiveUnlocks();
      const allProfiles = await ProfileService.getAllProfiles();
      setUnlocks(activeUnlocks);
      setProfiles(allProfiles);
    };
    loadData();
  }, []);

  return (
    <>
      {unlocks.map(unlock => {
        const profile = profiles.find(p => p.id === unlock.profileId);
        return (
          <View key={unlock.profileId}>
            <Text>{profile?.name || 'Inconnu'}</Text>
            <Text>{unlock.unlockedCategories.join(', ')}</Text>
          </View>
        );
      })}
    </>
  );
};

// ✅ NOUVEAU
const DisplayActiveUnlocks = () => {
  const [unlocks, setUnlocks] = useState<Array<{profile: Profile, unlock: TemporaryUnlock}>>([]);

  useEffect(() => {
    const loadData = async () => {
      const activeUnlocks = await ParentalControlService.getActiveUnlocks();
      setUnlocks(activeUnlocks);
    };
    loadData();
  }, []);

  return (
    <>
      {unlocks.map(item => (
        <View key={item.profile.id}>
          <Text>{item.profile.name}</Text>
          <Text>{item.unlock.unlockedCategories.join(', ')}</Text>
        </View>
      ))}
    </>
  );
};
```

### Exemple 5 : Configuration des restrictions

```typescript
// ✅ NOUVEAU - Configuration directe dans le Profile
const configureRestrictions = async (profileId: string) => {
  await ProfileService.updateProfile(profileId, {
    // Blocage sécurité (Contrôle Parental)
    blockedCategories: ['Films pour adultes', 'News'],
    blockedKeywords: ['violence', 'guerre'],
    blockedChannels: ['channel_id_1', 'channel_id_2'],

    // Filtre préférence (Éditer Profil)
    visibleGroups: ['Enfants', 'Dessins animés'],

    // Restrictions horaires
    allowedTimeSlots: [
      {
        days: [1, 2, 3, 4, 5], // Lun-Ven
        startTime: '17:00',
        endTime: '20:00'
      }
    ],
    maxDailyMinutes: 120 // 2 heures max/jour
  });
};
```

---

## 🎯 Checklist de migration

Utilisez cette checklist pour migrer votre code :

- [ ] Remplacer `setParentalPin()` par `setPin()`
- [ ] Remplacer `verifyParentalPin()` par `verifyPin()`
- [ ] Remplacer `checkChannelAccess()` par `checkAccess()`
- [ ] Remplacer `requestTemporaryUnlock()` par `unlockTemporarily()`
- [ ] Remplacer `revokeTemporaryUnlock()` par `revokeUnlock()`
- [ ] Remplacer `disable()` par `removePin()`
- [ ] Supprimer les appels à `initialize()`
- [ ] Supprimer les appels à `getStats()`
- [ ] Supprimer les appels à `getLogs()` et `getRecentLogs()`
- [ ] Supprimer les appels à `getHistory()`
- [ ] Mettre à jour les imports de `TemporaryUnlock` (depuis `../types`)
- [ ] Adapter le traitement des retours de `unlockTemporarily()` (boolean au lieu d'objet)
- [ ] Adapter le traitement de `getActiveUnlocks()` (tableau d'objets avec profile)
- [ ] Tester toutes les fonctionnalités de contrôle parental

---

## 📞 Support

Si vous rencontrez des problèmes lors de la migration, consultez :

1. **PARENTAL_CONTROL_ARCHITECTURE.md** - Architecture complète
2. **PARENTAL_CONTROL_REFACTORING_SUMMARY.md** - Résumé de la refactorisation
3. **src/services/ParentalControlService.ts** - Code source actuel
4. **src/services/ParentalControlService.old.ts** - Ancien code pour référence

---

*Guide de migration API v2 - Contrôle Parental simplifié* 🔄
