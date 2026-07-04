import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import logger from '../config/logger.js';
import { createNotificationInternal } from './notificationController.js';

/**
 * @desc    Create product review
 * @route   POST /api/reviews
 * @access  Private
 */
export const createReview = asyncHandler(async (req, res) => {
  const { productId, orderId, rating, title, text, images } = req.body;

  // Ensure productId is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({
      success: false,
      message: 'Product ID không hợp lệ'
    });
  }

  // Check if user has purchased and received this product
  const deliveredOrder = await Order.findOne({
    buyerId: req.user._id,
    orderStatus: 'DELIVERED',
    'items.productId': new mongoose.Types.ObjectId(productId)
  });

  if (!deliveredOrder) {
    return res.status(403).json({
      success: false,
      message: 'Bạn chỉ có thể đánh giá sản phẩm mà bạn đã mua và nhận hàng'
    });
  }

  // Verify product is in the order
  const productInOrder = deliveredOrder.items.find(item => {
    const itemProductId = item.productId._id || item.productId;
    return itemProductId.toString() === productId.toString();
  });

  if (!productInOrder) {
    return res.status(403).json({
      success: false,
      message: 'Bạn chỉ có thể đánh giá sản phẩm mà bạn đã mua và nhận hàng'
    });
  }

  // Check if user already reviewed this product
  const existingReview = await Review.findOne({
    userId: req.user._id,
    productId: new mongoose.Types.ObjectId(productId)
  });

  if (existingReview) {
    return res.status(400).json({
      success: false,
      message: 'Bạn đã đánh giá sản phẩm này rồi'
    });
  }

  const review = await Review.create({
    userId: req.user._id,
    productId: new mongoose.Types.ObjectId(productId),
    orderId: deliveredOrder._id,
    rating,
    title,
    text,
    images: images || [],
    isVerifiedPurchase: true
  });

  // Populate user info for immediate response
  await review.populate('userId', 'name avatarUrl');

  // Update product rating statistics
  const productObjectId = new mongoose.Types.ObjectId(productId);
  const reviews = await Review.find({ productId: productObjectId, isApproved: true });
  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0 
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews 
    : 0;

  await Product.findByIdAndUpdate(productObjectId, {
    ratingAvg: Math.round(avgRating * 10) / 10, // Round to 1 decimal
    reviewCount: totalReviews
  });

  const reviewedProduct = await Product.findById(productObjectId)
    .select('title sellerId')
    .populate('sellerId', 'ownerId shopName')
    .lean();

  if (reviewedProduct?.sellerId?.ownerId) {
    await createNotificationInternal({
      userId: reviewedProduct.sellerId.ownerId,
      title: 'Có đánh giá mới',
      message: `${req.user.name || 'Khách hàng'} đã đánh giá ${rating} sao cho sản phẩm ${reviewedProduct.title}.`,
      type: 'message',
      actionUrl: '/seller/reports',
      referenceId: review._id,
      referenceModel: 'Review'
    });
  }

  logger.info(`Review created for product ${productId} by user ${req.user.email}`);

  res.status(201).json({
    success: true,
    message: 'Đánh giá thành công',
    data: review
  });
});

/**
 * @desc    Get product reviews
 * @route   GET /api/reviews/product/:productId
 * @access  Public
 */
export const getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { page = 1, limit = 10, rating, sort = '-createdAt' } = req.query;

  // Convert productId to ObjectId if it's a valid ObjectId string
  let productIdFilter = productId;
  if (mongoose.Types.ObjectId.isValid(productId)) {
    productIdFilter = new mongoose.Types.ObjectId(productId);
  }

  const filter = {
    productId: productIdFilter,
    isApproved: true
  };

  if (rating) {
    filter.rating = parseInt(rating);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [reviews, total, summary] = await Promise.all([
    Review.find(filter)
      .populate('userId', 'name avatarUrl')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Review.countDocuments(filter),
    Review.aggregate([
      { $match: { productId: productIdFilter, isApproved: true } },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  // Calculate rating distribution
  const ratingDistribution = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0
  };

  summary.forEach(item => {
    ratingDistribution[item._id] = item.count;
  });

  res.json({
    success: true,
    data: {
      reviews,
      ratingDistribution,
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
 * @desc    Update review
 * @route   PUT /api/reviews/:id
 * @access  Private
 */
export const updateReview = asyncHandler(async (req, res) => {
  const { rating, title, text, images } = req.body;

  const review = await Review.findById(req.params.id);

  if (!review) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy đánh giá'
    });
  }

  // Check ownership
  if (review.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền chỉnh sửa đánh giá này'
    });
  }

  review.rating = rating || review.rating;
  review.title = title || review.title;
  review.text = text || review.text;
  if (images) review.images = images;

  await review.save();

  // Update product rating statistics
  const reviews = await Review.find({ productId: review.productId, isApproved: true });
  const totalReviews = reviews.length;
  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

  await Product.findByIdAndUpdate(review.productId, {
    ratingAvg: Math.round(avgRating * 10) / 10,
    reviewCount: totalReviews
  });

  res.json({
    success: true,
    message: 'Cập nhật đánh giá thành công',
    data: review
  });
});

/**
 * @desc    Delete review
 * @route   DELETE /api/reviews/:id
 * @access  Private
 */
export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy đánh giá'
    });
  }

  // Check ownership or admin
  if (
    review.userId.toString() !== req.user._id.toString() &&
    !req.user.hasRole('admin')
  ) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền xóa đánh giá này'
    });
  }

  const productId = review.productId;
  await review.deleteOne();

  // Update product rating statistics
  const reviews = await Review.find({ productId, isApproved: true });
  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0 
    ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10) / 10
    : 0;

  await Product.findByIdAndUpdate(productId, {
    ratingAvg: avgRating,
    reviewCount: totalReviews
  });

  res.json({
    success: true,
    message: 'Xóa đánh giá thành công'
  });
});

/**
 * @desc    Seller respond to review
 * @route   POST /api/reviews/:id/respond
 * @access  Private (Seller)
 */
export const respondToReview = asyncHandler(async (req, res) => {
  const { text } = req.body;

  const review = await Review.findById(req.params.id).populate('productId');

  if (!review) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy đánh giá'
    });
  }

  // Check if user is the seller of the product
  const product = await Product.findById(review.productId);
  const shop = await mongoose.model('Shop').findOne({ ownerId: req.user._id });

  if (!shop || product.sellerId.toString() !== shop._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền phản hồi đánh giá này'
    });
  }

  review.sellerResponse = {
    text,
    respondedAt: new Date()
  };

  await review.save();

  res.json({
    success: true,
    message: 'Phản hồi đánh giá thành công',
    data: review
  });
});

/**
 * @desc    Mark review as helpful
 * @route   POST /api/reviews/:id/helpful
 * @access  Private
 */
export const markHelpful = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy đánh giá'
    });
  }

  review.helpfulCount += 1;
  await review.save();

  res.json({
    success: true,
    data: review
  });
});

/**
 * @desc    Check if user can review a product
 * @route   GET /api/reviews/product/:productId/can-review
 * @access  Private
 */
export const canReviewProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  // Check if user already reviewed this product
  const existingReview = await Review.findOne({
    userId: req.user._id,
    productId
  });

  if (existingReview) {
    return res.json({
      success: true,
      canReview: false,
      hasReviewed: true,
      existingReviewId: existingReview._id
    });
  }

  // Check if user has purchased and received this product
  const deliveredOrder = await Order.findOne({
    buyerId: req.user._id,
    orderStatus: 'DELIVERED',
    'items.productId': productId
  }).lean();

  if (!deliveredOrder) {
    return res.json({
      success: true,
      canReview: false,
      hasReviewed: false,
      reason: 'Bạn chỉ có thể đánh giá sản phẩm mà bạn đã mua và nhận hàng'
    });
  }

  res.json({
    success: true,
    canReview: true,
    hasReviewed: false,
    orderId: deliveredOrder._id,
    isVerifiedPurchase: true
  });
});

export default {
  createReview,
  getProductReviews,
  updateReview,
  deleteReview,
  respondToReview,
  markHelpful,
  canReviewProduct
};
