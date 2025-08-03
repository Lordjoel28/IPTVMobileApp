/**
 * 🔐 Modal de Connexion - Version Simple et Fonctionnelle
 * Interface basique avec cartes cliquables garanties
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  StatusBar,
  Dimensions,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

// Icônes PNG spécifiques pour les cartes de connexion
const iconMap = {
  xtream: require('../../assets/icons/icon_xtream.png'),
  m3u: require('../../assets/icons/icon_m3u.png'),
  users: require('../../assets/icons/icon_users.png'),
};

interface ConnectionModalProps {
  visible: boolean;
  onClose: () => void;
  onXtreamConnect: () => void;
  onM3UConnect: () => void;
  onUsersList: () => void;
}

const ConnectionModal: React.FC<ConnectionModalProps> = ({
  visible,
  onClose,
  onXtreamConnect,
  onM3UConnect,
  onUsersList,
}) => {
  // Si la modale n'est pas visible, ne rien rendre du tout
  if (!visible) {
    return null;
  }

  const connectionOptions = [
    {
      id: 'xtream',
      title: 'Xtream Codes',
      icon: iconMap.xtream,
      onPress: onXtreamConnect,
    },
    {
      id: 'm3u',
      title: 'URL M3U',
      icon: iconMap.m3u,
      onPress: onM3UConnect,
    },
    {
      id: 'users',
      title: 'Profils',
      icon: iconMap.users,
      onPress: onUsersList,
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.9)" />
      
      <View style={styles.overlay} pointerEvents="box-none">
        {/* Fond granulé premium */}
        <LinearGradient
          colors={['#0a0a0a', '#121212', '#181818', '#0e0e0e']}
          locations={[0, 0.3, 0.7, 1]}
          style={StyleSheet.absoluteFill}
        />
        
        <View style={styles.container} pointerEvents="box-none">
          {/* Bouton fermer */}
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <View style={styles.closeButtonContent}>
              <Icon name="close" size={28} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* Titre */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Connexion</Text>
          </View>

          {/* Cartes */}
          <View style={styles.cardsContainer} pointerEvents="box-none">
            {connectionOptions.map((option) => (
              <View key={option.id} style={styles.cardWrapper}>
                <TouchableOpacity
                  onPress={option.onPress}
                  style={styles.card}
                  activeOpacity={0.8}
                >
                  {/* Fond carte */}
                  <LinearGradient
                    colors={[
                      'rgba(255, 255, 255, 0.15)',
                      'rgba(255, 255, 255, 0.05)',
                      'rgba(255, 255, 255, 0.02)'
                    ]}
                    locations={[0, 0.5, 1]}
                    style={styles.cardGradient}
                  />
                  
                  {/* Icône PNG */}
                  <View style={styles.iconContainer}>
                    <Image source={option.icon} style={styles.iconImage} />
                  </View>
                  
                  {/* Texte */}
                  <Text style={styles.cardText}>{option.title}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Texte de guidage */}
          <View style={styles.guidanceContainer}>
            <Text style={styles.guidanceText}>Choisissez votre mode de connexion</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 60,
    paddingTop: 80,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 50,
    zIndex: 10,
  },
  closeButtonContent: {
    width: 50,
    height: 50,
    borderRadius: 20,
    backgroundColor: 'rgba(20, 20, 20, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  titleContainer: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 3,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  cardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 40,
    marginTop: 80,
  },
  cardWrapper: {
    flex: 1,
    marginHorizontal: 15,
  },
  card: {
    width: '100%',
    height: height * 0.46,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(20, 20, 20, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  cardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconImage: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  icon: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  cardText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 18,
    letterSpacing: 0.8,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    paddingHorizontal: 12,
    marginTop: 8,
    maxWidth: '100%',
  },
  guidanceContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  guidanceText: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});

export default ConnectionModal;