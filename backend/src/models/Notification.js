import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  type: {
    type: String,
    enum: ['order', 'promotion', 'message', 'system', 'payment'],
    default: 'system'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  // Optional link to navigate to when clicked
  actionUrl: {
    type: String,
    default: null
  },
  // Reference to related entity
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  referenceModel: {
    type: String,
    enum: ['Order', 'Product', 'Message', 'Coupon', 'Review', 'ShipperReview', null],
    default: null
  },
  // Metadata for extra data
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for performance
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 }); // Auto-delete after 90 days

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
