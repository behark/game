const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  // Transaction identification
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Payment details
  amount: {
    type: Number,
    required: true, // Amount in cents
    min: 1
  },
  currency: {
    type: String,
    required: true,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD']
  },
  exchangeRate: {
    type: Number,
    default: 1.0
  },
  amountUSD: {
    type: Number,
    required: true // Normalized amount in USD cents
  },

  // Payment provider information
  provider: {
    type: String,
    required: true,
    enum: ['stripe', 'paypal', 'apple', 'google', 'samsung']
  },
  providerTransactionId: {
    type: String,
    required: true
  },
  providerCustomerId: {
    type: String
  },
  paymentMethodId: {
    type: String
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'apple_pay', 'google_pay', 'samsung_pay', 'paypal', 'bank_transfer']
  },

  // Card details (if applicable)
  cardDetails: {
    last4: { type: String },
    brand: { type: String },
    country: { type: String },
    fingerprint: { type: String }
  },

  // Transaction status
  status: {
    type: String,
    enum: ['pending', 'processing', 'succeeded', 'failed', 'canceled', 'refunded', 'disputed'],
    default: 'pending'
  },
  failureReason: {
    type: String
  },
  failureCode: {
    type: String
  },

  // Purchase details
  productType: {
    type: String,
    required: true,
    enum: ['currency', 'car', 'cosmetic', 'battlepass', 'subscription', 'tournament_entry']
  },
  productId: {
    type: String,
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  productDescription: {
    type: String
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1
  },

  // Currency purchase details (if applicable)
  currencyDetails: {
    speedCoinsAmount: { type: Number },
    bonusCoins: { type: Number },
    totalCoins: { type: Number }
  },

  // Geographic and device info
  customerInfo: {
    ipAddress: { type: String },
    country: { type: String },
    region: { type: String },
    city: { type: String },
    userAgent: { type: String },
    deviceId: { type: String },
    platform: { type: String, enum: ['web', 'ios', 'android', 'windows', 'mac'] }
  },

  // Tax information
  tax: {
    amount: { type: Number, default: 0 },
    rate: { type: Number, default: 0 },
    type: { type: String, enum: ['VAT', 'GST', 'sales_tax', 'none'], default: 'none' },
    region: { type: String }
  },

  // Refund information
  refund: {
    amount: { type: Number },
    reason: { type: String },
    date: { type: Date },
    providerRefundId: { type: String },
    status: { type: String, enum: ['pending', 'succeeded', 'failed'] }
  },

  // Dispute information
  dispute: {
    amount: { type: Number },
    reason: { type: String },
    status: { type: String, enum: ['warning_needs_response', 'warning_under_review', 'warning_closed', 'needs_response', 'under_review', 'charge_refunded', 'won', 'lost'] },
    evidence: { type: String },
    date: { type: Date }
  },

  // Revenue tracking
  revenue: {
    gross: { type: Number }, // Before fees
    fees: { type: Number }, // Payment processor fees
    net: { type: Number }, // After fees
    tax: { type: Number } // Tax amount
  },

  // Timestamps
  processedAt: { type: Date },
  completedAt: { type: Date },

  // Metadata for analytics
  metadata: {
    sessionId: { type: String },
    campaignId: { type: String },
    source: { type: String },
    medium: { type: String },
    referrer: { type: String },
    abTestGroup: { type: String }
  },

  // Fraud detection
  riskScore: {
    type: Number,
    min: 0,
    max: 100
  },
  riskFactors: [{
    type: { type: String },
    score: { type: Number },
    description: { type: String }
  }],

  // Webhook information
  webhooks: [{
    eventType: { type: String },
    received: { type: Date, default: Date.now },
    processed: { type: Boolean, default: false },
    data: { type: mongoose.Schema.Types.Mixed }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance and queries
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ providerTransactionId: 1 });
paymentSchema.index({ productType: 1, createdAt: -1 });
paymentSchema.index({ 'customerInfo.country': 1, createdAt: -1 });
paymentSchema.index({ amount: -1, createdAt: -1 });
// transactionId already has unique: true in schema definition

// Virtual for amount in dollars
paymentSchema.virtual('amountInDollars').get(function() {
  return (this.amount / 100).toFixed(2);
});

// Virtual for net revenue in dollars
paymentSchema.virtual('netRevenueInDollars').get(function() {
  if (!this.revenue || !this.revenue.net) return '0.00';
  return (this.revenue.net / 100).toFixed(2);
});

// Virtual for is successful
paymentSchema.virtual('isSuccessful').get(function() {
  return this.status === 'succeeded';
});

// Static method to get revenue statistics
paymentSchema.statics.getRevenueStats = function(startDate, endDate, filters = {}) {
  const matchStage = {
    status: 'succeeded',
    createdAt: {
      $gte: startDate,
      $lte: endDate
    },
    ...filters
  };

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$revenue.net' },
        totalTransactions: { $sum: 1 },
        averageOrderValue: { $avg: '$amount' },
        totalCustomers: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        totalRevenue: 1,
        totalTransactions: 1,
        averageOrderValue: 1,
        totalCustomers: { $size: '$totalCustomers' }
      }
    }
  ]);
};

// Static method to get product performance
paymentSchema.statics.getProductPerformance = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        status: 'succeeded',
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: {
          productType: '$productType',
          productId: '$productId'
        },
        totalRevenue: { $sum: '$revenue.net' },
        totalSales: { $sum: '$quantity' },
        uniqueCustomers: { $addToSet: '$userId' },
        averagePrice: { $avg: '$amount' }
      }
    },
    {
      $project: {
        productType: '$_id.productType',
        productId: '$_id.productId',
        totalRevenue: 1,
        totalSales: 1,
        uniqueCustomers: { $size: '$uniqueCustomers' },
        averagePrice: 1
      }
    },
    { $sort: { totalRevenue: -1 } }
  ]);
};

// Method to process refund
paymentSchema.methods.processRefund = function(amount, reason) {
  this.refund = {
    amount: amount || this.amount,
    reason: reason || 'Customer request',
    date: new Date(),
    status: 'pending'
  };
  this.status = 'refunded';
};

// Method to calculate fees based on provider
paymentSchema.methods.calculateFees = function() {
  let feeRate = 0.029; // Default Stripe rate
  let fixedFee = 30; // 30 cents

  switch (this.provider) {
    case 'stripe':
      feeRate = 0.029;
      fixedFee = 30;
      break;
    case 'paypal':
      feeRate = 0.0349;
      fixedFee = 0;
      break;
    case 'apple':
      feeRate = 0.30; // 30% App Store fee
      fixedFee = 0;
      break;
    case 'google':
      feeRate = 0.30; // 30% Play Store fee
      fixedFee = 0;
      break;
  }

  const fees = Math.round(this.amount * feeRate + fixedFee);
  this.revenue = {
    gross: this.amount,
    fees: fees,
    net: this.amount - fees - (this.tax.amount || 0),
    tax: this.tax.amount || 0
  };
};

// Pre-save middleware to calculate fees
paymentSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('amount')) {
    this.calculateFees();
  }
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);