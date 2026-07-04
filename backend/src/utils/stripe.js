import Stripe from 'stripe';
import logger from '../config/logger.js';

/**
 * Stripe Payment Gateway Integration
 * Docs: https://stripe.com/docs/api
 */
class StripeHelper {
  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (secretKey) {
      this.stripe = new Stripe(secretKey);
      logger.info('✅ Stripe initialized successfully');
    } else {
      this.stripe = null;
      logger.warn('⚠️ Stripe secret key not configured');
    }
  }

  /**
   * Create a Stripe Payment Intent
   * @param {Object} params - Payment parameters
   * @returns {Object} PaymentIntent object
   */
  async createPaymentIntent({ amount, currency = 'vnd', orderId, customerEmail, description }) {
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Please add STRIPE_SECRET_KEY to .env');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount), // VND doesn't use decimals
        currency: currency.toLowerCase(),
        description: description || `Payment for order ${orderId}`,
        metadata: {
          orderId,
          customerEmail
        },
        automatic_payment_methods: {
          enabled: true
        }
      });

      logger.info(`Stripe PaymentIntent created: ${paymentIntent.id} for order ${orderId}`);

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      };
    } catch (error) {
      logger.error(`Stripe PaymentIntent creation error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retrieve a Payment Intent by ID
   * @param {string} paymentIntentId - Stripe PaymentIntent ID
   * @returns {Object} PaymentIntent object
   */
  async getPaymentIntent(paymentIntentId) {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    try {
      return await this.stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      logger.error(`Stripe retrieve PaymentIntent error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify Stripe webhook signature
   * @param {Buffer} body - Raw request body
   * @param {string} signature - Stripe signature header
   * @returns {Object} Verified event object
   */
  verifyWebhookSignature(body, signature) {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!endpointSecret) {
      throw new Error('Stripe webhook secret not configured');
    }

    try {
      return this.stripe.webhooks.constructEvent(body, signature, endpointSecret);
    } catch (error) {
      logger.error(`Stripe webhook verification error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a refund
   * @param {string} paymentIntentId - PaymentIntent to refund
   * @param {number} amount - Amount to refund (optional, full refund if omitted)
   * @returns {Object} Refund object
   */
  async createRefund(paymentIntentId, amount = null) {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    try {
      const refundParams = { payment_intent: paymentIntentId };
      if (amount) {
        refundParams.amount = Math.round(amount);
      }

      const refund = await this.stripe.refunds.create(refundParams);
      logger.info(`Stripe Refund created: ${refund.id} for PaymentIntent ${paymentIntentId}`);
      return refund;
    } catch (error) {
      logger.error(`Stripe refund error: ${error.message}`);
      throw error;
    }
  }
}

export default new StripeHelper();
