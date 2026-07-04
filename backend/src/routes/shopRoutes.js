import express from 'express';
import Shop from '../models/Shop.js';
import Product from '../models/Product.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { getShopComputedStats } from '../utils/shopStats.js';

const router = express.Router();

const buildSort = (sort = 'newest') => {
  switch (sort) {
    case 'price_asc': return { price: 1 };
    case 'price_desc': return { price: -1 };
    case 'popular': return { soldCount: -1 };
    case 'rating': return { ratingAvg: -1 };
    default: return { createdAt: -1 };
  }
};

const getShopFilter = (idOrSlug) => {
  const or = [{ slug: idOrSlug }];
  if (/^[a-f\d]{24}$/i.test(idOrSlug)) or.push({ _id: idOrSlug });
  return { isActive: true, $or: or };
};

const withComputedShopStats = async (shop) => {
  const computed = await getShopComputedStats(shop._id);
  return {
    ...shop,
    stats: {
      ...(shop.stats || {}),
      totalProducts: computed.totalProducts,
      totalOrders: computed.totalOrders,
      totalRevenue: computed.totalRevenue,
      totalReviews: computed.totalReviews,
      totalSold: computed.totalSold
    },
    ratingAvg: computed.ratingAvg,
    ratingCount: computed.ratingCount
  };
};

router.get('/', asyncHandler(async (req, res) => {
  const { search = '', limit = 20 } = req.query;
  const filter = { isActive: true };
  if (search.trim()) {
    const keyword = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { shopName: { $regex: keyword, $options: 'i' } },
      { slug: { $regex: keyword, $options: 'i' } }
    ];
  }

  const shops = await Shop.find(filter)
    .sort({ ratingAvg: -1, createdAt: -1 })
    .limit(Math.min(parseInt(limit), 50))
    .select('shopName slug logoUrl ratingAvg ratingCount')
    .lean();

  res.json({ success: true, data: { shops } });
}));

router.get('/:idOrSlug', asyncHandler(async (req, res) => {
  const shop = await Shop.findOne(getShopFilter(req.params.idOrSlug)).lean();
  if (!shop) return res.status(404).json({ success: false, message: 'Shop không tồn tại' });
  res.json({ success: true, data: await withComputedShopStats(shop) });
}));

router.get('/:idOrSlug/products', asyncHandler(async (req, res) => {
  const shop = await Shop.findOne(getShopFilter(req.params.idOrSlug)).lean();
  if (!shop) return res.status(404).json({ success: false, message: 'Shop không tồn tại' });

  const { page = 1, limit = 20, sort = 'newest', q, category } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const filter = { sellerId: shop._id, isActive: true, isApproved: true };
  if (q) filter.$text = { $search: q };
  if (category) filter.categories = category;

  const [products, total] = await Promise.all([
    Product.find(filter).sort(buildSort(sort)).skip(skip).limit(parseInt(limit)).lean(),
    Product.countDocuments(filter)
  ]);

  const enrichedShop = await withComputedShopStats(shop);

  res.json({
    success: true,
    data: {
      shop: enrichedShop,
      products,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    }
  });
}));

export default router;
