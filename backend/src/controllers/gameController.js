import crypto from 'crypto';
import VoucherReward from '../models/VoucherReward.js';
import UserVoucher from '../models/UserVoucher.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const DAILY_PLAY_LIMIT = 1;

const seedRewards = async () => {
  const count = await VoucherReward.countDocuments();
  if (count > 0) return;

  await VoucherReward.create([
    { name: 'Giảm 5%', codePrefix: 'WHEEL5', discountType: 'percentage', discountValue: 5, minOrderValue: 100000, weight: 50 },
    { name: 'Giảm 20K', codePrefix: 'WHEEL20K', discountType: 'fixed', discountValue: 20000, minOrderValue: 200000, weight: 35 },
    { name: 'Giảm 50K', codePrefix: 'WHEEL50K', discountType: 'fixed', discountValue: 50000, minOrderValue: 500000, weight: 15 }
  ]);
};

const pickWeighted = (rewards) => {
  const totalWeight = rewards.reduce((sum, reward) => sum + reward.weight, 0);
  let cursor = Math.random() * totalWeight;
  for (const reward of rewards) {
    cursor -= reward.weight;
    if (cursor <= 0) return reward;
  }
  return rewards[0];
};

export const getLuckyWheelRewards = asyncHandler(async (req, res) => {
  await seedRewards();
  const rewards = await VoucherReward.find({ isActive: true })
    .sort({ weight: -1, discountValue: 1 })
    .lean();

  res.json({ success: true, data: rewards });
});

export const playLuckyWheel = asyncHandler(async (req, res) => {
  await seedRewards();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const playsToday = await UserVoucher.countDocuments({
    userId: req.user._id,
    source: 'lucky_wheel',
    createdAt: { $gte: startOfDay }
  });

  if (playsToday >= DAILY_PLAY_LIMIT) {
    return res.status(429).json({ success: false, message: 'Bạn đã dùng hết lượt quay hôm nay' });
  }

  const rewards = await VoucherReward.find({ isActive: true })
    .sort({ weight: -1, discountValue: 1 })
    .lean();
  const reward = pickWeighted(rewards);
  const rewardIndex = rewards.findIndex((item) => item._id.toString() === reward._id.toString());
  const expiresAt = new Date(Date.now() + reward.validDays * 24 * 60 * 60 * 1000);
  const code = `${reward.codePrefix}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  const voucher = await UserVoucher.create({
    userId: req.user._id,
    rewardId: reward._id,
    code,
    discountType: reward.discountType,
    discountValue: reward.discountValue,
    minOrderValue: reward.minOrderValue,
    expiresAt,
    source: 'lucky_wheel'
  });

  res.status(201).json({
    success: true,
    message: 'Bạn đã nhận voucher',
    data: {
      ...voucher.toObject(),
      reward,
      rewardIndex,
      totalRewards: rewards.length
    }
  });
});

export const getMyVouchers = asyncHandler(async (req, res) => {
  await UserVoucher.updateMany(
    { userId: req.user._id, status: 'available', expiresAt: { $lt: new Date() } },
    { $set: { status: 'expired' } }
  );
  const vouchers = await UserVoucher.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: vouchers });
});

export default { getLuckyWheelRewards, playLuckyWheel, getMyVouchers };
