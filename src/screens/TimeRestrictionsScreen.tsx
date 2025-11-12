/**
 * ⏰ TimeRestrictionsScreen - Configuration des restrictions horaires
 * Permet de configurer les plages horaires autorisées et le temps quotidien max
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Text,
  useTheme,
  Button,
  Chip,
  TextInput as PaperTextInput,
  Card,
  IconButton,
} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import type {RouteProp} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import type {RootStackParamList, Profile, TimeSlot} from '../types';
import ProfileService from '../services/ProfileService';

type TimeRestrictionsScreenRouteProp = RouteProp<
  RootStackParamList,
  'TimeRestrictions'
>;
type TimeRestrictionsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'TimeRestrictions'
>;

interface Props {
  route: TimeRestrictionsScreenRouteProp;
  navigation: TimeRestrictionsScreenNavigationProp;
}

const DAYS_OF_WEEK = [
  {label: 'Dim', value: 0},
  {label: 'Lun', value: 1},
  {label: 'Mar', value: 2},
  {label: 'Mer', value: 3},
  {label: 'Jeu', value: 4},
  {label: 'Ven', value: 5},
  {label: 'Sam', value: 6},
];

const TimeRestrictionsScreen: React.FC<Props> = ({route, navigation}) => {
  const theme = useTheme();
  const {profileId} = route.params;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [maxDailyMinutes, setMaxDailyMinutes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // État pour nouvelle plage horaire
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    loadData();
  }, [profileId]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      const profileData = await ProfileService.getProfileById(profileId);
      if (!profileData) {
        Alert.alert('Erreur', 'Profil introuvable');
        navigation.goBack();
        return;
      }

      setProfile(profileData);
      setTimeSlots(profileData.allowedTimeSlots || []);
      setMaxDailyMinutes(
        profileData.maxDailyMinutes ? profileData.maxDailyMinutes.toString() : ''
      );
    } catch (error) {
      console.error('❌ Error loading time restrictions:', error);
      Alert.alert('Erreur', 'Impossible de charger les restrictions horaires');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleDay = (day: number) => {
    setSelectedDays(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day].sort();
      }
    });
  };

  const handleAddTimeSlot = () => {
    if (selectedDays.length === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins un jour');
      return;
    }

    if (!startTime || !endTime) {
      Alert.alert('Erreur', 'Veuillez renseigner les heures de début et de fin');
      return;
    }

    // Validation du format HH:MM
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      Alert.alert('Erreur', 'Format d\'heure invalide (ex: 14:30)');
      return;
    }

    const newSlot: TimeSlot = {
      days: selectedDays,
      startTime,
      endTime,
    };

    setTimeSlots([...timeSlots, newSlot]);

    // Réinitialiser le formulaire
    setSelectedDays([]);
    setStartTime('');
    setEndTime('');
  };

  const handleRemoveTimeSlot = (index: number) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!profile) return;

    try {
      const updates: Partial<Profile> = {
        allowedTimeSlots: timeSlots.length > 0 ? timeSlots : undefined,
        maxDailyMinutes: maxDailyMinutes ? parseInt(maxDailyMinutes, 10) : undefined,
      };

      await ProfileService.updateProfile(profileId, updates);

      Alert.alert('Succès', 'Restrictions horaires sauvegardées', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('❌ Error saving time restrictions:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder les modifications');
    }
  };

  const getDaysLabel = (days: number[]): string => {
    if (days.length === 7) return 'Tous les jours';
    if (days.length === 5 && !days.includes(0) && !days.includes(6))
      return 'Lun-Ven';
    if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Week-end';

    return days
      .map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label)
      .join(', ');
  };

  if (isLoading || !profile) {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.background}]}>
        <View style={styles.loadingContainer}>
          <Text style={{color: theme.colors.onBackground}}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.background}]}>
      {/* Header */}
      <View style={[styles.header, {borderBottomColor: theme.colors.outline}]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={theme.colors.onBackground} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text variant="titleLarge" style={[styles.headerTitle, {color: theme.colors.onBackground}]}>
            Temps d'écoute autorisé
          </Text>
          <Text variant="bodyMedium" style={{color: theme.colors.onSurfaceVariant}}>
            Profil: {profile.name}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Section Plages horaires */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Icon name="schedule" size={24} color={theme.colors.accent.primary} />
              <Text variant="titleMedium" style={[styles.sectionTitle, {color: theme.colors.onBackground}]}>
                Plages horaires autorisées
              </Text>
            </View>

            <Text style={[styles.description, {color: theme.colors.onSurfaceVariant}]}>
              Définissez les plages horaires pendant lesquelles {profile.name} peut regarder la TV.
            </Text>

            {/* Liste des plages existantes */}
            {timeSlots.map((slot, index) => (
              <View
                key={index}
                style={[styles.timeSlotItem, {backgroundColor: theme.colors.surfaceVariant}]}
              >
                <View style={styles.timeSlotContent}>
                  <Text style={[styles.timeSlotDays, {color: theme.colors.onSurfaceVariant}]}>
                    {getDaysLabel(slot.days)}
                  </Text>
                  <Text style={[styles.timeSlotTime, {color: theme.colors.onSurface}]}>
                    {slot.startTime} - {slot.endTime}
                  </Text>
                </View>
                <IconButton
                  icon="delete"
                  iconColor={theme.colors.error}
                  size={20}
                  onPress={() => handleRemoveTimeSlot(index)}
                />
              </View>
            ))}

            {/* Formulaire d'ajout */}
            <View style={styles.addSlotForm}>
              <Text variant="labelLarge" style={[styles.formLabel, {color: theme.colors.onBackground}]}>
                Ajouter une plage horaire
              </Text>

              {/* Sélection des jours */}
              <Text variant="bodySmall" style={[styles.inputLabel, {color: theme.colors.onSurfaceVariant}]}>
                Jours de la semaine :
              </Text>
              <View style={styles.daysContainer}>
                {DAYS_OF_WEEK.map(day => (
                  <Chip
                    key={day.value}
                    selected={selectedDays.includes(day.value)}
                    onPress={() => handleToggleDay(day.value)}
                    style={styles.dayChip}
                    selectedColor={theme.colors.accent.primary}
                  >
                    {day.label}
                  </Chip>
                ))}
              </View>

              {/* Heures */}
              <View style={styles.timeInputsContainer}>
                <View style={styles.timeInputWrapper}>
                  <Text variant="bodySmall" style={[styles.inputLabel, {color: theme.colors.onSurfaceVariant}]}>
                    Début :
                  </Text>
                  <PaperTextInput
                    mode="outlined"
                    value={startTime}
                    onChangeText={setStartTime}
                    placeholder="14:00"
                    keyboardType="numeric"
                    style={styles.timeInput}
                    dense
                  />
                </View>
                <View style={styles.timeInputWrapper}>
                  <Text variant="bodySmall" style={[styles.inputLabel, {color: theme.colors.onSurfaceVariant}]}>
                    Fin :
                  </Text>
                  <PaperTextInput
                    mode="outlined"
                    value={endTime}
                    onChangeText={setEndTime}
                    placeholder="20:00"
                    keyboardType="numeric"
                    style={styles.timeInput}
                    dense
                  />
                </View>
              </View>

              <Button
                mode="contained-tonal"
                onPress={handleAddTimeSlot}
                icon="add"
                style={styles.addButton}
              >
                Ajouter cette plage
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Section Temps quotidien max */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Icon name="timer" size={24} color={theme.colors.secondary} />
              <Text variant="titleMedium" style={[styles.sectionTitle, {color: theme.colors.onBackground}]}>
                Durée quotidienne maximum
              </Text>
            </View>

            <Text style={[styles.description, {color: theme.colors.onSurfaceVariant}]}>
              Limitez le temps d'écoute total par jour (en minutes).
            </Text>

            <PaperTextInput
              mode="outlined"
              label="Minutes par jour (ex: 120)"
              value={maxDailyMinutes}
              onChangeText={setMaxDailyMinutes}
              keyboardType="numeric"
              placeholder="120"
              style={styles.input}
              right={<PaperTextInput.Affix text="min" />}
            />

            {maxDailyMinutes && parseInt(maxDailyMinutes, 10) > 0 && (
              <Text style={[styles.hint, {color: theme.colors.onSurfaceVariant}]}>
                ≈ {Math.floor(parseInt(maxDailyMinutes, 10) / 60)}h{' '}
                {parseInt(maxDailyMinutes, 10) % 60}min par jour
              </Text>
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Footer avec boutons */}
      <View style={[styles.footer, {backgroundColor: theme.colors.surface}]}>
        <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.cancelButton}>
          {tCommon('cancel')}
        </Button>
        <Button mode="contained" onPress={handleSave} style={styles.saveButton} icon="check">
          {tCommon('save')}
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    margin: 16,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  timeSlotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  timeSlotContent: {
    flex: 1,
  },
  timeSlotDays: {
    fontSize: 12,
    fontWeight: '500',
  },
  timeSlotTime: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  addSlotForm: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  formLabel: {
    fontWeight: '600',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 4,
    marginTop: 8,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  dayChip: {
    marginVertical: 2,
  },
  timeInputsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  timeInputWrapper: {
    flex: 1,
  },
  timeInput: {
    fontSize: 16,
  },
  addButton: {
    marginTop: 8,
  },
  input: {
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
});

export default TimeRestrictionsScreen;
