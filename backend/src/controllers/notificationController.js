import Notification from '../models/Notification.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import logger from '../config/logger.js';
import { sendToUser } from '../utils/realtime.js';

const emitNotificationCreated = (notification) => {
  if (!notification?.userId) return;
  const data = typeof notification.toObject === 'function' ? notification.toObject() : notification;
  sendToUser(notification.userId, 'notification:new', { notification: data });
  sendToUser(notification.userId, 'notification:count:update', { delta: 1 });
};

const emitNotificationsRead = (userId, data = {}) => {
  sendToUser(userId, 'notification:read', data);
  sendToUser(userId, 'notification:count:refresh', { at: new Date().toISOString() });
};

export const getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const filter = { userId: req.user._id };
  if (unreadOnly === 'true') filter.isRead = false;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId: req.user._id, isRead: false })
  ]);

  res.json({
    success: true,
    data: {
      notifications,
      unreadCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ userId: req.user._id, isRead: false });
  res.json({ success: true, data: { count } });
});

export const getNavigationBadges = asyncHandler(async (req, res) => {
  const badges = {};
  const roles = req.user.roles || [];

  if (roles.includes('seller')) {
    const [{ default: Shop }, { default: Order }, { default: Message }, { default: ReturnModel }, { default: Product }] = await Promise.all([
      import('../models/Shop.js'),
      import('../models/Order.js'),
      import('../models/Message.js'),
      import('../models/Return.js'),
      import('../models/Product.js')
    ]);
    const shop = await Shop.findOne({ ownerId: req.user._id }).select('_id').lean();
    if (shop) {
      const [orders, messages, returns, inventory, pendingProducts] = await Promise.all([
        Order.countDocuments({ sellerId: shop._id, orderStatus: { $in: ['PLACED', 'CONFIRMED'] } }),
        Message.countDocuments({ sellerId: shop._id, isRead: false }),
        ReturnModel.countDocuments({ sellerId: shop._id, status: 'RETURN_REQUESTED' }),
        Product.countDocuments({ sellerId: shop._id, isActive: true, stock: { $lte: 10 } }),
        Product.countDocuments({ sellerId: shop._id, isActive: true, isApproved: false })
      ]);
      badges['/seller/orders'] = orders;
      badges['/seller/messages'] = messages;
      badges['/seller/returns'] = returns;
      badges['/seller/inventory'] = inventory;
      badges['/seller/products'] = pendingProducts;
    }
  }

  if (roles.includes('shipper')) {
    const [{ default: Order }, { default: CODTransaction }] = await Promise.all([
      import('../models/Order.js'),
      import('../models/CODTransaction.js')
    ]);
    const [availableOrders, activeOrders, cod, failed] = await Promise.all([
      Order.countDocuments({ orderStatus: 'PACKED', shipperId: null }),
      Order.countDocuments({ shipperId: req.user._id, orderStatus: { $in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'] } }),
      CODTransaction.countDocuments({ shipperId: req.user._id, status: 'pending' }),
      Order.countDocuments({ shipperId: req.user._id, orderStatus: 'FAILED' })
    ]);
    badges['/shipper/available-orders'] = availableOrders;
    badges['/shipper/orders'] = activeOrders;
    badges['/shipper/cod'] = cod;
    badges['/shipper/history'] = failed;
  }

  const unreadNotifications = await Notification.countDocuments({ userId: req.user._id, isRead: false });
  res.json({ success: true, data: { badges, unreadNotifications } });
});

export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
  }

  emitNotificationsRead(req.user._id, { notificationId: notification._id });
  res.json({ success: true, data: notification });
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
  emitNotificationsRead(req.user._id, { all: true });
  res.json({ success: true, message: 'Đã đánh dấu tất cả là đã đọc' });
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!notification) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
  }

  sendToUser(req.user._id, 'notification:deleted', { notificationId: notification._id });
  sendToUser(req.user._id, 'notification:count:refresh', { at: new Date().toISOString() });
  res.json({ success: true, message: 'Đã xóa thông báo' });
});

export const createNotification = asyncHandler(async (req, res) => {
  const { userId, title, message, type, actionUrl } = req.body;

  const notification = await Notification.create({
    userId,
    title,
    message,
    type: type || 'system',
    actionUrl
  });

  emitNotificationCreated(notification);
  res.status(201).json({ success: true, data: notification });
});

export const broadcastNotification = asyncHandler(async (req, res) => {
  const { title, message, type, actionUrl } = req.body;

  const User = (await import('../models/User.js')).default;
  const users = await User.find({ isActive: true }).select('_id').lean();

  const notifications = users.map((user) => ({
    userId: user._id,
    title,
    message,
    type: type || 'promotion',
    actionUrl
  }));

  const createdNotifications = await Notification.insertMany(notifications);
  createdNotifications.forEach(emitNotificationCreated);

  logger.info(`Broadcast notification sent to ${users.length} users: ${title}`);

  res.status(201).json({
    success: true,
    message: `Đã gửi thông báo đến ${users.length} người dùng`
  });
});

export const createNotificationInternal = async ({
  userId,
  title,
  message,
  type,
  actionUrl,
  referenceId,
  referenceModel,
  metadata
}) => {
  try {
    const notification = await Notification.create({
      userId,
      title,
      message,
      type: type || 'system',
      actionUrl,
      referenceId,
      referenceModel,
      metadata: metadata || {}
    });
    emitNotificationCreated(notification);
    logger.info(`Notification created for user ${userId}: ${title}`);
    return notification;
  } catch (error) {
    logger.error(`Failed to create notification: ${error.message}`);
    return null;
  }
};

export const notifyOrderStatusChange = async (order, newStatus) => {
  const statusMessages = {
    CONFIRMED: { title: 'Đơn hàng đã xác nhận', message: `Đơn hàng ${order.orderNumber} đã được seller xác nhận.` },
    PACKED: { title: 'Đơn hàng đã đóng gói', message: `Đơn hàng ${order.orderNumber} đã được đóng gói, chờ shipper lấy hàng.` },
    ASSIGNED: { title: 'Shipper đã nhận đơn', message: `Đơn hàng ${order.orderNumber} đã được giao cho shipper.` },
    PICKED_UP: { title: 'Shipper đã lấy hàng', message: `Shipper đã lấy đơn hàng ${order.orderNumber}.` },
    IN_TRANSIT: { title: 'Đang giao hàng', message: `Đơn hàng ${order.orderNumber} đang được giao đến bạn.` },
    DELIVERED: { title: 'Giao hàng thành công', message: `Đơn hàng ${order.orderNumber} đã được giao thành công.` },
    CANCELLED: { title: 'Đơn hàng đã hủy', message: `Đơn hàng ${order.orderNumber} đã bị hủy.` },
    FAILED: { title: 'Giao hàng thất bại', message: `Giao đơn hàng ${order.orderNumber} thất bại.` },
    RETURN_REQUESTED: { title: 'Đã gửi yêu cầu trả hàng', message: `Yêu cầu trả hàng cho đơn ${order.orderNumber} đang chờ xử lý.` },
    RETURN_APPROVED: { title: 'Yêu cầu trả hàng được duyệt', message: `Shop đã duyệt yêu cầu trả hàng cho đơn ${order.orderNumber}.` },
    RETURN_REJECTED: { title: 'Yêu cầu trả hàng bị từ chối', message: `Shop đã từ chối yêu cầu trả hàng cho đơn ${order.orderNumber}.` },
    RETURN_PICKED: { title: 'Shipper đã lấy hàng trả', message: `Shipper đã lấy hàng trả cho đơn ${order.orderNumber}.` },
    RETURN_COMPLETED: { title: 'Hoàn trả hoàn tất', message: `Đơn ${order.orderNumber} đã hoàn tất xử lý trả hàng/hoàn tiền.` }
  };

  const info = statusMessages[newStatus];
  if (!info) return;

  await createNotificationInternal({
    userId: order.buyerId,
    title: info.title,
    message: info.message,
    type: 'order',
    actionUrl: `/orders/${order._id}`,
    referenceId: order._id,
    referenceModel: 'Order'
  });
};

export default {
  getNotifications,
  getUnreadCount,
  getNavigationBadges,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  broadcastNotification,
  createNotificationInternal,
  notifyOrderStatusChange
};
