/**
 * SmokeScreenPowerUp.js - Smoke Screen power-up implementation
 * Create vision-obscuring cloud trail behind car
 */

class SmokeScreenPowerUp extends PowerUp {
    constructor(scene, gameState, particleSystem, soundManager) {
        super(scene, gameState, particleSystem, soundManager);

        this.type = 'smoke';
        this.duration = 6000; // 6 seconds of smoke generation
        this.activationSound = 'smoke_deploy';
        this.volume = 0.5;

        // Smoke properties
        this.smokeClouds = [];
        this.smokeTrail = [];
        this.isGeneratingSmoke = false;
        this.smokeGenerationRate = 100; // milliseconds between smoke puffs
        this.lastSmokeTime = 0;

        // Visual properties
        this.smokeTexture = null;
        this.maxSmokeClouds = 30;
        this.smokeLifetime = 8000; // 8 seconds for each smoke cloud
    }

    /**
     * Apply smoke screen effects
     */
    applyEffects() {
        console.log('💨 Deploying Smoke Screen...');

        this.isGeneratingSmoke = true;
        this.lastSmokeTime = Date.now();

        // Create initial smoke burst
        this.createInitialSmokeBurst();
    }

    /**
     * Create initial smoke burst effect
     */
    createInitialSmokeBurst() {
        const carObject = this.gameState.carObject || this.gameState.myCarGroup;
        if (!carObject) return;

        // Create multiple smoke puffs immediately
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                this.createSmokePuff(carObject.position, i * 0.5);
            }, i * 100);
        }
    }

    /**
     * Create visual effects
     */
    createVisualEffects() {
        console.log('🎨 Creating Smoke Screen visual effects');

        // Create smoke texture if not exists
        if (!this.smokeTexture) {
            this.smokeTexture = this.createSmokeTexture();
        }

        // Smoke generation is handled in update loop
        // Visual effects are the smoke clouds themselves
    }

    /**
     * Create smoke texture
     */
    createSmokeTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        // Create radial gradient for smoke
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(100, 100, 100, 0.8)');
        gradient.addColorStop(0.3, 'rgba(80, 80, 80, 0.6)');
        gradient.addColorStop(0.7, 'rgba(60, 60, 60, 0.3)');
        gradient.addColorStop(1, 'rgba(40, 40, 40, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);

        // Add some noise for realistic smoke
        const imageData = ctx.getImageData(0, 0, 64, 64);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 50;
            data[i] = Math.max(0, Math.min(255, data[i] + noise));     // R
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // G
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // B
        }

        ctx.putImageData(imageData, 0, 0);

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    /**
     * Create a single smoke puff
     */
    createSmokePuff(position, delay = 0) {
        const smokeGeometry = new THREE.PlaneGeometry(3, 3);
        const smokeMaterial = new THREE.MeshBasicMaterial({
            map: this.smokeTexture,
            transparent: true,
            opacity: 0.7,
            depthWrite: false,
            blending: THREE.NormalBlending,
            side: THREE.DoubleSide
        });

        const smokePuff = new THREE.Mesh(smokeGeometry, smokeMaterial);

        // Position slightly behind the car with some randomness
        smokePuff.position.x = position.x + (Math.random() - 0.5) * 2;
        smokePuff.position.y = position.y + 0.5 + Math.random() * 0.5;
        smokePuff.position.z = position.z - 2 - delay;

        // Random rotation
        smokePuff.rotation.z = Math.random() * Math.PI * 2;

        // Smoke properties
        smokePuff.userData = {
            creationTime: Date.now() + delay * 1000,
            lifetime: this.smokeLifetime,
            initialScale: 1 + Math.random() * 0.5,
            maxScale: 2.5 + Math.random() * 1.5,
            rotationSpeed: (Math.random() - 0.5) * 0.02,
            driftVelocity: {
                x: (Math.random() - 0.5) * 0.01,
                y: 0.005 + Math.random() * 0.005,
                z: -0.01 - Math.random() * 0.01
            }
        };

        this.scene.add(smokePuff);
        this.smokeClouds.push(smokePuff);
        this.visualEffects.push(smokePuff);

        // Remove old smoke clouds if we have too many
        while (this.smokeClouds.length > this.maxSmokeClouds) {
            const oldSmoke = this.smokeClouds.shift();
            this.scene.remove(oldSmoke);
            const index = this.visualEffects.indexOf(oldSmoke);
            if (index > -1) {
                this.visualEffects.splice(index, 1);
            }
        }
    }

    /**
     * Create continuous smoke trail
     */
    createSmokeTrail() {
        const carObject = this.gameState.carObject || this.gameState.myCarGroup;
        if (!carObject || !this.isGeneratingSmoke) return;

        const currentTime = Date.now();

        // Generate smoke at regular intervals
        if (currentTime - this.lastSmokeTime >= this.smokeGenerationRate) {
            this.createSmokePuff(carObject.position);
            this.lastSmokeTime = currentTime;

            // Play smoke sound occasionally
            if (Math.random() < 0.3) {
                this.playEffectSound('smoke_puff', 0.2);
            }
        }
    }

    /**
     * Update smoke clouds
     */
    updateSmokeClouds(deltaTime) {
        const currentTime = Date.now();

        for (let i = this.smokeClouds.length - 1; i >= 0; i--) {
            const smoke = this.smokeClouds[i];
            const userData = smoke.userData;
            const age = currentTime - userData.creationTime;

            if (age < 0) continue; // Not yet created (delayed)

            const lifeProgress = age / userData.lifetime;

            if (lifeProgress >= 1) {
                // Smoke has expired
                this.scene.remove(smoke);
                this.smokeClouds.splice(i, 1);
                const index = this.visualEffects.indexOf(smoke);
                if (index > -1) {
                    this.visualEffects.splice(index, 1);
                }
                continue;
            }

            // Update smoke properties
            this.updateSmokeProperties(smoke, lifeProgress, deltaTime);
        }
    }

    /**
     * Update individual smoke puff properties
     */
    updateSmokeProperties(smoke, lifeProgress, deltaTime) {
        const userData = smoke.userData;

        // Scale expansion
        const currentScale = userData.initialScale +
            (userData.maxScale - userData.initialScale) * lifeProgress;
        smoke.scale.setScalar(currentScale);

        // Opacity fade
        const opacity = Math.max(0, 0.7 * (1 - lifeProgress * 0.8));
        smoke.material.opacity = opacity;

        // Rotation
        smoke.rotation.z += userData.rotationSpeed;

        // Drift movement
        smoke.position.x += userData.driftVelocity.x;
        smoke.position.y += userData.driftVelocity.y;
        smoke.position.z += userData.driftVelocity.z;

        // Wind effect (slight drift)
        const windEffect = Math.sin(Date.now() * 0.001 + smoke.position.x) * 0.001;
        smoke.position.x += windEffect;

        // Color change over time (darker as it ages)
        const colorFactor = 1 - lifeProgress * 0.3;
        smoke.material.color.setRGB(colorFactor, colorFactor, colorFactor);

        // Billboard effect (always face camera)
        if (this.gameState.camera) {
            smoke.lookAt(this.gameState.camera.position);
        }
    }

    /**
     * Create vision obstruction effect for other players
     */
    createVisionObstruction() {
        // This would integrate with the game's rendering system
        // to create actual vision obstruction for other players
        console.log('💨 Creating vision obstruction effect');

        // In a real implementation, this might:
        // 1. Add fog effect to affected players' cameras
        // 2. Reduce visibility distance
        // 3. Add screen darkening effect
    }

    /**
     * Update visual effects
     */
    updateVisualEffects(deltaTime) {
        // Generate continuous smoke trail
        this.createSmokeTrail();

        // Update all smoke clouds
        this.updateSmokeClouds(deltaTime);

        // Create occasional additional effects
        this.createAdditionalEffects();
    }

    /**
     * Create additional smoke effects
     */
    createAdditionalEffects() {
        // Create occasional sparks from exhaust
        if (this.isGeneratingSmoke && Math.random() < 0.1) {
            this.createSparkEffect();
        }

        // Create heat shimmer effect
        if (this.isGeneratingSmoke && Math.random() < 0.05) {
            this.createHeatShimmer();
        }
    }

    /**
     * Create spark effect from exhaust
     */
    createSparkEffect() {
        const carObject = this.gameState.carObject || this.gameState.myCarGroup;
        if (!carObject) return;

        const sparkCount = 5;
        const sparkGeometry = new THREE.BufferGeometry();
        const sparkMaterial = new THREE.PointsMaterial({
            color: 0xff6600,
            size: 0.1,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        const positions = new Float32Array(sparkCount * 3);
        const velocities = new Float32Array(sparkCount * 3);

        for (let i = 0; i < sparkCount; i++) {
            // Start sparks at exhaust position
            positions[i * 3] = carObject.position.x + (Math.random() - 0.5) * 0.5;
            positions[i * 3 + 1] = carObject.position.y + 0.3;
            positions[i * 3 + 2] = carObject.position.z - 2.5;

            // Sparks fly backward and slightly outward
            velocities[i * 3] = (Math.random() - 0.5) * 0.02;
            velocities[i * 3 + 1] = -0.01 - Math.random() * 0.01;
            velocities[i * 3 + 2] = -0.03 - Math.random() * 0.02;
        }

        sparkGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        sparkGeometry.userData = {
            velocities: velocities,
            life: 1.0
        };

        const sparks = new THREE.Points(sparkGeometry, sparkMaterial);
        this.scene.add(sparks);

        // Animate sparks
        const animateSparks = () => {
            const positions = sparks.geometry.attributes.position.array;
            const velocities = sparks.geometry.userData.velocities;

            for (let i = 0; i < positions.length; i += 3) {
                positions[i] += velocities[i];
                positions[i + 1] += velocities[i + 1];
                positions[i + 2] += velocities[i + 2];

                // Apply gravity
                velocities[i + 1] -= 0.001;
            }

            sparks.geometry.attributes.position.needsUpdate = true;
            sparks.geometry.userData.life -= 0.02;
            sparks.material.opacity = sparks.geometry.userData.life;

            if (sparks.geometry.userData.life > 0) {
                requestAnimationFrame(animateSparks);
            } else {
                this.scene.remove(sparks);
            }
        };

        animateSparks();
    }

    /**
     * Create heat shimmer effect
     */
    createHeatShimmer() {
        const carObject = this.gameState.carObject || this.gameState.myCarGroup;
        if (!carObject) return;

        // Create distortion effect above exhaust
        const shimmerGeometry = new THREE.PlaneGeometry(1, 2);
        const shimmerMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.1,
            blending: THREE.AdditiveBlending
        });

        const shimmer = new THREE.Mesh(shimmerGeometry, shimmerMaterial);
        shimmer.position.copy(carObject.position);
        shimmer.position.y += 1;
        shimmer.position.z -= 2;

        this.scene.add(shimmer);

        // Animate shimmer
        let shimmerTime = 0;
        const animateShimmer = () => {
            shimmerTime += 0.1;
            shimmer.material.opacity = 0.1 + Math.sin(shimmerTime) * 0.05;
            shimmer.position.y += 0.02;
            shimmer.scale.x = 1 + Math.sin(shimmerTime * 2) * 0.1;

            if (shimmerTime < 3) {
                requestAnimationFrame(animateShimmer);
            } else {
                this.scene.remove(shimmer);
            }
        };

        animateShimmer();
    }

    /**
     * Update effects during power-up duration
     */
    updateEffects(deltaTime) {
        // Play continuous smoke sound
        if (this.isGeneratingSmoke && Date.now() % 2000 < 50) {
            this.playEffectSound('smoke_ambient', 0.1);
        }

        // Notify other players of smoke screen effect
        if (this.gameState.socket && this.gameState.socket.connected) {
            const carObject = this.gameState.carObject || this.gameState.myCarGroup;
            if (carObject && Date.now() % 500 < 50) { // Every 500ms
                this.gameState.socket.emit('smokeScreen', {
                    playerId: this.gameState.playerId,
                    position: carObject.position,
                    isActive: this.isGeneratingSmoke
                });
            }
        }
    }

    /**
     * Remove smoke screen effects
     */
    removeEffects() {
        console.log('💨 Smoke Screen ended');

        this.isGeneratingSmoke = false;

        // Play end sound
        this.playEffectSound('smoke_end', 0.3);

        // Smoke clouds will naturally fade out over time
        // No need to remove them immediately
    }

    /**
     * Activate for other player (multiplayer)
     */
    activateForOtherPlayer(data) {
        super.activateForOtherPlayer(data);

        // Create smoke effects at other player's position
        const otherPlayerCar = this.scene.getObjectByName(`player_${data.playerId}`);
        if (otherPlayerCar) {
            this.gameState = { carObject: otherPlayerCar };
            this.isGeneratingSmoke = true;

            // Generate smoke for the duration
            const smokeInterval = setInterval(() => {
                if (this.isActive && this.isGeneratingSmoke) {
                    this.createSmokePuff(otherPlayerCar.position);
                } else {
                    clearInterval(smokeInterval);
                }
            }, this.smokeGenerationRate);
        }
    }

    /**
     * Check if position is obscured by smoke
     */
    isPositionObscured(position, checkRadius = 3) {
        for (const smoke of this.smokeClouds) {
            const distance = smoke.position.distanceTo(position);
            if (distance < checkRadius && smoke.material.opacity > 0.3) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get smoke coverage at position
     */
    getSmokeCoverageAt(position, radius = 5) {
        let coverage = 0;
        let totalSmokeStrength = 0;

        for (const smoke of this.smokeClouds) {
            const distance = smoke.position.distanceTo(position);
            if (distance < radius) {
                const strength = smoke.material.opacity * (1 - distance / radius);
                totalSmokeStrength += strength;
            }
        }

        coverage = Math.min(1, totalSmokeStrength);
        return coverage;
    }

    /**
     * Clean up all smoke effects
     */
    cleanupVisualEffects() {
        super.cleanupVisualEffects();

        // Remove all smoke clouds
        this.smokeClouds.forEach(smoke => {
            this.scene.remove(smoke);
        });
        this.smokeClouds = [];
        this.smokeTrail = [];
    }

    /**
     * Get smoke screen status info
     */
    getStatusInfo() {
        return {
            type: this.type,
            name: 'Smoke Screen',
            description: `Obscure vision behind car`,
            remainingTime: this.getRemainingTime(),
            icon: '💨',
            color: '#666666',
            isGenerating: this.isGeneratingSmoke,
            smokeCloudCount: this.smokeClouds.length
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmokeScreenPowerUp;
}