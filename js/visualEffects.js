/**
 * Speed Rivals Visual Effects Engine
 * A comprehensive AAA-quality visual effects system for racing games
 * Features: Particle systems, environmental effects, post-processing, and more
 */

class VisualEffectsEngine {
    constructor(scene, renderer, camera, world) {
        this.scene = scene;
        this.renderer = renderer;
        this.camera = camera;
        this.world = world;

        // Initialize systems
        this.particleSystem = null;
        this.environmentalEffects = null;
        this.postProcessing = null;
        this.qualitySettings = 'high'; // low, medium, high, ultra

        // Performance metrics
        this.frameRate = 60;
        this.lastFrameTime = 0;

        // Effect pools for performance
        this.effectPools = {
            sparks: [],
            smoke: [],
            debris: [],
            dust: []
        };

        this.activeEffects = [];
        this.timeOfDay = 0.5; // 0 = midnight, 0.5 = noon, 1 = midnight
        this.weatherIntensity = 0; // 0 = clear, 1 = storm

        this.init();
    }

    async init() {
        console.log('🎨 Initializing Visual Effects Engine...');

        this.setupParticleSystem();
        this.setupEnvironmentalEffects();
        this.setupPostProcessing();
        this.setupPerformanceMonitoring();

        console.log('✅ Visual Effects Engine initialized!');
    }

    setupParticleSystem() {
        this.particleSystem = new ParticleSystem(this.scene);
    }

    setupEnvironmentalEffects() {
        this.environmentalEffects = new EnvironmentalEffects(this.scene, this.camera);
    }

    setupPostProcessing() {
        this.postProcessing = new PostProcessingPipeline(this.renderer, this.scene, this.camera);
    }

    setupPerformanceMonitoring() {
        setInterval(() => {
            this.optimizePerformance();
        }, 1000);
    }

    // Car-related visual effects
    createEngineExhaust(carPosition, carRotation, speed, engineTemp = 0.5) {
        const exhaustIntensity = Math.min(speed / 30, 1.0) * engineTemp;

        if (exhaustIntensity > 0.1) {
            // Fire and smoke particles from exhaust
            const exhaustOffset = new THREE.Vector3(-0.5, 0, -4);
            const worldExhaustPos = exhaustOffset.clone()
                .applyQuaternion(carRotation)
                .add(carPosition);

            // Fire particles for high speed/temperature
            if (exhaustIntensity > 0.6) {
                this.particleSystem.createFire({
                    position: worldExhaustPos,
                    velocity: new THREE.Vector3(0, 1, -5).applyQuaternion(carRotation),
                    intensity: exhaustIntensity,
                    lifetime: 0.5,
                    count: Math.floor(exhaustIntensity * 10)
                });
            }

            // Smoke particles
            this.particleSystem.createSmoke({
                position: worldExhaustPos,
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    2,
                    -3 + Math.random() * 2
                ).applyQuaternion(carRotation),
                intensity: exhaustIntensity * 0.7,
                lifetime: 2 + Math.random(),
                count: Math.floor(exhaustIntensity * 5)
            });
        }
    }

    createTireSmoke(wheelPosition, wheelRotation, skidIntensity) {
        if (skidIntensity > 0.3) {
            // Volumetric tire smoke
            this.particleSystem.createTireSmoke({
                position: wheelPosition.clone().add(new THREE.Vector3(0, -0.2, 0)),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 3,
                    0.5,
                    (Math.random() - 0.5) * 3
                ),
                intensity: skidIntensity,
                lifetime: 3 + Math.random() * 2,
                count: Math.floor(skidIntensity * 8)
            });

            // Add tire marks on ground
            this.createTireMarks(wheelPosition, wheelRotation, skidIntensity);
        }
    }

    createCrashExplosion(position, velocity, severity = 1.0) {
        // Main explosion effect
        this.particleSystem.createExplosion({
            position: position.clone(),
            velocity: velocity.clone(),
            severity: severity,
            lifetime: 2,
            count: Math.floor(severity * 50)
        });

        // Debris particles
        this.particleSystem.createDebris({
            position: position.clone(),
            velocity: velocity.clone(),
            severity: severity,
            lifetime: 5,
            count: Math.floor(severity * 20)
        });

        // Sparks from metal collision
        this.particleSystem.createSparks({
            position: position.clone(),
            velocity: velocity.clone().multiplyScalar(0.5),
            intensity: severity,
            lifetime: 1,
            count: Math.floor(severity * 30)
        });

        // Camera shake effect
        this.createCameraShake(severity * 2);
    }

    createSparks(position, direction, intensity = 1.0) {
        this.particleSystem.createSparks({
            position: position.clone(),
            velocity: direction.clone().multiplyScalar(5 * intensity),
            intensity: intensity,
            lifetime: 0.8,
            count: Math.floor(intensity * 15)
        });
    }

    createPowerUpEffect(position, powerUpType) {
        const effects = {
            speed: { color: 0x00ff00, size: 2.0 },
            shield: { color: 0x0066ff, size: 1.8 },
            nitro: { color: 0xff6600, size: 2.2 }
        };

        const config = effects[powerUpType] || effects.speed;

        // Pickup sparkles
        this.particleSystem.createPickupSparkles({
            position: position.clone(),
            color: config.color,
            size: config.size,
            lifetime: 3,
            count: 25
        });

        // Activation burst
        this.particleSystem.createActivationBurst({
            position: position.clone(),
            color: config.color,
            size: config.size * 1.5,
            lifetime: 1,
            count: 40
        });
    }

    createDustClouds(position, velocity, intensity = 1.0) {
        // Off-track driving dust effects
        this.particleSystem.createDust({
            position: position.clone().add(new THREE.Vector3(0, 0.1, 0)),
            velocity: velocity.clone().add(new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                1,
                (Math.random() - 0.5) * 2
            )),
            intensity: intensity,
            lifetime: 4,
            count: Math.floor(intensity * 10)
        });
    }

    createEngineGlow(carPosition, engineTemp = 0.5) {
        if (engineTemp > 0.7) {
            // Heat shimmer effect
            this.particleSystem.createHeatShimmer({
                position: carPosition.clone().add(new THREE.Vector3(0, 0, 3)),
                intensity: engineTemp,
                lifetime: 0.5,
                count: 5
            });
        }
    }

    createVictoryEffects(position) {
        // Confetti explosion
        this.particleSystem.createConfetti({
            position: position.clone().add(new THREE.Vector3(0, 5, 0)),
            velocity: new THREE.Vector3(0, 10, 0),
            lifetime: 8,
            count: 100
        });

        // Fireworks
        setTimeout(() => {
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    this.particleSystem.createFireworks({
                        position: position.clone().add(new THREE.Vector3(
                            (Math.random() - 0.5) * 20,
                            15 + Math.random() * 10,
                            (Math.random() - 0.5) * 20
                        )),
                        color: Math.random() * 0xffffff,
                        lifetime: 3,
                        count: 50
                    });
                }, i * 500);
            }
        }, 1000);

        // Spotlight effect
        this.createSpotlight(position);
    }

    createTireMarks(position, rotation, intensity) {
        // Create persistent tire marks on track surface
        const markGeometry = new THREE.PlaneGeometry(0.3, 2);
        const markMaterial = new THREE.MeshBasicMaterial({
            color: 0x222222,
            transparent: true,
            opacity: intensity * 0.6,
            depthWrite: false
        });

        const markMesh = new THREE.Mesh(markGeometry, markMaterial);
        markMesh.position.copy(position);
        markMesh.position.y = 0.02;
        markMesh.rotation.copy(rotation);
        markMesh.rotation.x = -Math.PI / 2;

        this.scene.add(markMesh);

        // Remove tire marks after some time
        setTimeout(() => {
            this.scene.remove(markMesh);
        }, 30000);
    }

    createCameraShake(intensity) {
        const originalPosition = this.camera.position.clone();
        const shakeAmount = intensity * 0.5;
        const duration = intensity * 500;
        const startTime = Date.now();

        const shake = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed < duration) {
                const progress = elapsed / duration;
                const falloff = 1 - progress;

                this.camera.position.x = originalPosition.x + (Math.random() - 0.5) * shakeAmount * falloff;
                this.camera.position.y = originalPosition.y + (Math.random() - 0.5) * shakeAmount * falloff;
                this.camera.position.z = originalPosition.z + (Math.random() - 0.5) * shakeAmount * falloff;

                requestAnimationFrame(shake);
            } else {
                this.camera.position.copy(originalPosition);
            }
        };

        shake();
    }

    createSpotlight(position) {
        const spotlight = new THREE.SpotLight(0xffffff, 2, 50, Math.PI / 4, 0.5);
        spotlight.position.set(position.x, position.y + 20, position.z);
        spotlight.target.position.copy(position);
        spotlight.castShadow = true;

        this.scene.add(spotlight);
        this.scene.add(spotlight.target);

        // Remove spotlight after effect
        setTimeout(() => {
            this.scene.remove(spotlight);
            this.scene.remove(spotlight.target);
        }, 5000);
    }

    // Environmental effects
    updateDayNightCycle(deltaTime) {
        // 20-minute real-time cycle
        this.timeOfDay += deltaTime / (20 * 60);
        if (this.timeOfDay > 1) this.timeOfDay = 0;

        this.environmentalEffects.updateDayNight(this.timeOfDay);
    }

    setWeather(type, intensity = 0.5) {
        this.weatherIntensity = intensity;
        this.environmentalEffects.setWeather(type, intensity);
    }

    updateEnvironmentalEffects(deltaTime) {
        this.environmentalEffects.update(deltaTime);
        this.updateDayNightCycle(deltaTime);
    }

    // Performance optimization
    optimizePerformance() {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;
        this.frameRate = 1000 / deltaTime;
        this.lastFrameTime = currentTime;

        // Adjust quality based on performance
        if (this.frameRate < 45 && this.qualitySettings !== 'low') {
            this.lowerQuality();
        } else if (this.frameRate > 55 && this.qualitySettings !== 'ultra') {
            this.raiseQuality();
        }

        // Clean up expired effects
        this.cleanupExpiredEffects();
    }

    lowerQuality() {
        const qualityLevels = ['ultra', 'high', 'medium', 'low'];
        const currentIndex = qualityLevels.indexOf(this.qualitySettings);
        if (currentIndex < qualityLevels.length - 1) {
            this.qualitySettings = qualityLevels[currentIndex + 1];
            this.applyQualitySettings();
            console.log(`🔧 Lowered quality to: ${this.qualitySettings}`);
        }
    }

    raiseQuality() {
        const qualityLevels = ['low', 'medium', 'high', 'ultra'];
        const currentIndex = qualityLevels.indexOf(this.qualitySettings);
        if (currentIndex < qualityLevels.length - 1) {
            this.qualitySettings = qualityLevels[currentIndex + 1];
            this.applyQualitySettings();
            console.log(`📈 Raised quality to: ${this.qualitySettings}`);
        }
    }

    applyQualitySettings() {
        const settings = {
            low: { particleCount: 0.3, shadowQuality: 512, postProcessing: false },
            medium: { particleCount: 0.6, shadowQuality: 1024, postProcessing: true },
            high: { particleCount: 0.8, shadowQuality: 2048, postProcessing: true },
            ultra: { particleCount: 1.0, shadowQuality: 4096, postProcessing: true }
        };

        const config = settings[this.qualitySettings];
        this.particleSystem.setQuality(config.particleCount);
        this.environmentalEffects.setQuality(config);
        this.postProcessing.setEnabled(config.postProcessing);
    }

    cleanupExpiredEffects() {
        this.activeEffects = this.activeEffects.filter(effect => {
            if (effect.isExpired()) {
                effect.dispose();
                return false;
            }
            return true;
        });
    }

    update(deltaTime) {
        // Update all systems
        if (this.particleSystem) {
            this.particleSystem.update(deltaTime);
        }

        if (this.environmentalEffects) {
            this.updateEnvironmentalEffects(deltaTime);
        }

        if (this.postProcessing && this.postProcessing.enabled) {
            this.postProcessing.update(deltaTime);
        }

        // Update active effects
        this.activeEffects.forEach(effect => effect.update(deltaTime));
    }

    render() {
        if (this.postProcessing && this.postProcessing.enabled) {
            this.postProcessing.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }

    // Cleanup
    dispose() {
        if (this.particleSystem) this.particleSystem.dispose();
        if (this.environmentalEffects) this.environmentalEffects.dispose();
        if (this.postProcessing) this.postProcessing.dispose();

        this.activeEffects.forEach(effect => effect.dispose());
        this.activeEffects = [];
    }
}

// Particle System Implementation
class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.qualityMultiplier = 1.0;

        // Pre-load particle geometries and materials
        this.geometries = {
            spark: new THREE.SphereGeometry(0.02, 4, 4),
            smoke: new THREE.SphereGeometry(0.5, 8, 8),
            fire: new THREE.SphereGeometry(0.3, 6, 6),
            debris: new THREE.BoxGeometry(0.1, 0.1, 0.1),
            dust: new THREE.SphereGeometry(0.2, 6, 6)
        };

        this.materials = {
            spark: new THREE.MeshStandardMaterial({
                color: 0xffaa00,
                emissive: 0xff6600,
                emissiveIntensity: 1,
                transparent: true,
                metalness: 0.5,
                roughness: 0.5
            }),
            smoke: new THREE.MeshBasicMaterial({
                color: 0x666666,
                transparent: true,
                opacity: 0.6
            }),
            fire: new THREE.MeshStandardMaterial({
                color: 0xff4400,
                emissive: 0xff2200,
                emissiveIntensity: 1,
                transparent: true,
                metalness: 0.3,
                roughness: 0.7
            }),
            debris: new THREE.MeshLambertMaterial({ color: 0x444444 }),
            dust: new THREE.MeshBasicMaterial({
                color: 0xaa8866,
                transparent: true,
                opacity: 0.4
            })
        };
    }

    createFire(config) {
        for (let i = 0; i < config.count * this.qualityMultiplier; i++) {
            this.createParticle('fire', {
                position: config.position.clone().add(new THREE.Vector3(
                    (Math.random() - 0.5) * 0.5,
                    Math.random() * 0.2,
                    (Math.random() - 0.5) * 0.5
                )),
                velocity: config.velocity.clone().add(new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    Math.random() * 3,
                    (Math.random() - 0.5) * 2
                )),
                lifetime: config.lifetime * (0.5 + Math.random() * 0.5),
                intensity: config.intensity
            });
        }
    }

    createSmoke(config) {
        for (let i = 0; i < config.count * this.qualityMultiplier; i++) {
            this.createParticle('smoke', {
                position: config.position.clone().add(new THREE.Vector3(
                    (Math.random() - 0.5),
                    Math.random() * 0.5,
                    (Math.random() - 0.5)
                )),
                velocity: config.velocity.clone().add(new THREE.Vector3(
                    (Math.random() - 0.5) * 1,
                    Math.random() * 2,
                    (Math.random() - 0.5) * 1
                )),
                lifetime: config.lifetime * (0.8 + Math.random() * 0.4),
                intensity: config.intensity
            });
        }
    }

    createTireSmoke(config) {
        for (let i = 0; i < config.count * this.qualityMultiplier; i++) {
            const particle = this.createParticle('smoke', {
                position: config.position.clone().add(new THREE.Vector3(
                    (Math.random() - 0.5) * 0.8,
                    Math.random() * 0.3,
                    (Math.random() - 0.5) * 0.8
                )),
                velocity: config.velocity.clone().add(new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    0.5 + Math.random() * 1,
                    (Math.random() - 0.5) * 2
                )),
                lifetime: config.lifetime * (0.7 + Math.random() * 0.6),
                intensity: config.intensity
            });

            // Make tire smoke expand over time
            particle.expandRate = 1.5;
        }
    }

    createExplosion(config) {
        // Create multiple fire and smoke particles for explosion
        this.createFire({
            ...config,
            count: config.count * 0.4
        });

        this.createSmoke({
            ...config,
            count: config.count * 0.6,
            velocity: config.velocity.clone().multiplyScalar(0.7)
        });
    }

    createDebris(config) {
        for (let i = 0; i < config.count * this.qualityMultiplier; i++) {
            this.createParticle('debris', {
                position: config.position.clone().add(new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    Math.random(),
                    (Math.random() - 0.5) * 2
                )),
                velocity: config.velocity.clone().add(new THREE.Vector3(
                    (Math.random() - 0.5) * 10,
                    Math.random() * 8 + 2,
                    (Math.random() - 0.5) * 10
                )),
                lifetime: config.lifetime * (0.5 + Math.random()),
                intensity: config.severity,
                gravity: true
            });
        }
    }

    createSparks(config) {
        for (let i = 0; i < config.count * this.qualityMultiplier; i++) {
            this.createParticle('spark', {
                position: config.position.clone().add(new THREE.Vector3(
                    (Math.random() - 0.5) * 0.3,
                    Math.random() * 0.2,
                    (Math.random() - 0.5) * 0.3
                )),
                velocity: config.velocity.clone().add(new THREE.Vector3(
                    (Math.random() - 0.5) * 8,
                    Math.random() * 5 + 1,
                    (Math.random() - 0.5) * 8
                )),
                lifetime: config.lifetime * (0.3 + Math.random() * 0.7),
                intensity: config.intensity,
                gravity: true,
                fadeOut: true
            });
        }
    }

    createDust(config) {
        for (let i = 0; i < config.count * this.qualityMultiplier; i++) {
            this.createParticle('dust', {
                position: config.position.clone().add(new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    Math.random() * 0.5,
                    (Math.random() - 0.5) * 2
                )),
                velocity: config.velocity.clone().add(new THREE.Vector3(
                    (Math.random() - 0.5) * 3,
                    1 + Math.random() * 2,
                    (Math.random() - 0.5) * 3
                )),
                lifetime: config.lifetime * (0.8 + Math.random() * 0.4),
                intensity: config.intensity
            });
        }
    }

    createPickupSparkles(config) {
        for (let i = 0; i < config.count * this.qualityMultiplier; i++) {
            const sparkle = this.createParticle('spark', {
                position: config.position.clone().add(new THREE.Vector3(
                    (Math.random() - 0.5) * 3,
                    Math.random() * 3,
                    (Math.random() - 0.5) * 3
                )),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    Math.random() * 3 + 1,
                    (Math.random() - 0.5) * 2
                ),
                lifetime: config.lifetime * (0.5 + Math.random()),
                intensity: 1.0
            });

            sparkle.mesh.material = sparkle.mesh.material.clone();
            sparkle.mesh.material.color.setHex(config.color);
            sparkle.mesh.material.emissive.setHex(config.color);
            sparkle.orbitMotion = true;
        }
    }

    createActivationBurst(config) {
        for (let i = 0; i < config.count * this.qualityMultiplier; i++) {
            const burst = this.createParticle('spark', {
                position: config.position.clone(),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 10,
                    (Math.random() - 0.5) * 10,
                    (Math.random() - 0.5) * 10
                ).normalize().multiplyScalar(5 + Math.random() * 5),
                lifetime: config.lifetime * (0.7 + Math.random() * 0.6),
                intensity: 1.0
            });

            burst.mesh.material = burst.mesh.material.clone();
            burst.mesh.material.color.setHex(config.color);
            burst.mesh.material.emissive.setHex(config.color);
            burst.mesh.scale.setScalar(config.size);
        }
    }

    createConfetti(config) {
        const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];

        for (let i = 0; i < config.count * this.qualityMultiplier; i++) {
            const confetti = this.createParticle('debris', {
                position: config.position.clone().add(new THREE.Vector3(
                    (Math.random() - 0.5) * 5,
                    Math.random() * 2,
                    (Math.random() - 0.5) * 5
                )),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 8,
                    5 + Math.random() * 10,
                    (Math.random() - 0.5) * 8
                ),
                lifetime: config.lifetime * (0.8 + Math.random() * 0.4),
                intensity: 1.0,
                gravity: true
            });

            confetti.mesh.material = confetti.mesh.material.clone();
            confetti.mesh.material.color.setHex(colors[Math.floor(Math.random() * colors.length)]);
            confetti.spinRate = (Math.random() - 0.5) * 10;
        }
    }

    createFireworks(config) {
        for (let i = 0; i < config.count * this.qualityMultiplier; i++) {
            const firework = this.createParticle('spark', {
                position: config.position.clone(),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 15,
                    (Math.random() - 0.5) * 15,
                    (Math.random() - 0.5) * 15
                ).normalize().multiplyScalar(8 + Math.random() * 12),
                lifetime: config.lifetime * (0.5 + Math.random()),
                intensity: 1.0,
                gravity: true,
                fadeOut: true
            });

            firework.mesh.material = firework.mesh.material.clone();
            firework.mesh.material.color.setHex(config.color);
            firework.mesh.material.emissive.setHex(config.color);
            firework.mesh.scale.setScalar(0.8 + Math.random() * 0.4);
        }
    }

    createHeatShimmer(config) {
        // Create subtle distortion effect particles
        for (let i = 0; i < config.count * this.qualityMultiplier; i++) {
            const shimmer = this.createParticle('smoke', {
                position: config.position.clone().add(new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    Math.random() * 1,
                    (Math.random() - 0.5) * 2
                )),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.5,
                    1 + Math.random(),
                    (Math.random() - 0.5) * 0.5
                ),
                lifetime: config.lifetime * (0.8 + Math.random() * 0.4),
                intensity: config.intensity * 0.3
            });

            shimmer.mesh.material = shimmer.mesh.material.clone();
            shimmer.mesh.material.opacity = 0.1;
            shimmer.mesh.material.color.setHex(0xffffff);
            shimmer.heatDistortion = true;
        }
    }

    createParticle(type, config) {
        const geometry = this.geometries[type];
        const material = this.materials[type].clone();
        const mesh = new THREE.Mesh(geometry, material);

        mesh.position.copy(config.position);
        mesh.castShadow = true;

        const particle = {
            mesh: mesh,
            velocity: config.velocity.clone(),
            lifetime: config.lifetime,
            maxLifetime: config.lifetime,
            intensity: config.intensity || 1.0,
            gravity: config.gravity || false,
            fadeOut: config.fadeOut || false,
            expandRate: config.expandRate || 0,
            orbitMotion: config.orbitMotion || false,
            spinRate: config.spinRate || 0,
            heatDistortion: config.heatDistortion || false
        };

        this.particles.push(particle);
        this.scene.add(mesh);

        return particle;
    }

    setQuality(multiplier) {
        this.qualityMultiplier = Math.max(0.1, Math.min(1.0, multiplier));
    }

    update(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];

            // Update lifetime
            particle.lifetime -= deltaTime;

            if (particle.lifetime <= 0) {
                // Remove expired particle
                this.scene.remove(particle.mesh);
                this.particles.splice(i, 1);
                continue;
            }

            // Update position
            particle.mesh.position.add(particle.velocity.clone().multiplyScalar(deltaTime));

            // Apply gravity
            if (particle.gravity) {
                particle.velocity.y -= 9.8 * deltaTime;
            }

            // Apply air resistance
            particle.velocity.multiplyScalar(0.98);

            // Fade out over time
            if (particle.fadeOut) {
                const alpha = particle.lifetime / particle.maxLifetime;
                particle.mesh.material.opacity = alpha;
            }

            // Expand over time
            if (particle.expandRate > 0) {
                const scale = 1 + (particle.maxLifetime - particle.lifetime) * particle.expandRate;
                particle.mesh.scale.setScalar(scale);
            }

            // Orbital motion for sparkles
            if (particle.orbitMotion) {
                const time = (particle.maxLifetime - particle.lifetime) * 3;
                particle.mesh.position.x += Math.sin(time) * 0.1;
                particle.mesh.position.z += Math.cos(time) * 0.1;
            }

            // Spinning motion
            if (particle.spinRate !== 0) {
                particle.mesh.rotation.x += particle.spinRate * deltaTime;
                particle.mesh.rotation.y += particle.spinRate * deltaTime * 0.7;
                particle.mesh.rotation.z += particle.spinRate * deltaTime * 0.3;
            }

            // Heat distortion effect
            if (particle.heatDistortion) {
                const time = (particle.maxLifetime - particle.lifetime) * 5;
                particle.mesh.position.x += Math.sin(time * 10) * 0.02;
                particle.mesh.position.z += Math.cos(time * 7) * 0.02;
            }
        }
    }

    dispose() {
        this.particles.forEach(particle => {
            this.scene.remove(particle.mesh);
        });
        this.particles = [];

        Object.values(this.geometries).forEach(geo => geo.dispose());
        Object.values(this.materials).forEach(mat => mat.dispose());
    }
}

// Environmental Effects System
class EnvironmentalEffects {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;

        this.sunLight = null;
        this.moonLight = null;
        this.skybox = null;
        this.clouds = [];
        this.crowd = [];
        this.animatedObjects = [];

        this.weatherSystem = null;
        this.currentWeather = 'clear';
        this.weatherIntensity = 0;

        this.init();
    }

    init() {
        this.createSkybox();
        this.createSunMoon();
        this.createClouds();
        this.createAnimatedCrowd();
        this.createDynamicBackground();
        this.setupWeatherSystem();
    }

    createSkybox() {
        const skyGeometry = new THREE.SphereGeometry(400, 32, 32);
        const skyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x0077be) },
                bottomColor: { value: new THREE.Color(0x89b2db) },
                offset: { value: 33 },
                exponent: { value: 0.6 },
                timeOfDay: { value: 0.5 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                uniform float timeOfDay;
                varying vec3 vWorldPosition;

                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    vec3 dayTop = vec3(0.0, 0.47, 0.75);
                    vec3 dayBottom = vec3(0.54, 0.70, 0.86);
                    vec3 nightTop = vec3(0.0, 0.0, 0.1);
                    vec3 nightBottom = vec3(0.1, 0.1, 0.2);

                    vec3 currentTop = mix(nightTop, dayTop, timeOfDay);
                    vec3 currentBottom = mix(nightBottom, dayBottom, timeOfDay);

                    gl_FragColor = vec4(mix(currentBottom, currentTop, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `,
            side: THREE.BackSide
        });

        this.skybox = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(this.skybox);
    }

    createSunMoon() {
        // Sun
        const sunGeometry = new THREE.SphereGeometry(4, 16, 16);
        const sunMaterial = new THREE.MeshStandardMaterial({
            color: 0xffdd44,
            emissive: 0xffaa00,
            emissiveIntensity: 1,
            metalness: 0,
            roughness: 1
        });
        this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
        this.scene.add(this.sun);

        // Moon
        const moonGeometry = new THREE.SphereGeometry(3, 16, 16);
        const moonMaterial = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            emissive: 0x333333,
            emissiveIntensity: 0.5,
            metalness: 0,
            roughness: 1
        });
        this.moon = new THREE.Mesh(moonGeometry, moonMaterial);
        this.scene.add(this.moon);

        // Sun light
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.scene.add(this.sunLight);

        // Moon light
        this.moonLight = new THREE.DirectionalLight(0x4488cc, 0.3);
        this.scene.add(this.moonLight);
    }

    createClouds() {
        for (let i = 0; i < 20; i++) {
            const cloudGeometry = new THREE.SphereGeometry(
                8 + Math.random() * 12,
                8,
                8
            );
            const cloudMaterial = new THREE.MeshLambertMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.7
            });

            const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
            cloud.position.set(
                (Math.random() - 0.5) * 800,
                100 + Math.random() * 50,
                (Math.random() - 0.5) * 800
            );

            cloud.userData = {
                speed: 0.5 + Math.random() * 2,
                direction: Math.random() * Math.PI * 2
            };

            this.clouds.push(cloud);
            this.scene.add(cloud);
        }
    }

    createAnimatedCrowd() {
        // Create cheering spectator stands
        for (let i = 0; i < 10; i++) {
            const standGeometry = new THREE.BoxGeometry(20, 5, 5);
            const standMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
            const stand = new THREE.Mesh(standGeometry, standMaterial);

            const angle = (i / 10) * Math.PI * 2;
            const radius = 80;
            stand.position.set(
                Math.cos(angle) * radius,
                2.5,
                Math.sin(angle) * radius
            );
            stand.lookAt(0, 2.5, 0);

            this.scene.add(stand);

            // Add crowd figures
            for (let j = 0; j < 50; j++) {
                const crowdGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.5, 6);
                const crowdMaterial = new THREE.MeshLambertMaterial({
                    color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5)
                });
                const crowdMember = new THREE.Mesh(crowdGeometry, crowdMaterial);

                crowdMember.position.copy(stand.position);
                crowdMember.position.x += (Math.random() - 0.5) * 18;
                crowdMember.position.y += 4.25;
                crowdMember.position.z += (Math.random() - 0.5) * 4;

                crowdMember.userData = {
                    originalY: crowdMember.position.y,
                    wavePhase: Math.random() * Math.PI * 2,
                    waveSpeed: 2 + Math.random() * 3
                };

                this.crowd.push(crowdMember);
                this.scene.add(crowdMember);
            }
        }
    }

    createDynamicBackground() {
        // Helicopters
        for (let i = 0; i < 3; i++) {
            const heliGeometry = new THREE.BoxGeometry(3, 1, 8);
            const heliMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
            const helicopter = new THREE.Mesh(heliGeometry, heliMaterial);

            helicopter.position.set(
                (Math.random() - 0.5) * 400,
                50 + Math.random() * 30,
                (Math.random() - 0.5) * 400
            );

            helicopter.userData = {
                speed: 10 + Math.random() * 10,
                direction: Math.random() * Math.PI * 2,
                type: 'helicopter'
            };

            this.animatedObjects.push(helicopter);
            this.scene.add(helicopter);
        }

        // Planes
        for (let i = 0; i < 2; i++) {
            const planeGeometry = new THREE.BoxGeometry(8, 1, 3);
            const planeMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc });
            const plane = new THREE.Mesh(planeGeometry, planeMaterial);

            plane.position.set(
                (Math.random() - 0.5) * 600,
                80 + Math.random() * 40,
                (Math.random() - 0.5) * 600
            );

            plane.userData = {
                speed: 20 + Math.random() * 20,
                direction: Math.random() * Math.PI * 2,
                type: 'plane'
            };

            this.animatedObjects.push(plane);
            this.scene.add(plane);
        }

        // Birds
        for (let i = 0; i < 15; i++) {
            const birdGeometry = new THREE.SphereGeometry(0.3, 6, 6);
            const birdMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
            const bird = new THREE.Mesh(birdGeometry, birdMaterial);

            bird.position.set(
                (Math.random() - 0.5) * 300,
                20 + Math.random() * 30,
                (Math.random() - 0.5) * 300
            );

            bird.userData = {
                speed: 5 + Math.random() * 10,
                direction: Math.random() * Math.PI * 2,
                bobPhase: Math.random() * Math.PI * 2,
                type: 'bird'
            };

            this.animatedObjects.push(bird);
            this.scene.add(bird);
        }
    }

    setupWeatherSystem() {
        this.weatherSystem = {
            rain: null,
            snow: null,
            fog: null
        };
    }

    updateDayNight(timeOfDay) {
        // Update skybox
        if (this.skybox) {
            this.skybox.material.uniforms.timeOfDay.value = timeOfDay;
        }

        // Calculate sun and moon positions
        const sunAngle = timeOfDay * Math.PI * 2 - Math.PI / 2;
        const moonAngle = sunAngle + Math.PI;

        // Sun position and intensity
        const sunRadius = 300;
        this.sun.position.set(
            Math.cos(sunAngle) * sunRadius,
            Math.sin(sunAngle) * sunRadius,
            0
        );

        // Moon position
        this.moon.position.set(
            Math.cos(moonAngle) * sunRadius,
            Math.sin(moonAngle) * sunRadius,
            0
        );

        // Light intensities based on time of day
        const dayIntensity = Math.max(0, Math.sin(sunAngle));
        const nightIntensity = Math.max(0, Math.sin(moonAngle)) * 0.3;

        this.sunLight.intensity = dayIntensity;
        this.sunLight.position.copy(this.sun.position).normalize().multiplyScalar(100);

        this.moonLight.intensity = nightIntensity;
        this.moonLight.position.copy(this.moon.position).normalize().multiplyScalar(100);

        // Update ambient light
        const ambientIntensity = 0.2 + dayIntensity * 0.3;
        if (this.scene.children.find(child => child.type === 'AmbientLight')) {
            this.scene.children.find(child => child.type === 'AmbientLight').intensity = ambientIntensity;
        }
    }

    setWeather(type, intensity) {
        this.currentWeather = type;
        this.weatherIntensity = intensity;

        // Clear existing weather effects
        this.clearWeatherEffects();

        switch (type) {
            case 'rain':
                this.createRain(intensity);
                break;
            case 'snow':
                this.createSnow(intensity);
                break;
            case 'fog':
                this.createFog(intensity);
                break;
        }
    }

    createRain(intensity) {
        const rainCount = Math.floor(intensity * 1000);
        const rainGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(rainCount * 3);
        const velocities = new Float32Array(rainCount * 3);

        for (let i = 0; i < rainCount; i++) {
            const i3 = i * 3;
            positions[i3] = (Math.random() - 0.5) * 200;
            positions[i3 + 1] = 50 + Math.random() * 50;
            positions[i3 + 2] = (Math.random() - 0.5) * 200;

            velocities[i3] = 0;
            velocities[i3 + 1] = -20 - Math.random() * 10;
            velocities[i3 + 2] = 0;
        }

        rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        rainGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

        const rainMaterial = new THREE.PointsMaterial({
            color: 0x4488cc,
            size: 0.1,
            transparent: true,
            opacity: 0.6
        });

        this.weatherSystem.rain = new THREE.Points(rainGeometry, rainMaterial);
        this.scene.add(this.weatherSystem.rain);
    }

    createSnow(intensity) {
        const snowCount = Math.floor(intensity * 500);
        const snowGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(snowCount * 3);

        for (let i = 0; i < snowCount; i++) {
            const i3 = i * 3;
            positions[i3] = (Math.random() - 0.5) * 200;
            positions[i3 + 1] = 50 + Math.random() * 50;
            positions[i3 + 2] = (Math.random() - 0.5) * 200;
        }

        snowGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const snowMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.3,
            transparent: true,
            opacity: 0.8
        });

        this.weatherSystem.snow = new THREE.Points(snowGeometry, snowMaterial);
        this.scene.add(this.weatherSystem.snow);
    }

    createFog(intensity) {
        const fogColor = 0xcccccc;
        const fogNear = 50;
        const fogFar = 300 - (intensity * 200);

        this.scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);
    }

    clearWeatherEffects() {
        if (this.weatherSystem.rain) {
            this.scene.remove(this.weatherSystem.rain);
            this.weatherSystem.rain = null;
        }
        if (this.weatherSystem.snow) {
            this.scene.remove(this.weatherSystem.snow);
            this.weatherSystem.snow = null;
        }
        if (this.scene.fog && this.currentWeather === 'fog') {
            this.scene.fog = new THREE.Fog(0x87CEEB, 50, 500);
        }
    }

    setQuality(config) {
        // Adjust environmental effects based on quality settings
        this.clouds.forEach(cloud => {
            cloud.visible = config.particleCount > 0.5;
        });

        this.crowd.forEach(member => {
            member.visible = config.particleCount > 0.3;
        });

        this.animatedObjects.forEach(obj => {
            obj.visible = config.particleCount > 0.4;
        });
    }

    update(deltaTime) {
        // Animate clouds
        this.clouds.forEach(cloud => {
            cloud.position.x += Math.cos(cloud.userData.direction) * cloud.userData.speed * deltaTime;
            cloud.position.z += Math.sin(cloud.userData.direction) * cloud.userData.speed * deltaTime;

            // Wrap around world bounds
            if (Math.abs(cloud.position.x) > 400) cloud.position.x *= -1;
            if (Math.abs(cloud.position.z) > 400) cloud.position.z *= -1;
        });

        // Animate crowd (wave effect)
        this.crowd.forEach(member => {
            member.userData.wavePhase += member.userData.waveSpeed * deltaTime;
            member.position.y = member.userData.originalY + Math.sin(member.userData.wavePhase) * 0.3;
        });

        // Animate background objects
        this.animatedObjects.forEach(obj => {
            const speed = obj.userData.speed * deltaTime;
            obj.position.x += Math.cos(obj.userData.direction) * speed;
            obj.position.z += Math.sin(obj.userData.direction) * speed;

            // Birds have bobbing motion
            if (obj.userData.type === 'bird') {
                obj.userData.bobPhase += deltaTime * 5;
                obj.position.y += Math.sin(obj.userData.bobPhase) * 0.1;
            }

            // Wrap around world bounds
            if (Math.abs(obj.position.x) > 300) obj.position.x *= -1;
            if (Math.abs(obj.position.z) > 300) obj.position.z *= -1;
        });

        // Update weather effects
        if (this.weatherSystem.rain && this.weatherSystem.rain.geometry) {
            const positions = this.weatherSystem.rain.geometry.attributes.position.array;
            const velocities = this.weatherSystem.rain.geometry.attributes.velocity.array;

            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 1] += velocities[i + 1] * deltaTime;

                if (positions[i + 1] < 0) {
                    positions[i + 1] = 100;
                    positions[i] = (Math.random() - 0.5) * 200;
                    positions[i + 2] = (Math.random() - 0.5) * 200;
                }
            }

            this.weatherSystem.rain.geometry.attributes.position.needsUpdate = true;
        }

        if (this.weatherSystem.snow && this.weatherSystem.snow.geometry) {
            const positions = this.weatherSystem.snow.geometry.attributes.position.array;

            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 1] -= 5 * deltaTime;
                positions[i] += Math.sin(Date.now() * 0.001 + i) * 0.1;

                if (positions[i + 1] < 0) {
                    positions[i + 1] = 100;
                    positions[i] = (Math.random() - 0.5) * 200;
                    positions[i + 2] = (Math.random() - 0.5) * 200;
                }
            }

            this.weatherSystem.snow.geometry.attributes.position.needsUpdate = true;
        }
    }

    dispose() {
        this.clearWeatherEffects();

        this.clouds.forEach(cloud => this.scene.remove(cloud));
        this.crowd.forEach(member => this.scene.remove(member));
        this.animatedObjects.forEach(obj => this.scene.remove(obj));

        if (this.skybox) this.scene.remove(this.skybox);
        if (this.sun) this.scene.remove(this.sun);
        if (this.moon) this.scene.remove(this.moon);
        if (this.sunLight) this.scene.remove(this.sunLight);
        if (this.moonLight) this.scene.remove(this.moonLight);
    }
}

// Post-Processing Pipeline
class PostProcessingPipeline {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this.enabled = true;

        this.renderTarget = null;
        this.postProcessingMaterial = null;
        this.quadGeometry = null;
        this.quadMesh = null;
        this.postProcessingScene = null;
        this.postProcessingCamera = null;

        this.init();
    }

    init() {
        // Create render target
        this.renderTarget = new THREE.WebGLRenderTarget(
            window.innerWidth,
            window.innerHeight,
            {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBAFormat
            }
        );

        // Create post-processing material with all effects
        this.postProcessingMaterial = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: { value: this.renderTarget.texture },
                uTime: { value: 0 },
                uBloomStrength: { value: 0.8 },
                uMotionBlurStrength: { value: 0.5 },
                uVignette: { value: 0.3 },
                uContrast: { value: 1.1 },
                uSaturation: { value: 1.2 },
                uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float uTime;
                uniform float uBloomStrength;
                uniform float uMotionBlurStrength;
                uniform float uVignette;
                uniform float uContrast;
                uniform float uSaturation;
                uniform vec2 uResolution;
                varying vec2 vUv;

                // Bloom effect
                vec3 bloom(vec3 color, vec2 uv) {
                    vec3 bloom = vec3(0.0);
                    float samples = 9.0;
                    float radius = 0.004;

                    for(float i = 0.0; i < samples; i++) {
                        float angle = i * 6.28318 / samples;
                        vec2 offset = vec2(cos(angle), sin(angle)) * radius;
                        bloom += texture2D(tDiffuse, uv + offset).rgb;
                    }

                    bloom /= samples;
                    return mix(color, bloom, uBloomStrength * 0.3);
                }

                // Motion blur effect
                vec3 motionBlur(vec2 uv) {
                    vec3 color = vec3(0.0);
                    int samples = 8;
                    vec2 velocity = vec2(0.005, 0.0) * uMotionBlurStrength;

                    for(int i = 0; i < samples; i++) {
                        float t = float(i) / float(samples - 1);
                        color += texture2D(tDiffuse, uv + velocity * (t - 0.5)).rgb;
                    }

                    return color / float(samples);
                }

                // Vignette effect
                float vignette(vec2 uv) {
                    vec2 center = uv - 0.5;
                    return 1.0 - dot(center, center) * uVignette;
                }

                // Color grading
                vec3 colorGrade(vec3 color) {
                    // Contrast
                    color = (color - 0.5) * uContrast + 0.5;

                    // Saturation
                    float gray = dot(color, vec3(0.299, 0.587, 0.114));
                    color = mix(vec3(gray), color, uSaturation);

                    return color;
                }

                void main() {
                    vec2 uv = vUv;

                    // Get base color
                    vec3 color = texture2D(tDiffuse, uv).rgb;

                    // Apply motion blur
                    color = mix(color, motionBlur(uv), 0.3);

                    // Apply bloom
                    color = bloom(color, uv);

                    // Apply color grading
                    color = colorGrade(color);

                    // Apply vignette
                    color *= vignette(uv);

                    // Subtle film grain
                    float grain = (fract(sin(dot(uv * uTime, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.02;
                    color += grain;

                    gl_FragColor = vec4(color, 1.0);
                }
            `
        });

        // Create quad for post-processing
        this.quadGeometry = new THREE.PlaneGeometry(2, 2);
        this.quadMesh = new THREE.Mesh(this.quadGeometry, this.postProcessingMaterial);

        // Create post-processing scene
        this.postProcessingScene = new THREE.Scene();
        this.postProcessingScene.add(this.quadMesh);

        // Create orthographic camera for post-processing
        this.postProcessingCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    }

    setEnabled(enabled) {
        this.enabled = enabled;
    }

    update(deltaTime) {
        if (this.postProcessingMaterial) {
            this.postProcessingMaterial.uniforms.uTime.value += deltaTime;
        }
    }

    render() {
        if (!this.enabled) {
            this.renderer.render(this.scene, this.camera);
            return;
        }

        // Render scene to render target
        this.renderer.setRenderTarget(this.renderTarget);
        this.renderer.render(this.scene, this.camera);

        // Render post-processing
        this.renderer.setRenderTarget(null);
        this.renderer.render(this.postProcessingScene, this.postProcessingCamera);
    }

    dispose() {
        if (this.renderTarget) this.renderTarget.dispose();
        if (this.postProcessingMaterial) this.postProcessingMaterial.dispose();
        if (this.quadGeometry) this.quadGeometry.dispose();
    }
}

// Export for use in main game
window.VisualEffectsEngine = VisualEffectsEngine;