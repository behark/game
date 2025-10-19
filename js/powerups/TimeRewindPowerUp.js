/**
 * TimeRewindPowerUp.js - Time Rewind power-up implementation
 * Undo last 3 seconds of movement/position with time distortion effect
 */

class TimeRewindPowerUp extends PowerUp {
    constructor(scene, gameState, particleSystem, soundManager) {
        super(scene, gameState, particleSystem, soundManager);

        this.type = 'rewind';
        this.duration = 2000; // 2 seconds for the rewind effect
        this.rewindTime = 3000; // Rewind 3 seconds
        this.activationSound = 'time_rewind';
        this.volume = 0.7;

        // Time tracking
        this.positionHistory = [];
        this.maxHistoryLength = 180; // 3 seconds at 60fps
        this.isRewinding = false;
        this.rewindStartTime = 0;

        // Visual effects
        this.timeDistortion = null;
        this.clockEffect = null;
        this.rewindTrail = [];
        this.temporalRift = null;
    }

    /**
     * Initialize position tracking
     */
    initialize() {
        // Start tracking position history immediately
        this.startPositionTracking();
    }

    /**
     * Start tracking player position history
     */
    startPositionTracking() {
        if (this.trackingInterval) return;

        this.trackingInterval = setInterval(() => {
            this.recordPosition();
        }, 16); // ~60fps tracking
    }

    /**
     * Record current position to history
     */
    recordPosition() {
        if (!this.gameState.position) return;

        const currentState = {
            position: {
                x: this.gameState.position.x,
                y: this.gameState.position.y,
                z: this.gameState.position.z
            },
            rotation: this.gameState.rotation || 0,
            velocity: this.gameState.carPhysics ? {
                x: this.gameState.carPhysics.velocity?.x || 0,
                y: this.gameState.carPhysics.velocity?.y || 0,
                z: this.gameState.carPhysics.velocity?.z || 0
            } : { x: 0, y: 0, z: 0 },
            speed: this.gameState.carPhysics?.speed || 0,
            timestamp: Date.now()
        };

        this.positionHistory.push(currentState);

        // Keep only the last N positions
        if (this.positionHistory.length > this.maxHistoryLength) {
            this.positionHistory.shift();
        }
    }

    /**
     * Apply time rewind effects
     */
    applyEffects() {
        console.log('🔄 Initiating Time Rewind...');

        if (this.positionHistory.length === 0) {
            console.log('🔄 No position history available for rewind');
            this.deactivate();
            return;
        }

        this.isRewinding = true;
        this.rewindStartTime = Date.now();

        // Find target position (3 seconds ago)
        const targetTime = Date.now() - this.rewindTime;
        const targetState = this.findClosestHistoryState(targetTime);

        if (!targetState) {
            console.log('🔄 No valid rewind target found');
            this.deactivate();
            return;
        }

        // Create time distortion effect
        this.createTimeDistortionEffect();

        // Perform the rewind
        this.performRewind(targetState);

        // Clear history after rewind to prevent exploitation
        this.positionHistory = [];
    }

    /**
     * Find closest history state to target time
     */
    findClosestHistoryState(targetTime) {
        let closestState = null;
        let closestTimeDiff = Infinity;

        for (const state of this.positionHistory) {
            const timeDiff = Math.abs(state.timestamp - targetTime);
            if (timeDiff < closestTimeDiff) {
                closestTimeDiff = timeDiff;
                closestState = state;
            }
        }

        return closestState;
    }

    /**
     * Perform the actual rewind
     */
    performRewind(targetState) {
        console.log('🔄 Rewinding to position:', targetState.position);

        const carObject = this.gameState.carObject || this.gameState.myCarGroup;
        const currentPosition = this.gameState.position;

        // Store current state for animation
        const startState = {
            position: { ...currentPosition },
            rotation: this.gameState.rotation || 0
        };

        // Create rewind trail
        this.createRewindTrail(startState.position, targetState.position);

        // Animate the rewind over time
        this.animateRewind(startState, targetState);

        // Update game state immediately for gameplay
        this.gameState.position.x = targetState.position.x;
        this.gameState.position.y = targetState.position.y;
        this.gameState.position.z = targetState.position.z;
        this.gameState.rotation = targetState.rotation;

        if (this.gameState.carPhysics) {
            this.gameState.carPhysics.speed = targetState.speed;
            if (targetState.velocity) {
                this.gameState.carPhysics.velocity = { ...targetState.velocity };
            }
        }

        // Notify server of rewind in multiplayer
        if (this.gameState.socket && this.gameState.socket.connected) {
            this.gameState.socket.emit('playerRewind', {
                playerId: this.gameState.playerId,
                newPosition: targetState.position,
                newRotation: targetState.rotation,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Animate the rewind visually
     */
    animateRewind(startState, targetState) {
        const carObject = this.gameState.carObject || this.gameState.myCarGroup;
        if (!carObject) return;

        const animationDuration = 1000; // 1 second animation
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / animationDuration, 1);

            // Smooth easing function
            const easeProgress = 1 - Math.pow(1 - progress, 3);

            // Interpolate position
            carObject.position.x = startState.position.x +
                (targetState.position.x - startState.position.x) * easeProgress;
            carObject.position.y = startState.position.y +
                (targetState.position.y - startState.position.y) * easeProgress;
            carObject.position.z = startState.position.z +
                (targetState.position.z - startState.position.z) * easeProgress;

            // Interpolate rotation
            carObject.rotation.y = startState.rotation +
                (targetState.rotation - startState.rotation) * easeProgress;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    /**
     * Create time distortion visual effects
     */
    createVisualEffects() {
        console.log('🎨 Creating Time Rewind visual effects');

        const carObject = this.gameState.carObject || this.gameState.myCarGroup;
        if (!carObject) return;

        // Create temporal rift effect
        this.createTemporalRift(carObject);

        // Create clock effect
        this.createClockEffect(carObject);

        // Create time particles
        this.createTimeParticles(carObject);

        // Create distortion field
        this.createDistortionField();
    }

    /**
     * Create time distortion effect around the car
     */
    createTimeDistortionEffect() {
        this.createVisualEffects();

        // Apply time distortion to entire scene
        this.applySceneDistortion();
    }

    /**
     * Create temporal rift effect
     */
    createTemporalRift(carObject) {
        const riftGeometry = new THREE.RingGeometry(0.5, 4, 32);
        const riftMaterial = new THREE.MeshBasicMaterial({
            color: 0xaa44ff,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });

        // Create multiple rift rings
        for (let i = 0; i < 3; i++) {
            const rift = new THREE.Mesh(riftGeometry, riftMaterial.clone());
            rift.position.y = 1 + i * 0.5;
            rift.rotation.x = -Math.PI / 2;
            rift.userData = {
                rotationSpeed: (0.05 + i * 0.02) * (i % 2 === 0 ? 1 : -1),
                pulsePhase: i * Math.PI / 3
            };

            carObject.add(rift);
            this.visualEffects.push(rift);
        }
    }

    /**
     * Create clock effect
     */
    createClockEffect(carObject) {
        const clockGroup = new THREE.Group();

        // Clock face
        const faceGeometry = new THREE.CircleGeometry(1.5, 32);
        const faceMaterial = new THREE.MeshBasicMaterial({
            color: 0x220022,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });

        const clockFace = new THREE.Mesh(faceGeometry, faceMaterial);
        clockFace.rotation.x = -Math.PI / 2;
        clockGroup.add(clockFace);

        // Clock numbers (hour markers)
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const markerGeometry = new THREE.BoxGeometry(0.05, 0.3, 0.05);
            const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xaa44ff });
            const marker = new THREE.Mesh(markerGeometry, markerMaterial);

            marker.position.x = Math.cos(angle) * 1.2;
            marker.position.z = Math.sin(angle) * 1.2;
            marker.position.y = 0.01;

            clockGroup.add(marker);
        }

        // Clock hands
        const hourHandGeometry = new THREE.BoxGeometry(0.03, 0.6, 0.03);
        const minuteHandGeometry = new THREE.BoxGeometry(0.02, 0.9, 0.02);
        const handMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

        const hourHand = new THREE.Mesh(hourHandGeometry, handMaterial);
        const minuteHand = new THREE.Mesh(minuteHandGeometry, handMaterial);

        hourHand.position.y = 0.02;
        minuteHand.position.y = 0.03;

        clockGroup.add(hourHand);
        clockGroup.add(minuteHand);

        clockGroup.position.y = 3;
        clockGroup.userData = {
            hourHand: hourHand,
            minuteHand: minuteHand
        };

        carObject.add(clockGroup);
        this.visualEffects.push(clockGroup);
        this.clockEffect = clockGroup;
    }

    /**
     * Create time particles
     */
    createTimeParticles(carObject) {
        const particleCount = 80;
        const particleGeometry = new THREE.BufferGeometry();
        const particleMaterial = new THREE.PointsMaterial({
            color: 0xaa44ff,
            size: 0.15,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        const phases = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            // Spiral pattern around car
            const angle = (i / particleCount) * Math.PI * 4;
            const radius = 2 + (i / particleCount) * 3;
            const height = (i / particleCount) * 4;

            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 1] = height;
            positions[i * 3 + 2] = Math.sin(angle) * radius;

            // Particles move in spiral
            velocities[i * 3] = -Math.sin(angle) * 0.02;
            velocities[i * 3 + 1] = -0.01;
            velocities[i * 3 + 2] = Math.cos(angle) * 0.02;

            phases[i] = Math.random() * Math.PI * 2;
        }

        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.userData = {
            velocities: velocities,
            phases: phases
        };

        const timeParticles = new THREE.Points(particleGeometry, particleMaterial);
        carObject.add(timeParticles);
        this.visualEffects.push(timeParticles);
    }

    /**
     * Create distortion field effect
     */
    createDistortionField() {
        // Create warped space effect around rewind area
        const fieldGeometry = new THREE.SphereGeometry(8, 16, 16);
        const fieldMaterial = new THREE.MeshBasicMaterial({
            color: 0x440044,
            transparent: true,
            opacity: 0.1,
            wireframe: true,
            blending: THREE.AdditiveBlending
        });

        this.timeDistortion = new THREE.Mesh(fieldGeometry, fieldMaterial);

        const carObject = this.gameState.carObject || this.gameState.myCarGroup;
        if (carObject) {
            this.timeDistortion.position.copy(carObject.position);
            this.scene.add(this.timeDistortion);
            this.visualEffects.push(this.timeDistortion);
        }
    }

    /**
     * Create rewind trail between positions
     */
    createRewindTrail(startPos, endPos) {
        const trailPoints = [];
        const segments = 20;

        for (let i = 0; i <= segments; i++) {
            const progress = i / segments;
            const point = new THREE.Vector3(
                startPos.x + (endPos.x - startPos.x) * progress,
                startPos.y + (endPos.y - startPos.y) * progress + Math.sin(progress * Math.PI) * 2,
                startPos.z + (endPos.z - startPos.z) * progress
            );
            trailPoints.push(point);
        }

        const trailGeometry = new THREE.BufferGeometry().setFromPoints(trailPoints);
        const trailMaterial = new THREE.LineBasicMaterial({
            color: 0xaa44ff,
            transparent: true,
            opacity: 0.8,
            linewidth: 3
        });

        const trail = new THREE.Line(trailGeometry, trailMaterial);
        this.scene.add(trail);
        this.visualEffects.push(trail);
        this.rewindTrail.push(trail);
    }

    /**
     * Apply scene distortion effect
     */
    applySceneDistortion() {
        // Apply subtle camera shake and color shift
        this.applyScreenShake(0.3, this.duration);

        // Create time distortion screen effect
        if (this.gameState.renderer && this.gameState.renderer.domElement) {
            const canvas = this.gameState.renderer.domElement;
            canvas.style.filter = 'hue-rotate(45deg) brightness(0.8)';

            setTimeout(() => {
                canvas.style.filter = '';
            }, this.duration);
        }
    }

    /**
     * Update visual effects
     */
    updateVisualEffects(deltaTime) {
        const time = Date.now() * 0.001;

        // Update temporal rifts
        this.visualEffects.forEach(effect => {
            if (effect.userData && effect.userData.rotationSpeed) {
                effect.rotation.z += effect.userData.rotationSpeed;

                if (effect.userData.pulsePhase !== undefined) {
                    const pulse = Math.sin(time * 3 + effect.userData.pulsePhase);
                    effect.scale.setScalar(1 + pulse * 0.2);
                    effect.material.opacity = 0.6 + pulse * 0.3;
                }
            }
        });

        // Update clock hands (spinning backwards)
        if (this.clockEffect && this.clockEffect.userData) {
            const hourHand = this.clockEffect.userData.hourHand;
            const minuteHand = this.clockEffect.userData.minuteHand;

            if (hourHand) hourHand.rotation.y -= 0.1; // Fast reverse
            if (minuteHand) minuteHand.rotation.y -= 0.2; // Faster reverse
        }

        // Update time particles
        this.updateTimeParticles(time);

        // Update distortion field
        if (this.timeDistortion) {
            this.timeDistortion.rotation.x += 0.01;
            this.timeDistortion.rotation.y += 0.02;
            this.timeDistortion.scale.setScalar(1 + Math.sin(time * 2) * 0.1);
        }
    }

    /**
     * Update time particles
     */
    updateTimeParticles(time) {
        this.visualEffects.forEach(effect => {
            if (effect.isPoints && effect.geometry.userData.velocities) {
                const positions = effect.geometry.attributes.position.array;
                const velocities = effect.geometry.userData.velocities;
                const phases = effect.geometry.userData.phases;

                for (let i = 0; i < positions.length; i += 3) {
                    const index = i / 3;

                    // Move particles in spiral
                    positions[i] += velocities[i];
                    positions[i + 1] += velocities[i + 1];
                    positions[i + 2] += velocities[i + 2];

                    // Add time-based oscillation
                    const oscillation = Math.sin(time * 2 + phases[index]) * 0.1;
                    positions[i] += oscillation;
                    positions[i + 2] += oscillation;

                    // Reset particles that have moved too far
                    const distance = Math.sqrt(
                        positions[i] * positions[i] +
                        positions[i + 2] * positions[i + 2]
                    );

                    if (distance > 6 || positions[i + 1] < 0) {
                        const angle = Math.random() * Math.PI * 2;
                        const radius = 2;
                        positions[i] = Math.cos(angle) * radius;
                        positions[i + 1] = 4;
                        positions[i + 2] = Math.sin(angle) * radius;
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
        // Continue position tracking
        if (!this.isRewinding) {
            // Position tracking is handled by interval
        }

        // Play ambient time sound
        if (this.soundManager && Date.now() % 300 < 50) {
            this.playEffectSound('time_ambient', 0.3);
        }
    }

    /**
     * Remove time rewind effects
     */
    removeEffects() {
        console.log('🔄 Time Rewind completed');

        this.isRewinding = false;

        // Clear position tracking interval
        if (this.trackingInterval) {
            clearInterval(this.trackingInterval);
            this.trackingInterval = null;
        }

        // Play end sound
        this.playEffectSound('time_end', 0.4);
    }

    /**
     * Activate for other player (multiplayer)
     */
    activateForOtherPlayer(data) {
        super.activateForOtherPlayer(data);

        // Create rewind effect at other player's position
        const otherPlayerCar = this.scene.getObjectByName(`player_${data.playerId}`);
        if (otherPlayerCar) {
            this.gameState = { carObject: otherPlayerCar };
            this.createTimeDistortionEffect();
        }

        // Handle position update from server
        if (data.newPosition) {
            this.animateRewind(
                { position: data.oldPosition || data.position, rotation: data.oldRotation || 0 },
                { position: data.newPosition, rotation: data.newRotation || 0 }
            );
        }
    }

    /**
     * Cleanup when power-up is destroyed
     */
    dispose() {
        super.dispose();

        if (this.trackingInterval) {
            clearInterval(this.trackingInterval);
            this.trackingInterval = null;
        }

        this.positionHistory = [];
    }

    /**
     * Get time rewind status info
     */
    getStatusInfo() {
        return {
            type: this.type,
            name: 'Time Rewind',
            description: `Rewind ${this.rewindTime / 1000}s of movement`,
            remainingTime: this.getRemainingTime(),
            icon: '🔄',
            color: '#aa44ff',
            historyLength: this.positionHistory.length,
            maxHistory: this.maxHistoryLength
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TimeRewindPowerUp;
}