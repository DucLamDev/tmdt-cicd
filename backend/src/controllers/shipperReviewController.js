import Order from '../models/Order.js';
import ShipperReview from '../models/ShipperReview.js';
import User from '../models/User.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import mongoose from 'mongoose';
import { createNotificationInternal } from './notificationController.js';
import { sendQualityWarningEmail } from '../utils/email.js';
import logger from '../config/logger.js';

const LOW_RATING_THRESHOLD = 2;

const incrementShipperWarning = async ({ shipperId, rating, reason }) => {
  const shipper = await User.findById(shipperId);
  if (!shipper) return 0;

  const currentWarning = shipper.qualityWarnings?.shipper || {};
  const warningCount = Number(currentWarning.count || 0) + 1;
  shipper.qualityWarnings = {
    ...(shipper.qualityWarnings?.toObject?.() || shipper.qualityWarnings || {}),
    shipper: {
      count: warningCount,
      lastAt: new Date(),
      lastReason: reason,
      lastScore: rating
    }
  };
  await shipper.save();
  return warningCount;
};

const notifyLowShipperRating = async ({ order, review, customerName, rating, content }) => {
  const reason = content || `Khách hàng đánh giá ${rating} sao cho đơn ${order.orderNumber}`;
  const warningCount = await incrementShipperWarning({
    shipperId: order.shipperId,
    rating,
    reason
  });
  const shipper = await User.findById(order.shipperId).select('email name').lean();

  await createNotificationInternal({
    userId: order.shipperId,
    title: `Cảnh báo chất lượng giao hàng lần ${warningCount}`,
    message: `Bạn nhận ${rating} sao cho đơn ${order.orderNumber}. Vui lòng kiểm tra phản hồi và cải thiện chất lượng phục vụ.`,
    type: 'system',
    actionUrl: '/shipper/reports',
    referenceId: review._id,
    referenceModel: 'ShipperReview'
  });

  if (shipper?.email) {
    try {
      await sendQualityWarningEmail(shipper.email, shipper.name, {
        roleLabel: 'Shipper',
        reason,
        warningCount,
        score: rating,
        reviews: 1
      });
    } catch (error) {
      logger.error(`Failed to send low shipper rating warning email: ${error.message}`);
    }
  }

  const admins = await User.find({ roles: 'admin', isActive: true }).select('_id').lean();
  await Promise.all(admins.map((admin) => createNotificationInternal({
    userId: admin._id,
    title: 'Shipper bị đánh giá thấp',
    message: `${customerName || 'Khách hàng'} đánh giá shipper ${rating} sao cho đơn ${order.orderNumber}. Số lần cảnh báo hiện tại: ${warningCount}.`,
    type: 'system',
    actionUrl: '/admin/reports/quality-scores',
    referenceId: review._id,
    referenceModel: 'ShipperReview'
  })));
};

export const createShipperReview = asyncHandler(async (req, res) => {
  const { orderId, rating, content, images = [] } = req.body;
  const numericRating = Number(rating);
  if (!numericRating || numericRating < 1 || numericRating > 5) {
    return res.status(400).json({ success: false, message: 'Số sao phải từ 1 đến 5' });
  }

  const order = await Order.findById(orderId);
  if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
  if (order.buyerId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Không có quyền đánh giá đơn hàng này' });
  }
  if (order.orderStatus !== 'DELIVERED' || !order.shipperId) {
    return res.status(400).json({ success: false, message: 'Chỉ đánh giá shipper sau khi đơn giao thành công' });
  }

  const review = await ShipperReview.create({
    orderId,
    shipperId: order.shipperId,
    customerId: req.user._id,
    rating: numericRating,
    content,
    images
  });

  await createNotificationInternal({
    userId: order.shipperId,
    title: 'Có đánh giá giao hàng mới',
    message: `${req.user.name || 'Khách hàng'} đã đánh giá bạn ${numericRating} sao cho đơn ${order.orderNumber}.`,
    type: 'message',
    actionUrl: '/shipper/reports',
    referenceId: review._id,
    referenceModel: 'ShipperReview'
  });

  if (numericRating <= LOW_RATING_THRESHOLD) {
    await notifyLowShipperRating({
      order,
      review,
      customerName: req.user.name,
      rating: numericRating,
      content
    });
  }

  res.status(201).json({ success: true, message: 'Đã gửi đánh giá shipper', data: review });
});

export const getShipperReviewSummary = asyncHandler(async (req, res) => {
  const shipperId = req.params.shipperId;
  const [summary] = await ShipperReview.aggregate([
    { $match: { shipperId: new mongoose.Types.ObjectId(shipperId) } },
    { $group: { _id: '$shipperId', averageRating: { $avg: '$rating' }, totalReviews: { $sum: 1 } } }
  ]);

  res.json({
    success: true,
    data: {
      averageRating: summary?.averageRating || 0,
      totalReviews: summary?.totalReviews || 0
    }
  });
});

export default { createShipperReview, getShipperReviewSummary };
