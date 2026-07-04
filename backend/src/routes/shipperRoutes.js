import express from 'express';
import * as orderController from '../controllers/orderController.js';
import * as shipperController from '../controllers/shipperController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validateId } from '../middlewares/validateId.js';
import { markReturnPicked } from '../controllers/returnController.js';

const router = express.Router();

// All shipper routes require authentication and shipper role
router.use(authenticate, authorize('shipper'));

// Dashboard
router.get('/dashboard', shipperController.getDashboardStats);

// Reports
router.get('/reports/export', shipperController.exportDeliveryReport);

// Order management
router.get('/available-orders', shipperController.getAvailableOrders);
router.get('/orders', shipperController.getMyOrders);
router.get('/assignments', orderController.getShipperAssignments);

// Order status updates
router.post('/orders/:id/pickup', validateId('id'), shipperController.pickupOrder); // Accept order (PACKED -> ASSIGNED)
router.patch('/orders/:id/confirm-pickup', validateId('id'), shipperController.confirmPickup); // Confirm pickup (ASSIGNED -> PICKED_UP)
router.patch('/orders/:id/in-transit', validateId('id'), shipperController.updateToInTransit); // Start delivery (PICKED_UP -> IN_TRANSIT)
router.post('/orders/:id/deliver', validateId('id'), shipperController.deliverOrder); // Complete delivery (IN_TRANSIT -> DELIVERED)
router.post('/orders/:id/fail', validateId('id'), shipperController.failDelivery);
router.patch('/orders/:id/status', validateId('id'), orderController.updateShipperStatus);
router.patch('/returns/:id/picked', validateId('id'), markReturnPicked);

// Delivery history
router.get('/history', shipperController.getDeliveryHistory);

// COD management
router.get('/cod-transactions', shipperController.getCODTransactions);
router.post('/cod/remit', shipperController.remitCOD);

export default router;
