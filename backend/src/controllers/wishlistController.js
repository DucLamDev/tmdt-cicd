import Wishlist from '../models/Wishlist.js';
import Product from '../models/Product.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

/**
 * @desc    Get user's wishlist
 * @route   GET /api/wishlist
 * @access  Private
 */
export const getWishlist = asyncHandler(async (req, res) => {
  let wishlist = await Wishlist.findOne({ userId: req.user._id })
    .populate({
      path: 'products.productId',
      select: 'title slug images price salePrice stock isActive'
    })
    .lean();

  if (!wishlist) {
    wishlist = { products: [] };
  }

  // Filter out deleted products
  if (wishlist.products) {
    wishlist.products = wishlist.products.filter(item => item.productId);
  }

  res.json({
    success: true,
    data: wishlist
  });
});

/**
 * @desc    Add product to wishlist
 * @route   POST /api/wishlist
 * @access  Private
 */
export const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;

  // Check if product exists
  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy sản phẩm'
    });
  }

  let wishlist = await Wishlist.findOne({ userId: req.user._id });

  if (!wishlist) {
    // Create new wishlist
    wishlist = await Wishlist.create({
      userId: req.user._id,
      products: [{ productId }]
    });
  } else {
    // Check if product already in wishlist
    const exists = wishlist.products.find(
      item => item.productId.toString() === productId
    );

    if (exists) {
      return res.status(400).json({
        success: false,
        message: 'Sản phẩm đã có trong danh sách yêu thích'
      });
    }

    wishlist.products.push({ productId });
    await wishlist.save();
  }

  res.json({
    success: true,
    message: 'Đã thêm vào danh sách yêu thích',
    data: wishlist
  });
});

/**
 * @desc    Remove product from wishlist
 * @route   DELETE /api/wishlist/:productId
 * @access  Private
 */
export const removeFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const wishlist = await Wishlist.findOne({ userId: req.user._id });

  if (!wishlist) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy danh sách yêu thích'
    });
  }

  wishlist.products = wishlist.products.filter(
    item => item.productId.toString() !== productId
  );

  await wishlist.save();

  res.json({
    success: true,
    message: 'Đã xóa khỏi danh sách yêu thích'
  });
});

/**
 * @desc    Clear wishlist
 * @route   DELETE /api/wishlist
 * @access  Private
 */
export const clearWishlist = asyncHandler(async (req, res) => {
  await Wishlist.findOneAndUpdate(
    { userId: req.user._id },
    { products: [] },
    { new: true }
  );

  res.json({
    success: true,
    message: 'Đã xóa toàn bộ danh sách yêu thích'
  });
});

export default {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist
};
