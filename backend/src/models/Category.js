import mongoose from 'mongoose';
import slugify from 'slugify';

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    maxlength: 100
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  icon: {
    type: String,
    default: null
  },
  image: {
    type: String,
    default: null
  },
  description: {
    type: String,
    maxlength: 500
  },
  level: {
    type: Number,
    default: 0
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  productCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

categorySchema.index({ slug: 1 });
categorySchema.index({ parentId: 1 });
categorySchema.index({ level: 1, order: 1 });
categorySchema.index({ isActive: 1 });

categorySchema.virtual('children', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentId'
});

categorySchema.pre('save', async function(next) {
  if (this.isModified('name')) {
    let slug = slugify(this.name, { lower: true, strict: true, locale: 'vi' });
    const slugRegEx = new RegExp(`^${slug}(-[0-9]+)?$`, 'i');
    const existing = await this.constructor.find({ slug: slugRegEx, _id: { $ne: this._id } });
    if (existing.length > 0) {
      slug = `${slug}-${existing.length + 1}`;
    }
    this.slug = slug;
  }

  if (this.isModified('parentId')) {
    if (this.parentId) {
      const parent = await this.constructor.findById(this.parentId);
      this.level = parent ? parent.level + 1 : 0;
    } else {
      this.level = 0;
    }
  }
  next();
});

const Category = mongoose.model('Category', categorySchema);
export default Category;
