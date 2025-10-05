import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  FlatList,
  StatusBar,
  Platform,
  AppState,
  BackHandler,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Video from 'react-native-video';
import {Image} from 'react-native';
import ImmersiveMode from 'react-native-immersive-mode';
import SystemNavigationBar from 'react-native-system-navigation-bar';
import database from '../database';
import {Q} from '@nozbe/watermelondb';
import {Channel as ChannelModel, Category as CategoryModel} from '../database/models';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

interface Channel {
  id: string;
  name: string;
  url: string;
  logo?: string;
  group?: string;
  category?: string;
}

interface MultiScreenViewProps {
  visible: boolean;
  onClose: () => void;
  playlistId?: string; // ⚡ NOUVEAU: Passer l'ID au lieu du tableau
  currentChannel?: Channel | null; // Chaîne actuellement en lecture
  onChannelFullscreen: (channel: Channel) => void;
  // Props pour persister l'état
  initialLayout?: string | null;
  initialSlots?: (Channel | null)[];
  initialActiveSlot?: number;
  onStateChange?: (layout: string | null, slots: (Channel | null)[], activeSlot: number) => void;
}

type LayoutType = '2x2' | '1+3-right' | '1+3-bottom' | '1+2-right' | '2-horizontal' | '2-vertical';

interface LayoutConfig {
  id: LayoutType;
  name: string;
  icon: string;
  slots: number;
}

const LAYOUTS: LayoutConfig[] = [
  {id: '2x2', name: 'Grille 2x2', icon: 'grid-on', slots: 4},
  {id: '1+3-right', name: '1 Principal + 3 droite', icon: 'view-quilt', slots: 4},
  {id: '1+3-bottom', name: '1 Principal + 3 bas', icon: 'view-agenda', slots: 4},
  {id: '1+2-right', name: '1 Principal + 2 droite', icon: 'view-sidebar', slots: 3},
  {id: '2-horizontal', name: '2 Horizontaux', icon: 'view-stream', slots: 2},
  {id: '2-vertical', name: '2 Verticaux', icon: 'view-column', slots: 2},
];

const MultiScreenView: React.FC<MultiScreenViewProps> = ({
  visible,
  onClose,
  playlistId,
  currentChannel,
  onChannelFullscreen,
  initialLayout = null,
  initialSlots = [],
  initialActiveSlot = 0,
  onStateChange,
}) => {
  // ⏱️ Performance tracking
  const renderStartTime = React.useRef<number>(0);

  // ⚡ State pour les chaînes - chargées à la demande
  const [channels, setChannels] = React.useState<Channel[]>([]);
  const [categories, setCategories] = React.useState<{id: string; name: string; count: number}[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = React.useState(false);

  // 🔍 Debug: Logger les changements de categories
  React.useEffect(() => {
    console.log(`🔍 [DEBUG] Categories state changé: ${categories.length} catégories`);
  }, [categories]);

  // State pour forcer re-render des vidéos (utilisé par bouton retry)
  const [videoKey, setVideoKey] = React.useState(0);
  // State pour pauser toutes les vidéos quand l'app est en arrière-plan
  const [isPausedByAppState, setIsPausedByAppState] = React.useState(false);
  // Animation rotation pour le loading
  const loadingRotation = React.useRef(new Animated.Value(0)).current;

  // ⏱️ Log du temps de rendu initial
  React.useEffect(() => {
    if (visible) {
      renderStartTime.current = performance.now();
      console.log('⏱️ [PERF] MultiScreenView visible - Début rendu');
    }
  }, [visible]);

  // ⚡ CHARGER UNIQUEMENT LES CATÉGORIES (pas les chaînes !)
  React.useEffect(() => {
    if (visible && playlistId) {
      loadCategoriesOnly();
    }
  }, [visible, playlistId]);

  const loadCategoriesOnly = async () => {
    const loadStartTime = performance.now();
    setIsLoadingChannels(true);
    try {
      console.log(`🔍 [DEBUG] Chargement catégories pour playlist: ${playlistId}`);

      const dbCategories = await database
        .get<typeof CategoryModel>('categories')
        .query(Q.where('playlist_id', playlistId!))
        .fetch();

      const loadEndTime = performance.now();
      console.log(`⏱️ [PERF] Catégories chargées: ${(loadEndTime - loadStartTime).toFixed(2)}ms pour ${dbCategories.length} catégories`);
      console.log(`🔍 [DEBUG] Premières catégories:`, dbCategories.slice(0, 3).map(c => ({id: c.id, name: c.name, count: c.channelsCount})));

      // Transformer les catégories avec leur ID et nombre de chaînes
      const categoriesWithCounts = dbCategories.map(cat => ({
        id: cat.id, // ⚡ IMPORTANT: garder l'ID pour Xtream Codes
        name: cat.name,
        count: cat.channelsCount || 0,
      }));

      console.log(`🔍 [DEBUG] Catégories transformées: ${categoriesWithCounts.length}`);

      // Ajouter "Tout" en premier
      categoriesWithCounts.unshift({
        id: 'all',
        name: 'Tout',
        count: categoriesWithCounts.reduce((sum, cat) => sum + cat.count, 0),
      });

      console.log(`🔍 [DEBUG] Catégories finales avec "Tout": ${categoriesWithCounts.length}`);
      console.log(`🔍 [DEBUG] Premières catégories finales:`, categoriesWithCounts.slice(0, 5));

      setCategories(categoriesWithCounts);
      console.log(`✅ [DEBUG] State categories mis à jour avec ${categoriesWithCounts.length} catégories`);

      setChannels([]); // Les chaînes seront chargées par catégorie
    } catch (error) {
      console.error('❌ Erreur chargement catégories:', error);
    } finally {
      setIsLoadingChannels(false);
    }
  };

  // ⚡ CHARGER LES CHAÎNES D'UNE CATÉGORIE UNIQUEMENT QUAND NÉCESSAIRE
  const loadChannelsForCategory = async (categoryId: string, categoryName: string) => {
    const loadStartTime = performance.now();
    try {
      console.log(`🔍 [DEBUG] Chargement chaînes - categoryId: ${categoryId}, categoryName: ${categoryName}`);

      let query;
      if (categoryId === 'all') {
        // Charger toutes les chaînes
        query = database
          .get<typeof ChannelModel>('channels')
          .query(Q.where('playlist_id', playlistId!));
      } else {
        // ⚡ Charger par category_id (Xtream Codes) OU par group_title (M3U)
        query = database
          .get<typeof ChannelModel>('channels')
          .query(
            Q.where('playlist_id', playlistId!),
            Q.or(
              Q.where('category_id', categoryId),
              Q.where('group_title', categoryName)
            )
          );
      }

      const dbChannels = await query.fetch();

      const loadEndTime = performance.now();
      console.log(`⏱️ [PERF] Chaînes de "${categoryName}" chargées: ${(loadEndTime - loadStartTime).toFixed(2)}ms pour ${dbChannels.length} chaînes`);

      // Transformer uniquement les chaînes de cette catégorie
      const formatted = dbChannels.map((ch) => ({
        id: ch.id,
        name: ch.name,
        url: ch.streamUrl,
        logo: ch.logoUrl || undefined,
        group: ch.groupTitle || 'Non classé',
        category: ch.groupTitle || 'Non classé',
      }));

      setChannels(formatted);
    } catch (error) {
      console.error('❌ Erreur chargement chaînes catégorie:', error);
    }
  };

  // 🎯 LIFECYCLE: Gérer pause/resume quand l'app passe en arrière-plan
  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log('🔇 [MultiScreen] App en arrière-plan - PAUSE vidéos');
        setIsPausedByAppState(true);
      } else if (nextAppState === 'active') {
        console.log('🔊 [MultiScreen] App active - RESUME vidéos');
        setIsPausedByAppState(false);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Animation de rotation pour le loading
  React.useEffect(() => {
    if (channels.length === 0 && step === 'selector') {
      // Démarrer l'animation de rotation
      Animated.loop(
        Animated.timing(loadingRotation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      loadingRotation.setValue(0);
    }
  }, [channels.length, step, loadingRotation]);

  // Force immersive mode dans Modal (contourner StatusBarManager car priorité bloquée)
  React.useEffect(() => {
    if (visible) {
      // Forcer immersive sans passer par StatusBarManager
      setTimeout(() => {
        try {
          StatusBar.setHidden(true, 'fade');
          StatusBar.setTranslucent(true);
          StatusBar.setBackgroundColor('transparent', true);

          // Android uniquement
          if (Platform.OS === 'android') {
            ImmersiveMode.setBarMode('FullSticky');
            SystemNavigationBar.immersive();
          }
        } catch (e) {
          console.log('⚠️ [MultiScreen] Immersive mode error:', e);
        }
      }, 100);
    }
  }, [visible]);

  const [step, setStep] = React.useState<'layout' | 'grid' | 'selector' | 'channels'>(
    initialLayout && initialSlots.length > 0 ? 'grid' : 'layout',
  );

  // 🔍 Debug: Logger les changements de step
  React.useEffect(() => {
    console.log(`🔍 [DEBUG] Step changé: ${step}`);
  }, [step]);
  const [selectedLayout, setSelectedLayout] = React.useState<LayoutType | null>(
    (initialLayout as LayoutType) || null,
  );
  const [selectedSlotIndex, setSelectedSlotIndex] = React.useState<
    number | null
  >(null);
  const [slotChannels, setSlotChannels] = React.useState<(Channel | null)[]>(
    initialSlots.length > 0 ? initialSlots : [],
  );
  const [selectedCategoryForChannels, setSelectedCategoryForChannels] = React.useState<string | null>(null);
  const [activeSlotIndex, setActiveSlotIndex] = React.useState<number>(initialActiveSlot); // Slot actif avec le son
  // Tracker les positions de lecture pour chaque slot
  const [slotPositions, setSlotPositions] = React.useState<{[key: number]: number}>({});
  // Tracker les erreurs de stream pour affichage visuel
  const [slotErrors, setSlotErrors] = React.useState<{[key: number]: boolean}>({});

  // ⚡ Utiliser directement le state categories (chargé depuis DB)
  // Plus besoin de calculer depuis channels - déjà optimisé !

  // Filtrer les chaînes selon la catégorie sélectionnée (pour step 'channels')
  // ⚡ Les chaînes sont déjà filtrées par loadChannelsForCategory, pas besoin de filtrer à nouveau
  const filteredChannelsForCategory = React.useMemo(() => {
    console.log(`🔍 [DEBUG] filteredChannelsForCategory - channels.length: ${channels.length}, selectedCategory: ${selectedCategoryForChannels}`);
    return channels; // Déjà filtrées par la requête DB
  }, [channels, selectedCategoryForChannels]);

  const handleLayoutSelect = (layout: LayoutType) => {
    console.log('📐 [MultiScreen] Layout sélectionné:', layout);
    setSelectedLayout(layout);
    const layoutConfig = LAYOUTS.find(l => l.id === layout);
    // Pré-remplir le slot 0 avec la chaîne courante si elle existe
    const initialSlotsData = new Array(layoutConfig?.slots || 4).fill(null);
    if (currentChannel) {
      initialSlotsData[0] = currentChannel;
      console.log('🎬 [MultiScreen] Slot 0 pré-rempli avec:', currentChannel.name);
    }
    console.log('🎯 [MultiScreen] Slots initiaux:', initialSlotsData.map((s, i) => s ? `${i}:${s.name}` : `${i}:vide`));
    setSlotChannels(initialSlotsData);
    setStep('grid');
    // Persister l'état dans le parent
    onStateChange?.(layout, initialSlotsData, 0);
  };

  const handleSlotPress = (index: number) => {
    setSelectedSlotIndex(index);
    setStep('selector');
  };

  const handleChannelSelect = (channel: Channel) => {
    if (selectedSlotIndex !== null) {
      const newSlots = [...slotChannels];
      newSlots[selectedSlotIndex] = channel;
      setSlotChannels(newSlots);
      // Auto-activer le slot qu'on vient de remplir (activer le son)
      setActiveSlotIndex(selectedSlotIndex);
      console.log('🎯 [MultiScreen] Slot', selectedSlotIndex, 'auto-activé avec:', channel.name);
      setStep('grid');
      setSelectedSlotIndex(null);
      // Persister l'état dans le parent
      onStateChange?.(selectedLayout, newSlots, selectedSlotIndex);
    }
  };

  const handleBackPress = () => {
    console.log('🔙 [MultiScreen] Back press - Step actuel:', step);

    // Navigation intelligente selon l'étape
    if (step === 'channels') {
      // Revenir à la sélection de catégories
      setStep('selector');
      return true; // Empêcher la fermeture du modal
    } else if (step === 'selector') {
      // Revenir à la grille multi-écran
      setStep('grid');
      return true;
    } else if (step === 'grid') {
      // Revenir au choix de layout
      setStep('layout');
      return true;
    } else {
      // Step 'layout' : fermer le modal
      return false;
    }
  };

  const handleDisable = () => {
    console.log('🚪 [MultiScreen] Fermeture - Réinitialisation complète');

    // TOUJOURS réinitialiser à la fermeture (bouton X)
    setStep('layout');
    setSelectedLayout(null);
    setSlotChannels([]);
    setSelectedSlotIndex(null);
    setSelectedCategoryForChannels(null);
    setActiveSlotIndex(0);
    setSlotErrors({});

    // Vider l'état persisté dans le parent
    onStateChange?.(null, [], 0);

    onClose();
  };

  const handleVideoPress = (channel: Channel | null, slotIndex?: number) => {
    if (channel) {
      // Ajouter la position de lecture au channel pour continuer depuis où on était
      const position = slotIndex !== undefined ? slotPositions[slotIndex] || 0 : 0;
      const channelWithPosition = {
        ...channel,
        seekTime: position, // Position de départ pour le fullscreen
      };
      console.log('🎬 [MultiScreen] Passage en fullscreen avec position:', position, 's');
      onChannelFullscreen(channelWithPosition);
    }
  };

  const renderLayoutGrid = (layout: LayoutType) => {
    const slots = slotChannels;

    if (layout === '2x2') {
      return (
        <View style={styles.gridContainer}>
          <View style={styles.gridRow}>
            {renderSlot(0, slots[0])}
            {renderSlot(1, slots[1])}
          </View>
          <View style={styles.gridRow}>
            {renderSlot(2, slots[2])}
            {renderSlot(3, slots[3])}
          </View>
        </View>
      );
    }

    if (layout === '1+3-right') {
      return (
        <View style={styles.gridContainer}>
          <View style={{flex: 1, flexDirection: 'row'}}>
            <View style={{flex: 2}}>{renderSlot(0, slots[0], true)}</View>
            <View style={{flex: 1}}>
              {renderSlot(1, slots[1], false, {height: '33.33%'})}
              {renderSlot(2, slots[2], false, {height: '33.33%'})}
              {renderSlot(3, slots[3], false, {height: '33.33%'})}
            </View>
          </View>
        </View>
      );
    }

    if (layout === '1+3-bottom') {
      return (
        <View style={styles.gridContainer}>
          <View style={{flex: 2}}>{renderSlot(0, slots[0], true)}</View>
          <View style={{flex: 1, flexDirection: 'row'}}>
            {renderSlot(1, slots[1], false, {width: '33.33%'})}
            {renderSlot(2, slots[2], false, {width: '33.33%'})}
            {renderSlot(3, slots[3], false, {width: '33.33%'})}
          </View>
        </View>
      );
    }

    if (layout === '1+2-right') {
      return (
        <View style={styles.gridContainer}>
          <View style={{flex: 1, flexDirection: 'row'}}>
            <View style={{flex: 2}}>{renderSlot(0, slots[0], true)}</View>
            <View style={{flex: 1}}>
              {renderSlot(1, slots[1], false, {height: '50%'})}
              {renderSlot(2, slots[2], false, {height: '50%'})}
            </View>
          </View>
        </View>
      );
    }

    if (layout === '2-horizontal') {
      return (
        <View style={styles.gridContainer}>
          {renderSlot(0, slots[0], true, {height: '50%'})}
          {renderSlot(1, slots[1], true, {height: '50%'})}
        </View>
      );
    }

    if (layout === '2-vertical') {
      return (
        <View style={styles.gridContainer}>
          <View style={{flex: 1, flexDirection: 'row'}}>
            {renderSlot(0, slots[0], true, {width: '50%'})}
            {renderSlot(1, slots[1], true, {width: '50%'})}
          </View>
        </View>
      );
    }

    return null;
  };

  const renderSlot = (
    index: number,
    channel: Channel | null,
    large: boolean = false,
    customStyle?: any,
  ) => {
    const isActive = activeSlotIndex === index;

    // Log désactivé - causait re-renders excessifs et blocages vidéo

    // Handler de clic : sélectionner le slot ou ouvrir fullscreen si déjà actif
    const handleSlotClick = () => {
      if (!channel) {
        // Slot vide : ouvrir le sélecteur de chaîne
        handleSlotPress(index);
        return;
      }

      if (isActive) {
        // Déjà actif : ouvrir en fullscreen avec la position actuelle
        handleVideoPress(channel, index);
      } else {
        // Pas actif : sélectionner ce slot (activer le son)
        setActiveSlotIndex(index);
        console.log('🎯 [MultiScreen] Slot', index, 'sélectionné:', channel.name);
        // Persister l'état dans le parent
        onStateChange?.(selectedLayout, slotChannels, index);
      }
    };

    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.slot,
          large && styles.slotLarge,
          customStyle,
          isActive && channel && styles.slotActive, // Rectangle coloré pour slot actif
        ]}
        onPress={handleSlotClick}
        activeOpacity={0.8}>
        {channel ? (
          <View style={styles.videoContainer}>
            <Video
              key={`${channel.id}-${index}-${videoKey}`} // Key unique pour forcer re-render (avec videoKey pour retry)
              source={{
                uri: channel.url,
                headers: {
                  'User-Agent': channel.url.includes('vodalys.com')
                    ? 'VLC/3.0.16 LibVLC/3.0.16'
                    : 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
                },
              }}
              style={styles.video}
              resizeMode="cover"
              muted={!isActive} // Son activé uniquement pour le slot actif
              paused={isPausedByAppState} // Pause si app en arrière-plan, sinon joue
              repeat={false}
              playInBackground={false} // Désactivé - pas de lecture en arrière-plan
              playWhenInactive={false} // Désactivé - pause quand app inactive
              // 🎯 OPTIMISATION MULTI-STREAM: Qualité réduite pour slots inactifs uniquement
              {...(!isActive && {
                selectedVideoTrack: {
                  type: 'resolution',
                  value: 360, // 360p pour slots inactifs, slot actif = AUTO par défaut
                },
              })}
              // 🎯 PROPS ANDROID OPTIMISEES: Fix ExoPlayer multi-instance
              useTextureView={false} // Réduit charge GPU
              disableFocus={true} // Fix problème focus ExoPlayer (CRITIQUE pour multi-instance)
              onLoadStart={() => {
                console.log(`🎬 [MultiScreen] Slot ${index} - LoadStart:`, channel.name);
              }}
              onLoad={(data) => {
                console.log(`✅ [MultiScreen] Slot ${index} - Chargée:`, {
                  channel: channel.name,
                  duration: data.duration,
                  isActive,
                  muted: !isActive,
                });
                // Réinitialiser l'erreur si le stream charge avec succès
                setSlotErrors(prev => ({...prev, [index]: false}));
              }}
              onError={(error) => {
                // Marquer le slot en erreur pour affichage visuel (sans log console)
                setSlotErrors(prev => ({...prev, [index]: true}));
              }}
              onProgress={(data) => {
                // Tracker la position de lecture pour reprise en fullscreen
                setSlotPositions(prev => ({
                  ...prev,
                  [index]: data.currentTime,
                }));
                // Log réduit - seulement toutes les 10 secondes pour slot actif
                if (isActive && Math.floor(data.currentTime) % 10 === 0 && Math.floor(data.currentTime) > 0) {
                  console.log(`⏱️ [MultiScreen] Slot ${index} actif - Position:`, Math.floor(data.currentTime) + 's');
                }
              }}
              onBuffer={(data) => {
                // Log buffering seulement si c'est le slot actif et en buffering
                if (isActive && data.isBuffering) {
                  console.log(`⏳ [MultiScreen] Slot ${index} - Buffering actif`);
                }
              }}
              progressUpdateInterval={5000} // Mise à jour toutes les 5 secondes (réduit charge)
            />
            <View style={styles.videoOverlay}>
              <Text style={styles.videoChannelName} numberOfLines={1}>
                {channel.name}
              </Text>
              {isActive && (
                <Icon
                  name="volume-up"
                  size={16}
                  color="#1976d2"
                  style={{marginLeft: 8}}
                />
              )}
            </View>
            {/* Overlay erreur stream */}
            {slotErrors[index] && (
              <View style={styles.errorOverlay}>
                <Icon name="error-outline" size={32} color="#ff5252" />
                <Text style={styles.errorText}>Stream indisponible</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => {
                    // Force re-render pour retry
                    setSlotErrors(prev => ({...prev, [index]: false}));
                    setVideoKey(prev => prev + 1);
                  }}>
                  <Icon name="refresh" size={20} color="white" />
                  <Text style={styles.retryButtonText}>Réessayer</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.emptySlot}>
            <Icon name="add-circle-outline" size={40} color="rgba(255,255,255,0.5)" />
            <Text style={styles.emptySlotText}>Ajouter une chaîne</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // 🔙 Gérer le bouton retour Android et les swipes
  React.useEffect(() => {
    if (!visible) return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      const shouldPreventClose = handleBackPress();
      if (!shouldPreventClose) {
        handleDisable(); // Fermer le modal seulement si on est au premier step
      }
      return true; // Toujours intercepter le back button
    });

    return () => backHandler.remove();
  }, [visible, step]);

  // Log du rendu du Modal
  React.useEffect(() => {
    if (visible) {
      console.log('👁️ [MultiScreen] Modal visible - État:', {
        step,
        selectedLayout,
        slotsCount: slotChannels.length,
        slots: slotChannels.map((s, i) => s ? `${i}:${s.name}` : `${i}:vide`),
        activeSlot: activeSlotIndex,
      });
    }
  }, [visible, step]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={() => {
        const shouldPreventClose = handleBackPress();
        if (!shouldPreventClose) {
          handleDisable();
        }
      }}
      transparent={false}
      presentationStyle="fullScreen"
      statusBarTranslucent={true}
      hardwareAccelerated={true}>
      <View style={styles.container}>
        {/* Step 1: Layout Selection */}
        {step === 'layout' && (
          <View
            style={styles.layoutSelectionContainer}
            onLayout={() => {
              if (renderStartTime.current > 0) {
                const renderEndTime = performance.now();
                console.log(`⏱️ [PERF] Layout UI rendu en ${(renderEndTime - renderStartTime.current).toFixed(2)}ms`);
                renderStartTime.current = 0; // Reset pour éviter les logs multiples
              }
            }}>
            <View style={styles.header}>
              <TouchableOpacity onPress={handleDisable} style={styles.closeButton}>
                <Icon name="close" size={28} color="white" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>
                Choisir une disposition multi-écrans
              </Text>
              <View style={{width: 40}} />
            </View>

            <ScrollView contentContainerStyle={styles.layoutGrid}>
              {LAYOUTS.map(layout => (
                <TouchableOpacity
                  key={layout.id}
                  style={styles.layoutCard}
                  onPress={() => handleLayoutSelect(layout.id)}
                  activeOpacity={0.7}>
                  <View style={styles.layoutIconContainer}>
                    <Icon name={layout.icon} size={32} color="#1976d2" />
                  </View>
                  <Text style={styles.layoutName}>{layout.name}</Text>
                  <Text style={styles.layoutSlots}>{layout.slots} écrans</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Step 2: Grid with Slots */}
        {step === 'grid' && selectedLayout && (
          <View style={styles.gridViewContainer}>
            {renderLayoutGrid(selectedLayout)}
          </View>
        )}

        {/* Step 3: Categories Selector (2 colonnes horizontales) */}
        {step === 'selector' && (
          <View style={styles.selectorContainer}>
              <View style={styles.header}>
                <View style={{width: 40}} />
                <Text style={styles.headerTitle}>CATÉGORIES EN DIRECT</Text>
                <View style={{width: 40}} />
              </View>

              {/* Animation de chargement si pas de catégories */}
              {categories.length === 0 ? (
                <View style={styles.loadingContainer}>
                  <Animated.View style={{
                    transform: [{
                      rotate: loadingRotation.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg']
                      })
                    }]
                  }}>
                    <Icon name="refresh" size={48} color="#1976d2" />
                  </Animated.View>
                </View>
              ) : (
                <ScrollView
                  style={styles.channelsList}
                  contentContainerStyle={styles.categoriesListContainer}>
                  {(() => {
                    console.log(`🔍 [DEBUG] Rendu catégories - Nombre: ${categories.length}`);
                    console.log(`🔍 [DEBUG] Categories state:`, categories.slice(0, 3));
                    return null;
                  })()}
                  {categories.map((category) => {
                  return (
                    <TouchableOpacity
                      key={category.name}
                      style={styles.categoryItemHorizontal}
                      onPress={async () => {
                        console.log(`📂 [MultiScreen] Catégorie sélectionnée: ${category.name} (ID: ${category.id})`);
                        setSelectedCategoryForChannels(category.name);
                        setStep('channels');
                        // ⚡ Charger les chaînes de cette catégorie SEULEMENT
                        await loadChannelsForCategory(category.id, category.name);
                      }}
                      activeOpacity={0.8}>
                      {/* Logo gauche - Placeholder générique pour catégories */}
                      <View style={styles.categoryLogoContainer}>
                        <Icon name="play-circle-outline" size={32} color="#1976d2" />
                      </View>

                      {/* Nom catégorie (centre, flex) */}
                      <Text style={styles.categoryNameHorizontal} numberOfLines={1}>
                        {category.name}
                      </Text>

                      {/* Count (droite) */}
                      <Text style={styles.categoryCountHorizontal}>
                        {category.count}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                </ScrollView>
              )}
            </View>
        )}

        {/* Step 4: Channels List (2 colonnes horizontales avec logos) */}
        {step === 'channels' && (
          <View style={styles.selectorContainer}>
              <View style={styles.header}>
                <View style={{width: 40}} />
                <Text style={styles.headerTitle}>
                  {selectedCategoryForChannels} ({filteredChannelsForCategory.length})
                </Text>
                <View style={{width: 40}} />
              </View>

              {/* Grille chaînes 2 colonnes horizontales (logo gauche + nom) - VIRTUALISÉ */}
              <FlatList
                data={filteredChannelsForCategory}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                numColumns={2}
                style={styles.channelsList}
                contentContainerStyle={styles.channelsGridContainer}
                removeClippedSubviews={true}
                maxToRenderPerBatch={20}
                windowSize={7}
                initialNumToRender={20}
                updateCellsBatchingPeriod={50}
                getItemLayout={(data, index) => ({
                  length: 56,
                  offset: 56 * index,
                  index,
                })}
                renderItem={({item: channel}) => (
                  <TouchableOpacity
                    style={styles.channelCardHorizontal}
                    onPress={() => {
                      console.log(`📺 [MultiScreen] Chaîne sélectionnée: ${channel.name}`);
                      handleChannelSelect(channel);
                    }}
                    activeOpacity={0.8}>
                    {/* Logo chaîne (gauche) */}
                    <View style={styles.channelLogoContainerSmall}>
                      {channel.logo ? (
                        <Image
                          source={{uri: channel.logo}}
                          style={styles.channelLogoImageSmall}
                          resizeMode="contain"
                        />
                      ) : (
                        <Icon name="tv" size={24} color="#999" />
                      )}
                    </View>

                    {/* Nom chaîne (droite) */}
                    <Text style={styles.channelNameHorizontal} numberOfLines={2}>
                      {channel.name}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },

  // Layout Selection
  layoutSelectionContainer: {
    flex: 1,
  },
  layoutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    justifyContent: 'center',
    gap: 16,
  },
  layoutCard: {
    width: (SCREEN_WIDTH - 80) / 3,
    height: 110,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  layoutIconContainer: {
    marginBottom: 8,
  },
  layoutName: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    marginBottom: 2,
  },
  layoutSlots: {
    fontSize: 10,
    color: '#999',
  },

  // Grid View
  gridViewContainer: {
    flex: 1,
  },
  gridContainer: {
    flex: 1,
    padding: 8, // Réduit de 16 à 8 pour maximiser surface vidéo
  },
  gridRow: {
    flex: 1,
    flexDirection: 'row',
  },
  slot: {
    flex: 1,
    margin: 4, // Réduit de 6 à 4 pour maximiser surface vidéo
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 6, // Réduit de 8 à 6
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  slotLarge: {
    flex: 1,
  },
  slotActive: {
    borderWidth: 3,
    borderColor: '#1976d2', // Bleu pour le slot actif
    shadowColor: '#1976d2',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  emptySlot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySlotText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 8,
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  video: {
    flex: 1,
    backgroundColor: 'black',
  },
  videoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
  },
  videoChannelName: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },

  // Channel Selector
  selectorContainer: {
    flex: 1,
  },
  categoriesScroll: {
    maxHeight: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#1976d2',
    borderColor: '#1976d2',
  },
  categoryChipText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    fontWeight: '700',
  },
  channelsList: {
    flex: 1,
  },
  channelsListContent: {
    padding: 16,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  channelIconPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  channelInfo: {
    flex: 1,
  },
  channelName: {
    color: 'white',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  channelGroup: {
    color: '#999',
    fontSize: 12,
  },
  // Error Overlay Styles
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  errorText: {
    color: '#ff5252',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(25, 118, 210, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },

  // Categories List (2 colonnes, layout horizontal, 7 par colonne)
  categoriesListContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 8, // Espacement entre éléments (horizontal et vertical)
  },
  categoryItemHorizontal: {
    width: (SCREEN_WIDTH - 16 - 8) / 2, // 2 colonnes: largeur = (écran - padding*2 - gap) / 2
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoryLogoContainer: {
    width: 40, // Réduit de 50 à 40
    height: 40,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10, // Réduit de 12 à 10
    overflow: 'hidden',
  },
  categoryLogoSquare: {
    width: 40,
    height: 40,
  },
  categoryNameHorizontal: {
    flex: 1,
    color: 'white',
    fontSize: 13, // Réduit de 14 à 13
    fontWeight: '500',
  },
  categoryCountHorizontal: {
    color: '#999',
    fontSize: 12, // Réduit de 13 à 12
    fontWeight: '600',
    marginLeft: 6,
  },

  // Channels Grid (2 colonnes horizontales avec FlatList)
  channelsGridContainer: {
    padding: 8,
  },
  channelCardHorizontal: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    margin: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  channelLogoContainerSmall: {
    width: 50,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  channelLogoImageSmall: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  channelNameHorizontal: {
    flex: 1,
    color: 'white',
    fontSize: 14, // Augmenté pour lisibilité
    fontWeight: '500',
    lineHeight: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default MultiScreenView;
