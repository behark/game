/**
 * NitroPowerUp.js - Nitro Boost power-up implementation
 * Provides a 3-second speed increase with exhaust trail visual effects
 */

class NitroPowerUp extends PowerUp {
    constructor(scene, gameState, particleSystem, soundManager) {
        super(scene, gameState, particleSystem, soundManager);

        this.type = 'nitro';
        this.duration = 3000; // 3 seconds
        this.speedMultiplier = 1.5; // 50% speed increase
        this.activationSound = 'nitro_boost';
        this.volume = 0.7;

        // Effect properties
        this.originalMaxSpeed = null;
        this.exhaustTrail = null;
        this.exhaustParticles = [];
        this.glowEffect = null;
    }

    /**
     * Apply nitro boost effects
     */
    applyEffects() {
        console.log('🚀 Applying Nitro Boost effects');

        // Store original speed and apply boost
        if (this.gameState.carPhysics) {
            this.originalMaxSpeed = this.gameState.carPhysics.maxSpeed;
            this.gameState.carPhysics.maxSpeed *= this.speedMultiplier;
            this.gameState.carPhysics.acceleration *= 1.3; // Faster acceleration too
        }

        // Apply immediate speed boost
        if (this.gameState.carPhysics && this.gameState.carPhysics.speed < this.gameState.carPhysics.maxSpeed) {
            this.gameState.carPhysics.speed = Math.min(
                this.gameState.carPhysics.speed * 1.2,
                this.gameState.carPhysics.maxSpeed
            );
        }
    }

    /**
     * Create visual effects
     */
    createVisualEffects() {
        console.log('🎨 Creating Nitro visual effects');

        const carObject = this.gameState.carObject || this.gameState.myCarGroup;
        if (!carObject) return;

        // Create blue glow around car
        this.glowEffect = this.createGlowEffect(carObject, 0x0088ff, 0.6);

        // Create exhaust trail effect
        this.createExhaustTrail(carObject);

        // Create particle burst effect
        this.createNitroParticles(carObject);

        // Create speed lines effect
        this.createSpeedLines();
    }

    /**
     * Create exhaust trail effect
     */
    createExhaustTrail(carObject) {
        const trailGeometry = new THREE.BufferGeometry();
        const trailMaterial = new THREE.PointsMaterial({
            color: 0x00aaff,
            size: 0.3,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        // Create trail points
        const maxPoints = 30;
        const positions = new Float32Array(maxPoints * 3);
        const colors = new Float32Array(maxPoints * 3);

        for (let i = 0; i < maxPoints; i++) {
            const backOffset = -3 - (i * 0.2); // Behind the car
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0.5;
            positions[i * 3 + 2] = backOffset;

            // Blue to transparent gradient
            const alpha = 1 - (i / maxPoints);
            colors[i * 3] = 0.2 * alpha;     // R
            colors[i * 3 + 1] = 0.6 * alpha; // G
            colors[i * 3 + 2] = 1.0 * alpha; // B
        }

        trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        trailGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        this.exhaustTrail = new THREE.Points(trailGeometry, trailMaterial);
        carObject.add(this.exhaustTrail);
        this.visualEffects.push(this.exhaustTrail);
    }

    /**
     * Create nitro particle burst
     */
    createNitroParticles(carObject) {
        const particleCount = 100;
        const particleGeometry = new THREE.BufferGeometry();
        const particleMaterial = new THREE.PointsMaterial({
            color: 0x00aaff,
            size: 0.2,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });

        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            // Start particles behind the car
            positions[i * 3] = (Math.random() - 0.5) * 2;     // X
            positions[i * 3 + 1] = Math.random() * 1;         // Y
            positions[i * 3 + 2] = -3 + Math.random() * -2;   // Z (behind car)

            // Particles move backwards and slightly outward
            velocities[i * 3] = (Math.random() - 0.5) * 0.1;     // X velocity
            velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.05; // Y velocity
            velocities[i * 3 + 2] = -0.2 - Math.random() * 0.1;   // Z velocity (backwards)
        }

        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.userData = {
            velocities: velocities,
            life: 1.0
        };

        const particles = new THREE.Points(particleGeometry, particleMaterial);
        carObject.add(particles);
        this.visualEffects.push(particles);
        this.exhaustParticles.push(particles);
    }

    /**
     * Create speed lines effect
     */
    createSpeedLines() {
        if (!this.gameState.camera) return;

        const lineCount = 50;
        const lineGeometry = new THREE.BufferGeometry();
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0x00aaff,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });

        const positions = new Float32Array(lineCount * 6); // 2 points per line
        const speeds = new Float32Array(lineCount);

        for (let i = 0; i < lineCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 20 + Math.random() * 30;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const y = (Math.random() - 0.5) * 10;

            // Line start
            positions[i * 6] = x;
            positions[i * 6 + 1] = y;
            positions[i * 6 + 2] = z;

            // Line end (longer in direction of movement)
            positions[i * 6 + 3] = x;
            positions[i * 6 + 4] = y;
            positions[i * 6 + 5] = z - 5;

            speeds[i] = 0.5 + Math.random() * 0.5;
        }

        lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        lineGeometry.userData = {
            speeds: speeds
        };

        const speedLines = new THREE.LineSegments(lineGeometry, lineMaterial);
        this.scene.add(speedLines);
        this.visualEffects.push(speedLines);
    }

    /**
     * Update visual effects
     */
    updateVisualEffects(deltaTime) {
        const progress = this.getProgress();

        // Update glow intensity
        if (this.glowEffect && this.glowEffect.material) {
            this.glowEffect.material.opacity = 0.6 * (1 - progress);
        }

        // Update exhaust trail
        if (this.exhaustTrail) {
            this.updateExhaustTrail();
        }

        // Update particles
        this.exhaustParticles.forEach(particles => {
            this.updateParticles(particles, deltaTime);
        });

        // Update speed lines
        this.updateSpeedLines();
    }

    /**
     * Update exhaust trail animation
     */
    updateExhaustTrail() {
        if (!this.exhaustTrail) return;

        const positions = this.exhaustTrail.geometry.attributes.position.array;
        const colors = this.exhaustTrail.geometry.attributes.color.array;

        // Shift trail points backward
        for (let i = positions.length - 3; i >= 3; i -= 3) {
            positions[i] = positions[i - 3];         // X
            positions[i + 1] = positions[i - 2];     // Y
            positions[i + 2] = positions[i - 1];     // Z

            colors[i] = colors[i - 3];         // R
            colors[i + 1] = colors[i - 2];     // G
            colors[i + 2] = colors[i - 1];     // B
        }

        // Add new point at car position
        positions[0] = 0;
        positions[1] = 0.5;
        positions[2] = -3;

        colors[0] = 0.2;
        colors[1] = 0.6;
        colors[2] = 1.0;

        this.exhaustTrail.geometry.attributes.position.needsUpdate = true;
        this.exhaustTrail.geometry.attributes.color.needsUpdate = true;
    }

    /**
     * Update particle system
     */
    updateParticles(particles, deltaTime) {
        const positions = particles.geometry.attributes.position.array;
        const velocities = particles.geometry.userData.velocities;

        for (let i = 0; i < positions.length; i += 3) {
            // Update positions
            positions[i] += velocities[i] * deltaTime;         // X
            positions[i + 1] += velocities[i + 1] * deltaTime; // Y
            positions[i + 2] += velocities[i + 2] * deltaTime; // Z

            // Reset particles that have moved too far
            if (positions[i + 2] < -10) {
                positions[i] = (Math.random() - 0.5) * 2;
                positions[i + 1] = Math.random() * 1;
                positions[i + 2] = -3;
            }
        }

        particles.geometry.attributes.position.needsUpdate = true;

        // Fade out particles over time
        const life = particles.geometry.userData.life;
        particles.geometry.userData.life = Math.max(0, life - deltaTime * 0.001);
        particles.material.opacity = particles.geometry.userData.life * 0.9;
    }

    /**
     * Update speed lines
     */
    updateSpeedLines() {
        this.visualEffects.forEach(effect => {
            if (effect.isLineSegments && effect.geometry.userData.speeds) {
                const positions = effect.geometry.attributes.position.array;
                const speeds = effect.geometry.userData.speeds;

                for (let i = 0; i < speeds.length; i++) {
                    const baseIndex = i * 6;

                    // Move lines toward camera
                    positions[baseIndex + 2] += speeds[i];     // Start Z
                    positions[baseIndex + 5] += speeds[i];     // End Z

                    // Reset lines that have passed the camera
                    if (positions[baseIndex + 2] > 10) {
                        positions[baseIndex + 2] = -50;
                        positions[baseIndex + 5] = -55;
                    }
                }

                effect.geometry.attributes.position.needsUpdate = true;
            }
        });
    }

    /**
     * Update effects during power-up duration
     */
    updateEffects(deltaTime) {
        // Maintain speed boost
        if (this.gameState.carPhysics && this.originalMaxSpeed) {
            // Gradually reduce boost as power-up expires
            const progress = this.getProgress();
            const currentMultiplier = 1 + (this.speedMultiplier - 1) * (1 - progress);
            this.gameState.carPhysics.maxSpeed = this.originalMaxSpeed * currentMultiplier;
        }

        // Play continuous boost sound
        if (this.soundManager && Date.now() % 1000 < 50) { // Every second
            this.playEffectSound('nitro_loop', 0.3);
        }
    }

    /**
     * Remove nitro boost effects
     */
    removeEffects() {
        console.log('🚀 Removing Nitro Boost effects');

        // Restore original speed
        if (this.gameState.carPhysics && this.originalMaxSpeed !== null) {
            this.gameState.carPhysics.maxSpeed = this.originalMaxSpeed;
            this.gameState.carPhysics.acceleration /= 1.3; // Restore acceleration
            this.originalMaxSpeed = null;
        }

        // Play deactivation sound
        this.playEffectSound('nitro_end', 0.4);
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
     * Get nitro boost status info
     */
    getStatusInfo() {
        return {
            type: this.type,
            name: 'Nitro Boost',
            description: '+50% speed for 3 seconds',
            remainingTime: this.getRemainingTime(),
            icon: '🚀',
            color: '#00aaff'
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NitroPowerUp;
}