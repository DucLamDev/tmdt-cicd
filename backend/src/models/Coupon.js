import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: 500
  },
  
  // Discount
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0
  },
  maxDiscount: {
    type: Number, // Maximum discount amount for percentage type
    min: 0
  },
  
  // Conditions
  minOrderValue: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Usage limits
  usageLimit: {
    type: Number, // Total times this coupon can be used
    min: 0
  },
  usageLimitPerUser: {
    type: Number,
    default: 1,
    min: 1
  },
  usedCount: {
    type: Number,
    default: 0
  },
  
  // Validity
  validFrom: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date,
    required: true
  },
  
  // Applicable to
  applicableTo: {
    type: String,
    enum: ['all', 'specific_products', 'specific_categories', 'specific_sellers'],
    default: 'all'
  },
  applicableProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  applicableCategories: [String],
  applicableSellers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop'
  }],
  
  // Creator
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
couponSchema.index({ code: 1 });
couponSchema.index({ validFrom: 1, validUntil: 1 });
couponSchema.index({ isActive: 1 });

// Virtual to check if coupon is valid
couponSchema.virtual('isValid').get(function() {
  const now = new Date();
  return (
    this.isActive &&
    now >= this.validFrom &&
    now <= this.validUntil &&
    (this.usageLimit === undefined || this.usedCount < this.usageLimit)
  );
});

// Method to validate coupon for order
couponSchema.methods.validateForOrder = function(orderTotal, userId, products) {
  // Check if active
  if (!this.isActive) {
    return { valid: false, message: 'Mã giảm giá không khả dụng' };
  }
  
  // Check validity period
  const now = new Date();
  if (now < this.validFrom || now > this.validUntil) {
    return { valid: false, message: 'Mã giảm giá đã hết hạn' };
  }
  
  // Check usage limit
  if (this.usageLimit && this.usedCount >= this.usageLimit) {
    return { valid: false, message: 'Mã giảm giá đã hết lượt sử dụng' };
  }
  
  // Check minimum order value
  if (orderTotal < this.minOrderValue) {
    return { 
      valid: false, 
      message: `Đơn hàng tối thiểu ${this.minOrderValue.toLocaleString()} VNĐ` 
    };
  }
  
  return { valid: true };
};

// Method to calculate discount
couponSchema.methods.calculateDiscount = function(orderTotal) {
  if (this.discountType === 'percentage') {
    const discount = (orderTotal * this.discountValue) / 100;
    if (this.maxDiscount && discount > this.maxDiscount) {
      return this.maxDiscount;
    }
    return discount;
  } else {
    // Fixed amount
    return Math.min(this.discountValue, orderTotal);
  }
};

const Coupon = mongoose.model('Coupon', couponSchema);

export default Coupon;
