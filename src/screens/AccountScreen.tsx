/**
 * 📱 Écran Compte - Version Simple
 * Interface simple et fonctionnelle comme une liste de paramètres
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useThemeColors } from '../contexts/ThemeContext';
import {useI18n} from '../hooks/useI18n';
import { useUserStore } from '../stores/UserStore';
import ProfileService from '../services/ProfileService';

const AccountScreen: React.FC = () => {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const {t: tCommon} = useI18n('common');
  const {t: tSettings} = useI18n('settings');

  const { currentUser, isAuthenticated } = useUserStore();
  const [currentProfile, setCurrentProfile] = React.useState<any>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);

  React.useEffect(() => {
    loadCurrentProfile();
  }, []);

  // Rafraîchir quand l'écran est en focus
  React.useEffect(() => {
    if (isFocused && isLoaded) {
      console.log('🔄 [AccountScreen] Écran en focus, rechargement profil...');
      loadCurrentProfile();
    }
  }, [isFocused, isLoaded]);

  const loadCurrentProfile = async () => {
    try {
      const profile = await ProfileService.getActiveProfile();
      setCurrentProfile(profile);
      setIsLoaded(true);
    } catch (error) {
      console.error('Erreur chargement profil:', error);
      setIsLoaded(true);
    }
  };

  const accountOptions = [
    {
      id: 'profile',
      title: tSettings('accountInfo'),
      icon: 'info',
      subtitle: currentProfile ? currentProfile.name : tCommon('notDefined'),
      onPress: () => navigation.navigate('AccountInfo' as any),
    },
    {
      id: 'password',
      title: tCommon('password'),
      icon: 'vpn-key',
      onPress: () => Alert.alert(tCommon('password'), tCommon('featureNotImplemented')),
    },
    {
      id: 'devices',
      title: tCommon('devices'),
      icon: 'devices',
      onPress: () => Alert.alert(tCommon('devices'), tCommon('featureNotImplemented')),
    },
    {
      id: 'subscription',
      title: tCommon('subscription'),
      icon: 'credit-card',
      onPress: () => Alert.alert(tCommon('subscription'), tCommon('featureNotImplemented')),
    },
    {
      id: 'notifications',
      title: tCommon('notifications'),
      icon: 'notifications',
      onPress: () => Alert.alert(tCommon('notifications'), tCommon('featureNotImplemented')),
    },
    {
      id: 'privacy',
      title: tCommon('privacy'),
      icon: 'lock',
      onPress: () => Alert.alert(tCommon('privacy'), tCommon('featureNotImplemented')),
    },
    {
      id: 'help',
      title: tCommon('help'),
      icon: 'help',
      onPress: () => Alert.alert(tCommon('help'), tCommon('featureNotImplemented')),
    },
    {
      id: 'logout',
      title: tCommon('logout'),
      icon: 'logout',
      onPress: () => {
        Alert.alert(
          tCommon('logoutTitle'),
          tCommon('logoutMessage'),
          [
            { text: tCommon('cancel'), style: 'cancel' },
            {
              text: tCommon('logout'),
              style: 'destructive',
              onPress: async () => {
                try {
                  // Tenter de déconnecter du ProfileService d'abord
                  await ProfileService.clearActiveProfile();
                  // Ensuite déconnecter du UserStore
                  useUserStore.getState().logout();
                  navigation.goBack();
                } catch (error) {
                  console.error('Erreur déconnexion:', error);
                  // En cas d'erreur, juste déconnecter du UserStore
                  useUserStore.getState().logout();
                  navigation.goBack();
                }
              }
            }
          ]
        );
      },
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a73e8" />

      {/* Header simple */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{tSettings('account')}</Text>
      </View>

      {/* Liste des options */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {accountOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.optionItem,
              option.id === 'logout' && styles.logoutItem
            ]}
            onPress={option.onPress}
            activeOpacity={0.7}
          >
            <Icon
              name={option.icon}
              size={24}
              color={option.id === 'logout' ? '#F44336' : '#FFFFFF'}
            />
            <View style={styles.optionContent}>
              <Text style={[
                styles.optionText,
                option.id === 'logout' && styles.logoutText
              ]}>
                {option.title}
              </Text>
              {option.subtitle && (
                <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
              )}
            </View>
            <Icon
              name="chevron-right"
              size={20}
              color={option.id === 'logout' ? '#F44336' : '#FFFFFF'}
            />
          </TouchableOpacity>
        ))}

        {/* Espace en bas */}
        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 45,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.ui.border,
  },
  logoutItem: {
    backgroundColor: colors.background.danger || '#FFF5F5',
  },
  optionContent: {
    flex: 1,
    marginLeft: 15,
  },
  optionText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  optionSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 2,
  },
  logoutText: {
    color: colors.text.danger || '#F44336',
  },
  bottomSpace: {
    height: 50,
  },
});

export default AccountScreen;