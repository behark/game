/**
 * AudioSystem.js
 * Advanced audio system with spatial audio, engine sounds, and dynamic music
 */

class AudioSystem {
    constructor(camera) {
        this.camera = camera;
        this.listener = null;
        this.sounds = {};
        this.audioLoader = null;
        this.enabled = true;
        this.volumes = {
            master: 0.8,
            engine: 0.7,
            effects: 0.6,
            music: 0.4,
            ambient: 0.3
        };
        
        this.engineRPM = 0;
        this.maxRPM = 8000;
        
        this.initialize();
    }

    /**
     * Initialize audio system
     */
    initialize() {
        // Create audio listener attached to camera
        this.listener = new THREE.AudioListener();
        this.camera.add(this.listener);
        
        // Create audio loader
        this.audioLoader = new THREE.AudioLoader();
        
        console.log('✅ Audio system initialized');
        console.log('   - Spatial audio: Enabled');
        console.log('   - Master volume:', this.volumes.master);
    }

    /**
     * Load and create engine sound
     */
    createEngineSound(carMesh) {
        const sound = new THREE.PositionalAudio(this.listener);
        
        // In production, load actual engine sound file
        // For now, use synthetic sound
        const oscillator = this.listener.context.createOscillator();
        const gainNode = this.listener.context.createGain();
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.value = 100;
        oscillator.connect(gainNode);
        gainNode.connect(sound.getOutput());
        oscillator.start();
        
        sound.setRefDistance(10);
        sound.setRolloffFactor(2);
        sound.setVolume(this.volumes.engine * this.volumes.master);
        
        carMesh.add(sound);
        
        this.sounds.engine = {
            sound: sound,
            oscillator: oscillator,
            gain: gainNode,
            baseFreq: 100,
            car: carMesh
        };
        
        console.log('🔊 Engine sound created');
        
        return sound;
    }

    /**
     * Update engine sound based on RPM
     */
    updateEngineSound(rpm, throttle, speed) {
        if (!this.sounds.engine) return;
        
        this.engineRPM = rpm;
        
        // Calculate frequency based on RPM
        const normalizedRPM = rpm / this.maxRPM;
        const frequency = this.sounds.engine.baseFreq + (normalizedRPM * 400);
        
        // Update oscillator frequency
        this.sounds.engine.oscillator.frequency.setValueAtTime(
            frequency,
            this.listener.context.currentTime
        );
        
        // Update volume based on throttle
        const volume = (0.3 + throttle * 0.7) * this.volumes.engine * this.volumes.master;
        this.sounds.engine.gain.gain.setValueAtTime(
            volume,
            this.listener.context.currentTime
        );
    }

    /**
     * Create tire screech sound
     */
    createTireScreechSound(carMesh) {
        const sound = new THREE.PositionalAudio(this.listener);
        
        // Synthetic screech sound
        const oscillator = this.listener.context.createOscillator();
        const gainNode = this.listener.context.createGain();
        const filter = this.listener.context.createBiquadFilter();
        
        oscillator.type = 'square';
        oscillator.frequency.value = 300;
        filter.type = 'bandpass';
        filter.frequency.value = 400;
        filter.Q.value = 10;
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(sound.getOutput());
        gainNode.gain.value = 0; // Start silent
        oscillator.start();
        
        sound.setRefDistance(15);
        sound.setRolloffFactor(1.5);
        
        carMesh.add(sound);
        
        this.sounds.tireScreech = {
            sound: sound,
            oscillator: oscillator,
            gain: gainNode,
            filter: filter,
            car: carMesh
        };
        
        console.log('🔊 Tire screech sound created');
        
        return sound;
    }

    /**
     * Update tire screech based on slip
     */
    updateTireScreech(isSlipping, slipIntensity) {
        if (!this.sounds.tireScreech) return;
        
        const targetVolume = isSlipping ? 
            slipIntensity * this.volumes.effects * this.volumes.master : 
            0;
        
        // Smooth volume transition
        this.sounds.tireScreech.gain.gain.linearRampToValueAtTime(
            targetVolume,
            this.listener.context.currentTime + 0.1
        );
    }

    /**
     * Play collision sound
     */
    playCollisionSound(position, intensity) {
        const sound = new THREE.PositionalAudio(this.listener);
        
        // Create impact sound
        const audioContext = this.listener.context;
        const duration = 0.3;
        const sampleRate = audioContext.sampleRate;
        const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Generate impact noise
        for (let i = 0; i < buffer.length; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * 0.1));
        }
        
        sound.setBuffer(buffer);
        sound.setRefDistance(20);
        sound.setVolume(intensity * this.volumes.effects * this.volumes.master);
        sound.position.copy(position);
        
        // Play and cleanup
        sound.play();
        setTimeout(() => {
            sound.disconnect();
        }, duration * 1000);
        
        console.log('💥 Collision sound played');
    }

    /**
     * Create wind/ambient sound
     */
    createWindSound(carMesh) {
        const sound = new THREE.PositionalAudio(this.listener);
        
        // Wind sound (white noise filtered)
        const audioContext = this.listener.context;
        const bufferSize = audioContext.sampleRate * 2;
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        // Generate white noise
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        
        const gainNode = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 500;
        
        source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(sound.getOutput());
        gainNode.gain.value = 0;
        source.start();
        
        sound.setRefDistance(5);
        
        carMesh.add(sound);
        
        this.sounds.wind = {
            sound: sound,
            source: source,
            gain: gainNode,
            filter: filter
        };
        
        console.log('🔊 Wind sound created');
        
        return sound;
    }

    /**
     * Update wind sound based on speed
     */
    updateWindSound(speed) {
        if (!this.sounds.wind) return;
        
        // Volume increases with speed
        const volume = Math.min(speed / 200, 1.0) * this.volumes.ambient * this.volumes.master;
        
        this.sounds.wind.gain.gain.linearRampToValueAtTime(
            volume,
            this.listener.context.currentTime + 0.1
        );
        
        // Filter frequency changes with speed
        const filterFreq = 300 + (speed / 200) * 700;
        this.sounds.wind.filter.frequency.setValueAtTime(
            filterFreq,
            this.listener.context.currentTime
        );
    }

    /**
     * Create background music
     */
    createBackgroundMusic(trackUrl) {
        const sound = new THREE.Audio(this.listener);
        
        this.audioLoader.load(trackUrl, (buffer) => {
            sound.setBuffer(buffer);
            sound.setLoop(true);
            sound.setVolume(this.volumes.music * this.volumes.master);
            
            this.sounds.music = sound;
            
            console.log('🎵 Background music loaded');
        });
        
        return sound;
    }

    /**
     * Play background music
     */
    playMusic() {
        if (this.sounds.music && !this.sounds.music.isPlaying) {
            this.sounds.music.play();
            console.log('🎵 Music started');
        }
    }

    /**
     * Stop background music
     */
    stopMusic() {
        if (this.sounds.music && this.sounds.music.isPlaying) {
            this.sounds.music.stop();
            console.log('🎵 Music stopped');
        }
    }

    /**
     * Create countdown beep sound
     */
    playCountdownBeep(pitch = 1.0) {
        const sound = new THREE.Audio(this.listener);
        
        // Create beep
        const audioContext = this.listener.context;
        const duration = 0.1;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.frequency.value = 800 * pitch;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.connect(gainNode);
        gainNode.connect(sound.getOutput());
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    }

    /**
     * Set volume for category
     */
    setVolume(category, volume) {
        this.volumes[category] = Math.max(0, Math.min(1, volume));
        
        // Update active sounds
        this.updateAllVolumes();
        
        console.log(`🔊 ${category} volume: ${Math.round(this.volumes[category] * 100)}%`);
    }

    /**
     * Update all sound volumes
     */
    updateAllVolumes() {
        if (this.sounds.engine) {
            this.sounds.engine.sound.setVolume(this.volumes.engine * this.volumes.master);
        }
        
        if (this.sounds.music) {
            this.sounds.music.setVolume(this.volumes.music * this.volumes.master);
        }
    }

    /**
     * Mute/unmute all audio
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        
        Object.values(this.sounds).forEach(soundData => {
            if (soundData.sound) {
                if (enabled) {
                    if (soundData.sound.context.state === 'suspended') {
                        soundData.sound.context.resume();
                    }
                } else {
                    soundData.sound.setVolume(0);
                }
            }
        });
        
        console.log(`🔊 Audio: ${enabled ? 'Enabled' : 'Muted'}`);
    }

    /**
     * Update audio system (called every frame)
     */
    update(deltaTime, carData) {
        if (!this.enabled) return;
        
        // Update engine sound
        if (carData.rpm !== undefined) {
            this.updateEngineSound(carData.rpm, carData.throttle || 0, carData.speed || 0);
        }
        
        // Update tire screech
        if (carData.isSlipping !== undefined) {
            this.updateTireScreech(carData.isSlipping, carData.slipIntensity || 0.5);
        }
        
        // Update wind sound
        if (carData.speed !== undefined) {
            this.updateWindSound(carData.speed);
        }
    }

    /**
     * Cleanup
     */
    dispose() {
        Object.values(this.sounds).forEach(soundData => {
            if (soundData.sound) {
                soundData.sound.stop();
                soundData.sound.disconnect();
            }
            if (soundData.oscillator) {
                soundData.oscillator.stop();
            }
            if (soundData.source) {
                soundData.source.stop();
            }
        });
        
        this.sounds = {};
        
        console.log('🔊 Audio system disposed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioSystem;
}
