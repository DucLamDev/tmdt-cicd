import express from 'express';
import * as contactController from '../controllers/contactController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validateId } from '../middlewares/validateId.js';

const router = express.Router();

// Public route - submit contact form
router.post('/', contactController.submitContactForm);

// Admin routes
router.get(
  '/admin/messages', 
  authenticate, 
  authorize('admin'), 
  contactController.getContactMessages
);

router.patch(
  '/admin/messages/:id',
  authenticate,
  authorize('admin'),
  validateId('id'),
  contactController.updateContactMessage
);

router.delete(
  '/admin/messages/:id',
  authenticate,
  authorize('admin'),
  validateId('id'),
  contactController.deleteContactMessage
);

export default router;
