/**
 * ParticleSystem.js - Particle effects system for power-ups
 * Handles creation and management of visual particle effects
 */

class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.activeEffects = [];
        this.textureCache = new Map();

        // Initialize default textures
        this.initializeTextures();
    }

    /**
     * Initialize common particle textures
     */
    initializeTextures() {
        this.textureCache.set('spark', this.createSparkTexture());
        this.textureCache.set('star', this.createStarTexture());
        this.textureCache.set('circle', this.createCircleTexture());
        this.textureCache.set('diamond', this.createDiamondTexture());
    }

    /**
     * Create spark texture
     */
    createSparkTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');

        // Create bright center with rays
        const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.3, 'rgba(255, 200, 100, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 32, 32);

        return new THREE.CanvasTexture(canvas);
    }

    /**
     * Create star texture
     */
    createStarTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'white';
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'yellow';

        // Draw 5-pointed star
        this.drawStar(ctx, 16, 16, 5, 12, 5);

        return new THREE.CanvasTexture(canvas);
    }

    /**
     * Create circle texture
     */
    createCircleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 32, 32);

        return new THREE.CanvasTexture(canvas);
    }

    /**
     * Create diamond texture
     */
    createDiamondTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.moveTo(16, 4);
        ctx.lineTo(28, 16);
        ctx.lineTo(16, 28);
        ctx.lineTo(4, 16);
        ctx.closePath();
        ctx.fill();

        return new THREE.CanvasTexture(canvas);
    }

    /**
     * Draw star shape on canvas
     */
    drawStar(ctx, x, y, spikes, outerRadius, innerRadius) {
        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
            const starX = x + Math.cos(angle) * radius;
            const starY = y + Math.sin(angle) * radius;

            if (i === 0) {
                ctx.moveTo(starX, starY);
            } else {
                ctx.lineTo(starX, starY);
            }
        }
        ctx.closePath();
        ctx.fill();
    }

    /**
     * Create particle effect
     */
    createEffect(position, type, options = {}) {
        const defaultOptions = {
            count: 50,
            color: 0xffffff,
            size: 0.2,
            life: 2000,
            velocity: { x: 0, y: 1, z: 0 },
            spread: 1,
            texture: 'circle',
            gravity: -0.001,
            fadeIn: 200,
            fadeOut: 500
        };

        const config = { ...defaultOptions, ...options };

        switch (type) {
            case 'explosion':
                return this.createExplosionEffect(position, config);
            case 'burst':
                return this.createBurstEffect(position, config);
            case 'star_burst':
                return this.createStarBurstEffect(position, config);
            case 'collection':
                return this.createCollectionEffect(position, config.powerUpType || 'default');
            case 'sparkle':
                return this.createSparkleEffect(position, config);
            case 'ripple':
                return this.createRippleEffect(position, config);
            case 'deflection':
                return this.createDeflectionEffect(position, config);
            default:
                return this.createGenericEffect(position, config);
        }
    }

    /**
     * Create explosion effect
     */
    createExplosionEffect(position, config) {
        const particles = this.createParticleSystem(config.count, config);

        const positions = particles.geometry.attributes.position.array;
        const velocities = new Float32Array(config.count * 3);

        for (let i = 0; i < config.count; i++) {
            // Start at explosion center
            positions[i * 3] = position.x;
            positions[i * 3 + 1] = position.y;
            positions[i * 3 + 2] = position.z;

            // Random spherical velocity
            const phi = Math.random() * Math.PI * 2;
            const theta = Math.random() * Math.PI;
            const speed = 0.1 + Math.random() * 0.2;

            velocities[i * 3] = Math.sin(theta) * Math.cos(phi) * speed;
            velocities[i * 3 + 1] = Math.cos(theta) * speed;
            velocities[i * 3 + 2] = Math.sin(theta) * Math.sin(phi) * speed;
        }

        particles.userData = {
            velocities: velocities,
            life: config.life,
            gravity: config.gravity,
            startTime: Date.now()
        };

        this.scene.add(particles);
        this.activeEffects.push(particles);

        return particles;
    }

    /**
     * Create burst effect (upward explosion)
     */
    createBurstEffect(position, config) {
        const particles = this.createParticleSystem(config.count, config);

        const positions = particles.geometry.attributes.position.array;
        const velocities = new Float32Array(config.count * 3);

        for (let i = 0; i < config.count; i++) {
            positions[i * 3] = position.x + (Math.random() - 0.5) * 0.5;
            positions[i * 3 + 1] = position.y;
            positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.5;

            // Mostly upward velocity with some spread
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.05 + Math.random() * 0.1;
            const upwardBias = 0.7 + Math.random() * 0.3;

            velocities[i * 3] = Math.cos(angle) * speed * config.spread;
            velocities[i * 3 + 1] = speed * upwardBias;
            velocities[i * 3 + 2] = Math.sin(angle) * speed * config.spread;
        }

        particles.userData = {
            velocities: velocities,
            life: config.life,
            gravity: config.gravity,
            startTime: Date.now()
        };

        this.scene.add(particles);
        this.activeEffects.push(particles);

        return particles;
    }

    /**
     * Create star burst effect
     */
    createStarBurstEffect(position, config) {
        config.texture = 'star';
        config.count = Math.min(config.count, 100);

        const particles = this.createBurstEffect(position, config);

        // Add sparkle animation
        particles.userData.sparkle = true;

        return particles;
    }

    /**
     * Create collection effect for power-ups
     */
    createCollectionEffect(position, powerUpType) {
        const colors = {
            'nitro': 0x0088ff,
            'shield': 0x00aaff,
            'emp': 0xffff00,
            'missile': 0xff4400,
            'star': 0xffd700,
            'rewind': 0xaa44ff,
            'smoke': 0x666666
        };

        const config = {
            count: 30,
            color: colors[powerUpType] || 0xffffff,
            size: 0.3,
            life: 1500,
            velocity: { x: 0, y: 2, z: 0 },
            spread: 2,
            texture: powerUpType === 'star' ? 'star' : 'circle'
        };

        return this.createBurstEffect(position, config);
    }

    /**
     * Create sparkle effect
     */
    createSparkleEffect(position, config) {
        config.texture = 'star';
        config.count = Math.min(config.count || 20, 30);

        const particles = this.createParticleSystem(config.count, config);
        const positions = particles.geometry.attributes.position.array;
        const velocities = new Float32Array(config.count * 3);

        for (let i = 0; i < config.count; i++) {
            // Random position around center
            positions[i * 3] = position.x + (Math.random() - 0.5) * 2;
            positions[i * 3 + 1] = position.y + (Math.random() - 0.5) * 2;
            positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 2;

            // Slow drifting velocity
            velocities[i * 3] = (Math.random() - 0.5) * 0.02;
            velocities[i * 3 + 1] = 0.01 + Math.random() * 0.02;
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
        }

        particles.userData = {
            velocities: velocities,
            life: config.life,
            startTime: Date.now(),
            sparkle: true
        };

        this.scene.add(particles);
        this.activeEffects.push(particles);

        return particles;
    }

    /**
     * Create ripple effect
     */
    createRippleEffect(position, config) {
        const ringGeometry = new THREE.RingGeometry(0.1, 0.5, 16);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: config.color || 0xffffff,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });

        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.copy(position);
        ring.rotation.x = -Math.PI / 2;

        ring.userData = {
            startTime: Date.now(),
            life: config.life || 1000,
            maxScale: config.spread || 5
        };

        this.scene.add(ring);
        this.activeEffects.push(ring);

        return ring;
    }

    /**
     * Create deflection effect
     */
    createDeflectionEffect(position, config) {
        // Create multiple rings expanding outward
        const effects = [];

        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const ring = this.createRippleEffect(position, {
                    ...config,
                    life: 800,
                    spread: 3 + i
                });
                effects.push(ring);
            }, i * 100);
        }

        return effects;
    }

    /**
     * Create generic particle effect
     */
    createGenericEffect(position, config) {
        return this.createBurstEffect(position, config);
    }

    /**
     * Create particle system with specified configuration
     */
    createParticleSystem(count, config) {
        const geometry = new THREE.BufferGeometry();
        const material = new THREE.PointsMaterial({
            color: config.color,
            size: config.size,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending,
            map: this.textureCache.get(config.texture) || this.textureCache.get('circle')
        });

        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);

        // Initialize with default values
        for (let i = 0; i < count; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;

            const color = new THREE.Color(config.color);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;

            sizes[i] = config.size * (0.5 + Math.random() * 0.5);
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const particles = new THREE.Points(geometry, material);
        return particles;
    }

    /**
     * Update all active effects
     */
    update(deltaTime) {
        for (let i = this.activeEffects.length - 1; i >= 0; i--) {
            const effect = this.activeEffects[i];
            const userData = effect.userData;

            if (!userData || !userData.startTime) {
                continue;
            }

            const elapsed = Date.now() - userData.startTime;
            const progress = elapsed / userData.life;

            if (progress >= 1) {
                // Effect has expired
                this.scene.remove(effect);
                this.activeEffects.splice(i, 1);
                continue;
            }

            this.updateEffect(effect, progress, deltaTime);
        }
    }

    /**
     * Update individual effect
     */
    updateEffect(effect, progress, deltaTime) {
        const userData = effect.userData;

        if (effect.isPoints) {
            // Update particle system
            this.updateParticleEffect(effect, progress, deltaTime);
        } else if (effect.isMesh) {
            // Update mesh effect (like ripples)
            this.updateMeshEffect(effect, progress, deltaTime);
        }
    }

    /**
     * Update particle effect
     */
    updateParticleEffect(effect, progress, deltaTime) {
        const userData = effect.userData;
        const positions = effect.geometry.attributes.position.array;
        const velocities = userData.velocities;

        if (velocities) {
            for (let i = 0; i < positions.length; i += 3) {
                // Update positions
                positions[i] += velocities[i];
                positions[i + 1] += velocities[i + 1];
                positions[i + 2] += velocities[i + 2];

                // Apply gravity
                if (userData.gravity) {
                    velocities[i + 1] += userData.gravity;
                }

                // Add air resistance
                velocities[i] *= 0.99;
                velocities[i + 1] *= 0.99;
                velocities[i + 2] *= 0.99;
            }

            effect.geometry.attributes.position.needsUpdate = true;
        }

        // Update opacity
        effect.material.opacity = 1 - progress;

        // Sparkle effect
        if (userData.sparkle) {
            const sparkleIntensity = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
            effect.material.opacity *= sparkleIntensity;
        }
    }

    /**
     * Update mesh effect (ripples, etc.)
     */
    updateMeshEffect(effect, progress, deltaTime) {
        const userData = effect.userData;

        // Scale expansion
        if (userData.maxScale) {
            const scale = 1 + progress * (userData.maxScale - 1);
            effect.scale.setScalar(scale);
        }

        // Opacity fade
        effect.material.opacity = 1 - progress;
    }

    /**
     * Clear all effects
     */
    clearAll() {
        this.activeEffects.forEach(effect => {
            this.scene.remove(effect);
        });
        this.activeEffects = [];
    }

    /**
     * Dispose of the particle system
     */
    dispose() {
        this.clearAll();

        // Dispose of cached textures
        for (const texture of this.textureCache.values()) {
            texture.dispose();
        }
        this.textureCache.clear();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ParticleSystem;
}