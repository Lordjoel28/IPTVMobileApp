/**
 * Gestionnaire de Buffer Adaptatif IPTV - Version Performance 2025
 * Optimisé pour minimiser le temps de démarrage
 */
export class AdaptiveBufferManager {
    constructor() {
        this.isEnabled = false;
        this.currentProfile = 'fast'; // fast, balanced, quality
        this.networkQuality = 'unknown';
        this.lastMeasurement = 0;
        
        // Profils optimisés pour IPTV en direct
        this.profiles = {
            fast: {
                // Démarrage ultra-rapide
                goalBuffer: 3,      // 3s au lieu de 30s
                maxBuffer: 8,       // 8s max
                backBuffer: 2,      // 2s arrière
                preload: 'none'     // Pas de preload
            },
            balanced: {
                // Équilibre performance/qualité
                goalBuffer: 6,
                maxBuffer: 15,
                backBuffer: 5,
                preload: 'metadata'
            },
            quality: {
                // Qualité maximale (seulement si demandé)
                goalBuffer: 10,
                maxBuffer: 20,
                backBuffer: 8,
                preload: 'metadata'
            }
        };
        
        console.log('🚀 AdaptiveBufferManager initialisé en mode performance');
    }
    
    /**
     * Détecte automatiquement le meilleur profil selon les conditions
     */
    detectOptimalProfile() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        
        // Prioriser toujours le démarrage rapide
        if (!connection || this.networkQuality === 'unknown') {
            return 'fast';
        }
        
        // Logique conservative pour IPTV
        const effectiveType = connection.effectiveType;
        const downlink = connection.downlink || 1;
        
        if (effectiveType === '4g' && downlink > 10) {
            return 'balanced';
        } else if (effectiveType === '3g' || downlink < 5) {
            return 'fast';
        }
        
        return 'fast'; // Par défaut toujours rapide
    }
    
    /**
     * Configure Video.js avec buffer minimal
     */
    configureVideoJS(options = {}) {
        const profile = this.profiles[this.currentProfile];
        
        return {
            ...options,
            preload: profile.preload,
            html5: {
                ...options.html5,
                vhs: {
                    ...options.html5?.vhs,
                    // Configuration buffer optimisée
                    GOAL_BUFFER_LENGTH: profile.goalBuffer,
                    MAX_GOAL_BUFFER_LENGTH: profile.maxBuffer,
                    BACK_BUFFER_LENGTH: profile.backBuffer,
                    // Optimisations IPTV
                    overrideNative: true,
                    enableLowInitialPlaylist: true,
                    smoothQualityChange: true
                }
            }
        };
    }
    
    /**
     * Configure HLS.js avec buffer minimal
     */
    configureHLSJS() {
        const profile = this.profiles[this.currentProfile];
        
        return {
            debug: false,
            enableWorker: true,
            lowLatencyMode: true, // Important pour IPTV
            
            // Buffer optimisé
            maxBufferLength: profile.goalBuffer,
            maxMaxBufferLength: profile.maxBuffer,
            maxBufferSize: 60 * 1000 * 1000, // 60MB max
            
            // Optimisations démarrage
            startFragPrefetch: false,
            testBandwidth: false, // Évite les tests au démarrage
            
            // Gestion réseau agressive
            manifestLoadingTimeOut: 5000,
            manifestLoadingMaxRetry: 2,
            manifestLoadingRetryDelay: 300,
            
            // ABR conservateur pour IPTV
            abrEwmaFastLive: 2.0,
            abrEwmaSlowLive: 5.0,
            abrMaxWithRealBitrate: false
        };
    }
    
    /**
     * Configure DASH.js avec buffer minimal
     */
    configureDASHJS() {
        const profile = this.profiles[this.currentProfile];
        
        return {
            debug: { logLevel: 'none' },
            streaming: {
                abr: {
                    autoSwitchBitrate: { video: true, audio: true },
                    bandwidthSafetyFactor: 0.9
                },
                buffer: {
                    bufferTimeAtTopQuality: profile.goalBuffer,
                    bufferTimeAtTopQualityLongForm: profile.maxBuffer,
                    initialBufferLevel: profile.goalBuffer / 2,
                    stableBufferTime: profile.goalBuffer,
                    bufferTimeDefault: profile.goalBuffer
                },
                lowLatencyEnabled: true,
                jumpGaps: true,
                smallGapLimit: 0.5
            }
        };
    }
    
    /**
     * Active le buffer management seulement après le premier play
     */
    enableAfterFirstPlay(player) {
        if (this.isEnabled) return;
        
        console.log('📡 Activation buffer adaptatif après premier play');
        this.isEnabled = true;
        
        // Surveiller la qualité réseau
        this.monitorNetworkQuality(player);
        
        // Ajuster dynamiquement si nécessaire
        this.startAdaptiveMonitoring(player);
    }
    
    /**
     * Surveillance légère de la qualité réseau
     */
    monitorNetworkQuality(player) {
        if (!player) return;
        
        const checkInterval = 30000; // Vérifier toutes les 30s seulement
        
        setInterval(() => {
            try {
                // Mesure basique sans impact performance
                const videoElement = player.el()?.querySelector('video');
                if (!videoElement) return;
                
                const buffered = videoElement.buffered;
                const currentTime = videoElement.currentTime;
                
                if (buffered.length > 0) {
                    const bufferAhead = buffered.end(buffered.length - 1) - currentTime;
                    
                    // Ajustement minimal seulement en cas de problème
                    if (bufferAhead < 1 && this.currentProfile === 'fast') {
                        console.log('📊 Basculement vers profil balanced');
                        this.currentProfile = 'balanced';
                    }
                }
            } catch (error) {
                // Ignore silencieusement pour éviter les logs
            }
        }, checkInterval);
    }
    
    /**
     * Monitoring adaptatif ultra-léger
     */
    startAdaptiveMonitoring(player) {
        // Monitoring minimal pour éviter l'impact performance
        const lightMonitoring = () => {
            if (!this.isEnabled || !player) return;
            
            // Vérification très basique de la santé du buffer
            try {
                const videoElement = player.el()?.querySelector('video');
                if (videoElement && videoElement.readyState >= 2) {
                    // Tout va bien, pas d'action nécessaire
                    this.lastMeasurement = Date.now();
                }
            } catch (error) {
                // Ignore
            }
        };
        
        // Vérification toutes les 60 secondes seulement
        setInterval(lightMonitoring, 60000);
    }
    
    /**
     * Désactive complètement le buffer management
     */
    disable() {
        this.isEnabled = false;
        this.currentProfile = 'fast';
        console.log('⏹️ Buffer management désactivé');
    }
    
    /**
     * Retourne la configuration actuelle
     */
    getCurrentConfig() {
        return {
            enabled: this.isEnabled,
            profile: this.currentProfile,
            settings: this.profiles[this.currentProfile]
        };
    }
}