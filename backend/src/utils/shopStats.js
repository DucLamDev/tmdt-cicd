import mongoose from 'mongoose';

export const getShopComputedStats = async (shopId) => {
  const objectId = new mongoose.Types.ObjectId(shopId);
  const modelOrNull = (name) => (mongoose.models[name] ? mongoose.model(name) : null);
  const Order = modelOrNull('Order');
  const Product = modelOrNull('Product');
  const Review = modelOrNull('Review');

  const [productStats, orderStats, reviewStats] = await Promise.all([
    Product ? Product.aggregate([
      { $match: { sellerId: objectId, isActive: true } },
      {
        $group: {
          _id: '$sellerId',
          totalProducts: { $sum: 1 },
          totalSold: { $sum: { $ifNull: ['$soldCount', 0] } }
        }
      }
    ]) : [],
    Order ? Order.aggregate([
      { $match: { sellerId: objectId, orderStatus: { $nin: ['CANCELLED', 'FAILED'] } } },
      {
        $group: {
          _id: '$sellerId',
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: { $ifNull: ['$totals.grandTotal', 0] } }
        }
      }
    ]) : [],
    Review ? Review.aggregate([
      { $match: { isApproved: true } },
      { $lookup: { from: 'products', localField: 'productId', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $match: { 'product.sellerId': objectId } },
      {
        $group: {
          _id: '$product.sellerId',
          ratingAvg: { $avg: '$rating' },
          ratingCount: { $sum: 1 }
        }
      }
    ]) : []
  ]);

  const products = productStats[0] || {};
  const orders = orderStats[0] || {};
  const reviews = reviewStats[0] || {};

  return {
    totalProducts: products.totalProducts || 0,
    totalSold: products.totalSold || 0,
    totalOrders: orders.totalOrders || 0,
    totalRevenue: orders.totalRevenue || 0,
    totalReviews: reviews.ratingCount || 0,
    ratingAvg: Math.round((reviews.ratingAvg || 0) * 10) / 10,
    ratingCount: reviews.ratingCount || 0
  };
};

export const refreshShopStats = async (shopId) => {
  const Shop = mongoose.models.Shop ? mongoose.model('Shop') : null;
  if (!Shop) return getShopComputedStats(shopId);
  const stats = await getShopComputedStats(shopId);
  await Shop.findByIdAndUpdate(shopId, {
    stats: {
      totalProducts: stats.totalProducts,
      totalOrders: stats.totalOrders,
      totalRevenue: stats.totalRevenue,
      totalReviews: stats.totalReviews
    },
    ratingAvg: stats.ratingAvg,
    ratingCount: stats.ratingCount
  });
  return stats;
};
