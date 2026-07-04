import api from './client';

export const paymentAPI = {
  // Create bank transfer payment
  createBankTransfer: (paymentData) =>
    api.post('/payments/bank-transfer', paymentData),

  // Get payment by order ID
  getPaymentByOrder: (orderId) =>
    api.get(`/payments/order/${orderId}`),

  // Get user's payments
  getMyPayments: (params) =>
    api.get('/payments/my-payments', { params }),

  // Admin: Get pending payments
  getPendingPayments: (params) =>
    api.get('/payments/pending', { params }),

  // Admin: Verify payment
  verifyPayment: (paymentId, verificationData) =>
    api.patch(`/payments/${paymentId}/verify`, verificationData),

  // VNPay
  createVNPayPayment: (orderId) =>
    api.post('/payments/vnpay/create', { orderId }),
  verifyVNPayReturn: (params) =>
    api.get('/payments/vnpay/return', { params }),

  // MoMo
  createMoMoPayment: (orderIdOrIds) => {
    const orderIds = Array.isArray(orderIdOrIds) ? orderIdOrIds : [orderIdOrIds];
    return api.post('/payments/momo/create', {
      orderId: orderIds[0],
      orderIds
    });
  },
  verifyMoMoReturn: (params) =>
    api.get('/payments/momo/return', { params }),

  // ZaloPay
  createZaloPayPayment: (orderId) =>
    api.post('/payments/zalopay/create', { orderId }),
  verifyZaloPayReturn: (params) =>
    api.get('/payments/zalopay/return', { params }),

  // Stripe
  createStripePaymentIntent: (orderId) =>
    api.post('/payments/stripe/create-intent', { orderId }),
  confirmStripePayment: (paymentIntentId) =>
    api.post('/payments/stripe/confirm', { paymentIntentId }),
};

export default paymentAPI;
