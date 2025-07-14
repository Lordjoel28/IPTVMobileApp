/**
 * Diagnostics avancés pour le Buffer Management
 * Outil de test et monitoring en temps réel
 */
export class BufferDiagnostics {
    constructor(player, bufferManager) {
        this.player = player;
        this.bufferManager = bufferManager;
        this.isActive = false;
        this.metrics = {
            startTime: null,
            firstBufferTime: null,
            firstPlayTime: null,
            bufferEvents: [],
            networkEvents: [],
            qualityChanges: []
        };
        
        this.diagnosticPanel = null;
        this.updateInterval = null;
        
        console.log('🔬 BufferDiagnostics initialisé');
    }
    
    /**
     * Démarre les diagnostics avec interface visuelle
     */
    startDiagnostics() {
        if (this.isActive) return;
        
        this.isActive = true;
        this.metrics.startTime = Date.now();
        
        // Créer l'interface de diagnostic
        this.createDiagnosticPanel();
        
        // Démarrer le monitoring
        this.startMonitoring();
        
        // Attacher les événements
        this.attachBufferEvents();
        
        console.log('🚀 Diagnostics buffer activés');
        this.showNotification('Diagnostics buffer activés', 'info');
    }
    
    /**
     * Arrête les diagnostics
     */
    stopDiagnostics() {
        if (!this.isActive) return;
        
        this.isActive = false;
        
        // Nettoyer l'interface
        if (this.diagnosticPanel) {
            this.diagnosticPanel.remove();
            this.diagnosticPanel = null;
        }
        
        // Arrêter le monitoring
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        console.log('⏹️ Diagnostics buffer arrêtés');
        this.showNotification('Diagnostics buffer arrêtés', 'info');
    }
    
    /**
     * Crée l'interface de diagnostic en temps réel
     */
    createDiagnosticPanel() {
        // Supprimer le panel existant
        const existing = document.getElementById('buffer-diagnostics');
        if (existing) existing.remove();
        
        this.diagnosticPanel = document.createElement('div');
        this.diagnosticPanel.id = 'buffer-diagnostics';
        this.diagnosticPanel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 350px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            z-index: 10000;
            border: 2px solid #00ff88;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        `;
        
        document.body.appendChild(this.diagnosticPanel);
        this.updateDiagnosticPanel();
    }
    
    /**
     * Met à jour l'interface en temps réel
     */
    updateDiagnosticPanel() {
        if (!this.diagnosticPanel || !this.player) return;
        
        const videoElement = this.player.el()?.querySelector('video');
        const bufferConfig = this.bufferManager.getCurrentConfig();
        
        let bufferInfo = 'N/A';
        let networkInfo = 'N/A';
        let qualityInfo = 'N/A';
        
        if (videoElement) {
            try {
                const buffered = videoElement.buffered;
                const currentTime = videoElement.currentTime;
                const duration = videoElement.duration;
                
                if (buffered.length > 0) {
                    const bufferStart = buffered.start(0);
                    const bufferEnd = buffered.end(buffered.length - 1);
                    const bufferAhead = bufferEnd - currentTime;
                    const bufferBehind = currentTime - bufferStart;
                    
                    bufferInfo = `
                        Ahead: ${bufferAhead.toFixed(1)}s
                        Behind: ${bufferBehind.toFixed(1)}s
                        Total: ${(bufferEnd - bufferStart).toFixed(1)}s
                        Progress: ${((currentTime / duration) * 100).toFixed(1)}%`;
                }
                
                // Informations réseau
                const connection = navigator.connection;
                if (connection) {
                    networkInfo = `
                        Type: ${connection.effectiveType || 'Unknown'}
                        Speed: ${connection.downlink || 'N/A'} Mbps
                        RTT: ${connection.rtt || 'N/A'}ms`;
                }
                
                // Informations qualité vidéo
                qualityInfo = `
                    ReadyState: ${videoElement.readyState}
                    Seeking: ${videoElement.seeking}
                    Paused: ${videoElement.paused}
                    Ended: ${videoElement.ended}`;
                    
            } catch (error) {
                bufferInfo = `Erreur: ${error.message}`;
            }
        }
        
        const uptime = this.metrics.startTime ? 
            ((Date.now() - this.metrics.startTime) / 1000).toFixed(1) : '0';
        
        this.diagnosticPanel.innerHTML = `
            <div style="border-bottom: 1px solid #00ff88; margin-bottom: 10px; padding-bottom: 5px;">
                <strong>🔬 BUFFER DIAGNOSTICS</strong>
                <button onclick="window.bufferDiagnostics?.stopDiagnostics()" 
                        style="float: right; background: #ff4444; border: none; color: white; padding: 2px 8px; border-radius: 3px; cursor: pointer;">×</button>
            </div>
            
            <div style="margin-bottom: 8px;">
                <strong style="color: #00ff88;">⚙️ Configuration:</strong><br>
                Profile: <span style="color: #ffdd00;">${bufferConfig.profile}</span><br>
                Enabled: <span style="color: ${bufferConfig.enabled ? '#00ff88' : '#ff4444'};">${bufferConfig.enabled}</span><br>
                Goal Buffer: <span style="color: #ffdd00;">${bufferConfig.settings?.goalBuffer || 'N/A'}s</span><br>
                Max Buffer: <span style="color: #ffdd00;">${bufferConfig.settings?.maxBuffer || 'N/A'}s</span>
            </div>
            
            <div style="margin-bottom: 8px;">
                <strong style="color: #00ff88;">📊 Buffer État:</strong><br>
                <pre style="margin: 0; font-size: 11px;">${bufferInfo}</pre>
            </div>
            
            <div style="margin-bottom: 8px;">
                <strong style="color: #00ff88;">🌐 Réseau:</strong><br>
                <pre style="margin: 0; font-size: 11px;">${networkInfo}</pre>
            </div>
            
            <div style="margin-bottom: 8px;">
                <strong style="color: #00ff88;">🎥 Vidéo:</strong><br>
                <pre style="margin: 0; font-size: 11px;">${qualityInfo}</pre>
            </div>
            
            <div style="margin-bottom: 8px;">
                <strong style="color: #00ff88;">⏱️ Métriques:</strong><br>
                Uptime: <span style="color: #ffdd00;">${uptime}s</span><br>
                Buffer Events: <span style="color: #ffdd00;">${this.metrics.bufferEvents.length}</span><br>
                Quality Changes: <span style="color: #ffdd00;">${this.metrics.qualityChanges.length}</span>
            </div>
            
            <div style="font-size: 10px; color: #888;">
                Last Update: ${new Date().toLocaleTimeString()}
            </div>
        `;
    }
    
    /**
     * Démarre le monitoring en temps réel
     */
    startMonitoring() {
        this.updateInterval = setInterval(() => {
            if (this.isActive) {
                this.updateDiagnosticPanel();
            }
        }, 1000); // Mise à jour chaque seconde
    }
    
    /**
     * Attache les événements de buffer pour monitoring
     */
    attachBufferEvents() {
        if (!this.player) return;
        
        const videoElement = this.player.el()?.querySelector('video');
        if (!videoElement) return;
        
        const events = [
            'loadstart', 'loadeddata', 'loadedmetadata', 'canplay', 'canplaythrough',
            'waiting', 'playing', 'seeking', 'seeked', 'stalled', 'suspend',
            'progress', 'timeupdate'
        ];
        
        events.forEach(eventName => {
            videoElement.addEventListener(eventName, (e) => {
                this.logBufferEvent(eventName, {
                    timestamp: Date.now(),
                    currentTime: videoElement.currentTime,
                    bufferedRanges: this.getBufferedRanges(videoElement),
                    readyState: videoElement.readyState
                });
            });
        });
        
        // Événements spécifiques au player
        this.player.on('firstplay', () => {
            this.metrics.firstPlayTime = Date.now();
            this.logBufferEvent('firstplay', { timestamp: Date.now() });
        });
        
        this.player.on('waiting', () => {
            this.logBufferEvent('waiting', { timestamp: Date.now() });
        });
        
        this.player.on('playing', () => {
            this.logBufferEvent('playing', { timestamp: Date.now() });
        });
    }
    
    /**
     * Enregistre un événement buffer
     */
    logBufferEvent(eventName, data) {
        const event = {
            name: eventName,
            ...data,
            relativeTime: this.metrics.startTime ? 
                (Date.now() - this.metrics.startTime) : 0
        };
        
        this.metrics.bufferEvents.push(event);
        
        // Garder seulement les 50 derniers événements
        if (this.metrics.bufferEvents.length > 50) {
            this.metrics.bufferEvents = this.metrics.bufferEvents.slice(-50);
        }
        
        console.log(`📊 Buffer Event [${eventName}]:`, data);
    }
    
    /**
     * Récupère les plages de buffer
     */
    getBufferedRanges(videoElement) {
        const ranges = [];
        if (videoElement.buffered) {
            for (let i = 0; i < videoElement.buffered.length; i++) {
                ranges.push({
                    start: videoElement.buffered.start(i),
                    end: videoElement.buffered.end(i)
                });
            }
        }
        return ranges;
    }
    
    /**
     * Test de performance du buffer
     */
    async runPerformanceTest() {
        console.log('🧪 Démarrage test de performance buffer...');
        
        const testResults = {
            startTime: Date.now(),
            initialLoadTime: null,
            firstBufferTime: null,
            firstPlayTime: null,
            bufferStalls: 0,
            averageBufferLevel: 0,
            networkQuality: null
        };
        
        // Simuler différentes conditions
        const testScenarios = [
            { name: 'Fast Start', profile: 'fast' },
            { name: 'Balanced', profile: 'balanced' },
            { name: 'Quality', profile: 'quality' }
        ];
        
        for (const scenario of testScenarios) {
            console.log(`🔄 Test scenario: ${scenario.name}`);
            
            // Changer le profil
            this.bufferManager.currentProfile = scenario.profile;
            
            // Mesurer les performances
            await this.measureScenarioPerformance(scenario);
        }
        
        console.log('✅ Test de performance terminé');
        return testResults;
    }
    
    /**
     * Mesure les performances d'un scénario
     */
    async measureScenarioPerformance(scenario) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            let resolved = false;
            
            const timeout = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    console.log(`⏰ Timeout pour scenario ${scenario.name}`);
                    resolve();
                }
            }, 10000); // 10s timeout
            
            // Attendre que le buffer soit stable
            const checkBuffer = () => {
                if (resolved) return;
                
                const videoElement = this.player?.el()?.querySelector('video');
                if (videoElement && videoElement.buffered.length > 0) {
                    const loadTime = Date.now() - startTime;
                    console.log(`✅ Scenario ${scenario.name} completed in ${loadTime}ms`);
                    
                    clearTimeout(timeout);
                    resolved = true;
                    resolve();
                } else {
                    setTimeout(checkBuffer, 100);
                }
            };
            
            checkBuffer();
        });
    }
    
    /**
     * Exporte les métriques pour analyse
     */
    exportMetrics() {
        const exportData = {
            ...this.metrics,
            bufferConfig: this.bufferManager.getCurrentConfig(),
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            connection: navigator.connection ? {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt
            } : null
        };
        
        // Créer un blob et télécharger
        const blob = new Blob([JSON.stringify(exportData, null, 2)], 
            { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `buffer-diagnostics-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        console.log('📁 Métriques exportées');
    }
    
    /**
     * Affiche une notification
     */
    showNotification(message, type = 'info') {
        // Utiliser le système de notification existant si disponible
        if (window.app?.notifications?.showNotification) {
            window.app.notifications.showNotification(message, type);
        } else {
            console.log(`📢 ${message}`);
        }
    }
}

// Exposition globale pour les tests manuels
window.BufferDiagnostics = BufferDiagnostics;