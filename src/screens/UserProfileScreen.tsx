import React, {useState, useEffect} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import {Text, useTheme} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ProfileService, {
  AVAILABLE_AVATARS,
} from '../services/ProfileService';
import type {Profile} from '../types';
import {useAlert} from '../contexts/AlertContext';

interface UserProfileScreenProps {
  profile: Profile;
  onClose: () => void;
  onProfileUpdated: () => void;
}

const UserProfileScreen: React.FC<UserProfileScreenProps> = ({
  profile,
  onClose,
  onProfileUpdated,
}) => {
  const theme = useTheme();
  const {showAlert} = useAlert();

  // Protection contre un profile undefined
  if (!profile) {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.background}]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Icon name="arrow-back" size={24} color={theme.colors.onBackground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, {color: theme.colors.onBackground}]}>
            Erreur
          </Text>
          <View style={{width: 24}} />
        </View>
        <View style={styles.content}>
          <Text style={{color: theme.colors.onBackground}}>
            Profil non disponible
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const [name, setName] = useState(profile.name || '');
  const [avatar, setAvatar] = useState(profile.avatar || AVAILABLE_AVATARS[0]);
  const [isKids, setIsKids] = useState(profile.isKids || false);

  const handleSave = async () => {
    if (!name.trim()) {
      showAlert('Erreur', 'Le nom du profil ne peut pas être vide.');
      return;
    }

    try {
      await ProfileService.updateProfile(profile.id, {
        name: name.trim(),
        avatar,
        isKids,
      });
      showAlert('Succès', 'Profil mis à jour avec succès.');
      onProfileUpdated();
      onClose();
    } catch (error) {
      console.error("Erreur lors de la mise à jour du profil:", error);
      showAlert('Erreur', 'Impossible de mettre à jour le profil.');
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Icon name="arrow-back" size={24} color={theme.colors.onBackground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: theme.colors.onBackground}]}>
          Éditer le profil
        </Text>
        <TouchableOpacity onPress={handleSave}>
          <Icon name="check" size={24} color={theme.colors.accent.primary} />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.content}>
        <View style={styles.avatarSection}>
          <Text style={styles.avatarLabel}>Avatar</Text>
          <View style={styles.avatarGrid}>
            {AVAILABLE_AVATARS.map(av => (
              <TouchableOpacity
                key={av}
                onPress={() => setAvatar(av)}
                style={[
                  styles.avatarOption,
                  {backgroundColor: theme.colors.surface},
                  avatar === av && {
                    borderColor: theme.colors.accent.primary,
                    borderWidth: 2,
                  },
                ]}>
                <Text style={styles.avatarEmoji}>{av}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Nom du profil</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                color: theme.colors.onSurface,
                borderColor: theme.colors.border,
              },
            ]}
            placeholder="Nom du profil"
            placeholderTextColor={theme.colors.onSurfaceVariant}
          />
        </View>

        <TouchableOpacity
          style={styles.kidsModeSection}
          onPress={() => setIsKids(!isKids)}>
          <Icon
            name={isKids ? 'check-box' : 'check-box-outline-blank'}
            size={24}
            color={theme.colors.accent.primary}
          />
          <Text style={[styles.kidsModeText, {color: theme.colors.onBackground}]}>
            Mode enfant
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {padding: 16},
  avatarSection: {marginBottom: 24},
  avatarLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  avatarOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 8,
  },
  avatarEmoji: {
    fontSize: 30,
  },
  inputSection: {marginBottom: 24},
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  kidsModeSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  kidsModeText: {
    marginLeft: 8,
    fontSize: 16,
  },
});

export default UserProfileScreen;