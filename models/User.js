const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic user information
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: 3,
    maxlength: 20,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },

  // Player profile
  profile: {
    displayName: { type: String, maxlength: 30 },
    avatar: { type: String, default: 'default' },
    country: { type: String, maxlength: 3 },
    preferredLanguage: { type: String, default: 'en' },
    timezone: { type: String }
  },

  // Game statistics
  gameStats: {
    totalRaces: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    podiumFinishes: { type: Number, default: 0 },
    totalPlayTime: { type: Number, default: 0 }, // in minutes
    bestLapTime: { type: Number, default: null },
    averagePosition: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 }
  },

  // Progression system
  progression: {
    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 },
    xpToNextLevel: { type: Number, default: 1000 },
    skillRating: { type: Number, default: 1000 },
    rank: { type: String, default: 'Bronze', enum: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster'] }
  },

  // Currency and wallet
  wallet: {
    speedCoins: { type: Number, default: 0 }, // Premium currency
    racePoints: { type: Number, default: 500 }, // Earned currency
    lifetimeSpent: { type: Number, default: 0 }, // Total real money spent
    lifetimeEarned: { type: Number, default: 0 } // Total earned currency
  },

  // Premium membership
  subscription: {
    isActive: { type: Boolean, default: false },
    type: { type: String, enum: ['none', 'premium'], default: 'none' },
    startDate: { type: Date },
    endDate: { type: Date },
    autoRenew: { type: Boolean, default: true },
    stripeSubscriptionId: { type: String },
    cancelledAt: { type: Date }
  },

  // Battle pass progression
  battlePass: {
    currentSeason: { type: String },
    tier: { type: Number, default: 0 },
    xp: { type: Number, default: 0 },
    isPremium: { type: Boolean, default: false },
    claimedRewards: [{ type: Number }], // Array of claimed tier numbers
    purchaseDate: { type: Date }
  },

  // Owned content
  inventory: {
    cars: [{
      carId: { type: String, required: true },
      purchaseDate: { type: Date, default: Date.now },
      customizations: {
        paintJob: { type: String, default: 'default' },
        wheels: { type: String, default: 'default' },
        decals: [{ type: String }],
        effects: [{ type: String }]
      }
    }],

    cosmetics: [{
      itemId: { type: String, required: true },
      category: { type: String, enum: ['paint', 'decal', 'wheel', 'effect', 'avatar', 'emote'] },
      purchaseDate: { type: Date, default: Date.now },
      source: { type: String, enum: ['purchase', 'battlepass', 'reward', 'tournament'] }
    }],

    tracks: [{
      trackId: { type: String, required: true },
      purchaseDate: { type: Date, default: Date.now }
    }]
  },

  // Tournament history
  tournaments: {
    participated: [{
      tournamentId: { type: String },
      entryFee: { type: Number },
      placement: { type: Number },
      prize: { type: Number },
      date: { type: Date, default: Date.now }
    }],
    totalWinnings: { type: Number, default: 0 },
    totalEntryFees: { type: Number, default: 0 }
  },

  // Purchase history
  purchases: [{
    transactionId: { type: String, required: true },
    type: { type: String, enum: ['car', 'cosmetic', 'currency', 'battlepass', 'subscription', 'tournament'] },
    itemId: { type: String },
    amount: { type: Number }, // Price in cents
    currency: { type: String, default: 'USD' },
    paymentMethod: { type: String },
    status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
    stripePaymentIntentId: { type: String },
    date: { type: Date, default: Date.now },
    refundDate: { type: Date },
    refundReason: { type: String }
  }],

  // Preferences and settings
  settings: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      tournaments: { type: Boolean, default: true },
      newContent: { type: Boolean, default: true },
      social: { type: Boolean, default: true }
    },
    privacy: {
      showProfile: { type: Boolean, default: true },
      showStats: { type: Boolean, default: true },
      allowFriendRequests: { type: Boolean, default: true }
    },
    gameplay: {
      difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
      autoAccelerate: { type: Boolean, default: false },
      steeringAssist: { type: Boolean, default: true },
      ghostCars: { type: Boolean, default: true }
    }
  },

  // Anti-fraud and security
  security: {
    lastLoginIP: { type: String },
    loginHistory: [{
      ip: { type: String },
      location: { type: String },
      date: { type: Date, default: Date.now },
      userAgent: { type: String }
    }],
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String }
  },

  // Account status
  status: {
    isActive: { type: Boolean, default: true },
    isBanned: { type: Boolean, default: false },
    banReason: { type: String },
    banExpires: { type: Date },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance (email and username have unique: true in schema)
userSchema.index({ 'subscription.stripeSubscriptionId': 1 });
userSchema.index({ 'wallet.speedCoins': -1 });
userSchema.index({ 'progression.skillRating': -1 });
userSchema.index({ createdAt: -1 });

// Virtual for win rate
userSchema.virtual('winRate').get(function() {
  if (this.gameStats.totalRaces === 0) return 0;
  return (this.gameStats.wins / this.gameStats.totalRaces * 100).toFixed(1);
});

// Virtual for subscription status
userSchema.virtual('isSubscriptionActive').get(function() {
  return this.subscription.isActive &&
         this.subscription.endDate &&
         this.subscription.endDate > new Date();
});

// Virtual for total spent
userSchema.virtual('totalSpentUSD').get(function() {
  return (this.wallet.lifetimeSpent / 100).toFixed(2);
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Add car to inventory
userSchema.methods.addCar = function(carId, customizations = {}) {
  const existingCar = this.inventory.cars.find(car => car.carId === carId);
  if (existingCar) {
    return { success: false, message: 'Car already owned' };
  }

  this.inventory.cars.push({
    carId,
    customizations: {
      paintJob: customizations.paintJob || 'default',
      wheels: customizations.wheels || 'default',
      decals: customizations.decals || [],
      effects: customizations.effects || []
    }
  });

  return { success: true, message: 'Car added to inventory' };
};

// Add cosmetic item
userSchema.methods.addCosmetic = function(itemId, category, source = 'purchase') {
  const existingItem = this.inventory.cosmetics.find(item => item.itemId === itemId);
  if (existingItem) {
    return { success: false, message: 'Item already owned' };
  }

  this.inventory.cosmetics.push({
    itemId,
    category,
    source
  });

  return { success: true, message: 'Cosmetic added to inventory' };
};

// Update currency
userSchema.methods.updateCurrency = function(speedCoinsChange = 0, racePointsChange = 0) {
  this.wallet.speedCoins = Math.max(0, this.wallet.speedCoins + speedCoinsChange);
  this.wallet.racePoints = Math.max(0, this.wallet.racePoints + racePointsChange);

  if (speedCoinsChange > 0) {
    this.wallet.lifetimeEarned += speedCoinsChange;
  }
};

// Add XP and handle level up
userSchema.methods.addXP = function(xpGained) {
  this.progression.xp += xpGained;

  while (this.progression.xp >= this.progression.xpToNextLevel) {
    this.progression.xp -= this.progression.xpToNextLevel;
    this.progression.level++;
    this.progression.xpToNextLevel = Math.floor(1000 * Math.pow(1.15, this.progression.level - 1));

    // Level up rewards
    const coinsReward = this.progression.level * 50;
    this.updateCurrency(0, coinsReward);
  }

  return this.progression.level;
};

// Update skill rating with ELO-like system
userSchema.methods.updateSkillRating = function(opponentRating, finished, totalPlayers, position) {
  const K = 32; // K-factor
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - this.progression.skillRating) / 400));

  let actualScore;
  if (!finished) {
    actualScore = 0.1; // DNF penalty
  } else {
    actualScore = Math.max(0, (totalPlayers - position) / (totalPlayers - 1));
  }

  const ratingChange = Math.round(K * (actualScore - expectedScore));
  this.progression.skillRating = Math.max(100, this.progression.skillRating + ratingChange);

  // Update rank based on skill rating
  if (this.progression.skillRating >= 2000) this.progression.rank = 'Grandmaster';
  else if (this.progression.skillRating >= 1800) this.progression.rank = 'Master';
  else if (this.progression.skillRating >= 1600) this.progression.rank = 'Diamond';
  else if (this.progression.skillRating >= 1400) this.progression.rank = 'Platinum';
  else if (this.progression.skillRating >= 1200) this.progression.rank = 'Gold';
  else if (this.progression.skillRating >= 1000) this.progression.rank = 'Silver';
  else this.progression.rank = 'Bronze';

  return ratingChange;
};

module.exports = mongoose.model('User', userSchema);