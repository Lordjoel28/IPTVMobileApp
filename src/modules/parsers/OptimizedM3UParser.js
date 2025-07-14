export class OptimizedM3UParser {
    constructor() {
        // Pool d'objets channel pour éviter allocations
        this.channelPool = [];
        this.poolSize = 100;
        this.initializePool();
        
        // Cache de chaînes pour éviter duplication
        this.stringCache = new Map();
        this.maxCacheSize = 1000;
        
        // Compteurs performance
        this.stats = {
            channelsParsed: 0,
            poolHits: 0,
            cacheHits: 0,
            parseTime: 0,
            memoryUsage: 0,
            linesProcessed: 0
        };
        
        // États de la machine à états finis
        this.STATES = {
            SEEKING_EXTINF: 'seeking_extinf',
            PARSING_EXTINF: 'parsing_extinf',
            SEEKING_URL: 'seeking_url',
            COMPLETE_CHANNEL: 'complete_channel'
        };
        
        console.log('⚡ OptimizedM3UParser initialisé');
    }
    
    initializePool() {
        for (let i = 0; i < this.poolSize; i++) {
            this.channelPool.push(this.createEmptyChannel());
        }
        console.log(`🏊 Pool d'objets initialisé: ${this.poolSize} éléments`);
    }
    
    createEmptyChannel() {
        return {
            id: '',
            name: '',
            logo: '',
            group: '',
            url: ''
        };
    }
    
    getPooledChannel() {
        if (this.channelPool.length > 0) {
            this.stats.poolHits++;
            const channel = this.channelPool.pop();
            this.resetChannel(channel);
            return channel;
        }
        // Créer nouveau si pool vide (rare)
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
    }
    
    getCachedString(str) {
        if (!str) return '';
        
        if (!this.stringCache.has(str)) {
            // Éviter la croissance excessive du cache
            if (this.stringCache.size >= this.maxCacheSize) {
                const firstKey = this.stringCache.keys().next().value;
                this.stringCache.delete(firstKey);
            }
            this.stringCache.set(str, str);
        } else {
            this.stats.cacheHits++;
        }
        return this.stringCache.get(str);
    }
    
    // Parser principal optimisé avec machine à états finis
    parseM3U(content) {
        const startTime = performance.now();
        const startMemory = performance.memory?.usedJSHeapSize || 0;
        
        console.log('🚀 Parser M3U optimisé démarré...');
        
        if (!content || typeof content !== 'string') {
            console.warn('⚠️ Contenu M3U invalide');
            return [];
        }
        
        // Préparation optimisée des lignes
        const lines = this.preprocessLines(content);
        const channels = [];
        
        // Machine à états finis
        let state = this.STATES.SEEKING_EXTINF;
        let currentChannel = null;
        let channelIndex = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            this.stats.linesProcessed++;
            
            switch (state) {
                case this.STATES.SEEKING_EXTINF:
                    if (line.startsWith('#EXTINF:')) {
                        currentChannel = this.getPooledChannel();
                        this.parseExtInfOptimized(line, currentChannel, channelIndex++);
                        state = this.STATES.SEEKING_URL;
                    }
                    break;
                    
                case this.STATES.SEEKING_URL:
                    if (line && !line.startsWith('#')) {
                        if (this.isValidUrl(line)) {
                            currentChannel.url = line;
                            channels.push(this.cloneChannel(currentChannel));
                            this.returnToPool(currentChannel);
                            currentChannel = null;
                            state = this.STATES.SEEKING_EXTINF;
                        } else {
                            // URL invalide, abandonner ce channel
                            this.returnToPool(currentChannel);
                            currentChannel = null;
                            state = this.STATES.SEEKING_EXTINF;
                        }
                    }
                    break;
            }
        }
        
        // Nettoyer un channel orphelin
        if (currentChannel) {
            this.returnToPool(currentChannel);
        }
        
        // Stats de performance
        this.stats.channelsParsed = channels.length;
        this.stats.parseTime = performance.now() - startTime;
        this.stats.memoryUsage = (performance.memory?.usedJSHeapSize || 0) - startMemory;
        
        this.logPerformanceStats();
        
        return channels;
    }
    
    // Préprocessing optimisé des lignes
    preprocessLines(content) {
        // Utiliser split avec limit pour éviter trop d'allocations
        const lines = content.split('\n');
        const processed = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
                processed.push(line);
            }
        }
        
        return processed;
    }
    
    // Parser EXTINF optimisé sans regex complexes - évite backtracking catastrophique
    parseExtInfOptimized(line, channel, index) {
        // ID unique optimisé
        channel.id = `ch_${index}_${Date.now() % 1000000}`;
        
        // Extraction nom (plus efficace que regex) - optimisation critique
        const nameStart = line.lastIndexOf(',');
        if (nameStart !== -1 && nameStart < line.length - 1) {
            const nameValue = line.substring(nameStart + 1).trim();
            channel.name = nameValue || `Chaîne ${index + 1}`;
        } else {
            channel.name = `Chaîne ${index + 1}`;
        }
        
        // Extraction logo avec indexOf (plus rapide que regex)
        const logoStart = line.indexOf('tvg-logo="');
        if (logoStart !== -1) {
            const logoValueStart = logoStart + 10;
            const logoEnd = line.indexOf('"', logoValueStart);
            if (logoEnd !== -1 && logoEnd > logoValueStart) {
                channel.logo = line.substring(logoValueStart, logoEnd);
            }
        }
        
        // Extraction groupe avec indexOf et cache
        const groupStart = line.indexOf('group-title="');
        if (groupStart !== -1) {
            const groupValueStart = groupStart + 13;
            const groupEnd = line.indexOf('"', groupValueStart);
            if (groupEnd !== -1 && groupEnd > groupValueStart) {
                const groupValue = line.substring(groupValueStart, groupEnd);
                channel.group = this.getCachedString(groupValue || 'Général');
            } else {
                channel.group = this.getCachedString('Général');
            }
        } else {
            channel.group = this.getCachedString('Général');
        }
        
        // Extraction country (bonus pour organisation)
        const countryStart = line.indexOf('tvg-country="');
        if (countryStart !== -1) {
            const countryValueStart = countryStart + 13;
            const countryEnd = line.indexOf('"', countryValueStart);
            if (countryEnd !== -1 && countryEnd > countryValueStart) {
                const countryValue = line.substring(countryValueStart, countryEnd);
                channel.country = this.getCachedString(countryValue);
            }
        }
        
        // Extraction language (bonus pour organisation)
        const langStart = line.indexOf('tvg-language="');
        if (langStart !== -1) {
            const langValueStart = langStart + 14;
            const langEnd = line.indexOf('"', langValueStart);
            if (langEnd !== -1 && langEnd > langValueStart) {
                const langValue = line.substring(langValueStart, langEnd);
                channel.language = this.getCachedString(langValue);
            }
        }
    }
    
    // Validation URL optimisée
    isValidUrl(url) {
        // Validation basique mais rapide
        return url.startsWith('http://') || 
               url.startsWith('https://') || 
               url.startsWith('rtmp://') || 
               url.startsWith('rtmps://') ||
               url.startsWith('udp://') ||
               url.startsWith('rtp://');
    }
    
    // Clone optimisé du channel
    cloneChannel(channel) {
        return {
            id: channel.id,
            name: channel.name,
            logo: channel.logo,
            group: channel.group,
            url: channel.url,
            country: channel.country || '',
            language: channel.language || ''
        };
    }
    
    // Logs de performance détaillés
    logPerformanceStats() {
        const poolEfficiency = this.stats.channelsParsed > 0 ? 
            (this.stats.poolHits / this.stats.channelsParsed * 100).toFixed(1) : 0;
        const cacheEfficiency = this.stats.linesProcessed > 0 ?
            (this.stats.cacheHits / this.stats.linesProcessed * 100).toFixed(1) : 0;
        const channelsPerSecond = this.stats.parseTime > 0 ?
            Math.round(this.stats.channelsParsed / (this.stats.parseTime / 1000)) : 0;
        
        console.log(`⚡ Parser optimisé terminé: ${this.stats.channelsParsed} chaînes en ${this.stats.parseTime.toFixed(2)}ms`);
        console.log(`🔄 Efficacité pool: ${poolEfficiency}% (${this.stats.poolHits}/${this.stats.channelsParsed})`);
        console.log(`📦 Efficacité cache: ${cacheEfficiency}% (${this.stats.cacheHits} hits)`);
        console.log(`⚡ Vitesse: ${channelsPerSecond} chaînes/seconde`);
        console.log(`🧠 Mémoire utilisée: ${(this.stats.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
        console.log(`📊 Lignes traitées: ${this.stats.linesProcessed}`);
    }
    
    // API de streaming pour très gros fichiers (Phase 3)
    async parseM3UStream(stream, callback) {
        console.log('🌊 Mode streaming activé pour gros fichiers...');
        
        let buffer = '';
        let state = this.STATES.SEEKING_EXTINF;
        let currentChannel = null;
        let channelIndex = 0;
        const batchSize = 100;
        let batch = [];
        
        const reader = stream.getReader();
        
        try {
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                buffer += new TextDecoder().decode(value);
                const lines = buffer.split('\n');
                
                // Garder la dernière ligne partielle
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine) continue;
                    
                    // Utiliser la même machine à états
                    switch (state) {
                        case this.STATES.SEEKING_EXTINF:
                            if (trimmedLine.startsWith('#EXTINF:')) {
                                currentChannel = this.getPooledChannel();
                                this.parseExtInfOptimized(trimmedLine, currentChannel, channelIndex++);
                                state = this.STATES.SEEKING_URL;
                            }
                            break;
                            
                        case this.STATES.SEEKING_URL:
                            if (trimmedLine && !trimmedLine.startsWith('#')) {
                                if (this.isValidUrl(trimmedLine)) {
                                    currentChannel.url = trimmedLine;
                                    batch.push(this.cloneChannel(currentChannel));
                                    
                                    // Callback par batch pour performance
                                    if (batch.length >= batchSize) {
                                        await callback(batch);
                                        batch = [];
                                    }
                                }
                                this.returnToPool(currentChannel);
                                currentChannel = null;
                                state = this.STATES.SEEKING_EXTINF;
                            }
                            break;
                    }
                }
            }
            
            // Traiter le dernier batch
            if (batch.length > 0) {
                await callback(batch);
            }
            
            // Traiter la dernière ligne si elle existe
            if (buffer.trim()) {
                // Process buffer content...
            }
            
        } finally {
            reader.releaseLock();
        }
        
        console.log('✅ Streaming parsing terminé');
    }
    
    // Nettoyage mémoire optimisé
    cleanup() {
        // Nettoyer le pool
        this.channelPool.length = 0;
        this.initializePool();
        
        // Nettoyer le cache par taille plutôt que tout vider
        if (this.stringCache.size > this.maxCacheSize / 2) {
            const keysToDelete = Array.from(this.stringCache.keys()).slice(0, this.maxCacheSize / 4);
            keysToDelete.forEach(key => this.stringCache.delete(key));
        }
        
        // Reset stats mais garder l'historique
        const previousStats = { ...this.stats };
        this.stats = {
            channelsParsed: 0,
            poolHits: 0,
            cacheHits: 0,
            parseTime: 0,
            memoryUsage: 0,
            linesProcessed: 0,
            previous: previousStats
        };
        
        console.log('🧹 Parser optimisé nettoyé');
    }
    
    // Obtenir les statistiques détaillées
    getStats() {
        const poolEfficiency = this.stats.channelsParsed > 0 ? 
            (this.stats.poolHits / this.stats.channelsParsed * 100) : 0;
        const cacheEfficiency = this.stats.linesProcessed > 0 ?
            (this.stats.cacheHits / this.stats.linesProcessed * 100) : 0;
        const channelsPerSecond = this.stats.parseTime > 0 ?
            (this.stats.channelsParsed / (this.stats.parseTime / 1000)) : 0;
        
        return {
            ...this.stats,
            poolEfficiency: Math.round(poolEfficiency * 100) / 100,
            cacheEfficiency: Math.round(cacheEfficiency * 100) / 100,
            channelsPerSecond: Math.round(channelsPerSecond),
            memoryUsageMB: Math.round((this.stats.memoryUsage / 1024 / 1024) * 100) / 100,
            poolSize: this.channelPool.length,
            cacheSize: this.stringCache.size
        };
    }
    
    // Benchmarking automatique
    async benchmark(testSizes = [1000, 2000, 5000]) {
        console.log('🏁 Démarrage benchmark parser optimisé...');
        
        const results = [];
        
        for (const size of testSizes) {
            console.log(`📊 Test avec ${size} chaînes...`);
            
            // Générer du contenu M3U de test
            const testContent = this.generateTestM3U(size);
            
            // Reset pour test propre
            this.cleanup();
            
            // Parser et mesurer
            const startTime = performance.now();
            const channels = this.parseM3U(testContent);
            const endTime = performance.now();
            
            const stats = this.getStats();
            
            results.push({
                size,
                parseTime: endTime - startTime,
                channelsParsed: channels.length,
                ...stats
            });
        }
        
        console.log('📋 Résultats benchmark:');
        results.forEach(result => {
            console.log(`  ${result.size} chaînes: ${result.parseTime.toFixed(2)}ms (${result.channelsPerSecond} ch/s)`);
        });
        
        return results;
    }
    
    // Générateur de contenu M3U pour tests
    generateTestM3U(channelCount) {
        const categories = ['Sport', 'News', 'Cinema', 'Music', 'Kids', 'Documentary'];
        const countries = ['FR', 'EN', 'DE', 'ES', 'IT'];
        
        let content = '#EXTM3U\n';
        
        for (let i = 0; i < channelCount; i++) {
            const category = categories[i % categories.length];
            const country = countries[i % countries.length];
            
            content += `#EXTINF:-1 tvg-id="test${i}" tvg-name="Test ${i}" tvg-logo="https://example.com/logo${i}.png" group-title="${category}" tvg-country="${country}",Test Channel ${i}\n`;
            content += `https://example.com/stream${i}.m3u8\n`;
        }
        
        return content;
    }
    
    // Comparaison avec parser traditionnel
    async compareWithTraditional(content, traditionalParser) {
        console.log('⚔️ Comparaison parser optimisé vs traditionnel...');
        
        // Test parser traditionnel
        const startTraditional = performance.now();
        const traditionalResult = traditionalParser(content);
        const endTraditional = performance.now();
        const traditionalTime = endTraditional - startTraditional;
        
        // Reset et test parser optimisé
        this.cleanup();
        const startOptimized = performance.now();
        const optimizedResult = this.parseM3U(content);
        const endOptimized = performance.now();
        const optimizedTime = endOptimized - startOptimized;
        
        const improvement = ((traditionalTime - optimizedTime) / traditionalTime * 100);
        const stats = this.getStats();
        
        const comparison = {
            traditional: {
                time: traditionalTime,
                channels: traditionalResult.length
            },
            optimized: {
                time: optimizedTime,
                channels: optimizedResult.length,
                ...stats
            },
            improvement: {
                timeReduction: Math.round(improvement * 100) / 100,
                speedup: Math.round((traditionalTime / optimizedTime) * 100) / 100
            }
        };
        
        console.log(`🏆 Amélioration: ${comparison.improvement.timeReduction.toFixed(1)}% plus rapide`);
        console.log(`⚡ Speedup: ${comparison.improvement.speedup}x plus rapide`);
        
        return comparison;
    }
}