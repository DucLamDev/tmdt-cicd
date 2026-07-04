import express from 'express';
import * as notificationController from '../controllers/notificationController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validateId } from '../middlewares/validateId.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Customer routes
router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.get('/navigation-badges', notificationController.getNavigationBadges);
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:id/read', validateId('id'), notificationController.markAsRead);
router.delete('/:id', validateId('id'), notificationController.deleteNotification);

// Admin routes
router.post('/', authorize('admin'), notificationController.createNotification);
router.post('/broadcast', authorize('admin'), notificationController.broadcastNotification);

export default router;
