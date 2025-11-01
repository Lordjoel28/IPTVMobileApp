/**
 * 🎨 Exemple d'intégration du système de thèmes dans App.tsx
 * Ce fichier montre comment intégrer le ThemeProvider dans votre application
 */

import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {StatusBar} from 'react-native';
import {ThemeProvider, useIsDark} from '../contexts/ThemeContext';

// Vos navigateurs existants
// import MainNavigator from '../navigation/MainNavigator';
// import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Composant interne qui utilise le thème pour la StatusBar
const AppContent: React.FC = () => {
  const isDark = useIsDark();

  return (
    <>
      {/* StatusBar adaptatif au thème */}
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      {/* Votre navigation existante */}
      {/* <MainNavigator /> */}
    </>
  );
};

// App principal avec ThemeProvider
const App: React.FC = () => {
  return (
    <ThemeProvider>
      {/* Si vous utilisez react-native-gesture-handler */}
      {/* <GestureHandlerRootView style={{ flex: 1 }}> */}
      <NavigationContainer>
        <AppContent />
      </NavigationContainer>
      {/* </GestureHandlerRootView> */}
    </ThemeProvider>
  );
};

export default App;

/*
INSTRUCTIONS D'INTÉGRATION :

1. Remplacez votre App.tsx existant par ce modèle
2. Importez vos navigateurs dans les commentaires
3. Décommentez GestureHandlerRootView si vous l'utilisez
4. Le ThemeProvider doit envelopper toute l'application
5. AppContent utilise les hooks de thème pour adapter la StatusBar

STRUCTURE RECOMMANDÉE :
App.tsx
├── ThemeProvider (racine)
├── GestureHandlerRootView (optionnel)
├── NavigationContainer
└── AppContent (utilise les hooks de thème)
    └── MainNavigator (vos écrans)

AVANTAGES :
✅ Thèmes disponibles dans toute l'app
✅ StatusBar adaptative automatique
✅ Sauvegarde automatique des préférences
✅ Support du thème système
✅ Performance optimisée avec Context
*/
