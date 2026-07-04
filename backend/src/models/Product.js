import mongoose from 'mongoose';
import slugify from 'slugify';
import { refreshShopStats } from '../utils/shopStats.js';

const variantSchema = new mongoose.Schema({
  name: String, // e.g., "Red - Size M"
  attributes: mongoose.Schema.Types.Mixed, // { color: 'red', size: 'M' }
  sku: String,
  price: Number,
  salePrice: Number,
  stock: { type: Number, default: 0 },
  images: [String]
}, { _id: true });

const productSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Product title is required'],
    trim: true,
    maxlength: 200
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    maxlength: 5000
  },
  shortDescription: {
    type: String,
    maxlength: 500
  },
  
  // Categorization
  categories: [{
    type: String,
    trim: true
  }],
  brand: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  
  // Pricing
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: 0
  },
  salePrice: {
    type: Number,
    min: 0
  },
  costPrice: {
    type: Number,
    min: 0
  },
  
  // Inventory
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  sku: {
    type: String,
    unique: true,
    sparse: true
  },
  
  // Media
  images: [{
    type: String,
    required: true
  }],
  videos: [String],
  
  // Attributes & Variants
  attributes: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  variants: [variantSchema],
  
  // Specifications
  specifications: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Shipping
  shipping: {
    weight: Number, // in grams
    length: Number, // in cm
    width: Number,
    height: Number,
    freeShipping: { type: Boolean, default: false }
  },
  
  // Rating & Reviews
  ratingAvg: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  
  // Sales stats
  viewCount: {
    type: Number,
    default: 0
  },
  soldCount: {
    type: Number,
    default: 0
  },
  favoriteCount: {
    type: Number,
    default: 0
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  
  // SEO
  seoTitle: String,
  seoDescription: String,
  seoKeywords: [String],
  
  // AI Embeddings (for recommendations & image search)
  embeddings: {
    text: [Number], // Text embedding vector
    image: [Number] // Image embedding vector
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
productSchema.index({ title: 'text', description: 'text' });
productSchema.index({ slug: 1 });
productSchema.index({ sellerId: 1, createdAt: -1 });
productSchema.index({ categories: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ price: 1 });
productSchema.index({ ratingAvg: -1 });
productSchema.index({ soldCount: -1 });
productSchema.index({ isActive: 1, isApproved: 1 });
productSchema.index({ 'embeddings.text': 1 });

// Virtual for effective price
productSchema.virtual('effectivePrice').get(function() {
  return this.salePrice || this.price;
});

// Virtual for discount percentage
productSchema.virtual('discountPercent').get(function() {
  if (this.salePrice && this.salePrice < this.price) {
    return Math.round(((this.price - this.salePrice) / this.price) * 100);
  }
  return 0;
});

// Virtual for in stock status
productSchema.virtual('inStock').get(function() {
  if (this.variants && this.variants.length > 0) {
    return this.variants.some(v => v.stock > 0);
  }
  return this.stock > 0;
});

// Generate slug before saving
productSchema.pre('save', async function(next) {
  this.$shouldRefreshShopStats = this.isNew || this.isModified('isActive') || this.isModified('sellerId');
  if (this.isModified('title')) {
    let slug = slugify(this.title, { lower: true, strict: true });
    
    // Ensure unique slug
    const slugRegEx = new RegExp(`^${slug}(-[0-9]+)?$`, 'i');
    const productsWithSlug = await this.constructor.find({ slug: slugRegEx });
    
    if (productsWithSlug.length > 0) {
      slug = `${slug}-${Date.now()}`;
    }
    
    this.slug = slug;
  }
  next();
});

// Update shop stats after save
productSchema.post('save', async function() {
  if (this.$shouldRefreshShopStats) {
    await refreshShopStats(this.sellerId);
  }
});

productSchema.post('deleteOne', { document: true, query: false }, async function() {
  await refreshShopStats(this.sellerId);
});

const Product = mongoose.model('Product', productSchema);

export default Product;
