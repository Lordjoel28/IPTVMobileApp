export class PerformanceMonitor {
    constructor() {
        this.measurements = new Map();
        this.thresholds = {
            parsing: {
                excellent: 1000, // < 1s pour 5000 chaînes
                good: 3000,      // < 3s pour 5000 chaînes
                poor: 8000       // > 8s pour 5000 chaînes
            },
            memory: {
                excellent: 10,   // < 10MB
                good: 25,        // < 25MB
                poor: 50         // > 50MB
            }
        };
        
        console.log('📊 PerformanceMonitor initialisé');
    }
    
    // Mesure de performance de parsing M3U
    static measureParsingPerformance(parser, content, label = 'default') {
        const beforeMemory = performance.memory?.usedJSHeapSize || 0;
        const startTime = performance.now();
        
        console.log(`🔍 Démarrage mesure parsing: ${label}`);
        
        const result = parser.parseM3U(content);
        
        const endTime = performance.now();
        const afterMemory = performance.memory?.usedJSHeapSize || 0;
        
        const metrics = {
            label,
            parseTime: endTime - startTime,
            memoryDelta: afterMemory - beforeMemory,
            channelsCount: result.length,
            channelsPerSecond: result.length / ((endTime - startTime) / 1000),
            memoryPerChannel: result.length > 0 ? (afterMemory - beforeMemory) / result.length : 0,
            timestamp: new Date().toISOString(),
            contentSize: content.length,
            contentSizeMB: content.length / 1024 / 1024
        };
        
        // Ajout des stats du parser s'il les expose
        if (typeof parser.getStats === 'function') {
            metrics.parserStats = parser.getStats();
        }
        
        console.log('📊 Métriques parsing M3U:');
        console.log(`⏱️  Temps: ${metrics.parseTime.toFixed(2)}ms`);
        console.log(`🧠 Mémoire: ${(metrics.memoryDelta / 1024 / 1024).toFixed(2)}MB`);
        console.log(`📺 Chaînes: ${metrics.channelsCount}`);
        console.log(`⚡ Vitesse: ${metrics.channelsPerSecond.toFixed(0)} chaînes/sec`);
        console.log(`📦 Contenu: ${metrics.contentSizeMB.toFixed(2)}MB`);
        
        if (metrics.parserStats) {
            console.log(`🔄 Pool efficiency: ${metrics.parserStats.poolEfficiency}%`);
            console.log(`📦 Cache efficiency: ${metrics.parserStats.cacheEfficiency}%`);
        }
        
        return metrics;
    }
    
    // Comparaison entre deux parsers
    static async compareParsingPerformance(parser1, parser2, content, label1 = 'Parser 1', label2 = 'Parser 2') {
        console.log(`⚔️ Comparaison parsing: ${label1} vs ${label2}`);
        
        // Mesure parser 1
        const metrics1 = this.measureParsingPerformance(parser1, content, label1);
        
        // Attendre un peu pour stabiliser la mémoire
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Mesure parser 2
        const metrics2 = this.measureParsingPerformance(parser2, content, label2);
        
        // Calcul des améliorations
        const timeImprovement = ((metrics1.parseTime - metrics2.parseTime) / metrics1.parseTime) * 100;
        const memoryImprovement = ((metrics1.memoryDelta - metrics2.memoryDelta) / metrics1.memoryDelta) * 100;
        const speedImprovement = ((metrics2.channelsPerSecond - metrics1.channelsPerSecond) / metrics1.channelsPerSecond) * 100;
        
        const comparison = {
            parser1: metrics1,
            parser2: metrics2,
            improvements: {
                timeReduction: Math.round(timeImprovement * 100) / 100,
                memoryReduction: Math.round(memoryImprovement * 100) / 100,
                speedIncrease: Math.round(speedImprovement * 100) / 100,
                speedup: Math.round((metrics1.parseTime / metrics2.parseTime) * 100) / 100
            },
            winner: timeImprovement > 0 ? label2 : label1
        };
        
        console.log('\n🏆 RÉSULTATS COMPARAISON:');
        console.log(`⏱️  Temps: ${comparison.improvements.timeReduction.toFixed(1)}% ${timeImprovement > 0 ? 'plus rapide' : 'plus lent'}`);
        console.log(`🧠 Mémoire: ${comparison.improvements.memoryReduction.toFixed(1)}% ${memoryImprovement > 0 ? 'moins utilisée' : 'plus utilisée'}`);
        console.log(`⚡ Vitesse: ${comparison.improvements.speedIncrease.toFixed(1)}% ${speedImprovement > 0 ? 'plus rapide' : 'plus lent'}`);
        console.log(`🚀 Speedup: ${comparison.improvements.speedup}x`);
        console.log(`🏅 Gagnant: ${comparison.winner}`);
        
        return comparison;
    }
    
    // Test de stress avec différentes tailles
    static async stressTestParsing(parser, sizes = [1000, 2000, 5000, 10000]) {
        console.log('🔥 Démarrage stress test parsing...');
        
        const results = [];
        
        for (const size of sizes) {
            console.log(`\n📊 Test avec ${size} chaînes...`);
            
            // Générer contenu de test
            const testContent = this.generateTestM3UContent(size);
            
            // Mesurer performance
            const metrics = this.measureParsingPerformance(parser, testContent, `${size} channels`);
            
            // Ajouter évaluation
            metrics.evaluation = this.evaluatePerformance(metrics, size);
            
            results.push(metrics);
            
            // Petit délai pour éviter la surcharge
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // Résumé du stress test
        this.displayStressTestSummary(results);
        
        return results;
    }
    
    // Génération de contenu M3U de test
    static generateTestM3UContent(channelCount) {
        const categories = [
            'Sport', 'News', 'Cinema', 'Music', 'Kids', 'Documentary', 
            'Culture', 'Entertainment', 'Cooking', 'Shopping', 'Adult',
            'International', 'Regional', 'Premium', 'Free'
        ];
        const countries = ['FR', 'EN', 'DE', 'ES', 'IT', 'NL', 'BE', 'PT', 'RU', 'US'];
        const languages = ['French', 'English', 'German', 'Spanish', 'Italian', 'Dutch', 'Portuguese', 'Russian'];
        
        let content = '#EXTM3U\n';
        
        for (let i = 0; i < channelCount; i++) {
            const category = categories[i % categories.length];
            const country = countries[i % countries.length];
            const language = languages[i % languages.length];
            
            // Varier la complexité des lignes EXTINF
            const complexity = i % 3;
            let extinf = `#EXTINF:-1 tvg-id="test${i}" tvg-name="Test Channel ${i}"`;
            
            if (complexity >= 1) {
                extinf += ` tvg-logo="https://example.com/logos/channel_${i}_logo.png"`;
                extinf += ` group-title="${category}"`;
            }
            
            if (complexity >= 2) {
                extinf += ` tvg-country="${country}" tvg-language="${language}"`;
                extinf += ` tvg-url="https://example.com/epg/guide_${i}.xml"`;
            }
            
            extinf += `,${category} ${country} - Test Channel ${i}`;
            
            content += extinf + '\n';
            content += `https://example.com/streams/channel_${i}.m3u8\n`;
        }
        
        console.log(`📄 Contenu M3U généré: ${channelCount} chaînes, ${(content.length / 1024 / 1024).toFixed(2)}MB`);
        return content;
    }
    
    // Évaluation de la performance
    static evaluatePerformance(metrics, channelCount) {
        const timePerChannel = metrics.parseTime / channelCount;
        const memoryMB = metrics.memoryDelta / 1024 / 1024;
        
        let timeScore = 'excellent';
        if (timePerChannel > 0.5) timeScore = 'good';
        if (timePerChannel > 1.5) timeScore = 'poor';
        
        let memoryScore = 'excellent';
        if (memoryMB > 10) memoryScore = 'good';
        if (memoryMB > 25) memoryScore = 'poor';
        
        let speedScore = 'excellent';
        if (metrics.channelsPerSecond < 2000) speedScore = 'good';
        if (metrics.channelsPerSecond < 1000) speedScore = 'poor';
        
        return {
            overall: this.getWorstScore([timeScore, memoryScore, speedScore]),
            time: timeScore,
            memory: memoryScore,
            speed: speedScore,
            timePerChannel: Math.round(timePerChannel * 100) / 100,
            memoryMB: Math.round(memoryMB * 100) / 100
        };
    }
    
    static getWorstScore(scores) {
        if (scores.includes('poor')) return 'poor';
        if (scores.includes('good')) return 'good';
        return 'excellent';
    }
    
    // Affichage du résumé du stress test
    static displayStressTestSummary(results) {
        console.log('\n📋 ===== RÉSUMÉ STRESS TEST PARSING =====');
        
        const totalChannels = results.reduce((sum, r) => sum + r.channelsCount, 0);
        const totalTime = results.reduce((sum, r) => sum + r.parseTime, 0);
        const avgSpeed = results.reduce((sum, r) => sum + r.channelsPerSecond, 0) / results.length;
        
        console.log(`📊 Total chaînes testées: ${totalChannels}`);
        console.log(`⏱️  Temps total: ${totalTime.toFixed(2)}ms`);
        console.log(`⚡ Vitesse moyenne: ${Math.round(avgSpeed)} chaînes/sec`);
        
        console.log('\n📈 DÉTAILS PAR TAILLE:');
        results.forEach(result => {
            const emoji = this.getEvaluationEmoji(result.evaluation.overall);
            console.log(`${emoji} ${result.channelsCount} chaînes: ${result.parseTime.toFixed(2)}ms (${Math.round(result.channelsPerSecond)} ch/s) - ${result.evaluation.overall}`);
        });
        
        // Détection de tendances
        const speedTrend = this.analyzeTrend(results.map(r => r.channelsPerSecond));
        const memoryTrend = this.analyzeTrend(results.map(r => r.memoryDelta / 1024 / 1024));
        
        console.log('\n📈 TENDANCES:');
        console.log(`⚡ Vitesse: ${speedTrend}`);
        console.log(`🧠 Mémoire: ${memoryTrend}`);
    }
    
    static getEvaluationEmoji(score) {
        switch (score) {
            case 'excellent': return '🟢';
            case 'good': return '🟡';
            case 'poor': return '🔴';
            default: return '⚪';
        }
    }
    
    static analyzeTrend(values) {
        if (values.length < 2) return 'insufficient data';
        
        const increases = values.slice(1).filter((val, i) => val > values[i]).length;
        const total = values.length - 1;
        const increaseRatio = increases / total;
        
        if (increaseRatio > 0.7) return 'croissante 📈';
        if (increaseRatio < 0.3) return 'décroissante 📉';
        return 'stable ➡️';
    }
    
    // Monitoring en temps réel
    static startRealTimeMonitoring(parser, interval = 5000) {
        console.log('👀 Démarrage monitoring temps réel...');
        
        const monitor = {
            isRunning: true,
            measurements: [],
            interval: null
        };
        
        monitor.interval = setInterval(() => {
            if (!monitor.isRunning) return;
            
            const memoryUsage = performance.memory?.usedJSHeapSize || 0;
            const timestamp = Date.now();
            
            const measurement = {
                timestamp,
                memoryUsage,
                memoryUsageMB: memoryUsage / 1024 / 1024
            };
            
            monitor.measurements.push(measurement);
            
            // Garder seulement les 100 dernières mesures
            if (monitor.measurements.length > 100) {
                monitor.measurements.shift();
            }
            
            console.log(`📊 Memory: ${measurement.memoryUsageMB.toFixed(2)}MB`);
            
        }, interval);
        
        monitor.stop = () => {
            monitor.isRunning = false;
            if (monitor.interval) {
                clearInterval(monitor.interval);
                monitor.interval = null;
            }
            console.log('🛑 Monitoring arrêté');
            return monitor.measurements;
        };
        
        return monitor;
    }
    
    // Rapport détaillé de performance
    static generatePerformanceReport(measurements, title = 'Performance Report') {
        const report = {
            title,
            timestamp: new Date().toISOString(),
            summary: {
                totalMeasurements: measurements.length,
                avgParseTime: 0,
                avgMemoryUsage: 0,
                avgChannelsPerSecond: 0,
                bestPerformance: null,
                worstPerformance: null
            },
            measurements,
            recommendations: []
        };
        
        if (measurements.length > 0) {
            // Calculs de moyennes
            report.summary.avgParseTime = measurements.reduce((sum, m) => sum + m.parseTime, 0) / measurements.length;
            report.summary.avgMemoryUsage = measurements.reduce((sum, m) => sum + (m.memoryDelta || 0), 0) / measurements.length;
            report.summary.avgChannelsPerSecond = measurements.reduce((sum, m) => sum + (m.channelsPerSecond || 0), 0) / measurements.length;
            
            // Meilleure et pire performance
            report.summary.bestPerformance = measurements.reduce((best, current) => 
                current.parseTime < best.parseTime ? current : best
            );
            report.summary.worstPerformance = measurements.reduce((worst, current) => 
                current.parseTime > worst.parseTime ? current : worst
            );
            
            // Recommandations
            report.recommendations = this.generateRecommendations(report.summary);
        }
        
        return report;
    }
    
    static generateRecommendations(summary) {
        const recommendations = [];
        
        if (summary.avgParseTime > 5000) {
            recommendations.push({
                type: 'performance',
                severity: 'high',
                message: 'Temps de parsing élevé. Considérer l\'optimisation du parser ou la réduction de la taille des playlists.'
            });
        }
        
        if (summary.avgMemoryUsage > 50 * 1024 * 1024) {
            recommendations.push({
                type: 'memory',
                severity: 'medium',
                message: 'Consommation mémoire élevée. Implémenter un nettoyage plus fréquent ou utiliser un streaming parser.'
            });
        }
        
        if (summary.avgChannelsPerSecond < 1000) {
            recommendations.push({
                type: 'speed',
                severity: 'medium',
                message: 'Vitesse de parsing faible. Vérifier les regex complexes et les allocations d\'objets.'
            });
        }
        
        return recommendations;
    }
    
    // Export des données pour analyse externe
    static exportMetrics(measurements, format = 'json') {
        switch (format) {
            case 'csv':
                return this.exportToCSV(measurements);
            case 'json':
            default:
                return JSON.stringify(measurements, null, 2);
        }
    }
    
    static exportToCSV(measurements) {
        if (measurements.length === 0) return '';
        
        const headers = Object.keys(measurements[0]).join(',');
        const rows = measurements.map(m => Object.values(m).join(','));
        
        return [headers, ...rows].join('\n');
    }
}