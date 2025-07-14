export class UserManager {
    constructor(app) {
        this.app = app;
        console.log('👤 UserManager initialisé');
    }

    // Afficher la liste des utilisateurs pour changement
    showUserSwitcher() {
        console.log('🔄 Début showUserSwitcher');
        
        // Attendre que le DOM soit prêt si nécessaire
        const tryShowUsers = () => {
            const usersList = document.getElementById('usersList');
            if (!usersList) {
                console.error('❌ Élément usersList non trouvé dans le DOM');
                // Essayer à nouveau après un court délai
                setTimeout(tryShowUsers, 100);
                return;
            }
            
            console.log('✅ Élément usersList trouvé, génération de la liste');
            console.log('📊 Nombre d\'utilisateurs:', this.app.users.length);
            
            usersList.innerHTML = '';
            this.app.users.forEach((user, index) => {
                console.log(`👤 Création item pour utilisateur ${index + 1}:`, user.name, '- Actif:', user.isActive);
                
                const userItem = document.createElement('div');
                userItem.className = `user-item ${user.isActive ? 'active' : ''}`;
                userItem.innerHTML = `
                    <div class="user-info">
                        <span class="material-icons user-avatar">${user.avatar || 'account_circle'}</span>
                        <div class="user-details">
                            <div class="user-name">${this.app.escapeHtml(user.name)}</div>
                            <div class="user-type">${this.getUserTypeLabel(user.type)}</div>
                        </div>
                    </div>
                    <div class="user-actions">
                        ${!user.isActive ? `<button class="btn btn-sm btn-primary user-switch-btn" data-user-id="${user.id}">Changer</button>` : '<span class="active-badge">Actuel</span>'}
                        ${user.id !== 'default' ? `<button class="btn btn-sm btn-danger user-delete-btn" data-user-id="${user.id}" title="Supprimer"><span class="material-icons">delete</span></button>` : ''}
                    </div>
                `;
                usersList.appendChild(userItem);
            });
            
            // Ajouter les gestionnaires d'événements pour les boutons
            const switchBtns = usersList.querySelectorAll('.user-switch-btn');
            const deleteBtns = usersList.querySelectorAll('.user-delete-btn');
            
            console.log(`🎯 Ajout de ${switchBtns.length} gestionnaires de changement`);
            console.log(`🗑️ Ajout de ${deleteBtns.length} gestionnaires de suppression`);
            
            switchBtns.forEach((btn, index) => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const userId = btn.getAttribute('data-user-id');
                    console.log('🔄 Clic changement utilisateur détecté pour:', userId);
                    this.switchToUser(userId);
                });
            });
            
            deleteBtns.forEach((btn, index) => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const userId = btn.getAttribute('data-user-id');
                    console.log('🗑️ Clic suppression utilisateur détecté pour:', userId);
                    this.deleteUser(userId);
                });
            });
            
            console.log('✅ showUserSwitcher terminé avec succès');
        };
        
        tryShowUsers();
    }

    // Obtenir le libellé du type d'utilisateur
    getUserTypeLabel(type) {
        const types = {
            'admin': 'Administrateur',
            'standard': 'Standard',
            'child': 'Enfant'
        };
        return types[type] || 'Standard';
    }

    // Changer d'utilisateur
    switchToUser(userId) {
        console.log('Tentative de changement d\'utilisateur vers:', userId);
        const newUser = this.app.users.find(u => u.id === userId);
        if (!newUser) {
            console.error('Utilisateur non trouvé:', userId);
            this.app.notifications.showNotification('Utilisateur non trouvé', 'error');
            return;
        }
        
        // Vérifier si l'utilisateur est déjà actif
        if (newUser.isActive) {
            console.log('L\'utilisateur est déjà actif');
            this.app.notifications.showNotification('Cet utilisateur est déjà connecté', 'info');
            return;
        }
        
        // Vérifier si un PIN est requis
        if (newUser.pin) {
            console.log('PIN requis pour l\'utilisateur:', newUser.name);
            this.requestUserPin(newUser, (success) => {
                if (success) {
                    this.performUserSwitch(newUser);
                }
            });
        } else {
            console.log('Changement d\'utilisateur sans PIN');
            this.performUserSwitch(newUser);
        }
    }

    // Effectuer le changement d'utilisateur
    performUserSwitch(newUser) {
        console.log('Exécution du changement d\'utilisateur vers:', newUser.name);
        
        // Désactiver l'utilisateur actuel
        this.app.users.forEach(u => u.isActive = false);
        
        // Activer le nouvel utilisateur
        newUser.isActive = true;
        this.app.currentUser = newUser;
        
        // Sauvegarder
        this.saveUsers();
        
        // Mettre à jour l'interface
        this.app.ui.mettreAJourAffichageUtilisateur();
        this.app.loadUserFavorites();
        this.app.channelManager.renderChannels();
        this.app.channelManager.updateCategories();
        
        // Mettre à jour la liste des utilisateurs
        this.showUserSwitcher();
        
        // Fermer le modal
        this.app.ui.fermerModal('userModal');
        
        this.app.notifications.showNotification(`Connecté en tant que ${newUser.name}`, 'success');
        console.log('Changement d\'utilisateur terminé avec succès');
    }

    // Demander le PIN utilisateur
    requestUserPin(user, callback) {
        // Créer un modal temporaire pour le PIN utilisateur
        const pinModal = document.createElement('div');
        pinModal.className = 'modal';
        pinModal.id = 'userPinModal';
        pinModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Authentification</h3>
                </div>
                <div class="modal-body">
                    <p>Entrez le PIN pour ${this.app.escapeHtml(user.name)}</p>
                    <div class="pin-input">
                        <input type="password" class="user-pin-input" maxlength="4" placeholder="0000">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary user-pin-cancel">Annuler</button>
                    <button class="btn btn-primary user-pin-validate">Valider</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(pinModal);
        pinModal.classList.remove('hidden');
        
        const pinInput = pinModal.querySelector('.user-pin-input');
        pinInput.focus();
        
        // Gestionnaires d'événements
        const cancelBtn = pinModal.querySelector('.user-pin-cancel');
        const validateBtn = pinModal.querySelector('.user-pin-validate');
        
        cancelBtn.addEventListener('click', () => {
            pinModal.remove();
            if (callback) callback(false);
        });
        
        validateBtn.addEventListener('click', () => {
            this.validateUserPin(user.id, pinInput.value, pinModal, callback);
        });
        
        // Validation sur Enter
        pinInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.validateUserPin(user.id, pinInput.value, pinModal, callback);
            }
        });
        
        this.app._userPinCallback = callback;
    }

    // Valider le PIN utilisateur
    validateUserPin(userId, enteredPin, modal, callback) {
        const user = this.app.users.find(u => u.id === userId);
        
        if (!user) {
            console.error('Utilisateur non trouvé pour validation PIN:', userId);
            modal.remove();
            if (callback) callback(false);
            return;
        }
        
        if (enteredPin === user.pin) {
            modal.remove();
            if (callback) {
                callback(true);
            }
        } else {
            this.app.notifications.showNotification('PIN incorrect', 'error');
            const pinInput = modal.querySelector('.user-pin-input');
            pinInput.value = '';
            pinInput.focus();
        }
    }

    // Ajouter un nouvel utilisateur
    saveNewUser() {
        const nameInput = document.getElementById('userName');
        const typeSelect = document.getElementById('userType');
        const pinInput = document.getElementById('userPin');
        const selectedAvatar = document.querySelector('.avatar-option.selected');
        
        if (!nameInput || !typeSelect || !selectedAvatar) {
            this.app.notifications.showNotification('Erreur: éléments du formulaire manquants', 'error');
            return;
        }
        
        const name = nameInput.value.trim();
        const type = typeSelect.value;
        const pin = pinInput.value.trim();
        const avatar = selectedAvatar.dataset.avatar;
        
        if (!name) {
            this.app.notifications.showNotification('Veuillez entrer un nom d\'utilisateur', 'error');
            nameInput.focus();
            return;
        }
        
        if (this.app.users.some(u => u.name.toLowerCase() === name.toLowerCase())) {
            this.app.notifications.showNotification('Ce nom d\'utilisateur existe déjà', 'error');
            nameInput.focus();
            return;
        }
        
        if (pin && pin.length !== 4) {
            this.app.notifications.showNotification('Le PIN doit contenir 4 chiffres', 'error');
            pinInput.focus();
            return;
        }
        
        // Créer le nouvel utilisateur
        const newUser = {
            id: 'user_' + Date.now(),
            name,
            type,
            avatar,
            pin: pin || null,
            isActive: false
        };
        
        this.app.users.push(newUser);
        this.saveUsers();
        
        // Nettoyer le formulaire
        nameInput.value = '';
        typeSelect.value = 'standard';
        pinInput.value = '';
        document.querySelectorAll('.avatar-option').forEach(opt => opt.classList.remove('selected'));
        document.querySelector('.avatar-option[data-avatar="account_circle"]').classList.add('selected');
        
        this.app.ui.fermerModal('addUserModal');
        this.showUserSwitcher();
        this.app.notifications.showNotification(`Utilisateur ${name} créé avec succès`, 'success');
    }

    // Supprimer un utilisateur
    deleteUser(userId) {
        if (userId === 'default') {
            this.app.notifications.showNotification('Impossible de supprimer l\'utilisateur par défaut', 'error');
            return;
        }
        
        const user = this.app.users.find(u => u.id === userId);
        if (!user) return;
        
        if (confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${user.name}" ?`)) {
            this.app.users = this.app.users.filter(u => u.id !== userId);
            
            // Si c'était l'utilisateur actuel, revenir au défaut
            if (user.isActive) {
                this.app.users[0].isActive = true;
                this.app.currentUser = this.app.users[0];
                this.app.ui.mettreAJourAffichageUtilisateur();
                this.app.loadUserFavorites();
                this.app.channelManager.renderChannels();
            }
            
            this.saveUsers();
            this.showUserSwitcher();
            this.app.notifications.showNotification(`Utilisateur ${user.name} supprimé`, 'success');
        }
    }

    // Sauvegarder les utilisateurs
    saveUsers() {
        localStorage.setItem('iptv_users', JSON.stringify(this.app.users));
    }
}