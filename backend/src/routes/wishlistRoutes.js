import express from 'express';
import * as wishlistController from '../controllers/wishlistController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

// All wishlist routes require authentication
router.use(authenticate);

router.get('/', wishlistController.getWishlist);
router.post('/', wishlistController.addToWishlist);
router.delete('/', wishlistController.clearWishlist);
router.delete('/:productId', wishlistController.removeFromWishlist);

export default router;
