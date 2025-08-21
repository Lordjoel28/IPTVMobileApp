import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { usePlaylist } from '../context/PlaylistContext';
import { Channel } from '../types';

const ChannelCard: React.FC<{ item: Channel }> = ({ item }) => {
  const logoUrl = item.logoUrl || item.streamIcon || '';
  const [showFallback, setShowFallback] = useState(false);
  
  return (
    <TouchableOpacity style={styles.card}>
      {logoUrl && !showFallback ? (
        <Image 
          source={{ uri: logoUrl }} 
          style={styles.logo} 
          resizeMode="contain"
          onError={() => {
            console.log('❌ Logo échoué pour', item.name + ':', logoUrl);
            setShowFallback(true);
          }}
          onLoad={() => console.log('✅ Logo chargé pour', item.name)}
        />
      ) : (
        <View style={[styles.logo, styles.logoFallback]}>
          <Text style={styles.logoText}>📺</Text>
        </View>
      )}
      <Text style={styles.channelName} numberOfLines={1}>{item.name}</Text>
    </TouchableOpacity>
  );
};

const ChannelGrid: React.FC = () => {
  const { channels } = usePlaylist();
  
  console.log('🔍 CHANNEL GRID - Rendu avec chaînes:', channels.length);
  console.log('🔍 CHANNEL GRID - Détail 3 premières:', channels.slice(0, 3));
  
  if (!channels || channels.length === 0) {
    console.log('❌ CHANNEL GRID - AUCUNE CHAÎNE À AFFICHER !');
    return (
      <View style={{ padding: 20 }}>
        <Text style={{ color: 'white' }}>❌ Aucune chaîne trouvée</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={channels}
      numColumns={3}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ChannelCard item={item} />}
      contentContainerStyle={styles.grid}
    />
  );
};

const styles = StyleSheet.create({
  grid: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  card: {
    flex: 1,
    margin: 6,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    height: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logo: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  channelName: {
    color: '#FFFFFF',
    marginTop: 8,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    numberOfLines: 2,
  },
  logoFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  logoText: {
    fontSize: 32,
    color: '#FFFFFF',
  },
});

export default ChannelGrid;
