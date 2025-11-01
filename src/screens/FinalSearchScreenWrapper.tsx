/**
 * 🎨 FinalSearchScreenWrapper - Wrapper final avec design moderne
 * ✅ Optimisé pour recherche SQL sur 26K+ chaînes
 * ✅ Charge les catégories depuis WatermelonDB si navigationData est vide
 */

import React, {useEffect, useState} from 'react';
import FinalSearchScreen from '../components/FinalSearchScreen';
import {useNavigation, useRoute} from '@react-navigation/native';
import {usePlayerStore} from '../stores/PlayerStore';
import RecentChannelsService from '../services/RecentChannelsService';
import ProfileService from '../services/ProfileService';
import database from '../database';
import {Q} from '@nozbe/watermelondb';
import type {Channel, Category} from '../types';

export default function FinalSearchScreenWrapper() {
  const navigation = useNavigation();
  const route = useRoute();
  const playerStore = usePlayerStore();

  const params = route.params as {
    playlistId: string;
    initialCategory?: string;
    categoryName?: string; // Pour affichage
    categoryGroupTitle?: string; // 🔑 Vrai group_title pour filtrage SQL
    playlistName?: string;
    playlistType?: string;
    blockedCategories?: string[]; // 🔒 Catégories bloquées à filtrer dans la recherche
  };

  // Normaliser les catégories pour éviter les problèmes d'espaces
  const normalizedCategoryName = params.categoryName?.trim() || 'GLOBAL';
  const normalizedCategoryGroupTitle = params.categoryGroupTitle?.trim() || 'GLOBAL';

  // 🔄 Clé unique pour forcer le remontage complet du composant à chaque navigation
  const [mountKey, setMountKey] = useState(Date.now());

  // 🔄 Mettre à jour mountKey quand les paramètres de navigation changent
  useEffect(() => {
    setMountKey(Date.now());
  }, [params.playlistId, params.categoryName, params.categoryGroupTitle, params.initialCategory]);

  // Marquer l'ouverture/fermeture de l'écran de recherche pour GlobalVideoPlayer
  useEffect(() => {
    playerStore.actions.setSearchScreenOpen(true);

    return () => {
      playerStore.actions.setSearchScreenOpen(false);
    };
  }, []);

  const handleClose = () => {
    playerStore.actions.setSearchScreenOpen(false);
    navigation.goBack();
  };

  
  
  const handleChannelSelect = async (channel: Channel) => {
    playerStore.actions.setSearchScreenOpen(false);

    // 🚀 OPTIMISATION: Ajouter aux récents en arrière-plan (ne pas bloquer)
    ProfileService.getActiveProfile().then(activeProfile => {
      if (activeProfile) {
        RecentChannelsService.addRecent(channel, params.playlistId, activeProfile.id)
          .catch(err => console.error('❌ [FinalSearch] Erreur ajout récente:', err));
      }
    });

    // 🎯 Vérifier si on vient déjà de ChannelPlayer
    const navigationState = navigation.getState();
    const isFromChannelPlayer = navigationState.routes.some(
      (route: any) => route.name === 'ChannelPlayer' && route.params?.playlistId === params.playlistId
    );

    if (isFromChannelPlayer) {
      // ✅ ChannelPlayer existe déjà → Juste mettre à jour selectedChannel (garder initialCategory intact)
      console.log(`✅ [FinalSearch] Retour au ChannelPlayer existant avec nouvelle chaîne: ${channel.name}`);

      (navigation as any).navigate({
        name: 'ChannelPlayer',
        params: { selectedChannel: channel },
        merge: true, // 🔑 Fusionner params au lieu de remplacer (garde initialCategory)
      });
      return;
    }

    // 🚀 Sinon, navigation normale avec chargement complet de la catégorie
    const channelGroupName = (channel as any).groupTitle || channel.category || channel.group || 'Non classé';

    try {
      // 1. Charger la catégorie sélectionnée avec ses chaînes (SQL direct)
      const selectedCategoryChannels = await database.get('channels')
        .query(
          Q.where('playlist_id', params.playlistId),
          Q.where('group_title', channelGroupName)
        )
        .fetch();

      // 2. Charger depuis la table categories (optimisé)
      const categoriesMap = new Map<string, {displayName: string, count: number}>();

      const categoriesData = await database.get('categories')
        .query(Q.where('playlist_id', params.playlistId))
        .fetch();

      categoriesData.forEach((cat: any) => {
        const displayName = cat.name.trim();
        categoriesMap.set(displayName, {
          displayName: displayName,
          count: cat.channelsCount || 0
        });
      });

      // 3. Créer la catégorie sélectionnée
      const selectedCategory: Category = {
        id: `cat_${channelGroupName.toLowerCase().replace(/\s+/g, '_')}`,
        name: channelGroupName,
        count: selectedCategoryChannels.length,
        channels: selectedCategoryChannels.map((ch: any) => ({
          id: ch.id,
          name: ch.name,
          url: ch.streamUrl || ch.url,
          logo: ch.logoUrl || ch.logo,
          groupTitle: ch.groupTitle,
          group: ch.groupTitle,
          category: ch.groupTitle,
          streamUrl: ch.streamUrl || ch.url,
          tvgId: ch.tvgId,
          streamType: ch.streamType,
          streamId: ch.streamId,
          isAdult: ch.isAdult,
          isFavorite: ch.isFavorite,
          language: ch.language,
          country: ch.country,
          quality: ch.isHD ? 'HD' : 'SD',
          isHighlighted: false,
        })),
      };

      // 4. Créer les autres catégories (sans chaînes)
      const otherCategories: Category[] = [];
      categoriesMap.forEach((catData, categoryName) => {
        if (categoryName !== channelGroupName) {
          otherCategories.push({
            id: `cat_${categoryName.toLowerCase().replace(/\s+/g, '_')}`,
            name: catData.displayName,
            count: catData.count,
            channels: [], // Chargé à la demande
          });
        }
      });

      // 5. Assembler toutes les catégories
      const allCategories: Category[] = [selectedCategory, ...otherCategories];

      // 🚀 Navigation vers nouveau ChannelPlayer
      (navigation as any).navigate('ChannelPlayer', {
        playlistId: params.playlistId,
        allCategories: allCategories,
        initialCategory: selectedCategory,
        initialChannels: selectedCategory.channels,
        selectedChannel: channel,
        playlistName: params.playlistName || 'Playlist',
        playlistType: params.playlistType || 'XTREAM',
      });

    } catch (error) {
      console.error(`❌ [FinalSearch] Erreur chargement catégorie "${channelGroupName}":`, error);

      // Fallback
      const fallbackCategory: Category = {
        id: 'fallback',
        name: channelGroupName,
        count: 1,
        channels: [channel],
      };

      (navigation as any).navigate('ChannelPlayer', {
        playlistId: params.playlistId,
        allCategories: [fallbackCategory],
        initialCategory: fallbackCategory,
        initialChannels: [channel],
        selectedChannel: channel,
        playlistName: params.playlistName || 'Playlist',
        playlistType: params.playlistType || 'XTREAM',
      });
    }
  };

  return (
    <FinalSearchScreen
      key={mountKey} // 🔄 Clé unique à chaque navigation pour réinitialiser complètement la recherche
      playlistId={params.playlistId}
      categoryName={normalizedCategoryName} // Pour affichage (normalisé)
      categoryGroupTitle={normalizedCategoryGroupTitle} // 🔑 Pour filtrage SQL (normalisé)
      blockedCategories={params.blockedCategories || []} // 🔒 Filtrer les catégories bloquées
      onClose={handleClose}
      onChannelSelect={handleChannelSelect}
    />
  );
}