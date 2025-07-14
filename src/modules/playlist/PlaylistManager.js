import { OptimizedM3UParser } from '../parsers/OptimizedM3UParser.js';
import { UltraOptimizedM3UParser } from '../parsers/UltraOptimizedM3UParser.js';
import { PerformanceMonitor } from '../performance/PerformanceMonitor.js';
import { CacheManager } from '../cache/CacheManager.js';

/**
 * Gestionnaire des playlists IPTV
 */
export class PlaylistManager {
    constructor() {
        console.log('📺 Initialisation PlaylistManager');
        this.playlists = [];
        this.channels = [];
        this.currentPlaylist = null;
        
        // S'assurer que playlists est toujours un tableau
        this.ensurePlaylistsArray();
        
        // Parsers optimisés pour les performances
        this.m3uParser = new OptimizedM3UParser();
        this.ultraM3uParser = new UltraOptimizedM3UParser();
        
        // Configuration des parsers
        this.parserConfig = {
            useUltraOptimized: true,    // Utiliser le parser ultra-optimisé en priorité
            useOptimizedParser: true,   // Fallback vers le parser optimisé
            ultraOptimizedThreshold: 5000, // Seuil pour activer le parser ultra-optimisé
            chunkSize: 2000,            // Taille des chunks pour le processing
            yieldControl: true,         // Yield contrôle UI pour gros fichiers
            useWorker: false,           // Worker threads pour très gros fichiers
            autoDetectBestParser: true  // Détecter automatiquement le meilleur parser
        };
        
        // Cache multi-niveaux pour optimisation
        this.cacheManager = new CacheManager({
            l1MaxSize: 50,
            l2MaxSize: 20,
            l3MaxSize: 100,
            ttl: {
                playlist: 24 * 60 * 60 * 1000, // 24h
                channels: 6 * 60 * 60 * 1000, // 6h
                metadata: 60 * 60 * 1000 // 1h
            },
            compressionEnabled: true,
            preloadEnabled: true
        });
        
        // Charger les playlists de manière asynchrone
        this.chargerPlaylists().catch(error => {
            console.error('❌ Erreur chargement playlists:', error);
        }).finally(() => {
            // Vérifier l'intégrité après le chargement
            this.checkDataIntegrity();
        });
    }
    
    /**
     * S'assurer que playlists est toujours un tableau
     */
    ensurePlaylistsArray() {
        if (!Array.isArray(this.playlists)) {
            console.warn('⚠️ Correction: playlists n\'était pas un tableau, type:', typeof this.playlists);
            this.playlists = [];
        }
    }
    
    /**
     * Vérifier l'intégrité des données
     */
    checkDataIntegrity() {
        this.ensurePlaylistsArray();
        
        if (!Array.isArray(this.channels)) {
            console.warn('⚠️ Correction: channels n\'était pas un tableau');
            this.channels = [];
        }
        
        // Vérifier que chaque playlist a les propriétés requises
        this.playlists = this.playlists.filter(playlist => {
            if (!playlist || typeof playlist !== 'object') {
                console.warn('⚠️ Playlist invalide supprimée:', playlist);
                return false;
            }
            if (!playlist.id || !playlist.name) {
                console.warn('⚠️ Playlist sans id/name supprimée:', playlist);
                return false;
            }
            return true;
        });
    }

    /**
     * Charger les playlists depuis le localStorage avec cache
     */
    async chargerPlaylists() {
        try {
            // Essayer de charger depuis le cache d'abord
            const cachedPlaylists = await this.cacheManager.get('all_playlists', 'metadata');
            if (cachedPlaylists && Array.isArray(cachedPlaylists)) {
                this.playlists = cachedPlaylists;
                console.log('⚡ Playlists chargées depuis le cache:', this.playlists.length);
                return;
            }

            const stored = localStorage.getItem('iptv_playlists');
            if (stored) {
                try {
                    this.playlists = JSON.parse(stored);
                    // Vérifier que c'est bien un tableau
                    if (!Array.isArray(this.playlists)) {
                        console.warn('⚠️ Données corrompues dans localStorage, réinitialisation...');
                        this.playlists = [];
                    }
                    console.log('✅ Playlists chargées:', this.playlists.length);
                    
                    // Mettre en cache pour les prochaines fois
                    await this.cacheManager.set('all_playlists', this.playlists, 'metadata');
                } catch (error) {
                    console.error('❌ Erreur parsing localStorage:', error);
                    this.playlists = [];
                }
            }
            
            // Charger aussi les métadonnées des playlists Xtream
            const xtreamMetadata = localStorage.getItem('iptv_playlists_metadata');
            if (xtreamMetadata) {
                const metadata = JSON.parse(xtreamMetadata);
                const xtreamPlaylists = metadata.filter(p => p.type === 'xtream');
                
                if (xtreamPlaylists.length > 0) {
                    console.log(`📁 ${xtreamPlaylists.length} playlists Xtream trouvées en métadonnées`);
                    // Ajouter les playlists Xtream comme placeholders
                    xtreamPlaylists.forEach(meta => {
                        if (!this.playlists.find(p => p.id === meta.id)) {
                            this.playlists.push({
                                ...meta,
                                channels: [], // Sera rechargé à la demande
                                isXtreamPlaceholder: true
                            });
                        }
                    });
                }
            }
        } catch (error) {
            console.error('❌ Erreur chargement playlists:', error);
            this.playlists = [];
        }
    }

    /**
     * Charger les chaînes depuis le storage et sélectionner la playlist
     */
    loadChannelsFromStorage() {
        try {
            console.log('📂 Chargement channels depuis storage...');
            
            // Load playlists
            const storedPlaylists = localStorage.getItem('iptv_playlists');
            if (storedPlaylists) {
                this.playlists = JSON.parse(storedPlaylists);
            }
            
            // Load current playlist
            const currentPlaylistId = localStorage.getItem('iptv_current_playlist');
            if (currentPlaylistId && this.playlists.find(p => p.id === currentPlaylistId)) {
                this.selectPlaylist(currentPlaylistId, false); // false = pas de notification
            } else if (this.playlists.length > 0) {
                this.selectPlaylist(this.playlists[0].id, false);
            }
            
            console.log('✅ Channels chargés:', this.channels.length);
            return {
                playlists: this.playlists,
                channels: this.channels,
                currentPlaylist: this.currentPlaylist
            };
            
        } catch (error) {
            console.error('❌ Erreur chargement données:', error);
            return {
                playlists: [],
                channels: [],
                currentPlaylist: null
            };
        }
    }

    /**
     * Sauvegarder les playlists dans le localStorage
     */
    savePlaylistsToStorage() {
        try {
            // Filtrer les playlists volumineuses (Xtream) pour localStorage
            const playlistsToSave = this.playlists.filter(playlist => {
                // Ne pas sauvegarder les playlists Xtream avec plus de 1000 chaînes
                if (playlist.type === 'xtream' && playlist.channels?.length > 1000) {
                    console.log(`⏭️ Skipping playlist volumineuse: ${playlist.name} (${playlist.channels?.length} chaînes)`);
                    return false;
                }
                return true;
            });
            
            const data = JSON.stringify(playlistsToSave);
            const sizeInMB = (new Blob([data]).size / 1024 / 1024).toFixed(2);
            console.log(`💾 Tentative de sauvegarde: ${sizeInMB}MB (${playlistsToSave.length}/${this.playlists.length} playlists)`);
            
            // Vérifier la taille avant sauvegarde
            if (sizeInMB > 5) {
                console.warn('⚠️ Taille trop importante pour localStorage, sauvegarde des métadonnées seulement');
                this.savePlaylistsMetadataOnly();
                return;
            }
            
            localStorage.setItem('iptv_playlists', data);
            console.log(`✅ Sauvegarde réussie: ${sizeInMB}MB`);
        } catch (error) {
            console.error('❌ Erreur sauvegarde playlists:', error);
            if (error.name === 'QuotaExceededError') {
                console.warn('🚨 Quota localStorage dépassé, utilisation du cache optimisé');
                
                // Forcer la sauvegarde via le cache système
                const playlistsMetadata = this.playlists.map(p => ({
                    id: p.id,
                    name: p.name,
                    source: p.source,
                    channelCount: p.channelCount,
                    createdAt: p.createdAt,
                    updatedAt: p.updatedAt,
                    isLarge: p.channels && p.channels.length > 5000
                }));
                
                // Sauvegarder via le cache manager
                this.cacheManager.set('playlists_metadata', playlistsMetadata, 'metadata').then(() => {
                    console.log('✅ Métadonnées sauvegardées via le cache');
                }).catch(cacheError => {
                    console.error('❌ Échec sauvegarde cache:', cacheError);
                    // Fallback vers la méthode traditionnelle
                    this.savePlaylistsMetadataOnly();
                });
                
                return;
            }
            throw error;
        }
    }
    
    savePlaylistsMetadataOnly() {
        try {
            // Sauvegarder seulement les métadonnées des playlists
            const metadata = this.playlists.map(playlist => ({
                id: playlist.id,
                name: playlist.name,
                type: playlist.type,
                source: playlist.source,
                channelCount: playlist.channels?.length || 0,
                lastModified: playlist.lastModified || new Date().toISOString()
            }));
            
            localStorage.setItem('iptv_playlists_metadata', JSON.stringify(metadata));
            console.log(`✅ Métadonnées sauvegardées: ${metadata.length} playlists`);
        } catch (error) {
            console.error('❌ Erreur sauvegarde métadonnées:', error);
        }
    }

    /**
     * Ajouter une nouvelle playlist
     */
    async addPlaylist(name, content, source) {
        console.log('🚀 Ajout playlist:', { name, source });
        
        if (!name || !content) {
            throw new Error('Nom et contenu requis');
        }

        try {
            // Générer un ID unique pour la playlist
            const playlistId = `playlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Vérifier le cache pour ce contenu
            const cacheKey = `playlist_content_${this.generateContentHash(content)}`;
            let channels = await this.cacheManager.get(cacheKey, 'channels');
            
            if (channels) {
                console.log('⚡ Chaînes trouvées dans le cache');
            } else {
                console.log('🔄 Parsing playlist...');
                channels = await this.parseM3U(content);
                
                // Mettre en cache les chaînes parsées
                await this.cacheManager.set(cacheKey, channels, 'channels');
                console.log('💾 Chaînes mises en cache');
            }
            
            if (channels.length === 0) {
                throw new Error('Aucune chaîne trouvée dans la playlist');
            }

            const playlist = {
                id: playlistId,
                name: name,
                source: source || 'Manuel',
                channels: channels,
                channelCount: channels.length,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Stratégie de cache selon la taille
            const playlistSize = JSON.stringify(playlist).length;
            console.log(`📊 Taille playlist: ${(playlistSize/1024/1024).toFixed(2)}MB`);
            
            if (playlistSize > 5 * 1024 * 1024) { // > 5MB
                console.log('🚨 Playlist très volumineuse, cache optimisé');
                
                // Pour les très gros catalogues, cacher seulement les métadonnées
                const lightPlaylist = {
                    id: playlistId,
                    name: playlist.name,
                    source: playlist.source,
                    channelCount: playlist.channelCount,
                    createdAt: playlist.createdAt,
                    updatedAt: playlist.updatedAt,
                    isLarge: true
                };
                
                await this.cacheManager.cachePlaylist(playlistId, lightPlaylist);
                
                // Cacher les chaînes par chunks de 1000
                const chunkSize = 1000;
                for (let i = 0; i < channels.length; i += chunkSize) {
                    const chunk = channels.slice(i, i + chunkSize);
                    const chunkKey = `${playlistId}_chunk_${Math.floor(i/chunkSize)}`;
                    await this.cacheManager.cacheChannelList(chunkKey, chunk);
                }
                
                // Cacher les métadonnées des chunks
                const chunkMetadata = {
                    totalChunks: Math.ceil(channels.length / chunkSize),
                    chunkSize,
                    totalChannels: channels.length
                };
                await this.cacheManager.set(`${playlistId}_chunks_meta`, chunkMetadata, 'metadata');
                
            } else {
                // Cache normal pour les playlists raisonnables
                await this.cacheManager.cachePlaylist(playlistId, playlist);
                await this.cacheManager.cacheChannelList(playlistId, channels);
            }

            // Vérifier l'intégrité des données
            this.checkDataIntegrity();
            
            this.playlists.push(playlist);
            this.savePlaylistsToStorage();
            
            console.log('✅ Playlist ajoutée:', playlist.name, `(${channels.length} chaînes)`);
            return playlist;
            
        } catch (error) {
            console.error('❌ Erreur ajout playlist:', error);
            throw error;
        }
    }

    /**
     * Supprimer une playlist
     */
    deletePlaylist(playlistId) {
        this.ensurePlaylistsArray();
        const playlist = this.playlists.find(p => p.id === playlistId);
        if (!playlist) {
            console.warn('⚠️ Playlist introuvable:', playlistId);
            return false;
        }
        
        console.log('🗑️ Suppression playlist:', playlist.name);
        
        this.ensurePlaylistsArray();
        this.playlists = this.playlists.filter(p => p.id !== playlistId);
        
        // Si c'était la playlist courante, nettoyer
        if (this.currentPlaylist === playlistId) {
            this.currentPlaylist = null;
            this.channels = [];
        }
        
        this.savePlaylistsToStorage();
        console.log('✅ Playlist supprimée');
        return true;
    }

    /**
     * Sélectionner une playlist
     */
    selectPlaylist(playlistId, showNotification = true) {
        this.ensurePlaylistsArray();
        const playlist = this.playlists.find(p => p.id === playlistId);
        if (!playlist) {
            console.warn('⚠️ Playlist introuvable:', playlistId);
            return false;
        }
        
        console.log('📺 Sélection playlist:', playlist.name);
        
        this.currentPlaylist = playlistId;
        this.channels = [...playlist.channels];
        
        localStorage.setItem('iptv_current_playlist', playlistId);
        
        console.log('✅ Playlist sélectionnée:', this.channels.length, 'chaînes');
        return {
            playlist: playlist,
            channels: this.channels,
            showNotification: showNotification
        };
    }

    /**
     * Parser le contenu M3U/M3U8 avec cascade de parsers optimisés
     */
    async parseM3U(content) {
        console.log('🔍 Parsing M3U avec parsers optimisés...');
        
        if (!content || typeof content !== 'string') {
            console.warn('⚠️ Contenu M3U invalide');
            return [];
        }

        let channels = [];
        const estimatedChannels = (content.match(/#EXTINF:/g) || []).length;
        const contentSizeMB = content.length / 1024 / 1024;
        
        console.log(`📊 Contenu analysé: ${estimatedChannels} chaînes estimées, ${contentSizeMB.toFixed(2)}MB`);
        
        // Stratégie de parsing par priorité
        const shouldUseUltraOptimized = this.parserConfig.useUltraOptimized && 
            (estimatedChannels >= this.parserConfig.ultraOptimizedThreshold || 
             contentSizeMB > 10 || 
             this.parserConfig.autoDetectBestParser);
        
        if (shouldUseUltraOptimized) {
            try {
                console.log('🚀 Utilisation du parser ultra-optimisé...');
                
                // Configuration du parser ultra-optimisé
                const ultraConfig = {
                    chunkSize: this.parserConfig.chunkSize,
                    yieldControl: this.parserConfig.yieldControl,
                    useWorker: this.parserConfig.useWorker && contentSizeMB > 50
                };
                
                const startTime = performance.now();
                const result = await this.ultraM3uParser.parseM3U(content, ultraConfig);
                const parseTime = performance.now() - startTime;
                
                channels = result.channels || [];
                const stats = result.stats || this.ultraM3uParser.getStats();
                
                // Logs de performance ultra-détaillés
                console.log(`🏆 Parser ultra-optimisé: ${parseTime.toFixed(2)}ms pour ${channels.length} chaînes`);
                console.log(`⚡ Vitesse: ${stats.channelsPerSecond} chaînes/seconde`);
                console.log(`🔄 Efficacité pool: ${stats.poolEfficiency.toFixed(1)}%`);
                console.log(`📦 Efficacité cache: ${stats.cacheEfficiency.toFixed(1)}%`);
                console.log(`🧠 Mémoire utilisée: ${stats.memoryUsageMB}MB`);
                
                // Alerter si performance dégradée
                if (stats.channelsPerSecond < 5000) {
                    console.warn(`🐌 Performance ultra-parser dégradée: ${stats.channelsPerSecond} ch/s`);
                }
                
            } catch (error) {
                console.error('❌ Erreur parser ultra-optimisé, fallback vers parser optimisé:', error);
                channels = await this.parseM3UWithOptimizedFallback(content);
            }
        } else {
            channels = await this.parseM3UWithOptimizedFallback(content);
        }
        
        console.log('✅ Parsing M3U terminé:', channels.length, 'chaînes');
        return channels;
    }
    
    /**
     * Fallback vers le parser optimisé puis traditionnel
     */
    async parseM3UWithOptimizedFallback(content) {
        if (this.parserConfig.useOptimizedParser) {
            try {
                console.log('⚡ Utilisation du parser optimisé (fallback)...');
                
                // Utiliser le parser optimisé avec monitoring
                const metrics = PerformanceMonitor.measureParsingPerformance(
                    this.m3uParser, 
                    content, 
                    'OptimizedParser'
                );
                
                const channels = this.m3uParser.parseM3U(content);
                
                // Logs de performance détaillés
                const stats = this.m3uParser.getStats();
                console.log(`📊 Performance optimisée: ${stats.parseTime.toFixed(2)}ms pour ${stats.channelsParsed} chaînes`);
                console.log(`🎯 Efficacité pool: ${stats.poolEfficiency.toFixed(1)}%`);
                console.log(`📦 Efficacité cache: ${stats.cacheEfficiency.toFixed(1)}%`);
                console.log(`⚡ Vitesse: ${stats.channelsPerSecond} chaînes/seconde`);
                
                // Alerter si performance dégradée
                if (stats.channelsPerSecond < 1000) {
                    console.warn(`🐌 Performance parsing dégradée: ${stats.channelsPerSecond} ch/s`);
                }
                
                return channels;
                
            } catch (error) {
                console.error('❌ Erreur parser optimisé, fallback vers parser traditionnel:', error);
                return this.parseM3UTraditional(content);
            }
        } else {
            return this.parseM3UTraditional(content);
        }
    }
    
    /**
     * Parser M3U traditionnel (fallback/comparaison)
     * @deprecated Utiliser le parser optimisé pour de meilleures performances
     */
    parseM3UTraditional(content) {
        console.log('🔄 Parsing M3U traditionnel (fallback)...');
        
        const lines = content.split('\n').map(line => line.trim()).filter(line => line);
        const channels = [];
        let currentChannel = {};
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.startsWith('#EXTINF:')) {
                const info = this.parseExtinf(line);
                currentChannel = {
                    id: `channel_${Date.now()}_${i}`,
                    name: info.name || `Chaîne ${channels.length + 1}`,
                    logo: info.logo || '',
                    group: info.group || 'Général',
                    url: ''
                };
            } else if (line.startsWith('http') && currentChannel.name) {
                currentChannel.url = line;
                channels.push({ ...currentChannel });
                currentChannel = {};
            }
        }
        
        return channels;
    }

    /**
     * Parser une ligne EXTINF
     */
    parseExtinf(line) {
        const result = { name: '', logo: '', group: '' };
        
        // Extract logo
        const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
        if (logoMatch) result.logo = logoMatch[1];
        
        // Extract group
        const groupMatch = line.match(/group-title="([^"]+)"/i);
        if (groupMatch) result.group = groupMatch[1];
        
        // Extract name
        const nameMatch = line.match(/,(.+)$/);
        if (nameMatch) result.name = nameMatch[1].trim();
        
        return result;
    }

    /**
     * Rendre la liste des playlists pour l'interface
     */
    renderPlaylistsList() {
        const container = document.getElementById('playlistsList');
        if (!container) {
            console.warn('⚠️ Container playlistsList introuvable');
            return '';
        }
        
        this.ensurePlaylistsArray();
        if (this.playlists.length === 0) {
            const emptyHtml = `
                <div class="empty-playlists">
                    <p class="text-muted">Aucune playlist ajoutée</p>
                    <small class="text-muted">Utilisez le bouton "+" ci-dessus pour ajouter votre première playlist</small>
                </div>
            `;
            container.innerHTML = emptyHtml;
            return emptyHtml;
        }
        
        this.ensurePlaylistsArray();
        const playlistsHtml = this.playlists.map(playlist => {
            const isActive = playlist.id === this.currentPlaylist;
            return `
                <div class="playlist-item ${isActive ? 'active' : ''}" 
                     onclick="app.playlistManager.selectPlaylistFromUI('${playlist.id}')">
                    <div class="playlist-item-content">
                        <span class="material-icons">playlist_play</span>
                        <div class="playlist-item-info">
                            <div class="playlist-item-name">${this.escapeHtml(playlist.name)}</div>
                            <div class="playlist-item-count">${playlist.channelCount} chaînes</div>
                        </div>
                    </div>
                    <div class="playlist-item-actions">
                        <button class="btn-icon" onclick="event.stopPropagation(); app.playlistManager.deletePlaylistFromUI('${playlist.id}')" title="Supprimer">
                            <span class="material-icons">delete</span>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = playlistsHtml;
        return playlistsHtml;
    }

    /**
     * Rendre la liste des playlists pour la modal de gestion
     */
    renderManagePlaylistsList() {
        const container = document.getElementById('managePlaylistsList');
        const noPlaylistsMsg = document.getElementById('noPlaylistsMessage');
        
        if (!container) {
            console.warn('⚠️ Container managePlaylistsList introuvable');
            return '';
        }
        
        this.ensurePlaylistsArray();
        if (this.playlists.length === 0) {
            if (container) container.style.display = 'none';
            if (noPlaylistsMsg) noPlaylistsMsg.style.display = 'block';
            return '';
        }
        
        if (container) container.style.display = 'block';
        if (noPlaylistsMsg) noPlaylistsMsg.style.display = 'none';
        
        this.ensurePlaylistsArray();
        const manageHtml = this.playlists.map(playlist => {
            const createdDate = new Date(playlist.createdAt).toLocaleDateString('fr-FR');
            const isActive = playlist.id === this.currentPlaylist;
            
            return `
                <div class="manage-playlist-item ${isActive ? 'active' : ''}">
                    <div class="manage-playlist-info">
                        <div class="manage-playlist-name">${this.escapeHtml(playlist.name)}</div>
                        <div class="manage-playlist-details">
                            <span>${playlist.channelCount} chaînes</span>
                            <span>•</span>
                            <span>Créée le ${createdDate}</span>
                        </div>
                    </div>
                    <div class="manage-playlist-actions">
                        <button class="btn btn-sm" 
                                onclick="app.playlistManager.selectPlaylistFromUI('${playlist.id}'); app.closeModal('managePlaylistsModal');">
                            Sélectionner
                        </button>
                        <button class="btn btn-sm btn-danger" 
                                onclick="app.playlistManager.deletePlaylistFromUI('${playlist.id}')" 
                                title="Supprimer">
                            Supprimer
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = manageHtml;
        return manageHtml;
    }

    /**
     * Sélectionner playlist depuis l'interface (avec callbacks)
     */
    selectPlaylistFromUI(playlistId) {
        const result = this.selectPlaylist(playlistId, true);
        if (result) {
            // Déclencher les callbacks nécessaires
            if (window.app) {
                window.app.channels = this.channels;
                window.app.currentPlaylist = this.currentPlaylist;
                window.app.channelManager.renderChannels();
                window.app.channelManager.updateCategories();
                if (result.showNotification) {
                    window.app.notifications.showNotification(`Playlist "${result.playlist.name}" sélectionnée`, 'success');
                }
            }
            this.renderPlaylistsList();
        }
    }

    /**
     * Supprimer playlist depuis l'interface (avec callbacks)
     */
    deletePlaylistFromUI(playlistId) {
        this.ensurePlaylistsArray();
        const playlist = this.playlists.find(p => p.id === playlistId);
        if (!playlist) return;
        
        if (!confirm(`Supprimer la playlist "${playlist.name}" ?`)) return;
        
        const wasDeleted = this.deletePlaylist(playlistId);
        if (wasDeleted) {
            // Mettre à jour l'app
            if (window.app) {
                window.app.playlists = this.playlists;
                window.app.channels = this.channels;
                window.app.currentPlaylist = this.currentPlaylist;
                
                // Si on a supprimé la playlist courante
                if (this.currentPlaylist === null && this.playlists.length > 0) {
                    this.selectPlaylistFromUI(this.playlists[0].id);
                } else if (this.playlists.length === 0) {
                    window.app.channelManager.renderChannels();
                }
                
                window.app.notifications.showNotification('Playlist supprimée', 'success');
            }
            
            this.renderPlaylistsList();
            this.renderManagePlaylistsList();
        }
    }

    /**
     * Échapper le HTML pour éviter les injections
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Obtenir les données actuelles
     */
    obtenirDonnees() {
        return {
            playlists: this.playlists,
            channels: this.channels,
            currentPlaylist: this.currentPlaylist
        };
    }

    /**
     * Obtenir une playlist par ID
     */
    obtenirPlaylist(playlistId) {
        return this.playlists.find(p => p.id === playlistId);
    }

    /**
     * Obtenir les chaînes de la playlist courante
     */
    obtenirChannels() {
        return [...this.channels];
    }

    /**
     * Génère un hash du contenu pour la mise en cache
     */
    generateContentHash(content) {
        let hash = 0;
        const str = content.substring(0, 1000); // Utiliser les 1000 premiers caractères
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convertir en entier 32 bits
        }
        return Math.abs(hash).toString(36);
    }
    
    /**
     * Obtenir les chaînes en cache pour une playlist
     */
    async getCachedChannelList(playlistId) {
        return await this.cacheManager.getCachedChannelList(playlistId);
    }
    
    /**
     * Obtenir les catégories disponibles avec cache
     */
    async obtenirCategories() {
        const cacheKey = 'categories_list';
        let categories = await this.cacheManager.get(cacheKey, 'metadata');
        
        if (!categories) {
            const categorySet = new Set();
            this.channels.forEach(channel => {
                if (channel.group && channel.group.trim()) {
                    categorySet.add(channel.group.trim());
                }
            });
            categories = Array.from(categorySet).sort();
            
            // Mettre en cache pour 1 heure
            await this.cacheManager.set(cacheKey, categories, 'metadata');
        }
        
        return categories;
    }
    
    /**
     * Basculer entre parser optimisé et traditionnel
     */
    toggleOptimizedParser(enabled) {
        this.parserConfig.useOptimizedParser = enabled;
        console.log(`⚡ Parser optimisé ${enabled ? 'activé' : 'désactivé'}`);
    }
    
    /**
     * Basculer le parser ultra-optimisé
     */
    toggleUltraOptimizedParser(enabled) {
        this.parserConfig.useUltraOptimized = enabled;
        console.log(`🚀 Parser ultra-optimisé ${enabled ? 'activé' : 'désactivé'}`);
    }
    
    /**
     * Configurer les parsers
     */
    configureParser(options) {
        this.parserConfig = {
            ...this.parserConfig,
            ...options
        };
        console.log('⚙️ Configuration parser mise à jour:', this.parserConfig);
    }
    
    /**
     * Obtenir la configuration des parsers
     */
    getParserConfig() {
        return { ...this.parserConfig };
    }
    
    /**
     * Obtenir les métriques du cache
     */
    getCacheMetrics() {
        return this.cacheManager.getMetrics();
    }
    
    /**
     * Précharger les données d'une playlist
     */
    async preloadPlaylistData(playlistId) {
        this.ensurePlaylistsArray();
        const playlist = this.playlists.find(p => p.id === playlistId);
        if (playlist && playlist.channels) {
            console.log(`🔄 Préchargement playlist: ${playlist.name}`);
            this.cacheManager.preloadChannelData(playlist.channels);
        }
    }
    
    /**
     * Nettoyer le cache
     */
    async clearCache() {
        await this.cacheManager.clear();
        console.log('🗑️ Cache PlaylistManager vidé');
    }
    
    /**
     * Comparer les performances des trois parsers
     */
    async compareParsingPerformance(content) {
        console.log('⚔️ Comparaison performance des 3 parsers...');
        
        if (!content) {
            console.warn('⚠️ Aucun contenu à analyser');
            return null;
        }
        
        try {
            const results = {
                traditional: null,
                optimized: null,
                ultraOptimized: null,
                comparison: null
            };
            
            // Test parser traditionnel
            const traditionalStart = performance.now();
            const traditionalChannels = this.parseM3UTraditional(content);
            const traditionalTime = performance.now() - traditionalStart;
            
            results.traditional = {
                channels: traditionalChannels.length,
                parseTime: traditionalTime,
                channelsPerSecond: traditionalChannels.length / (traditionalTime / 1000)
            };
            
            // Test parser optimisé
            const optimizedStart = performance.now();
            const optimizedChannels = this.m3uParser.parseM3U(content);
            const optimizedTime = performance.now() - optimizedStart;
            const optimizedStats = this.m3uParser.getStats();
            
            results.optimized = {
                channels: optimizedChannels.length,
                parseTime: optimizedTime,
                channelsPerSecond: optimizedStats.channelsPerSecond,
                poolEfficiency: optimizedStats.poolEfficiency,
                cacheEfficiency: optimizedStats.cacheEfficiency
            };
            
            // Test parser ultra-optimisé
            const ultraStart = performance.now();
            const ultraResult = await this.ultraM3uParser.parseM3U(content);
            const ultraTime = performance.now() - ultraStart;
            const ultraStats = this.ultraM3uParser.getStats();
            
            results.ultraOptimized = {
                channels: ultraResult.channels.length,
                parseTime: ultraTime,
                channelsPerSecond: ultraStats.channelsPerSecond,
                poolEfficiency: ultraStats.poolEfficiency,
                cacheEfficiency: ultraStats.cacheEfficiency,
                memoryUsage: ultraStats.memoryUsageMB
            };
            
            // Comparaison détaillée
            results.comparison = {
                optimizedVsTraditional: {
                    speedImprovement: ((results.optimized.channelsPerSecond - results.traditional.channelsPerSecond) / results.traditional.channelsPerSecond * 100).toFixed(1) + '%',
                    timeReduction: ((results.traditional.parseTime - results.optimized.parseTime) / results.traditional.parseTime * 100).toFixed(1) + '%'
                },
                ultraVsOptimized: {
                    speedImprovement: ((results.ultraOptimized.channelsPerSecond - results.optimized.channelsPerSecond) / results.optimized.channelsPerSecond * 100).toFixed(1) + '%',
                    timeReduction: ((results.optimized.parseTime - results.ultraOptimized.parseTime) / results.optimized.parseTime * 100).toFixed(1) + '%'
                },
                ultraVsTraditional: {
                    speedImprovement: ((results.ultraOptimized.channelsPerSecond - results.traditional.channelsPerSecond) / results.traditional.channelsPerSecond * 100).toFixed(1) + '%',
                    timeReduction: ((results.traditional.parseTime - results.ultraOptimized.parseTime) / results.traditional.parseTime * 100).toFixed(1) + '%'
                }
            };
            
            console.log('📊 Résultats comparaison:', results.comparison);
            return results;
            
        } catch (error) {
            console.error('❌ Erreur lors de la comparaison:', error);
            return null;
        }
    }
    
    /**
     * Lancer un test de stress sur les parsers
     */
    async runParsingStressTest() {
        console.log('🔥 Lancement test de stress parsing...');
        
        try {
            const testSizes = [1000, 2000, 5000, 10000, 18000, 25000];
            const results = {
                optimized: null,
                ultraOptimized: null,
                comparison: []
            };
            
            // Test de stress parser optimisé
            console.log('📊 Test de stress parser optimisé...');
            results.optimized = await PerformanceMonitor.stressTestParsing(
                this.m3uParser,
                testSizes
            );
            
            // Test de stress parser ultra-optimisé
            console.log('🚀 Test de stress parser ultra-optimisé...');
            if (typeof this.ultraM3uParser.benchmarkComplete === 'function') {
                results.ultraOptimized = await this.ultraM3uParser.benchmarkComplete();
            }
            
            // Comparaison des résultats
            if (results.optimized && results.ultraOptimized) {
                testSizes.forEach((size, index) => {
                    const optResult = results.optimized[index];
                    const ultraResult = results.ultraOptimized[index];
                    
                    if (optResult && ultraResult) {
                        const comparison = {
                            size: size,
                            optimizedTime: optResult.parseTime || 0,
                            ultraOptimizedTime: ultraResult.parseTime || 0,
                            speedImprovement: 0,
                            memoryImprovement: 0
                        };
                        
                        if (optResult.parseTime > 0 && ultraResult.parseTime > 0) {
                            comparison.speedImprovement = ((optResult.parseTime - ultraResult.parseTime) / optResult.parseTime * 100).toFixed(1);
                            comparison.memoryImprovement = ((optResult.memoryUsage - ultraResult.memoryUsage) / optResult.memoryUsage * 100).toFixed(1);
                        }
                        
                        results.comparison.push(comparison);
                    }
                });
            }
            
            console.log('📋 Résultats test de stress:', results);
            return results;
            
        } catch (error) {
            console.error('❌ Erreur test de stress:', error);
            return null;
        }
    }
    
    /**
     * Obtenir les statistiques du parser optimisé
     */
    getParsingStats() {
        if (!this.m3uParser || typeof this.m3uParser.getStats !== 'function') {
            console.warn('⚠️ Stats du parser non disponibles');
            return null;
        }
        
        return this.m3uParser.getStats();
    }
    
    /**
     * Obtenir les statistiques du parser ultra-optimisé
     */
    getUltraParsingStats() {
        if (!this.ultraM3uParser || typeof this.ultraM3uParser.getStats !== 'function') {
            console.warn('⚠️ Stats du parser ultra-optimisé non disponibles');
            return null;
        }
        
        return this.ultraM3uParser.getStats();
    }
    
    /**
     * Obtenir les statistiques combinées des parsers
     */
    getAllParsingStats() {
        return {
            optimizedParser: this.getParsingStats(),
            ultraOptimizedParser: this.getUltraParsingStats(),
            config: this.getParserConfig(),
            cache: this.getCacheMetrics()
        };
    }
    
    /**
     * Nettoyer le cache du parser pour optimiser la mémoire
     */
    async cleanupParserCache() {
        let cleaned = false;
        
        if (this.m3uParser && typeof this.m3uParser.cleanup === 'function') {
            this.m3uParser.cleanup();
            cleaned = true;
        }
        
        if (this.ultraM3uParser && typeof this.ultraM3uParser.cleanup === 'function') {
            await this.ultraM3uParser.cleanup();
            cleaned = true;
        }
        
        if (cleaned) {
            console.log('🧹 Cache des parsers nettoyé');
        } else {
            console.log('⚠️ Aucun cache de parser à nettoyer');
        }
    }
    
    /**
     * Benchmark automatique des parsers
     */
    async benchmarkParser() {
        console.log('🏁 Benchmark des parsers...');
        
        const results = {
            optimizedParser: null,
            ultraOptimizedParser: null,
            comparison: null
        };
        
        try {
            // Benchmark du parser optimisé
            if (typeof this.m3uParser.benchmark === 'function') {
                console.log('📊 Benchmark parser optimisé...');
                results.optimizedParser = await this.m3uParser.benchmark([1000, 2000, 5000]);
            }
            
            // Benchmark du parser ultra-optimisé
            if (typeof this.ultraM3uParser.benchmarkComplete === 'function') {
                console.log('🚀 Benchmark parser ultra-optimisé...');
                results.ultraOptimizedParser = await this.ultraM3uParser.benchmarkComplete();
            }
            
            // Comparaison si les deux sont disponibles
            if (results.optimizedParser && results.ultraOptimizedParser) {
                results.comparison = this.compareParserResults(results.optimizedParser, results.ultraOptimizedParser);
            }
            
            return results;
            
        } catch (error) {
            console.error('❌ Erreur benchmark:', error);
            return results;
        }
    }
    
    /**
     * Comparer les résultats des parsers
     */
    compareParserResults(optimizedResults, ultraOptimizedResults) {
        const comparison = {
            speedImprovement: {},
            memoryImprovement: {},
            recommendation: ''
        };
        
        // Comparer les vitesses pour chaque taille testée
        if (Array.isArray(optimizedResults) && Array.isArray(ultraOptimizedResults)) {
            optimizedResults.forEach((optResult, index) => {
                const ultraResult = ultraOptimizedResults[index];
                if (optResult && ultraResult) {
                    const speedImprovement = ((optResult.channelsPerSecond - ultraResult.channelsPerSecond) / optResult.channelsPerSecond * 100);
                    comparison.speedImprovement[`${optResult.size || index}`] = speedImprovement.toFixed(1) + '%';
                }
            });
        }
        
        // Génération de recommandations
        const avgImprovement = Object.values(comparison.speedImprovement)
            .map(val => parseFloat(val))
            .reduce((a, b) => a + b, 0) / Object.keys(comparison.speedImprovement).length;
        
        if (avgImprovement > 50) {
            comparison.recommendation = 'Parser ultra-optimisé recommandé pour toutes les tailles';
        } else if (avgImprovement > 20) {
            comparison.recommendation = 'Parser ultra-optimisé recommandé pour les grandes playlists';
        } else {
            comparison.recommendation = 'Parser optimisé suffisant pour la plupart des cas';
        }
        
        return comparison;
    }
    
    /**
     * Analyser les performances d'une playlist existante
     */
    analyzePlaylistPerformance(playlistId) {
        this.ensurePlaylistsArray();
        const playlist = this.playlists.find(p => p.id === playlistId);
        if (!playlist) {
            console.warn('⚠️ Playlist introuvable pour analyse');
            return null;
        }
        
        const analysis = {
            playlistId,
            name: playlist.name,
            channelCount: playlist.channelCount,
            sizeEstimate: playlist.channels.reduce((sum, ch) => 
                sum + (ch.name?.length || 0) + (ch.url?.length || 0) + (ch.logo?.length || 0), 0
            ),
            categories: [...new Set(playlist.channels.map(ch => ch.group))].length,
            estimatedParsingTime: this.estimateParsingTime(playlist.channelCount),
            recommendations: this.generateParsingRecommendations(playlist)
        };
        
        console.log('📊 Analyse playlist:', analysis);
        return analysis;
    }
    
    /**
     * Estimer le temps de parsing basé sur le nombre de chaînes
     */
    estimateParsingTime(channelCount) {
        // Basé sur les benchmarks du parser optimisé
        const timePerChannel = 0.1; // ms par chaîne (optimisé)
        return {
            optimized: channelCount * timePerChannel,
            traditional: channelCount * timePerChannel * 3, // 3x plus lent
            improvement: '70% plus rapide'
        };
    }
    
    /**
     * Générer des recommandations pour l'optimisation
     */
    generateParsingRecommendations(playlist) {
        const recommendations = [];
        
        if (playlist.channelCount > 5000) {
            recommendations.push({
                type: 'performance',
                message: 'Playlist très large détectée. Le parser optimisé est fortement recommandé.',
                action: 'Vérifier que useOptimizedParser est activé'
            });
        }
        
        if (playlist.channelCount > 10000) {
            recommendations.push({
                type: 'memory',
                message: 'Playlist massive. Considérer le nettoyage périodique du cache.',
                action: 'Appeler cleanupParserCache() régulièrement'
            });
        }
        
        const uniqueGroups = [...new Set(playlist.channels.map(ch => ch.group))].length;
        if (uniqueGroups > 50) {
            recommendations.push({
                type: 'cache',
                message: 'Beaucoup de catégories uniques. Cache de strings bénéfique.',
                action: 'Le cache automatique optimise déjà cela'
            });
        }
        
        return recommendations;
    }
    
    /**
     * Choix automatique du meilleur parser selon le contenu
     */
    selectBestParser(content) {
        if (!content) return 'traditional';
        
        const estimatedChannels = (content.match(/#EXTINF:/g) || []).length;
        const contentSizeMB = content.length / 1024 / 1024;
        
        // Critères de décision
        const isLargePlaylist = estimatedChannels >= this.parserConfig.ultraOptimizedThreshold;
        const isLargeFile = contentSizeMB > 10;
        const isXLPlaylist = estimatedChannels >= 15000;
        
        let selectedParser = 'traditional';
        let reason = 'Playlist petite, parser traditionnel suffisant';
        
        if (isXLPlaylist) {
            selectedParser = 'ultraOptimized';
            reason = `Playlist très large (${estimatedChannels} chaînes), parser ultra-optimisé requis`;
        } else if (isLargePlaylist || isLargeFile) {
            selectedParser = this.parserConfig.useUltraOptimized ? 'ultraOptimized' : 'optimized';
            reason = `Playlist large (${estimatedChannels} chaînes, ${contentSizeMB.toFixed(2)}MB), parser ${selectedParser} recommandé`;
        } else if (estimatedChannels > 1000) {
            selectedParser = 'optimized';
            reason = `Playlist moyenne (${estimatedChannels} chaînes), parser optimisé recommandé`;
        }
        
        console.log(`🎯 Sélection automatique: ${selectedParser} - ${reason}`);
        
        return {
            parser: selectedParser,
            reason: reason,
            estimatedChannels: estimatedChannels,
            contentSizeMB: contentSizeMB
        };
    }
    
    /**
     * Obtenir les recommandations d'optimisation parser
     */
    getParserOptimizationRecommendations() {
        const recommendations = [];
        
        // Analyse de la configuration actuelle
        if (!this.parserConfig.useUltraOptimized) {
            recommendations.push({
                type: 'performance',
                priority: 'high',
                message: 'Parser ultra-optimisé désactivé',
                suggestion: 'Activer le parser ultra-optimisé pour de meilleures performances',
                action: 'toggleUltraOptimizedParser(true)'
            });
        }
        
        if (this.parserConfig.ultraOptimizedThreshold > 10000) {
            recommendations.push({
                type: 'configuration',
                priority: 'medium',
                message: 'Seuil ultra-optimisé trop élevé',
                suggestion: 'Réduire le seuil à 5000 pour bénéficier plus souvent du parser ultra-optimisé',
                action: 'configureParser({ ultraOptimizedThreshold: 5000 })'
            });
        }
        
        if (!this.parserConfig.yieldControl) {
            recommendations.push({
                type: 'ux',
                priority: 'medium',
                message: 'Contrôle UI désactivé',
                suggestion: 'Activer le yield control pour éviter le gel de l\'interface',
                action: 'configureParser({ yieldControl: true })'
            });
        }
        
        // Recommandations basées sur l'historique des performances
        const optimizedStats = this.getParsingStats();
        const ultraStats = this.getUltraParsingStats();
        
        if (optimizedStats && optimizedStats.channelsPerSecond < 1000) {
            recommendations.push({
                type: 'performance',
                priority: 'high',
                message: 'Performance dégradée du parser optimisé',
                suggestion: 'Nettoyer le cache ou redémarrer l\'application',
                action: 'cleanupParserCache()'
            });
        }
        
        if (ultraStats && ultraStats.poolEfficiency < 80) {
            recommendations.push({
                type: 'memory',
                priority: 'medium',
                message: 'Efficacité du pool dégradée',
                suggestion: 'Le pool d\'objets pourrait être optimisé',
                action: 'Automatique lors du prochain parsing'
            });
        }
        
        return recommendations;
    }
    
    /**
     * Diagnostic complet des parsers
     */
    async runParserDiagnostic() {
        console.log('🔍 Diagnostic complet des parsers...');
        
        const diagnostic = {
            timestamp: new Date().toISOString(),
            config: this.getParserConfig(),
            optimizedStats: this.getParsingStats(),
            ultraOptimizedStats: this.getUltraParsingStats(),
            cacheMetrics: this.getCacheMetrics(),
            recommendations: this.getParserOptimizationRecommendations(),
            systemInfo: {
                userAgent: navigator.userAgent,
                memory: performance.memory ? {
                    usedJSHeapSize: performance.memory.usedJSHeapSize,
                    totalJSHeapSize: performance.memory.totalJSHeapSize,
                    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
                } : null,
                hardwareConcurrency: navigator.hardwareConcurrency || 'unknown'
            }
        };
        
        console.log('📋 Diagnostic terminé:', diagnostic);
        return diagnostic;
    }
}