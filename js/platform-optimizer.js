/**
 * Platform Optimizer - Platform-specific optimizations for Speed Rivals
 * Optimizes performance for mobile, desktop, and web platforms
 */

class PlatformOptimizer {
    constructor(performanceManager) {
        this.performanceManager = performanceManager;
        this.platform = performanceManager.platform;

        // Platform-specific configurations
        this.platformConfigs = {
            mobile: {
                maxShadowMapSize: 512,
                maxLights: 2,
                particleCount: 50,
                lodDistance: 50,
                textureQuality: 0.5,
                antialiasing: false,
                postProcessing: false,
                instancingEnabled: false,
                frustumCulling: true,
                objectPooling: true,
                touchOptimizations: true,
                batteryOptimizations: true,
                memoryOptimizations: true
            },
            tablet: {
                maxShadowMapSize: 1024,
                maxLights: 4,
                particleCount: 100,
                lodDistance: 100,
                textureQuality: 0.75,
                antialiasing: false,
                postProcessing: false,
                instancingEnabled: true,
                frustumCulling: true,
                objectPooling: true,
                touchOptimizations: true,
                batteryOptimizations: true,
                memoryOptimizations: false
            },
            desktop: {
                maxShadowMapSize: 2048,
                maxLights: 6,
                particleCount: 200,
                lodDistance: 150,
                textureQuality: 1.0,
                antialiasing: true,
                postProcessing: true,
                instancingEnabled: true,
                frustumCulling: true,
                objectPooling: false,
                keyboardOptimizations: true,
                mouseOptimizations: true,
                memoryOptimizations: false
            }
        };

        // Browser-specific optimizations
        this.browserOptimizations = {
            chrome: {
                useWebAssembly: true,
                useWebWorkers: true,
                useSharedArrayBuffer: true,
                preferredTextureFormat: 'webp'
            },
            firefox: {
                useWebAssembly: true,
                useWebWorkers: true,
                useSharedArrayBuffer: false, // More conservative
                preferredTextureFormat: 'jpeg'
            },
            safari: {
                useWebAssembly: true,
                useWebWorkers: true,
                useSharedArrayBuffer: false,
                preferredTextureFormat: 'jpeg',
                conservativeMemory: true
            },
            edge: {
                useWebAssembly: true,
                useWebWorkers: true,
                useSharedArrayBuffer: true,
                preferredTextureFormat: 'webp'
            }
        };

        // Device-specific optimizations
        this.deviceOptimizations = new Map();

        // Performance thresholds for different platforms
        this.performanceThresholds = {
            mobile: { target: 30, minimum: 24 },
            tablet: { target: 45, minimum: 30 },
            desktop: { target: 60, minimum: 45 }
        };

        // Input optimization
        this.inputOptimizer = null;

        // Apply platform optimizations
        this.applyPlatformOptimizations();

        console.log(`🔧 Platform Optimizer initialized for ${this.platform.type}`);
    }

    /**
     * Apply optimizations based on detected platform
     */
    applyPlatformOptimizations() {
        const config = this.platformConfigs[this.platform.type] || this.platformConfigs.desktop;

        // Apply browser-specific optimizations
        this.applyBrowserOptimizations();

        // Apply device-specific optimizations
        this.applyDeviceOptimizations();

        // Setup input optimization
        this.setupInputOptimization();

        // Apply rendering optimizations
        this.applyRenderingOptimizations(config);

        // Apply memory optimizations
        if (config.memoryOptimizations) {
            this.applyMemoryOptimizations();
        }

        // Apply battery optimizations for mobile
        if (config.batteryOptimizations) {
            this.applyBatteryOptimizations();
        }

        console.log('✅ Platform optimizations applied');
    }

    /**
     * Apply browser-specific optimizations
     */
    applyBrowserOptimizations() {
        const browserConfig = this.browserOptimizations[this.platform.browser];
        if (!browserConfig) return;

        // WebAssembly optimizations
        if (browserConfig.useWebAssembly && 'WebAssembly' in window) {
            this.enableWebAssemblyOptimizations();
        }

        // Web Workers for background processing
        if (browserConfig.useWebWorkers && 'Worker' in window) {
            this.setupWebWorkers();
        }

        // SharedArrayBuffer for efficient data sharing
        if (browserConfig.useSharedArrayBuffer && 'SharedArrayBuffer' in window) {
            this.enableSharedArrayBuffer();
        }

        console.log(`🌐 Applied ${this.platform.browser} optimizations`);
    }

    /**
     * Apply device-specific optimizations
     */
    applyDeviceOptimizations() {
        const gpu = this.platform.gpu.toLowerCase();

        // NVIDIA optimizations
        if (gpu.includes('nvidia')) {
            this.applyNVIDIAOptimizations();
        }
        // AMD optimizations
        else if (gpu.includes('amd') || gpu.includes('radeon')) {
            this.applyAMDOptimizations();
        }
        // Intel optimizations
        else if (gpu.includes('intel')) {
            this.applyIntelOptimizations();
        }
        // Mobile GPU optimizations
        else if (this.platform.isMobile) {
            this.applyMobileGPUOptimizations();
        }

        // Memory-based optimizations
        this.applyMemoryBasedOptimizations();
    }

    /**
     * Setup input optimization based on platform
     */
    setupInputOptimization() {
        if (this.platform.isMobile || this.platform.isTablet) {
            this.setupTouchOptimizations();
        } else {
            this.setupDesktopInputOptimizations();
        }
    }

    /**
     * Apply rendering optimizations
     */
    applyRenderingOptimizations(config) {
        // This would be called by the main game system
        if (this.performanceManager.renderer) {
            const renderer = this.performanceManager.renderer;

            // Shadow map optimization
            if (renderer.shadowMap) {
                renderer.shadowMap.mapSize.width = config.maxShadowMapSize;
                renderer.shadowMap.mapSize.height = config.maxShadowMapSize;
            }

            // Pixel ratio optimization
            const pixelRatio = config.textureQuality * window.devicePixelRatio;
            renderer.setPixelRatio(Math.min(pixelRatio, 2));

            // Antialiasing
            if (!config.antialiasing && renderer.context) {
                // Disable MSAA for performance
                renderer.context.disable(renderer.context.SAMPLE_ALPHA_TO_COVERAGE);
            }
        }
    }

    /**
     * Apply NVIDIA GPU optimizations
     */
    applyNVIDIAOptimizations() {
        console.log('🎮 Applying NVIDIA GPU optimizations');

        // NVIDIA typically handles instancing well
        this.deviceOptimizations.set('instancing', true);
        this.deviceOptimizations.set('tessellation', true);
        this.deviceOptimizations.set('computeShaders', true);

        // Enable advanced lighting
        this.deviceOptimizations.set('advancedLighting', true);
    }

    /**
     * Apply AMD GPU optimizations
     */
    applyAMDOptimizations() {
        console.log('🔴 Applying AMD GPU optimizations');

        // AMD generally good with parallel processing
        this.deviceOptimizations.set('instancing', true);
        this.deviceOptimizations.set('asyncCompute', true);

        // Be conservative with tessellation on older AMD cards
        this.deviceOptimizations.set('tessellation', false);
    }

    /**
     * Apply Intel GPU optimizations
     */
    applyIntelOptimizations() {
        console.log('🔵 Applying Intel GPU optimizations');

        // Intel integrated graphics need conservative settings
        this.deviceOptimizations.set('instancing', false);
        this.deviceOptimizations.set('tessellation', false);
        this.deviceOptimizations.set('simpleShaders', true);
        this.deviceOptimizations.set('reducedPrecision', true);
    }

    /**
     * Apply mobile GPU optimizations
     */
    applyMobileGPUOptimizations() {
        console.log('📱 Applying mobile GPU optimizations');

        // Mobile GPUs have different characteristics
        this.deviceOptimizations.set('tileBasedRendering', true);
        this.deviceOptimizations.set('powerEfficiency', true);
        this.deviceOptimizations.set('bandwidthOptimized', true);

        // PowerVR optimizations
        if (this.platform.gpu.toLowerCase().includes('powervr')) {
            this.deviceOptimizations.set('deferredRendering', false);
            this.deviceOptimizations.set('earlyZ', true);
        }

        // Adreno optimizations
        if (this.platform.gpu.toLowerCase().includes('adreno')) {
            this.deviceOptimizations.set('halfPrecision', true);
            this.deviceOptimizations.set('compressedTextures', true);
        }

        // Mali optimizations
        if (this.platform.gpu.toLowerCase().includes('mali')) {
            this.deviceOptimizations.set('bandwidthConservation', true);
            this.deviceOptimizations.set('simplifiedShaders', true);
        }
    }

    /**
     * Apply memory-based optimizations
     */
    applyMemoryBasedOptimizations() {
        const memory = this.platform.memory || 4;

        if (memory < 4) {
            console.log('💾 Applying low-memory optimizations');
            this.deviceOptimizations.set('aggressiveCleanup', true);
            this.deviceOptimizations.set('reducedCaching', true);
            this.deviceOptimizations.set('streamingTextures', true);
        } else if (memory >= 16) {
            console.log('💾 Applying high-memory optimizations');
            this.deviceOptimizations.set('extendedCaching', true);
            this.deviceOptimizations.set('preloadAssets', true);
            this.deviceOptimizations.set('highQualityTextures', true);
        }
    }

    /**
     * Setup touch optimizations for mobile devices
     */
    setupTouchOptimizations() {
        console.log('👆 Setting up touch optimizations');

        // Reduce touch latency
        if ('touchstart' in window) {
            // Passive event listeners for better performance
            document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
            document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
            document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
        }

        // Optimize viewport for touch
        this.optimizeViewportForTouch();
    }

    /**
     * Setup desktop input optimizations
     */
    setupDesktopInputOptimizations() {
        console.log('⌨️ Setting up desktop input optimizations');

        // Optimize keyboard input
        this.setupKeyboardOptimizations();

        // Optimize mouse input
        this.setupMouseOptimizations();
    }

    /**
     * Apply memory optimizations
     */
    applyMemoryOptimizations() {
        console.log('🧠 Applying memory optimizations');

        // Aggressive garbage collection
        this.enableAggressiveGC();

        // Texture streaming
        this.enableTextureStreaming();

        // Object pooling
        this.enableObjectPooling();
    }

    /**
     * Apply battery optimizations for mobile
     */
    applyBatteryOptimizations() {
        console.log('🔋 Applying battery optimizations');

        // Reduce frame rate when inactive
        this.setupPowerManagement();

        // Reduce background processing
        this.optimizeBackgroundTasks();

        // Monitor battery level
        this.monitorBatteryLevel();
    }

    /**
     * Enable WebAssembly optimizations
     */
    enableWebAssemblyOptimizations() {
        console.log('⚡ Enabling WebAssembly optimizations');

        // This would load WASM modules for physics, AI, etc.
        this.wasmModules = {
            physics: null,
            ai: null,
            audio: null
        };

        // Load physics WASM module for heavy calculations
        this.loadPhysicsWASM();
    }

    /**
     * Setup Web Workers for background processing
     */
    setupWebWorkers() {
        console.log('👷 Setting up Web Workers');

        // AI worker for opponent AI calculations
        this.workers = {
            ai: new Worker('/js/workers/ai-worker.js'),
            physics: new Worker('/js/workers/physics-worker.js'),
            audio: new Worker('/js/workers/audio-worker.js')
        };

        // Setup message handlers
        this.setupWorkerCommunication();
    }

    /**
     * Enable SharedArrayBuffer for efficient data sharing
     */
    enableSharedArrayBuffer() {
        console.log('🔄 Enabling SharedArrayBuffer optimizations');

        // Create shared buffers for high-frequency data
        this.sharedBuffers = {
            carPositions: new SharedArrayBuffer(8 * 3 * 16), // 8 cars, 3 coords, 16 bytes each
            gameState: new SharedArrayBuffer(1024) // 1KB for game state
        };
    }

    /**
     * Handle touch events with optimizations
     */
    handleTouchStart(event) {
        // Optimized touch handling
        this.lastTouchTime = performance.now();
    }

    handleTouchMove(event) {
        // Throttle touch move events
        const now = performance.now();
        if (now - this.lastTouchTime < 16) { // ~60fps
            return;
        }
        this.lastTouchTime = now;

        // Process touch move
        if (this.touchMoveHandler) {
            this.touchMoveHandler(event);
        }
    }

    handleTouchEnd(event) {
        // Handle touch end
        if (this.touchEndHandler) {
            this.touchEndHandler(event);
        }
    }

    /**
     * Optimize viewport for touch interactions
     */
    optimizeViewportForTouch() {
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            viewport.content = 'width=device-width, initial-scale=1.0, user-scalable=no, maximum-scale=1.0, minimum-scale=1.0';
        }

        // Disable touch callouts and selections
        document.body.style.webkitTouchCallout = 'none';
        document.body.style.webkitUserSelect = 'none';
        document.body.style.mozUserSelect = 'none';
        document.body.style.msUserSelect = 'none';
        document.body.style.userSelect = 'none';
    }

    /**
     * Setup keyboard optimizations
     */
    setupKeyboardOptimizations() {
        // Anti-ghosting for gaming keyboards
        this.keyboardState = new Map();

        // Use RAF for key processing to sync with rendering
        this.processKeyboardInput = () => {
            if (this.keyboardInputHandler) {
                this.keyboardInputHandler(this.keyboardState);
            }
            requestAnimationFrame(this.processKeyboardInput);
        };

        requestAnimationFrame(this.processKeyboardInput);
    }

    /**
     * Setup mouse optimizations
     */
    setupMouseOptimizations() {
        // High-precision mouse input
        if ('requestPointerLock' in document.documentElement) {
            this.enablePointerLock();
        }

        // Raw input for better precision
        this.setupRawMouseInput();
    }

    /**
     * Load physics WASM module
     */
    async loadPhysicsWASM() {
        try {
            // This would load a compiled physics engine
            const wasmModule = await WebAssembly.instantiateStreaming(
                fetch('/wasm/physics.wasm')
            );
            this.wasmModules.physics = wasmModule;
            console.log('⚡ Physics WASM loaded');
        } catch (error) {
            console.log('Physics WASM not available, using JS fallback');
        }
    }

    /**
     * Setup worker communication
     */
    setupWorkerCommunication() {
        // AI Worker
        if (this.workers.ai) {
            this.workers.ai.onmessage = (event) => {
                this.handleAIWorkerMessage(event.data);
            };
        }

        // Physics Worker
        if (this.workers.physics) {
            this.workers.physics.onmessage = (event) => {
                this.handlePhysicsWorkerMessage(event.data);
            };
        }
    }

    /**
     * Monitor battery level for power management
     */
    monitorBatteryLevel() {
        if ('getBattery' in navigator) {
            navigator.getBattery().then((battery) => {
                this.battery = battery;

                battery.addEventListener('levelchange', () => {
                    this.adjustForBatteryLevel(battery.level);
                });

                battery.addEventListener('chargingchange', () => {
                    this.adjustForChargingState(battery.charging);
                });
            });
        }
    }

    /**
     * Adjust performance based on battery level
     */
    adjustForBatteryLevel(level) {
        if (level < 0.2) { // Below 20%
            console.log('🔋 Low battery detected, reducing performance');
            this.enablePowerSavingMode();
        } else if (level > 0.8) { // Above 80%
            this.disablePowerSavingMode();
        }
    }

    /**
     * Adjust performance based on charging state
     */
    adjustForChargingState(charging) {
        if (charging) {
            console.log('🔌 Device charging, allowing higher performance');
            this.disablePowerSavingMode();
        } else {
            console.log('🔋 Device on battery, enabling power saving');
            this.enablePowerSavingMode();
        }
    }

    /**
     * Enable power saving mode
     */
    enablePowerSavingMode() {
        // Reduce frame rate
        this.targetFrameRate = 30;

        // Reduce particle effects
        this.particleReduction = 0.5;

        // Disable non-essential features
        this.disableNonEssentialFeatures();
    }

    /**
     * Disable power saving mode
     */
    disablePowerSavingMode() {
        this.targetFrameRate = 60;
        this.particleReduction = 1.0;
        this.enableAllFeatures();
    }

    /**
     * Get platform-specific performance recommendations
     */
    getPerformanceRecommendations() {
        const config = this.platformConfigs[this.platform.type];
        const deviceOpts = Array.from(this.deviceOptimizations.entries());

        return {
            ...config,
            deviceOptimizations: Object.fromEntries(deviceOpts),
            recommendedWorkers: this.workers ? Object.keys(this.workers) : [],
            wasmSupport: Object.keys(this.wasmModules).filter(k => this.wasmModules[k] !== null)
        };
    }

    /**
     * Get platform capabilities
     */
    getCapabilities() {
        return {
            webAssembly: 'WebAssembly' in window,
            webWorkers: 'Worker' in window,
            sharedArrayBuffer: 'SharedArrayBuffer' in window,
            webGL2: this.platform.webgl2,
            touchSupport: 'ontouchstart' in window,
            batteryAPI: 'getBattery' in navigator,
            gamepadAPI: 'getGamepads' in navigator,
            fullscreenAPI: 'requestFullscreen' in document.documentElement
        };
    }

    /**
     * Dispose platform optimizer
     */
    dispose() {
        // Terminate workers
        if (this.workers) {
            Object.values(this.workers).forEach(worker => {
                worker.terminate();
            });
        }

        // Clear device optimizations
        this.deviceOptimizations.clear();

        // Remove event listeners
        if (this.platform.isMobile) {
            document.removeEventListener('touchstart', this.handleTouchStart);
            document.removeEventListener('touchmove', this.handleTouchMove);
            document.removeEventListener('touchend', this.handleTouchEnd);
        }

        console.log('🔧 Platform Optimizer disposed');
    }
}

// Export for use in other modules
window.PlatformOptimizer = PlatformOptimizer;