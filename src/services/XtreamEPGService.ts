/**
 * 📺 Xtream Codes EPG Service - API native pour vrais programmes
 *
 * OBJECTIF: Récupérer les vraies données EPG depuis l'API Xtream Codes via la méthode xmltv.php, la plus fiable.
 * ✅ Support xmltv.php pour un EPG complet et fiable
 * ✅ Cache intelligent pour l'EPG complet (6 heures)
 * ✅ Parser XMLTV intégré et robuste
 */

import {XMLParser} from 'fast-xml-parser';

// Interfaces
export interface XtreamCredentials {
  server: string;
  username: string;
  password: string;
}

export interface EPGChannel {
  id: string;
  displayName: string;
  icon?: string;
}

export interface EPGProgramme {
  start: string;
  stop: string;
  channel: string;
  title: string;
  desc?: string;
}

export interface FullEPGData {
  channels: EPGChannel[];
  programmes: EPGProgramme[];
  source: string;
}

class XtreamEPGService {
  private xmlParser: XMLParser;
  private fullEPGCache = new Map<string, {data: FullEPGData; expiry: number}>();
  private readonly FULL_EPG_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 heures

  constructor() {
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '_',
      textNodeName: 'text',
      parseAttributeValue: true,
      trimValues: true,
      parseTagValue: true,
      isArray: tagName =>
        ['channel', 'programme', 'display-name'].includes(tagName),
    });
  }

  /**
   * Récupère l'EPG complet via xmltv.php. C'est la méthode à privilégier.
   */
  async getFullEPG(
    credentials: XtreamCredentials,
  ): Promise<FullEPGData | null> {
    const cacheKey = `full_epg_${credentials.server}`;
    const cached = this.fullEPGCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      console.log(
        `💾 [XtreamEPG] Cache hit pour l'EPG complet de ${credentials.server}`,
      );
      return cached.data;
    }

    const url = `${credentials.server}/xmltv.php?username=${credentials.username}&password=${credentials.password}`;
    console.log(
      `🔍 [XtreamEPG] Téléchargement de l'EPG complet depuis: ${url}`,
    );

    try {
      // Ajouter un timeout de 15 secondes pour éviter les blocages
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        headers: {'User-Agent': 'IPTV Smarters Pro'},
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `Erreur HTTP ${response.status}: ${response.statusText}`,
        );
      }

      const xmlContent = await response.text();
      if (!xmlContent) {
        throw new Error('La réponse XMLTV est vide.');
      }

      const parsedData = this.xmlParser.parse(xmlContent);
      const epgData = this.processXMLTVData(parsedData, 'xmltv.php');

      if (epgData.channels.length === 0) {
        console.warn(
          "⚠️ [XtreamEPG] Le fichier XMLTV ne contient aucune chaîne. L'EPG du fournisseur est peut-être vide.",
        );
        return null;
      }

      this.fullEPGCache.set(cacheKey, {
        data: epgData,
        expiry: Date.now() + this.FULL_EPG_CACHE_TTL,
      });

      console.log(
        `✅ [XtreamEPG] EPG complet traité: ${epgData.channels.length} chaînes, ${epgData.programmes.length} programmes.`,
      );
      return epgData;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error(
          "❌ [XtreamEPG] Timeout de 15s dépassé pour le téléchargement EPG depuis:",
          credentials.server,
        );
      } else {
        console.error(
          "❌ [XtreamEPG] Erreur lors de la récupération de l'EPG complet:",
          error,
        );
      }
      return null;
    }
  }

  private processXMLTVData(parsedXML: any, sourceName: string): FullEPGData {
    const channels: EPGChannel[] = [];
    const programmes: EPGProgramme[] = [];

    try {
      if (parsedXML.tv?.channel) {
        const channelArray = Array.isArray(parsedXML.tv.channel)
          ? parsedXML.tv.channel
          : [parsedXML.tv.channel];
        channelArray.forEach((ch: any) => {
          if (ch._id) {
            channels.push({
              id: ch._id,
              displayName: this.extractValue(ch['display-name']),
              icon: ch.icon?._src,
            });
          }
        });
      }

      if (parsedXML.tv?.programme) {
        const programArray = Array.isArray(parsedXML.tv.programme)
          ? parsedXML.tv.programme
          : [parsedXML.tv.programme];
        programArray.forEach((prog: any) => {
          if (prog._start && prog._stop && prog._channel) {
            programmes.push({
              start: prog._start,
              stop: prog._stop,
              channel: String(prog._channel),
              title: this.extractValue(prog.title) || 'Programme sans titre',
              desc: this.extractValue(prog.desc) || '',
            });
          }
        });
      }
    } catch (error) {
      console.error('❌ [XtreamEPG] Erreur traitement XMLTV:', error);
    }

    return {channels, programmes, source: sourceName};
  }

  private extractValue(field: any): string {
    if (typeof field === 'string') {
      return field;
    }
    if (Array.isArray(field)) {
      return field[0]?.text || field[0] || '';
    }
    if (field?.text) {
      return field.text;
    }
    return '';
  }
}

export const XtreamEPG = new XtreamEPGService();
