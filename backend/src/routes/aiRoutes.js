import express from 'express';
import * as aiController from '../controllers/aiController.js';
import { authenticate, optionalAuth } from '../middlewares/auth.js';
import { uploadFields, uploadSingle } from '../middlewares/upload.js';

const router = express.Router();

// Recommendations (better with auth for personalization)
router.get('/recommendations', optionalAuth, aiController.getRecommendations);

// Image search
router.post('/search/image', uploadSingle('image'), aiController.searchByImage);

// Voice search
router.post('/search/voice', uploadSingle('audio'), aiController.voiceSearch);

// Virtual try-on
router.post(
  '/tryon',
  authenticate,
  uploadFields([
    { name: 'user_image', maxCount: 1 },
    { name: 'product_image', maxCount: 1 }
  ]),
  aiController.virtualTryOn
);

// Chatbot
router.post('/chat', optionalAuth, aiController.chat);
router.get('/conversations/:sessionId', aiController.getConversation);
router.delete('/conversations/:sessionId', aiController.clearConversation);

export default router;
