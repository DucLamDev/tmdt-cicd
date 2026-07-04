import mongoose from 'mongoose';

const loyaltyTransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['earn', 'redeem', 'expire', 'admin_adjust'],
    required: true
  },
  points: {
    type: Number,
    required: true
  },
  description: String,
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  expiresAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const loyaltyPointSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  totalPoints: {
    type: Number,
    default: 0,
    min: 0
  },
  lifetimePoints: {
    type: Number,
    default: 0,
    min: 0
  },
  tier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
    default: 'bronze'
  },
  transactions: [loyaltyTransactionSchema]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

loyaltyPointSchema.index({ tier: 1 });
loyaltyPointSchema.index({ totalPoints: -1 });

loyaltyPointSchema.methods.addPoints = function(points, description, orderId) {
  this.totalPoints += points;
  this.lifetimePoints += points;
  this.transactions.push({
    type: 'earn',
    points,
    description,
    orderId,
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  });
  this.updateTier();
  return this;
};

loyaltyPointSchema.methods.redeemPoints = function(points, description, orderId) {
  if (this.totalPoints < points) throw new Error('Không đủ điểm');
  this.totalPoints -= points;
  this.transactions.push({
    type: 'redeem',
    points: -points,
    description,
    orderId
  });
  return this;
};

loyaltyPointSchema.methods.updateTier = function() {
  const lp = this.lifetimePoints;
  if (lp >= 50000) this.tier = 'diamond';
  else if (lp >= 20000) this.tier = 'platinum';
  else if (lp >= 10000) this.tier = 'gold';
  else if (lp >= 5000) this.tier = 'silver';
  else this.tier = 'bronze';
};

const LoyaltyPoint = mongoose.model('LoyaltyPoint', loyaltyPointSchema);
export default LoyaltyPoint;
