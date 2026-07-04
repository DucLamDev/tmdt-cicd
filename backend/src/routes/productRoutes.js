import express from 'express';
import * as productController from '../controllers/productController.js';
import Shop from '../models/Shop.js';
import Product from '../models/Product.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = express.Router();

// Public routes
router.get('/', productController.getProducts);
router.get('/categories', productController.getCategories);
router.get('/brands', productController.getBrands);
router.get('/compare', productController.compareProducts);
router.get('/:idOrSlug', productController.getProduct);
router.get('/:id/similar', productController.getSimilarProducts);

// Shop public page
router.get('/shop/:slug', asyncHandler(async (req, res) => {
  const shop = await Shop.findOne({ slug: req.params.slug, isActive: true });
  if (!shop) return res.status(404).json({ success: false, message: 'Shop không tồn tại' });
  const { page = 1, limit = 20, sort = 'newest' } = req.query;
  let sortOpt = {};
  switch (sort) {
    case 'price_asc': sortOpt = { price: 1 }; break;
    case 'price_desc': sortOpt = { price: -1 }; break;
    case 'popular': sortOpt = { soldCount: -1 }; break;
    case 'rating': sortOpt = { ratingAvg: -1 }; break;
    default: sortOpt = { createdAt: -1 };
  }
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [products, total] = await Promise.all([
    Product.find({ sellerId: shop._id, isActive: true, isApproved: true }).sort(sortOpt).skip(skip).limit(parseInt(limit)).lean(),
    Product.countDocuments({ sellerId: shop._id, isActive: true, isApproved: true })
  ]);
  res.json({ success: true, data: { shop, products, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } } });
}));

export default router;
