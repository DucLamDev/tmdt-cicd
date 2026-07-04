import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  isSellerAnswer: {
    type: Boolean,
    default: false
  },
  helpfulCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  _id: true
});

const productQuestionSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  question: {
    type: String,
    required: [true, 'Question is required'],
    maxlength: 1000
  },
  answers: [answerSchema],
  isAnswered: {
    type: Boolean,
    default: false
  },
  viewCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

productQuestionSchema.index({ productId: 1, createdAt: -1 });
productQuestionSchema.index({ isAnswered: 1 });

const ProductQuestion = mongoose.model('ProductQuestion', productQuestionSchema);
export default ProductQuestion;
