export class VirtualChannelGrid {
    constructor(containerSelector, itemHeight = 180) {
        this.container = document.querySelector(containerSelector);
        this.itemHeight = itemHeight;
        this.visibleStart = 0;
        this.visibleEnd = 0; // CORRECTION: Suppression limitation hardcodée
        this.overscan = 5;
        this.channels = [];
        this.scrollListener = null;
        this.resizeObserver = null;
        this.containerHeight = 0;
        this.totalHeight = 0;
        this.scrollTop = 0;
        this.visibleItemCount = 0;
        
        // Pool d'éléments pour recyclage
        this.recycledElements = new Map();
        this.activeElements = new Map();
        
        // Throttling pour optimiser les performances
        this.isScrolling = false;
        this.scrollTimeout = null;
        
        console.log('🚀 VirtualChannelGrid initialisé');
    }
    
    initializeVirtualization() {
        if (!this.container) {
            console.error('❌ Container non trouvé pour la virtualisation');
            return;
        }
        
        // Créer la structure HTML pour la virtualisation
        this.container.innerHTML = `
            <div class="virtual-scrollable-container">
                <div class="virtual-spacer-top"></div>
                <div class="virtual-viewport"></div>
                <div class="virtual-spacer-bottom"></div>
            </div>
        `;
        
        this.scrollContainer = this.container.querySelector('.virtual-scrollable-container');
        this.spacerTop = this.container.querySelector('.virtual-spacer-top');
        this.viewport = this.container.querySelector('.virtual-viewport');
        this.spacerBottom = this.container.querySelector('.virtual-spacer-bottom');
        
        // Calculer la hauteur initiale du container avec fallback
        this.containerHeight = this.container.clientHeight;
        
        // CORRECTION CRITIQUE : Si hauteur = 0, utiliser la hauteur du viewport
        if (this.containerHeight === 0) {
            // Essayer d'obtenir la hauteur du parent ou utiliser la hauteur du viewport
            const parentHeight = this.container.parentElement?.clientHeight || 0;
            const viewportHeight = window.innerHeight;
            
            // Calculer hauteur dynamique : viewport - header - footer - padding
            this.containerHeight = parentHeight > 0 ? parentHeight : Math.max(400, viewportHeight - 200);
            
            // Forcer la hauteur via CSS si nécessaire
            this.container.style.height = `${this.containerHeight}px`;
            
            console.log(`🔧 Container height corrigée: 0px -> ${this.containerHeight}px`);
        }
        
        this.visibleItemCount = Math.ceil(this.containerHeight / this.itemHeight);
        
        // Debug: afficher les dimensions
        console.log(`📐 Container height: ${this.containerHeight}px`);
        console.log(`📐 Item height: ${this.itemHeight}px`);
        console.log(`📐 Visible items: ${this.visibleItemCount}`);
        
        // Optimiser le scroll avec throttling
        this.scrollListener = this.throttle(this.handleScroll.bind(this), 16); // 60 FPS
        this.scrollContainer.addEventListener('scroll', this.scrollListener, { passive: true });
        
        // Observer les changements de taille
        this.resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                this.containerHeight = entry.contentRect.height;
                this.visibleItemCount = Math.ceil(this.containerHeight / this.itemHeight);
                this.renderVisibleChannels();
            }
        });
        this.resizeObserver.observe(this.container);
        
        console.log('✅ Structure de virtualisation initialisée');
    }
    
    calculateVisibleRange() {
        this.scrollTop = this.scrollContainer.scrollTop;
        
        // Calculer les indices des éléments visibles
        const startIndex = Math.floor(this.scrollTop / this.itemHeight);
        const endIndex = Math.min(
            startIndex + this.visibleItemCount + this.overscan,
            this.channels.length
        );
        
        // Ajouter l'overscan pour une meilleure fluidité
        this.visibleStart = Math.max(0, startIndex - this.overscan);
        this.visibleEnd = endIndex;
        
        // VIRTUALISATION VRAIE : Support catalogues extrêmes (25000+ chaînes)
        // Calculer dynamiquement selon la taille du viewport - AUCUNE limitation artificielle
        const realVisibleCount = this.visibleItemCount + (this.overscan * 2);
        
        // Pour catalogues extrêmes, on limite intelligemment selon la mémoire disponible
        let maxRenderElements = realVisibleCount;
        if (this.channels.length > 10000) {
            // Mode extrême : maximum 100 éléments DOM simultanés pour 10K+ chaînes
            maxRenderElements = Math.min(100, realVisibleCount * 2);
        } else if (this.channels.length > 5000) {
            // Mode performance : maximum 200 éléments DOM pour 5K+ chaînes  
            maxRenderElements = Math.min(200, realVisibleCount * 3);
        }
        
        // Appliquer la limite seulement si nécessaire
        if (this.visibleEnd - this.visibleStart > maxRenderElements) {
            this.visibleEnd = this.visibleStart + maxRenderElements;
            console.log(`⚡ Virtualisation extrême: ${maxRenderElements} éléments DOM pour ${this.channels.length} chaînes`);
        }
        
        // Déboguer les calculs
        console.log(`🔍 Plage visible: ${this.visibleStart}-${this.visibleEnd}/${this.channels.length}`);
    }
    
    renderVisibleChannels() {
        if (!this.channels.length) return;
        
        const startTime = performance.now();
        
        this.calculateVisibleRange();
        
        // Calculer les espaces vides - GRILLE 5 COLONNES
        const columnsPerRow = 5;
        const topRows = Math.floor(this.visibleStart / columnsPerRow);
        const bottomRows = Math.ceil((this.channels.length - this.visibleEnd) / columnsPerRow);
        const topSpace = topRows * this.itemHeight;
        const bottomSpace = bottomRows * this.itemHeight;
        
        // Mettre à jour les espaceurs
        this.spacerTop.style.height = `${topSpace}px`;
        this.spacerBottom.style.height = `${bottomSpace}px`;
        
        // Nettoyer les éléments non visibles
        this.recycleNonVisibleElements();
        
        // Créer les éléments visibles
        const fragment = document.createDocumentFragment();
        
        for (let i = this.visibleStart; i < this.visibleEnd; i++) {
            const channel = this.channels[i];
            if (!channel) continue;
            
            const element = this.getChannelElement(channel, i);
            
            // Position en grille 5 colonnes
            const columnsPerRow = 5;
            const row = Math.floor(i / columnsPerRow);
            const col = i % columnsPerRow;
            const translateY = row * this.itemHeight;
            const translateX = col * (100 / columnsPerRow) + '%';
            
            element.style.transform = `translateY(${translateY}px) translateX(${translateX})`;
            element.style.width = `${100 / columnsPerRow}%`;
            
            fragment.appendChild(element);
        }
        
        this.viewport.appendChild(fragment);
        
        // Mesurer les performances
        const renderTime = performance.now() - startTime;
        console.log(`⚡ Rendu virtuel: ${this.visibleEnd - this.visibleStart} éléments en ${renderTime.toFixed(2)}ms`);
    }
    
    getChannelElement(channel, index) {
        // Vérifier si l'élément est déjà actif
        if (this.activeElements.has(channel.id)) {
            return this.activeElements.get(channel.id);
        }
        
        // Essayer de recycler un élément existant
        let element = this.getRecycledElement();
        
        if (!element) {
            element = this.createChannelElement();
        }
        
        // Configurer l'élément pour ce channel
        this.configureChannelElement(element, channel, index);
        
        // Marquer comme actif
        this.activeElements.set(channel.id, element);
        
        return element;
    }
    
    createChannelElement() {
        const element = document.createElement('div');
        element.className = 'channel-card-virtual';
        element.style.position = 'absolute';
        element.style.width = '100%';
        element.style.height = `${this.itemHeight}px`;
        element.style.contain = 'layout style paint';
        
        // Structure de base réutilisable
        element.innerHTML = `
            <div class="channel-content">
                <div class="channel-logo-container">
                    <img class="channel-logo" loading="lazy" alt="">
                    <div class="channel-logo-fallback" style="display: none;">
                        <span class="emoji-fallback"></span>
                    </div>
                </div>
                <div class="channel-info">
                    <div class="channel-header">
                        <div class="channel-name"></div>
                        <div class="channel-actions">
                            <span class="channel-lock" style="display: none;">
                                <span class="material-icons">lock</span>
                            </span>
                            <button class="btn-icon favorite-btn">
                                <span class="material-icons">favorite_border</span>
                            </button>
                        </div>
                    </div>
                    <div class="channel-category"></div>
                </div>
            </div>
        `;
        
        return element;
    }
    
    configureChannelElement(element, channel, index) {
        // Position absolue pour cet élément
        element.style.top = `${(index - this.visibleStart) * this.itemHeight}px`;
        element.dataset.channelId = channel.id;
        
        // Configurer le contenu
        const logoContainer = element.querySelector('.channel-logo-container');
        const logoImg = element.querySelector('.channel-logo');
        const logoFallback = element.querySelector('.channel-logo-fallback');
        const channelName = element.querySelector('.channel-name');
        const channelCategory = element.querySelector('.channel-category');
        const favoriteBtn = element.querySelector('.favorite-btn');
        const lockIcon = element.querySelector('.channel-lock');
        
        // Nom et catégorie
        channelName.textContent = channel.name;
        channelCategory.textContent = channel.group;
        
        // CORRECTION: Validation préventive du logo
        const validLogoUrl = this.validateLogoUrl ? this.validateLogoUrl(channel.logo) : channel.logo;
        
        if (validLogoUrl) {
            logoImg.src = validLogoUrl;
            logoImg.alt = channel.name;
            logoImg.style.display = 'block';
            logoFallback.style.display = 'none';
            
            // Gestion d'erreur CORS améliorée
            logoImg.onerror = () => {
                console.warn(`🖼️ Logo CORS échoué pour ${channel.name}: ${validLogoUrl}`);
                logoImg.style.display = 'none';
                logoFallback.style.display = 'flex';
                logoFallback.querySelector('.emoji-fallback').textContent = this.getCategoryEmoji(channel.group);
                
                // Marquer comme logo défaillant pour éviter recharge
                logoImg.dataset.errorLogged = 'true';
            };
            
            // Gestion succès logo
            logoImg.onload = () => {
                logoImg.style.display = 'block';
                logoFallback.style.display = 'none';
            };
        } else {
            logoImg.style.display = 'none';
            logoFallback.style.display = 'flex';
            logoFallback.querySelector('.emoji-fallback').textContent = this.getCategoryEmoji(channel.group);
        }
        
        // État des favoris
        const isFavorite = this.isFavoriteChannel(channel.id);
        favoriteBtn.querySelector('.material-icons').textContent = isFavorite ? 'favorite' : 'favorite_border';
        favoriteBtn.dataset.channelId = channel.id;
        
        // Contrôle parental
        const isBlocked = this.isChannelBlocked(channel);
        lockIcon.style.display = isBlocked ? 'inline-flex' : 'none';
        
        // Classes CSS
        element.className = `channel-card-virtual ${this.isActiveChannel(channel.id) ? 'active' : ''} ${isBlocked ? 'blocked' : ''}`;
    }
    
    handleScroll() {
        if (this.isScrolling) return;
        
        this.isScrolling = true;
        
        requestAnimationFrame(() => {
            this.renderVisibleChannels();
            this.isScrolling = false;
        });
        
        // Déboguer les performances de scroll
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => {
            console.log('🏁 Scroll terminé');
        }, 150);
    }
    
    updateChannels(channels) {
        this.channels = channels;
        // Hauteur totale basée sur grille 5 colonnes
        const columnsPerRow = 5;
        const totalRows = Math.ceil(channels.length / columnsPerRow);
        this.totalHeight = totalRows * this.itemHeight;
        
        // Réinitialiser les pools
        this.recycleAllElements();
        
        // Recalculer les plages visibles
        this.visibleStart = 0;
        this.visibleEnd = Math.min(this.visibleItemCount + this.overscan, channels.length);
        
        // Rerender
        this.renderVisibleChannels();
        
        console.log(`📊 Channels mis à jour: ${channels.length} total, ${this.visibleEnd - this.visibleStart} visibles`);
    }
    
    recycleNonVisibleElements() {
        // CORRECTION: Recycler les éléments qui ne sont plus visibles avec vérification robuste
        const elementsToRecycle = [];
        
        for (const [channelId, element] of this.activeElements) {
            const index = this.channels.findIndex(ch => ch.id === channelId);
            
            // Vérifier si l'élément est hors de la plage visible
            if (index === -1 || index < this.visibleStart || index >= this.visibleEnd) {
                elementsToRecycle.push({ channelId, element });
            }
        }
        
        // Recycler les éléments identifiés (évite modification concurrent Map)
        elementsToRecycle.forEach(({ channelId, element }) => {
            this.recycleElement(element);
            this.activeElements.delete(channelId);
        });
        
        // Debug: tracking recyclage
        if (elementsToRecycle.length > 0) {
            console.log(`♻️ Recyclage: ${elementsToRecycle.length} éléments`);
        }
    }
    
    recycleAllElements() {
        // Recycler tous les éléments actifs
        for (const [channelId, element] of this.activeElements) {
            this.recycleElement(element);
        }
        this.activeElements.clear();
        this.viewport.innerHTML = '';
    }
    
    recycleElement(element) {
        // Nettoyer l'élément avant recyclage
        element.remove();
        
        // Remettre dans le pool
        const poolKey = 'channel-element';
        if (!this.recycledElements.has(poolKey)) {
            this.recycledElements.set(poolKey, []);
        }
        this.recycledElements.get(poolKey).push(element);
    }
    
    getRecycledElement() {
        const poolKey = 'channel-element';
        const pool = this.recycledElements.get(poolKey);
        return pool && pool.length > 0 ? pool.pop() : null;
    }
    
    throttle(func, delay) {
        let timeoutId;
        let lastExecTime = 0;
        
        return function(...args) {
            const currentTime = Date.now();
            
            if (currentTime - lastExecTime > delay) {
                func.apply(this, args);
                lastExecTime = currentTime;
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                    lastExecTime = Date.now();
                }, delay - (currentTime - lastExecTime));
            }
        };
    }
    
    // Méthodes utilitaires (à overrider par l'application)
    getCategoryEmoji(category) {
        return '📺'; // Fallback par défaut
    }
    
    isFavoriteChannel(channelId) {
        return false; // À implémenter par l'application
    }
    
    isChannelBlocked(channel) {
        return false; // À implémenter par l'application
    }
    
    isActiveChannel(channelId) {
        return false; // À implémenter par l'application
    }
    
    scrollToChannel(channelId) {
        const index = this.channels.findIndex(ch => ch.id === channelId);
        if (index >= 0) {
            const scrollTop = index * this.itemHeight;
            this.scrollContainer.scrollTop = scrollTop;
        }
    }
    
    getMemoryUsage() {
        return {
            totalChannels: this.channels.length,
            visibleChannels: this.visibleEnd - this.visibleStart,
            recycledElements: Array.from(this.recycledElements.values()).reduce((sum, pool) => sum + pool.length, 0),
            activeElements: this.activeElements.size,
            memoryReduction: Math.round((1 - (this.visibleEnd - this.visibleStart) / this.channels.length) * 100)
        };
    }
    
    destroy() {
        // Nettoyer les event listeners
        if (this.scrollListener) {
            this.scrollContainer.removeEventListener('scroll', this.scrollListener);
            this.scrollListener = null;
        }
        
        // Nettoyer l'observer
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        
        // Nettoyer les pools
        this.recycleAllElements();
        this.recycledElements.clear();
        
        // Nettoyer les timeouts
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
        }
        
        console.log('🧹 VirtualChannelGrid détruit');
    }
}