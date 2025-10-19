/**
 * WebGL Optimizer - Advanced rendering optimization for Speed Rivals
 * Implements shader batching, instanced rendering, and GPU performance optimizations
 */

class WebGLOptimizer {
    constructor(renderer, performanceManager) {
        this.renderer = renderer;
        this.performanceManager = performanceManager;

        // WebGL context and capabilities
        this.gl = renderer.getContext();
        this.capabilities = renderer.capabilities;
        this.extensions = this.initializeExtensions();

        // Batching system
        this.batchGroups = new Map();
        this.materialBatches = new Map();
        this.instancedMeshes = new Map();

        // Draw call optimization
        this.drawCallOptimizations = {
            geometryMerging: true,
            textureBatching: true,
            uniformBufferObjects: this.extensions.ubo,
            instancingEnabled: true
        };

        // Shader management
        this.shaderCache = new Map();
        this.optimizedShaders = new Map();
        this.uniformBlocks = new Map();

        // Performance metrics
        this.renderStats = {
            drawCalls: 0,
            triangles: 0,
            batchedCalls: 0,
            instancedCalls: 0,
            savedDrawCalls: 0,
            shaderSwitches: 0
        };

        // Frame timing
        this.frameQueries = [];
        this.gpuFrameTime = 0;
        this.measureGPUTime = this.extensions.timerQuery;

        console.log('🎮 WebGL Optimizer initialized');
        console.log('Extensions:', Object.keys(this.extensions).filter(k => this.extensions[k]));
    }

    /**
     * Initialize WebGL extensions
     */
    initializeExtensions() {
        const extensions = {
            // Instanced rendering
            instanced: !!this.gl.getExtension('ANGLE_instanced_arrays'),

            // Uniform Buffer Objects
            ubo: !!this.gl.getExtension('WEBGL_uniform_buffer_objects'),

            // GPU timing
            timerQuery: !!this.gl.getExtension('EXT_disjoint_timer_query_webgl2') ||
                       !!this.gl.getExtension('EXT_disjoint_timer_query'),

            // Texture compression
            s3tc: !!this.gl.getExtension('WEBGL_compressed_texture_s3tc'),
            etc1: !!this.gl.getExtension('WEBGL_compressed_texture_etc1'),

            // Depth textures
            depthTexture: !!this.gl.getExtension('WEBGL_depth_texture'),

            // Vertex Array Objects
            vao: !!this.gl.getExtension('OES_vertex_array_object'),

            // Multiple render targets
            mrt: !!this.gl.getExtension('WEBGL_draw_buffers'),

            // Floating point textures
            floatTextures: !!this.gl.getExtension('OES_texture_float')
        };

        return extensions;
    }

    /**
     * Create optimized batch renderer for similar objects
     */
    createBatchRenderer(batchId, materialConfig, maxInstances = 1000) {
        const batchData = {
            material: null,
            geometry: null,
            instances: [],
            matrices: new Float32Array(maxInstances * 16),
            colors: new Float32Array(maxInstances * 4),
            dirty: false,
            maxInstances,
            activeInstances: 0
        };

        // Create instanced material
        batchData.material = this.createInstancedMaterial(materialConfig);

        this.batchGroups.set(batchId, batchData);
        return batchData;
    }

    /**
     * Create material optimized for instanced rendering
     */
    createInstancedMaterial(config) {
        const material = new THREE.ShaderMaterial({
            uniforms: {
                ...THREE.UniformsLib.common,
                ...THREE.UniformsLib.lights,
                time: { value: 0 },
                opacity: { value: config.opacity || 1.0 }
            },
            vertexShader: this.generateInstancedVertexShader(config),
            fragmentShader: this.generateInstancedFragmentShader(config),
            lights: config.lights !== false,
            transparent: config.transparent || false
        });

        // Enable instancing
        material.defines = material.defines || {};
        material.defines.USE_INSTANCING = '';

        return material;
    }

    /**
     * Generate optimized vertex shader for instancing
     */
    generateInstancedVertexShader(config) {
        return `
            #define USE_INSTANCING

            ${THREE.ShaderChunk.common}
            ${THREE.ShaderChunk.instancedpars_vertex}
            ${THREE.ShaderChunk.logdepthbuf_pars_vertex}
            ${THREE.ShaderChunk.clipping_planes_pars_vertex}

            attribute vec3 instanceColor;

            varying vec3 vColor;
            varying vec3 vPosition;
            varying vec3 vNormal;

            void main() {
                ${THREE.ShaderChunk.instancedpars_vertex}

                vColor = instanceColor;
                vPosition = position;
                vNormal = normalize(normalMatrix * normal);

                vec3 transformed = position;

                ${THREE.ShaderChunk.project_vertex}
                ${THREE.ShaderChunk.logdepthbuf_vertex}
                ${THREE.ShaderChunk.clipping_planes_vertex}
            }
        `;
    }

    /**
     * Generate optimized fragment shader
     */
    generateInstancedFragmentShader(config) {
        return `
            precision highp float;

            ${THREE.ShaderChunk.common}
            ${THREE.ShaderChunk.packing}
            ${THREE.ShaderChunk.lights_pars_begin}
            ${THREE.ShaderChunk.logdepthbuf_pars_fragment}
            ${THREE.ShaderChunk.clipping_planes_pars_fragment}

            uniform float opacity;
            uniform float time;

            varying vec3 vColor;
            varying vec3 vPosition;
            varying vec3 vNormal;

            void main() {
                ${THREE.ShaderChunk.clipping_planes_fragment}

                vec3 color = vColor;

                // Simple lighting calculation
                vec3 lightColor = vec3(1.0);
                vec3 lightDirection = normalize(vec3(1.0, 1.0, 1.0));
                float lightIntensity = max(dot(vNormal, lightDirection), 0.3);

                color *= lightColor * lightIntensity;

                gl_FragColor = vec4(color, opacity);

                ${THREE.ShaderChunk.logdepthbuf_fragment}
            }
        `;
    }

    /**
     * Add object to batch for instanced rendering
     */
    addToBatch(batchId, object, color = new THREE.Color(1, 1, 1)) {
        const batch = this.batchGroups.get(batchId);
        if (!batch || batch.activeInstances >= batch.maxInstances) {
            return false;
        }

        const index = batch.activeInstances;

        // Store matrix
        object.updateMatrixWorld();
        object.matrixWorld.toArray(batch.matrices, index * 16);

        // Store color
        color.toArray(batch.colors, index * 4);
        batch.colors[index * 4 + 3] = 1.0; // Alpha

        batch.instances.push({
            object,
            index,
            visible: true
        });

        batch.activeInstances++;
        batch.dirty = true;

        return true;
    }

    /**
     * Update batch data for rendering
     */
    updateBatch(batchId) {
        const batch = this.batchGroups.get(batchId);
        if (!batch || !batch.dirty) return;

        // Update geometry attributes for instancing
        if (!batch.geometry) return;

        // Create instanced attributes if they don't exist
        if (!batch.geometry.attributes.instanceMatrix) {
            batch.geometry.setAttribute('instanceMatrix',
                new THREE.InstancedBufferAttribute(batch.matrices, 16));
        }

        if (!batch.geometry.attributes.instanceColor) {
            batch.geometry.setAttribute('instanceColor',
                new THREE.InstancedBufferAttribute(batch.colors, 4));
        }

        // Update the attribute data
        batch.geometry.attributes.instanceMatrix.array = batch.matrices;
        batch.geometry.attributes.instanceColor.array = batch.colors;

        batch.geometry.attributes.instanceMatrix.needsUpdate = true;
        batch.geometry.attributes.instanceColor.needsUpdate = true;

        // Set instance count
        batch.geometry.instanceCount = batch.activeInstances;

        batch.dirty = false;
    }

    /**
     * Optimize geometry by merging vertices and reducing draw calls
     */
    optimizeGeometry(geometry) {
        const optimized = geometry.clone();

        // Merge vertices that are close together
        optimized.mergeVertices();

        // Compute vertex normals if missing
        if (!optimized.attributes.normal) {
            optimized.computeVertexNormals();
        }

        // Optimize for GPU cache
        if (optimized.index) {
            // Reorder indices for better vertex cache usage
            this.optimizeVertexCache(optimized);
        }

        return optimized;
    }

    /**
     * Optimize vertex cache usage (simplified implementation)
     */
    optimizeVertexCache(geometry) {
        const indices = geometry.index.array;
        const vertexCount = geometry.attributes.position.count;
        const faceCount = indices.length / 3;

        // Simple optimization: sort faces by vertex indices
        const faces = [];
        for (let i = 0; i < faceCount; i++) {
            faces.push({
                a: indices[i * 3],
                b: indices[i * 3 + 1],
                c: indices[i * 3 + 2],
                sum: indices[i * 3] + indices[i * 3 + 1] + indices[i * 3 + 2]
            });
        }

        faces.sort((a, b) => a.sum - b.sum);

        // Update indices
        for (let i = 0; i < faceCount; i++) {
            indices[i * 3] = faces[i].a;
            indices[i * 3 + 1] = faces[i].b;
            indices[i * 3 + 2] = faces[i].c;
        }

        geometry.index.needsUpdate = true;
    }

    /**
     * Create shader with optimal uniform management
     */
    createOptimizedShader(name, vertexShader, fragmentShader, uniforms = {}) {
        // Check cache first
        const cacheKey = `${name}_${this.hashShader(vertexShader + fragmentShader)}`;

        if (this.shaderCache.has(cacheKey)) {
            return this.shaderCache.get(cacheKey);
        }

        // Optimize shader code
        const optimizedVertex = this.optimizeShaderCode(vertexShader);
        const optimizedFragment = this.optimizeShaderCode(fragmentShader);

        const material = new THREE.ShaderMaterial({
            vertexShader: optimizedVertex,
            fragmentShader: optimizedFragment,
            uniforms
        });

        this.shaderCache.set(cacheKey, material);
        return material;
    }

    /**
     * Optimize shader code by removing unused parts
     */
    optimizeShaderCode(shaderCode) {
        // Remove comments and extra whitespace
        let optimized = shaderCode
            .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
            .replace(/\/\/.*$/gm, '')          // Remove line comments
            .replace(/\s+/g, ' ')             // Collapse whitespace
            .trim();

        // Platform-specific optimizations
        const quality = this.performanceManager?.currentQuality?.name || 'HIGH';

        if (quality === 'LOW') {
            // Disable expensive operations for low quality
            optimized = optimized.replace(/#define USE_NORMALMAP/g, '');
            optimized = optimized.replace(/#define USE_SPECULARMAP/g, '');
        }

        return optimized;
    }

    /**
     * Hash shader code for caching
     */
    hashShader(code) {
        let hash = 0;
        for (let i = 0; i < code.length; i++) {
            const char = code.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    /**
     * Begin GPU timing measurement
     */
    beginGPUTiming() {
        if (!this.measureGPUTime) return null;

        const query = this.gl.createQuery();
        this.gl.beginQuery(this.gl.TIME_ELAPSED_EXT, query);
        return query;
    }

    /**
     * End GPU timing measurement
     */
    endGPUTiming(query) {
        if (!query || !this.measureGPUTime) return;

        this.gl.endQuery(this.gl.TIME_ELAPSED_EXT);
        this.frameQueries.push(query);
    }

    /**
     * Process completed GPU timing queries
     */
    processGPUTiming() {
        if (!this.measureGPUTime) return;

        for (let i = this.frameQueries.length - 1; i >= 0; i--) {
            const query = this.frameQueries[i];
            const available = this.gl.getQueryParameter(query, this.gl.QUERY_RESULT_AVAILABLE);

            if (available) {
                const timeElapsed = this.gl.getQueryParameter(query, this.gl.QUERY_RESULT);
                this.gpuFrameTime = timeElapsed / 1000000; // Convert to milliseconds

                this.gl.deleteQuery(query);
                this.frameQueries.splice(i, 1);
            }
        }
    }

    /**
     * Optimize texture usage and binding
     */
    optimizeTextures(scene) {
        const textureUnits = this.capabilities.maxTextures;
        const textureBatches = new Map();

        // Group materials by texture usage
        scene.traverse((object) => {
            if (object.isMesh && object.material) {
                const material = object.material;
                if (material.map) {
                    const textureId = material.map.uuid;
                    if (!textureBatches.has(textureId)) {
                        textureBatches.set(textureId, []);
                    }
                    textureBatches.get(textureId).push(object);
                }
            }
        });

        // Sort by usage frequency
        const sortedBatches = Array.from(textureBatches.entries())
            .sort((a, b) => b[1].length - a[1].length);

        console.log(`🎨 Texture optimization: ${sortedBatches.length} unique textures for ${textureUnits} units`);

        return sortedBatches;
    }

    /**
     * Apply platform-specific optimizations
     */
    applyPlatformOptimizations() {
        const platform = this.performanceManager?.platform;
        if (!platform) return;

        // Mobile optimizations
        if (platform.isMobile) {
            // Reduce precision for mobile GPUs
            this.renderer.precision = 'mediump';

            // Disable expensive features
            this.drawCallOptimizations.geometryMerging = true;
            this.drawCallOptimizations.textureBatching = true;

            console.log('📱 Applied mobile WebGL optimizations');
        }

        // Desktop optimizations
        if (platform.type === 'desktop') {
            // Enable all optimizations for desktop
            this.drawCallOptimizations.uniformBufferObjects = this.extensions.ubo;
            this.drawCallOptimizations.instancingEnabled = this.extensions.instanced;

            console.log('💻 Applied desktop WebGL optimizations');
        }

        // Browser-specific optimizations
        switch (platform.browser) {
            case 'chrome':
                // Chrome-specific optimizations
                break;
            case 'firefox':
                // Firefox-specific optimizations
                break;
            case 'safari':
                // Safari-specific optimizations (often more conservative)
                this.drawCallOptimizations.geometryMerging = false; // Safari sometimes has issues
                break;
        }
    }

    /**
     * Update render statistics
     */
    updateRenderStats() {
        if (this.renderer.info) {
            const info = this.renderer.info.render;
            this.renderStats.drawCalls = info.calls;
            this.renderStats.triangles = info.triangles;
        }
    }

    /**
     * Optimize frame rendering
     */
    optimizeFrame(scene, camera) {
        const gpuQuery = this.beginGPUTiming();

        // Update all batches
        for (const [batchId, batch] of this.batchGroups) {
            this.updateBatch(batchId);
        }

        // Process GPU timing from previous frames
        this.processGPUTiming();

        // Update render statistics
        this.updateRenderStats();

        this.endGPUTiming(gpuQuery);
    }

    /**
     * Get optimization statistics
     */
    getStats() {
        return {
            ...this.renderStats,
            gpuFrameTime: this.gpuFrameTime,
            activeBatches: this.batchGroups.size,
            shadersCached: this.shaderCache.size,
            extensions: Object.keys(this.extensions).filter(k => this.extensions[k])
        };
    }

    /**
     * Create efficient particle system
     */
    createParticleSystem(config = {}) {
        const maxParticles = config.maxParticles || 1000;

        // Create geometry with instanced attributes
        const geometry = new THREE.BufferGeometry();

        // Base quad for particles
        const vertices = new Float32Array([
            -0.5, -0.5, 0,
             0.5, -0.5, 0,
             0.5,  0.5, 0,
            -0.5,  0.5, 0
        ]);

        const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geometry.setIndex(new THREE.BufferAttribute(indices, 1));

        // Instanced attributes
        const positions = new Float32Array(maxParticles * 3);
        const scales = new Float32Array(maxParticles);
        const colors = new Float32Array(maxParticles * 4);

        geometry.setAttribute('instancePosition', new THREE.InstancedBufferAttribute(positions, 3));
        geometry.setAttribute('instanceScale', new THREE.InstancedBufferAttribute(scales, 1));
        geometry.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(colors, 4));

        // Create optimized particle material
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: `
                attribute vec3 instancePosition;
                attribute float instanceScale;
                attribute vec4 instanceColor;

                varying vec4 vColor;

                void main() {
                    vColor = instanceColor;

                    vec3 pos = position * instanceScale + instancePosition;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                varying vec4 vColor;

                void main() {
                    gl_FragColor = vColor;
                }
            `,
            transparent: true,
            depthWrite: false
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.frustumCulled = false;

        return {
            mesh,
            geometry,
            material,
            maxParticles,
            activeParticles: 0,
            positions,
            scales,
            colors
        };
    }

    /**
     * Clean up resources
     */
    dispose() {
        // Clear caches
        for (const material of this.shaderCache.values()) {
            material.dispose();
        }
        this.shaderCache.clear();

        // Clear batch groups
        for (const batch of this.batchGroups.values()) {
            if (batch.material) batch.material.dispose();
            if (batch.geometry) batch.geometry.dispose();
        }
        this.batchGroups.clear();

        // Clean up GPU queries
        for (const query of this.frameQueries) {
            this.gl.deleteQuery(query);
        }
        this.frameQueries.length = 0;
    }
}

// Export for use in other modules
window.WebGLOptimizer = WebGLOptimizer;