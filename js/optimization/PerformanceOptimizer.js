/**
 * PerformanceOptimizer.js
 * Comprehensive performance optimization and automatic quality adjustment
 * Monitors FPS and automatically adjusts quality settings
 */

class PerformanceOptimizer {
    constructor(scene, renderer, camera) {
        this.scene = scene;
        this.renderer = renderer;
        this.camera = camera;
        
        // Performance monitoring
        this.metrics = {
            fps: 60,
            frameTime: 16.67,
            samples: [],
            maxSamples: 60,
            avgFps: 60,
            minFps: 60,
            maxFps: 60
        };
        
        // Quality levels
        this.quality = {
            current: 'high',
            target: 'high',
            auto: true
        };
        
        // Quality presets
        this.presets = {
            ultra: {
                shadowMapSize: 4096,
                anisotropy: 16,
                particles: 5000,
                drawDistance: 500,
                lodBias: 1.0,
                shadows: true,
                postProcessing: true,
                reflections: true,
                antialiasing: true
            },
            high: {
                shadowMapSize: 2048,
                anisotropy: 8,
                particles: 3000,
                drawDistance: 400,
                lodBias: 0.8,
                shadows: true,
                postProcessing: true,
                reflections: false,
                antialiasing: true
            },
            medium: {
                shadowMapSize: 1024,
                anisotropy: 4,
                particles: 1500,
                drawDistance: 300,
                lodBias: 0.6,
                shadows: true,
                postProcessing: false,
                reflections: false,
                antialiasing: false
            },
            low: {
                shadowMapSize: 512,
                anisotropy: 2,
                particles: 500,
                drawDistance: 200,
                lodBias: 0.4,
                shadows: false,
                postProcessing: false,
                reflections: false,
                antialiasing: false
            },
            potato: {
                shadowMapSize: 256,
                anisotropy: 1,
                particles: 100,
                drawDistance: 100,
                lodBias: 0.2,
                shadows: false,
                postProcessing: false,
                reflections: false,
                antialiasing: false
            }
        };
        
        // Optimization state
        this.optimizations = {
            frustumCulling: true,
            occlusionCulling: false,
            objectPooling: true,
            geometryMerging: false,
            textureLOD: true,
            meshLOD: true
        };
        
        // Performance thresholds
        this.thresholds = {
            targetFps: 60,
            minAcceptableFps: 30,
            upgradeThreshold: 55,
            downgradeThreshold: 35,
            stabilityFrames: 60 // Check over 1 second
        };
        
        // Timing
        this.lastFrameTime = performance.now();
        this.lastOptimizationCheck = 0;
        this.optimizationInterval = 2000; // Check every 2 seconds
        
        this.initialize();
    }

    /**
     * Initialize optimizer
     */
    initialize() {
        // Detect hardware capabilities
        this.detectHardware();
        
        // Apply initial quality settings
        this.applyQualityPreset(this.quality.current);
        
        console.log('✅ Performance Optimizer initialized');
        console.log(`   Hardware: ${this.hardware.tier} tier`);
        console.log(`   Quality: ${this.quality.current}`);
    }

    /**
     * Detect hardware capabilities
     */
    detectHardware() {
        const gl = this.renderer.getContext();
        
        this.hardware = {
            gpu: gl.getParameter(gl.RENDERER) || 'Unknown',
            maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
            maxRenderBufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
            maxAnisotropy: this.renderer.capabilities.getMaxAnisotropy(),
            cores: navigator.hardwareConcurrency || 4,
            tier: 'medium' // Will be calculated
        };
        
        // Estimate hardware tier
        if (this.hardware.maxTextureSize >= 16384 && this.hardware.cores >= 8) {
            this.hardware.tier = 'ultra';
            this.quality.current = 'ultra';
        } else if (this.hardware.maxTextureSize >= 8192 && this.hardware.cores >= 4) {
            this.hardware.tier = 'high';
            this.quality.current = 'high';
        } else if (this.hardware.maxTextureSize >= 4096) {
            this.hardware.tier = 'medium';
            this.quality.current = 'medium';
        } else {
            this.hardware.tier = 'low';
            this.quality.current = 'low';
        }
    }

    /**
     * Update performance monitoring
     */
    update(deltaTime) {
        // Calculate FPS
        const currentTime = performance.now();
        const frameTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;
        
        this.metrics.frameTime = frameTime;
        this.metrics.fps = 1000 / frameTime;
        
        // Store sample
        this.metrics.samples.push(this.metrics.fps);
        if (this.metrics.samples.length > this.metrics.maxSamples) {
            this.metrics.samples.shift();
        }
        
        // Calculate statistics
        if (this.metrics.samples.length > 0) {
            this.metrics.avgFps = this.metrics.samples.reduce((a, b) => a + b, 0) / this.metrics.samples.length;
            this.metrics.minFps = Math.min(...this.metrics.samples);
            this.metrics.maxFps = Math.max(...this.metrics.samples);
        }
        
        // Auto quality adjustment
        if (this.quality.auto && currentTime - this.lastOptimizationCheck > this.optimizationInterval) {
            this.autoAdjustQuality();
            this.lastOptimizationCheck = currentTime;
        }
    }

    /**
     * Auto-adjust quality based on performance
     */
    autoAdjustQuality() {
        const avgFps = this.metrics.avgFps;
        const qualityLevels = ['potato', 'low', 'medium', 'high', 'ultra'];
        const currentIndex = qualityLevels.indexOf(this.quality.current);
        
        // Check if we should downgrade
        if (avgFps < this.thresholds.downgradeThreshold && currentIndex > 0) {
            const newQuality = qualityLevels[currentIndex - 1];
            console.log(`⚠️ Performance issue (${avgFps.toFixed(1)} FPS) - Downgrading to ${newQuality}`);
            this.applyQualityPreset(newQuality);
        }
        // Check if we can upgrade
        else if (avgFps > this.thresholds.upgradeThreshold && currentIndex < qualityLevels.length - 1) {
            const newQuality = qualityLevels[currentIndex + 1];
            console.log(`✅ Good performance (${avgFps.toFixed(1)} FPS) - Upgrading to ${newQuality}`);
            this.applyQualityPreset(newQuality);
        }
    }

    /**
     * Apply quality preset
     */
    applyQualityPreset(level) {
        if (!this.presets[level]) {
            console.warn(`Unknown quality level: ${level}`);
            return;
        }
        
        const preset = this.presets[level];
        this.quality.current = level;
        
        // Apply renderer settings
        this.applyRendererSettings(preset);
        
        // Apply scene optimizations
        this.applySceneOptimizations(preset);
        
        console.log(`Quality set to: ${level}`);
    }

    /**
     * Apply renderer-specific settings
     */
    applyRendererSettings(preset) {
        // Shadow map size
        this.scene.traverse((object) => {
            if (object.isLight && object.shadow) {
                object.shadow.mapSize.width = preset.shadowMapSize;
                object.shadow.mapSize.height = preset.shadowMapSize;
                object.shadow.map?.dispose();
                object.shadow.map = null;
                object.castShadow = preset.shadows;
            }
        });
        
        // Anisotropic filtering
        this.scene.traverse((object) => {
            if (object.isMesh && object.material) {
                const materials = Array.isArray(object.material) ? object.material : [object.material];
                materials.forEach(material => {
                    if (material.map) {
                        material.map.anisotropy = preset.anisotropy;
                    }
                });
            }
        });
        
        // Anti-aliasing
        if (this.renderer.getPixelRatio() !== (preset.antialiasing ? window.devicePixelRatio : 1)) {
            this.renderer.setPixelRatio(preset.antialiasing ? window.devicePixelRatio : 1);
        }
    }

    /**
     * Apply scene optimizations
     */
    applySceneOptimizations(preset) {
        // Camera far plane (draw distance)
        this.camera.far = preset.drawDistance;
        this.camera.updateProjectionMatrix();
        
        // Update scene fog
        if (this.scene.fog) {
            this.scene.fog.far = preset.drawDistance;
        }
        
        // Dispatch event for other systems to adjust
        window.dispatchEvent(new CustomEvent('quality-change', {
            detail: {
                level: this.quality.current,
                preset: preset
            }
        }));
    }

    /**
     * Enable specific optimization
     */
    enableOptimization(name) {
        if (this.optimizations.hasOwnProperty(name)) {
            this.optimizations[name] = true;
            console.log(`✅ ${name} enabled`);
        }
    }

    /**
     * Disable specific optimization
     */
    disableOptimization(name) {
        if (this.optimizations.hasOwnProperty(name)) {
            this.optimizations[name] = false;
            console.log(`❌ ${name} disabled`);
        }
    }

    /**
     * Get performance report
     */
    getPerformanceReport() {
        const memoryInfo = performance.memory ? {
            used: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
            total: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
            limit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB'
        } : null;
        
        return {
            fps: {
                current: Math.round(this.metrics.fps),
                average: Math.round(this.metrics.avgFps),
                min: Math.round(this.metrics.minFps),
                max: Math.round(this.metrics.maxFps)
            },
            frameTime: this.metrics.frameTime.toFixed(2) + ' ms',
            quality: this.quality.current,
            autoQuality: this.quality.auto,
            hardware: this.hardware.tier,
            memory: memoryInfo,
            optimizations: { ...this.optimizations },
            renderer: {
                drawCalls: this.renderer.info.render.calls,
                triangles: this.renderer.info.render.triangles,
                points: this.renderer.info.render.points,
                lines: this.renderer.info.render.lines
            }
        };
    }

    /**
     * Force garbage collection hint
     */
    optimizeMemory() {
        // Clear unused textures
        this.renderer.dispose();
        
        // Dispose geometries and materials not in use
        this.scene.traverse((object) => {
            if (object.isMesh) {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                if (object.material) {
                    const materials = Array.isArray(object.material) ? object.material : [object.material];
                    materials.forEach(material => {
                        if (material.map) material.map.dispose();
                        if (material.lightMap) material.lightMap.dispose();
                        if (material.bumpMap) material.bumpMap.dispose();
                        if (material.normalMap) material.normalMap.dispose();
                        if (material.specularMap) material.specularMap.dispose();
                        if (material.envMap) material.envMap.dispose();
                        material.dispose();
                    });
                }
            }
        });
        
        console.log('🧹 Memory optimization complete');
    }

    /**
     * Toggle auto quality
     */
    toggleAutoQuality() {
        this.quality.auto = !this.quality.auto;
        console.log(`Auto quality: ${this.quality.auto ? 'ON' : 'OFF'}`);
        return this.quality.auto;
    }

    /**
     * Set manual quality
     */
    setQuality(level) {
        this.quality.auto = false;
        this.applyQualityPreset(level);
    }

    /**
     * Get optimization suggestions
     */
    getOptimizationSuggestions() {
        const suggestions = [];
        
        if (this.metrics.avgFps < 30) {
            suggestions.push('⚠️ Low FPS detected - Consider lowering quality settings');
        }
        
        if (performance.memory && performance.memory.usedJSHeapSize > performance.memory.jsHeapSizeLimit * 0.9) {
            suggestions.push('⚠️ High memory usage - Restart recommended');
        }
        
        if (this.renderer.info.render.calls > 1000) {
            suggestions.push('💡 High draw calls - Enable geometry merging');
        }
        
        if (this.renderer.info.render.triangles > 1000000) {
            suggestions.push('💡 High polygon count - Increase LOD bias');
        }
        
        return suggestions;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceOptimizer;
}
