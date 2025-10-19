/**
 * DetailedCar.js
 * Creates realistic, detailed 3D car models with proper geometry and materials
 * Replaces simple box cars with detailed vehicles
 */

class DetailedCar {
    constructor(materialUpgrade) {
        this.materialUpgrade = materialUpgrade;
        this.carSpecs = this.getCarSpecifications();
    }

    /**
     * Get car specifications for realistic proportions
     */
    getCarSpecifications() {
        return {
            // Sports car dimensions (in meters)
            length: 4.5,
            width: 1.9,
            height: 1.3,
            wheelbase: 2.7,
            track: 1.6,
            groundClearance: 0.12,
            
            // Wheel specifications
            wheelDiameter: 0.65,
            wheelWidth: 0.25,
            rimDiameter: 0.45,
            
            // Body proportions
            hoodLength: 1.8,
            roofLength: 1.2,
            trunkLength: 0.9
        };
    }

    /**
     * Create a complete detailed car
     */
    createCar(options = {}) {
        const {
            color = 0xff0000,
            paintType = 'metallic',
            rimFinish = 'polished',
            hasWing = true,
            customLivery = null
        } = options;

        const carGroup = new THREE.Group();
        carGroup.name = 'DetailedCar';

        // Create all car parts
        const body = this.createBody(color, paintType);
        const windows = this.createWindows();
        const wheels = this.createWheels(rimFinish);
        const lights = this.createLights();
        const details = this.createDetails();
        const wing = hasWing ? this.createWing() : null;
        const undercarriage = this.createUndercarriage();

        // Add all parts to car group
        carGroup.add(body);
        windows.forEach(w => carGroup.add(w));
        wheels.forEach(w => carGroup.add(w));
        Object.values(lights).forEach(l => carGroup.add(l));
        Object.values(details).forEach(d => carGroup.add(d));
        if (wing) carGroup.add(wing);
        carGroup.add(undercarriage);

        // Store references for animation
        carGroup.userData = {
            wheels: wheels,
            lights: lights,
            wing: wing
        };

        return carGroup;
    }

    /**
     * Create car body with realistic shape
     */
    createBody(color, paintType) {
        const spec = this.carSpecs;
        const bodyGroup = new THREE.Group();
        bodyGroup.name = 'Body';

        // Main body (lower section)
        const lowerBodyGeometry = new THREE.BoxGeometry(
            spec.width,
            spec.height * 0.5,
            spec.length,
            10, 5, 15 // Segments for smoother curves
        );
        
        const bodyMaterial = this.materialUpgrade.createCarPaintMaterial({
            color: color,
            type: paintType
        });

        const lowerBody = new THREE.Mesh(lowerBodyGeometry, bodyMaterial);
        lowerBody.position.y = spec.height * 0.25 + spec.groundClearance;
        lowerBody.castShadow = true;
        lowerBody.receiveShadow = true;
        bodyGroup.add(lowerBody);

        // Hood (front angled section)
        const hoodGeometry = new THREE.BoxGeometry(
            spec.width * 0.95,
            spec.height * 0.3,
            spec.hoodLength,
            8, 3, 10
        );
        const hood = new THREE.Mesh(hoodGeometry, bodyMaterial);
        hood.position.set(0, spec.height * 0.4 + spec.groundClearance, spec.length * 0.25);
        hood.rotation.x = -0.1; // Slight angle
        hood.castShadow = true;
        bodyGroup.add(hood);

        // Roof/cabin
        const roofGeometry = new THREE.BoxGeometry(
            spec.width * 0.85,
            spec.height * 0.4,
            spec.roofLength,
            6, 3, 8
        );
        const roof = new THREE.Mesh(roofGeometry, bodyMaterial);
        roof.position.set(0, spec.height * 0.7 + spec.groundClearance, -0.2);
        roof.castShadow = true;
        bodyGroup.add(roof);

        // Trunk (rear section)
        const trunkGeometry = new THREE.BoxGeometry(
            spec.width * 0.9,
            spec.height * 0.35,
            spec.trunkLength,
            6, 3, 6
        );
        const trunk = new THREE.Mesh(trunkGeometry, bodyMaterial);
        trunk.position.set(0, spec.height * 0.4 + spec.groundClearance, -spec.length * 0.3);
        trunk.rotation.x = 0.08; // Slight angle
        trunk.castShadow = true;
        bodyGroup.add(trunk);

        // Front bumper
        const bumperMaterial = this.materialUpgrade.createCarPaintMaterial({
            color: 0x1a1a1a,
            type: 'matte'
        });
        const frontBumper = new THREE.Mesh(
            new THREE.BoxGeometry(spec.width, 0.2, 0.3),
            bumperMaterial
        );
        frontBumper.position.set(0, spec.groundClearance + 0.1, spec.length * 0.5);
        bodyGroup.add(frontBumper);

        // Rear bumper
        const rearBumper = frontBumper.clone();
        rearBumper.position.z = -spec.length * 0.5;
        bodyGroup.add(rearBumper);

        // Side skirts
        const skirtGeometry = new THREE.BoxGeometry(0.1, 0.15, spec.length * 0.6);
        const skirtMaterial = this.materialUpgrade.createCarPaintMaterial({
            color: 0x0a0a0a,
            type: 'carbon'
        });
        
        const leftSkirt = new THREE.Mesh(skirtGeometry, skirtMaterial);
        leftSkirt.position.set(-spec.width * 0.5, spec.groundClearance + 0.05, 0);
        bodyGroup.add(leftSkirt);
        
        const rightSkirt = leftSkirt.clone();
        rightSkirt.position.x = spec.width * 0.5;
        bodyGroup.add(rightSkirt);

        return bodyGroup;
    }

    /**
     * Create windows and windshield
     */
    createWindows() {
        const spec = this.carSpecs;
        const windows = [];
        const glassMaterial = this.materialUpgrade.createGlassMaterial({
            color: 0x88ccff,
            transmission: 0.85
        });

        // Windshield
        const windshieldGeometry = new THREE.BoxGeometry(
            spec.width * 0.82,
            spec.height * 0.35,
            0.05
        );
        const windshield = new THREE.Mesh(windshieldGeometry, glassMaterial);
        windshield.position.set(0, spec.height * 0.7 + spec.groundClearance, spec.roofLength * 0.5);
        windshield.rotation.x = -0.3;
        windows.push(windshield);

        // Rear window
        const rearWindow = windshield.clone();
        rearWindow.position.z = -spec.roofLength * 0.5;
        rearWindow.rotation.x = 0.4;
        windows.push(rearWindow);

        // Side windows (left)
        const sideWindowGeometry = new THREE.BoxGeometry(
            0.05,
            spec.height * 0.3,
            spec.roofLength * 0.4
        );
        const leftFrontWindow = new THREE.Mesh(sideWindowGeometry, glassMaterial);
        leftFrontWindow.position.set(-spec.width * 0.42, spec.height * 0.7 + spec.groundClearance, 0.3);
        windows.push(leftFrontWindow);

        const leftRearWindow = leftFrontWindow.clone();
        leftRearWindow.position.z = -0.4;
        windows.push(leftRearWindow);

        // Side windows (right)
        const rightFrontWindow = leftFrontWindow.clone();
        rightFrontWindow.position.x = spec.width * 0.42;
        windows.push(rightFrontWindow);

        const rightRearWindow = leftRearWindow.clone();
        rightRearWindow.position.x = spec.width * 0.42;
        windows.push(rightRearWindow);

        return windows;
    }

    /**
     * Create detailed wheels with rims and tires
     */
    createWheels(rimFinish) {
        const spec = this.carSpecs;
        const wheels = [];

        const positions = [
            { x: -spec.track * 0.5, z: spec.wheelbase * 0.5 },   // Front left
            { x: spec.track * 0.5, z: spec.wheelbase * 0.5 },    // Front right
            { x: -spec.track * 0.5, z: -spec.wheelbase * 0.5 },  // Rear left
            { x: spec.track * 0.5, z: -spec.wheelbase * 0.5 }    // Rear right
        ];

        positions.forEach((pos, index) => {
            const wheel = this.createWheel(rimFinish, index < 2);
            wheel.position.set(pos.x, spec.wheelDiameter * 0.5, pos.z);
            wheel.name = `Wheel_${index}`;
            wheels.push(wheel);
        });

        return wheels;
    }

    /**
     * Create a single wheel with rim and tire
     */
    createWheel(rimFinish, isFront) {
        const spec = this.carSpecs;
        const wheelGroup = new THREE.Group();

        // Tire
        const tireGeometry = new THREE.TorusGeometry(
            spec.wheelDiameter * 0.5,
            spec.wheelWidth * 0.5,
            16, 32
        );
        const tireMaterial = this.materialUpgrade.createTireMaterial();
        const tire = new THREE.Mesh(tireGeometry, tireMaterial);
        tire.rotation.y = Math.PI / 2;
        tire.castShadow = true;
        wheelGroup.add(tire);

        // Rim
        const rimGeometry = new THREE.CylinderGeometry(
            spec.rimDiameter * 0.5,
            spec.rimDiameter * 0.5,
            spec.wheelWidth * 0.6,
            32
        );
        const rimMaterial = this.materialUpgrade.createRimMaterial(rimFinish);
        const rim = new THREE.Mesh(rimGeometry, rimMaterial);
        rim.rotation.z = Math.PI / 2;
        rim.castShadow = true;
        wheelGroup.add(rim);

        // Spokes (5-spoke design)
        const spokeMaterial = rimMaterial.clone();
        for (let i = 0; i < 5; i++) {
            const spokeGeometry = new THREE.BoxGeometry(
                0.04,
                spec.rimDiameter * 0.9,
                0.06
            );
            const spoke = new THREE.Mesh(spokeGeometry, spokeMaterial);
            spoke.rotation.x = (Math.PI * 2 / 5) * i;
            wheelGroup.add(spoke);
        }

        // Brake disc (visible through spokes)
        const discGeometry = new THREE.CylinderGeometry(
            spec.rimDiameter * 0.35,
            spec.rimDiameter * 0.35,
            0.02,
            32
        );
        const discMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.9,
            roughness: 0.3
        });
        const disc = new THREE.Mesh(discGeometry, discMaterial);
        disc.rotation.z = Math.PI / 2;
        wheelGroup.add(disc);

        // Brake caliper
        const caliperGeometry = new THREE.BoxGeometry(0.08, 0.15, 0.12);
        const caliperMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            metalness: 0.8,
            roughness: 0.2
        });
        const caliper = new THREE.Mesh(caliperGeometry, caliperMaterial);
        caliper.position.set(0.02, spec.rimDiameter * 0.25, 0);
        wheelGroup.add(caliper);

        return wheelGroup;
    }

    /**
     * Create car lights (headlights, taillights, etc.)
     */
    createLights() {
        const spec = this.carSpecs;
        const lights = {};

        // Headlights
        const headlightMaterial = this.materialUpgrade.createLightMaterial(0xffffee, 1.5);
        const headlightGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.1, 16);
        
        lights.headlightLeft = new THREE.Mesh(headlightGeometry, headlightMaterial);
        lights.headlightLeft.rotation.x = Math.PI / 2;
        lights.headlightLeft.position.set(-spec.width * 0.35, spec.height * 0.3, spec.length * 0.48);
        
        lights.headlightRight = lights.headlightLeft.clone();
        lights.headlightRight.position.x = spec.width * 0.35;

        // Taillights
        const taillightMaterial = this.materialUpgrade.createLightMaterial(0xff0000, 1.0);
        const taillightGeometry = new THREE.BoxGeometry(0.25, 0.1, 0.08);
        
        lights.taillightLeft = new THREE.Mesh(taillightGeometry, taillightMaterial);
        lights.taillightLeft.position.set(-spec.width * 0.4, spec.height * 0.35, -spec.length * 0.48);
        
        lights.taillightRight = lights.taillightLeft.clone();
        lights.taillightRight.position.x = spec.width * 0.4;

        return lights;
    }

    /**
     * Create additional details (mirrors, exhaust, etc.)
     */
    createDetails() {
        const spec = this.carSpecs;
        const details = {};

        // Side mirrors
        const mirrorMaterial = this.materialUpgrade.createCarPaintMaterial({
            color: 0x1a1a1a,
            type: 'carbon'
        });
        
        const mirrorHousingGeometry = new THREE.BoxGeometry(0.12, 0.08, 0.15);
        details.mirrorLeft = new THREE.Mesh(mirrorHousingGeometry, mirrorMaterial);
        details.mirrorLeft.position.set(-spec.width * 0.48, spec.height * 0.65, spec.roofLength * 0.3);
        
        details.mirrorRight = details.mirrorLeft.clone();
        details.mirrorRight.position.x = spec.width * 0.48;

        // Exhaust pipes
        const exhaustMaterial = this.materialUpgrade.createRimMaterial('polished');
        const exhaustGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.3, 16);
        
        details.exhaustLeft = new THREE.Mesh(exhaustGeometry, exhaustMaterial);
        details.exhaustLeft.rotation.x = Math.PI / 2;
        details.exhaustLeft.position.set(-spec.width * 0.3, spec.groundClearance + 0.1, -spec.length * 0.48);
        
        details.exhaustRight = details.exhaustLeft.clone();
        details.exhaustRight.position.x = spec.width * 0.3;

        // Front grille
        const grilleMaterial = new THREE.MeshStandardMaterial({
            color: 0x0a0a0a,
            metalness: 0.9,
            roughness: 0.5
        });
        const grilleGeometry = new THREE.BoxGeometry(spec.width * 0.6, 0.25, 0.05);
        details.grille = new THREE.Mesh(grilleGeometry, grilleMaterial);
        details.grille.position.set(0, spec.height * 0.2, spec.length * 0.49);

        return details;
    }

    /**
     * Create rear wing/spoiler
     */
    createWing() {
        const spec = this.carSpecs;
        const wingGroup = new THREE.Group();

        const wingMaterial = this.materialUpgrade.createCarPaintMaterial({
            color: 0x0a0a0a,
            type: 'carbon'
        });

        // Wing supports
        const supportGeometry = new THREE.BoxGeometry(0.04, 0.3, 0.06);
        const supportLeft = new THREE.Mesh(supportGeometry, wingMaterial);
        supportLeft.position.set(-spec.width * 0.35, spec.height * 0.5, -spec.length * 0.45);
        wingGroup.add(supportLeft);

        const supportRight = supportLeft.clone();
        supportRight.position.x = spec.width * 0.35;
        wingGroup.add(supportRight);

        // Wing blade
        const bladeGeometry = new THREE.BoxGeometry(spec.width * 0.8, 0.05, 0.35);
        const blade = new THREE.Mesh(bladeGeometry, wingMaterial);
        blade.position.set(0, spec.height * 0.65, -spec.length * 0.45);
        blade.rotation.x = 0.2; // Angle for downforce
        wingGroup.add(blade);

        return wingGroup;
    }

    /**
     * Create undercarriage details
     */
    createUndercarriage() {
        const spec = this.carSpecs;
        const underGroup = new THREE.Group();

        const underMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            metalness: 0.5,
            roughness: 0.8
        });

        // Flat bottom panel (for aerodynamics)
        const bottomPanel = new THREE.Mesh(
            new THREE.BoxGeometry(spec.width * 0.9, 0.02, spec.length * 0.9),
            underMaterial
        );
        bottomPanel.position.y = spec.groundClearance;
        bottomPanel.receiveShadow = true;
        underGroup.add(bottomPanel);

        return underGroup;
    }

    /**
     * Update wheel rotation for animation
     */
    updateWheelRotation(carGroup, distance) {
        const wheels = carGroup.userData.wheels;
        if (!wheels) return;

        const spec = this.carSpecs;
        const rotation = distance / (spec.wheelDiameter * Math.PI);

        wheels.forEach(wheel => {
            wheel.rotation.x = rotation;
        });
    }

    /**
     * Update steering angle for front wheels
     */
    updateSteering(carGroup, angle) {
        const wheels = carGroup.userData.wheels;
        if (!wheels || wheels.length < 2) return;

        // Front wheels (first two)
        wheels[0].rotation.y = angle;
        wheels[1].rotation.y = angle;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DetailedCar;
}
