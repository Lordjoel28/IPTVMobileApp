/**
 * Gestionnaire des paramètres de l'application IPTV
 */
export class SettingsManager {
    constructor() {
        console.log('🔧 Initialisation SettingsManager');
        this.settings = this.chargerParametresDefaut();
        this.chargerParametres();
    }

    /**
     * Paramètres par défaut
     */
    chargerParametresDefaut() {
        return {
            theme: 'dark',
            quality: 'auto',
            volume: 80,
            autoplayNext: false,
            rememberPosition: true
        };
    }

    /**
     * Charger les paramètres depuis le localStorage
     */
    chargerParametres() {
        try {
            const stored = localStorage.getItem('iptv_settings');
            if (stored) {
                this.settings = { ...this.chargerParametresDefaut(), ...JSON.parse(stored) };
            }
            console.log('✅ Paramètres chargés:', this.settings);
        } catch (error) {
            console.error('❌ Erreur chargement paramètres:', error);
            this.settings = this.chargerParametresDefaut();
        }
    }

    /**
     * Appliquer les paramètres à l'interface (équivalent de loadSettings)
     * @param {Object} epgManager - Manager EPG pour la mise à jour des paramètres EPG
     * @param {Function} updateEPGStatusCallback - Callback pour mettre à jour le statut EPG
     */
    loadSettings(epgManager = null, updateEPGStatusCallback = null) {
        // Apply theme via ThemeManager si disponible
        if (window.app && window.app.themeManager) {
            window.app.themeManager.applyTheme(this.settings.theme);
        } else {
            document.body.className = `theme-${this.settings.theme}`;
        }
        
        // Load form values (sans themeSelect)
        const qualitySelect = document.getElementById('qualitySelect');
        const volumeSlider = document.getElementById('volumeSlider');
        const autoplayNext = document.getElementById('autoplayNext');
        const rememberPosition = document.getElementById('rememberPosition');
        
        if (qualitySelect) qualitySelect.value = this.settings.quality;
        if (volumeSlider) volumeSlider.value = this.settings.volume;
        if (autoplayNext) autoplayNext.checked = this.settings.autoplayNext;
        if (rememberPosition) rememberPosition.checked = this.settings.rememberPosition;
        
        // Load EPG settings
        const epgUrl = document.getElementById('epgUrl');
        const autoUpdateEpg = document.getElementById('autoUpdateEpg');
        
        if (epgUrl) {
            const savedEpgUrl = localStorage.getItem('iptv_epg_url') || '';
            // Nettoyer l'URL sauvegardée si nécessaire
            const cleanUrl = savedEpgUrl ? this.cleanEPGUrl(savedEpgUrl) : '';
            epgUrl.value = cleanUrl || '';
            
            // Mettre à jour le localStorage si l'URL a été nettoyée
            if (cleanUrl && cleanUrl !== savedEpgUrl) {
                localStorage.setItem('iptv_epg_url', cleanUrl);
            }
        }
        if (epgManager && autoUpdateEpg) {
            autoUpdateEpg.checked = epgManager.settings.autoUpdate;
        }
        
        // Update EPG status
        if (updateEPGStatusCallback) {
            setTimeout(() => {
                updateEPGStatusCallback();
            }, 500);
        }
        
        console.log('✅ Paramètres appliqués à l\'interface');
        return this.settings;
    }

    /**
     * Sauvegarder les paramètres depuis l'interface
     */
    saveSettings() {
        const qualitySelect = document.getElementById('qualitySelect');
        const volumeSlider = document.getElementById('volumeSlider');
        const autoplayNext = document.getElementById('autoplayNext');
        const rememberPosition = document.getElementById('rememberPosition');
        const epgUrl = document.getElementById('epgUrl');
        const autoUpdateEpg = document.getElementById('autoUpdateEpg');
        
        // Récupérer le thème actuellement sélectionné depuis le ThemeManager
        const currentTheme = localStorage.getItem('iptv_theme') || 'dark';
        
        this.settings = {
            theme: currentTheme,
            quality: qualitySelect?.value || 'auto',
            volume: parseInt(volumeSlider?.value || 80),
            autoplayNext: autoplayNext?.checked || false,
            rememberPosition: rememberPosition?.checked || true
        };
        
        // Save EPG settings
        if (epgUrl?.value) {
            localStorage.setItem('iptv_epg_url', epgUrl.value);
        }
        
        this.saveSettingsToStorage();
        
        console.log('✅ Paramètres sauvegardés:', this.settings);
        return this.settings;
    }

    /**
     * Réinitialiser les paramètres
     */
    resetSettings() {
        if (confirm('Réinitialiser tous les paramètres ?')) {
            this.settings = this.chargerParametresDefaut();
            this.saveSettingsToStorage();
            console.log('✅ Paramètres réinitialisés');
            return true;
        }
        return false;
    }

    /**
     * Sauvegarder dans le localStorage
     */
    saveSettingsToStorage() {
        try {
            localStorage.setItem('iptv_settings', JSON.stringify(this.settings));
            console.log('✅ Paramètres sauvegardés dans localStorage');
        } catch (error) {
            console.error('❌ Erreur sauvegarde paramètres:', error);
        }
    }

    /**
     * Obtenir les paramètres actuels
     */
    obtenirParametres() {
        return { ...this.settings };
    }

    /**
     * Mettre à jour un paramètre spécifique
     */
    mettreAJourParametre(cle, valeur) {
        this.settings[cle] = valeur;
        this.saveSettingsToStorage();
        console.log(`✅ Paramètre ${cle} mis à jour:`, valeur);
    }

    /**
     * Appliquer le thème
     */
    appliquerTheme(theme) {
        this.settings.theme = theme;
        document.body.className = `theme-${theme}`;
        this.saveSettingsToStorage();
        console.log('✅ Thème appliqué:', theme);
    }

    /**
     * Appliquer le thème immédiatement (pour usage après sauvegarde)
     */
    appliquerThemeImmediat(theme) {
        // Supprimer toutes les classes de thème existantes
        document.body.className = document.body.className.replace(/theme-\w+/g, '').trim();
        
        // Ajouter la nouvelle classe de thème
        document.body.classList.add(`theme-${theme}`);
        
        // Si un ThemeManager global existe, l'utiliser
        if (window.app && window.app.themeManager) {
            window.app.themeManager.applyTheme(theme);
        }
        
        console.log('🎨 Thème appliqué immédiatement:', theme);
    }

    /**
     * Nettoyer l'URL EPG (fonction utilitaire)
     */
    cleanEPGUrl(url) {
        if (!url) return '';
        
        // Nettoyer les espaces et caractères indésirables
        let cleanUrl = url.trim();
        
        // Vérifier si c'est une URL valide
        try {
            new URL(cleanUrl);
            return cleanUrl;
        } catch {
            console.warn('⚠️ URL EPG invalide:', url);
            return '';
        }
    }

    /**
     * Obtenir les paramètres EPG
     */
    obtenirParametresEPG() {
        return {
            url: localStorage.getItem('iptv_epg_url') || '',
            autoUpdate: JSON.parse(localStorage.getItem('epg_auto_update') || 'true')
        };
    }

    /**
     * Sauvegarder les paramètres EPG
     */
    sauvegarderParametresEPG(url, autoUpdate) {
        if (url) {
            localStorage.setItem('iptv_epg_url', url);
        }
        localStorage.setItem('epg_auto_update', JSON.stringify(autoUpdate));
        console.log('✅ Paramètres EPG sauvegardés');
    }
}