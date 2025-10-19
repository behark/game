/**
 * StarPowerUp.js - Star Power power-up implementation
 * 4-second invincibility with golden glow and sparkle effects
 */

class StarPowerUp extends PowerUp {
    constructor(scene, gameState, particleSystem, soundManager) {
        super(scene, gameState, particleSystem, soundManager);

        this.type = 'star';
        this.duration = 4000; // 4 seconds
        this.activationSound = 'star_power';
        this.volume = 0.8;

        // Star power properties
        this.isInvincible = false;
        this.originalColor = null;
        this.starAura = null;
        this.sparkleParticles = [];
        this.goldenGlow = null;
        this.energyRings = [];

        // Visual effects
        this.rainbowEffect = null;
        this.starTrail = null;
        this.pulseEffect = null;
    }

    /**
     * Apply star power effects
     */
    applyEffects() {
        console.log('⭐ Activating Star Power!');

        this.isInvincible = true;

        // Register invincibility in game state
        if (this.gameState.powerUpStates) {
            this.gameState.powerUpStates.hasStarPower = true;
            this.gameState.powerUpStates.isInvincible = true;
        }

        this.gameState.isInvincible = true;

        // Apply speed boost during star power
        if (this.gameState.carPhysics) {
            this.gameState.carPhysics.starPowerBoost = true;
            this.gameState.carPhysics.maxSpeed *= 1.2; // 20% speed boost
        }
    }

    /**
     * Create visual effects
     */
    createVisualEffects() {
        console.log('✨ Creating Star Power visual effects');

        const carObject = this.gameState.carObject || this.gameState.myCarGroup;
        if (!carObject) return;

        // Create main golden aura
        this.createGoldenAura(carObject);

        // Create sparkle particles
        this.createSparkleParticles(carObject);

        // Create energy rings
        this.createEnergyRings(carObject);

        // Create rainbow trail
        this.createRainbowTrail(carObject);

        // Create pulse effect
        this.createPulseEffect(carObject);

        // Create star burst effect
        this.createStarBurst(carObject);

        // Apply golden tint to car
        this.applyGoldenTint(carObject);
    }

    /**
     * Create golden aura around car
     */
    createGoldenAura(carObject) {
        const auraGeometry = new THREE.SphereGeometry(4, 32, 32);
        const auraMaterial = new THREE.MeshBasicMaterial({
            color: 0xffd700,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });

        this.starAura = new THREE.Mesh(auraGeometry, auraMaterial);
        this.starAura.position.y = 1;

        carObject.add(this.starAura);
        this.visualEffects.push(this.starAura);
    }

    /**
     * Create sparkle particle effects
     */
    createSparkleParticles(carObject) {
        const sparkleCount = 100;
        const sparkleGeometry = new THREE.BufferGeometry();
        const sparkleMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.2,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            map: this.createStarTexture()
        });

        const positions = new Float32Array(sparkleCount * 3);
        const colors = new Float32Array(sparkleCount * 3);
        const sizes = new Float32Array(sparkleCount);
        const phases = new Float32Array(sparkleCount);

        for (let i = 0; i < sparkleCount; i++) {
            // Random position around car
            const radius = 2 + Math.random() * 3;
            const phi = Math.random() * Math.PI * 2;
            const theta = Math.random() * Math.PI;

            positions[i * 3] = radius * Math.sin(theta) * Math.cos(phi);
            positions[i * 3 + 1] = radius * Math.cos(theta) + 1;
            positions[i * 3 + 2] = radius * Math.sin(theta) * Math.sin(phi);

            // Random golden colors
            const colorVariation = Math.random();
            colors[i * 3] = 1.0; // R
            colors[i * 3 + 1] = 0.8 + colorVariation * 0.2; // G
            colors[i * 3 + 2] = colorVariation * 0.5; // B

            sizes[i] = 0.1 + Math.random() * 0.3;
            phases[i] = Math.random() * Math.PI * 2;
        }

        sparkleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        sparkleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        sparkleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        sparkleGeometry.userData = {
            phases: phases,
            basePositions: positions.slice()
        };

        const sparkles = new THREE.Points(sparkleGeometry, sparkleMaterial);
        carObject.add(sparkles);
        this.visualEffects.push(sparkles);
        this.sparkleParticles.push(sparkles);
    }

    /**
     * Create star texture for particles
     */
    createStarTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');

        // Create star shape
        ctx.fillStyle = 'white';
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'yellow';

        // Draw star
        ctx.beginPath();
        const centerX = 16;
        const centerY = 16;
        const spikes = 5;
        const outerRadius = 12;
        const innerRadius = 5;

        for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    /**
     * Create energy rings around car
     */
    createEnergyRings(carObject) {
        for (let i = 0; i < 4; i++) {
            const ringGeometry = new THREE.RingGeometry(3 + i * 0.5, 3.2 + i * 0.5, 32);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: new THREE.Color().setHSL((i * 0.1) % 1, 1, 0.6),
                transparent: true,
                opacity: 0.6,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending
            });

            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.position.y = 1;
            ring.rotation.x = Math.PI / 2;
            ring.userData = {
                rotationSpeed: (0.02 + i * 0.005) * (i % 2 === 0 ? 1 : -1),
                originalColor: ringMaterial.color.clone(),
                hueOffset: i * 0.1
            };

            carObject.add(ring);
            this.visualEffects.push(ring);
            this.energyRings.push(ring);
        }
    }

    /**
     * Create rainbow trail behind car
     */
    createRainbowTrail(carObject) {
        const trailGeometry = new THREE.BufferGeometry();
        const trailMaterial = new THREE.PointsMaterial({
            size: 0.4,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            vertexColors: true
        });

        const maxPoints = 40;
        const positions = new Float32Array(maxPoints * 3);
        const colors = new Float32Array(maxPoints * 3);

        for (let i = 0; i < maxPoints; i++) {
            const backOffset = -2 - (i * 0.3);
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 1;
            positions[i * 3 + 2] = backOffset;

            // Rainbow colors
            const hue = (i / maxPoints) * 0.8; // Rainbow hue
            const color = new THREE.Color().setHSL(hue, 1, 0.7);
            const alpha = 1 - (i / maxPoints);

            colors[i * 3] = color.r * alpha;
            colors[i * 3 + 1] = color.g * alpha;
            colors[i * 3 + 2] = color.b * alpha;
        }

        trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        trailGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        this.rainbowTrail = new THREE.Points(trailGeometry, trailMaterial);
        carObject.add(this.rainbowTrail);
        this.visualEffects.push(this.rainbowTrail);
    }

    /**
     * Create pulse effect
     */
    createPulseEffect(carObject) {
        const pulseGeometry = new THREE.SphereGeometry(1, 16, 16);
        const pulseMaterial = new THREE.MeshBasicMaterial({
            color: 0xffd700,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending
        });

        this.pulseEffect = new THREE.Mesh(pulseGeometry, pulseMaterial);
        this.pulseEffect.position.y = 1;

        carObject.add(this.pulseEffect);
        this.visualEffects.push(this.pulseEffect);
    }

    /**
     * Create star burst activation effect
     */
    createStarBurst(carObject) {
        if (!this.particleSystem) return;

        const burstPosition = {
            x: carObject.position.x,
            y: carObject.position.y + 1,
            z: carObject.position.z
        };

        // Create multiple burst effects
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.particleSystem.createEffect(burstPosition, 'star_burst', {
                    count: 80,
                    color: 0xffd700,
                    size: 0.4,
                    life: 2000,
                    velocity: { x: 0, y: 3, z: 0 },
                    spread: 5
                });
            }, i * 200);
        }
    }

    /**
     * Apply golden tint to car
     */
    applyGoldenTint(carObject) {
        carObject.traverse((child) => {
            if (child.isMesh && child.material) {
                // Store original color
                if (!child.userData.originalColor) {
                    child.userData.originalColor = child.material.color.clone();
                    child.userData.originalEmissive = child.material.emissive ? child.material.emissive.clone() : new THREE.Color(0x000000);
                }

                // Apply golden tint
                child.material.color.lerp(new THREE.Color(0xffd700), 0.3);
                if (child.material.emissive) {
                    child.material.emissive.setHex(0x332200);
                }
            }
        });
    }

    /**
     * Remove golden tint from car
     */
    removeGoldenTint(carObject) {
        carObject.traverse((child) => {
            if (child.isMesh && child.material && child.userData.originalColor) {
                // Restore original colors
                child.material.color.copy(child.userData.originalColor);
                if (child.material.emissive && child.userData.originalEmissive) {
                    child.material.emissive.copy(child.userData.originalEmissive);
                }
            }
        });
    }

    /**
     * Update visual effects
     */
    updateVisualEffects(deltaTime) {
        const time = Date.now() * 0.001;
        const progress = this.getProgress();

        // Update star aura
        if (this.starAura) {
            this.starAura.rotation.y += 0.02;
            this.starAura.scale.setScalar(1 + Math.sin(time * 3) * 0.1);
            this.starAura.material.opacity = 0.4 + Math.sin(time * 5) * 0.2;
        }

        // Update sparkle particles
        this.sparkleParticles.forEach(sparkles => {
            this.updateSparkles(sparkles, time);
        });

        // Update energy rings with rainbow effect
        this.energyRings.forEach((ring, index) => {
            ring.rotation.z += ring.userData.rotationSpeed;

            // Rainbow color cycling
            const hue = (time * 0.2 + ring.userData.hueOffset) % 1;
            ring.material.color.setHSL(hue, 1, 0.6);
        });

        // Update rainbow trail
        if (this.rainbowTrail) {
            this.updateRainbowTrail(time);
        }

        // Update pulse effect
        if (this.pulseEffect) {
            const pulseScale = 1 + Math.sin(time * 6) * 0.5;
            this.pulseEffect.scale.setScalar(pulseScale);
            this.pulseEffect.material.opacity = Math.abs(Math.sin(time * 6)) * 0.3;
        }

        // Warning effect when star power is almost expired
        if (progress > 0.75) {
            const warningIntensity = Math.sin(time * 20) * 0.5;
            this.visualEffects.forEach(effect => {
                if (effect.material && effect.material.opacity !== undefined) {
                    effect.material.opacity *= (1 + warningIntensity * 0.3);
                }
            });
        }
    }

    /**
     * Update sparkle particles
     */
    updateSparkles(sparkles, time) {
        const positions = sparkles.geometry.attributes.position.array;
        const phases = sparkles.geometry.userData.phases;
        const basePositions = sparkles.geometry.userData.basePositions;

        for (let i = 0; i < positions.length; i += 3) {
            const index = i / 3;

            // Orbital motion around the car
            const orbitSpeed = 1.0;
            const floatSpeed = 2.0;

            positions[i] = basePositions[i] + Math.cos(time * orbitSpeed + phases[index]) * 0.3;
            positions[i + 1] = basePositions[i + 1] + Math.sin(time * floatSpeed + phases[index]) * 0.2;
            positions[i + 2] = basePositions[i + 2] + Math.sin(time * orbitSpeed + phases[index]) * 0.3;
        }

        sparkles.geometry.attributes.position.needsUpdate = true;

        // Update sparkle brightness
        sparkles.material.opacity = 0.7 + Math.sin(time * 8) * 0.3;
    }

    /**
     * Update rainbow trail
     */
    updateRainbowTrail(time) {
        const positions = this.rainbowTrail.geometry.attributes.position.array;
        const colors = this.rainbowTrail.geometry.attributes.color.array;

        // Shift trail points backward
        for (let i = positions.length - 3; i >= 3; i -= 3) {
            positions[i] = positions[i - 3];
            positions[i + 1] = positions[i - 2];
            positions[i + 2] = positions[i - 1];

            colors[i] = colors[i - 3];
            colors[i + 1] = colors[i - 2];
            colors[i + 2] = colors[i - 1];
        }

        // Add new point at car position
        positions[0] = 0;
        positions[1] = 1;
        positions[2] = -2;

        // New point gets current rainbow color
        const hue = (time * 0.5) % 1;
        const color = new THREE.Color().setHSL(hue, 1, 0.7);
        colors[0] = color.r;
        colors[1] = color.g;
        colors[2] = color.b;

        this.rainbowTrail.geometry.attributes.position.needsUpdate = true;
        this.rainbowTrail.geometry.attributes.color.needsUpdate = true;
    }

    /**
     * Update effects during power-up duration
     */
    updateEffects(deltaTime) {
        // Play star power ambient sound
        if (this.soundManager && Date.now() % 1000 < 50) { // Every second
            this.playEffectSound('star_ambient', 0.4);
        }

        // Create occasional sparkle bursts
        if (Math.random() < 0.02) { // 2% chance per frame
            this.createSparkleEffect();
        }
    }

    /**
     * Create occasional sparkle effect
     */
    createSparkleEffect() {
        const carObject = this.gameState.carObject || this.gameState.myCarGroup;
        if (!carObject || !this.particleSystem) return;

        const sparklePosition = {
            x: carObject.position.x + (Math.random() - 0.5) * 4,
            y: carObject.position.y + 1 + Math.random() * 2,
            z: carObject.position.z + (Math.random() - 0.5) * 4
        };

        this.particleSystem.createEffect(sparklePosition, 'sparkle', {
            count: 10,
            color: 0xffd700,
            size: 0.3,
            life: 800,
            velocity: { x: 0, y: 1, z: 0 },
            spread: 1
        });
    }

    /**
     * Handle collision/damage while invincible
     */
    onDamageAttempt(damageType, damageAmount) {
        if (!this.isActive || !this.isInvincible) return false;

        console.log('⭐ Star Power deflected damage:', damageType);

        // Play deflection sound
        this.playEffectSound('star_deflect', 0.6);

        // Create deflection effect
        this.createDeflectionEffect();

        // All damage is negated during star power
        return true; // Damage blocked
    }

    /**
     * Create deflection effect
     */
    createDeflectionEffect() {
        const carObject = this.gameState.carObject || this.gameState.myCarGroup;
        if (!carObject) return;

        // Create bright flash
        const flashGeometry = new THREE.SphereGeometry(5, 16, 16);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        flash.position.copy(carObject.position);
        flash.position.y += 1;
        this.scene.add(flash);

        // Fade out flash quickly
        const fadeOut = () => {
            flash.material.opacity -= 0.1;
            flash.scale.multiplyScalar(1.1);
            if (flash.material.opacity <= 0) {
                this.scene.remove(flash);
            } else {
                requestAnimationFrame(fadeOut);
            }
        };
        fadeOut();

        // Create sparkle burst
        if (this.particleSystem) {
            this.particleSystem.createEffect(carObject.position, 'deflection', {
                count: 30,
                color: 0xffd700,
                size: 0.2,
                life: 1000,
                velocity: { x: 0, y: 2, z: 0 },
                spread: 3
            });
        }
    }

    /**
     * Remove star power effects
     */
    removeEffects() {
        console.log('⭐ Star Power ended');

        this.isInvincible = false;

        // Remove invincibility from game state
        if (this.gameState.powerUpStates) {
            this.gameState.powerUpStates.hasStarPower = false;
            this.gameState.powerUpStates.isInvincible = false;
        }

        this.gameState.isInvincible = false;

        // Remove speed boost
        if (this.gameState.carPhysics && this.gameState.carPhysics.starPowerBoost) {
            this.gameState.carPhysics.starPowerBoost = false;
            this.gameState.carPhysics.maxSpeed /= 1.2; // Remove 20% speed boost
        }

        // Remove golden tint from car
        const carObject = this.gameState.carObject || this.gameState.myCarGroup;
        if (carObject) {
            this.removeGoldenTint(carObject);
        }

        // Play end sound
        this.playEffectSound('star_end', 0.5);
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
     * Check if player is invincible
     */
    isPlayerInvincible() {
        return this.isActive && this.isInvincible;
    }

    /**
     * Get star power status info
     */
    getStatusInfo() {
        return {
            type: this.type,
            name: 'Star Power',
            description: 'Invincibility + speed boost',
            remainingTime: this.getRemainingTime(),
            icon: '⭐',
            color: '#ffd700',
            isInvincible: this.isInvincible
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StarPowerUp;
}