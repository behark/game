/**
 * MobileTouchControls.js
 * Advanced touch controls for mobile racing with haptic feedback
 */

class MobileTouchControls {
    constructor(container) {
        this.container = container;
        
        // Control state
        this.state = {
            enabled: false,
            steering: 0, // -1 to 1
            throttle: 0, // 0 to 1
            brake: 0, // 0 to 1
            nitro: false,
            handbrake: false
        };
        
        // Touch tracking
        this.touches = {
            steering: null,
            throttle: null,
            brake: null
        };
        
        // Control scheme
        this.scheme = 'tilt'; // 'tilt', 'virtual-wheel', 'split-screen'
        
        // Tilt controls
        this.tilt = {
            enabled: true,
            sensitivity: 2.0,
            deadzone: 0.1,
            calibration: { x: 0, y: 0, z: 0 }
        };
        
        // Virtual wheel
        this.wheel = {
            centerX: 0,
            centerY: 0,
            radius: 80,
            angle: 0,
            maxRotation: 180
        };
        
        // Haptic feedback
        this.haptics = {
            enabled: true,
            intensity: 1.0
        };
        
        // UI elements
        this.elements = {};
        
        this.initialize();
    }

    /**
     * Initialize controls
     */
    initialize() {
        this.detectMobile();
        
        if (this.isMobile) {
            this.createControlsUI();
            this.setupTiltControls();
            this.attachEventListeners();
            this.applyStyles();
            
            console.log('✅ Mobile Touch Controls initialized');
            console.log(`   Scheme: ${this.scheme}`);
        }
    }

    /**
     * Detect if device is mobile
     */
    detectMobile() {
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        this.hasGyroscope = window.DeviceOrientationEvent !== undefined;
    }

    /**
     * Create touch controls UI
     */
    createControlsUI() {
        const controlsHTML = `
            <div id="mobile-controls" class="mobile-controls hidden">
                <!-- Tilt Control Indicator -->
                <div id="tilt-indicator" class="tilt-indicator hidden">
                    <div class="tilt-horizon"></div>
                    <div class="tilt-car-icon">🏎️</div>
                    <div class="tilt-angle">0°</div>
                </div>
                
                <!-- Virtual Steering Wheel -->
                <div id="virtual-wheel" class="virtual-wheel hidden">
                    <div class="wheel-container">
                        <div class="wheel-outer"></div>
                        <div class="wheel-inner" id="wheel-inner"></div>
                        <div class="wheel-center"></div>
                    </div>
                    <div class="wheel-angle">0°</div>
                </div>
                
                <!-- Throttle/Brake Pedals (Split Screen Mode) -->
                <div id="pedal-controls" class="pedal-controls hidden">
                    <div class="pedal-container left-pedal">
                        <div class="pedal brake-pedal" id="brake-pedal">
                            <span class="pedal-icon">🛑</span>
                            <span class="pedal-label">BRAKE</span>
                            <div class="pedal-fill" id="brake-fill"></div>
                        </div>
                    </div>
                    
                    <div class="pedal-container right-pedal">
                        <div class="pedal throttle-pedal" id="throttle-pedal">
                            <span class="pedal-icon">⚡</span>
                            <span class="pedal-label">THROTTLE</span>
                            <div class="pedal-fill" id="throttle-fill"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Action Buttons -->
                <div class="action-buttons">
                    <button class="action-btn nitro-btn" id="nitro-btn">
                        <span class="btn-icon">🔥</span>
                        <span class="btn-label">NITRO</span>
                    </button>
                    
                    <button class="action-btn handbrake-btn" id="handbrake-btn">
                        <span class="btn-icon">🅿️</span>
                        <span class="btn-label">DRIFT</span>
                    </button>
                    
                    <button class="action-btn camera-btn" id="camera-btn">
                        <span class="btn-icon">📷</span>
                    </button>
                </div>
                
                <!-- HUD Overlay -->
                <div class="mobile-hud">
                    <div class="hud-top">
                        <div class="speed-display">
                            <div class="speed-value" id="speed-value">0</div>
                            <div class="speed-unit">KM/H</div>
                        </div>
                        
                        <div class="position-display">
                            <span class="position-value" id="position-value">1</span>
                            <span class="position-total">/8</span>
                        </div>
                        
                        <div class="lap-display">
                            <div class="lap-label">LAP</div>
                            <div class="lap-value" id="lap-value">1/3</div>
                        </div>
                    </div>
                    
                    <div class="hud-center">
                        <div class="gear-display" id="gear-display">N</div>
                    </div>
                    
                    <div class="hud-bottom">
                        <div class="lap-time" id="lap-time">00:00.000</div>
                    </div>
                </div>
                
                <!-- Control Scheme Switcher -->
                <div class="control-scheme-btn" id="scheme-btn">
                    <span class="scheme-icon">🎮</span>
                </div>
                
                <!-- Pause Button -->
                <button class="pause-btn" id="pause-btn">⏸️</button>
            </div>
        `;
        
        this.container.insertAdjacentHTML('beforeend', controlsHTML);
        
        // Store element references
        this.elements = {
            container: document.getElementById('mobile-controls'),
            tiltIndicator: document.getElementById('tilt-indicator'),
            virtualWheel: document.getElementById('virtual-wheel'),
            wheelInner: document.getElementById('wheel-inner'),
            pedalControls: document.getElementById('pedal-controls'),
            throttlePedal: document.getElementById('throttle-pedal'),
            brakePedal: document.getElementById('brake-pedal'),
            throttleFill: document.getElementById('throttle-fill'),
            brakeFill: document.getElementById('brake-fill'),
            nitroBtn: document.getElementById('nitro-btn'),
            handbrakeBtn: document.getElementById('handbrake-btn'),
            cameraBtn: document.getElementById('camera-btn'),
            speedValue: document.getElementById('speed-value'),
            positionValue: document.getElementById('position-value'),
            lapValue: document.getElementById('lap-value'),
            gearDisplay: document.getElementById('gear-display'),
            lapTime: document.getElementById('lap-time'),
            schemeBtn: document.getElementById('scheme-btn'),
            pauseBtn: document.getElementById('pause-btn')
        };
    }

    /**
     * Setup tilt/gyroscope controls
     */
    setupTiltControls() {
        if (!this.hasGyroscope) {
            console.warn('Gyroscope not available');
            this.scheme = 'virtual-wheel';
            return;
        }
        
        // Request permission on iOS
        if (this.isIOS && typeof DeviceOrientationEvent.requestPermission === 'function') {
            this.elements.container.addEventListener('click', () => {
                DeviceOrientationEvent.requestPermission()
                    .then(permissionState => {
                        if (permissionState === 'granted') {
                            this.enableTiltControls();
                        }
                    })
                    .catch(console.error);
            }, { once: true });
        } else {
            this.enableTiltControls();
        }
    }

    /**
     * Enable tilt controls
     */
    enableTiltControls() {
        window.addEventListener('deviceorientation', (event) => {
            if (!this.state.enabled || this.scheme !== 'tilt') return;
            
            // Get orientation
            const gamma = event.gamma; // Left-right tilt (-90 to 90)
            const beta = event.beta;   // Front-back tilt (-180 to 180)
            
            // Calculate steering from tilt
            let steering = (gamma / 45) * this.tilt.sensitivity;
            
            // Apply deadzone
            if (Math.abs(steering) < this.tilt.deadzone) {
                steering = 0;
            }
            
            // Clamp to -1 to 1
            this.state.steering = Math.max(-1, Math.min(1, steering));
            
            // Update indicator
            this.updateTiltIndicator(gamma);
        });
        
        console.log('✅ Tilt controls enabled');
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Throttle pedal
        this.elements.throttlePedal?.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.touches.throttle = e.touches[0].identifier;
            this.state.throttle = 1;
            this.updatePedalVisual('throttle', 1);
            this.hapticFeedback('light');
        });
        
        this.elements.throttlePedal?.addEventListener('touchend', () => {
            this.touches.throttle = null;
            this.state.throttle = 0;
            this.updatePedalVisual('throttle', 0);
        });
        
        // Brake pedal
        this.elements.brakePedal?.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.touches.brake = e.touches[0].identifier;
            this.state.brake = 1;
            this.updatePedalVisual('brake', 1);
            this.hapticFeedback('medium');
        });
        
        this.elements.brakePedal?.addEventListener('touchend', () => {
            this.touches.brake = null;
            this.state.brake = 0;
            this.updatePedalVisual('brake', 0);
        });
        
        // Virtual wheel
        this.elements.virtualWheel?.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.touches.steering = e.touches[0].identifier;
            this.updateVirtualWheel(e.touches[0]);
        });
        
        this.elements.virtualWheel?.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (this.touches.steering !== null) {
                this.updateVirtualWheel(e.touches[0]);
            }
        });
        
        this.elements.virtualWheel?.addEventListener('touchend', () => {
            this.touches.steering = null;
            this.state.steering = 0;
            this.resetVirtualWheel();
        });
        
        // Nitro button
        this.elements.nitroBtn?.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.state.nitro = true;
            this.elements.nitroBtn.classList.add('active');
            this.hapticFeedback('heavy');
        });
        
        this.elements.nitroBtn?.addEventListener('touchend', () => {
            this.state.nitro = false;
            this.elements.nitroBtn.classList.remove('active');
        });
        
        // Handbrake button
        this.elements.handbrakeBtn?.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.state.handbrake = true;
            this.elements.handbrakeBtn.classList.add('active');
            this.hapticFeedback('medium');
        });
        
        this.elements.handbrakeBtn?.addEventListener('touchend', () => {
            this.state.handbrake = false;
            this.elements.handbrakeBtn.classList.remove('active');
        });
        
        // Camera switch
        this.elements.cameraBtn?.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.switchCamera();
            this.hapticFeedback('light');
        });
        
        // Control scheme switcher
        this.elements.schemeBtn?.addEventListener('click', () => {
            this.cycleControlScheme();
        });
        
        // Pause button
        this.elements.pauseBtn?.addEventListener('click', () => {
            this.togglePause();
        });
        
        // Prevent default touch behavior
        document.addEventListener('touchmove', (e) => {
            if (this.state.enabled) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    /**
     * Update virtual wheel
     */
    updateVirtualWheel(touch) {
        const rect = this.elements.virtualWheel.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const deltaX = touch.clientX - centerX;
        const deltaY = touch.clientY - centerY;
        
        const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
        const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), this.wheel.radius);
        
        // Update steering based on angle
        this.state.steering = (angle / this.wheel.maxRotation) * 2;
        this.state.steering = Math.max(-1, Math.min(1, this.state.steering));
        
        // Update visual
        this.elements.wheelInner.style.transform = `rotate(${angle}deg)`;
        this.elements.virtualWheel.querySelector('.wheel-angle').textContent = Math.round(angle) + '°';
    }

    /**
     * Reset virtual wheel
     */
    resetVirtualWheel() {
        this.elements.wheelInner.style.transform = 'rotate(0deg)';
        this.elements.virtualWheel.querySelector('.wheel-angle').textContent = '0°';
    }

    /**
     * Update tilt indicator
     */
    updateTiltIndicator(angle) {
        const indicator = this.elements.tiltIndicator;
        if (!indicator) return;
        
        const carIcon = indicator.querySelector('.tilt-car-icon');
        const angleDisplay = indicator.querySelector('.tilt-angle');
        
        carIcon.style.transform = `rotate(${angle}deg)`;
        angleDisplay.textContent = Math.round(angle) + '°';
    }

    /**
     * Update pedal visual
     */
    updatePedalVisual(type, value) {
        const fill = type === 'throttle' ? this.elements.throttleFill : this.elements.brakeFill;
        if (fill) {
            fill.style.height = (value * 100) + '%';
        }
    }

    /**
     * Haptic feedback
     */
    hapticFeedback(intensity = 'medium') {
        if (!this.haptics.enabled || !navigator.vibrate) return;
        
        const patterns = {
            light: 10,
            medium: 20,
            heavy: 50
        };
        
        navigator.vibrate(patterns[intensity] * this.haptics.intensity);
    }

    /**
     * Cycle control scheme
     */
    cycleControlScheme() {
        const schemes = ['tilt', 'virtual-wheel', 'split-screen'];
        const currentIndex = schemes.indexOf(this.scheme);
        const nextIndex = (currentIndex + 1) % schemes.length;
        
        this.setControlScheme(schemes[nextIndex]);
    }

    /**
     * Set control scheme
     */
    setControlScheme(scheme) {
        this.scheme = scheme;
        
        // Hide all scheme-specific elements
        this.elements.tiltIndicator?.classList.add('hidden');
        this.elements.virtualWheel?.classList.add('hidden');
        this.elements.pedalControls?.classList.add('hidden');
        
        // Show relevant elements
        switch (scheme) {
            case 'tilt':
                this.elements.tiltIndicator?.classList.remove('hidden');
                this.elements.pedalControls?.classList.remove('hidden');
                break;
            case 'virtual-wheel':
                this.elements.virtualWheel?.classList.remove('hidden');
                this.elements.pedalControls?.classList.remove('hidden');
                break;
            case 'split-screen':
                this.elements.pedalControls?.classList.remove('hidden');
                break;
        }
        
        console.log(`Control scheme: ${scheme}`);
        this.hapticFeedback('light');
    }

    /**
     * Update HUD
     */
    updateHUD(gameState) {
        if (!this.state.enabled) return;
        
        // Speed
        if (this.elements.speedValue) {
            this.elements.speedValue.textContent = Math.round(gameState.speed || 0);
        }
        
        // Position
        if (this.elements.positionValue) {
            this.elements.positionValue.textContent = gameState.position || 1;
        }
        
        // Lap
        if (this.elements.lapValue) {
            this.elements.lapValue.textContent = `${gameState.currentLap || 1}/${gameState.totalLaps || 3}`;
        }
        
        // Gear
        if (this.elements.gearDisplay) {
            this.elements.gearDisplay.textContent = gameState.gear || 'N';
        }
        
        // Lap time
        if (this.elements.lapTime) {
            this.elements.lapTime.textContent = this.formatTime(gameState.lapTime || 0);
        }
    }

    /**
     * Format time
     */
    formatTime(ms) {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const milliseconds = Math.floor(ms % 1000);
        
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    }

    /**
     * Switch camera
     */
    switchCamera() {
        window.dispatchEvent(new CustomEvent('switch-camera'));
    }

    /**
     * Toggle pause
     */
    togglePause() {
        window.dispatchEvent(new CustomEvent('toggle-pause'));
    }

    /**
     * Enable controls
     */
    enable() {
        this.state.enabled = true;
        this.elements.container?.classList.remove('hidden');
        this.setControlScheme(this.scheme);
    }

    /**
     * Disable controls
     */
    disable() {
        this.state.enabled = false;
        this.elements.container?.classList.add('hidden');
    }

    /**
     * Get control state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Apply CSS styles
     */
    applyStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .mobile-controls {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 1000;
                pointer-events: none;
            }
            
            .mobile-controls.hidden {
                display: none;
            }
            
            .mobile-controls > * {
                pointer-events: auto;
            }
            
            /* Tilt Indicator */
            .tilt-indicator {
                position: absolute;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                width: 200px;
                height: 100px;
                background: rgba(0,0,0,0.5);
                border-radius: 15px;
                display: flex;
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(10px);
            }
            
            .tilt-car-icon {
                font-size: 48px;
                transition: transform 0.1s ease;
            }
            
            .tilt-angle {
                position: absolute;
                bottom: 10px;
                color: white;
                font-size: 14px;
                font-weight: bold;
            }
            
            /* Virtual Wheel */
            .virtual-wheel {
                position: absolute;
                bottom: 30px;
                left: 30px;
                width: 180px;
                height: 180px;
            }
            
            .wheel-container {
                position: relative;
                width: 100%;
                height: 100%;
            }
            
            .wheel-outer {
                position: absolute;
                width: 100%;
                height: 100%;
                border: 4px solid rgba(255,255,255,0.3);
                border-radius: 50%;
                background: rgba(0,0,0,0.3);
                backdrop-filter: blur(10px);
            }
            
            .wheel-inner {
                position: absolute;
                width: 80%;
                height: 80%;
                top: 10%;
                left: 10%;
                border: 3px solid rgba(255,107,107,0.8);
                border-radius: 50%;
                transition: transform 0.1s ease;
            }
            
            .wheel-center {
                position: absolute;
                width: 30%;
                height: 30%;
                top: 35%;
                left: 35%;
                background: radial-gradient(circle, #ff6b6b, #ff4444);
                border-radius: 50%;
            }
            
            .wheel-angle {
                position: absolute;
                bottom: -30px;
                left: 50%;
                transform: translateX(-50%);
                color: white;
                font-size: 14px;
                font-weight: bold;
                text-shadow: 0 2px 4px rgba(0,0,0,0.5);
            }
            
            /* Pedal Controls */
            .pedal-controls {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 250px;
                display: flex;
                gap: 20px;
                padding: 20px;
            }
            
            .pedal-container {
                flex: 1;
                display: flex;
                align-items: flex-end;
            }
            
            .pedal {
                position: relative;
                width: 100%;
                height: 200px;
                background: rgba(0,0,0,0.5);
                border: 3px solid rgba(255,255,255,0.3);
                border-radius: 20px;
                backdrop-filter: blur(10px);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                overflow: hidden;
            }
            
            .pedal-fill {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 0%;
                transition: height 0.1s ease;
                z-index: 0;
            }
            
            .brake-pedal .pedal-fill {
                background: linear-gradient(to top, #ff4444, #ff6b6b);
            }
            
            .throttle-pedal .pedal-fill {
                background: linear-gradient(to top, #44ff44, #6bff6b);
            }
            
            .pedal-icon {
                font-size: 48px;
                z-index: 1;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
            }
            
            .pedal-label {
                color: white;
                font-weight: bold;
                font-size: 14px;
                margin-top: 10px;
                z-index: 1;
                text-shadow: 0 2px 4px rgba(0,0,0,0.5);
            }
            
            /* Action Buttons */
            .action-buttons {
                position: absolute;
                bottom: 260px;
                right: 20px;
                display: flex;
                flex-direction: column;
                gap: 15px;
            }
            
            .action-btn {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                border: 3px solid rgba(255,255,255,0.3);
                background: rgba(0,0,0,0.5);
                backdrop-filter: blur(10px);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: white;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .action-btn.active {
                background: linear-gradient(135deg, #ff6b6b, #4ecdc4);
                border-color: #fff;
                transform: scale(1.1);
            }
            
            .action-btn .btn-icon {
                font-size: 32px;
            }
            
            .action-btn .btn-label {
                font-size: 10px;
                font-weight: bold;
                margin-top: 5px;
            }
            
            /* Mobile HUD */
            .mobile-hud {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                pointer-events: none;
            }
            
            .hud-top {
                position: absolute;
                top: 20px;
                left: 20px;
                right: 20px;
                display: flex;
                justify-content: space-between;
            }
            
            .speed-display {
                background: rgba(0,0,0,0.5);
                padding: 15px 20px;
                border-radius: 15px;
                backdrop-filter: blur(10px);
                text-align: center;
            }
            
            .speed-value {
                font-size: 48px;
                font-weight: bold;
                color: #4ecdc4;
                line-height: 1;
                text-shadow: 0 0 20px rgba(78,205,196,0.5);
            }
            
            .speed-unit {
                font-size: 12px;
                color: rgba(255,255,255,0.7);
                margin-top: 5px;
            }
            
            .position-display {
                background: rgba(0,0,0,0.5);
                padding: 15px 20px;
                border-radius: 15px;
                backdrop-filter: blur(10px);
                font-size: 36px;
                font-weight: bold;
                color: #ff6b6b;
                text-shadow: 0 0 20px rgba(255,107,107,0.5);
            }
            
            .position-total {
                font-size: 18px;
                color: rgba(255,255,255,0.7);
            }
            
            .lap-display {
                background: rgba(0,0,0,0.5);
                padding: 10px 20px;
                border-radius: 15px;
                backdrop-filter: blur(10px);
                text-align: center;
            }
            
            .lap-label {
                font-size: 12px;
                color: rgba(255,255,255,0.7);
            }
            
            .lap-value {
                font-size: 24px;
                font-weight: bold;
                color: white;
            }
            
            .hud-center {
                position: absolute;
                right: 20px;
                top: 50%;
                transform: translateY(-50%);
            }
            
            .gear-display {
                background: rgba(0,0,0,0.7);
                width: 80px;
                height: 80px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 48px;
                font-weight: bold;
                color: #f7b731;
                border: 4px solid rgba(247,183,49,0.5);
                text-shadow: 0 0 20px rgba(247,183,49,0.8);
                backdrop-filter: blur(10px);
            }
            
            .hud-bottom {
                position: absolute;
                bottom: 280px;
                left: 50%;
                transform: translateX(-50%);
            }
            
            .lap-time {
                background: rgba(0,0,0,0.7);
                padding: 15px 30px;
                border-radius: 20px;
                font-size: 32px;
                font-weight: bold;
                color: white;
                font-family: 'Courier New', monospace;
                backdrop-filter: blur(10px);
                border: 2px solid rgba(255,255,255,0.2);
            }
            
            /* Control Scheme Button */
            .control-scheme-btn {
                position: absolute;
                top: 20px;
                right: 20px;
                width: 60px;
                height: 60px;
                background: rgba(0,0,0,0.5);
                border: 2px solid rgba(255,255,255,0.3);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                backdrop-filter: blur(10px);
            }
            
            .scheme-icon {
                font-size: 32px;
            }
            
            /* Pause Button */
            .pause-btn {
                position: absolute;
                top: 90px;
                right: 20px;
                width: 60px;
                height: 60px;
                background: rgba(0,0,0,0.5);
                border: 2px solid rgba(255,255,255,0.3);
                border-radius: 50%;
                color: white;
                font-size: 24px;
                cursor: pointer;
                backdrop-filter: blur(10px);
            }
            
            .hidden {
                display: none !important;
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Auto-create instance on mobile
let mobileTouchControls;
if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    document.addEventListener('DOMContentLoaded', () => {
        mobileTouchControls = new MobileTouchControls(document.body);
    });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileTouchControls;
}
