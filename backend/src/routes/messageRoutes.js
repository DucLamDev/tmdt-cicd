import express from 'express';
import * as messageController from '../controllers/messageController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { validateId } from '../middlewares/validateId.js';

const router = express.Router();

// All message routes require authentication
router.use(authenticate);

// Message statistics
router.get('/stats', asyncHandler(messageController.getMessageStats));

// Seller messages
router.get('/seller', authorize('seller'), asyncHandler(messageController.getSellerMessages));

// Admin messages
router.get('/admin', authorize('admin'), asyncHandler(messageController.getAdminMessages));

/**
 * @desc    Create new message to seller or admin
 * @route   POST /api/messages
 * @access  Private (Customer)
 */
router.post('/', asyncHandler(messageController.createMessage));

/**
 * @desc    Get customer's messages
 * @route   GET /api/messages
 * @access  Private (Customer)
 */
router.get('/', asyncHandler(messageController.getMyMessages));

/**
 * @desc    Get single message
 * @route   GET /api/messages/:id
 * @access  Private
 */
router.get('/:id', validateId('id'), asyncHandler(messageController.getMessage));

/**
 * @desc    Reply to message
 * @route   POST /api/messages/:id/reply
 * @access  Private (Seller/Admin)
 */
router.post('/:id/reply', validateId('id'), asyncHandler(messageController.replyToMessage));

/**
 * @desc    Update message status
 * @route   PATCH /api/messages/:id/status
 * @access  Private (Seller/Admin)
 */
router.patch('/:id/status', validateId('id'), asyncHandler(messageController.updateMessageStatus));

/**
 * @desc    Delete message
 * @route   DELETE /api/messages/:id
 * @access  Private (Customer - own messages, Admin - all messages)
 */
router.delete('/:id', validateId('id'), asyncHandler(messageController.deleteMessage));

export default router;
