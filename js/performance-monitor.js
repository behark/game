/**
 * Performance Monitor - Real-time performance monitoring and adjustment for Speed Rivals
 * Continuously monitors and optimizes game performance to maintain target FPS
 */

class PerformanceMonitor {
    constructor(performanceManager) {
        this.performanceManager = performanceManager;

        // Monitoring configuration
        this.config = {
            targetFPS: 60,
            minAcceptableFPS: 45,
            measurementWindow: 120, // frames
            adjustmentInterval: 2000, // ms
            warningThreshold: 0.8, // 80% of target
            criticalThreshold: 0.6, // 60% of target
            adaptiveAdjustment: true,
            realTimeOptimization: true
        };

        // Performance metrics tracking
        this.metrics = {
            fps: [],
            frameTime: [],
            cpuTime: [],
            gpuTime: [],
            memory: [],
            drawCalls: [],
            triangles: [],
            timestamp: []
        };

        // Performance states
        this.performanceState = {
            current: 'optimal', // optimal, warning, critical, emergency
            trend: 'stable',    // improving, stable, degrading
            lastAdjustment: 0,
            adjustmentCount: 0,
            emergencyMode: false
        };

        // Optimization targets and actions
        this.optimizationTargets = {
            renderQuality: 1.0,
            particleDensity: 1.0,
            shadowQuality: 1.0,
            lodDistance: 1.0,
            effectsIntensity: 1.0,
            antialiasing: true,
            postProcessing: true
        };

        // Performance bottleneck detection
        this.bottleneckDetector = new BottleneckDetector();

        // Adaptive optimization system
        this.adaptiveOptimizer = new AdaptiveOptimizer(this);

        // Alert system
        this.alertSystem = new PerformanceAlertSystem();

        // Start monitoring
        this.startMonitoring();

        console.log('📊 Performance Monitor initialized');
        console.log(`Target: ${this.config.targetFPS}FPS | Min: ${this.config.minAcceptableFPS}FPS`);
    }

    /**
     * Start continuous performance monitoring
     */
    startMonitoring() {
        // Frame-by-frame monitoring
        this.frameMonitoringActive = true;
        this.monitorFrame();

        // Periodic analysis and adjustment
        this.analysisInterval = setInterval(() => {
            this.analyzePerformance();
        }, this.config.adjustmentInterval);

        // Real-time optimization
        if (this.config.realTimeOptimization) {
            this.startRealTimeOptimization();
        }

        console.log('🎯 Performance monitoring started');
    }

    /**
     * Monitor individual frame performance
     */
    monitorFrame() {
        if (!this.frameMonitoringActive) return;

        const frameStart = performance.now();

        // Get FPS from performance manager
        const fps = this.performanceManager?.metrics?.fps || 60;
        const frameTime = this.performanceManager?.metrics?.frameTime || 16.67;

        // Record metrics
        this.recordMetric('fps', fps);
        this.recordMetric('frameTime', frameTime);
        this.recordMetric('timestamp', frameStart);

        // Get additional metrics if available
        if (this.performanceManager?.renderer?.info) {
            const info = this.performanceManager.renderer.info;
            this.recordMetric('drawCalls', info.render.calls);
            this.recordMetric('triangles', info.render.triangles);
        }

        // Memory monitoring
        if ('memory' in performance) {
            this.recordMetric('memory', performance.memory.usedJSHeapSize / 1024 / 1024);
        }

        // Check for immediate performance issues
        this.checkImmediatePerformance(fps, frameTime);

        // Continue monitoring
        requestAnimationFrame(() => this.monitorFrame());
    }

    /**
     * Record performance metric with windowing
     */
    recordMetric(name, value) {
        if (!this.metrics[name]) {
            this.metrics[name] = [];
        }

        this.metrics[name].push(value);

        // Maintain window size
        if (this.metrics[name].length > this.config.measurementWindow) {
            this.metrics[name].shift();
        }
    }

    /**
     * Check for immediate performance issues requiring quick response
     */
    checkImmediatePerformance(fps, frameTime) {
        const targetFPS = this.config.targetFPS;

        // Emergency mode - FPS below critical threshold
        if (fps < targetFPS * this.config.criticalThreshold) {
            if (!this.performanceState.emergencyMode) {
                this.enterEmergencyMode();
            }
        }
        // Warning mode - FPS below warning threshold
        else if (fps < targetFPS * this.config.warningThreshold) {
            this.updatePerformanceState('warning');
        }
        // Optimal mode
        else if (fps >= targetFPS * 0.95) {
            this.updatePerformanceState('optimal');
            if (this.performanceState.emergencyMode) {
                this.exitEmergencyMode();
            }
        }
    }

    /**
     * Analyze performance trends and make adjustments
     */
    analyzePerformance() {
        const analysis = this.calculatePerformanceAnalysis();

        // Update performance state
        this.updatePerformanceTrend(analysis);

        // Detect bottlenecks
        const bottlenecks = this.bottleneckDetector.detect(this.metrics);

        // Apply adaptive optimizations
        if (this.config.adaptiveAdjustment) {
            this.adaptiveOptimizer.optimize(analysis, bottlenecks);
        }

        // Generate alerts if necessary
        this.alertSystem.checkAlerts(analysis, bottlenecks);

        // Log performance status
        this.logPerformanceStatus(analysis);
    }

    /**
     * Calculate comprehensive performance analysis
     */
    calculatePerformanceAnalysis() {
        const fps = this.metrics.fps;
        const frameTime = this.metrics.frameTime;
        const memory = this.metrics.memory;

        if (fps.length === 0) return null;

        const analysis = {
            avgFPS: this.calculateAverage(fps),
            minFPS: Math.min(...fps),
            maxFPS: Math.max(...fps),
            fpsStability: this.calculateStability(fps),
            avgFrameTime: this.calculateAverage(frameTime),
            frameTimeVariation: this.calculateVariation(frameTime),
            memoryUsage: memory.length > 0 ? memory[memory.length - 1] : 0,
            memoryTrend: this.calculateTrend(memory),
            performanceScore: 0,
            recommendations: []
        };

        // Calculate overall performance score (0-100)
        analysis.performanceScore = this.calculatePerformanceScore(analysis);

        // Generate recommendations
        analysis.recommendations = this.generateRecommendations(analysis);

        return analysis;
    }

    /**
     * Calculate performance score based on multiple factors
     */
    calculatePerformanceScore(analysis) {
        const targetFPS = this.config.targetFPS;

        // FPS score (0-40 points)
        const fpsScore = Math.min(40, (analysis.avgFPS / targetFPS) * 40);

        // Stability score (0-30 points)
        const stabilityScore = analysis.fpsStability * 30;

        // Memory efficiency score (0-20 points)
        const memoryScore = Math.max(0, 20 - (analysis.memoryUsage / 100) * 20);

        // Frame time consistency score (0-10 points)
        const consistencyScore = Math.max(0, 10 - analysis.frameTimeVariation);

        return Math.round(fpsScore + stabilityScore + memoryScore + consistencyScore);
    }

    /**
     * Generate optimization recommendations
     */
    generateRecommendations(analysis) {
        const recommendations = [];
        const targetFPS = this.config.targetFPS;

        if (analysis.avgFPS < targetFPS * 0.8) {
            recommendations.push({
                priority: 'high',
                category: 'rendering',
                action: 'reduce_render_quality',
                description: 'Reduce rendering quality to improve FPS'
            });
        }

        if (analysis.fpsStability < 0.8) {
            recommendations.push({
                priority: 'medium',
                category: 'stability',
                action: 'enable_frame_limiting',
                description: 'Enable frame rate limiting for better stability'
            });
        }

        if (analysis.memoryUsage > 500) {
            recommendations.push({
                priority: 'high',
                category: 'memory',
                action: 'memory_cleanup',
                description: 'Perform memory cleanup to reduce usage'
            });
        }

        if (analysis.frameTimeVariation > 5) {
            recommendations.push({
                priority: 'medium',
                category: 'optimization',
                action: 'reduce_complexity',
                description: 'Reduce scene complexity to improve frame consistency'
            });
        }

        return recommendations;
    }

    /**
     * Enter emergency performance mode
     */
    enterEmergencyMode() {
        console.warn('🚨 Entering emergency performance mode');

        this.performanceState.emergencyMode = true;
        this.performanceState.current = 'emergency';

        // Apply aggressive optimizations immediately
        this.optimizationTargets.renderQuality = 0.5;
        this.optimizationTargets.particleDensity = 0.3;
        this.optimizationTargets.shadowQuality = 0.25;
        this.optimizationTargets.lodDistance = 0.5;
        this.optimizationTargets.effectsIntensity = 0.2;
        this.optimizationTargets.antialiasing = false;
        this.optimizationTargets.postProcessing = false;

        // Apply changes immediately
        this.applyOptimizationTargets();

        // Notify performance manager
        this.performanceManager.onPerformanceAlert?.forEach(callback => {
            callback('emergency', this.calculatePerformanceAnalysis());
        });
    }

    /**
     * Exit emergency performance mode
     */
    exitEmergencyMode() {
        console.log('✅ Exiting emergency performance mode');

        this.performanceState.emergencyMode = false;

        // Gradually restore quality
        this.graduallyRestoreQuality();
    }

    /**
     * Apply optimization targets to the game
     */
    applyOptimizationTargets() {
        const targets = this.optimizationTargets;

        // Apply to performance manager quality settings
        if (this.performanceManager.currentQuality) {
            const quality = this.performanceManager.currentQuality;

            quality.textureQuality *= targets.renderQuality;
            quality.particleCount = Math.floor(quality.particleCount * targets.particleDensity);
            quality.shadowMapSize = Math.floor(quality.shadowMapSize * targets.shadowQuality);
            quality.lodDistance *= targets.lodDistance;

            if (!targets.antialiasing) {
                quality.antialiasing = false;
            }

            if (!targets.postProcessing) {
                quality.postProcessing = false;
            }

            // Apply quality changes
            this.performanceManager.applyQualitySettings();
        }

        console.log('🎛️ Applied optimization targets:', targets);
    }

    /**
     * Gradually restore quality when performance improves
     */
    graduallyRestoreQuality() {
        const restoreStep = 0.1;
        const interval = 1000;

        const restoreInterval = setInterval(() => {
            let restored = false;

            // Gradually increase quality targets
            Object.keys(this.optimizationTargets).forEach(key => {
                if (typeof this.optimizationTargets[key] === 'number') {
                    if (this.optimizationTargets[key] < 1.0) {
                        this.optimizationTargets[key] = Math.min(1.0,
                            this.optimizationTargets[key] + restoreStep);
                        restored = true;
                    }
                } else if (typeof this.optimizationTargets[key] === 'boolean') {
                    if (!this.optimizationTargets[key]) {
                        this.optimizationTargets[key] = true;
                        restored = true;
                    }
                }
            });

            if (restored) {
                this.applyOptimizationTargets();
            } else {
                clearInterval(restoreInterval);
                console.log('📈 Quality restoration complete');
            }

            // Check if performance is still good
            const currentFPS = this.performanceManager?.metrics?.fps || 60;
            if (currentFPS < this.config.targetFPS * 0.8) {
                console.log('⚠️ Performance degraded during restoration, stopping');
                clearInterval(restoreInterval);
            }
        }, interval);
    }

    /**
     * Start real-time optimization system
     */
    startRealTimeOptimization() {
        // Micro-adjustments every few frames
        let frameCount = 0;
        const optimizeFrame = () => {
            frameCount++;

            if (frameCount % 30 === 0) { // Every 30 frames (~0.5 seconds at 60fps)
                this.performMicroOptimizations();
            }

            if (this.config.realTimeOptimization) {
                requestAnimationFrame(optimizeFrame);
            }
        };

        requestAnimationFrame(optimizeFrame);
    }

    /**
     * Perform micro-optimizations based on current performance
     */
    performMicroOptimizations() {
        const currentFPS = this.performanceManager?.metrics?.fps || 60;
        const targetFPS = this.config.targetFPS;

        // Small adjustments to maintain target FPS
        if (currentFPS < targetFPS * 0.95) {
            // Slightly reduce quality
            this.optimizationTargets.particleDensity *= 0.98;
            this.optimizationTargets.effectsIntensity *= 0.99;
        } else if (currentFPS > targetFPS * 1.05) {
            // Slightly increase quality
            this.optimizationTargets.particleDensity = Math.min(1.0,
                this.optimizationTargets.particleDensity * 1.01);
            this.optimizationTargets.effectsIntensity = Math.min(1.0,
                this.optimizationTargets.effectsIntensity * 1.005);
        }
    }

    /**
     * Update performance state and trend
     */
    updatePerformanceState(newState) {
        if (this.performanceState.current !== newState) {
            console.log(`📊 Performance state: ${this.performanceState.current} → ${newState}`);
            this.performanceState.current = newState;
        }
    }

    updatePerformanceTrend(analysis) {
        if (!analysis || this.metrics.fps.length < 10) return;

        const recent = this.metrics.fps.slice(-10);
        const older = this.metrics.fps.slice(-20, -10);

        if (older.length === 0) return;

        const recentAvg = this.calculateAverage(recent);
        const olderAvg = this.calculateAverage(older);

        if (recentAvg > olderAvg * 1.05) {
            this.performanceState.trend = 'improving';
        } else if (recentAvg < olderAvg * 0.95) {
            this.performanceState.trend = 'degrading';
        } else {
            this.performanceState.trend = 'stable';
        }
    }

    /**
     * Utility functions for calculations
     */
    calculateAverage(array) {
        return array.length > 0 ? array.reduce((a, b) => a + b, 0) / array.length : 0;
    }

    calculateStability(array) {
        if (array.length < 2) return 1;

        const avg = this.calculateAverage(array);
        const variance = array.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / array.length;
        const stdDev = Math.sqrt(variance);

        return Math.max(0, 1 - (stdDev / avg));
    }

    calculateVariation(array) {
        if (array.length < 2) return 0;

        let totalVariation = 0;
        for (let i = 1; i < array.length; i++) {
            totalVariation += Math.abs(array[i] - array[i - 1]);
        }

        return totalVariation / (array.length - 1);
    }

    calculateTrend(array) {
        if (array.length < 2) return 'stable';

        const firstHalf = array.slice(0, Math.floor(array.length / 2));
        const secondHalf = array.slice(Math.floor(array.length / 2));

        const firstAvg = this.calculateAverage(firstHalf);
        const secondAvg = this.calculateAverage(secondHalf);

        if (secondAvg > firstAvg * 1.1) return 'increasing';
        if (secondAvg < firstAvg * 0.9) return 'decreasing';
        return 'stable';
    }

    /**
     * Log performance status
     */
    logPerformanceStatus(analysis) {
        if (!analysis || Math.random() > 0.1) return; // Log 10% of the time

        console.log(`📊 Performance: ${analysis.avgFPS.toFixed(1)}fps | Score: ${analysis.performanceScore} | State: ${this.performanceState.current} | Trend: ${this.performanceState.trend}`);

        if (analysis.recommendations.length > 0) {
            console.log('💡 Recommendations:', analysis.recommendations.map(r => r.action));
        }
    }

    /**
     * Get comprehensive performance report
     */
    getPerformanceReport() {
        const analysis = this.calculatePerformanceAnalysis();

        return {
            analysis,
            state: this.performanceState,
            targets: this.optimizationTargets,
            config: this.config,
            metricsCount: Object.values(this.metrics).reduce((sum, arr) => sum + arr.length, 0)
        };
    }

    /**
     * Stop monitoring
     */
    stopMonitoring() {
        this.frameMonitoringActive = false;

        if (this.analysisInterval) {
            clearInterval(this.analysisInterval);
        }

        this.config.realTimeOptimization = false;

        console.log('📊 Performance monitoring stopped');
    }

    /**
     * Dispose performance monitor
     */
    dispose() {
        this.stopMonitoring();

        // Clear metrics
        Object.keys(this.metrics).forEach(key => {
            this.metrics[key].length = 0;
        });

        // Dispose subsystems
        this.bottleneckDetector?.dispose();
        this.adaptiveOptimizer?.dispose();
        this.alertSystem?.dispose();

        console.log('📊 Performance Monitor disposed');
    }
}

/**
 * Bottleneck Detector
 */
class BottleneckDetector {
    detect(metrics) {
        const bottlenecks = [];

        // High draw calls
        if (metrics.drawCalls && metrics.drawCalls.length > 0) {
            const avgDrawCalls = metrics.drawCalls.reduce((a, b) => a + b, 0) / metrics.drawCalls.length;
            if (avgDrawCalls > 2000) {
                bottlenecks.push({
                    type: 'rendering',
                    severity: 'high',
                    description: 'High draw call count detected'
                });
            }
        }

        // Memory pressure
        if (metrics.memory && metrics.memory.length > 0) {
            const currentMemory = metrics.memory[metrics.memory.length - 1];
            if (currentMemory > 1000) { // 1GB
                bottlenecks.push({
                    type: 'memory',
                    severity: 'high',
                    description: 'High memory usage detected'
                });
            }
        }

        return bottlenecks;
    }

    dispose() {
        // Cleanup if needed
    }
}

/**
 * Adaptive Optimizer
 */
class AdaptiveOptimizer {
    constructor(monitor) {
        this.monitor = monitor;
        this.optimizationHistory = [];
    }

    optimize(analysis, bottlenecks) {
        // Apply optimizations based on analysis and bottlenecks
        for (const bottleneck of bottlenecks) {
            switch (bottleneck.type) {
                case 'rendering':
                    this.optimizeRendering();
                    break;
                case 'memory':
                    this.optimizeMemory();
                    break;
            }
        }
    }

    optimizeRendering() {
        this.monitor.optimizationTargets.renderQuality *= 0.95;
        this.monitor.optimizationTargets.particleDensity *= 0.9;
    }

    optimizeMemory() {
        this.monitor.optimizationTargets.particleDensity *= 0.8;
        this.monitor.optimizationTargets.effectsIntensity *= 0.85;
    }

    dispose() {
        this.optimizationHistory.length = 0;
    }
}

/**
 * Performance Alert System
 */
class PerformanceAlertSystem {
    constructor() {
        this.alertHistory = [];
    }

    checkAlerts(analysis, bottlenecks) {
        if (!analysis) return;

        // Critical FPS alert
        if (analysis.avgFPS < 30) {
            this.sendAlert('critical', 'FPS below 30', analysis);
        }

        // Memory warning
        if (analysis.memoryUsage > 800) {
            this.sendAlert('warning', 'High memory usage', analysis);
        }

        // Instability alert
        if (analysis.fpsStability < 0.7) {
            this.sendAlert('warning', 'FPS instability detected', analysis);
        }
    }

    sendAlert(level, message, data) {
        const alert = {
            level,
            message,
            timestamp: Date.now(),
            data
        };

        this.alertHistory.push(alert);
        console.log(`🚨 Performance Alert [${level.toUpperCase()}]: ${message}`);

        // Keep only recent alerts
        if (this.alertHistory.length > 100) {
            this.alertHistory.shift();
        }
    }

    dispose() {
        this.alertHistory.length = 0;
    }
}

// Export for use in other modules
window.PerformanceMonitor = PerformanceMonitor;