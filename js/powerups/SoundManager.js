/**
 * SoundManager.js - Audio management system for power-ups
 * Handles loading, playing, and managing sound effects
 */

class SoundManager {
    constructor() {
        this.audioContext = null;
        this.sounds = new Map();
        this.loadedSounds = new Map();
        this.masterVolume = 0.7;
        this.isEnabled = true;

        this.initializeAudioContext();
        this.defineSounds();
    }

    /**
     * Initialize Web Audio API context
     */
    initializeAudioContext() {
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();

            // Handle audio context suspension in modern browsers
            if (this.audioContext.state === 'suspended') {
                const resumeAudio = () => {
                    this.audioContext.resume();
                    document.removeEventListener('click', resumeAudio);
                    document.removeEventListener('keydown', resumeAudio);
                };
                document.addEventListener('click', resumeAudio);
                document.addEventListener('keydown', resumeAudio);
            }

            console.log('🔊 Audio context initialized');
        } catch (error) {
            console.warn('⚠️ Web Audio API not supported:', error);
            this.audioContext = null;
        }
    }

    /**
     * Define all power-up sound effects
     */
    defineSounds() {
        // Power-up collection and activation sounds
        this.sounds.set('powerup_spawn', { frequency: 440, type: 'success', duration: 0.3 });
        this.sounds.set('powerup_collect', { frequency: 660, type: 'pickup', duration: 0.2 });

        // Nitro Boost sounds
        this.sounds.set('nitro_boost', { frequency: 200, type: 'engine', duration: 0.5 });
        this.sounds.set('nitro_loop', { frequency: 150, type: 'engine_loop', duration: 0.3 });
        this.sounds.set('nitro_end', { frequency: 300, type: 'wind_down', duration: 0.4 });

        // Shield sounds
        this.sounds.set('shield_activate', { frequency: 400, type: 'energy', duration: 0.6 });
        this.sounds.set('shield_ambient', { frequency: 350, type: 'hum', duration: 0.2 });
        this.sounds.set('shield_hit', { frequency: 600, type: 'deflect', duration: 0.3 });
        this.sounds.set('shield_break', { frequency: 200, type: 'break', duration: 0.8 });
        this.sounds.set('shield_end', { frequency: 250, type: 'power_down', duration: 0.5 });

        // EMP sounds
        this.sounds.set('emp_charge', { frequency: 100, type: 'charge_up', duration: 1.0 });
        this.sounds.set('emp_charge_loop', { frequency: 120, type: 'electric', duration: 0.2 });
        this.sounds.set('emp_blast', { frequency: 80, type: 'explosion', duration: 1.2 });
        this.sounds.set('emp_end', { frequency: 150, type: 'static', duration: 0.3 });

        // Missile sounds
        this.sounds.set('missile_lock', { frequency: 800, type: 'beep', duration: 0.2 });
        this.sounds.set('missile_locking', { frequency: 600, type: 'radar', duration: 0.5 });
        this.sounds.set('missile_lock_complete', { frequency: 1000, type: 'confirm', duration: 0.3 });
        this.sounds.set('missile_launch', { frequency: 300, type: 'whoosh', duration: 0.6 });
        this.sounds.set('missile_flight', { frequency: 250, type: 'jet', duration: 0.3 });
        this.sounds.set('missile_explosion', { frequency: 100, type: 'explosion', duration: 1.0 });
        this.sounds.set('missile_fizzle', { frequency: 200, type: 'fizzle', duration: 0.4 });
        this.sounds.set('missile_end', { frequency: 180, type: 'wind_down', duration: 0.3 });

        // Star Power sounds
        this.sounds.set('star_power', { frequency: 500, type: 'magical', duration: 1.0 });
        this.sounds.set('star_ambient', { frequency: 400, type: 'sparkle', duration: 0.3 });
        this.sounds.set('star_deflect', { frequency: 800, type: 'ding', duration: 0.2 });
        this.sounds.set('star_end', { frequency: 300, type: 'fade', duration: 0.6 });

        // Time Rewind sounds
        this.sounds.set('time_rewind', { frequency: 300, type: 'warp', duration: 1.5 });
        this.sounds.set('time_ambient', { frequency: 250, type: 'temporal', duration: 0.4 });
        this.sounds.set('time_end', { frequency: 200, type: 'reality', duration: 0.5 });

        // Smoke Screen sounds
        this.sounds.set('smoke_deploy', { frequency: 150, type: 'gas', duration: 0.8 });
        this.sounds.set('smoke_puff', { frequency: 120, type: 'puff', duration: 0.2 });
        this.sounds.set('smoke_ambient', { frequency: 100, type: 'hiss', duration: 0.3 });
        this.sounds.set('smoke_end', { frequency: 130, type: 'dissipate', duration: 0.4 });
    }

    /**
     * Play a sound effect
     */
    playSound(soundName, volume = 1.0) {
        if (!this.isEnabled || !this.audioContext) {
            return null;
        }

        const soundConfig = this.sounds.get(soundName);
        if (!soundConfig) {
            console.warn(`⚠️ Sound not found: ${soundName}`);
            return null;
        }

        try {
            const source = this.generateSound(soundConfig, volume);
            source.start();
            return source;
        } catch (error) {
            console.warn(`⚠️ Error playing sound ${soundName}:`, error);
            return null;
        }
    }

    /**
     * Generate sound based on configuration
     */
    generateSound(config, volume) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filterNode = this.audioContext.createBiquadFilter();

        // Connect audio nodes
        oscillator.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // Configure based on sound type
        this.configureSoundType(oscillator, gainNode, filterNode, config, volume);

        return oscillator;
    }

    /**
     * Configure sound based on type
     */
    configureSoundType(oscillator, gainNode, filterNode, config, volume) {
        const now = this.audioContext.currentTime;
        const duration = config.duration;
        const finalVolume = volume * this.masterVolume;

        switch (config.type) {
            case 'success':
                this.createSuccessSound(oscillator, gainNode, filterNode, config, finalVolume, now, duration);
                break;
            case 'pickup':
                this.createPickupSound(oscillator, gainNode, filterNode, config, finalVolume, now, duration);
                break;
            case 'engine':
                this.createEngineSound(oscillator, gainNode, filterNode, config, finalVolume, now, duration);
                break;
            case 'engine_loop':
                this.createEngineLoopSound(oscillator, gainNode, filterNode, config, finalVolume, now, duration);
                break;
            case 'energy':
                this.createEnergySound(oscillator, gainNode, filterNode, config, finalVolume, now, duration);
                break;
            case 'electric':
                this.createElectricSound(oscillator, gainNode, filterNode, config, finalVolume, now, duration);
                break;
            case 'explosion':
                this.createExplosionSound(oscillator, gainNode, filterNode, config, finalVolume, now, duration);
                break;
            case 'magical':
                this.createMagicalSound(oscillator, gainNode, filterNode, config, finalVolume, now, duration);
                break;
            case 'warp':
                this.createWarpSound(oscillator, gainNode, filterNode, config, finalVolume, now, duration);
                break;
            case 'beep':
                this.createBeepSound(oscillator, gainNode, filterNode, config, finalVolume, now, duration);
                break;
            case 'whoosh':
                this.createWhooshSound(oscillator, gainNode, filterNode, config, finalVolume, now, duration);
                break;
            default:
                this.createGenericSound(oscillator, gainNode, filterNode, config, finalVolume, now, duration);
        }

        // Set stop time
        oscillator.stop(now + duration);
    }

    /**
     * Create success sound (power-up spawn)
     */
    createSuccessSound(oscillator, gainNode, filterNode, config, volume, now, duration) {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(config.frequency, now);
        oscillator.frequency.exponentialRampToValueAtTime(config.frequency * 1.5, now + duration * 0.3);
        oscillator.frequency.exponentialRampToValueAtTime(config.frequency * 2, now + duration);

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume * 0.5, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

        filterNode.type = 'lowpass';
        filterNode.frequency.setValueAtTime(2000, now);
    }

    /**
     * Create pickup sound (power-up collect)
     */
    createPickupSound(oscillator, gainNode, filterNode, config, volume, now, duration) {
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(config.frequency, now);
        oscillator.frequency.exponentialRampToValueAtTime(config.frequency * 2, now + duration);

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume * 0.4, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

        filterNode.type = 'highpass';
        filterNode.frequency.setValueAtTime(200, now);
    }

    /**
     * Create engine sound (nitro boost)
     */
    createEngineSound(oscillator, gainNode, filterNode, config, volume, now, duration) {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(config.frequency, now);
        oscillator.frequency.linearRampToValueAtTime(config.frequency * 0.5, now + duration * 0.2);
        oscillator.frequency.linearRampToValueAtTime(config.frequency * 2, now + duration);

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume * 0.6, now + 0.05);
        gainNode.gain.linearRampToValueAtTime(volume * 0.4, now + duration * 0.8);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

        filterNode.type = 'lowpass';
        filterNode.frequency.setValueAtTime(800, now);
        filterNode.frequency.linearRampToValueAtTime(1200, now + duration);
    }

    /**
     * Create engine loop sound
     */
    createEngineLoopSound(oscillator, gainNode, filterNode, config, volume, now, duration) {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(config.frequency, now);

        gainNode.gain.setValueAtTime(volume * 0.3, now);
        gainNode.gain.setValueAtTime(volume * 0.3, now + duration);

        filterNode.type = 'lowpass';
        filterNode.frequency.setValueAtTime(600, now);
    }

    /**
     * Create energy sound (shield)
     */
    createEnergySound(oscillator, gainNode, filterNode, config, volume, now, duration) {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(config.frequency, now);
        oscillator.frequency.linearRampToValueAtTime(config.frequency * 1.2, now + duration * 0.5);
        oscillator.frequency.linearRampToValueAtTime(config.frequency, now + duration);

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume * 0.4, now + 0.1);
        gainNode.gain.linearRampToValueAtTime(volume * 0.3, now + duration * 0.7);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

        filterNode.type = 'bandpass';
        filterNode.frequency.setValueAtTime(800, now);
        filterNode.Q.setValueAtTime(5, now);
    }

    /**
     * Create electric sound (EMP)
     */
    createElectricSound(oscillator, gainNode, filterNode, config, volume, now, duration) {
        oscillator.type = 'square';

        // Create crackling effect with frequency modulation
        const frequencies = [config.frequency, config.frequency * 1.3, config.frequency * 0.8, config.frequency * 1.6];
        const segmentDuration = duration / frequencies.length;

        frequencies.forEach((freq, index) => {
            const startTime = now + index * segmentDuration;
            oscillator.frequency.setValueAtTime(freq, startTime);
        });

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume * 0.5, now + 0.01);

        // Create crackling volume pattern
        for (let i = 0; i < 10; i++) {
            const time = now + (i / 10) * duration;
            const vol = volume * (0.2 + Math.random() * 0.3);
            gainNode.gain.setValueAtTime(vol, time);
        }

        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

        filterNode.type = 'highpass';
        filterNode.frequency.setValueAtTime(400, now);
    }

    /**
     * Create explosion sound
     */
    createExplosionSound(oscillator, gainNode, filterNode, config, volume, now, duration) {
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(config.frequency, now);
        oscillator.frequency.exponentialRampToValueAtTime(config.frequency * 0.3, now + duration);

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume * 0.8, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(volume * 0.3, now + duration * 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

        filterNode.type = 'lowpass';
        filterNode.frequency.setValueAtTime(2000, now);
        filterNode.frequency.exponentialRampToValueAtTime(200, now + duration);
    }

    /**
     * Create magical sound (star power)
     */
    createMagicalSound(oscillator, gainNode, filterNode, config, volume, now, duration) {
        oscillator.type = 'sine';

        // Create ascending magical tone
        oscillator.frequency.setValueAtTime(config.frequency, now);
        oscillator.frequency.exponentialRampToValueAtTime(config.frequency * 2, now + duration * 0.3);
        oscillator.frequency.exponentialRampToValueAtTime(config.frequency * 3, now + duration * 0.6);
        oscillator.frequency.exponentialRampToValueAtTime(config.frequency * 4, now + duration);

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume * 0.4, now + 0.1);
        gainNode.gain.linearRampToValueAtTime(volume * 0.6, now + duration * 0.5);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

        filterNode.type = 'bandpass';
        filterNode.frequency.setValueAtTime(1000, now);
        filterNode.frequency.linearRampToValueAtTime(2000, now + duration);
        filterNode.Q.setValueAtTime(3, now);
    }

    /**
     * Create warp sound (time rewind)
     */
    createWarpSound(oscillator, gainNode, filterNode, config, volume, now, duration) {
        oscillator.type = 'sawtooth';

        // Create descending warp effect
        oscillator.frequency.setValueAtTime(config.frequency * 2, now);
        oscillator.frequency.exponentialRampToValueAtTime(config.frequency, now + duration * 0.3);
        oscillator.frequency.exponentialRampToValueAtTime(config.frequency * 0.5, now + duration * 0.7);
        oscillator.frequency.exponentialRampToValueAtTime(config.frequency * 0.3, now + duration);

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume * 0.5, now + 0.05);
        gainNode.gain.linearRampToValueAtTime(volume * 0.3, now + duration * 0.8);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

        filterNode.type = 'lowpass';
        filterNode.frequency.setValueAtTime(1500, now);
        filterNode.frequency.exponentialRampToValueAtTime(300, now + duration);
    }

    /**
     * Create beep sound (missile lock)
     */
    createBeepSound(oscillator, gainNode, filterNode, config, volume, now, duration) {
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(config.frequency, now);

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume * 0.6, now + 0.01);
        gainNode.gain.linearRampToValueAtTime(volume * 0.6, now + duration * 0.3);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

        filterNode.type = 'bandpass';
        filterNode.frequency.setValueAtTime(config.frequency, now);
        filterNode.Q.setValueAtTime(10, now);
    }

    /**
     * Create whoosh sound (missile launch)
     */
    createWhooshSound(oscillator, gainNode, filterNode, config, volume, now, duration) {
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(config.frequency, now);
        oscillator.frequency.linearRampToValueAtTime(config.frequency * 2, now + duration * 0.1);
        oscillator.frequency.exponentialRampToValueAtTime(config.frequency * 0.3, now + duration);

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume * 0.7, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

        filterNode.type = 'lowpass';
        filterNode.frequency.setValueAtTime(2000, now);
        filterNode.frequency.exponentialRampToValueAtTime(400, now + duration);
    }

    /**
     * Create generic sound
     */
    createGenericSound(oscillator, gainNode, filterNode, config, volume, now, duration) {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(config.frequency, now);

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume * 0.5, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

        filterNode.type = 'lowpass';
        filterNode.frequency.setValueAtTime(1000, now);
    }

    /**
     * Set master volume
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }

    /**
     * Enable/disable sound
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
    }

    /**
     * Get current settings
     */
    getSettings() {
        return {
            isEnabled: this.isEnabled,
            masterVolume: this.masterVolume,
            audioContextState: this.audioContext ? this.audioContext.state : 'not supported'
        };
    }

    /**
     * Preload sounds (for better performance)
     */
    preloadSounds() {
        // In a real implementation, this might preload audio files
        // For now, we're using generated sounds, so no preloading needed
        console.log('🔊 Sound system ready');
    }

    /**
     * Dispose of the sound manager
     */
    dispose() {
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.sounds.clear();
        this.loadedSounds.clear();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SoundManager;
}