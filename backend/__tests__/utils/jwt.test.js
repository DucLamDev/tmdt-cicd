import { generateTokenPair, verifyToken, generateResetToken } from '../../src/utils/jwt.js';
import jwt from 'jsonwebtoken';

describe('JWT Utilities', () => {
  const mockUser = {
    _id: '123456789',
    email: 'test@example.com',
    roles: ['customer']
  };

  describe('generateTokenPair', () => {
    test('should generate access and refresh tokens', () => {
      const tokens = generateTokenPair(mockUser);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
    });

    test('should generate valid access token', () => {
      const tokens = generateTokenPair(mockUser);
      const decoded = jwt.verify(tokens.accessToken, process.env.JWT_SECRET);

      expect(decoded.id).toBe(mockUser._id);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.roles).toEqual(mockUser.roles);
    });

    test('should generate valid refresh token', () => {
      const tokens = generateTokenPair(mockUser);
      const decoded = jwt.verify(tokens.refreshToken, process.env.JWT_REFRESH_SECRET);

      expect(decoded.id).toBe(mockUser._id);
    });

    test('should set correct expiration times', () => {
      const tokens = generateTokenPair(mockUser);
      
      const accessDecoded = jwt.verify(tokens.accessToken, process.env.JWT_SECRET);
      const refreshDecoded = jwt.verify(tokens.refreshToken, process.env.JWT_REFRESH_SECRET);

      expect(accessDecoded.exp).toBeDefined();
      expect(refreshDecoded.exp).toBeDefined();
      expect(refreshDecoded.exp).toBeGreaterThan(accessDecoded.exp);
    });
  });

  describe('verifyToken', () => {
    test('should verify valid token', () => {
      const token = jwt.sign(
        { id: mockUser._id, email: mockUser.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const decoded = verifyToken(token, process.env.JWT_SECRET);

      expect(decoded.id).toBe(mockUser._id);
      expect(decoded.email).toBe(mockUser.email);
    });

    test('should throw error for invalid token', () => {
      expect(() => {
        verifyToken('invalid-token', process.env.JWT_SECRET);
      }).toThrow();
    });

    test('should throw error for expired token', () => {
      const token = jwt.sign(
        { id: mockUser._id },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' }
      );

      expect(() => {
        verifyToken(token, process.env.JWT_SECRET);
      }).toThrow();
    });

    test('should throw error with wrong secret', () => {
      const token = jwt.sign(
        { id: mockUser._id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      expect(() => {
        verifyToken(token, 'wrong-secret');
      }).toThrow();
    });
  });

  describe('generateResetToken', () => {
    test('should generate reset token and hash', () => {
      const result = generateResetToken(mockUser);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('hashedToken');
      expect(result).toHaveProperty('expires');
      expect(typeof result.token).toBe('string');
      expect(typeof result.hashedToken).toBe('string');
      expect(result.expires).toBeInstanceOf(Date);
    });

    test('should generate different tokens each time', () => {
      const result1 = generateResetToken(mockUser);
      const result2 = generateResetToken(mockUser);

      expect(result1.token).not.toBe(result2.token);
      expect(result1.hashedToken).not.toBe(result2.hashedToken);
    });

    test('should set expiration 1 hour in future', () => {
      const result = generateResetToken(mockUser);
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

      expect(result.expires.getTime()).toBeGreaterThan(now.getTime());
      expect(result.expires.getTime()).toBeLessThanOrEqual(oneHourLater.getTime());
    });
  });
});
