/**
 * MaterialUpgrade.js
 * Handles PBR (Physically-Based Rendering) materials and environment mapping
 * Transforms basic materials into AAA-quality realistic materials
 */

class MaterialUpgrade {
    constructor(renderer, scene) {
        this.renderer = renderer;
        this.scene = scene;
        this.envMap = null;
        this.textureLoader = new THREE.TextureLoader();
        this.cubeTextureLoader = new THREE.CubeTextureLoader();
    }

    /**
     * Load HDR environment map for realistic reflections
     */
    async loadEnvironment() {
        return new Promise((resolve, reject) => {
            // Create a simple cubemap from solid colors for now
            // In production, replace with actual HDR environment map
            const createGradientTexture = (color1, color2) => {
                const canvas = document.createElement('canvas');
                canvas.width = 512;
                canvas.height = 512;
                const ctx = canvas.getContext('2d');
                const gradient = ctx.createLinearGradient(0, 0, 0, 512);
                gradient.addColorStop(0, color1);
                gradient.addColorStop(1, color2);
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, 512, 512);
                return new THREE.CanvasTexture(canvas);
            };

            // Create sky environment
            const urls = [
                createGradientTexture('#87CEEB', '#4A90E2'), // px
                createGradientTexture('#87CEEB', '#4A90E2'), // nx
                createGradientTexture('#87CEEB', '#E0F6FF'), // py (top)
                createGradientTexture('#87CEEB', '#4A90E2'), // ny (bottom)
                createGradientTexture('#87CEEB', '#4A90E2'), // pz
                createGradientTexture('#87CEEB', '#4A90E2')  // nz
            ];

            this.envMap = new THREE.CubeTexture(urls.map(t => t.image));
            this.envMap.needsUpdate = true;
            
            this.scene.environment = this.envMap;
            this.scene.background = this.envMap;
            
            console.log('✅ Environment map loaded successfully');
            resolve(this.envMap);
        });
    }

    /**
     * Create car body material with realistic paint effect
     */
    createCarPaintMaterial(options = {}) {
        const {
            color = 0xff0000,
            type = 'metallic', // metallic, matte, pearlescent, chrome
            clearcoat = 1.0,
            flakeDensity = 0.5
        } = options;

        let material;

        switch(type) {
            case 'metallic':
                material = new THREE.MeshStandardMaterial({
                    color: color,
                    metalness: 0.9,
                    roughness: 0.1,
                    envMapIntensity: 1.5,
                    clearcoat: clearcoat,
                    clearcoatRoughness: 0.1
                });
                break;

            case 'matte':
                material = new THREE.MeshStandardMaterial({
                    color: color,
                    metalness: 0.2,
                    roughness: 0.8,
                    envMapIntensity: 0.5
                });
                break;

            case 'pearlescent':
                material = new THREE.MeshStandardMaterial({
                    color: color,
                    metalness: 0.6,
                    roughness: 0.2,
                    envMapIntensity: 2.0,
                    clearcoat: 1.0,
                    clearcoatRoughness: 0.05,
                    sheen: 0.5,
                    sheenColor: new THREE.Color(0xffffff)
                });
                break;

            case 'chrome':
                material = new THREE.MeshStandardMaterial({
                    color: 0xffffff,
                    metalness: 1.0,
                    roughness: 0.05,
                    envMapIntensity: 2.5
                });
                break;

            case 'carbon':
                material = new THREE.MeshStandardMaterial({
                    color: 0x1a1a1a,
                    metalness: 0.7,
                    roughness: 0.3,
                    envMapIntensity: 1.0
                });
                // TODO: Add carbon fiber normal map
                break;

            default:
                material = new THREE.MeshStandardMaterial({
                    color: color,
                    metalness: 0.9,
                    roughness: 0.1
                });
        }

        material.envMap = this.envMap;
        return material;
    }

    /**
     * Create glass material for windows
     */
    createGlassMaterial(options = {}) {
        const {
            color = 0x88ccff,
            tint = 0.3,
            transmission = 0.9
        } = options;

        const material = new THREE.MeshPhysicalMaterial({
            color: color,
            metalness: 0,
            roughness: 0.05,
            transmission: transmission,
            thickness: 0.5,
            envMapIntensity: 2.0,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
            ior: 1.5 // Index of refraction for glass
        });

        material.envMap = this.envMap;
        return material;
    }

    /**
     * Create tire/rubber material
     */
    createTireMaterial() {
        const material = new THREE.MeshStandardMaterial({
            color: 0x0a0a0a,
            metalness: 0.1,
            roughness: 0.95,
            envMapIntensity: 0.2
        });
        
        // TODO: Add tire normal map for tread pattern
        
        return material;
    }

    /**
     * Create wheel rim material
     */
    createRimMaterial(finish = 'polished') {
        let material;

        switch(finish) {
            case 'polished':
                material = new THREE.MeshStandardMaterial({
                    color: 0xcccccc,
                    metalness: 1.0,
                    roughness: 0.1,
                    envMapIntensity: 2.0
                });
                break;

            case 'matte':
                material = new THREE.MeshStandardMaterial({
                    color: 0x666666,
                    metalness: 0.8,
                    roughness: 0.5,
                    envMapIntensity: 1.0
                });
                break;

            case 'black':
                material = new THREE.MeshStandardMaterial({
                    color: 0x1a1a1a,
                    metalness: 0.9,
                    roughness: 0.2,
                    envMapIntensity: 1.5
                });
                break;

            default:
                material = new THREE.MeshStandardMaterial({
                    color: 0xaaaaaa,
                    metalness: 0.9,
                    roughness: 0.3
                });
        }

        material.envMap = this.envMap;
        return material;
    }

    /**
     * Create track surface material
     */
    createTrackMaterial() {
        const material = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            metalness: 0.1,
            roughness: 0.85,
            envMapIntensity: 0.3
        });

        // TODO: Add asphalt texture and normal map
        
        return material;
    }

    /**
     * Create grass material
     */
    createGrassMaterial() {
        const material = new THREE.MeshStandardMaterial({
            color: 0x3a8c3a,
            metalness: 0.0,
            roughness: 0.9,
            envMapIntensity: 0.4
        });

        // TODO: Add grass texture
        
        return material;
    }

    /**
     * Create emissive material for lights
     */
    createLightMaterial(color = 0xffffff, intensity = 2.0) {
        const material = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: intensity,
            metalness: 0.0,
            roughness: 0.4
        });

        return material;
    }

    /**
     * Enable PBR rendering features
     */
    enablePBR() {
        // Enable tone mapping for HDR
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        
        // Enable physically correct lights
        this.renderer.useLegacyLights = false;
        
        // Enable shadows
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Enable output color space
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        console.log('✅ PBR rendering enabled');
        console.log('   - Tone Mapping: ACES Filmic');
        console.log('   - Shadow Type: PCF Soft');
        console.log('   - Color Space: sRGB');
    }

    /**
     * Update material for animation (e.g., paint sparkle effect)
     */
    update(deltaTime) {
        // Can be used for animated effects like color shifting
        // or sparkle effects on paint
    }

    /**
     * Dispose of materials to free memory
     */
    dispose() {
        if (this.envMap) {
            this.envMap.dispose();
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MaterialUpgrade;
}
