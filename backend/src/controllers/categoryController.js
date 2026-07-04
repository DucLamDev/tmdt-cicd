import Category from '../models/Category.js';
import Product from '../models/Product.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import logger from '../config/logger.js';

const normalizeCategoryKey = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .toLowerCase()
  .trim();

const getCategoryKeys = (category) => {
  const values = [
    category?._id,
    category?.slug,
    category?.name,
    normalizeCategoryKey(category?.slug),
    normalizeCategoryKey(category?.name)
  ].filter(Boolean);
  return [...new Set(values.map(String))];
};

const buildCategoryProductCounters = async () => {
  const [categories, products] = await Promise.all([
    Category.find({ isActive: true }).sort({ level: 1, order: 1 }).lean(),
    Product.find({ isActive: true }).select('categories').lean()
  ]);

  const childrenByParent = new Map();
  categories.forEach((category) => {
    const parentKey = category.parentId ? String(category.parentId) : 'root';
    if (!childrenByParent.has(parentKey)) childrenByParent.set(parentKey, []);
    childrenByParent.get(parentKey).push(category);
  });

  const collectDescendants = (category) => {
    const children = childrenByParent.get(String(category._id)) || [];
    return children.flatMap((child) => [child, ...collectDescendants(child)]);
  };

  const productKeySets = products.map((product) => new Set(
    (product.categories || []).flatMap((categoryValue) => [
      String(categoryValue),
      normalizeCategoryKey(categoryValue)
    ])
  ));

  const resolveProductCount = (category) => {
    const relatedCategories = [category, ...collectDescendants(category)];
    const matchKeys = new Set(relatedCategories.flatMap(getCategoryKeys));
    return productKeySets.reduce((count, productKeys) => {
      for (const key of matchKeys) {
        if (productKeys.has(key)) return count + 1;
      }
      return count;
    }, 0);
  };

  return { categories, resolveProductCount };
};

/**
 * @desc    Get all categories (tree structure)
 * @route   GET /api/categories
 * @access  Public
 */
export const getCategories = asyncHandler(async (req, res) => {
  const { flat } = req.query;
  const { categories, resolveProductCount } = await buildCategoryProductCounters();

  if (flat === 'true') {
    const categoriesWithCounts = categories.map((category) => ({
      ...category,
      productCount: resolveProductCount(category)
    }));
    return res.json({ success: true, data: categoriesWithCounts });
  }

  const rootCategories = categories.filter((category) => !category.parentId);

  const buildTree = (parentId) => {
    return categories
      .filter(c => String(c.parentId) === String(parentId))
      .map(c => ({ ...c, children: buildTree(c._id) }));
  };

  const tree = rootCategories.map(c => ({
    ...c,
    children: buildTree(c._id)
  }));

  const attachProductCount = (nodes) => nodes.map((node) => ({
    ...node,
    productCount: resolveProductCount(node),
    children: Array.isArray(node.children) ? attachProductCount(node.children) : []
  }));

  const treeWithCounts = attachProductCount(tree);

  res.json({ success: true, data: treeWithCounts });
});

/**
 * @desc    Get single category with products
 * @route   GET /api/categories/:slug
 * @access  Public
 */
export const getCategoryBySlug = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ slug: req.params.slug, isActive: true });
  if (!category) {
    return res.status(404).json({ success: false, message: 'Danh mục không tồn tại' });
  }

  const allCategories = await Category.find({ isActive: true }).lean();
  const collectChildren = (parentId) => {
    const children = allCategories.filter((item) => String(item.parentId) === String(parentId));
    return children.flatMap((child) => [child, ...collectChildren(child._id)]);
  };
  const categoryValues = [category, ...collectChildren(category._id)].flatMap(getCategoryKeys);

  const { page = 1, limit = 20, sort = 'newest' } = req.query;
  let sortOption = {};
  switch (sort) {
    case 'price_asc': sortOption = { price: 1 }; break;
    case 'price_desc': sortOption = { price: -1 }; break;
    case 'popular': sortOption = { soldCount: -1 }; break;
    case 'rating': sortOption = { ratingAvg: -1 }; break;
    default: sortOption = { createdAt: -1 };
  }

  const filter = { categories: { $in: categoryValues }, isActive: true, isApproved: true };

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [products, total] = await Promise.all([
    Product.find(filter).sort(sortOption).skip(skip).limit(parseInt(limit))
      .populate('sellerId', 'shopName').lean(),
    Product.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: {
      category,
      products,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    }
  });
});

/**
 * @desc    Create category
 * @route   POST /api/admin/categories
 * @access  Private (Admin)
 */
export const createCategory = asyncHandler(async (req, res) => {
  const category = await Category.create(req.body);
  logger.info(`Category created: ${category.name} by admin ${req.user.email}`);
  res.status(201).json({ success: true, message: 'Tạo danh mục thành công', data: category });
});

/**
 * @desc    Update category
 * @route   PUT /api/admin/categories/:id
 * @access  Private (Admin)
 */
export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!category) {
    return res.status(404).json({ success: false, message: 'Danh mục không tồn tại' });
  }
  logger.info(`Category updated: ${category.name} by admin ${req.user.email}`);
  res.json({ success: true, message: 'Cập nhật danh mục thành công', data: category });
});

/**
 * @desc    Delete category
 * @route   DELETE /api/admin/categories/:id
 * @access  Private (Admin)
 */
export const deleteCategory = asyncHandler(async (req, res) => {
  const children = await Category.countDocuments({ parentId: req.params.id });
  if (children > 0) {
    return res.status(400).json({ success: false, message: 'Không thể xóa danh mục có danh mục con' });
  }
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) {
    return res.status(404).json({ success: false, message: 'Danh mục không tồn tại' });
  }
  logger.info(`Category deleted: ${category.name} by admin ${req.user.email}`);
  res.json({ success: true, message: 'Xóa danh mục thành công' });
});

/**
 * @desc    Reorder categories
 * @route   PATCH /api/admin/categories/reorder
 * @access  Private (Admin)
 */
export const reorderCategories = asyncHandler(async (req, res) => {
  const { orders } = req.body;
  if (!orders || !Array.isArray(orders)) {
    return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
  }
  const updates = orders.map(({ id, order }) =>
    Category.findByIdAndUpdate(id, { order })
  );
  await Promise.all(updates);
  res.json({ success: true, message: 'Sắp xếp danh mục thành công' });
});

export default { getCategories, getCategoryBySlug, createCategory, updateCategory, deleteCategory, reorderCategories };
