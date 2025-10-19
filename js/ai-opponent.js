class AIOpponent {
    constructor(scene, world, track, personality = 'defensive', skillLevel = 'amateur') {
        this.scene = scene;
        this.world = world;
        this.track = track;
        this.personality = personality;
        this.skillLevel = skillLevel;

        // Car physics properties - will be set based on skill level
        this.mesh = null;
        this.body = null;
        this.wheels = [];
        this.wheelBodies = [];

        // AI-specific properties
        this.targetPosition = new THREE.Vector3();
        this.currentWaypoint = 0;
        this.waypoints = [];
        this.racingLine = [];
        this.currentSpeed = 0;
        this.targetSpeed = 20;
        this.steerAngle = 0;
        this.maxSteerAngle = Math.PI / 6;

        // Personality traits
        this.aggressiveness = 0.5;
        this.riskTaking = 0.5;
        this.consistency = 0.5;
        this.defensiveness = 0.5;
        this.strategicThinking = 0.5;

        // State tracking
        this.lapTime = 0;
        this.currentLap = 1;
        this.position = 1;
        this.checkpointsPassed = 0;
        this.lastCheckpointTime = 0;

        // AI decision making
        this.decisionTimer = 0;
        this.currentDecision = 'racing';
        this.targetCar = null;
        this.overtakeAttempt = false;
        this.defenseMode = false;

        // Power-up usage
        this.hasPowerUp = false;
        this.powerUpType = null;
        this.powerUpCooldown = 0;

        // Performance metrics for adaptive difficulty
        this.performanceHistory = [];
        this.averageLapTime = 60; // seconds
        this.mistakeChance = 0.1;
        this.nextMistakeTime = this.calculateNextMistake();

        this.initializePersonality();
        this.generateRacingLine();
    }

    initializePersonality() {
        const personalities = {
            aggressive: {
                aggressiveness: 0.9,
                riskTaking: 0.8,
                consistency: 0.4,
                defensiveness: 0.2,
                strategicThinking: 0.3,
                color: 0xff4444,
                maxSpeed: 32,
                acceleration: 18,
                brakeForce: 15
            },
            tactical: {
                aggressiveness: 0.4,
                riskTaking: 0.3,
                consistency: 0.8,
                defensiveness: 0.7,
                strategicThinking: 0.9,
                color: 0x4444ff,
                maxSpeed: 28,
                acceleration: 16,
                brakeForce: 22
            },
            defensive: {
                aggressiveness: 0.2,
                riskTaking: 0.2,
                consistency: 0.9,
                defensiveness: 0.9,
                strategicThinking: 0.6,
                color: 0x44ff44,
                maxSpeed: 26,
                acceleration: 14,
                brakeForce: 25
            },
            unpredictable: {
                aggressiveness: 0.5,
                riskTaking: 0.9,
                consistency: 0.3,
                defensiveness: 0.4,
                strategicThinking: 0.2,
                color: 0xff44ff,
                maxSpeed: 30,
                acceleration: 17,
                brakeForce: 18
            },
            professional: {
                aggressiveness: 0.6,
                riskTaking: 0.4,
                consistency: 0.95,
                defensiveness: 0.5,
                strategicThinking: 0.8,
                color: 0xffff44,
                maxSpeed: 30,
                acceleration: 16,
                brakeForce: 20
            }
        };

        const config = personalities[this.personality];
        Object.assign(this, config);

        // Adjust for skill level
        const skillMultipliers = {
            novice: { speed: 0.7, consistency: 0.6, mistake: 0.3 },
            amateur: { speed: 0.85, consistency: 0.75, mistake: 0.15 },
            professional: { speed: 1.0, consistency: 0.9, mistake: 0.05 },
            expert: { speed: 1.15, consistency: 0.95, mistake: 0.02 },
            legend: { speed: 1.3, consistency: 0.98, mistake: 0.01 }
        };

        const multiplier = skillMultipliers[this.skillLevel];
        this.maxSpeed *= multiplier.speed;
        this.consistency *= multiplier.consistency;
        this.mistakeChance *= multiplier.mistake;
    }

    generateRacingLine() {
        // Generate optimal racing line waypoints around the oval track
        const numWaypoints = 50;
        const trackRadius = 40;
        const straightLength = 60;

        for (let i = 0; i < numWaypoints; i++) {
            const progress = i / numWaypoints;
            const angle = progress * Math.PI * 2;

            let x, z, speed;

            if (angle < Math.PI * 0.25 || angle > Math.PI * 1.75) {
                // Bottom straight - optimize for speed
                const t = angle < Math.PI * 0.25 ? angle / (Math.PI * 0.25) : (angle - Math.PI * 1.75) / (Math.PI * 0.25);
                x = -straightLength/2 + t * straightLength;
                z = -trackRadius * 0.8; // Stay slightly inside
                speed = this.maxSpeed * 0.95;
            } else if (angle >= Math.PI * 0.25 && angle <= Math.PI * 0.75) {
                // Right turn - racing line
                const t = (angle - Math.PI * 0.25) / (Math.PI * 0.5);
                const radius = trackRadius * (0.7 + 0.3 * Math.sin(t * Math.PI));
                x = straightLength/2 + Math.cos(angle) * radius;
                z = Math.sin(angle) * radius;
                speed = this.maxSpeed * (0.6 + 0.2 * (1 - Math.abs(t - 0.5) * 2));
            } else if (angle > Math.PI * 0.75 && angle < Math.PI * 1.25) {
                // Top straight
                const t = (angle - Math.PI * 0.75) / (Math.PI * 0.5);
                x = straightLength/2 - t * straightLength;
                z = trackRadius * 0.8;
                speed = this.maxSpeed * 0.95;
            } else {
                // Left turn - racing line
                const t = (angle - Math.PI * 1.25) / (Math.PI * 0.5);
                const radius = trackRadius * (0.7 + 0.3 * Math.sin(t * Math.PI));
                x = -straightLength/2 + Math.cos(angle) * radius;
                z = Math.sin(angle) * radius;
                speed = this.maxSpeed * (0.6 + 0.2 * (1 - Math.abs(t - 0.5) * 2));
            }

            this.racingLine.push({
                position: new THREE.Vector3(x, 0, z),
                speed: speed,
                brakeZone: speed < this.maxSpeed * 0.8
            });
        }

        this.waypoints = [...this.racingLine];
    }

    async create(startPosition = { x: 0, y: 5, z: -35 }) {
        this.createMesh();
        this.createPhysicsBody(startPosition);
        this.createWheels();

        // Add slight offset to avoid collisions at start
        const offset = (Math.random() - 0.5) * 4;
        this.body.position.x += offset;

        console.log(`AI ${this.personality} opponent created at skill level ${this.skillLevel}`);
    }

    createMesh() {
        const carGroup = new THREE.Group();

        // Main body with personality color
        const bodyGeometry = new THREE.BoxGeometry(3.5, 1.3, 7);
        const bodyMaterial = new THREE.MeshLambertMaterial({
            color: this.color,
            transparent: true,
            opacity: 0.9
        });
        const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        bodyMesh.position.y = 0.65;
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        carGroup.add(bodyMesh);

        // Add personality indicator on roof
        const indicatorGeometry = new THREE.BoxGeometry(1, 0.2, 1);
        const indicatorColor = this.personality === 'aggressive' ? 0xff0000 :
                              this.personality === 'tactical' ? 0x0000ff :
                              this.personality === 'defensive' ? 0x00ff00 :
                              this.personality === 'unpredictable' ? 0xff00ff : 0xffff00;
        const indicatorMaterial = new THREE.MeshLambertMaterial({ color: indicatorColor });
        const indicatorMesh = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
        indicatorMesh.position.set(0, 2.2, 0);
        carGroup.add(indicatorMesh);

        // Car roof
        const roofGeometry = new THREE.BoxGeometry(2.8, 1, 3.5);
        const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const roofMesh = new THREE.Mesh(roofGeometry, roofMaterial);
        roofMesh.position.set(0, 1.8, 0.5);
        roofMesh.castShadow = true;
        carGroup.add(roofMesh);

        // Headlights
        const headlightGeometry = new THREE.SphereGeometry(0.25, 8, 8);
        const headlightMaterial = new THREE.MeshLambertMaterial({
            color: 0xffffcc,
            emissive: 0x444422
        });

        const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        leftHeadlight.position.set(-1, 0.8, 3.2);
        carGroup.add(leftHeadlight);

        const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        rightHeadlight.position.set(1, 0.8, 3.2);
        carGroup.add(rightHeadlight);

        this.mesh = carGroup;
        this.scene.add(this.mesh);
    }

    createPhysicsBody(startPosition) {
        const carShape = new CANNON.Box(new CANNON.Vec3(1.75, 0.65, 3.5));
        this.body = new CANNON.Body({ mass: 800 });
        this.body.addShape(carShape);
        this.body.position.set(startPosition.x, startPosition.y, startPosition.z);
        this.body.material = new CANNON.Material();
        this.body.material.friction = 0.1;
        this.body.material.restitution = 0.2;

        this.world.addBody(this.body);
    }

    createWheels() {
        const wheelRadius = 0.35;
        const wheelWidth = 0.25;
        const wheelPositions = [
            { x: -1.3, z: 2.2 },  // Front left
            { x: 1.3, z: 2.2 },   // Front right
            { x: -1.3, z: -2.2 }, // Rear left
            { x: 1.3, z: -2.2 }   // Rear right
        ];

        wheelPositions.forEach((pos, index) => {
            // Wheel mesh
            const wheelGeometry = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 12);
            const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });
            const wheelMesh = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheelMesh.rotation.z = Math.PI / 2;
            wheelMesh.castShadow = true;
            this.wheels.push(wheelMesh);
            this.scene.add(wheelMesh);

            // Wheel physics body
            const wheelShape = new CANNON.Cylinder(wheelRadius, wheelRadius, wheelWidth, 8);
            const wheelBody = new CANNON.Body({ mass: 30 });
            wheelBody.addShape(wheelShape);
            wheelBody.position.set(pos.x, 2, pos.z);
            wheelBody.material = new CANNON.Material();
            wheelBody.material.friction = 1.2;
            wheelBody.material.restitution = 0.1;
            this.wheelBodies.push(wheelBody);
            this.world.addBody(wheelBody);

            // Constraint to connect wheel to car
            const constraint = new CANNON.PointToPointConstraint(
                this.body,
                new CANNON.Vec3(pos.x, -0.65, pos.z),
                wheelBody,
                new CANNON.Vec3(0, 0, 0)
            );
            this.world.addConstraint(constraint);
        });
    }

    update(deltaTime, playerCar, otherAICars = []) {
        if (!this.body || !this.mesh) return;

        this.lapTime += deltaTime;
        this.decisionTimer += deltaTime;
        this.powerUpCooldown = Math.max(0, this.powerUpCooldown - deltaTime);

        // Make AI decisions every 0.1 seconds
        if (this.decisionTimer >= 0.1) {
            this.makeDecisions(playerCar, otherAICars);
            this.decisionTimer = 0;
        }

        // Handle mistakes for realism
        this.handleMistakes(deltaTime);

        // Update AI behavior
        this.updateSteering(deltaTime);
        this.updateThrottle(deltaTime);
        this.updatePowerUpUsage(playerCar, otherAICars);

        // Update physics
        this.updatePhysics(deltaTime);

        // Update mesh position (CANNON.Vec3 -> THREE.Vector3)
        this.mesh.position.set(
            this.body.position.x,
            this.body.position.y,
            this.body.position.z
        );
        
        // Update mesh rotation (CANNON.Quaternion -> THREE.Quaternion)
        this.mesh.quaternion.set(
            this.body.quaternion.x,
            this.body.quaternion.y,
            this.body.quaternion.z,
            this.body.quaternion.w
        );

        // Update wheels
        this.updateWheels(deltaTime);

        // Track performance for adaptive difficulty
        this.trackPerformance();
    }

    makeDecisions(playerCar, otherAICars) {
        const allCars = [playerCar, ...otherAICars].filter(car => car && car !== this);
        const myPosition = this.getPosition();

        // Find nearest car ahead and behind
        let nearestAhead = null;
        let nearestBehind = null;
        let minDistanceAhead = Infinity;
        let minDistanceBehind = Infinity;

        allCars.forEach(car => {
            if (!car.getPosition) return;
            const carPos = car.getPosition();
            const distance = myPosition.distanceTo(carPos);

            // Simple ahead/behind detection based on track position
            const isAhead = this.isCarAhead(carPos, myPosition);

            if (isAhead && distance < minDistanceAhead) {
                nearestAhead = car;
                minDistanceAhead = distance;
            } else if (!isAhead && distance < minDistanceBehind) {
                nearestBehind = car;
                minDistanceBehind = distance;
            }
        });

        // Personality-based decision making
        this.currentDecision = this.decideAction(nearestAhead, nearestBehind, minDistanceAhead, minDistanceBehind);
        this.targetCar = nearestAhead || nearestBehind;
    }

    decideAction(nearestAhead, nearestBehind, distanceAhead, distanceBehind) {
        const closeDistance = 15;
        const veryCloseDistance = 8;

        switch (this.personality) {
            case 'aggressive':
                if (nearestAhead && distanceAhead < closeDistance) {
                    return Math.random() < 0.7 ? 'overtake' : 'ram';
                }
                return 'racing';

            case 'tactical':
                if (nearestAhead && distanceAhead < closeDistance) {
                    // Wait for optimal overtaking moment
                    const isGoodOvertakeSpot = this.isGoodOvertakePosition();
                    return isGoodOvertakeSpot ? 'overtake' : 'follow';
                }
                if (nearestBehind && distanceBehind < veryCloseDistance) {
                    return 'defend';
                }
                return 'racing';

            case 'defensive':
                if (nearestBehind && distanceBehind < closeDistance) {
                    return 'defend';
                }
                if (nearestAhead && distanceAhead < veryCloseDistance) {
                    return 'follow';
                }
                return 'racing';

            case 'unpredictable':
                const randomFactor = Math.random();
                if (randomFactor < 0.3 && nearestAhead && distanceAhead < closeDistance) {
                    return Math.random() < 0.5 ? 'overtake' : 'brake_check';
                }
                if (randomFactor < 0.1) {
                    return 'random_swerve';
                }
                return 'racing';

            case 'professional':
                if (nearestAhead && distanceAhead < closeDistance) {
                    const isOptimalOvertake = this.isOptimalOvertakePosition();
                    return isOptimalOvertake ? 'overtake' : 'follow';
                }
                return 'racing';

            default:
                return 'racing';
        }
    }

    updateSteering(deltaTime) {
        const myPosition = this.getPosition();
        const currentWaypoint = this.waypoints[this.currentWaypoint];

        if (!currentWaypoint) return;

        // Check if we've reached the current waypoint
        const distanceToWaypoint = myPosition.distanceTo(currentWaypoint.position);
        if (distanceToWaypoint < 8) {
            this.currentWaypoint = (this.currentWaypoint + 1) % this.waypoints.length;
        }

        // Calculate desired direction
        const targetPosition = this.calculateTargetPosition();
        const direction = targetPosition.clone().sub(myPosition).normalize();

        // Get car's forward direction
        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyQuaternion(this.mesh.quaternion);

        // Calculate steering input
        const cross = forward.clone().cross(direction);
        let steerInput = cross.y * 2; // Steering sensitivity

        // Apply personality-based steering adjustments
        steerInput = this.applyPersonalitySteering(steerInput);

        // Smooth steering to avoid jittery movement
        const targetSteerAngle = Math.max(-1, Math.min(1, steerInput)) * this.maxSteerAngle;
        this.steerAngle = this.lerp(this.steerAngle, targetSteerAngle, deltaTime * 5);

        this.applySteering();
    }

    calculateTargetPosition() {
        const baseTarget = this.waypoints[this.currentWaypoint].position.clone();

        // Modify target based on current decision
        switch (this.currentDecision) {
            case 'overtake':
                return this.calculateOvertakePosition(baseTarget);
            case 'defend':
                return this.calculateDefensePosition(baseTarget);
            case 'follow':
                return this.calculateFollowPosition(baseTarget);
            case 'ram':
                return this.targetCar ? this.targetCar.getPosition() : baseTarget;
            case 'random_swerve':
                const swerve = new THREE.Vector3(
                    (Math.random() - 0.5) * 10,
                    0,
                    (Math.random() - 0.5) * 10
                );
                return baseTarget.clone().add(swerve);
            default:
                return baseTarget;
        }
    }

    calculateOvertakePosition(baseTarget) {
        if (!this.targetCar) return baseTarget;

        const targetPos = this.targetCar.getPosition();
        const overtakeSide = Math.random() < 0.5 ? -1 : 1; // Random side choice
        const overtakeOffset = new THREE.Vector3(overtakeSide * 8, 0, 0);

        return targetPos.clone().add(overtakeOffset);
    }

    calculateDefensePosition(baseTarget) {
        if (!this.targetCar) return baseTarget;

        const targetPos = this.targetCar.getPosition();
        const myPos = this.getPosition();

        // Block the racing line
        const blockingOffset = targetPos.clone().sub(myPos).normalize().multiplyScalar(-5);
        return baseTarget.clone().add(blockingOffset);
    }

    calculateFollowPosition(baseTarget) {
        if (!this.targetCar) return baseTarget;

        const targetPos = this.targetCar.getPosition();
        const followDistance = 6 + this.consistency * 4; // More consistent AI follows closer

        const followOffset = new THREE.Vector3(0, 0, -followDistance);
        return targetPos.clone().add(followOffset);
    }

    updateThrottle(deltaTime) {
        const currentWaypoint = this.waypoints[this.currentWaypoint];
        if (!currentWaypoint) return;

        let targetSpeed = currentWaypoint.speed;

        // Adjust speed based on current decision
        switch (this.currentDecision) {
            case 'overtake':
                targetSpeed *= 1.1; // Boost for overtaking
                break;
            case 'defend':
                targetSpeed *= 0.9; // Slightly slower when defending
                break;
            case 'follow':
                targetSpeed *= 0.85; // Slower when following
                break;
            case 'ram':
                targetSpeed *= 1.2; // Aggressive speed
                break;
            case 'brake_check':
                targetSpeed *= 0.3; // Sudden braking
                break;
            case 'random_swerve':
                targetSpeed *= 0.8; // Slower when swerving
                break;
        }

        // Apply skill level adjustments
        targetSpeed *= this.getSkillSpeedMultiplier();

        const currentSpeed = this.getSpeed();

        if (currentSpeed < targetSpeed) {
            this.accelerate(1);
        } else if (currentSpeed > targetSpeed * 1.1) {
            this.brake();
        }
    }

    handleMistakes(deltaTime) {
        if (Date.now() > this.nextMistakeTime) {
            this.makeMistake();
            this.nextMistakeTime = this.calculateNextMistake();
        }
    }

    makeMistake() {
        const mistakeTypes = ['brake_too_late', 'oversteer', 'understeer', 'throttle_error'];
        const mistake = mistakeTypes[Math.floor(Math.random() * mistakeTypes.length)];

        switch (mistake) {
            case 'brake_too_late':
                // Miss brake point, go too fast into corner
                this.targetSpeed *= 1.3;
                setTimeout(() => { this.targetSpeed /= 1.3; }, 1000);
                break;

            case 'oversteer':
                // Too much steering input
                this.steerAngle *= 1.5;
                setTimeout(() => { this.steerAngle *= 0.67; }, 500);
                break;

            case 'understeer':
                // Too little steering input
                this.steerAngle *= 0.5;
                setTimeout(() => { this.steerAngle *= 2; }, 500);
                break;

            case 'throttle_error':
                // Sudden throttle lift
                this.targetSpeed *= 0.7;
                setTimeout(() => { this.targetSpeed /= 0.7; }, 800);
                break;
        }
    }

    calculateNextMistake() {
        const baseInterval = 30000; // 30 seconds base
        const randomFactor = 0.5 + Math.random(); // 0.5 to 1.5
        const mistakeInterval = baseInterval * randomFactor * (1 / this.mistakeChance);
        return Date.now() + mistakeInterval;
    }

    updatePowerUpUsage(playerCar, otherAICars) {
        if (!this.hasPowerUp || this.powerUpCooldown > 0) return;

        const shouldUsePowerUp = this.decidePowerUpUsage(playerCar, otherAICars);

        if (shouldUsePowerUp) {
            this.usePowerUp();
        }
    }

    decidePowerUpUsage(playerCar, otherAICars) {
        if (!this.hasPowerUp) return false;

        switch (this.personality) {
            case 'aggressive':
                return Math.random() < 0.8; // Use aggressively

            case 'tactical':
                // Use strategically - when close to other cars or in good position
                const nearCar = this.targetCar && this.getPosition().distanceTo(this.targetCar.getPosition()) < 12;
                return nearCar && Math.random() < 0.6;

            case 'defensive':
                // Use defensively - when being overtaken
                return this.currentDecision === 'defend' && Math.random() < 0.4;

            case 'unpredictable':
                return Math.random() < 0.5; // Random usage

            case 'professional':
                // Use optimally - calculate best strategic moment
                return this.isOptimalPowerUpMoment() && Math.random() < 0.7;

            default:
                return Math.random() < 0.3;
        }
    }

    // Helper methods
    isCarAhead(carPos, myPos) {
        // Simple track position comparison
        return carPos.z > myPos.z || (Math.abs(carPos.z - myPos.z) < 5 && carPos.x > myPos.x);
    }

    isGoodOvertakePosition() {
        const currentWaypoint = this.waypoints[this.currentWaypoint];
        return currentWaypoint && !currentWaypoint.brakeZone;
    }

    isOptimalOvertakePosition() {
        // More sophisticated check for professional AI
        const currentWaypoint = this.waypoints[this.currentWaypoint];
        const nextWaypoint = this.waypoints[(this.currentWaypoint + 1) % this.waypoints.length];

        return currentWaypoint && nextWaypoint &&
               !currentWaypoint.brakeZone && !nextWaypoint.brakeZone &&
               currentWaypoint.speed > this.maxSpeed * 0.8;
    }

    isOptimalPowerUpMoment() {
        // Professional AI calculates optimal power-up usage
        const inStraight = this.waypoints[this.currentWaypoint]?.speed > this.maxSpeed * 0.8;
        const hasTarget = this.targetCar !== null;
        return inStraight && hasTarget;
    }

    getSkillSpeedMultiplier() {
        const skillMultipliers = {
            novice: 0.7,
            amateur: 0.85,
            professional: 1.0,
            expert: 1.1,
            legend: 1.2
        };
        return skillMultipliers[this.skillLevel] || 1.0;
    }

    applyPersonalitySteering(steerInput) {
        switch (this.personality) {
            case 'aggressive':
                return steerInput * 1.2; // More aggressive steering

            case 'defensive':
                return steerInput * 0.8; // Smoother steering

            case 'unpredictable':
                if (Math.random() < 0.1) {
                    return steerInput + (Math.random() - 0.5) * 0.5; // Random steering noise
                }
                return steerInput;

            case 'professional':
                return steerInput * (0.9 + this.consistency * 0.2); // Consistent, precise steering

            default:
                return steerInput;
        }
    }

    // Physics methods (similar to Car class)
    accelerate(direction) {
        const force = direction * this.acceleration * 80;
        const forwardDirection = new CANNON.Vec3(0, 0, 1);
        this.body.quaternion.vmult(forwardDirection, forwardDirection);

        this.body.force.x += forwardDirection.x * force;
        this.body.force.z += forwardDirection.z * force;
    }

    brake() {
        this.body.velocity.x *= 0.95;
        this.body.velocity.z *= 0.95;
    }

    applySteering() {
        if (Math.abs(this.steerAngle) > 0.01) {
            const steerForce = this.steerAngle * 40;
            this.body.torque.y += steerForce;
        }
    }

    updatePhysics(deltaTime) {
        // Apply air resistance
        const airResistance = 0.98;
        this.body.velocity.x *= airResistance;
        this.body.velocity.z *= airResistance;
        this.body.angularVelocity.y *= 0.95;

        // Keep car upright
        const uprightForce = 800;
        if (Math.abs(this.body.quaternion.x) > 0.3 || Math.abs(this.body.quaternion.z) > 0.3) {
            this.body.angularVelocity.x *= 0.8;
            this.body.angularVelocity.z *= 0.8;

            this.body.torque.x += -this.body.quaternion.x * uprightForce;
            this.body.torque.z += -this.body.quaternion.z * uprightForce;
        }
    }

    updateWheels(deltaTime) {
        this.wheels.forEach((wheel, index) => {
            if (this.wheelBodies[index]) {
                // Convert CANNON.Vec3 to THREE.Vector3
                wheel.position.set(
                    this.wheelBodies[index].position.x,
                    this.wheelBodies[index].position.y,
                    this.wheelBodies[index].position.z
                );
                
                // Convert CANNON.Quaternion to THREE.Quaternion
                wheel.quaternion.set(
                    this.wheelBodies[index].quaternion.x,
                    this.wheelBodies[index].quaternion.y,
                    this.wheelBodies[index].quaternion.z,
                    this.wheelBodies[index].quaternion.w
                );

                const speed = this.body.velocity.length();
                wheel.rotation.x += speed * deltaTime * 0.4;
            }
        });
    }

    trackPerformance() {
        // Track AI performance for adaptive difficulty
        this.performanceHistory.push({
            speed: this.getSpeed(),
            position: this.getPosition().clone(),
            lapTime: this.lapTime,
            timestamp: Date.now()
        });

        // Keep only recent performance data
        if (this.performanceHistory.length > 100) {
            this.performanceHistory.shift();
        }
    }

    usePowerUp() {
        // Implement power-up usage logic
        console.log(`${this.personality} AI used power-up: ${this.powerUpType}`);
        this.hasPowerUp = false;
        this.powerUpType = null;
        this.powerUpCooldown = 3; // 3 second cooldown
    }

    // Utility methods
    getPosition() {
        if (!this.body) return new THREE.Vector3();
        // Convert CANNON.Vec3 to THREE.Vector3
        return new THREE.Vector3(
            this.body.position.x,
            this.body.position.y,
            this.body.position.z
        );
    }

    getRotation() {
        if (!this.body) return new THREE.Quaternion();
        // Convert CANNON.Quaternion to THREE.Quaternion
        return new THREE.Quaternion(
            this.body.quaternion.x,
            this.body.quaternion.y,
            this.body.quaternion.z,
            this.body.quaternion.w
        );
    }

    getSpeed() {
        if (!this.body) return 0;
        // Calculate velocity magnitude directly from CANNON.Vec3
        return this.body.velocity.length();
    }

    lerp(a, b, t) {
        return a + (b - a) * Math.min(1, Math.max(0, t));
    }

    reset(position = { x: 0, y: 5, z: -35 }) {
        if (this.body) {
            this.body.position.set(position.x, position.y, position.z);
            this.body.velocity.set(0, 0, 0);
            this.body.angularVelocity.set(0, 0, 0);
            this.body.quaternion.set(0, 0, 0, 1);
        }

        this.currentWaypoint = 0;
        this.lapTime = 0;
        this.currentLap = 1;
        this.checkpointsPassed = 0;
    }

    destroy() {
        // Clean up AI opponent
        if (this.mesh) {
            this.scene.remove(this.mesh);
        }

        if (this.body) {
            this.world.removeBody(this.body);
        }

        this.wheels.forEach(wheel => {
            this.scene.remove(wheel);
        });

        this.wheelBodies.forEach(wheelBody => {
            this.world.removeBody(wheelBody);
        });
    }
}