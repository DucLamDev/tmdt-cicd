import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Shop from '../models/Shop.js';
import ShipperReview from '../models/ShipperReview.js';
import Coupon from '../models/Coupon.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import logger from '../config/logger.js';
import crypto from 'crypto';
import { exportAdminSystemReport } from '../utils/excelExporter.js';
import { sendAccountLockEmail, sendAccountDeletionEmail, sendAccountRejectionEmail, sendProductRejectionEmail, sendQualityWarningEmail } from '../utils/email.js';
import { isStrongPassword, PASSWORD_RULE_MESSAGE } from '../utils/validators.js';
import { createNotificationInternal } from './notificationController.js';
import { generateTokenPair } from '../utils/jwt.js';

const QUALITY_WARNING_LIMIT = 3;
const QUALITY_WARNING_MIN_REVIEWS = 2;
const QUALITY_WARNING_SCORE = 3.5;

const verifyAdminSecretCode = (input = '') => {
  const configuredSecret = process.env.ADMIN_IMPERSONATION_SECRET || process.env.ADMIN_SECRET_CODE;
  if (!configuredSecret) return false;

  const inputBuffer = Buffer.from(String(input));
  const secretBuffer = Buffer.from(String(configuredSecret));
  return inputBuffer.length === secretBuffer.length && crypto.timingSafeEqual(inputBuffer, secretBuffer);
};

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/admin/stats
 * @access  Private (Admin)
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  // Build date filter only if dates are provided
  const dateFilter = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate) dateFilter.$lte = new Date(endDate);
  
  // Build user filter - only add createdAt if dateFilter has values
  const userFilter = {};
  if (startDate || endDate) {
    userFilter.createdAt = dateFilter;
  }
  
  const [
    totalUsers,
    totalSellers,
    totalShippers,
    totalProducts,
    totalOrders,
    totalRevenue,
    newUsers,
    pendingProducts,
    pendingApprovals,
    revenueTrend,
    orderStatusDistribution,
    roleDistribution,
    topProducts,
    topSellers
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ roles: 'seller' }),
    User.countDocuments({ roles: 'shipper' }),
    Product.countDocuments({ isActive: true }),
    Order.countDocuments(),
    Order.aggregate([
      { $match: { orderStatus: 'DELIVERED' } },
      { $group: { _id: null, total: { $sum: '$totals.grandTotal' } } }
    ]),
    User.countDocuments(userFilter),
    Product.countDocuments({ isApproved: false, isActive: true }),
    User.countDocuments({ 
      approvalStatus: 'pending',
      $or: [{ roles: 'seller' }, { roles: 'shipper' }]
    }),
    Order.aggregate([
      { $match: { orderStatus: 'DELIVERED', createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$totals.grandTotal' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]),
    Order.aggregate([
      { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    User.aggregate([
      { $unwind: '$roles' },
      { $group: { _id: '$roles', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    Order.aggregate([
      { $match: { orderStatus: { $nin: ['CANCELLED', 'FAILED'] } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          title: { $first: '$items.title' },
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 8 }
    ]),
    Order.aggregate([
      { $match: { orderStatus: { $nin: ['CANCELLED', 'FAILED'] } } },
      {
        $group: {
          _id: '$sellerId',
          orders: { $sum: 1 },
          revenue: { $sum: '$totals.grandTotal' }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 6 },
      { $lookup: { from: 'shops', localField: '_id', foreignField: '_id', as: 'shop' } },
      { $unwind: { path: '$shop', preserveNullAndEmptyArrays: true } },
      { $project: { orders: 1, revenue: 1, shopName: '$shop.shopName' } }
    ])
  ]);

  res.json({
    success: true,
    data: {
      totalUsers,
      totalSellers,
      totalShippers,
      totalProducts,
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      newUsers,
      pendingProducts,
      pendingApprovals,
      revenueTrend: revenueTrend.map((item) => ({ date: item._id, revenue: item.revenue, orders: item.orders })),
      orderStatusDistribution: orderStatusDistribution.map((item) => ({ status: item._id, count: item.count })),
      roleDistribution: roleDistribution.map((item) => ({ role: item._id, count: item.count })),
      topProducts,
      topSellers
    }
  });
});

/**
 * @desc    Get all users with filters
 * @route   GET /api/admin/users
 * @access  Private (Admin)
 */
export const getUsers = asyncHandler(async (req, res) => {
  const { role, isActive, page = 1, limit = 20, search } = req.query;

  const filter = {};
  if (role) filter.roles = role;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    User.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
});

export const impersonateUser = asyncHandler(async (req, res) => {
  const { secretCode } = req.body;

  if (!verifyAdminSecretCode(secretCode)) {
    logger.warn(`Admin impersonation denied for ${req.user.email}: invalid or missing secret code`);
    return res.status(403).json({
      success: false,
      message: 'MÃ£ bÃ­ máº­t admin khÃ´ng há»£p lá»‡'
    });
  }

  const targetUser = await User.findById(req.params.id);
  if (!targetUser) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  if (targetUser.roles.includes('admin')) {
    return res.status(403).json({
      success: false,
      message: 'KhÃ´ng thá»ƒ Ä‘Äƒng nháº­p thay tÃ i khoáº£n admin khÃ¡c'
    });
  }

  if (!targetUser.isActive) {
    return res.status(403).json({
      success: false,
      message: 'TÃ i khoáº£n Ä‘ang bá»‹ khÃ³a. Vui lÃ²ng má»Ÿ khÃ³a trÆ°á»›c khi Ä‘Äƒng nháº­p thay.'
    });
  }

  const impersonationPayload = {
    impersonatedBy: req.user._id.toString(),
    impersonatedByEmail: req.user.email,
    impersonatedAt: new Date().toISOString()
  };
  const tokens = generateTokenPair(targetUser, impersonationPayload);

  logger.warn(`Admin ${req.user.email} impersonated ${targetUser.email}`);

  res.json({
    success: true,
    message: 'ÄÃ£ Ä‘Äƒng nháº­p thay tÃ i khoáº£n',
    data: {
      user: {
        ...targetUser.toSafeObject(),
        impersonatedBy: {
          id: req.user._id,
          email: req.user.email,
          name: req.user.name
        }
      },
      ...tokens,
      impersonation: impersonationPayload
    }
  });
});

/**
 * @desc    Lock/Unlock user account
 * @route   PATCH /api/admin/users/:id/lock
 * @access  Private (Admin)
 */
export const toggleUserLock = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  const wasActive = user.isActive;
  user.isActive = !user.isActive;
  await user.save();

  logger.info(`User ${user.email} ${user.isActive ? 'unlocked' : 'locked'} by admin ${req.user.email}`);

  // Send email notification when locking account
  if (wasActive && !user.isActive && reason) {
    try {
      await sendAccountLockEmail(user.email, user.name, reason);
    } catch (error) {
      logger.error(`Failed to send lock notification email: ${error.message}`);
    }
  }

  res.json({
    success: true,
    message: `User ${user.isActive ? 'unlocked' : 'locked'} successfully`,
    data: user.toSafeObject()
  });
});

export const issueQualityWarning = asyncHandler(async (req, res) => {
  const { role, reason = '', score, reviews } = req.body;
  const targetRole = ['seller', 'shipper'].includes(role) ? role : null;

  if (!targetRole) {
    return res.status(400).json({
      success: false,
      message: 'Vai trò cảnh báo không hợp lệ'
    });
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  if (!user.roles.includes(targetRole)) {
    return res.status(400).json({
      success: false,
      message: 'Tài khoản không thuộc nhóm cần cảnh báo'
    });
  }

  const currentWarning = user.qualityWarnings?.[targetRole] || {};
  const warningCount = Number(currentWarning.count || 0) + 1;
  user.qualityWarnings = {
    ...(user.qualityWarnings?.toObject?.() || user.qualityWarnings || {}),
    [targetRole]: {
      count: warningCount,
      lastAt: new Date(),
      lastReason: reason,
      lastScore: Number.isFinite(Number(score)) ? Number(score) : currentWarning.lastScore
    }
  };
  await user.save();

  let notificationSent = false;
  let emailSent = false;
  let emailError = null;
  const roleLabel = targetRole === 'seller' ? 'Seller' : 'Shipper';
  const title = `Cảnh báo chất lượng ${roleLabel} lần ${warningCount}/${QUALITY_WARNING_LIMIT}`;
  const message = reason || `Điểm đánh giá ${roleLabel.toLowerCase()} đang thấp, vui lòng cải thiện chất lượng phục vụ.`;

  try {
    const notification = await createNotificationInternal({
      userId: user._id,
      title,
      message,
      type: 'system',
      actionUrl: targetRole === 'seller' ? '/seller/dashboard' : '/shipper/reports',
      metadata: {
        kind: 'quality_warning',
        role: targetRole,
        warningCount,
        score,
        reviews
      }
    });
    notificationSent = Boolean(notification);
  } catch (error) {
    logger.error(`Failed to create quality warning notification: ${error.message}`);
  }

  try {
    await sendQualityWarningEmail(user.email, user.name, {
      roleLabel,
      reason: message,
      warningCount,
      warningLimit: QUALITY_WARNING_LIMIT,
      score,
      reviews
    });
    emailSent = true;
  } catch (error) {
    emailError = error.message;
    logger.error(`Failed to send quality warning email: ${error.message}`);
  }

  logger.info(`Admin ${req.user.email} warned ${targetRole} ${user.email} (${warningCount}/${QUALITY_WARNING_LIMIT})`);

  const responseMessage = warningCount >= QUALITY_WARNING_LIMIT
    ? 'Đã ghi nhận cảnh báo. Tài khoản đã đủ số lần cảnh báo để admin cân nhắc khóa nếu điểm vẫn thấp.'
    : notificationSent && emailSent
      ? 'Đã gửi cảnh báo chất lượng qua thông báo và email'
      : notificationSent
        ? 'Đã tạo thông báo cảnh báo, nhưng chưa gửi được email. Vui lòng kiểm tra cấu hình SMTP.'
        : emailSent
          ? 'Đã gửi email cảnh báo, nhưng chưa tạo được thông báo trong hệ thống.'
          : 'Đã ghi nhận cảnh báo, nhưng chưa gửi được thông báo/email. Vui lòng kiểm tra log hệ thống.';

  res.json({
    success: true,
    message: responseMessage,
    data: {
      userId: user._id,
      role: targetRole,
      warningCount,
      warningLimit: QUALITY_WARNING_LIMIT,
      canLock: warningCount >= QUALITY_WARNING_LIMIT,
      notificationSent,
      emailSent,
      emailError,
      deliveryStatusMessage: responseMessage
    }
  });
});

/**
 * @desc    Delete user
 * @route   DELETE /api/admin/users/:id
 * @access  Private (Admin)
 */
export const deleteUser = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  const userEmail = user.email;
  const userName = user.name;

  // Send email notification before deleting
  if (reason) {
    try {
      await sendAccountDeletionEmail(userEmail, userName, reason);
    } catch (error) {
      logger.error(`Failed to send deletion notification email: ${error.message}`);
    }
  }

  await user.deleteOne();

  logger.info(`User ${userEmail} deleted by admin ${req.user.email}`);

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
});

export const changeUserPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  if (!isStrongPassword(newPassword)) {
    return res.status(400).json({ success: false, message: PASSWORD_RULE_MESSAGE });
  }

  const user = await User.findById(req.params.id).select('+passwordHash');
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  user.passwordHash = newPassword;
  await user.save();

  logger.info(`Admin ${req.user.email} changed password for user ${user.email}`);
  res.json({ success: true, message: 'Đã đổi mật khẩu người dùng' });
});

/**
 * @desc    Get all products for approval
 * @route   GET /api/admin/products
 * @access  Private (Admin)
 */
export const getProducts = asyncHandler(async (req, res) => {
  const { isApproved, isActive, page = 1, limit = 20, search } = req.query;

  const filter = {};
  if (isApproved !== undefined) filter.isApproved = isApproved === 'true';
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('sellerId', 'shopName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Product.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: {
      products,
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
 * @desc    Approve/Reject product
 * @route   PATCH /api/admin/products/:id/approve
 * @access  Private (Admin)
 */
export const approveProduct = asyncHandler(async (req, res) => {
  const { approved, reason } = req.body;

  const product = await Product.findById(req.params.id).populate('sellerId', 'email name');

  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }

  product.isApproved = approved;
  await product.save();

  logger.info(`Product ${product.title} ${approved ? 'approved' : 'rejected'} by admin ${req.user.email}`);

  // Send email notification when rejecting product
  if (!approved && reason && product.sellerId) {
    try {
      await sendProductRejectionEmail(
        product.sellerId.email,
        product.sellerId.name,
        product.title,
        reason
      );
    } catch (error) {
      logger.error(`Failed to send product rejection email: ${error.message}`);
    }
  }

  res.json({
    success: true,
    message: `Product ${approved ? 'approved' : 'rejected'} successfully`,
    data: product
  });
});

/**
 * @desc    Delete product
 * @route   DELETE /api/admin/products/:id
 * @access  Private (Admin)
 */
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }

  await product.deleteOne();

  logger.info(`Product ${product.title} deleted by admin ${req.user.email}`);

  res.json({
    success: true,
    message: 'Product deleted successfully'
  });
});

/**
 * @desc    Get all orders
 * @route   GET /api/admin/orders
 * @access  Private (Admin)
 */
export const getOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (status) filter.orderStatus = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('buyerId', 'name email')
      .populate('sellerId', 'shopName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Order.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: {
      orders,
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
 * @desc    Create global promotion/coupon
 * @route   POST /api/admin/promotions
 * @access  Private (Admin)
 */
export const createPromotion = asyncHandler(async (req, res) => {
  const coupon = await Coupon.create({
    ...req.body,
    createdBy: req.user._id
  });

  logger.info(`Promotion ${coupon.code} created by admin ${req.user.email}`);

  res.status(201).json({
    success: true,
    message: 'Promotion created successfully',
    data: coupon
  });
});

/**
 * @desc    Get all promotions
 * @route   GET /api/admin/promotions
 * @access  Private (Admin)
 */
export const getPromotions = asyncHandler(async (req, res) => {
  const { isActive, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (isActive !== undefined) filter.isActive = isActive === 'true';

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [promotions, total] = await Promise.all([
    Coupon.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Coupon.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: {
      promotions,
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
 * @desc    Update promotion
 * @route   PUT /api/admin/promotions/:id
 * @access  Private (Admin)
 */
export const updatePromotion = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!coupon) {
    return res.status(404).json({
      success: false,
      message: 'Promotion not found'
    });
  }

  res.json({
    success: true,
    message: 'Promotion updated successfully',
    data: coupon
  });
});

/**
 * @desc    Delete promotion
 * @route   DELETE /api/admin/promotions/:id
 * @access  Private (Admin)
 */
export const deletePromotion = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);

  if (!coupon) {
    return res.status(404).json({
      success: false,
      message: 'Promotion not found'
    });
  }

  res.json({
    success: true,
    message: 'Promotion deleted successfully'
  });
});

/**
 * @desc    Get revenue report
 * @route   GET /api/admin/reports/revenue
 * @access  Private (Admin)
 */
export const getRevenueReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, groupBy = 'day' } = req.query;

  const matchStage = {
    orderStatus: 'DELIVERED'
  };

  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  let groupByFormat;
  switch (groupBy) {
    case 'month':
      groupByFormat = { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } };
      break;
    case 'year':
      groupByFormat = { year: { $year: '$createdAt' } };
      break;
    default: // day
      groupByFormat = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' }
      };
  }

  const report = await Order.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: groupByFormat,
        totalRevenue: { $sum: '$totals.grandTotal' },
        totalOrders: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } }
  ]);

  res.json({
    success: true,
    data: report
  });
});

export const getQualityScores = asyncHandler(async (req, res) => {
  const [sellers, shippers] = await Promise.all([
    Shop.find({})
      .populate('ownerId', 'name email isActive qualityWarnings')
      .select('shopName ratingAvg ratingCount stats ownerId isActive')
      .sort({ ratingAvg: 1, ratingCount: -1 })
      .limit(20)
      .lean(),
    ShipperReview.aggregate([
      { $group: { _id: '$shipperId', averageRating: { $avg: '$rating' }, totalReviews: { $sum: 1 } } },
      { $sort: { averageRating: 1, totalReviews: -1 } },
      { $limit: 20 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { averageRating: 1, totalReviews: 1, 'user.name': 1, 'user.email': 1, 'user.isActive': 1, 'user.qualityWarnings': 1 } }
    ])
  ]);

  const decorate = (score, count, warningCount = 0) => {
    const hasEnoughData = count >= QUALITY_WARNING_MIN_REVIEWS;
    const isLowScore = hasEnoughData && score < QUALITY_WARNING_SCORE;

    if (!hasEnoughData) return 'needs_more_reviews';
    if (!isLowScore) return 'normal';
    if (warningCount >= QUALITY_WARNING_LIMIT) return 'lock_recommended';
    return 'warning';
  };

  const warningInfo = (user, role) => {
    const info = user?.qualityWarnings?.[role] || {};
    const count = Number(info.count || 0);
    return {
      warningCount: count,
      warningLimit: QUALITY_WARNING_LIMIT,
      lastWarningAt: info.lastAt || null,
      lastWarningReason: info.lastReason || '',
      canLock: count >= QUALITY_WARNING_LIMIT
    };
  };

  res.json({
    success: true,
    data: {
      sellers: sellers.map((shop) => {
        const warnings = warningInfo(shop.ownerId, 'seller');
        const score = shop.ratingAvg || 0;
        const reviews = shop.ratingCount || 0;
        return {
          id: shop.ownerId?._id,
          shopId: shop._id,
          role: 'seller',
          name: shop.shopName,
          email: shop.ownerId?.email,
          isActive: shop.ownerId?.isActive,
          score,
          reviews,
          orders: shop.stats?.totalOrders || 0,
          status: decorate(score, reviews, warnings.warningCount),
          ...warnings,
          canLock: warnings.canLock && reviews >= QUALITY_WARNING_MIN_REVIEWS && score < QUALITY_WARNING_SCORE
        };
      }),
      shippers: shippers.map((item) => {
        const warnings = warningInfo(item.user, 'shipper');
        const score = Math.round((item.averageRating || 0) * 10) / 10;
        const reviews = item.totalReviews || 0;
        return {
          id: item._id,
          role: 'shipper',
          name: item.user?.name,
          email: item.user?.email,
          isActive: item.user?.isActive,
          score,
          reviews,
          status: decorate(score, reviews, warnings.warningCount),
          ...warnings,
          canLock: warnings.canLock && reviews >= QUALITY_WARNING_MIN_REVIEWS && score < QUALITY_WARNING_SCORE
        };
      })
    }
  });
});


/**
 * @desc    Export system report to Excel
 * @route   GET /api/admin/reports/export
 * @access  Private (Admin)
 */
export const exportSystemReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  // Get system stats
  const [totalUsers, totalSellers, totalShippers, totalProducts, totalOrders, totalRevenue] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ roles: 'seller' }),
    User.countDocuments({ roles: 'shipper' }),
    Product.countDocuments({ isActive: true }),
    Order.countDocuments(),
    Order.aggregate([
      { $match: { orderStatus: 'DELIVERED' } },
      { $group: { _id: null, total: { $sum: '$totals.grandTotal' } } }
    ])
  ]);

  const stats = {
    totalUsers,
    totalSellers,
    totalShippers,
    totalProducts,
    totalOrders,
    totalRevenue: totalRevenue[0]?.total || 0
  };

  // Get revenue data
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  const revenueData = await Order.aggregate([
    {
      $match: {
        orderStatus: 'DELIVERED',
        createdAt: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        totalRevenue: { $sum: '$totals.grandTotal' },
        totalOrders: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
    { $limit: 30 }
  ]);

  // Format revenue data
  const formattedRevenueData = revenueData.map(item => ({
    date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
    revenue: item.totalRevenue,
    orders: item.totalOrders
  }));

  // Create Excel file
  const workbook = await exportAdminSystemReport(stats, formattedRevenueData, []);

  // Set headers
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=bao-cao-he-thong-${Date.now()}.xlsx`);

  await workbook.xlsx.write(res);
  res.end();
});

/**
 * @desc    Get pending seller/shipper registrations
 * @route   GET /api/admin/pending-approvals
 * @access  Private (Admin)
 */
export const getPendingApprovals = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const filter = {
    approvalStatus: 'pending',
    $or: [
      { roles: 'seller' },
      { roles: 'shipper' }
    ]
  };

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    User.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: {
      users,
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
 * @desc    Approve or reject seller/shipper registration
 * @route   PATCH /api/admin/users/:id/approval
 * @access  Private (Admin)
 */
export const handleUserApproval = asyncHandler(async (req, res) => {
  const { approved, reason } = req.body;

  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  if (!user.roles.includes('seller') && !user.roles.includes('shipper')) {
    return res.status(400).json({
      success: false,
      message: 'User is not a seller or shipper'
    });
  }

  user.approvalStatus = approved ? 'approved' : 'rejected';
  user.approvedBy = req.user._id;
  user.approvedAt = new Date();
  
  if (!approved && reason) {
    user.rejectionReason = reason;
  }

  await user.save();

  logger.info(`User ${user.email} ${approved ? 'approved' : 'rejected'} by admin ${req.user.email}`);

  // Send email notification when rejecting user
  if (!approved && reason) {
    try {
      await sendAccountRejectionEmail(user.email, user.name, reason);
    } catch (error) {
      logger.error(`Failed to send rejection notification email: ${error.message}`);
    }
  }

  res.json({
    success: true,
    message: `User ${approved ? 'approved' : 'rejected'} successfully`,
    data: user.toSafeObject()
  });
});

export default {
  getDashboardStats,
  getUsers,
  impersonateUser,
  toggleUserLock,
  issueQualityWarning,
  deleteUser,
  changeUserPassword,
  getProducts,
  approveProduct,
  deleteProduct,
  getOrders,
  createPromotion,
  getPromotions,
  updatePromotion,
  deletePromotion,
  getRevenueReport,
  getQualityScores,
  exportSystemReport,
  getPendingApprovals,
  handleUserApproval
};
