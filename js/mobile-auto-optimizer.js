/**
 * Mobile Auto-Optimization Module
 * Automatically applies mobile optimizations based on device capabilities
 */

class MobileAutoOptimizer {
  constructor() {
    this.isMobile = this.detectMobile();
    this.deviceTier = null;
    this.settings = {};
    this.init();
  }

  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  init() {
    if (!this.isMobile) {
      console.log('Desktop detected - using standard settings');
      return;
    }

    console.log('📱 Mobile device detected - applying optimizations...');
    
    this.detectDeviceTier();
    this.applyOptimizations();
    this.setupBatteryMonitoring();
    this.setupMemoryMonitoring();
    this.setupOrientationHandling();
  }

  detectDeviceTier() {
    const memory = navigator.deviceMemory || 4; // GB
    const cores = navigator.hardwareConcurrency || 4;
    const gpu = this.detectGPU();

    // Score device capabilities
    let score = 0;
    
    // Memory scoring
    if (memory >= 6) score += 30;
    else if (memory >= 4) score += 20;
    else if (memory >= 2) score += 10;
    
    // CPU scoring
    if (cores >= 8) score += 30;
    else if (cores >= 4) score += 20;
    else if (cores >= 2) score += 10;
    
    // GPU scoring
    if (gpu.includes('adreno 6') || gpu.includes('mali-g7') || gpu.includes('apple')) {
      score += 40;
    } else if (gpu.includes('adreno 5') || gpu.includes('mali-g5')) {
      score += 25;
    } else {
      score += 10;
    }

    // Determine tier
    if (score >= 70) this.deviceTier = 'high';
    else if (score >= 40) this.deviceTier = 'medium';
    else this.deviceTier = 'low';

    console.log(`Device tier: ${this.deviceTier} (score: ${score})`);
  }

  detectGPU() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'unknown';

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return 'unknown';

    return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
  }

  applyOptimizations() {
    const optimizations = this.getOptimizationsForTier(this.deviceTier);
    
    // Apply graphics settings
    if (window.performanceManager) {
      window.performanceManager.setQualityLevel(optimizations.quality);
    }

    // Store settings for game initialization
    this.settings = {
      ...optimizations,
      pixelRatio: Math.min(window.devicePixelRatio, optimizations.maxPixelRatio),
      shadows: optimizations.shadows,
      antialiasing: optimizations.antialiasing,
      particles: optimizations.particles,
      effects: optimizations.effects
    };

    // Apply viewport optimizations
    this.optimizeViewport();

    // Apply touch optimizations
    this.optimizeTouch();

    console.log('Applied optimizations:', this.settings);
  }

  getOptimizationsForTier(tier) {
    const tiers = {
      low: {
        quality: 'low',
        maxPixelRatio: 0.5,
        shadows: false,
        antialiasing: false,
        particles: 50,
        effects: 'minimal',
        targetFPS: 30,
        LODDistance: 20
      },
      medium: {
        quality: 'medium',
        maxPixelRatio: 0.75,
        shadows: 'basic',
        antialiasing: false,
        particles: 150,
        effects: 'reduced',
        targetFPS: 45,
        LODDistance: 40
      },
      high: {
        quality: 'high',
        maxPixelRatio: 1.0,
        shadows: true,
        antialiasing: true,
        particles: 300,
        effects: 'full',
        targetFPS: 60,
        LODDistance: 60
      }
    };

    return tiers[tier] || tiers.medium;
  }

  optimizeViewport() {
    // Set viewport meta tag for optimal scaling
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';

    // Prevent body scrolling
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    
    // Handle safe area insets for notched devices
    if (CSS.supports('padding-top: env(safe-area-inset-top)')) {
      document.body.style.paddingTop = 'env(safe-area-inset-top)';
      document.body.style.paddingBottom = 'env(safe-area-inset-bottom)';
      document.body.style.paddingLeft = 'env(safe-area-inset-left)';
      document.body.style.paddingRight = 'env(safe-area-inset-right)';
    }
  }

  optimizeTouch() {
    // Disable default touch behaviors
    document.addEventListener('touchstart', (e) => {
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
      }
    }, { passive: false });

    // Prevent double-tap zoom
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    }, false);

    // Optimize touch event handling
    const touchOptions = { passive: true };
    document.addEventListener('touchmove', (e) => {
      // Allow custom touch handling
    }, touchOptions);
  }

  setupBatteryMonitoring() {
    if (!navigator.getBattery) return;

    navigator.getBattery().then(battery => {
      const checkBattery = () => {
        if (battery.level < 0.15 && !battery.charging) {
          console.log('⚠️ Low battery - reducing performance');
          this.reducePowerConsumption();
        }
      };

      battery.addEventListener('levelchange', checkBattery);
      battery.addEventListener('chargingchange', checkBattery);
      checkBattery();
    });
  }

  setupMemoryMonitoring() {
    if (!performance.memory) return;

    setInterval(() => {
      const memoryUsage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
      
      if (memoryUsage > 0.9) {
        console.warn('⚠️ High memory usage - triggering cleanup');
        this.triggerMemoryCleanup();
      }
    }, 30000); // Check every 30 seconds
  }

  setupOrientationHandling() {
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.handleOrientationChange();
      }, 100);
    });
  }

  handleOrientationChange() {
    const isLandscape = window.innerWidth > window.innerHeight;
    console.log(`Orientation changed: ${isLandscape ? 'landscape' : 'portrait'}`);
    
    // Notify game of orientation change
    window.dispatchEvent(new CustomEvent('gameOrientationChange', {
      detail: { isLandscape }
    }));

    // Resize canvas if needed
    if (window.renderer) {
      window.renderer.setSize(window.innerWidth, window.innerHeight);
    }
  }

  reducePowerConsumption() {
    // Reduce quality tier
    const lowerTier = {
      high: 'medium',
      medium: 'low',
      low: 'low'
    };

    this.deviceTier = lowerTier[this.deviceTier];
    this.applyOptimizations();
    
    // Reduce target FPS
    if (window.performanceManager) {
      window.performanceManager.targetFPS = Math.max(
        window.performanceManager.targetFPS - 15,
        30
      );
    }
  }

  triggerMemoryCleanup() {
    // Notify game to clean up unused resources
    window.dispatchEvent(new Event('gameMemoryCleanup'));
    
    // Clear caches if available
    if (window.assetLoader) {
      window.assetLoader.clearCache();
    }

    if (window.objectPool) {
      window.objectPool.cleanup();
    }
  }

  getSettings() {
    return this.settings;
  }

  // Haptic feedback helper
  vibrate(pattern) {
    if (navigator.vibrate && this.isMobile) {
      navigator.vibrate(pattern);
    }
  }

  // Performance hint helper
  getPerformanceHint() {
    return {
      tier: this.deviceTier,
      recommendedSettings: this.settings,
      isMobile: this.isMobile,
      supportsWebGL2: !!document.createElement('canvas').getContext('webgl2'),
      preferredPixelRatio: this.settings.pixelRatio
    };
  }
}

// Auto-initialize if mobile
if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
  window.mobileOptimizer = new MobileAutoOptimizer();
  console.log('✅ Mobile Auto-Optimizer initialized');
}

// Export for manual initialization
window.MobileAutoOptimizer = MobileAutoOptimizer;
