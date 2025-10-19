/**
 * EMPPowerUp.js - EMP Blast power-up implementation
 * Disables nearby cars for 2 seconds with electric effects
 */

class EMPPowerUp extends PowerUp {
    constructor(scene, gameState, particleSystem, soundManager) {
        super(scene, gameState, particleSystem, soundManager);

        this.type = 'emp';
        this.duration = 2000; // 2 seconds for the blast effect
        this.disableDuration = 2000; // 2 seconds disable time for affected cars
        this.range = 10; // 10 unit radius
        this.activationSound = 'emp_charge';
        this.volume = 0.8;

        // EMP properties
        this.affectedPlayers = new Set();
        this.empWave = null;
        this.electricArcs = [];
        this.chargingEffect = null;
        this.isCharging = false;
        this.chargeTime = 1000; // 1 second charge time
    }

    /**
     * Apply EMP effects
     */
    applyEffects() {
        console.log('⚡ Charging EMP Blast...');

        this.isCharging = true;

        // Start charging sequence
        setTimeout(() => {
            this.triggerEMPBlast();
        }, this.chargeTime);

        // Create charging effect immediately
        this.createChargingEffect();
    }

    /**
     * Trigger the actual EMP blast
     */
    triggerEMPBlast() {
        console.log('⚡ Triggering EMP Blast!');

        this.isCharging = false;

        // Get player position
        const playerPosition = this.gameState.position || { x: 0, y: 0, z: 0 };

        // Find nearby players and disable them
        this.findAndDisableNearbyPlayers(playerPosition);

        // Play blast sound
        this.playEffectSound('emp_blast', 0.9);

        // Apply screen shake
        this.applyScreenShake(1.0, 800);

        // Create blast wave
        this.createBlastWave(playerPosition);

        // Create electric effects
        this.createElectricEffects(playerPosition);
    }

    /**
     * Find and disable nearby players
     */
    findAndDisableNearbyPlayers(centerPosition) {
        // This would integrate with the multiplayer system to find nearby players
        // For now, we'll simulate the effect

        console.log('⚡ Scanning for nearby players...');

        // In a real implementation, this would:
        // 1. Get all other players from game state
        // 2. Calculate distance to each player
        // 3. Disable players within range
        // 4. Send disable command to server

        // Simulate affected players (in real game, get from multiplayer system)
        const nearbyPlayers = this.getNearbyPlayers(centerPosition, this.range);

        nearbyPlayers.forEach(player => {
            this.disablePlayer(player);
        });

        // Notify server of EMP blast
        if (this.gameState.socket && this.gameState.socket.connected) {
            this.gameState.socket.emit('empBlast', {
                position: centerPosition,
                range: this.range,
                duration: this.disableDuration,
                playerId: this.gameState.playerId
            });
        }
    }

    /**
     * Disable a specific player
     */
    disablePlayer(player) {
        console.log(`⚡ Disabling player ${player.id}`);

        this.affectedPlayers.add(player.id);

        // Apply disable effects to player
        if (player.carPhysics) {
            player.carPhysics.disabled = true;
            player.carPhysics.originalMaxSpeed = player.carPhysics.maxSpeed;
            player.carPhysics.maxSpeed = 0;
            player.carPhysics.acceleration = 0;
        }

        // Create disable visual effects on player
        this.createPlayerDisableEffects(player);

        // Remove disable after duration
        setTimeout(() => {
            this.enablePlayer(player);
        }, this.disableDuration);
    }

    /**
     * Re-enable a disabled player
     */
    enablePlayer(player) {
        console.log(`⚡ Re-enabling player ${player.id}`);

        this.affectedPlayers.delete(player.id);

        // Restore player functionality
        if (player.carPhysics) {
            player.carPhysics.disabled = false;
            player.carPhysics.maxSpeed = player.carPhysics.originalMaxSpeed || 0.8;
            player.carPhysics.acceleration = 0.03;
        }

        // Remove disable visual effects
        this.removePlayerDisableEffects(player);
    }

    /**
     * Create charging effect
     */
    createChargingEffect() {
        const carObject = this.gameState.carObject || this.gameState.myCarGroup;
        if (!carObject) return;

        console.log('⚡ Creating EMP charging effect');

        // Create energy buildup effect
        const chargeGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const chargeMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending
        });

        this.chargingEffect = new THREE.Mesh(chargeGeometry, chargeMaterial);
        this.chargingEffect.position.y = 2;

        carObject.add(this.chargingEffect);
        this.visualEffects.push(this.chargingEffect);

        // Create charging particles
        this.createChargingParticles(carObject);

        // Create electric arcs during charging
        this.createChargingArcs(carObject);
    }

    /**
     * Create charging particles
     */
    createChargingParticles(carObject) {
        const particleCount = 80;
        const particleGeometry = new THREE.BufferGeometry();
        const particleMaterial = new THREE.PointsMaterial({
            color: 0xffff00,
            size: 0.1,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });

        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            // Start particles in a sphere around the car
            const radius = 5 + Math.random() * 5;
            const phi = Math.random() * Math.PI * 2;
            const theta = Math.random() * Math.PI;

            positions[i * 3] = radius * Math.sin(theta) * Math.cos(phi);
            positions[i * 3 + 1] = radius * Math.cos(theta) + 2;
            positions[i * 3 + 2] = radius * Math.sin(theta) * Math.sin(phi);

            // Particles move toward the center
            const speed = 0.05 + Math.random() * 0.03;
            velocities[i * 3] = -positions[i * 3] * speed;
            velocities[i * 3 + 1] = (-positions[i * 3 + 1] + 2) * speed;
            velocities[i * 3 + 2] = -positions[i * 3 + 2] * speed;
        }

        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.userData = { velocities: velocities };

        const chargingParticles = new THREE.Points(particleGeometry, particleMaterial);
        carObject.add(chargingParticles);
        this.visualEffects.push(chargingParticles);
    }

    /**
     * Create charging electric arcs
     */
    createChargingArcs(carObject) {
        for (let i = 0; i < 5; i++) {
            const arcPoints = [];
            const segmentCount = 10;

            for (let j = 0; j <= segmentCount; j++) {
                const progress = j / segmentCount;
                const angle = progress * Math.PI * 2;
                const radius = 2 + Math.sin(progress * Math.PI * 3) * 0.5;

                arcPoints.push(new THREE.Vector3(
                    Math.cos(angle + i) * radius,
                    Math.sin(progress * Math.PI * 2) * 0.5 + 2,
                    Math.sin(angle + i) * radius
                ));
            }

            const arcGeometry = new THREE.BufferGeometry().setFromPoints(arcPoints);
            const arcMaterial = new THREE.LineBasicMaterial({
                color: 0xffff00,
                transparent: true,
                opacity: 0.8,
                linewidth: 2
            });

            const arc = new THREE.Line(arcGeometry, arcMaterial);
            carObject.add(arc);
            this.visualEffects.push(arc);
            this.electricArcs.push(arc);
        }
    }

    /**
     * Create blast wave effect
     */
    createBlastWave(position) {
        console.log('⚡ Creating EMP blast wave');

        // Create expanding ring
        const waveGeometry = new THREE.RingGeometry(0.1, 1, 32);
        const waveMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });

        this.empWave = new THREE.Mesh(waveGeometry, waveMaterial);
        this.empWave.position.copy(position);
        this.empWave.position.y = 0.1;
        this.empWave.rotation.x = -Math.PI / 2;

        this.scene.add(this.empWave);
        this.visualEffects.push(this.empWave);

        // Create secondary shockwave
        const shockGeometry = new THREE.RingGeometry(0.1, 0.5, 32);
        const shockMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });

        const shockWave = new THREE.Mesh(shockGeometry, shockMaterial);
        shockWave.position.copy(position);
        shockWave.position.y = 0.2;
        shockWave.rotation.x = -Math.PI / 2;

        this.scene.add(shockWave);
        this.visualEffects.push(shockWave);
    }

    /**
     * Create electric effects at blast location
     */
    createElectricEffects(position) {
        // Create lightning bolts
        for (let i = 0; i < 8; i++) {
            this.createLightningBolt(position, i);
        }

        // Create electric sphere
        const sphereGeometry = new THREE.SphereGeometry(this.range, 16, 16);
        const sphereMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.1,
            wireframe: true,
            blending: THREE.AdditiveBlending
        });

        const electricSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        electricSphere.position.copy(position);

        this.scene.add(electricSphere);
        this.visualEffects.push(electricSphere);
    }

    /**
     * Create lightning bolt effect
     */
    createLightningBolt(centerPosition, index) {
        const points = [];
        const segments = 15;
        const direction = (index / 8) * Math.PI * 2;

        for (let i = 0; i <= segments; i++) {
            const progress = i / segments;
            const distance = progress * this.range;

            // Add randomization to create jagged lightning effect
            const jitter = (Math.random() - 0.5) * 2;

            points.push(new THREE.Vector3(
                centerPosition.x + Math.cos(direction) * distance + jitter,
                centerPosition.y + (Math.random() - 0.5) * 2,
                centerPosition.z + Math.sin(direction) * distance + jitter
            ));
        }

        const boltGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const boltMaterial = new THREE.LineBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.9,
            linewidth: 3
        });

        const bolt = new THREE.Line(boltGeometry, boltMaterial);
        this.scene.add(bolt);
        this.visualEffects.push(bolt);

        // Make lightning flicker
        const originalOpacity = bolt.material.opacity;
        const flickerInterval = setInterval(() => {
            if (bolt.material) {
                bolt.material.opacity = Math.random() > 0.5 ? originalOpacity : originalOpacity * 0.3;
            }
        }, 50);

        setTimeout(() => {
            clearInterval(flickerInterval);
        }, 1000);
    }

    /**
     * Create disable effects on affected player
     */
    createPlayerDisableEffects(player) {
        const carObject = player.carObject;
        if (!carObject) return;

        // Create static electric effect
        const staticGeometry = new THREE.SphereGeometry(3, 16, 16);
        const staticMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.3,
            wireframe: true,
            blending: THREE.AdditiveBlending
        });

        const staticEffect = new THREE.Mesh(staticGeometry, staticMaterial);
        staticEffect.position.y = 1;

        carObject.add(staticEffect);
        player.disableEffects = player.disableEffects || [];
        player.disableEffects.push(staticEffect);

        // Create sparking particles
        this.createSparkingParticles(carObject, player);
    }

    /**
     * Create sparking particles for disabled player
     */
    createSparkingParticles(carObject, player) {
        const particleCount = 30;
        const particleGeometry = new THREE.BufferGeometry();
        const particleMaterial = new THREE.PointsMaterial({
            color: 0x00ffff,
            size: 0.2,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        const positions = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 4;
            positions[i * 3 + 1] = Math.random() * 2;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
        }

        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const sparks = new THREE.Points(particleGeometry, particleMaterial);
        carObject.add(sparks);

        player.disableEffects = player.disableEffects || [];
        player.disableEffects.push(sparks);
    }

    /**
     * Remove disable effects from player
     */
    removePlayerDisableEffects(player) {
        if (player.disableEffects) {
            player.disableEffects.forEach(effect => {
                if (effect.parent) {
                    effect.parent.remove(effect);
                }
            });
            player.disableEffects = [];
        }
    }

    /**
     * Update visual effects
     */
    updateVisualEffects(deltaTime) {
        const time = Date.now() * 0.001;

        // Update charging effect
        if (this.chargingEffect && this.isCharging) {
            const scale = 0.5 + Math.sin(time * 10) * 0.3;
            this.chargingEffect.scale.setScalar(scale);
            this.chargingEffect.material.opacity = 0.3 + Math.sin(time * 15) * 0.4;
        }

        // Update electric arcs
        this.electricArcs.forEach((arc, index) => {
            arc.rotation.y += 0.02 * (index % 2 === 0 ? 1 : -1);
            arc.material.opacity = 0.4 + Math.sin(time * 8 + index) * 0.4;
        });

        // Update blast wave
        if (this.empWave) {
            const scale = this.empWave.scale.x + deltaTime * 0.01;
            this.empWave.scale.setScalar(scale);
            this.empWave.material.opacity = Math.max(0, 0.8 - scale * 0.1);
        }

        // Update charging particles
        this.visualEffects.forEach(effect => {
            if (effect.isPoints && effect.geometry.userData.velocities) {
                this.updateChargingParticles(effect, deltaTime);
            }
        });
    }

    /**
     * Update charging particles
     */
    updateChargingParticles(particles, deltaTime) {
        const positions = particles.geometry.attributes.position.array;
        const velocities = particles.geometry.userData.velocities;

        for (let i = 0; i < positions.length; i += 3) {
            positions[i] += velocities[i] * deltaTime;
            positions[i + 1] += velocities[i + 1] * deltaTime;
            positions[i + 2] += velocities[i + 2] * deltaTime;

            // Reset particles that reach the center
            const distance = Math.sqrt(
                positions[i] * positions[i] +
                (positions[i + 1] - 2) * (positions[i + 1] - 2) +
                positions[i + 2] * positions[i + 2]
            );

            if (distance < 0.5) {
                const radius = 5 + Math.random() * 5;
                const phi = Math.random() * Math.PI * 2;
                const theta = Math.random() * Math.PI;

                positions[i] = radius * Math.sin(theta) * Math.cos(phi);
                positions[i + 1] = radius * Math.cos(theta) + 2;
                positions[i + 2] = radius * Math.sin(theta) * Math.sin(phi);
            }
        }

        particles.geometry.attributes.position.needsUpdate = true;
    }

    /**
     * Update effects during power-up duration
     */
    updateEffects(deltaTime) {
        // EMP is mostly a one-time effect, but we can update visual elements
        if (this.isCharging) {
            // Play charging sound effects
            if (Date.now() % 300 < 50) {
                this.playEffectSound('emp_charge_loop', 0.3);
            }
        }
    }

    /**
     * Remove EMP effects
     */
    removeEffects() {
        console.log('⚡ EMP Blast completed');

        // Re-enable any still affected players
        this.affectedPlayers.forEach(playerId => {
            // In real implementation, send re-enable command to server
            console.log(`⚡ Force re-enabling player ${playerId}`);
        });

        this.affectedPlayers.clear();

        // Play end sound
        this.playEffectSound('emp_end', 0.4);
    }

    /**
     * Activate for other player (multiplayer)
     */
    activateForOtherPlayer(data) {
        super.activateForOtherPlayer(data);

        // Create EMP blast at specified position
        setTimeout(() => {
            this.createBlastWave(data.position);
            this.createElectricEffects(data.position);
        }, this.chargeTime);
    }

    /**
     * Get EMP status info
     */
    getStatusInfo() {
        return {
            type: this.type,
            name: 'EMP Blast',
            description: `Disable nearby cars (${this.range}m radius)`,
            remainingTime: this.getRemainingTime(),
            icon: '⚡',
            color: '#00ffff',
            range: this.range,
            affectedCount: this.affectedPlayers.size
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EMPPowerUp;
}