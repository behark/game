/**
 * TirePhysics.js
 * Advanced tire model using simplified Pacejka Magic Formula
 * Handles grip, slip angles, tire temperature, and wear
 */

class TirePhysics {
    constructor() {
        // Pacejka Magic Formula coefficients
        this.pacejkaCoeffs = {
            // Lateral (cornering) force
            lateral: {
                B: 10.0,  // Stiffness factor
                C: 1.9,   // Shape factor
                D: 1.0,   // Peak value
                E: 0.97   // Curvature factor
            },
            // Longitudinal (acceleration/braking) force
            longitudinal: {
                B: 12.0,
                C: 2.4,
                D: 1.0,
                E: 0.95
            }
        };
        
        // Tire properties
        this.properties = {
            maxGrip: 1.5,              // Maximum grip multiplier
            optimalTemp: 85,           // Optimal temperature (°C)
            currentTemp: 20,           // Current temperature (°C)
            wearLevel: 0,              // 0-1 (0 = new, 1 = worn out)
            pressure: 2.2,             // bar
            optimalPressure: 2.2,      // bar
            
            // Compound type
            compound: 'soft',          // soft, medium, hard
            
            // Surface grip factors
            surfaceGrip: {
                asphalt: 1.0,
                concrete: 0.95,
                grass: 0.3,
                dirt: 0.5,
                wet: 0.6,
                ice: 0.1
            }
        };
        
        // Tire state
        this.state = {
            slipAngle: 0,              // degrees
            slipRatio: 0,              // 0-1
            load: 0,                   // Normal force (N)
            lateralForce: 0,           // N
            longitudinalForce: 0,      // N
            isSlipping: false,
            isSkidding: false
        };
        
        // Temperature simulation
        this.tempSimulation = {
            ambientTemp: 20,
            heatGenerationRate: 0.5,
            coolingRate: 0.2,
            maxTempIncrease: 120
        };
        
        // Wear simulation
        this.wearSimulation = {
            baseWearRate: 0.00001,     // Per second
            slipWearMultiplier: 5.0,
            lockupWearMultiplier: 10.0
        };
        
        this.initialize();
    }

    /**
     * Initialize tire physics
     */
    initialize() {
        this.setCompound(this.properties.compound);
        console.log('✅ Tire physics initialized');
        console.log(`   - Compound: ${this.properties.compound}`);
        console.log(`   - Max grip: ${this.properties.maxGrip}`);
        console.log(`   - Temperature: ${this.properties.currentTemp}°C`);
    }

    /**
     * Pacejka Magic Formula
     * Calculates tire force based on slip
     */
    pacejkaFormula(slip, coeffs, load) {
        const { B, C, D, E } = coeffs;
        
        // Normalize load (assume 4000N as reference)
        const loadFactor = Math.sqrt(Math.max(0, load) / 4000);
        
        const x = slip;
        const y = D * loadFactor * Math.sin(C * Math.atan(B * x - E * (B * x - Math.atan(B * x))));
        
        return y;
    }

    /**
     * Calculate lateral (cornering) force
     */
    calculateLateralForce(slipAngle, load, surface = 'asphalt') {
        // Convert to radians
        const slipAngleRad = (slipAngle * Math.PI) / 180;
        
        // Get base force from Pacejka formula
        let force = this.pacejkaFormula(slipAngleRad, this.pacejkaCoeffs.lateral, load);
        
        // Apply grip multipliers
        force *= this.properties.maxGrip;
        force *= this.getTemperatureGripFactor();
        force *= this.getWearGripFactor();
        force *= this.getPressureGripFactor();
        force *= this.properties.surfaceGrip[surface] || 1.0;
        
        // Store state
        this.state.slipAngle = slipAngle;
        this.state.lateralForce = force * load;
        this.state.isSlipping = Math.abs(slipAngle) > 8;
        
        return this.state.lateralForce;
    }

    /**
     * Calculate longitudinal (acceleration/braking) force
     */
    calculateLongitudinalForce(slipRatio, load, surface = 'asphalt') {
        // Clamp slip ratio
        const clampedSlip = Math.max(-1, Math.min(1, slipRatio));
        
        // Get base force from Pacejka formula
        let force = this.pacejkaFormula(clampedSlip, this.pacejkaCoeffs.longitudinal, load);
        
        // Apply grip multipliers
        force *= this.properties.maxGrip;
        force *= this.getTemperatureGripFactor();
        force *= this.getWearGripFactor();
        force *= this.getPressureGripFactor();
        force *= this.properties.surfaceGrip[surface] || 1.0;
        
        // Store state
        this.state.slipRatio = clampedSlip;
        this.state.longitudinalForce = force * load;
        this.state.isSkidding = Math.abs(clampedSlip) > 0.15;
        
        return this.state.longitudinalForce;
    }

    /**
     * Combined slip (circle of friction)
     */
    calculateCombinedForce(slipAngle, slipRatio, load, surface = 'asphalt') {
        const lateral = this.calculateLateralForce(slipAngle, load, surface);
        const longitudinal = this.calculateLongitudinalForce(slipRatio, load, surface);
        
        // Combined friction circle limit
        const maxForce = this.properties.maxGrip * load;
        const combinedForce = Math.sqrt(lateral * lateral + longitudinal * longitudinal);
        
        if (combinedForce > maxForce) {
            // Scale down forces to stay within friction circle
            const scale = maxForce / combinedForce;
            return {
                lateral: lateral * scale,
                longitudinal: longitudinal * scale,
                total: maxForce
            };
        }
        
        return {
            lateral: lateral,
            longitudinal: longitudinal,
            total: combinedForce
        };
    }

    /**
     * Temperature-based grip factor
     */
    getTemperatureGripFactor() {
        const temp = this.properties.currentTemp;
        const optimal = this.properties.optimalTemp;
        
        // Parabolic falloff from optimal temperature
        const tempDiff = Math.abs(temp - optimal);
        const factor = 1.0 - (tempDiff / 100) * 0.5;
        
        return Math.max(0.5, Math.min(1.0, factor));
    }

    /**
     * Wear-based grip factor
     */
    getWearGripFactor() {
        // Linear grip loss with wear
        return 1.0 - (this.properties.wearLevel * 0.3);
    }

    /**
     * Pressure-based grip factor
     */
    getPressureGripFactor() {
        const pressureDiff = Math.abs(this.properties.pressure - this.properties.optimalPressure);
        const factor = 1.0 - (pressureDiff / this.properties.optimalPressure) * 0.1;
        
        return Math.max(0.9, Math.min(1.0, factor));
    }

    /**
     * Update tire temperature
     */
    updateTemperature(deltaTime, speed, isSlipping) {
        const heatGeneration = this.tempSimulation.heatGenerationRate * speed / 100;
        const slipHeat = isSlipping ? heatGeneration * 3.0 : heatGeneration;
        
        // Increase temperature from friction
        this.properties.currentTemp += slipHeat * deltaTime;
        
        // Cool down toward ambient
        const tempDiff = this.properties.currentTemp - this.tempSimulation.ambientTemp;
        const cooling = tempDiff * this.tempSimulation.coolingRate * deltaTime;
        this.properties.currentTemp -= cooling;
        
        // Clamp temperature
        this.properties.currentTemp = Math.max(
            this.tempSimulation.ambientTemp,
            Math.min(
                this.tempSimulation.ambientTemp + this.tempSimulation.maxTempIncrease,
                this.properties.currentTemp
            )
        );
    }

    /**
     * Update tire wear
     */
    updateWear(deltaTime, isSlipping, isSkidding) {
        let wearRate = this.wearSimulation.baseWearRate;
        
        if (isSlipping) {
            wearRate *= this.wearSimulation.slipWearMultiplier;
        }
        
        if (isSkidding) {
            wearRate *= this.wearSimulation.lockupWearMultiplier;
        }
        
        this.properties.wearLevel += wearRate * deltaTime;
        this.properties.wearLevel = Math.min(1.0, this.properties.wearLevel);
    }

    /**
     * Update tire physics (called every frame)
     */
    update(deltaTime, speed, load) {
        this.state.load = load;
        
        // Update temperature
        this.updateTemperature(
            deltaTime,
            speed,
            this.state.isSlipping || this.state.isSkidding
        );
        
        // Update wear
        this.updateWear(
            deltaTime,
            this.state.isSlipping,
            this.state.isSkidding
        );
    }

    /**
     * Set tire compound
     */
    setCompound(compound) {
        this.properties.compound = compound;
        
        const compounds = {
            soft: {
                maxGrip: 1.6,
                optimalTemp: 90,
                wearRate: 2.0
            },
            medium: {
                maxGrip: 1.4,
                optimalTemp: 85,
                wearRate: 1.0
            },
            hard: {
                maxGrip: 1.2,
                optimalTemp: 80,
                wearRate: 0.5
            },
            wet: {
                maxGrip: 1.0,
                optimalTemp: 60,
                wearRate: 0.8
            },
            intermediate: {
                maxGrip: 1.15,
                optimalTemp: 70,
                wearRate: 1.2
            }
        };
        
        const config = compounds[compound];
        if (config) {
            this.properties.maxGrip = config.maxGrip;
            this.properties.optimalTemp = config.optimalTemp;
            this.wearSimulation.baseWearRate = 0.00001 * config.wearRate;
            
            console.log(`Tire compound: ${compound} (grip: ${config.maxGrip})`);
        }
    }

    /**
     * Set tire pressure
     */
    setPressure(pressure) {
        this.properties.pressure = Math.max(1.5, Math.min(3.0, pressure));
        console.log(`Tire pressure: ${this.properties.pressure.toFixed(1)} bar`);
    }

    /**
     * Get tire telemetry
     */
    getTelemetry() {
        return {
            temperature: Math.round(this.properties.currentTemp),
            wear: Math.round(this.properties.wearLevel * 100),
            pressure: this.properties.pressure.toFixed(1),
            slipAngle: this.state.slipAngle.toFixed(1),
            slipRatio: this.state.slipRatio.toFixed(3),
            grip: (this.getTemperatureGripFactor() * this.getWearGripFactor() * this.getPressureGripFactor() * 100).toFixed(0),
            isSlipping: this.state.isSlipping,
            isSkidding: this.state.isSkidding
        };
    }

    /**
     * Reset tire to new condition
     */
    reset() {
        this.properties.currentTemp = this.tempSimulation.ambientTemp;
        this.properties.wearLevel = 0;
        this.state.slipAngle = 0;
        this.state.slipRatio = 0;
        this.state.isSlipping = false;
        this.state.isSkidding = false;
    }
}

/**
 * TireSet - Manages all four tires
 */
class TireSet {
    constructor() {
        this.tires = {
            frontLeft: new TirePhysics(),
            frontRight: new TirePhysics(),
            rearLeft: new TirePhysics(),
            rearRight: new TirePhysics()
        };
    }

    /**
     * Update all tires
     */
    update(deltaTime, speed, loads) {
        Object.keys(this.tires).forEach(position => {
            this.tires[position].update(deltaTime, speed, loads[position] || 4000);
        });
    }

    /**
     * Set compound for all tires
     */
    setCompound(compound, position = 'all') {
        if (position === 'all') {
            Object.values(this.tires).forEach(tire => tire.setCompound(compound));
        } else if (this.tires[position]) {
            this.tires[position].setCompound(compound);
        }
    }

    /**
     * Set pressure for all tires
     */
    setPressure(pressure, position = 'all') {
        if (position === 'all') {
            Object.values(this.tires).forEach(tire => tire.setPressure(pressure));
        } else if (this.tires[position]) {
            this.tires[position].setPressure(pressure);
        }
    }

    /**
     * Get telemetry for all tires
     */
    getTelemetry() {
        const telemetry = {};
        Object.keys(this.tires).forEach(position => {
            telemetry[position] = this.tires[position].getTelemetry();
        });
        return telemetry;
    }

    /**
     * Reset all tires
     */
    reset() {
        Object.values(this.tires).forEach(tire => tire.reset());
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TirePhysics, TireSet };
}
