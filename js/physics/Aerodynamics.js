/**
 * Aerodynamics.js
 * Simulates aerodynamic forces: drag, downforce, and lift
 * Critical for high-speed racing realism
 */

class Aerodynamics {
    constructor(carBody) {
        this.carBody = carBody;
        
        // Aerodynamic coefficients
        this.coefficients = {
            dragCoefficient: 0.30,      // Cd - Lower = more streamlined
            liftCoefficient: -0.15,     // Cl - Negative = downforce
            frontalArea: 2.2,           // m² - Cross-sectional area
            airDensity: 1.225,          // kg/m³ - Sea level
            
            // Distribution (percentage)
            frontDownforce: 0.40,       // 40% front
            rearDownforce: 0.60,        // 60% rear
            
            // DRS (Drag Reduction System)
            drsActive: false,
            drsReduction: 0.15          // Drag reduction when active
        };
        
        // Configuration presets
        this.presets = {
            topSpeed: {
                dragCoefficient: 0.25,
                liftCoefficient: -0.10,
                description: "Maximum speed, less downforce"
            },
            balanced: {
                dragCoefficient: 0.30,
                liftCoefficient: -0.15,
                description: "Balanced speed and grip"
            },
            downforce: {
                dragCoefficient: 0.35,
                liftCoefficient: -0.25,
                description: "Maximum grip, slower top speed"
            }
        };
        
        // Current forces
        this.forces = {
            drag: new CANNON.Vec3(),
            downforce: new CANNON.Vec3(),
            total: new CANNON.Vec3()
        };
        
        console.log('✅ Aerodynamics initialized');
        console.log(`   - Drag coefficient: ${this.coefficients.dragCoefficient}`);
        console.log(`   - Downforce coefficient: ${this.coefficients.liftCoefficient}`);
    }

    /**
     * Calculate aerodynamic forces
     */
    update(deltaTime) {
        const velocity = this.carBody.velocity;
        const speed = velocity.length();
        
        if (speed < 1) {
            this.forces.drag.set(0, 0, 0);
            this.forces.downforce.set(0, 0, 0);
            this.forces.total.set(0, 0, 0);
            return;
        }
        
        // Calculate drag force: F = 0.5 * ρ * v² * Cd * A
        const dragCoeff = this.coefficients.drsActive ? 
            this.coefficients.dragCoefficient * (1 - this.coefficients.drsReduction) :
            this.coefficients.dragCoefficient;
            
        const dragMagnitude = 0.5 * this.coefficients.airDensity * 
            speed * speed * dragCoeff * this.coefficients.frontalArea;
        
        // Drag opposes velocity
        this.forces.drag.copy(velocity);
        this.forces.drag.normalize();
        this.forces.drag.scale(-dragMagnitude, this.forces.drag);
        
        // Calculate downforce: F = 0.5 * ρ * v² * Cl * A
        const downforceMagnitude = 0.5 * this.coefficients.airDensity * 
            speed * speed * Math.abs(this.coefficients.liftCoefficient) * 
            this.coefficients.frontalArea;
        
        // Downforce pushes car down
        this.forces.downforce.set(0, -downforceMagnitude, 0);
        
        // Apply drag to center of mass
        this.carBody.applyForce(this.forces.drag, this.carBody.position);
        
        // Apply downforce distributed front/rear for pitch control
        const frontForce = downforceMagnitude * this.coefficients.frontDownforce;
        const rearForce = downforceMagnitude * this.coefficients.rearDownforce;
        
        const frontPos = new CANNON.Vec3(0, 0, 1.5);
        const rearPos = new CANNON.Vec3(0, 0, -1.5);
        
        this.carBody.vectorToWorldFrame(frontPos, frontPos);
        this.carBody.vectorToWorldFrame(rearPos, rearPos);
        frontPos.vadd(this.carBody.position, frontPos);
        rearPos.vadd(this.carBody.position, rearPos);
        
        this.carBody.applyForce(new CANNON.Vec3(0, -frontForce, 0), frontPos);
        this.carBody.applyForce(new CANNON.Vec3(0, -rearForce, 0), rearPos);
        
        // Total force for telemetry
        this.forces.total.copy(this.forces.drag);
        this.forces.total.vadd(this.forces.downforce, this.forces.total);
    }

    /**
     * Set aerodynamic preset
     */
    setPreset(preset) {
        const config = this.presets[preset];
        if (config) {
            this.coefficients.dragCoefficient = config.dragCoefficient;
            this.coefficients.liftCoefficient = config.liftCoefficient;
            console.log(`Aero setup: ${preset} - ${config.description}`);
        }
    }

    /**
     * Toggle DRS (Drag Reduction System)
     */
    toggleDRS(active) {
        this.coefficients.drsActive = active;
        console.log(`DRS: ${active ? 'Active' : 'Inactive'}`);
    }

    /**
     * Adjust downforce balance
     */
    setDownforceBalance(frontPercentage) {
        this.coefficients.frontDownforce = frontPercentage / 100;
        this.coefficients.rearDownforce = 1 - this.coefficients.frontDownforce;
        console.log(`Downforce balance: ${frontPercentage}% front`);
    }

    /**
     * Get telemetry
     */
    getTelemetry() {
        return {
            drag: Math.round(this.forces.drag.length()),
            downforce: Math.round(Math.abs(this.forces.downforce.y)),
            drsActive: this.coefficients.drsActive,
            balance: `${Math.round(this.coefficients.frontDownforce * 100)}/${Math.round(this.coefficients.rearDownforce * 100)}`
        };
    }
}

/**
 * DamageSystem.js
 * Visual and performance damage simulation
 */
class DamageSystem {
    constructor(carMesh, carBody) {
        this.carMesh = carMesh;
        this.carBody = carBody;
        
        // Damage state
        this.damage = {
            front: 0,        // 0-1 (0 = pristine, 1 = destroyed)
            rear: 0,
            leftSide: 0,
            rightSide: 0,
            engine: 0,
            suspension: 0,
            aerodynamics: 0
        };
        
        // Performance impact
        this.performanceMultipliers = {
            power: 1.0,
            handling: 1.0,
            topSpeed: 1.0,
            downforce: 1.0
        };
        
        // Damage thresholds
        this.thresholds = {
            minorDamage: 20,      // Impact force (m/s)
            majorDamage: 40,
            criticalDamage: 60
        };
        
        // Visual damage
        this.deformations = [];
        
        console.log('✅ Damage system initialized');
    }

    /**
     * Apply damage from collision
     */
    applyCollisionDamage(collisionPoint, impactVelocity, normal) {
        const impactSpeed = impactVelocity.length();
        
        if (impactSpeed < this.thresholds.minorDamage) return;
        
        // Calculate damage amount
        let damageAmount = 0;
        if (impactSpeed < this.thresholds.majorDamage) {
            damageAmount = 0.05; // Minor
        } else if (impactSpeed < this.thresholds.criticalDamage) {
            damageAmount = 0.15; // Major
        } else {
            damageAmount = 0.30; // Critical
        }
        
        // Determine which part was hit
        const localPoint = new CANNON.Vec3();
        this.carBody.pointToLocalFrame(collisionPoint, localPoint);
        
        // Front damage
        if (localPoint.z > 1.5) {
            this.damage.front = Math.min(1.0, this.damage.front + damageAmount);
            this.damage.aerodynamics = Math.min(1.0, this.damage.aerodynamics + damageAmount * 0.5);
        }
        // Rear damage
        else if (localPoint.z < -1.5) {
            this.damage.rear = Math.min(1.0, this.damage.rear + damageAmount);
            this.damage.engine = Math.min(1.0, this.damage.engine + damageAmount * 0.3);
        }
        // Left side
        else if (localPoint.x < -0.5) {
            this.damage.leftSide = Math.min(1.0, this.damage.leftSide + damageAmount);
            this.damage.suspension = Math.min(1.0, this.damage.suspension + damageAmount * 0.4);
        }
        // Right side
        else if (localPoint.x > 0.5) {
            this.damage.rightSide = Math.min(1.0, this.damage.rightSide + damageAmount);
            this.damage.suspension = Math.min(1.0, this.damage.suspension + damageAmount * 0.4);
        }
        
        // Update performance
        this.updatePerformance();
        
        // Apply visual deformation
        this.applyVisualDamage(localPoint, damageAmount);
        
        console.log(`💥 Collision damage: ${Math.round(damageAmount * 100)}%`);
    }

    /**
     * Update performance multipliers based on damage
     */
    updatePerformance() {
        // Engine damage reduces power
        this.performanceMultipliers.power = 1.0 - (this.damage.engine * 0.5);
        
        // Suspension damage affects handling
        this.performanceMultipliers.handling = 1.0 - (this.damage.suspension * 0.6);
        
        // Aero damage reduces top speed and downforce
        this.performanceMultipliers.topSpeed = 1.0 - (this.damage.aerodynamics * 0.3);
        this.performanceMultipliers.downforce = 1.0 - (this.damage.aerodynamics * 0.5);
    }

    /**
     * Apply visual deformation (simplified)
     */
    applyVisualDamage(localPoint, amount) {
        // Store deformation data
        this.deformations.push({
            point: localPoint.clone(),
            amount: amount
        });
        
        // In a full implementation, this would deform the mesh vertices
        // For now, we just track it for potential particle effects
    }

    /**
     * Get performance multiplier
     */
    getPerformanceMultiplier(type) {
        return this.performanceMultipliers[type] || 1.0;
    }

    /**
     * Get total damage percentage
     */
    getTotalDamage() {
        const totalDamage = Object.values(this.damage).reduce((a, b) => a + b, 0);
        return (totalDamage / Object.keys(this.damage).length) * 100;
    }

    /**
     * Get telemetry
     */
    getTelemetry() {
        return {
            total: Math.round(this.getTotalDamage()),
            front: Math.round(this.damage.front * 100),
            rear: Math.round(this.damage.rear * 100),
            engine: Math.round(this.damage.engine * 100),
            suspension: Math.round(this.damage.suspension * 100),
            performance: {
                power: Math.round(this.performanceMultipliers.power * 100),
                handling: Math.round(this.performanceMultipliers.handling * 100),
                topSpeed: Math.round(this.performanceMultipliers.topSpeed * 100)
            }
        };
    }

    /**
     * Repair damage
     */
    repair(amount = 1.0) {
        Object.keys(this.damage).forEach(part => {
            this.damage[part] = Math.max(0, this.damage[part] - amount);
        });
        this.updatePerformance();
        this.deformations = [];
        console.log(`🔧 Repaired ${Math.round(amount * 100)}% damage`);
    }

    /**
     * Reset all damage
     */
    reset() {
        Object.keys(this.damage).forEach(part => {
            this.damage[part] = 0;
        });
        this.updatePerformance();
        this.deformations = [];
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Aerodynamics, DamageSystem };
}
