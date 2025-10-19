/**
 * Smart Asset Loader - Progressive loading system for Speed Rivals
 * Manages asset loading with priorities, progressive loading, and caching
 */

class SmartAssetLoader {
    constructor(performanceManager) {
        this.performanceManager = performanceManager;

        // Loading management
        this.loadQueue = [];
        this.loadingAssets = new Map();
        this.loadedAssets = new Map();
        this.failedAssets = new Set();

        // Priority system
        this.priorities = {
            CRITICAL: 0,    // Essential for game start
            HIGH: 1,        // Needed soon
            MEDIUM: 2,      // Nice to have
            LOW: 3,         // Background loading
            PRELOAD: 4      // Speculative loading
        };

        // Loading configuration
        this.config = {
            maxConcurrentLoads: 3,
            retryAttempts: 3,
            retryDelay: 1000,
            progressiveChunkSize: 256 * 1024, // 256KB chunks
            cacheDuration: 30 * 60 * 1000,    // 30 minutes
            preloadDistance: 500               // Distance for preloading
        };

        // Platform-specific adjustments
        this.adjustConfigForPlatform();

        // Cache management
        this.cache = new Map();
        this.cacheSize = 0;
        this.maxCacheSize = this.calculateMaxCacheSize();

        // Statistics
        this.stats = {
            totalRequested: 0,
            totalLoaded: 0,
            totalFailed: 0,
            cacheHits: 0,
            cacheMisses: 0,
            bytesLoaded: 0,
            averageLoadTime: 0,
            loadTimes: []
        };

        // Event handlers
        this.onProgress = new Set();
        this.onComplete = new Set();
        this.onError = new Set();

        console.log('📦 Smart Asset Loader initialized');
        console.log(`Max concurrent loads: ${this.config.maxConcurrentLoads}`);
        console.log(`Cache size limit: ${(this.maxCacheSize / 1024 / 1024).toFixed(1)}MB`);
    }

    /**
     * Adjust configuration based on platform capabilities
     */
    adjustConfigForPlatform() {
        if (!this.performanceManager) return;

        const platform = this.performanceManager.platform;
        const deviceCaps = this.performanceManager.deviceCapabilities;

        // Reduce concurrent loads on mobile
        if (platform.isMobile) {
            this.config.maxConcurrentLoads = 2;
            this.config.progressiveChunkSize = 128 * 1024; // Smaller chunks
        }

        // Adjust based on connection and memory
        if (platform.memory < 4) {
            this.config.maxConcurrentLoads = Math.max(1, this.config.maxConcurrentLoads - 1);
        }

        // Increase limits for high-end devices
        if (deviceCaps.tier === 'ultra') {
            this.config.maxConcurrentLoads = 4;
            this.config.progressiveChunkSize = 512 * 1024;
        }
    }

    /**
     * Calculate maximum cache size based on available memory
     */
    calculateMaxCacheSize() {
        const platform = this.performanceManager?.platform;
        const memory = platform?.memory || 4;

        // Use a percentage of available memory
        const memoryMB = memory * 1024; // Convert GB to MB
        const cachePercentage = platform?.isMobile ? 0.1 : 0.2; // 10% mobile, 20% desktop

        return Math.min(memoryMB * cachePercentage * 1024 * 1024, 500 * 1024 * 1024); // Max 500MB
    }

    /**
     * Load asset with priority and caching
     */
    async loadAsset(url, type, priority = this.priorities.MEDIUM, options = {}) {
        const assetId = this.generateAssetId(url, options);

        // Check cache first
        const cached = this.getCachedAsset(assetId);
        if (cached) {
            this.stats.cacheHits++;
            return cached.data;
        }

        this.stats.cacheMisses++;
        this.stats.totalRequested++;

        // Check if already loading
        if (this.loadingAssets.has(assetId)) {
            return this.loadingAssets.get(assetId);
        }

        // Create loading promise
        const loadPromise = this.createLoadPromise(url, type, priority, options, assetId);
        this.loadingAssets.set(assetId, loadPromise);

        return loadPromise;
    }

    /**
     * Create asset loading promise
     */
    async createLoadPromise(url, type, priority, options, assetId) {
        const startTime = performance.now();

        try {
            let data;

            switch (type) {
                case 'texture':
                    data = await this.loadTexture(url, options);
                    break;
                case 'audio':
                    data = await this.loadAudio(url, options);
                    break;
                case 'model':
                    data = await this.loadModel(url, options);
                    break;
                case 'json':
                    data = await this.loadJSON(url, options);
                    break;
                case 'binary':
                    data = await this.loadBinary(url, options);
                    break;
                default:
                    throw new Error(`Unknown asset type: ${type}`);
            }

            // Cache the loaded asset
            this.cacheAsset(assetId, data, url, type);

            // Update statistics
            const loadTime = performance.now() - startTime;
            this.stats.totalLoaded++;
            this.stats.loadTimes.push(loadTime);
            this.stats.averageLoadTime = this.stats.loadTimes.reduce((a, b) => a + b, 0) / this.stats.loadTimes.length;

            // Keep only recent load times for accurate average
            if (this.stats.loadTimes.length > 100) {
                this.stats.loadTimes = this.stats.loadTimes.slice(-50);
            }

            this.loadingAssets.delete(assetId);
            this.notifyProgress(assetId, 1.0, 'completed');

            return data;

        } catch (error) {
            this.stats.totalFailed++;
            this.failedAssets.add(assetId);
            this.loadingAssets.delete(assetId);

            this.notifyError(assetId, error);
            throw error;
        }
    }

    /**
     * Load texture with progressive enhancement
     */
    async loadTexture(url, options = {}) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();

            // Configure loader based on options
            if (options.manager) {
                loader.setManager(options.manager);
            }

            const texture = loader.load(
                url,
                (tex) => {
                    // Apply texture optimizations
                    this.optimizeTexture(tex, options);
                    resolve(tex);
                },
                (progress) => {
                    const assetId = this.generateAssetId(url, options);
                    const loadedRatio = progress.loaded / progress.total;
                    this.notifyProgress(assetId, loadedRatio, 'loading');
                },
                (error) => {
                    reject(new Error(`Failed to load texture: ${url} - ${error.message}`));
                }
            );
        });
    }

    /**
     * Optimize texture based on quality settings
     */
    optimizeTexture(texture, options = {}) {
        const quality = this.performanceManager?.currentQuality?.textureQuality || 1.0;

        // Apply quality-based settings
        if (quality < 1.0) {
            texture.generateMipmaps = false;
            texture.minFilter = THREE.LinearFilter;
        }

        // Set appropriate wrap mode
        texture.wrapS = options.wrapS || THREE.RepeatWrapping;
        texture.wrapT = options.wrapT || THREE.RepeatWrapping;

        // Apply anisotropic filtering if supported
        const renderer = options.renderer;
        if (renderer && quality > 0.7) {
            const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
            texture.anisotropy = Math.min(maxAnisotropy, quality * 4);
        }
    }

    /**
     * Load audio with streaming for large files
     */
    async loadAudio(url, options = {}) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.crossOrigin = 'anonymous';

            const onLoad = () => {
                audio.removeEventListener('canplaythrough', onLoad);
                audio.removeEventListener('error', onError);
                resolve(audio);
            };

            const onError = () => {
                audio.removeEventListener('canplaythrough', onLoad);
                audio.removeEventListener('error', onError);
                reject(new Error(`Failed to load audio: ${url}`));
            };

            audio.addEventListener('canplaythrough', onLoad);
            audio.addEventListener('error', onError);

            // Track loading progress
            audio.addEventListener('progress', () => {
                if (audio.buffered.length > 0) {
                    const assetId = this.generateAssetId(url, options);
                    const progress = audio.buffered.end(0) / audio.duration;
                    this.notifyProgress(assetId, progress, 'loading');
                }
            });

            audio.src = url;
            audio.load();
        });
    }

    /**
     * Load 3D model
     */
    async loadModel(url, options = {}) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.GLTFLoader();

            // Use compressed textures if available
            if (options.dracoLoader) {
                loader.setDRACOLoader(options.dracoLoader);
            }

            loader.load(
                url,
                (gltf) => {
                    // Optimize loaded model
                    this.optimizeModel(gltf, options);
                    resolve(gltf);
                },
                (progress) => {
                    const assetId = this.generateAssetId(url, options);
                    const loadedRatio = progress.loaded / progress.total;
                    this.notifyProgress(assetId, loadedRatio, 'loading');
                },
                (error) => {
                    reject(new Error(`Failed to load model: ${url} - ${error.message}`));
                }
            );
        });
    }

    /**
     * Optimize loaded 3D model
     */
    optimizeModel(gltf, options = {}) {
        const quality = this.performanceManager?.currentQuality || { name: 'HIGH' };

        // Traverse and optimize meshes
        gltf.scene.traverse((child) => {
            if (child.isMesh) {
                // Simplify geometry for lower quality settings
                if (quality.name === 'LOW' && child.geometry.attributes.position.count > 1000) {
                    this.simplifyGeometry(child.geometry, 0.5);
                } else if (quality.name === 'MEDIUM' && child.geometry.attributes.position.count > 5000) {
                    this.simplifyGeometry(child.geometry, 0.7);
                }

                // Enable shadows based on quality
                if (quality.name !== 'LOW') {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            }
        });
    }

    /**
     * Simplify geometry (basic implementation)
     */
    simplifyGeometry(geometry, factor) {
        if (!geometry.isBufferGeometry) return;

        const positionAttribute = geometry.getAttribute('position');
        const originalCount = positionAttribute.count;
        const targetCount = Math.floor(originalCount * factor);

        if (targetCount >= originalCount) return;

        // Simple decimation - more sophisticated algorithms would be better
        const indices = [];
        const step = originalCount / targetCount;

        for (let i = 0; i < originalCount; i += step) {
            indices.push(Math.floor(i));
        }

        geometry.setIndex(indices);
    }

    /**
     * Load JSON data
     */
    async loadJSON(url, options = {}) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load JSON: ${response.status}`);
        }
        return response.json();
    }

    /**
     * Load binary data
     */
    async loadBinary(url, options = {}) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load binary: ${response.status}`);
        }
        return response.arrayBuffer();
    }

    /**
     * Progressive loading for large assets
     */
    async loadProgressive(url, type, onChunk, options = {}) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to start progressive load: ${response.status}`);
        }

        const contentLength = parseInt(response.headers.get('content-length'), 10);
        const reader = response.body.getReader();
        const chunks = [];
        let receivedLength = 0;

        while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            chunks.push(value);
            receivedLength += value.length;

            // Call progress callback
            if (onChunk) {
                onChunk(receivedLength, contentLength);
            }

            // Update progress
            const assetId = this.generateAssetId(url, options);
            this.notifyProgress(assetId, receivedLength / contentLength, 'loading');
        }

        // Combine chunks
        const allChunks = new Uint8Array(receivedLength);
        let position = 0;
        for (const chunk of chunks) {
            allChunks.set(chunk, position);
            position += chunk.length;
        }

        return allChunks.buffer;
    }

    /**
     * Preload assets based on distance or prediction
     */
    preloadAssets(position, direction, distance = null) {
        const preloadDistance = distance || this.config.preloadDistance;

        // Predict future position
        const futurePosition = position.clone().add(
            direction.clone().multiplyScalar(preloadDistance)
        );

        // Find assets near future position
        const nearbyAssets = this.findNearbyAssets(futurePosition, preloadDistance);

        // Queue for preloading with low priority
        for (const asset of nearbyAssets) {
            if (!this.loadedAssets.has(asset.id) && !this.loadingAssets.has(asset.id)) {
                this.loadAsset(asset.url, asset.type, this.priorities.PRELOAD, asset.options);
            }
        }
    }

    /**
     * Find assets near a position (implementation depends on asset organization)
     */
    findNearbyAssets(position, distance) {
        // This would be implemented based on how assets are spatially organized
        // For now, return empty array
        return [];
    }

    /**
     * Generate unique asset ID
     */
    generateAssetId(url, options = {}) {
        const optionsStr = JSON.stringify(options);
        return `${url}#${btoa(optionsStr)}`;
    }

    /**
     * Cache asset
     */
    cacheAsset(assetId, data, url, type) {
        const estimatedSize = this.estimateAssetSize(data, type);

        // Check if we need to free cache space
        if (this.cacheSize + estimatedSize > this.maxCacheSize) {
            this.evictCache(estimatedSize);
        }

        const cacheEntry = {
            data,
            url,
            type,
            size: estimatedSize,
            timestamp: Date.now(),
            accessCount: 0
        };

        this.cache.set(assetId, cacheEntry);
        this.cacheSize += estimatedSize;
    }

    /**
     * Get cached asset
     */
    getCachedAsset(assetId) {
        const entry = this.cache.get(assetId);
        if (entry) {
            // Check if cache entry is still valid
            if (Date.now() - entry.timestamp < this.config.cacheDuration) {
                entry.accessCount++;
                return entry;
            } else {
                // Remove expired entry
                this.cache.delete(assetId);
                this.cacheSize -= entry.size;
            }
        }
        return null;
    }

    /**
     * Evict cache entries to make space
     */
    evictCache(neededSpace) {
        const entries = Array.from(this.cache.entries());

        // Sort by access frequency and age (LRU-like)
        entries.sort((a, b) => {
            const scoreA = a[1].accessCount / (Date.now() - a[1].timestamp);
            const scoreB = b[1].accessCount / (Date.now() - b[1].timestamp);
            return scoreA - scoreB;
        });

        let freedSpace = 0;
        for (const [assetId, entry] of entries) {
            this.cache.delete(assetId);
            this.cacheSize -= entry.size;
            freedSpace += entry.size;

            if (freedSpace >= neededSpace) break;
        }

        console.log(`🗑️ Evicted ${freedSpace / 1024 / 1024}MB from cache`);
    }

    /**
     * Estimate asset size in bytes
     */
    estimateAssetSize(data, type) {
        switch (type) {
            case 'texture':
                if (data.image) {
                    return data.image.width * data.image.height * 4; // RGBA
                }
                return 1024 * 1024; // Default estimate

            case 'audio':
                return data.duration * 44100 * 2 * 2; // Stereo 16-bit

            case 'model':
                return JSON.stringify(data).length;

            case 'json':
                return JSON.stringify(data).length;

            case 'binary':
                return data.byteLength;

            default:
                return 1024; // Default 1KB
        }
    }

    /**
     * Batch load multiple assets
     */
    async loadBatch(assetList, options = {}) {
        const promises = assetList.map(asset =>
            this.loadAsset(asset.url, asset.type, asset.priority || this.priorities.MEDIUM, asset.options)
        );

        const results = await Promise.allSettled(promises);

        const loaded = [];
        const failed = [];

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                loaded.push({ asset: assetList[index], data: result.value });
            } else {
                failed.push({ asset: assetList[index], error: result.reason });
            }
        });

        return { loaded, failed };
    }

    /**
     * Get loading statistics
     */
    getStats() {
        return {
            ...this.stats,
            cacheSize: this.cacheSize,
            cachedAssets: this.cache.size,
            loadingAssets: this.loadingAssets.size,
            failedAssets: this.failedAssets.size
        };
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        this.cacheSize = 0;
        console.log('🗑️ Asset cache cleared');
    }

    /**
     * Event handling
     */
    notifyProgress(assetId, progress, status) {
        this.onProgress.forEach(callback => {
            callback(assetId, progress, status);
        });
    }

    notifyComplete(assetId, data) {
        this.onComplete.forEach(callback => {
            callback(assetId, data);
        });
    }

    notifyError(assetId, error) {
        this.onError.forEach(callback => {
            callback(assetId, error);
        });
    }

    /**
     * Add event listeners
     */
    addEventListener(event, callback) {
        switch (event) {
            case 'progress':
                this.onProgress.add(callback);
                break;
            case 'complete':
                this.onComplete.add(callback);
                break;
            case 'error':
                this.onError.add(callback);
                break;
        }
    }

    removeEventListener(event, callback) {
        switch (event) {
            case 'progress':
                this.onProgress.delete(callback);
                break;
            case 'complete':
                this.onComplete.delete(callback);
                break;
            case 'error':
                this.onError.delete(callback);
                break;
        }
    }

    /**
     * Clean up resources
     */
    dispose() {
        this.clearCache();
        this.loadQueue.length = 0;
        this.loadingAssets.clear();
        this.loadedAssets.clear();
        this.failedAssets.clear();
        this.onProgress.clear();
        this.onComplete.clear();
        this.onError.clear();
    }
}

// Export for use in other modules
window.SmartAssetLoader = SmartAssetLoader;