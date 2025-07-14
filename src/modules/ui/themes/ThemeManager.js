export class ThemeManager {
    constructor(app) {
        this.app = app;
        this.currentTheme = 'default';
        this.themes = this.initializeThemes();
        this.loadTheme();
        console.log('🎨 ThemeManager initialisé avec', Object.keys(this.themes).length, 'thèmes');
    }

    initializeThemes() {
        return {
            default: {
                name: 'Défaut Clair',
                description: 'Thème clair moderne par défaut',
                className: 'theme-default',
                variables: {
                    '--bg-primary': '#ffffff',
                    '--bg-secondary': '#f8f9fa',
                    '--bg-tertiary': '#e9ecef',
                    '--card-bg': '#ffffff',
                    '--header-bg': '#ffffff',
                    '--sidebar-bg': '#f8f9fa',
                    '--modal-bg': '#ffffff',
                    '--input-bg': '#ffffff',
                    '--button-bg': '#f8f9fa',
                    '--hover-bg': '#e9ecef',
                    '--text-primary': '#212529',
                    '--text-secondary': '#6c757d',
                    '--text-muted': '#adb5bd',
                    '--border-color': '#dee2e6',
                    '--primary-color': '#2196F3',
                    '--primary-dark': '#1976D2',
                    '--primary-light': '#64B5F6',
                    '--accent-color': '#4CAF50',
                    '--success-color': '#28a745',
                    '--error-color': '#dc3545',
                    '--warning-color': '#ffc107',
                    '--info-color': '#17a2b8',
                    '--shadow': '0 2px 10px rgba(0, 0, 0, 0.1)',
                    '--shadow-hover': '0 4px 20px rgba(0, 0, 0, 0.15)'
                }
            },
            dark: {
                name: 'Sombre Moderne',
                description: 'Thème sombre élégant pour les yeux',
                className: 'theme-dark',
                variables: {
                    '--bg-primary': '#0a0a0a',
                    '--bg-secondary': '#1a1a1a',
                    '--bg-tertiary': '#2a2a2a',
                    '--card-bg': '#1a1a1a',
                    '--header-bg': '#0a0a0a',
                    '--sidebar-bg': '#1a1a1a',
                    '--modal-bg': '#1a1a1a',
                    '--input-bg': '#2a2a2a',
                    '--button-bg': '#2a2a2a',
                    '--hover-bg': '#333333',
                    '--text-primary': '#ffffff',
                    '--text-secondary': '#b0b0b0',
                    '--text-muted': '#666666',
                    '--border-color': '#333333',
                    '--primary-color': '#64B5F6',
                    '--primary-dark': '#42A5F5',
                    '--primary-light': '#90CAF9',
                    '--accent-color': '#66BB6A',
                    '--success-color': '#4caf50',
                    '--error-color': '#f44336',
                    '--warning-color': '#ff9800',
                    '--info-color': '#2196f3',
                    '--shadow': '0 2px 10px rgba(0, 0, 0, 0.3)',
                    '--shadow-hover': '0 4px 20px rgba(0, 0, 0, 0.4)'
                }
            },
            orange: {
                name: 'Orange Complet',
                description: 'Thème orange global sombre',
                className: 'theme-orange',
                variables: {
                    '--bg-primary': '#1a0f00',
                    '--bg-secondary': '#2d1a00',
                    '--bg-tertiary': '#3d2400',
                    '--card-bg': '#2d1a00',
                    '--header-bg': '#1a0f00',
                    '--sidebar-bg': '#2d1a00',
                    '--modal-bg': '#2d1a00',
                    '--input-bg': '#3d2400',
                    '--button-bg': '#3d2400',
                    '--hover-bg': '#4d2f00',
                    '--text-primary': '#ffffff',
                    '--text-secondary': '#ffcc99',
                    '--text-muted': '#ff9966',
                    '--border-color': '#4d2f00',
                    '--primary-color': '#ff8c00',
                    '--primary-dark': '#f57c00',
                    '--primary-light': '#ffb74d',
                    '--accent-color': '#ff6347',
                    '--success-color': '#4caf50',
                    '--error-color': '#d32f2f',
                    '--warning-color': '#ff9800',
                    '--info-color': '#2196f3',
                    '--shadow': '0 2px 10px rgba(255, 140, 0, 0.3)',
                    '--shadow-hover': '0 4px 20px rgba(255, 140, 0, 0.4)'
                }
            },
            green: {
                name: 'Vert Complet',
                description: 'Thème vert global sombre',
                className: 'theme-green',
                variables: {
                    '--bg-primary': '#0d1f0d',
                    '--bg-secondary': '#1a2e1a',
                    '--bg-tertiary': '#243d24',
                    '--card-bg': '#1a2e1a',
                    '--header-bg': '#0d1f0d',
                    '--sidebar-bg': '#1a2e1a',
                    '--modal-bg': '#1a2e1a',
                    '--input-bg': '#243d24',
                    '--button-bg': '#243d24',
                    '--hover-bg': '#2e4d2e',
                    '--text-primary': '#ffffff',
                    '--text-secondary': '#99ff99',
                    '--text-muted': '#66cc66',
                    '--border-color': '#2e4d2e',
                    '--primary-color': '#4caf50',
                    '--primary-dark': '#388e3c',
                    '--primary-light': '#81c784',
                    '--accent-color': '#8bc34a',
                    '--success-color': '#4caf50',
                    '--error-color': '#d32f2f',
                    '--warning-color': '#ff9800',
                    '--info-color': '#2196f3',
                    '--shadow': '0 2px 10px rgba(76, 175, 80, 0.3)',
                    '--shadow-hover': '0 4px 20px rgba(76, 175, 80, 0.4)'
                }
            },
            blue: {
                name: 'Bleu Complet',
                description: 'Thème bleu global sombre',
                className: 'theme-blue',
                variables: {
                    '--bg-primary': '#0a1929',
                    '--bg-secondary': '#1a2332',
                    '--bg-tertiary': '#243442',
                    '--card-bg': '#1a2332',
                    '--header-bg': '#0a1929',
                    '--sidebar-bg': '#1a2332',
                    '--modal-bg': '#1a2332',
                    '--input-bg': '#243442',
                    '--button-bg': '#243442',
                    '--hover-bg': '#2d4552',
                    '--text-primary': '#ffffff',
                    '--text-secondary': '#90caf9',
                    '--text-muted': '#64b5f6',
                    '--border-color': '#2d4552',
                    '--primary-color': '#2196f3',
                    '--primary-dark': '#1976d2',
                    '--primary-light': '#64b5f6',
                    '--accent-color': '#03a9f4',
                    '--success-color': '#4caf50',
                    '--error-color': '#d32f2f',
                    '--warning-color': '#ff9800',
                    '--info-color': '#2196f3',
                    '--shadow': '0 2px 10px rgba(33, 150, 243, 0.3)',
                    '--shadow-hover': '0 4px 20px rgba(33, 150, 243, 0.4)'
                }
            },
            gray: {
                name: 'Gris Sombre',
                description: 'Thème gris classique et élégant',
                className: 'theme-gray',
                variables: {
                    '--bg-primary': '#2c2c2c',
                    '--bg-secondary': '#3c3c3c',
                    '--bg-tertiary': '#4c4c4c',
                    '--card-bg': '#3c3c3c',
                    '--header-bg': '#2c2c2c',
                    '--sidebar-bg': '#3c3c3c',
                    '--modal-bg': '#3c3c3c',
                    '--input-bg': '#4c4c4c',
                    '--button-bg': '#4c4c4c',
                    '--hover-bg': '#5c5c5c',
                    '--text-primary': '#ffffff',
                    '--text-secondary': '#e0e0e0',
                    '--text-muted': '#b0b0b0',
                    '--border-color': '#5c5c5c',
                    '--primary-color': '#9e9e9e',
                    '--primary-dark': '#757575',
                    '--primary-light': '#bdbdbd',
                    '--accent-color': '#757575',
                    '--success-color': '#4caf50',
                    '--error-color': '#d32f2f',
                    '--warning-color': '#ff9800',
                    '--info-color': '#2196f3',
                    '--shadow': '0 2px 10px rgba(0, 0, 0, 0.4)',
                    '--shadow-hover': '0 4px 20px rgba(0, 0, 0, 0.5)'
                }
            },
            brown: {
                name: 'Marron Complet',
                description: 'Thème marron global sombre',
                className: 'theme-brown',
                variables: {
                    '--bg-primary': '#1a0f0a',
                    '--bg-secondary': '#2d1a0f',
                    '--bg-tertiary': '#3d2415',
                    '--card-bg': '#2d1a0f',
                    '--header-bg': '#1a0f0a',
                    '--sidebar-bg': '#2d1a0f',
                    '--modal-bg': '#2d1a0f',
                    '--input-bg': '#3d2415',
                    '--button-bg': '#3d2415',
                    '--hover-bg': '#4d2f1a',
                    '--text-primary': '#ffffff',
                    '--text-secondary': '#d7ccc8',
                    '--text-muted': '#bcaaa4',
                    '--border-color': '#4d2f1a',
                    '--primary-color': '#795548',
                    '--primary-dark': '#5d4037',
                    '--primary-light': '#a1887f',
                    '--accent-color': '#8d6e63',
                    '--success-color': '#4caf50',
                    '--error-color': '#d32f2f',
                    '--warning-color': '#ff9800',
                    '--info-color': '#2196f3',
                    '--shadow': '0 2px 10px rgba(121, 85, 72, 0.3)',
                    '--shadow-hover': '0 4px 20px rgba(121, 85, 72, 0.4)'
                }
            },
            purple: {
                name: 'Violet Complet',
                description: 'Thème violet global sombre',
                className: 'theme-purple',
                variables: {
                    '--bg-primary': '#1a0a1f',
                    '--bg-secondary': '#2d1a32',
                    '--bg-tertiary': '#3d2442',
                    '--card-bg': '#2d1a32',
                    '--header-bg': '#1a0a1f',
                    '--sidebar-bg': '#2d1a32',
                    '--modal-bg': '#2d1a32',
                    '--input-bg': '#3d2442',
                    '--button-bg': '#3d2442',
                    '--hover-bg': '#4d2f52',
                    '--text-primary': '#ffffff',
                    '--text-secondary': '#ce93d8',
                    '--text-muted': '#ba68c8',
                    '--border-color': '#4d2f52',
                    '--primary-color': '#9c27b0',
                    '--primary-dark': '#7b1fa2',
                    '--primary-light': '#ba68c8',
                    '--accent-color': '#ab47bc',
                    '--success-color': '#4caf50',
                    '--error-color': '#d32f2f',
                    '--warning-color': '#ff9800',
                    '--info-color': '#2196f3',
                    '--shadow': '0 2px 10px rgba(156, 39, 176, 0.3)',
                    '--shadow-hover': '0 4px 20px rgba(156, 39, 176, 0.4)'
                }
            },
            red: {
                name: 'Rouge Complet',
                description: 'Thème rouge global sombre',
                className: 'theme-red',
                variables: {
                    '--bg-primary': '#1f0a0a',
                    '--bg-secondary': '#321a1a',
                    '--bg-tertiary': '#422424',
                    '--card-bg': '#321a1a',
                    '--header-bg': '#1f0a0a',
                    '--sidebar-bg': '#321a1a',
                    '--modal-bg': '#321a1a',
                    '--input-bg': '#422424',
                    '--button-bg': '#422424',
                    '--hover-bg': '#522f2f',
                    '--text-primary': '#ffffff',
                    '--text-secondary': '#ffcdd2',
                    '--text-muted': '#ef9a9a',
                    '--border-color': '#522f2f',
                    '--primary-color': '#f44336',
                    '--primary-dark': '#d32f2f',
                    '--primary-light': '#ef5350',
                    '--accent-color': '#ff5722',
                    '--success-color': '#4caf50',
                    '--error-color': '#d32f2f',
                    '--warning-color': '#ff9800',
                    '--info-color': '#2196f3',
                    '--shadow': '0 2px 10px rgba(244, 67, 54, 0.3)',
                    '--shadow-hover': '0 4px 20px rgba(244, 67, 54, 0.4)'
                }
            }
        };
    }

    // Appliquer un thème
    applyTheme(themeId) {
        const theme = this.themes[themeId];
        if (!theme) {
            console.error(`Thème "${themeId}" non trouvé`);
            return false;
        }

        // Retirer les anciennes classes de thème
        Object.keys(this.themes).forEach(id => {
            document.body.classList.remove(this.themes[id].className);
        });

        // Appliquer la nouvelle classe
        document.body.classList.add(theme.className);

        // Appliquer les variables CSS
        const root = document.documentElement;
        Object.entries(theme.variables).forEach(([property, value]) => {
            root.style.setProperty(property, value);
        });

        // Sauvegarder le thème
        this.currentTheme = themeId;
        this.saveTheme();

        // Animation de transition
        this.animateThemeChange();

        console.log(`🎨 Thème "${theme.name}" appliqué`);
        
        // Notifier l'utilisateur
        if (this.app && this.app.notifications) {
            this.app.notifications.showNotification(`Thème "${theme.name}" activé`, 'success');
        }
        
        return true;
    }

    // Animation lors du changement de thème
    animateThemeChange() {
        document.body.style.transition = 'all 0.3s ease-in-out';
        setTimeout(() => {
            document.body.style.transition = '';
        }, 300);
    }

    // Obtenir la liste des thèmes
    getThemesList() {
        return Object.entries(this.themes).map(([id, theme]) => ({
            id,
            name: theme.name,
            description: theme.description,
            className: theme.className,
            isActive: this.currentTheme === id
        }));
    }

    // Obtenir le thème actuel
    getCurrentTheme() {
        return {
            id: this.currentTheme,
            ...this.themes[this.currentTheme]
        };
    }

    // Basculer entre clair et sombre
    toggleTheme() {
        if (this.currentTheme === 'default') {
            this.applyTheme('dark');
        } else {
            this.applyTheme('default');
        }
    }

    // Changer vers le prochain thème
    nextTheme() {
        const themes = Object.keys(this.themes);
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        this.applyTheme(themes[nextIndex]);
    }

    // Changer vers le thème précédent
    previousTheme() {
        const themes = Object.keys(this.themes);
        const currentIndex = themes.indexOf(this.currentTheme);
        const previousIndex = currentIndex === 0 ? themes.length - 1 : currentIndex - 1;
        this.applyTheme(themes[previousIndex]);
    }

    // Sauvegarder le thème
    saveTheme() {
        localStorage.setItem('iptv_theme', this.currentTheme);
    }

    // Charger le thème sauvegardé
    loadTheme() {
        const savedTheme = localStorage.getItem('iptv_theme') || 'default';
        if (this.themes[savedTheme]) {
            this.applyTheme(savedTheme);
        } else {
            this.applyTheme('default');
        }
    }

    // Mode automatique basé sur l'heure
    enableAutoMode() {
        const hour = new Date().getHours();
        
        // Thème selon l'heure
        if (hour >= 6 && hour < 18) {
            this.applyTheme('default'); // Jour : clair
        } else {
            this.applyTheme('dark'); // Nuit : sombre
        }
        
        // Programmer la prochaine vérification
        setTimeout(() => this.enableAutoMode(), 60 * 60 * 1000); // Vérifier chaque heure
    }

    // Obtenir une prévisualisation du thème
    getThemePreview(themeId) {
        const theme = this.themes[themeId];
        if (!theme) return null;

        return {
            id: themeId,
            name: theme.name,
            description: theme.description,
            colors: {
                primary: theme.variables['--bg-primary'],
                secondary: theme.variables['--bg-secondary'],
                text: theme.variables['--text-primary'],
                accent: theme.variables['--primary-color']
            }
        };
    }

    // Obtenir les variables d'un thème
    getThemeVariables(themeId) {
        const theme = this.themes[themeId];
        return theme ? theme.variables : null;
    }

    // Vérifier si un thème existe
    themeExists(themeId) {
        return !!this.themes[themeId];
    }

    // Obtenir les catégories de thèmes
    getThemeCategories() {
        return {
            light: ['default', 'orange', 'green', 'blue', 'gray', 'brown', 'purple', 'red'],
            dark: ['dark'],
            colorful: ['orange', 'green', 'blue', 'purple', 'red'],
            neutral: ['default', 'dark', 'gray', 'brown']
        };
    }
}