/**
 * WeatherSystem.js
 * Dynamic weather with rain, fog, snow, and environmental effects
 * Affects visibility, physics, and atmosphere
 */

class WeatherSystem {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        
        // Current weather state
        this.currentWeather = {
            type: 'clear', // clear, rain, fog, snow, storm
            intensity: 0.0, // 0-1
            transitionSpeed: 0.1,
            targetIntensity: 0.0
        };
        
        // Weather effects
        this.effects = {
            particles: null,
            skybox: null,
            fog: null,
            wetness: 0.0 // Track wetness 0-1
        };
        
        // Particle systems
        this.particleSystems = {
            rain: null,
            snow: null
        };
        
        // Physics modifiers
        this.physicsModifiers = {
            gripMultiplier: 1.0,
            dragMultiplier: 1.0,
            visibilityMultiplier: 1.0
        };
        
        this.initialize();
    }

    /**
     * Initialize weather systems
     */
    initialize() {
        this.createParticleSystems();
        this.setupFog();
        console.log('✅ Weather System initialized');
    }

    /**
     * Create particle systems for weather effects
     */
    createParticleSystems() {
        // Rain particle system
        this.particleSystems.rain = this.createRainSystem();
        
        // Snow particle system
        this.particleSystems.snow = this.createSnowSystem();
        
        // Initially hide all
        this.particleSystems.rain.visible = false;
        this.particleSystems.snow.visible = false;
    }

    /**
     * Create rain particle system
     */
    createRainSystem() {
        const particleCount = 5000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount);
        
        // Spawn area
        const spawnRadius = 100;
        
        for (let i = 0; i < particleCount; i++) {
            // Random position above camera
            positions[i * 3] = (Math.random() - 0.5) * spawnRadius;
            positions[i * 3 + 1] = Math.random() * 50 + 20;
            positions[i * 3 + 2] = (Math.random() - 0.5) * spawnRadius;
            
            // Random fall speed
            velocities[i] = Math.random() * 20 + 30;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 1));
        
        const material = new THREE.PointsMaterial({
            color: 0x8899aa,
            size: 0.3,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        
        const rain = new THREE.Points(geometry, material);
        this.scene.add(rain);
        
        return rain;
    }

    /**
     * Create snow particle system
     */
    createSnowSystem() {
        const particleCount = 3000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount);
        
        const spawnRadius = 100;
        
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * spawnRadius;
            positions[i * 3 + 1] = Math.random() * 50 + 20;
            positions[i * 3 + 2] = (Math.random() - 0.5) * spawnRadius;
            
            velocities[i] = Math.random() * 3 + 2;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 1));
        
        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.5,
            transparent: true,
            opacity: 0.8,
            map: this.createSnowflakeTexture()
        });
        
        const snow = new THREE.Points(geometry, material);
        this.scene.add(snow);
        
        return snow;
    }

    /**
     * Create snowflake texture
     */
    createSnowflakeTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        
        const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 32, 32);
        
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    /**
     * Setup fog system
     */
    setupFog() {
        this.effects.fog = new THREE.Fog(0x888888, 10, 300);
        // Don't apply yet - will be applied when fog weather is active
    }

    /**
     * Set weather type
     */
    setWeather(weatherType, intensity = 0.5, transitionTime = 2.0) {
        console.log(`Setting weather to: ${weatherType} (${intensity})`);
        
        this.currentWeather.type = weatherType;
        this.currentWeather.targetIntensity = Math.max(0, Math.min(1, intensity));
        this.currentWeather.transitionSpeed = 1 / (transitionTime * 60); // Assuming 60 FPS
        
        // Activate appropriate effects
        this.activateWeatherEffects(weatherType);
    }

    /**
     * Activate weather-specific effects
     */
    activateWeatherEffects(weatherType) {
        // Hide all particle systems first
        this.particleSystems.rain.visible = false;
        this.particleSystems.snow.visible = false;
        
        switch (weatherType) {
            case 'clear':
                this.scene.fog = null;
                break;
                
            case 'rain':
                this.particleSystems.rain.visible = true;
                break;
                
            case 'snow':
                this.particleSystems.snow.visible = true;
                break;
                
            case 'fog':
                this.scene.fog = this.effects.fog;
                break;
                
            case 'storm':
                this.particleSystems.rain.visible = true;
                this.scene.fog = this.effects.fog;
                break;
        }
    }

    /**
     * Update weather system
     */
    update(deltaTime, cameraPosition) {
        // Transition intensity
        if (this.currentWeather.intensity !== this.currentWeather.targetIntensity) {
            const diff = this.currentWeather.targetIntensity - this.currentWeather.intensity;
            const change = Math.sign(diff) * Math.min(
                Math.abs(diff),
                this.currentWeather.transitionSpeed
            );
            this.currentWeather.intensity += change;
        }
        
        // Update active effects
        this.updateParticleEffects(deltaTime, cameraPosition);
        this.updateFogIntensity();
        this.updatePhysicsModifiers();
        this.updateWetness(deltaTime);
    }

    /**
     * Update particle effects
     */
    updateParticleEffects(deltaTime, cameraPosition) {
        const intensity = this.currentWeather.intensity;
        
        // Update rain
        if (this.particleSystems.rain.visible) {
            this.updateRainParticles(deltaTime, cameraPosition, intensity);
        }
        
        // Update snow
        if (this.particleSystems.snow.visible) {
            this.updateSnowParticles(deltaTime, cameraPosition, intensity);
        }
    }

    /**
     * Update rain particles
     */
    updateRainParticles(deltaTime, cameraPosition, intensity) {
        const rain = this.particleSystems.rain;
        const positions = rain.geometry.attributes.position.array;
        const velocities = rain.geometry.attributes.velocity.array;
        
        for (let i = 0; i < positions.length / 3; i++) {
            const index = i * 3;
            
            // Fall down
            positions[index + 1] -= velocities[i] * deltaTime * intensity;
            
            // Reset if below ground or camera
            if (positions[index + 1] < -2) {
                positions[index] = cameraPosition.x + (Math.random() - 0.5) * 100;
                positions[index + 1] = 50;
                positions[index + 2] = cameraPosition.z + (Math.random() - 0.5) * 100;
            }
        }
        
        rain.geometry.attributes.position.needsUpdate = true;
        rain.material.opacity = 0.6 * intensity;
    }

    /**
     * Update snow particles
     */
    updateSnowParticles(deltaTime, cameraPosition, intensity) {
        const snow = this.particleSystems.snow;
        const positions = snow.geometry.attributes.position.array;
        const velocities = snow.geometry.attributes.velocity.array;
        
        for (let i = 0; i < positions.length / 3; i++) {
            const index = i * 3;
            
            // Fall down slowly
            positions[index + 1] -= velocities[i] * deltaTime * intensity;
            
            // Drift sideways
            positions[index] += Math.sin(Date.now() * 0.001 + i) * 0.1 * intensity;
            positions[index + 2] += Math.cos(Date.now() * 0.001 + i) * 0.1 * intensity;
            
            // Reset if below ground
            if (positions[index + 1] < -2) {
                positions[index] = cameraPosition.x + (Math.random() - 0.5) * 100;
                positions[index + 1] = 50;
                positions[index + 2] = cameraPosition.z + (Math.random() - 0.5) * 100;
            }
        }
        
        snow.geometry.attributes.position.needsUpdate = true;
        snow.material.opacity = 0.8 * intensity;
    }

    /**
     * Update fog intensity
     */
    updateFogIntensity() {
        if (this.scene.fog) {
            const intensity = this.currentWeather.intensity;
            
            // Adjust fog distance based on intensity
            this.scene.fog.near = 10 + (1 - intensity) * 40;
            this.scene.fog.far = 100 + (1 - intensity) * 200;
            
            // Darker fog in storms
            if (this.currentWeather.type === 'storm') {
                const darkness = 0.3 + intensity * 0.3;
                this.scene.fog.color.setRGB(darkness, darkness, darkness);
            } else {
                this.scene.fog.color.setRGB(0.7, 0.7, 0.7);
            }
        }
    }

    /**
     * Update physics modifiers based on weather
     */
    updatePhysicsModifiers() {
        const intensity = this.currentWeather.intensity;
        
        switch (this.currentWeather.type) {
            case 'clear':
                this.physicsModifiers.gripMultiplier = 1.0;
                this.physicsModifiers.dragMultiplier = 1.0;
                this.physicsModifiers.visibilityMultiplier = 1.0;
                break;
                
            case 'rain':
            case 'storm':
                // Reduced grip on wet track
                this.physicsModifiers.gripMultiplier = 1.0 - intensity * 0.4;
                this.physicsModifiers.dragMultiplier = 1.0 + intensity * 0.2;
                this.physicsModifiers.visibilityMultiplier = 1.0 - intensity * 0.3;
                break;
                
            case 'snow':
                // Very low grip in snow
                this.physicsModifiers.gripMultiplier = 1.0 - intensity * 0.6;
                this.physicsModifiers.dragMultiplier = 1.0 + intensity * 0.3;
                this.physicsModifiers.visibilityMultiplier = 1.0 - intensity * 0.4;
                break;
                
            case 'fog':
                // Only affects visibility
                this.physicsModifiers.gripMultiplier = 1.0;
                this.physicsModifiers.dragMultiplier = 1.0;
                this.physicsModifiers.visibilityMultiplier = 1.0 - intensity * 0.5;
                break;
        }
    }

    /**
     * Update track wetness
     */
    updateWetness(deltaTime) {
        const targetWetness = ['rain', 'storm'].includes(this.currentWeather.type) 
            ? this.currentWeather.intensity 
            : 0;
        
        // Gradually change wetness
        const diff = targetWetness - this.effects.wetness;
        this.effects.wetness += diff * deltaTime * 0.1; // Slow transition
        this.effects.wetness = Math.max(0, Math.min(1, this.effects.wetness));
    }

    /**
     * Random weather changes for dynamic gameplay
     */
    randomWeatherChange() {
        const weatherTypes = ['clear', 'rain', 'fog', 'snow', 'storm'];
        const randomType = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
        const randomIntensity = Math.random() * 0.5 + 0.3; // 0.3 to 0.8
        
        this.setWeather(randomType, randomIntensity, 5.0);
    }

    /**
     * Get current weather info
     */
    getWeatherInfo() {
        return {
            type: this.currentWeather.type,
            intensity: Math.round(this.currentWeather.intensity * 100),
            wetness: Math.round(this.effects.wetness * 100),
            gripLoss: Math.round((1 - this.physicsModifiers.gripMultiplier) * 100),
            visibility: Math.round(this.physicsModifiers.visibilityMultiplier * 100)
        };
    }

    /**
     * Get physics modifiers for vehicle systems
     */
    getPhysicsModifiers() {
        return { ...this.physicsModifiers };
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WeatherSystem;
}
