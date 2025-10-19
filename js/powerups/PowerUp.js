/**
 * PowerUp.js - Base class for all power-ups in Speed Rivals
 * Provides common functionality and interface for power-up implementations
 */

class PowerUp {
    constructor(scene, gameState, particleSystem, soundManager) {
        this.scene = scene;
        this.gameState = gameState;
        this.particleSystem = particleSystem;
        this.soundManager = soundManager;

        // Base properties
        this.type = 'base';
        this.duration = 3000; // 3 seconds default
        this.isActive = false;
        this.startTime = 0;
        this.endTime = 0;

        // Visual effects
        this.visualEffects = [];
        this.audioSource = null;

        // Player reference
        this.targetPlayer = null;
    }

    /**
     * Activate the power-up
     */
    activate() {
        if (this.isActive) return false;

        this.isActive = true;
        this.startTime = Date.now();
        this.endTime = this.startTime + this.duration;

        console.log(`🎮 Activating ${this.type} power-up`);

        // Play activation sound
        this.playActivationSound();

        // Create visual effects
        this.createVisualEffects();

        // Apply power-up effects
        this.applyEffects();

        return true;
    }

    /**
     * Deactivate the power-up
     */
    deactivate() {
        if (!this.isActive) return;

        this.isActive = false;

        console.log(`🎮 Deactivating ${this.type} power-up`);

        // Remove effects
        this.removeEffects();

        // Clean up visual effects
        this.cleanupVisualEffects();

        // Stop audio
        this.stopAudio();
    }

    /**
     * Update power-up state (called every frame)
     */
    update(deltaTime) {
        if (!this.isActive) return;

        // Update visual effects
        this.updateVisualEffects(deltaTime);

        // Update power-up specific logic
        this.updateEffects(deltaTime);

        // Check for expiration
        if (Date.now() >= this.endTime) {
            this.deactivate();
        }
    }

    /**
     * Check if power-up has expired
     */
    isExpired() {
        return !this.isActive && this.startTime > 0;
    }

    /**
     * Get remaining duration in milliseconds
     */
    getRemainingTime() {
        if (!this.isActive) return 0;
        return Math.max(0, this.endTime - Date.now());
    }

    /**
     * Get progress as percentage (0-1)
     */
    getProgress() {
        if (!this.isActive) return 1;
        return Math.min(1, (Date.now() - this.startTime) / this.duration);
    }

    /**
     * Play activation sound
     */
    playActivationSound() {
        if (this.soundManager && this.activationSound) {
            this.audioSource = this.soundManager.playSound(this.activationSound, this.volume || 0.5);
        }
    }

    /**
     * Play effect sound
     */
    playEffectSound(soundName, volume = 0.5) {
        if (this.soundManager) {
            this.soundManager.playSound(soundName, volume);
        }
    }

    /**
     * Stop audio
     */
    stopAudio() {
        if (this.audioSource && this.audioSource.stop) {
            this.audioSource.stop();
            this.audioSource = null;
        }
    }

    /**
     * Create visual effects (to be implemented by subclasses)
     */
    createVisualEffects() {
        // Base implementation - subclasses should override
    }

    /**
     * Update visual effects (to be implemented by subclasses)
     */
    updateVisualEffects(deltaTime) {
        // Base implementation - subclasses should override
    }

    /**
     * Clean up visual effects
     */
    cleanupVisualEffects() {
        this.visualEffects.forEach(effect => {
            if (effect.parent) {
                effect.parent.remove(effect);
            }
        });
        this.visualEffects = [];
    }

    /**
     * Apply power-up effects (to be implemented by subclasses)
     */
    applyEffects() {
        // Base implementation - subclasses should override
    }

    /**
     * Update effects during power-up duration (to be implemented by subclasses)
     */
    updateEffects(deltaTime) {
        // Base implementation - subclasses should override
    }

    /**
     * Remove power-up effects (to be implemented by subclasses)
     */
    removeEffects() {
        // Base implementation - subclasses should override
    }

    /**
     * Activate for other player (multiplayer)
     */
    activateForOtherPlayer(data) {
        this.isActive = true;
        this.startTime = data.timestamp;
        this.endTime = this.startTime + this.duration;

        // Create visual effects only (no gameplay effects for other players)
        this.createVisualEffects();
    }

    /**
     * Create particle effect at position
     */
    createParticleEffect(position, type, options = {}) {
        if (!this.particleSystem) return null;

        const defaultOptions = {
            count: 50,
            color: 0xffffff,
            size: 0.1,
            life: 1000,
            velocity: { x: 0, y: 1, z: 0 },
            spread: 1,
            ...options
        };

        return this.particleSystem.createEffect(position, type, defaultOptions);
    }

    /**
     * Create glow effect around object
     */
    createGlowEffect(object, color = 0xffffff, intensity = 0.5) {
        const glowGeometry = object.geometry.clone();
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: intensity,
            side: THREE.BackSide
        });

        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        glowMesh.scale.multiplyScalar(1.1);

        if (object.parent) {
            object.parent.add(glowMesh);
            this.visualEffects.push(glowMesh);
        }

        return glowMesh;
    }

    /**
     * Create trail effect
     */
    createTrailEffect(followObject, options = {}) {
        const trailOptions = {
            length: 20,
            color: 0xffffff,
            opacity: 0.7,
            width: 0.5,
            ...options
        };

        const trailGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(trailOptions.length * 3);
        const opacities = new Float32Array(trailOptions.length);

        for (let i = 0; i < trailOptions.length; i++) {
            positions[i * 3] = followObject.position.x;
            positions[i * 3 + 1] = followObject.position.y;
            positions[i * 3 + 2] = followObject.position.z;
            opacities[i] = (i / trailOptions.length) * trailOptions.opacity;
        }

        trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        trailGeometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));

        const trailMaterial = new THREE.PointsMaterial({
            color: trailOptions.color,
            size: trailOptions.width,
            transparent: true,
            vertexColors: false
        });

        const trail = new THREE.Points(trailGeometry, trailMaterial);
        this.scene.add(trail);
        this.visualEffects.push(trail);

        return trail;
    }

    /**
     * Create shield bubble effect
     */
    createShieldEffect(radius = 3, color = 0x00aaff) {
        const shieldGeometry = new THREE.SphereGeometry(radius, 16, 16);
        const shieldMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
            wireframe: true
        });

        const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);

        if (this.gameState.carObject) {
            this.gameState.carObject.add(shield);
            this.visualEffects.push(shield);
        }

        return shield;
    }

    /**
     * Create electric effect
     */
    createElectricEffect(target, options = {}) {
        const electricOptions = {
            color: 0xffff00,
            intensity: 1,
            frequency: 0.1,
            ...options
        };

        // Create electric arcs using line geometry
        const points = [];
        for (let i = 0; i < 10; i++) {
            points.push(new THREE.Vector3(
                (Math.random() - 0.5) * 4,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 4
            ));
        }

        const electricGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const electricMaterial = new THREE.LineBasicMaterial({
            color: electricOptions.color,
            transparent: true,
            opacity: 0.8
        });

        const electric = new THREE.Line(electricGeometry, electricMaterial);

        if (target) {
            target.add(electric);
            this.visualEffects.push(electric);
        }

        return electric;
    }

    /**
     * Apply screen shake effect
     */
    applyScreenShake(intensity = 0.5, duration = 500) {
        if (!this.gameState.camera) return;

        const originalPosition = this.gameState.camera.position.clone();
        const shakeStart = Date.now();

        const shakeUpdate = () => {
            const elapsed = Date.now() - shakeStart;
            if (elapsed >= duration) {
                this.gameState.camera.position.copy(originalPosition);
                return;
            }

            const progress = elapsed / duration;
            const shakeAmount = intensity * (1 - progress);

            this.gameState.camera.position.x = originalPosition.x + (Math.random() - 0.5) * shakeAmount;
            this.gameState.camera.position.y = originalPosition.y + (Math.random() - 0.5) * shakeAmount;
            this.gameState.camera.position.z = originalPosition.z + (Math.random() - 0.5) * shakeAmount;

            requestAnimationFrame(shakeUpdate);
        };

        shakeUpdate();
    }

    /**
     * Get nearby players within radius
     */
    getNearbyPlayers(position, radius) {
        // This would need to be implemented based on the game's player tracking system
        // For now, return empty array
        return [];
    }

    /**
     * Apply damage to player (for offensive power-ups)
     */
    applyDamageToPlayer(playerId, damageType) {
        // This would integrate with the game's damage system
        console.log(`Applying ${damageType} damage to player ${playerId}`);
    }

    /**
     * Check if player has immunity/shield
     */
    playerHasImmunity(playerId) {
        // This would check for active shield or star power
        return false;
    }

    /**
     * Serialize power-up state for network transmission
     */
    serialize() {
        return {
            type: this.type,
            isActive: this.isActive,
            startTime: this.startTime,
            duration: this.duration,
            progress: this.getProgress()
        };
    }

    /**
     * Deserialize power-up state from network data
     */
    deserialize(data) {
        this.type = data.type;
        this.isActive = data.isActive;
        this.startTime = data.startTime;
        this.duration = data.duration;
        this.endTime = this.startTime + this.duration;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PowerUp;
}