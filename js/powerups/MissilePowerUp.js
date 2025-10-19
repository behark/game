/**
 * MissilePowerUp.js - Homing Missile power-up implementation
 * Lock-on targeting system with 8-unit range and trail effects
 */

class MissilePowerUp extends PowerUp {
    constructor(scene, gameState, particleSystem, soundManager) {
        super(scene, gameState, particleSystem, soundManager);

        this.type = 'missile';
        this.duration = 8000; // 8 seconds flight time
        this.lockRange = 8; // 8 unit lock-on range
        this.activationSound = 'missile_lock';
        this.volume = 0.6;

        // Missile properties
        this.missile = null;
        this.target = null;
        this.isLocked = false;
        this.lockTime = 2000; // 2 second lock-on time
        this.missileSpeed = 0.3;
        this.turnRate = 0.1;

        // Visual effects
        this.lockingReticle = null;
        this.targetReticle = null;
        this.missileTrail = null;
        this.lockingParticles = [];

        // Missile state
        this.hasLaunched = false;
        this.lockStartTime = 0;
    }

    /**
     * Apply missile effects
     */
    applyEffects() {
        console.log('🎯 Initiating missile lock-on...');

        // Find target
        this.findTarget();

        if (this.target) {
            this.startLockOn();
        } else {
            console.log('🎯 No targets in range');
            this.deactivate();
        }
    }

    /**
     * Find the nearest target within range
     */
    findTarget() {
        const playerPosition = this.gameState.position || { x: 0, y: 0, z: 0 };
        const nearbyPlayers = this.getNearbyPlayers(playerPosition, this.lockRange);

        if (nearbyPlayers.length > 0) {
            // Select closest target
            let closestDistance = Infinity;
            let closestPlayer = null;

            nearbyPlayers.forEach(player => {
                const distance = Math.sqrt(
                    Math.pow(player.position.x - playerPosition.x, 2) +
                    Math.pow(player.position.z - playerPosition.z, 2)
                );

                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestPlayer = player;
                }
            });

            this.target = closestPlayer;
            console.log(`🎯 Target acquired: ${this.target.id} at distance ${closestDistance.toFixed(1)}`);
        }
    }

    /**
     * Start lock-on sequence
     */
    startLockOn() {
        console.log('🎯 Starting lock-on sequence...');

        this.lockStartTime = Date.now();

        // Create lock-on visual effects
        this.createLockOnEffects();

        // Play lock-on sound
        this.playEffectSound('missile_locking', 0.5);

        // Complete lock after lock time
        setTimeout(() => {
            if (this.isActive && this.target) {
                this.completeLockOn();
            }
        }, this.lockTime);
    }

    /**
     * Complete lock-on and launch missile
     */
    completeLockOn() {
        if (!this.target) return;

        console.log('🎯 Lock-on complete! Launching missile...');

        this.isLocked = true;
        this.launchMissile();

        // Play lock confirmation sound
        this.playEffectSound('missile_lock_complete', 0.7);

        // Update lock-on visual
        this.updateLockOnVisual();
    }

    /**
     * Launch the missile
     */
    launchMissile() {
        const carObject = this.gameState.carObject || this.gameState.myCarGroup;
        if (!carObject) return;

        console.log('🚀 Missile launched!');

        this.hasLaunched = true;

        // Create missile object
        this.createMissile(carObject.position);

        // Play launch sound
        this.playEffectSound('missile_launch', 0.8);

        // Apply screen shake
        this.applyScreenShake(0.5, 300);

        // Create launch effect
        this.createLaunchEffect(carObject.position);
    }

    /**
     * Create missile object
     */
    createMissile(startPosition) {
        const missileGroup = new THREE.Group();

        // Missile body
        const bodyGeometry = new THREE.CylinderGeometry(0.1, 0.15, 1.5, 8);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
        const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        bodyMesh.rotation.x = Math.PI / 2;
        missileGroup.add(bodyMesh);

        // Missile nose cone
        const noseGeometry = new THREE.ConeGeometry(0.1, 0.3, 8);
        const noseMaterial = new THREE.MeshLambertMaterial({ color: 0xff4400 });
        const noseMesh = new THREE.Mesh(noseGeometry, noseMaterial);
        noseMesh.position.z = 0.9;
        noseMesh.rotation.x = Math.PI / 2;
        missileGroup.add(noseMesh);

        // Missile fins
        for (let i = 0; i < 4; i++) {
            const finGeometry = new THREE.BoxGeometry(0.05, 0.3, 0.2);
            const finMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
            const finMesh = new THREE.Mesh(finGeometry, finMaterial);

            const angle = (i / 4) * Math.PI * 2;
            finMesh.position.x = Math.cos(angle) * 0.15;
            finMesh.position.y = Math.sin(angle) * 0.15;
            finMesh.position.z = -0.5;

            missileGroup.add(finMesh);
        }

        // Position missile
        missileGroup.position.copy(startPosition);
        missileGroup.position.y += 1;

        // Missile physics properties
        missileGroup.userData = {
            velocity: new THREE.Vector3(0, 0, 0),
            speed: this.missileSpeed,
            turnRate: this.turnRate,
            isActive: true
        };

        this.missile = missileGroup;
        this.scene.add(missileGroup);
        this.visualEffects.push(missileGroup);

        // Create missile trail
        this.createMissileTrail();
    }

    /**
     * Create missile trail effect
     */
    createMissileTrail() {
        if (!this.missile) return;

        const trailGeometry = new THREE.BufferGeometry();
        const trailMaterial = new THREE.PointsMaterial({
            color: 0xff4400,
            size: 0.3,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        const maxPoints = 20;
        const positions = new Float32Array(maxPoints * 3);
        const colors = new Float32Array(maxPoints * 3);

        for (let i = 0; i < maxPoints; i++) {
            const alpha = 1 - (i / maxPoints);
            positions[i * 3] = this.missile.position.x;
            positions[i * 3 + 1] = this.missile.position.y;
            positions[i * 3 + 2] = this.missile.position.z;

            colors[i * 3] = 1.0 * alpha;     // R
            colors[i * 3 + 1] = 0.3 * alpha; // G
            colors[i * 3 + 2] = 0.0 * alpha; // B
        }

        trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        trailGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        this.missileTrail = new THREE.Points(trailGeometry, trailMaterial);
        this.scene.add(this.missileTrail);
        this.visualEffects.push(this.missileTrail);
    }

    /**
     * Create lock-on visual effects
     */
    createLockOnEffects() {
        this.createLockingReticle();
        this.createTargetReticle();
        this.createLockingParticles();
    }

    /**
     * Create locking reticle around player
     */
    createLockingReticle() {
        const reticleGeometry = new THREE.RingGeometry(2, 2.2, 32);
        const reticleMaterial = new THREE.MeshBasicMaterial({
            color: 0xff4400,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });

        this.lockingReticle = new THREE.Mesh(reticleGeometry, reticleMaterial);
        this.lockingReticle.rotation.x = -Math.PI / 2;
        this.lockingReticle.position.y = 0.1;

        const carObject = this.gameState.carObject || this.gameState.myCarGroup;
        if (carObject) {
            carObject.add(this.lockingReticle);
            this.visualEffects.push(this.lockingReticle);
        }
    }

    /**
     * Create target reticle around target
     */
    createTargetReticle() {
        if (!this.target || !this.target.carObject) return;

        const reticleGeometry = new THREE.RingGeometry(2.5, 2.8, 32);
        const reticleMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });

        this.targetReticle = new THREE.Mesh(reticleGeometry, reticleMaterial);
        this.targetReticle.rotation.x = -Math.PI / 2;
        this.targetReticle.position.y = 0.2;

        this.target.carObject.add(this.targetReticle);
        this.visualEffects.push(this.targetReticle);
    }

    /**
     * Create locking particles
     */
    createLockingParticles() {
        const particleCount = 40;
        const particleGeometry = new THREE.BufferGeometry();
        const particleMaterial = new THREE.PointsMaterial({
            color: 0xff4400,
            size: 0.1,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending
        });

        const positions = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const radius = 2.5;

            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 1] = 0.5;
            positions[i * 3 + 2] = Math.sin(angle) * radius;
        }

        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const lockingParticlesObj = new THREE.Points(particleGeometry, particleMaterial);

        const carObject = this.gameState.carObject || this.gameState.myCarGroup;
        if (carObject) {
            carObject.add(lockingParticlesObj);
            this.visualEffects.push(lockingParticlesObj);
            this.lockingParticles.push(lockingParticlesObj);
        }
    }

    /**
     * Create launch effect
     */
    createLaunchEffect(position) {
        if (this.particleSystem) {
            this.particleSystem.createEffect(position, 'explosion', {
                count: 30,
                color: 0xff4400,
                size: 0.3,
                life: 1000,
                velocity: { x: 0, y: 1, z: 0 },
                spread: 2
            });
        }
    }

    /**
     * Update lock-on visual when locked
     */
    updateLockOnVisual() {
        if (this.lockingReticle) {
            this.lockingReticle.material.color.setHex(0x00ff00);
        }

        if (this.targetReticle) {
            this.targetReticle.material.color.setHex(0x00ff00);
        }
    }

    /**
     * Update missile movement
     */
    updateMissile(deltaTime) {
        if (!this.missile || !this.missile.userData.isActive) return;

        const missilePos = this.missile.position;
        const missileData = this.missile.userData;

        if (this.target && this.target.position) {
            // Calculate direction to target
            const targetDirection = new THREE.Vector3()
                .copy(this.target.position)
                .sub(missilePos)
                .normalize();

            // Apply steering towards target
            missileData.velocity.lerp(targetDirection, missileData.turnRate);
            missileData.velocity.normalize().multiplyScalar(missileData.speed);

            // Update missile position
            missilePos.add(missileData.velocity);

            // Update missile rotation to face direction
            this.missile.lookAt(
                missilePos.x + missileData.velocity.x,
                missilePos.y + missileData.velocity.y,
                missilePos.z + missileData.velocity.z
            );

            // Check for collision with target
            const distanceToTarget = missilePos.distanceTo(this.target.position);
            if (distanceToTarget < 1.5) {
                this.missileHitTarget();
            }

            // Check if missile has been flying too long
            if (Date.now() - this.lockStartTime > this.duration) {
                this.missileExpired();
            }
        } else {
            // No target, missile continues straight
            missilePos.add(missileData.velocity);

            // Self-destruct after some time
            if (Date.now() - this.lockStartTime > this.duration * 0.5) {
                this.missileExpired();
            }
        }

        // Update trail
        this.updateMissileTrail();
    }

    /**
     * Update missile trail
     */
    updateMissileTrail() {
        if (!this.missileTrail || !this.missile) return;

        const positions = this.missileTrail.geometry.attributes.position.array;
        const colors = this.missileTrail.geometry.attributes.color.array;

        // Shift trail points backward
        for (let i = positions.length - 3; i >= 3; i -= 3) {
            positions[i] = positions[i - 3];
            positions[i + 1] = positions[i - 2];
            positions[i + 2] = positions[i - 1];

            colors[i] = colors[i - 3];
            colors[i + 1] = colors[i - 2];
            colors[i + 2] = colors[i - 1];
        }

        // Add new point at missile position
        positions[0] = this.missile.position.x;
        positions[1] = this.missile.position.y;
        positions[2] = this.missile.position.z;

        colors[0] = 1.0;
        colors[1] = 0.3;
        colors[2] = 0.0;

        this.missileTrail.geometry.attributes.position.needsUpdate = true;
        this.missileTrail.geometry.attributes.color.needsUpdate = true;
    }

    /**
     * Handle missile hitting target
     */
    missileHitTarget() {
        console.log('💥 Missile hit target!');

        // Play explosion sound
        this.playEffectSound('missile_explosion', 0.9);

        // Create explosion effect
        this.createExplosionEffect(this.missile.position);

        // Apply damage to target
        if (this.target) {
            this.applyDamageToPlayer(this.target.id, 'missile');
        }

        // Apply screen shake
        this.applyScreenShake(0.8, 600);

        // Remove missile
        this.destroyMissile();

        // Deactivate power-up
        this.deactivate();
    }

    /**
     * Handle missile expiring
     */
    missileExpired() {
        console.log('🎯 Missile expired');

        // Create small explosion
        if (this.missile) {
            this.createExplosionEffect(this.missile.position);
            this.playEffectSound('missile_fizzle', 0.4);
        }

        this.destroyMissile();
        this.deactivate();
    }

    /**
     * Create explosion effect
     */
    createExplosionEffect(position) {
        if (this.particleSystem) {
            this.particleSystem.createEffect(position, 'explosion', {
                count: 60,
                color: 0xff4400,
                size: 0.4,
                life: 1500,
                velocity: { x: 0, y: 2, z: 0 },
                spread: 4
            });
        }

        // Create explosion flash
        const flashGeometry = new THREE.SphereGeometry(3, 16, 16);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        flash.position.copy(position);
        this.scene.add(flash);

        // Fade out flash
        const fadeOut = () => {
            flash.material.opacity -= 0.05;
            if (flash.material.opacity <= 0) {
                this.scene.remove(flash);
            } else {
                requestAnimationFrame(fadeOut);
            }
        };
        fadeOut();
    }

    /**
     * Destroy missile
     */
    destroyMissile() {
        if (this.missile) {
            this.scene.remove(this.missile);
            this.missile.userData.isActive = false;
            this.missile = null;
        }

        if (this.missileTrail) {
            this.scene.remove(this.missileTrail);
            this.missileTrail = null;
        }
    }

    /**
     * Update visual effects
     */
    updateVisualEffects(deltaTime) {
        const time = Date.now() * 0.001;

        // Update locking effects
        if (!this.isLocked) {
            const lockProgress = Math.min(1, (Date.now() - this.lockStartTime) / this.lockTime);

            if (this.lockingReticle) {
                this.lockingReticle.rotation.z += 0.05;
                this.lockingReticle.material.opacity = 0.4 + Math.sin(time * 8) * 0.4;
            }

            if (this.targetReticle) {
                this.targetReticle.rotation.z -= 0.03;
                this.targetReticle.scale.setScalar(1 + lockProgress * 0.2);
            }

            // Update locking particles
            this.lockingParticles.forEach(particles => {
                const positions = particles.geometry.attributes.position.array;
                for (let i = 0; i < positions.length; i += 3) {
                    const angle = (i / 3 / (positions.length / 3)) * Math.PI * 2 + time * 2;
                    const radius = 2.5 - lockProgress * 0.5;

                    positions[i] = Math.cos(angle) * radius;
                    positions[i + 2] = Math.sin(angle) * radius;
                }
                particles.geometry.attributes.position.needsUpdate = true;
            });
        }

        // Update missile
        if (this.hasLaunched) {
            this.updateMissile(deltaTime);
        }
    }

    /**
     * Update effects during power-up duration
     */
    updateEffects(deltaTime) {
        // Play missile flight sound
        if (this.hasLaunched && this.missile && Date.now() % 500 < 50) {
            this.playEffectSound('missile_flight', 0.3);
        }
    }

    /**
     * Remove missile effects
     */
    removeEffects() {
        console.log('🎯 Missile power-up ended');

        this.destroyMissile();

        // Play end sound
        this.playEffectSound('missile_end', 0.4);
    }

    /**
     * Activate for other player (multiplayer)
     */
    activateForOtherPlayer(data) {
        super.activateForOtherPlayer(data);

        // Create visual effects for other player's missile
        setTimeout(() => {
            if (data.targetPosition) {
                this.createMissile(data.launchPosition || data.position);
                this.target = { position: data.targetPosition };
            }
        }, this.lockTime);
    }

    /**
     * Get missile status info
     */
    getStatusInfo() {
        const status = {
            type: this.type,
            name: 'Homing Missile',
            remainingTime: this.getRemainingTime(),
            icon: '🎯',
            color: '#ff4400'
        };

        if (!this.isLocked) {
            status.description = `Locking on... (${this.lockRange}m range)`;
        } else if (this.hasLaunched) {
            status.description = 'Missile in flight';
        } else {
            status.description = 'Ready to launch';
        }

        return status;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MissilePowerUp;
}