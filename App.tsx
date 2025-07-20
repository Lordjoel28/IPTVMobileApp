import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import Video from 'react-native-video';

function App(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>📺 Test Lecteur IPTV</Text>
      <Text style={styles.subtitle}>Version 0.2 - Avec Vidéo</Text>
      
      {/* Lecteur vidéo de test */}
      <Video
        source={{ uri: 'https://static.france24.com/live/F24_FR_LO_HLS/live_web.m3u8' }}
        style={styles.videoPlayer}
        controls={true}
        resizeMode="contain"
        onError={(error) => {
          console.log('Video error:', error);
        }}
        onLoad={() => {
          console.log('Video loaded successfully');
        }}
      />
      
      <Text style={styles.status}>✅ Lecteur vidéo intégré!</Text>
      <Text style={styles.info}>🔴 France 24 en direct</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E88E5',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 30,
  },
  videoPlayer: {
    width: 320,
    height: 180,
    backgroundColor: '#000',
    marginBottom: 30,
  },
  status: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  info: {
    fontSize: 14,
    color: '#999',
  },
});

export default App;