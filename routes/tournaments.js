const express = require('express');
const router = express.Router();
const Tournament = require('../models/Tournament');
const User = require('../models/User');
const PaymentService = require('../services/PaymentService');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

/**
 * Get upcoming tournaments
 * GET /api/tournaments/upcoming
 */
router.get('/upcoming', async (req, res) => {
  try {
    const { skillLevel = 'all', limit = 10 } = req.query;

    const tournaments = await Tournament.getUpcoming(parseInt(limit), skillLevel);

    res.json({
      success: true,
      tournaments: tournaments
    });

  } catch (error) {
    console.error('Get upcoming tournaments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch upcoming tournaments'
    });
  }
});

/**
 * Get tournaments for authenticated user
 * GET /api/tournaments/for-me
 */
router.get('/for-me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const tournaments = await Tournament.getForUser(user);

    res.json({
      success: true,
      tournaments: tournaments
    });

  } catch (error) {
    console.error('Get user tournaments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tournaments'
    });
  }
});

/**
 * Get tournament details
 * GET /api/tournaments/:tournamentId
 */
router.get('/:tournamentId', async (req, res) => {
  try {
    const { tournamentId } = req.params;

    const tournament = await Tournament.findOne({ tournamentId })
      .populate('participants.userId', 'username progression.skillRating progression.rank')
      .populate('results.userId', 'username');

    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: 'Tournament not found'
      });
    }

    res.json({
      success: true,
      tournament: tournament
    });

  } catch (error) {
    console.error('Get tournament error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tournament'
    });
  }
});

/**
 * Register for tournament
 * POST /api/tournaments/:tournamentId/register
 */
router.post('/:tournamentId/register', authenticateToken, async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { carId } = req.body;
    const userId = req.user.id;

    const tournament = await Tournament.findOne({ tournamentId });
    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: 'Tournament not found'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Validate car selection
    if (carId) {
      const haseCar = user.inventory.cars.some(car => car.carId === carId);
      if (!hasCar) {
        return res.status(400).json({
          success: false,
          error: 'You do not own this car'
        });
      }

      // Check if car is allowed in tournament
      const requirements = tournament.entry.requirements;
      if (requirements.allowedCars && requirements.allowedCars.length > 0) {
        if (!requirements.allowedCars.includes(carId)) {
          return res.status(400).json({
            success: false,
            error: 'This car is not allowed in this tournament'
          });
        }
      }
    }

    // Register participant
    const registrationResult = tournament.registerParticipant(user, carId);
    if (!registrationResult.success) {
      return res.status(400).json({
        success: false,
        error: registrationResult.message
      });
    }

    await tournament.save();

    // Handle entry fee if required
    let paymentResult = null;
    if (tournament.entry.fee > 0) {
      // Deduct entry fee from user's speed coins
      if (user.wallet.speedCoins < tournament.entry.fee) {
        // Remove the participant we just added
        tournament.participants = tournament.participants.filter(
          p => p.userId.toString() !== userId.toString()
        );
        await tournament.save();

        return res.status(400).json({
          success: false,
          error: 'Insufficient speed coins for entry fee'
        });
      }

      user.wallet.speedCoins -= tournament.entry.fee;
      user.tournaments.totalEntryFees += tournament.entry.fee;

      // Record the payment
      paymentResult = await tournament.processEntryFee(userId, `tournament_${tournamentId}_${Date.now()}`);

      await user.save();
    }

    res.json({
      success: true,
      message: 'Successfully registered for tournament',
      entryFeePaid: tournament.entry.fee === 0 || paymentResult?.success,
      tournament: {
        id: tournament.tournamentId,
        name: tournament.name,
        entryFee: tournament.entry.fee,
        startTime: tournament.schedule.startTime
      }
    });

  } catch (error) {
    console.error('Tournament registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register for tournament'
    });
  }
});

/**
 * Unregister from tournament
 * POST /api/tournaments/:tournamentId/unregister
 */
router.post('/:tournamentId/unregister', authenticateToken, async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const userId = req.user.id;

    const tournament = await Tournament.findOne({ tournamentId });
    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: 'Tournament not found'
      });
    }

    // Check if user is registered
    const participantIndex = tournament.participants.findIndex(
      p => p.userId.toString() === userId.toString()
    );

    if (participantIndex === -1) {
      return res.status(400).json({
        success: false,
        error: 'Not registered for this tournament'
      });
    }

    // Check if tournament has started
    if (tournament.status === 'in_progress' || tournament.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Cannot unregister from started tournament'
      });
    }

    // Check refund policy (can only unregister 1 hour before start)
    const oneHourBeforeStart = new Date(tournament.schedule.startTime.getTime() - 60 * 60 * 1000);
    if (new Date() > oneHourBeforeStart) {
      return res.status(400).json({
        success: false,
        error: 'Cannot unregister less than 1 hour before tournament start'
      });
    }

    const participant = tournament.participants[participantIndex];

    // Refund entry fee if paid
    if (participant.entryFeePaid && tournament.entry.fee > 0) {
      const user = await User.findById(userId);
      user.wallet.speedCoins += tournament.entry.fee;
      user.tournaments.totalEntryFees -= tournament.entry.fee;
      await user.save();

      tournament.financials.totalEntryFees -= tournament.entry.fee;
    }

    // Remove participant
    tournament.participants.splice(participantIndex, 1);
    tournament.analytics.registrationCount = tournament.participants.length;

    await tournament.save();

    res.json({
      success: true,
      message: 'Successfully unregistered from tournament',
      refundAmount: participant.entryFeePaid ? tournament.entry.fee : 0
    });

  } catch (error) {
    console.error('Tournament unregistration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unregister from tournament'
    });
  }
});

/**
 * Get user's tournament history
 * GET /api/tournaments/history
 */
router.get('/user/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, status } = req.query;

    const query = {
      $or: [
        { 'participants.userId': userId },
        { 'results.userId': userId }
      ]
    };

    if (status) {
      query.status = status;
    }

    const tournaments = await Tournament.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('tournamentId name type status schedule entry prizes results');

    const total = await Tournament.countDocuments(query);

    // Add user-specific data to each tournament
    const enrichedTournaments = tournaments.map(tournament => {
      const participant = tournament.participants.find(p => p.userId.toString() === userId);
      const result = tournament.results.find(r => r.userId.toString() === userId);

      return {
        ...tournament.toObject(),
        userParticipation: {
          registered: !!participant,
          participated: !!result,
          position: result?.position,
          prizeWon: result?.prizeWon,
          entryFee: tournament.entry.fee,
          registrationTime: participant?.registrationTime
        }
      };
    });

    res.json({
      success: true,
      tournaments: enrichedTournaments,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total: total
      }
    });

  } catch (error) {
    console.error('Get tournament history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tournament history'
    });
  }
});

/**
 * Submit race result (for tournament participants)
 * POST /api/tournaments/:tournamentId/submit-result
 */
router.post('/:tournamentId/submit-result', authenticateToken, async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { finishTime, bestLapTime, finished = true } = req.body;
    const userId = req.user.id;

    const tournament = await Tournament.findOne({ tournamentId });
    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: 'Tournament not found'
      });
    }

    if (tournament.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        error: 'Tournament is not in progress'
      });
    }

    // Check if user is a participant
    const participant = tournament.participants.find(p => p.userId.toString() === userId);
    if (!participant) {
      return res.status(400).json({
        success: false,
        error: 'Not a participant in this tournament'
      });
    }

    // Calculate position based on finish time and existing results
    let position = 1;
    if (finished) {
      const finishedResults = tournament.results.filter(r => r.finished);
      position = finishedResults.filter(r => r.finishTime < finishTime).length + 1;
    } else {
      // DNF gets last position
      position = tournament.participants.length;
    }

    // Record the result
    const resultResponse = tournament.recordResult(userId, position, finishTime, bestLapTime, finished);
    if (!resultResponse.success) {
      return res.status(400).json({
        success: false,
        error: resultResponse.message
      });
    }

    await tournament.save();

    // Update user's racing statistics
    const user = await User.findById(userId);
    user.gameStats.totalRaces += 1;

    if (finished) {
      if (position === 1) {
        user.gameStats.wins += 1;
        user.gameStats.currentStreak += 1;
        user.gameStats.longestStreak = Math.max(user.gameStats.longestStreak, user.gameStats.currentStreak);
      } else {
        user.gameStats.currentStreak = 0;
      }

      if (position <= 3) {
        user.gameStats.podiumFinishes += 1;
      }

      // Update best lap time
      if (!user.gameStats.bestLapTime || bestLapTime < user.gameStats.bestLapTime) {
        user.gameStats.bestLapTime = bestLapTime;
      }

      // Update skill rating
      const averageOpponentRating = tournament.participants
        .filter(p => p.userId.toString() !== userId)
        .reduce((sum, p) => sum + (p.skillRating || 1000), 0) / (tournament.participants.length - 1);

      const ratingChange = user.updateSkillRating(averageOpponentRating, finished, tournament.participants.length, position);

      // Award prize if won
      const result = resultResponse.result;
      if (result.prizeWon && result.prizeWon.amount > 0) {
        user.updateCurrency(result.prizeWon.amount, 0);
        user.tournaments.totalWinnings += result.prizeWon.amount;
      }

      // Award XP based on performance
      let xpGain = 50; // Base XP
      if (position === 1) xpGain += 200;
      else if (position <= 3) xpGain += 100;
      else if (position <= 5) xpGain += 50;

      user.addXP(xpGain);
    }

    await user.save();

    // Check if tournament is complete (all participants finished)
    const allFinished = tournament.participants.every(p =>
      tournament.results.some(r => r.userId.toString() === p.userId.toString())
    );

    if (allFinished) {
      tournament.completeTournament();
      await tournament.save();
    }

    res.json({
      success: true,
      message: 'Result submitted successfully',
      result: resultResponse.result,
      tournamentComplete: allFinished
    });

  } catch (error) {
    console.error('Submit result error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit result'
    });
  }
});

/**
 * Get tournament leaderboard
 * GET /api/tournaments/:tournamentId/leaderboard
 */
router.get('/:tournamentId/leaderboard', async (req, res) => {
  try {
    const { tournamentId } = req.params;

    const tournament = await Tournament.findOne({ tournamentId })
      .populate('results.userId', 'username progression.rank')
      .select('tournamentId name results status');

    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: 'Tournament not found'
      });
    }

    // Sort results by position
    const leaderboard = tournament.results
      .sort((a, b) => a.position - b.position)
      .map(result => ({
        position: result.position,
        username: result.username,
        rank: result.userId?.progression?.rank || 'Unranked',
        finishTime: result.finishTime,
        bestLapTime: result.bestLapTime,
        finished: result.finished,
        prizeWon: result.prizeWon
      }));

    res.json({
      success: true,
      tournament: {
        id: tournament.tournamentId,
        name: tournament.name,
        status: tournament.status
      },
      leaderboard: leaderboard
    });

  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard'
    });
  }
});

/**
 * Get tournament statistics
 * GET /api/tournaments/stats
 */
router.get('/admin/stats', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const matchStage = {};
    if (startDate && endDate) {
      matchStage.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const stats = await Tournament.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$financials.netRevenue' },
          totalParticipants: { $sum: '$analytics.registrationCount' },
          averageEntryFee: { $avg: '$entry.fee' },
          completionRate: { $avg: '$analytics.completionRate' }
        }
      }
    ]);

    const totalTournaments = await Tournament.countDocuments(matchStage);
    const activeTournaments = await Tournament.countDocuments({
      ...matchStage,
      status: { $in: ['registration_open', 'in_progress'] }
    });

    res.json({
      success: true,
      stats: {
        byType: stats,
        totalTournaments: totalTournaments,
        activeTournaments: activeTournaments
      }
    });

  } catch (error) {
    console.error('Get tournament stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tournament stats'
    });
  }
});

/**
 * Create new tournament (admin only)
 * POST /api/tournaments/create
 */
router.post('/create', authenticateToken, async (req, res) => {
  try {
    // This would typically require admin privileges
    // For now, allowing any authenticated user to create tournaments

    const tournamentData = {
      ...req.body,
      tournamentId: `tournament_${Date.now()}_${uuidv4().substring(0, 8)}`,
      creator: {
        userId: req.user.id,
        isOfficial: false
      }
    };

    const tournament = new Tournament(tournamentData);
    await tournament.save();

    res.json({
      success: true,
      message: 'Tournament created successfully',
      tournament: {
        id: tournament.tournamentId,
        name: tournament.name,
        startTime: tournament.schedule.startTime
      }
    });

  } catch (error) {
    console.error('Create tournament error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;