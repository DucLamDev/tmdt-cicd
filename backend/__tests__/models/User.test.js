import mongoose from 'mongoose';
import User from '../../src/models/User.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
});

describe('User Model', () => {
  describe('User Creation', () => {
    test('should create a valid user with required fields', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'password123'
      };

      const user = await User.create(userData);

      expect(user.name).toBe(userData.name);
      expect(user.email).toBe(userData.email);
      expect(user.passwordHash).not.toBe(userData.passwordHash);
      expect(user.roles).toContain('customer');
      expect(user.verified).toBe(false);
      expect(user.isActive).toBe(true);
    });

    test('should fail to create user without required fields', async () => {
      const userData = {
        name: 'Test User'
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    test('should fail to create user with invalid email', async () => {
      const userData = {
        name: 'Test User',
        email: 'invalid-email',
        passwordHash: 'password123'
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    test('should fail to create duplicate email', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'password123'
      };

      await User.create(userData);
      await expect(User.create(userData)).rejects.toThrow();
    });
  });

  describe('Password Hashing', () => {
    test('should hash password before saving', async () => {
      const plainPassword = 'password123';
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: plainPassword
      });

      expect(user.passwordHash).not.toBe(plainPassword);
      expect(user.passwordHash).toHaveLength(60);
    });

    test('should compare password correctly', async () => {
      const plainPassword = 'password123';
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: plainPassword
      });

      const isMatch = await user.comparePassword(plainPassword);
      expect(isMatch).toBe(true);

      const isNotMatch = await user.comparePassword('wrongpassword');
      expect(isNotMatch).toBe(false);
    });
  });

  describe('User Roles', () => {
    test('should set approval status to pending for seller role', async () => {
      const user = await User.create({
        name: 'Seller User',
        email: 'seller@example.com',
        passwordHash: 'password123',
        roles: ['customer', 'seller']
      });

      expect(user.approvalStatus).toBe('pending');
    });

    test('should set approval status to pending for shipper role', async () => {
      const user = await User.create({
        name: 'Shipper User',
        email: 'shipper@example.com',
        passwordHash: 'password123',
        roles: ['customer', 'shipper']
      });

      expect(user.approvalStatus).toBe('pending');
    });

    test('should set approval status to approved for customer only', async () => {
      const user = await User.create({
        name: 'Customer User',
        email: 'customer@example.com',
        passwordHash: 'password123',
        roles: ['customer']
      });

      expect(user.approvalStatus).toBe('approved');
    });

    test('should check if user has role', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'password123',
        roles: ['customer', 'seller']
      });

      expect(user.hasRole('customer')).toBe(true);
      expect(user.hasRole('seller')).toBe(true);
      expect(user.hasRole('admin')).toBe(false);
    });

    test('should add role to user', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'password123',
        roles: ['customer']
      });

      user.addRole('seller');
      expect(user.roles).toContain('seller');

      user.addRole('seller');
      expect(user.roles.filter(r => r === 'seller')).toHaveLength(1);
    });
  });

  describe('User Methods', () => {
    test('should return safe object without sensitive data', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'password123'
      });

      const safeObj = user.toSafeObject();

      expect(safeObj.passwordHash).toBeUndefined();
      expect(safeObj.resetPasswordToken).toBeUndefined();
      expect(safeObj.resetPasswordExpires).toBeUndefined();
      expect(safeObj.__v).toBeUndefined();
      expect(safeObj.name).toBe('Test User');
      expect(safeObj.email).toBe('test@example.com');
    });
  });

  describe('User Addresses', () => {
    test('should add address to user', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'password123'
      });

      user.addresses.push({
        label: 'Home',
        recipientName: 'Test User',
        phone: '0123456789',
        street: '123 Test St',
        city: 'Ho Chi Minh',
        isDefault: true
      });

      await user.save();

      expect(user.addresses).toHaveLength(1);
      expect(user.addresses[0].label).toBe('Home');
      expect(user.addresses[0].isDefault).toBe(true);
    });
  });
});
