const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const User = require('../models/User');
const Tournament = require('../models/Tournament');
const Product = require('../models/Product');
const { authenticateAdmin } = require('../middleware/auth');
const { logger } = require('../utils/logger');

/**
 * Client-side error reporting endpoint
 * POST /api/analytics/client-error
 */
router.post('/client-error', async (req, res) => {
  try {
    const { error, stack, userAgent, timestamp, url } = req.body;
    
    // Log client-side errors
    logger.error('Client-side error reported', {
      error,
      stack,
      userAgent,
      timestamp,
      url,
      ip: req.ip
    });
    
    res.json({ success: true, message: 'Error logged' });
  } catch (error) {
    logger.error('Failed to log client error', { error: error.message });
    res.status(500).json({ error: 'Failed to log error' });
  }
});

/**
 * Get revenue dashboard data
 * GET /api/analytics/revenue
 */
router.get('/revenue', authenticateAdmin, async (req, res) => {
  try {
    const { period = '30d', startDate, endDate } = req.query;

    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      end = new Date();
      start = new Date();

      switch (period) {
        case '7d':
          start.setDate(start.getDate() - 7);
          break;
        case '30d':
          start.setDate(start.getDate() - 30);
          break;
        case '90d':
          start.setDate(start.getDate() - 90);
          break;
        case '1y':
          start.setFullYear(start.getFullYear() - 1);
          break;
        default:
          start.setDate(start.getDate() - 30);
      }
    }

    // Overall revenue stats
    const revenueStats = await Payment.aggregate([
      {
        $match: {
          status: 'succeeded',
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$revenue.net' },
          totalTransactions: { $sum: 1 },
          averageOrderValue: { $avg: '$amount' },
          totalCustomers: { $addToSet: '$userId' }
        }
      }
    ]);

    // Revenue by product type
    const revenueByType = await Payment.aggregate([
      {
        $match: {
          status: 'succeeded',
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$productType',
          revenue: { $sum: '$revenue.net' },
          transactions: { $sum: 1 },
          avgOrderValue: { $avg: '$amount' }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    // Daily revenue trend
    const dailyRevenue = await Payment.aggregate([
      {
        $match: {
          status: 'succeeded',
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          revenue: { $sum: '$revenue.net' },
          transactions: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Top products by revenue
    const topProducts = await Payment.aggregate([
      {
        $match: {
          status: 'succeeded',
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            productId: '$productId',
            productName: '$productName',
            productType: '$productType'
          },
          revenue: { $sum: '$revenue.net' },
          sales: { $sum: 1 },
          customers: { $addToSet: '$userId' }
        }
      },
      {
        $project: {
          productId: '$_id.productId',
          productName: '$_id.productName',
          productType: '$_id.productType',
          revenue: 1,
          sales: 1,
          uniqueCustomers: { $size: '$customers' }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]);

    // Revenue by country
    const revenueByCountry = await Payment.aggregate([
      {
        $match: {
          status: 'succeeded',
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$customerInfo.country',
          revenue: { $sum: '$revenue.net' },
          transactions: { $sum: 1 }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]);

    const stats = revenueStats[0] || {
      totalRevenue: 0,
      totalTransactions: 0,
      averageOrderValue: 0,
      totalCustomers: []
    };

    // Calculate revenue growth compared to previous period
    const periodDuration = end.getTime() - start.getTime();
    const previousStart = new Date(start.getTime() - periodDuration);
    const previousEnd = new Date(start.getTime());

    const previousRevenueStats = await Payment.aggregate([
      {
        $match: {
          status: 'succeeded',
          createdAt: { $gte: previousStart, $lt: previousEnd }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$revenue.net' }
        }
      }
    ]);

    const previousRevenue = previousRevenueStats[0]?.totalRevenue || 0;
    const currentRevenue = stats.totalRevenue;
    const revenueGrowth = previousRevenue > 0 
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
      : currentRevenue > 0 ? 100 : 0;

    res.json({
      success: true,
      period: { start, end },
      overview: {
        totalRevenue: stats.totalRevenue / 100, // Convert to dollars
        totalTransactions: stats.totalTransactions,
        averageOrderValue: stats.averageOrderValue / 100,
        totalCustomers: stats.totalCustomers.length,
        revenueGrowth: parseFloat(revenueGrowth.toFixed(2))
      },
      revenueByType: revenueByType.map(item => ({
        ...item,
        revenue: item.revenue / 100,
        avgOrderValue: item.avgOrderValue / 100
      })),
      dailyRevenue: dailyRevenue.map(item => ({
        date: item._id,
        revenue: item.revenue / 100,
        transactions: item.transactions
      })),
      topProducts: topProducts.map(item => ({
        ...item,
        revenue: item.revenue / 100
      })),
      revenueByCountry: revenueByCountry.map(item => ({
        country: item._id || 'Unknown',
        revenue: item.revenue / 100,
        transactions: item.transactions
      }))
    });

  } catch (error) {
    console.error('Revenue analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch revenue analytics'
    });
  }
});

/**
 * Get user analytics
 * GET /api/analytics/users
 */
router.get('/users', authenticateAdmin, async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - parseInt(period.replace('d', '')));

    // User registration trends
    const userRegistrations = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          registrations: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // User lifetime value distribution
    const ltv = await User.aggregate([
      {
        $project: {
          ltvRange: {
            $switch: {
              branches: [
                { case: { $eq: ['$wallet.lifetimeSpent', 0] }, then: 'free' },
                { case: { $lt: ['$wallet.lifetimeSpent', 1000] }, then: '$1-$10' },
                { case: { $lt: ['$wallet.lifetimeSpent', 5000] }, then: '$10-$50' },
                { case: { $lt: ['$wallet.lifetimeSpent', 10000] }, then: '$50-$100' },
                { case: { $gte: ['$wallet.lifetimeSpent', 10000] }, then: '$100+' }
              ],
              default: 'free'
            }
          }
        }
      },
      {
        $group: {
          _id: '$ltvRange',
          count: { $sum: 1 }
        }
      }
    ]);

    // Active users (last 7 days)
    const activeUsers = await User.countDocuments({
      'security.lastLoginIP': { $exists: true },
      updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    // Premium subscribers
    const premiumSubscribers = await User.countDocuments({
      'subscription.isActive': true,
      'subscription.endDate': { $gte: new Date() }
    });

    // User progression stats
    const progressionStats = await User.aggregate([
      {
        $group: {
          _id: '$progression.rank',
          count: { $sum: 1 },
          avgLevel: { $avg: '$progression.level' },
          avgSkillRating: { $avg: '$progression.skillRating' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      overview: {
        totalUsers: await User.countDocuments(),
        activeUsers: activeUsers,
        premiumSubscribers: premiumSubscribers,
        conversionRate: premiumSubscribers > 0 ? (premiumSubscribers / await User.countDocuments() * 100).toFixed(2) : 0
      },
      registrationTrend: userRegistrations,
      lifetimeValueDistribution: ltv,
      progressionDistribution: progressionStats
    });

  } catch (error) {
    console.error('User analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user analytics'
    });
  }
});

/**
 * Get tournament analytics
 * GET /api/analytics/tournaments
 */
router.get('/tournaments', authenticateAdmin, async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - parseInt(period.replace('d', '')));

    // Tournament participation stats
    const tournamentStats = await Tournament.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalParticipants: { $sum: '$analytics.registrationCount' },
          totalRevenue: { $sum: '$financials.netRevenue' },
          avgCompletionRate: { $avg: '$analytics.completionRate' }
        }
      }
    ]);

    // Tournament revenue by type
    const revenueByType = await Tournament.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$type',
          revenue: { $sum: '$financials.netRevenue' },
          tournaments: { $sum: 1 },
          participants: { $sum: '$analytics.registrationCount' }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    // Most popular tournaments
    const popularTournaments = await Tournament.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $project: {
          name: 1,
          type: 1,
          participantCount: '$analytics.registrationCount',
          completionRate: '$analytics.completionRate',
          revenue: '$financials.netRevenue'
        }
      },
      { $sort: { participantCount: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      overview: {
        totalTournaments: await Tournament.countDocuments({
          createdAt: { $gte: start, $lte: end }
        }),
        activeTournaments: await Tournament.countDocuments({
          status: { $in: ['registration_open', 'in_progress'] }
        }),
        totalParticipants: tournamentStats.reduce((sum, stat) => sum + stat.totalParticipants, 0),
        totalRevenue: tournamentStats.reduce((sum, stat) => sum + stat.totalRevenue, 0) / 100
      },
      statusDistribution: tournamentStats,
      revenueByType: revenueByType.map(item => ({
        ...item,
        revenue: item.revenue / 100
      })),
      popularTournaments: popularTournaments.map(item => ({
        ...item,
        revenue: item.revenue / 100
      }))
    });

  } catch (error) {
    console.error('Tournament analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tournament analytics'
    });
  }
});

/**
 * Get conversion funnel data
 * GET /api/analytics/conversion
 */
router.get('/conversion', authenticateAdmin, async (req, res) => {
  try {
    // Conversion funnel: Registration -> First Purchase -> Subscription -> High LTV
    const totalUsers = await User.countDocuments();

    const firstPurchaseUsers = await User.countDocuments({
      'wallet.lifetimeSpent': { $gt: 0 }
    });

    const subscribedUsers = await User.countDocuments({
      'subscription.isActive': true
    });

    const highLTVUsers = await User.countDocuments({
      'wallet.lifetimeSpent': { $gte: 5000 } // $50+
    });

    // Time to first purchase
    const timeToFirstPurchase = await Payment.aggregate([
      {
        $match: {
          status: 'succeeded'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          daysBetween: {
            $divide: [
              { $subtract: ['$createdAt', '$user.createdAt'] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgDaysToFirstPurchase: { $avg: '$daysBetween' },
          medianDaysToFirstPurchase: { $median: '$daysBetween' }
        }
      }
    ]);

    res.json({
      success: true,
      funnel: {
        totalRegistrations: totalUsers,
        firstPurchase: {
          count: firstPurchaseUsers,
          conversionRate: ((firstPurchaseUsers / totalUsers) * 100).toFixed(2)
        },
        subscription: {
          count: subscribedUsers,
          conversionRate: ((subscribedUsers / totalUsers) * 100).toFixed(2)
        },
        highLTV: {
          count: highLTVUsers,
          conversionRate: ((highLTVUsers / totalUsers) * 100).toFixed(2)
        }
      },
      timeToFirstPurchase: timeToFirstPurchase[0] || {
        avgDaysToFirstPurchase: 0,
        medianDaysToFirstPurchase: 0
      }
    });

  } catch (error) {
    console.error('Conversion analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversion analytics'
    });
  }
});

/**
 * Get real-time dashboard data
 * GET /api/analytics/realtime
 */
router.get('/realtime', authenticateAdmin, async (req, res) => {
  try {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);

    // Recent transactions
    const recentTransactions = await Payment.find({
      status: 'succeeded',
      createdAt: { $gte: lastHour }
    })
    .populate('userId', 'username')
    .sort({ createdAt: -1 })
    .limit(10)
    .select('amount productName userId createdAt');

    // Active tournaments
    const activeTournaments = await Tournament.find({
      status: { $in: ['registration_open', 'in_progress'] }
    })
    .select('name status analytics.registrationCount entry.maxParticipants schedule.startTime')
    .limit(5);

    // 24-hour stats
    const last24hStats = await Payment.aggregate([
      {
        $match: {
          status: 'succeeded',
          createdAt: { $gte: last24Hours }
        }
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$revenue.net' },
          transactions: { $sum: 1 },
          customers: { $addToSet: '$userId' }
        }
      }
    ]);

    const stats = last24hStats[0] || { revenue: 0, transactions: 0, customers: [] };

    res.json({
      success: true,
      last24Hours: {
        revenue: stats.revenue / 100,
        transactions: stats.transactions,
        uniqueCustomers: stats.customers.length
      },
      recentTransactions: recentTransactions.map(tx => ({
        id: tx._id,
        amount: tx.amount / 100,
        product: tx.productName,
        customer: tx.userId?.username || 'Anonymous',
        time: tx.createdAt
      })),
      activeTournaments: activeTournaments.map(tournament => ({
        name: tournament.name,
        status: tournament.status,
        participants: tournament.analytics.registrationCount,
        maxParticipants: tournament.entry.maxParticipants,
        startTime: tournament.schedule.startTime
      }))
    });

  } catch (error) {
    console.error('Realtime analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch realtime analytics'
    });
  }
});

module.exports = router;