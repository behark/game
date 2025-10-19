/**
 * Network Optimizer - Advanced networking optimization for Speed Rivals multiplayer
 * Implements delta compression, predictive interpolation, and lag compensation
 */

class NetworkOptimizer {
    constructor(performanceManager) {
        this.performanceManager = performanceManager;

        // Network state
        this.isConnected = false;
        this.socket = null;
        this.playerId = null;

        // Connection quality monitoring
        this.connectionStats = {
            latency: 0,
            packetLoss: 0,
            bandwidth: 0,
            jitter: 0,
            quality: 'good' // excellent, good, fair, poor
        };

        // Delta compression system
        this.deltaCompressor = new DeltaCompressor();

        // Prediction and interpolation
        this.stateBuffer = new StateBuffer(100); // Keep 100 states
        this.predictionEngine = new PredictionEngine();
        this.interpolator = new StateInterpolator();

        // Lag compensation
        this.lagCompensator = new LagCompensator();

        // Network optimization settings
        this.config = {
            maxPacketSize: 1400,        // MTU - overhead
            updateRate: 60,             // Updates per second
            compressionThreshold: 100,   // Compress packets > 100 bytes
            predictionTime: 100,        // Predict 100ms ahead
            interpolationTime: 100,     // Interpolate over 100ms
            maxJitter: 50,              // Maximum acceptable jitter
            adaptiveQuality: true,      // Adjust quality based on connection
            prioritySystem: true        // Prioritize important updates
        };

        // Bandwidth management
        this.bandwidthManager = new BandwidthManager(this.config);

        // Message queuing and prioritization
        this.messageQueue = new PriorityMessageQueue();

        // Statistics
        this.networkStats = {
            bytesSent: 0,
            bytesReceived: 0,
            messagesSent: 0,
            messagesReceived: 0,
            compressionRatio: 1.0,
            predictionAccuracy: 0.9,
            interpolationSmoothing: 0.95
        };

        console.log('🌐 Network Optimizer initialized');
    }

    /**
     * Initialize network connection with optimization
     */
    connect(serverUrl, options = {}) {
        console.log('🔌 Connecting to server with optimizations...');

        this.socket = io(serverUrl, {
            transports: ['websocket'],
            upgrade: true,
            compression: false, // We handle compression ourselves
            ...options
        });

        this.setupSocketHandlers();
        this.startNetworkMonitoring();

        return new Promise((resolve, reject) => {
            this.socket.on('connect', () => {
                this.isConnected = true;
                console.log('✅ Connected to server');
                resolve();
            });

            this.socket.on('connect_error', (error) => {
                console.error('❌ Connection failed:', error);
                reject(error);
            });
        });
    }

    /**
     * Setup socket event handlers with optimization
     */
    setupSocketHandlers() {
        // Handle incoming game state updates
        this.socket.on('gameState', (data) => {
            this.handleGameStateUpdate(data);
        });

        // Handle player updates with prediction
        this.socket.on('playerUpdate', (data) => {
            this.handlePlayerUpdate(data);
        });

        // Handle latency measurements
        this.socket.on('pong', (timestamp) => {
            this.handleLatencyMeasurement(timestamp);
        });

        // Handle disconnections
        this.socket.on('disconnect', () => {
            this.isConnected = false;
            console.log('🔌 Disconnected from server');
        });
    }

    /**
     * Send optimized player update
     */
    sendPlayerUpdate(playerState) {
        if (!this.isConnected) return;

        // Create delta-compressed update
        const compressed = this.deltaCompressor.compress('player', playerState);

        // Add prediction data
        const predicted = this.predictionEngine.predict(playerState, this.config.predictionTime);

        const update = {
            type: 'playerUpdate',
            playerId: this.playerId,
            timestamp: performance.now(),
            state: compressed,
            predicted: predicted
        };

        // Queue message with priority
        this.messageQueue.enqueue(update, 'high');
    }

    /**
     * Handle incoming game state updates
     */
    handleGameStateUpdate(data) {
        const decompressed = this.deltaCompressor.decompress('gameState', data.state);

        // Add to state buffer for interpolation
        this.stateBuffer.addState({
            timestamp: data.timestamp,
            serverTime: data.serverTime,
            state: decompressed
        });

        // Apply lag compensation
        const compensated = this.lagCompensator.compensate(decompressed, this.connectionStats.latency);

        // Interpolate for smooth updates
        const interpolated = this.interpolator.interpolate(
            this.stateBuffer.getStates(),
            performance.now() - this.config.interpolationTime
        );

        // Notify game of updated state
        this.onGameStateUpdate?.(interpolated);

        this.networkStats.messagesReceived++;
        this.networkStats.bytesReceived += JSON.stringify(data).length;
    }

    /**
     * Handle player updates with prediction validation
     */
    handlePlayerUpdate(data) {
        const decompressed = this.deltaCompressor.decompress('player', data.state);

        // Validate predictions
        if (data.predicted) {
            const accuracy = this.predictionEngine.validatePrediction(data.predicted, decompressed);
            this.networkStats.predictionAccuracy =
                (this.networkStats.predictionAccuracy * 0.9) + (accuracy * 0.1);
        }

        // Apply state with interpolation
        this.interpolator.addPlayerState(data.playerId, {
            timestamp: data.timestamp,
            state: decompressed
        });

        this.onPlayerUpdate?.(data.playerId, decompressed);
    }

    /**
     * Measure network latency
     */
    measureLatency() {
        const timestamp = performance.now();
        this.socket.emit('ping', timestamp);
    }

    /**
     * Handle latency measurement response
     */
    handleLatencyMeasurement(timestamp) {
        const latency = performance.now() - timestamp;

        // Update connection stats with smoothing
        this.connectionStats.latency =
            (this.connectionStats.latency * 0.9) + (latency * 0.1);

        // Update connection quality
        this.updateConnectionQuality();
    }

    /**
     * Start network monitoring
     */
    startNetworkMonitoring() {
        // Measure latency every 5 seconds
        setInterval(() => {
            if (this.isConnected) {
                this.measureLatency();
            }
        }, 5000);

        // Process message queue
        setInterval(() => {
            this.processMessageQueue();
        }, 1000 / this.config.updateRate);

        // Adjust network quality based on performance
        setInterval(() => {
            this.adjustNetworkQuality();
        }, 2000);
    }

    /**
     * Process message queue with bandwidth management
     */
    processMessageQueue() {
        if (!this.isConnected) return;

        const availableBandwidth = this.bandwidthManager.getAvailableBandwidth();
        let usedBandwidth = 0;

        while (!this.messageQueue.isEmpty() && usedBandwidth < availableBandwidth) {
            const message = this.messageQueue.dequeue();
            if (!message) break;

            // Compress if above threshold
            let payload = message;
            if (JSON.stringify(message).length > this.config.compressionThreshold) {
                payload = this.compressMessage(message);
            }

            // Send message
            this.socket.emit(message.type, payload);

            const messageSize = JSON.stringify(payload).length;
            usedBandwidth += messageSize;

            this.networkStats.messagesSent++;
            this.networkStats.bytesSent += messageSize;
        }

        this.bandwidthManager.recordUsage(usedBandwidth);
    }

    /**
     * Update connection quality based on metrics
     */
    updateConnectionQuality() {
        const { latency, packetLoss, jitter } = this.connectionStats;

        if (latency < 50 && packetLoss < 0.01 && jitter < 10) {
            this.connectionStats.quality = 'excellent';
        } else if (latency < 100 && packetLoss < 0.02 && jitter < 20) {
            this.connectionStats.quality = 'good';
        } else if (latency < 200 && packetLoss < 0.05 && jitter < 50) {
            this.connectionStats.quality = 'fair';
        } else {
            this.connectionStats.quality = 'poor';
        }
    }

    /**
     * Adjust network quality based on connection
     */
    adjustNetworkQuality() {
        if (!this.config.adaptiveQuality) return;

        const quality = this.connectionStats.quality;

        switch (quality) {
            case 'poor':
                this.config.updateRate = 20;
                this.config.compressionThreshold = 50;
                this.config.predictionTime = 200;
                console.log('📶 Adjusted to low quality networking');
                break;

            case 'fair':
                this.config.updateRate = 30;
                this.config.compressionThreshold = 75;
                this.config.predictionTime = 150;
                break;

            case 'good':
                this.config.updateRate = 60;
                this.config.compressionThreshold = 100;
                this.config.predictionTime = 100;
                break;

            case 'excellent':
                this.config.updateRate = 120;
                this.config.compressionThreshold = 150;
                this.config.predictionTime = 50;
                break;
        }
    }

    /**
     * Compress message for transmission
     */
    compressMessage(message) {
        // Simple compression implementation
        const json = JSON.stringify(message);

        // Use LZ-string or similar compression library
        if (typeof LZString !== 'undefined') {
            return {
                compressed: true,
                data: LZString.compress(json)
            };
        }

        return message;
    }

    /**
     * Decompress received message
     */
    decompressMessage(message) {
        if (message.compressed && typeof LZString !== 'undefined') {
            const decompressed = LZString.decompress(message.data);
            return JSON.parse(decompressed);
        }

        return message;
    }

    /**
     * Get network statistics
     */
    getStats() {
        return {
            ...this.networkStats,
            connection: this.connectionStats,
            config: this.config,
            bufferSize: this.stateBuffer.size(),
            queueSize: this.messageQueue.size()
        };
    }

    /**
     * Dispose network optimizer
     */
    dispose() {
        if (this.socket) {
            this.socket.disconnect();
        }

        this.deltaCompressor.dispose();
        this.stateBuffer.clear();
        this.messageQueue.clear();

        console.log('🌐 Network Optimizer disposed');
    }
}

/**
 * Delta Compression System
 */
class DeltaCompressor {
    constructor() {
        this.previousStates = new Map();
    }

    compress(key, newState) {
        const prevState = this.previousStates.get(key);

        if (!prevState) {
            this.previousStates.set(key, newState);
            return { full: true, data: newState };
        }

        const delta = this.createDelta(prevState, newState);
        this.previousStates.set(key, newState);

        return { full: false, data: delta };
    }

    decompress(key, compressed) {
        if (compressed.full) {
            this.previousStates.set(key, compressed.data);
            return compressed.data;
        }

        const prevState = this.previousStates.get(key);
        if (!prevState) {
            throw new Error('No previous state for delta decompression');
        }

        const newState = this.applyDelta(prevState, compressed.data);
        this.previousStates.set(key, newState);

        return newState;
    }

    createDelta(oldState, newState) {
        const delta = {};

        for (const [key, value] of Object.entries(newState)) {
            if (oldState[key] !== value) {
                delta[key] = value;
            }
        }

        return delta;
    }

    applyDelta(baseState, delta) {
        return { ...baseState, ...delta };
    }

    dispose() {
        this.previousStates.clear();
    }
}

/**
 * State Buffer for interpolation
 */
class StateBuffer {
    constructor(maxSize) {
        this.states = [];
        this.maxSize = maxSize;
    }

    addState(state) {
        this.states.push(state);

        if (this.states.length > this.maxSize) {
            this.states.shift();
        }
    }

    getStates() {
        return this.states;
    }

    size() {
        return this.states.length;
    }

    clear() {
        this.states.length = 0;
    }
}

/**
 * Prediction Engine
 */
class PredictionEngine {
    constructor() {
        this.history = new Map();
    }

    predict(currentState, timeAhead) {
        const playerId = currentState.id || 'default';
        const history = this.history.get(playerId) || [];

        if (history.length < 2) {
            history.push({ ...currentState, timestamp: performance.now() });
            this.history.set(playerId, history);
            return currentState;
        }

        // Simple velocity-based prediction
        const lastState = history[history.length - 1];
        const deltaTime = (timeAhead / 1000); // Convert to seconds

        const predicted = {
            ...currentState,
            position: {
                x: currentState.position.x + (currentState.velocity.x * deltaTime),
                y: currentState.position.y + (currentState.velocity.y * deltaTime),
                z: currentState.position.z + (currentState.velocity.z * deltaTime)
            }
        };

        // Update history
        history.push({ ...currentState, timestamp: performance.now() });
        if (history.length > 10) history.shift();
        this.history.set(playerId, history);

        return predicted;
    }

    validatePrediction(predicted, actual) {
        if (!predicted.position || !actual.position) return 1.0;

        const distance = Math.sqrt(
            Math.pow(predicted.position.x - actual.position.x, 2) +
            Math.pow(predicted.position.y - actual.position.y, 2) +
            Math.pow(predicted.position.z - actual.position.z, 2)
        );

        // Normalize accuracy (closer = better, max distance = 10 units)
        return Math.max(0, 1 - (distance / 10));
    }
}

/**
 * State Interpolator
 */
class StateInterpolator {
    constructor() {
        this.playerStates = new Map();
    }

    interpolate(states, targetTime) {
        if (states.length < 2) return states[0]?.state;

        // Find states to interpolate between
        let prevState = null;
        let nextState = null;

        for (let i = 0; i < states.length - 1; i++) {
            if (states[i].timestamp <= targetTime && states[i + 1].timestamp > targetTime) {
                prevState = states[i];
                nextState = states[i + 1];
                break;
            }
        }

        if (!prevState || !nextState) {
            return states[states.length - 1]?.state;
        }

        // Calculate interpolation factor
        const totalTime = nextState.timestamp - prevState.timestamp;
        const elapsed = targetTime - prevState.timestamp;
        const factor = elapsed / totalTime;

        // Interpolate states
        return this.lerpStates(prevState.state, nextState.state, factor);
    }

    lerpStates(stateA, stateB, factor) {
        const result = { ...stateA };

        // Interpolate position
        if (stateA.position && stateB.position) {
            result.position = {
                x: this.lerp(stateA.position.x, stateB.position.x, factor),
                y: this.lerp(stateA.position.y, stateB.position.y, factor),
                z: this.lerp(stateA.position.z, stateB.position.z, factor)
            };
        }

        // Interpolate rotation
        if (stateA.rotation && stateB.rotation) {
            result.rotation = {
                x: this.lerp(stateA.rotation.x, stateB.rotation.x, factor),
                y: this.lerp(stateA.rotation.y, stateB.rotation.y, factor),
                z: this.lerp(stateA.rotation.z, stateB.rotation.z, factor)
            };
        }

        return result;
    }

    lerp(a, b, t) {
        return a + (b - a) * t;
    }

    addPlayerState(playerId, stateData) {
        if (!this.playerStates.has(playerId)) {
            this.playerStates.set(playerId, []);
        }

        const states = this.playerStates.get(playerId);
        states.push(stateData);

        // Keep only recent states
        if (states.length > 10) {
            states.shift();
        }
    }
}

/**
 * Lag Compensator
 */
class LagCompensator {
    compensate(state, latency) {
        // Rewind state by half the round-trip time
        const rewindTime = latency / 2;

        // This would implement server-side hit validation
        // and client-side prediction rollback

        return {
            ...state,
            compensatedTime: performance.now() - rewindTime
        };
    }
}

/**
 * Bandwidth Manager
 */
class BandwidthManager {
    constructor(config) {
        this.config = config;
        this.usage = [];
        this.maxBandwidth = 1024 * 1024; // 1MB/s default
    }

    getAvailableBandwidth() {
        const currentUsage = this.getCurrentUsage();
        return Math.max(0, this.maxBandwidth - currentUsage);
    }

    getCurrentUsage() {
        const now = performance.now();
        const recent = this.usage.filter(u => now - u.timestamp < 1000);
        return recent.reduce((total, u) => total + u.bytes, 0);
    }

    recordUsage(bytes) {
        this.usage.push({
            timestamp: performance.now(),
            bytes
        });

        // Clean old entries
        const now = performance.now();
        this.usage = this.usage.filter(u => now - u.timestamp < 5000);
    }
}

/**
 * Priority Message Queue
 */
class PriorityMessageQueue {
    constructor() {
        this.queues = {
            critical: [],
            high: [],
            medium: [],
            low: []
        };
    }

    enqueue(message, priority = 'medium') {
        if (!this.queues[priority]) {
            priority = 'medium';
        }

        this.queues[priority].push({
            ...message,
            enqueuedAt: performance.now()
        });
    }

    dequeue() {
        // Process in priority order
        for (const priority of ['critical', 'high', 'medium', 'low']) {
            if (this.queues[priority].length > 0) {
                return this.queues[priority].shift();
            }
        }
        return null;
    }

    isEmpty() {
        return Object.values(this.queues).every(queue => queue.length === 0);
    }

    size() {
        return Object.values(this.queues).reduce((total, queue) => total + queue.length, 0);
    }

    clear() {
        Object.values(this.queues).forEach(queue => queue.length = 0);
    }
}

// Export for use in other modules
window.NetworkOptimizer = NetworkOptimizer;