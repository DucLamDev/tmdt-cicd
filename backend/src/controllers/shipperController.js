import Order from '../models/Order.js';
import CODTransaction from '../models/CODTransaction.js';
import ShipperReview from '../models/ShipperReview.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import logger from '../config/logger.js';
import { exportShipperDeliveryReport } from '../utils/excelExporter.js';
import { notifyOrderStatusChange } from './notificationController.js';
import { awardDeliveredOrderPoints } from '../services/loyaltyService.js';

/**
 * @desc    Get shipper dashboard statistics
 * @route   GET /api/shipper/dashboard
 * @access  Private (Shipper)
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalDeliveries,
    todayDeliveries,
    successfulDeliveries,
    failedDeliveries,
    pendingPickups,
    inTransit,
    todayCOD,
    ratingSummary
  ] = await Promise.all([
    Order.countDocuments({ shipperId: req.user._id }),
    Order.countDocuments({ 
      shipperId: req.user._id,
      actualDelivery: { $gte: today }
    }),
    Order.countDocuments({ 
      shipperId: req.user._id,
      orderStatus: 'DELIVERED'
    }),
    Order.countDocuments({ 
      shipperId: req.user._id,
      orderStatus: 'FAILED'
    }),
    Order.countDocuments({ 
      orderStatus: 'PACKED',
      $or: [
        { shipperId: req.user._id },
        { shipperId: null }
      ]
    }),
    Order.countDocuments({ 
      shipperId: req.user._id,
      orderStatus: 'IN_TRANSIT'
    }),
    CODTransaction.aggregate([
      {
        $match: {
          shipperId: req.user._id,
          collectedAt: { $gte: today }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]),
    ShipperReview.aggregate([
      { $match: { shipperId: req.user._id } },
      { $group: { _id: '$shipperId', averageRating: { $avg: '$rating' }, totalReviews: { $sum: 1 } } }
    ])
  ]);

  res.json({
    success: true,
    data: {
      deliveries: {
        total: totalDeliveries,
        today: todayDeliveries,
        successful: successfulDeliveries,
        failed: failedDeliveries
      },
      tasks: {
        pendingPickups,
        inTransit
      },
      cod: {
        todayTotal: todayCOD[0]?.total || 0
      },
      rating: {
        average: Math.round((ratingSummary[0]?.averageRating || 0) * 10) / 10,
        count: ratingSummary[0]?.totalReviews || 0
      }
    }
  });
});

/**
 * @desc    Get available orders for pickup
 * @route   GET /api/shipper/available-orders
 * @access  Private (Shipper)
 */
export const getAvailableOrders = asyncHandler(async (req, res) => {
  const { city, district } = req.query;

  const filter = {
    orderStatus: 'PACKED',
    shipperId: null
  };

  // Filter by location if provided
  if (city) {
    filter['shippingAddress.city'] = city;
  }
  if (district) {
    filter['shippingAddress.district'] = district;
  }

  const orders = await Order.find(filter)
    .sort({ createdAt: 1 })
    .populate('buyerId', 'name phone')
    .populate('sellerId', 'shopName address phone')
    .select('orderNumber items shippingAddress totals paymentMethod codAmount createdAt');

  res.json({
    success: true,
    data: orders
  });
});

/**
 * @desc    Accept order (Shipper accepts the order - transitions to ASSIGNED)
 * @route   POST /api/shipper/orders/:id/pickup
 * @access  Private (Shipper)
 */
export const pickupOrder = asyncHandler(async (req, res) => {
  const { note } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy đơn hàng'
    });
  }

  // Check if order is ready for pickup (must be PACKED status)
  if (order.orderStatus !== 'PACKED') {
    return res.status(400).json({
      success: false,
      message: `Đơn hàng phải ở trạng thái 'Đã đóng gói' để có thể nhận. Trạng thái hiện tại: ${order.orderStatus}`
    });
  }

  // Check if already assigned to another shipper
  if (order.shipperId && order.shipperId.toString() !== req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: 'Đơn hàng đã được shipper khác nhận'
    });
  }

  // Assign shipper and set status to ASSIGNED (waiting for actual pickup)
  order.shipperId = req.user._id;
  order.orderStatus = 'ASSIGNED';
  if (note) {
    order.shipperNote = note;
  }
  await order.save();
  await notifyOrderStatusChange(order, 'ASSIGNED');

  logger.info(`Order ${order.orderNumber} accepted by shipper ${req.user.email}, status: ASSIGNED (waiting for pickup)`);

  res.json({
    success: true,
    message: 'Đã nhận đơn hàng thành công. Hãy đến shop lấy hàng.',
    data: order
  });
});

/**
 * @desc    Confirm pickup (Shipper confirms they have picked up the order)
 * @route   PATCH /api/shipper/orders/:id/confirm-pickup
 * @access  Private (Shipper)
 */
export const confirmPickup = asyncHandler(async (req, res) => {
  const { note } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy đơn hàng'
    });
  }

  // Check if this shipper is assigned
  if (!order.shipperId || order.shipperId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không được phân công đơn hàng này'
    });
  }

  // Check if order is in ASSIGNED status
  if (order.orderStatus !== 'ASSIGNED') {
    return res.status(400).json({
      success: false,
      message: `Đơn hàng phải ở trạng thái 'Chờ lấy hàng' để xác nhận lấy hàng. Trạng thái hiện tại: ${order.orderStatus}`
    });
  }

  order.orderStatus = 'PICKED_UP';
  if (note) {
    order.shipperNote = note;
  }
  await order.save();
  await notifyOrderStatusChange(order, 'PICKED_UP');

  logger.info(`Order ${order.orderNumber} picked up by shipper ${req.user.email}`);

  res.json({
    success: true,
    message: 'Đã xác nhận lấy hàng thành công',
    data: order
  });
});

/**
 * @desc    Update order to in-transit (start delivery)
 * @route   PATCH /api/shipper/orders/:id/in-transit
 * @access  Private (Shipper)
 */
export const updateToInTransit = asyncHandler(async (req, res) => {
  const { note } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy đơn hàng'
    });
  }

  // Check if this shipper is assigned
  if (!order.shipperId || order.shipperId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không được phân công đơn hàng này'
    });
  }

  if (order.orderStatus !== 'PICKED_UP') {
    return res.status(400).json({
      success: false,
      message: 'Đơn hàng phải ở trạng thái đã lấy hàng'
    });
  }

  order.orderStatus = 'IN_TRANSIT';
  if (note) {
    order.shipperNote = note;
  }
  await order.save();
  await notifyOrderStatusChange(order, 'IN_TRANSIT');

  logger.info(`Order ${order.orderNumber} is now in transit`);

  res.json({
    success: true,
    message: 'Đã cập nhật trạng thái đang giao hàng',
    data: order
  });
});

/**
 * @desc    Mark order as delivered
 * @route   POST /api/shipper/orders/:id/deliver
 * @access  Private (Shipper)
 */
export const deliverOrder = asyncHandler(async (req, res) => {
  const { note, codCollected, collectedAmount, customerSignature } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy đơn hàng'
    });
  }

  // Check if this shipper is assigned
  if (!order.shipperId || order.shipperId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không được phân công đơn hàng này'
    });
  }

  if (!['PICKED_UP', 'IN_TRANSIT'].includes(order.orderStatus)) {
    return res.status(400).json({
      success: false,
      message: 'Không thể cập nhật trạng thái giao hàng'
    });
  }

  order.orderStatus = 'DELIVERED';
  order.actualDelivery = new Date();
  if (note) {
    order.shipperNote = note;
  }

  // Handle COD payment
  if (order.paymentMethod === 'cod') {
    if (!codCollected) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng xác nhận đã thu tiền COD'
      });
    }

    order.paymentStatus = 'paid';
    order.codCollected = true;

    // Record COD transaction
    await CODTransaction.create({
      orderId: order._id,
      shipperId: req.user._id,
      amount: collectedAmount || order.codAmount,
      collectedAt: new Date(),
      note: note || 'Đã thu tiền COD'
    });
  }

  await order.save();
  await notifyOrderStatusChange(order, 'DELIVERED');
  await awardDeliveredOrderPoints(order);

  logger.info(`Order ${order.orderNumber} delivered successfully by shipper ${req.user.email}`);

  res.json({
    success: true,
    message: 'Đã giao hàng thành công',
    data: order
  });
});

/**
 * @desc    Mark delivery as failed
 * @route   POST /api/shipper/orders/:id/fail
 * @access  Private (Shipper)
 */
export const failDelivery = asyncHandler(async (req, res) => {
  const { reason, note, attemptCount = 1 } = req.body;

  if (!reason) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng nhập lý do giao hàng thất bại'
    });
  }

  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy đơn hàng'
    });
  }

  // Check if this shipper is assigned
  if (!order.shipperId || order.shipperId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không được phân công đơn hàng này'
    });
  }

  order.orderStatus = 'FAILED';
  order.shipperNote = `${note || ''}\nLý do: ${reason}\nSố lần thử: ${attemptCount}`;
  order.cancellationReason = reason;

  await order.save();
  await notifyOrderStatusChange(order, 'FAILED');

  logger.info(`Order ${order.orderNumber} delivery failed: ${reason}`);

  res.json({
    success: true,
    message: 'Đã cập nhật giao hàng thất bại',
    data: order
  });
});

/**
 * @desc    Get shipper's assigned orders
 * @route   GET /api/shipper/orders
 * @access  Private (Shipper)
 */
export const getMyOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const filter = { shipperId: req.user._id };
  
  if (status) {
    filter.orderStatus = status;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('buyerId', 'name phone')
      .populate('sellerId', 'shopName address phone'),
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
 * @desc    Get delivery history
 * @route   GET /api/shipper/history
 * @access  Private (Shipper)
 */
export const getDeliveryHistory = asyncHandler(async (req, res) => {
  const { startDate, endDate, page = 1, limit = 20 } = req.query;

  const filter = { 
    shipperId: req.user._id,
    orderStatus: { $in: ['DELIVERED', 'FAILED'] }
  };

  if (startDate || endDate) {
    filter.actualDelivery = {};
    if (startDate) filter.actualDelivery.$gte = new Date(startDate);
    if (endDate) filter.actualDelivery.$lte = new Date(endDate);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [orders, total, stats] = await Promise.all([
    Order.find(filter)
      .sort({ actualDelivery: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('buyerId', 'name phone')
      .populate('sellerId', 'shopName'),
    Order.countDocuments(filter),
    Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 },
          totalCOD: {
            $sum: {
              $cond: [
                { $eq: ['$paymentMethod', 'cod'] },
                '$codAmount',
                0
              ]
            }
          }
        }
      }
    ])
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
      },
      stats: {
        delivered: stats.find(s => s._id === 'DELIVERED')?.count || 0,
        failed: stats.find(s => s._id === 'FAILED')?.count || 0,
        totalCODCollected: stats.reduce((sum, s) => sum + s.totalCOD, 0)
      }
    }
  });
});

/**
 * @desc    Get COD transactions
 * @route   GET /api/shipper/cod-transactions
 * @access  Private (Shipper)
 */
export const getCODTransactions = asyncHandler(async (req, res) => {
  const { startDate, endDate, status = 'pending', page = 1, limit = 20 } = req.query;

  const filter = { shipperId: req.user._id };

  if (status) {
    filter.status = status;
  }

  if (startDate || endDate) {
    filter.collectedAt = {};
    if (startDate) filter.collectedAt.$gte = new Date(startDate);
    if (endDate) filter.collectedAt.$lte = new Date(endDate);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [transactions, total, summary] = await Promise.all([
    CODTransaction.find(filter)
      .sort({ collectedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('orderId', 'orderNumber shippingAddress'),
    CODTransaction.countDocuments(filter),
    CODTransaction.aggregate([
      { $match: { shipperId: req.user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total: { $sum: '$amount' }
        }
      }
    ])
  ]);

  res.json({
    success: true,
    data: {
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      summary: {
        pending: summary.find(s => s._id === 'pending')?.total || 0,
        remitted: summary.find(s => s._id === 'remitted')?.total || 0,
        totalCollected: summary.reduce((sum, s) => sum + s.total, 0)
      }
    }
  });
});

/**
 * @desc    Confirm COD remittance
 * @route   POST /api/shipper/cod/remit
 * @access  Private (Shipper)
 */
export const remitCOD = asyncHandler(async (req, res) => {
  const { transactionIds, note } = req.body;

  if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng chọn các giao dịch cần nộp tiền'
    });
  }

  const transactions = await CODTransaction.find({
    _id: { $in: transactionIds },
    shipperId: req.user._id,
    status: 'pending'
  });

  if (transactions.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy giao dịch hợp lệ'
    });
  }

  // Update transactions to remitted
  await CODTransaction.updateMany(
    { _id: { $in: transactionIds } },
    {
      status: 'remitted',
      remittedAt: new Date(),
      remittanceNote: note
    }
  );

  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

  logger.info(`Shipper ${req.user.email} remitted COD: ${totalAmount} VND`);

  res.json({
    success: true,
    message: 'Nộp tiền COD thành công',
    data: {
      transactionCount: transactions.length,
      totalAmount
    }
  });
});

/**
 * @desc    Export delivery report to Excel
 * @route   GET /api/shipper/reports/export
 * @access  Private (Shipper)
 */
export const exportDeliveryReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  // Get delivery stats
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  const [totalDeliveries, successfulDeliveries, failedDeliveries, totalCOD, orders] = await Promise.all([
    Order.countDocuments({ 
      shipperId: req.user._id,
      createdAt: { $gte: start, $lte: end }
    }),
    Order.countDocuments({ 
      shipperId: req.user._id,
      orderStatus: 'DELIVERED',
      createdAt: { $gte: start, $lte: end }
    }),
    Order.countDocuments({ 
      shipperId: req.user._id,
      orderStatus: 'DELIVERY_FAILED',
      createdAt: { $gte: start, $lte: end }
    }),
    CODTransaction.aggregate([
      {
        $match: {
          shipperId: req.user._id,
          status: 'collected',
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]),
    Order.find({ 
      shipperId: req.user._id,
      createdAt: { $gte: start, $lte: end }
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .select('orderNumber deliveredAt shippingAddress orderStatus payment')
      .lean()
  ]);

  const deliveryStats = {
    totalDeliveries,
    successfulDeliveries,
    failedDeliveries,
    successRate: totalDeliveries > 0 ? ((successfulDeliveries / totalDeliveries) * 100).toFixed(2) : 0,
    totalCODCollected: totalCOD[0]?.total || 0
  };

  // Create Excel file
  const workbook = await exportShipperDeliveryReport(deliveryStats, orders);

  // Set headers
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=bao-cao-giao-hang-${Date.now()}.xlsx`);

  await workbook.xlsx.write(res);
  res.end();
});

export default {
  getDashboardStats,
  getAvailableOrders,
  pickupOrder,
  updateToInTransit,
  deliverOrder,
  failDelivery,
  getMyOrders,
  getDeliveryHistory,
  getCODTransactions,
  remitCOD,
  exportDeliveryReport
};
