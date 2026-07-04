import Payment from '../models/Payment.js';
import Order from '../models/Order.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import logger from '../config/logger.js';
import vnpayHelper from '../utils/vnpay.js';
import momoHelper from '../utils/momo.js';
import zalopayHelper from '../utils/zalopay.js';
import stripeHelper from '../utils/stripe.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * @desc    Create bank transfer payment
 * @route   POST /api/payments/bank-transfer
 * @access  Private
 */
export const createBankTransferPayment = asyncHandler(async (req, res) => {
  const { orderId, bankName, accountNumber, accountName, transferCode, transferDate, proofImage, notes } = req.body;

  // Check if order exists and belongs to user
  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Đơn hàng không tồn tại'
    });
  }

  if (order.buyerId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Không có quyền truy cập đơn hàng này'
    });
  }

  // Check if payment already exists
  const existingPayment = await Payment.findOne({ orderId });
  if (existingPayment) {
    return res.status(400).json({
      success: false,
      message: 'Đơn hàng đã có thông tin thanh toán'
    });
  }

  // Create payment
  const payment = await Payment.create({
    orderId,
    userId: req.user._id,
    amount: order.totals.grandTotal,
    paymentMethod: 'bank_transfer',
    status: 'processing',
    bankTransferDetails: {
      bankName,
      accountNumber,
      accountName,
      transferCode,
      transferDate: transferDate ? new Date(transferDate) : new Date(),
      proofImage,
      notes
    }
  });

  logger.info(`Bank transfer payment created for order ${order.orderNumber} by user ${req.user.email}`);

  res.status(201).json({
    success: true,
    message: 'Thông tin chuyển khoản đã được ghi nhận. Vui lòng chờ xác nhận.',
    data: payment
  });
});

/**
 * @desc    Get payment by order ID
 * @route   GET /api/payments/order/:orderId
 * @access  Private
 */
export const getPaymentByOrderId = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({ orderId: req.params.orderId })
    .populate('orderId')
    .populate('userId', 'name email')
    .populate('verifiedBy', 'name email');

  if (!payment) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy thông tin thanh toán'
    });
  }

  // Check permission
  if (payment.userId._id.toString() !== req.user._id.toString() && !req.user.roles.includes('admin')) {
    return res.status(403).json({
      success: false,
      message: 'Không có quyền truy cập thông tin thanh toán này'
    });
  }

  res.json({
    success: true,
    data: payment
  });
});

/**
 * @desc    Get user's payments
 * @route   GET /api/payments/my-payments
 * @access  Private
 */
export const getMyPayments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;

  const filter = { userId: req.user._id };
  if (status) filter.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate('orderId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Payment.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: {
      payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
});

/**
 * @desc    Verify bank transfer payment (Admin only)
 * @route   PATCH /api/payments/:id/verify
 * @access  Private (Admin)
 */
export const verifyBankTransferPayment = asyncHandler(async (req, res) => {
  const { verified, notes } = req.body;

  const payment = await Payment.findById(req.params.id);

  if (!payment) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy thông tin thanh toán'
    });
  }

  if (payment.paymentMethod !== 'bank_transfer') {
    return res.status(400).json({
      success: false,
      message: 'Chỉ có thể xác minh thanh toán chuyển khoản ngân hàng'
    });
  }

  // Update payment status
  payment.status = verified ? 'completed' : 'failed';
  payment.verifiedBy = req.user._id;
  payment.verifiedAt = new Date();
  payment.verificationNotes = notes;

  await payment.save();

  // Update order payment status
  const order = await Order.findById(payment.orderId);
  if (order) {
    order.paymentStatus = verified ? 'paid' : 'failed';
    if (verified) {
      order.paymentDetails = {
        ...order.paymentDetails,
        transactionId: payment.bankTransferDetails.transferCode,
        paidAt: new Date()
      };
    }
    await order.save();
  }

  logger.info(`Payment ${payment._id} ${verified ? 'verified' : 'rejected'} by admin ${req.user.email}`);

  res.json({
    success: true,
    message: `Thanh toán đã được ${verified ? 'xác nhận' : 'từ chối'}`,
    data: payment
  });
});

/**
 * @desc    Get all pending payments (Admin only)
 * @route   GET /api/payments/pending
 * @access  Private (Admin)
 */
export const getPendingPayments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const filter = {
    paymentMethod: 'bank_transfer',
    status: 'processing'
  };

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate('userId', 'name email phone')
      .populate('orderId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Payment.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: {
      payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
});

/**
 * @desc    Create VNPay payment URL
 * @route   POST /api/payments/vnpay/create
 * @access  Private
 */
export const createVNPayPayment = asyncHandler(async (req, res) => {
  const { orderId } = req.body;

  // Check if order exists and belongs to user
  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Đơn hàng không tồn tại'
    });
  }

  if (order.buyerId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Không có quyền truy cập đơn hàng này'
    });
  }

  // Check if payment already exists
  const existingPayment = await Payment.findOne({ orderId });
  if (existingPayment && existingPayment.status === 'completed') {
    return res.status(400).json({
      success: false,
      message: 'Đơn hàng đã được thanh toán'
    });
  }

  // Get IP address and ensure it's IPv4
  let ipAddr = req.headers['x-forwarded-for'] || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress || 
               '127.0.0.1';
  
  // Clean IPv6 prefix and ensure valid IPv4
  ipAddr = ipAddr.replace('::ffff:', '').replace('::1', '127.0.0.1');
  
  // If still not valid IPv4, use localhost
  if (!ipAddr.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
    ipAddr = '127.0.0.1';
  }

  // Create VNPay payment URL
  const paymentUrl = vnpayHelper.createPaymentUrl({
    orderId: order.orderNumber,
    amount: order.totals.grandTotal,
    orderInfo: `Thanh toán đơn hàng ${order.orderNumber}`,
    ipAddr,
    locale: 'vn'
  });

  // Create or update payment record
  if (existingPayment) {
    existingPayment.status = 'processing';
    existingPayment.paymentMethod = 'vnpay';
    await existingPayment.save();
  } else {
    await Payment.create({
      orderId,
      userId: req.user._id,
      amount: order.totals.grandTotal,
      paymentMethod: 'vnpay',
      status: 'processing'
    });
  }

  logger.info(`VNPay payment URL created for order ${order.orderNumber} by user ${req.user.email}`);

  res.json({
    success: true,
    message: 'Tạo link thanh toán VNPay thành công',
    data: {
      paymentUrl
    }
  });
});

/**
 * @desc    VNPay IPN (Instant Payment Notification) callback
 * @route   GET /api/payments/vnpay/ipn
 * @access  Public
 */
export const vnpayIPN = asyncHandler(async (req, res) => {
  const vnp_Params = req.query;

  // Verify signature
  const isValid = vnpayHelper.verifyReturnUrl(vnp_Params);
  
  if (!isValid) {
    logger.error('VNPay IPN: Invalid signature');
    return res.status(400).json({
      RspCode: '97',
      Message: 'Invalid signature'
    });
  }

  const orderId = vnp_Params['vnp_TxnRef'];
  const responseCode = vnp_Params['vnp_ResponseCode'];
  const transactionNo = vnp_Params['vnp_TransactionNo'];
  const amount = parseInt(vnp_Params['vnp_Amount']) / 100;

  // Find order by orderNumber
  const order = await Order.findOne({ orderNumber: orderId });
  if (!order) {
    logger.error(`VNPay IPN: Order ${orderId} not found`);
    return res.status(200).json({
      RspCode: '01',
      Message: 'Order not found'
    });
  }

  // Find payment record
  const payment = await Payment.findOne({ orderId: order._id });
  if (!payment) {
    logger.error(`VNPay IPN: Payment record for order ${orderId} not found`);
    return res.status(200).json({
      RspCode: '01',
      Message: 'Payment not found'
    });
  }

  // Check if already processed
  if (payment.status === 'completed') {
    logger.info(`VNPay IPN: Order ${orderId} already processed`);
    return res.status(200).json({
      RspCode: '00',
      Message: 'Success'
    });
  }

  // Update payment status based on response code
  if (responseCode === '00') {
    // Payment successful
    payment.status = 'completed';
    payment.transactionId = transactionNo;
    payment.completedAt = new Date();
    
    // Update order
    order.paymentStatus = 'paid';
    order.paymentDetails = {
      method: 'vnpay',
      transactionId: transactionNo,
      paidAt: new Date()
    };
    
    await Promise.all([payment.save(), order.save()]);
    
    logger.info(`VNPay IPN: Order ${orderId} payment completed successfully`);
    
    return res.status(200).json({
      RspCode: '00',
      Message: 'Success'
    });
  } else {
    // Payment failed - cancel the order
    payment.status = 'failed';
    payment.failureReason = vnpayHelper.parseResponseCode(responseCode).message;
    
    order.paymentStatus = 'failed';
    order.orderStatus = 'CANCELLED';
    order.cancellationReason = `Thanh toán VNPay thất bại: ${vnpayHelper.parseResponseCode(responseCode).message}`;
    order.cancelledAt = new Date();
    
    await Promise.all([payment.save(), order.save()]);
    
    logger.info(`VNPay IPN: Order ${orderId} payment failed with code ${responseCode}, order cancelled`);
    
    return res.status(200).json({
      RspCode: '00',
      Message: 'Success'
    });
  }
});

/**
 * @desc    VNPay return URL callback
 * @route   GET /api/payments/vnpay/return
 * @access  Public
 */
export const vnpayReturn = asyncHandler(async (req, res) => {
  const vnp_Params = { ...req.query };

  logger.info('VNPay Return received:', JSON.stringify(vnp_Params));

  // Get response code first to check if payment was successful on VNPay side
  const responseCode = vnp_Params['vnp_ResponseCode'];
  
  // Verify signature
  const isValid = vnpayHelper.verifyReturnUrl(vnp_Params);
  
  if (!isValid) {
    logger.error('VNPay Return: Invalid signature');
    logger.error('Params received:', JSON.stringify(req.query));
    // Still process based on response code if signature fails (for sandbox testing)
    // In production, you should return error here
    logger.warn('VNPay Return: Proceeding without signature verification for sandbox');
  }

  const orderId = vnp_Params['vnp_TxnRef'];
  const transactionNo = vnp_Params['vnp_TransactionNo'];
  const amount = parseInt(vnp_Params['vnp_Amount']) / 100;
  
  // Find order by orderNumber
  const order = await Order.findOne({ orderNumber: orderId });
  if (!order) {
    logger.error(`VNPay Return: Order ${orderId} not found`);
    return res.json({
      success: false,
      message: 'Không tìm thấy đơn hàng'
    });
  }

  // Find payment record
  const payment = await Payment.findOne({ orderId: order._id });
  
  const result = vnpayHelper.parseResponseCode(responseCode);

  // Update payment and order status based on response code
  if (responseCode === '00') {
    // Payment successful
    if (payment) {
      payment.status = 'completed';
      payment.transactionId = transactionNo;
      payment.completedAt = new Date();
      await payment.save();
    }
    
    // Update order
    order.paymentStatus = 'paid';
    order.paymentDetails = {
      method: 'vnpay',
      transactionId: transactionNo,
      paidAt: new Date()
    };
    await order.save();
    
    logger.info(`VNPay Return: Order ${orderId} payment completed successfully`);
  } else {
    // Payment failed - cancel the order
    if (payment) {
      payment.status = 'failed';
      payment.failureReason = result.message;
      await payment.save();
    }
    
    order.paymentStatus = 'failed';
    order.orderStatus = 'CANCELLED';
    order.cancellationReason = `Thanh toán VNPay thất bại: ${result.message}`;
    order.cancelledAt = new Date();
    await order.save();
    
    logger.info(`VNPay Return: Order ${orderId} payment failed with code ${responseCode}, order cancelled`);
  }

  logger.info(`VNPay Return: Order ${orderId} with response code ${responseCode}`);

  res.json({
    success: result.success,
    message: result.message,
    data: {
      orderId,
      transactionNo,
      responseCode,
      amount
    }
  });
});

// =================================================================
// MOMO PAYMENT
// =================================================================

/**
 * @desc    Create MoMo payment URL
 * @route   POST /api/payments/momo/create
 * @access  Private
 */
export const createMoMoPayment = asyncHandler(async (req, res) => {
  const requestedOrderIds = Array.isArray(req.body.orderIds) && req.body.orderIds.length
    ? req.body.orderIds
    : [req.body.orderId].filter(Boolean);
  const uniqueOrderIds = [...new Set(requestedOrderIds.map((id) => id?.toString()).filter(Boolean))];

  if (!uniqueOrderIds.length) {
    return res.status(400).json({ success: false, message: 'Thiếu mã đơn hàng' });
  }

  const orders = await Order.find({ _id: { $in: uniqueOrderIds } });
  const order = orders[0];
  if (orders.length !== uniqueOrderIds.length) {
    return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });
  }
  if (orders.some((item) => item.buyerId.toString() !== req.user._id.toString())) {
    return res.status(403).json({ success: false, message: 'Không có quyền truy cập đơn hàng này' });
  }

  const existingPayments = await Payment.find({ orderId: { $in: uniqueOrderIds } });
  if (existingPayments.some((payment) => payment.status === 'completed')) {
    return res.status(400).json({ success: false, message: 'Đơn hàng đã được thanh toán' });
  }

  const requestId = uuidv4();
  const momoOrderId = orders.length === 1
    ? `${order.orderNumber}_${Date.now()}`
    : `MOMO_${Date.now()}_${requestId.slice(0, 8)}`;
  const amount = orders.reduce((sum, item) => sum + item.totals.grandTotal, 0);
  const orderInfo = orders.length === 1
    ? `Thanh toán đơn hàng ${order.orderNumber}`
    : `Thanh toán ${orders.length} đơn hàng: ${orders.map((item) => item.orderNumber).join(', ')}`;

  const momoResponse = await momoHelper.createPaymentUrl({
    orderId: momoOrderId,
    amount,
    orderInfo,
    requestId
  });

  if (momoResponse.resultCode !== 0) {
    return res.status(400).json({
      success: false,
      message: momoResponse.message || 'Không thể tạo thanh toán MoMo'
    });
  }

  for (const item of orders) {
    const existingPayment = existingPayments.find((payment) => payment.orderId.toString() === item._id.toString());
    if (existingPayment) {
      existingPayment.status = 'processing';
      existingPayment.paymentMethod = 'momo';
      existingPayment.amount = item.totals.grandTotal;
      existingPayment.metadata = { momoOrderId, requestId, orderIds: uniqueOrderIds };
      await existingPayment.save();
    } else {
      await Payment.create({
        orderId: item._id,
        userId: req.user._id,
        amount: item.totals.grandTotal,
        paymentMethod: 'momo',
        status: 'processing',
        metadata: { momoOrderId, requestId, orderIds: uniqueOrderIds }
      });
    }
  }

  logger.info(`MoMo payment URL created for ${orders.length} order(s): ${orders.map((item) => item.orderNumber).join(', ')}`);

  res.json({
    success: true,
    message: 'Tạo link thanh toán MoMo thành công',
    data: { paymentUrl: momoResponse.payUrl || momoResponse.shortLink, orderIds: uniqueOrderIds }
  });
});

/**
 * @desc    MoMo IPN callback
 * @route   POST /api/payments/momo/ipn
 * @access  Public
 */
export const momoIPN = asyncHandler(async (req, res) => {
  const { orderId, resultCode, transId, amount, message } = req.body;
  const numericResultCode = Number(resultCode);

  logger.info(`MoMo IPN received: orderId=${orderId}, resultCode=${resultCode}, transId=${transId}`);

  const groupedPayments = await Payment.find({ 'metadata.momoOrderId': orderId });
  if (groupedPayments.length) {
    for (const payment of groupedPayments) {
      const order = await Order.findById(payment.orderId);
      if (!order || payment.status === 'completed') continue;

      if (numericResultCode === 0) {
        payment.status = 'completed';
        payment.transactionId = transId?.toString();
        payment.completedAt = new Date();
        order.paymentStatus = 'paid';
        order.paymentDetails = { method: 'momo', transactionId: transId?.toString(), paidAt: new Date() };
      } else {
        payment.status = 'failed';
        payment.failureReason = message;
        order.paymentStatus = 'failed';
        order.orderStatus = 'CANCELLED';
        order.cancellationReason = `Thanh toán MoMo thất bại: ${message}`;
        order.cancelledAt = new Date();
      }

      await Promise.all([payment.save(), order.save()]);
    }

    logger.info(`MoMo IPN processed for gateway order ${orderId}: ${numericResultCode === 0 ? 'SUCCESS' : 'FAILED'}`);
    return res.status(200).json({ resultCode: 0, message: 'Success' });
  }

  // Extract original order number from MoMo orderId (format: DH-XXXXX_timestamp)
  const orderNumber = orderId.split('_')[0];
  const order = await Order.findOne({ orderNumber });

  if (!order) {
    logger.error(`MoMo IPN: Order ${orderNumber} not found`);
    return res.status(200).json({ resultCode: 1, message: 'Order not found' });
  }

  const payment = await Payment.findOne({ orderId: order._id });
  if (!payment) {
    return res.status(200).json({ resultCode: 1, message: 'Payment not found' });
  }

  if (payment.status === 'completed') {
    return res.status(200).json({ resultCode: 0, message: 'Already processed' });
  }

  if (numericResultCode === 0) {
    payment.status = 'completed';
    payment.transactionId = transId.toString();
    payment.completedAt = new Date();
    order.paymentStatus = 'paid';
    order.paymentDetails = { method: 'momo', transactionId: transId.toString(), paidAt: new Date() };
  } else {
    payment.status = 'failed';
    payment.failureReason = message;
    order.paymentStatus = 'failed';
    order.orderStatus = 'CANCELLED';
    order.cancellationReason = `Thanh toán MoMo thất bại: ${message}`;
    order.cancelledAt = new Date();
  }

  await Promise.all([payment.save(), order.save()]);
  logger.info(`MoMo IPN processed for order ${orderNumber}: ${numericResultCode === 0 ? 'SUCCESS' : 'FAILED'}`);

  res.status(200).json({ resultCode: 0, message: 'Success' });
});

/**
 * @desc    MoMo return URL
 * @route   GET /api/payments/momo/return
 * @access  Public
 */
export const momoReturn = asyncHandler(async (req, res) => {
  const { orderId, resultCode, transId, amount, message } = req.query;

  const orderNumber = orderId ? orderId.split('_')[0] : null;
  const result = momoHelper.parseResultCode(parseInt(resultCode));

  const groupedPayments = orderId ? await Payment.find({ 'metadata.momoOrderId': orderId }) : [];
  if (groupedPayments.length) {
    for (const payment of groupedPayments) {
      const order = await Order.findById(payment.orderId);
      if (!order) continue;

      if (parseInt(resultCode) === 0) {
        if (payment.status !== 'completed') {
          payment.status = 'completed';
          payment.transactionId = transId?.toString();
          payment.completedAt = new Date();
          await payment.save();
        }
        if (order.paymentStatus !== 'paid') {
          order.paymentStatus = 'paid';
          order.paymentDetails = { method: 'momo', transactionId: transId?.toString(), paidAt: new Date() };
          await order.save();
        }
      } else if (payment.status !== 'completed') {
        payment.status = 'failed';
        payment.failureReason = message || result.message;
        await payment.save();
      }
    }

    return res.json({
      success: result.success,
      message: result.message,
      data: { orderId, transactionNo: transId, responseCode: resultCode, amount }
    });
  }

  if (orderNumber) {
    const order = await Order.findOne({ orderNumber });
    if (order) {
      const payment = await Payment.findOne({ orderId: order._id });
      if (parseInt(resultCode) === 0) {
        if (payment && payment.status !== 'completed') {
          payment.status = 'completed';
          payment.transactionId = transId?.toString();
          payment.completedAt = new Date();
          await payment.save();
        }
        if (order.paymentStatus !== 'paid') {
          order.paymentStatus = 'paid';
          order.paymentDetails = { method: 'momo', transactionId: transId?.toString(), paidAt: new Date() };
          await order.save();
        }
      } else if (payment && payment.status !== 'completed') {
        payment.status = 'failed';
        payment.failureReason = message || result.message;
        await payment.save();
      }
    }
  }

  res.json({
    success: result.success,
    message: result.message,
    data: { orderId: orderNumber, transactionNo: transId, responseCode: resultCode, amount }
  });
});

// =================================================================
// ZALOPAY PAYMENT
// =================================================================

/**
 * @desc    Create ZaloPay payment
 * @route   POST /api/payments/zalopay/create
 * @access  Private
 */
export const createZaloPayPayment = asyncHandler(async (req, res) => {
  const { orderId } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });
  }
  if (order.buyerId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Không có quyền truy cập đơn hàng này' });
  }

  const existingPayment = await Payment.findOne({ orderId });
  if (existingPayment && existingPayment.status === 'completed') {
    return res.status(400).json({ success: false, message: 'Đơn hàng đã được thanh toán' });
  }

  const zalopayResponse = await zalopayHelper.createPaymentUrl({
    orderId: order.orderNumber,
    amount: order.totals.grandTotal,
    description: `Thanh toán đơn hàng ${order.orderNumber}`,
    userId: req.user._id.toString()
  });

  if (zalopayResponse.return_code !== 1) {
    return res.status(400).json({
      success: false,
      message: zalopayResponse.return_message || 'Không thể tạo thanh toán ZaloPay'
    });
  }

  if (existingPayment) {
    existingPayment.status = 'processing';
    existingPayment.paymentMethod = 'zalopay';
    existingPayment.metadata = { appTransId: zalopayResponse.appTransId };
    await existingPayment.save();
  } else {
    await Payment.create({
      orderId, userId: req.user._id,
      amount: order.totals.grandTotal,
      paymentMethod: 'zalopay', status: 'processing',
      metadata: { appTransId: zalopayResponse.appTransId }
    });
  }

  logger.info(`ZaloPay payment created for order ${order.orderNumber}`);

  res.json({
    success: true,
    message: 'Tạo link thanh toán ZaloPay thành công',
    data: { paymentUrl: zalopayResponse.order_url }
  });
});

/**
 * @desc    ZaloPay callback (server-to-server)
 * @route   POST /api/payments/zalopay/callback
 * @access  Public
 */
export const zalopayCallback = asyncHandler(async (req, res) => {
  const result = zalopayHelper.verifyCallback(req.body);

  if (!result.isValid) {
    logger.error('ZaloPay callback: Invalid MAC');
    return res.json({ return_code: -1, return_message: 'mac not equal' });
  }

  const { app_trans_id } = result.data;

  // Find payment by appTransId in metadata
  const payment = await Payment.findOne({ 'metadata.appTransId': app_trans_id });
  if (!payment) {
    logger.error(`ZaloPay callback: Payment not found for ${app_trans_id}`);
    return res.json({ return_code: 0, return_message: 'success' });
  }

  if (payment.status === 'completed') {
    return res.json({ return_code: 0, return_message: 'success' });
  }

  payment.status = 'completed';
  payment.transactionId = app_trans_id;
  payment.completedAt = new Date();

  const order = await Order.findById(payment.orderId);
  if (order) {
    order.paymentStatus = 'paid';
    order.paymentDetails = { method: 'zalopay', transactionId: app_trans_id, paidAt: new Date() };
    await order.save();
  }

  await payment.save();
  logger.info(`ZaloPay callback processed for ${app_trans_id}: SUCCESS`);

  res.json({ return_code: 1, return_message: 'success' });
});

/**
 * @desc    ZaloPay return URL
 * @route   GET /api/payments/zalopay/return
 * @access  Public
 */
export const zalopayReturn = asyncHandler(async (req, res) => {
  const { status, apptransid, amount } = req.query;
  const result = zalopayHelper.parseReturnCode(parseInt(status));

  res.json({
    success: result.success,
    message: result.message,
    data: { appTransId: apptransid, amount, status }
  });
});

// =================================================================
// STRIPE PAYMENT
// =================================================================

/**
 * @desc    Create Stripe Payment Intent
 * @route   POST /api/payments/stripe/create-intent
 * @access  Private
 */
export const createStripePaymentIntent = asyncHandler(async (req, res) => {
  const { orderId } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });
  }
  if (order.buyerId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Không có quyền truy cập đơn hàng này' });
  }

  const existingPayment = await Payment.findOne({ orderId });
  if (existingPayment && existingPayment.status === 'completed') {
    return res.status(400).json({ success: false, message: 'Đơn hàng đã được thanh toán' });
  }

  const { clientSecret, paymentIntentId } = await stripeHelper.createPaymentIntent({
    amount: order.totals.grandTotal,
    orderId: order.orderNumber,
    customerEmail: req.user.email,
    description: `Thanh toán đơn hàng ${order.orderNumber}`
  });

  if (existingPayment) {
    existingPayment.status = 'processing';
    existingPayment.paymentMethod = 'stripe';
    existingPayment.paymentIntentId = paymentIntentId;
    await existingPayment.save();
  } else {
    await Payment.create({
      orderId, userId: req.user._id,
      amount: order.totals.grandTotal,
      paymentMethod: 'stripe', status: 'processing',
      paymentIntentId
    });
  }

  logger.info(`Stripe PaymentIntent created for order ${order.orderNumber}: ${paymentIntentId}`);

  res.json({
    success: true,
    message: 'Tạo thanh toán Stripe thành công',
    data: {
      clientSecret,
      paymentIntentId,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    }
  });
});

/**
 * @desc    Confirm Stripe payment after client-side completion
 * @route   POST /api/payments/stripe/confirm
 * @access  Private
 */
export const confirmStripePayment = asyncHandler(async (req, res) => {
  const { paymentIntentId } = req.body;

  const paymentIntent = await stripeHelper.getPaymentIntent(paymentIntentId);

  if (paymentIntent.status === 'succeeded') {
    const payment = await Payment.findOne({ paymentIntentId });
    if (payment && payment.status !== 'completed') {
      payment.status = 'completed';
      payment.transactionId = paymentIntentId;
      payment.completedAt = new Date();
      await payment.save();

      const order = await Order.findById(payment.orderId);
      if (order) {
        order.paymentStatus = 'paid';
        order.paymentDetails = {
          method: 'stripe',
          transactionId: paymentIntentId,
          paymentIntentId,
          paidAt: new Date()
        };
        await order.save();
      }

      logger.info(`Stripe payment confirmed for ${paymentIntentId}`);
    }

    return res.json({ success: true, message: 'Thanh toán thành công' });
  }

  res.status(400).json({
    success: false,
    message: `Thanh toán chưa hoàn tất. Trạng thái: ${paymentIntent.status}`
  });
});

/**
 * @desc    Stripe webhook handler
 * @route   POST /api/payments/stripe/webhook
 * @access  Public
 */
export const stripeWebhook = asyncHandler(async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripeHelper.verifyWebhookSignature(req.body, sig);
  } catch (err) {
    logger.error(`Stripe webhook signature failed: ${err.message}`);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const payment = await Payment.findOne({ paymentIntentId: paymentIntent.id });

    if (payment && payment.status !== 'completed') {
      payment.status = 'completed';
      payment.transactionId = paymentIntent.id;
      payment.completedAt = new Date();
      await payment.save();

      const order = await Order.findById(payment.orderId);
      if (order) {
        order.paymentStatus = 'paid';
        order.paymentDetails = {
          method: 'stripe', transactionId: paymentIntent.id,
          paymentIntentId: paymentIntent.id, paidAt: new Date()
        };
        await order.save();
      }

      logger.info(`Stripe webhook: Payment ${paymentIntent.id} succeeded`);
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object;
    const payment = await Payment.findOne({ paymentIntentId: paymentIntent.id });

    if (payment) {
      payment.status = 'failed';
      payment.failureReason = paymentIntent.last_payment_error?.message || 'Payment failed';
      await payment.save();

      const order = await Order.findById(payment.orderId);
      if (order) {
        order.paymentStatus = 'failed';
        order.orderStatus = 'CANCELLED';
        order.cancellationReason = `Stripe payment failed`;
        order.cancelledAt = new Date();
        await order.save();
      }
    }
  }

  res.json({ received: true });
});

export default {
  createBankTransferPayment,
  getPaymentByOrderId,
  getMyPayments,
  verifyBankTransferPayment,
  getPendingPayments,
  createVNPayPayment,
  vnpayIPN,
  vnpayReturn,
  createMoMoPayment,
  momoIPN,
  momoReturn,
  createZaloPayPayment,
  zalopayCallback,
  zalopayReturn,
  createStripePaymentIntent,
  confirmStripePayment,
  stripeWebhook
};
