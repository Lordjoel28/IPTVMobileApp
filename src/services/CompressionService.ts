/**
 * 🗜️ CompressionService - Service de compression/décompression des données
 * ⚡ VERSION OPTIMISÉE: Compression simple et rapide sans bloquer l'UI
 */

import { CacheManager } from './CacheManager';

class CompressionService {
  // Cache pour éviter de recharger les settings à chaque appel
  private compressionEnabledCache: boolean | null = null;
  private compressionCacheTimestamp = 0;
  private readonly CACHE_DURATION_MS = 5000; // 5 secondes

  /**
   * Vérifie si la compression est activée (avec cache)
   */
  private async isCompressionEnabled(): Promise<boolean> {
    const now = Date.now();
    if (
      this.compressionEnabledCache !== null &&
      now - this.compressionCacheTimestamp < this.CACHE_DURATION_MS
    ) {
      return this.compressionEnabledCache;
    }

    const settings = await CacheManager.getSettings();
    this.compressionEnabledCache = settings.compressionEnabled;
    this.compressionCacheTimestamp = now;
    return settings.compressionEnabled;
  }

  /**
   * Compresse des données si la compression est activée
   * ⚡ OPTIMISÉ: Compression simple et rapide (RLE basique)
   */
  async compress(data: any): Promise<string> {
    try {
      const enabled = await this.isCompressionEnabled();

      // Convertir en JSON string
      const jsonString = JSON.stringify(data);

      if (!enabled || jsonString.length < 1000) {
        // Pas de compression pour les petits objets (< 1KB)
        return jsonString;
      }

      // ⚡ Compression simple et rapide (seulement pour gros objets)
      const compressed = this.simpleCompress(jsonString);

      // Si compression inefficace (< 10% économie), retourner original
      if (compressed.length >= jsonString.length * 0.9) {
        return jsonString;
      }

      // Marquer comme compressé avec un préfixe
      return `__COMPRESSED__${compressed}`;
    } catch (error) {
      console.error('🗜️ [Compression] Erreur compression:', error);
      // Fallback: retourner données non compressées
      return JSON.stringify(data);
    }
  }

  /**
   * Décompresse des données si elles sont marquées comme compressées
   */
  async decompress<T = any>(compressedData: string): Promise<T | null> {
    try {
      // Vérifier si les données sont compressées
      if (compressedData.startsWith('__COMPRESSED__')) {
        const compressed = compressedData.substring('__COMPRESSED__'.length);
        const decompressed = this.simpleDecompress(compressed);
        return JSON.parse(decompressed);
      } else {
        // Données non compressées
        return JSON.parse(compressedData);
      }
    } catch (error) {
      console.error('🗜️ [Compression] Erreur décompression:', error);
      return null;
    }
  }

  /**
   * ⚡ Compression SIMPLE et RAPIDE O(n) - Run-Length Encoding basique
   * Remplace uniquement les patterns les plus évidents sans recherche complexe
   */
  private simpleCompress(input: string): string {
    try {
      // Liste de patterns fixes ultra-fréquents dans JSON
      const commonPatterns = [
        { find: '","', replace: '§1' },
        { find: '":"', replace: '§2' },
        { find: '":{"', replace: '§3' },
        { find: '"},"', replace: '§4' },
        { find: '":[', replace: '§5' },
        { find: '],"', replace: '§6' },
        { find: 'null', replace: '§7' },
        { find: 'true', replace: '§8' },
        { find: 'false', replace: '§9' },
      ];

      let compressed = input;

      // Remplacer les patterns communs (O(n) par pattern)
      for (const pattern of commonPatterns) {
        compressed = compressed.split(pattern.find).join(pattern.replace);
      }

      // Si pas d'économie significative, retourner l'original
      if (compressed.length >= input.length * 0.9) {
        return input;
      }

      return compressed;
    } catch (error) {
      console.error('🗜️ [Compression] Erreur compression simple:', error);
      return input;
    }
  }

  /**
   * ⚡ Décompression SIMPLE et RAPIDE O(n)
   */
  private simpleDecompress(compressed: string): string {
    try {
      // Patterns inverses
      const commonPatterns = [
        { find: '§1', replace: '","' },
        { find: '§2', replace: '":"' },
        { find: '§3', replace: '":{"' },
        { find: '§4', replace: '"},"' },
        { find: '§5', replace: '":[' },
        { find: '§6', replace: '],"' },
        { find: '§7', replace: 'null' },
        { find: '§8', replace: 'true' },
        { find: '§9', replace: 'false' },
      ];

      let decompressed = compressed;

      // Restaurer les patterns (O(n) par pattern)
      for (const pattern of commonPatterns) {
        decompressed = decompressed.split(pattern.find).join(pattern.replace);
      }

      return decompressed;
    } catch (error) {
      console.error('🗜️ [Compression] Erreur décompression simple:', error);
      return compressed;
    }
  }

  /**
   * Calcule le taux de compression
   */
  getCompressionRatio(original: string, compressed: string): number {
    if (original.length === 0) return 0;
    return ((original.length - compressed.length) / original.length) * 100;
  }

  /**
   * Teste la compression sur des données d'exemple
   */
  async testCompression(): Promise<void> {
    const testData = {
      channels: [
        { id: 1, name: 'Channel 1', url: 'http://example.com/stream1', logo: 'http://example.com/logo1.png' },
        { id: 2, name: 'Channel 2', url: 'http://example.com/stream2', logo: 'http://example.com/logo2.png' },
        { id: 3, name: 'Channel 3', url: 'http://example.com/stream3', logo: 'http://example.com/logo3.png' },
      ],
      metadata: {
        timestamp: Date.now(),
        version: '1.0.0',
        server: 'http://example.com',
      },
    };

    const original = JSON.stringify(testData);
    const startTime = performance.now();
    const compressed = await this.compress(testData);
    const compressTime = performance.now() - startTime;

    const decompressStart = performance.now();
    const decompressed = await this.decompress(compressed);
    const decompressTime = performance.now() - decompressStart;

    console.log('🗜️ [Compression] Test Results:');
    console.log(`   Original size: ${original.length} bytes`);
    console.log(`   Compressed size: ${compressed.length} bytes`);
    console.log(`   Ratio: ${this.getCompressionRatio(original, compressed).toFixed(1)}%`);
    console.log(`   Compress time: ${compressTime.toFixed(2)}ms`);
    console.log(`   Decompress time: ${decompressTime.toFixed(2)}ms`);
    console.log(`   Data integrity: ${JSON.stringify(testData) === JSON.stringify(decompressed) ? '✅ OK' : '❌ FAILED'}`);
  }

  /**
   * Invalide le cache des settings
   */
  invalidateCache(): void {
    this.compressionEnabledCache = null;
    this.compressionCacheTimestamp = 0;
  }
}

export default new CompressionService();
