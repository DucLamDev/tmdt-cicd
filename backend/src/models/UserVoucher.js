import mongoose from 'mongoose';

const userVoucherSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  rewardId: { type: mongoose.Schema.Types.ObjectId, ref: 'VoucherReward' },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  discountValue: { type: Number, required: true, min: 0 },
  minOrderValue: { type: Number, default: 0 },
  status: { type: String, enum: ['available', 'used', 'expired'], default: 'available', index: true },
  source: { type: String, enum: ['lucky_wheel', 'daily_checkin', 'admin'], default: 'lucky_wheel' },
  expiresAt: { type: Date, required: true, index: true },
  usedAt: Date,
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }
}, { timestamps: true });

userVoucherSchema.index({ userId: 1, status: 1, expiresAt: 1 });

const UserVoucher = mongoose.model('UserVoucher', userVoucherSchema);

export default UserVoucher;
