import mongoose from 'mongoose';

const codTransactionSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  shipperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  collectedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'remitted', 'verified'],
    default: 'pending',
    index: true
  },
  remittedAt: Date,
  verifiedAt: Date,
  note: String,
  remittanceNote: String,
  verificationNote: String,
  
  // Banking details if remitted
  remittanceMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'mobile_wallet'],
    default: 'cash'
  },
  referenceNumber: String, // Transaction reference if bank transfer
  
  // Admin verification
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
codTransactionSchema.index({ shipperId: 1, status: 1, collectedAt: -1 });
codTransactionSchema.index({ orderId: 1 });
codTransactionSchema.index({ collectedAt: -1 });

// Virtual for days pending
codTransactionSchema.virtual('daysPending').get(function() {
  if (this.status === 'pending' && this.collectedAt) {
    const now = new Date();
    const diffTime = Math.abs(now - this.collectedAt);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  return 0;
});

const CODTransaction = mongoose.model('CODTransaction', codTransactionSchema);

export default CODTransaction;
