/**
 * 🔐 Modal de Connexion - Version Simple et Fonctionnelle
 * Interface basique avec cartes cliquables garanties
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Modal,
  StatusBar,
  Dimensions,
  Image,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useI18n} from '../hooks/useI18n';

const {width, height} = Dimensions.get('window');

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
  const {t: tCommon} = useI18n('common');
  const {t: tPlaylists} = useI18n('playlists');
  const {t: tProfiles} = useI18n('profiles');
  // Animations - hooks toujours au début
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.9));

  // Animations des cartes - créées une seule fois
  const [cardAnimations] = useState(() => [
    {
      scale: new Animated.Value(0.9),
      opacity: new Animated.Value(0),
    },
    {
      scale: new Animated.Value(0.9),
      opacity: new Animated.Value(0),
    },
    {
      scale: new Animated.Value(0.9),
      opacity: new Animated.Value(0),
    },
  ]);

  React.useEffect(() => {
    if (visible) {
      // Animation d'entrée ultra-rapide pour masquer immédiatement l'arrière-plan
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 120,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Animation des cartes en staggeré
      cardAnimations.forEach((cardAnim, index) => {
        Animated.sequence([
          Animated.delay(100 + index * 150),
          Animated.parallel([
            Animated.spring(cardAnim.scale, {
              toValue: 1,
              tension: 120,
              friction: 7,
              useNativeDriver: true,
            }),
            Animated.timing(cardAnim.opacity, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      });
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
        // Reset des animations des cartes
        ...cardAnimations.map(cardAnim =>
          Animated.parallel([
            Animated.timing(cardAnim.scale, {
              toValue: 0.9,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(cardAnim.opacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]),
        ),
      ]).start();
    }
  }, [visible]);

  // Si la modale n'est pas visible, ne rien rendre après tous les hooks
  if (!visible) {
    return null;
  }

  const connectionOptions = [
    {
      id: 'xtream',
      title: tPlaylists('xtreamCodes'),
      icon: iconMap.xtream,
      onPress: onXtreamConnect,
    },
    {
      id: 'm3u',
      title: tPlaylists('urlM3U'),
      icon: iconMap.m3u,
      onPress: onM3UConnect,
    },
    {
      id: 'users',
      title: tProfiles('profiles'),
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
      onRequestClose={onClose}>
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.9)" />

      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          },
        ]}
        pointerEvents="box-none">
        {/* Fond granulé premium - Plus opaque */}
        <LinearGradient
          colors={['#050505', '#0a0a0a', '#0f0f0f', '#080808']}
          locations={[0, 0.3, 0.7, 1]}
          style={StyleSheet.absoluteFill}
        />

        <Animated.View
          style={[
            styles.container,
            {
              transform: [{scale: scaleAnim}],
              opacity: fadeAnim,
            },
          ]}
          pointerEvents="box-none">
          {/* Bouton fermer */}
          <Pressable
            onPress={onClose}
            style={({pressed}) => [
              styles.closeButton,
              pressed && {transform: [{scale: 0.9}]},
            ]}>
            <View style={styles.closeButtonContent}>
              <Icon name="close" size={28} color="#FFFFFF" />
            </View>
          </Pressable>

          {/* Titre */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{tCommon('connection')}</Text>
          </View>

          {/* Cartes */}
          <View style={styles.cardsContainer} pointerEvents="box-none">
            {connectionOptions.map((option, index) => {
              const cardAnim = cardAnimations[index];

              return (
                <Animated.View
                  key={option.id}
                  style={[
                    styles.cardWrapper,
                    {
                      transform: [{scale: cardAnim.scale}],
                      opacity: cardAnim.opacity,
                    },
                  ]}>
                  <Pressable
                    onPress={option.onPress}
                    style={({pressed}) => [
                      styles.card,
                      pressed && {transform: [{scale: 0.96}]},
                    ]}>
                    {/* Fond carte */}
                    <LinearGradient
                      colors={[
                        'rgba(255, 255, 255, 0.18)',
                        'rgba(255, 255, 255, 0.08)',
                        'rgba(255, 255, 255, 0.03)',
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
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>

          {/* Texte de guidage */}
          <View style={styles.guidanceContainer}>
            <Text style={styles.guidanceText}>
              {tPlaylists('chooseConnectionMode')}
            </Text>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 20,
  },
  container: {
    width: width * 0.94,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 60,
    paddingTop: 140,
    paddingBottom: 40,
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
    textShadowOffset: {width: 0, height: 3},
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
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(15, 15, 15, 0.9)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    elevation: 15,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 15},
    shadowOpacity: 0.4,
    shadowRadius: 25,
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
    width: 90,
    height: 90,
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
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 4,
    paddingHorizontal: 12,
    marginTop: 8,
    maxWidth: '100%',
  },
  guidanceContainer: {
    marginTop: 35,
    marginBottom: 20,
    alignItems: 'center',
    paddingHorizontal: 20,
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
