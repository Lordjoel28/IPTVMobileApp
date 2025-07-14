/**
 * Gestionnaire Picture-in-Picture (PiP) pour le lecteur IPTV
 * Gère l'activation/désactivation du mode Picture-in-Picture avec design moderne
 */
export class PiPManager {
    constructor(app) {
        this.app = app;
        this.isPiPActive = false;
        this.pipWindow = null;
        this.setupPiPButton();
        this.setupEventListeners();
        
        console.log('🖼️ PiPManager initialisé');
    }

    /**
     * Vérifier si Picture-in-Picture est supporté
     */
    isPiPSupported() {
        return 'pictureInPictureEnabled' in document && document.pictureInPictureEnabled;
    }

    /**
     * Créer et ajouter le bouton PiP à l'interface
     */
    setupPiPButton() {
        // Vérifier le support
        if (!this.isPiPSupported()) {
            console.warn('⚠️ Picture-in-Picture non supporté dans ce navigateur');
            return;
        }

        // Trouver les contrôles du header
        const headerActions = document.querySelector('.header-actions');
        if (!headerActions) {
            console.warn('⚠️ Impossible de trouver .header-actions pour ajouter le bouton PiP');
            return;
        }

        // Créer le bouton PiP avec design moderne
        const pipButton = document.createElement('button');
        pipButton.className = 'btn-icon flex-center pip-button';
        pipButton.id = 'pipToggle';
        pipButton.title = 'Picture-in-Picture';
        pipButton.setAttribute('aria-label', 'Activer Picture-in-Picture');
        
        pipButton.innerHTML = `
            <span class="material-icons pip-icon">picture_in_picture_alt</span>
            <span class="pip-indicator" style="display: none;"></span>
        `;

        // Insérer le bouton avant le bouton paramètres
        const settingsButton = document.getElementById('settingsToggle');
        if (settingsButton) {
            headerActions.insertBefore(pipButton, settingsButton);
        } else {
            headerActions.appendChild(pipButton);
        }

        // Ajouter les styles CSS modernes
        this.addPiPStyles();

        console.log('✅ Bouton Picture-in-Picture ajouté');
    }

    /**
     * Ajouter les styles CSS pour le bouton PiP
     */
    addPiPStyles() {
        const style = document.createElement('style');
        style.id = 'pip-styles';
        style.textContent = `
            .pip-button {
                position: relative;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                border-radius: 50%;
                overflow: hidden;
            }

            .pip-button:hover {
                background: rgba(33, 150, 243, 0.1);
                transform: scale(1.05);
            }

            .pip-button.active {
                background: rgba(33, 150, 243, 0.2);
                color: #2196F3;
            }

            .pip-button.active .pip-icon {
                animation: pipPulse 2s infinite;
            }

            .pip-indicator {
                position: absolute;
                top: 6px;
                right: 6px;
                width: 8px;
                height: 8px;
                background: #4CAF50;
                border-radius: 50%;
                border: 2px solid var(--bg-primary);
                animation: pipBlink 1.5s infinite;
            }

            @keyframes pipPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }

            @keyframes pipBlink {
                0%, 50% { opacity: 1; }
                51%, 100% { opacity: 0.3; }
            }

            .pip-button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none !important;
            }

            .pip-notification {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 12px 16px;
                border-radius: 8px;
                backdrop-filter: blur(10px);
                z-index: 10000;
                font-size: 14px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                transform: translateY(100px);
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .pip-notification.show {
                transform: translateY(0);
            }

            .pip-mini-controls {
                position: fixed;
                bottom: 20px;
                left: 20px;
                background: rgba(0, 0, 0, 0.8);
                border-radius: 12px;
                padding: 8px;
                backdrop-filter: blur(10px);
                z-index: 10000;
                display: none;
                flex-direction: row;
                gap: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            }

            .pip-mini-controls.show {
                display: flex;
            }

            .pip-mini-btn {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                border-radius: 8px;
                color: white;
                padding: 8px;
                cursor: pointer;
                transition: background 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .pip-mini-btn:hover {
                background: rgba(255, 255, 255, 0.3);
            }

            .pip-mini-btn .material-icons {
                font-size: 18px;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Configurer les event listeners
     */
    setupEventListeners() {
        // Event listener pour le bouton PiP
        document.addEventListener('click', (e) => {
            if (e.target.closest('#pipToggle')) {
                this.togglePiP();
            }
        });

        // Event listeners pour les événements PiP natifs
        document.addEventListener('enterpictureinpicture', (e) => {
            this.onPiPEnter(e);
        });

        document.addEventListener('leavepictureinpicture', (e) => {
            this.onPiPLeave(e);
        });

        // Event listener pour les raccourcis clavier
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.altKey && e.key === 'p') {
                e.preventDefault();
                this.togglePiP();
            }
        });
    }

    /**
     * Basculer le mode Picture-in-Picture
     */
    async togglePiP() {
        if (!this.isPiPSupported()) {
            this.showNotification('Picture-in-Picture non supporté dans ce navigateur', 'error');
            return;
        }

        const videoElement = this.getVideoElement();
        if (!videoElement) {
            this.showNotification('Aucune vidéo en cours de lecture', 'warning');
            return;
        }

        try {
            if (this.isPiPActive) {
                await this.exitPiP();
            } else {
                await this.enterPiP(videoElement);
            }
        } catch (error) {
            console.error('❌ Erreur Picture-in-Picture:', error);
            this.showNotification('Erreur lors de l\'activation du Picture-in-Picture', 'error');
        }
    }

    /**
     * Entrer en mode Picture-in-Picture
     */
    async enterPiP(videoElement) {
        try {
            this.pipWindow = await videoElement.requestPictureInPicture();
            console.log('🖼️ Picture-in-Picture activé');
            
            // Afficher les contrôles mini
            this.showMiniControls();
            
            this.showNotification('Picture-in-Picture activé', 'success');
        } catch (error) {
            throw error;
        }
    }

    /**
     * Sortir du mode Picture-in-Picture
     */
    async exitPiP() {
        try {
            await document.exitPictureInPicture();
            console.log('🖼️ Picture-in-Picture désactivé');
        } catch (error) {
            throw error;
        }
    }

    /**
     * Gestionnaire d'entrée en PiP
     */
    onPiPEnter(event) {
        this.isPiPActive = true;
        this.updatePiPButton(true);
        this.setupPiPControls(event.pictureInPictureWindow);
    }

    /**
     * Gestionnaire de sortie de PiP
     */
    onPiPLeave(event) {
        this.isPiPActive = false;
        this.pipWindow = null;
        this.updatePiPButton(false);
        this.hideMiniControls();
    }

    /**
     * Mettre à jour l'apparence du bouton PiP
     */
    updatePiPButton(isActive) {
        const pipButton = document.getElementById('pipToggle');
        const indicator = pipButton?.querySelector('.pip-indicator');
        
        if (pipButton) {
            pipButton.classList.toggle('active', isActive);
            pipButton.title = isActive ? 'Désactiver Picture-in-Picture' : 'Picture-in-Picture';
            pipButton.setAttribute('aria-label', isActive ? 'Désactiver Picture-in-Picture' : 'Activer Picture-in-Picture');
        }
        
        if (indicator) {
            indicator.style.display = isActive ? 'block' : 'none';
        }
    }

    /**
     * Configurer les contrôles dans la fenêtre PiP
     */
    setupPiPControls(pipWindow) {
        if (!pipWindow || !pipWindow.navigator || !pipWindow.navigator.mediaSession) return;

        const mediaSession = pipWindow.navigator.mediaSession;
        
        // Configuration des actions de lecture
        mediaSession.setActionHandler('play', () => {
            if (this.app.player) {
                this.app.player.play();
            }
        });

        mediaSession.setActionHandler('pause', () => {
            if (this.app.player) {
                this.app.player.pause();
            }
        });

        mediaSession.setActionHandler('previoustrack', () => {
            this.app.playPreviousChannel();
        });

        mediaSession.setActionHandler('nexttrack', () => {
            this.app.playNextChannel();
        });

        // Mettre à jour les métadonnées
        this.updatePiPMetadata();
    }

    /**
     * Mettre à jour les métadonnées de la fenêtre PiP
     */
    updatePiPMetadata() {
        if (!this.isPiPActive || !navigator.mediaSession) return;

        const currentChannel = this.app.currentChannel;
        if (currentChannel) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: currentChannel.name || 'Chaîne IPTV',
                artist: 'Lecteur IPTV',
                album: currentChannel.group || 'TV',
                artwork: currentChannel.logo ? [
                    { src: currentChannel.logo, sizes: '256x256', type: 'image/png' }
                ] : []
            });
        }
    }

    /**
     * Afficher les contrôles mini
     */
    showMiniControls() {
        let miniControls = document.getElementById('pipMiniControls');
        
        if (!miniControls) {
            miniControls = document.createElement('div');
            miniControls.id = 'pipMiniControls';
            miniControls.className = 'pip-mini-controls';
            
            miniControls.innerHTML = `
                <button class="pip-mini-btn" id="pipPrevChannel" title="Chaîne précédente">
                    <span class="material-icons">skip_previous</span>
                </button>
                <button class="pip-mini-btn" id="pipPlayPause" title="Lecture/Pause">
                    <span class="material-icons">play_arrow</span>
                </button>
                <button class="pip-mini-btn" id="pipNextChannel" title="Chaîne suivante">
                    <span class="material-icons">skip_next</span>
                </button>
                <button class="pip-mini-btn" id="pipExit" title="Sortir du PiP">
                    <span class="material-icons">close</span>
                </button>
            `;
            
            document.body.appendChild(miniControls);
            
            // Event listeners pour les contrôles mini
            miniControls.addEventListener('click', (e) => {
                e.stopPropagation();
                
                if (e.target.closest('#pipPrevChannel')) {
                    this.app.playPreviousChannel();
                } else if (e.target.closest('#pipPlayPause')) {
                    if (this.app.player) {
                        if (this.app.player.paused()) {
                            this.app.player.play();
                        } else {
                            this.app.player.pause();
                        }
                    }
                } else if (e.target.closest('#pipNextChannel')) {
                    this.app.playNextChannel();
                } else if (e.target.closest('#pipExit')) {
                    this.exitPiP();
                }
            });
        }
        
        miniControls.classList.add('show');
        
        // Auto-masquer après 5 secondes
        setTimeout(() => {
            if (miniControls && this.isPiPActive) {
                miniControls.classList.remove('show');
            }
        }, 5000);
    }

    /**
     * Masquer les contrôles mini
     */
    hideMiniControls() {
        const miniControls = document.getElementById('pipMiniControls');
        if (miniControls) {
            miniControls.classList.remove('show');
            setTimeout(() => {
                miniControls.remove();
            }, 300);
        }
    }

    /**
     * Obtenir l'élément vidéo
     */
    getVideoElement() {
        if (this.app.player && typeof this.app.getVideoElement === 'function') {
            return this.app.getVideoElement();
        }
        
        // Fallback: chercher l'élément vidéo directement
        const videoElement = document.querySelector('#videoPlayer video') || document.querySelector('video');
        return videoElement;
    }

    /**
     * Afficher une notification
     */
    showNotification(message, type = 'info') {
        if (this.app.notifications && typeof this.app.notifications.showNotification === 'function') {
            this.app.notifications.showNotification(message, type);
        } else {
            // Fallback: notification simple
            console.log(`📢 ${message}`);
            
            const notification = document.createElement('div');
            notification.className = 'pip-notification show';
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }
    }

    /**
     * Nettoyer les ressources
     */
    cleanup() {
        if (this.isPiPActive) {
            this.exitPiP();
        }
        
        this.hideMiniControls();
        
        // Supprimer les styles
        const styles = document.getElementById('pip-styles');
        if (styles) {
            styles.remove();
        }
        
        console.log('🧹 PiPManager nettoyé');
    }
}