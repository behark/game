class AIManager {
    constructor(scene, world, track) {
        this.scene = scene;
        this.world = world;
        this.track = track;

        this.aiOpponents = [];
        this.maxAIOpponents = 5;
        this.currentDifficulty = 'amateur';
        this.adaptiveDifficulty = true;

        // Rubber band AI settings
        this.rubberBandEnabled = true;
        this.rubberBandStrength = 0.3; // 0 = off, 1 = maximum
        this.maxRubberBandDistance = 50; // Distance before rubber banding kicks in

        // Performance tracking for adaptive difficulty
        this.playerPerformance = {
            averageLapTime: 60,
            bestLapTime: Infinity,
            position: 1,
            consistency: 0.5,
            aggressiveness: 0.5,
            recentLapTimes: [],
            wins: 0,
            losses: 0
        };

        // AI personalities distribution
        this.personalityDistribution = {
            aggressive: 0.2,
            tactical: 0.3,
            defensive: 0.2,
            unpredictable: 0.15,
            professional: 0.15
        };

        // Racing state
        this.raceStarted = false;
        this.raceTime = 0;
        this.currentLap = 1;
        this.maxLaps = 3;
        this.leaderboard = [];

        // Performance monitoring
        this.performanceCheckInterval = 5000; // Check every 5 seconds
        this.lastPerformanceCheck = 0;
        this.difficultyAdjustmentCooldown = 30000; // 30 seconds between adjustments
        this.lastDifficultyAdjustment = 0;

        // AI spawn positions
        this.spawnPositions = [
            { x: -4, y: 5, z: -35 },
            { x: 4, y: 5, z: -35 },
            { x: -8, y: 5, z: -30 },
            { x: 8, y: 5, z: -30 },
            { x: -2, y: 5, z: -40 }
        ];
    }

    async initialize(difficulty = 'amateur') {
        console.log('🤖 Initializing AI Manager...');

        this.currentDifficulty = difficulty;

        // Create AI opponents
        await this.createAIOpponents();

        console.log(`✅ AI Manager initialized with ${this.aiOpponents.length} opponents`);
    }

    async createAIOpponents() {
        const personalities = this.selectPersonalities();

        for (let i = 0; i < Math.min(this.maxAIOpponents, personalities.length); i++) {
            const personality = personalities[i];
            const skillLevel = this.getSkillLevelForPersonality(personality);
            const spawnPos = this.spawnPositions[i] || { x: 0, y: 5, z: -35 };

            const aiOpponent = new AIOpponent(
                this.scene,
                this.world,
                this.track,
                personality,
                skillLevel
            );

            await aiOpponent.create(spawnPos);
            this.aiOpponents.push(aiOpponent);

            console.log(`Created ${personality} AI with ${skillLevel} skill level`);
        }
    }

    selectPersonalities() {
        const personalities = [];
        const totalSlots = this.maxAIOpponents;

        // Distribute personalities based on configured distribution
        Object.entries(this.personalityDistribution).forEach(([personality, ratio]) => {
            const count = Math.floor(totalSlots * ratio);
            for (let i = 0; i < count; i++) {
                personalities.push(personality);
            }
        });

        // Fill remaining slots with random personalities
        const allPersonalities = Object.keys(this.personalityDistribution);
        while (personalities.length < totalSlots) {
            const randomPersonality = allPersonalities[Math.floor(Math.random() * allPersonalities.length)];
            personalities.push(randomPersonality);
        }

        // Shuffle the personalities array
        return personalities.sort(() => Math.random() - 0.5);
    }

    getSkillLevelForPersonality(personality) {
        // Base skill level on current difficulty
        const skillLevels = ['novice', 'amateur', 'professional', 'expert', 'legend'];
        const baseIndex = skillLevels.indexOf(this.currentDifficulty);

        // Add some variation for different personalities
        const personalityModifiers = {
            aggressive: 0, // Same as base
            tactical: 1, // Slightly higher
            defensive: -1, // Slightly lower
            unpredictable: 0, // Same as base
            professional: 1 // Slightly higher
        };

        const modifier = personalityModifiers[personality] || 0;
        const adjustedIndex = Math.max(0, Math.min(skillLevels.length - 1, baseIndex + modifier));

        return skillLevels[adjustedIndex];
    }

    update(deltaTime, playerCar) {
        if (!this.raceStarted) return;

        this.raceTime += deltaTime;
        this.lastPerformanceCheck += deltaTime;

        // Update all AI opponents
        this.aiOpponents.forEach(ai => {
            ai.update(deltaTime, playerCar, this.aiOpponents);
        });

        // Apply rubber band AI
        if (this.rubberBandEnabled) {
            this.applyRubberBandAI(playerCar);
        }

        // Update leaderboard
        this.updateLeaderboard(playerCar);

        // Check for adaptive difficulty adjustment
        if (this.adaptiveDifficulty && Date.now() - this.lastDifficultyAdjustment > this.difficultyAdjustmentCooldown) {
            this.checkAdaptiveDifficulty(playerCar);
        }

        // Track player performance
        this.trackPlayerPerformance(playerCar);
    }

    applyRubberBandAI(playerCar) {
        if (!playerCar || !playerCar.getPosition) return;

        const playerPos = playerCar.getPosition();
        const playerSpeed = playerCar.getSpeed();

        this.aiOpponents.forEach(ai => {
            const aiPos = ai.getPosition();
            const distance = playerPos.distanceTo(aiPos);

            // Apply rubber banding if AI is too far ahead or behind
            if (distance > this.maxRubberBandDistance) {
                const rubberBandEffect = this.calculateRubberBandEffect(distance, playerSpeed, ai);
                this.applyRubberBandEffect(ai, rubberBandEffect);
            }
        });
    }

    calculateRubberBandEffect(distance, playerSpeed, ai) {
        const maxDistance = this.maxRubberBandDistance;
        const excessDistance = distance - maxDistance;
        const normalizedDistance = Math.min(excessDistance / maxDistance, 1);

        // Determine if AI is ahead or behind player
        const aiPos = ai.getPosition();
        const playerPos = this.getPlayerPosition();

        // Simple track position comparison (can be improved with proper track sectioning)
        const isAIAhead = aiPos.z > playerPos.z || (Math.abs(aiPos.z - playerPos.z) < 5 && aiPos.x > playerPos.x);

        const effect = {
            speedMultiplier: 1,
            accelerationMultiplier: 1,
            mistakeMultiplier: 1
        };

        if (isAIAhead) {
            // AI is too far ahead - slow them down
            effect.speedMultiplier = 1 - (normalizedDistance * this.rubberBandStrength * 0.3);
            effect.accelerationMultiplier = 1 - (normalizedDistance * this.rubberBandStrength * 0.2);
            effect.mistakeMultiplier = 1 + (normalizedDistance * this.rubberBandStrength * 0.5);
        } else {
            // AI is too far behind - speed them up
            effect.speedMultiplier = 1 + (normalizedDistance * this.rubberBandStrength * 0.4);
            effect.accelerationMultiplier = 1 + (normalizedDistance * this.rubberBandStrength * 0.3);
            effect.mistakeMultiplier = 1 - (normalizedDistance * this.rubberBandStrength * 0.3);
        }

        return effect;
    }

    applyRubberBandEffect(ai, effect) {
        // Temporarily modify AI properties
        ai.maxSpeed *= effect.speedMultiplier;
        ai.acceleration *= effect.accelerationMultiplier;
        ai.mistakeChance *= effect.mistakeMultiplier;

        // Reset properties after a short time
        setTimeout(() => {
            ai.maxSpeed /= effect.speedMultiplier;
            ai.acceleration /= effect.accelerationMultiplier;
            ai.mistakeChance /= effect.mistakeMultiplier;
        }, 1000);
    }

    updateLeaderboard(playerCar) {
        if (!playerCar) return;

        const allCars = [
            { type: 'player', car: playerCar, lapTime: this.raceTime },
            ...this.aiOpponents.map(ai => ({ type: 'ai', car: ai, lapTime: ai.lapTime }))
        ];

        // Sort by lap time (simple implementation - can be improved with proper lap tracking)
        this.leaderboard = allCars.sort((a, b) => a.lapTime - b.lapTime);

        // Update positions
        this.leaderboard.forEach((entry, index) => {
            if (entry.type === 'player') {
                this.playerPerformance.position = index + 1;
            } else {
                entry.car.position = index + 1;
            }
        });
    }

    checkAdaptiveDifficulty(playerCar) {
        const currentTime = Date.now();

        // Analyze player performance
        const analysis = this.analyzePlayerPerformance();

        // Determine if difficulty adjustment is needed
        const adjustment = this.calculateDifficultyAdjustment(analysis);

        if (adjustment !== 0) {
            this.adjustDifficulty(adjustment);
            this.lastDifficultyAdjustment = currentTime;
        }
    }

    analyzePlayerPerformance() {
        const analysis = {
            averagePosition: this.playerPerformance.position,
            consistency: this.calculateConsistency(),
            competitiveness: this.calculateCompetitiveness(),
            improvement: this.calculateImprovement()
        };

        return analysis;
    }

    calculateConsistency() {
        if (this.playerPerformance.recentLapTimes.length < 3) return 0.5;

        const lapTimes = this.playerPerformance.recentLapTimes;
        const average = lapTimes.reduce((sum, time) => sum + time, 0) / lapTimes.length;
        const variance = lapTimes.reduce((sum, time) => sum + Math.pow(time - average, 2), 0) / lapTimes.length;
        const standardDeviation = Math.sqrt(variance);

        // Convert to 0-1 scale (lower deviation = higher consistency)
        return Math.max(0, 1 - (standardDeviation / average));
    }

    calculateCompetitiveness() {
        // How close are races?
        const winRate = this.playerPerformance.wins / (this.playerPerformance.wins + this.playerPerformance.losses + 1);
        const positionScore = 1 - ((this.playerPerformance.position - 1) / this.aiOpponents.length);

        return (winRate + positionScore) / 2;
    }

    calculateImprovement() {
        if (this.playerPerformance.recentLapTimes.length < 5) return 0;

        const recentTimes = this.playerPerformance.recentLapTimes.slice(-5);
        const oldTimes = this.playerPerformance.recentLapTimes.slice(-10, -5);

        if (oldTimes.length === 0) return 0;

        const recentAverage = recentTimes.reduce((sum, time) => sum + time, 0) / recentTimes.length;
        const oldAverage = oldTimes.reduce((sum, time) => sum + time, 0) / oldTimes.length;

        // Positive value means improvement (faster times)
        return (oldAverage - recentAverage) / oldAverage;
    }

    calculateDifficultyAdjustment(analysis) {
        let adjustment = 0;

        // Too easy - player winning too much
        if (analysis.competitiveness > 0.8 && analysis.averagePosition <= 2) {
            adjustment = 1;
        }
        // Too hard - player struggling
        else if (analysis.competitiveness < 0.3 && analysis.averagePosition >= this.aiOpponents.length - 1) {
            adjustment = -1;
        }
        // Player improving rapidly - increase difficulty
        else if (analysis.improvement > 0.1) {
            adjustment = 1;
        }
        // Player not improving and struggling - decrease difficulty
        else if (analysis.improvement < -0.05 && analysis.competitiveness < 0.4) {
            adjustment = -1;
        }

        return adjustment;
    }

    adjustDifficulty(adjustment) {
        const skillLevels = ['novice', 'amateur', 'professional', 'expert', 'legend'];
        const currentIndex = skillLevels.indexOf(this.currentDifficulty);
        const newIndex = Math.max(0, Math.min(skillLevels.length - 1, currentIndex + adjustment));

        if (newIndex !== currentIndex) {
            this.currentDifficulty = skillLevels[newIndex];
            this.applyDifficultyToAI();

            console.log(`🎯 Adaptive difficulty adjusted to: ${this.currentDifficulty}`);
        }
    }

    applyDifficultyToAI() {
        // Adjust existing AI opponents to new difficulty
        this.aiOpponents.forEach(ai => {
            const newSkillLevel = this.getSkillLevelForPersonality(ai.personality);
            const multiplier = this.getSkillMultiplierForLevel(newSkillLevel);

            ai.skillLevel = newSkillLevel;
            ai.maxSpeed = ai.maxSpeed * multiplier.speed / this.getSkillMultiplierForLevel(ai.skillLevel).speed;
            ai.acceleration = ai.acceleration * multiplier.acceleration / this.getSkillMultiplierForLevel(ai.skillLevel).acceleration;
            ai.mistakeChance = ai.mistakeChance * multiplier.mistake / this.getSkillMultiplierForLevel(ai.skillLevel).mistake;
        });
    }

    getSkillMultiplierForLevel(skillLevel) {
        const multipliers = {
            novice: { speed: 0.7, acceleration: 0.8, mistake: 0.3 },
            amateur: { speed: 0.85, acceleration: 0.9, mistake: 0.15 },
            professional: { speed: 1.0, acceleration: 1.0, mistake: 0.05 },
            expert: { speed: 1.15, acceleration: 1.1, mistake: 0.02 },
            legend: { speed: 1.3, acceleration: 1.2, mistake: 0.01 }
        };

        return multipliers[skillLevel] || multipliers.amateur;
    }

    trackPlayerPerformance(playerCar) {
        if (!playerCar) return;

        // Update performance metrics
        this.playerPerformance.averageLapTime = this.raceTime; // Simplified

        // Track lap times when lap is completed
        if (this.track.checkLapProgress && this.track.checkLapProgress(playerCar.getPosition())) {
            this.onLapCompleted(this.raceTime);
        }
    }

    onLapCompleted(lapTime) {
        this.playerPerformance.recentLapTimes.push(lapTime);

        // Keep only recent lap times
        if (this.playerPerformance.recentLapTimes.length > 10) {
            this.playerPerformance.recentLapTimes.shift();
        }

        // Update best lap time
        if (lapTime < this.playerPerformance.bestLapTime) {
            this.playerPerformance.bestLapTime = lapTime;
        }

        // Reset race time for next lap
        this.raceTime = 0;
        this.currentLap++;

        console.log(`Lap ${this.currentLap - 1} completed in ${lapTime.toFixed(2)}s`);
    }

    startRace() {
        this.raceStarted = true;
        this.raceTime = 0;
        this.currentLap = 1;

        // Reset all AI opponents
        this.aiOpponents.forEach((ai, index) => {
            const spawnPos = this.spawnPositions[index] || { x: 0, y: 5, z: -35 };
            ai.reset(spawnPos);
        });

        console.log('🏁 Race started with AI opponents!');
    }

    endRace() {
        this.raceStarted = false;

        // Update win/loss statistics
        const finalPosition = this.playerPerformance.position;
        if (finalPosition === 1) {
            this.playerPerformance.wins++;
        } else {
            this.playerPerformance.losses++;
        }

        console.log('🏁 Race ended!');
        console.log(`Final position: ${finalPosition}/${this.aiOpponents.length + 1}`);
    }

    getLeaderboard() {
        return this.leaderboard.map((entry, index) => ({
            position: index + 1,
            type: entry.type,
            personality: entry.type === 'ai' ? entry.car.personality : 'player',
            lapTime: entry.lapTime,
            car: entry.car
        }));
    }

    getPlayerPosition() {
        // Helper method to get player position for rubber banding
        return this.leaderboard.find(entry => entry.type === 'player')?.car?.getPosition() || new THREE.Vector3();
    }

    setRubberBandStrength(strength) {
        this.rubberBandStrength = Math.max(0, Math.min(1, strength));
    }

    setAdaptiveDifficulty(enabled) {
        this.adaptiveDifficulty = enabled;
    }

    setMaxAIOpponents(count) {
        this.maxAIOpponents = Math.max(1, Math.min(8, count));

        // Add or remove AI opponents as needed
        if (count > this.aiOpponents.length) {
            this.addAIOpponents(count - this.aiOpponents.length);
        } else if (count < this.aiOpponents.length) {
            this.removeAIOpponents(this.aiOpponents.length - count);
        }
    }

    async addAIOpponents(count) {
        const personalities = this.selectPersonalities();
        const startIndex = this.aiOpponents.length;

        for (let i = 0; i < count && startIndex + i < this.maxAIOpponents; i++) {
            const personality = personalities[i % personalities.length];
            const skillLevel = this.getSkillLevelForPersonality(personality);
            const spawnPos = this.spawnPositions[startIndex + i] || { x: 0, y: 5, z: -35 };

            const aiOpponent = new AIOpponent(
                this.scene,
                this.world,
                this.track,
                personality,
                skillLevel
            );

            await aiOpponent.create(spawnPos);
            this.aiOpponents.push(aiOpponent);
        }
    }

    removeAIOpponents(count) {
        for (let i = 0; i < count && this.aiOpponents.length > 0; i++) {
            const ai = this.aiOpponents.pop();
            ai.destroy();
        }
    }

    destroy() {
        // Clean up all AI opponents
        this.aiOpponents.forEach(ai => {
            ai.destroy();
        });

        this.aiOpponents = [];
        this.raceStarted = false;

        console.log('🤖 AI Manager destroyed');
    }

    // Debugging and monitoring methods
    getAIStatus() {
        return {
            difficulty: this.currentDifficulty,
            aiCount: this.aiOpponents.length,
            rubberBandEnabled: this.rubberBandEnabled,
            rubberBandStrength: this.rubberBandStrength,
            adaptiveDifficulty: this.adaptiveDifficulty,
            playerPerformance: this.playerPerformance,
            leaderboard: this.getLeaderboard()
        };
    }

    getAIPersonalities() {
        return this.aiOpponents.map(ai => ({
            personality: ai.personality,
            skillLevel: ai.skillLevel,
            position: ai.position,
            speed: ai.getSpeed(),
            currentDecision: ai.currentDecision
        }));
    }
}