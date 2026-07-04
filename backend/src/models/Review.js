import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: 1,
    max: 5
  },
  title: {
    type: String,
    trim: true,
    maxlength: 200
  },
  text: {
    type: String,
    required: [true, 'Review text is required'],
    maxlength: 2000
  },
  images: [{
    type: String
  }],
  
  // Moderation
  isApproved: {
    type: Boolean,
    default: true
  },
  isVerifiedPurchase: {
    type: Boolean,
    default: false
  },
  
  // Helpful votes
  helpfulCount: {
    type: Number,
    default: 0
  },
  
  // Seller response
  sellerResponse: {
    text: String,
    respondedAt: Date
  }
}, {
  timestamps: true
});

// Indexes
reviewSchema.index({ productId: 1, createdAt: -1 });
reviewSchema.index({ userId: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ isApproved: 1 });

// Ensure one review per user per product
reviewSchema.index({ userId: 1, productId: 1 }, { unique: true });

const refreshProductAndShopRating = async (productId) => {
  const Product = mongoose.model('Product');
  const Review = mongoose.model('Review');
  const Shop = mongoose.model('Shop');
  
  const stats = await Review.aggregate([
    { $match: { productId, isApproved: true } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 }
      }
    }
  ]);
  
  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      ratingAvg: Math.round(stats[0].avgRating * 10) / 10,
      reviewCount: stats[0].count
    });
  } else {
    await Product.findByIdAndUpdate(productId, {
      ratingAvg: 0,
      reviewCount: 0
    });
  }

  const product = await Product.findById(productId).select('sellerId').lean();
  if (!product?.sellerId) return;

  const shopStats = await Review.aggregate([
    { $match: { isApproved: true } },
    {
      $lookup: {
        from: 'products',
        localField: 'productId',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: '$product' },
    { $match: { 'product.sellerId': product.sellerId } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 }
        }
      }
  ]);

  await Shop.findByIdAndUpdate(product.sellerId, {
    ratingAvg: shopStats.length ? Math.round(shopStats[0].avgRating * 10) / 10 : 0,
    ratingCount: shopStats[0]?.count || 0,
    'stats.totalReviews': shopStats[0]?.count || 0
  });
};

// Update product and shop rating after review
reviewSchema.post('save', async function() {
  await refreshProductAndShopRating(this.productId);
});

// Update product and shop rating after deletion
reviewSchema.post('findOneAndDelete', async function(doc) {
  if (doc) await refreshProductAndShopRating(doc.productId);
});

reviewSchema.post('deleteOne', { document: true, query: false }, async function() {
  await refreshProductAndShopRating(this.productId);
});

const Review = mongoose.model('Review', reviewSchema);

export default Review;
