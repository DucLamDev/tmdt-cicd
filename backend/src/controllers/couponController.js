import Coupon from '../models/Coupon.js';
import UserVoucher from '../models/UserVoucher.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import logger from '../config/logger.js';

/**
 * @desc    Create coupon
 * @route   POST /api/coupons
 * @access  Private (Admin)
 */
export const createCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.create({
    ...req.body,
    createdBy: req.user._id
  });

  logger.info(`Coupon created: ${coupon.code} by ${req.user.email}`);

  res.status(201).json({
    success: true,
    message: 'Tạo mã giảm giá thành công',
    data: coupon
  });
});

/**
 * @desc    Get available coupons (public)
 * @route   GET /api/coupons/available
 * @access  Public
 */
export const getAvailableCoupons = asyncHandler(async (req, res) => {
  const { orderTotal } = req.query;
  const now = new Date();
  const orderTotalNum = Number(orderTotal || 0);

  const filter = {
    isActive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now }
  };

  // Filter by usage limit
  filter.$expr = {
    $or: [
      { $eq: ['$usageLimit', null] },
      { $eq: ['$usageLimit', 0] },
      { $lt: ['$usedCount', '$usageLimit'] }
    ]
  };

  const coupons = await Coupon.find(filter)
    .sort('-discountValue')
    .limit(20)
    .lean();

  const userVouchers = req.user?._id
    ? await UserVoucher.find({
        userId: req.user._id,
        status: 'available',
        expiresAt: { $gte: now }
      }).lean()
    : [];

  // Filter coupons/vouchers that can be applied to this order total
  const availableCoupons = coupons
    .filter(coupon => !orderTotal || coupon.minOrderValue <= orderTotalNum)
    .map(coupon => ({ ...coupon, source: 'coupon' }));

  const availableUserVouchers = userVouchers
    .filter(voucher => !orderTotal || voucher.minOrderValue <= orderTotalNum)
    .map(voucher => ({
      ...voucher,
      description: voucher.discountType === 'percentage'
        ? `Giảm ${voucher.discountValue}%`
        : `Giảm ${Number(voucher.discountValue || 0).toLocaleString('vi-VN')}đ`,
      source: 'user_voucher'
    }));

  res.json({
    success: true,
    data: {
      coupons: [...availableUserVouchers, ...availableCoupons]
    }
  });
});

/**
 * @desc    Get all coupons (admin only)
 * @route   GET /api/coupons
 * @access  Private (Admin)
 */
export const getCoupons = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, isActive } = req.query;

  const filter = {};
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [coupons, total] = await Promise.all([
    Coupon.find(filter)
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Coupon.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: {
      coupons,
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
 * @desc    Get single coupon
 * @route   GET /api/coupons/:id
 * @access  Private (Admin)
 */
export const getCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);

  if (!coupon) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy mã giảm giá'
    });
  }

  res.json({
    success: true,
    data: coupon
  });
});

/**
 * @desc    Validate coupon
 * @route   POST /api/coupons/validate
 * @access  Public
 */
export const validateCoupon = asyncHandler(async (req, res) => {
  const { code, orderTotal } = req.body;

  if (!code) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng nhập mã giảm giá'
    });
  }

  const normalizedCode = code.toUpperCase();
  const coupon = await Coupon.findOne({ code: normalizedCode });

  if (!coupon) {
    const userVoucher = req.user?._id
      ? await UserVoucher.findOne({ code: normalizedCode, userId: req.user._id })
      : null;

    if (!userVoucher) {
      return res.status(404).json({
        success: false,
        message: 'Mã giảm giá không tồn tại'
      });
    }

    if (userVoucher.status !== 'available' || userVoucher.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Voucher không khả dụng hoặc đã hết hạn'
      });
    }

    if (Number(orderTotal) < userVoucher.minOrderValue) {
      return res.status(400).json({
        success: false,
        message: `Đơn hàng tối thiểu ${userVoucher.minOrderValue.toLocaleString('vi-VN')}đ`
      });
    }

    const discount = userVoucher.discountType === 'percentage'
      ? (Number(orderTotal) * userVoucher.discountValue) / 100
      : Math.min(userVoucher.discountValue, Number(orderTotal));

    return res.json({
      success: true,
      message: 'Voucher hợp lệ',
      data: {
        code: userVoucher.code,
        description: userVoucher.discountType === 'percentage'
          ? `Giảm ${userVoucher.discountValue}%`
          : `Giảm ${userVoucher.discountValue.toLocaleString('vi-VN')}đ`,
        discountType: userVoucher.discountType,
        discountValue: userVoucher.discountValue,
        discount: Math.round(discount),
        newTotal: Math.round(Number(orderTotal) - discount),
        source: 'user_voucher'
      }
    });
  }

  // Validate coupon
  const validation = coupon.validateForOrder(orderTotal, req.user?._id);
  
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: validation.message
    });
  }

  // Calculate discount
  const discount = coupon.calculateDiscount(orderTotal);

  res.json({
    success: true,
    message: 'Mã giảm giá hợp lệ',
    data: {
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discount: Math.round(discount),
      newTotal: Math.round(orderTotal - discount)
    }
  });
});

/**
 * @desc    Update coupon
 * @route   PUT /api/coupons/:id
 * @access  Private (Admin)
 */
export const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);

  if (!coupon) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy mã giảm giá'
    });
  }

  Object.assign(coupon, req.body);
  await coupon.save();

  logger.info(`Coupon updated: ${coupon.code} by ${req.user.email}`);

  res.json({
    success: true,
    message: 'Cập nhật mã giảm giá thành công',
    data: coupon
  });
});

/**
 * @desc    Delete coupon
 * @route   DELETE /api/coupons/:id
 * @access  Private (Admin)
 */
export const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);

  if (!coupon) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy mã giảm giá'
    });
  }

  await coupon.deleteOne();

  logger.info(`Coupon deleted: ${coupon.code} by ${req.user.email}`);

  res.json({
    success: true,
    message: 'Xóa mã giảm giá thành công'
  });
});

export default {
  createCoupon,
  getCoupons,
  getCoupon,
  validateCoupon,
  updateCoupon,
  deleteCoupon
};
