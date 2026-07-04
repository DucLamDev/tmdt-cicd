import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Shop from '../models/Shop.js';
import Coupon from '../models/Coupon.js';
import UserVoucher from '../models/UserVoucher.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { sendOrderConfirmationEmail } from '../utils/email.js';
import logger from '../config/logger.js';
import { createNotificationInternal, notifyOrderStatusChange } from './notificationController.js';
import { awardDeliveredOrderPoints } from '../services/loyaltyService.js';
import { refreshShopStats } from '../utils/shopStats.js';

const normalizeAttributeValue = (value) => String(value || '').trim().toLowerCase();

const attributesMatch = (variantAttributes = {}, selectedAttributes = {}) => Object.entries(selectedAttributes || {})
  .every(([key, value]) => !value || normalizeAttributeValue(variantAttributes[key]) === normalizeAttributeValue(value));

const resolveOrderVariant = (product, item) => {
  if (!product.variants?.length) return null;

  if (item.variantId) {
    return product.variants.find((variant) => variant._id.toString() === item.variantId.toString()) || null;
  }

  if (item.attributes && Object.keys(item.attributes).length > 0) {
    return product.variants.find((variant) => attributesMatch(variant.attributes, item.attributes)) || null;
  }

  return null;
};

/**
 * @desc    Create new order (checkout)
 * @route   POST /api/orders
 * @access  Private (Customer)
 */
export const createOrder = asyncHandler(async (req, res) => {
  const {
    items,
    shippingAddress,
    paymentMethod,
    couponCode,
    buyerNote
  } = req.body;

  // Debug logging
  logger.info('Create order request:', {
    userId: req.user._id,
    itemsCount: items?.length,
    paymentMethod
  });

  if (!items || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Giỏ hàng trống'
    });
  }

  // Verify products and group by seller
  const itemsBySeller = new Map();
  let totalAmount = 0;

  for (const item of items) {
    const product = await Product.findById(item.productId).populate('sellerId');
    
    if (!product || !product.isActive) {
      return res.status(400).json({
        success: false,
        message: `Sản phẩm ${item.productId} không khả dụng`
      });
    }

    const selectedVariant = resolveOrderVariant(product, item);
    if (product.variants?.length && !selectedVariant) {
      return res.status(400).json({
        success: false,
        message: `Vui lòng chọn đúng phiên bản của sản phẩm "${product.title}"`
      });
    }

    const availableStock = selectedVariant ? selectedVariant.stock : product.stock;
    const price = selectedVariant
      ? (selectedVariant.salePrice || selectedVariant.price || product.salePrice || product.price)
      : (product.salePrice || product.price);
    const selectedAttributes = selectedVariant?.attributes || item.attributes || {};

    // Check stock
    if (availableStock < item.quantity) {
      return res.status(400).json({
        success: false,
        message: `Sản phẩm "${product.title}" không đủ số lượng`
      });
    }

    const itemTotal = price * item.quantity;
    totalAmount += itemTotal;

    const sellerId = product.sellerId._id.toString();
    
    if (!itemsBySeller.has(sellerId)) {
      itemsBySeller.set(sellerId, {
        sellerId: product.sellerId._id,
        items: [],
        subtotal: 0
      });
    }
    
    const sellerData = itemsBySeller.get(sellerId);
    sellerData.items.push({
      productId: product._id,
      variantId: selectedVariant?._id,
      title: product.title,
      image: selectedVariant?.images?.[0] || product.images[0],
      quantity: item.quantity,
      price,
      attributes: selectedAttributes
    });
    sellerData.subtotal += itemTotal;
  }

  // Calculate discount if coupon provided
  let totalDiscount = 0;
  let appliedUserVoucher = null;
  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
    if (coupon) {
      const validation = coupon.validateForOrder(totalAmount, req.user._id, items);
      if (validation.valid) {
        totalDiscount = coupon.calculateDiscount(totalAmount);
        // Update coupon usage
        coupon.usedCount += 1;
        await coupon.save();
      }
    } else {
      const userVoucher = await UserVoucher.findOne({
        code: couponCode.toUpperCase(),
        userId: req.user._id,
        status: 'available'
      });

      if (userVoucher && userVoucher.expiresAt >= new Date() && totalAmount >= userVoucher.minOrderValue) {
        totalDiscount = userVoucher.discountType === 'percentage'
          ? Math.round((totalAmount * userVoucher.discountValue) / 100)
          : Math.min(userVoucher.discountValue, totalAmount);
        appliedUserVoucher = userVoucher;
      }
    }
  }

  // Generate unique order number
  const generateOrderNumber = async () => {
    let orderNumber;
    let isUnique = false;
    
    while (!isUnique) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let randomString = '';
      for (let i = 0; i < 5; i++) {
        randomString += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      orderNumber = `DH-${randomString}`;
      
      const existingOrder = await Order.findOne({ orderNumber });
      if (!existingOrder) {
        isUnique = true;
      }
    }
    
    return orderNumber;
  };

  // Create separate orders for each seller
  const createdOrders = [];
  const sellerCount = itemsBySeller.size;
  
  for (const [sellerId, sellerData] of itemsBySeller) {
    const subtotal = sellerData.subtotal;
    
    // Calculate shipping per seller (30k VND flat rate per seller)
    const shipping = 30000;
    
    // Calculate tax (optional, 0 for now)
    const tax = 0;
    
    // Distribute discount proportionally across sellers
    const discount = sellerCount > 1 
      ? Math.round((subtotal / totalAmount) * totalDiscount)
      : totalDiscount;
    
    // Calculate grand total
    const grandTotal = subtotal + shipping + tax - discount;

    try {
      const orderNumber = await generateOrderNumber();
      
      const order = await Order.create({
        orderNumber,
        buyerId: req.user._id,
        sellerId: sellerData.sellerId,
        items: sellerData.items,
        totals: {
          subtotal,
          shipping,
          tax,
          discount,
          grandTotal
        },
        shippingAddress,
        paymentMethod,
        paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending',
        codAmount: paymentMethod === 'cod' ? grandTotal : 0,
        couponCode: couponCode || null,
        buyerNote
      });

      createdOrders.push(order);
      const shop = await Shop.findById(sellerData.sellerId).select('ownerId shopName').lean();
      if (shop?.ownerId) {
        await createNotificationInternal({
          userId: shop.ownerId,
          title: 'Có đơn hàng mới',
          message: `Đơn ${order.orderNumber} vừa được đặt tại ${shop.shopName}.`,
          type: 'order',
          actionUrl: '/seller/orders',
          referenceId: order._id,
          referenceModel: 'Order'
        });
      }
      if (appliedUserVoucher && createdOrders.length === 1) {
        appliedUserVoucher.status = 'used';
        appliedUserVoucher.usedAt = new Date();
        appliedUserVoucher.orderId = order._id;
        await appliedUserVoucher.save();
      }
      logger.info(`Order created successfully: ${order.orderNumber} for seller ${sellerId}`);
    } catch (orderError) {
      logger.error('Order creation failed:', {
        error: orderError.message,
        userId: req.user._id,
        sellerId,
        orderData: {
          buyerId: req.user._id,
          sellerId: sellerData.sellerId,
          itemsCount: sellerData.items.length,
          grandTotal: sellerData.subtotal
        }
      });
      throw orderError;
    }
  }

  // Update product stock and sold count
  const affectedSellerIds = [...itemsBySeller.keys()];
  for (const item of items) {
    const product = await Product.findById(item.productId);
    const selectedVariant = resolveOrderVariant(product, item);
    if (selectedVariant) {
      await Product.updateOne(
        { _id: item.productId, 'variants._id': selectedVariant._id },
        {
          $inc: {
            'variants.$.stock': -item.quantity,
            stock: -item.quantity,
            soldCount: item.quantity
          }
        }
      );
    } else {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: {
          stock: -item.quantity,
          soldCount: item.quantity
        }
      });
    }
  }
  await Promise.all(affectedSellerIds.map((sellerId) => refreshShopStats(sellerId)));

  // Send confirmation email for all orders
  try {
    for (const order of createdOrders) {
      await sendOrderConfirmationEmail(req.user.email, order);
    }
  } catch (error) {
    logger.error(`Failed to send order confirmation email: ${error.message}`);
  }

  logger.info(`${createdOrders.length} order(s) created by user ${req.user.email}`);

  res.status(201).json({
    success: true,
    message: createdOrders.length > 1 
      ? `Đặt hàng thành công (${createdOrders.length} đơn hàng từ các shop khác nhau)` 
      : 'Đặt hàng thành công',
    data: createdOrders.length === 1 ? createdOrders[0] : createdOrders
  });
});

/**
 * @desc    Get user orders
 * @route   GET /api/orders
 * @access  Private (Customer)
 */
export const getUserOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;

  const filter = { buyerId: req.user._id };
  
  if (status) {
    filter.orderStatus = status;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('sellerId', 'shopName logoUrl')
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
 * @desc    Get single order
 * @route   GET /api/orders/:id
 * @access  Private
 */
export const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('buyerId', 'name email phone')
    .populate('sellerId', 'shopName logoUrl phone email address')
    .populate('shipperId', 'name phone')
    .populate('items.productId', 'title images slug');

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy đơn hàng'
    });
  }

  // Check access permission
  const isOwner = order.buyerId && order.buyerId._id && order.buyerId._id.toString() === req.user._id.toString();
  const isSeller = order.sellerId && order.sellerId._id && await Shop.findOne({ 
    _id: order.sellerId._id, 
    ownerId: req.user._id 
  });
  const isShipper = order.shipperId && order.shipperId._id && order.shipperId._id.toString() === req.user._id.toString();
  const isAdmin = req.user.roles && req.user.roles.includes('admin');

  if (!isOwner && !isSeller && !isShipper && !isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền xem đơn hàng này'
    });
  }

  res.json({
    success: true,
    data: order
  });
});

/**
 * @desc    Cancel order
 * @route   PATCH /api/orders/:id/cancel
 * @access  Private (Customer)
 */
export const cancelOrder = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy đơn hàng'
    });
  }

  // Check ownership
  if (order.buyerId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền hủy đơn hàng này'
    });
  }

  // Check if order can be cancelled
  if (!['PLACED', 'CONFIRMED'].includes(order.orderStatus)) {
    return res.status(400).json({
      success: false,
      message: 'Không thể hủy đơn hàng ở trạng thái này'
    });
  }

  order.orderStatus = 'CANCELLED';
  order.cancellationReason = reason;
  order.cancelledBy = req.user._id;
  order.cancelledAt = new Date();
  await order.save();
  await notifyOrderStatusChange(order, 'CANCELLED');

  // Restore product stock
  for (const item of order.items) {
    const product = await Product.findById(item.productId);
    const selectedVariant = product ? resolveOrderVariant(product, item) : null;
    if (selectedVariant) {
      await Product.updateOne(
        { _id: item.productId, 'variants._id': selectedVariant._id },
        {
          $inc: {
            'variants.$.stock': item.quantity,
            stock: item.quantity,
            soldCount: -item.quantity
          }
        }
      );
    } else {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: {
          stock: item.quantity,
          soldCount: -item.quantity
        }
      });
    }
  }
  await refreshShopStats(order.sellerId);

  logger.info(`Order cancelled: ${order.orderNumber} by user ${req.user.email}`);

  res.json({
    success: true,
    message: 'Hủy đơn hàng thành công',
    data: order
  });
});

/**
 * @desc    Get seller orders
 * @route   GET /api/seller/orders
 * @access  Private (Seller)
 */
export const getSellerOrders = asyncHandler(async (req, res) => {
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
    filter.orderStatus = status;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('buyerId', 'name email phone')
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
 * @desc    Update order status (by seller)
 * @route   PATCH /api/seller/orders/:id/status
 * @access  Private (Seller)
 */
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy đơn hàng'
    });
  }

  // Check ownership
  const shop = await Shop.findOne({ ownerId: req.user._id });
  if (!shop || order.sellerId.toString() !== shop._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền cập nhật đơn hàng này'
    });
  }

  // Validate status transition
  const validTransitions = {
    'PLACED': ['CONFIRMED', 'CANCELLED'],
    'CONFIRMED': ['PACKED', 'CANCELLED'],
    'PACKED': ['PICKED_UP']
  };

  if (!validTransitions[order.orderStatus]?.includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Không thể chuyển trạng thái đơn hàng'
    });
  }

  order.orderStatus = status;
  if (note) {
    order.sellerNote = note;
  }
  await order.save();
  await notifyOrderStatusChange(order, status);
  if (status === 'DELIVERED') {
    await awardDeliveredOrderPoints(order);
  }

  logger.info(`Order status updated: ${order.orderNumber} to ${status} by seller ${req.user.email}`);

  res.json({
    success: true,
    message: 'Cập nhật trạng thái đơn hàng thành công',
    data: order
  });
});

/**
 * @desc    Get shipper assignments
 * @route   GET /api/shipper/assignments
 * @access  Private (Shipper)
 */
export const getShipperAssignments = asyncHandler(async (req, res) => {
  const { status = 'PACKED' } = req.query;

  // Get orders that need pickup or are assigned to this shipper
  const filter = {
    $or: [
      { orderStatus: status, shipperId: null },
      { shipperId: req.user._id }
    ]
  };

  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .populate('buyerId', 'name phone')
    .populate('sellerId', 'shopName address phone')
    .lean();

  res.json({
    success: true,
    data: orders
  });
});

/**
 * @desc    Update order status (by shipper)
 * @route   PATCH /api/shipper/orders/:id/status
 * @access  Private (Shipper)
 */
export const updateShipperStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy đơn hàng'
    });
  }

  // Assign shipper if not assigned
  if (!order.shipperId) {
    order.shipperId = req.user._id;
  }

  // Check if this shipper is assigned
  if (order.shipperId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không được phân công đơn hàng này'
    });
  }

  // Validate status
  const validStatuses = ['PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Trạng thái không hợp lệ'
    });
  }

  order.orderStatus = status;
  if (note) {
    order.shipperNote = note;
  }

  if (status === 'DELIVERED') {
    order.actualDelivery = new Date();
    if (order.paymentMethod === 'cod') {
      order.paymentStatus = 'paid';
      order.codCollected = true;
    }
  }

  await order.save();
  await notifyOrderStatusChange(order, status);
  if (status === 'DELIVERED') {
    await awardDeliveredOrderPoints(order);
  }

  logger.info(`Order status updated: ${order.orderNumber} to ${status} by shipper ${req.user.email}`);

  res.json({
    success: true,
    message: 'Cập nhật trạng thái đơn hàng thành công',
    data: order
  });
});

export default {
  createOrder,
  getUserOrders,
  getOrder,
  cancelOrder,
  getSellerOrders,
  updateOrderStatus,
  getShipperAssignments,
  updateShipperStatus
};
