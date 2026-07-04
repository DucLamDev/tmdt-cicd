import mongoose from 'mongoose';

const voucherRewardSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  codePrefix: { type: String, required: true, uppercase: true, trim: true },
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  discountValue: { type: Number, required: true, min: 0 },
  minOrderValue: { type: Number, default: 0, min: 0 },
  weight: { type: Number, default: 1, min: 1 },
  validDays: { type: Number, default: 14, min: 1 },
  isActive: { type: Boolean, default: true, index: true }
}, { timestamps: true });

const VoucherReward = mongoose.model('VoucherReward', voucherRewardSchema);

export default VoucherReward;
