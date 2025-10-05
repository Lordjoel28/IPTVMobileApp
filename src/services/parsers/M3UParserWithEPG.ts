/**
 * 📺 M3UParserWithEPG - Extension pour support url-tvg
 * Phase 1.1: Détection automatique EPG intégré aux playlists M3U
 *
 * Fonctionnalités:
 * ✅ Extraction url-tvg depuis headers M3U
 * ✅ Validation format URL EPG
 * ✅ Métadonnées EPG enrichies
 * ✅ Compatible avec UltraOptimizedM3UParser
 */

import { UltraOptimizedM3UParser, Channel, ParseResult } from './UltraOptimizedM3UParser';
import { PlaylistMetadata } from '../playlist/PlaylistManager';

export interface ExtendedParseResult extends ParseResult {
  metadata: PlaylistMetadata;
}

export interface EPGDetectionResult {
  hasIntegratedEPG: boolean;
  epgUrl?: string;
  epgType: 'integrated' | 'none';
  detectionMethod?: string;
}

export class M3UParserWithEPG extends UltraOptimizedM3UParser {

  /**
   * Parse M3U avec détection automatique url-tvg
   */
  async parseWithEPGDetection(content: string, chunkSize = 1000): Promise<ExtendedParseResult> {
    console.log('🔍 Début parsing M3U avec détection EPG...');

    // 1. Détecter EPG avant parsing principal
    const epgDetection = this.detectEPGInContent(content);
    console.log('📺 Résultat détection EPG:', epgDetection);

    // 2. Parser le contenu M3U normalement
    const parseResult = await this.parse(content, chunkSize);

    // 3. Enrichir avec métadonnées EPG
    const metadata = this.extractPlaylistMetadata(content, epgDetection);

    console.log('✅ Parsing M3U + EPG terminé');
    return {
      ...parseResult,
      metadata
    };
  }

  /**
   * Détecte la présence d'url-tvg dans le contenu M3U
   */
  private detectEPGInContent(content: string): EPGDetectionResult {
    console.log('🔍 Recherche url-tvg dans le contenu M3U...');

    // Rechercher url-tvg dans les premières lignes (header M3U)
    const lines = content.split('\n').slice(0, 20); // Chercher dans les 20 premières lignes

    for (const line of lines) {
      const epgUrl = this.extractUrlTvgFromLine(line);
      if (epgUrl) {
        console.log(`✅ URL EPG détectée: ${epgUrl}`);
        return {
          hasIntegratedEPG: true,
          epgUrl,
          epgType: 'integrated',
          detectionMethod: 'url-tvg header'
        };
      }
    }

    // Recherche alternative dans tout le contenu (fallback)
    const fallbackEpgUrl = this.searchUrlTvgInFullContent(content);
    if (fallbackEpgUrl) {
      console.log(`✅ URL EPG détectée (fallback): ${fallbackEpgUrl}`);
      return {
        hasIntegratedEPG: true,
        epgUrl: fallbackEpgUrl,
        epgType: 'integrated',
        detectionMethod: 'content scan'
      };
    }

    console.log('❌ Aucun EPG intégré détecté');
    return {
      hasIntegratedEPG: false,
      epgType: 'none'
    };
  }

  /**
   * Extrait url-tvg d'une ligne M3U
   * Supporte différents formats: url-tvg="url", url-tvg='url', url-tvg=url
   */
  private extractUrlTvgFromLine(line: string): string | null {
    // Nettoyer la ligne
    const cleanLine = line.trim();

    if (!cleanLine.toLowerCase().includes('url-tvg')) {
      return null;
    }

    // Pattern 1: url-tvg="https://example.com/epg.xml"
    const doubleQuotesMatch = cleanLine.match(/url-tvg\s*=\s*"([^"]+)"/i);
    if (doubleQuotesMatch) {
      return this.validateAndCleanEpgUrl(doubleQuotesMatch[1]);
    }

    // Pattern 2: url-tvg='https://example.com/epg.xml'
    const singleQuotesMatch = cleanLine.match(/url-tvg\s*=\s*'([^']+)'/i);
    if (singleQuotesMatch) {
      return this.validateAndCleanEpgUrl(singleQuotesMatch[1]);
    }

    // Pattern 3: url-tvg=https://example.com/epg.xml (sans guillemets)
    const noQuotesMatch = cleanLine.match(/url-tvg\s*=\s*([^\s]+)/i);
    if (noQuotesMatch) {
      return this.validateAndCleanEpgUrl(noQuotesMatch[1]);
    }

    return null;
  }

  /**
   * Recherche url-tvg dans tout le contenu (fallback)
   */
  private searchUrlTvgInFullContent(content: string): string | null {
    const patterns = [
      /url-tvg\s*=\s*"([^"]+)"/gi,
      /url-tvg\s*=\s*'([^']+)'/gi,
      /url-tvg\s*=\s*([^\s]+)/gi
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        for (const fullMatch of match) {
          const urlMatch = fullMatch.match(/=\s*["']?([^"'\s]+)["']?/);
          if (urlMatch) {
            const epgUrl = this.validateAndCleanEpgUrl(urlMatch[1]);
            if (epgUrl) return epgUrl;
          }
        }
      }
    }

    return null;
  }

  /**
   * Valide et nettoie une URL EPG (compatible React Native)
   */
  private validateAndCleanEpgUrl(url: string): string | null {
    if (!url || url.length < 10) return null;

    // Nettoyer l'URL
    const cleanUrl = url.trim().replace(/['"]/g, '');

    // Validation basique URL pour React Native
    try {
      // Validation simple du format URL sans utiliser URL constructor
      const urlPattern = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

      if (!urlPattern.test(cleanUrl)) {
        console.warn(`⚠️ Format URL EPG invalide: ${cleanUrl}`);
        return null;
      }

      // Vérifier protocole manuellement
      if (!cleanUrl.toLowerCase().startsWith('http://') && !cleanUrl.toLowerCase().startsWith('https://')) {
        console.warn(`⚠️ Protocole EPG non supporté: ${cleanUrl}`);
        return null;
      }

      // Vérifier extension (optionnel mais recommandé)
      const isValidExtension =
        cleanUrl.toLowerCase().includes('.xml') ||
        cleanUrl.toLowerCase().includes('epg') ||
        cleanUrl.toLowerCase().includes('xmltv') ||
        cleanUrl.toLowerCase().includes('.gz'); // Support pour XMLTV compressé

      if (!isValidExtension) {
        console.warn(`⚠️ URL EPG sans extension XML détectée: ${cleanUrl}`);
        // On retourne quand même l'URL car certains EPG n'ont pas d'extension
      }

      console.log(`✅ URL EPG validée: ${cleanUrl}`);
      return cleanUrl;

    } catch (error) {
      console.warn(`⚠️ URL EPG invalide: ${cleanUrl}`, error);
      return null;
    }
  }

  /**
   * Extrait les métadonnées de la playlist incluant EPG
   */
  private extractPlaylistMetadata(content: string, epgDetection: EPGDetectionResult): PlaylistMetadata {
    const lines = content.split('\n').slice(0, 10); // Analyser les premières lignes

    const metadata: PlaylistMetadata = {
      epgType: epgDetection.epgType
    };

    // Ajouter URL EPG si détectée
    if (epgDetection.epgUrl) {
      metadata.epgUrl = epgDetection.epgUrl;
    }

    // Extraire d'autres métadonnées du header M3U (optionnel)
    for (const line of lines) {
      const cleanLine = line.trim();

      // Extraire titre si présent
      if (cleanLine.startsWith('#PLAYLIST:') || cleanLine.startsWith('#EXTM3U')) {
        const titleMatch = cleanLine.match(/title\s*=\s*["']?([^"'\s]+)["']?/i);
        if (titleMatch) {
          metadata.title = titleMatch[1];
        }
      }
    }

    console.log('📋 Métadonnées extraites:', metadata);
    return metadata;
  }

  /**
   * Méthode utilitaire pour tests - extrait seulement l'EPG
   */
  static extractEPGUrlFromM3U(content: string): string | null {
    const parser = new M3UParserWithEPG();
    const detection = parser.detectEPGInContent(content);
    return detection.epgUrl || null;
  }

  /**
   * Méthode statique pour vérification rapide présence EPG
   */
  static hasIntegratedEPG(content: string): boolean {
    const parser = new M3UParserWithEPG();
    const detection = parser.detectEPGInContent(content);
    return detection.hasIntegratedEPG;
  }
}

export default M3UParserWithEPG;