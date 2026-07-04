import mongoose from 'mongoose';
import Product from '../../src/models/Product.js';
import Shop from '../../src/models/Shop.js';
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
  await Product.deleteMany({});
  await Shop.deleteMany({});
  await User.deleteMany({});
});

describe('Product Model', () => {
  let testShop;

  beforeEach(async () => {
    const user = await User.create({
      name: 'Seller User',
      email: 'seller@example.com',
      passwordHash: 'password123',
      roles: ['customer', 'seller']
    });

    testShop = await Shop.create({
      ownerId: user._id,
      shopName: 'Test Shop',
      email: 'shop@example.com',
      phone: '0123456789'
    });
  });

  describe('Product Creation', () => {
    test('should create a valid product with required fields', async () => {
      const productData = {
        sellerId: testShop._id,
        title: 'Test Product',
        description: 'This is a test product description',
        price: 100000,
        stock: 10,
        images: ['image1.jpg']
      };

      const product = await Product.create(productData);

      expect(product.title).toBe(productData.title);
      expect(product.price).toBe(productData.price);
      expect(product.stock).toBe(productData.stock);
      expect(product.slug).toBeDefined();
      expect(product.isActive).toBe(true);
      expect(product.isApproved).toBe(false);
    });

    test('should fail to create product without required fields', async () => {
      const productData = {
        title: 'Test Product'
      };

      await expect(Product.create(productData)).rejects.toThrow();
    });

    test('should generate slug from title', async () => {
      const product = await Product.create({
        sellerId: testShop._id,
        title: 'Test Product With Spaces',
        description: 'Test description',
        price: 100000,
        stock: 10,
        images: ['image1.jpg']
      });

      expect(product.slug).toBe('test-product-with-spaces');
    });

    test('should generate unique slug for duplicate titles', async () => {
      const productData = {
        sellerId: testShop._id,
        title: 'Duplicate Product',
        description: 'Test description',
        price: 100000,
        stock: 10,
        images: ['image1.jpg']
      };

      const product1 = await Product.create(productData);
      const product2 = await Product.create(productData);

      expect(product1.slug).not.toBe(product2.slug);
      expect(product2.slug).toContain('duplicate-product');
    });
  });

  describe('Product Pricing', () => {
    test('should calculate effective price without sale', async () => {
      const product = await Product.create({
        sellerId: testShop._id,
        title: 'Test Product',
        description: 'Test description',
        price: 100000,
        stock: 10,
        images: ['image1.jpg']
      });

      expect(product.effectivePrice).toBe(100000);
    });

    test('should calculate effective price with sale', async () => {
      const product = await Product.create({
        sellerId: testShop._id,
        title: 'Test Product',
        description: 'Test description',
        price: 100000,
        salePrice: 80000,
        stock: 10,
        images: ['image1.jpg']
      });

      expect(product.effectivePrice).toBe(80000);
    });

    test('should calculate discount percentage', async () => {
      const product = await Product.create({
        sellerId: testShop._id,
        title: 'Test Product',
        description: 'Test description',
        price: 100000,
        salePrice: 80000,
        stock: 10,
        images: ['image1.jpg']
      });

      expect(product.discountPercent).toBe(20);
    });

    test('should return 0 discount when no sale price', async () => {
      const product = await Product.create({
        sellerId: testShop._id,
        title: 'Test Product',
        description: 'Test description',
        price: 100000,
        stock: 10,
        images: ['image1.jpg']
      });

      expect(product.discountPercent).toBe(0);
    });
  });

  describe('Product Stock', () => {
    test('should check in stock status', async () => {
      const product = await Product.create({
        sellerId: testShop._id,
        title: 'Test Product',
        description: 'Test description',
        price: 100000,
        stock: 10,
        images: ['image1.jpg']
      });

      expect(product.inStock).toBe(true);
    });

    test('should check out of stock status', async () => {
      const product = await Product.create({
        sellerId: testShop._id,
        title: 'Test Product',
        description: 'Test description',
        price: 100000,
        stock: 0,
        images: ['image1.jpg']
      });

      expect(product.inStock).toBe(false);
    });

    test('should check in stock with variants', async () => {
      const product = await Product.create({
        sellerId: testShop._id,
        title: 'Test Product',
        description: 'Test description',
        price: 100000,
        stock: 0,
        images: ['image1.jpg'],
        variants: [
          { name: 'Red', stock: 5, price: 100000 },
          { name: 'Blue', stock: 0, price: 100000 }
        ]
      });

      expect(product.inStock).toBe(true);
    });
  });

  describe('Product Categories and Tags', () => {
    test('should add categories to product', async () => {
      const product = await Product.create({
        sellerId: testShop._id,
        title: 'Test Product',
        description: 'Test description',
        price: 100000,
        stock: 10,
        images: ['image1.jpg'],
        categories: ['Electronics', 'Phones']
      });

      expect(product.categories).toHaveLength(2);
      expect(product.categories).toContain('Electronics');
      expect(product.categories).toContain('Phones');
    });

    test('should add tags to product', async () => {
      const product = await Product.create({
        sellerId: testShop._id,
        title: 'Test Product',
        description: 'Test description',
        price: 100000,
        stock: 10,
        images: ['image1.jpg'],
        tags: ['new', 'featured', 'sale']
      });

      expect(product.tags).toHaveLength(3);
      expect(product.tags).toContain('new');
    });
  });

  describe('Product Ratings', () => {
    test('should initialize with zero rating', async () => {
      const product = await Product.create({
        sellerId: testShop._id,
        title: 'Test Product',
        description: 'Test description',
        price: 100000,
        stock: 10,
        images: ['image1.jpg']
      });

      expect(product.ratingAvg).toBe(0);
      expect(product.reviewCount).toBe(0);
    });

    test('should update rating and review count', async () => {
      const product = await Product.create({
        sellerId: testShop._id,
        title: 'Test Product',
        description: 'Test description',
        price: 100000,
        stock: 10,
        images: ['image1.jpg']
      });

      product.ratingAvg = 4.5;
      product.reviewCount = 10;
      await product.save();

      expect(product.ratingAvg).toBe(4.5);
      expect(product.reviewCount).toBe(10);
    });
  });
});
