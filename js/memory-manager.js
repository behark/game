/**
 * Memory Manager - Advanced memory optimization for Speed Rivals
 * Minimizes garbage collection and optimizes memory usage patterns
 */

class MemoryManager {
    constructor(performanceManager) {
        this.performanceManager = performanceManager;

        // Memory tracking
        this.memoryStats = {
            totalUsed: 0,
            jsHeapSize: 0,
            usedJSHeapSize: 0,
            heapLimit: 0,
            gcCount: 0,
            lastGCTime: 0,
            memoryPressure: 0
        };

        // Memory pools for frequent allocations
        this.memoryPools = {
            vectors: this.createVectorPool(1000),
            matrices: this.createMatrixPool(100),
            quaternions: this.createQuaternionPool(500),
            colors: this.createColorPool(500),
            boxes: this.createBox3Pool(200)
        };

        // Weak references for cleanup
        this.managedObjects = new WeakMap();
        this.cleanupCallbacks = new Set();

        // Memory optimization settings
        this.config = {
            gcThreshold: 0.8,           // Trigger cleanup at 80% memory usage
            forceGCInterval: 30000,     // Force GC every 30 seconds
            poolGrowthFactor: 1.5,      // Grow pools by 50% when needed
            maxPoolSize: 10000,         // Maximum pool size
            memoryWarningThreshold: 0.9 // Warn at 90% memory usage
        };

        // Platform adjustments
        this.adjustConfigForPlatform();

        // GC monitoring
        this.gcObserver = null;
        this.initGCMonitoring();

        // Periodic cleanup
        this.cleanupInterval = setInterval(() => {
            this.performPeriodicCleanup();
        }, this.config.forceGCInterval);

        console.log('🧠 Memory Manager initialized');
        console.log(`Platform memory: ${this.performanceManager?.platform?.memory || 'unknown'}GB`);
    }

    /**
     * Adjust configuration based on platform
     */
    adjustConfigForPlatform() {
        if (!this.performanceManager) return;

        const platform = this.performanceManager.platform;
        const memory = platform.memory || 4;

        // Mobile optimizations
        if (platform.isMobile) {
            this.config.gcThreshold = 0.7;      // More aggressive on mobile
            this.config.forceGCInterval = 20000; // More frequent cleanup
            this.config.maxPoolSize = 5000;      // Smaller pools

            // Reduce pool sizes
            this.memoryPools.vectors = this.createVectorPool(500);
            this.memoryPools.matrices = this.createMatrixPool(50);
            this.memoryPools.quaternions = this.createQuaternionPool(250);
        }

        // Low memory devices
        if (memory < 4) {
            this.config.gcThreshold = 0.6;
            this.config.memoryWarningThreshold = 0.75;
            this.config.maxPoolSize = 3000;
        }

        // High memory devices
        if (memory >= 16) {
            this.config.gcThreshold = 0.9;
            this.config.maxPoolSize = 20000;
        }
    }

    /**
     * Initialize garbage collection monitoring
     */
    initGCMonitoring() {
        // Modern browsers performance observer
        if ('PerformanceObserver' in window) {
            try {
                this.gcObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.entryType === 'measure' && entry.name.includes('gc')) {
                            this.memoryStats.gcCount++;
                            this.memoryStats.lastGCTime = performance.now();
                        }
                    }
                });
                this.gcObserver.observe({ entryTypes: ['measure'] });
            } catch (e) {
                console.log('GC monitoring not available');
            }
        }
    }

    /**
     * Create vector pool for Three.js Vector3 objects
     */
    createVectorPool(size) {
        const pool = {
            objects: [],
            inUse: new Set(),
            created: 0,
            reused: 0
        };

        // Pre-populate pool
        for (let i = 0; i < size; i++) {
            pool.objects.push(new THREE.Vector3());
            pool.created++;
        }

        return pool;
    }

    /**
     * Create matrix pool for Three.js Matrix4 objects
     */
    createMatrixPool(size) {
        const pool = {
            objects: [],
            inUse: new Set(),
            created: 0,
            reused: 0
        };

        for (let i = 0; i < size; i++) {
            pool.objects.push(new THREE.Matrix4());
            pool.created++;
        }

        return pool;
    }

    /**
     * Create quaternion pool
     */
    createQuaternionPool(size) {
        const pool = {
            objects: [],
            inUse: new Set(),
            created: 0,
            reused: 0
        };

        for (let i = 0; i < size; i++) {
            pool.objects.push(new THREE.Quaternion());
            pool.created++;
        }

        return pool;
    }

    /**
     * Create color pool
     */
    createColorPool(size) {
        const pool = {
            objects: [],
            inUse: new Set(),
            created: 0,
            reused: 0
        };

        for (let i = 0; i < size; i++) {
            pool.objects.push(new THREE.Color());
            pool.created++;
        }

        return pool;
    }

    /**
     * Create Box3 pool for bounding boxes
     */
    createBox3Pool(size) {
        const pool = {
            objects: [],
            inUse: new Set(),
            created: 0,
            reused: 0
        };

        for (let i = 0; i < size; i++) {
            pool.objects.push(new THREE.Box3());
            pool.created++;
        }

        return pool;
    }

    /**
     * Get object from pool
     */
    getFromPool(poolName) {
        const pool = this.memoryPools[poolName];
        if (!pool) {
            console.error(`Pool '${poolName}' does not exist`);
            return null;
        }

        let obj;

        // Try to get from available objects
        if (pool.objects.length > 0) {
            obj = pool.objects.pop();
            pool.reused++;
        } else {
            // Create new object if pool is empty
            obj = this.createPoolObject(poolName);
            pool.created++;
        }

        pool.inUse.add(obj);
        return obj;
    }

    /**
     * Create new object for pool
     */
    createPoolObject(poolName) {
        switch (poolName) {
            case 'vectors':
                return new THREE.Vector3();
            case 'matrices':
                return new THREE.Matrix4();
            case 'quaternions':
                return new THREE.Quaternion();
            case 'colors':
                return new THREE.Color();
            case 'boxes':
                return new THREE.Box3();
            default:
                throw new Error(`Unknown pool type: ${poolName}`);
        }
    }

    /**
     * Return object to pool
     */
    returnToPool(poolName, obj) {
        const pool = this.memoryPools[poolName];
        if (!pool || !pool.inUse.has(obj)) {
            return false;
        }

        // Reset object to default state
        this.resetPoolObject(poolName, obj);

        pool.inUse.delete(obj);

        // Return to pool if under max size
        if (pool.objects.length < this.config.maxPoolSize) {
            pool.objects.push(obj);
        }

        return true;
    }

    /**
     * Reset object to default state
     */
    resetPoolObject(poolName, obj) {
        switch (poolName) {
            case 'vectors':
                obj.set(0, 0, 0);
                break;
            case 'matrices':
                obj.identity();
                break;
            case 'quaternions':
                obj.set(0, 0, 0, 1);
                break;
            case 'colors':
                obj.setRGB(1, 1, 1);
                break;
            case 'boxes':
                obj.makeEmpty();
                break;
        }
    }

    /**
     * Optimized temporary object creation
     */
    createTemp(type) {
        return this.getFromPool(type + 's'); // vectors, matrices, etc.
    }

    /**
     * Release temporary object
     */
    releaseTemp(type, obj) {
        return this.returnToPool(type + 's', obj);
    }

    /**
     * Batch release multiple temporary objects
     */
    releaseTempBatch(objects) {
        for (const { type, obj } of objects) {
            this.releaseTemp(type, obj);
        }
    }

    /**
     * Monitor memory usage
     */
    updateMemoryStats() {
        // Use performance.memory if available (Chrome)
        if ('memory' in performance) {
            this.memoryStats.jsHeapSize = performance.memory.totalJSHeapSize;
            this.memoryStats.usedJSHeapSize = performance.memory.usedJSHeapSize;
            this.memoryStats.heapLimit = performance.memory.jsHeapSizeLimit;

            // Calculate memory pressure
            this.memoryStats.memoryPressure =
                this.memoryStats.usedJSHeapSize / this.memoryStats.heapLimit;
        }

        // Estimate total memory usage
        this.memoryStats.totalUsed = this.estimateTotalMemoryUsage();

        // Check for memory pressure
        if (this.memoryStats.memoryPressure > this.config.memoryWarningThreshold) {
            this.handleMemoryPressure();
        }
    }

    /**
     * Estimate total memory usage
     */
    estimateTotalMemoryUsage() {
        let total = this.memoryStats.usedJSHeapSize || 0;

        // Add estimated pool memory
        for (const [name, pool] of Object.entries(this.memoryPools)) {
            const objectSize = this.getObjectSize(name);
            total += (pool.objects.length + pool.inUse.size) * objectSize;
        }

        return total;
    }

    /**
     * Get estimated object size in bytes
     */
    getObjectSize(poolName) {
        switch (poolName) {
            case 'vectors':
                return 3 * 8; // 3 doubles
            case 'matrices':
                return 16 * 8; // 16 doubles
            case 'quaternions':
                return 4 * 8; // 4 doubles
            case 'colors':
                return 3 * 8; // 3 doubles
            case 'boxes':
                return 6 * 8; // 6 doubles (min + max)
            default:
                return 64; // Default estimate
        }
    }

    /**
     * Handle memory pressure situations
     */
    handleMemoryPressure() {
        console.warn('⚠️ Memory pressure detected, performing cleanup');

        // Aggressive cleanup
        this.performAggressiveCleanup();

        // Notify performance manager
        if (this.performanceManager) {
            this.performanceManager.onPerformanceAlert.forEach(callback => {
                callback('memory', this.memoryStats.memoryPressure);
            });
        }

        // Force garbage collection if possible
        this.forceGarbageCollection();
    }

    /**
     * Perform aggressive cleanup
     */
    performAggressiveCleanup() {
        // Shrink pools to minimum size
        for (const [name, pool] of Object.entries(this.memoryPools)) {
            const minSize = Math.floor(pool.objects.length * 0.3);
            pool.objects = pool.objects.slice(0, minSize);
        }

        // Execute cleanup callbacks
        this.cleanupCallbacks.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.error('Cleanup callback error:', error);
            }
        });

        console.log('🧹 Aggressive memory cleanup performed');
    }

    /**
     * Force garbage collection (if available)
     */
    forceGarbageCollection() {
        // Trigger GC through memory pressure (not guaranteed)
        if ('gc' in window && typeof window.gc === 'function') {
            window.gc();
        } else {
            // Fallback: create memory pressure
            try {
                const temp = new Array(100000).fill(0).map(() => ({}));
                temp.length = 0;
            } catch (e) {
                // Ignore errors
            }
        }
    }

    /**
     * Periodic cleanup routine
     */
    performPeriodicCleanup() {
        this.updateMemoryStats();

        // Check if cleanup is needed
        if (this.memoryStats.memoryPressure > this.config.gcThreshold) {
            this.performCleanup();
        }

        // Log memory stats periodically
        if (Math.random() < 0.1) { // 10% chance
            this.logMemoryStats();
        }
    }

    /**
     * Regular cleanup routine
     */
    performCleanup() {
        // Trim pools to reasonable size
        for (const [name, pool] of Object.entries(this.memoryPools)) {
            const targetSize = Math.floor(pool.objects.length * 0.7);
            if (pool.objects.length > targetSize) {
                pool.objects = pool.objects.slice(0, targetSize);
            }
        }

        console.log('🧹 Memory cleanup performed');
    }

    /**
     * Register cleanup callback
     */
    addCleanupCallback(callback) {
        this.cleanupCallbacks.add(callback);
    }

    /**
     * Remove cleanup callback
     */
    removeCleanupCallback(callback) {
        this.cleanupCallbacks.delete(callback);
    }

    /**
     * Track object for automatic cleanup
     */
    trackObject(obj, cleanupFn) {
        this.managedObjects.set(obj, cleanupFn);
    }

    /**
     * Clean up tracked object
     */
    cleanupObject(obj) {
        const cleanupFn = this.managedObjects.get(obj);
        if (cleanupFn) {
            cleanupFn();
            this.managedObjects.delete(obj);
        }
    }

    /**
     * Optimize garbage collection timing
     */
    optimizeGCTiming() {
        // Schedule GC during low activity periods
        const now = performance.now();
        const timeSinceLastGC = now - this.memoryStats.lastGCTime;

        // Force GC if it's been a while and memory pressure is high
        if (timeSinceLastGC > this.config.forceGCInterval &&
            this.memoryStats.memoryPressure > this.config.gcThreshold) {
            this.forceGarbageCollection();
        }
    }

    /**
     * Create memory-efficient arrays
     */
    createOptimizedArray(type, size) {
        switch (type) {
            case 'float32':
                return new Float32Array(size);
            case 'uint16':
                return new Uint16Array(size);
            case 'uint32':
                return new Uint32Array(size);
            case 'int16':
                return new Int16Array(size);
            case 'int32':
                return new Int32Array(size);
            default:
                return new Array(size);
        }
    }

    /**
     * Get memory statistics
     */
    getStats() {
        this.updateMemoryStats();

        const poolStats = {};
        for (const [name, pool] of Object.entries(this.memoryPools)) {
            poolStats[name] = {
                available: pool.objects.length,
                inUse: pool.inUse.size,
                created: pool.created,
                reused: pool.reused,
                efficiency: pool.reused / Math.max(pool.created, 1)
            };
        }

        return {
            ...this.memoryStats,
            pools: poolStats,
            managedObjects: this.managedObjects.size || 0,
            cleanupCallbacks: this.cleanupCallbacks.size
        };
    }

    /**
     * Log memory statistics
     */
    logMemoryStats() {
        const stats = this.getStats();
        const usedMB = (stats.usedJSHeapSize / 1024 / 1024).toFixed(1);
        const totalMB = (stats.jsHeapSize / 1024 / 1024).toFixed(1);
        const pressure = (stats.memoryPressure * 100).toFixed(1);

        console.log(`🧠 Memory: ${usedMB}MB/${totalMB}MB (${pressure}% pressure)`);
        console.log('Pool efficiency:', Object.fromEntries(
            Object.entries(stats.pools).map(([name, pool]) =>
                [name, `${(pool.efficiency * 100).toFixed(1)}%`])
        ));
    }

    /**
     * Dispose memory manager
     */
    dispose() {
        // Clear cleanup interval
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }

        // Disconnect GC observer
        if (this.gcObserver) {
            this.gcObserver.disconnect();
        }

        // Clear all pools
        for (const pool of Object.values(this.memoryPools)) {
            pool.objects.length = 0;
            pool.inUse.clear();
        }

        // Clear callbacks
        this.cleanupCallbacks.clear();

        console.log('🧠 Memory Manager disposed');
    }
}

// Export for use in other modules
window.MemoryManager = MemoryManager;