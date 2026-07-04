import jwt from 'jsonwebtoken';

/**
 * Generate JWT access token
 * @param {Object} payload - Token payload
 * @returns {String} JWT token
 */
export const generateAccessToken = (payload) => {
  return jwt.sign(
    payload,
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );
};

/**
 * Generate JWT refresh token
 * @param {Object} payload - Token payload
 * @returns {String} JWT token
 */
export const generateRefreshToken = (payload) => {
  return jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
};

/**
 * Generate password reset token
 * @param {Object} payload - Token payload
 * @returns {String} JWT token
 */
export const generateResetToken = (payload) => {
  return jwt.sign(
    payload,
    process.env.JWT_RESET_PASSWORD_SECRET,
    { expiresIn: process.env.JWT_RESET_PASSWORD_EXPIRY || '1h' }
  );
};

/**
 * Verify JWT token
 * @param {String} token - JWT token
 * @param {String} secret - JWT secret
 * @returns {Object} Decoded payload
 */
export const verifyToken = (token, secret) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Generate token pair (access + refresh)
 * @param {Object} user - User object
 * @returns {Object} Token pair
 */
export const generateTokenPair = (user, extraPayload = {}) => {
  const payload = {
    id: user._id.toString(),
    email: user.email,
    roles: user.roles,
    ...extraPayload
  };

  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload)
  };
};

export default {
  generateAccessToken,
  generateRefreshToken,
  generateResetToken,
  verifyToken,
  generateTokenPair
};
