const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const PaymentService = require('../services/PaymentService');
const User = require('../models/User');
const Product = require('../models/Product');
const Payment = require('../models/Payment');
const rateLimit = require('express-rate-limit');
const { authenticateToken } = require('../middleware/auth');

// Rate limiting for payment endpoints
const paymentRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 payment requests per windowMs
  message: {
    error: 'Too many payment requests, please try again later'
  }
});

// Webhook rate limiting
const webhookRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Higher limit for webhooks
  message: {
    error: 'Webhook rate limit exceeded'
  }
});

/**
 * Create payment intent for product purchase
 * POST /api/payments/create-intent
 */
router.post('/create-intent', authenticateToken, paymentRateLimit, async (req, res) => {
  try {
    const { productId, currency, country } = req.body;
    const userId = req.user.id;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'Product ID is required'
      });
    }

    const options = {
      currency: currency || 'USD',
      country: country || 'US',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      platform: req.body.platform || 'web',
      sessionId: req.sessionID
    };

    const result = await PaymentService.createPaymentIntent(userId, productId, options);

    res.json(result);

  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Create subscription for premium membership
 * POST /api/payments/create-subscription
 */
router.post('/create-subscription', authenticateToken, paymentRateLimit, async (req, res) => {
  try {
    const { priceId } = req.body;
    const userId = req.user.id;

    if (!priceId) {
      return res.status(400).json({
        success: false,
        error: 'Price ID is required'
      });
    }

    const result = await PaymentService.createSubscription(userId, priceId);

    res.json(result);

  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Cancel subscription
 * POST /api/payments/cancel-subscription
 */
router.post('/cancel-subscription', authenticateToken, async (req, res) => {
  try {
    const { immediate } = req.body;
    const userId = req.user.id;

    const result = await PaymentService.cancelSubscription(userId, immediate);

    res.json(result);

  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get user's payment history
 * GET /api/payments/history
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, status, type } = req.query;

    const query = { userId };
    if (status) query.status = status;
    if (type) query.productType = type;

    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-providerTransactionId -webhooks');

    const total = await Payment.countDocuments(query);

    res.json({
      success: true,
      payments: payments,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total: total
      }
    });

  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment history'
    });
  }
});

/**
 * Get transaction details
 * GET /api/payments/transaction/:transactionId
 */
router.get('/transaction/:transactionId', authenticateToken, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user.id;

    const payment = await Payment.findOne({
      transactionId,
      userId
    }).select('-providerTransactionId -webhooks');

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      payment: payment
    });

  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction'
    });
  }
});

/**
 * Request refund
 * POST /api/payments/request-refund
 */
router.post('/request-refund', authenticateToken, async (req, res) => {
  try {
    const { transactionId, reason } = req.body;
    const userId = req.user.id;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        error: 'Transaction ID is required'
      });
    }

    // Verify the payment belongs to the user
    const payment = await Payment.findOne({ transactionId, userId });
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    // Check if refund is still possible (e.g., within 14 days)
    const refundWindow = 14 * 24 * 60 * 60 * 1000; // 14 days in milliseconds
    const timeSincePurchase = Date.now() - payment.createdAt.getTime();

    if (timeSincePurchase > refundWindow) {
      return res.status(400).json({
        success: false,
        error: 'Refund window has expired (14 days)'
      });
    }

    const result = await PaymentService.processRefund(transactionId, reason);

    res.json(result);

  } catch (error) {
    console.error('Request refund error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get regional pricing for a product
 * GET /api/payments/pricing/:productId
 */
router.get('/pricing/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { currency = 'USD', country = 'US' } = req.query;

    const product = await Product.findOne({ productId });
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    const pricing = product.getPriceForRegion(currency, country);
    const taxCalculation = await PaymentService.calculateTax(pricing.price, currency, country);

    res.json({
      success: true,
      pricing: {
        basePrice: pricing.price,
        currency: pricing.currency,
        tax: taxCalculation,
        total: pricing.price + taxCalculation.amount,
        isOnSale: product.isOnSale,
        originalPrice: product.pricing.basePrice,
        discountPercentage: product.pricing.discountPercentage
      }
    });

  } catch (error) {
    console.error('Get pricing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pricing'
    });
  }
});

/**
 * Stripe webhook endpoint
 * POST /api/payments/webhook
 */
router.post('/webhook', webhookRateLimit, express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Log the webhook event
    console.log(`Received webhook: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await PaymentService.processSuccessfulPayment(event.data.object.id);
        break;

      case 'payment_intent.payment_failed':
        await handleFailedPayment(event.data.object);
        break;

      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed':
      case 'customer.subscription.deleted':
      case 'customer.subscription.updated':
        await PaymentService.processSubscriptionEvent(event);
        break;

      case 'payment_intent.canceled':
        await handleCanceledPayment(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Update payment record with webhook data
    await updatePaymentWebhook(event);

    res.json({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Handle failed payment
 */
async function handleFailedPayment(paymentIntent) {
  try {
    const payment = await Payment.findOne({ providerTransactionId: paymentIntent.id });
    if (payment) {
      payment.status = 'failed';
      payment.failureReason = paymentIntent.last_payment_error?.message || 'Payment failed';
      payment.failureCode = paymentIntent.last_payment_error?.code;
      await payment.save();
    }
  } catch (error) {
    console.error('Error handling failed payment:', error);
  }
}

/**
 * Handle canceled payment
 */
async function handleCanceledPayment(paymentIntent) {
  try {
    const payment = await Payment.findOne({ providerTransactionId: paymentIntent.id });
    if (payment) {
      payment.status = 'canceled';
      await payment.save();
    }
  } catch (error) {
    console.error('Error handling canceled payment:', error);
  }
}

/**
 * Update payment with webhook data
 */
async function updatePaymentWebhook(event) {
  try {
    const paymentIntentId = event.data.object.id || event.data.object.payment_intent;
    if (!paymentIntentId) return;

    const payment = await Payment.findOne({ providerTransactionId: paymentIntentId });
    if (payment) {
      payment.webhooks.push({
        eventType: event.type,
        received: new Date(),
        processed: true,
        data: event.data.object
      });
      await payment.save();
    }
  } catch (error) {
    console.error('Error updating payment webhook:', error);
  }
}

/**
 * Get payment methods for user
 * GET /api/payments/payment-methods
 */
router.get('/payment-methods', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.stripeCustomerId) {
      return res.json({
        success: true,
        paymentMethods: []
      });
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: 'card'
    });

    res.json({
      success: true,
      paymentMethods: paymentMethods.data.map(pm => ({
        id: pm.id,
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year,
        country: pm.card.country
      }))
    });

  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment methods'
    });
  }
});

/**
 * Delete payment method
 * DELETE /api/payments/payment-methods/:paymentMethodId
 */
router.delete('/payment-methods/:paymentMethodId', authenticateToken, async (req, res) => {
  try {
    const { paymentMethodId } = req.params;

    await stripe.paymentMethods.detach(paymentMethodId);

    res.json({
      success: true,
      message: 'Payment method removed'
    });

  } catch (error) {
    console.error('Delete payment method error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;