/**
 * ReplaySystem.js
 * Record and playback race replays with cinematic camera controls
 */

class ReplaySystem {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        
        // Recording state
        this.recording = {
            isRecording: false,
            frames: [],
            maxFrames: 3600, // 60 seconds at 60fps
            currentFrame: 0
        };
        
        // Playback state
        this.playback = {
            isPlaying: false,
            currentFrame: 0,
            speed: 1.0,
            paused: false,
            loop: false
        };
        
        // Camera modes for replay
        this.cameraMode = {
            current: 'follow', // follow, orbit, cinematic, free
            smoothing: 0.1
        };
        
        // Cinematic cameras
        this.cinematicCameras = [];
        
        console.log('✅ Replay System initialized');
    }

    /**
     * Start recording
     */
    startRecording() {
        this.recording.isRecording = true;
        this.recording.frames = [];
        this.recording.currentFrame = 0;
        console.log('🔴 Recording started');
    }

    /**
     * Stop recording
     */
    stopRecording() {
        this.recording.isRecording = false;
        console.log(`⏹️ Recording stopped: ${this.recording.frames.length} frames`);
        return this.recording.frames.length;
    }

    /**
     * Record frame data
     */
    recordFrame(gameState) {
        if (!this.recording.isRecording) return;
        
        // Limit frame count
        if (this.recording.frames.length >= this.recording.maxFrames) {
            this.recording.frames.shift(); // Remove oldest
        }
        
        // Capture current state
        const frame = {
            timestamp: Date.now(),
            cars: gameState.cars.map(car => ({
                position: car.body.position.clone(),
                quaternion: car.body.quaternion.clone(),
                velocity: car.body.velocity.clone(),
                wheelRotation: car.wheelRotation || 0
            })),
            camera: {
                position: this.camera.position.clone(),
                rotation: this.camera.rotation.clone()
            },
            gameData: {
                lapTime: gameState.lapTime,
                speed: gameState.speed,
                position: gameState.position
            }
        };
        
        this.recording.frames.push(frame);
        this.recording.currentFrame = this.recording.frames.length - 1;
    }

    /**
     * Start playback
     */
    startPlayback(loop = false) {
        if (this.recording.frames.length === 0) {
            console.warn('No replay data available');
            return false;
        }
        
        this.playback.isPlaying = true;
        this.playback.currentFrame = 0;
        this.playback.paused = false;
        this.playback.loop = loop;
        
        console.log(`▶️ Playback started (${this.recording.frames.length} frames)`);
        return true;
    }

    /**
     * Stop playback
     */
    stopPlayback() {
        this.playback.isPlaying = false;
        this.playback.currentFrame = 0;
        console.log('⏹️ Playback stopped');
    }

    /**
     * Toggle pause
     */
    togglePause() {
        this.playback.paused = !this.playback.paused;
        return this.playback.paused;
    }

    /**
     * Update playback
     */
    update(deltaTime, cars) {
        if (!this.playback.isPlaying || this.playback.paused) return;
        
        // Advance frame
        this.playback.currentFrame += this.playback.speed;
        
        // Check end
        if (this.playback.currentFrame >= this.recording.frames.length) {
            if (this.playback.loop) {
                this.playback.currentFrame = 0;
            } else {
                this.stopPlayback();
                return;
            }
        }
        
        // Get frame data
        const frameIndex = Math.floor(this.playback.currentFrame);
        const frame = this.recording.frames[frameIndex];
        
        if (!frame) return;
        
        // Apply frame data to cars
        cars.forEach((car, index) => {
            if (frame.cars[index]) {
                car.body.position.copy(frame.cars[index].position);
                car.body.quaternion.copy(frame.cars[index].quaternion);
                car.body.velocity.copy(frame.cars[index].velocity);
            }
        });
        
        // Update camera based on mode
        this.updateCamera(frame, cars);
    }

    /**
     * Update camera during playback
     */
    updateCamera(frame, cars) {
        const playerCar = cars[0];
        if (!playerCar) return;
        
        switch (this.cameraMode.current) {
            case 'follow':
                this.followCamera(playerCar);
                break;
            case 'orbit':
                this.orbitCamera(playerCar);
                break;
            case 'cinematic':
                this.cinematicCamera(frame);
                break;
            case 'free':
                // User controlled
                break;
        }
    }

    /**
     * Follow camera (behind car)
     */
    followCamera(car) {
        const carPos = car.body.position;
        const carQuat = car.body.quaternion;
        
        // Behind and above car
        const offset = new CANNON.Vec3(0, 5, -15);
        carQuat.vmult(offset, offset);
        
        const targetPos = new THREE.Vector3(
            carPos.x + offset.x,
            carPos.y + offset.y,
            carPos.z + offset.z
        );
        
        // Smooth camera movement
        this.camera.position.lerp(targetPos, this.cameraMode.smoothing);
        
        // Look at car
        this.camera.lookAt(carPos.x, carPos.y + 2, carPos.z);
    }

    /**
     * Orbit camera (rotating around car)
     */
    orbitCamera(car) {
        const carPos = car.body.position;
        const time = this.playback.currentFrame * 0.01;
        const radius = 20;
        
        const targetPos = new THREE.Vector3(
            carPos.x + Math.cos(time) * radius,
            carPos.y + 10,
            carPos.z + Math.sin(time) * radius
        );
        
        this.camera.position.lerp(targetPos, this.cameraMode.smoothing);
        this.camera.lookAt(carPos.x, carPos.y, carPos.z);
    }

    /**
     * Cinematic camera (predefined dramatic shots)
     */
    cinematicCamera(frame) {
        // Use recorded camera if available
        if (frame.camera) {
            this.camera.position.lerp(frame.camera.position, this.cameraMode.smoothing);
            this.camera.rotation.copy(frame.camera.rotation);
        }
    }

    /**
     * Set camera mode
     */
    setCameraMode(mode) {
        if (['follow', 'orbit', 'cinematic', 'free'].includes(mode)) {
            this.cameraMode.current = mode;
            console.log(`Camera mode: ${mode}`);
        }
    }

    /**
     * Set playback speed
     */
    setSpeed(speed) {
        this.playback.speed = Math.max(0.1, Math.min(3.0, speed));
    }

    /**
     * Jump to frame
     */
    jumpToFrame(frameNumber) {
        if (frameNumber >= 0 && frameNumber < this.recording.frames.length) {
            this.playback.currentFrame = frameNumber;
        }
    }

    /**
     * Jump to time (seconds)
     */
    jumpToTime(seconds) {
        const frame = Math.floor(seconds * 60); // Assuming 60fps
        this.jumpToFrame(frame);
    }

    /**
     * Export replay data
     */
    exportReplay() {
        const data = {
            version: '1.0',
            frames: this.recording.frames,
            metadata: {
                duration: this.recording.frames.length / 60,
                date: new Date().toISOString()
            }
        };
        
        const json = JSON.stringify(data);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `replay_${Date.now()}.json`;
        a.click();
        
        console.log('✅ Replay exported');
    }

    /**
     * Import replay data
     */
    importReplay(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.recording.frames = data.frames;
                console.log('✅ Replay imported');
            } catch (error) {
                console.error('Failed to import replay:', error);
            }
        };
        reader.readAsText(file);
    }

    /**
     * Get playback info
     */
    getPlaybackInfo() {
        return {
            isPlaying: this.playback.isPlaying,
            isPaused: this.playback.paused,
            currentFrame: Math.floor(this.playback.currentFrame),
            totalFrames: this.recording.frames.length,
            currentTime: (this.playback.currentFrame / 60).toFixed(2),
            totalTime: (this.recording.frames.length / 60).toFixed(2),
            speed: this.playback.speed.toFixed(1),
            cameraMode: this.cameraMode.current
        };
    }
}

/**
 * PhotoMode
 * Advanced screenshot system with filters and camera controls
 */
class PhotoMode {
    constructor(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        
        // Photo mode state
        this.state = {
            active: false,
            frozenTime: false,
            originalCameraPos: null,
            originalCameraRot: null
        };
        
        // Camera controls for photo mode
        this.controls = {
            moveSpeed: 0.5,
            rotateSpeed: 0.002,
            zoomSpeed: 0.1
        };
        
        // Photo filters
        this.filters = {
            current: 'none',
            available: ['none', 'vintage', 'blackwhite', 'sepia', 'dramatic', 'vibrant']
        };
        
        // Photo settings
        this.settings = {
            fov: 75,
            exposure: 1.0,
            saturation: 1.0,
            contrast: 1.0,
            blur: 0
        };
        
        console.log('✅ Photo Mode initialized');
    }

    /**
     * Enter photo mode
     */
    enter() {
        this.state.active = true;
        this.state.frozenTime = true;
        
        // Store original camera
        this.state.originalCameraPos = this.camera.position.clone();
        this.state.originalCameraRot = this.camera.rotation.clone();
        
        console.log('📸 Photo Mode activated');
        this.showUI();
    }

    /**
     * Exit photo mode
     */
    exit() {
        this.state.active = false;
        this.state.frozenTime = false;
        
        // Restore camera
        if (this.state.originalCameraPos) {
            this.camera.position.copy(this.state.originalCameraPos);
            this.camera.rotation.copy(this.state.originalCameraRot);
        }
        
        console.log('Photo Mode deactivated');
        this.hideUI();
    }

    /**
     * Take screenshot
     */
    takeScreenshot(filename = null) {
        // Apply filter if needed
        this.applyFilter();
        
        // Render
        this.renderer.render(this.scene, this.camera);
        
        // Capture
        this.renderer.domElement.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || `speedrivals_${Date.now()}.png`;
            a.click();
            
            console.log('📸 Screenshot saved');
        });
    }

    /**
     * Apply photo filter
     */
    applyFilter() {
        const filter = this.filters.current;
        
        // Simplified filter application (would use post-processing in real implementation)
        switch (filter) {
            case 'blackwhite':
                this.settings.saturation = 0;
                break;
            case 'sepia':
                // Sepia tone
                break;
            case 'vintage':
                this.settings.exposure = 0.8;
                this.settings.saturation = 0.7;
                break;
            case 'dramatic':
                this.settings.contrast = 1.5;
                this.settings.exposure = 0.7;
                break;
            case 'vibrant':
                this.settings.saturation = 1.5;
                break;
        }
    }

    /**
     * Move camera in photo mode
     */
    moveCamera(direction, distance) {
        if (!this.state.active) return;
        
        const vec = new THREE.Vector3();
        
        switch (direction) {
            case 'forward':
                this.camera.getWorldDirection(vec);
                break;
            case 'backward':
                this.camera.getWorldDirection(vec);
                vec.negate();
                break;
            case 'left':
                vec.set(-1, 0, 0);
                vec.applyQuaternion(this.camera.quaternion);
                break;
            case 'right':
                vec.set(1, 0, 0);
                vec.applyQuaternion(this.camera.quaternion);
                break;
            case 'up':
                vec.set(0, 1, 0);
                break;
            case 'down':
                vec.set(0, -1, 0);
                break;
        }
        
        vec.multiplyScalar(distance * this.controls.moveSpeed);
        this.camera.position.add(vec);
    }

    /**
     * Show photo mode UI
     */
    showUI() {
        // Implementation would show overlay with controls
        console.log('Photo Mode UI shown');
    }

    /**
     * Hide photo mode UI
     */
    hideUI() {
        console.log('Photo Mode UI hidden');
    }

    /**
     * Get photo mode status
     */
    getStatus() {
        return {
            active: this.state.active,
            filter: this.filters.current,
            settings: { ...this.settings }
        };
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ReplaySystem, PhotoMode };
}
