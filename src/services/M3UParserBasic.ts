/**
 * 📱 LECTEUR IPTV MOBILE - Parser M3U Basique
 * 
 * Parser M3U simple pour commencer l'intégration incrémentale
 * Version 1.0 - Une seule fonctionnalité : parser M3U basique
 */

export interface Channel {
  id: string;
  name: string;
  url: string;
  logo?: string;
  group?: string;
}

export class M3UParserBasic {
  private channels: Channel[] = [];
  
  constructor() {
    console.log('📺 M3UParserBasic initialisé - Version simple');
  }
  
  /**
   * Parse un contenu M3U simple
   */
  parseM3U(content: string): Channel[] {
    console.log('🔄 Parsing M3U basique...');
    
    if (!content || content.trim().length === 0) {
      console.warn('⚠️ Contenu M3U vide');
      return [];
    }
    
    const lines = content.split('\n').map(line => line.trim());
    const channels: Channel[] = [];
    let currentChannel: Partial<Channel> = {};
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Ligne EXTINF (métadonnées)
      if (line.startsWith('#EXTINF:')) {
        currentChannel = this.parseExtinf(line);
      }
      // Ligne URL (lien de stream)
      else if (line && !line.startsWith('#') && currentChannel.name) {
        currentChannel.url = line;
        currentChannel.id = `channel_${channels.length + 1}`;
        
        // Ajouter la chaîne complète
        if (currentChannel.name && currentChannel.url) {
          channels.push(currentChannel as Channel);
        }
        
        currentChannel = {};
      }
    }
    
    this.channels = channels;
    console.log(`✅ Parser M3U terminé: ${channels.length} chaînes`);
    
    return channels;
  }
  
  /**
   * Parse une ligne EXTINF basique
   */
  private parseExtinf(line: string): Partial<Channel> {
    const channel: Partial<Channel> = {};
    
    // Extraire le nom (après la virgule)
    const commaIndex = line.lastIndexOf(',');
    if (commaIndex !== -1) {
      channel.name = line.substring(commaIndex + 1).trim();
    }
    
    // Extraire le logo si présent
    const logoMatch = line.match(/tvg-logo="([^"]*)"/);
    if (logoMatch) {
      channel.logo = logoMatch[1];
    }
    
    // Extraire le groupe si présent
    const groupMatch = line.match(/group-title="([^"]*)"/);
    if (groupMatch) {
      channel.group = groupMatch[1];
    }
    
    return channel;
  }
  
  /**
   * Obtenir toutes les chaînes
   */
  getChannels(): Channel[] {
    return [...this.channels];
  }
  
  /**
   * Recherche simple par nom
   */
  searchChannels(query: string): Channel[] {
    if (!query || query.length < 2) {
      return this.channels;
    }
    
    const lowerQuery = query.toLowerCase();
    return this.channels.filter(channel => 
      channel.name.toLowerCase().includes(lowerQuery) ||
      (channel.group && channel.group.toLowerCase().includes(lowerQuery))
    );
  }
  
  /**
   * Filtrer par groupe
   */
  filterByGroup(group: string): Channel[] {
    return this.channels.filter(channel => channel.group === group);
  }
  
  /**
   * Obtenir tous les groupes uniques
   */
  getGroups(): string[] {
    const groups = this.channels
      .map(channel => channel.group)
      .filter(group => group && group.trim() !== '')
      .filter((group, index, arr) => arr.indexOf(group) === index);
    
    return groups.sort();
  }
  
  /**
   * Réinitialiser le parser
   */
  clear(): void {
    this.channels = [];
    console.log('🧹 Parser M3U réinitialisé');
  }
  
  /**
   * Statistiques
   */
  getStats() {
    return {
      totalChannels: this.channels.length,
      totalGroups: this.getGroups().length,
      channelsWithLogo: this.channels.filter(c => c.logo).length
    };
  }
}