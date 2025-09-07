/**
 * 📺 ChannelPlayerScreen - Interface IPTV Smarters Pro authentique
 * Layout 3 zones: Liste chaînes (gauche) + Mini lecteur (droite haut) + EPG future (droite bas)
 */

import React, {useState, useEffect, useRef} from 'react';
// import { WatermelonXtreamService } from '../services/WatermelonXtreamService'; // TEMPORAIRE: Désactivé (GitHub Issue #3692)
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  Pressable,
  ScrollView,
  Modal,
  Animated,
} from 'react-native';
// Masquage barre navigation via StatusBar
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  List,
  Avatar,
  IconButton,
  Card,
  ProgressBar,
  Text as PaperText,
} from 'react-native-paper';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import VideoPlayer from '../components/VideoPlayer';
import VideoPlayerSimple from '../components/VideoPlayerSimple'; // Nouveau lecteur ultra-simplifié avec gestures
import {useRoute, useNavigation} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import type {RootStackParamList, Channel, Category} from '../types';

const {width, height} = Dimensions.get('window');

interface ChannelPlayerScreenProps {
  route: {
    params: {
      playlistId: string;
      allCategories: Category[];
      initialCategory: Category;
      initialChannels: Channel[];
      selectedChannel: Channel;
      playlistName: string;
    };
  };
}

type NavigationProp = StackNavigationProp<RootStackParamList>;

const ChannelPlayerScreen: React.FC<ChannelPlayerScreenProps> = ({route}) => {
  const navigation = useNavigation<NavigationProp>();
  const {
    playlistId,
    allCategories,
    initialCategory,
    initialChannels,
    selectedChannel: initialChannel,
    playlistName,
  } = route.params;

  // Log pour déboguer la réception des données
  console.log('🎬 DONNÉES REÇUES IPTV Smarters Pro:', {
    playlistId: playlistId,
    categoriesCount: allCategories?.length,
    initialCategoryName: initialCategory?.name,
    initialChannelsCount: initialChannels?.length,
    selectedChannelName: initialChannel?.name,
    playlistName: playlistName,
  });

  // États locaux pour rendre le composant autonome (selon spec Gemini)
  const [categories, setCategories] = useState<Category[]>(allCategories);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(() =>
    allCategories.findIndex(cat => cat.id === initialCategory.id),
  );
  const [channels, setChannels] = useState<Channel[]>(initialChannels);
  const [selectedChannel, setSelectedChannel] =
    useState<Channel>(initialChannel);
  const [showFullscreenPlayer, setShowFullscreenPlayer] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0); // 🚀 Temps vidéo pour transition rapide
  const [shouldKeepCurrentChannel, setShouldKeepCurrentChannel] =
    useState(false); // Flag pour éviter changement auto
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [favoriteChannels, setFavoriteChannels] = useState<string[]>([]); // IDs des chaînes favorites
  
  // Nouveaux états pour les données vidéo réelles
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  // videoCurrentTime déjà déclaré ligne 89
  const [videoMetadata, setVideoMetadata] = useState<any>(null);
  
  // États pour interface TiviMate
  const [showTiviMateControls, setShowTiviMateControls] = useState(true);

  // Animations pour les contrôles TiviMate
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const controlsTimer = useRef<NodeJS.Timeout | null>(null);

  // Charger les favoris au montage
  useEffect(() => {
    loadFavorites();
  }, []);

  // Fonction pour charger les favoris depuis AsyncStorage
  const loadFavorites = async () => {
    try {
      const AsyncStorage = await import(
        '@react-native-async-storage/async-storage'
      );
      const favoritesData = await AsyncStorage.default.getItem(
        `favorites_${playlistId}`,
      );
      if (favoritesData) {
        const favorites = JSON.parse(favoritesData);
        setFavoriteChannels(favorites);
        console.log(`♥️ ${favorites.length} favoris chargés`);
      }
    } catch (error) {
      console.error('❌ Erreur chargement favoris:', error);
    }
  };

  // État pour les chaînes récentes
  const [recentChannels, setRecentChannels] = useState<Channel[]>([]);

  // Charger les chaînes récentes depuis AsyncStorage
  const loadRecentChannels = async () => {
    try {
      const AsyncStorage = await import(
        '@react-native-async-storage/async-storage'
      );
      const recentKey = `recent_channels_${playlistId}`;
      const recentData = await AsyncStorage.default.getItem(recentKey);

      if (recentData) {
        const recentChannelsData = JSON.parse(recentData);
        setRecentChannels(recentChannelsData);
        console.log(
          `🕰️ ${recentChannelsData.length} chaînes récentes chargées`,
        );
      }
    } catch (error) {
      console.error('❌ Erreur chargement récents:', error);
    }
  };

  // Charger les récents au montage
  useEffect(() => {
    loadRecentChannels();
  }, [playlistId]);

  // Fonction pour obtenir le nombre de chaînes pour une catégorie
  const getCategoryChannelCount = (
    category: Category,
    currentChannels: Channel[],
  ): number => {
    // Si c'est la catégorie "RÉCENTS" (détection par nom)
    if (
      category.name.toLowerCase().includes('tout') &&
      category.name.includes('(')
    ) {
      // C'est probablement "TOUT (242)" - utiliser les vraies chaînes récentes
      if (
        category.name.toLowerCase().includes('recent') ||
        category.id.includes('recent')
      ) {
        return recentChannels.length;
      }
    }

    // Si c'est la catégorie "FAVORIS" (détection par nom)
    if (
      category.name.toLowerCase().includes('favoris') ||
      category.name.includes('💙')
    ) {
      return favoriteChannels.length;
    }

    // Si c'est la catégorie active, utiliser les chaînes actuellement affichées
    if (categories[currentCategoryIndex]?.id === category.id) {
      return currentChannels.length;
    }

    // Sinon, utiliser les chaînes associées à la catégorie
    return category.channels?.length || 0;
  };

  // 🔴 Logique LIVE: afficher seulement si vraiment en direct
  const isReallyLive = (channel: Channel) => {
    // Vérifier si la chaîne est vraiment en live
    // Par défaut: true pour chaînes TV classiques, false pour VOD
    return (
      !channel.name.toLowerCase().includes('vod') &&
      !channel.name.toLowerCase().includes('replay') &&
      !channel.url.includes('.mp4') &&
      !channel.url.includes('.mkv')
    );
  };

  // Interface plein écran simple via StatusBar
  useEffect(() => {
    // Pas d'action spéciale pour le moment
    // Hot reload compatible
  }, []);

  // Mise à jour de l'heure et date temps réel
  useEffect(() => {
    const updateTimeAndDate = () => {
      const now = new Date();
      const timeString = now.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const dateString = now.toLocaleDateString('fr-FR', {
        weekday: 'short', // Dim, Lun, Mar...
        day: '2-digit',
        month: 'short',    // Jan, Fév, Mar...
      });
      setCurrentTime(timeString);
      setCurrentDate(dateString);
    };

    updateTimeAndDate(); // Mise à jour immédiate
    const interval = setInterval(updateTimeAndDate, 1000); // Mise à jour chaque seconde

    return () => clearInterval(interval); // Cleanup
  }, []);



  // Dimensions COMME IPTV SMARTERS PRO REFERENCE
  const leftPanelWidth = width * 0.43; // Largeur ajustée à 43%
  const rightPanelWidth = width * 0.55; // 55% pour lecteur + EPG
  // 🎯 RATIO COMME IPTV SMARTERS PRO - LECTEUR COMPACT
  // Lecteur vraiment petit comme dans la référence (environ 180-200px)
  const miniPlayerHeight = Math.min(
    rightPanelWidth * (9 / 16), // Ratio 16:9
    180, // Très compact comme référence IPTV Smarters Pro
  );

  // ===== LOGIQUE DE NAVIGATION ENTRE CATÉGORIES (Spec Gemini) =====
  const handleNextCategory = () => {
    const nextIndex = currentCategoryIndex + 1;
    if (nextIndex < categories.length) {
      console.log(
        `🎬 Navigation vers catégorie suivante: ${categories[nextIndex].name}`,
      );
      setCurrentCategoryIndex(nextIndex);
    }
  };

  const handlePreviousCategory = () => {
    const prevIndex = currentCategoryIndex - 1;
    if (prevIndex >= 0) {
      console.log(
        `🎬 Navigation vers catégorie précédente: ${categories[prevIndex].name}`,
      );
      setCurrentCategoryIndex(prevIndex);
    }
  };

  // Ce useEffect réagit au changement de catégorie pour mettre à jour l'UI (Spec Gemini)
  useEffect(() => {
    if (categories.length === 0) {return;}

    const newCategory = categories[currentCategoryIndex];
    if (newCategory) {
      console.log(`🎬 Changement de catégorie vers : ${newCategory.name}`);

      // 🔧 CHARGEMENT DES CHAÎNES PAR CATÉGORIE
      let newChannels: Channel[];

      // Catégorie RÉCENTS - utiliser les vraies chaînes regardées
      if (
        newCategory.name.toLowerCase().includes('recent') ||
        newCategory.id.includes('recent')
      ) {
        newChannels = recentChannels;
        console.log(
          `🕰️ RÉCENTS: ${newChannels.length} chaînes vraiment regardées`,
        );
      }
      // Catégorie initiale (celle d'origine)
      else if (
        newCategory.id === initialCategory.id &&
        initialChannels.length > 0
      ) {
        newChannels = initialChannels;
        console.log(
          `🎯 XTREAM MATCHED: Utilisation des initialChannels (${newChannels.length} chaînes) pour ${newCategory.name}`,
        );
      }
      // Autres catégories
      else {
        newChannels = newCategory.channels || [];
        if (newChannels.length === 0) {
          console.log(
            `🔍 CHARGEMENT DYNAMIQUE: Catégorie ${newCategory.name} vide, chargement depuis WatermelonDB...`,
          );
          loadChannelsForCategory(newCategory.id, newCategory.name);
          return; // Exit early, loadChannelsForCategory gérera les setState
        }
        console.log(
          `🎯 STANDARD: Utilisation des category.channels (${newChannels.length} chaînes) pour ${newCategory.name}`,
        );
      }

      setChannels(newChannels);

      // JAMAIS changer automatiquement la chaîne lors de la navigation
      // L'utilisateur garde sa chaîne actuelle peu importe la catégorie
      console.log(
        `✅ Navigation vers ${newCategory.name} - Chaîne actuelle ${selectedChannel.name} conservée`,
      );

      // Optionnel: Log si la chaîne actuelle est dans la nouvelle catégorie
      const currentChannelInNewCategory = newChannels.find(
        (ch) => ch.id === selectedChannel.id,
      );
      if (currentChannelInNewCategory) {
        console.log(`🎯 Chaîne actuelle trouvée dans ${newCategory.name}`);
      } else {
        console.log(
          `🔄 Chaîne actuelle non présente dans ${newCategory.name}, mais conservée`,
        );
      }
    }
  }, [currentCategoryIndex, categories, initialChannels]);

  const handleBack = () => {
    navigation.goBack();
  };

  // Fonction pour ajouter une chaîne aux récents
  const addToRecentChannels = async (channel: Channel) => {
    try {
      const AsyncStorage = await import(
        '@react-native-async-storage/async-storage'
      );
      const recentKey = `recent_channels_${playlistId}`;

      // Charger les récents actuels
      const recentData = await AsyncStorage.default.getItem(recentKey);
      let updatedRecentChannels = recentData ? JSON.parse(recentData) : [];

      // Supprimer la chaîne si déjà présente
      updatedRecentChannels = updatedRecentChannels.filter(
        (recent: any) => recent.id !== channel.id,
      );

      // Ajouter en tête avec timestamp
      const recentChannel = {
        ...channel,
        watchedAt: new Date().toISOString(),
      };
      updatedRecentChannels.unshift(recentChannel);

      // Limiter à 20 chaînes récentes
      updatedRecentChannels = updatedRecentChannels.slice(0, 20);

      // Sauvegarder dans AsyncStorage
      await AsyncStorage.default.setItem(
        recentKey,
        JSON.stringify(updatedRecentChannels),
      );

      // 🔥 MISE À JOUR ÉTAT REACT - KEY FIX
      setRecentChannels(updatedRecentChannels);
      
      console.log(`✅ Chaîne ${channel.name} ajoutée aux récents - État mis à jour`);
    } catch (error) {
      console.error('❌ Erreur ajout récents:', error);
    }
  };

  const handleChannelSelect = (channel: Channel) => {
    console.log('🎬 Sélection chaîne:', channel.name);
    setSelectedChannel(channel);
    setIsPlaying(true);

    // Ajouter aux récents SEULEMENT quand l'utilisateur sélectionne manuellement
    addToRecentChannels(channel);
  };

  const handleMiniPlayerPress = (isFullscreen: boolean) => {
    console.log('🎬 handleMiniPlayerPress called:', isFullscreen);
    console.log('🎬 Setting showFullscreenPlayer to:', isFullscreen);
    setShowFullscreenPlayer(isFullscreen);
  };

  const handleCloseFullscreen = (isFullscreen: boolean = false) => {
    console.log('❌ Fermeture fullscreen player');
    setShowFullscreenPlayer(isFullscreen);
  };

  // 🚀 Handlers pour transition rapide
  // handlePlayPauseChange déclaré plus tard (ligne ~484)

  // handleVideoLoad déclaré plus tard avec setVideoMetadata (ligne ~480)

  // Fonctions pour interface TiviMate
  useEffect(() => {
    if (showTiviMateControls) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-masquer les contrôles après 3 secondes
      if (controlsTimer.current) {
        clearTimeout(controlsTimer.current);
      }
      controlsTimer.current = setTimeout(() => {
        hideTiviMateControls();
      }, 3000);
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }

    return () => {
      if (controlsTimer.current) {
        clearTimeout(controlsTimer.current);
      }
    };
  }, [showTiviMateControls]);

  const hideTiviMateControls = () => {
    setShowTiviMateControls(false);
  };

  const toggleTiviMateControls = () => {
    setShowTiviMateControls(!showTiviMateControls);
  };

  const handleTiviMateChannelSelect = (selectedChannel: Channel) => {
    console.log('Changement vers chaîne:', selectedChannel.name);
    handleChannelSelect(selectedChannel);
  };

  // Gestionnaires pour VideoPlayer
  const handleVideoProgress = (data: any) => {
    setVideoCurrentTime(data.currentTime);
    setVideoDuration(data.seekableDuration || data.duration || 0);
    if (data.seekableDuration && data.seekableDuration > 0) {
      setVideoProgress(data.currentTime / data.seekableDuration);
    }
  };

  const handleVideoLoad = (data: any) => {
    console.log('📹 [VIDEO] Load completed:', data?.duration);
    console.log('📹 Métadonnées vidéo:', data);
    setVideoMetadata(data);
  };

  const handlePlayPauseChange = (playing: boolean) => {
    console.log('▶️ [PLAY/PAUSE] State changed:', playing);
    setIsPlaying(playing);
  };

  // Fonction pour extraire les badges techniques réels
  const getTechnicalBadges = () => {
    const badges = [];
    
    // Badge qualité depuis channel.quality ou URL
    if (selectedChannel.quality) {
      badges.push(selectedChannel.quality.toUpperCase());
    } else if (selectedChannel.url.includes('1080')) {
      badges.push('FHD');
    } else if (selectedChannel.url.includes('720')) {
      badges.push('HD');
    } else {
      badges.push('SD');
    }
    
    // Badge FPS (estimation basique)
    if (videoMetadata?.naturalSize?.height >= 1080) {
      badges.push('25 FPS');
    } else {
      badges.push('25 FPS');
    }
    
    // Badge Audio (IPTV généralement stéréo)
    badges.push('STÉRÉO');
    
    return badges;
  };

  // Fonction pour calculer les informations de programme réelles
  const getRealProgramInfo = () => {
    const now = new Date();
    const startTime = new Date(now);
    startTime.setMinutes(0, 0, 0); // Arrondir à l'heure
    
    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + 1); // Programme d'1 heure
    
    const formatTime = (date: Date) => 
      date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    
    const elapsedMinutes = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));
    const totalMinutes = 60;
    const progress = Math.max(0, Math.min(1, elapsedMinutes / totalMinutes));
    
    return {
      currentShow: selectedChannel.name,
      currentTime: `${formatTime(startTime)} – ${formatTime(endTime)}`,
      duration: `${totalMinutes - elapsedMinutes} min restantes`,
      progress: progress,
      nextShow: 'Programme suivant',
    };
  };

  const realProgramInfo = getRealProgramInfo();
  const technicalBadges = getTechnicalBadges();

  // 🔍 CHARGEMENT DYNAMIQUE basé sur patterns GitHub/Reddit - FIX prototype error avec AsyncStorage
  const loadChannelsForCategory = async (
    categoryId: string,
    categoryName: string,
  ) => {
    try {
      console.log(
        `🔍 Chargement chaînes pour ${categoryName} via AsyncStorage (évite conflit WatermelonDB)`,
      );

      // Import AsyncStorage (alternative safe à WatermelonDB)
      const AsyncStorage = await import(
        '@react-native-async-storage/async-storage'
      );

      // Clé pour les chaînes de cette catégorie
      const cacheKey = `channels_${playlistId}_${categoryId}`;
      console.log(`📦 Recherche cache: ${cacheKey}`);

      const cachedData = await AsyncStorage.default.getItem(cacheKey);
      if (cachedData) {
        const channelsData = JSON.parse(cachedData);
        console.log(
          `✅ ${channelsData.length} chaînes chargées depuis AsyncStorage pour ${categoryName}`,
        );
        setChannels(channelsData);
        // JAMAIS changer la chaîne lors du chargement dynamique
        console.log(
          `✅ ${channelsData.length} chaînes chargées - Lecture en cours conservée`,
        );
      } else {
        console.log(`⚠️ Pas de cache AsyncStorage pour ${categoryName}`);
        // Fallback vers category.channels
        const fallbackChannels =
          categories.find(cat => cat.id === categoryId)?.channels || [];
        if (fallbackChannels.length > 0) {
          console.log(
            `🎯 FALLBACK: ${fallbackChannels.length} chaînes trouvées dans category.channels`,
          );
          setChannels(fallbackChannels);
          // Ne pas changer la chaîne automatiquement en fallback non plus
          console.log('✅ Fallback chargé sans interrompre la lecture');
        } else {
          console.log(
            `⚠️ Aucune chaîne pour ${categoryName} - gardons les chaînes actuelles`,
          );
        }
      }
    } catch (error) {
      console.error(
        `❌ Erreur chargement AsyncStorage ${categoryName}:`,
        error,
      );
      // Fallback silencieux
      const fallbackChannels =
        categories.find(cat => cat.id === categoryId)?.channels || [];
      if (fallbackChannels.length > 0) {
        setChannels(fallbackChannels);
        // Même en cas d'erreur, ne pas changer automatiquement la chaîne
      }
    }
  };

  // Rendu d'une chaîne dans la liste de gauche - Version compacte List.Item
  const renderChannelItem = ({item, index}: {item: Channel; index: number}) => {
    const isSelected = item.id === selectedChannel.id;

    return (
      <List.Item
        style={[
          styles.channelListItem,
          isSelected && styles.channelListItemSelected,
        ]}
        onPress={() => handleChannelSelect(item)}
        left={props =>
          item.logo ? (
            <Image
              source={{uri: item.logo}}
              style={styles.channelLogo}
              resizeMode="contain" // Assure que le logo entier est visible sans être rogné
            />
          ) : (
            <Avatar.Text
              {...props}
              label={item.name.substring(0, 2).toUpperCase()}
              size={36}
              style={styles.channelAvatarFallback}
              labelStyle={styles.channelAvatarText}
            />
          )
        }
        title={item.name}
        titleStyle={[
          styles.channelTitle,
          isSelected && styles.channelTitleSelected,
        ]}
        titleNumberOfLines={1}
      />
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#000000"
        hidden={true}
        translucent={true}
      />

      {/* Header Version 2 - 3 blocs avec info chaîne courante */}
      <View style={styles.header}>
        {/* Bloc Gauche: Retour */}
        <View style={styles.headerLeftBlock}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.headerIconButton}>
            <Icon name="arrow-back" size={24} color="#EAEAEA" />
          </TouchableOpacity>
        </View>

        {/* Bloc Central: "À l'Antenne" */}
        <View style={styles.headerCenterBlock}>
          {selectedChannel.logo ? (
            <Image
              source={{uri: selectedChannel.logo}}
              style={styles.headerChannelLogo}
              resizeMode="contain"
            />
          ) : (
            <Avatar.Text
              size={32}
              label={selectedChannel.name.substring(0, 2).toUpperCase()}
              style={styles.headerChannelLogo}
              labelStyle={{fontSize: 12, fontWeight: '600'}}
            />
          )}
        </View>

        {/* Bloc Droite: Heure + Date + Actions */}
        <View style={styles.headerRightBlock}>
          <View style={styles.headerTimeContainer}>
            <Text style={styles.headerTime}>{currentTime}</Text>
            <Text style={styles.headerDate}>{currentDate}</Text>
          </View>
          <View style={styles.headerIconContainer}>
            <TouchableOpacity
              onPress={() => {}}
              style={styles.headerIconButton}>
              <Icon name="search" size={22} color="#EAEAEA" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {}}
              style={styles.headerIconButton}>
              <Icon name="more-vert" size={20} color="#EAEAEA" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Layout 3 zones principal */}
      <View style={styles.mainLayout}>
        {/* Zone Gauche: Interface IPTV Smarters Pro avec sélecteur de catégories */}
        <View style={[styles.leftPanel, {width: leftPanelWidth}]}>

          {/* Sélecteur de catégorie avec IconButton et compteur intégré */}
          <View style={styles.categorySelector}>
            <TouchableOpacity
              onPress={handlePreviousCategory}
              style={styles.categoryArrow}
              disabled={currentCategoryIndex === 0}>
              <Icon
                name="arrow-back-ios"
                size={20}
                color={currentCategoryIndex === 0 ? '#444444' : '#EAEAEA'}
              />
            </TouchableOpacity>

            <Text style={styles.categoryTitle} numberOfLines={1}>
              {categories[currentCategoryIndex]?.name || 'Catégories'} (
              {categories[currentCategoryIndex] 
                ? getCategoryChannelCount(categories[currentCategoryIndex], channels)
                : 0}
              )
            </Text>

            <TouchableOpacity
              onPress={handleNextCategory}
              style={styles.categoryArrow}
              disabled={currentCategoryIndex === categories.length - 1}>
              <Icon
                name="arrow-forward-ios"
                size={20}
                color={
                  currentCategoryIndex === categories.length - 1
                    ? '#444444'
                    : '#EAEAEA'
                }
              />
            </TouchableOpacity>
          </View>

          {/* La liste des chaînes utilise maintenant l'état local 'channels' */}
          <FlatList
            data={channels}
            renderItem={renderChannelItem}
            keyExtractor={(item, index) => `player-${item.id}-${index}`}
            showsVerticalScrollIndicator={false}
            style={styles.channelsList}
            contentContainerStyle={styles.channelsListContent}
            initialScrollIndex={
              channels.length > 0
                ? Math.max(
                    0,
                    channels.findIndex(ch => ch.id === selectedChannel?.id),
                  )
                : undefined
            }
            onScrollToIndexFailed={() => {}}
          />
        </View>

        {/* Zone Droite: Mini lecteur + EPG future */}
        <View style={[styles.rightPanel, {width: rightPanelWidth}]}>

          {/* 🎯 MINI-LECTEUR - VERSION FONCTIONNELLE */}
          <View
            style={[styles.miniPlayerContainer, {height: miniPlayerHeight}]}>
            <VideoPlayer
              channel={selectedChannel}
              isVisible={true}
              allowFullscreen={false}
              showControls={false}
              showInfo={false}
              style={styles.miniPlayer}
              isFullscreen={showFullscreenPlayer}
              paused={showFullscreenPlayer} // 🔇 Pause mini lecteur quand fullscreen actif
              onMiniPlayerPress={() => {
                console.log('🔥 MINI PLAYER CLICKED! Opening fullscreen');
                handleMiniPlayerPress(true);
              }}
              onFullscreenToggle={handleCloseFullscreen}
              externalIsPlaying={isPlaying}
              onPlayPause={handlePlayPauseChange}
              onProgress={(data) => {
                setVideoCurrentTime(data.currentTime); // 🚀 Sauvegarder temps pour fullscreen
              }}
              onVideoLoad={handleVideoLoad}
            />
          </View>

          {/* 🎯 ZONE EPG REDESIGNÉE avec Card flexible et Paper components */}
          <Card style={styles.epgCard}>
            {/* Plus de header - EPG directement */}

            <View style={styles.epgCardContent}>
              {/* Zone EPG vide pour implémentation future */}
              <View style={styles.epgPlaceholder}>
                <Text style={styles.epgPlaceholderText}>
                  EPG en cours d'implémentation
                </Text>
              </View>
            </View>
          </Card>
        </View>
      </View>

      {/* 🎯 INTERFACE FULLSCREEN ULTRA-SIMPLE AVEC GESTURES */}
      <VideoPlayerSimple
        channel={selectedChannel}
        isVisible={showFullscreenPlayer}
        isFullscreen={showFullscreenPlayer}
        onExitFullscreen={handleCloseFullscreen}
        initialTime={videoCurrentTime} // 🚀 Reprendre à la position du mini lecteur
        initialPaused={!isPlaying} // 🚀 État pause du mini lecteur
        recentChannels={recentChannels} // ✅ Chaînes récentes dynamiques
        onChannelSelect={handleTiviMateChannelSelect} // ✅ Callback pour changer de chaîne
      />

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101010', // Couleur de fond principale
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Centrer le bloc du milieu
    paddingVertical: 12,
    backgroundColor: '#1F1F1F',
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
    position: 'relative', // Requis pour le positionnement absolu des enfants
  },

  // ===== HEADER REVISITÉ - LAYOUT CENTRÉ =====
  // Bloc Gauche
  headerLeftBlock: {
    position: 'absolute',
    left: 16,
  },

  // Bloc Central
  headerCenterBlock: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Bloc Droite
  headerRightBlock: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Layout 3 zones
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
  },

  // Zone Gauche: Liste chaînes
  leftPanel: {
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    margin: 8,
    overflow: 'hidden',
  },
  // Header supprimé selon les spécifications

  // ===== STYLES SÉLECTEUR DE CATÉGORIES MODERNISÉ - FIX ESPACEMENT =====
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 4, // Hauteur verticale réduite
    backgroundColor: '#1F1F1F',
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
    minHeight: 40, // Hauteur minimum réduite
  },
  categoryTitle: {
    color: '#EAEAEA', // Texte primaire
    fontSize: 14, // Taille réduite pour moins de dominance
    fontWeight: '500', // Poids réduit pour harmoniser
    textAlign: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  categoryArrow: {
    padding: 6, // Padding réduit pour un look plus fin
  },

  channelsList: {
    flex: 1,
  },
  channelsListContent: {
    paddingVertical: 8,
  },
  // ===== STYLES LIST.ITEM POUR LES CHAÎNES - AMÉLIORÉS =====
  channelListItem: {
    backgroundColor: '#1F1F1F',
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3, // Padding vertical minimal
    paddingHorizontal: 12,
    marginVertical: 1,
  },
  channelListItemSelected: {
    backgroundColor: '#333333', // Fond de l'élément sélectionné
    borderRadius: 12, // Coins plus arrondis
  },
  channelTitle: {
    color: '#EAEAEA', // Texte primaire
    fontSize: 13, // Taille de police réduite
    fontWeight: '500',
  },
  channelTitleSelected: {
    // La couleur du titre ne change plus, seul le fond change
  },
  channelDescription: {
    color: '#888888', // Texte secondaire
    fontSize: 12,
  },
  // Logo standardisé dans conteneur cohérent
  channelLogo: {
    width: 36, // Taille de logo réduite pour compacter
    height: 36,
    borderRadius: 8, // Arrondi standardisé
  },
  channelAvatarFallback: {
    backgroundColor: '#222222',
    borderRadius: 4,
  },
  channelAvatarText: {
    color: '#EAEAEA',
    fontSize: 12,
    fontWeight: '600',
  },
  // Anciens styles supprimés - remplacés par List.Item

  // Zone Droite: Mini lecteur + EPG - FIX PROPORTIONS
  rightPanel: {
    flex: 1,
    padding: 8, // Padding unifié pour un espacement cohérent
  },

  // 🎯 STYLES MINI-LECTEUR - VERSION FONCTIONNELLE
  miniPlayerContainer: {
    position: 'relative',
    backgroundColor: '#1F1F1F',
    marginBottom: 8, // Espace entre le lecteur et la carte EPG
    borderRadius: 12,
    // Effet Card avec shadow
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden', // Pour les coins arrondis
  },
  miniPlayer: {
    width: '100%',
    height: '100%',
  },


  // 🎯 STYLES EPG ALIGNÉ AVEC LISTE CHAÎNES
  epgCard: {
    backgroundColor: '#1F1F1F',
    // Marges gérées par le conteneur parent (rightPanel)
    borderRadius: 12,
    elevation: 4,
    flex: 1, // PREND LA HAUTEUR RESTANTE pour alignement parfait
  },
  epgCardHeader: {
    backgroundColor: 'transparent',
    paddingBottom: 8,
  },
  epgCardTitle: {
    color: '#EAEAEA',
    fontSize: 16,
    fontWeight: '600',
  },
  epgCardContent: {
    flex: 1, // S'adapte à la hauteur flexible de la card
    paddingTop: 0,
  },
  currentProgramModern: {
    paddingHorizontal: 16, // Ajouter un espacement intérieur
    width: '100%', // S'assurer qu'il prend toute la largeur
  },

  // Programme Actuel avec ProgressBar
  currentProgramSection: {
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#00D4AA',
  },
  currentProgramTitle: {
    color: '#EAEAEA',
    fontWeight: '600',
    marginBottom: 8,
  },
  currentProgramTime: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  programTimeText: {
    color: '#00D4AA',
    fontWeight: '500',
    marginRight: 8,
  },
  liveBadgeNew: {
    backgroundColor: '#D92D20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8, // Arrondi standardisé
  },
  liveBadgeTextNew: {
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  currentProgramDescription: {
    color: '#888888',
    marginBottom: 12,
    lineHeight: 18,
  },
  programProgressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0, 212, 170, 0.2)',
  },

  // Programmes Suivants avec List.Section
  nextProgramsSection: {
    flex: 1,
  },
  nextProgramsHeader: {
    color: '#EAEAEA',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
  nextProgramItem: {
    paddingHorizontal: 0,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  nextProgramTitle: {
    color: '#EAEAEA',
    fontSize: 14,
    fontWeight: '500',
  },
  nextProgramDescription: {
    color: '#888888',
    fontSize: 12,
    lineHeight: 16,
  },
  nextProgramTime: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextProgramTimeText: {
    color: '#888888',
    fontWeight: '500',
  },

  // EPG Placeholder
  epgPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  epgPlaceholderText: {
    color: '#666666',
    fontSize: 14,
    fontStyle: 'italic',
  },

  // Fullscreen Player
  fullscreenPlayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    backgroundColor: 'black',
  },

  // ============ STYLES TIVIMATE (MODAL PLEIN ÉCRAN) ============
  
  tiviMateContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  tiviMateVideoContainer: {
    flex: 1,
  },
  tiviMateVideo: {
    width: '100%',
    height: '100%',
  },
  tiviMateTouchOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  // Style supprimé - non utilisé dans nouvelle structure
  tiviMateControlsOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },

  // Header vidéo supprimé comme demandé

  // Contrôles play/pause centraux
  tiviMatePlayControlsContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -30 }, { translateY: -30 }],
    zIndex: 10, // Z-index élevé pour être au-dessus du background
  },
  tiviMatePlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -30,
    marginLeft: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 1000,
  },

  // Docker avec cartes de taille et opacité uniformes
  tiviMateDockerContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    zIndex: 999, // Z-index très élevé pour docker
  },
  tiviMateChannelList: {
    paddingHorizontal: 20,
  },
  tiviMateDockerButton: {
    width: 80,
    height: 80,
    alignItems: 'center',
    marginRight: 10,
    zIndex: 1000, // Z-index maximal
  },
  // Styles Docker supprimés - utilisation des styles unifiés de chaînes
  tiviMateChannelCard: {
    width: 80, // Taille unifiée
    height: 80, // Taille unifiée
    backgroundColor: 'rgba(40, 40, 40, 0.9)', // Opacité augmentée
    borderRadius: 15,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 16, // Z-index pour interactions
  },
  tiviMateChannelCardLogo: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  tiviMateChannelCardFallback: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tiviMateChannelCardText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },

  // Bouton de fermeture TiviMate
  tiviMateCloseButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1001,
  },
  tiviMateCloseButtonBlur: {
    ...StyleSheet.absoluteFillObject,
  },

  // ============ STYLES OVERLAY INFO CENTRAL V2 ============
  infoOverlayContainer: {
    position: 'absolute',
    bottom: 120, // Ajusté pour le nouveau layout
    left: '5%',
    right: '5%',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLogo: {
    width: 80, // Taille augmentée
    height: 80, // Taille augmentée
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  infoProgramTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  infoProgramTime: {
    color: '#E0E0E0',
    fontSize: 14,
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  infoProgressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 12, // Espace ajouté au-dessus
  },
  infoProgressBarFill: {
    height: '100%',
    backgroundColor: '#4A90E2', // Couleur bleue de référence
  },
  
  // Nouveaux styles pour badges techniques et informations réelles
  infoBadgesContainer: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 8,
  },
  infoBadge: {
    backgroundColor: 'rgba(74, 144, 226, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  infoBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  infoProgressText: {
    color: '#E0E0E0',
    fontSize: 12,
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  
  // ============ STYLES BARRE DE PROGRESSION MODERNE IPTV ============
  modernProgressContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  modernProgressBar: {
    height: 6,
    borderRadius: 3,
    position: 'relative',
    marginBottom: 8,
  },
  modernProgressBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
  },
  modernProgressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 6,
    backgroundColor: '#4A90E2',
    borderRadius: 3,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  modernProgressHandle: {
    position: 'absolute',
    top: -2,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modernTimeDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modernTimeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  modernDurationText: {
    color: '#E0E0E0',
    fontSize: 13,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});

export default ChannelPlayerScreen;