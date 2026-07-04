import express from 'express';
import * as reviewController from '../controllers/reviewController.js';
import { authenticate, authorize, optionalAuth } from '../middlewares/auth.js';

const router = express.Router();

// Public routes
router.get('/product/:productId', reviewController.getProductReviews);

// Protected routes
router.get('/product/:productId/can-review', authenticate, reviewController.canReviewProduct);
router.post('/', authenticate, reviewController.createReview);
router.put('/:id', authenticate, reviewController.updateReview);
router.delete('/:id', authenticate, reviewController.deleteReview);
router.post('/:id/helpful', authenticate, reviewController.markHelpful);

// Seller routes
router.post('/:id/respond', authenticate, authorize('seller'), reviewController.respondToReview);

export default router;
