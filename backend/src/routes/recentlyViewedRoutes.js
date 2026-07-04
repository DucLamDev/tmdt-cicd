import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { addRecentlyViewed, listRecentlyViewed } from '../controllers/recentlyViewedController.js';

const router = express.Router();

router.use(authenticate);
router.get('/', listRecentlyViewed);
router.post('/', addRecentlyViewed);

export default router;
