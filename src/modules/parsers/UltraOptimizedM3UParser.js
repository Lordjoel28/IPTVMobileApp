/**
 * 🚀 Parser M3U Ultra-Optimisé - Performances Extrêmes
 * 
 * Optimisations spéciales pour playlists 18K+ chaînes:
 * - Worker threads non-bloquants
 * - Chunking avec yield control
 * - Pool d'objets adaptatif
 * - String interning avancé
 * - Machine à états optimisée
 * - Métriques temps réel
 * 
 * Cible: 18K chaînes en 1-2s (75% plus rapide)
 */

export class UltraOptimizedM3UParser {
    constructor() {
        // Pool d'objets adaptatif avec resize automatique
        this.channelPool = [];
        this.poolSize = 500; // Augmenté pour gros volumes
        this.maxPoolSize = 2000;
        this.poolGrowthFactor = 1.5;
        this.initializePool();
        
        // String interning avancé avec LRU cache
        this.stringCache = new Map();
        this.stringCacheOrder = new Map(); // Pour LRU
        this.maxCacheSize = 5000; // Augmenté pour gros volumes
        this.cacheAccessCounter = 0;
        
        // Métriques performance temps réel
        this.stats = {
            channelsParsed: 0,
            poolHits: 0,
            poolMisses: 0,
            cacheHits: 0,
            cacheMisses: 0,
            parseTime: 0,
            memoryUsage: 0,
            linesProcessed: 0,
            chunksProcessed: 0,
            avgChunkTime: 0,
            peakMemoryUsage: 0,
            gcCount: 0,
            workerTime: 0
        };
        
        // États machine à états finis optimisée
        this.STATES = {
            SEEKING_EXTINF: 0,    // Utiliser numbers pour switch plus rapide
            PARSING_EXTINF: 1,
            SEEKING_URL: 2,
            COMPLETE_CHANNEL: 3
        };
        
        // Configuration chunking adaptatif
        this.chunkConfig = {
            minChunkSize: 1000,
            maxChunkSize: 5000,
            adaptiveSize: true,
            yieldInterval: 100, // Yield contrôle UI toutes les 100 chaînes
            gcInterval: 2000    // Force GC toutes les 2000 chaînes
        };
        
        // Buffers pré-alloués pour performance
        this.lineBuffer = [];
        this.channelBuffer = [];
        
        // Worker support pour gros fichiers
        this.workerSupport = typeof Worker !== 'undefined' && typeof window !== 'undefined';
        
        console.log('🚀 UltraOptimizedM3UParser initialisé - Mode haute performance');
        console.log(`🔧 Pool: ${this.poolSize} objets, Cache: ${this.maxCacheSize} entrées`);
    }
    
    // Pool d'objets adaptatif
    initializePool() {
        this.channelPool = [];
        for (let i = 0; i < this.poolSize; i++) {
            this.channelPool.push(this.createEmptyChannel());
        }
        console.log(`🏊 Pool adaptatif initialisé: ${this.poolSize} objets`);
    }
    
    // Agrandir le pool si nécessaire
    expandPool() {
        if (this.poolSize < this.maxPoolSize) {
            const oldSize = this.poolSize;
            this.poolSize = Math.min(this.poolSize * this.poolGrowthFactor, this.maxPoolSize);
            const newObjects = this.poolSize - oldSize;
            
            for (let i = 0; i < newObjects; i++) {
                this.channelPool.push(this.createEmptyChannel());
            }
            
            console.log(`📈 Pool agrandi: ${oldSize} → ${this.poolSize} objets`);
        }
    }
    
    createEmptyChannel() {
        return {
            id: '',
            name: '',
            logo: '',
            group: '',
            url: '',
            country: '',
            language: '',
            epg: '',
            catchup: ''
        };
    }
    
    getPooledChannel() {
        if (this.channelPool.length > 0) {
            this.stats.poolHits++;
            const channel = this.channelPool.pop();
            this.resetChannel(channel);
            return channel;
        }
        
        // Pool vide - agrandir ou créer
        this.stats.poolMisses++;
        if (this.stats.poolMisses > 10) {
            this.expandPool();
            this.stats.poolMisses = 0;
        }
        
        return this.createEmptyChannel();
    }
    
    returnToPool(channel) {
        if (this.channelPool.length < this.poolSize) {
            this.channelPool.push(channel);
        }
    }
    
    resetChannel(channel) {
        channel.id = '';
        channel.name = '';
        channel.logo = '';
        channel.group = '';
        channel.url = '';
        channel.country = '';
        channel.language = '';
        channel.epg = '';
        channel.catchup = '';
    }
    
    // String interning avancé avec LRU
    getCachedString(str) {
        if (!str) return '';
        
        if (this.stringCache.has(str)) {
            this.stats.cacheHits++;
            // Mettre à jour LRU
            this.stringCacheOrder.set(str, this.cacheAccessCounter++);
            return this.stringCache.get(str);
        }
        
        this.stats.cacheMisses++;
        
        // Éviction LRU si cache plein
        if (this.stringCache.size >= this.maxCacheSize) {
            this.evictLRU();
        }
        
        this.stringCache.set(str, str);
        this.stringCacheOrder.set(str, this.cacheAccessCounter++);
        return str;
    }
    
    evictLRU() {
        let oldestKey = null;
        let oldestAccess = Infinity;
        
        for (const [key, access] of this.stringCacheOrder) {
            if (access < oldestAccess) {
                oldestAccess = access;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            this.stringCache.delete(oldestKey);
            this.stringCacheOrder.delete(oldestKey);
        }
    }
    
    // Parser ultra-optimisé avec chunking non-bloquant
    async parseM3U(content, options = {}) {
        const startTime = performance.now();
        const startMemory = performance.memory?.usedJSHeapSize || 0;
        
        console.log('🚀 Parser M3U ultra-optimisé démarré...');
        console.log(`📊 Contenu: ${(content.length / 1024 / 1024).toFixed(2)}MB`);
        
        if (!content || typeof content !== 'string') {
            console.warn('⚠️ Contenu M3U invalide');
            return { channels: [], stats: this.getStats() };
        }
        
        const config = {
            useWorker: false,
            chunkSize: this.calculateOptimalChunkSize(content),
            yieldControl: true,
            ...options
        };
        
        let channels = [];
        
        // Choix de stratégie selon taille
        if (content.length > 50 * 1024 * 1024 && this.workerSupport && config.useWorker) {
            // Très gros fichiers: worker thread
            channels = await this.parseWithWorker(content, config);
        } else if (content.length > 5 * 1024 * 1024 && config.yieldControl) {
            // Gros fichiers: chunking non-bloquant
            channels = await this.parseWithChunking(content, config);
        } else {
            // Fichiers moyens: parsing direct optimisé
            channels = this.parseDirectOptimized(content);
        }
        
        // Stats finales
        this.stats.channelsParsed = channels.length;
        this.stats.parseTime = performance.now() - startTime;
        this.stats.memoryUsage = (performance.memory?.usedJSHeapSize || 0) - startMemory;
        this.stats.peakMemoryUsage = Math.max(this.stats.peakMemoryUsage, this.stats.memoryUsage);
        
        this.logPerformanceStats();
        
        return { 
            channels, 
            stats: this.getStats() 
        };
    }
    
    // Calcul taille chunk optimale
    calculateOptimalChunkSize(content) {
        const sizeMB = content.length / 1024 / 1024;
        const estimatedChannels = (content.match(/#EXTINF:/g) || []).length;
        
        if (estimatedChannels < 1000) return this.chunkConfig.minChunkSize;
        if (estimatedChannels > 50000) return this.chunkConfig.maxChunkSize;
        
        // Taille adaptative basée sur le contenu
        const adaptiveSize = Math.min(
            Math.max(
                Math.floor(estimatedChannels / 20), 
                this.chunkConfig.minChunkSize
            ),
            this.chunkConfig.maxChunkSize
        );
        
        console.log(`🎯 Taille chunk optimale: ${adaptiveSize} (${estimatedChannels} chaînes estimées)`);
        return adaptiveSize;
    }
    
    // Parsing avec chunking non-bloquant
    async parseWithChunking(content, config) {
        console.log('🧩 Mode chunking non-bloquant activé');
        
        const lines = this.preprocessLinesOptimized(content);
        const channels = [];
        const chunkSize = config.chunkSize;
        
        let state = this.STATES.SEEKING_EXTINF;
        let currentChannel = null;
        let channelIndex = 0;
        let processedLines = 0;
        
        // Traitement par chunks
        for (let i = 0; i < lines.length; i += chunkSize) {
            const chunkStart = performance.now();
            const chunk = lines.slice(i, Math.min(i + chunkSize, lines.length));
            
            // Traiter le chunk
            const chunkResult = this.processChunk(chunk, state, currentChannel, channelIndex, processedLines);
            
            // Fusionner résultats
            channels.push(...chunkResult.channels);
            state = chunkResult.state;
            currentChannel = chunkResult.currentChannel;
            channelIndex = chunkResult.channelIndex;
            processedLines += chunk.length;
            
            // Métriques chunk
            const chunkTime = performance.now() - chunkStart;
            this.stats.chunksProcessed++;
            this.stats.avgChunkTime = (this.stats.avgChunkTime + chunkTime) / 2;
            
            // Yield contrôle UI
            if (channelIndex % this.chunkConfig.yieldInterval === 0) {
                await this.yieldControl();
            }
            
            // Garbage collection forcée
            if (channelIndex % this.chunkConfig.gcInterval === 0) {
                this.forceGC();
            }
            
            console.log(`📦 Chunk ${Math.floor(i / chunkSize) + 1}: ${chunkResult.channels.length} chaînes en ${chunkTime.toFixed(2)}ms`);
        }
        
        // Nettoyer channel orphelin
        if (currentChannel) {
            this.returnToPool(currentChannel);
        }
        
        return channels;
    }
    
    // Traitement d'un chunk
    processChunk(lines, initialState, initialChannel, initialIndex, processedOffset) {
        const channels = [];
        let state = initialState;
        let currentChannel = initialChannel;
        let channelIndex = initialIndex;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            this.stats.linesProcessed++;
            
            // Machine à états optimisée avec switch numérique
            switch (state) {
                case this.STATES.SEEKING_EXTINF: // 0
                    if (line.charCodeAt(0) === 35 && line.startsWith('#EXTINF:')) { // ASCII 35 = '#'
                        currentChannel = this.getPooledChannel();
                        this.parseExtInfUltraOptimized(line, currentChannel, channelIndex++);
                        state = this.STATES.SEEKING_URL;
                    }
                    break;
                    
                case this.STATES.SEEKING_URL: // 2
                    if (line && line.charCodeAt(0) !== 35) { // Non-commentaire
                        if (this.isValidUrlOptimized(line)) {
                            currentChannel.url = line;
                            channels.push(this.cloneChannelOptimized(currentChannel));
                            this.returnToPool(currentChannel);
                            currentChannel = null;
                            state = this.STATES.SEEKING_EXTINF;
                        } else {
                            // URL invalide
                            this.returnToPool(currentChannel);
                            currentChannel = null;
                            state = this.STATES.SEEKING_EXTINF;
                        }
                    }
                    break;
            }
        }
        
        return { channels, state, currentChannel, channelIndex };
    }
    
    // Parsing direct optimisé pour fichiers moyens
    parseDirectOptimized(content) {
        const lines = this.preprocessLinesOptimized(content);
        const channels = [];
        
        let state = this.STATES.SEEKING_EXTINF;
        let currentChannel = null;
        let channelIndex = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            this.stats.linesProcessed++;
            
            switch (state) {
                case this.STATES.SEEKING_EXTINF:
                    if (line.charCodeAt(0) === 35 && line.startsWith('#EXTINF:')) {
                        currentChannel = this.getPooledChannel();
                        this.parseExtInfUltraOptimized(line, currentChannel, channelIndex++);
                        state = this.STATES.SEEKING_URL;
                    }
                    break;
                    
                case this.STATES.SEEKING_URL:
                    if (line && line.charCodeAt(0) !== 35) {
                        if (this.isValidUrlOptimized(line)) {
                            currentChannel.url = line;
                            channels.push(this.cloneChannelOptimized(currentChannel));
                            this.returnToPool(currentChannel);
                            currentChannel = null;
                            state = this.STATES.SEEKING_EXTINF;
                        } else {
                            this.returnToPool(currentChannel);
                            currentChannel = null;
                            state = this.STATES.SEEKING_EXTINF;
                        }
                    }
                    break;
            }
        }
        
        if (currentChannel) {
            this.returnToPool(currentChannel);
        }
        
        return channels;
    }
    
    // Preprocessing lignes ultra-optimisé
    preprocessLinesOptimized(content) {
        // Utiliser un buffer pré-alloué si disponible
        if (this.lineBuffer.length > 0) {
            this.lineBuffer.length = 0;
        }
        
        let start = 0;
        let pos = 0;
        const contentLength = content.length;
        
        while (pos < contentLength) {
            // Recherche optimisée du \n
            while (pos < contentLength && content.charCodeAt(pos) !== 10) { // ASCII 10 = '\n'
                pos++;
            }
            
            if (pos > start) {
                let line = content.substring(start, pos);
                
                // Trim optimisé
                let trimStart = 0;
                let trimEnd = line.length;
                
                while (trimStart < trimEnd && (line.charCodeAt(trimStart) <= 32)) {
                    trimStart++;
                }
                
                while (trimEnd > trimStart && (line.charCodeAt(trimEnd - 1) <= 32)) {
                    trimEnd--;
                }
                
                if (trimEnd > trimStart) {
                    line = line.substring(trimStart, trimEnd);
                    this.lineBuffer.push(line);
                }
            }
            
            pos++;
            start = pos;
        }
        
        return this.lineBuffer;
    }
    
    // Parser EXTINF ultra-optimisé
    parseExtInfUltraOptimized(line, channel, index) {
        // ID ultra-rapide
        channel.id = `ch_${index}_${Date.now() % 1000000}`;
        
        // Extraction nom optimisée
        const nameStart = line.lastIndexOf(',');
        if (nameStart !== -1 && nameStart < line.length - 1) {
            channel.name = line.substring(nameStart + 1) || `Chaîne ${index + 1}`;
        } else {
            channel.name = `Chaîne ${index + 1}`;
        }
        
        // Extraction attributs avec lookup table
        const attributeMap = {
            'tvg-logo="': 'logo',
            'group-title="': 'group',
            'tvg-country="': 'country',
            'tvg-language="': 'language',
            'tvg-epg="': 'epg',
            'catchup="': 'catchup'
        };
        
        for (const [attr, prop] of Object.entries(attributeMap)) {
            const attrStart = line.indexOf(attr);
            if (attrStart !== -1) {
                const valueStart = attrStart + attr.length;
                const valueEnd = line.indexOf('"', valueStart);
                
                if (valueEnd !== -1 && valueEnd > valueStart) {
                    const value = line.substring(valueStart, valueEnd);
                    if (prop === 'group') {
                        channel[prop] = this.getCachedString(value || 'Général');
                    } else if (prop === 'country' || prop === 'language') {
                        channel[prop] = this.getCachedString(value);
                    } else {
                        channel[prop] = value;
                    }
                }
            }
        }
        
        // Valeurs par défaut
        if (!channel.group) {
            channel.group = this.getCachedString('Général');
        }
    }
    
    // Validation URL ultra-optimisée
    isValidUrlOptimized(url) {
        if (!url || url.length < 7) return false;
        
        const first = url.charCodeAt(0);
        
        // Vérification rapide par premier caractère
        if (first === 104) { // 'h' - http/https
            return url.startsWith('http://') || url.startsWith('https://');
        } else if (first === 114) { // 'r' - rtmp/rtp
            return url.startsWith('rtmp://') || url.startsWith('rtmps://') || url.startsWith('rtp://');
        } else if (first === 117) { // 'u' - udp
            return url.startsWith('udp://');
        }
        
        return false;
    }
    
    // Clone channel optimisé
    cloneChannelOptimized(channel) {
        return {
            id: channel.id,
            name: channel.name,
            logo: channel.logo,
            group: channel.group,
            url: channel.url,
            country: channel.country,
            language: channel.language,
            epg: channel.epg,
            catchup: channel.catchup
        };
    }
    
    // Yield contrôle UI
    async yieldControl() {
        return new Promise(resolve => {
            if (typeof requestAnimationFrame !== 'undefined') {
                requestAnimationFrame(resolve);
            } else {
                setTimeout(resolve, 0);
            }
        });
    }
    
    // Garbage collection forcée
    forceGC() {
        if (typeof window !== 'undefined' && window.gc) {
            window.gc();
            this.stats.gcCount++;
        }
    }
    
    // Parsing avec Web Worker (pour très gros fichiers)
    async parseWithWorker(content, config) {
        console.log('👷 Mode Web Worker activé');
        
        return new Promise((resolve, reject) => {
            const workerCode = `
                // Worker code sera injecté ici
                self.onmessage = function(e) {
                    const { content, config } = e.data;
                    
                    // Parser simplifié dans le worker
                    const lines = content.split('\\n').map(l => l.trim()).filter(l => l);
                    const channels = [];
                    
                    let currentChannel = null;
                    let channelIndex = 0;
                    
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];
                        
                        if (line.startsWith('#EXTINF:')) {
                            const nameMatch = line.match(/,(.+)$/);
                            const logoMatch = line.match(/tvg-logo="([^"]+)"/);
                            const groupMatch = line.match(/group-title="([^"]+)"/);
                            
                            currentChannel = {
                                id: \`ch_\${channelIndex++}_\${Date.now()}\`,
                                name: nameMatch ? nameMatch[1] : \`Chaîne \${channelIndex}\`,
                                logo: logoMatch ? logoMatch[1] : '',
                                group: groupMatch ? groupMatch[1] : 'Général',
                                url: ''
                            };
                        } else if (line && !line.startsWith('#') && currentChannel) {
                            currentChannel.url = line;
                            channels.push(currentChannel);
                            currentChannel = null;
                        }
                    }
                    
                    self.postMessage({ channels, stats: { parseTime: Date.now() } });
                };
            `;
            
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const worker = new Worker(URL.createObjectURL(blob));
            
            const workerStart = performance.now();
            
            worker.onmessage = (e) => {
                this.stats.workerTime = performance.now() - workerStart;
                worker.terminate();
                URL.revokeObjectURL(blob);
                resolve(e.data.channels);
            };
            
            worker.onerror = (error) => {
                worker.terminate();
                URL.revokeObjectURL(blob);
                reject(error);
            };
            
            worker.postMessage({ content, config });
        });
    }
    
    // Logs performance ultra-détaillés
    logPerformanceStats() {
        const poolEfficiency = this.stats.channelsParsed > 0 ? 
            (this.stats.poolHits / (this.stats.poolHits + this.stats.poolMisses) * 100).toFixed(1) : 0;
        const cacheEfficiency = (this.stats.cacheHits + this.stats.cacheMisses) > 0 ?
            (this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) * 100).toFixed(1) : 0;
        const channelsPerSecond = this.stats.parseTime > 0 ?
            Math.round(this.stats.channelsParsed / (this.stats.parseTime / 1000)) : 0;
        
        console.log(`\n🏆 === PARSER ULTRA-OPTIMISÉ TERMINÉ ===`);
        console.log(`📊 ${this.stats.channelsParsed} chaînes en ${this.stats.parseTime.toFixed(2)}ms`);
        console.log(`⚡ Vitesse: ${channelsPerSecond.toLocaleString()} chaînes/seconde`);
        console.log(`🔄 Pool: ${poolEfficiency}% efficacité (${this.stats.poolHits}H/${this.stats.poolMisses}M)`);
        console.log(`📦 Cache: ${cacheEfficiency}% efficacité (${this.stats.cacheHits}H/${this.stats.cacheMisses}M)`);
        console.log(`🧠 Mémoire: ${(this.stats.memoryUsage / 1024 / 1024).toFixed(2)}MB utilisée`);
        console.log(`📈 Pic mémoire: ${(this.stats.peakMemoryUsage / 1024 / 1024).toFixed(2)}MB`);
        console.log(`🧩 Chunks: ${this.stats.chunksProcessed} (${this.stats.avgChunkTime.toFixed(2)}ms moy.)`);
        console.log(`🗑️ GC forcées: ${this.stats.gcCount}`);
        console.log(`📋 Lignes: ${this.stats.linesProcessed.toLocaleString()}`);
        
        if (this.stats.workerTime > 0) {
            console.log(`👷 Worker: ${this.stats.workerTime.toFixed(2)}ms`);
        }
        
        console.log(`=======================================\n`);
    }
    
    // Statistiques complètes
    getStats() {
        const poolEfficiency = (this.stats.poolHits + this.stats.poolMisses) > 0 ?
            (this.stats.poolHits / (this.stats.poolHits + this.stats.poolMisses) * 100) : 0;
        const cacheEfficiency = (this.stats.cacheHits + this.stats.cacheMisses) > 0 ?
            (this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) * 100) : 0;
        const channelsPerSecond = this.stats.parseTime > 0 ?
            (this.stats.channelsParsed / (this.stats.parseTime / 1000)) : 0;
        
        return {
            ...this.stats,
            poolEfficiency: Math.round(poolEfficiency * 100) / 100,
            cacheEfficiency: Math.round(cacheEfficiency * 100) / 100,
            channelsPerSecond: Math.round(channelsPerSecond),
            memoryUsageMB: Math.round((this.stats.memoryUsage / 1024 / 1024) * 100) / 100,
            peakMemoryUsageMB: Math.round((this.stats.peakMemoryUsage / 1024 / 1024) * 100) / 100,
            poolSize: this.channelPool.length,
            cacheSize: this.stringCache.size,
            efficiency: {
                pool: poolEfficiency,
                cache: cacheEfficiency,
                overall: (poolEfficiency + cacheEfficiency) / 2
            }
        };
    }
    
    // Benchmark complet
    async benchmarkComplete() {
        console.log('🏁 Benchmark ultra-optimisé complet...');
        
        const sizes = [1000, 5000, 10000, 18000, 25000];
        const results = [];
        
        for (const size of sizes) {
            console.log(`\n📊 Test ${size} chaînes...`);
            
            const testContent = this.generateTestM3U(size);
            await this.cleanup();
            
            const result = await this.parseM3U(testContent);
            const stats = this.getStats();
            
            results.push({
                size,
                ...stats,
                channelsParsed: result.channels.length
            });
            
            console.log(`✅ ${size} chaînes: ${stats.parseTime.toFixed(2)}ms (${stats.channelsPerSecond.toLocaleString()} ch/s)`);
        }
        
        console.log('\n📋 RÉSULTATS BENCHMARK:');
        results.forEach(r => {
            console.log(`  ${r.size.toLocaleString()} chaînes: ${r.parseTime.toFixed(2)}ms - ${r.channelsPerSecond.toLocaleString()} ch/s - ${r.memoryUsageMB}MB`);
        });
        
        return results;
    }
    
    // Générateur M3U optimisé
    generateTestM3U(channelCount) {
        const categories = ['Sport', 'News', 'Cinema', 'Music', 'Kids', 'Documentary', 'Entertainment', 'Education'];
        const countries = ['FR', 'EN', 'DE', 'ES', 'IT', 'US', 'CA', 'AU'];
        const languages = ['fr', 'en', 'de', 'es', 'it'];
        
        let content = '#EXTM3U\n';
        
        for (let i = 0; i < channelCount; i++) {
            const category = categories[i % categories.length];
            const country = countries[i % countries.length];
            const language = languages[i % languages.length];
            
            content += `#EXTINF:-1 tvg-id="test${i}" tvg-name="Test ${i}" tvg-logo="https://example.com/logo${i}.png" group-title="${category}" tvg-country="${country}" tvg-language="${language}" catchup="default",Test Channel ${i}\n`;
            content += `https://example.com/stream${i}.m3u8\n`;
        }
        
        return content;
    }
    
    // Nettoyage complet
    async cleanup() {
        // Nettoyer pools
        this.channelPool.length = 0;
        this.initializePool();
        
        // Nettoyer caches
        this.stringCache.clear();
        this.stringCacheOrder.clear();
        this.cacheAccessCounter = 0;
        
        // Nettoyer buffers
        this.lineBuffer.length = 0;
        this.channelBuffer.length = 0;
        
        // Reset stats
        this.stats = {
            channelsParsed: 0,
            poolHits: 0,
            poolMisses: 0,
            cacheHits: 0,
            cacheMisses: 0,
            parseTime: 0,
            memoryUsage: 0,
            linesProcessed: 0,
            chunksProcessed: 0,
            avgChunkTime: 0,
            peakMemoryUsage: 0,
            gcCount: 0,
            workerTime: 0
        };
        
        // Force GC
        this.forceGC();
        
        console.log('🧹 Parser ultra-optimisé nettoyé');
    }
}