import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { getMyPoints, getPointsHistory, redeemPoints, getTierBenefits, getRoleScores } from '../controllers/loyaltyController.js';

const router = express.Router();

router.get('/tiers', getTierBenefits);
router.get('/my-points', authenticate, getMyPoints);
router.get('/role-scores', authenticate, getRoleScores);
router.get('/history', authenticate, getPointsHistory);
router.post('/redeem', authenticate, redeemPoints);

export default router;
