/**
 * CareerMode.js
 * Complete career mode with championships, progression, unlocks, and achievements
 */

class CareerMode {
    constructor() {
        this.player = {
            name: 'Player',
            level: 1,
            experience: 0,
            money: 50000,
            reputation: 0,
            
            // Career stats
            stats: {
                racesEntered: 0,
                racesWon: 0,
                podiumFinishes: 0,
                fastestLaps: 0,
                totalDistance: 0,
                totalTime: 0,
                championsWon: 0
            },
            
            // Owned content
            ownedCars: ['starter_car'],
            ownedTracks: ['training_circuit'],
            ownedLiveries: ['default'],
            ownedParts: []
        };
        
        // Career progression
        this.progression = {
            currentChampionship: null,
            completedChampionships: [],
            currentSeason: 1,
            careerPoints: 0
        };
        
        // Championships available
        this.championships = this.initializeChampionships();
        
        // Unlockables
        this.unlockables = this.initializeUnlockables();
        
        // Achievements
        this.achievements = this.initializeAchievements();
        
        // Garage
        this.garage = {
            selectedCar: 'starter_car',
            cars: {}
        };
        
        // Load save data if exists
        this.loadProgress();
        
        console.log('✅ Career mode initialized');
        console.log(`   - Player: ${this.player.name} (Level ${this.player.level})`);
        console.log(`   - Money: $${this.player.money.toLocaleString()}`);
    }

    /**
     * Initialize championships
     */
    initializeChampionships() {
        return [
            {
                id: 'rookie_series',
                name: 'Rookie Series',
                tier: 1,
                races: 5,
                difficulty: 'easy',
                prize: 25000,
                requiredLevel: 1,
                unlocked: true,
                completed: false,
                standings: []
            },
            {
                id: 'amateur_championship',
                name: 'Amateur Championship',
                tier: 2,
                races: 8,
                difficulty: 'medium',
                prize: 50000,
                requiredLevel: 5,
                unlocked: false,
                completed: false,
                standings: []
            },
            {
                id: 'pro_series',
                name: 'Pro Series',
                tier: 3,
                races: 10,
                difficulty: 'hard',
                prize: 100000,
                requiredLevel: 10,
                unlocked: false,
                completed: false,
                standings: []
            },
            {
                id: 'world_championship',
                name: 'World Championship',
                tier: 4,
                races: 12,
                difficulty: 'expert',
                prize: 250000,
                requiredLevel: 20,
                unlocked: false,
                completed: false,
                standings: []
            },
            {
                id: 'legends_cup',
                name: 'Legends Cup',
                tier: 5,
                races: 15,
                difficulty: 'master',
                prize: 500000,
                requiredLevel: 30,
                unlocked: false,
                completed: false,
                standings: []
            }
        ];
    }

    /**
     * Initialize unlockable content
     */
    initializeUnlockables() {
        return {
            cars: [
                { id: 'starter_car', name: 'Starter Car', price: 0, level: 1, unlocked: true },
                { id: 'sport_coupe', name: 'Sport Coupe', price: 35000, level: 3, unlocked: false },
                { id: 'muscle_car', name: 'Muscle Car', price: 50000, level: 5, unlocked: false },
                { id: 'super_car', name: 'Super Car', price: 100000, level: 10, unlocked: false },
                { id: 'hyper_car', name: 'Hyper Car', price: 250000, level: 15, unlocked: false },
                { id: 'formula_car', name: 'Formula Car', price: 500000, level: 20, unlocked: false }
            ],
            tracks: [
                { id: 'training_circuit', name: 'Training Circuit', price: 0, level: 1, unlocked: true },
                { id: 'city_streets', name: 'City Streets', price: 10000, level: 3, unlocked: false },
                { id: 'mountain_pass', name: 'Mountain Pass', price: 20000, level: 6, unlocked: false },
                { id: 'coastal_highway', name: 'Coastal Highway', price: 35000, level: 10, unlocked: false },
                { id: 'desert_speedway', name: 'Desert Speedway', price: 50000, level: 15, unlocked: false }
            ],
            parts: [
                // Engine
                { id: 'engine_stage_1', name: 'Stage 1 Tune', category: 'engine', price: 5000, level: 2, bonus: {power: 1.1} },
                { id: 'engine_stage_2', name: 'Stage 2 Tune', category: 'engine', price: 15000, level: 5, bonus: {power: 1.25} },
                { id: 'engine_stage_3', name: 'Stage 3 Tune', category: 'engine', price: 35000, level: 10, bonus: {power: 1.5} },
                
                // Tires
                { id: 'sport_tires', name: 'Sport Tires', category: 'tires', price: 3000, level: 2, bonus: {grip: 1.1} },
                { id: 'racing_tires', name: 'Racing Tires', category: 'tires', price: 8000, level: 5, bonus: {grip: 1.3} },
                { id: 'slick_tires', name: 'Slick Tires', category: 'tires', price: 15000, level: 10, bonus: {grip: 1.5} },
                
                // Aerodynamics
                { id: 'front_splitter', name: 'Front Splitter', category: 'aero', price: 4000, level: 3, bonus: {downforce: 1.15} },
                { id: 'rear_wing', name: 'Rear Wing', category: 'aero', price: 6000, level: 5, bonus: {downforce: 1.3} },
                { id: 'full_aero_kit', name: 'Full Aero Kit', category: 'aero', price: 20000, level: 10, bonus: {downforce: 1.6} }
            ]
        };
    }

    /**
     * Initialize achievements
     */
    initializeAchievements() {
        return [
            { id: 'first_win', name: 'First Victory', description: 'Win your first race', unlocked: false, reward: 5000 },
            { id: 'podium_10', name: 'Podium Regular', description: 'Finish on podium 10 times', unlocked: false, reward: 10000 },
            { id: 'champion', name: 'Champion', description: 'Win a championship', unlocked: false, reward: 25000 },
            { id: 'speed_demon', name: 'Speed Demon', description: 'Reach 300 km/h', unlocked: false, reward: 5000 },
            { id: 'clean_racer', name: 'Clean Racer', description: 'Win without collisions', unlocked: false, reward: 15000 },
            { id: 'comeback_king', name: 'Comeback King', description: 'Win from last place', unlocked: false, reward: 20000 },
            { id: 'perfectionist', name: 'Perfectionist', description: 'Get pole, fastest lap, and win', unlocked: false, reward: 30000 },
            { id: 'millionaire', name: 'Millionaire', description: 'Earn $1,000,000', unlocked: false, reward: 50000 },
            { id: 'collector', name: 'Collector', description: 'Own all cars', unlocked: false, reward: 100000 },
            { id: 'legend', name: 'Legend', description: 'Complete all championships', unlocked: false, reward: 250000 }
        ];
    }

    /**
     * Complete a race and award prizes
     */
    completeRace(result) {
        const { position, raceTime, fastestLap, collisions, championship } = result;
        
        // Update stats
        this.player.stats.racesEntered++;
        if (position === 1) this.player.stats.racesWon++;
        if (position <= 3) this.player.stats.podiumFinishes++;
        if (fastestLap) this.player.stats.fastestLaps++;
        
        // Award money based on position
        const prizes = {
            1: 15000,
            2: 10000,
            3: 7500,
            4: 5000,
            5: 3000
        };
        const prize = prizes[position] || 1000;
        this.player.money += prize;
        
        // Award experience
        const experience = (10 - position) * 100 + (fastestLap ? 200 : 0);
        this.addExperience(experience);
        
        // Award reputation
        const reputation = (10 - position) * 10;
        this.player.reputation += reputation;
        
        // Check achievements
        this.checkAchievements(result);
        
        // Save progress
        this.saveProgress();
        
        console.log(`🏆 Race complete: P${position}`);
        console.log(`   Money earned: $${prize.toLocaleString()}`);
        console.log(`   XP earned: ${experience}`);
        
        return {
            prize,
            experience,
            reputation,
            newLevel: this.player.level
        };
    }

    /**
     * Add experience and handle leveling up
     */
    addExperience(amount) {
        this.player.experience += amount;
        
        // Level up calculation
        const xpForNextLevel = this.player.level * 1000;
        
        if (this.player.experience >= xpForNextLevel) {
            this.player.level++;
            this.player.experience -= xpForNextLevel;
            this.onLevelUp();
            return true;
        }
        
        return false;
    }

    /**
     * Handle level up
     */
    onLevelUp() {
        console.log(`🎉 LEVEL UP! Now level ${this.player.level}`);
        
        // Award bonus money
        const bonus = this.player.level * 5000;
        this.player.money += bonus;
        
        // Unlock new content
        this.checkUnlocks();
        
        // Show notification (would trigger UI)
        return {
            newLevel: this.player.level,
            bonus: bonus,
            unlocks: this.getNewlyUnlocked()
        };
    }

    /**
     * Check for new unlocks
     */
    checkUnlocks() {
        // Check cars
        this.unlockables.cars.forEach(car => {
            if (!car.unlocked && this.player.level >= car.level) {
                car.unlocked = true;
                console.log(`🔓 Unlocked: ${car.name}`);
            }
        });
        
        // Check tracks
        this.unlockables.tracks.forEach(track => {
            if (!track.unlocked && this.player.level >= track.level) {
                track.unlocked = true;
                console.log(`🔓 Unlocked: ${track.name}`);
            }
        });
        
        // Check championships
        this.championships.forEach(champ => {
            if (!champ.unlocked && this.player.level >= champ.requiredLevel) {
                champ.unlocked = true;
                console.log(`🔓 Unlocked: ${champ.name}`);
            }
        });
    }

    /**
     * Purchase car
     */
    buyCar(carId) {
        const car = this.unlockables.cars.find(c => c.id === carId);
        
        if (!car) {
            return { success: false, message: 'Car not found' };
        }
        
        if (!car.unlocked) {
            return { success: false, message: 'Car not unlocked yet' };
        }
        
        if (this.player.ownedCars.includes(carId)) {
            return { success: false, message: 'Already owned' };
        }
        
        if (this.player.money < car.price) {
            return { success: false, message: 'Insufficient funds' };
        }
        
        // Purchase
        this.player.money -= car.price;
        this.player.ownedCars.push(carId);
        this.garage.cars[carId] = {
            id: carId,
            name: car.name,
            parts: [],
            livery: 'default',
            performance: 1.0
        };
        
        this.saveProgress();
        
        console.log(`🚗 Purchased: ${car.name}`);
        
        return { success: true, message: `Purchased ${car.name}!` };
    }

    /**
     * Purchase upgrade part
     */
    buyPart(partId, carId) {
        const part = this.unlockables.parts.find(p => p.id === partId);
        const car = this.garage.cars[carId];
        
        if (!part || !car) {
            return { success: false, message: 'Invalid purchase' };
        }
        
        if (this.player.money < part.price) {
            return { success: false, message: 'Insufficient funds' };
        }
        
        if (this.player.level < part.level) {
            return { success: false, message: 'Level too low' };
        }
        
        // Purchase and install
        this.player.money -= part.price;
        this.player.ownedParts.push(partId);
        
        // Remove conflicting parts (same category)
        car.parts = car.parts.filter(p => {
            const existingPart = this.unlockables.parts.find(up => up.id === p);
            return existingPart.category !== part.category;
        });
        
        car.parts.push(partId);
        this.updateCarPerformance(carId);
        this.saveProgress();
        
        console.log(`🔧 Installed: ${part.name} on ${car.name}`);
        
        return { success: true, message: `Installed ${part.name}!` };
    }

    /**
     * Update car performance based on parts
     */
    updateCarPerformance(carId) {
        const car = this.garage.cars[carId];
        let performance = 1.0;
        
        car.parts.forEach(partId => {
            const part = this.unlockables.parts.find(p => p.id === partId);
            if (part && part.bonus) {
                Object.values(part.bonus).forEach(bonus => {
                    performance *= bonus;
                });
            }
        });
        
        car.performance = performance;
    }

    /**
     * Check and unlock achievements
     */
    checkAchievements(raceResult) {
        const achievements = this.achievements;
        
        // First win
        if (raceResult.position === 1 && this.player.stats.racesWon === 1) {
            this.unlockAchievement('first_win');
        }
        
        // Podium 10
        if (this.player.stats.podiumFinishes >= 10) {
            this.unlockAchievement('podium_10');
        }
        
        // Clean racer
        if (raceResult.position === 1 && raceResult.collisions === 0) {
            this.unlockAchievement('clean_racer');
        }
        
        // Perfectionist
        if (raceResult.position === 1 && raceResult.pole && raceResult.fastestLap) {
            this.unlockAchievement('perfectionist');
        }
        
        // Millionaire
        if (this.player.money >= 1000000) {
            this.unlockAchievement('millionaire');
        }
    }

    /**
     * Unlock achievement
     */
    unlockAchievement(achievementId) {
        const achievement = this.achievements.find(a => a.id === achievementId);
        
        if (achievement && !achievement.unlocked) {
            achievement.unlocked = true;
            this.player.money += achievement.reward;
            
            console.log(`🏆 Achievement unlocked: ${achievement.name}`);
            console.log(`   Reward: $${achievement.reward.toLocaleString()}`);
            
            return achievement;
        }
        
        return null;
    }

    /**
     * Get career summary
     */
    getSummary() {
        return {
            player: this.player,
            progression: this.progression,
            garage: this.garage,
            achievements: this.achievements.filter(a => a.unlocked).length,
            totalAchievements: this.achievements.length
        };
    }

    /**
     * Save progress to localStorage
     */
    saveProgress() {
        const saveData = {
            player: this.player,
            progression: this.progression,
            garage: this.garage,
            championships: this.championships,
            unlockables: this.unlockables,
            achievements: this.achievements
        };
        
        try {
            localStorage.setItem('speedRivalsCareer', JSON.stringify(saveData));
            console.log('💾 Progress saved');
        } catch (e) {
            console.error('Failed to save progress:', e);
        }
    }

    /**
     * Load progress from localStorage
     */
    loadProgress() {
        try {
            const saveData = localStorage.getItem('speedRivalsCareer');
            if (saveData) {
                const data = JSON.parse(saveData);
                Object.assign(this.player, data.player);
                Object.assign(this.progression, data.progression);
                Object.assign(this.garage, data.garage);
                this.championships = data.championships || this.championships;
                this.unlockables = data.unlockables || this.unlockables;
                this.achievements = data.achievements || this.achievements;
                
                console.log('💾 Progress loaded');
            }
        } catch (e) {
            console.error('Failed to load progress:', e);
        }
    }

    /**
     * Reset career (new game)
     */
    resetCareer() {
        localStorage.removeItem('speedRivalsCareer');
        location.reload(); // Reload to reinitialize
    }

    /**
     * Get newly unlocked content
     */
    getNewlyUnlocked() {
        const unlocked = [];
        
        this.unlockables.cars.forEach(car => {
            if (car.unlocked && car.level === this.player.level) {
                unlocked.push({ type: 'car', ...car });
            }
        });
        
        this.unlockables.tracks.forEach(track => {
            if (track.unlocked && track.level === this.player.level) {
                unlocked.push({ type: 'track', ...track });
            }
        });
        
        return unlocked;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CareerMode;
}
