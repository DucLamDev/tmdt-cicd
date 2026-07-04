import mongoose from 'mongoose';

const returnItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  title: { type: String, required: true },
  image: String,
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
  reason: {
    type: String,
    enum: ['defective', 'wrong_item', 'not_as_described', 'damaged', 'wrong_size', 'changed_mind', 'other'],
    required: true
  }
}, { _id: true });

const returnSchema = new mongoose.Schema({
  returnNumber: {
    type: String,
    unique: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
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
  items: [returnItemSchema],
  returnReason: {
    type: String,
    enum: ['defective', 'wrong_item', 'not_as_described', 'damaged', 'wrong_size', 'changed_mind', 'other'],
    required: true
  },
  description: {
    type: String,
    required: [true, 'Mô tả lý do đổi/trả là bắt buộc'],
    maxlength: 2000
  },
  images: [String],
  status: {
    type: String,
    enum: ['RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_REJECTED', 'RETURN_PICKED', 'RETURN_COMPLETED'],
    default: 'RETURN_REQUESTED'
  },
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    note: String,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  refundAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  refundMethod: {
    type: String,
    enum: ['original_payment', 'bank_transfer', 'store_credit'],
    default: 'original_payment'
  },
  refundedAt: Date,
  adminNote: String,
  sellerNote: String,
  trackingNumber: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

returnSchema.index({ returnNumber: 1 });
returnSchema.index({ status: 1 });
returnSchema.index({ createdAt: -1 });

returnSchema.pre('save', async function(next) {
  if (this.isNew && !this.returnNumber) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let isUnique = false;
    while (!isUnique) {
      let str = '';
      for (let i = 0; i < 6; i++) str += chars.charAt(Math.floor(Math.random() * chars.length));
      this.returnNumber = `RT-${str}`;
      const existing = await this.constructor.findOne({ returnNumber: this.returnNumber });
      if (!existing) isUnique = true;
    }
  }
  if (this.isModified('status')) {
    this.statusHistory.push({ status: this.status, timestamp: new Date() });
  }
  next();
});

const Return = mongoose.model('Return', returnSchema);
export default Return;
