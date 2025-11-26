/**
 * 🚀 SpeedTestScreen - Écran moderne de test de vitesse avec speedomètre
 * Design inspiré des applications de test de débit professionnelles
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useThemeColors } from '../contexts/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../App';
import { useSpeedTest } from '../services/SpeedTestService';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Circle, Defs, LinearGradient as SvgLinearGradient, Stop, G, Text as SvgText, Line } from 'react-native-svg';
import { useI18n } from '../hooks/useI18n';
import Animated, { useSharedValue, useAnimatedProps, withSpring } from 'react-native-reanimated';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const { width, height } = Dimensions.get('window');
const SPEEDOMETER_SIZE = Math.min(width * 0.72, 300);
const STROKE_WIDTH = 16;
const RADIUS = (SPEEDOMETER_SIZE - STROKE_WIDTH) / 2;
const CENTER_X = SPEEDOMETER_SIZE / 2;
const CENTER_Y = SPEEDOMETER_SIZE / 2;

// Créer un composant Line animé avec react-native-reanimated
const AnimatedLine = Animated.createAnimatedComponent(Line);

const SpeedTestScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const colors = useThemeColors();
  const { t } = useI18n('speedtest');
  const { runTest, cancelTest, isTesting, progress, result, error } = useSpeedTest();

  // Animation avec react-native-reanimated (plus fluide que Animated de RN)
  const needleAngle = useSharedValue(180); // 180° = 0 Mbps (gauche du demi-cercle)
  const [pingHistory, setPingHistory] = useState<number[]>([]);
  const [downloadHistory, setDownloadHistory] = useState<number[]>([]);
  const [uploadHistory, setUploadHistory] = useState<number[]>([]);

  // États pour conserver les valeurs finales de chaque test
  const [finalDownloadSpeed, setFinalDownloadSpeed] = useState<number>(0);
  const [finalUploadSpeed, setFinalUploadSpeed] = useState<number>(0);
  const [finalPing, setFinalPing] = useState<number>(0);

  useEffect(() => {
    if (progress?.currentSpeed) {
      // Rotation de 0° (0 Mbps) à 180° (100 Mbps) pour un demi-cercle
      const maxSpeed = 100;
      const rotation = (Math.min(progress.currentSpeed, maxSpeed) / maxSpeed) * 180;
      // Calculer l'angle de l'aiguille : 180° = 0 Mbps, 0° = 100 Mbps
      const targetAngle = 180 - rotation;

      // Utiliser withSpring de react-native-reanimated pour animation fluide
      needleAngle.value = withSpring(targetAngle, {
        damping: 15,
        stiffness: 90,
      });

      // Mettre à jour l'historique des vitesses et conserver les valeurs finales
      if (progress.stage === 'ping' && progress.currentSpeed > 0) {
        setFinalPing(progress.currentSpeed);
      } else if (progress.stage === 'download') {
        setDownloadHistory(prev => [...prev.slice(-20), progress.currentSpeed]);
        // Conserver la dernière vitesse de download
        setFinalDownloadSpeed(progress.currentSpeed);
      } else if (progress.stage === 'upload') {
        setUploadHistory(prev => [...prev.slice(-20), progress.currentSpeed]);
        // Conserver la dernière vitesse d'upload
        setFinalUploadSpeed(progress.currentSpeed);
      }
      // Note: stage 'transition' n'affecte pas les valeurs finales, juste l'aiguille
    } else if (!isTesting && !result) {
      // Réinitialiser à 0 uniquement si pas de test en cours et pas de résultat
      needleAngle.value = withSpring(180, {
        damping: 15,
        stiffness: 90,
      });
    }
  }, [progress?.timestamp, progress?.currentSpeed, progress?.stage, isTesting, result]);

  // Réinitialiser les valeurs quand un nouveau test démarre
  useEffect(() => {
    if (isTesting && progress?.stage === 'idle') {
      setFinalDownloadSpeed(0);
      setFinalUploadSpeed(0);
      setFinalPing(0);
      setDownloadHistory([]);
      setUploadHistory([]);
      setPingHistory([]);
    }
  }, [isTesting, progress?.stage]);

  useEffect(() => {
    if (result) {
      // Mettre à jour l'historique avec les résultats finaux
      setPingHistory([result.ping]);
      setDownloadHistory(prev => prev.length > 0 ? prev : [result.download]);
      setUploadHistory(prev => prev.length > 0 ? prev : [result.upload]);
    }
  }, [result]);

  const handleStartTest = () => {
    if (isTesting) {
      cancelTest();
    } else {
      runTest();
    }
  };

  const getCurrentSpeed = () => {
    // Si test terminé, afficher le résultat upload (dernière mesure)
    if (result && progress?.stage === 'completed') {
      return result.upload; // Afficher upload car c'est la dernière mesure
    }
    // Pendant le test, afficher la vitesse courante
    return progress?.currentSpeed || 0;
  };

  const renderMiniGraph = (data: number[], maxValue: number = 100) => {
    if (data.length === 0) {
      return <View style={[styles.miniGraph, { backgroundColor: colors.ui.border + '30' }]} />;
    }

    const points = data.map((value, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * 100;
      const y = 100 - (value / maxValue) * 100;
      return `${x},${y}`;
    }).join(' ');

    return (
      <View style={[styles.miniGraph, { backgroundColor: colors.ui.border + '30' }]}>
        {/* SVG simple avec polyline - simulé avec des vues */}
        <View style={styles.graphContent}>
          {data.map((value, index) => {
            const height = (value / maxValue) * 100;
            return (
              <View
                key={index}
                style={[
                  styles.graphBar,
                  {
                    height: `${Math.min(height, 100)}%`,
                    backgroundColor: colors.accent.primary + '80',
                  },
                ]}
              />
            );
          })}
        </View>
      </View>
    );
  };

  // Fonction pour créer le path SVG d'un arc
  const createArcPath = (startAngle: number, endAngle: number, radius: number) => {
    const start = polarToCartesian(CENTER_X, CENTER_Y, radius, endAngle);
    const end = polarToCartesian(CENTER_X, CENTER_Y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return [
      'M', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(' ');
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 180) * Math.PI) / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  // Animation props pour l'aiguille SVG avec react-native-reanimated
  const animatedNeedleProps = useAnimatedProps(() => {
    const needleLength = RADIUS - 10;
    const needleAngleRad = (needleAngle.value * Math.PI) / 180;
    const needleEndX = CENTER_X + needleLength * Math.cos(needleAngleRad);
    const needleEndY = CENTER_Y - needleLength * Math.sin(needleAngleRad);

    return {
      x2: needleEndX,
      y2: needleEndY,
    };
  });

  const renderSpeedometer = () => {
    const currentSpeed = getCurrentSpeed();
    const maxSpeed = 100;
    const progressAngle = (Math.min(currentSpeed, maxSpeed) / maxSpeed) * 180;

    // Graduations : toutes les 5 Mbps
    const allTicks = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];

    // Graduations avec labels (tous les 10 Mbps + 0 et 100)
    const labeledTicks = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

    return (
      <View style={styles.speedometerContainer}>
        <Svg width={SPEEDOMETER_SIZE} height={SPEEDOMETER_SIZE / 2 + 70} viewBox={`-30 -10 ${SPEEDOMETER_SIZE + 60} ${SPEEDOMETER_SIZE / 2 + 90}`}>
          <Defs>
            {/* Dégradé pour l'arc de fond - gris foncé uniforme */}
            <SvgLinearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#3A4556" stopOpacity="1" />
              <Stop offset="100%" stopColor="#3A4556" stopOpacity="1" />
            </SvgLinearGradient>

            {/* Dégradé cyan pour la progression */}
            <SvgLinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#00D9FF" stopOpacity="1" />
              <Stop offset="100%" stopColor="#0EA5E9" stopOpacity="1" />
            </SvgLinearGradient>
          </Defs>

          {/* Arc de fond (demi-cercle complet) */}
          <Path
            d={createArcPath(0, 180, RADIUS)}
            stroke="url(#bgGradient)"
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeLinecap="round"
          />

          {/* Arc de progression (vitesse actuelle) */}
          {progressAngle > 0 && (
            <Path
              d={createArcPath(0, progressAngle, RADIUS)}
              stroke="url(#progressGradient)"
              strokeWidth={STROKE_WIDTH}
              fill="none"
              strokeLinecap="round"
            />
          )}

          {/* Toutes les graduations */}
          {allTicks.map((tick) => {
            const angle = (tick / 100) * 180;
            const tickRadius = RADIUS - STROKE_WIDTH / 2;
            const hasLabel = labeledTicks.includes(tick);
            const tickSize = hasLabel ? 10 : 5; // Graduations principales plus longues
            const innerPoint = polarToCartesian(CENTER_X, CENTER_Y, tickRadius - tickSize, angle);
            const outerPoint = polarToCartesian(CENTER_X, CENTER_Y, tickRadius + tickSize, angle);

            return (
              <G key={tick}>
                {/* Ligne de graduation */}
                <Line
                  x1={innerPoint.x}
                  y1={innerPoint.y}
                  x2={outerPoint.x}
                  y2={outerPoint.y}
                  stroke={colors.text.secondary}
                  strokeWidth={hasLabel ? 2.5 : 1.5}
                  strokeLinecap="round"
                />

                {/* Label de graduation (seulement pour les principales) */}
                {hasLabel && (
                  <SvgText
                    x={polarToCartesian(CENTER_X, CENTER_Y, tickRadius + 24, angle).x}
                    y={polarToCartesian(CENTER_X, CENTER_Y, tickRadius + 24, angle).y}
                    fill={colors.text.primary}
                    fontSize="11"
                    fontWeight="700"
                    textAnchor="middle"
                    alignmentBaseline="middle">
                    {tick} M
                  </SvgText>
                )}
              </G>
            );
          })}

          {/* Aiguille animée avec react-native-reanimated */}
          <AnimatedLine
            x1={CENTER_X}
            y1={CENTER_Y}
            animatedProps={animatedNeedleProps}
            stroke={isTesting ? '#00D9FF' : colors.text.secondary}
            strokeWidth={3}
            strokeLinecap="round"
          />

          {/* Point central de l'aiguille */}
          <Circle
            cx={CENTER_X}
            cy={CENTER_Y}
            r={6}
            fill={isTesting ? '#00D9FF' : colors.text.secondary}
          />
        </Svg>
      </View>
    );
  };

  const renderTopBar = () => (
    <View style={[styles.topBar, { borderBottomColor: colors.ui.border }]}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Icon name="arrow-back" size={24} color={colors.text.primary} />
      </TouchableOpacity>
      <Text style={[styles.title, { color: colors.text.primary }]}>{t('title')}</Text>
      <View style={styles.timerContainer}>
        {isTesting && (
          <>
            <Icon name="schedule" size={20} color={colors.text.secondary} />
            <Text style={[styles.timer, { color: colors.text.secondary }]}>
              {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </>
        )}
      </View>
    </View>
  );

  const renderStats = () => {
    // Utiliser les résultats finaux ou les valeurs conservées pendant le test
    const ping = result?.ping || finalPing;
    const download = result?.download || finalDownloadSpeed;
    const upload = result?.upload || finalUploadSpeed;

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>{t('ping')}</Text>
          <Text style={[styles.statValue, { color: '#FF9500' }]}>
            {ping > 0 ? `${ping.toFixed(ping < 10 ? 2 : 1)}` : '0'}
            <Text style={[styles.statUnit, { color: '#FF9500' }]}> {t('ms')}</Text>
          </Text>
        </View>

        <View style={[styles.separator, { backgroundColor: colors.ui.border }]} />

        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
            {t('download')}
          </Text>
          <Text style={[styles.statValue, { color: '#00D9FF' }]}>
            {download > 0 ? `${download.toFixed(1)}` : '0'}
            <Text style={[styles.statUnit, { color: '#00D9FF' }]}> {t('mbps')}</Text>
          </Text>
        </View>

        <View style={[styles.separator, { backgroundColor: colors.ui.border }]} />

        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
            {t('upload')}
          </Text>
          <Text style={[styles.statValue, { color: '#4ADE80' }]}>
            {upload > 0 ? `${upload.toFixed(1)}` : '0'}
            <Text style={[styles.statUnit, { color: '#4ADE80' }]}> {t('mbps')}</Text>
          </Text>
        </View>
      </View>
    );
  };

  const renderStartButton = () => {
    let buttonText = t('startTest');
    let buttonColor = colors.accent.primary;

    if (isTesting) {
      buttonText = t('stopTest');
      buttonColor = colors.accent.error;
    } else if (result) {
      buttonText = t('restartTest');
      buttonColor = '#8B5CF6'; // Purple comme dans la référence
    }

    return (
      <TouchableOpacity
        style={styles.startButtonContainer}
        onPress={handleStartTest}
        activeOpacity={0.8}>
        <LinearGradient
          colors={[buttonColor, buttonColor + 'CC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.startButton}>
          <Icon
            name={isTesting ? "stop" : "play-arrow"}
            size={24}
            color="#FFFFFF"
          />
          <Text style={[styles.startButtonText, { color: "#FFFFFF" }]}>
            {buttonText}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background.primary, colors.background.secondary || colors.background.primary]}
        style={styles.gradientContainer}>
        {renderTopBar()}

        <View style={styles.content}>
          {renderStats()}
          {renderSpeedometer()}
        </View>

        <View style={styles.bottomContainer}>
          {renderStartButton()}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timer: {
    fontSize: 14,
    fontWeight: '500',
  },
  statsContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  statUnit: {
    fontSize: 12,
    fontWeight: 'normal',
  },
  miniGraph: {
    width: '100%',
    height: 35,
    borderRadius: 4,
    marginTop: 4,
    overflow: 'hidden',
  },
  graphContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: 2,
  },
  graphBar: {
    flex: 1,
    marginHorizontal: 1,
    borderRadius: 2,
  },
  separator: {
    width: 1,
    height: 40,
  },
  speedometerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    position: 'relative',
    marginTop: 0,
  },
  bottomContainer: {
    marginTop: 'auto',
  },
  startButtonContainer: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    paddingBottom: 20,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SpeedTestScreen;
