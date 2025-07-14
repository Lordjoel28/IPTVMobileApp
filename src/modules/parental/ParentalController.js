export class ParentalController {
    constructor(app) {
        this.app = app;
        console.log('🔒 ParentalController initialisé');
    }

    // Vérifier si une chaîne est accessible selon le contrôle parental
    isChannelAccessible(channel) {
        // Debug: loguer les vérifications
        const debug = false; // Mettre à true pour debug
        
        if (debug) {
            console.log(`--- Vérification accès chaîne: ${channel.name} ---`);
            console.log('Contrôle parental activé:', this.app.parentalControl.enabled);
            console.log('Type utilisateur:', this.app.currentUser.type);
            console.log('Contrôle déverrouillé:', this.app.parentalControl.isUnlocked);
            console.log('Expiration déverrouillage:', this.app.parentalControl.unlockExpires);
            console.log('Catégorie chaîne:', channel.group);
            console.log('Catégories bloquées:', this.app.parentalControl.blockedCategories);
        }
        
        if (!this.app.parentalControl.enabled) {
            if (debug) console.log('→ Accessible: contrôle parental désactivé');
            return true;
        }
        
        // Les admins peuvent être soumis au contrôle parental s'ils l'ont configuré
        // Seuls les admins avec PIN peuvent bypasser temporairement
        if (this.app.currentUser.type === 'admin' && !this.app.parentalControl.pin) {
            if (debug) console.log('→ Accessible: utilisateur admin sans contrôle parental configuré');
            return true;
        }
        
        if (this.app.parentalControl.isUnlocked && this.app.parentalControl.unlockExpires > Date.now()) {
            if (debug) console.log('→ Accessible: contrôle temporairement déverrouillé');
            return true;
        }

        // Vérifier l'âge
        if (channel.isNsfw && this.app.parentalControl.ageLimit < 18) {
            if (debug) console.log('→ Bloquée: contenu NSFW et limite d\'âge < 18');
            return false;
        }
        
        // Vérifier les catégories bloquées
        if (this.app.parentalControl.blockedCategories.includes(channel.group)) {
            if (debug) console.log('→ Bloquée: catégorie dans la liste bloquée');
            return false;
        }

        if (debug) console.log('→ Accessible: aucune restriction');
        return true;
    }

    // Demander le PIN parental
    requestParentalPin(callback) {
        const modal = document.getElementById('parentalModal');
        const pinInputs = modal.querySelectorAll('.pin-digit');
        const pinTitle = modal.querySelector('.pin-entry h4');
        
        // Reset PIN inputs
        pinInputs.forEach(input => input.value = '');
        if (pinInputs[0]) pinInputs[0].focus();
        
        // Masquer la configuration et afficher la saisie PIN
        const parentalSettings = modal.querySelector('.parental-settings');
        parentalSettings.style.display = 'none';
        parentalSettings.classList.add('hidden');
        modal.querySelector('.pin-entry').style.display = 'block';
        if (pinTitle) pinTitle.textContent = 'Entrez le code PIN parental';
        
        this.app.ui.ouvrirModal('parentalModal');
        
        // Gestionnaire temporaire pour cette vérification
        this.app._pinCallback = callback;
    }

    // Valider le PIN entré
    validatePin() {
        const modal = document.getElementById('parentalModal');
        const pinInputs = modal.querySelectorAll('.pin-digit');
        const enteredPin = Array.from(pinInputs).map(input => input.value).join('');
        
        if (enteredPin.length !== 4) {
            this.app.notifications.showNotification('PIN incomplet', 'error');
            return false;
        }

        if (enteredPin === this.app.parentalControl.pin) {
            // PIN correct - déverrouiller pour 30 minutes
            this.app.parentalControl.isUnlocked = true;
            this.app.parentalControl.unlockExpires = Date.now() + (30 * 60 * 1000);
            this.app.parentalControl.pinAttempts = 0;
            this.saveParentalControl();
            
            // Recharger l'affichage des chaînes pour montrer toutes les chaînes
            this.app.channelManager.renderChannels();
            this.app.channelManager.updateCategories();
            
            // Mettre à jour le statut de déverrouillage
            this.updateParentalUnlockStatus();
            
            this.app.ui.fermerModal('parentalModal');
            this.app.notifications.showNotification('Contrôle parental déverrouillé pour 30 minutes', 'success');
            
            if (this.app._pinCallback) {
                this.app._pinCallback(true);
                this.app._pinCallback = null;
            }
            return true;
        } else {
            // PIN incorrect
            this.app.parentalControl.pinAttempts++;
            this.saveParentalControl();
            
            if (this.app.parentalControl.pinAttempts >= 3) {
                this.app.notifications.showNotification('Trop de tentatives. Réessayez plus tard.', 'error');
                this.app.ui.fermerModal('parentalModal');
            } else {
                this.app.notifications.showNotification(`PIN incorrect. ${3 - this.app.parentalControl.pinAttempts} tentative(s) restante(s)`, 'error');
                pinInputs.forEach(input => input.value = '');
                pinInputs[0].focus();
            }
            
            if (this.app._pinCallback) {
                this.app._pinCallback(false);
                this.app._pinCallback = null;
            }
            return false;
        }
    }

    // Configurer le contrôle parental
    setupParentalControl() {
        const modal = document.getElementById('parentalModal');
        const enableToggle = modal.querySelector('#enableParentalControl');
        const ageLimitSelect = modal.querySelector('#ageRating');
        const hideBlockedToggle = modal.querySelector('#hideBlockedChannels');
        
        // Charger les paramètres actuels
        enableToggle.checked = this.app.parentalControl.enabled;
        ageLimitSelect.value = this.app.parentalControl.ageLimit;
        hideBlockedToggle.checked = this.app.parentalControl.hideBlockedChannels;
        
        // Afficher la configuration
        modal.querySelector('.pin-entry').style.display = 'none';
        const parentalSettings = modal.querySelector('.parental-settings');
        parentalSettings.style.display = 'block';
        parentalSettings.classList.remove('hidden');
        
        this.updateBlockedCategoriesList();
        this.app.ui.mettreAJourAffichageUtilisateur();
    }

    // Sauvegarder les paramètres de contrôle parental
    saveParentalSettings() {
        const modal = document.getElementById('parentalModal');
        const enableToggle = modal.querySelector('#enableParentalControl');
        const ageLimitSelect = modal.querySelector('#ageRating');
        const hideBlockedToggle = modal.querySelector('#hideBlockedChannels');
        
        // Vérifier que les éléments existent
        if (!enableToggle || !ageLimitSelect || !hideBlockedToggle) {
            console.error('Éléments de contrôle parental non trouvés');
            this.app.notifications.showNotification('Erreur: Éléments du formulaire non trouvés', 'error');
            return;
        }
        
        // Validation du PIN si le contrôle parental est activé
        if (enableToggle.checked) {
            if (!this.app.parentalControl.pin) {
                this.app.notifications.showNotification('Veuillez d\'abord définir un code PIN avec le bouton "Configurer le code PIN"', 'error');
                return;
            }
            this.app.parentalControl.enabled = true;
        } else {
            this.app.parentalControl.enabled = false;
        }
        
        this.app.parentalControl.ageLimit = parseInt(ageLimitSelect.value);
        this.app.parentalControl.hideBlockedChannels = hideBlockedToggle.checked;
        this.saveParentalControl();
        
        // Recharger l'affichage des chaînes et la navigation pour appliquer les nouveaux paramètres
        this.app.channelManager.renderChannels();
        this.app.channelManager.updateCategories();
        
        this.app.notifications.showNotification('Paramètres de contrôle parental sauvegardés', 'success');
        this.app.ui.fermerModal('parentalModal');
    }

    // Mettre à jour la liste des catégories bloquées
    updateBlockedCategoriesList() {
        const categoriesList = document.querySelector('#blockedCategories');
        if (!categoriesList) return;
        
        categoriesList.innerHTML = '';
        
        // Obtenir toutes les catégories disponibles
        const allCategories = [...new Set(this.app.channels.map(ch => ch.group).filter(cat => cat))];
        
        allCategories.forEach(category => {
            const isBlocked = this.app.parentalControl.blockedCategories.includes(category);
            const categoryEl = document.createElement('div');
            categoryEl.className = 'category-item';
            categoryEl.innerHTML = `
                <label>
                    <input type="checkbox" ${isBlocked ? 'checked' : ''} data-category="${category}">
                    ${category}
                </label>
            `;
            
            // Ajouter un gestionnaire d'événements pour la checkbox
            const checkbox = categoryEl.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', (e) => {
                this.toggleBlockedCategory(category, e.target.checked);
            });
            
            categoriesList.appendChild(categoryEl);
        });
    }

    // Basculer une catégorie bloquée
    toggleBlockedCategory(category, isBlocked) {
        if (isBlocked) {
            if (!this.app.parentalControl.blockedCategories.includes(category)) {
                this.app.parentalControl.blockedCategories.push(category);
            }
        } else {
            this.app.parentalControl.blockedCategories = this.app.parentalControl.blockedCategories.filter(cat => cat !== category);
        }
        this.saveParentalControl();
        
        // Recharger l'affichage des chaînes et la navigation pour appliquer immédiatement les changements
        this.app.channelManager.renderChannels();
        this.app.channelManager.updateCategories();
        
        // Notification pour informer l'utilisateur
        const action = isBlocked ? 'bloquée' : 'débloquée';
        this.app.notifications.showNotification(`Catégorie "${category}" ${action}`, 'info');
    }

    // Sauvegarder les paramètres de contrôle parental
    saveParentalControl() {
        localStorage.setItem('iptv_parental_control', JSON.stringify(this.app.parentalControl));
    }

    // Reverrouiller le contrôle parental manuellement
    relockParentalControl() {
        this.app.parentalControl.isUnlocked = false;
        this.app.parentalControl.unlockExpires = null;
        this.saveParentalControl();
        
        // Recharger l'affichage des chaînes et navigation
        this.app.channelManager.renderChannels();
        this.app.channelManager.updateCategories();
        
        // Mettre à jour le statut d'affichage
        this.updateParentalUnlockStatus();
        
        this.app.notifications.showNotification('Contrôle parental reverrouillé', 'success');
    }

    // Mettre à jour l'affichage du statut de déverrouillage
    updateParentalUnlockStatus() {
        const unlockStatus = document.getElementById('parentalUnlockStatus');
        if (!unlockStatus) return;
        
        const isUnlocked = this.app.parentalControl.enabled && 
                          this.app.parentalControl.isUnlocked && 
                          this.app.parentalControl.unlockExpires > Date.now();
        
        if (isUnlocked) {
            unlockStatus.style.display = 'block';
            // Mettre à jour le temps restant
            const remainingTime = Math.ceil((this.app.parentalControl.unlockExpires - Date.now()) / (1000 * 60));
            const statusText = unlockStatus.querySelector('div');
            if (statusText) {
                statusText.innerHTML = `
                    <span class="material-icons" style="vertical-align: middle;">lock_open</span>
                    Contrôle parental déverrouillé (${remainingTime} min restantes)
                `;
            }
        } else {
            unlockStatus.style.display = 'none';
            // Si le contrôle était déverrouillé mais a expiré, le reverrouiller automatiquement
            if (this.app.parentalControl.isUnlocked && this.app.parentalControl.unlockExpires <= Date.now()) {
                this.app.parentalControl.isUnlocked = false;
                this.app.parentalControl.unlockExpires = null;
                this.saveParentalControl();
                this.app.channelManager.renderChannels();
                this.app.channelManager.updateCategories();
            }
        }
    }

    // Démarrer le timer de vérification du contrôle parental
    startParentalControlTimer() {
        // Vérifier toutes les minutes si le déverrouillage a expiré
        setInterval(() => {
            this.updateParentalUnlockStatus();
        }, 60000); // 60 secondes
    }

    // Ouvrir la modal de contrôle parental en mode configuration
    openParentalControlModal() {
        // Si un PIN est configuré, demander d'abord la vérification
        if (this.app.parentalControl.pin) {
            this.requestParentalPin((success) => {
                if (success) {
                    this.setupParentalControl();
                    this.app.ui.ouvrirModal('parentalModal');
                }
            });
        } else {
            // Pas de PIN configuré, accès direct
            this.setupParentalControl();
            this.app.ui.ouvrirModal('parentalModal');
        }
    }

    // Afficher le modal de changement/configuration de PIN
    showChangePinModal() {
        const currentPinDiv = document.getElementById('currentPin').parentElement;
        const modalTitle = document.getElementById('changePinModalTitle');
        
        if (!this.app.parentalControl.pin) {
            // Première configuration - masquer le champ PIN actuel
            currentPinDiv.style.display = 'none';
            modalTitle.textContent = 'Configurer le code PIN';
        } else {
            // Modification - afficher le champ PIN actuel
            currentPinDiv.style.display = 'block';
            modalTitle.textContent = 'Modifier le code PIN';
        }
        
        // Vider tous les champs
        document.getElementById('currentPin').value = '';
        document.getElementById('newPinChange').value = '';
        document.getElementById('confirmPinChange').value = '';
        
        this.app.ui.ouvrirModal('changePinModal');
        
        // Focus sur le bon champ
        setTimeout(() => {
            if (this.app.parentalControl.pin) {
                document.getElementById('currentPin').focus();
            } else {
                document.getElementById('newPinChange').focus();
            }
        }, 100);
    }

    // Sauvegarder le nouveau PIN
    saveNewPin() {
        const currentPinInput = document.getElementById('currentPin');
        const newPinInput = document.getElementById('newPinChange');
        const confirmPinInput = document.getElementById('confirmPinChange');
        
        if (!currentPinInput || !newPinInput || !confirmPinInput) {
            this.app.notifications.showNotification('Erreur: éléments du formulaire non trouvés', 'error');
            return;
        }
        
        const currentPin = currentPinInput.value;
        const newPin = newPinInput.value;
        const confirmPin = confirmPinInput.value;
        
        // Si aucun PIN n'est configuré, permettre la première configuration
        if (this.app.parentalControl.pin) {
            // Vérifications pour modification d'un PIN existant
            if (!currentPin || currentPin.length !== 4) {
                this.app.notifications.showNotification('Veuillez entrer votre code PIN actuel', 'error');
                currentPinInput.focus();
                return;
            }
            
            if (currentPin !== this.app.parentalControl.pin) {
                this.app.notifications.showNotification('Code PIN actuel incorrect', 'error');
                currentPinInput.focus();
                return;
            }
        }
        
        if (!newPin || newPin.length !== 4) {
            this.app.notifications.showNotification('Le nouveau PIN doit contenir 4 chiffres', 'error');
            newPinInput.focus();
            return;
        }
        
        if (newPin !== confirmPin) {
            this.app.notifications.showNotification('Les nouveaux codes PIN ne correspondent pas', 'error');
            confirmPinInput.focus();
            return;
        }
        
        if (newPin === currentPin) {
            this.app.notifications.showNotification('Le nouveau PIN doit être différent de l\'ancien', 'error');
            newPinInput.focus();
            return;
        }
        
        // Déterminer si c'est une première configuration ou une modification
        const isFirstTime = !this.app.parentalControl.pin;
        
        // Sauvegarder le nouveau PIN
        this.app.parentalControl.pin = newPin;
        this.saveParentalControl();
        
        // Nettoyer les champs
        currentPinInput.value = '';
        newPinInput.value = '';
        confirmPinInput.value = '';
        
        // Fermer le modal et afficher le succès
        this.app.ui.fermerModal('changePinModal');
        this.app.notifications.showNotification(
            isFirstTime ? 'Code PIN configuré avec succès' : 'Code PIN modifié avec succès', 
            'success'
        );
    }
}