import { asyncHandler } from '../middlewares/errorHandler.js';
import * as aiService from '../services/aiService.js';
import logger from '../config/logger.js';
import Conversation from '../models/Conversation.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * @desc    Get personalized recommendations
 * @route   GET /api/recommendations
 * @access  Public (better if authenticated)
 */
export const getRecommendations = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const { limit = 8 } = req.query;

  const recommendations = await aiService.getRecommendations(userId, parseInt(limit));

  res.json({
    success: true,
    data: recommendations
  });
});

/**
 * @desc    Search products by image
 * @route   POST /api/search/image
 * @access  Public
 */
export const searchByImage = asyncHandler(async (req, res) => {
  // Image should be uploaded via multer middleware
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng upload ảnh'
    });
  }

  const imageUrl = req.file.path;
  const { limit = 8 } = req.query;

  logger.info(`Image search from: ${req.ip}, file: ${imageUrl}`);

  const result = await aiService.searchByImage(imageUrl, parseInt(limit), req.file.mimetype);

  res.json({
    success: true,
    message: 'Tìm kiếm bằng hình ảnh đang trong giai đoạn phát triển',
    message: result.message || 'Đã phân tích ảnh và tìm sản phẩm tương đồng',
    data: {
      products: result.products || [],
      analysis: result.analysis || null
    }
  });
});

/**
 * @desc    Voice search (transcribe and search)
 * @route   POST /api/search/voice
 * @access  Public
 */
export const voiceSearch = asyncHandler(async (req, res) => {
  const { text } = req.body;

  // If text is provided, use it directly
  // If audio file is uploaded, transcribe it first
  let searchQuery = text;

  if (!searchQuery && req.file) {
    try {
      searchQuery = await aiService.transcribeAudio(req.file.buffer);
      logger.info(`Voice transcribed: ${searchQuery}`);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Không thể nhận dạng giọng nói. Vui lòng thử lại hoặc nhập văn bản.'
      });
    }
  }

  if (!searchQuery) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp văn bản hoặc file âm thanh'
    });
  }

  // Perform semantic search
  const products = await aiService.semanticSearch(searchQuery, 8);

  res.json({
    success: true,
    data: {
      query: searchQuery,
      products
    }
  });
});

/**
 * @desc    Virtual try-on
 * @route   POST /api/ai/tryon
 * @access  Private
 */
export const virtualTryOn = asyncHandler(async (req, res) => {
  const userFile = req.files?.user_image?.[0];
  const productFile = req.files?.product_image?.[0];
  const {
    product_name: productName,
    product_category: productCategory,
    product_image_url: productImageUrl,
    tryon_context: tryOnContext
  } = req.body;

  if (userFile && (productFile || productImageUrl)) {
    const result = await aiService.virtualTryOnFiles({
      userFile,
      productFile,
      productImageUrl,
      productName,
      productCategory,
      tryOnContext
    });

    return res.json(result);
  }

  const { userImageUrl, productImageUrl: remoteProductImageUrl } = req.body;

  if (!userImageUrl || !remoteProductImageUrl) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp ảnh người dùng và ảnh sản phẩm'
    });
  }

  const result = await aiService.virtualTryOn(userImageUrl, remoteProductImageUrl);

  res.json({
    success: true,
    data: result
  });
});

/**
 * @desc    Chatbot conversation
 * @route   POST /api/ai/chat
 * @access  Public
 */
export const chat = asyncHandler(async (req, res) => {
  const { message, context, sessionId } = req.body;

  if (!message) {
    return res.status(400).json({
      success: false,
      message: 'Message is required'
    });
  }

  // Get or create session ID
  const currentSessionId = sessionId || uuidv4();

  // Get or create conversation
  let conversation = await Conversation.findOne({ sessionId: currentSessionId });
  
  if (!conversation) {
    conversation = await Conversation.create({
      userId: req.user?._id,
      sessionId: currentSessionId,
      messages: [],
      context: context || {}
    });
  }

  // Add user info to context if authenticated
  const enrichedContext = {
    ...conversation.context,
    ...context,
    userId: req.user?._id,
    userName: req.user?.name
  };

  // Get chatbot response with conversation history
  const response = await aiService.chatbotResponse(
    message, 
    enrichedContext,
    conversation.messages
  );

  // Save messages to conversation
  conversation.messages.push({
    role: 'user',
    content: message
  });

  conversation.messages.push({
    role: 'assistant',
    content: response.message,
    products: response.products || []
  });

  conversation.context = response.context;
  await conversation.save();

  res.json({
    success: true,
    data: {
      message: response.message,
      sessionId: currentSessionId,
      context: response.context,
      products: response.products || []
    }
  });
});

/**
 * @desc    Get conversation history
 * @route   GET /api/ai/conversations/:sessionId
 * @access  Public
 */
export const getConversation = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const conversation = await Conversation.findOne({ sessionId });

  if (!conversation) {
    return res.status(404).json({
      success: false,
      message: 'Conversation not found'
    });
  }

  res.json({
    success: true,
    data: conversation
  });
});

/**
 * @desc    Clear conversation history
 * @route   DELETE /api/ai/conversations/:sessionId
 * @access  Public
 */
export const clearConversation = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  await Conversation.findOneAndUpdate(
    { sessionId },
    { 
      messages: [],
      context: {},
      isActive: false
    }
  );

  res.json({
    success: true,
    message: 'Conversation cleared'
  });
});

/**
 * @desc    Generate embeddings for a product (admin/background job)
 * @route   POST /api/admin/products/:id/embeddings
 * @access  Private (Admin)
 */
export const generateProductEmbeddings = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await aiService.generateProductEmbeddings(id);

  res.json({
    success: true,
    message: 'Product embeddings generated successfully'
  });
});

export const predictAdminTrends = asyncHandler(async (req, res) => {
  const prediction = await aiService.predictAdminTrends({ days: req.query.days });
  res.json({
    success: true,
    data: prediction
  });
});

export const askAdminAI = asyncHandler(async (req, res) => {
  const { question, days } = req.body;

  if (!question || !question.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Question is required'
    });
  }

  const answer = await aiService.askAdminAI({ question, days });
  res.json({
    success: true,
    data: answer
  });
});

export default {
  getRecommendations,
  searchByImage,
  voiceSearch,
  virtualTryOn,
  chat,
  getConversation,
  clearConversation,
  generateProductEmbeddings,
  predictAdminTrends,
  askAdminAI
};
