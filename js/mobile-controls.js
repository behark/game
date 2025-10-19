class MobileControls {
    constructor() {
        this.isTouch = 'ontouchstart' in window;
        this.orientation = { alpha: 0, beta: 0, gamma: 0 };
        this.calibration = { alpha: 0, beta: 0, gamma: 0 };

        // Control states
        this.steering = 0; // -1 to 1
        this.acceleration = 0; // 0 to 1
        this.braking = 0; // 0 to 1
        this.isHandbraking = false;

        // Settings
        this.settings = {
            steeringSensitivity: 50,
            steeringDeadZone: 10,
            tiltSteering: false,
            hapticFeedback: true,
            buttonSize: 100,
            buttonOpacity: 80,
            gestureControls: true
        };

        // Touch tracking
        this.touches = new Map();
        this.lastGesture = null;
        this.gestureStartTime = 0;

        this.init();
    }

    init() {
        this.loadSettings();
        this.setupTouchControls();
        this.setupTiltControls();
        this.setupGestureControls();
        this.setupSettingsPanel();
        this.setupHaptics();
        this.applySettings();

        console.log('📱 Mobile controls initialized');
    }

    setupTouchControls() {
        // Steering wheel
        const steeringWheel = document.getElementById('steeringWheel');
        const steeringKnob = document.getElementById('steeringKnob');

        this.setupTouchHandler(steeringWheel, {
            onStart: (touch) => this.startSteering(touch),
            onMove: (touch) => this.updateSteering(touch),
            onEnd: () => this.endSteering()
        });

        // Accelerator pedal
        const acceleratorPedal = document.getElementById('acceleratorPedal');
        this.setupTouchHandler(acceleratorPedal, {
            onStart: () => this.startAcceleration(),
            onEnd: () => this.endAcceleration()
        });

        // Brake pedal
        const brakePedal = document.getElementById('brakePedal');
        this.setupTouchHandler(brakePedal, {
            onStart: () => this.startBraking(),
            onEnd: () => this.endBraking()
        });

        // Pressure-sensitive controls for supported devices
        if ('force' in Touch.prototype) {
            this.setupPressureControls();
        }
    }

    setupTouchHandler(element, handlers) {
        const startEvent = this.isTouch ? 'touchstart' : 'mousedown';
        const moveEvent = this.isTouch ? 'touchmove' : 'mousemove';
        const endEvent = this.isTouch ? 'touchend' : 'mouseup';

        element.addEventListener(startEvent, (e) => {
            e.preventDefault();
            const touch = this.isTouch ? e.touches[0] : e;
            this.touches.set(element, touch);

            if (handlers.onStart) handlers.onStart(touch);
            this.triggerHaptic('light');
        });

        element.addEventListener(moveEvent, (e) => {
            e.preventDefault();
            if (!this.touches.has(element)) return;

            const touch = this.isTouch ? e.touches[0] : e;
            if (handlers.onMove) handlers.onMove(touch);
        });

        element.addEventListener(endEvent, (e) => {
            e.preventDefault();
            this.touches.delete(element);

            if (handlers.onEnd) handlers.onEnd();
            this.triggerHaptic('light');
        });

        // Prevent context menu on long press
        element.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    startSteering(touch) {
        const wheel = document.getElementById('steeringWheel');
        const rect = wheel.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        this.steeringCenter = { x: centerX, y: centerY };
        this.steeringRadius = rect.width / 2;
        this.isSteeringActive = true;
    }

    updateSteering(touch) {
        if (!this.isSteeringActive || !this.steeringCenter) return;

        const deltaX = touch.clientX - this.steeringCenter.x;
        const deltaY = touch.clientY - this.steeringCenter.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // Calculate steering angle
        let angle = Math.atan2(deltaX, -deltaY);

        // Limit to steering radius
        if (distance > this.steeringRadius) {
            const limitedX = this.steeringCenter.x + (deltaX / distance) * this.steeringRadius;
            const limitedY = this.steeringCenter.y + (deltaY / distance) * this.steeringRadius;
            angle = Math.atan2(limitedX - this.steeringCenter.x, -(limitedY - this.steeringCenter.y));
        }

        // Convert to steering value (-1 to 1)
        const maxAngle = Math.PI / 3; // 60 degrees max
        this.steering = Math.max(-1, Math.min(1, angle / maxAngle));

        // Apply dead zone
        const deadZone = this.settings.steeringDeadZone / 100;
        if (Math.abs(this.steering) < deadZone) {
            this.steering = 0;
        } else {
            // Scale beyond dead zone
            const sign = Math.sign(this.steering);
            const scaledValue = (Math.abs(this.steering) - deadZone) / (1 - deadZone);
            this.steering = sign * scaledValue;
        }

        // Apply sensitivity
        const sensitivity = this.settings.steeringSensitivity / 50;
        this.steering *= sensitivity;

        // Update visual feedback
        this.updateSteeringVisual();
    }

    endSteering() {
        this.isSteeringActive = false;
        this.steering = 0;
        this.updateSteeringVisual();
    }

    updateSteeringVisual() {
        const wheel = document.getElementById('steeringWheel');
        const knob = document.getElementById('steeringKnob');

        const rotation = this.steering * 60; // Max 60 degrees
        wheel.style.transform = `rotate(${rotation}deg)`;

        // Change knob color based on steering intensity
        const intensity = Math.abs(this.steering);
        if (intensity > 0.7) {
            knob.style.background = 'linear-gradient(45deg, #e74c3c, #c0392b)';
        } else if (intensity > 0.3) {
            knob.style.background = 'linear-gradient(45deg, #f39c12, #e67e22)';
        } else {
            knob.style.background = 'linear-gradient(45deg, #ff6b6b, #ee5a24)';
        }
    }

    startAcceleration() {
        this.acceleration = 1;
        document.getElementById('acceleratorPedal').classList.add('active');
        this.triggerHaptic('medium');
    }

    endAcceleration() {
        this.acceleration = 0;
        document.getElementById('acceleratorPedal').classList.remove('active');
    }

    startBraking() {
        this.braking = 1;
        document.getElementById('brakePedal').classList.add('active');
        this.triggerHaptic('heavy');
    }

    endBraking() {
        this.braking = 0;
        document.getElementById('brakePedal').classList.remove('active');
    }

    setupTiltControls() {
        if (!window.DeviceOrientationEvent) return;

        // Request permission for iOS 13+
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission()
                .then(permissionState => {
                    if (permissionState === 'granted') {
                        this.enableTiltControls();
                    }
                })
                .catch(console.error);
        } else {
            this.enableTiltControls();
        }
    }

    enableTiltControls() {
        window.addEventListener('deviceorientation', (event) => {
            if (!this.settings.tiltSteering) return;

            this.orientation = {
                alpha: event.alpha || 0,
                beta: event.beta || 0,
                gamma: event.gamma || 0
            };

            // Use gamma (left-right tilt) for steering
            let tiltSteering = (this.orientation.gamma - this.calibration.gamma) / 45;
            tiltSteering = Math.max(-1, Math.min(1, tiltSteering));

            // Apply dead zone and sensitivity
            const deadZone = this.settings.steeringDeadZone / 100;
            if (Math.abs(tiltSteering) < deadZone) {
                tiltSteering = 0;
            } else {
                const sign = Math.sign(tiltSteering);
                const scaledValue = (Math.abs(tiltSteering) - deadZone) / (1 - deadZone);
                tiltSteering = sign * scaledValue;
            }

            const sensitivity = this.settings.steeringSensitivity / 50;
            this.steering = tiltSteering * sensitivity;

            this.updateSteeringVisual();
        });

        console.log('📱 Tilt controls enabled');
    }

    calibrateTilt() {
        this.calibration = { ...this.orientation };
        this.triggerHaptic('heavy');

        // Show calibration feedback
        this.showNotification('Tilt controls calibrated!', 2000);
    }

    setupGestureControls() {
        const powerupZone = document.getElementById('powerupZone');
        let gestureStart = null;
        let gestureHistory = [];

        const canvas = document.getElementById('gameCanvas');

        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                // Two finger gesture for power-ups
                gestureStart = {
                    x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                    y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
                    time: Date.now()
                };
                gestureHistory = [gestureStart];
                powerupZone.classList.add('active');
            }
        });

        canvas.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && gestureStart) {
                const current = {
                    x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                    y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
                    time: Date.now()
                };
                gestureHistory.push(current);
            }
        });

        canvas.addEventListener('touchend', (e) => {
            if (gestureStart && gestureHistory.length > 3) {
                const gesture = this.recognizeGesture(gestureHistory);
                if (gesture) {
                    this.triggerPowerup(gesture);
                }
            }

            gestureStart = null;
            gestureHistory = [];
            powerupZone.classList.remove('active');
        });
    }

    recognizeGesture(history) {
        if (history.length < 3) return null;

        const start = history[0];
        const end = history[history.length - 1];
        const deltaX = end.x - start.x;
        const deltaY = end.y - start.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const duration = end.time - start.time;

        // Swipe gestures
        if (distance > 100 && duration < 1000) {
            const angle = Math.atan2(deltaY, deltaX);

            if (Math.abs(angle) < Math.PI / 4) return 'swipe-right';
            if (Math.abs(angle - Math.PI) < Math.PI / 4) return 'swipe-left';
            if (angle > Math.PI / 4 && angle < 3 * Math.PI / 4) return 'swipe-down';
            if (angle < -Math.PI / 4 && angle > -3 * Math.PI / 4) return 'swipe-up';
        }

        // Circle gesture
        if (this.isCircularGesture(history)) {
            return 'circle';
        }

        return null;
    }

    isCircularGesture(history) {
        // Simple circle detection - check if path curves back on itself
        if (history.length < 8) return false;

        const center = this.getGestureCenter(history);
        let angleSum = 0;

        for (let i = 1; i < history.length; i++) {
            const prev = history[i - 1];
            const curr = history[i];

            const angle1 = Math.atan2(prev.y - center.y, prev.x - center.x);
            const angle2 = Math.atan2(curr.y - center.y, curr.x - center.x);

            let angleDiff = angle2 - angle1;
            if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

            angleSum += angleDiff;
        }

        return Math.abs(angleSum) > Math.PI * 1.5; // More than 270 degrees
    }

    getGestureCenter(history) {
        const sumX = history.reduce((sum, point) => sum + point.x, 0);
        const sumY = history.reduce((sum, point) => sum + point.y, 0);
        return { x: sumX / history.length, y: sumY / history.length };
    }

    triggerPowerup(gesture) {
        console.log(`🎯 Gesture detected: ${gesture}`);
        this.triggerHaptic('heavy');

        // Dispatch custom event for game to handle
        window.dispatchEvent(new CustomEvent('powerupGesture', {
            detail: { type: gesture }
        }));

        this.showGestureEffect(gesture);
    }

    showGestureEffect(gesture) {
        const indicator = document.getElementById('hapticIndicator');
        indicator.style.display = 'block';
        indicator.style.animation = 'none';

        setTimeout(() => {
            indicator.style.animation = 'haptic-pulse 0.3s ease';
            setTimeout(() => {
                indicator.style.display = 'none';
            }, 300);
        }, 10);
    }

    setupHaptics() {
        // Check for haptic support
        this.hasHaptics = 'vibrate' in navigator ||
                         ('hapticActuators' in navigator && navigator.hapticActuators.length > 0);

        console.log(`📳 Haptic feedback: ${this.hasHaptics ? 'Available' : 'Not available'}`);
    }

    triggerHaptic(intensity = 'light') {
        if (!this.settings.hapticFeedback || !this.hasHaptics) return;

        if ('vibrate' in navigator) {
            const patterns = {
                light: [10],
                medium: [20],
                heavy: [50],
                double: [20, 20, 20],
                collision: [100, 50, 100]
            };

            navigator.vibrate(patterns[intensity] || patterns.light);
        }

        // Show visual feedback
        this.showHapticIndicator();
    }

    showHapticIndicator() {
        const indicator = document.getElementById('hapticIndicator');
        indicator.style.display = 'block';
        indicator.style.animation = 'haptic-pulse 0.3s ease';

        setTimeout(() => {
            indicator.style.display = 'none';
        }, 300);
    }

    setupSettingsPanel() {
        const settingsButton = document.getElementById('settingsButton');
        const settingsPanel = document.getElementById('settingsPanel');

        settingsButton.addEventListener('click', () => {
            settingsPanel.classList.toggle('open');
        });

        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            if (!settingsPanel.contains(e.target) &&
                !settingsButton.contains(e.target) &&
                settingsPanel.classList.contains('open')) {
                settingsPanel.classList.remove('open');
            }
        });

        this.setupSettingsControls();
    }

    setupSettingsControls() {
        // Steering sensitivity
        const steeringSensitivity = document.getElementById('steeringSensitivity');
        const steeringSensitivityValue = document.getElementById('steeringSensitivityValue');

        steeringSensitivity.addEventListener('input', (e) => {
            this.settings.steeringSensitivity = parseInt(e.target.value);
            steeringSensitivityValue.textContent = e.target.value;
            this.saveSettings();
        });

        // Steering dead zone
        const steeringDeadZone = document.getElementById('steeringDeadZone');
        const steeringDeadZoneValue = document.getElementById('steeringDeadZoneValue');

        steeringDeadZone.addEventListener('input', (e) => {
            this.settings.steeringDeadZone = parseInt(e.target.value);
            steeringDeadZoneValue.textContent = e.target.value + '%';
            this.saveSettings();
        });

        // Tilt steering toggle
        const tiltSteeringToggle = document.getElementById('tiltSteeringToggle');
        tiltSteeringToggle.addEventListener('click', () => {
            this.settings.tiltSteering = !this.settings.tiltSteering;
            tiltSteeringToggle.classList.toggle('active', this.settings.tiltSteering);
            this.saveSettings();

            if (this.settings.tiltSteering) {
                this.calibrateTilt();
            }
        });

        // Button size
        const buttonSize = document.getElementById('buttonSize');
        const buttonSizeValue = document.getElementById('buttonSizeValue');

        buttonSize.addEventListener('input', (e) => {
            this.settings.buttonSize = parseInt(e.target.value);
            buttonSizeValue.textContent = e.target.value + '%';
            this.applyButtonSizing();
            this.saveSettings();
        });

        // Button opacity
        const buttonOpacity = document.getElementById('buttonOpacity');
        const buttonOpacityValue = document.getElementById('buttonOpacityValue');

        buttonOpacity.addEventListener('input', (e) => {
            this.settings.buttonOpacity = parseInt(e.target.value);
            buttonOpacityValue.textContent = e.target.value + '%';
            this.applyButtonOpacity();
            this.saveSettings();
        });

        // Haptic feedback toggle
        const hapticToggle = document.getElementById('hapticToggle');
        hapticToggle.addEventListener('click', () => {
            this.settings.hapticFeedback = !this.settings.hapticFeedback;
            hapticToggle.classList.toggle('active', this.settings.hapticFeedback);
            this.saveSettings();

            if (this.settings.hapticFeedback) {
                this.triggerHaptic('medium');
            }
        });

        // Add other setting controls...
        this.setupAdditionalSettings();
    }

    setupAdditionalSettings() {
        // Graphics quality, auto quality, battery saver, etc.
        // These will be handled by the performance manager
    }

    applySettings() {
        this.applyButtonSizing();
        this.applyButtonOpacity();
        this.updateSettingsUI();
    }

    applyButtonSizing() {
        const scale = this.settings.buttonSize / 100;

        document.getElementById('steeringWheel').style.transform = `scale(${scale})`;
        document.querySelectorAll('.pedal').forEach(pedal => {
            pedal.style.transform = `scale(${scale})`;
        });
    }

    applyButtonOpacity() {
        const opacity = this.settings.buttonOpacity / 100;

        document.getElementById('steeringWheel').style.opacity = opacity;
        document.querySelectorAll('.pedal').forEach(pedal => {
            pedal.style.opacity = opacity;
        });
    }

    updateSettingsUI() {
        // Update slider values
        document.getElementById('steeringSensitivity').value = this.settings.steeringSensitivity;
        document.getElementById('steeringSensitivityValue').textContent = this.settings.steeringSensitivity;

        document.getElementById('steeringDeadZone').value = this.settings.steeringDeadZone;
        document.getElementById('steeringDeadZoneValue').textContent = this.settings.steeringDeadZone + '%';

        document.getElementById('buttonSize').value = this.settings.buttonSize;
        document.getElementById('buttonSizeValue').textContent = this.settings.buttonSize + '%';

        document.getElementById('buttonOpacity').value = this.settings.buttonOpacity;
        document.getElementById('buttonOpacityValue').textContent = this.settings.buttonOpacity + '%';

        // Update toggles
        document.getElementById('tiltSteeringToggle').classList.toggle('active', this.settings.tiltSteering);
        document.getElementById('hapticToggle').classList.toggle('active', this.settings.hapticFeedback);
    }

    showNotification(message, duration = 3000) {
        // Create notification overlay
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 20px 30px;
            border-radius: 15px;
            font-size: 16px;
            z-index: 5000;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, duration);
    }

    resetSettings() {
        this.settings = {
            steeringSensitivity: 50,
            steeringDeadZone: 10,
            tiltSteering: false,
            hapticFeedback: true,
            buttonSize: 100,
            buttonOpacity: 80,
            gestureControls: true
        };

        this.saveSettings();
        this.applySettings();
        this.showNotification('Settings reset to defaults', 2000);
        this.triggerHaptic('medium');
    }

    saveSettings() {
        localStorage.setItem('speedRivalsMobileSettings', JSON.stringify(this.settings));
    }

    loadSettings() {
        const saved = localStorage.getItem('speedRivalsMobileSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
    }

    // Public API for game integration
    getSteeringInput() {
        return this.steering;
    }

    getAccelerationInput() {
        return this.acceleration;
    }

    getBrakingInput() {
        return this.braking;
    }

    isHandbrakeActive() {
        return this.isHandbraking;
    }

    // Handle collision feedback
    onCollision(intensity = 1) {
        this.triggerHaptic('collision');
    }

    // Handle engine feedback
    onEngineRevUp() {
        this.triggerHaptic('medium');
    }

    // Handle speed feedback
    onSpeedChange(speed) {
        // Trigger periodic feedback at high speeds
        if (speed > 150 && Math.random() < 0.1) {
            this.triggerHaptic('light');
        }
    }
}

// Initialize mobile controls
const mobileControls = new MobileControls();