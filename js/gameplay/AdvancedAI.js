/**
 * AdvancedAI.js
 * Sophisticated AI racing system with racing lines, overtaking, and difficulty levels
 * Replaces basic AI with competitive, realistic opponents
 */

class AdvancedAI {
    constructor(carBody, carMesh, trackData, aiConfig = {}) {
        this.carBody = carBody;
        this.carMesh = carMesh;
        this.trackData = trackData;
        
        // AI configuration
        this.config = {
            difficulty: aiConfig.difficulty || 'medium',
            aggressiveness: aiConfig.aggressiveness || 0.5,
            skill: aiConfig.skill || 0.7,
            name: aiConfig.name || 'AI Driver',
            carNumber: aiConfig.carNumber || Math.floor(Math.random() * 99) + 1
        };
        
        // Racing line data
        this.racingLine = {
            points: [],
            currentTarget: 0,
            lookahead: 5
        };
        
        // AI state
        this.state = {
            currentSpeed: 0,
            targetSpeed: 0,
            throttle: 0,
            brake: 0,
            steering: 0,
            position: new CANNON.Vec3(),
            
            // Race awareness
            nearestOpponent: null,
            distanceToOpponent: Infinity,
            isOvertaking: false,
            defendingPosition: false,
            
            // Performance
            lapTime: 0,
            bestLapTime: Infinity,
            mistakes: 0
        };
        
        // Difficulty presets
        this.difficultySettings = {
            easy: {
                maxSpeed: 0.75,
                corneringSkill: 0.6,
                reactionTime: 0.3,
                mistakeChance: 0.15,
                aggressiveness: 0.3
            },
            medium: {
                maxSpeed: 0.85,
                corneringSkill: 0.75,
                reactionTime: 0.2,
                mistakeChance: 0.08,
                aggressiveness: 0.5
            },
            hard: {
                maxSpeed: 0.95,
                corneringSkill: 0.9,
                reactionTime: 0.1,
                mistakeChance: 0.03,
                aggressiveness: 0.7
            },
            expert: {
                maxSpeed: 1.0,
                corneringSkill: 0.98,
                reactionTime: 0.05,
                mistakeChance: 0.01,
                aggressiveness: 0.85
            }
        };
        
        this.difficulty = this.difficultySettings[this.config.difficulty];
        
        this.initialize();
    }

    /**
     * Initialize AI systems
     */
    initialize() {
        this.calculateRacingLine();
        console.log(`✅ AI Driver initialized: ${this.config.name} (${this.config.difficulty})`);
    }

    /**
     * Calculate optimal racing line through track
     */
    calculateRacingLine() {
        const segments = this.trackData.segments;
        this.racingLine.points = [];
        
        segments.forEach((segment, index) => {
            const nextSegment = segments[(index + 1) % segments.length];
            const prevSegment = segments[index > 0 ? index - 1 : segments.length - 1];
            
            // Calculate apex point for corners
            const curvature = segment.curvature;
            const position = segment.position.clone();
            
            if (Math.abs(curvature) > 0.01) {
                // This is a corner - calculate apex
                const perpendicular = new THREE.Vector3(
                    -segment.direction.z,
                    0,
                    segment.direction.x
                );
                
                // Move toward inside of corner
                const apexOffset = curvature > 0 ? -segment.width * 0.3 : segment.width * 0.3;
                position.add(perpendicular.multiplyScalar(apexOffset));
            }
            
            // Calculate target speed for this point
            const targetSpeed = this.calculateTargetSpeed(segment, nextSegment);
            
            this.racingLine.points.push({
                position: position,
                direction: segment.direction.clone(),
                targetSpeed: targetSpeed,
                curvature: curvature,
                segment: segment
            });
        });
        
        console.log(`  ✓ Racing line calculated: ${this.racingLine.points.length} points`);
    }

    /**
     * Calculate target speed for a segment
     */
    calculateTargetSpeed(segment, nextSegment) {
        const maxSpeed = 200 * this.difficulty.maxSpeed; // km/h
        
        // Reduce speed in corners based on curvature
        const curvature = Math.abs(segment.curvature);
        const nextCurvature = Math.abs(nextSegment.curvature);
        
        let speedFactor = 1.0;
        
        if (curvature > 0.01) {
            // Sharp corner
            speedFactor = 0.4 + (1.0 - curvature * 20) * this.difficulty.corneringSkill;
        } else if (curvature > 0.005) {
            // Medium corner
            speedFactor = 0.6 + (1.0 - curvature * 30) * this.difficulty.corneringSkill;
        } else if (nextCurvature > 0.01) {
            // Approaching corner - brake early
            speedFactor = 0.7;
        }
        
        speedFactor = Math.max(0.3, Math.min(1.0, speedFactor));
        
        return maxSpeed * speedFactor;
    }

    /**
     * Update AI every frame
     */
    update(deltaTime, opponents = []) {
        // Find current position on racing line
        this.updateRacingLinePosition();
        
        // Check for nearby opponents
        this.updateOpponentAwareness(opponents);
        
        // Decide on racing strategy
        this.updateStrategy(deltaTime);
        
        // Calculate control inputs
        this.calculateControls(deltaTime);
        
        // Apply controls to car
        this.applyControls(deltaTime);
        
        // Simulate occasional mistakes
        this.simulateMistakes(deltaTime);
    }

    /**
     * Find nearest point on racing line
     */
    updateRacingLinePosition() {
        let minDistance = Infinity;
        let nearestIndex = 0;
        
        this.racingLine.points.forEach((point, index) => {
            const distance = this.carBody.position.distanceTo(point.position);
            if (distance < minDistance) {
                minDistance = distance;
                nearestIndex = index;
            }
        });
        
        this.racingLine.currentTarget = nearestIndex;
    }

    /**
     * Check for nearby opponents and decide on actions
     */
    updateOpponentAwareness(opponents) {
        let nearest = null;
        let minDistance = Infinity;
        
        opponents.forEach(opponent => {
            if (opponent === this) return;
            
            const distance = this.carBody.position.distanceTo(opponent.carBody.position);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = opponent;
            }
        });
        
        this.state.nearestOpponent = nearest;
        this.state.distanceToOpponent = minDistance;
        
        // Determine if overtaking or defending
        if (minDistance < 20) {
            // Check if opponent is ahead or behind
            const toOpponent = new CANNON.Vec3();
            toOpponent.copy(nearest.carBody.position);
            toOpponent.vsub(this.carBody.position, toOpponent);
            
            const forward = new CANNON.Vec3(0, 0, 1);
            this.carBody.quaternion.vmult(forward, forward);
            
            const dot = toOpponent.dot(forward);
            
            if (dot > 0) {
                // Opponent ahead - try to overtake
                this.state.isOvertaking = true;
                this.state.defendingPosition = false;
            } else {
                // Opponent behind - defend position
                this.state.isOvertaking = false;
                this.state.defendingPosition = true;
            }
        } else {
            this.state.isOvertaking = false;
            this.state.defendingPosition = false;
        }
    }

    /**
     * Update racing strategy
     */
    updateStrategy(deltaTime) {
        // Adjust aggressiveness based on race situation
        if (this.state.isOvertaking) {
            // More aggressive when overtaking
            this.config.aggressiveness = Math.min(
                1.0,
                this.difficulty.aggressiveness + 0.2
            );
        } else if (this.state.defendingPosition) {
            // Slightly defensive
            this.config.aggressiveness = Math.max(
                0.3,
                this.difficulty.aggressiveness - 0.1
            );
        } else {
            // Normal racing
            this.config.aggressiveness = this.difficulty.aggressiveness;
        }
    }

    /**
     * Calculate throttle, brake, and steering inputs
     */
    calculateControls(deltaTime) {
        // Get target point ahead on racing line
        const lookaheadIndex = (this.racingLine.currentTarget + this.racingLine.lookahead) % 
            this.racingLine.points.length;
        const targetPoint = this.racingLine.points[lookaheadIndex];
        
        // Calculate steering
        this.state.steering = this.calculateSteering(targetPoint);
        
        // Calculate speed control
        this.state.currentSpeed = this.carBody.velocity.length() * 3.6; // km/h
        this.state.targetSpeed = targetPoint.targetSpeed;
        
        // Adjust target speed for overtaking
        if (this.state.isOvertaking && this.state.distanceToOpponent < 15) {
            this.state.targetSpeed *= 1.1; // Push harder
        }
        
        // Throttle and brake
        const speedDiff = this.state.targetSpeed - this.state.currentSpeed;
        
        if (speedDiff > 5) {
            // Need to accelerate
            this.state.throttle = Math.min(1.0, speedDiff / 50);
            this.state.brake = 0;
        } else if (speedDiff < -5) {
            // Need to brake
            this.state.throttle = 0;
            this.state.brake = Math.min(1.0, Math.abs(speedDiff) / 50);
        } else {
            // Maintain speed
            this.state.throttle = 0.3;
            this.state.brake = 0;
        }
        
        // Overtaking maneuver
        if (this.state.isOvertaking && this.state.distanceToOpponent < 10) {
            this.performOvertake(targetPoint);
        }
    }

    /**
     * Calculate steering angle to target point
     */
    calculateSteering(targetPoint) {
        // Vector to target
        const toTarget = new THREE.Vector3().subVectors(
            targetPoint.position,
            new THREE.Vector3(
                this.carBody.position.x,
                this.carBody.position.y,
                this.carBody.position.z
            )
        );
        
        // Forward direction of car
        const forward = new THREE.Vector3(0, 0, 1);
        const carQuat = new THREE.Quaternion(
            this.carBody.quaternion.x,
            this.carBody.quaternion.y,
            this.carBody.quaternion.z,
            this.carBody.quaternion.w
        );
        forward.applyQuaternion(carQuat);
        
        // Calculate angle
        const angle = Math.atan2(
            forward.x * toTarget.z - forward.z * toTarget.x,
            forward.x * toTarget.x + forward.z * toTarget.z
        );
        
        // Apply skill factor
        const steering = angle * this.difficulty.corneringSkill;
        
        // Clamp steering
        return Math.max(-1, Math.min(1, steering * 3));
    }

    /**
     * Perform overtaking maneuver
     */
    performOvertake(targetPoint) {
        if (!this.state.nearestOpponent) return;
        
        // Calculate overtaking line (move to side)
        const perpendicular = new THREE.Vector3(
            -targetPoint.direction.z,
            0,
            targetPoint.direction.x
        );
        
        // Choose side based on track width and opponent position
        const offset = this.config.aggressiveness * 3;
        const side = Math.random() > 0.5 ? 1 : -1;
        
        // Adjust target position
        targetPoint.position.add(perpendicular.multiplyScalar(offset * side));
    }

    /**
     * Apply calculated controls to car
     */
    applyControls(deltaTime) {
        // Apply throttle (forward force)
        if (this.state.throttle > 0) {
            const force = new CANNON.Vec3(0, 0, this.state.throttle * 5000);
            this.carBody.quaternion.vmult(force, force);
            this.carBody.applyForce(force, this.carBody.position);
        }
        
        // Apply brake (damping)
        if (this.state.brake > 0) {
            this.carBody.velocity.scale(1 - this.state.brake * 0.1, this.carBody.velocity);
        }
        
        // Apply steering (torque)
        const torque = new CANNON.Vec3(0, this.state.steering * 2000, 0);
        this.carBody.applyTorque(torque);
    }

    /**
     * Simulate driver mistakes based on skill
     */
    simulateMistakes(deltaTime) {
        // Random chance of mistake
        if (Math.random() < this.difficulty.mistakeChance * deltaTime) {
            this.makeMistake();
        }
    }

    /**
     * Make a driving mistake
     */
    makeMistake() {
        const mistakes = [
            'brake_late',
            'miss_apex',
            'oversteer',
            'understeer'
        ];
        
        const mistake = mistakes[Math.floor(Math.random() * mistakes.length)];
        
        switch (mistake) {
            case 'brake_late':
                // Brake too late for corner
                this.state.targetSpeed *= 1.2;
                break;
                
            case 'miss_apex':
                // Miss the apex by going wide
                const currentPoint = this.racingLine.points[this.racingLine.currentTarget];
                if (currentPoint && currentPoint.position) {
                    const perpendicular = new THREE.Vector3(
                        -currentPoint.direction.z,
                        0,
                        currentPoint.direction.x
                    );
                    currentPoint.position.add(perpendicular.multiplyScalar(2));
                }
                break;
                
            case 'oversteer':
                // Turn too much
                this.state.steering *= 1.3;
                break;
                
            case 'understeer':
                // Turn too little
                this.state.steering *= 0.7;
                break;
        }
        
        this.state.mistakes++;
    }

    /**
     * Set AI difficulty
     */
    setDifficulty(difficulty) {
        if (this.difficultySettings[difficulty]) {
            this.config.difficulty = difficulty;
            this.difficulty = this.difficultySettings[difficulty];
            
            // Recalculate racing line with new skill
            this.calculateRacingLine();
            
            console.log(`AI difficulty set to: ${difficulty}`);
        }
    }

    /**
     * Get AI telemetry
     */
    getTelemetry() {
        return {
            name: this.config.name,
            difficulty: this.config.difficulty,
            speed: Math.round(this.state.currentSpeed),
            targetSpeed: Math.round(this.state.targetSpeed),
            throttle: Math.round(this.state.throttle * 100),
            brake: Math.round(this.state.brake * 100),
            steering: this.state.steering.toFixed(2),
            isOvertaking: this.state.isOvertaking,
            defendingPosition: this.state.defendingPosition,
            mistakes: this.state.mistakes,
            distanceToOpponent: Math.round(this.state.distanceToOpponent)
        };
    }

    /**
     * Reset AI state
     */
    reset() {
        this.state.throttle = 0;
        this.state.brake = 0;
        this.state.steering = 0;
        this.state.mistakes = 0;
        this.state.isOvertaking = false;
        this.state.defendingPosition = false;
        this.racingLine.currentTarget = 0;
    }
}

/**
 * AIManager - Manages multiple AI opponents
 */
class AIManager {
    constructor(trackData) {
        this.trackData = trackData;
        this.aiDrivers = [];
    }

    /**
     * Create AI opponents
     */
    createOpponents(count, difficulties = ['easy', 'medium', 'hard']) {
        const names = [
            'Alex Martinez', 'Jordan Smith', 'Chris Johnson', 'Morgan Lee',
            'Taylor Davis', 'Jamie Wilson', 'Casey Brown', 'Riley Anderson',
            'Quinn Thomas', 'Sage Jackson', 'River White', 'Phoenix Garcia'
        ];
        
        for (let i = 0; i < count; i++) {
            const difficulty = difficulties[i % difficulties.length];
            const name = names[i % names.length];
            
            // Create car body and mesh (simplified - would use actual car creation)
            const carBody = new CANNON.Body({
                mass: 1200,
                shape: new CANNON.Box(new CANNON.Vec3(1, 0.5, 2))
            });
            
            const carMesh = new THREE.Mesh(
                new THREE.BoxGeometry(2, 1, 4),
                new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff })
            );
            
            const ai = new AdvancedAI(carBody, carMesh, this.trackData, {
                difficulty: difficulty,
                name: name,
                carNumber: i + 2
            });
            
            this.aiDrivers.push({
                ai: ai,
                body: carBody,
                mesh: carMesh
            });
        }
        
        console.log(`✅ ${count} AI opponents created`);
        return this.aiDrivers;
    }

    /**
     * Update all AI
     */
    update(deltaTime) {
        // Collect all opponents for awareness
        const allAI = this.aiDrivers.map(driver => driver.ai);
        
        // Update each AI
        this.aiDrivers.forEach(driver => {
            driver.ai.update(deltaTime, allAI);
        });
    }

    /**
     * Get AI standings
     */
    getStandings() {
        // Sort by lap progress (simplified)
        return this.aiDrivers
            .map(driver => ({
                name: driver.ai.config.name,
                number: driver.ai.config.carNumber,
                difficulty: driver.ai.config.difficulty,
                mistakes: driver.ai.state.mistakes
            }))
            .sort((a, b) => a.mistakes - b.mistakes);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AdvancedAI, AIManager };
}
