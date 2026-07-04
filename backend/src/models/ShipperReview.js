import mongoose from 'mongoose';

const shipperReviewSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
  shipperId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  content: { type: String, trim: true, maxlength: 1000 },
  images: [String]
}, { timestamps: true });

shipperReviewSchema.index({ shipperId: 1, createdAt: -1 });

const ShipperReview = mongoose.model('ShipperReview', shipperReviewSchema);

export default ShipperReview;
