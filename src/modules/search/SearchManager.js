/**
 * Gestionnaire de Recherche et Filtrage
 * Gère toute la logique de recherche, filtrage et catégorisation des chaînes IPTV
 */
export class SearchManager {
    constructor(app) {
        this.app = app; // Référence vers IPTVApp
        
        // Variables d'état de recherche
        this.searchQuery = '';
        this.currentCategory = 'all';
        this.searchTimeout = null;
        
        // Moteur de recherche avancée (sera initialisé par l'app)
        this.advancedSearch = null;
        
        console.log('🔍 SearchManager initialisé');
    }

    /**
     * Obtient la liste des chaînes filtrées selon la catégorie et la recherche
     */
    getFilteredChannels() {
        // Vérification sécurisée des chaînes
        if (!this.app.channels || !Array.isArray(this.app.channels)) {
            console.log('🔍 Aucune chaîne disponible ou non initialisée');
            return [];
        }
        
        // Debug: vérifier les chaînes disponibles
        console.log(`🔍 Debug SearchManager: ${this.app.channels.length} chaînes disponibles`);
        console.log(`🔍 Catégorie actuelle: ${this.currentCategory}`);
        console.log(`🔍 Requête de recherche: "${this.searchQuery}"`);
        
        let filtered = [...this.app.channels];
        
        // Filter by category
        if (this.currentCategory === 'favorites') {
            const favorites = this.app.favorites || [];
            filtered = filtered.filter(channel => favorites.includes(channel.id));
            console.log(`🔍 Favoris trouvés: ${filtered.length}`);
        } else if (this.currentCategory === 'recent') {
            const recentChannels = this.app.recentChannels || [];
            const recentIds = recentChannels.slice(0, 20);
            filtered = recentIds.map(id => this.app.channels.find(c => c.id === id)).filter(Boolean);
            console.log(`🔍 Récents trouvés: ${filtered.length}`);
        } else if (this.currentCategory !== 'all') {
            // Debug: voir les groupes disponibles
            const availableGroups = [...new Set(this.app.channels.map(c => c.group))];
            console.log(`🔍 Groupes disponibles:`, availableGroups.slice(0, 10));
            console.log(`🔍 Recherche groupe: "${this.currentCategory}"`);
            
            filtered = filtered.filter(channel => channel.group === this.currentCategory);
            console.log(`🔍 Chaînes trouvées pour groupe "${this.currentCategory}": ${filtered.length}`);
        }
        
        // Advanced search filtering
        if (this.searchQuery && this.advancedSearch) {
            const advancedOptions = this.getAdvancedSearchOptions();
            filtered = this.advancedSearch.advancedSearch(this.searchQuery, filtered, advancedOptions);
        } else if (this.searchQuery) {
            // Fallback to basic search if advanced search is not available
            const searchTerm = this.searchQuery.toLowerCase();
            filtered = filtered.filter(channel => 
                channel.name.toLowerCase().includes(searchTerm) ||
                channel.group.toLowerCase().includes(searchTerm)
            );
        }
        
        // Filter blocked channels if option is enabled
        if (this.app.parental && this.app.parental.parentalControl && this.app.parental.parentalControl.enabled && this.app.parental.parentalControl.hideBlockedChannels) {
            filtered = filtered.filter(channel => this.app.parental.isChannelAccessible(channel));
        }
        
        return filtered;
    }

    /**
     * Déclenche le filtrage et le rendu des chaînes
     */
    filterChannels() {
        console.log('🔄 Déclenchement du filtrage des chaînes');
        
        // Afficher l'état de chargement
        this.showSearchLoading();
        
        // Déléguer le rendu à l'application principale
        this.app.channelManager.renderChannels();
        
        // Mettre à jour le titre de section
        this.updateSectionTitle();
        
        // Mettre à jour les statistiques
        this.updateSearchStats();
        
        // Masquer l'état de chargement
        this.hideSearchLoading();
    }

    /**
     * Calcule le nombre de chaînes par catégorie
     */
    getCategoryChannelCount(category) {
        if (category === 'all') {
            return this.app.channels?.length || 0;
        } else if (category === 'favorites') {
            return this.app.favorites?.length || 0;
        } else if (category === 'recent') {
            return Math.min(this.app.recentChannels?.length || 0, 20);
        } else {
            return (this.app.channels || []).filter(channel => channel.group === category).length;
        }
    }

    /**
     * Définit la catégorie active et met à jour l'interface
     */
    setActiveCategory(category) {
        document.querySelectorAll('.nav-item[data-category]').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeItem = document.querySelector(`[data-category="${category}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
        
        this.currentCategory = category;
        this.updateSectionTitle();
        this.filterChannels();
    }

    /**
     * Met à jour le titre de la section selon la catégorie active
     */
    updateSectionTitle() {
        const titles = {
            'all': 'Toutes les chaînes',
            'favorites': 'Favoris',
            'recent': 'Récemment regardées'
        };
        
        const titleEl = document.getElementById('sectionTitle');
        if (titleEl) {
            titleEl.textContent = titles[this.currentCategory] || this.currentCategory;
        }
    }

    /**
     * Toggle du panneau de recherche avancée
     */
    toggleAdvancedSearchPanel() {
        const advancedPanel = document.getElementById('searchAdvancedPanel');
        const advancedBtn = document.getElementById('searchAdvancedBtn');
        const searchBar = document.getElementById('searchBar');
        
        if (!advancedPanel || !advancedBtn) return;
        
        // S'assurer que la barre de recherche reste ouverte
        if (searchBar && !searchBar.classList.contains('active')) {
            searchBar.classList.add('active');
        }
        
        advancedPanel.classList.toggle('active');
        advancedBtn.classList.toggle('active');
        
        if (advancedPanel.classList.contains('active')) {
            this.updateSearchHistory();
            this.updateSearchSuggestions();
        }
    }

    /**
     * Gère la recherche avancée avec debouncing
     */
    handleAdvancedSearch() {
        // Debounce search to avoid too many updates
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.filterChannels();
        }, 300);
    }

    /**
     * Met à jour les suggestions de recherche
     */
    updateSearchSuggestions() {
        if (!this.advancedSearch || !this.searchQuery || this.searchQuery.length < 2) {
            this.clearSearchSuggestions();
            return;
        }
        
        const suggestions = this.advancedSearch.generateSuggestions(this.searchQuery, this.app.channels, 5);
        this.renderSearchSuggestions(suggestions);
    }

    /**
     * Affiche les suggestions de recherche dans l'interface
     */
    renderSearchSuggestions(suggestions) {
        const suggestionsContainer = document.getElementById('searchSuggestions');
        if (!suggestionsContainer) return;
        
        if (suggestions.length === 0) {
            suggestionsContainer.innerHTML = '';
            return;
        }
        
        suggestionsContainer.innerHTML = suggestions.map(suggestion => `
            <div class="suggestion-item" data-suggestion="${this.app.escapeHtml ? this.app.escapeHtml(suggestion) : suggestion}">
                ${this.app.escapeHtml ? this.app.escapeHtml(suggestion) : suggestion}
            </div>
        `).join('');
        
        // Add click listeners to suggestions
        suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const suggestion = item.dataset.suggestion;
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    searchInput.value = suggestion;
                    this.searchQuery = suggestion;
                    this.handleAdvancedSearch();
                    this.clearSearchSuggestions();
                }
            });
        });
    }

    /**
     * Vide les suggestions affichées
     */
    clearSearchSuggestions() {
        const suggestionsContainer = document.getElementById('searchSuggestions');
        if (suggestionsContainer) {
            suggestionsContainer.innerHTML = '';
        }
    }

    /**
     * Met à jour l'historique de recherche
     */
    updateSearchHistory() {
        if (!this.advancedSearch) return;
        
        const historyContainer = document.getElementById('historyList');
        if (!historyContainer) return;
        
        const history = this.advancedSearch.getHistory();
        
        if (history.length === 0) {
            historyContainer.innerHTML = '<div class="no-history">Aucune recherche récente</div>';
            return;
        }
        
        historyContainer.innerHTML = history.map(item => `
            <div class="history-item" data-query="${this.app.escapeHtml ? this.app.escapeHtml(item.query) : item.query}">
                <span class="history-query">${this.app.escapeHtml ? this.app.escapeHtml(item.query) : item.query}</span>
                <span class="material-icons remove-history" data-query="${this.app.escapeHtml ? this.app.escapeHtml(item.query) : item.query}">close</span>
            </div>
        `).join('');
        
        // Add click listeners
        historyContainer.querySelectorAll('.history-item').forEach(item => {
            const query = item.dataset.query;
            
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                if (e.target.classList.contains('remove-history')) {
                    // Remove from history
                    this.advancedSearch.removeFromHistory(query);
                    this.updateSearchHistory();
                } else {
                    // Use as search query
                    const searchInput = document.getElementById('searchInput');
                    if (searchInput) {
                        searchInput.value = query;
                        this.searchQuery = query;
                        this.handleAdvancedSearch();
                    }
                }
            });
        });
    }

    /**
     * Récupère les options de recherche avancée depuis l'interface
     */
    getAdvancedSearchOptions() {
        const sortByRelevance = document.getElementById('sortByRelevance');
        const qualityFilter = document.getElementById('qualityFilter');
        const languageFilter = document.getElementById('languageFilter');
        
        const options = {
            sortByRelevance: sortByRelevance ? sortByRelevance.checked : false
        };
        
        // Quality filter
        if (qualityFilter) {
            const selectedQualities = Array.from(qualityFilter.selectedOptions).map(opt => opt.value);
            if (selectedQualities.length > 0) {
                options.quality = selectedQualities;
            }
        }
        
        // Language filter
        if (languageFilter) {
            const selectedLanguages = Array.from(languageFilter.selectedOptions).map(opt => opt.value);
            if (selectedLanguages.length > 0) {
                options.language = selectedLanguages;
            }
        }
        
        return options;
    }

    /**
     * Réinitialise l'état de recherche
     */
    resetSearch() {
        this.searchQuery = '';
        this.currentCategory = 'all';
        
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
        }
        
        this.clearSearchSuggestions();
        this.hideSearchClearButton();
        this.hideSearchStats();
        this.filterChannels();
        
        console.log('🔄 État de recherche réinitialisé');
    }

    /**
     * Initialise le moteur de recherche avancée
     */
    initializeAdvancedSearch(advancedSearchEngine) {
        this.advancedSearch = advancedSearchEngine;
        console.log('🔧 Moteur de recherche avancée initialisé');
    }

    /**
     * Met à jour les statistiques de recherche
     */
    updateSearchStats() {
        const filteredChannels = this.getFilteredChannels();
        const count = filteredChannels.length;
        
        const searchStats = document.getElementById('searchStats');
        const searchCount = document.getElementById('searchCount');
        
        if (searchStats && searchCount) {
            if (this.searchQuery || this.currentCategory !== 'all') {
                searchCount.textContent = `${count} résultat${count > 1 ? 's' : ''}`;
                searchStats.style.display = 'flex';
            } else {
                searchStats.style.display = 'none';
            }
        }
    }
    
    /**
     * Affiche/masque le bouton effacer la recherche
     */
    updateClearButton() {
        const searchClear = document.getElementById('searchClear');
        if (searchClear) {
            if (this.searchQuery) {
                searchClear.style.display = 'flex';
            } else {
                searchClear.style.display = 'none';
            }
        }
    }
    
    /**
     * Efface la recherche
     */
    clearSearch() {
        this.searchQuery = '';
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
        }
        this.hideSearchClearButton();
        this.hideSearchStats();
        this.filterChannels();
        
        console.log('🧹 Recherche effacée');
    }
    
    /**
     * Affiche l'état de chargement de la recherche
     */
    showSearchLoading() {
        const searchLoading = document.getElementById('searchLoading');
        if (searchLoading) {
            searchLoading.style.display = 'flex';
        }
    }
    
    /**
     * Masque l'état de chargement de la recherche
     */
    hideSearchLoading() {
        const searchLoading = document.getElementById('searchLoading');
        if (searchLoading) {
            setTimeout(() => {
                searchLoading.style.display = 'none';
            }, 300); // Petit délai pour voir l'animation
        }
    }
    
    /**
     * Masque le bouton effacer
     */
    hideSearchClearButton() {
        const searchClear = document.getElementById('searchClear');
        if (searchClear) {
            searchClear.style.display = 'none';
        }
    }
    
    /**
     * Masque les statistiques de recherche
     */
    hideSearchStats() {
        const searchStats = document.getElementById('searchStats');
        if (searchStats) {
            searchStats.style.display = 'none';
        }
    }
    
    /**
     * Surligne les termes de recherche dans le texte
     */
    highlightSearchTerms(text, searchQuery) {
        if (!searchQuery || !text) return text;
        
        // Échapper les caractères spéciaux pour regex
        const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedQuery})`, 'gi');
        
        return text.replace(regex, '<span class="search-highlight">$1</span>');
    }
    
    /**
     * Met à jour la requête de recherche et les éléments UI
     */
    setSearchQuery(query) {
        this.searchQuery = query;
        this.updateClearButton();
        
        // Ajouter à l'historique si ce n'est pas vide
        if (query && this.advancedSearch) {
            this.advancedSearch.addToHistory(query);
        }
    }
    
    /**
     * Destruction du gestionnaire
     */
    destroy() {
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = null;
        }
        
        this.clearSearchSuggestions();
        
        console.log('💥 SearchManager détruit');
    }
}