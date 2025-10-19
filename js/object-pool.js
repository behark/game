/**
 * Object Pool Manager - Efficient memory management for Speed Rivals
 * Reuses objects to minimize garbage collection and improve performance
 */

class ObjectPoolManager {
    constructor(performanceManager) {
        this.performanceManager = performanceManager;

        // Pool collections
        this.pools = new Map();
        this.poolConfigs = new Map();

        // Statistics
        this.stats = {
            totalPools: 0,
            totalObjectsInPools: 0,
            totalAllocations: 0,
            totalRecycles: 0,
            memoryUsed: 0,
            lastCleanup: 0
        };

        // Cleanup settings
        this.cleanupInterval = 5000; // 5 seconds
        this.maxIdleTime = 10000;    // 10 seconds before cleanup
        this.maxPoolSize = 1000;     // Maximum objects per pool

        console.log('♻️ Object Pool Manager initialized');
    }

    /**
     * Create a new object pool
     */
    createPool(poolName, factory, config = {}) {
        const poolConfig = {
            factory,                    // Function that creates new objects
            reset: config.reset || null, // Function to reset objects for reuse
            validate: config.validate || null, // Function to validate objects before reuse
            initialSize: config.initialSize || 10,
            maxSize: config.maxSize || this.maxPoolSize,
            expandSize: config.expandSize || 5,
            autoCleanup: config.autoCleanup !== false,
            ...config
        };

        const pool = {
            available: [],
            inUse: new Set(),
            config: poolConfig,
            stats: {
                created: 0,
                allocated: 0,
                recycled: 0,
                cleaned: 0,
                maxConcurrent: 0
            }
        };

        // Pre-populate pool
        for (let i = 0; i < poolConfig.initialSize; i++) {
            const obj = this.createPooledObject(pool);
            pool.available.push(obj);
        }

        this.pools.set(poolName, pool);
        this.poolConfigs.set(poolName, poolConfig);

        console.log(`📦 Created pool '${poolName}' with ${poolConfig.initialSize} objects`);
        return pool;
    }

    /**
     * Create a new object for the pool
     */
    createPooledObject(pool) {
        const obj = pool.config.factory();
        obj._poolData = {
            createdAt: performance.now(),
            lastUsed: performance.now(),
            useCount: 0,
            poolName: null
        };
        pool.stats.created++;
        return obj;
    }

    /**
     * Get an object from the pool
     */
    get(poolName) {
        const pool = this.pools.get(poolName);
        if (!pool) {
            console.error(`Pool '${poolName}' not found`);
            return null;
        }

        let obj;

        // Try to get from available objects
        if (pool.available.length > 0) {
            obj = pool.available.pop();
        } else {
            // Create new object if pool is empty and under max size
            if (pool.inUse.size < pool.config.maxSize) {
                obj = this.createPooledObject(pool);
            } else {
                console.warn(`Pool '${poolName}' at maximum capacity (${pool.config.maxSize})`);
                return null;
            }
        }

        // Reset object if reset function is provided
        if (pool.config.reset) {
            pool.config.reset(obj);
        }

        // Update tracking
        obj._poolData.lastUsed = performance.now();
        obj._poolData.useCount++;
        obj._poolData.poolName = poolName;

        pool.inUse.add(obj);
        pool.stats.allocated++;
        this.stats.totalAllocations++;

        // Update max concurrent usage
        pool.stats.maxConcurrent = Math.max(pool.stats.maxConcurrent, pool.inUse.size);

        return obj;
    }

    /**
     * Return an object to the pool
     */
    release(obj) {
        if (!obj || !obj._poolData || !obj._poolData.poolName) {
            console.warn('Attempting to release non-pooled object');
            return false;
        }

        const poolName = obj._poolData.poolName;
        const pool = this.pools.get(poolName);
        if (!pool) {
            console.error(`Pool '${poolName}' not found for release`);
            return false;
        }

        if (!pool.inUse.has(obj)) {
            console.warn('Object not found in pool in-use set');
            return false;
        }

        // Validate object before returning to pool
        if (pool.config.validate && !pool.config.validate(obj)) {
            console.warn('Object failed validation, discarding');
            pool.inUse.delete(obj);
            return false;
        }

        // Move from in-use to available
        pool.inUse.delete(obj);
        pool.available.push(obj);

        // Update stats
        pool.stats.recycled++;
        this.stats.totalRecycles++;

        obj._poolData.lastUsed = performance.now();

        return true;
    }

    /**
     * Batch allocate multiple objects
     */
    allocateBatch(poolName, count) {
        const objects = [];
        for (let i = 0; i < count; i++) {
            const obj = this.get(poolName);
            if (obj) {
                objects.push(obj);
            } else {
                break; // Stop if pool is exhausted
            }
        }
        return objects;
    }

    /**
     * Batch release multiple objects
     */
    releaseBatch(objects) {
        for (const obj of objects) {
            this.release(obj);
        }
    }

    /**
     * Clean up idle objects to free memory
     */
    cleanup(force = false) {
        const now = performance.now();
        let totalCleaned = 0;

        for (const [poolName, pool] of this.pools) {
            if (!pool.config.autoCleanup && !force) continue;

            let cleaned = 0;
            const minSize = Math.floor(pool.config.initialSize / 2);

            // Clean available objects that haven't been used recently
            pool.available = pool.available.filter(obj => {
                const idle = now - obj._poolData.lastUsed;
                const shouldClean = idle > this.maxIdleTime && pool.available.length > minSize;

                if (shouldClean) {
                    cleaned++;
                    return false;
                }
                return true;
            });

            pool.stats.cleaned += cleaned;
            totalCleaned += cleaned;

            if (cleaned > 0) {
                console.log(`🧹 Cleaned ${cleaned} idle objects from pool '${poolName}'`);
            }
        }

        this.stats.lastCleanup = now;
        return totalCleaned;
    }

    /**
     * Auto cleanup scheduler
     */
    startAutoCleanup() {
        setInterval(() => {
            this.cleanup();
        }, this.cleanupInterval);
    }

    /**
     * Expand a pool by adding more objects
     */
    expandPool(poolName, additionalSize = null) {
        const pool = this.pools.get(poolName);
        if (!pool) return false;

        const expandBy = additionalSize || pool.config.expandSize;
        const currentTotal = pool.available.length + pool.inUse.size;

        if (currentTotal + expandBy > pool.config.maxSize) {
            console.warn(`Cannot expand pool '${poolName}' beyond max size`);
            return false;
        }

        for (let i = 0; i < expandBy; i++) {
            const obj = this.createPooledObject(pool);
            pool.available.push(obj);
        }

        console.log(`📈 Expanded pool '${poolName}' by ${expandBy} objects`);
        return true;
    }

    /**
     * Pre-built pool factories for common game objects
     */
    static createParticleFactory() {
        return () => {
            const geometry = new THREE.SphereGeometry(0.1, 4, 4);
            const material = new THREE.MeshBasicMaterial({
                transparent: true,
                opacity: 1.0
            });
            const particle = new THREE.Mesh(geometry, material);

            // Add particle-specific properties
            particle.velocity = new THREE.Vector3();
            particle.acceleration = new THREE.Vector3();
            particle.life = 1.0;
            particle.maxLife = 1.0;
            particle.size = 1.0;

            return particle;
        };
    }

    static createParticleReset() {
        return (particle) => {
            particle.position.set(0, 0, 0);
            particle.velocity.set(0, 0, 0);
            particle.acceleration.set(0, 0, 0);
            particle.life = 1.0;
            particle.maxLife = 1.0;
            particle.size = 1.0;
            particle.material.opacity = 1.0;
            particle.visible = true;
            particle.scale.set(1, 1, 1);
        };
    }

    static createSmokeParticleFactory() {
        return () => {
            const geometry = new THREE.PlaneGeometry(1, 1);
            const material = new THREE.MeshBasicMaterial({
                color: 0x555555,
                transparent: true,
                opacity: 0.5,
                side: THREE.DoubleSide
            });
            const smoke = new THREE.Mesh(geometry, material);

            smoke.velocity = new THREE.Vector3();
            smoke.life = 1.0;
            smoke.maxLife = 2.0;
            smoke.rotationSpeed = 0;

            return smoke;
        };
    }

    static createSparkFactory() {
        return () => {
            const geometry = new THREE.SphereGeometry(0.05, 3, 3);
            const material = new THREE.MeshBasicMaterial({
                color: 0xffaa00,
                emissive: 0xff4400
            });
            const spark = new THREE.Mesh(geometry, material);

            spark.velocity = new THREE.Vector3();
            spark.gravity = -20;
            spark.life = 1.0;
            spark.maxLife = 0.5;

            return spark;
        };
    }

    static createDecalFactory() {
        return () => {
            const geometry = new THREE.PlaneGeometry(2, 2);
            const material = new THREE.MeshBasicMaterial({
                color: 0x222222,
                transparent: true,
                opacity: 0.8
            });
            const decal = new THREE.Mesh(geometry, material);
            decal.rotation.x = -Math.PI / 2; // Lay flat on ground

            decal.fadeSpeed = 0.1;
            decal.life = 1.0;
            decal.maxLife = 10.0;

            return decal;
        };
    }

    /**
     * Initialize common pools for Speed Rivals
     */
    initializeGamePools() {
        // Particle pools
        this.createPool('particles', ObjectPoolManager.createParticleFactory(), {
            reset: ObjectPoolManager.createParticleReset(),
            initialSize: 50,
            maxSize: 500,
            expandSize: 20
        });

        this.createPool('smoke', ObjectPoolManager.createSmokeParticleFactory(), {
            reset: ObjectPoolManager.createParticleReset(),
            initialSize: 30,
            maxSize: 200,
            expandSize: 15
        });

        this.createPool('sparks', ObjectPoolManager.createSparkFactory(), {
            reset: ObjectPoolManager.createParticleReset(),
            initialSize: 20,
            maxSize: 100,
            expandSize: 10
        });

        this.createPool('decals', ObjectPoolManager.createDecalFactory(), {
            reset: (decal) => {
                decal.position.set(0, 0, 0);
                decal.material.opacity = 0.8;
                decal.life = 1.0;
                decal.visible = true;
            },
            initialSize: 10,
            maxSize: 50,
            expandSize: 5
        });

        // Start auto cleanup
        this.startAutoCleanup();

        console.log('🎮 Game object pools initialized');
    }

    /**
     * Get pool statistics
     */
    getStats() {
        this.stats.totalPools = this.pools.size;
        this.stats.totalObjectsInPools = 0;

        const poolStats = {};
        for (const [name, pool] of this.pools) {
            const totalObjects = pool.available.length + pool.inUse.size;
            this.stats.totalObjectsInPools += totalObjects;

            poolStats[name] = {
                available: pool.available.length,
                inUse: pool.inUse.size,
                total: totalObjects,
                ...pool.stats
            };
        }

        return {
            ...this.stats,
            pools: poolStats
        };
    }

    /**
     * Memory usage estimation
     */
    estimateMemoryUsage() {
        let totalMemory = 0;

        for (const [name, pool] of this.pools) {
            const totalObjects = pool.available.length + pool.inUse.size;
            // Rough estimate: each object uses about 1KB (this varies greatly)
            totalMemory += totalObjects * 1024;
        }

        this.stats.memoryUsed = totalMemory;
        return totalMemory;
    }

    /**
     * Clear all pools
     */
    clear() {
        for (const [name, pool] of this.pools) {
            pool.available.length = 0;
            pool.inUse.clear();
        }
        console.log('🗑️ All object pools cleared');
    }

    /**
     * Destroy pool manager and clean up resources
     */
    destroy() {
        this.clear();
        this.pools.clear();
        this.poolConfigs.clear();
    }

    /**
     * Debug information
     */
    showDebugInfo() {
        console.log('Object Pool Manager Stats:', this.getStats());
        console.log('Estimated Memory Usage:', (this.estimateMemoryUsage() / 1024 / 1024).toFixed(2) + ' MB');
    }
}

// Export for use in other modules
window.ObjectPoolManager = ObjectPoolManager;