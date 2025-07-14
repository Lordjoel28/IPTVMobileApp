/**
 * Gestionnaire de l'Interface Utilisateur
 * Gère tous les aspects visuels et d'interaction de l'application IPTV
 */
export class UIManager {
    constructor(app) {
        this.app = app; // Référence vers IPTVPlayer
        this.eventListeners = new Map();
        this.activeModals = new Set();
        this.keyboardEnabled = true;
        
        console.log('🖥️ UIManager initialisé');
    }

    /**
     * Configuration des événements DOM
     */
    setupEventListeners() {
        console.log('Configuration des écouteurs d\'événements...');
        
        // Header
        this.addClickListener('searchToggle', () => this.toggleRecherche());
        this.addClickListener('epgToggle', () => this.app.showEPGModal());
        this.addClickListener('recordingsToggle', () => this.app.showRecordingsModal());
        this.addClickListener('selectRecordingPath', () => this.app.selectRecordingDirectory());
        this.addClickListener('themeToggle', () => this.app.toggleTheme());
        this.addClickListener('settingsToggle', () => this.ouvrirModal('settingsModal'));
        this.addClickListener('parentalControl', () => this.app.parental.openParentalControlModal());
        this.addClickListener('relockParental', () => this.app.parental.relockParentalControl());
        this.addClickListener('changeParentalPin', () => this.app.parental.showChangePinModal());
        this.addClickListener('closeChangePinModal', () => this.fermerModal('changePinModal'));
        this.addClickListener('cancelPinChange', () => this.fermerModal('changePinModal'));
        this.addClickListener('savePinChange', () => this.app.parental.saveNewPin());
        this.addClickListener('manageUsers', () => {
            console.log('Bouton gérer utilisateurs cliqué');
            this.app.openUserModal();
        });
        this.addClickListener('currentUserDisplay', () => {
            console.log('Affichage utilisateur actuel cliqué');
            this.app.openUserModal();
        });
        
        
        // Configuration de la recherche
        this.configurerRecherche();
        
        // Configuration des raccourcis clavier globaux
        this.configurerRaccourcisClavier();
        
        // Navigation
        document.querySelectorAll('.nav-item[data-category]').forEach(item => {
            item.addEventListener('click', () => {
                this.app.search.setActiveCategory(item.dataset.category);
            });
        });
        
        // View controls
        this.addClickListener('gridView', () => this.app.setViewMode('grid'));
        this.addClickListener('listView', () => this.app.setViewMode('list'));
        
        // Playlist management
        this.addClickListener('addPlaylist', () => this.ouvrirModal('playlistModal'));
        this.addClickListener('managePlaylist', () => this.app.openManagePlaylistsModal());
        
        // Configuration des modals
        this.configurerModals();
        
        // Configuration des fichiers
        this.configurerUploadFichiers();
        
        // Configuration des champs PIN
        this.configurerChampsPIN();
        
        // Configuration sélection avatar
        this.configurerSelectionAvatar();
        
        // Configuration interface de thèmes
        this.configurerInterfaceThemes();
        
        console.log('Écouteurs d\'événements configurés');
    }

    /**
     * Helper pour ajouter des event listeners avec tracking
     */
    addClickListener(elementId, handler, optional = false) {
        const element = document.getElementById(elementId);
        if (element) {
            const boundHandler = (event) => {
                event.preventDefault();
                handler(event);
            };
            element.addEventListener('click', boundHandler);
            
            // Tracker pour cleanup
            if (!this.eventListeners.has(elementId)) {
                this.eventListeners.set(elementId, []);
            }
            this.eventListeners.get(elementId).push({
                type: 'click',
                handler: boundHandler,
                element: element
            });
        } else if (!optional) {
            console.warn(`Élément non trouvé: ${elementId}`);
        }
    }

    /**
     * Configuration des boutons principaux
     */
    configurerBoutonsPrincipaux() {
        // Placeholder - sera implémenté lors de l'extraction
        console.log('🔘 Configuration boutons principaux...');
    }

    /**
     * Configuration de la navigation clavier
     */
    configurerNavigationClavier() {
        document.addEventListener('keydown', (e) => this.gererNavigationClavier(e));
        console.log('⌨️ Navigation clavier configurée');
    }

    /**
     * Gestionnaire de navigation clavier
     */
    gererNavigationClavier(event) {
        if (!this.keyboardEnabled) return;
        
        // Placeholder - sera implémenté lors de l'extraction
        console.log('⌨️ Navigation clavier:', event.key);
    }

    /**
     * Configuration des modals
     */
    configurerModals() {
        // Playlist modal
        this.addClickListener('closePlaylistModal', () => this.fermerModal('playlistModal'));
        this.addClickListener('cancelPlaylist', () => this.fermerModal('playlistModal'));
        this.addClickListener('addPlaylistBtn', () => this.app.addPlaylist());
        
        // Manage playlists modal
        this.addClickListener('closeManagePlaylistsModal', () => this.fermerModal('managePlaylistsModal'));
        this.addClickListener('addNewPlaylistFromManage', () => {
            this.fermerModal('managePlaylistsModal');
            this.ouvrirModal('playlistModal');
        });
        
        // Settings modal
        this.addClickListener('closeSettingsModal', () => this.fermerModal('settingsModal'));
        this.addClickListener('saveSettings', () => this.app.saveSettings());
        this.addClickListener('resetSettings', () => this.app.resetSettings());
        
        // Parental Control modal
        this.addClickListener('closeParentalModal', () => this.fermerModal('parentalModal'));
        this.addClickListener('validatePin', () => this.app.parental.validatePin());
        this.addClickListener('saveParentalSettings', () => this.app.parental.saveParentalSettings());
        this.addClickListener('cancelPin', () => this.fermerModal('parentalModal'));
        
        // User Management modal
        this.addClickListener('closeUserModal', () => this.fermerModal('userModal'));
        this.addClickListener('addUser', () => this.ouvrirModal('addUserModal'));
        this.addClickListener('switchUser', () => this.afficherSelecteurUtilisateur());
        
        // Add User modal
        this.addClickListener('closeAddUserModal', () => this.fermerModal('addUserModal'));
        this.addClickListener('saveUser', () => this.app.userManager.saveNewUser());
        this.addClickListener('cancelAddUser', () => this.fermerModal('addUserModal'));
        
        // EPG Modal
        this.addClickListener('closeEpgModal', () => this.fermerModal('epgModal'));
        this.addClickListener('epgPrevDay', () => this.app.epgManager?.navigateDay(-1));
        this.addClickListener('epgNextDay', () => this.app.epgManager?.navigateDay(1));
        
        // Recordings Modal
        this.addClickListener('closeRecordingsModal', () => this.fermerModal('recordingsModal'));
        
        // Recordings Tabs
        document.querySelectorAll('.recordings-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.app.switchRecordingTab(btn.dataset.tab));
        });
        
        // EPG Settings
        this.addClickListener('loadEpgNow', () => this.app.loadEPGFromSettings());
        this.addClickListener('clearEpgCache', () => this.app.clearEPGCache());
        
        
        // Modal backdrop clicks
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.fermerModal(modal.id);
                }
            });
        });
        
        
        console.log('🪟 Modals configurées');
    }

    /**
     * Configuration upload de fichiers
     */
    configurerUploadFichiers() {
        const playlistFile = document.getElementById('playlistFile');
        if (playlistFile) {
            playlistFile.addEventListener('change', (e) => this.app.handleFileUpload(e.target.files[0]));
        }
    }

    /**
     * Configuration des champs PIN
     */
    configurerChampsPIN() {
        // Gestion des champs PIN pour navigation automatique
        document.querySelectorAll('.pin-digit').forEach((input, index) => {
            input.addEventListener('input', (e) => {
                const value = e.target.value;
                if (value && /^\d$/.test(value)) {
                    // Passer au champ suivant
                    const nextInput = document.querySelector(`.pin-digit[data-index="${index + 1}"]`);
                    if (nextInput) {
                        nextInput.focus();
                    }
                }
            });
            
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value) {
                    // Revenir au champ précédent si le champ actuel est vide
                    const prevInput = document.querySelector(`.pin-digit[data-index="${index - 1}"]`);
                    if (prevInput) {
                        prevInput.focus();
                    }
                }
            });
        });
        
        // Gestion des touches Enter pour le changement de PIN
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const changePinModal = document.getElementById('changePinModal');
                const searchInput = document.getElementById('searchInput');
                
                // Seulement si le modal PIN est ouvert ET l'input de recherche n'est pas focus
                if (changePinModal && !changePinModal.classList.contains('hidden') && 
                    document.activeElement !== searchInput && !searchInput?.contains(document.activeElement)) {
                    e.preventDefault();
                    this.app.parental.saveNewPin();
                }
            }
        });
    }

    /**
     * Configuration sélection d'avatar
     */
    configurerSelectionAvatar() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.avatar-option')) {
                const option = e.target.closest('.avatar-option');
                document.querySelectorAll('.avatar-option').forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
            }
        });
    }

    /**
     * Configuration de la recherche
     */
    configurerRecherche() {
        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.app.search.setSearchQuery(e.target.value);
                this.app.search.handleAdvancedSearch();
                this.app.search.updateSearchSuggestions();
            });
            
            // Fermer la barre de recherche sur Escape seulement
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.toggleRecherche();
                }
            });
            
            searchInput.addEventListener('blur', (e) => {
                // Ne fermer que si le focus ne va pas vers un élément de la recherche avancée
                setTimeout(() => {
                    const activeElement = document.activeElement;
                    const searchBar = document.getElementById('searchBar');
                    
                    // **CORRECTION: Ne pas fermer si on a une recherche active**
                    const hasActiveSearch = this.app.search.searchQuery && this.app.search.searchQuery.length > 0;
                    if (hasActiveSearch) {
                        console.log('🔒 Recherche active préservée - pas de fermeture automatique');
                        return; // Ne pas fermer si recherche en cours
                    }
                    
                    // Vérifier si le focus est sur un élément de la recherche
                    if (activeElement && searchBar && searchBar.contains(activeElement)) {
                        return; // Ne pas fermer
                    }
                    
                    // Vérifier si la souris survole la zone de recherche
                    if (searchBar && searchBar.matches(':hover')) {
                        return; // Ne pas fermer
                    }
                    
                    if (searchBar && searchBar.classList.contains('active')) {
                        this.toggleRecherche();
                    }
                }, 200);
            });
        }
        
        // Bouton effacer recherche
        const searchClear = document.getElementById('searchClear');
        if (searchClear) {
            searchClear.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.app.search.clearSearch();
            });
        }
        
        // Advanced Search Controls
        this.configurerRecherchAvancee();
    }

    configurerRecherchAvancee() {
        const searchAdvancedBtn = document.getElementById('searchAdvancedBtn');
        if (searchAdvancedBtn) {
            searchAdvancedBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.app.search.toggleAdvancedSearchPanel();
            });
        }
        
        const searchField = document.getElementById('searchField');
        if (searchField) {
            searchField.addEventListener('change', (e) => {
                e.stopPropagation();
                if (this.app.advancedSearch) {
                    this.app.advancedSearch.updateConfig({ field: e.target.value });
                    this.app.search.handleAdvancedSearch();
                }
            });
            
            searchField.addEventListener('focus', (e) => {
                e.stopPropagation();
            });
        }
        
        const searchOperator = document.getElementById('searchOperator');
        if (searchOperator) {
            searchOperator.addEventListener('change', (e) => {
                e.stopPropagation();
                if (this.app.advancedSearch) {
                    this.app.advancedSearch.updateConfig({ operator: e.target.value });
                    this.app.search.handleAdvancedSearch();
                }
            });
            
            searchOperator.addEventListener('focus', (e) => {
                e.stopPropagation();
            });
        }
        
        const clearHistory = document.getElementById('clearHistory');
        if (clearHistory) {
            clearHistory.addEventListener('click', () => {
                if (this.app.advancedSearch) {
                    this.app.advancedSearch.clearHistory();
                    this.app.search.updateSearchHistory();
                }
            });
        }
        
        // Advanced search options
        const sortByRelevance = document.getElementById('sortByRelevance');
        if (sortByRelevance) {
            sortByRelevance.addEventListener('change', (e) => {
                e.stopPropagation();
                this.app.search.handleAdvancedSearch();
            });
            
            sortByRelevance.addEventListener('focus', (e) => {
                e.stopPropagation();
            });
        }
        
        const qualityFilter = document.getElementById('qualityFilter');
        if (qualityFilter) {
            qualityFilter.addEventListener('change', (e) => {
                e.stopPropagation();
                this.app.search.handleAdvancedSearch();
            });
            
            qualityFilter.addEventListener('focus', (e) => {
                e.stopPropagation();
            });
        }
        
        const languageFilter = document.getElementById('languageFilter');
        if (languageFilter) {
            languageFilter.addEventListener('change', (e) => {
                e.stopPropagation();
                this.app.search.handleAdvancedSearch();
            });
            
            languageFilter.addEventListener('focus', (e) => {
                e.stopPropagation();
            });
        }
    }

    /**
     * Ouvre un modal
     */
    ouvrirModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            this.activeModals.add(modalId);
            document.body.style.overflow = 'hidden';
            
            // Mode spécial pour le modal settings avec thèmes
            if (modalId === 'settingsModal' && this.checkIfThemesTabActive()) {
                const modalContent = modal.querySelector('.modal-content');
                if (modalContent) {
                    modalContent.classList.add('themes-mode');
                }
                modal.classList.add('themes-view');
            }
        }
    }

    /**
     * Ferme un modal
     */
    fermerModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            this.activeModals.delete(modalId);
            
            // Nettoyer les classes spéciales
            if (modalId === 'settingsModal') {
                const modalContent = modal.querySelector('.modal-content');
                if (modalContent) {
                    modalContent.classList.remove('themes-mode');
                }
                modal.classList.remove('themes-view');
            }
            
            if (this.activeModals.size === 0) {
                document.body.style.overflow = '';
            }
        }
    }

    /**
     * Ferme tous les modals
     */
    fermerTousLesModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
        this.activeModals.clear();
        document.body.style.overflow = '';
    }

    /**
     * Toggle interface recherche
     */
    toggleRecherche() {
        const searchBar = document.getElementById('searchBar');
        const searchInput = document.getElementById('searchInput');
        
        if (!searchBar) return;
        
        searchBar.classList.toggle('active');
        
        if (searchBar.classList.contains('active')) {
            setTimeout(() => {
                if (searchInput) {
                    searchInput.focus();
                    this.app.search.updateSearchHistory();
                    this.app.search.updateSearchSuggestions();
                }
            }, 100);
        } else {
            if (searchInput) {
                searchInput.value = '';
                this.app.search.searchQuery = '';
                this.app.search.filterChannels();
            }
            // Close advanced panel
            const advancedPanel = document.getElementById('searchAdvancedPanel');
            const advancedBtn = document.getElementById('searchAdvancedBtn');
            if (advancedPanel) {
                advancedPanel.classList.remove('active');
            }
            if (advancedBtn) {
                advancedBtn.classList.remove('active');
            }
        }
    }

    /**
     * Met à jour l'affichage utilisateur actuel
     */
    mettreAJourAffichageUtilisateur() {
        const userAvatar = document.getElementById('currentUserAvatar');
        const userName = document.getElementById('currentUserDisplayName');
        const modalUserName = document.getElementById('currentUserName');
        const modalUserType = document.getElementById('currentUserType');
        
        if (userAvatar) userAvatar.textContent = this.app.currentUser.avatar || 'account_circle';
        if (userName) userName.textContent = this.app.currentUser.name;
        if (modalUserName) modalUserName.textContent = this.app.currentUser.name;
        if (modalUserType) {
            const typeNames = {
                'admin': 'Administrateur',
                'standard': 'Standard',
                'child': 'Enfant'
            };
            modalUserType.textContent = typeNames[this.app.currentUser.type] || 'Standard';
        }
    }

    /**
     * Met à jour les informations de la chaîne
     */
    mettreAJourInfoChaine(channel) {
        const titleEl = document.getElementById('channelTitle');
        const descEl = document.getElementById('channelDescription');
        
        if (titleEl) titleEl.textContent = channel.name;
        if (descEl) descEl.textContent = channel.group;
    }

    /**
     * Affiche le modal EPG
     */
    afficherModalEPG() {
        this.ouvrirModal('epgModal');
    }

    /**
     * Affiche le modal enregistrements
     */
    afficherModalEnregistrements() {
        this.ouvrirModal('recordingsModal');
    }

    /**
     * Affiche le sélecteur d'utilisateur
     */
    afficherSelecteurUtilisateur() {
        // Appeler la méthode showUserSwitcher du UserManager pour gérer la logique business
        this.app.userManager.showUserSwitcher();
    }

    /**
     * Cleanup des event listeners
     */
    nettoyerEventListeners() {
        this.eventListeners.forEach((listeners, selector) => {
            listeners.forEach(({ element, type, handler }) => {
                element.removeEventListener(type, handler);
            });
        });
        this.eventListeners.clear();
        console.log('🧹 Event listeners nettoyés');
    }

    /**
     * Configuration de l'interface de thèmes
     */
    configurerInterfaceThemes() {
        console.log('🎨 DEBUG: Début configurerInterfaceThemes()');
        console.log('🎨 DEBUG: App state:', {
            hasApp: !!this.app,
            hasThemeManager: !!this.app?.themeManager,
            hasThemes: !!this.app?.themeManager?.themes
        });
        
        // Générer l'interface de sélection de thèmes
        this.genererInterfaceThemes();
        
        // Event listeners pour les contrôles de thèmes (optionnels)
        this.addClickListener('autoThemeBtn', () => this.app.themeManager.enableAutoMode(), true);
        this.addClickListener('randomThemeBtn', () => this.activerThemeAleatoire(), true);
        this.addClickListener('createThemeBtn', () => this.ouvrirCreateurTheme(), true);
        
        console.log('🎨 Interface de thèmes configurée');
    }

    /**
     * Générer l'interface de sélection de thèmes
     */
    genererInterfaceThemes() {
        console.log('🎨 DEBUG: Début génération interface thèmes');
        console.log('🎨 DEBUG: App disponible:', !!this.app);
        console.log('🎨 DEBUG: ThemeManager disponible:', !!this.app?.themeManager);
        console.log('🎨 DEBUG: Themes object:', this.app?.themeManager?.themes);
        
        const themeGrid = document.getElementById('themeGrid');
        if (!themeGrid) {
            console.error('❌ themeGrid non trouvé dans le DOM');
            return;
        }
        
        if (!this.app?.themeManager) {
            console.error('❌ ThemeManager non disponible');
            return;
        }
        
        const themes = this.app.themeManager.getThemesList();
        console.log('🎨 DEBUG: Nombre de thèmes récupérés:', themes.length);
        console.log('🎨 DEBUG: Liste des thèmes:', themes.map(t => t.id));
        console.log('🎨 DEBUG: Premier thème détail:', themes[0]);
        
        themeGrid.innerHTML = themes.map(theme => `
            <div class="theme-card ${theme.isActive ? 'active' : ''}" data-theme-id="${theme.id}">
                <div class="theme-preview-area">
                    <div class="theme-preview-bg" style="background: ${this.getThemeColor(theme.id, 'bg-primary')};">
                        <div class="theme-preview-elements">
                            <div class="theme-preview-element" style="background: ${this.getThemeColor(theme.id, 'text-primary')};"></div>
                            <div class="theme-preview-element" style="background: ${this.getThemeColor(theme.id, 'primary-color')};"></div>
                            <div class="theme-preview-element" style="background: ${this.getThemeColor(theme.id, 'accent-color')};"></div>
                        </div>
                    </div>
                    <div class="theme-preview-secondary" style="background: ${this.getThemeColor(theme.id, 'bg-secondary')};"></div>
                    <div class="theme-preview-accent" style="background: ${this.getThemeColor(theme.id, 'primary-color')};"></div>
                </div>
                <div class="theme-info">
                    <div class="theme-name">${theme.name}</div>
                    <div class="theme-description">${theme.description}</div>
                </div>
            </div>
        `).join('');

        // Ajouter les event listeners pour la sélection de thèmes
        themeGrid.querySelectorAll('.theme-card').forEach(card => {
            card.addEventListener('click', () => {
                const themeId = card.dataset.themeId;
                this.app.themeManager.applyTheme(themeId);
                this.updateThemeSelection();
            });
        });
    }

    /**
     * Obtenir une couleur spécifique d'un thème
     */
    getThemeColor(themeId, colorVar) {
        const theme = this.app.themeManager.themes[themeId];
        if (!theme || !theme.variables) return '#cccccc';
        
        return theme.variables[`--${colorVar}`] || '#cccccc';
    }

    /**
     * Mettre à jour la sélection visuelle des thèmes
     */
    updateThemeSelection() {
        const themeGrid = document.getElementById('themeGrid');
        if (!themeGrid) return;

        themeGrid.querySelectorAll('.theme-card').forEach(card => {
            card.classList.remove('active');
        });

        const currentTheme = this.app.themeManager.currentTheme;
        const activeCard = themeGrid.querySelector(`[data-theme-id="${currentTheme}"]`);
        if (activeCard) {
            activeCard.classList.add('active');
        }
    }

    /**
     * Activer un thème aléatoire
     */
    activerThemeAleatoire() {
        const themes = Object.keys(this.app.themeManager.themes);
        const randomIndex = Math.floor(Math.random() * themes.length);
        const randomTheme = themes[randomIndex];
        
        this.app.themeManager.applyTheme(randomTheme);
        this.updateThemeSelection();
    }

    /**
     * Ouvrir le créateur de thème personnalisé
     */
    ouvrirCreateurTheme() {
        this.app.notifications.showNotification(
            'Créateur de thème personnalisé - Fonctionnalité à venir!', 
            'info'
        );
    }

    /**
     * Vérifie si l'onglet thèmes est actif dans les paramètres
     */
    checkIfThemesTabActive() {
        const themesTab = document.querySelector('.settings-nav-item[data-section="appearance"]');
        return themesTab && themesTab.classList.contains('active');
    }

    /**
     * Gère le changement d'onglets dans le modal settings
     */
    onSettingsTabChange(sectionName) {
        const modal = document.getElementById('settingsModal');
        if (!modal) return;
        
        const modalContent = modal.querySelector('.modal-content');
        if (!modalContent) return;
        
        if (sectionName === 'appearance') {
            modalContent.classList.add('themes-mode');
            modal.classList.add('themes-view');
            console.log('🎨 Mode thèmes activé pour le modal');
        } else {
            modalContent.classList.remove('themes-mode');
            modal.classList.remove('themes-view');
        }
    }

    /**
     * Configuration des raccourcis clavier globaux
     */
    configurerRaccourcisClavier() {
        // État pour la navigation dans les résultats
        this.selectedChannelIndex = -1;
        this.keyboardNavigationActive = false;
        
        document.addEventListener('keydown', (e) => {
            // PROTECTION ABSOLUE : Ignorer TOUS les inputs sauf recherche
            if (e.target.tagName === 'INPUT' && e.target.id !== 'searchInput') {
                return;
            }
            if (e.target.tagName === 'TEXTAREA') return;
            if (e.target.contentEditable === 'true') return;
            if (e.target.tagName === 'SELECT') return;
            if (e.target.tagName === 'BUTTON') return;
            
            // Ignorer COMPLÈTEMENT si modal ouvert
            if (document.querySelector('.modal.active')) {
                return;
            }
            
            // Ignorer si focus sur PIN inputs
            if (e.target.classList.contains('pin-digit')) return;
            if (e.target.id && e.target.id.toLowerCase().includes('pin')) return;
            
            const searchBar = document.getElementById('searchBar');
            const searchInput = document.getElementById('searchInput');
            const isSearchOpen = searchBar && searchBar.classList.contains('active');
            
            // SEULE EXCEPTION : raccourcis globaux d'ouverture de recherche
            const isGlobalShortcut = (e.key === 'f' || e.key === 'F' || e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey);
            
            // Gérer UNIQUEMENT les raccourcis de recherche
            switch (e.key) {
                case 'f':
                case 'F':
                    if (isGlobalShortcut) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        this.ouvrirRechercheRapide();
                    }
                    break;
                    
                case 'k':
                case 'K':
                    if (isGlobalShortcut) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        this.ouvrirRechercheRapide();
                    }
                    break;
                    
                case 'Escape':
                    // SEULEMENT si recherche ouverte ET focus sur l'input de recherche
                    if (isSearchOpen && e.target === searchInput) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        this.fermerRecherche();
                    }
                    break;
                    
                case 'ArrowDown':
                    // SEULEMENT si recherche ouverte ET focus sur l'input de recherche
                    if (isSearchOpen && e.target === searchInput) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        this.naviguerResultats('down');
                    }
                    break;
                    
                case 'ArrowUp':
                    // SEULEMENT si recherche ouverte ET focus sur l'input de recherche
                    if (isSearchOpen && e.target === searchInput) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        this.naviguerResultats('up');
                    }
                    break;
                    
                case 'Enter':
                    // TRIPLE VÉRIFICATION pour Entrée
                    if (isSearchOpen && 
                        e.target === searchInput && 
                        this.selectedChannelIndex >= 0 &&
                        !document.querySelector('.modal.active')) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        this.selectionnerChaine();
                    }
                    break;
                    
                case 'Tab':
                    // SEULEMENT si recherche ouverte ET focus sur l'input de recherche
                    if (isSearchOpen && e.target === searchInput) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        this.naviguerResultats('down');
                    }
                    break;
            }
        });
        
        console.log('⌨️ Raccourcis clavier configurés');
    }
    
    /**
     * Ouvre la recherche avec focus automatique
     */
    ouvrirRechercheRapide() {
        const searchBar = document.getElementById('searchBar');
        const searchInput = document.getElementById('searchInput');
        
        if (!searchBar.classList.contains('active')) {
            this.toggleRecherche();
        }
        
        // Focus sur l'input avec délai pour l'animation
        setTimeout(() => {
            if (searchInput) {
                searchInput.focus();
                searchInput.select(); // Sélectionner le texte existant
            }
        }, 100);
        
        console.log('🔍 Recherche ouverte via raccourci');
    }
    
    /**
     * Ferme la recherche et nettoie la navigation
     */
    fermerRecherche() {
        const searchBar = document.getElementById('searchBar');
        if (searchBar && searchBar.classList.contains('active')) {
            this.toggleRecherche();
        }
        this.resetKeyboardNavigation();
        console.log('❌ Recherche fermée via raccourci');
    }
    
    /**
     * Navigue dans les résultats avec les flèches
     */
    naviguerResultats(direction) {
        const channels = document.querySelectorAll('.channel-card:not(.blocked)');
        if (channels.length === 0) return;
        
        // Activer la navigation au clavier
        this.keyboardNavigationActive = true;
        
        // Ajouter classe CSS pour animations
        const channelsGrid = document.getElementById('channelsGrid');
        if (channelsGrid) {
            channelsGrid.classList.add('keyboard-navigation');
        }
        
        // Retirer la sélection précédente
        channels.forEach(channel => channel.classList.remove('keyboard-selected'));
        
        if (direction === 'down') {
            this.selectedChannelIndex = Math.min(this.selectedChannelIndex + 1, channels.length - 1);
        } else if (direction === 'up') {
            this.selectedChannelIndex = Math.max(this.selectedChannelIndex - 1, -1);
        }
        
        // Appliquer la nouvelle sélection
        if (this.selectedChannelIndex >= 0) {
            const selectedChannel = channels[this.selectedChannelIndex];
            selectedChannel.classList.add('keyboard-selected');
            
            // Scroll automatique pour garder visible
            selectedChannel.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }
        
        console.log(`⌨️ Navigation: ${direction}, index: ${this.selectedChannelIndex}`);
    }
    
    /**
     * Sélectionne et lit la chaîne active
     */
    selectionnerChaine() {
        const channels = document.querySelectorAll('.channel-card:not(.blocked)');
        if (this.selectedChannelIndex >= 0 && this.selectedChannelIndex < channels.length) {
            const selectedChannel = channels[this.selectedChannelIndex];
            const channelId = selectedChannel.dataset.channelId;
            
            if (channelId) {
                console.log(`🎯 Tentative de lecture de la chaîne: ${channelId}`);
                
                // Vérifier si la chaîne est accessible (contrôle parental)
                const channel = this.app.channels.find(c => c.id === channelId);
                if (!channel) {
                    console.error('❌ Chaîne introuvable:', channelId);
                    return;
                }
                
                if (!this.app.parental.isChannelAccessible(channel)) {
                    console.warn('🔒 Chaîne bloquée par le contrôle parental');
                    this.app.notifications.showNotification('Chaîne bloquée par le contrôle parental', 'warning');
                    return;
                }
                
                // Effet visuel de sélection
                selectedChannel.classList.add('keyboard-activated');
                setTimeout(() => {
                    selectedChannel.classList.remove('keyboard-activated');
                }, 200);
                
                // Fermer la recherche d'abord
                this.fermerRecherche();
                
                // Délai pour éviter les conflits d'événements
                setTimeout(() => {
                    // Lire la chaîne
                    this.app.playChannel(channelId);
                    console.log(`✅ Chaîne sélectionnée via clavier: ${channelId}`);
                }, 100);
            }
        }
    }
    
    /**
     * Remet à zéro la navigation au clavier
     */
    resetKeyboardNavigation() {
        this.selectedChannelIndex = -1;
        this.keyboardNavigationActive = false;
        
        // Retirer toutes les sélections visuelles
        document.querySelectorAll('.channel-card').forEach(channel => {
            channel.classList.remove('keyboard-selected', 'keyboard-activated');
        });
        
        // Retirer classe de navigation du grid
        const channelsGrid = document.getElementById('channelsGrid');
        if (channelsGrid) {
            channelsGrid.classList.remove('keyboard-navigation');
        }
    }

    /**
     * Destruction du gestionnaire
     */
    detruire() {
        this.nettoyerEventListeners();
        this.fermerTousLesModals();
        console.log('💥 UIManager détruit');
    }
}