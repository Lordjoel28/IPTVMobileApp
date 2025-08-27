/**
 * 🚀 useOptimizedPlaylistImport - Hook pour Import 100K+ Chaînes
 * UI non-bloquante avec progress streaming + performances TiviMate level
 */

import { useState, useCallback, useRef } from 'react';
import { optimizedPlaylistService } from '../services/parsers/OptimizedPlaylistService';
import { useUIStore } from '../stores/UIStore';
import { usePlaylistStore } from '../stores/PlaylistStore';
import type { ParseProgress } from '../services/parsers/StreamingM3UParser';
import type { OptimizedImportResult } from '../services/parsers/OptimizedPlaylistService';

export interface OptimizedImportState {
  isImporting: boolean;
  progress: ParseProgress | null;
  currentStatus: string;
  currentDetails: string;
  canCancel: boolean;
  result: OptimizedImportResult | null;
}

export const useOptimizedPlaylistImport = () => {
  const { showLoading, updateLoading, hideLoading, showNotification } = useUIStore();
  const { loadPlaylist } = usePlaylistStore();
  
  const [importState, setImportState] = useState<OptimizedImportState>({
    isImporting: false,
    progress: null,
    currentStatus: '',
    currentDetails: '',
    canCancel: false,
    result: null
  });

  const abortRef = useRef<boolean>(false);

  /**
   * 🚀 IMPORT OPTIMISÉ PRINCIPAL
   * Flux : UI → Hook → OptimizedService → StreamingParser → Store
   */
  const importPlaylistOptimized = useCallback(async (
    url: string,
    name: string
  ): Promise<boolean> => {
    
    console.log(`🚀 Starting optimized import: ${name}`);
    console.log(`📊 URL: ${url.substring(0, 100)}...`);

    // Reset state
    abortRef.current = false;
    setImportState({
      isImporting: true,
      progress: null,
      currentStatus: 'Initialisation...',
      currentDetails: 'Préparation de l\'import optimisé',
      canCancel: true,
      result: null
    });

    // UI Loading basique (sera mis à jour avec progress détaillé)
    showLoading(
      `🚀 Import Optimisé: ${name}`,
      'Initialisation du parser streaming...',
      0
    );

    try {
      // IMPORT avec callbacks streaming
      const result = await optimizedPlaylistService.importM3UOptimized(
        url,
        name,
        {
          // Progress callback détaillé
          onProgress: (progress: ParseProgress) => {
            if (abortRef.current) return;

            setImportState(prev => ({
              ...prev,
              progress,
              currentStatus: `${progress.channelsParsed} chaînes traitées`,
              currentDetails: `${Math.round(progress.parseSpeed)} ch/s • ${progress.memoryUsageMB}MB • ${progress.progress}%`
            }));

            // Mise à jour UI loading avancée
            updateLoading({
              title: `🚀 Import Ultra-Rapide: ${name}`,
              subtitle: `${progress.channelsParsed} chaînes (${Math.round(progress.parseSpeed)} ch/s)`,
              progress: progress.progress
            });
          },

          // Status callback pour feedback utilisateur
          onStatusChange: (status: string, details?: string) => {
            if (abortRef.current) return;

            console.log(`📊 Status: ${status} - ${details}`);
            
            setImportState(prev => ({
              ...prev,
              currentStatus: status,
              currentDetails: details || ''
            }));

            updateLoading({
              subtitle: details ? `${status} - ${details}` : status
            });
          }
        },
        {
          // Options optimisées pour grosses playlists
          chunkSize: 20000,      // Gros chunks pour 100K+
          yieldInterval: 10000,  // Yield moins fréquent  
          maxMemoryMB: 250,      // Plus de mémoire
          enableSQLiteStream: true
        }
      );

      // Vérifier si annulé
      if (abortRef.current) {
        console.log('🛑 Import cancelled during processing');
        return false;
      }

      // Mise à jour finale du state
      setImportState(prev => ({
        ...prev,
        isImporting: false,
        canCancel: false,
        result
      }));

      if (result.success) {
        // 🎉 SUCCÈS : Mise à jour store avec channels parsés
        // TODO: Intégrer avec channels du parsing result
        // Pour l'instant, utiliser le flux classique
        hideLoading();
        
        showNotification(
          `🎉 Import Ultra-Rapide Réussi !`,
          'success',
          5000
        );

        showNotification(
          `📊 ${result.totalChannels} chaînes en ${Math.round(result.parseTimeMs/1000)}s (${result.avgSpeed} ch/s)`,
          'success', 
          8000
        );

        // Performance stats en console pour debug
        console.log('🏆 OPTIMIZED IMPORT PERFORMANCE:');
        console.log(`├─ Channels: ${result.totalChannels}`);
        console.log(`├─ Speed: ${result.avgSpeed} channels/sec`);
        console.log(`├─ Time: ${result.parseTimeMs}ms`);  
        console.log(`├─ Memory Peak: ${result.memoryPeakMB}MB`);
        console.log(`├─ Errors: ${result.errors.length}`);
        console.log(`└─ Warnings: ${result.warnings.length}`);

        return true;

      } else {
        // ❌ ÉCHEC
        hideLoading();
        
        const errorMsg = result.errors.length > 0 
          ? result.errors[0] 
          : 'Erreur inconnue lors de l\'import optimisé';

        showNotification(
          `❌ Échec Import: ${errorMsg}`,
          'error',
          6000
        );

        console.error('❌ Optimized import failed:', result.errors);
        return false;
      }

    } catch (error) {
      console.error('❌ Optimized import exception:', error);
      
      setImportState(prev => ({
        ...prev,
        isImporting: false,
        canCancel: false,
        result: null
      }));

      hideLoading();
      
      showNotification(
        `❌ Erreur critique: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        'error',
        6000
      );

      return false;
    }

  }, [showLoading, updateLoading, hideLoading, showNotification, loadPlaylist]);

  /**
   * 🛑 Annuler import en cours
   */
  const cancelImport = useCallback(() => {
    console.log('🛑 User requested import cancellation');
    
    abortRef.current = true;
    optimizedPlaylistService.cancelImport();
    
    setImportState(prev => ({
      ...prev,
      isImporting: false,
      canCancel: false,
      currentStatus: 'Annulation...',
      currentDetails: 'Import annulé par l\'utilisateur'
    }));

    hideLoading();
    showNotification('🛑 Import annulé', 'error', 3000);
  }, [hideLoading, showNotification]);

  /**
   * 🧪 Test de performance
   */
  const runPerformanceTest = useCallback(async () => {
    console.log('🧪 Running performance benchmark...');
    
    showLoading('🧪 Test Performance', 'Benchmark du parser optimisé...');
    
    try {
      const results = await optimizedPlaylistService.benchmarkParser();
      
      hideLoading();
      
      // Afficher résultats
      const summary = results.map(r => 
        r.success 
          ? `✅ ${r.totalChannels} chaînes en ${Math.round(r.totalTimeMs/1000)}s (${r.avgSpeed} ch/s)`
          : `❌ Échec: ${r.error}`
      ).join('\n');

      showNotification(
        `🧪 Benchmark Terminé:\n${summary}`,
        'success',
        10000
      );

      return results;

    } catch (error) {
      hideLoading();
      showNotification(`❌ Benchmark échoué: ${error.message}`, 'error');
      return [];
    }
  }, [showLoading, hideLoading, showNotification]);

  /**
   * 📊 Obtenir stats temps réel
   */
  const getCurrentStats = useCallback(() => {
    if (!importState.progress) return null;

    return {
      channelsParsed: importState.progress.channelsParsed,
      parseSpeed: Math.round(importState.progress.parseSpeed),
      memoryUsage: importState.progress.memoryUsageMB,
      progress: importState.progress.progress,
      eta: importState.progress.estimatedTimeLeft,
      status: importState.currentStatus,
      details: importState.currentDetails
    };
  }, [importState]);

  return {
    // État principal
    isImporting: importState.isImporting,
    canCancel: importState.canCancel,
    importResult: importState.result,
    
    // Actions
    importPlaylistOptimized,
    cancelImport,
    runPerformanceTest,
    
    // Stats temps réel
    getCurrentStats,
    
    // État détaillé pour UI avancée
    importState
  };
};