class Track {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.trackMesh = null;
        this.trackBody = null;
        this.checkpoints = [];
        this.trackWidth = CONFIG.TRACK.WIDTH;
        this.trackLength = 200;
    }

    async create() {
        console.log('🏁 Creating race track...');

        this.createGround();
        this.createTrackSurface();
        this.createBarriers();
        this.createEnvironment();
        this.createCheckpoints();

        console.log('✅ Track created successfully!');
    }

    createGround() {
        // Large ground plane
        const groundGeometry = new THREE.PlaneGeometry(500, 500);
        const groundMaterial = new THREE.MeshLambertMaterial({
            color: 0x4a7c59,
            transparent: true,
            opacity: 0.8
        });

        const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
        groundMesh.rotation.x = -Math.PI / 2;
        groundMesh.receiveShadow = true;
        this.scene.add(groundMesh);

        // Ground physics body
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({ mass: 0 });
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        groundBody.material = new CANNON.Material();
        groundBody.material.friction = 0.8;
        groundBody.material.restitution = 0.1;
        this.world.addBody(groundBody);
    }

    createTrackSurface() {
        // Create oval track shape
        const trackShape = new THREE.Shape();
        const radius = CONFIG.TRACK.RADIUS;
        const straightLength = CONFIG.TRACK.STRAIGHT_LENGTH;

        // Start at bottom straight
        trackShape.moveTo(-straightLength / 2, -radius);

        // Bottom straight
        trackShape.lineTo(straightLength / 2, -radius);

        // Right curve
        trackShape.quadraticCurveTo(
            straightLength / 2 + radius, -radius,
            straightLength / 2 + radius, 0
        );
        trackShape.quadraticCurveTo(
            straightLength / 2 + radius, radius,
            straightLength / 2, radius
        );

        // Top straight
        trackShape.lineTo(-straightLength / 2, radius);

        // Left curve
        trackShape.quadraticCurveTo(
            -straightLength / 2 - radius, radius,
            -straightLength / 2 - radius, 0
        );
        trackShape.quadraticCurveTo(
            -straightLength / 2 - radius, -radius,
            -straightLength / 2, -radius
        );

        // Create track geometry
        const trackGeometry = new THREE.ShapeGeometry(trackShape);
        const trackMaterial = new THREE.MeshLambertMaterial({
            color: 0x2c2c2c,
            side: THREE.DoubleSide
        });

        this.trackMesh = new THREE.Mesh(trackGeometry, trackMaterial);
        this.trackMesh.rotation.x = -Math.PI / 2;
        this.trackMesh.position.y = 0.05;
        this.trackMesh.receiveShadow = true;
        this.scene.add(this.trackMesh);

        // Track center line
        this.createTrackMarkings();
    }

    createTrackMarkings() {
        // Create dashed center line
        const dashLength = 5;
        const gapLength = 3;
        const lineWidth = 0.3;

        for (let i = 0; i < 50; i++) {
            const angle = (i / 50) * Math.PI * 2;
            const radius = 40;

            // Calculate position on track
            let x, z;
            if (angle < Math.PI / 2) {
                // Bottom curve to right straight
                const t = angle / (Math.PI / 2);
                x = Math.sin(t * Math.PI / 2) * (30 + radius);
                z = -radius + Math.sin(t * Math.PI / 2) * radius;
            } else if (angle < Math.PI) {
                // Right straight to top curve
                const t = (angle - Math.PI / 2) / (Math.PI / 2);
                x = 30 + radius - t * 60;
                z = 0;
            } else if (angle < 3 * Math.PI / 2) {
                // Top curve to left straight
                const t = (angle - Math.PI) / (Math.PI / 2);
                x = -30 - Math.sin(t * Math.PI / 2) * radius;
                z = radius - Math.sin(t * Math.PI / 2) * radius;
            } else {
                // Left straight to bottom curve
                const t = (angle - 3 * Math.PI / 2) / (Math.PI / 2);
                x = -30 - radius + t * 60;
                z = 0;
            }

            if (i % 2 === 0) {
                const dashGeometry = new THREE.BoxGeometry(lineWidth, 0.02, dashLength);
                const dashMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
                const dashMesh = new THREE.Mesh(dashGeometry, dashMaterial);
                dashMesh.position.set(x, 0.1, z);
                dashMesh.rotation.y = angle;
                this.scene.add(dashMesh);
            }
        }

        // Start/finish line
        const finishLineGeometry = new THREE.BoxGeometry(this.trackWidth, 0.03, 1);
        const finishLineMaterial = new THREE.MeshLambertMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9
        });
        const finishLineMesh = new THREE.Mesh(finishLineGeometry, finishLineMaterial);
        finishLineMesh.position.set(0, 0.1, -40);
        this.scene.add(finishLineMesh);

        // Checkered pattern for finish line
        for (let i = 0; i < 8; i++) {
            const checkerGeometry = new THREE.BoxGeometry(1.5, 0.04, 0.5);
            const checkerMaterial = new THREE.MeshLambertMaterial({
                color: i % 2 === 0 ? 0x000000 : 0xffffff
            });
            const checkerMesh = new THREE.Mesh(checkerGeometry, checkerMaterial);
            checkerMesh.position.set(-6 + i * 1.5, 0.12, -40);
            this.scene.add(checkerMesh);
        }
    }

    createBarriers() {
        // Track barriers
        const barrierHeight = 2;
        const barrierWidth = 0.5;

        // Create barriers around track perimeter
        const barrierPositions = [];

        // Generate barrier positions following track outline
        for (let i = 0; i < 100; i++) {
            const angle = (i / 100) * Math.PI * 2;
            const innerRadius = 35;
            const outerRadius = 50;

            // Inner barriers
            let innerX, innerZ, outerX, outerZ;

            if (angle < Math.PI / 2 || angle > 3 * Math.PI / 2) {
                // Straight sections
                const side = angle < Math.PI ? 1 : -1;
                innerX = side * 25;
                innerZ = Math.sin(angle) * innerRadius;
                outerX = side * 35;
                outerZ = Math.sin(angle) * outerRadius;
            } else {
                // Curved sections
                innerX = Math.cos(angle) * innerRadius;
                innerZ = Math.sin(angle) * innerRadius;
                outerX = Math.cos(angle) * outerRadius;
                outerZ = Math.sin(angle) * outerRadius;
            }

            barrierPositions.push({ x: innerX, z: innerZ, type: 'inner' });
            barrierPositions.push({ x: outerX, z: outerZ, type: 'outer' });
        }

        barrierPositions.forEach(pos => {
            // Barrier mesh
            const barrierGeometry = new THREE.BoxGeometry(barrierWidth, barrierHeight, barrierWidth);
            const barrierMaterial = new THREE.MeshLambertMaterial({
                color: pos.type === 'inner' ? 0xff0000 : 0x0066cc
            });
            const barrierMesh = new THREE.Mesh(barrierGeometry, barrierMaterial);
            barrierMesh.position.set(pos.x, barrierHeight / 2, pos.z);
            barrierMesh.castShadow = true;
            this.scene.add(barrierMesh);

            // Barrier physics
            const barrierShape = new CANNON.Box(
                new CANNON.Vec3(barrierWidth / 2, barrierHeight / 2, barrierWidth / 2)
            );
            const barrierBody = new CANNON.Body({ mass: 0 });
            barrierBody.addShape(barrierShape);
            barrierBody.position.set(pos.x, barrierHeight / 2, pos.z);
            barrierBody.material = new CANNON.Material();
            barrierBody.material.friction = 0.1;
            barrierBody.material.restitution = 0.8;
            this.world.addBody(barrierBody);
        });
    }

    createEnvironment() {
        // Add some trees and environmental objects
        for (let i = 0; i < 20; i++) {
            const treeX = (Math.random() - 0.5) * 300;
            const treeZ = (Math.random() - 0.5) * 300;

            // Skip if too close to track
            const distanceFromCenter = Math.sqrt(treeX * treeX + treeZ * treeZ);
            if (distanceFromCenter < 70) continue;

            // Tree trunk
            const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.8, 8);
            const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
            const trunkMesh = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunkMesh.position.set(treeX, 4, treeZ);
            trunkMesh.castShadow = true;
            this.scene.add(trunkMesh);

            // Tree leaves
            const leavesGeometry = new THREE.SphereGeometry(4, 8, 8);
            const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x228b22 });
            const leavesMesh = new THREE.Mesh(leavesGeometry, leavesMaterial);
            leavesMesh.position.set(treeX, 10, treeZ);
            leavesMesh.castShadow = true;
            this.scene.add(leavesMesh);
        }

        // Add some buildings in the distance
        for (let i = 0; i < 10; i++) {
            const buildingX = (Math.random() - 0.5) * 400;
            const buildingZ = (Math.random() - 0.5) * 400;
            const buildingHeight = 20 + Math.random() * 30;

            // Skip if too close to track
            const distanceFromCenter = Math.sqrt(buildingX * buildingX + buildingZ * buildingZ);
            if (distanceFromCenter < 100) continue;

            const buildingGeometry = new THREE.BoxGeometry(
                10 + Math.random() * 10,
                buildingHeight,
                10 + Math.random() * 10
            );
            const buildingMaterial = new THREE.MeshLambertMaterial({
                color: new THREE.Color().setHSL(0.6, 0.2, 0.4 + Math.random() * 0.3)
            });
            const buildingMesh = new THREE.Mesh(buildingGeometry, buildingMaterial);
            buildingMesh.position.set(buildingX, buildingHeight / 2, buildingZ);
            buildingMesh.castShadow = true;
            this.scene.add(buildingMesh);
        }
    }

    createCheckpoints() {
        // Create invisible checkpoints for lap detection
        const checkpointPositions = [
            { x: 0, z: -40 },    // Start/finish
            { x: 40, z: -20 },   // Quarter 1
            { x: 0, z: 40 },     // Half
            { x: -40, z: -20 }   // Quarter 3
        ];

        checkpointPositions.forEach((pos, index) => {
            const checkpoint = {
                position: new THREE.Vector3(pos.x, 2, pos.z),
                radius: 8,
                passed: false,
                isFinishLine: index === 0
            };

            this.checkpoints.push(checkpoint);

            // Visual indicator (optional - can be made invisible)
            const checkpointGeometry = new THREE.RingGeometry(6, 8, 16);
            const checkpointMaterial = new THREE.MeshBasicMaterial({
                color: checkpoint.isFinishLine ? 0x00ff00 : 0xffff00,
                transparent: true,
                opacity: 0.3,
                side: THREE.DoubleSide
            });
            const checkpointMesh = new THREE.Mesh(checkpointGeometry, checkpointMaterial);
            checkpointMesh.position.copy(checkpoint.position);
            checkpointMesh.rotation.x = -Math.PI / 2;
            this.scene.add(checkpointMesh);
        });
    }

    checkLapProgress(carPosition) {
        // Check if car passed through checkpoints
        this.checkpoints.forEach((checkpoint, index) => {
            const distance = carPosition.distanceTo(checkpoint.position);

            if (distance < checkpoint.radius && !checkpoint.passed) {
                checkpoint.passed = true;
                console.log(`Checkpoint ${index + 1} passed!`);

                if (checkpoint.isFinishLine) {
                    // Check if all other checkpoints were passed
                    const allCheckpointsPassed = this.checkpoints
                        .filter((cp, i) => i !== 0)
                        .every(cp => cp.passed);

                    if (allCheckpointsPassed) {
                        console.log('🏁 Lap completed!');
                        this.resetCheckpoints();
                        return true; // Lap completed
                    }
                }
            }
        });

        return false;
    }

    resetCheckpoints() {
        this.checkpoints.forEach(checkpoint => {
            checkpoint.passed = false;
        });
    }

    getStartPosition() {
        return { x: 0, y: 2, z: -35 };
    }
}