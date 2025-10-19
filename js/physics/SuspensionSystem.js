/**
 * SuspensionSystem.js
 * Advanced suspension system with independent springs, dampers, and anti-roll bars
 * Provides realistic weight transfer and body roll during racing
 */

class SuspensionSystem {
    constructor(carBody, wheelPositions) {
        this.carBody = carBody;
        this.wheelPositions = wheelPositions; // Array of wheel positions relative to car
        this.suspensions = [];
        
        // Suspension parameters (tunable)
        this.config = {
            springStiffness: 35000,      // N/m - Higher = stiffer suspension
            damperStrength: 3500,        // Ns/m - Controls oscillation damping
            restLength: 0.35,            // meters - Suspension travel
            maxCompression: 0.15,        // meters - Maximum compression
            maxExtension: 0.20,          // meters - Maximum extension
            antiRollBarStiffness: 5000,  // N/m - Reduces body roll
            wheelMass: 20,               // kg - Unsprung mass per wheel
            
            // Advanced settings
            bumpStiffness: 1.0,          // Multiplier for compression damping
            reboundStiffness: 1.2,       // Multiplier for rebound damping
            progressiveRate: 1.5         // Progressive spring rate multiplier
        };
        
        this.initialize();
    }

    /**
     * Initialize suspension for each wheel
     */
    initialize() {
        this.wheelPositions.forEach((pos, index) => {
            const suspension = {
                index: index,
                position: pos.clone(),
                currentLength: this.config.restLength,
                previousLength: this.config.restLength,
                velocity: 0,
                force: new CANNON.Vec3(),
                compressionRatio: 0,
                isFront: index < 2, // First two are front wheels
                isLeft: index % 2 === 0,
                
                // Wheel contact info
                isGrounded: false,
                groundNormal: new CANNON.Vec3(0, 1, 0),
                contactPoint: new CANNON.Vec3()
            };
            
            this.suspensions.push(suspension);
        });
        
        console.log('✅ Suspension system initialized');
        console.log(`   - Wheels: ${this.suspensions.length}`);
        console.log(`   - Spring rate: ${this.config.springStiffness} N/m`);
        console.log(`   - Damper: ${this.config.damperStrength} Ns/m`);
    }

    /**
     * Ray cast from car to ground for each wheel
     */
    rayCastWheels(world) {
        const from = new CANNON.Vec3();
        const to = new CANNON.Vec3();
        const result = new CANNON.RaycastResult();
        
        this.suspensions.forEach(susp => {
            // Get wheel position in world space
            const worldPos = new CANNON.Vec3(
                susp.position.x,
                susp.position.y,
                susp.position.z
            );
            this.carBody.vectorToWorldFrame(worldPos, worldPos);
            worldPos.vadd(this.carBody.position, from);
            
            // Ray cast downward
            to.copy(from);
            to.y -= (this.config.restLength + this.config.maxExtension);
            
            // Perform ray cast
            result.reset();
            world.raycastClosest(from, to, {
                collisionFilterMask: -1,
                skipBackfaces: true
            }, result);
            
            if (result.hasHit) {
                susp.isGrounded = true;
                susp.currentLength = result.distance;
                susp.groundNormal.copy(result.hitNormalWorld);
                susp.contactPoint.copy(result.hitPointWorld);
            } else {
                susp.isGrounded = false;
                susp.currentLength = this.config.restLength + this.config.maxExtension;
            }
        });
    }

    /**
     * Calculate and apply suspension forces
     */
    update(deltaTime, world) {
        if (deltaTime <= 0 || deltaTime > 0.1) return;
        
        // Ray cast to find ground
        this.rayCastWheels(world);
        
        // Calculate forces for each suspension
        this.suspensions.forEach(susp => {
            if (!susp.isGrounded) {
                susp.force.set(0, 0, 0);
                susp.compressionRatio = 0;
                return;
            }
            
            // Calculate compression/extension
            const displacement = this.config.restLength - susp.currentLength;
            susp.compressionRatio = displacement / this.config.restLength;
            
            // Clamp to limits
            const clampedDisplacement = Math.max(
                -this.config.maxExtension,
                Math.min(this.config.maxCompression, displacement)
            );
            
            // Calculate suspension velocity
            susp.velocity = (susp.currentLength - susp.previousLength) / deltaTime;
            susp.previousLength = susp.currentLength;
            
            // Spring force (with progressive rate for realism)
            let springForce = clampedDisplacement * this.config.springStiffness;
            
            // Progressive spring rate (gets stiffer under compression)
            if (clampedDisplacement > 0) {
                const progressiveFactor = 1 + (susp.compressionRatio * this.config.progressiveRate);
                springForce *= progressiveFactor;
            }
            
            // Damper force (different for bump and rebound)
            let damperForce = 0;
            if (susp.velocity < 0) {
                // Compression (bump)
                damperForce = -susp.velocity * this.config.damperStrength * this.config.bumpStiffness;
            } else {
                // Extension (rebound)
                damperForce = -susp.velocity * this.config.damperStrength * this.config.reboundStiffness;
            }
            
            // Total suspension force
            const totalForce = springForce + damperForce;
            
            // Apply force in direction of ground normal
            susp.force.copy(susp.groundNormal);
            susp.force.scale(totalForce, susp.force);
            
            // Apply force to car body at wheel position
            const worldWheelPos = new CANNON.Vec3();
            this.carBody.vectorToWorldFrame(susp.position, worldWheelPos);
            worldWheelPos.vadd(this.carBody.position, worldWheelPos);
            
            this.carBody.applyForce(susp.force, worldWheelPos);
        });
        
        // Apply anti-roll bar forces
        this.applyAntiRollBar();
    }

    /**
     * Apply anti-roll bar to reduce body roll in corners
     */
    applyAntiRollBar() {
        // Front anti-roll bar
        const frontLeft = this.suspensions[0];
        const frontRight = this.suspensions[1];
        
        if (frontLeft.isGrounded && frontRight.isGrounded) {
            const rollAngle = frontLeft.compressionRatio - frontRight.compressionRatio;
            const antiRollForce = rollAngle * this.config.antiRollBarStiffness;
            
            // Apply opposite forces to reduce roll
            const forceVec = new CANNON.Vec3(0, antiRollForce, 0);
            
            const leftPos = new CANNON.Vec3();
            const rightPos = new CANNON.Vec3();
            this.carBody.vectorToWorldFrame(frontLeft.position, leftPos);
            this.carBody.vectorToWorldFrame(frontRight.position, rightPos);
            leftPos.vadd(this.carBody.position, leftPos);
            rightPos.vadd(this.carBody.position, rightPos);
            
            this.carBody.applyForce(forceVec, leftPos);
            this.carBody.applyForce(forceVec.negate(), rightPos);
        }
        
        // Rear anti-roll bar
        const rearLeft = this.suspensions[2];
        const rearRight = this.suspensions[3];
        
        if (rearLeft.isGrounded && rearRight.isGrounded) {
            const rollAngle = rearLeft.compressionRatio - rearRight.compressionRatio;
            const antiRollForce = rollAngle * this.config.antiRollBarStiffness * 0.8; // Slightly softer rear
            
            const forceVec = new CANNON.Vec3(0, antiRollForce, 0);
            
            const leftPos = new CANNON.Vec3();
            const rightPos = new CANNON.Vec3();
            this.carBody.vectorToWorldFrame(rearLeft.position, leftPos);
            this.carBody.vectorToWorldFrame(rearRight.position, rightPos);
            leftPos.vadd(this.carBody.position, leftPos);
            rightPos.vadd(this.carBody.position, rightPos);
            
            this.carBody.applyForce(forceVec, leftPos);
            this.carBody.applyForce(forceVec.negate(), rightPos);
        }
    }

    /**
     * Tune suspension for different setups
     */
    setSuspensionPreset(preset) {
        const presets = {
            comfort: {
                springStiffness: 25000,
                damperStrength: 2500,
                antiRollBarStiffness: 3000,
                bumpStiffness: 0.9,
                reboundStiffness: 1.1
            },
            sport: {
                springStiffness: 35000,
                damperStrength: 3500,
                antiRollBarStiffness: 5000,
                bumpStiffness: 1.0,
                reboundStiffness: 1.2
            },
            race: {
                springStiffness: 50000,
                damperStrength: 5000,
                antiRollBarStiffness: 8000,
                bumpStiffness: 1.2,
                reboundStiffness: 1.5
            },
            drift: {
                springStiffness: 30000,
                damperStrength: 3000,
                antiRollBarStiffness: 2000,
                bumpStiffness: 0.8,
                reboundStiffness: 1.0
            }
        };
        
        const config = presets[preset];
        if (config) {
            Object.assign(this.config, config);
            console.log(`Suspension preset: ${preset}`);
        }
    }

    /**
     * Adjust individual suspension parameters
     */
    adjustParameter(param, value) {
        if (this.config.hasOwnProperty(param)) {
            this.config[param] = value;
            console.log(`${param} set to ${value}`);
        }
    }

    /**
     * Get suspension telemetry data
     */
    getTelemetry() {
        return {
            frontLeft: {
                compression: this.suspensions[0].compressionRatio,
                velocity: this.suspensions[0].velocity,
                grounded: this.suspensions[0].isGrounded
            },
            frontRight: {
                compression: this.suspensions[1].compressionRatio,
                velocity: this.suspensions[1].velocity,
                grounded: this.suspensions[1].isGrounded
            },
            rearLeft: {
                compression: this.suspensions[2].compressionRatio,
                velocity: this.suspensions[2].velocity,
                grounded: this.suspensions[2].isGrounded
            },
            rearRight: {
                compression: this.suspensions[3].compressionRatio,
                velocity: this.suspensions[3].velocity,
                grounded: this.suspensions[3].isGrounded
            }
        };
    }

    /**
     * Get visual data for wheel positioning
     */
    getWheelData() {
        return this.suspensions.map(susp => ({
            position: susp.position.clone(),
            compression: susp.compressionRatio,
            verticalOffset: this.config.restLength - susp.currentLength,
            isGrounded: susp.isGrounded
        }));
    }

    /**
     * Reset suspension to rest state
     */
    reset() {
        this.suspensions.forEach(susp => {
            susp.currentLength = this.config.restLength;
            susp.previousLength = this.config.restLength;
            susp.velocity = 0;
            susp.force.set(0, 0, 0);
            susp.compressionRatio = 0;
            susp.isGrounded = false;
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SuspensionSystem;
}
