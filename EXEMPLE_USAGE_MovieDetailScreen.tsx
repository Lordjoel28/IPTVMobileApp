/**
 * 📖 EXEMPLE D'UTILISATION - MovieDetailScreen
 * Démonstration du composant refactorisé avec différents cas d'usage
 */

import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import MovieDetailScreen from './src/screens/vod/MovieDetailScreen';

const Stack = createStackNavigator();

// ============================================================================
// EXEMPLE 1 : DONNÉES COMPLÈTES (Comme le film "Dune")
// ============================================================================
const movieDataComplete = {
  id: '12345',
  movie_id: 'dune-2021',
  name: 'Dune',
  stream_url: 'https://example.com/dune.mp4',
  cover_url: 'https://image.tmdb.org/t/p/w500/poster-dune.jpg',
  backdrop_url: 'https://image.tmdb.org/t/p/original/backdrop-dune.jpg',
  category_name: 'Science-Fiction',
  release_date: '2021-09-15',
  duration: '2h 35min',
  genre: 'Science-Fiction, Aventure',
  rating: '8.1',
  plot: `Paul Atréides, jeune homme aussi doué que brillant, est voué à connaître un destin hors du commun qui le dépasse totalement. Il doit se rendre sur la planète la plus dangereuse de l'Univers pour assurer l'avenir de sa famille et de son peuple.`,
  cast: [
    'Timothée Chalamet (Paul Atréides)',
    'Rebecca Ferguson (Lady Jessica)',
    'Oscar Isaac (Duke Leto Atréides)',
    'Josh Brolin (Gurney Halleck)',
    'Stellan Skarsgård (Baron Vladimir Harkonnen)',
    'Zendaya (Chani)',
    'Jason Momoa (Duncan Idaho)',
  ],
  container_extension: 'mkv',
};

// ============================================================================
// EXEMPLE 2 : DONNÉES PARTIELLES (Quelques infos manquantes)
// ============================================================================
const movieDataPartial = {
  id: '67890',
  movie_id: 'unknown-movie-2023',
  name: 'Le Film Mystère',
  stream_url: 'https://example.com/mystery-movie.mp4',
  cover_url: 'https://via.placeholder.com/300x450/2A2A2A/FFFFFF?text=Affiche',
  // backdrop_url: undefined, // Pas d'image de fond
  category_name: 'Thriller',
  release_date: '2023-01-01',
  // duration: undefined, // Durée non disponible
  genre: 'Thriller',
  rating: '7.3',
  plot: `Un thriller captivant qui vous tiendra en haleine du début à la fin.`,
  // cast: [], // Casting non disponible
  // container_extension: undefined, // Format non spécifié
};

// ============================================================================
// EXEMPLE 3 : DONNÉES MINIMALES (Beaucoup d'infos manquantes)
// ============================================================================
const movieDataMinimal = {
  id: '11111',
  movie_id: 'minimal-movie',
  name: 'Film Sans Infos',
  stream_url: 'https://example.com/minimal-movie.mp4',
  // cover_url: undefined, // Pas d'affiche
  // backdrop_url: undefined, // Pas d'image de fond
  category_name: 'Action',
  // release_date: undefined, // Pas de date
  // duration: undefined, // Pas de durée
  // genre: undefined, // Pas de genre
  // rating: undefined, // Pas de rating
  // plot: undefined, // Pas de synopsis
  // cast: undefined, // Pas de casting
  // container_extension: undefined, // Pas de format
};

// ============================================================================
// COMPOSANT D'EXEMPLE : Navigation avec MovieDetailScreen
// ============================================================================
const ExampleApp = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}>
        {/* Exemple 1 : Données complètes */}
        <Stack.Screen
          name="MovieDetailComplete"
          component={MovieDetailScreen}
          initialParams={{
            movie: movieDataComplete,
            playlistId: 'playlist-123',
          }}
        />

        {/* Exemple 2 : Données partielles */}
        <Stack.Screen
          name="MovieDetailPartial"
          component={MovieDetailScreen}
          initialParams={{
            movie: movieDataPartial,
            playlistId: 'playlist-123',
          }}
        />

        {/* Exemple 3 : Données minimales */}
        <Stack.Screen
          name="MovieDetailMinimal"
          component={MovieDetailScreen}
          initialParams={{
            movie: movieDataMinimal,
            playlistId: 'playlist-123',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default ExampleApp;

// ============================================================================
// NOTES D'UTILISATION
// ============================================================================
/**
 *
 * 1. GESTION DES DONNÉES MANQUANTES
 * ---------------------------------
 * Le composant MovieDetailScreen est conçu pour gérer gracieusement les données manquantes :
 *
 * - Si `cover_url` est manquant → affiche un placeholder gris avec texte "Film"
 * - Si `backdrop_url` est manquant → utilise `cover_url` ou un placeholder
 * - Si `plot` est manquant → affiche "Aucun synopsis disponible pour ce film"
 * - Si `cast` est vide/manquant → affiche "Informations sur le casting non disponibles"
 * - Si `rating` est manquant → la section rating est simplement cachée
 * - Si `release_date`, `genre`, `duration` manquent → ces métadonnées ne s'affichent pas
 *
 *
 * 2. OPTIMISATIONS MODE PAYSAGE
 * -----------------------------
 * Le design s'adapte automatiquement selon l'orientation :
 *
 * - MODE PORTRAIT :
 *   - Synopsis et Casting en pleine largeur (empilés verticalement)
 *   - Header avec bordures arrondies
 *
 * - MODE PAYSAGE :
 *   - Synopsis et Casting côte à côte (flex: 48% chacun)
 *   - Header pleine largeur sans bordures
 *   - Hauteur du header = 50% de la hauteur d'écran
 *
 *
 * 3. FONCTIONNALITÉS INTERACTIVES
 * -------------------------------
 * - Bouton Retour (haut gauche) → navigation.goBack()
 * - Bouton Favoris (haut droite) → toggleFavorite() avec vibration
 * - Bouton Lecture → navigation vers ChannelPlayer
 * - Bouton Bande-annonce → notification (fonctionnalité à implémenter)
 *
 *
 * 4. INTÉGRATION i18n
 * -------------------
 * Tous les textes utilisent le système i18n (react-i18next) :
 * - tCommon('play') → "Lecture"
 * - tCommon('trailer') → "Bande-annonce"
 * - tCommon('noSynopsisAvailable') → "Aucun synopsis disponible"
 * - tCommon('noCastingAvailable') → "Informations sur le casting non disponibles"
 *
 *
 * 5. PALETTE DE COULEURS (Design "Dune")
 * ---------------------------------------
 * - Background principal : #1A1A1A (noir profond)
 * - Cartes et header : #2A2A2A (gris foncé)
 * - Bouton lecture : #007AFF (bleu Apple)
 * - Bouton trailer : #3A3A3A (gris moyen)
 * - Rating star : #FFD700 (or)
 * - Bouton favoris actif : #FF3B30 (rouge)
 * - Textes principaux : white
 * - Textes secondaires : lightgray
 *
 *
 * 6. PERFORMANCES
 * ---------------
 * - Utilise FastImage pour les images (cache intelligent)
 * - LinearGradient pour les dégradés fluides
 * - SafeAreaView pour gérer les encoches
 * - ScrollView avec showsVerticalScrollIndicator={false}
 * - Vibration légère (15ms) sur toggle favoris
 *
 */
