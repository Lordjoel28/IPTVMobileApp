/**
 * 📁 M3U URL Connection Modal - Interface IPTV Smarters Pro
 * Modal complètement recréée avec design propre et optimisé
 */

import React, {useState} from 'react';
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
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DocumentPicker from 'react-native-document-picker';

const {width, height} = Dimensions.get('window');

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
  // State hooks - toujours en premier
  const [connectionMode, setConnectionMode] = useState<'url' | 'file'>('url');
  const [url, setUrl] = useState('');
  const [playlistName, setPlaylistName] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Animation hooks
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.9));
  const [toggleAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 120,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Réinitialiser les champs quand le modal se ferme
      setUrl('');
      setPlaylistName('');
      setSelectedFile(null);
      setConnectionMode('url');
      setIsConnecting(false);
      toggleAnim.setValue(0);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleToggleMode = (mode: 'url' | 'file') => {
    setConnectionMode(mode);
    Animated.spring(toggleAnim, {
      toValue: mode === 'url' ? 0 : 1,
      tension: 100,
      friction: 6,
      useNativeDriver: true,
    }).start();
  };

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
      }
    }
  };

  const handleConnect = async () => {
    // Validation
    if (connectionMode === 'url' && !url.trim()) {
      Alert.alert('Erreur', "Veuillez saisir l'URL de la playlist M3U");
      return;
    }
    if (connectionMode === 'file' && !selectedFile) {
      Alert.alert('Erreur', 'Veuillez sélectionner un fichier M3U');
      return;
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
    setUrl('');
    setPlaylistName('');
    setSelectedFile(null);
    setConnectionMode('url');
    setIsConnecting(false);
    toggleAnim.setValue(0);
    onClose();
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}>
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.9)" />

      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Animated.View style={[styles.overlay, {opacity: fadeAnim}]}>
          <LinearGradient
            colors={['#0a0a0a', '#121212', '#181818', '#0e0e0e']}
            locations={[0, 0.3, 0.7, 1]}
            style={StyleSheet.absoluteFill}
          />

          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled">
            <Animated.View
              style={[
                styles.container,
                {
                  transform: [{scale: scaleAnim}],
                  opacity: fadeAnim,
                },
              ]}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.titleContainer}>
                  <LinearGradient
                    colors={[
                      'rgba(76, 175, 80, 0.8)',
                      'rgba(76, 175, 80, 0.4)',
                    ]}
                    style={styles.iconContainer}>
                    <Icon name="folder-open" size={24} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={styles.title}>Connexion M3U</Text>
                </View>
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.closeButton}>
                  <Icon name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Toggle Switch - Mode de connexion */}
              <View style={styles.toggleContainer}>
                <View style={styles.toggleBackground}>
                  <Animated.View
                    style={[
                      styles.toggleSlider,
                      {
                        transform: [
                          {
                            translateX: toggleAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [2, (width * 0.94 - 32) / 2 - 2],
                            }),
                          },
                        ],
                      },
                    ]}
                  />

                  <TouchableOpacity
                    style={styles.toggleOption}
                    onPress={() => handleToggleMode('url')}
                    activeOpacity={0.8}>
                    <Icon
                      name="language"
                      size={16}
                      color={
                        connectionMode === 'url'
                          ? '#FFFFFF'
                          : 'rgba(255,255,255,0.5)'
                      }
                    />
                    <Text
                      style={[
                        styles.toggleText,
                        connectionMode === 'url' && styles.toggleTextActive,
                      ]}>
                      URL M3U
                    </Text>
                  </TouchableOpacity>

              <TouchableOpacity
                    style={styles.toggleOption}
                    onPress={() => handleToggleMode('file')}
                    activeOpacity={0.8}>
                    <Icon
                      name="insert-drive-file"
                      size={16}
                      color={
                        connectionMode === 'file'
                          ? '#FFFFFF'
                          : 'rgba(255,255,255,0.5)'
                      }
                    />
                    <Text
                      style={[
                        styles.toggleText,
                        connectionMode === 'file' && styles.toggleTextActive,
                      ]}>
                      Fichier local
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Form Content */}
              <View style={styles.formContainer}>
                {connectionMode === 'url' ? (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>URL de la playlist M3U</Text>
                    <View style={styles.inputContainer}>
                      <Icon
                        name="link"
                        size={18}
                        color="rgba(255,255,255,0.6)"
                        style={styles.inputIcon}
                      />
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
                      onPress={handleFileSelect}>
                      <Icon
                        name="attach-file"
                        size={18}
                        color="rgba(255,255,255,0.6)"
                        style={styles.inputIcon}
                      />
                      <Text
                        style={[
                          styles.fileText,
                          !selectedFile && styles.fileTextPlaceholder,
                        ]}>
                        {selectedFile
                          ? 'Fichier sélectionné'
                          : 'Sélectionner un fichier M3U'}
                      </Text>
                      <Icon
                        name="folder"
                        size={18}
                        color="rgba(76, 175, 80, 0.8)"
                      />
                    </TouchableOpacity>
                    {selectedFile && (
                      <Text style={styles.selectedFileName}>
                        📁 {selectedFile.split('/').pop()}
                      </Text>
                    )}
                  </View>
                )}

                {/* Nom de playlist - toujours présent */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Nom de la playlist</Text>
                  <View style={styles.inputContainer}>
                    <Icon
                      name="playlist-play"
                      size={18}
                      color="rgba(255,255,255,0.6)"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.textInput}
                      value={playlistName}
                      onChangeText={setPlaylistName}
                      placeholder="Ma playlist IPTV"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      autoCapitalize="words"
                      autoCorrect={false}
                    />
                  </View>
                </View>
              </View>

              {/* Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleClose}
                  disabled={isConnecting}>
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>

            <TouchableOpacity
                  style={[
                    styles.connectButton,
                    isConnecting && styles.connectButtonDisabled,
                  ]}
                  onPress={handleConnect}
                  disabled={isConnecting}>
                  <LinearGradient
                    colors={
                      isConnecting
                        ? ['rgba(76, 175, 80, 0.5)', 'rgba(76, 175, 80, 0.3)']
                        : ['rgba(76, 175, 80, 0.8)', 'rgba(76, 175, 80, 0.6)']
                    }
                    style={styles.connectButtonGradient}>
                    {isConnecting ? (
                      <Text style={styles.connectButtonText}>Connexion...</Text>
                    ) : (
                      <>
                        <Icon name="play-arrow" size={18} color="#FFFFFF" />
                        <Text style={styles.connectButtonText}>
                          Charger playlist
                        </Text>
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
    width: width * 0.94,
    backgroundColor: 'rgba(18, 18, 18, 0.98)',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 20},
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 25,
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
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  closeButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  toggleContainer: {
    marginBottom: 20,
  },
  toggleBackground: {
    position: 'relative',
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  toggleSlider: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: '48%',
    height: 44,
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    borderRadius: 12,
    shadowColor: '#4CAF50',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    zIndex: 2,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.2,
  },
  toggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  formContainer: {
    gap: 16,
    marginBottom: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0.2,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
    height: 46,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '400',
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 14,
    height: 46,
  },
  fileText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '400',
  },
  fileTextPlaceholder: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  selectedFileName: {
    fontSize: 11,
    color: 'rgba(76, 175, 80, 0.8)',
    marginTop: 4,
    marginLeft: 4,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  cancelButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  connectButton: {
    flex: 2,
    height: 46,
    borderRadius: 12,
    overflow: 'hidden',
  },
  connectButtonDisabled: {
    opacity: 0.6,
  },
  connectButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  connectButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});

export default M3UUrlModal;
