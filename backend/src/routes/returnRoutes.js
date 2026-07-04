import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { createReturn, getMyReturns, getReturnDetail } from '../controllers/returnController.js';

const router = express.Router();

router.post('/', authenticate, createReturn);
router.get('/my-returns', authenticate, getMyReturns);
router.get('/:id', authenticate, getReturnDetail);

export default router;
