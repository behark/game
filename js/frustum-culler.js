/**
 * Frustum Culler - Efficient visibility culling system for Speed Rivals
 * Uses spatial indexing and frustum testing to hide objects outside camera view
 */

class FrustumCuller {
    constructor(performanceManager) {
        this.performanceManager = performanceManager;

        // Core components
        this.camera = null;
        this.frustum = new THREE.Frustum();
        this.cameraMatrix = new THREE.Matrix4();

        // Spatial indexing - Octree for 3D space partitioning
        this.octree = null;
        this.octreeSize = 1000; // World size
        this.octreeDepth = 4;   // Subdivision levels

        // Culling objects
        this.cullableObjects = new Set();
        this.visibleObjects = new Set();
        this.culledObjects = new Set();

        // Performance optimization
        this.cullEveryNFrames = 2; // Cull every N frames to reduce CPU overhead
        this.frameCounter = 0;
        this.lastCullTime = 0;

        // Culling zones for different object types
        this.cullZones = {
            static: new Set(),      // Buildings, trees, barriers
            dynamic: new Set(),     // Cars, moving objects
            particles: new Set(),   // Particle systems
            ui: new Set()          // UI elements that need culling
        };

        // Statistics
        this.stats = {
            totalObjects: 0,
            visibleObjects: 0,
            culledObjects: 0,
            octreeNodes: 0,
            cullTime: 0,
            frameSkipped: false
        };

        console.log('👁️ Frustum Culler initialized');
    }

    init(camera, scene) {
        this.camera = camera;
        this.scene = scene;
        this.initOctree();
        console.log('✅ Frustum Culler ready');
    }

    /**
     * Initialize spatial indexing octree
     */
    initOctree() {
        this.octree = new SimpleOctree(
            new THREE.Vector3(-this.octreeSize/2, -this.octreeSize/2, -this.octreeSize/2),
            this.octreeSize,
            this.octreeDepth
        );
    }

    /**
     * Register an object for frustum culling
     */
    registerObject(object, type = 'static', config = {}) {
        const cullData = {
            object,
            type,
            boundingSphere: new THREE.Sphere(),
            boundingBox: new THREE.Box3(),
            lastVisible: true,
            cullingEnabled: true,
            forcedVisible: false, // Always visible regardless of frustum
            ...config
        };

        // Calculate initial bounding volumes
        this.updateBoundingVolumes(cullData);

        // Add to appropriate culling zone
        this.cullZones[type].add(cullData);
        this.cullableObjects.add(cullData);

        // Add to spatial index for static objects
        if (type === 'static') {
            this.octree.addObject(cullData);
        }
    }

    /**
     * Update bounding volumes for an object
     */
    updateBoundingVolumes(cullData) {
        const { object } = cullData;

        // Update bounding box
        cullData.boundingBox.setFromObject(object);

        // Update bounding sphere from bounding box
        cullData.boundingBox.getBoundingSphere(cullData.boundingSphere);

        // Add small margin for safety
        cullData.boundingSphere.radius *= 1.1;
    }

    /**
     * Main culling update function
     */
    update() {
        const startTime = performance.now();

        this.frameCounter++;

        // Skip culling on some frames to reduce CPU load
        if (this.frameCounter % this.cullEveryNFrames !== 0) {
            this.stats.frameSkipped = true;
            return;
        }

        this.stats.frameSkipped = false;

        if (!this.camera) return;

        // Update camera frustum
        this.updateFrustum();

        // Perform culling
        this.performCulling();

        // Update statistics
        this.stats.cullTime = performance.now() - startTime;
        this.lastCullTime = performance.now();
    }

    /**
     * Update camera frustum matrix
     */
    updateFrustum() {
        this.cameraMatrix.multiplyMatrices(
            this.camera.projectionMatrix,
            this.camera.matrixWorldInverse
        );
        this.frustum.setFromProjectionMatrix(this.cameraMatrix);
    }

    /**
     * Perform frustum culling on all registered objects
     */
    performCulling() {
        this.visibleObjects.clear();
        this.culledObjects.clear();

        let totalObjects = 0;
        let visibleCount = 0;
        let culledCount = 0;

        // Cull different zones with different strategies
        for (const [zoneType, objects] of Object.entries(this.cullZones)) {
            const zoneResults = this.cullZone(objects, zoneType);
            totalObjects += zoneResults.total;
            visibleCount += zoneResults.visible;
            culledCount += zoneResults.culled;
        }

        // Update stats
        this.stats.totalObjects = totalObjects;
        this.stats.visibleObjects = visibleCount;
        this.stats.culledObjects = culledCount;
    }

    /**
     * Cull objects in a specific zone
     */
    cullZone(objects, zoneType) {
        let total = 0;
        let visible = 0;
        let culled = 0;

        for (const cullData of objects) {
            if (!cullData.cullingEnabled || cullData.forcedVisible) {
                this.setObjectVisible(cullData, true);
                visible++;
                total++;
                continue;
            }

            total++;

            // Update bounding volumes for dynamic objects
            if (zoneType === 'dynamic' || zoneType === 'particles') {
                this.updateBoundingVolumes(cullData);
            }

            // Perform frustum test
            const isVisible = this.testFrustum(cullData);

            if (isVisible !== cullData.lastVisible) {
                this.setObjectVisible(cullData, isVisible);
                cullData.lastVisible = isVisible;
            }

            if (isVisible) {
                this.visibleObjects.add(cullData);
                visible++;
            } else {
                this.culledObjects.add(cullData);
                culled++;
            }
        }

        return { total, visible, culled };
    }

    /**
     * Test if object is within camera frustum
     */
    testFrustum(cullData) {
        const { boundingSphere, boundingBox } = cullData;

        // First, quick sphere test
        if (!this.frustum.intersectsSphere(boundingSphere)) {
            return false;
        }

        // More precise box test for objects that passed sphere test
        return this.frustum.intersectsBox(boundingBox);
    }

    /**
     * Set object visibility
     */
    setObjectVisible(cullData, visible) {
        const { object } = cullData;

        if (object.visible !== visible) {
            object.visible = visible;

            // If object has children, apply visibility recursively
            if (object.children && object.children.length > 0) {
                this.setChildrenVisible(object, visible);
            }
        }
    }

    /**
     * Recursively set children visibility
     */
    setChildrenVisible(parent, visible) {
        parent.children.forEach(child => {
            child.visible = visible;
            if (child.children && child.children.length > 0) {
                this.setChildrenVisible(child, visible);
            }
        });
    }

    /**
     * Get potentially visible objects using spatial indexing
     */
    getVisibleCandidates() {
        if (!this.octree) return new Set(this.cullableObjects);

        // Query octree with camera frustum
        const candidates = new Set();
        this.octree.queryFrustum(this.frustum, candidates);

        // Always include dynamic objects
        for (const cullData of this.cullZones.dynamic) {
            candidates.add(cullData);
        }

        for (const cullData of this.cullZones.particles) {
            candidates.add(cullData);
        }

        return candidates;
    }

    /**
     * Enable/disable culling for specific object
     */
    setCullingEnabled(object, enabled) {
        for (const cullData of this.cullableObjects) {
            if (cullData.object === object) {
                cullData.cullingEnabled = enabled;
                if (!enabled) {
                    this.setObjectVisible(cullData, true);
                }
                break;
            }
        }
    }

    /**
     * Force object to always be visible
     */
    setAlwaysVisible(object, alwaysVisible) {
        for (const cullData of this.cullableObjects) {
            if (cullData.object === object) {
                cullData.forcedVisible = alwaysVisible;
                if (alwaysVisible) {
                    this.setObjectVisible(cullData, true);
                }
                break;
            }
        }
    }

    /**
     * Unregister object from culling
     */
    unregisterObject(object) {
        for (const [zoneType, objects] of Object.entries(this.cullZones)) {
            for (const cullData of objects) {
                if (cullData.object === object) {
                    objects.delete(cullData);
                    this.cullableObjects.delete(cullData);

                    // Remove from octree if it's a static object
                    if (zoneType === 'static') {
                        this.octree.removeObject(cullData);
                    }
                    return;
                }
            }
        }
    }

    /**
     * Adjust culling frequency based on performance
     */
    adjustCullingFrequency() {
        if (!this.performanceManager) return;

        const fps = this.performanceManager.metrics.fps;
        const targetFPS = this.performanceManager.currentQuality.targetFPS;

        // If performance is struggling, reduce culling frequency
        if (fps < targetFPS * 0.8) {
            this.cullEveryNFrames = Math.min(4, this.cullEveryNFrames + 1);
        } else if (fps > targetFPS * 1.1) {
            this.cullEveryNFrames = Math.max(1, this.cullEveryNFrames - 1);
        }
    }

    /**
     * Get culling statistics
     */
    getStats() {
        return {
            ...this.stats,
            cullFrequency: this.cullEveryNFrames,
            octreeNodes: this.octree ? this.octree.getNodeCount() : 0
        };
    }

    /**
     * Debug visualization
     */
    showDebugInfo() {
        console.log('Frustum Culler Stats:', this.getStats());

        // Visualize frustum (for debugging)
        if (this.scene && window.debugMode) {
            this.visualizeFrustum();
        }
    }

    /**
     * Visualize camera frustum for debugging
     */
    visualizeFrustum() {
        // Remove previous debug frustum
        const existing = this.scene.getObjectByName('debug-frustum');
        if (existing) {
            this.scene.remove(existing);
        }

        // Create frustum visualization
        const helper = new THREE.CameraHelper(this.camera);
        helper.name = 'debug-frustum';
        helper.material.color.setHex(0xff0000);
        helper.material.opacity = 0.3;
        helper.material.transparent = true;
        this.scene.add(helper);
    }

    /**
     * Clear all culling data
     */
    clear() {
        for (const objects of Object.values(this.cullZones)) {
            objects.clear();
        }
        this.cullableObjects.clear();
        this.visibleObjects.clear();
        this.culledObjects.clear();

        if (this.octree) {
            this.initOctree();
        }
    }
}

/**
 * Simple Octree implementation for spatial indexing
 */
class SimpleOctree {
    constructor(center, size, maxDepth) {
        this.center = center;
        this.size = size;
        this.maxDepth = maxDepth;
        this.depth = 0;
        this.objects = [];
        this.children = null;
        this.maxObjects = 10;
    }

    addObject(cullData) {
        // If this node is subdivided, add to appropriate child
        if (this.children) {
            const childIndex = this.getChildIndex(cullData.boundingSphere.center);
            if (childIndex !== -1) {
                this.children[childIndex].addObject(cullData);
                return;
            }
        }

        // Add to this node
        this.objects.push(cullData);

        // Subdivide if necessary
        if (this.objects.length > this.maxObjects && this.depth < this.maxDepth) {
            this.subdivide();
        }
    }

    subdivide() {
        if (this.children) return;

        this.children = [];
        const halfSize = this.size / 2;
        const quarterSize = this.size / 4;

        // Create 8 child nodes
        for (let i = 0; i < 8; i++) {
            const x = this.center.x + (i & 1 ? quarterSize : -quarterSize);
            const y = this.center.y + (i & 2 ? quarterSize : -quarterSize);
            const z = this.center.z + (i & 4 ? quarterSize : -quarterSize);

            const child = new SimpleOctree(
                new THREE.Vector3(x, y, z),
                halfSize,
                this.maxDepth
            );
            child.depth = this.depth + 1;
            this.children.push(child);
        }

        // Redistribute objects to children
        const objectsToRedistribute = [...this.objects];
        this.objects = [];

        for (const obj of objectsToRedistribute) {
            this.addObject(obj);
        }
    }

    getChildIndex(position) {
        let index = 0;
        if (position.x > this.center.x) index |= 1;
        if (position.y > this.center.y) index |= 2;
        if (position.z > this.center.z) index |= 4;
        return index;
    }

    queryFrustum(frustum, results) {
        // Test if this node intersects with frustum
        const nodeBox = new THREE.Box3(
            new THREE.Vector3(
                this.center.x - this.size/2,
                this.center.y - this.size/2,
                this.center.z - this.size/2
            ),
            new THREE.Vector3(
                this.center.x + this.size/2,
                this.center.y + this.size/2,
                this.center.z + this.size/2
            )
        );

        if (!frustum.intersectsBox(nodeBox)) {
            return;
        }

        // Add objects from this node
        for (const obj of this.objects) {
            results.add(obj);
        }

        // Query children
        if (this.children) {
            for (const child of this.children) {
                child.queryFrustum(frustum, results);
            }
        }
    }

    removeObject(cullData) {
        const index = this.objects.indexOf(cullData);
        if (index !== -1) {
            this.objects.splice(index, 1);
            return true;
        }

        if (this.children) {
            for (const child of this.children) {
                if (child.removeObject(cullData)) {
                    return true;
                }
            }
        }

        return false;
    }

    getNodeCount() {
        let count = 1;
        if (this.children) {
            for (const child of this.children) {
                count += child.getNodeCount();
            }
        }
        return count;
    }
}

// Export for use in other modules
window.FrustumCuller = FrustumCuller;