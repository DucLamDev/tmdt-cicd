import Message from '../models/Message.js';
import Shop from '../models/Shop.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import logger from '../config/logger.js';
import { sendDashboardUpdate, sendToUser } from '../utils/realtime.js';
import { scanViolation } from '../utils/moderation.js';
import { createNotificationInternal } from './notificationController.js';

/**
 * @desc    Create new message to seller or admin
 * @route   POST /api/messages
 * @access  Private (Customer)
 */
export const createMessage = async (req, res) => {
  try {
    const { sellerId, shopName, productId, subject, content, type, recipient } = req.body;

    if (!subject || !content) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ thông tin'
      });
    }

    const moderation = scanViolation(`${subject} ${content}`);
    if (moderation.hasViolation) {
      await createNotificationInternal({
        userId: req.user._id,
        title: 'Nội dung cần chỉnh sửa',
        message: 'Tin nhắn của bạn có dấu hiệu vi phạm quy định marketplace. Vui lòng bỏ từ ngữ không phù hợp hoặc giao dịch ngoài hệ thống.',
        type: 'system',
        actionUrl: '/messages'
      });

      return res.status(400).json({
        success: false,
        message: 'Tin nhắn có dấu hiệu vi phạm quy định. Vui lòng chỉnh sửa trước khi gửi.',
        data: { reasons: moderation.reasons }
      });
    }

    let messageData = {
      customerId: req.user._id,
      subject,
      content,
      type: type || 'question'
    };

    // Message to seller/admin
    if (sellerId || shopName) {
      const trimmedShopName = String(shopName || '').trim();
      const shop = sellerId
        ? await Shop.findById(sellerId)
        : await Shop.findOne({
            isActive: true,
            $or: [
              { shopName: { $regex: `^${trimmedShopName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
              { slug: trimmedShopName.toLowerCase() }
            ]
          });
      if (!shop) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy shop'
        });
      }
      messageData.sellerId = shop._id;
      messageData.recipientRole = 'seller';
    } else if (recipient === 'admin') {
      messageData.recipientRole = 'admin';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Vui lÃ²ng chá»n shop hoáº·c admin nháº­n tin'
      });
    }

    // Verify product if provided
    if (productId) {
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sản phẩm'
        });
      }
      messageData.productId = productId;
    }

    const message = await Message.create(messageData);

    if (messageData.sellerId) {
      const shop = await Shop.findById(messageData.sellerId).select('ownerId');
      if (shop?.ownerId) {
        sendToUser(shop.ownerId, 'message:new', { messageId: message._id });
        sendDashboardUpdate([shop.ownerId], 'seller');
      }
    } else {
      const admins = await User.find({ roles: 'admin', isActive: true }).select('_id').lean();
      const adminIds = admins.map(admin => admin._id);
      adminIds.forEach(adminId => sendToUser(adminId, 'message:new', { messageId: message._id }));
      sendDashboardUpdate(adminIds, 'admin');
    }

    res.status(201).json({
      success: true,
      message: 'Gửi tin nhắn thành công',
      data: message
    });
  } catch (error) {
    logger.error(`Create message error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Không thể gửi tin nhắn'
    });
  }
};

/**
 * @desc    Get customer's messages
 * @route   GET /api/messages
 * @access  Private (Customer)
 */
export const getMyMessages = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const filter = { customerId: req.user._id };
    
    if (status) {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [messages, total] = await Promise.all([
      Message.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('sellerId', 'shopName logoUrl')
        .populate('productId', 'title images')
        .populate('replies.repliedBy', 'name email roles avatarUrl'),
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
  } catch (error) {
    logger.error(`Get messages error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Không thể lấy danh sách tin nhắn'
    });
  }
};

/**
 * @desc    Get seller's messages
 * @route   GET /api/messages/seller
 * @access  Private (Seller)
 */
export const getSellerMessages = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    // Find seller's shop
    const shop = await Shop.findOne({ ownerId: req.user._id });
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy shop của bạn'
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
        .populate('productId', 'title images')
        .populate('replies.repliedBy', 'name email roles avatarUrl'),
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
  } catch (error) {
    logger.error(`Get seller messages error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Không thể lấy danh sách tin nhắn'
    });
  }
};

/**
 * @desc    Get admin's messages (all messages)
 * @route   GET /api/messages/admin
 * @access  Private (Admin)
 */
export const getAdminMessages = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, priority } = req.query;

    const filter = {};
    
    if (status) {
      filter.status = status;
    }
    if (priority) {
      filter.priority = priority;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [messages, total] = await Promise.all([
      Message.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('customerId', 'name email avatarUrl')
        .populate('sellerId', 'shopName logoUrl')
        .populate('productId', 'title images')
        .populate('replies.repliedBy', 'name email roles avatarUrl'),
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
  } catch (error) {
    logger.error(`Get admin messages error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Không thể lấy danh sách tin nhắn'
    });
  }
};

/**
 * @desc    Get single message
 * @route   GET /api/messages/:id
 * @access  Private
 */
export const getMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id)
      .populate('customerId', 'name email avatarUrl')
      .populate('sellerId', 'shopName logoUrl phone email')
      .populate('productId', 'title images slug')
      .populate('replies.repliedBy', 'name email roles avatarUrl');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tin nhắn'
      });
    }

    // Check access permission
    const isCustomer = message.customerId._id.toString() === req.user._id.toString();
    const isSeller = message.sellerId ? await Shop.findOne({ 
      _id: message.sellerId, 
      ownerId: req.user._id 
    }) : null;
    const isAdmin = req.user.roles?.includes('admin');

    if (!isCustomer && !isSeller && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem tin nhắn này'
      });
    }

    // Mark as read if seller/admin is viewing
    if ((isSeller || isAdmin) && !message.isRead) {
      await message.markAsRead();
    }

    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    logger.error(`Get message error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Không thể lấy tin nhắn'
    });
  }
};

/**
 * @desc    Reply to message
 * @route   POST /api/messages/:id/reply
 * @access  Private (Customer/Seller/Admin)
 */
export const replyToMessage = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập nội dung phản hồi'
      });
    }

    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tin nhắn'
      });
    }

    // Check permission
    const isCustomer = message.customerId.toString() === req.user._id.toString();
    const isSeller = message.sellerId ? await Shop.findOne({ 
      _id: message.sellerId, 
      ownerId: req.user._id 
    }) : null;
    const isAdmin = req.user.roles?.includes('admin');

    if (!isCustomer && !isSeller && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền phản hồi tin nhắn này'
      });
    }

    // Add reply
    message.replies.push({
      content,
      repliedBy: req.user._id
    });

    // Update status
    if (isCustomer && message.status === 'replied') {
      message.status = 'pending';
      message.isRead = false;
      message.readAt = undefined;
    } else if (message.status === 'pending') {
      message.status = 'replied';
    }

    await message.save();

    // Populate the new reply
    await message.populate('replies.repliedBy', 'name email roles avatarUrl');

    if (isCustomer) {
      if (message.sellerId) {
        const shop = await Shop.findById(message.sellerId).select('ownerId');
        if (shop?.ownerId) {
          sendToUser(shop.ownerId, 'message:reply', { messageId: message._id });
          sendDashboardUpdate([shop.ownerId], 'seller');
        }
      } else {
        const admins = await User.find({ roles: 'admin', isActive: true }).select('_id').lean();
        const adminIds = admins.map(admin => admin._id);
        adminIds.forEach(adminId => sendToUser(adminId, 'message:reply', { messageId: message._id }));
        sendDashboardUpdate(adminIds, 'admin');
      }
    } else {
      sendToUser(message.customerId, 'message:reply', { messageId: message._id });
      sendDashboardUpdate([message.customerId], 'customer');
    }

    res.json({
      success: true,
      message: 'Phản hồi thành công',
      data: message
    });
  } catch (error) {
    logger.error(`Reply to message error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Không thể phản hồi tin nhắn'
    });
  }
};

/**
 * @desc    Update message status
 * @route   PATCH /api/messages/:id/status
 * @access  Private (Seller/Admin)
 */
export const updateMessageStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['pending', 'replied', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái không hợp lệ'
      });
    }

    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tin nhắn'
      });
    }

    // Check permission
    const isSeller = message.sellerId ? await Shop.findOne({ 
      _id: message.sellerId, 
      ownerId: req.user._id 
    }) : null;
    const isAdmin = req.user.roles?.includes('admin');

    if (!isSeller && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền cập nhật tin nhắn này'
      });
    }

    message.status = status;
    await message.save();

    res.json({
      success: true,
      message: 'Cập nhật trạng thái thành công',
      data: message
    });
  } catch (error) {
    logger.error(`Update message status error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Không thể cập nhật trạng thái'
    });
  }
};

/**
 * @desc    Delete message
 * @route   DELETE /api/messages/:id
 * @access  Private (Customer - own messages, Admin - all messages)
 */
export const deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tin nhắn'
      });
    }

    // Check ownership or admin
    const isOwner = message.customerId.toString() === req.user._id.toString();
    const isAdmin = req.user.roles?.includes('admin');

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa tin nhắn này'
      });
    }

    await message.deleteOne();

    res.json({
      success: true,
      message: 'Xóa tin nhắn thành công'
    });
  } catch (error) {
    logger.error(`Delete message error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Không thể xóa tin nhắn'
    });
  }
};

/**
 * @desc    Get message statistics
 * @route   GET /api/messages/stats
 * @access  Private (Seller/Admin)
 */
export const getMessageStats = async (req, res) => {
  try {
    const isAdmin = req.user.roles?.includes('admin');
    let filter = {};

    if (!isAdmin) {
      // For seller
      const shop = await Shop.findOne({ ownerId: req.user._id });
      if (!shop) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy shop của bạn'
        });
      }
      filter.sellerId = shop._id;
    }

    const [
      total,
      pending,
      replied,
      resolved,
      unread
    ] = await Promise.all([
      Message.countDocuments(filter),
      Message.countDocuments({ ...filter, status: 'pending' }),
      Message.countDocuments({ ...filter, status: 'replied' }),
      Message.countDocuments({ ...filter, status: 'resolved' }),
      Message.countDocuments({ ...filter, isRead: false })
    ]);

    res.json({
      success: true,
      data: {
        total,
        pending,
        replied,
        resolved,
        unread
      }
    });
  } catch (error) {
    logger.error(`Get message stats error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Không thể lấy thống kê'
    });
  }
};

export default {
  createMessage,
  getMyMessages,
  getSellerMessages,
  getAdminMessages,
  getMessage,
  replyToMessage,
  updateMessageStatus,
  deleteMessage,
  getMessageStats
};
