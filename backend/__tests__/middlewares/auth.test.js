import { protect, authorize } from '../../src/middlewares/auth.js';
import User from '../../src/models/User.js';
import jwt from 'jsonwebtoken';

jest.mock('../../src/models/User.js');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      user: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('protect middleware', () => {
    test('should authenticate user with valid token', async () => {
      const mockUser = {
        _id: '123',
        email: 'test@example.com',
        roles: ['customer'],
        isActive: true
      };

      const token = jwt.sign(
        { id: mockUser._id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      req.headers.authorization = `Bearer ${token}`;
      User.findById = jest.fn().mockResolvedValue(mockUser);

      await protect(req, res, next);

      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
    });

    test('should fail without token', async () => {
      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: expect.any(String)
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should fail with invalid token', async () => {
      req.headers.authorization = 'Bearer invalid-token';

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: expect.any(String)
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should fail with expired token', async () => {
      const token = jwt.sign(
        { id: '123' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' }
      );

      req.headers.authorization = `Bearer ${token}`;

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('should fail if user not found', async () => {
      const token = jwt.sign(
        { id: '123' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      req.headers.authorization = `Bearer ${token}`;
      User.findById = jest.fn().mockResolvedValue(null);

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('should fail if user is inactive', async () => {
      const mockUser = {
        _id: '123',
        email: 'test@example.com',
        roles: ['customer'],
        isActive: false
      };

      const token = jwt.sign(
        { id: mockUser._id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      req.headers.authorization = `Bearer ${token}`;
      User.findById = jest.fn().mockResolvedValue(mockUser);

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('authorize middleware', () => {
    beforeEach(() => {
      req.user = {
        _id: '123',
        email: 'test@example.com',
        roles: ['customer']
      };
    });

    test('should authorize user with correct role', () => {
      const middleware = authorize('customer');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should authorize user with one of multiple roles', () => {
      req.user.roles = ['customer', 'seller'];
      const middleware = authorize('seller', 'admin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should fail authorization without correct role', () => {
      const middleware = authorize('admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: expect.any(String)
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should fail if user not set', () => {
      req.user = null;
      const middleware = authorize('customer');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
