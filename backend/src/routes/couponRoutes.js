import express from 'express';
import * as couponController from '../controllers/couponController.js';
import { authenticate, authorize, optionalAuth } from '../middlewares/auth.js';
import { validateId } from '../middlewares/validateId.js';

const router = express.Router();

// Public routes
router.post('/validate', optionalAuth, couponController.validateCoupon);
router.get('/available', optionalAuth, couponController.getAvailableCoupons);

// Admin routes
router.use(authenticate, authorize('admin'));

router.post('/', couponController.createCoupon);
router.get('/', couponController.getCoupons);
router.get('/:id', validateId('id'), couponController.getCoupon);
router.put('/:id', validateId('id'), couponController.updateCoupon);
router.delete('/:id', validateId('id'), couponController.deleteCoupon);

export default router;
