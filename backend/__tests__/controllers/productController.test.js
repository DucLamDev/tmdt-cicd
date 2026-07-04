import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app.js';
import User from '../../src/models/User.js';
import Shop from '../../src/models/Shop.js';
import Product from '../../src/models/Product.js';

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

describe('Product Controller', () => {
  let sellerToken;
  let sellerUser;
  let testShop;
  let testProduct;

  beforeEach(async () => {
    sellerUser = await User.create({
      name: 'Seller User',
      email: 'seller@example.com',
      passwordHash: 'password123',
      roles: ['customer', 'seller'],
      approvalStatus: 'approved'
    });

    testShop = await Shop.create({
      ownerId: sellerUser._id,
      shopName: 'Test Shop',
      email: 'shop@example.com',
      phone: '0123456789'
    });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'seller@example.com',
        password: 'password123'
      });

    sellerToken = loginResponse.body.data.accessToken;

    testProduct = await Product.create({
      sellerId: testShop._id,
      title: 'Test Product',
      description: 'Test product description',
      price: 100000,
      stock: 10,
      images: ['image1.jpg'],
      isActive: true,
      isApproved: true
    });
  });

  describe('GET /api/products', () => {
    test('should get all active and approved products', async () => {
      const response = await request(app)
        .get('/api/products')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toBeInstanceOf(Array);
      expect(response.body.data.products.length).toBeGreaterThan(0);
      expect(response.body.data.pagination).toBeDefined();
    });

    test('should filter products by category', async () => {
      await Product.create({
        sellerId: testShop._id,
        title: 'Electronics Product',
        description: 'Test description',
        price: 200000,
        stock: 5,
        images: ['image2.jpg'],
        categories: ['Electronics'],
        isActive: true,
        isApproved: true
      });

      const response = await request(app)
        .get('/api/products?category=Electronics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products.length).toBeGreaterThan(0);
    });

    test('should filter products by price range', async () => {
      const response = await request(app)
        .get('/api/products?minPrice=50000&maxPrice=150000')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products.length).toBeGreaterThan(0);
      expect(response.body.data.products[0].price).toBeGreaterThanOrEqual(50000);
      expect(response.body.data.products[0].price).toBeLessThanOrEqual(150000);
    });

    test('should sort products by price ascending', async () => {
      await Product.create({
        sellerId: testShop._id,
        title: 'Expensive Product',
        description: 'Test description',
        price: 500000,
        stock: 5,
        images: ['image2.jpg'],
        isActive: true,
        isApproved: true
      });

      const response = await request(app)
        .get('/api/products?sort=price_asc')
        .expect(200);

      expect(response.body.success).toBe(true);
      const prices = response.body.data.products.map(p => p.price);
      expect(prices[0]).toBeLessThanOrEqual(prices[prices.length - 1]);
    });

    test('should paginate products', async () => {
      const response = await request(app)
        .get('/api/products?page=1&limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
    });
  });

  describe('GET /api/products/:idOrSlug', () => {
    test('should get product by ID', async () => {
      const response = await request(app)
        .get(`/api/products/${testProduct._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(testProduct.title);
      expect(response.body.data.viewCount).toBe(testProduct.viewCount + 1);
    });

    test('should get product by slug', async () => {
      const response = await request(app)
        .get(`/api/products/${testProduct.slug}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(testProduct.title);
    });

    test('should return 404 for non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/products/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Không tìm thấy');
    });

    test('should increment view count', async () => {
      const initialViewCount = testProduct.viewCount;

      await request(app)
        .get(`/api/products/${testProduct._id}`)
        .expect(200);

      const updatedProduct = await Product.findById(testProduct._id);
      expect(updatedProduct.viewCount).toBe(initialViewCount + 1);
    });
  });

  describe('POST /api/seller/products', () => {
    test('should create new product', async () => {
      const productData = {
        title: 'New Product',
        description: 'New product description',
        price: 150000,
        stock: 20,
        images: ['new-image.jpg'],
        categories: ['Electronics']
      };

      const response = await request(app)
        .post('/api/seller/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(productData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(productData.title);
      expect(response.body.data.sellerId.toString()).toBe(testShop._id.toString());
    });

    test('should fail without authentication', async () => {
      const productData = {
        title: 'New Product',
        description: 'New product description',
        price: 150000,
        stock: 20,
        images: ['new-image.jpg']
      };

      const response = await request(app)
        .post('/api/seller/products')
        .send(productData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should fail without required fields', async () => {
      const productData = {
        title: 'New Product'
      };

      const response = await request(app)
        .post('/api/seller/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(productData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/seller/products/:id', () => {
    test('should update own product', async () => {
      const updateData = {
        title: 'Updated Product Title',
        price: 120000
      };

      const response = await request(app)
        .put(`/api/seller/products/${testProduct._id}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.price).toBe(updateData.price);
    });

    test('should fail to update non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const updateData = {
        title: 'Updated Title'
      };

      const response = await request(app)
        .put(`/api/seller/products/${fakeId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('should fail without authentication', async () => {
      const updateData = {
        title: 'Updated Title'
      };

      const response = await request(app)
        .put(`/api/seller/products/${testProduct._id}`)
        .send(updateData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/seller/products/:id', () => {
    test('should soft delete own product', async () => {
      const response = await request(app)
        .delete(`/api/seller/products/${testProduct._id}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      const deletedProduct = await Product.findById(testProduct._id);
      expect(deletedProduct.isActive).toBe(false);
    });

    test('should fail to delete non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/api/seller/products/${fakeId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/seller/products', () => {
    test('should get seller own products', async () => {
      const response = await request(app)
        .get('/api/seller/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toBeDefined();
    });

    test('should filter by status', async () => {
      await Product.create({
        sellerId: testShop._id,
        title: 'Inactive Product',
        description: 'Test description',
        price: 100000,
        stock: 5,
        images: ['image.jpg'],
        isActive: false
      });

      const response = await request(app)
        .get('/api/seller/products?status=inactive')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/products/categories', () => {
    test('should get all product categories', async () => {
      await Product.create({
        sellerId: testShop._id,
        title: 'Category Product',
        description: 'Test description',
        price: 100000,
        stock: 5,
        images: ['image.jpg'],
        categories: ['Electronics', 'Phones'],
        isActive: true,
        isApproved: true
      });

      const response = await request(app)
        .get('/api/products/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/products/brands', () => {
    test('should get all product brands', async () => {
      await Product.create({
        sellerId: testShop._id,
        title: 'Brand Product',
        description: 'Test description',
        price: 100000,
        stock: 5,
        images: ['image.jpg'],
        brand: 'Samsung',
        isActive: true,
        isApproved: true
      });

      const response = await request(app)
        .get('/api/products/brands')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });
});
