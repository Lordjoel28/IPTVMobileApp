/**
 * 📺 EPG Compact - Guide TV minimaliste et performant
 *
 * STRATÉGIE OPTIMISÉE: Chargement intelligent à la demande avec cache
 * ✅ Chargement prioritaire de la chaîne courante seulement
 * ✅ Cache intelligent avec index O(1) pour recherches rapides
 * ✅ EPG complet chargé en arrière-plan sans bloquer l'UI
 * ✅ Interface responsive immédiatement
 * ✅ Fallback sur ExternalEPG si besoin
 * @ts-nocheck
 */

import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  InteractionManager,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useThemeColors} from '../contexts/ThemeContext';
import {
  FullEPGData,
  EPGChannel,
  EPGProgramme,
} from '../services/XtreamEPGService';
import {EPGCacheManager} from '../services/epg/EPGCacheManager';
import {SQLiteEPGStorage} from '../services/epg/SQLiteEPGStorage';
import {PlaylistMetadata} from '../services/playlist/PlaylistManager';

// Interfaces
interface EPGCompactProps {
  selectedChannel?: any;
  height?: number;
  playlistId?: string; // Ajout pour EPGSourceManager
  playlistMetadata?: PlaylistMetadata;
}

interface CompactProgram {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  isLive: boolean;
  progress?: number;
  duration: number; // en minutes
  category?: string;
}

// Utilisation du cache EPG centralisé
const epgCache = EPGCacheManager;

// 🚀 Cache des matches EPG réussis pour éviter les recherches répétées
const channelMatchCache = new Map<string, string>(); // channelName -> epgChannelId

// IconText sera défini à l'intérieur du composant EPGCompact

// StatusText sera défini à l'intérieur du composant EPGCompact

const EPGCompact: React.FC<EPGCompactProps> = ({
  selectedChannel,
  height,
  playlistId,
  playlistMetadata,
}) => {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  // Composant pour afficher une icône avec texte
  const IconText: React.FC<{
    icon: string;
    text: string;
    color?: string;
    size?: number;
    textSize?: number;
  }> = ({icon, text, color = '#FFFFFF', size = 16, textSize}) => (
    <View style={styles.iconTextContainer}>
      <Icon name={icon} size={size} color={color} style={styles.iconTextIcon} />
      <Text style={[styles.iconTextLabel, {color, fontSize: textSize || 14}]}>
        {text}
      </Text>
    </View>
  );

  // Composant pour afficher un statut avec icône appropriée
  const StatusText: React.FC<{status: string}> = ({status}) => {
    const getStatusIcon = (status: string) => {
      if (status.includes('disponible')) {
        return 'check-circle';
      }
      if (status.includes('Vérification') || status.includes('indexé')) {
        return 'search';
      }
      if (status.includes('Erreur')) {
        return 'error';
      }
      if (status.includes('Pas de Guide') || status.includes('non chargé')) {
        return 'cloud-download';
      }
      if (status.includes('Aucun programme')) {
        return 'info';
      }
      if (status.includes('se charge') || status.includes('Initialisation')) {
        return 'hourglass-empty';
      }
      if (status.includes('Recherche')) {
        return 'search';
      }
      return 'tv';
    };

    const getStatusColor = (status: string) => {
      if (status.includes('disponible')) {
        return '#4CAF50';
      }
      if (status.includes('Erreur')) {
        return '#F44336';
      }
      // Tous les messages spécifiques au guide en gris discret
      if (
        status.includes('Pas de Guide') ||
        status.includes('non chargé') ||
        status.includes('Aucun programme') ||
        status.includes('trouvé pour') ||
        status.includes('Vérification') ||
        status.includes('indexé') ||
        status.includes('Initialisation') ||
        status.includes('Recherche') ||
        status.includes('se charge') ||
        status.includes('Patientez')
      ) {
        return '#666666';
      }
      return '#888';
    };

    const isGuideSpecificMessage =
      status.includes('trouvé pour') ||
      status.includes('Aucun programme') ||
      status.includes('Pas de Guide') ||
      status.includes('non chargé') ||
      status.includes('Vérification') ||
      status.includes('indexé') ||
      status.includes('Initialisation') ||
      status.includes('Recherche') ||
      status.includes('se charge') ||
      status.includes('Patientez');

    return (
      <IconText
        icon={getStatusIcon(status)}
        text={status}
        color={getStatusColor(status)}
        size={isGuideSpecificMessage ? 14 : 16}
        textSize={isGuideSpecificMessage ? 12 : 14}
      />
    );
  };
  const [programs, setPrograms] = useState<CompactProgram[]>([]);
  const [epgStatus, setEpgStatus] = useState('Guide TV prêt');
  const currentChannelRef = useRef<string | null>(null);
  const backgroundTaskRef = useRef<boolean>(false);

  // 🚀 TiviMate Style : État du chargement progressif
  const [isLoadingEPG, setIsLoadingEPG] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isCacheReady, setIsCacheReady] = useState(false); // ✅ NOUVEL ÉTAT

  // 🔄 État pour les mises à jour en temps réel
  const [now, setNow] = useState(new Date());

  // Effet pour la mise à jour de la progression et la transition de programme
  useEffect(() => {
    const interval = setInterval(() => {
      const newNow = new Date();
      setNow(newNow);

      const liveProgram = programs.find(p => p.isLive);
      if (liveProgram && newNow.getTime() >= liveProgram.endTime.getTime()) {
        console.log(
          '[EPGCompact] Le programme en cours est terminé. Rafraîchissement du guide.',
        );
        if (selectedChannel) {
          loadChannelPrograms(selectedChannel);
        }
      }
    }, 15000); // Mise à jour toutes les 15 secondes

    return () => clearInterval(interval);
  }, [programs, selectedChannel]);

  // 📊 La fonction de calcul de la progression utilise l'état 'now'
  const calculateLiveProgress = (program: CompactProgram): number => {
    if (!program.isLive) {
      return 0;
    }

    const startTime = program.startTime.getTime();
    const endTime = program.endTime.getTime();

    if (now.getTime() < startTime) {
      return 0;
    }
    if (now.getTime() >= endTime) {
      return 100;
    }

    const duration = endTime - startTime;
    if (duration <= 0) {
      return 0;
    }

    const elapsed = now.getTime() - startTime;
    return Math.max(0, Math.min(100, (elapsed / duration) * 100));
  };

  // 🚀 TiviMate Style : Chargement EPG à la demande
  useEffect(() => {
    if (!playlistId || playlistMetadata === undefined) {
      console.log('⏳ [EPGCompact] En attente des métadonnées de playlist...');
      return;
    }

    if (!backgroundTaskRef.current) {
      backgroundTaskRef.current = true;
      console.log('🚀 [EPGCompact] Démarrage chargement EPG TiviMate style...');
      InteractionManager.runAfterInteractions(() => {
        loadEPGTiviMateStyle();
      });
    }
  }, [playlistId, playlistMetadata]);

  /**
   * 🚀 TiviMate Style : Chargement progressif EPG (seulement si données déjà téléchargées)
   */
  const loadEPGTiviMateStyle = async () => {
    try {
      setEpgStatus('Vérification des données TV...');
      console.log('🔍 [EPGCompact] Vérification des données EPG existantes...');

      const progressCallback = (progress: number) => {
        setLoadingProgress(progress);
        setEpgStatus(`Guide TV: ${progress}% indexé`);
      };

      setIsLoadingEPG(true);
      const hasExistingData = await epgCache.loadExistingDataChunked(
        progressCallback,
      );

      if (hasExistingData) {
        console.log(
          '✅ [EPGCompact] EPG chargé depuis le cache TiviMate style',
        );
        setEpgStatus('Guide TV disponible');
      } else {
        console.log(
          '📭 [EPGCompact] 1er démarrage - Aucune donnée EPG trouvée',
        );
        setEpgStatus('Pas de Guide TV - Téléchargez depuis Paramètres');
      }

      setIsLoadingEPG(false);
      setIsCacheReady(true); // ✅ Le cache est prêt (ou vide), on peut continuer
    } catch (error) {
      console.error('❌ [EPGCompact] Erreur chargement TiviMate style:', error);
      setEpgStatus('Erreur Guide TV - Vérifiez les paramètres');
      setIsLoadingEPG(false);
      setIsCacheReady(true); // ✅ Même en cas d'erreur, on débloque la recherche
    }
  };

  // ✅ NOUVEL EFFET SYNCHRONISÉ
  // Se déclenche quand la chaîne change OU quand le cache devient prêt
  useEffect(() => {
    if (!selectedChannel) {
      setPrograms([]);
      currentChannelRef.current = null;
      return;
    }

    // Attendre que le cache soit prêt (avec exception pour chargement chunked)
    if (!isCacheReady) {
      if (epgCache.isLoadingChunked) {
        // ✅ Chargement en cours → Permettre l'accès SQLite direct
        console.log(
          `🔄 [EPGCompact] Cache en chargement, accès SQLite autorisé pour: ${selectedChannel.name}`,
        );
        setEpgStatus('Recherche de programmes en cours...');
        // CONTINUER l'exécution (pas de return)
      } else {
        // ❌ Cache pas encore initialisé → Bloquer
        console.log(
          `⏳ [EPGCompact] Cache non prêt, en attente pour charger les programmes de: ${selectedChannel.name}`,
        );
        setEpgStatus('Initialisation du Guide TV...');
        return;
      }
    }

    // Éviter les recherches multiples pour la même chaîne si déjà chargée
    if (
      currentChannelRef.current === selectedChannel.name &&
      programs.length > 0
    ) {
      return;
    }

    currentChannelRef.current = selectedChannel.name;
    console.log(
      `📺 [EPGCompact] Le cache est prêt. Recherche des programmes pour: ${selectedChannel.name}`,
    );

    loadChannelPrograms(selectedChannel);
  }, [selectedChannel, isCacheReady]); // Dépend de la chaîne ET de l'état du cache

  const loadChannelPrograms = async (channel: any) => {
    const cacheKey = channel.name;

    // PRIORITÉ 1: Cache des programmes (instantané)
    if (epgCache.programsCache.has(cacheKey)) {
      console.log('⚡ [EPGCompact] Programmes depuis cache');
      setPrograms(epgCache.programsCache.get(cacheKey)!);
      return;
    }

    console.log(
      '🔍 [EPGCompact] Recherche programmes TiviMate style pour:',
      channel.name,
    );

    try {
      const foundPrograms = await findProgramsFromCache(channel);
      if (foundPrograms.length > 0) {
        epgCache.programsCache.set(cacheKey, foundPrograms);
        setPrograms(foundPrograms);
        setEpgStatus(`${foundPrograms.length} programmes disponibles`);
        console.log(
          `✅ [EPGCompact] ${foundPrograms.length} programmes trouvés pour ${channel.name}`,
        );
      } else {
        setPrograms([]);
        if (epgCache.isLoadingChunked) {
          setEpgStatus('Guide TV se charge... Patientez quelques secondes');
        } else if (
          !epgCache.fullEPG ||
          epgCache.fullEPG.channels.length === 0
        ) {
          setEpgStatus('Guide TV non chargé - Allez dans Paramètres');
        } else {
          setEpgStatus(`Aucun programme trouvé pour "${channel.name}"`);
        }
        console.log(
          `❌ [EPGCompact] Aucun programme trouvé pour ${channel.name}`,
        );
      }
    } catch (error) {
      console.error('❌ [EPGCompact] Erreur recherche programmes:', error);
      setPrograms([]);
      setEpgStatus('Erreur lors du chargement des programmes');
    }
  };

  const findProgramsFromCache = async (
    channel: any,
  ): Promise<CompactProgram[]> => {
    return new Promise(resolve => {
      // Déporter le calcul pour ne pas bloquer l'UI
      setTimeout(async () => {
        try {
          // 🔍 DEBUG DÉTAILLÉ: Informations de la chaîne
          console.log('🔍 [EPGCompact] ANALYSE CHANNEL:', {
            name: channel.name,
            tvgId: channel.tvgId || 'N/A',
            epgId: channel.epgId || 'N/A',
            group: channel.group || 'N/A',
            category: channel.category || 'N/A',
          });

          // 0. Vérification du cache de matches (super-rapide)
          const cacheKey = `${channel.name}|${channel.tvgId || ''}|${
            channel.epgId || ''
          }`;
          if (channelMatchCache.has(cacheKey)) {
            const cachedEpgId = channelMatchCache.get(cacheKey)!;
            console.log(
              `⚡ [EPGCompact] Match trouvé dans cache: ${channel.name} -> ${cachedEpgId}`,
            );

            // Rechercher la chaîne EPG correspondante
            const cachedEpgChannel = epgCache.fullEPG?.channels.find(
              ch => ch.id === cachedEpgId,
            );
            if (cachedEpgChannel) {
              const programs = processPrograms(
                epgCache.fullEPG?.programmes.filter(
                  p => p.channel === cachedEpgId,
                ) || [],
              );
              resolve(programs);
              return;
            }
          }

          // 1. Recherche O(1) dans l'index
          const normalizedName = normalizeName(channel.name);
          let epgChannel = epgCache.channelIndex.get(normalizedName);

          // 2. Fallback sur recherche par similarité si pas trouvé dans l'index
          if (!epgChannel) {
            console.log(
              `🔍 [EPGCompact] Recherche par similarité pour: ${channel.name} (pas dans l'index)`,
            );
            console.log(`🔍 [EPGCompact] Nom normalisé: "${normalizedName}"`);
            console.log(
              `🔍 [EPGCompact] Index channels: ${epgCache.channelIndex.size}`,
            );
            console.log(
              `🔍 [EPGCompact] Loading chunked: ${epgCache.isLoadingChunked}`,
            );
            console.log(
              `🔍 [EPGCompact] Full EPG: ${
                epgCache.fullEPG
                  ? `${epgCache.fullEPG.channels.length} channels`
                  : 'null'
              }`,
            );

            // 🔍 DEBUG: Montrer quelques chaînes index pour comparaison
            if (epgCache.channelIndex.size > 0) {
              const indexSample = Array.from(
                epgCache.channelIndex.keys(),
              ).slice(0, 5);
              console.log('🔍 [EPGCompact] Échantillon index:', indexSample);
            }

            // 🎯 TiviMate Style : Essayer SQLite d'abord si chargement en cours
            if (epgCache.isLoadingChunked) {
              console.log(
                `🔄 [EPGCompact] Chargement TiviMate en cours - tentative recherche SQLite directe pour: ${channel.name}`,
              );

              // Essayer de trouver le channel dans SQLite par nom
              try {
                const sqliteStorage = new SQLiteEPGStorage();
                const sqliteChannels = await sqliteStorage.getAllChannels();
                epgChannel =
                  findBestMatchingChannel(
                    channel.name,
                    sqliteChannels,
                    channel.tvgId,
                    channel.epgId,
                  ) || undefined;
                if (epgChannel) {
                  console.log(
                    `✅ [EPGCompact] Chaîne trouvée dans SQLite: "${epgChannel.displayName}" (ID: ${epgChannel.id})`,
                  );
                }
              } catch (sqliteError) {
                console.log(
                  `❌ [EPGCompact] Erreur recherche SQLite: ${sqliteError}`,
                );
              }
            }

            // Fallback sur cache mémoire si pas trouvé dans SQLite
            if (
              !epgChannel &&
              epgCache.fullEPG &&
              epgCache.fullEPG.channels.length > 0
            ) {
              console.log(
                `🔍 [EPGCompact] Recherche dans cache mémoire pour: ${channel.name}`,
              );
              epgChannel =
                findBestMatchingChannel(
                  channel.name,
                  epgCache.fullEPG.channels,
                  channel.tvgId,
                  channel.epgId,
                ) || undefined;

              if (epgChannel) {
                console.log(
                  `✅ [EPGCompact] Similarité trouvée dans cache: "${epgChannel.displayName}" (ID: ${epgChannel.id})`,
                );
              } else {
                console.log(
                  `❌ [EPGCompact] Aucune similarité trouvée pour: ${channel.name}`,
                );
                // Debug: montrer quelques chaînes EPG disponibles
                const sampleChannels = epgCache.fullEPG.channels
                  .slice(0, 5)
                  .map(ch => `"${ch.displayName}"`);
                console.log(
                  `🔍 [EPGCompact] Exemples de chaînes EPG: ${sampleChannels.join(
                    ', ',
                  )}`,
                );
              }
            }
          }

          if (!epgChannel) {
            console.log(
              `❌ [EPGCompact] Aucune chaîne EPG trouvée pour: ${channel.name}`,
            );
            resolve([]);
            return;
          }

          console.log(
            `✅ [EPGCompact] Chaîne EPG trouvée: ${epgChannel.displayName} pour ${channel.name}`,
          );
          console.log(
            `🔍 [EPGCompact] État EPGCache - isLoadingChunked: ${
              epgCache.isLoadingChunked
            }, fullEPG: ${epgCache.fullEPG ? 'Disponible' : 'null'}`,
          );

          // 💾 Sauvegarder le match dans le cache pour les futures recherches
          channelMatchCache.set(cacheKey, epgChannel.id);
          console.log(
            `💾 [EPGCompact] Match sauvegardé dans cache: ${channel.name} -> ${epgChannel.id}`,
          );

          // 🎯 TiviMate Style : Chercher directement dans SQLite si chargement en cours
          let channelPrograms: any[] = [];

          if (epgCache.isLoadingChunked) {
            console.log(
              `🔄 [EPGCompact] Chargement TiviMate en cours - recherche directe SQLite pour ${epgChannel.displayName}`,
            );
            // Chercher directement dans SQLite pendant le chargement
            channelPrograms = await epgCache.getProgramsForChannelFromSQLite(
              epgChannel.id,
            );
            console.log(
              `📊 [EPGCompact] SQLite direct: ${channelPrograms.length} programmes trouvés`,
            );
          } else if (epgCache.fullEPG) {
            console.log(
              `💾 [EPGCompact] Chargement terminé - recherche dans cache mémoire pour ${epgChannel.displayName}`,
            );
            // Utiliser le cache mémoire si chargement terminé
            channelPrograms = epgCache.fullEPG.programmes.filter(
              p => p.channel === epgChannel!.id,
            );
            console.log(
              `💾 [EPGCompact] Cache mémoire: ${channelPrograms.length} programmes trouvés`,
            );
          } else {
            console.log(
              `❌ [EPGCompact] Aucune source de données disponible - isLoadingChunked: ${
                epgCache.isLoadingChunked
              }, fullEPG: ${epgCache.fullEPG ? 'ok' : 'null'}`,
            );
          }

          console.log(
            `📺 [EPGCompact] ${channelPrograms.length} programmes trouvés pour ${epgChannel.displayName}`,
          );

          const programs = processPrograms(channelPrograms);
          resolve(programs);
        } catch (error) {
          console.error('❌ [EPGCompact] Erreur recherche cache:', error);
          resolve([]);
        }
      }, 0);
    });
  };

  // ÉTAPE 3: Mise à jour progression supprimée pour éviter re-renders

  // --- Fonctions utilitaires ---

  // Fonctions utilitaires optimisées

  // 🚀 ALGORITHME MATCHING EPG ROBUSTE basé sur standards IPTV
  const findBestMatchingChannel = (
    m3uChannelName: string,
    epgChannels: EPGChannel[],
    tvgId?: string, // Paramètre pour tvg-id
    epgId?: string, // Paramètre pour epg-id (alternative)
  ): EPGChannel | null => {
    // ✅ Validation: Vérifier que m3uChannelName est défini
    if (!m3uChannelName || typeof m3uChannelName !== 'string') {
      console.warn('⚠️ [EPGCompact] m3uChannelName invalide:', m3uChannelName);
      return null;
    }

    console.log(
      `🔍 [EPGCompact] Recherche EPG pour: "${m3uChannelName}" | tvg-id: "${
        tvgId || 'N/A'
      }" | epg-id: "${epgId || 'N/A'}"`,
    );

    // 🥇 PRIORITÉ 1A: Matching par TVG-ID (norme IPTV principale)
    if (tvgId && tvgId.trim() !== '') {
      console.log(`🔍 [EPGCompact] Recherche par TVG-ID: "${tvgId}"`);

      for (const epgChannel of epgChannels) {
        // ✅ Validation: Vérifier que epgChannel.id est défini
        if (!epgChannel.id) continue;

        // Comparaison exacte avec l'ID du channel EPG
        if (epgChannel.id === tvgId) {
          console.log(
            `🎯 [EPGCompact] MATCH PARFAIT TVG-ID: "${epgChannel.displayName}" (ID: ${epgChannel.id})`,
          );
          return epgChannel;
        }

        // Comparaison case-insensitive pour plus de robustesse
        if (epgChannel.id.toLowerCase() === tvgId.toLowerCase()) {
          console.log(
            `🎯 [EPGCompact] MATCH TVG-ID (case-insensitive): "${epgChannel.displayName}" (ID: ${epgChannel.id})`,
          );
          return epgChannel;
        }
      }

      console.log(`⚠️ [EPGCompact] Aucun match TVG-ID trouvé pour: "${tvgId}"`);
    }

    // 🥇 PRIORITÉ 1B: Matching par EPG-ID (alternative au tvg-id)
    if (epgId && epgId.trim() !== '') {
      console.log(`🔍 [EPGCompact] Recherche par EPG-ID: "${epgId}"`);

      for (const epgChannel of epgChannels) {
        // ✅ Validation: Vérifier que epgChannel.id est défini
        if (!epgChannel.id) continue;

        // Comparaison exacte avec l'ID du channel EPG
        if (epgChannel.id === epgId) {
          console.log(
            `🎯 [EPGCompact] MATCH PARFAIT EPG-ID: "${epgChannel.displayName}" (ID: ${epgChannel.id})`,
          );
          return epgChannel;
        }

        // Comparaison case-insensitive
        if (epgChannel.id.toLowerCase() === epgId.toLowerCase()) {
          console.log(
            `🎯 [EPGCompact] MATCH EPG-ID (case-insensitive): "${epgChannel.displayName}" (ID: ${epgChannel.id})`,
          );
          return epgChannel;
        }
      }

      console.log(`⚠️ [EPGCompact] Aucun match EPG-ID trouvé pour: "${epgId}"`);
    }

    // 🥈 PRIORITÉ 2: Matching par display-name exact
    const normalizedM3UName = normalizeName(m3uChannelName);
    console.log(
      `🔍 [EPGCompact] Recherche par nom normalisé: "${normalizedM3UName}"`,
    );

    for (const epgChannel of epgChannels) {
      // ✅ Validation: Vérifier que epgChannel.displayName est défini
      if (!epgChannel.displayName || typeof epgChannel.displayName !== 'string') {
        continue;
      }

      const normalizedEPGName = normalizeName(epgChannel.displayName);

      if (normalizedEPGName === normalizedM3UName) {
        console.log(
          `🎯 [EPGCompact] MATCH EXACT display-name: "${epgChannel.displayName}"`,
        );
        return epgChannel;
      }
    }

    // 🥉 PRIORITÉ 3: Fuzzy matching intelligent avec multiple critères
    let bestMatch: EPGChannel | null = null;
    let highestScore = 0;
    let matchDetails: Array<{
      name: string;
      id: string;
      score: number;
      method: string;
    }> = [];

    for (const epgChannel of epgChannels) {
      // ✅ Validation: Vérifier que epgChannel.displayName est défini
      if (!epgChannel.displayName || typeof epgChannel.displayName !== 'string') {
        continue;
      }

      const normalizedEPGName = normalizeName(epgChannel.displayName);
      let score = 0;
      let method = '';

      // Méthode 1: Inclusion mutuelle (comme avant)
      if (
        normalizedEPGName.includes(normalizedM3UName) ||
        normalizedM3UName.includes(normalizedEPGName)
      ) {
        score = Math.max(
          normalizedM3UName.length / normalizedEPGName.length,
          normalizedEPGName.length / normalizedM3UName.length,
        );
        method = 'inclusion';
      }

      // Méthode 2: Similarité par mots-clés (nouveau)
      const m3uWords = m3uChannelName
        .toLowerCase()
        .split(/\s+|[^a-z0-9]+/)
        .filter(w => w.length > 2);
      const epgWords = epgChannel.displayName
        .toLowerCase()
        .split(/\s+|[^a-z0-9]+/)
        .filter(w => w.length > 2);

      if (m3uWords.length > 0 && epgWords.length > 0) {
        const commonWords = m3uWords.filter(word =>
          epgWords.some(
            epgWord => epgWord.includes(word) || word.includes(epgWord),
          ),
        );
        const keywordScore =
          commonWords.length / Math.max(m3uWords.length, epgWords.length);

        if (keywordScore > score) {
          score = keywordScore;
          method = 'keywords';
        }
      }

      // Méthode 3: Similarité phonétique simple (suppression voyelles)
      const phoneticM3U = normalizedM3UName.replace(/[aeiou]/g, '');
      const phoneticEPG = normalizedEPGName.replace(/[aeiou]/g, '');

      if (phoneticM3U.length > 3 && phoneticEPG.length > 3) {
        if (
          phoneticEPG.includes(phoneticM3U) ||
          phoneticM3U.includes(phoneticEPG)
        ) {
          const phoneticScore =
            Math.max(
              phoneticM3U.length / phoneticEPG.length,
              phoneticEPG.length / phoneticM3U.length,
            ) * 0.8; // Score légèrement réduit car moins précis

          if (phoneticScore > score) {
            score = phoneticScore;
            method = 'phonetic';
          }
        }
      }

      if (score > 0) {
        matchDetails.push({
          name: epgChannel.displayName,
          id: epgChannel.id,
          score: parseFloat(score.toFixed(3)),
          method,
        });

        if (score > highestScore) {
          highestScore = score;
          bestMatch = epgChannel;
        }
      }
    }

    // Debug: Afficher les meilleurs matches
    if (matchDetails.length > 0) {
      const topMatches = matchDetails
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      console.log('🔍 [EPGCompact] Top 5 matches fuzzy:', topMatches);
    }

    // Seuils adaptatifs selon la méthode
    const getThreshold = (method: string) => {
      switch (method) {
        case 'inclusion':
          return 0.7;
        case 'keywords':
          return 0.6;
        case 'phonetic':
          return 0.75;
        default:
          return 0.7;
      }
    };

    const finalMatch = matchDetails.find(m => m.score === highestScore);
    const threshold = finalMatch ? getThreshold(finalMatch.method) : 0.7;

    if (bestMatch && highestScore >= threshold) {
      console.log(
        `✅ [EPGCompact] MATCH FUZZY sélectionné: "${
          bestMatch.displayName
        }" (score: ${highestScore.toFixed(3)}, méthode: ${finalMatch?.method})`,
      );
      return bestMatch;
    } else {
      console.log(
        `❌ [EPGCompact] Aucun match suffisant (seuil: ${threshold}, meilleur: ${highestScore.toFixed(
          3,
        )})`,
      );

      // Debug: Montrer quelques chaînes EPG disponibles pour aider au debug
      const sampleChannels = epgChannels
        .slice(0, 3)
        .map(ch => `"${ch.displayName}" (ID: ${ch.id})`);
      console.log(
        `🔍 [EPGCompact] Exemples chaînes EPG disponibles: ${sampleChannels.join(
          ', ',
        )}`,
      );

      return null;
    }
  };

  const normalizeName = (name: string): string => {
    // ✅ Validation: Vérifier que name est défini
    if (!name || typeof name !== 'string') {
      return '';
    }
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  const parseXMLTVTime = (xmltvTime: string): Date | null => {
    if (!xmltvTime || typeof xmltvTime !== 'string') {
      return null;
    }

    // Support pour les deux formats:
    // Format 1: "20250929233600 +0000" (standard XMLTV)
    // Format 2: "20250929T233600Z +0000" (format ISO avec timezone)
    const cleanedTime = xmltvTime.replace(/T|Z/g, '').trim();

    const match = cleanedTime.match(
      /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})?$/,
    );

    if (!match) {
      // Log seulement en mode debug pour éviter spam
      if (__DEV__) {
        console.warn(
          `[EPGCompact] Format de temps XMLTV invalide, ignoré: "${xmltvTime}"`,
        );
      }
      return null;
    }

    const [, year, month, day, hour, minute, second, timezone] = match;
    const dateStr = `${year}-${month}-${day}T${hour}:${minute}:${second}`;

    if (timezone) {
      const sign = timezone[0];
      const tzHours = timezone.substring(1, 3);
      const tzMinutes = timezone.substring(3, 5);
      return new Date(`${dateStr}${sign}${tzHours}:${tzMinutes}`);
    }

    return new Date(dateStr + 'Z'); // Fuseau horaire UTC par défaut
  };

  const processPrograms = (programs: EPGProgramme[]): CompactProgram[] => {
    try {
      // NOTE: This 'now' is for the initial processing. The 'now' state handles real-time updates for progress.
      const initialNow = new Date();

      const cleanedAndSortedPrograms = programs
        .map(prog => {
          const startTime = parseXMLTVTime(prog.start);
          const endTime = parseXMLTVTime(prog.stop);
          if (!startTime || !endTime || endTime <= startTime) {
            return null;
          }
          return {...prog, _startTime: startTime, _endTime: endTime};
        })
        .filter((prog): prog is NonNullable<typeof prog> => prog !== null)
        .sort((a, b) => a._startTime.getTime() - b._startTime.getTime());

      console.log(
        `🔍 [EPGCompact] processPrograms: ${
          cleanedAndSortedPrograms.length
        } programmes valides. Heure initiale: ${initialNow.toISOString()}`,
      );

      if (cleanedAndSortedPrograms.length === 0) {
        return [];
      }

      const processed: CompactProgram[] = [];
      let liveProgramFound = false;

      // --- Étape 1: Trouver le programme en cours et les suivants ---
      const startIndex = cleanedAndSortedPrograms.findIndex(
        p => p._endTime > initialNow,
      );

      if (startIndex === -1) {
        console.log(
          '[EPGCompact] Aucune donnée de programme futur disponible.',
        );
        return []; // No future programs at all
      }

      // Check if the first future program is actually live now
      const potentialLiveProgram = cleanedAndSortedPrograms[startIndex];
      if (potentialLiveProgram._startTime <= initialNow) {
        liveProgramFound = true;
        const liveProgram = potentialLiveProgram;
        const progress =
          ((initialNow.getTime() - liveProgram._startTime.getTime()) /
            (liveProgram._endTime.getTime() -
              liveProgram._startTime.getTime())) *
          100;

        processed.push({
          id: `${liveProgram.channel}-${liveProgram.start}`,
          title: liveProgram.title,
          description:
            liveProgram.desc || generateDescription(liveProgram.title),
          startTime: liveProgram._startTime,
          endTime: liveProgram._endTime,
          isLive: true,
          progress: Math.max(0, Math.min(100, progress)),
          duration:
            (liveProgram._endTime.getTime() -
              liveProgram._startTime.getTime()) /
            60000,
          category: extractCategory(liveProgram.title),
        });
      }

      // --- Étape 2: Ajouter les programmes suivants ---
      const nextProgramsStartIndex = liveProgramFound
        ? startIndex + 1
        : startIndex;
      const maxPrograms = 6;

      for (
        let i = nextProgramsStartIndex;
        i < cleanedAndSortedPrograms.length && processed.length < maxPrograms;
        i++
      ) {
        const prog = cleanedAndSortedPrograms[i];
        processed.push({
          id: `${prog.channel}-${prog.start}`,
          title: prog.title,
          description: prog.desc || generateDescription(prog.title),
          startTime: prog._startTime,
          endTime: prog._endTime,
          isLive: false,
          duration:
            (prog._endTime.getTime() - prog._startTime.getTime()) / 60000,
          category: extractCategory(prog.title),
        });
      }

      console.log(
        `✅ [EPGCompact] processPrograms terminé: ${processed.length} programmes traités.`,
      );
      return processed;
    } catch (error) {
      console.error(
        '❌ [EPGCompact] Erreur lors du traitement des programmes:',
        error,
      );
      return [];
    }
  };

  // Générer une description courte basée sur le titre
  const generateDescription = (title: string): string => {
    // ✅ Validation: Vérifier que title est défini
    if (!title || typeof title !== 'string') {
      return 'Programme TV';
    }

    if (title.toLowerCase().includes('journal')) {
      return 'Actualités et informations';
    }
    if (title.toLowerCase().includes('météo')) {
      return 'Prévisions météorologiques';
    }
    if (title.toLowerCase().includes('sport')) {
      return 'Émission sportive';
    }
    if (title.toLowerCase().includes('film')) {
      return 'Long métrage cinéma';
    }
    if (title.toLowerCase().includes('série')) {
      return 'Série télévisée';
    }
    if (title.toLowerCase().includes('documentaire')) {
      return 'Documentaire éducatif';
    }
    if (title.toLowerCase().includes('enfant')) {
      return 'Programme jeunesse';
    }
    if (title.toLowerCase().includes('music')) {
      return 'Émission musicale';
    }
    if (title.toLowerCase().includes('cuisine')) {
      return 'Émission culinaire';
    }
    if (
      title.toLowerCase().includes('nature') ||
      title.toLowerCase().includes('animal')
    ) {
      return 'Documentaire animalier';
    }
    return 'Programme TV';
  };

  // Extraire la catégorie depuis le titre
  const extractCategory = (title: string): string => {
    // ✅ Validation: Vérifier que title est défini
    if (!title || typeof title !== 'string') {
      return 'DIVERS';
    }

    if (
      title.toLowerCase().includes('journal') ||
      title.toLowerCase().includes('info')
    ) {
      return 'INFO';
    }
    if (title.toLowerCase().includes('sport')) {
      return 'SPORT';
    }
    if (title.toLowerCase().includes('film')) {
      return 'FILM';
    }
    if (title.toLowerCase().includes('série')) {
      return 'SÉRIE';
    }
    if (title.toLowerCase().includes('doc')) {
      return 'DOC';
    }
    if (
      title.toLowerCase().includes('enfant') ||
      title.toLowerCase().includes('jeune')
    ) {
      return 'JEUNESSE';
    }
    if (title.toLowerCase().includes('music')) {
      return 'MUSIQUE';
    }
    return 'TV';
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'});

  // --- Rendu du composant ---

  if (!selectedChannel) {
    return (
      <View style={[styles.container, height ? {height} : {flex: 1}]}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Sélectionnez une chaîne</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, height ? {height} : {flex: 1}]}>
      {programs.length > 0 ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          style={styles.programsList}
          contentContainerStyle={styles.programsListContent}>
          {/* Section MAINTENANT - Compacte avec barre de progression en haut */}
          {programs
            .filter(p => p.isLive)
            .map(program => (
              <View
                key={`live-${program.id}`}
                style={styles.currentSectionCompact}>
                <View style={styles.sectionHeaderWithProgress}>
                  <Text style={styles.sectionHeader}>MAINTENANT</Text>
                  {/* Barre de progression en haut - TEMPS RÉEL */}
                  {program.isLive && (
                    <View style={styles.progressBarContainerTop}>
                      <View style={styles.progressBarSmall}>
                        <View
                          style={[
                            styles.progressBarFillSmall,
                            {
                              width: `${Math.round(
                                calculateLiveProgress(program),
                              )}%`,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.progressPercentageSmall}>
                        {Math.round(calculateLiveProgress(program))}%
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.programLineCompact}>
                  <View style={styles.programTimeRange}>
                    <Text style={styles.programTimeCompact}>
                      {formatTime(program.startTime)}
                    </Text>
                    <Text style={styles.programTimeEnd}>
                      {formatTime(program.endTime)}
                    </Text>
                  </View>
                  <View style={styles.programInfoExpanded}>
                    <View style={styles.titleWithIndicator}>
                      <Text
                        style={styles.programNameExpanded}
                        numberOfLines={2}>
                        {program.title}
                      </Text>
                      <View style={styles.liveIndicatorCompact} />
                    </View>
                  </View>
                </View>
                {program.description && (
                  <Text style={styles.programSubtitleCompact} numberOfLines={3}>
                    {program.description}
                  </Text>
                )}
              </View>
            ))}

          {/* Section ENSUITE */}
          {programs.filter(p => !p.isLive).length > 0 && (
            <View style={styles.upcomingSection}>
              <Text style={styles.sectionHeader}>ENSUITE</Text>
              {programs
                .filter(p => !p.isLive)
                .slice(0, 4)
                .map(program => (
                  <View
                    key={`upcoming-${program.id}`}
                    style={styles.upcomingProgram}>
                    <View style={styles.upcomingHeader}>
                      <View style={styles.upcomingTimeRange}>
                        <Text style={styles.programTime}>
                          {formatTime(program.startTime)}
                        </Text>
                        <Text style={styles.programTimeEnd}>
                          {formatTime(program.endTime)}
                        </Text>
                      </View>
                      <Text style={styles.programName} numberOfLines={1}>
                        {program.title}
                      </Text>
                    </View>
                    {program.description && (
                      <Text
                        style={styles.upcomingDescription}
                        numberOfLines={2}>
                        {program.description}
                      </Text>
                    )}
                  </View>
                ))}
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          {/* 🚀 Interface de chargement simple */}
          {isLoadingEPG ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Chargement du Guide TV</Text>
              <View style={styles.progressContainer}>
                <View style={styles.progressBarLoading}>
                  <View
                    style={[
                      styles.progressFill,
                      {width: `${loadingProgress}%`},
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>{loadingProgress}%</Text>
              </View>
            </View>
          ) : (
            <View style={styles.statusContainer}>
              <StatusText status={epgStatus} />

              {/* 🚨 AVERTISSEMENT QUALITÉ EPG */}
              {epgStatus.includes('programmes trouvés') && (
                <View style={styles.warningContainer}>
                  <Icon
                    name="warning"
                    size={20}
                    color="#FF9500"
                    style={styles.warningIcon}
                  />
                  <Text style={styles.warningText}>
                    Les données EPG peuvent être incorrectes ou obsolètes.
                    {'\n'}Vérifiez avec votre fournisseur IPTV.
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.surface.primary,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.ui.border,
    },

    // Liste des programmes - moderne avec gradient
    programsList: {
      flex: 1,
    },
    programsListContent: {
      paddingVertical: 16,
      paddingHorizontal: 16,
    },

    // Section MAINTENANT - style carte moderne
    currentSection: {
      backgroundColor: colors.accent.primary + '14', // 8% opacity
      marginBottom: 20,
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderLeftWidth: 4,
      borderLeftColor: colors.accent.primary,
    },

    // Section MAINTENANT - Version compacte avec plus d'espace
    currentSectionCompact: {
      backgroundColor: colors.accent.primary + '0F', // 6% opacity
      marginBottom: 16,
      paddingVertical: 16,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderLeftWidth: 3,
      borderLeftColor: colors.accent.primary,
    },

    // Section ENSUITE - espacements améliorés
    upcomingSection: {
      flex: 1,
      paddingTop: 8,
    },

    // Headers de sections - typographie moderne
    sectionHeader: {
      fontSize: 11,
      color: colors.accent.primary,
      fontWeight: '800',
      marginBottom: 12,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
    },

    // Header avec barre de progression
    sectionHeaderWithProgress: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },

    // Ligne de programme - espacement amélioré
    programLine: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },

    // Ligne de programme - Version compacte avec plus d'espace
    programLineCompact: {
      flexDirection: 'row',
      alignItems: 'flex-start', // Changé pour permettre au texte de s'étendre
      marginBottom: 10, // Augmenté pour plus d'espace avec la description
    },

    // Heure du programme - typographie moderne
    programTime: {
      fontFamily: 'monospace',
      fontSize: 12,
      color: colors.accent.primary,
      fontWeight: '700',
      minWidth: 44,
      marginRight: 16,
    },

    // Heure du programme - Version compacte
    programTimeCompact: {
      fontFamily: 'monospace',
      fontSize: 11,
      color: colors.accent.primary,
      fontWeight: '600',
    },

    // Conteneur pour plage horaire (début - fin) - optimisé
    programTimeRange: {
      flexDirection: 'column',
      alignItems: 'flex-start',
      minWidth: 45, // Réduit pour donner plus de place au titre
      marginRight: 10, // Réduit pour optimiser l'espace
    },

    // Heure de fin du programme
    programTimeEnd: {
      fontFamily: 'monospace',
      fontSize: 9,
      color: colors.text.tertiary,
      fontWeight: '500',
      marginTop: 1,
    },

    // Informations du programme - espacement moderne
    programInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },

    // Informations du programme - Version compacte
    programInfoCompact: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },

    // Informations du programme - Version étendue pour plus de place
    programInfoExpanded: {
      flex: 1,
      flexDirection: 'column', // Changé en colonne pour plus d'espace vertical
      alignItems: 'flex-start',
    },

    // Nom du programme - contraste amélioré
    programName: {
      flex: 1,
      fontSize: 14,
      fontWeight: '700',
      color: colors.text.primary,
      lineHeight: 20,
    },

    // Nom du programme - Version compacte
    programNameCompact: {
      flex: 1,
      fontSize: 12,
      fontWeight: '600',
      color: colors.text.primary,
      lineHeight: 16,
    },

    // Nom du programme - Version étendue (2 lignes)
    programNameExpanded: {
      flex: 1,
      fontSize: 13,
      fontWeight: '700',
      color: colors.text.primary,
      lineHeight: 18,
    },

    // Conteneur titre avec indicateur LIVE
    titleWithIndicator: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      width: '100%',
      gap: 8,
    },

    // Indicateur LIVE - style moderne avec glow
    liveIndicator: {
      width: 8,
      height: 8,
      backgroundColor: colors.accent.error,
      borderRadius: 4,
      shadowColor: '#FF3B30',
      shadowOffset: {width: 0, height: 0},
      shadowOpacity: 0.8,
      shadowRadius: 4,
      elevation: 4,
    },

    // Indicateur LIVE - Version compacte
    liveIndicatorCompact: {
      width: 6,
      height: 6,
      backgroundColor: colors.accent.error,
      borderRadius: 3,
      shadowColor: '#FF3B30',
      shadowOffset: {width: 0, height: 0},
      shadowOpacity: 0.6,
      shadowRadius: 2,
      elevation: 2,
    },

    // Progression simple - style moderne
    progressSimple: {
      fontSize: 11,
      color: colors.accent.error,
      fontWeight: '800',
      minWidth: 35,
      textAlign: 'right',
    },

    // Progression - Version compacte
    progressCompact: {
      fontSize: 10,
      color: colors.accent.error,
      fontWeight: '700',
      minWidth: 30,
      textAlign: 'right',
    },

    // Sous-titre du programme - espacement moderne
    programSubtitle: {
      fontSize: 11,
      color: colors.text.secondary,
      marginLeft: 60,
      marginTop: 4,
      fontStyle: 'italic',
      lineHeight: 16,
    },

    // Sous-titre du programme - Version compacte avec plus d'espace
    programSubtitleCompact: {
      fontSize: 11,
      color: colors.text.secondary,
      marginLeft: 55, // Aligné avec le titre
      marginTop: 6, // Plus d'espace au-dessus
      fontStyle: 'italic',
      lineHeight: 16, // Augmenté pour plus de lisibilité
      marginRight: 8, // Espace à droite pour éviter la coupure
    },

    // Lignes de programmes suivants - style carte
    upcomingLine: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.02)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.06)',
    },

    // Programme suivant avec description
    upcomingProgram: {
      marginBottom: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.08)',
    },

    // Header du programme suivant
    upcomingHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },

    // Plage horaire pour programmes suivants
    upcomingTimeRange: {
      flexDirection: 'column',
      alignItems: 'flex-start',
      minWidth: 50,
      marginRight: 12,
    },

    // Conteneur barre de progression - en haut à droite
    progressBarContainerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      justifyContent: 'flex-end',
    },

    // Barre de progression petite - en haut
    progressBarSmall: {
      width: 60,
      height: 2,
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      borderRadius: 1,
      marginRight: 6,
      overflow: 'hidden',
    },

    // Remplissage de la barre de progression petite
    progressBarFillSmall: {
      height: '100%',
      backgroundColor: colors.accent.primary,
      borderRadius: 1,
    },

    // Pourcentage de progression petit
    progressPercentageSmall: {
      fontSize: 8,
      color: colors.accent.primary,
      fontWeight: '600',
      minWidth: 24,
      textAlign: 'right',
    },

    // Conteneur barre de progression (ancien - gardé pour compatibilité)
    progressBarContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      marginLeft: 62, // Aligné avec le contenu
    },

    // Barre de progression
    progressBar: {
      flex: 1,
      height: 3,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 1.5,
      marginRight: 8,
      overflow: 'hidden',
    },

    // Remplissage de la barre de progression
    progressBarFill: {
      height: '100%',
      backgroundColor: colors.accent.error,
      borderRadius: 1.5,
    },

    // Pourcentage de progression
    progressPercentage: {
      fontSize: 9,
      color: colors.accent.error,
      fontWeight: '600',
      minWidth: 28,
      textAlign: 'right',
    },

    // Description du programme suivant
    upcomingDescription: {
      fontSize: 11,
      color: colors.text.secondary,
      lineHeight: 16,
      marginLeft: 44,
      fontStyle: 'italic',
    },

    // Badge catégorie - style moderne
    categoryBadgeSmall: {
      backgroundColor: colors.surface.elevated,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      marginLeft: 12,
      borderWidth: 1,
      borderColor: '#444444',
    },

    categoryTextSmall: {
      color: colors.text.secondary,
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: 0.5,
    },

    // État vide - moderne avec indicateurs de chargement élégants
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
      paddingHorizontal: 20,
    },
    emptyText: {
      color: colors.text.tertiary,
      fontSize: 13,
      fontWeight: '400',
      textAlign: 'center',
      fontStyle: 'italic',
    },

    // 🚀 Interface de chargement simple et discrète
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      paddingHorizontal: 12,
      minHeight: 80,
    },

    loadingText: {
      color: colors.text.secondary,
      fontSize: 13,
      fontWeight: '500',
      marginBottom: 12,
    },

    progressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      maxWidth: 160,
    },

    progressBarLoading: {
      flex: 1,
      height: 3,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 2,
      marginRight: 8,
      overflow: 'hidden',
    },

    progressFill: {
      height: '100%',
      backgroundColor: colors.accent.primary,
      borderRadius: 2,
    },

    progressText: {
      color: '#888888',
      fontSize: 11,
      fontWeight: '500',
      minWidth: 28,
      textAlign: 'right',
    },

    // Styles pour les composants d'icônes Material Design
    iconTextContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 4, // Espacement vertical entre les éléments
    },

    iconTextIcon: {
      marginRight: 8,
    },

    iconTextLabel: {
      fontSize: 14,
      fontWeight: '500',
    },

    // Conteneur pour les statuts non-chargement
    statusContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 20,
      paddingHorizontal: 12,
      minHeight: 80,
    },

    // 🚨 Styles pour l'avertissement qualité EPG
    warningContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: 'rgba(255, 149, 0, 0.1)',
      borderColor: '#FF9500',
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      marginTop: 16,
      maxWidth: '100%',
    },

    warningIcon: {
      marginRight: 8,
      marginTop: 2,
    },

    warningText: {
      flex: 1,
      fontSize: 12,
      color: '#FF9500',
      lineHeight: 16,
      fontWeight: '500',
    },
  });

export default EPGCompact;
