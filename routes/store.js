const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const User = require('../models/User');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

/**
 * Get all products in store
 * GET /api/store/products
 */
router.get('/products', optionalAuth, async (req, res) => {
  try {
    const {
      category,
      subcategory,
      rarity,
      minPrice,
      maxPrice,
      featured,
      onSale,
      page = 1,
      limit = 20,
      sort = 'popular'
    } = req.query;

    // Build query
    const query = {
      'availability.isActive': true,
      'availability.releaseDate': { $lte: new Date() }
    };

    if (category) query.category = category;
    if (subcategory) query.subcategory = subcategory;
    if (rarity) {
      if (category === 'car') query['carDetails.rarity'] = rarity;
      if (category === 'cosmetic') query['cosmeticDetails.rarity'] = rarity;
    }
    if (minPrice) query['pricing.basePrice'] = { $gte: parseInt(minPrice) };
    if (maxPrice) {
      query['pricing.basePrice'] = {
        ...query['pricing.basePrice'],
        $lte: parseInt(maxPrice)
      };
    }
    if (featured === 'true') query['promotions.isFeatured'] = true;
    if (onSale === 'true') {
      query['pricing.discountValidUntil'] = { $gt: new Date() };
    }

    // Sort options
    let sortOption = {};
    switch (sort) {
      case 'popular':
        sortOption = { 'analytics.totalSales': -1 };
        break;
      case 'newest':
        sortOption = { 'availability.releaseDate': -1 };
        break;
      case 'price_low':
        sortOption = { 'pricing.basePrice': 1 };
        break;
      case 'price_high':
        sortOption = { 'pricing.basePrice': -1 };
        break;
      case 'rating':
        sortOption = { 'analytics.averageRating': -1 };
        break;
      default:
        sortOption = { 'analytics.totalSales': -1 };
    }

    const products = await Product.find(query)
      .sort(sortOption)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-analytics -abTesting');

    const total = await Product.countDocuments(query);

    // If user is authenticated, check purchase eligibility
    if (req.user) {
      const user = await User.findById(req.user.id);
      products.forEach(product => {
        const purchaseCheck = product.canUserPurchase(user);
        product._doc.canPurchase = purchaseCheck.canPurchase;
        product._doc.purchaseReasons = purchaseCheck.reasons;
      });
    }

    res.json({
      success: true,
      products: products,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total: total
      }
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products'
    });
  }
});

/**
 * Get featured products
 * GET /api/store/featured
 */
router.get('/featured', async (req, res) => {
  try {
    const products = await Product.getFeatured(8);

    res.json({
      success: true,
      products: products
    });

  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch featured products'
    });
  }
});

/**
 * Get products by category
 * GET /api/store/category/:category
 */
router.get('/category/:category', optionalAuth, async (req, res) => {
  try {
    const { category } = req.params;
    const { subcategory, limit = 20 } = req.query;

    const filters = {};
    if (subcategory) filters.subcategory = subcategory;

    const products = await Product.getByCategory(category, filters)
      .limit(parseInt(limit));

    // If user is authenticated, check purchase eligibility
    if (req.user) {
      const user = await User.findById(req.user.id);
      products.forEach(product => {
        const purchaseCheck = product.canUserPurchase(user);
        product._doc.canPurchase = purchaseCheck.canPurchase;
        product._doc.purchaseReasons = purchaseCheck.reasons;
      });
    }

    res.json({
      success: true,
      products: products
    });

  } catch (error) {
    console.error('Get category products error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch category products'
    });
  }
});

/**
 * Get single product details
 * GET /api/store/product/:productId
 */
router.get('/product/:productId', optionalAuth, async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findOne({ productId });
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Increment view count
    product.analytics.viewCount += 1;
    await product.save();

    let responseData = {
      success: true,
      product: product
    };

    // If user is authenticated, check purchase eligibility
    if (req.user) {
      const user = await User.findById(req.user.id);
      const purchaseCheck = product.canUserPurchase(user);
      responseData.canPurchase = purchaseCheck.canPurchase;
      responseData.purchaseReasons = purchaseCheck.reasons;
    }

    res.json(responseData);

  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product'
    });
  }
});

/**
 * Search products
 * GET /api/store/search
 */
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const { q, category, page = 1, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters'
      });
    }

    const filters = {};
    if (category) filters.category = category;

    const products = await Product.search(q.trim(), filters)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // If user is authenticated, check purchase eligibility
    if (req.user) {
      const user = await User.findById(req.user.id);
      products.forEach(product => {
        const purchaseCheck = product.canUserPurchase(user);
        product._doc.canPurchase = purchaseCheck.canPurchase;
        product._doc.purchaseReasons = purchaseCheck.reasons;
      });
    }

    res.json({
      success: true,
      products: products,
      query: q.trim()
    });

  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search products'
    });
  }
});

/**
 * Get car packs
 * GET /api/store/car-packs
 */
router.get('/car-packs', async (req, res) => {
  try {
    const carPacks = await Product.find({
      category: 'car',
      'carDetails.category': { $exists: true },
      'availability.isActive': true
    })
    .sort({ 'analytics.totalSales': -1 });

    // Group by car category
    const packsByCategory = {
      sport: [],
      classic: [],
      electric: [],
      formula: [],
      exotic: []
    };

    carPacks.forEach(car => {
      const category = car.carDetails.category;
      if (packsByCategory[category]) {
        packsByCategory[category].push(car);
      }
    });

    res.json({
      success: true,
      carPacks: packsByCategory
    });

  } catch (error) {
    console.error('Get car packs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch car packs'
    });
  }
});

/**
 * Get currency packages
 * GET /api/store/currency-packages
 */
router.get('/currency-packages', async (req, res) => {
  try {
    const packages = await Product.find({
      category: 'currency',
      'availability.isActive': true
    })
    .sort({ 'pricing.basePrice': 1 });

    res.json({
      success: true,
      packages: packages
    });

  } catch (error) {
    console.error('Get currency packages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch currency packages'
    });
  }
});

/**
 * Get battle pass information
 * GET /api/store/battle-pass
 */
router.get('/battle-pass', optionalAuth, async (req, res) => {
  try {
    const currentSeason = 'season_1'; // This would be dynamic based on current date

    const battlePass = await Product.findOne({
      category: 'battlepass',
      'battlePassDetails.season': currentSeason,
      'availability.isActive': true
    });

    if (!battlePass) {
      return res.status(404).json({
        success: false,
        error: 'No active battle pass found'
      });
    }

    let responseData = {
      success: true,
      battlePass: battlePass
    };

    // If user is authenticated, add their progress
    if (req.user) {
      const user = await User.findById(req.user.id);
      responseData.userProgress = {
        tier: user.battlePass.tier || 0,
        xp: user.battlePass.xp || 0,
        isPremium: user.battlePass.isPremium || false,
        claimedRewards: user.battlePass.claimedRewards || []
      };
    }

    res.json(responseData);

  } catch (error) {
    console.error('Get battle pass error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch battle pass'
    });
  }
});

/**
 * Get subscription plans
 * GET /api/store/subscriptions
 */
router.get('/subscriptions', async (req, res) => {
  try {
    const subscriptions = await Product.find({
      category: 'subscription',
      'availability.isActive': true
    })
    .sort({ 'pricing.basePrice': 1 });

    res.json({
      success: true,
      subscriptions: subscriptions
    });

  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscriptions'
    });
  }
});

/**
 * Add product to wishlist
 * POST /api/store/wishlist/add
 */
router.post('/wishlist/add', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user.id;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'Product ID is required'
      });
    }

    const product = await Product.findOne({ productId });
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    const user = await User.findById(userId);
    if (!user.wishlist) user.wishlist = [];

    if (!user.wishlist.includes(productId)) {
      user.wishlist.push(productId);
      product.analytics.wishlistCount += 1;

      await user.save();
      await product.save();
    }

    res.json({
      success: true,
      message: 'Product added to wishlist'
    });

  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add to wishlist'
    });
  }
});

/**
 * Remove product from wishlist
 * POST /api/store/wishlist/remove
 */
router.post('/wishlist/remove', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (user.wishlist && user.wishlist.includes(productId)) {
      user.wishlist = user.wishlist.filter(id => id !== productId);

      const product = await Product.findOne({ productId });
      if (product) {
        product.analytics.wishlistCount = Math.max(0, product.analytics.wishlistCount - 1);
        await product.save();
      }

      await user.save();
    }

    res.json({
      success: true,
      message: 'Product removed from wishlist'
    });

  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove from wishlist'
    });
  }
});

/**
 * Get user's wishlist
 * GET /api/store/wishlist
 */
router.get('/wishlist', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.wishlist || user.wishlist.length === 0) {
      return res.json({
        success: true,
        products: []
      });
    }

    const products = await Product.find({
      productId: { $in: user.wishlist },
      'availability.isActive': true
    });

    res.json({
      success: true,
      products: products
    });

  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch wishlist'
    });
  }
});

/**
 * Get store statistics (for analytics)
 * GET /api/store/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await Product.aggregate([
      {
        $match: { 'availability.isActive': true }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$analytics.totalRevenue' },
          totalSales: { $sum: '$analytics.totalSales' },
          averagePrice: { $avg: '$pricing.basePrice' }
        }
      }
    ]);

    const featuredCount = await Product.countDocuments({
      'availability.isActive': true,
      'promotions.isFeatured': true
    });

    const onSaleCount = await Product.countDocuments({
      'availability.isActive': true,
      'pricing.discountValidUntil': { $gt: new Date() }
    });

    res.json({
      success: true,
      stats: {
        byCategory: stats,
        featuredProducts: featuredCount,
        onSaleProducts: onSaleCount
      }
    });

  } catch (error) {
    console.error('Get store stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch store stats'
    });
  }
});

module.exports = router;