import BlogPost from '../models/BlogPost.js';
import User from '../models/User.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import logger from '../config/logger.js';
import mongoose from 'mongoose';
import slugify from 'slugify';

const samplePosts = [
  {
    title: 'Cách chọn voucher phù hợp khi mua sắm online',
    excerpt: 'Mẹo đọc điều kiện voucher, đơn tối thiểu và thời hạn để tiết kiệm thật sự khi đặt hàng.',
    content: 'Voucher tốt không chỉ là mã giảm giá trị cao. Khách hàng nên kiểm tra đơn tối thiểu, thời hạn sử dụng, nhóm sản phẩm áp dụng và tổng chi phí sau phí vận chuyển. Khi thanh toán, hãy ưu tiên voucher có mức giảm phù hợp với giá trị giỏ hàng thay vì chỉ nhìn vào phần trăm.',
    category: 'tutorial',
    tags: ['voucher', 'mua sắm', 'tiết kiệm']
  },
  {
    title: 'Kinh nghiệm mua hàng thời trang đúng size',
    excerpt: 'Hướng dẫn đo size, xem chất liệu và trao đổi với shop trước khi đặt hàng.',
    content: 'Với thời trang online, bạn nên xem bảng size, so sánh với số đo cơ thể và đọc review có ảnh thật. Nếu sản phẩm có tính năng thử đồ ảo, hãy dùng ảnh rõ sáng và đúng tư thế để kết quả dễ tham khảo hơn. Trước khi mua, có thể nhắn tin cho shop để hỏi thêm về form rộng, form ôm và chất liệu.',
    category: 'lifestyle',
    tags: ['thời trang', 'size', 'review']
  },
  {
    title: 'Quy trình đổi trả và hoàn tiền trên marketplace',
    excerpt: 'Giải thích các bước gửi yêu cầu, shop duyệt, shipper lấy hàng và admin xác nhận hoàn tiền.',
    content: 'Khi cần đổi trả, khách hàng tạo yêu cầu kèm lý do và hình ảnh nếu có. Shop sẽ kiểm tra và duyệt hoặc từ chối. Nếu được duyệt, hàng được gửi về shop, sau đó admin xác nhận số tiền hoàn. Thanh toán online được đối soát theo cổng thanh toán, còn COD cần được hoàn theo quy trình kế toán và ghi chú rõ ràng.',
    category: 'tutorial',
    tags: ['đổi trả', 'hoàn tiền', 'đơn hàng']
  },
  {
    title: 'Bí quyết đánh giá sản phẩm hữu ích cho người mua sau',
    excerpt: 'Đánh giá tốt nên có sao, cảm nhận thực tế, ảnh sản phẩm và thông tin giao hàng.',
    content: 'Một đánh giá hữu ích nên nói rõ sản phẩm có đúng mô tả không, kích thước và chất liệu ra sao, đóng gói có cẩn thận không và trải nghiệm giao hàng như thế nào. Đánh giá công bằng giúp shop cải thiện dịch vụ và giúp người mua sau ra quyết định nhanh hơn.',
    category: 'tutorial',
    tags: ['đánh giá', 'sản phẩm', 'shop']
  }
];

const buildUniqueSlug = async (title, postId) => {
  const baseSlug = slugify(title || 'bai-viet', { lower: true, strict: true, locale: 'vi' }) || 'bai-viet';
  let slug = baseSlug;
  let suffix = 2;

  while (await BlogPost.exists({ slug, _id: { $ne: postId } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
};

const ensurePublishedPostSlugs = async () => {
  const postsWithoutSlug = await BlogPost.find({
    isPublished: true,
    $or: [{ slug: { $exists: false } }, { slug: null }, { slug: '' }]
  }).select('_id title slug');

  for (const post of postsWithoutSlug) {
    post.slug = await buildUniqueSlug(post.title, post._id);
    await post.save();
  }
};

const ensureSamplePosts = async () => {
  const count = await BlogPost.countDocuments({ isPublished: true });
  if (count > 0) {
    await ensurePublishedPostSlugs();
    return;
  }

  const author = await User.findOne({ roles: 'admin' }).select('_id').lean()
    || await User.findOne().select('_id').lean();
  if (!author?._id) return;

  for (const post of samplePosts) {
    await BlogPost.create({
      ...post,
      authorId: author._id,
      isPublished: true,
      publishedAt: new Date()
    });
  }
  await ensurePublishedPostSlugs();
};

export const getPosts = asyncHandler(async (req, res) => {
  await ensureSamplePosts();
  const { page = 1, limit = 12, category, tag, search } = req.query;
  const filter = { isPublished: true };
  if (category) filter.category = category;
  if (tag) filter.tags = tag;
  if (search) filter.$text = { $search: search };
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [posts, total] = await Promise.all([
    BlogPost.find(filter).sort({ publishedAt: -1 }).skip(skip).limit(parseInt(limit))
      .populate('authorId', 'name avatarUrl').select('-content').lean(),
    BlogPost.countDocuments(filter)
  ]);
  res.json({ success: true, data: { posts, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } } });
});

export const getPostBySlug = asyncHandler(async (req, res) => {
  await ensureSamplePosts();
  const idOrSlug = decodeURIComponent(req.params.slug || '');
  const filter = mongoose.Types.ObjectId.isValid(idOrSlug)
    ? { _id: idOrSlug, isPublished: true }
    : { slug: idOrSlug, isPublished: true };

  const post = await BlogPost.findOneAndUpdate(filter, { $inc: { viewCount: 1 } }, { new: true })
    .populate('authorId', 'name avatarUrl').populate('relatedProducts', 'title slug images price salePrice');
  if (!post) return res.status(404).json({ success: false, message: 'Bài viết không tồn tại' });
  res.json({ success: true, data: post });
});

export const createPost = asyncHandler(async (req, res) => {
  const post = await BlogPost.create({ ...req.body, authorId: req.user._id });
  logger.info(`Blog post created: ${post.title} by ${req.user.email}`);
  res.status(201).json({ success: true, message: 'Tạo bài viết thành công', data: post });
});

export const updatePost = asyncHandler(async (req, res) => {
  const post = await BlogPost.findById(req.params.id);
  if (!post) return res.status(404).json({ success: false, message: 'Bài viết không tồn tại' });
  Object.assign(post, req.body);
  await post.save();
  res.json({ success: true, message: 'Cập nhật thành công', data: post });
});

export const deletePost = asyncHandler(async (req, res) => {
  const post = await BlogPost.findByIdAndDelete(req.params.id);
  if (!post) return res.status(404).json({ success: false, message: 'Không tồn tại' });
  res.json({ success: true, message: 'Xóa thành công' });
});

export const getAdminPosts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, isPublished } = req.query;
  const filter = {};
  if (isPublished !== undefined) filter.isPublished = isPublished === 'true';
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [posts, total] = await Promise.all([
    BlogPost.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).populate('authorId', 'name').lean(),
    BlogPost.countDocuments(filter)
  ]);
  res.json({ success: true, data: { posts, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } } });
});

export default { getPosts, getPostBySlug, createPost, updatePost, deletePost, getAdminPosts };
