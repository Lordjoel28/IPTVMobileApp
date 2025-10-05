# 🎨 Système de Thèmes IPTV

Ce guide explique comment intégrer et utiliser le système de thèmes dans votre application IPTV.

## 🚀 Installation et Configuration

### 1. Intégration dans App.tsx

Enveloppez votre application avec le `ThemeProvider` :

```tsx
// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from './src/contexts/ThemeContext';
import MainNavigator from './src/navigation/MainNavigator';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <NavigationContainer>
        <MainNavigator />
      </NavigationContainer>
    </ThemeProvider>
  );
};

export default App;
```

### 2. Utilisation dans les Composants

```tsx
// Exemple d'utilisation dans un composant
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors, useIsDark } from '../contexts/ThemeContext';

const MonComposant: React.FC = () => {
  const colors = useThemeColors();
  const isDark = useIsDark();

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <Text style={[styles.title, { color: colors.text.primary }]}>
        Mon Titre
      </Text>
      <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
        Mon sous-titre
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
  },
});
```

## 🎨 Thèmes Disponibles

### 🌙 Thème Sombre (par défaut)
- **ID**: `dark`
- **Description**: Thème sombre élégant avec dégradé violet
- **Couleurs principales**: `#1e1e2e`, `#181825`, `#11111b`

### ☀️ Thème Clair
- **ID**: `light`
- **Description**: Thème clair moderne
- **Couleurs principales**: `#f8f9fa`, `#e9ecef`, `#dee2e6`

### 🌊 Thème Océan
- **ID**: `ocean`
- **Description**: Thème bleu profond inspiré de l'océan
- **Couleurs principales**: `#0f172a`, `#1e293b`, `#334155`

### 🌸 Thème Sunset
- **ID**: `sunset`
- **Description**: Thème rose et orange chaleureux
- **Couleurs principales**: `#1a0b1e`, `#2d1b2e`, `#3d2b3e`

### 🌿 Thème Forêt
- **ID**: `forest`
- **Description**: Thème vert naturel et apaisant
- **Couleurs principales**: `#0f1b0f`, `#1a2e1a`, `#2d3f2d`

## 🎛️ Sélecteur de Thème

### Intégration du ThemeSelector

```tsx
// Dans votre écran de paramètres
import React, { useState } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import ThemeSelector from '../components/ThemeSelector';
import { useTheme } from '../contexts/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialIcons';

const SettingsScreen: React.FC = () => {
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const { currentTheme } = useTheme();

  return (
    <View>
      {/* Bouton pour ouvrir le sélecteur */}
      <TouchableOpacity
        onPress={() => setShowThemeSelector(true)}
        style={styles.themeButton}>
        <Icon name="palette" size={24} />
        <Text>Thème: {currentTheme.name}</Text>
      </TouchableOpacity>

      {/* Sélecteur de thème */}
      <ThemeSelector
        visible={showThemeSelector}
        onClose={() => setShowThemeSelector(false)}
      />
    </View>
  );
};
```

## 🔧 Hooks Disponibles

### `useTheme()`
Hook principal pour accéder à toutes les fonctionnalités de thème :
```tsx
const {
  currentTheme,
  isLoading,
  setTheme,
  toggleTheme,
  resetToSystem,
  availableThemes,
  isSystemTheme
} = useTheme();
```

### `useThemeColors()`
Accès rapide aux couleurs du thème actuel :
```tsx
const colors = useThemeColors();
// colors.background.primary
// colors.text.primary
// colors.accent.primary
// etc.
```

### `useIsDark()`
Vérifier si le thème actuel est sombre :
```tsx
const isDark = useIsDark();
```

### `useThemeTypography()`
Accès aux paramètres de typographie :
```tsx
const typography = useThemeTypography();
// typography.sizes.lg
// typography.fonts.bold
```

### `useThemeSpacing()` et `useThemeBorderRadius()`
Accès aux espacements et bordures :
```tsx
const spacing = useThemeSpacing();
const borderRadius = useThemeBorderRadius();
```

## 🎨 Structure des Couleurs

Chaque thème contient une structure complète de couleurs :

```typescript
interface ThemeColors {
  background: {
    primary: string;      // Fond principal
    secondary: string;    // Fond secondaire
    tertiary: string;     // Fond tertiaire
    gradient: string[];   // Couleurs pour LinearGradient
  };

  surface: {
    primary: string;      // Cartes, modales
    secondary: string;    // Surfaces secondaires
    elevated: string;     // Surfaces élevées
    overlay: string;      // Overlays
  };

  text: {
    primary: string;      // Texte principal
    secondary: string;    // Texte secondaire
    tertiary: string;     // Texte tertiaire
    placeholder: string;  // Placeholders
    inverse: string;      // Texte inversé
  };

  ui: {
    border: string;       // Bordures
    divider: string;      // Séparateurs
    shadow: string;       // Ombres
    ripple: string;       // Effet ripple
  };

  accent: {
    primary: string;      // Couleur principale
    secondary: string;    // Couleur secondaire
    success: string;      // Succès
    warning: string;      // Avertissement
    error: string;        // Erreur
    info: string;         // Information
  };

  navigation: {
    background: string;   // Fond navigation
    activeTab: string;    // Onglet actif
    inactiveTab: string;  // Onglet inactif
    indicator: string;    // Indicateur
  };

  player: {
    background: string;   // Fond lecteur
    controls: string;     // Contrôles
    overlay: string;      // Overlay lecteur
    progress: string;     // Barre de progression
    buffer: string;       // Buffer
  };
}
```

## 💡 Bonnes Pratiques

### 1. **Toujours utiliser les couleurs du thème**
```tsx
// ✅ Correct
style={{ backgroundColor: colors.background.primary }}

// ❌ Incorrect
style={{ backgroundColor: '#000000' }}
```

### 2. **Utiliser LinearGradient pour les fonds**
```tsx
<LinearGradient
  colors={colors.background.gradient}
  style={styles.container}
>
  {/* Contenu */}
</LinearGradient>
```

### 3. **Adapter la StatusBar au thème**
```tsx
<StatusBar
  barStyle={isDark ? 'light-content' : 'dark-content'}
  backgroundColor="transparent"
  translucent
/>
```

### 4. **Sauvegarder les préférences automatiquement**
Le système sauvegarde automatiquement les préférences dans AsyncStorage. Pas besoin de gestion manuelle.

### 5. **Support du thème système**
Le thème système est activé par défaut et suit automatiquement les changements du système (Dark/Light mode).

## 🔄 Migration des Composants Existants

Pour migrer un composant existant :

1. **Importer les hooks**
2. **Remplacer les couleurs hardcodées**
3. **Utiliser les couleurs dynamiques**

```tsx
// Avant
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
  },
  text: {
    color: '#ffffff',
  },
});

// Après
const MyComponent = () => {
  const colors = useThemeColors();

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: colors.background.primary,
    },
    text: {
      color: colors.text.primary,
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <Text style={dynamicStyles.text}>Mon texte</Text>
    </View>
  );
};
```

## 🎯 Exemple Complet

Voir `SearchScreen.tsx` pour un exemple complet d'intégration du système de thèmes dans un composant complexe avec toutes les fonctionnalités (gradients, couleurs dynamiques, icons, etc.).