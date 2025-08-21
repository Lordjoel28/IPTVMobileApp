export class XtreamExtremeManager {
    constructor() {
        this.config = {
            server: '',
            username: '',
            password: '',
            timeout: 45000,
            maxRetries: 3,
            chunkSize: 1000
        };
        
        // État et données
        this.authenticated = false;
        this.accountInfo = null;
        this.channels = [];
        this.categories = [];
        this.stats = {
            totalChannels: 0,
            totalCategories: 0,
            lastSync: null,
            syncDuration: 0
        };
        
        // Composants optimisés
        this.corsProxy = new XtreamCORSProxy();
        this.streamParser = new XtreamStreamParser();
        this.cache = new XtreamCache();
        this.rateLimiter = new XtreamRateLimiter();
        
        // Cache manager externe pour intégration
        this.externalCacheManager = null;
        
        // Parser monitoring pour debugging
        this.parsingMetrics = {
            parseTime: [],
            memoryUsage: [],
            errorCount: 0,
            totalChannels: 0
        };
        
        console.log('🚀 XtreamExtremeManager initialisé (parsing synchrone optimisé)');
    }
    
    // Méthode de monitoring des performances de parsing
    measureParsingPerformance(operation, description) {
        const startTime = performance.now();
        const memoryBefore = this.getMemoryUsage();
        
        try {
            const result = operation();
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            // Enregistrer les métriques
            this.parsingMetrics.parseTime.push(duration);
            this.parsingMetrics.totalChannels += result.length || 0;
            
            const memoryAfter = this.getMemoryUsage();
            const memoryDelta = memoryAfter - memoryBefore;
            this.parsingMetrics.memoryUsage.push(memoryDelta);
            
            console.log(`📊 ${description}: ${result.length || 0} éléments en ${duration.toFixed(2)}ms`);
            if (memoryDelta > 0) {
                console.log(`💾 Mémoire utilisée: +${(memoryDelta / 1024 / 1024).toFixed(2)}MB`);
            }
            
            return result;
        } catch (error) {
            this.parsingMetrics.errorCount++;
            console.error(`❌ Erreur ${description}:`, error);
            throw error;
        }
    }
    
    getMemoryUsage() {
        return performance.memory ? performance.memory.usedJSHeapSize : 0;
    }
    
    // Configuration
    setCredentials(server, username, password) {
        this.config.server = server.replace(/\/$/, '');
        this.config.username = username;
        this.config.password = password;
        this.saveConfig();
    }
    
    getCredentials() {
        return { ...this.config };
    }
    
    clearConfig() {
        this.config = {
            server: '',
            username: '',
            password: '',
            timeout: 45000,
            maxRetries: 3,
            chunkSize: 1000
        };
        this.authenticated = false;
        this.accountInfo = null;
        this.channels = [];
        this.categories = [];
        this.clearCache();
        this.saveConfig();
    }
    
    async saveConfig() {
        try {
            // React Native: utiliser AsyncStorage au lieu de localStorage
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            await AsyncStorage.setItem('xtream_extreme_config', JSON.stringify(this.config));
        } catch (error) {
            console.warn('⚠️ Erreur sauvegarde config:', error);
        }
    }
    
    async loadConfig() {
        try {
            // React Native: utiliser AsyncStorage au lieu de localStorage
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            const saved = await AsyncStorage.getItem('xtream_extreme_config');
            if (saved) {
                this.config = { ...this.config, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.warn('⚠️ Erreur chargement config:', error);
        }
    }
    
    // Authentification avec retry intelligent
    async authenticate() {
        try {
            if (!this.config.server || !this.config.username || !this.config.password) {
                throw new Error('Configuration Xtream incomplète');
            }
            
            console.log('🔐 Authentification Xtream...');
            
            const data = await this.makeRequest('get_account_info');
            
            // Debug: afficher la réponse complète
            console.log('🔍 Réponse serveur Xtream:', data);
            console.log('🔍 Type de réponse:', typeof data);
            console.log('🔍 Clés disponibles:', data ? Object.keys(data) : 'aucune');
            
            if (data && data.user_info) {
                this.authenticated = true;
                this.accountInfo = data;
                console.log('✅ Authentification Xtream réussie');
                return data;
            } else {
                console.error('❌ Structure réponse inattendue:', data);
                throw new Error('Réponse authentification invalide');
            }
            
        } catch (error) {
            this.authenticated = false;
            this.accountInfo = null;
            console.error('❌ Échec authentification Xtream:', error);
            throw error;
        }
    }
    
    // Fetch optimisé avec Worker
    async fetchChannelsExtreme() {
        try {
            const startTime = performance.now();
            
            // Vérifier cache d'abord
            const cached = await this.cache.get('channels');
            if (cached && this.cache.isValid(cached.timestamp)) {
                console.log('💾 Chaînes trouvées en cache');
                this.channels = cached.data;
                return cached.data;
            }
            
            if (!this.authenticated) {
                await this.authenticate();
            }
            
            console.log('📡 Fetch chaînes extrême...');
            
            // Fetch catégories
            this.dispatchEvent('syncProgress', { step: 'categories', progress: 10 });
            const categories = await this.makeRequest('get_live_categories');
            this.categories = Array.isArray(categories) ? categories : [];
            
            // Fetch chaînes par chunks si gros catalogue
            this.dispatchEvent('syncProgress', { step: 'channels', progress: 30 });
            const channels = await this.fetchChannelsInChunks();
            
            // Traitement synchrone optimisé (remplace Worker défaillant)
            this.dispatchEvent('syncProgress', { step: 'processing', progress: 70 });
            
            console.log(`🔄 Parsing synchrone de ${channels.length} chaînes...`);
            const parseStartTime = performance.now();
            
            // Parser par chunks pour maintenir la fluidité UI
            const parsedChannels = await this.parseChannelsSync(channels);
            
            const duration = performance.now() - parseStartTime;
            console.log(`✅ Parsing terminé: ${parsedChannels.length} chaînes en ${duration.toFixed(2)}ms`);
            
            // Mettre à jour les stats
            this.channels = parsedChannels;
            this.stats.totalChannels = parsedChannels.length;
            this.stats.syncDuration = duration;
            this.stats.lastSync = new Date().toISOString();
            
            // Sauver en cache
            this.cache.set('channels', this.channels);
            
            this.dispatchEvent('syncProgress', { step: 'complete', progress: 100 });
            this.dispatchEvent('channelsReady', {
                channels: parsedChannels,
                stats: this.stats
            });
            
            return parsedChannels;
            
        } catch (error) {
            console.error('❌ Erreur fetch chaînes:', error);
            throw error;
        }
    }
    
    async fetchChannelsInChunks() {
        console.log('📊 Stratégie de récupération des chaînes...');
        
        // Essayer d'abord toutes les chaînes d'un coup (plus rapide et moins de problèmes CORS)
        try {
            console.log('🎯 Tentative récupération globale...');
            const channels = await this.fetchAllChannels();
            if (Array.isArray(channels) && channels.length > 0) {
                console.log(`✅ Récupération globale réussie: ${channels.length} chaînes`);
                return channels;
            }
        } catch (error) {
            console.warn('⚠️ Récupération globale échouée:', error.message);
        }
        
        // Fallback : essayer par catégories si la méthode globale échoue
        console.log('🔄 Fallback: récupération par catégories...');
        return this.fetchWithCategoryChunking();
    }
    
    async fetchAllChannels() {
        const channels = await this.makeRequest('get_live_streams');
        
        // Valider la réponse
        if (!Array.isArray(channels)) {
            throw new Error('Réponse invalide: pas un tableau');
        }
        
        return channels;
    }
    
    async fetchWithCategoryChunking() {
        const allChannels = [];
        let successfulRequests = 0;
        let totalRequests = 0;
        
        console.log(`🔄 Récupération par catégories (${this.categories.length} catégories)...`);
        
        // Traiter les catégories par petits groupes pour éviter l'overload
        const categoryChunks = this.chunkArray(this.categories, 3); // Réduire à 3 pour plus de stabilité
        
        for (let chunkIndex = 0; chunkIndex < categoryChunks.length; chunkIndex++) {
            const chunk = categoryChunks[chunkIndex];
            
            console.log(`📦 Chunk ${chunkIndex + 1}/${categoryChunks.length} (${chunk.length} catégories)`);
            
            // Attendre entre les chunks pour éviter rate limiting
            if (chunkIndex > 0) {
                await this.rateLimiter.waitForSlot();
            }
            
            // Traiter les catégories séquentiellement pour plus de stabilité
            for (const category of chunk) {
                totalRequests++;
                
                try {
                    const categoryChannels = await this.makeRequest('get_live_streams', { 
                        category_id: category.category_id 
                    });
                    
                    if (Array.isArray(categoryChannels) && categoryChannels.length > 0) {
                        allChannels.push(...categoryChannels);
                        successfulRequests++;
                        console.log(`✅ Catégorie ${category.category_name}: ${categoryChannels.length} chaînes`);
                    } else {
                        console.log(`⚠️ Catégorie ${category.category_name}: aucune chaîne`);
                    }
                    
                    // Petit délai entre les requêtes
                    await this.wait(200);
                    
                } catch (error) {
                    console.warn(`❌ Erreur catégorie ${category.category_name}:`, error.message);
                }
                
                // Mettre à jour le progress
                const progress = Math.round((totalRequests / this.categories.length) * 100);
                this.dispatchEvent('syncProgress', { 
                    step: 'fetching', 
                    progress: 30 + (progress * 0.4) // 30% à 70%
                });
            }
        }
        
        console.log(`📊 Récupération terminée: ${successfulRequests}/${totalRequests} catégories réussies`);
        console.log(`🎯 Total chaînes récupérées: ${allChannels.length}`);
        
        if (allChannels.length === 0) {
            throw new Error('Aucune chaîne récupérée de toutes les catégories');
        }
        
        return allChannels;
    }
    
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // === PARSING SYNCHRONE OPTIMISÉ ===
    
    // CORRECTION CRITIQUE: Créer le mapping category_id → category_name
    createCategoryMapping() {
        const categoryMap = new Map();
        
        // Parcourir toutes les catégories récupérées
        this.categories.forEach(category => {
            if (category && category.category_id !== undefined) {
                const categoryId = parseInt(category.category_id);
                const categoryName = this.sanitizeString(category.category_name || `Catégorie ${categoryId}`);
                categoryMap.set(categoryId, categoryName);
            }
        });
        
        // Ajouter catégorie par défaut pour ID 0
        if (!categoryMap.has(0)) {
            categoryMap.set(0, 'Non classé');
        }
        
        console.log(`📂 Mapping catégories créé (${categoryMap.size} catégories):`);
        let displayCount = 0;
        for (const [id, name] of categoryMap) {
            if (displayCount < 10) { // Limiter l'affichage pour ne pas spam les logs
                console.log(`  ${id}: "${name}"`);
                displayCount++;
            }
        }
        if (categoryMap.size > 10) {
            console.log(`  ... et ${categoryMap.size - 10} autres catégories`);
        }
        
        return categoryMap;
    }
    
    async parseChannelsSync(rawChannels, chunkSize = 1000) {
        console.log(`📊 Parsing synchrone: ${rawChannels.length} chaînes par chunks de ${chunkSize}`);
        
        // CORRECTION CRITIQUE: Créer le mapping catégories avant parsing
        const categoryMap = this.createCategoryMapping();
        console.log(`📂 Mapping catégories créé: ${categoryMap.size} catégories`);
        
        // Normaliser les données Xtream (objets avec clés numériques)
        const normalizedData = this.normalizeXtreamData(rawChannels);
        const channels = Array.isArray(normalizedData) ? normalizedData : [];
        
        if (channels.length === 0) {
            console.warn('⚠️ Aucune chaîne à parser après normalisation');
            return [];
        }
        
        const results = [];
        let processed = 0;
        
        // Parser par chunks pour maintenir la fluidité UI
        for (let i = 0; i < channels.length; i += chunkSize) {
            const chunk = channels.slice(i, i + chunkSize);
            
            // Traiter le chunk avec mapping catégories
            const chunkResults = this.parseChannelChunk(chunk, i, categoryMap);
            results.push(...chunkResults);
            
            processed += chunk.length;
            
            // Mettre à jour le progress
            const progress = Math.round((processed / channels.length) * 30); // 30% de progress pour parsing
            this.dispatchEvent('syncProgress', { 
                step: 'parsing', 
                progress: 70 + progress,
                processed,
                total: channels.length
            });
            
            // Yield pour maintenir UI responsive (requestIdleCallback alternative)
            if (i % (chunkSize * 5) === 0) { // Pause toutes les 5000 chaînes
                await this.yieldToUI();
            }
        }
        
        console.log(`✅ Parsing synchrone terminé: ${results.length}/${channels.length} chaînes validées`);
        
        // Intégration cache optimisé pour gros catalogues
        if (this.externalCacheManager && results.length > 10000) {
            console.log('🔥 Activation cache Xtream optimisé pour 25k+ chaînes');
            try {
                const playlistId = `xtream_${this.config.server}_${this.config.username}`;
                await this.externalCacheManager.cacheChannelList(playlistId, results, true);
                console.log('✅ Cache Xtream optimisé activé');
            } catch (error) {
                console.warn('⚠️ Erreur cache Xtream optimisé:', error);
            }
        }
        
        return results;
    }
    
    normalizeXtreamData(data) {
        // Gérer les structures Xtream malformées
        if (typeof data === 'object' && !Array.isArray(data)) {
            const keys = Object.keys(data);
            const isNumericKeys = keys.every(key => !isNaN(key) && key !== 'user_info');
            
            if (isNumericKeys && keys.length > 0) {
                console.log('🔧 Conversion objet Xtream malformé vers array');
                return keys.map(key => data[key]).filter(item => item && typeof item === 'object');
            }
        }
        
        return Array.isArray(data) ? data : [];
    }
    
    parseChannelChunk(chunk, startIndex, categoryMap) {
        const results = [];
        
        chunk.forEach((channel, index) => {
            try {
                if (this.isValidXtreamChannel(channel)) {
                    const normalized = this.normalizeChannel(channel, startIndex + index, categoryMap);
                    if (normalized) {
                        results.push(normalized);
                    }
                }
            } catch (error) {
                console.warn(`⚠️ Erreur parsing chaîne ${startIndex + index}:`, error.message);
            }
        });
        
        return results;
    }
    
    isValidXtreamChannel(channel) {
        return (
            channel &&
            typeof channel === 'object' &&
            (channel.stream_id || channel.id) &&
            (channel.name || channel.stream_display_name) &&
            channel.name !== null &&
            channel.name !== undefined &&
            String(channel.name).trim() !== ''
        );
    }
    
    normalizeChannel(channel, index, categoryMap) {
        try {
            const streamId = channel.stream_id || channel.id || index;
            const name = this.sanitizeString(channel.name || channel.stream_display_name || `Canal ${streamId}`);
            const logo = this.normalizeLogoURL(channel.stream_icon || channel.logo || '');
            
            // CORRECTION CRITIQUE: Mapping correct category_id → category_name  
            // Convertir category_id en number pour correspondre avec la Map
            const categoryId = parseInt(channel.category_id) || 0;
            let categoryName = categoryMap.get(categoryId) || channel.category_name || 'Non classé';
            
            // SÉCURITÉ: Ne jamais laisser de catégorie vide
            if (!categoryName || categoryName.trim() === '') {
                categoryName = categoryId === 0 ? 'Non classé' : `Catégorie ${categoryId}`;
            }
            
            // Debug: vérifier le mapping pour les premières chaînes
            if (index < 10) {
                console.log(`🔍 DEBUG CATÉGORIE - Channel ${index}: "${channel.name}"`);
                console.log(`    category_id brut: "${channel.category_id}" (type: ${typeof channel.category_id})`);
                console.log(`    category_id parsé: ${categoryId}`);
                console.log(`    categoryName trouvé: "${categoryName}"`);
                console.log(`    categoryMap contient ${categoryId}?: ${categoryMap.has(categoryId)}`);
            }
            
            return {
                id: `xtream_${streamId}`,
                name: name,
                logo: logo,
                group: categoryName, // Utiliser le nom mappé au lieu de "Général"
                url: '', // Sera généré à la demande pour économiser mémoire
                type: 'xtream',
                xtreamId: streamId,
                categoryId: categoryId,
                epgId: channel.epg_channel_id || null,
                quality: this.detectQuality(channel),
                cached: false,
                lastAccess: 0
            };
        } catch (error) {
            console.warn('Erreur normalisation chaîne:', error);
            return null;
        }
    }
    
    sanitizeString(str) {
        if (!str) return '';
        
        return String(str)
            .trim()
            .replace(/[<>]/g, '') // Supprimer caractères dangereux
            .replace(/[\n\r\t]/g, ' ') // Remplacer sauts de ligne
            .replace(/\s+/g, ' ') // Normaliser espaces
            .substring(0, 100); // Limiter longueur
    }
    
    normalizeLogoURL(url) {
        if (!url || typeof url !== 'string') return '';
        
        // Nettoyer l'URL d'entrée
        let cleanUrl = url.trim();
        if (cleanUrl === '' || cleanUrl === 'null' || cleanUrl === 'undefined') return '';
        
        // ✅ CAS 1: URL complète (http/https) - direct
        if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
            return cleanUrl;
        }
        
        // ✅ CAS 2: URL relative - construire avec serveur XTREAM
        if (cleanUrl.startsWith('/')) {
            // URL relative type: /images/logos/canal_plus.png
            const serverBase = this.config.server.replace(/\/$/, ''); // Enlever slash final
            return `${serverBase}${cleanUrl}`;
        }
        
        // ✅ CAS SPÉCIAL XTREAM: logo path sans slash (très fréquent)
        if (!cleanUrl.startsWith('http') && !cleanUrl.includes('://')) {
            // Cas fréquent Xtream: "logo.png" ou "images/logo.png"
            const serverBase = this.config.server.replace(/\/$/, '');
            // Ajouter le chemin standard Xtream pour les logos
            if (!cleanUrl.startsWith('images/')) {
                return `${serverBase}/images/${cleanUrl}`;
            } else {
                return `${serverBase}/${cleanUrl}`;
            }
        }
        
        // ✅ CAS 3: URL malformée - tentative de correction
        if (cleanUrl.includes('://')) {
            // Corriger protocole cassé
            if (cleanUrl.startsWith('htp://') || cleanUrl.startsWith('htps://')) {
                cleanUrl = `http://${cleanUrl.split('://')[1]}`;
                return cleanUrl;
            }
            // Autres protocoles malformés
            if (cleanUrl.match(/^[a-z]+:\/\//)) {
                cleanUrl = `http://${cleanUrl.split('://')[1]}`;
                return cleanUrl;
            }
        }
        
        // ✅ CAS 4: Dernière tentative - ajouter https par défaut
        if (cleanUrl.includes('.') && (cleanUrl.includes('.png') || cleanUrl.includes('.jpg') || cleanUrl.includes('.jpeg') || cleanUrl.includes('.gif') || cleanUrl.includes('.webp'))) {
            return `https://${cleanUrl}`;
        }
        
        // Debug pour voir les URLs non traitées
        console.log(`🔍 DEBUG LOGO - URL originale: "${url}" -> nettoyée: "${cleanUrl}"`);
        console.log(`🔍 DEBUG LOGO - Serveur config: "${this.config.server}"`);
        return '';
    }
    
    detectQuality(channel) {
        const name = String(channel.name || '').toLowerCase();
        const streamType = String(channel.stream_type || '').toLowerCase();
        
        if (name.includes('4k') || name.includes('uhd') || streamType.includes('4k')) return '4K';
        if (name.includes('fhd') || name.includes('1080') || streamType.includes('1080')) return 'FHD';
        if (name.includes('hd') || name.includes('720') || streamType.includes('720')) return 'HD';
        return 'SD';
    }
    
    async yieldToUI() {
        // Alternative à requestIdleCallback pour yielder le contrôle
        return new Promise(resolve => {
            if (typeof requestIdleCallback !== 'undefined') {
                requestIdleCallback(resolve, { timeout: 16 }); // 16ms = 1 frame à 60fps
            } else {
                setTimeout(resolve, 0); // Fallback
            }
        });
    }
    
    // Requête optimisée avec CORS proxy
    async makeRequest(action, params = {}) {
        try {
            const url = this.buildURL(action, params);
            
            const data = await this.corsProxy.request(url, {
                timeout: this.config.timeout,
                retries: this.config.maxRetries
            });
            
            return data;
            
        } catch (error) {
            console.error(`❌ Erreur requête ${action}:`, error);
            throw error;
        }
    }
    
    buildURL(action, params = {}) {
        const baseUrl = `${this.config.server}/player_api.php`;
        const finalParams = {
            username: this.config.username,
            password: this.config.password,
            action: action,
            ...params
        };

        const queryString = Object.entries(finalParams)
            .filter(([, value]) => value !== undefined && value !== null)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
            .join('&');

        const fullUrl = `${baseUrl}?${queryString}`;
        console.log(`🔧 Built URL: ${fullUrl}`); // Debug pour vérifier URLs générées
        return fullUrl;
    }
    
    // Utilitaires
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
    
    generateChannelURL(channel) {
        if (!channel || !channel.xtreamId) return null;
        
        // Générer l'URL de streaming Xtream Codes
        const baseUrl = this.config.server.replace(/\/$/, '');
        return `${baseUrl}/live/${this.config.username}/${this.config.password}/${channel.xtreamId}.ts`;
    }
    
    exportToPlaylistFormat() {
        console.log(`📤 Export playlist format: ${this.channels.length} chaînes`);
        
        return this.channels.map(channel => {
            // Générer URL à la demande pour économiser mémoire
            const channelWithUrl = {
                ...channel,
                url: this.generateChannelURL(channel)
            };
            
            // Marquer comme accédé pour le cache
            channel.lastAccess = Date.now();
            
            return channelWithUrl;
        });
    }
    
    // Méthode pour obtenir une chaîne avec URL générée
    getChannelWithURL(channelId) {
        const channel = this.channels.find(c => c.id === channelId);
        if (!channel) return null;
        
        return {
            ...channel,
            url: this.generateChannelURL(channel)
        };
    }
    
    // Recherche optimisée dans gros catalogues
    searchChannels(query, limit = 100) {
        if (!query || query.length < 2) return [];
        
        const searchTerm = query.toLowerCase();
        const results = [];
        
        for (let i = 0; i < this.channels.length && results.length < limit; i++) {
            const channel = this.channels[i];
            const name = channel.name.toLowerCase();
            const group = channel.group.toLowerCase();
            
            if (name.includes(searchTerm) || group.includes(searchTerm)) {
                results.push({
                    ...channel,
                    url: this.generateChannelURL(channel)
                });
            }
        }
        
        return results;
    }
    
    // Filtrage par catégorie optimisé
    getChannelsByCategory(categoryId, limit = 1000) {
        const results = [];
        
        for (let i = 0; i < this.channels.length && results.length < limit; i++) {
            const channel = this.channels[i];
            if (channel.categoryId === categoryId) {
                results.push({
                    ...channel,
                    url: this.generateChannelURL(channel)
                });
            }
        }
        
        return results;
    }
    
    getStats() {
        return { ...this.stats };
    }
    
    isAuthenticated() {
        return this.authenticated;
    }
    
    clearCache() {
        this.cache.clear();
    }
    
    // Event system
    addEventListener(type, listener) {
        if (!this.eventListeners) this.eventListeners = {};
        if (!this.eventListeners[type]) this.eventListeners[type] = [];
        this.eventListeners[type].push(listener);
    }
    
    removeEventListener(type, listener) {
        if (!this.eventListeners || !this.eventListeners[type]) return;
        const index = this.eventListeners[type].indexOf(listener);
        if (index > -1) this.eventListeners[type].splice(index, 1);
    }
    
    dispatchEvent(type, detail) {
        if (!this.eventListeners || !this.eventListeners[type]) return;
        this.eventListeners[type].forEach(listener => {
            listener({ type, detail });
        });
    }
    
    destroy() {
        // Nettoyer les event listeners
        this.eventListeners = {};
        
        // Nettoyer les composants
        this.corsProxy?.destroy();
        this.cache?.clear();
        
        // Nettoyer les métriques
        this.parsingMetrics = {
            parseTime: [],
            memoryUsage: [],
            errorCount: 0,
            totalChannels: 0
        };
        
        console.log('🧹 XtreamExtremeManager nettoyé');
    }
}

// Classes support
class XtreamCORSProxy {
    constructor() {
        // Réorganiser l'ordre basé sur les tests - Direct fonctionne !
        this.methods = ['direct', 'nodejs-proxy', 'corsproxy-io', 'corsfix', 'cloudflare-worker'];
        this.currentMethod = 0;
        this.workingProxies = new Set(['direct']); // Direct fonctionne selon tests
        this.failedProxies = new Set(['thingproxy']); // ThingProxy échoue selon tests
    }
    
    async request(url, options = {}) {
        console.log(`🔄 Tentative CORS pour: ${url}`);
        
        // Essayer d'abord les proxies qui ont déjà fonctionné
        for (const workingProxy of this.workingProxies) {
            try {
                const result = await this.trySpecificProxy(workingProxy, url, options);
                console.log(`✅ Succès avec proxy en cache: ${workingProxy}`);
                return result;
            } catch (error) {
                // Masquer le message pour une meilleure UX - c'est normal que direct échoue
                // console.warn(`❌ Proxy en cache échoué: ${workingProxy}`, error.message);
                this.workingProxies.delete(workingProxy);
                this.failedProxies.add(workingProxy);
            }
        }
        
        console.log(`🔄 Tentative avec ${this.methods.length} proxies disponibles`);
        console.log(`❌ Proxies échoués précédemment: [${Array.from(this.failedProxies).join(', ')}]`);
        console.log(`✅ Proxies fonctionnels: [${Array.from(this.workingProxies).join(', ')}]`);
        
        const errors = [];
        
        // Essayer toutes les méthodes disponibles
        for (let i = 0; i < this.methods.length; i++) {
            const method = this.methods[i];
            
            console.log(`🔸 Essai proxy ${i+1}/${this.methods.length}: ${method}`);
            
            try {
                const result = await this.tryMethod(method, url, options);
                console.log(`✅ Succès avec: ${method}`);
                this.workingProxies.add(method);
                this.failedProxies.delete(method); // Enlever des échecs si ça marche maintenant
                this.currentMethod = i;
                return result;
            } catch (error) {
                console.warn(`❌ Échec ${method}: ${error.message}`);
                this.failedProxies.add(method);
                errors.push(`${method}: ${error.message}`);
                
                // Attendre un peu avant le prochain essai
                if (i < this.methods.length - 1) {
                    await this.wait(1000); // Augmenté à 1s pour éviter rate limiting
                }
            }
        }
        
        // Message d'erreur détaillé avec toutes les tentatives
        const errorMessage = `Tous les proxies CORS ont échoué:\n${errors.join('\n')}`;
        console.error('🚨', errorMessage);
        throw new Error(errorMessage);
    }
    
    async trySpecificProxy(method, url, options) {
        return this.tryMethod(method, url, options);
    }
    
    async tryMethod(method, url, options) {
        switch (method) {
            case 'direct':
                return this.useDirect(url, options);
            case 'nodejs-proxy':
                return this.useNodeJSProxy(url, options);
            case 'corsproxy-io':
                return this.useCORSProxyIO(url, options);
            case 'corsfix':
                return this.useCorsfix(url, options);
            case 'cloudflare-worker':
                return this.useCloudflareWorker(url, options);
            default:
                throw new Error(`Méthode inconnue: ${method}`);
        }
    }
    
    async useDirect(url, options) {
        console.log('🎯 Tentative requête directe');
        
        // React Native: créer timeout controller manuellement
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout || 15000);
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'Content-Type': 'application/json',
                    'User-Agent': 'IPTV-Player/2.0 (Android; Mobile)',
                    'Cache-Control': 'no-cache',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            
            const text = await response.text();
            console.log('🔍 Réponse brute directe:', text.substring(0, 500) + (text.length > 500 ? '...' : ''));
            
            try {
                const parsed = JSON.parse(text);
                return parsed;
            } catch (e) {
                console.error('❌ Erreur parsing JSON direct:', e.message);
                console.error('❌ Texte brut (première partie):', text.substring(0, 200));
                
                if (text.toLowerCase().includes('<html') || text.toLowerCase().includes('<!doctype')) {
                    throw new Error('Requête directe: Le serveur a retourné du HTML - Vérifiez vos identifiants Xtream');
                }
                
                throw new Error(`Requête directe: Réponse invalide - Format non-JSON (${text.length} caractères)`);
            }
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
    
    
    async useNodeJSProxy(url, options) {
        console.log('🟢 Tentative proxy Node.js');
        const proxiedURL = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
        
        // React Native: créer timeout controller manuellement
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout || 15000);
        
        try {
            const response = await fetch(proxiedURL, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) throw new Error(`Proxy Node.js failed: ${response.status} - ${response.statusText}`);
            const text = await response.text();
            
            // Debug: afficher la réponse brute
            console.log('🔍 Réponse brute proxy Node.js:', text.substring(0, 500) + (text.length > 500 ? '...' : ''));
            
            try {
                const parsed = JSON.parse(text);
                console.log('🔍 JSON parsé avec succès:', typeof parsed);
                return parsed;
            } catch (e) {
                console.error('❌ Erreur parsing JSON:', e.message);
                console.error('❌ Texte brut (première partie):', text.substring(0, 200));
                
                // Détection si c'est du HTML
                if (text.toLowerCase().includes('<html') || text.toLowerCase().includes('<!doctype')) {
                    throw new Error('Le serveur a retourné du HTML au lieu de JSON - Vérifiez vos identifiants Xtream');
                }
                
                // Détection si c'est une page d'erreur 
                if (text.toLowerCase().includes('error') || text.toLowerCase().includes('not found')) {
                    throw new Error('Erreur serveur Xtream - URL ou identifiants incorrects');
                }
                
                throw new Error(`Réponse proxy invalide - Format non-JSON reçu (${text.length} caractères)`);
            }
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
    
    async useCORSProxyIO(url, options) {
        console.log('🔵 Tentative corsproxy.io');
        const proxiedURL = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        
        // React Native: créer timeout controller manuellement
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout || 15000);
        
        try {
            const response = await fetch(proxiedURL, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'Content-Type': 'application/json',
                    'User-Agent': 'IPTV-Player/2.0 (Android; Mobile)',
                    'Cache-Control': 'no-cache'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) throw new Error(`CORS Proxy IO failed: ${response.status}`);
            
            const text = await response.text();
            console.log('🔍 Réponse brute CORS Proxy IO:', text.substring(0, 500) + (text.length > 500 ? '...' : ''));
            
            try {
                const parsed = JSON.parse(text);
                return parsed;
            } catch (e) {
                console.error('❌ Erreur parsing JSON CORS Proxy IO:', e.message);
                console.error('❌ Texte brut (première partie):', text.substring(0, 200));
                
                if (text.toLowerCase().includes('<html') || text.toLowerCase().includes('<!doctype')) {
                    throw new Error('CORS Proxy IO: Le serveur a retourné du HTML au lieu de JSON');
                }
                
                throw new Error(`CORS Proxy IO: Réponse invalide - Format non-JSON (${text.length} caractères)`);
            }
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
    
    async useCorsfix(url, options) {
        console.log('🟣 Tentative Corsfix');
        const proxiedURL = `https://api.corsfix.com/${encodeURIComponent(url)}`;
        
        // React Native: créer timeout controller manuellement
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout || 15000);
        
        try {
            const response = await fetch(proxiedURL, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) throw new Error(`Corsfix failed: ${response.status}`);
            
            const text = await response.text();
            console.log('🔍 Réponse brute Corsfix:', text.substring(0, 500) + (text.length > 500 ? '...' : ''));
            
            try {
                const parsed = JSON.parse(text);
                return parsed;
            } catch (e) {
                console.error('❌ Erreur parsing JSON Corsfix:', e.message);
                console.error('❌ Texte brut (première partie):', text.substring(0, 200));
                
                if (text.toLowerCase().includes('<html') || text.toLowerCase().includes('<!doctype')) {
                    throw new Error('Corsfix: Le serveur a retourné du HTML au lieu de JSON');
                }
                
                throw new Error(`Corsfix: Réponse invalide - Format non-JSON (${text.length} caractères)`);
            }
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
    
    async useCloudflareWorker(url, options) {
        console.log('☁️ Tentative Cloudflare Worker');
        const proxiedURL = `https://test.cors.workers.dev/corsproxy/?apiurl=${encodeURIComponent(url)}`;
        
        // React Native: créer timeout controller manuellement
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout || 15000);
        
        try {
            const response = await fetch(proxiedURL, {
                method: 'GET',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) throw new Error(`Cloudflare Worker failed: ${response.status}`);
            
            const text = await response.text();
            console.log('🔍 Réponse brute Cloudflare Worker:', text.substring(0, 500) + (text.length > 500 ? '...' : ''));
            
            try {
                const parsed = JSON.parse(text);
                return parsed;
            } catch (e) {
                console.error('❌ Erreur parsing JSON Cloudflare Worker:', e.message);
                console.error('❌ Texte brut (première partie):', text.substring(0, 200));
                
                if (text.toLowerCase().includes('<html') || text.toLowerCase().includes('<!doctype')) {
                    throw new Error('Cloudflare Worker: Le serveur a retourné du HTML au lieu de JSON');
                }
                
                throw new Error(`Cloudflare Worker: Réponse invalide - Format non-JSON (${text.length} caractères)`);
            }
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
    
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    destroy() {
        this.workingProxies.clear();
        this.failedProxies.clear();
    }
}

class XtreamStreamParser {
    constructor() {
        this.buffer = '';
    }
    
    parseStream(chunk) {
        // Implementation streaming parser
        return JSON.parse(chunk);
    }
}

class XtreamCache {
    constructor() {
        this.cache = new Map();
        this.maxAge = 6 * 60 * 60 * 1000; // 6 heures
    }
    
    async get(key) {
        const entry = this.cache.get(key);
        if (entry && this.isValid(entry.timestamp)) {
            return entry;
        }
        return null;
    }
    
    set(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
    
    isValid(timestamp) {
        return (Date.now() - timestamp) < this.maxAge;
    }
    
    clear() {
        this.cache.clear();
    }
    
    /**
     * Configure le cache manager externe pour optimisation 25k+
     */
    configureCacheManager(cacheManager) {
        this.externalCacheManager = cacheManager;
        console.log('🔗 Cache manager externe configuré pour Xtream');
    }
}

class XtreamRateLimiter {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.delay = 500; // 500ms entre requêtes
    }
    
    async waitForSlot() {
        return new Promise(resolve => {
            this.queue.push(resolve);
            this.processQueue();
        });
    }
    
    async processQueue() {
        if (this.processing) return;
        this.processing = true;
        
        while (this.queue.length > 0) {
            const resolve = this.queue.shift();
            resolve();
            await this.wait(this.delay);
        }
        
        this.processing = false;
    }
    
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}