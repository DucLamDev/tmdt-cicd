import express from 'express';
import * as authController from '../controllers/authController.js';
import { authenticate } from '../middlewares/auth.js';
import { authLimiter, passwordResetLimiter } from '../middlewares/rateLimiter.js';
import passport, { isFacebookOAuthConfigured, isGoogleOAuthConfigured } from '../config/passport.js';
import { generateTokenPair } from '../utils/jwt.js';

const router = express.Router();

const requireOAuthConfig = (provider, isConfigured) => (req, res, next) => {
  if (isConfigured) return next();

  return res.status(503).json({
    success: false,
    message: `${provider} OAuth is not configured`
  });
};

// Public routes
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authController.refresh);
router.post('/forgot-password', passwordResetLimiter, authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// OAuth routes
// Google OAuth
router.get('/oauth/google', 
  requireOAuthConfig('Google', isGoogleOAuthConfigured),
  passport.authenticate('google', { session: false, scope: ['profile', 'email'] })
);

router.get('/oauth/google/callback',
  requireOAuthConfig('Google', isGoogleOAuthConfigured),
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    // Generate tokens
    const tokens = generateTokenPair(req.user);
    
    // Redirect to frontend with tokens
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;
    res.redirect(redirectUrl);
  }
);

// Facebook OAuth
router.get('/oauth/facebook',
  requireOAuthConfig('Facebook', isFacebookOAuthConfigured),
  passport.authenticate('facebook', { session: false, scope: ['email'] })
);

router.get('/oauth/facebook/callback',
  requireOAuthConfig('Facebook', isFacebookOAuthConfigured),
  passport.authenticate('facebook', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    const tokens = generateTokenPair(req.user);
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;
    res.redirect(redirectUrl);
  }
);

// Protected routes
router.get('/me', authenticate, authController.getMe);
router.put('/profile', authenticate, authController.updateProfile);
router.put('/password', authenticate, authController.changePassword);
router.post('/logout', authenticate, authController.logout);

export default router;
