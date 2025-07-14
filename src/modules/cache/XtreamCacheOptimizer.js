/**
 * 🚀 XTREAM CACHE OPTIMIZER
 * Optimisations spécifiques pour les catalogues Xtream Codes 25k+ chaînes
 */

export class XtreamCacheOptimizer {
    constructor(cacheManager) {
        this.cacheManager = cacheManager;
        this.chunkSize = 500; // Chunks plus petits pour Xtream
        this.categoryChunkSize = 200; // Chunks par catégorie
        this.compressionLevel = 'extreme'; // Compression maximale
        
        console.log('🔥 XtreamCacheOptimizer initialisé pour catalogues 25k+');
    }
    
    /**
     * Cache optimisé pour catalogues Xtream extrêmes
     */
    async cacheXtreamCatalog(playlistId, channels, categories = []) {
        console.log(`🚀 CACHE XTREAM EXTRÊME: ${channels.length} chaînes`);
        
        if (channels.length < 10000) {
            console.log('📦 Catalogue < 10k, cache standard');
            return this.cacheManager.cacheChannelList(playlistId, channels);
        }
        
        console.log('💥 MODE EXTRÊME ACTIVÉ pour 25k+ chaînes');
        
        // Stratégie multi-niveaux pour catalogues extrêmes
        await this.cacheByStrategy(playlistId, channels, categories);
        
        return true;
    }
    
    /**
     * Stratégie de cache multi-niveaux
     */
    async cacheByStrategy(playlistId, channels, categories) {
        const strategies = [
            () => this.cacheByChunks(playlistId, channels),
            () => this.cacheByCategories(playlistId, channels, categories),
            () => this.cacheByPriority(playlistId, channels),
            () => this.cacheMetadataOnly(playlistId, channels)
        ];
        
        for (const strategy of strategies) {
            try {
                await strategy();
                console.log('✅ Stratégie de cache réussie');
            } catch (error) {
                console.warn('⚠️ Stratégie échouée, tentative suivante:', error.message);
            }
        }
    }
    
    /**
     * Cache par chunks optimisés
     */
    async cacheByChunks(playlistId, channels) {
        console.log(`🧩 Cache par chunks: ${this.chunkSize} chaînes par chunk`);
        
        const totalChunks = Math.ceil(channels.length / this.chunkSize);
        const chunkMetadata = {
            strategy: 'chunks',
            totalChunks,
            chunkSize: this.chunkSize,
            totalChannels: channels.length,
            timestamp: Date.now()
        };
        
        // Cacher les métadonnées d'abord
        await this.cacheManager.set(`${playlistId}_strategy`, chunkMetadata, 'metadata');
        
        // Traitement par lots pour éviter de surcharger
        const batchSize = 10; // 10 chunks simultanés max
        
        for (let i = 0; i < totalChunks; i += batchSize) {
            const batch = [];
            
            for (let j = i; j < Math.min(i + batchSize, totalChunks); j++) {
                const start = j * this.chunkSize;
                const end = Math.min(start + this.chunkSize, channels.length);
                const chunk = channels.slice(start, end);
                
                // Compresser le chunk
                const compressedChunk = await this.compressXtreamChunk(chunk);
                
                batch.push(
                    this.cacheManager.set(`${playlistId}_chunk_${j}`, compressedChunk, 'channels')
                );
            }
            
            await Promise.all(batch);
            console.log(`📦 Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(totalChunks/batchSize)} terminé`);
            
            // Petite pause pour éviter de surcharger
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        console.log(`✅ ${totalChunks} chunks cachés avec succès`);
    }
    
    /**
     * Cache par catégories (plus efficace pour la recherche)
     */
    async cacheByCategories(playlistId, channels, categories) {
        console.log('📂 Cache par catégories optimisé');
        
        // Regrouper par catégories
        const categoryGroups = new Map();
        
        channels.forEach(channel => {
            const category = channel.group || 'Uncategorized';
            if (!categoryGroups.has(category)) {
                categoryGroups.set(category, []);
            }
            categoryGroups.get(category).push(channel);
        });
        
        console.log(`📊 ${categoryGroups.size} catégories trouvées`);
        
        // Cacher chaque catégorie
        const categoryMetadata = {
            strategy: 'categories',
            categories: Array.from(categoryGroups.keys()),
            categoryCounts: {},
            timestamp: Date.now()
        };
        
        for (const [category, categoryChannels] of categoryGroups) {
            categoryMetadata.categoryCounts[category] = categoryChannels.length;
            
            // Sous-diviser les grosses catégories
            if (categoryChannels.length > this.categoryChunkSize) {
                const categoryChunks = Math.ceil(categoryChannels.length / this.categoryChunkSize);
                
                for (let i = 0; i < categoryChunks; i++) {
                    const start = i * this.categoryChunkSize;
                    const end = Math.min(start + this.categoryChunkSize, categoryChannels.length);
                    const chunk = categoryChannels.slice(start, end);
                    
                    const compressedChunk = await this.compressXtreamChunk(chunk);
                    const key = `${playlistId}_cat_${this.sanitizeCategory(category)}_${i}`;
                    
                    await this.cacheManager.set(key, compressedChunk, 'channels');
                }
                
                categoryMetadata.categoryCounts[category] = {
                    total: categoryChannels.length,
                    chunks: categoryChunks
                };
            } else {
                // Catégorie normale
                const compressedChunk = await this.compressXtreamChunk(categoryChannels);
                const key = `${playlistId}_cat_${this.sanitizeCategory(category)}`;
                
                await this.cacheManager.set(key, compressedChunk, 'channels');
            }
        }
        
        await this.cacheManager.set(`${playlistId}_categories`, categoryMetadata, 'metadata');
        console.log('✅ Cache par catégories terminé');
    }
    
    /**
     * Cache par priorité (chaînes populaires d'abord)
     */
    async cacheByPriority(playlistId, channels) {
        console.log('🌟 Cache par priorité');
        
        // Trier par priorité (logique basée sur le nom, catégorie, etc.)
        const priorityChannels = channels.sort((a, b) => {
            return this.calculateChannelPriority(b) - this.calculateChannelPriority(a);
        });
        
        // Cacher les 1000 premières chaînes en priorité haute
        const highPriority = priorityChannels.slice(0, 1000);
        const mediumPriority = priorityChannels.slice(1000, 5000);
        const lowPriority = priorityChannels.slice(5000);
        
        await this.cacheManager.set(`${playlistId}_priority_high`, 
            await this.compressXtreamChunk(highPriority), 'channels');
        
        await this.cacheManager.set(`${playlistId}_priority_medium`, 
            await this.compressXtreamChunk(mediumPriority), 'channels');
        
        // Cache low priority par chunks
        const lowPriorityChunks = Math.ceil(lowPriority.length / 2000);
        for (let i = 0; i < lowPriorityChunks; i++) {
            const start = i * 2000;
            const end = Math.min(start + 2000, lowPriority.length);
            const chunk = lowPriority.slice(start, end);
            
            await this.cacheManager.set(`${playlistId}_priority_low_${i}`, 
                await this.compressXtreamChunk(chunk), 'channels');
        }
        
        const priorityMetadata = {
            strategy: 'priority',
            highPriorityCount: highPriority.length,
            mediumPriorityCount: mediumPriority.length,
            lowPriorityCount: lowPriority.length,
            lowPriorityChunks,
            timestamp: Date.now()
        };
        
        await this.cacheManager.set(`${playlistId}_priority`, priorityMetadata, 'metadata');
        console.log('✅ Cache par priorité terminé');
    }
    
    /**
     * Cache métadonnées uniquement (dernier recours)
     */
    async cacheMetadataOnly(playlistId, channels) {
        console.log('📋 Cache métadonnées uniquement (mode survie)');
        
        const metadata = channels.map(channel => ({
            i: channel.id,
            n: channel.name,
            g: channel.group,
            l: channel.logo ? 1 : 0, // Flag boolean pour logo
            t: channel.type || 'live'
        }));
        
        const compressedMetadata = await this.compressXtreamChunk(metadata);
        
        await this.cacheManager.set(`${playlistId}_metadata_only`, compressedMetadata, 'metadata');
        
        const metaInfo = {
            strategy: 'metadata_only',
            totalChannels: channels.length,
            dataSize: JSON.stringify(metadata).length,
            timestamp: Date.now()
        };
        
        await this.cacheManager.set(`${playlistId}_meta_info`, metaInfo, 'metadata');
        console.log('✅ Cache métadonnées terminé');
    }
    
    /**
     * Compression extrême spécifique Xtream
     */
    async compressXtreamChunk(chunk) {
        const original = JSON.stringify(chunk);
        
        // Compression Xtream spécifique
        let compressed = original
            // Compression des champs Xtream
            .replace(/"stream_id":/g, '"si":')
            .replace(/"category_id":/g, '"ci":')
            .replace(/"stream_type":/g, '"st":')
            .replace(/"stream_icon":/g, '"si":')
            .replace(/"epg_channel_id":/g, '"ei":')
            .replace(/"added":/g, '"a":')
            .replace(/"is_adult":/g, '"ad":')
            .replace(/"direct_source":/g, '"ds":')
            // Compression des valeurs communes
            .replace(/"live"/g, '"L"')
            .replace(/"movie"/g, '"M"')
            .replace(/"series"/g, '"S"')
            .replace(/":true/g, '":1')
            .replace(/":false/g, '":0')
            .replace(/":null/g, '":""');
        
        // Compression des URLs répétitives Xtream
        const xtreamUrls = compressed.match(/http[^"]*\/live\/[^"]+/g);
        if (xtreamUrls) {
            const baseUrl = xtreamUrls[0].split('/live/')[0];
            compressed = compressed.replace(new RegExp(baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '@BASE');
            compressed = `BASE:${baseUrl}|${compressed}`;
        }
        
        const ratio = ((1 - compressed.length / original.length) * 100).toFixed(1);
        console.log(`🗜️ Compression Xtream: ${(original.length/1024).toFixed(1)}KB → ${(compressed.length/1024).toFixed(1)}KB (${ratio}%)`);
        
        return compressed;
    }
    
    /**
     * Calculer la priorité d'une chaîne
     */
    calculateChannelPriority(channel) {
        let priority = 0;
        
        // Priorité selon la catégorie
        const categoryPriority = {
            'Sports': 100,
            'News': 90,
            'Movies': 80,
            'Entertainment': 70,
            'Music': 60,
            'Kids': 50,
            'Documentary': 40,
            'Adult': 10
        };
        
        priority += categoryPriority[channel.group] || 30;
        
        // Bonus pour les chaînes avec logo
        if (channel.logo) priority += 20;
        
        // Bonus pour les chaînes HD
        if (channel.name.includes('HD')) priority += 15;
        
        // Malus pour les chaînes adultes
        if (channel.is_adult) priority -= 50;
        
        return priority;
    }
    
    /**
     * Nettoyer le nom de catégorie pour usage comme clé
     */
    sanitizeCategory(category) {
        return category
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/_+/g, '_')
            .substring(0, 30);
    }
    
    /**
     * Récupérer les chaînes selon la stratégie utilisée
     */
    async retrieveChannels(playlistId, options = {}) {
        const strategy = await this.cacheManager.get(`${playlistId}_strategy`, 'metadata');
        
        if (!strategy) {
            console.warn('⚠️ Aucune stratégie trouvée, cache standard');
            return await this.cacheManager.getCachedChannelList(playlistId);
        }
        
        console.log(`📥 Récupération avec stratégie: ${strategy.strategy}`);
        
        switch (strategy.strategy) {
            case 'chunks':
                return await this.retrieveByChunks(playlistId, strategy, options);
            case 'categories':
                return await this.retrieveByCategories(playlistId, strategy, options);
            case 'priority':
                return await this.retrieveByPriority(playlistId, strategy, options);
            case 'metadata_only':
                return await this.retrieveMetadataOnly(playlistId, strategy, options);
            default:
                return await this.cacheManager.getCachedChannelList(playlistId);
        }
    }
    
    /**
     * Récupération par chunks
     */
    async retrieveByChunks(playlistId, strategy, options) {
        const { limit = 1000, offset = 0 } = options;
        
        const startChunk = Math.floor(offset / strategy.chunkSize);
        const endChunk = Math.floor((offset + limit) / strategy.chunkSize);
        
        const channels = [];
        
        for (let i = startChunk; i <= endChunk && i < strategy.totalChunks; i++) {
            const chunk = await this.cacheManager.get(`${playlistId}_chunk_${i}`, 'channels');
            if (chunk) {
                const decompressed = await this.decompressXtreamChunk(chunk);
                channels.push(...decompressed);
            }
        }
        
        return channels.slice(offset % strategy.chunkSize, (offset % strategy.chunkSize) + limit);
    }
    
    /**
     * Récupération par catégories
     */
    async retrieveByCategories(playlistId, strategy, options) {
        const { category, limit = 1000 } = options;
        
        if (category) {
            const key = `${playlistId}_cat_${this.sanitizeCategory(category)}`;
            const chunk = await this.cacheManager.get(key, 'channels');
            
            if (chunk) {
                const decompressed = await this.decompressXtreamChunk(chunk);
                return decompressed.slice(0, limit);
            }
        }
        
        // Récupération de toutes les catégories
        const channels = [];
        for (const cat of strategy.categories) {
            const key = `${playlistId}_cat_${this.sanitizeCategory(cat)}`;
            const chunk = await this.cacheManager.get(key, 'channels');
            
            if (chunk) {
                const decompressed = await this.decompressXtreamChunk(chunk);
                channels.push(...decompressed);
            }
        }
        
        return channels.slice(0, limit);
    }
    
    /**
     * Décompression spécifique Xtream
     */
    async decompressXtreamChunk(compressed) {
        let decompressed = compressed;
        
        // Décompression des URLs de base
        if (decompressed.includes('BASE:')) {
            const baseEnd = decompressed.indexOf('|');
            const baseUrl = decompressed.substring(5, baseEnd);
            decompressed = decompressed.substring(baseEnd + 1);
            decompressed = decompressed.replace(/@BASE/g, baseUrl);
        }
        
        // Décompression des champs Xtream
        decompressed = decompressed
            .replace(/"si":/g, '"stream_id":')
            .replace(/"ci":/g, '"category_id":')
            .replace(/"st":/g, '"stream_type":')
            .replace(/"si":/g, '"stream_icon":')
            .replace(/"ei":/g, '"epg_channel_id":')
            .replace(/"a":/g, '"added":')
            .replace(/"ad":/g, '"is_adult":')
            .replace(/"ds":/g, '"direct_source":')
            .replace(/":1/g, '":true')
            .replace(/":0/g, '":false')
            .replace(/":""/g, '":null')
            .replace(/"L"/g, '"live"')
            .replace(/"M"/g, '"movie"')
            .replace(/"S"/g, '"series"');
        
        return JSON.parse(decompressed);
    }
    
    /**
     * Statistiques d'utilisation
     */
    async getUsageStats(playlistId) {
        const strategy = await this.cacheManager.get(`${playlistId}_strategy`, 'metadata');
        
        if (!strategy) return null;
        
        const stats = {
            strategy: strategy.strategy,
            totalChannels: strategy.totalChannels,
            cacheEfficiency: 0,
            memoryUsage: 0,
            accessPattern: 'unknown'
        };
        
        // Calculer l'efficacité selon la stratégie
        switch (strategy.strategy) {
            case 'chunks':
                stats.cacheEfficiency = (strategy.totalChunks * strategy.chunkSize) / strategy.totalChannels;
                break;
            case 'categories':
                stats.cacheEfficiency = strategy.categories.length / strategy.totalChannels;
                break;
            case 'priority':
                stats.cacheEfficiency = 0.9; // Les priorités sont très efficaces
                break;
            case 'metadata_only':
                stats.cacheEfficiency = 0.1; // Métadonnées seulement
                break;
        }
        
        return stats;
    }
}