/**
 * ⚡ SpeedTestService - Test de vitesse réseau natif sans dépendances externes
 * Implémentation complète de tests de download, upload et ping pour React Native
 * Inspirée des meilleures pratiques des applications IPTV populaires
 */

import { useState, useCallback } from 'react';

export interface SpeedTestResult {
  download: number; // Mbps
  upload: number; // Mbps
  ping: number; // ms
  jitter: number; // ms
  packetLoss: number; // %
  timestamp: number;
  networkType: string;
  signalStrength?: number;
}

export interface TestProgress {
  stage: 'idle' | 'ping' | 'download' | 'transition' | 'upload' | 'completed' | 'error';
  progress: number; // 0-100
  currentSpeed: number;
  estimatedTime: number; // seconds remaining
  message: string;
  timestamp: number; // Force re-render on each update
}

export interface SpeedTestConfig {
  downloadSize: number; // MB
  uploadSize: number; // MB
  pingCount: number;
  timeout: number;
  testUrls?: string[];
  useCDN?: boolean;
}

export class SpeedTestError extends Error {
  constructor(
    public type: 'timeout' | 'network' | 'server' | 'abort' | 'invalid_config',
    public details?: string,
  ) {
    super(details || `Erreur de test de vitesse: ${type}`);
    this.name = 'SpeedTestError';
  }
}

export class SpeedTestService {
  private config: Required<SpeedTestConfig>;
  private isTesting = false;
  private abortController: AbortController | null = null;

  constructor(config: Partial<SpeedTestConfig> = {}) {
    this.config = {
      downloadSize: 10, // 10MB test file
      uploadSize: 2, // 2MB test file
      pingCount: 5,
      timeout: 30000,
      testUrls: [
        'https://httpbin.org/bytes/{size}',
        'https://raw.githubusercontent.com/facebook/react/main/README.md',
      ],
      useCDN: true,
      ...config,
    };
  }

  /**
   * Lance un test de vitesse complet
   */
  async runSpeedTest(
    onProgressUpdate?: (progress: TestProgress) => void
  ): Promise<SpeedTestResult> {
    if (this.isTesting) {
      throw new SpeedTestError('abort', 'Un test est déjà en cours');
    }

    this.isTesting = true;
    this.abortController = new AbortController();

    const updateProgress = (progress: TestProgress) => {
      // Ajouter timestamp pour forcer re-render
      onProgressUpdate?.({ ...progress, timestamp: Date.now() });
    };

    try {
      const progress: TestProgress = {
        stage: 'idle',
        progress: 0,
        currentSpeed: 0,
        estimatedTime: 0,
        message: 'Démarrage du test...',
        timestamp: Date.now(),
      };
      updateProgress(progress);

      // Étape 1: Détecter le réseau
      const networkInfo = await this.detectNetworkType();

      progress.message = `Réseau détecté: ${networkInfo.type}`;
      progress.progress = 10;
      updateProgress(progress);

      // Étape 2: Tests de ping (latence) avec animation progressive
      progress.stage = 'ping';
      progress.message = 'Mesure de la latence...';
      progress.currentSpeed = 0;
      updateProgress(progress);

      const pingResult = await this.measurePingWithProgress(networkInfo.type, (pingProgress) => {
        // Animer l'aiguille progressivement pendant le ping (0 à 5 Mbps)
        progress.currentSpeed = pingProgress * 5;
        updateProgress(progress);
      });

      progress.progress = 25;
      progress.currentSpeed = 5; // Position finale du ping
      updateProgress(progress);

      // Étape 3: Test de download
      progress.stage = 'download';
      progress.message = 'Test du débit descendant...';
      updateProgress(progress);

      const downloadResult = await this.measureDownloadSpeed((speed) => {
        progress.currentSpeed = speed;
        updateProgress(progress);
      });

      progress.progress = 65;
      updateProgress(progress);

      // Sauvegarder la vitesse finale du download
      const finalDownloadSpeed = progress.currentSpeed;

      // Pause entre download et upload avec retour à zéro de l'aiguille
      // Utiliser une stage de transition pour ne pas écraser les valeurs
      progress.stage = 'transition';
      progress.message = 'Préparation du test d\'envoi...';
      updateProgress(progress);
      await this.delay(500); // Première pause

      // Retour progressif de l'aiguille vers 0
      progress.currentSpeed = finalDownloadSpeed * 0.5;
      updateProgress(progress);
      await this.delay(300);

      progress.currentSpeed = finalDownloadSpeed * 0.15;
      updateProgress(progress);
      await this.delay(300);

      progress.currentSpeed = 0;
      updateProgress(progress);
      await this.delay(400); // Pause à zéro avant upload

      // Étape 4: Test d'upload
      progress.stage = 'upload';
      progress.message = 'Test du débit montant...';
      progress.currentSpeed = 0; // Recommencer à zéro pour l'upload
      updateProgress(progress);

      const uploadResult = await this.measureUploadSpeed((speed) => {
        progress.currentSpeed = speed;
        updateProgress(progress);
      });

      progress.progress = 90;
      updateProgress(progress);

      // Combiner les résultats
      const result: SpeedTestResult = {
        download: downloadResult.speed,
        upload: uploadResult.speed,
        ping: pingResult.avgLatency,
        jitter: pingResult.jitter,
        packetLoss: pingResult.packetLoss,
        timestamp: Date.now(),
        networkType: networkInfo.type,
        signalStrength: networkInfo.strength,
      };

      progress.stage = 'completed';
      progress.progress = 100;
      progress.currentSpeed = uploadResult.speed; // Afficher la vitesse upload finale
      progress.message = 'Test terminé !';
      updateProgress(progress);

      console.log('✅ [SpeedTest] Results:', `Ping: ${result.ping}ms, Download: ${result.download}Mbps, Upload: ${result.upload}Mbps`);
      return result;

    } catch (error) {
      console.error('❌ [SpeedTest] Error:', error.message);
      const progress: TestProgress = {
        stage: 'error',
        progress: 0,
        currentSpeed: 0,
        estimatedTime: 0,
        message: error.message || 'Erreur inconnue',
        timestamp: Date.now(),
      };
      updateProgress(progress);
      throw error;
    } finally {
      this.isTesting = false;
      this.abortController = null;
    }
  }

  /**
   * Mesure la qualité du réseau (type et force du signal)
   */
  private async detectNetworkType(): Promise<{ type: string; strength?: number }> {
    try {
      // Simuler la détection réseau - dans une vraie implémentation, utiliser NetInfo
      const connection = await this.simulateNetworkDetection();
      
      return {
        type: connection.type,
        strength: connection.strength,
      };
    } catch (error) {
      throw new SpeedTestError('network', 'Impossible de détecter le type de réseau');
    }
  }

  /**
   * Simule la détection du réseau (à remplacer par NetInfo réel)
   */
  private async simulateNetworkDetection(): Promise<{ type: string; strength?: number }> {
    // Dans une vraie implémentation:
    // import NetInfo from '@react-native-community/netinfo';
    // const connection = await NetInfo.fetch();
    // return {
    //   type: connection.type,
    //   strength: connection.details?.strength || connection.details?.isConnectionExpensive ? 30 : 80
    // };

    // Simulation pour le développement
    return new Promise(resolve => {
      setTimeout(() => {
        // Générer un type de réseau réaliste
        const types = ['wifi', '4g', '5g', 'cellular'];
        const randomType = types[Math.floor(Math.random() * types.length)];
        
        let strength: number | undefined;
        switch (randomType) {
          case 'wifi':
            strength = Math.floor(Math.random() * 40) + 60; // 60-100
            break;
          case '5g':
            strength = Math.floor(Math.random() * 30) + 70; // 70-100
            break;
          case '4g':
            strength = Math.floor(Math.random() * 40) + 40; // 40-80
            break;
          default:
            strength = Math.floor(Math.random() * 30) + 50; // 50-80
        }

        resolve({ type: randomType, strength });
      }, 500);
    });
  }

  /**
   * Mesure le ping et la latence réseau avec callback de progression
   */
  private async measurePingWithProgress(
    networkType: string,
    onProgress?: (progress: number) => void
  ): Promise<{
    avgLatency: number;
    jitter: number;
    packetLoss: number;
  }> {
    // Utiliser des serveurs rapides et fiables
    const pingTargets = [
      'https://1.1.1.1', // Cloudflare DNS (très rapide)
      'https://8.8.8.8', // Google DNS (très rapide)
      'https://speed.cloudflare.com', // Serveur de test Cloudflare
    ];

    const latencies: number[] = [];
    let timeouts = 0;

    for (let i = 0; i < this.config.pingCount; i++) {
      if (this.abortController?.signal.aborted) {
        throw new SpeedTestError('abort', 'Test annulé par l\'utilisateur');
      }

      // Mettre à jour la progression (0 à 1)
      onProgress?.((i + 0.5) / this.config.pingCount);

      try {
        const target = pingTargets[i % pingTargets.length];
        const startTime = performance.now();

        // Utiliser une requête légère
        const response = await fetch(target, {
          method: 'HEAD',
          signal: this.abortController?.signal,
          cache: 'no-store',
        });

        const latency = performance.now() - startTime;
        latencies.push(latency);

        // Mettre à jour après chaque ping réussi
        onProgress?.((i + 1) / this.config.pingCount);

        // Réduire le délai entre les pings pour accélérer la mesure
        await this.delay(100); // Réduit de 200ms à 100ms

      } catch (error) {
        timeouts++;
        // Mettre à jour même en cas d'erreur
        onProgress?.((i + 1) / this.config.pingCount);
      }
    }

    if (latencies.length === 0) {
      throw new SpeedTestError('network', 'Aucune réponse ping reçue');
    }

    const avgLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
    const jitter = Math.sqrt(
      latencies.reduce((sum, lat) => sum + Math.pow(lat - avgLatency, 2), 0) / latencies.length
    );
    const packetLoss = (timeouts / this.config.pingCount) * 100;

    return {
      avgLatency: Math.round(avgLatency),
      jitter: Math.round(jitter * 10) / 10,
      packetLoss: Math.round(packetLoss * 10) / 10,
    };
  }

  /**
   * Mesure la vitesse de téléchargement avec simulation progressive
   */
  private async measureDownloadSpeed(
    onSpeedUpdate?: (speed: number) => void
  ): Promise<{ speed: number; time: number }> {
    const testUrl = 'https://speed.cloudflare.com/__down?bytes=5000000'; // 5MB
    const expectedSize = 5000000;

    try {
      const startTime = Date.now();

      // Démarrer immédiatement avec une petite vitesse pour que l'aiguille bouge
      onSpeedUpdate?.(0.5); // Commence à 0.5 Mbps immédiatement

      // Démarrer une simulation de progression pendant le téléchargement
      let simulatedBytes = 0;
      const simulationInterval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        // Commencer immédiatement, pas de délai
        simulatedBytes = Math.min(expectedSize * 0.8, expectedSize * (elapsed / 2));
        const estimatedSpeed = Math.max(0.5, (simulatedBytes * 8) / (elapsed * 1024 * 1024));
        onSpeedUpdate?.(estimatedSpeed);
      }, 50); // Mise à jour plus fréquente (50ms au lieu de 100ms)

      const response = await fetch(testUrl, {
        signal: this.abortController?.signal,
        method: 'GET',
      });

      if (!response.ok) {
        clearInterval(simulationInterval);
        throw new SpeedTestError('server', `Serveur indisponible: ${response.status}`);
      }

      const data = await response.text();
      const totalBytesRead = data.length;

      clearInterval(simulationInterval);

      const endTime = Date.now();
      const totalTime = (endTime - startTime) / 1000;
      const speedMbps = (totalBytesRead * 8) / (totalTime * 1024 * 1024);

      onSpeedUpdate?.(speedMbps);

      return {
        speed: Math.round(speedMbps * 10) / 10,
        time: totalTime,
      };

    } catch (error) {
      if (error.name === 'AbortError' || error instanceof SpeedTestError) {
        throw error;
      }
      throw new SpeedTestError('network', `Erreur de téléchargement: ${error.message}`);
    }
  }

  /**
   * Mesure la vitesse d'upload avec simulation progressive
   */
  private async measureUploadSpeed(
    onSpeedUpdate?: (speed: number) => void
  ): Promise<{ speed: number; time: number }> {
    const uploadSize = 1; // 1MB
    const testString = 'x'.repeat(uploadSize * 1024 * 1024);
    const testBlob = new Blob([testString], { type: 'text/plain' });
    const expectedSize = testBlob.size;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const startTime = Date.now();
      let lastUpdateTime = startTime;

      // Démarrer immédiatement avec une petite vitesse
      onSpeedUpdate?.(0.3); // Commence à 0.3 Mbps immédiatement

      // Démarrer une simulation de progression
      const simulationInterval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        // Commencer immédiatement, pas de délai
        const simulatedBytes = Math.min(expectedSize * 0.9, expectedSize * (elapsed / 3));
        const estimatedSpeed = Math.max(0.3, (simulatedBytes * 8) / (elapsed * 1024 * 1024));
        onSpeedUpdate?.(estimatedSpeed);
      }, 50); // Mise à jour plus fréquente (50ms au lieu de 150ms)

      // Gestion de l'événement de progression de l'upload (si supporté)
      xhr.upload.onprogress = (event: ProgressEvent) => {
        if (event.lengthComputable) {
          const uploadedBytes = event.loaded;
          const now = Date.now();

          if (now - lastUpdateTime >= 100) {
            const elapsed = (now - startTime) / 1000;
            const speedMbps = (uploadedBytes * 8) / (elapsed * 1024 * 1024);
            onSpeedUpdate?.(speedMbps);
            lastUpdateTime = now;
          }
        }
      };

      // Gestion de la fin de l'upload
      xhr.onload = () => {
        clearInterval(simulationInterval);
        const endTime = Date.now();
        const totalTime = (endTime - startTime) / 1000;
        const speedMbps = (testBlob.size * 8) / (totalTime * 1024 * 1024);
        onSpeedUpdate?.(speedMbps);

        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            speed: Math.round(speedMbps * 10) / 10,
            time: totalTime,
          });
        } else {
          reject(new SpeedTestError('server', `Serveur indisponible: ${xhr.status}`));
        }
      };

      // Gestion des erreurs
      xhr.onerror = () => {
        clearInterval(simulationInterval);
        reject(new SpeedTestError('network', 'Erreur réseau lors de l\'upload'));
      };

      xhr.ontimeout = () => {
        clearInterval(simulationInterval);
        reject(new SpeedTestError('timeout', 'Timeout lors de l\'upload'));
      };

      xhr.onabort = () => {
        clearInterval(simulationInterval);
        reject(new SpeedTestError('abort', 'Upload annulé'));
      };

      // Configurer et envoyer la requête
      try {
        xhr.open('POST', 'https://httpbin.org/post', true);
        xhr.setRequestHeader('Content-Type', 'text/plain');
        xhr.timeout = this.config.timeout;

        if (this.abortController) {
          this.abortController.signal.addEventListener('abort', () => {
            xhr.abort();
          });
        }

        xhr.send(testBlob);
      } catch (error) {
        clearInterval(simulationInterval);
        reject(new SpeedTestError('network', `Erreur d'upload: ${error.message}`));
      }
    });
  }

  /**
   * Annule le test en cours
   */
  cancelTest(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
      this.isTesting = false;
      console.log('🛑 Speed test cancelled');
    }
  }

  /**
   * Vérifie si un test est en cours
   */
  isTestInProgress(): boolean {
    return this.isTesting;
  }

  /**
   * Obtient les recommandations de qualité en fonction des résultats
   */
  getQualityRecommendations(result: SpeedTestResult): {
    recommendedBitrate: number;
    qualityLevel: 'low' | 'medium' | 'high' | 'ultra';
    warnings: string[];
    isGoodForIPTV: boolean;
    diagnosis: string;
  } {
    const warnings: string[] = [];
    let recommendedBitrate = 3000; // Default 3 Mbps
    let qualityLevel: 'low' | 'medium' | 'high' | 'ultra' = 'medium';
    let isGoodForIPTV = true;
    let diagnosis = '';

    // Recommandations basées sur le download speed
    if (result.download >= 25) {
      qualityLevel = 'ultra';
      recommendedBitrate = 15000;
      diagnosis = 'Excellent pour IPTV 4K/HD';
    } else if (result.download >= 15) {
      qualityLevel = 'high';
      recommendedBitrate = 8000;
      diagnosis = 'Très bon pour IPTV Full HD';
    } else if (result.download >= 8) {
      qualityLevel = 'medium';
      recommendedBitrate = 4000;
      diagnosis = 'Bon pour IPTV HD 720p';
    } else if (result.download >= 3) {
      qualityLevel = 'low';
      recommendedBitrate = 2000;
      diagnosis = 'Acceptable pour IPTV SD';
      warnings.push('⚠️ Connexion limite pour le streaming');
    } else {
      recommendedBitrate = 1000;
      diagnosis = 'Connexion trop lente pour IPTV';
      isGoodForIPTV = false;
      warnings.push('❌ Débit insuffisant pour le streaming');
    }

    // Ajustements basés sur le ping
    if (result.ping > 200) {
      warnings.push('🐌 Latence très élevée - buffering probable');
      isGoodForIPTV = false;
      recommendedBitrate = Math.max(1000, recommendedBitrate - 2000);
    } else if (result.ping > 100) {
      warnings.push('⚠️ Latence élevée - délais possibles');
      recommendedBitrate = Math.max(1000, recommendedBitrate - 1000);
    }

    // Ajustements basés sur la perte de paquets
    if (result.packetLoss > 5) {
      warnings.push('📉 Perte de paquets - instabilité réseau');
      isGoodForIPTV = false;
      recommendedBitrate = Math.max(1000, recommendedBitrate - 500);
    } else if (result.packetLoss > 2) {
      warnings.push('⚠️ Légère perte de paquets détectée');
    }

    // Vérification du jitter
    if (result.jitter > 50) {
      warnings.push('📊 Jitter élevé - qualité variable');
    }

    return {
      recommendedBitrate,
      qualityLevel,
      warnings,
      isGoodForIPTV,
      diagnosis,
    };
  }

  /**
   * Utilitaire de délai
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const speedTestService = new SpeedTestService();

// Hook React pour faciliter l'utilisation
export const useSpeedTest = () => {
  const [isTesting, setIsTesting] = useState(false);
  const [progress, setProgress] = useState<TestProgress | null>(null);
  const [result, setResult] = useState<SpeedTestResult | null>(null);
  const [error, setError] = useState<SpeedTestError | null>(null);

  const runTest = useCallback(async () => {
    setIsTesting(true);
    setProgress({
      stage: 'idle',
      progress: 0,
      currentSpeed: 0,
      estimatedTime: 0,
      message: 'Démarrage...',
      timestamp: Date.now(),
    });
    setResult(null);
    setError(null);

    try {
      const testResult = await speedTestService.runSpeedTest((progressUpdate) => {
        setProgress(progressUpdate);
      });

      setResult(testResult);
      setProgress(prev => prev ? { ...prev, stage: 'completed', progress: 100, message: 'Terminé !' } : null);
    } catch (err) {
      if (err instanceof SpeedTestError) {
        setError(err);
        setProgress(prev => prev ? { ...prev, stage: 'error', message: err.message } : null);
      } else {
        const unknownError = new SpeedTestError('network', err.message || 'Erreur inconnue');
        setError(unknownError);
        setProgress(prev => prev ? { ...prev, stage: 'error', message: unknownError.message } : null);
      }
    } finally {
      setIsTesting(false);
    }
  }, []);

  const cancelTest = useCallback(() => {
    speedTestService.cancelTest();
    setIsTesting(false);
    setProgress(null);
  }, []);

  return {
    isTesting,
    progress,
    result,
    error,
    runTest,
    cancelTest,
    recommendations: result ? speedTestService.getQualityRecommendations(result) : null,
  };
};
