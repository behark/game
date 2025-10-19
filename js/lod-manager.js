/**
 * LOD Manager - Dynamic Level of Detail system for Speed Rivals
 * Automatically reduces geometry complexity based on distance and performance requirements
 */

class LODManager {
    constructor(performanceManager) {
        this.performanceManager = performanceManager;
        this.lodObjects = new Map(); // object id -> LOD data
        this.camera = null;
        this.scene = null;

        // LOD distance thresholds (adjustable based on quality settings)
        this.baseLODDistances = {
            high: 30,    // Switch to high detail
            medium: 80,  // Switch to medium detail
            low: 150,    // Switch to low detail
            cull: 300    // Remove from rendering entirely
        };

        // Current scaled distances based on quality
        this.lodDistances = { ...this.baseLODDistances };

        // Performance tracking
        this.stats = {
            totalObjects: 0,
            visibleObjects: 0,
            culledObjects: 0,
            lodLevels: { high: 0, medium: 0, low: 0 }
        };

        console.log('📐 LOD Manager initialized');
    }

    init(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.updateLODDistances();
        console.log('✅ LOD Manager ready');
    }

    /**
     * Register an object for LOD management
     */
    registerObject(object, lodLevels, config = {}) {
        const lodData = {
            object,
            lodLevels,
            currentLOD: 'high',
            lastDistance: 0,
            config: {
                important: false, // Important objects get better LOD treatment
                staticPosition: false, // Static objects can be optimized differently
                minLOD: 'low', // Minimum LOD level (won't go lower)
                ...config
            }
        };

        this.lodObjects.set(object.uuid, lodData);
    }

    /**
     * Create LOD levels for a car object
     */
    createCarLOD(carMesh) {
        const lodLevels = {
            high: carMesh, // Original high-detail mesh
            medium: this.createMediumDetailCar(carMesh),
            low: this.createLowDetailCar(carMesh),
            culled: null // Completely hidden
        };

        this.registerObject(carMesh, lodLevels, {
            important: true, // Cars are important objects
            minLOD: 'medium' // Cars shouldn't go below medium quality
        });

        return lodLevels;
    }

    /**
     * Create medium detail version of car
     */
    createMediumDetailCar(originalCar) {
        const mediumCar = originalCar.clone();

        // Reduce geometry complexity
        mediumCar.traverse((child) => {
            if (child.isMesh && child.geometry) {
                // Reduce geometry resolution for non-essential parts
                if (child.name && !child.name.includes('body')) {
                    this.simplifyGeometry(child.geometry, 0.7);
                }
            }
        });

        // Hide some detail elements
        mediumCar.traverse((child) => {
            if (child.name && (
                child.name.includes('headlight') ||
                child.name.includes('taillight') ||
                child.name.includes('grille')
            )) {
                child.visible = false;
            }
        });

        mediumCar.visible = false; // Hidden by default
        originalCar.parent?.add(mediumCar);

        return mediumCar;
    }

    /**
     * Create low detail version of car
     */
    createLowDetailCar(originalCar) {
        const lowCar = new THREE.Group();

        // Simple box representation
        const bodyGeometry = new THREE.BoxGeometry(4, 1.5, 8);
        const bodyMaterial = new THREE.MeshLambertMaterial({
            color: 0xff4444,
            transparent: true,
            opacity: 0.9
        });
        const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        bodyMesh.position.y = 0.75;
        bodyMesh.castShadow = true;
        lowCar.add(bodyMesh);

        // Simple wheels
        const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 8);
        const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });

        const wheelPositions = [
            { x: -1.5, y: 0.4, z: 2.5 },
            { x: 1.5, y: 0.4, z: 2.5 },
            { x: -1.5, y: 0.4, z: -2.5 },
            { x: 1.5, y: 0.4, z: -2.5 }
        ];

        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.position.set(pos.x, pos.y, pos.z);
            wheel.rotation.z = Math.PI / 2;
            lowCar.add(wheel);
        });

        lowCar.visible = false;
        originalCar.parent?.add(lowCar);

        return lowCar;
    }

    /**
     * Create LOD levels for environment objects (trees, buildings, etc.)
     */
    createEnvironmentLOD(object, type = 'generic') {
        let lodLevels;

        switch (type) {
            case 'tree':
                lodLevels = this.createTreeLOD(object);
                break;
            case 'building':
                lodLevels = this.createBuildingLOD(object);
                break;
            default:
                lodLevels = this.createGenericLOD(object);
                break;
        }

        this.registerObject(object, lodLevels, {
            staticPosition: true,
            minLOD: 'low'
        });

        return lodLevels;
    }

    /**
     * Create tree LOD levels
     */
    createTreeLOD(treeGroup) {
        const lodLevels = {
            high: treeGroup, // Original detailed tree
            medium: this.createMediumDetailTree(treeGroup),
            low: this.createLowDetailTree(treeGroup),
            culled: null
        };

        return lodLevels;
    }

    createMediumDetailTree(originalTree) {
        const mediumTree = new THREE.Group();

        // Simplified trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.8, 8, 6);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 4;
        trunk.castShadow = true;
        mediumTree.add(trunk);

        // Simplified leaves
        const leavesGeometry = new THREE.SphereGeometry(4, 6, 6);
        const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x228b22 });
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.y = 10;
        leaves.castShadow = true;
        mediumTree.add(leaves);

        mediumTree.visible = false;
        originalTree.parent?.add(mediumTree);

        return mediumTree;
    }

    createLowDetailTree(originalTree) {
        const lowTree = new THREE.Group();

        // Very simple representation - just a billboard
        const billboardGeometry = new THREE.PlaneGeometry(8, 12);
        const billboardMaterial = new THREE.MeshLambertMaterial({
            color: 0x228b22,
            transparent: true,
            opacity: 0.8
        });
        const billboard = new THREE.Mesh(billboardGeometry, billboardMaterial);
        billboard.position.y = 6;
        lowTree.add(billboard);

        lowTree.visible = false;
        originalTree.parent?.add(lowTree);

        return lowTree;
    }

    /**
     * Create building LOD levels
     */
    createBuildingLOD(building) {
        const lodLevels = {
            high: building,
            medium: this.createMediumDetailBuilding(building),
            low: this.createLowDetailBuilding(building),
            culled: null
        };

        return lodLevels;
    }

    createMediumDetailBuilding(originalBuilding) {
        const mediumBuilding = originalBuilding.clone();

        // Simplify geometry
        mediumBuilding.traverse((child) => {
            if (child.isMesh && child.geometry) {
                this.simplifyGeometry(child.geometry, 0.5);
            }
        });

        mediumBuilding.visible = false;
        originalBuilding.parent?.add(mediumBuilding);

        return mediumBuilding;
    }

    createLowDetailBuilding(originalBuilding) {
        // Get original building dimensions
        const box = new THREE.Box3().setFromObject(originalBuilding);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        // Create simple box
        const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        const material = new THREE.MeshLambertMaterial({
            color: originalBuilding.children[0]?.material?.color || 0x666666
        });
        const lowBuilding = new THREE.Mesh(geometry, material);
        lowBuilding.position.copy(center);
        lowBuilding.castShadow = true;

        lowBuilding.visible = false;
        originalBuilding.parent?.add(lowBuilding);

        return lowBuilding;
    }

    /**
     * Simplify geometry by reducing vertex count
     */
    simplifyGeometry(geometry, factor) {
        if (!geometry.isBufferGeometry) return;

        // Simple vertex reduction - remove every nth vertex
        const positionAttribute = geometry.getAttribute('position');
        if (!positionAttribute) return;

        const originalCount = positionAttribute.count;
        const targetCount = Math.floor(originalCount * factor);

        if (targetCount >= originalCount) return;

        // This is a simplified approach - in a real implementation,
        // you'd use a proper mesh simplification algorithm
        const step = Math.floor(originalCount / targetCount);
        const newPositions = [];

        for (let i = 0; i < originalCount; i += step) {
            newPositions.push(
                positionAttribute.getX(i),
                positionAttribute.getY(i),
                positionAttribute.getZ(i)
            );
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
    }

    /**
     * Update LOD distances based on current quality settings
     */
    updateLODDistances() {
        if (!this.performanceManager) return;

        const qualityMultiplier = this.performanceManager.currentQuality.lodDistance / 150; // Base distance

        this.lodDistances = {
            high: this.baseLODDistances.high * qualityMultiplier,
            medium: this.baseLODDistances.medium * qualityMultiplier,
            low: this.baseLODDistances.low * qualityMultiplier,
            cull: this.baseLODDistances.cull * qualityMultiplier
        };
    }

    /**
     * Update all LOD objects based on camera distance
     */
    update() {
        if (!this.camera) return;

        // Reset stats
        this.stats.totalObjects = this.lodObjects.size;
        this.stats.visibleObjects = 0;
        this.stats.culledObjects = 0;
        this.stats.lodLevels = { high: 0, medium: 0, low: 0 };

        this.updateLODDistances();

        const cameraPosition = this.camera.position;

        for (const [objectId, lodData] of this.lodObjects) {
            if (!lodData.object.parent) {
                // Object has been removed from scene
                this.lodObjects.delete(objectId);
                continue;
            }

            const distance = cameraPosition.distanceTo(lodData.object.position);
            lodData.lastDistance = distance;

            const newLOD = this.calculateLODLevel(distance, lodData.config);

            if (newLOD !== lodData.currentLOD) {
                this.switchLOD(lodData, newLOD);
                lodData.currentLOD = newLOD;
            }

            // Update stats
            if (newLOD === 'culled') {
                this.stats.culledObjects++;
            } else {
                this.stats.visibleObjects++;
                this.stats.lodLevels[newLOD]++;
            }
        }
    }

    /**
     * Calculate appropriate LOD level based on distance and object config
     */
    calculateLODLevel(distance, config) {
        // Important objects get better treatment
        const distanceMultiplier = config.important ? 1.5 : 1.0;
        const adjustedDistance = distance / distanceMultiplier;

        if (adjustedDistance > this.lodDistances.cull) {
            return 'culled';
        } else if (adjustedDistance > this.lodDistances.low) {
            return Math.max('low', config.minLOD);
        } else if (adjustedDistance > this.lodDistances.medium) {
            return Math.max('medium', config.minLOD);
        } else if (adjustedDistance > this.lodDistances.high) {
            return Math.max('medium', config.minLOD);
        } else {
            return 'high';
        }
    }

    /**
     * Switch object to appropriate LOD level
     */
    switchLOD(lodData, newLOD) {
        const { lodLevels, currentLOD } = lodData;

        // Hide current LOD
        if (lodLevels[currentLOD]) {
            lodLevels[currentLOD].visible = false;
        }

        // Show new LOD
        if (lodLevels[newLOD]) {
            lodLevels[newLOD].visible = true;
        }
    }

    /**
     * Force specific LOD level for an object
     */
    forceLOD(objectId, lodLevel) {
        const lodData = this.lodObjects.get(objectId);
        if (lodData) {
            this.switchLOD(lodData, lodLevel);
            lodData.currentLOD = lodLevel;
        }
    }

    /**
     * Get LOD statistics
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Remove object from LOD management
     */
    unregisterObject(object) {
        this.lodObjects.delete(object.uuid);
    }

    /**
     * Clear all LOD objects
     */
    clear() {
        this.lodObjects.clear();
    }

    /**
     * Debug visualization
     */
    showLODDebugInfo() {
        console.log('LOD Manager Stats:', this.getStats());
        console.log('LOD Distances:', this.lodDistances);

        // Log detailed object info
        for (const [objectId, lodData] of this.lodObjects) {
            console.log(`Object ${objectId}: LOD ${lodData.currentLOD}, Distance ${lodData.lastDistance.toFixed(1)}`);
        }
    }
}

// Export for use in other modules
window.LODManager = LODManager;