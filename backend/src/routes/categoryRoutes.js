import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import { getCategories, getCategoryBySlug, createCategory, updateCategory, deleteCategory, reorderCategories } from '../controllers/categoryController.js';

const router = express.Router();

router.get('/', getCategories);
router.get('/:slug', getCategoryBySlug);

export default router;
