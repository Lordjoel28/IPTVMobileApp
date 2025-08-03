/**
 * 📁 M3U URL Connection Modal - Interface IPTV Smarters Pro
 * Formulaire de connexion avec URL M3U ou fichier local
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Animated,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
// import { BlurView } from '@react-native-community/blur';
import DocumentPicker from 'react-native-document-picker';

const { width, height } = Dimensions.get('window');

interface M3UUrlModalProps {
  visible: boolean;
  onClose: () => void;
  onConnect: (source: M3USource) => void;
}

interface M3USource {
  type: 'url' | 'file';
  source: string;
  name?: string;
}

const M3UUrlModal: React.FC<M3UUrlModalProps> = ({
  visible,
  onClose,
  onConnect,
}) => {
  // Si la modale n'est pas visible, ne rien rendre du tout
  if (!visible) {
    return null;
  }

  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  
  // Form state
  const [url, setUrl] = useState('');
  const [playlistName, setPlaylistName] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [connectionMode, setConnectionMode] = useState<'url' | 'file'>('url');
  const [isConnecting, setIsConnecting] = useState(false);

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleFileSelect = async () => {
    try {
      const result = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.allFiles],
        copyTo: 'cachesDirectory',
      });
      
      if (result.uri) {
        setSelectedFile(result.uri);
        if (!playlistName && result.name) {
          setPlaylistName(result.name.replace(/\.[^/.]+$/, ''));
        }
      }
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        Alert.alert('Erreur', 'Impossible de sélectionner le fichier');
        console.error('Erreur sélection fichier:', err);
      }
    }
  };

  const handleConnect = async () => {
    // Validation des champs
    if (connectionMode === 'url') {
      if (!url.trim()) {
        Alert.alert('Erreur', 'Veuillez saisir l\'URL de la playlist M3U');
        return;
      }
      if (!/^https?:\/\/.+/i.test(url.trim())) {
        Alert.alert('Erreur', 'L\'URL doit commencer par http:// ou https://');
        return;
      }
    } else {
      if (!selectedFile) {
        Alert.alert('Erreur', 'Veuillez sélectionner un fichier M3U');
        return;
      }
    }

    if (!playlistName.trim()) {
      Alert.alert('Erreur', 'Veuillez donner un nom à votre playlist');
      return;
    }

    setIsConnecting(true);
    
    try {
      const source: M3USource = {
        type: connectionMode,
        source: connectionMode === 'url' ? url.trim() : selectedFile!,
        name: playlistName.trim(),
      };
      
      await onConnect(source);
    } catch (error) {
      console.error('Erreur connexion M3U:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setUrl('');
    setPlaylistName('');
    setSelectedFile(null);
    setConnectionMode('url');
    setIsConnecting(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.8)" />
      
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View
          style={[
            styles.overlay,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          {/* Fond moderne granulé comme ConnectionModal */}
          <LinearGradient
            colors={['#0a0a0a', '#121212', '#181818', '#0e0e0e']}
            locations={[0, 0.3, 0.7, 1]}
            style={StyleSheet.absoluteFill}
          />
          
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View
              style={[
                styles.container,
                {
                  transform: [{ scale: scaleAnim }],
                  opacity: fadeAnim,
                },
              ]}
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.titleContainer}>
                  <LinearGradient
                    colors={['rgba(76, 175, 80, 0.8)', 'rgba(76, 175, 80, 0.4)']}
                    style={styles.iconContainer}
                  >
                    <Icon name="folder-open" size={24} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={styles.title}>Connexion M3U</Text>
                </View>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <Icon name="close" size={28} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Layout horizontal pour mode et source */}
              <View style={styles.horizontalLayout}>
                {/* Mode Selection */}
                <View style={styles.modeContainer}>
                  <Text style={styles.sectionTitle}>Mode de connexion</Text>
                  <View style={styles.modeButtons}>
                    <TouchableOpacity
                      style={[
                        styles.modeButton,
                        connectionMode === 'url' && styles.modeButtonActive
                      ]}
                      onPress={() => setConnectionMode('url')}
                    >
                      <Icon 
                        name="language" 
                        size={18} 
                        color={connectionMode === 'url' ? '#FFFFFF' : 'rgba(255,255,255,0.6)'} 
                      />
                      <Text style={[
                        styles.modeButtonText,
                        connectionMode === 'url' && styles.modeButtonTextActive
                      ]}>
                        URL M3U
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.modeButton,
                        connectionMode === 'file' && styles.modeButtonActive
                      ]}
                      onPress={() => setConnectionMode('file')}
                    >
                      <Icon 
                        name="insert-drive-file" 
                        size={18} 
                        color={connectionMode === 'file' ? '#FFFFFF' : 'rgba(255,255,255,0.6)'} 
                      />
                      <Text style={[
                        styles.modeButtonText,
                        connectionMode === 'file' && styles.modeButtonTextActive
                      ]}>
                        Fichier local
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Nom de la playlist à droite */}
                <View style={styles.playlistNameContainer}>
                  <Text style={styles.label}>Nom de la playlist</Text>
                  <View style={styles.inputContainer}>
                    <Icon name="tv" size={20} color="rgba(255,255,255,0.6)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      value={playlistName}
                      onChangeText={setPlaylistName}
                      placeholder="Ma playlist IPTV"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      autoCorrect={false}
                    />
                  </View>
                </View>
              </View>

              {/* Form - Source selon le mode (full width) */}
              <View style={styles.formContainer}>
                {connectionMode === 'url' ? (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>URL de la playlist M3U</Text>
                    <View style={styles.inputContainer}>
                      <Icon name="link" size={20} color="rgba(255,255,255,0.6)" style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        value={url}
                        onChangeText={setUrl}
                        placeholder="https://exemple.com/playlist.m3u"
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="url"
                      />
                    </View>
                  </View>
                ) : (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Fichier M3U local</Text>
                    <TouchableOpacity 
                      style={styles.fileContainer}
                      onPress={handleFileSelect}
                    >
                      <Icon name="attach-file" size={20} color="rgba(255,255,255,0.6)" style={styles.inputIcon} />
                      <Text style={[
                        styles.fileText,
                        !selectedFile && styles.fileTextPlaceholder
                      ]}>
                        {selectedFile ? 'Fichier sélectionné' : 'Sélectionner un fichier M3U'}
                      </Text>
                      <Icon name="folder" size={20} color="rgba(76, 175, 80, 0.8)" />
                    </TouchableOpacity>
                    {selectedFile && (
                      <Text style={styles.selectedFileName}>
                        📁 {selectedFile.split('/').pop()}
                      </Text>
                    )}
                  </View>
                )}

              </View>

              {/* Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleClose}
                  disabled={isConnecting}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.connectButton, isConnecting && styles.connectButtonDisabled]}
                  onPress={handleConnect}
                  disabled={isConnecting}
                >
                  <LinearGradient
                    colors={
                      isConnecting 
                        ? ['rgba(76, 175, 80, 0.5)', 'rgba(76, 175, 80, 0.3)']
                        : ['rgba(76, 175, 80, 0.8)', 'rgba(76, 175, 80, 0.6)']
                    }
                    style={styles.connectButtonGradient}
                  >
                    {isConnecting ? (
                      <View style={styles.loadingContainer}>
                        <Text style={styles.connectButtonText}>Connexion...</Text>
                      </View>
                    ) : (
                      <>
                        <Icon name="play-arrow" size={20} color="#FFFFFF" />
                        <Text style={styles.connectButtonText}>Charger playlist</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 40,
  },
  container: {
    width: width * 0.8,
    maxWidth: 650,
    backgroundColor: 'rgba(20, 20, 20, 0.95)',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 25,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  horizontalLayout: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  modeContainer: {
    flex: 1,
  },
  playlistNameContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  modeButtons: {
    flexDirection: 'column',
    gap: 8,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
  },
  modeButtonActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderColor: 'rgba(76, 175, 80, 0.5)',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  modeButtonTextActive: {
    color: '#FFFFFF',
  },
  formContainer: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 16,
    minHeight: 48,
    paddingVertical: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 8,
    textAlignVertical: 'center',
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    height: 50,
  },
  fileText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  fileTextPlaceholder: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  selectedFileName: {
    fontSize: 12,
    color: 'rgba(76, 175, 80, 0.8)',
    marginTop: 4,
    fontWeight: '500',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
    marginBottom: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 8,
    lineHeight: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  connectButton: {
    flex: 2,
    height: 50,
    borderRadius: 12,
    overflow: 'hidden',
  },
  connectButtonDisabled: {
    opacity: 0.7,
  },
  connectButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  connectButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default M3UUrlModal;