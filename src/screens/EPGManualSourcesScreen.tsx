/**
 * 📺 EPG Manual Sources Screen - Gestion des sources EPG personnalisées
 * Interface moderne pour ajouter/modifier/supprimer des sources EPG manuelles
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  useColorScheme,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import type {RootStackParamList} from '../../App';
import {EPGSourceManager, EPGSource} from '../services/epg/EPGSourceManager';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface EPGSourceForm {
  name: string;
  url: string;
  playlistId?: string;
}

const EPGManualSourcesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [sources, setSources] = useState<EPGSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSource, setEditingSource] = useState<EPGSource | null>(null);
  const [formData, setFormData] = useState<EPGSourceForm>({
    name: '',
    url: '',
  });
  const [validating, setValidating] = useState(false);
  const isDarkMode = useColorScheme() === 'dark';

  const epgManager = new EPGSourceManager();

  useEffect(() => {
    loadManualSources();
  }, []);

  const loadManualSources = async () => {
    try {
      setLoading(true);
      const manualSources = await epgManager.getManualSources();
      setSources(manualSources);
    } catch (error) {
      console.error('Erreur chargement sources EPG:', error);
      Alert.alert('Erreur', 'Impossible de charger les sources EPG');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSource = () => {
    setEditingSource(null);
    setFormData({name: '', url: ''});
    setModalVisible(true);
  };

  const handleEditSource = (source: EPGSource) => {
    setEditingSource(source);
    setFormData({
      name: source.name,
      url: source.url,
      playlistId: source.playlistId,
    });
    setModalVisible(true);
  };

  const handleDeleteSource = (source: EPGSource) => {
    Alert.alert(
      'Supprimer la source EPG',
      `Êtes-vous sûr de vouloir supprimer "${source.name}" ?`,
      [
        {text: 'Annuler', style: 'cancel'},
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => deleteSource(source.id),
        },
      ],
    );
  };

  const deleteSource = async (sourceId: string) => {
    try {
      await epgManager.removeManualSource(sourceId);
      await loadManualSources();
    } catch (error) {
      console.error('Erreur suppression source:', error);
      Alert.alert('Erreur', 'Impossible de supprimer la source');
    }
  };

  const validateURL = (url: string): boolean => {
    // Vérification plus permissive pour les URLs EPG
    if (!url || typeof url !== 'string') {
      return false;
    }

    // Nettoyer l'URL
    const cleanUrl = url.trim();

    // Vérifier le protocole de base
    if (!cleanUrl.match(/^https?:\/\//i)) {
      return false;
    }

    // Vérifier qu'il y a un domaine après le protocole
    const domainMatch = cleanUrl.match(/^https?:\/\/([^\/\s]+)/i);
    if (!domainMatch || !domainMatch[1]) {
      return false;
    }

    // Validation basique du format de domaine
    const domain = domainMatch[1];
    if (domain.length < 3 || !domain.includes('.')) {
      return false;
    }

    try {
      // Test secondaire avec URL() pour les cas complexes
      new URL(cleanUrl);
      return true;
    } catch {
      // Si URL() échoue, mais que les vérifications de base passent, on accepte
      console.log(
        '🔄 [EPGManualSources] URL acceptée malgré échec URL():',
        cleanUrl,
      );
      return true;
    }
  };

  const handleSaveSource = async () => {
    // Validation
    if (!formData.name.trim()) {
      Alert.alert('Erreur', 'Le nom de la source est requis');
      return;
    }
    if (!formData.url.trim()) {
      Alert.alert('Erreur', "L'URL de la source est requise");
      return;
    }
    if (!validateURL(formData.url)) {
      Alert.alert('Erreur', 'URL invalide. Utilisez http:// ou https://');
      return;
    }

    try {
      setValidating(true);

      if (editingSource) {
        // Modifier source existante
        await epgManager.updateManualSource(editingSource.id, {
          name: formData.name.trim(),
          url: formData.url.trim(),
        });
      } else {
        // Ajouter nouvelle source
        await epgManager.addManualSource({
          name: formData.name.trim(),
          url: formData.url.trim(),
          playlistId: formData.playlistId,
        });
      }

      setModalVisible(false);
      await loadManualSources();
    } catch (error) {
      console.error('Erreur sauvegarde source:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la source');
    } finally {
      setValidating(false);
    }
  };

  const testSource = async (source: EPGSource) => {
    try {
      setValidating(true);
      const result = await epgManager.testEPGSource(source.url);

      if (result.success) {
        Alert.alert(
          'Test réussi',
          `Source EPG valide!\nChaînes détectées: ${
            result.channelsCount || 'Non déterminé'
          }`,
        );
      } else {
        Alert.alert('Test échoué', result.error || 'URL EPG inaccessible');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de tester la source');
    } finally {
      setValidating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#4ade80';
      case 'error':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  const renderSourceCard = (source: EPGSource, index: number) => (
    <View key={source.id} style={styles.sourceCard}>
      <LinearGradient
        colors={
          isDarkMode
            ? ['rgba(30, 41, 59, 0.8)', 'rgba(15, 23, 42, 0.9)']
            : ['rgba(248, 250, 252, 0.9)', 'rgba(226, 232, 240, 0.8)']
        }
        style={styles.cardGradient}>
        {/* Header avec statut */}
        <View style={styles.cardHeader}>
          <View style={styles.sourceInfo}>
            <Text
              style={[
                styles.sourceName,
                {color: isDarkMode ? '#e2e8f0' : '#1e293b'},
              ]}>
              {source.name}
            </Text>
            <Text
              style={[
                styles.sourceType,
                {color: isDarkMode ? '#94a3b8' : '#64748b'},
              ]}>
              Source manuelle
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {backgroundColor: getStatusColor(source.status)},
            ]}>
            <Text style={styles.statusText}>
              {source.status === 'active'
                ? 'Actif'
                : source.status === 'error'
                ? 'Erreur'
                : 'Inactif'}
            </Text>
          </View>
        </View>

        {/* URL et statistiques */}
        <Text
          style={[
            styles.sourceURL,
            {color: isDarkMode ? '#94a3b8' : '#64748b'},
          ]}
          numberOfLines={1}>
          {source.url}
        </Text>

        {source.channelsCount && (
          <Text
            style={[
              styles.sourceStats,
              {color: isDarkMode ? '#64748b' : '#94a3b8'},
            ]}>
            {source.channelsCount} chaînes • Mis à jour{' '}
            {source.lastUpdate
              ? new Date(source.lastUpdate).toLocaleDateString()
              : 'jamais'}
          </Text>
        )}

        {/* Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.testButton]}
            onPress={() => testSource(source)}
            disabled={validating}>
            <Icon name="wifi-find" size={16} color="#ffffff" />
            <Text style={styles.actionButtonText}>Tester</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => handleEditSource(source)}>
            <Icon name="edit" size={16} color="#ffffff" />
            <Text style={styles.actionButtonText}>Modifier</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteSource(source)}>
            <Icon name="delete" size={16} color="#ffffff" />
            <Text style={styles.actionButtonText}>Supprimer</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );

  return (
    <LinearGradient
      colors={
        isDarkMode
          ? ['#0f172a', '#1e293b', '#334155']
          : ['#f8fafc', '#e2e8f0', '#cbd5e1']
      }
      style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon
            name="arrow-back"
            size={24}
            color={isDarkMode ? '#e2e8f0' : '#1e293b'}
          />
        </TouchableOpacity>

        <View style={{width: 24}} />
      </View>

      {/* Contenu */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEnabled={sources.length > 2}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text
              style={[
                styles.loadingText,
                {color: isDarkMode ? '#94a3b8' : '#64748b'},
              ]}>
              Chargement des sources...
            </Text>
          </View>
        ) : sources.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon
              name="source"
              size={64}
              color={isDarkMode ? '#475569' : '#94a3b8'}
            />
            <Text
              style={[
                styles.emptyTitle,
                {color: isDarkMode ? '#e2e8f0' : '#1e293b'},
              ]}>
              Aucune source EPG manuelle
            </Text>
            <Text
              style={[
                styles.emptyText,
                {color: isDarkMode ? '#94a3b8' : '#64748b'},
              ]}>
              Ajoutez des sources EPG personnalisées pour enrichir vos guides TV
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={handleAddSource}>
              <Icon name="add" size={20} color="#ffffff" />
              <Text style={styles.emptyButtonText}>Ajouter une source</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.sourcesList}>
            {sources.map((source, index) => renderSourceCard(source, index))}
          </View>
        )}
      </ScrollView>

      {/* Modal d'ajout/édition */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={
                isDarkMode
                  ? ['rgba(15, 23, 42, 0.98)', 'rgba(30, 41, 59, 0.95)']
                  : ['rgba(248, 250, 252, 0.98)', 'rgba(226, 232, 240, 0.95)']
              }
              style={styles.modalContent}>
              {/* Header modal */}
              <View style={styles.modalHeader}>
                <Text
                  style={[
                    styles.modalTitle,
                    {color: isDarkMode ? '#e2e8f0' : '#1e293b'},
                  ]}>
                  {editingSource
                    ? 'Modifier la source'
                    : 'Ajouter une source EPG'}
                </Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setModalVisible(false)}>
                  <Icon
                    name="close"
                    size={24}
                    color={isDarkMode ? '#94a3b8' : '#64748b'}
                  />
                </TouchableOpacity>
              </View>

              {/* Formulaire */}
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text
                    style={[
                      styles.inputLabel,
                      {color: isDarkMode ? '#e2e8f0' : '#1e293b'},
                    ]}>
                    Nom de la source
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: isDarkMode
                          ? 'rgba(30, 41, 59, 0.5)'
                          : 'rgba(248, 250, 252, 0.8)',
                        borderColor: isDarkMode ? '#475569' : '#cbd5e1',
                        color: isDarkMode ? '#e2e8f0' : '#1e293b',
                      },
                    ]}
                    value={formData.name}
                    onChangeText={text =>
                      setFormData({...formData, name: text})
                    }
                    placeholder="Ex: EPG France TV"
                    placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text
                    style={[
                      styles.inputLabel,
                      {color: isDarkMode ? '#e2e8f0' : '#1e293b'},
                    ]}>
                    URL EPG (XMLTV)
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: isDarkMode
                          ? 'rgba(30, 41, 59, 0.5)'
                          : 'rgba(248, 250, 252, 0.8)',
                        borderColor: isDarkMode ? '#475569' : '#cbd5e1',
                        color: isDarkMode ? '#e2e8f0' : '#1e293b',
                      },
                    ]}
                    value={formData.url}
                    onChangeText={text => setFormData({...formData, url: text})}
                    placeholder="https://exemple.com/epg.xml"
                    placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                  />
                </View>

                {/* Boutons */}
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setModalVisible(false)}
                    disabled={validating}>
                    <Text style={styles.cancelButtonText}>Annuler</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={handleSaveSource}
                    disabled={validating}>
                    {validating ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Icon name="save" size={18} color="#ffffff" />
                        <Text style={styles.saveButtonText}>
                          {editingSource ? 'Modifier' : 'Ajouter'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
    marginTop: -50,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  sourcesList: {
    paddingBottom: 20,
  },
  sourceCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardGradient: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  sourceInfo: {
    flex: 1,
    marginRight: 12,
  },
  sourceName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  sourceType: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  sourceURL: {
    fontSize: 13,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  sourceStats: {
    fontSize: 12,
    marginBottom: 16,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  testButton: {
    backgroundColor: '#3b82f6',
  },
  editButton: {
    backgroundColor: '#f59e0b',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    width: Dimensions.get('screen').width,
    height: Dimensions.get('screen').height,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalContent: {
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 4,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  cancelButton: {
    backgroundColor: '#6b7280',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EPGManualSourcesScreen;
