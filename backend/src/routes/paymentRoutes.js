import express from 'express';
import * as paymentController from '../controllers/paymentController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validateId } from '../middlewares/validateId.js';

const router = express.Router();

// ==================== PUBLIC CALLBACK ROUTES ====================

// VNPay callback routes (public - no authentication)
router.get('/vnpay/ipn', paymentController.vnpayIPN);
router.get('/vnpay/return', paymentController.vnpayReturn);

// MoMo callback routes (public)
router.post('/momo/ipn', paymentController.momoIPN);
router.get('/momo/return', paymentController.momoReturn);

// ZaloPay callback routes (public)
router.post('/zalopay/callback', paymentController.zalopayCallback);
router.get('/zalopay/return', paymentController.zalopayReturn);

// Stripe webhook (public - needs raw body, handled in app.js)
router.post('/stripe/webhook', paymentController.stripeWebhook);

// ==================== AUTHENTICATED ROUTES ====================
router.use(authenticate);

// VNPay payment
router.post('/vnpay/create', paymentController.createVNPayPayment);

// MoMo payment
router.post('/momo/create', paymentController.createMoMoPayment);

// ZaloPay payment
router.post('/zalopay/create', paymentController.createZaloPayPayment);

// Stripe payment
router.post('/stripe/create-intent', paymentController.createStripePaymentIntent);
router.post('/stripe/confirm', paymentController.confirmStripePayment);

// Customer routes
router.post('/bank-transfer', paymentController.createBankTransferPayment);
router.get('/my-payments', paymentController.getMyPayments);
router.get('/order/:orderId', validateId('orderId'), paymentController.getPaymentByOrderId);

// Admin routes
router.get('/pending', authorize('admin'), paymentController.getPendingPayments);
router.patch('/:id/verify', authorize('admin'), validateId('id'), paymentController.verifyBankTransferPayment);

export default router;
