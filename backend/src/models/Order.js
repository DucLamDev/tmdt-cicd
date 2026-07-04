import mongoose from 'mongoose';
import { refreshShopStats } from '../utils/shopStats.js';

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  variantId: mongoose.Schema.Types.ObjectId,
  title: {
    type: String,
    required: true
  },
  image: String,
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  attributes: mongoose.Schema.Types.Mixed // color, size, etc.
}, { _id: true });

const orderSchema = new mongoose.Schema({
  // Order number (unique, human-readable)
  orderNumber: {
    type: String,
    unique: true
    // Will be auto-generated in pre-save hook
  },
  
  // Actors
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true,
    index: true
  },
  shipperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Items
  items: [orderItemSchema],
  
  // Pricing
  totals: {
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    shipping: {
      type: Number,
      default: 0,
      min: 0
    },
    tax: {
      type: Number,
      default: 0,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0
    }
  },
  
  // Shipping Address
  shippingAddress: {
    recipientName: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    street: {
      type: String,
      required: true
    },
    ward: String,
    district: String,
    city: {
      type: String,
      required: true
    },
    provinceCode: String,
    districtCode: String,
    wardCode: String,
    country: {
      type: String,
      default: 'Vietnam'
    },
    postalCode: String
  },
  
  // Payment
  paymentMethod: {
    type: String,
    enum: ['cod', 'stripe', 'bank_transfer', 'momo', 'zalopay', 'vnpay'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentDetails: {
    method: String, // Payment method used (vnpay, stripe, etc)
    transactionId: String,
    paidAt: Date,
    paymentIntentId: String // For Stripe
  },
  
  // Order Status
orderStatus: {
  type: String,
  enum: [
    'PLACED',      // Khách đặt hàng
    'CONFIRMED',   // Seller xác nhận
    'PACKED',      // Đã đóng gói, chờ shipper
    'ASSIGNED',    // Đã giao cho shipper
    'PICKED_UP',   // Shipper đã lấy hàng
    'IN_TRANSIT',  // Đang giao hàng
    'DELIVERED',   // Giao thành công
    'RETURN_REQUESTED',
    'RETURN_APPROVED',
    'RETURN_REJECTED',
    'RETURN_PICKED',
    'RETURN_COMPLETED',
    'CANCELLED',   // Đã hủy
    'FAILED'       // Giao thất bại
  ],
  default: 'PLACED'
},
  
  // Status History
  statusHistory: [{
    status: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // COD (Cash on Delivery)
  codAmount: {
    type: Number,
    default: 0
  },
  codCollected: {
    type: Boolean,
    default: false
  },
  
  // Coupon/Promotion
  couponCode: String,
  
  // Notes
  buyerNote: String,
  sellerNote: String,
  shipperNote: String,
  
  // Tracking
  trackingNumber: String,
  estimatedDelivery: Date,
  actualDelivery: Date,
  
  // Cancellation
  cancellationReason: String,
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ buyerId: 1, createdAt: -1 });
orderSchema.index({ sellerId: 1, createdAt: -1 });
orderSchema.index({ shipperId: 1, orderStatus: 1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });

// Generate unique order number before save
orderSchema.pre('save', async function(next) {
  this.$shouldRefreshShopStats = this.isNew || this.isModified('orderStatus') || this.isModified('totals');
  if (this.isNew && !this.orderNumber) {
    let orderNumber;
    let isUnique = false;
    
    // Generate DH-XXXXX format with random alphanumeric
    while (!isUnique) {
      const randomString = generateRandomString(5);
      orderNumber = `DH-${randomString}`;
      
      // Check if this orderNumber already exists
      const existingOrder = await this.constructor.findOne({ orderNumber });
      if (!existingOrder) {
        isUnique = true;
      }
    }
    
    this.orderNumber = orderNumber;
  }
  next();
});

// Helper function to generate random alphanumeric string
function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Update status history when status changes
orderSchema.pre('save', function(next) {
  if (this.isModified('orderStatus')) {
    this.statusHistory.push({
      status: this.orderStatus,
      timestamp: new Date()
    });
  }
  next();
});

// Update shop stats after order
orderSchema.post('save', async function() {
  if (this.$shouldRefreshShopStats) {
    await refreshShopStats(this.sellerId);
  }
});

const Order = mongoose.model('Order', orderSchema);

export default Order;
