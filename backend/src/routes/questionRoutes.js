import express from 'express';
import { authenticate, optionalAuth } from '../middlewares/auth.js';
import { getProductQuestions, askQuestion, answerQuestion } from '../controllers/questionController.js';

const router = express.Router();

router.get('/product/:productId', getProductQuestions);
router.post('/product/:productId', authenticate, askQuestion);
router.post('/:questionId/answer', authenticate, answerQuestion);

export default router;
