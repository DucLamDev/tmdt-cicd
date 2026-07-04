import express from 'express';
import * as productController from '../controllers/productController.js';
import * as orderController from '../controllers/orderController.js';
import * as sellerController from '../controllers/sellerController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validateId } from '../middlewares/validateId.js';
import Shop from '../models/Shop.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = express.Router();

// All seller routes require authentication and seller role
router.use(authenticate, authorize('seller'));

// Shop management
router.post('/shop', asyncHandler(async (req, res) => {
  // Check if shop already exists
  const existingShop = await Shop.findOne({ ownerId: req.user._id });
  if (existingShop) {
    return res.status(400).json({
      success: false,
      message: 'Bạn đã có shop'
    });
  }

  const shop = await Shop.create({
    ...req.body,
    ownerId: req.user._id
  });

  res.status(201).json({
    success: true,
    message: 'Tạo shop thành công',
    data: shop
  });
}));

router.get('/shop', asyncHandler(async (req, res) => {
  const shop = await Shop.findOne({ ownerId: req.user._id });
  
  if (!shop) {
    return res.status(404).json({
      success: false,
      message: 'Bạn chưa tạo shop'
    });
  }

  res.json({
    success: true,
    data: shop
  });
}));

router.put('/shop', asyncHandler(async (req, res) => {
  const shop = await Shop.findOneAndUpdate(
    { ownerId: req.user._id },
    req.body,
    { new: true, runValidators: true }
  );

  if (!shop) {
    return res.status(404).json({
      success: false,
      message: 'Bạn chưa tạo shop'
    });
  }

  res.json({
    success: true,
    message: 'Cập nhật shop thành công',
    data: shop
  });
}));

// Product management
router.get('/products', productController.getSellerProducts);
router.get('/products/:id', validateId('id'), productController.getSellerProduct);
router.post('/products', productController.createProduct);
router.put('/products/:id', validateId('id'), productController.updateProduct);
router.patch('/products/:id', validateId('id'), productController.updateProduct);
router.delete('/products/:id', validateId('id'), productController.deleteProduct);

// Order management
router.get('/orders', orderController.getSellerOrders);
router.patch('/orders/:id/status', validateId('id'), orderController.updateOrderStatus);

// Dashboard
router.get('/dashboard', sellerController.getDashboardStats);

// Reports
router.get('/reports/sales', sellerController.getSalesReport);
router.get('/reports/best-sellers', sellerController.getBestSellers);
router.get('/reports/export', sellerController.exportSalesReport);
router.get('/reports', asyncHandler(async (req, res) => {
  const shop = await Shop.findOne({ ownerId: req.user._id });
  
  if (!shop) {
    return res.status(404).json({
      success: false,
      message: 'Bạn chưa tạo shop'
    });
  }

  res.json({
    success: true,
    data: {
      stats: shop.stats,
      revenue: shop.stats.totalRevenue,
      orders: shop.stats.totalOrders,
      products: shop.stats.totalProducts
    }
  });
}));

// Shipping labels
router.post('/orders/:id/shipping-label', validateId('id'), sellerController.generateShippingLabel);

// Customer messages and Q&A
router.get('/messages', sellerController.getMessages);
router.post('/messages/:id/reply', validateId('id'), sellerController.replyToMessage);

// Shop management
router.put('/shop/update', sellerController.updateShopInfo);

// Inventory management
router.get('/inventory/alerts', sellerController.getInventoryAlerts);

// Return/Refund management
import { getSellerReturns, respondToReturn } from '../controllers/returnController.js';
router.get('/returns', getSellerReturns);
router.patch('/returns/:id/respond', validateId('id'), respondToReturn);

export default router;
