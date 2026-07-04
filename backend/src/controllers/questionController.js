import ProductQuestion from '../models/ProductQuestion.js';
import Shop from '../models/Shop.js';
import Product from '../models/Product.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import logger from '../config/logger.js';

export const getProductQuestions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const filter = { productId: req.params.productId };
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [questions, total] = await Promise.all([
    ProductQuestion.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit))
      .populate('userId', 'name avatarUrl').populate('answers.userId', 'name avatarUrl').lean(),
    ProductQuestion.countDocuments(filter)
  ]);
  res.json({ success: true, data: { questions, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } } });
});

export const askQuestion = asyncHandler(async (req, res) => {
  const { question } = req.body;
  if (!question?.trim()) return res.status(400).json({ success: false, message: 'Vui lòng nhập câu hỏi' });
  const product = await Product.findById(req.params.productId);
  if (!product) return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });
  const q = await ProductQuestion.create({ productId: req.params.productId, userId: req.user._id, question });
  res.status(201).json({ success: true, message: 'Đã gửi câu hỏi', data: q });
});

export const answerQuestion = asyncHandler(async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ success: false, message: 'Vui lòng nhập câu trả lời' });
  const q = await ProductQuestion.findById(req.params.questionId);
  if (!q) return res.status(404).json({ success: false, message: 'Câu hỏi không tồn tại' });

  const product = await Product.findById(q.productId);
  const shop = product ? await Shop.findOne({ _id: product.sellerId, ownerId: req.user._id }) : null;
  const isSellerAnswer = !!shop;

  q.answers.push({ userId: req.user._id, content, isSellerAnswer });
  q.isAnswered = true;
  await q.save();
  res.json({ success: true, message: 'Đã trả lời', data: q });
});

export default { getProductQuestions, askQuestion, answerQuestion };
