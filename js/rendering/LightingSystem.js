/**
 * LightingSystem.js
 * Advanced lighting system with dynamic sun, shadows, and car lights
 * Includes day/night cycle support
 */

class LightingSystem {
    constructor(scene) {
        this.scene = scene;
        this.lights = {};
        this.timeOfDay = 14; // 14:00 (2 PM) - default
        this.shadows = true;
        this.carLights = [];
    }

    /**
     * Initialize all lights
     */
    init() {
        this.createSunLight();
        this.createAmbientLight();
        this.createFillLights();
        
        console.log('✅ Lighting system initialized');
        console.log(`   - Time of day: ${this.timeOfDay}:00`);
        console.log(`   - Shadows: ${this.shadows ? 'Enabled' : 'Disabled'}`);
    }

    /**
     * Create main directional light (sun/moon)
     */
    createSunLight() {
        this.lights.sun = new THREE.DirectionalLight(0xffffff, 1.5);
        this.lights.sun.position.set(100, 100, 50);
        this.lights.sun.castShadow = this.shadows;
        
        if (this.shadows) {
            // High-quality shadow settings
            this.lights.sun.shadow.mapSize.width = 4096;
            this.lights.sun.shadow.mapSize.height = 4096;
            this.lights.sun.shadow.camera.left = -150;
            this.lights.sun.shadow.camera.right = 150;
            this.lights.sun.shadow.camera.top = 150;
            this.lights.sun.shadow.camera.bottom = -150;
            this.lights.sun.shadow.camera.near = 0.5;
            this.lights.sun.shadow.camera.far = 500;
            this.lights.sun.shadow.bias = -0.0001;
            this.lights.sun.shadow.normalBias = 0.02;
        }
        
        this.scene.add(this.lights.sun);

        // Add sun helper (visible light source in sky)
        const sunGeometry = new THREE.SphereGeometry(10, 32, 32);
        const sunMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffdd,
            transparent: true,
            opacity: 0.8
        });
        this.lights.sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
        this.lights.sunMesh.position.copy(this.lights.sun.position);
        this.scene.add(this.lights.sunMesh);
    }

    /**
     * Create ambient/hemisphere lighting
     */
    createAmbientLight() {
        // Hemisphere light for natural ambient lighting
        this.lights.hemisphere = new THREE.HemisphereLight(
            0x87CEEB, // sky color (light blue)
            0x362312, // ground color (brown)
            0.6
        );
        this.scene.add(this.lights.hemisphere);

        // Additional ambient light for darker areas
        this.lights.ambient = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(this.lights.ambient);
    }

    /**
     * Create fill lights for better illumination
     */
    createFillLights() {
        // Front fill light
        this.lights.fillFront = new THREE.DirectionalLight(0xffffff, 0.3);
        this.lights.fillFront.position.set(0, 50, 100);
        this.scene.add(this.lights.fillFront);

        // Back fill light
        this.lights.fillBack = new THREE.DirectionalLight(0xffffff, 0.2);
        this.lights.fillBack.position.set(0, 50, -100);
        this.scene.add(this.lights.fillBack);
    }

    /**
     * Add car headlights
     */
    addCarHeadlights(carMesh, offset = { x: 1.5, y: 0.5, z: 3.5 }) {
        const headlights = {
            car: carMesh,
            lights: []
        };

        // Left headlight
        const leftHeadlight = new THREE.SpotLight(
            0xffffee,  // Warm white
            2.0,       // Intensity
            60,        // Distance
            Math.PI / 6, // Angle
            0.5,       // Penumbra
            1.0        // Decay
        );
        leftHeadlight.position.set(-offset.x, offset.y, offset.z);
        leftHeadlight.castShadow = false; // Disable for performance
        carMesh.add(leftHeadlight);

        const leftTarget = new THREE.Object3D();
        leftTarget.position.set(-offset.x, offset.y - 0.2, offset.z + 10);
        carMesh.add(leftTarget);
        leftHeadlight.target = leftTarget;

        // Right headlight
        const rightHeadlight = leftHeadlight.clone();
        rightHeadlight.position.set(offset.x, offset.y, offset.z);
        carMesh.add(rightHeadlight);

        const rightTarget = new THREE.Object3D();
        rightTarget.position.set(offset.x, offset.y - 0.2, offset.z + 10);
        carMesh.add(rightTarget);
        rightHeadlight.target = rightTarget;

        headlights.lights.push(leftHeadlight, rightHeadlight);

        // Initially off (turn on based on time of day)
        this.setHeadlightsEnabled(headlights, false);

        this.carLights.push(headlights);
        return headlights;
    }

    /**
     * Add car brake lights
     */
    addCarBrakeLights(carMesh, offset = { x: 1.2, y: 0.5, z: -3.5 }) {
        const brakeLights = {
            car: carMesh,
            lights: []
        };

        // Left brake light
        const leftBrake = new THREE.PointLight(0xff0000, 0, 8);
        leftBrake.position.set(-offset.x, offset.y, offset.z);
        carMesh.add(leftBrake);

        // Right brake light
        const rightBrake = new THREE.PointLight(0xff0000, 0, 8);
        rightBrake.position.set(offset.x, offset.y, offset.z);
        carMesh.add(rightBrake);

        brakeLights.lights.push(leftBrake, rightBrake);
        this.carLights.push(brakeLights);

        return brakeLights;
    }

    /**
     * Set headlight state
     */
    setHeadlightsEnabled(headlights, enabled) {
        headlights.lights.forEach(light => {
            light.visible = enabled;
        });
    }

    /**
     * Set brake light intensity
     */
    setBrakeLightIntensity(brakeLights, intensity) {
        brakeLights.lights.forEach(light => {
            light.intensity = intensity * 3.0;
        });
    }

    /**
     * Update time of day (0-24 hours)
     */
    updateTimeOfDay(hours) {
        this.timeOfDay = hours % 24;
        
        const angle = (this.timeOfDay / 24) * Math.PI * 2 - Math.PI / 2;
        const height = Math.sin(angle);
        const distance = Math.cos(angle);

        // Update sun position
        this.lights.sun.position.x = distance * 100;
        this.lights.sun.position.y = Math.abs(height * 100) + 20; // Keep above horizon
        this.lights.sun.position.z = distance * 50;

        if (this.lights.sunMesh) {
            this.lights.sunMesh.position.copy(this.lights.sun.position);
        }

        // Update lighting based on time
        if (hours >= 6 && hours < 8) {
            // Sunrise (orange-pink)
            this.lights.sun.color.setHex(0xff8844);
            this.lights.sun.intensity = 0.8;
            this.lights.hemisphere.color.setHex(0xffaa88);
            this.lights.ambient.intensity = 0.4;
            if (this.lights.sunMesh) {
                this.lights.sunMesh.material.color.setHex(0xffaa66);
            }
        } else if (hours >= 8 && hours < 18) {
            // Daytime (bright white-yellow)
            this.lights.sun.color.setHex(0xffffee);
            this.lights.sun.intensity = 1.5;
            this.lights.hemisphere.color.setHex(0x87CEEB);
            this.lights.ambient.intensity = 0.3;
            if (this.lights.sunMesh) {
                this.lights.sunMesh.material.color.setHex(0xffffdd);
            }
        } else if (hours >= 18 && hours < 20) {
            // Sunset (red-orange)
            this.lights.sun.color.setHex(0xff6633);
            this.lights.sun.intensity = 0.6;
            this.lights.hemisphere.color.setHex(0xff8855);
            this.lights.ambient.intensity = 0.5;
            if (this.lights.sunMesh) {
                this.lights.sunMesh.material.color.setHex(0xff7744);
            }
        } else {
            // Night (blue moonlight)
            this.lights.sun.color.setHex(0x6688ff);
            this.lights.sun.intensity = 0.2;
            this.lights.hemisphere.color.setHex(0x111133);
            this.lights.ambient.intensity = 0.1;
            if (this.lights.sunMesh) {
                this.lights.sunMesh.material.color.setHex(0xaaaaff);
                this.lights.sunMesh.material.opacity = 0.3;
            }
        }

        // Auto-enable headlights at night
        const isNight = hours < 6 || hours >= 19;
        this.carLights.forEach(carLight => {
            if (carLight.lights.length === 2 && carLight.lights[0].isSpotLight) {
                this.setHeadlightsEnabled(carLight, isNight);
            }
        });
    }

    /**
     * Set shadow quality
     */
    setShadowQuality(quality) {
        const sizes = {
            low: 1024,
            medium: 2048,
            high: 4096,
            ultra: 8192
        };

        const size = sizes[quality] || 2048;
        
        if (this.lights.sun.shadow) {
            this.lights.sun.shadow.mapSize.width = size;
            this.lights.sun.shadow.mapSize.height = size;
            this.lights.sun.shadow.map?.dispose();
            this.lights.sun.shadow.map = null;
        }

        console.log(`Shadow quality set to: ${quality} (${size}x${size})`);
    }

    /**
     * Update lighting system (called every frame)
     */
    update(deltaTime) {
        // Can be used for flickering lights, pulsing effects, etc.
        // For now, we just maintain the current state
    }

    /**
     * Enable/disable shadows globally
     */
    setShadowsEnabled(enabled) {
        this.shadows = enabled;
        this.lights.sun.castShadow = enabled;
        
        console.log(`Shadows: ${enabled ? 'Enabled' : 'Disabled'}`);
    }

    /**
     * Cleanup
     */
    dispose() {
        Object.values(this.lights).forEach(light => {
            if (light.dispose) light.dispose();
            if (light.parent) light.parent.remove(light);
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LightingSystem;
}
