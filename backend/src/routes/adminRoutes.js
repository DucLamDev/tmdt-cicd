import express from 'express';
import * as adminController from '../controllers/adminController.js';
import { createCategory, updateCategory, deleteCategory, reorderCategories } from '../controllers/categoryController.js';
import { getAdminReturns, processRefund } from '../controllers/returnController.js';
import { createFlashSale, updateFlashSale, deleteFlashSale, getAdminFlashSales } from '../controllers/flashSaleController.js';
import { createPost, updatePost, deletePost, getAdminPosts } from '../controllers/blogController.js';
import { adminAdjustPoints } from '../controllers/loyaltyController.js';
import { askAdminAI, predictAdminTrends } from '../controllers/aiController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validateId } from '../middlewares/validateId.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate, authorize('admin'));

// Dashboard
router.get('/stats', adminController.getDashboardStats);
router.get('/ai/trends', predictAdminTrends);
router.post('/ai/ask', askAdminAI);
router.get('/reports/revenue', adminController.getRevenueReport);
router.get('/reports/quality-scores', adminController.getQualityScores);
router.get('/reports/export', adminController.exportSystemReport);

// User management
router.get('/users', adminController.getUsers);
router.get('/pending-approvals', adminController.getPendingApprovals);
router.post('/users/:id/impersonate', validateId('id'), adminController.impersonateUser);
router.patch('/users/:id/quality-warning', validateId('id'), adminController.issueQualityWarning);
router.patch('/users/:id/lock', validateId('id'), adminController.toggleUserLock);
router.patch('/users/:id/password', validateId('id'), adminController.changeUserPassword);
router.patch('/users/:id/approval', validateId('id'), adminController.handleUserApproval);
router.delete('/users/:id', validateId('id'), adminController.deleteUser);

// Product management
router.get('/products', adminController.getProducts);
router.patch('/products/:id/approve', validateId('id'), adminController.approveProduct);
router.delete('/products/:id', validateId('id'), adminController.deleteProduct);

// Order management
router.get('/orders', adminController.getOrders);

// Promotion management
router.get('/promotions', adminController.getPromotions);
router.post('/promotions', adminController.createPromotion);
router.put('/promotions/:id', validateId('id'), adminController.updatePromotion);
router.delete('/promotions/:id', validateId('id'), adminController.deletePromotion);

// Category management
router.post('/categories', createCategory);
router.put('/categories/:id', validateId('id'), updateCategory);
router.delete('/categories/:id', validateId('id'), deleteCategory);
router.patch('/categories/reorder', reorderCategories);

// Return/Refund management
router.get('/returns', getAdminReturns);
router.patch('/returns/:id/refund', validateId('id'), processRefund);

// Flash Sale management
router.get('/flash-sales', getAdminFlashSales);
router.post('/flash-sales', createFlashSale);
router.put('/flash-sales/:id', validateId('id'), updateFlashSale);
router.delete('/flash-sales/:id', validateId('id'), deleteFlashSale);

// Blog management
router.get('/blog', getAdminPosts);
router.post('/blog', createPost);
router.put('/blog/:id', validateId('id'), updatePost);
router.delete('/blog/:id', validateId('id'), deletePost);

// Loyalty points
router.post('/loyalty/adjust', adminAdjustPoints);

export default router;
