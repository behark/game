/**
 * INTEGRATION_GUIDE.md
 * Complete guide for integrating all AAA features into Speed Rivals
 */

# 🎮 Advanced Speed Rivals - Integration Guide

This guide explains how to integrate all the new AAA-quality systems into your racing game.

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Phase 1: Visual Overhaul](#phase-1-visual-overhaul)
3. [Phase 2: Advanced Physics](#phase-2-advanced-physics)
4. [Phase 3: Track Generation](#phase-3-track-generation)
5. [Phase 4: Gameplay Systems](#phase-4-gameplay-systems)
6. [Phase 5: Audio](#phase-5-audio)
7. [Complete Integration](#complete-integration)
8. [Testing & Optimization](#testing--optimization)

---

## 🚀 Quick Start

### Step 1: Include New Scripts in HTML

Add these scripts to your `index.html` **before** your main game script:

```html
<!-- Rendering Systems -->
<script src="js/rendering/MaterialUpgrade.js"></script>
<script src="js/rendering/LightingSystem.js"></script>
<script src="js/rendering/PostProcessingManager.js"></script>

<!-- Models -->
<script src="js/models/DetailedCar.js"></script>
<script src="js/models/TrackGenerator.js"></script>

<!-- Physics -->
<script src="js/physics/SuspensionSystem.js"></script>
<script src="js/physics/TirePhysics.js"></script>
<script src="js/physics/Aerodynamics.js"></script>

<!-- Gameplay -->
<script src="js/gameplay/CareerMode.js"></script>

<!-- Audio -->
<script src="js/audio/AudioSystem.js"></script>

<!-- Your main game script -->
<script src="js/game.js"></script>
```

### Step 2: Update package.json

Make sure you have the required dependencies:

```json
{
  "dependencies": {
    "three": "^0.160.0",
    "cannon-es": "^0.20.0",
    "postprocessing": "^6.33.0"
  }
}
```

---

## 🎨 Phase 1: Visual Overhaul

### Initialize Material System

In your `game.js` or main game file, add this to your initialization:

```javascript
class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.renderer = this.createRenderer();
        this.camera = this.createCamera();
        
        // NEW: Initialize visual systems
        this.initializeVisualSystems();
        
        // Rest of your initialization...
    }
    
    initializeVisualSystems() {
        // Material system
        this.materialSystem = new MaterialUpgrade(this.renderer, this.scene);
        this.materialSystem.enablePBR();
        this.materialSystem.loadEnvironment();
        
        // Lighting system
        this.lightingSystem = new LightingSystem(this.scene);
        this.lightingSystem.init();
        this.lightingSystem.updateTimeOfDay(14); // 2 PM
        
        // Post-processing
        this.postProcessing = new PostProcessingManager(
            this.renderer,
            this.scene,
            this.camera
        );
        this.postProcessing.init();
        this.postProcessing.setQuality('high');
    }
    
    createRenderer() {
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance'
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        return renderer;
    }
}
```

### Replace Car Models

Replace your simple car creation with detailed models:

```javascript
// OLD:
// const carGeometry = new THREE.BoxGeometry(2, 1, 4);
// const carMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
// const car = new THREE.Mesh(carGeometry, carMaterial);

// NEW:
createPlayerCar() {
    const detailedCarBuilder = new DetailedCar(this.materialSystem);
    
    const car = detailedCarBuilder.createCar({
        color: 0xff0000,
        paintType: 'metallic',
        rimFinish: 'polished',
        hasWing: true
    });
    
    this.scene.add(car);
    
    // Add car lights
    const headlights = this.lightingSystem.addCarHeadlights(car);
    const brakeLights = this.lightingSystem.addCarBrakeLights(car);
    
    return { mesh: car, headlights, brakeLights };
}
```

### Update Render Loop

Replace your render call with post-processing:

```javascript
// OLD:
// this.renderer.render(this.scene, this.camera);

// NEW:
animate(deltaTime) {
    // Update systems
    this.lightingSystem.update(deltaTime);
    this.postProcessing.update(deltaTime, this.car.currentSpeed);
    
    // Render with post-processing
    this.postProcessing.render();
}
```

---

## ⚙️ Phase 2: Advanced Physics

### Initialize Physics Systems

```javascript
initializePhysicsSystems() {
    // Suspension (one per car)
    const wheelPositions = [
        new CANNON.Vec3(-0.8, 0, 1.3),   // Front left
        new CANNON.Vec3(0.8, 0, 1.3),    // Front right
        new CANNON.Vec3(-0.8, 0, -1.3),  // Rear left
        new CANNON.Vec3(0.8, 0, -1.3)    // Rear right
    ];
    
    this.suspensionSystem = new SuspensionSystem(
        this.carBody, // CANNON.Body
        wheelPositions
    );
    this.suspensionSystem.setSuspensionPreset('sport');
    
    // Tire physics
    this.tireSet = new TireSet();
    this.tireSet.setCompound('soft'); // soft, medium, hard
    
    // Aerodynamics
    this.aerodynamics = new Aerodynamics(this.carBody);
    this.aerodynamics.setPreset('balanced');
    
    // Damage system
    this.damageSystem = new DamageSystem(this.carMesh, this.carBody);
}
```

### Update Physics Loop

```javascript
updatePhysics(deltaTime) {
    // Update suspension
    this.suspensionSystem.update(deltaTime, this.world);
    
    // Get wheel loads for tire physics
    const wheelData = this.suspensionSystem.getWheelData();
    const loads = {
        frontLeft: wheelData[0].compression * 4000,
        frontRight: wheelData[1].compression * 4000,
        rearLeft: wheelData[2].compression * 4000,
        rearRight: wheelData[3].compression * 4000
    };
    
    // Update tires
    const speed = this.carBody.velocity.length() * 3.6; // km/h
    this.tireSet.update(deltaTime, speed, loads);
    
    // Calculate tire forces (simplified)
    const slipAngle = this.calculateSlipAngle();
    const slipRatio = this.calculateSlipRatio();
    
    const tireForces = this.tireSet.tires.frontLeft.calculateCombinedForce(
        slipAngle,
        slipRatio,
        loads.frontLeft,
        'asphalt'
    );
    
    // Apply tire forces to car body
    this.applyTireForces(tireForces);
    
    // Update aerodynamics
    this.aerodynamics.update(deltaTime);
    
    // World step
    this.world.step(deltaTime);
}
```

### Handle Collisions

```javascript
setupCollisionDetection() {
    this.carBody.addEventListener('collide', (event) => {
        const contact = event.contact;
        const impactVelocity = contact.getImpactVelocityAlongNormal();
        
        if (Math.abs(impactVelocity) > 5) {
            // Apply damage
            this.damageSystem.applyCollisionDamage(
                contact.bi.position,
                this.carBody.velocity,
                contact.ni
            );
            
            // Play collision sound
            if (this.audioSystem) {
                this.audioSystem.playCollisionSound(
                    contact.bi.position,
                    Math.abs(impactVelocity) / 20
                );
            }
        }
    });
}
```

---

## 🏁 Phase 3: Track Generation

### Generate Procedural Track

```javascript
initializeTrack() {
    const trackGenerator = new TrackGenerator(this.scene, this.world);
    
    // Generate track
    const trackData = trackGenerator.generate('circuit', 'medium');
    
    // Store track data
    this.trackData = trackData;
    this.checkpoints = trackData.checkpoints;
    this.startLine = trackData.startLine;
    
    console.log(`Track generated: ${trackData.segments.length} segments`);
}
```

### Position Cars on Track

```javascript
positionCarsOnTrack() {
    const startLine = this.trackData.startLine;
    const gridPositions = this.calculateGridPositions(startLine, 6); // 6 cars
    
    gridPositions.forEach((pos, index) => {
        const car = index === 0 ? this.playerCar : this.aiCars[index - 1];
        car.body.position.copy(pos.position);
        car.body.quaternion.copy(pos.rotation);
    });
}

calculateGridPositions(startLine, numCars) {
    const positions = [];
    const spacing = 8; // meters between cars
    const offset = 3; // meters to side for grid formation
    
    for (let i = 0; i < numCars; i++) {
        const row = Math.floor(i / 2);
        const column = i % 2;
        
        const position = startLine.position.clone();
        position.z -= row * spacing;
        position.x += (column === 0 ? -offset : offset);
        
        positions.push({
            position: new CANNON.Vec3(position.x, position.y + 1, position.z),
            rotation: new CANNON.Quaternion().setFromAxisAngle(
                new CANNON.Vec3(0, 1, 0),
                Math.atan2(startLine.direction.x, startLine.direction.z)
            )
        });
    }
    
    return positions;
}
```

---

## 🎮 Phase 4: Gameplay Systems

### Initialize Career Mode

```javascript
initializeGameplay() {
    // Career mode
    this.careerMode = new CareerMode();
    
    // Load player progress
    const summary = this.careerMode.getSummary();
    console.log('Career loaded:', summary);
    
    // Set up current race
    this.setupRace();
}

setupRace() {
    this.raceState = {
        isRacing: false,
        countdownTime: 3,
        currentLap: 0,
        totalLaps: 3,
        position: 1,
        checkpointsHit: 0,
        startTime: 0,
        lapTimes: [],
        fastestLap: null,
        collisions: 0
    };
}
```

### Handle Race Completion

```javascript
completeRace() {
    const result = {
        position: this.raceState.position,
        raceTime: Date.now() - this.raceState.startTime,
        fastestLap: this.raceState.fastestLap,
        collisions: this.raceState.collisions,
        championship: 'rookie_series'
    };
    
    // Award prizes and experience
    const rewards = this.careerMode.completeRace(result);
    
    // Show results UI
    this.showRaceResults(result, rewards);
}
```

---

## 🔊 Phase 5: Audio

### Initialize Audio System

```javascript
initializeAudio() {
    this.audioSystem = new AudioSystem(this.camera);
    
    // Create car sounds
    this.audioSystem.createEngineSound(this.playerCar.mesh);
    this.audioSystem.createTireScreechSound(this.playerCar.mesh);
    this.audioSystem.createWindSound(this.playerCar.mesh);
    
    // Background music (optional)
    // this.audioSystem.createBackgroundMusic('assets/audio/music/race-theme.mp3');
    // this.audioSystem.playMusic();
}
```

### Update Audio

```javascript
updateAudio(deltaTime) {
    const carData = {
        rpm: this.calculateRPM(),
        throttle: this.controls.throttle,
        speed: this.carBody.velocity.length() * 3.6,
        isSlipping: this.tireSet.tires.rearLeft.state.isSlipping,
        slipIntensity: Math.abs(this.tireSet.tires.rearLeft.state.slipAngle) / 15
    };
    
    this.audioSystem.update(deltaTime, carData);
}

calculateRPM() {
    const speed = this.carBody.velocity.length() * 3.6; // km/h
    const gear = this.getCurrentGear(speed);
    const gearRatios = [3.5, 2.5, 1.8, 1.4, 1.0, 0.8];
    const rpm = (speed / 10) * gearRatios[gear] * 100;
    return Math.min(rpm, 8000);
}
```

---

## 🔗 Complete Integration

### Full Game Loop

Here's a complete example of the integrated game loop:

```javascript
class AdvancedSpeedRivals {
    constructor() {
        this.init();
        this.animate();
    }
    
    init() {
        // Core THREE.js setup
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);
        
        // Physics
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0);
        
        // Initialize all systems
        this.initializeVisualSystems();
        this.initializePhysicsSystems();
        this.initializeTrack();
        this.initializeGameplay();
        this.initializeAudio();
        this.initializeControls();
        
        // Position cars
        this.positionCarsOnTrack();
        
        // Start countdown
        this.startRaceCountdown();
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const currentTime = performance.now();
        const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
        this.lastTime = currentTime;
        
        if (this.raceState.isRacing) {
            this.update(deltaTime);
        }
        
        this.render(deltaTime);
    }
    
    update(deltaTime) {
        // Update physics
        this.updatePhysics(deltaTime);
        
        // Update car visuals to match physics
        this.syncCarMeshWithBody();
        
        // Update audio
        this.updateAudio(deltaTime);
        
        // Update camera
        this.updateCamera(deltaTime);
        
        // Update AI
        this.updateAI(deltaTime);
        
        // Check race progress
        this.checkRaceProgress();
        
        // Update UI
        this.updateUI();
    }
    
    render(deltaTime) {
        // Update lighting
        this.lightingSystem.update(deltaTime);
        
        // Update post-processing
        this.postProcessing.update(deltaTime, this.getCurrentSpeed());
        
        // Render scene
        this.postProcessing.render();
    }
    
    syncCarMeshWithBody() {
        // Sync position
        this.playerCar.mesh.position.copy(this.carBody.position);
        this.playerCar.mesh.quaternion.copy(this.carBody.quaternion);
        
        // Update wheel rotation
        const detailedCar = new DetailedCar(this.materialSystem);
        const distance = this.totalDistance || 0;
        detailedCar.updateWheelRotation(this.playerCar.mesh, distance);
        
        // Update steering
        const steerAngle = this.controls.steering * 0.5;
        detailedCar.updateSteering(this.playerCar.mesh, steerAngle);
    }
}

// Start the game
window.addEventListener('DOMContentLoaded', () => {
    const game = new AdvancedSpeedRivals();
});
```

---

## 🧪 Testing & Optimization

### Performance Monitoring

Add this to track performance:

```javascript
initializePerformanceMonitoring() {
    this.stats = {
        fps: 0,
        frameTime: 0,
        physicsTime: 0,
        renderTime: 0
    };
    
    setInterval(() => {
        console.log(`FPS: ${this.stats.fps.toFixed(1)}`);
        console.log(`Frame: ${this.stats.frameTime.toFixed(2)}ms`);
        console.log(`Physics: ${this.stats.physicsTime.toFixed(2)}ms`);
        console.log(`Render: ${this.stats.renderTime.toFixed(2)}ms`);
    }, 5000);
}
```

### Quality Presets

Allow users to adjust quality:

```javascript
setGraphicsQuality(quality) {
    switch (quality) {
        case 'ultra':
            this.postProcessing.setQuality('ultra');
            this.lightingSystem.setShadowQuality('ultra');
            this.renderer.setPixelRatio(window.devicePixelRatio);
            break;
        case 'high':
            this.postProcessing.setQuality('high');
            this.lightingSystem.setShadowQuality('high');
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            break;
        case 'medium':
            this.postProcessing.setQuality('medium');
            this.lightingSystem.setShadowQuality('medium');
            this.renderer.setPixelRatio(1);
            break;
        case 'low':
            this.postProcessing.setQuality('low');
            this.lightingSystem.setShadowQuality('low');
            this.lightingSystem.setShadowsEnabled(false);
            this.renderer.setPixelRatio(1);
            break;
    }
}
```

---

## ✅ Checklist

Before going live, verify:

- [ ] All scripts loaded in correct order
- [ ] Dependencies installed (`npm install`)
- [ ] Visual systems initialized
- [ ] Physics systems working
- [ ] Track generating correctly
- [ ] Career mode saving/loading
- [ ] Audio playing (check browser autoplay policies)
- [ ] Controls responsive
- [ ] Performance acceptable (60 FPS target)
- [ ] Mobile compatibility (if needed)
- [ ] No console errors

---

## 🎉 You're Done!

Your game now has:
- ✅ AAA-quality graphics with PBR materials
- ✅ Realistic physics simulation
- ✅ Procedurally generated tracks
- ✅ Full career mode with progression
- ✅ Immersive audio system
- ✅ And much more!

Enjoy your 100x better racing game! 🏎️💨
