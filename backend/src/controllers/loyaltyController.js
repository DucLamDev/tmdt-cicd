import LoyaltyPoint from '../models/LoyaltyPoint.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Shop from '../models/Shop.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import logger from '../config/logger.js';
import { syncDeliveredOrderLoyaltyForUser } from '../services/loyaltyService.js';

export const getMyPoints = asyncHandler(async (req, res) => {
  await syncDeliveredOrderLoyaltyForUser(req.user._id);
  let loyalty = await LoyaltyPoint.findOne({ userId: req.user._id });
  if (!loyalty) {
    loyalty = await LoyaltyPoint.create({ userId: req.user._id });
  }
  res.json({ success: true, data: loyalty });
});

export const getPointsHistory = asyncHandler(async (req, res) => {
  const loyalty = await LoyaltyPoint.findOne({ userId: req.user._id });
  if (!loyalty) return res.json({ success: true, data: { transactions: [], totalPoints: 0, tier: 'bronze' } });
  const { page = 1, limit = 20 } = req.query;
  const start = (parseInt(page) - 1) * parseInt(limit);
  const transactions = loyalty.transactions.sort((a, b) => b.createdAt - a.createdAt).slice(start, start + parseInt(limit));
  res.json({ success: true, data: { transactions, totalPoints: loyalty.totalPoints, tier: loyalty.tier, lifetimePoints: loyalty.lifetimePoints, total: loyalty.transactions.length } });
});

export const redeemPoints = asyncHandler(async (req, res) => {
  const { points, orderId } = req.body;
  if (!points || points <= 0) return res.status(400).json({ success: false, message: 'Số điểm không hợp lệ' });
  const loyalty = await LoyaltyPoint.findOne({ userId: req.user._id });
  if (!loyalty || loyalty.totalPoints < points) return res.status(400).json({ success: false, message: 'Không đủ điểm' });
  loyalty.redeemPoints(points, `Đổi điểm cho đơn hàng`, orderId);
  await loyalty.save();
  logger.info(`User ${req.user.email} redeemed ${points} points`);
  res.json({ success: true, message: `Đã đổi ${points} điểm thành công`, data: { totalPoints: loyalty.totalPoints, discountAmount: points * 10 } });
});

export const adminAdjustPoints = asyncHandler(async (req, res) => {
  const { userId, points, description } = req.body;
  let loyalty = await LoyaltyPoint.findOne({ userId });
  if (!loyalty) loyalty = await LoyaltyPoint.create({ userId });
  if (points > 0) {
    loyalty.addPoints(points, description || 'Admin điều chỉnh');
  } else {
    loyalty.totalPoints = Math.max(0, loyalty.totalPoints + points);
    loyalty.transactions.push({ type: 'admin_adjust', points, description: description || 'Admin điều chỉnh' });
  }
  await loyalty.save();
  logger.info(`Admin ${req.user.email} adjusted ${points} points for user ${userId}`);
  res.json({ success: true, message: 'Điều chỉnh điểm thành công', data: loyalty });
});

export const getTierBenefits = asyncHandler(async (req, res) => {
  const tiers = {
    bronze: { minPoints: 0, discount: 0, freeShipping: false, label: 'Đồng' },
    silver: { minPoints: 5000, discount: 2, freeShipping: false, label: 'Bạc' },
    gold: { minPoints: 10000, discount: 5, freeShipping: true, label: 'Vàng' },
    platinum: { minPoints: 20000, discount: 8, freeShipping: true, label: 'Bạch Kim' },
    diamond: { minPoints: 50000, discount: 15, freeShipping: true, label: 'Kim Cương' }
  };
  res.json({ success: true, data: tiers });
});

const toLevel = (score) => {
  if (score >= 900) return 'Xuất sắc';
  if (score >= 600) return 'Uy tín cao';
  if (score >= 300) return 'Đang phát triển';
  return 'Mới';
};

export const getRoleScores = asyncHandler(async (req, res) => {
  const roles = req.user.roles || ['customer'];
  const loyalty = await LoyaltyPoint.findOne({ userId: req.user._id }).lean();
  const scores = [];

  if (roles.includes('customer')) {
    const [orders, delivered] = await Promise.all([
      Order.countDocuments({ buyerId: req.user._id }),
      Order.countDocuments({ buyerId: req.user._id, orderStatus: 'DELIVERED' })
    ]);
    const score = Math.min(1000, Math.round((delivered * 35) + (orders * 10) + ((loyalty?.lifetimePoints || 0) / 50)));
    scores.push({
      role: 'customer',
      label: 'Khách hàng thân thiết',
      score,
      level: toLevel(score),
      criteria: ['Đơn đã mua', 'Điểm tích lũy', 'Tỷ lệ nhận hàng thành công']
    });
  }

  if (roles.includes('seller')) {
    const shop = await Shop.findOne({ ownerId: req.user._id }).lean();
    if (shop) {
      const activeProducts = await Product.countDocuments({ sellerId: shop._id, isActive: true });
      const score = Math.min(1000, Math.round(
        (shop.stats?.totalOrders || 0) * 25 +
        (shop.ratingAvg || 0) * 80 +
        activeProducts * 8 +
        (shop.isVerified ? 120 : 0)
      ));
      scores.push({
        role: 'seller',
        label: 'Người bán uy tín',
        score,
        level: toLevel(score),
        criteria: ['Lượt mua', 'Điểm đánh giá shop', 'Sản phẩm đang bán', 'Xác minh shop']
      });
    }
  }

  if (roles.includes('shipper')) {
    const [assigned, delivered] = await Promise.all([
      Order.countDocuments({ shipperId: req.user._id }),
      Order.countDocuments({ shipperId: req.user._id, orderStatus: 'DELIVERED' })
    ]);
    const successRate = assigned ? delivered / assigned : 0;
    const score = Math.min(1000, Math.round(delivered * 30 + successRate * 250));
    scores.push({
      role: 'shipper',
      label: 'Shipper tích cực',
      score,
      level: toLevel(score),
      criteria: ['Đơn đã giao', 'Tỷ lệ giao thành công', 'Tốc độ xử lý']
    });
  }

  res.json({ success: true, data: scores });
});

export default { getMyPoints, getPointsHistory, redeemPoints, adminAdjustPoints, getTierBenefits, getRoleScores };
