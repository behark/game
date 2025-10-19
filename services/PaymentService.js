const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Payment = require('../models/Payment');
const User = require('../models/User');
const Product = require('../models/Product');
const { v4: uuidv4 } = require('uuid');

class PaymentService {
  constructor() {
    this.stripe = stripe;
  }

  /**
   * Create a payment intent for a purchase
   */
  async createPaymentIntent(userId, productId, options = {}) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const product = await Product.findOne({ productId });
      if (!product) {
        throw new Error('Product not found');
      }

      // Check if user can purchase this product
      const purchaseCheck = product.canUserPurchase(user);
      if (!purchaseCheck.canPurchase) {
        throw new Error(`Cannot purchase: ${purchaseCheck.reasons.join(', ')}`);
      }

      // Get price for user's region
      const pricing = product.getPriceForRegion(
        options.currency || 'USD',
        options.country || 'US'
      );

      // Calculate tax if applicable
      const taxCalculation = await this.calculateTax(pricing.price, pricing.currency, options.country);

      const totalAmount = pricing.price + taxCalculation.amount;
      const transactionId = `sr_${Date.now()}_${uuidv4().substring(0, 8)}`;

      // Create Stripe customer if doesn't exist
      let stripeCustomer = null;
      if (user.stripeCustomerId) {
        try {
          stripeCustomer = await this.stripe.customers.retrieve(user.stripeCustomerId);
        } catch (error) {
          console.error('Error retrieving Stripe customer:', error);
        }
      }

      if (!stripeCustomer) {
        stripeCustomer = await this.stripe.customers.create({
          email: user.email,
          metadata: {
            userId: user._id.toString(),
            username: user.username
          }
        });
        user.stripeCustomerId = stripeCustomer.id;
        await user.save();
      }

      // Create payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: totalAmount,
        currency: pricing.currency.toLowerCase(),
        customer: stripeCustomer.id,
        description: `Speed Rivals - ${product.name}`,
        metadata: {
          userId: user._id.toString(),
          productId: product.productId,
          transactionId: transactionId,
          productType: product.category,
          userEmail: user.email
        },
        automatic_payment_methods: {
          enabled: true
        },
        setup_future_usage: 'off_session' // For future payments
      });

      // Create payment record
      const payment = new Payment({
        transactionId: transactionId,
        userId: user._id,
        amount: totalAmount,
        currency: pricing.currency,
        amountUSD: pricing.currency === 'USD' ? totalAmount : await this.convertToUSD(totalAmount, pricing.currency),
        provider: 'stripe',
        providerTransactionId: paymentIntent.id,
        providerCustomerId: stripeCustomer.id,
        status: 'pending',
        productType: product.category,
        productId: product.productId,
        productName: product.name,
        productDescription: product.description,
        customerInfo: {
          ipAddress: options.ipAddress,
          country: options.country,
          userAgent: options.userAgent,
          platform: options.platform || 'web'
        },
        tax: {
          amount: taxCalculation.amount,
          rate: taxCalculation.rate,
          type: taxCalculation.type,
          region: options.country
        },
        metadata: {
          sessionId: options.sessionId,
          source: options.source || 'direct'
        }
      });

      await payment.save();

      return {
        success: true,
        clientSecret: paymentIntent.client_secret,
        transactionId: transactionId,
        amount: totalAmount,
        currency: pricing.currency,
        tax: taxCalculation
      };

    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  /**
   * Create subscription for premium membership
   */
  async createSubscription(userId, priceId, options = {}) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user already has active subscription
      if (user.subscription.isActive && user.subscription.endDate > new Date()) {
        throw new Error('User already has an active subscription');
      }

      // Get or create Stripe customer
      let stripeCustomer = await this.getOrCreateStripeCustomer(user);

      // Create subscription
      const subscription = await this.stripe.subscriptions.create({
        customer: stripeCustomer.id,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          userId: user._id.toString(),
          username: user.username
        }
      });

      // Update user subscription info
      user.subscription = {
        isActive: false, // Will be activated on successful payment
        type: 'premium',
        stripeSubscriptionId: subscription.id,
        autoRenew: true
      };
      await user.save();

      return {
        success: true,
        subscriptionId: subscription.id,
        clientSecret: subscription.latest_invoice.payment_intent.client_secret
      };

    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId, immediate = false) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.subscription.stripeSubscriptionId) {
        throw new Error('No active subscription found');
      }

      const subscription = await this.stripe.subscriptions.update(
        user.subscription.stripeSubscriptionId,
        {
          cancel_at_period_end: !immediate,
          ...(immediate && { prorate: true })
        }
      );

      if (immediate) {
        user.subscription.isActive = false;
        user.subscription.endDate = new Date();
      }
      user.subscription.cancelledAt = new Date();
      user.subscription.autoRenew = false;

      await user.save();

      return {
        success: true,
        message: immediate ? 'Subscription cancelled immediately' : 'Subscription will cancel at period end',
        endDate: immediate ? new Date() : new Date(subscription.current_period_end * 1000)
      };

    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  /**
   * Process successful payment webhook
   */
  async processSuccessfulPayment(paymentIntentId) {
    try {
      const payment = await Payment.findOne({ providerTransactionId: paymentIntentId });
      if (!payment) {
        console.error('Payment not found for payment intent:', paymentIntentId);
        return;
      }

      const user = await User.findById(payment.userId);
      if (!user) {
        console.error('User not found for payment:', payment.userId);
        return;
      }

      // Update payment status
      payment.status = 'succeeded';
      payment.completedAt = new Date();
      await payment.save();

      // Process the purchase based on product type
      await this.fulfillPurchase(user, payment);

      // Update user's lifetime spending
      user.wallet.lifetimeSpent += payment.amountUSD;
      await user.save();

      console.log(`Payment processed successfully: ${payment.transactionId}`);

    } catch (error) {
      console.error('Error processing successful payment:', error);
    }
  }

  /**
   * Process subscription webhook events
   */
  async processSubscriptionEvent(event) {
    try {
      const subscription = event.data.object;
      const userId = subscription.metadata.userId;

      if (!userId) {
        console.error('No userId in subscription metadata');
        return;
      }

      const user = await User.findById(userId);
      if (!user) {
        console.error('User not found for subscription:', userId);
        return;
      }

      switch (event.type) {
        case 'invoice.payment_succeeded':
          if (subscription.billing_reason === 'subscription_create') {
            // First payment - activate subscription
            user.subscription.isActive = true;
            user.subscription.startDate = new Date(subscription.current_period_start * 1000);
            user.subscription.endDate = new Date(subscription.current_period_end * 1000);
          } else {
            // Renewal - extend subscription
            user.subscription.endDate = new Date(subscription.current_period_end * 1000);
            user.subscription.isActive = true;
          }
          break;

        case 'invoice.payment_failed':
          // Handle failed payment
          console.log('Subscription payment failed for user:', userId);
          // Could implement retry logic or grace period here
          break;

        case 'customer.subscription.deleted':
          user.subscription.isActive = false;
          user.subscription.endDate = new Date();
          break;
      }

      await user.save();

    } catch (error) {
      console.error('Error processing subscription event:', error);
    }
  }

  /**
   * Fulfill purchase based on product type
   */
  async fulfillPurchase(user, payment) {
    try {
      const product = await Product.findOne({ productId: payment.productId });
      if (!product) {
        console.error('Product not found for fulfillment:', payment.productId);
        return;
      }

      switch (payment.productType) {
        case 'currency':
          await this.fulfillCurrencyPurchase(user, product, payment);
          break;

        case 'car':
          await this.fulfillCarPurchase(user, product, payment);
          break;

        case 'cosmetic':
          await this.fulfillCosmeticPurchase(user, product, payment);
          break;

        case 'battlepass':
          await this.fulfillBattlePassPurchase(user, product, payment);
          break;

        default:
          console.error('Unknown product type for fulfillment:', payment.productType);
      }

      // Record purchase in user's purchase history
      user.purchases.push({
        transactionId: payment.transactionId,
        type: payment.productType,
        itemId: payment.productId,
        amount: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        status: 'completed',
        stripePaymentIntentId: payment.providerTransactionId
      });

      // Update product analytics
      product.recordPurchase(payment.amountUSD, user._id);
      await product.save();

      await user.save();

    } catch (error) {
      console.error('Error fulfilling purchase:', error);
    }
  }

  /**
   * Fulfill currency purchase
   */
  async fulfillCurrencyPurchase(user, product, payment) {
    const currencyDetails = product.currencyPackage;
    let totalCoins = currencyDetails.speedCoins;

    // Add bonus coins
    if (currencyDetails.bonusCoins) {
      totalCoins += currencyDetails.bonusCoins;
    }

    // Add first-time bonus if applicable
    if (currencyDetails.firstTimeBonusCoins && user.wallet.lifetimeSpent === 0) {
      totalCoins += currencyDetails.firstTimeBonusCoins;
    }

    // Update user's currency
    user.updateCurrency(totalCoins, 0);

    // Update payment with currency details
    payment.currencyDetails = {
      speedCoinsAmount: currencyDetails.speedCoins,
      bonusCoins: currencyDetails.bonusCoins || 0,
      totalCoins: totalCoins
    };
  }

  /**
   * Fulfill car purchase
   */
  async fulfillCarPurchase(user, product, payment) {
    const result = user.addCar(product.productId);
    if (!result.success) {
      throw new Error(`Failed to add car: ${result.message}`);
    }

    // Award XP for new car
    user.addXP(500);
  }

  /**
   * Fulfill cosmetic purchase
   */
  async fulfillCosmeticPurchase(user, product, payment) {
    const result = user.addCosmetic(
      product.productId,
      product.cosmeticDetails.type,
      'purchase'
    );
    if (!result.success) {
      throw new Error(`Failed to add cosmetic: ${result.message}`);
    }

    // Award XP for new cosmetic
    user.addXP(100);
  }

  /**
   * Fulfill battle pass purchase
   */
  async fulfillBattlePassPurchase(user, product, payment) {
    const battlePassDetails = product.battlePassDetails;

    user.battlePass = {
      currentSeason: battlePassDetails.season,
      tier: user.battlePass.tier || 0,
      xp: user.battlePass.xp || 0,
      isPremium: true,
      claimedRewards: user.battlePass.claimedRewards || [],
      purchaseDate: new Date()
    };

    // Award premium currency
    user.updateCurrency(0, 500);
  }

  /**
   * Calculate tax for a purchase
   */
  async calculateTax(amount, currency, country) {
    const taxRates = {
      'US': { rate: 0.08, type: 'sales_tax' },
      'GB': { rate: 0.20, type: 'VAT' },
      'DE': { rate: 0.19, type: 'VAT' },
      'FR': { rate: 0.20, type: 'VAT' },
      'CA': { rate: 0.13, type: 'GST' },
      'AU': { rate: 0.10, type: 'GST' }
    };

    const taxInfo = taxRates[country] || { rate: 0, type: 'none' };
    const taxAmount = Math.round(amount * taxInfo.rate);

    return {
      amount: taxAmount,
      rate: taxInfo.rate,
      type: taxInfo.type
    };
  }

  /**
   * Convert amount to USD
   */
  async convertToUSD(amount, fromCurrency) {
    const exchangeRates = {
      'EUR': 1.18,
      'GBP': 1.37,
      'JPY': 0.0091,
      'CAD': 0.80,
      'AUD': 0.74
    };

    if (fromCurrency === 'USD') return amount;

    const rate = exchangeRates[fromCurrency] || 1;
    return Math.round(amount * rate);
  }

  /**
   * Get or create Stripe customer
   */
  async getOrCreateStripeCustomer(user) {
    if (user.stripeCustomerId) {
      try {
        return await this.stripe.customers.retrieve(user.stripeCustomerId);
      } catch (error) {
        console.error('Error retrieving Stripe customer:', error);
      }
    }

    const customer = await this.stripe.customers.create({
      email: user.email,
      metadata: {
        userId: user._id.toString(),
        username: user.username
      }
    });

    user.stripeCustomerId = customer.id;
    await user.save();

    return customer;
  }

  /**
   * Process refund
   */
  async processRefund(transactionId, reason = 'requested_by_customer') {
    try {
      const payment = await Payment.findOne({ transactionId });
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'succeeded') {
        throw new Error('Cannot refund non-successful payment');
      }

      // Create Stripe refund
      const refund = await this.stripe.refunds.create({
        payment_intent: payment.providerTransactionId,
        reason: reason
      });

      // Update payment record
      payment.processRefund(payment.amount, reason);
      payment.refund.providerRefundId = refund.id;
      payment.refund.status = 'succeeded';
      await payment.save();

      // Reverse the fulfillment
      await this.reverseFulfillment(payment);

      return {
        success: true,
        refundId: refund.id,
        amount: payment.amount
      };

    } catch (error) {
      console.error('Error processing refund:', error);
      throw error;
    }
  }

  /**
   * Reverse fulfillment for refunded purchase
   */
  async reverseFulfillment(payment) {
    try {
      const user = await User.findById(payment.userId);
      if (!user) return;

      switch (payment.productType) {
        case 'currency':
          // Deduct coins (but don't go below 0)
          const coinsToDeduct = payment.currencyDetails.totalCoins || 0;
          user.wallet.speedCoins = Math.max(0, user.wallet.speedCoins - coinsToDeduct);
          break;

        case 'car':
          // Remove car from inventory
          user.inventory.cars = user.inventory.cars.filter(car => car.carId !== payment.productId);
          break;

        case 'cosmetic':
          // Remove cosmetic from inventory
          user.inventory.cosmetics = user.inventory.cosmetics.filter(cosmetic => cosmetic.itemId !== payment.productId);
          break;

        case 'battlepass':
          // Disable premium battle pass
          user.battlePass.isPremium = false;
          break;
      }

      await user.save();

    } catch (error) {
      console.error('Error reversing fulfillment:', error);
    }
  }

  /**
   * Get payment analytics
   */
  async getPaymentAnalytics(startDate, endDate, filters = {}) {
    try {
      const analytics = await Payment.getRevenueStats(startDate, endDate, filters);
      const productPerformance = await Payment.getProductPerformance(startDate, endDate);

      return {
        revenue: analytics[0] || {
          totalRevenue: 0,
          totalTransactions: 0,
          averageOrderValue: 0,
          totalCustomers: 0
        },
        productPerformance: productPerformance
      };

    } catch (error) {
      console.error('Error getting payment analytics:', error);
      throw error;
    }
  }
}

module.exports = new PaymentService();