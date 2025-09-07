/**
 * 🔐 Xtream Codes Connection Modal - Interface IPTV Smarters Pro
 * Formulaire de connexion Xtream Codes avec URL, username et password
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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
// import { BlurView } from '@react-native-community/blur';

const {width, height} = Dimensions.get('window');

interface XtreamCodeModalProps {
  visible: boolean;
  onClose: () => void;
  onConnect: (credentials: XtreamCredentials) => void;
}

interface XtreamCredentials {
  url: string;
  username: string;
  password: string;
}

const XtreamCodeModal: React.FC<XtreamCodeModalProps> = ({
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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  const handleConnect = async () => {
    // Validation des champs
    if (!url.trim()) {
      Alert.alert('Erreur', "Veuillez saisir l'URL du serveur");
      return;
    }
    if (!username.trim()) {
      Alert.alert('Erreur', "Veuillez saisir votre nom d'utilisateur");
      return;
    }
    if (!password.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir votre mot de passe');
      return;
    }

    setIsConnecting(true);

    try {
      const credentials: XtreamCredentials = {
        url: url.trim(),
        username: username.trim(),
        password: password.trim(),
      };

      await onConnect(credentials);
    } catch (error) {
      console.error('Erreur connexion Xtream:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setUrl('');
    setUsername('');
    setPassword('');
    setShowPassword(false);
    setIsConnecting(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}>
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.8)" />

      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Animated.View
          style={[
            styles.overlay,
            {
              opacity: fadeAnim,
            },
          ]}>
          {/* Fond moderne granulé comme ConnectionModal */}
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
                      'rgba(33, 150, 243, 0.8)',
                      'rgba(33, 150, 243, 0.4)',
                    ]}
                    style={styles.iconContainer}>
                    <Icon name="person-outline" size={24} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={styles.title}>Connexion Xtream Codes</Text>
                </View>
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.closeButton}>
                  <Icon name="close" size={28} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Form */}
              <View style={styles.formContainer}>
                {/* URL du serveur - Full width */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>URL du serveur</Text>
                  <View style={styles.inputContainer}>
                    <Icon
                      name="language"
                      size={20}
                      color="rgba(255,255,255,0.6)"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.textInput}
                      value={url}
                      onChangeText={setUrl}
                      placeholder="http://exemple.com:8080"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="url"
                    />
                  </View>
                </View>

                {/* Username et Password côte à côte */}
                <View style={styles.horizontalGroup}>
                  <View style={[styles.inputGroup, styles.halfWidth]}>
                    <Text style={styles.label}>Nom d'utilisateur</Text>
                    <View style={styles.inputContainer}>
                      <Icon
                        name="person"
                        size={20}
                        color="rgba(255,255,255,0.6)"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.textInput}
                        value={username}
                        onChangeText={setUsername}
                        placeholder="Username"
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                  </View>

                  <View style={[styles.inputGroup, styles.halfWidth]}>
                    <Text style={styles.label}>Mot de passe</Text>
                    <View style={styles.inputContainer}>
                      <Icon
                        name="lock"
                        size={20}
                        color="rgba(255,255,255,0.6)"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.textInput}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Password"
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeButton}>
                        <Icon
                          name={showPassword ? 'visibility-off' : 'visibility'}
                          size={20}
                          color="rgba(255,255,255,0.6)"
                        />
                      </TouchableOpacity>
                    </View>
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
                        ? ['rgba(33, 150, 243, 0.5)', 'rgba(33, 150, 243, 0.3)']
                        : ['rgba(33, 150, 243, 0.8)', 'rgba(33, 150, 243, 0.6)']
                    }
                    style={styles.connectButtonGradient}>
                    {isConnecting ? (
                      <View style={styles.loadingContainer}>
                        <Text style={styles.connectButtonText}>
                          Connexion...
                        </Text>
                      </View>
                    ) : (
                      <>
                        <Icon name="login" size={20} color="#FFFFFF" />
                        <Text style={styles.connectButtonText}>
                          Se connecter
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
    width: width * 0.8,
    maxWidth: 650,
    backgroundColor: 'rgba(20, 20, 20, 0.95)',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 20},
    shadowOpacity: 0.3,
    shadowRadius: 25,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
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
  formContainer: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  horizontalGroup: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  halfWidth: {
    flex: 1,
    marginBottom: 0,
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
  eyeButton: {
    padding: 4,
    marginLeft: 8,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.2)',
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

export default XtreamCodeModal;
