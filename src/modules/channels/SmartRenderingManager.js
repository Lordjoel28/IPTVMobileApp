/**
 * 🎯 SmartRenderingManager - Rendu intelligent comme IPTV Smarters Pro
 * 
 * OBJECTIF: Afficher les chaînes immédiatement même avec 10K+ chaînes
 * INSPIRATION: IPTV Smarters Pro, TiviMate, Perfect Player
 * 
 * TECHNIQUES:
 * - Virtual Scrolling avec viewport fixe
 * - Rendu par chunks de 50 chaînes
 * - Lazy loading images optimisé
 * - Recyclage des vues DOM
 */

export class SmartRenderingManager {
    constructor(app) {
        this.app = app;
        this.container = null;
        this.allChannels = [];
        this.renderedChannels = [];
        
        // Configuration du virtual scrolling
        this.config = {
            itemHeight: 80,        // Hauteur fixe d'une chaîne
            containerHeight: 600,  // Hauteur du conteneur
            bufferSize: 10,        // Éléments en buffer
            chunkSize: 50,         // Taille des chunks
            maxRendered: 200       // Max chaînes rendues simultanément
        };
        
        // État du scrolling
        this.scrollState = {
            scrollTop: 0,
            firstVisible: 0,
            lastVisible: 0,
            totalHeight: 0
        };
        
        // Pool de vues recyclées
        this.viewPool = [];
        this.activeViews = new Map();
        
        // Cache des logos
        this.logoCache = new Map();
        
        this.isInitialized = false;
        
        console.log('🎯 SmartRenderingManager initialisé');
    }
    
    /**
     * 🚀 Initialisation du système
     */
    init(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('❌ Conteneur non trouvé:', containerId);
            return;
        }
        
        this.setupContainer();
        this.setupScrollListener();
        this.isInitialized = true;
        
        console.log('✅ SmartRenderingManager initialisé pour', containerId);
    }
    
    /**
     * 🏗️ Configuration du conteneur
     */
    setupContainer() {
        // Forcer la hauteur fixe pour le virtual scrolling
        this.container.style.height = this.config.containerHeight + 'px';
        this.container.style.overflowY = 'auto';
        this.container.style.position = 'relative';
        
        // SOLUTION: Conserver les classes existantes et ajouter virtual
        if (!this.container.classList.contains('channels-grid')) {
            this.container.classList.add('channels-grid');
        }
        
        // Créer le conteneur virtuel
        this.virtualContainer = document.createElement('div');
        this.virtualContainer.className = 'virtual-container';
        this.virtualContainer.style.position = 'relative';
        
        // Créer le viewport et adapter selon le mode d'affichage
        this.viewport = document.createElement('div');
        this.viewport.className = 'virtual-viewport';
        this.viewport.style.position = 'absolute';
        this.viewport.style.top = '0';
        this.viewport.style.left = '0';
        this.viewport.style.right = '0';
        
        // Adapter le style selon le mode d'affichage
        this.updateViewportStyle();
        
        this.virtualContainer.appendChild(this.viewport);
        this.container.appendChild(this.virtualContainer);
        
        // Observer les changements de mode d'affichage
        this.setupViewModeObserver();
    }
    
    /**
     * 🎨 Mise à jour du style viewport selon le mode d'affichage
     */
    updateViewportStyle() {
        const isGridView = this.container.classList.contains('grid-view');
        const isListView = this.container.classList.contains('list-view');
        
        if (isGridView) {
            // Mode grille : 5 colonnes
            this.viewport.style.display = 'grid';
            this.viewport.style.gridTemplateColumns = 'repeat(5, 1fr)';
            this.viewport.style.gap = '8px';
            this.viewport.style.padding = '8px';
            
            // Ajuster les cartes pour le mode grille
            this.config.itemHeight = 200;
            console.log('🔲 Mode grille activé pour SmartRenderer');
        } else if (isListView) {
            // Mode liste : 1 colonne avec layout horizontal
            this.viewport.style.display = 'grid';
            this.viewport.style.gridTemplateColumns = '1fr';
            this.viewport.style.gap = '4px';
            this.viewport.style.padding = '8px';
            
            // Ajuster les cartes pour le mode liste
            this.config.itemHeight = 80;
            console.log('📋 Mode liste activé pour SmartRenderer');
        } else {
            // Mode par défaut : grille
            this.viewport.style.display = 'grid';
            this.viewport.style.gridTemplateColumns = 'repeat(5, 1fr)';
            this.viewport.style.gap = '8px';
            this.viewport.style.padding = '8px';
            
            // Ajuster les cartes pour le mode grille
            this.config.itemHeight = 200;
            console.log('🔲 Mode grille par défaut pour SmartRenderer');
        }
        
        // Forcer la re-création des éléments pour appliquer le nouveau style
        this.forceRerender();
    }
    
    /**
     * 👁️ Observer les changements de mode d'affichage
     */
    setupViewModeObserver() {
        // Observer les changements de classe pour détecter grid-view/list-view
        this.viewModeObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    console.log('🔄 Changement de mode d\'affichage détecté');
                    this.updateViewportStyle();
                }
            });
        });
        
        this.viewModeObserver.observe(this.container, {
            attributes: true,
            attributeFilter: ['class']
        });
    }
    
    /**
     * 📜 Gestion du scroll
     */
    setupScrollListener() {
        this.container.addEventListener('scroll', this.throttle(() => {
            this.handleScroll();
        }, 16)); // 60 FPS max
    }
    
    /**
     * 🔄 Gestion du scroll
     */
    handleScroll() {
        this.scrollState.scrollTop = this.container.scrollTop;
        
        // Calculer les indices visibles selon le mode d'affichage
        const isListView = this.container.classList.contains('list-view');
        
        if (isListView) {
            // Mode liste : 1 colonne
            const itemHeight = 80;
            const visibleStart = Math.floor(this.scrollState.scrollTop / itemHeight);
            const visibleEnd = visibleStart + Math.ceil(this.config.containerHeight / itemHeight);
            
            // Ajouter le buffer
            this.scrollState.firstVisible = Math.max(0, visibleStart - this.config.bufferSize);
            this.scrollState.lastVisible = Math.min(this.allChannels.length - 1, visibleEnd + this.config.bufferSize);
        } else {
            // Mode grille : 5 colonnes
            const columnsPerRow = 5;
            const cardHeight = 200;
            const visibleRowStart = Math.floor(this.scrollState.scrollTop / cardHeight);
            const visibleRowEnd = visibleRowStart + Math.ceil(this.config.containerHeight / cardHeight);
            
            // Convertir en indices d'éléments
            const visibleStart = visibleRowStart * columnsPerRow;
            const visibleEnd = (visibleRowEnd * columnsPerRow) - 1;
            
            // Ajouter le buffer
            this.scrollState.firstVisible = Math.max(0, visibleStart - (this.config.bufferSize * columnsPerRow));
            this.scrollState.lastVisible = Math.min(this.allChannels.length - 1, visibleEnd + (this.config.bufferSize * columnsPerRow));
        }
        
        // Mettre à jour le rendu
        this.updateVisibleItems();
    }
    
    /**
     * 🎬 Rendu principal des chaînes
     */
    renderChannels(channels) {
        if (!this.isInitialized) {
            console.error('❌ SmartRenderingManager non initialisé');
            return;
        }
        
        console.log(`🎬 Rendu de ${channels.length} chaînes`);
        
        this.allChannels = channels;
        
        // Calculer la hauteur totale selon le mode d'affichage
        this.calculateTotalHeight();
        
        // Affichage immédiat des premières chaînes
        this.renderInitialChunk();
        
        // Précharger les logos des chaînes visibles
        this.preloadVisibleLogos();
        
        console.log('✅ Rendu initial terminé');
    }
    
    /**
     * 📏 Calcul de la hauteur totale selon le mode d'affichage
     */
    calculateTotalHeight() {
        const isListView = this.container.classList.contains('list-view');
        
        if (isListView) {
            // Mode liste : 1 colonne
            const itemHeight = 80;
            this.scrollState.totalHeight = this.allChannels.length * itemHeight;
        } else {
            // Mode grille : 5 colonnes
            const columnsPerRow = 5;
            const cardHeight = 200;
            const totalRows = Math.ceil(this.allChannels.length / columnsPerRow);
            this.scrollState.totalHeight = totalRows * cardHeight;
        }
        
        // Définir la hauteur totale du conteneur virtuel
        this.virtualContainer.style.height = this.scrollState.totalHeight + 'px';
    }
    
    /**
     * 🔄 Forcer le re-rendu complet
     */
    forceRerender() {
        if (!this.allChannels || this.allChannels.length === 0) {
            return;
        }
        
        // Nettoyer toutes les vues actives
        this.activeViews.forEach(view => {
            view.remove();
        });
        this.activeViews.clear();
        
        // Remettre les vues dans le pool
        this.viewPool = [];
        
        // Recalculer la hauteur totale
        this.calculateTotalHeight();
        
        // Re-rendre les éléments visibles
        this.renderInitialChunk();
        
        console.log('🔄 Re-rendu forcé terminé');
    }
    
    /**
     * 🚀 Rendu initial immédiat
     */
    renderInitialChunk() {
        const initialCount = Math.min(this.config.chunkSize, this.allChannels.length);
        
        this.scrollState.firstVisible = 0;
        this.scrollState.lastVisible = initialCount - 1;
        
        this.updateVisibleItems();
    }
    
    /**
     * 🔄 Mise à jour des éléments visibles
     */
    updateVisibleItems() {
        const visibleChannels = this.allChannels.slice(
            this.scrollState.firstVisible,
            this.scrollState.lastVisible + 1
        );
        
        // Recycler les vues existantes
        this.recycleViews();
        
        // Rendre les nouvelles vues
        visibleChannels.forEach((channel, index) => {
            const globalIndex = this.scrollState.firstVisible + index;
            this.renderChannelItem(channel, globalIndex);
        });
        
        // Mettre à jour la position du viewport selon le mode d'affichage
        this.updateViewportPosition();
    }
    
    /**
     * 📍 Mise à jour de la position du viewport
     */
    updateViewportPosition() {
        const isListView = this.container.classList.contains('list-view');
        
        if (isListView) {
            // Mode liste : position simple
            const itemHeight = 80;
            const translateY = this.scrollState.firstVisible * itemHeight;
            this.viewport.style.transform = `translateY(${translateY}px)`;
        } else {
            // Mode grille : position basée sur les rangées
            const columnsPerRow = 5;
            const cardHeight = 200;
            const firstVisibleRow = Math.floor(this.scrollState.firstVisible / columnsPerRow);
            this.viewport.style.transform = `translateY(${firstVisibleRow * cardHeight}px)`;
        }
    }
    
    /**
     * 🎨 Rendu d'un élément chaîne
     */
    renderChannelItem(channel, index) {
        let channelElement = this.getViewFromPool();
        
        if (!channelElement) {
            channelElement = this.createChannelElement();
        }
        
        this.populateChannelElement(channelElement, channel, index);
        this.viewport.appendChild(channelElement);
        this.activeViews.set(index, channelElement);
    }
    
    /**
     * 🏗️ Création d'un élément chaîne
     */
    createChannelElement() {
        const element = document.createElement('div');
        element.className = 'channel-card smart-rendered';
        
        // Déterminer le mode d'affichage actuel
        const isListView = this.container.classList.contains('list-view');
        
        if (isListView) {
            // Mode liste : layout horizontal
            element.style.display = 'flex';
            element.style.flexDirection = 'row';
            element.style.height = '80px';
            element.style.padding = '8px';
            element.style.borderRadius = '8px';
            element.style.backgroundColor = 'rgba(255,255,255,0.02)';
            element.style.border = '1px solid rgba(255,255,255,0.1)';
            element.style.overflow = 'hidden';
            element.style.cursor = 'pointer';
            element.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
            element.style.position = 'relative';
            element.style.alignItems = 'center';
            element.style.gap = '12px';
            
            // Structure horizontale pour mode liste
            element.innerHTML = `
                <div class="channel-logo-container" style="width: 64px; height: 64px; border-radius: 8px; overflow: hidden; background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02)); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <img class="channel-logo" style="width: 100%; height: 100%; object-fit: contain;" />
                    <div class="logo-placeholder" style="display: none; color: var(--text-muted); font-size: 1.5em;">📺</div>
                </div>
                <div class="channel-info" style="flex: 1; display: flex; flex-direction: column; justify-content: center; min-height: 64px;">
                    <div class="channel-name" style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin: 0; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;"></div>
                    <div class="channel-category" style="font-size: 11px; color: var(--text-muted); background: rgba(0,0,0,0.4); padding: 2px 6px; border-radius: 4px; margin-top: 4px; text-transform: uppercase; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; align-self: flex-start;"></div>
                </div>
                <div class="channel-actions" style="display: flex; gap: 4px; flex-shrink: 0;">
                    <button class="btn-favorite" style="width: 32px; height: 32px; border-radius: 50%; border: none; background: rgba(0,0,0,0.7); color: #FFD700; cursor: pointer; display: flex; align-items: center; justify-content: center;">♡</button>
                    <button class="btn-play" style="width: 32px; height: 32px; border-radius: 50%; border: none; background: var(--primary-color); color: white; cursor: pointer; display: flex; align-items: center; justify-content: center;">▶</button>
                </div>
            `;
        } else {
            // Mode grille : layout vertical (cartes)
            element.style.display = 'flex';
            element.style.flexDirection = 'column';
            element.style.height = '200px';
            element.style.padding = '0';
            element.style.borderRadius = '12px';
            element.style.backgroundColor = 'rgba(255,255,255,0.02)';
            element.style.border = '1px solid rgba(255,255,255,0.1)';
            element.style.overflow = 'hidden';
            element.style.cursor = 'pointer';
            element.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
            element.style.position = 'relative';
            
            // Structure verticale pour mode grille
            element.innerHTML = `
                <div class="channel-content" style="padding: 0; display: flex; flex-direction: column; height: 100%;">
                    <div class="channel-logo-container" style="width: 100%; height: 140px; border-radius: 12px 12px 0 0; overflow: hidden; background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02)); display: flex; align-items: center; justify-content: center;">
                        <img class="channel-logo" style="width: 100%; height: 100%; object-fit: contain;" />
                        <div class="logo-placeholder" style="display: none; color: var(--text-muted); font-size: 2em;">📺</div>
                    </div>
                    <div class="channel-info" style="flex: 1; padding: 8px; display: flex; flex-direction: column; justify-content: space-between; min-height: 60px;">
                        <div class="channel-name" style="font-size: 12px; font-weight: 600; color: var(--text-primary); text-align: center; margin: 0; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;"></div>
                        <div class="channel-category" style="font-size: 9px; color: var(--text-muted); background: rgba(0,0,0,0.4); padding: 2px 6px; border-radius: 8px; text-align: center; margin-top: 4px; text-transform: uppercase; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"></div>
                    </div>
                    <div class="channel-actions" style="position: absolute; top: 8px; right: 8px; display: flex; gap: 4px; opacity: 0; transition: opacity 0.3s;">
                        <button class="btn-favorite" style="width: 28px; height: 28px; border-radius: 50%; border: none; background: rgba(0,0,0,0.7); color: #FFD700; cursor: pointer; display: flex; align-items: center; justify-content: center;">♡</button>
                        <button class="btn-play" style="width: 28px; height: 28px; border-radius: 50%; border: none; background: var(--primary-color); color: white; cursor: pointer; display: flex; align-items: center; justify-content: center;">▶</button>
                    </div>
                </div>
            `;
        }
        
        // Effet hover pour actions en mode grille
        if (!isListView) {
            element.addEventListener('mouseenter', () => {
                const actions = element.querySelector('.channel-actions');
                if (actions) actions.style.opacity = '1';
            });
            element.addEventListener('mouseleave', () => {
                const actions = element.querySelector('.channel-actions');
                if (actions) actions.style.opacity = '0';
            });
        }
        
        return element;
    }
    
    /**
     * 📝 Remplissage des données d'un élément
     */
    populateChannelElement(element, channel, index) {
        // Pas de position absolue nécessaire - CSS Grid s'en occupe
        element.dataset.channelId = channel.id;
        element.dataset.index = index;
        
        // Nom et catégorie
        const nameElement = element.querySelector('.channel-name');
        const categoryElement = element.querySelector('.channel-category');
        
        nameElement.textContent = channel.name;
        categoryElement.textContent = channel.group || 'Général';
        
        // Logo avec lazy loading
        this.loadChannelLogo(element, channel);
        
        // Event listeners
        this.setupChannelListeners(element, channel);
        
        // État favori
        this.updateFavoriteState(element, channel);
    }
    
    /**
     * 🖼️ Chargement intelligent des logos
     */
    loadChannelLogo(element, channel) {
        const img = element.querySelector('.channel-logo');
        const placeholder = element.querySelector('.logo-placeholder');
        const container = element.querySelector('.channel-logo-container');
        
        if (!channel.logo) {
            img.style.display = 'none';
            placeholder.style.display = 'flex';
            return;
        }
        
        // Vérifier le cache
        if (this.logoCache.has(channel.logo)) {
            const cachedLogo = this.logoCache.get(channel.logo);
            if (cachedLogo.loaded) {
                img.src = channel.logo;
                img.style.display = 'block';
                placeholder.style.display = 'none';
                return;
            }
        }
        
        // Afficher le placeholder pendant le chargement
        img.style.display = 'none';
        placeholder.style.display = 'flex';
        container.style.background = 'linear-gradient(90deg, #333 25%, #555 50%, #333 75%)';
        container.style.backgroundSize = '200% 100%';
        container.style.animation = 'loading-shimmer 1.5s infinite';
        
        // Précharger l'image
        this.preloadLogo(channel.logo).then(() => {
            // Succès
            img.src = channel.logo;
            img.style.display = 'block';
            placeholder.style.display = 'none';
            container.style.background = 'var(--bg-tertiary)';
            container.style.animation = 'none';
            
            this.logoCache.set(channel.logo, { loaded: true, error: false });
        }).catch(() => {
            // Erreur
            img.style.display = 'none';
            placeholder.style.display = 'flex';
            placeholder.textContent = '❌';
            container.style.background = 'var(--bg-tertiary)';
            container.style.animation = 'none';
            
            this.logoCache.set(channel.logo, { loaded: false, error: true });
        });
    }
    
    /**
     * 🔄 Préchargement des logos
     */
    preloadLogo(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = reject;
            img.src = url;
            
            // Timeout après 5 secondes
            setTimeout(reject, 5000);
        });
    }
    
    /**
     * 🎯 Préchargement des logos visibles
     */
    preloadVisibleLogos() {
        const visibleChannels = this.allChannels.slice(0, this.config.chunkSize);
        
        visibleChannels.forEach(channel => {
            if (channel.logo && !this.logoCache.has(channel.logo)) {
                this.preloadLogo(channel.logo).then(() => {
                    this.logoCache.set(channel.logo, { loaded: true, error: false });
                }).catch(() => {
                    this.logoCache.set(channel.logo, { loaded: false, error: true });
                });
            }
        });
    }
    
    /**
     * 🔄 Recyclage des vues
     */
    recycleViews() {
        this.activeViews.forEach((view, index) => {
            if (index < this.scrollState.firstVisible || index > this.scrollState.lastVisible) {
                this.returnViewToPool(view);
                this.activeViews.delete(index);
            }
        });
    }
    
    /**
     * 🎱 Gestion du pool de vues
     */
    getViewFromPool() {
        return this.viewPool.pop() || null;
    }
    
    returnViewToPool(view) {
        if (this.viewPool.length < this.config.maxRendered) {
            view.remove();
            this.viewPool.push(view);
        } else {
            view.remove();
        }
    }
    
    /**
     * 🎧 Event listeners pour les chaînes
     */
    setupChannelListeners(element, channel) {
        const playBtn = element.querySelector('.btn-play');
        const favoriteBtn = element.querySelector('.btn-favorite');
        
        // Lecture de chaîne
        playBtn.onclick = (e) => {
            e.stopPropagation();
            this.app.playChannel(channel);
        };
        
        // Favori
        favoriteBtn.onclick = (e) => {
            e.stopPropagation();
            this.app.toggleFavorite(channel);
            this.updateFavoriteState(element, channel);
        };
        
        // Clic sur la carte
        element.onclick = () => {
            this.app.playChannel(channel);
        };
        
        // Hover effect
        element.onmouseenter = () => {
            element.style.backgroundColor = 'var(--hover-color)';
        };
        
        element.onmouseleave = () => {
            element.style.backgroundColor = 'var(--bg-secondary)';
        };
    }
    
    /**
     * ⭐ Mise à jour de l'état favori
     */
    updateFavoriteState(element, channel) {
        const favoriteBtn = element.querySelector('.btn-favorite');
        const isFavorite = this.app.favorites.includes(channel.id);
        
        favoriteBtn.textContent = isFavorite ? '♥' : '♡';
        favoriteBtn.style.color = isFavorite ? 'var(--error-color)' : 'var(--text-muted)';
    }
    
    /**
     * 🔧 Utilitaires
     */
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    /**
     * 🧹 Nettoyage
     */
    cleanup() {
        this.activeViews.clear();
        this.viewPool = [];
        this.logoCache.clear();
        
        // Nettoyer l'observer
        if (this.viewModeObserver) {
            this.viewModeObserver.disconnect();
            this.viewModeObserver = null;
        }
        
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        console.log('🧹 SmartRenderingManager nettoyé');
    }
    
    /**
     * 📊 Statistiques
     */
    getStats() {
        return {
            totalChannels: this.allChannels.length,
            renderedViews: this.activeViews.size,
            poolSize: this.viewPool.length,
            cacheSize: this.logoCache.size,
            visibleRange: `${this.scrollState.firstVisible}-${this.scrollState.lastVisible}`,
            scrollPosition: this.scrollState.scrollTop
        };
    }
}