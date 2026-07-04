import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { apiLimiter } from '../middlewares/rateLimiter.js';
import { getLuckyWheelRewards, getMyVouchers, playLuckyWheel } from '../controllers/gameController.js';

const router = express.Router();

router.use(authenticate);
router.get('/lucky-wheel/rewards', getLuckyWheelRewards);
router.post('/lucky-wheel/play', apiLimiter, playLuckyWheel);
router.get('/my-vouchers', getMyVouchers);

export default router;
