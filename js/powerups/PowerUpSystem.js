/**
 * PowerUpSystem.js - Core power-up management system for Speed Rivals
 * Handles power-up spawning, collection, activation, and synchronization
 */

class PowerUpSystem {
    constructor(scene, socket, gameState) {
        this.scene = scene;
        this.socket = socket;
        this.gameState = gameState;

        // Power-up management
        this.activePowerUps = new Map(); // playerId -> active power-ups
        this.powerUpPickups = new Map(); // pickupId -> pickup object
        this.playerInventory = []; // Available power-ups for current player
        this.maxInventorySize = 3;

        // Spawn configuration
        this.spawnPoints = this.generateSpawnPoints();
        this.spawnInterval = 3000; // 3 seconds
        this.lastSpawnTime = 0;
        this.maxActivePickups = 8;

        // Balance configuration
        this.balanceConfig = {
            spawnRates: {
                'nitro': 0.25,
                'shield': 0.15,
                'emp': 0.10,
                'missile': 0.12,
                'star': 0.08,
                'rewind': 0.15,
                'smoke': 0.15
            },
            cooldowns: {
                'nitro': 8000,
                'shield': 12000,
                'emp': 15000,
                'missile': 10000,
                'star': 20000,
                'rewind': 25000,
                'smoke': 6000
            }
        };

        // Power-up classes registry
        this.powerUpClasses = new Map();
        this.particleSystem = null;
        this.soundManager = null;

        this.setupEventListeners();
        this.initializeUI();
    }

    /**
     * Initialize the power-up system with all power-up types
     */
    initialize(powerUpClasses, particleSystem, soundManager) {
        this.powerUpClasses = powerUpClasses;
        this.particleSystem = particleSystem;
        this.soundManager = soundManager;

        console.log('🎮 PowerUpSystem initialized with', powerUpClasses.size, 'power-up types');

        // Start spawning power-ups
        this.startSpawning();
    }

    /**
     * Generate strategic spawn points around the track
     */
    generateSpawnPoints() {
        const points = [];
        const trackRadius = 35;
        const numPoints = 16;

        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const x = Math.cos(angle) * trackRadius;
            const z = Math.sin(angle) * trackRadius;

            points.push({
                position: { x, y: 1, z },
                angle: angle,
                isCorner: i % 4 === 0, // Every 4th point is a corner
                lastSpawn: 0
            });
        }

        return points;
    }

    /**
     * Start the power-up spawning system
     */
    startSpawning() {
        setInterval(() => {
            this.spawnPowerUp();
        }, this.spawnInterval);
    }

    /**
     * Spawn a new power-up pickup
     */
    spawnPowerUp() {
        if (this.powerUpPickups.size >= this.maxActivePickups) return;

        // Find available spawn point
        const availablePoints = this.spawnPoints.filter(point =>
            Date.now() - point.lastSpawn > 5000
        );

        if (availablePoints.length === 0) return;

        const spawnPoint = availablePoints[Math.floor(Math.random() * availablePoints.length)];
        const powerUpType = this.selectRandomPowerUpType();

        if (!this.powerUpClasses.has(powerUpType)) return;

        const pickupId = `pickup_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const pickup = this.createPickupVisual(powerUpType, spawnPoint.position);

        this.powerUpPickups.set(pickupId, {
            id: pickupId,
            type: powerUpType,
            position: spawnPoint.position,
            visual: pickup,
            spawnTime: Date.now(),
            collected: false
        });

        spawnPoint.lastSpawn = Date.now();
        this.scene.add(pickup);

        // Play spawn sound
        if (this.soundManager) {
            this.soundManager.playSound('powerup_spawn', 0.3);
        }

        // Notify other players if multiplayer
        if (this.socket && this.socket.connected) {
            this.socket.emit('powerUpSpawned', {
                id: pickupId,
                type: powerUpType,
                position: spawnPoint.position
            });
        }
    }

    /**
     * Select random power-up type based on spawn rates
     */
    selectRandomPowerUpType() {
        const rand = Math.random();
        let cumulative = 0;

        for (const [type, rate] of Object.entries(this.balanceConfig.spawnRates)) {
            cumulative += rate;
            if (rand <= cumulative) {
                return type;
            }
        }

        return 'nitro'; // Default fallback
    }

    /**
     * Create visual representation of power-up pickup
     */
    createPickupVisual(type, position) {
        const group = new THREE.Group();

        // Base platform
        const platformGeometry = new THREE.CylinderGeometry(1.2, 1.2, 0.2, 8);
        const platformMaterial = new THREE.MeshLambertMaterial({
            color: 0x444444,
            transparent: true,
            opacity: 0.8
        });
        const platform = new THREE.Mesh(platformGeometry, platformMaterial);
        platform.position.y = -0.4;
        group.add(platform);

        // Power-up icon based on type
        const iconGeometry = new THREE.BoxGeometry(1, 1, 1);
        const iconColors = {
            'nitro': 0xff4400,
            'shield': 0x00aaff,
            'emp': 0xffff00,
            'missile': 0xff0044,
            'star': 0xffaa00,
            'rewind': 0xaa44ff,
            'smoke': 0x666666
        };

        const iconMaterial = new THREE.MeshLambertMaterial({
            color: iconColors[type] || 0xffffff,
            emissive: iconColors[type] || 0xffffff,
            emissiveIntensity: 0.3
        });

        const icon = new THREE.Mesh(iconGeometry, iconMaterial);
        icon.userData = { type: type };
        group.add(icon);

        // Floating animation
        group.userData = {
            originalY: position.y,
            rotationSpeed: 0.02,
            floatSpeed: 0.03,
            floatAmount: 0.5
        };

        group.position.copy(position);

        return group;
    }

    /**
     * Check for power-up collection
     */
    checkCollisions(playerPosition, playerId) {
        const collectionDistance = 2.5;

        for (const [pickupId, pickup] of this.powerUpPickups.entries()) {
            if (pickup.collected) continue;

            const distance = Math.sqrt(
                Math.pow(playerPosition.x - pickup.position.x, 2) +
                Math.pow(playerPosition.z - pickup.position.z, 2)
            );

            if (distance < collectionDistance) {
                this.collectPowerUp(pickupId, playerId);
                break;
            }
        }
    }

    /**
     * Collect a power-up
     */
    collectPowerUp(pickupId, playerId) {
        const pickup = this.powerUpPickups.get(pickupId);
        if (!pickup || pickup.collected) return;

        if (this.playerInventory.length >= this.maxInventorySize) {
            // Inventory full, show message
            this.showMessage('Inventory Full!', 'warning');
            return;
        }

        pickup.collected = true;

        // Add to inventory
        this.playerInventory.push({
            type: pickup.type,
            collectTime: Date.now()
        });

        // Remove visual
        this.scene.remove(pickup.visual);
        this.powerUpPickups.delete(pickupId);

        // Play collection sound
        if (this.soundManager) {
            this.soundManager.playSound('powerup_collect', 0.5);
        }

        // Show collection effect
        if (this.particleSystem) {
            this.particleSystem.createCollectionEffect(pickup.position, pickup.type);
        }

        this.updateInventoryUI();
        this.showMessage(`Collected ${pickup.type.toUpperCase()}!`, 'success');

        // Notify server
        if (this.socket && this.socket.connected) {
            this.socket.emit('powerUpCollected', {
                pickupId: pickupId,
                playerId: playerId,
                type: pickup.type
            });
        }
    }

    /**
     * Use a power-up from inventory
     */
    usePowerUp(index = 0) {
        if (index >= this.playerInventory.length) return false;

        const powerUp = this.playerInventory[index];
        const PowerUpClass = this.powerUpClasses.get(powerUp.type);

        if (!PowerUpClass) return false;

        // Check cooldown
        const lastUsed = this.gameState.lastPowerUpUsed?.[powerUp.type] || 0;
        const cooldown = this.balanceConfig.cooldowns[powerUp.type];

        if (Date.now() - lastUsed < cooldown) {
            const remaining = Math.ceil((cooldown - (Date.now() - lastUsed)) / 1000);
            this.showMessage(`Cooldown: ${remaining}s`, 'warning');
            return false;
        }

        // Remove from inventory
        this.playerInventory.splice(index, 1);

        // Create and activate power-up
        const powerUpInstance = new PowerUpClass(
            this.scene,
            this.gameState,
            this.particleSystem,
            this.soundManager
        );

        powerUpInstance.activate();

        // Track active power-up
        const playerId = this.gameState.playerId;
        if (!this.activePowerUps.has(playerId)) {
            this.activePowerUps.set(playerId, []);
        }
        this.activePowerUps.get(playerId).push(powerUpInstance);

        // Update cooldown
        if (!this.gameState.lastPowerUpUsed) {
            this.gameState.lastPowerUpUsed = {};
        }
        this.gameState.lastPowerUpUsed[powerUp.type] = Date.now();

        this.updateInventoryUI();

        // Notify server
        if (this.socket && this.socket.connected) {
            this.socket.emit('powerUpUsed', {
                playerId: playerId,
                type: powerUp.type,
                timestamp: Date.now()
            });
        }

        return true;
    }

    /**
     * Update all active power-ups
     */
    update(deltaTime) {
        // Animate pickup visuals
        for (const pickup of this.powerUpPickups.values()) {
            if (pickup.visual && pickup.visual.userData) {
                const userData = pickup.visual.userData;

                // Rotation
                pickup.visual.rotation.y += userData.rotationSpeed;

                // Floating
                const time = Date.now() * 0.001;
                pickup.visual.position.y = userData.originalY +
                    Math.sin(time * userData.floatSpeed) * userData.floatAmount;
            }
        }

        // Update active power-ups
        for (const [playerId, powerUps] of this.activePowerUps.entries()) {
            for (let i = powerUps.length - 1; i >= 0; i--) {
                const powerUp = powerUps[i];
                powerUp.update(deltaTime);

                if (powerUp.isExpired()) {
                    powerUp.deactivate();
                    powerUps.splice(i, 1);
                }
            }

            if (powerUps.length === 0) {
                this.activePowerUps.delete(playerId);
            }
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Keyboard controls for using power-ups
        document.addEventListener('keydown', (e) => {
            switch(e.code) {
                case 'Digit1':
                    e.preventDefault();
                    this.usePowerUp(0);
                    break;
                case 'Digit2':
                    e.preventDefault();
                    this.usePowerUp(1);
                    break;
                case 'Digit3':
                    e.preventDefault();
                    this.usePowerUp(2);
                    break;
            }
        });

        // Socket event listeners
        if (this.socket) {
            this.socket.on('powerUpSpawned', (data) => {
                // Handle power-up spawned by server
                if (!this.powerUpPickups.has(data.id)) {
                    const pickup = this.createPickupVisual(data.type, data.position);
                    this.powerUpPickups.set(data.id, {
                        id: data.id,
                        type: data.type,
                        position: data.position,
                        visual: pickup,
                        spawnTime: Date.now(),
                        collected: false
                    });
                    this.scene.add(pickup);
                }
            });

            this.socket.on('powerUpCollected', (data) => {
                // Handle power-up collected by other player
                const pickup = this.powerUpPickups.get(data.pickupId);
                if (pickup) {
                    this.scene.remove(pickup.visual);
                    this.powerUpPickups.delete(data.pickupId);
                }
            });

            this.socket.on('powerUpUsed', (data) => {
                // Handle power-up used by other player
                this.handleRemotePowerUpUse(data);
            });
        }
    }

    /**
     * Handle power-up use by remote player
     */
    handleRemotePowerUpUse(data) {
        const PowerUpClass = this.powerUpClasses.get(data.type);
        if (!PowerUpClass) return;

        // Create power-up instance for other player
        const powerUpInstance = new PowerUpClass(
            this.scene,
            { playerId: data.playerId }, // Minimal game state for other player
            this.particleSystem,
            this.soundManager
        );

        powerUpInstance.activateForOtherPlayer(data);

        // Track active power-up
        if (!this.activePowerUps.has(data.playerId)) {
            this.activePowerUps.set(data.playerId, []);
        }
        this.activePowerUps.get(data.playerId).push(powerUpInstance);
    }

    /**
     * Initialize UI elements
     */
    initializeUI() {
        // Create power-up inventory UI
        const inventoryUI = document.createElement('div');
        inventoryUI.id = 'powerUpInventory';
        inventoryUI.style.cssText = `
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 10px;
            z-index: 100;
        `;

        for (let i = 0; i < this.maxInventorySize; i++) {
            const slot = document.createElement('div');
            slot.className = 'powerup-slot';
            slot.style.cssText = `
                width: 60px;
                height: 60px;
                background: rgba(0,0,0,0.7);
                border: 2px solid #555;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 12px;
                text-align: center;
                position: relative;
            `;

            // Key indicator
            const keyIndicator = document.createElement('div');
            keyIndicator.textContent = i + 1;
            keyIndicator.style.cssText = `
                position: absolute;
                top: 2px;
                right: 4px;
                font-size: 10px;
                color: #aaa;
            `;
            slot.appendChild(keyIndicator);

            inventoryUI.appendChild(slot);
        }

        document.body.appendChild(inventoryUI);

        // Create message system
        const messageContainer = document.createElement('div');
        messageContainer.id = 'powerUpMessages';
        messageContainer.style.cssText = `
            position: absolute;
            top: 100px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 200;
            pointer-events: none;
        `;
        document.body.appendChild(messageContainer);
    }

    /**
     * Update inventory UI
     */
    updateInventoryUI() {
        const slots = document.querySelectorAll('.powerup-slot');

        slots.forEach((slot, index) => {
            const powerUp = this.playerInventory[index];
            const keyIndicator = slot.querySelector('div');

            if (powerUp) {
                const iconColors = {
                    'nitro': '#ff4400',
                    'shield': '#00aaff',
                    'emp': '#ffff00',
                    'missile': '#ff0044',
                    'star': '#ffaa00',
                    'rewind': '#aa44ff',
                    'smoke': '#666666'
                };

                slot.style.background = iconColors[powerUp.type] || '#333';
                slot.style.border = '2px solid white';

                // Remove old content except key indicator
                while (slot.firstChild !== keyIndicator) {
                    slot.removeChild(slot.firstChild);
                }

                // Add power-up icon text
                const icon = document.createElement('div');
                icon.textContent = powerUp.type.substring(0, 3).toUpperCase();
                icon.style.marginTop = '10px';
                slot.appendChild(icon);
            } else {
                slot.style.background = 'rgba(0,0,0,0.7)';
                slot.style.border = '2px solid #555';

                // Remove old content except key indicator
                while (slot.firstChild !== keyIndicator) {
                    slot.removeChild(slot.firstChild);
                }
            }
        });
    }

    /**
     * Show message to player
     */
    showMessage(text, type = 'info') {
        const container = document.getElementById('powerUpMessages');
        if (!container) return;

        const message = document.createElement('div');
        message.textContent = text;
        message.style.cssText = `
            background: ${type === 'success' ? 'rgba(0,255,0,0.8)' :
                        type === 'warning' ? 'rgba(255,255,0,0.8)' :
                        'rgba(0,100,255,0.8)'};
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            margin-bottom: 10px;
            font-weight: bold;
            animation: powerUpMessage 3s ease-out forwards;
        `;

        container.appendChild(message);

        // Remove message after animation
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 3000);
    }

    /**
     * Get power-up affecting player
     */
    getPowerUpAffectingPlayer(playerId, type) {
        const playerPowerUps = this.activePowerUps.get(playerId);
        if (!playerPowerUps) return null;

        return playerPowerUps.find(powerUp => powerUp.type === type);
    }

    /**
     * Clean up power-up system
     */
    dispose() {
        // Clear all pickups
        for (const pickup of this.powerUpPickups.values()) {
            this.scene.remove(pickup.visual);
        }
        this.powerUpPickups.clear();

        // Deactivate all power-ups
        for (const powerUps of this.activePowerUps.values()) {
            powerUps.forEach(powerUp => powerUp.deactivate());
        }
        this.activePowerUps.clear();

        // Remove UI
        const inventoryUI = document.getElementById('powerUpInventory');
        if (inventoryUI) inventoryUI.remove();

        const messageContainer = document.getElementById('powerUpMessages');
        if (messageContainer) messageContainer.remove();
    }
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes powerUpMessage {
        0% { transform: translateY(-20px); opacity: 0; }
        10% { transform: translateY(0); opacity: 1; }
        90% { transform: translateY(0); opacity: 1; }
        100% { transform: translateY(-20px); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PowerUpSystem;
}