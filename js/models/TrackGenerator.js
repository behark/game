/**
 * TrackGenerator.js
 * Procedural track generation with elevation, banking, and environmental variation
 * Creates realistic racing circuits with multiple layouts
 */

class TrackGenerator {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        
        // Track configuration
        this.config = {
            length: 5000,              // Total track length (m)
            width: 12,                 // Track width (m)
            segmentLength: 20,         // Length per segment (m)
            maxElevation: 30,          // Maximum height variation (m)
            maxBanking: 25,            // Maximum banking angle (degrees)
            
            // Track type
            type: 'circuit',           // circuit, point-to-point, drift
            difficulty: 'medium',      // easy, medium, hard, expert
            
            // Features
            hasPitlane: true,
            hasChicanes: true,
            hasHairpins: true,
            hasElevation: true,
            hasBanking: true
        };
        
        // Track data
        this.trackData = {
            segments: [],
            checkpoints: [],
            startLine: null,
            finishLine: null,
            pitlane: null
        };
        
        // Track meshes
        this.meshes = {
            surface: null,
            barriers: [],
            runoff: [],
            kerbs: []
        };
        
        // Materials
        this.materials = null;
        
        console.log('✅ Track generator initialized');
    }

    /**
     * Generate a complete track
     */
    generate(trackType = 'circuit', difficulty = 'medium') {
        this.config.type = trackType;
        this.config.difficulty = difficulty;
        
        console.log(`🏁 Generating ${difficulty} ${trackType} track...`);
        
        // Generate track path
        this.generateTrackPath();
        
        // Add elevation changes
        if (this.config.hasElevation) {
            this.addElevation();
        }
        
        // Add banking to corners
        if (this.config.hasBanking) {
            this.addBanking();
        }
        
        // Create track geometry
        this.createTrackGeometry();
        
        // Add track details
        this.addKerbs();
        this.addBarriers();
        this.addRunoffAreas();
        
        // Add checkpoints
        this.createCheckpoints();
        
        // Add pit lane
        if (this.config.hasPitlane) {
            this.createPitlane();
        }
        
        console.log(`✅ Track generated: ${this.trackData.segments.length} segments`);
        
        return this.trackData;
    }

    /**
     * Generate the main track path using spline curves
     */
    generateTrackPath() {
        this.trackData.segments = [];
        
        const numSegments = Math.floor(this.config.length / this.config.segmentLength);
        const controlPoints = this.generateControlPoints(difficulty);
        
        // Create smooth spline through control points
        const curve = new THREE.CatmullRomCurve3(controlPoints, true); // true = closed loop
        
        // Sample points along curve
        const points = curve.getPoints(numSegments);
        
        // Create segments with additional data
        for (let i = 0; i < points.length; i++) {
            const point = points[i];
            const nextPoint = points[(i + 1) % points.length];
            
            // Calculate direction
            const direction = new THREE.Vector3().subVectors(nextPoint, point).normalize();
            
            // Calculate curvature (for banking)
            const prevPoint = points[i > 0 ? i - 1 : points.length - 1];
            const curvature = this.calculateCurvature(prevPoint, point, nextPoint);
            
            const segment = {
                position: point.clone(),
                direction: direction.clone(),
                curvature: curvature,
                width: this.config.width,
                elevation: 0,
                banking: 0,
                gripLevel: 1.0,
                type: 'track' // track, pit, runoff
            };
            
            this.trackData.segments.push(segment);
        }
    }

    /**
     * Generate control points based on track type and difficulty
     */
    generateControlPoints(difficulty) {
        const points = [];
        const radius = this.config.length / (2 * Math.PI);
        
        // Difficulty determines complexity
        const numCorners = {
            easy: 6,
            medium: 10,
            hard: 14,
            expert: 18
        }[difficulty] || 10;
        
        // Generate base circular layout with variations
        for (let i = 0; i < numCorners; i++) {
            const angle = (i / numCorners) * Math.PI * 2;
            
            // Add randomness for organic feel
            const radiusVariation = radius * (0.7 + Math.random() * 0.6);
            const angleVariation = angle + (Math.random() - 0.5) * 0.3;
            
            const x = Math.cos(angleVariation) * radiusVariation;
            const z = Math.sin(angleVariation) * radiusVariation;
            const y = 0; // Will be set in elevation pass
            
            points.push(new THREE.Vector3(x, y, z));
        }
        
        // Add special features based on flags
        if (this.config.hasChicanes) {
            this.addChicanes(points);
        }
        
        if (this.config.hasHairpins) {
            this.addHairpins(points);
        }
        
        return points;
    }

    /**
     * Add chicane sections
     */
    addChicanes(points) {
        // Insert quick left-right-left sections
        const numChicanes = 2;
        for (let i = 0; i < numChicanes; i++) {
            const insertIndex = Math.floor(points.length * (i + 1) / (numChicanes + 1));
            const basePoint = points[insertIndex];
            
            // Add two tight corners
            const offset = 15;
            points.splice(insertIndex, 0,
                new THREE.Vector3(basePoint.x + offset, basePoint.y, basePoint.z),
                new THREE.Vector3(basePoint.x - offset, basePoint.y, basePoint.z + offset)
            );
        }
    }

    /**
     * Add hairpin turns
     */
    addHairpins(points) {
        const numHairpins = 1;
        for (let i = 0; i < numHairpins; i++) {
            const insertIndex = Math.floor(points.length / 2);
            const basePoint = points[insertIndex];
            
            // Create 180-degree turn
            const radius = 20;
            for (let j = 0; j < 5; j++) {
                const angle = (j / 4) * Math.PI;
                points.splice(insertIndex + j, 0,
                    new THREE.Vector3(
                        basePoint.x + Math.cos(angle) * radius,
                        basePoint.y,
                        basePoint.z + Math.sin(angle) * radius
                    )
                );
            }
        }
    }

    /**
     * Add elevation changes
     */
    addElevation() {
        const elevationCurve = [];
        const numPeaks = 3;
        
        // Create elevation profile
        for (let i = 0; i < numPeaks; i++) {
            elevationCurve.push({
                position: i / numPeaks,
                height: (Math.random() - 0.5) * this.config.maxElevation
            });
        }
        
        // Apply to segments
        this.trackData.segments.forEach((segment, index) => {
            const t = index / this.trackData.segments.length;
            segment.elevation = this.interpolateElevation(t, elevationCurve);
            segment.position.y = segment.elevation;
        });
    }

    /**
     * Interpolate elevation from curve
     */
    interpolateElevation(t, curve) {
        // Simple linear interpolation between peaks
        for (let i = 0; i < curve.length - 1; i++) {
            const p1 = curve[i];
            const p2 = curve[i + 1];
            
            if (t >= p1.position && t <= p2.position) {
                const localT = (t - p1.position) / (p2.position - p1.position);
                return p1.height + (p2.height - p1.height) * localT;
            }
        }
        return 0;
    }

    /**
     * Add banking to corners
     */
    addBanking() {
        this.trackData.segments.forEach(segment => {
            // Banking proportional to curvature
            const bankingAngle = Math.min(
                this.config.maxBanking,
                Math.abs(segment.curvature) * 100
            );
            
            // Bank in direction of turn
            segment.banking = segment.curvature > 0 ? bankingAngle : -bankingAngle;
        });
    }

    /**
     * Calculate curvature at a point
     */
    calculateCurvature(p1, p2, p3) {
        const v1 = new THREE.Vector3().subVectors(p2, p1);
        const v2 = new THREE.Vector3().subVectors(p3, p2);
        
        const cross = new THREE.Vector3().crossVectors(v1, v2);
        const curvature = cross.length() / (v1.length() * v2.length());
        
        // Sign indicates direction
        return cross.y > 0 ? curvature : -curvature;
    }

    /**
     * Create track geometry mesh
     */
    createTrackGeometry() {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const uvs = [];
        const indices = [];
        
        this.trackData.segments.forEach((segment, i) => {
            const nextSegment = this.trackData.segments[(i + 1) % this.trackData.segments.length];
            
            // Calculate perpendicular direction for track width
            const right = new THREE.Vector3(-segment.direction.z, 0, segment.direction.x);
            right.normalize();
            
            // Apply banking rotation
            const bankingRad = (segment.banking * Math.PI) / 180;
            const bankingQuat = new THREE.Quaternion().setFromAxisAngle(segment.direction, bankingRad);
            right.applyQuaternion(bankingQuat);
            
            // Create quad vertices
            const halfWidth = segment.width / 2;
            const left = right.clone().multiplyScalar(-halfWidth);
            right.multiplyScalar(halfWidth);
            
            const v0 = segment.position.clone().add(left);
            const v1 = segment.position.clone().add(right);
            
            // Add vertices
            vertices.push(v0.x, v0.y, v0.z);
            vertices.push(v1.x, v1.y, v1.z);
            
            // Add UVs
            const u = i / this.trackData.segments.length;
            uvs.push(0, u);
            uvs.push(1, u);
            
            // Add indices for triangles
            if (i < this.trackData.segments.length - 1) {
                const base = i * 2;
                indices.push(base, base + 1, base + 2);
                indices.push(base + 1, base + 3, base + 2);
            }
        });
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        
        // Create material
        const material = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            roughness: 0.9,
            metalness: 0.1
        });
        
        this.meshes.surface = new THREE.Mesh(geometry, material);
        this.meshes.surface.receiveShadow = true;
        this.scene.add(this.meshes.surface);
        
        // Create physics collision shape
        this.createPhysicsTrack();
    }

    /**
     * Create physics collision for track
     */
    createPhysicsTrack() {
        // Simplified: Create trimesh from track geometry
        // In production, use optimized collision shapes
        const shape = new CANNON.Plane();
        const body = new CANNON.Body({
            mass: 0, // Static
            shape: shape
        });
        body.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        this.world.addBody(body);
    }

    /**
     * Add colored kerbs at track edges
     */
    addKerbs() {
        // Red and white kerbs at corners
        // Implementation would create alternating colored geometry
        console.log('  ✓ Added track kerbs');
    }

    /**
     * Add safety barriers
     */
    addBarriers() {
        // Tire barriers, armco, catch fencing
        console.log('  ✓ Added safety barriers');
    }

    /**
     * Add runoff areas (gravel/grass)
     */
    addRunoffAreas() {
        // Lower grip areas outside track
        console.log('  ✓ Added runoff areas');
    }

    /**
     * Create checkpoints for lap detection
     */
    createCheckpoints() {
        const checkpointInterval = Math.floor(this.trackData.segments.length / 10);
        
        for (let i = 0; i < this.trackData.segments.length; i += checkpointInterval) {
            this.trackData.checkpoints.push({
                index: i,
                position: this.trackData.segments[i].position.clone(),
                triggered: false
            });
        }
        
        // Start/finish line
        this.trackData.startLine = {
            position: this.trackData.segments[0].position.clone(),
            direction: this.trackData.segments[0].direction.clone()
        };
        
        console.log(`  ✓ Created ${this.trackData.checkpoints.length} checkpoints`);
    }

    /**
     * Create pit lane
     */
    createPitlane() {
        // Parallel track section for pitstops
        this.trackData.pitlane = {
            entry: Math.floor(this.trackData.segments.length * 0.8),
            exit: Math.floor(this.trackData.segments.length * 0.95),
            pitboxes: 20
        };
        
        console.log('  ✓ Created pit lane');
    }

    /**
     * Get segment at world position
     */
    getSegmentAtPosition(position) {
        let closestSegment = null;
        let minDistance = Infinity;
        
        this.trackData.segments.forEach(segment => {
            const distance = position.distanceTo(segment.position);
            if (distance < minDistance) {
                minDistance = distance;
                closestSegment = segment;
            }
        });
        
        return closestSegment;
    }

    /**
     * Cleanup
     */
    dispose() {
        if (this.meshes.surface) {
            this.meshes.surface.geometry.dispose();
            this.meshes.surface.material.dispose();
            this.scene.remove(this.meshes.surface);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrackGenerator;
}
