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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
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
  
  // ⚡ OPTIMISATION GROSSES PLAYLISTS - getItemLayout pour performances
  const ITEM_HEIGHT = 118; // 110 (height) + 8 (marginBottom) = 118px
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

  // Chargement des chaînes depuis l'ID de playlist
  useEffect(() => {
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
      
      // Récupérer les VRAIES catégories Xtream stockées dans WatermelonDB
      const xtreamCategories = result.categories || [];
      console.log('📂 Vraies catégories Xtream trouvées:', xtreamCategories.length);
      
      // OPTIMISATION: Éviter le calcul lourd des compteurs lors du premier chargement
      const categoriesWithCounts: Category[] = [
        {
          id: 'all',
          name: 'TOUT',
          count: result.totalChannels || result.playlist.channelsCount || 0,
          channels: [] // Sera chargé dynamiquement
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
      setCategories(categoriesWithCounts);
      setSelectedCategory(categoriesWithCounts[0]); // Sélectionner "TOUT"
      
      // Configurer la pagination
      setCurrentPage(0);
      setHasMoreChannels(convertedChannels.length === CHANNELS_PER_PAGE);
      
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
  
  // Initialisation - regroupement par catégories (DÉSACTIVÉ pour WatermelonDB)
  useEffect(() => {
    if (!useWatermelonDB && channels.length > 0) {
      console.log('📺 ChannelsScreen - Regroupement avec:', channels.length, 'chaînes (Legacy mode)');
      groupChannelsByCategories();
    } else if (useWatermelonDB) {
      console.log('📺 ChannelsScreen - WatermelonDB mode: Regroupement ignoré, catégories déjà chargées');
    }
  }, [channels]);

  // Timer cleanup removed for simplicity

  // Grouper les chaînes par catégories (ÉTAPE 2: utiliser vraies catégories)
  const groupChannelsByCategories = () => {
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
      
      // Ajouter "TOUT" en premier
      categoriesList.push({
        id: 'all',
        name: 'TOUT',
        count: channels.length,
        channels: channels
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

      setCategories(categoriesList);
      setSelectedCategory(categoriesList[0]); // Sélectionner "TOUT" par défaut
      
      // Initialiser les chaînes affichées avec pagination
      if (categoriesList[0]) {
        loadChannelsPage(categoriesList[0].channels, 1);
      }
      
      console.log('✅ Système de catégories créé:', categoriesList.length, 'catégories');
      console.log('🏆 Top 5 catégories:');
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
    console.log('🎬 Chaîne sélectionnée:', channel.name);
    // ÉTAPE 6: Navigation vers le lecteur vidéo
    // navigation.navigate('VideoPlayer', { channel });
  };

  const handleCategorySelect = async (category: Category) => {
    console.log('📂 Catégorie sélectionnée:', category.name);
    
    if (!useWatermelonDB) {
      // Ancien système - utiliser les chaînes déjà chargées
      setSelectedCategory(category);
      setCurrentPage(1);
      loadChannelsPage(category.channels, 1);
      return;
    }
    
    // Animation fade out puis fade in
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    
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

  // Rendu d'un item de catégorie dans le sidebar - Optimisé
  const renderCategoryItem = ({ item: category }: { item: Category }) => {
    const isSelected = selectedCategory?.id === category.id;
    
    return (
      <TouchableOpacity
        style={styles.categoryItem}
        onPress={() => handleCategorySelect(category)}
        activeOpacity={0.7}
      >
        <View style={[styles.categoryItemContent, isSelected && styles.categoryItemSelected]}>
          {/* Nom de la catégorie */}
          <Text 
            style={[
              styles.categoryName,
              isSelected && styles.categoryNameSelected
            ]}
            numberOfLines={1}
          >
            {category.name}
          </Text>
          
          {/* Compteur de chaînes avec dégradé */}
          <View style={[
            styles.categoryBadge,
            isSelected && styles.categoryBadgeSelected
          ]}>
            <LinearGradient
              colors={isSelected ? ['rgba(30, 70, 120, 0.9)', 'rgba(20, 50, 90, 0.8)'] : ['rgba(40, 40, 40, 0.7)', 'rgba(30, 30, 30, 0.6)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.categoryBadgeGradient}
            >
              <Text style={[
                styles.categoryCount,
                isSelected && styles.categoryCountSelected
              ]}>
                {category.count}
              </Text>
            </LinearGradient>
          </View>
        </View>
        
        {/* Indicateur de sélection */}
        {isSelected && (
          <View style={styles.selectedIndicator} />
        )}
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
      return 5; // Sidebar visible : 5 colonnes optimales
    } else {
      return 7; // Mode plein écran : 7 colonnes pour plus de chaînes
    }
  };

  // Simplified state management
  // const [failedLogos, setFailedLogos] = useState<Set<string>>(new Set()); // Désactivé temporairement

  // Rendu d'un item de chaîne dans la grille - Optimisé avec fallbacks logo
  const renderChannelItem = ({ item: channel, index }: { item: Channel; index: number }) => {
    // 🔧 DEBUG: Log des logos pour diagnostic (premières chaînes seulement)
    if (index < 3) {
      console.log(`📺 Channel ${index}: "${channel.name}" - Logo brut: "${channel.logo || 'MANQUANT'}"`);
    }
    
    // Détecter et réparer l'URL du logo - OPTIMISÉ ET SIMPLE
    const logoUrl = channel.logo;
    const hasLogo = logoUrl && logoUrl.trim() !== '' && logoUrl !== 'null' && logoUrl !== 'undefined';
    
    // 🔧 DEBUG: Afficher les URLs brutes pour diagnostic
    if (index < 5) {
      console.log(`📺 Channel ${index}: "${channel.name}"`);
      console.log(`   Logo brut: "${logoUrl || 'ABSENT'}"`);
      if (hasLogo) {
        console.log(`   ✅ Logo valide détecté`);
      }
    }
    
    return (
      <TouchableOpacity
        style={[
          styles.channelCard,
          { width: getChannelCardWidth() }
        ]}
        onPress={() => handleChannelPress(channel)}
        activeOpacity={0.8}
      >
        {/* Logo simple et direct - PERFORMANCE OPTIMISÉE */}
        {hasLogo ? (
          <Image 
            source={{ 
              uri: logoUrl,
              headers: {
                'User-Agent': 'IPTV-Player/1.0',
                'Accept': 'image/*',
                'Cache-Control': 'max-age=86400' // Cache 24h
              }
            }} 
            style={styles.channelLogoFullscreen}
            resizeMode="contain"
            fadeDuration={100} // Réduire pour performance
            onError={() => {
              if (index < 5) {
                console.log(`❌ Logo échoué: "${channel.name}" -> ${logoUrl}`);
              }
            }}
            onLoad={() => {
              if (index < 5) {
                console.log(`✅ Logo CHARGÉ: "${channel.name}"`);
              }
            }}
            progressiveRenderingEnabled={true}
          />
        ) : (
          <View style={styles.channelLogoPlaceholderFullscreen}>
            {/* Afficher nom de chaîne au lieu d'icône générique */}
            <Text style={styles.channelNameFallback} numberOfLines={3}>
              {channel.name.replace(/\s*\(\d+p\)$/, '').replace(/\|/g, '\n').split(' ').slice(0, 4).join(' ')}
            </Text>
          </View>
        )}

        {/* Nom de la chaîne en overlay avec dégradé d'ombre RENFORCÉ */}
        <LinearGradient
          colors={['transparent', 'rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.95)']}
          locations={[0, 0.3, 1]}
          style={styles.channelNameOverlay}
        >
          <Text style={styles.channelCardName} numberOfLines={2}>
            {channel.name?.replace(/\s*\(\d+p\)$/, '') || 'Sans nom'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // CALCUL DYNAMIQUE : Largeur adaptée selon le nombre de colonnes optimal
  const getChannelCardWidth = (): number => {
    // Calcul précis de l'espace disponible
    const sidebarWidth = sidebarVisible ? (width * 0.32) : 0;
    const availableScreenWidth = width - sidebarWidth;
    
    const columns = getOptimalColumns(); // DYNAMIQUE : selon mode sidebar/plein écran
    const containerPadding = 4 * 2; // Padding du container (4px gauche + 4px droite)
    const cardMargin = 2; // Margin par côté de chaque carte
    
    // Espace occupé par les marges : 2px * 2 (gauche+droite) * N cartes
    const totalMargins = cardMargin * 2 * columns;
    
    // Largeur réellement disponible pour les cartes
    const netWidth = availableScreenWidth - containerPadding - totalMargins;
    
    // Largeur par carte (utilise tout l'espace disponible)
    const cardWidth = Math.floor(netWidth / columns);
    
    // Largeur minimum adaptée au nombre de colonnes
    const minWidth = sidebarVisible ? 70 : 60; // Plus petit en mode plein écran
    
    return Math.max(cardWidth, minWidth);
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
          {selectedCategory?.name || 'TOUTES LES CHAÎNES'} ({selectedCategory?.id === 'all' ? totalChannels : displayedChannels.length}{hasMoreChannels ? '+' : ''})
        </Text>
        
        <View style={styles.headerActions}>
          {/* Barre de recherche intégrée */}
          <View style={styles.searchContainerHeader}>
            <Icon name="search" size={20} color="rgba(255, 255, 255, 0.6)" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInputHeader}
              placeholder="Rechercher"
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
        
        {/* ÉTAPE 3: Sidebar moderne avec dégradé */}
        {sidebarVisible && (
        <View style={styles.sidebar}>
          {/* Header recherche par catégories */}
          <View style={styles.sidebarHeader}>
            <View style={styles.categorySearchContainer}>
              <Icon name="search" size={18} color="rgba(255, 255, 255, 0.6)" style={styles.categorySearchIcon} />
              <TextInput
                style={styles.categorySearchInput}
                placeholder="Rechercher une catégorie"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <TouchableOpacity 
              onPress={() => setSidebarVisible(false)}
              style={styles.sidebarCloseButton}
            >
              <Icon name="close" size={20} color="rgba(255, 255, 255, 0.7)" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={categories}
            keyExtractor={(item) => item.id}
            renderItem={renderCategoryItem}
            showsVerticalScrollIndicator={false}
            style={styles.categoriesList}
            contentContainerStyle={styles.categoriesListContent}
          />
        </View>
        )}

        {/* ÉTAPE 4: Grille principale des chaînes */}
        <Animated.View style={[styles.channelsGrid, !sidebarVisible && styles.channelsGridFullWidth, { opacity: fadeAnim }]}>
          {/* Bouton pour rouvrir sidebar avec dégradé */}
          {!sidebarVisible && (
            <TouchableOpacity 
              onPress={() => setSidebarVisible(true)}
              activeOpacity={0.8}
              style={styles.openSidebarButton}
            >
              <View style={styles.openSidebarButtonGradient}>
                <Icon name="menu" size={24} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          )}
          <FlatList
            data={displayedChannels}
            keyExtractor={keyExtractor}
            renderItem={renderChannelItem}
            numColumns={getOptimalColumns()}
            key={sidebarVisible ? 'with-sidebar' : 'full-screen'} // Force re-render when columns change
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.channelsGridContent}
            columnWrapperStyle={undefined}
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
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
    marginHorizontal: 16,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
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
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sidebarCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    minWidth: 36,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  openSidebarButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
    borderRadius: 16,
    // Ombres identiques aux cartes
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  openSidebarButtonGradient: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelsGridFullWidth: {
    flex: 1,
    width: '100%',
  },
  searchContainerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: 8,
    minWidth: 140,
    maxWidth: 180,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInputHeader: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
    paddingVertical: 0,
  },
  categoriesList: {
    flex: 1,
  },
  categoriesListContent: {
    paddingBottom: 12,
  },
  categoryItem: {
    marginBottom: 6,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  categoryItemSelected: {
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  categoryItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    minHeight: 36,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    // Ombres identiques aux cartes
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  categoryIcon: {
    marginRight: 12,
    width: 20,
  },
  categoryName: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 16,
  },
  categoryNameSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  categoryBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 28,
    alignItems: 'center',
    overflow: 'hidden',
  },
  categoryBadgeSelected: {
    overflow: 'hidden',
  },
  categoryBadgeGradient: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCount: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '700',
  },
  categoryCountSelected: {
    color: '#FFFFFF',
  },
  selectedIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#4FACFE',
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  channelsGrid: {
    flex: 1,
    padding: 4, // RÉDUIT : de 12px à 4px pour utiliser plus d'espace
    backgroundColor: '#0a0a0a',
  },
  channelsGridContent: {
    paddingBottom: 12,
  },
  channelsRow: {
    justifyContent: 'flex-start',
    marginBottom: 6,
  },
  channelCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    marginBottom: 12,
    margin: 2, // RÉDUIT : de 4px à 2px pour cartes plus larges
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    height: 110,
    position: 'relative',
    // Ombres ultra-modernes avec plusieurs couches
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
    // Effet de profondeur supplémentaire
    transform: [{ translateY: 0 }],
  },
  channelLogoFullscreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
    borderRadius: 12,
    opacity: 0.7,
  },
  channelLogoPlaceholderFullscreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  channelNameOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelCardName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
    textAlign: 'center',
    // OMBRES RENFORCÉES pour meilleure lisibilité - TEST TEMPS RÉEL
    textShadowColor: 'rgba(0, 0, 0, 1.0)', // Ombre noire pure
    textShadowOffset: { width: 3, height: 3 }, // Décalage encore plus marqué
    textShadowRadius: 10, // Rayon d'ombre encore plus large
    // Effet de contour noir pour contraste maximum
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1.0,
    shadowRadius: 12,
    elevation: 16, // Ombre Android renforcée
  },
  channelCardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
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
  categorySearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flex: 1,
    marginRight: 8,
  },
  categorySearchIcon: {
    marginRight: 8,
  },
  categorySearchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
  },
  channelNameFallback: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 4,
    lineHeight: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
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
});

export default ChannelsScreen;