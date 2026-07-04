import RecentlyViewed from '../models/RecentlyViewed.js';
import Product from '../models/Product.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

export const addRecentlyViewed = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  const product = await Product.findById(productId).select('_id').lean();
  if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });

  await RecentlyViewed.findOneAndUpdate(
    { userId: req.user._id, productId },
    { $set: { viewedAt: new Date() } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const oldItems = await RecentlyViewed.find({ userId: req.user._id }).sort({ viewedAt: -1 }).skip(20).select('_id').lean();
  if (oldItems.length) {
    await RecentlyViewed.deleteMany({ _id: { $in: oldItems.map((item) => item._id) } });
  }

  res.json({ success: true });
});

export const listRecentlyViewed = asyncHandler(async (req, res) => {
  const items = await RecentlyViewed.find({ userId: req.user._id })
    .sort({ viewedAt: -1 })
    .limit(20)
    .populate('productId', 'title slug price salePrice images ratingAvg')
    .lean();

  const products = items
    .filter((item) => item.productId)
    .map((item) => ({ ...item.productId, viewedAt: item.viewedAt }));

  res.json({ success: true, data: products });
});

export default { addRecentlyViewed, listRecentlyViewed };
