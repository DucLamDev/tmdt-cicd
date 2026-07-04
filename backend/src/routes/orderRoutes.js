import express from 'express';
import * as orderController from '../controllers/orderController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validateId } from '../middlewares/validateId.js';

const router = express.Router();

// Customer routes - any authenticated user can place orders
router.post('/', authenticate, orderController.createOrder);
router.get('/', authenticate, orderController.getUserOrders);
router.get('/:id', authenticate, validateId('id'), orderController.getOrder);
router.patch('/:id/cancel', authenticate, validateId('id'), orderController.cancelOrder);

export default router;
