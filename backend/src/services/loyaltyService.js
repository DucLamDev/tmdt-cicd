import LoyaltyPoint from '../models/LoyaltyPoint.js';
import Order from '../models/Order.js';
import { createNotificationInternal } from '../controllers/notificationController.js';
import logger from '../config/logger.js';

export const calculateOrderPoints = (order) => {
  const total = Number(order?.totals?.grandTotal || 0);
  return Math.max(1, Math.floor(total / 10000));
};

export const awardDeliveredOrderPoints = async (order) => {
  if (!order || order.orderStatus !== 'DELIVERED') return null;

  const alreadyAwarded = await LoyaltyPoint.exists({
    userId: order.buyerId,
    'transactions.orderId': order._id,
    'transactions.type': 'earn'
  });
  if (alreadyAwarded) return null;

  const points = calculateOrderPoints(order);
  let loyalty = await LoyaltyPoint.findOne({ userId: order.buyerId });
  if (!loyalty) loyalty = await LoyaltyPoint.create({ userId: order.buyerId });

  loyalty.addPoints(points, `Hoàn tất đơn hàng ${order.orderNumber}`, order._id);
  await loyalty.save();

  await createNotificationInternal({
    userId: order.buyerId,
    title: 'Đã cộng điểm thưởng',
    message: `Bạn nhận ${points} điểm từ đơn ${order.orderNumber}.`,
    type: 'promotion',
    actionUrl: '/loyalty',
    referenceId: order._id,
    referenceModel: 'Order'
  }).catch((error) => logger.warn(`Cannot notify loyalty points: ${error.message}`));

  return { points, loyalty };
};

export const syncDeliveredOrderLoyaltyForUser = async (userId) => {
  const deliveredOrders = await Order.find({
    buyerId: userId,
    orderStatus: 'DELIVERED'
  }).select('_id buyerId orderNumber orderStatus totals').lean();

  let awarded = 0;
  for (const order of deliveredOrders) {
    const result = await awardDeliveredOrderPoints(order);
    if (result?.points) awarded += result.points;
  }
  return awarded;
};
