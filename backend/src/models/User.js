import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const addressSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
    trim: true
  },
  recipientName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  street: {
    type: String,
    required: true,
    trim: true
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
  postalCode: String,
  isDefault: {
    type: Boolean,
    default: false
  }
}, { _id: true });

const warningCounterSchema = new mongoose.Schema({
  count: {
    type: Number,
    default: 0,
    min: 0
  },
  lastAt: Date,
  lastReason: String,
  lastScore: Number
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    trim: true,
    sparse: true
  },
  passwordHash: {
    type: String,
    select: false // Don't return password by default
  },
  roles: [{
    type: String,
    enum: ['customer', 'seller', 'shipper', 'admin'],
    default: ['customer']
  }],
  avatarUrl: {
    type: String,
    default: null
  },
  verified: {
    type: Boolean,
    default: false
  },
  addresses: [addressSchema],
  
  // OAuth fields
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  facebookId: {
    type: String,
    sparse: true,
    unique: true
  },

  // Security
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  lastLogin: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Approval for seller/shipper
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  rejectionReason: String,

  // Admin quality warnings before locking low-rated seller/shipper accounts
  qualityWarnings: {
    seller: {
      type: warningCounterSchema,
      default: () => ({})
    },
    shipper: {
      type: warningCounterSchema,
      default: () => ({})
    }
  },
  
  // Preferences
  preferences: {
    language: {
      type: String,
      default: 'vi'
    },
    currency: {
      type: String,
      default: 'VND'
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ roles: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for user's shop
userSchema.virtual('shop', {
  ref: 'Shop',
  localField: '_id',
  foreignField: 'ownerId',
  justOne: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash if password is modified
  if (!this.isModified('passwordHash')) return next();
  
  if (this.passwordHash) {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  }
  
  next();
});

// Set approval status for new seller/shipper users
userSchema.pre('save', function(next) {
  if (this.isNew) {
    // New users with seller or shipper role need approval
    if (this.roles.includes('seller') || this.roles.includes('shipper')) {
      this.approvalStatus = 'pending';
    } else {
      this.approvalStatus = 'approved';
    }
  }
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.passwordHash) return false;
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Method to check if user has role
userSchema.methods.hasRole = function(role) {
  return this.roles.includes(role);
};

// Method to add role
userSchema.methods.addRole = function(role) {
  if (!this.roles.includes(role)) {
    this.roles.push(role);
  }
};

// Method to remove sensitive data
userSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  delete obj.__v;
  return obj;
};

const User = mongoose.model('User', userSchema);

export default User;
