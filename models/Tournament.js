const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  // Tournament identification
  tournamentId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },

  // Tournament type and format
  type: {
    type: String,
    required: true,
    enum: ['single_race', 'championship', 'elimination', 'time_trial', 'endurance']
  },
  format: {
    type: String,
    required: true,
    enum: ['free', 'entry_fee', 'premium_only', 'vip_only']
  },
  skillLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'expert', 'all'],
    default: 'all'
  },

  // Entry requirements and restrictions
  entry: {
    fee: {
      type: Number,
      default: 0, // In speed coins
      min: 0
    },
    maxParticipants: {
      type: Number,
      required: true,
      min: 2,
      max: 1000
    },
    minParticipants: {
      type: Number,
      default: 2,
      min: 2
    },
    requirements: {
      minimumLevel: { type: Number, default: 1 },
      minimumRank: { type: String },
      premiumRequired: { type: Boolean, default: false },
      allowedCars: [{ type: String }], // Specific car IDs allowed
      carCategory: { type: String, enum: ['sport', 'classic', 'electric', 'formula', 'exotic'] }
    }
  },

  // Scheduling
  schedule: {
    registrationStart: { type: Date, required: true },
    registrationEnd: { type: Date, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    timezone: { type: String, default: 'UTC' },
    duration: { type: Number }, // Expected duration in minutes
    recurrence: {
      type: { type: String, enum: ['none', 'daily', 'weekly', 'monthly'], default: 'none' },
      interval: { type: Number, default: 1 },
      endDate: { type: Date }
    }
  },

  // Prize structure
  prizes: {
    totalPool: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      enum: ['speed_coins', 'race_points', 'real_money'],
      default: 'speed_coins'
    },
    distribution: [{
      position: { type: Number, required: true }, // 1st, 2nd, 3rd, etc.
      amount: { type: Number, required: true },
      percentage: { type: Number }, // Percentage of total pool
      additional: {
        items: [{ type: String }], // Cosmetic items, cars, etc.
        title: { type: String }, // Special titles
        badge: { type: String } // Achievement badges
      }
    }],
    guaranteedPool: { type: Boolean, default: false }, // Pool guaranteed regardless of entries
    sponsored: {
      isSponsored: { type: Boolean, default: false },
      sponsor: { type: String },
      additionalPrizes: [{ type: String }]
    }
  },

  // Track and race settings
  raceSettings: {
    trackId: { type: String, required: true },
    laps: { type: Number, default: 3, min: 1 },
    weather: { type: String, enum: ['clear', 'rain', 'storm', 'random'], default: 'clear' },
    timeOfDay: { type: String, enum: ['morning', 'noon', 'evening', 'night', 'random'], default: 'noon' },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    assistsAllowed: { type: Boolean, default: true },
    ghostCars: { type: Boolean, default: false }
  },

  // Participants and results
  participants: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    carId: { type: String },
    skillRating: { type: Number },
    registrationTime: { type: Date, default: Date.now },
    status: { type: String, enum: ['registered', 'checked_in', 'racing', 'finished', 'disqualified'], default: 'registered' },
    checkInTime: { type: Date },
    entryFeePaid: { type: Boolean, default: false },
    paymentId: { type: String }
  }],

  // Race results
  results: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    position: { type: Number, required: true },
    finishTime: { type: Number }, // Total race time in milliseconds
    bestLapTime: { type: Number }, // Best lap time in milliseconds
    totalLaps: { type: Number },
    finished: { type: Boolean, default: true },
    disqualified: { type: Boolean, default: false },
    disqualificationReason: { type: String },
    prizeWon: {
      amount: { type: Number, default: 0 },
      items: [{ type: String }],
      title: { type: String },
      badge: { type: String }
    }
  }],

  // Tournament status
  status: {
    type: String,
    enum: ['scheduled', 'registration_open', 'registration_closed', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  cancelReason: {
    type: String
  },

  // Financial tracking
  financials: {
    totalEntryFees: { type: Number, default: 0 },
    totalPrizesPaid: { type: Number, default: 0 },
    platformFee: { type: Number, default: 0 }, // Platform's cut
    sponsorContribution: { type: Number, default: 0 },
    netRevenue: { type: Number, default: 0 }
  },

  // Analytics and metadata
  analytics: {
    registrationCount: { type: Number, default: 0 },
    checkInCount: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 },
    averageFinishTime: { type: Number },
    fastestLap: { type: Number },
    viewCount: { type: Number, default: 0 },
    shareCount: { type: Number, default: 0 }
  },

  // Tournament series (if part of a larger series)
  series: {
    seriesId: { type: String },
    seriesName: { type: String },
    round: { type: Number },
    totalRounds: { type: Number },
    championshipPoints: [{
      position: { type: Number },
      points: { type: Number }
    }]
  },

  // Streaming and broadcast
  broadcast: {
    isStreamed: { type: Boolean, default: false },
    streamUrl: { type: String },
    broadcastDelay: { type: Number, default: 0 }, // Delay in seconds
    commentators: [{ type: String }],
    language: { type: String, default: 'en' }
  },

  // Rules and regulations
  rules: {
    customRules: { type: String },
    penaltySystem: { type: Boolean, default: true },
    contactAllowed: { type: Boolean, default: true },
    timeoutDuration: { type: Number, default: 300 }, // Seconds to join race
    maxRetries: { type: Number, default: 0 }
  },

  // Creator and moderation
  creator: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isOfficial: { type: Boolean, default: false },
    moderators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
tournamentSchema.index({ status: 1, 'schedule.startTime': 1 });
tournamentSchema.index({ 'schedule.registrationStart': 1, 'schedule.registrationEnd': 1 });
tournamentSchema.index({ format: 1, 'entry.fee': 1 });
tournamentSchema.index({ type: 1, skillLevel: 1 });
// tournamentId already has unique: true in schema definition
tournamentSchema.index({ 'participants.userId': 1 });
tournamentSchema.index({ createdAt: -1 });

// Virtual for registration status
tournamentSchema.virtual('registrationOpen').get(function() {
  const now = new Date();
  return this.schedule.registrationStart <= now &&
         this.schedule.registrationEnd >= now &&
         this.participants.length < this.entry.maxParticipants;
});

// Virtual for is full
tournamentSchema.virtual('isFull').get(function() {
  return this.participants.length >= this.entry.maxParticipants;
});

// Virtual for can start
tournamentSchema.virtual('canStart').get(function() {
  return this.participants.length >= this.entry.minParticipants &&
         new Date() >= this.schedule.startTime &&
         this.status === 'registration_closed';
});

// Virtual for total prize pool
tournamentSchema.virtual('totalPrizePool').get(function() {
  if (this.prizes.guaranteedPool) {
    return this.prizes.totalPool;
  }

  const entryFeeTotal = this.participants.length * this.entry.fee;
  const platformCut = entryFeeTotal * 0.1; // 10% platform fee
  return Math.max(0, entryFeeTotal - platformCut + (this.prizes.sponsored.isSponsored ? this.financials.sponsorContribution : 0));
});

// Static method to get upcoming tournaments
tournamentSchema.statics.getUpcoming = function(limit = 10, skillLevel = 'all') {
  const query = {
    status: { $in: ['scheduled', 'registration_open'] },
    'schedule.startTime': { $gte: new Date() }
  };

  if (skillLevel !== 'all') {
    query.skillLevel = { $in: [skillLevel, 'all'] };
  }

  return this.find(query)
    .sort({ 'schedule.startTime': 1 })
    .limit(limit);
};

// Static method to get tournaments by user skill
tournamentSchema.statics.getForUser = function(user) {
  const now = new Date();
  const query = {
    status: { $in: ['scheduled', 'registration_open'] },
    'schedule.registrationEnd': { $gte: now },
    $or: [
      { skillLevel: 'all' },
      { skillLevel: this.getUserSkillLevel(user) }
    ]
  };

  // Add level requirement check
  if (user.progression.level) {
    query['$and'] = [
      { $or: [
        { 'entry.requirements.minimumLevel': { $exists: false } },
        { 'entry.requirements.minimumLevel': { $lte: user.progression.level } }
      ]}
    ];
  }

  return this.find(query)
    .sort({ 'schedule.startTime': 1 });
};

// Helper method to determine user skill level
tournamentSchema.statics.getUserSkillLevel = function(user) {
  const rating = user.progression.skillRating;
  if (rating >= 1600) return 'expert';
  if (rating >= 1400) return 'advanced';
  if (rating >= 1200) return 'intermediate';
  return 'beginner';
};

// Method to register participant
tournamentSchema.methods.registerParticipant = function(user, carId) {
  // Check if tournament is open for registration
  if (!this.registrationOpen) {
    return { success: false, message: 'Registration is not open' };
  }

  // Check if user is already registered
  const existingParticipant = this.participants.find(p => p.userId.toString() === user._id.toString());
  if (existingParticipant) {
    return { success: false, message: 'Already registered for this tournament' };
  }

  // Check requirements
  const requirements = this.entry.requirements;
  if (requirements.minimumLevel && user.progression.level < requirements.minimumLevel) {
    return { success: false, message: `Requires level ${requirements.minimumLevel}` };
  }

  if (requirements.premiumRequired && !user.isSubscriptionActive) {
    return { success: false, message: 'Requires premium subscription' };
  }

  // Check if user has enough coins for entry fee
  if (this.entry.fee > user.wallet.speedCoins) {
    return { success: false, message: 'Insufficient speed coins' };
  }

  // Add participant
  this.participants.push({
    userId: user._id,
    username: user.username,
    carId: carId,
    skillRating: user.progression.skillRating,
    entryFeePaid: this.entry.fee === 0
  });

  this.analytics.registrationCount = this.participants.length;

  return { success: true, message: 'Successfully registered' };
};

// Method to process entry fee payment
tournamentSchema.methods.processEntryFee = function(userId, paymentId) {
  const participant = this.participants.find(p => p.userId.toString() === userId.toString());
  if (!participant) {
    return { success: false, message: 'Not registered for tournament' };
  }

  participant.entryFeePaid = true;
  participant.paymentId = paymentId;

  this.financials.totalEntryFees += this.entry.fee;

  return { success: true, message: 'Entry fee processed' };
};

// Method to start tournament
tournamentSchema.methods.startTournament = function() {
  if (!this.canStart) {
    return { success: false, message: 'Cannot start tournament' };
  }

  this.status = 'in_progress';

  // Move all registered participants to checked_in status
  this.participants.forEach(participant => {
    if (participant.entryFeePaid) {
      participant.status = 'checked_in';
      participant.checkInTime = new Date();
    }
  });

  this.analytics.checkInCount = this.participants.filter(p => p.status === 'checked_in').length;

  return { success: true, message: 'Tournament started' };
};

// Method to record race result
tournamentSchema.methods.recordResult = function(userId, position, finishTime, bestLapTime, finished = true) {
  const participant = this.participants.find(p => p.userId.toString() === userId.toString());
  if (!participant) {
    return { success: false, message: 'User not in tournament' };
  }

  // Remove existing result if any
  this.results = this.results.filter(r => r.userId.toString() !== userId.toString());

  // Add new result
  const result = {
    userId: userId,
    username: participant.username,
    position: position,
    finishTime: finishTime,
    bestLapTime: bestLapTime,
    totalLaps: this.raceSettings.laps,
    finished: finished
  };

  // Calculate prize if applicable
  const prizeDistribution = this.prizes.distribution.find(p => p.position === position);
  if (prizeDistribution) {
    result.prizeWon = {
      amount: prizeDistribution.amount,
      items: prizeDistribution.additional.items || [],
      title: prizeDistribution.additional.title,
      badge: prizeDistribution.additional.badge
    };
  }

  this.results.push(result);
  participant.status = 'finished';

  return { success: true, result: result };
};

// Method to complete tournament
tournamentSchema.methods.completeTournament = function() {
  this.status = 'completed';

  // Calculate completion rate
  this.analytics.completionRate = (this.results.length / this.analytics.checkInCount * 100).toFixed(1);

  // Calculate average finish time
  const finishedResults = this.results.filter(r => r.finished);
  if (finishedResults.length > 0) {
    this.analytics.averageFinishTime = finishedResults.reduce((sum, r) => sum + r.finishTime, 0) / finishedResults.length;
  }

  // Find fastest lap
  this.analytics.fastestLap = Math.min(...this.results.map(r => r.bestLapTime).filter(t => t));

  // Calculate financials
  this.financials.totalPrizesPaid = this.results.reduce((sum, r) => sum + (r.prizeWon.amount || 0), 0);
  this.financials.platformFee = this.financials.totalEntryFees * 0.1;
  this.financials.netRevenue = this.financials.totalEntryFees - this.financials.totalPrizesPaid - this.financials.platformFee;

  return { success: true, message: 'Tournament completed' };
};

module.exports = mongoose.model('Tournament', tournamentSchema);