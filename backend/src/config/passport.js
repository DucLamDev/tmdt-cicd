import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import User from '../models/User.js';
import logger from './logger.js';
import dotenv from 'dotenv';

dotenv.config();

logger.info('Initializing Passport Config...');

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const facebookAppId = process.env.FACEBOOK_APP_ID;
const facebookAppSecret = process.env.FACEBOOK_APP_SECRET;

export const isGoogleOAuthConfigured = Boolean(googleClientId && googleClientSecret);
export const isFacebookOAuthConfigured = Boolean(facebookAppId && facebookAppSecret);

try {
  if (isGoogleOAuthConfigured) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: googleClientId,
          clientSecret: googleClientSecret,
          callbackURL: '/api/auth/oauth/google/callback',
          scope: ['profile', 'email'],
          proxy: true
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            logger.info(`Google OAuth Callback received for: ${email}`);

            let user = await User.findOne({
              $or: [
                { googleId: profile.id },
                { email }
              ]
            });

            if (user) {
              if (!user.googleId) {
                user.googleId = profile.id;
                await user.save();
              }
              return done(null, user);
            }

            user = await User.create({
              googleId: profile.id,
              name: profile.displayName,
              email,
              avatarUrl: profile.photos?.[0]?.value,
              verified: true,
              roles: ['customer']
            });

            logger.info(`New user created via Google OAuth: ${user.email}`);
            return done(null, user);
          } catch (error) {
            logger.error(`Google OAuth error: ${error.message}`);
            return done(error, null);
          }
        }
      )
    );
    logger.info('Google OAuth Strategy registered successfully');
  } else {
    logger.warn('Google OAuth credentials are not configured; Google login is disabled');
  }
} catch (error) {
  logger.error(`Failed to register Google Strategy: ${error.message}`);
}

try {
  if (isFacebookOAuthConfigured) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: facebookAppId,
          clientSecret: facebookAppSecret,
          callbackURL: '/api/auth/oauth/facebook/callback',
          profileFields: ['id', 'displayName', 'emails', 'photos']
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            let user = await User.findOne({
              $or: [
                { facebookId: profile.id },
                { email }
              ]
            });

            if (user) {
              if (!user.facebookId) {
                user.facebookId = profile.id;
                await user.save();
              }
              return done(null, user);
            }

            user = await User.create({
              facebookId: profile.id,
              name: profile.displayName,
              email,
              avatarUrl: profile.photos?.[0]?.value,
              verified: true,
              roles: ['customer']
            });

            logger.info(`New user created via Facebook OAuth: ${user.email}`);
            return done(null, user);
          } catch (error) {
            logger.error(`Facebook OAuth error: ${error.message}`);
            return done(error, null);
          }
        }
      )
    );
    logger.info('Facebook OAuth Strategy registered successfully');
  } else {
    logger.warn('Facebook OAuth credentials are not configured; Facebook login is disabled');
  }
} catch (error) {
  logger.error(`Failed to register Facebook Strategy: ${error.message}`);
}

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
