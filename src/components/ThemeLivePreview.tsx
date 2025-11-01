/**
 * 🔮 ThemeLivePreview - Aperçu temps réel des thèmes (Nouveau 2024)
 * Composant immersif pour prévisualiser l'app complète avec chaque thème
 */

import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Theme, useTheme, useThemeColors} from '../contexts/ThemeContext';

interface ThemeLivePreviewProps {
  visible: boolean;
  theme: Theme | null;
  onClose: () => void;
  onApplyTheme: (themeId: string) => void;
}

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

const ThemeLivePreview: React.FC<ThemeLivePreviewProps> = ({
  visible,
  theme,
  onClose,
  onApplyTheme,
}) => {
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [activeDemo, setActiveDemo] = useState(0);

  // Animations d'entrée/sortie
  useEffect(() => {
    if (visible && theme) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: screenHeight,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, theme]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleApplyTheme = () => {
    if (theme) {
      onApplyTheme(theme.id);
      handleClose();
    }
  };

  if (!theme) return null;

  // Composant Header démo
  const DemoHeader = () => (
    <View style={[styles.demoHeader, {backgroundColor: theme.colors.surface.primary}]}>
      <View style={styles.demoHeaderLeft}>
        <View style={styles.demoMenuIcon}>
          <Icon name="menu" size={20} color={theme.colors.text.primary} />
        </View>
        <Text style={[styles.demoHeaderTitle, {color: theme.colors.text.primary}]}>
          IPTV Mobile
        </Text>
      </View>
      <View style={styles.demoHeaderRight}>
        <Icon name="search" size={20} color={theme.colors.text.primary} />
        <Icon name="notifications" size={20} color={theme.colors.text.primary} />
      </View>
    </View>
  );

  // Composant Navigation démo
  const DemoNavigation = () => (
    <View style={[styles.demoNavigation, {backgroundColor: theme.colors.navigation.background}]}>
      {[
        {id: 0, icon: 'home', label: 'Accueil'},
        {id: 1, icon: 'list', label: 'Chaînes'},
        {id: 2, icon: 'star', label: 'Favoris'},
        {id: 3, icon: 'search', label: 'Recherche'},
        {id: 4, icon: 'settings', label: 'Paramètres'},
      ].map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[
            styles.navItem,
            activeDemo === item.id && {
              backgroundColor: theme.colors.navigation.activeTab + '20',
            }
          ]}
          onPress={() => setActiveDemo(item.id)}>
          <Icon
            name={item.icon}
            size={20}
            color={
              activeDemo === item.id
                ? theme.colors.navigation.activeTab
                : theme.colors.navigation.inactiveTab
            }
          />
          <Text
            style={[
              styles.navLabel,
              {
                color:
                  activeDemo === item.id
                    ? theme.colors.navigation.activeTab
                    : theme.colors.navigation.inactiveTab,
              },
            ]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Composant Chaîne démo
  const DemoChannel = ({name, category}: {name: string; category: string}) => (
    <View style={[styles.demoChannel, {backgroundColor: theme.colors.surface.secondary}]}>
      <View style={[styles.demoChannelLogo, {backgroundColor: theme.colors.ui.border}]} />
      <View style={styles.demoChannelInfo}>
        <Text style={[styles.demoChannelName, {color: theme.colors.text.primary}]}>
          {name}
        </Text>
        <Text style={[styles.demoChannelCategory, {color: theme.colors.text.secondary}]}>
          {category}
        </Text>
      </View>
      <View style={styles.demoChannelActions}>
        <Icon name="favorite-border" size={20} color={theme.colors.text.tertiary} />
        <Icon name="play-arrow" size={24} color={theme.colors.accent.primary} />
      </View>
    </View>
  );

  // Composant Lecteur démo
  const DemoPlayer = () => (
    <View style={[styles.demoPlayer, {backgroundColor: theme.colors.player.background}]}>
      <View style={styles.demoPlayerVideo}>
        <LinearGradient
          colors={theme.colors.background.gradient}
          style={styles.demoPlayerGradient}
        />
        <View style={styles.demoPlayerOverlay}>
          <Icon name="play-arrow" size={48} color={theme.colors.player.controls} />
        </View>
      </View>
      <View style={[styles.demoPlayerControls, {backgroundColor: theme.colors.player.background}]}>
        <View style={styles.demoPlayerTop}>
          <Text style={[styles.demoPlayerTitle, {color: theme.colors.player.controls}]}>
            Chaîne en cours - HD
          </Text>
          <Icon name="fullscreen" size={20} color={theme.colors.player.controls} />
        </View>
        <View style={styles.demoPlayerProgress}>
          <View style={[styles.demoPlayerBuffer, {backgroundColor: theme.colors.player.buffer}]} />
          <View style={[styles.demoProgressBar, {backgroundColor: theme.colors.player.progress}]} />
        </View>
        <View style={styles.demoPlayerBottom}>
          <Icon name="skip-previous" size={24} color={theme.colors.player.controls} />
          <Icon name="play-arrow" size={32} color={theme.colors.player.controls} />
          <Icon name="skip-next" size={24} color={theme.colors.player.controls} />
          <Icon name="volume-up" size={20} color={theme.colors.player.controls} />
        </View>
      </View>
    </View>
  );

  // Contenu démo selon l'onglet actif
  const renderDemoContent = () => {
    switch (activeDemo) {
      case 0: // Accueil
        return (
          <View style={styles.demoSection}>
            <Text style={[styles.demoSectionTitle, {color: theme.colors.text.primary}]}>
              Dernières chaînes regardées
            </Text>
            <DemoChannel name="TF1 HD" category="Généraliste" />
            <DemoChannel name="France 2 HD" category="Généraliste" />
            <DemoChannel name="Arte HD" category="Culture" />
          </View>
        );
      case 1: // Chaînes
        return (
          <View style={styles.demoSection}>
            <Text style={[styles.demoSectionTitle, {color: theme.colors.text.primary}]}>
              Toutes les chaînes
            </Text>
            <DemoChannel name="Canal+ HD" category="Cinéma" />
            <DemoChannel name="BeIN Sports 1" category="Sport" />
            <DemoChannel name="M6 HD" category="Généraliste" />
          </View>
        );
      case 2: // Favoris
        return (
          <View style={styles.demoSection}>
            <Text style={[styles.demoSectionTitle, {color: theme.colors.text.primary}]}>
              Chaînes favorites
            </Text>
            <DemoChannel name="Netflix" category="Streaming" />
            <DemoChannel name="YouTube TV" category="Streaming" />
          </View>
        );
      case 3: // Recherche
        return (
          <View style={styles.demoSection}>
            <View style={[styles.demoSearchBar, {backgroundColor: theme.colors.surface.primary}]}>
              <Icon name="search" size={20} color={theme.colors.text.secondary} />
              <Text style={[styles.demoSearchText, {color: theme.colors.text.secondary}]}>
                Rechercher une chaîne...
              </Text>
            </View>
            <Text style={[styles.demoSectionTitle, {color: theme.colors.text.primary}]}>
              Recherches populaires
            </Text>
            <View style={styles.demoTags}>
              {['Sport', 'Cinéma', 'Info', 'Musique'].map((tag) => (
                <View
                  key={tag}
                  style={[
                    styles.demoTag,
                    {backgroundColor: theme.colors.accent.primary + '20'},
                  ]}>
                  <Text style={[styles.demoTagText, {color: theme.colors.accent.primary}]}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );
      case 4: // Paramètres
        return (
          <View style={styles.demoSection}>
            <Text style={[styles.demoSectionTitle, {color: theme.colors.text.primary}]}>
              Paramètres
            </Text>
            {[
              {icon: 'palette', label: 'Thème', value: theme.name},
              {icon: 'language', label: 'Langue', value: 'Français'},
              {icon: 'hd', label: 'Qualité', value: 'Auto'},
              {icon: 'wifi', label: 'Streaming', value: 'WiFi'},
            ].map((item, index) => (
              <View key={index} style={[styles.demoSetting, {backgroundColor: theme.colors.surface.primary}]}>
                <Icon name={item.icon} size={20} color={theme.colors.text.primary} />
                <Text style={[styles.demoSettingLabel, {color: theme.colors.text.primary}]}>
                  {item.label}
                </Text>
                <Text style={[styles.demoSettingValue, {color: theme.colors.text.secondary}]}>
                  {item.value}
                </Text>
                <Icon name="chevron-right" size={20} color={theme.colors.text.tertiary} />
              </View>
            ))}
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      presentationStyle="fullScreen"
      statusBarTranslucent={true}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />

      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{translateY: slideAnim}],
          },
        ]}>
        {/* Fond avec le thème */}
        <LinearGradient
          colors={theme.colors.background.gradient}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Header de prévisualisation */}
        <View style={[styles.previewHeader, {backgroundColor: theme.colors.surface.elevated}]}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Icon name="arrow-back" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>

          <View style={styles.previewTitle}>
            <Text style={[styles.previewTitleText, {color: theme.colors.text.primary}]}>
              Aperçu : {theme.name}
            </Text>
            <Text style={[styles.previewSubtitle, {color: theme.colors.text.secondary}]}>
              Testez le thème en temps réel
            </Text>
          </View>

          <TouchableOpacity onPress={handleApplyTheme} style={styles.applyButton}>
            <Icon name="check" size={20} color={theme.colors.text.inverse} />
          </TouchableOpacity>
        </View>

        {/* Contenu de la démo */}
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          {/* App démo complète */}
          <View style={[styles.demoApp, {backgroundColor: theme.colors.background.primary}]}>
            <DemoHeader />
            <DemoNavigation />
            {activeDemo === 1 ? <DemoPlayer /> : renderDemoContent()}
          </View>

          {/* Infos du thème */}
          <View style={[styles.themeInfo, {backgroundColor: theme.colors.surface.primary}]}>
            <Text style={[styles.themeInfoTitle, {color: theme.colors.text.primary}]}>
              Caractéristiques du thème
            </Text>
            <View style={styles.themeFeatures}>
              <View style={styles.themeFeature}>
                <Icon
                  name={theme.isDark ? 'dark-mode' : 'light-mode'}
                  size={16}
                  color={theme.colors.accent.primary}
                />
                <Text style={[styles.themeFeatureText, {color: theme.colors.text.secondary}]}>
                  Mode {theme.isDark ? 'sombre' : 'clair'}
                </Text>
              </View>
              <View style={styles.themeFeature}>
                <Icon name="palette" size={16} color={theme.colors.accent.primary} />
                <Text style={[styles.themeFeatureText, {color: theme.colors.text.secondary}]}>
                  Design moderne
                </Text>
              </View>
              <View style={styles.themeFeature}>
                <Icon name="accessibility" size={16} color={theme.colors.accent.primary} />
                <Text style={[styles.themeFeatureText, {color: theme.colors.text.secondary}]}>
                  Optimisé lecture
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header de prévisualisation
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },

  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  previewTitle: {
    flex: 1,
    marginLeft: 16,
  },

  previewTitleText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },

  previewSubtitle: {
    fontSize: 12,
  },

  applyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Contenu
  content: {
    flex: 1,
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // App démo
  demoApp: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },

  // Header démo
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  demoHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  demoMenuIcon: {
    marginRight: 12,
  },

  demoHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
  },

  demoHeaderRight: {
    flexDirection: 'row',
    gap: 16,
  },

  // Navigation démo
  demoNavigation: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },

  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },

  navLabel: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
  },

  // Section démo
  demoSection: {
    padding: 16,
  },

  demoSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },

  // Chaîne démo
  demoChannel: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },

  demoChannelLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },

  demoChannelInfo: {
    flex: 1,
  },

  demoChannelName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },

  demoChannelCategory: {
    fontSize: 12,
  },

  demoChannelActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  // Lecteur démo
  demoPlayer: {
    margin: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },

  demoPlayerVideo: {
    height: 180,
    position: 'relative',
  },

  demoPlayerGradient: {
    flex: 1,
  },

  demoPlayerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },

  demoPlayerControls: {
    padding: 16,
  },

  demoPlayerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  demoPlayerTitle: {
    fontSize: 14,
    fontWeight: '600',
  },

  demoPlayerProgress: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    marginBottom: 12,
    overflow: 'hidden',
  },

  demoPlayerBuffer: {
    height: '100%',
    width: '30%',
    borderRadius: 2,
  },

  demoProgressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    width: '60%',
    borderRadius: 2,
  },

  demoPlayerBottom: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },

  // Recherche démo
  demoSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },

  demoSearchText: {
    marginLeft: 12,
    fontSize: 14,
  },

  demoTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  demoTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },

  demoTagText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Paramètres démo
  demoSetting: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },

  demoSettingLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '600',
  },

  demoSettingValue: {
    marginRight: 8,
    fontSize: 14,
  },

  // Infos thème
  themeInfo: {
    borderRadius: 12,
    padding: 16,
  },

  themeInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },

  themeFeatures: {
    gap: 8,
  },

  themeFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  themeFeatureText: {
    fontSize: 14,
  },
});

export default ThemeLivePreview;