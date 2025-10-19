/**
 * SceneryManager.js
 * Manages track scenery including trees, buildings, crowds, barriers
 * Uses LOD (Level of Detail) system for performance
 */

class SceneryManager {
    constructor(scene, trackData) {
        this.scene = scene;
        this.trackData = trackData;
        
        // Scenery collections
        this.scenery = {
            trees: [],
            buildings: [],
            crowds: [],
            barriers: [],
            signs: [],
            decorations: []
        };
        
        // LOD configuration
        this.lodConfig = {
            enabled: true,
            distances: {
                high: 100,      // Full detail
                medium: 250,    // Medium detail
                low: 500,       // Low detail
                culled: 1000    // Not rendered
            }
        };
        
        // Object pools for reuse
        this.pools = {
            trees: [],
            buildings: [],
            crowds: []
        };
        
        // Materials cache
        this.materials = this.createMaterials();
        
        console.log('✅ Scenery manager initialized');
    }

    /**
     * Create reusable materials
     */
    createMaterials() {
        return {
            // Vegetation
            tree: new THREE.MeshStandardMaterial({
                color: 0x2d5016,
                roughness: 0.9,
                metalness: 0.1
            }),
            grass: new THREE.MeshStandardMaterial({
                color: 0x3a8c3a,
                roughness: 0.95,
                metalness: 0.0
            }),
            
            // Structures
            concrete: new THREE.MeshStandardMaterial({
                color: 0x8a8a8a,
                roughness: 0.8,
                metalness: 0.2
            }),
            metal: new THREE.MeshStandardMaterial({
                color: 0x555555,
                roughness: 0.4,
                metalness: 0.9
            }),
            
            // Safety
            barrier: new THREE.MeshStandardMaterial({
                color: 0xff0000,
                roughness: 0.6,
                metalness: 0.3
            }),
            tireWall: new THREE.MeshStandardMaterial({
                color: 0x1a1a1a,
                roughness: 0.95,
                metalness: 0.1
            }),
            
            // Signage
            sign: new THREE.MeshStandardMaterial({
                color: 0xffffff,
                roughness: 0.3,
                metalness: 0.7
            })
        };
    }

    /**
     * Populate track with scenery
     */
    populate(density = 'medium') {
        console.log(`🌳 Populating track scenery (${density} density)...`);
        
        const densityMultiplier = {
            low: 0.5,
            medium: 1.0,
            high: 1.5,
            ultra: 2.0
        }[density] || 1.0;
        
        this.addTrees(densityMultiplier);
        this.addBuildings(densityMultiplier);
        this.addBarriers();
        this.addSigns();
        this.addCrowds(densityMultiplier);
        this.addDecorations(densityMultiplier);
        
        console.log(`  ✓ Trees: ${this.scenery.trees.length}`);
        console.log(`  ✓ Buildings: ${this.scenery.buildings.length}`);
        console.log(`  ✓ Barriers: ${this.scenery.barriers.length}`);
        console.log(`  ✓ Crowds: ${this.scenery.crowds.length}`);
    }

    /**
     * Add trees along track
     */
    addTrees(density) {
        const segments = this.trackData.segments;
        const treeInterval = Math.floor(10 / density);
        
        for (let i = 0; i < segments.length; i += treeInterval) {
            const segment = segments[i];
            
            // Trees on both sides of track
            const offsets = [-20, -25, -30, 20, 25, 30];
            
            offsets.forEach(offset => {
                // Calculate position perpendicular to track
                const perpendicular = new THREE.Vector3(
                    -segment.direction.z,
                    0,
                    segment.direction.x
                );
                
                const position = segment.position.clone();
                position.add(perpendicular.multiplyScalar(offset));
                position.y = segment.elevation;
                
                // Random variation
                position.x += (Math.random() - 0.5) * 5;
                position.z += (Math.random() - 0.5) * 5;
                
                const tree = this.createTree(position);
                this.scenery.trees.push(tree);
                this.scene.add(tree);
            });
        }
    }

    /**
     * Create a tree with LOD
     */
    createTree(position) {
        const lod = new THREE.LOD();
        
        // High detail (close)
        const highDetail = this.createTreeGeometry('high');
        lod.addLevel(highDetail, 0);
        
        // Medium detail
        const mediumDetail = this.createTreeGeometry('medium');
        lod.addLevel(mediumDetail, this.lodConfig.distances.high);
        
        // Low detail (far)
        const lowDetail = this.createTreeGeometry('low');
        lod.addLevel(lowDetail, this.lodConfig.distances.medium);
        
        lod.position.copy(position);
        lod.userData.type = 'tree';
        
        return lod;
    }

    /**
     * Create tree geometry at different detail levels
     */
    createTreeGeometry(detail) {
        const group = new THREE.Group();
        
        // Trunk
        const trunkHeight = 3 + Math.random() * 2;
        const trunkRadius = 0.2 + Math.random() * 0.1;
        
        const trunkSegments = detail === 'high' ? 12 : detail === 'medium' ? 8 : 4;
        const trunkGeometry = new THREE.CylinderGeometry(
            trunkRadius * 0.8,
            trunkRadius,
            trunkHeight,
            trunkSegments
        );
        
        const trunkMaterial = new THREE.MeshStandardMaterial({
            color: 0x4d3319,
            roughness: 0.9
        });
        
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = trunkHeight / 2;
        trunk.castShadow = detail === 'high';
        group.add(trunk);
        
        // Foliage
        const foliageRadius = 2 + Math.random();
        const foliageSegments = detail === 'high' ? 16 : detail === 'medium' ? 8 : 4;
        
        const foliageGeometry = new THREE.SphereGeometry(
            foliageRadius,
            foliageSegments,
            foliageSegments
        );
        
        const foliage = new THREE.Mesh(foliageGeometry, this.materials.tree);
        foliage.position.y = trunkHeight + foliageRadius * 0.5;
        foliage.castShadow = detail === 'high';
        foliage.receiveShadow = detail !== 'low';
        group.add(foliage);
        
        return group;
    }

    /**
     * Add buildings near track
     */
    addBuildings(density) {
        const segments = this.trackData.segments;
        const buildingInterval = Math.floor(50 / density);
        
        for (let i = 0; i < segments.length; i += buildingInterval) {
            const segment = segments[i];
            
            // Buildings on outer edge
            const perpendicular = new THREE.Vector3(
                -segment.direction.z,
                0,
                segment.direction.x
            );
            
            const side = Math.random() > 0.5 ? 1 : -1;
            const distance = 40 + Math.random() * 20;
            
            const position = segment.position.clone();
            position.add(perpendicular.multiplyScalar(distance * side));
            position.y = segment.elevation;
            
            const building = this.createBuilding(position);
            this.scenery.buildings.push(building);
            this.scene.add(building);
        }
    }

    /**
     * Create a building
     */
    createBuilding(position) {
        const lod = new THREE.LOD();
        
        // Building dimensions
        const width = 10 + Math.random() * 15;
        const height = 15 + Math.random() * 30;
        const depth = 10 + Math.random() * 15;
        
        // High detail
        const highDetail = this.createBuildingGeometry(width, height, depth, 'high');
        lod.addLevel(highDetail, 0);
        
        // Medium detail
        const mediumDetail = this.createBuildingGeometry(width, height, depth, 'medium');
        lod.addLevel(mediumDetail, this.lodConfig.distances.high);
        
        // Low detail
        const lowDetail = this.createBuildingGeometry(width, height, depth, 'low');
        lod.addLevel(lowDetail, this.lodConfig.distances.medium);
        
        lod.position.copy(position);
        lod.position.y += height / 2;
        lod.userData.type = 'building';
        
        return lod;
    }

    /**
     * Create building geometry
     */
    createBuildingGeometry(width, height, depth, detail) {
        const group = new THREE.Group();
        
        // Main structure
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const building = new THREE.Mesh(geometry, this.materials.concrete);
        building.castShadow = detail === 'high';
        building.receiveShadow = true;
        group.add(building);
        
        // Windows (high detail only)
        if (detail === 'high') {
            const windowMaterial = new THREE.MeshStandardMaterial({
                color: 0x88ccff,
                transparent: true,
                opacity: 0.3,
                metalness: 0.9,
                roughness: 0.1
            });
            
            const floors = Math.floor(height / 3);
            const windowsPerFloor = Math.floor(width / 2);
            
            for (let floor = 0; floor < floors; floor++) {
                for (let w = 0; w < windowsPerFloor; w++) {
                    const windowGeometry = new THREE.PlaneGeometry(1.2, 1.5);
                    const window = new THREE.Mesh(windowGeometry, windowMaterial);
                    
                    window.position.set(
                        -width / 2 + 1 + w * 2,
                        -height / 2 + 2 + floor * 3,
                        depth / 2 + 0.01
                    );
                    
                    group.add(window);
                }
            }
        }
        
        return group;
    }

    /**
     * Add safety barriers
     */
    addBarriers() {
        const segments = this.trackData.segments;
        
        segments.forEach((segment, index) => {
            // Barriers on corners (high curvature)
            if (Math.abs(segment.curvature) > 0.02) {
                const perpendicular = new THREE.Vector3(
                    -segment.direction.z,
                    0,
                    segment.direction.x
                );
                
                // Inner and outer barriers
                [-1, 1].forEach(side => {
                    const distance = (segment.width / 2) + 3;
                    const position = segment.position.clone();
                    position.add(perpendicular.multiplyScalar(distance * side));
                    position.y = segment.elevation + 0.5;
                    
                    const barrier = this.createBarrier(segment.direction);
                    barrier.position.copy(position);
                    
                    this.scenery.barriers.push(barrier);
                    this.scene.add(barrier);
                });
            }
        });
    }

    /**
     * Create a barrier segment
     */
    createBarrier(direction) {
        const geometry = new THREE.BoxGeometry(0.2, 1, 2);
        const barrier = new THREE.Mesh(geometry, this.materials.barrier);
        
        // Align with track direction
        const angle = Math.atan2(direction.x, direction.z);
        barrier.rotation.y = angle;
        
        barrier.castShadow = true;
        barrier.userData.type = 'barrier';
        
        return barrier;
    }

    /**
     * Add track-side signs
     */
    addSigns() {
        const segments = this.trackData.segments;
        const signInterval = Math.floor(segments.length / 20);
        
        for (let i = 0; i < segments.length; i += signInterval) {
            const segment = segments[i];
            
            const perpendicular = new THREE.Vector3(
                -segment.direction.z,
                0,
                segment.direction.x
            );
            
            const position = segment.position.clone();
            position.add(perpendicular.multiplyScalar(15));
            position.y = segment.elevation + 2;
            
            const sign = this.createSign(i, segments.length);
            sign.position.copy(position);
            
            this.scenery.signs.push(sign);
            this.scene.add(sign);
        }
    }

    /**
     * Create a track sign
     */
    createSign(segmentIndex, totalSegments) {
        const group = new THREE.Group();
        
        // Post
        const postGeometry = new THREE.CylinderGeometry(0.1, 0.1, 3, 8);
        const post = new THREE.Mesh(postGeometry, this.materials.metal);
        post.position.y = -1.5;
        group.add(post);
        
        // Sign board
        const boardGeometry = new THREE.BoxGeometry(2, 1.5, 0.1);
        const board = new THREE.Mesh(boardGeometry, this.materials.sign);
        group.add(board);
        
        // Distance marker
        const distance = Math.round((segmentIndex / totalSegments) * 5000);
        group.userData = {
            type: 'sign',
            distance: distance
        };
        
        return group;
    }

    /**
     * Add spectator crowds
     */
    addCrowds(density) {
        const segments = this.trackData.segments;
        const crowdInterval = Math.floor(30 / density);
        
        for (let i = 0; i < segments.length; i += crowdInterval) {
            const segment = segments[i];
            
            // Crowds at corners
            if (Math.abs(segment.curvature) > 0.015) {
                const perpendicular = new THREE.Vector3(
                    -segment.direction.z,
                    0,
                    segment.direction.x
                );
                
                const position = segment.position.clone();
                position.add(perpendicular.multiplyScalar(18));
                position.y = segment.elevation;
                
                const crowd = this.createCrowd();
                crowd.position.copy(position);
                
                this.scenery.crowds.push(crowd);
                this.scene.add(crowd);
            }
        }
    }

    /**
     * Create a crowd of spectators (simplified)
     */
    createCrowd() {
        const crowd = new THREE.Group();
        
        // Simple colored boxes representing people
        const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff];
        
        for (let i = 0; i < 20; i++) {
            const geometry = new THREE.BoxGeometry(0.5, 1.5, 0.3);
            const material = new THREE.MeshStandardMaterial({
                color: colors[Math.floor(Math.random() * colors.length)],
                roughness: 0.8
            });
            
            const person = new THREE.Mesh(geometry, material);
            person.position.set(
                (Math.random() - 0.5) * 5,
                0.75,
                (Math.random() - 0.5) * 2
            );
            
            crowd.add(person);
        }
        
        crowd.userData.type = 'crowd';
        return crowd;
    }

    /**
     * Add decorative elements
     */
    addDecorations(density) {
        // Flags, banners, advertising boards, etc.
        const segments = this.trackData.segments;
        const decorInterval = Math.floor(40 / density);
        
        for (let i = 0; i < segments.length; i += decorInterval) {
            const segment = segments[i];
            
            const perpendicular = new THREE.Vector3(
                -segment.direction.z,
                0,
                segment.direction.x
            );
            
            const position = segment.position.clone();
            position.add(perpendicular.multiplyScalar(12));
            position.y = segment.elevation + 3;
            
            const decoration = this.createFlag();
            decoration.position.copy(position);
            
            this.scenery.decorations.push(decoration);
            this.scene.add(decoration);
        }
    }

    /**
     * Create a flag decoration
     */
    createFlag() {
        const group = new THREE.Group();
        
        // Flag pole
        const poleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 4, 8);
        const poleMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.y = -2;
        group.add(pole);
        
        // Flag
        const flagGeometry = new THREE.PlaneGeometry(1.5, 1);
        const flagMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            side: THREE.DoubleSide
        });
        const flag = new THREE.Mesh(flagGeometry, flagMaterial);
        flag.position.set(0.75, 0.5, 0);
        group.add(flag);
        
        group.userData.type = 'flag';
        return group;
    }

    /**
     * Update LOD based on camera position
     */
    update(cameraPosition) {
        if (!this.lodConfig.enabled) return;
        
        // Update all LOD objects
        [...this.scenery.trees, ...this.scenery.buildings].forEach(obj => {
            if (obj.isLOD) {
                obj.update(cameraPosition);
            }
        });
    }

    /**
     * Set LOD quality
     */
    setLODQuality(quality) {
        const distances = {
            low: { high: 50, medium: 150, low: 300 },
            medium: { high: 100, medium: 250, low: 500 },
            high: { high: 150, medium: 400, low: 800 },
            ultra: { high: 200, medium: 600, low: 1200 }
        }[quality];
        
        if (distances) {
            this.lodConfig.distances = distances;
            console.log(`LOD quality set to: ${quality}`);
        }
    }

    /**
     * Clear all scenery
     */
    clear() {
        Object.values(this.scenery).forEach(collection => {
            collection.forEach(obj => {
                this.scene.remove(obj);
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) obj.material.dispose();
            });
            collection.length = 0;
        });
        
        console.log('Scenery cleared');
    }

    /**
     * Get scenery statistics
     */
    getStats() {
        return {
            trees: this.scenery.trees.length,
            buildings: this.scenery.buildings.length,
            barriers: this.scenery.barriers.length,
            signs: this.scenery.signs.length,
            crowds: this.scenery.crowds.length,
            decorations: this.scenery.decorations.length,
            total: Object.values(this.scenery).reduce((sum, arr) => sum + arr.length, 0)
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SceneryManager;
}
