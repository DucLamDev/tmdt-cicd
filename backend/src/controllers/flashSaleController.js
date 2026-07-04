import FlashSale from '../models/FlashSale.js';
import Product from '../models/Product.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import logger from '../config/logger.js';

/**
 * @desc    Get active/upcoming flash sales (public)
 * @route   GET /api/flash-sales
 * @access  Public
 */
export const getFlashSales = asyncHandler(async (req, res) => {
  const now = new Date();
  const sales = await FlashSale.find({
    isActive: true,
    endTime: { $gte: now }
  })
    .sort({ startTime: 1 })
    .populate('products.productId', 'title slug images ratingAvg reviewCount')
    .lean();

  const enriched = sales.map(sale => ({
    ...sale,
    isRunning: now >= new Date(sale.startTime) && now <= new Date(sale.endTime),
    isUpcoming: now < new Date(sale.startTime),
    timeLeft: new Date(sale.endTime) - now
  }));

  res.json({ success: true, data: enriched });
});

/**
 * @desc    Get single flash sale
 * @route   GET /api/flash-sales/:id
 * @access  Public
 */
export const getFlashSaleById = asyncHandler(async (req, res) => {
  const sale = await FlashSale.findById(req.params.id)
    .populate('products.productId', 'title slug images ratingAvg reviewCount stock');
  if (!sale) return res.status(404).json({ success: false, message: 'Flash sale không tồn tại' });
  res.json({ success: true, data: sale });
});

/**
 * @desc    Admin: Create flash sale
 * @route   POST /api/admin/flash-sales
 * @access  Private (Admin)
 */
export const createFlashSale = asyncHandler(async (req, res) => {
  const { title, description, bannerImage, startTime, endTime, products } = req.body;

  if (new Date(startTime) >= new Date(endTime)) {
    return res.status(400).json({ success: false, message: 'Thời gian bắt đầu phải trước thời gian kết thúc' });
  }

  const enrichedProducts = [];
  for (const p of products) {
    const product = await Product.findById(p.productId);
    if (!product) continue;
    enrichedProducts.push({
      productId: p.productId,
      flashPrice: p.flashPrice,
      originalPrice: product.salePrice || product.price,
      flashStock: p.flashStock || 50,
      soldCount: 0
    });
  }

  const sale = await FlashSale.create({
    title, description, bannerImage, startTime, endTime,
    products: enrichedProducts,
    createdBy: req.user._id
  });

  logger.info(`Flash sale created: ${sale.title} by admin ${req.user.email}`);
  res.status(201).json({ success: true, message: 'Tạo flash sale thành công', data: sale });
});

/**
 * @desc    Admin: Update flash sale
 * @route   PUT /api/admin/flash-sales/:id
 * @access  Private (Admin)
 */
export const updateFlashSale = asyncHandler(async (req, res) => {
  const sale = await FlashSale.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!sale) return res.status(404).json({ success: false, message: 'Flash sale không tồn tại' });
  res.json({ success: true, message: 'Cập nhật thành công', data: sale });
});

/**
 * @desc    Admin: Delete flash sale
 * @route   DELETE /api/admin/flash-sales/:id
 * @access  Private (Admin)
 */
export const deleteFlashSale = asyncHandler(async (req, res) => {
  const sale = await FlashSale.findByIdAndDelete(req.params.id);
  if (!sale) return res.status(404).json({ success: false, message: 'Flash sale không tồn tại' });
  logger.info(`Flash sale deleted: ${sale.title} by admin ${req.user.email}`);
  res.json({ success: true, message: 'Xóa flash sale thành công' });
});

/**
 * @desc    Admin: Get all flash sales
 * @route   GET /api/admin/flash-sales
 * @access  Private (Admin)
 */
export const getAdminFlashSales = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [sales, total] = await Promise.all([
    FlashSale.find().sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit))
      .populate('products.productId', 'title images').lean(),
    FlashSale.countDocuments()
  ]);

  res.json({
    success: true,
    data: { sales, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } }
  });
});

export default { getFlashSales, getFlashSaleById, createFlashSale, updateFlashSale, deleteFlashSale, getAdminFlashSales };
