import mongoose from 'mongoose';
import slugify from 'slugify';

const blogPostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: 300
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  excerpt: {
    type: String,
    maxlength: 500
  },
  content: {
    type: String,
    required: [true, 'Content is required']
  },
  coverImage: String,
  category: {
    type: String,
    enum: ['news', 'tutorial', 'review', 'promotion', 'lifestyle', 'other'],
    default: 'news'
  },
  tags: [{ type: String, trim: true }],
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: Date,
  viewCount: {
    type: Number,
    default: 0
  },
  relatedProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  seoTitle: String,
  seoDescription: String,
  seoKeywords: [String]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

blogPostSchema.index({ slug: 1 });
blogPostSchema.index({ category: 1 });
blogPostSchema.index({ isPublished: 1, publishedAt: -1 });
blogPostSchema.index({ tags: 1 });
blogPostSchema.index({ title: 'text', content: 'text' });

blogPostSchema.pre('save', async function(next) {
  if (this.isModified('title')) {
    let slug = slugify(this.title, { lower: true, strict: true, locale: 'vi' });
    const existing = await this.constructor.find({
      slug: new RegExp(`^${slug}(-[0-9]+)?$`, 'i'),
      _id: { $ne: this._id }
    });
    if (existing.length > 0) slug = `${slug}-${Date.now()}`;
    this.slug = slug;
  }
  if (this.isModified('isPublished') && this.isPublished && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

const BlogPost = mongoose.model('BlogPost', blogPostSchema);
export default BlogPost;
