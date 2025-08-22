/**
 * 📺 ChannelsScreen - Interface navigation chaînes style IPTV Smarters Pro
 * Structure: Sidebar catégories + Grille chaînes + Recherche
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Dimensions,
  FlatList,
  TextInput,
  Image,
  Animated,
  Alert,
  InteractionManager,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import ChannelCard from '../components/ChannelCard';
import type { Category } from '../types';
// import SmartImage from '../components/common/SmartImage'; // Temporairement désactivé

const { width, height } = Dimensions.get('window');

interface Channel {
  id: string;
  name: string;
  logo?: string;
  group: string;
  url: string;
  type: 'M3U' | 'XTREAM';
}

interface Category {
  id: string;
  name: string;
  count: number;
  channels: Channel[];
}

interface ChannelsScreenProps {
  route: {
    params: {
      playlistId: string;
      channelsCount?: number;
      useWatermelonDB?: boolean;
    };
  };
  navigation: any;
}

const ChannelsScreen: React.FC<ChannelsScreenProps> = ({ route, navigation }) => {
  const { playlistId, channelsCount = 0, useWatermelonDB = false } = route.params || {};
  
  // 🔧 CORRECTION: Respecter l'architecture originale
  // M3U → Legacy (useWatermelonDB: false)  
  // Xtream → WatermelonDB (useWatermelonDB: true)
  console.log('🔧 Architecture respectée:', {
    useWatermelonDB,
    channelsCount,
    type: useWatermelonDB ? 'Xtream (WatermelonDB)' : 'M3U (Legacy)'
  });
  
  // États
  const [channels, setChannels] = useState<Channel[]>([]);
  const [playlistName, setPlaylistName] = useState<string>('Playlist');
  const [totalChannels, setTotalChannels] = useState<number>(0);
  const [serverUrl, setServerUrl] = useState<string>('');
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [displayedChannels, setDisplayedChannels] = useState<Channel[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMoreChannels, setHasMoreChannels] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const CHANNELS_PER_PAGE = 100; // WatermelonDB pagination optimisée
  
  // 🛡️ SOLUTION RACE CONDITION: useRef pour capturer états actuels sans stale state
  const currentStateRef = useRef({
    channels: [] as Channel[],
    displayedChannels: [] as Channel[],
    categories: [] as Category[],
    selectedCategory: null as Category | null
  });
  
  // ⚡ OPTIMISATION GROSSES PLAYLISTS - getItemLayout pour performances
  const ITEM_HEIGHT = 148; // 140 (height) + 8 (marginBottom) = 148px - AJUSTÉ pour 2 lignes
  const getItemLayout = React.useCallback((data: ArrayLike<Channel> | null | undefined, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }), []);

  // 🚀 OPTIMISATION MÉMOIRE - KeyExtractor optimisé pour 10K+ items
  const keyExtractor = React.useCallback((item: Channel, index: number) => {
    return `${item.id}-${index}`;
  }, []);

  // Normaliser les noms de catégories pour cohérence
  const normalizeCategoryName = (name: string): string => {
    if (!name || name.trim() === '') return 'Non classé';
    
    return name
      .trim()
      .replace(/[<>]/g, '') // Supprimer caractères dangereux
      .replace(/[|]/g, ' - ') // Remplacer pipes par tirets
      .replace(/\s+/g, ' ') // Normaliser espaces multiples
      .substring(0, 50) // Limiter longueur
      .replace(/^\w/, c => c.toUpperCase()); // Première lettre majuscule
  };

  // NOUVEAU : Charger favoris et historique depuis AsyncStorage
  const loadFavoritesAndHistory = async () => {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      
      // Charger favoris
      const favoritesData = await AsyncStorage.getItem('favorites_channels');
      const favoritesCount = favoritesData ? JSON.parse(favoritesData).length : 0;
      
      // Charger historique
      const historyData = await AsyncStorage.getItem('channels_history');
      const historyCount = historyData ? JSON.parse(historyData).length : 0;
      
      return { favoritesCount, historyCount };
    } catch (error) {
      console.log('⚠️ Erreur chargement favoris/historique:', error);
      return { favoritesCount: 0, historyCount: 0 };
    }
  };

  // 🔄 MISE À JOUR REF À CHAQUE CHANGEMENT D'ÉTAT - Solution GitHub Race Condition
  useEffect(() => {
    currentStateRef.current = {
      channels: channels,
      displayedChannels: displayedChannels,
      categories: categories,
      selectedCategory: selectedCategory
    };
    console.log('🔄 REF UPDATED:', {
      channels: channels.length,
      displayedChannels: displayedChannels.length,
      categories: categories.length,
      selectedCategory: selectedCategory?.name
    });
  }, [channels, displayedChannels, categories, selectedCategory]);

  // Chargement des chaînes depuis l'ID de playlist
  useEffect(() => {
    console.log('🔄 useEffect ChannelsScreen - DÉMARRAGE');
    console.log('🔄 playlistId:', playlistId);
    console.log('🔄 useWatermelonDB:', useWatermelonDB);
    
    // Mode de chargement identifié
    console.log(`🔄 Mode: ${useWatermelonDB ? 'Xtream (WatermelonDB)' : 'M3U (Legacy)'} - ${channelsCount} chaînes`);
    
    const loadChannels = async () => {
      if (!playlistId) {
        console.error('❌ Aucun ID de playlist fourni');
        setIsLoading(false);
        return;
      }
      
      try {
        console.log('📺 ChannelsScreen - Chargement playlist:', playlistId);
        console.log('🍉 useWatermelonDB flag:', useWatermelonDB);
        
        // 🍉 NOUVELLE LOGIQUE: WatermelonDB ou ancien système selon le flag
        if (useWatermelonDB) {
          console.log('🍉🍉🍉 USING WATERMELONDB for channels loading');
          await loadChannelsFromWatermelonDB();
          return;
        } else {
          console.log('📦 USING LEGACY SYSTEM for channels loading');
          await loadChannelsFromLegacySystem();
          return;
        }
      } catch (error) {
        console.error('❌ Erreur récupération chaînes:', error);
        Alert.alert(
          '❌ Erreur',
          'Impossible de charger les chaînes de la playlist.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        setIsLoading(false);
      }
    };
    
    loadChannels();
  }, [playlistId, useWatermelonDB]);

  // Fonction pour normaliser les URLs de logos Xtream
  const normalizeXtreamLogoUrl = (logoUrl: string, serverUrl: string): string => {
    if (!logoUrl || logoUrl.trim() === '' || logoUrl === 'null') return '';
    
    // URL complète - retourner directement
    if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
      return logoUrl;
    }
    
    // URL relative - construire avec serveur
    const cleanServerUrl = serverUrl.replace(/\/$/, '');
    if (logoUrl.startsWith('/')) {
      return `${cleanServerUrl}${logoUrl}`;
    }
    
    // Cas Xtream typique: chemin simple sans slash
    return `${cleanServerUrl}/${logoUrl}`;
  };

  // 🍉 NOUVELLE FONCTION: Chargement depuis WatermelonDB avec lazy loading
  const loadChannelsFromWatermelonDB = async () => {
    try {
      console.log('🍉 Loading from WatermelonDB - playlistId:', playlistId);
      console.log('🍉 WatermelonDB function CALLED - début chargement');
      const startTime = Date.now();
      
      // Importer le service WatermelonDB
      const WatermelonXtreamService = (await import('../services/WatermelonXtreamService')).default;
      
      // Pagination WatermelonDB optimisée - Charger par pages de 100
      const result = await WatermelonXtreamService.getPlaylistWithChannels(playlistId, 100, 0);
      console.log(`⏱️ WatermelonDB Query Time: ${Date.now() - startTime}ms`);
      
      console.log('🍉 WatermelonDB result:', {
        playlist: result.playlist?.name,
        channels: result.channels?.length,
        categories: result.categories?.length,
        totalChannels: result.totalChannels
      });
      
      if (!result.playlist) {
        throw new Error('Playlist WatermelonDB introuvable');
      }
      
      // Récupérer le serveur Xtream pour normaliser les logos
      const playlistServerUrl = result.playlist.server || '';
      setServerUrl(playlistServerUrl);
      
      // Convertir les modèles WatermelonDB en objets Channel compatibles AVEC LOGOS CORRIGÉS
      const convertedChannels: Channel[] = result.channels.map((channel: any, index: number) => {
        const rawLogo = channel.logoUrl || channel.streamIcon || '';
        const normalizedLogo = normalizeXtreamLogoUrl(rawLogo, playlistServerUrl);
        
        // Debug pour les premiers logos
        if (index < 5) {
          console.log(`🔍 LOGO DEBUG ${index}: "${channel.name}"`);
          console.log(`   Logo brut: "${rawLogo}"`);
          console.log(`   Logo normalisé: "${normalizedLogo}"`);
          console.log(`   Serveur: "${serverUrl}"`);
        }
        
        return {
          id: channel.id,
          name: channel.name || 'Sans nom',
          logo: normalizedLogo,
          group: channel.groupTitle || channel.categoryName || 'Non classé',
          url: channel.streamUrl || '',
          type: 'XTREAM' as const
        };
      });
      
      console.log('🍉 Converted channels:', convertedChannels.length);
      console.log('🍉 Sample channels:', convertedChannels.slice(0, 3).map(ch => ({
        name: ch.name,
        group: ch.group,
        hasLogo: !!ch.logo,
        logoUrl: ch.logo?.substring(0, 50) + (ch.logo?.length > 50 ? '...' : '')
      })));
      
      const categoriesStartTime = Date.now();
      
      // Charger favoris et historique
      const { favoritesCount, historyCount } = await loadFavoritesAndHistory();
      
      // Récupérer les VRAIES catégories Xtream stockées dans WatermelonDB
      const xtreamCategories = result.categories || [];
      console.log('📂 Vraies catégories Xtream trouvées:', xtreamCategories.length);
      
      // CORRECTION: Assigner les vraies chaînes à la catégorie TOUT
      const categoriesWithCounts: Category[] = [
        {
          id: 'all',
          name: 'TOUT',
          count: result.totalChannels || result.playlist.channelsCount || 0,
          channels: convertedChannels // 🔧 CORRECTION: Vraies chaînes au lieu d'array vide
        },
        // NOUVEAU : Catégories spéciales avec icônes modernes et vrais compteurs
        {
          id: 'favorites',
          name: '💙 FAVORIS',
          count: favoritesCount,
          channels: [] // Sera chargé depuis AsyncStorage
        },
        {
          id: 'history',
          name: '📺 RÉCENTS',
          count: historyCount,
          channels: [] // Sera chargé depuis AsyncStorage
        }
      ];
      
      // Ajouter TOUTES les vraies catégories Xtream (314 catégories)
      xtreamCategories.forEach((cat: any) => {
        categoriesWithCounts.push({
          id: cat.categoryId || cat.id,
          name: cat.name || 'Sans nom',
          count: cat.channelsCount || 0,
          channels: [] // Sera chargé dynamiquement
        });
      });
      
      console.log(`⏱️ Categories Processing: ${Date.now() - categoriesStartTime}ms`);
      console.log(`📂 Catégories finales: ${categoriesWithCounts.length} catégories (${categoriesWithCounts.slice(1, 6).map(c => `${c.name}: ${c.count}`).join(', ')}, ...)`);
      
      const setStateStartTime = Date.now();
      
      // Initialiser les données (ne pas mettre dans channels pour éviter useEffect)
      setDisplayedChannels(convertedChannels);
      // setChannels(convertedChannels); // DÉSACTIVÉ pour WatermelonDB - évite le useEffect groupChannelsByCategories
      setPlaylistName(result.playlist.name || 'Playlist WatermelonDB');
      setTotalChannels(result.totalChannels || result.playlist.channelsCount || 0);
      console.log('🔍 DIAGNOSTIC WatermelonDB - Avant setState:');
      console.log('   categoriesWithCounts.length:', categoriesWithCounts.length);
      console.log('   convertedChannels.length:', convertedChannels.length);
      console.log('   categoriesWithCounts[0].channels.length:', categoriesWithCounts[0]?.channels?.length || 0);
      
      setCategories(categoriesWithCounts);
      setSelectedCategory(categoriesWithCounts[0]); // Sélectionner "TOUT"
      setDisplayedChannels(convertedChannels);
      
      // Configurer la pagination
      setCurrentPage(0);
      setHasMoreChannels(convertedChannels.length === CHANNELS_PER_PAGE);
      
      console.log('🔍 DIAGNOSTIC WatermelonDB - Après setState:');
      console.log('   setState appelé avec', categoriesWithCounts.length, 'catégories');
      console.log('   Catégorie TOUT avec', categoriesWithCounts[0]?.channels?.length || 0, 'chaînes');
      
      console.log(`⏱️ React setState Time: ${Date.now() - setStateStartTime}ms`);
      console.log('🍉 ChannelsScreen - WatermelonDB channels loaded successfully');
      
      // Arrêter l'écran de chargement
      setIsLoading(false);
      
    } catch (error) {
      console.error('❌ Erreur chargement WatermelonDB:', error);
      throw error;
    }
  };

  // 📦 FONCTION LEGACY: Chargement depuis l'ancien système (M3U)
  const loadChannelsFromLegacySystem = async () => {
    console.log('📦 Loading from Legacy System - playlistId:', playlistId);
    
    // Importer le service IPTV
    const IPTVService = (await import('../services/IPTVService')).default;
    const iptvService = IPTVService.getInstance();
    await iptvService.initialize();
    
    // Récupérer la playlist avec fallback
    let playlist = await iptvService.getPlaylist(playlistId);
    
    // 🔧 CHUNKING SUPPORT: Vérifier si playlist chunkée même si trouvée (OPTIMISÉ)
    if (playlist && playlist.chunked && playlist.chunkCount && (!playlist.channels || playlist.channels.length === 0)) {
      console.log(`📦 Playlist en mémoire chunkée détectée: ${playlist.chunkCount} chunks à reconstruire...`);
      
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const reconstructedChannels = [];
      let successfulChunks = 0;
      
      // ⚡ OPTIMISATION: Chargement par batch de 3 chunks en parallèle
      const batchSize = 3;
      
      for (let batchStart = 0; batchStart < playlist.chunkCount; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize, playlist.chunkCount);
        
        const batchPromisesArray = [];
        for (let i = batchStart; i < batchEnd; i++) {
          const chunkKey = `playlist_${playlistId}_chunk_${String(i).padStart(3, '0')}`;
          batchPromisesArray.push(
            AsyncStorage.getItem(chunkKey).then(chunkData => ({ index: i, data: chunkData }))
          );
        }
        
        try {
          const batchResults = await Promise.all(batchPromisesArray);
          
          batchResults
            .sort((a, b) => a.index - b.index)
            .forEach(({ index, data }) => {
              if (data) {
                try {
                  const chunk = JSON.parse(data);
                  if (Array.isArray(chunk)) {
                    reconstructedChannels.push(...chunk);
                    successfulChunks++;
                    if (index < 3) console.log(`✅ Chunk ${index}: ${chunk.length} chaînes`);
                  }
                } catch (parseError) {
                  console.warn(`⚠️ Erreur parsing chunk ${index}`);
                }
              }
            });
          
          const progress = Math.round((batchEnd / playlist.chunkCount) * 100);
          console.log(`🔄 Progression: ${progress}% (${successfulChunks} chunks traités)`);
          
        } catch (batchError) {
          console.error(`❌ Erreur batch ${batchStart}-${batchEnd}:`, batchError.message);
        }
      }
      
      if (reconstructedChannels.length > 0) {
        playlist.channels = reconstructedChannels;
        playlist.totalChannels = reconstructedChannels.length;
        console.log(`✅ Reconstruction en mémoire réussie: ${reconstructedChannels.length} chaînes depuis ${successfulChunks}/${playlist.chunkCount} chunks`);
      }
    }
    
    // Fallback si pas de playlist
    if (!playlist) {
      console.log('⚠️ Playlist non trouvée, tentative depuis AsyncStorage...');
      
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const playlistData = await AsyncStorage.getItem(`playlist_${playlistId}`);
      
      if (playlistData) {
        playlist = JSON.parse(playlistData);
        console.log('✅ Playlist récupérée depuis AsyncStorage');
      }
    }
    
    if (!playlist) {
      throw new Error('Playlist introuvable dans le service et le storage');
    }
    
    // 🔧 VALIDATION FINALE: Vérifier structure des chaînes
    if (!playlist.channels || !Array.isArray(playlist.channels)) {
      console.error('❌ Structure channels invalide:', typeof playlist.channels);
      throw new Error('Playlist invalide: structure des chaînes manquante ou corrompue');
    }
    
    console.log('📺 Legacy System - Chaînes chargées:', playlist.channels.length);
    
    setChannels(playlist.channels);
    setPlaylistName(playlist.name || 'Playlist Legacy');
    
    console.log('📺 ChannelsScreen - Legacy system channels loaded successfully');
  };
  
  // 🔧 UNIFIED LOADING: Un seul useEffect unifié (Best Practice 2024)
  useEffect(() => {
    console.log('🔄 UNIFIED DATA LOADING - Mode:', useWatermelonDB ? 'WatermelonDB' : 'Legacy');
    
    if (useWatermelonDB) {
      // WatermelonDB géré par son propre chargement initial - PAS de regroupement ici
      console.log('📺 WatermelonDB: Chargement déjà effectué dans loadChannelsFromWatermelonDB');
    } else if (!useWatermelonDB && channels.length > 0) {
      // Legacy: Effectuer le regroupement SEULEMENT après chargement des données
      console.log('📺 Legacy: Regroupement avec', channels.length, 'chaînes');
      groupChannelsByCategories();
    }
  }, [channels, useWatermelonDB]);

  // Timer cleanup removed for simplicity

  // 🔧 UNIFIED GROUPING: Fonction unifiée qui met à jour les MÊMES états que WatermelonDB
  const groupChannelsByCategories = () => {
    console.log('🔄 UNIFIED GROUPING - Legacy mode - Début regroupement');
    setIsLoading(true);
    
    try {
      console.log('🔄 Regroupement par catégories réelles...');
      console.log(`📊 Analyse de ${channels.length} chaînes pour extraction catégories`);
      
      // Statistiques de catégories détaillées
      const categoryStats = new Map<string, {
        count: number;
        channels: Channel[];
        types: Set<string>;
      }>();
      
      // Analyser toutes les chaînes et extraire les vraies catégories
      channels.forEach((channel, index) => {
        // Extraire le nom de catégorie (group pour M3U, vraie catégorie pour Xtream)
        let categoryName = 'Non classé';
        
        // Essayer plusieurs propriétés pour la catégorie
        const categoryField = (channel as any).groupTitle || channel.group || channel.category || '';
        
        if (categoryField && categoryField.trim() !== '') {
          categoryName = categoryField.trim();
        }
        
        // Nettoyer et normaliser le nom de catégorie
        categoryName = normalizeCategoryName(categoryName);
        
        // Debug pour les premières chaînes
        if (index < 10) {
          console.log(`🔍 Channel ${index}: "${channel.name}" -> catégorie: "${categoryName}"`);
          console.log(`   Props:`, {
            group: channel.group,
            category: channel.category, 
            groupTitle: (channel as any).groupTitle
          });
        }
        
        // Initialiser ou mettre à jour les stats de catégorie
        if (!categoryStats.has(categoryName)) {
          categoryStats.set(categoryName, {
            count: 0,
            channels: [],
            types: new Set()
          });
        }
        
        const stats = categoryStats.get(categoryName)!;
        stats.count++;
        stats.channels.push(channel);
        stats.types.add(channel.type || 'unknown');
      });

      console.log(`📂 ${categoryStats.size} catégories uniques trouvées`);
      
      // Créer la liste des catégories avec compteurs et tri intelligent
      const categoriesList: Category[] = [];
      
      // Ajouter "TOUT" en premier + catégories spéciales
      categoriesList.push({
        id: 'all',
        name: 'TOUT',
        count: channels.length,
        channels: channels
      });
      
      // NOUVEAU : Catégories spéciales pour système legacy avec icônes modernes
      categoriesList.push({
        id: 'favorites',
        name: '💙 FAVORIS',
        count: 0, // TODO: Compter favoris depuis AsyncStorage
        channels: [] // Sera chargé depuis AsyncStorage
      });
      
      categoriesList.push({
        id: 'history',
        name: '📺 RÉCENTS',
        count: 0, // TODO: Compter historique depuis AsyncStorage
        channels: [] // Sera chargé depuis AsyncStorage
      });

      // Convertir Map en array et trier par popularité puis alphabétiquement
      const sortedCategories = Array.from(categoryStats.entries())
        .sort(([nameA, statsA], [nameB, statsB]) => {
          // D'abord par nombre de chaînes (desc), puis alphabétiquement
          if (statsB.count !== statsA.count) {
            return statsB.count - statsA.count;
          }
          return nameA.localeCompare(nameB);
        });

      // Ajouter les vraies catégories triées avec IDs uniques
      const usedIds = new Set(['all']); // Tracker des IDs déjà utilisés
      sortedCategories.forEach(([categoryName, stats], index) => {
        let categoryId = categoryName.toLowerCase()
          .replace(/[^a-z0-9\s]/g, '') // Supprimer caractères spéciaux
          .replace(/\s+/g, '_') // Remplacer espaces par underscores
          .substring(0, 40); // Réduire à 40 pour laisser place au suffix
        
        // Assurer l'unicité en ajoutant un index si nécessaire
        if (usedIds.has(categoryId)) {
          categoryId = `${categoryId}_${index}`;
        }
        usedIds.add(categoryId);
        
        categoriesList.push({
          id: categoryId,
          name: categoryName,
          count: stats.count,
          channels: stats.channels
        });
        
        // Log des catégories populaires
        if (stats.count >= 10) {
          console.log(`📺 ${categoryName}: ${stats.count} chaînes (types: ${Array.from(stats.types).join(', ')})`);
        }
      });

      // 🔧 UNIFIED STATE UPDATE: Même logique que WatermelonDB 
      setCategories(categoriesList);
      setSelectedCategory(categoriesList[0]); // Sélectionner "TOUT" par défaut
      setDisplayedChannels(categoriesList[0]?.channels || []); // 🔧 NOUVEAU: Assurer cohérence displayedChannels
      
      // 🔧 CORRECTION: Configurer la pagination comme WatermelonDB
      setCurrentPage(0);
      setHasMoreChannels(false); // Legacy charge tout d'un coup
      
      console.log('✅ UNIFIED Legacy State Update:', {
        categories: categoriesList.length,
        selectedCategory: categoriesList[0]?.name,
        displayedChannels: categoriesList[0]?.channels?.length || 0
      });
      
      console.log('🏆 Top 5 catégories Legacy:');
      categoriesList.slice(1, 6).forEach(cat => {
        console.log(`   ${cat.name}: ${cat.count} chaînes`);
      });
      
    } catch (error) {
      console.error('❌ Erreur regroupement catégories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleChannelPress = (channel: Channel) => {
    console.log('🛡️ RACE CONDITION FIX - GitHub/Reddit Solutions');
    
    // ⚡ SOLUTION 1: useRef pour éviter stale state (GitHub Issue #194)
    const currentState = currentStateRef.current;
    console.log('📊 REF STATE:', {
      channels: currentState.channels?.length || 0,
      displayedChannels: currentState.displayedChannels?.length || 0,
      categories: currentState.categories?.length || 0,
      selectedCategory: currentState.selectedCategory?.name || 'null'
    });
    
    // ⚡ SOLUTION 2: InteractionManager pour délayer navigation (Issue #1266)
    const performNavigation = () => {
      const { displayedChannels: safeChannels, categories: safeCategories, selectedCategory: safeSelected } = currentState;
      
      if (!safeChannels || safeChannels.length === 0) {
        console.error('❌ REF: Aucune chaîne dans useRef');
        Alert.alert("Race Condition", "États non synchronisés. Réessayez dans un instant.");
        return;
      }
      
      const unifiedCategory: Category = {
        id: 'ref_safe_channels',
        name: 'CHAÎNES (REF SAFE)',
        count: safeChannels.length,
        channels: safeChannels
      };
      
      console.log(`🎬 REF NAVIGATION: ${safeChannels.length} chaînes sécurisées (useRef)`);
      
      navigation.navigate('ChannelPlayer', {
        playlistId,
        allCategories: safeCategories || [unifiedCategory],
        initialCategory: safeSelected || unifiedCategory,
        initialChannels: safeChannels,
        selectedChannel: channel,
        playlistName,
        useWatermelonDB,
      });
    };
    
    // ⚡ SOLUTION 3: InteractionManager.runAfterInteractions (React Router Flux Fix)
    InteractionManager.runAfterInteractions(() => {
      console.log('🚀 Navigation après interactions complétées');
      performNavigation();
    });
  };

  const handleCategorySelect = async (category: Category) => {
    console.log('📂 Catégorie sélectionnée:', category.name);
    
    // Déclencher l'animation de transition
    animateCategoryTransition();
    
    if (!useWatermelonDB) {
      // Ancien système - utiliser les chaînes déjà chargées
      setSelectedCategory(category);
      setCurrentPage(1);
      loadChannelsPage(category.channels, 1);
      return;
    }
    
    setSelectedCategory(category);
    setCurrentPage(0);
    setHasMoreChannels(true);
    
    try {
      const WatermelonXtreamService = (await import('../services/WatermelonXtreamService')).default;
      
      let result;
      if (category.id === 'all') {
        // Charger toutes les chaînes
        result = await WatermelonXtreamService.getPlaylistWithChannels(playlistId, CHANNELS_PER_PAGE, 0);
      } else {
        // Charger chaînes de la catégorie spécifique
        result = await WatermelonXtreamService.getChannelsByCategory(playlistId, category.id, CHANNELS_PER_PAGE, 0);
        // Convertir en format attendu
        result = { channels: result, playlist: null };
      }
      
      if (result.channels && result.channels.length > 0) {
        
        const newChannels = result.channels.map((channel: any) => {
          const rawLogo = channel.logoUrl || channel.streamIcon || '';
          const normalizedLogo = normalizeXtreamLogoUrl(rawLogo, serverUrl);
          
          return {
            id: channel.id,
            name: channel.name || 'Sans nom',
            logo: normalizedLogo,
            group: channel.groupTitle || channel.categoryName || 'Non classé',
            url: channel.streamUrl || '',
            type: 'XTREAM' as const
          };
        });
        
        setDisplayedChannels(newChannels);
        setHasMoreChannels(newChannels.length === CHANNELS_PER_PAGE);
        
        console.log(`✅ Catégorie "${category.name}" chargée: ${newChannels.length} chaînes`);
      }
    } catch (error) {
      console.error('❌ Erreur chargement catégorie:', error);
    }
  };
  
  // Charger une page de chaînes
  const loadChannelsPage = (channels: Channel[], page: number) => {
    const startIndex = 0;
    const endIndex = page * CHANNELS_PER_PAGE;
    const newChannels = channels.slice(startIndex, endIndex);
    
    console.log('🔍 LoadChannelsPage DEBUG:');
    console.log('  - channels input:', Array.isArray(channels), channels?.length);
    console.log('  - newChannels output:', Array.isArray(newChannels), newChannels?.length);
    console.log('  - sample newChannels:', newChannels?.slice(0, 2)?.map(ch => ({ name: ch?.name, id: ch?.id })));
    
    setDisplayedChannels(newChannels);
  };
  
  // Charger plus de chaînes depuis WatermelonDB avec pagination
  const loadMoreChannels = async () => {
    if (!hasMoreChannels || isLoadingMore || !useWatermelonDB || !selectedCategory) return;
    
    setIsLoadingMore(true);
    try {
      const WatermelonXtreamService = (await import('../services/WatermelonXtreamService')).default;
      const nextPage = currentPage + 1;
      const offset = nextPage * CHANNELS_PER_PAGE;
      
      console.log(`📄 Loading page ${nextPage} pour catégorie "${selectedCategory.name}" (offset: ${offset})`);
      
      let result;
      if (selectedCategory.id === 'all') {
        // Charger toutes les chaînes
        result = await WatermelonXtreamService.getPlaylistWithChannels(playlistId, CHANNELS_PER_PAGE, offset);
      } else {
        // Charger chaînes de la catégorie spécifique
        result = await WatermelonXtreamService.getChannelsByCategory(playlistId, selectedCategory.id, CHANNELS_PER_PAGE, offset);
        // Convertir en format attendu
        result = { channels: result, playlist: null };
      }
      
      if (result.channels && result.channels.length > 0) {
        
        const newChannels = result.channels.map((channel: any) => {
          const rawLogo = channel.logoUrl || channel.streamIcon || '';
          const normalizedLogo = normalizeXtreamLogoUrl(rawLogo, serverUrl);
          
          return {
            id: channel.id,
            name: channel.name || 'Sans nom',
            logo: normalizedLogo,
            group: channel.groupTitle || channel.categoryName || 'Non classé',
            url: channel.streamUrl || '',
            type: 'XTREAM' as const
          };
        });
        
        setDisplayedChannels(prev => [...prev, ...newChannels]);
        setCurrentPage(nextPage);
        
        // Vérifier s'il y a encore des chaînes
        if (result.channels.length < CHANNELS_PER_PAGE) {
          setHasMoreChannels(false);
        }
        
        console.log(`✅ Page ${nextPage} chargée: ${newChannels.length} nouvelles chaînes pour "${selectedCategory.name}"`);
      } else {
        setHasMoreChannels(false);
        console.log('🔚 Plus de chaînes à charger');
      }
    } catch (error) {
      console.error('❌ Erreur chargement page suivante:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // NOUVEAU : Rendu avec animation pour compteurs
  const renderCategoryItem = ({ item: category }: { item: Category }) => {
    const isSelected = selectedCategory?.id === category.id;
    
    return (
      <TouchableOpacity
        style={[
          styles.categoryItem,
          isSelected && styles.categoryItemSelected
        ]}
        onPress={() => handleCategorySelect(category)}
        activeOpacity={0.7}
      >
        {/* Layout horizontal simple */}
        <Text 
          style={[
            styles.categoryName,
            isSelected && styles.categoryNameSelected
          ]}
          numberOfLines={1}
        >
          {category.name}
        </Text>
        
        {/* NOUVEAU : Compteur avec animation et container */}
        <Animated.View style={styles.categoryCountContainer}>
          <Animated.Text style={[
            styles.categoryCount,
            isSelected && styles.categoryCountSelected
          ]}>
            {category.count.toLocaleString()} {/* Format avec séparateurs de milliers */}
          </Animated.Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  // Obtenir l'icône selon le nom de catégorie
  const getCategoryIcon = (categoryName: string): string => {
    const name = categoryName.toLowerCase();
    
    if (name === 'tout') return 'apps';
    if (name.includes('sport')) return 'sports-soccer';
    if (name.includes('news') || name.includes('info')) return 'newspaper';
    if (name.includes('movies') || name.includes('film')) return 'movie';
    if (name.includes('kids') || name.includes('enfant')) return 'child-care';
    if (name.includes('music') || name.includes('musique')) return 'music-note';
    if (name.includes('documentary') || name.includes('docu')) return 'school';
    if (name.includes('entertainment')) return 'tv';
    if (name.includes('religion')) return 'place';
    if (name.includes('adult')) return 'block';
    
    return 'tv'; // Icône par défaut
  };

  // GRILLE DYNAMIQUE : Adaptation selon la disponibilité de l'écran
  const getOptimalColumns = (): number => {
    if (sidebarVisible) {
      return 5; // Sidebar visible : 5 colonnes optimales (INCHANGÉ)
    } else {
      return 7; // Mode plein écran : 7 colonnes avec cartes agrandies
    }
  };

  // Simplified state management
  // const [failedLogos, setFailedLogos] = useState<Set<string>>(new Set()); // Désactivé temporairement

  // Animation de transition entre catégories uniquement
  const categoryTransitionAnim = useRef(new Animated.Value(1)).current;
  
  // Animation de transition entre catégories optimisée
  const animateCategoryTransition = () => {
    Animated.sequence([
      // Fade out rapide et fluide
      Animated.timing(categoryTransitionAnim, {
        toValue: 0.3,
        duration: 120, // Plus rapide pour réactivité
        useNativeDriver: true,
        isInteraction: false,
      }),
      // Fade in avec courbe naturelle
      Animated.timing(categoryTransitionAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
        isInteraction: false,
      }),
    ]).start();
  };

  // Rendu d'un item de chaîne avec nouveau composant optimisé
  const renderChannelItem = React.useCallback(({ item: channel, index }: { item: Channel; index: number }) => {
    return (
      <ChannelCard
        channel={channel}
        index={index}
        width={getChannelCardWidth()}
        onPress={handleChannelPress}
        serverUrl={serverUrl}
      />
    );
  }, [serverUrl]); // Dépendances minimales

  // OPTIMISÉ : Calcul largeur pour utiliser TOUT l'espace disponible
  const getChannelCardWidth = (): number => {
    // Calcul précis de l'espace disponible
    const sidebarWidth = sidebarVisible ? (width * 0.32) : 0;
    const availableScreenWidth = width - sidebarWidth;
    
    const columns = getOptimalColumns();
    
    if (sidebarVisible) {
      // Mode sidebar : cartes légèrement plus grandes avec espacement amélioré
      const containerPadding = 6 * 2; // AUGMENTÉ : plus d'espace aux bords
      const cardMargin = 7; // AUGMENTÉ : plus d'espace entre cartes pour occuper l'espace
      const totalMargins = cardMargin * 2 * columns;
      const netWidth = availableScreenWidth - containerPadding - totalMargins;
      const cardWidth = Math.floor(netWidth / columns);
      const minWidth = 88; // AUGMENTÉ : cartes légèrement plus grandes
      return Math.max(cardWidth, minWidth);
    } else {
      // Mode plein écran : utiliser TOUT l'espace avec espacement généreux
      const containerPadding = 8 * 2; // Léger padding aux bords
      const spaceBetweenCards = 6; // Espacement généreux entre cartes
      const totalSpacing = spaceBetweenCards * (columns - 1);
      const netWidth = availableScreenWidth - containerPadding - totalSpacing;
      const cardWidth = Math.floor(netWidth / columns);
      return cardWidth;
    }
  };

  // Composant vide quand aucune chaîne
  const renderEmptyChannels = () => (
    <View style={styles.emptyChannels}>
      <Icon name="tv-off" size={48} color="rgba(255, 255, 255, 0.3)" />
      <Text style={styles.emptyText}>Aucune chaîne dans cette catégorie</Text>
      <Text style={styles.emptySubtext}>
        Sélectionnez une autre catégorie ou vérifiez votre playlist
      </Text>
    </View>
  );

  // Footer avec indicateur de chargement ou fin de liste
  const renderFooter = () => {
    if (isLoadingMore) {
      return (
        <View style={styles.loadingFooter}>
          <Text style={styles.loadingFooterText}>Chargement...</Text>
        </View>
      );
    }
    
    if (!hasMoreChannels && displayedChannels.length > 0) {
      return (
        <View style={styles.endFooter}>
          <Text style={styles.endFooterText}>
            {displayedChannels.length} chaînes chargées
          </Text>
        </View>
      );
    }
    
    return null;
  };


  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" hidden={true} translucent={true} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement des chaînes...</Text>
          <Text style={styles.loadingSubtext}>
            {channelsCount > 0 ? `Reconstruction de ${Math.floor(channelsCount/1000)}K chaînes...` : 'Préparation de la playlist volumineuse...'}
          </Text>
          <Text style={styles.loadingSubtext}>
            Veuillez patienter quelques secondes
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" hidden={true} translucent={true} />
      
      {/* Header simplifié */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>
          {selectedCategory?.name || 'TOUTES LES CHAÎNES'} <Text style={styles.headerTitleCount}>({selectedCategory?.id === 'all' ? totalChannels : displayedChannels.length}{hasMoreChannels ? '+' : ''})</Text>
        </Text>
        
        <View style={styles.headerActions}>
          {/* Bouton pour ouvrir sidebar si fermé */}
          {!sidebarVisible && (
            <TouchableOpacity 
              onPress={() => setSidebarVisible(true)}
              style={styles.headerSidebarButton}
            >
              <Icon name="menu" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          
          {/* Barre de recherche intégrée */}
          <View style={styles.searchContainerHeader}>
            <Icon name="search" size={20} color="rgba(255, 255, 255, 0.6)" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInputHeader}
              placeholder="Rechercher..."
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          
          <TouchableOpacity style={styles.headerButton}>
            <Icon name="more-vert" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Contenu principal - Layout horizontal */}
      <View style={styles.mainContent}>
        
        {/* NOUVEAU : Sidebar épuré style liste */}
        {sidebarVisible && (
        <View style={styles.sidebar}>
          {/* Header simplifié - seulement bouton fermer */}
          <View style={styles.sidebarHeader}>
            <Text style={styles.sidebarTitle}>Catégories</Text>
            <TouchableOpacity 
              onPress={() => setSidebarVisible(false)}
              style={styles.sidebarCloseButton}
            >
              <Icon name="close" size={20} color="rgba(255, 255, 255, 0.7)" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={categories}
            keyExtractor={(item, index) => `category-${item.id}-${index}`}
            renderItem={renderCategoryItem}
            showsVerticalScrollIndicator={false}
            style={styles.categoriesList}
            contentContainerStyle={styles.categoriesListContent}
          />
        </View>
        )}

        {/* ÉTAPE 4: Grille principale des chaînes */}
        <Animated.View style={[styles.channelsGrid, !sidebarVisible && styles.channelsGridFullWidth, { opacity: categoryTransitionAnim }]}>
          <FlatList
            data={displayedChannels}
            keyExtractor={keyExtractor}
            renderItem={renderChannelItem}
            numColumns={getOptimalColumns()}
            key={`channels-grid-${sidebarVisible ? 'sidebar' : 'fullscreen'}-${getOptimalColumns()}`} // Force re-render when columns change
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.channelsGridContent,
              { 
                paddingHorizontal: sidebarVisible ? 6 : 8, // Correspond au containerPadding
                paddingBottom: 20
              }
            ]}
            columnWrapperStyle={sidebarVisible ? styles.rowSpacingSidebar : styles.rowSpacingFullscreen}
            ItemSeparatorComponent={null}
            ListEmptyComponent={renderEmptyChannels}
            ListFooterComponent={renderFooter}
            removeClippedSubviews={true}
            maxToRenderPerBatch={8}
            windowSize={4}
            initialNumToRender={15}
            updateCellsBatchingPeriod={150}
            disableVirtualization={false}
            legacyImplementation={false}
            getItemLayout={getItemLayout}
            keyboardShouldPersistTaps="handled"
            onEndReached={hasMoreChannels ? loadMoreChannels : undefined}
            onEndReachedThreshold={0.5}
            progressViewOffset={50}
            extraData={selectedCategory?.id}
          />
        </Animated.View>
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  loadingSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: '#111111',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700', // BOLD : Maintenu pour les titres importants
    textAlign: 'center',
    flex: 1,
    marginHorizontal: 16,
  },
  headerTitleCount: {
    color: 'rgba(255, 255, 255, 0.7)', // OPACITÉ 70% : Compteur moins proéminent
    fontSize: 16,
    fontWeight: '400', // REGULAR : Poids normal pour le compteur
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  headerSidebarButton: {
    padding: 8,
    marginRight: 16, // ÉLOIGNÉ : 8→16 de la barre de recherche
    borderRadius: 20, // ARRONDI : 8→20 pour forme plus ronde
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: width * 0.32,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#1a1a1a',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    // Ombres identiques aux cartes
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 44,
  },
  sidebarTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700', // BOLD : Pour section importante comme suggéré
    letterSpacing: 0.5,
  },
  sidebarCloseButton: {
    padding: 6, // RÉDUIT : bouton plus compact
    borderRadius: 18, // AUGMENTÉ : plus arrondi
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    minWidth: 32, // RÉDUIT : plus petit
    minHeight: 32, // RÉDUIT : plus petit
    justifyContent: 'center',
    alignItems: 'center',
  },
  // openSidebarButton supprimé - bouton déplacé dans header
  channelsGridFullWidth: {
    flex: 1,
    width: '100%',
  },
  searchContainerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // NOUVEAU : centrer le contenu
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24, // AUGMENTÉ : plus arrondi
    paddingHorizontal: 12,
    paddingVertical: 6, // RÉDUIT : hauteur plus compacte
    marginRight: 8,
    minWidth: 160,
    maxWidth: 220,
    height: 36, // FIXE : hauteur fixe pour cohérence
  },
  searchIcon: {
    marginRight: 6, // RÉDUIT : espacement plus compact
    alignSelf: 'center', // NOUVEAU : centrer verticalement
  },
  searchInputHeader: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0, // SUPPRIMÉ : padding pour centrage parfait
    lineHeight: 16,
    textAlign: 'center', // NOUVEAU : centrer le texte
    textAlignVertical: 'center', // NOUVEAU : centrage vertical Android
  },
  categoriesList: {
    flex: 1,
  },
  categoriesListContent: {
    paddingBottom: 20, // AUGMENTÉ : plus d'espace en bas
    flexGrow: 1, // NOUVEAU : utilise tout l'espace disponible
  },
  categoryItem: {
    // NOUVEAU : Style liste standard simple
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10, // RÉDUIT : plus compact
    marginBottom: 3, // AUGMENTÉ : léger espacement entre items
    backgroundColor: 'transparent',
  },
  categoryItemSelected: {
    // NOUVEAU : Sélection évidente avec fond + barre colorée
    backgroundColor: '#2a2a2a', // Gris plus clair comme suggéré
    borderRadius: 8,
    borderLeftWidth: 4, // NOUVEAU : Barre de couleur vive à gauche
    borderLeftColor: '#4FACFE', // Couleur d'accentuation bleue
  },
  categoryIcon: {
    marginRight: 12,
    width: 20,
  },
  categoryName: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 15, // AUGMENTÉ : Plus lisible
    fontWeight: '400', // REGULAR : Poids normal
    lineHeight: 18,
  },
  categoryNameSelected: {
    color: '#4FACFE', // NOUVEAU : Couleur d'accentuation pour texte sélectionné
    fontWeight: '700', // BOLD : Comme suggéré pour items sélectionnés
  },
  categoryCount: {
    color: 'rgba(255, 255, 255, 0.6)', // OPACITÉ 60% : Moins proéminent comme suggéré
    fontSize: 14, // RÉDUIT : Taille normale pour items non sélectionnés
    fontWeight: '500',
    marginLeft: 8,
    minWidth: 40, // Largeur minimum pour éviter déplacement lors animation
    textAlign: 'right',
  },
  categoryCountSelected: {
    color: 'rgba(79, 172, 254, 0.9)', // NOUVEAU : Accent coloré plus vif pour compteur sélectionné
    fontWeight: '700', // BOLD pour sélection
    fontSize: 18, // PLUS GRAND : Seulement pour l'item sélectionné
    transform: [{ scale: 1.1 }], // ANIMATION : Agrandissement plus visible pour sélection
  },
  categoryCountContainer: {
    // NOUVEAU : Container pour animation fluide
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 45,
  },
  channelsGrid: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  channelsGridContent: {
    paddingTop: 8, // NOUVEAU : espacement en haut
    paddingBottom: 20, // AUGMENTÉ : plus d'espace en bas
  },
  channelsRow: {
    justifyContent: 'flex-start',
    marginBottom: 6,
  },
  // Styles channelCard supprimés - désormais dans ChannelCard.tsx
  emptyChannels: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 16,
  },
  // channelNameFallback supprimé - désormais dans ChannelCard.tsx
  loadingFooter: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingFooterText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  endFooter: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endFooterText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontWeight: '400',
  },
  // NOUVEAU : Styles pour espacement entre rangées
  rowSpacingSidebar: {
    justifyContent: 'space-between', // RESTAURÉ : distribution équitable
    paddingHorizontal: 0,
    marginBottom: 4, // Espacement vertical entre rangées
  },
  rowSpacingFullscreen: {
    justifyContent: 'space-between', // Distribution équitable
    paddingHorizontal: 0, 
    marginBottom: 6, // Plus d'espacement en mode plein écran
  },
});

export default ChannelsScreen;