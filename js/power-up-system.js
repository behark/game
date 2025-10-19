class PowerUpSystem {
    constructor(scene, world, track) {
        this.scene = scene;
        this.world = world;
        this.track = track;

        this.powerUps = [];
        this.activePowerUps = new Map(); // Track active power-ups on cars
        this.spawnPoints = [];
        this.spawnTimer = 0;
        this.spawnInterval = 8; // seconds

        // Power-up types with AI usage strategies
        this.powerUpTypes = {
            speed_boost: {
                name: 'Speed Boost',
                color: 0x00ff00,
                duration: 5,
                effect: 'speedMultiplier',
                value: 1.5,
                aiUsage: {
                    aggressive: { probability: 0.9, timing: 'immediate' },
                    tactical: { probability: 0.7, timing: 'strategic' },
                    defensive: { probability: 0.4, timing: 'escape' },
                    unpredictable: { probability: 0.6, timing: 'random' },
                    professional: { probability: 0.8, timing: 'optimal' }
                }
            },
            shield: {
                name: 'Shield',
                color: 0x0088ff,
                duration: 8,
                effect: 'protection',
                value: 1,
                aiUsage: {
                    aggressive: { probability: 0.3, timing: 'combat' },
                    tactical: { probability: 0.8, timing: 'defensive' },
                    defensive: { probability: 0.9, timing: 'immediate' },
                    unpredictable: { probability: 0.5, timing: 'random' },
                    professional: { probability: 0.6, timing: 'strategic' }
                }
            },
            missile: {
                name: 'Missile',
                color: 0xff4400,
                duration: 0, // Instant use
                effect: 'projectile',
                value: 1,
                aiUsage: {
                    aggressive: { probability: 0.95, timing: 'immediate' },
                    tactical: { probability: 0.8, timing: 'strategic' },
                    defensive: { probability: 0.2, timing: 'desperate' },
                    unpredictable: { probability: 0.7, timing: 'random' },
                    professional: { probability: 0.6, timing: 'optimal' }
                }
            },
            oil_slick: {
                name: 'Oil Slick',
                color: 0x444444,
                duration: 15,
                effect: 'trap',
                value: 1,
                aiUsage: {
                    aggressive: { probability: 0.7, timing: 'blocking' },
                    tactical: { probability: 0.9, timing: 'strategic' },
                    defensive: { probability: 0.8, timing: 'escape' },
                    unpredictable: { probability: 0.6, timing: 'random' },
                    professional: { probability: 0.7, timing: 'optimal' }
                }
            },
            nitro: {
                name: 'Nitro',
                color: 0xff00ff,
                duration: 3,
                effect: 'acceleration',
                value: 2,
                aiUsage: {
                    aggressive: { probability: 0.8, timing: 'overtake' },
                    tactical: { probability: 0.7, timing: 'strategic' },
                    defensive: { probability: 0.5, timing: 'escape' },
                    unpredictable: { probability: 0.9, timing: 'random' },
                    professional: { probability: 0.8, timing: 'optimal' }
                }
            },
            emp: {
                name: 'EMP',
                color: 0x8800ff,
                duration: 0, // Instant area effect
                effect: 'disable',
                value: 5, // Effect duration on targets
                aiUsage: {
                    aggressive: { probability: 0.6, timing: 'combat' },
                    tactical: { probability: 0.9, timing: 'strategic' },
                    defensive: { probability: 0.4, timing: 'desperate' },
                    unpredictable: { probability: 0.8, timing: 'random' },
                    professional: { probability: 0.7, timing: 'optimal' }
                }
            }
        };

        this.generateSpawnPoints();
    }

    generateSpawnPoints() {
        // Generate power-up spawn points around the track
        const trackRadius = 40;
        const straightLength = 60;
        const numSpawnPoints = 12;

        for (let i = 0; i < numSpawnPoints; i++) {
            const progress = i / numSpawnPoints;
            const angle = progress * Math.PI * 2;

            let x, z;

            if (angle < Math.PI * 0.25 || angle > Math.PI * 1.75) {
                // Bottom straight
                const t = angle < Math.PI * 0.25 ? angle / (Math.PI * 0.25) : (angle - Math.PI * 1.75) / (Math.PI * 0.25);
                x = -straightLength/2 + t * straightLength + (Math.random() - 0.5) * 8;
                z = -trackRadius * 0.6 + (Math.random() - 0.5) * 6;
            } else if (angle >= Math.PI * 0.25 && angle <= Math.PI * 0.75) {
                // Right turn
                const radius = trackRadius * 0.8 + (Math.random() - 0.5) * 10;
                x = Math.cos(angle) * radius;
                z = Math.sin(angle) * radius;
            } else if (angle > Math.PI * 0.75 && angle < Math.PI * 1.25) {
                // Top straight
                const t = (angle - Math.PI * 0.75) / (Math.PI * 0.5);
                x = straightLength/2 - t * straightLength + (Math.random() - 0.5) * 8;
                z = trackRadius * 0.6 + (Math.random() - 0.5) * 6;
            } else {
                // Left turn
                const radius = trackRadius * 0.8 + (Math.random() - 0.5) * 10;
                x = Math.cos(angle) * radius;
                z = Math.sin(angle) * radius;
            }

            this.spawnPoints.push(new THREE.Vector3(x, 1, z));
        }
    }

    update(deltaTime, playerCar, aiOpponents = []) {
        this.spawnTimer += deltaTime;

        // Spawn new power-ups
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnPowerUp();
            this.spawnTimer = 0;
        }

        // Update existing power-ups
        this.updatePowerUps(deltaTime);

        // Check collisions with cars
        this.checkCollisions(playerCar, aiOpponents);

        // Update active power-up effects
        this.updateActivePowerUps(deltaTime);

        // Handle AI power-up usage decisions
        this.handleAIPowerUpUsage(aiOpponents, playerCar);
    }

    spawnPowerUp() {
        if (this.powerUps.length >= 6) return; // Limit active power-ups

        const spawnPoint = this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)];
        const powerUpTypes = Object.keys(this.powerUpTypes);
        const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];

        const powerUp = this.createPowerUp(type, spawnPoint);
        this.powerUps.push(powerUp);
    }

    createPowerUp(type, position) {
        const config = this.powerUpTypes[type];

        // Create visual representation
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshLambertMaterial({
            color: config.color,
            emissive: config.color,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.8
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.rotation.x = Math.PI / 4;
        mesh.rotation.z = Math.PI / 4;
        this.scene.add(mesh);

        // Add glow effect
        const glowGeometry = new THREE.SphereGeometry(3, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: config.color,
            transparent: true,
            opacity: 0.2
        });
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        glowMesh.position.copy(position);
        this.scene.add(glowMesh);

        // Create physics body for collision detection
        const shape = new CANNON.Box(new CANNON.Vec3(1, 1, 1));
        const body = new CANNON.Body({ mass: 0, isTrigger: true });
        body.addShape(shape);
        body.position.copy(position);
        this.world.addBody(body);

        return {
            type,
            mesh,
            glowMesh,
            body,
            collected: false,
            rotationSpeed: (Math.random() + 0.5) * 2,
            bobSpeed: (Math.random() + 0.5) * 3,
            startY: position.y,
            time: 0
        };
    }

    updatePowerUps(deltaTime) {
        this.powerUps.forEach(powerUp => {
            if (powerUp.collected) return;

            powerUp.time += deltaTime;

            // Rotate power-up
            powerUp.mesh.rotation.y += powerUp.rotationSpeed * deltaTime;
            powerUp.glowMesh.rotation.y += powerUp.rotationSpeed * deltaTime * 0.5;

            // Bob up and down
            const bobOffset = Math.sin(powerUp.time * powerUp.bobSpeed) * 0.5;
            powerUp.mesh.position.y = powerUp.startY + bobOffset;
            powerUp.glowMesh.position.y = powerUp.startY + bobOffset;

            // Pulse glow
            const pulseIntensity = 0.1 + Math.sin(powerUp.time * 4) * 0.1;
            powerUp.glowMesh.material.opacity = pulseIntensity;
        });

        // Remove collected power-ups
        this.powerUps = this.powerUps.filter(powerUp => {
            if (powerUp.collected) {
                this.scene.remove(powerUp.mesh);
                this.scene.remove(powerUp.glowMesh);
                this.world.removeBody(powerUp.body);
                return false;
            }
            return true;
        });
    }

    checkCollisions(playerCar, aiOpponents) {
        const allCars = [playerCar, ...aiOpponents].filter(car => car);

        allCars.forEach(car => {
            if (!car.getPosition) return;

            const carPos = car.getPosition();

            this.powerUps.forEach(powerUp => {
                if (powerUp.collected) return;

                const distance = carPos.distanceTo(powerUp.mesh.position);
                if (distance < 3) {
                    this.collectPowerUp(powerUp, car);
                }
            });
        });
    }

    collectPowerUp(powerUp, car) {
        powerUp.collected = true;

        // Give power-up to car
        if (car.constructor.name === 'AIOpponent') {
            car.hasPowerUp = true;
            car.powerUpType = powerUp.type;
        } else {
            // Player car - store in game state or car
            car.hasPowerUp = true;
            car.powerUpType = powerUp.type;
        }

        // Create collection effect
        this.createCollectionEffect(powerUp.mesh.position, powerUp.type);

        console.log(`Power-up collected: ${this.powerUpTypes[powerUp.type].name}`);
    }

    createCollectionEffect(position, type) {
        const config = this.powerUpTypes[type];

        // Particle burst effect
        const particleCount = 20;
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(0.1, 4, 4),
                new THREE.MeshBasicMaterial({ color: config.color })
            );

            particle.position.copy(position);
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                Math.random() * 5 + 2,
                (Math.random() - 0.5) * 10
            );

            this.scene.add(particle);

            // Animate particle
            const animateParticle = () => {
                particle.position.add(velocity.clone().multiplyScalar(0.05));
                velocity.y -= 0.2; // Gravity
                particle.material.opacity -= 0.02;

                if (particle.material.opacity > 0) {
                    requestAnimationFrame(animateParticle);
                } else {
                    this.scene.remove(particle);
                }
            };

            setTimeout(animateParticle, i * 20); // Stagger particles
        }
    }

    usePowerUp(car, type) {
        const config = this.powerUpTypes[type];

        if (!config) return false;

        switch (config.effect) {
            case 'speedMultiplier':
                this.applySpeedBoost(car, config);
                break;
            case 'protection':
                this.applyShield(car, config);
                break;
            case 'projectile':
                this.fireMissile(car, config);
                break;
            case 'trap':
                this.deployOilSlick(car, config);
                break;
            case 'acceleration':
                this.applyNitro(car, config);
                break;
            case 'disable':
                this.triggerEMP(car, config);
                break;
        }

        // Clear power-up from car
        car.hasPowerUp = false;
        car.powerUpType = null;

        return true;
    }

    applySpeedBoost(car, config) {
        const carId = this.getCarId(car);

        if (this.activePowerUps.has(carId)) {
            // Extend existing boost
            this.activePowerUps.get(carId).duration = config.duration;
        } else {
            this.activePowerUps.set(carId, {
                type: 'speed_boost',
                duration: config.duration,
                value: config.value,
                car: car,
                originalMaxSpeed: car.maxSpeed
            });

            car.maxSpeed *= config.value;
        }

        this.createPowerUpEffect(car, 'speed', 0x00ff00);
    }

    applyShield(car, config) {
        const carId = this.getCarId(car);

        this.activePowerUps.set(carId, {
            type: 'shield',
            duration: config.duration,
            car: car
        });

        car.hasShield = true;
        this.createPowerUpEffect(car, 'shield', 0x0088ff);
    }

    fireMissile(car, config) {
        const carPos = car.getPosition();
        const carRotation = car.getRotation();

        // Create missile projectile
        const missile = this.createMissile(carPos, carRotation);
        this.createPowerUpEffect(car, 'missile', 0xff4400);

        console.log('Missile fired!');
    }

    deployOilSlick(car, config) {
        const carPos = car.getPosition();

        // Create oil slick behind the car
        const oilSlick = this.createOilSlick(carPos);
        this.createPowerUpEffect(car, 'oil', 0x444444);

        console.log('Oil slick deployed!');
    }

    applyNitro(car, config) {
        const carId = this.getCarId(car);

        this.activePowerUps.set(carId, {
            type: 'nitro',
            duration: config.duration,
            value: config.value,
            car: car,
            originalAcceleration: car.acceleration
        });

        car.acceleration *= config.value;
        this.createPowerUpEffect(car, 'nitro', 0xff00ff);
    }

    triggerEMP(car, config) {
        const carPos = car.getPosition();
        const empRadius = 20;

        // Find cars within EMP radius
        const affectedCars = [];
        // Check player car distance
        // Check AI cars distance

        // Apply EMP effect to nearby cars
        affectedCars.forEach(targetCar => {
            this.applyEMPEffect(targetCar, config.value);
        });

        this.createPowerUpEffect(car, 'emp', 0x8800ff);
        console.log('EMP triggered!');
    }

    updateActivePowerUps(deltaTime) {
        for (const [carId, powerUp] of this.activePowerUps.entries()) {
            powerUp.duration -= deltaTime;

            if (powerUp.duration <= 0) {
                this.removePowerUpEffect(powerUp);
                this.activePowerUps.delete(carId);
            }
        }
    }

    removePowerUpEffect(powerUp) {
        switch (powerUp.type) {
            case 'speed_boost':
                powerUp.car.maxSpeed = powerUp.originalMaxSpeed;
                break;
            case 'shield':
                powerUp.car.hasShield = false;
                break;
            case 'nitro':
                powerUp.car.acceleration = powerUp.originalAcceleration;
                break;
        }
    }

    handleAIPowerUpUsage(aiOpponents, playerCar) {
        aiOpponents.forEach(ai => {
            if (!ai.hasPowerUp || ai.powerUpCooldown > 0) return;

            const shouldUse = this.shouldAIUsePowerUp(ai, playerCar, aiOpponents);

            if (shouldUse) {
                this.usePowerUp(ai, ai.powerUpType);
                ai.powerUpCooldown = 2; // Cooldown before next usage decision
            }
        });
    }

    shouldAIUsePowerUp(ai, playerCar, allAI) {
        if (!ai.powerUpType) return false;

        const config = this.powerUpTypes[ai.powerUpType];
        const aiUsage = config.aiUsage[ai.personality];

        if (!aiUsage || Math.random() > aiUsage.probability) return false;

        // Timing-based decision
        switch (aiUsage.timing) {
            case 'immediate':
                return true;

            case 'strategic':
                return this.isStrategicMoment(ai, playerCar, allAI);

            case 'combat':
                return this.isInCombatSituation(ai, playerCar, allAI);

            case 'defensive':
                return this.needsDefense(ai, playerCar, allAI);

            case 'escape':
                return this.needsEscape(ai, playerCar, allAI);

            case 'overtake':
                return this.isOvertakingOpportunity(ai, playerCar, allAI);

            case 'optimal':
                return this.isOptimalUsage(ai, playerCar, allAI);

            case 'random':
                return Math.random() < 0.3;

            case 'desperate':
                return ai.position > allAI.length * 0.7; // Bottom 30%

            case 'blocking':
                return this.shouldBlockWithPowerUp(ai, playerCar, allAI);

            default:
                return false;
        }
    }

    // AI decision helper methods
    isStrategicMoment(ai, playerCar, allAI) {
        // Use when near other cars or at key track positions
        const nearbyCarCount = this.getNearbyCarCount(ai, [playerCar, ...allAI], 15);
        return nearbyCarCount > 0 && ai.isGoodOvertakePosition();
    }

    isInCombatSituation(ai, playerCar, allAI) {
        // Use when very close to other cars
        const nearbyCarCount = this.getNearbyCarCount(ai, [playerCar, ...allAI], 8);
        return nearbyCarCount > 0;
    }

    needsDefense(ai, playerCar, allAI) {
        // Use when being closely followed
        const behindCars = this.getCarsNearby(ai, [playerCar, ...allAI], 10).filter(car =>
            this.isCarBehind(car.getPosition(), ai.getPosition())
        );
        return behindCars.length > 0;
    }

    needsEscape(ai, playerCar, allAI) {
        // Use when trapped or in poor position
        return ai.position > allAI.length * 0.6; // Bottom 40%
    }

    isOvertakingOpportunity(ai, playerCar, allAI) {
        // Use when about to overtake
        return ai.currentDecision === 'overtake';
    }

    isOptimalUsage(ai, playerCar, allAI) {
        // Professional AI makes calculated decisions
        const inStraight = ai.isGoodOvertakePosition();
        const hasTarget = ai.targetCar !== null;
        const goodPosition = ai.position <= allAI.length * 0.5; // Top half

        return inStraight && hasTarget && goodPosition;
    }

    shouldBlockWithPowerUp(ai, playerCar, allAI) {
        // Use power-up to block racing line
        return ai.currentDecision === 'defend' || ai.currentDecision === 'racing';
    }

    // Utility methods
    getNearbyCarCount(car, allCars, distance) {
        const carPos = car.getPosition();
        return allCars.filter(otherCar =>
            otherCar !== car &&
            otherCar.getPosition &&
            carPos.distanceTo(otherCar.getPosition()) < distance
        ).length;
    }

    getCarsNearby(car, allCars, distance) {
        const carPos = car.getPosition();
        return allCars.filter(otherCar =>
            otherCar !== car &&
            otherCar.getPosition &&
            carPos.distanceTo(otherCar.getPosition()) < distance
        );
    }

    isCarBehind(carPos, myPos) {
        // Simple behind detection based on Z coordinate
        return carPos.z < myPos.z - 2;
    }

    getCarId(car) {
        // Generate unique ID for car tracking
        return car.constructor.name + '_' + (car.id || Math.random().toString(36).substr(2, 9));
    }

    createPowerUpEffect(car, effectType, color) {
        // Visual effect when power-up is used
        const carPos = car.getPosition();

        // Create particle effect
        const effectGeometry = new THREE.SphereGeometry(5, 16, 16);
        const effectMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.6
        });

        const effectMesh = new THREE.Mesh(effectGeometry, effectMaterial);
        effectMesh.position.copy(carPos);
        this.scene.add(effectMesh);

        // Animate effect
        let time = 0;
        const animateEffect = () => {
            time += 0.05;
            effectMesh.scale.setScalar(1 + time);
            effectMaterial.opacity = 0.6 * (1 - time);

            if (time < 1) {
                requestAnimationFrame(animateEffect);
            } else {
                this.scene.remove(effectMesh);
            }
        };

        animateEffect();
    }

    createMissile(position, rotation) {
        // Create missile projectile (simplified implementation)
        const missileGeometry = new THREE.ConeGeometry(0.3, 2, 8);
        const missileMaterial = new THREE.MeshLambertMaterial({ color: 0xff4400 });
        const missile = new THREE.Mesh(missileGeometry, missileMaterial);

        missile.position.copy(position);
        missile.position.y += 1;
        missile.quaternion.copy(rotation);

        this.scene.add(missile);

        // Animate missile movement (simplified)
        const velocity = new THREE.Vector3(0, 0, 30);
        velocity.applyQuaternion(rotation);

        const animateMissile = () => {
            missile.position.add(velocity.clone().multiplyScalar(0.05));

            // Remove after distance
            if (missile.position.length() < 200) {
                requestAnimationFrame(animateMissile);
            } else {
                this.scene.remove(missile);
            }
        };

        animateMissile();
        return missile;
    }

    createOilSlick(position) {
        // Create oil slick trap (simplified implementation)
        const oilGeometry = new THREE.CylinderGeometry(4, 4, 0.1, 16);
        const oilMaterial = new THREE.MeshLambertMaterial({
            color: 0x222222,
            transparent: true,
            opacity: 0.8
        });

        const oilSlick = new THREE.Mesh(oilGeometry, oilMaterial);
        oilSlick.position.copy(position);
        oilSlick.position.y = 0.1;

        this.scene.add(oilSlick);

        // Remove oil slick after duration
        setTimeout(() => {
            this.scene.remove(oilSlick);
        }, 15000);

        return oilSlick;
    }

    // Public interface methods
    getActivePowerUps() {
        return Array.from(this.activePowerUps.entries()).map(([carId, powerUp]) => ({
            carId,
            type: powerUp.type,
            duration: powerUp.duration
        }));
    }

    getPowerUpCount() {
        return this.powerUps.length;
    }

    setSpawnInterval(interval) {
        this.spawnInterval = Math.max(3, interval);
    }

    destroy() {
        // Clean up all power-ups
        this.powerUps.forEach(powerUp => {
            this.scene.remove(powerUp.mesh);
            this.scene.remove(powerUp.glowMesh);
            this.world.removeBody(powerUp.body);
        });

        this.powerUps = [];
        this.activePowerUps.clear();
    }
}