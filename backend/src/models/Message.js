import mongoose from 'mongoose';

const replySchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true
  },
  repliedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  repliedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const messageSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    index: true
  },
  recipientRole: {
    type: String,
    enum: ['seller', 'admin'],
    default: 'seller',
    index: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  type: {
    type: String,
    enum: ['question', 'complaint', 'general', 'product_inquiry'],
    default: 'question'
  },
  status: {
    type: String,
    enum: ['pending', 'replied', 'resolved', 'closed'],
    default: 'pending'
  },
  replies: [replySchema],
  attachments: [{
    url: String,
    type: String,
    filename: String
  }],
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date
}, {
  timestamps: true
});

// Indexes
messageSchema.index({ customerId: 1, createdAt: -1 });
messageSchema.index({ sellerId: 1, status: 1, createdAt: -1 });
messageSchema.index({ productId: 1 });
messageSchema.index({ status: 1 });

// Virtual for total replies
messageSchema.virtual('replyCount').get(function() {
  return this.replies.length;
});

// Method to mark as read
messageSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

const Message = mongoose.model('Message', messageSchema);

export default Message;
