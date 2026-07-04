import express from 'express';
import { optionalAuth } from '../middlewares/auth.js';
import { getPosts, getPostBySlug } from '../controllers/blogController.js';

const router = express.Router();

router.get('/', getPosts);
router.get('/:slug', getPostBySlug);

export default router;
