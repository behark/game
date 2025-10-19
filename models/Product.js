const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  // Product identification
  productId: {
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
  shortDescription: {
    type: String,
    maxlength: 150
  },

  // Product category and type
  category: {
    type: String,
    required: true,
    enum: ['car', 'cosmetic', 'currency', 'battlepass', 'subscription', 'tournament']
  },
  subcategory: {
    type: String
  },
  tags: [{ type: String }],

  // Pricing information
  pricing: {
    basePrice: {
      type: Number,
      required: true, // Price in USD cents
      min: 0
    },
    regionalPricing: [{
      currency: { type: String, required: true },
      price: { type: Number, required: true }, // In local currency's smallest unit
      country: { type: String }
    }],
    discountPrice: { type: Number },
    discountPercentage: { type: Number },
    discountValidUntil: { type: Date }
  },

  // Currency package details (if applicable)
  currencyPackage: {
    speedCoins: { type: Number },
    bonusCoins: { type: Number },
    bonusPercentage: { type: Number },
    firstTimeBonusCoins: { type: Number }
  },

  // Car details (if applicable)
  carDetails: {
    manufacturer: { type: String },
    model: { type: String },
    year: { type: Number },
    category: { type: String, enum: ['sport', 'classic', 'electric', 'formula', 'exotic'] },
    rarity: { type: String, enum: ['common', 'rare', 'epic', 'legendary'], default: 'common' },
    stats: {
      speed: { type: Number, min: 0, max: 100 },
      acceleration: { type: Number, min: 0, max: 100 },
      handling: { type: Number, min: 0, max: 100 },
      braking: { type: Number, min: 0, max: 100 }
    },
    unlockRequirements: {
      level: { type: Number },
      rank: { type: String },
      previousCars: [{ type: String }]
    }
  },

  // Cosmetic details (if applicable)
  cosmeticDetails: {
    type: { type: String, enum: ['paint', 'decal', 'wheel', 'effect', 'avatar', 'emote'] },
    rarity: { type: String, enum: ['common', 'rare', 'epic', 'legendary'], default: 'common' },
    applicableTo: [{ type: String }], // Car IDs this cosmetic can be applied to
    animated: { type: Boolean, default: false },
    seasonal: { type: Boolean, default: false },
    exclusiveUntil: { type: Date }
  },

  // Battle pass details (if applicable)
  battlePassDetails: {
    season: { type: String },
    duration: { type: Number }, // Duration in days
    totalTiers: { type: Number, default: 100 },
    rewards: [{
      tier: { type: Number, required: true },
      type: { type: String, enum: ['car', 'cosmetic', 'currency', 'xp_boost'] },
      itemId: { type: String },
      amount: { type: Number },
      isPremium: { type: Boolean, default: false }
    }]
  },

  // Subscription details (if applicable)
  subscriptionDetails: {
    type: { type: String, enum: ['premium'] },
    duration: { type: String, enum: ['monthly', 'quarterly', 'yearly'] },
    benefits: [{
      type: { type: String },
      description: { type: String },
      value: { type: String }
    }],
    stripeProductId: { type: String },
    stripePriceId: { type: String }
  },

  // Availability and restrictions
  availability: {
    isActive: { type: Boolean, default: true },
    releaseDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    maxPurchases: { type: Number }, // Per user
    totalStock: { type: Number }, // Global limit
    currentStock: { type: Number },
    platforms: [{ type: String, enum: ['web', 'ios', 'android', 'windows', 'mac'] }],
    regions: [{ type: String }], // Country codes
    ageRating: { type: String, enum: ['all', '13+', '17+'] }
  },

  // Purchase requirements
  requirements: {
    minimumLevel: { type: Number, default: 1 },
    minimumRank: { type: String },
    requiredItems: [{ type: String }],
    premiumRequired: { type: Boolean, default: false },
    battlePassRequired: { type: Boolean, default: false }
  },

  // Media and presentation
  media: {
    icon: { type: String },
    thumbnail: { type: String },
    images: [{ type: String }],
    video: { type: String },
    preview3D: { type: String },
    showcase: { type: Boolean, default: false }
  },

  // Analytics and performance
  analytics: {
    totalSales: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    uniquePurchasers: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    wishlistCount: { type: Number, default: 0 }
  },

  // SEO and marketing
  seo: {
    slug: { type: String, unique: true },
    metaTitle: { type: String },
    metaDescription: { type: String },
    keywords: [{ type: String }]
  },

  // Promotional features
  promotions: {
    isFeatured: { type: Boolean, default: false },
    isNew: { type: Boolean, default: false },
    isPopular: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },
    isLimitedTime: { type: Boolean, default: false },
    badge: { type: String }
  },

  // A/B testing
  abTesting: {
    variants: [{
      name: { type: String },
      price: { type: Number },
      description: { type: String },
      active: { type: Boolean, default: false },
      conversionRate: { type: Number, default: 0 }
    }],
    activeVariant: { type: String }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
productSchema.index({ category: 1, 'availability.isActive': 1 });
productSchema.index({ 'pricing.basePrice': 1 });
productSchema.index({ 'promotions.isFeatured': 1 });
productSchema.index({ 'analytics.totalSales': -1 });
// productId and seo.slug already have unique: true in schema definitions
productSchema.index({ 'availability.releaseDate': -1 });

// Virtual for current price
productSchema.virtual('currentPrice').get(function() {
  if (this.pricing.discountPrice &&
      this.pricing.discountValidUntil &&
      this.pricing.discountValidUntil > new Date()) {
    return this.pricing.discountPrice;
  }
  return this.pricing.basePrice;
});

// Virtual for discount status
productSchema.virtual('isOnSale').get(function() {
  return this.pricing.discountPrice &&
         this.pricing.discountValidUntil &&
         this.pricing.discountValidUntil > new Date();
});

// Virtual for price in dollars
productSchema.virtual('priceInDollars').get(function() {
  return (this.currentPrice / 100).toFixed(2);
});

// Virtual for availability status
productSchema.virtual('isAvailable').get(function() {
  const now = new Date();
  return this.availability.isActive &&
         (!this.availability.endDate || this.availability.endDate > now) &&
         (!this.availability.totalStock || this.availability.currentStock > 0);
});

// Static method to get featured products
productSchema.statics.getFeatured = function(limit = 10) {
  return this.find({
    'availability.isActive': true,
    'promotions.isFeatured': true
  })
  .sort({ 'analytics.totalSales': -1 })
  .limit(limit);
};

// Static method to get products by category
productSchema.statics.getByCategory = function(category, filters = {}) {
  const query = {
    category: category,
    'availability.isActive': true,
    ...filters
  };

  return this.find(query)
    .sort({ 'analytics.totalSales': -1 });
};

// Static method to search products
productSchema.statics.search = function(searchTerm, filters = {}) {
  const query = {
    'availability.isActive': true,
    $text: { $search: searchTerm },
    ...filters
  };

  return this.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } });
};

// Method to check if user can purchase
productSchema.methods.canUserPurchase = function(user) {
  const reasons = [];

  // Check if product is available
  if (!this.isAvailable) {
    reasons.push('Product is not available');
  }

  // Check level requirement
  if (this.requirements.minimumLevel && user.progression.level < this.requirements.minimumLevel) {
    reasons.push(`Requires level ${this.requirements.minimumLevel}`);
  }

  // Check rank requirement
  if (this.requirements.minimumRank) {
    const rankOrder = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster'];
    const userRankIndex = rankOrder.indexOf(user.progression.rank);
    const requiredRankIndex = rankOrder.indexOf(this.requirements.minimumRank);

    if (userRankIndex < requiredRankIndex) {
      reasons.push(`Requires ${this.requirements.minimumRank} rank`);
    }
  }

  // Check premium requirement
  if (this.requirements.premiumRequired && !user.isSubscriptionActive) {
    reasons.push('Requires premium subscription');
  }

  // Check if already owned (for cars and cosmetics)
  if (this.category === 'car') {
    const haseCar = user.inventory.cars.some(car => car.carId === this.productId);
    if (hasCar) {
      reasons.push('Already owned');
    }
  } else if (this.category === 'cosmetic') {
    const hasCosmetic = user.inventory.cosmetics.some(cosmetic => cosmetic.itemId === this.productId);
    if (hasCosmetic) {
      reasons.push('Already owned');
    }
  }

  // Check required items
  if (this.requirements.requiredItems && this.requirements.requiredItems.length > 0) {
    for (const requiredItem of this.requirements.requiredItems) {
      const hasItem = user.inventory.cars.some(car => car.carId === requiredItem) ||
                     user.inventory.cosmetics.some(cosmetic => cosmetic.itemId === requiredItem);
      if (!hasItem) {
        reasons.push(`Requires ${requiredItem}`);
      }
    }
  }

  return {
    canPurchase: reasons.length === 0,
    reasons: reasons
  };
};

// Method to update analytics after purchase
productSchema.methods.recordPurchase = function(amount, userId) {
  this.analytics.totalSales += 1;
  this.analytics.totalRevenue += amount;

  if (this.availability.totalStock) {
    this.availability.currentStock = Math.max(0, this.availability.currentStock - 1);
  }
};

// Method to get regional price
productSchema.methods.getPriceForRegion = function(currency, country) {
  // Check for specific regional pricing
  const regionalPrice = this.pricing.regionalPricing.find(rp =>
    rp.currency === currency && (!rp.country || rp.country === country)
  );

  if (regionalPrice) {
    return {
      price: regionalPrice.price,
      currency: regionalPrice.currency
    };
  }

  // Default to USD pricing with conversion (simplified)
  const exchangeRates = {
    'EUR': 0.85,
    'GBP': 0.73,
    'JPY': 110,
    'CAD': 1.25,
    'AUD': 1.35
  };

  const rate = exchangeRates[currency] || 1;
  const convertedPrice = Math.round(this.currentPrice * rate);

  return {
    price: convertedPrice,
    currency: currency
  };
};

// Text index for search
productSchema.index({
  name: 'text',
  description: 'text',
  'carDetails.manufacturer': 'text',
  'carDetails.model': 'text',
  tags: 'text'
});

module.exports = mongoose.model('Product', productSchema);