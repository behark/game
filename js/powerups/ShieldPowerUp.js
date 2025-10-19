/**
 * ShieldPowerUp.js - Shield power-up implementation
 * Provides 5-second protection from attacks and obstacles with bubble effect
 */

class ShieldPowerUp extends PowerUp {
    constructor(scene, gameState, particleSystem, soundManager) {
        super(scene, gameState, particleSystem, soundManager);

        this.type = 'shield';
        this.duration = 5000; // 5 seconds
        this.activationSound = 'shield_activate';
        this.volume = 0.6;

        // Shield properties
        this.shieldBubble = null;
        this.shieldParticles = [];
        this.isImmune = false;
        this.hitCount = 0;
        this.maxHits = 3; // Shield can absorb 3 hits before breaking

        // Visual effects
        this.pulseEffect = null;
        this.energyRings = [];
    }

    /**
     * Apply shield effects
     */
    applyEffects() {
        console.log('🛡️ Applying Shield effects');

        this.isImmune = true;

        // Register shield status in game state
        if (this.gameState.powerUpStates) {
            this.gameState.powerUpStates.hasShield = true;
            this.gameState.powerUpStates.shieldHits = this.maxHits;
        }

        // Create immunity flag for collision detection
        this.gameState.isImmune = true;
    }

    /**
     * Create visual effects
     */
    createVisualEffects() {
        console.log('🎨 Creating Shield visual effects');

        const carObject = this.gameState.carObject || this.gameState.myCarGroup;
        if (!carObject) return;

        // Create main shield bubble
        this.createShieldBubble(carObject);

        // Create energy particles
        this.createEnergyParticles(carObject);

        // Create rotating energy rings
        this.createEnergyRings(carObject);

        // Create pulse effect
        this.createPulseEffect(carObject);

        // Create activation burst
        this.createActivationBurst(carObject);
    }

    /**
     * Create shield bubble effect
     */
    createShieldBubble(carObject) {
        const shieldGeometry = new THREE.SphereGeometry(3.5, 32, 32);
        const shieldMaterial = new THREE.MeshBasicMaterial({
            color: 0x00aaff,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });

        // Add hexagonal pattern
        const hexTexture = this.createHexagonalTexture();
        shieldMaterial.map = hexTexture;

        this.shieldBubble = new THREE.Mesh(shieldGeometry, shieldMaterial);
        this.shieldBubble.position.y = 0.5;

        carObject.add(this.shieldBubble);
        this.visualEffects.push(this.shieldBubble);
    }

    /**
     * Create hexagonal texture for shield
     */
    createHexagonalTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Fill with transparent background
        ctx.fillStyle = 'rgba(0, 0, 0, 0)';
        ctx.fillRect(0, 0, 256, 256);

        // Draw hexagonal pattern
        ctx.strokeStyle = 'rgba(0, 170, 255, 0.5)';
        ctx.lineWidth = 2;

        const hexSize = 20;
        for (let x = 0; x < 256; x += hexSize * 1.5) {
            for (let y = 0; y < 256; y += hexSize * Math.sqrt(3)) {
                this.drawHexagon(ctx, x, y + (x % (hexSize * 3) === 0 ? 0 : hexSize * Math.sqrt(3) / 2), hexSize);
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);

        return texture;
    }

    /**
     * Draw hexagon on canvas
     */
    drawHexagon(ctx, x, y, size) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const hexX = x + size * Math.cos(angle);
            const hexY = y + size * Math.sin(angle);
            if (i === 0) {
                ctx.moveTo(hexX, hexY);
            } else {
                ctx.lineTo(hexX, hexY);
            }
        }
        ctx.closePath();
        ctx.stroke();
    }

    /**
     * Create energy particles around shield
     */
    createEnergyParticles(carObject) {
        const particleCount = 60;
        const particleGeometry = new THREE.BufferGeometry();
        const particleMaterial = new THREE.PointsMaterial({
            color: 0x00aaff,
            size: 0.15,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        const phases = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            // Distribute particles around sphere
            const phi = Math.random() * Math.PI * 2;
            const theta = Math.random() * Math.PI;
            const radius = 3.2 + Math.random() * 0.6;

            positions[i * 3] = radius * Math.sin(theta) * Math.cos(phi);
            positions[i * 3 + 1] = radius * Math.cos(theta) + 0.5;
            positions[i * 3 + 2] = radius * Math.sin(theta) * Math.sin(phi);

            velocities[i * 3] = (Math.random() - 0.5) * 0.02;
            velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;

            phases[i] = Math.random() * Math.PI * 2;
        }

        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.userData = {
            velocities: velocities,
            phases: phases,
            basePositions: positions.slice()
        };

        const particles = new THREE.Points(particleGeometry, particleMaterial);
        carObject.add(particles);
        this.visualEffects.push(particles);
        this.shieldParticles.push(particles);
    }

    /**
     * Create rotating energy rings
     */
    createEnergyRings(carObject) {
        for (let i = 0; i < 3; i++) {
            const ringGeometry = new THREE.RingGeometry(2.5 + i * 0.3, 2.7 + i * 0.3, 32);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: 0x00aaff,
                transparent: true,
                opacity: 0.4 - i * 0.1,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending
            });

            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.position.y = 0.5;
            ring.rotation.x = Math.PI / 2;
            ring.userData = {
                rotationSpeed: (0.02 + i * 0.01) * (i % 2 === 0 ? 1 : -1),
                originalOpacity: 0.4 - i * 0.1
            };

            carObject.add(ring);
            this.visualEffects.push(ring);
            this.energyRings.push(ring);
        }
    }

    /**
     * Create pulse effect
     */
    createPulseEffect(carObject) {
        const pulseGeometry = new THREE.SphereGeometry(1, 16, 16);
        const pulseMaterial = new THREE.MeshBasicMaterial({
            color: 0x00aaff,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending
        });

        this.pulseEffect = new THREE.Mesh(pulseGeometry, pulseMaterial);
        this.pulseEffect.position.y = 0.5;

        carObject.add(this.pulseEffect);
        this.visualEffects.push(this.pulseEffect);
    }

    /**
     * Create activation burst effect
     */
    createActivationBurst(carObject) {
        if (!this.particleSystem) return;

        const burstPosition = {
            x: carObject.position.x,
            y: carObject.position.y + 1,
            z: carObject.position.z
        };

        this.particleSystem.createEffect(burstPosition, 'burst', {
            count: 100,
            color: 0x00aaff,
            size: 0.3,
            life: 2000,
            velocity: { x: 0, y: 2, z: 0 },
            spread: 3
        });
    }

    /**
     * Update visual effects
     */
    updateVisualEffects(deltaTime) {
        const time = Date.now() * 0.001;
        const progress = this.getProgress();

        // Update shield bubble
        if (this.shieldBubble) {
            this.shieldBubble.rotation.y += 0.01;
            this.shieldBubble.material.opacity = 0.3 * (1 - progress * 0.3);

            // Pulse effect when shield is hit
            if (this.hitCount > 0) {
                const hitProgress = (this.hitCount / this.maxHits);
                this.shieldBubble.material.opacity += Math.sin(time * 10) * 0.2 * hitProgress;
            }
        }

        // Update energy particles
        this.shieldParticles.forEach(particles => {
            this.updateEnergyParticles(particles, time);
        });

        // Update energy rings
        this.energyRings.forEach(ring => {
            ring.rotation.z += ring.userData.rotationSpeed;
            ring.material.opacity = ring.userData.originalOpacity * (1 - progress * 0.5);
        });

        // Update pulse effect
        if (this.pulseEffect) {
            const pulseScale = 1 + Math.sin(time * 4) * 0.1;
            this.pulseEffect.scale.setScalar(pulseScale);
            this.pulseEffect.material.opacity = Math.sin(time * 8) * 0.2;
        }

        // Warning effect when shield is almost expired
        if (progress > 0.8) {
            const warningIntensity = Math.sin(time * 15) * 0.5;
            this.visualEffects.forEach(effect => {
                if (effect.material && effect.material.color) {
                    effect.material.color.lerp(new THREE.Color(0xff4400), warningIntensity * 0.3);
                }
            });
        }
    }

    /**
     * Update energy particles
     */
    updateEnergyParticles(particles, time) {
        const positions = particles.geometry.attributes.position.array;
        const velocities = particles.geometry.userData.velocities;
        const phases = particles.geometry.userData.phases;
        const basePositions = particles.geometry.userData.basePositions;

        for (let i = 0; i < positions.length; i += 3) {
            const index = i / 3;

            // Orbital motion around the shield
            const orbitRadius = 3.2 + Math.sin(time + phases[index]) * 0.3;
            const orbitSpeed = 0.5;

            positions[i] = basePositions[i] + Math.cos(time * orbitSpeed + phases[index]) * 0.1;
            positions[i + 1] = basePositions[i + 1] + Math.sin(time * orbitSpeed * 0.7 + phases[index]) * 0.1;
            positions[i + 2] = basePositions[i + 2] + Math.sin(time * orbitSpeed + phases[index]) * 0.1;
        }

        particles.geometry.attributes.position.needsUpdate = true;
    }

    /**
     * Update effects during power-up duration
     */
    updateEffects(deltaTime) {
        // Play ambient shield sound
        if (this.soundManager && Date.now() % 2000 < 50) { // Every 2 seconds
            this.playEffectSound('shield_ambient', 0.2);
        }

        // Check for hits and reduce shield strength
        if (this.hitCount >= this.maxHits) {
            this.deactivate();
        }
    }

    /**
     * Handle shield being hit
     */
    onHit(damage = 1) {
        if (!this.isActive) return false;

        this.hitCount += damage;
        console.log(`🛡️ Shield hit! ${this.hitCount}/${this.maxHits}`);

        // Play hit sound
        this.playEffectSound('shield_hit', 0.5);

        // Create hit effect
        this.createHitEffect();

        // Apply screen shake
        this.applyScreenShake(0.3, 200);

        // Check if shield is broken
        if (this.hitCount >= this.maxHits) {
            this.breakShield();
            return false; // Shield broken
        }

        return true; // Hit absorbed
    }

    /**
     * Create hit effect
     */
    createHitEffect() {
        if (!this.shieldBubble) return;

        // Flash effect
        const originalColor = this.shieldBubble.material.color.clone();
        this.shieldBubble.material.color.setHex(0xffffff);

        setTimeout(() => {
            if (this.shieldBubble && this.shieldBubble.material) {
                this.shieldBubble.material.color.copy(originalColor);
            }
        }, 100);

        // Ripple effect
        if (this.particleSystem) {
            this.particleSystem.createEffect(this.shieldBubble.position, 'ripple', {
                count: 20,
                color: 0x00aaff,
                size: 0.2,
                life: 500,
                velocity: { x: 0, y: 0, z: 0 },
                spread: 2
            });
        }
    }

    /**
     * Break shield prematurely
     */
    breakShield() {
        console.log('🛡️ Shield broken!');

        // Play break sound
        this.playEffectSound('shield_break', 0.7);

        // Create break effect
        if (this.particleSystem && this.shieldBubble) {
            this.particleSystem.createEffect(this.shieldBubble.position, 'explosion', {
                count: 50,
                color: 0x00aaff,
                size: 0.3,
                life: 1000,
                velocity: { x: 0, y: 1, z: 0 },
                spread: 4
            });
        }

        // Apply strong screen shake
        this.applyScreenShake(0.8, 500);

        // Force deactivation
        this.deactivate();
    }

    /**
     * Remove shield effects
     */
    removeEffects() {
        console.log('🛡️ Removing Shield effects');

        this.isImmune = false;

        // Remove shield status from game state
        if (this.gameState.powerUpStates) {
            this.gameState.powerUpStates.hasShield = false;
            this.gameState.powerUpStates.shieldHits = 0;
        }

        this.gameState.isImmune = false;

        // Play deactivation sound
        this.playEffectSound('shield_end', 0.4);
    }

    /**
     * Activate for other player (multiplayer)
     */
    activateForOtherPlayer(data) {
        super.activateForOtherPlayer(data);

        // Find other player's car and create effects
        const otherPlayerCar = this.scene.getObjectByName(`player_${data.playerId}`);
        if (otherPlayerCar) {
            this.gameState = { carObject: otherPlayerCar };
            this.createVisualEffects();
        }
    }

    /**
     * Check if damage should be blocked
     */
    shouldBlockDamage(damageType) {
        if (!this.isActive || !this.isImmune) return false;

        // Shield blocks most damage types
        const blockableDamage = ['collision', 'missile', 'emp', 'environmental'];
        return blockableDamage.includes(damageType);
    }

    /**
     * Get shield status info
     */
    getStatusInfo() {
        return {
            type: this.type,
            name: 'Energy Shield',
            description: `Protection from attacks (${this.maxHits - this.hitCount}/${this.maxHits} hits)`,
            remainingTime: this.getRemainingTime(),
            icon: '🛡️',
            color: '#00aaff',
            hitCount: this.hitCount,
            maxHits: this.maxHits
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShieldPowerUp;
}