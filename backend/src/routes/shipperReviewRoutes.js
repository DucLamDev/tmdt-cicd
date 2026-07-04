import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { createShipperReview, getShipperReviewSummary } from '../controllers/shipperReviewController.js';

const router = express.Router();

router.post('/', authenticate, createShipperReview);
router.get('/shipper/:shipperId/summary', getShipperReviewSummary);

export default router;
