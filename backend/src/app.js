import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

// Import passport config FIRST (before routes)
import passport from './config/passport.js';

// Import middlewares
import { errorHandler, notFound } from './middlewares/errorHandler.js';
import { generalLimiter } from './middlewares/rateLimiter.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import sellerRoutes from './routes/sellerRoutes.js';
import shipperRoutes from './routes/shipperRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import returnRoutes from './routes/returnRoutes.js';
import flashSaleRoutes from './routes/flashSaleRoutes.js';
import blogRoutes from './routes/blogRoutes.js';
import loyaltyRoutes from './routes/loyaltyRoutes.js';
import questionRoutes from './routes/questionRoutes.js';
import realtimeRoutes from './routes/realtimeRoutes.js';
import addressRoutes from './routes/addressRoutes.js';
import shopRoutes from './routes/shopRoutes.js';
import recentlyViewedRoutes from './routes/recentlyViewedRoutes.js';
import gameRoutes from './routes/gameRoutes.js';
import shipperReviewRoutes from './routes/shipperReviewRoutes.js';

// Import config
import logger from './config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS configuration
const configuredOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL,
  ...configuredOrigins
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

app.use(passport.initialize());

// Rate limiting
app.use('/api', generalLimiter);

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/shipper', shipperRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/flash-sales', flashSaleRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/realtime', realtimeRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/recently-viewed', recentlyViewedRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/shipper-reviews', shipperReviewRoutes);

app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    message: 'API Documentation',
    endpoints: {
      auth: '/api/auth/*',
      products: '/api/products/*',
      orders: '/api/orders/*',
      seller: '/api/seller/*',
      shipper: '/api/shipper/*',
      ai: '/api/ai/*',
      uploads: '/api/uploads/*',
      categories: '/api/categories/*',
      returns: '/api/returns/*',
      flashSales: '/api/flash-sales/*',
      blog: '/api/blog/*',
      loyalty: '/api/loyalty/*',
      questions: '/api/questions/*',
      addresses: '/api/addresses/*'
    },
    documentation: 'See README.md for detailed API documentation'
  });
});

// 404 handler
app.use(notFound);

app.use(errorHandler);

export default app;
