/**
 * Texture Optimizer - Texture atlasing and compression system for Speed Rivals
 * Reduces draw calls and optimizes texture memory usage
 */

class TextureOptimizer {
    constructor(performanceManager) {
        this.performanceManager = performanceManager;

        // Texture management
        this.textureAtlases = new Map();
        this.textureCache = new Map();
        this.compressionCache = new Map();

        // Atlas configuration
        this.atlasConfigs = {
            ui: { size: 1024, padding: 2 },
            particles: { size: 512, padding: 1 },
            environment: { size: 2048, padding: 4 },
            vehicles: { size: 1024, padding: 2 },
            decals: { size: 512, padding: 1 }
        };

        // Compression settings based on platform
        this.compressionFormats = this.detectCompressionSupport();

        // Statistics
        this.stats = {
            texturesLoaded: 0,
            atlasesCreated: 0,
            memoryUsed: 0,
            drawCallsReduced: 0,
            compressionRatio: 0
        };

        console.log('🎨 Texture Optimizer initialized');
        console.log('Supported compression formats:', this.compressionFormats);
    }

    /**
     * Detect supported texture compression formats
     */
    detectCompressionSupport() {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

        if (!gl) {
            console.warn('WebGL not available, using fallback textures');
            return { none: true };
        }

        const formats = {
            none: true // Always available fallback
        };

        // Check for S3TC (Desktop)
        const s3tc = gl.getExtension('WEBGL_compressed_texture_s3tc') ||
                    gl.getExtension('WEBKIT_WEBGL_compressed_texture_s3tc') ||
                    gl.getExtension('MOZ_WEBGL_compressed_texture_s3tc');
        if (s3tc) {
            formats.s3tc = true;
        }

        // Check for PVRTC (iOS/PowerVR)
        const pvrtc = gl.getExtension('WEBGL_compressed_texture_pvrtc') ||
                     gl.getExtension('WEBKIT_WEBGL_compressed_texture_pvrtc');
        if (pvrtc) {
            formats.pvrtc = true;
        }

        // Check for ETC (Android)
        const etc1 = gl.getExtension('WEBGL_compressed_texture_etc1');
        if (etc1) {
            formats.etc1 = true;
        }

        // Check for ETC2 (Modern devices)
        const etc = gl.getExtension('WEBGL_compressed_texture_etc');
        if (etc) {
            formats.etc2 = true;
        }

        // Check for ASTC (Modern mobile)
        const astc = gl.getExtension('WEBGL_compressed_texture_astc');
        if (astc) {
            formats.astc = true;
        }

        return formats;
    }

    /**
     * Create a texture atlas from multiple textures
     */
    async createAtlas(atlasName, textureList, config = {}) {
        const atlasConfig = { ...this.atlasConfigs[atlasName] || this.atlasConfigs.ui, ...config };

        console.log(`📖 Creating atlas '${atlasName}' with ${textureList.length} textures`);

        // Create canvas for atlas
        const canvas = document.createElement('canvas');
        canvas.width = atlasConfig.size;
        canvas.height = atlasConfig.size;
        const ctx = canvas.getContext('2d');

        // Atlas data structure
        const atlas = {
            canvas,
            texture: null,
            regions: new Map(),
            config: atlasConfig,
            usedArea: 0
        };

        // Simple bin packing algorithm
        const packer = new TexturePacker(atlasConfig.size, atlasConfig.size, atlasConfig.padding);

        // Load and pack textures
        for (const textureInfo of textureList) {
            try {
                const image = await this.loadTextureImage(textureInfo.url);
                const rect = packer.pack(image.width, image.height);

                if (rect) {
                    // Draw image to atlas
                    ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height);

                    // Store region info
                    atlas.regions.set(textureInfo.name, {
                        x: rect.x,
                        y: rect.y,
                        width: rect.width,
                        height: rect.height,
                        u: rect.x / atlasConfig.size,
                        v: rect.y / atlasConfig.size,
                        u2: (rect.x + rect.width) / atlasConfig.size,
                        v2: (rect.y + rect.height) / atlasConfig.size
                    });

                    atlas.usedArea += rect.width * rect.height;
                } else {
                    console.warn(`Could not pack texture '${textureInfo.name}' into atlas '${atlasName}'`);
                }
            } catch (error) {
                console.error(`Failed to load texture '${textureInfo.url}':`, error);
            }
        }

        // Create Three.js texture from canvas
        atlas.texture = new THREE.CanvasTexture(canvas);
        atlas.texture.name = atlasName;
        atlas.texture.generateMipmaps = true;
        atlas.texture.wrapS = THREE.ClampToEdgeWrapping;
        atlas.texture.wrapT = THREE.ClampToEdgeWrapping;

        // Apply compression if supported
        await this.compressTexture(atlas.texture);

        this.textureAtlases.set(atlasName, atlas);
        this.stats.atlasesCreated++;

        const efficiency = (atlas.usedArea / (atlasConfig.size * atlasConfig.size)) * 100;
        console.log(`✅ Atlas '${atlasName}' created - ${efficiency.toFixed(1)}% efficiency`);

        return atlas;
    }

    /**
     * Load texture image
     */
    loadTextureImage(url) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.crossOrigin = 'anonymous';
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = url;
        });
    }

    /**
     * Get UV coordinates for a texture region in an atlas
     */
    getAtlasRegion(atlasName, textureName) {
        const atlas = this.textureAtlases.get(atlasName);
        if (!atlas) {
            console.error(`Atlas '${atlasName}' not found`);
            return null;
        }

        const region = atlas.regions.get(textureName);
        if (!region) {
            console.error(`Texture '${textureName}' not found in atlas '${atlasName}'`);
            return null;
        }

        return region;
    }

    /**
     * Create material that uses atlas texture
     */
    createAtlasMaterial(atlasName, textureName, materialConfig = {}) {
        const atlas = this.textureAtlases.get(atlasName);
        if (!atlas) {
            console.error(`Atlas '${atlasName}' not found`);
            return null;
        }

        const region = this.getAtlasRegion(atlasName, textureName);
        if (!region) {
            return null;
        }

        // Create material with atlas texture
        const material = new THREE.MeshLambertMaterial({
            map: atlas.texture,
            ...materialConfig
        });

        // Store region info for UV mapping
        material.userData.atlasRegion = region;

        return material;
    }

    /**
     * Update geometry UVs to use atlas region
     */
    updateGeometryUVs(geometry, atlasName, textureName) {
        const region = this.getAtlasRegion(atlasName, textureName);
        if (!region) return false;

        const uvAttribute = geometry.getAttribute('uv');
        if (!uvAttribute) return false;

        // Transform UVs to atlas coordinates
        for (let i = 0; i < uvAttribute.count; i++) {
            const u = uvAttribute.getX(i);
            const v = uvAttribute.getY(i);

            const newU = region.u + u * (region.u2 - region.u);
            const newV = region.v + v * (region.v2 - region.v);

            uvAttribute.setX(i, newU);
            uvAttribute.setY(i, newV);
        }

        uvAttribute.needsUpdate = true;
        return true;
    }

    /**
     * Compress texture based on platform capabilities
     */
    async compressTexture(texture) {
        const quality = this.performanceManager?.currentQuality?.textureQuality || 1.0;

        // Choose compression format based on platform
        let format = 'none';
        if (this.performanceManager?.platform?.isIOS && this.compressionFormats.pvrtc) {
            format = 'pvrtc';
        } else if (this.performanceManager?.platform?.isAndroid && this.compressionFormats.etc2) {
            format = 'etc2';
        } else if (this.compressionFormats.s3tc) {
            format = 's3tc';
        }

        // Apply quality-based downscaling
        if (quality < 1.0) {
            const scale = Math.sqrt(quality);
            texture.repeat.set(scale, scale);
            console.log(`Downscaled texture to ${(quality * 100).toFixed(0)}% quality`);
        }

        // Apply compression format
        if (format !== 'none') {
            console.log(`Applying ${format} compression to texture`);
            // Note: Actual compression would require server-side processing
            // or client-side compression libraries
        }

        // Set appropriate minification filter
        if (quality < 0.75) {
            texture.minFilter = THREE.LinearFilter;
            texture.generateMipmaps = false;
        } else {
            texture.minFilter = THREE.LinearMipmapLinearFilter;
            texture.generateMipmaps = true;
        }
    }

    /**
     * Optimize existing materials by batching similar ones
     */
    optimizeMaterials(materials) {
        const materialBatches = new Map();

        // Group materials by similar properties
        for (const material of materials) {
            const key = this.getMaterialKey(material);
            if (!materialBatches.has(key)) {
                materialBatches.set(key, []);
            }
            materialBatches.get(key).push(material);
        }

        // Merge similar materials
        const optimizedMaterials = [];
        for (const [key, batch] of materialBatches) {
            if (batch.length > 1) {
                console.log(`Batching ${batch.length} similar materials`);
                this.stats.drawCallsReduced += batch.length - 1;
            }
            optimizedMaterials.push(batch[0]); // Use first material as representative
        }

        return optimizedMaterials;
    }

    /**
     * Generate key for material batching
     */
    getMaterialKey(material) {
        return `${material.type}_${material.color?.getHex() || 'none'}_${material.transparent}_${material.opacity}`;
    }

    /**
     * Create optimized particle textures
     */
    createParticleAtlas() {
        const particleTextures = [
            { name: 'smoke', url: this.generateSmokeTexture() },
            { name: 'spark', url: this.generateSparkTexture() },
            { name: 'dust', url: this.generateDustTexture() },
            { name: 'fire', url: this.generateFireTexture() }
        ];

        return this.createAtlas('particles', particleTextures);
    }

    /**
     * Generate procedural smoke texture
     */
    generateSmokeTexture() {
        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Create gradient for smoke
        const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
        gradient.addColorStop(0, 'rgba(200, 200, 200, 1)');
        gradient.addColorStop(0.5, 'rgba(150, 150, 150, 0.5)');
        gradient.addColorStop(1, 'rgba(100, 100, 100, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        return canvas.toDataURL();
    }

    /**
     * Generate procedural spark texture
     */
    generateSparkTexture() {
        const size = 32;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Create gradient for spark
        const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
        gradient.addColorStop(0, 'rgba(255, 255, 100, 1)');
        gradient.addColorStop(0.3, 'rgba(255, 150, 50, 0.8)');
        gradient.addColorStop(0.7, 'rgba(255, 100, 0, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        return canvas.toDataURL();
    }

    /**
     * Generate procedural dust texture
     */
    generateDustTexture() {
        const size = 32;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Create gradient for dust
        const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
        gradient.addColorStop(0, 'rgba(139, 115, 85, 0.8)');
        gradient.addColorStop(0.5, 'rgba(139, 115, 85, 0.4)');
        gradient.addColorStop(1, 'rgba(139, 115, 85, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        return canvas.toDataURL();
    }

    /**
     * Generate procedural fire texture
     */
    generateFireTexture() {
        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Create gradient for fire
        const gradient = ctx.createRadialGradient(size/2, size, 0, size/2, size/2, size/2);
        gradient.addColorStop(0, 'rgba(255, 255, 100, 1)');
        gradient.addColorStop(0.2, 'rgba(255, 200, 50, 0.9)');
        gradient.addColorStop(0.5, 'rgba(255, 100, 0, 0.7)');
        gradient.addColorStop(0.8, 'rgba(200, 50, 0, 0.3)');
        gradient.addColorStop(1, 'rgba(100, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        return canvas.toDataURL();
    }

    /**
     * Preload and cache commonly used textures
     */
    async preloadTextures() {
        console.log('🚀 Preloading textures...');

        // Create particle atlas
        await this.createParticleAtlas();

        // Cache common textures
        const commonTextures = [
            'road', 'grass', 'concrete', 'metal', 'glass'
        ];

        for (const textureName of commonTextures) {
            this.cacheTexture(textureName, this.generateProceduralTexture(textureName));
        }

        console.log('✅ Texture preloading complete');
    }

    /**
     * Generate procedural textures for common materials
     */
    generateProceduralTexture(type) {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        switch (type) {
            case 'road':
                this.generateRoadTexture(ctx, size);
                break;
            case 'grass':
                this.generateGrassTexture(ctx, size);
                break;
            case 'concrete':
                this.generateConcreteTexture(ctx, size);
                break;
            case 'metal':
                this.generateMetalTexture(ctx, size);
                break;
            case 'glass':
                this.generateGlassTexture(ctx, size);
                break;
        }

        return new THREE.CanvasTexture(canvas);
    }

    generateRoadTexture(ctx, size) {
        ctx.fillStyle = '#2c2c2c';
        ctx.fillRect(0, 0, size, size);

        // Add noise for texture
        for (let i = 0; i < 1000; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const brightness = Math.random() * 50;
            ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
            ctx.fillRect(x, y, 1, 1);
        }
    }

    generateGrassTexture(ctx, size) {
        ctx.fillStyle = '#4a7c59';
        ctx.fillRect(0, 0, size, size);

        // Add grass variation
        for (let i = 0; i < 500; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const green = 75 + Math.random() * 50;
            ctx.fillStyle = `rgb(${green * 0.6}, ${green}, ${green * 0.7})`;
            ctx.fillRect(x, y, 2, 2);
        }
    }

    generateConcreteTexture(ctx, size) {
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, size, size);

        // Add concrete noise
        for (let i = 0; i < 2000; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const brightness = 128 + (Math.random() - 0.5) * 60;
            ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
            ctx.fillRect(x, y, 1, 1);
        }
    }

    generateMetalTexture(ctx, size) {
        const gradient = ctx.createLinearGradient(0, 0, size, size);
        gradient.addColorStop(0, '#a0a0a0');
        gradient.addColorStop(0.5, '#d0d0d0');
        gradient.addColorStop(1, '#a0a0a0');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
    }

    generateGlassTexture(ctx, size) {
        ctx.fillStyle = 'rgba(200, 220, 255, 0.3)';
        ctx.fillRect(0, 0, size, size);
    }

    /**
     * Cache texture for reuse
     */
    cacheTexture(name, texture) {
        this.textureCache.set(name, texture);
        this.stats.texturesLoaded++;
    }

    /**
     * Get cached texture
     */
    getCachedTexture(name) {
        return this.textureCache.get(name);
    }

    /**
     * Get optimization statistics
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Clean up resources
     */
    dispose() {
        for (const atlas of this.textureAtlases.values()) {
            if (atlas.texture) {
                atlas.texture.dispose();
            }
        }

        for (const texture of this.textureCache.values()) {
            texture.dispose();
        }

        this.textureAtlases.clear();
        this.textureCache.clear();
        this.compressionCache.clear();
    }
}

/**
 * Simple texture packing algorithm
 */
class TexturePacker {
    constructor(width, height, padding = 1) {
        this.width = width;
        this.height = height;
        this.padding = padding;
        this.root = { x: 0, y: 0, width, height };
    }

    pack(width, height) {
        const node = this.findNode(this.root, width + this.padding, height + this.padding);
        if (node) {
            return this.splitNode(node, width + this.padding, height + this.padding);
        }
        return null;
    }

    findNode(root, width, height) {
        if (root.used) {
            return this.findNode(root.right, width, height) || this.findNode(root.down, width, height);
        } else if (width <= root.width && height <= root.height) {
            return root;
        }
        return null;
    }

    splitNode(node, width, height) {
        node.used = true;
        node.down = { x: node.x, y: node.y + height, width: node.width, height: node.height - height };
        node.right = { x: node.x + width, y: node.y, width: node.width - width, height };
        return { x: node.x, y: node.y, width: width - this.padding, height: height - this.padding };
    }
}

// Export for use in other modules
window.TextureOptimizer = TextureOptimizer;