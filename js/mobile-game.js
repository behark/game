class MobileGame {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.world = null;
        this.car = null;
        this.track = null;
        this.clock = new THREE.Clock();
        this.socket = null;

        this.gameState = {
            speed: 0,
            lap: 1,
            position: 1,
            isPlaying: false,
            isPaused: false,
            raceTime: 0,
            bestLapTime: null,
            currentLapTime: 0
        };

        // Mobile-specific state
        this.mobileState = {
            orientation: 'landscape',
            isFullscreen: false,
            backgrounded: false,
            lastActiveTime: Date.now()
        };

        // Performance tracking
        this.performance = {
            frameCount: 0,
            lastFpsTime: Date.now(),
            fps: 60,
            adaptiveQuality: true
        };

        this.init();
    }

    async init() {
        console.log('📱 Initializing Mobile Speed Rivals...');

        this.setupMobileEnvironment();
        this.setupRenderer();
        this.setupScene();
        this.setupCamera();
        this.setupLights();
        this.setupPhysics();
        this.setupMobileControls();
        this.setupOrientationHandling();
        this.setupVisibilityHandling();
        this.setupPerformanceOptimization();

        // Initialize game objects
        this.track = new Track(this.scene, this.world);
        await this.track.create();

        this.car = new Car(this.scene, this.world);
        await this.car.create();

        // Setup mobile-specific features
        this.setupTouchFeedback();
        this.setupAR();
        this.setupVoiceCommands();

        // Setup multiplayer
        this.setupMultiplayer();

        // Initialize loading progress
        this.updateLoadingProgress(100);

        // Hide loading, show game
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('mobileUI').classList.remove('hidden');

        this.gameState.isPlaying = true;
        this.gameLoop();

        console.log('🎮 Mobile game initialized successfully!');
    }

    setupMobileEnvironment() {
        // Optimize for mobile viewport
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            viewport.content = 'width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover';
        }

        // Prevent zoom on double tap
        document.addEventListener('touchend', (e) => {
            e.preventDefault();
        });

        // Prevent context menu
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        // Handle safe areas for modern phones
        this.handleSafeAreas();
    }

    handleSafeAreas() {
        const style = document.createElement('style');
        style.textContent = `
            .hud-top {
                top: max(env(safe-area-inset-top), 20px);
            }
            .steering-wheel {
                bottom: max(env(safe-area-inset-bottom), 30px);
            }
            .pedal-container {
                bottom: max(env(safe-area-inset-bottom), 30px);
            }
        `;
        document.head.appendChild(style);
    }

    setupRenderer() {
        const canvas = document.getElementById('gameCanvas');
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: mobilePerformance.getQualitySettings().antialiasing,
            powerPreference: 'high-performance',
            stencil: false,
            depth: true
        });

        this.applyQualitySettings();
        this.renderer.shadowMap.enabled = mobilePerformance.getQualitySettings().shadows;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.renderer.setClearColor(0x87CEEB, 1);

        // Mobile-specific optimizations
        this.renderer.info.autoReset = false;
        this.renderer.sortObjects = false;

        // Listen for quality changes
        window.addEventListener('qualityChange', (e) => {
            this.applyQualitySettings(e.detail);
        });
    }

    applyQualitySettings(settings = null) {
        const quality = settings || mobilePerformance.getQualitySettings();

        this.renderer.setPixelRatio(quality.pixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        // Adjust shadow quality
        if (quality.shadows !== this.renderer.shadowMap.enabled) {
            this.renderer.shadowMap.enabled = quality.shadows;
            if (this.scene) {
                this.scene.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = quality.shadows;
                        child.receiveShadow = quality.shadows;
                    }
                });
            }
        }

        console.log('🎯 Applied quality settings:', quality);
    }

    setupScene() {
        this.scene = new THREE.Scene();

        // Optimized fog for mobile
        const fogDistance = mobilePerformance.getCurrentQuality() === 'low' ? 200 : 500;
        this.scene.fog = new THREE.Fog(0x87CEEB, 50, fogDistance);
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            mobilePerformance.getCurrentQuality() === 'low' ? 300 : 1000
        );
        this.camera.position.set(0, 8, 10);
    }

    setupLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);

        // Simplified lighting for mobile
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 25);

        if (mobilePerformance.getQualitySettings().shadows) {
            directionalLight.castShadow = true;
            directionalLight.shadow.mapSize.width = 1024;
            directionalLight.shadow.mapSize.height = 1024;
            directionalLight.shadow.camera.near = 0.5;
            directionalLight.shadow.camera.far = 200;
            directionalLight.shadow.camera.left = -50;
            directionalLight.shadow.camera.right = 50;
            directionalLight.shadow.camera.top = 50;
            directionalLight.shadow.camera.bottom = -50;
        }

        this.scene.add(directionalLight);

        // Hemisphere light for mobile optimization
        const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x2F4F4F, 0.3);
        this.scene.add(hemisphereLight);
    }

    setupPhysics() {
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0);
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = mobilePerformance.getCurrentQuality() === 'low' ? 5 : 10;
    }

    setupMobileControls() {
        // Integration with mobile controls
        if (typeof mobileControls !== 'undefined') {
            // Listen for gesture events
            window.addEventListener('powerupGesture', (e) => {
                this.handlePowerupGesture(e.detail.type);
            });

            console.log('📱 Mobile controls integrated');
        }

        this.setupOrientationControls();
    }

    setupOrientationControls() {
        // Handle orientation change
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleOrientationChange();
            }, 100);
        });

        // Initial orientation setup
        this.handleOrientationChange();
    }

    handleOrientationChange() {
        const orientation = screen.orientation ? screen.orientation.angle : window.orientation;

        if (Math.abs(orientation) === 90) {
            this.mobileState.orientation = 'landscape';
            this.optimizeForLandscape();
        } else {
            this.mobileState.orientation = 'portrait';
            this.optimizeForPortrait();
        }

        // Update camera and renderer
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        console.log(`📱 Orientation changed to: ${this.mobileState.orientation}`);
    }

    optimizeForLandscape() {
        // Adjust UI for landscape
        const mobileUI = document.getElementById('mobileUI');
        if (mobileUI) {
            mobileUI.style.flexDirection = 'row';
        }

        // Hide some UI elements if screen is too small
        if (window.innerHeight < 500) {
            document.querySelectorAll('.hud-top > *').forEach(el => {
                el.style.fontSize = '14px';
                el.style.padding = '10px 15px';
            });
        }
    }

    optimizeForPortrait() {
        // Optimize UI for portrait mode
        const mobileUI = document.getElementById('mobileUI');
        if (mobileUI) {
            mobileUI.style.flexDirection = 'column';
        }

        // Show orientation hint
        this.showOrientationHint();
    }

    showOrientationHint() {
        const hint = document.createElement('div');
        hint.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 15px;
            text-align: center;
            z-index: 8000;
            font-size: 18px;
        `;
        hint.innerHTML = `
            📱➡️ Rotate your device<br>
            for the best experience
        `;

        document.body.appendChild(hint);

        setTimeout(() => hint.remove(), 3000);
    }

    setupVisibilityHandling() {
        // Handle app going to background
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.handleAppBackground();
            } else {
                this.handleAppForeground();
            }
        });

        // Handle page blur/focus
        window.addEventListener('blur', () => this.handleAppBackground());
        window.addEventListener('focus', () => this.handleAppForeground());
    }

    handleAppBackground() {
        this.mobileState.backgrounded = true;
        this.gameState.isPaused = true;

        // Pause game loop and reduce resource usage
        console.log('📴 App backgrounded - pausing game');

        // Stop unnecessary animations
        this.clock.stop();

        // Save current state
        this.saveGameState();
    }

    handleAppForeground() {
        this.mobileState.backgrounded = false;
        this.mobileState.lastActiveTime = Date.now();

        // Resume game
        console.log('📱 App foregrounded - resuming game');

        if (this.gameState.isPlaying) {
            this.gameState.isPaused = false;
            this.clock.start();
        }

        // Check for updates
        if (mobilePWA) {
            mobilePWA.checkForUpdates();
        }
    }

    setupPerformanceOptimization() {
        // Dynamic LOD system
        this.setupLODSystem();

        // Frame rate monitoring
        this.setupFrameRateMonitoring();

        // Memory management
        this.setupMemoryManagement();

        // Battery optimization
        this.setupBatteryOptimization();
    }

    setupLODSystem() {
        this.lodSystem = {
            lowDetail: 15,
            mediumDetail: 30,
            highDetail: 50,
            maxDistance: 100
        };
    }

    setupFrameRateMonitoring() {
        setInterval(() => {
            this.updateFrameRate();
        }, 1000);
    }

    updateFrameRate() {
        const now = Date.now();
        const delta = now - this.performance.lastFpsTime;
        this.performance.fps = Math.round(1000 / (delta / this.performance.frameCount));
        this.performance.frameCount = 0;
        this.performance.lastFpsTime = now;

        // Auto-adjust quality based on performance
        if (this.performance.adaptiveQuality) {
            this.adaptQuality();
        }
    }

    adaptQuality() {
        if (this.performance.fps < 25 && mobilePerformance.getCurrentQuality() !== 'low') {
            mobilePerformance.degradeQuality();
        } else if (this.performance.fps > 55 && mobilePerformance.getCurrentQuality() === 'low') {
            mobilePerformance.improveQuality();
        }
    }

    setupMemoryManagement() {
        setInterval(() => {
            this.cleanupMemory();
        }, 30000); // Every 30 seconds
    }

    cleanupMemory() {
        // Clear unused textures and geometries
        this.renderer.renderLists.dispose();

        // Force garbage collection if available
        if (window.gc && Math.random() < 0.1) {
            window.gc();
        }

        // Clear performance history to prevent memory leaks
        if (mobilePerformance) {
            mobilePerformance.performance.frameHistory =
                mobilePerformance.performance.frameHistory.slice(-30);
        }
    }

    setupBatteryOptimization() {
        if (navigator.getBattery) {
            navigator.getBattery().then(battery => {
                this.monitorBattery(battery);
            });
        }
    }

    monitorBattery(battery) {
        const checkBattery = () => {
            if (battery.level < 0.2 && !battery.charging) {
                this.enableBatterySaver();
            } else if (battery.level > 0.5 && battery.charging) {
                this.disableBatterySaver();
            }
        };

        battery.addEventListener('levelchange', checkBattery);
        battery.addEventListener('chargingchange', checkBattery);
        checkBattery();
    }

    enableBatterySaver() {
        mobilePerformance.enableBatterySaver();
        this.performance.adaptiveQuality = true;
    }

    disableBatterySaver() {
        mobilePerformance.disableBatterySaver();
    }

    setupTouchFeedback() {
        // Enhanced haptic feedback integration
        window.addEventListener('carCollision', (e) => {
            if (mobileControls) {
                mobileControls.onCollision(e.detail.intensity);
            }
        });

        window.addEventListener('carAcceleration', () => {
            if (mobileControls) {
                mobileControls.onEngineRevUp();
            }
        });
    }

    setupAR() {
        // Basic AR functionality for track preview
        if ('MediaDevices' in window && 'getUserMedia' in navigator.mediaDevices) {
            this.arCapable = true;
            console.log('📷 AR capabilities detected');
        }
    }

    setupVoiceCommands() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            this.speechRecognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            this.speechRecognition.continuous = false;
            this.speechRecognition.interimResults = false;
            this.speechRecognition.lang = 'en-US';

            this.speechRecognition.onresult = (event) => {
                const command = event.results[0][0].transcript.toLowerCase();
                this.handleVoiceCommand(command);
            };

            console.log('🎤 Voice commands enabled');
        }
    }

    handleVoiceCommand(command) {
        console.log('🎤 Voice command:', command);

        if (command.includes('boost') || command.includes('power')) {
            this.handlePowerupGesture('circle');
        } else if (command.includes('brake') || command.includes('stop')) {
            this.emergencyBrake();
        } else if (command.includes('pause')) {
            this.togglePause();
        }
    }

    setupMultiplayer() {
        // Mobile-optimized multiplayer
        console.log('🌐 Mobile multiplayer setup ready');
    }

    updateControls() {
        if (!this.car || !this.gameState.isPlaying || this.gameState.isPaused) return;

        if (typeof mobileControls !== 'undefined') {
            // Use mobile controls
            const steering = mobileControls.getSteeringInput();
            const acceleration = mobileControls.getAccelerationInput();
            const braking = mobileControls.getBrakingInput();

            // Apply steering
            this.car.steer(steering);

            // Apply acceleration/braking
            if (acceleration > 0) {
                this.car.accelerate(acceleration);
            } else if (braking > 0) {
                this.car.accelerate(-braking);
            }

            // Handbrake
            if (mobileControls.isHandbrakeActive()) {
                this.car.handbrake();
            }

            // Update mobile controls with current speed
            mobileControls.onSpeedChange(this.gameState.speed);
        }
    }

    updateCamera() {
        if (!this.car) return;

        const carPosition = this.car.getPosition();
        const carRotation = this.car.getRotation();

        // Mobile-optimized camera follow
        const cameraDistance = this.mobileState.orientation === 'portrait' ? 20 : 15;
        const cameraHeight = this.mobileState.orientation === 'portrait' ? 8 : 6;

        const cameraX = carPosition.x - Math.sin(carRotation.y) * cameraDistance;
        const cameraZ = carPosition.z - Math.cos(carRotation.y) * cameraDistance;

        // Smoother camera movement for mobile
        const lerpFactor = 0.08;
        this.camera.position.lerp(
            new THREE.Vector3(cameraX, carPosition.y + cameraHeight, cameraZ),
            lerpFactor
        );

        this.camera.lookAt(carPosition.x, carPosition.y + 2, carPosition.z);
    }

    updateUI() {
        if (!this.car) return;

        this.gameState.speed = Math.abs(this.car.getSpeed()) * 3.6; // Convert to km/h

        // Update mobile UI
        const speedValue = document.getElementById('speedValue');
        const lapValue = document.getElementById('lapValue');
        const positionValue = document.getElementById('positionValue');

        if (speedValue) {
            speedValue.textContent = Math.round(this.gameState.speed);
        }
        if (lapValue) {
            lapValue.textContent = this.gameState.lap;
        }
        if (positionValue) {
            positionValue.textContent = this.gameState.position;
        }
    }

    handlePowerupGesture(gestureType) {
        console.log(`🎯 Powerup gesture: ${gestureType}`);

        switch (gestureType) {
            case 'swipe-up':
                this.activateSpeedBoost();
                break;
            case 'swipe-down':
                this.activateSlowMotion();
                break;
            case 'swipe-left':
                this.activateShield();
                break;
            case 'swipe-right':
                this.activateNitro();
                break;
            case 'circle':
                this.activateUltimatePower();
                break;
        }

        // Visual feedback
        this.showPowerupFeedback(gestureType);
    }

    activateSpeedBoost() {
        if (this.car) {
            this.car.applyBoost(1.5, 3000); // 50% boost for 3 seconds
        }
    }

    activateNitro() {
        if (this.car) {
            this.car.applyBoost(2.0, 2000); // 100% boost for 2 seconds
        }
    }

    activateSlowMotion() {
        // Slow down everything except the player
        this.world.gravity.set(0, -4.91, 0); // Half gravity
        setTimeout(() => {
            this.world.gravity.set(0, -9.82, 0); // Restore gravity
        }, 2000);
    }

    activateShield() {
        // Temporary immunity to collisions
        if (this.car) {
            this.car.activateShield(3000);
        }
    }

    activateUltimatePower() {
        // Combine multiple powerups
        this.activateSpeedBoost();
        this.activateShield();
    }

    showPowerupFeedback(gestureType) {
        const feedback = document.createElement('div');
        feedback.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 48px;
            color: #ffd700;
            text-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
            z-index: 9000;
            pointer-events: none;
            animation: powerupFeedback 1s ease-out forwards;
        `;

        const icons = {
            'swipe-up': '⚡',
            'swipe-down': '🔄',
            'swipe-left': '🛡️',
            'swipe-right': '🚀',
            'circle': '💥'
        };

        feedback.textContent = icons[gestureType] || '✨';

        const style = document.createElement('style');
        style.textContent = `
            @keyframes powerupFeedback {
                0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
                50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
                100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(feedback);
        setTimeout(() => feedback.remove(), 1000);
    }

    updateLoadingProgress(percentage) {
        const loadingBar = document.getElementById('loadingBar');
        if (loadingBar) {
            loadingBar.style.width = percentage + '%';
        }
    }

    emergencyBrake() {
        if (this.car) {
            this.car.emergencyBrake();
        }
    }

    togglePause() {
        this.gameState.isPaused = !this.gameState.isPaused;

        if (this.gameState.isPaused) {
            this.clock.stop();
        } else {
            this.clock.start();
        }
    }

    saveGameState() {
        const state = {
            lap: this.gameState.lap,
            position: this.gameState.position,
            speed: this.gameState.speed,
            timestamp: Date.now()
        };

        localStorage.setItem('speedRivalsGameState', JSON.stringify(state));
    }

    loadGameState() {
        const saved = localStorage.getItem('speedRivalsGameState');
        if (saved) {
            const state = JSON.parse(saved);
            this.gameState = { ...this.gameState, ...state };
        }
    }

    gameLoop() {
        if (!this.gameState.isPlaying || this.gameState.isPaused) {
            requestAnimationFrame(() => this.gameLoop());
            return;
        }

        const deltaTime = this.clock.getDelta();

        // Update controls
        this.updateControls();

        // Update physics
        this.world.step(deltaTime);

        // Update car
        if (this.car) {
            this.car.update(deltaTime);
        }

        // Update camera
        this.updateCamera();

        // Update UI
        this.updateUI();

        // Performance tracking
        this.performance.frameCount++;

        // Apply LOD optimizations
        this.applyLOD();

        // Render
        this.renderer.render(this.scene, this.camera);

        // Continue loop
        requestAnimationFrame(() => this.gameLoop());
    }

    applyLOD() {
        if (!this.car) return;

        const carPosition = this.car.getPosition();

        // Apply LOD to track elements
        this.scene.traverse((child) => {
            if (child.userData.isLOD) {
                const distance = child.position.distanceTo(carPosition);

                if (distance > this.lodSystem.highDetail) {
                    child.visible = false;
                } else if (distance > this.lodSystem.mediumDetail) {
                    child.visible = true;
                    if (child.material) {
                        child.material.wireframe = true;
                    }
                } else {
                    child.visible = true;
                    if (child.material) {
                        child.material.wireframe = false;
                    }
                }
            }
        });
    }

    // Public API
    getGameState() {
        return this.gameState;
    }

    getMobileState() {
        return this.mobileState;
    }

    requestFullscreen() {
        const element = document.documentElement;
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        }
    }

    exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }

    startVoiceControl() {
        if (this.speechRecognition) {
            this.speechRecognition.start();
        }
    }

    stopVoiceControl() {
        if (this.speechRecognition) {
            this.speechRecognition.stop();
        }
    }
}

// Initialize mobile game when page loads
window.addEventListener('load', () => {
    new MobileGame();
});