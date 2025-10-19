const Tournament = require('../models/Tournament');
const { v4: uuidv4 } = require('uuid');

const defaultTournaments = [
  {
    name: 'Daily Speed Challenge',
    description: 'Quick daily tournament for all skill levels',
    type: 'single_race',
    format: 'free',
    skillLevel: 'all',
    entry: {
      fee: 0,
      maxParticipants: 50,
      minParticipants: 4,
      requirements: {
        minimumLevel: 1
      }
    },
    schedule: {
      registrationStart: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      registrationEnd: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      startTime: new Date(Date.now() + 2.5 * 60 * 60 * 1000), // 2.5 hours from now
      recurrence: {
        type: 'daily',
        interval: 1
      }
    },
    prizes: {
      totalPool: 1000, // 1000 race points
      currency: 'race_points',
      distribution: [
        { position: 1, amount: 500, percentage: 50 },
        { position: 2, amount: 300, percentage: 30 },
        { position: 3, amount: 200, percentage: 20 }
      ],
      guaranteedPool: true
    },
    raceSettings: {
      trackId: 'track_city_circuit',
      laps: 3,
      weather: 'clear',
      timeOfDay: 'noon',
      difficulty: 'medium',
      assistsAllowed: true
    },
    creator: {
      isOfficial: true
    }
  },

  {
    name: 'Premium Speed Coins Championship',
    description: 'High-stakes tournament with speed coins prizes',
    type: 'single_race',
    format: 'entry_fee',
    skillLevel: 'intermediate',
    entry: {
      fee: 100, // 100 speed coins
      maxParticipants: 20,
      minParticipants: 8,
      requirements: {
        minimumLevel: 10,
        minimumRank: 'Silver'
      }
    },
    schedule: {
      registrationStart: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      registrationEnd: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours from now
      startTime: new Date(Date.now() + 6.5 * 60 * 60 * 1000), // 6.5 hours from now
      recurrence: {
        type: 'weekly',
        interval: 1
      }
    },
    prizes: {
      totalPool: 0, // Will be calculated based on entry fees
      currency: 'speed_coins',
      distribution: [
        { position: 1, amount: 0, percentage: 40 },
        { position: 2, amount: 0, percentage: 25 },
        { position: 3, amount: 0, percentage: 15 },
        { position: 4, amount: 0, percentage: 10 },
        { position: 5, amount: 0, percentage: 10 }
      ],
      guaranteedPool: false
    },
    raceSettings: {
      trackId: 'track_mountain_pass',
      laps: 5,
      weather: 'random',
      timeOfDay: 'random',
      difficulty: 'hard',
      assistsAllowed: false
    },
    creator: {
      isOfficial: true
    }
  },

  {
    name: 'VIP Elite Championship',
    description: 'Exclusive tournament for premium subscribers only',
    type: 'championship',
    format: 'premium_only',
    skillLevel: 'expert',
    entry: {
      fee: 0,
      maxParticipants: 16,
      minParticipants: 8,
      requirements: {
        minimumLevel: 25,
        minimumRank: 'Gold',
        premiumRequired: true
      }
    },
    schedule: {
      registrationStart: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
      registrationEnd: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      startTime: new Date(Date.now() + 3.5 * 24 * 60 * 60 * 1000), // 3.5 days from now
      recurrence: {
        type: 'monthly',
        interval: 1
      }
    },
    prizes: {
      totalPool: 5000, // 5000 speed coins
      currency: 'speed_coins',
      distribution: [
        {
          position: 1,
          amount: 2000,
          percentage: 40,
          additional: {
            items: ['exclusive_vip_car', 'champion_title'],
            title: 'VIP Champion',
            badge: 'vip_elite_winner'
          }
        },
        {
          position: 2,
          amount: 1500,
          percentage: 30,
          additional: {
            items: ['exclusive_vip_decal'],
            title: 'VIP Runner-up'
          }
        },
        {
          position: 3,
          amount: 1000,
          percentage: 20,
          additional: {
            items: ['vip_bronze_badge']
          }
        },
        { position: 4, amount: 500, percentage: 10 }
      ],
      guaranteedPool: true,
      sponsored: {
        isSponsored: true,
        sponsor: 'Speed Rivals Elite',
        additionalPrizes: ['exclusive_car_skin', 'vip_access_token']
      }
    },
    raceSettings: {
      trackId: 'track_professional_circuit',
      laps: 7,
      weather: 'clear',
      timeOfDay: 'evening',
      difficulty: 'hard',
      assistsAllowed: false,
      ghostCars: false
    },
    creator: {
      isOfficial: true
    },
    series: {
      seriesId: 'vip_elite_series_2024',
      seriesName: 'VIP Elite Series 2024',
      round: 1,
      totalRounds: 12,
      championshipPoints: [
        { position: 1, points: 25 },
        { position: 2, points: 18 },
        { position: 3, points: 15 },
        { position: 4, points: 12 },
        { position: 5, points: 10 },
        { position: 6, points: 8 },
        { position: 7, points: 6 },
        { position: 8, points: 4 }
      ]
    },
    broadcast: {
      isStreamed: true,
      broadcastDelay: 30,
      language: 'en'
    }
  },

  {
    name: 'Beginner Welcome Cup',
    description: 'Perfect first tournament for new racers',
    type: 'single_race',
    format: 'free',
    skillLevel: 'beginner',
    entry: {
      fee: 0,
      maxParticipants: 32,
      minParticipants: 6,
      requirements: {
        minimumLevel: 1
      }
    },
    schedule: {
      registrationStart: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
      registrationEnd: new Date(Date.now() + 90 * 60 * 1000), // 1.5 hours from now
      startTime: new Date(Date.now() + 120 * 60 * 1000), // 2 hours from now
      recurrence: {
        type: 'daily',
        interval: 1
      }
    },
    prizes: {
      totalPool: 2000, // 2000 race points + bonuses
      currency: 'race_points',
      distribution: [
        {
          position: 1,
          amount: 800,
          additional: {
            items: ['beginner_champion_decal'],
            title: 'Rookie Champion'
          }
        },
        {
          position: 2,
          amount: 600,
          additional: {
            items: ['beginner_silver_decal']
          }
        },
        {
          position: 3,
          amount: 400,
          additional: {
            items: ['beginner_bronze_decal']
          }
        },
        { position: 4, amount: 200 }
      ],
      guaranteedPool: true
    },
    raceSettings: {
      trackId: 'track_training_circuit',
      laps: 2,
      weather: 'clear',
      timeOfDay: 'morning',
      difficulty: 'easy',
      assistsAllowed: true,
      ghostCars: true
    },
    creator: {
      isOfficial: true
    }
  },

  {
    name: 'Weekend Endurance Challenge',
    description: 'Test your stamina in this longer format race',
    type: 'endurance',
    format: 'entry_fee',
    skillLevel: 'advanced',
    entry: {
      fee: 250, // 250 speed coins
      maxParticipants: 24,
      minParticipants: 10,
      requirements: {
        minimumLevel: 20,
        minimumRank: 'Gold'
      }
    },
    schedule: {
      registrationStart: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      registrationEnd: new Date(Date.now() + 2.8 * 24 * 60 * 60 * 1000), // 2.8 days from now
      startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      duration: 60, // 60 minutes
      recurrence: {
        type: 'weekly',
        interval: 1
      }
    },
    prizes: {
      totalPool: 0, // Based on entry fees
      currency: 'speed_coins',
      distribution: [
        { position: 1, amount: 0, percentage: 35 },
        { position: 2, amount: 0, percentage: 25 },
        { position: 3, amount: 0, percentage: 20 },
        { position: 4, amount: 0, percentage: 10 },
        { position: 5, amount: 0, percentage: 10 }
      ],
      guaranteedPool: false
    },
    raceSettings: {
      trackId: 'track_endurance_circuit',
      laps: 15,
      weather: 'random',
      timeOfDay: 'random',
      difficulty: 'hard',
      assistsAllowed: true
    },
    creator: {
      isOfficial: true
    }
  }
];

const initializeTournaments = async () => {
  try {
    for (const tournamentData of defaultTournaments) {
      // Check if a similar tournament already exists
      const existingTournament = await Tournament.findOne({
        name: tournamentData.name,
        status: { $in: ['scheduled', 'registration_open'] }
      });

      if (!existingTournament) {
        const tournament = new Tournament({
          ...tournamentData,
          tournamentId: `tournament_${Date.now()}_${uuidv4().substring(0, 8)}`,
          status: 'scheduled'
        });

        await tournament.save();
        console.log(`✅ Created tournament: ${tournament.name}`);
      }
    }

    console.log('🏆 Tournaments initialization completed');
  } catch (error) {
    console.error('❌ Error initializing tournaments:', error);
  }
};

// Function to create recurring tournaments
const createRecurringTournaments = async () => {
  try {
    const now = new Date();
    const recurringTournaments = await Tournament.find({
      'schedule.recurrence.type': { $ne: 'none' },
      status: 'completed'
    });

    for (const tournament of recurringTournaments) {
      const { recurrence } = tournament.schedule;
      const nextStartTime = new Date(tournament.schedule.startTime);

      switch (recurrence.type) {
        case 'daily':
          nextStartTime.setDate(nextStartTime.getDate() + recurrence.interval);
          break;
        case 'weekly':
          nextStartTime.setDate(nextStartTime.getDate() + (7 * recurrence.interval));
          break;
        case 'monthly':
          nextStartTime.setMonth(nextStartTime.getMonth() + recurrence.interval);
          break;
      }

      // Only create if the next occurrence is in the future and within 7 days
      if (nextStartTime > now && nextStartTime <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)) {
        const newTournament = new Tournament({
          ...tournament.toObject(),
          _id: undefined,
          tournamentId: `tournament_${Date.now()}_${uuidv4().substring(0, 8)}`,
          participants: [],
          results: [],
          status: 'scheduled',
          analytics: {
            registrationCount: 0,
            checkInCount: 0,
            completionRate: 0,
            viewCount: 0,
            shareCount: 0
          },
          financials: {
            totalEntryFees: 0,
            totalPrizesPaid: 0,
            platformFee: 0,
            sponsorContribution: 0,
            netRevenue: 0
          },
          schedule: {
            ...tournament.schedule,
            registrationStart: new Date(nextStartTime.getTime() - 2 * 60 * 60 * 1000), // 2 hours before
            registrationEnd: new Date(nextStartTime.getTime() - 30 * 60 * 1000), // 30 minutes before
            startTime: nextStartTime
          },
          createdAt: now,
          updatedAt: now
        });

        await newTournament.save();
        console.log(`🔄 Created recurring tournament: ${newTournament.name} for ${nextStartTime}`);
      }
    }
  } catch (error) {
    console.error('❌ Error creating recurring tournaments:', error);
  }
};

// Function to update tournament statuses
const updateTournamentStatuses = async () => {
  try {
    const now = new Date();

    // Open registration for scheduled tournaments
    await Tournament.updateMany(
      {
        status: 'scheduled',
        'schedule.registrationStart': { $lte: now }
      },
      { status: 'registration_open' }
    );

    // Close registration for tournaments past registration end
    await Tournament.updateMany(
      {
        status: 'registration_open',
        'schedule.registrationEnd': { $lte: now }
      },
      { status: 'registration_closed' }
    );

    // Start tournaments that are ready
    const readyTournaments = await Tournament.find({
      status: 'registration_closed',
      'schedule.startTime': { $lte: now }
    });

    for (const tournament of readyTournaments) {
      if (tournament.participants.length >= tournament.entry.minParticipants) {
        tournament.status = 'in_progress';
        await tournament.save();
        console.log(`🏁 Started tournament: ${tournament.name}`);
      } else {
        // Cancel tournament due to insufficient participants
        tournament.status = 'cancelled';
        tournament.cancelReason = 'Insufficient participants';
        await tournament.save();
        console.log(`❌ Cancelled tournament: ${tournament.name} (insufficient participants)`);
      }
    }

  } catch (error) {
    console.error('❌ Error updating tournament statuses:', error);
  }
};

module.exports = {
  initializeTournaments,
  createRecurringTournaments,
  updateTournamentStatuses,
  defaultTournaments
};