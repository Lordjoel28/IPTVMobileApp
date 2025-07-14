import { VirtualChannelGrid } from '../ui/VirtualChannelGrid.js';
import { ExtremeVirtualGrid } from '../ui/ExtremeVirtualGrid.js';
import { PerformanceOptimizer } from '../performance/PerformanceOptimizer.js';
import { CacheManager } from '../cache/CacheManager.js';
import { SmartRenderingManager } from './SmartRenderingManager.js';

export class ChannelManager {
    constructor(app) {
        this.app = app;
        this.channelClickHandler = null; // Pour stocker le gestionnaire d'événements
        this.virtualGrid = null; // Instance de grille virtuelle normale
        this.extremeVirtualGrid = null; // Instance de grille virtuelle extrême
        this.smartRenderer = new SmartRenderingManager(app); // Rendu intelligent type IPTV Smarters
        this.useVirtualization = true; // Flag pour activer/désactiver la virtualisation
        this.useExtremeVirtualization = true; // CORRECTION: Activer virtualisation extrême par défaut
        this.performanceThreshold = 1000; // Seuil pour activer la virtualisation normale
        this.extremeThreshold = 15000; // CORRECTION: Seuil augmenté pour éviter mode extrême sur 10K chaînes
        this.currentVirtualizationMode = 'none'; // none, normal, extreme
        
        // Cache pour les performances
        this.cacheManager = new CacheManager({
            l1MaxSize: 100,
            l2MaxSize: 50,
            l3MaxSize: 200,
            ttl: {
                channels: 4 * 60 * 60 * 1000, // 4h
                logos: 7 * 24 * 60 * 60 * 1000, // 7j
                search: 30 * 60 * 1000, // 30min
                metadata: 60 * 60 * 1000 // 1h
            },
            compressionEnabled: true,
            preloadEnabled: true,
            preloadBatchSize: 500
        });
        
        console.log('📺 ChannelManager initialisé avec support extrême et cache');
        
        // Emojis de fallback par catégorie
        this.categoryEmojis = {
            'sport': '⚽',
            'sports': '⚽',
            'football': '⚽',
            'news': '📰',
            'info': '📰',
            'actualité': '📰',
            'actualites': '📰',
            'movie': '🎬',
            'movies': '🎬',
            'cinema': '🎬',
            'film': '🎬',
            'films': '🎬',
            'music': '🎵',
            'musique': '🎵',
            'kids': '👶',
            'enfants': '👶',
            'jeunesse': '👶',
            'cartoon': '🎨',
            'dessins': '🎨',
            'documentary': '📚',
            'documentaire': '📚',
            'culture': '🎭',
            'religion': '⛪',
            'religieux': '⛪',
            'adult': '🔞',
            'adulte': '🔞',
            'entertainment': '🎪',
            'divertissement': '🎪',
            'variety': '🎪',
            'variete': '🎪',
            'cooking': '👨‍🍳',
            'cuisine': '👨‍🍳',
            'lifestyle': '🏠',
            'shopping': '🛒',
            'business': '💼',
            'default': '📺'
        };
    }

    async renderChannels() {
        const container = document.getElementById('channelsGrid');
        if (!container) return;
        
        const filteredChannels = this.app.search.getFilteredChannels();
        
        if (filteredChannels.length === 0) {
            container.innerHTML = `
                <div class="no-channels">
                    <p>Aucune chaîne trouvée</p>
                    ${this.app.channels.length === 0 ? '<p>Ajoutez une playlist pour commencer</p>' : ''}
                </div>
            `;
            return;
        }
        
        // Précharger les données des chaînes visibles
        if (this.cacheManager.options.preloadEnabled) {
            this.cacheManager.preloadChannelData(filteredChannels.slice(0, 50));
        }
        
        // Décider du mode de virtualisation selon la taille
        this.selectVirtualizationMode(filteredChannels.length);
        
        // NOUVEAU: Utiliser le SmartRenderer pour 1000+ chaînes
        if (filteredChannels.length >= 1000) {
            this.renderChannelsSmart(filteredChannels);
        } else if (this.currentVirtualizationMode === 'extreme') {
            this.renderChannelsExtremeVirtual(filteredChannels);
        } else if (this.currentVirtualizationMode === 'normal') {
            this.renderChannelsVirtualized(filteredChannels);
        } else {
            this.renderChannelsTraditional(filteredChannels);
        }
        
        // Activer le lazy loading hybride après le rendu
        if (this.app.hybridLazyManager && this.app.hybridLazyManager.isEnabled) {
            setTimeout(() => {
                this.app.hybridLazyManager.activate('channelsGrid', filteredChannels);
            }, 100);
        }
    }
    
    renderChannelsVirtualized(channels) {
        const container = document.getElementById('channelsGrid');
        
        // Initialiser la grille virtuelle si nécessaire
        if (!this.virtualGrid) {
            // Ajouter les classes CSS pour la virtualisation
            container.className = 'virtual-channel-grid';
            
            this.virtualGrid = new VirtualChannelGrid('#channelsGrid', 180);
            
            // Configurer les callbacks
            this.virtualGrid.getCategoryEmoji = (category) => this.getCategoryEmoji(category);
            this.virtualGrid.isFavoriteChannel = (channelId) => this.app.favorites.includes(channelId);
            this.virtualGrid.isChannelBlocked = (channel) => !this.app.parental.isChannelAccessible(channel);
            this.virtualGrid.isActiveChannel = (channelId) => this.app.currentChannel && this.app.currentChannel.id === channelId;
            this.virtualGrid.validateLogoUrl = (url) => this.getLogoUrl(url);
            
            this.virtualGrid.initializeVirtualization();
            
            // Attacher les event listeners virtuels
            this.attachVirtualListeners();
        }
        
        // Mettre à jour les chaînes
        this.virtualGrid.updateChannels(channels);
        
        // Mesurer les performances
        const memoryUsage = this.virtualGrid.getMemoryUsage();
        console.log(`🚀 Virtualisation active: ${memoryUsage.memoryReduction}% de réduction mémoire`);
    }
    
    selectVirtualizationMode(channelCount) {
        const prevMode = this.currentVirtualizationMode;
        
        if (this.useExtremeVirtualization && channelCount >= this.extremeThreshold) {
            this.currentVirtualizationMode = 'extreme';
            console.log(`🚀 Mode EXTRÊME activé pour ${channelCount} chaînes`);
        } else if (this.useVirtualization && channelCount >= this.performanceThreshold) {
            this.currentVirtualizationMode = 'normal';
            console.log(`⚡ Mode NORMAL activé pour ${channelCount} chaînes`);
        } else {
            this.currentVirtualizationMode = 'none';
            console.log(`📺 Mode TRADITIONNEL pour ${channelCount} chaînes`);
        }
        
        // Si changement de mode, nettoyer les grilles précédentes
        if (prevMode !== this.currentVirtualizationMode) {
            this.cleanupVirtualGrids();
        }
    }
    
    renderChannelsExtremeVirtual(channels) {
        const container = document.getElementById('channelsGrid');
        
        console.log(`🚀 RENDU EXTRÊME: ${channels.length} chaînes`);
        
        // ALERTE pour catalogues extrêmes
        if (channels.length > 25000) {
            console.warn(`⚠️ CATALOGUE EXTRÊME DÉTECTÉ: ${channels.length} chaînes!`);
            console.warn('💡 Performance: Max 50 éléments DOM simultanés');
        }
        
        // Initialiser la grille extrême si nécessaire
        if (!this.extremeVirtualGrid) {
            // CORRECTION: Conserver les classes originales pour le grid layout
            container.className = 'channels-grid grid-view extreme-virtual-grid';
            
            // CORRECTION : Calculer maxRender dynamiquement selon la taille du viewport
            const containerHeight = container.clientHeight || Math.max(400, window.innerHeight - 200);
            const itemHeight = 180;
            const visibleItems = Math.ceil(containerHeight / itemHeight);
            const dynamicMaxRender = Math.max(
                visibleItems + 10,  // Items visibles + buffer
                Math.min(1000, Math.ceil(channels.length * 0.05)) // CORRECTION: 5% du total, plafonné à 1000 (era 500)
            );
            
            this.extremeVirtualGrid = new ExtremeVirtualGrid('#channelsGrid', {
                itemHeight: itemHeight,
                maxRender: dynamicMaxRender,    // LIMITE DYNAMIQUE au lieu de 50 fixe
                overscan: 5,
                chunkSize: 1000,    // Pagination par chunks de 1000
                cacheSize: 500,     // Cache LRU agressif
                debounceMs: 16,     // 60 FPS target
                searchWorker: true  // Web Worker pour recherche
            });
            
            console.log(`🚀 ExtremeVirtualGrid: ${dynamicMaxRender} éléments max (${visibleItems} visibles)`);
            
            // Callbacks optimisés pour extreme scale
            this.extremeVirtualGrid.onChannelClick = (channel) => {
                console.log('🖱️ Clic canal extrême:', channel.name);
                this.app.playChannel(channel.id);
            };
            
            this.extremeVirtualGrid.onFavoriteClick = (channel) => {
                console.log('⭐ Favori extrême:', channel.name);
                this.toggleFavorite(channel.id);
            };
            
            this.extremeVirtualGrid.isFavoriteChannel = (channelId) => {
                return this.app.favorites.includes(channelId);
            };
            
            this.extremeVirtualGrid.onSearchComplete = (results, query) => {
                console.log(`🔍 Recherche extrême terminée: ${results.length} résultats pour "${query}"`);
            };
            
            // Callbacks pour validation logo et emoji
            this.extremeVirtualGrid.getCategoryEmoji = (category) => this.getCategoryEmoji(category);
            this.extremeVirtualGrid.validateLogoUrl = (url) => this.getLogoUrl(url);
            
            console.log('✅ ExtremeVirtualGrid initialisée');
        }
        
        // Mise à jour avec monitoring performance
        const startTime = performance.now();
        this.extremeVirtualGrid.updateChannels(channels);
        const updateTime = performance.now() - startTime;
        
        console.log(`⚡ Mise à jour extrême: ${updateTime.toFixed(2)}ms`);
        
        // Monitoring mémoire pour scale extrême
        this.monitorExtremePerformance();
    }
    
    renderChannelsTraditional(channels) {
        const container = document.getElementById('channelsGrid');
        
        // Restaurer les classes CSS traditionnelles
        container.className = 'channels-grid';
        
        // Détruire les grilles virtuelles si elles existent
        this.cleanupVirtualGrids();
        
        container.innerHTML = channels.map(channel => {
            const isFavorite = this.app.favorites.includes(channel.id);
            const isActive = this.app.currentChannel && this.app.currentChannel.id === channel.id;
            const isBlocked = !this.app.parental.isChannelAccessible(channel);
            const fallbackEmoji = this.getCategoryEmoji(channel.group);
            
            // Appliquer le surlignage des termes de recherche
            const highlightedName = this.app.search.highlightSearchTerms(channel.name, this.app.search.searchQuery);
            const highlightedGroup = this.app.search.highlightSearchTerms(channel.group, this.app.search.searchQuery);
            
            // Validation préventive du logo
            const validLogoUrl = this.getLogoUrl(channel.logo);
            
            return `
                <div class="channel-card search-result-appear ${isActive ? 'active' : ''} ${isBlocked ? 'blocked' : ''}" data-channel-id="${channel.id}">
                    <div class="channel-content">
                        ${validLogoUrl ? `
                            <div class="channel-logo-container" data-logo-url="${this.app.escapeHtml(validLogoUrl)}">
                                <img class="channel-logo" 
                                     src="${this.app.escapeHtml(validLogoUrl)}" 
                                     alt="${this.app.escapeHtml(channel.name)}" 
                                     onerror="window.handleLogoError('${fallbackEmoji}', '${this.app.escapeHtml(channel.name)}').call(this)"
                                     onload="this.parentNode.classList.remove('loading')"
                                     loading="lazy">
                            </div>
                        ` : `
                            <div class="channel-logo-placeholder">
                                <span class="emoji-fallback">${fallbackEmoji}</span>
                            </div>
                        `}
                        <div class="channel-info">
                            <div class="channel-header">
                                <div class="channel-name">${highlightedName}</div>
                                <div class="channel-actions">
                                    ${isBlocked ? `
                                        <span class="channel-lock" title="Chaîne bloquée par le contrôle parental">
                                            <span class="material-icons">lock</span>
                                        </span>
                                    ` : ''}
                                    <button class="btn-icon favorite-btn" data-channel-id="${channel.id}">
                                        <span class="material-icons">${isFavorite ? 'favorite' : 'favorite_border'}</span>
                                    </button>
                                </div>
                            </div>
                            <div class="channel-category">${highlightedGroup}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // S'assurer que les listeners sont toujours attachés
        // La délégation d'événements fonctionne même avec du nouveau contenu
        this.attachChannelListeners();
        this.initializeLogoErrorHandling();
    }
    
    attachVirtualListeners() {
        const container = document.getElementById('channelsGrid');
        
        // Supprimer les anciens listeners s'ils existent
        if (this.channelClickHandler) {
            container.removeEventListener('click', this.channelClickHandler);
        }
        
        // Créer le gestionnaire pour les éléments virtuels
        this.channelClickHandler = (e) => {
            // Gestion des boutons favoris
            const favoriteBtn = e.target.closest('.favorite-btn');
            if (favoriteBtn) {
                e.stopPropagation();
                const channelId = favoriteBtn.dataset.channelId;
                console.log('⭐ Clic sur favori virtuel, ID:', channelId);
                if (channelId) {
                    this.toggleFavorite(channelId);
                }
                return;
            }
            
            // Gestion des cartes de chaînes virtuelles
            const channelCard = e.target.closest('.channel-card-virtual');
            if (channelCard) {
                const channelId = channelCard.dataset.channelId;
                console.log('🖱️ Clic sur chaîne virtuelle, ID:', channelId);
                if (channelId) {
                    console.log('📺 Tentative de lecture de la chaîne virtuelle:', channelId);
                    this.app.playChannel(channelId);
                } else {
                    console.warn('⚠️ Aucun ID de chaîne trouvé (virtuel)');
                }
            }
        };
        
        // Attacher le gestionnaire au conteneur parent
        container.addEventListener('click', this.channelClickHandler);
        console.log('✅ Event listeners virtuels attachés');
    }
    
    /**
     * 🎯 Rendu intelligent type IPTV Smarters Pro
     */
    renderChannelsSmart(channels) {
        console.log(`🎯 Rendu intelligent de ${channels.length} chaînes`);
        
        const container = document.getElementById('channelsGrid');
        if (!container) return;
        
        // Nettoyer les grilles virtuelles existantes
        this.cleanupVirtualGrids();
        
        // Initialiser le SmartRenderer
        this.smartRenderer.init('channelsGrid');
        
        // Rendre les chaînes
        this.smartRenderer.renderChannels(channels);
        
        // Marquer comme mode smart
        this.currentVirtualizationMode = 'smart';
        
        console.log('✅ Rendu intelligent terminé');
    }
    
    attachChannelListeners() {
        // Utiliser la délégation d'événements sur le conteneur parent
        const channelsGrid = document.getElementById('channelsGrid');
        
        // Supprimer les anciens listeners s'ils existent
        if (this.channelClickHandler) {
            channelsGrid.removeEventListener('click', this.channelClickHandler);
        }
        
        // Créer le gestionnaire principal avec délégation
        this.channelClickHandler = (e) => {
            // Gestion des boutons favoris
            const favoriteBtn = e.target.closest('.favorite-btn');
            if (favoriteBtn) {
                e.stopPropagation();
                const channelId = favoriteBtn.dataset.channelId;
                console.log('⭐ Clic sur favori, ID:', channelId);
                if (channelId) {
                    this.toggleFavorite(channelId);
                }
                return;
            }
            
            // Gestion des cartes de chaînes
            const channelCard = e.target.closest('.channel-card');
            if (channelCard) {
                const channelId = channelCard.dataset.channelId;
                console.log('🖱️ Clic sur chaîne, ID:', channelId);
                if (channelId) {
                    console.log('📺 Tentative de lecture de la chaîne:', channelId);
                    this.app.playChannel(channelId);
                } else {
                    console.warn('⚠️ Aucun ID de chaîne trouvé');
                }
            }
        };
        
        // Attacher le gestionnaire au conteneur parent
        channelsGrid.addEventListener('click', this.channelClickHandler);
        console.log('✅ Event listeners attachés via délégation');
    }
    
    updateFixedCategoriesCount() {
        // Update "Toutes les chaînes" count
        const allButton = document.querySelector('[data-category="all"]');
        if (allButton) {
            const count = this.app.search.getCategoryChannelCount('all');
            this.updateCategoryButton(allButton, 'tv', 'Toutes les chaînes', count);
        }
        
        // Update "Favoris" count
        const favButton = document.querySelector('[data-category="favorites"]');
        if (favButton) {
            const count = this.app.search.getCategoryChannelCount('favorites');
            this.updateCategoryButton(favButton, 'favorite', 'Favoris', count);
        }
        
        // Update "Récemment regardées" count
        const recentButton = document.querySelector('[data-category="recent"]');
        if (recentButton) {
            const count = this.app.search.getCategoryChannelCount('recent');
            this.updateCategoryButton(recentButton, 'history', 'Récemment regardées', count);
        }
    }
    
    updateCategories() {
        const categoryList = document.getElementById('categoryList');
        if (!categoryList) return;
        
        // Update fixed categories counts
        this.updateFixedCategoriesCount();
        
        // Get unique groups
        let groups = [...new Set(this.app.channels.map(channel => channel.group))].sort();
        
        // Filter blocked categories if parental control is enabled and hiding is active
        if (this.app.parentalControl.enabled && this.app.parentalControl.hideBlockedChannels) {
            groups = groups.filter(group => !this.app.parentalControl.blockedCategories.includes(group));
        }
        
        // Clear existing custom categories
        const existingCustom = categoryList.querySelectorAll('.nav-item[data-category]:not([data-category="all"]):not([data-category="favorites"]):not([data-category="recent"])');
        existingCustom.forEach(item => item.remove());
        
        // Add group categories
        groups.forEach(group => {
            const button = document.createElement('button');
            const isBlocked = this.app.parentalControl.blockedCategories.includes(group);
            const channelCount = this.app.search.getCategoryChannelCount(group);
            const displayCount = this.formatChannelCount(channelCount);
            
            // Affichage complet du nom sans troncature
            const displayName = group;
            
            button.className = `nav-item ${isBlocked ? 'blocked-category' : ''}`;
            button.dataset.category = group;
            button.innerHTML = `
                <span class="category-name">${this.app.escapeHtml(displayName)}</span>
                <span class="category-count" ${channelCount > 999 ? 'data-large' : ''} data-count="${channelCount}" title="${channelCount} chaînes">${displayCount}</span>
                ${isBlocked ? '<span class="material-icons category-lock" title="Catégorie bloquée">lock</span>' : ''}
            `;
            button.addEventListener('click', () => this.app.search.setActiveCategory(group));
            categoryList.appendChild(button);
        });
    }
    
    updateCategoryButton(button, icon, name, count) {
        const displayCount = this.formatChannelCount(count);
        const currentCountEl = button.querySelector('.category-count');
        const currentCount = currentCountEl ? currentCountEl.textContent : '';
        
        // Ajouter tooltip pour noms longs
        const shouldTruncate = name.length > 20;
        const displayName = shouldTruncate ? name.substring(0, 18) + '...' : name;
        
        button.innerHTML = `
            <span class="material-icons">${icon}</span>
            <span class="category-name" ${shouldTruncate ? `title="${this.app.escapeHtml(name)}"` : ''}>${this.app.escapeHtml(displayName)}</span>
            <span class="category-count" ${count > 999 ? 'data-large' : ''} data-count="${count}" title="${count} chaînes">${displayCount}</span>
        `;
        
        // Animation de mise à jour si le nombre a changé
        if (currentCount !== displayCount && currentCount !== '') {
            const newCountEl = button.querySelector('.category-count');
            if (newCountEl) {
                newCountEl.classList.add('updated');
                setTimeout(() => newCountEl.classList.remove('updated'), 400);
            }
        }
    }
    
    formatChannelCount(count) {
        if (count >= 1000000) {
            return (count / 1000000).toFixed(1).replace('.0', '') + 'M';
        } else if (count >= 10000) {
            return (count / 1000).toFixed(0) + 'k';
        } else if (count >= 1000) {
            return (count / 1000).toFixed(1).replace('.0', '') + 'k';
        }
        return count.toString();
    }
    
    addToRecent(channelId) {
        this.app.recentChannels = this.app.recentChannels.filter(id => id !== channelId);
        this.app.recentChannels.unshift(channelId);
        this.app.recentChannels = this.app.recentChannels.slice(0, 50);
        
        localStorage.setItem('iptv_recent', JSON.stringify(this.app.recentChannels));
        this.updateFixedCategoriesCount();
    }
    
    toggleFavorite(channelId) {
        const index = this.app.favorites.indexOf(channelId);
        
        if (index > -1) {
            this.app.favorites.splice(index, 1);
            this.app.notifications.showNotification('Retiré des favoris', 'info');
        } else {
            this.app.favorites.push(channelId);
            this.app.notifications.showNotification('Ajouté aux favoris', 'success');
        }
        
        this.app.saveUserFavorites();
        this.updateFixedCategoriesCount();
        
        // **CORRECTION GEMINI : Mise à jour ciblée du DOM au lieu de tout redessiner**
        // Ancien code : this.renderChannels();
        const favoriteButtons = document.querySelectorAll(`.favorite-btn[data-channel-id="${channelId}"]`);
        favoriteButtons.forEach(button => {
            const icon = button.querySelector('.material-icons');
            if (icon) {
                icon.textContent = index > -1 ? 'favorite_border' : 'favorite';
                icon.style.color = index > -1 ? 'var(--text-muted)' : 'var(--error-color)';
            }
        });
    }
    
    /**
     * Récupère l'emoji approprié pour une catégorie
     */
    getCategoryEmoji(category) {
        if (!category) return this.categoryEmojis.default;
        
        const categoryLower = category.toLowerCase();
        
        // Recherche exacte d'abord
        if (this.categoryEmojis[categoryLower]) {
            return this.categoryEmojis[categoryLower];
        }
        
        // Recherche par mots-clés
        for (const [key, emoji] of Object.entries(this.categoryEmojis)) {
            if (categoryLower.includes(key) || key.includes(categoryLower)) {
                return emoji;
            }
        }
        
        return this.categoryEmojis.default;
    }
    
    /**
     * Initialise la gestion d'erreur des logos
     */
    initializeLogoErrorHandling() {
        // Fonction globale pour gérer les erreurs de logo
        window.handleLogoError = (emoji, channelName) => {
            return function() {
                console.warn(`🖼️ Erreur de chargement du logo pour: ${channelName}`);
                
                // Ajouter la classe d'erreur
                this.classList.add('logo-error');
                this.style.display = 'none';
                
                // Remplacer par le fallback emoji
                const container = this.parentNode;
                if (container) {
                    container.innerHTML = `
                        <div class="channel-logo-fallback">
                            <span class="emoji-fallback">${emoji}</span>
                        </div>
                    `;
                    
                    // Ajouter une indication visuelle temporaire
                    container.classList.add('logo-error-occurred');
                    setTimeout(() => {
                        container.classList.remove('logo-error-occurred');
                    }, 2000);
                }
            };
        };
        
        // Ajouter les états de chargement
        document.querySelectorAll('.channel-logo-container').forEach(container => {
            if (!container.classList.contains('loading')) {
                container.classList.add('loading');
            }
        });
    }
    
    /**
     * Retry le chargement d'un logo défaillant
     */
    retryLogoLoad(container, originalUrl, maxRetries = 2) {
        const retryCount = parseInt(container.dataset.retryCount || '0');
        
        if (retryCount < maxRetries) {
            console.log(`🔄 Retry ${retryCount + 1}/${maxRetries} pour: ${originalUrl}`);
            
            const img = container.querySelector('.channel-logo');
            if (img) {
                container.dataset.retryCount = (retryCount + 1).toString();
                
                // Petit délai avant retry
                setTimeout(() => {
                    img.src = originalUrl + '?retry=' + Date.now();
                }, 1000 * (retryCount + 1));
            }
        }
    }
    
    /**
     * Valide et nettoie une URL de logo AVANT de l'utiliser
     * Retourne l'URL valide ou null si invalide (pour fallback immédiat)
     */
    getLogoUrl(url) {
        if (!url || typeof url !== 'string') return null;
        
        // Nettoyage basique
        url = url.trim();
        if (!url) return null;
        
        // Validation d'URL
        try {
            const urlObj = new URL(url);
            
            // Vérifier le protocol
            if (!['http:', 'https:', 'data:'].includes(urlObj.protocol)) {
                return null;
            }
            
            // Blacklist de domaines connus pour être problématiques
            const blacklistedDomains = [
                'lo1.in',
                '127.0.0.1',
                'localhost',
                'example.com',
                'test.com',
                'invalid.domain'
            ];
            
            const hostname = urlObj.hostname.toLowerCase();
            if (blacklistedDomains.some(domain => hostname.includes(domain))) {
                console.warn('🚫 Domaine blacklisté détecté:', hostname);
                return null;
            }
            
            // Heuristiques pour détecter les domaines suspects
            const suspiciousDomains = [
                // Domaines très courts (moins de 4 caractères)
                /^[a-z]{1,3}\.[a-z]{2,3}$/,
                // Domaines avec des caractères non standards
                /[0-9]{1,3}\.[a-z]{2,3}$/,
                // Domaines avec des extensions suspectes
                /\.(tk|ml|ga|cf)$/
            ];
            
            if (suspiciousDomains.some(pattern => pattern.test(hostname))) {
                console.warn('🚨 Domaine suspect détecté:', hostname);
                return null;
            }
            
            // Vérifier les extensions d'image courantes
            const path = urlObj.pathname.toLowerCase();
            const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'];
            const hasValidExtension = validExtensions.some(ext => path.endsWith(ext));
            
            // Accepter les URLs sans extension (certaines APIs retournent des URLs dynamiques)
            if (!hasValidExtension && path.includes('.') && !path.includes('?')) {
                return null;
            }
            
            // Forcer HTTPS pour éviter mixed content
            if (urlObj.protocol === 'http:') {
                urlObj.protocol = 'https:';
            }
            
            return urlObj.toString();
            
        } catch (e) {
            console.warn('🖼️ URL de logo invalide:', url);
            return null;
        }
    }
    
    improveLogoUrl(url) {
        if (!url) return url;
        
        // Corrections communes pour les URLs de logos
        const improvements = [
            // HTTPS forcé pour éviter les problèmes de mixed content
            [/^http:\/\//, 'https://'],
            // Correction des URLs avec double slash
            [/([^:]\/)\/+/g, '$1'],
            // Ajout de paramètres pour éviter le cache en cas d'erreur
            [/$/, '?v=' + Date.now()]
        ];
        
        let improved = url;
        improvements.forEach(([pattern, replacement]) => {
            improved = improved.replace(pattern, replacement);
        });
        
        return improved;
    }
    
    cleanupVirtualGrids() {
        // Nettoyer grille virtuelle normale
        if (this.virtualGrid) {
            this.virtualGrid.destroy();
            this.virtualGrid = null;
            console.log('🧹 Grille virtuelle normale nettoyée');
        }
        
        // Nettoyer grille virtuelle extrême
        if (this.extremeVirtualGrid) {
            this.extremeVirtualGrid.destroy();
            this.extremeVirtualGrid = null;
            console.log('🧹 Grille virtuelle extrême nettoyée');
        }
    }
    
    monitorExtremePerformance() {
        if (!this.extremeVirtualGrid) return;
        
        // Obtenir diagnostics détaillés
        const diagnostics = this.extremeVirtualGrid.getDiagnostics();
        
        console.log('📊 DIAGNOSTICS EXTRÊME:');
        console.log(`  📺 Chaînes: ${diagnostics.totalChannels} total, ${diagnostics.visibleChannels} visibles`);
        console.log(`  🔧 DOM: ${diagnostics.domElements} éléments (max: 50)`);
        console.log(`  💾 Cache: ${diagnostics.cacheSize} éléments`);
        console.log(`  🏊 Pool: ${diagnostics.poolSize} éléments disponibles`);
        
        // Validation CRITIQUE: jamais plus de 50 DOM elements
        if (diagnostics.domElements > 50) {
            console.error(`🚨 VIOLATION CRITIQUE: ${diagnostics.domElements} DOM elements > 50!`);
        }
        
        // Monitoring mémoire
        if (performance.memory) {
            const memMB = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1);
            console.log(`  🧠 Mémoire: ${memMB}MB`);
            
            if (parseFloat(memMB) > 500) {
                console.warn(`⚠️ Mémoire élevée détectée: ${memMB}MB`);
            }
        }
        
        return diagnostics;
    }
    
    /**
     * Recherche avec Web Worker pour scale extrême
     */
    searchChannelsExtreme(query) {
        if (this.extremeVirtualGrid && this.currentVirtualizationMode === 'extreme') {
            console.log(`🔍 Recherche extrême: "${query}"`);
            this.extremeVirtualGrid.search(query);
            return true;
        }
        return false;
    }
    
    /**
     * Filtrage par catégorie avec Web Worker
     */
    filterByCategoryExtreme(category) {
        if (this.extremeVirtualGrid && this.currentVirtualizationMode === 'extreme') {
            console.log(`📂 Filtrage extrême par catégorie: "${category}"`);
            this.extremeVirtualGrid.searchByCategory(category);
            return true;
        }
        return false;
    }
    
    /**
     * Méthodes utilitaires pour le cache
     */
    
    /**
     * Obtenir les métriques du cache
     */
    getCacheMetrics() {
        return this.cacheManager.getMetrics();
    }
    
    /**
     * Afficher les métriques du cache dans la console
     */
    logCacheMetrics() {
        const metrics = this.getCacheMetrics();
        console.log('📊 MÉTRIQUES CACHE CHANNELS:');
        console.log(`  Hit Rate: ${metrics.hitRate}%`);
        console.log(`  L1 Hits: ${metrics.hits.l1} (${metrics.l1HitRate}%)`);
        console.log(`  L2 Hits: ${metrics.hits.l2} (${metrics.l2HitRate}%)`);
        console.log(`  L3 Hits: ${metrics.hits.l3} (${metrics.l3HitRate}%)`);
        console.log(`  Cache Miss: ${metrics.misses}`);
        console.log(`  Average Response: ${metrics.averageResponseTime.toFixed(2)}ms`);
        console.log(`  Memory Usage: L1=${(metrics.memoryUsage.l1/1024/1024).toFixed(2)}MB`);
    }
    
    /**
     * Nettoyer le cache
     */
    async clearCache() {
        await this.cacheManager.clear();
        console.log('🗑️ Cache ChannelManager vidé');
    }
    
    /**
     * Précharger les logos pour les chaînes visibles
     */
    async preloadLogos(channels) {
        console.log(`🔄 Préchargement de ${channels.length} logos...`);
        
        for (const channel of channels.slice(0, 20)) { // Limiter à 20 pour éviter la surcharge
            if (channel.logo) {
                const validUrl = this.getLogoUrl(channel.logo);
                if (validUrl) {
                    // Simuler le préchargement (en production, faire une vraie requête)
                    await this.cacheManager.cacheLogo(validUrl, { 
                        preloaded: true, 
                        timestamp: Date.now() 
                    });
                }
            }
        }
        
        console.log('✅ Préchargement logos terminé');
    }
    
    /**
     * Optimiser les performances de rendu
     */
    async optimizeRendering() {
        const metrics = this.getCacheMetrics();
        
        // Si le taux de hit est faible, précharger plus de données
        if (parseFloat(metrics.hitRate) < 60) {
            console.log('⚡ Optimisation: Préchargement intensif activé');
            this.cacheManager.options.preloadBatchSize = 2000;
            this.cacheManager.options.preloadDelay = 50;
        }
        
        // Si la mémoire est élevée, réduire le cache L1
        if (metrics.memoryUsage.l1 > 40 * 1024 * 1024) { // 40MB
            console.log('🧠 Optimisation: Réduction cache L1');
            this.cacheManager.options.l1MaxSize = 50;
        }
        
        return metrics;
    }
    
    /**
     * Nettoie les event listeners lors de la destruction du composant
     */
    cleanup() {
        const channelsGrid = document.getElementById('channelsGrid');
        if (channelsGrid && this.channelClickHandler) {
            channelsGrid.removeEventListener('click', this.channelClickHandler);
            this.channelClickHandler = null;
            console.log('🧹 Event listeners nettoyés');
        }
        
        // Nettoyer toutes les grilles virtuelles
        this.cleanupVirtualGrids();
        
        // Nettoyer le cache
        if (this.cacheManager) {
            this.cacheManager.destroy();
            console.log('💥 Cache ChannelManager détruit');
        }
    }
    
    /**
     * Active ou désactive la virtualisation
     */
    toggleVirtualization(enabled) {
        this.useVirtualization = enabled;
        console.log(`🚀 Virtualisation ${enabled ? 'activée' : 'désactivée'}`);
        
        // Rerender les chaînes avec le nouveau mode
        this.renderChannels();
    }
    
    /**
     * Définit le seuil de performance pour la virtualisation
     */
    setPerformanceThreshold(threshold) {
        this.performanceThreshold = threshold;
        console.log(`⚡ Seuil de performance défini à ${threshold} chaînes`);
    }
    
    /**
     * Active/désactive la virtualisation extrême
     */
    toggleExtremeVirtualization(enabled) {
        this.useExtremeVirtualization = enabled;
        console.log(`🚀 Virtualisation EXTRÊME ${enabled ? 'activée' : 'désactivée'}`);
        
        // Re-render avec le nouveau mode
        this.renderChannels();
    }
    
    /**
     * Définit le seuil pour la virtualisation extrême
     */
    setExtremeThreshold(threshold) {
        this.extremeThreshold = threshold;
        console.log(`🚀 Seuil extrême défini à ${threshold} chaînes`);
    }
    
    /**
     * Force un mode de virtualisation spécifique
     */
    forceVirtualizationMode(mode) {
        // mode: 'none', 'normal', 'extreme'
        const oldMode = this.currentVirtualizationMode;
        this.currentVirtualizationMode = mode;
        
        console.log(`🔧 Mode forcé: ${oldMode} -> ${mode}`);
        
        if (oldMode !== mode) {
            this.cleanupVirtualGrids();
            this.renderChannels();
        }
    }
    
    /**
     * Obtient les statistiques de performance
     */
    getPerformanceStats() {
        const stats = {
            totalChannels: this.app.channels.length,
            filteredChannels: this.app.search.getFilteredChannels().length,
            virtualizationEnabled: this.useVirtualization,
            performanceThreshold: this.performanceThreshold,
            isVirtualized: this.virtualGrid !== null
        };
        
        if (this.virtualGrid) {
            stats.virtualGrid = this.virtualGrid.getMemoryUsage();
        }
        
        return stats;
    }
}