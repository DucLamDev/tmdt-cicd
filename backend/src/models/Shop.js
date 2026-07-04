import mongoose from 'mongoose';
import slugify from 'slugify';

const shopSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  shopName: {
    type: String,
    required: [true, 'Shop name is required'],
    trim: true,
    maxlength: 100
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  logoUrl: {
    type: String,
    default: null
  },
  bannerUrl: {
    type: String,
    default: null
  },
  description: {
    type: String,
    maxlength: 2000
  },
  address: {
    street: String,
    ward: String,
    wardCode: String,
    district: String,
    districtCode: String,
    city: String,
    provinceCode: String,
    country: { type: String, default: 'Vietnam' }
  },
  phone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  
  // Statistics
  stats: {
    totalProducts: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 }
  },
  
  // Rating
  ratingAvg: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  ratingCount: {
    type: Number,
    default: 0
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  
  // Business info
  businessType: {
    type: String,
    enum: ['individual', 'company'],
    default: 'individual'
  },
  taxId: String,
  
  // Social links
  socialLinks: {
    facebook: String,
    instagram: String,
    twitter: String,
    website: String
  },
  
  // Policies
  policies: {
    returnPolicy: String,
    shippingPolicy: String,
    warrantyPolicy: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
shopSchema.index({ slug: 1 });
shopSchema.index({ ownerId: 1 });
shopSchema.index({ isActive: 1, isVerified: 1 });
shopSchema.index({ ratingAvg: -1 });

// Virtual for products
shopSchema.virtual('products', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'sellerId'
});

// Generate slug before saving
shopSchema.pre('save', async function(next) {
  if (this.isModified('shopName')) {
    let slug = slugify(this.shopName, { lower: true, strict: true });
    
    // Ensure unique slug
    const slugRegEx = new RegExp(`^${slug}(-[0-9]+)?$`, 'i');
    const shopsWithSlug = await this.constructor.find({ slug: slugRegEx });
    
    if (shopsWithSlug.length > 0) {
      slug = `${slug}-${shopsWithSlug.length + 1}`;
    }
    
    this.slug = slug;
  }
  next();
});

const Shop = mongoose.model('Shop', shopSchema);

export default Shop;
