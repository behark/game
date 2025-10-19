/**
 * DayNightCycle.js
 * Dynamic day/night cycle with sun/moon movement and lighting transitions
 */

class DayNightCycle {
    constructor(scene) {
        this.scene = scene;
        
        // Time of day (0-24 hours)
        this.time = {
            current: 12.0, // Start at noon
            speed: 0.1, // Hours per real second (default: fast)
            paused: false
        };
        
        // Celestial bodies
        this.celestials = {
            sun: null,
            moon: null,
            sunLight: null,
            moonLight: null
        };
        
        // Sky colors for different times
        this.skyColors = {
            night: new THREE.Color(0x000511),
            dawn: new THREE.Color(0xff6b35),
            day: new THREE.Color(0x87CEEB),
            dusk: new THREE.Color(0xff4500),
            stars: []
        };
        
        // Ambient lighting
        this.ambientLight = null;
        
        this.initialize();
    }

    /**
     * Initialize day/night system
     */
    initialize() {
        this.createSun();
        this.createMoon();
        this.createStars();
        this.createAmbientLight();
        this.updateLighting();
        
        console.log('✅ Day/Night Cycle initialized');
    }

    /**
     * Create sun
     */
    createSun() {
        // Sun mesh (visual)
        const sunGeometry = new THREE.SphereGeometry(10, 32, 32);
        const sunMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            emissive: 0xffff00
        });
        this.celestials.sun = new THREE.Mesh(sunGeometry, sunMaterial);
        this.scene.add(this.celestials.sun);
        
        // Directional light from sun
        this.celestials.sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
        this.celestials.sunLight.castShadow = true;
        this.celestials.sunLight.shadow.mapSize.width = 2048;
        this.celestials.sunLight.shadow.mapSize.height = 2048;
        this.celestials.sunLight.shadow.camera.near = 0.5;
        this.celestials.sunLight.shadow.camera.far = 500;
        this.celestials.sunLight.shadow.camera.left = -100;
        this.celestials.sunLight.shadow.camera.right = 100;
        this.celestials.sunLight.shadow.camera.top = 100;
        this.celestials.sunLight.shadow.camera.bottom = -100;
        this.scene.add(this.celestials.sunLight);
    }

    /**
     * Create moon
     */
    createMoon() {
        // Moon mesh
        const moonGeometry = new THREE.SphereGeometry(7, 32, 32);
        const moonMaterial = new THREE.MeshBasicMaterial({
            color: 0xccccff,
            emissive: 0x444466
        });
        this.celestials.moon = new THREE.Mesh(moonGeometry, moonMaterial);
        this.scene.add(this.celestials.moon);
        
        // Moon light
        this.celestials.moonLight = new THREE.DirectionalLight(0x6666ff, 0.2);
        this.scene.add(this.celestials.moonLight);
    }

    /**
     * Create starfield
     */
    createStars() {
        const starCount = 1000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(starCount * 3);
        
        for (let i = 0; i < starCount; i++) {
            // Random positions on celestial sphere
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const radius = 400;
            
            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi);
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 2,
            transparent: true,
            opacity: 0
        });
        
        this.skyColors.stars = new THREE.Points(geometry, material);
        this.scene.add(this.skyColors.stars);
    }

    /**
     * Create ambient lighting
     */
    createAmbientLight() {
        this.ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(this.ambientLight);
    }

    /**
     * Update cycle
     */
    update(deltaTime) {
        if (!this.time.paused) {
            // Advance time
            this.time.current += this.time.speed * deltaTime;
            
            // Wrap around 24 hours
            if (this.time.current >= 24) {
                this.time.current -= 24;
            }
        }
        
        // Update celestial positions
        this.updateCelestialPositions();
        
        // Update lighting
        this.updateLighting();
        
        // Update sky color
        this.updateSkyColor();
    }

    /**
     * Update sun and moon positions
     */
    updateCelestialPositions() {
        const hour = this.time.current;
        
        // Sun path (rises at 6am, sets at 6pm)
        const sunAngle = ((hour - 6) / 12) * Math.PI; // 0 to PI over day
        const sunRadius = 300;
        
        this.celestials.sun.position.set(
            0,
            Math.sin(sunAngle) * sunRadius,
            Math.cos(sunAngle) * sunRadius
        );
        
        this.celestials.sunLight.position.copy(this.celestials.sun.position);
        this.celestials.sunLight.target.position.set(0, 0, 0);
        
        // Moon path (opposite of sun)
        const moonAngle = sunAngle + Math.PI;
        const moonRadius = 250;
        
        this.celestials.moon.position.set(
            0,
            Math.sin(moonAngle) * moonRadius,
            Math.cos(moonAngle) * moonRadius
        );
        
        this.celestials.moonLight.position.copy(this.celestials.moon.position);
        this.celestials.moonLight.target.position.set(0, 0, 0);
        
        // Hide sun/moon when below horizon
        this.celestials.sun.visible = this.celestials.sun.position.y > 0;
        this.celestials.moon.visible = this.celestials.moon.position.y > 0;
    }

    /**
     * Update lighting based on time of day
     */
    updateLighting() {
        const hour = this.time.current;
        let sunIntensity = 0;
        let moonIntensity = 0;
        let ambientIntensity = 0;
        let sunColor = new THREE.Color(0xffffff);
        
        // Night (0-5, 20-24)
        if (hour < 5 || hour >= 20) {
            sunIntensity = 0;
            moonIntensity = 0.3;
            ambientIntensity = 0.1;
        }
        // Dawn (5-7)
        else if (hour >= 5 && hour < 7) {
            const t = (hour - 5) / 2;
            sunIntensity = t * 0.8;
            moonIntensity = (1 - t) * 0.3;
            ambientIntensity = 0.1 + t * 0.3;
            sunColor.setRGB(1.0, 0.6 + t * 0.4, 0.4 + t * 0.6);
        }
        // Day (7-17)
        else if (hour >= 7 && hour < 17) {
            sunIntensity = 1.0;
            moonIntensity = 0;
            ambientIntensity = 0.5;
            sunColor.setRGB(1.0, 1.0, 1.0);
        }
        // Dusk (17-20)
        else {
            const t = (hour - 17) / 3;
            sunIntensity = (1 - t) * 0.8;
            moonIntensity = t * 0.3;
            ambientIntensity = 0.4 - t * 0.3;
            sunColor.setRGB(1.0, 0.6 + (1 - t) * 0.4, 0.4 + (1 - t) * 0.6);
        }
        
        // Apply lighting
        this.celestials.sunLight.intensity = sunIntensity;
        this.celestials.sunLight.color.copy(sunColor);
        this.celestials.moonLight.intensity = moonIntensity;
        this.ambientLight.intensity = ambientIntensity;
        
        // Stars visibility
        const starOpacity = hour < 6 || hour >= 18 ? 
            Math.min(1.0, (hour < 6 ? (6 - hour) : (hour - 18)) / 2) : 0;
        this.skyColors.stars.material.opacity = starOpacity;
    }

    /**
     * Update sky/fog color based on time
     */
    updateSkyColor() {
        const hour = this.time.current;
        let skyColor = new THREE.Color();
        
        // Night
        if (hour < 5 || hour >= 20) {
            skyColor.copy(this.skyColors.night);
        }
        // Dawn
        else if (hour >= 5 && hour < 7) {
            const t = (hour - 5) / 2;
            skyColor.lerpColors(this.skyColors.night, this.skyColors.dawn, t);
        }
        // Morning to day
        else if (hour >= 7 && hour < 9) {
            const t = (hour - 7) / 2;
            skyColor.lerpColors(this.skyColors.dawn, this.skyColors.day, t);
        }
        // Day
        else if (hour >= 9 && hour < 16) {
            skyColor.copy(this.skyColors.day);
        }
        // Afternoon to dusk
        else if (hour >= 16 && hour < 18) {
            const t = (hour - 16) / 2;
            skyColor.lerpColors(this.skyColors.day, this.skyColors.dusk, t);
        }
        // Dusk to night
        else {
            const t = (hour - 18) / 2;
            skyColor.lerpColors(this.skyColors.dusk, this.skyColors.night, t);
        }
        
        // Apply to scene
        this.scene.background = skyColor;
        
        // Update fog color if exists
        if (this.scene.fog) {
            this.scene.fog.color.copy(skyColor);
        }
    }

    /**
     * Set time of day
     */
    setTime(hour) {
        this.time.current = Math.max(0, Math.min(24, hour));
        this.updateCelestialPositions();
        this.updateLighting();
        this.updateSkyColor();
    }

    /**
     * Set time speed (hours per second)
     */
    setTimeSpeed(speed) {
        this.time.speed = speed;
    }

    /**
     * Toggle pause
     */
    togglePause() {
        this.time.paused = !this.time.paused;
        return this.time.paused;
    }

    /**
     * Get current time info
     */
    getTimeInfo() {
        const hour = Math.floor(this.time.current);
        const minute = Math.floor((this.time.current % 1) * 60);
        
        let period = 'Day';
        if (hour < 6 || hour >= 20) period = 'Night';
        else if (hour >= 6 && hour < 8) period = 'Dawn';
        else if (hour >= 18 && hour < 20) period = 'Dusk';
        
        return {
            hour: hour,
            minute: minute,
            formatted: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
            period: period,
            dayProgress: (this.time.current / 24) * 100
        };
    }

    /**
     * Get lighting state
     */
    getLightingState() {
        return {
            sunIntensity: this.celestials.sunLight.intensity.toFixed(2),
            moonIntensity: this.celestials.moonLight.intensity.toFixed(2),
            ambientIntensity: this.ambientLight.intensity.toFixed(2),
            isDaytime: this.celestials.sun.position.y > 0
        };
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DayNightCycle;
}
