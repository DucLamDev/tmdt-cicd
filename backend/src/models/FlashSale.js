import mongoose from 'mongoose';

const flashSaleProductSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  flashPrice: {
    type: Number,
    required: true,
    min: 0
  },
  originalPrice: {
    type: Number,
    required: true
  },
  flashStock: {
    type: Number,
    required: true,
    min: 1
  },
  soldCount: {
    type: Number,
    default: 0
  }
}, { _id: true });

const flashSaleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Flash sale title is required'],
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    maxlength: 1000
  },
  bannerImage: String,
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  products: [flashSaleProductSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

flashSaleSchema.index({ startTime: 1, endTime: 1 });
flashSaleSchema.index({ isActive: 1 });

flashSaleSchema.virtual('isRunning').get(function() {
  const now = new Date();
  return this.isActive && now >= this.startTime && now <= this.endTime;
});

flashSaleSchema.virtual('isUpcoming').get(function() {
  return this.isActive && new Date() < this.startTime;
});

flashSaleSchema.virtual('isExpired').get(function() {
  return new Date() > this.endTime;
});

flashSaleSchema.virtual('discountPercent').get(function() {
  if (!this.products || this.products.length === 0) return 0;
  const avg = this.products.reduce((sum, p) => {
    return sum + Math.round(((p.originalPrice - p.flashPrice) / p.originalPrice) * 100);
  }, 0) / this.products.length;
  return Math.round(avg);
});

const FlashSale = mongoose.model('FlashSale', flashSaleSchema);
export default FlashSale;
