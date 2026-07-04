import rateLimit from 'express-rate-limit';
import logger from '../config/logger.js';

const READ_ONLY_POLLING_PATHS = [
  '/api/messages/stats',
  '/api/notifications/unread-count',
  '/api/notifications/navigation-badges',
  '/api/realtime'
];

const shouldSkipGeneralLimit = (req) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true;
  return READ_ONLY_POLLING_PATHS.some((path) => req.originalUrl?.startsWith(path));
};

/**
 * General rate limiter
 */
export const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10000,
  skip: shouldSkipGeneralLimit,
  message: {
    success: false,
    message: 'Bạn thao tác quá nhanh, vui lòng thử lại sau'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Bạn thao tác quá nhanh, vui lòng thử lại sau'
    });
  }
});

/**
 * Strict rate limiter for auth routes
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 50,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later'
  },
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts, please try again after 15 minutes'
    });
  }
});

/**
 * Password reset rate limiter
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.PASSWORD_RESET_RATE_LIMIT_MAX_REQUESTS) || 10,
  message: {
    success: false,
    message: 'Too many password reset attempts'
  },
  handler: (req, res) => {
    logger.warn(`Password reset rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many password reset attempts, please try again after 1 hour'
    });
  }
});

/**
 * API rate limiter for general API calls
 */
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS) || 1200,
  message: {
    success: false,
    message: 'API rate limit exceeded'
  }
});

export default {
  generalLimiter,
  authLimiter,
  passwordResetLimiter,
  apiLimiter
};
