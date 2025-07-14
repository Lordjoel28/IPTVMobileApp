/**
 * 📱 HybridLazyManager - Surcouche non-invasive pour lazy loading 43K chaînes
 * 
 * OBJECTIF: Gérer 43K chaînes (18K M3U + 25K Xtream) SANS casser le système existant
 * 
 * CONTRAINTES ABSOLUES:
 * - PRÉSERVER 100% le système de rendu logos existant
 * - Lazy loading = COUCHE par-dessus, PAS remplacement
 * - JAMAIS modifier les éléments img existants
 * - AUCUNE génération SVG (source des erreurs)
 * - Fallback immédiat vers système actuel si erreur
 */

export class HybridLazyManager {
    constructor(app) {
        this.app = app;
        this.isEnabled = true;
        this.isInitialized = false;
        
        // Détection automatique type de playlist
        this.playlistTypes = new Map(); // playlistId -> 'M3U' | 'XTREAM'
        
        // Stratégies différenciées
        this.strategies = {
            M3U: {
                name: 'M3U_LIGHT',
                preloadScreens: 2,
                maxConcurrentImages: 15,
                unloadOnExit: false,
                virtualizeThreshold: 15000
            },
            XTREAM: {
                name: 'XTREAM_AGGRESSIVE',
                preloadScreens: 1,
                maxConcurrentImages: 8,
                unloadOnExit: true,
                virtualizeThreshold: 10000
            }
        };
        
        // Intersection Observer pour viewport
        this.observer = null;
        this.observerOptions = {
            root: null,
            rootMargin: '200px',
            threshold: 0.1
        };
        
        // Gestion des erreurs et monitoring
        this.errorCount = 0;
        this.maxErrors = 50;
        this.blacklistedUrls = new Set();
        this.stats = {
            totalImages: 0,
            loadedImages: 0,
            errorImages: 0,
            bypassedImages: 0,
            memoryUsage: 0
        };
        
        // Queue de chargement
        this.loadingQueue = [];
        this.currentLoading = 0;
        
        // Cache des images processées
        this.processedImages = new WeakMap();
        
        console.log('🔄 HybridLazyManager initialisé');
    }
    
    /**
     * 🚀 Initialisation du système hybride
     */
    init() {
        if (this.isInitialized) return;
        
        try {
            this.setupIntersectionObserver();
            this.setupErrorMonitoring();
            this.isInitialized = true;
            
            console.log('✅ HybridLazyManager initialisé avec succès');
        } catch (error) {
            console.error('❌ Erreur initialisation HybridLazyManager:', error);
            this.disable();
        }
    }
    
    /**
     * 🔍 Détection automatique du type de playlist
     */
    detectPlaylistType(channels) {
        if (!channels || channels.length === 0) return 'M3U';
        
        // Heuristiques pour détecter Xtream
        const xtreamSignals = [
            'xtream-codes',
            'player_api.php',
            'live.php',
            'movie.php',
            'series.php'
        ];
        
        let xtreamScore = 0;
        let totalUrls = 0;
        
        for (const channel of channels.slice(0, 100)) { // Échantillon
            if (channel.url) {
                totalUrls++;
                const url = channel.url.toLowerCase();
                
                for (const signal of xtreamSignals) {
                    if (url.includes(signal)) {
                        xtreamScore++;
                        break;
                    }
                }
            }
        }
        
        const xtreamRatio = totalUrls > 0 ? xtreamScore / totalUrls : 0;
        const type = xtreamRatio > 0.3 ? 'XTREAM' : 'M3U';
        
        console.log(`🔍 Type détecté: ${type} (score: ${xtreamRatio.toFixed(2)})`);
        return type;
    }
    
    /**
     * 🎯 Activation du lazy loading pour un conteneur
     */
    activate(containerId, channels = []) {
        if (!this.isEnabled || !this.isInitialized) return;
        
        const container = document.getElementById(containerId);
        if (!container) return;
        
        // Détection du type de playlist
        const playlistType = this.detectPlaylistType(channels);
        this.playlistTypes.set(containerId, playlistType);
        
        // Appliquer la stratégie correspondante
        this.applyStrategy(container, playlistType, channels);
        
        console.log(`🎯 Lazy loading activé pour ${containerId} (${playlistType})`);
    }
    
    /**
     * ⚡ Application de la stratégie selon le type
     */
    applyStrategy(container, type, channels) {
        const strategy = this.strategies[type];
        
        // Vérifier si virtualisation nécessaire
        if (channels.length > strategy.virtualizeThreshold) {
            console.log(`🔄 Virtualisation forcée pour ${channels.length} chaînes`);
            this.enableVirtualization(container, strategy);
        }
        
        // Appliquer lazy loading aux images existantes
        this.processExistingImages(container, strategy);
        
        // Surveiller les nouveaux éléments
        this.watchForNewImages(container, strategy);
    }
    
    /**
     * 🖼️ Traitement des images existantes (non-invasif)
     */
    processExistingImages(container, strategy) {
        const images = container.querySelectorAll('img.channel-logo');
        
        images.forEach(img => {
            if (this.processedImages.has(img)) return;
            
            try {
                // Marquer comme traité
                this.processedImages.set(img, true);
                
                // Vérifier si dans le viewport
                if (this.isInViewport(img, strategy.preloadScreens)) {
                    // Dans le viewport - garder le comportement existant
                    this.stats.bypassedImages++;
                    return;
                }
                
                // Hors viewport - appliquer lazy loading
                this.applyLazyLoading(img, strategy);
                
            } catch (error) {
                console.warn('⚠️ Erreur traitement image:', error);
                this.handleError(error);
            }
        });
    }
    
    /**
     * 💤 Application du lazy loading à une image
     */
    applyLazyLoading(img, strategy) {
        const originalSrc = img.src;
        const container = img.closest('.channel-logo-container');
        
        // Sauvegarder l'URL originale
        if (originalSrc && !img.dataset.originalSrc) {
            img.dataset.originalSrc = originalSrc;
        }
        
        // Créer placeholder temporaire (optionnel)
        if (container) {
            container.classList.add('lazy-loading');
        }
        
        // Remplacer par data-src seulement si nécessaire
        if (originalSrc) {
            img.removeAttribute('src');
            img.dataset.src = originalSrc;
        }
        
        // Observer l'image
        if (this.observer) {
            this.observer.observe(img);
        }
        
        this.stats.totalImages++;
    }
    
    /**
     * 👀 Surveillance des nouvelles images
     */
    watchForNewImages(container, strategy) {
        const mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const images = node.querySelectorAll ? 
                                node.querySelectorAll('img.channel-logo') : 
                                (node.matches && node.matches('img.channel-logo') ? [node] : []);
                            
                            images.forEach(img => {
                                if (!this.processedImages.has(img)) {
                                    this.applyLazyLoading(img, strategy);
                                }
                            });
                        }
                    });
                }
            });
        });
        
        mutationObserver.observe(container, {
            childList: true,
            subtree: true
        });
    }
    
    /**
     * 🔭 Configuration de l'Intersection Observer
     */
    setupIntersectionObserver() {
        if (!window.IntersectionObserver) {
            console.warn('⚠️ IntersectionObserver non supporté - désactivation');
            this.disable();
            return;
        }
        
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadImage(entry.target);
                } else if (this.shouldUnloadImage(entry.target)) {
                    this.unloadImage(entry.target);
                }
            });
        }, this.observerOptions);
    }
    
    /**
     * 📥 Chargement d'une image
     */
    async loadImage(img) {
        const src = img.dataset.src || img.dataset.originalSrc;
        if (!src || this.blacklistedUrls.has(src)) return;
        
        // Vérifier limite de chargement concurrent
        if (this.currentLoading >= this.getCurrentMaxConcurrent()) {
            this.loadingQueue.push(img);
            return;
        }
        
        this.currentLoading++;
        const container = img.closest('.channel-logo-container');
        
        try {
            // Précharger l'image
            const preloadImg = new Image();
            preloadImg.src = src;
            
            await new Promise((resolve, reject) => {
                preloadImg.onload = resolve;
                preloadImg.onerror = reject;
                
                // Timeout pour éviter le blocage
                setTimeout(() => reject(new Error('Timeout')), 10000);
            });
            
            // Succès - appliquer l'image
            img.src = src;
            img.removeAttribute('data-src');
            
            if (container) {
                container.classList.remove('lazy-loading');
                container.classList.add('lazy-loaded');
            }
            
            this.stats.loadedImages++;
            this.observer?.unobserve(img);
            
        } catch (error) {
            console.warn('⚠️ Erreur chargement image:', src, error);
            this.handleImageError(img, src, error);
        } finally {
            this.currentLoading--;
            this.processQueue();
        }
    }
    
    /**
     * 📤 Déchargement d'une image (Xtream seulement)
     */
    unloadImage(img) {
        const playlistType = this.getCurrentPlaylistType(img);
        if (playlistType !== 'XTREAM') return;
        
        const container = img.closest('.channel-logo-container');
        
        // Sauvegarder l'URL si pas déjà fait
        if (img.src && !img.dataset.originalSrc) {
            img.dataset.originalSrc = img.src;
        }
        
        // Vider l'image
        img.removeAttribute('src');
        img.dataset.src = img.dataset.originalSrc;
        
        if (container) {
            container.classList.remove('lazy-loaded');
            container.classList.add('lazy-loading');
        }
        
        // Réobserver pour rechargement ultérieur
        this.observer?.observe(img);
    }
    
    /**
     * 🔄 Traitement de la queue de chargement
     */
    processQueue() {
        if (this.loadingQueue.length === 0) return;
        
        const maxConcurrent = this.getCurrentMaxConcurrent();
        while (this.currentLoading < maxConcurrent && this.loadingQueue.length > 0) {
            const img = this.loadingQueue.shift();
            this.loadImage(img);
        }
    }
    
    /**
     * ⚠️ Gestion des erreurs d'image
     */
    handleImageError(img, src, error) {
        this.stats.errorImages++;
        this.blacklistedUrls.add(src);
        
        // Fallback vers le système existant
        const container = img.closest('.channel-logo-container');
        if (container) {
            container.classList.remove('lazy-loading');
            container.classList.add('lazy-error');
            
            // Déclencher le gestionnaire d'erreur existant
            if (img.onerror) {
                img.onerror.call(img);
            }
        }
        
        this.handleError(error);
    }
    
    /**
     * 🛡️ Gestion générale des erreurs
     */
    handleError(error) {
        this.errorCount++;
        
        if (this.errorCount > this.maxErrors) {
            console.error('❌ Trop d\'erreurs - désactivation lazy loading');
            this.disable();
        }
    }
    
    /**
     * 📊 Monitoring des erreurs
     */
    setupErrorMonitoring() {
        // Monitoring mémoire
        if (performance.memory) {
            setInterval(() => {
                this.stats.memoryUsage = performance.memory.usedJSHeapSize;
                
                // Alerte si utilisation excessive
                if (this.stats.memoryUsage > 200 * 1024 * 1024) { // 200MB
                    console.warn('⚠️ Utilisation mémoire élevée:', this.stats.memoryUsage);
                }
            }, 30000);
        }
        
        // Monitoring global des erreurs
        window.addEventListener('error', (event) => {
            if (event.message && event.message.includes('lazy')) {
                this.handleError(event.error);
            }
        });
    }
    
    /**
     * 🔧 Utilitaires
     */
    isInViewport(element, preloadScreens = 1) {
        const rect = element.getBoundingClientRect();
        const margin = window.innerHeight * preloadScreens;
        
        return rect.top < window.innerHeight + margin &&
               rect.bottom > -margin;
    }
    
    shouldUnloadImage(img) {
        const playlistType = this.getCurrentPlaylistType(img);
        return playlistType === 'XTREAM' && 
               this.strategies.XTREAM.unloadOnExit;
    }
    
    getCurrentPlaylistType(img) {
        const container = img.closest('[id]');
        return container ? this.playlistTypes.get(container.id) || 'M3U' : 'M3U';
    }
    
    getCurrentMaxConcurrent() {
        const container = document.querySelector('.channels-grid');
        const playlistType = container ? this.getCurrentPlaylistType(container) : 'M3U';
        return this.strategies[playlistType].maxConcurrentImages;
    }
    
    enableVirtualization(container, strategy) {
        // Déléguer à ExtremeVirtualGrid si disponible
        if (this.app.channelManager?.virtualGrid) {
            console.log('🔄 Délégation vers ExtremeVirtualGrid');
            return;
        }
        
        console.log('⚠️ Virtualisation basique activée');
        container.classList.add('hybrid-virtualized');
    }
    
    /**
     * 📊 Statistiques et monitoring
     */
    getStats() {
        return {
            ...this.stats,
            errorCount: this.errorCount,
            blacklistedUrls: this.blacklistedUrls.size,
            queueSize: this.loadingQueue.length,
            currentLoading: this.currentLoading,
            isEnabled: this.isEnabled,
            playlistTypes: Object.fromEntries(this.playlistTypes)
        };
    }
    
    /**
     * 🧹 Nettoyage
     */
    cleanup() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        
        this.loadingQueue = [];
        this.processedImages = new WeakMap();
        this.playlistTypes.clear();
        this.blacklistedUrls.clear();
        
        console.log('🧹 HybridLazyManager nettoyé');
    }
    
    /**
     * ❌ Désactivation d'urgence
     */
    disable() {
        this.isEnabled = false;
        this.cleanup();
        
        // Restaurer toutes les images
        document.querySelectorAll('img[data-src]').forEach(img => {
            if (img.dataset.originalSrc) {
                img.src = img.dataset.originalSrc;
                img.removeAttribute('data-src');
            }
        });
        
        console.warn('❌ HybridLazyManager désactivé');
    }
    
    /**
     * 🔄 Réactivation
     */
    enable() {
        this.isEnabled = true;
        this.errorCount = 0;
        this.blacklistedUrls.clear();
        
        if (!this.isInitialized) {
            this.init();
        }
        
        console.log('✅ HybridLazyManager réactivé');
    }
}