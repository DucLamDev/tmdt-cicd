import express from 'express';
import { getFlashSales, getFlashSaleById } from '../controllers/flashSaleController.js';

const router = express.Router();

router.get('/', getFlashSales);
router.get('/:id', getFlashSaleById);

export default router;
