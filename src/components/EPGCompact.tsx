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
import {
  FullEPGData,
  EPGChannel,
  EPGProgramme,
} from '../services/XtreamEPGService';
import { EPGCacheManager } from '../services/epg/EPGCacheManager';
import { SQLiteEPGStorage } from '../services/epg/SQLiteEPGStorage';
import { PlaylistMetadata } from '../services/playlist/PlaylistManager';

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

// Composant pour afficher une icône avec texte
const IconText: React.FC<{icon: string; text: string; color?: string; size?: number}> = ({
  icon,
  text,
  color = '#FFFFFF',
  size = 16,
}) => (
  <View style={styles.iconTextContainer}>
    <Icon name={icon} size={size} color={color} style={styles.iconTextIcon} />
    <Text style={[styles.iconTextLabel, {color}]}>{text}</Text>
  </View>
);

// Composant pour afficher un statut avec icône appropriée
const StatusText: React.FC<{status: string}> = ({status}) => {
  const getStatusIcon = (status: string) => {
    if (status.includes('disponible')) return 'check-circle';
    if (status.includes('Vérification') || status.includes('indexé')) return 'search';
    if (status.includes('Erreur')) return 'error';
    if (status.includes('Pas de Guide') || status.includes('non chargé')) return 'cloud-download';
    if (status.includes('Aucun programme')) return 'info';
    if (status.includes('se charge') || status.includes('Initialisation')) return 'hourglass-empty';
    if (status.includes('Recherche')) return 'search';
    return 'tv';
  };

  const getStatusColor = (status: string) => {
    if (status.includes('disponible')) return '#4CAF50';
    if (status.includes('Erreur')) return '#F44336';
    if (status.includes('Pas de Guide') || status.includes('non chargé')) return '#FF9800';
    if (status.includes('Aucun programme')) return '#FFC107';
    return '#888';
  };

  return (
    <IconText
      icon={getStatusIcon(status)}
      text={status}
      color={getStatusColor(status)}
      size={16}
    />
  );
};

const EPGCompact: React.FC<EPGCompactProps> = ({selectedChannel, height, playlistId, playlistMetadata}) => {
  const [programs, setPrograms] = useState<CompactProgram[]>([]);
  const [epgStatus, setEpgStatus] = useState("Guide TV prêt");
  const currentChannelRef = useRef<string | null>(null);
  const backgroundTaskRef = useRef<boolean>(false);

  // 🚀 TiviMate Style : État du chargement progressif
  const [isLoadingEPG, setIsLoadingEPG] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isCacheReady, setIsCacheReady] = useState(false); // ✅ NOUVEL ÉTAT

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
      setEpgStatus("Vérification des données TV...");
      console.log('🔍 [EPGCompact] Vérification des données EPG existantes...');

      const progressCallback = (progress: number) => {
        setLoadingProgress(progress);
        setEpgStatus(`Guide TV: ${progress}% indexé`);
      };

      setIsLoadingEPG(true);
      const hasExistingData = await epgCache.loadExistingDataChunked(progressCallback);

      if (hasExistingData) {
        console.log('✅ [EPGCompact] EPG chargé depuis le cache TiviMate style');
        setEpgStatus("Guide TV disponible");
      } else {
        console.log('📭 [EPGCompact] 1er démarrage - Aucune donnée EPG trouvée');
        setEpgStatus("Pas de Guide TV - Téléchargez depuis Paramètres");
      }
      
      setIsLoadingEPG(false);
      setIsCacheReady(true); // ✅ Le cache est prêt (ou vide), on peut continuer

    } catch (error) {
      console.error('❌ [EPGCompact] Erreur chargement TiviMate style:', error);
      setEpgStatus("Erreur Guide TV - Vérifiez les paramètres");
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
        console.log(`🔄 [EPGCompact] Cache en chargement, accès SQLite autorisé pour: ${selectedChannel.name}`);
        setEpgStatus('Recherche de programmes en cours...');
        // CONTINUER l'exécution (pas de return)
      } else {
        // ❌ Cache pas encore initialisé → Bloquer
        console.log(`⏳ [EPGCompact] Cache non prêt, en attente pour charger les programmes de: ${selectedChannel.name}`);
        setEpgStatus('Initialisation du Guide TV...');
        return;
      }
    }

    // Éviter les recherches multiples pour la même chaîne si déjà chargée
    if (currentChannelRef.current === selectedChannel.name && programs.length > 0) {
      return;
    }

    currentChannelRef.current = selectedChannel.name;
    console.log(`📺 [EPGCompact] Le cache est prêt. Recherche des programmes pour: ${selectedChannel.name}`);

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

    console.log('🔍 [EPGCompact] Recherche programmes TiviMate style pour:', channel.name);

    try {
      const foundPrograms = await findProgramsFromCache(channel);
      if (foundPrograms.length > 0) {
        epgCache.programsCache.set(cacheKey, foundPrograms);
        setPrograms(foundPrograms);
        setEpgStatus(`${foundPrograms.length} programmes disponibles`);
        console.log(`✅ [EPGCompact] ${foundPrograms.length} programmes trouvés pour ${channel.name}`);
      } else {
        setPrograms([]);
        if (epgCache.isLoadingChunked) {
          setEpgStatus('Guide TV se charge... Patientez quelques secondes');
        } else if (!epgCache.fullEPG || epgCache.fullEPG.channels.length === 0) {
          setEpgStatus('Guide TV non chargé - Allez dans Paramètres');
        } else {
          setEpgStatus(`Aucun programme trouvé pour "${channel.name}"`);
        }
        console.log(`❌ [EPGCompact] Aucun programme trouvé pour ${channel.name}`);
      }
    } catch (error) {
      console.error('❌ [EPGCompact] Erreur recherche programmes:', error);
      setPrograms([]);
      setEpgStatus('Erreur lors du chargement des programmes');
    }
  };


  const findProgramsFromCache = async (channel: any): Promise<CompactProgram[]> => {
    return new Promise((resolve) => {
      // Déporter le calcul pour ne pas bloquer l'UI
      setTimeout(async () => {
        try {
          // 1. Recherche O(1) dans l'index
          const normalizedName = normalizeName(channel.name);
          let epgChannel = epgCache.channelIndex.get(normalizedName);

          // 2. Fallback sur recherche par similarité si pas trouvé dans l'index
          if (!epgChannel) {
            console.log(`🔍 [EPGCompact] Recherche par similarité pour: ${channel.name} (pas dans l'index)`);
            console.log(`🔍 [EPGCompact] Nom normalisé: "${normalizedName}"`);
            console.log(`🔍 [EPGCompact] Index channels: ${epgCache.channelIndex.size}`);
            console.log(`🔍 [EPGCompact] Loading chunked: ${epgCache.isLoadingChunked}`);
            console.log(`🔍 [EPGCompact] Full EPG: ${epgCache.fullEPG ? `${epgCache.fullEPG.channels.length} channels` : 'null'}`);

            // 🎯 TiviMate Style : Essayer SQLite d'abord si chargement en cours
            if (epgCache.isLoadingChunked) {
              console.log(`🔄 [EPGCompact] Chargement TiviMate en cours - tentative recherche SQLite directe pour: ${channel.name}`);

              // Essayer de trouver le channel dans SQLite par nom
              try {
                const sqliteStorage = new SQLiteEPGStorage();
                const sqliteChannels = await sqliteStorage.getAllChannels();
                epgChannel = findBestMatchingChannel(channel.name, sqliteChannels) || undefined;
                if (epgChannel) {
                  console.log(`✅ [EPGCompact] Chaîne trouvée dans SQLite: "${epgChannel.displayName}" (ID: ${epgChannel.id})`);
                }
              } catch (sqliteError) {
                console.log(`❌ [EPGCompact] Erreur recherche SQLite: ${sqliteError}`);
              }
            }

            // Fallback sur cache mémoire si pas trouvé dans SQLite
            if (!epgChannel && epgCache.fullEPG && epgCache.fullEPG.channels.length > 0) {
              console.log(`🔍 [EPGCompact] Recherche dans cache mémoire pour: ${channel.name}`);
              epgChannel = findBestMatchingChannel(channel.name, epgCache.fullEPG.channels) || undefined;

              if (epgChannel) {
                console.log(`✅ [EPGCompact] Similarité trouvée dans cache: "${epgChannel.displayName}" (ID: ${epgChannel.id})`);
              } else {
                console.log(`❌ [EPGCompact] Aucune similarité trouvée pour: ${channel.name}`);
                // Debug: montrer quelques chaînes EPG disponibles
                const sampleChannels = epgCache.fullEPG.channels.slice(0, 5).map(ch => `"${ch.displayName}"`);
                console.log(`🔍 [EPGCompact] Exemples de chaînes EPG: ${sampleChannels.join(', ')}`);
              }
            }
          }

          if (!epgChannel) {
            console.log(`❌ [EPGCompact] Aucune chaîne EPG trouvée pour: ${channel.name}`);
            resolve([]);
            return;
          }

          console.log(`✅ [EPGCompact] Chaîne EPG trouvée: ${epgChannel.displayName} pour ${channel.name}`);
          console.log(`🔍 [EPGCompact] État EPGCache - isLoadingChunked: ${epgCache.isLoadingChunked}, fullEPG: ${epgCache.fullEPG ? 'Disponible' : 'null'}`);

          // 🎯 TiviMate Style : Chercher directement dans SQLite si chargement en cours
          let channelPrograms: any[] = [];

          if (epgCache.isLoadingChunked) {
            console.log(`🔄 [EPGCompact] Chargement TiviMate en cours - recherche directe SQLite pour ${epgChannel.displayName}`);
            // Chercher directement dans SQLite pendant le chargement
            channelPrograms = await epgCache.getProgramsForChannelFromSQLite(epgChannel.id);
            console.log(`📊 [EPGCompact] SQLite direct: ${channelPrograms.length} programmes trouvés`);
          } else if (epgCache.fullEPG) {
            console.log(`💾 [EPGCompact] Chargement terminé - recherche dans cache mémoire pour ${epgChannel.displayName}`);
            // Utiliser le cache mémoire si chargement terminé
            channelPrograms = epgCache.fullEPG.programmes.filter(
              p => p.channel === epgChannel!.id,
            );
            console.log(`💾 [EPGCompact] Cache mémoire: ${channelPrograms.length} programmes trouvés`);
          } else {
            console.log(`❌ [EPGCompact] Aucune source de données disponible - isLoadingChunked: ${epgCache.isLoadingChunked}, fullEPG: ${epgCache.fullEPG ? 'ok' : 'null'}`);
          }

          console.log(`📺 [EPGCompact] ${channelPrograms.length} programmes trouvés pour ${epgChannel.displayName}`);

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

  const findBestMatchingChannel = (
    m3uChannelName: string,
    epgChannels: EPGChannel[],
  ): EPGChannel | null => {
    const normalizedM3UName = normalizeName(m3uChannelName);
    let bestMatch: EPGChannel | null = null;
    let highestScore = 0;
    let partialMatches: Array<{name: string, score: number}> = [];

    console.log(`🔍 [EPGCompact] Recherche similitude pour: "${m3uChannelName}" → "${normalizedM3UName}"`);

    // Recherche rapide d'abord - correspondance exacte
    for (const epgChannel of epgChannels) {
      const normalizedEPGName = normalizeName(epgChannel.displayName);

      if (normalizedEPGName === normalizedM3UName) {
        console.log(`🎯 [EPGCompact] Match exact trouvé: "${epgChannel.displayName}"`);
        return epgChannel; // Match parfait trouvé
      }

      // Match partiel simple (plus rapide que edit distance)
      if (normalizedEPGName.includes(normalizedM3UName) || normalizedM3UName.includes(normalizedEPGName)) {
        const score = Math.max(
          normalizedM3UName.length / normalizedEPGName.length,
          normalizedEPGName.length / normalizedM3UName.length
        );

        partialMatches.push({name: epgChannel.displayName, score: parseFloat(score.toFixed(2))});

        if (score > highestScore) {
          highestScore = score;
          bestMatch = epgChannel;
        }
      }
    }

    console.log(`🔍 [EPGCompact] Matches partiels trouvés: ${partialMatches.length}`);
    if (partialMatches.length > 0) {
      const topMatches = partialMatches.sort((a, b) => b.score - a.score).slice(0, 3);
      console.log(`🔍 [EPGCompact] Top 3 matches:`, topMatches);
    }

    if (bestMatch && highestScore > 0.7) {
      console.log(`✅ [EPGCompact] Meilleur match sélectionné: "${bestMatch.displayName}" (score: ${highestScore.toFixed(2)})`);
      return bestMatch;
    } else {
      console.log(`❌ [EPGCompact] Aucun match suffisant (seuil: 0.7, meilleur: ${highestScore.toFixed(2)})`);
      return null;
    }
  };

  const normalizeName = (name: string): string =>
    name.toLowerCase().replace(/[^a-z0-9]/g, '');


  const parseXMLTVTime = (xmltvTime: string): Date => {
    const match = xmltvTime.match(
      /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})?$/,
    );
    if (!match) {
      return new Date();
    }
    const [, year, month, day, hour, minute, second, timezone] = match;
    const dateStr = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
    if (timezone) {
      const sign = timezone[0];
      const tzHours = timezone.substring(1, 3);
      const tzMinutes = timezone.substring(3, 5);
      return new Date(`${dateStr}${sign}${tzHours}:${tzMinutes}`);
    }
    return new Date(dateStr + 'Z');
  };

  const processPrograms = (programs: EPGProgramme[]): CompactProgram[] => {
    try {
      const now = new Date();
      const processed: CompactProgram[] = [];
      const sorted = programs.sort(
        (a, b) =>
          parseXMLTVTime(a.start).getTime() - parseXMLTVTime(b.start).getTime(),
      );

      // 🔍 DEBUG : Analyser les programmes reçus
      console.log(`🔍 [EPGCompact] processPrograms: ${programs.length} programmes à analyser`);
      if (programs.length > 0) {
        const firstProg = programs[0];
        const lastProg = programs[programs.length - 1];
        console.log(`🔍 [EPGCompact] Premier programme: ${firstProg.title} (${firstProg.start})`);
        console.log(`🔍 [EPGCompact] Dernier programme: ${lastProg.title} (${lastProg.start})`);
        console.log(`🔍 [EPGCompact] Maintenant: ${now.toISOString()}`);
      }

      // Trouver le programme actuel et les 4-5 programmes suivants
      let foundCurrent = false;
      let addedPrograms = 0;
      const maxPrograms = 6; // Programme actuel + 5 suivants

      for (const prog of sorted) {
        const startTime = parseXMLTVTime(prog.start);
        const endTime = parseXMLTVTime(prog.stop);

        // Programme actuel (en cours)
        if (startTime <= now && now < endTime) {
          foundCurrent = true;
          const progress = ((now.getTime() - startTime.getTime()) / (endTime.getTime() - startTime.getTime())) * 100;

          processed.push({
            id: `${prog.channel}-${prog.start}`,
            title: prog.title,
            description: prog.desc || generateDescription(prog.title),
            startTime,
            endTime,
            isLive: true,
            progress: Math.max(0, Math.min(100, progress)),
            duration: (endTime.getTime() - startTime.getTime()) / 60000,
            category: extractCategory(prog.title),
          });
          addedPrograms++;
        }
        // Programmes suivants
        else if (startTime > now && addedPrograms < maxPrograms) {
          processed.push({
            id: `${prog.channel}-${prog.start}`,
            title: prog.title,
            description: prog.desc || generateDescription(prog.title),
            startTime,
            endTime,
            isLive: false,
            duration: (endTime.getTime() - startTime.getTime()) / 60000,
            category: extractCategory(prog.title),
          });
          addedPrograms++;
        }

        // Arrêter si on a assez de programmes
        if (addedPrograms >= maxPrograms) break;
      }

      // Si aucun programme actuel trouvé, prendre les prochains programmes
      if (!foundCurrent && processed.length === 0) {
        console.log(`🔍 [EPGCompact] Aucun programme actuel/futur trouvé - fallback sur programmes récents`);

        // ✅ NOUVEAU : Fallback sur les programmes récents (dernières 24h + prochaines 24h)
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        const recentPrograms = sorted.filter(prog => {
          const startTime = parseXMLTVTime(prog.start);
          return startTime >= yesterday && startTime <= tomorrow;
        }).slice(0, maxPrograms);

        console.log(`🔍 [EPGCompact] Fallback: ${recentPrograms.length} programmes dans fenêtre 48h trouvés`);

        recentPrograms.forEach(prog => {
          const startTime = parseXMLTVTime(prog.start);
          const endTime = parseXMLTVTime(prog.stop);
          processed.push({
            id: `${prog.channel}-${prog.start}`,
            title: prog.title,
            description: prog.desc || generateDescription(prog.title),
            startTime,
            endTime,
            isLive: false,
            duration: (endTime.getTime() - startTime.getTime()) / 60000,
            category: extractCategory(prog.title),
          });
        });
      }

      console.log(`✅ [EPGCompact] processPrograms terminé: ${processed.length} programmes traités`);
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
    if (title.toLowerCase().includes('journal')) return 'Actualités et informations';
    if (title.toLowerCase().includes('météo')) return 'Prévisions météorologiques';
    if (title.toLowerCase().includes('sport')) return 'Émission sportive';
    if (title.toLowerCase().includes('film')) return 'Long métrage cinéma';
    if (title.toLowerCase().includes('série')) return 'Série télévisée';
    if (title.toLowerCase().includes('documentaire')) return 'Documentaire éducatif';
    if (title.toLowerCase().includes('enfant')) return 'Programme jeunesse';
    if (title.toLowerCase().includes('music')) return 'Émission musicale';
    if (title.toLowerCase().includes('cuisine')) return 'Émission culinaire';
    if (title.toLowerCase().includes('nature') || title.toLowerCase().includes('animal')) return 'Documentaire animalier';
    return 'Programme TV';
  };

  // Extraire la catégorie depuis le titre
  const extractCategory = (title: string): string => {
    if (title.toLowerCase().includes('journal') || title.toLowerCase().includes('info')) return 'INFO';
    if (title.toLowerCase().includes('sport')) return 'SPORT';
    if (title.toLowerCase().includes('film')) return 'FILM';
    if (title.toLowerCase().includes('série')) return 'SÉRIE';
    if (title.toLowerCase().includes('doc')) return 'DOC';
    if (title.toLowerCase().includes('enfant') || title.toLowerCase().includes('jeune')) return 'JEUNESSE';
    if (title.toLowerCase().includes('music')) return 'MUSIQUE';
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
          {programs.filter(p => p.isLive).map((program) => (
            <View key={`live-${program.id}`} style={styles.currentSectionCompact}>
              <View style={styles.sectionHeaderWithProgress}>
                <Text style={styles.sectionHeader}>MAINTENANT</Text>
                {/* Barre de progression en haut */}
                {program.progress !== undefined && (
                  <View style={styles.progressBarContainerTop}>
                    <View style={styles.progressBarSmall}>
                      <View style={[styles.progressBarFillSmall, {width: `${Math.round(program.progress)}%`}]} />
                    </View>
                    <Text style={styles.progressPercentageSmall}>
                      {Math.round(program.progress)}%
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
                    <Text style={styles.programNameExpanded} numberOfLines={2}>
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
              {programs.filter(p => !p.isLive).slice(0, 4).map((program) => (
                <View key={`upcoming-${program.id}`} style={styles.upcomingProgram}>
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
                    <Text style={styles.upcomingDescription} numberOfLines={2}>
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
          {/* 🚀 Interface de chargement intelligente */}
          {isLoadingEPG ? (
            <View style={styles.loadingContainer}>
              <IconText
                icon="tv"
                text="Chargement du Guide TV"
                color="#FFFFFF"
                size={18}
              />
              <View style={styles.progressContainer}>
                <View style={styles.progressBarLoading}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${loadingProgress}%` }
                    ]}
                  />
                  <View style={styles.progressGlow} />
                </View>
                <Text style={styles.progressText}>{loadingProgress}%</Text>
              </View>
              <IconText
                icon="settings"
                text="Préparation des programmes TV en arrière-plan"
                color="#CCCCCC"
                size={14}
              />
              <IconText
                icon={loadingProgress < 50 ? "flash-on" : "list"}
                text={loadingProgress < 50 ? "Lecture des chaînes..." : "Indexation des programmes..."}
                color="#888888"
                size={12}
              />
            </View>
          ) : (
            <StatusText status={epgStatus} />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1A1A', // Plus sombre et moderne
    borderRadius: 16, // Plus arrondi
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A', // Bordure subtile
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
    backgroundColor: 'rgba(0, 212, 170, 0.08)', // Fond subtil accent
    marginBottom: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#00D4AA',
  },

  // Section MAINTENANT - Version compacte avec plus d'espace
  currentSectionCompact: {
    backgroundColor: 'rgba(0, 212, 170, 0.06)', // Fond plus subtil
    marginBottom: 16,
    paddingVertical: 16, // Augmenté pour plus d'espace
    paddingHorizontal: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#00D4AA',
  },

  // Section ENSUITE - espacements améliorés
  upcomingSection: {
    flex: 1,
    paddingTop: 8,
  },

  // Headers de sections - typographie moderne
  sectionHeader: {
    fontSize: 11,
    color: '#00D4AA',
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
    color: '#00D4AA',
    fontWeight: '700',
    minWidth: 44,
    marginRight: 16,
  },

  // Heure du programme - Version compacte
  programTimeCompact: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#00D4AA',
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
    color: '#888',
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
    color: '#FFFFFF',
    lineHeight: 20,
  },

  // Nom du programme - Version compacte
  programNameCompact: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 16,
  },

  // Nom du programme - Version étendue (2 lignes)
  programNameExpanded: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
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
    backgroundColor: '#FF3B30',
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
    backgroundColor: '#FF3B30',
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
    color: '#FF3B30',
    fontWeight: '800',
    minWidth: 35,
    textAlign: 'right',
  },

  // Progression - Version compacte
  progressCompact: {
    fontSize: 10,
    color: '#FF3B30',
    fontWeight: '700',
    minWidth: 30,
    textAlign: 'right',
  },

  // Sous-titre du programme - espacement moderne
  programSubtitle: {
    fontSize: 11,
    color: '#B0B0B0',
    marginLeft: 60,
    marginTop: 4,
    fontStyle: 'italic',
    lineHeight: 16,
  },

  // Sous-titre du programme - Version compacte avec plus d'espace
  programSubtitleCompact: {
    fontSize: 11,
    color: '#B0B0B0',
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
    backgroundColor: '#00D4AA',
    borderRadius: 1,
  },

  // Pourcentage de progression petit
  progressPercentageSmall: {
    fontSize: 8,
    color: '#00D4AA',
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
    backgroundColor: '#FF3B30',
    borderRadius: 1.5,
  },

  // Pourcentage de progression
  progressPercentage: {
    fontSize: 9,
    color: '#FF3B30',
    fontWeight: '600',
    minWidth: 28,
    textAlign: 'right',
  },

  // Description du programme suivant
  upcomingDescription: {
    fontSize: 11,
    color: '#B0B0B0',
    lineHeight: 16,
    marginLeft: 44,
    fontStyle: 'italic',
  },

  // Badge catégorie - style moderne
  categoryBadgeSmall: {
    backgroundColor: '#333333',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 12,
    borderWidth: 1,
    borderColor: '#444444',
  },

  categoryTextSmall: {
    color: '#CCCCCC',
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
    color: '#888',
    fontSize: 13,
    fontWeight: '400',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // 🚀 TiviMate Style : Styles pour interface de chargement progressive
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },

  loadingTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },

  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 200,
    marginBottom: 15,
  },

  progressBarLoading: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 4,
    marginRight: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 170, 0.3)',
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#00D4AA',
    borderRadius: 3,
    position: 'relative',
    shadowColor: '#00D4AA',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },

  progressGlow: {
    position: 'absolute',
    top: 0,
    right: -2,
    width: 4,
    height: '100%',
    backgroundColor: '#00FFCC',
    borderRadius: 2,
    opacity: 0.8,
  },

  progressText: {
    color: '#00D4AA',
    fontSize: 14,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'right',
    textShadowColor: 'rgba(0, 212, 170, 0.5)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 4,
  },

  loadingSubtitle: {
    color: '#CCCCCC',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },

  loadingDetails: {
    color: '#888888',
    fontSize: 11,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },

  // Styles pour les composants d'icônes Material Design
  iconTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconTextIcon: {
    marginRight: 8,
  },

  iconTextLabel: {
    fontSize: 14,
    fontWeight: '500',
  },

});

export default EPGCompact;
