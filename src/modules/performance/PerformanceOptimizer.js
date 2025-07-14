export class PerformanceOptimizer {
    constructor() {
        this.pools = new Map();
        this.metrics = {
            renderTimes: [],
            memorySnapshots: [],
            scrollPerformance: []
        };
        this.isMonitoring = false;
        
        console.log('⚡ PerformanceOptimizer initialisé');
    }
    
    // === OBJECT POOLING ===
    
    static createPool(poolName, createFn, resetFn = null) {
        const pool = {
            available: [],
            inUse: new Set(),
            createFn,
            resetFn,
            totalCreated: 0,
            recycled: 0
        };
        
        this.pools = this.pools || new Map();
        this.pools.set(poolName, pool);
        
        console.log(`🏊 Pool créé: ${poolName}`);
        return pool;
    }
    
    static getFromPool(poolName, ...args) {
        const pool = this.pools?.get(poolName);
        if (!pool) {
            console.warn(`⚠️ Pool inexistant: ${poolName}`);
            return null;
        }
        
        let obj;
        if (pool.available.length > 0) {
            obj = pool.available.pop();
            pool.recycled++;
            console.log(`♻️ Objet recyclé du pool: ${poolName}`);
        } else {
            obj = pool.createFn(...args);
            pool.totalCreated++;
            console.log(`🆕 Nouvel objet créé pour le pool: ${poolName}`);
        }
        
        pool.inUse.add(obj);
        return obj;
    }
    
    static returnToPool(poolName, obj) {
        const pool = this.pools?.get(poolName);
        if (!pool || !pool.inUse.has(obj)) {
            console.warn(`⚠️ Objet non trouvé dans le pool: ${poolName}`);
            return;
        }
        
        pool.inUse.delete(obj);
        
        // Nettoyer l'objet si une fonction de reset existe
        if (pool.resetFn) {
            pool.resetFn(obj);
        }
        
        pool.available.push(obj);
        console.log(`🔄 Objet retourné au pool: ${poolName}`);
    }
    
    static getPoolStats(poolName) {
        const pool = this.pools?.get(poolName);
        if (!pool) return null;
        
        return {
            available: pool.available.length,
            inUse: pool.inUse.size,
            totalCreated: pool.totalCreated,
            recycled: pool.recycled,
            reuseRate: pool.totalCreated > 0 ? (pool.recycled / pool.totalCreated * 100).toFixed(1) : 0
        };
    }
    
    // === THROTTLING ET DEBOUNCING ===
    
    static throttle(func, delay) {
        let timeoutId;
        let lastExecTime = 0;
        
        return function throttled(...args) {
            const currentTime = performance.now();
            
            if (currentTime - lastExecTime > delay) {
                func.apply(this, args);
                lastExecTime = currentTime;
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                    lastExecTime = performance.now();
                }, delay - (currentTime - lastExecTime));
            }
        };
    }
    
    static debounce(func, delay) {
        let timeoutId;
        
        return function debounced(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }
    
    static rafThrottle(func) {
        let rafId;
        let pending = false;
        
        return function rafThrottled(...args) {
            if (!pending) {
                pending = true;
                rafId = requestAnimationFrame(() => {
                    func.apply(this, args);
                    pending = false;
                });
            }
        };
    }
    
    // === MESURES DE PERFORMANCE ===
    
    static measureRenderTime(name, fn) {
        const startTime = performance.now();
        const result = fn();
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        // Stocker la métrique
        if (!this.metrics) this.metrics = { renderTimes: [] };
        this.metrics.renderTimes.push({
            name,
            time: renderTime,
            timestamp: Date.now()
        });
        
        // Garder seulement les 100 dernières mesures
        if (this.metrics.renderTimes.length > 100) {
            this.metrics.renderTimes.shift();
        }
        
        console.log(`⏱️ ${name}: ${renderTime.toFixed(2)}ms`);
        
        // Alerte si performance dégradée
        if (renderTime > 16.67) { // Plus de 60 FPS
            console.warn(`🐌 Performance dégradée: ${name} (${renderTime.toFixed(2)}ms)`);
        }
        
        return result;
    }
    
    static async measureAsyncRenderTime(name, fn) {
        const startTime = performance.now();
        const result = await fn();
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        console.log(`⏱️ ${name} (async): ${renderTime.toFixed(2)}ms`);
        return result;
    }
    
    static trackMemoryUsage() {
        if (!performance.memory) {
            console.warn('⚠️ performance.memory non disponible');
            return null;
        }
        
        const memoryInfo = {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit,
            timestamp: Date.now()
        };
        
        // Stocker la métrique
        if (!this.metrics) this.metrics = { memorySnapshots: [] };
        this.metrics.memorySnapshots.push(memoryInfo);
        
        // Garder seulement les 50 derniers snapshots
        if (this.metrics.memorySnapshots.length > 50) {
            this.metrics.memorySnapshots.shift();
        }
        
        const usedMB = (memoryInfo.used / 1024 / 1024).toFixed(2);
        const totalMB = (memoryInfo.total / 1024 / 1024).toFixed(2);
        
        console.log(`🧠 Mémoire: ${usedMB}MB / ${totalMB}MB`);
        
        return memoryInfo;
    }
    
    static measureScrollPerformance(scrollContainer) {
        let frameCount = 0;
        let lastTime = performance.now();
        let isScrolling = false;
        
        const measureFrame = () => {
            if (isScrolling) {
                frameCount++;
                requestAnimationFrame(measureFrame);
            } else {
                const endTime = performance.now();
                const duration = endTime - lastTime;
                const fps = frameCount / (duration / 1000);
                
                console.log(`🎯 Scroll FPS: ${fps.toFixed(1)}`);
                
                // Stocker la métrique
                if (!this.metrics) this.metrics = { scrollPerformance: [] };
                this.metrics.scrollPerformance.push({
                    fps,
                    duration,
                    frameCount,
                    timestamp: Date.now()
                });
                
                if (fps < 30) {
                    console.warn(`🐌 Scroll performance dégradée: ${fps.toFixed(1)} FPS`);
                }
            }
        };
        
        const startScrollMeasure = () => {
            if (!isScrolling) {
                isScrolling = true;
                frameCount = 0;
                lastTime = performance.now();
                requestAnimationFrame(measureFrame);
            }
        };
        
        const stopScrollMeasure = PerformanceOptimizer.debounce(() => {
            isScrolling = false;
        }, 100);
        
        scrollContainer.addEventListener('scroll', () => {
            startScrollMeasure();
            stopScrollMeasure();
        }, { passive: true });
        
        return {
            startScrollMeasure,
            stopScrollMeasure
        };
    }
    
    // === OPTIMISATIONS DOM ===
    
    static batchDOMUpdates(updates) {
        return new Promise(resolve => {
            requestAnimationFrame(() => {
                const startTime = performance.now();
                updates.forEach(update => update());
                const endTime = performance.now();
                
                console.log(`🔄 Batch DOM update: ${(endTime - startTime).toFixed(2)}ms`);
                resolve();
            });
        });
    }
    
    static createDocumentFragment(elements) {
        const fragment = document.createDocumentFragment();
        elements.forEach(element => fragment.appendChild(element));
        return fragment;
    }
    
    // === LAZY LOADING ===
    
    static createIntersectionObserver(callback, options = {}) {
        const defaultOptions = {
            root: null,
            rootMargin: '50px',
            threshold: 0.1
        };
        
        const finalOptions = { ...defaultOptions, ...options };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    callback(entry.target, entry);
                    observer.unobserve(entry.target);
                }
            });
        }, finalOptions);
        
        return observer;
    }
    
    static lazyLoadImages(container, selector = 'img[data-src]') {
        const images = container.querySelectorAll(selector);
        
        const imageObserver = this.createIntersectionObserver((img) => {
            img.src = img.dataset.src;
            img.classList.add('loaded');
            console.log(`🖼️ Image lazy-loadée: ${img.alt}`);
        });
        
        images.forEach(img => imageObserver.observe(img));
        
        return imageObserver;
    }
    
    // === MONITORING ET RAPPORTS ===
    
    static startMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        
        // Mesure périodique de la mémoire
        this.memoryInterval = setInterval(() => {
            this.trackMemoryUsage();
        }, 5000);
        
        // Observer les performances générales
        this.performanceObserver = new PerformanceObserver((list) => {
            list.getEntries().forEach(entry => {
                if (entry.entryType === 'measure') {
                    console.log(`📊 Performance: ${entry.name} - ${entry.duration.toFixed(2)}ms`);
                }
            });
        });
        
        this.performanceObserver.observe({ entryTypes: ['measure'] });
        
        console.log('👀 Monitoring de performance démarré');
    }
    
    static stopMonitoring() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        
        if (this.memoryInterval) {
            clearInterval(this.memoryInterval);
            this.memoryInterval = null;
        }
        
        if (this.performanceObserver) {
            this.performanceObserver.disconnect();
            this.performanceObserver = null;
        }
        
        console.log('🛑 Monitoring de performance arrêté');
    }
    
    static generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            renderTimes: this.metrics?.renderTimes || [],
            memorySnapshots: this.metrics?.memorySnapshots || [],
            scrollPerformance: this.metrics?.scrollPerformance || [],
            poolStats: {}
        };
        
        // Ajouter les stats des pools
        if (this.pools) {
            for (const [poolName, pool] of this.pools) {
                report.poolStats[poolName] = this.getPoolStats(poolName);
            }
        }
        
        // Calculer les moyennes
        if (report.renderTimes.length > 0) {
            const avgRenderTime = report.renderTimes.reduce((sum, rt) => sum + rt.time, 0) / report.renderTimes.length;
            report.avgRenderTime = avgRenderTime.toFixed(2);
        }
        
        if (report.memorySnapshots.length > 0) {
            const lastSnapshot = report.memorySnapshots[report.memorySnapshots.length - 1];
            report.currentMemory = (lastSnapshot.used / 1024 / 1024).toFixed(2) + 'MB';
        }
        
        console.log('📋 Rapport de performance généré:', report);
        return report;
    }
    
    // === UTILITAIRES ===
    
    static isHighPerformanceDevice() {
        return navigator.hardwareConcurrency >= 4 && 
               performance.memory && 
               performance.memory.jsHeapSizeLimit > 1000000000; // 1GB
    }
    
    static getOptimalSettings() {
        const isHighPerf = this.isHighPerformanceDevice();
        
        return {
            virtualization: {
                itemHeight: isHighPerf ? 180 : 160,
                overscan: isHighPerf ? 10 : 5,
                visibleItems: isHighPerf ? 100 : 50
            },
            scrolling: {
                throttleDelay: isHighPerf ? 8 : 16,
                debounceDelay: isHighPerf ? 100 : 200
            },
            rendering: {
                batchSize: isHighPerf ? 20 : 10,
                lazyLoadMargin: isHighPerf ? '100px' : '50px'
            }
        };
    }
    
    static cleanup() {
        this.stopMonitoring();
        
        // Nettoyer les pools
        if (this.pools) {
            this.pools.clear();
        }
        
        // Nettoyer les métriques
        if (this.metrics) {
            this.metrics.renderTimes = [];
            this.metrics.memorySnapshots = [];
            this.metrics.scrollPerformance = [];
        }
        
        console.log('🧹 PerformanceOptimizer nettoyé');
    }
}