import ContactMessage from '../models/ContactMessage.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import logger from '../config/logger.js';
import { sendContactResponseEmail } from '../utils/email.js';

/**
 * @desc    Submit contact form
 * @route   POST /api/contact
 * @access  Public
 */
export const submitContactForm = asyncHandler(async (req, res) => {
  const { name, email, phone, subject, message } = req.body;

  const contactMessage = await ContactMessage.create({
    name,
    email,
    phone,
    subject,
    message,
    userId: req.user?._id // Optional if user is logged in
  });

  logger.info(`Contact form submitted by ${email}`);

  res.status(201).json({
    success: true,
    message: 'Tin nhắn của bạn đã được gửi thành công. Chúng tôi sẽ liên hệ lại sớm!',
    data: contactMessage
  });
});

/**
 * @desc    Get all contact messages (Admin)
 * @route   GET /api/admin/contact-messages
 * @access  Private (Admin)
 */
export const getContactMessages = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (status) {
    filter.status = status;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [messages, total] = await Promise.all([
    ContactMessage.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'name email')
      .populate('adminResponse.respondedBy', 'name email'),
    ContactMessage.countDocuments(filter)
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
 * @desc    Update contact message status / respond (Admin)
 * @route   PATCH /api/admin/contact-messages/:id
 * @access  Private (Admin)
 */
export const updateContactMessage = asyncHandler(async (req, res) => {
  const { status, responseText } = req.body;

  const message = await ContactMessage.findById(req.params.id);

  if (!message) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy tin nhắn'
    });
  }

  if (status) {
    message.status = status;
  }

  if (responseText) {
    message.adminResponse = {
      text: responseText,
      respondedBy: req.user._id,
      respondedAt: new Date()
    };

    // Send email notification to user
    try {
      await sendContactResponseEmail(
        message.email,
        message.name,
        message.message,
        responseText
      );
      logger.info(`Contact response email sent to ${message.email}`);
    } catch (error) {
      logger.error(`Failed to send contact response email: ${error.message}`);
    }
  }

  await message.save();

  logger.info(`Contact message ${message._id} updated by admin ${req.user.email}`);

  res.json({
    success: true,
    message: 'Cập nhật tin nhắn thành công',
    data: message
  });
});

/**
 * @desc    Delete contact message (Admin)
 * @route   DELETE /api/admin/contact-messages/:id
 * @access  Private (Admin)
 */
export const deleteContactMessage = asyncHandler(async (req, res) => {
  const message = await ContactMessage.findByIdAndDelete(req.params.id);

  if (!message) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy tin nhắn'
    });
  }

  logger.info(`Contact message deleted by admin ${req.user.email}`);

  res.json({
    success: true,
    message: 'Đã xóa tin nhắn'
  });
});

export default {
  submitContactForm,
  getContactMessages,
  updateContactMessage,
  deleteContactMessage
};
