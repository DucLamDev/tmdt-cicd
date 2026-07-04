import Shop from '../models/Shop.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Message from '../models/Message.js';
import Notification from '../models/Notification.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import logger from '../config/logger.js';
import { exportSellerSalesReport } from '../utils/excelExporter.js';
import { sendDashboardUpdate, sendToUser } from '../utils/realtime.js';
import { getShopComputedStats } from '../utils/shopStats.js';

/**
 * @desc    Get seller dashboard statistics
 * @route   GET /api/seller/dashboard
 * @access  Private (Seller)
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  const shop = await Shop.findOne({ ownerId: req.user._id });
  
  if (!shop) {
    return res.status(404).json({
      success: false,
      message: 'Bạn chưa tạo shop'
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalProducts,
    activeProducts,
    totalOrders,
    pendingOrders,
    todayOrders,
    todayRevenue,
    unreadNotifications,
    topSellingProducts,
    recentOrders,
    computedStats
  ] = await Promise.all([
    Product.countDocuments({ sellerId: shop._id }),
    Product.countDocuments({ sellerId: shop._id, isActive: true }),
    Order.countDocuments({ sellerId: shop._id }),
    Order.countDocuments({ 
      sellerId: shop._id, 
      orderStatus: { $in: ['PLACED', 'CONFIRMED'] } 
    }),
    Order.countDocuments({ 
      sellerId: shop._id,
      createdAt: { $gte: today }
    }),
    Order.aggregate([
      {
        $match: {
          sellerId: shop._id,
          createdAt: { $gte: today }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totals.grandTotal' }
        }
      }
    ]),
    Notification.countDocuments({ userId: req.user._id, isRead: false }),
    Product.find({ sellerId: shop._id })
      .sort({ soldCount: -1 })
      .limit(5)
      .select('title images soldCount price'),
    Order.find({ sellerId: shop._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('buyerId', 'name phone'),
    getShopComputedStats(shop._id)
  ]);

  res.json({
    success: true,
    data: {
      products: {
        total: totalProducts,
        active: activeProducts
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        today: todayOrders
      },
      revenue: {
        total: computedStats.totalRevenue,
        today: todayRevenue[0]?.total || 0
      },
      rating: {
        average: computedStats.ratingAvg || 0,
        count: computedStats.ratingCount || 0
      },
      notifications: {
        unread: unreadNotifications
      },
      topSellingProducts,
      recentOrders
    }
  });
});

/**
 * @desc    Get detailed sales report
 * @route   GET /api/seller/reports/sales
 * @access  Private (Seller)
 */
export const getSalesReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, groupBy = 'day' } = req.query;
  
  const shop = await Shop.findOne({ ownerId: req.user._id });
  
  if (!shop) {
    return res.status(404).json({
      success: false,
      message: 'Bạn chưa tạo shop'
    });
  }

  const matchStage = {
    sellerId: shop._id,
    orderStatus: { $ne: 'CANCELLED' }
  };

  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  // Group format based on groupBy parameter
  let groupFormat;
  switch (groupBy) {
    case 'month':
      groupFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
      break;
    case 'week':
      groupFormat = { 
        $dateToString: { format: '%Y-W%V', date: '$createdAt' } 
      };
      break;
    case 'day':
    default:
      groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
  }

  const salesData = await Order.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: groupFormat,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$totals.grandTotal' },
        avgOrderValue: { $avg: '$totals.grandTotal' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Get product performance
  const productPerformance = await Order.aggregate([
    { $match: matchStage },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        title: { $first: '$items.title' },
        totalSold: { $sum: '$items.quantity' },
        totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
      }
    },
    { $sort: { totalSold: -1 } },
    { $limit: 20 }
  ]);

  // Get category performance
  const categoryPerformance = await Order.aggregate([
    { $match: matchStage },
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'products',
        localField: 'items.productId',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: '$product' },
    { $unwind: '$product.categories' },
    {
      $group: {
        _id: '$product.categories',
        totalSold: { $sum: '$items.quantity' },
        totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
      }
    },
    { $sort: { totalRevenue: -1 } }
  ]);

  res.json({
    success: true,
    data: {
      salesData,
      productPerformance,
      categoryPerformance,
      summary: {
        totalOrders: salesData.reduce((sum, d) => sum + d.totalOrders, 0),
        totalRevenue: salesData.reduce((sum, d) => sum + d.totalRevenue, 0),
        avgOrderValue: salesData.length > 0 
          ? salesData.reduce((sum, d) => sum + d.avgOrderValue, 0) / salesData.length 
          : 0
      }
    }
  });
});

/**
 * @desc    Get best selling products report
 * @route   GET /api/seller/reports/best-sellers
 * @access  Private (Seller)
 */
export const getBestSellers = asyncHandler(async (req, res) => {
  const { limit = 20, period = 30 } = req.query;
  
  const shop = await Shop.findOne({ ownerId: req.user._id });
  
  if (!shop) {
    return res.status(404).json({
      success: false,
      message: 'Bạn chưa tạo shop'
    });
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(period));

  const bestSellers = await Order.aggregate([
    {
      $match: {
        sellerId: shop._id,
        orderStatus: { $ne: 'CANCELLED' },
        createdAt: { $gte: startDate }
      }
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        title: { $first: '$items.title' },
        image: { $first: '$items.image' },
        totalQuantity: { $sum: '$items.quantity' },
        totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        avgPrice: { $avg: '$items.price' }
      }
    },
    { $sort: { totalQuantity: -1 } },
    { $limit: parseInt(limit) }
  ]);

  res.json({
    success: true,
    data: bestSellers
  });
});

/**
 * @desc    Generate shipping label for order
 * @route   POST /api/seller/orders/:id/shipping-label
 * @access  Private (Seller)
 */
export const generateShippingLabel = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('buyerId', 'name email phone')
    .populate('sellerId', 'shopName address phone');

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy đơn hàng'
    });
  }

  // Check ownership
  const shop = await Shop.findOne({ ownerId: req.user._id });
  if (!shop || order.sellerId._id.toString() !== shop._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền tạo phiếu giao hàng cho đơn hàng này'
    });
  }

  // Generate tracking number if not exists
  if (!order.trackingNumber) {
    order.trackingNumber = `TRK${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    await order.save();
  }

  // Create shipping label data
  const shippingLabel = {
    orderNumber: order.orderNumber,
    trackingNumber: order.trackingNumber,
    sender: {
      name: order.sellerId.shopName,
      phone: order.sellerId.phone,
      address: order.sellerId.address
    },
    recipient: {
      name: order.shippingAddress.recipientName,
      phone: order.shippingAddress.phone,
      address: {
        street: order.shippingAddress.street,
        ward: order.shippingAddress.ward,
        district: order.shippingAddress.district,
        city: order.shippingAddress.city
      }
    },
    items: order.items.map(item => ({
      title: item.title,
      quantity: item.quantity
    })),
    paymentMethod: order.paymentMethod,
    codAmount: order.codAmount,
    createdAt: order.createdAt,
    barcode: order.orderNumber // Could be used to generate actual barcode
  };

  logger.info(`Shipping label generated for order ${order.orderNumber}`);

  res.json({
    success: true,
    message: 'Tạo phiếu giao hàng thành công',
    data: shippingLabel
  });
});

/**
 * @desc    Get customer messages/questions for seller
 * @route   GET /api/seller/messages
 * @access  Private (Seller)
 */
export const getMessages = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  
  const shop = await Shop.findOne({ ownerId: req.user._id });
  
  if (!shop) {
    return res.status(404).json({
      success: false,
      message: 'Bạn chưa tạo shop'
    });
  }

  const filter = { sellerId: shop._id };
  
  if (status) {
    filter.status = status;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [messages, total] = await Promise.all([
    Message.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('customerId', 'name email avatarUrl')
      .populate('productId', 'title images'),
    Message.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: {
      messages,
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
 * @desc    Reply to customer message
 * @route   POST /api/seller/messages/:id/reply
 * @access  Private (Seller)
 */
export const replyToMessage = asyncHandler(async (req, res) => {
  const { reply } = req.body;

  if (!reply || !reply.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng nhập nội dung trả lời'
    });
  }

  const message = await Message.findById(req.params.id);

  if (!message) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy tin nhắn'
    });
  }

  // Check ownership
  const shop = await Shop.findOne({ ownerId: req.user._id });
  if (!shop || message.sellerId.toString() !== shop._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền trả lời tin nhắn này'
    });
  }

  message.replies.push({
    content: reply,
    repliedBy: req.user._id,
    repliedAt: new Date()
  });
  message.status = 'replied';
  await message.save();

  logger.info(`Seller replied to message ${message._id}`);
  sendToUser(message.customerId, 'message:reply', { messageId: message._id });
  sendDashboardUpdate([message.customerId], 'customer');

  res.json({
    success: true,
    message: 'Trả lời thành công',
    data: message
  });
});

/**
 * @desc    Update shop information
 * @route   PUT /api/seller/shop/update
 * @access  Private (Seller)
 */
export const updateShopInfo = asyncHandler(async (req, res) => {
  const {
    shopName,
    description,
    logoUrl,
    bannerUrl,
    address,
    phone,
    email,
    socialLinks,
    policies
  } = req.body;

  const shop = await Shop.findOne({ ownerId: req.user._id });

  if (!shop) {
    return res.status(404).json({
      success: false,
      message: 'Bạn chưa tạo shop'
    });
  }

  // Update fields
  if (shopName) shop.shopName = shopName;
  if (description) shop.description = description;
  if (logoUrl) shop.logoUrl = logoUrl;
  if (bannerUrl) shop.bannerUrl = bannerUrl;
  if (address) shop.address = { ...shop.address, ...address };
  if (phone) shop.phone = phone;
  if (email) shop.email = email;
  if (socialLinks) shop.socialLinks = { ...shop.socialLinks, ...socialLinks };
  if (policies) shop.policies = { ...shop.policies, ...policies };

  await shop.save();

  logger.info(`Shop updated: ${shop.shopName} by ${req.user.email}`);

  res.json({
    success: true,
    message: 'Cập nhật thông tin shop thành công',
    data: shop
  });
});

/**
 * @desc    Get inventory alerts (low stock products)
 * @route   GET /api/seller/inventory/alerts
 * @access  Private (Seller)
 */
export const getInventoryAlerts = asyncHandler(async (req, res) => {
  const { threshold = 10 } = req.query;
  
  const shop = await Shop.findOne({ ownerId: req.user._id });
  
  if (!shop) {
    return res.status(404).json({
      success: false,
      message: 'Bạn chưa tạo shop'
    });
  }

  const lowStockProducts = await Product.find({
    sellerId: shop._id,
    isActive: true,
    stock: { $lte: parseInt(threshold), $gt: 0 }
  }).select('title images stock soldCount');

  const outOfStockProducts = await Product.find({
    sellerId: shop._id,
    isActive: true,
    stock: 0
  }).select('title images soldCount');

  res.json({
    success: true,
    data: {
      lowStock: lowStockProducts,
      outOfStock: outOfStockProducts,
      alerts: {
        lowStockCount: lowStockProducts.length,
        outOfStockCount: outOfStockProducts.length
      }
    }
  });
});

/**
 * @desc    Export sales report to Excel
 * @route   GET /api/seller/reports/export
 * @access  Private (Seller)
 */
export const exportSalesReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, groupBy = 'day', period = 30 } = req.query;
  
  const shop = await Shop.findOne({ ownerId: req.user._id });
  
  if (!shop) {
    return res.status(404).json({
      success: false,
      message: 'Bạn chưa tạo shop'
    });
  }

  // Get sales data
  const start = startDate ? new Date(startDate) : new Date(Date.now() - period * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  const [salesData, bestSellers] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          sellerId: shop._id,
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totals.grandTotal' },
          avgOrderValue: { $avg: '$totals.grandTotal' }
        }
      }
    ]),
    Product.find({ sellerId: shop._id })
      .sort({ soldCount: -1 })
      .limit(20)
      .select('title soldCount price')
      .lean()
  ]);

  const summary = salesData[0] || { totalOrders: 0, totalRevenue: 0, avgOrderValue: 0 };
  
  // Format best sellers data
  const formattedBestSellers = bestSellers.map(product => ({
    title: product.title,
    totalQuantity: product.soldCount || 0,
    totalRevenue: (product.price || 0) * (product.soldCount || 0),
    avgPrice: product.price || 0
  }));

  // Create Excel file
  const workbook = await exportSellerSalesReport(
    { summary, salesData: [] },
    formattedBestSellers,
    shop.name
  );

  // Set headers để download file
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=bao-cao-ban-hang-${Date.now()}.xlsx`);

  await workbook.xlsx.write(res);
  res.end();
});

export default {
  getDashboardStats,
  getSalesReport,
  getBestSellers,
  generateShippingLabel,
  getMessages,
  replyToMessage,
  updateShopInfo,
  getInventoryAlerts,
  exportSalesReport
};
