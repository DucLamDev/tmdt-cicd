import Product from '../models/Product.js';
import Shop from '../models/Shop.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import logger from '../config/logger.js';
import { assertCleanContent } from '../utils/moderation.js';

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * @desc    Get all products with filters and pagination
 * @route   GET /api/products
 * @access  Public
 */
export const getProducts = asyncHandler(async (req, res) => {
  const {
    query, category, brand, minPrice, maxPrice, sort = '-createdAt',
    page = 1, limit = 20, sellerId, rating, inStock, tags
  } = req.query;

  const filter = { isActive: true, isApproved: true };
  if (query?.trim()) {
    const keywordRegex = new RegExp(escapeRegex(query.trim()), 'i');
    filter.$or = [
      { title: keywordRegex },
      { description: keywordRegex },
      { shortDescription: keywordRegex },
      { categories: keywordRegex },
      { tags: keywordRegex },
      { brand: keywordRegex }
    ];
  }
  if (category) filter.categories = category;
  if (brand) filter.brand = { $regex: brand, $options: 'i' };
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = parseFloat(minPrice);
    if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
  }
  if (sellerId) filter.sellerId = sellerId;
  if (rating) filter.ratingAvg = { $gte: parseFloat(rating) };
  if (inStock === 'true') filter.stock = { $gt: 0 };
  if (tags) filter.tags = { $in: tags.split(',') };

  let sortOption = {};
  switch (sort) {
    case 'price_asc': sortOption = { price: 1 }; break;
    case 'price_desc': sortOption = { price: -1 }; break;
    case 'rating': sortOption = { ratingAvg: -1 }; break;
    case 'popular': sortOption = { soldCount: -1 }; break;
    case 'newest': sortOption = { createdAt: -1 }; break;
    default: sortOption = { createdAt: -1 };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [products, total, brands, categories] = await Promise.all([
    Product.find(filter).sort(sortOption).skip(skip).limit(parseInt(limit))
      .populate('sellerId', 'shopName logoUrl ratingAvg').lean(),
    Product.countDocuments(filter),
    Product.distinct('brand', { isActive: true, isApproved: true, brand: { $ne: null } }),
    Product.distinct('categories', { isActive: true, isApproved: true })
  ]);

  const priceRange = await Product.aggregate([
    { $match: { isActive: true, isApproved: true } },
    { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } }
  ]);

  res.json({
    success: true,
    data: {
      products,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
      filters: {
        brands, categories,
        priceRange: priceRange[0] || { min: 0, max: 100000000 }
      }
    }
  });
});

/**
 * @desc    Compare products
 * @route   GET /api/products/compare
 * @access  Public
 */
export const compareProducts = asyncHandler(async (req, res) => {
  const { ids } = req.query;
  if (!ids) return res.status(400).json({ success: false, message: 'Vui lòng cung cấp ID sản phẩm' });
  const idArray = ids.split(',').slice(0, 4);
  const products = await Product.find({ _id: { $in: idArray }, isActive: true })
    .populate('sellerId', 'shopName logoUrl').lean();
  res.json({ success: true, data: products });
});

/**
 * @desc    Get similar products
 * @route   GET /api/products/:id/similar
 * @access  Public
 */
export const getSimilarProducts = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });
  const similar = await Product.find({
    _id: { $ne: product._id },
    isActive: true, isApproved: true,
    $or: [
      { categories: { $in: product.categories || [] } },
      { brand: product.brand }
    ]
  }).sort({ ratingAvg: -1, soldCount: -1 }).limit(8)
    .select('title slug images price salePrice ratingAvg reviewCount').lean();
  res.json({ success: true, data: similar });
});

/**
 * @desc    Get single product by ID or slug
 * @route   GET /api/products/:idOrSlug
 * @access  Public
 */
export const getProduct = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;

  // Try to find by ID first, then by slug
  let product = await Product.findById(idOrSlug)
    .populate('sellerId', 'shopName slug logoUrl ratingAvg ratingCount stats address phone email')
    .catch(() => null);

  if (!product) {
    product = await Product.findOne({ slug: idOrSlug })
      .populate('sellerId', 'shopName slug logoUrl ratingAvg ratingCount stats address phone email');
  }

  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy sản phẩm'
    });
  }

  // Increment view count
  product.viewCount += 1;
  await product.save();

  res.json({
    success: true,
    data: product
  });
});

/**
 * @desc    Create new product
 * @route   POST /api/seller/products
 * @access  Private (Seller)
 */
export const createProduct = asyncHandler(async (req, res) => {
  assertCleanContent({
    title: req.body.title,
    description: req.body.description,
    shortDescription: req.body.shortDescription,
    tags: Array.isArray(req.body.tags) ? req.body.tags.join(' ') : req.body.tags
  });

  // Get seller's shop
  const shop = await Shop.findOne({ ownerId: req.user._id });
  
  if (!shop) {
    return res.status(404).json({
      success: false,
      message: 'Bạn chưa tạo shop. Vui lòng tạo shop trước'
    });
  }

  // Create product
  const product = await Product.create({
    ...req.body,
    sellerId: shop._id
  });

  logger.info(`Product created: ${product.title} by seller ${req.user.email}`);

  res.status(201).json({
    success: true,
    message: 'Tạo sản phẩm thành công',
    data: product
  });
});

/**
 * @desc    Update product
 * @route   PUT /api/seller/products/:id
 * @access  Private (Seller)
 */
export const updateProduct = asyncHandler(async (req, res) => {
  assertCleanContent({
    title: req.body.title,
    description: req.body.description,
    shortDescription: req.body.shortDescription,
    tags: Array.isArray(req.body.tags) ? req.body.tags.join(' ') : req.body.tags
  });

  let product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy sản phẩm'
    });
  }

  // Check ownership
  const shop = await Shop.findOne({ ownerId: req.user._id });
  if (!shop || product.sellerId.toString() !== shop._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền cập nhật sản phẩm này'
    });
  }

  // Update product
  product = await Product.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  logger.info(`Product updated: ${product.title} by seller ${req.user.email}`);

  res.json({
    success: true,
    message: 'Cập nhật sản phẩm thành công',
    data: product
  });
});

/**
 * @desc    Delete product
 * @route   DELETE /api/seller/products/:id
 * @access  Private (Seller)
 */
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy sản phẩm'
    });
  }

  // Check ownership
  const shop = await Shop.findOne({ ownerId: req.user._id });
  if (!shop || product.sellerId.toString() !== shop._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền xóa sản phẩm này'
    });
  }

  // Soft delete by setting isActive to false
  product.isActive = false;
  await product.save();

  logger.info(`Product deleted: ${product.title} by seller ${req.user.email}`);

  res.json({
    success: true,
    message: 'Xóa sản phẩm thành công'
  });
});

/**
 * @desc    Get single seller's product
 * @route   GET /api/seller/products/:id
 * @access  Private (Seller)
 */
export const getSellerProduct = asyncHandler(async (req, res) => {
  const shop = await Shop.findOne({ ownerId: req.user._id });
  
  if (!shop) {
    return res.status(404).json({
      success: false,
      message: 'Bạn chưa tạo shop'
    });
  }

  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy sản phẩm'
    });
  }

  // Check ownership
  if (product.sellerId.toString() !== shop._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền xem sản phẩm này'
    });
  }

  res.json({
    success: true,
    data: product
  });
});

/**
 * @desc    Get seller's products
 * @route   GET /api/seller/products
 * @access  Private (Seller)
 */
export const getSellerProducts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;

  const shop = await Shop.findOne({ ownerId: req.user._id });
  
  if (!shop) {
    return res.status(404).json({
      success: false,
      message: 'Bạn chưa tạo shop'
    });
  }

  const filter = { sellerId: shop._id };
  
  if (status) {
    if (status === 'active') {
      filter.isActive = true;
    } else if (status === 'inactive') {
      filter.isActive = false;
    }
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  try {
    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Product.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error(`Error fetching seller products: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tải danh sách sản phẩm',
      error: error.message
    });
  }
});

/**
 * @desc    Get product categories
 * @route   GET /api/products/categories
 * @access  Public
 */
export const getCategories = asyncHandler(async (req, res) => {
  const categories = await Product.distinct('categories', {
    isActive: true,
    isApproved: true
  });

  res.json({
    success: true,
    data: categories
  });
});

/**
 * @desc    Get product brands
 * @route   GET /api/products/brands
 * @access  Public
 */
export const getBrands = asyncHandler(async (req, res) => {
  const brands = await Product.distinct('brand', {
    isActive: true,
    isApproved: true,
    brand: { $ne: null }
  });

  res.json({
    success: true,
    data: brands
  });
});

export default {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getSellerProduct,
  getSellerProducts,
  getCategories,
  getBrands,
  compareProducts,
  getSimilarProducts
};
