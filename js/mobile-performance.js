class MobilePerformance {
    constructor() {
        this.device = this.detectDevice();
        this.performance = {
            fps: 60,
            frameTime: 16.67,
            averageFrameTime: 16.67,
            frameHistory: [],
            lastFrameTime: 0
        };

        this.quality = {
            current: 'auto',
            levels: {
                low: { pixelRatio: 0.5, shadows: false, antialiasing: false, particles: 0.3 },
                medium: { pixelRatio: 0.75, shadows: true, antialiasing: false, particles: 0.6 },
                high: { pixelRatio: 1.0, shadows: true, antialiasing: true, particles: 0.8 },
                ultra: { pixelRatio: window.devicePixelRatio, shadows: true, antialiasing: true, particles: 1.0 }
            }
        };

        this.settings = {
            autoQuality: true,
            batterySaver: false,
            targetFPS: 60,
            adaptiveQuality: true,
            thermalThrottling: true
        };

        this.batteryInfo = null;
        this.thermalState = 'normal';
        this.memoryUsage = { used: 0, total: 0 };

        this.init();
    }

    init() {
        this.loadSettings();
        this.detectCapabilities();
        this.setupPerformanceMonitoring();
        this.setupBatteryMonitoring();
        this.setupThermalMonitoring();
        this.setupMemoryMonitoring();
        this.setupAdaptiveQuality();
        this.setupPerformanceUI();
        this.determineOptimalQuality();

        console.log('⚡ Mobile performance manager initialized');
        console.log('📱 Device:', this.device);
        console.log('🎯 Quality level:', this.quality.current);
    }

    detectDevice() {
        const userAgent = navigator.userAgent;
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

        const device = {
            // Basic info
            platform: navigator.platform,
            userAgent: userAgent,
            screenWidth: screen.width,
            screenHeight: screen.height,
            pixelRatio: window.devicePixelRatio,
            memory: navigator.deviceMemory || 4, // GB
            cores: navigator.hardwareConcurrency || 4,

            // Device type detection
            isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent),
            isTablet: /iPad|Android(?=.*\b(tablet|pad)\b)/i.test(userAgent),
            isIOS: /iPhone|iPad|iPod/i.test(userAgent),
            isAndroid: /Android/i.test(userAgent),

            // Performance hints
            isLowEnd: false,
            isMidRange: false,
            isHighEnd: false,

            // GPU info
            gpu: {
                vendor: 'unknown',
                renderer: 'unknown',
                version: 'unknown'
            }
        };

        // Get GPU info
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                device.gpu.vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
                device.gpu.renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            }
            device.gpu.version = gl.getParameter(gl.VERSION);
        }

        // Classify device performance
        this.classifyDevicePerformance(device);

        return device;
    }

    classifyDevicePerformance(device) {
        let score = 0;

        // Memory score (max 30 points)
        if (device.memory >= 8) score += 30;
        else if (device.memory >= 6) score += 25;
        else if (device.memory >= 4) score += 20;
        else if (device.memory >= 3) score += 15;
        else if (device.memory >= 2) score += 10;
        else score += 5;

        // CPU score (max 25 points)
        if (device.cores >= 8) score += 25;
        else if (device.cores >= 6) score += 20;
        else if (device.cores >= 4) score += 15;
        else if (device.cores >= 2) score += 10;
        else score += 5;

        // Screen resolution score (max 20 points)
        const totalPixels = device.screenWidth * device.screenHeight;
        if (totalPixels >= 2073600) score += 20; // 1920x1080+
        else if (totalPixels >= 1440000) score += 15; // 1200x1200+
        else if (totalPixels >= 921600) score += 10; // 1280x720+
        else score += 5;

        // GPU score (max 25 points)
        const gpu = device.gpu.renderer.toLowerCase();
        if (gpu.includes('adreno 6') || gpu.includes('mali-g7') || gpu.includes('apple a1')) {
            score += 25; // High-end mobile GPUs
        } else if (gpu.includes('adreno 5') || gpu.includes('mali-g5') || gpu.includes('apple a')) {
            score += 20; // Mid-range mobile GPUs
        } else if (gpu.includes('adreno') || gpu.includes('mali') || gpu.includes('powervr')) {
            score += 15; // Basic mobile GPUs
        } else {
            score += 10; // Unknown/integrated
        }

        // Classify based on score
        if (score >= 80) {
            device.isHighEnd = true;
            device.performanceClass = 'high-end';
        } else if (score >= 50) {
            device.isMidRange = true;
            device.performanceClass = 'mid-range';
        } else {
            device.isLowEnd = true;
            device.performanceClass = 'low-end';
        }

        device.performanceScore = score;
    }

    detectCapabilities() {
        this.capabilities = {
            webgl: !!this.getWebGLContext(),
            webgl2: !!this.getWebGL2Context(),
            deviceOrientation: 'DeviceOrientationEvent' in window,
            vibration: 'vibrate' in navigator,
            serviceWorker: 'serviceWorker' in navigator,
            indexedDB: 'indexedDB' in window,
            touch: 'ontouchstart' in window,
            fullscreen: document.fullscreenEnabled || document.webkitFullscreenEnabled,
            gamepads: 'getGamepads' in navigator,
            battery: 'getBattery' in navigator,
            memory: 'memory' in performance,
            connection: 'connection' in navigator
        };

        console.log('📊 Device capabilities:', this.capabilities);
    }

    getWebGLContext() {
        const canvas = document.createElement('canvas');
        return canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    }

    getWebGL2Context() {
        const canvas = document.createElement('canvas');
        return canvas.getContext('webgl2');
    }

    setupPerformanceMonitoring() {
        this.performanceObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.entryType === 'measure') {
                    this.updatePerformanceMetrics(entry);
                }
            }
        });

        if ('observe' in this.performanceObserver) {
            this.performanceObserver.observe({ entryTypes: ['measure'] });
        }

        // Frame timing monitoring
        this.startFrameMonitoring();
    }

    startFrameMonitoring() {
        let frameCount = 0;
        let lastTime = performance.now();

        const monitorFrame = (currentTime) => {
            const deltaTime = currentTime - lastTime;

            // Update frame time history
            this.performance.frameHistory.push(deltaTime);
            if (this.performance.frameHistory.length > 60) {
                this.performance.frameHistory.shift();
            }

            // Calculate average frame time
            this.performance.averageFrameTime =
                this.performance.frameHistory.reduce((a, b) => a + b, 0) /
                this.performance.frameHistory.length;

            // Calculate FPS
            this.performance.fps = 1000 / this.performance.averageFrameTime;

            // Check for performance issues
            if (this.performance.frameHistory.length >= 30) {
                this.checkPerformanceHealth();
            }

            lastTime = currentTime;
            frameCount++;

            // Log performance every 60 frames
            if (frameCount % 60 === 0) {
                this.logPerformanceStats();
            }

            requestAnimationFrame(monitorFrame);
        };

        requestAnimationFrame(monitorFrame);
    }

    checkPerformanceHealth() {
        const avgFPS = this.performance.fps;
        const targetFPS = this.settings.targetFPS;

        // If performance is consistently below target
        if (avgFPS < targetFPS * 0.8) {
            if (this.settings.adaptiveQuality && this.quality.current !== 'low') {
                this.degradeQuality();
            }
        }

        // If performance is consistently good, try to improve quality
        if (avgFPS > targetFPS * 0.95 && this.settings.adaptiveQuality) {
            if (this.quality.current === 'low' || this.quality.current === 'medium') {
                this.improveQuality();
            }
        }

        // Thermal throttling check
        if (this.thermalState === 'critical' && this.quality.current !== 'low') {
            this.emergencyQualityReduction();
        }
    }

    setupBatteryMonitoring() {
        if ('getBattery' in navigator) {
            navigator.getBattery().then(battery => {
                this.batteryInfo = battery;

                battery.addEventListener('chargingchange', () => {
                    this.onBatteryChange();
                });

                battery.addEventListener('levelchange', () => {
                    this.onBatteryChange();
                });

                this.onBatteryChange();
            });
        }
    }

    onBatteryChange() {
        if (!this.batteryInfo) return;

        const level = this.batteryInfo.level;
        const charging = this.batteryInfo.charging;

        // Enable battery saver mode automatically when low
        if (level < 0.2 && !charging && !this.settings.batterySaver) {
            this.enableBatterySaver();
        }

        // Disable battery saver when charging and level is good
        if (level > 0.8 && charging && this.settings.batterySaver) {
            this.disableBatterySaver();
        }
    }

    setupThermalMonitoring() {
        // Monitor for performance degradation that might indicate thermal issues
        let highTempCounter = 0;

        setInterval(() => {
            if (this.performance.fps < this.settings.targetFPS * 0.6) {
                highTempCounter++;
            } else {
                highTempCounter = Math.max(0, highTempCounter - 1);
            }

            // Estimate thermal state based on sustained poor performance
            if (highTempCounter > 10) {
                this.thermalState = 'critical';
            } else if (highTempCounter > 5) {
                this.thermalState = 'warning';
            } else {
                this.thermalState = 'normal';
            }
        }, 1000);
    }

    setupMemoryMonitoring() {
        if ('memory' in performance) {
            setInterval(() => {
                this.memoryUsage = {
                    used: performance.memory.usedJSHeapSize / 1024 / 1024,
                    total: performance.memory.totalJSHeapSize / 1024 / 1024,
                    limit: performance.memory.jsHeapSizeLimit / 1024 / 1024
                };

                // Memory pressure detection
                const memoryPressure = this.memoryUsage.used / this.memoryUsage.limit;
                if (memoryPressure > 0.8) {
                    this.handleMemoryPressure();
                }
            }, 5000);
        }
    }

    setupAdaptiveQuality() {
        // Determine initial quality based on device
        if (this.settings.autoQuality) {
            this.determineOptimalQuality();
        }

        // Set up quality adjustment intervals
        setInterval(() => {
            if (this.settings.adaptiveQuality) {
                this.adjustQualityBasedOnPerformance();
            }
        }, 5000);
    }

    determineOptimalQuality() {
        let optimalQuality = 'medium';

        if (this.device.isHighEnd) {
            optimalQuality = 'high';
        } else if (this.device.isMidRange) {
            optimalQuality = 'medium';
        } else if (this.device.isLowEnd) {
            optimalQuality = 'low';
        }

        // Adjust for battery saver mode
        if (this.settings.batterySaver) {
            if (optimalQuality === 'high') optimalQuality = 'medium';
            else if (optimalQuality === 'medium') optimalQuality = 'low';
        }

        this.setQualityLevel(optimalQuality);
    }

    setQualityLevel(level) {
        if (!this.quality.levels[level]) return;

        this.quality.current = level;
        const settings = this.quality.levels[level];

        // Apply quality settings to renderer
        this.applyQualitySettings(settings);

        // Update UI
        this.updateQualityUI();

        console.log(`🎯 Quality set to: ${level}`, settings);
    }

    applyQualitySettings(settings) {
        // This will be called by the game to apply settings
        window.dispatchEvent(new CustomEvent('qualityChange', {
            detail: settings
        }));
    }

    degradeQuality() {
        const qualityOrder = ['ultra', 'high', 'medium', 'low'];
        const currentIndex = qualityOrder.indexOf(this.quality.current);

        if (currentIndex < qualityOrder.length - 1) {
            this.setQualityLevel(qualityOrder[currentIndex + 1]);
            this.showPerformanceNotification(`Quality reduced to ${this.quality.current} for better performance`);
        }
    }

    improveQuality() {
        const qualityOrder = ['low', 'medium', 'high', 'ultra'];
        const currentIndex = qualityOrder.indexOf(this.quality.current);

        if (currentIndex < qualityOrder.length - 1) {
            this.setQualityLevel(qualityOrder[currentIndex + 1]);
        }
    }

    emergencyQualityReduction() {
        this.setQualityLevel('low');
        this.showPerformanceNotification('Quality reduced due to thermal throttling');
    }

    enableBatterySaver() {
        this.settings.batterySaver = true;
        this.degradeQuality();
        this.showPerformanceNotification('Battery saver mode enabled');
        this.saveSettings();
    }

    disableBatterySaver() {
        this.settings.batterySaver = false;
        this.determineOptimalQuality();
        this.showPerformanceNotification('Battery saver mode disabled');
        this.saveSettings();
    }

    handleMemoryPressure() {
        // Reduce memory usage
        this.degradeQuality();

        // Trigger garbage collection if available
        if (window.gc) {
            window.gc();
        }

        // Clear caches
        this.clearPerformanceCaches();

        this.showPerformanceNotification('Memory usage optimized');
    }

    clearPerformanceCaches() {
        // Clear frame history
        this.performance.frameHistory = this.performance.frameHistory.slice(-30);

        // Dispatch event for game to clear its caches
        window.dispatchEvent(new CustomEvent('clearCaches'));
    }

    setupPerformanceUI() {
        // Add performance indicators to settings panel
        const performanceSection = this.createPerformanceSection();
        const settingsPanel = document.getElementById('settingsPanel');

        if (settingsPanel) {
            settingsPanel.appendChild(performanceSection);
        }

        this.setupPerformanceControls();
    }

    createPerformanceSection() {
        const section = document.createElement('div');
        section.className = 'control-group';
        section.innerHTML = `
            <h3>⚡ Performance</h3>

            <div class="performance-stats">
                <div class="stat-item">
                    <span>FPS:</span>
                    <span id="fpsDisplay">60</span>
                </div>
                <div class="stat-item">
                    <span>Frame Time:</span>
                    <span id="frameTimeDisplay">16ms</span>
                </div>
                <div class="stat-item">
                    <span>Memory:</span>
                    <span id="memoryDisplay">-</span>
                </div>
                <div class="stat-item">
                    <span>Thermal:</span>
                    <span id="thermalDisplay">Normal</span>
                </div>
            </div>

            <div class="slider-container">
                <div class="slider-label">
                    <span>Graphics Quality</span>
                    <span id="graphicsQualityValue">Auto</span>
                </div>
                <select id="graphicsQuality" style="width: 100%; padding: 8px; border-radius: 5px; background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2);">
                    <option value="auto">Auto</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="ultra">Ultra</option>
                </select>
            </div>

            <div class="toggle-switch">
                <span>Auto Quality</span>
                <div class="switch active" id="autoQualityToggle">
                    <div class="switch-handle"></div>
                </div>
            </div>

            <div class="toggle-switch">
                <span>Battery Saver</span>
                <div class="switch" id="batterySaverToggle">
                    <div class="switch-handle"></div>
                </div>
            </div>

            <div class="toggle-switch">
                <span>Adaptive Quality</span>
                <div class="switch active" id="adaptiveQualityToggle">
                    <div class="switch-handle"></div>
                </div>
            </div>
        `;

        return section;
    }

    setupPerformanceControls() {
        // Graphics quality selector
        const graphicsQuality = document.getElementById('graphicsQuality');
        if (graphicsQuality) {
            graphicsQuality.addEventListener('change', (e) => {
                if (e.target.value === 'auto') {
                    this.settings.autoQuality = true;
                    this.determineOptimalQuality();
                } else {
                    this.settings.autoQuality = false;
                    this.setQualityLevel(e.target.value);
                }
                this.saveSettings();
            });
        }

        // Auto quality toggle
        const autoQualityToggle = document.getElementById('autoQualityToggle');
        if (autoQualityToggle) {
            autoQualityToggle.addEventListener('click', () => {
                this.settings.autoQuality = !this.settings.autoQuality;
                autoQualityToggle.classList.toggle('active', this.settings.autoQuality);

                if (this.settings.autoQuality) {
                    this.determineOptimalQuality();
                }
                this.saveSettings();
            });
        }

        // Battery saver toggle
        const batterySaverToggle = document.getElementById('batterySaverToggle');
        if (batterySaverToggle) {
            batterySaverToggle.addEventListener('click', () => {
                if (this.settings.batterySaver) {
                    this.disableBatterySaver();
                } else {
                    this.enableBatterySaver();
                }
                batterySaverToggle.classList.toggle('active', this.settings.batterySaver);
            });
        }

        // Adaptive quality toggle
        const adaptiveQualityToggle = document.getElementById('adaptiveQualityToggle');
        if (adaptiveQualityToggle) {
            adaptiveQualityToggle.addEventListener('click', () => {
                this.settings.adaptiveQuality = !this.settings.adaptiveQuality;
                adaptiveQualityToggle.classList.toggle('active', this.settings.adaptiveQuality);
                this.saveSettings();
            });
        }

        // Start performance display updates
        this.startPerformanceDisplay();
    }

    startPerformanceDisplay() {
        setInterval(() => {
            this.updatePerformanceDisplay();
        }, 1000);
    }

    updatePerformanceDisplay() {
        const fpsDisplay = document.getElementById('fpsDisplay');
        const frameTimeDisplay = document.getElementById('frameTimeDisplay');
        const memoryDisplay = document.getElementById('memoryDisplay');
        const thermalDisplay = document.getElementById('thermalDisplay');

        if (fpsDisplay) {
            fpsDisplay.textContent = Math.round(this.performance.fps);
            fpsDisplay.style.color = this.performance.fps >= 50 ? '#2ecc71' :
                                   this.performance.fps >= 30 ? '#f39c12' : '#e74c3c';
        }

        if (frameTimeDisplay) {
            frameTimeDisplay.textContent = Math.round(this.performance.averageFrameTime) + 'ms';
        }

        if (memoryDisplay && this.memoryUsage.used) {
            memoryDisplay.textContent = Math.round(this.memoryUsage.used) + 'MB';
            const memoryPressure = this.memoryUsage.used / this.memoryUsage.limit;
            memoryDisplay.style.color = memoryPressure < 0.7 ? '#2ecc71' :
                                       memoryPressure < 0.85 ? '#f39c12' : '#e74c3c';
        }

        if (thermalDisplay) {
            thermalDisplay.textContent = this.thermalState.charAt(0).toUpperCase() + this.thermalState.slice(1);
            thermalDisplay.style.color = this.thermalState === 'normal' ? '#2ecc71' :
                                        this.thermalState === 'warning' ? '#f39c12' : '#e74c3c';
        }
    }

    updateQualityUI() {
        const graphicsQualityValue = document.getElementById('graphicsQualityValue');
        const graphicsQuality = document.getElementById('graphicsQuality');

        if (graphicsQualityValue) {
            graphicsQualityValue.textContent = this.settings.autoQuality ? 'Auto' :
                                              this.quality.current.charAt(0).toUpperCase() + this.quality.current.slice(1);
        }

        if (graphicsQuality) {
            graphicsQuality.value = this.settings.autoQuality ? 'auto' : this.quality.current;
        }
    }

    logPerformanceStats() {
        console.log('📊 Performance Stats:', {
            fps: Math.round(this.performance.fps),
            frameTime: Math.round(this.performance.averageFrameTime),
            quality: this.quality.current,
            thermal: this.thermalState,
            memory: this.memoryUsage.used ? Math.round(this.memoryUsage.used) + 'MB' : 'N/A',
            battery: this.batteryInfo ? Math.round(this.batteryInfo.level * 100) + '%' : 'N/A'
        });
    }

    showPerformanceNotification(message) {
        // Create notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            font-size: 14px;
            z-index: 4000;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            max-width: 250px;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    adjustQualityBasedOnPerformance() {
        const targetFPS = this.settings.targetFPS;
        const currentFPS = this.performance.fps;
        const frameHistory = this.performance.frameHistory;

        if (frameHistory.length < 30) return;

        // Calculate performance stability
        const fpsVariance = this.calculateVariance(frameHistory.map(ft => 1000 / ft));
        const isStable = fpsVariance < 100; // Low variance means stable performance

        // Performance-based quality adjustment
        if (currentFPS < targetFPS * 0.8 && isStable) {
            this.degradeQuality();
        } else if (currentFPS > targetFPS * 0.95 && isStable) {
            this.improveQuality();
        }
    }

    calculateVariance(numbers) {
        const mean = numbers.reduce((a, b) => a + b) / numbers.length;
        const variance = numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / numbers.length;
        return variance;
    }

    updatePerformanceMetrics(entry) {
        // Handle performance entries from PerformanceObserver
        if (entry.name === 'frame') {
            this.performance.lastFrameTime = entry.duration;
        }
    }

    saveSettings() {
        localStorage.setItem('speedRivalsPerformanceSettings', JSON.stringify(this.settings));
    }

    loadSettings() {
        const saved = localStorage.getItem('speedRivalsPerformanceSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
    }

    // Public API
    getCurrentQuality() {
        return this.quality.current;
    }

    getQualitySettings() {
        return this.quality.levels[this.quality.current];
    }

    getPerformanceMetrics() {
        return {
            fps: this.performance.fps,
            frameTime: this.performance.averageFrameTime,
            quality: this.quality.current,
            thermal: this.thermalState,
            memory: this.memoryUsage,
            battery: this.batteryInfo ? this.batteryInfo.level : null
        };
    }

    forceQuality(level) {
        this.settings.autoQuality = false;
        this.setQualityLevel(level);
    }

    enableAutoQuality() {
        this.settings.autoQuality = true;
        this.determineOptimalQuality();
    }
}

// Initialize performance manager
const mobilePerformance = new MobilePerformance();