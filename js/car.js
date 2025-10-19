class Car {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.mesh = null;
        this.body = null;
        this.wheels = [];
        this.wheelBodies = [];

        // Car properties
        this.maxSpeed = 30;
        this.acceleration = 15;
        this.brakeForce = 20;
        this.steerAngle = 0;
        this.maxSteerAngle = Math.PI / 6; // 30 degrees
        this.wheelRadius = 0.4;
        this.wheelWidth = 0.3;

        // Car state
        this.currentSpeed = 0;
        this.engineForce = 0;
        this.brakeForce = 0;

        // Visual effects state
        this.damage = 0; // 0 = perfect, 1 = destroyed
        this.isBraking = false;
        this.engineTemp = 0;
    }

    async create() {
        console.log('🚗 Creating car...');

        this.createMesh();
        this.createPhysicsBody();
        this.createWheels();

        console.log('✅ Car created successfully!');
    }

    createMesh() {
        // Car body geometry - more detailed
        const carGroup = new THREE.Group();

        // Main body
        const bodyGeometry = new THREE.BoxGeometry(4, 1.5, 8);
        const bodyMaterial = new THREE.MeshLambertMaterial({
            color: 0xff4444,
            transparent: true,
            opacity: 0.9
        });
        const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        bodyMesh.position.y = 0.75;
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        carGroup.add(bodyMesh);

        // Car roof
        const roofGeometry = new THREE.BoxGeometry(3.2, 1.2, 4);
        const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const roofMesh = new THREE.Mesh(roofGeometry, roofMaterial);
        roofMesh.position.set(0, 2, 0.5);
        roofMesh.castShadow = true;
        carGroup.add(roofMesh);

        // Windshield
        const windshieldGeometry = new THREE.BoxGeometry(3.4, 1.3, 0.1);
        const windshieldMaterial = new THREE.MeshLambertMaterial({
            color: 0x87CEEB,
            transparent: true,
            opacity: 0.6
        });
        const windshieldMesh = new THREE.Mesh(windshieldGeometry, windshieldMaterial);
        windshieldMesh.position.set(0, 2, 2.1);
        carGroup.add(windshieldMesh);

        // Front grille
        const grilleGeometry = new THREE.BoxGeometry(2.5, 0.8, 0.2);
        const grilleMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });
        const grilleMesh = new THREE.Mesh(grilleGeometry, grilleMaterial);
        grilleMesh.position.set(0, 0.8, 4.1);
        carGroup.add(grilleMesh);

        // Headlights with dynamic lighting
        const headlightGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const headlightMaterial = new THREE.MeshLambertMaterial({
            color: 0xffffcc,
            emissive: 0x444422
        });

        this.leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        this.leftHeadlight.position.set(-1.2, 1, 3.8);
        carGroup.add(this.leftHeadlight);

        this.rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        this.rightHeadlight.position.set(1.2, 1, 3.8);
        carGroup.add(this.rightHeadlight);

        // Add spotlights for headlights
        this.leftHeadlightSpot = new THREE.SpotLight(0xffffcc, 1, 30, Math.PI / 6, 0.5);
        this.leftHeadlightSpot.position.copy(this.leftHeadlight.position);
        this.leftHeadlightSpot.castShadow = true;
        carGroup.add(this.leftHeadlightSpot);

        this.rightHeadlightSpot = new THREE.SpotLight(0xffffcc, 1, 30, Math.PI / 6, 0.5);
        this.rightHeadlightSpot.position.copy(this.rightHeadlight.position);
        this.rightHeadlightSpot.castShadow = true;
        carGroup.add(this.rightHeadlightSpot);

        // Taillights with brake light functionality
        const taillightMaterial = new THREE.MeshLambertMaterial({
            color: 0xff2222,
            emissive: 0x220000
        });

        this.leftTaillight = new THREE.Mesh(headlightGeometry, taillightMaterial);
        this.leftTaillight.position.set(-1.2, 1, -3.8);
        carGroup.add(this.leftTaillight);

        this.rightTaillight = new THREE.Mesh(headlightGeometry, taillightMaterial);
        this.rightTaillight.position.set(1.2, 1, -3.8);
        carGroup.add(this.rightTaillight);

        // Add underglow support
        this.underglowEnabled = false;
        this.underglowColor = 0x00ffff;
        this.createUnderglow(carGroup);

        this.mesh = carGroup;
        this.scene.add(this.mesh);
    }

    createPhysicsBody() {
        // Car body physics
        const carShape = new CANNON.Box(new CANNON.Vec3(2, 0.75, 4));
        this.body = new CANNON.Body({ mass: 1000 });
        this.body.addShape(carShape);
        this.body.position.set(0, 5, 0); // Start above ground

        // Create the vehicle
        this.vehicle = new CANNON.RaycastVehicle({
            chassisBody: this.body,
        });
    }

    createWheels() {
        const wheelOptions = {
            radius: this.wheelRadius,
            directionLocal: new CANNON.Vec3(0, -1, 0),
            suspensionStiffness: 30,
            suspensionRestLength: 0.3,
            frictionSlip: 5,
            dampingRelaxation: 2.3,
            dampingCompression: 4.4,
            maxSuspensionForce: 100000,
            rollInfluence: 0.01,
            axleLocal: new CANNON.Vec3(0, 0, 1),
            chassisConnectionPointLocal: new CANNON.Vec3(1, 0, 1),
            maxSuspensionTravel: 0.3,
            customSlidingRotationalSpeed: -30,
            useCustomSlidingRotationalSpeed: true,
        };

        wheelOptions.chassisConnectionPointLocal.set(-1.5, 0, 2.5);
        this.vehicle.addWheel(wheelOptions);

        wheelOptions.chassisConnectionPointLocal.set(1.5, 0, 2.5);
        this.vehicle.addWheel(wheelOptions);

        wheelOptions.chassisConnectionPointLocal.set(-1.5, 0, -2.5);
        this.vehicle.addWheel(wheelOptions);

        wheelOptions.chassisConnectionPointLocal.set(1.5, 0, -2.5);
        this.vehicle.addWheel(wheelOptions);

        this.vehicle.addToWorld(this.world);

        // Add wheel meshes
        this.vehicle.wheelInfos.forEach(wheel => {
            const wheelGeometry = new THREE.CylinderGeometry(wheel.radius, wheel.radius, this.wheelWidth, 32);
            const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });
            const wheelMesh = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheelMesh.rotation.z = Math.PI / 2;
            this.wheels.push(wheelMesh);
            this.scene.add(wheelMesh);
        });
    }

    accelerate(direction) {
        this.engineForce = direction * this.acceleration * 1000; // Convert to a reasonable force value

        // Apply force to rear wheels
        this.vehicle.applyEngineForce(this.engineForce, 2);
        this.vehicle.applyEngineForce(this.engineForce, 3);

        // Apply brake force if reversing
        if (direction < 0) {
            this.vehicle.setBrake(this.brakeForce, 0);
            this.vehicle.setBrake(this.brakeForce, 1);
        } else {
            this.vehicle.setBrake(0, 0);
            this.vehicle.setBrake(0, 1);
        }
    }

    steer(direction) {
        this.steerAngle = direction * this.maxSteerAngle;
        // Steer front wheels
        this.vehicle.setSteeringValue(this.steerAngle, 0);
        this.vehicle.setSteeringValue(this.steerAngle, 1);
    }

    handbrake() {
        // Apply brake to all wheels
        this.vehicle.setBrake(this.brakeForce * 2, 0);
        this.vehicle.setBrake(this.brakeForce * 2, 1);
        this.vehicle.setBrake(this.brakeForce * 2, 2);
        this.vehicle.setBrake(this.brakeForce * 2, 3);
    }

    update(deltaTime) {
        if (!this.body || !this.mesh || !this.vehicle) return;

        // Update mesh position to match physics body
        this.mesh.position.copy(this.body.position);
        this.mesh.quaternion.copy(this.body.quaternion);

        // Update wheels
        for (let i = 0; i < this.vehicle.wheelInfos.length; i++) {
            this.vehicle.updateWheelTransform(i);
            const transform = this.vehicle.wheelInfos[i].worldTransform;
            const wheelMesh = this.wheels[i];
            wheelMesh.position.copy(transform.position);
            wheelMesh.quaternion.copy(transform.quaternion);
        }

        // Update visual effects
        this.updateVisualEffects(deltaTime);
    }

    getPosition() {
        if (!this.body) return new THREE.Vector3();
        // Convert CANNON.Vec3 to THREE.Vector3
        return new THREE.Vector3(
            this.body.position.x,
            this.body.position.y,
            this.body.position.z
        );
    }

    getRotation() {
        if (!this.body) return new THREE.Quaternion();
        // Convert CANNON.Quaternion to THREE.Quaternion
        return new THREE.Quaternion(
            this.body.quaternion.x,
            this.body.quaternion.y,
            this.body.quaternion.z,
            this.body.quaternion.w
        );
    }

    getSpeed() {
        if (!this.body) return 0;
        // Calculate velocity magnitude directly from CANNON.Vec3
        return this.body.velocity.length();
    }

    reset(position = { x: 0, y: 5, z: 0 }) {
        if (this.body) {
            this.body.position.set(position.x, position.y, position.z);
            this.body.velocity.set(0, 0, 0);
            this.body.angularVelocity.set(0, 0, 0);
            this.body.quaternion.set(0, 0, 0, 1);
        }
    }

    createUnderglow(carGroup) {
        // Create underglow light rings
        this.underglowLights = [];

        const positions = [
            { x: -1.5, y: -0.5, z: 2 },   // Front left
            { x: 1.5, y: -0.5, z: 2 },    // Front right
            { x: -1.5, y: -0.5, z: -2 },  // Rear left
            { x: 1.5, y: -0.5, z: -2 }    // Rear right
        ];

        positions.forEach(pos => {
            const ringGeometry = new THREE.RingGeometry(0.8, 1.2, 16);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: this.underglowColor,
                transparent: true,
                opacity: 0.6,
                side: THREE.DoubleSide
            });

            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.position.set(pos.x, pos.y, pos.z);
            ring.rotation.x = -Math.PI / 2;
            ring.visible = this.underglowEnabled;

            this.underglowLights.push(ring);
            carGroup.add(ring);
        });
    }

    toggleUnderglow() {
        this.underglowEnabled = !this.underglowEnabled;
        this.underglowLights.forEach(light => {
            light.visible = this.underglowEnabled;
        });
    }

    setUnderglowColor(color) {
        this.underglowColor = color;
        this.underglowLights.forEach(light => {
            light.material.color.setHex(color);
        });
    }

    updateBrakeLights() {
        // Intensify brake lights when braking
        const brakeIntensity = this.isBraking ? 0.8 : 0.2;

        if (this.leftTaillight && this.rightTaillight) {
            this.leftTaillight.material.emissive.setHex(
                this.isBraking ? 0xff4444 : 0x220000
            );
            this.rightTaillight.material.emissive.setHex(
                this.isBraking ? 0xff4444 : 0x220000
            );
        }
    }

    updateHeadlights(timeOfDay) {
        // Auto-enable headlights during night time
        const isNight = timeOfDay < 0.2 || timeOfDay > 0.8;
        const intensity = isNight ? 1.0 : 0.3;

        if (this.leftHeadlightSpot && this.rightHeadlightSpot) {
            this.leftHeadlightSpot.intensity = intensity;
            this.rightHeadlightSpot.intensity = intensity;

            // Update headlight direction
            const forwardDirection = new THREE.Vector3(0, -0.2, 1);
            
            // Convert CANNON.Quaternion to THREE.Quaternion for rotation
            const threeQuat = new THREE.Quaternion(
                this.body.quaternion.x,
                this.body.quaternion.y,
                this.body.quaternion.z,
                this.body.quaternion.w
            );
            forwardDirection.applyQuaternion(threeQuat);

            // Convert body position to THREE.Vector3 for headlight targeting
            const bodyPos = new THREE.Vector3(
                this.body.position.x,
                this.body.position.y,
                this.body.position.z
            );

            this.leftHeadlightSpot.target.position.copy(bodyPos).add(
                forwardDirection.clone().multiplyScalar(20)
            );
            this.rightHeadlightSpot.target.position.copy(bodyPos).add(
                forwardDirection.clone().multiplyScalar(20)
            );
        }
    }

    applyDamage(amount) {
        this.damage = Math.min(this.damage + amount, 1.0);
        this.updateDamageVisualization();
    }

    updateDamageVisualization() {
        if (!this.mesh) return;

        // Find the main body mesh
        const bodyMesh = this.mesh.children.find(child =>
            child.geometry && child.geometry.type === 'BoxGeometry' &&
            child.position.y > 0.5
        );

        if (bodyMesh && bodyMesh.material) {
            // Create scratches and dents effect
            const scratchIntensity = this.damage;

            // Darken the car color based on damage
            const originalColor = 0xff4444;
            const damagedColor = new THREE.Color(originalColor).lerp(
                new THREE.Color(0x333333),
                scratchIntensity * 0.5
            );

            bodyMesh.material.color.copy(damagedColor);

            // Reduce opacity for severe damage
            if (scratchIntensity > 0.7) {
                bodyMesh.material.opacity = 1.0 - (scratchIntensity - 0.7) * 0.3;
                bodyMesh.material.transparent = true;
            }
        }
    }

    updateVisualEffects(deltaTime, timeOfDay = 0.5) {
        // Update brake lights
        this.updateBrakeLights();

        // Update headlights based on time of day
        this.updateHeadlights(timeOfDay);

        // Animate underglow
        if (this.underglowEnabled && this.underglowLights.length > 0) {
            const time = Date.now() * 0.005;
            const intensity = 0.6 + Math.sin(time) * 0.3;

            this.underglowLights.forEach((light, index) => {
                light.material.opacity = intensity + Math.sin(time + index) * 0.2;
            });
        }

        // Update engine temperature naturally
        this.engineTemp = Math.max(this.engineTemp - deltaTime * 0.1, 0.0);
    }

    getEngineTemp() {
        return this.engineTemp;
    }

    getDamage() {
        return this.damage;
    }

    isBrakingActive() {
        return this.isBraking;
    }
}