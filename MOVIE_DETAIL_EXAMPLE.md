# 🎬 MovieDetailScreen - Guide d'Utilisation

## Design Amélioré

Le composant `MovieDetailScreen` a été entièrement redesigné pour correspondre au style moderne de l'exemple "Dune" avec :

### ✨ Caractéristiques Principales

1. **Layout Optimisé Mode Paysage**
   - Header avec backdrop en pleine largeur (50% hauteur écran min)
   - Affiche du film (170x250px) alignée en bas à gauche
   - Informations et boutons alignés à droite de l'affiche
   - Sections Synopsis et Casting en cartes séparées en dessous

2. **Navigation Intuitive**
   - Icône retour (arrow-back) en haut à gauche
   - Icône cœur (heart/heart-outline) en haut à droite pour favoris
   - Icônes Ionicons blanches avec zone tactile de 48x48px

3. **Section Header Élégante**
   - Image backdrop en arrière-plan avec dégradé progressif
   - Titre du film (28px, bold, blanc)
   - Métadonnées (année • genre • durée)
   - Badge IMDb avec étoile dorée
   - Boutons "Lecture" (bleu #007AFF) et "Bande-annonce" (gris #3A3A3A)

4. **Gestion Robuste des Données Manquantes**
   - Synopsis : "Aucun synopsis disponible pour ce film."
   - Casting : "Non spécifié" si pas de réalisateur/acteurs
   - Toutes les informations optionnelles gérées gracieusement

5. **Internationalisation 100%**
   - Toutes les chaînes utilisent `tCommon()`
   - Support FR, EN, ES, AR

---

## 📋 Structure des Props

```typescript
interface MovieDetailProps {
  movie: {
    name: string;                    // Titre du film
    cover_url: string;               // URL affiche (poster)
    backdrop_url?: string;           // URL image de fond (backdrop)
    release_date?: string;           // Date de sortie (YYYY-MM-DD)
    added?: string;                  // Date d'ajout (fallback pour année)
    genre?: string;                  // Genre (ex: "Sci-Fi/Action")
    duration?: string;               // Durée (ex: "2h 46m")
    rating?: string;                 // Note IMDb (ex: "8.7")
    plot?: string;                   // Synopsis
    director?: string;               // Réalisateur
    cast?: string;                   // Acteurs (séparés par virgules)
    container_extension?: string;    // Format (ex: "mkv", "mp4")
    youtube_trailer?: string;        // URL trailer YouTube
    movie_id?: string;               // ID film
    category_name?: string;          // Catégorie
    stream_url: string;              // URL stream
    id: string;                      // ID unique
  };
  playlistId: string;
}
```

---

## 🎨 Exemples d'Utilisation

### Exemple 1 : Film Complet (toutes les données)

```typescript
const movieComplete: VodMovie = {
  id: '12345',
  name: 'DUNE: PART TWO',
  cover_url: 'https://example.com/dune-poster.jpg',
  backdrop_url: 'https://example.com/dune-backdrop.jpg',
  release_date: '2024-03-01',
  genre: 'Sci-Fi/Action',
  duration: '2h 46m',
  rating: '8.7',
  plot: 'Paul Atreides s\'unit à Chani et aux Fremen pour mener une guerre de vengeance contre ceux qui ont détruit sa famille. Confronté à un choix entre l\'amour de sa vie et le destin de l\'univers connu, il s\'efforce d\'empêcher un terrible futur que lui seul peut prévoir.',
  director: 'Denis Villeneuve',
  cast: 'Timothée Chalamet, Zendaya, Rebecca Ferguson, Javier Bardem',
  container_extension: 'mkv',
  youtube_trailer: 'https://youtube.com/watch?v=...',
  movie_id: 'dune2024',
  category_name: 'Science-Fiction',
  stream_url: 'https://example.com/stream/dune.m3u8',
};

// Navigation
navigation.navigate('MovieDetailScreen', {
  movie: movieComplete,
  playlistId: 'my-playlist-id'
});
```

### Exemple 2 : Film avec Données Minimales

```typescript
const movieMinimal: VodMovie = {
  id: '67890',
  name: 'A Breed Apart [MULTI-SUB]',
  cover_url: 'https://example.com/breed-poster.jpg',
  stream_url: 'https://example.com/stream/breed.m3u8',
  release_date: '1748-01-01',
  rating: '4.885',
  container_extension: 'mkv',
  movie_id: 'breed1748',
  category_name: 'Films',
};

// Résultat attendu :
// - Synopsis : "Aucun synopsis disponible pour ce film."
// - Casting : "Non spécifié"
// - Genre : "Non spécifié"
// - Durée : pas affiché
// - Réalisateur/Acteurs : pas affichés
```

### Exemple 3 : Film Sans Backdrop (utilise cover_url)

```typescript
const movieNoCackdrop: VodMovie = {
  id: '11111',
  name: 'The Silent Mountain',
  cover_url: 'https://example.com/silent-poster.jpg',
  // backdrop_url absent → utilise cover_url
  release_date: '2023-11-15',
  genre: 'Thriller/Mystery',
  duration: '1h 58m',
  rating: '7.2',
  plot: 'Un groupe d\'alpinistes découvre un terrible secret enfoui dans les montagnes...',
  director: 'Sarah Johnson',
  cast: 'Mark Williams, Emma Stone, David Lee',
  stream_url: 'https://example.com/stream/silent.m3u8',
  movie_id: 'silent2023',
  category_name: 'Thriller',
};
```

---

## 🎯 Points Clés du Design

### Dimensions

```typescript
const POSTER_WIDTH = 170;        // Largeur affiche
const POSTER_HEIGHT = 250;       // Hauteur affiche
const HEADER_HEIGHT = Math.max(screenHeight * 0.5, 320); // Hauteur header
```

### Palette de Couleurs

```typescript
const colors = {
  background: '#1A1A1A',        // Fond principal
  card: '#2A2A2A',              // Fond cartes/header
  textPrimary: '#FFFFFF',       // Texte principal
  textSecondary: '#CCCCCC',     // Texte secondaire
  buttonPrimary: '#007AFF',     // Bouton lecture
  buttonSecondary: '#3A3A3A',   // Bouton trailer
  ratingGold: '#FFD700',        // Badge IMDb
  heartRed: '#FF4444',          // Favori actif
};
```

### Layout Header

```
┌─────────────────────────────────────────────────┐
│  ←                                          ♥   │ Navigation
│                                                 │
│  ╔═══════════╗                                  │
│  ║           ║  📋 Titre du Film                │
│  ║  AFFICHE  ║  📅 2024 • Sci-Fi • 2h 46m       │
│  ║           ║  ⭐ IMDb 8.7/10                   │
│  ║  170x250  ║                                  │
│  ╚═══════════╝  [▶ Lecture] [🎬 Bande-annonce] │
└─────────────────────────────────────────────────┘
```

---

## 🔧 Fonctionnalités

### Callbacks

- **onBackPress** : `navigation.goBack()` (flèche retour)
- **onFavoriteToggle** : `toggleFavorite()` (icône cœur)
- **onPlayPress** : `handlePlay()` → Navigation vers ChannelPlayer
- **onTrailerPress** : `handleTrailer()` → Notification (non implémenté)

### Gestion des Favoris

Le composant utilise `FavoritesService` pour :
- Vérifier si le film est en favoris au chargement
- Ajouter/retirer des favoris avec vibration (15ms)
- Afficher notifications de succès/erreur

### Notifications

- ✅ "Ajouté aux favoris" (success, 2s)
- ℹ️ "Retiré des favoris" (info, 2s)
- ⚠️ "Aucun profil actif" (error, 3s)
- ❌ "Erreur lors de la mise à jour des favoris" (error, 3s)
- ℹ️ "Bande-annonce non disponible" (info, 2s)

---

## 📱 Responsive

Le design est optimisé pour le **mode paysage** :

- Header : 50% de la hauteur d'écran (min 320px)
- Padding adaptatif avec `SafeAreaInsets`
- ScrollView verticale avec `showsVerticalScrollIndicator={false}`
- Sections inférieures avec padding horizontal dynamique

---

## ✅ Checklist de Test

- [ ] Affichage avec toutes les données
- [ ] Affichage avec données minimales
- [ ] Affichage sans backdrop (utilise cover_url)
- [ ] Affichage sans synopsis
- [ ] Affichage sans casting
- [ ] Affichage sans rating IMDb
- [ ] Toggle favori (ajout/retrait)
- [ ] Navigation retour
- [ ] Lancement lecture
- [ ] Clic bande-annonce
- [ ] Scroll vertical fluide
- [ ] Responsive portrait/paysage
- [ ] Internationalisation (FR/EN/ES/AR)

---

## 🚀 Prochaines Améliorations Possibles

1. **Lecture de bande-annonce YouTube** (intégration `react-native-youtube-iframe`)
2. **Galerie d'images** (plusieurs backdrops en carousel)
3. **Films similaires** (section "Vous aimerez aussi")
4. **Partage** (bouton de partage du film)
5. **Téléchargement** (bouton téléchargement hors-ligne)
6. **Sous-titres** (liste des sous-titres disponibles)
7. **Qualités disponibles** (HD, Full HD, 4K)
8. **Avis utilisateurs** (section commentaires/notes)

---

**Design conforme à l'exemple "Dune" avec gestion robuste des données et expérience utilisateur optimale ! 🎬**
