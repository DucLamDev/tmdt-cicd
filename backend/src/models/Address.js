import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  label: {
    type: String,
    trim: true,
    maxlength: 80,
    default: 'Địa chỉ'
  },
  recipientName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  provinceCode: {
    type: String,
    trim: true
  },
  district: {
    type: String,
    trim: true
  },
  districtCode: {
    type: String,
    trim: true
  },
  ward: {
    type: String,
    required: true,
    trim: true
  },
  wardCode: {
    type: String,
    trim: true
  },
  street: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255
  },
  postalCode: String,
  country: {
    type: String,
    default: 'Vietnam'
  },
  isDefault: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true
});

addressSchema.index({ userId: 1, isDefault: -1, updatedAt: -1 });

const Address = mongoose.model('Address', addressSchema);

export default Address;
