/**
 * Performance Manager - Core system for monitoring and optimizing Speed Rivals performance
 * Targets 60+ FPS across all platforms with automatic quality scaling
 */

class PerformanceManager {
    constructor() {
        this.isInitialized = false;

        // Performance metrics
        this.metrics = {
            fps: 60,
            frameTime: 16.67, // milliseconds
            memoryUsage: 0,
            drawCalls: 0,
            triangles: 0,
            lastFrameTime: 0,
            samples: []
        };

        // Quality settings
        this.qualityLevels = {
            LOW: {
                name: 'Low',
                targetFPS: 30,
                lodDistance: 50,
                shadowMapSize: 512,
                particleCount: 50,
                textureQuality: 0.5,
                antialiasing: false,
                postProcessing: false,
                maxLights: 2
            },
            MEDIUM: {
                name: 'Medium',
                targetFPS: 45,
                lodDistance: 100,
                shadowMapSize: 1024,
                particleCount: 100,
                textureQuality: 0.75,
                antialiasing: false,
                postProcessing: false,
                maxLights: 4
            },
            HIGH: {
                name: 'High',
                targetFPS: 60,
                lodDistance: 150,
                shadowMapSize: 2048,
                particleCount: 200,
                textureQuality: 1.0,
                antialiasing: true,
                postProcessing: true,
                maxLights: 6
            },
            ULTRA: {
                name: 'Ultra',
                targetFPS: 120,
                lodDistance: 250,
                shadowMapSize: 4096,
                particleCount: 500,
                textureQuality: 1.0,
                antialiasing: true,
                postProcessing: true,
                maxLights: 8
            }
        };

        this.currentQuality = this.qualityLevels.HIGH;
        this.adaptiveQuality = true;
        this.lastQualityChange = 0;

        // Platform detection
        this.platform = this.detectPlatform();
        this.deviceCapabilities = this.analyzeDeviceCapabilities();

        // Performance monitoring
        this.performanceObserver = null;
        this.frameTimeHistory = [];
        this.maxFrameHistory = 120; // 2 seconds at 60fps

        // Optimization systems
        this.lodManager = null;
        this.frustumCuller = null;
        this.objectPoolManager = null;
        this.memoryManager = null;
        this.assetLoader = null;

        // Event listeners
        this.onQualityChange = new Set();
        this.onPerformanceAlert = new Set();

        console.log('🚀 Performance Manager initialized');
        console.log(`Platform: ${this.platform.type} | GPU: ${this.platform.gpu}`);
    }

    init(renderer, scene, camera) {
        if (this.isInitialized) return;

        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;

        // Auto-detect optimal quality based on device capabilities
        this.currentQuality = this.getOptimalQualityForDevice();

        // Initialize monitoring
        this.initPerformanceMonitoring();

        // Apply initial quality settings
        this.applyQualitySettings();

        this.isInitialized = true;
        console.log(`✅ Performance Manager ready - Quality: ${this.currentQuality.name}`);
    }

    detectPlatform() {
        const ua = navigator.userAgent.toLowerCase();
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

        let platform = {
            type: 'desktop',
            isMobile: /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(ua),
            isTablet: /ipad|android(?!.*mobile)/.test(ua),
            isIOS: /iphone|ipad|ipod/.test(ua),
            isAndroid: /android/.test(ua),
            browser: this.getBrowser(),
            gpu: 'unknown',
            webgl2: !!gl && gl instanceof WebGL2RenderingContext,
            cores: navigator.hardwareConcurrency || 4,
            memory: navigator.deviceMemory || 4
        };

        if (platform.isMobile || platform.isTablet) {
            platform.type = platform.isTablet ? 'tablet' : 'mobile';
        }

        // GPU detection
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                platform.gpu = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            }
        }

        return platform;
    }

    getBrowser() {
        const ua = navigator.userAgent.toLowerCase();
        if (ua.includes('chrome')) return 'chrome';
        if (ua.includes('firefox')) return 'firefox';
        if (ua.includes('safari')) return 'safari';
        if (ua.includes('edge')) return 'edge';
        return 'unknown';
    }

    analyzeDeviceCapabilities() {
        const capabilities = {
            score: 0,
            tier: 'low', // low, medium, high, ultra
            reasons: []
        };

        // GPU analysis
        if (this.platform.gpu.toLowerCase().includes('nvidia')) {
            if (this.platform.gpu.includes('RTX') || this.platform.gpu.includes('GTX 16') || this.platform.gpu.includes('GTX 20')) {
                capabilities.score += 40;
                capabilities.reasons.push('High-end NVIDIA GPU');
            } else if (this.platform.gpu.includes('GTX')) {
                capabilities.score += 25;
                capabilities.reasons.push('Mid-range NVIDIA GPU');
            } else {
                capabilities.score += 15;
                capabilities.reasons.push('Entry-level NVIDIA GPU');
            }
        } else if (this.platform.gpu.toLowerCase().includes('amd') || this.platform.gpu.toLowerCase().includes('radeon')) {
            if (this.platform.gpu.includes('RX 6') || this.platform.gpu.includes('RX 7')) {
                capabilities.score += 35;
                capabilities.reasons.push('High-end AMD GPU');
            } else if (this.platform.gpu.includes('RX')) {
                capabilities.score += 20;
                capabilities.reasons.push('Mid-range AMD GPU');
            } else {
                capabilities.score += 12;
                capabilities.reasons.push('Entry-level AMD GPU');
            }
        } else if (this.platform.gpu.toLowerCase().includes('intel')) {
            capabilities.score += 8;
            capabilities.reasons.push('Integrated Intel GPU');
        }

        // Platform adjustments
        if (this.platform.type === 'mobile') {
            capabilities.score = Math.max(0, capabilities.score - 20);
            capabilities.reasons.push('Mobile device penalty');
        } else if (this.platform.type === 'tablet') {
            capabilities.score = Math.max(0, capabilities.score - 10);
            capabilities.reasons.push('Tablet device penalty');
        }

        // Memory consideration
        if (this.platform.memory >= 8) {
            capabilities.score += 10;
            capabilities.reasons.push('High memory available');
        } else if (this.platform.memory >= 4) {
            capabilities.score += 5;
            capabilities.reasons.push('Adequate memory');
        } else {
            capabilities.score -= 5;
            capabilities.reasons.push('Limited memory');
        }

        // CPU cores
        if (this.platform.cores >= 8) {
            capabilities.score += 8;
            capabilities.reasons.push('High core count');
        } else if (this.platform.cores >= 4) {
            capabilities.score += 4;
            capabilities.reasons.push('Adequate core count');
        }

        // WebGL2 support
        if (this.platform.webgl2) {
            capabilities.score += 5;
            capabilities.reasons.push('WebGL2 support');
        }

        // Determine tier
        if (capabilities.score >= 50) {
            capabilities.tier = 'ultra';
        } else if (capabilities.score >= 35) {
            capabilities.tier = 'high';
        } else if (capabilities.score >= 20) {
            capabilities.tier = 'medium';
        } else {
            capabilities.tier = 'low';
        }

        console.log(`Device Analysis: Score ${capabilities.score} -> ${capabilities.tier.toUpperCase()} tier`);
        console.log('Factors:', capabilities.reasons);

        return capabilities;
    }

    getOptimalQualityForDevice() {
        const tier = this.deviceCapabilities.tier;

        switch (tier) {
            case 'ultra':
                return this.qualityLevels.ULTRA;
            case 'high':
                return this.qualityLevels.HIGH;
            case 'medium':
                return this.qualityLevels.MEDIUM;
            default:
                return this.qualityLevels.LOW;
        }
    }

    initPerformanceMonitoring() {
        // Modern Performance Observer API
        if ('PerformanceObserver' in window) {
            this.performanceObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.entryType === 'measure') {
                        this.recordFrameTime(entry.duration);
                    }
                }
            });
            this.performanceObserver.observe({ entryTypes: ['measure'] });
        }

        // Memory monitoring (if available)
        if ('memory' in performance) {
            setInterval(() => {
                this.metrics.memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
            }, 1000);
        }
    }

    beginFrame() {
        if ('performance' in window && 'mark' in performance) {
            performance.mark('frame-start');
        }
        this.metrics.lastFrameTime = performance.now();
    }

    endFrame() {
        if ('performance' in window && 'mark' in performance) {
            performance.mark('frame-end');
            performance.measure('frame-time', 'frame-start', 'frame-end');
        }

        const now = performance.now();
        const frameTime = now - this.metrics.lastFrameTime;
        this.recordFrameTime(frameTime);

        // Update render info if available
        if (this.renderer && this.renderer.info) {
            this.metrics.drawCalls = this.renderer.info.render.calls;
            this.metrics.triangles = this.renderer.info.render.triangles;
        }
    }

    recordFrameTime(frameTime) {
        this.frameTimeHistory.push(frameTime);
        if (this.frameTimeHistory.length > this.maxFrameHistory) {
            this.frameTimeHistory.shift();
        }

        // Calculate average FPS over last second
        const recentFrames = this.frameTimeHistory.slice(-60);
        const avgFrameTime = recentFrames.reduce((a, b) => a + b, 0) / recentFrames.length;
        this.metrics.fps = 1000 / avgFrameTime;
        this.metrics.frameTime = avgFrameTime;

        // Check for performance issues
        if (this.adaptiveQuality) {
            this.checkPerformanceThresholds();
        }
    }

    checkPerformanceThresholds() {
        const now = performance.now();

        // Avoid too frequent quality changes
        if (now - this.lastQualityChange < 3000) return;

        const targetFPS = this.currentQuality.targetFPS;
        const currentFPS = this.metrics.fps;

        // Performance is significantly below target - reduce quality
        if (currentFPS < targetFPS * 0.8) {
            const currentIndex = Object.values(this.qualityLevels).indexOf(this.currentQuality);
            if (currentIndex > 0) {
                const newQuality = Object.values(this.qualityLevels)[currentIndex - 1];
                this.setQuality(newQuality);
                console.warn(`⚠️ Performance drop detected (${currentFPS.toFixed(1)}fps). Reducing quality to ${newQuality.name}`);
            }
        }
        // Performance is significantly above target - potentially increase quality
        else if (currentFPS > targetFPS * 1.3) {
            const currentIndex = Object.values(this.qualityLevels).indexOf(this.currentQuality);
            if (currentIndex < Object.values(this.qualityLevels).length - 1) {
                const newQuality = Object.values(this.qualityLevels)[currentIndex + 1];
                this.setQuality(newQuality);
                console.log(`✨ Performance headroom detected (${currentFPS.toFixed(1)}fps). Increasing quality to ${newQuality.name}`);
            }
        }
    }

    setQuality(quality) {
        if (quality === this.currentQuality) return;

        const oldQuality = this.currentQuality;
        this.currentQuality = quality;
        this.lastQualityChange = performance.now();

        this.applyQualitySettings();

        // Notify listeners
        this.onQualityChange.forEach(callback => {
            callback(quality, oldQuality);
        });
    }

    applyQualitySettings() {
        if (!this.renderer) return;

        const q = this.currentQuality;

        // Renderer settings
        this.renderer.setPixelRatio(
            q.textureQuality * Math.min(window.devicePixelRatio, 2)
        );

        // Shadow map size
        if (this.renderer.shadowMap) {
            this.renderer.shadowMap.mapSize.width = q.shadowMapSize;
            this.renderer.shadowMap.mapSize.height = q.shadowMapSize;
        }

        // Antialiasing
        if (this.renderer.antialias !== q.antialiasing) {
            console.log(`${q.antialiasing ? 'Enabling' : 'Disabling'} antialiasing`);
        }

        console.log(`🎨 Applied ${q.name} quality settings`);
    }

    // Utility methods for other systems
    shouldRenderObject(object, distance) {
        return distance <= this.currentQuality.lodDistance;
    }

    getParticleCount() {
        return this.currentQuality.particleCount;
    }

    getTextureQuality() {
        return this.currentQuality.textureQuality;
    }

    isPostProcessingEnabled() {
        return this.currentQuality.postProcessing;
    }

    getMaxLights() {
        return this.currentQuality.maxLights;
    }

    // Performance statistics
    getPerformanceStats() {
        return {
            ...this.metrics,
            quality: this.currentQuality.name,
            platform: this.platform,
            deviceScore: this.deviceCapabilities.score
        };
    }

    // Event handling
    onQualityChanged(callback) {
        this.onQualityChange.add(callback);
    }

    offQualityChanged(callback) {
        this.onQualityChange.delete(callback);
    }

    // Cleanup
    destroy() {
        if (this.performanceObserver) {
            this.performanceObserver.disconnect();
        }
        this.onQualityChange.clear();
        this.onPerformanceAlert.clear();
    }
}

// Export for use in other modules
window.PerformanceManager = PerformanceManager;