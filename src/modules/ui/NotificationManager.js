/**
 * Gestionnaire des notifications et indicateurs de chargement
 * Extrait depuis app.js pour une meilleure modularité
 */
export class NotificationManager {
    constructor() {
        console.log('🔔 NotificationManager initialisé');
    }
    
    /**
     * Affiche une notification à l'utilisateur
     * @param {string} message - Le message à afficher
     * @param {string} type - Le type de notification ('info', 'success', 'warning', 'error')
     */
    showNotification(message, type = 'info') {
        // Remove existing notifications
        document.querySelectorAll('.notification').forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 24px;
            padding: 16px 24px;
            background-color: ${
                type === 'error' ? '#f44336' : 
                type === 'warning' ? '#ff9800' : 
                type === 'success' ? '#4caf50' : 
                '#2196f3'
            };
            color: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 5000;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    /**
     * Affiche l'overlay de chargement
     * @param {string} message - Message optionnel à afficher pendant le chargement
     */
    showLoading(message = null) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('active');
            
            // Si un message personnalisé est fourni, l'afficher
            if (message) {
                const messageEl = overlay.querySelector('.loading-message');
                if (messageEl) {
                    messageEl.textContent = message;
                }
            }
        }
    }
    
    /**
     * Cache l'overlay de chargement
     */
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('active');
            
            // Réinitialiser le message de chargement
            const messageEl = overlay.querySelector('.loading-message');
            if (messageEl) {
                messageEl.textContent = 'Chargement...';
            }
        }
    }
    
    /**
     * Met à jour la progression du chargement (si applicable)
     * @param {number} progress - Progression en pourcentage (0-100)
     */
    updateLoadingProgress(progress) {
        const progressBar = document.getElementById('loadingProgress');
        if (progressBar) {
            progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
        }
        
        const progressText = document.getElementById('loadingProgressText');
        if (progressText) {
            progressText.textContent = `${Math.round(progress)}%`;
        }
    }
    
    /**
     * Alias pour compatibilité avec MultiScreenManager
     * @param {string} message - Le message à afficher
     * @param {string} type - Le type de notification
     */
    showToast(message, type = 'info') {
        this.showNotification(message, type);
    }
}