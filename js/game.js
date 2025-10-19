class Game {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.world = null;
        this.car = null;
        this.track = null;
        this.visualEffects = null;
        this.aiManager = null;
        this.powerUpSystem = null;
        this.clock = new THREE.Clock();
        this.keys = {};
        this.socket = null;

        // Performance Integration System
        this.performanceIntegration = null;
        this.performanceUI = null;

        this.gameState = {
            speed: 0,
            lap: 1,
            position: 1,
            isPlaying: false,
            aiOpponents: 5,
            difficulty: 'amateur',
            raceMode: 'ai' // 'ai', 'multiplayer', 'time_trial'
        };

        this.init();
    }

    async init() {
        try {
            console.log('🏎️ Initializing Speed Rivals with Performance Optimization...');

            this.setupRenderer();
            console.log('✅ Renderer setup complete');
            
            this.setupScene();
            console.log('✅ Scene setup complete');
            
            this.setupCamera();
            console.log('✅ Camera setup complete');
            
            this.setupLights();
            console.log('✅ Lights setup complete');
            
            this.setupPhysics();
            console.log('✅ Physics setup complete');
            
            this.setupControls();
            console.log('✅ Controls setup complete');

            // Initialize Performance Integration System FIRST
            console.log('🚀 Skipping Performance Integration for now...');
            // this.performanceIntegration = new PerformanceIntegration();
            // const optimizationSuccess = await this.performanceIntegration.initialize(
            //     this.renderer, this.scene, this.camera
            // );

            // if (optimizationSuccess) {
            //     console.log('✅ Performance optimization systems active');
            //     this.createPerformanceUI();
            // } else {
            //     console.warn('⚠️ Performance optimization systems failed to initialize');
            // }

            // Initialize game objects with optimizations
            console.log('🏁 Creating track...');
            this.track = new Track(this.scene, this.world);
            await this.track.create();
            console.log('✅ Track created');

            // Register track objects for optimization
            if (this.performanceIntegration) {
                this.registerTrackForOptimization();
            }

            console.log('🚗 Creating car...');
            this.car = new Car(this.scene, this.world);
            await this.car.create();
            console.log('✅ Car created');

            // Create optimized car with all performance systems
            if (this.performanceIntegration) {
                this.optimizedCar = this.performanceIntegration.createOptimizedCar(this.car.mesh);
            }

            // Initialize visual effects engine
            console.log('✨ Initializing visual effects...');
            this.visualEffects = new VisualEffectsEngine(this.scene, this.renderer, this.camera, this.world);
            console.log('✅ Visual effects initialized');

            // Initialize AI system if in AI mode
            if (this.gameState.raceMode === 'ai') {
                console.log('🤖 Initializing AI manager...');
                this.aiManager = new AIManager(this.scene, this.world, this.track);
                await this.aiManager.initialize(this.gameState.difficulty);
                console.log('✅ AI manager initialized');
            }

            // Initialize power-up system
            console.log('⚡ Initializing power-up system...');
            this.powerUpSystem = new PowerUpSystem(this.scene, this.world, this.track);
            console.log('✅ Power-up system initialized');

            // Setup multiplayer with network optimizations
            this.setupMultiplayer();
            console.log('✅ Multiplayer setup complete');

            // Hide loading, show game
            console.log('🎮 Hiding loading screen...');
            const loadingEl = document.getElementById('loading');
            const uiEl = document.getElementById('ui');
            const controlsEl = document.getElementById('controls');
            
            if (loadingEl) {
                loadingEl.classList.add('hidden');
                console.log('✅ Loading screen hidden');
            } else {
                console.warn('⚠️ Loading element not found');
            }
            
            if (uiEl) {
                uiEl.classList.remove('hidden');
                console.log('✅ UI shown');
            } else {
                console.warn('⚠️ UI element not found');
            }
            
            if (controlsEl) {
                controlsEl.classList.remove('hidden');
                console.log('✅ Controls shown');
            } else {
                console.warn('⚠️ Controls element not found');
            }

            this.gameState.isPlaying = true;
            this.gameLoop();

            console.log('🎮 Game initialized successfully!');

        } catch (error) {
            console.error('❌ Game initialization error:', error);
            console.error('Stack trace:', error.stack);
            
            // Show error to user
            const loadingEl = document.getElementById('loading');
            if (loadingEl) {
                loadingEl.innerHTML = `
                    ❌ Game initialization failed<br>
                    <small>${error.message}</small><br>
                    <a href="/debug.html" style="color: white;">Debug Page</a> | 
                    <a href="/hub" style="color: white;">Back to Hub</a>
                `;
            }
            
            throw error; // Re-throw to be caught by outer try-catch
        }

        // Start performance monitoring
        // if (this.performanceIntegration) {
        //     this.startPerformanceMonitoring();
        // }
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('gameCanvas'),
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setClearColor(0x87CEEB, 1); // Sky blue

        // Enable tone mapping for better HDR rendering
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
    }

    setupScene() {
        this.scene = new THREE.Scene();

        // Add fog for atmospheric effect
        this.scene.fog = new THREE.Fog(0x87CEEB, 50, 500);
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 8, 10);
    }

    setupLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
        this.scene.add(ambientLight);

        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 25);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        this.scene.add(directionalLight);

        // Hemisphere light for sky effect
        const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x2F4F4F, 0.4);
        this.scene.add(hemisphereLight);
    }

    setupPhysics() {
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0);
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 10;
    }

    setupControls() {
        window.addEventListener('keydown', (event) => {
            this.keys[event.code] = true;
        });

        window.addEventListener('keyup', (event) => {
            this.keys[event.code] = false;
        });

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    setupMultiplayer() {
        // We'll implement this later when the server is ready
        console.log('🌐 Multiplayer setup ready for implementation');
    }

    updateControls() {
        if (!this.car || !this.gameState.isPlaying) return;

        // Acceleration
        if (this.keys['KeyW'] || this.keys['ArrowUp']) {
            this.car.accelerate(1);
        }

        // Braking/Reverse
        if (this.keys['KeyS'] || this.keys['ArrowDown']) {
            this.car.accelerate(-1);
        }

        // Steering
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
            this.car.steer(-1);
        }

        if (this.keys['KeyD'] || this.keys['ArrowRight']) {
            this.car.steer(1);
        }

        // Handbrake
        if (this.keys['Space']) {
            this.car.handbrake();
        }

        // Reset steering if no input
        if (!this.keys['KeyA'] && !this.keys['ArrowLeft'] &&
            !this.keys['KeyD'] && !this.keys['ArrowRight']) {
            this.car.steer(0);
        }

        // Power-up usage
        if (this.keys['KeyQ'] && this.car.hasPowerUp) {
            this.powerUpSystem.usePowerUp(this.car, this.car.powerUpType);
            this.keys['KeyQ'] = false; // Prevent spam
        }

        // AI difficulty adjustment
        if (this.keys['KeyP']) {
            this.cycleAIDifficulty();
            this.keys['KeyP'] = false; // Prevent spam
        }

        // Start/restart race
        if (this.keys['KeyR']) {
            this.startRace();
            this.keys['KeyR'] = false; // Prevent spam
        }

        // Visual effects testing controls
        if (this.keys['KeyT']) {
            this.toggleWeather();
            this.keys['KeyT'] = false; // Prevent spam
        }

        if (this.keys['KeyV']) {
            this.triggerVictoryEffects(this.car.getPosition());
            this.keys['KeyV'] = false; // Prevent spam
        }

        if (this.keys['KeyN']) {
            // Toggle day/night cycle speed (for testing)
            if (this.visualEffects) {
                this.visualEffects.timeOfDay = (this.visualEffects.timeOfDay + 0.25) % 1.0;
            }
            this.keys['KeyN'] = false; // Prevent spam
        }

        // Car underglow toggle
        if (this.keys['KeyU']) {
            if (this.car) {
                this.car.toggleUnderglow();
            }
            this.keys['KeyU'] = false; // Prevent spam
        }

        // Change underglow color
        if (this.keys['KeyC']) {
            if (this.car) {
                const colors = [0x00ffff, 0xff00ff, 0xffff00, 0x00ff00, 0xff0000, 0x0000ff];
                const randomColor = colors[Math.floor(Math.random() * colors.length)];
                this.car.setUnderglowColor(randomColor);
            }
            this.keys['KeyC'] = false; // Prevent spam
        }
    }

    updateCamera() {
        if (!this.car) return;

        const carPosition = this.car.getPosition();
        const carRotation = this.car.getRotation();

        // Follow camera behind the car
        const cameraDistance = 15;
        const cameraHeight = 6;

        const cameraX = carPosition.x - Math.sin(carRotation.y) * cameraDistance;
        const cameraZ = carPosition.z - Math.cos(carRotation.y) * cameraDistance;

        this.camera.position.lerp(
            new THREE.Vector3(cameraX, carPosition.y + cameraHeight, cameraZ),
            0.1
        );

        this.camera.lookAt(carPosition.x, carPosition.y + 2, carPosition.z);
    }

    updateUI() {
        if (!this.car) return;

        this.gameState.speed = Math.abs(this.car.getSpeed()) * 3.6; // Convert to km/h

        document.getElementById('speedValue').textContent =
            Math.round(this.gameState.speed);
        document.getElementById('lapValue').textContent = this.gameState.lap;
        document.getElementById('positionValue').textContent = this.gameState.position;

        // Update AI-specific UI
        if (this.aiManager) {
            const leaderboard = this.aiManager.getLeaderboard();
            this.updateLeaderboard(leaderboard);
            this.updateAIStatus();
        }

        // Update power-up UI
        this.updatePowerUpUI();
    }

    updateCarVisualEffects(deltaTime) {
        if (!this.car || !this.visualEffects) return;

        const carPosition = this.car.getPosition();
        const carRotation = this.car.getRotation();
        const speed = Math.abs(this.car.getSpeed());

        // Engine exhaust effects based on speed and acceleration
        const engineTemp = Math.min(speed / this.car.maxSpeed + 0.3, 1.0);
        this.visualEffects.createEngineExhaust(carPosition, carRotation, speed, engineTemp);

        // Engine glow effects for high performance
        if (engineTemp > 0.7) {
            this.visualEffects.createEngineGlow(carPosition, engineTemp);
        }

        // Tire smoke when skidding or turning hard
        this.car.wheels.forEach((wheel, index) => {
            const wheelBody = this.car.wheelBodies[index];
            if (wheelBody) {
                const wheelVelocity = wheelBody.velocity.length();
                const skidIntensity = Math.min(wheelVelocity / 15, 1.0);

                // Check if handbraking or turning sharply
                const isHandbraking = this.keys['Space'];
                const isTurning = Math.abs(this.car.steerAngle) > 0.1;

                if ((isHandbraking || isTurning) && speed > 5) {
                    // Convert CANNON.Vec3 to THREE.Vector3
                    const wheelPos = new THREE.Vector3(
                        wheelBody.position.x,
                        wheelBody.position.y,
                        wheelBody.position.z
                    );
                    const wheelQuat = new THREE.Quaternion(
                        wheelBody.quaternion.x,
                        wheelBody.quaternion.y,
                        wheelBody.quaternion.z,
                        wheelBody.quaternion.w
                    );
                    
                    this.visualEffects.createTireSmoke(
                        wheelPos,
                        wheelQuat,
                        skidIntensity * (isHandbraking ? 1.5 : 0.8)
                    );
                }

                // Dust clouds when driving off-track
                const distanceFromTrackCenter = Math.sqrt(carPosition.x * carPosition.x + carPosition.z * carPosition.z);
                if (distanceFromTrackCenter > 45 && speed > 3) {
                    // Convert CANNON vectors to THREE vectors
                    const wheelPos = new THREE.Vector3(
                        wheelBody.position.x,
                        wheelBody.position.y,
                        wheelBody.position.z
                    );
                    const wheelVel = new THREE.Vector3(
                        wheelBody.velocity.x,
                        wheelBody.velocity.y,
                        wheelBody.velocity.z
                    );
                    
                    this.visualEffects.createDustClouds(
                        wheelPos,
                        wheelVel,
                        Math.min(speed / 20, 0.8)
                    );
                }
            }
        });

        // Sparks when hitting barriers at high speed
        this.checkBarrierCollisions(carPosition, speed);
    }

    checkBarrierCollisions(carPosition, speed) {
        // Check collision with track barriers
        const distanceFromCenter = Math.sqrt(carPosition.x * carPosition.x + carPosition.z * carPosition.z);

        if ((distanceFromCenter > 48 || distanceFromCenter < 32) && speed > 10) {
            // Calculate collision intensity based on speed
            const collisionIntensity = Math.min(speed / 25, 1.0);

            if (Math.random() < 0.1) { // Random chance for sparks
                this.visualEffects.createSparks(
                    carPosition,
                    new THREE.Vector3(Math.random() - 0.5, 0.5, Math.random() - 0.5),
                    collisionIntensity
                );
            }
        }
    }

    checkLapCompletion() {
        if (!this.track || !this.car) return;

        const carPosition = this.car.getPosition();
        const lapCompleted = this.track.checkLapProgress(carPosition);

        if (lapCompleted) {
            this.gameState.lap++;

            // Victory effects for completing race
            if (this.gameState.lap > 3) {
                this.triggerVictoryEffects(carPosition);
            }
        }
    }

    triggerVictoryEffects(position) {
        if (this.visualEffects) {
            console.log('🏆 Race completed! Triggering victory effects...');
            this.visualEffects.createVictoryEffects(position);
        }
    }

    // Environmental controls (can be called via keyboard shortcuts)
    toggleWeather() {
        if (!this.visualEffects) return;

        const weatherTypes = ['clear', 'rain', 'snow', 'fog'];
        const currentIndex = weatherTypes.indexOf(this.currentWeather || 'clear');
        const nextWeather = weatherTypes[(currentIndex + 1) % weatherTypes.length];

        this.currentWeather = nextWeather;
        this.visualEffects.setWeather(nextWeather, 0.7);

        console.log(`🌦️ Weather changed to: ${nextWeather}`);
    }

    // AI and racing management methods
    startRace() {
        if (this.aiManager) {
            this.aiManager.startRace();
        }

        // Reset player car position
        const startPos = this.track ? this.track.getStartPosition() : { x: 0, y: 2, z: -35 };
        this.car.reset(startPos);

        // Reset game state
        this.gameState.lap = 1;
        this.gameState.position = 1;

        console.log('🏁 Race started!');
    }

    cycleAIDifficulty() {
        if (!this.aiManager) return;

        const difficulties = ['novice', 'amateur', 'professional', 'expert', 'legend'];
        const currentIndex = difficulties.indexOf(this.gameState.difficulty);
        const nextIndex = (currentIndex + 1) % difficulties.length;

        this.gameState.difficulty = difficulties[nextIndex];
        this.aiManager.currentDifficulty = this.gameState.difficulty;
        this.aiManager.applyDifficultyToAI();

        console.log(`🎯 AI difficulty changed to: ${this.gameState.difficulty}`);
    }

    updateLeaderboard(leaderboard) {
        // Update position in game state
        const playerEntry = leaderboard.find(entry => entry.type === 'player');
        if (playerEntry) {
            this.gameState.position = playerEntry.position;
        }

        // Update UI leaderboard (if UI element exists)
        this.displayLeaderboard(leaderboard);
    }

    displayLeaderboard(leaderboard) {
        // Create or update leaderboard display
        let leaderboardElement = document.getElementById('leaderboard');

        if (!leaderboardElement) {
            leaderboardElement = document.createElement('div');
            leaderboardElement.id = 'leaderboard';
            leaderboardElement.style.cssText = `
                position: absolute;
                top: 120px;
                right: 20px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 15px;
                border-radius: 10px;
                font-family: 'Arial', sans-serif;
                font-size: 14px;
                min-width: 200px;
                z-index: 1000;
            `;
            document.body.appendChild(leaderboardElement);
        }

        let html = '<div style="font-weight: bold; margin-bottom: 10px; color: #ffff00;">🏆 Leaderboard</div>';

        leaderboard.slice(0, 6).forEach((entry, index) => {
            const isPlayer = entry.type === 'player';
            const icon = isPlayer ? '🏎️' : this.getPersonalityIcon(entry.personality);
            const name = isPlayer ? 'You' : `${entry.personality.charAt(0).toUpperCase() + entry.personality.slice(1)} AI`;
            const color = isPlayer ? '#00ff00' : '#ffffff';

            html += `
                <div style="margin: 5px 0; color: ${color}; ${isPlayer ? 'font-weight: bold;' : ''}">
                    ${entry.position}. ${icon} ${name}
                </div>
            `;
        });

        leaderboardElement.innerHTML = html;
    }

    getPersonalityIcon(personality) {
        const icons = {
            aggressive: '😤',
            tactical: '🎯',
            defensive: '🛡️',
            unpredictable: '🎲',
            professional: '🏆'
        };
        return icons[personality] || '🤖';
    }

    updateAIStatus() {
        // Create or update AI status display
        let statusElement = document.getElementById('ai-status');

        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.id = 'ai-status';
            statusElement.style.cssText = `
                position: absolute;
                top: 20px;
                left: 20px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 15px;
                border-radius: 10px;
                font-family: 'Arial', sans-serif;
                font-size: 12px;
                min-width: 180px;
                z-index: 1000;
            `;
            document.body.appendChild(statusElement);
        }

        if (this.aiManager) {
            const status = this.aiManager.getAIStatus();
            const html = `
                <div style="font-weight: bold; margin-bottom: 8px; color: #00ffff;">🤖 AI Status</div>
                <div>Difficulty: <span style="color: #ffff00;">${status.difficulty}</span></div>
                <div>Opponents: <span style="color: #ffff00;">${status.aiCount}</span></div>
                <div>Rubber Band: <span style="color: ${status.rubberBandEnabled ? '#00ff00' : '#ff0000'};">
                    ${status.rubberBandEnabled ? 'ON' : 'OFF'}
                </span></div>
                <div>Adaptive: <span style="color: ${status.adaptiveDifficulty ? '#00ff00' : '#ff0000'};">
                    ${status.adaptiveDifficulty ? 'ON' : 'OFF'}
                </span></div>
                <div style="margin-top: 8px; font-size: 11px; color: #cccccc;">
                    Wins: ${status.playerPerformance.wins} | Losses: ${status.playerPerformance.losses}
                </div>
            `;
            statusElement.innerHTML = html;
        }
    }

    updatePowerUpUI() {
        // Create or update power-up display
        let powerUpElement = document.getElementById('power-up-display');

        if (!powerUpElement) {
            powerUpElement = document.createElement('div');
            powerUpElement.id = 'power-up-display';
            powerUpElement.style.cssText = `
                position: absolute;
                bottom: 120px;
                left: 20px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 15px;
                border-radius: 10px;
                font-family: 'Arial', sans-serif;
                font-size: 14px;
                min-width: 200px;
                z-index: 1000;
            `;
            document.body.appendChild(powerUpElement);
        }

        let html = '<div style="font-weight: bold; margin-bottom: 8px; color: #ff00ff;">⚡ Power-ups</div>';

        if (this.car && this.car.hasPowerUp) {
            const powerUpConfig = this.powerUpSystem.powerUpTypes[this.car.powerUpType];
            if (powerUpConfig) {
                html += `
                    <div style="color: #00ff00; margin-bottom: 5px;">
                        Ready: ${powerUpConfig.name}
                    </div>
                    <div style="font-size: 12px; color: #cccccc;">
                        Press Q to use
                    </div>
                `;
            }
        } else {
            html += '<div style="color: #888888;">No power-up</div>';
        }

        if (this.powerUpSystem) {
            const activePowerUps = this.powerUpSystem.getActivePowerUps();
            if (activePowerUps.length > 0) {
                html += '<div style="margin-top: 10px; font-size: 12px; color: #ffff00;">Active Effects:</div>';
                activePowerUps.forEach(powerUp => {
                    html += `<div style="font-size: 11px; color: #ffffff;">
                        ${powerUp.type} (${powerUp.duration.toFixed(1)}s)
                    </div>`;
                });
            }

            const powerUpCount = this.powerUpSystem.getPowerUpCount();
            html += `<div style="margin-top: 8px; font-size: 11px; color: #cccccc;">
                Available on track: ${powerUpCount}
            </div>`;
        }

        powerUpElement.innerHTML = html;
    }

    gameLoop() {
        if (!this.gameState.isPlaying) return;

        const deltaTime = this.clock.getDelta();

        // Update performance integration systems FIRST
        if (this.performanceIntegration) {
            this.performanceIntegration.update(deltaTime);
        }

        // Update controls
        this.updateControls();

        // Update physics
        this.world.step(deltaTime);

        // Update car
        if (this.car) {
            this.car.update(deltaTime);

            // Pass time of day for headlight updates
            const timeOfDay = this.visualEffects ? this.visualEffects.timeOfDay : 0.5;
            this.car.updateVisualEffects(deltaTime, timeOfDay);

            this.updateCarVisualEffects(deltaTime);
        }

        // Update AI opponents
        if (this.aiManager && this.gameState.raceMode === 'ai') {
            this.aiManager.update(deltaTime, this.car);
        }

        // Update power-up system
        if (this.powerUpSystem) {
            const aiOpponents = this.aiManager ? this.aiManager.aiOpponents : [];
            this.powerUpSystem.update(deltaTime, this.car, aiOpponents);
        }

        // Update camera
        this.updateCamera();

        // Update UI
        this.updateUI();

        // Update visual effects
        if (this.visualEffects) {
            this.visualEffects.update(deltaTime);
        }

        // Check for lap completion
        this.checkLapCompletion();

        // Render with visual effects
        if (this.visualEffects) {
            this.visualEffects.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }

        // Continue loop
        requestAnimationFrame(() => this.gameLoop());
    }

    /**
     * Register track objects for optimization
     */
    registerTrackForOptimization() {
        console.log('🏁 Registering track objects for optimization');

        // Register track environment objects
        this.scene.traverse((object) => {
            if (object.isMesh && object !== this.car?.mesh) {
                // Determine object type for optimization
                let objectType = 'static';
                let config = { lod: true, cullingType: 'static' };

                // Special handling for different track elements
                if (object.name?.includes('tree')) {
                    objectType = 'tree';
                } else if (object.name?.includes('building')) {
                    objectType = 'building';
                } else if (object.name?.includes('barrier')) {
                    objectType = 'barrier';
                    config.important = true; // Barriers are important for collision
                }

                this.performanceIntegration.registerObject(object, objectType, config);
            }
        });
    }

    /**
     * Create performance monitoring UI
     */
    createPerformanceUI() {
        console.log('📊 Creating performance monitoring UI');

        // Create performance display element
        this.performanceUI = document.createElement('div');
        this.performanceUI.id = 'performance-ui';
        this.performanceUI.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: #00ff00;
            padding: 15px;
            border-radius: 10px;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            min-width: 200px;
            z-index: 1000;
            border: 1px solid #00ff00;
        `;
        document.body.appendChild(this.performanceUI);

        // Add performance controls
        this.addPerformanceControls();
    }

    /**
     * Add performance controls
     */
    addPerformanceControls() {
        // Add keyboard shortcuts for performance testing
        window.addEventListener('keydown', (event) => {
            if (event.code === 'F1') {
                this.togglePerformanceUI();
                event.preventDefault();
            } else if (event.code === 'F2') {
                this.generatePerformanceReport();
                event.preventDefault();
            } else if (event.code === 'F3') {
                this.toggleEmergencyMode();
                event.preventDefault();
            }
        });

        console.log('🎛️ Performance controls added:');
        console.log('  F1: Toggle performance UI');
        console.log('  F2: Generate performance report');
        console.log('  F3: Toggle emergency mode');
    }

    /**
     * Start performance monitoring updates
     */
    startPerformanceMonitoring() {
        // Update performance UI every second
        setInterval(() => {
            this.updatePerformanceUI();
        }, 1000);

        // Generate full report every 30 seconds
        setInterval(() => {
            if (Math.random() < 0.1) { // 10% chance to avoid spam
                this.generatePerformanceReport();
            }
        }, 30000);
    }

    /**
     * Update performance UI display
     */
    updatePerformanceUI() {
        if (!this.performanceUI || !this.performanceIntegration) return;

        const stats = this.performanceIntegration.getPerformanceStats();

        const html = `
            <div style="font-weight: bold; color: #ffff00; margin-bottom: 10px;">⚡ Speed Rivals Performance</div>

            <div style="margin-bottom: 8px;">
                <div>FPS: <span style="color: ${this.getFPSColor(stats.performance?.fps)}">${(stats.performance?.fps || 0).toFixed(1)}</span></div>
                <div>Frame Time: <span>${(stats.performance?.frameTime || 0).toFixed(2)}ms</span></div>
                <div>Quality: <span style="color: #00ffff;">${stats.performance?.quality || 'Auto'}</span></div>
            </div>

            <div style="margin-bottom: 8px;">
                <div>Memory: <span>${(stats.memory?.usedJSHeapSize / 1024 / 1024 || 0).toFixed(1)}MB</span></div>
                <div>Draw Calls: <span>${stats.webgl?.drawCalls || 0}</span></div>
                <div>Triangles: <span>${stats.webgl?.triangles || 0}</span></div>
            </div>

            <div style="margin-bottom: 8px;">
                <div>LOD Objects: <span>${stats.lod?.visibleObjects || 0}/${stats.lod?.totalObjects || 0}</span></div>
                <div>Culled: <span>${stats.culling?.culledObjects || 0}</span></div>
                <div>Pooled: <span>${stats.pooling?.pools?.particles?.inUse || 0}</span></div>
            </div>

            <div style="font-size: 10px; color: #888888; margin-top: 8px;">
                Systems: ${stats.integration?.systemsActive || 0} active<br>
                Platform: ${stats.platform?.type || 'Unknown'}<br>
                F1:UI F2:Report F3:Emergency
            </div>
        `;

        this.performanceUI.innerHTML = html;
    }

    /**
     * Get color for FPS display
     */
    getFPSColor(fps) {
        if (fps >= 55) return '#00ff00';  // Green - excellent
        if (fps >= 45) return '#ffff00';  // Yellow - good
        if (fps >= 30) return '#ff8800';  // Orange - fair
        return '#ff0000';                 // Red - poor
    }

    /**
     * Toggle performance UI visibility
     */
    togglePerformanceUI() {
        if (this.performanceUI) {
            this.performanceUI.style.display =
                this.performanceUI.style.display === 'none' ? 'block' : 'none';
        }
    }

    /**
     * Generate and display performance report
     */
    generatePerformanceReport() {
        if (!this.performanceIntegration) return;

        const report = this.performanceIntegration.generateOptimizationReport();

        console.log('📊 =================================');
        console.log('📊 SPEED RIVALS PERFORMANCE REPORT');
        console.log('📊 =================================');
        console.log(`📊 Current FPS: ${report.summary.currentFPS}`);
        console.log(`📊 Target FPS: ${report.summary.targetFPS}`);
        console.log(`📊 Performance Gain: ${report.summary.performanceGain}`);
        console.log(`📊 Memory Reduction: ${report.summary.memoryReduction}`);
        console.log(`📊 Quality Level: ${report.summary.qualityLevel}`);
        console.log(`📊 Platform: ${report.summary.platform}`);
        console.log('📊 ---------------------------------');
        console.log('📊 OPTIMIZATIONS:');
        Object.entries(report.systems).forEach(([system, status]) => {
            console.log(`📊   ${system}: ${status}`);
        });
        console.log('📊 ---------------------------------');
        console.log('📊 RECOMMENDATIONS:');
        report.recommendations.forEach((rec, i) => {
            console.log(`📊   ${i + 1}. ${rec}`);
        });
        console.log('📊 =================================');

        // Show notification
        this.showPerformanceNotification(`Performance Report Generated - ${report.summary.currentFPS} FPS`);
    }

    /**
     * Toggle emergency performance mode
     */
    toggleEmergencyMode() {
        if (!this.performanceIntegration) return;

        if (this.performanceIntegration.performanceMonitor?.performanceState?.emergencyMode) {
            this.performanceIntegration.disableEmergencyMode();
            this.showPerformanceNotification('Emergency Mode Disabled');
            console.log('✅ Emergency performance mode disabled');
        } else {
            this.performanceIntegration.enableEmergencyMode();
            this.showPerformanceNotification('Emergency Mode Enabled - Maximum Performance');
            console.log('🚨 Emergency performance mode enabled');
        }
    }

    /**
     * Show performance notification
     */
    showPerformanceNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: #00ff00;
            padding: 20px;
            border-radius: 10px;
            font-family: 'Arial', sans-serif;
            font-size: 16px;
            z-index: 2000;
            border: 2px solid #00ff00;
            text-align: center;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    /**
     * Setup multiplayer with network optimizations
     */
    setupMultiplayer() {
        if (this.gameState.raceMode === 'multiplayer' && this.performanceIntegration?.networkOptimizer) {
            console.log('🌐 Setting up optimized multiplayer networking');

            // This would connect to a multiplayer server with all network optimizations
            // For now, we'll just log that it's ready
            console.log('🌐 Multiplayer networking ready for implementation');
        } else {
            console.log('🌐 Multiplayer setup ready for implementation');
        }
    }
}

// Start the game when page loads
window.addEventListener('load', () => {
    new Game();
});