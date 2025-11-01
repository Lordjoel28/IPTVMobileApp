import { useState, useCallback, useRef, useEffect } from 'react';
import { InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LZString from 'lz-string';
import { Q } from '@nozbe/watermelondb';
import database from '../database';
import type { Channel, Category } from '../types';
import CategoriesService from '../services/CategoriesService';
import ProfileService from '../services/ProfileService';
import RecentChannelsService from '../services/RecentChannelsService';
import FavoritesService from '../services/FavoritesService';
import WatermelonM3UService from '../services/WatermelonM3UService';

/**
 * Hook pour gérer le sélecteur de chaînes avec:
 * - Cache AsyncStorage (persistant) avec compression LZ
 * - Cache mémoire (5 minutes)
 * - Chargement lazy des catégories
 * - Pagination intelligente (200 chaînes/page)
 * - Auto-scroll vers la chaîne active
 * - Support favoris/récents
 *
 * Extrait de GlobalVideoPlayer.tsx (~900 lignes → hook réutilisable)
 */

interface SelectorCache {
  categories: Category[] | null;
  channelsMap: Map<string, Channel[]>;
  allChannels: Channel[];
  lastLoaded: number;
  playlistId: string | null;
}

interface UseChannelSelectorOptions {
  playlistId: string | null;
  currentChannel: Channel | null;
  channelsPerPage?: number;
}

interface UseChannelSelectorReturn {
  // États
  isVisible: boolean;
  categories: Category[];
  selectedCategory: Category | null;
  channels: Channel[];
  isLoading: boolean;
  hasMoreChannels: boolean;
  currentPage: number;

  // Refs pour FlashList
  channelsListRef: React.MutableRefObject<any>;
  isChannelsListReadyRef: React.MutableRefObject<boolean>;

  // Actions
  open: () => void;
  close: () => void;
  selectCategory: (category: Category) => Promise<void>;
  loadMore: () => Promise<void>;
  scrollToActiveChannel: () => Promise<void>;
  reload: () => Promise<void>;
}

export const useChannelSelector = (
  options: UseChannelSelectorOptions
): UseChannelSelectorReturn => {
  const { playlistId, currentChannel, channelsPerPage = 200 } = options;

  // États
  const [isVisible, setIsVisible] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMoreChannels, setHasMoreChannels] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  // Cache
  const [cache, setCache] = useState<SelectorCache>({
    categories: null,
    channelsMap: new Map(),
    allChannels: [],
    lastLoaded: 0,
    playlistId: null,
  });

  // Refs
  const channelsListRef = useRef<any>(null);
  const isChannelsListReadyRef = useRef(false);
  const isLoadingRef = useRef(false); // Protection contre appels multiples

  /**
   * Charger les chaînes depuis AsyncStorage cache ou DB
   */
  const loadChannels = useCallback(async (forceReload = false) => {
    if (!playlistId) {
      console.log('⚠️ [ChannelSelector] Aucune playlist active');
      return;
    }

    // Protection contre appels multiples
    if (isLoadingRef.current && !forceReload) {
      console.log('⚠️ [ChannelSelector] Chargement déjà en cours');
      return;
    }

    isLoadingRef.current = true;
    const now = Date.now();

    // ✅ CACHE PERSISTANT: AsyncStorage (INSTANTANÉ au 2ème lancement)
    if (!forceReload) {
      try {
        const cacheKey = `channel_selector_cache_${playlistId}`;
        const cachedData = await AsyncStorage.getItem(cacheKey);

        if (cachedData) {
          // Parsing différé pour ne pas bloquer l'UI
          InteractionManager.runAfterInteractions(() => {
            try {
              const decompressed = LZString.decompressFromUTF16(cachedData);
              const parsed = decompressed ? JSON.parse(decompressed) : JSON.parse(cachedData);
              const cacheAge = now - parsed.timestamp;

              // Cache valide 24h
              if (cacheAge < 24 * 60 * 60 * 1000) {
                console.log(`💾 [ChannelSelector] Cache trouvé (${Math.round(cacheAge / 1000 / 60)}min)`);

                // Affichage instantané
                setCategories(parsed.categories);
                setSelectedCategory(parsed.categories[0]);
                setChannels(parsed.firstPageChannels);
                setHasMoreChannels(parsed.totalCount > channelsPerPage);
                setCurrentPage(0);

                // Mettre à jour cache mémoire
                setCache({
                  categories: parsed.categories,
                  channelsMap: new Map(),
                  allChannels: parsed.firstPageChannels,
                  lastLoaded: now,
                  playlistId,
                });

                console.log(`⚡ [ChannelSelector] Affichage instantané: ${parsed.categories.length} catégories`);
              }
            } catch (parseError) {
              console.log('⚠️ [ChannelSelector] Erreur parsing cache:', parseError);
            }
          });

          isLoadingRef.current = false;
          return;
        }
      } catch (error) {
        console.log('⚠️ [ChannelSelector] Erreur lecture cache:', error);
      }
    }

    // Vérifier cache mémoire (5 minutes)
    const cacheValid = cache.categories &&
                      cache.playlistId === playlistId &&
                      (now - cache.lastLoaded) < 300000 &&
                      !forceReload;

    if (cacheValid) {
      console.log('⚡ [ChannelSelector] Utilisation cache mémoire');
      setCategories(cache.categories!);
      setSelectedCategory(cache.categories![0]);

      const firstPageChannels = cache.allChannels.slice(0, channelsPerPage);
      setChannels(firstPageChannels);
      setHasMoreChannels(cache.allChannels.length > channelsPerPage);
      setCurrentPage(0);

      isLoadingRef.current = false;
      return;
    }

    // Charger depuis DB
    setIsLoading(true);
    try {
      console.log('🚀 [ChannelSelector] Chargement depuis DB:', playlistId);

      // Charger catégories avec CategoriesService
      const categoriesResult = await CategoriesService.loadCategories(playlistId);
      if (!categoriesResult || categoriesResult.length === 0) {
        console.error('❌ [ChannelSelector] Aucune catégorie trouvée');
        return;
      }

      const categoriesList: Category[] = [];
      const channelsMap = new Map<string, Channel[]>();
      let allChannels: Channel[] = [];

      // Ajouter "TOUT" en premier
      categoriesList.push({
        id: 'all',
        name: 'TOUT',
        count: 0,
        channels: [],
      });

      // Charger récents et favoris
      const activeProfile = await ProfileService.getActiveProfile().catch(() => null);

      if (activeProfile) {
        try {
          const [recentsData, favoritesData] = await Promise.all([
            RecentChannelsService.getRecentsByProfile(activeProfile.id, playlistId).catch(() => []),
            FavoritesService.getFavoritesByProfile(activeProfile.id).catch(() => [])
          ]);

          // Récents
          if (recentsData && recentsData.length > 0) {
            const formattedRecents: Channel[] = recentsData.map((ch: any) => ({
              id: ch.channelId,
              name: ch.channelName,
              url: ch.url,
              logo: ch.logo,
              group: ch.category,
              category: ch.category,
              tvgId: ch.tvgId,
              isAdult: ch.isAdult,
            }));

            categoriesList.splice(1, 0, {
              id: 'recents',
              name: 'Récents',
              count: formattedRecents.length,
              channels: formattedRecents,
            });
            channelsMap.set('recents', formattedRecents);
            allChannels.push(...formattedRecents);
          }

          // Favoris
          if (favoritesData && favoritesData.length > 0) {
            const formattedFavorites: Channel[] = favoritesData.map((fav: any) => ({
              id: fav.channelId,
              name: fav.channelName,
              url: fav.url,
              logo: fav.logo,
              group: fav.category,
              category: fav.category,
              tvgId: fav.tvgId,
              isAdult: fav.isAdult,
            }));

            categoriesList.splice(1, 0, {
              id: 'favorites',
              name: 'Favoris',
              count: formattedFavorites.length,
              channels: formattedFavorites,
            });
            channelsMap.set('favorites', formattedFavorites);
            allChannels.push(...formattedFavorites);
          }
        } catch (error) {
          console.error('❌ [ChannelSelector] Erreur chargement favoris/récents:', error);
        }
      }

      // Créer catégories (lazy loading - sans chaînes)
      categoriesList.push(...categoriesResult.map((cat) => ({
        id: cat.name,
        name: cat.name,
        count: cat.count || 0,
        channels: [], // Sera chargé à la demande
      })));

      const totalChannelsCount = categoriesResult.reduce((sum: number, cat: any) => sum + (cat.count || 0), 0);
      categoriesList[0].count = totalChannelsCount;

      console.log(`✅ [ChannelSelector] ${categoriesResult.length} catégories créées`);

      // Afficher immédiatement
      setCategories(categoriesList);
      setSelectedCategory(categoriesList[0]);
      setIsLoading(false);

      // Charger chaînes en arrière-plan
      InteractionManager.runAfterInteractions(async () => {
        console.log(`📺 [ChannelSelector] Chargement chaînes...`);
        try {
          const sqlQuery = `
            SELECT id, name, stream_url, logo_url, group_title, tvg_id, is_adult
            FROM channels
            WHERE playlist_id = ?
            ORDER BY name COLLATE NOCASE
          `;

          const rawResults = await database
            .get('channels')
            .query(Q.unsafeSqlQuery(sqlQuery, [playlistId]))
            .unsafeFetchRaw();

          const formattedChannels: Channel[] = rawResults.map((row: any) => ({
            id: row.id,
            name: row.name,
            url: row.stream_url,
            logo: row.logo_url,
            group: row.group_title,
            category: row.group_title,
            tvgId: row.tvg_id,
            isAdult: row.is_adult,
          }));

          allChannels = formattedChannels;
          console.log(`✅ [ChannelSelector] ${formattedChannels.length} chaînes chargées`);

          const uniqueChannels = Array.from(new Map(allChannels.map(ch => [ch.id, ch])).values());
          categoriesList[0].channels = uniqueChannels;

          // Mettre en cache
          setCache({
            categories: categoriesList,
            channelsMap,
            allChannels: uniqueChannels,
            lastLoaded: now,
            playlistId,
          });

          // Première page
          const firstPageChannels = uniqueChannels.slice(0, channelsPerPage);
          setChannels(firstPageChannels);
          setHasMoreChannels(uniqueChannels.length > channelsPerPage);
          setCurrentPage(0);

          console.log(`✅ [ChannelSelector] Terminé: ${categoriesList.length} catégories, ${totalChannelsCount} chaînes`);

          // Sauvegarder dans AsyncStorage
          try {
            const cacheKey = `channel_selector_cache_${playlistId}`;
            const dataToCache = {
              categories: categoriesList,
              firstPageChannels,
              totalCount: totalChannelsCount,
              timestamp: now,
            };

            const jsonString = JSON.stringify(dataToCache);
            const compressed = LZString.compressToUTF16(jsonString);
            const compressionRatio = Math.round((1 - compressed.length / jsonString.length) * 100);

            await AsyncStorage.setItem(cacheKey, compressed);
            console.log(`💾 [ChannelSelector] Cache sauvegardé (compression: ${compressionRatio}%)`);
          } catch (cacheError) {
            console.log('⚠️ [ChannelSelector] Erreur sauvegarde cache:', cacheError);
          }
        } catch (error) {
          console.error('❌ [ChannelSelector] Erreur chargement chaînes:', error);
        }
      });

    } catch (error) {
      console.error('❌ [ChannelSelector] Erreur chargement:', error);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [playlistId, cache, channelsPerPage]);

  /**
   * Charger plus de chaînes (pagination)
   */
  const loadMore = useCallback(async () => {
    if (!hasMoreChannels) {
      console.log('📄 [ChannelSelector] Plus de chaînes à charger');
      return;
    }

    const nextPage = currentPage + 1;
    const startIndex = nextPage * channelsPerPage;
    const endIndex = startIndex + channelsPerPage;

    // Chargement SQL optimisé si nécessaire
    if (selectedCategory?.id === 'all' && startIndex >= (cache.allChannels?.length || 0)) {
      console.log(`📺 [ChannelSelector] Chargement page ${nextPage} (SQL)...`);

      try {
        const sqlQuery = `
          SELECT id, name, stream_url, logo_url, group_title, tvg_id, is_adult
          FROM channels
          WHERE playlist_id = ?
          ORDER BY name COLLATE NOCASE
          LIMIT ? OFFSET ?
        `;

        const rawResults = await database
          .get('channels')
          .query(Q.unsafeSqlQuery(sqlQuery, [playlistId!, channelsPerPage, startIndex]))
          .unsafeFetchRaw();

        const formattedChannels: Channel[] = rawResults.map((row: any) => ({
          id: row.id,
          name: row.name,
          url: row.stream_url,
          logo: row.logo_url,
          group: row.group_title,
          category: row.group_title,
          tvgId: row.tvg_id,
          isAdult: row.is_adult,
        }));

        if (formattedChannels.length === 0) {
          setHasMoreChannels(false);
          return;
        }

        console.log(`✅ [ChannelSelector] +${formattedChannels.length} chaînes chargées`);

        // Ajouter au cache
        setCache(prev => ({
          ...prev,
          allChannels: [...(prev.allChannels || []), ...formattedChannels],
        }));

        setChannels(prev => [...prev, ...formattedChannels]);
        setCurrentPage(nextPage);

        const totalInPlaylist = selectedCategory.count || 0;
        setHasMoreChannels(endIndex < totalInPlaylist);
      } catch (error) {
        console.error('❌ [ChannelSelector] Erreur chargement page:', error);
      }
    } else {
      // Chargement depuis cache
      const newChannels = (selectedCategory?.channels || cache.allChannels || []).slice(startIndex, endIndex);

      if (newChannels.length === 0) {
        setHasMoreChannels(false);
        return;
      }

      console.log(`📄 [ChannelSelector] Page ${nextPage}: +${newChannels.length} chaînes`);

      setChannels(prev => [...prev, ...newChannels]);
      setCurrentPage(nextPage);

      const totalInCategory = selectedCategory?.channels?.length || cache.allChannels?.length || 0;
      setHasMoreChannels(endIndex < totalInCategory);
    }
  }, [currentPage, channels, cache.allChannels, selectedCategory, hasMoreChannels, channelsPerPage, playlistId]);

  /**
   * Auto-scroll vers la chaîne active
   */
  const scrollToActiveChannel = useCallback(async () => {
    if (!currentChannel || !selectedCategory || selectedCategory.id !== 'all') {
      return;
    }

    const channelIndex = channels.findIndex(ch => ch.id === currentChannel.id);
    if (channelIndex === -1) {
      console.log('⚠️ [ChannelSelector] Chaîne active non trouvée');
      return;
    }

    console.log(`🎯 [ChannelSelector] Auto-scroll vers: ${currentChannel.name} (index: ${channelIndex})`);

    // Attendre que FlashList soit prêt
    let waitAttempts = 0;
    while (!isChannelsListReadyRef.current && waitAttempts < 20) {
      await new Promise(resolve => setTimeout(resolve, 100));
      waitAttempts++;
    }

    if (!isChannelsListReadyRef.current || !channelsListRef.current) {
      console.log('⚠️ [ChannelSelector] FlashList pas prêt');
      return;
    }

    try {
      channelsListRef.current.scrollToIndex({
        index: channelIndex,
        animated: true,
        viewPosition: 0.5,
      });
      console.log('✅ [ChannelSelector] Auto-scroll réussi');
    } catch (error) {
      console.log('⚠️ [ChannelSelector] Erreur auto-scroll:', error);
    }
  }, [currentChannel, selectedCategory, channels]);

  /**
   * Sélectionner une catégorie
   */
  const selectCategory = useCallback(async (category: Category) => {
    console.log('🎯 [ChannelSelector] Catégorie sélectionnée:', category.name);

    setSelectedCategory(category);

    // Lazy loading
    if (!category.channels || category.channels.length === 0) {
      if (category.id === 'all') {
        setChannels(cache.allChannels?.slice(0, channelsPerPage) || []);
        setHasMoreChannels((cache.allChannels?.length || 0) > channelsPerPage);
        setCurrentPage(0);
      } else if (category.id === 'favorites' || category.id === 'recents') {
        setChannels(category.channels || []);
      } else {
        // Charger chaînes de la catégorie
        console.log(`📺 [ChannelSelector] Chargement "${category.name}"...`);
        setIsLoading(true);
        try {
          const categoryChannels = await WatermelonM3UService.getChannelsByCategory(
            playlistId!,
            category.name
          );

          const formattedChannels = categoryChannels.map((ch: any) => ({
            id: ch.id,
            name: ch.name,
            url: ch.streamUrl,
            logo: ch.logoUrl,
            group: ch.groupTitle,
            category: ch.groupTitle,
            tvgId: ch.tvgId,
            isAdult: ch.isAdult,
          }));

          category.channels = formattedChannels;
          setChannels(formattedChannels.slice(0, channelsPerPage));
          setHasMoreChannels(formattedChannels.length > channelsPerPage);
          setCurrentPage(0);

          console.log(`✅ [ChannelSelector] ${formattedChannels.length} chaînes chargées`);
        } catch (error) {
          console.error('❌ [ChannelSelector] Erreur chargement catégorie:', error);
        } finally {
          setIsLoading(false);
        }
      }
    } else {
      setChannels(category.channels.slice(0, channelsPerPage));
      setHasMoreChannels(category.channels.length > channelsPerPage);
      setCurrentPage(0);
    }
  }, [cache.allChannels, channelsPerPage, playlistId]);

  /**
   * Ouvrir le sélecteur
   */
  const open = useCallback(() => {
    setIsVisible(true);
  }, []);

  /**
   * Fermer le sélecteur
   */
  const close = useCallback(() => {
    setIsVisible(false);
  }, []);

  /**
   * Recharger (force reload)
   */
  const reload = useCallback(() => {
    return loadChannels(true);
  }, [loadChannels]);

  // Charger quand le sélecteur s'ouvre
  useEffect(() => {
    if (isVisible) {
      loadChannels();
    }
  }, [isVisible, loadChannels]);

  // Auto-scroll quand catégorie "TOUT" sélectionnée
  useEffect(() => {
    if (selectedCategory?.id === 'all' && channels.length > 0 && currentChannel) {
      const timer = setTimeout(() => {
        scrollToActiveChannel();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedCategory, channels, currentChannel, scrollToActiveChannel]);

  return {
    // États
    isVisible,
    categories,
    selectedCategory,
    channels,
    isLoading,
    hasMoreChannels,
    currentPage,

    // Refs
    channelsListRef,
    isChannelsListReadyRef,

    // Actions
    open,
    close,
    selectCategory,
    loadMore,
    scrollToActiveChannel,
    reload,
  };
};
