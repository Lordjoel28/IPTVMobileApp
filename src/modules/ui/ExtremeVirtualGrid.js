export class ExtremeVirtualGrid {
    constructor(containerSelector, options = {}) {
        this.container = document.querySelector(containerSelector);
        if (!this.container) {
            throw new Error(`Container not found: ${containerSelector}`);
        }
        
        // Configuration performance - LIMITES ADAPTATIVES
        this.config = {
            itemHeight: options.itemHeight || 180,
            maxRenderItems: options.maxRender || this.calculateOptimalMaxRender(), // LIMITE DYNAMIQUE selon viewport
            overscan: Math.min(options.overscan || 5, 10),
            chunkSize: options.chunkSize || 500, // Pagination par chunks
            cacheSize: options.cacheSize || 1000, // Cache LRU agressif
            lazyThreshold: options.lazyThreshold || 100,
            debounceMs: options.debounceMs || 16, // 60 FPS = 16.67ms max
            scrollThrottleMs: options.scrollThrottleMs || 8, // Ultra-responsive
            searchWorkerEnabled: options.searchWorker !== false
        };
        
        // État interne pour gestion extreme scale
        this.allChannels = [];
        this.filteredChannels = [];
        this.visibleChannels = [];
        this.visibleStart = 0;
        this.visibleEnd = 0;
        this.currentChunk = 0;
        this.totalChunks = 0;
        this.scrollTop = 0;
        this.containerHeight = 0;
        this.totalHeight = 0;
        this.isScrolling = false;
        this.lastRenderTime = 0;
        
        // Cache LRU ultra-optimisé pour DOM elements
        this.domCache = new Map();
        this.cacheOrder = [];
        this.cacheStats = { hits: 0, misses: 0 };
        
        // Pool d'éléments DOM pour recyclage
        this.elementPool = [];
        this.poolSize = this.config.maxRenderItems + 10;
        
        // Web Worker pour recherche asynchrone
        this.searchWorker = null;
        this.searchPending = false;
        
        // Performance monitoring
        this.performanceStats = {
            frameCount: 0,
            droppedFrames: 0,
            avgRenderTime: 0,
            peakMemory: 0,
            lastFpsCheck: Date.now()
        };
        
        // Throttling et debouncing ultra-optimisés
        this.debouncedRender = this.debounce(this.renderVisible.bind(this), this.config.debounceMs);
        this.throttledScroll = this.throttle(this.handleScroll.bind(this), this.config.scrollThrottleMs);
        this.rafId = null;
        
        // Event handlers avec weak references
        this.boundHandlers = new Map();
        
        console.log('🚀 ExtremeVirtualGrid initialisé pour scale extrême');
        console.log(`📊 Config: max ${this.config.maxRenderItems} DOM elements, cache ${this.config.cacheSize}`);
        
        this.initializeContainer();
        this.initElementPool();
        this.bindEvents();
        
        if (this.config.searchWorkerEnabled) {
            this.initSearchWorker();
        }
        
        // Monitoring performance continu
        this.startPerformanceMonitoring();
    }
    
    // CORRECTION: Calculer limite dynamique selon viewport
    calculateOptimalMaxRender() {
        const viewportHeight = window.innerHeight;
        const containerHeight = this.container?.clientHeight || Math.max(400, viewportHeight - 200);
        const itemHeight = this.config?.itemHeight || 180;
        
        const visibleItems = Math.ceil(containerHeight / itemHeight);
        const optimalMax = Math.max(
            visibleItems + 20, // Items visibles + buffer
            Math.min(500, visibleItems * 5) // Maximum adaptatif
        );
        
        console.log(`📐 Limite dynamique calculée: ${optimalMax} éléments (${visibleItems} visibles)`);
        return optimalMax;
    }
    
    initializeContainer() {
        // Configuration container pour performance maximale
        this.container.style.cssText = `
            height: 600px;
            overflow-y: auto;
            position: relative;
            contain: layout style paint;
            transform: translateZ(0);
            will-change: scroll-position;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: thin;
        `;
        
        // Container virtuel pour hauteur totale simulée
        this.virtualContainer = document.createElement('div');
        this.virtualContainer.className = 'extreme-virtual-container';
        this.virtualContainer.style.cssText = `
            position: relative;
            will-change: height;
            contain: layout;
        `;
        
        // Viewport pour éléments visibles uniquement - COMPATIBLE CSS GRID
        this.viewport = document.createElement('div');
        this.viewport.className = 'extreme-virtual-viewport';
        this.viewport.style.cssText = `
            position: relative;
            width: 100%;
            will-change: transform;
            contain: layout style paint;
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 8px;
        `;
        
        // Spacers pour maintenir la hauteur de scroll
        this.topSpacer = document.createElement('div');
        this.topSpacer.style.cssText = `
            height: 0px;
            contain: layout;
            pointer-events: none;
        `;
        
        this.bottomSpacer = document.createElement('div');
        this.bottomSpacer.style.cssText = `
            height: 0px;
            contain: layout;
            pointer-events: none;
        `;
        
        this.virtualContainer.appendChild(this.topSpacer);
        this.virtualContainer.appendChild(this.viewport);
        this.virtualContainer.appendChild(this.bottomSpacer);
        this.container.appendChild(this.virtualContainer);
        
        console.log('✅ Container extreme virtualization initialisé');
    }
    
    initElementPool() {
        // Pré-créer pool d'éléments pour éviter allocations
        for (let i = 0; i < this.poolSize; i++) {
            const element = this.createBaseElement();
            this.elementPool.push(element);
        }
        console.log(`🏊 Pool d'éléments initialisé: ${this.poolSize} éléments`);
    }
    
    initSearchWorker() {
        console.log('🔍 Initialisation Web Worker pour recherche...');
        
        const workerCode = `
            let channelIndex = new Map();
            let fuzzyIndex = new Map();
            let nameIndex = new Map();
            let groupIndex = new Map();
            
            self.onmessage = function(e) {
                const { type, data } = e.data;
                
                switch(type) {
                    case 'BUILD_INDEX':
                        buildSearchIndex(data.channels);
                        self.postMessage({ type: 'INDEX_READY', channelCount: data.channels.length });
                        break;
                        
                    case 'SEARCH':
                        const results = searchChannels(data.query, data.limit || 100);
                        self.postMessage({ 
                            type: 'SEARCH_RESULTS', 
                            results,
                            query: data.query,
                            resultCount: results.length
                        });
                        break;
                        
                    case 'SEARCH_BY_CATEGORY':
                        const categoryResults = searchByCategory(data.category, data.limit || 1000);
                        self.postMessage({
                            type: 'CATEGORY_RESULTS',
                            results: categoryResults,
                            category: data.category
                        });
                        break;
                }
            };
            
            function buildSearchIndex(channels) {
                console.log('Building search index for', channels.length, 'channels...');
                
                channelIndex.clear();
                fuzzyIndex.clear();
                nameIndex.clear();
                groupIndex.clear();
                
                channels.forEach((channel, index) => {
                    const name = (channel.name || '').toLowerCase();
                    const group = (channel.group || '').toLowerCase();
                    const searchText = \`\${name} \${group}\`;
                    
                    channelIndex.set(index, { name, group, searchText });
                    
                    // Index par nom pour recherche rapide
                    if (name) {
                        if (!nameIndex.has(name)) nameIndex.set(name, []);
                        nameIndex.get(name).push(index);
                    }
                    
                    // Index par groupe
                    if (group) {
                        if (!groupIndex.has(group)) groupIndex.set(group, []);
                        groupIndex.get(group).push(index);
                    }
                    
                    // N-grammes pour recherche floue ultra-rapide
                    for (let i = 0; i < searchText.length - 2; i++) {
                        const ngram = searchText.substring(i, i + 3);
                        if (ngram.trim().length === 3) {
                            if (!fuzzyIndex.has(ngram)) {
                                fuzzyIndex.set(ngram, new Set());
                            }
                            fuzzyIndex.get(ngram).add(index);
                        }
                    }
                });
                
                console.log('Index built:', channelIndex.size, 'channels,', fuzzyIndex.size, 'n-grams');
            }
            
            function searchChannels(query, limit) {
                if (!query || query.length < 2) return [];
                
                const lowerQuery = query.toLowerCase().trim();
                const results = new Map(); // Map pour éviter doublons avec score
                
                // 1. Recherche exacte dans les noms (score max)
                nameIndex.forEach((indices, name) => {
                    if (name.includes(lowerQuery)) {
                        const score = name.startsWith(lowerQuery) ? 100 : 80;
                        indices.forEach(index => {
                            if (!results.has(index) || results.get(index) < score) {
                                results.set(index, score);
                            }
                        });
                    }
                });
                
                // 2. Recherche dans les groupes (score moyen)
                groupIndex.forEach((indices, group) => {
                    if (group.includes(lowerQuery)) {
                        indices.forEach(index => {
                            if (!results.has(index) || results.get(index) < 60) {
                                results.set(index, 60);
                            }
                        });
                    }
                });
                
                // 3. Recherche floue si pas assez de résultats
                if (results.size < limit && lowerQuery.length >= 3) {
                    const fuzzyMatches = new Map();
                    
                    for (let i = 0; i < lowerQuery.length - 2; i++) {
                        const ngram = lowerQuery.substring(i, i + 3);
                        if (fuzzyIndex.has(ngram)) {
                            fuzzyIndex.get(ngram).forEach(index => {
                                fuzzyMatches.set(index, (fuzzyMatches.get(index) || 0) + 1);
                            });
                        }
                    }
                    
                    // Ajouter matches floues avec score basé sur nombre de n-grammes
                    fuzzyMatches.forEach((count, index) => {
                        const score = Math.min(50, count * 10);
                        if (!results.has(index) || results.get(index) < score) {
                            results.set(index, score);
                        }
                    });
                }
                
                // Trier par score et retourner indices
                return Array.from(results.entries())
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, limit)
                    .map(([index]) => index);
            }
            
            function searchByCategory(category, limit) {
                const categoryLower = category.toLowerCase();
                return groupIndex.get(categoryLower) || [];
            }
        `;
        
        try {
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            this.searchWorker = new Worker(URL.createObjectURL(blob));
            
            this.searchWorker.onmessage = (e) => {
                const { type, results, query, category } = e.data;
                
                switch(type) {
                    case 'INDEX_READY':
                        console.log(`✅ Index de recherche prêt: ${e.data.channelCount} chaînes`);
                        break;
                        
                    case 'SEARCH_RESULTS':
                        this.handleSearchResults(results, query);
                        break;
                        
                    case 'CATEGORY_RESULTS':
                        this.handleCategoryResults(results, category);
                        break;
                }
                
                this.searchPending = false;
            };
            
            this.searchWorker.onerror = (error) => {
                console.error('❌ Erreur Web Worker:', error);
                this.searchWorker = null;
            };
            
            console.log('✅ Web Worker pour recherche initialisé');
            
        } catch (error) {
            console.error('❌ Impossible de créer Web Worker:', error);
            this.searchWorker = null;
        }
    }
    
    bindEvents() {
        // Scroll event avec throttling ultra-agressif
        const scrollHandler = this.throttledScroll;
        this.container.addEventListener('scroll', scrollHandler, { 
            passive: true,
            capture: false 
        });
        this.boundHandlers.set('scroll', scrollHandler);
        
        // Resize observer pour responsive
        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver(entries => {
                for (const entry of entries) {
                    this.containerHeight = entry.contentRect.height;
                    this.calculateVisibleRange();
                    this.debouncedRender();
                }
            });
            this.resizeObserver.observe(this.container);
        }
        
        // Focus/blur pour suspendre rendering si invisible
        const visibilityHandler = () => {
            if (document.hidden) {
                this.suspendRendering();
            } else {
                this.resumeRendering();
            }
        };
        document.addEventListener('visibilitychange', visibilityHandler);
        this.boundHandlers.set('visibility', visibilityHandler);
        
        console.log('✅ Event listeners optimisés attachés');
    }
    
    // CORE: Mise à jour des chaînes avec gestion extreme scale
    updateChannels(channels, filteredMode = false) {
        const startTime = performance.now();
        
        console.log(`🚀 ExtremeVirtualGrid: Mise à jour ${channels.length} chaînes`);
        
        if (!filteredMode) {
            this.allChannels = channels;
            
            // ALERTE: Catalogues extrêmes
            if (channels.length > 50000) {
                console.warn(`⚠️ CATALOGUE EXTRÊME: ${channels.length} chaînes détectées!`);
                console.warn('💡 Recommandation: Implémenter pagination serveur');
            } else if (channels.length > 25000) {
                console.info(`📊 Catalogue important: ${channels.length} chaînes (système optimisé)`);
            }
            
            // Construire l'index de recherche en arrière-plan
            if (this.searchWorker && channels.length > 0) {
                this.searchWorker.postMessage({
                    type: 'BUILD_INDEX',
                    data: { channels }
                });
            }
        }
        
        this.filteredChannels = channels;
        this.totalChunks = Math.ceil(channels.length / this.config.chunkSize);
        this.currentChunk = 0;
        
        // Mettre à jour la hauteur virtuelle totale - GRILLE 5 COLONNES
        const columnsPerRow = 5;
        const totalRows = Math.ceil(channels.length / columnsPerRow);
        this.totalHeight = totalRows * this.config.itemHeight;
        this.virtualContainer.style.height = `${this.totalHeight}px`;
        
        // Calculer et rendre immédiatement
        this.containerHeight = this.container.clientHeight;
        this.calculateVisibleRange();
        this.renderVisible();
        
        const updateTime = performance.now() - startTime;
        console.log(`⚡ Mise à jour terminée en ${updateTime.toFixed(2)}ms`);
        
        // Stats mémoire extrême
        this.logMemoryStats();
    }
    
    calculateVisibleRange() {
        this.scrollTop = this.container.scrollTop;
        
        // Calcul ultra-optimisé de la plage visible - GRILLE 5 COLONNES
        const columnsPerRow = 5;
        const startRowIndex = Math.floor(this.scrollTop / this.config.itemHeight);
        const visibleRowCount = Math.ceil(this.containerHeight / this.config.itemHeight);
        const endRowIndex = startRowIndex + visibleRowCount + this.config.overscan;
        
        // Convertir en index d'éléments
        const startIndex = startRowIndex * columnsPerRow;
        const endIndex = Math.min(
            endRowIndex * columnsPerRow,
            this.filteredChannels.length
        );
        
        // LIMITE CRITIQUE: JAMAIS plus de maxRenderItems DOM elements
        const totalVisible = endIndex - startIndex;
        if (totalVisible > this.config.maxRenderItems) {
            console.warn(`⚠️ Limitation DOM: ${totalVisible} -> ${this.config.maxRenderItems}`);
            this.visibleStart = startIndex;
            this.visibleEnd = startIndex + this.config.maxRenderItems;
        } else {
            this.visibleStart = Math.max(0, startIndex - (this.config.overscan * columnsPerRow));
            this.visibleEnd = endIndex;
        }
        
        // Debug pour développement
        if (this.visibleEnd - this.visibleStart > this.config.maxRenderItems) {
            console.error(`🚨 VIOLATION LIMITE DOM: ${this.visibleEnd - this.visibleStart} elements!`);
            this.visibleEnd = this.visibleStart + this.config.maxRenderItems;
        }
    }
    
    renderVisible() {
        // Éviter rendering concurrent
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
        
        this.rafId = requestAnimationFrame(() => {
            this.performRender();
        });
    }
    
    performRender() {
        const renderStart = performance.now();
        
        if (!this.filteredChannels.length) {
            this.viewport.innerHTML = '';
            return;
        }
        
        // Extraire chaînes visibles
        this.visibleChannels = this.filteredChannels.slice(this.visibleStart, this.visibleEnd);
        
        // VALIDATION CRITIQUE
        if (this.visibleChannels.length > this.config.maxRenderItems) {
            console.error(`🚨 VIOLATION: ${this.visibleChannels.length} > ${this.config.maxRenderItems}`);
            this.visibleChannels = this.visibleChannels.slice(0, this.config.maxRenderItems);
        }
        
        // Clear viewport ultra-rapide
        this.viewport.textContent = '';
        
        // Rendu optimisé avec fragment
        const fragment = document.createDocumentFragment();
        
        this.visibleChannels.forEach((channel, index) => {
            const actualIndex = this.visibleStart + index;
            const element = this.getOrCreateElement(channel, actualIndex);
            
            // CORRECTION: Utiliser CSS Grid au lieu de position absolue
            // Supprimer le positionnement absolu
            element.style.transform = '';
            element.style.width = '';
            element.style.position = 'relative';
            
            fragment.appendChild(element);
        });
        
        this.viewport.appendChild(fragment);
        
        // Ajuster spacers pour maintenir hauteur scroll - COMPATIBLE CSS GRID
        const columnsPerRow = 5;
        const topRows = Math.floor(this.visibleStart / columnsPerRow);
        const bottomRows = Math.ceil((this.filteredChannels.length - this.visibleEnd) / columnsPerRow);
        const topSpace = topRows * this.config.itemHeight;
        const bottomSpace = bottomRows * this.config.itemHeight;
        
        // Les spacers fonctionnent toujours de la même façon
        this.topSpacer.style.height = `${topSpace}px`;
        this.bottomSpacer.style.height = `${bottomSpace}px`;
        
        const renderTime = performance.now() - renderStart;
        this.lastRenderTime = renderTime;
        
        // Performance monitoring
        this.trackRenderPerformance(renderTime);
        
        console.log(`⚡ Rendu: ${this.visibleChannels.length}/${this.filteredChannels.length} éléments en ${renderTime.toFixed(2)}ms`);
        
        this.rafId = null;
    }
    
    getOrCreateElement(channel, index) {
        const cacheKey = `${channel.id || index}`;
        
        // Essayer cache LRU d'abord
        if (this.domCache.has(cacheKey)) {
            this.cacheStats.hits++;
            const cachedElement = this.domCache.get(cacheKey);
            this.updateCacheOrder(cacheKey);
            
            // Mise à jour rapide du contenu si nécessaire
            this.updateElementContent(cachedElement, channel);
            return cachedElement;
        }
        
        // Cache miss - créer nouvel élément
        this.cacheStats.misses++;
        const element = this.createChannelElement(channel);
        
        // Ajouter au cache LRU
        this.addToCache(cacheKey, element);
        
        return element;
    }
    
    createChannelElement(channel) {
        // Utiliser pool si possible
        let element;
        if (this.elementPool.length > 0) {
            element = this.elementPool.pop();
            this.resetElement(element);
        } else {
            element = this.createBaseElement();
        }
        
        this.updateElementContent(element, channel);
        return element;
    }
    
    createBaseElement() {
        const div = document.createElement('div');
        div.className = 'channel-card virtual-item extreme-item';
        div.style.cssText = `
            position: absolute;
            width: 100%;
            height: ${this.config.itemHeight}px;
            contain: layout style paint;
            will-change: transform;
            backface-visibility: hidden;
            transform: translateZ(0);
        `;
        
        // Structure HTML optimisée
        div.innerHTML = `
            <div class="channel-card__content">
                <div class="channel-card__image">
                    <img class="channel-logo" alt="" loading="lazy">
                    <div class="channel-logo-fallback" style="display: none;">
                        <span class="emoji-fallback">📺</span>
                    </div>
                </div>
                <div class="channel-card__info">
                    <h3 class="channel-card__title"></h3>
                    <p class="channel-card__group"></p>
                </div>
                <div class="channel-card__actions">
                    <button class="btn-icon favorite-btn" type="button">
                        <span class="material-icons">favorite_border</span>
                    </button>
                </div>
            </div>
        `;
        
        return div;
    }
    
    resetElement(element) {
        // Reset rapide sans reconstruction DOM
        element.className = 'channel-card virtual-item extreme-item';
        element.style.transform = '';
        element.removeAttribute('data-channel-id');
    }
    
    updateElementContent(element, channel) {
        // Mise à jour ultra-rapide du contenu
        element.dataset.channelId = channel.id || '';
        
        const logo = element.querySelector('.channel-logo');
        const logoFallback = element.querySelector('.channel-logo-fallback');
        const title = element.querySelector('.channel-card__title');
        const group = element.querySelector('.channel-card__group');
        const favoriteBtn = element.querySelector('.favorite-btn');
        
        // Logo avec validation préventive
        const validLogoUrl = this.validateLogoUrl ? this.validateLogoUrl(channel.logo) : channel.logo;
        
        if (validLogoUrl) {
            logo.src = validLogoUrl;
            logo.alt = channel.name || '';
            logo.style.display = 'block';
            logoFallback.style.display = 'none';
            
            logo.onerror = () => {
                logo.style.display = 'none';
                logoFallback.style.display = 'flex';
                // Utiliser emoji par catégorie au lieu du 📺 par défaut
                const emoji = this.getCategoryEmoji ? this.getCategoryEmoji(channel.group) : '📺';
                logoFallback.querySelector('.emoji-fallback').textContent = emoji;
            };
        } else {
            logo.style.display = 'none';
            logoFallback.style.display = 'flex';
            // Utiliser emoji par catégorie au lieu du 📺 par défaut
            const emoji = this.getCategoryEmoji ? this.getCategoryEmoji(channel.group) : '📺';
            logoFallback.querySelector('.emoji-fallback').textContent = emoji;
        }
        
        // Contenu textuel
        title.textContent = channel.name || 'Chaîne sans nom';
        group.textContent = channel.group || 'Général';
        
        // État favori
        const isFavorite = this.isFavoriteChannel?.(channel.id) || false;
        favoriteBtn.querySelector('.material-icons').textContent = 
            isFavorite ? 'favorite' : 'favorite_border';
        
        // Event listener optimisé avec délégation
        element.onclick = (e) => {
            e.stopPropagation();
            
            if (e.target.closest('.favorite-btn')) {
                this.onFavoriteClick?.(channel);
            } else {
                this.onChannelClick?.(channel);
            }
        };
    }
    
    addToCache(key, element) {
        // Gestion cache LRU ultra-optimisée
        if (this.domCache.size >= this.config.cacheSize) {
            // Evict LRU items
            const evictCount = Math.floor(this.config.cacheSize * 0.1); // Evict 10%
            for (let i = 0; i < evictCount && this.cacheOrder.length > 0; i++) {
                const lruKey = this.cacheOrder.shift();
                const lruElement = this.domCache.get(lruKey);
                this.domCache.delete(lruKey);
                
                // Retourner au pool si possible
                if (this.elementPool.length < this.poolSize && lruElement) {
                    this.resetElement(lruElement);
                    this.elementPool.push(lruElement);
                }
            }
        }
        
        this.domCache.set(key, element);
        this.cacheOrder.push(key);
    }
    
    updateCacheOrder(key) {
        const index = this.cacheOrder.indexOf(key);
        if (index > -1) {
            this.cacheOrder.splice(index, 1);
            this.cacheOrder.push(key);
        }
    }
    
    handleScroll() {
        this.calculateVisibleRange();
        this.debouncedRender();
        
        // Pagination automatique pour very large datasets
        const scrollPercentage = this.container.scrollTop / 
            Math.max(1, this.container.scrollHeight - this.container.clientHeight);
        
        if (scrollPercentage > 0.9) {
            this.loadNextChunk();
        }
    }
    
    loadNextChunk() {
        // Future: Implémenter lazy loading de chunks
        // Pour l'instant, tout est chargé en mémoire
        if (this.currentChunk < this.totalChunks - 1) {
            console.log(`📄 Chargement chunk ${this.currentChunk + 1}/${this.totalChunks}`);
            this.currentChunk++;
            // TODO: Charger données serveur si nécessaire
        }
    }
    
    // API de recherche avec Web Worker - LIMITE SUPPRIMÉE POUR 25K+ CHAÎNES
    search(query, limit = 25000) {
        if (!this.searchWorker) {
            console.warn('⚠️ Web Worker non disponible pour recherche');
            return;
        }
        
        if (this.searchPending) {
            console.log('🔍 Recherche en cours, ignorée...');
            return;
        }
        
        this.searchPending = true;
        console.log(`🔍 Recherche: "${query}"`);
        
        this.searchWorker.postMessage({
            type: 'SEARCH',
            data: { query, limit }
        });
    }
    
    searchByCategory(category, limit = 1000) {
        if (!this.searchWorker) return;
        
        this.searchWorker.postMessage({
            type: 'SEARCH_BY_CATEGORY',
            data: { category, limit }
        });
    }
    
    handleSearchResults(indices, query) {
        console.log(`✅ Recherche "${query}": ${indices.length} résultats`);
        
        const filteredChannels = indices
            .map(i => this.allChannels[i])
            .filter(Boolean);
        
        this.updateChannels(filteredChannels, true);
        this.onSearchComplete?.(filteredChannels, query);
    }
    
    handleCategoryResults(indices, category) {
        const filteredChannels = indices
            .map(i => this.allChannels[i])
            .filter(Boolean);
        
        this.updateChannels(filteredChannels, true);
        this.onCategoryFilter?.(filteredChannels, category);
    }
    
    // Performance monitoring continu
    startPerformanceMonitoring() {
        // Attendre 2 secondes avant de commencer le monitoring pour éviter les faux positifs
        setTimeout(() => {
            setInterval(() => {
                this.checkPerformance();
            }, 1000);
        }, 2000);
    }
    
    checkPerformance() {
        const now = Date.now();
        
        // Vérifier FPS
        if (now - this.performanceStats.lastFpsCheck > 1000) {
            const fps = this.performanceStats.frameCount;
            this.performanceStats.frameCount = 0;
            this.performanceStats.lastFpsCheck = now;
            
            // Ne pas afficher d'avertissement si aucun frame n'a été rendu (initialisation)
            if (fps > 0 && fps < 55) {
                console.warn(`⚠️ FPS bas détecté: ${fps} FPS`);
            }
        }
        
        // Vérifier mémoire
        if (performance.memory) {
            const memMB = performance.memory.usedJSHeapSize / 1024 / 1024;
            if (memMB > this.performanceStats.peakMemory) {
                this.performanceStats.peakMemory = memMB;
            }
            
            if (memMB > 500) { // Plus de 500MB
                console.warn(`⚠️ Consommation mémoire élevée: ${memMB.toFixed(1)}MB`);
                this.optimizeMemory();
            }
        }
    }
    
    trackRenderPerformance(renderTime) {
        this.performanceStats.frameCount++;
        
        if (renderTime > 16.67) { // Plus de 60 FPS
            this.performanceStats.droppedFrames++;
            console.warn(`⚠️ Frame dropped: ${renderTime.toFixed(2)}ms`);
        }
        
        // Moyenne mobile du temps de rendu
        this.performanceStats.avgRenderTime = 
            (this.performanceStats.avgRenderTime * 0.9) + (renderTime * 0.1);
    }
    
    optimizeMemory() {
        console.log('🧹 Optimisation mémoire forcée...');
        
        // Vider cache agressivement
        const cacheSize = this.domCache.size;
        this.domCache.clear();
        this.cacheOrder.length = 0;
        
        // Forcer garbage collection si possible
        if (window.gc) {
            window.gc();
        }
        
        console.log(`✅ Cache vidé: ${cacheSize} éléments supprimés`);
    }
    
    suspendRendering() {
        console.log('⏸️ Rendu suspendu (page non visible)');
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }
    
    resumeRendering() {
        console.log('▶️ Rendu repris');
        this.debouncedRender();
    }
    
    logMemoryStats() {
        if (performance.memory) {
            const memory = performance.memory;
            const usedMB = (memory.usedJSHeapSize / 1024 / 1024).toFixed(1);
            const totalMB = (memory.totalJSHeapSize / 1024 / 1024).toFixed(1);
            const limitMB = (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(1);
            
            console.log(`🧠 Mémoire: ${usedMB}MB / ${totalMB}MB (limite: ${limitMB}MB)`);
        }
        
        console.log(`📊 Cache: ${this.domCache.size}/${this.config.cacheSize} (${this.cacheStats.hits} hits, ${this.cacheStats.misses} misses)`);
        console.log(`🏊 Pool: ${this.elementPool.length}/${this.poolSize} éléments disponibles`);
    }
    
    // API de diagnostic pour développement
    getDiagnostics() {
        return {
            totalChannels: this.allChannels.length,
            filteredChannels: this.filteredChannels.length,
            visibleChannels: this.visibleChannels.length,
            domElements: this.viewport.children.length,
            cacheSize: this.domCache.size,
            poolSize: this.elementPool.length,
            performance: this.performanceStats,
            config: this.config
        };
    }
    
    // Utilitaires
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
    
    debounce(func, delay) {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }
    
    throttle(func, delay) {
        let lastCall = 0;
        return (...args) => {
            const now = performance.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                func.apply(this, args);
            }
        };
    }
    
    // Nettoyage complet
    destroy() {
        console.log('🧹 Destruction ExtremeVirtualGrid...');
        
        // Annuler RAF en cours
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
        
        // Terminer Web Worker
        if (this.searchWorker) {
            this.searchWorker.terminate();
            this.searchWorker = null;
        }
        
        // Nettoyer ResizeObserver
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        
        // Nettoyer event listeners
        this.boundHandlers.forEach((handler, event) => {
            if (event === 'scroll') {
                this.container.removeEventListener('scroll', handler);
            } else if (event === 'visibility') {
                document.removeEventListener('visibilitychange', handler);
            }
        });
        this.boundHandlers.clear();
        
        // Vider tous les caches
        this.domCache.clear();
        this.cacheOrder.length = 0;
        this.elementPool.length = 0;
        
        // Reset arrays
        this.allChannels.length = 0;
        this.filteredChannels.length = 0;
        this.visibleChannels.length = 0;
        
        console.log('✅ ExtremeVirtualGrid détruit');
    }
}