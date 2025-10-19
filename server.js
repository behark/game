require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const { logger, requestLogger } = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payments');
const storeRoutes = require('./routes/store');
const tournamentRoutes = require('./routes/tournaments');
const analyticsRoutes = require('./routes/analytics');

// Import models
const User = require('./models/User');
const Payment = require('./models/Payment');
const Tournament = require('./models/Tournament');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? process.env.BASE_URL_PROD : "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Track MongoDB connection status
let isMongoDBConnected = false;
global.isMongoDBConnected = false;

// Database connection (optional - game works without it)
const connectDB = async () => {
  try {
    const dbURI = process.env.NODE_ENV === 'production' ? process.env.MONGODB_URI_PROD : process.env.MONGODB_URI;
    await mongoose.connect(dbURI || 'mongodb://localhost:27017/speed-rivals', {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      connectTimeoutMS: 5000
    });
    isMongoDBConnected = true;
    global.isMongoDBConnected = true;
  } catch (error) {
    console.log('⚠️  MongoDB not available - running without database');
    console.log('💡 Core game features work without MongoDB');
    console.log('💡 Monetization features require MongoDB connection');
    isMongoDBConnected = false;
  }
};

// Attempt to connect
connectDB();

mongoose.connection.on('connected', async () => {
  isMongoDBConnected = true;
  global.isMongoDBConnected = true;
  logger.info('Connected to MongoDB');
  
  // Check if database needs initialization
  try {
    const productCount = await require('./models/Product').countDocuments();
    const tournamentCount = await require('./models/Tournament').countDocuments();
    
    if (productCount === 0 || tournamentCount === 0) {
      logger.warn('Database appears empty');
      console.log('💡 Run "npm run init-data" to seed the database with default products and tournaments.');
    } else {
      logger.info(`Database initialized: ${productCount} products, ${tournamentCount} tournaments`);
    }
  } catch (error) {
    logger.warn('Could not check database status', { error: error.message });
  }
});

mongoose.connection.on('error', (err) => {
  isMongoDBConnected = false;
  global.isMongoDBConnected = false;
  logger.error('MongoDB connection error', { error: err.message });
});

mongoose.connection.on('disconnected', () => {
  isMongoDBConnected = false;
  global.isMongoDBConnected = false;
  logger.warn('MongoDB disconnected');
});

// Trust proxy configuration - only trust loopback for development
// In production, configure this based on your proxy setup
app.set('trust proxy', 'loopback');

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "*.stripe.com", "js.stripe.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "*.stripe.com"],
      connectSrc: ["'self'", "*.stripe.com", "api.stripe.com", "*.v.network"],
      frameSrc: ["'self'", "*.stripe.com", "js.stripe.com"]
    }
  }
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? [process.env.BASE_URL_PROD] : true,
  credentials: true
}));

// Rate limiting with proper validation
const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later'
  },
  // Validate trust proxy setting
  validate: {
    trustProxy: false, // Disable strict validation for development
    xForwardedForHeader: false
  }
});
app.use('/api', generalRateLimit);

// Store connected players and game data
const players = new Map();
const rooms = new Map();
const pushSubscriptions = new Map();
const raceResults = [];
const playerProgress = new Map();

// Serve static files
app.use(express.static(path.join(__dirname)));

// Serve Three.js from libs directory (browser-compatible version)
app.get('/libs/three.min.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, 'libs/three.min.js'));
});

// Serve Cannon.js from libs directory (browser-compatible version)
app.get('/libs/cannon.min.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, 'libs/cannon.min.js'));
});

// Main route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Test route
app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, 'test.html'));
});

// Simple game route (2D version that definitely works)
app.get('/simple', (req, res) => {
    res.sendFile(path.join(__dirname, 'game-simple.html'));
});

// Fixed 3D game route
app.get('/3d', (req, res) => {
    res.sendFile(path.join(__dirname, 'index-fixed.html'));
});

// Working 3D game route
app.get('/3d-working', (req, res) => {
    res.sendFile(path.join(__dirname, 'index-3d-working.html'));
});

// Multiplayer 3D racing route
app.get('/multiplayer', (req, res) => {
    res.sendFile(path.join(__dirname, 'multiplayer-3d.html'));
});

// Multiplayer 3D racing with power-ups route
app.get('/multiplayer-powerups', (req, res) => {
    res.sendFile(path.join(__dirname, 'multiplayer-3d-powerups.html'));
});

// Game hub route
app.get('/hub', (req, res) => {
    res.sendFile(path.join(__dirname, 'game-hub.html'));
});

// Monetization dashboard route
app.get('/monetization', (req, res) => {
    res.sendFile(path.join(__dirname, 'monetization-dashboard.html'));
});

app.get('/monetization-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'monetization-dashboard.html'));
});

// Mobile racing route
app.get('/mobile', (req, res) => {
    res.sendFile(path.join(__dirname, 'mobile-racing.html'));
});

app.get('/mobile-racing', (req, res) => {
    res.sendFile(path.join(__dirname, 'mobile-racing.html'));
});

// Mobile demo route
app.get('/mobile-demo', (req, res) => {
    res.sendFile(path.join(__dirname, 'mobile-demo.html'));
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      server: 'healthy',
      database: isMongoDBConnected ? 'healthy' : 'not-required',
      socketio: 'healthy'
    },
    features: {
      coreGame: 'available',
      multiplayer: 'available',
      monetization: isMongoDBConnected ? 'available' : 'unavailable'
    }
  };

  try {
    // Check database connection if it should be connected
    if (isMongoDBConnected && mongoose.connection.readyState === 1) {
      await mongoose.connection.db.admin().ping();
      health.services.database = 'healthy';
    } else if (isMongoDBConnected) {
      health.services.database = 'unhealthy';
      health.status = 'degraded';
    }
  } catch (error) {
    health.services.database = 'unhealthy';
    health.status = 'degraded';
    logger.error('Health check database error', { error: error.message });
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Request logging middleware
app.use(requestLogger);

// PWA Manifest
app.get('/manifest.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'manifest.json'));
});

// Service Worker
app.get('/sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, 'sw.js'));
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/analytics', analyticsRoutes);

// PWA API Endpoints
app.post('/api/push-subscription', (req, res) => {
    const subscription = req.body;
    console.log('📱 Push subscription received:', subscription);

    // Store subscription in memory (in production, use a database)
    pushSubscriptions.set(subscription.endpoint, subscription);

    res.status(200).json({ success: true });
});

app.post('/api/races', (req, res) => {
    const raceData = req.body;
    console.log('🏁 Race data received:', raceData);

    // Store race data (in production, use a database)
    raceResults.push({
        ...raceData,
        id: Date.now(),
        timestamp: new Date().toISOString()
    });

    res.status(200).json({ success: true, id: Date.now() });
});

app.post('/api/progress', (req, res) => {
    const progressData = req.body;
    console.log('📊 Progress data received:', progressData);

    // Store progress data
    playerProgress.set(progressData.type, progressData);

    res.status(200).json({ success: true });
});

app.get('/api/leaderboard', (req, res) => {
    // Return mock leaderboard data
    const leaderboard = raceResults
        .sort((a, b) => a.time - b.time)
        .slice(0, 10)
        .map((race, index) => ({
            position: index + 1,
            playerName: race.playerName || 'Anonymous',
            time: race.time,
            track: race.track || 'Unknown'
        }));

    res.json(leaderboard);
});

app.get('/api/achievements', (req, res) => {
    // Return mock achievements
    const achievements = [
        { id: 1, name: 'Speed Demon', description: 'Reach 200 km/h', unlocked: true },
        { id: 2, name: 'Lap Master', description: 'Complete 100 laps', unlocked: false },
        { id: 3, name: 'Mobile Racer', description: 'Win a race on mobile', unlocked: true }
    ];

    res.json(achievements);
});

app.post('/api/sync', (req, res) => {
    const syncData = req.body;
    console.log('🔄 Sync data received:', syncData);

    // Process sync data
    if (syncData.type === 'race') {
        raceResults.push(syncData.data);
    } else if (syncData.type === 'progress') {
        playerProgress.set(syncData.data.type, syncData.data);
    }

    res.status(200).json({ success: true });
});

// Initialize default products and data
async function initializeData() {
  // Only try to initialize if MongoDB is connected
  if (!global.isMongoDBConnected) {
    return;
  }
  
  try {
    const { initializeProducts } = require('./data/defaultProducts');
    const { initializeTournaments } = require('./data/defaultTournaments');

    await initializeProducts();
    await initializeTournaments();

    logger.info('Default data initialized');
  } catch (error) {
    logger.error('Error initializing data', { error: error.message });
  }
}

// Scheduled tasks
if (process.env.NODE_ENV === 'production') {
  // Daily cleanup of expired sessions and tokens
  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('🧹 Running daily cleanup...');

      // Clean up expired password reset tokens
      await User.updateMany(
        { 'status.passwordResetExpires': { $lt: new Date() } },
        {
          $unset: {
            'status.passwordResetToken': 1,
            'status.passwordResetExpires': 1
          }
        }
      );

      // Update tournament statuses
      await Tournament.updateMany(
        {
          status: 'registration_open',
          'schedule.registrationEnd': { $lt: new Date() }
        },
        { status: 'registration_closed' }
      );

      console.log('✅ Daily cleanup completed');
    } catch (error) {
      console.error('❌ Daily cleanup error:', error);
    }
  });

  // Weekly analytics summary
  cron.schedule('0 9 * * 1', async () => {
    try {
      console.log('📊 Generating weekly analytics...');

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const weeklyStats = await Payment.getRevenueStats(weekAgo, new Date());

      console.log('📈 Weekly revenue:', weeklyStats);
    } catch (error) {
      console.error('❌ Weekly analytics error:', error);
    }
  });
}

// Initialize data on startup
if (process.env.NODE_ENV !== 'test') {
  initializeData();
}

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log(`🎮 Player connected: ${socket.id}`);

    // Player joins game
    socket.on('joinGame', (playerData) => {
        const player = {
            id: socket.id,
            name: playerData.name || `Player_${socket.id.substring(0, 6)}`,
            position: { x: 0, y: 2, z: -35 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            velocity: { x: 0, y: 0, z: 0 },
            speed: 0,
            lap: 1,
            racePosition: 1,
            isReady: false,
            roomId: null,
            carColor: playerData.carColor || 0xff4444
        };

        players.set(socket.id, player);

        // Find or create a room
        let roomId = findAvailableRoom();
        if (!roomId) {
            roomId = createNewRoom();
        }

        // Add player to room
        joinRoom(socket.id, roomId);

        // Send welcome message
        socket.emit('gameJoined', {
            playerId: socket.id,
            player: player,
            roomId: roomId,
            message: 'Welcome to Speed Rivals!'
        });

        // Notify other players in room
        socket.to(roomId).emit('playerJoined', player);

        console.log(`👤 ${player.name} joined room ${roomId}`);
    });

    // Player updates position
    socket.on('playerUpdate', (updateData) => {
        const player = players.get(socket.id);
        if (player && player.roomId) {
            // Update player data
            player.position = updateData.position;
            player.rotation = updateData.rotation;
            player.velocity = updateData.velocity;
            player.speed = updateData.speed;
            player.lap = updateData.lap;

            // Broadcast to other players in the same room
            socket.to(player.roomId).emit('playerUpdate', {
                playerId: socket.id,
                ...updateData
            });

            // Update room state
            updateRoomState(player.roomId);

            // Check for lap completion (simple distance-based)
            const distanceFromStart = Math.sqrt(
                (player.position.x * player.position.x) +
                ((player.position.z + 30) * (player.position.z + 30))
            );

            if (distanceFromStart < 5 && player.speed > 0.1) {
                // Player crossed start/finish line
                updateLapProgress(socket.id, player.roomId);
            }
        }
    });

    // Player ready for race
    socket.on('playerReady', () => {
        const player = players.get(socket.id);
        if (player) {
            player.isReady = true;

            // Check if all players in room are ready
            const room = rooms.get(player.roomId);
            if (room) {
                const allReady = room.players.every(playerId => {
                    const p = players.get(playerId);
                    return p && p.isReady;
                });

                if (allReady && room.players.length >= 2) {
                    // Start race countdown
                    startRaceCountdown(player.roomId);
                }

                // Notify room about ready status
                io.to(player.roomId).emit('playerReady', {
                    playerId: socket.id,
                    allReady: allReady
                });
            }
        }
    });

    // Chat message
    socket.on('chatMessage', (message) => {
        const player = players.get(socket.id);
        if (player && player.roomId) {
            const chatData = {
                playerId: socket.id,
                playerName: player.name,
                message: message,
                timestamp: Date.now()
            };

            // Broadcast to room
            io.to(player.roomId).emit('chatMessage', chatData);
        }
    });

    // Lap completed
    socket.on('lapCompleted', (lapData) => {
        const player = players.get(socket.id);
        if (player && player.roomId) {
            player.lap = lapData.lap;

            // Calculate race positions
            updateRacePositions(player.roomId);

            // Broadcast lap completion
            io.to(player.roomId).emit('lapCompleted', {
                playerId: socket.id,
                playerName: player.name,
                lap: lapData.lap,
                time: lapData.time
            });

            console.log(`🏁 ${player.name} completed lap ${lapData.lap}`);
        }
    });

    // Power-up system events

    // Power-up spawned
    socket.on('powerUpSpawned', (data) => {
        const player = players.get(socket.id);
        if (player && player.roomId) {
            // Broadcast power-up spawn to other players in room
            socket.to(player.roomId).emit('powerUpSpawned', {
                id: data.id,
                type: data.type,
                position: data.position,
                spawnerId: socket.id
            });

            console.log(`🎯 Power-up ${data.type} spawned by ${player.name}`);
        }
    });

    // Power-up collected
    socket.on('powerUpCollected', (data) => {
        const player = players.get(socket.id);
        if (player && player.roomId) {
            // Broadcast collection to other players in room
            socket.to(player.roomId).emit('powerUpCollected', {
                pickupId: data.pickupId,
                playerId: socket.id,
                playerName: player.name,
                type: data.type
            });

            console.log(`🎯 ${player.name} collected ${data.type} power-up`);
        }
    });

    // Power-up used
    socket.on('powerUpUsed', (data) => {
        const player = players.get(socket.id);
        if (player && player.roomId) {
            // Broadcast usage to other players in room
            socket.to(player.roomId).emit('powerUpUsed', {
                playerId: socket.id,
                playerName: player.name,
                type: data.type,
                timestamp: data.timestamp,
                position: player.position,
                targetData: data.targetData // For missiles, etc.
            });

            console.log(`🎯 ${player.name} used ${data.type} power-up`);
        }
    });

    // EMP Blast
    socket.on('empBlast', (data) => {
        const player = players.get(socket.id);
        if (player && player.roomId) {
            // Find affected players in range
            const room = rooms.get(player.roomId);
            const affectedPlayers = [];

            if (room) {
                room.players.forEach(playerId => {
                    if (playerId === socket.id) return; // Skip self

                    const targetPlayer = players.get(playerId);
                    if (targetPlayer) {
                        const distance = Math.sqrt(
                            Math.pow(targetPlayer.position.x - data.position.x, 2) +
                            Math.pow(targetPlayer.position.z - data.position.z, 2)
                        );

                        if (distance <= data.range) {
                            affectedPlayers.push(playerId);
                        }
                    }
                });
            }

            // Broadcast EMP blast to room
            io.to(player.roomId).emit('empBlast', {
                playerId: socket.id,
                playerName: player.name,
                position: data.position,
                range: data.range,
                duration: data.duration,
                affectedPlayers: affectedPlayers
            });

            console.log(`⚡ ${player.name} used EMP blast affecting ${affectedPlayers.length} players`);
        }
    });

    // Player rewind (Time Rewind power-up)
    socket.on('playerRewind', (data) => {
        const player = players.get(socket.id);
        if (player && player.roomId) {
            // Update player position
            player.position = data.newPosition;
            player.rotation = data.newRotation;

            // Broadcast rewind to other players
            socket.to(player.roomId).emit('playerRewind', {
                playerId: socket.id,
                playerName: player.name,
                oldPosition: data.oldPosition,
                newPosition: data.newPosition,
                oldRotation: data.oldRotation,
                newRotation: data.newRotation,
                timestamp: data.timestamp
            });

            console.log(`🔄 ${player.name} used time rewind`);
        }
    });

    // Smoke screen
    socket.on('smokeScreen', (data) => {
        const player = players.get(socket.id);
        if (player && player.roomId) {
            // Broadcast smoke screen to other players
            socket.to(player.roomId).emit('smokeScreen', {
                playerId: socket.id,
                playerName: player.name,
                position: data.position,
                isActive: data.isActive
            });
        }
    });

    // Power-up hit/damage events
    socket.on('powerUpDamage', (data) => {
        const player = players.get(socket.id);
        if (player && player.roomId) {
            const targetPlayer = players.get(data.targetPlayerId);

            if (targetPlayer) {
                // Send damage event to target player
                io.to(data.targetPlayerId).emit('takeDamage', {
                    damageType: data.damageType,
                    amount: data.amount,
                    sourcePlayerId: socket.id,
                    sourcePlayerName: player.name,
                    powerUpType: data.powerUpType
                });

                // Broadcast to room for visual effects
                socket.to(player.roomId).emit('playerDamaged', {
                    targetPlayerId: data.targetPlayerId,
                    targetPlayerName: targetPlayer.name,
                    sourcePlayerId: socket.id,
                    sourcePlayerName: player.name,
                    damageType: data.damageType,
                    powerUpType: data.powerUpType
                });

                console.log(`💥 ${player.name} hit ${targetPlayer.name} with ${data.powerUpType}`);
            }
        }
    });

    // Player disconnection
    socket.on('disconnect', () => {
        const player = players.get(socket.id);
        if (player) {
            console.log(`🚪 Player disconnected: ${player.name} (${socket.id})`);

            // Remove from room
            if (player.roomId) {
                leaveRoom(socket.id, player.roomId);

                // Notify other players
                socket.to(player.roomId).emit('playerLeft', {
                    playerId: socket.id,
                    playerName: player.name
                });
            }

            // Remove player
            players.delete(socket.id);
        }
    });

    // Error handling
    socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
    });
});

// Room management functions
function findAvailableRoom() {
    for (const [roomId, room] of rooms) {
        if (room.players.length < room.maxPlayers && room.status === 'waiting') {
            return roomId;
        }
    }
    return null;
}

function createNewRoom() {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const room = {
        id: roomId,
        players: [],
        maxPlayers: 4,
        status: 'waiting', // waiting, countdown, racing, finished
        createdAt: Date.now(),
        raceStartTime: null
    };

    rooms.set(roomId, room);
    console.log(`🏠 Created new room: ${roomId}`);
    return roomId;
}

function joinRoom(playerId, roomId) {
    const room = rooms.get(roomId);
    const player = players.get(playerId);

    if (room && player) {
        room.players.push(playerId);
        player.roomId = roomId;

        // Update player positions for multiplayer start
        const startPositions = [
            { x: -2, y: 2, z: -35 },
            { x: 2, y: 2, z: -35 },
            { x: -2, y: 2, z: -37 },
            { x: 2, y: 2, z: -37 }
        ];

        const positionIndex = room.players.length - 1;
        if (startPositions[positionIndex]) {
            player.position = startPositions[positionIndex];
        }

        console.log(`👥 Room ${roomId} now has ${room.players.length} players`);
    }
}

function leaveRoom(playerId, roomId) {
    const room = rooms.get(roomId);
    if (room) {
        room.players = room.players.filter(id => id !== playerId);

        // Delete room if empty
        if (room.players.length === 0) {
            rooms.delete(roomId);
            console.log(`🗑️ Deleted empty room: ${roomId}`);
        }
    }
}

function startRaceCountdown(roomId) {
    const room = rooms.get(roomId);
    if (!room) return;

    room.status = 'countdown';

    let countdown = 3;
    const countdownInterval = setInterval(() => {
        io.to(roomId).emit('raceCountdown', {
            count: countdown,
            message: countdown > 0 ? countdown.toString() : 'GO!'
        });

        if (countdown === 0) {
            clearInterval(countdownInterval);
            room.status = 'racing';
            room.raceStartTime = Date.now();

            io.to(roomId).emit('raceStarted', {
                startTime: room.raceStartTime
            });

            console.log(`🏁 Race started in room ${roomId}`);
        }

        countdown--;
    }, 1000);
}

function updateLapProgress(playerId, roomId) {
    const player = players.get(playerId);
    if (!player) return;

    player.lap += 1;

    io.to(roomId).emit('lapCompleted', {
        playerId: playerId,
        playerName: player.name,
        lap: player.lap,
        time: Date.now() - (rooms.get(roomId)?.raceStartTime || Date.now())
    });

    console.log(`🏁 ${player.name} completed lap ${player.lap}`);

    // Update race positions after lap completion
    updateRacePositions(roomId);
}

function updateRacePositions(roomId) {
    const room = rooms.get(roomId);
    if (!room) return;

    // Get all players in room and sort by lap and position
    const roomPlayers = room.players
        .map(playerId => players.get(playerId))
        .filter(player => player)
        .sort((a, b) => {
            if (a.lap !== b.lap) {
                return b.lap - a.lap; // Higher lap = better position
            }
            // If same lap, sort by z-position (closer to finish line)
            return b.position.z - a.position.z;
        });

    // Update race positions
    roomPlayers.forEach((player, index) => {
        player.racePosition = index + 1;
    });

    // Broadcast updated positions
    io.to(roomId).emit('racePositions', {
        positions: roomPlayers.map(player => ({
            playerId: player.id,
            playerName: player.name,
            position: player.racePosition,
            lap: player.lap
        }))
    });
}

function updateRoomState(roomId) {
    const room = rooms.get(roomId);
    if (!room) return;

    // Send room state to all players
    const roomState = {
        roomId: roomId,
        playerCount: room.players.length,
        maxPlayers: room.maxPlayers,
        status: room.status,
        players: room.players.map(playerId => {
            const player = players.get(playerId);
            return player ? {
                id: player.id,
                name: player.name,
                position: player.position,
                rotation: player.rotation,
                speed: player.speed,
                lap: player.lap,
                racePosition: player.racePosition,
                carColor: player.carColor,
                isReady: player.isReady
            } : null;
        }).filter(p => p !== null)
    };

    io.to(roomId).emit('roomState', roomState);
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        players: players.size,
        rooms: rooms.size
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`🚀 Speed Rivals server running on port ${PORT}`);
    console.log(`🌐 Open http://localhost:${PORT} to play!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Shutting down Speed Rivals server...');
    server.close(() => {
        console.log('✅ Server shut down gracefully');
        process.exit(0);
    });
});