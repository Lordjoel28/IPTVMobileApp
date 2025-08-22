/**
 * 📺 ChannelPlayerScreen - Interface IPTV Smarters Pro authentique
 * Layout 3 zones: Liste chaînes (gauche) + Mini lecteur (droite haut) + EPG future (droite bas)
 */

import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import VideoPlayer from '../components/VideoPlayer';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList, Channel, Category } from '../types';

const { width, height } = Dimensions.get('window');

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

const ChannelPlayerScreen: React.FC<ChannelPlayerScreenProps> = ({ route }) => {
  const navigation = useNavigation<NavigationProp>();
  const {
    playlistId,
    allCategories,
    initialCategory,
    initialChannels,
    selectedChannel: initialChannel,
    playlistName
  } = route.params;

  // Log pour déboguer la réception des données
  console.log('🎬 DONNÉES REÇUES IPTV Smarters Pro:', {
    playlistId: playlistId,
    categoriesCount: allCategories?.length,
    initialCategoryName: initialCategory?.name,
    initialChannelsCount: initialChannels?.length,
    selectedChannelName: initialChannel?.name,
    playlistName: playlistName
  });

  // États locaux pour rendre le composant autonome (selon spec Gemini)
  const [categories, setCategories] = useState<Category[]>(allCategories);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(() =>
    allCategories.findIndex(cat => cat.id === initialCategory.id)
  );
  const [channels, setChannels] = useState<Channel[]>(initialChannels);
  const [selectedChannel, setSelectedChannel] = useState<Channel>(initialChannel);
  const [showFullscreenPlayer, setShowFullscreenPlayer] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  // Dimensions pour le layout 3 zones
  const leftPanelWidth = width * 0.45; // 45% pour la liste chaînes
  const rightPanelWidth = width * 0.55; // 55% pour lecteur + EPG
  const miniPlayerHeight = height * 0.45; // 45% de la hauteur pour le mini lecteur

  // ===== LOGIQUE DE NAVIGATION ENTRE CATÉGORIES (Spec Gemini) =====
  const handleNextCategory = () => {
    const nextIndex = currentCategoryIndex + 1;
    if (nextIndex < categories.length) {
      console.log(`🎬 Navigation vers catégorie suivante: ${categories[nextIndex].name}`);
      setCurrentCategoryIndex(nextIndex);
    }
  };

  const handlePreviousCategory = () => {
    const prevIndex = currentCategoryIndex - 1;
    if (prevIndex >= 0) {
      console.log(`🎬 Navigation vers catégorie précédente: ${categories[prevIndex].name}`);
      setCurrentCategoryIndex(prevIndex);
    }
  };

  // Ce useEffect réagit au changement de catégorie pour mettre à jour l'UI (Spec Gemini)
  useEffect(() => {
    if (categories.length === 0) return;

    const newCategory = categories[currentCategoryIndex];
    if (newCategory) {
      console.log(`🎬 Changement de catégorie vers : ${newCategory.name}`);

      // Mettre à jour la liste des chaînes affichées
      // NOTE : Si les chaînes ne sont pas dans newCategory.channels, il faudra les charger dynamiquement
      const newChannels = newCategory.channels || [];
      setChannels(newChannels);

      // Sélectionner la première chaîne de la nouvelle catégorie, si elle existe
      if (newChannels.length > 0) {
        setSelectedChannel(newChannels[0]);
        console.log(`🎬 Première chaîne sélectionnée: ${newChannels[0].name}`);
      } else {
        // Gérer le cas où la catégorie est vide
        console.log('⚠️ Catégorie vide, pas de chaîne à sélectionner');
      }
    }
  }, [currentCategoryIndex, categories]);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleChannelSelect = (channel: Channel) => {
    console.log('🎬 Sélection chaîne:', channel.name);
    setSelectedChannel(channel);
    setIsPlaying(true);
  };

  const handleMiniPlayerPress = () => {
    console.log('🎬 Ouverture fullscreen player');
    setShowFullscreenPlayer(true);
  };

  const handleCloseFullscreen = () => {
    console.log('❌ Fermeture fullscreen player');
    setShowFullscreenPlayer(false);
  };

  // Rendu d'une chaîne dans la liste de gauche
  const renderChannelItem = ({ item, index }: { item: Channel; index: number }) => {
    const isSelected = item.id === selectedChannel.id;

    return (
      <TouchableOpacity
        style={[
          styles.channelItem,
          isSelected && styles.channelItemSelected,
        ]}
        onPress={() => handleChannelSelect(item)}
        activeOpacity={0.8}
      >
        {/* Logo de la chaîne */}
        <View style={styles.channelLogo}>
          {item.logo ? (
            <Image
              source={{ uri: item.logo }}
              style={styles.channelLogoImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.channelLogoFallback}>
              <Text style={styles.channelLogoText}>
                {item.name.substring(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Informations chaîne */}
        <View style={styles.channelInfo}>
          <Text style={styles.channelName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.channelDetails}>
            {item.quality || 'Unknown'} • {item.group || 'General'}
          </Text>
        </View>

        {/* Indicateur de sélection */}
        {isSelected && (
          <View style={styles.playingIndicator}>
            <Icon name="play-arrow" size={16} color="#4CAF50" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" hidden={true} translucent={true} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>
          {playlistName}
        </Text>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Icon name="search" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Layout 3 zones principal */}
      <View style={styles.mainLayout}>
        {/* Zone Gauche: Interface IPTV Smarters Pro avec sélecteur de catégories */}
        <View style={[styles.leftPanel, { width: leftPanelWidth }]}>
          
          {/* Sélecteur de catégorie interactif (Spec Gemini) */}
          <View style={styles.categorySelector}>
            <TouchableOpacity onPress={handlePreviousCategory} style={styles.arrowButton}>
              <Icon name="keyboard-arrow-left" size={28} color="#FFF" />
            </TouchableOpacity>

            <Text style={styles.categoryTitle} numberOfLines={1}>
              {categories[currentCategoryIndex]?.name || 'Catégories'}
            </Text>

            <TouchableOpacity onPress={handleNextCategory} style={styles.arrowButton}>
              <Icon name="keyboard-arrow-right" size={28} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* En-tête avec compteur */}
          <View style={styles.channelListHeader}>
            <Text style={styles.channelListTitle}>Chaînes ({channels.length})</Text>
          </View>
          
          {/* La liste des chaînes utilise maintenant l'état local 'channels' */}
          <FlatList
            data={channels}
            renderItem={renderChannelItem}
            keyExtractor={(item, index) => `player-${item.id}-${index}`}
            showsVerticalScrollIndicator={false}
            style={styles.channelsList}
            contentContainerStyle={styles.channelsListContent}
            initialScrollIndex={channels.length > 0 ? Math.max(0, channels.findIndex(ch => ch.id === selectedChannel?.id)) : undefined}
            getItemLayout={(data, index) => ({
              length: 80,
              offset: 80 * index,
              index,
            })}
            onScrollToIndexFailed={() => {}}
          />
        </View>

        {/* Zone Droite: Mini lecteur + EPG future */}
        <View style={[styles.rightPanel, { width: rightPanelWidth }]}>
          {/* Mini lecteur vidéo (droite haut) */}
          <Pressable
            style={[styles.miniPlayerContainer, { height: miniPlayerHeight }]}
            onPress={handleMiniPlayerPress}
          >
            <VideoPlayer
              channel={selectedChannel}
              isVisible={true}
              onClose={() => {}}
              allowFullscreen={false}
              showControls={false}
              style={styles.miniPlayer}
            />
            
            {/* Overlay d'informations sur le mini lecteur */}
            <View style={styles.miniPlayerOverlay}>
              <View style={styles.miniPlayerInfo}>
                <Text style={styles.miniPlayerChannelName} numberOfLines={1}>
                  {selectedChannel.name}
                </Text>
                <Text style={styles.miniPlayerStatus}>
                  {isPlaying ? 'En lecture' : 'En pause'}
                </Text>
              </View>
              
              <TouchableOpacity style={styles.fullscreenButton}>
                <Icon name="fullscreen" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </Pressable>

          {/* Zone EPG future (droite bas) */}
          <View style={styles.epgContainer}>
            <View style={styles.epgHeader}>
              <Text style={styles.epgHeaderTitle}>Guide TV - {selectedChannel.name}</Text>
              <Icon name="schedule" size={20} color="#4CAF50" />
            </View>
            
            <View style={styles.epgContent}>
              {/* Programme actuellement en cours */}
              <View style={styles.epgProgramCurrent}>
                <View style={styles.epgTimeSlot}>
                  <Text style={styles.epgTime}>21:00</Text>
                  <View style={styles.epgLiveDot} />
                </View>
                <View style={styles.epgProgramInfo}>
                  <Text style={styles.epgProgramTitle}>Programme en cours</Text>
                  <Text style={styles.epgProgramDescription}>
                    Contenu en direct sur {selectedChannel.name}
                  </Text>
                </View>
              </View>

              {/* Programmes suivants */}
              <View style={styles.epgProgramNext}>
                <View style={styles.epgTimeSlot}>
                  <Text style={styles.epgTimeNext}>22:00</Text>
                </View>
                <View style={styles.epgProgramInfo}>
                  <Text style={styles.epgProgramTitleNext}>Programme suivant</Text>
                  <Text style={styles.epgProgramDescriptionNext}>
                    Prochaine émission programmée
                  </Text>
                </View>
              </View>

              <View style={styles.epgProgramNext}>
                <View style={styles.epgTimeSlot}>
                  <Text style={styles.epgTimeNext}>23:00</Text>
                </View>
                <View style={styles.epgProgramInfo}>
                  <Text style={styles.epgProgramTitleNext}>Film de soirée</Text>
                  <Text style={styles.epgProgramDescriptionNext}>
                    Long métrage en première diffusion
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Fullscreen Player Modal */}
      {showFullscreenPlayer && (
        <VideoPlayer
          channel={selectedChannel}
          isVisible={showFullscreenPlayer}
          onClose={handleCloseFullscreen}
          allowFullscreen={true}
          style={styles.fullscreenPlayer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
  },

  // Layout 3 zones
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
  },

  // Zone Gauche: Liste chaînes
  leftPanel: {
    backgroundColor: '#1A1A1A',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
  },
  channelListHeader: {
    padding: 16,
    backgroundColor: '#222222',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  channelListTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // ===== STYLES SÉLECTEUR DE CATÉGORIES (Spec Gemini) =====
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 16,
    backgroundColor: '#222222',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  arrowButton: {
    padding: 4,
  },
  categoryTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
    marginHorizontal: 8,
  },
  
  channelsList: {
    flex: 1,
  },
  channelsListContent: {
    paddingVertical: 8,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 80,
  },
  channelItemSelected: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  channelLogo: {
    width: 48,
    height: 48,
    marginRight: 12,
  },
  channelLogoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  channelLogoFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333333',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelLogoText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  channelInfo: {
    flex: 1,
    marginRight: 8,
  },
  channelName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  channelDetails: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  playingIndicator: {
    padding: 4,
  },

  // Zone Droite: Mini lecteur + EPG
  rightPanel: {
    flex: 1,
  },
  
  // Mini lecteur (droite haut)
  miniPlayerContainer: {
    position: 'relative',
    backgroundColor: '#000000',
  },
  miniPlayer: {
    width: '100%',
    height: '100%',
  },
  miniPlayerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  miniPlayerInfo: {
    flex: 1,
  },
  miniPlayerChannelName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  miniPlayerStatus: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  fullscreenButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
  },

  // Zone EPG future (droite bas)
  epgContainer: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  epgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#222222',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  epgHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  epgContent: {
    flex: 1,
    paddingVertical: 8,
  },
  epgProgramCurrent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  epgProgramNext: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  epgTimeSlot: {
    width: 50,
    alignItems: 'center',
    marginRight: 12,
  },
  epgTime: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  epgTimeNext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  epgLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginTop: 4,
  },
  epgProgramInfo: {
    flex: 1,
  },
  epgProgramTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  epgProgramTitleNext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  epgProgramDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    lineHeight: 16,
  },
  epgProgramDescriptionNext: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    lineHeight: 14,
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
});

export default ChannelPlayerScreen;