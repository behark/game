/**
 * PowerUpIntegration.js - Integration layer for power-ups in Speed Rivals
 * Connects the power-up system with the existing game infrastructure
 */

class PowerUpIntegration {
    constructor() {
        this.powerUpSystem = null;
        this.particleSystem = null;
        this.soundManager = null;
        this.gameState = null;
        this.scene = null;
        this.socket = null;

        // Power-up classes registry
        this.powerUpClasses = new Map();

        this.isInitialized = false;
    }

    /**
     * Initialize the power-up integration
     */
    async initialize(scene, gameState, socket) {
        console.log('🎮 Initializing Power-Up Integration...');

        this.scene = scene;
        this.gameState = gameState;
        this.socket = socket;

        try {
            // Initialize particle system
            this.particleSystem = new ParticleSystem(scene);

            // Initialize sound manager
            this.soundManager = new SoundManager();
            await this.soundManager.preloadSounds();

            // Initialize power-up system
            this.powerUpSystem = new PowerUpSystem(scene, socket, gameState);

            // Load and register power-up classes
            await this.loadPowerUpClasses();

            // Initialize the power-up system with loaded classes
            this.powerUpSystem.initialize(
                this.powerUpClasses,
                this.particleSystem,
                this.soundManager
            );

            // Setup game integration hooks
            this.setupGameHooks();

            // Setup UI controls
            this.setupUIControls();

            this.isInitialized = true;
            console.log('✅ Power-Up Integration initialized successfully');

        } catch (error) {
            console.error('❌ Failed to initialize Power-Up Integration:', error);
            throw error;
        }
    }

    /**
     * Load all power-up classes
     */
    async loadPowerUpClasses() {
        console.log('📦 Loading power-up classes...');

        // In a real implementation, these would be dynamic imports
        // For now, we'll assume they're loaded globally

        const powerUpTypes = [
            { name: 'nitro', className: 'NitroPowerUp' },
            { name: 'shield', className: 'ShieldPowerUp' },
            { name: 'emp', className: 'EMPPowerUp' },
            { name: 'missile', className: 'MissilePowerUp' },
            { name: 'star', className: 'StarPowerUp' },
            { name: 'rewind', className: 'TimeRewindPowerUp' },
            { name: 'smoke', className: 'SmokeScreenPowerUp' }
        ];

        for (const powerUp of powerUpTypes) {
            try {
                // In a browser environment, classes should be loaded via script tags
                // This is a placeholder for the class registration
                const PowerUpClass = window[powerUp.className];

                if (PowerUpClass) {
                    this.powerUpClasses.set(powerUp.name, PowerUpClass);
                    console.log(`✅ Loaded ${powerUp.className}`);
                } else {
                    console.warn(`⚠️ Power-up class not found: ${powerUp.className}`);
                }
            } catch (error) {
                console.error(`❌ Failed to load ${powerUp.className}:`, error);
            }
        }

        console.log(`📦 Loaded ${this.powerUpClasses.size} power-up classes`);
    }

    /**
     * Setup game integration hooks
     */
    setupGameHooks() {
        console.log('🔗 Setting up game integration hooks...');

        // Hook into existing game loop
        this.setupGameLoopHook();

        // Hook into collision detection
        this.setupCollisionHook();

        // Hook into player position updates
        this.setupPositionUpdateHook();

        // Hook into damage system
        this.setupDamageSystemHook();
    }

    /**
     * Setup game loop integration
     */
    setupGameLoopHook() {
        // Store original game loop function
        const originalGameLoop = window.updateGame;

        if (originalGameLoop) {
            window.updateGame = () => {
                // Call original game loop
                originalGameLoop.call(this);

                // Update power-up systems
                this.update();
            };
        } else {
            // Create our own update loop if none exists
            const updateLoop = () => {
                this.update();
                requestAnimationFrame(updateLoop);
            };
            updateLoop();
        }
    }

    /**
     * Setup collision detection hook
     */
    setupCollisionHook() {
        // Hook into player position updates to check for power-up collisions
        const originalPlayerUpdate = this.gameState.updatePosition;

        if (originalPlayerUpdate) {
            this.gameState.updatePosition = (...args) => {
                // Call original update
                const result = originalPlayerUpdate.apply(this.gameState, args);

                // Check for power-up collisions
                if (this.powerUpSystem && this.gameState.position) {
                    this.powerUpSystem.checkCollisions(
                        this.gameState.position,
                        this.gameState.playerId
                    );
                }

                return result;
            };
        }
    }

    /**
     * Setup position update hook
     */
    setupPositionUpdateHook() {
        // Monitor position changes for time rewind system
        if (this.gameState.position) {
            setInterval(() => {
                this.updatePositionTracking();
            }, 16); // ~60fps
        }
    }

    /**
     * Setup damage system hook
     */
    setupDamageSystemHook() {
        // Hook into damage application
        this.gameState.applyDamage = (damageType, amount, source) => {
            // Check for active defensive power-ups
            if (this.checkDamageImmunity(damageType, amount, source)) {
                return false; // Damage blocked
            }

            // Apply damage normally
            return this.applyGameDamage(damageType, amount, source);
        };
    }

    /**
     * Check if player has damage immunity
     */
    checkDamageImmunity(damageType, amount, source) {
        if (!this.powerUpSystem) return false;

        const playerId = this.gameState.playerId;

        // Check for Star Power immunity
        const starPower = this.powerUpSystem.getPowerUpAffectingPlayer(playerId, 'star');
        if (starPower && starPower.isPlayerInvincible()) {
            starPower.onDamageAttempt(damageType, amount);
            return true;
        }

        // Check for Shield protection
        const shield = this.powerUpSystem.getPowerUpAffectingPlayer(playerId, 'shield');
        if (shield && shield.shouldBlockDamage(damageType)) {
            return shield.onHit(amount);
        }

        return false;
    }

    /**
     * Apply game damage
     */
    applyGameDamage(damageType, amount, source) {
        // Implement actual damage application here
        console.log(`💥 Taking damage: ${damageType} (${amount}) from ${source}`);

        // In a real implementation, this would reduce health, apply effects, etc.
        return true;
    }

    /**
     * Update position tracking for time rewind
     */
    updatePositionTracking() {
        const rewindPowerUps = Array.from(this.powerUpClasses.values())
            .filter(cls => cls.prototype && cls.prototype.type === 'rewind');

        if (rewindPowerUps.length > 0 && this.gameState.position) {
            // Time rewind power-ups handle their own position tracking
        }
    }

    /**
     * Setup UI controls
     */
    setupUIControls() {
        console.log('🎮 Setting up power-up UI controls...');

        // Add power-up controls to existing controls display
        this.addPowerUpControlsToUI();

        // Setup volume control
        this.setupVolumeControl();

        // Setup power-up display
        this.setupPowerUpStatusDisplay();
    }

    /**
     * Add power-up controls to UI
     */
    addPowerUpControlsToUI() {
        const controlsElement = document.getElementById('controls');
        if (controlsElement) {
            const powerUpControls = document.createElement('div');
            powerUpControls.style.marginTop = '10px';
            powerUpControls.innerHTML = `
                <div><strong>Power-ups:</strong></div>
                <div>1/2/3 - Use Power-up</div>
                <div>M - Mute Sounds</div>
            `;
            controlsElement.appendChild(powerUpControls);
        }
    }

    /**
     * Setup volume control
     */
    setupVolumeControl() {
        // Add mute toggle
        document.addEventListener('keydown', (e) => {
            if (e.code === 'KeyM') {
                e.preventDefault();
                this.toggleSound();
            }
        });
    }

    /**
     * Setup power-up status display
     */
    setupPowerUpStatusDisplay() {
        // Create power-up status display
        const statusDisplay = document.createElement('div');
        statusDisplay.id = 'powerUpStatus';
        statusDisplay.style.cssText = `
            position: absolute;
            top: 120px;
            left: 20px;
            color: white;
            background: rgba(0,0,0,0.5);
            padding: 10px;
            border-radius: 5px;
            font-size: 12px;
            z-index: 100;
            max-width: 200px;
        `;

        document.body.appendChild(statusDisplay);
    }

    /**
     * Update power-up systems
     */
    update() {
        if (!this.isInitialized) return;

        const deltaTime = 16; // Assume 60fps for now

        try {
            // Update power-up system
            if (this.powerUpSystem) {
                this.powerUpSystem.update(deltaTime);
            }

            // Update particle system
            if (this.particleSystem) {
                this.particleSystem.update(deltaTime);
            }

            // Update status display
            this.updateStatusDisplay();

        } catch (error) {
            console.error('❌ Error updating power-up systems:', error);
        }
    }

    /**
     * Update status display
     */
    updateStatusDisplay() {
        const statusElement = document.getElementById('powerUpStatus');
        if (!statusElement || !this.powerUpSystem) return;

        const activePowerUps = this.powerUpSystem.activePowerUps.get(this.gameState.playerId) || [];
        const inventory = this.powerUpSystem.playerInventory || [];

        let statusHTML = '<div><strong>Power-ups:</strong></div>';

        // Show active power-ups
        if (activePowerUps.length > 0) {
            statusHTML += '<div style="color: #00ff00;">Active:</div>';
            activePowerUps.forEach(powerUp => {
                const info = powerUp.getStatusInfo();
                const timeLeft = Math.ceil(info.remainingTime / 1000);
                statusHTML += `<div>${info.icon} ${info.name} (${timeLeft}s)</div>`;
            });
        }

        // Show inventory
        if (inventory.length > 0) {
            statusHTML += '<div style="color: #ffaa00;">Ready:</div>';
            inventory.forEach((item, index) => {
                statusHTML += `<div>${index + 1}. ${item.type.toUpperCase()}</div>`;
            });
        }

        // Show empty slots
        const emptySlots = 3 - inventory.length;
        if (emptySlots > 0) {
            statusHTML += `<div style="color: #666;">Empty slots: ${emptySlots}</div>`;
        }

        statusElement.innerHTML = statusHTML;
    }

    /**
     * Toggle sound on/off
     */
    toggleSound() {
        if (this.soundManager) {
            const currentState = this.soundManager.getSettings().isEnabled;
            this.soundManager.setEnabled(!currentState);

            const statusElement = document.getElementById('powerUpStatus');
            if (statusElement) {
                const soundStatus = this.soundManager.getSettings().isEnabled ? 'ON' : 'OFF';
                statusElement.innerHTML += `<div style="color: yellow;">Sound: ${soundStatus}</div>`;

                setTimeout(() => {
                    this.updateStatusDisplay();
                }, 1000);
            }
        }
    }

    /**
     * Get power-up system interface for external use
     */
    getPowerUpSystem() {
        return this.powerUpSystem;
    }

    /**
     * Get particle system interface for external use
     */
    getParticleSystem() {
        return this.particleSystem;
    }

    /**
     * Get sound manager interface for external use
     */
    getSoundManager() {
        return this.soundManager;
    }

    /**
     * Manually trigger power-up use (for testing)
     */
    usePowerUp(index) {
        if (this.powerUpSystem) {
            return this.powerUpSystem.usePowerUp(index);
        }
        return false;
    }

    /**
     * Add power-up to inventory (for testing)
     */
    addPowerUpToInventory(type) {
        if (this.powerUpSystem && this.powerUpSystem.playerInventory) {
            this.powerUpSystem.playerInventory.push({
                type: type,
                collectTime: Date.now()
            });
            this.powerUpSystem.updateInventoryUI();
        }
    }

    /**
     * Clean up and dispose
     */
    dispose() {
        console.log('🧹 Disposing Power-Up Integration...');

        if (this.powerUpSystem) {
            this.powerUpSystem.dispose();
            this.powerUpSystem = null;
        }

        if (this.particleSystem) {
            this.particleSystem.dispose();
            this.particleSystem = null;
        }

        if (this.soundManager) {
            this.soundManager.dispose();
            this.soundManager = null;
        }

        // Remove UI elements
        const statusElement = document.getElementById('powerUpStatus');
        if (statusElement) {
            statusElement.remove();
        }

        const inventoryElement = document.getElementById('powerUpInventory');
        if (inventoryElement) {
            inventoryElement.remove();
        }

        this.isInitialized = false;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PowerUpIntegration;
}

// Global instance for browser use
window.powerUpIntegration = new PowerUpIntegration();