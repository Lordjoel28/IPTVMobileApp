/**
 * 👤 ProfileManagementModal - Gestion des profils (Grille simplifiée)
 * Affichage en grille cohérent avec l'écran "Qui regarde?"
 */

import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  TextInput,
  StatusBar,
  Dimensions,
  ScrollView,
  FlatList,
  SafeAreaView,
  StyleSheet as RNStyleSheet,
} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ProfileService, {
  AVAILABLE_AVATARS,
  MAX_PROFILES,
} from '../services/ProfileService';
import database from '../database';
import {Q} from '@nozbe/watermelondb';
import {Category, Playlist} from '../database/models';
import type {Profile} from '../types';
import {useThemeColors} from '../contexts/ThemeContext';
import {useAlert} from '../contexts/AlertContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const {width} = Dimensions.get('window');

/**
 * 🆕 Composant optimisé pour un item de catégorie (mémorisé)
 */
const CategoryItem = React.memo<{
  category: string;
  isSelected: boolean;
  onToggle: (category: string) => void;
  colors: any;
}>(({category, isSelected, onToggle, colors}) => {
  return (
    <TouchableOpacity
      style={[
        styles.groupItem,
        {backgroundColor: colors.surface.secondary},
      ]}
      onPress={() => onToggle(category)}
      activeOpacity={0.7}>
      <View
        style={[
          styles.groupCheckbox,
          {
            borderColor: colors.ui.border,
            backgroundColor: isSelected ? colors.accent.info : 'transparent',
          },
        ]}>
        {isSelected && <Icon name="done" size={14} color="#ffffff" />}
      </View>
      <Text
        style={[styles.groupName, {color: colors.text.primary}]}
        numberOfLines={1}>
        {category}
      </Text>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // 🆕 Optimisation : ne re-rendre que si nécessaire
  return (
    prevProps.category === nextProps.category &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.colors === nextProps.colors
  );
});

interface ProfileManagementModalProps {
  visible: boolean;
  onClose: () => void;
  onProfilesChanged?: () => void;
  profileToEdit?: Profile | null;
  refreshKey?: number; // Clé pour forcer le rechargement des catégories dynamiques
}

const ProfileManagementModal: React.FC<ProfileManagementModalProps> = ({
  visible,
  onClose,
  onProfilesChanged,
  profileToEdit,
  refreshKey,
}) => {
  const colors = useThemeColors();
  const {showAlert} = useAlert();
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [newProfileName, setNewProfileName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVAILABLE_AVATARS[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [isKids, setIsKids] = useState(false);

  // 📂 Groupes Visibles
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [showGroupsSection, setShowGroupsSection] = useState(false);
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string | null>(null);

  // 🆕 États pour pagination alphabétique
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedAlphaGroup, setSelectedAlphaGroup] = useState<string>('Tous');
  const ITEMS_PER_PAGE = 20;

  // 🆕 États pour optimisation du chargement
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  // 🔧 NOUVEAU: Charger les catégories dynamiques quand le modal s'ouvre ou que refreshKey change
  useEffect(() => {
    if (visible) {
      loadProfiles();
      loadAvailableCategories();
      if (profileToEdit) {
        handleEditProfile(profileToEdit);
      }
    }
  }, [visible, profileToEdit, refreshKey]);

  // 🔧 DÉSACTIVÉ TEMPORAIREMENT - Éviter la boucle infinie de rechargement
  // useEffect(() => {
  //   let intervalId: NodeJS.Timeout;

  //   if (visible) {
  //     // Vérifier immédiatement
  //     checkPlaylistChange();

  //     // Puis vérifier toutes les 2 secondes
  //     intervalId = setInterval(() => {
  //       checkPlaylistChange();
  //     }, 2000);
  //   }

  //   return () => {
  //     if (intervalId) {
  //       clearInterval(intervalId);
  //     }
  //   };
  // }, [visible]);

  // Fonction pour détecter les changements de playlist
  const checkPlaylistChange = useCallback(async () => {
    try {
      // Vérifier depuis WatermelonDB
      const playlists = await database
        .get<Playlist>('playlists')
        .query(Q.where('is_active', true))
        .fetch();

      if (playlists.length > 0) {
        const activePlaylistId = playlists[0].id;

        // Si la playlist a changé, recharger les catégories
        if (activePlaylistId !== currentPlaylistId) {
          setCurrentPlaylistId(activePlaylistId);
          await loadAvailableCategories();
        }
      }
    } catch (error) {
      // Erreur silencieuse pour éviter la pollution des logs
    }
  }, [currentPlaylistId]);

  const loadProfiles = async () => {
    try {
      const allProfiles = await ProfileService.getAllProfiles();
      setProfiles(allProfiles);
    } catch (error) {
      console.error('❌ Erreur chargement profils:', error);
    }
  };

  /**
   * 🆕 Charger les catégories depuis la playlist active (optimisé avec cache)
   */
  const loadAvailableCategories = async () => {
    try {
      console.log('🚀 [DEBUG] Début chargement catégories...');
      setIsLoadingCategories(true);
      setCategoriesError(null);

      let activePlaylist = null;

      // Récupérer la playlist active depuis WatermelonDB
      const playlists = await database
        .get<Playlist>('playlists')
        .query(Q.where('is_active', true))
        .fetch();

      console.log('🚀 [DEBUG] Playlists trouvées:', playlists.length);

      if (playlists.length > 0) {
        activePlaylist = playlists[0];
        console.log('🚀 [DEBUG] Playlist active trouvée:', activePlaylist.id);
      } else {
        // Fallback - utiliser la dernière playlist sélectionnée depuis AsyncStorage
        const lastSelectedId = await AsyncStorage.getItem('last_selected_playlist_id');
        console.log('🚀 [DEBUG] Last selected ID:', lastSelectedId);

        if (lastSelectedId) {
          try {
            activePlaylist = await database
              .get<Playlist>('playlists')
              .find(lastSelectedId);

            if (activePlaylist) {
              console.log('🚀 [DEBUG] Playlist trouvée via fallback:', activePlaylist.id);
              // Marquer cette playlist comme active pour éviter le problème à l'avenir
              await database.write(async () => {
                await activePlaylist.update(p => {
                  p.isActive = true;
                });
              });
            }
          } catch (dbError) {
            console.error('🚀 [DEBUG] Erreur fallback playlist:', dbError);
          }
        }
      }

      if (!activePlaylist) {
        console.log('🚀 [DEBUG] Aucune playlist active trouvée');
        setAvailableCategories([]);
        setIsLoadingCategories(false);
        return;
      }

      // 🚀 Vérifier le cache AsyncStorage avec la bonne clé
      const cacheKey = `categories_cache_${activePlaylist.id}`;
      console.log('🚀 [DEBUG] Clé cache:', cacheKey);

      const cachedCategories = await AsyncStorage.getItem(cacheKey);
      console.log('🚀 [DEBUG] Cache trouvé:', !!cachedCategories);

      if (cachedCategories) {
        try {
          const {categories: cached, timestamp} = JSON.parse(cachedCategories);
          const cacheAge = Date.now() - timestamp;
          console.log('🚀 [DEBUG] Cache age:', cacheAge, 'taille:', cached?.length);

          // Utiliser le cache si < 5 minutes
          if (cacheAge < 300000 && cached && cached.length > 0) {
            console.log('🚀 [DEBUG] Utilisation du cache');
            setAvailableCategories(cached);
            setIsLoadingCategories(false);
            return;
          }
        } catch (parseError) {
          console.error('🚀 [DEBUG] Erreur parsing cache:', parseError);
        }
      }

      // Mettre à jour le currentPlaylistId pour éviter les rechargements inutiles
      setCurrentPlaylistId(activePlaylist.id);

      console.log('🚀 [DEBUG] Chargement depuis la base de données...');

      try {
        // 🚀 Charger les catégories avec timeout et optimisation
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 15000); // 15s max
        });

        const categoriesPromise = database
          .get<Category>('categories')
          .query(Q.where('playlist_id', activePlaylist.id))
          .fetch();

        const categories = await Promise.race([categoriesPromise, timeoutPromise]) as Category[];
        console.log('🚀 [DEBUG] Catégories chargées:', categories.length);

        // 🚀 Traitement par lots pour éviter le gel
        const categoryNames = [];
        const batchSize = 200;

        for (let i = 0; i < categories.length; i += batchSize) {
          const batch = categories.slice(i, i + batchSize);
          const batchNames = batch
            .map(cat => cat.name)
            .filter(name => name && name.trim() !== '' && name !== 'Favoris' && name !== 'Récents');

          categoryNames.push(...batchNames);

          // Petite pause pour permettre au UI de respirer
          if (i % 400 === 0 && i > 0) {
            await new Promise(resolve => setTimeout(resolve, 5));
          }
        }

        // Éliminer les doublons et trier
        const uniqueCategories = [...new Set(categoryNames)]
          .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));

        console.log('🚀 [DEBUG] Catégories uniques:', uniqueCategories.length);

        // 🚀 Mettre en cache le résultat
        await AsyncStorage.setItem(cacheKey, JSON.stringify({
          categories: uniqueCategories,
          timestamp: Date.now()
        }));

        setAvailableCategories(uniqueCategories);
        console.log('🚀 [DEBUG] Chargement terminé avec succès');
      } catch (dbError) {
        console.error('🚀 [DEBUG] Erreur base de données:', dbError);
        throw dbError;
      }
    } catch (error) {
      console.error('❌ Erreur chargement catégories:', error);
      setCategoriesError(`Erreur: ${error.message || 'Impossible de charger les catégories'}`);
      setAvailableCategories([]);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) {
      showAlert('Erreur', 'Veuillez entrer un nom de profil');
      return;
    }

    try {
      const blockedCategories = isKids ? ['Adulte', 'XXX', '+18', 'Adult'] : [];
      const visibleGroups = selectedGroups.length > 0 ? selectedGroups : [];

      await ProfileService.createProfile(
        newProfileName.trim(),
        selectedAvatar,
        undefined,
        isKids,
        blockedCategories,
        visibleGroups,
      );

      setNewProfileName('');
      setSelectedAvatar(AVAILABLE_AVATARS[0]);
      setIsKids(false);
      setSelectedGroups([]);
      setShowGroupsSection(false);
      setIsCreating(false);
      await loadProfiles();
      if (onProfilesChanged) {
        onProfilesChanged();
      }
      showAlert('Succès', 'Profil créé avec succès');
    } catch (error) {
      console.error('❌ Erreur création profil:', error);
      showAlert('Erreur', 'Impossible de créer le profil');
    }
  };

  const handleUpdateProfile = async () => {
    if (!editingProfile) {
      return;
    }

    if (!newProfileName.trim()) {
      showAlert('Erreur', 'Veuillez entrer un nom de profil');
      return;
    }

    try {
      const blockedCategories = isKids ? ['Adulte', 'XXX', '+18', 'Adult'] : [];
      const visibleGroups = selectedGroups.length > 0 ? selectedGroups : [];

      await ProfileService.updateProfile(editingProfile.id, {
        name: newProfileName.trim(),
        avatar: selectedAvatar,
        isKids: isKids,
        blockedCategories: blockedCategories,
        visibleGroups: visibleGroups,
      });

      setEditingProfile(null);
      setNewProfileName('');
      setSelectedAvatar(AVAILABLE_AVATARS[0]);
      setIsKids(false);
      setSelectedGroups([]);
      setShowGroupsSection(false);
      await loadProfiles();
      if (onProfilesChanged) {
        onProfilesChanged();
      }
      showAlert('Succès', 'Profil mis à jour');
    } catch (error) {
      console.error('❌ Erreur mise à jour profil:', error);
      showAlert('Erreur', 'Impossible de mettre à jour le profil');
    }
  };

  const handleDeleteProfile = (profile: Profile) => {
    showAlert(
      'Supprimer le profil',
      `Êtes-vous sûr de vouloir supprimer "${profile.name}" ?`,
      [
        {text: 'Annuler', style: 'cancel'},
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await ProfileService.deleteProfile(profile.id);
              await loadProfiles();
              if (onProfilesChanged) {
                onProfilesChanged();
              }
              showAlert('Succès', 'Profil supprimé');
            } catch (error: any) {
              console.error('❌ Erreur suppression profil:', error);
              showAlert(
                'Erreur',
                error.message || 'Impossible de supprimer le profil',
              );
            }
          },
        },
      ],
    );
  };

  const handleEditProfile = (profile: Profile) => {
    setEditingProfile(profile);
    setNewProfileName(profile.name);
    setSelectedAvatar(profile.avatar);
    setIsKids(profile.isKids || false);
    setSelectedGroups(profile.visibleGroups || []);
    setShowGroupsSection(
      !!(profile.visibleGroups && profile.visibleGroups.length > 0),
    );
  };

  const handleStartCreate = () => {
    // Vérifier la limite de profils
    if (profiles.length >= MAX_PROFILES) {
      showAlert(
        'Limite atteinte',
        `Vous avez atteint la limite maximale de ${MAX_PROFILES} profils.`,
      );
      return;
    }
    setIsCreating(true);
    setNewProfileName('');
    setSelectedAvatar(AVAILABLE_AVATARS[0]);
  };

  const handleCancelEdit = () => {
    setEditingProfile(null);
    setIsCreating(false);
    setNewProfileName('');
    setSelectedAvatar(AVAILABLE_AVATARS[0]);
    setIsKids(false);
    setSelectedGroups([]);
    setShowGroupsSection(false);
  };

  /**
   * Toggle sélection d'un groupe (optimisé avec useCallback)
   */
  const toggleGroup = useCallback((groupName: string) => {
    setSelectedGroups(prev => {
      if (prev.includes(groupName)) {
        return prev.filter(g => g !== groupName);
      } else {
        return [...prev, groupName];
      }
    });
  }, []);

  /**
   * Sélectionner tous les groupes
   */
  const selectAllGroups = () => {
    setSelectedGroups([...(filteredCategories || [])]);
  };

  /**
   * Désélectionner tous les groupes
   */
  const deselectAllGroups = () => {
    setSelectedGroups([]);
  };

  /**
   * 🆕 Gérer le changement de groupe alphabétique
   */
  const handleAlphaGroupChange = useCallback((group: string) => {
    setSelectedAlphaGroup(group);
    setCurrentPage(0); // Reset à la première page
  }, []);

  /**
   * 🆕 Navigation pagination
   */
  const goToNextPage = useCallback(() => {
    if (paginationInfo?.hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  }, [paginationInfo?.hasNextPage]);

  const goToPrevPage = useCallback(() => {
    if (paginationInfo?.hasPrevPage) {
      setCurrentPage(prev => prev - 1);
    }
  }, [paginationInfo?.hasPrevPage]);

  /**
   * 🆕 Gérer la recherche avec debounce
   */
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    setCurrentPage(0); // Reset à la première page lors de la recherche
  }, []);

  /**
   * 🆕 Groupes alphabétiques disponibles
   */
  const alphaGroups = useMemo(() => {
    const groups = ['Tous'];
    const ranges = [
      { start: 'A', end: 'C', label: 'A-C' },
      { start: 'D', end: 'F', label: 'D-F' },
      { start: 'G', end: 'I', label: 'G-I' },
      { start: 'J', end: 'L', label: 'J-L' },
      { start: 'M', end: 'O', label: 'M-O' },
      { start: 'P', end: 'R', label: 'P-R' },
      { start: 'S', end: 'U', label: 'S-U' },
      { start: 'V', end: 'Z', label: 'V-Z' },
    ];

    return [...groups, ...ranges.map(r => r.label)];
  }, []);

  /**
   * 🆕 Logique de filtrage alphabétique
   */
  const getCategoriesInAlphaGroup = useCallback((categories: string[], group: string) => {
    if (group === 'Tous') return categories;

    const ranges: {[key: string]: {start: string, end: string}} = {
      'A-C': { start: 'A', end: 'C' },
      'D-F': { start: 'D', end: 'F' },
      'G-I': { start: 'G', end: 'I' },
      'J-L': { start: 'J', end: 'L' },
      'M-O': { start: 'M', end: 'O' },
      'P-R': { start: 'P', end: 'R' },
      'S-U': { start: 'S', end: 'U' },
      'V-Z': { start: 'V', end: 'Z' },
    };

    if (ranges[group]) {
      const { start, end } = ranges[group];
      return categories.filter(cat => {
        const firstLetter = cat.charAt(0).toUpperCase();
        return firstLetter >= start && firstLetter <= end;
      });
    }

    return categories;
  }, []);

  /**
   * 🆕 Catégories filtrées (recherche + groupe alphabétique)
   */
  const filteredCategories = useMemo(() => {
    let filtered = availableCategories;

    // Filtrage alphabétique
    filtered = getCategoriesInAlphaGroup(filtered, selectedAlphaGroup);

    // Filtrage par recherche
    if (searchQuery.trim()) {
      filtered = filtered.filter(cat =>
        cat.toLowerCase().includes(searchQuery.toLowerCase().trim())
      );
    }

    return filtered;
  }, [availableCategories, selectedAlphaGroup, searchQuery, getCategoriesInAlphaGroup]);

  /**
   * 🆕 Pagination des catégories
   */
  const paginatedCategories = useMemo(() => {
    const startIndex = currentPage * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredCategories.slice(startIndex, endIndex);
  }, [filteredCategories, currentPage]);

  /**
   * 🆕 Informations de pagination
   */
  const paginationInfo = useMemo(() => {
    const totalPages = Math.ceil(filteredCategories.length / ITEMS_PER_PAGE);
    const startItem = currentPage * ITEMS_PER_PAGE + 1;
    const endItem = Math.min((currentPage + 1) * ITEMS_PER_PAGE, filteredCategories.length);

    return {
      totalPages: totalPages || 1,
      currentPage: currentPage + 1,
      startItem: filteredCategories.length > 0 ? startItem : 0,
      endItem,
      totalItems: filteredCategories.length,
      hasNextPage: currentPage < totalPages - 1,
      hasPrevPage: currentPage > 0,
    };
  }, [filteredCategories.length, currentPage]);

  /**
   * 🆕 Préparer les données des catégories paginées avec useMemo
   */
  const categoryData = useMemo(() => {
    return paginatedCategories.map(category => ({
      id: category,
      name: category,
      isSelected: selectedGroups.includes(category),
    }));
  }, [paginatedCategories, selectedGroups]);

  /**
   * Fonction de rendu optimisée pour FlatList
   */
  const renderCategoryItem = useCallback(
    ({item}: {item: {id: string; name: string; isSelected: boolean}}) => {
      return (
        <CategoryItem
          category={item.name}
          isSelected={item.isSelected}
          onToggle={toggleGroup}
          colors={colors}
        />
      );
    },
    [toggleGroup, colors],
  );

  /**
   * KeyExtractor pour FlatList
   */
  const keyExtractor = useCallback((item: {id: string}) => item.id, []);

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <LinearGradient
        colors={colors.background.gradient}
        style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft} />
          <Text style={[styles.headerTitle, {color: colors.text.primary}]}>
            Gérer les profils
          </Text>
          <Pressable
            onPress={onClose}
            style={({pressed}) => [
              styles.closeButton,
              {backgroundColor: colors.surface.secondary},
              pressed && {opacity: 0.7},
            ]}>
            <Icon name="close" size={26} color={colors.text.primary} />
          </Pressable>
        </View>

        <View style={styles.content}>
          {/* Grille de profils */}
          {!editingProfile && !isCreating && (
            <View style={styles.gridContainer}>
              <View style={styles.profilesGrid}>
                {profiles.map(profile => (
                  <View key={profile.id} style={styles.gridItem}>
                    <View style={styles.avatarContainer}>
                      <View
                        style={[
                          styles.profileCircle,
                          {
                            backgroundColor: colors.surface.primary,
                            borderColor: profile.isDefault
                              ? colors.accent.success
                              : colors.ui.border,
                            borderWidth: profile.isDefault ? 3 : 2,
                          },
                        ]}>
                        <Text style={styles.profileEmoji}>
                          {profile.avatar}
                        </Text>
                        {profile.isDefault && (
                          <View
                            style={[
                              styles.activeIndicator,
                              {backgroundColor: colors.accent.success},
                            ]}>
                            <Icon name="check" size={12} color="#ffffff" />
                          </View>
                        )}
                      </View>

                      {/* Bouton Éditer - en haut à droite */}
                      <TouchableOpacity
                        style={[
                          styles.editButton,
                          {backgroundColor: 'rgba(150, 150, 150, 0.6)'},
                        ]}
                        onPress={() => handleEditProfile(profile)}>
                        <Icon
                          name="edit"
                          size={14}
                          color={colors.accent.info}
                        />
                      </TouchableOpacity>

                      {/* Bouton Supprimer - en bas à droite */}
                      {profiles.length > 1 && (
                        <TouchableOpacity
                          style={[
                            styles.deleteButton,
                            {backgroundColor: 'rgba(255, 80, 80, 0.4)'},
                          ]}
                          onPress={() => handleDeleteProfile(profile)}>
                          <Icon
                            name="delete"
                            size={14}
                            color={colors.accent.error}
                          />
                        </TouchableOpacity>
                      )}
                    </View>

                    <Text
                      style={[styles.profileName, {color: colors.text.primary}]}
                      numberOfLines={1}>
                      {profile.name}
                    </Text>
                  </View>
                ))}

                {/* Bouton Ajouter */}
                <Pressable
                  style={({pressed}) => [
                    styles.gridItem,
                    pressed && {transform: [{scale: 0.92}]},
                  ]}
                  onPress={handleStartCreate}>
                  <View
                    style={[
                      styles.addCircle,
                      {
                        backgroundColor: colors.surface.secondary,
                        borderColor: colors.accent.success,
                      },
                    ]}>
                    <Icon name="add" size={32} color={colors.accent.success} />
                  </View>
                  <Text
                    style={[styles.addText, {color: colors.accent.success}]}>
                    Ajouter
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Formulaire création/édition */}
          {(editingProfile || isCreating) && (
            <View style={styles.formScrollContainer}>
              <ScrollView
                contentContainerStyle={styles.formScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                style={{flex: 1}}>

                {/* Section fixe (header, avatar, nom) */}
                <View
                  style={[
                    styles.formSection,
                    {
                      backgroundColor: colors.surface.primary,
                      borderColor: colors.ui.border,
                    },
                  ]}>
                  <View style={styles.formHeader}>
                    <Icon
                      name={editingProfile ? 'edit' : 'person-add-alt'}
                      size={24}
                      color={
                        editingProfile
                          ? colors.accent.info
                          : colors.accent.success
                      }
                    />
                    <Text
                      style={[styles.formTitle, {color: colors.text.primary}]}>
                      {editingProfile ? 'Modifier le profil' : 'Nouveau profil'}
                    </Text>
                  </View>

                  {/* Grille avatars compacte */}
                  <Text style={[styles.label, {color: colors.text.secondary}]}>
                    Choisir un avatar
                  </Text>
                  <View
                    style={[
                      styles.avatarGrid,
                      {backgroundColor: colors.surface.elevated},
                    ]}>
                    {AVAILABLE_AVATARS.map(avatar => (
                      <TouchableOpacity
                        key={avatar}
                        style={[
                          styles.avatarOption,
                          {backgroundColor: colors.surface.secondary},
                          selectedAvatar === avatar && {
                            borderColor: colors.accent.success,
                            backgroundColor: colors.surface.elevated,
                          },
                        ]}
                        onPress={() => setSelectedAvatar(avatar)}>
                        <Text style={styles.avatarEmoji}>{avatar}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={[styles.label, {color: colors.text.secondary}]}>
                    Nom du profil
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surface.secondary,
                        borderColor: colors.ui.border,
                        color: colors.text.primary,
                      },
                    ]}
                    placeholder="Entrez un nom"
                    placeholderTextColor={colors.text.placeholder}
                    value={newProfileName}
                    onChangeText={setNewProfileName}
                    maxLength={20}
                  />

                  {/* Option profil enfant */}
                  <TouchableOpacity
                    style={styles.kidsOption}
                    onPress={() => setIsKids(!isKids)}
                    activeOpacity={0.7}>
                    <View
                      style={[
                        styles.checkbox,
                        {
                          borderColor: colors.ui.border,
                          backgroundColor: isKids
                            ? colors.accent.warning
                            : 'transparent',
                        },
                      ]}>
                      {isKids && (
                        <Icon name="child-friendly" size={16} color="#ffffff" />
                      )}
                    </View>
                    <Text style={[styles.kidsText, {color: colors.text.primary}]}>
                      👶 Profil enfant (filtre le contenu sensible)
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* 📂 Groupes Visibles - Section séparée */}
                <View
                  style={[
                    styles.formSection,
                    {
                      backgroundColor: colors.surface.primary,
                      borderColor: colors.ui.border,
                      marginTop: 16,
                    },
                  ]}>
                  <TouchableOpacity
                    style={styles.groupsHeader}
                    onPress={() => setShowGroupsSection(!showGroupsSection)}
                    activeOpacity={0.7}>
                    <View style={styles.groupsHeaderLeft}>
                      <Icon
                        name="category"
                        size={20}
                        color={colors.accent.info}
                      />
                      <Text
                        style={[
                          styles.groupsHeaderText,
                          {color: colors.text.primary},
                        ]}>
                        Groupes visibles{' '}
                        {selectedGroups.length > 0 &&
                          `(${selectedGroups.length})`}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.refreshButton,
                          {backgroundColor: colors.surface.secondary},
                        ]}
                        onPress={loadAvailableCategories}
                        onLongPress={() => {
                          // 🆕 Forcer le vidage du cache avec appui long
                          AsyncStorage.removeItem(`categories_cache_${currentPlaylistId}`);
                          loadAvailableCategories();
                        }}
                        activeOpacity={0.7}>
                        <Icon
                          name="sync"
                          size={16}
                          color={colors.accent.info}
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      {selectedGroups.length > 0 && (
                        <View
                          style={[
                            styles.groupsBadge,
                            {
                              backgroundColor: colors.accent.info,
                              marginRight: 8,
                            },
                          ]}>
                          <Text style={styles.groupsBadgeText}>
                            {selectedGroups.length}
                          </Text>
                        </View>
                      )}
                      <Icon
                        name={
                          showGroupsSection
                            ? 'keyboard-arrow-up'
                            : 'keyboard-arrow-down'
                        }
                        size={24}
                        color={colors.text.primary}
                      />
                    </View>
                  </TouchableOpacity>

                  {showGroupsSection && (
                    <View
                      style={[
                        styles.groupsContent,
                        {backgroundColor: colors.surface.elevated},
                      ]}>
                      {isLoadingCategories ? (
                        <View style={styles.loadingContainer}>
                          <Icon name="hourglass-empty" size={24} color={colors.text.tertiary} />
                          <Text style={[styles.loadingText, {color: colors.text.secondary}]}>
                            Chargement des catégories...
                          </Text>
                        </View>
                      ) : categoriesError ? (
                        <View style={styles.errorContainer}>
                          <Icon name="error-outline" size={24} color={colors.accent.error} />
                          <Text style={[styles.errorText, {color: colors.accent.error}]}>
                            {categoriesError}
                          </Text>
                          <TouchableOpacity
                            style={[styles.retryButton, {backgroundColor: colors.accent.info}]}
                            onPress={loadAvailableCategories}>
                            <Icon name="refresh" size={16} color="#ffffff" />
                            <Text style={styles.retryText}>Réessayer</Text>
                          </TouchableOpacity>
                        </View>
                      ) : availableCategories.length === 0 ? (
                        <Text
                          style={[
                            styles.groupsHint,
                            {color: colors.text.secondary, textAlign: 'center'},
                          ]}>
                          ℹ️ Aucune playlist active. Importez une playlist pour
                          configurer les groupes visibles.
                        </Text>
                      ) : (
                        <>
                          <Text
                            style={[
                              styles.groupsHint,
                              {color: colors.text.secondary},
                            ]}>
                            Sélectionnez les catégories visibles pour ce profil.
                            Si aucune n'est sélectionnée, toutes seront
                            visibles.
                          </Text>

                          {/* 🆕 Barre de recherche compacte */}
                          <View style={styles.searchContainer}>
                            <Icon name="search" size={16} color={colors.text.tertiary} />
                            <TextInput
                              style={[
                                styles.searchInput,
                                {
                                  backgroundColor: colors.surface.secondary,
                                  color: colors.text.primary,
                                  borderColor: colors.ui.border,
                                },
                              ]}
                              placeholder="Rechercher..."
                              placeholderTextColor={colors.text.placeholder}
                              value={searchQuery}
                              onChangeText={handleSearchChange}
                            />
                            {searchQuery.trim() && (
                              <TouchableOpacity
                                style={styles.clearSearchButton}
                                onPress={() => setSearchQuery('')}>
                                <Icon name="close" size={16} color={colors.text.tertiary} />
                              </TouchableOpacity>
                            )}
                          </View>

                          {/* 🆕 Navigation alphabétique compacte */}
                          <View style={styles.alphaNavContainer}>
                            <ScrollView
                              horizontal
                              showsHorizontalScrollIndicator={false}
                              contentContainerStyle={styles.alphaNavScroll}>
                              {alphaGroups.map(group => (
                                <TouchableOpacity
                                  key={group}
                                  style={[
                                    styles.alphaNavButtonCompact,
                                    {
                                      backgroundColor: selectedAlphaGroup === group
                                        ? colors.accent.info
                                        : colors.surface.secondary,
                                      borderColor: colors.ui.border,
                                    },
                                  ]}
                                  onPress={() => handleAlphaGroupChange(group)}>
                                  <Text
                                    style={[
                                      styles.alphaNavTextCompact,
                                      {
                                        color: selectedAlphaGroup === group
                                          ? '#ffffff'
                                          : colors.text.primary,
                                      },
                                    ]}>
                                    {group}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          </View>

                          {/* 🆕 Informations de pagination compacte */}
                          <View style={styles.paginationInfo}>
                            <Text style={[styles.paginationText, {color: colors.text.tertiary}]}>
                              {searchQuery.trim()
                                ? `${paginationInfo?.totalItems || 0} résultat${(paginationInfo?.totalItems || 0) > 1 ? 's' : ''}`
                                : `${paginationInfo?.startItem || 0}-${paginationInfo?.endItem || 0} sur ${paginationInfo?.totalItems || 0}`
                              }
                            </Text>
                          </View>

                          {/* Boutons Tout/Rien compacts */}
                          <View style={styles.groupsActionsCompact}>
                            <TouchableOpacity
                              style={[
                                styles.groupsActionButtonCompact,
                                {
                                  backgroundColor: colors.surface.secondary,
                                  borderColor: colors.ui.border,
                                },
                              ]}
                              onPress={selectAllGroups}>
                              <Icon
                                name="select-all"
                                size={14}
                                color={colors.accent.success}
                              />
                              <Text
                                style={[
                                  styles.groupsActionTextCompact,
                                  {color: colors.text.primary},
                                ]}>
                                Tout
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[
                                styles.groupsActionButtonCompact,
                                {
                                  backgroundColor: colors.surface.secondary,
                                  borderColor: colors.ui.border,
                                },
                              ]}
                              onPress={deselectAllGroups}>
                              <Icon
                                name="deselect"
                                size={14}
                                color={colors.accent.error}
                              />
                              <Text
                                style={[
                                  styles.groupsActionTextCompact,
                                  {color: colors.text.primary},
                                ]}>
                                Aucun
                              </Text>
                            </TouchableOpacity>
                          </View>

                          {/* 🆕 Grille simple sans virtualisation pour éviter le conflit */}
                          <View style={styles.categoryGrid}>
                            {categoryData.map((item) => (
                              <CategoryItem
                                key={item.id}
                                category={item.name}
                                isSelected={item.isSelected}
                                onToggle={toggleGroup}
                                colors={colors}
                              />
                            ))}
                          </View>

                          {/* 🆕 Contrôles de pagination compacts */}
                          {paginationInfo && paginationInfo.totalPages > 1 && (
                            <View style={styles.paginationControlsCompact}>
                              <TouchableOpacity
                                style={[
                                  styles.paginationButtonCompact,
                                  {
                                    backgroundColor: paginationInfo.hasPrevPage
                                      ? colors.accent.info
                                      : colors.surface.secondary,
                                    opacity: paginationInfo.hasPrevPage ? 1 : 0.5,
                                  },
                                ]}
                                onPress={goToPrevPage}
                                disabled={!paginationInfo.hasPrevPage}>
                                <Icon
                                  name="chevron-left"
                                  size={18}
                                  color={paginationInfo.hasPrevPage ? '#ffffff' : colors.text.tertiary}
                                />
                              </TouchableOpacity>

                              <Text style={[styles.paginationCenter, {color: colors.text.secondary}]}>
                                {paginationInfo.currentPage}/{paginationInfo.totalPages}
                              </Text>

                              <TouchableOpacity
                                style={[
                                  styles.paginationButtonCompact,
                                  {
                                    backgroundColor: paginationInfo.hasNextPage
                                      ? colors.accent.info
                                      : colors.surface.secondary,
                                    opacity: paginationInfo.hasNextPage ? 1 : 0.5,
                                  },
                                ]}
                                onPress={goToNextPage}
                                disabled={!paginationInfo.hasNextPage}>
                                <Icon
                                  name="chevron-right"
                                  size={18}
                                  color={paginationInfo.hasNextPage ? '#ffffff' : colors.text.tertiary}
                                />
                              </TouchableOpacity>
                            </View>
                          )}
                        </>
                      )}
                    </View>
                  )}
                </View>

                {/* Boutons fixes en bas */}
                <View style={[styles.formButtons, {marginTop: 16}]}>
                  <TouchableOpacity
                    style={[
                      styles.cancelButton,
                      {
                        backgroundColor: colors.surface.secondary,
                        borderColor: colors.ui.border,
                      },
                    ]}
                    onPress={handleCancelEdit}>
                    <Text
                      style={[
                        styles.cancelText,
                        {color: colors.text.secondary},
                      ]}>
                      Annuler
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      {
                        backgroundColor: editingProfile
                          ? colors.accent.info
                          : colors.accent.success,
                      },
                    ]}
                    onPress={
                      editingProfile ? handleUpdateProfile : handleCreateProfile
                    }>
                    <Icon
                      name={editingProfile ? 'check' : 'add'}
                      size={20}
                      color="#ffffff"
                    />
                    <Text style={styles.saveText}>
                      {editingProfile ? 'Enregistrer' : 'Créer'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: (StatusBar.currentHeight || 0) + 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.1)',
  },
  headerLeft: {
    width: 42,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },

  // Grille de profils
  gridContainer: {
    alignItems: 'center',
  },
  profilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
  },
  gridItem: {
    alignItems: 'center',
    width: (width - 120) / 3,
    maxWidth: 100,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  profileCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    position: 'relative',
  },
  profileEmoji: {
    fontSize: 42,
  },
  activeIndicator: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Boutons d'action autour de l'avatar
  editButton: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  deleteButton: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },

  // Bouton ajouter
  addCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  addText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Formulaire création/édition
  formSection: {
    marginTop: 8,
    marginHorizontal: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 2,
  },

  // ScrollView du formulaire
  formScrollContainer: {
    flex: 1,
  },
  formScrollContent: {
    paddingBottom: 20,
  },

  // Grille avatars
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  avatarOption: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  avatarEmoji: {
    fontSize: 30,
  },

  // Input et boutons
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
    marginBottom: 10,
  },
  kidsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kidsText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  // 📂 Groupes Visibles
  groupsSection: {
    marginTop: 4,
    marginBottom: 12,
  },
  groupsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  groupsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  groupsHeaderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  refreshButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  groupsBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  groupsContent: {
    marginTop: 8,
    borderRadius: 12,
    padding: 12,
  },
  groupsHint: {
    fontSize: 13,
    marginBottom: 10,
    lineHeight: 17,
  },
  groupsActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  groupsActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  groupsActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // 🆕 Styles pour les boutons d'action compacts
  groupsActionsCompact: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  groupsActionButtonCompact: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  groupsActionTextCompact: {
    fontSize: 13,
    fontWeight: '600',
  },
  groupsList: {
    maxHeight: 300,
  },
  groupsListContent: {
    paddingBottom: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  // 🆕 Styles pour la recherche optimisés
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
  },
  clearSearchButton: {
    padding: 4,
    borderRadius: 12,
  },
  // 🆕 Navigation alphabétique compacte
  alphaNavContainer: {
    marginBottom: 8,
  },
  alphaNavScroll: {
    gap: 6,
    paddingHorizontal: 2,
  },
  alphaNavButtonCompact: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 40,
    alignItems: 'center',
  },
  alphaNavTextCompact: {
    fontSize: 12,
    fontWeight: '600',
  },
  // 🆕 Informations de pagination compactes
  paginationInfo: {
    alignItems: 'center',
    marginBottom: 6,
  },
  paginationText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // 🆕 Contrôles de pagination compacts
  paginationControlsCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  paginationButtonCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 36,
    justifyContent: 'center',
  },
  paginationCenter: {
    fontSize: 12,
    fontWeight: '600',
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 10,
    width: '48%',
    marginBottom: 4,
  },
  groupCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  // 🆕 Styles pour le chargement et les erreurs
  loadingContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  // Styles pour l'effet flou parfait
  modalBlurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1500,
  },
  modalFlouContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 24,
    padding: 16,
    width: '90%',
    maxWidth: 450,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 20},
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 30,
    transform: [{translateY: -2}],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
});

export default ProfileManagementModal;
