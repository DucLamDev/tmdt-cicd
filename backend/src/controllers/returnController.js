import Return from '../models/Return.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Shop from '../models/Shop.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import logger from '../config/logger.js';
import { createNotificationInternal, notifyOrderStatusChange } from './notificationController.js';

const DAMAGE_REASONS = new Set(['defective', 'damaged', 'not_as_described', 'wrong_item']);

/**
 * @desc    Request a return/refund
 * @route   POST /api/returns
 * @access  Private (Customer)
 */
export const createReturn = asyncHandler(async (req, res) => {
  const { orderId, items, returnReason, description, images } = req.body;
  const evidenceImages = Array.isArray(images) ? images.filter(Boolean) : [];

  if (!description || description.trim().length < 20) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng mô tả rõ lý do trả hàng, tối thiểu 20 ký tự'
    });
  }

  if (DAMAGE_REASONS.has(returnReason) && evidenceImages.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Trường hợp hàng lỗi/hư hỏng/sai mô tả cần đính kèm ít nhất 1 ảnh sản phẩm'
    });
  }

  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });
  }
  if (order.buyerId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Không có quyền' });
  }
  if (order.orderStatus !== 'DELIVERED') {
    return res.status(400).json({ success: false, message: 'Chỉ có thể đổi/trả hàng đã giao thành công' });
  }

  const deliveredDate = order.actualDelivery || order.updatedAt;
  const daysSinceDelivery = (Date.now() - new Date(deliveredDate).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceDelivery > 7) {
    return res.status(400).json({ success: false, message: 'Đã quá thời hạn đổi/trả hàng (7 ngày)' });
  }

  const existing = await Return.findOne({
    orderId,
    buyerId: req.user._id,
    status: { $nin: ['RETURN_REJECTED', 'RETURN_COMPLETED'] }
  });
  if (existing) {
    return res.status(400).json({ success: false, message: 'Đơn hàng này đã có yêu cầu đổi/trả đang xử lý' });
  }

  const returnItems = items.map(item => {
    const orderItem = order.items.find(oi => oi.productId.toString() === item.productId);
    if (!orderItem) return null;
    return {
      productId: orderItem.productId,
      title: orderItem.title,
      image: orderItem.image,
      quantity: item.quantity || orderItem.quantity,
      price: orderItem.price,
      reason: item.reason || returnReason
    };
  }).filter(Boolean);

  if (returnItems.length === 0) {
    return res.status(400).json({ success: false, message: 'Không tìm thấy sản phẩm hợp lệ để đổi/trả' });
  }

  if (returnItems.some((item) => DAMAGE_REASONS.has(item.reason)) && evidenceImages.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Sản phẩm trả vì lỗi/hư hỏng/sai mô tả cần có ảnh minh chứng'
    });
  }

  const refundAmount = returnItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const returnRequest = await Return.create({
    orderId,
    buyerId: req.user._id,
    sellerId: order.sellerId,
    items: returnItems,
    returnReason,
    description,
    images: evidenceImages,
    refundAmount
  });

  order.orderStatus = 'RETURN_REQUESTED';
  order.statusHistory.push({
    status: 'RETURN_REQUESTED',
    timestamp: new Date(),
    note: `Return ${returnRequest.returnNumber} requested`,
    updatedBy: req.user._id
  });
  await order.save();

  await notifyOrderStatusChange(order, 'RETURN_REQUESTED');

  const shop = await Shop.findById(order.sellerId).select('ownerId shopName').lean();
  if (shop?.ownerId) {
    await createNotificationInternal({
      userId: shop.ownerId,
      title: 'Có yêu cầu trả hàng mới',
      message: `Đơn ${order.orderNumber} có yêu cầu trả hàng cần bạn phản hồi.`,
      type: 'order',
      actionUrl: '/seller/returns',
      referenceId: returnRequest._id,
      referenceModel: 'Return'
    });
  }

  logger.info(`Return request created: ${returnRequest.returnNumber} by ${req.user.email}`);

  res.status(201).json({
    success: true,
    message: 'Yêu cầu đổi/trả hàng đã được gửi',
    data: returnRequest
  });
});

/**
 * @desc    Get customer's returns
 * @route   GET /api/returns/my-returns
 * @access  Private (Customer)
 */
export const getMyReturns = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const filter = { buyerId: req.user._id };
  if (status) filter.status = status;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [returns, total] = await Promise.all([
    Return.find(filter)
      .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit))
      .populate('orderId', 'orderNumber').lean(),
    Return.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: { returns, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } }
  });
});

/**
 * @desc    Get return detail
 * @route   GET /api/returns/:id
 * @access  Private
 */
export const getReturnDetail = asyncHandler(async (req, res) => {
  const returnReq = await Return.findById(req.params.id)
    .populate('orderId', 'orderNumber shippingAddress')
    .populate('buyerId', 'name email phone')
    .populate('sellerId', 'shopName phone email');

  if (!returnReq) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu đổi/trả' });
  }

  const isBuyer = returnReq.buyerId._id.toString() === req.user._id.toString();
  const shop = await Shop.findOne({ _id: returnReq.sellerId._id, ownerId: req.user._id });
  const isAdmin = req.user.roles?.includes('admin');
  if (!isBuyer && !shop && !isAdmin) {
    return res.status(403).json({ success: false, message: 'Không có quyền xem' });
  }

  res.json({ success: true, data: returnReq });
});

/**
 * @desc    Seller: Get returns for their shop
 * @route   GET /api/seller/returns
 * @access  Private (Seller)
 */
export const getSellerReturns = asyncHandler(async (req, res) => {
  const shop = await Shop.findOne({ ownerId: req.user._id });
  if (!shop) return res.status(404).json({ success: false, message: 'Shop không tồn tại' });

  const { page = 1, limit = 20, status } = req.query;
  const filter = { sellerId: shop._id };
  if (status) filter.status = status;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [returns, total] = await Promise.all([
    Return.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit))
      .populate('buyerId', 'name email phone')
      .populate('orderId', 'orderNumber').lean(),
    Return.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: { returns, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } }
  });
});

/**
 * @desc    Seller: Approve/Reject return
 * @route   PATCH /api/seller/returns/:id/respond
 * @access  Private (Seller)
 */
export const respondToReturn = asyncHandler(async (req, res) => {
  const { approved, sellerNote } = req.body;
  const returnReq = await Return.findById(req.params.id);
  if (!returnReq) return res.status(404).json({ success: false, message: 'Không tìm thấy' });

  const shop = await Shop.findOne({ ownerId: req.user._id });
  if (!shop || returnReq.sellerId.toString() !== shop._id.toString()) {
    return res.status(403).json({ success: false, message: 'Không có quyền' });
  }
  if (returnReq.status !== 'RETURN_REQUESTED') {
    return res.status(400).json({ success: false, message: 'Yêu cầu đã được xử lý' });
  }

  returnReq.status = approved ? 'RETURN_APPROVED' : 'RETURN_REJECTED';
  returnReq.sellerNote = sellerNote;
  await returnReq.save();

  await Order.findByIdAndUpdate(returnReq.orderId, {
    orderStatus: returnReq.status,
    $push: {
      statusHistory: {
        status: returnReq.status,
        timestamp: new Date(),
        note: sellerNote,
        updatedBy: req.user._id
      }
    }
  });

  const order = await Order.findById(returnReq.orderId);
  if (order) await notifyOrderStatusChange(order, returnReq.status);

  logger.info(`Return ${returnReq.returnNumber} ${approved ? 'approved' : 'rejected'} by seller ${req.user.email}`);
  res.json({ success: true, message: approved ? 'Đã chấp nhận yêu cầu đổi/trả' : 'Đã từ chối yêu cầu đổi/trả', data: returnReq });
});

/**
 * @desc    Admin: Get all returns
 * @route   GET /api/admin/returns
 * @access  Private (Admin)
 */
export const getAdminReturns = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const filter = {};
  if (status) filter.status = status;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [returns, total] = await Promise.all([
    Return.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit))
      .populate('buyerId', 'name email')
      .populate('sellerId', 'shopName')
      .populate('orderId', 'orderNumber').lean(),
    Return.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: { returns, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } }
  });
});

/**
 * @desc    Admin: Process refund
 * @route   PATCH /api/admin/returns/:id/refund
 * @access  Private (Admin)
 */
export const processRefund = asyncHandler(async (req, res) => {
  const { refundAmount, adminNote } = req.body;
  const returnReq = await Return.findById(req.params.id);
  if (!returnReq) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
  if (!['RETURN_APPROVED', 'RETURN_PICKED'].includes(returnReq.status)) {
    return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ để hoàn tiền' });
  }

  returnReq.status = 'RETURN_COMPLETED';
  returnReq.refundAmount = refundAmount || returnReq.refundAmount;
  returnReq.adminNote = adminNote;
  returnReq.refundedAt = new Date();
  await returnReq.save();

  await Order.findByIdAndUpdate(returnReq.orderId, {
    orderStatus: 'RETURN_COMPLETED',
    paymentStatus: 'refunded',
    $push: {
      statusHistory: {
        status: 'RETURN_COMPLETED',
        timestamp: new Date(),
        note: adminNote || 'Refund completed',
        updatedBy: req.user._id
      }
    }
  });

  const order = await Order.findById(returnReq.orderId);
  if (order) await notifyOrderStatusChange(order, 'RETURN_COMPLETED');

  // Restore stock
  for (const item of returnReq.items) {
    await Product.findByIdAndUpdate(item.productId, {
      $inc: { stock: item.quantity, soldCount: -item.quantity }
    });
  }

  logger.info(`Return ${returnReq.returnNumber} refunded by admin ${req.user.email}: ${returnReq.refundAmount} VND`);
  res.json({ success: true, message: 'Hoàn tiền thành công', data: returnReq });
});

export const markReturnPicked = asyncHandler(async (req, res) => {
  const returnReq = await Return.findById(req.params.id);
  if (!returnReq) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
  if (returnReq.status !== 'RETURN_APPROVED') {
    return res.status(400).json({ success: false, message: 'Chỉ có thể lấy hàng sau khi seller duyệt trả hàng' });
  }

  returnReq.status = 'RETURN_PICKED';
  returnReq.trackingNumber = req.body.trackingNumber || returnReq.trackingNumber;
  await returnReq.save();

  await Order.findByIdAndUpdate(returnReq.orderId, {
    orderStatus: 'RETURN_PICKED',
    $push: {
      statusHistory: {
        status: 'RETURN_PICKED',
        timestamp: new Date(),
        note: req.body.note || 'Return picked up',
        updatedBy: req.user._id
      }
    }
  });

  const order = await Order.findById(returnReq.orderId);
  if (order) await notifyOrderStatusChange(order, 'RETURN_PICKED');

  res.json({ success: true, message: 'Đã xác nhận shipper lấy hàng trả', data: returnReq });
});

export default { createReturn, getMyReturns, getReturnDetail, getSellerReturns, respondToReturn, getAdminReturns, processRefund, markReturnPicked };
